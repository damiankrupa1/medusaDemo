import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LOCALIZED_SLUGS_MODULE } from "../../modules/localized-slugs"
import LocalizedSlugsModuleService from "../../modules/localized-slugs/service"
import { assertValidSlug, InvalidSlugError } from "../../modules/localized-slugs/utils/slug"

export type UpsertLocalizedSlugsInput = {
  product_id: string
  slugs: { locale: string; slug: string }[]
}

export type LocalizedSlugOutput = {
  id: string
  product_id: string
  locale: string
  slug: string
}

type ExistingSlugRow = {
  id: string
  product_id: string
  locale: string
  slug: string
}

type SlugDiff = {
  toCreate: { product_id: string; locale: string; slug: string }[]
  toUpdate: { id: string; slug: string }[]
  previousValues: { id: string; slug: string }[]
  toDeleteIds: string[]
  unchanged: LocalizedSlugOutput[]
}

/**
 * Validates that the product referenced by the request actually exists,
 * so a localized slug can never be created for a non-existing product.
 */
const validateProductExistsStep = createStep(
  "validate-product-exists-step",
  async (productId: string, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { id: productId },
    })

    if (!products.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product with id: ${productId} was not found.`
      )
    }
  }
)

const getExistingLocalizedSlugsStep = createStep(
  "get-existing-localized-slugs-step",
  async (productId: string, { container }) => {
    const service: LocalizedSlugsModuleService = container.resolve(
      LOCALIZED_SLUGS_MODULE
    )

    const existing: ExistingSlugRow[] = await service.listLocalizedSlugs({
      product_id: productId,
    })

    return new StepResponse(existing)
  }
)

/**
 * Ensures none of the desired (locale, slug) pairs are already used by a
 * *different* product. This is the friendly, proactive check - the
 * database's unique index on (locale, slug) remains the last line of
 * defense against races (see the create/update steps below).
 */
const checkSlugConflictsStep = createStep(
  "check-slug-conflicts-step",
  async (
    input: {
      productId: string
      desiredSlugs: { locale: string; slug: string }[]
    },
    { container }
  ) => {
    if (!input.desiredSlugs.length) {
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: conflicting } = await query.graph({
      entity: "localized_slug",
      fields: ["id", "product_id", "locale", "slug"],
      filters: {
        $or: input.desiredSlugs.map(({ locale, slug }) => ({
          locale,
          slug,
        })),
      },
    })

    const conflict = (conflicting as ExistingSlugRow[]).find(
      (row) => row.product_id !== input.productId
    )

    if (conflict) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Slug "${conflict.slug}" is already used for locale "${conflict.locale}" by another product.`
      )
    }
  }
)

type StepContext = { container: { resolve: (key: string) => unknown } }

/**
 * The invoke/compensate handlers below are exported as plain named
 * functions (instead of being defined inline in `createStep`) so they can
 * be unit-tested directly against a real service/database, independent of
 * the workflow orchestration engine - see `__tests__/service.spec.ts`.
 */
export async function createLocalizedSlugsStepInvoke(
  input: { product_id: string; locale: string; slug: string }[],
  { container }: StepContext
): Promise<StepResponse<LocalizedSlugOutput[], string[]>> {
  if (!input.length) {
    return new StepResponse([], [])
  }

  const service = container.resolve(
    LOCALIZED_SLUGS_MODULE
  ) as LocalizedSlugsModuleService

  const created = await catchSlugConflict(() =>
    service.createLocalizedSlugs(input)
  )

  return new StepResponse(
    created as LocalizedSlugOutput[],
    created.map((row) => row.id)
  )
}

export async function createLocalizedSlugsStepCompensate(
  createdIds: string[] | undefined,
  { container }: StepContext
): Promise<void> {
  if (!createdIds?.length) {
    return
  }

  const service = container.resolve(
    LOCALIZED_SLUGS_MODULE
  ) as LocalizedSlugsModuleService

  await service.softDeleteLocalizedSlugs(createdIds)
}

const createLocalizedSlugsStep = createStep(
  "create-localized-slugs-step",
  createLocalizedSlugsStepInvoke,
  createLocalizedSlugsStepCompensate
)

export async function updateLocalizedSlugsStepInvoke(
  input: {
    toUpdate: { id: string; slug: string }[]
    previousValues: { id: string; slug: string }[]
  },
  { container }: StepContext
): Promise<StepResponse<LocalizedSlugOutput[], typeof input.previousValues>> {
  if (!input.toUpdate.length) {
    return new StepResponse([], [])
  }

  const service = container.resolve(
    LOCALIZED_SLUGS_MODULE
  ) as LocalizedSlugsModuleService

  const updated = await catchSlugConflict(() =>
    service.updateLocalizedSlugs(input.toUpdate)
  )

  return new StepResponse(updated as LocalizedSlugOutput[], input.previousValues)
}

