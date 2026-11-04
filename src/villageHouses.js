import * as THREE from 'three';
import { batchPlaceModel } from './placeBatch.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loadKitModels } from './houseKit.js';
import { buildRoofParts } from './rooftops.js';
import { swapShared } from './stagingYard.js';
import { requestColliderRebuild } from './collision.js';

/**
 * The house kit through the village (her 3 Nov answer, docs/PARALLEL.md items 2 + 4): the 8 kit types
 * (src/houseKit.js, public/assets/models/house_kit_<a..h>.glb) fill the map's house footprints that no abadi row
 * covers, plus two bald street fronts, so the lanes read as streets from eye level. The existing rows are untouched.
 *
 * Placement (world x/z, ry = three.js yaw, local +z = the house front) was solved offline by tmp/vh_opt.py against
 * the 1 Nov map (docs/layout/village-plan-positions-2026-11-01.json + MAP_SHIFT) and the live collider dump:
 *  - each gap house stands with its BACK on its footprint's back line and its front to the same lane as the row it
 *    continues (back-to-back pairs face away from each other, exactly as the rows do);
 *  - every house is clear of all colliders by 0.12 m, of every road/lane/track by >= 0.3 m of its half-width, and of
 *    every other place's outline on the map (so mission spots, doorstep props, the milk round and the school child's
 *    walk keep their ground);
 *  - sx (width) and sz (depth, 0.82-1) are per house, so a tight plot gets a narrower, shallower copy of its type.
 * Never two identical neighbours: type, width, turn and tint differ house to house.
 *
 * Drawing: houses near each other are MERGED by shared material into one mesh per (cluster, material): ~5 draw calls
 * per cluster whatever the house count, no per-house textures (the kit's materials are swapped to the shared CC0 sets,
 * src/stagingYard.js swapShared). Per-house tint is baked into the vertex colours (the shared materials are vertexColors).
 * A cluster is drawn only within DRAW_DIST of the player and casts shadows only within SHADOW_DIST. Colliders come from
 * the visible geometry itself (src/autoColliders.js), like every staged model.
 */
