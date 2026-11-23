/// <reference types="jest" />

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

// With AUTH_RATE_LIMIT_ENABLED=false the limiter is off (#35). A Medusa
// without REDIS_URL can't be booted here (the event bus requires Redis), so
// the switch stands in for "no Redis": both take the same path
// (resolveAuthRateLimitSettings, unit tested). Set before the runner loads
// src/api/middlewares.ts, which reads it once.
const previous = process.env.AUTH_RATE_LIMIT_ENABLED
process.env.AUTH_RATE_LIMIT_ENABLED = "false"

process.env.INPOST_API_TOKEN ??= "test-inpost-api-token"
process.env.INPOST_ORGANIZATION_ID ??= "test-inpost-organization-id"

const EMAIL = "rate-limit-disabled@example.com"
const PASSWORD = "correct-horse-battery"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    beforeAll(async () => {
      await getContainer()
        .resolve(Modules.AUTH)
        .register("emailpass", { body: { email: EMAIL, password: PASSWORD } })
    })

    afterAll(() => {
      if (previous === undefined) {
        delete process.env.AUTH_RATE_LIMIT_ENABLED
      } else {
        process.env.AUTH_RATE_LIMIT_ENABLED = previous
      }
    })

    it("does not limit login or registration", async () => {
      for (let i = 0; i < 12; i++) {
        const res = await api.post(
          "/auth/customer/emailpass",
          { email: EMAIL, password: "wrong-password" },
          { validateStatus: () => true }
        )
        expect(res.status).toBe(401)
      }

      for (let i = 0; i < 7; i++) {
        const res = await api.post(
          "/auth/user/emailpass/register",
          { email: `rate-limit-disabled-${i % 2}@example.com`, password: PASSWORD },
          { validateStatus: () => true }
        )
        expect(res.status).not.toBe(429)
      }

      const ok = await api.post("/auth/customer/emailpass", {
        email: EMAIL,
        password: PASSWORD,
      })
      expect(ok.status).toBe(200)
    })
  },
})
