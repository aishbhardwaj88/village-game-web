/**
 * Houses plan (S7 sprint, houses agent): turns the approved map's 'new_house' rectangles into placed houses.
 * Pure maths, no three.js, so node tools (tools/houses-check.mjs) and the game use the very same numbers.
 *
 * For each footprint (4-point ring, world metres, x east, z south):
 *  - the FRONT is the side that faces its gali/road: from the middle of each side we walk straight out and stop at the
 *    first road corridor (centre line +- half width) or the first other house. A side that meets a house first (the
 *    back of a back-to-back row, a party wall) can never be the front. Of the sides that reach a road, the nearest wins.
 *  - ry is the three.js yaw that turns the house's local +z (the game's front) onto that side's outward normal.
 *  - w = length of the front side (local x), d = depth (local z). x, z = footprint centre.
 * Nothing is snapped or rounded: the house edge is exactly parallel to its own footprint edge (the map draws footprints
 * parallel to their road).
 */

export const ROAD_PROBE_MAX = 40; // metres: a side whose straight-out walk meets no road by then is not a front

function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
function len(a) { return Math.hypot(a[0], a[1]); }

/** Distance from point p to segment ab. */
export function segDist(p, a, b) {
  const abx = b[0] - a[0], abz = b[1] - a[1];
  const l2 = abx * abx + abz * abz || 1e-9;
  let t = ((p[0] - a[0]) * abx + (p[1] - a[1]) * abz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * abx), p[1] - (a[1] + t * abz));
}

/** Point in convex/concave polygon (ring of [x, z]). */
export function inRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** A spatial hash over road segments so the probe walk stays cheap. */
function roadIndex(roads, cell = 20) {
  const grid = new Map();
  const segs = [];
  for (const r of roads) {
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const s = { a: r.pts[i], b: r.pts[i + 1], half: r.width / 2, road: r };
      segs.push(s);
      const pad = s.half + 1;
      const x0 = Math.floor((Math.min(s.a[0], s.b[0]) - pad) / cell), x1 = Math.floor((Math.max(s.a[0], s.b[0]) + pad) / cell);
      const z0 = Math.floor((Math.min(s.a[1], s.b[1]) - pad) / cell), z1 = Math.floor((Math.max(s.a[1], s.b[1]) + pad) / cell);
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
        const k = gx + ',' + gz;
        let l = grid.get(k);
        if (!l) grid.set(k, (l = []));
        l.push(s);
      }
    }
  }
  return {
    segs,
    /** The road whose corridor contains p (or null), with the signed margin (negative = inside by that much). */
    at(p, dir = null) {
      const l = grid.get(Math.floor(p[0] / cell) + ',' + Math.floor(p[1] / cell));
      if (!l) return null;
      let best = null, bm = Infinity;
      for (const s of l) {
        const m = segDist(p, s.a, s.b) - s.half;
        if (m >= 0) continue;
        // at a junction several corridors overlap: with a side direction given, the most parallel road is the one the side faces
        let score = m;
        if (dir) { const ex = s.b[0] - s.a[0], ez = s.b[1] - s.a[1], el = Math.hypot(ex, ez) || 1; score = -Math.abs((ex * dir[0] + ez * dir[1]) / el); }
        if (score < bm) { bm = score; best = s; }
      }
      return best;
    },
    /** Smallest (centre-line distance - half width) over all segments near p: < 0 means p is on a road. */
    clearance(p, r = 12) {
      let best = Infinity;
      const gx0 = Math.floor((p[0] - r) / cell), gx1 = Math.floor((p[0] + r) / cell);
      const gz0 = Math.floor((p[1] - r) / cell), gz1 = Math.floor((p[1] + r) / cell);
      for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
        const l = grid.get(gx + ',' + gz);
        if (l) for (const s of l) { const m = segDist(p, s.a, s.b) - s.half; if (m < best) best = m; }
      }
      return best;
    },
  };
}

function houseIndex(rings, cell = 16) {
  const grid = new Map();
  rings.forEach((ring, i) => {
    const xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]);
    for (let gx = Math.floor(Math.min(...xs) / cell); gx <= Math.floor(Math.max(...xs) / cell); gx++)
      for (let gz = Math.floor(Math.min(...zs) / cell); gz <= Math.floor(Math.max(...zs) / cell); gz++) {
        const k = gx + ',' + gz;
        let l = grid.get(k);
        if (!l) grid.set(k, (l = []));
        l.push(i);
      }
  });
  return { at(p, skip) { const l = grid.get(Math.floor(p[0] / cell) + ',' + Math.floor(p[1] / cell)); if (l) for (const i of l) if (i !== skip && inRing(p, rings[i])) return i; return -1; } };
}

