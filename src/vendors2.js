import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHORS, localPt } from './anchors.js';
import { getTiledMaterial, texturedBox } from './materials.js';
import { colliderBoxFromTransform, STATIC_COLLIDERS, staticBoxesNear, circleHitsAnyBox, requestColliderRebuild } from './collision.js';
import { createWideSignAtlas, mapFrontFaceToRow } from './signboards.js';
import { batchLateGroup, batchPeopleMesh, refreshPeopleMesh } from './placeBatch.js';
import { keepOnGround, markFigure, settleInstances } from './standOn.js';
import { settlingReleased, lazyDue } from './standOn.js';

/**
 * Street vendors, second set: a cabin kiosk (paan shop: mirror, film posters, a bulb, glass jars of sweets; no tobacco of any kind),
 * a sugarcane-juice cart with a two-roller hand crusher, a travelling knife-grinder's pedal stone. All hard-surface, built from the library
 * wood and metal sets (vertex-tinted), merged per set. Draw calls: wood + metal + one sign mesh + one capsule InstancedMesh = 4.
 * Sites are found at run time on clear ground near the anchor (the map is being replaced, so only anchor ids are named here).
 * People are capsule placeholders. Local frame: +z is the front (toward the street).
 */
const CLEAR = 2.5;
const TILE = { wood: 1.0, metal: 1.0 };
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const jit = (c, i, amt = 0.08) => new THREE.Color(c).multiplyScalar(1 + (rnd(i) - 0.5) * 2 * amt).getHex();
const SPOTS = [
  { kind: 'paan', anchor: 'chowk', lx: 12, lz: 9, ry: -1.2 },
  { kind: 'cane', anchor: 'halwai', lx: 9, lz: 10, ry: 0.5 },
  { kind: 'grinder', anchor: 'bazaar', lx: 14, lz: 13, ry: 3.0 },
];
const SIGNS = [{ hi: 'पान भंडार', en: 'Paan Bhandar', bg: '#e6dcc4', fg: '#1f2a4a', border: '#2a3a66' }];

function tintGeo(geo, tint) {
  const g = geo.index ? geo.toNonIndexed() : geo, n = g.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color(tint);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function planarUV(geo, axis, tile) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (axis === 'y') uv.setXY(i, x / tile, z / tile); else if (axis === 'z') uv.setXY(i, x / tile, y / tile); else uv.setXY(i, z / tile, y / tile); }
  return geo;
}

class Site {
  constructor(site, by) { this.site = site; this.by = by; this.people = []; }
  add(set, geo, lx, ly, lz, yaw = 0, roll = 0, pitch = 0) {
    if (pitch) geo.rotateX(pitch); if (roll) geo.rotateZ(roll); if (yaw) geo.rotateY(yaw);
    geo.translate(lx, ly, lz); geo.rotateY(this.site.ry); geo.translate(this.site.x, 0, this.site.z);
    this.by[set].push(geo);
  }
  box(set, w, h, d, lx, ly, lz, tint, yaw = 0, roll = 0, pitch = 0) { this.add(set, texturedBox(w, h, d, set, { tileSize: TILE[set], tint }).geometry, lx, ly, lz, yaw, roll, pitch); }
  cyl(set, rt, rb, h, seg, lx, ly, lz, tint, roll = 0, pitch = 0) {
    this.add(set, tintGeo(planarUV(new THREE.CylinderGeometry(rt, rb, h, seg), 'x', 1), tint), lx, ly, lz, 0, roll, pitch);
  }
  rod(set, r, a, b, tint, seg = 6) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    const g = planarUV(new THREE.CylinderGeometry(r, r, L, seg, 1), 'x', 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
    const m = A.add(B).multiplyScalar(0.5);
    this.add(set, tintGeo(g, tint), m.x, m.y, m.z);
  }
  wheel(r, lx, lz, seed) {
    this.add('metal', tintGeo(planarUV(new THREE.TorusGeometry(r - 0.02, 0.02, 5, 20), 'z', 1), jit(0x2c2a28, seed)), lx, r, lz, 0, 0, 0);
    for (let k = 0; k < 8; k++) this.box('metal', 0.006, 2 * (r - 0.04), 0.006, lx, r, lz, 0x9a968c, Math.PI / 2, (k / 8) * Math.PI);
    this.cyl('metal', 0.03, 0.03, 0.08, 8, lx, r, lz, 0x5a5650, Math.PI / 2);
  }
  person(lx, lz, h, yaw, tint, sit = 0) { this.people.push({ lx, lz, h, yaw, tint, sit }); }
}

