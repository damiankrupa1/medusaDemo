// Target assortment and the mix used for products that have no reviewed
// photo yet. Those products are fully specified (title, description, sizes,
// price) but imported as drafts and listed in report.md as missing a photo,
// so they never show up in the storefront without an image.

// Products per category in the 1000-product catalog.
export const CATEGORY_TARGETS = {
  't-shirts-tops': 120,
  shirts: 100,
  sweatshirts: 90,
  'sweaters-cardigans': 110,
  pants: 120,
  skirts: 60,
  dresses: 110,
  'jackets-coats': 140,
  sportswear: 70,
  accessories: 80,
}

// Relative weights of garment types within a category, and the share of
// women's products (the rest are men's; accessories may be unisex).
export const CATEGORY_MIX = {
  't-shirts-tops': { women: 0.6, types: { tshirt: 4, longsleeve: 2, tank: 1.5, polo: 1.5, top: 1.5, croptop: 1 } },
  shirts: { women: 0.5, types: { shirt: 4, blouse: 2.5, flannel: 1.5, 'denim-shirt': 1, 'linen-shirt': 1.5 } },
  sweatshirts: { women: 0.5, types: { hoodie: 4, sweatshirt: 3, 'zip-hoodie': 2 } },
  'sweaters-cardigans': { women: 0.6, types: { sweater: 4, turtleneck: 2, cardigan: 3, 'knit-vest': 1 } },
  pants: { women: 0.55, types: { jeans: 4, chinos: 2, trousers: 2, joggers: 1.5, shorts: 1, 'wide-pants': 1.5 } },
  skirts: { women: 1, types: { skirt: 1 } },
  dresses: { women: 1, types: { dress: 6, jumpsuit: 1 } },
  'jackets-coats': { women: 0.55, types: { coat: 3, puffer: 2, parka: 1.5, 'denim-jacket': 1.5, 'leather-jacket': 1.5, bomber: 1, trench: 1.5, blazer: 2, jacket: 1.5, vest: 1, raincoat: 1 } },
  sportswear: { women: 0.6, types: { 'sports-leggings': 3, 'sports-top': 2, 'sports-shirt': 2, 'track-jacket': 1.5, 'sports-shorts': 1.5, 'track-pants': 1.5 } },
  accessories: { women: 0.4, unisex: 0.3, types: { beanie: 2, cap: 1.5, hat: 1.5, scarf: 2, bag: 2, backpack: 1.5, belt: 1.5, gloves: 1, sunglasses: 1 } },
}

const NEUTRALS = ['black', 'white', 'grey', 'lightgrey', 'graphite', 'navy', 'beige', 'cream', 'ecru', 'camel', 'brown']
const SEASONAL = ['olive', 'khaki', 'bottle', 'burgundy', 'rust', 'mustard', 'powder', 'lightblue', 'blue', 'green', 'red', 'pink', 'lilac', 'coral', 'teal', 'mint', 'yellow']

// Colours that make sense per garment type (photo-less products only).
export const TYPE_COLORS = {
  default: [...NEUTRALS, ...NEUTRALS, ...SEASONAL],
  jeans: ['denimlight', 'denimdark', 'blue', 'black', 'grey'],
  'denim-jacket': ['denimlight', 'denimdark', 'blue', 'black'],
  'denim-shirt': ['denimlight', 'blue', 'denimdark'],
  shirt: ['white', 'white', 'lightblue', 'navy', 'striped', 'checked', 'beige', 'black', 'olive', 'pink'],
  blouse: ['white', 'cream', 'black', 'powder', 'floral', 'dotted', 'navy', 'lilac', 'mint', 'mustard'],
  flannel: ['checked'],
  'linen-shirt': ['white', 'beige', 'lightblue', 'olive', 'ecru', 'khaki'],
  dress: ['black', 'navy', 'floral', 'dotted', 'bottle', 'burgundy', 'beige', 'powder', 'white', 'olive', 'lightblue', 'striped', 'red', 'rust'],
  skirt: ['black', 'navy', 'beige', 'camel', 'floral', 'checked', 'bottle', 'burgundy', 'olive', 'powder', 'grey'],
  'leather-jacket': ['black', 'brown', 'camel', 'burgundy'],
  trench: ['beige', 'camel', 'black', 'olive', 'navy'],
  coat: ['camel', 'black', 'grey', 'navy', 'beige', 'brown', 'checked', 'burgundy', 'cream', 'bottle'],
  puffer: ['black', 'navy', 'olive', 'cream', 'graphite', 'burgundy', 'beige', 'khaki'],
  parka: ['olive', 'khaki', 'black', 'navy', 'beige'],
  bag: ['black', 'brown', 'camel', 'beige', 'cream', 'burgundy'],
  belt: ['black', 'brown', 'camel'],
  sunglasses: ['black', 'brown', 'gold', 'silver'],
  'sports-leggings': ['black', 'graphite', 'navy', 'bottle', 'burgundy', 'powder', 'lilac', 'olive'],
}

