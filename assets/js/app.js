import { track, observeImpressions } from './analytics.js';
import * as saved from './store.js';

/* ------------------------------------------------------------------ utils */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const debounce = (fn, ms = 120) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

/**
 * Catalogue access. Today: a static JSON artifact emitted by the build.
 * Tomorrow: `GET https://api.boughtique.com/v1/items`. Same shape, same callers.
 */
let catalogPromise = null;
const getCatalog = () => {
  if (!catalogPromise) {
    catalogPromise = fetch('/api/catalog.json', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => d.items || [])
      .catch(() => []);
  }
  return catalogPromise;
};

/**
 * Relevance scoring.
 *
 * Strict AND over all tokens is the primary match. If that returns nothing we
 * fall back to partial matches ranked by how many tokens hit, so a plausible
 * query like "minimal jacket" never dead-ends on an empty page. The UI always
 * says which mode produced the results.
 */
const tokenize = (q) =>
  q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s€]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

function score(hay, tokens) {
  let hits = 0;
  for (const t of tokens) if (hay.includes(t)) hits += 1;
  return hits;
}

/** @returns {{list: T[], exact: boolean}} */
function rank(items, query, getHay) {
  const tokens = tokenize(query);
  if (!tokens.length) return { list: items, exact: true };

  const scored = items.map((item) => ({ item, s: score(getHay(item), tokens) }));
  const exact = scored.filter((x) => x.s === tokens.length);
  if (exact.length) return { list: exact.map((x) => x.item), exact: true };

  const partial = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  return { list: partial.map((x) => x.item), exact: false };
}

/* ----------------------------------------------------------- mobile menu */
function initMenu() {
  const btn = $('[data-menu-toggle]');
  const nav = $('#mobile-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    btn.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    nav.hidden = open;
  });
}

/* --------------------------------------------------------- search overlay */
function initSearchOverlay() {
  const overlay = $('[data-search-overlay]');
  const input = $('[data-search-input]');
  const results = $('[data-search-results]');
  if (!overlay || !input) return;

  const open = () => {
    overlay.hidden = false;
    input.focus();
    getCatalog();
  };
  const close = () => {
    overlay.hidden = true;
    results.innerHTML = '';
  };

  $$('[data-search-open]').forEach((b) => b.addEventListener('click', () => (overlay.hidden ? open() : close())));
  $('[data-search-close]')?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close();
    if (e.key === '/' && document.activeElement === document.body) {
      e.preventDefault();
      open();
    }
  });

  const render = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 2) {
      results.innerHTML = '';
      return;
    }
    const items = await getCatalog();
    const { list, exact } = rank(items, q, (i) => i.search_text || '');
    const hits = list.slice(0, 8);
    track('search', { query: q, results: list.length, exact, surface: 'overlay' });

    results.innerHTML = hits.length
      ? (exact ? '' : `<p class="search-overlay__empty" style="margin-bottom:.75rem">No exact match for “${escapeHtml(
          q
        )}”. Closest finds:</p>`) +
        `<ul>${hits
          .map(
            (i) =>
              `<li><a href="${i.url}" target="_blank" rel="noopener noreferrer nofollow sponsored" data-outbound="${i.retailer.id}" data-outbound-id="${i.id}">` +
              `<span>${escapeHtml(i.title)}</span>` +
              `<span class="r-meta">${escapeHtml(i.retailer.name)}${i.deal ? ' · Sale' : ''}</span></a></li>`
          )
          .join('')}</ul>` +
        `<p class="search-overlay__empty" style="margin-top:.75rem"><a href="/search/?q=${encodeURIComponent(
          q
        )}">See all results for “${escapeHtml(q)}”</a></p>`
      : `<p class="search-overlay__empty">No matches for “${escapeHtml(
          q
        )}”. Try <a href="/sneakers/">sneakers</a>, <a href="/deals/">deals</a> or <a href="/under-100/">under €100</a>.</p>`;
  }, 140);

  input.addEventListener('input', render);
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------------------------------------------------------- filters */
function initFilters() {
  const form = $('[data-filters]');
  const gridEl = $('[data-grid]');
  if (!form || !gridEl) return;

  const cards = $$('[data-item]', gridEl);
  const countEl = $('[data-result-count]');
  const noteEl = $('[data-result-note]');
  const controls = $$('[data-filter]', form);

  const state = () => {
    const s = {};
    controls.forEach((c) => {
      s[c.dataset.filter] = c.type === 'checkbox' ? c.checked : c.value.trim();
    });
    return s;
  };

  const apply = () => {
    const s = state();
    const q = (s.q || '').trim();
    const tokens = tokenize(q);

    // Non-text facets first; text relevance is applied to whatever survives.
    const facetOk = (d) =>
      (!s.gender || d.gender === s.gender || d.gender === 'unisex') &&
      (!s.retailer || d.retailer === s.retailer) &&
      (!s.band || d.band === s.band) &&
      (!s.style || d.style.split(' ').includes(s.style)) &&
      (!s.deal || d.deal === 'true');

    const pool = cards.filter((c) => facetOk(c.dataset));
    let show;
    let exact = true;

    if (!tokens.length) {
      show = new Set(pool);
    } else {
      const scored = pool.map((c) => ({ c, s: score(c.dataset.search, tokens) }));
      const hits = scored.filter((x) => x.s === tokens.length);
      exact = hits.length > 0;
      show = new Set((exact ? hits : scored.filter((x) => x.s > 0)).map((x) => x.c));
    }

    cards.forEach((card) => {
      card.hidden = !show.has(card);
    });

    const visible = show.size;
    if (countEl) countEl.textContent = `${visible} of ${cards.length}`;

    const active = Object.entries(s).filter(([, v]) => v);
    if (active.length) {
      track(tokens.length ? 'search' : 'filter', {
        filters: Object.fromEntries(active),
        results: visible,
        exact,
      });
    }

    let empty = $('.empty', gridEl.parentElement);
    if (!visible) {
      if (!empty) {
        empty = document.createElement('p');
        empty.className = 'empty';
        gridEl.parentElement.appendChild(empty);
      }
      empty.textContent = q
        ? `Nothing matches “${q}”. Try a broader term, or reset the filters.`
        : 'No matches. Try removing a filter.';
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }

    if (noteEl) {
      noteEl.hidden = exact || !visible;
      if (!exact && visible) noteEl.textContent = `No exact match for “${q}” — showing closest finds.`;
    }
  };

  const debounced = debounce(apply, 120);
  controls.forEach((c) => c.addEventListener(c.tagName === 'SELECT' || c.type === 'checkbox' ? 'change' : 'input', debounced));

  $('[data-filters-reset]')?.addEventListener('click', () => {
    controls.forEach((c) => {
      if (c.type === 'checkbox') c.checked = false;
      else c.value = '';
    });
    apply();
    const url = new URL(location.href);
    url.search = '';
    history.replaceState(null, '', url);
  });

  // Deep-link support: /search/?q=… and ?gender=…&deal=1
  const params = new URLSearchParams(location.search);
  let seeded = false;
  controls.forEach((c) => {
    const v = params.get(c.dataset.filter);
    if (v === null) return;
    if (c.type === 'checkbox') c.checked = v === '1' || v === 'true';
    else c.value = v;
    seeded = true;
  });
  if (seeded) track('search', { query: params.get('q') || '', surface: 'page' });
  apply();
}

