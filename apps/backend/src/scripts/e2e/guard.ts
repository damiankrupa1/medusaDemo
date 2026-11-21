/**
 * Safety guard of the e2e seed (docs/e2e.md). The seed writes regions, a
 * store setup and products, so it must never run against a real shop. It
 * refuses, with every reason at once, unless all of these hold:
 *
 * 1. `E2E_SEED=1` is set explicitly (the e2e launcher sets it);
 * 2. `NODE_ENV` is not `production`;
 * 3. `DATABASE_URL` points at a local host (or one listed in
 *    `E2E_SEED_ALLOWED_DB_HOSTS`), never at a known production host, and the
 *    database name contains `e2e`;
 * 4. `STRIPE_API_KEY` is not a live key;
 * 5. the database holds nothing but what this seed creates (checked after
 *    connecting, see `findForeignDataRefusals`).
 *
 * Pure functions, so they are unit tested without a database.
 */

export const DEFAULT_ALLOWED_DB_HOSTS = [
  "localhost",
  "127.0.0.1",
  "::1",
  // Hostname of the database service in docker compose / CI service containers
  "postgres",
] as const

/**
 * Substrings of hosts that always mean production, even when someone adds
 * them to E2E_SEED_ALLOWED_DB_HOSTS. Extend when a new deployment appears.
 */
export const PRODUCTION_HOST_MARKERS = [
  "railway",
  "rlwy.net",
  "medusademo-production",
] as const

type Env = Record<string, string | undefined>

function parseHostList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
}

function normalizeHost(hostname: string): string {
  // URL keeps the brackets of an IPv6 literal ("[::1]")
  return hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1")
}

/**
 * Checks a database URL. Shared rule of the seed and the e2e launcher
 * (`scripts/e2e-medusa.mjs` repeats it before running migrations).
 */
export function findDatabaseUrlRefusals(
  databaseUrl: string | undefined,
  allowedExtraHosts: string | undefined
): string[] {
  if (!databaseUrl) {
    return ["DATABASE_URL is not set."]
  }

  let url: URL
  try {
    url = new URL(databaseUrl)
  } catch {
    return ["DATABASE_URL is not a valid URL."]
  }

  const refusals: string[] = []
  const host = normalizeHost(url.hostname)
  const allowedHosts = [
    ...DEFAULT_ALLOWED_DB_HOSTS,
    ...parseHostList(allowedExtraHosts),
  ]

  const marker = PRODUCTION_HOST_MARKERS.find((value) =>
    databaseUrl.toLowerCase().includes(value)
  )
  if (marker) {
    refusals.push(
      `DATABASE_URL looks like a production database (contains "${marker}").`
    )
  }

  if (!allowedHosts.includes(host)) {
    refusals.push(
      `DATABASE_URL host "${host}" is not allowed. Allowed: ${allowedHosts.join(", ")} (extend with E2E_SEED_ALLOWED_DB_HOSTS for a dedicated e2e database).`
    )
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""))
  if (!databaseName.toLowerCase().includes("e2e")) {
    refusals.push(
      `Database name "${databaseName}" does not contain "e2e". The e2e seed only writes to a database created for it.`
    )
  }

  return refusals
}

/** Everything that can be decided from the environment alone. */
export function findEnvironmentRefusals(env: Env): string[] {
  const refusals: string[] = []

  if (env.E2E_SEED !== "1") {
    refusals.push(
      "E2E_SEED=1 is not set. Run the seed through `pnpm e2e:seed` (scripts/e2e-medusa.mjs)."
    )
  }

  if (env.NODE_ENV === "production") {
    refusals.push("NODE_ENV is production.")
  }

  refusals.push(
    ...findDatabaseUrlRefusals(env.DATABASE_URL, env.E2E_SEED_ALLOWED_DB_HOSTS)
  )

  if (/^(sk|rk)_live_/.test(env.STRIPE_API_KEY ?? "")) {
    refusals.push("STRIPE_API_KEY is a live Stripe key. Use an sk_test_ key or none.")
  }

  return refusals
}

export type DatabaseFacts = {
  /** Handles of the products in the database (at most a page of them). */
  productHandles: string[]
  /** Total number of products in the database. */
  productCount: number
  /** Names of the regions in the database. */
  regionNames: string[]
}

/**
 * A database the seed may write to contains nothing, or only what an earlier
 * run of this seed created. Anything else (the default demo seed, an imported
 * catalog, a real shop) makes it refuse.
 */
export function findForeignDataRefusals(
  facts: DatabaseFacts,
  known: { productHandles: readonly string[]; regionNames: readonly string[] }
): string[] {
  const refusals: string[] = []

  const foreignProducts = facts.productHandles.filter(
    (handle) => !known.productHandles.includes(handle)
  )
  if (
    facts.productCount > known.productHandles.length ||
    foreignProducts.length > 0
  ) {
    refusals.push(
      `The database has ${facts.productCount} product(s), not only the e2e ones${
        foreignProducts.length ? ` (e.g. ${foreignProducts.slice(0, 3).join(", ")})` : ""
      }.`
    )
  }

  const foreignRegions = facts.regionNames.filter(
    (name) => !known.regionNames.includes(name)
  )
  if (foreignRegions.length > 0) {
    refusals.push(
      `The database has regions the e2e seed does not create: ${foreignRegions.join(", ")}.`
    )
  }

  return refusals
}

export function formatRefusals(refusals: string[]): string {
  return [
    "Refusing to run the e2e seed (it only runs against an empty, throwaway e2e database):",
    ...refusals.map((refusal) => `- ${refusal}`),
    "If the database came from `medusa db:migrate` without --skip-scripts, the default demo seed ran: drop it and use `pnpm e2e:setup`.",
  ].join("\n")
}
