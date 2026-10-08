/**
 * Build verification. Runs against dist/ and fails the build on real problems.
 *
 *   npm test
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const HOST = 'https://boughtique.com';

const errors = [];
const warnings = [];
const fail = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

async function walk(dir, out = []) {
  for (const entry of await readdir(dir)) {
    const p = path.join(dir, entry);
    if ((await stat(p)).isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

const all = await walk(DIST);
const htmlFiles = all.filter((f) => f.endsWith('.html'));
const rel = (f) => path.relative(DIST, f);

if (!htmlFiles.length) fail('dist', 'no HTML produced');

for (const f of ['robots.txt', 'sitemap.xml', 'favicon.svg', '404.html', 'CNAME', 'site.webmanifest', 'api/catalog.json', 'assets/img/og.png']) {
  if (!(await exists(path.join(DIST, f)))) fail(f, 'missing from dist/');
}

const cname = await readFile(path.join(DIST, 'CNAME'), 'utf8').catch(() => '');
if (cname.trim() !== 'boughtique.com') fail('CNAME', `expected boughtique.com, got "${cname.trim()}"`);

/* ------------------------------------------------------------------ pages */
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const name = rel(file);

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) fail(name, 'missing <title>');
  else if (title.length > 65) warn(name, `title is ${title.length} chars (>65)`);

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!desc) fail(name, 'missing meta description');
  else if (desc.length > 170) warn(name, `meta description is ${desc.length} chars (>170)`);

  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (!canonical) fail(name, 'missing canonical');
  else if (!canonical.startsWith(HOST)) fail(name, `canonical not on ${HOST}: ${canonical}`);

  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) fail(name, `expected exactly 1 <h1>, found ${h1s.length}`);

  if (!/<meta property="og:image" content="https:\/\//.test(html)) fail(name, 'missing absolute og:image');
  if (!/<script type="application\/ld\+json">/.test(html)) warn(name, 'no structured data');

  for (const img of html.match(/<img\b[^>]*>/g) || []) {
    if (!/\salt=/.test(img)) fail(name, `<img> without alt: ${img.slice(0, 90)}`);
  }

  for (const a of html.match(/<a\b[^>]*>/g) || []) {
    const href = a.match(/href="([^"]*)"/)?.[1];
    if (!href) {
      fail(name, `<a> without href: ${a.slice(0, 80)}`);
      continue;
    }
    if (/^https?:\/\//.test(href)) {
      if (href.startsWith(HOST)) continue;
      if (!/target="_blank"/.test(a)) fail(name, `external link without target=_blank: ${href}`);
      if (!/rel="[^"]*noopener/.test(a)) fail(name, `external link without rel=noopener: ${href}`);
      if (/[?&](tag|aff|affid|utm_source=boughtique)=/.test(href))
        fail(name, `link carries affiliate/tracking params but we have no affiliate relationship: ${href}`);
      continue;
    }
    if (href.startsWith('mailto:') || href.startsWith('#')) continue;
    if (!href.startsWith('/')) {
      fail(name, `relative link (use root-absolute): ${href}`);
      continue;
    }
    const clean = href.split('#')[0].split('?')[0];
    const target = clean.endsWith('/') ? path.join(DIST, clean, 'index.html') : path.join(DIST, clean);
    if (!(await exists(target))) fail(name, `broken internal link: ${href}`);
  }

  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  const priceClaim = text.match(/(?:€|£|\$)\s?\d[\d.,]*/g) || [];
  const allowed = new Set(['€100']);
  for (const p of priceClaim) {
    const norm = p.replace(/\s/g, '').replace(/[.,]+$/, '');
    if (!allowed.has(norm)) fail(name, `unverified price claim in copy: "${p}"`);
  }
  const discountClaim = text.match(/\b\d{1,2}%\s?(off|reduced|discount)/gi) || [];
  if (discountClaim.length) fail(name, `unverified discount claim: ${discountClaim.join(', ')}`);
}

/* ---------------------------------------------------------------- sitemap */
const sitemap = await readFile(path.join(DIST, 'sitemap.xml'), 'utf8').catch(() => '');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.length < 10) fail('sitemap.xml', `only ${locs.length} URLs`);
for (const loc of locs) {
  const p = loc.replace(HOST, '');
  const target = p === '/' ? path.join(DIST, 'index.html') : path.join(DIST, p, 'index.html');
  if (!(await exists(target))) fail('sitemap.xml', `lists non-existent page: ${loc}`);
}
if (/\/saved\//.test(sitemap)) fail('sitemap.xml', 'noindex page /saved/ is listed');

/* ---------------------------------------------------------------- catalog */
const catalog = JSON.parse(await readFile(path.join(DIST, 'api/catalog.json'), 'utf8'));
if (!catalog.items?.length) fail('api/catalog.json', 'empty');
for (const item of catalog.items || []) {
  for (const k of ['id', 'retailer', 'title', 'description', 'url', 'search_text']) {
    if (!item[k]) fail('api/catalog.json', `item ${item.id} missing ${k}`);
  }
  if (!/^https:\/\//.test(item.url)) fail('api/catalog.json', `item ${item.id} url not https`);
  if ('current_price' in item || 'discount_percentage' in item)
    fail('api/catalog.json', `item ${item.id} asserts price data we cannot verify`);
}
const ids = catalog.items.map((i) => i.id);
if (new Set(ids).size !== ids.length) fail('api/catalog.json', 'duplicate item ids');

/* ----------------------------------------------------------------- report */
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const totals = await Promise.all(all.map(async (f) => (await stat(f)).size));
console.log(
  `Checked ${htmlFiles.length} pages, ${all.length} files, ${kb(totals.reduce((a, b) => a + b, 0))} total.`
);
console.log(`Catalogue: ${catalog.items.length} items. Sitemap: ${locs.length} URLs.`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.forEach((w) => console.log(`  ! ${w}`));
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}
console.log('\nAll checks passed.');
