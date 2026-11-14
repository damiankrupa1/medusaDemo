/**
 * Fixed data of the e2e seed (docs/e2e.md). Everything is literal: no random
 * values, no dates, no external images, so every run produces the same shop
 * (apart from Medusa-generated ids and the publishable key token).
 *
 * The handles are the defaults of the storefront's
 * `tests/e2e/support/test-data.ts` (damiankrupa1/nuxtMedusa). Keep both in
 * sync: a renamed handle here breaks the storefront's @medusa specs.
 *
 * Amounts are in major units (Medusa v2), e.g. 899 = 899.00 PLN.
 */

export const E2E_HANDLE_PREFIX = "e2e-"

/** Handles the storefront uses for its 404 checks. The seed never creates them. */
export const E2E_UNKNOWN_HANDLES = {
  product: "e2e-no-such-product",
  category: "e2e-no-such-category",
  collection: "e2e-no-such-collection",
} as const

export const E2E_SALES_CHANNEL = {
  name: "E2E Storefront",
  description: "Sales channel of the storefront e2e suite",
} as const

export const E2E_PUBLISHABLE_KEY_TITLE = "E2E Storefront"

export type E2eRegionKey = "pl" | "eur"

export type E2eRegion = {
  key: E2eRegionKey
  name: string
  currency_code: string
  countries: string[]
}

/**
 * PL / PLN is the storefront's default country; DE is in a EUR region, so the
 * suite can check the second currency and the English locale.
 */
export const E2E_REGIONS: readonly E2eRegion[] = [
  { key: "pl", name: "E2E Poland", currency_code: "pln", countries: ["pl"] },
  { key: "eur", name: "E2E Euro", currency_code: "eur", countries: ["de"] },
]

/** Default currency first. */
export const E2E_STORE_CURRENCIES = ["pln", "eur"] as const

/**
 * Payment providers of every e2e region. `pp_system_default` always; the
 * Stripe card provider only when a Stripe test secret key is configured
 * (see docs/e2e.md, "Stripe"), because without a key every Stripe payment
 * session would fail.
 */
export function e2ePaymentProviders(stripeApiKey: string | undefined): string[] {
  return stripeApiKey?.startsWith("sk_test_")
    ? ["pp_system_default", "pp_stripe_stripe"]
    : ["pp_system_default"]
}

export const E2E_STOCK_LOCATION = {
  name: "E2E Warehouse",
  address: { address_1: "ul. Testowa 1", city: "Warszawa", country_code: "PL" },
} as const

export const E2E_SHIPPING_PROFILE = { name: "E2E Default", type: "default" } as const

export const E2E_FULFILLMENT_SET = { name: "E2E delivery", type: "shipping" } as const

/** Medusa ids of the fulfillment providers configured in medusa-config.ts. */
export const FULFILLMENT_PROVIDERS = {
  manual: "manual_manual",
  inpost: "inpost_inpost",
} as const

export const E2E_SERVICE_ZONES = [
  { name: "E2E Poland", country_code: "pl", region: "pl" },
  { name: "E2E Germany", country_code: "de", region: "eur" },
] as const satisfies readonly {
  name: string
  country_code: string
  region: E2eRegionKey
}[]

export type E2eShippingOption = {
  name: string
  zone: (typeof E2E_SERVICE_ZONES)[number]["name"]
  provider: (typeof FULFILLMENT_PROVIDERS)[keyof typeof FULFILLMENT_PROVIDERS]
  /** `shipping_option.data`: the provider's fulfillment option. */
  data: Record<string, unknown>
  type: { code: string; label: string; description: string }
  /** Flat price in the currency of the zone's region. */
  amount: number
}

/**
 * `standard` (manual provider) in both zones and the InPost parcel locker in
 * Poland. The storefront recognizes the locker option by
 * `data.id === "inpost_locker_standard"` (app/utils/inpost.ts).
 */
