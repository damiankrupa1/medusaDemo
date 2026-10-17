/// <reference types="jest" />

import fs from "fs"
import path from "path"
import translations from "../index"
import en from "../json/en.json"
import pl from "../json/pl.json"
import plDashboard from "../json/pl.dashboard.json"

type Tree = { [key: string]: string | Tree }

const flatten = (
  tree: Tree,
  prefix = "",
  out: Record<string, string> = {}
): Record<string, string> => {
  for (const [key, value] of Object.entries(tree)) {
    const keyPath = prefix ? `${prefix}.${key}` : key
    if (typeof value === "string") {
      out[keyPath] = value
    } else {
      flatten(value, keyPath, out)
    }
  }
  return out
}

const coreTranslationsDir = path.join(
  path.dirname(require.resolve("@medusajs/dashboard")),
  "../src/i18n/translations"
)

const readCore = (language: string) => {
  const { $schema: _schema, ...tree } = JSON.parse(
    fs.readFileSync(path.join(coreTranslationsDir, `${language}.json`), "utf-8")
  )
  return flatten(tree)
}

const coreEn = readCore("en")
const corePl = readCore("pl")
const fills = flatten(plDashboard as unknown as Tree)
const extensionEn = flatten(en as Tree)
const extensionPl = flatten(pl as Tree)
// The admin deep-merges our resources over its own, so a flat spread of the
// flattened trees gives the strings it ends up showing.
const effectivePl = {
  ...corePl,
  ...flatten(translations.pl.translation as unknown as Tree),
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/
const POLISH_PLURAL_FORMS = ["one", "few", "many", "other"]

const pluralBase = (key: string) => key.replace(PLURAL_SUFFIX, "")
const coreEnPluralBases = new Set(
  Object.keys(coreEn)
    .filter((key) => PLURAL_SUFFIX.test(key))
    .map(pluralBase)
)

const markup = (text: string) =>
  new Set(
    (text.match(/\{\{\s*[\w.]+\s*\}\}|<\/?\d+>/g) ?? []).map((token) =>
      token.replace(/\s/g, "")
    )
  )

describe("admin translations", () => {
  it("translates every Medusa Admin string into Polish", () => {
    const missing = new Set<string>()

    for (const key of Object.keys(coreEn)) {
      const required = PLURAL_SUFFIX.test(key)
        ? POLISH_PLURAL_FORMS.map((form) => `${pluralBase(key)}_${form}`)
        : [key]

      required
        .filter((requiredKey) => !(requiredKey in effectivePl))
        .forEach((requiredKey) => missing.add(requiredKey))
    }

    expect([...missing]).toEqual([])
  })

  it("only fills or fixes keys the Medusa Admin has", () => {
    const unknown = Object.keys(fills).filter(
      (key) =>
        !(key in coreEn) &&
        !(PLURAL_SUFFIX.test(key) && coreEnPluralBases.has(pluralBase(key)))
    )

    expect(unknown).toEqual([])
  })

  it("keeps the placeholders and markup of the English strings", () => {
    const mismatched = Object.entries(fills).filter(([key, text]) => {
      if (!PLURAL_SUFFIX.test(key)) {
        const expected = markup(coreEn[key])
        const actual = markup(text)
        return (
          expected.size !== actual.size ||
          [...expected].some((token) => !actual.has(token))
        )
      }

      // Plural forms may drop a placeholder (e.g. "only one item"), but must
      // not introduce one the English forms don't have.
      const allowed = new Set(
        Object.entries(coreEn)
          .filter(([enKey]) => pluralBase(enKey) === pluralBase(key))
          .flatMap(([, enText]) => [...markup(enText)])
      )
      return [...markup(text)].some((token) => !allowed.has(token))
    })

    expect(mismatched.map(([key]) => key)).toEqual([])
  })

  it("translates the project's admin extensions into every language", () => {
    expect(Object.keys(extensionPl).sort()).toEqual(
      Object.keys(extensionEn).sort()
    )

    for (const [key, text] of Object.entries(extensionPl)) {
      expect([...markup(text)].sort()).toEqual(
        [...markup(extensionEn[key])].sort()
      )
    }
  })

  it("keeps extension strings out of the Medusa Admin's namespaces", () => {
    const coreSections = new Set(
      Object.keys(coreEn).map((key) => key.split(".")[0])
    )

    expect(Object.keys(en).filter((section) => coreSections.has(section))).toEqual(
      []
    )
  })
})
