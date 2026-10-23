// English (en-US) copy - the base language of the Medusa catalog.
//
// Every pool here is the index-for-index counterpart of the Polish pool with
// the same name in copy.mjs: the generator draws one index per slot and uses
// it for both languages, so a product's English and Polish descriptions are
// translations of each other.
//
// Templates use:
//   {Name}  "The Mira cable-knit sweater" (sentence-initial)
//   {name}  "the Mira cable-knit sweater"
//   {color} "in cream", "with a floral print"
//   {composition} "70% cotton, 30% wool"
//   [[singular|plural]] chosen by the noun (jeans, leggings, gloves are plural)

export const NOUNS_EN = {
  tshirt: ['T-shirt'], longsleeve: ['Long-sleeve top'], tank: ['Tank top'], croptop: ['Crop top'], top: ['Top'], polo: ['Polo shirt'],
  shirt: ['Shirt'], blouse: ['Blouse'], flannel: ['Flannel shirt'], 'denim-shirt': ['Denim shirt'], 'linen-shirt': ['Linen shirt'],
  hoodie: ['Hoodie'], 'zip-hoodie': ['Zip-up hoodie'], sweatshirt: ['Sweatshirt'],
  sweater: ['Sweater'], turtleneck: ['Turtleneck'], cardigan: ['Cardigan'], 'knit-vest': ['Knit vest'],
  jeans: ['Jeans', 'pl'], trousers: ['Tailored pants', 'pl'], chinos: ['Chinos', 'pl'], shorts: ['Shorts', 'pl'], joggers: ['Joggers', 'pl'], 'wide-pants': ['Wide pants', 'pl'],
  skirt: ['Skirt'],
  dress: ['Dress'], jumpsuit: ['Jumpsuit'],
  'denim-jacket': ['Denim jacket'], 'leather-jacket': ['Faux leather jacket'], bomber: ['Bomber jacket'], jacket: ['Lightweight jacket'], puffer: ['Puffer jacket'], parka: ['Parka'], coat: ['Coat'], trench: ['Trench coat'], blazer: ['Blazer'], vest: ['Vest'], raincoat: ['Rain jacket'],
  'sports-top': ['Sports top'], 'sports-leggings': ['Workout leggings', 'pl'], 'sports-shirt': ['Workout T-shirt'], 'track-jacket': ['Track jacket'], 'sports-shorts': ['Athletic shorts', 'pl'], 'track-pants': ['Track pants', 'pl'],
  beanie: ['Beanie'], cap: ['Cap'], hat: ['Hat'], scarf: ['Scarf'], bag: ['Bag'], backpack: ['Backpack'], sunglasses: ['Sunglasses', 'pl'], belt: ['Belt'], gloves: ['Gloves', 'pl'],
}

// name: used in titles ("– light wash"); phrase: used in descriptions.
export const COLORS_EN = {
  black: { name: 'black' }, white: { name: 'white' }, cream: { name: 'cream' }, ecru: { name: 'ecru' },
  beige: { name: 'beige' }, camel: { name: 'camel' }, brown: { name: 'brown' }, grey: { name: 'gray' },
  lightgrey: { name: 'light gray' }, graphite: { name: 'charcoal' }, navy: { name: 'navy' }, blue: { name: 'blue' },
  lightblue: { name: 'light blue' },
  denimlight: { name: 'light wash', phrase: 'in a light wash' }, denimdark: { name: 'dark wash', phrase: 'in a dark wash' },
  green: { name: 'green' }, olive: { name: 'olive' }, khaki: { name: 'khaki' }, bottle: { name: 'bottle green' },
  red: { name: 'red' }, burgundy: { name: 'burgundy' }, pink: { name: 'pink' }, coral: { name: 'coral' },
  teal: { name: 'teal' }, mint: { name: 'mint' }, powder: { name: 'powder pink' }, yellow: { name: 'yellow' },
  mustard: { name: 'mustard' }, orange: { name: 'orange' }, rust: { name: 'rust' }, purple: { name: 'purple' },
  lilac: { name: 'lilac' }, silver: { name: 'silver' }, gold: { name: 'gold' },
  striped: { name: 'striped', phrase: 'with stripes' }, checked: { name: 'plaid', phrase: 'in plaid' },
  floral: { name: 'floral', phrase: 'with a floral print' }, dotted: { name: 'polka dot', phrase: 'with polka dots' },
  print: { name: 'print', phrase: 'with a print' }, pattern: { name: 'patterned', phrase: 'with an all-over pattern' },
  camo: { name: 'camo', phrase: 'in camo print' }, houndstooth: { name: 'houndstooth', phrase: 'in houndstooth' },
  multicolor: { name: 'multicolor', phrase: 'in multiple colors' },
}