export const VILLAGE_HOUSES = [
  // gaps on the map's North houses footprints (map turn 7.3 deg)
  { t: 'c', x: 538.61, z: -65.65, ry: 3.0142, sx: 1.00, sz: 0.90, area: 'nw' }, // N0, continues row 2 west, faces the ring road
  { t: 'e', x: 565.57, z: -62.55, ry: 3.0142, sx: 1.00, sz: 0.90, area: 'nw' }, // N4, continues row 2 east
  { t: 'a', x: 608.41, z: -56.71, ry: 3.0142, sx: 0.78, sz: 1.00, area: 'ne' }, // N10, between the back-lane mouth and row 3
  { t: 'c', x: 620.19, z: -70.25, ry: -0.1274, sx: 1.00, sz: 0.90, area: 'ne' }, // N26, continues row 1 west
  { t: 'b', x: 621.41, z: -77.30, ry: 3.0142, sx: 0.88, sz: 0.82, area: 'ne' }, // N31, continues row 0 west
  { t: 'b', x: 648.93, z: -66.97, ry: -0.1274, sx: 1.00, sz: 0.90, area: 'ne' }, // N30, continues row 1 east
  { t: 'c', x: 648.28, z: -74.49, ry: 3.0142, sx: 0.88, sz: 0.90, area: 'ne' }, // N35, continues row 0 east
  { t: 'a', x: 529.30, z: -81.93, ry: -0.1274, sx: 1.00, sz: 1.00, area: 'nw' }, // N36 \ the four-house block by the water tank,
  { t: 'b', x: 536.07, z: -81.32, ry: -0.1274, sx: 0.94, sz: 0.90, area: 'nw' }, // N37  | two face south and two face north,
  { t: 'c', x: 530.58, z: -89.43, ry: 3.0142, sx: 1.00, sz: 0.90, area: 'nw' }, // N38  | back to back across their back lane
  { t: 'e', x: 538.11, z: -88.54, ry: 3.0142, sx: 1.00, sz: 0.82, area: 'nw' }, // N39 /
  // East houses (map turn 94.6)
  { t: 'c', x: 683.78, z: -48.67, ry: -1.6511, sx: 1.00, sz: 0.90, area: 'e' }, // E0, north end of row 11
  { t: 'b', x: 681.94, z: -22.35, ry: -1.6511, sx: 0.94, sz: 0.90, area: 'e' }, // E4, south end of row 11
  { t: 'a', x: 676.46, z: 42.54, ry: -1.6511, sx: 1.00, sz: 1.00, area: 'se' }, // E9 \ back to back by the east street corner
  { t: 'b', x: 683.46, z: 43.41, ry: 1.4905, sx: 1.00, sz: 0.82, area: 'se' }, // E10 /
  // South houses (map turn 168.8): one house across a back-to-back pair, front north, as row 12 does
  { t: 'd', x: 662.91, z: 63.27, ry: -2.9461, sx: 1.00, sz: 0.82, area: 'se' }, // S0 + S5, east of row 12
  { t: 'e', x: 633.97, z: 65.08, ry: -2.9461, sx: 1.00, sz: 0.82, area: 'se' }, // S4, west of row 12
  // West houses (map turn 83)
  { t: 'b', x: 528.60, z: -46.87, ry: -1.4486, sx: 0.82, sz: 0.82, area: 'nw' }, // W0, north end of row 16
  { t: 'a', x: 531.36, z: -20.21, ry: -1.4486, sx: 0.94, sz: 1.00, area: 'nw' }, // W4, south end of row 16
  // The two rich houses, alone on wide plots (LAYOUT.md: G and H sparingly, not wall to wall), facing the east tractor
  // route across from East houses row 10 (that lane had houses on one side only). H's tractor gate opens on the tractor route.
  { t: 'g', x: 715.32, z: -59.25, ry: -1.9832, sx: 1.00, sz: 1.00, area: 'e' }, // modern kothi
  { t: 'h', x: 709.13, z: -34.25, ry: -1.6655, sx: 1.00, sz: 1.00, area: 'e' }, // farmer's compound
  // The outer west lane's far side, facing West houses rows 19/20 (it was bald on one side), clear of the mud-house
  // yard to the north, the lamp at z 49.6 and the mango tree at z 76.
  { t: 'c', x: 502.77, z: 33.53, ry: 1.6925, sx: 1.00, sz: 1.00, area: 'w' },
  { t: 'f', x: 502.96, z: 41.67, ry: 1.6925, sx: 1.00, sz: 1.00, area: 'w' },
  { t: 'b', x: 503.11, z: 50.33, ry: 1.6925, sx: 1.00, sz: 1.00, area: 'w' },
  { t: 'e', x: 505.52, z: 57.69, ry: 1.6925, sx: 1.00, sz: 1.00, area: 'w' },
  { t: 'd', x: 505.78, z: 66.34, ry: 1.6925, sx: 1.00, sz: 1.00, area: 'w' },
];

const DRAW_DIST = 115; // player to the NEAREST house of an area; the haze has taken most of a house by then
const SHADOW_DIST = 50; // and only the walls (main + brick) of an area this near cast shadows: every caster is a second draw call
const CASTERS = /hb_main|hb_brick/;

// Limewash range from LAYOUT.md (pale pink, peach, mint, cream, light yellow, soft blue sparingly). Pastels go on the
// pakka types' plaster only; the mud house, the bare-brick room, the old ancestral house and the two rich houses keep
// their own colour with a small warm/cool drift so two of them never match.
const PASTELS = [0xf4c7c3, 0xf2c9a0, 0xc7e6d2, 0xf1e6b8, 0xf6e7a0, 0xf4c7c3, 0xf2c9a0, 0xf1e6b8, 0xc4d5ea];
const PASTEL_TYPES = new Set(['c', 'd', 'e']);

// Rooftop fittings (src/rooftops.js builders) on the flat-roofed kit types, merged into the cluster's EXISTING meshes (no new draw call).
// y = roof surface, rect = free roof in type-local metres (inside the parapet, clear of the ladder / stair room), keep = [x, z, r] existing
// fittings to stay away from. Types a (thatch), e (open frame), f (stone slab), g and h (already carry tanks, solar, dish) get none.
const ROOFS = {
  b: { y: 3.2, rect: [-2.5, 2.5, -2.0, 2.0], keep: [[1.8, -1.5, 1.0]] },
  c: { y: 3.6, rect: [-2.5, 1.8, -2.5, 2.5], keep: [] },
  d: { y: 3.8, rect: [-3.0, 0.7, -5.5, 2.0], keep: [[-1.2, -4.5, 1.1]] },
};
const FIT_KINDS = ['antenna', 'tank', 'bricks', 'solar', 'antenna', 'bricks', 'tank', 'solar'];
const FIT_PART_MATS = { metal: [/hb_metal/, /hb_props/, /hb_main/], concrete: [/hb_main/], brick: [/hb_brick/] };

