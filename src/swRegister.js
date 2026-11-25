/**
 * Service worker wiring (25 Nov caching plan, task B). Web production build only: not the dev server, not the desktop app.
 *   ?nosw=1  kill switch: unregisters the worker, deletes its caches, skips registration. Never touches localStorage (saves).
 * registerServiceWorker() runs at the start of main(); seedAndPrune() 3 s after Play is ready.
 * This is the service_worker family: builds/owns public/sw.js and its hand-authored emergency kill switch
 * public/sw-kill.js (copy it over sw.js and deploy if the worker ever misbehaves - see that file's own header).
 */
import { getEdition } from './edition.js';

const BASE = import.meta.env.BASE_URL;
const CACHE_PREFIX = 'dopahar-';

function killSwitch() {
  return (async () => {
    try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { /* ignore */ }
    try { for (const k of await caches.keys()) if (k.startsWith(CACHE_PREFIX)) await caches.delete(k); } catch (e) { /* ignore */ }
  })();
}

export function initServiceWorkerSupport() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || getEdition() === 'desktop') return false;
  // A chunk that 404s after a deploy (old tab, new files): reload once to pick up the new build.
  window.addEventListener('vite:preloadError', () => {
    try { if (sessionStorage.getItem('dopahar_preload_reload')) return; sessionStorage.setItem('dopahar_preload_reload', '1'); } catch (e) { /* ignore */ }
    location.reload();
  });
  try { performance.setResourceTimingBufferSize(1000); } catch (e) { /* ignore */ }
  if (new URLSearchParams(location.search).has('nosw')) { killSwitch(); return false; }
  // 25 Nov: a deploy must reach returning visitors on the next load. sw.js is never read from the HTTP cache (updateViaCache none), is
  // re-checked on every load, and its bytes change with every build (MANIFEST). skipWaiting + clients.claim in sw.js make the new worker
  // take over at once; when it takes over a page that was already controlled by an older worker, reload ONCE so the page runs the new build.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // first install: nothing stale to replace
    try { if (sessionStorage.getItem('dopahar_sw_reload')) return; sessionStorage.setItem('dopahar_sw_reload', '1'); } catch (e) { /* ignore */ }
    location.reload();
  });
  const reg = () => navigator.serviceWorker.register(BASE + 'sw.js', { scope: BASE, updateViaCache: 'none' }).then((r) => r.update().catch(() => {})).catch(() => {});
  if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg, { once: true });
  return true;
}

/** 3 s after Play is ready: fetch the ?v= files and chunks this page already loaded through the worker (so it stores them, a
 * first visit is cached too), then ask it to drop anything from older builds. Quiet, low priority, never blocks play. */
export function seedAndPrune() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || getEdition() === 'desktop') return;
  if (new URLSearchParams(location.search).has('nosw')) return;
  setTimeout(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((res) => { navigator.serviceWorker.addEventListener('controllerchange', res, { once: true }); setTimeout(res, 4000); });
      const urls = new Set();
      for (const e of performance.getEntriesByType('resource')) {
        let u; try { u = new URL(e.name); } catch (err) { continue; }
        if (u.origin !== location.origin) continue;
        if (u.searchParams.has('v') || /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(?:js|css|json)$/.test(u.pathname)) urls.add(e.name);
      }
      const list = [...urls];
      let i = 0;
      const worker = async () => { while (i < list.length) { const u = list[i++]; try { await (await fetch(u, { cache: 'force-cache', priority: 'low' })).arrayBuffer(); } catch (err) { /* ignore */ } } };
      await Promise.all([worker(), worker(), worker()]);
      (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: 'prune' });
    } catch (e) { /* the game works without it */ }
  }, 3000);
}

if (typeof window !== 'undefined') window.__swSeed = seedAndPrune; // test hook: tools can run the seed without pressing Play
