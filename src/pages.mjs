import { html, esc } from './lib/html.mjs';
import { layout, breadcrumbs, breadcrumbNav, SITE } from './lib/layout.mjs';
import {
  card,
  grid,
  sectionHead,
  filterBar,
  pageHero,
  dataNote,
  OUTBOUND,
} from './lib/components.mjs';
import {
  byGender,
  bySneakers,
  byDeals,
  byUnder100,
  byStyle,
  byRetailer,
  byBrand,
  PRICE_BANDS,
} from './lib/data.mjs';

const itemListLd = (items, name) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  numberOfItems: items.length,
  itemListElement: items.slice(0, 25).map((i, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: `${i.retailer.name} — ${i.title}`,
    url: i.url,
  })),
});

/* =============================================================== HOME ==== */

export function home(data) {
  const { items, counts, retailers } = data;

  const pick = (arr, n) => arr.slice(0, n);
  const todays = pick(items.filter((i) => !i.deal), 8);
  const deals = pick(byDeals(items), 8);
  const under = pick(byUnder100(items), 4);
  const sneakers = pick(bySneakers(items), 4);
  const minimal = pick(byStyle(items, 'minimal'), 4);
  const premium = pick(items.filter((i) => i.price_band === 'luxury'), 4);

  const suggestions = [
    'white sneakers',
    'minimal jacket',
    'Nike',
    'adidas',
    'under €100',
    "women's dresses",
    "men's overshirts",
  ];

  const body = html`
    <section class="hero">
      <div class="shell hero__inner">
        <div>
          <p class="eyebrow">Fashion Deals Discovery</p>
          <h1 class="hero__title">Fashion worth<br /><em>buying.</em></h1>
          <p class="hero__lede">
            Boughtique finds the standout fashion, the better prices and the products worth knowing
            about — then sends you straight to the retailer.
          </p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="/deals/">Discover deals</a>
            <a class="btn btn--ghost" href="/women/">Explore new finds</a>
          </div>
          <dl class="hero__facts">
            <div class="hero__fact">
              <strong>${counts.items}</strong><span>Discovery routes</span>
            </div>
            <div class="hero__fact">
              <strong>${counts.retailers}</strong><span>Retailers tracked</span>
            </div>
            <div class="hero__fact">
              <strong>${counts.deals}</strong><span>Live sale sections</span>
            </div>
          </dl>
        </div>
        <div class="hero__plates" aria-hidden="true">
          <img src="/assets/img/plate-3.svg" alt="" width="800" height="1000" fetchpriority="high" decoding="async" />
          <img src="/assets/img/plate-6.svg" alt="" width="800" height="1000" decoding="async" />
        </div>
      </div>
    </section>

    <section class="searchband">
      <div class="shell searchband__inner">
        <h2 class="eyebrow" id="search-heading">Search the edit</h2>
        <form action="/search/" method="get" role="search" aria-labelledby="search-heading">
          <label class="visually-hidden" for="home-search">Search fashion</label>
          <input
            type="search"
            id="home-search"
            name="q"
            placeholder="white sneakers, minimal jacket, under €100…"
            autocomplete="off"
          />
          <button class="btn btn--primary" type="submit">Search</button>
        </form>
        <ul class="suggests">
          ${suggestions.map(
            (s) => html`<li><a href="/search/?q=${encodeURIComponent(s)}">${esc(s)}</a></li>`
          )}
        </ul>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        ${sectionHead({
          eyebrow: "Today's finds",
          title: 'Where to look right now',
          note: 'Hand-seeded for launch, replaced by automated ranking as product ingestion comes online.',
          href: '/search/',
          linkLabel: 'Browse everything',
        })}
        ${grid(todays, { eagerCount: 4 })}
      </div>
    </section>

    <section class="section section--line">
      <div class="shell">
        ${sectionHead({
          eyebrow: 'Deals worth seeing',
          title: 'Reduced sections, not fake discounts',
          note: 'Every link below is a retailer’s own sale or outlet section. We state no percentage we cannot verify.',
          href: '/deals/',
          linkLabel: 'All deals',
        })}
        ${grid(deals)}
      </div>
    </section>

    <section class="section section--line">
      <div class="shell">
        ${sectionHead({ eyebrow: 'Edits', title: 'Start from a point of view' })}
        <div class="tiles">
          <a class="tile" href="/under-100/">
            <h3>Under €100</h3>
            <p>Assortments that genuinely sit at the accessible end.</p>
            <span class="tile__count">${byUnder100(items).length} routes</span>
          </a>
          <a class="tile" href="/sneakers/">
            <h3>Sneakers</h3>
            <p>Terrace, running archive and clean white leather.</p>
            <span class="tile__count">${bySneakers(items).length} routes</span>
          </a>
          <a class="tile" href="/search/?style=minimal">
            <h3>Minimal essentials</h3>
            <p>Scandinavian restraint and considered basics.</p>
            <span class="tile__count">${byStyle(items, 'minimal').length} routes</span>
          </a>
          <a class="tile" href="/search/?band=luxury">
            <h3>Premium finds</h3>
            <p>Designer and luxury, curated and aggregated.</p>
            <span class="tile__count">${items.filter((i) => i.price_band === 'luxury').length} routes</span>
          </a>
          <a class="tile" href="/women/">
            <h3>Women</h3>
            <p>${byGender(items, 'women').length} routes across ${counts.retailers} retailers.</p>
            <span class="tile__count">Browse</span>
          </a>
          <a class="tile" href="/men/">
            <h3>Men</h3>
            <p>${byGender(items, 'men').length} routes across ${counts.retailers} retailers.</p>
            <span class="tile__count">Browse</span>
          </a>
        </div>
      </div>
    </section>

    <section class="section section--line">
      <div class="shell">
        ${sectionHead({
          eyebrow: 'Under €100',
          title: 'Good clothes, accessible prices',
          href: '/under-100/',
        })}
        ${grid(under)}
      </div>
    </section>

    <section class="section section--line">
      <div class="shell">
        ${sectionHead({ eyebrow: 'Sneakers', title: 'Footwear first', href: '/sneakers/' })}
        ${grid(sneakers)}
      </div>
    </section>

    <section class="section section--line">
      <div class="shell">
        ${sectionHead({
          eyebrow: 'Minimal essentials',
          title: 'Quiet, built to repeat',
          href: '/search/?style=minimal',
        })}
        ${grid(minimal)}
      </div>
    </section>

    <section class="section section--line">
      <div class="shell">
        ${sectionHead({
          eyebrow: 'Premium finds',
          title: 'The designer end',
          href: '/search/?band=luxury',
        })}
        ${grid(premium)}
      </div>
    </section>

    <section class="section section--line">
      <div class="shell">
        ${sectionHead({
          eyebrow: 'How it works',
          title: 'Discovery, not middlemen',
          href: '/how-it-works/',
          linkLabel: 'Read more',
        })}
        <ol class="steps">
          <li>
            <h3>We map the retailers</h3>
            <p>
              Boughtique tracks where the worthwhile assortment actually lives across European
              fashion retail.
            </p>
          </li>
          <li>
            <h3>We route you there</h3>
            <p>
              Every link opens the retailer's own page. They own the price, the stock and the
              checkout.
            </p>
          </li>
          <li>
            <h3>Software takes over</h3>
            <p>
              Automated product ingestion and ranking replace this seed data as the engine comes
              online.
            </p>
          </li>
        </ol>
        ${dataNote()}
      </div>
    </section>
  `;

  return layout({
    title: 'Boughtique — Fashion Deals Discovery',
    description:
      'Boughtique is a fashion discovery engine. Find standout fashion, better prices and the retailer sections worth your time — across eight European retailers.',
    path: '/',
    body,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Boughtique',
        url: SITE.url,
        slogan: 'Fashion Deals Discovery',
        description: SITE.description,
        logo: `${SITE.url}/assets/img/og.png`,
      },
      itemListLd(items, 'Boughtique discovery routes'),
    ],
  });
}

