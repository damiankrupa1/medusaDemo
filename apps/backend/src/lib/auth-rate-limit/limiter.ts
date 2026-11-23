import { createHmac } from "node:crypto"
import {
  AUTH_RATE_LIMIT_KEY_PREFIX,
  AUTH_RATE_LIMIT_WARNING_INTERVAL_MS,
  type AuthRateLimitRule,
} from "../../config/auth-rate-limit"

/**
 * The counter operations the limiter needs. Each one must be atomic; the Redis
 * implementation (./redis-store.ts) runs each as one Lua script.
 */
export interface RateLimitStore {
  /**
   * If the counter is below `limit`: increment it, start the window when the
   * key is new, and return `allowed: true`. Otherwise change nothing and
   * return `allowed: false`. `ttlMs` is what is left of the window.
   */
  consume(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; count: number; ttlMs: number }>
  /** Give back one reserved attempt (never below zero; keeps the window). */
  release(key: string): Promise<void>
  /** Drop the counter (successful login). */
  reset(key: string): Promise<void>
}

export type RateLimitLogger = { warn(message: string): void }

/** A reserved attempt, settled once Medusa has answered. */
export type RateLimitTicket = {
  key: string
  rule: AuthRateLimitRule
}

export type RateLimitDecision =
  | { action: "allow"; ticket: RateLimitTicket | null }
  | { action: "block"; retryAfterSeconds: number }

/** How Medusa answered: `success` = 2xx, `failure` = 401, `other` = the rest. */
export type AttemptOutcome = "success" | "failure" | "other"

export const RATE_LIMITED_RESPONSE = {
  type: "not_allowed",
  code: "rate_limited",
  message: "Too many attempts. Try again later.",
} as const

/**
 * Lower-cased and trimmed, so `Ann@Example.com ` and `ann@example.com` share a
 * counter. Anything that is not a non-empty string is `null`: Medusa answers
 * it with a 401 ("Email should be a string") without looking at any
 * password, so there is nothing to limit. A string that does not look like
 * an e-mail is still limited, because Medusa looks it up as an identity.
 */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const email = value.trim().toLowerCase()

  return email ? email : null
}

/**
 * HMAC-SHA256 of the normalised e-mail with a server secret, hex. Keyed, so
 * that someone who can read Redis cannot test e-mails against the keys. The
 * e-mail itself is never stored, logged or returned.
 */
export function hashEmail(email: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`auth-rate-limit:${email}`)
    .digest("hex")
}

export function outcomeFromStatus(statusCode: number): AttemptOutcome {
  if (statusCode >= 200 && statusCode < 300) {
    return "success"
  }

  return statusCode === 401 ? "failure" : "other"
}

export type AuthRateLimiterOptions = {
  store: RateLimitStore
  /** Key of the e-mail HMAC. */
  secret: string
  logger: RateLimitLogger
  /** Clock for throttling warnings; defaults to Date.now. */
  now?: () => number
  keyPrefix?: string
  warningIntervalMs?: number
}

/**
 * Per-e-mail limiter. A login attempt is reserved before Medusa handles it,
 * so parallel requests cannot all pass a check made before any of them has
 * failed; `settle` then keeps (401), clears (2xx) or gives back (any other
 * answer) the reservation.
 *
 * Fails open: when the store throws, the attempt is allowed and a warning is
 * logged (at most one per kind and interval, without the e-mail or key), so a
 * Redis outage never takes login down.
 */
export class AuthRateLimiter {
  private readonly store: RateLimitStore
  private readonly secret: string
  private readonly logger: RateLimitLogger
  private readonly now: () => number
  private readonly keyPrefix: string
  private readonly warningIntervalMs: number
  private readonly lastWarningAt = new Map<string, number>()
  private readonly suppressedWarnings = new Map<string, number>()

  constructor(options: AuthRateLimiterOptions) {
    if (!options.secret) {
      throw new Error("AuthRateLimiter needs a non-empty secret")
    }

    this.store = options.store
    this.secret = options.secret
    this.logger = options.logger
    this.now = options.now ?? Date.now
    this.keyPrefix = options.keyPrefix ?? AUTH_RATE_LIMIT_KEY_PREFIX
    this.warningIntervalMs =
      options.warningIntervalMs ?? AUTH_RATE_LIMIT_WARNING_INTERVAL_MS
  }

  keyFor(rule: AuthRateLimitRule, email: string): string {
    return `${this.keyPrefix}:${rule.name}:${hashEmail(email, this.secret)}`
  }

  /**
   * Reserve an attempt for `rawEmail` under `rule`. An e-mail that
   * `normalizeEmail` rejects is allowed without a ticket.
   */
  async attempt(
    rule: AuthRateLimitRule,
    rawEmail: unknown
  ): Promise<RateLimitDecision> {
    const email = normalizeEmail(rawEmail)

    if (!email) {
      return { action: "allow", ticket: null }
    }

    const key = this.keyFor(rule, email)

    try {
      const result = await this.store.consume(
        key,
        rule.limit,
        rule.windowSeconds * 1000
      )

      if (!result.allowed) {
        return {
          action: "block",
          retryAfterSeconds: Math.max(1, Math.ceil(result.ttlMs / 1000)),
        }
      }

      return { action: "allow", ticket: { key, rule } }
    } catch (error) {
      this.warn(
        "consume",
        `could not check the ${rule.name} limit, letting the request through (fail open): ${errorMessage(error)}`
      )

      return { action: "allow", ticket: null }
    }
  }

  async settle(ticket: RateLimitTicket, outcome: AttemptOutcome): Promise<void> {
    if (ticket.rule.counts === "attempts" || outcome === "failure") {
      return
    }

    try {
      if (outcome === "success") {
        await this.store.reset(ticket.key)
      } else {
        await this.store.release(ticket.key)
      }
    } catch (error) {
      this.warn(
        "settle",
        `could not update the ${ticket.rule.name} counter after a ${outcome} answer: ${errorMessage(error)}`
      )
    }
  }

  /** For errors outside a request, e.g. the Redis client's `error` event. */
  warn(kind: string, message: string): void {
    const now = this.now()
    const last = this.lastWarningAt.get(kind)

    if (last !== undefined && now - last < this.warningIntervalMs) {
      this.suppressedWarnings.set(kind, (this.suppressedWarnings.get(kind) ?? 0) + 1)
      return
    }

    const suppressed = this.suppressedWarnings.get(kind) ?? 0
    this.lastWarningAt.set(kind, now)
    this.suppressedWarnings.delete(kind)

    this.logger.warn(
      `[auth-rate-limit] ${message}` +
        (suppressed ? ` (${suppressed} similar warnings suppressed)` : "")
    )
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
