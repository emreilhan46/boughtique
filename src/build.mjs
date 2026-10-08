/**
 * Boughtique static build.
 *
 * Zero runtime dependencies. `node src/build.mjs` emits a complete static site
 * into dist/, ready for GitHub Pages (or any static host / CDN).
 *
 * Page definitions live here so the route table is readable in one screen.
 */

import { mkdir, writeFile, rm, cp, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadData, byGender, bySneakers, byDeals, byUnder100 } from './lib/data.mjs';
import { SITE } from './lib/layout.mjs';
import * as P from './pages.mjs';
import { pages as prosePages } from './content.mjs';
import { writeArt } from '../scripts/generate-art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const HOME = { href: '/', label: 'Home' };

async function emit(routePath, html) {
  const rel =
    routePath === '/'
      ? 'index.html'
      : routePath.endsWith('.html')
        ? routePath.slice(1)
        : path.join(routePath.slice(1), 'index.html');
  const file = path.join(DIST, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
  return routePath;
}

async function build() {
  const t0 = Date.now();
  const data = await loadData();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  /** @type {Array<{path:string, priority:number, index:boolean}>} */
  const routes = [];
  const page = async (p, html, { priority = 0.6, index = true } = {}) => {
    await emit(p, html);
    routes.push({ path: p, priority, index });
  };

  /* --- core ------------------------------------------------------------- */
  await page('/', P.home(data), { priority: 1.0 });
  await page('/search/', P.search(data), { priority: 0.7 });
  await page('/saved/', P.savedPage(), { index: false });

  /* --- listings ---------------------------------------------------------- */
  const listings = [
    {
      path: '/women/',
      label: 'Women',
      eyebrow: 'Women',
      title: "Women's fashion",
      lede: 'Womenswear routes across European retail — from Scandinavian essentials to designer sale sections.',
      items: byGender(data.items, 'women'),
      metaTitle: "Women's fashion deals and discovery — Boughtique",
      metaDescription:
        "Discover women's fashion across Zalando, ARKET, COS, UNIQLO, Nike, adidas, Mytheresa and Farfetch. Search, filter and go straight to the retailer.",
      showGender: false,
      priority: 0.9,
    },
    {
      path: '/men/',
      label: 'Men',
      eyebrow: 'Men',
      title: "Men's fashion",
      lede: 'Menswear routes across European retail — overshirts, tailoring, trainers and the designer end.',
      items: byGender(data.items, 'men'),
      metaTitle: "Men's fashion deals and discovery — Boughtique",
      metaDescription:
        "Discover men's fashion across Zalando, ARKET, COS, UNIQLO, Nike, adidas, Mytheresa and Farfetch. Search, filter and go straight to the retailer.",
      showGender: false,
      priority: 0.9,
    },
    {
      path: '/sneakers/',
      label: 'Sneakers',
      eyebrow: 'Sneakers',
      title: 'Sneakers',
      lede: 'Terrace classics, running archive and clean white leather — first-party and multi-brand.',
      items: bySneakers(data.items),
      metaTitle: 'Sneaker deals and discovery — Boughtique',
      metaDescription:
        'Find sneakers across Nike, adidas and Zalando — lifestyle silhouettes and the retailers’ own sale sections.',
      priority: 0.9,
    },
    {
      path: '/deals/',
      label: 'Deals',
      eyebrow: 'Deals',
      title: 'Deals worth seeing',
      lede: "Every route here is a retailer's own sale or outlet section. We publish no discount figure we cannot verify — the retailer's page is the source of truth.",
      items: byDeals(data.items),
      metaTitle: 'Fashion deals and sale sections — Boughtique',
      metaDescription:
        'Live sale and outlet sections from Nike, adidas, COS, ARKET, UNIQLO, Mytheresa and Farfetch, in one place.',
      priority: 0.9,
    },
    {
      path: '/under-100/',
      label: 'Under €100',
      eyebrow: 'Under €100',
      title: 'Under €100',
      lede: 'Entry points where the assortment genuinely sits at the accessible end. Individual prices are set by the retailer.',
      items: byUnder100(data.items),
      metaTitle: 'Fashion under €100 — Boughtique',
      metaDescription:
        'Accessible fashion routes under €100 — engineered basics and everyday essentials from European retailers.',
      priority: 0.8,
    },
  ];

  for (const l of listings) {
    await page(
      l.path,
      P.listing({
        path: l.path,
        eyebrow: l.eyebrow,
        title: l.title,
        lede: l.lede,
        items: l.items,
        metaTitle: l.metaTitle,
        metaDescription: l.metaDescription,
        showGender: l.showGender,
        trail: [HOME, { href: l.path, label: l.label }],
      }),
      { priority: l.priority }
    );
  }

  /* --- brands ------------------------------------------------------------ */
  await page('/brands/', P.brandsIndex(data), { priority: 0.7 });
  for (const brand of data.brands) {
    await page(`/brands/${P.slug(brand)}/`, P.brandPage(data, brand), { priority: 0.7 });
  }

  /* --- retailers --------------------------------------------------------- */
  await page('/retailers/', P.retailersIndex(data), { priority: 0.7 });
  for (const retailer of data.retailers) {
    await page(`/retailers/${retailer.id}/`, P.retailerPage(data, retailer), { priority: 0.6 });
  }

  /* --- prose ------------------------------------------------------------- */
  for (const p of prosePages) {
    await page(p.path, P.prose(p), { priority: 0.4 });
  }

  /* --- 404 --------------------------------------------------------------- */
  await emit('/404.html', P.notFound());

  /* --- static assets ------------------------------------------------------
     Editorial artwork is generated, not stored: keeping it out of git means
     there are no binary/SVG blobs to review and the palette can change in one
     place. Rasterised PNGs (og/icons) are produced by scripts/generate-raster.mjs. */
  await cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
  await writeArt(DIST);
  await cp(path.join(ROOT, 'public'), DIST, { recursive: true });

  /* --- catalogue API artifact --------------------------------------------
     Consumed by client-side search and the saved page. Mirrors the response
     shape a future product API will return, so the swap is one URL change. */
  await mkdir(path.join(DIST, 'api'), { recursive: true });
  await writeFile(
    path.join(DIST, 'api/catalog.json'),
    JSON.stringify({
      schema_version: data.schema_version,
      generated_at: new Date().toISOString(),
      count: data.items.length,
      items: data.items,
    })
  );

  /* --- robots + sitemap --------------------------------------------------- */
  const lastmod = new Date().toISOString().slice(0, 10);
  const indexable = routes.filter((r) => r.index).sort((a, b) => b.priority - a.priority);

  await writeFile(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map(
    (r) =>
      `  <url><loc>${SITE.url}${r.path}</loc><lastmod>${lastmod}</lastmod><changefreq>${
        r.priority >= 0.8 ? 'daily' : 'weekly'
      }</changefreq><priority>${r.priority.toFixed(1)}</priority></url>`
  )
  .join('\n')}
</urlset>
`
  );

  await writeFile(
    path.join(DIST, 'robots.txt'),
    `# Boughtique
User-agent: *
Allow: /
Disallow: /saved/
Disallow: /api/

Sitemap: ${SITE.url}/sitemap.xml
`
  );

  const files = await countFiles(DIST);
  console.log(
    `Built ${routes.length + 1} pages, ${files} files → dist/ in ${Date.now() - t0}ms`
  );
}

async function countFiles(dir) {
  let n = 0;
  for (const entry of await readdir(dir)) {
    const p = path.join(dir, entry);
    const s = await stat(p);
    n += s.isDirectory() ? await countFiles(p) : 1;
  }
  return n;
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
