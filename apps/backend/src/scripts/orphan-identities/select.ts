import { createHash } from "node:crypto"
import { PASSWORD_AUTH_PROVIDER } from "../../config/auth"

export const DEFAULT_OLDER_THAN_HOURS = 24

// A registration in progress has an identity without an actor for a few
// seconds; never treat anything younger than this as abandoned.
export const MIN_OLDER_THAN_HOURS = 1

export type OrphanIdentityOptions = {
  apply: boolean
  olderThanHours: number
}

const USAGE =
  "Usage: medusa exec ./src/scripts/list-orphan-identities.ts [older-than-hours=N] [apply]"

/**
 * `medusa exec` passes the plain words after the file as `args` and refuses
 * `--flags` it doesn't know ("Unknown argument"), so the arguments are words:
 * `apply`, `older-than-hours=48`. A leading `--` is tolerated for callers that
 * pass `args` directly.
 */
export function parseOrphanIdentityArgs(args: string[] = []): OrphanIdentityOptions {
  const options: OrphanIdentityOptions = {
    apply: false,
    olderThanHours: DEFAULT_OLDER_THAN_HOURS,
  }

  for (const raw of args) {
    const arg = String(raw).replace(/^--/, "")

    if (arg === "apply") {
      options.apply = true
      continue
    }

    const match = /^older-than-hours=(.*)$/.exec(arg)

    if (!match) {
      throw new Error(`Unknown argument "${raw}". ${USAGE}`)
    }

    const hours = Number(match[1])

    if (!Number.isFinite(hours) || hours < MIN_OLDER_THAN_HOURS) {
      throw new Error(
        `older-than-hours must be a number >= ${MIN_OLDER_THAN_HOURS}, got "${match[1]}". ${USAGE}`
      )
    }

    options.olderThanHours = hours
  }

  return options
}

export type IdentityForSelection = {
  id: string
  created_at: Date | string
  app_metadata?: Record<string, unknown> | null
  provider_identities?: { provider: string; entity_id: string }[] | null
}

const hasActor = (appMetadata: IdentityForSelection["app_metadata"]) =>
  !!appMetadata && Object.keys(appMetadata).length > 0

/**
 * An e-mail/password identity without an actor (no customer or user was
 * attached: Medusa's provider treats an empty `app_metadata` the same way)
 * created before the cutoff.
 */
export function isOrphanIdentity(
  identity: IdentityForSelection,
  cutoff: Date
): boolean {
  return (
    !hasActor(identity.app_metadata) &&
    new Date(identity.created_at).getTime() < cutoff.getTime() &&
    !!identity.provider_identities?.some(
      ({ provider }) => provider === PASSWORD_AUTH_PROVIDER
    )
  )
}

/** A stable reference to an e-mail for logs that does not reveal it. */
export function describeEmail(email: string): string {
  const hash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 12)
  const [local = "", domain = ""] = email.split("@")
  const masked = `${local.slice(0, 1)}***@${domain.slice(0, 1)}***`

  return `${masked} sha256:${hash}`
}
