// Garment types used when labelling reviewed photos, with what the generator
// needs to turn a label into a product: category, Polish noun (with its
// grammatical gender so colour adjectives agree), price range in PLN, size
// scheme, plausible materials and a shipping weight in grams.
//
// Grammatical gender: m (masculine), f (feminine), pl (plural-only nouns such
// as "spodnie", "jeansy", "okulary").

export const SIZE_SCHEMES = {
  'alpha-w': ['XS', 'S', 'M', 'L', 'XL'],
  'alpha-m': ['S', 'M', 'L', 'XL', 'XXL'],
  'alpha-u': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'eu-w': ['34', '36', '38', '40', '42', '44'],
  'waist-m': ['W30', 'W32', 'W34', 'W36', 'W38'],
  'gloves': ['S/M', 'L/XL'],
  'hat': ['S/M', 'L/XL'],
  'one': ['One size'], // "Uniwersalny" in the pl-PL translation
}

// Features already implied by the garment's name in both languages, so they
// are left out of the title ("Hoodie" + hood, "Puffer jacket" + quilted).
export const REDUNDANT_FEATURES = {
  hoodie: ['hood'],
  'zip-hoodie': ['hood', 'zip'],
  turtleneck: ['turtle'],
  puffer: ['quilted'],
  jeans: ['denim'],
  'denim-jacket': ['denim'],
  'denim-shirt': ['denim'],
  'linen-shirt': ['linen'],
  'leather-jacket': ['ecoleather'],
  croptop: ['short'],
  longsleeve: ['longsl'],
  tank: ['sleeveless', 'straps'],
  'knit-vest': ['knitted'],
}

