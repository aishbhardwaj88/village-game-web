import * as THREE from 'three';
import { signPageMaterial } from './signAtlasHub.js';
import { batchLiveMesh } from './placeBatch.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTiledMaterial } from './materials.js';
import { allRoadLines } from './mapRoads.js';
import { CHAURAHA } from './mapPlan.js';
import { loadKitModels } from './houseKit.js';
import { swapShared, oldHouseMaterial } from './stagingYard.js';
import { VILLAGE_HOUSES } from './villageHouses.js';
import { colliderBoxFromTransform, STATIC_COLLIDERS, staticBoxesNear, circleHitsAnyBox, requestColliderRebuild } from './collision.js';
import { batchLateGroup, batchPlaceModel, batchPeopleMesh, refreshPeopleMesh } from './placeBatch.js';
import { keepOnGround, markFigure, settleInstances, groundAt, settlingReleased, lazyDue } from './standOn.js';
import { createWideSignAtlas, mapFrontFaceToRow } from './signboards.js';

/**
 * Second pass of frontage along the MAIN ROAD (N arm = main_road, S arm = main_road_s, both sides, 8..150 m from the ring).
 * src/armFrontage.js lays the first row and stops at every obstacle; its skipped plots leave bare field gaps (docs/PARALLEL.md
 * main-road item). This module reads what armFrontage placed (window.__armFrontage.placed) and fills the GAPS: it walks each side
 * in 1.5 m steps and tries a kit house or an open shop in each free stretch, at the usual set-back (3.4 m from the carriageway edge,
 * so the 8 m carriageway and a verge stay clear) and, where a lane/collider blocks that, at 6 and 9 m (a second tier of houses set
 * back with a yard in front, still facing the road). Fronts face the road, per-house type / width / depth / turn / wall tint / wall
 * texture offset vary, and most houses carry an outside-the-house set (charpai + matka, cycle, pots, gobar cakes, washing).
 * Rejected if within 14.5 m of the zero milestone, on any road/lane, on a collider, near a VILLAGE_HOUSES house, dug or raised ground,
 * or within an armFrontage placement (docs/SPATIAL_SENSE.md sections 1, 3, 5).
 * Draw cost: kit houses go through placeBatch's shared per-material batches (distance-gated per 40 m segment), shops and sets are
 * world-baked library meshes batched late; the only own mesh is one signboard mesh. People are capsule stand-ins.
 * Library sets only (plaster, concrete, wood, metal, tin, jute, tarpaulin, terracotta). No brands, tobacco, alcohol or shrines.
 */
