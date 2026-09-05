import { Module } from "@medusajs/framework/utils"
import LocalizedSlugsModuleService from "./service"

export const LOCALIZED_SLUGS_MODULE = "localized_slugs"

export default Module(LOCALIZED_SLUGS_MODULE, {
  service: LocalizedSlugsModuleService,
})
