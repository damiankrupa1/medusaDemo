/// <reference types="jest" />

import {
  DEFAULT_OLDER_THAN_HOURS,
  describeEmail,
  isOrphanIdentity,
  parseOrphanIdentityArgs,
} from "../select"

describe("parseOrphanIdentityArgs", () => {
  it("defaults to a dry run over identities older than 24 hours", () => {
    expect(parseOrphanIdentityArgs()).toEqual({
      apply: false,
      olderThanHours: DEFAULT_OLDER_THAN_HOURS,
    })
    expect(DEFAULT_OLDER_THAN_HOURS).toBe(24)
  })

  it.each([
    [["apply"], { apply: true, olderThanHours: 24 }],
    [["--apply"], { apply: true, olderThanHours: 24 }],
    [["older-than-hours=72"], { apply: false, olderThanHours: 72 }],
    [["--older-than-hours=1.5", "apply"], { apply: true, olderThanHours: 1.5 }],
  ])("parses %j", (args, expected) => {
    expect(parseOrphanIdentityArgs(args)).toEqual(expected)
  })

  it.each([["older-than-hours=0"], ["older-than-hours=abc"], ["older-than-hours=0.5"], ["delete"]])(
    "refuses %s",
    (arg) => {
      expect(() => parseOrphanIdentityArgs([arg])).toThrow(/Usage/)
    }
  )
})

describe("isOrphanIdentity", () => {
  const cutoff = new Date("2026-01-02T00:00:00Z")
  const old = "2026-01-01T00:00:00Z"
  const emailpass = [{ provider: "emailpass", entity_id: "a@example.com" }]

  it("selects an old e-mail/password identity without an actor", () => {
    expect(
      isOrphanIdentity(
        { id: "1", created_at: old, app_metadata: null, provider_identities: emailpass },
        cutoff
      )
    ).toBe(true)
    expect(
      isOrphanIdentity(
        { id: "2", created_at: new Date(old), app_metadata: {}, provider_identities: emailpass },
        cutoff
      )
    ).toBe(true)
  })

  it("keeps an identity with a customer or a user", () => {
    for (const app_metadata of [{ customer_id: "cus_1" }, { user_id: "user_1" }]) {
      expect(
        isOrphanIdentity(
          { id: "1", created_at: old, app_metadata, provider_identities: emailpass },
          cutoff
        )
      ).toBe(false)
    }
  })

  it("keeps an identity younger than the cutoff", () => {
    expect(
      isOrphanIdentity(
        {
          id: "1",
          created_at: "2026-01-02T00:00:01Z",
          app_metadata: null,
          provider_identities: emailpass,
        },
        cutoff
      )
    ).toBe(false)
  })

  it("keeps an identity of another provider", () => {
    expect(
      isOrphanIdentity(
        {
          id: "1",
          created_at: old,
          app_metadata: null,
          provider_identities: [{ provider: "google", entity_id: "123" }],
        },
        cutoff
      )
    ).toBe(false)
  })
})

describe("describeEmail", () => {
  it("does not contain the e-mail and is the same for any letter case", () => {
    const described = describeEmail("Jane.Doe@Example.com")

    expect(described).not.toMatch(/jane|doe|example/i)
    expect(described).toMatch(/^J\*\*\*@E\*\*\* sha256:[0-9a-f]{12}$/)
    expect(describeEmail("jane.doe@example.com").split(" ")[1]).toBe(
      described.split(" ")[1]
    )
  })
})