/* ------------------------------------------------------------ saved items */
function initSaveButtons(root = document) {
  const ids = new Set(saved.getSaved());
  $$('[data-save]', root).forEach((btn) => {
    const id = btn.dataset.save;
    btn.setAttribute('aria-pressed', String(ids.has(id)));
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.setAttribute('aria-pressed', String(saved.toggle(id)));
    });
  });
}

function initSavedBadge() {
  const badge = $('[data-saved-count]');
  if (!badge) return;
  saved.subscribe((ids) => {
    badge.textContent = String(ids.length);
    badge.hidden = ids.length === 0;
  });
}

async function initSavedPage() {
  const mount = $('[data-saved-mount]');
  if (!mount) return;
  const items = await getCatalog();
  const byId = new Map(items.map((i) => [i.id, i]));

  const render = (ids) => {
    const list = ids.map((id) => byId.get(id)).filter(Boolean);
    if (!list.length) {
      mount.innerHTML = `<div class="saved-empty"><p class="lede">You haven't saved anything yet. Tap the bookmark on any discovery to keep it here.</p>
        <div class="hero__actions"><a class="btn btn--primary" href="/deals/">Browse deals</a><a class="btn btn--ghost" href="/women/">Explore new finds</a></div></div>`;
      return;
    }
    mount.innerHTML =
      `<p class="filters__count" style="margin-bottom:1.5rem">${list.length} saved</p><div class="grid">` +
      list
        .map(
          (i) => `<article class="card" data-item data-id="${i.id}">
        <div class="card__media">
          <img src="${i.image}" alt="" role="presentation" width="800" height="1000" loading="lazy" decoding="async">
          ${i.deal ? '<span class="card__flag">Sale section</span>' : ''}
          <button class="save-btn" type="button" data-save="${i.id}" aria-pressed="true" aria-label="Remove ${escapeHtml(
            i.title
          )} from saved"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-6-4.3-6 4.3z"/></svg></button>
        </div>
        <div class="card__body">
          <p class="card__eyebrow">${escapeHtml(i.retailer.name)}</p>
          <h3 class="card__title"><a class="card__link" href="${i.url}" target="_blank" rel="noopener noreferrer nofollow sponsored" data-outbound="${
            i.retailer.id
          }" data-outbound-id="${i.id}">${escapeHtml(i.title)}</a></h3>
          <p class="card__desc">${escapeHtml(i.description)}</p>
        </div>
      </article>`
        )
        .join('') +
      '</div>';
    initSaveButtons(mount);
  };

  saved.subscribe(render);
}

/* ---------------------------------------------------------- outbound taps */
function initOutbound() {
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('a[data-outbound]');
      if (!a) return;
      track('outbound_click', {
        retailer: a.dataset.outbound,
        id: a.dataset.outboundId || null,
        href: a.href,
      });
    },
    { capture: true }
  );
}

/* -------------------------------------------------------------------- init */
function boot() {
  initMenu();
  initSearchOverlay();
  initFilters();
  initSaveButtons();
  initSavedBadge();
  initSavedPage();
  initOutbound();
  observeImpressions();
  track('page_view', { title: document.title });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
