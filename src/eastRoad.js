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

/** Streaming pieces: each polyline leg is one piece, with its end points, length and heading. */
export function roadLegs() {
  return ROAD_PTS.slice(1).map((b, i) => {
    const a = ROAD_PTS[i];
    return { id: `east_road_${i}`, a: { x: a[0], z: a[1] }, b: { x: b[0], z: b[1] }, len: lens[i], i };
  });
}