/* ============================================================ LISTINGS ==== */

export function listing({ path, eyebrow, title, lede, items, metaTitle, metaDescription, trail, showGender = true }) {
  const body = html`
    <div class="shell">${breadcrumbNav(trail)}</div>
    ${pageHero({ eyebrow, title, lede })}
    <section class="section section--tight">
      <div class="shell">
        ${filterBar(items, { showGender })} ${grid(items, { eagerCount: 4 })} ${dataNote()}
      </div>
    </section>
  `;

  return layout({
    title: metaTitle,
    description: metaDescription,
    path,
    body,
    jsonLd: [breadcrumbs(trail), itemListLd(items, title)],
  });
}

/* ============================================================== SEARCH ==== */

export function search(data) {
  const { items } = data;
  const trail = [
    { href: '/', label: 'Home' },
    { href: '/search/', label: 'Search' },
  ];

  const body = html`
    <div class="shell">${breadcrumbNav(trail)}</div>
    ${pageHero({
      eyebrow: 'Search',
      title: 'Find it',
      lede: 'Search and filter every discovery route Boughtique currently tracks. Try “white sneakers”, “minimal jacket”, “Nike” or “under €100”.',
    })}
    <section class="section section--tight">
      <div class="shell">${filterBar(items)} ${grid(items, { eagerCount: 4 })} ${dataNote()}</div>
    </section>
  `;

  return layout({
    title: 'Search — Boughtique',
    description:
      'Search Boughtique for sneakers, outerwear, minimal essentials, designer sale sections and more across European fashion retailers.',
    path: '/search/',
    body,
    jsonLd: [breadcrumbs(trail)],
  });
}

