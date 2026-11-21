/// <reference types="jest" />

import { resolveInpostSandbox } from "../inpost"

describe("resolveInpostSandbox", () => {
  it("keeps the sandbox when the variable is unset", () => {
    expect(resolveInpostSandbox({ NODE_ENV: "development" })).toEqual({
      sandbox: true,
    })
  })

  it.each(["false", "FALSE", " false "])("uses the live API for %p", (value) => {
    expect(
      resolveInpostSandbox({ NODE_ENV: "production", INPOST_SANDBOX: value })
    ).toEqual({ sandbox: false })
    expect(resolveInpostSandbox({ INPOST_SANDBOX: value })).toEqual({
      sandbox: false,
    })
  })

  it.each(["true", "TRUE"])("keeps the sandbox for %p without a warning", (value) => {
    expect(
      resolveInpostSandbox({ NODE_ENV: "production", INPOST_SANDBOX: value })
    ).toEqual({ sandbox: true })
  })

  it.each(["", "0", "no", "off", "flase"])(
    "keeps the sandbox for %p outside production without a warning",
    (value) => {
      expect(
        resolveInpostSandbox({ NODE_ENV: "development", INPOST_SANDBOX: value })
      ).toEqual({ sandbox: true })
    }
  )

  it.each([undefined, "", "0", "no", "flase"])(
    "keeps the sandbox and warns in production for %p",
    (value) => {
      const result = resolveInpostSandbox({
        NODE_ENV: "production",
        INPOST_SANDBOX: value,
      })

      expect(result.sandbox).toBe(true)
      expect(result.warning).toMatch(/INPOST_SANDBOX=false/)
    }
  )
})
