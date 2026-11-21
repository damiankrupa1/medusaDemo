/**
 * InPost options that depend on the environment, for medusa-config.ts.
 *
 * Reads the environment only when called (see ./env.ts).
 */

export type InpostSandboxResolution = {
  sandbox: boolean
  /** Set when production runs against the sandbox without saying so. */
  warning?: string
}

/**
 * `INPOST_SANDBOX=false` (case-insensitive, trimmed) is the only value that
 * selects the real InPost API. Anything else - unset, empty, "true", a typo -
 * keeps the sandbox, which is what the config hard-coded before and what local
 * development and the e2e launcher rely on. In production, going live must be
 * a deliberate `INPOST_SANDBOX=false`; when it is neither "false" nor an
 * explicit "true" there, a warning is returned (never an error, so an existing
 * deployment keeps booting).
 */
export function resolveInpostSandbox(
  env: NodeJS.ProcessEnv = process.env
): InpostSandboxResolution {
  const value = env.INPOST_SANDBOX?.trim().toLowerCase()

  if (value === "false") {
    return { sandbox: false }
  }

  if (env.NODE_ENV === "production" && value !== "true") {
    return {
      sandbox: true,
      warning:
        'INPOST_SANDBOX is not set to "true" or "false" in production: using the InPost SANDBOX API ' +
        "(shipments are not real). Set INPOST_SANDBOX=false to use the live InPost API, " +
        "or INPOST_SANDBOX=true to silence this warning.",
    }
  }

  return { sandbox: true }
}
