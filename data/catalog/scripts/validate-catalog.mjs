#!/usr/bin/env node
// Validates catalog.json, the optimized images and products.csv.
//
//   node data/catalog/scripts/validate-catalog.mjs [--expected 1000] [--csv products.csv]
//        [--check-urls] [--check-backend [--confirm-host <host>]] [--ids FS-0001,FS-0002]
//
//   --check-urls     fetch every image URL in the CSV (must be 200, image/webp,
//                    same size as the local file)
//   --check-backend  resolve every referenced ID against MEDUSA_BACKEND_URL
//                    (needs admin credentials in the environment)
//   --ids            the CSV holds exactly these products (default: all of them)
//
// Writes validation-results.json next to catalog.json and exits with 1 when
// any error was found. Plain Node 22; sharp is only used, when available, for
// the perceptual near-duplicate check.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv } from './lib/csv.mjs'
import { fetchWithRetry, mapLimit } from './lib/http.mjs'
import { selectProducts } from './lib/selection.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const expected = Number(argValue('--expected') ?? 1000)
const csvPath = join(ROOT, argValue('--csv') ?? 'products.csv')
const MAX_BYTES = 1_000_000

const errors = []
const warnings = []
const error = (msg) => errors.push(msg)
const warn = (msg) => warnings.push(msg)
const stats = {}

// ------------------------------------------------------------ catalog.json

const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'))
const products = catalog.products
stats.products = products.length
stats.variants = products.reduce((n, p) => n + p.variants.length, 0)
stats.images_in_catalog = products.reduce((n, p) => n + p.images.length, 0)
stats.products_with_images = products.filter((p) => p.images.length > 0).length
stats.products_with_2plus_images = products.filter((p) => p.images.length >= 2).length

if (products.length !== expected) error(`expected exactly ${expected} products, found ${products.length}`)

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const dup = (values, what) => {
  const seen = new Map()
  for (const v of values) seen.set(v, (seen.get(v) ?? 0) + 1)
  const dups = [...seen].filter(([, n]) => n > 1)
  for (const [v, n] of dups.slice(0, 20)) error(`duplicate ${what}: "${v}" x${n}`)
  return dups.length
}
dup(products.map((p) => p.id), 'product id')
dup(products.map((p) => p.handle), 'handle')
dup(products.map((p) => p.title), 'title')
dup(products.map((p) => p.description), 'description')
dup(products.flatMap((p) => p.variants.map((v) => v.sku)), 'SKU')
dup(products.flatMap((p) => p.images.map((i) => i.file)), 'image file name')
dup(products.flatMap((p) => p.images.map((i) => i.source_key)), 'source photo')

const sentenceUse = new Map()
for (const p of products) {
  const where = `${p.id} (${p.handle})`
  if (!p.title?.trim() || p.title.length > 120) error(`${where}: title missing or longer than 120 characters`)
  if (!HANDLE.test(p.handle) || p.handle.length > 80) error(`${where}: handle is not lowercase ASCII words joined by "-" (max 80)`)
  if (!p.description || p.description.length < 150) error(`${where}: description shorter than 150 characters`)
  if (/[{}[\]]/.test(p.title + p.description)) error(`${where}: unresolved template marker in title/description`)
  if (!(p.price_pln > 0 && p.price_pln < 5000)) error(`${where}: implausible price ${p.price_pln} PLN`)
  if (!['published', 'draft'].includes(p.status)) error(`${where}: status ${p.status}`)
  if (p.status === 'published' && !p.images.length) error(`${where}: published without images`)
  if (!p.categories?.length) error(`${where}: no category`)
  const option = p.options?.[0]
  if (!option || p.options.length !== 1) error(`${where}: expected exactly one option`)
  else {
    const used = p.variants.map((v) => v.options[option.title])
    if (used.some((v) => !option.values.includes(v))) error(`${where}: variant uses a value not defined on the option`)
    if (new Set(used).size !== used.length) error(`${where}: two variants share the same option value`)
    if (used.length !== option.values.length) error(`${where}: option values without a variant`)
  }
  for (const v of p.variants) {
    if (!/^FS-\d{4}-[A-Z]{3}-[A-Z0-9]+$/.test(v.sku)) error(`${where}: unexpected SKU format ${v.sku}`)
    if (v.title !== v.options?.[option?.title]) error(`${where}: variant title ${v.title} differs from its option value`)
  }
  for (const s of p.description.split(/(?<=\.)\s+/)) sentenceUse.set(s, (sentenceUse.get(s) ?? 0) + 1)
}
// ------------------------------------------------------------ languages

