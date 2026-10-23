#!/usr/bin/env node
// Builds data/catalog/catalog.json - the environment-independent source of
// truth for the product import - from the reviewed photo labels.
//
//   node data/catalog/scripts/generate-catalog.mjs [--target 1000]
//
// Every product is written in English (the store's base language: these
// fields go into the CSV) and Polish (`i18n["pl-PL"]`, applied after the
// import by translate-catalog.mjs), with a URL slug per locale.
//
// Label files (work/labels/sheet-NNN.txt), one line per contact-sheet tile:
//   12|dress|w|floral|midi,straps    approved: garment type | gender (w/m/u) | colour | visible features
//   13|x|reason                      rejected
//   14|+12                           another photo of tile 12's product (same sheet)
//   15|+7:3                          another photo of sheet 7, tile 3's product
// Types, colours and features are defined in lib/garments.mjs and lib/copy.mjs.
// When reviewed photos fall short of --target, the rest of the assortment is
// generated from lib/spec-mix.mjs as drafts without a photo.
//
// Output is deterministic for the same labels (seeded pseudo-random choices).

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARE, FAMILY, INTRO, MATERIAL, MODEL_NAMES, STYLING, TOKENS, materialClass } from './lib/copy.mjs'
import { CARE_EN, COLORS_EN, INTRO_EN, MATERIAL_EN, NOUNS_EN, ONE_SIZE, OPTION_TITLE, STYLING_EN, TOKENS_EN, materialToEnglish, orderEnglishModifiers } from './lib/copy-en.mjs'
import { COLORS, GARMENTS, REDUNDANT_FEATURES, SIZE_SCHEMES } from './lib/garments.mjs'
import { CATEGORY_MIX, CATEGORY_TARGETS, TYPE_COLORS, TYPE_TOKENS } from './lib/spec-mix.mjs'
import { BASE_LOCALE, COLLECTIONS, GENDER_CATEGORY, TRANSLATION_LOCALE } from './lib/taxonomy.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = join(ROOT, 'work')
const LABELS = join(WORK, 'labels')
const OUT = join(ROOT, 'catalog.json')

const args = process.argv.slice(2)
const target = Number(args[args.indexOf('--target') + 1]) || 1000

// ------------------------------------------------------------ helpers

function hashString(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed) {
  let a = hashString(String(seed))
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (random, list) => list[Math.floor(random() * list.length)]

const POLISH = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }
export function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => POLISH[ch])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length <= 80) return slug
  return slug.slice(0, 80).replace(/-[^-]*$/, '')
}

// Polish: [[m|f|pl]] by grammatical gender. English: [[singular|plural]].
const agreePl = (text, gender) =>
  text.replace(/\[\[([^|\]]*)\|([^|\]]*)\|([^|\]]*)\]\]/g, (_, m, f, pl) => ({ m, f, pl })[gender])
const agreeEn = (text, plural) =>
  text.replace(/\[\[([^|\]]*)\|([^|\]]*)\]\]/g, (_, sg, pl) => (plural ? pl : sg))

const lcFirstPl = (text) => (/^T-shirt/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1))
// "T-shirt" and "V-neck" keep their capital letter mid-sentence.
const lcFirstEn = (text) => (/^[A-Z]-/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1))
const ucFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1)

// "czarny" -> "czarnym", "niebieski" -> "niebieskim" (locative after "w kolorze").
const locative = (adjective) => adjective.replace(/y$/, 'ym').replace(/i$/, 'im')

const CATEGORY_CODES = {
  't-shirts-tops': 'TOP', shirts: 'KOS', sweatshirts: 'BLZ', 'sweaters-cardigans': 'SWT', pants: 'SPD',
  skirts: 'SPC', dresses: 'SUK', 'jackets-coats': 'KRT', sportswear: 'SPT', accessories: 'AKC',
}

const PRICE_FACTOR = { wool: 1.15, linen: 1.1, leather: 1.2, viscose: 1.0, cotton: 1.0, denim: 1.0, synthetic: 0.95, ecoleather: 1.0, frames: 1.0, hat: 1.0 }

