/// <reference types="jest" />

import Redis from "ioredis"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import {
  createCustomerAccountWorkflow,
  createUserAccountWorkflow,
} from "@medusajs/medusa/core-flows"

// Per-e-mail rate limit of password login and registration (#35). Needs the
// Redis of REDIS_URL (Medusa's event bus needs it anyway); the limiter's keys
// are deleted before every test, Redis is not flushed.

// The InPost provider refuses to start without credentials; nothing here
// calls ShipX (see inpost-shipping-methods.spec.ts).
process.env.INPOST_API_TOKEN ??= "test-inpost-api-token"
process.env.INPOST_ORGANIZATION_ID ??= "test-inpost-organization-id"

const PASSWORD = "correct-horse-battery"
const CUSTOMER_EMAIL = "rate-limit-customer@example.com"
const OTHER_CUSTOMER_EMAIL = "rate-limit-other@example.com"
const ADMIN_EMAIL = "rate-limit-admin@example.com"
const KEY_PATTERN = "auth-rate-limit:*"

const RATE_LIMITED_BODY = {
  type: "not_allowed",
  code: "rate_limited",
  message: "Too many attempts. Try again later.",
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let redis: Redis

    const post = (path: string, body: unknown) =>
      api.post(path, body, { validateStatus: () => true })

    const login = (email: unknown, password = "wrong-password", actor = "customer") =>
      post(`/auth/${actor}/emailpass`, { email, password })

    const failLogins = async (times: number, email: string, actor = "customer") => {
      for (let i = 0; i < times; i++) {
        const res = await login(email, "wrong-password", actor)
        expect(res.status).toBe(401)
      }
    }

    const expectRateLimited = (res: { status: number; headers: any; data: unknown }, maxSeconds: number) => {
      expect(res.status).toBe(429)
      expect(res.data).toEqual(RATE_LIMITED_BODY)
      const retryAfter = Number(res.headers["retry-after"])
      expect(Number.isInteger(retryAfter)).toBe(true)
      expect(retryAfter).toBeGreaterThan(0)
      expect(retryAfter).toBeLessThanOrEqual(maxSeconds)
    }

    const deleteLimiterKeys = async () => {
      const keys = await redis.keys(KEY_PATTERN)
      if (keys.length) {
        await redis.del(...keys)
      }
    }

    beforeAll(async () => {
      if (!process.env.REDIS_URL) {
        throw new Error("auth-rate-limit.spec.ts needs REDIS_URL")
      }

      redis = new Redis(process.env.REDIS_URL)

      const container = getContainer()
      const authModuleService = container.resolve(Modules.AUTH)

      for (const email of [CUSTOMER_EMAIL, OTHER_CUSTOMER_EMAIL]) {
        const { authIdentity } = await authModuleService.register("emailpass", {
          body: { email, password: PASSWORD },
        })
        await createCustomerAccountWorkflow(container).run({
          input: { authIdentityId: authIdentity!.id, customerData: { email } },
        })
      }

      const { authIdentity } = await authModuleService.register("emailpass", {
        body: { email: ADMIN_EMAIL, password: PASSWORD },
      })
      await createUserAccountWorkflow(container).run({
        input: { authIdentityId: authIdentity!.id, userData: { email: ADMIN_EMAIL } },
      })
    })

    beforeEach(deleteLimiterKeys)

    afterAll(async () => {
      await deleteLimiterKeys()
      redis?.disconnect()
    })

    it("answers the 11th failed customer login with 429, Retry-After and rate_limited", async () => {
      await failLogins(10, CUSTOMER_EMAIL)

      expectRateLimited(await login(CUSTOMER_EMAIL), 900)
      // Blocked means blocked: the correct password doesn't get through either.
      expectRateLimited(await login(CUSTOMER_EMAIL, PASSWORD), 900)
    })

    it("resets the counter after a successful login", async () => {
      await failLogins(9, CUSTOMER_EMAIL)

      const ok = await login(CUSTOMER_EMAIL, PASSWORD)
      expect(ok.status).toBe(200)
      expect(ok.data.token).toEqual(expect.any(String))

      await failLogins(10, CUSTOMER_EMAIL)
      expectRateLimited(await login(CUSTOMER_EMAIL), 900)
    })

    it("leaves another e-mail alone", async () => {
      await failLogins(10, CUSTOMER_EMAIL)
      expectRateLimited(await login(CUSTOMER_EMAIL), 900)

      expect((await login(OTHER_CUSTOMER_EMAIL)).status).toBe(401)
      expect((await login(OTHER_CUSTOMER_EMAIL, PASSWORD)).status).toBe(200)
    })

    it("limits the admin login separately, after 5 failures", async () => {
      await failLogins(5, ADMIN_EMAIL, "user")
      expectRateLimited(await login(ADMIN_EMAIL, "wrong-password", "user"), 900)
      expectRateLimited(await login(ADMIN_EMAIL, PASSWORD, "user"), 900)

      // The customer bucket of the same e-mail is a different counter.
      expect((await login(ADMIN_EMAIL, "wrong-password", "customer")).status).toBe(401)

      await deleteLimiterKeys()
      await failLogins(10, CUSTOMER_EMAIL)
      expectRateLimited(await login(CUSTOMER_EMAIL), 900)
      expect((await login(ADMIN_EMAIL, PASSWORD, "user")).status).toBe(200)
    })

    it("counts other spellings of the e-mail and of the route in the same bucket", async () => {
      await failLogins(4, "  Rate-Limit-Customer@Example.com ")
      await failLogins(3, CUSTOMER_EMAIL, "Customer")
      await failLogins(2, CUSTOMER_EMAIL, "any-actor")

      // GET runs the same handler and reads the body too.
      const viaGet = await api.request({
        method: "GET",
        url: "/auth/customer/emailpass",
        data: { email: CUSTOMER_EMAIL, password: "wrong-password" },
        validateStatus: () => true,
      })
      expect(viaGet.status).toBe(401)

      expectRateLimited(await login(CUSTOMER_EMAIL), 900)
      // Percent-encoded provider: Medusa decodes the param, and so do we.
      expectRateLimited(await post("/auth/customer/email%70ass", { email: CUSTOMER_EMAIL, password: "x" }), 900)
    })

    it("does not let parallel requests exceed the limit", async () => {
      const results = await Promise.all(
        Array.from({ length: 16 }, () => login(CUSTOMER_EMAIL))
      )
      const statuses = results.map((r) => r.status).sort()

      expect(statuses.filter((s) => s === 401)).toHaveLength(10)
      expect(statuses.filter((s) => s === 429)).toHaveLength(6)
    })

    it("limits registration to 5 attempts per e-mail and hour", async () => {
      const email = "rate-limit-new@example.com"
      const register = () =>
        post("/auth/customer/emailpass/register", { email, password: PASSWORD })

      // Not asserting 200 for the repeats: that Medusa re-registers an
      // identity without an actor is a separate issue.
      expect((await register()).status).toBe(200)
      for (let i = 0; i < 4; i++) {
        expect((await register()).status).not.toBe(429)
      }

      expectRateLimited(await register(), 3600)
      // Registration does not touch the login counter.
      expect((await login(email, PASSWORD)).status).toBe(200)
    })

    it("counts failed registrations too", async () => {
      const register = () =>
        post("/auth/customer/emailpass/register", { email: CUSTOMER_EMAIL, password: PASSWORD })

      for (let i = 0; i < 5; i++) {
        const res = await register()
        expect(res.status).toBe(401)
        expect(res.data.message).toBe("Identity with email already exists")
      }

      expectRateLimited(await register(), 3600)
    })

    it("leaves requests without an e-mail to Medusa", async () => {
      for (let i = 0; i < 12; i++) {
        expect((await post("/auth/customer/emailpass", { password: "x" })).status).toBe(401)
        expect((await login(["a@b.c"])).status).toBe(401)
      }
    })

    it("stores only hashed e-mails in Redis, with the window as TTL", async () => {
      await failLogins(3, CUSTOMER_EMAIL)

      const keys = await redis.keys(KEY_PATTERN)
      expect(keys).toHaveLength(1)
      expect(keys[0]).toMatch(/^auth-rate-limit:customer_login:[0-9a-f]{64}$/)
      expect(keys[0]).not.toContain("example")
      expect(await redis.get(keys[0])).toBe("3")

      const ttl = await redis.ttl(keys[0])
      expect(ttl).toBeGreaterThan(890)
      expect(ttl).toBeLessThanOrEqual(900)
    })
  },
})
