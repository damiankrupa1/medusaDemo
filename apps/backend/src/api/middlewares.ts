import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import {
  createActorTypeGuard,
  createRegistrationGuard,
} from "../lib/auth-registration"
import { PutLocalizedSlugsSchema } from "./admin/products/[id]/localized-slugs/validators"

// Registering an e-mail that already has an auth identity is refused (#41,
// docs/auth-registration.md). The matcher is Medusa's own route pattern: it
// covers every actor type, and the params arrive decoded.
const refuseExistingIdentity = createRegistrationGuard()
// Only the actor types of `authMethodsPerActor` (src/config/auth.ts) may use
// the auth routes; Medusa itself lets any other actor type through.
const refuseUnlistedActorTypes = createActorTypeGuard()

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products/:id/localized-slugs",
      methods: ["PUT"],
      middlewares: [validateAndTransformBody(PutLocalizedSlugsSchema)],
    },
    // Auth registration guard and actor types (#41)
    {
      matcher: "/auth/:actor_type/:auth_provider",
      methods: ["GET", "POST"],
      middlewares: [refuseUnlistedActorTypes],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/register",
      methods: ["POST"],
      middlewares: [refuseUnlistedActorTypes, refuseExistingIdentity],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/callback",
      methods: ["GET", "POST"],
      middlewares: [refuseUnlistedActorTypes],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/reset-password",
      methods: ["POST"],
      middlewares: [refuseUnlistedActorTypes],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/update",
      methods: ["POST"],
      middlewares: [refuseUnlistedActorTypes],
    },
  ],
})
