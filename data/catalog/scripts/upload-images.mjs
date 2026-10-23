#!/usr/bin/env node
// Uploads data/catalog/images/*.webp through the target backend's File Module
// (POST /admin/uploads - the same endpoint Medusa Admin uses for product
// media) and records the returned public URLs in uploads/<host>.json.
//
//   MEDUSA_BACKEND_URL=... MEDUSA_ADMIN_EMAIL=... MEDUSA_ADMIN_PASSWORD=... \
//     node data/catalog/scripts/upload-images.mjs [--confirm-host <host>] [--concurrency 2] [--batch 4]
//       [--ids FS-0001,FS-0002]
//
// - resumable: images already in the manifest with the same sha256 are skipped
// - bounded: at most <concurrency> requests in flight, <batch> files each
// - each returned URL is fetched back and must serve the same bytes as image/webp
// - a remote backend that keeps uploads on its own disk (local file provider,
//   wiped on every Railway redeploy) stops the script after the first batch
// The backend decides where files go (S3 bucket on Railway, MinIO or local
// disk elsewhere); this script never talks to storage directly.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchWithRetry, mapLimit } from './lib/http.mjs'
import { createAdminClient, isLocalBackend } from './lib/medusa-admin.mjs'
import { selectProducts } from './lib/selection.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argValue = (name, fallback) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : fallback)
const concurrency = argValue('--concurrency', 2)
const batchSize = argValue('--batch', 4)

const admin = await createAdminClient(args)
const host = new URL(admin.base).host.replace(/[^a-z0-9.-]/gi, '_')
const manifestPath = join(ROOT, 'uploads', `${host}.json`)
mkdirSync(dirname(manifestPath), { recursive: true })
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : { backend: admin.base, files: {} }

const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'))
const products = selectProducts(catalog.products, args)
const images = products.flatMap((p) => p.images).filter((i) => i.sha256)
const missingFiles = products.flatMap((p) => p.images).filter((i) => !i.sha256).length
if (missingFiles) console.warn(`${missingFiles} catalog images have not been prepared yet and are skipped`)

const todo = images.filter((i) => manifest.files[i.file]?.sha256 !== i.sha256)
console.log(`Backend ${admin.base}: ${images.length} images, ${images.length - todo.length} already uploaded, ${todo.length} to upload`)

const batches = []
for (let i = 0; i < todo.length; i += batchSize) batches.push(todo.slice(i, i + batchSize))

function saveManifest() {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 1)}\n`)
}

async function verify(url, image) {
  const res = await fetchWithRetry(url, {}, { retries: 3, label: `verify ${image.file}` })
  const type = res.headers.get('content-type') ?? ''
  const body = Buffer.from(await res.arrayBuffer())
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  if (!type.startsWith('image/webp')) throw new Error(`${url} -> content-type ${type}`)
  if (body.length !== image.bytes) throw new Error(`${url} -> ${body.length} bytes, expected ${image.bytes}`)
}

let uploaded = 0
const results = await mapLimit(batches, concurrency, async (batch) => {
  const form = new FormData()
  for (const image of batch) {
    const data = readFileSync(join(ROOT, 'images', image.file))
    form.append('files', new Blob([data], { type: 'image/webp' }), image.file)
  }
  const { files } = await admin.request('POST', '/admin/uploads', { form, retries: 4 })
  if (files?.length !== batch.length) throw new Error(`expected ${batch.length} files back, got ${files?.length}`)
  // The local file provider serves uploads from <backend>/static (see
  // apps/backend/src/config/file-storage.ts) - the container's disk on Railway.
  if (!isLocalBackend(admin.base) && files.some((f) => new URL(f.url).pathname.startsWith('/static/'))) {
    console.error(`${admin.base} keeps uploads on its local disk (${files[0].url}), which is wiped on redeploy. Configure the S3_* variables on the backend first; nothing was recorded in the manifest.`)
    process.exit(1)
  }
  for (const [i, image] of batch.entries()) {
    await verify(files[i].url, image)
    manifest.files[image.file] = { url: files[i].url, file_id: files[i].id, sha256: image.sha256, bytes: image.bytes, uploaded_at: new Date().toISOString() }
  }
  uploaded += batch.length
  saveManifest()
}, {
  onProgress: (done, total) => {
    if (done % 10 === 0 || done === total) console.log(`  batches ${done}/${total} (${uploaded} images uploaded)`)
  },
})

saveManifest()
const failed = results.filter((r) => !r.ok)
for (const r of failed) console.error(`FAILED batch: ${r.error.message}`)
const inManifest = images.filter((i) => manifest.files[i.file]?.sha256 === i.sha256).length
console.log(`Done: ${inManifest}/${images.length} images in ${manifestPath}, ${failed.length} failed batches`)
process.exitCode = failed.length ? 1 : 0
