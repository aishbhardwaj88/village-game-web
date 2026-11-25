/**
 * The village road network as ONE continuous surface (her 3 Nov playtest notes, items 1 and 3; docs/PARALLEL.md item 4).
 *
 * Every road, lane, track and path is a centreline polyline with a width and a kind. Instead of laying one flat strip per
 * polyline leg (which gave straight-cut ends, notches at every bend and rectangles overlapping at every crossing), the
 * whole network is one signed-distance field, sampled on a world-aligned grid and turned into one mesh per zone chunk:
 *  - each line's distance is measured to its fillet-rounded centreline, so bends are curves; a dead end of an open line is a FLAT
 *    cap that stops exactly where the map's polyline ends (her final map and the audits use flat caps); joins and bends stay round;
 *  - lines are joined with a smooth minimum, so a junction is one merged piece of road with rounded inner corners;
 *  - the edge is pushed in and out by world-space noise, so it wanders and is never a ruler line;
 *  - past the edge the surface fades out over a band of scuffed earth and thinning grass (vertex alpha over the ground),
 *    never a hard line;
 *  - texture UVs are world metres, so two lines meeting share the same texture with no seam.
 * No kerbs: the old straight kerb slabs could not follow a curve, so they are left out (PARALLEL.md item 4 allows that).
 * Village lanes carry their open nali as a shallow damp groove that follows the lane round every bend.
 *
 * Reuses the shared 'lane' Ground102 set by name (one transparent clone so the edge band can fade), no new texture.
 * Ground-level, never solid.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTiledMaterial, ensureUv2, cloneTiledMaterial } from './materials.js';
import { isNewLayout, getObjects } from './layout/layout.js';
import APRON_CLIP from './layout/apronClip.json' with { type: 'json' };
const NEW_LAYOUT = isNewLayout();

/** Per-kind look: tint (multiplies the dirt texture), edge wander amplitude (m), edge band width (m), nali, ruts. */
export const ROAD_KINDS = {
  highway: { tint: 0x86837d, amp: 0.2, band: 1.8, edge: 0xa08f72, drain: false, ruts: false, bump: 0.006, potholes: true },
  road: { tint: 0x9d9384, amp: 0.32, band: 1.4, edge: 0xa69579, drain: false, ruts: false, bump: 0.01, potholes: true },
  lane: { tint: 0xb19c76, amp: 0.3, band: 1.1, edge: 0xb09c78, drain: true, ruts: false, bump: 0.012, potholes: true },
  back: { tint: 0xb09a74, amp: 0.2, band: 0.8, edge: 0xab9775, drain: false, ruts: false, bump: 0.01, potholes: true },
  track: { tint: 0xa08a64, amp: 0.45, band: 1.5, edge: 0xa69071, drain: false, ruts: true, bump: 0.016, potholes: false },
  path: { tint: 0xb4a07a, amp: 0.2, band: 0.75, edge: 0xb09d7b, drain: false, ruts: false, bump: 0.01, potholes: false },
};

// APRON CLIP LIST (src/layout/apronClip.json, loaded once at build time, never reloaded): rotated rectangles {x,z,w,d,ry,note} in world
// metres (ry as in the game: local +x axis = (cos ry, -sin ry), local +z = (sin ry, cos ry), the three.js rotation.y convention). Inside a
// rectangle (+0.1 m margin) the dusty apron / scuffed-edge alpha is removed; the solid road band core (signed distance < -0.25 m) is never
// touched. Cost: one test per road vertex at build, nothing per frame. The surface is a 0.8 m grid with interpolated vertex alpha, so the
// clear zone is the rectangle + 0.1 m + one grid cell, easing back to the full apron over 0.5 m more (a vertex outside would otherwise
// bleed alpha into the rectangle).
const CLIPS = (Array.isArray(APRON_CLIP) ? APRON_CLIP : []).map((c) => ({ x: c.x, z: c.z, hx: c.w / 2, hz: c.d / 2, c: Math.cos(c.ry || 0), s: Math.sin(c.ry || 0) }));
const CLIP_MARGIN = 0.1, CLIP_EASE = 0.5;
function apronKeep(x, z) { // 0 = apron fully removed here, 1 = untouched
  let k = 1;
  for (const c of CLIPS) {
    const dx = x - c.x, dz = z - c.z, lx = dx * c.c - dz * c.s, lz = dx * c.s + dz * c.c; // into the rectangle's own frame
    const ex = Math.abs(lx) - c.hx, ez = Math.abs(lz) - c.hz;
    const out = Math.hypot(Math.max(ex, 0), Math.max(ez, 0)) + Math.min(Math.max(ex, ez), 0) - CLIP_MARGIN - CELL; // < 0: remove
    if (out < CLIP_EASE) { const u = Math.max(0, out / CLIP_EASE); k = Math.min(k, u * u * (3 - 2 * u)); }
  }
  return k;
}
const CELL = 0.8; // grid spacing, metres. Edge wander is >= 2.5 m wavelength, so 0.8 m resolves it.
const JOIN_K = 3.0; // smooth-min radius: how round the inner corner of a junction is
const END_EASE = 0.6; // m before a flat dead end over which the edge wander and the scuffed fade die away, so the end is a clean line at the map's end
const END_BAND = 0.1; // share of the normal fade band kept at a flat dead end (the fade must not reach past the map's own band)
const GRASS = new THREE.Color(0x7a7c4e); // thinning-grass tint at the outer edge of the band (multiplies the dirt texture)

