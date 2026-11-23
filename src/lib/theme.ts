'use client';

import { useEffect, useState } from 'react';

/**
 * App theme: follow the phone (auto), or always light / always dark.
 * Applied as a class on <body> (theme-light / theme-dark); globals.css reads it.
 * An inline script in the root layout (src/app/layout.tsx) applies it before first paint.
 */
export type Theme = 'auto' | 'light' | 'dark';
const KEY = 'tripsplit:theme';
const EVENT = 'tripsplit:theme-changed';

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {}
  return 'auto';
}

export function applyTheme(t: Theme) {
  document.body.classList.toggle('theme-light', t === 'light');
  document.body.classList.toggle('theme-dark', t === 'dark');
}

export function setTheme(t: Theme) {
  try { if (t === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch {}
  applyTheme(t);
  window.dispatchEvent(new Event(EVENT));
}

/** Is the app showing dark right now (chosen, or following a dark phone)? */
export function isDark(): boolean {
  const t = getTheme();
  return t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
}

export function useTheme() {
  const [theme, set] = useState<Theme>('auto');
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => { set(getTheme()); setDark(isDark()); };
    sync();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    window.addEventListener(EVENT, sync);
    mq.addEventListener('change', sync);
    return () => { window.removeEventListener(EVENT, sync); mq.removeEventListener('change', sync); };
  }, []);
  return { theme, dark, setTheme };
}
