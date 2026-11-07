import * as THREE from 'three';
import { batchPeopleMesh, refreshPeopleMesh } from './placeBatch.js';
import { keepOnGround, markFigure, settleInstances } from './standOn.js';
import { texturedBox, getTiledMaterial, bakeFlatTintColors } from './materials.js';
import { mergeMeshList } from './mergeUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CHAURAHA } from './mapPlan.js';
import { ensureUv2 } from './materials.js';
import { createWideSignAtlas, mapFrontFaceToRow } from './signboards.js';

/**
 * Edge life round the chauraha (docs/SPATIAL_SENSE.md section 1: "the square is ringed by fronts, never filled").
 * The 12 m circle round the zero milestone (602.9, 19.9) stays EMPTY. Outside it, 14-24 m from the milestone, four rows
 * of fronts look in at it:
 *   west row   (x ~ 585, facing east):  house, kirana (open), house
 *   north row  (z ~ -2, facing south):  tea shop, tailor, cycle repair, all open, on the far side of the cross road
 *   east row   (x ~ 629, facing west):  bangle shop and a cloth shop, open
 *   south row  (z ~ 41, facing north):  house and a kirana
 * and people sit at the corners: men on charpais with tea glasses, a carrom game, a bench of old men, two customers.
 * Open shops: limewashed plaster walls, shutter rolled up under the lintel with its guide rails, plank counter, shelves of
 * goods, a striped tarpaulin awning on poles, a painted Hindi-over-English signboard. Houses: plinth, plaster front, framed
 * door with handle, two barred windows with sills and open leaves, tin roof, a few daily-life props.
 *
 * Positions were scouted against the full static collider list and the road centrelines (tmp/chaurahaedges/scout.json)
 * with 0.8 m margin. Everything is the frozen library (plaster, concrete, wood, metal, tin, jute, tarpaulin, terracotta);
 * colour rides in vertex tint; merged to one mesh per material. People are the usual capsule stand-ins (soft: top-level
 * name starts 'ambient_life'). Solid geometry gets its collider from the auto pass like src/lifeScenes.js.
 * No brands, no tobacco, no alcohol, no shrines.
 */
const SIGNS = {
  kirana: { hi: 'किराना स्टोर', en: 'General Store', bg: '#ece0c4', fg: '#5a1a14', border: '#7a2a1c' },
  tea: { hi: 'चाय की दुकान', en: 'Tea Shop', bg: '#e6dcc2', fg: '#1f2a4a', border: '#2a3a66' },
  tailor: { hi: 'दर्ज़ी', en: 'Tailor', bg: '#efe3c8', fg: '#16402a', border: '#1f5a3a' },
  cycle: { hi: 'साइकिल मरम्मत', en: 'Cycle Repair', bg: '#e9dfc6', fg: '#6e1a12', border: '#8a2a18' },
  bangle: { hi: 'मनिहारी भंडार', en: 'Bangle Shop', bg: '#f0dfb8', fg: '#4a1a40', border: '#6a2a5a' },
  cloth: { hi: 'कपड़ा भंडार', en: 'Cloth Store', bg: '#e8e0cc', fg: '#1f2a4a', border: '#2a3a66' },
};
const SIGN_KEYS = Object.keys(SIGNS);

// building = { t:'house'|'shop', kind, x, z, ry (front faces +z local), w, d }
const BUILDINGS = [
  // west row, facing east (front direction +x => ry = +pi/2)
  { t: 'house', x: 584.8, z: 20.2, ry: Math.PI / 2 + 0.03, w: 5.6, d: 4.6 },
  { t: 'shop', kind: 'kirana', x: 584.9, z: 25.4, ry: Math.PI / 2 - 0.02, w: 4.0, d: 3.4 },
  { t: 'house', x: 584.7, z: 30.6, ry: Math.PI / 2 + 0.05, w: 5.2, d: 4.8 },
  // north row, facing south (ry = 0), beyond the cross road verge
  { t: 'shop', kind: 'tea', x: 591.8, z: -2.6, ry: -0.02, w: 3.8, d: 3.2 },
  { t: 'shop', kind: 'tailor', x: 596.3, z: -2.4, ry: 0.03, w: 3.6, d: 3.2 },
  { t: 'shop', kind: 'cycle', x: 600.8, z: -2.7, ry: -0.04, w: 3.8, d: 3.4 },
  // east row, facing west (ry = -pi/2)
  { t: 'shop', kind: 'bangle', x: 629.2, z: 15.4, ry: -Math.PI / 2 + 0.03, w: 3.4, d: 3.2 },
  { t: 'shop', kind: 'cloth', x: 629.0, z: 19.2, ry: -Math.PI / 2 - 0.02, w: 3.6, d: 3.4 },
  // south row, facing north (ry = pi)
  { t: 'house', x: 591.2, z: 41.6, ry: Math.PI + 0.04, w: 5.4, d: 4.6 },
  { t: 'shop', kind: 'kirana', x: 596.6, z: 41.2, ry: Math.PI - 0.03, w: 3.6, d: 3.4 },
];

