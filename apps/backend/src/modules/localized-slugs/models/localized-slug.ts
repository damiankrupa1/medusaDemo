import { model } from "@medusajs/framework/utils"

const LocalizedSlug = model
  .define("localized_slug", {
    id: model.id().primaryKey(),
    product_id: model.text(),
    locale: model.text(),
    slug: model.text(),
  })
  .indexes([
    {
      name: "IDX_localized_slug_product_id_locale_unique",
      on: ["product_id", "locale"],
      unique: true,
    },
    {
      name: "IDX_localized_slug_locale_slug_unique",
      on: ["locale", "slug"],
      unique: true,
    },
  ])

export default LocalizedSlug
