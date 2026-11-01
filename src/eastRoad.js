/**
 * The east road (docs/FEEDBACK.md item 8, A-2c): the east gali carried on from its end at (36,76) to the tarmac of the highway,
 * so the far-east cluster has a visible way to walk to. Pure data and a sampler; the geometry is createEastRoadSegment
 * (src/farmSites.js), the stones beside it are src/milestones.js. Nothing in the cluster was moved: the bend at x 86-104 swings
 * south to clear the chemist at (96,60).
 */
import { pt, OLD_SHIFT } from './anchors.js';
const HWY = pt('highway');
const OX = OLD_SHIFT.x; // the old village's own layout rides east with the highway anchor (src/anchors.js OLD_SHIFT)
export const ROAD_PTS = [[36 + OX, 76], [60 + OX, 69], [90 + OX, 68.5], [103 + OX, 66], [116 + OX, 58], [135.3 + OX, 52.3], [174.7 + OX, 45.3], [HWY.x - 10.6, HWY.z + 1.8]]; // far end meets the highway anchor
export const ROAD_WIDTH = 5;

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

const A_health = pt('health'); const A_johad = pt('johad'); const A_masjid = pt('masjid'); const A_gurukul = pt('gurukul'); const A_maidan = pt('maidan'); const A_jain = pt('jain'); const A_haveli = pt('haveli'); const A_tvhouse = pt('tvhouse'); const A_pond = pt('pond'); const A_mela = pt('mela'); const A_cane = pt('cane'); const A_gurudwara = pt('gurudwara');
/** Spurs: 3.5 m earth tracks (no drain) leaving the east road to the far-east cluster. Each polyline ends at the edge of its place's radius (PLACES). */
export const SPURS = [
  // spur 'health' dropped: its place stands on the 1 Nov map, whose own roads reach it (src/mapRoads.js)
  // spur 'johad' dropped: its place stands on the 1 Nov map, whose own roads reach it (src/mapRoads.js)
  // spur 'masjid' dropped: its place stands on the 1 Nov map, whose own roads reach it (src/mapRoads.js)
  { id: 'gurukul', pts: [[152 + OX, 48], [A_gurukul.x - 8, A_gurukul.z - 23]] },
  { id: 'maidan', pts: [[128 + OX, 55], [128 + OX, 100], [128 + OX, 130], [A_maidan.x - 26, A_maidan.z + 0]] },
  // spur 'jain' dropped: its place stands on the 1 Nov map, whose own roads reach it (src/mapRoads.js)
  // spur 'haveli' dropped: its place stands on the 1 Nov map, whose own roads reach it (src/mapRoads.js)
  { id: 'tvhouse', pts: [[62 + OX, 69.5], [68 + OX, 40], [A_tvhouse.x + 0, A_tvhouse.z + 15]] },
  // West and south spurs (the road does not reach them): off the west gali, the south gali and the gali north end.
  // spur 'pond' dropped: its place stands on the 1 Nov map, whose own roads reach it (src/mapRoads.js)
  // spur 'mela' dropped: its place stands on the 1 Nov map, whose own roads reach it (src/mapRoads.js)
  { id: 'cane', bare: true, pts: [[-6 + OX, 130], [A_cane.x - 26, A_cane.z - 4]] },
  // spur 'gurudwara' dropped: its place stands on the 1 Nov map, whose own roads reach it (src/mapRoads.js)
];
export const SPUR_WIDTH = 3.5;

/** Streaming pieces: each polyline leg is one piece, with its end points, length and heading. */
export function roadLegs() {
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
