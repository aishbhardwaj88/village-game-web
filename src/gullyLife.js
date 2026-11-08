import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildBovineGeometry, createHideMaterial } from './animals.js';
import { getTiledMaterial } from './materials.js';
import { oldHouseMaterial } from './stagingYard.js';
import { allRoadLines } from './mapRoads.js';
import { CHAURAHA } from './mapPlan.js';
import { colliderBoxFromTransform, STATIC_COLLIDERS, staticBoxesNear, circleHitsAnyBox, requestColliderRebuild } from './collision.js';
import { batchLateGroup, batchPeopleMesh, refreshPeopleMesh } from './placeBatch.js';
import { keepOnGround, markFigure, settleDy, settleInstances, groundAt } from './standOn.js';
import { createWideSignAtlas, mapFrontFaceToRow } from './signboards.js';
import { settlingReleased, lazyDue } from './standOn.js';

/**
 * The two gullies off the chauraha get the frontage treatment (docs/PARALLEL.md item 6; model: src/chaurahaEdges.js and
 * src/mainRoadLife.js). The gullies are the map's two short village lanes that leave the square: "Council lane" (west,
 * 47 m) and "Lane east of the square" (36 m). A scene every ~8 m along each, alternating sides, local +z facing the lane:
 *   tea       open tea shop: plaster walls, tin roof, plank counter, kettle and glasses, tarpaulin awning, painted board, a customer
 *   kirana    open general store: shelves of sacks and tins, counter, awning, board, shopkeeper and a customer
 *   cycle     cycle repair under a tin lean-to: cycle on its wheels, mechanic on a stool, water basin for the tube, pump
 *   charpai   a cot with two or three men, a kettle and glasses on a stool, a matka on its stand
 *   rehri     vegetable handcart with crates, vendor behind, customer in front
 *   washing   outside a house: woman scouring brass pots at a basin, kid beside, a cloth line with laundry
 *   kids      a marbles ring with four crouched kids and one watching
 *   buffalo   a buffalo at a peg beside a cement trough (a cow lying down in the second gully)
 * Sites are searched at run time (once static colliders exist) for ground clear of every collider, every carriageway, dug ground,
 * raised floors and each other, and out of the 12 m chauraha circle, so nothing blocks the lane or touches what does not belong
 * with it (docs/SPATIAL_SENSE.md sections 3 and 5: a shop keeps a customer strip in front; a buffalo never against a shop).
 * People are capsule stand-ins (soft: name starts 'ambient_life') settled by src/standOn.js. Frozen library sets only (plaster,
 * wood, metal, tin, concrete, tarpaulin, jute, terracotta). No brands, tobacco, alcohol or shrines.
 */

const LANES = ['20_Council lane', '21_Lane east of the square'];
const STEP = 8;
const TILE = 1.0;
const PEOPLE_R = 0.32, PEOPLE_H = 1.7;
const MEN = [0xb8b0a0, 0x8a9aa8, 0xa89070, 0x9a8a9a, 0x7a8a6a, 0xc0a890, 0xd0c4a8];
const KID = [0xc8503a, 0x3a6a8a, 0xc8962a, 0x4a7a4a, 0x8a3a5a];
const WOMEN = [0xb04a5a, 0x3a5a8a, 0xc8962a, 0x8a4a7a];
const CROP = [0xb8402a, 0xc86a1a, 0x4a7a3a, 0x8a3a5a, 0xc8a020, 0x6a8a3a];
const WALLS = [0xe9dcc0, 0xd8dfcf, 0xd4dce0, 0xe4cfb0, 0xe2c9c0];
const AWN = [[0xb8503a, 0xe8dcc0], [0x3a6a8a, 0xe8dcc0], [0xc8962a, 0x8a3a2a], [0x4a7a4a, 0xe0d4b0]];
const SIGNS = {
  tea: { hi: 'चाय की दुकान', en: 'Tea Shop', bg: '#e6dcc2', fg: '#1f2a4a', border: '#2a3a66' },
  kirana: { hi: 'किराना स्टोर', en: 'General Store', bg: '#ece0c4', fg: '#5a1a14', border: '#7a2a1c' },
  cycle: { hi: 'साइकिल मरम्मत', en: 'Cycle Repair', bg: '#e9dfc6', fg: '#6e1a12', border: '#8a2a18' },
};
// order of scenes per lane (r = clear-circle radius needed)
const R = { tea: 2.5, kirana: 2.5, cycle: 2.5, charpai: 2.5, rehri: 2.6, washing: 2.3, kids: 2.3, buffalo: 3.2, cow: 2.4 };
const ORDER = [
  ['tea', 'charpai', 'washing', 'kirana', 'rehri', 'kids', 'cycle'],
  ['kirana', 'cycle', 'charpai', 'tea', 'washing', 'rehri', 'buffalo'],
];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const colour = (geo, c) => {
  const col = new THREE.Color(c), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
};
function metreUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u / TILE; uv[i * 2 + 1] = v / TILE;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);

