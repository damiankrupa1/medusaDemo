# Ephemeral Medusa for the storefront e2e suite

The storefront's Playwright suite (damiankrupa1/nuxtMedusa, `pnpm test:e2e`,
specs tagged `@medusa`) needs a real Medusa: server-side rendering calls Medusa
from the Nitro process, so browser mocks can't replace it. This page describes
the throwaway Medusa it runs against, in GitHub Actions and locally (issue #28).

> **Warning: this environment must never point at production data.** It
> creates regions, a store setup and products, and the storefront suite
> creates carts, customers and orders in it. Use only the local
> `docker-compose.e2e.yml` stack or a database created just for e2e. Never
> set `E2E_DATABASE_URL` to the Railway database (or a copy of it), never use
> live Stripe keys, and never reuse its publishable key outside the e2e suite.
> The safety guard below refuses the obvious mistakes, but it is a safety net,
> not permission.

## What it contains

`apps/backend/src/scripts/e2e-seed.ts`, with every value in
`apps/backend/src/scripts/e2e/data.ts`. The handles are the defaults of the
storefront's `tests/e2e/support/test-data.ts`; keep both in sync
(`data.unit.spec.ts` pins them).

| What | Value |
|---|---|
| Regions | `E2E Poland`: PLN, country `pl` (the storefront's default country). `E2E Euro`: EUR, country `de` |
| Store | `E2E Store`, currencies PLN (default) and EUR, default region `E2E Poland` |
| Sales channel / publishable key | `E2E Storefront` (key title `E2E Storefront`) |
| Category / collection | `e2e-knitwear` / `e2e-autumn` |
| `e2e-wool-coat` | 6 variants (Size S/M/L x Color Charcoal/Camel), `manage_inventory` off, 899 PLN / 199 EUR; in the category and the collection |
| `e2e-linen-shirt` | 3 variants (S/M/L), inventory managed, 1000 in stock each, 249 PLN / 59 EUR; in the collection |
| `e2e-sold-out` | 2 variants (S/M), inventory managed, 0 in stock, no backorders, 499 PLN / 119 EUR; in the category and the collection |
| Shipping | `Standard` (type code `standard`, manual provider) in PL (14.99 PLN) and DE (9.99 EUR); `InPost Paczkomat` (provider `inpost_inpost`, `data.id = inpost_locker_standard`) in PL (12.99 PLN). One stock location `E2E Warehouse` |
| Payment | `pp_system_default` in both regions. Stripe: see below |
| Taxes | Tax regions `pl` and `de` with the system provider (no rates) |
| Must not exist | `e2e-no-such-product`, `e2e-no-such-category`, `e2e-no-such-collection` (the seed checks this at the end) |

Deterministic: no random values, dates or external images; only Medusa's ids
and the publishable key token differ between databases. Idempotent: everything
is looked up by its fixed name or handle and created only when missing, so a
second run changes nothing and prints the same key. It does not revert edits
made in between; start from an empty database for that.

## How it runs

Everything goes through `apps/backend/scripts/e2e-medusa.mjs`:

| Command (in `apps/backend`) | Does |
|---|---|
| `pnpm e2e:migrate` | `medusa db:migrate --skip-scripts` |
| `pnpm e2e:seed` | `medusa exec ./src/scripts/e2e-seed.ts` |
| `pnpm e2e:setup` | both, in that order |
| `pnpm e2e:start` | `medusa start` on `127.0.0.1:9100`, admin disabled |
| `pnpm e2e:smoke` | checks a running e2e Medusa through the Store API (needs `E2E_MEDUSA_BACKEND_URL`, `E2E_MEDUSA_PUBLISHABLE_KEY`) |

Why `--skip-scripts`: every file in `src/migration-scripts` runs once on
`medusa db:migrate`. `initial-data-seed.ts` would create the demo `Europe`
region (which already owns `de`) and the `t-shirt`... products, and the e2e
seed refuses such a database. For the same reason the e2e seed is in
`src/scripts`, not in `src/migration-scripts`: there it would run on every
production migration.

The launcher sets every variable `medusa-config.ts` reads, so neither
`apps/backend/.env` nor variables exported in your shell (dev database, S3,
Stripe, Payload) leak into the e2e Medusa. Only these change it, all optional:

| Variable | Default |
|---|---|
| `E2E_DATABASE_URL` | `postgres://medusa_e2e:medusa_e2e@127.0.0.1:55432/medusa_e2e` |
| `E2E_REDIS_URL` | `redis://127.0.0.1:56379` |
| `E2E_MEDUSA_PORT` | `9100` |
| `E2E_STOREFRONT_ORIGINS` | `http://127.0.0.1:3100,http://localhost:3100` (`STORE_CORS`, also in `AUTH_CORS`) |
| `E2E_STRIPE_SECRET_KEY` | empty; `sk_test_...` only |
| `E2E_SEED_ALLOWED_DB_HOSTS` | empty; extra database hosts (see the guard) |
| `E2E_SEED_OUTPUT_FILE` | empty; the seed appends `E2E_MEDUSA_BACKEND_URL=...` and `E2E_MEDUSA_PUBLISHABLE_KEY=...` to it |

Fixed values: `NODE_ENV=development`, `ADMIN_DISABLED=true`, telemetry off,
local file storage (all `S3_*` empty), Payload SSO off, `JWT_SECRET` /
`COOKIE_SECRET` random per process. The InPost provider refuses to boot
without `INPOST_API_TOKEN` and `INPOST_ORGANIZATION_ID`, so both get
placeholders (`e2e-placeholder...`); they are not credentials, and nothing in
the suite reaches ShipX (only fulfilling an order would).

### Safety guard

`src/scripts/e2e/guard.ts` (unit tested). The seed refuses, listing every
reason, unless:

1. `E2E_SEED=1` is set (the launcher sets it; running `medusa exec` on the
   seed by hand without it fails);
2. `NODE_ENV` is not `production`;
3. the `DATABASE_URL` host is `localhost`, `127.0.0.1`, `::1` or `postgres`,
   or listed in `E2E_SEED_ALLOWED_DB_HOSTS`; it never contains `railway`,
   `rlwy.net` or `medusademo-production` (not even when allow-listed); and the
   database name contains `e2e` (so the regular dev database `medusa` of
   `docker-compose.yml` is refused too);
4. `STRIPE_API_KEY` is not a live key (`sk_live_` / `rk_live_`);
5. after connecting: the database has no products other than the three e2e
   ones and no regions other than the two e2e ones. A dev database, the demo
   seed or an imported catalog is refused.

The launcher repeats rule 3 and refuses a non-test Stripe key before it runs
anything, so migrations never run against such a database either.

## Locally

Docker is required (only for PostgreSQL and Redis; Medusa runs natively, Node
22 and pnpm 11 as for development).

```bash
pnpm install
docker compose -f docker-compose.e2e.yml up -d --wait   # tmpfs, 127.0.0.1:55432 / :56379
cd apps/backend
pnpm e2e:setup        # prints E2E_MEDUSA_BACKEND_URL and E2E_MEDUSA_PUBLISHABLE_KEY
pnpm e2e:start        # keep it running
```

In another terminal, optionally `pnpm e2e:smoke` with the two printed
variables, then in the storefront checkout:

```bash
E2E_MEDUSA_BACKEND_URL=http://127.0.0.1:9100 \
E2E_MEDUSA_PUBLISHABLE_KEY=pk_... \
pnpm test:e2e
```

Afterwards stop `pnpm e2e:start` (Ctrl+C) and
`docker compose -f docker-compose.e2e.yml down -v`. The database lives in
tmpfs, so `down` always means the next `e2e:setup` starts empty. Ports and the
project name (`medusa-e2e`) differ from `docker-compose.yml`, so it can run
next to the dev stack (if the dev backend is on 9000, the e2e one is on 9100).

## GitHub Actions

`.github/actions/e2e-medusa` is a composite action that does all of the above
in the calling job and exports `E2E_MEDUSA_BACKEND_URL` and
`E2E_MEDUSA_PUBLISHABLE_KEY` to its later steps (also as outputs
`backend-url`, `publishable-key`, plus `log-file`). It is not a reusable
workflow (`workflow_call`) on purpose: a called workflow is a separate job on
a separate runner, and a Medusa started there would not be reachable from the
storefront's test job. The calling job needs an ubuntu runner (Docker), Node 22
and pnpm 11 on PATH.

In the storefront's `.github/workflows/e2e.yml`, after "Install dependencies"
and before "E2E tests":

```yaml
      # Ephemeral Medusa with the e2e seed (damiankrupa1/medusaDemo, docs/e2e.md).
      # Pin a commit SHA of medusaDemo instead of main once it is merged.
      - name: Start the e2e Medusa
        id: medusa
        uses: damiankrupa1/medusaDemo/.github/actions/e2e-medusa@main
        # with:
        #   stripe-secret-key: ${{ secrets.E2E_STRIPE_SECRET_KEY }}  # sk_test_ only, later

      # E2E_MEDUSA_BACKEND_URL / E2E_MEDUSA_PUBLISHABLE_KEY are now in the env,
      # so the @medusa specs run
      - name: E2E tests
        run: pnpm test:e2e

      - name: Upload the Medusa log
        if: ${{ failure() }}
        uses: actions/upload-artifact@v4
        with:
          name: e2e-medusa-log
          path: ${{ steps.medusa.outputs.log-file }}
          retention-days: 7
          if-no-files-found: ignore
```

`.github/workflows/e2e-medusa.yml` in this repository runs the same action on
pull requests that touch the backend, the action or the compose file: it
starts the Medusa from an empty database, runs the unit tests and
`pnpm e2e:smoke`, then runs the seed a second time and checks that the key and
the data are unchanged.

## Stripe

Not configured yet (TODO, needs the owner). `medusa-config.ts` always
registers the Stripe provider; it only needs `STRIPE_API_KEY` to be defined, so
the e2e Medusa boots with it empty and attaches only `pp_system_default` to
the regions. For the later checkout/payment specs:

1. Add a Stripe **test mode** secret key (`sk_test_...`) of the account whose
   publishable test key the storefront uses, as a secret (e.g.
   `E2E_STRIPE_SECRET_KEY`) in the storefront repository.
2. Pass it as `stripe-secret-key` to the action (locally:
   `E2E_STRIPE_SECRET_KEY`). The seed then also attaches `pp_stripe_stripe` to
   both regions (also on an existing e2e database). The launcher and the seed
   refuse any other kind of key.
3. Not covered here, and not tested yet: webhooks (`webhookSecret`), BLIK and
   Przelewy24 (`pp_stripe-blik_stripe`, `pp_stripe-przelewy24_stripe`), and the
   InPost sandbox. They are out of scope of #28.
