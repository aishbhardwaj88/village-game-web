import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ANCHORS } from './anchors.js';
import { getTiledMaterial } from './materials.js';
import { colliderBoxFromTransform } from './collision.js';
import { buildMonkeyMesh, createHideMaterial } from './animals.js';

/**
 * NOSTALGIC OBJECTS (docs/VILLAGE_VOCABULARY.md section 13) plus the roof animals of section 3, scattered as discoveries:
 *   gola cart      - wooden thela on bicycle wheels, cast-iron hand-cranked ice shaver, ice block in a wet jute sack,
 *                    a row of syrup bottles, steel tumblers, a striped canopy (mela ground, by the stalls)
 *   scooter        - a step-through scooter under a draped, tied tarpaulin cover, only its small wheels showing (haveli front)
 *   motorcycle     - a 1980s single-cylinder roadster on its side stand: round tank, long flat seat, chrome (tea stall roadside)
 *   letterbox      - red wall-type letter box on a pipe post with a rain hood (post office yard; the v2 model already
 *                    carries the LAYOUT.md pillar box, this is the second, road-side box)
 *   community TV   - a CRT set locked in a wooden cabinet with its shutters open, on a tall stand, antenna on a bamboo pole
 *                    (panchayat meeting ground: the village's shared TV)
 *   ambassador     - the rounded 1960s-shape saloon, faded cream (panchayat side)
 *   water tanker   - steel tank trailer on two wheels, drawbar on a block (mela ground edge)
 *   monkeys        - three on the post office roof (one on the black water tank), animals.js's own macaque, re-used
 *   peacock        - one on the panchayat parapet, train hanging down the front wall: a stylised silhouette in the same
 *                    capsule/sphere + hide-texture style as src/animals.js
 * Every object is generic: no brand, no logo, no wordmark, no number on any plate.
 *
 * Materials: the frozen library sets only (metal, wood, tarpaulin, concrete, jute) at arch.py's tiling, metre UVs per face.
 * Weathering is baked into vertex colour per object: ground dirt, dust film on up faces, rust/rain streaks, per-unit
 * mottling. Glass (windows, lamps, syrup) is one small transparent material, like src/smallShops.js's.
 * Cost: 5 library meshes + 1 glass + 1 animals mesh = 7 draw calls for the whole family.
 * Each object stands at an offset from its place's anchor (src/anchors.js) so it rides with the place if the map moves.
 */

const TILE = { metal: 1.0, wood: 1.0, tarpaulin: 1.0, concrete: 1.0, jute: 0.5 };
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const D2R = Math.PI / 180;

// ---- where: [anchor id, local x, local z, local yaw (rad, object +z = its front), local y] -------------------------
// Local metres in the place's own frame (front = +z), turned by the anchor's ry, exactly like src/anchors.js localPt.
// Scouted with every zone forced against the full collider list and visible meshes (tmp/nostalgia/scout.mjs).
export const NOSTALGIA_SPOTS = {
  letterbox: { at: 'post', lx: -5.3, lz: 3.0, yaw: 0 },
  monkeys: [
    { at: 'post', lx: 2.4, ly: 5.0, lz: -5.0, yaw: 1.9, s: 1.0 }, // on the black roof tank's dome
    { at: 'post', lx: -1.2, ly: 4.46, lz: 2.1, yaw: -Math.PI / 2, s: 0.92 }, // walking the front parapet
    { at: 'post', lx: 3.9, ly: 4.46, lz: -1.6, yaw: Math.PI + 0.1, s: 0.72 }, // a young one on the side parapet
  ],
  peacock: { at: 'yard_panchayat', lx: 4.6, ly: 4.92, lz: -0.1, yaw: Math.PI + 0.55 },
  tv: { at: 'yard_panchayat', lx: -4.7, lz: 1.6, yaw: 0.12 },
  ambassador: { at: 'yard_panchayat', lx: 9.4, lz: 3.5, yaw: 0.08 },
  gola: { at: 'mela', lx: 13.2, lz: -3.2, yaw: -Math.PI / 2 + 0.2 },
  tanker: { at: 'mela', lx: -16.5, lz: 9.5, yaw: 0.35 },
  motorcycle: { at: 'teastall', lx: 4.6, lz: 3.6, yaw: 1.35 },
  scooter: { at: 'haveli', lx: -3.2, lz: 9.0, yaw: -0.3 },
};

/** world matrix of a spot (anchor position + ry, then the local offset, then the object's own yaw) */
function spotMatrix(sp) {
  const a = ANCHORS[sp.at];
  if (!a) return null;
  const ry = a.ry || 0, s = Math.sin(ry), c = Math.cos(ry);
  const x = a.x + sp.lx * c + sp.lz * s, z = a.z - sp.lx * s + sp.lz * c;
  return new THREE.Matrix4().makeRotationY(ry + (sp.yaw || 0)).setPosition(x, sp.ly || 0, z);
}

// ---------------------------------------------------------------------------------------------------------------
// geometry helpers
/** metre UVs per triangle, projected on the plane its face normal is closest to (no stretching on any face) */
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
/**
 * Bakes the tint plus weathering into vertex colour, in the OBJECT's frame (y = height above its ground):
 * per-unit mottling, ground splash dirt (bottom ~0.5 m), a pale dust film on up-facing faces (sun fade),
 * and optional rust/rain streaks running down from the top. Never pure black or white.
 */
