/**
 * HER RULE (26 Nov): NO OBJECT ON A ROAD. Pure footprint test for the doorstep clutter of the new-map houses
 * (khaat, tulsi chaura, matka, bucket, LPG cylinder, bicycle). `clearance(x, z)` = metres from a point to the nearest road edge
 * (negative = inside a road band), e.g. makeRoadIndex().clearance. No game imports, so tools/road-clearance-props.mjs runs the same code.
 * A prop is dropped (never moved: house fronts are fixed and the side/back yards are not modelled) when any point of its footprint
 * outline is nearer a road than its limit. Khaat keep the older, stricter 1.2 m; everything else needs 0.6 m.
 */
export const KHAAT_MIN_ROAD = 1.2, PROP_MIN_ROAD = 0.6;
/** half extents [x, z] of each clutter footprint, metres (house-local, before yaw) */
const HALF = { charpai: [0.95, 0.5], bicycle: [0.62, 0.3], bucket: [0.5, 0.2], matka: [0.7, 0.3], tulsi: [0.32, 0.32], cylinder: [0.16, 0.16] };
/** world-space outline sample points (centre, corners, edge midpoints) of clutter c on house e (local x, z scaled by e.sx / e.sz) */
export function clutterOutline(e, c) {
  const [hx, hz] = HALF[c.kind] || [0.5, 0.5], cs = Math.cos(e.ry), sn = Math.sin(e.ry), cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
  const pts = [];
  for (const [ox, oz] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const px = ox * hx, pz = oz * hz;
    const lx = (c.x + px * cy + pz * sy) * (e.sx || 1), lz = (c.z - px * sy + pz * cy) * (e.sz || 1);
    pts.push([e.x + lx * cs + lz * sn, e.z - lx * sn + lz * cs]);
  }
  return pts;
}
/** worst (smallest) road-edge clearance over the prop's outline */
export const clutterClearance = (e, c, clearance) => clutterOutline(e, c).reduce((m, [x, z]) => Math.min(m, clearance(x, z)), 1e9);
export const clutterKeep = (e, c, clearance) => clutterClearance(e, c, clearance) >= (c.kind === 'charpai' ? KHAAT_MIN_ROAD : PROP_MIN_ROAD);
export const filterClutter = (e, list, clearance) => list.filter((c) => clutterKeep(e, c, clearance));
