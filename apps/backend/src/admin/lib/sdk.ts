import Medusa from "@medusajs/js-sdk"

/**
 * The one HTTP client for admin extensions (widgets, routes). Use
 * `sdk.client.fetch` for calls to this backend's API instead of a bare
 * `fetch`: it sends the admin session cookie, JSON-encodes `body`/`query`
 * objects and throws a `FetchError` carrying the API's error message.
 */
export const sdk = new Medusa({
  // Admin is served by the backend itself, so "/" resolves to its origin.
  // (No `import.meta.env` here: the root tsconfig compiles src/admin as CJS.)
  baseUrl: "/",
  auth: {
    type: "session",
  },
})