// ---------------------------------------------------------------- noise (no dependency)
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
/** Smooth 2D value noise in [-1, 1]. */
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return (a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz) * 2 - 1;
}
const fbm = (x, z, s) => 0.6 * vnoise(x / (7 * s), z / (7 * s)) + 0.3 * vnoise(x / (2.9 * s) + 17.3, z / (2.9 * s) - 4.1) + 0.1 * vnoise(x / 1.3 + 41.7, z / 1.3 + 9.2);

// ---------------------------------------------------------------- potholes (her playtest note: "no pits, no stones")
// Sparse, deterministic broken-edge pits in the road's own vertex field - no extra geometry or draw calls, since they
// ride the same 0.8 m sample grid every road cell already computes. Centres sit on a coarse 2.6 m lattice so two pits
// never crowd into one smear; about one cell in six hosts one (jittered off-centre, irregular radius).
const POT_CELL = 2.6;
function potholeField(x, z) {
  const ix0 = Math.floor(x / POT_CELL), iz0 = Math.floor(z / POT_CELL);
  let best = 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const ix = ix0 + dx, iz = iz0 + dz;
    if (hash2(ix * 7 + 3, iz * 13 + 5) > 0.84) continue; // ~16% of cells host a pit
    const cx = (ix + 0.5 + (hash2(ix * 31, iz * 17) - 0.5) * 0.7) * POT_CELL;
    const cz = (iz + 0.5 + (hash2(ix * 19, iz * 23) - 0.5) * 0.7) * POT_CELL;
    const rx = 0.26 + 0.34 * hash2(ix * 41, iz * 53), rz = 0.26 + 0.34 * hash2(ix * 59 + 1, iz * 67 + 2);
    const v = Math.max(0, 1 - Math.hypot((x - cx) / rx, (z - cz) / rz));
    if (v > best) best = v;
  }
  return best * best * (3 - 2 * best); // smoothstep: a flat-ish floor, not a cone
}

// ---------------------------------------------------------------- centrelines
/**
 * Rounds every interior corner of a polyline with a quadratic fillet. The cut-back is limited to 40% of each leg, so a
 * densely drawn line (the farm loop) is left as drawn and a long straight road gets a real curve at its bend.
 */
const MAX_DEV = 0.2; // m, audit limit is 0.3 (25 Nov); sampled bezier adds ~0.03
export function filletPolyline(pts, closed, width) {
  const p = closed && pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? pts.slice(0, -1) : pts.slice();
  const n = p.length;
  if (n < 3) return closed ? [...p, p[0]] : p;
  const out = [];
  const maxCut = Math.max(6, width * 2.2);
  for (let i = 0; i < n; i++) {
    const isEnd = !closed && (i === 0 || i === n - 1);
    if (isEnd) { out.push(p[i]); continue; }
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
    const l0 = Math.hypot(b[0] - a[0], b[1] - a[1]), l1 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    if (l0 < 1e-6 || l1 < 1e-6) continue;
    let cut = Math.min(0.4 * l0, 0.4 * l1, maxCut);
    // the drawn road must stay on the map's polyline: the rounding may pull the corner in by at most MAX_DEV (bezier midpoint is |ua+uc| * cut / 4 off the corner)
    const sx = (a[0] - b[0]) / l0 + (c[0] - b[0]) / l1, sz = (a[1] - b[1]) / l0 + (c[1] - b[1]) / l1, sl = Math.hypot(sx, sz);
    if (sl > 1e-6) cut = Math.min(cut, (MAX_DEV * 4) / sl);
    const p0 = [b[0] + (a[0] - b[0]) * (cut / l0), b[1] + (a[1] - b[1]) * (cut / l0)];
    const p2 = [b[0] + (c[0] - b[0]) * (cut / l1), b[1] + (c[1] - b[1]) * (cut / l1)];
    const steps = cut > 2 ? 6 : 2;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, u = 1 - t;
      out.push([u * u * p0[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * b[1] + t * t * p2[1]]);
    }
  }
  if (closed) out.push(out[0]);
  return out;
}

