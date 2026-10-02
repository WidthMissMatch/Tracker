// Service worker: faster repeat visits and offline replay.
//
//   Content-hashed files (assets/, data/segments/) and fonts → cache-first.
//     Their URL changes whenever their content does, so a cached copy is never stale.
//   Everything else (index.html, manifest.json, favicon) → network-first,
//     falling back to the cache when offline or the network is too slow.
//
// The cache is capped so old hashed files from previous deploys don't pile up.
// Not active inside a sandboxed iframe without allow-same-origin (no storage
// there); the page works the same, just without the cache.

const CACHE = 'raso-v1';
const MAX_ENTRIES = 80;
const NETWORK_TIMEOUT_MS = 4000;
const IMMUTABLE = /\/(assets|fonts|data\/segments)\//;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(IMMUTABLE.test(url.pathname) ? cacheFirst(req) : networkFirst(req));
});

async function put(req, res) {
  if (!res.ok || res.type === 'opaque') return;
  const cache = await caches.open(CACHE);
  await cache.put(req, res);
  const keys = await cache.keys();
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(old);
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const network = fetch(req).then((res) => {
    put(req, res.clone());
    return res;
  });
  network.catch(() => {}); // handled below; avoid an unhandled rejection if the cache answers
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, null));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch {
    // offline — fall through to the cache
  }
  const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
  return hit || network;
}