// pre: modifier before the noun; post: phrase after it; say: sentences
// (same count and order as TOKENS[...].say in copy.mjs).
export const TOKENS_EN = {
  oversize: { pre: 'oversized', say: ['The oversized cut gives freedom of movement and a modern, relaxed look.', 'An oversized fit keeps the look easy but still neat.'] },
  slim: { pre: 'slim-fit', say: ['The slim fit follows the body without restricting movement.', 'A narrow, tailored cut works well under a blazer or coat.'] },
  regular: { pre: 'regular-fit', say: ['The classic regular fit sits comfortably without looking baggy.'] },
  relaxed: { pre: 'relaxed-fit', say: ['A relaxed fit keeps you comfortable all day.'] },
  straight: { pre: 'straight-leg', say: ['Straight legs suit most body types and shoes.', 'The straight leg looks as good with sneakers as with ankle boots.'] },
  wideleg: { pre: 'wide-leg', say: ['Wide legs visually lengthen the silhouette and add lightness.', 'The wide-leg cut is comfortable and looks great with a fitted top.'] },
  skinny: { pre: 'skinny', say: ['Skinny legs hug the body and pair well with longer sweaters.'] },
  mom: { pre: 'mom-fit', say: ['The mom fit, roomier at the hips and tapered at the ankle, nods to the 90s.'] },
  highwaist: { pre: 'high-waisted', say: ['The high waist defines the waistline and works well with a tucked-in top.'] },
  distressed: { pre: 'distressed', say: ['Subtle distressing adds a casual touch.'] },
  hood: { pre: 'hooded', say: ['The drawstring hood comes in handy on windy days.', 'A generous hood protects from cold and wind.'] },
  zip: { pre: 'zip-up', say: ['The zip fastening makes it easy to adjust to the temperature.', 'A smooth zip makes it quick to put on and take off.'] },
  buttons: { pre: 'button-up', say: ['The button fastening lets you wear it open or closed.'] },
  vneck: { pre: 'V-neck', say: ['The V-neckline visually lengthens the neck.'] },
  crew: { pre: 'crew-neck', say: ['The classic crew neck works on its own and under a shirt or blazer.'] },
  turtle: { pre: 'roll-neck', say: ['The high roll neck keeps your neck warm and replaces a scarf on cooler days.'] },
  longsl: { pre: 'long-sleeve', say: ['Long sleeves are handy on transitional days.'] },
  shortsl: { pre: 'short-sleeve', say: ['Short sleeves make it a good choice for warm days.'] },
  sleeveless: { pre: 'sleeveless', say: ['The sleeveless cut keeps you cool on hot days.'] },
  straps: { pre: 'strappy', say: ['Thin straps add lightness and look great with a jacket thrown over.'] },
  belt: { pre: 'belted', say: ['A tie belt lets you define the waist.', 'The belt at the waist helps adjust the fit to your figure.'] },
  pockets: { post: 'with pockets', say: ['Practical pockets hold your phone and keys.', 'Roomy pockets are a handy everyday detail.'] },
  cable: { pre: 'cable-knit', say: ['The cable knit adds texture and warmth.', 'A bold cable pattern gives a classic shape more character.'] },
  ribbed: { pre: 'ribbed', say: ['The ribbed texture drapes nicely on the body.'] },
  collar: { pre: 'collared', say: ['The collar adds a neat finishing touch.'] },
  mini: { pre: 'mini', say: ['The mini length looks great with flat shoes and ankle boots.'] },
  midi: { pre: 'midi', say: ['The midi length falls below the knee and works in every season.'] },
  maxi: { pre: 'maxi', say: ['The maxi length creates a long, flowing line.'] },
  doublebreasted: { pre: 'double-breasted', say: ['The double-breasted fastening gives it a classic, elegant feel.'] },
  corduroy: { pre: 'corduroy', say: ['Corduroy has a soft, velvety hand and an interesting texture.'] },
  quilted: { pre: 'quilted', say: ['Quilting keeps the padding evenly distributed.'] },
  pleated: { pre: 'pleated', say: ['The pleats move beautifully with every step.'] },
  flared: { pre: 'flared', say: ['The flared hem adds lightness and a feminine feel.'] },
  wrap: { pre: 'wrap', say: ['The wrap cut is easy to adjust to your figure.'] },
  shirtstyle: { pre: 'shirt', say: ['The shirt-style cut with a collar looks neat and relaxed at the same time.'] },
  knitted: { pre: 'knit', say: ['The soft knit feels pleasant and does not restrict movement.'] },
  long: { pre: 'long', say: ['The longer length offers better protection from the cold.'] },
  short: { pre: 'short', say: ['The shorter length looks great with high-waisted bottoms.'] },
  lace: { pre: 'lace-trim', say: ['Lace details add a delicate touch.'] },
  fauxfur: { post: 'with faux fur trim', say: ['The faux fur trim adds warmth and softness.'] },
  puff: { pre: 'puff-sleeve', say: ['Puff sleeves add a romantic touch.'] },
  graphic: { pre: 'graphic', say: ['The front print livens up a simple shape.'] },
  pompom: { pre: 'pompom', say: ['The pompom on top adds a playful touch.'] },
  straw: { pre: 'straw', say: ['The light weave lets air through on hot days.'] },
  felt: { pre: 'felt', say: ['The firmer felt holds the shape of the brim well.'] },
  crochet: { pre: 'crochet', say: ['The openwork crochet stitch gives it a handmade feel.'] },
  linen: { pre: 'linen', say: [] },
  wool: { pre: 'wool', say: [] },
  denim: { pre: 'denim', say: [] },
  ecoleather: { pre: 'faux leather', say: [] },
  canvas: { pre: 'canvas', say: [] },
  logo: { pre: null, say: [] },
}