/**
 * The flat end planes [[x, z, ux, uz]...] (the endpoint and the outward unit direction) that cut segment i (1-based, pts[i-1] -> pts[i])
 * of an OPEN line, or null. It applies to the dead end's own leg and to the next legs of the fillet run that stay within
 * 2 x half-width of the end and within 30 degrees of the end leg's heading (so a round join near the end cannot poke past the end).
 */
function endPlane(l, i) {
  if (l.closed) return null;
  const p = l.pts, n = p.length, found = [];
  for (const atStart of [true, false]) {
    const e = atStart ? p[0] : p[n - 1], k = atStart ? 1 : n - 2;
    const fx = p[k][0] - e[0], fz = p[k][1] - e[1], fl = Math.hypot(fx, fz) || 1; // heading of the end leg, pointing into the road
    const seg = atStart ? i : n - i; // 1 = the end leg
    if (seg < 1) continue;
    let ok = true, run = 0;
    for (let j = 1; j <= seg && ok; j++) {
      const a = atStart ? p[j - 1] : p[n - j], b = atStart ? p[j] : p[n - j - 1];
      const dx = b[0] - a[0], dz = b[1] - a[1], dl = Math.hypot(dx, dz) || 1;
      if ((dx * fx + dz * fz) / (dl * fl) < 0.87) ok = false; // turned more than 30 degrees: a real bend, keep its round join
      if (j > 1 && run > 2 * l.hw) ok = false; // this leg starts beyond 2 x half-width from the end
      run += dl;
    }
    if (ok) found.push([e[0], e[1], -fx / fl, -fz / fl]);
  }
  return found.length ? found : null;
}

/**
 * Builds the network from lines [{ id, w, kind, pts: [[x, z]...] (world metres), closed?, drainSide? }].
 * Returns { lines, segs, bbox }; meshes are cut from it per rectangle with networkMesh().
 */
export function buildNetwork(rawLines) {
  const lines = rawLines.map((l, i) => {
    const k = ROAD_KINDS[l.kind] || ROAD_KINDS.lane;
    return { ...l, idx: i, hw: l.w / 2, k, lift: (l.y ?? 0.032) - 0.032, tint: new THREE.Color(l.tint ?? k.tint), edgeTint: new THREE.Color(k.edge), drainSide: l.drainSide ?? (i % 2 ? 1 : -1), pts: filletPolyline(l.pts, l.closed, l.w) };
  });
  const segs = [];
  const bbox = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity };
  for (const l of lines) {
    const reach = l.hw + l.k.band + l.k.amp + JOIN_K;
    for (let i = 1; i < l.pts.length; i++) {
      const [ax, az] = l.pts[i - 1], [bx, bz] = l.pts[i];
      const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
      if (len2 < 1e-8) continue;
      segs.push({ ax, az, dx, dz, inv: 1 / len2, len: Math.sqrt(len2), line: l.idx, reach, pl: endPlane(l, i) });
      bbox.x0 = Math.min(bbox.x0, ax - reach, bx - reach); bbox.x1 = Math.max(bbox.x1, ax + reach, bx + reach);
      bbox.z0 = Math.min(bbox.z0, az - reach, bz - reach); bbox.z1 = Math.max(bbox.z1, az + reach, bz + reach);
    }
  }
  // Spatial hash: 12 m buckets, each segment in every bucket its reach touches.
  const B = 12, buckets = new Map();
  for (let s = 0; s < segs.length; s++) {
    const g = segs[s];
    const x0 = Math.floor((Math.min(g.ax, g.ax + g.dx) - g.reach) / B), x1 = Math.floor((Math.max(g.ax, g.ax + g.dx) + g.reach) / B);
    const z0 = Math.floor((Math.min(g.az, g.az + g.dz) - g.reach) / B), z1 = Math.floor((Math.max(g.az, g.az + g.dz) + g.reach) / B);
    for (let bx = x0; bx <= x1; bx++) for (let bz = z0; bz <= z1; bz++) {
      const key = bx * 100003 + bz;
      let arr = buckets.get(key);
      if (!arr) buckets.set(key, (arr = []));
      arr.push(s);
    }
  }
  return { lines, segs, bbox, buckets, B };
}

