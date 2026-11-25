/**
 * The game's one hook into the map objects layer (src/main.js, block "// S7 WIRING (mapobjects)"). Tiny on purpose: the
 * layer itself loads as its own chunk and only under the new layout, so the old layout and the Before-Play download
 * are unchanged. Resolves to { group, layers, report } or null.
 */
import { isNewLayout } from '../layout/layout.js';
import { whenGateOpen, track } from './lateBuild.js';

// Fixed 24 Nov: same stale-query-string bug as src/kit/landInit.js — this never fired on a plain page load once
// the new layout became the default with no query string required, so tubewells, channels, ponds, the tank, the
// tower, the gate and field/yard props of the approved map were silently not building on the live site.
export function initMapObjects(scene, opts = {}) {
  if (typeof window === 'undefined' || !isNewLayout()) return Promise.resolve(null);
  // Boot-CPU pass (25 Nov): chunk downloads now, build runs after the Play gate in short slices (src/kit/lateBuild.js)
  const chunk = import('./mapObjects.js');
  return track(whenGateOpen()
    .then(() => chunk)
    .then((m) => m.buildMapObjects(scene, opts))
    .then((r) => { if (r) window.__s7mapobjects = r; return r; })
    .catch((e) => { console.warn('map objects did not build', e); return null; }));
}
