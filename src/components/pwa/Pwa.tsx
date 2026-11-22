'use client';

import { useEffect, useState } from 'react';
import { Download, Share, WifiOff, X } from 'lucide-react';
import { clearOutbox } from '@/lib/outbox';

/** Delete cached pages and data, e.g. on sign-out so the next person on this phone sees nothing. */
export async function clearOfflineCache() {
  if (typeof caches === 'undefined') return;
  clearOutbox();
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith('ts-')).map((k) => caches.delete(k)));
}

/** Registers the service worker (production only, so dev reloads stay predictable). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
  }, []);
  return null;
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-100 text-amber-900 text-xs font-medium px-3 py-2">
      <WifiOff size={14} /> Offline. You can still add expenses and payments; they sync when you're back.
    </div>
  );
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISS_KEY = 'tripsplit:install-dismissed';
const INSTALLED_KEY = 'tripsplit:installed';
const remember = (k: string) => { try { localStorage.setItem(k, '1'); } catch {} };
const recalled = (k: string) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };

/** "Add TripSplit to your home screen" card. One tap on Android; Share → Add to Home Screen hint on iPhone. */
/** `persistent` (Profile): ignores earlier dismissals so the option is always findable, and has no close button. */
export function InstallPrompt({ persistent = false }: { persistent?: boolean }) {
  const [event, setEvent] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    // Opened from the home screen: remember it, so the browser stops offering the install
    if (standalone) { remember(INSTALLED_KEY); return; }
    if (!persistent && (recalled(INSTALLED_KEY) || recalled(DISMISS_KEY))) return;
    let cancelled = false;
    // Chrome on Android can tell us directly whether this app is installed
    (navigator as any).getInstalledRelatedApps?.()
      .then((apps: unknown[]) => {
        if (!cancelled && apps?.length) { remember(INSTALLED_KEY); setHidden(true); }
      })
      .catch(() => {});

    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
    if (isIos) { setIos(true); setHidden(false); }

    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as BIPEvent); setHidden(false); };
    const onInstalled = () => { remember(INSTALLED_KEY); setHidden(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [persistent]);

  function dismiss() {
    setHidden(true);
    remember(DISMISS_KEY);
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    setEvent(null);
    if (outcome === 'accepted') { remember(INSTALLED_KEY); setHidden(true); }
  }

  if (hidden || (!event && !ios)) return null;

  return (
    <div className={`${persistent ? '' : 'mx-4 mt-4 '}flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4`}>
      <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">Add TripSplit to your home screen</p>
        {ios ? (
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            Tap <Share size={13} className="inline -mt-0.5" aria-label="Share" /> Share, then <strong>Add to Home Screen</strong>. Opens full-screen and works offline.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-600 mt-1">Opens full-screen and works offline.</p>
            <button onClick={install} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
              <Download size={14} /> Install app
            </button>
          </>
        )}
      </div>
      {!persistent && <button onClick={dismiss} aria-label="Dismiss" className="p-1 text-gray-400"><X size={16} /></button>}
    </div>
  );
}