// English adjective order for title modifiers: waist, fit, length, style,
// neckline/closure, material/texture - and "shirt" (shirt dress) last.
const PRE_ORDER = [
  ['high-waisted'],
  ['oversized', 'slim-fit', 'regular-fit', 'relaxed-fit', 'skinny', 'mom-fit', 'wide-leg', 'straight-leg'],
  ['mini', 'midi', 'maxi', 'long', 'short'],
  ['wrap', 'pleated', 'flared', 'double-breasted', 'belted', 'strappy', 'sleeveless', 'long-sleeve', 'short-sleeve', 'puff-sleeve', 'collared', 'distressed', 'quilted', 'graphic'],
  ['V-neck', 'crew-neck', 'roll-neck', 'button-up', 'zip-up', 'hooded'],
  ['cable-knit', 'ribbed', 'knit', 'corduroy', 'lace-trim', 'crochet', 'straw', 'felt', 'linen', 'wool', 'denim', 'faux leather', 'canvas', 'pompom'],
  ['shirt'],
]
const PRE_RANK = new Map(PRE_ORDER.flatMap((group, rank) => group.map((word) => [word, rank])))

export function orderEnglishModifiers(words) {
  return [...words].sort((a, b) => (PRE_RANK.get(a) ?? 3) - (PRE_RANK.get(b) ?? 3))
}

