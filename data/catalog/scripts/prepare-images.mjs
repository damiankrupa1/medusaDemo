#!/usr/bin/env node
// Downloads the approved photos at web resolution and writes optimized WebP
// files to data/catalog/images/, recording size, dimensions and hashes in
// catalog.json.
//
//   node data/catalog/scripts/prepare-images.mjs
//
// - fits inside 1200x1500 px (aspect ratio kept, never upscaled)
// - sRGB, EXIF orientation applied, all metadata stripped
// - WebP quality 82, lowered step by step while the file is over 500 KB;
//   a file that can't get under 1,000,000 bytes fails the run
// - sources are not kept: only the optimized file is written
// Reruns skip images whose file already matches the recorded sha256.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchWithRetry, mapLimit, sleep } from './lib/http.mjs'
import { dHash, hammingDistance, NEAR_DUPLICATE_DISTANCE } from './lib/image-hash.mjs'
import { loadSharp } from './lib/sharp.mjs'

const sharp = loadSharp()
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CATALOG = join(ROOT, 'catalog.json')
const IMAGES = join(ROOT, 'images')

export const MAX_BYTES = 1_000_000
const SOFT_MAX_BYTES = 500_000
const QUALITIES = [82, 78, 74, 70, 64, 58]
const MAX_W = 1200
const MAX_H = 1500

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'))
mkdirSync(IMAGES, { recursive: true })

// Wikimedia serves pre-rendered thumbnails at standard widths only.
function sourceUrl(image) {
  if (image.thumb_template && image.source === 'wikimedia-commons') {
    const portrait = image.original_height > image.original_width
    const width = portrait ? 960 : 1280
    return image.original_width > width ? image.thumb_template.replace('{w}', String(width)) : image.download_url
  }
  if (image.thumb_template) return image.thumb_template.replace('{w}', String(MAX_W))
  return image.download_url
}

async function encode(buffer) {
  const base = sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize({ width: MAX_W, height: MAX_H, fit: 'inside', withoutEnlargement: true })
    .toColourspace('srgb')
  for (const quality of QUALITIES) {
    const { data, info } = await base.clone().webp({ quality, effort: 5, smartSubsample: true }).toBuffer({ resolveWithObject: true })
    if (data.length <= SOFT_MAX_BYTES || quality === QUALITIES.at(-1)) {
      return { data, info, quality }
    }
  }
  throw new Error('unreachable')
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex')

const jobs = catalog.products.flatMap((product) => product.images.map((image) => ({ product, image })))
const pending = jobs.filter(({ image }) => {
  const file = join(IMAGES, image.file)
  return !(image.sha256 && existsSync(file) && sha256(readFileSync(file)) === image.sha256)
})
console.log(`${jobs.length} images in catalog, ${pending.length} to prepare`)

async function prepare({ image }) {
  const url = sourceUrl(image)
  const res = await fetchWithRetry(url, {}, { label: image.file, retries: 5, baseDelayMs: 5000 })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const type = res.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) throw new Error(`not an image (${type}) at ${url}`)
  const { data, info, quality } = await encode(Buffer.from(await res.arrayBuffer()))
  if (data.length >= MAX_BYTES) throw new Error(`${data.length} bytes even at quality ${quality}`)
  writeFileSync(join(IMAGES, image.file), data)
  Object.assign(image, {
    bytes: data.length,
    width: info.width,
    height: info.height,
    format: 'webp',
    quality,
    sha256: sha256(data),
    dhash: await dHash(data),
    fetched_from: url,
  })
  if (image.source === 'wikimedia-commons') await sleep(700)
}

// Commons sequentially (rate limits), everything else with a little parallelism.
const commons = pending.filter((j) => j.image.source === 'wikimedia-commons')
const others = pending.filter((j) => j.image.source !== 'wikimedia-commons')
let saved = 0
const progress = (done, total) => {
  if (done % 25 === 0 || done === total) {
    console.log(`  ${done}/${total}`)
    if (done - saved >= 25) {
      writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 1)}\n`)
      saved = done
    }
  }
}
const results = [
  ...(await mapLimit(commons, 1, prepare, { onProgress: progress })),
  ...(await mapLimit(others, 3, prepare, { onProgress: progress })),
]
writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 1)}\n`)

const failures = [...commons, ...others].map((job, i) => ({ job, result: results[i] })).filter((r) => !r.result.ok)
for (const { job, result } of failures) console.error(`FAILED ${job.image.file}: ${result.error.message}`)

// Near-duplicate check across the whole catalog.
const all = jobs.map((j) => j.image).filter((i) => i.dhash)
const dupes = []
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    if (hammingDistance(all[i].dhash, all[j].dhash) <= NEAR_DUPLICATE_DISTANCE) dupes.push(`${all[i].file} ~ ${all[j].file}`)
  }
}
if (dupes.length) console.warn(`Near-duplicate images:\n  ${dupes.join('\n  ')}`)

const sizes = all.map((i) => i.bytes)
const total = sizes.reduce((a, b) => a + b, 0)
console.log(`Prepared ${all.length}/${jobs.length} images, total ${(total / 1e6).toFixed(1)} MB, max ${Math.max(...sizes)} B, avg ${Math.round(total / sizes.length)} B, failures ${failures.length}, near-duplicates ${dupes.length}`)
process.exitCode = failures.length || dupes.length ? 1 : 0
