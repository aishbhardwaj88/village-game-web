import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loadKitModels } from './houseKit.js';
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
