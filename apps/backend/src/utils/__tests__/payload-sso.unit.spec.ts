/// <reference types="jest" />

import { createHmac } from "node:crypto"
import { buildPayloadSsoUrl, signPayloadSsoToken } from "../payload-sso"

const SECRET = "test-sso-secret"
const NOW = 1_700_000_000

const decode = (part: string) =>
  JSON.parse(Buffer.from(part, "base64url").toString("utf-8"))

describe("signPayloadSsoToken", () => {
  const token = signPayloadSsoToken("admin@test.com", SECRET, NOW)
  const [header, claims, signature] = token.split(".")

  it("is a three part HS256 JWT", () => {
    expect(token.split(".")).toHaveLength(3)
    expect(decode(header)).toEqual({ alg: "HS256", typ: "JWT" })
  })

  it("carries the claims Payload expects", () => {
    expect(decode(claims)).toEqual({
      iss: "medusa-admin",
      aud: "payload",
      email: "admin@test.com",
      iat: NOW,
      exp: NOW + 60,
    })
  })

  it("lives no longer than the 120 seconds Payload accepts", () => {
    const { iat, exp } = decode(claims)

    expect(exp - iat).toBeLessThanOrEqual(120)
  })

  it("is signed with the shared secret", () => {
    const expected = createHmac("sha256", SECRET)
      .update(`${header}.${claims}`)
      .digest("base64url")

    expect(signature).toBe(expected)
  })

  it("produces a different signature for a different secret", () => {
    const other = signPayloadSsoToken("admin@test.com", "other-secret", NOW)

    expect(other.split(".")[2]).not.toBe(signature)
  })

  it("defaults the issue time to the current time", () => {
    const before = Math.floor(Date.now() / 1000)
    const { iat } = decode(
      signPayloadSsoToken("admin@test.com", SECRET).split(".")[1]
    )

    expect(iat).toBeGreaterThanOrEqual(before)
    expect(iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
  })
})

describe("buildPayloadSsoUrl", () => {
  it("points at Payload's Medusa SSO endpoint", () => {
    const url = new URL(buildPayloadSsoUrl("https://cms.shop.pl", "a.b.c"))

    expect(url.origin).toBe("https://cms.shop.pl")
    expect(url.pathname).toBe("/api/users/sso/medusa")
    expect(url.searchParams.get("token")).toBe("a.b.c")
  })

  it("tolerates a trailing slash in the Payload URL", () => {
    const url = new URL(buildPayloadSsoUrl("http://localhost:3000/", "a.b.c"))

    expect(url.pathname).toBe("/api/users/sso/medusa")
  })
})
