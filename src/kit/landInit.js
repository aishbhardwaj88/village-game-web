/**
 * The game's one hook into shops-land (src/main.js S7 WIRING block). Tiny on purpose: the kit itself (shops, trees,
 * fields, canal, props, and the approved map export) is fetched only under the new layout, as its own chunk, so the
 * old layout and the Before-Play download are unchanged.
 */
import { isNewLayout } from '../layout/layout.js';
import { whenGateOpen, track } from './lateBuild.js';

// Fixed 24 Nov: this checked the literal ?layout=new query string, which went stale the moment DEFAULT_LAYOUT
// flipped to 'new' in src/layout/layout.js (21-23 Nov) — a plain load with NO query string is "new layout" too,
// so on the live default URL this never fired and shops-land (shops, trees, fields, canal, flag island, props)
// was silently not building at all. isNewLayout() is the real, current switch every other module reads.
export function initShopsLand(scene, opts = {}) {
  if (typeof window === 'undefined' || !isNewLayout()) return Promise.resolve(null);
  // Boot-CPU pass (25 Nov): the chunk and the map JSON download now (cheap), the BUILD waits for the Play gate and then runs in
  // short slices behind the title screen (src/kit/lateBuild.js); main.js holds the first 3D frame until it is done.
  const chunk = import('./landIndex.js');
  chunk.then((m) => m.prefetchLandMap && m.prefetchLandMap()).catch(() => {});
  return track(whenGateOpen()
    .then(() => chunk)
    .then((m) => m.buildShopsLand(scene, opts))
    .catch((e) => { console.warn('shops-land did not build', e); return null; }));
}
