import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { IAuthModuleService, Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  isPresent,
} from "@medusajs/framework/utils"
import { PASSWORD_AUTH_PROVIDER } from "../../config/auth"

/** The message (and 401) Medusa answers when an e-mail's identity already has an actor. */
export const IDENTITY_EXISTS_MESSAGE = "Identity with email already exists"

/** The part of the auth module (`IAuthModuleService`) the guard uses. */
export interface AuthIdentityStore {
  listProviderIdentities(
    // `$ilike` is a regular query operator, missing from the filter's type
    filters: Record<string, unknown>,
    config?: { select?: string[]; take?: number }
  ): Promise<{ id: string }[]>
  createAuthIdentities(data: {
    provider_identities: { provider: string; entity_id: string }[]
  }): Promise<{ id: string }>
  retrieveAuthIdentity(
    id: string
  ): Promise<{ app_metadata?: Record<string, unknown> | null }>
  deleteAuthIdentities(ids: string[]): Promise<void>
}

export type AuthModuleProvider = (req: MedusaRequest) => AuthIdentityStore

const resolveAuthModule: AuthModuleProvider = (req) =>
  req.scope.resolve<IAuthModuleService>(Modules.AUTH) as AuthIdentityStore

/** `foo_bar%@x` as an ILIKE pattern that matches only itself, ignoring case. */
export const toExactIlikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`)

const identityExists = () =>
  new MedusaError(MedusaError.Types.UNAUTHORIZED, IDENTITY_EXISTS_MESSAGE)

/**
 * Route middleware for `POST /auth/:actor_type/:auth_provider/register`.
 *
 * Registering an e-mail that already has an `emailpass` identity is refused
 * with the 401 Medusa gives for an identity that has an actor, whether or not
 * the existing identity has an actor (customer/user) yet, and for every actor
 * type. Medusa's provider would otherwise accept a second registration of an
 * identity without an actor and replace its password. Someone whose
 * registration stopped before the customer was created signs in with their
 * password instead (docs/auth-registration.md).
 *
 * The e-mail is compared ignoring case. Medusa itself stores and compares it
 * exactly as typed, so `Ann@x.com` and `ann@x.com` would be two identities.
 *
 * Concurrent registrations of one new e-mail: checking first and letting
 * Medusa register afterwards would leave a window in which a second request
 * passes the check and then finds the first one's fresh identity in Medusa's
 * provider. So for a new e-mail this middleware creates the identity itself,
 * without a password, before Medusa runs. The database's unique index on the
 * provider identity (`entity_id`, `provider`) lets only one of the concurrent
 * requests create it; the others are refused here. Medusa's provider then
 * finds the identity created by this same request and sets its password, so
 * it never takes over an identity it did not create. If Medusa does not
 * answer 2xx, the placeholder is deleted again (unless an actor got attached).
 * Two concurrent first registrations differing only in letter case are not
 * serialised by the index; each gets its own identity, neither replaces the
 * other's password.
 *
 * Medusa parses the body (JSON or urlencoded) before any route middleware, and
 * `req.params` are already decoded, so `/auth/customer/email%70ass/register`
 * arrives here as `emailpass`.
 */
export function createRegistrationGuard(
  getAuthModule: AuthModuleProvider = resolveAuthModule
) {
  return async function refuseExistingIdentity(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) {
    if (req.params?.auth_provider !== PASSWORD_AUTH_PROVIDER) {
      return next()
    }

    const { email, password } = (req.body ?? {}) as {
      email?: unknown
      password?: unknown
    }

    // Medusa's provider refuses these itself without touching any identity.
    if (
      typeof email !== "string" ||
      !email ||
      typeof password !== "string" ||
      !password
    ) {
      return next()
    }

    try {
      const authModule = getAuthModule(req)

      const existing = await authModule.listProviderIdentities(
        {
          provider: PASSWORD_AUTH_PROVIDER,
          entity_id: { $ilike: toExactIlikePattern(email) },
        },
        { select: ["id"], take: 1 }
      )

      if (existing.length) {
        return next(identityExists())
      }

      let placeholderId: string

      try {
        const created = await authModule.createAuthIdentities({
          provider_identities: [
            { provider: PASSWORD_AUTH_PROVIDER, entity_id: email },
          ],
        })
        placeholderId = created.id
      } catch (error) {
        // Lost the race against a concurrent registration of this e-mail
        // (unique index on entity_id + provider).
        const now = await authModule.listProviderIdentities(
          { provider: PASSWORD_AUTH_PROVIDER, entity_id: email },
          { select: ["id"], take: 1 }
        )

        if (now.length) {
          return next(identityExists())
        }

        throw error
      }

      res.once("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return
        }

        // Left behind, it is an identity without an actor: the e-mail can't
        // be registered again until src/scripts/list-orphan-identities.ts
        // removes it, but nobody can sign in with it either (no password).
        void removePlaceholder(authModule, placeholderId).catch(() => {
          req.scope
            .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
            .warn(`Could not remove the unused auth identity ${placeholderId}`)
        })
      })

      next()
    } catch (error) {
      next(error)
    }
  }
}

async function removePlaceholder(
  authModule: AuthIdentityStore,
  id: string
): Promise<void> {
  const identity = await authModule.retrieveAuthIdentity(id)

  if (isPresent(identity.app_metadata)) {
    return
  }

  await authModule.deleteAuthIdentities([id])
}
