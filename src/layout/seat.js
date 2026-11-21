/**
 * S7 helpers for things placed by hand beside a road (signposts, boards, props) under ?layout=new.
 *   seatBesideRoad(x, z, opts) -> { x, z, moved } : the nearest spot to (x, z), searching outward up to `reach` m, that is
 *     clear of every building of the approved map (src/save.js inBuilding), at least `kerb` m off every carriageway and at
 *     most `near` m from a road edge. Returns null when there is none (the caller drops the thing).
 *   faceRoadYaw(x, z) : the yaw (three.js rotation.y) that points local +z at the nearest road.
 *   clearOfLayout(x, z, r) : true when a thing of radius r at (x, z) touches no building and no carriageway.
 */
import { getLayout } from './layout.js';
import { nearestRoad, roadUnder, yawOf } from './layoutCore.js';
import { inBuilding } from '../save.js';

const roads = () => getLayout().roads;

export function clearOfLayout(x, z, r = 0.5) {
  return !inBuilding(x, z, r) && !roadUnder(roads(), x, z, -r);
}

export function seatBesideRoad(x, z, { reach = 10, kerb = 0.6, near = 6, r = 0.4 } = {}) {
  const ok = (px, pz) => {
    if (inBuilding(px, pz, r)) return false;
    if (roadUnder(roads(), px, pz, -kerb)) return false;
    const n = nearestRoad(roads(), px, pz);
    return !!n && n.edge <= near;
  };
  if (ok(x, z)) return { x, z, moved: 0 };
  for (let d = 0.5; d <= reach; d += 0.5) {
    const steps = Math.max(8, Math.round(d * 6));
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (ok(px, pz)) return { x: +px.toFixed(2), z: +pz.toFixed(2), moved: d };
    }
  }
  return null;
}

export function faceRoadYaw(x, z) {
  const n = nearestRoad(roads(), x, z);
  return n ? yawOf(n.qx - x, n.qz - z) : 0;
}

/** The nearest spot within `reach` m of (x, z) where a thing of radius r touches no building and no carriageway, or null. */
export function nearestClear(x, z, r = 0.5, reach = 8) {
  if (clearOfLayout(x, z, r)) return { x, z, moved: 0 };
  for (let d = 0.5; d <= reach; d += 0.5) {
    const steps = Math.max(8, Math.round(d * 6));
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (clearOfLayout(px, pz, r)) return { x: +px.toFixed(2), z: +pz.toFixed(2), moved: d };
    }
  }
  return null;
}
