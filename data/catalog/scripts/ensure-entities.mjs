#!/usr/bin/env node
// Checks that the categories and collections the catalog references exist in
// the target backend, and optionally creates the missing ones.
//
//   node data/catalog/scripts/ensure-entities.mjs            # report only
//   node data/catalog/scripts/ensure-entities.mjs --apply    # create missing
//
// Never updates or deletes existing records; matching is by handle. With
// --ids FS-0001,FS-0002 only what these products reference is checked, so a
// test import of a few products doesn't create empty categories.
// Remote backends additionally need --confirm-host <host> (see lib/medusa-admin.mjs).

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAdminClient } from './lib/medusa-admin.mjs'
import { selectProducts } from './lib/selection.mjs'
import { CATEGORIES, COLLECTIONS } from './lib/taxonomy.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const apply = process.argv.includes('--apply')
const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'))
const products = selectProducts(catalog.products)
const usedCategories = new Set(products.flatMap((p) => p.categories))
const usedCollections = new Set(products.map((p) => p.collection).filter(Boolean))
const admin = await createAdminClient()
console.log(`Backend: ${admin.base}${apply ? '' : ' (report only, use --apply to create)'}`)

const categories = await admin.listAll('/admin/product-categories', 'product_categories', { fields: 'id,handle,name,is_active,is_internal' })
const collections = await admin.listAll('/admin/collections', 'collections', { fields: 'id,handle,title' })
const categoryByHandle = new Map(categories.map((c) => [c.handle, c]))
const collectionByHandle = new Map(collections.map((c) => [c.handle, c]))

let missing = 0
for (const category of CATEGORIES.filter((c) => usedCategories.has(c.handle))) {
  const existing = categoryByHandle.get(category.handle)
  if (existing) {
    const flags = [!existing.is_active && 'INACTIVE', existing.is_internal && 'INTERNAL'].filter(Boolean)
    console.log(`  category   ${category.handle.padEnd(20)} exists  ${existing.id} "${existing.name}"${flags.length ? ` [${flags.join(', ')}]` : ''}`)
    continue
  }
  missing++
  if (!apply) {
    console.log(`  category   ${category.handle.padEnd(20)} MISSING -> would create "${category.name}"`)
    continue
  }
  const { product_category } = await admin.post('/admin/product-categories', {
    name: category.name,
    handle: category.handle,
    description: category.description,
    is_active: true,
    is_internal: false,
  })
  console.log(`  category   ${category.handle.padEnd(20)} created ${product_category.id}`)
}

for (const collection of COLLECTIONS.filter((c) => usedCollections.has(c.handle))) {
  const existing = collectionByHandle.get(collection.handle)
  if (existing) {
    console.log(`  collection ${collection.handle.padEnd(20)} exists  ${existing.id} "${existing.title}"`)
    continue
  }
  missing++
  if (!apply) {
    console.log(`  collection ${collection.handle.padEnd(20)} MISSING -> would create "${collection.title}"`)
    continue
  }
  const { collection: created } = await admin.post('/admin/collections', {
    title: collection.title,
    handle: collection.handle,
  })
  console.log(`  collection ${collection.handle.padEnd(20)} created ${created.id}`)
}

if (missing && !apply) {
  console.log(`${missing} missing record(s). Re-run with --apply to create them.`)
  process.exitCode = 2
} else {
  console.log(apply && missing ? `Created ${missing} record(s).` : 'All referenced categories and collections exist.')
}