function polyline(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const at = (s) => {
    s = Math.max(0, Math.min(cum[cum.length - 1], s));
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / L;
    const dx = (bx - ax) / L, dz = (bz - az) / L;
    return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx, dz, nx: -dz, nz: dx };
  };
  return { at, len: cum[cum.length - 1] };
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

export function createGullyLife(scene) {
  const group = new THREE.Group(); group.name = 'gully_life';
  scene.add(group);
  batchLateGroup(group, group.name);
  const info = { placed: [], skipped: [], drawCalls: 0 };
  if (typeof window !== 'undefined') window.__gullyLife = info;
  let built = false, frames = 0;

  function build() {
    const lines = allRoadLines();
    const rand = rng(8112027);
    const by = new Map();
    const colliders = [], people = [], animals = [], signs = [];
    let frame = null;
    const begin = (x, z, yaw) => { frame = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), _one); frame.yaw = yaw; };
    const place = (g, lx, ly, lz, ry, set, tint) => {
      g.applyMatrix4(_m4.compose(_v.set(lx, ly, lz), _q.setFromEuler(_e.set(0, ry, 0)), _one).premultiply(frame));
      colour(g, tint);
      if (!by.has(set)) by.set(set, []);
      by.get(set).push(g);
    };
    const prep = (g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); g.computeVertexNormals(); metreUV(g); return g; };
    const box = (set, w, h, d, lx, ly, lz, tint, ry = 0) => place(prep(new THREE.BoxGeometry(w, h, d)), lx, ly, lz, ry, set, tint);
    const cyl = (set, rt, rb, h, lx, ly, lz, tint, rz = 0, seg = 8) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); if (rz) g.rotateZ(rz); place(prep(g), lx, ly, lz, 0, set, tint); };
    const ring = (set, r, tube, lx, ly, lz, ry, tint) => place(prep(new THREE.TorusGeometry(r, tube, 5, 16)), lx, ly, lz, ry, set, tint);
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
    const crateOf = (x, y, z) => { box('wood', 0.5, 0.2, 0.36, x, y, z, 0x9a7a54, (rand() - 0.5) * 0.3); };

    // an open shop: three plaster walls, tin roof, shutter rolled up under the lintel, plank counter, awning, board
    const shop = (kind) => {
      const W = 3.2, D = 2.2, H = 2.5, wall = pick(WALLS), [a1, a2] = pick(AWN), z0 = -0.6; // body centre z = z0, front edge z0 + D/2 = 0.5
      const zf = z0 + D / 2, zb = z0 - D / 2;
      box('concrete', W + 0.2, 0.2, D + 0.2, 0, 0.1, z0, 0xb0a898); // plinth
      box('plaster', W, H, 0.18, 0, H / 2 + 0.2, zb + 0.09, wall);
      box('plaster', 0.18, H, D, -W / 2 + 0.09, H / 2 + 0.2, z0, wall); box('plaster', 0.18, H, D, W / 2 - 0.09, H / 2 + 0.2, z0, wall);
      box('plaster', W, 0.45, 0.18, 0, H + 0.2 - 0.22, zf - 0.09, wall); // lintel
      box('metal', W - 0.5, 0.22, 0.14, 0, H - 0.2, zf - 0.02, 0x6a6a64); // rolled-up shutter drum
      for (const s of [-1, 1]) box('metal', 0.05, H - 0.4, 0.05, s * (W / 2 - 0.3), (H - 0.4) / 2 + 0.2, zf - 0.04, 0x5a5a54); // guide rails
      const roof = prep(new THREE.BoxGeometry(W + 0.5, 0.06, D + 0.6)); roof.rotateX(0.07);
      place(roof, 0, H + 0.5, z0 + 0.1, 0, 'tin', 0xa8aca8);
      box('wood', W - 0.6, 0.06, 0.55, 0, 0.88, zf + 0.25, 0x8a6a48); // counter top
      box('wood', W - 0.6, 0.66, 0.5, 0, 0.55, zf + 0.25, 0x7a5a3c);
      // back shelves
      for (const y of [0.9, 1.4, 1.9]) box('wood', W - 0.5, 0.04, 0.3, 0, y, zb + 0.35, 0x7a5a3c);
      if (kind === 'tea') {
        for (let i = 0; i < 6; i++) box('metal', 0.08, 0.09, 0.08, -1.1 + i * 0.22, 0.97, zf + 0.15, 0xc4c8c8); // steel glasses
        cyl('metal', 0.16, 0.2, 0.3, -0.6, 1.07, zf + 0.4, 0x8c8c86, 0, 10); // big kettle
        box('concrete', 0.7, 0.5, 0.5, 0.8, 0.45, zb + 0.5, 0x6e665a); // chulha
        for (let i = 0; i < 5; i++) box('terracotta', 0.14, 0.14, 0.14, -1.2 + i * 0.5, 1.0 + (i % 2) * 0.5, zb + 0.35, 0xb87858);
      } else {
        for (let i = 0; i < 6; i++) { const y = [0.99, 1.49, 1.99][i % 3]; box('tarpaulin', 0.3, 0.2, 0.2, -1.2 + i * 0.45, y + 0.1, zb + 0.35, pick(CROP)); }
        for (let i = 0; i < 3; i++) box('jute', 0.5, 0.2, 0.4, -1.0 + i * 0.7, 0.3, zb + 0.5, pick([0xd0b890, 0xc8a878, 0xb89a70]), (rand() - 0.5) * 0.3);
        cyl('metal', 0.2, 0.2, 0.25, 1.1, 1.0, zf + 0.3, 0xb8b8b0, 0, 8); // weighing pan
      }
      // striped tarpaulin awning on two poles
      for (const s of [-1, 1]) box('wood', 0.06, 2.2, 0.06, s * (W / 2 - 0.1), 1.1, zf + 0.95, 0x7a5a3c);
      for (let i = 0; i < 6; i++) { const g = prep(new THREE.BoxGeometry(W / 6, 0.03, 1.1)); g.rotateX(0.18); place(g, -W / 2 + W / 12 + i * (W / 6), 2.28, zf + 0.5, 0, 'tarpaulin', i % 2 ? a1 : a2); }
      // customer strip in front; shopkeeper behind the counter
      person(0.4, zb + 0.9, Math.PI, false, pick(MEN), 0.2); // shopkeeper behind counter (faces the lane, +z is toward the lane => use 0)
      people[people.length - 1].ry = frame.yaw;
      person(-0.4, zf + 1.1, Math.PI + 0.25, false, pick(WOMEN));
      signs.push({ key: kind, m: new THREE.Matrix4().copy(frame).multiply(new THREE.Matrix4().makeTranslation(0, H + 0.2 + 0.28, zf + 0.04)), w: 1.7 });
      col(W + 0.3, D + 0.3, 0, z0);
    };

    const SCENES = {
      tea: () => shop('tea'),
      kirana: () => shop('kirana'),
      cycle() {
        // tin lean-to on two poles, a cycle on its wheels, mechanic on a stool, basin and pump
        for (const [x, z] of [[-1.3, -1.0], [1.3, -1.0]]) box('wood', 0.07, 2.3, 0.07, x, 1.15, z, 0x7a5a3c);
        const roof = prep(new THREE.BoxGeometry(3.0, 0.05, 1.7)); roof.rotateX(0.08); place(roof, 0, 2.38, -0.6, 0, 'tin', 0xa0a49e);
        box('plaster', 2.8, 1.6, 0.16, 0, 0.8, -1.4, pick(WALLS));
        for (const x of [-0.5, 0.5]) ring('metal', 0.34, 0.016, x, 0.36, 0.0, Math.PI / 2, 0x3a3a38);
        box('metal', 1.0, 0.03, 0.03, 0, 0.55, 0.0, 0x8a2a1a); box('metal', 0.03, 0.4, 0.03, -0.1, 0.62, 0, 0x8a2a1a);
        box('wood', 0.2, 0.05, 0.1, -0.15, 0.85, 0, 0x2a2a28); box('metal', 0.4, 0.03, 0.03, 0.5, 0.82, 0, 0x6a6a64);
        box('wood', 0.3, 0.3, 0.3, 1.0, 0.15, 0.3, 0x7a5a3c); // stool
        cyl('concrete', 0.28, 0.24, 0.16, -1.1, 0.08, 0.5, 0x7a7870, 0, 12); // water basin to find the puncture
        cyl('metal', 0.03, 0.03, 0.6, 0.5, 0.3, 0.7, 0x4a4a46, Math.PI / 2, 6); // foot pump lying down
        for (let i = 0; i < 3; i++) ring('metal', 0.16 + i * 0.02, 0.02, -1.2 + i * 0.1, 1.0 + i * 0.2, -1.3, 0, 0x2a2a28); // hanging tyres
        box('wood', 0.5, 0.05, 0.3, -1.0, 0.04, -0.6, 0x5a5048); // spares tray
        person(1.0, 0.3, Math.PI * 0.85, true, pick(MEN), 0.3);
        signs.push({ key: 'cycle', m: new THREE.Matrix4().copy(frame).multiply(new THREE.Matrix4().makeTranslation(0, 2.0, 0.3)), w: 1.5 });
        col(3.0, 1.9, 0, -0.5);
      },
      charpai() {
        const L = 1.9, Wd = 0.95, H = 0.42;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.07, H, 0.07, sx * (L / 2 - 0.04), H / 2, sz * (Wd / 2 - 0.04), 0x7a5a3c);
        for (const s of [-1, 1]) { box('wood', L, 0.06, 0.06, 0, H, s * (Wd / 2 - 0.04), 0x8a6a48); box('wood', 0.06, 0.06, Wd, s * (L / 2 - 0.04), H, 0, 0x8a6a48); }
        box('jute', L - 0.14, 0.025, Wd - 0.14, 0, H + 0.005, 0, pick([0xc4a878, 0xb89868, 0xc8b088]));
        box('wood', 0.4, 0.04, 0.4, 1.25, 0.3, 0.2, 0x8a6a48);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.04, 0.28, 0.04, 1.25 + sx * 0.16, 0.14, 0.2 + sz * 0.16, 0x7a5a3c);
        box('metal', 0.22, 0.2, 0.16, 1.25, 0.42, 0.2, 0x8c8c86); box('metal', 0.07, 0.1, 0.07, 1.15, 0.37, 0.28, 0xc4c8c8);
        cyl('terracotta', 0.2, 0.15, 0.4, -1.4, 0.7, -0.3, 0xb87858, 0, 10);
        for (const a of [0, 2.1, 4.2]) box('wood', 0.04, 0.5, 0.04, -1.4 + Math.cos(a) * 0.2, 0.25, -0.3 + Math.sin(a) * 0.2, 0x7a5a3c);
        const n = 2 + Math.floor(rand() * 2);
        for (let i = 0; i < n; i++) person(-0.6 + i * 0.6 + (rand() - 0.5) * 0.1, (i % 2 ? 0.05 : -0.05), (rand() - 0.5) * 1.2 + (i % 2 ? Math.PI : 0), true, pick(MEN), H + 0.03);
        col(2.0, 1.05, 0, 0);
      },
      rehri() {
        box('wood', 1.7, 0.08, 0.95, 0, 0.82, 0, 0x8a6a48);
        box('wood', 1.7, 0.18, 0.05, 0, 0.95, 0.47, 0x7a5a3c); box('wood', 1.7, 0.18, 0.05, 0, 0.95, -0.47, 0x7a5a3c);
        for (const s of [-1, 1]) { cyl('metal', 0.38, 0.38, 0.06, s * 0.6, 0.38, 0.52, 0x4a4a46, Math.PI / 2, 12); cyl('metal', 0.38, 0.38, 0.06, s * 0.6, 0.38, -0.52, 0x4a4a46, Math.PI / 2, 12); }
        box('wood', 0.07, 0.6, 0.07, -0.8, 0.5, 0.4, 0x6a4a30); box('wood', 0.07, 0.6, 0.07, -0.8, 0.5, -0.4, 0x6a4a30);
        box('wood', 1.1, 0.06, 0.06, -1.3, 0.78, 0.4, 0x6a4a30); box('wood', 1.1, 0.06, 0.06, -1.3, 0.78, -0.4, 0x6a4a30);
        for (let i = 0; i < 6; i++) {
          const x = -0.62 + (i % 3) * 0.6, z = i < 3 ? -0.2 : 0.22;
          crateOf(x, 0.96, z);
          const g = prep(new THREE.IcosahedronGeometry(0.2, 1)); g.scale(1, 0.55, 0.8);
          place(g, x, 1.1, z, rand() * 3, 'tarpaulin', pick(CROP));
        }
        for (const s of [-1, 1]) box('wood', 0.05, 1.5, 0.05, s * 0.85, 1.6, -0.5, 0x7a5a3c);
        box('tarpaulin', 2.1, 0.03, 1.5, 0, 2.38, -0.15, pick([0xb8503a, 0x3a6a8a, 0xc8962a]), 0.04);
        person(0.1, -0.95, Math.PI, false, pick(MEN));
        person(-0.4, 1.35, Math.PI + 0.3, false, pick(WOMEN));
        col(3.0, 1.1, -0.55, 0);
      },
      washing() {
        // outside a house: scouring brass pots at a basin, a cloth line with laundry, a stool and a stack of pots
        cyl('metal', 0.34, 0.28, 0.14, 0, 0.07, 0.2, 0x9a9a92, 0, 14);
        for (let i = 0; i < 4; i++) cyl('metal', 0.1 + (i % 2) * 0.03, 0.1, 0.14, -0.9 + i * 0.22, 0.07, 0.3 + (i % 2) * 0.2, 0xc8a24a, 0, 10); // brass pots on the ground
        for (let i = 0; i < 3; i++) cyl('metal', 0.14 - i * 0.015, 0.16 - i * 0.015, 0.1, 1.0, 0.05 + i * 0.1, 0.0, 0xc4c8c8, 0, 10); // steel stack
        box('wood', 0.3, 0.22, 0.3, 0.5, 0.11, -0.3, 0x7a5a3c);
        for (const x of [-1.5, 1.5]) cyl('wood', 0.04, 0.04, 2.0, x, 1.0, -1.0, 0x7a5a3c, 0, 6);
        box('jute', 3.0, 0.015, 0.015, 0, 1.95, -1.0, 0xc8b898); // line
        for (let i = 0; i < 4; i++) { const w = 0.45 + rand() * 0.2; box('jute', w, 0.7 + rand() * 0.3, 0.015, -1.1 + i * 0.7, 1.55, -1.0, pick([0xc8503a, 0xe8e0d0, 0x3a6a8a, 0xc8962a, 0xe8c8d0]), (rand() - 0.5) * 0.15); }
        person(0, -0.45, 0.2, true, pick(WOMEN), 0.0);
        person(-0.9, -0.6, 0.6, true, pick(KID), 0.0, true);
        col(0.9, 0.9, 0, 0.2);
        col(3.0, 0.3, 0, -1.0); // the laundry line and cloths
      },
      kids() {
        const rg = new THREE.CircleGeometry(0.55, 20); rg.rotateX(-Math.PI / 2);
        place(prep(rg), 0, 0.012, 0, 0, 'concrete', 0xb8aa8e);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4, r = 0.9; person(Math.cos(a) * r, Math.sin(a) * r, Math.atan2(-Math.cos(a), -Math.sin(a)), true, pick(KID), 0.05, true); }
        person(1.7, 0.5, -1.6, false, pick(KID), 0, true);
        for (let i = 0; i < 4; i++) { const g = prep(new THREE.IcosahedronGeometry(0.014, 1)); place(g, (rand() - 0.5) * 0.7, 0.02, (rand() - 0.5) * 0.7, 0, 'tarpaulin', pick(CROP)); }
        box('wood', 0.7, 0.05, 0.05, -1.9, 0.03, 1.0, 0x7a5a3c, 0.4);
      },
      buffalo() {
        box('concrete', 1.5, 0.42, 0.08, 0, 0.21, 1.4 - 0.27, 0x9e968a); box('concrete', 1.5, 0.42, 0.08, 0, 0.21, 1.4 + 0.27, 0x9a928a);
        box('concrete', 0.08, 0.42, 0.62, -0.71, 0.21, 1.4, 0xa0988c); box('concrete', 0.08, 0.42, 0.62, 0.71, 0.21, 1.4, 0x9e968a);
        box('concrete', 1.4, 0.05, 0.5, 0, 0.1, 1.4, 0x6e665a);
        box('wood', 1.2, 0.2, 0.4, 0, 0.3, 1.4, 0xc8ac6a, 0.05);
        cyl('wood', 0.05, 0.065, 0.7, 0.6, 0.33, 0.9, 0x6e5238, 0, 7);
        for (let i = 0; i < 5; i++) { const g = prep(new THREE.IcosahedronGeometry(0.11, 1)); g.scale(1, 0.25, 1); place(g, (rand() - 0.5) * 1.6, 0.02, -1.0 - rand() * 0.8, rand() * 6, 'concrete', i % 3 === 2 ? 0x7a6a52 : 0x3e3224); }
        const b = wl(0.1, 0, 0.1);
        animals.push({ x: b.x, z: b.z, yaw: frame.yaw + 0.05, s: [1.14, 1.1, 1.24], tint: 0x34322e, sit: false });
        col(1.2, 2.6, 0.1, 0.0, true); col(1.6, 0.8, 0, 1.4);
      },
    };

    // ---------------------------------------------------------------- site search
    const roadClear = (x, z, r, ownId) => lines.every((l) => l.id === 'chauraha_ring' || distToLine(l.pts, x, z) > l.w / 2 + r + 0.3);
    const siteOk = (x, z, r, taken) => {
      if (Math.hypot(x - CHAURAHA.x, z - CHAURAHA.z) <= 12 + r) return false;
      if (!roadClear(x, z, r)) return false;
      if (circleHitsAnyBox({ x, z }, r, staticBoxesNear(x, z, r + 1))) return false;
      if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < r + t.r + 0.8)) return false;
      for (const [dx, dz] of [[0, 0], [r * 0.7, 0], [-r * 0.7, 0], [0, r * 0.7], [0, -r * 0.7]]) {
        if (Math.abs(groundAt(scene, x + dx, z + dz, 0)) > 0.12) return false;
      }
      return true;
    };

    const taken = [];
    LANES.forEach((id, li) => {
      const line = lines.find((l) => l.id === id);
      if (!line) { info.skipped.push({ lane: id, why: 'no line' }); return; }
      const pl = polyline(line.pts), hw = line.w / 2;
      const nst = Math.max(1, Math.floor((pl.len - 4) / STEP));
      for (let n = 0; n < nst; n++) {
        const s0 = 3 + (n + 0.5) * ((pl.len - 6) / nst);
        let kind = ORDER[li][n % ORDER[li].length];
        const prefer = (n + li) % 2 ? 1 : -1;
        let ok = false;
        for (const k of [kind, 'kids', 'washing']) {
          const r = R[k];
          for (const ds of [0, 2.5, -2.5, 5, -5]) {
            const f = pl.at(s0 + ds);
            for (const side of [prefer, -prefer]) {
              for (const extra of [0.5, 1.2, 2.2, 3.6]) {
                const off = hw + r + extra, x = f.x + f.nx * side * off, z = f.z + f.nz * side * off;
                if (!siteOk(x, z, r, taken)) continue;
                taken.push({ x, z, r });
                info.placed.push({ lane: id, type: k, x: +x.toFixed(1), z: +z.toFixed(1) });
                begin(x, z, Math.atan2(-f.nx * side, -f.nz * side) + (rand() - 0.5) * 0.12);
                SCENES[k]();
                ok = true; break;
              }
              if (ok) break;
            }
            if (ok) break;
          }
          if (ok) break;
        }
        if (!ok) info.skipped.push({ lane: id, type: kind, s: +s0.toFixed(0) });
      }
    });

    // ---------------------------------------------------------------- meshes
    const meshes = {};
    for (const [set, list] of by) {
      const m = new THREE.Mesh(mergeGeometries(list), oldHouseMaterial(set) || getTiledMaterial(set, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
      m.name = `gully_life_${set}`; m.castShadow = true; m.receiveShadow = true; m.userData.noAutoCollider = true;
      group.add(m); meshes[set] = m;
    }
    const holder = meshes.wood || meshes.concrete || group.children[0];
    if (holder) holder.userData.colliderBoxes = colliders;

    if (signs.length) { // one atlas, Hindi bold on top, English below, one dark paint
      const keys = [...new Set(signs.map((s) => s.key))];
      const atlas = createWideSignAtlas(keys.map((k) => SIGNS[k]));
      const boards = signs.map((sg) => {
        const g = new THREE.BoxGeometry(sg.w, sg.w / 4.41, 0.04);
        mapFrontFaceToRow(g, keys.indexOf(sg.key), keys.length);
        g.applyMatrix4(sg.m);
        return g;
      });
      const sm = new THREE.Mesh(mergeGeometries(boards), Object.assign(new THREE.MeshStandardMaterial({ map: atlas.texture, roughness: 0.85 }), { name: 'signboard' }));
      sm.name = 'gully_life_signs'; sm.castShadow = true; sm.userData.noAutoCollider = true;
      group.add(sm);
    }

    const c = new THREE.Color();
    if (animals.length) {
      const hide = createHideMaterial(0xffffff);
      const list = animals;
      const mesh = new THREE.InstancedMesh(buildBovineGeometry({}), hide, list.length);
      mesh.name = 'gully_life_buffalo';
      list.forEach((a, i) => { a.mesh = mesh; a.idx = i; a.y = 0; mesh.setMatrixAt(i, _m4.compose(_v.set(a.x, 0, a.z), _q.setFromEuler(_e.set(0, a.yaw, 0)), new THREE.Vector3(...a.s))); mesh.setColorAt(i, c.setHex(a.tint)); });
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.noAutoCollider = true;
      markFigure(mesh); group.add(mesh);
    }
    let pm = null;
    if (people.length) {
      pm = new THREE.InstancedMesh(new THREE.CapsuleGeometry(PEOPLE_R, PEOPLE_H - PEOPLE_R * 2, 4, 8), new THREE.MeshStandardMaterial({ roughness: 0.85 }), people.length);
      pm.name = 'ambient_life_gully_life_people'; pm.castShadow = true; pm.receiveShadow = true;
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
    info.people = people.length; info.colliders = colliders.length;
    console.log(`[gullyLife] placed ${info.placed.length}, skipped ${info.skipped.length}, ${people.length} people, ${colliders.length} colliders`);
  }

  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    if (prev) prev.apply(this, args);
    if (settlingReleased()) frames++; // load time: lazy builds wait for the opening view (docs/perf-2026-11-08.md)
    if (!built && lazyDue(frames, 40) && STATIC_COLLIDERS.length > 0) {
      built = true;
      try { build(); requestColliderRebuild(); } catch (err) { console.error('gullyLife build failed', err); }
    }
  };
  return { group };
}