export const INTRO_EN = {
  tops: [
    '{Name} {color} is an easy everyday essential.',
    '{Name} {color} pairs effortlessly with jeans, skirts and tailored pants.',
    'Simple in shape and carefully finished, {name} {color} works every day of the week.',
    'Weekdays or weekends, {name} {color} fits into almost any wardrobe.',
    '{Name} {color} is the kind of piece you reach for again and again.',
    'Light and comfortable, {name} {color} looks good on its own or layered under a sweater.',
    'A classic with a modern feel: {name} {color}.',
    '{Name} {color} is made for anyone who values comfort and clean lines.',
  ],
  shirts: [
    '{Name} {color} works at the office and for relaxed plans after work.',
    '{Name} {color} is a timeless wardrobe piece that adapts to the occasion.',
    'Neat but never stiff, {name} {color} looks great tucked in or worn loose.',
    '{Name} {color} makes it easy to put together a smart or a casual outfit.',
    '{Name} {color} is the pick for days when you want to look polished without trying too hard.',
    'Versatile and comfortable, {name} {color} takes you from Monday to the weekend.',
    '{Name} {color} adds a light touch to any outfit.',
  ],
  sweats: [
    '{Name} {color} is a comfortable choice for chilly mornings and lazy weekends.',
    'Soft and warm, {name} {color} is great for walks, travel and staying in.',
    '{Name} {color} combines a sporty feel with everyday comfort.',
    'Campus, home office or a trip out of town – {name} {color} goes everywhere.',
    '{Name} {color} is a casual classic that never goes out of style.',
    'Pleasantly soft, {name} {color} quickly becomes the layer you reach for first.',
    'Comfort first: {name} {color} looks great with jeans and joggers alike.',
  ],
  knit: [
    '{Name} {color} is a warm layer for fall and winter.',
    'Soft to the touch, {name} {color} brings a cozy feel to cold days.',
    '{Name} {color} is a knitwear classic that looks good on its own or over a shirt.',
    'For colder days: {name} {color} combines comfort with a timeless look.',
    '{Name} {color} works at the office as well as on a weekend walk.',
    'Warm and elegant at the same time, {name} {color} is a piece for several seasons.',
    '{Name} {color} is a great starting point for a cozy layered outfit.',
  ],
  bottoms: [
    '{Name} {color} [[is|are]] a practical foundation of an everyday wardrobe.',
    '{Name} {color} [[is|are]] easy to pair with a T-shirt, a shirt or a sweater.',
    'Comfortable and versatile, {name} {color} [[works|work]] at the office and after hours.',
    '{Name} {color} [[is|are]] a cut you will come back to season after season.',
    'Every day or an evening out: {name} {color} [[suits|suit]] many outfits.',
    '{Name} {color} [[combines|combine]] comfort with a well-thought-out cut.',
    '{Name} {color} [[goes|go]] with relaxed and smarter looks alike.',
  ],
  skirts: [
    '{Name} {color} is a feminine choice for every day and evenings out.',
    '{Name} {color} looks lovely with a blouse, a sweater or a T-shirt.',
    'Light and comfortable, {name} {color} works at the office and on a weekend stroll.',
    '{Name} {color} adapts to the season – sandals in summer, ankle boots in fall.',
    '{Name} {color} makes it easy to look put-together without much effort.',
    '{Name} {color} adds a light touch to any outfit.',
  ],
  dresses: [
    '{Name} {color} is a complete outfit in a single piece.',
    '{Name} {color} works for everyday wear, the office and summer parties.',
    'Feminine and comfortable, {name} {color} is for days when you want to look good without overthinking it.',
    '{Name} {color} goes from day to evening – just change your shoes and accessories.',
    '{Name} {color} needs little styling – your favorite shoes are enough.',
    '{Name} {color} is a choice for warm days and special occasions.',
    'Airy and comfortable, {name} {color} will quickly become a wardrobe favorite.',
  ],
  outer: [
    '{Name} {color} is an outer layer that completes many outfits.',
    '{Name} {color} is ready for cooler days and changeable weather.',
    '{Name} {color} is a timeless investment for several seasons.',
    '{Name} {color} goes with smart and casual outfits alike.',
    'City, office or travel – {name} {color} keeps you company all season.',
    '{Name} {color} helps you look good even on a gray day.',
    '{Name} {color} is a practical and stylish choice for the transitional season.',
  ],
  sport: [
    '{Name} {color} [[is|are]] a comfortable choice for training, running and yoga.',
    '{Name} {color} [[moves|move]] with you and [[performs|perform]] well during any activity.',
    'Gym, mat or morning jog – {name} {color} [[is|are]] with you in every workout.',
    '{Name} {color} [[combines|combine]] functionality with a modern look.',
    'Light and stretchy, {name} {color} [[is|are]] a good pick for intense workouts.',
    '{Name} {color} [[works|work]] for training and active everyday outfits.',
  ],
  gloves: [
    '{Name} {color} are a warm accessory for cold days.',
    '{Name} {color} protect your hands from frost and wind.',
    'Soft and warm, {name} {color} are great for winter walks and the commute.',
  ],
  headwear: [
    '{Name} {color} is an accessory that finishes any outfit.',
    '{Name} {color} protects from the cold or the sun and adds character to your look.',
    'Simple and versatile, {name} {color} suits sporty and city outfits alike.',
    '{Name} {color} is a quick way to refresh an everyday outfit.',
  ],
  scarves: [
    '{Name} {color} is a warm accessory for cold days.',
    '{Name} {color} adds coziness to coats and jackets.',
    'Soft and warm, {name} {color} is great for fall and winter walks.',
    '{Name} {color} is a practical accessory that is easy to match with outerwear.',
  ],
  bags: [
    '{Name} {color} is a practical everyday accessory.',
    '{Name} {color} holds the essentials for work, class and shopping.',
    'Roomy and comfortable, {name} {color} is great in the city and on the go.',
    '{Name} {color} combines functionality with a simple, timeless look.',
  ],
  eyewear: [
    '{Name} {color} are an accessory that instantly adds character to an outfit.',
    '{Name} {color} are made for the city, the beach and travel.',
    'A timeless shape makes {name} {color} flattering on many face shapes.',
  ],
  belts: [
    '{Name} {color} is an accessory that finishes jeans and tailored pants alike.',
    '{Name} {color} lets you define the waist and complete the outfit.',
    'Simple and versatile, {name} {color} suits everyday and smarter outfits.',
  ],
}

