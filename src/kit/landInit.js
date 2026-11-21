/**
 * The game's one hook into shops-land (src/main.js S7 WIRING block). Tiny on purpose: the kit itself (shops, trees,
 * fields, canal, props, and the approved map export) is fetched only under ?layout=new, as its own chunk, so ?layout=old
 * and the Before-Play download are unchanged.
 */
export function initShopsLand(scene, opts = {}) {
  if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('layout') !== 'new') return Promise.resolve(null);
  return import('./landIndex.js')
    .then((m) => m.buildShopsLand(scene, opts))
    .catch((e) => { console.warn('shops-land did not build', e); return null; });
}
