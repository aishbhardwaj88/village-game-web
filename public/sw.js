/* Dopahar service worker (25 Nov caching plan, task B). Repeat visits read files from the device, not the network.
 *  - any url with ?v=<hash> (src/assetUrl.js): cache-first in dopahar-assets-v1 (cache name never changes; a new hash is a new url)
 *  - hashed JS / CSS / JSON chunks: cache-first in dopahar-code-v1
 *  - the page (index.html): always asked fresh (cache: no-cache), the cached copy is only the offline fallback
 *  - skipped: non-GET, cross-origin, Range requests
 *  - message 'prune': drops entries whose ?v= is no longer current and chunks of older builds
 * Saves live in localStorage; this file never touches them. Kill switch: ?nosw=1 on the address, or replace this file with
 * sw-kill.js (see docs). The MANIFEST below is filled in at build time by vite.config.js (swManifestPlugin). */
const ASSETS = 'dopahar-assets-v1';
const CODE = 'dopahar-code-v1';
const MANIFEST = /*MANIFEST*/null/*END*/;
const CHUNK = /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(?:js|css|json)$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req.url, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.status === 200 && res.type === 'basic') { try { await cache.put(req.url, res.clone()); } catch (e) { /* quota */ } }
  return res;
}

async function freshPage(req) {
  const cache = await caches.open(CODE);
  try {
    const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
    if (res && res.status === 200 && res.type === 'basic') { try { await cache.put(req.url.split('#')[0], res.clone()); } catch (e) { /* quota */ } }
    return res;
  } catch (err) {
    const hit = (await cache.match(req.url, { ignoreSearch: true })) || (await cache.match(new URL('./', self.location.href).href, { ignoreSearch: true }));
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(freshPage(req)); return; }
  if (url.searchParams.has('v')) { e.respondWith(cacheFirst(req, ASSETS)); return; }
  if (CHUNK.test(url.pathname) && !url.search) { e.respondWith(cacheFirst(req, CODE)); }
});

async function prune() {
  if (!MANIFEST) return;
  const base = new URL('./', self.location.href).pathname; // e.g. /village-game-web/
  const validAssets = new Set(MANIFEST.assets.map((a) => base + a));
  const validChunks = new Set(MANIFEST.chunks.map((c) => base + c));
  const assets = await caches.open(ASSETS);
  for (const r of await assets.keys()) {
    const u = new URL(r.url);
    if (!validAssets.has(u.pathname + u.search)) await assets.delete(r);
  }
  const code = await caches.open(CODE);
  for (const r of await code.keys()) {
    const u = new URL(r.url);
    if (CHUNK.test(u.pathname) && !validChunks.has(u.pathname)) await code.delete(r);
  }
}
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'prune') e.waitUntil(prune()); });