// Base fields are English; Polish lives in i18n["pl-PL"]; one slug per locale.
const PL = 'pl-PL'
const EN = catalog.base_locale ?? 'en-US'
const POLISH_LETTERS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/
if (EN !== 'en-US') error(`catalog.json base_locale is ${EN}, expected en-US`)
dup(products.map((p) => p.i18n?.[PL]?.title), 'Polish title')
dup(products.map((p) => p.i18n?.[PL]?.description), 'Polish description')
dup(products.map((p) => p.slugs?.[PL]), 'pl-PL slug')
dup(products.map((p) => p.slugs?.[EN]), 'en-US slug')
for (const p of products) {
  const where = `${p.id} (${p.handle})`
  const pl = p.i18n?.[PL]
  if (!pl?.title || !pl?.description || !pl?.material) {
    error(`${where}: Polish title/description/material missing`)
    continue
  }
  if (pl.description.length < 150) error(`${where}: Polish description shorter than 150 characters`)
  if (/[{}[\]]/.test(pl.title + pl.description)) error(`${where}: unresolved template marker in the Polish copy`)
  if (p.slugs?.[EN] !== p.handle) error(`${where}: en-US slug must equal the handle`)
  if (!HANDLE.test(p.slugs?.[PL] ?? '') || p.slugs[PL].length > 80) error(`${where}: invalid pl-PL slug "${p.slugs?.[PL]}"`)
  // Model names ("Śnieżka", "Toruń") are proper names; everything else in the
  // English base copy must be English.
  const withoutModel = (text) => text.split(p.model ?? '\u0000').join('')
  for (const [field, text] of [['title', p.title], ['description', p.description], ['material', p.material]]) {
    if (POLISH_LETTERS.test(withoutModel(text))) error(`${where}: Polish characters in the English ${field}`)
  }
  if (p.options?.[0]?.title !== 'Size' || pl.option_title !== 'Rozmiar') error(`${where}: option must be "Size" with the pl-PL title "Rozmiar"`)
  for (const value of p.options?.[0]?.values ?? []) {
    if (POLISH_LETTERS.test(value) || value === 'Uniwersalny') error(`${where}: option value "${value}" is not the English base value`)
    if (value === 'One size' && pl.option_values?.[value] !== 'Uniwersalny') error(`${where}: "One size" has no pl-PL translation`)
  }
}
stats.languages = { base: EN, translations: [PL], products_with_pl: products.filter((p) => p.i18n?.[PL]?.title).length }

const descriptionLengths = products.map((p) => p.description.length)
stats.description_chars = { min: Math.min(...descriptionLengths), max: Math.max(...descriptionLengths) }
stats.most_repeated_sentence_uses = Math.max(...sentenceUse.values())
stats.price_pln = { min: Math.min(...products.map((p) => p.price_pln)), max: Math.max(...products.map((p) => p.price_pln)) }
stats.per_category = Object.fromEntries(
  [...new Set(products.map((p) => p.categories[0]))].map((c) => [c, products.filter((p) => p.categories[0] === c).length]),
)
stats.per_gender = Object.fromEntries(['w', 'm', 'u'].map((g) => [g, products.filter((p) => p.gender === g).length]))
stats.collections = Object.fromEntries(
  [...new Set(products.map((p) => p.collection ?? '(none)'))].map((c) => [c, products.filter((p) => (p.collection ?? '(none)') === c).length]),
)

