import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildBovineGeometry, buildDogGeometry, createHideMaterial } from './animals.js';
import { getTiledMaterial } from './materials.js';
import { registerInteraction } from './interactions.js';
import { mapRoadLines } from './mapRoads.js';
import { colliderBoxFromTransform, STATIC_COLLIDERS, staticBoxesNear, circleHitsAnyBox, requestColliderRebuild } from './collision.js';
import { batchLateGroup } from './placeBatch.js';
import { keepOnGround, markFigure, settleDy, groundAt } from './standOn.js';
import { settlingReleased, lazyDue } from './standOn.js';

/**
 * Things that happen to the cyclist, and the animals that make an afternoon (docs/VILLAGE_VOCABULARY.md sections 8 and 3):
 *   cow    - a cow sitting in the middle of the main road, chewing, a few dung pats behind her. Solid: you ride round her.
 *   goats  - a herd of nine goats and a goatherd with a lathi crossing the cross road, back and forth, grazing on each
 *            verge between crossings. Soft: they stop and part round you, and nudge you aside rather than walling you in.
 *   dog    - a pariah dog flat out asleep under a parked wooden thela on the council lane; a second one curled by the trough.
 *   buffalo- a buffalo tied to a khoonta (wooden peg) on the cattle lane, head in a cement naand of chopped straw,
 *            a tied calf on its own peg beside her, dung and dried pats round about.
 *
 * Every site hangs off a real road centreline (src/mapRoads.js), by road name + segment + fraction, so a map change only
 * moves it along with the road. The verge sites (thela, khoonta) are searched at run time, once the static colliders
 * exist, for ground clear of every collider, like src/lifeScenes2.js.
 *
 * Draw calls (6): bovine InstancedMesh (cow, buffalo, calf) + dog InstancedMesh (2) + goat InstancedMesh (9) + one
 * capsule InstancedMesh (goatherd, characters are parked) + library 'wood' merge (thela, pegs, rope, straw) + library
 * 'concrete' merge (naand, dung). Hide material is the shared animals.js one. Only frozen library sets are used.
 */

const TILE = { wood: 1.0, concrete: 1.0 };
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const jit = (c, i, amt = 0.08) => new THREE.Color(c).multiplyScalar(1 + (rnd(i) - 0.5) * 2 * amt).getHex();
const P = (x, y, z) => new THREE.Vector3(x, y, z);
const _y = new THREE.Vector3(0, 1, 0);

// ---- where: road name, segment index, fraction along it, lateral offset (m, + = left of travel) ----
const COW_SITE = { road: 'main_road', seg: 3, t: 0.45, lat: 0.7, turn: 0.55 };
const GOAT_SITE = { road: 'cross_road', seg: 1, t: 0.16, half: 11 };
const THELA_LANE = { road: 'Council lane', seg: 0, ts: [0.6, 0.45, 0.72, 0.3, 0.85, 0.2] };
const KHOONTA_LANE = { road: 'Cattle lane', seg: 0, ts: [0.3, 0.42, 0.2, 0.55, 0.68, 0.12] };

function roadFrame(name, seg, t) {
  const line = mapRoadLines().find((l) => l.id === name || l.id.endsWith(`_${name}`));
  if (!line) return null;
  const s = Math.min(seg, line.pts.length - 2);
  const [ax, az] = line.pts[s], [bx, bz] = line.pts[s + 1];
  const L = Math.hypot(bx - ax, bz - az) || 1;
  const dx = (bx - ax) / L, dz = (bz - az) / L;
  return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx, dz, nx: -dz, nz: dx, hw: line.w / 2, yaw: Math.atan2(dx, dz) };
}
const clearAt = (x, z, r) => !circleHitsAnyBox({ x, z }, r, staticBoxesNear(x, z, r + 1));

