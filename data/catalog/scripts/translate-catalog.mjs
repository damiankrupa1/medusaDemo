#!/usr/bin/env node
// Second import step: adds the Polish (pl-PL) content and the per-locale URL
// slugs that the Medusa 2.19 CSV import can't carry.
//
//   MEDUSA_BACKEND_URL=... MEDUSA_ADMIN_EMAIL=... MEDUSA_ADMIN_PASSWORD=... \
//     node data/catalog/scripts/translate-catalog.mjs [--apply] [--confirm-host <host>]
//       [--skip-slugs] [--skip-taxonomy]
//
// Without --apply it only reports what it would write.
//
// Translation Module (POST /admin/translations/batch), locale pl-PL:
//   product          title, description, material
//   product_option   title ("Size" -> "Rozmiar")
//   product_option_value / product_variant   "One size" -> "Uniwersalny"
//   product_category / product_collection    names from lib/taxonomy.mjs
// Catalog products (matched by external_id) are upserted. Categories and
// collections only get a translation where they have none yet - existing
// translations of existing records are never overwritten.
//
// Localized slugs (PUT /admin/products/:id/localized-slugs, the backend's
// localized_slugs module): en-US = handle, pl-PL = Polish slug.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mapLimit } from './lib/http.mjs'
import { createAdminClient } from './lib/medusa-admin.mjs'
import { ONE_SIZE } from './lib/copy-en.mjs'
import { CATEGORIES, COLLECTIONS, TRANSLATION_LOCALE } from './lib/taxonomy.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const apply = args.includes('--apply')
const skipSlugs = args.includes('--skip-slugs')
const skipTaxonomy = args.includes('--skip-taxonomy')
const BATCH = 100

const admin = await createAdminClient(args)
const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'))
const byExternalId = new Map(catalog.products.map((p) => [p.id, p]))
console.log(`Backend ${admin.base}${apply ? '' : ' (report only, use --apply to write)'}`)

// ---------------------------------------------------------------- what exists

const remote = (await admin.listAll('/admin/products', 'products', {
  fields: 'id,handle,external_id,options.id,options.title,options.values.id,options.values.value,variants.id,variants.title',
})).filter((p) => byExternalId.has(p.external_id))
console.log(`${remote.length}/${catalog.products.length} catalog products found in the backend (by external_id)`)
const mismatched = remote.filter((p) => p.handle !== byExternalId.get(p.external_id).handle)
if (mismatched.length) {
  console.error(`${mismatched.length} product(s) have a different handle than catalog.json (e.g. ${mismatched[0].external_id}: ${mismatched[0].handle}); they belong to another catalog build - aborting.`)
  process.exit(1)
}

async function existingTranslations(reference, ids) {
  const found = new Map()
  for (let i = 0; i < ids.length; i += BATCH) {
    const page = await admin.listAll('/admin/translations', 'translations', {
      reference,
      locale_code: TRANSLATION_LOCALE,
      reference_id: ids.slice(i, i + BATCH),
      fields: 'id,reference_id,translations',
    })
    for (const t of page) found.set(t.reference_id, t)
  }
  return found
}

// ---------------------------------------------------------------- desired state

const desired = [] // { reference, reference_id, translations, overwrite }
for (const p of remote) {
  const pl = byExternalId.get(p.external_id).i18n[TRANSLATION_LOCALE]
  desired.push({ reference: 'product', reference_id: p.id, translations: { title: pl.title, description: pl.description, material: pl.material }, overwrite: true })
  for (const option of p.options ?? []) {
    desired.push({ reference: 'product_option', reference_id: option.id, translations: { title: pl.option_title }, overwrite: true })
    for (const value of option.values ?? []) {
      const translated = pl.option_values?.[value.value]
      if (translated) desired.push({ reference: 'product_option_value', reference_id: value.id, translations: { value: translated }, overwrite: true })
    }
  }
  for (const variant of p.variants ?? []) {
    if (variant.title === ONE_SIZE.en) desired.push({ reference: 'product_variant', reference_id: variant.id, translations: { title: ONE_SIZE.pl }, overwrite: true })
  }
}