function weather(geo, tint, w, seed) {
  const p = geo.attributes.position, nm = geo.attributes.normal, n = p.count;
  const col = new Float32Array(n * 3), base = new THREE.Color(tint), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = nm ? nm.getY(i) : 0;
    c.copy(base);
    const mot = 0.93 + 0.11 * (0.5 + 0.5 * Math.sin(x * 4.1 + seed) * Math.sin(z * 3.7 - seed * 0.7) * Math.cos(y * 5.3 + seed * 1.3));
    c.multiplyScalar(mot);
    const g = Math.max(0, 1 - y / (w.dirtH ?? 0.55)) * (w.dirt ?? 0.35);
    c.lerp(DIRT, g);
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

/** One object being built: parts are placed in the object's own frame, weathered there, then moved to the world. */
class Obj {
  constructor(batch, world, seed, w = {}) { this.b = batch; this.world = world; this.seed = seed; this.w = w; this.tris = 0; }
  add(set, geo, m, tint, w = null) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (set !== 'glass') metreUV(g, TILE[set] || 1); else g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    weather(g, tint, w ? { ...this.w, ...w } : this.w, this.seed + this.tris * 0.013);
    g.applyMatrix4(this.world);
    this.tris += g.attributes.position.count / 3;
    this.b.add(set, g);
    return g;
  }
  box(set, w, h, d, x, y, z, tint, rx = 0, ry = 0, rz = 0, wt = null) { return this.add(set, new THREE.BoxGeometry(w, h, d), local(x, y, z, rx, ry, rz), tint, wt); }
  rbox(set, w, h, d, r, x, y, z, tint, rx = 0, ry = 0, rz = 0, wt = null, seg = 2) { return this.add(set, new RoundedBoxGeometry(w, h, d, seg, r), local(x, y, z, rx, ry, rz), tint, wt); }
  cyl(set, rt, rb, h, seg, x, y, z, tint, rx = 0, ry = 0, rz = 0, wt = null, open = false) { return this.add(set, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), local(x, y, z, rx, ry, rz), tint, wt); }
  /** a cylinder spanning two points (frames, rods, legs) */
  rod(set, r, a, b, tint, seg = 6, wt = null) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(B, A);
    const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1, false);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    const m = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
    return this.add(set, g, m, tint, wt);
  }
  /** wheel with its axle along local x: tyre torus, rim, hub, optional wire spokes */
  wheel(x, y, z, R, tube, { spokes = 0, rimTint = 0xa8a8a4, tyre = 0x2c2a27, hubR = 0.05, disc = false, axleZ = false } = {}) {
    const F = local(x, y, z, 0, axleZ ? Math.PI / 2 : 0, 0); // wheel frame: axle along its x
    const at = (m) => F.clone().multiply(m);
    this.add('metal', new THREE.TorusGeometry(R - tube, tube, 8, 22), at(local(0, 0, 0, 0, Math.PI / 2, 0)), tyre, { dirt: 0.25, dust: 0.25 });
    this.add('metal', new THREE.TorusGeometry(R - tube * 2.1, tube * 0.35, 4, 22), at(local(0, 0, 0, 0, Math.PI / 2, 0)), rimTint, { dirt: 0.2 });
    this.add('metal', new THREE.CylinderGeometry(hubR, hubR, tube * 2.2, 10), at(local(0, 0, 0, 0, 0, Math.PI / 2)), rimTint);
    if (disc) this.add('metal', new THREE.CylinderGeometry(R - tube * 2, R - tube * 2, tube * 0.9, 18), at(local(0, 0, 0, 0, 0, Math.PI / 2)), rimTint);
    const v = new THREE.Vector3();
    const tp = (px, py, pz) => v.set(px, py, pz).applyMatrix4(F).toArray();
    for (let k = 0; k < spokes; k++) {
      const a = (k / spokes) * Math.PI * 2, r1 = R - tube * 2.1, sx = (k % 2 ? 1 : -1) * tube * 0.5;
      this.rod('metal', 0.0035, tp(sx, Math.cos(a) * hubR, Math.sin(a) * hubR), tp(-sx, Math.cos(a + 0.25) * r1, Math.sin(a + 0.25) * r1), 0x9a9a96, 3);
    }
  }
}

class Batch {
  constructor() { this.by = new Map(); }
  add(key, geo) { if (!this.by.has(key)) this.by.set(key, []); this.by.get(key).push(geo); }
  flush(group) {
    const out = {};
    for (const [key, list] of this.by) {
      const mat = key === 'glass' ? getGlassMat() : getTiledMaterial(key, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
      const m = new THREE.Mesh(mergeGeometries(list), mat);
      m.name = `nostalgia_${key}`; m.castShadow = key !== 'glass'; m.receiveShadow = true;
      if (key === 'glass') m.renderOrder = 3;
      group.add(m); out[key] = m;
    }
    return out;
  }
}
let glassMat = null;
const getGlassMat = () => glassMat || (glassMat = Object.assign(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.55, roughness: 0.08, metalness: 0.1, depthWrite: false }), { name: 'nostalgia_glass' }));

// ---------------------------------------------------------------------------------------------------------------
// GOLA CART: 1.7 x 0.85 m wooden thela, bed at 0.85 m, two bicycle wheels at mid-length, front legs, push handles at the back.
function buildGola(o) {
  const PAINT = 0x5e8a86, BED = 0x7a5a3c;
  const bedY = 0.82;
  o.box('wood', 1.7, 0.06, 0.86, 0, bedY, 0, BED);
  // painted side boards (planks, each its own fade)
  for (const sz of [-1, 1]) for (let k = 0; k < 2; k++) o.box('wood', 1.7, 0.1, 0.025, 0, bedY + 0.06 + k * 0.105, sz * 0.43, k ? 0xb8584a : PAINT, 0, 0, 0, { dust: 0.18 });
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) o.box('wood', 0.025, 0.1, 0.86, sx * 0.85, bedY + 0.06 + k * 0.105, 0, k ? 0xb8584a : PAINT);
  // chassis rails, axle, two bicycle wheels, front legs, rear handles
  for (const sz of [-1, 1]) o.box('wood', 2.1, 0.07, 0.06, -0.2, bedY - 0.065, sz * 0.36, 0x5a4230);
  o.cyl('metal', 0.018, 0.018, 1.08, 6, 0.1, 0.34, 0, 0x4a4844, Math.PI / 2, 0, 0); // axle across the cart (along z)
  for (const sz of [-1, 1]) o.wheel(0.1, 0.34, sz * 0.5, 0.34, 0.022, { spokes: 16, axleZ: true });
  for (const sz of [-1, 1]) o.rod('wood', 0.03, [0.78, 0.0, sz * 0.36], [0.78, bedY - 0.1, sz * 0.36], 0x5a4230);
  for (const sz of [-1, 1]) o.rod('wood', 0.022, [-0.85, bedY - 0.06, sz * 0.36], [-1.3, bedY + 0.08, sz * 0.36], 0x6a4c34);
  // ice shaver at the front end: cast-iron pedestal, a hopper box, the big hand wheel and crank
  const IRON = 0x3a3b3a, sx0 = 0.5;
  o.box('metal', 0.36, 0.05, 0.3, sx0, bedY + 0.055, 0, IRON);
  o.cyl('metal', 0.07, 0.11, 0.28, 10, sx0, bedY + 0.22, 0, IRON);
  o.box('metal', 0.3, 0.2, 0.24, sx0, bedY + 0.46, 0, 0x6a2e26, 0, 0, 0, { streak: 0.4, streakFrom: bedY, streakTop: bedY + 0.6 }); // painted hopper
  o.box('metal', 0.22, 0.03, 0.18, sx0, bedY + 0.575, 0, 0x8a8a86); // pressing plate
  o.cyl('metal', 0.012, 0.012, 0.3, 6, sx0, bedY + 0.72, 0, 0x8a8a86); // screw
  o.add('metal', new THREE.TorusGeometry(0.15, 0.014, 6, 20), local(sx0 - 0.0, bedY + 0.42, 0.18, 0, 0, 0), IRON); // hand wheel on the side
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3; o.rod('metal', 0.008, [sx0, bedY + 0.42, 0.18], [sx0 + Math.cos(a) * 0.15, bedY + 0.42 + Math.sin(a) * 0.15, 0.18], IRON, 4); }
  o.cyl('wood', 0.018, 0.018, 0.1, 6, sx0 + 0.13, bedY + 0.5, 0.23, 0x8a6a48, Math.PI / 2, 0, 0); // crank knob
  o.cyl('metal', 0.07, 0.06, 0.06, 12, sx0, bedY + 0.31, 0.0, 0x9a9a96); // shaved-ice bowl under the blade
  // the ice block in a wet jute sack, a corner of ice showing
  o.box('concrete', 0.42, 0.24, 0.3, -0.05, bedY + 0.15, 0.1, 0xc4d0d4, 0, 0.1, 0, { dirt: 0, dust: 0 });
  const sack = new THREE.BoxGeometry(0.46, 0.27, 0.34, 6, 3, 4); { const p = sack.attributes.position; for (let i = 0; i < p.count; i++) { p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 23 + p.getZ(i) * 17) * 0.012); p.setX(i, p.getX(i) * (1 + 0.04 * Math.sin(p.getY(i) * 30))); } }
  o.add('jute', sack, local(-0.12, bedY + 0.16, 0.08, 0, 0.1, 0.0), 0x7a6a52, { dirt: 0 }); // darker: wet
  // syrup bottles in a wooden rack across the back
  o.box('wood', 0.9, 0.04, 0.16, -0.45, bedY + 0.26, -0.3, 0x6a4c34);
  o.box('wood', 0.9, 0.26, 0.02, -0.45, bedY + 0.13, -0.38, 0x6a4c34);
  const SYR = [0xb02a2a, 0x3a8a3a, 0xd8781e, 0x6a2a6a, 0xc0a020, 0xb02a50];
  SYR.forEach((cc, k) => {
    const x = -0.8 + k * 0.14;
    o.cyl('glass', 0.045, 0.045, 0.22, 10, x, bedY + 0.39, -0.3, cc);
    o.cyl('glass', 0.018, 0.04, 0.06, 10, x, bedY + 0.53, -0.3, cc);
    o.cyl('metal', 0.02, 0.02, 0.025, 8, x, bedY + 0.57, -0.3, 0xa0a09c);
  });
  // steel tumblers stacked and set out, a dented bucket of water on the bed
  for (let k = 0; k < 5; k++) o.cyl('metal', 0.035, 0.03, 0.1, 10, 0.12 + (k % 3) * 0.08, bedY + 0.08 + (k > 2 ? 0.1 : 0), -0.25 + (k > 2 ? 0.0 : 0) + (k % 2) * 0.02, 0xb4b4b0, 0, 0, 0, { dirt: 0 });
  o.cyl('metal', 0.14, 0.11, 0.24, 14, 0.25, bedY + 0.15, 0.25, 0x9a9a94, 0, 0, 0.03, { dirt: 0 }, true);
  // striped canopy on a bamboo pole (cloth, sags in the middle)
  o.rod('wood', 0.022, [-0.75, bedY, 0.35], [-0.72, 2.25, 0.35], 0x9a8058);
  const can = new THREE.ConeGeometry(0.9, 0.35, 12, 1, true);
  { const p = can.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); if (p.getY(i) < 0) p.setY(i, p.getY(i) + 0.04 * Math.cos(a * 12)); } }
  const cg = can.toNonIndexed(); o.add('tarpaulin', cg, local(-0.72, 2.2, 0.35, 0, 0.2, 0.06), 0xb0402e, { dirt: 0, dust: 0.2 });
  o.add('tarpaulin', new THREE.ConeGeometry(0.91, 0.36, 12, 1, true).toNonIndexed(), local(-0.72, 2.195, 0.35, 0, 0.2 + Math.PI / 12, 0.06), 0xd8c89a, { dirt: 0, dust: 0.2 });
  return { w: 2.2, d: 1.2, cx: -0.15 };
}

