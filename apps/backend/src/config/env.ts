/**
 * Environment helpers for medusa-config.ts.
 *
 * Everything here reads the environment only when called: medusa-config.ts
 * imports these modules before it runs `loadEnv()`, so module-level reads of
 * `process.env` would miss the values from `.env`.
 */

/**
 * JWT_SECRET/COOKIE_SECRET must never fall back to a predictable value in
 * production - refuse to boot instead of silently running with a secret
 * that's public in every Medusa starter repo.
 */
export function requireSecret(
  name: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const value = env[name]

  if (value) {
    return value
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      `${name} is not set. Refusing to start in production with an insecure default secret.`
    )
  }

  return "supersecret"
}

export const parseBoolean = (
  value: string | undefined,
  fallback: boolean
): boolean =>
  value === undefined
    ? fallback
    : ["true", "1", "yes"].includes(value.toLowerCase())
