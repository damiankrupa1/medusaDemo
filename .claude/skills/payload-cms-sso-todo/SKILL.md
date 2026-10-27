---
name: payload-cms-sso-todo
description: 'Tracks the Medusa-side work for embedding the Payload CMS admin panel in the Medusa admin dashboard (a "CMS" page with an iframe) with single sign-on. The Payload side is already implemented in the simple-landing-page-nuxt repository. Use when implementing, reviewing or deploying that integration.'
---

# Payload CMS in the Medusa admin (iframe + SSO) - TODO

Goal: a "CMS" entry in the Medusa admin sidebar that shows the Payload admin panel in an iframe, with the admin already signed in (no second login).

The Payload half is **done** in `simple-landing-page-nuxt/payload-cms` (branch `feat/medusa-admin-sso`). The code, tests and docs on the Medusa side are implemented (branch `feat/payload-cms-sso`); what is left is the end-to-end check and the deploy. Follow the layering rules in `CLAUDE.md` (Medusa v2 patterns, env vars for secrets, no hardcoded URLs).

## How it works

1. The admin opens the **CMS** page (`/app/cms`).
2. The page calls `GET /admin/payload-sso` (already authenticated by Medusa, since it is under `/admin`).
3. The route signs a 60-second HS256 JWT with the admin user's email and returns `{ url }` pointing at Payload: `{PAYLOAD_PUBLIC_URL}/api/users/sso/medusa?token=<jwt>`.
4. The page renders `<iframe src={url}>`. Payload verifies the token, creates or reuses the user, sets its own auth cookie and redirects to `/admin`.

## Contract with Payload (do not change one side alone)

- Endpoint: `GET {PAYLOAD_PUBLIC_URL}/api/users/sso/medusa?token=<jwt>`.
- JWT: `HS256`, claims `iss: "medusa-admin"`, `aud: "payload"`, `email` (string), `iat`, `exp`. `exp - iat` must be at most 120 seconds (use 60).
- Shared secret: `PAYLOAD_SSO_SECRET` here, `MEDUSA_SSO_SECRET` in Payload. Same value, long and random (for example `openssl rand -hex 32`).
- Payload matches the user by email. A missing user is created (flag `ssoManaged`); an existing one, including an account created by hand in Payload, is signed in as is and keeps its password.
- Payload env needed for this: `MEDUSA_SSO_SECRET`, `MEDUSA_ADMIN_URL` (origin of the Medusa admin, used for `frame-ancestors`), optional `PAYLOAD_COOKIE_DOMAIN`.

## Tasks

- [x] **Env**: add `PAYLOAD_PUBLIC_URL` and `PAYLOAD_SSO_SECRET` to `apps/backend/.env.template` and to the Railway variables table in `docs/deployment-railway.md`.
- [x] **Token util** `apps/backend/src/utils/payload-sso.ts`: `signPayloadSsoToken(email, secret, nowSeconds?)` and `buildPayloadSsoUrl(payloadUrl, token)`. Use `node:crypto` (`createHmac("sha256", secret)`, base64url) so no new dependency is needed.
- [x] **Unit test** `apps/backend/src/utils/__tests__/payload-sso.unit.spec.ts` (picked up by `test:unit`): header is `{alg: HS256, typ: JWT}`, claims match the contract, signature equals an independently computed HMAC, TTL <= 120s, URL points at `/api/users/sso/medusa`.
- [x] **API route** `apps/backend/src/api/admin/payload-sso/route.ts`, `GET` only:
  - `503` when `PAYLOAD_PUBLIC_URL` or `PAYLOAD_SSO_SECRET` is missing;
  - resolve the admin email with `query.graph({ entity: "user", fields: ["email"], filters: { id: req.auth_context.actor_id } })`;
  - `403` when the user has no email; otherwise `res.json({ url })`.
  - Use `AuthenticatedMedusaRequest` from `@medusajs/framework/http`.
- [x] **Admin page** `apps/backend/src/admin/routes/cms/page.tsx`:
  - `defineRouteConfig({ label: "CMS" })` (add an icon only if `@medusajs/icons` is added as a dependency; it is not in `package.json` today);
  - `useQuery` from `@tanstack/react-query` with `queryKey: ["payload-sso"]`, `staleTime: 0`, `gcTime: 0`, `retry: false`, `refetchOnWindowFocus: false` - the URL is single-use and valid for a minute, so never reuse a cached one;
  - fetch with `sdk.client.fetch` from `src/admin/lib/sdk.ts` (sends the session cookie itself);
  - show loading and error text (`Container` + `Text` from `@medusajs/ui`), then `<iframe title src style={{ width: "100%", height: "calc(100vh - 8rem)", border: 0 }} />`.
- [x] **i18n**: add a `payloadCms` block (`title`, `loading`, `loadFailed`) to **both** `src/admin/i18n/json/en.json` and `pl.json`, and use `useTranslation()` in the page. `src/admin/i18n/__tests__/translations.unit.spec.ts` guards the translation files, so run `test:unit` after editing them.
- [ ] **Verify locally** (Postgres and Redis must be running): start Payload (`pnpm dev` in `payload-cms`, port 3000) and Medusa (`pnpm backend:dev`), set the same secret on both, open `/app/cms` and confirm the Payload dashboard shows up without a login form. Check that `GET /admin/payload-sso` returns `401` without a session.
- [ ] **Deploy**: see the section below, then run `/pre-deploy-review`.

## Deployment requirements

- **Same site is mandatory.** The iframe only keeps Payload's auth cookie if Medusa admin and Payload share a registrable domain, for example `api.shop.pl` (Medusa) and `cms.shop.pl` (Payload). The default `*.up.railway.app` domains do **not** work: `up.railway.app` is on the Public Suffix List, so two Railway services are cross-site and the cookie is dropped. Attach a custom domain to both services.
- Payload `MEDUSA_ADMIN_URL` must be the exact origin where Medusa serves `/app`. Payload's `frame-ancestors` allows only that origin plus itself.
- `PAYLOAD_PUBLIC_URL` is the public Payload URL the **browser** opens. Do not use a `*.railway.internal` address.
- Add the Payload origin to nothing else: the iframe makes no cross-origin API calls, so `ADMIN_CORS`/`AUTH_CORS` do not change.
- Never commit `PAYLOAD_SSO_SECRET`. Rotate it by changing it on both services and redeploying both.

## Known limits (accepted)

- Signing out of Medusa does not sign out of Payload. The Payload cookie lives until its normal expiry (2 hours by default).
- Tokens are short-lived but not one-time; there is no server-side replay store. A token only works for 60 seconds and only reaches the browser of the signed-in admin.
- Every Medusa admin user gets a Payload account with full admin rights, and anyone who can create a Medusa admin user with a given email can sign in to the Payload account with that email. If Payload needs roles, add a mapping from the Medusa user to a Payload role on both sides.