// ------------------------------------------------------------ image files

function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null
  const chunk = buf.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
  if (chunk === 'VP8L') {
    return { width: 1 + (((buf[22] & 0x3f) << 8) | buf[21]), height: 1 + (((buf[24] & 0x0f) << 10) | (buf[23] << 2) | ((buf[22] & 0xc0) >> 6)) }
  }
  if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) }
  return null
}

const fileInfo = new Map()
const hashes = new Map()
let totalBytes = 0
const sizes = []
for (const p of products) {
  for (const image of p.images) {
    const path = join(ROOT, 'images', image.file)
    if (!existsSync(path)) {
      error(`${p.id}: image file missing: images/${image.file}`)
      continue
    }
    const buf = readFileSync(path)
    const dims = webpSize(buf)
    if (!dims) {
      error(`${p.id}: images/${image.file} is not a valid WebP image`)
      continue
    }
    if (buf.length >= MAX_BYTES) error(`${p.id}: images/${image.file} is ${buf.length} bytes (limit < ${MAX_BYTES})`)
    if (Math.max(dims.width, dims.height) < 800) warn(`${p.id}: images/${image.file} is only ${dims.width}x${dims.height}`)
    if (image.width && (image.width !== dims.width || image.height !== dims.height)) error(`${p.id}: images/${image.file} dimensions differ from catalog.json`)
    const sha = createHash('sha256').update(buf).digest('hex')
    if (image.sha256 && image.sha256 !== sha) error(`${p.id}: images/${image.file} changed since catalog.json was written`)
    if (hashes.has(sha)) error(`identical image files: images/${image.file} and images/${hashes.get(sha)}`)
    hashes.set(sha, image.file)
    fileInfo.set(image.file, { bytes: buf.length, ...dims, sha })
    totalBytes += buf.length
    sizes.push(buf.length)
  }
}
sizes.sort((a, b) => a - b)
stats.image_files = sizes.length
stats.image_bytes_total = totalBytes
stats.image_mb_total = Number((totalBytes / 1e6).toFixed(1))
if (sizes.length) {
  stats.image_bytes = {
    min: sizes[0],
    median: sizes[Math.floor(sizes.length / 2)],
    avg: Math.round(totalBytes / sizes.length),
    max: sizes.at(-1),
    under_200kb: sizes.filter((s) => s < 200_000).length,
    between_200_500kb: sizes.filter((s) => s >= 200_000 && s <= 500_000).length,
    over_500kb: sizes.filter((s) => s > 500_000).length,
  }
}

try {
  const { hammingDistance, NEAR_DUPLICATE_DISTANCE } = await import('./lib/image-hash.mjs')
  const withHash = products.flatMap((p) => p.images).filter((i) => i.dhash)
  let near = 0
  for (let i = 0; i < withHash.length; i++) {
    for (let j = i + 1; j < withHash.length; j++) {
      if (hammingDistance(withHash[i].dhash, withHash[j].dhash) <= NEAR_DUPLICATE_DISTANCE) {
        near++
        error(`near-duplicate images: ${withHash[i].file} ~ ${withHash[j].file}`)
      }
    }
  }
  stats.near_duplicate_pairs = near
} catch {
  warn('sharp not available - perceptual near-duplicate check skipped')
}

// ------------------------------------------------------------ products.csv

