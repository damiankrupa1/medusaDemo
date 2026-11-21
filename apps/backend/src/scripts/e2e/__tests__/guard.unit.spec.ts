import {
  findDatabaseUrlRefusals,
  findEnvironmentRefusals,
  findForeignDataRefusals,
} from "../guard"
import { E2E_PRODUCT_HANDLES, E2E_REGION_NAMES } from "../data"

const E2E_DB = "postgres://medusa_e2e:medusa_e2e@127.0.0.1:55432/medusa_e2e"

const safeEnv = {
  E2E_SEED: "1",
  NODE_ENV: "development",
  DATABASE_URL: E2E_DB,
  STRIPE_API_KEY: "",
}

describe("findEnvironmentRefusals", () => {
  it("accepts the e2e launcher's environment", () => {
    expect(findEnvironmentRefusals(safeEnv)).toEqual([])
  })

  it("requires an explicit E2E_SEED=1", () => {
    expect(findEnvironmentRefusals({ ...safeEnv, E2E_SEED: undefined })).toEqual([
      expect.stringContaining("E2E_SEED=1"),
    ])
    expect(findEnvironmentRefusals({ ...safeEnv, E2E_SEED: "true" })).toHaveLength(1)
  })

  it("refuses NODE_ENV=production", () => {
    expect(findEnvironmentRefusals({ ...safeEnv, NODE_ENV: "production" })).toEqual([
      "NODE_ENV is production.",
    ])
  })

  it.each(["sk_live_123", "rk_live_123"])("refuses a live Stripe key (%s)", (key) => {
    expect(findEnvironmentRefusals({ ...safeEnv, STRIPE_API_KEY: key })).toEqual([
      expect.stringContaining("live Stripe key"),
    ])
  })

  it("accepts a Stripe test key", () => {
    expect(
      findEnvironmentRefusals({ ...safeEnv, STRIPE_API_KEY: "sk_test_123" })
    ).toEqual([])
  })

  it("lists every reason at once", () => {
    expect(
      findEnvironmentRefusals({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://u:p@db.example.com/shop",
      })
    ).toHaveLength(4)
  })
})

describe("findDatabaseUrlRefusals", () => {
  it.each([
    "postgres://u:p@localhost:5432/medusa_e2e",
    "postgres://u:p@127.0.0.1/e2e",
    "postgres://u:p@[::1]:5432/shop_e2e",
    "postgres://u:p@postgres:5432/medusa_e2e",
    "postgresql://u:p@LOCALHOST/Medusa_E2E?sslmode=disable",
  ])("accepts a local e2e database (%s)", (url) => {
    expect(findDatabaseUrlRefusals(url, undefined)).toEqual([])
  })

  it("refuses a missing or invalid URL", () => {
    expect(findDatabaseUrlRefusals(undefined, undefined)).toEqual([
      "DATABASE_URL is not set.",
    ])
    expect(findDatabaseUrlRefusals("not a url", undefined)).toEqual([
      "DATABASE_URL is not a valid URL.",
    ])
  })

  it("refuses a database whose name does not contain e2e", () => {
    // The regular dev database of docker-compose.yml
    expect(
      findDatabaseUrlRefusals("postgres://medusa:medusa@localhost:5432/medusa", undefined)
    ).toEqual([expect.stringContaining('does not contain "e2e"')])
  })

  it("refuses a remote host unless it is allow-listed", () => {
    const url = "postgres://u:p@e2e-db.internal:5432/medusa_e2e"

    expect(findDatabaseUrlRefusals(url, undefined)).toEqual([
      expect.stringContaining('host "e2e-db.internal" is not allowed'),
    ])
    expect(findDatabaseUrlRefusals(url, " other.host , E2E-DB.internal")).toEqual([])
  })

  it.each([
    "postgres://u:p@shinkansen.proxy.rlwy.net:12345/railway_e2e",
    "postgres://u:p@postgres.railway.internal:5432/medusa_e2e",
  ])("refuses production hosts even when allow-listed (%s)", (url) => {
    const host = new URL(url).hostname

    expect(findDatabaseUrlRefusals(url, host)).toEqual([
      expect.stringContaining("looks like a production database"),
    ])
  })
})

describe("findForeignDataRefusals", () => {
  const known = { productHandles: E2E_PRODUCT_HANDLES, regionNames: E2E_REGION_NAMES }

  it("accepts an empty database", () => {
    expect(
      findForeignDataRefusals({ productHandles: [], productCount: 0, regionNames: [] }, known)
    ).toEqual([])
  })

  it("accepts a database seeded by an earlier run", () => {
    expect(
      findForeignDataRefusals(
        {
          productHandles: [...E2E_PRODUCT_HANDLES],
          productCount: E2E_PRODUCT_HANDLES.length,
          regionNames: [...E2E_REGION_NAMES],
        },
        known
      )
    ).toEqual([])
  })

  it("refuses the default demo seed (initial-data-seed.ts)", () => {
    expect(
      findForeignDataRefusals(
        {
          productHandles: ["t-shirt", "sweatshirt", "sweatpants", "shorts"],
          productCount: 4,
          regionNames: ["Europe"],
        },
        known
      )
    ).toEqual([
      expect.stringContaining("4 product(s), not only the e2e ones (e.g. t-shirt"),
      "The database has regions the e2e seed does not create: Europe.",
    ])
  })

  it("refuses more products than the seed creates, even beyond the first page", () => {
    expect(
      findForeignDataRefusals(
        { productHandles: [...E2E_PRODUCT_HANDLES], productCount: 1000, regionNames: [] },
        known
      )
    ).toEqual([expect.stringContaining("1000 product(s)")])
  })
})
