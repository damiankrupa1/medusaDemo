/// <reference types="jest" />

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

// The InPost provider refuses to start without credentials, and the test
// runner evaluates medusa-config.ts before applying its `env` option. Adding a
// shipping method only validates data and never calls the ShipX API, so
// placeholder values are enough.
process.env.INPOST_API_TOKEN ??= "test-inpost-api-token"
process.env.INPOST_ORGANIZATION_ID ??= "test-inpost-organization-id"

const SHIPPING_METHOD_FIELDS = "fields=+shipping_methods.data"

const pointDetails = {
  type: ["parcel_locker"],
  address: { line1: "Krakowska 1", line2: "31-062 Kraków" },
  address_details: {
    street: "Krakowska",
    building_number: "1",
    flat_number: null,
    post_code: "31-062",
    city: "Kraków",
    province: "małopolskie",
  },
  location: { latitude: 50.0614, longitude: 19.9366 },
  location_description: "Przy sklepie Żabka",
  opening_hours: "24/7",
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let regionId: string
    let variantId: string
    let lockerOptionId: string
    let courierOptionId: string
    let manualOptionId: string

    // Created once - the runner snapshots the database after this hook and
    // restores it before every test, so each test starts from these fixtures.
    beforeAll(async () => {
      const container = getContainer()
      const link = container.resolve(ContainerRegistrationKeys.LINK)
      const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

      const {
        result: [salesChannel],
      } = await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData: [{ name: "InPost Test Channel" }] },
      })

      const {
        result: [apiKey],
      } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            { title: "InPost Test Key", type: "publishable", created_by: "" },
          ],
        },
      })

      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: { id: apiKey.id, add: [salesChannel.id] },
      })

      api.defaults.headers.common["x-publishable-api-key"] = apiKey.token

      const {
        result: [region],
      } = await createRegionsWorkflow(container).run({
        input: {
          regions: [{ name: "Polska", currency_code: "pln", countries: ["pl"] }],
        },
      })
      regionId = region.id

      const {
        result: [stockLocation],
      } = await createStockLocationsWorkflow(container).run({
        input: { locations: [{ name: "Magazyn testowy" }] },
      })

      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: stockLocation.id, add: [salesChannel.id] },
      })

      const fulfillmentSet =
        await fulfillmentModuleService.createFulfillmentSets({
          name: "Wysyłka testowa",
          type: "shipping",
          service_zones: [
            {
              name: "Polska",
              geo_zones: [{ type: "country", country_code: "pl" }],
            },
          ],
        })

      await link.create([
        {
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
          [Modules.FULFILLMENT]: { fulfillment_provider_id: "inpost_inpost" },
        },
        {
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
          [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
        },
        {
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
          [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
        },
      ])

      const {
        result: [shippingProfile],
      } = await createShippingProfilesWorkflow(container).run({
        input: { data: [{ name: "Domyślny", type: "default" }] },
      })

      const shippingOption = (
        name: string,
        providerId: string,
        data: Record<string, unknown>
      ) => ({
        name,
        price_type: "flat" as const,
        provider_id: providerId,
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        data,
        type: { label: name, description: name, code: name },
        prices: [{ currency_code: "pln", amount: 15 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
          { attribute: "is_return", value: "false", operator: "eq" as const },
        ],
      })

      const { result: shippingOptions } = await createShippingOptionsWorkflow(
        container
      ).run({
        input: [
          shippingOption("inpost-locker", "inpost_inpost", {
            id: "inpost_locker_standard",
          }),
          shippingOption("inpost-courier", "inpost_inpost", {
            id: "inpost_courier_standard",
          }),
          shippingOption("manual", "manual_manual", {
            id: "manual-fulfillment",
          }),
        ],
      })

      const optionIdByName = (name: string) =>
        shippingOptions.find((option) => option.name === name)!.id

      lockerOptionId = optionIdByName("inpost-locker")
      courierOptionId = optionIdByName("inpost-courier")
      manualOptionId = optionIdByName("manual")

      const {
        result: [product],
      } = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: "Koszulka InPost",
              status: ProductStatus.PUBLISHED,
              shipping_profile_id: shippingProfile.id,
              options: [{ title: "Rozmiar", values: ["M"] }],
              variants: [
                {
                  title: "M",
                  options: { Rozmiar: "M" },
                  manage_inventory: false,
                  prices: [{ currency_code: "pln", amount: 99 }],
                },
              ],
              sales_channels: [{ id: salesChannel.id }],
            },
          ],
        },
      })
      variantId = product.variants[0].id
    })

    const createCart = async () => {
      const { data } = await api.post("/store/carts", {
        region_id: regionId,
        email: "klient@example.com",
        items: [{ variant_id: variantId, quantity: 1 }],
        shipping_address: {
          first_name: "Jan",
          last_name: "Kowalski",
          address_1: "Marszałkowska",
          address_2: "10",
          city: "Warszawa",
          postal_code: "00-001",
          country_code: "pl",
          phone: "500100200",
        },
      })

      return data.cart.id as string
    }

    const addShippingMethod = (cartId: string, body: unknown) =>
      api.post(
        `/store/carts/${cartId}/shipping-methods?${SHIPPING_METHOD_FIELDS}`,
        body
      )

    const expectInvalidData = async (
      request: Promise<unknown>,
      message: string
    ) => {
      const error = await request.then(
        () => {
          throw new Error("Expected the request to fail with 400")
        },
        (error) => error
      )

      expect(error.response.status).toEqual(400)
      expect(error.response.data.type).toEqual("invalid_data")
      expect(error.response.data.message).toContain(message)
    }

    describe("POST /store/carts/:id/shipping-methods - InPost locker", () => {
      it("stores the selected point and its details on the shipping method", async () => {
        const cartId = await createCart()

        const response = await addShippingMethod(cartId, {
          option_id: lockerOptionId,
          data: { target_point: "KRA01M", target_point_details: pointDetails },
        })

        expect(response.status).toEqual(200)
        expect(response.data.cart.shipping_methods).toEqual([
          expect.objectContaining({
            shipping_option_id: lockerOptionId,
            data: {
              target_point: "KRA01M",
              target_point_details: pointDetails,
              service_type: "inpost_locker_standard",
              label_format: "pdf",
            },
          }),
        ])
      })

      it("accepts the point name without details", async () => {
        const cartId = await createCart()

        const response = await addShippingMethod(cartId, {
          option_id: lockerOptionId,
          data: { target_point: "POP-KRA123" },
        })

        expect(response.status).toEqual(200)
        expect(response.data.cart.shipping_methods[0].data).toEqual(
          expect.objectContaining({ target_point: "POP-KRA123" })
        )
      })

      it("returns 400 when the point is missing", async () => {
        const cartId = await createCart()

        await expectInvalidData(
          addShippingMethod(cartId, { option_id: lockerOptionId }),
          "data.target_point: Required for InPost locker delivery"
        )
      })

      it("returns 400 for a malformed point name", async () => {
        const cartId = await createCart()

        await expectInvalidData(
          addShippingMethod(cartId, {
            option_id: lockerOptionId,
            data: { target_point: "kra 01m" },
          }),
          "data.target_point: Expected an InPost point name"
        )
      })

      it("returns 400 for malformed point details", async () => {
        const cartId = await createCart()

        await expectInvalidData(
          addShippingMethod(cartId, {
            option_id: lockerOptionId,
            data: {
              target_point: "KRA01M",
              target_point_details: {
                ...pointDetails,
                location: { latitude: 200, longitude: 19.9 },
              },
            },
          }),
          "data.target_point_details.location.latitude"
        )
      })

      it("returns 400 when the storefront tries to set the parcel size", async () => {
        const cartId = await createCart()

        await expectInvalidData(
          addShippingMethod(cartId, {
            option_id: lockerOptionId,
            data: { target_point: "KRA01M", parcel_template: "large" },
          }),
          "Unsupported keys: parcel_template"
        )
      })

      it("keeps the previously selected point when an update is rejected", async () => {
        const cartId = await createCart()

        await addShippingMethod(cartId, {
          option_id: lockerOptionId,
          data: { target_point: "KRA01M" },
        })

        await expectInvalidData(
          addShippingMethod(cartId, {
            option_id: lockerOptionId,
            data: { target_point: "WAW22BAPP", parcel_template: "large" },
          }),
          "Unsupported keys: parcel_template"
        )

        const { data } = await api.get(
          `/store/carts/${cartId}?${SHIPPING_METHOD_FIELDS}`
        )

        expect(data.cart.shipping_methods).toEqual([
          expect.objectContaining({
            data: expect.objectContaining({ target_point: "KRA01M" }),
          }),
        ])
      })
    })

    describe("POST /store/carts/:id/shipping-methods - other options", () => {
      it("accepts InPost courier delivery without data", async () => {
        const cartId = await createCart()

        const response = await addShippingMethod(cartId, {
          option_id: courierOptionId,
        })

        expect(response.status).toEqual(200)
        expect(response.data.cart.shipping_methods).toEqual([
          expect.objectContaining({ shipping_option_id: courierOptionId }),
        ])
      })

      it("returns 400 when a point is sent for InPost courier delivery", async () => {
        const cartId = await createCart()

        await expectInvalidData(
          addShippingMethod(cartId, {
            option_id: courierOptionId,
            data: { target_point: "KRA01M" },
          }),
          "Unsupported keys: target_point"
        )
      })

      it("does not restrict data of non-InPost shipping options", async () => {
        const cartId = await createCart()

        const response = await addShippingMethod(cartId, {
          option_id: manualOptionId,
          data: { pickup_note: "Odbiór po 16:00" },
        })

        expect(response.status).toEqual(200)
        expect(response.data.cart.shipping_methods[0].data).toEqual({
          pickup_note: "Odbiór po 16:00",
        })
      })
    })
  },
})
