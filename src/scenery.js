import * as THREE from 'three';
import { texturedThickBox, texturedWallBox } from './materials.js';
import { PALETTE, WALL_TINT_STRENGTH } from './village.js';
import { mergeGroupByMaterial } from './mergeUtils.js';
import { getGLTFLoader } from './loaders.js';
import { createCattleHerd } from './animals.js';

// The abadi (docs/bg-houses-checklist.md, ART_REVIEW review 3): dense continuous ROWS of attached houses along a lane
// network, not lonely single houses. Three Blender row models (tools/blender/build_abadi.py, modelled from Characters V1/
// buildings/house_1-3 + the duplex style sheet) — each row is 4 houses sharing walls, two/one storey, balconies, roof tanks,
// charpais, clotheslines, tin/tile roofs, a baada + hand pump — instanced along lanes from both sides. Drawn as
// InstancedMeshes (one draw per material per row variant per area); areas beyond AREA_SHOW_DIST of the player are hidden
// (zone-style distance culling, CLAUDE.md draw-call plan). Collision + the validator's real-geometry backing stay as a hidden,
// locally-merged group of plain boxes ('bg_houses_old'), one per house footprint, taken from src/abadiBoxes.json.
import ABADI_BOXES from './abadiBoxes.json';

const ABADI_WASHES = [[1, 0.98, 0.95], [1, 0.9, 0.9], [0.9, 0.99, 0.93], [0.9, 0.95, 1], [1, 1, 1], [1, 0.95, 0.85]];
import { buildStripSegment, buildKerbSegments, buildDrainSegments } from './paths.js';

const ROWS = {
  a: { file: 'abadi_row_a.glb', ...ABADI_BOXES.a },
  b: { file: 'abadi_row_b.glb', ...ABADI_BOXES.b },
  c: { file: 'abadi_row_c.glb', ...ABADI_BOXES.c },
};

// Lanes (centre-lines). Rows stand ROW_OFFSET from the lane centre (half lane + drain + half the 7 m house depth).
const LANE_HALF = 2.0;
const ROW_OFFSET = LANE_HALF + 1.4 + 3.5;
const LANES = [
  { name: 'E1', a: { x: -37, z: 76 }, b: { x: 36, z: 76 }, w: 4 },
  { name: 'E2', a: { x: -6, z: 76 }, b: { x: -6, z: 130 }, w: 3.5 },
  { name: 'W1', a: { x: -84, z: 21 }, b: { x: -84, z: 104 }, w: 4 },
  { name: 'W2', a: { x: -84, z: 21 }, b: { x: -61, z: 21 }, w: 3.5 },
  { name: 'S1', a: { x: -100, z: 140 }, b: { x: -38, z: 140 }, w: 4 },
];

