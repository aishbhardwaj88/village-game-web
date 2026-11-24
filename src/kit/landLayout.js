/**
 * Shops-land: the one place this kit reads the approved map (docs/layout/approved-map-2026-11-21.json).
 *
 * Prefers the layout agent's loader (src/layout/layout.js: getLayout()) when that file exists in the build, and otherwise
 * fetches the approved export itself. import.meta.glob returns {} for a missing file, so the build never breaks either way.
 * The JSON is emitted as its own asset (?url) and only fetched under ?layout=new, so it never adds to the Before-Play download.
 *
 * Tried 24 Nov (efficiency item 7, "map shipped twice"): the getLayout() success check below never actually succeeds
 * (`Array.isArray(lay.places)` is always false — getLayout() returns `places` as an id-keyed dict, not an array, so this
 * always falls through to the raw fetch, costing an extra ~664 KB/125 KB-gzip request every load). Tried switching to
 * `lay.list` (the real places array getLayout() keeps alongside the dict) — shape-compatible with every consumer
 * checked (shopsPlace.js/matchPlace, landTrees.js, landFields.js, landCanal.js, landProps.js all just need an
 * iterable array of {id,name,x,z,front,existing}, which mapData.json's `list` is, same fields as the raw file plus
 * more) — but it changed which objects get `o.rect` (the corrected, road-snapped footprint from tools/layout-pack.mjs),
 * and that REGRESSED tools/world-validator.js's "nothing buried" check: 3 merged house-batch meshes
 * (village_static_merged/hb_main_25, hb_wood_26, hb_props_27) sank underground that are clean on the unmodified raw-
 * fetch path. Reverted here; the real fix needs someone who can see WHY those three batches sink under the packed
 * footprints (a Y/height mismatch between mapData.json's footprint data and whatever reads it for ground height),
 * not a blind swap. Left as a NEEDS_YOU/BACKLOG item instead of shipped broken.
 *
 * Map coords = game world coords (x east, z south, metres). Checked 21 Nov against three running places:
 * house 652.1,40.2 / school 556.5,108.5 / halwai 637.4,21.4 / temple 695.7,-78.3 = anchors.js + MAP_SHIFT (600,0). All match.
 */
import mapUrl from '../../docs/layout/approved-map-2026-11-21.json?url';
import { isNewLayout } from '../layout/layout.js';

const layoutModules = import.meta.glob('../layout/layout.js');

// Fixed 24 Nov: this was its own literal ?layout=new query-string check (same stale-default bug fixed in
// landInit.js/mapObjectsInit.js/canal.js). Currently unused (no importer left in src/), kept exported and
// correct in case a future module reaches for it — isNewLayout() (src/layout/layout.js) is the one real switch.
export function isNewLayoutParam() {
  return isNewLayout();
}

let loading = null;
/** Resolves to the raw approved map { places, roads, objects, canal }. */
export function loadLandMap() {
  if (loading) return loading;
  loading = (async () => {
    const load = layoutModules['../layout/layout.js'];
    if (load) {
      try {
        const L = await load();
        const lay = L.getLayout ? await L.getLayout() : null;
        if (lay && Array.isArray(lay.objects) && Array.isArray(lay.places)) return lay;
      } catch (e) { /* fall back to the export below */ }
    }
    const res = await fetch(mapUrl);
    return res.json();
  })();
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
