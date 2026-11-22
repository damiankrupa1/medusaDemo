/// <reference types="jest" />

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInvitesWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

// The InPost provider refuses to start without credentials (see
// inpost-shipping-methods.spec.ts); nothing here reaches ShipX.
process.env.INPOST_API_TOKEN ??= "test-inpost-api-token"
process.env.INPOST_ORGANIZATION_ID ??= "test-inpost-organization-id"

const IDENTITY_EXISTS = {
  type: "unauthorized",
  message: "Identity with email already exists",
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let publishableKey: string

    // Created once - the runner snapshots the database after this hook and
    // restores it before every test.
    beforeAll(async () => {
      const container = getContainer()

      const {
        result: [salesChannel],
      } = await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData: [{ name: "Registration Test Channel" }] },
      })
      const {
        result: [apiKey],
      } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            { title: "Registration Test Key", type: "publishable", created_by: "" },
          ],
        },
      })
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: { id: apiKey.id, add: [salesChannel.id] },
      })
      publishableKey = apiKey.token
    })

    const post = (path: string, body: unknown, headers = {}) =>
      api
        .post(path, body, { headers })
        .catch((error) => error.response ?? Promise.reject(error))

    const register = (email: string, password: string, actor = "customer") =>
      post(`/auth/${actor}/emailpass/register`, { email, password })

    const login = (email: string, password: string, actor = "customer") =>
      post(`/auth/${actor}/emailpass`, { email, password })

    const createCustomer = (email: string, token: string) =>
      post(
        "/store/customers",
        { email },
        {
          authorization: `Bearer ${token}`,
          "x-publishable-api-key": publishableKey,
        }
      )

    const countIdentities = async (email: string) => {
      const auth = getContainer().resolve(Modules.AUTH)
      const identities = await auth.listProviderIdentities({
        provider: "emailpass",
        entity_id: email,
      })
      return identities.length
    }

    const expectPasswordUnchanged = async (
      email: string,
      ownPassword: string,
      otherPassword: string
    ) => {
      expect((await login(email, ownPassword)).status).toBe(200)
      expect((await login(email, otherPassword)).status).toBe(401)
    }

    describe("POST /auth/:actor_type/emailpass/register", () => {
      it("a new e-mail registers normally and can create its customer", async () => {
        const email = "new-shopper@example.com"

        const registered = await register(email, "first-password")
        expect(registered.status).toBe(200)
        expect(registered.data.token).toEqual(expect.any(String))

        const customer = await createCustomer(email, registered.data.token)
        expect(customer.status).toBe(200)
        expect(customer.data.customer.email).toBe(email)

        const signedIn = await login(email, "first-password")
        expect(signedIn.status).toBe(200)
        expect(signedIn.data.token).toEqual(expect.any(String))
      })

      it("registering an e-mail that has a customer is refused and keeps its password", async () => {
        const email = "with-customer@example.com"
        const { data } = await register(email, "owner-password")
        await createCustomer(email, data.token)

        for (const actor of ["customer", "user"]) {
          const again = await register(email, "other-password", actor)
          expect(again.status).toBe(401)
          expect(again.data).toEqual(IDENTITY_EXISTS)
        }

        await expectPasswordUnchanged(email, "owner-password", "other-password")
        expect(await countIdentities(email)).toBe(1)
      })

      it("registering an e-mail whose identity has no customer yet is refused and keeps its password", async () => {
        const email = "no-customer-yet@example.com"
        expect((await register(email, "owner-password")).status).toBe(200)

        for (const actor of ["customer", "user"]) {
          const again = await register(email, "other-password", actor)
          expect(again.status).toBe(401)
          expect(again.data).toEqual(IDENTITY_EXISTS)
        }

        await expectPasswordUnchanged(email, "owner-password", "other-password")

        // The owner signs in and finishes creating the customer.
        const { data } = await login(email, "owner-password")
        expect((await createCustomer(email, data.token)).status).toBe(200)
      })

      it("an e-mail differing only in letter case counts as the same e-mail", async () => {
        expect((await register("Mixed.Case@Example.com", "owner-password")).status).toBe(200)

        const again = await register("mixed.case@example.com", "other-password")
        expect(again.status).toBe(401)
        expect(again.data).toEqual(IDENTITY_EXISTS)

        await expectPasswordUnchanged(
          "Mixed.Case@Example.com",
          "owner-password",
          "other-password"
        )
        expect(await countIdentities("mixed.case@example.com")).toBe(0)
      })

      it("an urlencoded body and an encoded provider name are refused the same way", async () => {
        const email = "encoded@example.com"
        await register(email, "owner-password")

        const encodedProvider = await post(
          "/auth/customer/email%70ass/register",
          { email, password: "other-password" }
        )
        expect(encodedProvider.status).toBe(401)

        const urlencoded = await post(
          "/auth/customer/emailpass/register",
          new URLSearchParams({ email, password: "other-password" }).toString(),
          { "content-type": "application/x-www-form-urlencoded" }
        )
        expect(urlencoded.status).toBe(401)

        await expectPasswordUnchanged(email, "owner-password", "other-password")
      })

      it("concurrent registrations of one new e-mail: exactly one succeeds", async () => {
        const email = "concurrent@example.com"
        const passwords = ["p-1", "p-2", "p-3", "p-4", "p-5"]

        const results = await Promise.all(
          passwords.map((password) => register(email, password))
        )
        const statuses = results.map(({ status }) => status)

        expect(statuses.filter((status) => status === 200)).toHaveLength(1)
        expect(statuses.filter((status) => status === 401)).toHaveLength(4)
        expect(await countIdentities(email)).toBe(1)

        const winner = passwords[statuses.indexOf(200)]
        for (const password of passwords) {
          expect((await login(email, password)).status).toBe(
            password === winner ? 200 : 401
          )
        }
      })

      it("a refused or invalid registration leaves no identity behind", async () => {
        const invalid = await post("/auth/customer/emailpass/register", {
          email: "no-password@example.com",
        })
        expect(invalid.status).toBe(401)
        expect(await countIdentities("no-password@example.com")).toBe(0)
      })
    })

    describe("actor types (authMethodsPerActor)", () => {
      it.each(["anything", "Customer", "admin"])(
        "the %s actor type is refused for registration and sign-in",
        async (actor) => {
          const email = `actor-${actor.toLowerCase()}@example.com`

          const registered = await register(email, "password", actor)
          expect(registered.status).toBe(400)
          expect(registered.data).toEqual({
            type: "not_allowed",
            message: `The actor type ${actor} is not allowed to use the auth provider emailpass`,
          })
          expect(await countIdentities(email)).toBe(0)

          await register(email, "password")
          expect((await login(email, "password", actor)).status).toBe(400)
          expect((await login(email, "password")).status).toBe(200)
        }
      )

      it("an admin invite is accepted with a user registration", async () => {
        const container = getContainer()
        const {
          result: [invite],
        } = await createInvitesWorkflow(container).run({
          input: { invites: [{ email: "invited-admin@example.com" }] },
        })

        const registered = await register(
          "invited-admin@example.com",
          "admin-password",
          "user"
        )
        expect(registered.status).toBe(200)

        const accepted = await post(
          `/admin/invites/accept?token=${invite.token}`,
          { first_name: "Invited", last_name: "Admin" },
          { authorization: `Bearer ${registered.data.token}` }
        )
        expect(accepted.status).toBe(200)

        const signedIn = await login(
          "invited-admin@example.com",
          "admin-password",
          "user"
        )
        expect(signedIn.status).toBe(200)

        const me = await api.get("/admin/users/me", {
          headers: { authorization: `Bearer ${signedIn.data.token}` },
        })
        expect(me.data.user.email).toBe("invited-admin@example.com")
      })

      it("the admin login page's provider list and the token refresh still work", async () => {
        const providers = await api.get("/auth/user/providers")
        expect(providers.status).toBe(200)
        expect(providers.data.providers).toEqual([
          expect.objectContaining({ id: "emailpass" }),
        ])

        const email = "refresh@example.com"
        const { data } = await register(email, "password")
        await createCustomer(email, data.token)
        const signedIn = await login(email, "password")

        const refreshed = await post(
          "/auth/token/refresh",
          {},
          { authorization: `Bearer ${signedIn.data.token}` }
        )
        expect(refreshed.status).toBe(200)
        expect(refreshed.data.token).toEqual(expect.any(String))
      })
    })
  },
})
