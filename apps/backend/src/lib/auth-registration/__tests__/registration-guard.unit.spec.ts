/// <reference types="jest" />

import { EventEmitter } from "node:events"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  IDENTITY_EXISTS_MESSAGE,
  createRegistrationGuard,
  toExactIlikePattern,
} from "../registration-guard"

type StoredIdentity = {
  id: string
  entity_id: string
  provider: string
  app_metadata: Record<string, unknown> | null
}

const unescapeIlike = (pattern: string) => pattern.replace(/\\([\\%_])/g, "$1")

/**
 * The auth module, reduced to what the guard uses. Like Postgres, an exact
 * `entity_id` is case-sensitive, `$ilike` is not, and (`entity_id`,
 * `provider`) is unique. Every call yields once, so concurrent requests
 * interleave.
 */
function fakeAuthModule(initial: StoredIdentity[] = []) {
  const identities = [...initial]
  let nextId = 1
  const tick = () => new Promise((resolve) => setImmediate(resolve))

  const matches = (
    identity: StoredIdentity,
    filter: { provider: string; entity_id: string | { $ilike: string } }
  ) =>
    identity.provider === filter.provider &&
    (typeof filter.entity_id === "string"
      ? identity.entity_id === filter.entity_id
      : identity.entity_id.toLowerCase() ===
        unescapeIlike(filter.entity_id.$ilike).toLowerCase())

  const module = {
    identities,
    listProviderIdentities: jest.fn(async (filter: any) => {
      await tick()
      return identities.filter((identity) => matches(identity, filter))
    }),
    createAuthIdentities: jest.fn(async (data: any) => {
      await tick()
      const [providerIdentity] = data.provider_identities

      if (
        identities.some(
          (identity) =>
            identity.entity_id === providerIdentity.entity_id &&
            identity.provider === providerIdentity.provider
        )
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Provider identity with entity_id, provider already exists."
        )
      }

      const created = {
        id: `authid_${nextId++}`,
        entity_id: providerIdentity.entity_id,
        provider: providerIdentity.provider,
        app_metadata: null,
      }
      identities.push(created)

      return { id: created.id }
    }),
    retrieveAuthIdentity: jest.fn(async (id: string) => {
      await tick()
      return identities.find((identity) => identity.id === id)!
    }),
    deleteAuthIdentities: jest.fn(async (ids: string[]) => {
      await tick()
      for (const id of ids) {
        identities.splice(
          identities.findIndex((identity) => identity.id === id),
          1
        )
      }
    }),
  }

  return module
}

const logger = { warn: jest.fn() }

function request(
  body: unknown,
  params: Record<string, string> = {
    actor_type: "customer",
    auth_provider: "emailpass",
  }
) {
  return {
    body,
    params,
    scope: { resolve: () => logger },
  } as unknown as MedusaRequest
}

function response() {
  const res = new EventEmitter() as EventEmitter & { statusCode: number }
  res.statusCode = 200
  return res as unknown as MedusaResponse & { statusCode: number }
}

async function run(
  guard: ReturnType<typeof createRegistrationGuard>,
  req: MedusaRequest,
  res = response()
) {
  let passedError: unknown = "next() was not called"
  const next: MedusaNextFunction = (error?: unknown) => {
    passedError = error
  }

  await guard(req, res, next)

  return { error: passedError, res }
}

const existing = (
  entity_id: string,
  app_metadata: StoredIdentity["app_metadata"]
): StoredIdentity => ({
  id: `authid_existing_${entity_id}`,
  entity_id,
  provider: "emailpass",
  app_metadata,
})

const expectRefused = (error: unknown) => {
  expect(error).toBeInstanceOf(MedusaError)
  expect((error as MedusaError).type).toBe(MedusaError.Types.UNAUTHORIZED)
  expect((error as MedusaError).message).toBe(IDENTITY_EXISTS_MESSAGE)
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 5))

