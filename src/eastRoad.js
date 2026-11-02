/**
 * The east road (docs/FEEDBACK.md item 8, A-2c), RETIRED as a surface on 3 Nov (her playtest notes items 1 and 3).
 * It predated the 1 Nov map: it ran on top of the map's own south outer lane for 50 m, then stopped in open grass 9 m
 * short of anything, and its spurs cut straight across the new village (the TV-house spur crossed the square). The map's
 * own roads now reach every place it served (src/mapRoads.js, src/roadNetwork.js).
 *
 * What still uses this module is the street life and the milestones, so ROAD_PTS now follows a real road: the map's
 * east outer lane (the tractor route), from where the south outer lane meets it, out past the jain mandir, the baagh
 * and the mela towards the farm loop. roadLegs() and spurLegs() return nothing, so no earth bed, edging, lamps or trees
 * are laid along the old line.
 */
import { MAP_SHIFT } from './mapPlan.js';
// docs/layout/village-plan-positions-2026-11-01.json, lanes_and_tracks "Outer lane, east (tractor route)", from (88.8, 65.7) on
const ROUTE = [[88.8, 65.7], [105.5, 82], [109.6, 90], [109.6, 102], [128, 112], [172, 114], [232.7, 113.3]];
export const ROAD_PTS = ROUTE.map(([x, z]) => [x + MAP_SHIFT.x, z + MAP_SHIFT.z]);
export const ROAD_WIDTH = 5.5;

const lens = ROAD_PTS.slice(1).map((p, i) => Math.hypot(p[0] - ROAD_PTS[i][0], p[1] - ROAD_PTS[i][1]));
export const ROAD_LEN = lens.reduce((a, b) => a + b, 0);

/** Point s metres along the road: { x, z, ux, uz } (u = unit direction of travel, eastbound). */
export function roadAt(s) {
  let r = Math.max(0, Math.min(ROAD_LEN, s));
  for (let i = 0; i < lens.length; i++) {
    if (r <= lens[i] || i === lens.length - 1) {
      const a = ROAD_PTS[i], b = ROAD_PTS[i + 1], t = r / lens[i];
      return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, ux: (b[0] - a[0]) / lens[i], uz: (b[1] - a[1]) / lens[i] };
    }
    r -= lens[i];
  }
}

/** Spurs: none. The old ones (gurukul, maidan, TV house) crossed the new village; the map's own lanes reach those places. */
export const SPURS = [];
export const SPUR_WIDTH = 3.5;

/** Streaming pieces: each polyline leg is one piece, with its end points, length and heading. */
export function roadLegs() {
  return [];
}

/** The legs of ROAD_PTS (kept for audits; nothing is built from them). */
export function routeLegs() {
  return ROAD_PTS.slice(1).map((b, i) => {
    const a = ROAD_PTS[i];
    return { id: `east_road_${i}`, a: { x: a[0], z: a[1] }, b: { x: b[0], z: b[1] }, len: lens[i], i };
  });
}

/** Spur legs, same shape as roadLegs() plus a width and no drain. */
export function spurLegs() {
  return SPURS.flatMap((sp) => sp.pts.slice(1).map((b, i) => {
    const a = sp.pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { id: `spur_${sp.id}_${i}`, a: { x: a[0], z: a[1] }, b: { x: b[0], z: b[1] }, len, i, w: SPUR_WIDTH, noDrain: true, bare: sp.bare };
  }));
}
