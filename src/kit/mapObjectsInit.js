/**
 * The game's one hook into the map objects layer (src/main.js, block "// S7 WIRING (mapobjects)"). Tiny on purpose: the
 * layer itself loads as its own chunk and only under ?layout=new, so ?layout=old and the Before-Play download are
 * unchanged. Resolves to { group, layers, report } or null.
 */
export function initMapObjects(scene, opts = {}) {
  if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('layout') !== 'new') return Promise.resolve(null);
  return import('./mapObjects.js')
    .then((m) => m.buildMapObjects(scene, opts))
    .then((r) => { if (r) window.__s7mapobjects = r; return r; })
    .catch((e) => { console.warn('map objects did not build', e); return null; });
}
