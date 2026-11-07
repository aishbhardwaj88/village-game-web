import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHORS } from './anchors.js';
import { getTiledMaterial } from './materials.js';
import { colliderBoxFromTransform } from './collision.js';

/**
 * "EVERY VILLAGE HAS ONE OF THESE" (docs/VILLAGE_VOCABULARY.md section 11), hard-surface items only:
 *   halfbuilt - brick pillars and part-walls under a poured slab, rusty rebar standing out of the roof, wooden props under it
 *   sandpile  - heap of river sand, a slanted wooden sieve on bamboo legs, a stack of bricks, an iron tasla (mixing pan)
 *   scaffold  - bamboo scaffolding (two rows of poles, ledgers, braces, plank decks) against a brick wall under repair
 *   well      - old brick well: parapet ring, two brick piers with a wooden beam, iron pulley wheel, jute rope, tin bucket
 *   mazar     - a small plastered shrine, green chadar over the grave, a pennant on a bamboo pole, a clay-lamp niche.
 *               A faith building: NO task, no interaction, only a solid prop to walk around.
 *   shamiana  - a wedding tent half up: poles, ridge, striped cloth drawn over one bay, stacked chairs, a dhol and a bass drum
 * Materials: the frozen library sets only (brick, wood, metal, plaster, concrete, ground, tarpaulin, jute), tiled in metres,
 * tint + weathering baked into vertex colour per object. No flat colour, no brand, no lettering.
 * Cost: one merged mesh per material set (8), no glass. Each object stands at an offset from a place's anchor
 * (src/anchors.js) so it rides along if the map moves.
 */

const TILE = { metal: 1.0, wood: 1.0, tarpaulin: 1.0, concrete: 1.0, jute: 0.5, brick: 1.2, plaster: 0.5, ground: 2.0 };
export const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// anchor id, local x, local z (place frame, front = +z), object yaw. Scouted against every collider + visible mesh + the roads.
export const ODDITY_SPOTS = {
  halfbuilt: { at: 'banta', lx: -31.2, lz: 15.5, yaw: -1.284 },
  sandpile: { at: 'post', lx: 24.6, lz: -4.7, yaw: 0.005 },
  scaffold: { at: 'haveli', lx: 4.9, lz: 21.8, yaw: 0.037 },
  well: { at: 'halwai', lx: -7.4, lz: -20.4, yaw: -0.09 },
  mazar: { at: 'dairy', lx: -15.5, lz: 8.3, yaw: -0.003 }, // 7 Nov: dairy turned +90 deg (road-front audit); same world spot as before (was lx 8.3, lz 15.5, yaw 1.568)
  shamiana: { at: 'khalihan', lx: -28.3, lz: 7.2, yaw: -0.003 },
};

export function spotMatrix(sp) {
  const a = ANCHORS[sp.at];
  if (!a) return null;
  const ry = a.ry || 0, s = Math.sin(ry), c = Math.cos(ry);
  const x = a.x + sp.lx * c + sp.lz * s, z = a.z - sp.lx * s + sp.lz * c;
  return new THREE.Matrix4().makeRotationY(ry + (sp.yaw || 0)).setPosition(x, 0, z);
}

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
export const local = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(1, 1, 1));

