/// <reference types="jest" />

import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { LOCALIZED_SLUGS_MODULE } from "../index"
import LocalizedSlugsModuleService from "../service"
import {
  createLocalizedSlugsStepCompensate,
  createLocalizedSlugsStepInvoke,
  deleteLocalizedSlugsStepCompensate,
  deleteLocalizedSlugsStepInvoke,
  updateLocalizedSlugsStepCompensate,
  updateLocalizedSlugsStepInvoke,
} from "../../../workflows/localized-slugs/upsert-localized-slugs"

moduleIntegrationTestRunner<LocalizedSlugsModuleService>({
  moduleName: LOCALIZED_SLUGS_MODULE,
  resolve: "./src/modules/localized-slugs",
  testSuite: ({ service }) => {
    const stepContext = (container: {
      resolve: (key: string) => unknown
    }) => ({ container })

    describe("LocalizedSlugsModuleService", () => {
      it("creates a localized slug for a product", async () => {
        const [created] = await service.createLocalizedSlugs([
          { product_id: "prod_1", locale: "pl-PL", slug: "koszulka-meska" },
        ])

        expect(created).toEqual(
          expect.objectContaining({
            product_id: "prod_1",
            locale: "pl-PL",
            slug: "koszulka-meska",
          })
        )
      })

      it("supports multiple locales for the same product", async () => {
        await service.createLocalizedSlugs([
          { product_id: "prod_2", locale: "pl-PL", slug: "koszulka-meska" },
          { product_id: "prod_2", locale: "en-US", slug: "mens-t-shirt" },
          { product_id: "prod_2", locale: "de-DE", slug: "herren-t-shirt" },
        ])

        const slugs = await service.listLocalizedSlugs({
          product_id: "prod_2",
        })

        expect(slugs).toHaveLength(3)
        expect(slugs.map((s) => s.locale).sort()).toEqual([
          "de-DE",
          "en-US",
          "pl-PL",
        ])
      })

      it("updates a slug in place rather than creating a duplicate", async () => {
        const [created] = await service.createLocalizedSlugs([
          { product_id: "prod_3", locale: "pl-PL", slug: "stary-slug" },
        ])

        await service.updateLocalizedSlugs([
          { id: created.id, slug: "nowy-slug" },
        ])

        const slugs = await service.listLocalizedSlugs({
          product_id: "prod_3",
        })

        expect(slugs).toHaveLength(1)
        expect(slugs[0].slug).toEqual("nowy-slug")
      })

      it("removes a locale via soft-delete", async () => {
        const [created] = await service.createLocalizedSlugs([
          { product_id: "prod_4", locale: "pl-PL", slug: "do-usuniecia" },
        ])

        await service.softDeleteLocalizedSlugs([created.id])

        const slugs = await service.listLocalizedSlugs({
          product_id: "prod_4",
        })
        expect(slugs).toHaveLength(0)
      })

      it("rejects a second slug for the same product + locale", async () => {
        await service.createLocalizedSlugs([
          { product_id: "prod_5", locale: "pl-PL", slug: "pierwszy-slug" },
        ])

        await expect(
          service.createLocalizedSlugs([
            { product_id: "prod_5", locale: "pl-PL", slug: "drugi-slug" },
          ])
        ).rejects.toThrow(/already exists/)
      })

      it("rejects the same slug used twice in one locale by different products", async () => {
        await service.createLocalizedSlugs([
          { product_id: "prod_6", locale: "pl-PL", slug: "buty-sportowe" },
        ])

        await expect(
          service.createLocalizedSlugs([
            { product_id: "prod_7", locale: "pl-PL", slug: "buty-sportowe" },
          ])
        ).rejects.toThrow(/already exists/)
      })

      it("allows the same slug for different locales", async () => {
        await service.createLocalizedSlugs([
          { product_id: "prod_8", locale: "pl-PL", slug: "shoes" },
        ])

        const [created] = await service.createLocalizedSlugs([
          { product_id: "prod_9", locale: "en-US", slug: "shoes" },
        ])

        expect(created.slug).toEqual("shoes")
      })

      it("finds the right product for a (locale, slug) pair and not for the wrong locale", async () => {
        await service.createLocalizedSlugs([
          { product_id: "prod_10", locale: "pl-PL", slug: "unikalny-slug" },
        ])

        const [found] = await service.listLocalizedSlugs({
          locale: "pl-PL",
          slug: "unikalny-slug",
        })
        expect(found.product_id).toEqual("prod_10")

        const wrongLocale = await service.listLocalizedSlugs({
          locale: "en-US",
          slug: "unikalny-slug",
        })
        expect(wrongLocale).toHaveLength(0)
      })
    })

    describe("upsert workflow step compensation", () => {
      it("create compensation soft-deletes the rows it created", async () => {
        const created = await createLocalizedSlugsStepInvoke(
          [{ product_id: "prod_11", locale: "pl-PL", slug: "nowy-produkt" }],
          stepContext({ resolve: () => service })
        )

        await createLocalizedSlugsStepCompensate(
          created.compensateInput,
          stepContext({ resolve: () => service })
        )

        const remaining = await service.listLocalizedSlugs({
          product_id: "prod_11",
        })
        expect(remaining).toHaveLength(0)
      })

      it("update compensation restores the previous slug value", async () => {
        const [existing] = await service.createLocalizedSlugs([
          { product_id: "prod_12", locale: "pl-PL", slug: "stary-slug" },
        ])

        const updateResult = await updateLocalizedSlugsStepInvoke(
          {
            toUpdate: [{ id: existing.id, slug: "nowy-slug" }],
            previousValues: [{ id: existing.id, slug: "stary-slug" }],
          },
          stepContext({ resolve: () => service })
        )

        await updateLocalizedSlugsStepCompensate(
          updateResult.compensateInput,
          stepContext({ resolve: () => service })
        )

        const restored = await service.retrieveLocalizedSlug(existing.id)
        expect(restored.slug).toEqual("stary-slug")
      })

      it("delete compensation restores a removed slug", async () => {
        const [existing] = await service.createLocalizedSlugs([
          { product_id: "prod_13", locale: "pl-PL", slug: "usuniety-slug" },
        ])

        const deleteResult = await deleteLocalizedSlugsStepInvoke(
          [existing.id],
          stepContext({ resolve: () => service })
        )

        expect(
          await service.listLocalizedSlugs({ product_id: "prod_13" })
        ).toHaveLength(0)

        await deleteLocalizedSlugsStepCompensate(
          deleteResult.compensateInput,
          stepContext({ resolve: () => service })
        )

        const restored = await service.listLocalizedSlugs({
          product_id: "prod_13",
        })
        expect(restored).toHaveLength(1)
        expect(restored[0].slug).toEqual("usuniety-slug")
      })
    })
  },
})
