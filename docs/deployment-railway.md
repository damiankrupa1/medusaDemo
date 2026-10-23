# Deploying the Medusa backend to Railway

This covers the `apps/backend` Medusa v2 backend only. The storefront
(`apps/storefront`, a Next.js app - see the note at the end) deploys
separately to Vercel and is out of scope here.

## 1. Architecture

```
                 ┌──────────────────────────────────┐
  Vercel         │             RAILWAY              │
  storefront ───▶│  Medusa Server (API/Admin)       │
  (HTTPS)        │        │                         │
                 │        ├─▶ PostgreSQL             │
                 │        ├─▶ Redis                  │
                 │        └─▶ Bucket (private) ◀──┐  │
                 │  Medusa Worker                 │  │
                 │  (same image, WORKER_MODE)     │  │
                 │        ├─▶ PostgreSQL           │  │
                 │        ├─▶ Redis                │  │
                 │        └─▶ Bucket (private)     │  │
  browsers ─────▶│  Bucket proxy (Function, GET) ─┘  │
  (images)       └──────────────────────────────────┘
```

- **Medusa Server** and **Medusa Worker** are two Railway services built from
  the *same* image (`Dockerfile.backend`). Which mode a container runs in is
  controlled entirely by the `WORKER_MODE` env var - no separate codebase or
  build.
