#!/usr/bin/env node
// Builds the Medusa Admin import CSV for ONE target backend from catalog.json
// and that backend's upload manifest (uploads/<host>.json).
//
//   MEDUSA_BACKEND_URL=... MEDUSA_ADMIN_EMAIL=... MEDUSA_ADMIN_PASSWORD=... \
//     node data/catalog/scripts/build-csv.mjs [--confirm-host <host>] [--out products.csv]
//       [--sales-channel <id>] [--shipping-profile <id>] [--skip-existing] [--allow-missing-images]
//       [--published-only] [--ids FS-0001,FS-0002]
//
// Every reference is resolved against the target at build time (IDs differ
// between local and Railway): default sales channel, default shipping
// profile, categories and collections by handle, region currencies. Handles
// and SKUs that already exist in the target abort the build (or are left out
// with --skip-existing), so the import never collides with existing products.
//
// Columns follow the template served by Medusa Admin 2.19 (Products -> Import
// -> "Download template"), with the PLN price instead of EUR/USD, plus columns
// the 2.19 CSVNormalizer also accepts: Product Category N, Product Image N Url,
// Variant Variant Rank and Product Metadata.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toCsv } from './lib/csv.mjs'
import { createAdminClient } from './lib/medusa-admin.mjs'
import { selectProducts } from './lib/selection.mjs'
import { CONVERSION_FROM_PLN, PRIMARY_CURRENCY } from './lib/taxonomy.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const outFile = join(ROOT, argValue('--out') ?? 'products.csv')
const skipExisting = args.includes('--skip-existing')
const allowMissingImages = args.includes('--allow-missing-images')
const publishedOnly = args.includes('--published-only') // leave out drafts (products without a photo)

