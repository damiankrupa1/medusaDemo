# Deploying the Medusa backend to Railway

This covers the `apps/backend` Medusa v2 backend only. The storefront
(`apps/storefront`, a Next.js app - see the note at the end) deploys
separately to Vercel and is out of scope here.

## 1. Architecture

```
                 ┌───────────────────────────┐
  Vercel         │        RAILWAY            │
  storefront ───▶│  Medusa Server (API/Admin)│
  (HTTPS)        │        │                  │
                 │        ├─▶ PostgreSQL      │
                 │        ├─▶ Redis           │
                 │        └─▶ S3-compatible   │
                 │            storage         │
                 │  Medusa Worker             │
                 │  (same image, WORKER_MODE) │
                 │        ├─▶ PostgreSQL      │
                 │        └─▶ Redis           │
                 └───────────────────────────┘
```

- **Medusa Server** and **Medusa Worker** are two Railway services built from
  the *same* image (`Dockerfile.backend`). Which mode a container runs in is
  controlled entirely by the `WORKER_MODE` env var - no separate codebase or
  build.
- Meilisearch, Stripe and Resend are **not** part of this setup - see
  [Remaining / not implemented](#remaining--not-implemented).

## 2. Required Railway services

| Service | Purpose | Public domain? |
|---|---|---|
| PostgreSQL | Primary database | No (internal only) |
| Redis | Event bus, session store | No (internal only) |
| S3-compatible storage | Product/variant media | Its own (bucket URL) |
| Medusa Server | API + Admin dashboard | Yes |
| Medusa Worker | Background jobs/subscribers | No |

Railway's own **PostgreSQL** and **Redis** plugins work as-is - the backend
only ever talks to them through `DATABASE_URL` / `REDIS_URL`, never
hardcoded host/port/user/password.

For S3-compatible storage, use Railway's **Bucket** offering, or point the
same env vars at AWS S3 / Cloudflare R2 / any S3-compatible provider - see
[S3 storage](#5-s3-compatible-storage).

## 3. Environment variables

Set these on **both** the Server and Worker services unless noted otherwise.

### Database
| Var | Notes |
|---|---|
| `DATABASE_URL` | From the Railway PostgreSQL plugin's connection string |

### Redis
| Var | Notes |
|---|---|
| `REDIS_URL` | From the Railway Redis plugin's connection string |

### Security
| Var | Notes |
|---|---|
| `JWT_SECRET` | **Required in production** - `medusa-config.ts` throws on boot if unset when `NODE_ENV=production`. Generate with `openssl rand -hex 32`. |
| `COOKIE_SECRET` | Same as above. |

Never reuse the `supersecret` values from `.env.template` - those are the
same in every clone of this starter and are only accepted outside of
production.

### CORS
| Var | Example |
|---|---|
| `STORE_CORS` | `https://your-storefront.vercel.app` (+ any Vercel preview domain pattern the frontend needs) |
| `ADMIN_CORS` | `https://your-backend.up.railway.app` (wherever `/app` is actually opened from) |
| `AUTH_CORS` | Union of the above - anything that calls `/auth/*` |

Multiple origins are comma-separated. Avoid `*` in production; it's only
acceptable if you genuinely have no fixed set of caller origins.

### Worker mode
| Var | Server service | Worker service |
|---|---|---|
| `WORKER_MODE` | `server` | `worker` |

Local dev / a single all-in-one deployment can leave this at the default
`shared`.

### S3 (Server + Worker)
| Var | Notes |
|---|---|
| `S3_ENDPOINT` | Omit for real AWS S3; required for Railway Bucket/R2/MinIO |
| `S3_REGION` | e.g. `auto` for R2, a real AWS region for S3 |
| `S3_ACCESS_KEY_ID` | |
| `S3_SECRET_ACCESS_KEY` | |
| `S3_BUCKET` | |
| `S3_FILE_URL` | The **public** base URL files are served from - see [Storage security](#8-storage-security--testing-checklist) |
| `S3_FORCE_PATH_STYLE` | `true` for Railway Bucket/R2/MinIO, unset for real AWS S3 |

Leaving all of these unset makes Medusa fall back to its default local-disk
file provider - fine for a quick test, **not** fine for production on
Railway, since the container filesystem is ephemeral and wiped on every
redeploy.

### Medusa / misc
| Var | Notes |
|---|---|
| `PORT` | Set automatically by Railway - `medusa start` already reads it, no action needed |
| `ADMIN_DISABLED` | Leave unset/`false` unless you've confirmed the Admin build is genuinely too expensive for your Railway plan - see [Admin](#7-admin-dashboard) |

## 4. Redis usage in this project

Confirmed by reading the actual config, not assumed:

- `Modules.EVENT_BUS` uses `@medusajs/event-bus-redis` with `redisUrl` wired
  to `REDIS_URL` (`apps/backend/medusa-config.ts`).
- Medusa's own HTTP loader additionally uses `REDIS_URL` as the session
  store when set (falls back to an in-memory store otherwise - fine for a
  single instance, but you have two: Server + Worker, so `REDIS_URL` should
  always be set in production).
- No caching module or scheduled jobs currently exist in this project
  (`src/jobs` and `src/subscribers` are empty scaffolding) - nothing else to
  reconfigure for Redis right now.

## 5. S3-compatible storage

`apps/backend/medusa-config.ts` registers `Modules.FILE` with the
`@medusajs/file-s3` provider **only when all of `S3_FILE_URL`, `S3_REGION`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` are set** - otherwise
it's left unconfigured and Medusa uses its built-in local-disk provider.

The provider's actual input option names are **snake_case**
(`file_url`, `access_key_id`, ...) - verified against
`node_modules/@medusajs/file-s3/dist/services/s3-file.js` rather than
assumed from the `.d.ts`, which documents a different, internal shape.
`S3_FORCE_PATH_STYLE=true` maps to the client's `forcePathStyle` option,
required for Railway Bucket, Cloudflare R2 and MinIO (not for real AWS S3).

Because storage is entirely env-var driven, switching between Railway
Bucket, AWS S3, Cloudflare R2 or a self-hosted MinIO never requires a code
change.

## 6. Database migrations

`railway.json`'s `deploy.preDeployCommand` runs `pnpm migrate`
(`medusa db:migrate`) once, before the new deploy's start command, on the
**Server** service only (`railway.worker.json`, used by the Worker service,
does not set `preDeployCommand` - migrations should only run once per
deploy, not once per service).

Deployment order this produces:

```
PostgreSQL/Redis available
        ↓
new image built
        ↓
preDeployCommand: pnpm migrate   (Server service only)
        ↓
pnpm start                       (Server, then Worker)
        ↓
healthcheckPath: /health/ready   (Server only - gates traffic cutover)
```

Never add a destructive command (`db reset`, `drop database`, demo seed) to
this path - migrations only.

## 7. Admin dashboard

`ADMIN_DISABLED` already exists in `medusa-config.ts`
(`process.env.ADMIN_DISABLED === "true" || false`) - it is **not** forced on
by this setup. `pnpm build` was run locally to check: the Admin (Vite)
build completed in ~55s alongside the ~22s backend TS build, with no
excessive memory behavior observed. Unless your specific Railway plan's
build step actually OOMs, leave `ADMIN_DISABLED` unset and keep the Admin
available at `/app` on the Server service.

If a real memory problem shows up during a Railway build:
1. Check the actual Railway build logs for an OOM, not just a slow build.
2. Try a larger Railway build-time resource plan before disabling Admin.
3. Only disable Admin (`ADMIN_DISABLED=true`) as a last resort, and only on
   whichever service is actually failing to build.

## 8. Storage security / testing checklist

Before relying on S3 storage in production, verify uploaded media is
actually publicly reachable at the URL Medusa stores in the database:

1. In Admin, upload a product image.
2. `GET /store/products/:id` (or open the product in Admin) and read the
   image URL Medusa stored.
3. Open that URL in a **private/incognito** browser window (no cookies,
   no admin session).
4. Confirm it returns `HTTP 200` with the image, not `403`/`404`.

If step 4 fails, the bucket/object ACL is not actually public - fix the
bucket's public-read policy (or object ACL) for the provider you're using;
`S3_FILE_URL` must match whatever public base URL that policy serves from.

## 9. Health checks

- `GET /health` is Medusa's built-in endpoint - it is **only** proof the
  Node process is running (`res.status(200).send("OK")`, no DB/Redis
  check - confirmed by reading `@medusajs/medusa`'s own `start.js`).
- `GET /health/ready` (added in this repo, `src/api/health/ready/route.ts`)
  actually checks Postgres (`select 1`) and Redis (`PING`), returning `503`
  if either is down. Point Railway's `healthcheckPath` (Server service
  only) at `/health/ready`, not `/health`.

## 10. Vercel → Railway connection

The storefront needs the Server service's public Railway domain (or a
custom domain pointed at it) to call the Medusa API. Set that as the
storefront's backend-URL env var on Vercel, and add the storefront's Vercel
domain(s) to `STORE_CORS`/`AUTH_CORS` above. The exact env var name on the
storefront side depends on what's actually deployed there - not documented
further here per this task's scope (infrastructure only, not the
storefront).

## 11. Production deployment checklist

- [ ] `JWT_SECRET` / `COOKIE_SECRET` set to real random values on every
      service (not `supersecret`)
- [ ] `DATABASE_URL` / `REDIS_URL` point at the Railway PostgreSQL/Redis
      plugins
- [ ] `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` list real domains, no `*`
- [ ] All `S3_*` vars set on **both** Server and Worker
- [ ] `WORKER_MODE=server` on the Server service, `WORKER_MODE=worker` on
      the Worker service
- [ ] Server service's Railway config path is `railway.json`
      (`preDeployCommand` + `/health/ready`); Worker service's is
      `railway.worker.json` (no `preDeployCommand`, no healthcheck)
- [ ] Uploaded product image is reachable in a private browser window (see
      [Storage security](#8-storage-security--testing-checklist))
- [ ] `pnpm --filter=@dtc/backend build` succeeds locally before pushing

## 12. Backup strategy

What's stored where, and how to get it back:

| Data | Lives in | Backup |
|---|---|---|
| Products, orders, customers, translations, localized slugs, all Medusa state | PostgreSQL | Use Railway's PostgreSQL backup/restore feature (point-in-time restore, if available on your plan) rather than a custom script |
| Uploaded product/variant images | S3-compatible bucket | Use your storage provider's own backup/versioning (S3 bucket versioning, Railway Bucket's own retention, or R2 versioning) |
| Everything else (code, config) | Git | Already versioned |

**The database and the media bucket must both be restorable** - a DB
restore without the matching bucket state leaves image URLs pointing at
files that may no longer exist (or vice versa). Test a restore in a
non-production environment before you need it for real.

## 13. Rollback strategy

- **Code/config rollback**: redeploy the previous Railway deployment
  (Railway keeps deploy history) - this reverts the image, not the
  database.
- **Migration rollback**: Medusa migrations are forward-only by convention
  in this project (no down-migration is run automatically). If a bad
  migration ships, the safe path is a new forward migration that corrects
  it, not reverting the database schema out from under newer code -
  reverting the DB schema while old data already matches the new schema
  risks data loss. Only restore from a PostgreSQL backup if the migration
  was destructive and caught immediately.
- **Never** roll back by manually editing migration history
  (`mikro_orm_migrations` table) - this is explicitly against the project's
  own migration rules (see root `CLAUDE.md`).

## 14. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Deploy succeeds, `/health` is 200, but the app doesn't actually work | `/health` doesn't check anything - use `/health/ready` | `GET /health/ready`, inspect the `checks` object |
| `medusa-config.ts` throws on boot in production | `JWT_SECRET`/`COOKIE_SECRET` unset | Set both env vars |
| Uploaded images 404 from the storefront | Bucket isn't public-read, or `S3_FILE_URL` doesn't match the bucket's real public URL | Run the [storage security checklist](#8-storage-security--testing-checklist) |
| `ETIMEDOUT`/`ECONNREFUSED` to S3-compatible storage | `S3_FORCE_PATH_STYLE` missing for a non-AWS provider | Set `S3_FORCE_PATH_STYLE=true` for Railway Bucket/R2/MinIO |
| CORS errors from the storefront | Storefront's real Vercel domain isn't in `STORE_CORS`/`AUTH_CORS` | Update the CORS env vars, redeploy |
| Worker service never processes anything | `WORKER_MODE` not set to `worker` on that service | Check the Worker service's env vars |
| Migrations didn't run | `preDeployCommand` only exists on the Server service's `railway.json`, not the Worker's | Confirm the Server service is using `railway.json`, and that its deploy log shows the `pnpm migrate` step |

## Remaining / not implemented

Deliberately out of scope for this pass - see the CRITICAL RULES this task
was given (don't add dependencies without a concrete need):

- **Meilisearch** - not installed. To add later: install
  `@rokmohar/medusa-plugin-meilisearch` (or the official Medusa search
  module, whichever is current at the time), add a Meilisearch module to
  `medusa-config.ts`, add a Railway Meilisearch service (or use the
  `meilisearch` service already scaffolded - but disabled by default - in
  `docker-compose.yml` via `docker compose --profile search up -d`), and
  index existing products via its sync workflow.
- **Stripe** - not installed. No payment requirement exists in this
  project yet.
- **Resend** - not installed. No transactional email requirement exists in
  this project yet.
- **Nuxt/Vercel storefront configuration** - out of scope for this pass;
  the storefront in this repo is actually a Next.js app, not Nuxt (see the
  project's `CLAUDE.md`, which currently describes it incorrectly).