export const E2E_SHIPPING_OPTIONS: readonly E2eShippingOption[] = [
  {
    name: "Standard",
    zone: "E2E Poland",
    provider: FULFILLMENT_PROVIDERS.manual,
    data: {},
    type: { code: "standard", label: "Standard", description: "2-3 business days" },
    amount: 14.99,
  },
  {
    name: "Standard",
    zone: "E2E Germany",
    provider: FULFILLMENT_PROVIDERS.manual,
    data: {},
    type: { code: "standard", label: "Standard", description: "3-5 business days" },
    amount: 9.99,
  },
  {
    name: "InPost Paczkomat",
    zone: "E2E Poland",
    provider: FULFILLMENT_PROVIDERS.inpost,
    data: { id: "inpost_locker_standard" },
    type: {
      code: "inpost_locker_standard",
      label: "InPost Paczkomat",
      description: "Parcel locker delivery",
    },
    amount: 12.99,
  },
]

export const E2E_CATEGORY = {
  name: "E2E Knitwear",
  handle: "e2e-knitwear",
  description: "Category of the storefront e2e suite",
} as const

export const E2E_COLLECTION = { title: "E2E Autumn", handle: "e2e-autumn" } as const

export type E2ePrices = Record<"pln" | "eur", number>

export type E2eVariant = {
  title: string
  sku: string
  options: Record<string, string>
  prices: E2ePrices
}

export type E2eProduct = {
  handle: string
  title: string
  description: string
  in_category: boolean
  in_collection: boolean
  manage_inventory: boolean
  /** Stock at the e2e warehouse for every variant; null when not managed. */
  stocked_quantity: number | null
  options: { title: string; values: string[] }[]
  variants: E2eVariant[]
}

function sizeColorVariants(
  skuPrefix: string,
  sizes: string[],
  colors: string[] | null,
  prices: E2ePrices
): E2eVariant[] {
  return sizes.flatMap((size) =>
    (colors ?? [null]).map(
      (color): E2eVariant => ({
        title: color ? `${size} / ${color}` : size,
        sku: [skuPrefix, size, color].filter(Boolean).join("-").toUpperCase(),
        options: color ? { Size: size, Color: color } : { Size: size },
        prices,
      })
    )
  )
}

const COAT_SIZES = ["S", "M", "L"]
const COAT_COLORS = ["Charcoal", "Camel"]
const SHIRT_SIZES = ["S", "M", "L"]
const SWEATER_SIZES = ["S", "M"]

export const E2E_PRODUCTS: readonly E2eProduct[] = [
  {
    // Several variants, no inventory management, priced in both regions
    handle: "e2e-wool-coat",
    title: "E2E Wool Coat",
    description: "A wool coat for the storefront e2e suite.",
    in_category: true,
    in_collection: true,
    manage_inventory: false,
    stocked_quantity: null,
    options: [
      { title: "Size", values: COAT_SIZES },
      { title: "Color", values: COAT_COLORS },
    ],
    variants: sizeColorVariants("e2e-wool-coat", COAT_SIZES, COAT_COLORS, {
      pln: 899,
      eur: 199,
    }),
  },
  {
    // Managed inventory with plenty of stock
    handle: "e2e-linen-shirt",
    title: "E2E Linen Shirt",
    description: "A linen shirt for the storefront e2e suite.",
    in_category: false,
    in_collection: true,
    manage_inventory: true,
    stocked_quantity: 1000,
    options: [{ title: "Size", values: SHIRT_SIZES }],
    variants: sizeColorVariants("e2e-linen-shirt", SHIRT_SIZES, null, {
      pln: 249,
      eur: 59,
    }),
  },
  {
    // Every variant out of stock, no backorders
    handle: "e2e-sold-out",
    title: "E2E Sold Out Sweater",
    description: "A sweater that is always sold out, for the storefront e2e suite.",
    in_category: true,
    in_collection: true,
    manage_inventory: true,
    stocked_quantity: 0,
    options: [{ title: "Size", values: SWEATER_SIZES }],
    variants: sizeColorVariants("e2e-sold-out", SWEATER_SIZES, null, {
      pln: 499,
      eur: 119,
    }),
  },
]

export const E2E_PRODUCT_HANDLES = E2E_PRODUCTS.map((product) => product.handle)
export const E2E_REGION_NAMES = E2E_REGIONS.map((region) => region.name)
