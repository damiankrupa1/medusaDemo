import type { ExecArgs, IAuthModuleService, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PASSWORD_AUTH_PROVIDER } from "../config/auth"
import {
  describeEmail,
  isOrphanIdentity,
  parseOrphanIdentityArgs,
  type IdentityForSelection,
} from "./orphan-identities/select"

const PAGE_SIZE = 200

export type OrphanIdentityReport = {
  apply: boolean
  olderThanHours: number
  found: string[]
  deleted: string[]
}

/**
 * Lists e-mail/password auth identities that have no customer or user
 * attached and are older than `older-than-hours` (default 24), typically a
 * registration whose second step (creating the customer) never happened.
 * Such an e-mail can't be registered again (docs/auth-registration.md); its
 * owner can still sign in with the password and finish the account.
 *
 *   pnpm medusa exec ./src/scripts/list-orphan-identities.ts                       # dry run, 24 h
 *   pnpm medusa exec ./src/scripts/list-orphan-identities.ts older-than-hours=72   # dry run, 72 h
 *   pnpm medusa exec ./src/scripts/list-orphan-identities.ts older-than-hours=72 apply
 *
 * Without `apply` nothing is changed. With it, each listed identity is read
 * again and deleted only if it still has no actor. E-mails are logged masked
 * with a short hash, never in full. Customers, orders and users are never
 * touched: an identity without an actor is not linked to any of them.
 */
export default async function listOrphanIdentities({
  container,
  args,
}: ExecArgs): Promise<OrphanIdentityReport> {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const auth = container.resolve<IAuthModuleService>(Modules.AUTH)
  const { apply, olderThanHours } = parseOrphanIdentityArgs(args)
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)

  logger.info(
    `Auth identities (${PASSWORD_AUTH_PROVIDER}) without a customer or user, created before ${cutoff.toISOString()} (${olderThanHours} h)${
      apply ? "" : " - dry run, nothing is deleted"
    }`
  )

  const orphans: IdentityForSelection[] = []

  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = (await auth.listAuthIdentities(
      { created_at: { $lt: cutoff } } as Record<string, unknown>,
      {
        relations: ["provider_identities"],
        order: { created_at: "ASC" },
        skip,
        take: PAGE_SIZE,
      }
    )) as unknown as IdentityForSelection[]

    orphans.push(...page.filter((identity) => isOrphanIdentity(identity, cutoff)))

    if (page.length < PAGE_SIZE) {
      break
    }
  }

  for (const identity of orphans) {
    const email =
      identity.provider_identities?.find(
        ({ provider }) => provider === PASSWORD_AUTH_PROVIDER
      )?.entity_id ?? ""

    logger.info(
      `  ${identity.id}  ${describeEmail(email)}  created ${new Date(
        identity.created_at
      ).toISOString()}`
    )
  }

  const deleted: string[] = []

  if (apply) {
    for (const { id } of orphans) {
      // Re-read: a customer may have been created since the listing.
      const [current] = (await auth.listAuthIdentities(
        { id: [id] },
        { relations: ["provider_identities"] }
      )) as unknown as IdentityForSelection[]

      if (!current || !isOrphanIdentity(current, cutoff)) {
        logger.info(`  ${id} skipped: no longer without an actor`)
        continue
      }

      await auth.deleteAuthIdentities([id])
      deleted.push(id)
    }
  }

  logger.info(
    apply
      ? `Deleted ${deleted.length} of ${orphans.length} identities without an actor.`
      : `Found ${orphans.length} identities without an actor. Run again with "apply" to delete them.`
  )

  return {
    apply,
    olderThanHours,
    found: orphans.map(({ id }) => id),
    deleted,
  }
}
