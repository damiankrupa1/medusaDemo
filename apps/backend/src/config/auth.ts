/** The auth provider that signs in with e-mail and password. */
export const PASSWORD_AUTH_PROVIDER = "emailpass"

/**
 * Which auth providers each actor type may use
 * (`projectConfig.http.authMethodsPerActor`).
 *
 * Shoppers (`customer`) and admin users (`user`, invites included) sign in
 * with e-mail and password only; the Payload CMS SSO signs an admin who is
 * already logged in and uses no auth provider. Medusa checks this map on its
 * `/auth/:actor_type/:auth_provider/...` routes but lets an actor type that
 * is not listed use every provider, so `createActorTypeGuard()`
 * (src/lib/auth-registration) refuses those: this map is the complete list.
 */
export const AUTH_METHODS_PER_ACTOR: Record<string, string[]> = {
  customer: [PASSWORD_AUTH_PROVIDER],
  user: [PASSWORD_AUTH_PROVIDER],
}
