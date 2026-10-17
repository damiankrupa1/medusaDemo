/// <reference types="jest" />

import { parseBoolean, requireSecret } from "../env"

describe("requireSecret", () => {
  it("returns the configured secret", () => {
    expect(
      requireSecret("JWT_SECRET", { NODE_ENV: "production", JWT_SECRET: "s3cr3t" })
    ).toBe("s3cr3t")
  })

  it("falls back to the dev default outside production", () => {
    expect(requireSecret("JWT_SECRET", { NODE_ENV: "development" })).toBe(
      "supersecret"
    )
  })

  it("refuses to boot in production without the secret", () => {
    expect(() =>
      requireSecret("COOKIE_SECRET", { NODE_ENV: "production", COOKIE_SECRET: "" })
    ).toThrow(/COOKIE_SECRET is not set/)
  })
})

describe("parseBoolean", () => {
  it("uses the fallback when the value is unset", () => {
    expect(parseBoolean(undefined, true)).toBe(true)
    expect(parseBoolean(undefined, false)).toBe(false)
  })

  it.each(["true", "TRUE", "1", "yes"])("treats %p as true", (value) => {
    expect(parseBoolean(value, false)).toBe(true)
  })

  it.each(["false", "0", "no", ""])("treats %p as false", (value) => {
    expect(parseBoolean(value, true)).toBe(false)
  })
})
