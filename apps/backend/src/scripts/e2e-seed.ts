import { appendFileSync } from "node:fs"
import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createLocationFulfillmentSetWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  E2E_CATEGORY,
  E2E_COLLECTION,
  E2E_FULFILLMENT_SET,
  E2E_PRODUCT_HANDLES,
  E2E_PRODUCTS,
  E2E_PUBLISHABLE_KEY_TITLE,
  E2E_REGION_NAMES,
  E2E_REGIONS,
  E2E_SALES_CHANNEL,
  E2E_SERVICE_ZONES,
  E2E_SHIPPING_OPTIONS,
  E2E_SHIPPING_PROFILE,
  E2E_STOCK_LOCATION,
  E2E_STORE_CURRENCIES,
  E2E_UNKNOWN_HANDLES,
  E2eRegionKey,
  FULFILLMENT_PROVIDERS,
  e2ePaymentProviders,
} from "./e2e/data"
import {
  findEnvironmentRefusals,
  findForeignDataRefusals,
  formatRefusals,
} from "./e2e/guard"

/**
 * Deterministic, idempotent seed for the storefront's Playwright suite
 * (docs/e2e.md). Run it only through `pnpm e2e:seed` / `pnpm e2e:setup`
 * (scripts/e2e-medusa.mjs), against an empty database migrated with
 * `--skip-scripts`. It refuses anything that looks like a real shop
 * (src/scripts/e2e/guard.ts).
 *
 * Idempotent: every entity is looked up by its fixed name or handle and only
 * created when missing, so a second run changes nothing (it does not revert
 * edits made in between; use a fresh database for that).
 *
 * Not a migration script on purpose: files in src/migration-scripts run on
 * every `medusa db:migrate`, including production.
 */