const FREE_GAP = 1.0; // m: a flat end is landed on its plane only where no other road's band lies closer than this (nearer, the junction's smooth-union fill is the rounding that junction needs)


// ---------------------------------------------------------------- footprint mask (her rule: nothing on a road, objects never move)
// Every map solid's footprint (ring polygon or circle) plus FOOT_PAD is cut out of the road surface, so a road is never drawn
// (or classed as road) under a building or prop standing at its exact map spot. Culverts, bridges and boards belong over roads.
const FOOT_PAD = 0.1, FOOT_B = 8;
let FOOT = null;
function footprints() {
  if (FOOT) return FOOT;
  FOOT = new Map();
  if (!NEW_LAYOUT) return FOOT;
  const add = (f) => { for (let bx = Math.floor(f.x0 / FOOT_B); bx <= Math.floor(f.x1 / FOOT_B); bx++) for (let bz = Math.floor(f.z0 / FOOT_B); bz <= Math.floor(f.z1 / FOOT_B); bz++) { const k = bx * 100003 + bz; (FOOT.get(k) || FOOT.set(k, []).get(k)).push(f); } };
  for (const o of getObjects('solids')) {
    if (/culvert|bridge|^new_sign|ghat/i.test(o.prefix + ' ' + o.name)) continue;
    if (o.rings && o.rings.length) for (const ring of o.rings) { const xs = ring.map((q) => q[0]), zs = ring.map((q) => q[1]); add({ ring, x0: Math.min(...xs) - FOOT_PAD, x1: Math.max(...xs) + FOOT_PAD, z0: Math.min(...zs) - FOOT_PAD, z1: Math.max(...zs) + FOOT_PAD }); }
    else if (o.r) add({ cx: o.cx, cz: o.cz, r: o.r + FOOT_PAD, x0: o.cx - o.r - FOOT_PAD, x1: o.cx + o.r + FOOT_PAD, z0: o.cz - o.r - FOOT_PAD, z1: o.cz + o.r + FOOT_PAD });
  }
  return FOOT;
}
const segD2 = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)); const qx = a[0] + t * dx - x, qz = a[1] + t * dz - z; return qx * qx + qz * qz; };
/** True when (x, z) is inside a map footprint grown by FOOT_PAD. */
export function underFootprint(x, z) {
  const arr = footprints().get(Math.floor(x / FOOT_B) * 100003 + Math.floor(z / FOOT_B));
  if (!arr) return false;
  for (const f of arr) {
    if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
    if (f.ring) {
      const r = f.ring; let ins = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > z) !== (r[j][1] > z) && x < (r[j][0] - r[i][0]) * (z - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) ins = !ins;
      if (ins) return true;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (segD2(x, z, r[j], r[i]) < FOOT_PAD * FOOT_PAD) return true;
    } else if ((x - f.cx) ** 2 + (z - f.cz) ** 2 < f.r * f.r) return true;
  }
  return false;
}

/**
 * Signed distance from (x, z) to the segment's band edge, negative inside: round caps and round joins, EXCEPT at a dead end of
 * an open line. There the band is cut flat by the end plane (g.pl: the endpoint and the outward unit direction of the line's first
 * or last leg), so the road stops exactly where the map's polyline ends, like the flat-capped band the map and the audits use.
 * `ret.over` is how far the point lies beyond (+) or short of (-) that plane along the road, or -Infinity for a segment away from
 * a dead end; `ret.lat` the signed lateral offset (+ left of travel); `ret.t` the clamped position along the segment, 0..1.
 */
const ret = { di: 0, over: -Infinity, lat: 0, t: 0, pl: null };
function segDi(g, x, z, hw) {
  const px = x - g.ax, pz = z - g.az;
  const traw = (px * g.dx + pz * g.dz) * g.inv;
  const tc = traw < 0 ? 0 : traw > 1 ? 1 : traw;
  const qx = px - tc * g.dx, qz = pz - tc * g.dz;
  ret.lat = (g.dx * pz - g.dz * px) / g.len; ret.t = tc; ret.over = -Infinity; ret.pl = null;
  let di = Math.sqrt(qx * qx + qz * qz) - hw;
  const pl = g.pl;
  if (pl) for (let k = 0; k < pl.length; k++) {
    const over = (x - pl[k][0]) * pl[k][2] + (z - pl[k][1]) * pl[k][3];
    if (over > di && over > 0) di = over; // the plane only cuts what lies beyond it; inside, the band is as it was (alpha stays full right up to the end)
    if (over > ret.over) { ret.over = over; ret.pl = pl[k]; }
  }
  ret.di = di;
  return ret;
}

