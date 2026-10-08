/**
 * Rasterises the OG image and PWA icons from our SVG sources.
 *
 * Kept out of the main build (and out of git) so the repository stays
 * dependency-free and text-only. CI runs this after the build:
 *
 *   npm run build && npm i --no-save sharp && node scripts/generate-raster.mjs
 *
 * If sharp is unavailable the script exits 0 — the build then fails loudly in
 * check-build.mjs instead of producing a site with a broken social image.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Operates on the BUILD OUTPUT: the SVG sources are generated into dist/ by
// src/build.mjs, so this must run after `npm run build`.
const DIST = path.join(ROOT, 'dist');
const IMG = path.join(DIST, 'assets/img');

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.warn('sharp not installed — skipping raster generation.');
  process.exit(0);
}

const og = await readFile(path.join(IMG, 'og.svg'));
const favicon = await readFile(path.join(DIST, 'favicon.svg'));

await sharp(og).png({ compressionLevel: 9 }).toFile(path.join(IMG, 'og.png'));

for (const size of [192, 512]) {
  await sharp(favicon).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(IMG, `icon-${size}.png`));
}

await sharp(favicon)
  .resize(180, 180)
  .flatten({ background: '#14130f' })
  .png({ compressionLevel: 9 })
  .toFile(path.join(IMG, 'apple-touch-icon.png'));

console.log('Wrote og.png, apple-touch-icon.png, icon-192.png, icon-512.png');
