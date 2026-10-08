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
            (s) => html`<li><a