// quarter turns: 0 front +z, 1 front +x, 2 front -z, 3 front -x. area = which distance-culled region the row belongs to.
const R = ROW_OFFSET;
const PLACEMENTS = [
  // east abadi, lane E1 (z=76): north side faces south, south side faces north
  { v: 'a', x: -20, z: 76 - R, q: 0, area: 'E' }, { v: 'b', x: 0.5, z: 76 - R, q: 0, area: 'E' }, { v: 'c', x: 21, z: 76 - R, q: 0, area: 'E' },
  { v: 'c', x: -17.75, z: 76 + R, q: 2, area: 'E' }, { v: 'a', x: 5.75, z: 76 + R, q: 2, area: 'E' }, { v: 'b', x: 26.5, z: 76 + R, q: 2, area: 'E' },
  // lane E2 (x=-6, running south): west side faces east, east side faces west
  { v: 'b', x: -6 - R, z: 98, q: 1, area: 'E' }, { v: 'a', x: -6 - R, z: 119, q: 1, area: 'E' },
  { v: 'c', x: -6 + R, z: 98, q: 3, area: 'E' }, { v: 'b', x: -6 + R, z: 119, q: 3, area: 'E' },
  // west abadi, lane W1 (x=-84): west side faces east, east side faces west
  { v: 'a', x: -84 - R, z: 51, q: 1, area: 'W' }, { v: 'c', x: -84 - R, z: 72, q: 1, area: 'W' }, { v: 'b', x: -84 - R, z: 93, q: 1, area: 'W' },
  { v: 'b', x: -84 + R, z: 51, q: 3, area: 'W' }, { v: 'a', x: -84 + R, z: 72, q: 3, area: 'W' }, { v: 'c', x: -84 + R, z: 93, q: 3, area: 'W' },
  // south abadi, lane S1 (z=140)
  { v: 'c', x: -90, z: 140 - R, q: 0, area: 'S' }, { v: 'a', x: -69.5, z: 140 - R, q: 0, area: 'S' }, { v: 'b', x: -49, z: 140 - R, q: 0, area: 'S' },
  { v: 'b', x: -90, z: 140 + R, q: 2, area: 'S' }, { v: 'c', x: -69.5, z: 140 + R, q: 2, area: 'S' }, { v: 'a', x: -49, z: 140 + R, q: 2, area: 'S' },
];
// Kachcha homestead (tools/blender/build_kachcha.py): mud-plaster walls + thatch, west of the field. Anchor = model origin.
const KACHCHA = { x: -62, z: -26 };
const KACHCHA2 = { x: -64, z: -56, q: 2 }; // second copy, turned 180 deg so the cattle shed faces the other way
const KACHCHA_BOXES = [ // local footprints (x0,x1,z0,z1,h) — must match the Blender script
  [-6.06, 0.06, -5.56, -1.44, 2.45], // house (solid)
  [2.5, 6.9, -5.5, -5.2, 2.2], [6.6, 6.9, -5.5, -2.0, 2.2], [2.5, 2.8, -5.5, -3.2, 2.2], // cattle shed walls
  [-7.5, -3.5, -6.8, -6.5, 1.2], [-3.5, 0.5, -6.8, -6.5, 1.2], [0.5, 4.0, -6.8, -6.5, 1.2], [4.0, 7.5, -6.8, -6.5, 1.2], // north wall
  [-7.5, -7.2, -6.5, -3.25, 1.2], [-7.5, -7.2, -3.25, 0.0, 1.2], [-7.5, -7.2, 0.0, 3.25, 1.2], [-7.5, -7.2, 3.25, 6.5, 1.2], // west wall
  [7.2, 7.5, -6.5, -3.25, 1.2], [7.2, 7.5, -3.25, 0.0, 1.2], [7.2, 7.5, 0.0, 3.25, 1.2], [7.2, 7.5, 3.25, 6.5, 1.2], // east wall
  [-7.5, -4.4, 6.2, 6.5, 1.2], [-4.4, -1.3, 6.2, 6.5, 1.2], [1.3, 4.4, 6.2, 6.5, 1.2], [4.4, 7.5, 6.2, 6.5, 1.2], // south wall, gate gap between
];

/** Garden plants along the abadi house fronts (creepers on the walls, tulsi + marigold by the steps, banana at row ends),
 *  for buildGardenPlants in vegetation.js. Positions are deterministic from PLACEMENTS. kinds: 0 marigold 1 banana 2 tulsi 4 creeper. */