const ARM_LEN = 150, FIRST = 8;
const EDGE = 3.4; // carriageway edge to house front
const SHOP_EDGE = 2.6;
const SETBACKS = [0, 3.0, 6.0]; // extra set-back tried when the first tier is blocked
const SEG = 40, DRAW_DIST = 115, SHADOW_DIST = 45;
const PEOPLE_R = 0.32, PEOPLE_H = 1.7, TILE = 1.0;
const FOOT = { a: [3.3, -2.8, 2.8], b: [3.6, -2.8, 5.2], c: [3.6, -3.2, 4.2], d: [4.0, -6.2, 5.2], e: [3.6, -3.6, 4.4], f: [4.0, -4.4, 5.0] };
const TYPE_W = [['a', 0.16], ['b', 0.2], ['c', 0.24], ['d', 0.14], ['e', 0.14], ['f', 0.12]];
const PASTELS = [0xf4c7c3, 0xf2c9a0, 0xc7e6d2, 0xf1e6b8, 0xf6e7a0, 0xc4d5ea];
const MEN = [0xb8b0a0, 0x8a9aa8, 0xa89070, 0x9a8a9a, 0x7a8a6a, 0xc0a890, 0xd0c4a8];
const KID = [0xc8503a, 0x3a6a8a, 0xc8962a, 0x4a7a4a, 0x8a3a5a];
const WOMEN = [0xb04a5a, 0x3a5a8a, 0xc8962a, 0x8a4a7a];
const CROP = [0xb8402a, 0xc86a1a, 0x4a7a3a, 0x8a3a5a, 0xc8a020, 0x6a8a3a];
const WALLS = [0xe9dcc0, 0xd8dfcf, 0xd4dce0, 0xe4cfb0, 0xe2c9c0];
const AWN = [[0xb8503a, 0xe8dcc0], [0x3a6a8a, 0xe8dcc0], [0xc8962a, 0x8a3a2a], [0x4a7a4a, 0xe0d4b0]];
const SIGNS = {
  kirana: { hi: 'किराना स्टोर', en: 'General Store', bg: '#ece0c4', fg: '#5a1a14', border: '#7a2a1c' },
  tea: { hi: 'चाय की दुकान', en: 'Tea Shop', bg: '#e6dcc2', fg: '#1f2a4a', border: '#2a3a66' },
  cycle: { hi: 'साइकिल मरम्मत', en: 'Cycle Repair', bg: '#e9dfc6', fg: '#6e1a12', border: '#8a2a18' },
  tailor: { hi: 'दर्ज़ी', en: 'Tailor', bg: '#efe3c8', fg: '#16402a', border: '#1f5a3a' },
};
const ARMS = [['main_road', true, 'N'], ['main_road_s', false, 'S'], ['cross_road', true, 'W'], ['cross_road_e', false, 'E']]; // W + E (cross road) added 9 Nov

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
function bakedGeometry(src, m, tint, uvv) {
  const n = src.attributes.position.count;
  const g = new THREE.BufferGeometry();
  const copy = (name, size, fb) => {
    const a = src.attributes[name], f = new Float32Array(n * size);
    for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) f[i * size + k] = a ? (k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : a.getZ(i)) : fb;
    return new THREE.BufferAttribute(f, size);
  };
  g.setAttribute('position', copy('position', 3, 0));
  g.setAttribute('normal', copy('normal', 3, 0));
  const uvA = copy('uv', 2, 0);
  if (uvv) for (let i = 0; i < n; i++) uvA.setXY(i, uvA.getX(i) * uvv.s + uvv.u, uvA.getY(i) * uvv.s + uvv.v);
  g.setAttribute('uv', uvA);
  const col = copy('color', 3, 1);
  for (let i = 0; i < n; i++) col.setXYZ(i, col.getX(i) * tint.r, col.getY(i) * tint.g, col.getZ(i) * tint.b);
  g.setAttribute('color', col);
  if (src.index) g.setIndex(Array.from(src.index.array)); else g.setIndex(Array.from({ length: n }, (_, i) => i));
  g.applyMatrix4(m);
  return g;
}