/* =============================================================== SAVED ==== */

export function savedPage() {
  const trail = [
    { href: '/', label: 'Home' },
    { href: '/saved/', label: 'Saved' },
  ];
  const body = html`
    <div class="shell">${breadcrumbNav(trail)}</div>
    ${pageHero({
      eyebrow: 'Saved',
      title: 'Your saved discoveries',
      lede: 'Stored on this device only. No account, no sign-up, nothing sent to a server.',
    })}
    <section class="section section--tight">
      <div class="shell">
        <div data-saved-mount>
          <noscript>
            <p class="lede">Saved discoveries require JavaScript.</p>
          </noscript>
        </div>
      </div>
    </section>
  `;
  return layout({
    title: 'Saved — Boughtique',
    description: 'Your saved fashion discoveries, stored privately on your device.',
    path: '/saved/',
    body,
    noindex: true,
    jsonLd: [breadcrumbs(trail)],
  });
}

/* ============================================================== BRANDS ==== */

export function brandsIndex(data) {
  const { items, brands } = data;
  const trail = [
    { href: '/', label: 'Home' },
    { href: '/brands/', label: 'Brands' },
  ];
  const body = html`
    <div class="shell">${breadcrumbNav(trail)}</div>
    ${pageHero({
      eyebrow: 'Brands',
      title: 'Brands we route to',
      lede: 'Brand-level entry points. Boughtique has no commercial relationship with any brand listed.',
    })}
    <section class="section section--tight">
      <div class="shell">
        <div class="tiles">
          ${brands.map((b) => {
            const n = byBrand(items, b).length;
            return html`<a class="tile" href="/brands/${esc(slug(b))}/">
              <h3>${esc(b)}</h3>
              <p>${n} discovery ${n === 1 ? 'route' : 'routes'} on Boughtique.</p>
              <span class="tile__count">View</span>
            </a>`;
          })}
        </div>
        ${dataNote()}
      </div>
    </section>
  `;
  return layout({
    title: 'Fashion brands — Boughtique',
    description: 'Browse Nike, adidas, ARKET, COS, UNIQLO and more on Boughtique.',
    path: '/brands/',
    body,
    jsonLd: [breadcrumbs(trail)],
  });
}

export const slug = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

export function brandPage(data, brand) {
  const items = byBrand(data.items, brand);
  const s = slug(brand);
  const trail = [
    { href: '/', label: 'Home' },
    { href: '/brands/', label: 'Brands' },
    { href: `/brands/${s}/`, label: brand },
  ];
  return listing({
    path: `/brands/${s}/`,
    eyebrow: 'Brand',
    title: brand,
    lede: `Every ${brand} discovery route Boughtique currently tracks, including the brand's own reduced sections where they exist.`,
    items,
    metaTitle: `${brand} — deals and discovery | Boughtique`,
    metaDescription: `Find ${brand} on Boughtique: category routes and the brand's own sale sections, linked directly to the retailer.`,
    trail,
  });
}

