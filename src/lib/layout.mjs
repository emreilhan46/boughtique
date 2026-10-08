import { html, esc } from './html.mjs';

export const SITE = {
  name: 'Boughtique',
  tagline: 'Fashion Deals Discovery',
  url: 'https://boughtique.com',
  locale: 'en_GB',
  twitter: '@boughtique',
  description:
    'Boughtique is a fashion discovery engine. Find standout fashion, better prices and the retailer sections actually worth your time.',
};

export const NAV = [
  { href: '/women/', label: 'Women' },
  { href: '/men/', label: 'Men' },
  { href: '/sneakers/', label: 'Sneakers' },
  { href: '/deals/', label: 'Deals' },
  { href: '/brands/', label: 'Brands' },
];

const FOOTER_GROUPS = [
  {
    title: 'Discover',
    links: [
      { href: '/women/', label: 'Women' },
      { href: '/men/', label: 'Men' },
      { href: '/sneakers/', label: 'Sneakers' },
      { href: '/deals/', label: 'Deals' },
      { href: '/under-100/', label: 'Under €100' },
      { href: '/saved/', label: 'Saved' },
    ],
  },
  {
    title: 'Boughtique',
    links: [
      { href: '/about/', label: 'About' },
      { href: '/how-it-works/', label: 'How it works' },
      { href: '/retailers/', label: 'Retailers' },
      { href: '/brands/', label: 'Brands' },
      { href: '/contact/', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy/', label: 'Privacy' },
      { href: '/terms/', label: 'Terms' },
      { href: '/affiliate-disclosure/', label: 'Affiliate disclosure' },
    ],
  },
];

const canonical = (p) => `${SITE.url}${p}`;

function wordmark(tag = 'span') {
  return html`<${tag} class="wordmark">Boughtique</${tag}>`;
}

function header(current) {
  return html`
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header" data-header>
      <div class="shell site-header__inner">
        <a class="site-header__brand" href="/" aria-label="Boughtique — home">
          ${wordmark('span')}
          <span class="site-header__tagline">Fashion Deals Discovery</span>
        </a>

        <nav class="site-nav" aria-label="Primary">
          <ul>
            ${NAV.map(
              (n) => html`<li>
                <a href="${n.href}"${current === n.href ? ' aria-current="page"' : ''}>${n.label}</a>
              </li>`
            )}
          </ul>
        </nav>

        <div class="site-header__actions">
          <button class="icon-btn" type="button" data-search-open aria-label="Search Boughtique">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
            </svg>
          </button>
          <a class="icon-btn" href="/saved/" aria-label="Saved items">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 3.5h12v17l-6-4.3-6 4.3z" />
            </svg>
            <span class="icon-btn__badge" data-saved-count hidden>0</span>
          </a>
          <button
            class="icon-btn icon-btn--menu"
            type="button"
            data-menu-toggle
            aria-expanded="false"
            aria-controls="mobile-nav"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
            </svg>
          </button>
        </div>
      </div>

      <nav class="mobile-nav" id="mobile-nav" aria-label="Mobile" hidden>
        <ul>
          ${NAV.concat([{ href: '/under-100/', label: 'Under €100' }, { href: '/saved/', label: 'Saved' }]).map(
            (n) => html`<li><a href="${n.href}">${n.label}</a></li>`
          )}
        </ul>
      </nav>
    </header>

    <div class="search-overlay" data-search-overlay hidden>
      <div class="shell search-overlay__inner">
        <form class="search-overlay__form" action="/search/" method="get" role="search">
          <label class="visually-hidden" for="global-search">Search fashion</label>
          <input
            type="search"
            id="global-search"
            name="q"
            placeholder="white sneakers, minimal jacket, under €100…"
            autocomplete="off"
            data-search-input
          />
          <button class="btn btn--primary" type="submit">Search</button>
          <button class="btn btn--ghost" type="button" data-search-close>Close</button>
        </form>
        <div class="search-overlay__results" data-search-results aria-live="polite"></div>
      </div>
    </div>
  `;
}

function footer() {
  const year = new Date().getUTCFullYear();
  return html`
    <footer class="site-footer">
      <div class="shell">
        <div class="site-footer__top">
          <div class="site-footer__brand">
            ${wordmark('p')}
            <p class="site-footer__tag">Fashion Deals Discovery</p>
            <p class="site-footer__blurb">
              A discovery engine for fashion worth buying. We point you at the retailer; you buy
              there, at their price.
            </p>
          </div>
          ${FOOTER_GROUPS.map(
            (g) => html`
              <nav class="site-footer__group" aria-label="${g.title}">
                <h2>${g.title}</h2>
                <ul>
                  ${g.links.map((l) => html`<li><a href="${l.href}">${l.label}</a></li>`)}
                </ul>
              </nav>
            `
          )}
        </div>
        <div class="site-footer__bottom">
          <p>© ${year} Boughtique</p>
          <p class="site-footer__legal">
            Boughtique is independent and is not affiliated with, endorsed by or a commercial
            partner of any retailer listed. Prices, availability and reductions are determined
            solely by the retailer. See our
            <a href="/affiliate-disclosure/">affiliate disclosure</a>.
          </p>
        </div>
      </div>
    </footer>
  `;
}

/**
 * @param {object} o
 * @param {string} o.title      full <title>
 * @param {string} o.description meta description
 * @param {string} o.path       absolute path with trailing slash, e.g. "/women/"
 * @param {string} o.body       page HTML
 * @param {string} [o.heroClass] optional body class
 * @param {object[]} [o.jsonLd] structured data blocks
 * @param {boolean} [o.noindex]
 */
export function layout({ title, description, path: p, body, bodyClass = '', jsonLd = [], noindex = false }) {
  const url = canonical(p);
  const ogImage = `${SITE.url}/assets/img/og.png`;

  const graph = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE.name,
      alternateName: 'Boughtique — Fashion Deals Discovery',
      url: SITE.url,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/search/?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    ...jsonLd,
  ];

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
${noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<meta name="theme-color" content="#faf9f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111110" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:locale" content="${SITE.locale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Boughtique — Fashion Deals Discovery">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/assets/css/site.css">
<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>
</head>
<body${bodyClass ? ` class="${esc(bodyClass)}"` : ''}>
${header(p)}
<main id="main">
${body}
</main>
${footer()}
<script type="module" src="/assets/js/app.js"></script>
</body>
</html>
`;
}

export function breadcrumbs(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.label,
      item: canonical(t.href),
    })),
  };
}

export function breadcrumbNav(trail) {
  return html`
    <nav class="crumbs" aria-label="Breadcrumb">
      <ol>
        ${trail.map(
          (t, i) =>
            html`<li>
              ${i === trail.length - 1
                ? html`<span aria-current="page">${t.label}</span>`
                : html`<a href="${t.href}">${t.label}</a>`}
            </li>`
        )}
      </ol>
    </nav>
  `;
}