function buildPaan(s, seed) {
  const W = 1.7, D = 1.5, H = 2.3, cz = 0;
  const body = jit(0x3f7a6a, seed, 0.05), trim = jit(0x8a3a2a, seed + 1, 0.05);
  s.box('wood', W + 0.2, 0.15, D + 0.2, 0, 0.075, cz, 0x8a867c); // plinth
  s.box('wood', W, 0.9, D, 0, 0.6, cz, body); // lower body
  s.box('wood', 0.06, 1.0, D, -W / 2 + 0.03, 1.55, cz, body); // side posts / back
  s.box('wood', 0.06, 1.0, D, W / 2 - 0.03, 1.55, cz, body);
  s.box('wood', W, 1.0, 0.06, 0, 1.55, cz - D / 2 + 0.03, jit(body, 3, 0.05));
  s.box('wood', W + 0.2, 0.06, 0.4, 0, 1.12, cz + D / 2 + 0.1, trim); // counter shelf
  s.box('wood', W + 0.1, 0.05, 0.06, 0, 2.05, cz + D / 2 - 0.02, trim); // lintel
  s.box('metal', W + 0.5, 0.04, D + 0.6, 0, H + 0.05, cz + 0.1, jit(0x8a8a86, seed, 0.1), 0, 0, -0.1); // tin roof
  s.box('metal', W + 0.5, 0.06, 0.04, 0, H - 0.01, cz + D / 2 + 0.38, 0x6a6a66);
  // back wall: a mirror in a wooden frame, three film posters
  s.box('wood', 0.8, 0.55, 0.03, 0.2, 1.65, cz - D / 2 + 0.07, 0x4a3022);
  s.box('metal', 0.72, 0.47, 0.01, 0.2, 1.65, cz - D / 2 + 0.09, 0xcfd6d6);
  [[0xc23a2a, -0.55], [0xd8a02a, -0.55], [0x2a5a9a, 0.78]].forEach(([c, x], i) => {
    s.box('wood', 0.3, 0.42, 0.01, x, i === 1 ? 1.2 : 1.7, cz - D / 2 + 0.07, jit(c, seed + i, 0.1));
    s.box('wood', 0.2, 0.12, 0.012, x, i === 1 ? 1.1 : 1.8, cz - D / 2 + 0.075, 0xe8dcb4);
  });
  // glass jars of sweets on the counter and a shelf (metal, lidded)
  const jarCols = [0xd89a3a, 0xc85a4a, 0xe8d8a0, 0xb8884a];
  for (let i = 0; i < 6; i++) {
    const x = -0.68 + i * 0.27;
    s.cyl('metal', 0.075, 0.075, 0.2, 10, x, 1.25, cz + D / 2 + 0.1, jit(jarCols[i % 4], seed + i, 0.1));
    s.cyl('metal', 0.08, 0.08, 0.025, 10, x, 1.37, cz + D / 2 + 0.1, 0xb8b4a8);
  }
  s.box('wood', W - 0.1, 0.03, 0.2, 0, 1.45, cz - D / 2 + 0.17, 0x5a3a26);
  for (let i = 0; i < 5; i++) s.cyl('metal', 0.07, 0.07, 0.18, 10, -0.62 + i * 0.3, 1.56, cz - D / 2 + 0.17, jit(jarCols[(i + 1) % 4], seed + 9 + i, 0.1));
  // a bare bulb on its flex under the roof, and a hanging string of glass tumblers
  s.rod('metal', 0.004, [0.4, H - 0.05, cz + 0.5], [0.4, 1.95, cz + 0.5], 0x1a1a1a, 4);
  s.cyl('metal', 0.05, 0.03, 0.1, 8, 0.4, 1.9, cz + 0.5, 0xf4e4a0);
  s.cyl('metal', 0.1, 0.1, 0.03, 8, 0.4, 1.5, cz + D / 2 + 0.1, 0xb8b0a0);
  s.person(0, cz - 0.2, 1.6, 0, 0x7a5a3a, 1);
  s.person(-0.5, cz + D / 2 + 0.9, 1.65, Math.PI, 0x4a6a8a);
  s.person(0.5, cz + D / 2 + 1.0, 1.45, Math.PI - 0.3, 0xa04a4a);
  return { w: W + 0.4, d: D + 0.6, z: 0, sign: { y: 2.28 + 0.0, z: cz + D / 2 + 0.3, w: 1.4 } };
}

