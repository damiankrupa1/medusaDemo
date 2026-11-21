/// <reference types="jest" />

import { EventEmitter } from "node:events"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AuthRateLimiter, RATE_LIMITED_RESPONSE } from "../limiter"
import { createAuthRateLimitMiddleware } from "../middleware"
import { MemoryRateLimitStore } from "./memory-store"

const EMAIL = "ann@example.com"

class FakeResponse extends EventEmitter {
  statusCode = 200
  headers: Record<string, string> = {}
  body: unknown

  setHeader(name: string, value: string) {
    this.headers[name] = value
  }

  status(code: number) {
    this.statusCode = code
    return this
  }

  json(body: unknown) {
    this.body = body
    this.emit("finish")
    return this
  }
}

const setup = (limiterEnabled = true) => {
  const store = new MemoryRateLimitStore(Date.now)
  const limiter = new AuthRateLimiter({
    store,
    secret: "test-secret",
    logger: { warn: jest.fn() },
  })
  const login = createAuthRateLimitMiddleware("login", () =>
    limiterEnabled ? limiter : null
  )
  const register = createAuthRateLimitMiddleware("register", () =>
    limiterEnabled ? limiter : null
  )

  /** Runs the middleware; when it calls next(), Medusa "answers" `status`. */
  const send = async (
    middleware = login,
    { params = { actor_type: "customer", auth_provider: "emailpass" }, body = { email: EMAIL, password: "x" } as unknown, status = 401 } = {}
  ) => {
    const req = { params, body } as unknown as MedusaRequest
    const res = new FakeResponse()
    const next = jest.fn()

    await middleware(req, res as unknown as MedusaResponse, next)

    if (next.mock.calls.length) {
      res.status(status).json({})
    }

    // Let the settle triggered by `finish` reach the store.
    await new Promise((resolve) => setTimeout(resolve, 5))

    return { res, next }
  }

  return { store, login, register, send }
}

describe("createAuthRateLimitMiddleware", () => {
  it("answers the 11th failed login with 429, Retry-After and the rate_limited code", async () => {
    const { send } = setup()

    for (let i = 0; i < 10; i++) {
      expect((await send()).next).toHaveBeenCalledTimes(1)
    }

    const { res, next } = await send()

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(429)
    expect(res.headers["Retry-After"]).toMatch(/^\d+$/)
    expect(Number(res.headers["Retry-After"])).toBeGreaterThan(890)
    expect(Number(res.headers["Retry-After"])).toBeLessThanOrEqual(900)
    expect(res.body).toEqual(RATE_LIMITED_RESPONSE)
    expect(JSON.stringify(res.body)).not.toContain(EMAIL)
  })

  it("resets after a 200 and gives back a 500", async () => {
    const { send, store } = setup()

    for (let i = 0; i < 9; i++) {
      await send()
    }
    expect([...store.entries.values()][0].count).toBe(9)

    await send(undefined, { status: 200 })
    expect(store.entries.size).toBe(0)

    await send(undefined, { status: 500 })
    expect(store.entries.size).toBe(0)
  })

  it("counts successful registrations", async () => {
    const { send, register } = setup()

    for (let i = 0; i < 5; i++) {
      expect((await send(register, { status: 200 })).next).toHaveBeenCalled()
    }

    expect((await send(register, { status: 200 })).res.statusCode).toBe(429)
  })

  it.each([
    { params: { actor_type: "customer", auth_provider: "google" } },
    { body: {} },
    { body: { email: "" } },
    { body: { email: ["a@b.c"] } },
    { body: null },
    { body: "email=ann@example.com" },
  ])("passes %p through without counting", async (options) => {
    const { send, store } = setup()

    for (let i = 0; i < 12; i++) {
      expect((await send(undefined, options)).next).toHaveBeenCalled()
    }

    expect(store.calls).toBe(0)
  })

  it("passes everything through when the limiter is off", async () => {
    const { send, store } = setup(false)

    for (let i = 0; i < 12; i++) {
      expect((await send()).next).toHaveBeenCalled()
    }

    expect(store.calls).toBe(0)
  })
})