export const STYLING_EN = {
  tops: [
    'Wear it with jeans and sneakers or under an open shirt.',
    'Looks great with a blazer and chinos.',
    'Pair it with wide-leg pants and sneakers for a relaxed city look.',
    'Goes well with a midi skirt and white sneakers.',
    'On cooler days, throw a cardigan or a denim jacket over it.',
    'Tuck it into high-waisted pants and add a belt.',
  ],
  shirts: [
    'Wear it tucked into tailored pants or loose over jeans.',
    'Worn open, it doubles as a light jacket over a T-shirt.',
    'Looks great with chinos and loafers.',
    'Under a V-neck sweater it is ready for the office.',
    'With the sleeves rolled up it takes on a casual feel.',
    'Add a blazer for more formal occasions.',
  ],
  sweats: [
    'Wear it with jeans, joggers or shorts.',
    'Goes with sneakers and a backpack – perfect for the city.',
    'On colder days, layer a puffer jacket or a parka over it.',
    'Looks good with leggings and chunky socks.',
    'Pair it with a midi skirt and ankle boots for an interesting contrast.',
  ],
  knit: [
    'Wear it on its own with jeans or with a shirt collar peeking out.',
    'Looks great with a pleated skirt and ankle boots.',
    'Pair it with tailored pants and a coat for a smart look.',
    'Goes with wide pants and chunky shoes.',
    'For the weekend, pair it with jeans and sneakers.',
    'Under a coat it makes a warm and stylish layer.',
  ],
  bottoms: [
    'Pair them with a white T-shirt and sneakers for everyday wear.',
    'With a shirt and a blazer they are ready for the office.',
    'They look great with a sweater and ankle boots.',
    'Combine them with a hoodie and sneakers for a weekend look.',
    'They go with loafers, sandals and sneakers.',
    'Tuck in a shirt and add a leather belt.',
  ],
  skirts: [
    'Pair it with a tucked-in shirt and ballet flats.',
    'In fall, wear it with a chunky sweater, tights and ankle boots.',
    'In summer, combine it with a strappy top and sandals.',
    'Looks good with a T-shirt and white sneakers.',
    'With a blazer and pumps it is ready for the office.',
  ],
  dresses: [
    'For everyday wear, add sneakers and a denim jacket.',
    'For the evening, add heeled sandals and delicate jewelry.',
    'On cooler days, throw on a cardigan or a trench coat.',
    'Looks great with ankle boots and a leather jacket.',
    'With a blazer and loafers it works at the office.',
    'Add a belt to define the waist.',
  ],
  outer: [
    'Wear it over jeans and a sweater or with tailored pants.',
    'Looks good with a hoodie and sneakers.',
    'Pair it with a turtleneck and ankle boots for a fall look.',
    'Goes well with midi dresses and skirts.',
    'Add a scarf and a hat on colder days.',
    'Throw it over a blazer or a shirt on the way to work.',
  ],
  sport: [
    'Pair with leggings or shorts and your favorite running shoes.',
    'After the workout, add a hoodie and head home in comfort.',
    'Looks good outside the gym too – with jeans and sneakers.',
    'Great for fitness classes, yoga and home workouts.',
  ],
  headwear: [
    'Match the color to your jacket or scarf.',
    'Suits sporty and everyday outfits.',
    'Looks great with a coat as well as a hoodie.',
  ],
  gloves: [
    'Match them with a hat or a scarf in a similar shade.',
    'They go with a coat as well as a puffer jacket.',
  ],
  scarves: [
    'Wrap it twice around your neck or tie it loosely over a coat.',
    'Match it with a hat or gloves in a similar shade.',
    'Looks good with a puffer jacket and a wool coat.',
  ],
  bags: [
    'Suits everyday and smarter outfits.',
    'Looks good with a coat, a jacket and a dress.',
    'Great for the commute and weekend trips.',
  ],
  eyewear: [
    'They go with summer dresses, jeans and linen shirts.',
    'They look good in the city and on vacation.',
  ],
  belts: [
    'Wear it with jeans, chinos or at the waist of a dress.',
    'Match the color to your shoes or bag.',
  ],
}

