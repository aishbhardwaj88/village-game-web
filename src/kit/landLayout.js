/**
 * Shops-land: the one place this kit reads the approved map (docs/layout/approved-map-2026-11-21.json).
 *
 * Always fetches the raw export itself (?url, lazy — never adds to the Before-Play download). An earlier version of
 * this file also tried src/layout/layout.js's getLayout() first, to skip the fetch when that data was already in
 * memory. Removed 24 Nov (item 7, "map shipped twice") after actually comparing the two files field by field, not
 * just by shape:
 *   - The always-false part was real and harmless to drop: getLayout()'s `places` is an id-keyed dict by design
 *     (`getPlace = (id) => getLayout().places[id]`), so `Array.isArray(lay.places)` can never pass — the old code
 *     always fell through to this same fetch anyway, just after wastefully importing layout.js and dict-building
 *     1643 objects first. Gone now; behaviour is unchanged (always this fetch), cost is lower (no wasted work).
 *   - The real fix (serve getLayout()'s already-in-memory mapData.json instead of re-fetching the raw file) is NOT
 *     safe to do blindly, for a bigger reason than a shape mismatch: the two files have genuinely diverged data, not
 *     just an extra `rect` key. Checked 24 Nov: raw export objects have 0/1643 with `.rect` (pure ring footprints);
 *     mapData.json objects have 887/1643 with `.rect` (tools/layout-pack.mjs's road-snapped footprints) — AND
 *     mapData.json's `places` carry an `adjust: {turnDeg, dx, dz}` nudge vs the raw file's own place positions (e.g.
 *     place "house": raw x/z 650.1/34.8, mapData x/z 656.43/35.32 — a real ~6.3 m shift, not rounding noise). Swapping
 *     either field changes real positions for every consumer of this loader (shopsPlace.js's `map.places`, every
 *     `o.rect` reader) — confirmed once already: switching objects alone sank 3 merged house-batch meshes
 *     (village_static_merged/hb_main_25, hb_wood_26, hb_props_27) that are clean on this raw-fetch path, a genuine
 *     Y/ground mismatch under the corrected footprints, not a bug in the switch itself. That is layout/position
 *     work, which CLAUDE.md 5a-MAP says to leave alone until the new map lands (she is replacing the whole map) —
 *     so this is parked as [PAUSED-MAP] in docs/BACKLOG.md, not re-attempted here.
 *
 * Map coords = game world coords (x east, z south, metres). Checked 21 Nov against three running places:
 * house 652.1,40.2 / school 556.5,108.5 / halwai 637.4,21.4 / temple 695.7,-78.3 = anchors.js + MAP_SHIFT (600,0). All match.
 */
import mapUrl from '../../docs/layout/approved-map-2026-11-21.json?url';
import { isNewLayout } from '../layout/layout.js';

// Fixed 24 Nov: this was its own literal ?layout=new query-string check (same stale-default bug fixed in
// landInit.js/mapObjectsInit.js/canal.js). Currently unused (no importer left in src/), kept exported and
// correct in case a future module reaches for it — isNewLayout() (src/layout/layout.js) is the one real switch.
export function isNewLayoutParam() {
  return isNewLayout();
}

let loading = null;
/** Resolves to the raw approved map { places, roads, objects, canal }. */
export function loadLandMap() {
  if (!loading) loading = fetch(mapUrl).then((res) => res.json());
  return loading;
}

// ------------------------------------------------------------------------------------------------ geometry helpers
export const labelKey = (o) => o.label.split('|')[0].trim();
export const labelName = (o) => (o.label.split('|')[1] || '').trim();

export function ringCentre(ring) {
  let x = 0, z = 0;
  for (const p of ring) { x += p[0]; z += p[1]; }
  return { x: x / ring.length, z: z / ring.length };
}

/** Radius of a round marker (trees, wells, stacks): mean distance of its ring points from their centre. */
export function ringRadius(ring) {
  const c = ringCentre(ring);
  let r = 0;
  for (const p of ring) r += Math.hypot(p[0] - c.x, p[1] - c.z);
  return r / ring.length;
}

/** A 4-point ring as an oriented rectangle. `front` (unit [x,z], optional) picks which edge is the depth axis. */
export function ringRect(ring, front = null) {
  const c = ringCentre(ring);
  const e1 = [ring[1][0] - ring[0][0], ring[1][1] - ring[0][1]];
  const e2 = [ring[2][0] - ring[1][0], ring[2][1] - ring[1][1]];
  const l1 = Math.hypot(...e1), l2 = Math.hypot(...e2);
  let f = front;
  if (!f) { // no front given: the longer edge is the width (a row-house facing its long side)
    const d = l1 >= l2 ? e2 : e1, l = Math.hypot(...d);
    f = [d[0] / l, d[1] / l];
  }
  // depth = the edge most parallel to the front
  const p1 = Math.abs((e1[0] * f[0] + e1[1] * f[1]) / l1), p2 = Math.abs((e2[0] * f[0] + e2[1] * f[1]) / l2);
  const depth = p1 > p2 ? l1 : l2, width = p1 > p2 ? l2 : l1;
  // snap the front onto the ring's own edge direction so walls stay parallel to the drawn plot (and so to the road)
  const de = p1 > p2 ? e1 : e2, dl = p1 > p2 ? l1 : l2;
  let sf = [de[0] / dl, de[1] / dl];
  if (sf[0] * f[0] + sf[1] * f[1] < 0) sf = [-sf[0], -sf[1]];
  const skewDeg = Math.acos(Math.min(1, Math.abs(sf[0] * f[0] + sf[1] * f[1]))) * 180 / Math.PI;
  return { x: c.x, z: c.z, width, depth, front: sf, ry: Math.atan2(sf[0], sf[1]), skewDeg };
}

/** Even-odd point-in-polygon on [x,z] rings. */
export function inRing(ring, x, z) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], zi = ring[i][1], xj = ring[j][0], zj = ring[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a polyline [[x,z],...]. */
export function distToPolyline(pts, x, z) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

/** A fast road lookup: roads bucketed into a 20 m grid; clearance(x,z) = distance to the nearest road EDGE (negative = on a road). */
export function makeRoadIndex(roads) {
  const CELL = 20, grid = new Map(), segs = [];
  for (const r of roads || []) {
    const half = (r.width || 4) / 2;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const s = { a: r.pts[i], b: r.pts[i + 1], half, id: r.id, kind: r.kind };
      segs.push(s);
      const x0 = Math.floor((Math.min(s.a[0], s.b[0]) - half - 30) / CELL), x1 = Math.floor((Math.max(s.a[0], s.b[0]) + half + 30) / CELL);
      const z0 = Math.floor((Math.min(s.a[1], s.b[1]) - half - 30) / CELL), z1 = Math.floor((Math.max(s.a[1], s.b[1]) + half + 30) / CELL);
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
        const k = gx + ',' + gz;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(s);
      }
    }
  }
  const clearance = (x, z) => {
    const list = grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
    if (!list) return 30;
    let best = 30;
    for (const s of list) {
      const [ax, az] = s.a, [bx, bz] = s.b;
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)) - s.half);
    }
    return best;
  };
  return { clearance, segs };
}

/** Match each object to the place with the same name nearest its centre (places[] carries the TRUE front). */
export function matchPlace(places, name, x, z, maxD = 6) {
  let best = null, bd = maxD;
  for (const p of places) {
    if (p.existing) continue;
    const pn = p.name.replace(/ \(2-storey\)$/, '');
    if (pn !== name && p.name !== name) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

/** Deterministic hash 0..1. */
export function hash01(a, b = 0) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
