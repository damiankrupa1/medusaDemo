import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { PutLocalizedSlugsSchema } from "./admin/products/[id]/localized-slugs/validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products/:id/localized-slugs",
      methods: ["PUT"],
      middlewares: [validateAndTransformBody(PutLocalizedSlugsSchema)],
    },
  ],
})