// Column names accepted by Medusa 2.19's CSVNormalizer (@medusajs/utils
// dist/product/csv-normalizer.js), compared case-insensitively.
const KNOWN_STATIC = [
  'product id', 'product handle', 'product title', 'product subtitle', 'product status', 'product description',
  'product external id', 'product thumbnail', 'product collection id', 'product type id', 'product discountable',
  'product height', 'product hs code', 'product length', 'product material', 'product mid code',
  'product origin country', 'product weight', 'product width', 'product metadata', 'shipping profile id',
  'product is giftcard', 'product created at', 'product deleted at', 'product updated at',
  'variant id', 'variant title', 'variant sku', 'variant upc', 'variant ean', 'variant hs code', 'variant mid code',
  'variant manage inventory', 'variant allow backorder', 'variant barcode', 'variant height', 'variant length',
  'variant material', 'variant metadata', 'variant origin country', 'variant variant rank', 'variant width',
  'variant weight', 'variant created at', 'variant deleted at', 'variant updated at', 'variant product id',
]
const KNOWN_WILDCARD = ['product category', 'product image', 'product tag', 'product sales channel', 'variant price', 'variant option']
const ID_PREFIX = {
  'Shipping Profile Id': 'sp_',
  'Product Sales Channel 1': 'sc_',
  'Product Collection Id': 'pcol_',
}

let csv = null
if (!existsSync(csvPath)) {
  warn(`${csvPath} not found - CSV checks skipped`)
} else {
  const raw = readFileSync(csvPath)
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(raw)
  } catch {
    error('products.csv is not valid UTF-8')
  }
  if (text) {
    try {
      csv = parseCsv(text)
    } catch (e) {
      error(`products.csv: ${e.message}`)
    }
  }
}