// SCOOTER UNDER A COVER: wheels peek out under a draped, wrinkled cover (modelled folds), a rope round the seat.
function buildScooter(o) {
  // the scooter's own bits that show: two small wheels, the stand, the front mudguard nose
  o.wheel(0, 0.2, 0.62, 0.2, 0.045, { disc: true, rimTint: 0x8a8a86 });
  o.wheel(0, 0.2, -0.55, 0.2, 0.045, { disc: true, rimTint: 0x8a8a86 });
  o.rbox('metal', 0.16, 0.12, 0.34, 0.05, 0, 0.42, 0.66, 0x7a9aa0, 0.3, 0, 0, { dust: 0.2 }); // mudguard nose (pale blue-grey paint)
  o.rod('metal', 0.012, [0.05, 0.25, -0.15], [0.12, 0.0, -0.12], 0x3a3a38, 4);
  // cover: a lofted shell along z (front +z), cross-sections from a profile table, hem at ~0.32 m with hanging folds
  const PROF = [ // z, top height, half width
    [0.86, 0.55, 0.08], [0.8, 0.95, 0.2], [0.72, 1.12, 0.36], [0.62, 1.16, 0.38], [0.5, 1.02, 0.26], [0.32, 0.86, 0.24],
    [0.12, 0.84, 0.25], [-0.05, 0.86, 0.27], [-0.3, 0.88, 0.3], [-0.55, 0.85, 0.33], [-0.75, 0.76, 0.3], [-0.88, 0.6, 0.2], [-0.94, 0.42, 0.08],
  ];
  const NU = 40, NV = 20, pos = [];
  const sample = (t) => { const f = t * (PROF.length - 1), i = Math.min(PROF.length - 2, Math.floor(f)), u = f - i; return PROF[i].map((v, k) => v + (PROF[i + 1][k] - v) * u); };
  const pt = (iu, iv) => {
    const [z, top, hw] = sample(iu / NU), s = iv / NV; // s 0..1 runs hem(left) -> over the top -> hem(right)
    const hem = 0.3 + 0.04 * Math.sin(z * 11 + iv);
    const a = (s - 0.5) * Math.PI; // -90..90 deg
    const cap = 0.22; // the rounded top part height
    let x, y;
    const lift = Math.cos(a); // 1 on top, 0 at the sides
    x = Math.sin(a) * hw; y = top - cap + cap * Math.pow(Math.max(0, lift), 0.6);
    const side = 1 - Math.pow(Math.max(0, lift), 0.6);
    y = y - side * (top - cap - hem); // run down the side to the hem
    // folds: vertical ripples hanging off the sides, growing toward the hem; a few creases across the top
    const fold = Math.sin(z * 26 + Math.sin(z * 7) * 2) * 0.025 * side + Math.sin(z * 9 + s * 5) * 0.008;
    x += Math.sign(x) * fold + Math.sign(x) * side * 0.05; // flares out a little at the hem
    y += Math.sin(s * 17 + z * 13) * 0.006 * (1 - side);
    return [x, y, z];
  };
  for (let iu = 0; iu < NU; iu++) for (let iv = 0; iv < NV; iv++) {
    const a = pt(iu, iv), b = pt(iu + 1, iv), c = pt(iu + 1, iv + 1), d = pt(iu, iv + 1);
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const shell = new THREE.BufferGeometry(); shell.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); shell.computeVertexNormals();
  // which way did that wind? make sure normals face out (top normal should point up)
  if (shell.attributes.normal.getY(Math.floor(NU / 2) * NV * 6 + NV / 2 * 6) < 0) { const p = shell.attributes.position; for (let i = 0; i < p.count; i += 3) { const tx = p.getX(i), ty = p.getY(i), tz = p.getZ(i); p.setXYZ(i, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, tx, ty, tz); } shell.computeVertexNormals(); }
  const inner = shell.clone(); { const p = inner.attributes.position; for (let i = 0; i < p.count; i += 3) { const tx = p.getX(i), ty = p.getY(i), tz = p.getZ(i); p.setXYZ(i, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, tx, ty, tz); } inner.scale(0.985, 0.995, 0.985); inner.computeVertexNormals(); }
  o.add('tarpaulin', shell, null, 0x52708a, { dirt: 0.3, dirtH: 0.6, dust: 0.3 }); // faded blue, dusty top
  o.add('tarpaulin', inner, null, 0x3a4e60, { dirt: 0.2 });
  // rope tied round the middle and a brick-weight on the hem
  o.add('jute', new THREE.TorusGeometry(0.29, 0.012, 4, 20), local(0, 0.6, -0.2, 0, 0, 0).multiply(new THREE.Matrix4().makeScale(1, 1.0, 1)), 0x9a8a62);
  o.box('concrete', 0.22, 0.08, 0.11, 0.42, 0.04, -0.3, 0x9a5a44, 0, 0.4, 0);
  return { w: 0.9, d: 2.0, cx: 0 };
}

