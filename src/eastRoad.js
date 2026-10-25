/**
 * The east road (docs/FEEDBACK.md item 8, A-2c): the east gali carried on from its end at (36,76) to the tarmac of the highway,
 * so the far-east cluster has a visible way to walk to. Pure data and a sampler; the geometry is createEastRoadSegment
 * (src/farmSites.js), the stones beside it are src/milestones.js. Nothing in the cluster was moved: the bend at x 86-104 swings
 * south to clear the chemist at (96,60).
 */
export const ROAD_PTS = [[36, 76], [60, 69], [90, 68.5], [103, 66], [116, 58], [135.3, 52.3], [174.7, 45.3], [194.4, 41.8]];
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

/** Spurs: 3.5 m earth tracks (no drain) leaving the east road to the far-east cluster. Each polyline ends at the edge of its place's radius (PLACES). */
export const SPURS = [
  { id: 'health', pts: [[106, 64.6], [106, 46]] },
  { id: 'johad', pts: [[78, 69], [78, 85]] },
  { id: 'masjid', pts: [[103, 66], [101, 100], [100, 117]] },
  { id: 'gurukul', pts: [[152, 48], [152, 62]] },
  { id: 'maidan', pts: [[128, 55], [128, 100], [128, 130], [139, 135]] },
  { id: 'jain', pts: [[128, 130], [130, 142]] },
  { id: 'haveli', pts: [[150, 49], [150, 8], [150, -4]] },
  { id: 'tvhouse', pts: [[62, 69.5], [68, 40], [70, 27]] },
  // West and south spurs (the road does not reach them): off the west gali, the south gali and the gali north end.
  { id: 'pond', bare: true, pts: [[-84, 32], [-104, 32], [-114, 50], [-114, 62]] }, // leaves the west gali north of the W1 rows (the rows are continuous z 41-103, a spur through them hit house walls)
  { id: 'mela', pts: [[-100, 140], [-111, 145]] },
  { id: 'cane', bare: true, pts: [[-6, 130], [-6, 146]] }, // sugarcane belt, off the east gali's south end
  { id: 'gurudwara', pts: [[-60, 140], [-60, 158]] },
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