// ---------------------------------------------------------------------------------------------------------------
// geometry helpers
function colour(geo, c) {
  const col = new THREE.Color(c), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
function clean(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
/** metre UVs: tri-planar pick per vertex by the dominant normal, so any shape tiles at the library's real scale */
function metreUV(geo, tile) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
const tm = new THREE.Matrix4();
function between(geoFn, p0, p1) { // a Y-axis primitive stretched between two points
  const d = new THREE.Vector3().subVectors(p1, p0), len = d.length();
  const g = geoFn(len);
  g.applyMatrix4(tm.makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(_y, d.normalize())).setPosition((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2));
  return g;
}

/** Per-material batch; every piece goes in already in world space with a vertex tint. */
class Batch {
  constructor() { this.by = new Map(); }
  /** `geo` in a local frame, placed by (x, y, z, yaw) of the site and its own local offset/rotation */
  add(set, geo, site, lx, ly, lz, tint, rx = 0, ry = 0, rz = 0) {
    const g = clean(geo);
    if (rx || ry || rz) g.applyMatrix4(tm.makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')));
    g.translate(lx, ly, lz);
    metreUV(g, TILE[set]);
    g.rotateY(site.yaw); g.translate(site.x, site.y || 0, site.z);
    colour(g, tint);
    if (!this.by.has(set)) this.by.set(set, []);
    this.by.get(set).push(g);
  }
  box(set, w, h, d, site, lx, ly, lz, tint, rx = 0, ry = 0, rz = 0) { this.add(set, new THREE.BoxGeometry(w, h, d), site, lx, ly, lz, tint, rx, ry, rz); }
  flush(group) {
    const out = {};
    for (const [set, list] of this.by) {
      const m = new THREE.Mesh(mergeGeometries(list), getTiledMaterial(set, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
      m.name = `road_events_${set}`; m.castShadow = true; m.receiveShadow = true; m.userData.noAutoCollider = true;
      group.add(m); out[set] = m;
    }
    return out;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// goat: Barbari-type village goat, ~0.62 m at the shoulder, local +Z front, one merged hide-UV geometry
function buildGoatGeometry() {
  const geos = [];
  const FUR = 0xffffff, DARK = 0x2a2420, HORN = 0x6a6258, PALE = 0xd8d0c0;
  const sph = (r, sx, sy, sz, x, y, z, c, ws = 10, hs = 8) => { const g = new THREE.SphereGeometry(r, ws, hs); g.scale(sx, sy, sz); g.translate(x, y, z); return colour(g, c); };
  const cap = (p0, p1, r, c) => colour(between((len) => new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 3, 7), p0, p1), c);
  const cyl = (p0, p1, rt, rb, c) => colour(between((len) => new THREE.CylinderGeometry(rt, rb, len, 6), p0, p1), c);
  geos.push(sph(0.16, 1.0, 1.08, 2.0, 0, 0.56, 0.0, FUR, 12, 10)); // barrel
  geos.push(sph(0.13, 1.0, 1.0, 1.2, 0, 0.58, -0.2, FUR)); // rump
  geos.push(sph(0.1, 0.9, 1.0, 1.1, 0, 0.6, 0.22, FUR)); // withers
  geos.push(cap(P(0, 0.62, 0.24), P(0, 0.8, 0.38), 0.065, FUR)); // neck
  geos.push(sph(0.07, 0.85, 0.95, 1.5, 0, 0.83, 0.44, FUR)); // head
  geos.push(sph(0.045, 0.8, 0.8, 1.2, 0, 0.79, 0.53, PALE)); // muzzle
  geos.push(cyl(P(0, 0.74, 0.5), P(0, 0.66, 0.52), 0.015, 0.006, DARK)); // beard
  for (const s of [-1, 1]) {
    geos.push(cap(P(s * 0.05, 0.86, 0.4), P(s * 0.13, 0.76, 0.42), 0.022, FUR)); // drooping ear
    geos.push(cyl(P(s * 0.03, 0.89, 0.42), P(s * 0.055, 0.98, 0.33), 0.016, 0.004, HORN)); // swept-back horn
    geos.push(sph(0.009, 1, 1, 1, s * 0.055, 0.85, 0.48, DARK, 5, 4)); // eye
    for (const [lz, hind] of [[0.18, 0], [-0.2, 1]]) {
      const top = P(s * 0.075, 0.5, lz), knee = P(s * 0.075, 0.24, lz + (hind ? -0.04 : 0.01)), foot = P(s * 0.075, 0.03, lz + (hind ? 0.0 : 0.01));
      geos.push(cyl(top, knee, hind ? 0.04 : 0.032, 0.02, FUR));
      geos.push(cyl(knee, foot, 0.02, 0.016, FUR));
      geos.push(sph(0.02, 1, 0.8, 1.2, foot.x, 0.02, foot.z + 0.005, DARK, 5, 4)); // hoof
    }
  }
  geos.push(cap(P(0, 0.62, -0.33), P(0, 0.72, -0.37), 0.022, FUR)); // short upright tail
  const merged = mergeGeometries(geos.map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; }));
  const pos = merged.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getZ(i) * 4 + pos.getX(i) * 5; uv[i * 2 + 1] = pos.getY(i) * 4 + pos.getX(i) * 1.5; }
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return merged;
}

/** the shared dog geometry turned onto its side: the afternoon sleep, legs out, flat on the ground */
function sleepingDogGeometry() {
  const g = buildDogGeometry();
  g.rotateZ(Math.PI / 2);
  g.translate(0.35, 0.115, 0);
  return g;
}

/** capsule placeholder plus a lathi, one geometry, white body so instance colour tints it */
function herderGeometry() {
  const body = colour(new THREE.CapsuleGeometry(0.25, 1.1, 4, 8), 0xffffff); body.translate(0, 0.8, 0);
  const stick = colour(between((len) => new THREE.CylinderGeometry(0.014, 0.017, len, 6), P(0.32, 0.02, 0.45), P(0.3, 1.55, 0.1)), 0x7a5a38);
  return mergeGeometries([body, stick].map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g.toNonIndexed(); }));
}

// ---------------------------------------------------------------------------------------------------------------
// props
function dungPats(b, site, pts, seed) {
  pts.forEach(([lx, lz, s], i) => {
    const g = new THREE.IcosahedronGeometry(0.11 * s, 1);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setY(k, y * (y > 0 ? 0.3 : 0.05)); p.setX(k, p.getX(k) * (1 + (rnd(seed + k) - 0.5) * 0.3)); }
    g.computeVertexNormals();
    const dry = i % 3 === 2; // some dried to pale grey-brown, the rest fresh and dark
    b.add('concrete', g, site, lx, 0.012, lz, jit(dry ? 0x7a6a52 : 0x3e3224, seed + i, 0.12), 0, rnd(seed + i) * 6, 0);
  });
}

