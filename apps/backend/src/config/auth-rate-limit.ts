/**
 * Per-e-mail rate limit of password login and registration (issue #35).
 *
 * The thresholds live here, not in the environment: they are a security
 * decision, reviewed with the code. Only the switch and the Redis URL come
 * from the environment, and only when called (see ./env.ts).
 *
 * The limit is per e-mail, never per IP: storefront traffic reaches Medusa
 * from shared Vercel addresses, so a per-IP limit here would lock out every
 * shopper at once. Per IP is a Vercel WAF rule (damiankrupa1/nuxtMedusa#91).
 */

export type AuthRateLimitRuleName =
  | "customer_login"
  | "admin_login"
  | "registration"

export type AuthRateLimitRule = {
  name: AuthRateLimitRuleName
  /** Counted attempts allowed per window; the next one is answered 429. */
  limit: number
  /** Window length. It starts with the first counted attempt (fixed window). */
  windowSeconds: number
  /**
   * `failures`: an attempt is reserved before Medusa handles it, kept when
   * Medusa answers 401, cleared together with the whole counter on a 2xx, and
   * given back on any other answer. `attempts`: every attempt counts.
   */
  counts: "failures" | "attempts"
}

export const AUTH_RATE_LIMIT_RULES: Record<AuthRateLimitRuleName, AuthRateLimitRule> = {
  customer_login: {
    name: "customer_login",
    limit: 10,
    windowSeconds: 15 * 60,
    counts: "failures",
  },
  admin_login: {
    name: "admin_login",
    limit: 5,
    windowSeconds: 15 * 60,
    counts: "failures",
  },
  registration: {
    name: "registration",
    limit: 5,
    windowSeconds: 60 * 60,
    counts: "attempts",
  },
}

/** Redis keys are `<prefix>:<rule>:<HMAC-SHA256 of the e-mail, hex>`. */
export const AUTH_RATE_LIMIT_KEY_PREFIX = "auth-rate-limit"

/** Redis settings of the limiter's own connection. */
export const AUTH_RATE_LIMIT_REDIS = {
  /** A command that takes longer fails, and the request goes through (fail open). */
  commandTimeoutMs: 1000,
  connectTimeoutMs: 2000,
}

/** At most one warning per kind (Redis error, fail open) in this interval. */
export const AUTH_RATE_LIMIT_WARNING_INTERVAL_MS = 60 * 1000

/** The only provider whose login/registration takes a password. */
const PASSWORD_PROVIDER = "emailpass"

export type AuthRateLimitRoute = "login" | "register"

/**
 * Which rule applies to `/auth/:actor_type/:auth_provider` (login) or
 * `/auth/:actor_type/:auth_provider/register`, from the decoded route params.
 *
 * Every actor type is covered, not only `customer` and `user`: Medusa's auth
 * routes accept any actor type (no `authMethodsPerActor` is configured) and
 * check the password of the e-mail's auth identity whatever the actor type
 * in the URL, so `/auth/anything/emailpass` would otherwise be an unlimited
 * password oracle. `user` (case-insensitive) is the admin login; every other
 * actor type counts as a customer login. Registration has one rule for all
 * actor types.
 */
export function resolveAuthRateLimitRule(
  route: AuthRateLimitRoute,
  params: { actor_type?: unknown; auth_provider?: unknown } | undefined
): AuthRateLimitRule | null {
  if (params?.auth_provider !== PASSWORD_PROVIDER) {
    return null
  }

  if (route === "register") {
    return AUTH_RATE_LIMIT_RULES.registration
  }

  const actorType =
    typeof params.actor_type === "string" ? params.actor_type.toLowerCase() : ""

  return actorType === "user"
    ? AUTH_RATE_LIMIT_RULES.admin_login
    : AUTH_RATE_LIMIT_RULES.customer_login
}

export type AuthRateLimitSettings =
  | { enabled: true; redisUrl: string; warning?: string }
  | { enabled: false; warning: string }

const DISABLING_VALUES = ["false", "0", "no", "off"]
const ENABLING_VALUES = ["", "true", "1", "yes", "on"]

/**
 * `AUTH_RATE_LIMIT_ENABLED` defaults to on: unset, empty or `true` keep the
 * limit; only `false` (or `0`, `no`, `off`) turns it off. An unrecognised
 * value keeps it on, with a warning. Without `REDIS_URL` the limit is off,
 * with a warning, and never an error: local development without Redis must
 * keep working.
 */
export function resolveAuthRateLimitSettings(
  env: NodeJS.ProcessEnv = process.env
): AuthRateLimitSettings {
  const switchValue = env.AUTH_RATE_LIMIT_ENABLED?.trim().toLowerCase() ?? ""

  if (DISABLING_VALUES.includes(switchValue)) {
    return {
      enabled: false,
      warning:
        "AUTH_RATE_LIMIT_ENABLED is off: login and registration are NOT rate limited.",
    }
  }

  const redisUrl = env.REDIS_URL?.trim()

  if (!redisUrl) {
    return {
      enabled: false,
      warning:
        "REDIS_URL is not set: login and registration are NOT rate limited.",
    }
  }

  if (!ENABLING_VALUES.includes(switchValue)) {
    return {
      enabled: true,
      redisUrl,
      warning:
        `AUTH_RATE_LIMIT_ENABLED has an unrecognised value; the rate limit stays on. ` +
        `Use "true" or "false".`,
    }
  }

  return { enabled: true, redisUrl }
}
