import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTiledMaterial, texturedBox } from './materials.js';
import { colliderBoxFromTransform } from './collision.js';
import { createWideSignAtlas, mapFrontFaceToRow } from './signboards.js';

/**
 * Milk collection centre (docs/VILLAGE_VOCABULARY.md section 4): a plank-built open-fronted shed on the west side of the
 * main road, south of the square. Steel cans stacked at the back, a counter with a platform scale, a measuring jug and
 * a ledger, a queue of three villagers each holding a can, and a cyclist with two cans hung from the handlebar.
 * No Map-given coordinate exists for it; the spot (world 597.3, 49.3, fronting the main road) is a free shopfront slot
 * from the small-shops scout (tmp/smallshops/spots.json), footprint plus 0.5 m clear of every collider.
 *
 * Materials: frozen library sets only (wood, metal) at arch.py tiling (wood 1.0, metal 1.0 m per tile). Cost: 3 draw
 * calls = 1 wood mesh (shed, counter, bench, villagers as tinted placeholder bodies, characters are parked) + 1 metal
 * mesh (cans, scale, jug, bicycle) + 1 signboard mesh.
 */
const SITE = { x: 597.31, z: 49.31, ry: 1.401 }; // local +z faces the main road
const SIGN = { hi: 'दूध संग्रह केंद्र', en: 'Milk Collection Centre', bg: '#e6ddc4', fg: '#14305a', border: '#1f4a7a' };
const TILE = { wood: 1.0, metal: 1.0 };
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const jit = (c, i, amt = 0.08) => new THREE.Color(c).multiplyScalar(1 + (rnd(i) - 0.5) * 2 * amt).getHex();

function tintGeo(geo, tint) {
  const n = geo.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color(tint);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
function planarUV(geo, axis, tile) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (axis === 'y') uv.setXY(i, x / tile, z / tile); else if (axis === 'z') uv.setXY(i, x / tile, y / tile); else uv.setXY(i, z / tile, y / tile);
  }
  return geo;
}

const by = new Map();
const add = (key, geo) => { if (!by.has(key)) by.set(key, []); by.get(key).push(geo); };
function place(geo, lx, ly, lz, yaw = 0, roll = 0, pitch = 0) {
  if (pitch) geo.rotateX(pitch);
  if (roll) geo.rotateZ(roll);
  if (yaw) geo.rotateY(yaw);
  geo.translate(lx, ly, lz); geo.rotateY(SITE.ry); geo.translate(SITE.x, 0, SITE.z);
  return geo;
}
const box = (set, w, h, d, lx, ly, lz, tint, yaw = 0, roll = 0, pitch = 0) =>
  add(set, place(texturedBox(w, h, d, set, { tileSize: TILE[set], tint }).geometry, lx, ly, lz, yaw, roll, pitch));
const lib = (set, geo, lx, ly, lz, tint, yaw = 0, roll = 0, pitch = 0) =>
  add(set, place(tintGeo(geo.index ? geo.toNonIndexed() : geo, tint), lx, ly, lz, yaw, roll, pitch));

// One steel can, 0.8 m tall at scale 1: flared foot, body, shoulder, neck, domed lid, knob, two rolled bands.
const CAN_PROF = [[0.0, 0.0], [0.19, 0.0], [0.215, 0.04], [0.2, 0.08], [0.2, 0.5], [0.19, 0.56], [0.14, 0.62], [0.115, 0.66], [0.115, 0.7], [0.13, 0.71]].map(([r, y]) => new THREE.Vector2(r, y));
function canGeo(tone) {
  const parts = [new THREE.LatheGeometry(CAN_PROF, 16)];
  parts.push(new THREE.SphereGeometry(0.135, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).translate(0, 0.71, 0));
  parts.push(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8).translate(0, 0.8, 0));
  for (const y of [0.1, 0.46]) parts.push(new THREE.TorusGeometry(0.205, 0.014, 5, 16).rotateX(Math.PI / 2).translate(0, y, 0));
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  return planarUV(g, 'z', TILE.metal);
}
const can = (lx, lz, i, y = 0, s = 1, lean = 0) => {
  const g = canGeo(); g.scale(s, s, s);
  lib('metal', g, lx, y, lz, jit([0xb9bdc0, 0xaeb4b8, 0xc4c8ca][i % 3], i, 0.05), rnd(i) * 6.28, lean);
};
const person = (lx, lz, h, tint, i) => {
  const g = new THREE.CapsuleGeometry(0.27, h - 0.54, 3, 8); planarUV(g, 'x', 1);
  lib('wood', g, lx, h / 2, lz, tint, rnd(i) * 3);
};

