import {
  E2E_CATEGORY,
  E2E_COLLECTION,
  E2E_PRODUCTS,
  E2E_REGIONS,
  E2E_SERVICE_ZONES,
  E2E_SHIPPING_OPTIONS,
  E2E_UNKNOWN_HANDLES,
  e2ePaymentProviders,
} from "../data"

// The storefront's tests/e2e/support/test-data.ts (damiankrupa1/nuxtMedusa)
// expects exactly these defaults. Changing one here breaks its @medusa specs.
const STOREFRONT_TEST_DATA = {
  countries: { primary: "pl", secondary: "de" },
  categoryHandle: "e2e-knitwear",
  collectionHandle: "e2e-autumn",
  productHandle: "e2e-wool-coat",
  secondProductHandle: "e2e-linen-shirt",
  soldOutProductHandle: "e2e-sold-out",
  unknown: {
    product: "e2e-no-such-product",
    category: "e2e-no-such-category",
    collection: "e2e-no-such-collection",
  },
}

const product = (handle: string) => {
  const found = E2E_PRODUCTS.find((candidate) => candidate.handle === handle)
  if (!found) throw new Error(`no e2e product ${handle}`)
  return found
}

describe("e2e seed data", () => {
  it("has a PL/PLN region and a EUR region with DE", () => {
    const pl = E2E_REGIONS.find((region) =>
      region.countries.includes(STOREFRONT_TEST_DATA.countries.primary)
    )
    const de = E2E_REGIONS.find((region) =>
      region.countries.includes(STOREFRONT_TEST_DATA.countries.secondary)
    )

    expect(pl?.currency_code).toBe("pln")
    expect(de?.currency_code).toBe("eur")
    expect(pl).not.toBe(de)
  })

  it("matches the storefront's catalog handles", () => {
    expect(E2E_CATEGORY.handle).toBe(STOREFRONT_TEST_DATA.categoryHandle)
    expect(E2E_COLLECTION.handle).toBe(STOREFRONT_TEST_DATA.collectionHandle)
    expect(E2E_PRODUCTS.map((p) => p.handle)).toEqual(
      expect.arrayContaining([
        STOREFRONT_TEST_DATA.productHandle,
        STOREFRONT_TEST_DATA.secondProductHandle,
        STOREFRONT_TEST_DATA.soldOutProductHandle,
      ])
    )
    expect(E2E_UNKNOWN_HANDLES).toEqual(STOREFRONT_TEST_DATA.unknown)
  })

  it("never creates the handles the storefront uses for 404 checks", () => {
    const created = [
      E2E_CATEGORY.handle,
      E2E_COLLECTION.handle,
      ...E2E_PRODUCTS.map((p) => p.handle),
    ]

    Object.values(E2E_UNKNOWN_HANDLES).forEach((handle) => {
      expect(created).not.toContain(handle)
    })
  })

  it("gives the wool coat several unmanaged variants priced in both currencies", () => {
    const coat = product(STOREFRONT_TEST_DATA.productHandle)

    expect(coat.manage_inventory).toBe(false)
    expect(coat.variants.length).toBeGreaterThan(1)
    coat.variants.forEach((variant) => {
      expect(variant.prices.pln).toBeGreaterThan(0)
      expect(variant.prices.eur).toBeGreaterThan(0)
    })
  })

  it("keeps every variant of the sold-out product without stock", () => {
    const soldOut = product(STOREFRONT_TEST_DATA.soldOutProductHandle)

    expect(soldOut.manage_inventory).toBe(true)
    expect(soldOut.stocked_quantity).toBe(0)
  })

  it("puts products in the category and the collection", () => {
    expect(E2E_PRODUCTS.some((p) => p.in_category)).toBe(true)
    expect(E2E_PRODUCTS.some((p) => p.in_collection)).toBe(true)
  })

  it("uses unique SKUs and variant option combinations that exist", () => {
    const skus = E2E_PRODUCTS.flatMap((p) => p.variants.map((v) => v.sku))
    expect(new Set(skus).size).toBe(skus.length)

    E2E_PRODUCTS.forEach((p) => {
      p.variants.forEach((variant) => {
        Object.entries(variant.options).forEach(([title, value]) => {
          expect(p.options.find((option) => option.title === title)?.values).toContain(
            value
          )
        })
      })
    })
  })

  it("has standard delivery in both zones and the InPost locker in Poland", () => {
    const standard = E2E_SHIPPING_OPTIONS.filter((o) => o.type.code === "standard")
    expect(standard.map((o) => o.zone).sort()).toEqual(
      E2E_SERVICE_ZONES.map((zone) => zone.name).sort()
    )

    // The storefront recognizes the locker option by data.id (app/utils/inpost.ts)
    const locker = E2E_SHIPPING_OPTIONS.filter(
      (o) => o.data.id === "inpost_locker_standard"
    )
    expect(locker).toHaveLength(1)
    expect(locker[0].provider).toBe("inpost_inpost")
    expect(
      E2E_SERVICE_ZONES.find((zone) => zone.name === locker[0].zone)?.country_code
    ).toBe("pl")
  })

  it("attaches Stripe only with a Stripe test key", () => {
    expect(e2ePaymentProviders(undefined)).toEqual(["pp_system_default"])
    expect(e2ePaymentProviders("")).toEqual(["pp_system_default"])
    expect(e2ePaymentProviders("sk_live_123")).toEqual(["pp_system_default"])
    expect(e2ePaymentProviders("sk_test_123")).toEqual([
      "pp_system_default",
      "pp_stripe_stripe",
    ])
  })
})
