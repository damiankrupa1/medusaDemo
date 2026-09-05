import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"
import LocalizedSlugsModule from "../modules/localized-slugs"

export default defineLink(
  ProductModule.linkable.product,
  LocalizedSlugsModule.linkable.localizedSlug
)
