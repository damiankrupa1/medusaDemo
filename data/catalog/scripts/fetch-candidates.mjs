#!/usr/bin/env node
// Collects candidate product photos (metadata only) from openly licensed
// sources into work/candidates.json. Nothing is downloaded here except JSON.
//
//   node data/catalog/scripts/fetch-candidates.mjs [--source commons|openverse|pexels] [--max-requests N]
//
// Sources (only licenses that allow commercial use without attribution):
//   commons   - Wikimedia Commons, Category:Images_from_Unsplash (CC0 uploads
//               from Unsplash's pre-2017 CC0 era). Keyless API, polite pacing.
//   openverse - Openverse API, CC0/PDM photographs from StockSnap, rawpixel,
//               Nappy and the WordPress Photo Directory. Keyless (anonymous
//               limit: 20 req/min, 200 req/day).
//   pexels    - Pexels API (Pexels License). Needs PEXELS_API_KEY in the
//               environment; skipped otherwise.
//
// Each source writes its own work/candidates-<source>.json, so sources can be
// fetched in parallel. Reruns are incremental: finished queries are recorded
// in work/fetch-state-<source>.json.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchWithRetry, sleep } from './lib/http.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = join(ROOT, 'work')

const args = process.argv.slice(2)
const argValue = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const onlySource = argValue('--source')
const maxRequests = Number(argValue('--max-requests') ?? Infinity)
// Commons category to search (all members are CC0 uploads from free stock
// sites of their CC0 era): Images_from_Unsplash (default) or Images_from_Pixabay.
const commonsCategory = argValue('--commons-category') ?? 'Images_from_Unsplash'
const commonsSourceName = commonsCategory === 'Images_from_Unsplash'
  ? 'commons'
  : `commons-${commonsCategory.replace(/^(Images|Files)_from_/, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '').toLowerCase()}`

// Search terms per garment family. Kept in English: source titles/tags are English.
const TERMS = [
  // tops
  't-shirt', 'tee', 'tank top', 'crop top', 'top', 'blouse', 'shirt', 'flannel shirt', 'denim shirt',
  // knitwear / sweatshirts
  'sweater', 'jumper', 'cardigan', 'knit', 'knitwear', 'turtleneck', 'hoodie', 'sweatshirt',
  // bottoms
  'jeans', 'denim', 'trousers', 'pants', 'chinos', 'shorts', 'leggings', 'skirt',
  // dresses
  'dress', 'summer dress', 'maxi dress', 'jumpsuit',
  // outerwear
  'jacket', 'coat', 'trench coat', 'parka', 'blazer', 'denim jacket', 'leather jacket', 'bomber jacket', 'raincoat', 'vest',
  // sport
  'sportswear', 'activewear', 'running', 'yoga', 'workout', 'tracksuit', 'athlete', 'fitness',
  // accessories
  'hat', 'cap', 'beanie', 'scarf', 'handbag', 'bag', 'backpack', 'sunglasses', 'belt', 'gloves',
  // generic fashion
  'fashion', 'outfit', 'model', 'style', 'clothing', 'wearing', 'street style', 'portrait woman', 'portrait man',
]

const OPENVERSE_TERMS = [
  'sweater', 'cardigan', 'knit sweater', 'turtleneck', 'hoodie', 'sweatshirt',
  't-shirt', 'tank top', 'blouse', 'shirt', 'flannel', 'denim shirt',
  'jeans', 'trousers', 'pants', 'shorts', 'leggings', 'skirt',
  'dress', 'summer dress', 'jumpsuit',
  'jacket', 'coat', 'trench coat', 'blazer', 'denim jacket', 'leather jacket', 'parka', 'raincoat',
  'sportswear', 'activewear', 'yoga outfit', 'running clothes', 'tracksuit',
  'hat', 'cap', 'beanie', 'scarf', 'handbag', 'backpack', 'sunglasses', 'belt',
  'fashion woman', 'fashion man', 'fashion model', 'outfit', 'clothing', 'apparel',
]

function load(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback
}

let candidates = {}
let state = { done: {} }
let paths = {}
let requests = 0

function open(sourceName) {
  paths = {
    candidates: join(WORK, `candidates-${sourceName}.json`),
    state: join(WORK, `fetch-state-${sourceName}.json`),
  }
  candidates = load(paths.candidates, {})
  state = load(paths.state, { done: {} })
}

