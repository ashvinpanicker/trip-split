'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const TRIGGER = 70; // px of pull needed

/**
 * Pull down at the top of any app page to reload its data. The installed iPhone app has no
 * built-in pull-to-refresh, so this adds one. Data hooks listen for 'tripsplit:refresh'.
 */
export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const start = useRef<number | null>(null);
  const pulled = useRef(0);

  useEffect(() => {
    const atTop = () => (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0;
    const inModal = (t: EventTarget | null) => t instanceof Element && !!t.closest('[role="dialog"]');

    const onStart = (e: TouchEvent) => {
      start.current = atTop() && !inModal(e.target) && e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || !atTop()) { pulled.current = 0; setPull(0); return; }
      pulled.current = Math.min(110, dy * 0.5); // resistance
      setPull(pulled.current);
    };
    const onEnd = () => {
      if (start.current === null) return;
      start.current = null;
      if (pulled.current >= TRIGGER) {
        setSpinning(true);
        window.dispatchEvent(new Event('tripsplit:refresh'));
        setTimeout(() => setSpinning(false), 900);
      }
      pulled.current = 0;
      setPull(0);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  const shown = spinning ? TRIGGER : pull;
  if (!shown) return null;
  return (
    <div
      aria-live="polite"
      className="fixed left-1/2 z-50 -translate-x-1/2 rounded-full bg-white shadow-md border border-gray-100 p-2"
      style={{ top: `calc(env(safe-area-inset-top) + ${Math.min(shown, TRIGGER) - 30}px)` }}
    >
      <RefreshCw
        size={18}
        className={`text-blue-600 ${spinning ? 'animate-spin' : ''}`}
        style={spinning ? undefined : { transform: `rotate(${shown * 4}deg)`, opacity: Math.min(1, shown / TRIGGER) }}
      />
      <span className="sr-only">{spinning ? 'Refreshing' : 'Pull to refresh'}</span>
    </div>
  );
}