describe("createRegistrationGuard", () => {
  it("lets a new e-mail register and reserves its identity first", async () => {
    const auth = fakeAuthModule()
    const guard = createRegistrationGuard(() => auth)

    const { error } = await run(
      guard,
      request({ email: "new@example.com", password: "secret" })
    )

    expect(error).toBeUndefined()
    expect(auth.identities).toEqual([
      expect.objectContaining({
        entity_id: "new@example.com",
        provider: "emailpass",
        app_metadata: null,
      }),
    ])
  })

  it.each([
    ["with a customer", { customer_id: "cus_1" }],
    ["without an actor", null],
    ["with an empty app_metadata", {}],
  ])(
    "refuses registering an e-mail whose identity exists %s",
    async (_label, appMetadata) => {
      const auth = fakeAuthModule([existing("taken@example.com", appMetadata)])
      const guard = createRegistrationGuard(() => auth)

      const { error } = await run(
        guard,
        request({ email: "taken@example.com", password: "other" })
      )

      expectRefused(error)
      expect(auth.createAuthIdentities).not.toHaveBeenCalled()
      expect(auth.identities).toHaveLength(1)
    }
  )

  it.each(["customer", "user", "anything", "Customer"])(
    "refuses an existing e-mail for the %s actor type",
    async (actorType) => {
      const auth = fakeAuthModule([existing("taken@example.com", null)])
      const guard = createRegistrationGuard(() => auth)

      const { error } = await run(
        guard,
        request(
          { email: "taken@example.com", password: "other" },
          { actor_type: actorType, auth_provider: "emailpass" }
        )
      )

      expectRefused(error)
    }
  )

  it("treats different letter case as the same e-mail", async () => {
    const auth = fakeAuthModule([existing("Ann.Smith@Example.com", null)])
    const guard = createRegistrationGuard(() => auth)

    const { error } = await run(
      guard,
      request({ email: "ann.smith@example.COM", password: "other" })
    )

    expectRefused(error)
  })

  it("does not treat LIKE wildcards in the e-mail as wildcards", async () => {
    const auth = fakeAuthModule([existing("ann_x@example.com", null)])
    const guard = createRegistrationGuard(() => auth)

    expect(toExactIlikePattern("a%b_c\\d")).toBe("a\\%b\\_c\\\\d")

    const { error } = await run(
      guard,
      request({ email: "ann%@example.com", password: "secret" })
    )

    expect(error).toBeUndefined()
  })

  it("lets only one of concurrent registrations of a new e-mail through", async () => {
    const auth = fakeAuthModule()
    const guard = createRegistrationGuard(() => auth)

    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((i) =>
        run(guard, request({ email: "race@example.com", password: `p${i}` }))
      )
    )

    const passed = results.filter(({ error }) => error === undefined)
    const refused = results.filter(({ error }) => error !== undefined)

    expect(passed).toHaveLength(1)
    expect(refused).toHaveLength(4)
    refused.forEach(({ error }) => expectRefused(error))
    expect(auth.identities).toHaveLength(1)
  })

  it("passes on other errors of the identity creation", async () => {
    const auth = fakeAuthModule()
    auth.createAuthIdentities.mockRejectedValueOnce(new Error("db down"))
    const guard = createRegistrationGuard(() => auth)

    const { error } = await run(
      guard,
      request({ email: "new@example.com", password: "secret" })
    )

    expect((error as Error).message).toBe("db down")
  })

  it("removes the reserved identity when the registration does not succeed", async () => {
    const auth = fakeAuthModule()
    const guard = createRegistrationGuard(() => auth)

    const { res } = await run(
      guard,
      request({ email: "new@example.com", password: "secret" })
    )
    res.statusCode = 401
    res.emit("finish")
    await flush()

    expect(auth.deleteAuthIdentities).toHaveBeenCalledTimes(1)
    expect(auth.identities).toHaveLength(0)
  })

  it("keeps the identity when the registration succeeds", async () => {
    const auth = fakeAuthModule()
    const guard = createRegistrationGuard(() => auth)

    const { res } = await run(
      guard,
      request({ email: "new@example.com", password: "secret" })
    )
    res.emit("finish")
    await flush()

    expect(auth.deleteAuthIdentities).not.toHaveBeenCalled()
    expect(auth.identities).toHaveLength(1)
  })

  it("keeps a reserved identity that got an actor in the meantime", async () => {
    const auth = fakeAuthModule()
    const guard = createRegistrationGuard(() => auth)

    const { res } = await run(
      guard,
      request({ email: "new@example.com", password: "secret" })
    )
    auth.identities[0].app_metadata = { customer_id: "cus_1" }
    res.statusCode = 500
    res.emit("finish")
    await flush()

    expect(auth.deleteAuthIdentities).not.toHaveBeenCalled()
  })

  it.each([
    ["another provider", { email: "a@example.com", password: "x" }, "google"],
    ["a missing e-mail", { password: "x" }, "emailpass"],
    ["a non-string password", { email: "a@example.com", password: 1 }, "emailpass"],
    ["no body", undefined, "emailpass"],
  ])("leaves %s to Medusa", async (_label, body, provider) => {
    const auth = fakeAuthModule()
    const guard = createRegistrationGuard(() => auth)

    const { error } = await run(
      guard,
      request(body, { actor_type: "customer", auth_provider: provider })
    )

    expect(error).toBeUndefined()
    expect(auth.listProviderIdentities).not.toHaveBeenCalled()
    expect(auth.createAuthIdentities).not.toHaveBeenCalled()
  })
})
