#!/usr/bin/env node
// Visual review support. Two steps, so slow downloads and reviewing can overlap:
//
//   node data/catalog/scripts/review-sheets.mjs --download [--source commons]
//       downloads small previews of eligible candidates to work/previews/
//       (Wikimedia sequentially, other sources 3 at a time)
//
//   node data/catalog/scripts/review-sheets.mjs [--limit 300] [--per-sheet 30]
//       renders numbered contact sheets from already downloaded previews,
//       best candidates first, into work/sheets/sheet-NNN.jpg and
//       work/sheets/index.json (sheet -> tile number -> candidate key)
//
// Sheet building skips black-and-white photos (they can't show a product's
// colour) and near-duplicates of photos already on a sheet. Tiles keep their
// sheet/number across runs; only one sheet-building process may run at a time.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchWithRetry, mapLimit, sleep } from './lib/http.mjs'
import { colorfulness, dHash, hammingDistance, MIN_COLORFULNESS, NEAR_DUPLICATE_DISTANCE } from './lib/image-hash.mjs'
import { loadSharp } from './lib/sharp.mjs'

const sharp = loadSharp()
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = join(ROOT, 'work')
const PREVIEWS = join(WORK, 'previews')
const SHEETS = join(WORK, 'sheets')
const INDEX = join(SHEETS, 'index.json')
const SKIPPED = join(SHEETS, 'skipped.json')

const args = process.argv.slice(2)
const argValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const download = args.includes('--download')
const perSheet = Number(argValue('--per-sheet')) || 30
const onlySource = argValue('--source') // e.g. "commons" -> work/candidates-commons.json only
const limit = Number(argValue('--limit')) || Infinity
const COLS = 6
const TILE_W = 200
const TILE_H = 260
const LABEL_H = 22

// Obvious non-apparel hits from keyword search (e.g. "coat" -> arctic fox).
const IRRELEVANT = /\b(fox|vulpes|dog|puppy|cat|kitten|horse|bird|owl|deer|bear|food|cake|coffee beans|car|truck|building|skyline|cityscape|mountains?|landscape|aerial|forest|waterfall|sunset|interior|kitchen|laptop|keyboard|baby|child|kid|toddler|wedding|bride|groom|nude|bikini|lingerie|underwear)\b/i
const MUSEUM_TAGS = /^(vintage.*|antique|.*\bart|artwork|illustration|.*poster|painting|drawing|sketch|engraving|lithograph|woodcut|watercolou?r|ukiyo-e|museum|historical|costume|public domain.*)$/i
const GARMENT_WORDS = /\b(dress|skirt|jacket|coat|sweater|jumper|cardigan|knit|shirt|t-shirt|tee|jeans|denim|hoodie|sweatshirt|blouse|top|trousers|pants|shorts|hat|cap|beanie|scarf|bag|handbag|backpack|sunglasses|leggings|blazer|parka|trench|vest|outfit|fashion)\b/i
const GENERIC_TERMS = new Set(['fashion', 'outfit', 'model', 'style', 'clothing', 'wearing', 'street style', 'portrait woman', 'portrait man', 'fashion woman', 'fashion man', 'fashion model', 'apparel'])

export const safeKey = (key) => key.replace(/[^a-z0-9]+/gi, '_')
const previewPath = (c) => join(PREVIEWS, `${safeKey(c.key)}.jpg`)

const candidates = Object.assign(
  {},
  ...readdirSync(WORK)
    .filter((f) => /^candidates-[\w-]+\.json$/.test(f))
    .filter((f) => !onlySource || f === `candidates-${onlySource}.json`)
    .map((f) => JSON.parse(readFileSync(join(WORK, f), 'utf8'))),
)
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf8')) : { sheets: [] }
const skipped = existsSync(SKIPPED) ? JSON.parse(readFileSync(SKIPPED, 'utf8')) : {}
const placed = new Set(index.sheets.flatMap((s) => s.tiles.map((t) => t.key)))

const eligible = Object.values(candidates).filter((c) => {
  if (placed.has(c.key) || skipped[c.key]) return false
  const long = Math.max(c.width, c.height)
  const short = Math.min(c.width, c.height)
  // Final images are ~1000-1500 px on the long side; skip sources that are too small.
  if (long < 1200 || short < 700) return false
  if (c.width / c.height > 1.6) return false // panoramic shots crop badly into portrait cards
  // Commons keeps derived crops next to their originals ("... cropped.jpg").
  if (/\bcrop(ped)?\b/i.test(c.title)) return false
  // rawpixel's public-domain set is mostly museum pieces and artwork: antique
  // garments or illustrations can't be sold as today's products.
  if (c.description.split(', ').some((tag) => MUSEUM_TAGS.test(tag.trim()))) return false
  if (c.source === 'openverse/rawpixel' && isRawpixelMuseumScan(c.previewUrl)) return false
  return !IRRELEVANT.test(`${c.title} ${c.description}`)
})

/**
 * rawpixel image URLs end in a base64url-encoded storage path. Museum scans
 * live under "private/lr/images/website/<yyyy-mm>/<museum><id>-image.jpg"
 * (met, lacma, getty, nga, ...); rawpixel's own free photos live under
 * "s3fs-private/rawpixel_images/website_content/...".
 */
