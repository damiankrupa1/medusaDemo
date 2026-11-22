# Registration with e-mail and password

Rules this backend adds to Medusa's `emailpass` auth routes (issue #41), what
they mean for the storefront, and the script for identities whose
registration was never finished.

## The rule

`POST /auth/:actor_type/emailpass/register` is refused with

```
401 {"type":"unauthorized","message":"Identity with email already exists"}
```

whenever the e-mail already has an `emailpass` auth identity:

- with or without a customer/user attached to it,
- for every actor type (`customer`, `user`),
- comparing the e-mail ignoring letter case (`Ann@Example.com` = `ann@example.com`).

The status and message are the ones Medusa already answers for an identity
that has a customer, so clients see one answer for "this e-mail is taken".
A new e-mail registers exactly as before (200 with a token).

Why: Medusa's `emailpass` provider treats an identity without an actor as
not yet claimed and lets a later registration of the same e-mail set a new
password on it (`@medusajs/auth-emailpass`, `register()`). This backend
refuses that registration instead. Re-check this after a Medusa upgrade: the
behaviour lives in Medusa's provider, the refusal in
`src/lib/auth-registration/registration-guard.ts`.

### How it works

`createRegistrationGuard()` is a route middleware (`src/api/middlewares.ts`)
on Medusa's own route pattern `/auth/:actor_type/:auth_provider/register`, so
any actor type and an encoded provider name (`email%70ass`) are covered;
Medusa has already parsed the body (JSON or urlencoded).

1. Looks the e-mail up in the auth module (`listProviderIdentities`,
   provider `emailpass`, `entity_id` ILIKE the e-mail with `%`/`_` escaped).
   Found: the 401 above, nothing is changed.
2. Otherwise creates the identity itself, without a password, then lets
   Medusa register. Medusa's provider finds that identity and sets the
   password from the same request.
3. If Medusa does not answer 2xx, the identity created in step 2 is deleted
   again (unless an actor got attached meanwhile).

Concurrent registrations of the same new e-mail: the database's unique index
on the provider identity (`entity_id`, `provider`) lets only one request
create it in step 2; the others get the 401. So Medusa's provider only ever
sets the password of an identity the same request created. This holds across
processes and replicas; no lock is involved. Not covered by the index: two
concurrent *first* registrations whose e-mails differ only in letter case;
each gets its own identity (neither replaces the other's password).

Medusa stores and compares e-mails exactly as typed. Signing in still needs
the spelling used at registration; only the registration check ignores case.

## Actor types (`authMethodsPerActor`)

`medusa-config.ts` sets `projectConfig.http.authMethodsPerActor` from
`src/config/auth.ts`:

```ts
{ customer: ["emailpass"], user: ["emailpass"] }
```

Medusa checks this map on its `/auth/:actor_type/:auth_provider/...` routes
but lets an actor type that is not in the map use every provider. So
`createActorTypeGuard()` (`src/lib/auth-registration/actor-type-guard.ts`)
refuses such an actor type (`/auth/anything/emailpass`, `/auth/Customer/...`)
on sign-in, `register`, `callback`, `reset-password` and `update` with
Medusa's own error:

```
400 {"type":"not_allowed","message":"The actor type anything is not allowed to use the auth provider emailpass"}
```

Only providers named in the map are checked, because Medusa's fixed routes
(`/auth/token/refresh`, `/auth/user/providers`, `/auth/emailpass/user`,
`/auth/mfa/...`, `/auth/verification/...`) fit the same pattern.

Not affected: shopper sign-in and registration (`customer`), admin sign-in
and invites (`user`, `/admin/invites/accept` after
`/auth/user/emailpass/register`), the admin login page's provider list
(`GET /auth/user/providers`), password reset, and the Payload CMS SSO
(`/admin/payload-sso` uses the signed-in admin's session, no auth provider).
Adding an auth provider (Google, OIDC, ...) or an actor type means adding it
to this map, otherwise Medusa refuses it.

## What it means for the storefront

Registration is two steps: register the identity (token without an actor),
then create the customer with that token (`POST /store/customers`). If the
second step fails, the identity stays without a customer. The same e-mail can
then **not** be registered again: the shopper gets "Identity with email
already exists". The identity is still theirs and has their password, so:

1. On that 401 during sign-up, the storefront should offer to sign in instead
   (`POST /auth/customer/emailpass` with the same e-mail and password).
2. If the sign-in succeeds but there is no customer yet (`GET
   /store/customers/me` fails, the token has an empty `actor_id`), create the
   customer with that token (`POST /store/customers`), then sign in again or
   refresh the token (`POST /auth/token/refresh`) to get one with the
   customer.

A shopper who forgot that password, without an e-mail reset flow, is stuck
until the identity is deleted (below) or an admin helps.

## Identities without an actor

`src/scripts/list-orphan-identities.ts` lists `emailpass` identities that
have no customer or user and are older than a threshold. Nothing is deleted
unless `apply` is given. E-mails are logged masked with a short hash
(`j***@e*** sha256:1a2b3c4d5e6f`), never in full.

```bash
cd apps/backend
pnpm medusa exec ./src/scripts/list-orphan-identities.ts                         # list, older than 24 h
pnpm medusa exec ./src/scripts/list-orphan-identities.ts older-than-hours=72     # list, older than 72 h
pnpm medusa exec ./src/scripts/list-orphan-identities.ts older-than-hours=72 apply
```

Arguments are plain words (`medusa exec` refuses `--apply`). The threshold
is at least 1 hour, so a registration in progress (an identity without an
actor for a few seconds) is never selected. With `apply`, each identity is
read again right before it is deleted and skipped if it has an actor by then.
Customers, users and orders are never touched. A deleted identity frees the
e-mail: its owner registers again (with a new password).

When to run it:

- once after deploying this change, as a list only, to see how many such
  identities exist;
- when a shopper can neither register (e-mail taken) nor sign in (password
  forgotten);
- periodically (e.g. monthly) as a list; use `apply` deliberately, with a
  threshold well above the time a real shopper needs to come back and sign in
  (the default 24 h, or more).

On Railway, run it in a shell of the **Server** service's container (the
image contains the repository; `cd /repo/apps/backend` first), never from a
local machine against the production database URL.

## Tests

- `src/lib/auth-registration/__tests__/*.unit.spec.ts`: the guards with a
  stand-in auth module (existing e-mail with/without actor, every actor type,
  letter case, LIKE wildcards, concurrent registrations, placeholder cleanup).
- `integration-tests/http/auth-registration.spec.ts`: a new e-mail registers
  and creates its customer; an existing e-mail (with and without a customer)
  is refused and keeps its password; letter case; urlencoded body and encoded
  provider; concurrent registrations; other actor types are refused; admin
  invite; provider list and token refresh.
- `src/scripts/orphan-identities/__tests__/select.unit.spec.ts` and
  `integration-tests/http/orphan-identities.spec.ts`: the list changes
  nothing; `apply` deletes only old identities without an actor.
