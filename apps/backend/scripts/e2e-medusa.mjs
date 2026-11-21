#!/usr/bin/env node
// Runs the Medusa CLI for the storefront's e2e environment (docs/e2e.md):
//
//   node scripts/e2e-medusa.mjs migrate   medusa db:migrate --skip-scripts
//   node scripts/e2e-medusa.mjs seed      medusa exec ./src/scripts/e2e-seed.ts
//   node scripts/e2e-medusa.mjs setup     migrate, then seed
//   node scripts/e2e-medusa.mjs start     medusa start (long-running)
//
// It sets every variable medusa-config.ts reads, so neither apps/backend/.env
// nor variables exported in the shell (a dev database, S3, Stripe, Payload)
// can leak into the e2e Medusa: `loadEnv()` never overrides a variable that
// is already set, even to an empty string. Only these E2E_* variables change
// it (all optional):
//
//   E2E_DATABASE_URL          default postgres://medusa_e2e:medusa_e2e@127.0.0.1:55432/medusa_e2e
//   E2E_REDIS_URL             default redis://127.0.0.1:56379
//   E2E_MEDUSA_PORT           default 9100
//   E2E_STOREFRONT_ORIGINS    comma-separated, default http://127.0.0.1:3100,http://localhost:3100
//   E2E_STRIPE_SECRET_KEY     sk_test_... only; without it Stripe is registered but unused
//   E2E_SEED_ALLOWED_DB_HOSTS extra database hosts besides localhost/127.0.0.1/::1/postgres
//   E2E_SEED_OUTPUT_FILE      the seed appends E2E_MEDUSA_BACKEND_URL / _PUBLISHABLE_KEY here
//
// Never point it at production data.

import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const medusaCli = resolve(backendDir, "node_modules/@medusajs/cli/cli.js")

// Same rule as findDatabaseUrlRefusals() in src/scripts/e2e/guard.ts, checked
// here too so migrations never run against a non-e2e database.
const DEFAULT_ALLOWED_DB_HOSTS = ["localhost", "127.0.0.1", "::1", "postgres"]
const PRODUCTION_HOST_MARKERS = ["railway", "rlwy.net", "medusademo-production"]

