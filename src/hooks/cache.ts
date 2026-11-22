'use client';

import { useCallback, useState } from 'react';

/**
 * In-memory cache shared by the data hooks, so moving between pages shows the last data
 * instantly while fresh data loads in the background (no loading screen on every tap).
 * Lives only for this tab; cleared on sign-out.
 */
const store = new Map<string, unknown>();

export const hasCached = (key: string) => store.has(key);
export function clearCache() {
  store.clear();
  try { localStorage.removeItem(ME_KEY); } catch {}
}

/** Your own profile is also kept on the device, so the app opens straight to your data. */
const ME_KEY = 'tripsplit:me';
export function readSavedMe<T>(): T | null {
  try { const v = localStorage.getItem(ME_KEY); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
export function saveMe(v: unknown) {
  try { if (v) localStorage.setItem(ME_KEY, JSON.stringify(v)); else localStorage.removeItem(ME_KEY); } catch {}
}


/** Like useState, but starts from (and writes to) the cache under `key`. */
export function useCachedState<T>(key: string, initial: T) {
  const read = () => (store.has(key) ? (store.get(key) as T) : initial);
  const [state, setState] = useState<{ key: string; value: T }>(() => ({ key, value: read() }));
  // Same page, different trip (A → B): never show A's data under B
  const value = state.key === key ? state.value : read();
  const set = useCallback((next: T) => { store.set(key, next); setState({ key, value: next }); }, [key]);
  return [value, set] as const;
}