function save() {
  writeFileSync(paths.candidates, JSON.stringify(candidates, null, 1))
  writeFileSync(paths.state, JSON.stringify(state, null, 1))
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function addCandidate(candidate, query) {
  const existing = candidates[candidate.key]
  if (existing) {
    if (!existing.queries.includes(query)) existing.queries.push(query)
    return false
  }
  candidates[candidate.key] = { ...candidate, queries: [query] }
  return true
}

// ---------------------------------------------------------------- Commons

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const COMMONS_LICENSES = new Set(['cc0', 'public domain', 'pdm-owner', 'cc-zero'])

// imageinfo URLs carry tracking parameters (?utm_source=...) that break thumb paths.
export const stripQuery = (url) => url.split('?')[0]

function commonsThumb(originalUrl, width) {
  // https://upload.wikimedia.org/wikipedia/commons/a/ab/Name.jpg ->
  // https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Name.jpg/960px-Name.jpg
  const m = stripQuery(originalUrl).match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(\w\/\w\w)\/(.+)$/)
  if (!m) return null
  return `${m[1]}/thumb/${m[2]}/${m[3]}/${width}px-${m[3]}`
}

async function commonsQuery(term) {
  let offset = 0
  let added = 0
  for (;;) {
    if (requests >= maxRequests) return { added, complete: false }
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      generator: 'search',
      gsrsearch: `incategory:"${commonsCategory}" ${term}`,
      gsrnamespace: '6',
      gsrlimit: '50',
      gsroffset: String(offset),
      prop: 'imageinfo',
      iiprop: 'url|size|mime|sha1|extmetadata',
      iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|ImageDescription|Credit',
      maxlag: '5',
    })
    requests++
    const res = await fetchWithRetry(`${COMMONS_API}?${params}`, {}, { label: `commons "${term}"` })
    const body = await res.json()
    if (body.error) throw new Error(`commons "${term}": ${body.error.info}`)
    for (const page of body.query?.pages ?? []) {
      const info = page.imageinfo?.[0]
      if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) continue
      const meta = info.extmetadata ?? {}
      const license = stripHtml(meta.LicenseShortName?.value)
      if (!COMMONS_LICENSES.has(license.toLowerCase())) continue
      if (addCandidate({
        key: `commons:${page.pageid}`,
        source: 'wikimedia-commons',
        commons_category: commonsCategory,
        title: page.title.replace(/^File:/, '').replace(/\.\w+$/, ''),
        description: stripHtml(meta.ImageDescription?.value).slice(0, 400),
        width: info.width,
        height: info.height,
        mime: info.mime,
        sha1: info.sha1,
        license,
        licenseUrl: meta.LicenseUrl?.value ?? 'https://creativecommons.org/publicdomain/zero/1.0/',
        creator: stripHtml(meta.Artist?.value).slice(0, 120),
        credit: stripHtml(meta.Credit?.value).slice(0, 300),
        landingUrl: info.descriptionurl,
        previewUrl: commonsThumb(info.url, 330) ?? stripQuery(info.url),
        fullUrl: stripQuery(info.url),
        thumbTemplate: commonsThumb(info.url, 9999)?.replace('/9999px-', '/{w}px-') ?? null,
      }, term)) added++
    }
    if (!body.continue?.gsroffset) return { added, complete: true }
    offset = body.continue.gsroffset
    await sleep(1500)
  }
}

// ---------------------------------------------------------------- Openverse

const OPENVERSE_API = 'https://api.openverse.org/v1/images/'
let openverseRemaining = Infinity