const bestD = new Float64Array(4096), bestLat = new Float64Array(4096), bestAlong = new Float64Array(4096), bestOver = new Float64Array(4096), bestPl = new Array(4096).fill(null);
/** Set by every sample() call: when the nearest line has a flat dead end here and no other road is within FREE_GAP, the end plane and how far (m) the point lies beyond it, else endPl is null. Used by networkMesh to land the surface exactly on the plane. */
let endPl = null, endOver = 0;
const touched = [];
const touchedMark = new Uint8Array(4096);

/**
 * Samples the field at (x, z): { a (alpha 0..1), y, r, g, b } or null when no road is near.
 */
function sample(net, x, z, out) {
  endPl = null;
  const arr = net.buckets.get(Math.floor(x / net.B) * 100003 + Math.floor(z / net.B));
  if (!arr) return null;
  touched.length = 0;
  for (const s of arr) {
    const g = net.segs[s];
    const li = g.line;
    const r = segDi(g, x, z, net.lines[li].hw);
    if (!touchedMark[li]) { touchedMark[li] = 1; touched.push(li); bestD[li] = Infinity; }
    if (r.di < bestD[li]) {
      bestD[li] = r.di; // signed distance to this line's own band edge (flat dead ends, round bends)
      bestLat[li] = r.lat; // signed: + on the left of travel
      bestAlong[li] = r.t;
      bestOver[li] = r.over;
      bestPl[li] = r.pl;
    }
  }
  // Per-line signed distance to its own edge, then a smooth union.
  let dmin = Infinity, D = Infinity, minLine = -1;
  for (const li of touched) {
    const di = bestD[li];
    if (di < dmin) { dmin = di; minLine = li; }
    if (D === Infinity) D = di;
    else { const h = Math.max(JOIN_K - Math.abs(D - di), 0) / JOIN_K; D = Math.min(D, di) - h * h * JOIN_K * 0.25; }
  }
  endPl = null;
  if (bestOver[minLine] > 0) { // beyond a flat dead end of the nearest line: land it on the plane unless another road's band is within FREE_GAP (a junction)
    let free = true;
    for (const li of touched) if (li !== minLine && bestD[li] < FREE_GAP) { free = false; break; }
    if (free) { endPl = bestPl[minLine]; endOver = bestOver[minLine]; }
  }
  // Soft weights blend the look of lines meeting at a junction.
  let wsum = 0, lift = 0, amp = 0, band = 0, bump = 0, tr = 0, tg = 0, tb = 0, er = 0, eg = 0, eb = 0, drain = 0, rut = 0, pot = 0;
  for (const li of touched) {
    const l = net.lines[li];
    const di = bestD[li];
    touchedMark[li] = 0;
    const w = Math.exp(-(di - dmin) / 0.7);
    wsum += w; lift += w * l.lift; amp += w * l.k.amp; band += w * l.k.band; bump += w * l.k.bump; pot += w * (l.k.potholes ? 1 : 0);
    tr += w * l.tint.r; tg += w * l.tint.g; tb += w * l.tint.b;
    er += w * l.edgeTint.r; eg += w * l.edgeTint.g; eb += w * l.edgeTint.b;
    const lat = bestLat[li];
    if (l.k.drain && l.hw >= 1.5) {
      // nali just inside the lane edge on one side, fading out near the lane's own ends where it meets a road
      const c = l.drainSide * (l.hw - 0.45);
      const endFade = Math.min(1, Math.min(bestAlong[li], 1 - bestAlong[li]) * 40);
      drain += w * Math.exp(-(((lat - c) / 0.32) ** 2)) * endFade;
    }
    if (l.k.ruts) {
      const al = Math.abs(lat);
      rut += w * Math.exp(-(((al - 0.42 * l.hw) / Math.max(0.35, 0.18 * l.hw)) ** 2)) - w * 0.6 * Math.exp(-((lat / Math.max(0.4, 0.16 * l.hw)) ** 2));
    }
  }
  lift /= wsum; amp /= wsum; band /= wsum; bump /= wsum; drain /= wsum; rut /= wsum; pot /= wsum;
  // a flat dead end (the line the point belongs to ends here): the wander and the scuffed fade die away over END_EASE before the
  // end plane, so the road stops on the map's end line instead of fraying past it
  let ease = 0;
  const ov = bestOver[minLine];
  if (ov > -END_EASE) { ease = ov >= 0 ? 1 : 1 + ov / END_EASE; ease = ease * ease * (3 - 2 * ease); }
  const n = fbm(x, z, 1);
  D -= amp * n * 1.4 * (1 - ease); // the edge wanders in and out
  band *= 1 - (1 - END_BAND) * ease;
  const n2 = vnoise(x / 1.7 + 3.1, z / 1.7 - 8.4); // grass tufts biting into the band
  const t = Math.min(1, Math.max(0, (D + 0.2 + 0.25 * band * n2) / (band + 0.2)));
  if (t >= 1) return null;
  if (NEW_LAYOUT && underFootprint(x, z)) return null; // never road under a building
  let a = Math.pow(1 - t, 1.4);
  if (D < -0.25) a = 1;
  else if (CLIPS.length) a *= 1 - (1 - apronKeep(x, z)) * Math.min(1, (D + 0.25) / 0.25); // apron clip: only the fade zone (D >= -0.25), never the core
  // Colour: interior tint with slow patches, wheel polish, nali; edge band goes scuffed/dusty then olive as grass thins.
  const patch = 0.93 + 0.09 * vnoise(x / 5.3 - 2, z / 5.3 + 7) + 0.05 * vnoise(x / 1.6, z / 1.6);
  let r = tr / wsum * patch, g = tg / wsum * patch, b = tb / wsum * patch;
  const edgeMix = Math.min(1, Math.max(0, (D + 0.6) / 0.9));
  r += (er / wsum - r) * edgeMix * 0.45; g += (eg / wsum - g) * edgeMix * 0.45; b += (eb / wsum - b) * edgeMix * 0.45;
  const grass = t * t * 0.75;
  r += (GRASS.r - r) * grass; g += (GRASS.g - g) * grass; b += (GRASS.b - b) * grass;
  const inside = 1 - edgeMix;
  if (rut) { const k = 1 - 0.13 * rut * inside; r *= k; g *= k; b *= k; }
  if (drain > 0.02) { const k = 1 - 0.42 * drain * inside; r *= k; g *= k * 1.01; b *= k * 1.03; }
  // potholes: broken, dust-rimmed and often damp at the bottom, never out at the grassy edge
  const pit = pot > 0.02 ? pot * inside * potholeField(x, z) : 0;
  if (pit > 0.02) { const k = 1 - 0.55 * pit; r *= k; g *= k * 0.985; b *= k * 1.04; }
  out.a = a;
  out.r = r; out.g = g; out.b = b;
  out.y = 0.032 + lift + bump * vnoise(x / 2.3 + 11, z / 2.3) - 0.022 * t - 0.045 * drain * inside - (rut > 0 ? 0.012 * rut * inside : 0) - 0.065 * pit;
  // S7 (?layout=new): the painted fields lie at y 0.016 (shops-land); the road surface, its edge band and its nali groove never
  // dip under 0.02, so a road always draws over a field it touches. ?layout=old unchanged.
  if (NEW_LAYOUT && out.y < 0.02) out.y = 0.02;
  return out;
}