- **Bucket proxy** is a Railway Function (`railway/functions/bucket-proxy.ts`)
  that serves uploaded images read-only, because a Railway Bucket cannot be
  made public - see [S3 storage](#5-s3-compatible-storage).
- Meilisearch, Stripe and Resend are **not** part of this setup - see
  [Remaining / not implemented](#remaining--not-implemented).

## 2. Required Railway services

| Service | Purpose | Public domain? |
|---|---|---|
| PostgreSQL | Primary database | No (internal only) |
| Redis | Event bus, session store | No (internal only) |
| Bucket | Product/variant media | No (private, cannot be made public) |
| Bucket proxy (Function) | Public, read-only access to bucket files | Yes (ideally a custom domain) |
| Medusa Server | API + Admin dashboard | Yes |
| Medusa Worker | Background jobs/subscribers | No |

Railway's own **PostgreSQL** and **Redis** plugins work as-is - the backend
only ever talks to them through `DATABASE_URL` / `REDIS_URL`, never
hardcoded host/port/user/password.

For S3-compatible storage, use Railway's **Bucket** offering together with
the bucket proxy, or point the same env vars at AWS S3 / Cloudflare R2 / any
S3-compatible provider whose bucket can be publicly readable (no proxy
needed then) - see [S3 storage](#5-s3-compatible-storage).

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
| `S3_FILE_URL` | **Required.** The **public** base URL files are served from. Railway Bucket: the bucket proxy's public URL. Public bucket elsewhere: its public URL. See [Storage security](#8-storage-security--testing-checklist) |
| `S3_ACCESS_KEY_ID` | **Required.** Railway Bucket: `${{<bucket>.ACCESS_KEY_ID}}` |
| `S3_SECRET_ACCESS_KEY` | **Required.** Railway Bucket: `${{<bucket>.SECRET_ACCESS_KEY}}` |
| `S3_BUCKET` | **Required.** Railway Bucket: `${{<bucket>.BUCKET}}` (not `RAILWAY_BUCKET_NAME`) |
| `S3_ENDPOINT` | Omit for real AWS S3; required for Railway Bucket (`${{<bucket>.ENDPOINT}}`), R2, MinIO |
| `S3_REGION` | Optional, defaults to `us-east-1`. Railway Bucket and R2: the literal value `auto`, **not** `${{<bucket>.REGION}}` - in this project that reference resolved to the bucket's location (`ams`), and the storage rejected everything the backend signed with it as `SignatureDoesNotMatch` (uploads failed with HTTP 500) |
| `S3_FORCE_PATH_STYLE` | `true` only for MinIO and for Railway buckets whose **Credentials** tab asks for path-style URLs (older buckets). Leave unset for new Railway buckets, R2 and AWS S3 (virtual-hosted style) |
| `S3_ACL` | Leave unset: the ACL header is then omitted, which Railway Bucket, R2 and new AWS buckets require (they reject ACLs). Set `public-read` only for legacy ACL-based buckets |
| `AWS_REQUEST_CHECKSUM_CALCULATION` | `WHEN_REQUIRED` for Railway Bucket and other S3-compatible storage. Read by the AWS SDK itself, not by Medusa. With the SDK default (`WHEN_SUPPORTED`) every presigned upload URL - e.g. the one Admin's product import PUTs the CSV to - carries the CRC32 of an **empty** body (`x-amz-checksum-crc32=AAAAAA==`), which no real file matches |
| `AWS_RESPONSE_CHECKSUM_VALIDATION` | `WHEN_REQUIRED`, for the same reason: stops the SDK adding `x-amz-checksum-mode` to presigned download URLs |

S3 is enabled only when all four **required** vars are set. If only some
`S3_*` vars are set, the backend logs `S3 file storage is only partially
configured - missing: ...` on boot and falls back to the local-disk file
provider - fine for a quick test, **not** fine for production on Railway,
since the container filesystem is ephemeral and wiped on every redeploy.

### Medusa / misc
| Var | Notes |
|---|---|
| `PORT` | Set automatically by Railway - `medusa start` already reads it, no action needed |
| `BACKEND_PUBLIC_URL` | Optional. Public URL of the backend, used for file URLs only when S3 is **not** configured (local-disk fallback). Defaults to `https://$RAILWAY_PUBLIC_DOMAIN` on Railway, `http://localhost:9000` elsewhere |
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

The setup follows the
[medusajs-2.0-for-railway-boilerplate](https://github.com/rpuls/medusajs-2.0-for-railway-boilerplate):
Medusa's stock `@medusajs/file-s3` provider, configured from `S3_*` env vars,
plus a read-only bucket proxy for Railway's private buckets.

`apps/backend/medusa-config.ts` registers `Modules.FILE` with the provider
chosen by `getFileProvider()` (`apps/backend/src/config/file-storage.ts`):

- the `@medusajs/file-s3` provider when `S3_FILE_URL`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY` and `S3_BUCKET` are all set, with `acl: false`
  unless `S3_ACL` is set (no ACL header on uploads), region defaulting to
  `us-east-1`, virtual-hosted addressing unless `S3_FORCE_PATH_STYLE` is
  true, and 24h presigned download URLs (e.g. product exports);
- otherwise the `@medusajs/file-local` provider, serving files from
  `BACKEND_PUBLIC_URL`/`https://$RAILWAY_PUBLIC_DOMAIN` + `/static` rather
  than its own `http://localhost:9000` default.

The provider's actual input option names are **snake_case**
(`file_url`, `access_key_id`, ...) - verified against
`node_modules/@medusajs/file-s3/dist/services/s3-file.js` rather than
assumed from the `.d.ts`, which documents a different, internal shape.

Because storage is entirely env-var driven, switching between Railway
Bucket, AWS S3, Cloudflare R2 or a self-hosted MinIO never requires a code
change.

### Railway Bucket + bucket proxy

Railway Buckets are private ("Public buckets are currently not supported"),
so a browser cannot load an image straight from one. Medusa stores
`S3_FILE_URL/<key>` as each image's URL, and `S3_FILE_URL` points at the
**bucket proxy** - `railway/functions/bucket-proxy.ts`, a single-file
Railway Function (Bun runtime, no dependencies) that reads from the bucket
with its credentials and streams the file back.

The proxy only answers `GET`/`HEAD` for a single object key: anything else
is `405`, a missing key or a path with empty/`.`/`..` segments is `404`, and
storage errors are `502` (logged as `bucket-proxy: reading "<key>" failed`).
Responses carry `Cache-Control: public, max-age=31536000, immutable` (every
upload gets a unique ULID-suffixed key), plus `X-Content-Type-Options:
nosniff` and a sandboxing `Content-Security-Policy`.

Setup:

1. Add a **Bucket** to the Railway project. Note on its **Credentials** tab
   whether it uses virtual-hosted (new buckets) or path-style URLs.
2. Add a **Function** service (e.g. `bucket-proxy`), paste the contents of
   `railway/functions/bucket-proxy.ts` into its **Source Code** tab and
   deploy it (Ctrl+S, then Shift+Enter).
3. On the Function, set (replace `<bucket>` with the bucket service's name):
   ```
   S3_ENDPOINT=${{<bucket>.ENDPOINT}}
   # a literal value, not ${{<bucket>.REGION}} - see S3_REGION in section 3
   S3_REGION=auto
   S3_BUCKET=${{<bucket>.BUCKET}}
   S3_ACCESS_KEY_ID=${{<bucket>.ACCESS_KEY_ID}}
   S3_SECRET_ACCESS_KEY=${{<bucket>.SECRET_ACCESS_KEY}}
   # only if the Credentials tab asks for path-style URLs:
   # S3_FORCE_PATH_STYLE=true
   ```
4. Give the Function a public domain - preferably a **custom domain**
   (e.g. `media.example.com`). Medusa stores the full URL of every image in
   the database, so changing `S3_FILE_URL` later does **not** update images
   that are already uploaded.
5. On **both** Server and Worker set the same `S3_*` variables as on the
   Function (including `S3_REGION=auto`) plus
   `S3_FILE_URL=https://<proxy domain>`, then redeploy. Variable changes
   only reach a service after its next deploy, so after changing any `S3_*`
   value redeploy the Server, the Worker **and** the Function - otherwise
   they run with different settings.
6. Let Admin upload to the bucket from the browser. Admin's product import
   PUTs the CSV straight to a presigned bucket URL, so the bucket needs a
   CORS rule for the Admin origin (Railway's
   [uploading guide](https://docs.railway.com/storage-buckets/uploading-serving));
   without it the import fails with "No 'Access-Control-Allow-Origin'
   header is present". `apps/backend/scripts/bucket-cors.mjs` adds that rule
   (`PUT`/`POST`, any headers, `MaxAgeSeconds` 3000) with the backend's own
   AWS SDK - no AWS CLI needed - and keeps rules for other origins. Run it
   locally with the bucket's **Credentials**; without `--apply` it only
   reports:
   ```bash
   S3_ENDPOINT=<bucket endpoint, e.g. https://t3.storageapi.dev> S3_BUCKET=<bucket name> \
   S3_ACCESS_KEY_ID=<bucket access key id> S3_SECRET_ACCESS_KEY=<bucket secret> \
     node apps/backend/scripts/bucket-cors.mjs --origin https://<admin domain> --apply
   ```
   `<admin domain>` is wherever `/app` is opened from (the Server's domain
   unless Admin is served elsewhere); pass `--origin` once per origin. The
   same rule can be set with `aws s3api put-bucket-cors` as in Railway's
   guide (add `--region auto`). Check - the response must contain
   `Access-Control-Allow-Origin`:
   ```bash
   curl -si -X OPTIONS https://<bucket name>.<endpoint host>/check \
     -H "Origin: https://<admin domain>" -H "Access-Control-Request-Method: PUT"
   ```
7. Run the [storage checklist](#8-storage-security--testing-checklist).

Cost: Railway doesn't charge for bucket egress, but it does charge for
service egress, so every image served through the proxy counts as the
Function's egress. Since responses are immutable, putting a CDN in front of
the proxy domain (e.g. Cloudflare) removes most of that traffic.

To try the proxy locally against the MinIO from `docker-compose.yml` (needs
Bun 1.2+):

```bash
PORT=8787 S3_ENDPOINT=http://localhost:9002 S3_BUCKET=medusa-media \
S3_ACCESS_KEY_ID=minioadmin S3_SECRET_ACCESS_KEY=minioadmin \
S3_FORCE_PATH_STYLE=true bun run railway/functions/bucket-proxy.ts
```

## 6. Database migrations

`railway.json`'s `deploy.preDeployCommand` runs
`node ../../node_modules/@medusajs/cli/cli.js db:migrate` once, before the new
deploy's start command, on the **Server** service only
(`railway.worker.json`, used by the Worker service, does not set
`preDeployCommand` - migrations should only run once per deploy, not once
per service).

Deployment order this produces:

```
PostgreSQL/Redis available
        ↓
new image built
        ↓
preDeployCommand: medusa db:migrate   (Server service only)
        ↓
medusa start                          (Server, then Worker)
        ↓
healthcheckPath: /health/ready        (Server only - gates traffic cutover)
```

Never add a destructive command (`db reset`, `drop database`, demo seed) to
this path - migrations only.

### Why the image doesn't run its own `pnpm install --prod`

Medusa's own docs have you `cd apps/backend/.medusa/server && npm install`
in production - a fresh, lockfile-less install in that directory. That
reliably reproduced a real bug during testing: with no lockfile to pin it,
that install resolved whatever patch version of each dependency was newest
*that day*, not what the rest of the monorepo was actually built and
tested against. Concretely, `@mikro-orm/migrations` drifted from this
repo's lockfile-pinned `6.6.1` to `6.6.12`, and `6.6.12` hung forever
partway through `medusa db:migrate` on a fresh database - found by diffing
resolved package versions between a working native run and a hanging
containerized one.

`Dockerfile.backend`'s production stage avoids this whole bug class: it
copies the monorepo's already-installed, lockfile-verified
`node_modules` (both `/repo/node_modules` and
`/repo/apps/backend/node_modules`, preserving pnpm's relative symlink
structure) instead of running a second, independent install. `.medusa/server`
has no `node_modules` of its own; Node's normal upward module resolution
from its compiled files finds everything in `apps/backend/node_modules`,
with the exact versions actually built and tested.

### Known open issue - verify on an actual Railway deploy

Even with dependency versions now provably identical to a known-working
native run (down to the same physical `node_modules` files, not just
matching version numbers), `medusa db:migrate` still hangs indefinitely on
a fresh database *specifically when run inside a container on this
machine's Docker Desktop/WSL2 setup* - while the exact same compiled code,
same `node_modules`, run natively (no container) on the same machine
against the same Postgres migrates and seeds successfully in seconds, and
`medusa start` in the container connects to Postgres/Redis and serves
`/health/ready` correctly. Ruled out as causes: network/DNS/TCP
reachability (fast and correct both ways), Postgres-side locks (none -
`pg_stat_activity` showed the connection idle, waiting on the *client*),
raw `pg` driver connectivity through the same container network (connects
and queries in under 30ms), `NODE_ENV`, compiled-vs-ts-node config
loading, and CPU count.

This points at something specific to Docker Desktop's Windows/WSL2
virtualization layer affecting Medusa's `db:migrate` code path in
particular (not `start`), not a defect in this Dockerfile, the app code, or
the dependency versions - but that couldn't be fully confirmed without
Linux infrastructure to compare against. **Before relying on
`preDeployCommand` for a real deploy, watch the first Server deploy's
build/deploy logs on Railway itself** to confirm the migration step
actually completes (Railway runs on real Linux, not a Windows-hosted
WSL2 VM, so this is expected to just work there - but that expectation
hasn't been directly verified against Railway's own infrastructure). If it
does hang there too, the fallback is running migrations directly against
the Railway Postgres from a normal (non-`.medusa/server`) checkout - e.g.
`railway run --service <server> pnpm --filter=@dtc/backend medusa db:migrate`
from a machine with the full monorepo installed - since that path is the
one actually proven to work.

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

If step 1 fails with HTTP 500, the Server log has the storage error - for
`SignatureDoesNotMatch` see [Troubleshooting](#14-troubleshooting).

If step 4 fails:

- **Railway Bucket:** the URL must start with the bucket proxy's domain
  (`S3_FILE_URL`). `404` means the key isn't in the bucket the proxy reads
  (compare the proxy's `S3_BUCKET`/`S3_ENDPOINT` with the backend's), `502`
  means the proxy can't reach the bucket - check the Function's logs and
  variables.
- **Public bucket elsewhere:** the bucket isn't actually publicly readable -
  fix its public-read bucket policy; `S3_FILE_URL` must match whatever public
  base URL that policy serves from.

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
- [ ] All required `S3_*` vars set on **both** Server and Worker, and no
      "S3 file storage is only partially configured" warning in their logs
- [ ] Bucket proxy Function deployed with the bucket's `S3_*` references,
      reachable on its (custom) domain, and `S3_FILE_URL` points at it
- [ ] `S3_REGION=auto` (a literal value, not `${{<bucket>.REGION}}`) on the
      Server, the Worker and the bucket proxy
- [ ] `AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED` and
      `AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED` on the Server and the
      Worker
- [ ] Bucket CORS rule allows `PUT` from the Admin origin - Products →
      Import in Admin uploads the CSV without a CORS error
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
| Uploaded images 403/404 from the storefront | Railway Bucket served directly instead of through the proxy, or a public bucket without a public-read policy, or `S3_FILE_URL` not matching where files are served | Run the [storage security checklist](#8-storage-security--testing-checklist) |
| Image upload fails with `AccessControlListNotSupported` / "bucket does not allow ACLs" | `S3_ACL` is set for a provider without ACL support | Unset `S3_ACL` |
| Image upload fails with HTTP 500 "An unknown error occurred"; Server log: "The request signature we calculated does not match the signature you provided"; presigned download URLs (e.g. product exports) return `403 SignatureDoesNotMatch` | `S3_REGION` is not `auto` - e.g. `${{<bucket>.REGION}}`, which resolves to the bucket's location such as `ams` | Set `S3_REGION=auto` on Server, Worker and the bucket proxy, then redeploy all three |
| Admin product import fails; browser console: "blocked by CORS policy ... No 'Access-Control-Allow-Origin' header" for a `PUT` to the bucket | The bucket has no CORS rule for the Admin origin | Add it - [Railway Bucket setup](#railway-bucket--bucket-proxy), step 6 |
| Presigned upload rejected even though CORS passes; the upload URL contains `x-amz-checksum-crc32=AAAAAA==` | The AWS SDK's default checksums put the CRC32 of an empty body into presigned URLs | Set `AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED` and `AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED` on Server and Worker, redeploy |
| `ETIMEDOUT`/`ECONNREFUSED`/`NoSuchBucket` to S3-compatible storage | Wrong addressing style for the provider | Railway: follow the bucket's **Credentials** tab (`S3_FORCE_PATH_STYLE=true` only for path-style buckets); MinIO: `true`; R2/AWS: unset |
| Images uploaded fine before, disappeared after a redeploy | S3 not actually enabled - files went to the ephemeral local disk | Check the `S3_*` vars on the service; a partial set logs "S3 file storage is only partially configured - missing: ..." on boot |
| Bucket proxy returns `502` | Proxy can't read the bucket (wrong credentials/endpoint/addressing style) | Function logs (`bucket-proxy: reading ... failed`) and its `S3_*` variables |
| CORS errors from the storefront | Storefront's real Vercel domain isn't in `STORE_CORS`/`AUTH_CORS` | Update the CORS env vars, redeploy |
| Worker service never processes anything | `WORKER_MODE` not set to `worker` on that service | Check the Worker service's env vars |
| Migrations didn't run | `preDeployCommand` only exists on the Server service's `railway.json`, not the Worker's | Confirm the Server service is using `railway.json`, and that its deploy log shows the `medusa db:migrate` step |
| `preDeployCommand` hangs / deploy never progresses past migrations | See [Known open issue](#known-open-issue---verify-on-an-actual-railway-deploy) above - reproduced locally in Docker Desktop/WSL2, not confirmed on Railway's own infrastructure | Check the deploy log's timestamp progress; if it's genuinely stuck (not just a large migration set taking a while), fall back to running `medusa db:migrate` from a full monorepo checkout against the Railway Postgres instead of relying on `preDeployCommand` |

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
