'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-PTGJR5BMQZ';
const enabled = process.env.NODE_ENV === 'production' && !!GA_ID;

/** Trip IDs and invite codes never reach Google: they're replaced with placeholders. */
export const cleanPath = (p: string) =>
  p.replace(/^\/join\/[^/]+/, '/join/:code').replace(/^\/groups\/[0-9a-f-]{36}/i, '/groups/:id');

type W = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; __gaReady?: boolean };

/** Google Analytics 4: page views only, no ad signals. One page_view per route, sent from here. */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    const w = window as W;
    if (!w.__gaReady) {
      w.dataLayer = w.dataLayer || [];
      // gtag must push the real `arguments` object
      // eslint-disable-next-line prefer-rest-params
      w.gtag = function gtag() { w.dataLayer!.push(arguments); };
      w.gtag('js', new Date());
      w.gtag('config', GA_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
      w.__gaReady = true;
    }
    const path = cleanPath(pathname);
    w.gtag!('event', 'page_view', { page_path: path, page_location: `${location.origin}${path}`, page_title: document.title });
  }, [pathname]);

  if (!enabled) return null;
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />;
}
