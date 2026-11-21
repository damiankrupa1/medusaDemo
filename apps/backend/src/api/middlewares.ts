import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { logger } from "@medusajs/framework/logger"
import { createAuthRateLimit } from "../lib/auth-rate-limit"
import { PutLocalizedSlugsSchema } from "./admin/products/[id]/localized-slugs/validators"

// Per-e-mail limit of password login and registration (#35, docs/auth-rate-limit.md).
// The matchers are Medusa's own route patterns, not literal paths: Medusa
// accepts any actor type and decodes the params, so `/auth/Customer/emailpass`
// or `/auth/customer/email%70ass` reach the same password check.
const authRateLimit = createAuthRateLimit(logger)

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products/:id/localized-slugs",
      methods: ["PUT"],
      middlewares: [validateAndTransformBody(PutLocalizedSlugsSchema)],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider",
      methods: ["GET", "POST"],
      middlewares: [authRateLimit.login],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/register",
      methods: ["POST"],
      middlewares: [authRateLimit.register],
    },
  ],
})
