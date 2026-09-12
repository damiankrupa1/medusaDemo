# Local development

This covers running the Medusa backend (`apps/backend`) locally with the
full infrastructure it needs (PostgreSQL, Redis, and optionally
S3-compatible storage via MinIO). See root `CLAUDE.md` for day-to-day
commands and architecture conventions.

## 1. Start infrastructure

```bash
docker compose up -d
```

This starts, from the root `docker-compose.yml`:

- **PostgreSQL** on `localhost:5432` (user/password/db: `medusa`/`medusa`/`medusa`)
- **Redis** on `localhost:6379`
- **MinIO** (S3-compatible storage) API on `localhost:9002`, console on
  `localhost:9091` (moved off MinIO's default `9000` - the Medusa backend
  dev server already uses that port)
- A one-shot `minio-init` job that creates the `medusa-media` bucket and
  makes it publicly readable, so this matches what production S3 storage
  needs to do too

All three have healthchecks and persistent named volumes, so
`docker compose up -d` again after a reboot picks up existing data instead
of starting empty.

> If you already run a native PostgreSQL service on port 5432 (e.g. a
> Windows `postgresql-x64-*` service), stop it first or remap the
> `postgres` service's host port in `docker-compose.yml` and update
> `DATABASE_URL` accordingly. This isn't a theoretical warning: leaving a
> native Postgres bound to 5432 alongside Docker's own port forwarding
> produced confusing, hard-to-diagnose symptoms during testing (queries
> silently authenticating against the wrong database, wrapped by the app's
> connection-pool retry logic into a generic timeout with no indication
> which database was actually being hit). Confirm you're talking to the
> right one with `docker exec <postgres-container> psql -U medusa -d medusa
> -c "SELECT 1"` before assuming `localhost:5432` from the host reaches the
> container.

Meilisearch is **not** required and is disabled by default. Only start it
if you're actively adding search:

```bash
docker compose --profile search up -d
```

## 2. Configure environment

```bash
pnpm install
cp apps/backend/.env.template apps/backend/.env
```

Then edit `apps/backend/.env`:

```bash
DATABASE_URL=postgres://medusa:medusa@localhost:5432/medusa
REDIS_URL=redis://localhost:6379
```

To also exercise S3-compatible storage locally against the MinIO container
instead of the default local-disk provider, add:

```bash
S3_ENDPOINT=http://localhost:9002
S3_FILE_URL=http://localhost:9002/medusa-media
S3_BUCKET=medusa-media
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

Leave all `S3_*` vars unset to keep using Medusa's default local-disk file
provider - fine when you don't need to test uploads.

## 3. Run the backend

```bash
cd apps/backend
pnpm medusa db:migrate
pnpm medusa user -e admin@test.com -p supersecret
pnpm dev
```

Or from the repo root: `pnpm backend:dev` (see root `CLAUDE.md` for the
full command reference). Admin dashboard: `http://localhost:9000/app`.

## 4. Verify infrastructure is actually being used

```bash
curl http://localhost:9000/health/ready
```

Expected: `{"status":"ok","checks":{"database":"ok","redis":"ok"}}`. If
`redis` is missing or `error`, `REDIS_URL` isn't set/reachable; if
`database` is `error`, check `DATABASE_URL` and that
`docker compose ps` shows `postgres` as healthy.

To verify MinIO storage end-to-end: upload a product image in Admin, then
open the returned image URL (`http://localhost:9002/medusa-media/...`) in
a private browser window - it should load without authentication, exactly
like a real public S3 bucket would in production.

## 5. Tests

```bash
cd apps/backend
pnpm test:unit
pnpm test:integration:modules
pnpm test:integration:http
```

`test:integration:modules` and `test:integration:http` spin up their own
throwaway Postgres databases via `pg-god`, using `DB_HOST`/`DB_USERNAME`/
`DB_PASSWORD`/`DB_PORT` (see `apps/backend/.env.test` - not the app's own
`DATABASE_URL`, which those test runners ignore entirely). They point at
the same `docker compose` Postgres by default.

## 6. Production build simulation

**Don't run a second, independent `pnpm install --prod` inside
`.medusa/server`.** That directory has no lockfile of its own, so a fresh
install there resolves whatever patch version of each dependency is
newest *today*, not what the rest of the monorepo was actually built and
tested against - this is exactly what `Dockerfile.backend` avoids (see
`docs/deployment-railway.md`'s migrations section for the full story: it
caused `@mikro-orm/migrations` to silently drift to a version that hangs
forever during `medusa db:migrate`).

To sanity-check what actually ships to Railway without needing a Railway
account, reuse the monorepo's own `node_modules` instead - Node's normal
upward module resolution from `.medusa/server`'s compiled files finds
`apps/backend/node_modules` automatically:

```bash
cd apps/backend
pnpm build                      # produces .medusa/server
cd .medusa/server
NODE_ENV=production \
DATABASE_URL=postgres://medusa:medusa@localhost:5432/medusa \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=$(openssl rand -hex 32) \
COOKIE_SECRET=$(openssl rand -hex 32) \
STORE_CORS=http://localhost:8000 \
ADMIN_CORS=http://localhost:9000 \
AUTH_CORS=http://localhost:9000,http://localhost:8000 \
node ../../node_modules/@medusajs/cli/cli.js start
```

(Same pattern for `db:migrate` instead of `start`.) Then repeat the checks
from [Verify infrastructure](#4-verify-infrastructure-is-actually-being-used).

`Dockerfile.backend` was built and run end-to-end against this
`docker-compose.yml` stack (not just reviewed): `docker build`, then
`medusa start` in the resulting image connects to the dockerized
Postgres/Redis and serves `/health/ready` correctly. `medusa db:migrate`
inside the container is a known open issue - see
`docs/deployment-railway.md`'s troubleshooting section - it hung on this
machine's Docker Desktop/WSL2 setup even with dependency versions
confirmed identical to a working native run; running migrations natively
(as in step 3 above) against the same dockerized Postgres worked
correctly every time.
