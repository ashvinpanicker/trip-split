'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Stale-while-revalidate cache for the data hooks.
 * - Pages show the last data instantly (memory while the app is open, device storage when it's
 *   reopened), and every hook still fetches fresh data in the background and updates the screen.
 * - Saved per account: data saved for one login is never shown to another. Cleared on sign-out.
 */
const store = new Map<string, unknown>();
const DISK_KEY = 'tripsplit:cache:v1';
const ME_KEY = 'tripsplit:me';
const MAX_BYTES = 1_500_000;

export const hasCached = (key: string) => store.has(key);

export function clearCache() {
  store.clear();
  try { localStorage.removeItem(DISK_KEY); localStorage.removeItem(ME_KEY); } catch {}
}

const uidOf = () => (store.get('user') as { id?: string } | null | undefined)?.id ?? null;

let timer: ReturnType<typeof setTimeout> | null = null;
function persistSoon() {
  if (typeof window === 'undefined') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const uid = uidOf();
    if (!uid) return;
    try {
      const json = JSON.stringify({ uid, at: Date.now(), entries: Object.fromEntries(store) });
      if (json.length < MAX_BYTES) localStorage.setItem(DISK_KEY, json);
    } catch {}
  }, 400);
}

/** Load what was saved on this device for the signed-in account. Call once, after mount. */
export function hydrateCache() {
  if (store.size) return;
  try {
    const me = JSON.parse(localStorage.getItem(ME_KEY) || 'null') as { id?: string } | null;
    const saved = JSON.parse(localStorage.getItem(DISK_KEY) || 'null') as { uid: string; entries: Record<string, unknown> } | null;
    if (me?.id && saved?.uid === me.id) for (const [k, v] of Object.entries(saved.entries)) store.set(k, v);
  } catch {}
}

/** Your own profile, kept on the device so the app knows whose saved data to load. */
export function readSavedMe<T>(): T | null {
  try { const v = localStorage.getItem(ME_KEY); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
export function saveMe(v: unknown) {
  try { if (v) localStorage.setItem(ME_KEY, JSON.stringify(v)); else clearCache(); } catch {}
}

/** Like useState, but starts from (and writes to) the cache under `key`. */
export function useCachedState<T>(key: string, initial: T) {
  const read = () => (store.has(key) ? (store.get(key) as T) : initial);
  const [state, setState] = useState<{ key: string; value: T }>(() => ({ key, value: read() }));
  // Same page, different trip (A → B): never show A's data under B
  const value = state.key === key ? state.value : read();
  const set = useCallback((next: T) => {
    store.set(key, next);
    setState({ key, value: next });
    persistSoon();
  }, [key]);
  return [value, set] as const;
}

/** Re-run `load` when the person pulls down to refresh (or anything fires 'tripsplit:refresh'). */
export function useRefreshOn(load: () => unknown) {
  useEffect(() => {
    const f = () => { load(); };
    window.addEventListener('tripsplit:refresh', f);
    return () => window.removeEventListener('tripsplit:refresh', f);
  }, [load]);
}
