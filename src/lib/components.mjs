import { html, esc } from './html.mjs';
import { GENDER_LABEL, PRICE_BANDS } from './data.mjs';

/** Outbound attributes used for every retailer link, in one place. */
export const OUTBOUND = 'target="_blank" rel="noopener noreferrer nofollow sponsored"';

export function card(item, { eager = false } = {}) {
  const bandLabel = PRICE_BANDS[item.price_band]?.label ?? '';
  return html`
    <article
      class="card"
      data-item
      data-id="${esc(item.id)}"
      data-gender="${esc(item.gender)}"
      data-retailer="${esc(item.retailer.id)}"
      data-brand="${esc(item.brand ?? '')}"
      data-band="${esc(item.price_band)}"
      data-deal="${item.deal ? 'true' : 'false'}"
      data-style="${esc(item.style.join(' '))}"
      data-subcategory="${esc(item.subcategory)}"
      data-search="${esc(item.search_text)}"
      data-title="${esc(item.title)}"
      data-url="${esc(item.url)}"
      data-retailer-name="${esc(item.retailer.name)}"
    >
      <div class="card__media">
        <img
          src="${esc(item.image)}"
          alt=""
          role="presentation"
          width="800"
          height="1000"
          loading="${eager ? 'eager' : 'lazy'}"
          decoding="async"
          ${eager ? 'fetchpriority="high"' : ''}
        />
        ${item.deal ? html`<span class="card__flag">Sale section</span>` : ''}
        <button
          class="save-btn"
          type="button"
          data-save="${esc(item.id)}"
          aria-pressed="false"
          aria-label="Save ${esc(item.title)}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 3.5h12v17l-6-4.3-6 4.3z" />
          </svg>
        </button>
      </div>

      <div class="card__body">
        <p class="card__eyebrow">${esc(item.retailer.name)}</p>
        <h3 class="card__title">
          <a
            class="card__link"
            href="${esc(item.url)}"
            ${OUTBOUND}
            data-outbound="${esc(item.retailer.id)}"
            data-outbound-id="${esc(item.id)}"
            >${esc(item.title)}<span class="visually-hidden"> — opens ${esc(
              item.retailer.name
            )} in a new tab</span></a
          >
        </h3>
        <p class="card__desc">${esc(item.description)}</p>
        <p class="card__meta">
          <span>${esc(GENDER_LABEL[item.gender] ?? item.gender)}</span>
          <span aria-hidden="true">·</span>
          <span>${esc(bandLabel)}</span>
        </p>
      </div>
    </article>
  `;
}

export function grid(items, { eagerCount = 0 } = {}) {
  if (!items.length) {
    return html`<p class="empty">Nothing here yet.</p>`;
  }
  return html`<div class="grid" data-grid>
    ${items.map((item, i) => card(item, { eager: i < eagerCount }))}
  </div>`;
}

export function sectionHead({ eyebrow, title, note, href, linkLabel }) {
  return html`
    <div class="section-head">
      <div>
        ${eyebrow ? html`<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
        <h2>${esc(title)}</h2>
        ${note ? html`<p class="section-head__note">${esc(note)}</p>` : ''}
      </div>
      ${href ? html`<a class="link-arrow" href="${esc(href)}">${esc(linkLabel ?? 'View all')}</a>` : ''}
    </div>
  `;
}

/**
 * Filter bar. Only facets actually present in the supplied items are rendered —
 * we never expose a control the data cannot answer.
 */
export function filterBar(items, { showGender = true } = {}) {
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];

  const genders = uniq(items.map((i) => i.gender)).filter((g) => g !== 'unisex');
  const retailers = uniq(items.map((i) => i.retailer.id)).map((id) => ({
    id,
    name: items.find((i) => i.retailer.id === id).retailer.name,
  }));
  const bands = uniq(items.map((i) => i.price_band)).sort(
    (a, b) => PRICE_BANDS[a].order - PRICE_BANDS[b].order
  );
  const styles = uniq(items.flatMap((i) => i.style)).sort();
  const hasDeals = items.some((i) => i.deal);

  const group = (name, label, options) =>
    options.length > 1
      ? html`
          <div class="filters__group">
            <label class="filters__label" for="filter-${name}">${esc(label)}</label>
            <select class="filters__select" id="filter-${name}" data-filter="${name}">
              <option value="">All</option>
              ${options.map((o) => html`<option value="${esc(o.value)}">${esc(o.label)}</option>`)}
            </select>
          </div>
        `
      : '';

  return html`
    <form class="filters" data-filters aria-label="Filter results" onsubmit="return false">
      <div class="filters__group filters__group--search">
        <label class="filters__label" for="filter-q">Search</label>
        <input
          class="filters__input"
          id="filter-q"
          type="search"
          data-filter="q"
          placeholder="white sneakers, minimal, Nike…"
          autocomplete="off"
        />
      </div>

      ${showGender
        ? group(
            'gender',
            'Audience',
            genders.map((g) => ({ value: g, label: GENDER_LABEL[g] ?? g }))
          )
        : ''}
      ${group('retailer', 'Retailer', retailers.map((r) => ({ value: r.id, label: r.name })))}
      ${group('band', 'Price band', bands.map((b) => ({ value: b, label: PRICE_BANDS[b].label })))}
      ${group(
        'style',
        'Style',
        styles.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))
      )}

      <div class="filters__group filters__group--toggle">
        ${hasDeals
          ? html`<label class="checkbox">
              <input type="checkbox" data-filter="deal" />
              <span>Sale sections only</span>
            </label>`
          : ''}
      </div>

      <div class="filters__group filters__group--actions">
        <p class="filters__count" data-result-count aria-live="polite"></p>
        <button class="btn btn--ghost btn--sm" type="button" data-filters-reset>Reset</button>
      </div>

      <p class="filters__note" data-result-note role="status" hidden></p>
    </form>
  `;
}

export function pageHero({ eyebrow, title, lede }) {
  return html`
    <header class="page-hero">
      <div class="shell">
        ${eyebrow ? html`<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
        <h1>${esc(title)}</h1>
        ${lede ? html`<p class="lede">${esc(lede)}</p>` : ''}
      </div>
    </header>
  `;
}

/** Honest provenance note shown on every listing page. */
export function dataNote() {
  return html`
    <p class="data-note">
      Boughtique links to retailers' own category and sale sections. We do not publish product
      prices or discount figures we cannot verify — the retailer's page is always the source of
      truth. <a href="/how-it-works/">How this works</a>.
    </p>
  `;
}