/* =========================================================== RETAILERS ==== */

export function retailersIndex(data) {
  const trail = [
    { href: '/', label: 'Home' },
    { href: '/retailers/', label: 'Retailers' },
  ];
  const body = html`
    <div class="shell">${breadcrumbNav(trail)}</div>
    ${pageHero({
      eyebrow: 'Retailers',
      title: 'Where Boughtique looks',
      lede: 'The European storefronts we currently map. Boughtique is independent — none of these are commercial partners.',
    })}
    <section class="section section--tight">
      <div class="shell">
        <div class="tiles">
          ${data.retailers.map((r) => {
            const n = byRetailer(data.items, r.id).length;
            return html`<a class="tile" href="/retailers/${esc(r.id)}/">
              <h3>${esc(r.name)}</h3>
              <p>${esc(r.positioning)}</p>
              <span class="tile__count">${n} ${n === 1 ? 'route' : 'routes'}</span>
            </a>`;
          })}
        </div>
        ${dataNote()}
      </div>
    </section>
  `;
  return layout({
    title: 'Fashion retailers — Boughtique',
    description:
      'Zalando, Nike, adidas, ARKET, COS, UNIQLO, Mytheresa and Farfetch — the retailers Boughtique currently maps.',
    path: '/retailers/',
    body,
    jsonLd: [breadcrumbs(trail)],
  });
}

export function retailerPage(data, retailer) {
  const items = byRetailer(data.items, retailer.id);
  const trail = [
    { href: '/', label: 'Home' },
    { href: '/retailers/', label: 'Retailers' },
    { href: `/retailers/${retailer.id}/`, label: retailer.name },
  ];

  const body = html`
    <div class="shell">${breadcrumbNav(trail)}</div>
    ${pageHero({ eyebrow: 'Retailer', title: retailer.name, lede: retailer.description })}
    <section class="section section--tight">
      <div class="shell">
        <p>
          <a class="btn btn--ghost btn--sm" href="${esc(retailer.home)}" ${OUTBOUND} data-outbound="${esc(retailer.id)}"
            >Visit ${esc(retailer.name)}<span class="visually-hidden"> (opens in a new tab)</span></a
          >
        </p>
        <div style="height:1.5rem"></div>
        ${filterBar(items)} ${grid(items, { eagerCount: 4 })} ${dataNote()}
      </div>
    </section>
  `;

  return layout({
    title: `${retailer.name} — deals and discovery | Boughtique`,
    description: `${retailer.description} Browse the ${retailer.name} sections Boughtique tracks.`,
    path: `/retailers/${retailer.id}/`,
    body,
    jsonLd: [breadcrumbs(trail), itemListLd(items, retailer.name)],
  });
}

/* ================================================================ PROSE ==== */

export function prose({ path, title, metaTitle, metaDescription, eyebrow, lede, content, noindex = false }) {
  const trail = [
    { href: '/', label: 'Home' },
    { href: path, label: title },
  ];
  const body = html`
    <div class="shell">${breadcrumbNav(trail)}</div>
    ${pageHero({ eyebrow, title, lede })}
    <div class="shell"><article class="prose">${content}</article></div>
  `;
  return layout({
    title: metaTitle,
    description: metaDescription,
    path,
    body,
    noindex,
    jsonLd: [breadcrumbs(trail)],
  });
}

/* ================================================================== 404 ==== */

export function notFound() {
  const body = html`
    <div class="shell notfound">
      <h1>404</h1>
      <p>That page doesn't exist. The fashion does.</p>
      <div class="hero__actions">
        <a class="btn btn--primary" href="/">Back to Boughtique</a>
        <a class="btn btn--ghost" href="/search/">Search</a>
      </div>
    </div>
  `;
  return layout({
    title: 'Page not found — Boughtique',
    description: 'That page could not be found.',
    path: '/404.html',
    body,
    noindex: true,
  });
}
