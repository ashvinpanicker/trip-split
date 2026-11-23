'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Optional features, each with its own switch in Settings. The ones that change how you add
 * or settle are off for friends until they turn them on; harmless extras are on.
 * Trip admins get everything (until they choose).
 * Saved on this phone and on the account, so the choice follows them to other devices.
 */
export const FEATURES = ['splits', 'payments', 'activity', 'export'] as const;
export type Feature = (typeof FEATURES)[number];
export type Features = Record<Feature, boolean>;

const KEY = 'tripsplit:features';
const OLD_KEY = 'tripsplit:advanced'; // the single on/off switch it replaces
const EVENT = 'tripsplit:features-changed';

const FRIEND_DEFAULTS: Features = { splits: false, payments: false, activity: true, export: true };
const ADMIN_DEFAULTS: Features = { splits: true, payments: true, activity: true, export: true };
const clean = (v: unknown): Partial<Features> | null =>
  v && typeof v === 'object' ? Object.fromEntries(FEATURES.filter((f) => typeof (v as Features)[f] === 'boolean').map((f) => [f, (v as Features)[f]])) : null;

function read(): Partial<Features> | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return clean(JSON.parse(v));
    const old = localStorage.getItem(OLD_KEY);
    return old === 'on' ? ADMIN_DEFAULTS : old === 'off' ? FRIEND_DEFAULTS : null;
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

/** Features, with anything they haven't chosen at its default (admins: everything on). */
export const withDefaults = (saved: Partial<Features> | null, isAdmin: boolean): Features => ({ ...(isAdmin ? ADMIN_DEFAULTS : FRIEND_DEFAULTS), ...saved });

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
export const useFeatures = (isAdmin = false) => withDefaults(useFeatureChoice(), isAdmin);