export const MATERIAL_EN = {
  cotton: [
    'Made from {composition}, [[it feels|they feel]] soft and breathable.',
    'Composition: {composition}. Cotton is soft, breathable and easy to care for.',
    'The cotton fabric ({composition}) keeps you comfortable all day.',
    'Soft cotton ({composition}) is made for everyday wear.',
    'The fabric ({composition}) is gentle on the skin and does not trap heat.',
  ],
  wool: [
    'The knit ({composition}) holds warmth well and feels soft to the touch.',
    'Composition: {composition}. The wool blend adds warmth without extra bulk.',
    'The fabric ({composition}) is warm yet gentle on the skin.',
    'The warm knit ({composition}) is made for chilly days.',
  ],
  linen: [
    'Linen ({composition}) is breathable and ideal for hot days.',
    'Composition: {composition}. Natural creasing is part of the charm of linen.',
  ],
  viscose: [
    'The light, fluid fabric ({composition}) feels cool on warm days.',
    'Composition: {composition} – soft, smooth and beautifully draping.',
    'The smooth fabric ({composition}) drapes beautifully and moves with you.',
  ],
  denim: [
    'Durable denim ({composition}) develops its own character over time.',
    'Composition: {composition}. The denim is sturdy and comfortable to wear.',
  ],
  synthetic: [
    'Composition: {composition}. The fabric is light, dries quickly and keeps its shape.',
    'The fabric ({composition}) is durable and easy to care for.',
    'Composition: {composition} – a practical fabric that resists creasing when you travel.',
    'The lightweight fabric ({composition}) keeps its shape wash after wash.',
  ],
  ecoleather: [
    'Made from faux leather, [[it is|they are]] easy to keep clean. Composition: {composition}.',
    'Composition: {composition}. Faux leather has a smooth finish and needs no special care.',
  ],
  leather: [
    'Made from cowhide leather, [[it develops|they develop]] a fine patina over time.',
  ],
  frames: ['Frames: {composition}.'],
  hat: ['Material: {composition}.'],
}