export async function updateLocalizedSlugsStepCompensate(
  previousValues: { id: string; slug: string }[] | undefined,
  { container }: StepContext
): Promise<void> {
  if (!previousValues?.length) {
    return
  }

  const service = container.resolve(
    LOCALIZED_SLUGS_MODULE
  ) as LocalizedSlugsModuleService

  await service.updateLocalizedSlugs(previousValues)
}

const updateLocalizedSlugsStep = createStep(
  "update-localized-slugs-step",
  updateLocalizedSlugsStepInvoke,
  updateLocalizedSlugsStepCompensate
)

export async function deleteLocalizedSlugsStepInvoke(
  idsToDelete: string[],
  { container }: StepContext
): Promise<StepResponse<void, string[]>> {
  if (!idsToDelete.length) {
    return new StepResponse(undefined, [])
  }

  const service = container.resolve(
    LOCALIZED_SLUGS_MODULE
  ) as LocalizedSlugsModuleService

  await service.softDeleteLocalizedSlugs(idsToDelete)

  return new StepResponse(undefined, idsToDelete)
}

export async function deleteLocalizedSlugsStepCompensate(
  deletedIds: string[] | undefined,
  { container }: StepContext
): Promise<void> {
  if (!deletedIds?.length) {
    return
  }

  const service = container.resolve(
    LOCALIZED_SLUGS_MODULE
  ) as LocalizedSlugsModuleService

  await service.restoreLocalizedSlugs(deletedIds)
}

const deleteLocalizedSlugsStep = createStep(
  "delete-localized-slugs-step",
  deleteLocalizedSlugsStepInvoke,
  deleteLocalizedSlugsStepCompensate
)

/**
 * Wraps a write call so a unique-constraint race (two concurrent requests
 * both passing the proactive conflict check) surfaces as a domain CONFLICT
 * error instead of the generic "already exists" INVALID_DATA error the
 * database-error mapper produces by default.
 */
async function catchSlugConflict<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (
      error instanceof MedusaError &&
      error.type === MedusaError.Types.INVALID_DATA &&
      /already exists/.test(message)
    ) {
      throw new MedusaError(MedusaError.Types.CONFLICT, message)
    }
    throw error
  }
}

export const upsertLocalizedSlugsWorkflowId = "upsert-localized-slugs"

export const upsertLocalizedSlugsWorkflow = createWorkflow(
  upsertLocalizedSlugsWorkflowId,
  (input: UpsertLocalizedSlugsInput) => {
    validateProductExistsStep(input.product_id)

    const existingSlugs = getExistingLocalizedSlugsStep(input.product_id)

    const normalized = transform({ input }, ({ input }) => {
      const seenLocales = new Set<string>()

      return input.slugs.map(({ locale, slug }) => {
        if (seenLocales.has(locale)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Locale "${locale}" was provided more than once.`
          )
        }
        seenLocales.add(locale)

        try {
          return { locale, slug: assertValidSlug(slug) }
        } catch (error) {
          if (error instanceof InvalidSlugError) {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message)
          }
          throw error
        }
      })
    })

    const diff = transform(
      { productId: input.product_id, normalized, existingSlugs },
      ({ productId, normalized, existingSlugs }): SlugDiff => {
        const existingByLocale = new Map(
          existingSlugs.map((row) => [row.locale, row])
        )
        const desiredLocales = new Set(normalized.map((item) => item.locale))

        const toCreate: SlugDiff["toCreate"] = []
        const toUpdate: SlugDiff["toUpdate"] = []
        const previousValues: SlugDiff["previousValues"] = []
        const unchanged: SlugDiff["unchanged"] = []

        for (const { locale, slug } of normalized) {
          const existing = existingByLocale.get(locale)
          if (!existing) {
            toCreate.push({ product_id: productId, locale, slug })
          } else if (existing.slug !== slug) {
            toUpdate.push({ id: existing.id, slug })
            previousValues.push({ id: existing.id, slug: existing.slug })
          } else {
            unchanged.push(existing)
          }
        }

        const toDeleteIds = existingSlugs
          .filter((row) => !desiredLocales.has(row.locale))
          .map((row) => row.id)

        return { toCreate, toUpdate, previousValues, toDeleteIds, unchanged }
      }
    )

    const desiredForConflictCheck = transform({ normalized }, ({ normalized }) =>
      normalized.map(({ locale, slug }) => ({ locale, slug }))
    )

    checkSlugConflictsStep({
      productId: input.product_id,
      desiredSlugs: desiredForConflictCheck,
    })

    const created = createLocalizedSlugsStep(
      transform({ diff }, ({ diff }) => diff.toCreate)
    )
    const updated = updateLocalizedSlugsStep(
      transform({ diff }, ({ diff }) => ({
        toUpdate: diff.toUpdate,
        previousValues: diff.previousValues,
      }))
    )
    deleteLocalizedSlugsStep(transform({ diff }, ({ diff }) => diff.toDeleteIds))

    const result = transform(
      { created, updated, diff },
      ({ created, updated, diff }) => [...created, ...updated, ...diff.unchanged]
    )

    return new WorkflowResponse(result)
  }
)
