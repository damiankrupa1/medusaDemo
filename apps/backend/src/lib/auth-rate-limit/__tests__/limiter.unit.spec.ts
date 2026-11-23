/// <reference types="jest" />

import { AUTH_RATE_LIMIT_RULES } from "../../../config/auth-rate-limit"
import {
  AuthRateLimiter,
  hashEmail,
  normalizeEmail,
  outcomeFromStatus,
  type RateLimitDecision,
} from "../limiter"
import { MemoryRateLimitStore } from "./memory-store"

const SECRET = "test-secret"
const EMAIL = "ann@example.com"
const { customer_login, admin_login, registration } = AUTH_RATE_LIMIT_RULES

const setup = () => {
  let now = 1_000_000
  const clock = {
    now: () => now,
    advance: (ms: number) => {
      now += ms
    },
  }
  const store = new MemoryRateLimitStore(clock.now)
  const logger = { warn: jest.fn<void, [string]>() }
  const limiter = new AuthRateLimiter({ store, secret: SECRET, logger, now: clock.now })

  /** One attempt answered with `status`, like the middleware does it. */
  const request = async (
    rule = customer_login,
    email: unknown = EMAIL,
    status = 401
  ): Promise<RateLimitDecision> => {
    const decision = await limiter.attempt(rule, email)

    if (decision.action === "allow" && decision.ticket) {
      await limiter.settle(decision.ticket, outcomeFromStatus(status))
    }

    return decision
  }

  return { clock, store, logger, limiter, request }
}

const failTimes = async (
  request: ReturnType<typeof setup>["request"],
  times: number,
  rule = customer_login,
  email: unknown = EMAIL
) => {
  for (let i = 0; i < times; i++) {
    expect(await request(rule, email)).toMatchObject({ action: "allow" })
  }
}

describe("normalizeEmail", () => {
  it.each([
    ["ann@example.com", "ann@example.com"],
    ["  Ann@Example.COM ", "ann@example.com"],
    ["not-an-email", "not-an-email"],
  ])("normalizes %p", (value, expected) => {
    expect(normalizeEmail(value)).toBe(expected)
  })

  it.each([undefined, null, "", "   ", 42, ["ann@example.com"], { email: "x" }])(
    "rejects %p",
    (value) => {
      expect(normalizeEmail(value)).toBeNull()
    }
  )
})

describe("hashEmail", () => {
  it("is a keyed SHA-256 in hex, never the e-mail", () => {
    const hash = hashEmail(EMAIL, SECRET)

    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(hashEmail(EMAIL, SECRET))
    expect(hash).not.toBe(hashEmail(EMAIL, "other-secret"))
    expect(hash).not.toBe(hashEmail("bob@example.com", SECRET))
  })
})

describe("outcomeFromStatus", () => {
  it.each([
    [200, "success"],
    [201, "success"],
    [401, "failure"],
    [400, "other"],
    [403, "other"],
    [429, "other"],
    [500, "other"],
  ])("maps %p to %p", (status, outcome) => {
    expect(outcomeFromStatus(status)).toBe(outcome)
  })
})

