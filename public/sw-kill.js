/* Dopahar service worker KILL SWITCH. Use it if sw.js ever misbehaves: copy this file over public/sw.js and deploy
 * (browsers re-check sw.js on every visit), or register it directly. On activate it deletes both caches, unregisters
 * itself and reloads open tabs, after which the game loads from the network like before the worker existed.
 * Per visitor, without a deploy: add ?nosw=1 to the address (src/swRegister.js does the same clean-up). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) { if (k.startsWith('dopahar-')) await caches.delete(k); }
  await self.registration.unregister();
  const tabs = await self.clients.matchAll({ type: 'window' });
  for (const t of tabs) { try { t.navigate(t.url); } catch (err) { /* ignore */ } }
})()));
self.addEventListener('fetch', () => { /* pass through: no respondWith */ });