function isRawpixelMuseumScan(url) {
  try {
    const encoded = new URL(url).pathname.split('/').pop().replace(/\.\w+$/, '')
    const path = Buffer.from(encoded, 'base64url').toString('utf8')
    return !path.includes('website_content')
  } catch {
    return true
  }
}

// Most promising first: portrait framing (cards and gallery are portrait),
// a garment named in the title, a hit from a garment-specific search term.
const score = (c) => {
  const ratio = c.width / c.height
  return (ratio < 0.9 ? 3 : ratio <= 1.1 ? 1 : 0)
    + (GARMENT_WORDS.test(c.title) ? 2 : 0)
    + (c.queries.some((q) => !GENERIC_TERMS.has(q)) ? 1 : 0)
}
eligible.sort((a, b) => score(b) - score(a) || (a.width / a.height) - (b.width / b.height))
mkdirSync(PREVIEWS, { recursive: true })
mkdirSync(SHEETS, { recursive: true })

// ------------------------------------------------------------ download mode

if (download) {
  const todo = eligible.filter((c) => !existsSync(previewPath(c)))
  console.log(`${eligible.length} eligible, ${todo.length} previews to download`)
  async function fetchPreview(c) {
    const res = await fetchWithRetry(c.previewUrl, {}, { label: c.key, retries: 4, baseDelayMs: 3000 })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const type = res.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) throw new Error(`not an image (${type})`)
    const buffer = Buffer.from(await res.arrayBuffer())
    await sharp(buffer).rotate().resize({ width: 400, height: 520, fit: 'inside' }).jpeg({ quality: 80 }).toFile(previewPath(c))
    await sleep(c.source === 'wikimedia-commons' ? 600 : 200)
  }
  const progress = (done, total) => { if (done % 100 === 0 || done === total) console.log(`  previews ${done}/${total}`) }
  // upload.wikimedia.org answers bursts with HTTP 429, so Commons goes one at a time.
  const commons = todo.filter((c) => c.source === 'wikimedia-commons')
  const others = todo.filter((c) => c.source !== 'wikimedia-commons')
  const results = [
    ...(await mapLimit(others, 3, fetchPreview, { onProgress: progress })),
    ...(await mapLimit(commons, 1, fetchPreview, { onProgress: progress })),
  ]
  const failed = results.filter((r) => !r.ok).length
  console.log(`Downloaded ${results.length - failed}/${todo.length} previews (${failed} failed)`)
  process.exit(0)
}

// ------------------------------------------------------------ sheet mode

const knownHashes = index.sheets.flatMap((s) => s.tiles.map((t) => t.hash).filter(Boolean))
const ready = []
const reasons = { grayscale: 0, duplicate: 0 }
for (const c of eligible) {
  if (ready.length >= limit) break
  if (!existsSync(previewPath(c))) continue
  if ((await colorfulness(previewPath(c))) < MIN_COLORFULNESS) {
    skipped[c.key] = 'grayscale'
    reasons.grayscale++
    continue
  }
  const hash = await dHash(previewPath(c))
  if (knownHashes.some((h) => hammingDistance(h, hash) <= NEAR_DUPLICATE_DISTANCE)) {
    skipped[c.key] = 'near-duplicate'
    reasons.duplicate++
    continue
  }
  knownHashes.push(hash)
  ready.push({ ...c, hash })
}
writeFileSync(SKIPPED, JSON.stringify(skipped, null, 1))
console.log(`${ready.length} previews go on new sheets (skipped: ${reasons.grayscale} black-and-white, ${reasons.duplicate} near-duplicates)`)

const label = (text) => Buffer.from(
  `<svg width="${TILE_W}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><text x="6" y="16" font-family="Arial" font-size="15" font-weight="bold" fill="#fff">${text}</text></svg>`,
)

let created = 0
for (let start = 0; start < ready.length; start += perSheet) {
  const batch = ready.slice(start, start + perSheet)
  const sheetNo = index.sheets.length + 1
  const rows = Math.ceil(batch.length / COLS)
  const composites = []
  const tiles = []
  for (const [i, c] of batch.entries()) {
    const x = (i % COLS) * TILE_W
    const y = Math.floor(i / COLS) * (TILE_H + LABEL_H)
    const tile = await sharp(previewPath(c))
      .resize({ width: TILE_W - 4, height: TILE_H - 4, fit: 'contain', background: '#e5e5e5' })
      .extend({ top: 2, bottom: 2, left: 2, right: 2, background: '#ffffff' })
      .toBuffer()
    composites.push({ input: tile, left: x, top: y })
    composites.push({ input: label(`${i + 1}  ${c.width}x${c.height}`), left: x, top: y + TILE_H })
    tiles.push({ n: i + 1, key: c.key, hash: c.hash })
  }
  const name = `sheet-${String(sheetNo).padStart(3, '0')}.jpg`
  await sharp({ create: { width: COLS * TILE_W, height: rows * (TILE_H + LABEL_H), channels: 3, background: '#ffffff' } })
    .composite(composites)
    .jpeg({ quality: 82 })
    .toFile(join(SHEETS, name))
  index.sheets.push({ sheet: sheetNo, file: name, tiles })
  writeFileSync(INDEX, JSON.stringify(index, null, 1))
  created++
}
console.log(`Sheets: ${index.sheets.length} total, ${created} new.`)