/** wooden thela (handcart): plank deck with gaps, side rails, two shafts, two spoked wheels, a prop leg */
function buildThela(b, site, seed) {
  const W = 0.95, L = 1.9, DY = 0.72, wood = (i) => jit(0x8a6a48, seed + i, 0.12), worn = (i) => jit(0x9a8264, seed + i + 40, 0.1);
  for (const s of [-1, 1]) b.box('wood', 0.08, 0.1, L + 0.9, site, s * (W / 2 - 0.04), DY - 0.06, 0.25, wood(s + 3)); // long bearers that run on into the shafts
  for (let k = 0; k < 7; k++) b.box('wood', W, 0.035, 0.24, site, 0, DY + 0.01, -L / 2 + 0.14 + k * 0.27, worn(k), 0, (rnd(seed + k) - 0.5) * 0.02, 0); // deck planks, 3 cm gaps
  for (const s of [-1, 1]) b.box('wood', 0.04, 0.12, L, site, s * (W / 2 - 0.02), DY + 0.09, 0, wood(s + 7)); // side rails
  b.box('wood', W, 0.12, 0.04, site, 0, DY + 0.09, -L / 2 + 0.02, wood(9));
  for (const s of [-1, 1]) b.box('wood', 0.05, 0.05, 0.25, site, s * (W / 2 - 0.04), DY - 0.06, L / 2 + 0.75, 0x6a5038); // grip ends, darkened by hands
  // wheels: hub, 10 spokes, a rim of short chords, an iron tyre band, axle
  const R = 0.36, wz = -0.15;
  for (const s of [-1, 1]) {
    const wx = s * (W / 2 + 0.07);
    const hub = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10); hub.rotateZ(Math.PI / 2);
    b.add('wood', hub, site, wx, R, wz, 0x5a4430);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      b.add('wood', new THREE.CylinderGeometry(0.014, 0.018, R - 0.05, 5), site, wx, R + Math.sin(a) * (R - 0.05) / 2, wz + Math.cos(a) * (R - 0.05) / 2, wood(k + 11), Math.PI / 2 - a, 0, 0);
    }
    const rim = new THREE.TorusGeometry(R - 0.02, 0.03, 5, 20); rim.rotateY(Math.PI / 2);
    b.add('wood', rim, site, wx, R, wz, 0x6a5038);
    const tyre = new THREE.TorusGeometry(R, 0.012, 4, 24); tyre.rotateY(Math.PI / 2);
    b.add('wood', tyre, site, wx, R, wz, 0x3a3634);
  }
  const axle = new THREE.CylinderGeometry(0.025, 0.025, W + 0.25, 6); axle.rotateZ(Math.PI / 2);
  b.add('wood', axle, site, 0, R, wz, 0x3e3a36);
  b.box('wood', 0.06, DY - 0.1, 0.06, site, 0, (DY - 0.1) / 2, -L / 2 + 0.12, wood(20)); // rear prop leg, so it stands level
  // a folded jute sack and a rolled rope on the deck (wood set, tinted)
  b.box('wood', 0.55, 0.06, 0.4, site, 0.12, DY + 0.06, -0.35, 0xb8a27a, 0, 0.2, 0);
  const coil = new THREE.TorusGeometry(0.12, 0.02, 5, 14); coil.rotateX(Math.PI / 2);
  b.add('wood', coil, site, -0.22, DY + 0.05, 0.4, 0xc0aa80);
}

