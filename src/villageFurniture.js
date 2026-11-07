import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHORS } from './anchors.js';
import { getTiledMaterial } from './materials.js';
import { colliderBoxFromTransform } from './collision.js';

/**
 * VILLAGE FURNITURE (docs/VILLAGE_VOCABULARY.md sections 5, 6, 11), hard-surface items, one batch per library material:
 *   kites      - three paper kites and a snapped string hanging from a sagging wire between two poles
 *   scarecrow  - two in the wheat field: bamboo cross, matka head, old kurta on a stick frame
 *   thresher   - a belt-less wooden-hopper thresher on iron wheels beside the khalihan, a tarp half-folded, a sack heap
 *   jhoola     - an A-frame wooden swing (rope seat) by the pond; no tree is used because no CC0 tree model ships
 *   chaffcutter- toka: a hand chaff cutter (wooden trough, iron blade on a pivot, flywheel) outside the dairy yard
 * Skipped (no existing model / needs people): bhootiya ghar tree, soop-sifting women, newspaper reader, brick-kiln smoke.
 * Each item stands at an offset from a place's anchor (src/anchors.js) so it rides along if the map moves.
 */

const TILE = { metal: 1.0, wood: 1.0, tarpaulin: 1.0, concrete: 1.0, jute: 0.5, brick: 1.2, plaster: 0.5, ground: 2.0 };
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function metreUV(geo, tile) {
  const p = geo.attributes.position, n = p.count, uv = new Float32Array(n * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
    const ax = Math.abs(e1.x), ay = Math.abs(e1.y), az = Math.abs(e1.z);
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k);
      let u, v;
      if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
      uv[(i + k) * 2] = u / tile; uv[(i + k) * 2 + 1] = v / tile;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

const DIRT = new THREE.Color(0x6a5a46), DUST = new THREE.Color(0xb8aa90), RUST = new THREE.Color(0x6e4026);
function weather(geo, tint, w, seed) {
  const p = geo.attributes.position, nm = geo.attributes.normal, n = p.count;
  const col = new Float32Array(n * 3), base = new THREE.Color(tint), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = nm ? nm.getY(i) : 0;
    c.copy(base);
    c.multiplyScalar(0.93 + 0.11 * (0.5 + 0.5 * Math.sin(x * 4.1 + seed) * Math.sin(z * 3.7 - seed * 0.7) * Math.cos(y * 5.3 + seed * 1.3)));
    c.lerp(DIRT, Math.max(0, 1 - y / (w.dirtH ?? 0.55)) * (w.dirt ?? 0.35));
    if (ny > 0.3) c.lerp(DUST, (w.dust ?? 0.12) * ny);
    if (w.streak) {
      const band = Math.pow(Math.max(0, Math.sin(x * 9.0 + seed * 2.1) * Math.sin(z * 7.0 + seed)), 6);
      const top = Math.min(1, Math.max(0, (y - (w.streakFrom ?? 0)) / Math.max(0.01, (w.streakTop ?? 1.5) - (w.streakFrom ?? 0))));
      c.lerp(RUST, w.streak * band * (0.4 + 0.6 * top));
    }
    col[i * 3] = Math.min(0.9, Math.max(0.035, c.r)); col[i * 3 + 1] = Math.min(0.9, Math.max(0.035, c.g)); col[i * 3 + 2] = Math.min(0.9, Math.max(0.035, c.b));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
const local = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(1, 1, 1));

class Obj {
  constructor(batch, world, seed, w = {}) { this.b = batch; this.world = world; this.seed = seed; this.w = w; this.tris = 0; }
  add(set, geo, m, tint, w = null) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    metreUV(g, TILE[set] || 1);
    weather(g, tint, w ? { ...this.w, ...w } : this.w, this.seed + this.tris * 0.013);
    g.applyMatrix4(this.world);
    this.tris += g.attributes.position.count / 3;
    this.b.add(set, g);
    return g;
  }
  box(set, w, h, d, x, y, z, tint, rx = 0, ry = 0, rz = 0, wt = null) { return this.add(set, new THREE.BoxGeometry(w, h, d), local(x, y, z, rx, ry, rz), tint, wt); }
  cyl(set, rt, rb, h, seg, x, y, z, tint, rx = 0, ry = 0, rz = 0, wt = null) { return this.add(set, new THREE.CylinderGeometry(rt, rb, h, seg, 1, false), local(x, y, z, rx, ry, rz), tint, wt); }
  rod(set, r, a, b, tint, seg = 6, wt = null) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(B, A);
    const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1, false);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return this.add(set, g, new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), tint, wt);
  }
}

