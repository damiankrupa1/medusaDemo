import { createHmac, randomBytes } from "node:crypto"

/**
 * Single sign-on token for the Payload CMS admin embedded in the Medusa admin.
 *
 * This is one half of a contract with Payload's `/api/users/sso/medusa`
 * endpoint (simple-landing-page-nuxt/payload-cms): change a claim, the
 * algorithm or the lifetime on one side only and the login stops working.
 */
export const PAYLOAD_SSO_ISSUER = "medusa-admin"
export const PAYLOAD_SSO_AUDIENCE = "payload"
export const PAYLOAD_SSO_PATH = "/api/users/sso/medusa"

// Payload rejects tokens that live longer than 120 seconds.
export const PAYLOAD_SSO_TOKEN_TTL_SECONDS = 60

export type PayloadSsoClaims = {
  sub: string
  email: string
  name?: string
  role: "none" | "viewer" | "editor" | "publisher" | "admin"
  jti?: string
  redirect: string
  lng?: "en" | "pl"
}

const encode = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url")

export function signPayloadSsoToken(
  claims: PayloadSsoClaims,
  secret: string,
  nowSeconds?: number
): string
export function signPayloadSsoToken(
  email: string,
  secret: string,
  nowSeconds?: number
): string
export function signPayloadSsoToken(
  claimsOrEmail: PayloadSsoClaims | string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const claims =
    typeof claimsOrEmail === "string"
      ? {
          sub: claimsOrEmail,
          email: claimsOrEmail,
          role: "none" as const,
          redirect: "/admin",
        }
      : claimsOrEmail

  const header = encode({ alg: "HS256", typ: "JWT" })
  const payload = encode({
    iss: PAYLOAD_SSO_ISSUER,
    aud: PAYLOAD_SSO_AUDIENCE,
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    role: claims.role,
    jti: claims.jti ?? randomBytes(16).toString("hex"),
    redirect: claims.redirect,
    lng: claims.lng,
    iat: nowSeconds,
    exp: nowSeconds + PAYLOAD_SSO_TOKEN_TTL_SECONDS,
  })
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url")

  return `${header}.${payload}.${signature}`
}

export function buildPayloadSsoUrl(payloadUrl: string, token: string): string {
  const url = new URL(PAYLOAD_SSO_PATH, payloadUrl)
  url.searchParams.set("token", token)

  return url.toString()
}