function buildCane(s, seed) {
  // thela 1.8 x 0.9 m on two spoked wheels, hand-cranked two-roller crusher, cane stalks leaning, tumblers, an ice box
  s.box('wood', 1.8, 0.05, 0.95, 0, 0.82, 0, jit(0x6a4a30, seed, 0.1));
  for (const sx of [-0.85, 0.85]) for (const sz of [-0.4, 0.4]) s.box('wood', 0.05, 0.8, 0.05, sx, 0.4, sz, jit(0x5a3e28, sx * 7 + sz * 3, 0.1));
  s.box('wood', 1.8, 0.06, 0.05, 0, 0.5, 0.4, 0x5a3e28); s.box('wood', 1.8, 0.06, 0.05, 0, 0.5, -0.4, 0x5a3e28);
  s.wheel(0.4, -0.2, 0.62, seed); s.wheel(0.4, -0.2, -0.62, seed + 3);
  s.rod('wood', 0.025, [0.9, 0.8, -0.35], [1.7, 0.75, -0.35], 0x6a4a30); s.rod('wood', 0.025, [0.9, 0.8, 0.35], [1.7, 0.75, 0.35], 0x6a4a30);
  // crusher: cast-iron frame, two rollers, flywheel and crank
  s.box('metal', 0.5, 0.08, 0.36, 0.45, 0.89, 0, 0x2a2824);
  for (const sz of [-0.15, 0.15]) s.box('metal', 0.06, 0.55, 0.06, 0.45, 1.15, sz, 0x2a2824);
  s.cyl('metal', 0.07, 0.07, 0.3, 12, 0.4, 1.1, 0, 0x8a8880, Math.PI / 2, 0);
  s.cyl('metal', 0.07, 0.07, 0.3, 12, 0.5, 1.1, 0, 0x8a8880, Math.PI / 2, 0);
  s.add('metal', tintGeo(planarUV(new THREE.TorusGeometry(0.2, 0.03, 6, 20), 'x', 1), 0x3a1a14), 0.45, 1.3, 0.22, 0, 0, 0);
  s.box('metal', 0.02, 0.4, 0.02, 0.45, 1.3, 0.22, 0x3a1a14, 0, 0, 0);
  s.rod('metal', 0.015, [0.45, 1.3, 0.22], [0.45, 1.6, 0.4], 0x2a2824);
  s.box('metal', 0.5, 0.04, 0.3, 0.42, 0.95, 0.0, 0x9a9a96); // collecting tray
  s.cyl('metal', 0.12, 0.1, 0.22, 12, 0.75, 1.0, 0.3, 0xb8b8b4); // steel jug
  // tumblers stacked, ice box
  for (let i = 0; i < 4; i++) s.cyl('metal', 0.04, 0.03, 0.1, 8, -0.4, 0.9 + i * 0.09, 0.1, 0xc4c4c0);
  s.box('wood', 0.5, 0.35, 0.4, -0.55, 1.02, -0.2, jit(0xb8b4a8, seed, 0.08)); s.box('wood', 0.52, 0.03, 0.42, -0.55, 1.2, -0.2, 0x7a766c);
  // cane stalks leaning on the back rail, with joints
  for (let i = 0; i < 9; i++) {
    const x = -0.9 + i * 0.12, lean = 0.3 + rnd(i + seed) * 0.12, top = 2.0 + rnd(i + 5) * 0.4;
    s.rod('wood', 0.02, [x, 0.85, -0.45], [x, 0.85 + top * 0.95, -0.45 - lean], jit(0x6a7a3a, i + seed, 0.15), 5);
  }
  // an umbrella on a pole
  s.rod('wood', 0.02, [-0.8, 0.85, 0.3], [-0.8, 2.3, 0.3], 0xc0a870);
  s.add('metal', tintGeo(planarUV(new THREE.ConeGeometry(1.2, 0.35, 12, 1, true), 'y', 1), jit(0x8a3a2a, seed, 0.06)), -0.4, 2.35, 0.3);
  s.person(0.5, 0.9, 1.6, Math.PI, 0x9a7a4a);
  s.person(1.3, 1.0, 1.0, Math.PI + 0.3, 0x5a8a6a);
  s.person(-0.2, 1.3, 1.55, Math.PI - 0.2, 0x7a4a6a);
  return { w: 2.6, d: 1.5, z: 0.1 };
}

