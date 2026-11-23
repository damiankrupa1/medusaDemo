/// <reference types="jest" />

import {
  AUTH_RATE_LIMIT_RULES,
  resolveAuthRateLimitRule,
  resolveAuthRateLimitSettings,
} from "../auth-rate-limit"

describe("AUTH_RATE_LIMIT_RULES", () => {
  it("has the thresholds agreed in #35", () => {
    expect(AUTH_RATE_LIMIT_RULES).toEqual({
      customer_login: {
        name: "customer_login",
        limit: 10,
        windowSeconds: 900,
        counts: "failures",
      },
      admin_login: {
        name: "admin_login",
        limit: 5,
        windowSeconds: 900,
        counts: "failures",
      },
      registration: {
        name: "registration",
        limit: 5,
        windowSeconds: 3600,
        counts: "attempts",
      },
    })
  })
})

describe("resolveAuthRateLimitRule", () => {
  it.each(["customer", "Customer", "seller", "anything"])(
    "limits the emailpass login of actor type %p as a customer login",
    (actor_type) => {
      expect(
        resolveAuthRateLimitRule("login", { actor_type, auth_provider: "emailpass" })
      ).toBe(AUTH_RATE_LIMIT_RULES.customer_login)
    }
  )

  it.each(["user", "USER", "User"])(
    "limits the emailpass login of actor type %p as an admin login",
    (actor_type) => {
      expect(
        resolveAuthRateLimitRule("login", { actor_type, auth_provider: "emailpass" })
      ).toBe(AUTH_RATE_LIMIT_RULES.admin_login)
    }
  )

  it.each(["customer", "user", "anything"])(
    "limits the emailpass registration of actor type %p",
    (actor_type) => {
      expect(
        resolveAuthRateLimitRule("register", {
          actor_type,
          auth_provider: "emailpass",
        })
      ).toBe(AUTH_RATE_LIMIT_RULES.registration)
    }
  )

  it.each([
    { actor_type: "customer", auth_provider: "google" },
    { actor_type: "customer", auth_provider: "EmailPass" },
    { actor_type: "token", auth_provider: "refresh" },
    { actor_type: "mfa", auth_provider: "factors" },
    {},
  ])("does not limit %p", (params) => {
    expect(resolveAuthRateLimitRule("login", params)).toBeNull()
    expect(resolveAuthRateLimitRule("register", params)).toBeNull()
  })

  it("does not limit without params", () => {
    expect(resolveAuthRateLimitRule("login", undefined)).toBeNull()
  })
})

describe("resolveAuthRateLimitSettings", () => {
  const REDIS_URL = "redis://localhost:6379"

  it.each([undefined, "", " ", "true", "TRUE", "1", "yes", "on"])(
    "is on with REDIS_URL and AUTH_RATE_LIMIT_ENABLED=%p",
    (value) => {
      expect(
        resolveAuthRateLimitSettings({ REDIS_URL, AUTH_RATE_LIMIT_ENABLED: value })
      ).toEqual({ enabled: true, redisUrl: REDIS_URL })
    }
  )

  it.each(["false", "FALSE", " false ", "0", "no", "off"])(
    "is off with a warning for AUTH_RATE_LIMIT_ENABLED=%p",
    (value) => {
      const settings = resolveAuthRateLimitSettings({
        REDIS_URL,
        AUTH_RATE_LIMIT_ENABLED: value,
      })

      expect(settings.enabled).toBe(false)
      expect(settings.warning).toMatch(/AUTH_RATE_LIMIT_ENABLED .*NOT rate limited/)
    }
  )

  it.each([undefined, "", "  "])(
    "is off with a warning, not an error, when REDIS_URL is %p",
    (value) => {
      const settings = resolveAuthRateLimitSettings({ REDIS_URL: value })

      expect(settings.enabled).toBe(false)
      expect(settings.warning).toMatch(/REDIS_URL is not set/)
    }
  )

  it("stays on, with a warning, for an unrecognised switch value", () => {
    const settings = resolveAuthRateLimitSettings({
      REDIS_URL,
      AUTH_RATE_LIMIT_ENABLED: "flase",
    })

    expect(settings).toMatchObject({ enabled: true, redisUrl: REDIS_URL })
    expect(settings.warning).toMatch(/unrecognised/)
  })

  it("never puts the Redis URL in a warning", () => {
    const url = "redis://default:s3cret@redis.internal:6379"

    for (const value of ["false", "flase"]) {
      const settings = resolveAuthRateLimitSettings({
        REDIS_URL: url,
        AUTH_RATE_LIMIT_ENABLED: value,
      })

      expect(settings.warning).not.toContain("s3cret")
    }
  })
})