// MOTORCYCLE (1980s roadster): 18" spoked wheels, round tank, long flat seat, round headlamp, chrome exhaust, on its side stand.
function buildMotorcycle(o) {
  const RED = 0x8c2e26, CHROME = 0xb4b4b0, BLACK = 0x2e2c2a;
  const WB = 1.28, R = 0.31;
  const fz = WB / 2, rz = -WB / 2;
  o.wheel(0, R, fz, R, 0.042, { spokes: 24, rimTint: CHROME, hubR: 0.07 });
  o.wheel(0, R, rz, R, 0.045, { spokes: 24, rimTint: CHROME, hubR: 0.085 });
  // front fork (raked), headlamp, handlebar, mirrors
  for (const sx of [-1, 1]) o.rod('metal', 0.018, [sx * 0.07, R, fz], [sx * 0.07, 0.86, fz - 0.17], CHROME, 6);
  o.cyl('metal', 0.095, 0.08, 0.13, 14, 0, 0.84, fz - 0.1, BLACK, Math.PI / 2, 0, 0);
  o.cyl('glass', 0.082, 0.082, 0.01, 14, 0, 0.84, fz - 0.03, 0xd8d4c0, Math.PI / 2, 0, 0);
  o.add('metal', new THREE.TorusGeometry(0.088, 0.008, 4, 16), local(0, 0.84, fz - 0.035), CHROME);
  o.rod('metal', 0.013, [-0.36, 1.02, fz - 0.27], [0.36, 1.02, fz - 0.27], CHROME, 6);
  o.rod('metal', 0.013, [-0.1, 0.93, fz - 0.2], [-0.36, 1.02, fz - 0.27], CHROME, 6);
  o.rod('metal', 0.013, [0.1, 0.93, fz - 0.2], [0.36, 1.02, fz - 0.27], CHROME, 6);
  for (const sx of [-1, 1]) { o.cyl('metal', 0.017, 0.017, 0.12, 8, sx * 0.4, 1.02, fz - 0.27, BLACK, 0, 0, Math.PI / 2); o.rod('metal', 0.006, [sx * 0.28, 1.02, fz - 0.27], [sx * 0.3, 1.2, fz - 0.3], CHROME, 4); o.cyl('glass', 0.045, 0.045, 0.01, 10, sx * 0.3, 1.22, fz - 0.31, 0x8a9498, Math.PI / 2, 0, 0); }
  // mudguards: part tori in body colour
  o.add('metal', new THREE.TorusGeometry(R + 0.035, 0.05, 4, 14, Math.PI * 0.75), local(0, R, fz, 0, Math.PI / 2, Math.PI * 0.12), RED, { dust: 0.25 });
  o.add('metal', new THREE.TorusGeometry(R + 0.04, 0.055, 4, 14, Math.PI * 0.85), local(0, R, rz, 0, Math.PI / 2, Math.PI * 0.32), RED, { dust: 0.25 });
  // frame: down tube, backbone, rear subframe, swingarm, shocks
  o.rod('metal', 0.025, [0, 0.84, fz - 0.2], [0, 0.38, 0.12], BLACK);
  o.rod('metal', 0.025, [0, 0.86, fz - 0.2], [0, 0.78, -0.25], BLACK);
  for (const sx of [-1, 1]) {
    o.rod('metal', 0.02, [sx * 0.09, 0.36, -0.05], [sx * 0.09, R, rz], BLACK);
    o.rod('metal', 0.022, [sx * 0.11, R + 0.05, rz + 0.06], [sx * 0.11, 0.78, rz + 0.3], CHROME);
    o.rod('metal', 0.016, [sx * 0.12, 0.76, -0.1], [sx * 0.12, 0.74, rz - 0.05], BLACK);
  }
  // engine block with cooling fins, chrome exhaust running back along the right
  o.box('metal', 0.24, 0.3, 0.32, 0, 0.4, 0.05, 0x5a5a56, 0.15, 0, 0, { streak: 0.3, streakFrom: 0.2, streakTop: 0.6 });
  for (let k = 0; k < 6; k++) o.box('metal', 0.2, 0.012, 0.2, 0, 0.56 + k * 0.03, 0.14, 0x6a6a66, 0.2, 0, 0);
  o.box('metal', 0.3, 0.16, 0.22, 0, 0.3, -0.12, 0x6a6a64); // gearbox/crankcase
  o.rod('metal', 0.026, [0.1, 0.55, 0.22], [0.16, 0.3, 0.18], CHROME, 8);
  o.rod('metal', 0.026, [0.16, 0.3, 0.18], [0.17, 0.3, -0.2], CHROME, 8);
  o.cyl('metal', 0.045, 0.04, 0.48, 12, 0.18, 0.33, -0.44, CHROME, Math.PI / 2 - 0.1, 0, 0);
  // round tank with a chrome cap, knee pads, the long flat seat, side toolboxes, rear carrier, tail lamp
  o.add('metal', new THREE.SphereGeometry(0.15, 14, 10), local(0, 0.86, 0.12).multiply(new THREE.Matrix4().makeScale(0.95, 0.72, 1.55)), RED, { dust: 0.22 });
  o.cyl('metal', 0.03, 0.03, 0.02, 10, 0, 0.97, 0.18, CHROME);
  for (const sx of [-1, 1]) o.rbox('metal', 0.02, 0.09, 0.12, 0.008, sx * 0.135, 0.84, 0.05, BLACK);
  o.rbox('metal', 0.26, 0.08, 0.66, 0.035, 0, 0.82, -0.38, 0x3a2e26, 0.05, 0, 0, { dust: 0.3 }); // worn seat
  for (const sx of [-1, 1]) o.rbox('metal', 0.06, 0.18, 0.26, 0.02, sx * 0.15, 0.6, -0.25, RED);
  o.box('metal', 0.2, 0.02, 0.3, 0, 0.82, rz + 0.02, CHROME); for (const sx of [-1, 1]) o.rod('metal', 0.008, [sx * 0.1, 0.82, rz - 0.12], [sx * 0.12, 0.76, rz + 0.2], CHROME, 4);
  o.rbox('glass', 0.1, 0.05, 0.04, 0.012, 0, 0.72, rz - 0.18, 0x9a2a22);
  o.box('metal', 0.18, 0.12, 0.01, 0, 0.62, rz - 0.2, 0xd8ccaa, 0.15, 0, 0); // blank plate
  o.box('metal', 0.18, 0.12, 0.01, 0, 0.55, fz + 0.12, 0xd8ccaa, -0.6, 0, 0); // blank plate on the front mudguard
  o.rod('metal', 0.01, [0.12, 0.25, -0.05], [0.3, 0.0, -0.05], BLACK, 4); // side stand
  o.box('metal', 0.07, 0.03, 0.12, 0.08, 0.32, 0.25, 0x6a6a66); // footrest
  o.box('metal', 0.07, 0.03, 0.12, -0.08, 0.32, 0.25, 0x6a6a66);
  return { w: 0.85, d: 2.05, cx: 0 };
}