function buildGrinder(s, seed) {
  // a travelling knife-grinder: wooden frame stand, a big grindstone on an axle, a foot treadle with a connecting rod, water tin on top
  for (const sx of [-0.3, 0.3]) { s.rod('wood', 0.03, [sx, 0, -0.35], [sx, 0.95, 0], 0x5a3e28); s.rod('wood', 0.03, [sx, 0, 0.35], [sx, 0.95, 0], 0x5a3e28); }
  s.box('wood', 0.7, 0.05, 0.12, 0, 0.95, 0, 0x6a4a30);
  s.cyl('metal', 0.32, 0.32, 0.07, 18, 0, 0.75, 0, 0x9a948a, Math.PI / 2);
  s.cyl('metal', 0.04, 0.04, 0.8, 8, 0, 0.75, 0, 0x3a3834, Math.PI / 2);
  s.cyl('metal', 0.07, 0.05, 0.12, 10, 0, 1.05, 0.0, 0x8a8a86); // water tin
  s.rod('metal', 0.006, [0, 1.1, 0], [0.12, 0.8, 0.31], 0x7a7a76, 4);
  s.box('wood', 0.9, 0.04, 0.3, 0, 0.12, 0.55, 0x6a4a30, 0, 0, 0.12); // treadle
  s.rod('metal', 0.012, [0.33, 0.15, 0.55], [0.33, 0.75, 0.05], 0x4a4844);
  s.box('metal', 0.04, 0.16, 0.5, 0.36, 0.5, 0.2, 0x4a4844);
  s.box('wood', 0.3, 0.3, 0.3, -0.9, 0.15, 0.4, 0x6a4a30); // stool
  s.box('metal', 0.5, 0.04, 0.18, 0.9, 0.04, 0.5, 0x3a5a7a); // tin tool box
  s.box('metal', 0.04, 0.03, 0.3, -0.7, 0.9, 0.2, 0xb8bcbc, 0.3); // blades, laid out
  s.person(-0.9, 0.4, 1.55, Math.PI / 2, 0x8a6a3a, 1);
  s.person(0.5, 1.6, 1.6, Math.PI, 0x6a8a9a);
  return { w: 2.4, d: 1.6, z: 0.3 };
}

const freeAt = (x, z, r) => !circleHitsAnyBox({ x, z }, r, staticBoxesNear(x, z, r + 1));
function findSite(sp, taken) {
  if (!ANCHORS[sp.anchor]) return null;
  const base = localPt(sp.anchor, sp.lx, sp.lz);
  for (let ring = 0; ring <= 40; ring += 2) {
    const n = ring === 0 ? 1 : Math.ceil(ring * 1.6);
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2 + ring * 0.7, x = base.x + Math.cos(ang) * ring, z = base.z + Math.sin(ang) * ring;
      if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < 10)) continue;
      if (freeAt(x, z, CLEAR + 1.0)) { const s = { x, z, ry: sp.ry + (ANCHORS[sp.anchor].ry || 0) }; taken.push(s); return s; }
    }
  }
  return null;
}

