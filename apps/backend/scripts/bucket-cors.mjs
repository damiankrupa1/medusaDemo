#!/usr/bin/env node
// Lets Medusa Admin upload to the S3 bucket straight from the browser.
//
// Admin's product import PUTs the CSV to a presigned bucket URL, which the
// browser only allows when the bucket's CORS configuration lists the Admin
// origin (Railway: docs.railway.com/storage-buckets/uploading-serving). This
// adds that rule - PUT/POST from the given origins, any headers - and reads
// the configuration back. Rules for other origins are kept, because
// PutBucketCors replaces the bucket's whole CORS configuration.
//
//   S3_ENDPOINT=https://t3.storageapi.dev S3_BUCKET=<bucket> \
//   S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
//     node apps/backend/scripts/bucket-cors.mjs --origin https://<admin domain> [--origin ...] [--apply]
//
// Without --apply it only reports. The bucket credentials come from the
// environment only and are never printed. S3_REGION defaults to `auto`, which
// Railway Bucket and R2 require (see docs/deployment-railway.md).

import { createRequire } from 'node:module'

// The AWS SDK ships with Medusa's S3 file provider (@medusajs/medusa ->
// @medusajs/file-s3); resolving it through that chain gives this script the
// backend's own SDK version without a dependency of its own.
const fromBackend = createRequire(import.meta.url)
const fromMedusa = createRequire(fromBackend.resolve('@medusajs/medusa/package.json'))
const fromFileS3 = createRequire(fromMedusa.resolve('@medusajs/file-s3/package.json'))
const { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } = fromFileS3('@aws-sdk/client-s3')

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const origins = args.flatMap((arg, i) => (arg === '--origin' && args[i + 1] ? [args[i + 1].replace(/\/+$/, '')] : []))

const missing = ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'].filter((name) => !process.env[name])
if (missing.length || !origins.length) {
  console.error(`Usage: S3_ENDPOINT=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... node bucket-cors.mjs --origin https://<admin domain> [--apply]`)
  if (missing.length) console.error(`Missing: ${missing.join(', ')}`)
  process.exit(1)
}
const invalid = origins.filter((origin) => !/^https?:\/\/[^/]+$/.test(origin))
if (invalid.length) {
  console.error(`--origin must be a scheme and host, e.g. https://admin.example.com (got ${invalid.join(', ')})`)
  process.exit(1)
}

const bucket = process.env.S3_BUCKET
const client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: ['true', '1', 'yes'].includes((process.env.S3_FORCE_PATH_STYLE ?? '').toLowerCase()),
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
})
const describe = (e) => `${e.name}${e.$metadata?.httpStatusCode ? ` (HTTP ${e.$metadata.httpStatusCode})` : ''}: ${e.message}`

async function currentRules() {
  try {
    const { CORSRules } = await client.send(new GetBucketCorsCommand({ Bucket: bucket }))
    return CORSRules ?? []
  } catch (e) {
    if (e.name === 'NoSuchCORSConfiguration') return []
    console.error(`Reading the CORS configuration failed - ${describe(e)}`)
    process.exit(1)
  }
}

console.log(`Bucket ${bucket}${process.env.S3_ENDPOINT ? ` @ ${process.env.S3_ENDPOINT}` : ''}`)
const rules = await currentRules()
console.log(`Current CORS rules: ${rules.length ? JSON.stringify(rules) : 'none'}`)

const allowsPut = (rule, origin) => rule.AllowedMethods?.includes('PUT') && (rule.AllowedOrigins?.includes(origin) || rule.AllowedOrigins?.includes('*'))
const todo = origins.filter((origin) => !rules.some((rule) => allowsPut(rule, origin)))
if (!todo.length) {
  console.log(`PUT is already allowed from ${origins.join(', ')} - nothing to do.`)
  process.exit(0)
}
if (!apply) {
  console.log(`Would allow PUT/POST from ${todo.join(', ')}. Re-run with --apply to write it.`)
  process.exit(0)
}

const rule = { AllowedOrigins: todo, AllowedMethods: ['PUT', 'POST'], AllowedHeaders: ['*'], MaxAgeSeconds: 3000 }
// An empty ID (as some S3-compatible stores return it) is not valid input.
const kept = rules.map(({ ID, ...rest }) => (ID ? { ID, ...rest } : rest))
try {
  await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: [...kept, rule] } }))
} catch (e) {
  console.error(`Writing the CORS configuration failed - ${describe(e)}`)
  process.exit(1)
}
console.log(`CORS rules now: ${JSON.stringify(await currentRules())}`)