describe("AuthRateLimiter", () => {
  it("requires a secret", () => {
    expect(
      () =>
        new AuthRateLimiter({
          store: new MemoryRateLimitStore(Date.now),
          secret: "",
          logger: { warn: jest.fn() },
        })
    ).toThrow(/secret/)
  })

  it("keys by rule and hashed, normalized e-mail, never the e-mail itself", () => {
    const { limiter } = setup()
    const key = limiter.keyFor(customer_login, EMAIL)

    expect(key).toBe(`auth-rate-limit:customer_login:${hashEmail(EMAIL, SECRET)}`)
    expect(key).not.toContain("ann")
    expect(key).not.toContain("example")
    expect(limiter.keyFor(admin_login, EMAIL)).not.toBe(key)
  })

  it("blocks the 11th failed customer login, with Retry-After from the window", async () => {
    const { request } = setup()

    await failTimes(request, 10)

    expect(await request()).toEqual({ action: "block", retryAfterSeconds: 900 })
  })

  it("blocks the 6th failed admin login", async () => {
    const { request } = setup()

    await failTimes(request, 5, admin_login)

    expect(await request(admin_login)).toEqual({
      action: "block",
      retryAfterSeconds: 900,
    })
  })

  it("blocks a correct password too once the limit is reached", async () => {
    const { request } = setup()

    await failTimes(request, 10)

    expect(await request(customer_login, EMAIL, 200)).toMatchObject({
      action: "block",
    })
  })

  it("does not count blocked attempts and reports the remaining TTL", async () => {
    const { request, clock, store, limiter } = setup()

    await failTimes(request, 10)
    clock.advance(5 * 60 * 1000)

    expect(await request()).toEqual({ action: "block", retryAfterSeconds: 600 })
    clock.advance(9 * 60 * 1000 + 59_500)
    expect(await request()).toEqual({ action: "block", retryAfterSeconds: 1 })
    expect(store.entries.get(limiter.keyFor(customer_login, EMAIL))?.count).toBe(10)
  })

  it("starts a new window once the old one has expired", async () => {
    const { request, clock } = setup()

    await failTimes(request, 10)
    clock.advance(15 * 60 * 1000)

    await failTimes(request, 10)
    expect(await request()).toMatchObject({ action: "block" })
  })

  it("keeps a fixed window: failures late in the window do not extend it", async () => {
    const { request, clock } = setup()

    await failTimes(request, 1)
    clock.advance(14 * 60 * 1000)
    await failTimes(request, 9)

    expect(await request()).toEqual({ action: "block", retryAfterSeconds: 60 })
  })

  it("resets the counter after a successful login", async () => {
    const { request } = setup()

    await failTimes(request, 9)
    expect(await request(customer_login, EMAIL, 200)).toMatchObject({
      action: "allow",
    })

    await failTimes(request, 10)
    expect(await request()).toMatchObject({ action: "block" })
  })

  it("gives the attempt back for answers other than 2xx and 401", async () => {
    const { request } = setup()

    for (let i = 0; i < 20; i++) {
      expect(await request(customer_login, EMAIL, 500)).toMatchObject({
        action: "allow",
      })
    }

    await failTimes(request, 10)
    expect(await request()).toMatchObject({ action: "block" })
  })

  it("counts every registration attempt, successful or not", async () => {
    const { request } = setup()

    for (const status of [200, 401, 200, 401, 200]) {
      expect(await request(registration, EMAIL, status)).toMatchObject({
        action: "allow",
      })
    }

    expect(await request(registration, EMAIL, 200)).toEqual({
      action: "block",
      retryAfterSeconds: 3600,
    })
  })

  it("keeps rules and e-mails apart", async () => {
    const { request } = setup()

    await failTimes(request, 10)
    expect(await request()).toMatchObject({ action: "block" })

    expect(await request(customer_login, "bob@example.com")).toMatchObject({
      action: "allow",
    })
    expect(await request(admin_login)).toMatchObject({ action: "allow" })
    expect(await request(registration)).toMatchObject({ action: "allow" })
  })

  it("shares one counter between spellings of the same e-mail", async () => {
    const { request } = setup()

    await failTimes(request, 5, customer_login, "Ann@Example.com")
    await failTimes(request, 5, customer_login, "  ann@example.COM ")

    expect(await request(customer_login, "ann@example.com")).toMatchObject({
      action: "block",
    })
  })

  it("reserves attempts, so parallel requests cannot exceed the limit", async () => {
    const { limiter } = setup()

    const decisions = await Promise.all(
      Array.from({ length: 30 }, () => limiter.attempt(customer_login, EMAIL))
    )

    expect(decisions.filter((d) => d.action === "allow")).toHaveLength(10)
    expect(decisions.filter((d) => d.action === "block")).toHaveLength(20)
  })

  it("allows a missing or non-string e-mail without touching the store", async () => {
    const { limiter, store } = setup()

    for (const email of [undefined, "", 42, ["ann@example.com"]]) {
      expect(await limiter.attempt(customer_login, email)).toEqual({
        action: "allow",
        ticket: null,
      })
    }

    expect(store.calls).toBe(0)
  })

  describe("when the store fails", () => {
    it("fails open and logs a throttled warning without the e-mail", async () => {
      const { limiter, store, logger, clock } = setup()
      store.failWith = new Error("connect ECONNREFUSED 127.0.0.1:6379")

      for (let i = 0; i < 20; i++) {
        expect(await limiter.attempt(customer_login, EMAIL)).toEqual({
          action: "allow",
          ticket: null,
        })
      }

      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(logger.warn.mock.calls[0][0]).toMatch(/fail open/)
      expect(logger.warn.mock.calls[0][0]).toMatch(/ECONNREFUSED/)

      clock.advance(60_000)
      await limiter.attempt(customer_login, EMAIL)

      expect(logger.warn).toHaveBeenCalledTimes(2)
      expect(logger.warn.mock.calls[1][0]).toMatch(/19 similar warnings suppressed/)

      for (const [message] of logger.warn.mock.calls) {
        expect(message).not.toContain(EMAIL)
        expect(message).not.toContain(hashEmail(EMAIL, SECRET))
      }
    })

    it("does not throw when settling fails", async () => {
      const { limiter, store, logger } = setup()
      const decision = await limiter.attempt(customer_login, EMAIL)
      store.failWith = new Error("Command timed out")

      if (decision.action !== "allow" || !decision.ticket) {
        throw new Error("expected a ticket")
      }

      await expect(limiter.settle(decision.ticket, "success")).resolves.toBeUndefined()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/could not update the customer_login counter/)
      )
    })

    it("counts again once the store is back", async () => {
      const { request, store } = setup()
      store.failWith = new Error("down")

      await failTimes(request, 15)
      store.failWith = null

      await failTimes(request, 10)
      expect(await request()).toMatchObject({ action: "block" })
    })
  })
})