export function createVendors2(scene) {
  const group = new THREE.Group(); group.name = 'vendors2';
  scene.add(group);
  batchLateGroup(group, group.name); // code-built tiled meshes join the shared per-material batches (src/placeBatch.js)
  let built = false, frames = 0;
  function build() {
    const by = { wood: [], metal: [] }, taken = [], colliders = [], people = [], signs = [];
    SPOTS.forEach((sp, i) => {
      const site = findSite(sp, taken);
      if (!site) { console.warn('vendors2: no clear ground for', sp.kind); return; }
      const s = new Site(site, by), seed = 41 + i * 13;
      const fp = { paan: buildPaan, cane: buildCane, grinder: buildGrinder }[sp.kind](s, seed);
      const world = new THREE.Matrix4().makeRotationY(site.ry).setPosition(site.x, 0, site.z).multiply(new THREE.Matrix4().makeTranslation(0, 0, fp.z));
      colliders.push(colliderBoxFromTransform(fp.w, fp.d, world));
      s.people.forEach((p) => people.push({ site, ...p }));
      if (fp.sign) {
        const g = new THREE.BoxGeometry(fp.sign.w, fp.sign.w / 4.41, 0.03);
        g.translate(0, fp.sign.y + 0.2, fp.sign.z);
        g.rotateY(site.ry); g.translate(site.x, 0, site.z); signs.push(g);
      }
      if (typeof window !== 'undefined') (window.__vendors2 ||= {})[sp.kind] = { x: +site.x.toFixed(1), z: +site.z.toFixed(1), ry: site.ry };
    });
    let first = true;
    for (const set of ['wood', 'metal']) {
      if (!by[set].length) continue;
      const norm = by[set].map((g) => { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) x.deleteAttribute(k); return x; });
      const m = new THREE.Mesh(mergeGeometries(norm), getTiledMaterial(set, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
      m.name = `vendors2_${set}`; m.castShadow = true; m.receiveShadow = true;
      if (first) { m.userData.colliderBoxes = colliders; first = false; }
      group.add(m);
    }
    if (signs.length) {
      const atlas = createWideSignAtlas(SIGNS, { cellW: 512, cellH: 116 });
      signs.forEach((g) => mapFrontFaceToRow(g, 0, atlas.rows));
      const sm = new THREE.Mesh(mergeGeometries(signs.map((g) => g.toNonIndexed())), Object.assign(new THREE.MeshStandardMaterial({ map: atlas.texture, roughness: 0.85 }), { name: 'vendors2_sign' }));
      sm.name = 'vendors2_sign'; sm.castShadow = true; group.add(sm);
    }
    const pm = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.3, 1.1, 4, 8), new THREE.MeshStandardMaterial({ roughness: 0.85 }), Math.max(1, people.length));
    pm.name = 'vendors2_people'; pm.castShadow = true; pm.frustumCulled = false; batchPeopleMesh(pm); markFigure(pm); keepOnGround(pm, (sc) => settleInstances(sc, pm, refreshPeopleMesh));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    people.forEach((pp, i) => {
      const k = pp.h / 1.7, sy = pp.sit ? k * 0.62 : k, sn = Math.sin(pp.site.ry), cs = Math.cos(pp.site.ry), baseY = pp.sit ? 0.42 : 0.18;
      p.set(pp.site.x + pp.lx * cs + pp.lz * sn, baseY + 0.85 * sy, pp.site.z - pp.lx * sn + pp.lz * cs);
      q.setFromAxisAngle(up, pp.site.ry + pp.yaw); sc.set(k, sy, k);
      pm.setMatrixAt(i, m.compose(p, q, sc)); pm.setColorAt(i, col.setHex(pp.tint));
    });
    group.add(pm);
    requestColliderRebuild();
  }
  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    if (prev) prev.apply(this, args);
    if (settlingReleased()) frames++; // load time: lazy builds wait for the opening view (docs/perf-2026-11-08.md)
    if (!built && lazyDue(frames, 40) && STATIC_COLLIDERS.length > 0) { built = true; build(); }
  };
  return { group };
}
