import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Resolves a (locale, slug) pair to a product id. This endpoint is
 * intentionally minimal: the Localized Slugs module is responsible only
 * for the URL mapping, not for serving product data. The storefront
 * should follow up with the standard `GET /store/products/:id` (or
 * `?id[]=`) request - which already returns exactly the fields/relations
 * the storefront needs - to fetch the actual product.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const slug = req.params.slug
  const locale = req.locale

  if (!locale) {
    res.status(400).json({
      message:
        'Please provide a locale via the "locale" query parameter or the "x-medusa-locale" header.',
    })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: localizedSlugs } = await query.graph({
    entity: "localized_slug",
    fields: ["product_id", "locale", "slug"],
    filters: { locale, slug },
  })

  const localizedSlug = localizedSlugs[0]

  if (!localizedSlug) {
    res.status(404).json({
      message: `No product found for slug "${slug}" in locale "${locale}".`,
    })
    return
  }

  res.json({
    product_id: localizedSlug.product_id,
    locale: localizedSlug.locale,
    slug: localizedSlug.slug,
  })
}
