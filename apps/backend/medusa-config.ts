import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const isProduction = process.env.NODE_ENV === "production"

/**
 * JWT_SECRET/COOKIE_SECRET must never fall back to a predictable value in
 * production - refuse to boot instead of silently running with a secret
 * that's public in every Medusa starter repo.
 */
function requireSecret(value: string | undefined, name: string): string {
  if (value) {
    return value
  }

  if (isProduction) {
    throw new Error(
      `${name} is not set. Refusing to start in production with an insecure default secret.`
    )
  }

  return "supersecret"
}

/**
 * @medusajs/file-s3's provider options are snake_case at the input
 * boundary (mapped to camelCase internally) - verified against
 * node_modules/@medusajs/file-s3/dist/services/s3-file.js rather than
 * assumed from its .d.ts, which documents the internal, already-mapped
 * shape and would be wrong to copy here.
 */
const s3Config = {
  file_url: process.env.S3_FILE_URL,
  region: process.env.S3_REGION,
  access_key_id: process.env.S3_ACCESS_KEY_ID,
  secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
  bucket: process.env.S3_BUCKET,
  endpoint: process.env.S3_ENDPOINT,
  // MinIO/Cloudflare R2 require path-style requests; real AWS S3 does not
  // need this, so it's opt-in via env var rather than inferred.
  additional_client_config:
    process.env.S3_FORCE_PATH_STYLE === "true"
      ? { forcePathStyle: true }
      : undefined,
}

/**
 * S3-compatible storage (Railway Bucket, AWS S3, Cloudflare R2, MinIO, ...)
 * is opt-in via env vars so local/test environments without S3 configured
 * keep using Medusa's default local file provider - swapping providers
 * never requires a code change, only these environment variables.
 */
const hasS3Config = Boolean(
  s3Config.file_url &&
    s3Config.region &&
    s3Config.access_key_id &&
    s3Config.secret_access_key &&
    s3Config.bucket
)

module.exports = defineConfig({
  admin: {
    disable: process.env.ADMIN_DISABLED === "true" ||
      false,
  },
  featureFlags: {
    translation: true,
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    workerMode: (process.env.WORKER_MODE as "shared" | "worker" | "server" | undefined) || "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: requireSecret(process.env.JWT_SECRET, "JWT_SECRET"),
      cookieSecret: requireSecret(process.env.COOKIE_SECRET, "COOKIE_SECRET"),
    }
  },

  modules: {
    [Modules.EVENT_BUS]: {
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    [Modules.TRANSLATION]: {
      resolve: "@medusajs/medusa/translation",
    },
    localized_slugs: {
      resolve: "./src/modules/localized-slugs",
    },
    ...(hasS3Config
      ? {
          [Modules.FILE]: {
            resolve: "@medusajs/medusa/file",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/file-s3",
                  id: "s3",
                  options: s3Config,
                },
              ],
            },
          },
        }
      : {}),
  },
})
