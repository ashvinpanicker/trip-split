'use client';

import { useEffect, useState } from 'react';

/**
 * "Advanced features" (stats, activity log, CSV export, %/exact/item splits).
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

export function setAdvanced(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** The saved choice: true/false, or null when the person hasn't chosen (caller picks the default). */
export function useAdvancedPref(): boolean | null {
  const [pref, setPref] = useState<'on' | 'off' | null>(null);
  useEffect(() => {
    const sync = () => setPref(read());
    sync();
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