export default async function e2eSeed({ container }: ExecArgs) {
  const envRefusals = findEnvironmentRefusals(process.env)
  if (envRefusals.length > 0) {
    throw new Error(formatRefusals(envRefusals))
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  // 5th guard: the database must hold nothing but e2e data
  const { data: products, metadata: productPage } = await query.graph({
    entity: "product",
    fields: ["handle"],
    pagination: { take: 50, skip: 0 },
  })
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name"],
  })
  const dataRefusals = findForeignDataRefusals(
    {
      productHandles: products.map((product) => product.handle),
      productCount: productPage?.count ?? products.length,
      regionNames: existingRegions.map((region) => region.name),
    },
    { productHandles: E2E_PRODUCT_HANDLES, regionNames: E2E_REGION_NAMES }
  )
  if (dataRefusals.length > 0) {
    throw new Error(formatRefusals(dataRefusals))
  }

  logger.info("E2E seed: sales channel and publishable key...")
  const salesChannelId = await ensureSalesChannel()
  const publishableKey = await ensurePublishableKey(salesChannelId)

  logger.info("E2E seed: regions, tax regions and store...")
  const regionIds = await ensureRegions()
  await ensureTaxRegions()
  await ensureStore(regionIds.pl, salesChannelId)

  logger.info("E2E seed: stock location, fulfillment and shipping options...")
  const shippingProfileId = await ensureShippingProfile()
  const stockLocationId = await ensureStockLocation(salesChannelId)
  const serviceZoneIds = await ensureServiceZones(stockLocationId)
  await ensureShippingOptions(serviceZoneIds, regionIds, shippingProfileId)

  logger.info("E2E seed: category, collection, products and inventory...")
  const categoryId = await ensureCategory()
  const collectionId = await ensureCollection()
  await ensureProducts({
    salesChannelId,
    shippingProfileId,
    categoryId,
    collectionId,
  })
  await ensureInventoryLevels(stockLocationId)

  await verifyCatalog()

  const backendUrl = process.env.BACKEND_PUBLIC_URL ?? ""
  const output = [
    `E2E_MEDUSA_BACKEND_URL=${backendUrl}`,
    `E2E_MEDUSA_PUBLISHABLE_KEY=${publishableKey}`,
  ]
  if (process.env.E2E_SEED_OUTPUT_FILE) {
    // Appended, so the file can be $GITHUB_OUTPUT or $GITHUB_ENV
    appendFileSync(process.env.E2E_SEED_OUTPUT_FILE, `${output.join("\n")}\n`)
  }
  logger.info(`E2E seed finished. Storefront variables:\n${output.join("\n")}`)

  async function ensureSalesChannel(): Promise<string> {
    const { data } = await query.graph({
      entity: "sales_channel",
      fields: ["id"],
      filters: { name: E2E_SALES_CHANNEL.name },
    })
    if (data[0]) {
      return data[0].id
    }

    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ ...E2E_SALES_CHANNEL }] },
    })
    return result[0].id
  }

  async function ensurePublishableKey(channelId: string): Promise<string> {
    const { data } = await query.graph({
      entity: "api_key",
      fields: ["id", "token", "revoked_at", "sales_channels.id"],
      filters: { title: E2E_PUBLISHABLE_KEY_TITLE, type: "publishable" },
    })
    const existing = data.find((key) => !key.revoked_at)
    // Only what is used below: the graph row and the workflow result are
    // different shapes, so neither can stand in for the other's full type.
    let apiKey: { id: string; token: string }
    let linkedChannelIds: (string | undefined)[]

    if (existing) {
      apiKey = existing
      linkedChannelIds = (existing.sales_channels ?? []).map(
        (channel) => channel?.id
      )
    } else {
      const { result } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            { title: E2E_PUBLISHABLE_KEY_TITLE, type: "publishable", created_by: "" },
          ],
        },
      })
      apiKey = result[0]
      linkedChannelIds = []
    }

    if (!linkedChannelIds.includes(channelId)) {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: { id: apiKey.id, add: [channelId] },
      })
    }

    // Publishable tokens are stored in plain text, so a rerun can print it
    return apiKey.token
  }

  async function ensureRegions(): Promise<Record<E2eRegionKey, string>> {
    const paymentProviders = e2ePaymentProviders(process.env.STRIPE_API_KEY)
    const { data } = await query.graph({
      entity: "region",
      fields: ["id", "name", "payment_providers.id"],
    })
    const ids = {} as Record<E2eRegionKey, string>

    for (const region of E2E_REGIONS) {
      const existing = data.find((candidate) => candidate.name === region.name)

      if (!existing) {
        const { result } = await createRegionsWorkflow(container).run({
          input: {
            regions: [
              {
                name: region.name,
                currency_code: region.currency_code,
                countries: region.countries,
                payment_providers: paymentProviders,
              },
            ],
          },
        })
        ids[region.key] = result[0].id
        continue
      }

      ids[region.key] = existing.id
      const current = (existing.payment_providers ?? [])
        .map((provider) => provider?.id)
        .sort()
      if (current.join() !== [...paymentProviders].sort().join()) {
        await updateRegionsWorkflow(container).run({
          input: {
            selector: { id: existing.id },
            update: { payment_providers: paymentProviders },
          },
        })
      }
    }

    return ids
  }

  async function ensureTaxRegions() {
    const { data } = await query.graph({
      entity: "tax_region",
      fields: ["country_code"],
    })
    const existing = new Set(data.map((taxRegion) => taxRegion.country_code))
    const missing = E2E_REGIONS.flatMap((region) => region.countries).filter(
      (country) => !existing.has(country)
    )

    if (missing.length > 0) {
      await createTaxRegionsWorkflow(container).run({
        input: missing.map((country_code) => ({
          country_code,
          provider_id: "tp_system",
        })),
      })
    }
  }

  async function ensureStore(defaultRegionId: string, channelId: string) {
    // Medusa creates the store itself on the first boot (createDefaultsWorkflow)
    const { data } = await query.graph({ entity: "store", fields: ["id"] })
    const store = data[0]
    if (!store) {
      throw new Error("No store found. Medusa creates one on boot; is the database migrated?")
    }

    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          name: "E2E Store",
          supported_currencies: E2E_STORE_CURRENCIES.map((currency_code, index) => ({
            currency_code,
            is_default: index === 0,
          })),
          default_region_id: defaultRegionId,
          default_sales_channel_id: channelId,
        },
      },
    })
  }

  async function ensureShippingProfile(): Promise<string> {
    const { data } = await query.graph({
      entity: "shipping_profile",
      fields: ["id"],
      filters: { name: E2E_SHIPPING_PROFILE.name },
    })
    if (data[0]) {
      return data[0].id
    }

    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ ...E2E_SHIPPING_PROFILE }] },
    })
    return result[0].id
  }

  async function ensureStockLocation(channelId: string): Promise<string> {
    const { data } = await query.graph({
      entity: "stock_location",
      fields: ["id", "fulfillment_providers.id", "sales_channels.id"],
      filters: { name: E2E_STOCK_LOCATION.name },
    })
    // A location created below has no providers or channels linked yet, so
    // `existing` stays undefined and the link lists below are empty.
    const existing = data[0]
    let locationId: string

    if (existing) {
      locationId = existing.id
    } else {
      const { result } = await createStockLocationsWorkflow(container).run({
        input: {
          locations: [
            { name: E2E_STOCK_LOCATION.name, address: { ...E2E_STOCK_LOCATION.address } },
          ],
        },
      })
      locationId = result[0].id
    }

    const linkedProviders = new Set(
      (existing?.fulfillment_providers ?? []).map((provider) => provider?.id)
    )
    for (const providerId of Object.values(FULFILLMENT_PROVIDERS)) {
      if (!linkedProviders.has(providerId)) {
        await link.create({
          [Modules.STOCK_LOCATION]: { stock_location_id: locationId },
          [Modules.FULFILLMENT]: { fulfillment_provider_id: providerId },
        })
      }
    }

    const linkedChannels = (existing?.sales_channels ?? []).map((channel) => channel?.id)
    if (!linkedChannels.includes(channelId)) {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: locationId, add: [channelId] },
      })
    }

    return locationId
  }

  async function ensureServiceZones(locationId: string): Promise<Record<string, string>> {
    const readFulfillmentSet = async () => {
      const { data } = await query.graph({
        entity: "fulfillment_set",
        fields: ["id", "service_zones.id", "service_zones.name"],
        filters: { name: E2E_FULFILLMENT_SET.name },
      })
      return data[0]
    }

    let fulfillmentSet = await readFulfillmentSet()
    if (!fulfillmentSet) {
      await createLocationFulfillmentSetWorkflow(container).run({
        input: {
          location_id: locationId,
          fulfillment_set_data: { ...E2E_FULFILLMENT_SET },
        },
      })
      fulfillmentSet = await readFulfillmentSet()
    }

    const existingZones = new Set(
      (fulfillmentSet.service_zones ?? []).map((zone) => zone?.name)
    )
    const missingZones = E2E_SERVICE_ZONES.filter((zone) => !existingZones.has(zone.name))
    if (missingZones.length > 0) {
      await createServiceZonesWorkflow(container).run({
        input: {
          data: missingZones.map((zone) => ({
            fulfillment_set_id: fulfillmentSet.id,
            name: zone.name,
            geo_zones: [{ type: "country" as const, country_code: zone.country_code }],
          })),
        },
      })
      fulfillmentSet = await readFulfillmentSet()
    }

    return Object.fromEntries(
      (fulfillmentSet.service_zones ?? []).map((zone) => [zone!.name, zone!.id])
    )
  }

  async function ensureShippingOptions(
    zoneIds: Record<string, string>,
    regionIds: Record<E2eRegionKey, string>,
    profileId: string
  ) {
    const { data } = await query.graph({
      entity: "shipping_option",
      fields: ["name", "service_zone_id"],
    })
    const existing = new Set(
      data.map((option) => `${option.service_zone_id}:${option.name}`)
    )

    const missing = E2E_SHIPPING_OPTIONS.filter(
      (option) => !existing.has(`${zoneIds[option.zone]}:${option.name}`)
    )
    if (missing.length === 0) {
      return
    }

    await createShippingOptionsWorkflow(container).run({
      input: missing.map((option) => {
        const zone = E2E_SERVICE_ZONES.find((candidate) => candidate.name === option.zone)!
        const region = E2E_REGIONS.find((candidate) => candidate.key === zone.region)!

        return {
          name: option.name,
          price_type: "flat" as const,
          provider_id: option.provider,
          service_zone_id: zoneIds[option.zone],
          shipping_profile_id: profileId,
          data: option.data,
          type: option.type,
          prices: [
            { currency_code: region.currency_code, amount: option.amount },
            { region_id: regionIds[region.key], amount: option.amount },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
            { attribute: "is_return", value: "false", operator: "eq" as const },
          ],
        }
      }),
    })
  }

  async function ensureCategory(): Promise<string> {
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["id"],
      filters: { handle: E2E_CATEGORY.handle },
    })
    if (data[0]) {
      return data[0].id
    }

    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [{ ...E2E_CATEGORY, is_active: true, is_internal: false }],
      },
    })
    return result[0].id
  }

  async function ensureCollection(): Promise<string> {
    const { data } = await query.graph({
      entity: "product_collection",
      fields: ["id"],
      filters: { handle: E2E_COLLECTION.handle },
    })
    if (data[0]) {
      return data[0].id
    }

    const { result } = await createCollectionsWorkflow(container).run({
      input: { collections: [{ ...E2E_COLLECTION }] },
    })
    return result[0].id
  }

  async function ensureProducts(ids: {
    salesChannelId: string
    shippingProfileId: string
    categoryId: string
    collectionId: string
  }) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["handle"],
      filters: { handle: E2E_PRODUCT_HANDLES },
    })
    const existing = new Set(data.map((product) => product.handle))
    const missing = E2E_PRODUCTS.filter((product) => !existing.has(product.handle))
    if (missing.length === 0) {
      return
    }

    await createProductsWorkflow(container).run({
      input: {
        products: missing.map((product) => ({
          title: product.title,
          handle: product.handle,
          description: product.description,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: ids.shippingProfileId,
          category_ids: product.in_category ? [ids.categoryId] : [],
          collection_id: product.in_collection ? ids.collectionId : undefined,
          options: product.options,
          variants: product.variants.map((variant) => ({
            title: variant.title,
            sku: variant.sku,
            options: variant.options,
            manage_inventory: product.manage_inventory,
            allow_backorder: false,
            prices: [
              { currency_code: "pln", amount: variant.prices.pln },
              { currency_code: "eur", amount: variant.prices.eur },
            ],
          })),
          sales_channels: [{ id: ids.salesChannelId }],
        })),
      },
    })
  }

  async function ensureInventoryLevels(locationId: string) {
    const stockBySku = new Map(
      E2E_PRODUCTS.filter((product) => product.manage_inventory).flatMap((product) =>
        product.variants.map((variant) => [variant.sku, product.stocked_quantity ?? 0])
      )
    )
    const { data } = await query.graph({
      entity: "inventory_item",
      fields: ["id", "sku", "location_levels.location_id"],
      filters: { sku: [...stockBySku.keys()] },
    })

    const missingLevels = data
      .filter(
        (item) =>
          !(item.location_levels ?? []).some((level) => level?.location_id === locationId)
      )
      .map((item) => ({
        inventory_item_id: item.id,
        location_id: locationId,
        stocked_quantity: stockBySku.get(item.sku!) ?? 0,
      }))

    if (missingLevels.length > 0) {
      await createInventoryLevelsWorkflow(container).run({
        input: { inventory_levels: missingLevels },
      })
    }
  }

  async function verifyCatalog() {
    const problems: string[] = []
    const count = async (entity: string, handle: string) => {
      const { data } = await query.graph({
        entity,
        fields: ["id"],
        filters: { handle },
      })
      return data.length
    }

    for (const handle of E2E_PRODUCT_HANDLES) {
      if ((await count("product", handle)) !== 1) problems.push(`product ${handle} missing`)
    }
    if ((await count("product_category", E2E_CATEGORY.handle)) !== 1) {
      problems.push(`category ${E2E_CATEGORY.handle} missing`)
    }
    if ((await count("product_collection", E2E_COLLECTION.handle)) !== 1) {
      problems.push(`collection ${E2E_COLLECTION.handle} missing`)
    }
    if ((await count("product", E2E_UNKNOWN_HANDLES.product)) > 0) {
      problems.push(`${E2E_UNKNOWN_HANDLES.product} exists`)
    }
    if ((await count("product_category", E2E_UNKNOWN_HANDLES.category)) > 0) {
      problems.push(`${E2E_UNKNOWN_HANDLES.category} exists`)
    }
    if ((await count("product_collection", E2E_UNKNOWN_HANDLES.collection)) > 0) {
      problems.push(`${E2E_UNKNOWN_HANDLES.collection} exists`)
    }

    if (problems.length > 0) {
      throw new Error(`E2E seed verification failed: ${problems.join("; ")}`)
    }
  }
}