/** Direction (radians, atan2(dz, dx)) of road `r`'s segment nearest to point p. */
function roadDirAt(r, p) {
  let best = 0, bd = Infinity;
  for (let k = 0; k + 1 < r.pts.length; k++) {
    const d = segDist(p, r.pts[k], r.pts[k + 1]);
    if (d < bd) { bd = d; best = Math.atan2(r.pts[k + 1][1] - r.pts[k][1], r.pts[k + 1][0] - r.pts[k][0]); }
  }
  return best;
}
/** Corners of a w x d rectangle centred on (x, z) whose local +z (front) points along yaw ry. */
export function rectCorners(x, z, ry, w, d) {
  const fx = Math.sin(ry), fz = Math.cos(ry); // front
  const rx = fz, rz = -fx; // local +x
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [x + rx * a * w / 2 + fx * b * d / 2, z + rz * a * w / 2 + fz * b * d / 2]);
}

/** Separating-axis overlap of two convex rings, shrunk by `eps` metres (walls that only touch are fine). */
export function ringsOverlap(a, b, eps = 0.05) {
  for (const ring of [a, b]) {
    for (let k = 0; k < ring.length; k++) {
      const p = ring[k], q = ring[(k + 1) % ring.length];
      const nx = q[1] - p[1], nz = p[0] - q[0], l = Math.hypot(nx, nz);
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const v of a) { const t = (v[0] * nx + v[1] * nz) / l; a0 = Math.min(a0, t); a1 = Math.max(a1, t); }
      for (const v of b) { const t = (v[0] * nx + v[1] * nz) / l; b0 = Math.min(b0, t); b1 = Math.max(b1, t); }
      if (a1 - eps <= b0 || b1 - eps <= a0) return false;
    }
  }
  return true;
}

const MAX_ALIGN_DEG = 40; // a footprint turned more than this off its road is left as drawn (and reported)

/**
 * houses: [{ ring: [[x,z] x4], mud: bool }], roads: [{ id, width, pts }].
 * Returns [{ i, x, z, ry, w, d, mud, front: [fx, fz], road: id, roadGap, turned, trimmed, corners }] in the input order.
 * corners = the FINAL rectangle the house is built on (after turning parallel to its road and trimming off any road overlap).
 */