export function abadiGardenPlants() {
  const out = [];
  PLACEMENTS.forEach((p, i) => {
    const L = ABADI_BOXES[p.v].L;
    const c = Math.round(Math.cos((p.q * Math.PI) / 2)), sn = Math.round(Math.sin((p.q * Math.PI) / 2));
    // local (x along the row, z toward the lane) -> world, same convention as worldBox
    const put = (lx, lz, kind, scale = 1) => out.push({ x: p.x + lx * c + lz * sn, z: p.z - lx * sn + lz * c, kind, scale });
    const plan = [[-L / 2 + 1.2, 4, 1.15], [-L / 4 + 0.6, i % 2 ? 2 : 0, 1], [L / 12, 4, 1.0], [L / 4 + 0.9, i % 2 ? 0 : 2, 1], [L / 2 - 1.5, 4, 1.2]];
    plan.forEach(([along, kind, scale], j) => {
      const lx = along + ((i * 7 + j * 3) % 5) * 0.12;
      put(lx, kind === 4 ? 3.45 : 3.8, kind, scale); // creepers hug the wall, pots sit by the step
    });
    if (i % 2 === 0) put(L / 2 + 1.6, 2.2, 1, 0.9); // banana clump just beyond the row end
  });
  return out;
}

/** Doorstep prop sites in front of every abadi row (stools, buckets, baskets, pots, crates, jugs), for src/villageProps.js.
 *  World x/z + yaw + a deterministic pick; positions sit at the step line (local z 3.75, same as the tulsi/marigold pots). */
export function abadiPropSites() {
  const out = [];
  PLACEMENTS.forEach((p, i) => {
    const L = ABADI_BOXES[p.v].L;
    const c = Math.round(Math.cos((p.q * Math.PI) / 2)), sn = Math.round(Math.sin((p.q * Math.PI) / 2));
    const n = 2 + (i % 3);
    for (let j = 0; j < n; j++) {
      const lx = (((i * 37 + j * 53) % 100) / 100 - 0.5) * (L - 3);
      const lz = 3.75 + ((i + j) % 3) * 0.08;
      out.push({ x: p.x + lx * c + lz * sn, z: p.z - lx * sn + lz * c, yaw: ((i * 131 + j * 71) % 628) / 100, pick: i * 7 + j * 13 + j });
    }
  });
  return out;
}

/** Rooftop fitting sites (src/rooftops.js): one or two per house box, on the roof slab (y = box height), kept 0.9 m inside the box edges.
 *  kind: tank / antenna / dish / solar / bricks, picked deterministically so the mix differs house to house. */
export function abadiRoofSites() {
  const out = [];
  const kinds = ['antenna', 'tank', 'dish', 'solar', 'bricks', 'antenna', 'tank'];
  PLACEMENTS.forEach((p, i) => {
    const th = (p.q * Math.PI) / 2;
    const c = Math.round(Math.cos(th)), sn = Math.round(Math.sin(th));
    ABADI_BOXES[p.v].boxes.forEach((b, j) => {
      const n = (i + j) % 3 === 0 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const h = (i * 31 + j * 17 + k * 7);
        const kind = kinds[(i * 3 + j * 5 + k * 2) % kinds.length];
        if (b.h < 4 && kind === 'tank' && (i + j) % 2) continue; // low roofs: fewer tanks
        const w = b.x1 - b.x0, d = b.z1 - b.z0;
        const lx = b.x0 + 0.9 + (((h * 37) % 100) / 100) * (w - 1.8);
        const lz = b.z0 + 0.9 + (((h * 53 + 11) % 100) / 100) * (d - 1.8) * 0.8; // back side of the roof, away from the lane edge
        out.push({ x: p.x + lx * c + lz * sn, z: p.z - lx * sn + lz * c, y: b.h, yaw: th, kind, pick: h + 1 });
      }
    });
  });
  return out;
}

/** Thin chulha-smoke origins over a few abadi rows (behind the lane-side roof edge, on low 3.3 m roofs), for createAmbientLife. */
export function abadiSmokeSources() {
  const out = [];
  PLACEMENTS.forEach((p, i) => {
    if (i % 3 !== 1) return;
    const L = ABADI_BOXES[p.v].L;
    const c = Math.round(Math.cos((p.q * Math.PI) / 2)), sn = Math.round(Math.sin((p.q * Math.PI) / 2));
    const lx = L / 4 - 0.5, lz = -2;
    out.push({ x: p.x + lx * c + lz * sn, y: 3.4, z: p.z - lx * sn + lz * c });
  });
  return out;
}

