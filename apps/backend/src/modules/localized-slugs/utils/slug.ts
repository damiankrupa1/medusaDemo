const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const MAX_SLUG_LENGTH = 200

export class InvalidSlugError extends Error {}

/**
 * Normalizes a raw slug value: trims whitespace and lowercases it.
 * Does not attempt to fix structurally invalid input (double hyphens,
 * spaces, slashes, etc.) - those are rejected by `assertValidSlug` so a
 * slug is never silently rewritten into a different value than what was
 * validated.
 */
export function normalizeSlug(rawSlug: string): string {
  return rawSlug.trim().toLowerCase()
}

/**
 * Validates that a (already normalized) slug is a safe, canonical URL
 * segment: lowercase letters, digits and single hyphens, no leading/
 * trailing/duplicate hyphens, no whitespace, `/`, `?` or `#`.
 */
export function isValidSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= MAX_SLUG_LENGTH &&
    SLUG_PATTERN.test(slug)
  )
}

/**
 * Normalizes and validates a raw slug, throwing `InvalidSlugError` with a
 * human-readable reason if the result isn't a valid canonical slug.
 */
export function assertValidSlug(rawSlug: string): string {
  if (typeof rawSlug !== "string" || rawSlug.trim().length === 0) {
    throw new InvalidSlugError("Slug is required.")
  }

  const slug = normalizeSlug(rawSlug)

  if (slug.length > MAX_SLUG_LENGTH) {
    throw new InvalidSlugError(
      `Slug must be at most ${MAX_SLUG_LENGTH} characters long.`
    )
  }

  if (!isValidSlug(slug)) {
    throw new InvalidSlugError(
      `Slug "${rawSlug}" is invalid. Use only lowercase letters, digits and single hyphens (e.g. "koszulka-meska").`
    )
  }

  return slug
}