const admin = await createAdminClient(args)
const host = new URL(admin.base).host.replace(/[^a-z0-9.-]/gi, '_')
const manifestPath = join(ROOT, 'uploads', `${host}.json`)
if (!existsSync(manifestPath)) {
  throw new Error(`No upload manifest for ${admin.base} (${manifestPath}). Run upload-images.mjs against this backend first.`)
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'))
const products = selectProducts(catalog.products, args)
const errors = []

// ---------------------------------------------------------------- resolve references

const { stores } = await admin.get('/admin/stores', { fields: 'id,name,default_sales_channel_id' })
const salesChannelId = argValue('--sales-channel') ?? stores[0]?.default_sales_channel_id
const salesChannels = await admin.listAll('/admin/sales-channels', 'sales_channels', { fields: 'id,name,is_disabled' })
const salesChannel = salesChannels.find((s) => s.id === salesChannelId)
if (!salesChannel) errors.push(`sales channel ${salesChannelId} not found`)
else if (salesChannel.is_disabled) errors.push(`sales channel ${salesChannel.name} is disabled`)

const profiles = await admin.listAll('/admin/shipping-profiles', 'shipping_profiles', { fields: 'id,name,type' })
const shippingProfile = argValue('--shipping-profile')
  ? profiles.find((p) => p.id === argValue('--shipping-profile'))
  : profiles.find((p) => p.type === 'default') ?? profiles[0]
if (!shippingProfile) errors.push('no shipping profile found')

const categories = new Map((await admin.listAll('/admin/product-categories', 'product_categories', { fields: 'id,handle' })).map((c) => [c.handle, c.id]))
const collections = new Map((await admin.listAll('/admin/collections', 'collections', { fields: 'id,handle' })).map((c) => [c.handle, c.id]))
const regions = await admin.listAll('/admin/regions', 'regions', { fields: 'id,name,currency_code' })
const currencies = [...new Set(regions.map((r) => r.currency_code))]
if (!currencies.includes(PRIMARY_CURRENCY)) errors.push(`no region uses ${PRIMARY_CURRENCY.toUpperCase()} - products would have no price in the storefront`)
const extraCurrencies = currencies.filter((c) => c !== PRIMARY_CURRENCY && CONVERSION_FROM_PLN[c])
const unpriced = currencies.filter((c) => c !== PRIMARY_CURRENCY && !CONVERSION_FROM_PLN[c])
if (unpriced.length) console.warn(`Regions in ${unpriced.join(', ')} get no price (no conversion rate configured)`)

const existingProducts = await admin.listAll('/admin/products', 'products', { fields: 'id,handle' })
const existingHandles = new Set(existingProducts.map((p) => p.handle))
const existingVariants = await admin.listAll('/admin/product-variants', 'variants', { fields: 'id,sku' })
const existingSkus = new Set(existingVariants.map((v) => v.sku).filter(Boolean))

for (const handle of new Set(products.flatMap((p) => p.categories))) {
  if (!categories.has(handle)) errors.push(`category "${handle}" does not exist (run ensure-entities.mjs --apply)`)
}
for (const handle of new Set(products.map((p) => p.collection).filter(Boolean))) {
  if (!collections.has(handle)) errors.push(`collection "${handle}" does not exist (run ensure-entities.mjs --apply)`)
}

// ---------------------------------------------------------------- rows

const convert = (pln, currency) => Math.max(4.99, Math.round(pln / CONVERSION_FROM_PLN[currency]) - 0.01).toFixed(2)
const maxImages = Math.max(1, ...products.map((p) => p.images.length))
const maxCategories = Math.max(1, ...products.map((p) => p.categories.length))

const header = [
  'Product Id', 'Product Handle', 'Product Title', 'Product Subtitle', 'Product Description', 'Product Status',
  'Product Thumbnail', 'Product Weight', 'Product Length', 'Product Width', 'Product Height', 'Product HS Code',
  'Product Origin Country', 'Product MID Code', 'Product Material', 'Shipping Profile Id', 'Product Sales Channel 1',
  'Product Collection Id', 'Product Type Id', 'Product Tag 1', 'Product Discountable', 'Product External Id',
  'Variant Id', 'Variant Title', 'Variant SKU', 'Variant Barcode', 'Variant Allow Backorder', 'Variant Manage Inventory',
  'Variant Weight', 'Variant Length', 'Variant Width', 'Variant Height', 'Variant HS Code', 'Variant Origin Country',
  'Variant MID Code', 'Variant Material',
  `Variant Price ${PRIMARY_CURRENCY.toUpperCase()}`, ...extraCurrencies.map((c) => `Variant Price ${c.toUpperCase()}`),
  'Variant Option 1 Name', 'Variant Option 1 Value',
  ...Array.from({ length: maxImages }, (_, i) => `Product Image ${i + 1} Url`),
  ...Array.from({ length: maxCategories }, (_, i) => `Product Category ${i + 1}`),
  'Variant Variant Rank', 'Product Metadata',
]

const rows = []
let skipped = 0
let drafts = 0
for (const product of products) {
  if (publishedOnly && product.status !== 'published') {
    skipped++
    continue
  }
  if (existingHandles.has(product.handle) || product.variants.some((v) => existingSkus.has(v.sku))) {
    if (skipExisting) {
      skipped++
      continue
    }
    errors.push(`${product.id}: handle "${product.handle}" or one of its SKUs already exists in the target`)
    continue
  }
  const urls = product.images
    .map((image) => (manifest.files[image.file]?.sha256 === image.sha256 ? manifest.files[image.file].url : null))
    .filter((url) => url || !allowMissingImages)
  if (urls.some((u) => !u)) {
    errors.push(`${product.id}: ${urls.filter((u) => !u).length} image(s) not uploaded to ${admin.base} (use --allow-missing-images to import such products as drafts)`)
  }
  // A product without a photo would show an empty card, so it stays a draft.
  const status = urls.length && urls.every(Boolean) ? product.status : 'draft'
  if (status === 'draft') drafts++
  const metadata = {
    catalog_id: product.id,
    gender: product.gender,
    color: product.color,
    garment_type: product.type,
    image_credits: product.images.map((image) => ({
      creator: image.creator || null,
      license: image.license,
      license_url: image.license_url,
      source_url: image.source_url,
    })),
  }
  for (const [rank, variant] of product.variants.entries()) {
    const row = {
      'Product Handle': product.handle,
      'Product Title': product.title,
      'Product Description': product.description,
      'Product Status': status,
      'Product Thumbnail': urls[0] ?? '',
      'Product Weight': product.weight,
      'Product Material': product.material,
      'Shipping Profile Id': shippingProfile?.id,
      'Product Sales Channel 1': salesChannel?.id,
      'Product Collection Id': product.collection ? collections.get(product.collection) : '',
      'Product Discountable': 'TRUE',
      'Product External Id': product.id,
      'Variant Title': variant.title,
      'Variant SKU': variant.sku,
      'Variant Allow Backorder': 'FALSE',
      // No stock levels can be set through the CSV; tracked inventory without
      // stock would show every size as sold out in the storefront.
      'Variant Manage Inventory': 'FALSE',
      [`Variant Price ${PRIMARY_CURRENCY.toUpperCase()}`]: product.price_pln.toFixed(2),
      'Variant Option 1 Name': product.options[0].title,
      'Variant Option 1 Value': variant.options[product.options[0].title],
      'Variant Variant Rank': rank,
      'Product Metadata': JSON.stringify(metadata),
    }
    for (const c of extraCurrencies) row[`Variant Price ${c.toUpperCase()}`] = convert(product.price_pln, c)
    urls.forEach((url, i) => { row[`Product Image ${i + 1} Url`] = url ?? '' })
    product.categories.forEach((handle, i) => { row[`Product Category ${i + 1}`] = categories.get(handle) })
    rows.push(row)
  }
}

if (errors.length) {
  console.error(`Cannot build CSV for ${admin.base}:\n  ${[...new Set(errors)].slice(0, 50).join('\n  ')}`)
  if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more`)
  process.exit(1)
}

writeFileSync(outFile, toCsv(header, rows), 'utf8')
const productCount = new Set(rows.map((r) => r['Product Handle'])).size
console.log(`Wrote ${outFile}`)
console.log(`  target ${admin.base}: sales channel "${salesChannel.name}" (${salesChannel.id}), shipping profile "${shippingProfile.name}" (${shippingProfile.id})`)
console.log(`  ${productCount} products, ${rows.length} rows (variants), prices in ${[PRIMARY_CURRENCY, ...extraCurrencies].join(', ').toUpperCase()}, ${drafts} draft, ${skipped} left out (${publishedOnly ? 'drafts/' : ''}existing)`)
