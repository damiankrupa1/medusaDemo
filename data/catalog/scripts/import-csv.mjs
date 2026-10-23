#!/usr/bin/env node
// Imports products.csv through the official Admin import API - the same
// sequence Medusa Admin runs (sdk.admin.product.createImport/confirmImport):
//   1. POST /admin/uploads/presigned-urls, then PUT the file to the returned
//      URL (S3) or POST /admin/uploads (local file provider)
//   2. POST /admin/products/imports        -> summary (to create / to update)
//   3. POST /admin/products/imports/:id/confirm   (only with --confirm)
//   4. poll the import workflow until it finishes
//
//   MEDUSA_BACKEND_URL=... MEDUSA_ADMIN_EMAIL=... MEDUSA_ADMIN_PASSWORD=... \
//     node data/catalog/scripts/import-csv.mjs [--file products.csv] [--confirm] [--confirm-host <host>]
//
// Use it when the browser upload in Admin fails, e.g. because the S3 bucket
// does not allow CORS PUT requests from the Admin origin. Running from Node
// is not subject to CORS.

import { readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchWithRetry, sleep } from './lib/http.mjs'
import { createAdminClient } from './lib/medusa-admin.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const file = join(ROOT, args.includes('--file') ? args[args.indexOf('--file') + 1] : 'products.csv')
const confirm = args.includes('--confirm')

const admin = await createAdminClient(args)
const content = readFileSync(file)
const originalname = basename(file)
console.log(`Backend ${admin.base}, file ${file} (${content.length} bytes)`)

const presigned = await admin.post('/admin/uploads/presigned-urls', {
  originalname,
  mime_type: 'text/csv',
  size: content.length,
})
let fileKey = presigned.filename
if (/^https?:\/\//.test(presigned.url)) {
  // Like the Admin SDK: no auth headers on the storage request.
  const put = await fetchWithRetry(presigned.url, { method: 'PUT', body: content }, { retries: 2, label: 'presigned PUT' })
  if (put.status >= 400) {
    // S3 explains the refusal in an XML body (e.g. BadDigest, SignatureDoesNotMatch).
    const code = (await put.text()).match(/<Code>([^<]+)<\/Code>/)?.[1]
    throw new Error(`Upload to storage failed: HTTP ${put.status}${code ? ` ${code}` : ''}`)
  }
} else {
  const form = new FormData()
  form.append('files', new Blob([content], { type: 'text/csv' }), originalname)
  const { files } = await admin.request('POST', '/admin/uploads', { form })
  fileKey = files[0].id
}

const started = await admin.post('/admin/products/imports', {
  file_key: fileKey,
  originalname,
  extension: 'csv',
  size: content.length,
  mime_type: 'text/csv',
})
console.log(`Import prepared: transaction ${started.transaction_id}, to create ${started.summary.toCreate}, to update ${started.summary.toUpdate}`)

if (!confirm) {
  console.log('Not confirmed (dry run). Re-run with --confirm to import, or confirm the pending import in Admin.')
  process.exit(0)
}

// Products of this catalog carry their catalog id in external_id (FS-0001, ...).
const { parseCsv } = await import('./lib/csv.mjs')
const expectedIds = new Set(parseCsv(content.toString('utf8')).rows.map((r) => r['Product External Id']).filter(Boolean))
const countImported = async () => {
  const products = await admin.listAll('/admin/products', 'products', { fields: 'id,external_id' })
  return products.filter((p) => expectedIds.has(p.external_id)).length
}
const before = await countImported()

await admin.post(`/admin/products/imports/${started.transaction_id}/confirm`, {})
console.log(`Confirmed. Waiting until ${expectedIds.size} catalog products exist (${before} before the import)...`)

// The workflow execution record is not a reliable signal (with the in-memory
// workflow engine it can stay "invoking" after the import finished), so
// progress is measured by the products that actually exist, plus the
// execution state to detect failures early.
const startedAt = Date.now()
let last = before
let lastChange = Date.now()
for (;;) {
  await sleep(10_000)
  let state = 'unknown'
  try {
    const { workflow_execution: execution } = await admin.get(
      `/admin/workflows-executions/import-products-as-chunks/${started.transaction_id}`,
      { fields: 'state' },
    )
    state = execution?.state ?? 'unknown'
  } catch {
    // execution record not available - rely on the product count
  }
  const imported = await countImported()
  if (imported !== last) {
    last = imported
    lastChange = Date.now()
  }
  console.log(`  ${Math.round((Date.now() - startedAt) / 1000)}s: ${imported}/${expectedIds.size} products, workflow ${state}`)
  if (imported >= expectedIds.size) break
  if (['failed', 'reverted', 'compensating'].includes(state)) {
    console.error('Import failed - see the backend logs and the Admin notifications for the reason.')
    process.exit(1)
  }
  if (Date.now() - lastChange > 10 * 60_000) {
    console.error(`No progress for 10 minutes (${imported}/${expectedIds.size}); check the backend logs.`)
    process.exit(1)
  }
}
console.log(`Import finished: ${last}/${expectedIds.size} catalog products exist.`)
