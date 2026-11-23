/// <reference types="jest" />

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"
import listOrphanIdentities from "../../src/scripts/list-orphan-identities"

// The InPost provider refuses to start without credentials (see
// inpost-shipping-methods.spec.ts); nothing here reaches ShipX.
process.env.INPOST_API_TOKEN ??= "test-inpost-api-token"
process.env.INPOST_ORGANIZATION_ID ??= "test-inpost-organization-id"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let publishableKey: string

    beforeAll(async () => {
      const container = getContainer()
      const {
        result: [salesChannel],
      } = await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData: [{ name: "Orphan Test Channel" }] },
      })
      const {
        result: [apiKey],
      } = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            { title: "Orphan Test Key", type: "publishable", created_by: "" },
          ],
        },
      })
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: { id: apiKey.id, add: [salesChannel.id] },
      })
      publishableKey = apiKey.token
    })

    const register = async (email: string) => {
      const { data } = await api.post("/auth/customer/emailpass/register", {
        email,
        password: "password",
      })
      return data.token as string
    }

    const identityId = async (email: string) => {
      const auth = getContainer().resolve(Modules.AUTH)
      const [providerIdentity] = await auth.listProviderIdentities(
        { provider: "emailpass", entity_id: email },
        { select: ["id", "auth_identity_id"] }
      )
      return providerIdentity?.auth_identity_id
    }

    const backdate = async (email: string, hours: number) => {
      const pg = getContainer().resolve(ContainerRegistrationKeys.PG_CONNECTION)
      await pg("auth_identity")
        .where({ id: await identityId(email) })
        .update({
          created_at: new Date(Date.now() - hours * 60 * 60 * 1000),
        })
    }

    const run = (args: string[]) =>
      listOrphanIdentities({ container: getContainer(), args })

    // old-orphan: no customer, 48 h old; young-orphan: no customer, 2 h old;
    // old-customer: has a customer, 48 h old.
    const setUp = async () => {
      await register("old-orphan@example.com")
      await register("young-orphan@example.com")
      const token = await register("old-customer@example.com")
      await api.post(
        "/store/customers",
        { email: "old-customer@example.com" },
        {
          headers: {
            authorization: `Bearer ${token}`,
            "x-publishable-api-key": publishableKey,
          },
        }
      )
      await backdate("old-orphan@example.com", 48)
      await backdate("young-orphan@example.com", 2)
      await backdate("old-customer@example.com", 48)
    }

    it("the dry run lists only old identities without an actor and changes nothing", async () => {
      await setUp()
      const oldOrphan = await identityId("old-orphan@example.com")

      const report = await run([])

      expect(report).toEqual({
        apply: false,
        olderThanHours: 24,
        found: [oldOrphan],
        deleted: [],
      })
      expect(await identityId("old-orphan@example.com")).toBe(oldOrphan)
      expect(await identityId("young-orphan@example.com")).toBeDefined()
    })

    it("apply deletes only old identities without an actor", async () => {
      await setUp()
      const oldOrphan = await identityId("old-orphan@example.com")

      const report = await run(["apply"])

      expect(report.deleted).toEqual([oldOrphan])
      expect(await identityId("old-orphan@example.com")).toBeUndefined()
      expect(await identityId("young-orphan@example.com")).toBeDefined()
      expect(await identityId("old-customer@example.com")).toBeDefined()

      // The customer's owner still signs in.
      const signedIn = await api.post("/auth/customer/emailpass", {
        email: "old-customer@example.com",
        password: "password",
      })
      expect(signedIn.status).toBe(200)

      // The freed e-mail can be registered again.
      expect(await register("old-orphan@example.com")).toEqual(expect.any(String))
    })

    it("the threshold is a parameter", async () => {
      await setUp()

      const report = await run(["older-than-hours=1"])

      expect(report.found).toHaveLength(2)
      expect(report.deleted).toEqual([])
    })
  },
})
