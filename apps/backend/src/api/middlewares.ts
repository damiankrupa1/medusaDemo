import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { createRegistrationGuard } from "../lib/auth-registration"
import { PutLocalizedSlugsSchema } from "./admin/products/[id]/localized-slugs/validators"

// Registering an e-mail that already has an auth identity is refused (#41,
// docs/auth-registration.md). The matcher is Medusa's own route pattern: it
// covers every actor type, and the params arrive decoded.
const refuseExistingIdentity = createRegistrationGuard()

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products/:id/localized-slugs",
      methods: ["PUT"],
      middlewares: [validateAndTransformBody(PutLocalizedSlugsSchema)],
    },
    // Auth registration guard (#41)
    {
      matcher: "/auth/:actor_type/:auth_provider/register",
      methods: ["POST"],
      middlewares: [refuseExistingIdentity],
    },
  ],
})
