import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { logger } from "@medusajs/framework/logger"
import { createAuthRateLimit } from "../lib/auth-rate-limit"
import {
  createActorTypeGuard,
  createRegistrationGuard,
} from "../lib/auth-registration"
import { PutLocalizedSlugsSchema } from "./admin/products/[id]/localized-slugs/validators"

// Per-e-mail limit of password login and registration (#35, docs/auth-rate-limit.md).
// The matchers are Medusa's own route patterns, not literal paths: Medusa
// accepts any actor type and decodes the params, so `/auth/Customer/emailpass`
// or `/auth/customer/email%70ass` reach the same password check.
const authRateLimit = createAuthRateLimit(logger)

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
    // Auth rate limit (#35), then the auth registration guard and actor
    // types (#41): the limiter runs first, so refusals count as attempts.
    {
      matcher: "/auth/:actor_type/:auth_provider",
      methods: ["GET", "POST"],
      middlewares: [authRateLimit.login, refuseUnlistedActorTypes],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/register",
      methods: ["POST"],
      middlewares: [
        authRateLimit.register,
        refuseUnlistedActorTypes,
        refuseExistingIdentity,
      ],
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
