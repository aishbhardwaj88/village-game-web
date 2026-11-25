/* Dopahar service worker (25 Nov caching plan, task B). Repeat visits read files from the device, not the network.
 *  - any url with ?v=<hash> (src/assetUrl.js): cache-first in dopahar-assets-v1 (cache name never changes; a new hash is a new url)
 *  - hashed JS / CSS / JSON chunks: cache-first in dopahar-code-v1
 *  - the page (index.html): NETWORK-first (2.5 s patience), cached copy only offline or slow: a stale page after a deploy asks for
 *    files the host no longer has and stalls the load (25 Nov). Assets stay cache-first, so repeat visits still move ~0 MB.
 *    A stale page whose chunk 404s after a deploy reloads once (src/swRegister.js, vite:preloadError).
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

const pageKey = (req) => { const u = new URL(req.url); u.search = ''; u.hash = ''; return u.href; }; // one cached page for every ?query variant
// Network first for the page (a tiny HTML file), 2.5 s patience, then the cached copy (offline / slow network). The page names the
// hashed files of ITS build: a stale cached page after a deploy asks for files the host no longer has (404) and the load stalls,
// so the page is never served stale while the network answers. Every hashed asset stays cache-first, so a repeat visit still
// moves almost no bytes. Fixed 25 Nov (found on the laptop: repeat visit stuck at "Loading the village 75%" right after a deploy).
async function pageFirst(e, req) {
  const cache = await caches.open(CODE);
  const key = pageKey(req);
  const fresh = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(async (res) => {
    if (res && res.status === 200 && res.type === 'basic') { try { await cache.put(key, res.clone()); } catch (err) { /* quota */ } }
    return res;
  });
  const hit = await cache.match(key);
  if (!hit) {
    try { return await fresh; } catch (err) {
      const alt = await cache.match(new URL('./', self.location.href).href, { ignoreSearch: true });
      if (alt) return alt;
      throw err;
    }
  }
  const res = await Promise.race([fresh.catch(() => null), new Promise((r) => setTimeout(() => r(null), 2500))]);
  if (res && res.ok) return res;
  e.waitUntil(fresh.catch(() => {}));
  return hit;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.searchParams.has('nosw')) return; // kill switch: straight to the network
  if (req.mode === 'navigate') { e.respondWith(pageFirst(e, req)); return; }
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
