import { logger } from "@medusajs/framework/logger";
import { parseBoolean } from "./env";

const S3_REQUIRED_VARS = [
  "S3_FILE_URL",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
] as const;

/**
 * Public URL of this backend. Without S3, the local file provider builds
 * file URLs from it - its own default is http://localhost:9000.
 */
function getBackendUrl(env: NodeJS.ProcessEnv): string {
  if (env.BACKEND_PUBLIC_URL) {
    return env.BACKEND_PUBLIC_URL;
  }

  return env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${env.RAILWAY_PUBLIC_DOMAIN}`
    : "http://localhost:9000";
}

/**
 * @medusajs/file-s3's provider options are snake_case at the input
 * boundary (mapped to camelCase internally) - verified against
 * node_modules/@medusajs/file-s3/dist/services/s3-file.js rather than
 * assumed from its .d.ts, which documents the internal, already-mapped
 * shape and would be wrong to copy here.
 */
function getS3Options(env: NodeJS.ProcessEnv) {
  return {
    file_url: env.S3_FILE_URL,
    access_key_id: env.S3_ACCESS_KEY_ID,
    secret_access_key: env.S3_SECRET_ACCESS_KEY,
    region: env.S3_REGION || "us-east-1",
    bucket: env.S3_BUCKET,
    endpoint: env.S3_ENDPOINT,
    acl: env.S3_ACL || false,
    download_file_duration: 24 * 60 * 60,
    additional_client_config: {
      // MinIO and older Railway buckets need path-style requests; new Railway
      // buckets, R2 and AWS S3 use virtual-hosted style (the SDK default).
      forcePathStyle: parseBoolean(env.S3_FORCE_PATH_STYLE, false),
    },
  };
}

/**
 * File Module provider. S3-compatible storage (Railway Bucket, AWS S3,
 * Cloudflare R2, MinIO, ...) is opt-in via env vars so local/test
 * environments without S3 configured keep using the local file provider -
 * swapping providers never requires a code change, only these environment
 * variables.
 */
export function getFileProvider(env: NodeJS.ProcessEnv = process.env) {
  const missing = S3_REQUIRED_VARS.filter((name) => !env[name]);

  if (missing.length === 0) {
    return {
      resolve: "@medusajs/medusa/file-s3",
      id: "s3",
      options: getS3Options(env),
    };
  }

  if (env.S3_ENDPOINT || missing.length < S3_REQUIRED_VARS.length) {
    logger.warn(
      `S3 file storage is only partially configured - missing: ${missing.join(", ")}. Falling back to local file storage, which is ephemeral on Railway!`,
    );
  }

  return {
    resolve: "@medusajs/medusa/file-local",
    id: "local",
    options: {
      backend_url: `${getBackendUrl(env)}/static`,
    },
  };
}
