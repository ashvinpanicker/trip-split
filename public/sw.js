// TripSplit service worker: opens offline with the last data you saw.
// Pages and Supabase reads are network-first (always fresh when online),
// hashed build files are cache-first. Writes are never cached.
const VERSION = 'v1';
const PAGES = `ts-pages-${VERSION}`;
const STATIC = `ts-static-${VERSION}`;
const DATA = `ts-data-${VERSION}`;
const KEEP = [PAGES, STATIC, DATA];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add('/offline.html')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ts-') && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  // Sent on sign-out so the next person on this phone can't see cached trips
  if (event.data === 'clear') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('ts-')).map((k) => caches.delete(k)))));
  }
});

const cacheable = (res) => res && res.ok && !res.redirected && res.type !== 'opaque';

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const res = await (timeoutMs
      ? Promise.race([fetch(request), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))])
      : fetch(request));
    if (cacheable(res)) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Supabase table reads → last good copy when offline
  if (url.hostname.endsWith('.supabase.co')) {
    // Patchy signal: don't hang, use the last good copy after 5s
    if (url.pathname.startsWith('/rest/v1/')) event.respondWith(networkFirst(request, DATA, 5000));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;

  // Hashed build assets never change
  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (cacheable(res)) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Client-side navigation data: let Next.js handle it (it falls back to a full page load)
  if (request.headers.get('RSC') || url.searchParams.has('_rsc')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, PAGES, 4000).catch(async () => {
        const cache = await caches.open(PAGES);
        return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('/dashboard')) || cache.match('/offline.html');
      }),
    );
  }
});