// LETTERBOX: a red wall-type box on a pipe post, rain hood, slot, collection door with a hasp, footing.
function buildLetterbox(o) {
  const RED = 0xa63224;
  o.box('concrete', 0.42, 0.14, 0.42, 0, 0.07, 0, 0xa8a296);
  o.cyl('metal', 0.035, 0.035, 1.05, 10, 0, 0.62, 0, 0x4a4a46, 0, 0, 0, { streak: 0.35, streakFrom: 0.1, streakTop: 1.1 });
  o.box('metal', 0.42, 0.52, 0.26, 0, 1.38, 0, RED, 0, 0, 0, { streak: 0.25, streakFrom: 1.1, streakTop: 1.65, dirt: 0 });
  o.box('metal', 0.48, 0.035, 0.34, 0, 1.68, 0.03, 0x8a2a1e, -0.18, 0, 0, { dirt: 0 }); // hood, sloped to the front
  o.box('metal', 0.24, 0.025, 0.02, 0, 1.53, 0.135, 0x241e1c); // slot
  o.box('metal', 0.3, 0.22, 0.012, 0, 1.28, 0.136, 0x982c20, 0, 0, 0, { dirt: 0 }); // collection door
  o.box('metal', 0.03, 0.06, 0.03, 0.12, 1.28, 0.15, 0x6a6a66); // hasp + lock
  o.box('metal', 0.26, 0.03, 0.01, 0, 1.43, 0.137, 0xc8b070); // a painted cream band (no lettering)
  o.box('metal', 0.1, 0.06, 0.03, 0, 1.38, -0.15, 0x4a4a46); // clamp to the post
  return { w: 0.5, d: 0.45, cx: 0 };
}

// COMMUNITY TV: wooden cabinet with shutters open, CRT inside, on a tall stand; antenna on a bamboo pole beside it.
function buildTV(o) {
  const WOOD = 0x6e4a2e, TEAK = 0x7e5636;
  // stand: four legs, braces, shelf
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.box('wood', 0.06, 1.15, 0.06, sx * 0.3, 0.575, sz * 0.24, 0x5e4028);
  for (const y of [0.25, 1.1]) { o.box('wood', 0.66, 0.05, 0.05, 0, y, 0.24, 0x5e4028); o.box('wood', 0.66, 0.05, 0.05, 0, y, -0.24, 0x5e4028); o.box('wood', 0.05, 0.05, 0.5, 0.3, y, 0, 0x5e4028); o.box('wood', 0.05, 0.05, 0.5, -0.3, y, 0, 0x5e4028); }
  o.box('wood', 0.62, 0.025, 0.48, 0, 0.28, 0, 0x6a4a30);
  // cabinet box: back, sides, top, bottom; open front
  const Y0 = 1.15, CW = 0.78, CH = 0.66, CD = 0.56, T = 0.03;
  o.box('wood', CW, T, CD, 0, Y0 + T / 2, 0, TEAK);
  o.box('wood', CW + 0.04, T + 0.01, CD + 0.04, 0, Y0 + CH - T / 2, 0, TEAK, 0, 0, 0, { dust: 0.2 });
  for (const sx of [-1, 1]) o.box('wood', T, CH, CD, sx * (CW / 2 - T / 2), Y0 + CH / 2, 0, TEAK);
  o.box('wood', CW, CH, T, 0, Y0 + CH / 2, -CD / 2 + T / 2, WOOD);
  // two shutters swung open ~110 deg, panelled, with the hasp and a padlock hanging on the right one
  for (const sx of [-1, 1]) {
    const hw = CW / 2, hx = sx * CW / 2, hz = CD / 2, ang = sx * (Math.PI / 2 + 0.35);
    const m = local(hx, Y0 + CH / 2, hz, 0, ang, 0);
    o.add('wood', new THREE.BoxGeometry(hw, CH - 0.02, 0.022), m.clone().multiply(local(-sx * hw / 2, 0, 0)), TEAK);
    o.add('wood', new THREE.BoxGeometry(hw - 0.1, CH - 0.14, 0.01), m.clone().multiply(local(-sx * hw / 2, 0, 0.014)), WOOD);
    if (sx > 0) { o.add('metal', new THREE.BoxGeometry(0.03, 0.1, 0.02), m.clone().multiply(local(-hw + 0.04, 0, 0.02)), 0x6a6a64); o.add('metal', new THREE.TorusGeometry(0.025, 0.006, 4, 10), m.clone().multiply(local(-hw + 0.04, -0.07, 0.03)), 0x8a7a50); o.add('metal', new THREE.BoxGeometry(0.045, 0.05, 0.02), m.clone().multiply(local(-hw + 0.04, -0.11, 0.03)), 0x7a6a40); }
    for (const y of [-CH / 2 + 0.1, CH / 2 - 0.1]) o.add('metal', new THREE.BoxGeometry(0.02, 0.06, 0.03), local(hx, Y0 + CH / 2 + y, hz), 0x5a5a56);
  }
  // the set: wood-grain body, curved grey screen bezel, glass, knobs and a speaker grille beside the screen
  const SY = Y0 + T + 0.27;
  o.rbox('wood', 0.68, 0.52, 0.42, 0.03, 0, SY, 0.02, 0x8a6240, 0, 0, 0, { dust: 0.05 });
  o.box('metal', 0.44, 0.38, 0.02, -0.08, SY + 0.02, 0.235, 0x4a4a48);
  const scr = new THREE.SphereGeometry(1.2, 12, 10, Math.PI / 2 - 0.17, 0.34, Math.PI / 2 - 0.14, 0.28);
  o.add('glass', scr, local(-0.08, SY + 0.02, 0.24 - 1.2 + 0.03), 0x3a4440);
  o.add('metal', scr.clone(), local(-0.08, SY + 0.02, 0.24 - 1.2 + 0.02), 0x2a302e, { dirt: 0, dust: 0 }); // the dark tube face behind the glass
  for (let k = 0; k < 7; k++) o.box('metal', 0.12, 0.012, 0.01, 0.24, SY + 0.12 - k * 0.025, 0.238, 0x2e2c2a);
  for (let k = 0; k < 3; k++) o.cyl('metal', 0.022, 0.022, 0.03, 10, 0.24, SY - 0.1 - k * 0.07 + 0.04, 0.245, k ? 0x6a6a66 : 0xa8a8a2, Math.PI / 2, 0, 0);
  // embroidered cloth over the top of the set (the house wives' touch), the rabbit-ear aerial wire to the pole
  o.box('jute', 0.6, 0.008, 0.38, 0.0, SY + 0.265, 0.02, 0xd8ccb0, 0, 0.06, 0, { dirt: 0 });
  // antenna on a tall bamboo pole: mast, boom, elements, the feeder wire
  const px = -0.65, pz = -0.25;
  o.cyl('wood', 0.045, 0.06, 6.0, 8, px, 3.0, pz, 0xa08a5a, 0.02, 0, 0.01, { dust: 0.2 });
  for (let k = 0; k < 4; k++) o.cyl('wood', 0.055, 0.055, 0.04, 8, px, 1.2 + k * 1.3, pz, 0x8a7448); // bamboo nodes
  o.rod('metal', 0.012, [px, 5.9, pz - 0.7], [px, 5.9, pz + 0.7], 0x8a8a84, 5);
  for (let k = 0; k < 6; k++) { const L = 0.95 - k * 0.1; o.rod('metal', 0.006, [px - L / 2, 5.9, pz - 0.6 + k * 0.24], [px + L / 2, 5.9, pz - 0.6 + k * 0.24], 0x9a9a94, 3); }
  const wire = new THREE.CatmullRomCurve3([new THREE.Vector3(px, 5.85, pz), new THREE.Vector3(px + 0.04, 3.5, pz + 0.02), new THREE.Vector3(px + 0.1, 1.6, pz + 0.05), new THREE.Vector3(-0.2, SY + 0.1, -0.22)]);
  o.add('metal', new THREE.TubeGeometry(wire, 16, 0.005, 3), null, 0x2a2826);
  return { w: 1.0, d: 0.75, cx: -0.1, extra: [{ x: px, z: pz, w: 0.3, d: 0.3 }] };
}

