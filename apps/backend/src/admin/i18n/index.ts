import en from "./json/en.json"
import pl from "./json/pl.json"
import plDashboard from "./json/pl.dashboard.json"

/**
 * Deep-merged by the Medusa Admin into its own translations, ours winning.
 *
 * - en.json / pl.json: strings of this project's admin extensions.
 * - pl.dashboard.json: keys missing from @medusajs/dashboard's Polish
 *   translation (they'd otherwise fall back to English) and fixes for its
 *   worst mistranslations. The unit test in __tests__ flags keys a Medusa
 *   upgrade adds.
 *
 * The language is picked per browser in Settings → Profile → Language.
 */
export default {
  en: {
    translation: en,
  },
  pl: {
    translation: { ...plDashboard, ...pl },
  },
}