export const CARE_EN = {
  cotton: ['Machine wash at 30–40°C, preferably inside out.', 'Wash at 30°C with similar colors.', 'Wash at 40°C and iron at a medium temperature.', 'We recommend washing at 30°C and air drying.'],
  wool: ['Hand wash or use a wool cycle and dry flat.', 'We recommend washing at 30°C on a wool cycle.', 'Hand wash in lukewarm water and do not wring.'],
  linen: ['Wash at 30°C and iron while slightly damp.'],
  viscose: ['Wash gently at 30°C, do not wring.', 'Hand wash or use a gentle cycle, iron inside out.'],
  denim: ['Wash inside out at 30°C to keep the color longer.', 'Wash rarely and inside out to preserve the denim color.'],
  synthetic: ['Wash at 30°C, do not tumble dry.', 'Wash at 30°C on a gentle cycle and hang to dry.'],
  ecoleather: ['Wipe clean with a damp cloth.'],
  leather: ['Wipe with a dry cloth and protect from moisture.'],
  frames: ['Store in a case and clean with a soft cloth.'],
  hat: ['Store in a dry place and avoid crushing.'],
}

// Composition strings are authored in Polish (garments.mjs); this turns them
// into English for the base Material field. Order matters ("bawełna" contains
// "wełna").
const MATERIAL_WORDS = [
  ['skóra ekologiczna', 'faux leather'],
  ['skóra bydlęca', 'cowhide leather'],
  ['oprawki z acetatu', 'acetate frames'],
  ['metalowe oprawki', 'metal frames'],
  ['słoma papierowa', 'paper straw'],
  ['poliester z recyklingu', 'recycled polyester'],
  ['wełna merino', 'merino wool'],
  ['bawełna', 'cotton'],
  ['wełna', 'wool'],
  ['poliester', 'polyester'],
  ['poliamid', 'polyamide'],
  ['poliuretan', 'polyurethane'],
  ['wiskoza', 'viscose'],
  ['elastan', 'elastane'],
  ['akryl', 'acrylic'],
  ['alpaka', 'alpaca'],
  ['podszewka', 'lining'],
  ['ocieplina', 'padding'],
  ['z powłoką PU', 'with PU coating'],
  ['piké', 'piqué'],
  ['flanela', 'flannel'],
  ['sztruks', 'corduroy'],
  ['taśma', 'webbing'],
  ['polar', 'fleece'],
  ['filc', 'felt'],
]

export function materialToEnglish(composition) {
  let text = composition
  for (const [pl, en] of MATERIAL_WORDS) text = text.split(pl).join(en)
  return text.replace(/\blen\b/g, 'linen')
}

export const OPTION_TITLE = { en: 'Size', pl: 'Rozmiar' }
export const ONE_SIZE = { en: 'One size', pl: 'Uniwersalny' }