export class Obj {
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

export class Batch {
  constructor() { this.by = new Map(); }
  add(key, geo) { if (!this.by.has(key)) this.by.set(key, []); this.by.get(key).push(geo); }
  flush(group, prefix = "oddities_") {
    const out = {};
    for (const [key, list] of this.by) {
      const m = new THREE.Mesh(mergeGeometries(list), getTiledMaterial(key, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
      m.name = `${prefix}${key}`; m.castShadow = true; m.receiveShadow = true;
      group.add(m); out[key] = m;
    }
    return out;
  }
}

const BAMBOO = 0xb09a54, BAMBOO2 = 0x9a8a4a, BRICK = 0xb8744e, SAND = 0xd8c08a;
const RAIL = { dirt: 0.2, dust: 0.1 };

/** a brick stack: rows of bricks laid alternately across and along, with a hair of jitter */
function brickStack(o, x0, z0, nx, nz, rows, seed, yaw = 0) {
  const L = 0.23, H = 0.075, W = 0.11;
  for (let r = 0; r < rows; r++) {
    const across = r % 2 === 0;
    const cols = across ? nx : nz;
    for (let i = 0; i < cols; i++) for (let j = 0; j < 4; j++) {
      const k = r * 97 + i * 13 + j * 5 + seed;
      const jx = (rnd(k) - 0.5) * 0.012, jz = (rnd(k + 1) - 0.5) * 0.012, tint = new THREE.Color(BRICK).multiplyScalar(0.82 + rnd(k + 2) * 0.3);
      const px = across ? x0 + i * (L * 0.5 + 0.005) : x0 + j * (W + 0.004) - 0.1;
      const pz = across ? z0 + j * (W + 0.004) - 0.1 : z0 + i * (L * 0.5 + 0.005);
      o.box('brick', across ? L : W, H, across ? W : L, px + jx, H / 2 + r * H, pz + jz, tint, 0, (rnd(k + 3) - 0.5) * 0.04 + yaw, 0, { dirt: 0.1, dust: 0.2 });
    }
  }
}

// HALF-BUILT HOUSE: 6 x 5 m ground floor, brick pillars + part walls, a slab, rebar out of the roof, props, a brick pile
function buildHalfBuilt(o) {
  const W = 6, D = 5, H = 3.0;
  const CONC = 0x9a968c;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) {
    o.box('concrete', 0.32, H, 0.32, sx * (W / 2 - 0.16), H / 2, sz * (D / 2 - 0.16), CONC, 0, 0, 0, { dirt: 0.3, dust: 0.1 });
    // rebar stubs out of each column top, the tallest tied with a rag of wire
    for (let k = 0; k < 4; k++) {
      const ox = (k % 2 - 0.5) * 0.14, oz = (Math.floor(k / 2) - 0.5) * 0.14;
      const x = sx * (W / 2 - 0.16) + ox, z = sz * (D / 2 - 0.16) + oz, hh = 0.9 + rnd(k + sx * 7 + sz * 3 + 20) * 0.7;
      o.rod('metal', 0.007, [x, H + 0.1, z], [x + (rnd(k + 5) - 0.5) * 0.1, H + 0.1 + hh, z + (rnd(k + 9) - 0.5) * 0.1], 0x7a4a30, 4, { streak: 0.5, streakFrom: H, streakTop: H + 1.6, dirt: 0 });
    }
  }
  // plinth beam and part brick walls (back full height to the sill, sides with a window gap, front open to the lintel)
  o.box('concrete', W, 0.25, D, 0, 0.125, 0, 0xa09c92, 0, 0, 0, { dirt: 0.4 });
  o.box('brick', W - 0.6, 2.1, 0.23, 0, 1.3, -(D / 2 - 0.12), BRICK, 0, 0, 0, { dirt: 0.3, dust: 0.1 });
  o.box('brick', 0.23, 1.0, D - 0.6, -(W / 2 - 0.12), 0.75, 0, 0xbb7a54, 0, 0, 0, { dirt: 0.3 });
  o.box('brick', 0.23, 1.6, 1.6, W / 2 - 0.12, 1.05, -1.5, 0xb0704c, 0, 0, 0, { dirt: 0.3 });
  o.box('brick', W - 2.4, 0.55, 0.23, -0.6, 0.52, D / 2 - 0.12, BRICK, 0, 0, 0, { dirt: 0.3 }); // front course, door gap at the right
  // the poured slab with a lip, a pour-stained top, and two long beams below it
  o.box('concrete', W + 0.5, 0.16, D + 0.5, 0, H + 0.08, 0, 0xa8a49a, 0, 0, 0, { dirt: 0.1, dust: 0.3, streak: 0.18, streakFrom: H, streakTop: H + 0.2 });
  o.box('concrete', W, 0.22, 0.3, 0, H - 0.11, 0, 0x9a968c);
  // wooden shuttering props still under the front edge, leaning slightly
  for (let k = 0; k < 5; k++) o.rod('wood', 0.04, [-W / 2 + 0.9 + k * 1.1, 0.05, D / 2 - 0.3], [-W / 2 + 0.9 + k * 1.1 + (rnd(k) - 0.5) * 0.08, H - 0.1, D / 2 - 0.3], BAMBOO2, 6);
  o.box('wood', W - 0.4, 0.05, 0.2, 0, H - 0.12, D / 2 - 0.3, 0x8a6a48);
  // a bamboo ladder up to the slab
  for (const sx of [-1, 1]) o.rod('wood', 0.025, [W / 2 + 0.55 + sx * 0.18, 0, D / 2 - 0.9], [W / 2 + 0.1 + sx * 0.18, H + 0.15, D / 2 - 0.9], BAMBOO, 6);
  for (let k = 0; k < 9; k++) { const t = (k + 0.5) / 9; o.rod('wood', 0.016, [W / 2 + 0.55 - 0.45 * t - 0.18, t * H, D / 2 - 0.9], [W / 2 + 0.55 - 0.45 * t + 0.18, t * H, D / 2 - 0.9], BAMBOO2, 5); }
  // bricks and a cement mixing pan in the yard in front
  brickStack(o, -W / 2 + 0.5, D / 2 + 1.2, 4, 4, 6, 3);
  o.cyl('metal', 0.38, 0.28, 0.12, 14, 1.4, 0.06, D / 2 + 1.5, 0x4a4844, 0, 0, 0, { dirt: 0.5, dust: 0.3 });
  return { w: W + 0.6, d: D + 0.6, cx: 0, extra: [{ w: 1.6, d: 1.2, x: -W / 2 + 1.1, z: D / 2 + 1.5 }] };
}

// SAND PILE + SIEVE + BRICKS
function buildSandPile(o) {
  const g = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + 0.1 * Math.sin(x * 5 + z * 3) + 0.06 * Math.sin(z * 9 - x * 4);
    p.setXYZ(i, x * n * 1.35, y * n * 0.78, z * n * 1.1);
  }
  g.computeVertexNormals();
  o.add('concrete', g, local(0, 0, 0, 0, 0.5, 0), SAND, { dirt: 0.0, dust: 0.0 });
  o.add('concrete', new THREE.SphereGeometry(0.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.Matrix4().compose(new THREE.Vector3(1.4, 0, 0.5), new THREE.Quaternion(), new THREE.Vector3(1.2, 0.5, 1)), 0xd0b884, { dirt: 0, dust: 0 });
  // the sieve: a square wooden frame with wire mesh, leaning on two bamboo legs (an A-frame)
  const sx = -1.9, sz = 0.2, lean = 0.5;
  o.box('metal', 0.03, 1.0, 0.9, sx, 0.88, sz, 0x9a9690, 0, 0, -lean, { dirt: 0, dust: 0.25 }); // wire mesh
  for (const k of [-1, 1]) o.box('wood', 0.07, 1.1, 0.07, sx, 0.88, sz + k * 0.5, 0x7a5c3a, 0, 0, -lean); // frame sides
  for (const k of [-1, 1]) o.box('wood', 0.07, 0.07, 1.07, sx + k * Math.sin(lean) * 0.55, 0.88 + k * Math.cos(lean) * 0.55, sz, 0x7a5c3a, 0, 0, -lean); // frame ends
  for (const k of [-1, 1]) o.rod('wood', 0.03, [sx - Math.sin(lean) * 0.2, 0.5, sz + k * 0.4], [sx - 0.8, 0.0, sz + k * 0.6], BAMBOO, 6);
  // a pile of sifted fine sand under the sieve, brick stack, a kassi (trowel board) and a shovel
  o.add('concrete', new THREE.SphereGeometry(0.5, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.Matrix4().compose(new THREE.Vector3(sx - 0.9, 0, sz), new THREE.Quaternion(), new THREE.Vector3(1.1, 0.5, 1.2)), 0xe0cb98, { dirt: 0, dust: 0 });
  brickStack(o, 2.0, -0.3, 5, 6, 8, 11, 0.1);
  o.rod('wood', 0.02, [0.9, 0.04, 1.4], [1.8, 0.06, 1.7], 0x7a5c3a, 6);
  o.box('metal', 0.22, 0.01, 0.28, 0.75, 0.05, 1.32, 0x6a6a64, 0.1, -0.3, 0);
  return { w: 7.2, d: 3.6, cx: 0.4, extra: [] };
}

// BAMBOO SCAFFOLDING against a brick wall being repaired
function buildScaffold(o) {
  const L = 7.2, Hs = 4.6;
  o.box('brick', L, 4.2, 0.23, 0, 2.1, -0.4, 0xb4704c, 0, 0, 0, { dirt: 0.3, dust: 0.1 });
  o.box('concrete', L, 0.3, 0.3, 0, 0.15, -0.4, 0xa09c92); // plinth
  const posts = 5, xs = Array.from({ length: posts }, (_, i) => -L / 2 + 0.4 + i * (L - 0.8) / (posts - 1));
  for (const row of [0.35, 1.45]) for (const x of xs) {
    const top = Hs + rnd(x * 3 + row * 11) * 0.5;
    o.rod('wood', 0.034, [x, 0, row - 0.15], [x + 0.02, top, row - 0.15], rnd(x + row) > 0.5 ? BAMBOO : BAMBOO2, 6, RAIL);
  }
  for (const y of [1.2, 2.4, 3.6]) {
    for (const row of [0.35, 1.45]) o.rod('wood', 0.03, [xs[0] - 0.1, y + (row > 1 ? 0.02 : 0), row - 0.15], [xs[posts - 1] + 0.1, y, row - 0.15], BAMBOO, 6, RAIL);
    for (const x of xs) o.rod('wood', 0.028, [x, y, 0.2], [x, y + 0.01, 1.3], BAMBOO2, 6, RAIL);
    // lashing bands: jute-bound crossings
    for (const x of xs) for (const row of [0.35, 1.45]) o.cyl('jute', 0.046, 0.046, 0.07, 8, x, y, row - 0.15, 0x8a7650, 0, 0, 0, { dirt: 0.1 });
  }
  // plank decks at two levels (some planks short and missing)
  for (const y of [2.4, 3.6]) for (let i = 0; i < posts - 1; i++) {
    if (y > 3 && i === 2) continue;
    for (let k = 0; k < 3; k++) o.box('wood', (L - 0.8) / (posts - 1) + 0.15, 0.04, 0.3, (xs[i] + xs[i + 1]) / 2, y + 0.04, 0.32 + k * 0.4 - 0.15, k === 1 ? 0x8a6a46 : 0x967650, 0, (rnd(i * 5 + k) - 0.5) * 0.04, 0, { dirt: 0.15 });
  }
  // diagonal braces, front face
  for (let i = 0; i < posts - 1; i += 2) o.rod('wood', 0.026, [xs[i], 0.2, 1.3], [xs[Math.min(posts - 1, i + 2)], 4.0, 1.3], BAMBOO2, 6, RAIL);
  // a bamboo ladder, a pail of plaster on a plank
  for (const sx of [-1, 1]) o.rod('wood', 0.024, [xs[1] + 0.3 + sx * 0.15, 0, 1.9], [xs[1] + 0.05 + sx * 0.15, 2.5, 1.5], BAMBOO, 6);
  for (let k = 0; k < 7; k++) { const t = (k + 0.5) / 7; o.rod('wood', 0.014, [xs[1] + 0.3 - 0.25 * t - 0.15, t * 2.5, 1.9 - 0.4 * t], [xs[1] + 0.3 - 0.25 * t + 0.15, t * 2.5, 1.9 - 0.4 * t], BAMBOO2, 5); }
  o.cyl('metal', 0.17, 0.14, 0.26, 14, -2.6, 2.54, 0.4, 0x6a6862, 0, 0, 0, { dirt: 0.3, dust: 0.4 });
  return { w: L, d: 2.2, cx: 0, cz: 0.4 };
}

// OLD WELL: brick ring parapet, two piers + beam, iron pulley, rope, tin bucket
function buildWell(o) {
  const R = 0.95, n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, tint = new THREE.Color(0xa87850).multiplyScalar(0.8 + rnd(i) * 0.35);
    for (let r = 0; r < 4; r++) {
      const aa = a + (r % 2) * Math.PI / n;
      o.box('brick', 0.62, 0.2, 0.28, Math.cos(aa) * R, 0.1 + r * 0.2, Math.sin(aa) * R, tint, 0, -aa - Math.PI / 2, 0, { dirt: 0.5, dust: 0.25, streak: 0.2, streakFrom: 0.2, streakTop: 1 });
    }
  }
  o.cyl('concrete', 0.68, 0.68, 0.06, 20, 0, 0.52, 0, 0x4a4640); // dark water far below: a dim lid of shadow
  // two brick piers, a wooden cross beam, a pulley hung from it
  const px = 1.15;
  for (const sx of [-1, 1]) o.box('brick', 0.4, 2.2, 0.4, sx * px, 1.1, 0, 0xb0704c, 0, 0, 0, { dirt: 0.5, dust: 0.2 });
  for (const sx of [-1, 1]) o.box('plaster', 0.5, 0.1, 0.5, sx * px, 2.25, 0, 0xcfc8b4);
  o.rod('wood', 0.07, [-px - 0.3, 2.4, 0], [px + 0.3, 2.4, 0], 0x6a4c30, 8, { dirt: 0.05, dust: 0.2 });
  for (const sx of [-1, 1]) o.rod('metal', 0.012, [sx * 0.06, 2.35, 0], [sx * 0.06, 2.1, 0], 0x4a4844, 4);
  const F = local(0, 1.98, 0, 0, 0, 0), wheel = new THREE.TorusGeometry(0.17, 0.02, 6, 20);
  o.add('metal', wheel, F.clone().multiply(local(0, 0, 0, 0, Math.PI / 2 * 0, 0)), 0x4a4844, { streak: 0.3, streakFrom: 1.6, streakTop: 2.1 });
  o.cyl('metal', 0.05, 0.05, 0.1, 8, 0, 1.98, 0, 0x3a3a38, Math.PI / 2, 0, 0);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; o.rod('metal', 0.006, [0, 1.98, 0], [0, 1.98 + Math.sin(a) * 0.17, Math.cos(a) * 0.17], 0x4a4844, 3); }
  // rope: over the pulley and down both sides; the long side holds a bucket at the parapet, the short end hangs and swings
  const rope = (a, b) => o.rod('jute', 0.011, a, b, 0x8a7650, 5, { dirt: 0 });
  rope([0, 2.15, 0.17], [0, 1.0, 0.19]);
  rope([0, 2.15, -0.17], [0.05, 1.1, -0.25]);
  rope([0, 2.15, -0.17], [0, 2.15, 0.17]);
  o.cyl('metal', 0.14, 0.11, 0.26, 14, 0, 0.88, 0.2, 0x8a8a86, 0, 0, 0.05, { dirt: 0.3, dust: 0.3 });
  o.add('metal', new THREE.TorusGeometry(0.13, 0.008, 4, 14, Math.PI), local(0, 1.0, 0.2, 0, 0, 0), 0x4a4844);
  o.cyl('metal', 0.16, 0.13, 0.26, 14, 0.3, 0.9, -0.45 * 0 + 0.0 + (R + 0.1), 0x7a7a74, 0, 0, 0, { dirt: 0.4 }); // a second pail left on the parapet
  // a stone slab apron round the foot
  o.cyl('concrete', 1.75, 1.8, 0.07, 22, 0, 0.035, 0, 0x9a968c, 0, 0, 0, { dirt: 0.5 });
  return { w: 3.6, d: 3.6, cx: 0 };
}

// MAZAR: a platform, a draped grave under a small domed canopy, a pennant pole, a lamp niche
function buildMazar(o) {
  const WH = 0xd6d0c0;
  o.box('plaster', 3.6, 0.3, 3.6, 0, 0.15, 0, WH, 0, 0, 0, { dirt: 0.5, dust: 0.2 });
  o.box('plaster', 3.3, 0.1, 3.3, 0, 0.35, 0, 0xcfc9b8);
  // the grave: stepped plaster body
  o.box('plaster', 1.2, 0.4, 2.3, 0, 0.6, 0, WH);
  o.box('plaster', 0.9, 0.3, 2.0, 0, 0.95, 0, 0xd8d2c2);
  // the chadar: green cloth draped over the grave, a longer fall at the sides and a lighter bordered runner on top
  o.box('tarpaulin', 1.18, 0.05, 2.06, 0, 1.12, 0, 0x2f7a46, 0, 0, 0, { dirt: 0, dust: 0.2 });
  for (const sx of [-1, 1]) o.box('tarpaulin', 0.04, 0.5, 2.0, sx * 0.59, 0.88, 0, 0x2a6e3f, 0, 0, sx * 0.05, { dirt: 0.2 });
  for (const sz of [-1, 1]) o.box('tarpaulin', 1.18, 0.4, 0.04, 0, 0.92, sz * 1.03, 0x2a6e3f, sz * 0.05, 0, 0, { dirt: 0.2 });
  o.box('tarpaulin', 0.5, 0.012, 2.08, 0, 1.15, 0, 0x7a9a5a, 0, 0, 0, { dirt: 0, dust: 0.2 }); // lighter runner
  // a canopy: four slim plaster pillars and a low dome
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) o.box('plaster', 0.2, 2.1, 0.2, sx * 1.05, 1.4, sz * 1.45, WH, 0, 0, 0, { dirt: 0.4, dust: 0.15 });
  o.box('plaster', 2.5, 0.16, 3.3, 0, 2.5, 0, 0xcfc9b8);
  o.add('plaster', new THREE.SphereGeometry(0.9, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.Matrix4().compose(new THREE.Vector3(0, 2.58, 0), new THREE.Quaternion(), new THREE.Vector3(1, 0.85, 1.3)), 0xd2ccbc, { dirt: 0, dust: 0.3 });
  o.cyl('metal', 0.03, 0.03, 0.3, 6, 0, 3.4, 0, 0x8a7a40); o.add('metal', new THREE.SphereGeometry(0.07, 8, 6), local(0, 3.58, 0), 0x8a7a40);
  // a lamp niche: a plaster shelf at the head with a little iron lamp stand and a clay-lamp saucer
  o.box('plaster', 0.9, 0.1, 0.3, 0, 1.0, -1.35, WH);
  o.cyl('metal', 0.1, 0.07, 0.07, 12, 0, 1.09, -1.35, 0x5a5448, 0, 0, 0, { dirt: 0, dust: 0.2 });
  o.rod('metal', 0.012, [0.4, 0.35, 1.9], [0.4, 1.0, 1.9], 0x3a3a38, 4);
  o.cyl('metal', 0.1, 0.1, 0.05, 10, 0.4, 1.02, 1.9, 0x5a5448);
  // pennant on a bamboo pole at the corner
  o.rod('wood', 0.03, [1.9, 0.0, -1.9], [1.9, 4.3, -1.9], BAMBOO, 6);
  o.add('tarpaulin', new THREE.BoxGeometry(0.02, 0.6, 1.0), local(1.9, 3.9, -1.4, 0, 0, 0), 0x2f7a46, { dirt: 0, dust: 0.1 });
  return { w: 3.8, d: 3.8, cx: 0 };
}

// SHAMIANA GOING UP
function buildShamiana(o) {
  const W = 6, D = 5, H = 2.6;
  const post = (x, z, h) => o.rod('wood', 0.045, [x, 0, z], [x + (rnd(x * 3 + z) - 0.5) * 0.04, h, z], rnd(x + z) > 0.5 ? BAMBOO : BAMBOO2, 6, RAIL);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(sx * W / 2, sz * D / 2, H);
  for (const sz of [-1, 1]) post(0, sz * D / 2, H + 0.9);
  for (const sx of [-1, 1]) post(sx * W / 2, 0, H);
  // ridge pole and top-rail poles
  o.rod('wood', 0.04, [-W / 2 - 0.2, H + 0.9, -D / 2], [W / 2 + 0.2, H + 0.9, -D / 2], BAMBOO, 6);
  o.rod('wood', 0.04, [-W / 2 - 0.2, H + 0.9, D / 2], [W / 2 + 0.2, H + 0.9, D / 2], BAMBOO, 6);
  for (const sz of [-1, 1]) o.rod('wood', 0.035, [-W / 2, H, sz * D / 2], [W / 2, H, sz * D / 2], BAMBOO2, 6);
  // cloth canopy drawn over the left bay only: striped panels sloping from the ridge to the eave, with a sag
  const panel = (x0, x1, tint) => {
    const g = new THREE.PlaneGeometry(1, 1, 6, 6); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, x = x0 + (x1 - x0) * u, zRun = D; // v 0 = back eave, 0.5 = ridge, 1 = front eave
      const t = v < 0.5 ? v * 2 : (1 - v) * 2, y = H + 0.12 + t * 0.78 - Math.sin(u * Math.PI) * 0.06 * (1 - t);
      p.setXYZ(i, x, y, (v - 0.5) * zRun);
    }
    g.computeVertexNormals();
    o.add('tarpaulin', g, null, tint, { dirt: 0, dust: 0.25 });
    const back = g.clone(); back.scale(1, 1, 1); o.add('tarpaulin', back, null, new THREE.Color(tint).multiplyScalar(0.8), { dirt: 0, dust: 0.1 });
  };
  const stripes = [0xb23a30, 0xd8b44a, 0xb23a30, 0xd8b44a, 0xb23a30];
  stripes.forEach((c, i) => panel(-W / 2 + (i * W / 2) / 5, -W / 2 + ((i + 1) * W / 2) / 5, c));
  // ropes from the eave out to stakes
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { o.rod('jute', 0.012, [sx * W / 2, H, sz * D / 2], [sx * (W / 2 + 1.5), 0.05, sz * (D / 2 + 1.1)], 0x8a7650, 4, { dirt: 0 }); o.rod('wood', 0.03, [sx * (W / 2 + 1.5), 0, sz * (D / 2 + 1.1)], [sx * (W / 2 + 1.5), 0.4, sz * (D / 2 + 1.1)], BAMBOO2, 5); }
  // chairs stacked in two columns at the right bay, each stack leaning slightly
  const chair = (x, y, z, yaw, tint, ry) => {
    const F = local(x, y, z, 0, yaw, 0), at = (m) => F.clone().multiply(m);
    o.add('tarpaulin', new THREE.BoxGeometry(0.4, 0.04, 0.4), at(local(0, 0.43, 0)), tint, { dirt: 0.05, dust: 0.2 });
    o.add('tarpaulin', new THREE.BoxGeometry(0.4, 0.34, 0.03), at(local(0, 0.65, -0.19, -0.1, 0, 0)), tint, { dirt: 0.05, dust: 0.15 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.add('metal', new THREE.CylinderGeometry(0.012, 0.012, 0.43, 5), at(local(sx * 0.18, 0.215, sz * 0.18)), 0x6a6a66, { dirt: 0.1 });
    for (const sx of [-1, 1]) o.add('metal', new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), at(local(sx * 0.19, 0.68, -0.19, -0.1, 0, 0)), 0x6a6a66, { dirt: 0 });
  };
  for (let c = 0; c < 2; c++) for (let k = 0; k < 9; k++) chair(W / 2 - 1.2 + c * 0.7 + (rnd(c * 20 + k) - 0.5) * 0.04, k * 0.08, D / 2 - 0.9, (rnd(c * 13 + k) - 0.5) * 0.12 + 0.1, c ? 0x7a6a4a : 0x6a7a5a, 0);
  // a few single chairs set out in rows, one tipped
  for (let k = 0; k < 4; k++) chair(-1.0 + k * 0.7, 0, -0.4 + (k % 2) * 0.1, (rnd(k) - 0.5) * 0.3, 0x7a6a4a, 0);
  // the band: dhol on its side on a crate, a bass drum on a stool
  const dx = -W / 2 + 0.7, dz = D / 2 - 1.3;
  o.box('wood', 0.7, 0.4, 0.5, dx, 0.2, dz, 0x8a6a46);
  o.cyl('wood', 0.19, 0.17, 0.62, 16, dx, 0.6, dz, 0x7a5030, 0, 0, Math.PI / 2, { dirt: 0.0, dust: 0.1 });
  for (const sx of [-1, 1]) { o.cyl('tarpaulin', 0.215, 0.215, 0.02, 16, dx + sx * 0.32, 0.6, dz, 0xd8cdb0, 0, 0, Math.PI / 2, { dirt: 0.1, dust: 0.3 }); o.cyl('metal', 0.225, 0.225, 0.04, 16, dx + sx * 0.3, 0.6, dz, 0x9a8248, 0, 0, Math.PI / 2); }
  for (let k = 0; k < 5; k++) { const x = dx - 0.2 + k * 0.1; o.rod('jute', 0.008, [x - 0.04, 0.78, dz + 0.05], [x + 0.04, 0.42, dz - 0.05], 0x8a7650, 3); }
  const bx = dx + 1.3;
  o.cyl('wood', 0.34, 0.34, 0.3, 20, bx, 0.62, dz + 0.1, 0x7a2e24, Math.PI / 2, 0, 0, { dirt: 0, dust: 0.1 });
  for (const sz of [-1, 1]) { o.cyl('tarpaulin', 0.36, 0.36, 0.015, 20, bx, 0.62, dz + 0.1 + sz * 0.15, 0xd8cdb0, Math.PI / 2, 0, 0, { dirt: 0.1, dust: 0.3 }); o.cyl('metal', 0.37, 0.37, 0.05, 20, bx, 0.62, dz + 0.1 + sz * 0.14, 0x9a8248, Math.PI / 2, 0, 0); }
  for (const a of [0, 1, 2]) o.rod('wood', 0.02, [bx - 0.3 + a * 0.3, 0, dz - 0.1], [bx - 0.3 + a * 0.3, 0.3, dz - 0.1], 0x6a4c30, 5);
  o.rod('wood', 0.012, [bx + 0.15, 0.3, dz + 0.4], [bx + 0.45, 0.04, dz + 0.55], BAMBOO2, 4); // a drumstick
  return { w: 1.5, d: 1.0, cx: W / 2 - 0.7, cz: D / 2 - 0.9, extra: [] };
}

const BUILDERS = { halfbuilt: buildHalfBuilt, sandpile: buildSandPile, scaffold: buildScaffold, well: buildWell, mazar: buildMazar, shamiana: buildShamiana };

export function createVillageOddities(scene) {
  const group = new THREE.Group(); group.name = 'village_oddities';
  const batch = new Batch(), colliders = [], report = [];
  let seed = 41;
  for (const [kind, build] of Object.entries(BUILDERS)) {
    const sp = ODDITY_SPOTS[kind];
    const world = sp && spotMatrix(sp);
    if (!world) continue;
    const sc = 0.97 + rnd(seed) * 0.06;
    const w = world.clone().multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
    const o = new Obj(batch, w, seed, { dirt: 0.32, dust: 0.14 });
    const fp = build(o);
    colliders.push(colliderBoxFromTransform(fp.w * sc, fp.d * sc, w.clone().multiply(new THREE.Matrix4().makeTranslation(fp.cx || 0, 0, fp.cz || 0))));
    for (const e of fp.extra || []) colliders.push(colliderBoxFromTransform(e.w, e.d, w.clone().multiply(new THREE.Matrix4().makeTranslation(e.x, 0, e.z))));
    const p = new THREE.Vector3().setFromMatrixPosition(world);
    report.push({ kind, x: +p.x.toFixed(2), z: +p.z.toFixed(2), tris: Math.round(o.tris), fp: { w: fp.w, d: fp.d } });
    seed += 7;
  }
  const meshes = batch.flush(group);
  const first = meshes.metal || Object.values(meshes)[0];
  if (first) first.userData.colliderBoxes = colliders;
  scene.add(group);
  if (typeof window !== 'undefined') window.__oddities = { items: report, drawCalls: group.children.length, colliders };
  return { group, colliders };
}
