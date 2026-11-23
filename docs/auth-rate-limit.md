# Rate limit of password login and registration

Medusa 2.19 has no limit on password login or registration: the
`/auth/:actor_type/:auth_provider` routes answer a wrong password with a plain
401, as fast as a client can ask. The backend URL is public, so a limit in the
storefront or on Vercel does not cover direct calls. This backend therefore
limits the `emailpass` routes **per e-mail** (issue #35). The **per-IP** limit
is a Vercel WAF rule, configured by the owner (damiankrupa1/nuxtMedusa#91):
storefront traffic reaches Medusa from shared Vercel addresses, so a per-IP
limit here would lock out every shopper at once.

## What is limited

| Rule | Routes | Counts | Limit | Window |
|---|---|---|---|---|
| `customer_login` | `GET`/`POST /auth/<any actor except user>/emailpass` | failed attempts (401); a success (2xx) clears the counter | 10 | 15 min |
| `admin_login` | `GET`/`POST /auth/user/emailpass` | failed attempts; a success clears the counter | 5 | 15 min |
| `registration` | `POST /auth/<any actor>/emailpass/register` | every attempt, successful or not | 5 | 1 h |

Over the limit, before Medusa looks at the password:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 900

{"type":"not_allowed","code":"rate_limited","message":"Too many attempts. Try again later."}
```

`Retry-After` is what is left of the window, in seconds, read from the
counter's TTL. `code: "rate_limited"` is stable: the storefront treats this
429 as expected. While an e-mail is blocked, the correct password is refused
too.

Why every actor type and `GET`: Medusa accepts any actor type in the URL (no
`authMethodsPerActor` is configured) and checks the password of the e-mail's
auth identity whatever it is, so `/auth/anything/emailpass` is the same
password check as `/auth/customer/emailpass`; and its `GET` handler reads the
body too. The middlewares therefore use Medusa's own route patterns, with the
decoded params, so `/auth/Customer/emailpass`, `/auth/customer/email%70ass`, a
trailing slash and a form-encoded body all count. `user` (any case) is the
admin rule; an admin's e-mail sent to a customer route counts in the
`customer_login` bucket, so it gets 5 + 10 guesses per 15 minutes at most.

Not limited: a request without a usable e-mail (missing, empty, not a string:
Medusa answers it 401 without checking any password), other providers, and
the other auth routes (`reset-password`, `update`, `callback`, token/session
routes).

## How it works

- `src/config/auth-rate-limit.ts`: the rules above, the Redis key prefix and
  timeouts, which rule applies to a route, and the settings from the
  environment. Thresholds are code, not environment variables: changing them
  is a reviewed change.
- `src/lib/auth-rate-limit/limiter.ts`: the limiter, with the store, secret
  and clock injected (unit tested in `__tests__`). The e-mail is trimmed and
  lower-cased, then keyed as
  `auth-rate-limit:<rule>:<HMAC-SHA256(COOKIE_SECRET, e-mail), hex>`. The
  e-mail and the password are never stored, logged or returned. Rotating
  `COOKIE_SECRET` resets every counter.
- `src/lib/auth-rate-limit/redis-store.ts`: one Lua script per operation, so
  each one is atomic. An attempt is **reserved** (`INCR`, the window starts
  with the first one, fixed window) before Medusa handles the request, so
  parallel requests cannot all pass a check made before any of them failed.
  When the answer has been sent, its status settles the reservation: 401
  keeps it, 2xx deletes the counter (login), anything else (400, 5xx) gives
  it back. A dropped connection keeps it.
- `src/lib/auth-rate-limit/middleware.ts` and `index.ts`, wired in
  `src/api/middlewares.ts`. Medusa parses the body before route middlewares
  and sorts its own route middlewares and these together by path, so they
  run before the auth route handler.
- The limiter has its own Redis connection, opened on the first limited
  request (builds, `medusa exec`, the worker and unit tests never connect)
  and closed on process exit. Medusa shares no Redis client in the
  container, and the event bus connection waits indefinitely while Redis is
  down, which would hang logins.

## Configuration

| Variable | Default | Effect |
|---|---|---|
| `REDIS_URL` | none | The same Redis Medusa uses. Without it the limit is **off**, with one warning at boot: `[auth-rate-limit] REDIS_URL is not set: login and registration are NOT rate limited.` (Medusa's Redis event bus needs `REDIS_URL` anyway, so in this project a backend without it does not boot.) |
| `AUTH_RATE_LIMIT_ENABLED` | on | `false` (or `0`, `no`, `off`) turns the limit off, with a warning at boot. Unset, empty and `true` keep it on; any other value keeps it on with a warning. Meant for an emergency, not for normal operation |

Nothing else is configurable from the environment. The e2e Medusa
(`docs/e2e.md`) runs with the limit on, against `E2E_REDIS_URL`.

## When Redis fails

**Fail open.** If a Redis command fails or takes more than 1 s (for example
Redis is down, restarting or overloaded), the request goes through without a
limit, and a warning is logged without the e-mail:
`[auth-rate-limit] could not check the customer_login limit, letting the
request through (fail open): ...`. Connection errors are logged as
`[auth-rate-limit] Redis connection error: ...`. Each kind of warning is
logged at most once a minute, with the number suppressed in between. While
the connection is known to be down, the limiter fails at once instead of
waiting; while Redis hangs, each login waits up to 1 s.

The alternative, fail closed, would turn every Redis outage into a login
outage for every customer and admin. An attacker cannot cause fail open
through the auth routes; it needs Redis itself to fail. Watch for these
warnings in the logs: during an outage the limit is not there.

## Risks and limits

- **Locking out a victim.** Anyone who knows an e-mail can block its login for
  up to 15 minutes (10 wrong passwords), again and again. That is why only
  failures count and the window is short. The password-reset flow is not
  limited, so it stays available.
- **Not covered:** a slow, distributed guess (10 per 15 minutes per e-mail is
  still 960 a day), credential stuffing across many e-mails from one IP (the
  WAF's job), account enumeration (registration answers "Identity with email
  already exists"; login timing differs for existing e-mails, because scrypt
  only runs for them).
- **Cost:** one Redis round trip before every limited request and one after
  it; the scripts are tiny.

## Tests

- `pnpm test:unit`: `src/config/__tests__/auth-rate-limit.unit.spec.ts`,
  `src/lib/auth-rate-limit/__tests__/*.unit.spec.ts` (thresholds, windows,
  Retry-After, reset, release, parallel requests, hashing, normalisation,
  fail open, the middleware's answers).
- `pnpm test:integration:http`: `integration-tests/http/auth-rate-limit.spec.ts`
  (needs PostgreSQL and the Redis of `REDIS_URL`) and
  `auth-rate-limit-disabled.spec.ts` (`AUTH_RATE_LIMIT_ENABLED=false`). For
  example, against the PostgreSQL and Redis of a local compose stack:

  ```bash
  DB_HOST=localhost DB_PORT=5432 DB_USERNAME=medusa DB_PASSWORD=medusa \
  REDIS_URL=redis://localhost:6379 STRIPE_API_KEY= \
  INPOST_API_TOKEN=test INPOST_ORGANIZATION_ID=test \
  pnpm test:integration:http
  ```

  `DB_HOST` must be `localhost`, not `127.0.0.1`: Medusa's test runner turns
  on SSL for any database URL without `localhost`.
