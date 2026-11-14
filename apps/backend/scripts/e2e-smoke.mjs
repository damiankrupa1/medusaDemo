#!/usr/bin/env node
// Checks a running e2e Medusa through the Store API, the way the storefront
// sees it (docs/e2e.md). Read-only apart from one throwaway cart.
//
//   E2E_MEDUSA_BACKEND_URL=http://127.0.0.1:9100 \
//   E2E_MEDUSA_PUBLISHABLE_KEY=pk_... node scripts/e2e-smoke.mjs
//
// E2E_STOREFRONT_ORIGIN (default http://127.0.0.1:3100) is the origin whose
// CORS preflight must pass. Exits 1 listing every failed check.

const backendUrl = process.env.E2E_MEDUSA_BACKEND_URL
const publishableKey = process.env.E2E_MEDUSA_PUBLISHABLE_KEY
const storefrontOrigin = process.env.E2E_STOREFRONT_ORIGIN || "http://127.0.0.1:3100"

if (!backendUrl || !publishableKey) {
  console.error("Set E2E_MEDUSA_BACKEND_URL and E2E_MEDUSA_PUBLISHABLE_KEY.")
  process.exit(2)
}

const failures = []
const check = (condition, message) => {
  console.log(`${condition ? "ok  " : "FAIL"} ${message}`)
  if (!condition) failures.push(message)
}

async function store(path, init = {}) {
  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: {
      "x-publishable-api-key": publishableKey,
      "content-type": "application/json",
      ...init.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  return { status: response.status, body }
}

const productQuery = (handle, regionId) =>
  `/store/products?handle=${handle}&region_id=${regionId}` +
  "&fields=handle,*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory"

const ready = await fetch(`${backendUrl}/health/ready`)
check(ready.status === 200, "GET /health/ready answers 200")

const { body: regionsBody } = await store("/store/regions")
const regions = regionsBody.regions ?? []
const regionFor = (country) =>
  regions.find((region) => region.countries?.some((c) => c.iso_2 === country))
const pl = regionFor("pl")
const de = regionFor("de")
check(pl?.currency_code === "pln", "country pl is in a PLN region")
check(de?.currency_code === "eur", "country de is in a EUR region")

if (pl && de) {
  for (const [handle, minVariants] of [
    ["e2e-wool-coat", 2],
    ["e2e-linen-shirt", 1],
    ["e2e-sold-out", 1],
  ]) {
    for (const region of [pl, de]) {
      const { body } = await store(productQuery(handle, region.id))
      const variants = body.products?.[0]?.variants ?? []
      check(
        variants.length >= minVariants &&
          variants.every(
            (v) => v.calculated_price?.currency_code === region.currency_code &&
              v.calculated_price?.calculated_amount > 0
          ),
        `${handle} has ${minVariants}+ variant(s) priced in ${region.currency_code}`
      )
      if (handle === "e2e-wool-coat") {
        check(variants.every((v) => v.manage_inventory === false), `${handle} does not manage inventory`)
      }
      if (handle === "e2e-sold-out") {
        check(
          variants.every((v) => v.manage_inventory && !v.inventory_quantity),
          `${handle} has no stock in any variant`
        )
      }
    }
  }

  const { body: providers } = await store(`/store/payment-providers?region_id=${pl.id}`)
  check(
    (providers.payment_providers ?? []).some((p) => p.id === "pp_system_default"),
    "pp_system_default is a payment provider of the PL region"
  )

  const { body: cartBody } = await store("/store/carts", {
    method: "POST",
    body: JSON.stringify({
      region_id: pl.id,
      shipping_address: { country_code: "pl", postal_code: "00-001", city: "Warszawa" },
    }),
  })
  const cartId = cartBody.cart?.id
  const { body: options } = await store(`/store/shipping-options?cart_id=${cartId}`)
  const shippingOptions = options.shipping_options ?? []
  check(
    shippingOptions.some((o) => o.type?.code === "standard"),
    "a PL cart offers the standard shipping option"
  )
  check(
    shippingOptions.some((o) => o.data?.id === "inpost_locker_standard"),
    "a PL cart offers the InPost locker (data.id inpost_locker_standard)"
  )
}

for (const [path, key] of [
  ["/store/product-categories?handle=e2e-knitwear", "product_categories"],
  ["/store/collections?handle=e2e-autumn", "collections"],
]) {
  const { body } = await store(path)
  check((body[key] ?? []).length === 1, `${path} finds it`)
}

for (const [path, key] of [
  ["/store/products?handle=e2e-no-such-product", "products"],
  ["/store/product-categories?handle=e2e-no-such-category", "product_categories"],
  ["/store/collections?handle=e2e-no-such-collection", "collections"],
]) {
  const { status, body } = await store(path)
  check(status === 200 && (body[key] ?? []).length === 0, `${path} finds nothing`)
}

const preflight = await fetch(`${backendUrl}/store/regions`, {
  method: "OPTIONS",
  headers: {
    Origin: storefrontOrigin,
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "x-publishable-api-key,content-type",
  },
})
check(
  preflight.headers.get("access-control-allow-origin") === storefrontOrigin,
  `CORS allows the storefront origin ${storefrontOrigin}`
)

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`)
  process.exit(1)
}
console.log("\nThe e2e Medusa is ready for the storefront suite.")
