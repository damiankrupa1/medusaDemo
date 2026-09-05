import { MedusaService } from "@medusajs/framework/utils"
import LocalizedSlug from "./models/localized-slug"

class LocalizedSlugsModuleService extends MedusaService({
  LocalizedSlug,
}) {}

export default LocalizedSlugsModuleService