export function planHouses(houses, roads) {
  const rings = houses.map((h) => h.ring);
  const RI = roadIndex(roads);
  const HI = houseIndex(rings);
  // 1. every side that walks straight out onto a road before meeting another house is a candidate front
  const pre = houses.map((h, i) => {
    const ring = h.ring;
    const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length, cz = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const sides = [];
    for (let k = 0; k < 4; k++) {
      const a = ring[k], b = ring[(k + 1) % 4];
      const e = sub(b, a), L = len(e);
      let n = [e[1] / L, -e[0] / L];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if ((mid[0] - cx) * n[0] + (mid[1] - cz) * n[1] < 0) n = [-n[0], -n[1]];
      const hits = [];
      let roadHit = null, segHit = null;
      for (const t of [0.25, 0.5, 0.75]) {
        const p0 = [a[0] + e[0] * t, a[1] + e[1] * t];
        let dist = Infinity, road = null, seg = null;
        for (let s = 0.3; s <= ROAD_PROBE_MAX; s += 0.3) {
          const p = [p0[0] + n[0] * s, p0[1] + n[1] * s];
          if (HI.at(p, i) >= 0) break; // another house first: a back or party wall
          const r = RI.at(p, [e[0] / L, e[1] / L]);
          if (r) { dist = s; road = r.road; seg = r; break; }
        }
        hits.push(dist);
        if (road && (t === 0.5 || !roadHit)) { roadHit = road; segHit = seg; }
      }
      hits.sort((p, q) => p - q);
      sides.push({ k, L, n, dist: hits[1], road: roadHit, seg: segHit });
    }
    const cands = sides.filter((s) => s.dist < Infinity).sort((p, q) => p.dist - q.dist || q.L - p.L);
    return { i, cx, cz, sides, cands, h };
  });
  // 2. a corner house that could face two roads faces the way its unambiguous row neighbours face (rows read as rows)
  const dirKey = (n) => Math.round(Math.atan2(n[0], n[1]) / (Math.PI / 2));
  const pick = pre.map((q) => q.cands[0] || null);
  pre.forEach((q, i) => {
    if (q.cands.length < 2) return;
    const votes = new Map();
    for (const o of pre) {
      if (o === q || o.cands.length !== 1) continue;
      const dist = Math.hypot(o.cx - q.cx, o.cz - q.cz);
      if (dist > 17) continue;
      const k = dirKey(o.cands[0].n);
      votes.set(k, (votes.get(k) || 0) + (dist < 9 ? 3 : 1)); // a touching row neighbour counts most
    }
    let bestC = pick[i], bestV = -1;
    for (const c of q.cands) { if (c.dist > q.cands[0].dist + 12) continue; const v = votes.get(dirKey(c.n)) || 0; if (v > bestV) { bestV = v; bestC = c; } }
    if (bestV > 0) pick[i] = bestC;
  });
  return pre.map((q, i) => {
    let best = pick[i];
    if (!best) { // enclosed plot: face the nearest road, whatever stands between
      let bd = Infinity;
      for (const s of q.sides) { const c = RI.clearance([q.cx + s.n[0] * 3, q.cz + s.n[1] * 3], 60); if (c < bd) { bd = c; best = { ...s, dist: Infinity, road: null }; } }
    }
    let w = best.L, d = q.sides[(best.k + 1) % 4].L;
    let ry = Math.atan2(best.n[0], best.n[1]);
    let x = q.cx, z = q.cz, turned = 0, trimmed = 0;
    // 3. edges parallel to the road: turn the house about its centre onto the road's own direction
    if (best.road) {
      const fp = [x + best.n[0] * (d / 2 + best.dist), z + best.n[1] * (d / 2 + best.dist)];
      const rd = best.seg ? Math.atan2(best.seg.b[1] - best.seg.a[1], best.seg.b[0] - best.seg.a[0]) : roadDirAt(best.road, fp);
      // the front normal of a house parallel to that road is the road direction turned 90 deg, on the house's side
      let n2 = [Math.sin(rd), -Math.cos(rd)];
      if (n2[0] * best.n[0] + n2[1] * best.n[1] < 0) n2 = [-n2[0], -n2[1]];
      const ry2 = Math.atan2(n2[0], n2[1]);
      let dd = ry2 - ry;
      while (dd > Math.PI) dd -= 2 * Math.PI;
      while (dd < -Math.PI) dd += 2 * Math.PI;
      if (Math.abs(dd) > 0.002 && Math.abs(dd) < (MAX_ALIGN_DEG * Math.PI) / 180) {
        // only if the turned house stays clear of every neighbour as drawn (a row member turned alone would saw-tooth into its row)
        // a little narrower/shallower (up to 12%) if that is what it takes to turn clear of the neighbours
        for (let shrink = 1; shrink >= 0.879; shrink -= 0.03) {
          const cs = rectCorners(x, z, ry2, w * shrink, d * shrink);
          const hit = rings.some((r, j) => j !== i && Math.abs(r[0][0] - x) < 14 && Math.abs(r[0][1] - z) < 14 && ringsOverlap(cs, r));
          if (!hit) { ry = ry2; turned = dd; w *= shrink; d *= shrink; break; }
        }
      }
    }
    // 4. trim off any road overlap: pull a side in by its overlap (+5 cm), keeping the rest of the footprint where it is
    for (let pass = 0; pass < 3; pass++) {
      const cs = rectCorners(x, z, ry, w, d);
      let moved = false;
      for (let k = 0; k < 4; k++) {
        const a = cs[k], b = cs[(k + 1) % 4];
        let worst = 0;
        for (let t = 0; t <= 1.0001; t += 0.125) worst = Math.min(worst, RI.clearance([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
        if (worst > -0.02) continue;
        const cut = -worst + 0.05;
        const mx = (a[0] + b[0]) / 2 - x, mz = (a[1] + b[1]) / 2 - z;
        const ml = Math.hypot(mx, mz);
        const along = Math.abs(mx * Math.sin(ry) + mz * Math.cos(ry)) > ml * 0.7; // front or back side: depth shrinks
        if (along) { if (d - cut < 4.5) continue; d -= cut; } else { if (w - cut < 4.0) continue; w -= cut; }
        x -= (mx / ml) * cut / 2; z -= (mz / ml) * cut / 2;
        trimmed += cut; moved = true;
        break;
      }
      if (!moved) break;
    }
    return {
      i, x, z, ry, w, d, mud: !!q.h.mud, front: [Math.sin(ry), Math.cos(ry)], road: best.road ? best.road.id : null,
      roadGap: best.dist, turned, trimmed, roadDir: best.seg ? Math.atan2(best.seg.b[1] - best.seg.a[1], best.seg.b[0] - best.seg.a[0]) : null, corners: rectCorners(x, z, ry, w, d), drawn: q.h.ring,
    };
  });
}

/** Road clearance of a whole footprint: the smallest (distance - half width) over its edges and interior samples. */
export function footprintRoadClearance(ring, roads) {
  const RI = roadIndex(roads);
  let best = Infinity;
  for (let k = 0; k < 4; k++) {
    const a = ring[k], b = ring[(k + 1) % 4];
    for (let t = 0; t <= 1.0001; t += 0.1) best = Math.min(best, RI.clearance([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
  }
  return best;
}

export { roadIndex, houseIndex };