const NEAR_DIST = 38; // rows nearer than this draw the detailed Blender model, farther the low-poly proxy
const FAR_DIST = 170; // beyond this (fog) rows aren't drawn at all

function worldBox(p, b) {
  const th = (p.q * Math.PI) / 2;
  const c = Math.round(Math.cos(th)), s = Math.round(Math.sin(th));
  const pts = [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]].map(([x, z]) => [p.x + x * c + z * s, p.z - x * s + z * c]);
  return { minX: Math.min(...pts.map((q) => q[0])), maxX: Math.max(...pts.map((q) => q[0])), minZ: Math.min(...pts.map((q) => q[1])), maxZ: Math.max(...pts.map((q) => q[1])), h: b.h };
}

export function buildBackgroundHouses(scene, kit) {
  const group = new THREE.Group();
  group.name = 'background_houses';

  // Hidden collision/validator backing: one plaster box per house footprint box.
  const old = new THREE.Group();
  old.name = 'bg_houses_old';
  old.visible = false;
  // One hollow shell of 4 thin wall slabs per ROW (not a solid box per house): the world validator samples every plaster surface, and
  // 88 solid per-house boxes doubled its sample count until the headless page ran out of memory. The shell still blocks exactly the
  // row's footprint (colliders are AABBs of the slabs; the interior is unreachable).
  const SLAB = 0.3;
  PLACEMENTS.forEach((p) => {
    const bs = ROWS[p.v].boxes;
    const fx0 = Math.min(...bs.map((b) => b.x0)), fx1 = Math.max(...bs.map((b) => b.x1));
    const fz0 = Math.min(...bs.map((b) => b.z0)), fz1 = Math.max(...bs.map((b) => b.z1));
    const h = Math.min(...bs.map((b) => b.h));
    const slabs = [
      { x0: fx0, x1: fx1, z0: fz1 - SLAB, z1: fz1, h }, { x0: fx0, x1: fx1, z0: fz0, z1: fz0 + SLAB, h },
      { x0: fx0, x1: fx0 + SLAB, z0: fz0 + SLAB, z1: fz1 - SLAB, h }, { x0: fx1 - SLAB, x1: fx1, z0: fz0 + SLAB, z1: fz1 - SLAB, h },
    ];
    // Cut each slab into <=4 m pieces: the validator's surface sampler is quadratic in a triangle's longest horizontal edge, so
    // one 20 m slab alone cost ~40k sample points (6M in total crashed the headless page); 4 m pieces cost ~2k each.
    const pieces = [];
    for (const b of slabs) {
      const alongX = b.x1 - b.x0 >= b.z1 - b.z0;
      const len = alongX ? b.x1 - b.x0 : b.z1 - b.z0;
      const n = Math.max(1, Math.ceil(len / 4));
      for (let i = 0; i < n; i++) {
        pieces.push(alongX ? { ...b, x0: b.x0 + (len * i) / n, x1: b.x0 + (len * (i + 1)) / n } : { ...b, z0: b.z0 + (len * i) / n, z1: b.z0 + (len * (i + 1)) / n });
      }
    }
    for (const b of pieces) {
      const w = worldBox(p, b);
      const mesh = texturedWallBox(w.maxX - w.minX, w.h, w.maxZ - w.minZ, 'plaster', { tint: PALETTE.cream, tileSize: 2, tintStrength: WALL_TINT_STRENGTH, seed: p.x * 3.1 + p.z * 1.7 });
      mesh.position.set((w.minX + w.maxX) / 2, w.h / 2, (w.minZ + w.maxZ) / 2);
      old.add(mesh);
    }
  });
  for (const K of [{ ...KACHCHA, q: 0 }, KACHCHA2]) {
    for (const [x0, x1, z0, z1, h] of KACHCHA_BOXES) {
      const w = worldBox(K, { x0, x1, z0, z1, h });
      const mesh = texturedWallBox(w.maxX - w.minX, h, w.maxZ - w.minZ, 'plaster', { tint: 0xb09572, tileSize: 2, tintStrength: WALL_TINT_STRENGTH, seed: 5.5 });
      mesh.position.set((w.minX + w.maxX) / 2, h / 2, (w.minZ + w.maxZ) / 2);
      old.add(mesh);
    }
  }
  mergeGroupByMaterial(old);
  group.add(old);

  // Dirt lanes between the rows (same 'lane' strip material as the hero lanes -> merges into its draw call).
  const lanes = new THREE.Group();
  lanes.name = 'abadi_lanes';
  LANES.forEach((l, i) => {
    const m = buildStripSegment(new THREE.Vector3(l.a.x, 0, l.a.z), new THREE.Vector3(l.b.x, 0, l.b.z), l.w, { seed: 40 + i, tint: 0xb9a37c });
    lanes.add(m);
    // cement kerbs along the middle of each lane, clear of the junction ends
    for (const k of buildKerbSegments(l.a, l.b, l.w, 0.12, 0.88, { seed: 50 + i })) lanes.add(k);
    // open nali just outside one kerb (side alternates by lane)
    for (const k of buildDrainSegments(l.a, l.b, l.w, 0.12, 0.88, { seed: 60 + i, side: i % 2 ? 1 : -1 })) lanes.add(k);
  });
  group.add(lanes);

  // The visible rows, with distance LOD (the whole abadi would be ~250k triangles at full detail; 400k is the ceiling for the
  // entire view): every row model has a detailed glb (NEAR rows) and a ~400-triangle flat-colour proxy (FAR rows). One
  // InstancedMesh per mesh of each (variant, lod); each refresh re-sorts the placements by distance to the player, rewrites the
  // instance matrices/colours of the near and far sets and sets `count` (rows beyond FAR_DIST aren't drawn at all).
  const loader = getGLTFLoader();
  const sets = []; // { list: [placement], isNear, meshes: [{ inst, base }] }
  const tmp = new THREE.Matrix4();
  const col = new THREE.Color();
  PLACEMENTS.forEach((p, i) => {
    p.M = new THREE.Matrix4().makeRotationY((p.q * Math.PI) / 2).setPosition(p.x, 0, p.z);
    const v = 0.94 + 0.08 * (((i * 7919 + p.v.charCodeAt(0) * 31) % 100) / 100);
    // Limewash variety per row (cream / blush pink / mint / blue-grey), kept pale so roofs and doors stay natural.
    const wash = ABADI_WASHES[(i * 5 + p.v.charCodeAt(0)) % ABADI_WASHES.length];
    p.tint = new THREE.Color(v * wash[0], v * wash[1], v * wash[2]);
  });
  let lastX = null, lastZ = null, refreshedX = 1e9, refreshedZ = 1e9;
  function refresh() {
    if (lastX === null) return;
    for (const set of sets) {
      const list = set.variantPlacements.filter((p) => {
        const d = Math.hypot(p.x - lastX, p.z - lastZ);
        return set.isNear ? d < NEAR_DIST : d >= NEAR_DIST && d < FAR_DIST;
      });
      for (const { inst, base } of set.meshes) {
        list.forEach((p, i) => {
          inst.setMatrixAt(i, tmp.multiplyMatrices(p.M, base));
          inst.setColorAt(i, col.copy(p.tint));
        });
        inst.count = list.length;
        inst.visible = list.length > 0;
        inst.instanceMatrix.needsUpdate = true;
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
        if (list.length) inst.computeBoundingSphere();
      }
    }
    refreshedX = lastX;
    refreshedZ = lastZ;
  }
  for (const [key, def] of Object.entries(ROWS)) {
    const mine = PLACEMENTS.filter((p) => p.v === key);
    if (!mine.length) continue;
    for (const [file, isNear] of [[def.file, true], [def.file.replace('.glb', '_lod.glb'), false]]) {
      loader.load(`assets/models/${file}`, (gltf) => {
        gltf.scene.updateMatrixWorld(true);
        const set = { variantPlacements: mine, isNear, meshes: [] };
        gltf.scene.traverse((m) => {
          if (!m.isMesh) return;
          const inst = new THREE.InstancedMesh(m.geometry, m.material, mine.length);
          inst.count = 0;
          inst.visible = false;
          inst.setColorAt(0, col.setRGB(1, 1, 1)); // allocate instanceColor at full capacity
          inst.castShadow = false; // distant scenery, beyond the useful shadow range
          inst.receiveShadow = isNear;
          inst.userData.mergedStatic = true; // whole-object grounding check: roofs of these are elevated by design
          inst.name = `abadi_row_${key}_${isNear ? 'near' : 'far'}_${m.name || 'mesh'}`;
          group.add(inst);
          set.meshes.push({ inst, base: m.matrixWorld.clone() });
        });
        sets.push(set);
        refresh();
      });
    }
  }

  // The kachcha homestead model (single placed copy; hidden beyond FAR_DIST).
  let kachcha = null;
  let kachcha2 = null;
  getGLTFLoader().load('assets/models/kachcha_homestead.glb', (gltf) => {
    kachcha = gltf.scene;
    kachcha.name = 'kachcha_homestead';
    kachcha.position.set(KACHCHA.x, 0, KACHCHA.z);
    kachcha.traverse((m) => { if (m.isMesh) { m.userData.mergedStatic = true; m.receiveShadow = true; m.castShadow = m.material?.name !== 'hb_props'; } });
    group.add(kachcha);
    kachcha2 = kachcha.clone(true);
    kachcha2.name = 'kachcha_homestead_2';
    kachcha2.position.set(KACHCHA2.x, 0, KACHCHA2.z);
    kachcha2.rotation.y = Math.PI;
    group.add(kachcha2);
  });

  // Cattle resting in the homestead's shed (open side faces +z, manger along the back wall).
  const shedHerd = createCattleHerd([
    { x: KACHCHA.x + 3.9, z: KACHCHA.z - 3.7, rotationY: Math.PI },
    { x: KACHCHA.x + 5.6, z: KACHCHA.z - 3.6, rotationY: Math.PI * 0.93, buffalo: true },
  ]);
  shedHerd.mesh.name = 'kachcha_cattle';
  group.add(shedHerd.mesh);
  const shedHerd2 = createCattleHerd([
    { x: KACHCHA2.x - 3.9, z: KACHCHA2.z + 3.7, rotationY: 0 },
    { x: KACHCHA2.x - 5.6, z: KACHCHA2.z + 3.6, rotationY: Math.PI * -0.07, buffalo: true },
  ]);
  shedHerd2.mesh.name = 'kachcha_cattle_2';
  group.add(shedHerd2.mesh);

  // Called every frame from main.js with the player/vehicle position; the re-sort only runs after the player moved 4 m.
  group.userData.updateVisibility = (px, pz) => {
    lastX = px;
    lastZ = pz;
    const nearKachcha = Math.hypot(px - KACHCHA.x, pz - KACHCHA.z) < FAR_DIST;
    if (kachcha) kachcha.visible = nearKachcha;
    shedHerd.mesh.visible = nearKachcha;
    // 80 m, not FAR_DIST: the far homestead is hazy fog-distance scenery, and drawing it from the hero zone cost a draw call at the 150 ceiling.
    const near2 = Math.hypot(px - KACHCHA2.x, pz - KACHCHA2.z) < 80;
    if (kachcha2) kachcha2.visible = near2;
    shedHerd2.mesh.visible = near2;
    if (Math.hypot(px - refreshedX, pz - refreshedZ) > 4) refresh();
  };

  scene.add(group);
  return group;
}