if (csv) {
  const { header, rows } = csv
  stats.csv_rows = rows.length
  stats.csv_columns = header.length
  for (const column of header) {
    const key = column.toLowerCase()
    if (!KNOWN_STATIC.includes(key) && !KNOWN_WILDCARD.some((w) => key.startsWith(w))) error(`CSV column not accepted by Medusa 2.19: "${column}"`)
  }
  dup(header.map((h) => h.toLowerCase()), 'CSV column')
  for (const required of ['Product Handle', 'Product Title', 'Product Status', 'Product Thumbnail', 'Variant Title', 'Variant SKU', 'Variant Price PLN', 'Variant Option 1 Name', 'Variant Option 1 Value', 'Product Image 1 Url', 'Product Sales Channel 1', 'Shipping Profile Id', 'Product Category 1']) {
    if (!header.includes(required)) error(`CSV is missing column "${required}"`)
  }
  const priceColumns = header.filter((h) => h.toLowerCase().startsWith('variant price '))
  const imageColumns = header.filter((h) => /^product image \d+/i.test(h))
  const categoryColumns = header.filter((h) => /^product category \d+/i.test(h))

  const catalogByHandle = new Map(products.map((p) => [p.handle, p]))
  const selectedIds = new Set(selectProducts(products, args).map((p) => p.id))
  const rowsByHandle = new Map()
  for (const [i, row] of rows.entries()) {
    const list = rowsByHandle.get(row['Product Handle']) ?? []
    list.push({ row, line: i + 2 })
    rowsByHandle.set(row['Product Handle'], list)
  }
  stats.csv_products = rowsByHandle.size
  if (rowsByHandle.size !== selectedIds.size) error(`CSV has ${rowsByHandle.size} distinct products, expected ${selectedIds.size}`)
  dup(rows.map((r) => r['Variant SKU']), 'CSV SKU')

  const PRODUCT_LEVEL = header.filter((h) => h.startsWith('Product ') || h === 'Shipping Profile Id')
  const allUrls = new Map() // url -> { file, product }
  for (const [handle, list] of rowsByHandle) {
    const product = catalogByHandle.get(handle)
    const where = `CSV "${handle}" (line ${list[0].line})`
    if (!product) {
      error(`${where}: not in catalog.json`)
      continue
    }
    if (!selectedIds.has(product.id)) error(`${where}: ${product.id} is not one of --ids`)
    if (list.length !== product.variants.length) error(`${where}: ${list.length} rows but ${product.variants.length} variants in catalog.json`)
    const first = list[0].row
    for (const { row, line } of list) {
      for (const column of PRODUCT_LEVEL) {
        if (row[column] !== first[column]) error(`CSV line ${line}: "${column}" differs between rows of the same product`)
      }
      for (const column of priceColumns) {
        if (!/^\d+\.\d{2}$/.test(row[column]) || Number(row[column]) <= 0) error(`CSV line ${line}: invalid ${column} "${row[column]}"`)
      }
      if (!row['Variant Title'] || !row['Variant Option 1 Value']) error(`CSV line ${line}: missing variant title/option value`)
      if (row['Variant Option 1 Value'] !== row['Variant Title']) error(`CSV line ${line}: variant title does not match its option value`)
      if (!['TRUE', 'FALSE'].includes(row['Variant Manage Inventory']) || !['TRUE', 'FALSE'].includes(row['Variant Allow Backorder'])) error(`CSV line ${line}: boolean columns must be TRUE/FALSE`)
    }
    const variantInfo = new Map(product.variants.map((v) => [v.sku, v]))
    for (const { row, line } of list) {
      const v = variantInfo.get(row['Variant SKU'])
      if (!v) error(`CSV line ${line}: SKU ${row['Variant SKU']} not in catalog.json`)
      else if (v.options[product.options[0].title] !== row['Variant Option 1 Value']) error(`CSV line ${line}: option value differs from catalog.json`)
      if (row['Variant Option 1 Name'] !== product.options[0].title) error(`CSV line ${line}: option name differs from catalog.json`)
      if (Number(row['Variant Price PLN']).toFixed(2) !== product.price_pln.toFixed(2)) error(`CSV line ${line}: PLN price differs from catalog.json`)
    }
    if (first['Product Title'] !== product.title || first['Product Description'] !== product.description) error(`${where}: title/description differ from catalog.json`)
    if (!['published', 'draft', 'proposed', 'rejected'].includes(first['Product Status'])) error(`${where}: invalid status ${first['Product Status']}`)
    for (const [column, prefix] of Object.entries(ID_PREFIX)) {
      if (first[column] && !first[column].startsWith(prefix)) error(`${where}: ${column} "${first[column]}" is not a ${prefix} id`)
    }
    if (!first['Shipping Profile Id'] || !first['Product Sales Channel 1']) error(`${where}: missing shipping profile or sales channel`)
    const cats = categoryColumns.map((c) => first[c]).filter(Boolean)
    if (cats.length !== product.categories.length || cats.some((c) => !c.startsWith('pcat_'))) error(`${where}: categories do not match catalog.json`)
    if (Boolean(first['Product Collection Id']) !== Boolean(product.collection)) error(`${where}: collection does not match catalog.json`)
    try {
      const metadata = JSON.parse(first['Product Metadata'] || '{}')
      if (metadata.catalog_id !== product.id) error(`${where}: metadata.catalog_id mismatch`)
    } catch {
      error(`${where}: Product Metadata is not valid JSON`)
    }

    const urls = imageColumns.map((c) => first[c]).filter(Boolean)
    if (first['Product Status'] === 'published' && !urls.length) error(`${where}: published without image URLs`)
    if (urls.length && first['Product Thumbnail'] !== urls[0]) error(`${where}: thumbnail is not the first image`)
    for (const [i, url] of urls.entries()) {
      let parsed
      try {
        parsed = new URL(url)
      } catch {
        error(`${where}: invalid image URL "${url}"`)
        continue
      }
      if (!/^https?:$/.test(parsed.protocol)) error(`${where}: image URL is not http(s): ${url}`)
      if (/^(file:|[a-z]:\\)/i.test(url)) error(`${where}: local path used as image URL`)
      const image = product.images[i]
      if (!image) {
        error(`${where}: more image URLs than catalog images`)
        continue
      }
      if (allUrls.has(url)) error(`${where}: image URL also used by ${allUrls.get(url).product}`)
      allUrls.set(url, { file: image.file, product: product.id })
    }
  }
  dup([...rowsByHandle.values()].map((list) => list[0].row['Product Thumbnail']).filter(Boolean), 'thumbnail URL')

  // Map URLs back to files through the upload manifests and compare sizes.
  const manifestDir = join(ROOT, 'uploads')
  const byUrl = new Map()
  if (existsSync(manifestDir)) {
    const { readdirSync } = await import('node:fs')
    for (const f of readdirSync(manifestDir).filter((f) => f.endsWith('.json'))) {
      const manifest = JSON.parse(readFileSync(join(manifestDir, f), 'utf8'))
      for (const [file, entry] of Object.entries(manifest.files)) byUrl.set(entry.url, { file, ...entry })
    }
  }
  for (const [url, { file, product }] of allUrls) {
    const entry = byUrl.get(url)
    if (!entry) warn(`${product}: ${url} is not in any upload manifest`)
    else if (entry.file !== file) error(`${product}: ${url} was uploaded for ${entry.file}, but the CSV uses it for ${file}`)
    else if (fileInfo.get(file) && entry.sha256 !== fileInfo.get(file).sha) error(`${product}: ${file} changed after upload - re-run upload-images.mjs`)
  }
  stats.csv_image_urls = allUrls.size

  if (args.includes('--check-urls')) {
    const list = [...allUrls]
    let ok = 0
    const results = await mapLimit(list, 6, async ([url, { file, product }]) => {
      const res = await fetchWithRetry(url, {}, { retries: 3, label: url })
      const body = Buffer.from(await res.arrayBuffer())
      const type = res.headers.get('content-type') ?? ''
      if (res.status !== 200) throw new Error(`${product}: ${url} -> HTTP ${res.status}`)
      if (!type.startsWith('image/')) throw new Error(`${product}: ${url} -> ${type}, not an image`)
      if (!webpSize(body)) throw new Error(`${product}: ${url} does not return a WebP image`)
      if (fileInfo.get(file) && body.length !== fileInfo.get(file).bytes) throw new Error(`${product}: ${url} returns ${body.length} bytes, local ${file} has ${fileInfo.get(file).bytes}`)
      ok++
    }, { onProgress: (d, t) => { if (d % 250 === 0 || d === t) console.log(`  checked ${d}/${t} URLs`) } })
    for (const r of results) if (!r.ok) error(r.error.message)
    stats.urls_checked_ok = ok
  }

  if (args.includes('--check-backend')) {
    const { createAdminClient } = await import('./lib/medusa-admin.mjs')
    const admin = await createAdminClient(args)
    stats.backend_checked = admin.base
    const ids = (column) => new Set(rows.flatMap((r) => (typeof column === 'string' ? [r[column]] : column.map((c) => r[c]))).filter(Boolean))
    const check = async (label, path, key, wanted) => {
      const existing = new Set((await admin.listAll(path, key, { fields: 'id' })).map((x) => x.id))
      for (const id of wanted) if (!existing.has(id)) error(`${label} ${id} does not exist in ${admin.base}`)
    }
    await check('category', '/admin/product-categories', 'product_categories', ids(categoryColumns))
    await check('collection', '/admin/collections', 'collections', ids('Product Collection Id'))
    await check('sales channel', '/admin/sales-channels', 'sales_channels', ids('Product Sales Channel 1'))
    await check('shipping profile', '/admin/shipping-profiles', 'shipping_profiles', ids('Shipping Profile Id'))
  }
}

// ------------------------------------------------------------ report

const result = { validated_at: new Date().toISOString(), csv: existsSync(csvPath) ? csvPath : null, stats, errors, warnings }
writeFileSync(join(ROOT, 'validation-results.json'), `${JSON.stringify(result, null, 1)}\n`)
console.log(JSON.stringify(stats, null, 1))
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`)
for (const e of errors.slice(0, 40)) console.log(`  ERROR ${e}`)
if (errors.length > 40) console.log(`  ... ${errors.length - 40} more in validation-results.json`)
for (const w of warnings.slice(0, 15)) console.log(`  WARN  ${w}`)
process.exitCode = errors.length ? 1 : 0