/** A rooftop-fitting geometry in the kit cluster's attribute layout (position/normal/uv in metres/color), already in world space. */
function kitGeometry(g) {
  const n = g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', g.attributes.position);
  out.setAttribute('normal', g.attributes.normal);
  const uv = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) { uv[k * 2] = g.attributes.uv.getX(k) * 1.2; uv[k * 2 + 1] = g.attributes.uv.getY(k) * 1.2; }
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', g.attributes.color);
  if (g.index) out.setIndex(g.index);
  return out;
}

/** Fitting sites on the roof of house `p` (index i): one or two, never the same kind as the previous house, yaw and kind vary house to house. */
function houseRoofSites(p, i, place, prevKind) {
  const roof = ROOFS[p.t];
  if (!roof) return [];
  const sites = [];
  const n = hash(i * 13 + 5) < 0.45 ? 2 : 1;
  const pos = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    let kind = FIT_KINDS[Math.floor(hash(i * 29 + k * 7 + 1) * FIT_KINDS.length)];
    if (kind === prevKind.v) kind = FIT_KINDS[(FIT_KINDS.indexOf(kind) + 1 + k) % FIT_KINDS.length];
    if (kind === prevKind.v) kind = 'bricks';
    const inset = kind === 'tank' ? 0.85 : kind === 'solar' ? 0.75 : 0.5;
    let lx = 0, lz = 0, ok = false;
    for (let t = 0; t < 14 && !ok; t++) {
      lx = roof.rect[0] + inset + hash(i * 41 + k * 11 + t * 3 + 2) * (roof.rect[1] - roof.rect[0] - 2 * inset);
      lz = roof.rect[2] + inset + hash(i * 43 + k * 17 + t * 5 + 3) * (roof.rect[3] - roof.rect[2] - 2 * inset);
      ok = roof.keep.every(([kx, kz, kr]) => Math.hypot(lx - kx, lz - kz) > kr + inset * 0.6) && sites.every((o) => Math.hypot(lx - o.lx, lz - o.lz) > 1.5);
    }
    if (!ok) continue;
    pos.set(lx, 0, lz).applyMatrix4(place);
    sites.push({ lx, lz, x: pos.x, y: roof.y, z: pos.z, yaw: p.ry, kind, pick: i * 7 + k * 13 + 3 });
    if (k === 0) prevKind.v = kind;
  }
  return sites;
}

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Float copy of a (possibly meshopt-quantised) geometry with exactly position/normal/uv/color(3), baked by `m`. */
function bakedGeometry(src, m, tint) {
  const n = src.attributes.position.count;
  const g = new THREE.BufferGeometry();
  const copy = (name, size, fallback) => {
    const a = src.attributes[name];
    const f = new Float32Array(n * size);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < size; k++) f[i * size + k] = a ? (k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : a.getZ(i)) : fallback;
    }
    return new THREE.BufferAttribute(f, size);
  };
  g.setAttribute('position', copy('position', 3, 0));
  g.setAttribute('normal', copy('normal', 3, 0));
  g.setAttribute('uv', copy('uv', 2, 0));
  const col = copy('color', 3, 1);
  for (let i = 0; i < n; i++) col.setXYZ(i, col.getX(i) * tint.r, col.getY(i) * tint.g, col.getZ(i) * tint.b);
  g.setAttribute('color', col);
  if (src.index) g.setIndex(Array.from(src.index.array));
  g.applyMatrix4(m);
  if (m.determinant() < 0) { // never happens with positive sx/sz, kept so a future mirrored placement cannot turn faces inside out
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  }
  return g;
}