const WALL_TINTS = [0xe9dcc0, 0xd8dfcf, 0xd4dce0, 0xe4cfb0, 0xe2c9c0, 0xdcd2b8];
const AWNING_TINTS = [[0xb8503a, 0xe8dcc0], [0x3a6a8a, 0xe8dcc0], [0xc8962a, 0x8a3a2a], [0x4a7a4a, 0xe0d4b0]];
const DOOR_TINTS = [0x3d5c78, 0x6a3a2a, 0x2f5a44, 0x7a5a2c];
const MEN = [0xb8b0a0, 0x8a9aa8, 0xa89070, 0x9a8a9a, 0x7a8a6a, 0xc0a890];
const sackCols = [0xd0b890, 0xc8a878, 0xb89a70];
const PEOPLE_RADIUS = 0.32;
const PEOPLE_HEIGHT = 1.7;

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Frontage along the four arms is switched on only when it finishes and is clean (PARALLEL.md TONIGHT item 1). The
 * island always builds. Frontage is off until the arm rows exist.
 */
const ENABLE_FRONTAGE = true;

/**
 * The raised central island of the roundabout: radius CHAURAHA.islandR (6 m), a concrete kerb 0.22 m high, a grass top
 * 0.14 m up (below the milestone plinth's first step so the marker stands on it without moving). Solid: the colliders
 * are inscribed horizontal slabs, so nothing on wheels or feet crosses it; the ring carriageway is the only way round.
 */
export function createChaurahaIsland(scene) {
  const { x: cx, z: cz, islandR: R } = CHAURAHA;
  const root = new THREE.Group();
  root.name = 'chauraha_island';
  const kerbW = 0.4, kerbH = 0.22, topY = 0.14;
  // kerb: a lathe of the kerb's cross-section, UVs in metres
  const prof = [[R - kerbW, 0], [R, 0], [R, kerbH], [R - kerbW, kerbH]].map(([r, y]) => new THREE.Vector2(r, y));
  const kg = new THREE.LatheGeometry(prof, 48);
  { const uv = kg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (2 * Math.PI * R), uv.getY(i) * 1.2); }
  const kerb = new THREE.Mesh(kg, getTiledMaterial('concrete', { repeatX: 1 / 1.5, repeatY: 1 / 1.5, roughness: 1, tint: 0xd0cabc }));
  kerb.name = 'chauraha_island_kerb';
  kerb.receiveShadow = true; kerb.castShadow = true;
  ensureUv2(kg);
  root.add(kerb);
  // grass top (soil edge under the kerb), UVs in metres
  const tg = new THREE.CircleGeometry(R - kerbW + 0.02, 48).rotateX(-Math.PI / 2);
  { const p = tg.attributes.position, uv = tg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 3, p.getZ(i) / 3); }
  ensureUv2(tg);
  const top = new THREE.Mesh(tg, getTiledMaterial('grass', { repeatX: 1, repeatY: 1, roughness: 1 }));
  top.position.y = topY;
  top.name = 'chauraha_island_top';
  top.receiveShadow = true;
  root.add(top);
  // solid: inscribed slabs (inside the circle, so the ring edge is never clipped)
  const boxes = [];
  const n = 16, step = (2 * R) / n;
  for (let i = 0; i < n; i++) {
    const z0 = -R + i * step, z1 = z0 + step, zf = Math.max(Math.abs(z0), Math.abs(z1));
    const hw = Math.sqrt(Math.max(0, R * R - zf * zf)) - 0.05;
    if (hw > 0.2) boxes.push({ minX: cx - hw, maxX: cx + hw, minZ: cz + z0, maxZ: cz + z1 });
  }
  const col = new THREE.Mesh(new THREE.BufferGeometry());
  col.visible = false;
  col.name = 'chauraha_island_collider';
  col.userData.colliderBoxes = boxes;
  root.add(col);
  root.position.set(cx, 0, cz);
  // kerb/top are local to the centre; collider boxes are world, so keep the collider child out of the offset
  root.remove(col);
  scene.add(col);
  scene.add(root);
  return root;
}

