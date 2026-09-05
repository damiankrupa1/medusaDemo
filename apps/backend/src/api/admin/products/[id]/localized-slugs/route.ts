import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { normalizeLocale } from "@medusajs/framework/utils"
import { LOCALIZED_SLUGS_MODULE } from "../../../../../modules/localized-slugs"
import LocalizedSlugsModuleService from "../../../../../modules/localized-slugs/service"
import { upsertLocalizedSlugsWorkflow } from "../../../../../workflows/localized-slugs/upsert-localized-slugs"
import { PutLocalizedSlugsSchemaType } from "./validators"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.id
  const service: LocalizedSlugsModuleService = req.scope.resolve(
    LOCALIZED_SLUGS_MODULE
  )

  const slugs = await service.listLocalizedSlugs({ product_id: productId })

  res.json({
    localized_slugs: slugs.map(({ locale, slug }) => ({ locale, slug })),
  })
}

export async function PUT(
  req: MedusaRequest<PutLocalizedSlugsSchemaType>,
  res: MedusaResponse
): Promise<void> {
  const productId = req.params.id

  const slugs = req.validatedBody.map(({ locale, slug }) => ({
    locale: normalizeLocale(locale),
    slug,
  }))

  const { result } = await upsertLocalizedSlugsWorkflow(req.scope).run({
    input: { product_id: productId, slugs },
  })

  res.json({
    localized_slugs: result.map(({ locale, slug }) => ({ locale, slug })),
  })
}
