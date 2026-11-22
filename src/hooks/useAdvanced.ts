'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * "Advanced features" (activity log, CSV export, recording any payment, %/exact/item splits).
 * Off by default to keep the app simple; trip admins get it on unless they turn it off.
 * Stored per device. Profile has the switch.
 */
const KEY = 'tripsplit:advanced';
const EVENT = 'tripsplit:advanced-changed';

function read(): 'on' | 'off' | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

function store(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** Save the choice on this phone and on the account, so it follows them to other devices. */
export function setAdvanced(on: boolean) {
  store(on);
  createClient().auth.updateUser({ data: { app_mode: on ? 'full' : 'simple' } }).catch(() => {});
}

/** From an invite link (?app=simple|full): remembered now, saved to the account once they're signed in. */
export function applyAppMode(mode: string | null) {
  if (mode === 'simple' || mode === 'full') setAdvanced(mode === 'full');
}

/** The saved choice: true/false, or null when the person hasn't chosen (caller picks the default). */
export function useAdvancedPref(): boolean | null {
  const [pref, setPref] = useState<'on' | 'off' | null>(null);
  useEffect(() => {
    const sync = () => setPref(read());
    sync();
    // Nothing on this phone yet: use the choice saved on the account
    if (read() === null) {
      createClient().auth.getSession().then(({ data }) => {
        const mode = data.session?.user.user_metadata?.app_mode;
        if (mode === 'simple' || mode === 'full') store(mode === 'full');
      });
    }
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return pref === null ? null : pref === 'on';
}

export function useAdvanced(defaultOn = false): boolean {
  return useAdvancedPref() ?? defaultOn;
}