// ------------------------------------------------------------ inputs

// Tolerates a UTF-8 BOM (e.g. label files edited in Notepad or PowerShell 5.1).
const readText = (path) => readFileSync(path, 'utf8').replace(/^﻿/, '')
const index = JSON.parse(readText(join(WORK, 'sheets', 'index.json')))
const candidates = Object.assign(
  {},
  ...readdirSync(WORK)
    .filter((f) => /^candidates-[\w-]+\.json$/.test(f))
    .map((f) => JSON.parse(readText(join(WORK, f)))),
)

// Keep what prepare-images.mjs recorded for files whose source didn't change,
// so regenerating the catalog doesn't force re-downloading prepared images.
const PREPARED_FIELDS = ['bytes', 'width', 'height', 'format', 'quality', 'sha256', 'dhash', 'fetched_from']
const previousImages = new Map()
if (existsSync(OUT)) {
  for (const p of JSON.parse(readText(OUT)).products) {
    for (const image of p.images) previousImages.set(image.file, image)
  }
}

const tileKey = new Map()
for (const sheet of index.sheets) {
  for (const tile of sheet.tiles) tileKey.set(`${sheet.sheet}:${tile.n}`, tile.key)
}

const problems = []
const approved = [] // { ref, key, type, gender, color, tokens, extra: [keys] }
const byRef = new Map()