export function createMilkCentre(scene) {
  by.clear();
  const colliders = [];
  const W = 3.2, D = 2.4;
  // ---- shed: plank floor, back and side walls, two front posts, pitched plank roof falling toward the road ----
  box('wood', W + 0.3, 0.12, D + 0.3, 0, 0.06, 0, 0x9a8a78);
  box('wood', W, 2.3, 0.12, 0, 1.27, -D / 2 + 0.06, 0xb09a7a);
  for (const sx of [-1, 1]) box('wood', 0.12, 2.3, D - 0.1, sx * (W / 2 - 0.06), 1.27, 0, jit(0xa8926f, sx + 4));
  for (const sx of [-1, 1]) box('wood', 0.12, 2.35, 0.12, sx * (W / 2 - 0.06), 1.3, D / 2 - 0.1, 0x7a5c3c);
  box('wood', W + 0.7, 0.09, D + 0.9, 0, 2.5, 0.2, 0x8c7456, 0, 0, 0.07);
  box('wood', W + 0.7, 0.05, 0.1, 0, 2.38, D / 2 + 0.62, 0x6a4e32);
  // ---- counter with platform scale, jug and ledger ----
  const cz = 0.35;
  box('wood', 2.3, 0.84, 0.55, 0.1, 0.12 + 0.42, cz, 0x7a5a3c);
  box('wood', 2.42, 0.05, 0.66, 0.1, 0.12 + 0.865, cz, 0x6a4c32);
  box('metal', 0.38, 0.04, 0.32, -0.55, 1.07, cz, 0x9a9a96); // scale platform
  box('metal', 0.1, 0.1, 0.1, -0.55, 1.0, cz - 0.05, 0x5a5a56); // scale body
  box('metal', 0.04, 0.55, 0.04, -0.55, 1.34, cz - 0.17, 0x7a7a76); // column
  const dial = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16); dial.rotateX(Math.PI / 2); planarUV(dial, 'z', TILE.metal);
  lib('metal', dial, -0.55, 1.58, cz - 0.15, 0xd0d0cc); // dial
  can(-0.55, cz, 3, 1.09, 0.55); // can being weighed
  const jug = new THREE.CylinderGeometry(0.1, 0.08, 0.2, 14); planarUV(jug, 'z', TILE.metal);
  lib('metal', jug, 0.5, 1.15, cz, 0xc4c4c0); // steel measuring jug
  const handle = new THREE.TorusGeometry(0.05, 0.01, 4, 8, Math.PI); planarUV(handle, 'z', TILE.metal);
  lib('metal', handle, 0.6, 1.15, cz, 0xc4c4c0, Math.PI / 2);
  box('wood', 0.3, 0.03, 0.22, 1.0, 1.0, cz, 0x6a4a34, 0.2); // ledger
  // ---- full cans stacked on a rack at the back, two rows of four, and some already on the ground by the counter ----
  box('wood', 2.6, 0.1, 0.9, 0.1, 0.22, -D / 2 + 0.6, 0x6a5238);
  for (let i = 0; i < 8; i++) can(-0.95 + (i % 4) * 0.62, -D / 2 + 0.45 + Math.floor(i / 4) * 0.45, i, 0.27);
  for (let i = 0; i < 3; i++) can(1.35 + i * 0.4, 0.75 + (i % 2) * 0.1, i + 10, 0.12);
  person(0.2, -0.45, 1.62, 0x6a5a8a, 1); // the collector behind the counter
  // ---- queue of three villagers outside, each holding a can ----
  const qz = 2.25;
  [[-1.2, 1.62, 0x8a6a4a], [-0.4, 1.5, 0x5a7a6a], [0.4, 1.68, 0x9a5a4a]].forEach(([qx, h, t], i) => {
    person(qx, qz, h, t, 20 + i);
    can(qx + 0.36, qz + 0.08, 30 + i, 0.02, 0.9);
    colliders.push([qx + 0.1, qz, 1.1, 0.7]);
  });
  // ---- cyclist standing astride a bicycle, two cans hung from the handlebar ----
  const bx = 2.35, bz = 2.1, by0 = 0; // bike runs along local x (parallel to the road), front wheel at +x
  const wheel = () => { const g = new THREE.TorusGeometry(0.34, 0.016, 5, 20); planarUV(g, 'z', TILE.metal); return g; };
  for (const wx of [-0.55, 0.55]) lib('metal', wheel(), bx + wx, 0.36, bz, 0x3a3a38);
  const bar = (x1, y1, x2, y2, z = 0) => {
    const L = Math.hypot(x2 - x1, y2 - y1), g = new THREE.CylinderGeometry(0.014, 0.014, L, 5); planarUV(g, 'x', TILE.metal);
    lib('metal', g, bx + (x1 + x2) / 2, by0 + (y1 + y2) / 2, bz + z, 0x2e3a4a, 0, Math.atan2(x2 - x1, y2 - y1) * -1);
  };
  bar(-0.55, 0.36, -0.1, 0.72); bar(-0.1, 0.72, 0.45, 0.76); bar(-0.55, 0.36, 0.0, 0.36); bar(0.0, 0.36, -0.1, 0.72); bar(0.0, 0.36, 0.45, 0.76); bar(0.45, 0.76, 0.55, 0.36); // frame + fork
  const hb = new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5); hb.rotateX(Math.PI / 2); planarUV(hb, 'x', TILE.metal);
  lib('metal', hb, bx + 0.45, 0.96, bz, 0x1e1e1e); // handlebar across the bike
  bar(0.45, 0.76, 0.45, 0.96);
  box('metal', 0.34, 0.06, 0.12, bx - 0.15, 0.75, bz, 0x2a2a28); // saddle
  box('metal', 0.5, 0.02, 0.14, bx - 0.72, 0.66, bz, 0x4a4a46); // rear carrier
  for (const sz of [-0.24, 0.24]) can(bx + 0.45, bz + sz, 40 + (sz > 0 ? 1 : 0), 0.3, 0.62); // cans hung from the bars
  person(bx - 0.15, bz, 1.68, 0x4a6a8a, 50); // rider, placeholder body
  colliders.push([bx, bz, 2.0, 0.8]);
  colliders.push([0, 0, W + 0.4, D + 0.3]); // the shed

  const group = new THREE.Group(); group.name = 'milk_centre';
  const meshes = {};
  for (const [key, list] of by) {
    const norm = list.map((g) => { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) x.deleteAttribute(k); return x; });
    const m = new THREE.Mesh(mergeGeometries(norm), getTiledMaterial(key, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
    m.name = `milk_centre_${key}`; m.castShadow = true; m.receiveShadow = true;
    group.add(m); meshes[key] = m;
  }
  const world = new THREE.Matrix4().makeRotationY(SITE.ry).setPosition(SITE.x, 0, SITE.z);
  meshes.wood.userData.colliderBoxes = colliders.map(([x, z, w, d]) => colliderBoxFromTransform(w, d, new THREE.Matrix4().multiplyMatrices(world, new THREE.Matrix4().makeTranslation(x, 0, z))));

  // signboard on the fascia: Hindi bold line 1, English line 2 (shared atlas helper)
  const atlas = createWideSignAtlas([SIGN]);
  const sw = 2.9, sg = new THREE.BoxGeometry(sw, sw / 4.41, 0.04);
  mapFrontFaceToRow(sg, 0, atlas.rows);
  sg.translate(0, 2.0, D / 2 + 0.55); sg.rotateX(0.07); sg.rotateY(SITE.ry); sg.translate(SITE.x, 0, SITE.z);
  const signMesh = new THREE.Mesh(sg, Object.assign(new THREE.MeshStandardMaterial({ map: atlas.texture, roughness: 0.85 }), { name: 'signboard' }));
  signMesh.name = 'milk_centre_sign'; signMesh.castShadow = true;
  group.add(signMesh);

  scene.add(group);
  if (typeof window !== 'undefined') window.__milkCentre = { x: SITE.x, z: SITE.z, drawCalls: group.children.length };
  return { group };
}