export function createMainRoadFrontage(scene) {
  const group = new THREE.Group(); group.name = 'main_road_frontage';
  const houseGroup = new THREE.Group(); houseGroup.name = 'main_road_frontage_houses';
  scene.add(group); scene.add(houseGroup);
  batchLateGroup(group, group.name);
  const info = { placed: [], skipped: 0, houses: 0, shops: 0, sets: 0, drawCalls: 0 };
  if (typeof window !== 'undefined') window.__mainRoadFrontage = info;
  if (typeof location !== 'undefined' && /[?&]nomrf=1/.test(location.search)) return { group, update() {} };
  let built = false, frames = 0, models = null;
  const clusters = [];
  let lx = 1e9, lz = 1e9;
  if (!(typeof location !== 'undefined' && /[?&]nokit=1/.test(location.search))) {
    loadKitModels().then((m) => {
      for (const mod of Object.values(m)) { mod.updateWorldMatrix(true, true); mod.traverse((o) => { if (o.isMesh) swapShared(o); }); }
      models = m;
    }).catch((err) => console.warn('main road frontage kit houses did not load', err));
  } else models = {};

  function build() {
    const lines = allRoadLines();
    const rand = rng(9112031);
    const by = new Map();
    const colliders = [], people = [], signs = [];
    let frame = null;
    // Every placed part at body height (0.3-1.6 m) that the unit's hand-sized collider does not already cover gets its own
    // footprint collider when the unit ends (flushUnit), so a pole, wheel, matka or drum sticking out of a set can never be
    // walked through (tools/collision-test.js part 5). Parts and rects are kept in the unit's local frame.
    let unitParts = [], unitCols = [];
    const flushUnit = () => {
      if (frame) for (const [x0, x1, z0, z1] of unitParts) {
        if (unitCols.some(([a0, a1, b0, b1]) => x0 >= a0 - 0.05 && x1 <= a1 + 0.05 && z0 >= b0 - 0.05 && z1 <= b1 + 0.05)) continue;
        const w = Math.max(0.12, x1 - x0), d = Math.max(0.12, z1 - z0);
        colliders.push(colliderBoxFromTransform(w, d, new THREE.Matrix4().copy(frame).multiply(new THREE.Matrix4().makeTranslation((x0 + x1) / 2, 0, (z0 + z1) / 2))));
        unitCols.push([x0, x1, z0, z1]);
      }
      unitParts = []; unitCols = [];
    };
    const begin = (x, z, yaw) => { flushUnit(); frame = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), _one); frame.yaw = yaw; };
    const place = (g, x, y, z, ry, set, tint) => {
      g.applyMatrix4(_m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _one));
      g.computeBoundingBox();
      const bb = g.boundingBox;
      if (bb.max.y > 0.3 && bb.min.y < 1.6) unitParts.push([bb.min.x, bb.max.x, bb.min.z, bb.max.z]);
      g.applyMatrix4(frame);
      colour(g, tint);
      if (!by.has(set)) by.set(set, []);
      by.get(set).push(g);
    };
    const prep = (g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); g.computeVertexNormals(); metreUV(g); return g; };
    const box = (set, w, h, d, x, y, z, tint, ry = 0) => place(prep(new THREE.BoxGeometry(w, h, d)), x, y, z, ry, set, tint);
    const cyl = (set, rt, rb, h, x, y, z, tint, rz = 0, seg = 8) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg); if (rz) g.rotateZ(rz); place(prep(g), x, y, z, 0, set, tint); };
    const ring = (set, r, tube, x, y, z, ry, tint) => place(prep(new THREE.TorusGeometry(r, tube, 5, 16)), x, y, z, ry, set, tint);
    const blob = (set, r, sy, x, y, z, ry, tint) => { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, sy, 1); place(prep(g), x, y, z, ry, set, tint); };
    const wl = (x, y, z) => _v.set(x, y, z).applyMatrix4(frame).clone();
    const person = (x, z, face, seated, tint, lift = 0, kid = false) => {
      const w = wl(x, 0, z);
      people.push({ x: w.x, z: w.z, y: lift, ry: frame.yaw + face, sy: kid ? 0.62 : seated ? 0.6 + rand() * 0.05 : 0.95 + rand() * 0.1, sx: kid ? 0.78 : seated ? 1.15 : 1, tint });
    };
    const col = (w, d, x, z) => unitCols.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]) && colliders.push(colliderBoxFromTransform(w, d, new THREE.Matrix4().copy(frame).multiply(new THREE.Matrix4().makeTranslation(x, 0, z))));
    const pick = (a) => a[Math.floor(rand() * a.length)];
    const frameM = (x, y, z) => new THREE.Matrix4().copy(frame).multiply(new THREE.Matrix4().makeTranslation(x, y, z));

    // ---------------------------------------------------------------- open shops (local +z toward the road)
    const shop = (kind) => {
      const W = 3.2 + (rand() - 0.5) * 0.6, D = 2.2, H = 2.5, wall = pick(WALLS), [a1, a2] = pick(AWN), z0 = -0.6;
      const zf = z0 + D / 2, zb = z0 - D / 2;
      box('concrete', W + 0.2, 0.2, D + 0.2, 0, 0.1, z0, 0xb0a898);
      box('plaster', W, H, 0.18, 0, H / 2 + 0.2, zb + 0.09, wall);
      box('plaster', 0.18, H, D, -W / 2 + 0.09, H / 2 + 0.2, z0, wall); box('plaster', 0.18, H, D, W / 2 - 0.09, H / 2 + 0.2, z0, wall);
      box('plaster', W, 0.45, 0.18, 0, H + 0.2 - 0.22, zf - 0.09, wall);
      box('metal', W - 0.5, 0.22, 0.14, 0, H - 0.2, zf - 0.02, 0x6a6a64);
      for (const s of [-1, 1]) box('metal', 0.05, H - 0.4, 0.05, s * (W / 2 - 0.3), (H - 0.4) / 2 + 0.2, zf - 0.04, 0x5a5a54);
      const roof = prep(new THREE.BoxGeometry(W + 0.5, 0.06, D + 0.6)); roof.rotateX(0.07);
      place(roof, 0, H + 0.5, z0 + 0.1, 0, 'tin', 0xa8aca8);
      for (const y of [0.9, 1.4, 1.9]) box('wood', W - 0.5, 0.04, 0.3, 0, y, zb + 0.35, 0x7a5a3c);
      box('wood', W - 0.6, 0.06, 0.55, 0, 0.88, zf + 0.25, 0x8a6a48); box('wood', W - 0.6, 0.66, 0.5, 0, 0.55, zf + 0.25, 0x7a5a3c);
      if (kind === 'cycle') {
        for (let i = 0; i < 3; i++) ring('metal', 0.16 + i * 0.02, 0.02, -1.2 + i * 0.1, 1.0 + i * 0.2, zb + 0.2, 0, 0x2a2a28);
        for (const x of [-0.5, 0.5]) ring('metal', 0.34, 0.016, x, 0.36, zf + 0.9, Math.PI / 2, 0x3a3a38);
        box('metal', 1.0, 0.03, 0.03, 0, 0.55, zf + 0.9, 0x8a2a1a);
        box('wood', 0.3, 0.3, 0.3, 1.0, 0.15, zf + 0.7, 0x7a5a3c);
        person(1.0, zf + 0.7, Math.PI * 0.85, true, pick(MEN), 0.3);
      } else if (kind === 'tea') {
        for (let i = 0; i < 6; i++) box('metal', 0.08, 0.09, 0.08, -1.1 + i * 0.22, 0.97, zf + 0.15, 0xc4c8c8);
        cyl('metal', 0.16, 0.2, 0.3, -0.6, 1.07, zf + 0.4, 0x8c8c86, 0, 10);
        for (let i = 0; i < 5; i++) box('terracotta', 0.14, 0.14, 0.14, -1.2 + i * 0.5, 1.0 + (i % 2) * 0.5, zb + 0.35, 0xb87858);
        box('wood', 0.9, 0.42, 0.34, 0.9, 0.21, zf + 1.0, 0x8a6a48); // low bench
        person(0.9, zf + 1.0, Math.PI, true, pick(MEN), 0.42);
      } else {
        for (let i = 0; i < 6; i++) box('tarpaulin', 0.3, 0.2, 0.2, -1.2 + i * 0.45, [0.99, 1.49, 1.99][i % 3] + 0.1, zb + 0.35, pick(CROP));
        for (let i = 0; i < 3; i++) box('jute', 0.5, 0.2, 0.4, -1.0 + i * 0.7, 0.3, zb + 0.5, pick([0xd0b890, 0xc8a878, 0xb89a70]), (rand() - 0.5) * 0.3);
      }
      person(0.4, zb + 0.9, 0, false, pick(MEN), 0.2);
      person(-0.4, zf + 1.1, Math.PI + 0.25, false, pick(WOMEN));
      for (const s of [-1, 1]) box('wood', 0.06, 2.2, 0.06, s * (W / 2 - 0.1), 1.1, zf + 0.95, 0x7a5a3c);
      for (let i = 0; i < 6; i++) { const g = prep(new THREE.BoxGeometry(W / 6, 0.03, 1.1)); g.rotateX(0.18); place(g, -W / 2 + W / 12 + i * (W / 6), 2.28, zf + 0.5, 0, 'tarpaulin', i % 2 ? a1 : a2); }
      signs.push({ key: kind, m: frameM(0, H + 0.2 + 0.28, zf + 0.04), w: 1.7 });
      col(W + 0.3, D + 0.3, 0, z0);
    };

    // ---------------------------------------------------------------- outside-the-house sets (+z toward the road)
    const SETS = {
      charpai() {
        const L = 1.9, Wd = 0.95, H = 0.42;
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.07, H, 0.07, sx * (L / 2 - 0.04), H / 2, sz * (Wd / 2 - 0.04), 0x7a5a3c);
        for (const s of [-1, 1]) { box('wood', L, 0.06, 0.06, 0, H, s * (Wd / 2 - 0.04), 0x8a6a48); box('wood', 0.06, 0.06, Wd, s * (L / 2 - 0.04), H, 0, 0x8a6a48); }
        box('jute', L - 0.14, 0.025, Wd - 0.14, 0, H + 0.005, 0, pick([0xc4a878, 0xb89868, 0xc8b088]));
        cyl('terracotta', 0.2, 0.15, 0.4, -1.4, 0.7, -0.3, 0xb87858, 0, 10);
        for (const a of [0, 2.1, 4.2]) box('wood', 0.04, 0.5, 0.04, -1.4 + Math.cos(a) * 0.2, 0.25, -0.3 + Math.sin(a) * 0.2, 0x7a5a3c);
        const n = 1 + Math.floor(rand() * 3);
        for (let i = 0; i < n; i++) person(-0.5 + i * 0.6, (i % 2 ? 0.05 : -0.05), (rand() - 0.5) * 1.2 + (i % 2 ? Math.PI : 0), true, pick(MEN), H + 0.03);
        col(2.0, 1.05, 0, 0);
      },
      cycle() {
        for (const x of [-0.5, 0.5]) ring('metal', 0.34, 0.016, x, 0.36, 0, Math.PI / 2, 0x3a3a38);
        box('metal', 1.0, 0.03, 0.03, 0, 0.55, 0, pick([0x8a2a1a, 0x2a3a5a, 0x2a2a28])); box('metal', 0.03, 0.4, 0.03, -0.1, 0.62, 0, 0x2a2a28);
        box('wood', 0.2, 0.05, 0.1, -0.15, 0.85, 0, 0x2a2a28); box('metal', 0.4, 0.03, 0.03, 0.5, 0.82, 0, 0x6a6a64);
        cyl('terracotta', 0.2, 0.15, 0.4, 1.1, 0.2, 0.3, 0xb87858, 0, 10);
        col(1.6, 0.4, 0, 0);
      },
      pots() {
        box('wood', 1.6, 0.08, 0.5, 0, 0.04, 0, 0x6e5238);
        for (let i = 0; i < 3; i++) cyl('terracotta', 0.2, 0.15, 0.4, -0.5 + i * 0.5, 0.3, 0, pick([0xb87858, 0xa86a4a, 0xc08460]), 0, 10);
        cyl('terracotta', 0.18, 0.13, 0.36, -0.25, 0.68, 0, 0xb87858, 0, 10); cyl('terracotta', 0.18, 0.13, 0.36, 0.25, 0.68, 0, 0xa86a4a, 0, 10);
        cyl('metal', 0.22, 0.22, 0.6, 1.2, 0.3, 0.1, 0xb8bcbc, 0, 12);
        col(2.4, 0.7, 0.3, 0);
      },
      gobar() {
        for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - (r > 1 ? 1 : 0); i++) {
          const g = new THREE.CylinderGeometry(0.17, 0.17, 0.05, 10); place(prep(g), -0.9 + i * 0.36 + (r % 2) * 0.12, 0.3 + r * 0.06, 0.05, rand() * 3, 'concrete', pick([0x6a5a42, 0x7a6a50, 0x5e4e38]));
        }
        box('wood', 2.0, 0.28, 0.06, 0, 0.14, -0.2, 0x6e5238);
        blob('concrete', 0.38, 0.55, 1.1, 0.12, 0.5, 0, 0x3e3224);
        col(2.2, 0.8, 0.1, 0.1);
      },
      washing() {
        cyl('metal', 0.34, 0.28, 0.14, 0, 0.07, 0.75, 0x9a9a92, 0, 14);
        for (let i = 0; i < 4; i++) cyl('metal', 0.1 + (i % 2) * 0.03, 0.1, 0.14, -0.9 + i * 0.22, 0.07, 0.95 + (i % 2) * 0.2, 0xc8a24a, 0, 10);
        for (const x of [-1.5, 1.5]) cyl('wood', 0.04, 0.04, 2.0, x, 1.0, -0.7, 0x7a5a3c, 0, 6);
        box('jute', 3.0, 0.015, 0.015, 0, 1.95, -0.7, 0xc8b898);
        for (let i = 0; i < 4; i++) box('jute', 0.45 + rand() * 0.2, 0.7 + rand() * 0.3, 0.015, -1.1 + i * 0.7, 1.55, -0.7, pick([0xc8503a, 0xe8e0d0, 0x3a6a8a, 0xc8962a, 0xe8c8d0]), (rand() - 0.5) * 0.15);
        person(0, -0.15, 0.2, true, pick(WOMEN), 0.0);
        if (rand() < 0.6) person(-0.9, -0.3, 0.6, true, pick(KID), 0.0, true);
        col(0.9, 0.9, 0, 0.5); col(3.0, 0.3, 0, -0.7);
      },
    };
    const SET_W = [['charpai', 0.3], ['pots', 0.2], ['gobar', 0.15], ['washing', 0.2], ['cycle', 0.15]];
    const pickSet = () => { let t = rand(), a = 0; for (const [k, w] of SET_W) { a += w; if (t < a) return k; } return 'charpai'; };

    // ---------------------------------------------------------------- site search
    const avoid = VILLAGE_HOUSES.map((h) => [h.x, h.z]);
    const first = ((typeof window !== 'undefined' && window.__armFrontage && window.__armFrontage.placed) || []).map((p) => [p.x, p.z]);
    // precomputed per-segment boxes: a segment whose box (grown by the threshold) misses the point cannot be within the threshold
    const rcSegs = lines.filter((l) => l.id !== 'chauraha_ring').map((l) => {
      const segs = [];
      for (let i = 1; i < l.pts.length; i++) { const [ax, az] = l.pts[i - 1], [bx, bz] = l.pts[i]; segs.push([ax, az, bx, bz, Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz)]); }
      return { w2: l.w / 2, segs };
    });
    const roadClear = (x, z, m) => {
      for (const l of rcSegs) {
        const th = l.w2 + m;
        for (const s of l.segs) {
          if (x < s[4] - th || x > s[5] + th || z < s[6] - th || z > s[7] + th) continue;
          const dx = s[2] - s[0], dz = s[3] - s[1], L = dx * dx + dz * dz || 1;
          const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / L));
          if (!(Math.hypot(s[0] + t * dx - x, s[1] + t * dz - z) > th)) return false;
        }
      }
      return true;
    };
    const rectPts = (R) => {
      const c = Math.cos(R.yaw), s = Math.sin(R.yaw), out = [];
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
        const a = R.x0 + (R.x1 - R.x0) * i / 4, b = R.z0 + (R.z1 - R.z0) * j / 4;
        out.push([R.x + a * c + b * s, R.z - a * s + b * c]);
      }
      return out;
    };
    const inRect = (R, x, z, pad) => {
      const c = Math.cos(R.yaw), s = Math.sin(R.yaw), dx = x - R.x, dz = z - R.z;
      const a = dx * c - dz * s, b = dx * s + dz * c;
      return a > R.x0 - pad && a < R.x1 + pad && b > R.z0 - pad && b < R.z1 + pad;
    };
    const taken = [];
    const why = info.why = {}; const fail = (k) => { why[k] = (why[k] || 0) + 1; return false; };
    const siteOk = (R) => {
      for (const [x, z] of rectPts(R)) {
        if (Math.hypot(x - CHAURAHA.x, z - CHAURAHA.z) < 14.5) return fail(1);
        if (!roadClear(x, z, 0.15)) return fail(2);
        if (avoid.some(([ax, az]) => Math.hypot(ax - x, az - z) < 7)) return fail(3);
        if (first.some(([ax, az]) => Math.hypot(ax - x, az - z) < 4.6)) return fail(4); // armFrontage's plots (centres; footprints are ~7 m wide)
        if (circleHitsAnyBox({ x, z }, 1.0, staticBoxesNear(x, z, 2.2))) return fail(5);
        if (Math.abs(groundAt(scene, x, z, 0)) > 0.12) return fail(6);
        if (taken.some((t) => inRect(t, x, z, 0.5))) return fail(7);
      }
      for (const t of taken) for (const [x, z] of rectPts(t)) if (inRect(R, x, z, 0.5)) return fail(8);
      return true;
    };

    const houses = [];
    ARMS.forEach(([id, rev, tag]) => {
      const line = lines.find((l) => l.id === id);
      if (!line) return;
      const pl = polyline(rev ? [...line.pts].reverse() : line.pts), hw = line.w / 2;
      for (const side of [1, -1]) {
        let s = FIRST;
        const smax = Math.min(ARM_LEN, pl.len - 4);
        while (s < smax) {
          const isShop = s < 80 && rand() < 0.3;
          let spec;
          if (isShop) {
            const hx = 1.8 + rand() * 0.15;
            spec = { kind: pick(['tea', 'kirana', 'cycle', 'tailor']), shop: true, hw: hx, x0: -hx, x1: hx, z0: -1.8, z1: SHOP_EDGE - 0.4, off: hw + SHOP_EDGE };
          } else {
            let t = 'c', r = rand(), a = 0;
            for (const [k, w] of TYPE_W) { a += w; if (r < a) { t = k; break; } }
            const [fhw, fz0, fz1] = FOOT[t], sx = 0.88 + rand() * 0.27, sz = 0.85 + rand() * 0.15;
            spec = { kind: t, shop: false, sx, sz, hw: fhw * sx, x0: -fhw * sx, x1: fhw * sx, z0: fz0 * sz, z1: fz1 * sz + EDGE - 0.4, off: hw + EDGE + fz1 * sz, fz1: fz1 * sz };
          }
          let ok = false;
          outer: for (const extra of spec.shop ? [0] : SETBACKS) {
            for (const ds of [0, 1.5, 3, 4.5]) {
              const f = pl.at(s + spec.hw + ds);
              const yaw = Math.atan2(-f.nx * side, -f.nz * side) + (rand() - 0.5) * 0.14;
              const off = spec.off + extra;
              const R = { x: f.x + f.nx * side * off, z: f.z + f.nz * side * off, yaw, x0: spec.x0, x1: spec.x1, z0: spec.z0, z1: spec.z1 };
              if (!siteOk(R)) continue;
              taken.push(R); ok = true;
              info.placed.push({ arm: tag, side, kind: (spec.shop ? 'shop:' : 'house:') + spec.kind, s: +(s + ds).toFixed(0), back: extra, x: +R.x.toFixed(1), z: +R.z.toFixed(1) });
              if (spec.shop) { begin(R.x, R.z, yaw); shop(spec.kind); info.shops++; }
              else {
                houses.push({ t: spec.kind, x: R.x, z: R.z, ry: yaw, sx: spec.sx, sz: spec.sz, seg: `${tag}${side > 0 ? 'a' : 'b'}${Math.floor((s + ds) / SEG)}` });
                info.houses++;
                if (rand() < 0.85) {
                  const c = Math.cos(yaw), sn = Math.sin(yaw);
                  const lat = (rand() - 0.5) * Math.max(0.2, spec.hw * 0.7), dz = spec.fz1 + 1.55;
                  begin(R.x + lat * c + dz * sn, R.z - lat * sn + dz * c, yaw + (rand() - 0.5) * 0.15);
                  SETS[pickSet()](); info.sets++;
                }
              }
              s += ds + 2 * spec.hw + 0.6 + rand() * 1.6;
              break outer;
            }
          }
          if (!ok) { info.skipped++; s += 3; }
        }
      }
    });

    flushUnit();
    // ---------------------------------------------------------------- meshes
    for (const [set, list] of by) {
      const m = new THREE.Mesh(mergeGeometries(list), oldHouseMaterial(set) || getTiledMaterial(set, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
      m.name = `main_road_frontage_${set}`; m.castShadow = true; m.receiveShadow = true; m.userData.noAutoCollider = true;
      group.add(m);
    }
    const holder = group.children.find((o) => o.name.endsWith('_wood')) || group.children[0];
    if (holder) holder.userData.colliderBoxes = colliders;
    if (signs.length) {
      const keys = [...new Set(signs.map((s) => s.key))];
      const atlas = createWideSignAtlas(keys.map((k) => SIGNS[k]));
      const boards = signs.map((sg) => {
        const g = new THREE.BoxGeometry(sg.w, sg.w / 4.41, 0.04);
        mapFrontFaceToRow(g, keys.indexOf(sg.key), keys.length);
        g.applyMatrix4(sg.m);
        return g;
      });
      const smGeo = mergeGeometries(boards);
      const sm = new THREE.Mesh(smGeo, signPageMaterial(atlas, smGeo));
      sm.name = 'main_road_frontage_signs'; sm.castShadow = true; sm.userData.noAutoCollider = true;
      batchLiveMesh(sm, { static: true });
      group.add(sm);
    }

    // ---------------------------------------------------------------- kit houses, merged per material per 40 m segment (through placeBatch)
    const white = new THREE.Color(1, 1, 1);
    const segs = new Map();
    houses.forEach((h) => { if (!segs.has(h.seg)) segs.set(h.seg, []); segs.get(h.seg).push(h); });
    const pm4 = new THREE.Matrix4(), q = new THREE.Quaternion(), full = new THREE.Matrix4();
    for (const [key, list] of segs) {
      const byMat = new Map();
      for (const h of list) {
        const src = models[h.t];
        if (!src) continue;
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, h.ry);
        pm4.compose(new THREE.Vector3(h.x, 0, h.z), q, new THREE.Vector3(h.sx, 1, h.sz));
        const wear = 0.9 + 0.12 * rand();
        const wall = 'cde'.includes(h.t)
          ? new THREE.Color(pick(PASTELS)).lerp(white, 0.5 + rand() * 0.15)
          : new THREE.Color(1, 0.96 + 0.06 * rand(), 0.92 + 0.09 * rand());
        const uvv = { s: 0.75 + 0.8 * rand(), u: rand() * 4, v: rand() * 4 };
        src.traverse((mesh) => {
          if (!mesh.isMesh) return;
          const isWall = mesh.material.name === 'hb_main';
          const tint = (isWall ? wall.clone() : new THREE.Color(1, 1, 1)).multiplyScalar(wear);
          full.multiplyMatrices(pm4, mesh.matrixWorld);
          const l = byMat.get(mesh.material) || [];
          l.push(bakedGeometry(mesh.geometry, full, tint, isWall || mesh.material.name === 'hb_brick' ? uvv : null));
          byMat.set(mesh.material, l);
        });
      }
      const root = new THREE.Group(); root.name = `mrf_houses_${key}`;
      for (const [mat, geos] of byMat) {
        const merged = mergeGeometries(geos, false);
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, mat);
        mesh.name = `mrf_houses_${key}_${mat.name}`; mesh.castShadow = false; mesh.receiveShadow = true; mesh.userData.mergedStatic = true;
        root.add(mesh);
      }
      root.visible = false;
      houseGroup.add(root);
      for (const m of root.children) if (!m.material.userData.placeBatchable && !m.material.transparent && m.material.name !== 'hb_decal' && m.material.name !== 'hb_flag' && !m.material.onBeforeCompile.toString().includes('vWxyz')) m.material.userData.placeBatchable = true;
      batchPlaceModel(root, `mrf_houses_${key}`);
      clusters.push({ pts: list.map((h) => [h.x, h.z]), root, shadow: false });
    }
    lx = 1e9;

    // ---------------------------------------------------------------- people
    const c = new THREE.Color();
    let pmesh = null;
    if (people.length) {
      pmesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(PEOPLE_R, PEOPLE_H - PEOPLE_R * 2, 4, 8), new THREE.MeshStandardMaterial({ roughness: 0.85 }), people.length);
      pmesh.name = 'ambient_life_main_road_frontage_people'; pmesh.castShadow = true; pmesh.receiveShadow = true;
      people.forEach((p, i) => {
        pmesh.setMatrixAt(i, _m4.compose(_v.set(p.x, p.y + (PEOPLE_H * p.sy) / 2, p.z), _q.setFromEuler(_e.set(0, p.ry, 0)), new THREE.Vector3(p.sx, p.sy, p.sx)));
        pmesh.setColorAt(i, c.setHex(p.tint));
      });
      pmesh.instanceMatrix.needsUpdate = true; if (pmesh.instanceColor) pmesh.instanceColor.needsUpdate = true;
      scene.add(pmesh); batchPeopleMesh(pmesh); markFigure(pmesh);
    }
    keepOnGround(group, (sc) => { if (pmesh) settleInstances(sc, pmesh, refreshPeopleMesh); });
    group.traverse((o) => { if (o.isMesh) info.drawCalls++; });
    info.people = people.length; info.colliders = colliders.length;
    console.log(`[mainRoadFrontage] placed ${info.placed.length} (${info.houses} houses, ${info.shops} shops, ${info.sets} sets), skipped ${info.skipped}, ${people.length} people`);
  }

  function update(px, pz) {
    if (Math.abs(px - lx) + Math.abs(pz - lz) < 3) return;
    lx = px; lz = pz;
    let changed = false;
    for (const c of clusters) {
      let d = 1e9;
      for (const [x, z] of c.pts) d = Math.min(d, Math.hypot(px - x, pz - z));
      const vis = d < DRAW_DIST;
      if (vis !== c.root.visible) { c.root.visible = vis; changed = true; }
      const sh = d < SHADOW_DIST;
      if (sh !== c.shadow) { c.shadow = sh; for (const m of c.root.children) m.castShadow = sh && /hb_c?main|hb_brick/.test(m.material.name); }
    }
    if (changed) requestColliderRebuild();
  }

  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (renderer, sc, camera, ...rest) {
    if (prev) prev.call(this, renderer, sc, camera, ...rest);
    if (settlingReleased()) frames++;
    const armDone = typeof window === 'undefined' || (window.__armFrontage && window.__armFrontage.placed.length > 0) || lazyDue(frames, 600);
    if (!built && lazyDue(frames, 60) && STATIC_COLLIDERS.length > 0 && models && armDone) {
      built = true;
      try { const t0 = performance.now(); build(); info.buildMs = Math.round(performance.now() - t0); requestColliderRebuild(); } catch (err) { console.error('mainRoadFrontage build failed', err); }
    }
    if (built && camera && camera.position) update(camera.position.x, camera.position.z);
  };
  return { group, update };
}
