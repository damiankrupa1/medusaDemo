/**
 * Read-only public proxy for the private Railway Bucket that stores Medusa
 * uploads (product and variant images). Railway Buckets cannot be made
 * public, so the backend's S3_FILE_URL points at this function instead of
 * the bucket itself.
 *
 * Runs as a Railway Function (single file, Bun runtime) - see
 * docs/deployment-railway.md. It answers GET and HEAD for single object keys
 * only: it never lists, writes or deletes anything.
 *
 * Environment - the same S3_* values as the backend:
 *   S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 *   S3_REGION (default "us-east-1", use "auto" for Railway),
 *   S3_FORCE_PATH_STYLE ("true" only for older path-style buckets / MinIO)
 */
import { S3Client, type HeadersInit } from "bun"

// Medusa appends a ULID to every uploaded file key, so a key's content never
// changes and responses can be cached indefinitely.
const CACHE_CONTROL = "public, max-age=31536000, immutable"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`bucket-proxy: ${name} is not set`)
  }
  return value
}

const bucket = requireEnv("S3_BUCKET")
const endpoint = requireEnv("S3_ENDPOINT")
const forcePathStyle = ["true", "1", "yes"].includes(
  (process.env.S3_FORCE_PATH_STYLE ?? "").toLowerCase()
)

/** Bun expects virtual-hosted endpoints to already contain the bucket name. */
function virtualHostedEndpoint(baseEndpoint: string, bucketName: string) {
  const url = new URL(baseEndpoint)
  url.hostname = `${bucketName}.${url.hostname}`
  return url.origin
}

const s3 = new S3Client({
  accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
  secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
  region: process.env.S3_REGION || "us-east-1",
  ...(forcePathStyle
    ? { endpoint, bucket }
    : {
        endpoint: virtualHostedEndpoint(endpoint, bucket),
        virtualHostedStyle: true,
      }),
})

const text = (status: number, body: string, headers?: HeadersInit) =>
  new Response(body, { status, headers })

/**
 * Object key from the request path, or null when the path cannot be an
 * uploaded file. Dot segments are rejected so a path-style request can never
 * be resolved outside the configured bucket.
 */
function objectKey(request: Request): string | null {
  let key: string
  try {
    key = decodeURIComponent(new URL(request.url).pathname.slice(1))
  } catch {
    return null
  }

  const segments = key.split("/")
  if (!key || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return null
  }

  return key
}

function isMissingObject(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code
  return code === "NoSuchKey" || code === "NotFound"
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return text(405, "Method Not Allowed", { Allow: "GET, HEAD" })
    }

    const key = objectKey(request)
    if (!key) {
      return text(404, "Not Found")
    }

    const file = s3.file(key)

    let stat: Awaited<ReturnType<typeof file.stat>>
    try {
      stat = await file.stat()
    } catch (error) {
      if (isMissingObject(error)) {
        return text(404, "Not Found")
      }
      console.error(`bucket-proxy: reading "${key}" failed`, error)
      return text(502, "Bad Gateway")
    }

    const headers = new Headers({
      "Content-Type": stat.type || "application/octet-stream",
      // Sent with HEAD; Bun streams GET bodies with chunked encoding instead.
      "Content-Length": String(stat.size),
      "Cache-Control": CACHE_CONTROL,
      ETag: stat.etag,
      "Last-Modified": stat.lastModified.toUTCString(),
      // Uploaded files are served as-is: never sniff them into HTML and never
      // let a document opened directly from this origin run scripts.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    })

    if (request.method === "HEAD") {
      return new Response(null, { headers })
    }

    // file.stream() rather than `new Response(file)`: Bun turns the latter
    // into a 302 redirect to a short-lived presigned URL.
    return new Response(file.stream(), { headers })
  },
}
