/// <reference types="jest" />

import {
  assertValidSlug,
  InvalidSlugError,
  isValidSlug,
  normalizeSlug,
} from "../utils/slug"

describe("normalizeSlug", () => {
  it("trims whitespace and lowercases the input", () => {
    expect(normalizeSlug("  Koszulka-Meska  ")).toEqual("koszulka-meska")
  })
})

describe("isValidSlug", () => {
  it("accepts canonical lowercase slugs", () => {
    expect(isValidSlug("koszulka-meska")).toBe(true)
    expect(isValidSlug("t-shirt-basic")).toBe(true)
    expect(isValidSlug("buty-sportowe-2026")).toBe(true)
    expect(isValidSlug("a")).toBe(true)
  })

  it("rejects uppercase letters", () => {
    expect(isValidSlug("Koszulka-Meska")).toBe(false)
  })

  it("rejects spaces", () => {
    expect(isValidSlug("koszulka meska")).toBe(false)
  })

  it("rejects slashes", () => {
    expect(isValidSlug("koszulka/meska")).toBe(false)
  })

  it("rejects query strings", () => {
    expect(isValidSlug("koszulka?test")).toBe(false)
  })

  it("rejects fragments", () => {
    expect(isValidSlug("koszulka#test")).toBe(false)
  })

  it("rejects leading or trailing hyphens", () => {
    expect(isValidSlug("-koszulka")).toBe(false)
    expect(isValidSlug("koszulka-")).toBe(false)
  })

  it("rejects consecutive hyphens", () => {
    expect(isValidSlug("koszulka--meska")).toBe(false)
  })

  it("rejects an empty string", () => {
    expect(isValidSlug("")).toBe(false)
  })
})

describe("assertValidSlug", () => {
  it("returns the normalized slug when valid", () => {
    expect(assertValidSlug("  Mens-T-Shirt  ")).toEqual("mens-t-shirt")
  })

  it("throws InvalidSlugError for an empty value", () => {
    expect(() => assertValidSlug("")).toThrow(InvalidSlugError)
    expect(() => assertValidSlug("   ")).toThrow(InvalidSlugError)
  })

  it("throws InvalidSlugError for a structurally invalid slug", () => {
    expect(() => assertValidSlug("koszulka meska")).toThrow(InvalidSlugError)
    expect(() => assertValidSlug("koszulka/meska")).toThrow(InvalidSlugError)
    expect(() => assertValidSlug("koszulka--meska")).toThrow(InvalidSlugError)
  })

  it("throws InvalidSlugError when the slug exceeds the max length", () => {
    const tooLong = "a".repeat(201)
    expect(() => assertValidSlug(tooLong)).toThrow(InvalidSlugError)
  })
})