async function openverseQuery(term) {
  let added = 0
  for (let page = 1; page <= 12; page++) {
    if (requests >= maxRequests) return { added, complete: false }
    if (openverseRemaining < 15) {
      console.warn('  openverse: daily anonymous quota nearly used, stopping')
      return { added, complete: false }
    }
    const params = new URLSearchParams({
      q: term,
      source: 'stocksnap,rawpixel,nappy,wordpress',
      license: 'cc0,pdm',
      category: 'photograph',
      mature: 'false',
      page_size: '20',
      page: String(page),
    })
    requests++
    const res = await fetchWithRetry(`${OPENVERSE_API}?${params}`, {}, { label: `openverse "${term}" p${page}`, baseDelayMs: 4000 })
    const remaining = Number(res.headers.get('x-ratelimit-available-anon_sustained'))
    if (Number.isFinite(remaining)) openverseRemaining = remaining
    if (res.status === 400 || res.status === 401) {
      // Anonymous requests can't page past the result window.
      await res.body?.cancel()
      return { added, complete: true }
    }
    if (!res.ok) throw new Error(`openverse "${term}": HTTP ${res.status}`)
    const body = await res.json()
    for (const item of body.results ?? []) {
      if (!['cc0', 'pdm'].includes(item.license)) continue
      const title = item.title ?? ''
      // rawpixel also publishes cut-outs, stickers and illustrations of its photos.
      if (/\b(png|sticker|vector|illustration|collage|element|mockup|psd|drawing|painting|vintage|transparent|clipart|icon|pattern|background)\b/i.test(title)) continue
      if (addCandidate({
        key: `openverse:${item.id}`,
        source: `openverse/${item.source}`,
        title,
        description: (item.tags ?? []).map((t) => t.name).join(', ').slice(0, 400),
        width: item.width,
        height: item.height,
        mime: item.filetype ? `image/${item.filetype === 'jpg' ? 'jpeg' : item.filetype}` : null,
        sha1: null,
        license: item.license === 'cc0' ? 'CC0' : 'Public Domain Mark',
        licenseUrl: item.license_url,
        creator: (item.creator ?? '').slice(0, 120),
        credit: item.attribution ?? '',
        landingUrl: item.foreign_landing_url,
        previewUrl: item.url,
        fullUrl: item.url,
        thumbTemplate: null,
      }, term)) added++
    }
    if (page >= (body.page_count ?? 1)) return { added, complete: true }
    await sleep(3500)
  }
  return { added, complete: true }
}

// ---------------------------------------------------------------- Pexels

async function pexelsQuery(term) {
  const key = process.env.PEXELS_API_KEY
  let added = 0
  for (let page = 1; page <= 5; page++) {
    if (requests >= maxRequests) return { added, complete: false }
    const params = new URLSearchParams({ query: term, per_page: '80', page: String(page), orientation: 'portrait' })
    requests++
    const res = await fetchWithRetry(`https://api.pexels.com/v1/search?${params}`, { headers: { authorization: key } }, { label: `pexels "${term}" p${page}` })
    if (!res.ok) throw new Error(`pexels "${term}": HTTP ${res.status}`)
    const body = await res.json()
    for (const photo of body.photos ?? []) {
      if (addCandidate({
        key: `pexels:${photo.id}`,
        source: 'pexels',
        title: photo.alt || `Pexels photo ${photo.id}`,
        description: photo.alt ?? '',
        width: photo.width,
        height: photo.height,
        mime: 'image/jpeg',
        sha1: null,
        license: 'Pexels License',
        licenseUrl: 'https://www.pexels.com/license/',
        creator: photo.photographer ?? '',
        credit: `Photo by ${photo.photographer} on Pexels`,
        landingUrl: photo.url,
        previewUrl: photo.src?.medium,
        fullUrl: photo.src?.original,
        thumbTemplate: photo.src?.original ? `${photo.src.original}?auto=compress&cs=tinysrgb&w={w}` : null,
      }, term)) added++
    }
    if (!body.next_page) return { added, complete: true }
    await sleep(1000)
  }
  return { added, complete: true }
}

// ---------------------------------------------------------------- main

const SOURCES = {
  [commonsSourceName]: { terms: TERMS, run: commonsQuery, pause: 1500 },
  openverse: { terms: OPENVERSE_TERMS, run: openverseQuery, pause: 3500 },
  pexels: { terms: TERMS, run: pexelsQuery, pause: 1000, enabled: () => !!process.env.PEXELS_API_KEY },
}

mkdirSync(WORK, { recursive: true })
for (const [name, source] of Object.entries(SOURCES)) {
  if (onlySource && onlySource !== name) continue
  if (source.enabled && !source.enabled()) {
    console.log(`${name}: skipped (no API key in the environment)`)
    continue
  }
  open(name)
  for (const term of source.terms) {
    const stateKey = `${name}:${term}`
    if (state.done[stateKey]) continue
    if (requests >= maxRequests) break
    try {
      const { added, complete } = await source.run(term)
      if (complete) state.done[stateKey] = new Date().toISOString()
      console.log(`${name} "${term}": +${added} (total ${Object.keys(candidates).length}, requests ${requests})`)
    } catch (error) {
      console.error(`${name} "${term}": ${error.message}`)
    }
    save()
    await sleep(source.pause)
  }
  save()
  console.log(`${name}: ${Object.keys(candidates).length} candidates in ${paths.candidates}`)
}
console.log(`Done. ${requests} API requests this run.`)