/** khoonta + naand: a wooden peg with a rope to the buffalo, a cement trough of chopped straw, a calf's peg */
function buildKhoonta(b, site, seed) {
  // trough (naand): four cement walls + floor, rim chipped by shifting the tint per wall
  const TW = 1.5, TD = 0.62, TH = 0.42, t = 0.08, tz = 1.75;
  for (const [w, d, x, z, i] of [[TW, t, 0, -TD / 2 + t / 2, 0], [TW, t, 0, TD / 2 - t / 2, 1], [t, TD, -TW / 2 + t / 2, 0, 2], [t, TD, TW / 2 - t / 2, 0, 3]]) {
    b.box('concrete', w, TH, d, site, x, TH / 2, tz + z, jit(0x9e968a, seed + i, 0.1));
  }
  b.box('concrete', TW - 0.1, 0.05, TD - 0.1, site, 0, 0.1, tz, 0x6e665a);
  b.box('concrete', TW + 0.2, 0.05, TD + 0.25, site, 0, 0.025, tz, jit(0x7a7266, seed + 9)); // apron, wet-stained darker
  // chopped straw heaped in it: a lumpy plane, wood grain tinted to bhusa gold
  const straw = new THREE.PlaneGeometry(TW - 0.16, TD - 0.16, 10, 5); straw.rotateX(-Math.PI / 2);
  { const p = straw.attributes.position; for (let k = 0; k < p.count; k++) p.setY(k, 0.06 * Math.sin(p.getX(k) * 7 + seed) * Math.cos(p.getZ(k) * 9) + 0.04 * (1 - Math.abs(p.getX(k)) / TW)); straw.computeVertexNormals(); }
  b.add('wood', straw, site, 0, TH - 0.1, tz, 0xc8ac6a);
  for (let k = 0; k < 6; k++) b.box('wood', 0.12, 0.008, 0.012, site, (rnd(seed + k) - 0.5) * 1.6, 0.006, tz + 0.5 + rnd(k + 3) * 0.4, 0xc8b078, 0, rnd(k) * 3, 0); // spilt straws
  // khoonta: peg leaning a little, worn smooth at the top where the rope runs
  const pegs = [[0.55, 1.1, 0.62], [-1.9, 0.4, 0.48]];
  pegs.forEach(([px, pz, h], i) => {
    b.add('wood', new THREE.CylinderGeometry(0.05, 0.065, h, 8), site, px, h / 2 - 0.02, pz, jit(0x6e5238, seed + i), 0.06 * (i ? -1 : 1), 0, 0.05);
    const knot = new THREE.TorusGeometry(0.07, 0.018, 5, 10); knot.rotateX(Math.PI / 2);
    b.add('wood', knot, site, px, h - 0.18, pz, 0xb8a070);
  });
  // ropes: peg to buffalo's neck, peg to calf's neck (thin jute-tinted cylinders, a little slack via a midpoint)
  const rope = (a, m, c) => { for (const [p0, p1] of [[a, m], [m, c]]) b.add('wood', between((len) => new THREE.CylinderGeometry(0.012, 0.012, len, 4), p0, p1), site, 0, 0, 0, 0xb09a6a); };
  rope(P(0.55, 0.42, 1.1), P(0.35, 0.55, 0.85), P(0.08, 1.15, 0.72));
  rope(P(-1.9, 0.26, 0.4), P(-1.75, 0.35, 0.05), P(-1.62, 0.66, -0.25));
  dungPats(b, site, [[-0.5, -1.4, 1.2], [0.3, -1.6, 0.9], [-0.2, -2.0, 1.0], [0.9, -1.2, 0.8], [-2.3, -0.9, 0.7], [1.5, 0.2, 1.1], [-0.9, -2.3, 0.9]], seed + 50);
}

