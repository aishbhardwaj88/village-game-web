import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildBovineGeometry, createHideMaterial } from './animals.js';
import { getTiledMaterial } from './materials.js';
import { mapRoadLines, allRoadLines } from './mapRoads.js';
import { CHAURAHA } from './mapPlan.js';
import { colliderBoxFromTransform, STATIC_COLLIDERS, staticBoxesNear, circleHitsAnyBox, requestColliderRebuild } from './collision.js';
import { batchLateGroup, batchPeopleMesh, refreshPeopleMesh } from './placeBatch.js';
import { keepOnGround, markFigure, settleDy, settleInstances, groundAt } from './standOn.js';
import { mergeGroupByMaterial } from './mergeUtils.js';
import { buildTractorGroup } from './vehicles.js';
import { settlingReleased, lazyDue } from './standOn.js';

/**
 * Something worth seeing every ~8 s of cycling along the whole main road (docs/VILLAGE_VOCABULARY.md sections 3, 4, 5, 8).
 * The first 60 m of each arm belongs to src/chaurahaEdges.js; from 62 m out, a scene every 44 m (8 s at the cycle's 5.5 m/s),
 * alternating sides, cycling through:
 *   rehri     a vegetable handcart with crates of produce, the vendor behind it and a customer in front
 *   charpai   a cot in the shade with two or three men seated on it, a steel kettle and glasses on a stool
 *   buffalo   a buffalo tied to a peg beside a cement trough, dung round about
 *   kids      four children crouched round a marbles ring, one standing watching
 *   tractor   a red tractor parked on the verge (the one from src/vehicles.js, merged by material)
 *   cow       a cow lying on the verge a metre off the carriageway, chewing
 *   fruit     a fruit seller squatting beside a mat of heaped fruit
 * Sites hang off the real main_road centreline and are searched at run time (once static colliders exist) for ground that is
 * clear of every collider, every road/lane carriageway, the dug ground (pond/canal), anything raised under the feet, and the
 * other sites; nothing is placed within 62 m of the chauraha milestone. People are the capsule stand-ins (soft: name starts
 * 'ambient_life'), settled on the surface with src/standOn.js. Only frozen library sets: wood, metal, concrete, tarpaulin,
 * jute, terracotta. Draw calls: 5 library merges + people + bovine + the tractor's own material meshes (about 8).
 * No brands, no tobacco or alcohol, no shrines.
 */

const STEP = 28; // metres between scenes: about 5 s at 5.5 m/s (was 44; the far main road read bare)
const START = 62; // metres from the milestone before the first scene
const TILE = 1.0;
const PEOPLE_R = 0.32, PEOPLE_H = 1.7;
const MEN = [0xb8b0a0, 0x8a9aa8, 0xa89070, 0x9a8a9a, 0x7a8a6a, 0xc0a890, 0xd0c4a8];
const KID = [0xc8503a, 0x3a6a8a, 0xc8962a, 0x4a7a4a, 0x8a3a5a];
const WOMEN = [0xb04a5a, 0x3a5a8a, 0xc8962a];
const CROP = [0xb8402a, 0xc86a1a, 0x4a7a3a, 0x8a3a5a, 0xc8a020, 0x6a8a3a];
const TYPES = [
  { k: 'rehri', r: 2.6 }, { k: 'charpai', r: 3.0 }, { k: 'buffalo', r: 3.4 }, { k: 'kids', r: 2.6 },
  { k: 'fruit', r: 2.4 }, { k: 'cow', r: 2.4 }, { k: 'charpai', r: 3.0 }, { k: 'tractor', r: 3.6 },
];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const colour = (geo, c) => {
  const col = new THREE.Color(c), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
};
function metreUV(geo) { // box-projected UVs in metres so the library repeat is true scale
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u / TILE; uv[i * 2 + 1] = v / TILE;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);