const BAMBOO = 0xb09a54, BAMBOO2 = 0x9a8a4a, IRONC = 0x55504a, WOODD = 0x7a5a3a;
export const FURNITURE_SPOTS = {
  kites: { at: 'chowk', lx: 14, lz: 20, yaw: 0.3 },
  scarecrowA: { at: 'field', lx: -12, lz: -4, yaw: 0.5 },
  scarecrowB: { at: 'field', lx: 21, lz: 10, yaw: -0.4 },
  thresher: { at: 'khalihan', lx: 22, lz: 10, yaw: 0.6 },
  jhoola: { at: 'pond', lx: 16, lz: 4, yaw: 1.2 },
  chaffcutter: { at: 'dairy', lx: -12, lz: -14, yaw: -1.371 }, // 7 Nov: dairy turned +90 deg (road-front audit); re-expressed so the world spot is unchanged (was lx -14, lz 12, yaw 0.2)
};
function spotMatrix(sp) {
  const a = ANCHORS[sp.at];
  if (!a) return null;
  const ry = a.ry || 0, s = Math.sin(ry), c = Math.cos(ry);
  return new THREE.Matrix4().makeRotationY(ry + (sp.yaw || 0)).setPosition(a.x + sp.lx * c + sp.lz * s, 0, a.z - sp.lx * s + sp.lz * c);
}
class Batch {
  constructor() { this.by = new Map(); }
  add(key, geo) { if (!this.by.has(key)) this.by.set(key, []); this.by.get(key).push(geo); }
  flush(group) {
    const out = {};
    for (const [key, list] of this.by) {
      const m = new THREE.Mesh(mergeGeometries(list), getTiledMaterial(key, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
      m.name = `furniture_${key}`; m.castShadow = true; m.receiveShadow = true;
      group.add(m); out[key] = m;
    }
    return out;
  }
}


function buildKites(o) {
  const A = [-3.2, 0, 0], B = [3.4, 0, 0.1];
  for (const p of [A, B]) o.rod('wood', 0.07, [p[0], 0, p[2]], [p[0] + 0.05, 6.2, p[2]], WOODD, 7, { dirt: 0.4 });
  for (const p of [A, B]) o.box('wood', 1.3, 0.07, 0.07, p[0], 5.7, p[2], WOODD);
  let prev = [A[0] - 0.5, 5.75, 0];
  const pts = [];
  for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([A[0] - 0.5 + t * 7.4, 5.75 - Math.sin(t * Math.PI) * 0.55, 0.05 * t]); }
  for (const p of pts) { o.rod('metal', 0.008, prev, p, IRONC, 4); prev = p; }
  const cols = [0xc0392b, 0xe0a030, 0x2f6fa0];
  [[2, 0.25, 0.9], [4, 0.4, 1.4], [6, -0.2, 0.7]].forEach(([i, rz, len], n) => {
    const p = pts[i];
    o.rod('jute', 0.004, p, [p[0], p[1] - len * 0.5, p[2]], 0xd8d0b8, 3);
    o.add('jute', new THREE.BoxGeometry(0.36, 0.5, 0.01), local(p[0], p[1] - len * 0.5 - 0.22, p[2], 0, 0, rz), cols[n]);
    o.box('wood', 0.006, 0.5, 0.012, p[0], p[1] - len * 0.5 - 0.22, p[2] + 0.01, BAMBOO, 0, 0, rz);
    o.rod('jute', 0.004, [p[0], p[1] - len * 0.5 - 0.45, p[2]], [p[0] + 0.05, p[1] - len * 0.5 - 1.1, p[2]], 0xd8d0b8, 3); // dangling tail string
  });
  return { w: 1.0, d: 0.5, cx: A[0], cz: 0, extra: [{ w: 1.0, d: 0.5, x: B[0], z: 0 }] };
}
function buildScarecrow(o) {
  o.rod('wood', 0.03, [0, 0, 0], [0, 1.9, 0], BAMBOO, 6);
  o.rod('wood', 0.025, [-0.75, 1.55, 0], [0.75, 1.55, 0], BAMBOO2, 6);
  o.cyl('metal', 0.17, 0.2, 0.3, 10, 0, 1.95, 0, 0x9a5a3a); // upturned matka head
  o.cyl('metal', 0.22, 0.05, 0.12, 10, 0, 2.15, 0, 0x6a4a30); // hat
  o.box('jute', 0.5, 0.75, 0.16, 0, 1.2, 0, 0xcfc4a8); // kurta
  o.box('jute', 1.4, 0.3, 0.1, 0, 1.5, 0, 0xcfc4a8);
  o.box('jute', 0.42, 0.5, 0.1, 0, 0.65, 0, 0x7a6a58); // dhoti
  return { w: 0.3, d: 0.3 };
}
function buildThresher(o) {
  o.box('wood', 1.4, 0.12, 2.2, 0, 0.75, 0, WOODD, 0, 0, 0, { dirt: 0.3 });
  o.box('metal', 1.2, 0.8, 1.2, 0, 1.2, 0.3, 0x3f6a50, 0, 0, 0, { streak: 0.5, streakTop: 1.6 }); // drum casing
  o.add('wood', new THREE.CylinderGeometry(0.6, 0.35, 0.7, 4, 1, true), local(0, 1.95, -0.2, 0, Math.PI / 4, 0), WOODD); // hopper
  o.box('wood', 0.05, 0.5, 1.0, 0, 1.5, -0.7, WOODD, 0.5, 0, 0);
  o.box('metal', 0.2, 0.2, 0.9, 0, 0.9, 1.35, IRONC, -0.5, 0, 0); // blower chute
  for (const sx of [-1, 1]) { o.cyl('metal', 0.38, 0.38, 0.1, 14, sx * 0.78, 0.4, -0.5, IRONC, 0, 0, Math.PI / 2); o.rod('metal', 0.03, [-0.78, 0.4, -0.5], [0.78, 0.4, -0.5], IRONC, 6); }
  o.rod('wood', 0.04, [0, 0.8, 1.1], [0, 0.2, 2.4], WOODD, 6); // draw bar
  o.box('jute', 1.1, 0.35, 0.7, 2.0, 0.18, 0.5, 0xc4b494); o.box('jute', 0.9, 0.3, 0.6, 2.1, 0.5, 0.45, 0xb8a888); // sacks
  o.box('jute', 1.6, 0.06, 1.4, -2.0, 0.04, 0.2, 0x6a7a8a);
  return { w: 1.5, d: 2.4, cz: 0.3 };
}
function buildJhoola(o) {
  for (const sx of [-1, 1]) { o.rod('wood', 0.07, [sx * 1.3, 0, -0.7], [sx * 0.05, 2.9, 0], WOODD, 7); o.rod('wood', 0.07, [sx * 1.3, 0, 0.7], [sx * 0.05, 2.9, 0], WOODD, 7); }
  o.rod('wood', 0.08, [-0.25, 2.9, 0], [0.25, 2.9, 0], WOODD, 7);
  o.rod('wood', 0.08, [-0.06, 2.9, 0], [0.06, 2.9, 0], WOODD, 7);
  o.rod('wood', 0.07, [-0.9, 2.9, 0], [0.9, 2.9, 0], WOODD, 7); // top beam
  for (const sx of [-0.35, 0.35]) o.rod('jute', 0.02, [sx, 2.85, 0.15], [sx, 0.55, 0.15], 0xb8a070, 5);
  o.box('wood', 0.9, 0.05, 0.3, 0, 0.52, 0.15, 0x8a6a44);
  return { w: 2.6, d: 1.4 };
}
function buildChaffCutter(o) {
  o.box('wood', 1.3, 0.1, 0.4, 0, 0.55, 0, WOODD, 0, 0, 0, { dirt: 0.3 });
  for (const sx of [-0.6, 0.6]) o.box('wood', 0.1, 0.55, 0.4, sx, 0.28, 0, WOODD);
  o.box('metal', 0.04, 0.55, 0.06, 0.45, 0.85, 0, 0x9a9a98, 0, 0, 0.08, { streak: 0.3 }); // blade
  o.rod('wood', 0.025, [0.45, 1.1, 0], [1.2, 1.25, 0], WOODD, 6); // handle
  o.cyl('metal', 0.18, 0.18, 0.04, 12, -0.5, 0.7, 0.24, IRONC, Math.PI / 2, 0, 0);
  o.box('jute', 1.1, 0.25, 0.6, 1.3, 0.12, 0.8, 0xcdbd7a); // heap of cut fodder in a sack-bed
  return { w: 1.4, d: 0.5 };
}
const BUILDERS = { kites: buildKites, scarecrowA: buildScarecrow, scarecrowB: buildScarecrow, thresher: buildThresher, jhoola: buildJhoola, chaffcutter: buildChaffCutter };

export function createVillageFurniture(scene) {
  const group = new THREE.Group(); group.name = 'village_furniture';
  const batch = new Batch(), colliders = [], report = [];
  let seed = 83;
  for (const [kind, build] of Object.entries(BUILDERS)) {
    const sp = FURNITURE_SPOTS[kind], world = sp && spotMatrix(sp);
    if (!world) continue;
    const sc = 0.97 + rnd(seed) * 0.08;
    const w = world.clone().multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
    const o = new Obj(batch, w, seed, { dirt: 0.3, dust: 0.12 });
    const fp = build(o);
    const at = (e) => w.clone().multiply(new THREE.Matrix4().makeTranslation(e.cx ?? e.x ?? 0, 0, e.cz ?? e.z ?? 0));
    colliders.push(colliderBoxFromTransform(fp.w * sc, fp.d * sc, at(fp)));
    for (const e of fp.extra || []) colliders.push(colliderBoxFromTransform(e.w, e.d, at(e)));
    const p = new THREE.Vector3().setFromMatrixPosition(world);
    report.push({ kind, x: +p.x.toFixed(2), z: +p.z.toFixed(2), tris: Math.round(o.tris) });
    seed += 7;
  }
  const meshes = batch.flush(group);
  const first = meshes.metal || Object.values(meshes)[0];
  if (first) first.userData.colliderBoxes = colliders;
  scene.add(group);
  if (typeof window !== 'undefined') window.__furniture = { items: report, drawCalls: group.children.length };
  return { group, colliders };
}