// ---------------------------------------------------------------------------------------------------------------
export function createRoadEvents(scene) {
  const group = new THREE.Group(); group.name = 'road_events';
  scene.add(group);
  batchLateGroup(group, group.name); // code-built tiled meshes join the shared per-material batches (src/placeBatch.js)
  const info = { placed: {}, drawCalls: 0, tris: 0 };
  if (typeof window !== 'undefined') window.__roadEvents = info;
  let built = false, frames = 0, last = 0, elapsed = 0;
  let bovine = null, lying = null, dogs = null, goats = null, herder = null, player = null;
  const bov = [], slp = [], herd = [];
  let crossing = null;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

  function build() {
    const b = new Batch();
    const colliders = [];
    const box = (w, d, site, lx, lz, ry = 0, animal = false) => {
      const m = new THREE.Matrix4().makeRotationY(site.yaw).setPosition(site.x, 0, site.z).multiply(new THREE.Matrix4().makeTranslation(lx, 0, lz)).multiply(new THREE.Matrix4().makeRotationY(ry));
      const c = colliderBoxFromTransform(w, d, m); if (animal) c.animalBox = true; colliders.push(c);
    };

    // 1. the cow in the middle of the main road
    const cf = roadFrame(COW_SITE.road, COW_SITE.seg, COW_SITE.t);
    if (cf) {
      const site = { x: cf.x + cf.nx * COW_SITE.lat, z: cf.z + cf.nz * COW_SITE.lat, yaw: cf.yaw + COW_SITE.turn };
      bov.push({ x: site.x, y: 0, z: site.z, yaw: site.yaw, s: [1, 1, 1], tint: 0xd6ccb4, sit: true, ph: 0.4 }); // lying-down geometry, belly and folded legs on the road (G1)
      box(2.05, 0.95, site, 0, 0.1, 0, true);
      dungPats(b, site, [[0.15, -1.45, 1.1], [-0.3, -1.9, 0.8], [0.5, -2.6, 1.0]], 11);
      registerInteraction({
        id: 'feed_road_cow',
        position: new THREE.Vector3(site.x, 0, site.z),
        radius: 2.6,
        label: { hi: 'गाय को रोटी खिलाएं', en: 'Feed the cow a roti' },
        onInteract: (ctx) => ctx.dialogue.say([{ hi: 'गाय ने रोटी चबाई और आँखें मूँद लीं। गौ माता का आशीर्वाद!', en: 'The cow takes the roti, chews slowly and shuts her eyes. Blessings of Gau Mata.' }]),
      });
      info.placed.cow = { x: +site.x.toFixed(2), z: +site.z.toFixed(2), road: COW_SITE.road, clear: clearAt(site.x, site.z, 1.1) };
    }

    // 2. goat herd crossing the cross road: find a crossing whose both verges are clear
    for (const t of [GOAT_SITE.t, 0.13, 0.2, 0.1, 0.24, 0.28]) {
      const f = roadFrame(GOAT_SITE.road, GOAT_SITE.seg, t);
      if (!f) break;
      for (let half = GOAT_SITE.half; half >= 7; half -= 2) {
        let ok = true;
        for (let u = -half - 6; u <= half + 6 && ok; u += 1.5) ok = clearAt(f.x + f.nx * u, f.z + f.nz * u, 1.6);
        if (ok) { crossing = { f, half }; break; }
      }
      if (crossing) break;
    }
    if (crossing) {
      const n = 9;
      const tints = [0x2e2a28, 0x34302c, 0x6a4a32, 0xd6cec0, 0x2a2624, 0x8a6a4a, 0x3a3430, 0xcfc4b0, 0x5a4434];
      for (let i = 0; i < n; i++) {
        herd.push({ along: 2.4 - i * 0.55 - rnd(i) * 0.6, lat: (rnd(i + 30) - 0.5) * 2.4, s: 0.85 + rnd(i + 60) * 0.3, tint: tints[i], ph: rnd(i + 90) * 6.28, x: 0, z: 0, yaw: 0, dodge: new THREE.Vector2(), graze: 0 });
      }
      crossing.u = -crossing.half; crossing.dir = 1; crossing.wait = 6; crossing.speed = 0;
      info.placed.goats = { x: +crossing.f.x.toFixed(2), z: +crossing.f.z.toFixed(2), road: GOAT_SITE.road, span: crossing.half * 2 };
    }

    // 3. thela on the council lane verge, a dog asleep in its shade
    const verge = (spec, off, r) => {
      for (const t of spec.ts) {
        const f = roadFrame(spec.road, spec.seg, t);
        if (!f) return null;
        for (const side of [1, -1]) {
          const x = f.x + f.nx * side * (f.hw + off), z = f.z + f.nz * side * (f.hw + off);
          if (clearAt(x, z, r)) return { x, z, yaw: f.yaw + (side > 0 ? 0 : Math.PI), f, side, t };
        }
      }
      return null;
    };
    const th = verge(THELA_LANE, 1.4, 1.5);
    if (th) {
      const site = { x: th.x, z: th.z, yaw: th.yaw + 0.12 }; // parked along the lane edge, slightly askew
      buildThela(b, site, 7);
      box(1.3, 2.9, site, 0, 0.25);
      const p = new THREE.Vector3(0.05, 0, -0.2).applyAxisAngle(_y, site.yaw);
      slp.push({ x: site.x + p.x, z: site.z + p.z, yaw: site.yaw + 0.25, s: 1.05, tint: 0xa88456, ph: 0 });
      info.placed.thela = { x: +site.x.toFixed(2), z: +site.z.toFixed(2), lane: THELA_LANE.road, t: th.t };
    }

    // 4. buffalo tied at a khoonta on the cattle lane verge
    const kh = verge(KHOONTA_LANE, 3.4, 3.0);
    if (kh) {
      const site = { x: kh.x, z: kh.z, yaw: kh.yaw + Math.PI / 2 }; // +z of the site points toward the lane on side +1: naand nearest the lane, dung behind
      buildKhoonta(b, site, 23);
      const at = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyAxisAngle(_y, site.yaw).add(new THREE.Vector3(site.x, 0, site.z));
      const bp = at(0.05, -0.15), cp = at(-1.55, -0.85);
      bov.push({ x: bp.x, y: 0, z: bp.z, yaw: site.yaw + 0.04, s: [1.14, 1.1, 1.24], tint: 0x34322e, graze: true, ph: 1.3 });
      bov.push({ x: cp.x, y: 0, z: cp.z, yaw: site.yaw + 2.6, s: [0.56, 0.58, 0.56], tint: 0x5a4a3c, ph: 2.2 }); // calf, brown-grey
      box(1.2, 2.6, site, 0.05, -0.1, 0, true); // buffalo
      box(0.6, 1.2, site, -1.55, -0.85, 2.6, true); // calf
      box(1.6, 0.7, site, 0, 1.75); // naand
      const dp = at(1.6, 0.3);
      slp.push({ x: dp.x, z: dp.z, yaw: site.yaw - 1.2, s: 0.9, tint: 0x6e5a44, ph: 2 });
      box(0.9, 0.5, site, 1.6, 0.3, -1.2, true);
      info.placed.khoonta = { x: +site.x.toFixed(2), z: +site.z.toFixed(2), lane: KHOONTA_LANE.road, t: kh.t };
    }

    // meshes
    const meshes = b.flush(group);
    const hideMat = createHideMaterial(0xffffff);
    const standing = bov.filter((a) => !a.sit), sitting = bov.filter((a) => a.sit);
    if (standing.length) {
      bovine = new THREE.InstancedMesh(buildBovineGeometry(), hideMat, standing.length);
      bovine.name = 'road_events_bovine';
      standing.forEach((a, i) => { a.mesh = bovine; a.idx = i; bovine.setColorAt(i, _c.setHex(a.tint)); });
      group.add(bovine);
    }
    if (sitting.length) {
      lying = new THREE.InstancedMesh(buildBovineGeometry({ lying: true }), hideMat, sitting.length);
      lying.name = 'road_events_bovine_lying';
      sitting.forEach((a, i) => { a.mesh = lying; a.idx = i; lying.setColorAt(i, _c.setHex(a.tint)); });
      group.add(lying);
    }
    if (slp.length) {
      dogs = new THREE.InstancedMesh(sleepingDogGeometry(), hideMat, slp.length);
      dogs.name = 'road_events_dogs';
      slp.forEach((a, i) => dogs.setColorAt(i, _c.setHex(a.tint)));
      group.add(dogs);
    }
    if (herd.length) {
      goats = new THREE.InstancedMesh(buildGoatGeometry(), hideMat, herd.length);
      goats.name = 'road_events_goats'; goats.frustumCulled = false;
      herd.forEach((g, i) => goats.setColorAt(i, _c.setHex(g.tint)));
      group.add(goats);
      herder = new THREE.InstancedMesh(herderGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.85, vertexColors: true }), 1);
      herder.name = 'road_events_goatherd'; herder.frustumCulled = false;
      herder.setColorAt(0, _c.setHex(0xcfc4a8)); // faded off-white kurta
      group.add(herder);
    }
    for (const m of [bovine, lying, dogs, goats, herder]) if (m) { markFigure(m); m.castShadow = true; m.receiveShadow = true; m.userData.noAutoCollider = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    (meshes.wood || meshes.concrete || group.children[0]).userData.colliderBoxes = colliders;
    animate(0);
    // feet on the road / verge surface (src/standOn.js): standing and lying cattle and the sleeping dogs settle once their
    // surroundings are in; goats and the goatherd walk, so they read the surface every frame (stepHerd)
    keepOnGround(group, (scene) => {
      animate(0);
      bov.forEach((a) => { const dy = settleDy(scene, a.mesh, a.idx); if (Math.abs(dy) < 1.2) a.y += dy; });
      slp.forEach((a, i) => { const dy = settleDy(scene, dogs, i); if (Math.abs(dy) < 1.2) a.y = (a.y || 0) + dy; });
      animate(0);
    });
    group.updateMatrixWorld(true);
    group.traverse((o) => { if (o.isMesh) { info.drawCalls++; const g = o.geometry; info.tris += Math.round((g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1)); } });
    info.colliders = colliders.length;
  }

  function stepHerd(dt) {
    const c = crossing, f = c.f;
    player = player || scene.getObjectByName('player');
    // the herd waits while you are right in front of it, then walks on
    let blocked = false;
    if (player) {
      const hx = f.x + f.nx * c.u, hz = f.z + f.nz * c.u;
      const ax = (player.position.x - hx) * f.nx + (player.position.z - hz) * f.nz; // along the crossing
      const lx = (player.position.x - hx) * f.dx + (player.position.z - hz) * f.dz;
      blocked = ax * c.dir > -2 && ax * c.dir < 5.5 && Math.abs(lx) < 2.6;
    }
    if (c.wait > 0) { c.wait -= dt; c.speed = 0; }
    else {
      c.speed += ((blocked ? 0.06 : 0.5) - c.speed) * Math.min(1, dt * 2);
      c.u += c.dir * c.speed * dt;
      if (c.u * c.dir >= c.half) { c.u = c.dir * c.half; c.dir = -c.dir; c.wait = 18 + rnd(elapsed) * 12; } // graze on the verge, then cross back
    }
    const grazing = c.wait > 0;
    const first = !c.started; c.started = true;
    const ease = (o, tx, tz, vmax) => { // walk toward a target at a capped speed, turning to face the way it moves
      const vx = tx - o.x, vz = tz - o.z, d = Math.hypot(vx, vz), stepLen = Math.min(d, vmax * dt);
      if (first) { o.x = tx; o.z = tz; o.yaw = Math.atan2(f.nx * c.dir, f.nz * c.dir); return 0; }
      if (d > 1e-4) { o.x += vx / d * stepLen; o.z += vz / d * stepLen; }
      const sp = dt > 0 ? stepLen / dt : 0;
      if (sp > 0.06) { let dy = Math.atan2(vx, vz) - o.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); o.yaw += dy * Math.min(1, dt * 3); }
      return sp;
    };
    herd.forEach((g, i) => {
      // grazing spreads them round the herd centre; walking packs them into a loose file, leader first
      const spread = grazing ? 1.6 : 1;
      const along = c.u + c.dir * g.along * spread + Math.sin(elapsed * 0.3 + g.ph) * (grazing ? 0.5 : 0.15);
      const lat = g.lat * spread + Math.sin(elapsed * 0.5 + g.ph * 2) * 0.25;
      let tx = f.x + f.nx * along + f.dx * lat, tz = f.z + f.nz * along + f.dz * lat;
      // part round the player: each goat steps sideways, and nudges a slow player gently aside (soft, never a wall)
      if (player) {
        const dx = g.x - player.position.x, dz = g.z - player.position.z, d = Math.hypot(dx, dz);
        if (d < 1.2 && d > 1e-3) g.dodge.addScaledVector(new THREE.Vector2(dx / d, dz / d), (1.2 - d) * dt * 5);
        if (d < 0.62 && d > 1e-3 && player.parent === scene) {
          const push = (0.62 - d) * 0.35, nx = player.position.x - dx / d * push, nz = player.position.z - dz / d * push;
          if (clearAt(nx, nz, 0.45)) { player.position.x = nx; player.position.z = nz; }
        }
      }
      g.dodge.multiplyScalar(1 - Math.min(1, dt * 0.6));
      tx += g.dodge.x; tz += g.dodge.y;
      const sp = ease(g, tx, tz, grazing ? 0.45 : 0.9);
      g.graze += ((grazing && sp < 0.2 ? 0.35 + Math.sin(elapsed * 0.7 + g.ph) * 0.12 : 0.02) - g.graze) * Math.min(1, dt * 1.5);
      const walking = sp > 0.1;
      // no head-down pitch: the goat is one rigid piece, and pitching it about its middle buried the forelegs (G1).
      // Grazing reads as a slow turn of the whole goat; walking keeps a small roll and a 2 cm step lift.
      _e.set(0, g.yaw + g.graze * Math.sin(elapsed * 0.6 + g.ph) * 0.25, walking ? Math.sin(elapsed * 9 + g.ph) * 0.03 : 0);
      if (g.px === undefined || Math.abs(g.x - g.px) + Math.abs(g.z - g.pz) > 0.15) { g.y = groundAt(scene, g.x, g.z, g.y ?? 0, false); g.px = g.x; g.pz = g.z; } const gy = g.y ?? 0; // re-probe the ground only after 15 cm of travel, on the cached index
      _q.setFromEuler(_e); _p.set(g.x, gy + (walking ? Math.abs(Math.sin(elapsed * 9 + g.ph)) * 0.02 : 0), g.z); _s.setScalar(g.s);
      goats.setMatrixAt(i, _m.compose(_p, _q, _s));
    });
    goats.instanceMatrix.needsUpdate = true;
    // goatherd at the back of the file, a little to one side, lathi swinging with his stride
    const back = c.u - c.dir * (grazing ? 5.5 : 4.2);
    const hs = ease(c.herder || (c.herder = { x: 0, z: 0, yaw: 0 }), f.x + f.nx * back + f.dx * 1.2, f.z + f.nz * back + f.dz * 1.2, 1.1);
    const h = c.herder;
    const hyaw = hs > 0.1 ? h.yaw : Math.atan2(f.nx * c.dir, f.nz * c.dir) + (grazing ? Math.sin(elapsed * 0.2) * 0.8 : 0);
    _e.set(hs > 0.1 ? Math.sin(elapsed * 4.5) * 0.05 : 0, hyaw, 0);
    if (h.px === undefined || Math.abs(h.x - h.px) + Math.abs(h.z - h.pz) > 0.15) { h.y = groundAt(scene, h.x, h.z, h.y ?? 0, false); h.px = h.x; h.pz = h.z; }
    _q.setFromEuler(_e); _p.set(h.x, h.y + (hs > 0.1 ? Math.abs(Math.sin(elapsed * 4.5)) * 0.02 : 0), h.z); _s.set(1, 1, 1);
    herder.setMatrixAt(0, _m.compose(_p, _q, _s));
    herder.instanceMatrix.needsUpdate = true;
  }

  function animate(dt) {
    elapsed += dt;
    if (bov.length) {
      bov.forEach((a) => {
        // lying cow: chewing-cud sway and breath; buffalo at the naand: slow shift of weight. No pitch: a rigid body
        // pitched about its middle drives the front hooves into the ground (G1), so the motion stays a turn and a breath.
        const w = Math.sin(elapsed * (a.sit ? 1.6 : 0.4) + a.ph);
        _e.set(0, a.yaw + (a.sit ? w * 0.025 : w * 0.01), 0);
        const br = 1 + Math.sin(elapsed * 1.1 + a.ph) * 0.012;
        _q.setFromEuler(_e); _p.set(a.x, a.y, a.z); _s.set(a.s[0] * br, a.s[1], a.s[2]);
        a.mesh.setMatrixAt(a.idx, _m.compose(_p, _q, _s));
        a.mesh.instanceMatrix.needsUpdate = true;
      });
    }
    if (dogs) {
      slp.forEach((a, i) => {
        const br = 1 + Math.sin(elapsed * 1.4 + a.ph) * 0.035; // slow sleeping breath, ribs rising
        _e.set(0, a.yaw, 0); _q.setFromEuler(_e); _p.set(a.x, a.y || 0, a.z); _s.set(a.s, a.s * br, a.s);
        dogs.setMatrixAt(i, _m.compose(_p, _q, _s));
      });
      dogs.instanceMatrix.needsUpdate = true;
    }
    if (goats && crossing) stepHerd(dt);
  }

  // Driven from the scene's render callback (chained, as src/lifeScenes2.js) so main.js needs only the one call.
  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    if (prev) prev.apply(this, args);
    if (settlingReleased()) frames++; // load time: lazy builds wait for the opening view (docs/perf-2026-11-08.md)
    if (!built && lazyDue(frames, 30) && STATIC_COLLIDERS.length > 0) { built = true; build(); requestColliderRebuild(); }
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, last ? now - last : 0); last = now;
    if (built) animate(dt);
  };
  return { group };
}