/** Centreline of the full main_road with cumulative lengths. */
function mainRoad() {
  const line = mapRoadLines().find((l) => l.id === 'main_road');
  if (!line) return null;
  const cum = [0];
  for (let i = 1; i < line.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(line.pts[i][0] - line.pts[i - 1][0], line.pts[i][1] - line.pts[i - 1][1]));
  const at = (s) => {
    s = Math.max(0, Math.min(cum[cum.length - 1], s));
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const [ax, az] = line.pts[i - 1], [bx, bz] = line.pts[i], L = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / L;
    const dx = (bx - ax) / L, dz = (bz - az) / L;
    return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx, dz, nx: -dz, nz: dx };
  };
  // station of the milestone: nearest centreline point to it
  let sc = 0, bd = Infinity;
  for (let s = 0; s <= cum[cum.length - 1]; s += 1) { const p = at(s), d = Math.hypot(p.x - CHAURAHA.x, p.z - CHAURAHA.z); if (d < bd) { bd = d; sc = s; } }
  return { at, len: cum[cum.length - 1], sc, hw: line.w / 2 };
}

function distToLine(pts, x, z) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L));
    best = Math.min(best, Math.hypot(ax + t * dx - x, az + t * dz - z));
  }
  return best;
}

export function createMainRoadLife(scene) {
  const group = new THREE.Group(); group.name = 'main_road_life';
  scene.add(group);
  batchLateGroup(group, group.name);
  const info = { placed: [], skipped: [], drawCalls: 0 };
  if (typeof window !== 'undefined') window.__mainRoadLife = info;
  let built = false, frames = 0;

  function build() {
    const road = mainRoad();
    if (!road) return;
    const lines = allRoadLines();
    const rand = rng(8112026);
    const by = new Map(); // set -> geometries
    const colliders = [];
    const people = []; // { x, y, z, ry, sy, sx, tint }
    const animals = []; // { x, z, yaw, s:[], tint, sit, idx }
    let frame = null; // current site frame
    const begin = (x, z, yaw) => { frame = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), _one); frame.yaw = yaw; };
    let band = null; // local-frame xz bounds of this scene's props that reach the body band (0.35-1.5 m), for its own collider
    const place = (g, lx, ly, lz, ry, set, tint) => {
      g.applyMatrix4(_m4.compose(_v.set(lx, ly, lz), _q.setFromEuler(_e.set(0, ry, 0)), _one));
      g.computeBoundingBox();
      const bb = g.boundingBox;
      if (band && bb.max.y > 0.3 && bb.min.y < 1.55) {
        band.minX = Math.min(band.minX, bb.min.x); band.maxX = Math.max(band.maxX, bb.max.x);
        band.minZ = Math.min(band.minZ, bb.min.z); band.maxZ = Math.max(band.maxZ, bb.max.z);
      }
      g.applyMatrix4(frame);
      colour(g, tint);
      if (!by.has(set)) by.set(set, []);
      by.get(set).push(g);
    };
    const prep = (g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); g.computeVertexNormals(); metreUV(g); return g; };
    const box = (set, w, h, d, lx, ly, lz, tint, ry = 0) => place(prep(new THREE.BoxGeometry(w, h, d)), lx, ly, lz, ry, set, tint);
    const cyl = (set, rt, rb, h, lx, ly, lz, tint, rz = 0, seg = 8, alongZ = false) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); if (rz) { if (alongZ) g.rotateX(rz); else g.rotateZ(rz); } place(prep(g), lx, ly, lz, 0, set, tint); };
    const wl = (x, y, z) => _v.set(x, y, z).applyMatrix4(frame).clone();
    const person = (lx, lz, face, seated, tint, lift = 0, kid = false) => {
      const w = wl(lx, 0, lz);
      people.push({ x: w.x, z: w.z, y: lift, ry: frame.yaw + face, sy: kid ? 0.62 : seated ? 0.6 + rand() * 0.05 : 0.95 + rand() * 0.1, sx: kid ? 0.78 : seated ? 1.15 : 1, tint });
    };
    const col = (w, d, lx, lz, animal = false) => {
      const c = colliderBoxFromTransform(w, d, new THREE.Matrix4().copy(frame).multiply(new THREE.Matrix4().makeTranslation(lx, 0, lz)));
      if (animal) c.animalBox = true; colliders.push(c);
    };
    const pick = (a) => a[Math.floor(rand() * a.length)];

    // ---------------------------------------------------------------- scenes (local +z = toward the road)
    const SCENES = {
      rehri() {
        box('wood', 1.7, 0.08, 0.95, 0, 0.82, 0, 0x8a6a48);
        box('wood', 1.7, 0.18, 0.05, 0, 0.95, 0.47, 0x7a5a3c); box('wood', 1.7, 0.18, 0.05, 0, 0.95, -0.47, 0x7a5a3c);
        for (const s of [-1, 1]) { cyl('metal', 0.38, 0.38, 0.06, s * 0.6, 0.38, 0.52, 0x4a4a46, Math.PI / 2, 12, true); cyl('metal', 0.38, 0.38, 0.06, s * 0.6, 0.38, -0.52, 0x4a4a46, Math.PI / 2, 12, true); } // axle across the cart: wheel discs face the road
        box('wood', 0.07, 0.6, 0.07, -0.8, 0.5, 0.4, 0x6a4a30); box('wood', 0.07, 0.6, 0.07, -0.8, 0.5, -0.4, 0x6a4a30);
        box('wood', 1.1, 0.06, 0.06, -1.3, 0.78, 0.4, 0x6a4a30); box('wood', 1.1, 0.06, 0.06, -1.3, 0.78, -0.4, 0x6a4a30);
        for (let i = 0; i < 6; i++) { // crates and heaps of produce, each its own colour and tilt
          const x = -0.62 + (i % 3) * 0.6, z = i < 3 ? -0.2 : 0.22;
          box('wood', 0.5, 0.2, 0.36, x, 0.96, z, 0x9a7a54, (rand() - 0.5) * 0.3);
          const g = prep(new THREE.IcosahedronGeometry(0.2, 1)); g.scale(1, 0.55, 0.8);
          place(g, x, 1.1, z, rand() * 3, 'tarpaulin', pick(CROP));
        }
        // a striped tarpaulin shade on two poles
        for (const s of [-1, 1]) box('wood', 0.05, 1.5, 0.05, s * 0.85, 1.6, -0.5, 0x7a5a3c);
        box('tarpaulin', 2.1, 0.03, 1.5, 0, 2.38, -0.15, pick([0xb8503a, 0x3a6a8a, 0xc8962a]), 0.04);
        box('metal', 0.34, 0.05, 0.2, 0.55, 1.02, 0.55, 0xb8b8b0); // hanging pan of the taraju
        person(0.1, -0.95, Math.PI, false, pick(MEN)); // vendor behind
        person(-0.4, 1.35, Math.PI + 0.3, false, pick(WOMEN)); // customer in front
        col(3.0, 1.25, -0.55, 0); // cart plus its handle shafts and the wheels (z +-0.55)
      },
      charpai() {
        const L = 1.9, W = 0.95, H = 0.42;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.07, H, 0.07, sx * (L / 2 - 0.04), H / 2, sz * (W / 2 - 0.04), 0x7a5a3c);
        for (const s of [-1, 1]) { box('wood', L, 0.06, 0.06, 0, H, s * (W / 2 - 0.04), 0x8a6a48); box('wood', 0.06, 0.06, W, s * (L / 2 - 0.04), H, 0, 0x8a6a48); }
        box('jute', L - 0.14, 0.025, W - 0.14, 0, H + 0.005, 0, pick([0xc4a878, 0xb89868, 0xc8b088]));
        // stool with a steel kettle and glasses
        box('wood', 0.4, 0.04, 0.4, 1.25, 0.3, 0.2, 0x8a6a48);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.04, 0.28, 0.04, 1.25 + sx * 0.16, 0.14, 0.2 + sz * 0.16, 0x7a5a3c);
        box('metal', 0.22, 0.2, 0.16, 1.25, 0.42, 0.2, 0x8c8c86); box('metal', 0.07, 0.1, 0.07, 1.15, 0.37, 0.28, 0xc4c8c8);
        // a matka on a three-legged stand in the shade
        cyl('terracotta', 0.2, 0.15, 0.4, -1.4, 0.7, -0.3, 0xb87858, 0, 10);
        for (const a of [0, 2.1, 4.2]) box('wood', 0.04, 0.5, 0.04, -1.4 + Math.cos(a) * 0.2, 0.25, -0.3 + Math.sin(a) * 0.2, 0x7a5a3c);
        const n = 2 + Math.floor(rand() * 2);
        for (let i = 0; i < n; i++) person(-0.6 + i * 0.6 + (rand() - 0.5) * 0.1, (i % 2 ? 0.05 : -0.05), (rand() - 0.5) * 1.2 + (i % 2 ? Math.PI : 0), true, pick(MEN), H + 0.03);
        col(3.3, 1.05, -0.12, 0); // cot plus the stool (x to 1.45) and the matka stand (x to -1.62): the 8 Nov wood cell at x610 z-37.5 was the stand's legs outside a cot-only box
      },
      buffalo() {
        // cement trough, peg, rope, dung
        box('concrete', 1.5, 0.42, 0.08, 0, 0.21, 1.4 - 0.27, 0x9e968a); box('concrete', 1.5, 0.42, 0.08, 0, 0.21, 1.4 + 0.27, 0x9a928a);
        box('concrete', 0.08, 0.42, 0.62, -0.71, 0.21, 1.4, 0xa0988c); box('concrete', 0.08, 0.42, 0.62, 0.71, 0.21, 1.4, 0x9e968a);
        box('concrete', 1.4, 0.05, 0.5, 0, 0.1, 1.4, 0x6e665a);
        box('wood', 1.2, 0.2, 0.4, 0, 0.3, 1.4, 0xc8ac6a, 0.05); // chopped straw heaped in the trough
        cyl('wood', 0.05, 0.065, 0.7, 0.6, 0.33, 0.9, 0x6e5238, 0, 7);
        for (let i = 0; i < 5; i++) { const g = prep(new THREE.IcosahedronGeometry(0.11, 1)); g.scale(1, 0.25, 1); place(g, (rand() - 0.5) * 1.6, 0.02, -1.0 - rand() * 0.8, rand() * 6, 'concrete', i % 3 === 2 ? 0x7a6a52 : 0x3e3224); }
        const b = wl(0.1, 0, 0.1);
        animals.push({ x: b.x, z: b.z, yaw: frame.yaw + 0.05, s: [1.14, 1.1, 1.24], tint: 0x34322e, sit: false });
        col(1.2, 2.6, 0.1, 0.0, true); col(1.6, 0.8, 0, 1.4);
      },
      kids() {
        // a marbles ring scratched in the dust (flat disc) and four kids crouched round it, one standing watching
        const ring = new THREE.CircleGeometry(0.55, 20); ring.rotateX(-Math.PI / 2);
        place(prep(ring), 0, 0.012, 0, 0, 'concrete', 0xb8aa8e);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4, r = 0.9; person(Math.cos(a) * r, Math.sin(a) * r, Math.atan2(-Math.cos(a), -Math.sin(a)), true, pick(KID), 0.05, true); }
        person(1.9, 0.5, -1.6, false, pick(KID), 0, true);
        for (let i = 0; i < 4; i++) { const g = prep(new THREE.IcosahedronGeometry(0.014, 1)); place(g, (rand() - 0.5) * 0.7, 0.02, (rand() - 0.5) * 0.7, 0, 'tarpaulin', pick(CROP)); }
        box('wood', 0.7, 0.05, 0.05, -2.2, 0.03, 1.0, 0x7a5a3c, 0.4); // a dropped cricket stump
      },
      fruit() {
        box('jute', 2.0, 0.03, 1.5, 0, 0.015, 0, pick([0xb8a070, 0xa89060]), 0.15);
        for (let i = 0; i < 5; i++) {
          const x = -0.75 + i * 0.38, z = (i % 2 ? 0.2 : -0.2);
          const g = prep(new THREE.IcosahedronGeometry(0.22, 1)); g.scale(1, 0.6, 1);
          place(g, x, 0.12, z, rand() * 3, 'tarpaulin', pick([0xc8a020, 0xb8402a, 0x6a8a3a, 0xc86a1a, 0x8a5a2a]));
        }
        box('wood', 0.5, 0.2, 0.36, 0.95, 0.13, 0.55, 0x9a7a54, 0.3); box('metal', 0.34, 0.05, 0.2, -0.9, 0.06, 0.5, 0xb8b8b0);
        cyl('wood', 0.03, 0.03, 2.1, 1.3, 1.05, -0.7, 0x7a5a3c, 0, 5); box('tarpaulin', 1.8, 0.03, 1.5, 0.4, 2.1, -0.4, pick([0xb8503a, 0x3a6a8a, 0xe0d4b0]), 0.05);
        cyl('wood', 0.03, 0.03, 2.1, -0.5, 1.05, -0.7, 0x7a5a3c, 0, 5);
        person(0.1, -0.7, Math.PI, true, pick(MEN), 0.04);
        person(-0.5, 1.3, Math.PI + 0.2, false, pick(WOMEN));
        col(3.0, 1.6, 0.3, -0.1); // stall plus its far tarpaulin pole
      },
      cow() {
        const b = wl(0, 0, 0);
        animals.push({ x: b.x, z: b.z, yaw: frame.yaw + 1.35, s: [1, 1, 1], tint: 0xd6ccb4, sit: true });
        for (let i = 0; i < 3; i++) { const g = prep(new THREE.IcosahedronGeometry(0.12, 1)); g.scale(1, 0.25, 1); place(g, -0.2 - i * 0.2 + (rand() - 0.5) * 0.4, 0.02, -1.2 - rand() * 0.8, rand() * 6, 'concrete', 0x4e4030); }
        box('wood', 0.9, 0.12, 0.4, 1.4, 0.07, 0.9, 0xc8ac6a, 0.2); // a heap of straw
        col(2.1, 1.0, 0, 0, true);
      },
    };

    // ---------------------------------------------------------------- site search
    const farFrom = (x, z, r) => Math.hypot(x - CHAURAHA.x, z - CHAURAHA.z) > r;
    const roadClear = (x, z, r) => lines.every((l) => l.id === 'chauraha_ring' || distToLine(l.pts, x, z) > l.w / 2 + r + 0.3);
    const siteOk = (x, z, r, taken) => {
      if (!farFrom(x, z, 12 + r)) return false;
      if (!roadClear(x, z, r)) return false;
      if (circleHitsAnyBox({ x, z }, r, staticBoxesNear(x, z, r + 1))) return false;
      if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < r + t.r + 1)) return false;
      for (const [dx, dz] of [[0, 0], [r * 0.7, 0], [-r * 0.7, 0], [0, r * 0.7], [0, -r * 0.7]]) {
        if (Math.abs(groundAt(scene, x + dx, z + dz, 0)) > 0.12) return false; // a floor, plinth or dug ground under it
      }
      return true;
    };

    const stations = [];
    for (let k = 0; ; k++) {
      const d = START + k * STEP, a = road.sc + d, b = road.sc - d;
      if (a > road.len - 4 && b < 4) break;
      if (b >= 4) stations.push(b);
      if (a <= road.len - 4) stations.push(a);
    }
    stations.sort((p, q) => Math.abs(p - road.sc) - Math.abs(q - road.sc));
    const taken = [];
    let ti = 0, tractors = 0;
    stations.forEach((s0, n) => {
      let spec = TYPES[ti++ % TYPES.length];
      if (spec.k === 'tractor' && tractors >= 1) spec = TYPES[ti++ % TYPES.length];
      const prefer = n % 2 ? 1 : -1;
      for (const ds of [0, 6, -6, 12, -12, 18, -18]) {
        const f = road.at(s0 + ds);
        for (const side of [prefer, -prefer]) {
          for (const extra of [0.8, 2, 3.5, 5.5]) {
            const off = road.hw + spec.r + extra;
            const x = f.x + f.nx * side * off, z = f.z + f.nz * side * off;
            if (!siteOk(x, z, spec.r, taken)) continue;
            const yaw = Math.atan2(-f.nx * side, -f.nz * side) + (spec.k === 'tractor' ? 0 : 0); // local +z faces the road
            taken.push({ x, z, r: spec.r });
            info.placed.push({ type: spec.k, station: +(s0 + ds - road.sc).toFixed(0), x: +x.toFixed(1), z: +z.toFixed(1) });
            begin(x, z, spec.k === 'tractor' ? Math.atan2(f.dx, f.dz) + (n % 2 ? 0 : Math.PI) : yaw + (rand() - 0.5) * 0.3);
            if (spec.k === 'tractor') {
              tractors++;
              const tg = buildTractorGroup().group;
              mergeGroupByMaterial(tg);
              tg.position.set(x, 0, z); tg.rotation.y = frame.yaw; tg.updateMatrixWorld(true);
              group.add(tg);
              tg.traverse((o) => { if (o.isMesh) { o.userData.noAutoCollider = true; o.castShadow = true; o.receiveShadow = true; } });
              col(2.0, 3.7, 0, 0);
            } else {
              band = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
              SCENES[spec.k]();
              // every prop that stands in the body band is inside a collider by construction, whatever the hand boxes say
              // (8 Nov: a wood cell at x610.2 z-37.5 stood outside its scene's hand box in collision-test)
              if (isFinite(band.minX)) col(band.maxX - band.minX + 0.1, band.maxZ - band.minZ + 0.1, (band.minX + band.maxX) / 2, (band.minZ + band.maxZ) / 2);
              band = null;
            }
            return;
          }
        }
      }
      info.skipped.push({ type: spec.k, station: +(s0 - road.sc).toFixed(0) });
    });

    // ---------------------------------------------------------------- meshes
    const meshes = {};
    for (const [set, list] of by) {
      const m = new THREE.Mesh(mergeGeometries(list), getTiledMaterial(set, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
      m.name = `main_road_life_${set}`; m.castShadow = true; m.receiveShadow = true; m.userData.noAutoCollider = true;
      group.add(m); meshes[set] = m;
    }
    (meshes.wood || meshes.concrete || group.children[0]).userData.colliderBoxes = colliders;

    const c = new THREE.Color();
    if (animals.length) {
      const hide = createHideMaterial(0xffffff);
      for (const sit of [false, true]) {
        const list = animals.filter((a) => a.sit === sit);
        if (!list.length) continue;
        const mesh = new THREE.InstancedMesh(buildBovineGeometry(sit ? { lying: true } : {}), hide, list.length);
        mesh.name = sit ? 'main_road_life_cows_lying' : 'main_road_life_buffalo';
        list.forEach((a, i) => { a.mesh = mesh; a.idx = i; a.y = 0; mesh.setMatrixAt(i, _m4.compose(_v.set(a.x, 0, a.z), _q.setFromEuler(_e.set(0, a.yaw, 0)), new THREE.Vector3(...a.s))); mesh.setColorAt(i, c.setHex(a.tint)); });
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.noAutoCollider = true;
        markFigure(mesh); group.add(mesh);
      }
    }
    let pm = null;
    if (people.length) {
      pm = new THREE.InstancedMesh(new THREE.CapsuleGeometry(PEOPLE_R, PEOPLE_H - PEOPLE_R * 2, 4, 8), new THREE.MeshStandardMaterial({ roughness: 0.85 }), people.length);
      pm.name = 'ambient_life_main_road_life_people'; pm.castShadow = true; pm.receiveShadow = true;
      people.forEach((p, i) => {
        pm.setMatrixAt(i, _m4.compose(_v.set(p.x, p.y + (PEOPLE_H * p.sy) / 2, p.z), _q.setFromEuler(_e.set(0, p.ry, 0)), new THREE.Vector3(p.sx, p.sy, p.sx)));
        pm.setColorAt(i, c.setHex(p.tint));
      });
      pm.instanceMatrix.needsUpdate = true; if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
      scene.add(pm); batchPeopleMesh(pm); markFigure(pm);
    }
    keepOnGround(group, (sc) => {
      for (const a of animals) {
        const dy = settleDy(sc, a.mesh, a.idx);
        if (Math.abs(dy) < 1.2) {
          a.y += dy; a.mesh.getMatrixAt(a.idx, _m4); _m4.elements[13] += dy; a.mesh.setMatrixAt(a.idx, _m4); a.mesh.instanceMatrix.needsUpdate = true;
        }
      }
      if (pm) settleInstances(sc, pm, refreshPeopleMesh);
    });
    group.traverse((o) => { if (o.isMesh) info.drawCalls++; });
    info.people = people.length; info.colliders = colliders.length; info.stations = stations.length;
    console.log(`[mainRoadLife] placed ${info.placed.length}/${stations.length} scenes, ${people.length} people, ${colliders.length} colliders`);
  }

  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    if (prev) prev.apply(this, args);
    if (settlingReleased()) frames++; // load time: lazy builds wait for the opening view (docs/perf-2026-11-08.md)
    if (!built && lazyDue(frames, 40) && STATIC_COLLIDERS.length > 0) {
      built = true;
      try { build(); requestColliderRebuild(); } catch (err) { console.error('mainRoadLife build failed', err); }
    }
  };
  return { group };
}