/** The surface field at (x, z) for audits: { a: alpha 0..1, ... } or null when no road is there. */
export function sampleSurface(net, x, z) { const o = {}; return sample(net, x, z, o) ? o : null; }

let MAT = null;
/** The shared 'lane' material, cloned once so its edge band can fade into the ground (vertex alpha). */
export function roadMaterial() {
  if (MAT) return MAT;
  // 23 Nov: was a plain .clone(), which silently drops the 'lane' earth-family roughness
  // floor/mottling hook (see materials.js's cloneTiledMaterial) on every road and lane in
  // the village — the exact unprotected-surface bug class this session already fixed once
  // for metal/rust.
  MAT = cloneTiledMaterial(getTiledMaterial('lane', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
  MAT.name = 'lane';
  MAT.transparent = true;
  MAT.polygonOffset = true;
  MAT.polygonOffsetFactor = -1;
  MAT.polygonOffsetUnits = -2;
  return MAT;
}

/**
 * One merged mesh of the network inside rect { x0, x1, z0, z1 } (cells whose min corner lies inside). The grid is
 * world-aligned, so two neighbouring rects share their boundary vertices exactly and the surface has no seam.
 */
export function networkMesh(net, rect, name) {
  const gx0 = Math.floor(Math.max(rect.x0, net.bbox.x0) / CELL), gx1 = Math.ceil(Math.min(rect.x1, net.bbox.x1) / CELL);
  const gz0 = Math.floor(Math.max(rect.z0, net.bbox.z0) / CELL), gz1 = Math.ceil(Math.min(rect.z1, net.bbox.z1) / CELL);
  if (gx1 <= gx0 || gz1 <= gz0) return null;
  const nx = gx1 - gx0 + 1, nz = gz1 - gz0 + 1;
  const alpha = new Float32Array(nx * nz).fill(-1);
  const data = new Float32Array(nx * nz * 4);
  const proj = new Uint8Array(nx * nz), gxy = new Float32Array(nx * nz * 2); // vertices moved onto a flat end plane, and where they went
  const s = {};
  for (let j = 0; j < nz; j++) {
    const z = (gz0 + j) * CELL;
    for (let i = 0; i < nx; i++) {
      const x = (gx0 + i) * CELL;
      let r = sample(net, x, z, s);
      const k = j * nx + i;
      if (endPl && endOver < 4) {
        // beyond a flat dead end: the grid is world-aligned, so a cell would blend road into nothing across the end plane and
        // draw road up to 0.8 m past it. Move the vertex ONTO the plane and give it the road as it is just inside (the end is then a
        // crisp line exactly at the map's end). Every vertex out to 4 m is moved, so nothing beyond the plane can be drawn.
        const pl = endPl, over = endOver;
        proj[k] = 1; gxy[k * 2] = x - over * pl[2]; gxy[k * 2 + 1] = z - over * pl[3];
        r = over <= 1.7 ? sample(net, x - (over + 0.3) * pl[2], z - (over + 0.3) * pl[3], s) : null;
        endPl = null;
      }
      if (!r) continue;
      alpha[k] = r.a;
      data[k * 4] = r.r; data[k * 4 + 1] = r.g; data[k * 4 + 2] = r.b; data[k * 4 + 3] = r.y;
    }
  }
  const remap = new Int32Array(nx * nz).fill(-1);
  const pos = [], col = [], uv = [], idx = [];
  const vert = (k) => {
    if (remap[k] >= 0) return remap[k];
    const i = k % nx, j = (k / nx) | 0;
    const x = proj[k] ? gxy[k * 2] : (gx0 + i) * CELL, z = proj[k] ? gxy[k * 2 + 1] : (gz0 + j) * CELL;
    const has = alpha[k] >= 0;
    pos.push(x, has ? data[k * 4 + 3] : 0.01, z);
    col.push(has ? data[k * 4] : 0.5, has ? data[k * 4 + 1] : 0.5, has ? data[k * 4 + 2] : 0.4, has ? alpha[k] : 0);
    uv.push(x / 3.3, z / 3.3);
    remap[k] = pos.length / 3 - 1;
    return remap[k];
  };
  const A = (k) => Math.max(0, alpha[k]);
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const k00 = j * nx + i, k10 = k00 + 1, k01 = k00 + nx, k11 = k01 + 1;
      if (A(k00) + A(k10) + A(k01) + A(k11) < 0.004) continue;
      const x = (gx0 + i) * CELL, z = (gz0 + j) * CELL;
      if (x < rect.x0 || x >= rect.x1 || z < rect.z0 || z >= rect.z1) continue;
      if (proj[k00] && proj[k10] && proj[k01] && proj[k11]) continue; // all four lie on the end plane: no area
      const v00 = vert(k00), v10 = vert(k10), v01 = vert(k01), v11 = vert(k11);
      // split along the diagonal whose ends agree best, so the fade has no saw-tooth
      if (Math.abs(A(k00) - A(k11)) <= Math.abs(A(k10) - A(k01))) idx.push(v00, v01, v11, v00, v11, v10);
      else idx.push(v00, v01, v10, v10, v01, v11);
    }
  }
  if (!idx.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  ensureUv2(geo);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, roadMaterial());
  mesh.name = name;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.renderOrder = -1; // under every other see-through thing at ground level
  return mesh;
}

