// Catalog structure shared by the generator, the CSV builder, the entity
// check and the translation step. Categories and collections are referenced
// by HANDLE and resolved to IDs against the target backend at build time,
// because IDs differ between environments (local vs Railway).
//
// Base names are English (the store's base language, see
// apps/backend/src/migration-scripts/add-polish-translations.ts); Polish is
// added as a pl-PL translation by translate-catalog.mjs.

export const BASE_LOCALE = 'en-US'
export const TRANSLATION_LOCALE = 'pl-PL'

// `shirts`, `sweatshirts` and `pants` already exist in the seeded store (the
// Nuxt homepage section uses `pants`) and keep their existing base names; the
// rest are created by ensure-entities.mjs when missing.
export const CATEGORIES = [
  { handle: 't-shirts-tops', name: 'T-shirts & tops', description: 'T-shirts, tops and tank tops for every day.', pl: { name: 'T-shirty i topy', description: 'Koszulki, topy i tank topy na co dzień.' } },
  { handle: 'shirts', name: 'Shirts', description: 'Shirts and blouses, from classic to casual.', pl: { name: 'Koszule', description: 'Koszule i bluzki: od klasyki do casualu.' }, seeded: true },
  { handle: 'sweatshirts', name: 'Sweatshirts', description: 'Hoodies and sweatshirts in soft jersey.', pl: { name: 'Bluzy', description: 'Bluzy z kapturem i bez, z dzianiny dresowej.' }, seeded: true },
  { handle: 'sweaters-cardigans', name: 'Sweaters & cardigans', description: 'Sweaters, turtlenecks and cardigans for colder days.', pl: { name: 'Swetry i kardigany', description: 'Swetry, golfy i kardigany na chłodniejsze dni.' } },
  { handle: 'pants', name: 'Pants', description: 'Jeans, chinos, tailored pants and shorts.', pl: { name: 'Spodnie i jeansy', description: 'Jeansy, chinosy, spodnie materiałowe i szorty.' }, seeded: true },
  { handle: 'skirts', name: 'Skirts', description: 'Mini, midi and maxi skirts.', pl: { name: 'Spódnice', description: 'Spódnice mini, midi i maxi.' } },
  { handle: 'dresses', name: 'Dresses', description: 'Dresses for every day and evenings out.', pl: { name: 'Sukienki', description: 'Sukienki na co dzień i na wyjście.' } },
  { handle: 'jackets-coats', name: 'Jackets & coats', description: 'Jackets, coats, blazers and vests.', pl: { name: 'Kurtki i płaszcze', description: 'Kurtki, płaszcze, marynarki i kamizelki.' } },
  { handle: 'sportswear', name: 'Activewear', description: 'Clothing for running, training and yoga.', pl: { name: 'Odzież sportowa', description: 'Odzież do biegania, treningu i jogi.' } },
  { handle: 'accessories', name: 'Accessories', description: 'Hats, scarves, bags, belts and sunglasses.', pl: { name: 'Akcesoria modowe', description: 'Czapki, szaliki, torby, paski i okulary.' } },
  { handle: 'women', name: 'Women', description: 'Women\'s fashion.', pl: { name: 'Damskie', description: 'Moda damska.' } },
  { handle: 'men', name: 'Men', description: 'Men\'s fashion.', pl: { name: 'Męskie', description: 'Moda męska.' } },
]

export const GENDER_CATEGORY = { w: 'women', m: 'men' }

// Handles taken from the Nuxt storefront's app.config.ts (homepageCollections).
// `sale` is deliberately not used: the catalog has no real price reductions.
export const COLLECTIONS = [
  { handle: 'latest-drops', title: 'Latest drops', pl: { title: 'Nowości' } },
  { handle: 'weekly-picks', title: 'Weekly picks', pl: { title: 'Wybór tygodnia' } },
]

export const PRIMARY_CURRENCY = 'pln'

// Used only when the target store also sells in these currencies (detected
// from its regions); prices are converted from PLN and rounded to x.99.
export const CONVERSION_FROM_PLN = { eur: 4.3, usd: 3.95 }
