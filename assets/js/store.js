/**
 * Saved discoveries.
 *
 * localStorage only — no account, no server, no personal data leaves the
 * device. The interface (get/toggle/subscribe) is deliberately account-shaped
 * so it can be backed by a user API later without touching components.
 */

import { track } from './analytics.js';

const KEY = 'boughtique.saved.v1';
const listeners = new Set();

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function write(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* private mode / quota — saving degrades silently rather than throwing */
  }
  listeners.forEach((fn) => fn(ids));
}

export const getSaved = () => read();
export const isSaved = (id) => read().includes(id);
export const count = () => read().length;

export function toggle(id) {
  const ids = read();
  const i = ids.indexOf(id);
  const saving = i === -1;
  if (saving) ids.unshift(id);
  else ids.splice(i, 1);
  write(ids);
  track(saving ? 'save_item' : 'unsave_item', { id, total: ids.length });
  return saving;
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(read());
  return () => listeners.delete(fn);
}

// Keep tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) listeners.forEach((fn) => fn(read()));
});