const labelFiles = existsSync(LABELS) ? readdirSync(LABELS).filter((f) => /^sheet-\d+\.txt$/.test(f)).sort() : []
const extras = []
for (const file of labelFiles) {
  const sheetNo = Number(file.match(/\d+/)[0])
  const lines = readText(join(LABELS, file)).split(/\r?\n/)
  for (const [lineNo, raw] of lines.entries()) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const [n, a, b, c, d = ''] = line.split('|').map((s) => s.trim())
    const ref = `${sheetNo}:${n}`
    const key = tileKey.get(ref)
    const where = `${file}:${lineNo + 1}`
    if (!key) {
      problems.push(`${where}: no tile ${ref}`)
      continue
    }
    if (a === 'x') continue
    if (a.startsWith('+')) {
      const targetRef = a.slice(1).includes(':') ? a.slice(1) : `${sheetNo}:${a.slice(1)}`
      extras.push({ ref, key, target: targetRef, where })
      continue
    }
    const garment = GARMENTS[a]
    if (!garment) problems.push(`${where}: unknown garment type "${a}"`)
    if (!['w', 'm', 'u'].includes(b)) problems.push(`${where}: gender must be w/m/u, got "${b}"`)
    if (!COLORS[c] || !COLORS_EN[c]) problems.push(`${where}: unknown colour "${c}"`)
    const tokens = d ? d.split(',').map((t) => t.trim()).filter(Boolean) : []
    for (const t of tokens) if (!TOKENS[t] || !TOKENS_EN[t]) problems.push(`${where}: unknown feature "${t}"`)
    if (garment && !garment.sizes[b] && !(b === 'u' && (garment.sizes.w || garment.sizes.m))) {
      problems.push(`${where}: ${a} has no sizes for gender ${b}`)
    }
    const entry = { ref, key, type: a, gender: b, color: c, tokens, extra: [] }
    approved.push(entry)
    byRef.set(ref, entry)
  }
}
for (const e of extras) {
  const product = byRef.get(e.target)
  if (!product) problems.push(`${e.where}: extra photo points at ${e.target}, which is not an approved product`)
  else product.extra.push(e.key)
}
if (problems.length) {
  console.error(`Label problems:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}

// ------------------------------------------------------------ products

const materialWarnings = []
const used = { titlePl: new Set(), titleEn: new Set(), slugPl: new Set(), slugEn: new Set() }
const modelCursor = { w: 0, m: 0, u: 0 }
const shuffledNames = Object.fromEntries(
  Object.entries(MODEL_NAMES).map(([g, names]) => {
    const r = rng(`names-${g}`)
    return [g, [...names].sort(() => r() - 0.5)]
  }),
)

/** Features that go into the title: max two, none the garment name already implies. */
function titleFeatures(entry) {
  const redundant = new Set(REDUNDANT_FEATURES[entry.type] ?? [])
  return entry.tokens
    .filter((t) => TOKENS[t]?.title && TOKENS_EN[t]?.pre !== null && !redundant.has(t))
    .filter((t) => !(t === 'graphic' && entry.color === 'print'))
    .slice(0, 2)
}

function titleBases(entry, garment) {
  const [nounPl, g] = garment.noun
  const [nounEn, number] = NOUNS_EN[entry.type]
  const features = titleFeatures(entry)
  const pl = [nounPl, ...features.map((t) => (typeof TOKENS[t].title === 'string' ? TOKENS[t].title : TOKENS[t].title[g]))].join(' ')
  const pre = orderEnglishModifiers(features.map((t) => TOKENS_EN[t].pre).filter(Boolean))
  const post = features.map((t) => TOKENS_EN[t].post).filter(Boolean)
  // Lower-case English base ("oversized button-up cardigan"); the model name goes in front of it.
  const en = [...pre, lcFirstEn(nounEn), ...post].join(' ')
  return { pl, en, gender: g, plural: number === 'pl' }
}

function colorPartsPl(colorKey, g) {
  const color = COLORS[colorKey]
  if (color.phrase && !color.agree) return { titleSuffix: ` ${color.phrase}`, phrase: color.phrase }
  const forms = color.agree ?? color
  return {
    titleSuffix: ` – ${forms[g]}`,
    phrase: color.invariable ? `w kolorze ${forms.m}` : `w kolorze ${locative(forms.m)}`,
  }
}

function colorPartsEn(colorKey) {
  const color = COLORS_EN[colorKey]
  return { titleSuffix: ` – ${color.name}`, phrase: color.phrase ?? `in ${color.name}` }
}

/**
 * Polish and English descriptions built from the same drawn indices, so the
 * two texts say the same thing.
 */
function describe(entry, names, colors, materials, grammar, random) {
  const family = FAMILY[entry.type]
  const cls = materialClass(materials.pl)
  const plan = {
    intro: Math.floor(random() * INTRO[family].length),
    tokens: entry.tokens.slice(0, 3).filter((t) => TOKENS[t]?.say?.length).map((t) => [t, Math.floor(random() * TOKENS[t].say.length)]),
    material: Math.floor(random() * MATERIAL[cls].length),
    styling: Math.floor(random() * STYLING[family].length),
    care: random() < 0.6 ? Math.floor(random() * CARE[cls].length) : null,
  }
  // In sentences the composition reads better without fabric notes such as
  // "(denim)"; bracketed percentages ("(100% poliuretan)") stay.
  const withoutFabricNote = (text) => text.replace(/\s*\((?![^)]*\d)[^)]*\)/g, '')
  const fillPl = (template) =>
    agreePl(template, grammar.gender)
      .replace(/\{Nazwa\}/g, names.pl)
      .replace(/\{nazwa\}/g, lcFirstPl(names.pl))
      .replace(/\{kolor\}/g, colors.pl)
      .replace(/\{sklad\}/g, withoutFabricNote(materials.pl))
  const fillEn = (template) =>
    agreeEn(template, grammar.plural)
      .replace(/\{Name\}/g, `The ${names.en}`)
      .replace(/\{name\}/g, `the ${names.en}`)
      .replace(/\{color\}/g, colors.en)
      .replace(/\{composition\}/g, withoutFabricNote(materials.en))
  const build = (lang) => {
    const fill = lang === 'pl' ? fillPl : fillEn
    const pools = lang === 'pl'
      ? { intro: INTRO, tokens: (t) => TOKENS[t].say, material: MATERIAL, styling: STYLING, care: CARE }
      : { intro: INTRO_EN, tokens: (t) => TOKENS_EN[t].say, material: MATERIAL_EN, styling: STYLING_EN, care: CARE_EN }
    const sentences = [fill(pools.intro[family][plan.intro])]
    for (const [t, i] of plan.tokens) sentences.push(fill(pools.tokens(t)[i]))
    sentences.push(fill(pools.material[cls][plan.material]))
    sentences.push(fill(pools.styling[family][plan.styling]))
    if (plan.care !== null) sentences.push(pools.care[cls][plan.care])
    return sentences.join(' ')
  }
  let result = { pl: build('pl'), en: build('en') }
  // Short descriptions (few visible features) always get the care sentence.
  if (plan.care === null && Math.min(result.pl.length, result.en.length) < 200) {
    plan.care = Math.floor(random() * CARE[cls].length)
    result = { pl: build('pl'), en: build('en') }
  }
  return result
}

function buildProduct(entry, seq) {
  const garment = GARMENTS[entry.type]
  const id = `FS-${String(seq).padStart(4, '0')}`
  const random = rng(`${id}:${entry.key}`)
  const bases = titleBases(entry, garment)
  const colorPl = colorPartsPl(entry.color, bases.gender)
  const colorEn = colorPartsEn(entry.color)

  // Unique titles and slugs in both languages: the model name keeps similar
  // garments apart.
  const namePool = garment.category === 'accessories' || entry.gender === 'u' ? 'u' : entry.gender
  let model
  let titles
  for (let attempt = 0; attempt < 400; attempt++) {
    const list = shuffledNames[namePool]
    model = list[modelCursor[namePool]++ % list.length]
    // "Sweter z warkoczowym splotem Mira – kremowy" / "Mira cable-knit sweater – cream"
    titles = {
      pl: `${bases.pl} ${model}${colorPl.titleSuffix}`,
      en: `${model} ${bases.en}${colorEn.titleSuffix}`,
    }
    if (!used.titlePl.has(titles.pl) && !used.titleEn.has(titles.en)
      && !used.slugPl.has(slugify(titles.pl)) && !used.slugEn.has(slugify(titles.en))) break
  }
  used.titlePl.add(titles.pl)
  used.titleEn.add(titles.en)
  const slugs = { [BASE_LOCALE]: slugify(titles.en), [TRANSLATION_LOCALE]: slugify(titles.pl) }
  used.slugEn.add(slugs[BASE_LOCALE])
  used.slugPl.add(slugs[TRANSLATION_LOCALE])

  // A feature such as "linen" or "straw" restricts the composition to match the photo.
  const hints = entry.tokens.map((t) => TOKENS[t]?.material).filter(Boolean)
  const matching = garment.materials.filter((m) => hints.every((re) => re.test(m)))
  if (hints.length && !matching.length) materialWarnings.push(`${entry.ref} ${entry.type}: no material matches ${entry.tokens.join(',')}`)
  const materialPl = pick(random, matching.length ? matching : garment.materials)
  const materials = { pl: materialPl, en: materialToEnglish(materialPl) }

  const [min, max] = garment.price
  const raw = (min + random() * (max - min)) * (PRICE_FACTOR[materialClass(materialPl)] ?? 1)
  const price = Math.max(min, Math.round(raw / 10) * 10) - 0.01

  const schemeKey = garment.sizes[entry.gender] ?? garment.sizes.u ?? garment.sizes.w ?? garment.sizes.m
  let sizes = [...SIZE_SCHEMES[schemeKey]]
  if (sizes.length >= 5 && random() < 0.3) sizes = random() < 0.5 ? sizes.slice(1) : sizes.slice(0, -1)
  const code = CATEGORY_CODES[garment.category]
  const variants = sizes.map((size) => ({
    title: size,
    sku: `${id}-${code}-${size === ONE_SIZE.en ? 'OS' : size.replace(/[^A-Za-z0-9]/g, '')}`,
    options: { [OPTION_TITLE.en]: size },
  }))
  const valueTranslations = sizes.includes(ONE_SIZE.en) ? { [ONE_SIZE.en]: ONE_SIZE.pl } : {}

  const description = describe(
    entry,
    { pl: `${bases.pl} ${model}`, en: `${model} ${bases.en}` },
    { pl: colorPl.phrase, en: colorEn.phrase },
    materials,
    bases,
    random,
  )

  const genders = entry.gender === 'u' ? ['women', 'men'] : [GENDER_CATEGORY[entry.gender]]
  const imageKeys = entry.key ? [entry.key, ...entry.extra] : []
  const images = imageKeys.map((key, i) => {
    const c = candidates[key]
    const file = `${id.toLowerCase()}-${i + 1}.webp`
    const previous = previousImages.get(file)
    const prepared = previous?.source_key === key
      ? Object.fromEntries(PREPARED_FIELDS.filter((f) => previous[f] !== undefined).map((f) => [f, previous[f]]))
      : {}
    return {
      file,
      source_key: key,
      source: c.source,
      source_url: c.landingUrl,
      download_url: c.fullUrl,
      thumb_template: c.thumbTemplate,
      creator: c.creator,
      license: c.license,
      license_url: c.licenseUrl,
      original_width: c.width,
      original_height: c.height,
      ...prepared,
    }
  })

  return {
    id,
    // Base fields (English) - these go into products.csv.
    handle: slugs[BASE_LOCALE],
    title: titles.en,
    description: description.en,
    material: materials.en,
    // Polish, applied after the import by translate-catalog.mjs.
    i18n: {
      [TRANSLATION_LOCALE]: {
        title: titles.pl,
        description: description.pl,
        material: materials.pl,
        option_title: OPTION_TITLE.pl,
        option_values: valueTranslations,
      },
    },
    slugs,
    status: images.length ? 'published' : 'draft',
    type: entry.type,
    gender: entry.gender,
    color: entry.color,
    features: entry.tokens,
    model,
    weight: Math.round((garment.weight * (0.9 + random() * 0.25)) / 10) * 10,
    categories: [garment.category, ...genders],
    collection: null,
    price_pln: Number(price.toFixed(2)),
    options: [{ title: OPTION_TITLE.en, values: sizes }],
    variants,
    images,
    photo: images.length ? 'reviewed' : 'missing',
    review_ref: entry.ref ?? null,
  }
}

// ------------------------------------------------------------ products without a photo

function weightedPick(random, weights) {
  const entries = Object.entries(weights)
  let r = random() * entries.reduce((sum, [, w]) => sum + w, 0)
  for (const [key, w] of entries) {
    r -= w
    if (r <= 0) return key
  }
  return entries.at(-1)[0]
}

// Colours a typical menswear assortment wouldn't carry (photo-less products only;
// reviewed photos keep whatever colour they show).
const MENSWEAR_EXCLUDED_COLORS = new Set(['powder', 'pink', 'lilac', 'coral', 'mint', 'floral', 'dotted'])

/** A plausible, fully specified product for a category, with no photo. */
function specEntry(category, n) {
  const random = rng(`spec-${category}-${n}`)
  const mix = CATEGORY_MIX[category]
  const type = weightedPick(random, mix.types)
  const sizes = GARMENTS[type].sizes
  let gender = random() < (mix.unisex ?? 0) ? 'u' : random() < mix.women / (1 - (mix.unisex ?? 0)) ? 'w' : 'm'
  if (!sizes[gender]) gender = sizes.w ? 'w' : 'm'
  const palette = (TYPE_COLORS[type] ?? TYPE_COLORS.default)
    .filter((c) => gender !== 'm' || !MENSWEAR_EXCLUDED_COLORS.has(c))
  const color = pick(random, palette)
  const tokens = []
  for (const [token, p] of TYPE_TOKENS[type] ?? []) {
    // Lengths and fits are mutually exclusive.
    const group = ['mini', 'midi', 'maxi'].includes(token) ? 'length' : ['straight', 'slim', 'skinny', 'wideleg', 'mom', 'regular', 'relaxed', 'oversize'].includes(token) ? 'fit' : token
    if (tokens.some((t) => t.group === group)) continue
    if (random() < p) tokens.push({ token, group })
  }
  return { ref: null, key: null, type, gender, color, tokens: tokens.map((t) => t.token), extra: [] }
}

if (approved.length > target) console.warn(`${approved.length} approved photos, only the first ${target} are used.`)
const chosen = approved.slice(0, target)
const products = chosen.map((entry, i) => buildProduct(entry, i + 1))

// Fill up to exactly `target` products, category by category, where the
// reviewed photos fall short of the planned assortment.
const missing = target - products.length
if (missing > 0) {
  const have = {}
  for (const p of products) have[p.categories[0]] = (have[p.categories[0]] ?? 0) + 1
  const deficits = Object.entries(CATEGORY_TARGETS).map(([c, t]) => [c, Math.max(0, t - (have[c] ?? 0))])
  const totalDeficit = deficits.reduce((s, [, d]) => s + d, 0)
  // Largest-remainder apportionment so the spec products sum to `missing`.
  const quotas = deficits.map(([c, d]) => ({ c, exact: totalDeficit ? (d / totalDeficit) * missing : missing / deficits.length }))
  quotas.forEach((q) => { q.n = Math.floor(q.exact) })
  let left = missing - quotas.reduce((s, q) => s + q.n, 0)
  for (const q of [...quotas].sort((a, b) => (b.exact - b.n) - (a.exact - a.n))) {
    if (left-- <= 0) break
    q.n++
  }
  for (const { c, n } of quotas) {
    for (let i = 0; i < n; i++) products.push(buildProduct(specEntry(c, i), products.length + 1))
  }
  console.log(`${missing} products without a reviewed photo were added as drafts to reach ${target}.`)
}

// Collections: spread evenly over categories, deterministic, and only over
// products with a photo (drafts are not visible in the storefront anyway).
const byCategory = new Map()
for (const p of products.filter((p) => p.status === 'published')) {
  const list = byCategory.get(p.categories[0]) ?? []
  list.push(p)
  byCategory.set(p.categories[0], list)
}
const published = products.filter((p) => p.status === 'published').length
const COLLECTION_SIZES = { 'latest-drops': Math.min(120, Math.round(published * 0.25)), 'weekly-picks': Math.min(100, Math.round(published * 0.2)) }
const queues = [...byCategory.values()].map((list) => {
  const r = rng(`collections-${list[0].categories[0]}`)
  return [...list].sort(() => r() - 0.5)
})
for (const { handle } of COLLECTIONS) {
  let assigned = 0
  let q = 0
  while (assigned < COLLECTION_SIZES[handle] && queues.some((list) => list.length)) {
    const list = queues[q++ % queues.length]
    const product = list.shift()
    if (!product) continue
    product.collection = handle
    assigned++
  }
}

const catalog = {
  generated_at: new Date().toISOString(),
  base_locale: BASE_LOCALE,
  translation_locales: [TRANSLATION_LOCALE],
  currency: 'pln',
  counts: {
    products: products.length,
    variants: products.reduce((n, p) => n + p.variants.length, 0),
    images: products.reduce((n, p) => n + p.images.length, 0),
    published: products.filter((p) => p.status === 'published').length,
  },
  products,
}
writeFileSync(OUT, `${JSON.stringify(catalog, null, 1)}\n`)
console.log(`catalog.json: ${catalog.counts.products} products (${catalog.counts.published} with photos), ${catalog.counts.variants} variants, ${catalog.counts.images} images (${approved.length} approved photos available)`)
const perCategory = {}
for (const p of products) perCategory[p.categories[0]] = (perCategory[p.categories[0]] ?? 0) + 1
console.log(perCategory)
if (materialWarnings.length) console.warn(`Material hints without a matching composition:\n  ${materialWarnings.join('\n  ')}`)
