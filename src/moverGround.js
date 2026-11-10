import { groundAt, settlingReleased } from './standOn.js';
import { dipHeightRaw } from './dips.js';
import { pAdd } from './perfProbe.js';

/**
 * Ground under things that MOVE (docs/PARALLEL.md G3, her order 10 Nov: "cycle was being run inside the ground, people's
 * feet were inside the ground"). Walkers, carts, vehicles and the player's cycle read the surface height under their feet /
 * each wheel every frame from src/standOn.js's cached surface index (a vertical triangle-grid lookup, never a THREE.Raycaster,
 * never an index rebuild: fresh = false). The settle scheduler owns the index; this file only reads it.
 *
 *   surfaceAt(scene, x, z, footY, rise)   surface at (x, z) a foot at footY can stand on, at most `rise` above it
 *   followGround(st, scene, x, z, footY, rise)
 *                                         the same, cached on `st`: re-probed only after STEP of travel (a walker at 1.2 m/s
 *                                         probes ~10 times a second, a parked cart never)
 *
 * Until the opening view is up (settling held, src/ui.js releaseSettling) only the dug ground is read, so nothing here can
 * trigger the first full-scene index build during loading.
 */
const STEP = 0.12;
const PROBE = 0.45; // src/standOn.js PROBE: groundAt looks this far above the foot

export function surfaceAt(scene, x, z, footY = 0, rise = PROBE) {
  if (!scene || !settlingReleased()) return dipHeightRaw(x, z);
  const t = performance.now();
  const y = groundAt(scene, x, z, footY + rise - PROBE, false);
  pAdd('moverGround', performance.now() - t);
  return y;
}

export function followGround(st, scene, x, z, footY = 0, rise = PROBE) {
  if (st._gx === undefined || st._gs !== scene || Math.abs(x - st._gx) + Math.abs(z - st._gz) > STEP || st._gr !== settlingReleased()) {
    st._gy = surfaceAt(scene, x, z, footY, rise);
    st._gx = x; st._gz = z; st._gs = scene; st._gr = settlingReleased();
  }
  return st._gy;
}

/** Scene an object is in (null while detached), walking parents. */
export function sceneOfObj(o) { for (let q = o; q; q = q.parent) if (q.isScene) return q; return null; }