// AMBASSADOR-STYLE SALOON: rounded hump bonnet, rounded roof, chrome grille + bumpers, round lamps, faded cream.
function buildAmbassador(o) {
  const CREAM = 0xd2c8b0, CHROME = 0xaeaea8, BLACK = 0x2a2826;
  const L = 4.3, W = 1.66, WB = 2.46;
  const wt = { dust: 0.25, dirt: 0.45, dirtH: 0.6, streak: 0.12, streakFrom: 0.3, streakTop: 1.0 };
  // wheels (inside arches)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.wheel(sx * 0.67, 0.33, sz * WB / 2, 0.33, 0.085, { disc: true, rimTint: 0x9a9a94, hubR: 0.09 });
  // lower body: sides taper in under the sills
  o.rbox('metal', W, 0.5, L, 0.12, 0, 0.7, 0, CREAM, 0, 0, 0, wt, 3);
  o.rbox('metal', W - 0.16, 0.2, L - 0.3, 0.06, 0, 0.42, 0, 0x5a564e, 0, 0, 0, wt); // dark sill / floor pan
  // wheel arches: dark half-discs just proud of the body sides
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.add('metal', new THREE.CylinderGeometry(0.42, 0.42, 0.02, 18, 1, false, 0, Math.PI), local(sx * (W / 2 + 0.004), 0.45, sz * WB / 2, 0, 0, Math.PI / 2).multiply(new THREE.Matrix4().makeRotationY(sx > 0 ? -Math.PI / 2 : Math.PI / 2)), 0x2e2b28, { dirt: 0.5 });
  // hump bonnet and boot lid
  o.rbox('metal', W - 0.2, 0.2, 1.25, 0.09, 0, 0.98, 1.4, CREAM, 0.06, 0, 0, wt, 3);
  o.rbox('metal', W - 0.2, 0.16, 0.85, 0.07, 0, 0.96, -1.68, CREAM, -0.08, 0, 0, wt, 3);
  // cabin: glass greenhouse, pillars, rounded roof
  const CZ = -0.25, CL = 1.95, CY = 1.2;
  o.rbox('glass', W - 0.3, 0.42, CL - 0.15, 0.08, 0, CY, CZ, 0x2e3a3c);
  o.rbox('metal', W - 0.26, 0.11, CL - 0.25, 0.05, 0, CY + 0.25, CZ - 0.05, CREAM, 0, 0, 0, { dust: 0.35, dirt: 0 }, 3);
  for (const sx of [-1, 1]) {
    o.rod('metal', 0.035, [sx * 0.66, 0.96, CZ + CL / 2 + 0.05], [sx * 0.6, CY + 0.24, CZ + CL / 2 - 0.3], CREAM); // A pillar
    o.rod('metal', 0.04, [sx * 0.68, 0.96, CZ + 0.05], [sx * 0.63, CY + 0.24, CZ + 0.02], CREAM); // B pillar
    o.rod('metal', 0.06, [sx * 0.66, 0.96, CZ - CL / 2 - 0.02], [sx * 0.6, CY + 0.24, CZ - CL / 2 + 0.35], CREAM); // C pillar
    o.box('metal', 0.012, 0.025, L - 0.4, sx * (W / 2 + 0.002), 0.78, 0, CHROME); // side chrome strip
    for (const dz of [CZ + 0.65, CZ - 0.35]) o.box('metal', 0.02, 0.025, 0.12, sx * (W / 2 + 0.008), 0.9, dz, CHROME); // door handles
    o.box('metal', 0.006, 0.4, 0.008, sx * (W / 2 + 0.004), 0.7, CZ + 0.05, 0x8a8478); // door shut line
    o.box('metal', 0.006, 0.4, 0.008, sx * (W / 2 + 0.004), 0.7, CZ + 1.0, 0x8a8478);
    o.box('metal', 0.006, 0.4, 0.008, sx * (W / 2 + 0.004), 0.7, CZ - 0.9, 0x8a8478);
  }
  o.rod('metal', 0.012, [0.75, 1.05, 0.62], [0.88, 1.12, 0.6], CHROME, 4); o.rbox('glass', 0.02, 0.08, 0.12, 0.01, 0.9, 1.13, 0.6, 0x7a8488); // wing mirror
  // front: chrome grille with slats, round headlamps in chrome rings, parking lamps, bumper, blank plate
  const FZ = L / 2;
  o.rbox('metal', 0.9, 0.3, 0.05, 0.02, 0, 0.72, FZ + 0.005, CHROME, 0, 0, 0, { dirt: 0.2 });
  for (let k = 0; k < 9; k++) o.box('metal', 0.016, 0.26, 0.03, -0.4 + k * 0.1, 0.72, FZ + 0.035, 0x5a5a56);
  for (const sx of [-1, 1]) {
    o.add('metal', new THREE.TorusGeometry(0.095, 0.02, 6, 18), local(sx * 0.62, 0.8, FZ - 0.02), CHROME);
    o.cyl('glass', 0.09, 0.09, 0.03, 16, sx * 0.62, 0.8, FZ - 0.02, 0xd8d4c4, Math.PI / 2, 0, 0);
    o.rbox('glass', 0.1, 0.05, 0.03, 0.01, sx * 0.6, 0.6, FZ + 0.01, 0xd8962a);
    o.rbox('glass', 0.08, 0.14, 0.03, 0.01, sx * 0.68, 0.78, -FZ - 0.0, 0x9a2a22); // tail lamps
  }
  o.rbox('metal', W + 0.02, 0.1, 0.14, 0.04, 0, 0.46, FZ + 0.06, CHROME, 0, 0, 0, { dirt: 0.25 });
  o.rbox('metal', W + 0.02, 0.1, 0.14, 0.04, 0, 0.46, -FZ - 0.06, CHROME, 0, 0, 0, { dirt: 0.25 });
  o.box('metal', 0.42, 0.11, 0.01, 0, 0.58, FZ + 0.03, 0xd8d0b4);
  o.box('metal', 0.42, 0.11, 0.01, 0, 0.62, -FZ - 0.03, 0xd8d0b4);
  o.rod('metal', 0.008, [-0.4, 1.0, FZ - 0.72], [0.0, 1.05, FZ - 0.78], 0x2e2c2a, 3); // wipers
  o.rod('metal', 0.008, [0.1, 1.0, FZ - 0.72], [0.5, 1.05, FZ - 0.78], 0x2e2c2a, 3);
  // inside: seat backs, steering wheel, a cloth on the dash
  o.box('jute', 1.2, 0.5, 0.12, 0, 1.05, CZ - 0.05, 0x7a5e48, 0.1, 0, 0, { dirt: 0 });
  o.box('jute', 1.25, 0.45, 0.12, 0, 1.05, CZ - 0.85, 0x7a5e48, 0.15, 0, 0, { dirt: 0 });
  o.add('metal', new THREE.TorusGeometry(0.19, 0.016, 5, 18), local(0.38, 1.12, CZ + 0.62, -0.5, 0, 0), BLACK);
  o.box('metal', W - 0.35, 0.12, 0.25, 0, 1.0, CZ + 0.88, 0x3a3230);
  return { w: W + 0.3, d: L + 0.25, cx: 0 };
}

