import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { ConfigModule } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

export type AuthMethodsProvider = (
  req: MedusaRequest
) => Record<string, string[]> | undefined

const fromProjectConfig: AuthMethodsProvider = (req) =>
  req.scope.resolve<ConfigModule>(ContainerRegistrationKeys.CONFIG_MODULE)
    .projectConfig?.http?.authMethodsPerActor

/**
 * Route middleware for Medusa's `/auth/:actor_type/:auth_provider` routes
 * (sign-in, `register`, `callback`, `update`, `reset-password`).
 *
 * Medusa checks `projectConfig.http.authMethodsPerActor` on these routes but
 * lets an actor type that is not in it use every provider. This refuses an
 * actor type that is not in the map for every provider the map names, with
 * Medusa's own error (400 `not_allowed`), so the map in src/config/auth.ts is
 * the complete list. The comparison is exact, as in Medusa (`Customer` is not
 * `customer`). Without the map configured nothing is refused, matching Medusa.
 *
 * Only providers named in the map are checked, because the matcher
 * `/auth/:actor_type/:auth_provider` also fits Medusa's fixed auth routes
 * (`/auth/token/refresh`, `/auth/emailpass/user`, `/auth/mfa/factors`,
 * `/auth/user/providers`, ...), whose second segment is not a provider.
 */
export function createActorTypeGuard(
  getAuthMethods: AuthMethodsProvider = fromProjectConfig
) {
  return function refuseUnlistedActorTypes(
    req: MedusaRequest,
    _res: MedusaResponse,
    next: MedusaNextFunction
  ) {
    const authMethods = getAuthMethods(req)
    const { actor_type, auth_provider } = (req.params ?? {}) as {
      actor_type?: string
      auth_provider?: string
    }

    const listedProvider =
      !!authMethods &&
      typeof auth_provider === "string" &&
      Object.values(authMethods).some((providers) =>
        providers.includes(auth_provider)
      )
    const listedActorType =
      typeof actor_type === "string" &&
      !!authMethods &&
      Object.prototype.hasOwnProperty.call(authMethods, actor_type)

    if (!listedProvider || listedActorType) {
      return next()
    }

    next(
      new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `The actor type ${actor_type} is not allowed to use the auth provider ${auth_provider}`
      )
    )
  }
}
