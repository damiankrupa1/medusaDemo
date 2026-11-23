import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  resolveAuthRateLimitRule,
  type AuthRateLimitRoute,
} from "../../config/auth-rate-limit"
import {
  RATE_LIMITED_RESPONSE,
  outcomeFromStatus,
  type AuthRateLimiter,
} from "./limiter"

export type LimiterProvider = (req: MedusaRequest) => AuthRateLimiter | null

/**
 * Route middleware for `/auth/:actor_type/:auth_provider` (`route: "login"`,
 * GET and POST: Medusa's GET handler authenticates from the body too) and
 * `/auth/:actor_type/:auth_provider/register` (`route: "register"`).
 *
 * Medusa parses the body for every route before any route middleware, so
 * `req.body.email` is there. The attempt is reserved before Medusa handles
 * the request; once the answer has been sent (`finish`), its status settles
 * the reservation: 2xx = success, 401 = failure, anything else = neither.
 * A request whose connection closes before the answer keeps its reservation.
 */
export function createAuthRateLimitMiddleware(
  route: AuthRateLimitRoute,
  getLimiter: LimiterProvider
) {
  return async function authRateLimit(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) {
    const rule = resolveAuthRateLimitRule(route, req.params)
    const email = (req.body as { email?: unknown } | undefined)?.email

    if (!rule || typeof email !== "string" || !email.trim()) {
      return next()
    }

    const limiter = getLimiter(req)

    if (!limiter) {
      return next()
    }

    const decision = await limiter.attempt(rule, email)

    if (decision.action === "block") {
      res.setHeader("Retry-After", String(decision.retryAfterSeconds))
      res.status(429).json(RATE_LIMITED_RESPONSE)
      return
    }

    const { ticket } = decision

    if (ticket) {
      res.once("finish", () => {
        void limiter.settle(ticket, outcomeFromStatus(res.statusCode))
      })
    }

    next()
  }
}