// WATER TANKER TRAILER: steel cylinder on a channel chassis, two wheels, drawbar on a block, manhole, ladder, rear taps.
function buildTanker(o) {
  const BLUE = 0x5a7890, STEEL = 0x6a6a66, BLACK = 0x2a2826;
  const L = 3.3, R = 0.72, AY = 1.3;
  const wt = { streak: 0.55, streakFrom: 0.6, streakTop: AY + R, dust: 0.22, dirt: 0.45, dirtH: 1.0 };
  o.add('metal', new THREE.CylinderGeometry(R, R, L, 26, 4), local(0, AY, -0.2, Math.PI / 2, 0, 0), BLUE, wt);
  for (const sz of [-1, 1]) o.add('metal', new THREE.SphereGeometry(R, 26, 6, 0, Math.PI * 2, 0, Math.PI / 2), local(0, AY, -0.2 + sz * L / 2, sz * Math.PI / 2, 0, 0).multiply(new THREE.Matrix4().makeScale(1, 0.22, 1)), BLUE, wt);
  for (const z of [-1.3, -0.2, 0.9]) o.add('metal', new THREE.TorusGeometry(R + 0.01, 0.025, 4, 26), local(0, AY, z), STEEL, wt); // straps
  o.cyl('metal', 0.24, 0.24, 0.14, 16, 0, AY + R + 0.03, 0.4, STEEL, 0, 0, 0, wt); // manhole
  o.cyl('metal', 0.26, 0.26, 0.04, 16, 0, AY + R + 0.11, 0.4, BLUE, 0, 0, 0.04, wt);
  // chassis and drawbar
  for (const sx of [-1, 1]) o.box('metal', 0.1, 0.14, L + 0.3, sx * 0.45, AY - R - 0.06, -0.2, BLACK, 0, 0, 0, { dirt: 0.5, dirtH: 1.0 });
  for (const sx of [-1, 1]) o.rod('metal', 0.045, [sx * 0.45, AY - R - 0.06, 1.5], [0, 0.38, 2.75], BLACK);
  o.cyl('metal', 0.07, 0.07, 0.06, 12, 0, 0.36, 2.8, STEEL, 0, 0, 0);
  o.box('concrete', 0.4, 0.3, 0.3, 0, 0.15, 2.75, 0x9a948a, 0, 0.2, 0);
  // axle and wheels with mudguards
  o.cyl('metal', 0.05, 0.05, 1.7, 8, 0, 0.47, -0.25, BLACK, 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) {
    o.wheel(sx * 0.8, 0.47, -0.25, 0.47, 0.12, { disc: true, rimTint: 0x8a3a2a, hubR: 0.11 });
    o.add('metal', new THREE.CylinderGeometry(0.58, 0.58, 0.3, 16, 1, true, -Math.PI / 2, Math.PI), local(sx * 0.8, 0.47, -0.25, 0, 0, Math.PI / 2).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)), BLACK, { dirt: 0.5, streak: 0.3 });
  }
  // rear: two taps on a manifold, a ladder up the back, a chain, a hanging tumbler
  const RZ = -0.2 - L / 2 - 0.12;
  o.rod('metal', 0.04, [0, AY - R + 0.1, RZ + 0.1], [0, AY - R - 0.1, RZ - 0.05], STEEL);
  o.rod('metal', 0.035, [-0.35, AY - R - 0.1, RZ - 0.05], [0.35, AY - R - 0.1, RZ - 0.05], STEEL);
  for (const sx of [-1, 1]) { o.cyl('metal', 0.03, 0.03, 0.14, 8, sx * 0.35, AY - R - 0.17, RZ - 0.05, 0x8a7a50); o.box('metal', 0.1, 0.02, 0.02, sx * 0.35, AY - R - 0.06, RZ - 0.05, 0xa02a1e); }
  for (const sx of [-1, 1]) o.rod('metal', 0.016, [sx * 0.2, 0.55, RZ - 0.08], [sx * 0.2, AY + R - 0.05, RZ + 0.02], STEEL, 5);
  for (let k = 0; k < 5; k++) o.rod('metal', 0.012, [-0.2, 0.7 + k * 0.28, RZ - 0.07 + k * 0.02], [0.2, 0.7 + k * 0.28, RZ - 0.07 + k * 0.02], STEEL, 5);
  o.cyl('metal', 0.035, 0.03, 0.1, 10, 0.35, AY - R - 0.32, RZ - 0.05, 0xb4b4b0, 0, 0, 0, { dirt: 0 });
  // a wet patch below the taps (dark concrete-free: a flat jute-dark disc is wrong; leave the earth)
  return { w: 1.9, d: 4.5, cx: 0, cz: 0.4 };
}