// Optional features per type: [token, probability]. Only ever describe a
// cut/detail, never a claim about origin, certification or reviews.
export const TYPE_TOKENS = {
  tshirt: [['oversize', 0.3], ['crew', 0.4], ['vneck', 0.15], ['slim', 0.15]],
  longsleeve: [['ribbed', 0.3], ['crew', 0.3], ['slim', 0.2]],
  polo: [['slim', 0.3], ['regular', 0.3]],
  shirt: [['slim', 0.3], ['regular', 0.3], ['oversize', 0.2], ['pockets', 0.2]],
  blouse: [['puff', 0.15], ['collar', 0.2], ['oversize', 0.2]],
  'linen-shirt': [['relaxed', 0.4], ['regular', 0.2]],
  hoodie: [['oversize', 0.3], ['pockets', 0.3]],
  sweatshirt: [['oversize', 0.3], ['crew', 0.3]],
  sweater: [['cable', 0.25], ['vneck', 0.2], ['crew', 0.25], ['oversize', 0.2], ['ribbed', 0.15]],
  cardigan: [['buttons', 0.5], ['long', 0.2], ['oversize', 0.2]],
  turtleneck: [['ribbed', 0.3], ['slim', 0.3]],
  jeans: [['straight', 0.35], ['slim', 0.2], ['skinny', 0.15], ['wideleg', 0.15], ['mom', 0.1], ['highwaist', 0.3]],
  chinos: [['slim', 0.4], ['regular', 0.3]],
  trousers: [['wideleg', 0.3], ['straight', 0.3], ['highwaist', 0.3], ['slim', 0.2]],
  'wide-pants': [['highwaist', 0.6], ['pleated', 0.2]],
  joggers: [['pockets', 0.4], ['relaxed', 0.3]],
  skirt: [['mini', 0.25], ['midi', 0.45], ['maxi', 0.2], ['pleated', 0.25], ['flared', 0.2], ['buttons', 0.1]],
  dress: [['midi', 0.4], ['maxi', 0.25], ['mini', 0.2], ['straps', 0.25], ['wrap', 0.15], ['shirtstyle', 0.15], ['belt', 0.2], ['knitted', 0.1], ['longsl', 0.15]],
  jumpsuit: [['belt', 0.4], ['wideleg', 0.3], ['straps', 0.2]],
  coat: [['long', 0.4], ['doublebreasted', 0.3], ['belt', 0.25]],
  puffer: [['hood', 0.5], ['long', 0.3]],
  parka: [['hood', 0.8], ['fauxfur', 0.3]],
  trench: [['belt', 0.7], ['doublebreasted', 0.4]],
  blazer: [['slim', 0.3], ['oversize', 0.3], ['doublebreasted', 0.2]],
  bomber: [['zip', 0.5]],
  jacket: [['hood', 0.3], ['zip', 0.4], ['pockets', 0.3]],
  vest: [['quilted', 0.5], ['zip', 0.3]],
  raincoat: [['hood', 0.8], ['zip', 0.3]],
  'track-jacket': [['zip', 0.6]],
  'sports-leggings': [['highwaist', 0.5]],
  beanie: [['ribbed', 0.3], ['pompom', 0.25], ['cable', 0.2]],
  hat: [['felt', 0.5], ['straw', 0.3]],
  scarf: [['knitted', 0.4], ['wool', 0.2]],
  bag: [['ecoleather', 0.5], ['canvas', 0.3]],
}