// [min, max] PLN; the generator picks a value and rounds it to x9.99.
export const GARMENTS = {
  // --- T-shirty i topy
  tshirt: { category: 't-shirts-tops', noun: ['T-shirt', 'm'], price: [49, 119], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna', '95% bawełna, 5% elastan', '60% bawełna, 40% poliester', '50% bawełna, 50% modal'], weight: 200 },
  longsleeve: { category: 't-shirts-tops', noun: ['Koszulka z długim rękawem', 'f'], price: [69, 139], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna', '95% bawełna, 5% elastan', '92% wiskoza, 8% elastan'], weight: 250 },
  tank: { category: 't-shirts-tops', noun: ['Top na ramiączkach', 'm'], price: [39, 89], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna', '95% bawełna, 5% elastan', '95% wiskoza, 5% elastan'], weight: 150 },
  croptop: { category: 't-shirts-tops', noun: ['Krótki top', 'm'], price: [49, 99], sizes: { w: 'alpha-w' }, materials: ['95% bawełna, 5% elastan', '92% wiskoza, 8% elastan', '100% bawełna'], weight: 140 },
  top: { category: 't-shirts-tops', noun: ['Top', 'm'], price: [69, 149], sizes: { w: 'alpha-w' }, materials: ['100% wiskoza', '95% wiskoza, 5% elastan', '100% poliester z recyklingu', '100% bawełna'], weight: 170 },
  polo: { category: 't-shirts-tops', noun: ['Koszulka polo', 'f'], price: [89, 179], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna (piké)', '95% bawełna, 5% elastan (piké)'], weight: 250 },

  // --- Koszule
  shirt: { category: 'shirts', noun: ['Koszula', 'f'], price: [129, 249], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna', '97% bawełna, 3% elastan', '100% bawełna (oxford)', '55% len, 45% bawełna'], weight: 280 },
  blouse: { category: 'shirts', noun: ['Bluzka', 'f'], price: [99, 199], sizes: { w: 'alpha-w' }, materials: ['100% wiskoza', '100% poliester', '100% bawełna', '70% wiskoza, 30% len'], weight: 200 },
  flannel: { category: 'shirts', noun: ['Koszula flanelowa', 'f'], price: [139, 229], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna (flanela)', '80% bawełna, 20% poliester (flanela)'], weight: 380 },
  'denim-shirt': { category: 'shirts', noun: ['Koszula jeansowa', 'f'], price: [149, 249], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna (denim)', '98% bawełna, 2% elastan (denim)'], weight: 420 },
  'linen-shirt': { category: 'shirts', noun: ['Koszula lniana', 'f'], price: [179, 299], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% len', '55% len, 45% bawełna'], weight: 260 },

  // --- Bluzy
  hoodie: { category: 'sweatshirts', noun: ['Bluza z kapturem', 'f'], price: [139, 269], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['80% bawełna, 20% poliester', '100% bawełna', '70% bawełna, 30% poliester z recyklingu'], weight: 550 },
  'zip-hoodie': { category: 'sweatshirts', noun: ['Bluza rozpinana z kapturem', 'f'], price: [159, 279], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['80% bawełna, 20% poliester', '100% bawełna'], weight: 600 },
  sweatshirt: { category: 'sweatshirts', noun: ['Bluza', 'f'], price: [119, 229], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['80% bawełna, 20% poliester', '100% bawełna', '65% bawełna, 35% poliester'], weight: 480 },

  // --- Swetry i kardigany
  sweater: { category: 'sweaters-cardigans', noun: ['Sweter', 'm'], price: [149, 329], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna', '70% bawełna, 30% wełna', '50% wełna merino, 50% akryl', '60% bawełna, 40% akryl', '30% wełna, 70% akryl'], weight: 450 },
  turtleneck: { category: 'sweaters-cardigans', noun: ['Golf', 'm'], price: [159, 349], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% wełna merino', '50% wełna merino, 50% akryl', '70% wiskoza, 30% poliamid', '100% bawełna'], weight: 380 },
  cardigan: { category: 'sweaters-cardigans', noun: ['Kardigan', 'm'], price: [159, 329], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna', '50% wełna, 50% akryl', '60% bawełna, 40% akryl', '30% alpaka, 70% akryl'], weight: 480 },
  'knit-vest': { category: 'sweaters-cardigans', noun: ['Kamizelka z dzianiny', 'f'], price: [119, 219], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna', '50% wełna, 50% akryl'], weight: 300 },

  // --- Spodnie i jeansy
  jeans: { category: 'pants', noun: ['Jeansy', 'pl'], price: [179, 329], sizes: { w: 'eu-w', m: 'waist-m', u: 'waist-m' }, materials: ['100% bawełna (denim)', '98% bawełna, 2% elastan (denim)', '92% bawełna, 6% poliester, 2% elastan'], weight: 700 },
  trousers: { category: 'pants', noun: ['Spodnie materiałowe', 'pl'], price: [159, 299], sizes: { w: 'eu-w', m: 'waist-m', u: 'waist-m' }, materials: ['64% poliester, 34% wiskoza, 2% elastan', '100% bawełna', '55% len, 45% wiskoza', '70% wełna, 30% poliester'], weight: 500 },
  chinos: { category: 'pants', noun: ['Chinosy', 'pl'], price: [149, 249], sizes: { w: 'eu-w', m: 'waist-m', u: 'waist-m' }, materials: ['98% bawełna, 2% elastan', '100% bawełna'], weight: 520 },
  shorts: { category: 'pants', noun: ['Szorty', 'pl'], price: [89, 169], sizes: { w: 'eu-w', m: 'waist-m', u: 'alpha-u' }, materials: ['100% bawełna', '98% bawełna, 2% elastan (denim)', '55% len, 45% bawełna'], weight: 300 },
  joggers: { category: 'pants', noun: ['Spodnie dresowe', 'pl'], price: [119, 199], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['80% bawełna, 20% poliester', '100% bawełna'], weight: 480 },
  'wide-pants': { category: 'pants', noun: ['Szerokie spodnie', 'pl'], price: [169, 289], sizes: { w: 'eu-w' }, materials: ['100% wiskoza', '55% len, 45% wiskoza', '64% poliester, 34% wiskoza, 2% elastan', '100% bawełna (sztruks)'], weight: 480 },

  // --- Spódnice
  skirt: { category: 'skirts', noun: ['Spódnica', 'f'], price: [109, 229], sizes: { w: 'eu-w' }, materials: ['100% wiskoza', '100% poliester', '98% bawełna, 2% elastan (denim)', '100% bawełna (sztruks)', '50% wełna, 50% poliester'], weight: 300 },

  // --- Sukienki
  dress: { category: 'dresses', noun: ['Sukienka', 'f'], price: [149, 399], sizes: { w: 'alpha-w' }, materials: ['100% wiskoza', '100% bawełna', '95% wiskoza, 5% elastan', '100% len', '100% poliester z recyklingu', '70% wiskoza, 30% len'], weight: 350 },
  jumpsuit: { category: 'dresses', noun: ['Kombinezon', 'm'], price: [179, 329], sizes: { w: 'alpha-w' }, materials: ['100% wiskoza', '100% bawełna', '55% len, 45% wiskoza'], weight: 450 },

  // --- Kurtki i płaszcze
  'denim-jacket': { category: 'jackets-coats', noun: ['Kurtka jeansowa', 'f'], price: [199, 349], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna (denim)', '99% bawełna, 1% elastan (denim)'], weight: 800 },
  'leather-jacket': { category: 'jackets-coats', noun: ['Kurtka ze skóry ekologicznej', 'f'], price: [249, 449], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['skóra ekologiczna (100% poliuretan), podszewka 100% poliester'], weight: 1000 },
  bomber: { category: 'jackets-coats', noun: ['Kurtka bomber', 'f'], price: [229, 399], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% poliamid, ocieplina 100% poliester', '100% poliester, podszewka 100% poliester'], weight: 800 },
  jacket: { category: 'jackets-coats', noun: ['Kurtka przejściowa', 'f'], price: [249, 449], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna', '65% poliester, 35% bawełna', '100% poliamid'], weight: 850 },
  puffer: { category: 'jackets-coats', noun: ['Kurtka pikowana', 'f'], price: [299, 599], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% poliamid, ocieplina 100% poliester', '100% poliester, ocieplina 100% poliester'], weight: 1100 },
  parka: { category: 'jackets-coats', noun: ['Parka', 'f'], price: [399, 699], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna, podszewka 100% poliester', '65% poliester, 35% bawełna, ocieplina 100% poliester'], weight: 1400 },
  coat: { category: 'jackets-coats', noun: ['Płaszcz', 'm'], price: [399, 899], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['60% wełna, 40% poliester', '50% wełna, 50% poliester', '80% wełna, 20% poliamid', '100% poliester'], weight: 1500 },
  trench: { category: 'jackets-coats', noun: ['Trencz', 'm'], price: [349, 699], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% bawełna', '65% poliester, 35% bawełna'], weight: 1000 },
  blazer: { category: 'jackets-coats', noun: ['Marynarka', 'f'], price: [249, 499], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['64% poliester, 34% wiskoza, 2% elastan', '55% len, 45% wiskoza', '70% wełna, 30% poliester', '100% bawełna'], weight: 700 },
  vest: { category: 'jackets-coats', noun: ['Kamizelka', 'f'], price: [159, 299], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% poliamid, ocieplina 100% poliester', '100% bawełna', '100% poliester (polar)'], weight: 500 },
  raincoat: { category: 'jackets-coats', noun: ['Kurtka przeciwdeszczowa', 'f'], price: [199, 349], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% poliester z powłoką PU', '100% poliamid z powłoką PU'], weight: 600 },

  // --- Odzież sportowa
  'sports-top': { category: 'sportswear', noun: ['Top sportowy', 'm'], price: [79, 149], sizes: { w: 'alpha-w' }, materials: ['78% poliamid, 22% elastan', '88% poliester, 12% elastan'], weight: 150 },
  'sports-leggings': { category: 'sportswear', noun: ['Legginsy sportowe', 'pl'], price: [99, 189], sizes: { w: 'alpha-w', m: 'alpha-m' }, materials: ['78% poliamid, 22% elastan', '75% poliester, 25% elastan'], weight: 250 },
  'sports-shirt': { category: 'sportswear', noun: ['Koszulka treningowa', 'f'], price: [79, 149], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% poliester', '88% poliester, 12% elastan'], weight: 160 },
  'track-jacket': { category: 'sportswear', noun: ['Bluza treningowa', 'f'], price: [149, 249], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% poliester', '88% poliester, 12% elastan', '80% bawełna, 20% poliester'], weight: 400 },
  'sports-shorts': { category: 'sportswear', noun: ['Spodenki sportowe', 'pl'], price: [69, 139], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% poliester', '88% poliester, 12% elastan'], weight: 150 },
  'track-pants': { category: 'sportswear', noun: ['Spodnie treningowe', 'pl'], price: [119, 199], sizes: { w: 'alpha-w', m: 'alpha-m', u: 'alpha-u' }, materials: ['100% poliester', '88% poliester, 12% elastan', '80% bawełna, 20% poliester'], weight: 380 },

  // --- Akcesoria modowe
  beanie: { category: 'accessories', noun: ['Czapka beanie', 'f'], price: [49, 99], sizes: { w: 'one', m: 'one', u: 'one' }, materials: ['100% akryl', '50% wełna, 50% akryl', '100% wełna merino', '100% bawełna'], weight: 90 },
  cap: { category: 'accessories', noun: ['Czapka z daszkiem', 'f'], price: [59, 119], sizes: { w: 'one', m: 'one', u: 'one' }, materials: ['100% bawełna', '100% poliester'], weight: 110 },
  hat: { category: 'accessories', noun: ['Kapelusz', 'm'], price: [99, 199], sizes: { w: 'hat', m: 'hat', u: 'hat' }, materials: ['100% wełna (filc)', '100% słoma papierowa', '100% bawełna'], weight: 150 },
  scarf: { category: 'accessories', noun: ['Szalik', 'm'], price: [69, 179], sizes: { w: 'one', m: 'one', u: 'one' }, materials: ['100% akryl', '50% wełna, 50% akryl', '100% wiskoza', '100% wełna merino'], weight: 200 },
  bag: { category: 'accessories', noun: ['Torba', 'f'], price: [149, 399], sizes: { w: 'one', m: 'one', u: 'one' }, materials: ['skóra ekologiczna (100% poliuretan)', '100% bawełna (canvas)', '100% poliester'], weight: 600 },
  backpack: { category: 'accessories', noun: ['Plecak', 'm'], price: [149, 349], sizes: { w: 'one', m: 'one', u: 'one' }, materials: ['100% poliester', '100% bawełna (canvas)', '100% nylon'], weight: 700 },
  sunglasses: { category: 'accessories', noun: ['Okulary przeciwsłoneczne', 'pl'], price: [89, 249], sizes: { w: 'one', m: 'one', u: 'one' }, materials: ['oprawki z acetatu', 'metalowe oprawki'], weight: 60 },
  belt: { category: 'accessories', noun: ['Pasek', 'm'], price: [79, 179], sizes: { w: 'one', m: 'one', u: 'one' }, materials: ['skóra bydlęca', 'skóra ekologiczna (100% poliuretan)', '100% bawełna (taśma)'], weight: 150 },
  gloves: { category: 'accessories', noun: ['Rękawiczki', 'pl'], price: [59, 129], sizes: { w: 'gloves', m: 'gloves', u: 'gloves' }, materials: ['100% akryl', '50% wełna, 50% akryl', 'skóra ekologiczna (100% poliuretan)'], weight: 100 },
}

// Colour adjectives in the forms needed for agreement with the noun.
// `phrase` colours are invariable and follow the noun ("w paski").
export const COLORS = {
  black: { m: 'czarny', f: 'czarna', pl: 'czarne' },
  white: { m: 'biały', f: 'biała', pl: 'białe' },
  cream: { m: 'kremowy', f: 'kremowa', pl: 'kremowe' },
  ecru: { m: 'ecru', f: 'ecru', pl: 'ecru', invariable: true },
  beige: { m: 'beżowy', f: 'beżowa', pl: 'beżowe' },
  camel: { m: 'karmelowy', f: 'karmelowa', pl: 'karmelowe' },
  brown: { m: 'brązowy', f: 'brązowa', pl: 'brązowe' },
  grey: { m: 'szary', f: 'szara', pl: 'szare' },
  lightgrey: { m: 'jasnoszary', f: 'jasnoszara', pl: 'jasnoszare' },
  graphite: { m: 'grafitowy', f: 'grafitowa', pl: 'grafitowe' },
  navy: { m: 'granatowy', f: 'granatowa', pl: 'granatowe' },
  blue: { m: 'niebieski', f: 'niebieska', pl: 'niebieskie' },
  lightblue: { m: 'błękitny', f: 'błękitna', pl: 'błękitne' },
  denimlight: { m: 'jasnoniebieski', f: 'jasnoniebieska', pl: 'jasnoniebieskie' },
  denimdark: { m: 'ciemnoniebieski', f: 'ciemnoniebieska', pl: 'ciemnoniebieskie' },
  green: { m: 'zielony', f: 'zielona', pl: 'zielone' },
  olive: { m: 'oliwkowy', f: 'oliwkowa', pl: 'oliwkowe' },
  khaki: { m: 'khaki', f: 'khaki', pl: 'khaki', invariable: true },
  bottle: { m: 'butelkowozielony', f: 'butelkowozielona', pl: 'butelkowozielone' },
  red: { m: 'czerwony', f: 'czerwona', pl: 'czerwone' },
  burgundy: { m: 'bordowy', f: 'bordowa', pl: 'bordowe' },
  pink: { m: 'różowy', f: 'różowa', pl: 'różowe' },
  coral: { m: 'koralowy', f: 'koralowa', pl: 'koralowe' },
  teal: { m: 'turkusowy', f: 'turkusowa', pl: 'turkusowe' },
  mint: { m: 'miętowy', f: 'miętowa', pl: 'miętowe' },
  powder: { m: 'pudroworóżowy', f: 'pudroworóżowa', pl: 'pudroworóżowe' },
  yellow: { m: 'żółty', f: 'żółta', pl: 'żółte' },
  mustard: { m: 'musztardowy', f: 'musztardowa', pl: 'musztardowe' },
  orange: { m: 'pomarańczowy', f: 'pomarańczowa', pl: 'pomarańczowe' },
  rust: { m: 'rdzawy', f: 'rdzawa', pl: 'rdzawe' },
  purple: { m: 'fioletowy', f: 'fioletowa', pl: 'fioletowe' },
  lilac: { m: 'liliowy', f: 'liliowa', pl: 'liliowe' },
  silver: { m: 'srebrny', f: 'srebrna', pl: 'srebrne' },
  gold: { m: 'złoty', f: 'złota', pl: 'złote' },
  striped: { phrase: 'w paski' },
  checked: { phrase: 'w kratę' },
  floral: { phrase: 'w kwiaty' },
  dotted: { phrase: 'w kropki' },
  print: { phrase: 'z nadrukiem' },
  pattern: { phrase: 'we wzory' },
  camo: { phrase: 'w moro' },
  houndstooth: { phrase: 'w pepitkę' },
  multicolor: { phrase: 'wielokolorowy', agree: { m: 'wielokolorowy', f: 'wielokolorowa', pl: 'wielokolorowe' } },
}
