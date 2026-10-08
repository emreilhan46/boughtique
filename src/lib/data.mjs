/**
 * Data access layer.
 *
 * This is the ONLY place that knows where Boughtique data comes from.
 * Today it reads static JSON at build time. When automated ingestion lands,
 * `loadCatalog()` becomes an HTTP call against the product API and returns the
 * same normalized shape — no template or UI change required.
 *
 * See docs/ARCHITECTURE.md.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const readJson = async (rel) => JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));

/** Plates are abstract editorial artwork, never a representation of a product. */
const PLATE_COUNT = 8;
const plateFor = (id) => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `/assets/img/plate-${(h % PLATE_COUNT) + 1}.svg`;
};

export const PRICE_BANDS = {
  value: { label: 'Under €100', order: 1, note: 'Assortment sits mostly below €100' },
  mid: { label: 'Contemporary', order: 2, note: 'Mainstream to premium high street' },
  premium: { label: 'Premium', order: 3, note: 'Elevated contemporary' },
  luxury: { label: 'Luxury', order: 4, note: 'Designer and luxury houses' },
};

export const GENDER_LABEL = { women: 'Women', men: 'Men', unisex: 'All' };

/**
 * Search synonym expansion.
 *
 * Shoppers and retailers use different words for the same thing ("trainers" vs
 * "sneakers", "jacket" vs "outerwear"). We expand the indexed haystack at build
 * time rather than expanding the query at runtime: it keeps client-side search
 * to a single substring pass, and it is the same table an AI query parser will
 * use later as its seed vocabulary.
 */
const SYNONYMS = {
  sneakers: ['trainers', 'kicks', 'white sneakers', 'shoes', 'footwear'],
  outerwear: ['jacket', 'jackets', 'coat', 'coats', 'overshirt', 'parka', 'blazer'],
  dresses: ['dress', 'midi', 'maxi'],
  shirts: ['shirt', 'overshirt', 'oxford', 'poplin'],
  knitwear: ['jumper', 'sweater', 'merino', 'wool'],
  minimal: ['minimalist', 'clean', 'quiet', 'plain', 'understated'],
  essentials: ['basics', 'staples', 'everyday'],
  scandinavian: ['nordic', 'swedish', 'danish'],
  tailoring: ['suit', 'trousers', 'blazer', 'smart'],
  luxury: ['designer', 'premium', 'high end'],
  sport: ['sportswear', 'athletic', 'running', 'performance'],
  'new-in': ['new in', 'new arrivals', 'latest'],
  sale: ['deal', 'deals', 'reduced', 'discount', 'outlet', 'markdown', 'offers'],
  clothing: ['clothes', 'apparel', 'wardrobe'],
};

const expand = (terms) =>
  terms.flatMap((t) => [t, ...(SYNONYMS[t] ?? [])]).filter(Boolean);

/**
 * Normalized record used by every template and by the client runtime.
 * Field names deliberately anticipate the future product schema; fields we
 * cannot honestly populate yet (price, discount, stock) are simply absent
 * rather than invented.
 */
function normalize(item, retailersById) {
  const retailer = retailersById.get(item.retailer);
  if (!retailer) throw new Error(`Unknown retailer "${item.retailer}" on item "${item.id}"`);

  const style = item.style ?? [];
  const tags = item.tags ?? [];
  const brand = item.brand ?? null;

  return {
    id: item.id,
    kind: 'destination',
    retailer: { id: retailer.id, name: retailer.name, price_band: retailer.price_band },
    brand,
    title: item.title,
    description: item.description,
    gender: item.gender,
    category: item.category,
    subcategory: item.subcategory,
    style,
    tags,
    price_band: item.price_band,
    deal: Boolean(item.deal),
    deal_basis: item.deal_basis ?? null,
    url: item.destination_url,
    image: plateFor(item.id),
    // Precomputed lowercase haystack: client-side search stays O(n) with no index build.
    search_text: [
      item.title,
      brand,
      retailer.name,
      item.description,
      item.gender,
      item.gender === 'women' ? "women's womenswear ladies" : '',
      item.gender === 'men' ? "men's menswear" : '',
      item.gender === 'unisex' ? "women's men's unisex" : '',
      ...expand([item.category, item.subcategory, ...style, ...tags]),
      item.deal ? 'deal deals sale reduced discount offers' : '',
      item.price_band === 'value' ? 'under 100 under €100 cheap affordable budget value' : '',
      item.price_band === 'luxury' ? 'premium designer luxury high end' : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

export async function loadData() {
  const [{ retailers }, catalog] = await Promise.all([
    readJson('data/retailers.json'),
    readJson('data/catalog.json'),
  ]);

  const retailersById = new Map(retailers.map((r) => [r.id, r]));
  const items = catalog.items.map((item) => normalize(item, retailersById));

  const brands = [...new Set(items.map((i) => i.brand).filter(Boolean))].sort();

  return {
    schema_version: catalog.schema_version,
    retailers,
    retailersById,
    items,
    brands,
    counts: {
      items: items.length,
      retailers: retailers.length,
      deals: items.filter((i) => i.deal).length,
      brands: brands.length,
    },
  };
}

/* ---------- selectors: pure, testable, reusable by a future API ---------- */

export const byGender = (items, gender) =>
  items.filter((i) => i.gender === gender || i.gender === 'unisex');

export const bySneakers = (items) => items.filter((i) => i.subcategory === 'sneakers');
export const byDeals = (items) => items.filter((i) => i.deal);
export const byUnder100 = (items) => items.filter((i) => i.price_band === 'value');
export const byStyle = (items, style) => items.filter((i) => i.style.includes(style));
export const byRetailer = (items, id) => items.filter((i) => i.retailer.id === id);
export const byBrand = (items, brand) => items.filter((i) => i.brand === brand);
