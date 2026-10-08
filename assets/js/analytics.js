/**
 * Analytics abstraction.
 *
 * No third-party tracker is loaded today. Events are buffered on
 * `window.boughtiqueEvents` and forwarded to `window.dataLayer` if one exists,
 * so a provider (Plausible, GA4, a first-party endpoint) can be attached later
 * by implementing a single sink — no call sites change.
 */

const BUFFER_LIMIT = 200;

const buffer = (window.boughtiqueEvents = window.boughtiqueEvents || []);

/** @type {Array<(e: object) => void>} */
const sinks = [];

export function addSink(fn) {
  sinks.push(fn);
  buffer.forEach(fn);
}

export function track(name, payload = {}) {
  const event = { event: name, ts: Date.now(), path: location.pathname, ...payload };

  if (buffer.length < BUFFER_LIMIT) buffer.push(event);
  if (Array.isArray(window.dataLayer)) window.dataLayer.push(event);
  sinks.forEach((sink) => {
    try {
      sink(event);
    } catch {
      /* a broken sink must never break the UI */
    }
  });
}

/** Product/destination impressions, batched via IntersectionObserver. */
export function observeImpressions(root = document) {
  if (!('IntersectionObserver' in window)) return;
  const seen = new Set();
  const io = new IntersectionObserver(
    (entries) => {
      const batch = [];
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.dataset.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        batch.push(id);
        io.unobserve(entry.target);
      }
      if (batch.length) track('impressions', { ids: batch });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.4 }
  );
  root.querySelectorAll('[data-item]').forEach((el) => io.observe(el));
}
