/// <reference types="jest" />

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  createUserAccountWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

const ADMIN_EMAIL = "localized-slugs-test-admin@example.com"
const ADMIN_PASSWORD = "supersecret"

medusaIntegrationTestRunner({
  // medusaIntegrationTestRunner truncates every table between tests by
  // default. This suite creates its auth user, sales channel and
  // publishable API key once in beforeAll and relies on them for every
  // test, so the default per-test truncation would wipe them out after
  // the first test runs (each test also creates its own uniquely-titled
  // product, so nothing here depends on a clean slate between tests).
  disableAutoTeardown: true,
  testSuite: ({ api, getContainer }) => {
    const createProduct = async (title: string) => {
      const container = getContainer()
      const productModuleService = container.resolve(Modules.PRODUCT)

      return productModuleService.createProducts({
        title,
        status: "draft",
      })
    }

    beforeAll(async () => {
      const container = getContainer()
      const authModuleService = container.resolve(Modules.AUTH)

      const { authIdentity } = await authModuleService.register("emailpass", {
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      })

      await createUserAccountWorkflow(container).run({
        input: {
          authIdentityId: authIdentity!.id,
          userData: { email: ADMIN_EMAIL },
        },
      })

      const { data } = await api.post("/auth/user/emailpass", {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      })

      api.defaults.headers.common.Authorization = `Bearer ${data.token}`

      // The store API requires a publishable API key linked to a sales
      // channel on every request - set it once for all `/store` calls.
      const { result: salesChannels } = await createSalesChannelsWorkflow(
        container
      ).run({
        input: {
          salesChannelsData: [{ name: "Localized Slugs Test Channel" }],
        },
      })

      const { result: apiKeys } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            {
              title: "Localized Slugs Test Key",
              type: "publishable",
              created_by: "",
            },
          ],
        },
      })

      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          id: apiKeys[0].id,
          add: [salesChannels[0].id],
        },
      })

      api.defaults.headers.common["x-publishable-api-key"] =
        apiKeys[0].token
    })

    describe("Localized Slugs admin API", () => {
      it("creates localized slugs for multiple locales", async () => {
        const product = await createProduct("Localized Slugs T-Shirt")

        const response = await api.put(
          `/admin/products/${product.id}/localized-slugs`,
          [
            { locale: "pl-PL", slug: "koszulka-meska" },
            { locale: "en-US", slug: "mens-t-shirt" },
          ]
        )

        expect(response.status).toEqual(200)
        expect(response.data.localized_slugs).toEqual(
          expect.arrayContaining([
            { locale: "pl-PL", slug: "koszulka-meska" },
            { locale: "en-US", slug: "mens-t-shirt" },
          ])
        )
      })

      it("updates an existing locale's slug in place", async () => {
        const product = await createProduct("Update Slug Product")

        await api.put(`/admin/products/${product.id}/localized-slugs`, [
          { locale: "pl-PL", slug: "stary-slug" },
        ])

        const response = await api.put(
          `/admin/products/${product.id}/localized-slugs`,
          [{ locale: "pl-PL", slug: "nowy-slug" }]
        )

        expect(response.status).toEqual(200)
        expect(response.data.localized_slugs).toEqual([
          { locale: "pl-PL", slug: "nowy-slug" },
        ])
      })

      it("removes a locale that is omitted from the payload", async () => {
        const product = await createProduct("Delete Slug Product")

        await api.put(`/admin/products/${product.id}/localized-slugs`, [
          { locale: "pl-PL", slug: "polski-slug" },
          { locale: "en-US", slug: "english-slug" },
        ])

        const response = await api.put(
          `/admin/products/${product.id}/localized-slugs`,
          [{ locale: "pl-PL", slug: "polski-slug" }]
        )

        expect(response.data.localized_slugs).toEqual([
          { locale: "pl-PL", slug: "polski-slug" },
        ])
      })

      it("returns 404 for a non-existing product", async () => {
        await expect(
          api.put("/admin/products/prod_does_not_exist/localized-slugs", [
            { locale: "pl-PL", slug: "cokolwiek" },
          ])
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 404 }),
        })
      })

      it("returns 400 for a structurally invalid slug", async () => {
        const product = await createProduct("Invalid Slug Product")

        await expect(
          api.put(`/admin/products/${product.id}/localized-slugs`, [
            { locale: "pl-PL", slug: "koszulka meska" },
          ])
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 400 }),
        })
      })

      it("returns 400 when the request body has the wrong shape", async () => {
        const product = await createProduct("Bad Shape Product")

        await expect(
          api.put(`/admin/products/${product.id}/localized-slugs`, [
            { locale: "pl-PL" },
          ])
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 400 }),
        })
      })

      it("returns 409 when the slug is already used by another product in the same locale", async () => {
        const productA = await createProduct("Conflict Product A")
        const productB = await createProduct("Conflict Product B")

        await api.put(`/admin/products/${productA.id}/localized-slugs`, [
          { locale: "pl-PL", slug: "zajety-slug" },
        ])

        await expect(
          api.put(`/admin/products/${productB.id}/localized-slugs`, [
            { locale: "pl-PL", slug: "zajety-slug" },
          ])
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 409 }),
        })
      })

      it("allows the same slug for different products in different locales", async () => {
        const productA = await createProduct("Same Slug Locale A")
        const productB = await createProduct("Same Slug Locale B")

        await api.put(`/admin/products/${productA.id}/localized-slugs`, [
          { locale: "pl-PL", slug: "shoes" },
        ])

        const response = await api.put(
          `/admin/products/${productB.id}/localized-slugs`,
          [{ locale: "en-US", slug: "shoes" }]
        )

        expect(response.status).toEqual(200)
      })
    })

    describe("Localized Slugs store API", () => {
      it("resolves a product id from a (locale, slug) pair", async () => {
        const product = await createProduct("Store Lookup Product")

        await api.put(`/admin/products/${product.id}/localized-slugs`, [
          { locale: "pl-PL", slug: "produkt-ze-sklepu" },
        ])

        const response = await api.get(
          "/store/products/by-slug/produkt-ze-sklepu?locale=pl-PL"
        )

        expect(response.status).toEqual(200)
        expect(response.data.product_id).toEqual(product.id)
      })

      it("does not resolve the slug under the wrong locale", async () => {
        const product = await createProduct("Wrong Locale Product")

        await api.put(`/admin/products/${product.id}/localized-slugs`, [
          { locale: "pl-PL", slug: "tylko-po-polsku" },
        ])

        await expect(
          api.get("/store/products/by-slug/tylko-po-polsku?locale=en-US")
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 404 }),
        })
      })

      it("returns 400 when no locale is provided", async () => {
        await expect(
          api.get("/store/products/by-slug/whatever-slug")
        ).rejects.toMatchObject({
          response: expect.objectContaining({ status: 400 }),
        })
      })
    })
  },
})