// ---------------------------------------------------------------- loose roadside stones (her playtest note, 2nd half)
// Small broken aggregate swept to the road's own edge, never on the carriageway itself. Procedural (no Blender pass,
// no download), one low-poly rock shape merged per chunk into ONE mesh - same draw-call-per-chunk budget as the
// surface itself, zero extra texture: the shared 'concrete' set, tinted and vertex-coloured per stone.
let ROCK_GEO = null;
function rockGeometry() {
  if (ROCK_GEO) return ROCK_GEO;
  const g = new THREE.IcosahedronGeometry(0.1, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const j = 1 + 0.22 * vnoise(x * 9 + i, z * 9 - i);
    pos.setXYZ(i, x * j, y * j * 0.62, z * j); // squashed flatter, a rock resting on the ground, not a ball
  }
  g.computeVertexNormals();
  ROCK_GEO = g;
  return g;
}
let STONE_MAT = null;
function stoneMaterial() {
  if (STONE_MAT) return STONE_MAT;
  // 23 Nov: same clone-drops-the-hook fix as roadMaterial() above ('concrete' masonry family).
  STONE_MAT = cloneTiledMaterial(getTiledMaterial('concrete', { repeatX: 1.3, repeatY: 1.3, roughness: 1, vertexColors: true }));
  STONE_MAT.name = 'road_stone';
  return STONE_MAT;
}
const STEP = 1.4; // metres along a line between candidate stone spots
/** Deterministic scatter of loose stones along `net`'s eligible lines, inside `rect`. One mesh, merged, per chunk. */
export function stonesMesh(net, rect, name) {
  const geo = rockGeometry();
  const parts = [];
  const m = new THREE.Matrix4(), col = new THREE.Color();
  let seed = 0;
  for (const l of net.lines) {
    if (!l.k.potholes) continue; // same eligible kinds as the potholes above (road/lane/back/highway, not track/path)
    for (let i = 1; i < l.pts.length; i++) {
      const [ax, az] = l.pts[i - 1], [bx, bz] = l.pts[i];
      const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
      if (len < 1e-4) continue;
      const ux = dx / len, uz = dz / len, nx = -uz, nz = ux; // unit along, unit left-normal
      const steps = Math.max(1, Math.round(len / STEP));
      for (let s = 0; s <= steps; s++) {
        seed++;
        const t = s / steps, px = ax + ux * len * t, pz = az + uz * len * t;
        if (px < rect.x0 - 2 || px > rect.x1 + 2 || pz < rect.z0 - 2 || pz > rect.z1 + 2) continue;
        if (hash2(Math.floor(px * 37) + seed, Math.floor(pz * 53) - seed) > 0.14) continue; // ~14% of spots host a stone
        const side = hash2(seed * 11 + 3, seed * 7 - 2) > 0.5 ? 1 : -1;
        const lat = l.hw + l.k.band * (0.25 + 0.55 * hash2(seed * 19, seed * 29)); // just past the carriageway edge, inside the worn band
        const jx = (hash2(seed * 41, seed * 43) - 0.5) * 0.5, jz = (hash2(seed * 47, seed * 53) - 0.5) * 0.5;
        const x = px + nx * lat * side + jx, z = pz + nz * lat * side + jz;
        const scale = 0.5 + 0.9 * hash2(seed * 61, seed * 67);
        const yaw = hash2(seed * 71, seed * 73) * Math.PI * 2;
        m.makeRotationY(yaw);
        m.scale(new THREE.Vector3(scale, scale, scale));
        m.setPosition(x, 0.01, z);
        const inst = geo.clone().applyMatrix4(m);
        const shade = 0.68 + 0.28 * hash2(seed * 83, seed * 89);
        col.setRGB(shade, shade * 0.97, shade * 0.92);
        const n = inst.attributes.position.count;
        const carr = new Float32Array(n * 3);
        for (let v = 0; v < n; v++) carr[v * 3] = col.r, carr[v * 3 + 1] = col.g, carr[v * 3 + 2] = col.b;
        inst.setAttribute('color', new THREE.BufferAttribute(carr, 3));
        inst.deleteAttribute('uv2');
        parts.push(inst);
      }
    }
  }
  if (!parts.length) return null;
  const merged = mergeGeometries(parts, false);
  ensureUv2(merged);
  const mesh = new THREE.Mesh(merged, stoneMaterial());
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** World-space signed distance to the network's nearest road edge (negative on the road; flat dead ends, like the surface), for audits. */
export function edgeDistance(net, x, z) {
  const arr = net.buckets.get(Math.floor(x / net.B) * 100003 + Math.floor(z / net.B));
  if (!arr) return Infinity;
  let best = Infinity;
  for (const s of arr) {
    const g = net.segs[s];
    best = Math.min(best, segDi(g, x, z, net.lines[g.line].hw).di);
  }
  return best;
}