/** Builds the kit houses into `scene` (async: the 8 kit models load after Play). Returns { group, update(px, pz) }. */
export function createVillageHouses(scene) {
  const group = new THREE.Group();
  group.name = 'village_kit_houses';
  scene.add(group);
  const clusters = []; // { pts: [[x, z]] of its houses, root, shadow }
  if (typeof location !== 'undefined' && /[?&]nokit=1/.test(location.search)) return { group, update() {} }; // A/B switch for draw-call audits
  loadKitModels().then((models) => {
    for (const m of Object.values(models)) { m.updateWorldMatrix(true, true); m.traverse((o) => { if (o.isMesh) swapShared(o); }); }
    const cells = new Map(); // one merged set per area: about 5 draw calls per visible area
    VILLAGE_HOUSES.forEach((p, i) => {
      const key = p.area;
      let c = cells.get(key);
      if (!c) cells.set(key, (c = { list: [] }));
      c.list.push([p, i]);
    });
    const white = new THREE.Color(1, 1, 1);
    const place = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), full = new THREE.Matrix4();
    for (const [key, c] of cells) {
      const byMat = new Map(); // material -> [geometry]
      const fitSites = [];
      const prevKind = { v: '' };
      for (const [p, i] of c.list) {
        const src = models[p.t];
        if (!src) continue;
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, p.ry);
        place.compose(pos.set(p.x, 0, p.z), q, s.set(p.sx || 1, 1, p.sz || 1));
        const wear = 0.92 + 0.1 * hash(i * 3 + 1); // per-house overall value: some freshly washed, some dusty
        const wall = PASTEL_TYPES.has(p.t)
          ? new THREE.Color(PASTELS[Math.floor(hash(i * 7 + 2) * PASTELS.length)]).lerp(white, 0.55)
          : new THREE.Color(1, 0.97 + 0.05 * hash(i * 5 + 3), 0.93 + 0.08 * hash(i * 11 + 4));
        src.traverse((mesh) => {
          if (!mesh.isMesh) return;
          const tint = (/hb_main/.test(mesh.material.name) ? wall.clone() : new THREE.Color(1, 1, 1)).multiplyScalar(wear);
          full.multiplyMatrices(place, mesh.matrixWorld);
          const list = byMat.get(mesh.material) || [];
          list.push(bakedGeometry(mesh.geometry, full, tint));
          byMat.set(mesh.material, list);
        });
        fitSites.push(...houseRoofSites(p, i, place, prevKind));
      }
      if (fitSites.length) { // fittings join the cluster's meshes of a material it already has: zero extra draw calls
        const parts = buildRoofParts(fitSites);
        for (const [part, list] of Object.entries(parts)) {
          if (!list.length) continue;
          let target = null;
          for (const re of FIT_PART_MATS[part]) { for (const mat of byMat.keys()) if (re.test(mat.name)) { target = mat; break; } if (target) break; }
          if (!target) continue;
          const dst = byMat.get(target);
          for (const g of list) { const kg = kitGeometry(g); dst.push(dst[0].index && !kg.index ? kg : !dst[0].index && kg.index ? kg.toNonIndexed() : kg); }
        }
      }
      const root = new THREE.Group();
      root.name = `kit_houses_${key}`;
      for (const [mat, geos] of byMat) {
        const merged = mergeGeometries(geos, false);
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, mat);
        mesh.name = `kit_houses_${key}_${mat.name}`;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.userData.mergedStatic = true; // whole-object grounding check: roofs and tanks stand up by design
        root.add(mesh);
      }
      root.visible = false;
      group.add(root);
      for (const m of root.children) if (!m.material.userData.placeBatchable && !m.material.transparent && m.material.name !== 'hb_decal' && m.material.name !== 'hb_flag' && !m.material.onBeforeCompile.toString().includes('vWxyz')) m.material.userData.placeBatchable = true;
      batchPlaceModel(root, `kit_houses_${key}`); // drawn through the village-wide per-material batches; the meshes stay as hidden collider/visibility sources
      clusters.push({ pts: c.list.map(([p]) => [p.x, p.z]), root, shadow: false });
    }
    lx = 1e9; // the first update after loading must place the clusters even if the player has not moved
    requestColliderRebuild();
  }).catch((err) => console.warn('village kit houses did not load', err));

  let lx = 1e9, lz = 1e9;
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
      if (sh !== c.shadow) { c.shadow = sh; for (const m of c.root.children) m.castShadow = sh && CASTERS.test(m.material.name); }
    }
    if (changed) requestColliderRebuild();
  }
  return { group, update };
}