if (!skipTaxonomy) {
  const categories = await admin.listAll('/admin/product-categories', 'product_categories', { fields: 'id,handle' })
  const collections = await admin.listAll('/admin/collections', 'collections', { fields: 'id,handle' })
  for (const c of CATEGORIES) {
    const id = categories.find((x) => x.handle === c.handle)?.id
    if (id) desired.push({ reference: 'product_category', reference_id: id, translations: c.pl, overwrite: false })
    else console.warn(`  category ${c.handle} not found - run ensure-entities.mjs first`)
  }
  for (const c of COLLECTIONS) {
    const id = collections.find((x) => x.handle === c.handle)?.id
    if (id) desired.push({ reference: 'product_collection', reference_id: id, translations: c.pl, overwrite: false })
    else console.warn(`  collection ${c.handle} not found - run ensure-entities.mjs first`)
  }
}

const create = []
const update = []
let unchanged = 0
let keptExisting = 0
for (const reference of [...new Set(desired.map((d) => d.reference))]) {
  const items = desired.filter((d) => d.reference === reference)
  const existing = await existingTranslations(reference, items.map((d) => d.reference_id))
  for (const d of items) {
    const current = existing.get(d.reference_id)
    if (!current) {
      create.push({ reference: d.reference, reference_id: d.reference_id, locale_code: TRANSLATION_LOCALE, translations: d.translations })
    } else if (!d.overwrite) {
      keptExisting++
    } else if (JSON.stringify(current.translations) === JSON.stringify({ ...current.translations, ...d.translations })) {
      unchanged++
    } else {
      update.push({ id: current.id, translations: { ...current.translations, ...d.translations } })
    }
  }
}
const byRef = (list) => Object.entries(list.reduce((acc, t) => ({ ...acc, [t.reference ?? 'update']: (acc[t.reference ?? 'update'] ?? 0) + 1 }), {})).map(([k, v]) => `${k}=${v}`).join(', ')
console.log(`Translations ${TRANSLATION_LOCALE}: ${create.length} to create (${byRef(create) || '-'}), ${update.length} to update, ${unchanged} unchanged, ${keptExisting} existing category/collection translations kept`)

// ---------------------------------------------------------------- write

if (apply) {
  const chunks = []
  for (let i = 0; i < create.length; i += BATCH) chunks.push({ create: create.slice(i, i + BATCH) })
  for (let i = 0; i < update.length; i += BATCH) chunks.push({ update: update.slice(i, i + BATCH) })
  let written = 0
  for (const [i, body] of chunks.entries()) {
    const result = await admin.request('POST', '/admin/translations/batch', { body, retries: 3 })
    written += (result.created?.length ?? 0) + (result.updated?.length ?? 0)
    console.log(`  translations batch ${i + 1}/${chunks.length}: ${written} written`)
  }
}

if (!skipSlugs) {
  const plan = remote.map((p) => {
    const slugs = byExternalId.get(p.external_id).slugs
    return { id: p.id, body: Object.entries(slugs).map(([locale, slug]) => ({ locale, slug })) }
  })
  console.log(`Localized slugs: ${plan.length} products x ${plan[0]?.body.length ?? 0} locales (${plan[0]?.body.map((s) => s.locale).join(', ') ?? '-'})`)
  if (apply) {
    const results = await mapLimit(plan, 4, ({ id, body }) => admin.request('PUT', `/admin/products/${id}/localized-slugs`, { body, retries: 3 }), {
      onProgress: (done, total) => { if (done % 100 === 0 || done === total) console.log(`  slugs ${done}/${total}`) },
    })
    const failed = results.map((r, i) => ({ r, p: plan[i] })).filter(({ r }) => !r.ok)
    for (const { r, p } of failed.slice(0, 20)) console.error(`  FAILED ${p.id}: ${r.error.message}`)
    if (failed.length) {
      console.error(`${failed.length} slug update(s) failed`)
      process.exitCode = 1
    }
  }
}

console.log(apply ? 'Done.' : 'Nothing written (report only).')