export function findUnsafeE2eSettings(env) {
  const problems = []
  let url
  try {
    url = new URL(env.DATABASE_URL)
  } catch {
    return ["E2E_DATABASE_URL is not a valid URL."]
  }

  const host = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1")
  const allowed = [
    ...DEFAULT_ALLOWED_DB_HOSTS,
    ...(env.E2E_SEED_ALLOWED_DB_HOSTS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  ]
  const marker = PRODUCTION_HOST_MARKERS.find((value) =>
    env.DATABASE_URL.toLowerCase().includes(value)
  )

  if (marker) problems.push(`The database URL contains "${marker}" (production).`)
  if (!allowed.includes(host)) problems.push(`Database host "${host}" is not allowed (${allowed.join(", ")}).`)
  if (!url.pathname.toLowerCase().includes("e2e")) {
    problems.push(`Database name "${url.pathname.slice(1)}" does not contain "e2e".`)
  }
  if (env.STRIPE_API_KEY && !env.STRIPE_API_KEY.startsWith("sk_test_")) {
    problems.push("E2E_STRIPE_SECRET_KEY must be a Stripe test key (sk_test_...).")
  }

  return problems
}

export function buildE2eEnv(ambient = process.env) {
  const port = ambient.E2E_MEDUSA_PORT || "9100"
  const backendUrl = `http://127.0.0.1:${port}`
  const storefrontOrigins =
    ambient.E2E_STOREFRONT_ORIGINS || "http://127.0.0.1:3100,http://localhost:3100"
  const backendOrigins = `${backendUrl},http://localhost:${port}`

  return {
    // Not production: the seed refuses it, and Medusa would mark cookies Secure
    NODE_ENV: "development",
    E2E_SEED: "1",
    E2E_SEED_ALLOWED_DB_HOSTS: ambient.E2E_SEED_ALLOWED_DB_HOSTS || "",
    MEDUSA_DISABLE_TELEMETRY: "true",

    DATABASE_URL:
      ambient.E2E_DATABASE_URL ||
      "postgres://medusa_e2e:medusa_e2e@127.0.0.1:55432/medusa_e2e",
    REDIS_URL: ambient.E2E_REDIS_URL || "redis://127.0.0.1:56379",
    WORKER_MODE: "shared",

    HOST: "127.0.0.1",
    PORT: port,
    BACKEND_PUBLIC_URL: backendUrl,
    RAILWAY_PUBLIC_DOMAIN: "",
    // The admin is not needed by the storefront suite and would need a build
    ADMIN_DISABLED: "true",

    STORE_CORS: storefrontOrigins,
    AUTH_CORS: `${storefrontOrigins},${backendOrigins}`,
    ADMIN_CORS: backendOrigins,

    // Throwaway per process; nothing signed by this Medusa outlives the run
    JWT_SECRET: randomBytes(32).toString("hex"),
    COOKIE_SECRET: randomBytes(32).toString("hex"),

    // The Stripe provider is always registered (medusa-config.ts) and only
    // needs the option to be defined. Empty = no Stripe calls possible.
    STRIPE_API_KEY: ambient.E2E_STRIPE_SECRET_KEY || "",
    // The InPost provider refuses to boot without both options. These are
    // placeholders, not credentials: nothing in the e2e suite calls ShipX
    // (that happens on fulfillment, which the storefront never triggers).
    INPOST_API_TOKEN: "e2e-placeholder-not-a-token",
    INPOST_ORGANIZATION_ID: "e2e-placeholder",
    // Pinned so a shell-exported INPOST_SANDBOX=false can't reach the live API.
    INPOST_SANDBOX: "true",

    // Local file storage, no bucket
    S3_FILE_URL: "",
    S3_ACCESS_KEY_ID: "",
    S3_SECRET_ACCESS_KEY: "",
    S3_BUCKET: "",
    S3_ENDPOINT: "",
    S3_REGION: "",
    S3_ACL: "",
    S3_FORCE_PATH_STYLE: "",

    // Payload SSO off
    PAYLOAD_PUBLIC_URL: "",
    PAYLOAD_SSO_SECRET: "",
  }
}

const COMMANDS = {
  migrate: [["db:migrate", "--skip-scripts"]],
  seed: [["exec", "./src/scripts/e2e-seed.ts"]],
  setup: [["db:migrate", "--skip-scripts"], ["exec", "./src/scripts/e2e-seed.ts"]],
  start: [["start"]],
}

function run(args, env) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [medusaCli, ...args], {
      cwd: backendDir,
      env,
      stdio: "inherit",
    })
    const forward = (signal) => child.kill(signal)
    process.on("SIGINT", forward)
    process.on("SIGTERM", forward)
    child.on("close", (code, signal) => {
      process.off("SIGINT", forward)
      process.off("SIGTERM", forward)
      resolvePromise(code ?? (signal ? 1 : 0))
    })
  })
}

async function main() {
  const command = process.argv[2]
  const steps = COMMANDS[command]
  if (!steps) {
    console.error(`Usage: node scripts/e2e-medusa.mjs <${Object.keys(COMMANDS).join("|")}>`)
    process.exit(2)
  }

  const e2eEnv = buildE2eEnv(process.env)
  const problems = findUnsafeE2eSettings(e2eEnv)
  if (problems.length > 0) {
    console.error(`Refusing to run the e2e Medusa:\n${problems.map((p) => `- ${p}`).join("\n")}`)
    process.exit(1)
  }

  for (const args of steps) {
    const code = await run(args, { ...process.env, ...e2eEnv })
    if (code !== 0) process.exit(code)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