// ---------------------------------------------------------------------------------------------------------------
// ANIMALS: animals.js's macaque re-used (its geometry, re-posed by placement) + a peacock in the same capsule style.
function peacockGeometry() {
  const geos = [];
  const part = (g, m, c) => { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (!['position', 'normal'].includes(k)) x.deleteAttribute(k); x.applyMatrix4(m); const n = x.attributes.position.count, col = new Float32Array(n * 3), cc = new THREE.Color(c); for (let i = 0; i < n; i++) { col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; } x.setAttribute('color', new THREE.BufferAttribute(col, 3)); geos.push(x); };
  const S = (sx, sy, sz, x, y, z, rx = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz));
  const NECK = 0x1e4a86, BODY = 0x23527e, WING = 0x8a7458, BRONZE = 0x5a6a34, GREEN = 0x3e6a3a, EYEO = 0x8a7a30, EYEI = 0x1a3a5a, LEG = 0x8a7a68;
  // body + wings, upright neck curving forward, small head, beak, crest fan, white eye-patch
  part(new THREE.SphereGeometry(0.1, 12, 9), S(1.05, 1.0, 1.75, 0, 0.36, -0.02), BODY);
  for (const sx of [-1, 1]) part(new THREE.SphereGeometry(0.09, 10, 7), S(0.45, 0.85, 1.7, sx * 0.075, 0.37, -0.06, -0.1), WING);
  const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.4, 0.12), new THREE.Vector3(0, 0.54, 0.17), new THREE.Vector3(0, 0.66, 0.16), new THREE.Vector3(0, 0.72, 0.19)]);
  part(new THREE.TubeGeometry(neck, 8, 0.042, 8), new THREE.Matrix4(), NECK);
  part(new THREE.SphereGeometry(0.038, 10, 8), S(0.9, 0.95, 1.2, 0, 0.74, 0.2), NECK);
  part(new THREE.ConeGeometry(0.012, 0.05, 6), S(1, 1, 1, 0, 0.735, 0.255, Math.PI / 2), 0x9a8a70);
  for (const sx of [-1, 1]) part(new THREE.SphereGeometry(0.012, 6, 5), S(0.5, 1.4, 1.5, sx * 0.031, 0.745, 0.215), 0xd8d4c8);
  for (let k = 0; k < 5; k++) { const a = (k - 2) * 0.22; const top = new THREE.Vector3(Math.sin(a) * 0.05, 0.86, 0.17 + Math.cos(a) * 0.0); part(new THREE.CylinderGeometry(0.003, 0.003, 0.09, 3), S(1, 1, 1, top.x * 0.5, 0.81, 0.18), NECK); part(new THREE.SphereGeometry(0.01, 5, 4), S(1, 1, 1, top.x, top.y, top.z), NECK); }
  // legs: thin, standing on the parapet top (y 0)
  for (const sx of [-1, 1]) { part(new THREE.CylinderGeometry(0.011, 0.009, 0.28, 5), S(1, 1, 1, sx * 0.04, 0.14, 0.0), LEG); part(new THREE.BoxGeometry(0.03, 0.01, 0.08), S(1, 1, 1, sx * 0.04, 0.005, 0.03), LEG); }
  // the train: a strip leaving the rump backwards, over the edge, then hanging straight down ~1.1 m, wider toward the tip
  const N = 14, train = [];
  const path = (t) => { // t 0 at rump, 1 at the tip
    const run = 0.32; // horizontal run before the drop
    const s = t * 1.45;
    if (s < run) return [0.36 - s * 0.35, -0.18 - s]; // y, z
    const u = s - run; return [0.36 - run * 0.35 - u, -0.18 - run - 0.06 * Math.min(1, u * 3)];
  };
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N, [y0, z0] = path(t0), [y1, z1] = path(t1);
    const w0 = 0.07 + t0 * 0.2, w1 = 0.07 + t1 * 0.2;
    const q = [[-w0, y0, z0], [w0, y0, z0], [w1, y1, z1], [-w1, y1, z1]];
    // a little fan curvature across the width (edges curl back)
    const bow = (x, w) => -0.04 * (x / Math.max(w, 0.001)) ** 2;
    const P = q.map(([x, y, z], k) => [x, y, z + bow(x, k < 2 ? w0 : w1)]);
    for (const th of [0.015, -0.015]) {
      const off = (p) => [p[0], p[1], p[2] + th];
      const [a, b, c, d] = P.map(off);
      train.push(...(th > 0 ? [...a, ...c, ...b, ...a, ...d, ...c] : [...a, ...b, ...c, ...a, ...c, ...d]));
    }
    // eye spots: two or three per row, bronze ring + dark blue centre, slightly proud of the outer face
    const cnt = 2 + (i % 2);
    for (let e = 0; e < cnt; e++) {
      const fx = (e + 0.5) / cnt * 2 - 1, wm = (w0 + w1) / 2, ym = (y0 + y1) / 2, zm = (z0 + z1) / 2 + 0.017 + bow(fx * wm * 0.8, wm);
      const vert = Math.abs(y1 - y0) > Math.abs(z1 - z0);
      const rot = vert ? new THREE.Euler(0, 0, 0) : new THREE.Euler(-Math.PI / 2, 0, 0);
      const m = (sc) => new THREE.Matrix4().compose(new THREE.Vector3(fx * wm * 0.8, ym + (vert ? 0 : 0.01), vert ? zm : zm - 0.017), new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(sc, sc * 1.3, sc));
      if (i > 2) { part(new THREE.CircleGeometry(0.028, 8), m(1), EYEO); part(new THREE.CircleGeometry(0.016, 8), m(1).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.002)), EYEI); }
    }
  }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(train, 3)); tg.computeVertexNormals();
  { const n = tg.attributes.position.count, col = new Float32Array(n * 3), a = new THREE.Color(BRONZE), b = new THREE.Color(GREEN), c = new THREE.Color(); for (let i = 0; i < n; i++) { c.copy(a).lerp(b, 0.5 + 0.5 * Math.sin(tg.attributes.position.getX(i) * 40 + tg.attributes.position.getY(i) * 25)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  geos.push(tg);
  const merged = mergeGeometries(geos);
  const p = merged.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getZ(i) * 7 + p.getX(i) * 9; uv[i * 2 + 1] = p.getY(i) * 7 + p.getX(i) * 2; }
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return merged;
}

function buildAnimals(group) {
  const geos = [];
  const monkey = buildMonkeyMesh(); // one shape, re-used per placement; its fur map is the shared hide texture
  const mg = monkey.geometry;
  const strip = (g) => { const x = g.index ? g.toNonIndexed() : g.clone(); for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) x.deleteAttribute(k); return x; };
  const tint = (g, k) => { const c = g.attributes.color; for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * k[0], c.getY(i) * k[1], c.getZ(i) * k[2]); return g; };
  NOSTALGIA_SPOTS.monkeys.forEach((sp, i) => {
    const m = spotMatrix(sp); if (!m) return;
    const g = strip(mg); g.applyMatrix4(new THREE.Matrix4().makeScale(sp.s, sp.s, sp.s)); g.applyMatrix4(m);
    geos.push(tint(g, [[1, 1, 1], [1.08, 1.04, 0.98], [0.9, 0.9, 0.92]][i % 3]));
  });
  const pk = spotMatrix(NOSTALGIA_SPOTS.peacock);
  if (pk) { const g = strip(peacockGeometry()); g.applyMatrix4(pk); geos.push(g); }
  if (!geos.length) return null;
  const mesh = new THREE.Mesh(mergeGeometries(geos), createHideMaterial(0xffffff));
  monkey.geometry.dispose();
  mesh.name = 'nostalgia_animals'; mesh.castShadow = true; mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------------------------------------------
const BUILDERS = { gola: buildGola, scooter: buildScooter, motorcycle: buildMotorcycle, letterbox: buildLetterbox, tv: buildTV, ambassador: buildAmbassador, tanker: buildTanker };

/** Builds every nostalgic object and the roof animals into one group (7 draw calls) and adds it to the scene. */
export function createNostalgia(scene) {
  const group = new THREE.Group(); group.name = 'nostalgia';
  const batch = new Batch(), colliders = [], report = [];
  let seed = 11;
  for (const [kind, build] of Object.entries(BUILDERS)) {
    const sp = NOSTALGIA_SPOTS[kind];
    const world = sp && spotMatrix(sp);
    if (!world) continue;
    // per-instance variation: a hair of scale and a slight lean of tint come from the seed
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
  const animals = buildAnimals(group);
  if (animals) report.push({ kind: 'animals', tris: Math.round(animals.geometry.attributes.position.count / 3) });
  scene.add(group);
  if (typeof window !== 'undefined') window.__nostalgia = { items: report, drawCalls: group.children.length, colliders };
  return { group, colliders };
}
