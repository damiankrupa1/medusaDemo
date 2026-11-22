/// <reference types="jest" />

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { AUTH_METHODS_PER_ACTOR } from "../../../config/auth"
import { createActorTypeGuard } from "../actor-type-guard"

const run = (
  params: Record<string, string>,
  authMethods: Record<string, string[]> | null = AUTH_METHODS_PER_ACTOR
) => {
  const guard = createActorTypeGuard(() => authMethods ?? undefined)
  let passed: unknown = "next() was not called"

  guard({ params } as unknown as MedusaRequest, {} as MedusaResponse, (error?: unknown) => {
    passed = error
  })

  return passed
}

describe("AUTH_METHODS_PER_ACTOR", () => {
  it("allows only e-mail/password for customers and admin users", () => {
    expect(AUTH_METHODS_PER_ACTOR).toEqual({
      customer: ["emailpass"],
      user: ["emailpass"],
    })
  })
})

describe("createActorTypeGuard", () => {
  it.each(["customer", "user"])("lets the %s actor type through", (actorType) => {
    expect(run({ actor_type: actorType, auth_provider: "emailpass" })).toBeUndefined()
  })

  it.each(["anything", "Customer", "USER", "admin", "constructor", "__proto__"])(
    "refuses the %s actor type with Medusa's not-allowed error",
    (actorType) => {
      const error = run({ actor_type: actorType, auth_provider: "emailpass" })

      expect(error).toBeInstanceOf(MedusaError)
      expect((error as MedusaError).type).toBe(MedusaError.Types.NOT_ALLOWED)
      expect((error as MedusaError).message).toBe(
        `The actor type ${actorType} is not allowed to use the auth provider emailpass`
      )
    }
  )

  it.each([
    ["token", "refresh"],
    ["emailpass", "user"],
    ["mfa", "factors"],
    ["verification", "request"],
    ["anything", "providers"],
  ])(
    "leaves Medusa's fixed route /auth/%s/%s alone",
    (actorType, provider) => {
      expect(run({ actor_type: actorType, auth_provider: provider })).toBeUndefined()
    }
  )

  it("refuses nothing when authMethodsPerActor is not configured", () => {
    expect(
      run({ actor_type: "anything", auth_provider: "emailpass" }, null)
    ).toBeUndefined()
  })
})
