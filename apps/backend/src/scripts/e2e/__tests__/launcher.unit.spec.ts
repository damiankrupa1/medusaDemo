import { execFileSync } from "node:child_process"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

// scripts/e2e-medusa.mjs is a plain Node ES module (it runs before anything is
// compiled). Jest's CommonJS runtime cannot import it, so each call runs in a
// real Node process and returns JSON.
type Env = Record<string, string | undefined>

const launcherUrl = pathToFileURL(
  resolve(__dirname, "../../../../scripts/e2e-medusa.mjs")
).href

function callLauncher<T>(name: string, arg: Env): T {
  const script = `import * as launcher from ${JSON.stringify(launcherUrl)}
process.stdout.write(JSON.stringify(launcher[${JSON.stringify(name)}](${JSON.stringify(arg)})))`

  return JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
    })
  )
}

const launcher = {
  buildE2eEnv: (ambient: Env) => callLauncher<Record<string, string>>("buildE2eEnv", ambient),
  findUnsafeE2eSettings: (env: Env) => callLauncher<string[]>("findUnsafeE2eSettings", env),
}

describe("scripts/e2e-medusa.mjs", () => {
  it("uses the local e2e stack by default", () => {
    const env = launcher.buildE2eEnv({})

    expect(env).toMatchObject({
      NODE_ENV: "development",
      E2E_SEED: "1",
      DATABASE_URL: "postgres://medusa_e2e:medusa_e2e@127.0.0.1:55432/medusa_e2e",
      REDIS_URL: "redis://127.0.0.1:56379",
      PORT: "9100",
      BACKEND_PUBLIC_URL: "http://127.0.0.1:9100",
      STORE_CORS: "http://127.0.0.1:3100,http://localhost:3100",
      ADMIN_DISABLED: "true",
      STRIPE_API_KEY: "",
    })
    expect(launcher.findUnsafeE2eSettings(env)).toEqual([])
  })

  it("overrides every value a developer's .env or shell could leak in", () => {
    const leaky = {
      DATABASE_URL: "postgres://medusa:medusa@localhost:5432/medusa",
      REDIS_URL: "redis://localhost:6379",
      STRIPE_API_KEY: "sk_live_real",
      S3_BUCKET: "real-bucket",
      S3_ACCESS_KEY_ID: "real",
      PAYLOAD_SSO_SECRET: "real",
      STORE_CORS: "https://shop.example.com",
      NODE_ENV: "production",
    }
    const env = launcher.buildE2eEnv(leaky)

    // Every key is set (an empty string still stops loadEnv from filling it)
    Object.keys(leaky).forEach((key) => {
      expect(env).toHaveProperty(key)
      expect(env[key]).not.toBe(leaky[key as keyof typeof leaky])
    })
  })

  it("takes its settings from E2E_* variables only", () => {
    const env = launcher.buildE2eEnv({
      E2E_DATABASE_URL: "postgres://u:p@postgres:5432/ci_e2e",
      E2E_MEDUSA_PORT: "9000",
      E2E_STOREFRONT_ORIGINS: "http://127.0.0.1:4000",
      E2E_STRIPE_SECRET_KEY: "sk_test_abc",
    })

    expect(env).toMatchObject({
      DATABASE_URL: "postgres://u:p@postgres:5432/ci_e2e",
      PORT: "9000",
      STORE_CORS: "http://127.0.0.1:4000",
      STRIPE_API_KEY: "sk_test_abc",
    })
    expect(launcher.findUnsafeE2eSettings(env)).toEqual([])
  })

  it("refuses a non-e2e database, a remote host and a live Stripe key", () => {
    const env = launcher.buildE2eEnv({
      E2E_DATABASE_URL: "postgres://u:p@db.proxy.rlwy.net:5432/railway",
      E2E_STRIPE_SECRET_KEY: "sk_live_abc",
    })

    expect(launcher.findUnsafeE2eSettings(env)).toHaveLength(4)
  })

  it("generates throwaway JWT and cookie secrets", () => {
    const first = launcher.buildE2eEnv({})
    const second = launcher.buildE2eEnv({})

    expect(first.JWT_SECRET).toHaveLength(64)
    expect(first.JWT_SECRET).not.toBe(second.JWT_SECRET)
    expect(first.COOKIE_SECRET).not.toBe(first.JWT_SECRET)
  })
})