export function createChaurahaEdges(scene) {
  createChaurahaIsland(scene);
  if (!ENABLE_FRONTAGE) return null;
  const rand = rng(4107);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const t = (lo, hi) => lo + rand() * (hi - lo);
  const parts = {}; // material -> meshes (world-space baked)
  const people = [];
  const signList = [];

  const frame = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _l = new THREE.Matrix4();
  const _one = new THREE.Vector3(1, 1, 1);
  let curRy = 0;
  function begin(x, z, ry) {
    curRy = ry;
    frame.compose(new THREE.Vector3(x, 0, z), _q.clone().setFromEuler(_e.set(0, ry, 0)), _one);
  }
  function add(mat, mesh) { (parts[mat] ||= []).push(mesh); }
  /** Textured box in frame-local metres: centre (x,y,z), yaw ry, pitch rx. */
  function box(mat, w, h, d, x, y, z, ry = 0, tint = null, tile = 1.0, rx = 0, rz = 0) {
    const m = texturedBox(w, h, d, mat, { tileSize: tile, tint, tintStrength: 0.55 });
    m.geometry.applyMatrix4(_l.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), _one).premultiply(frame));
    m.position.set(0, 0, 0); m.rotation.set(0, 0, 0);
    add(mat, m);
  }
  /** A tyre (torus) in frame-local metres, library 'metal' material, dark rubber tint. */
  function tyre(x, y, z, ry, r = 0.34) {
    const g = new THREE.TorusGeometry(r, 0.035, 6, 18);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i));
    g.setAttribute('uv2', new THREE.BufferAttribute(uv.array.slice(), 2));
    bakeFlatTintColors(g, 0x2a2a28, 0.8);
    g.applyMatrix4(_l.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), _one).premultiply(frame));
    add('metal', new THREE.Mesh(g, getTiledMaterial('metal', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true })));
  }
  /** A person at frame-local (x,z) facing local yaw `face`; seated people are squashed shorter. */
  function person(x, z, face, seated, tint, lift = 0) {
    const v = new THREE.Vector3(x, 0, z).applyMatrix4(frame);
    const sy = seated ? 0.6 + rand() * 0.05 : 0.95 + rand() * 0.1;
    people.push({ x: v.x, z: v.z, y: lift, ry: curRy + face, sy, sx: seated ? 1.15 : 1, tint: tint ?? pick(MEN) });
  }

  // ------------------------------------------------------------------ open shop
  function shop(b, sIdx) {
    const { w, d } = b;
    const H = 3.0;
    begin(b.x, b.z, b.ry);
    const wall = pick(WALL_TINTS);
    const [aA, aB] = AWNING_TINTS[sIdx % AWNING_TINTS.length];
    const wt = 0.22;
    // plinth + front step, back and side walls, lintel, tin roof
    box('concrete', w + 0.3, 0.16, d + 0.5, 0, 0.08, 0.1, 0, 0xb0aaa0, 1.0);
    box('plaster', w, H, wt, 0, 0.16 + H / 2, -d / 2 + wt / 2, 0, wall, 0.5);
    for (const s of [-1, 1]) box('plaster', wt, H, d, s * (w / 2 - wt / 2), 0.16 + H / 2, 0, 0, wall, 0.5);
    box('plaster', w, 0.62, 0.3, 0, 0.16 + H - 0.31, d / 2 - 0.15, 0, wall, 0.5);
    box('tin', w + 0.5, 0.07, d + 0.5, 0, 0.16 + H + 0.06, 0.1, 0, 0xa8a49a, 0.8, 0.045);
    // shutter rolled up under the lintel with its guide rails
    box('metal', w - 0.5, 0.26, 0.26, 0, 0.16 + H - 0.75, d / 2 - 0.2, 0, 0x8c8c86, 1.0);
    for (const s of [-1, 1]) box('metal', 0.07, 2.4, 0.09, s * (w / 2 - wt - 0.1), 0.16 + 1.2, d / 2 - 0.12, 0, 0x7a7a74, 1.0);
    // plank counter on the front line, shelves at the back
    box('wood', w - 0.9, 0.86, 0.5, 0, 0.16 + 0.43, d / 2 - 0.65, 0, 0x8a6a48);
    box('wood', w - 0.7, 0.05, 0.62, 0, 0.16 + 0.88, d / 2 - 0.65, 0, 0xa07c56);
    for (let i = 0; i < 3; i++) box('wood', w - 0.6, 0.05, 0.34, 0, 0.16 + 0.9 + i * 0.62, -d / 2 + wt + 0.17, 0, 0x7a5a3c);
    // goods by kind
    const gz = -d / 2 + wt + 0.17;
    const goods = (n, y, mat, gw, gh, gd, cols, zz = gz, spread = w - 1.0) => {
      for (let i = 0; i < n; i++) box(mat, gw * t(0.85, 1.15), gh * t(0.85, 1.2), gd, -spread / 2 + (spread * (i + 0.5)) / n + t(-0.04, 0.04), y + gh / 2, zz, t(-0.12, 0.12), pick(cols));
    };
    const tinCols = [0xb04a3a, 0x3a6a8a, 0xc8962a, 0x4a7a4a, 0x8a3a5a];
    const sackCols = [0xd0b890, 0xc8a878, 0xb89a70];
    switch (b.kind) {
      case 'kirana':
      case 'cloth':
      case 'bangle':
        goods(5, 0.16 + 0.93, 'metal', 0.2, 0.22, 0.2, tinCols);
        goods(5, 0.16 + 1.55, 'tarpaulin', 0.28, 0.24, 0.22, tinCols);
        goods(4, 0.16 + 2.17, 'tarpaulin', 0.3, 0.22, 0.22, [0xd8c8a8, 0xb8503a, 0x3a6a8a]);
        if (b.kind === 'kirana') {
          for (let i = 0; i < 3; i++) box('jute', 0.55, 0.3, 0.38, -w / 2 + 0.9 + i * 0.7, 0.16 + 0.15, d / 2 + 0.55, t(-0.2, 0.2), pick(sackCols), 0.5);
          for (let i = 0; i < 6; i++) box('tarpaulin', 0.09, 0.2, 0.012, -w / 2 + 0.7 + i * 0.5, 0.16 + H - 1.0, d / 2 - 0.45, 0, pick(tinCols), 0.3); // hanging sachet strips
          box('metal', 0.38, 0.05, 0.22, 0.9, 0.16 + 0.93, d / 2 - 0.65, 0, 0xb8b8b0, 0.3); // taraju pan
        } else if (b.kind === 'bangle') {
          for (let i = 0; i < 8; i++) box('tarpaulin', 0.05, 0.5, 0.05, -w / 2 + 0.7 + i * 0.33, 0.16 + H - 1.1, d / 2 - 0.5, 0, pick([0xb03a4a, 0x2a6a8a, 0xc8962a, 0x4a7a4a, 0x7a3a8a]), 0.3); // bangle stacks hanging on the lintel rail
        } else {
          for (let i = 0; i < 4; i++) box('tarpaulin', 0.34, 0.14 + i * 0.01, 0.34, -w / 2 + 0.9 + i * 0.52, 0.16 + 0.88 + 0.095, d / 2 - 0.65, t(-0.1, 0.1), pick([0xb8503a, 0x3a6a8a, 0xe0d4b0, 0x4a7a4a, 0xc8962a]), 0.5); // folded cloth bolts on the counter
          for (let i = 0; i < 3; i++) box('tarpaulin', 0.5, 0.9, 0.012, -w / 2 + 0.9 + i * 0.85, 0.16 + H - 1.35, d / 2 - 0.45, 0, pick([0xb8503a, 0x3a6a8a, 0xc8962a]), 0.6); // lengths hung up
        }
        break;
      case 'tea':
        box('metal', 0.36, 0.24, 0.3, -0.8, 0.16 + 1.03, d / 2 - 0.65, 0, 0x8c8c86, 1.0); // kettle
        box('metal', 0.1, 0.26, 0.1, -0.8, 0.16 + 1.28, d / 2 - 0.65, 0, 0x8c8c86, 1.0);
        for (let i = 0; i < 6; i++) box('metal', 0.06, 0.09, 0.06, 0.1 + (i % 3) * 0.12, 0.16 + 0.96, d / 2 - 0.55 + Math.floor(i / 3) * 0.14, 0, 0xc4c8c8, 0.3); // tea glasses
        box('brick', 0.7, 0.45, 0.5, 1.0, 0.16 + 0.225, -d / 2 + wt + 0.4, 0, 0xa06a50, 1.2); // clay stove
        goods(4, 0.16 + 0.93, 'metal', 0.18, 0.2, 0.18, [0xb8b8b0, 0x8c8c86]);
        // bench out front with two men
        box('wood', 1.7, 0.05, 0.34, 0.1, 0.46, d / 2 + 1.0, 0.04, 0x8a6a48);
        for (const s of [-1, 1]) box('wood', 0.07, 0.44, 0.3, 0.1 + s * 0.72, 0.22, d / 2 + 1.0, 0, 0x7a5a3c);
        person(-0.15, d / 2 + 1.0, Math.PI, true, null, 0.18);
        person(0.45, d / 2 + 1.0, Math.PI - 0.2, true, null, 0.18);
        break;
      case 'tailor':
        goods(4, 0.16 + 0.93, 'tarpaulin', 0.34, 0.14, 0.3, [0xb8503a, 0x3a6a8a, 0xe0d4b0, 0x4a7a4a]);
        goods(4, 0.16 + 1.55, 'tarpaulin', 0.34, 0.2, 0.26, [0xc8962a, 0x8a3a5a, 0xe0d4b0]);
        // the sewing machine on its treadle table in the doorway, the tailor behind it
        box('wood', 0.9, 0.06, 0.45, 0.4, 0.16 + 0.75, 0.25, 0, 0x7a5a3c);
        for (const s of [-1, 1]) box('metal', 0.06, 0.74, 0.4, 0.4 + s * 0.38, 0.16 + 0.37, 0.25, 0, 0x2a2a28, 1.0);
        box('metal', 0.36, 0.2, 0.14, 0.4, 0.16 + 0.88, 0.25, 0, 0x2a2a28, 0.4);
        box('metal', 0.1, 0.12, 0.1, 0.55, 0.16 + 1.03, 0.25, 0, 0x2a2a28, 0.3);
        for (let i = 0; i < 3; i++) box('tarpaulin', 0.5, 0.95, 0.012, -w / 2 + 0.9 + i * 0.6, 0.16 + H - 1.45, d / 2 - 0.5, 0, pick([0xc8b890, 0x7a8aa8, 0xb8503a]), 0.6); // shirts on hangers
        person(0.4, 0.62, Math.PI, true, 0xb0a890, 0.2);
        break;
      case 'cycle':
        for (let i = 0; i < 4; i++) tyre(-w / 2 + 0.75 + i * 0.62, 0.16 + 1.7 + t(-0.1, 0.1), d / 2 - 0.5, t(-0.1, 0.1));
        box('metal', 0.42, 0.34, 0.42, 1.0, 0.16 + 0.17, d / 2 + 0.7, 0, 0x6a8aa0, 1.0); // tub of water
        box('metal', 0.5, 0.05, 0.05, -0.5, 0.16 + 0.95, d / 2 - 0.65, 0.3, 0x8c8c86, 0.4); // spanner
        goods(4, 0.16 + 0.93, 'metal', 0.18, 0.18, 0.18, [0x8c8c86, 0x6a6a64]);
        // a cycle upside down on its saddle and handlebars in the forecourt, the mechanic crouched at it
        box('metal', 0.9, 0.04, 0.04, 0, 0.5, d / 2 + 1.1, 0.1, 0x3a4a60, 1.0);
        box('metal', 0.04, 0.5, 0.04, -0.3, 0.3, d / 2 + 1.1, 0, 0x3a4a60, 1.0);
        tyre(0.55, 0.38, d / 2 + 1.1, Math.PI / 2, 0.36);
        tyre(-0.55, 0.38, d / 2 + 1.1, Math.PI / 2, 0.36);
        person(0.1, d / 2 + 1.6, Math.PI, true, 0xa89070, 0);
        break;
    }
    // striped tarpaulin awning on two poles, sloping to the front
    const aw = w + 0.5, ad = 1.6, n = 4;
    for (let i = 0; i < n; i++) box('tarpaulin', aw / n, 0.035, ad, -aw / 2 + (aw / n) * (i + 0.5), 0.16 + H - 0.28 - 0.1, d / 2 + ad / 2 - 0.1, 0, i % 2 ? aB : aA, 0.8, 0.2);
    for (const s of [-1, 1]) box('wood', 0.07, 2.35, 0.07, s * (aw / 2 - 0.05), 0.16 + 1.17, d / 2 + ad - 0.2, 0, 0x7a5a3c);
    // signboard stood on the roof edge
    const sw = Math.min(w * 0.85, 3.1);
    signList.push({ key: b.kind, w: sw, ry: b.ry, lx: 0, ly: 0.16 + H + 0.12 + sw / 4.41 / 2, lz: d / 2 - 0.05 });
    box('wood', 0.07, 0.12, 0.07, -sw / 2 + 0.2, 0.16 + H + 0.1, d / 2 - 0.12, 0, 0x6a4a30);
    box('wood', 0.07, 0.12, 0.07, sw / 2 - 0.2, 0.16 + H + 0.1, d / 2 - 0.12, 0, 0x6a4a30);
    // customer(s) at the counter
    if (b.kind === 'kirana' || b.kind === 'cloth') person(t(-0.6, 0.6), d / 2 + 1.35, Math.PI + t(-0.2, 0.2), false, null);
    person(t(-0.5, 0.5), d / 2 - 1.15, Math.PI, false, pick(MEN)); // shopkeeper behind the counter (soft)
    return b;
  }

  // ------------------------------------------------------------------ house front
  function house(b) {
    const { w, d } = b;
    begin(b.x, b.z, b.ry);
    const H = 3.1;
    const wall = pick(WALL_TINTS);
    const door = pick(DOOR_TINTS);
    box('concrete', w + 0.2, 0.4, d + 0.2, 0, 0.2, 0, 0, 0xa8a298, 1.0); // plinth
    box('plaster', w, H, d, 0, 0.4 + H / 2, 0, 0, wall, 0.5);
    box('plaster', w + 0.1, 0.14, d + 0.1, 0, 0.4 + H - 0.07, 0, 0, 0xcdc4b0, 0.5); // cornice band
    // tin roof, low pitch, overhanging the front as a verandah with two posts
    box('tin', w + 0.5, 0.07, d + 1.5, 0, 0.4 + H + 0.2, 0.55, 0, 0xa8a49a, 0.8, 0.07);
    for (const s of [-1, 1]) box('wood', 0.12, 2.7, 0.12, s * (w / 2 - 0.25), 0.4 + 1.3, d / 2 + 1.05, 0, 0x7a5a3c);
    // verandah floor and step
    box('concrete', w - 0.2, 0.1, 1.2, 0, 0.35, d / 2 + 0.55, 0, 0xb0aaa0, 1.0);
    box('concrete', 1.4, 0.18, 0.45, 0, 0.09, d / 2 + 1.4, 0, 0xa8a298, 1.0);
    // door: frame, panel, handle, hinges
    const dx = t(-0.5, 0.5);
    box('wood', 1.3, 2.25, 0.08, dx, 0.4 + 1.125, d / 2 + 0.02, 0, 0x5a3c26);
    box('wood', 1.0, 2.05, 0.06, dx, 0.4 + 1.03, d / 2 + 0.07, 0, door);
    box('wood', 0.38, 0.9, 0.025, dx - 0.22, 0.4 + 1.1, d / 2 + 0.105, 0, door);
    box('wood', 0.38, 0.9, 0.025, dx + 0.22, 0.4 + 1.1, d / 2 + 0.105, 0, door);
    box('metal', 0.04, 0.16, 0.05, dx + 0.38, 0.4 + 1.0, d / 2 + 0.12, 0, 0x4a4a46, 0.4);
    for (const hy of [0.4, 1.7]) box('metal', 0.06, 0.12, 0.03, dx - 0.5, 0.4 + hy, d / 2 + 0.1, 0, 0x3a3a36, 0.4);
    // two windows with frame, iron grille, sill, one open leaf
    for (const s of [-1, 1]) {
      const wx = s * (w / 2 - 0.9);
      if (Math.abs(wx - dx) < 1.2) continue;
      box('wood', 1.0, 1.0, 0.07, wx, 0.4 + 1.65, d / 2 + 0.02, 0, 0x5a3c26);
      box('wood', 0.8, 0.8, 0.04, wx, 0.4 + 1.65, d / 2 - 0.0, 0, 0x2a2420);
      for (let i = -2; i <= 2; i++) box('metal', 0.025, 0.84, 0.03, wx + i * 0.17, 0.4 + 1.65, d / 2 + 0.07, 0, 0x2f2f2c, 0.4);
      box('metal', 0.9, 0.025, 0.03, wx, 0.4 + 1.65, d / 2 + 0.07, 0, 0x2f2f2c, 0.4);
      box('concrete', 1.2, 0.07, 0.22, wx, 0.4 + 1.12, d / 2 + 0.1, 0, 0xb0aaa0, 1.0);
      box('wood', 0.44, 0.82, 0.04, wx + s * 0.62, 0.4 + 1.65, d / 2 + 0.22, s * -0.9, door);
    }
    // life at the door: a pot stack, a matka on a stand, a sack, firewood, or a cot standing on end
    const nProps = 2 + Math.floor(rand() * 2);
    const props = ['pots', 'sack', 'wood', 'matka', 'cot'];
    const used = new Set();
    for (let i = 0; i < nProps; i++) {
      let k; do { k = pick(props); } while (used.has(k)); used.add(k);
      const side = i % 2 ? 1 : -1;
      const px = side * (w / 2 - 0.5 + t(-0.15, 0.1)), pz = d / 2 + 1.0 + t(0, 0.3);
      if (k === 'pots') { box('terracotta', 0.34, 0.3, 0.34, px, 0.1 + 0.15, pz, t(0, 3), 0xc08060, 0.5); box('terracotta', 0.3, 0.26, 0.3, px, 0.1 + 0.43, pz, t(0, 3), 0xb87858, 0.5); }
      else if (k === 'sack') box('jute', 0.5, 0.75, 0.32, px, 0.1 + 0.37, pz, t(-0.3, 0.3), pick(sackCols), 0.5);
      else if (k === 'wood') for (let j = 0; j < 6; j++) box('wood', 0.8, 0.09, 0.09, px, 0.1 + 0.05 + (j >> 1) * 0.09, pz - 0.1 + (j % 2) * 0.1 + (j >> 1) * 0.03, t(-0.1, 0.1), 0x8a6a48, 0.4);
      else if (k === 'matka') { box('wood', 0.5, 0.05, 0.5, px, 0.1 + 0.55, pz, 0, 0x7a5a3c); for (const [a, c2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.05, 0.55, 0.05, px + a * 0.22, 0.1 + 0.27, pz + c2 * 0.22, 0, 0x7a5a3c); box('terracotta', 0.4, 0.4, 0.4, px, 0.1 + 0.78, pz, 0, 0xb87858, 0.5); }
      else box('wood', 0.06, 1.8, 1.0, px, 0.1 + 0.9, pz, t(-0.05, 0.05), 0x8a6a48, 0.8, 0, 0.18); // charpai standing on its side against the wall
    }
    if (rand() < 0.7) person(t(-1.2, 1.2), d / 2 + 1.8, Math.PI + t(-0.5, 0.5), false, null); // a neighbour standing in the lane
  }

  // ------------------------------------------------------------------ people groups (frame = world, ry = their yaw)
  function charpai(x, z, ry, men, tints = null) {
    begin(x, z, ry);
    const L = 1.9, W = 0.95, H = 0.4;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.07, H, 0.07, sx * (L / 2 - 0.04), H / 2, sz * (W / 2 - 0.04), 0, 0x7a5a3c);
    for (const s of [-1, 1]) { box('wood', L, 0.06, 0.06, 0, H, s * (W / 2 - 0.04), 0, 0x8a6a48); box('wood', 0.06, 0.06, W, s * (L / 2 - 0.04), H, 0, 0, 0x8a6a48); }
    box('jute', L - 0.14, 0.025, W - 0.14, 0, H + 0.005, 0, 0, pick([0xc4a878, 0xb89868, 0xc8b088]), 0.8);
    // tea glasses on a low stool beside it, a steel kettle
    box('wood', 0.4, 0.04, 0.4, 0.9, 0.28, W / 2 + 0.55, 0, 0x8a6a48);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.04, 0.26, 0.04, 0.9 + sx * 0.16, 0.13, W / 2 + 0.55 + sz * 0.16, 0, 0x7a5a3c);
    box('metal', 0.07, 0.1, 0.07, 0.82, 0.35, W / 2 + 0.55, 0, 0xc4c8c8, 0.3);
    box('metal', 0.07, 0.1, 0.07, 0.98, 0.35, W / 2 + 0.6, 0, 0xc4c8c8, 0.3);
    box('metal', 0.22, 0.2, 0.16, 0.9, 0.39, W / 2 + 0.47, 0, 0x8c8c86, 1.0);
    for (let i = 0; i < men; i++) person(-0.6 + i * 0.55 + t(-0.05, 0.05), t(-0.1, 0.1) + (i % 2 ? 0.05 : 0), t(-0.6, 0.6) + (i % 2 ? Math.PI : 0), true, tints ? tints[i] : null, 0.3);
  }
  function carrom(x, z, ry) {
    begin(x, z, ry);
    box('jute', 2.6, 0.03, 2.6, 0, 0.015, 0, 0.2, 0xd8c8a8, 1.0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('wood', 0.07, 0.3, 0.07, sx * 0.34, 0.18, sz * 0.34, 0, 0x9a7a58);
    box('wood', 0.85, 0.05, 0.85, 0, 0.355, 0, 0, 0xa58a68);
    box('wood', 0.74, 0.03, 0.74, 0, 0.39, 0, 0, 0xe0c898);
    for (const s of [-1, 1]) { box('wood', 0.84, 0.05, 0.05, 0, 0.405, s * 0.395, 0, 0x6a4a30); box('wood', 0.05, 0.05, 0.74, s * 0.395, 0.405, 0, 0, 0x6a4a30); }
    for (let i = 0; i < 5; i++) box('wood', 0.03, 0.012, 0.03, t(-0.12, 0.12), 0.41, t(-0.12, 0.12), rand() * 3, i % 2 ? 0xf0e0c0 : 0x3a2a20);
    for (const [px, pz, face] of [[0, 1.2, Math.PI], [0, -1.2, 0], [1.2, 0, -Math.PI / 2], [-1.2, 0.1, Math.PI / 2]]) person(px + t(-0.1, 0.1), pz + t(-0.1, 0.1), face + t(-0.25, 0.25), true, null, 0);
    // two onlookers standing
    person(1.9, 1.5, -2.2, false, null); person(-1.9, -1.3, 0.9, false, null);
  }
  function bench(x, z, ry) {
    begin(x, z, ry);
    box('wood', 2.0, 0.06, 0.4, 0, 0.46, 0, 0, 0x8a6a48);
    for (const s of [-1, 1]) box('wood', 0.08, 0.45, 0.36, s * 0.85, 0.22, 0, 0, 0x7a5a3c);
    box('wood', 2.0, 0.05, 0.05, 0, 0.78, -0.2, 0, 0x6a4a30);
    for (const s of [-1, 1]) box('wood', 0.05, 0.4, 0.05, s * 0.85, 0.6, -0.2, 0, 0x6a4a30);
    box('metal', 0.07, 0.1, 0.07, -0.15, 0.55, 0.1, 0, 0xc4c8c8, 0.3);
    box('metal', 0.07, 0.1, 0.07, 0.4, 0.55, 0.1, 0, 0xc4c8c8, 0.3);
    for (let i = 0; i < 3; i++) person(-0.65 + i * 0.65, 0.02, Math.PI * 0 + t(-0.3, 0.3) + Math.PI, true, 0xc4bca8, 0.18);
  }

  // ------------------------------------------------------------------ build
  let si = 0;
  for (const b of BUILDINGS) { if (b.t === 'house') house(b); else { shop(b, si++); } }
  // corner groups, all outside the 12 m circle and off the road lanes
  charpai(590.4, 29.8, Math.PI / 2 + 0.1, 2, [0xc4bca8, 0x8a9aa8]); // west row, SW corner
  carrom(621.4, 17.3, 0.3); // east row
  charpai(604.6, -1.2, 0.15, 3); // north row, tea-side
  bench(591.8, 35.8, Math.PI + 0.1); // south row, three old men

  // ------------------------------------------------------------------ merge: one mesh per material
  const root = new THREE.Group();
  root.name = 'chauraha_edges';
  for (const [mat, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const merged = mergeMeshList(list, `chauraha_edges_${mat}`);
    merged.castShadow = true;
    merged.receiveShadow = true;
    root.add(merged);
  }

  // signboards: one atlas, Hindi bold on top, English below, one dark paint
  const keys = [...new Set(signList.map((s) => s.key))];
  const atlas = createWideSignAtlas(keys.map((k) => SIGNS[k]));
  const signMat = Object.assign(new THREE.MeshStandardMaterial({ map: atlas.texture, roughness: 0.85 }), { name: 'signboard' });
  const boards = signList.map((sg) => {
    const g = new THREE.BoxGeometry(sg.w, sg.w / 4.41, 0.04);
    mapFrontFaceToRow(g, keys.indexOf(sg.key), keys.length);
    g.translate(sg.lx, sg.ly, sg.lz);
    return g;
  });
  // place each board with its building's frame (rebuild: boards carry their own yaw and origin)
  const bPlaced = [];
  signList.forEach((sg, i) => {
    const bld = BUILDINGS.filter((b) => b.t === 'shop')[i];
    boards[i].rotateY(sg.ry); boards[i].translate(bld.x, 0, bld.z);
    bPlaced.push(boards[i]);
  });
  const signMesh = new THREE.Mesh(mergeGeometries(bPlaced), signMat);
  signMesh.name = 'chauraha_edges_signs';
  signMesh.castShadow = true;
  root.add(signMesh);
  scene.add(root);

  // ------------------------------------------------------------------ people: ONE instanced capsule mesh
  const geometry = new THREE.CapsuleGeometry(PEOPLE_RADIUS, PEOPLE_HEIGHT - PEOPLE_RADIUS * 2, 4, 8);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const mesh = new THREE.InstancedMesh(geometry, material, people.length);
  mesh.name = 'ambient_life_chauraha_edges_people';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const c = new THREE.Color();
  people.forEach((p, i) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.ry, 0));
    mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y + (PEOPLE_HEIGHT * p.sy) / 2, p.z), q, new THREE.Vector3(p.sx, p.sy, p.sx)));
    mesh.setColorAt(i, c.setHex(p.tint));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  batchPeopleMesh(mesh); markFigure(mesh); keepOnGround(mesh, (sc) => settleInstances(sc, mesh, refreshPeopleMesh));
  scene.add(mesh);
  if (typeof window !== 'undefined') window.__chaurahaEdges = { buildings: BUILDINGS.length, people: people.length, signs: SIGN_KEYS.length };
  return { root, people: mesh };
}
