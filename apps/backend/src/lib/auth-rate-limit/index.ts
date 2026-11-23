import Redis from "ioredis"
import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  AUTH_RATE_LIMIT_REDIS,
  resolveAuthRateLimitSettings,
} from "../../config/auth-rate-limit"
import { AuthRateLimiter, type RateLimitLogger } from "./limiter"
import { createAuthRateLimitMiddleware } from "./middleware"
import { RedisRateLimitStore } from "./redis-store"

/**
 * The login and registration middlewares for src/api/middlewares.ts.
 *
 * Reads the environment once, when called (at boot, when Medusa loads the
 * middlewares file), and logs one warning when the limit is off. The Redis
 * connection is the limiter's own (Medusa doesn't share one in the
 * container; the event bus' connection waits forever while Redis is down,
 * which would block logins instead of failing open). It is opened on the
 * first limited request, so `medusa exec`, builds, the worker and unit tests
 * never connect, and closed when the process exits.
 */
export function createAuthRateLimit(
  logger: RateLimitLogger,
  env: NodeJS.ProcessEnv = process.env
) {
  const settings = resolveAuthRateLimitSettings(env)

  if (settings.warning) {
    logger.warn(`[auth-rate-limit] ${settings.warning}`)
  }

  let limiter: AuthRateLimiter | null = null
  const redisUrl = settings.enabled ? settings.redisUrl : null
  let unavailable = false

  const getLimiter = (req: MedusaRequest): AuthRateLimiter | null => {
    if (!redisUrl || unavailable) {
      return null
    }

    if (limiter) {
      return limiter
    }

    const { projectConfig } = req.scope.resolve(
      ContainerRegistrationKeys.CONFIG_MODULE
    )

    if (!projectConfig.http.cookieSecret) {
      // medusa-config.ts always sets one (requireSecret); never fail a login over it.
      unavailable = true
      logger.warn(
        "[auth-rate-limit] No cookieSecret in the project config: login and registration are NOT rate limited."
      )
      return null
    }

    const client = new Redis(redisUrl, {
      ...projectConfig.redisOptions,
      // A slow or missing Redis must fail the command quickly (fail open).
      commandTimeout: AUTH_RATE_LIMIT_REDIS.commandTimeoutMs,
      connectTimeout: AUTH_RATE_LIMIT_REDIS.connectTimeoutMs,
      maxRetriesPerRequest: 1,
    })
    const created = new AuthRateLimiter({
      store: new RedisRateLimitStore(client),
      // Same secret as medusa-config.ts' cookieSecret (COOKIE_SECRET).
      secret: projectConfig.http.cookieSecret ?? "",
      logger,
    })

    // Without a listener ioredis prints every connection error itself.
    client.on("error", (error: Error) => {
      created.warn("redis", `Redis connection error: ${error.message}`)
    })
    process.once("exit", () => client.disconnect())

    limiter = created

    return limiter
  }

  return {
    enabled: settings.enabled,
    login: createAuthRateLimitMiddleware("login", getLimiter),
    register: createAuthRateLimitMiddleware("register", getLimiter),
  }
}
