'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Optional features, each with its own switch in Settings. Nobody has to learn them:
 * off by default for friends, on by default for trip admins (until they choose).
 * Saved on this phone and on the account, so the choice follows them to other devices.
 */
export const FEATURES = ['splits', 'payments', 'activity', 'export'] as const;
export type Feature = (typeof FEATURES)[number];
export type Features = Record<Feature, boolean>;

const KEY = 'tripsplit:features';
const OLD_KEY = 'tripsplit:advanced'; // the single on/off switch it replaces
const EVENT = 'tripsplit:features-changed';

const all = (on: boolean) => Object.fromEntries(FEATURES.map((f) => [f, on])) as Features;
const clean = (v: unknown): Partial<Features> | null =>
  v && typeof v === 'object' ? Object.fromEntries(FEATURES.filter((f) => typeof (v as Features)[f] === 'boolean').map((f) => [f, (v as Features)[f]])) : null;

function read(): Partial<Features> | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return clean(JSON.parse(v));
    const old = localStorage.getItem(OLD_KEY);
    return old === 'on' || old === 'off' ? all(old === 'on') : null;
  } catch {
    return null;
  }
}

function store(f: Partial<Features>) {
  try { localStorage.setItem(KEY, JSON.stringify(f)); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Change one or more features, keeping the rest. */
export function setFeatures(change: Partial<Features>, base: Features) {
  const next = { ...base, ...change };
  store(next);
  createClient().auth.updateUser({ data: { features: next } }).catch(() => {});
}

/** From an invite link (?app=simple|full): everything off or on. */
export function applyAppMode(mode: string | null) {
  if (mode === 'simple' || mode === 'full') setFeatures({}, all(mode === 'full'));
}

/** Features with anything they haven't chosen set to `defaultOn` (true for trip admins). */
export const withDefaults = (saved: Partial<Features> | null, defaultOn: boolean): Features => ({ ...all(defaultOn), ...saved });

/** What the person has chosen (null = nothing yet). Pair with withDefaults. */
export function useFeatureChoice(): Partial<Features> | null {
  const [saved, setSaved] = useState<Partial<Features> | null>(null);
  useEffect(() => {
    const sync = () => setSaved(read());
    sync();
    // Nothing on this phone yet: use what's saved on the account
    if (read() === null) {
      createClient().auth.getSession().then(({ data }) => {
        const f = clean(data.session?.user.user_metadata?.features);
        if (f) store(f);
      });
    }
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return saved;
}

/** Convenience for components that render after their data has loaded. */
export const useFeatures = (defaultOn = false) => withDefaults(useFeatureChoice(), defaultOn);
