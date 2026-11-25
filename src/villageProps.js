/**
 * Doorstep props from real CC0 Poly Haven scans (public/assets/props, shrunk with tools/shrink.js): stools, buckets, baskets, potted
 * plants in clay pots (potted_plant_01/02/04, replacing the bare clay planter, vase and jug 2026-10-24), jugs, crates, a stacked tyre, a monobloc chair. Sites come from the abadi rows (scenery.js abadiPropSites); the village is
 * cut into streamed cells and each cell draws one InstancedMesh per model it uses, so repeats cost no extra draws and nothing is
 * built far from the player. Per-instance scale, yaw, tint and a slight tilt vary every copy. Sites that would touch a collider
 * are dropped at build time. Credits: docs/CREDITS.md.
 */
import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';
import { STATIC_COLLIDERS, circleHitsAnyBox } from './collision.js';

// file, real-world height (m), weight in the pick table
const MODELS = [
  ['wooden_stool_01', 0.42, 3], ['painted_wooden_stool', 0.4, 2], ['wooden_bucket_01', 0.3, 3], ['wooden_bucket_02', 0.28, 2],
  ['wicker_basket_01', 0.34, 2], ['wicker_basket_02', 0.3, 2], ['potted_plant_02', 0.6, 4], ['brass_pot_01', 0.3, 2],
  ['potted_plant_04', 0.3, 2], ['metal_jug', 0.28, 2], ['wooden_crate_01', 0.38, 2], ['wooden_crate_02', 0.34, 2],
  ['old_tyre', 0.22, 1], ['potted_plant_02', 0.7, 2], ['plastic_monobloc_chair_01', 0.82, 2], ['painted_wooden_bench', 0.5, 1],
  // 24 Nov playtest note (item 5, "street life ... tables, chairs ... existing props ... placed too rarely"): already-shrunk,
  // already-credited (docs/CREDITS.md) CC0 props not yet wired into the doorstep scatter - small_wooden_table_01 was flagged
  // there as "Not found in the game code (maybe unused)"; round_wooden_table_01/painted_wooden_chair_01 are already used in
  // the Carrom scene (src/farmSites.js) and share loadModel()'s cache, so reusing them here adds no new fetch.
  ['small_wooden_table_01', 0.68, 2], ['round_wooden_table_01', 0.72, 1], ['painted_wooden_chair_01', 0.82, 3],
  // 25 Nov (BACKLOG "CC0 prop sourcing before hand-building"): jug_01 and ceramic_vase_01 were already downloaded, shrunk
  // and credited (docs/CREDITS.md line 76) but never wired into any scene - caught while checking that list against
  // src/villageProps.js. Real heights measured from the .glb bounding box (jug_01 0.211 m, ceramic_vase_01 0.4 m), not
  // guessed. Same doorstep-clutter role as brass_pot_01/metal_jug, lower weight so they read as occasional variety.
  ['jug_01', 0.211, 2], ['ceramic_vase_01', 0.4, 1],
];
const TABLE = MODELS.flatMap((m, i) => Array(m[2]).fill(i));
// Dedicated pool for item 4 ("houses need flower pots, plants and climbers ... use the existing props potted_plant_*,
// planter_pot_clay"): a doorstep/parapet site list that should read as plants, not furniture, uses this instead of MODELS.
export const PLANT_MODELS = [
  ['potted_plant_01', 0.45, 3], ['potted_plant_02', 0.6, 3], ['potted_plant_04', 0.3, 2], ['planter_pot_clay', 0.35, 2],
];
const CELL = 36; // metres
const RADIUS = 0.3;

const cache = new Map(); // file -> Promise<[{ geometry, material, matrix }]>
// Exported so a one-off deterministic placement (not this file's random per-cell doorstep scatter) can reuse the
// same load-once/fit-to-height/centre-on-ground logic instead of duplicating it (see src/shopGoods.js loadSodaCrate).
export function loadModel(file, height) {
  if (!cache.has(file)) {
    cache.set(file, getGLTFLoader().loadAsync(`assets/props/${file}.glb`).then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const k = height / Math.max(0.01, box.max.y - box.min.y);
      const fit = new THREE.Matrix4().makeScale(k, k, k);
      const c = box.getCenter(new THREE.Vector3());
      fit.setPosition(-c.x * k, -box.min.y * k, -c.z * k);
      const parts = [];
      gltf.scene.traverse((m) => { if (m.isMesh) parts.push({ geometry: m.geometry, material: m.material, matrix: new THREE.Matrix4().multiplyMatrices(fit, m.matrixWorld) }); });
      return parts;
    }));
  }
  return cache.get(file);
}

/** Group the sites into streamed cells: [{ id, x, z, sites }]. */
export function propCells(sites) {
  const cells = new Map();
  for (const s of sites) {
    const key = `${Math.floor(s.x / CELL)}_${Math.floor(s.z / CELL)}`;
    if (!cells.has(key)) cells.set(key, { id: `props_${key}`, x: (Math.floor(s.x / CELL) + 0.5) * CELL, z: (Math.floor(s.z / CELL) + 0.5) * CELL, sites: [] });
    cells.get(key).sites.push(s);
  }
  return [...cells.values()];
}

/** `models`: an optional MODELS-shaped override (e.g. PLANT_MODELS) so a caller's sites read as one kind of prop (plants)
 *  instead of the default general furniture mix. Default behaviour (no 3rd arg) is unchanged. */
export function createPropCell(cell, models = MODELS) {
  const table = models === MODELS ? TABLE : models.flatMap((m, i) => Array(m[2]).fill(i));
  const group = new THREE.Group();
  group.name = cell.id;
  const byModel = new Map();
  for (const s of cell.sites) {
    if (circleHitsAnyBox({ x: s.x, z: s.z }, RADIUS, STATIC_COLLIDERS)) continue;
    const mi = table[s.pick % table.length];
    if (!byModel.has(mi)) byModel.set(mi, []);
    byModel.get(mi).push(s);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  for (const [mi, list] of byModel) {
    const [file, height] = models[mi];
    loadModel(file, height).then((parts) => {
      for (const part of parts) {
        const inst = new THREE.InstancedMesh(part.geometry, part.material, list.length);
        list.forEach((s, i) => {
          const k = 0.85 + (((s.pick * 29) % 100) / 100) * 0.3;
          e.set(((s.pick % 5) - 2) * 0.012, s.yaw, ((s.pick % 7) - 3) * 0.012);
          q.setFromEuler(e);
          sc.set(k, k * (0.96 + (s.pick % 4) * 0.02), k);
          m4.compose(v.set(s.x, 0, s.z), q, sc).multiply(part.matrix);
          inst.setMatrixAt(i, m4);
          const t = 0.8 + (((s.pick * 17) % 100) / 100) * 0.2;
          inst.setColorAt(i, col.setRGB(t, t * (0.96 + (s.pick % 3) * 0.02), t * 0.94));
        });
        inst.castShadow = false;
        inst.receiveShadow = true;
        inst.userData.mergedStatic = true;
        inst.name = `prop_${file}`;
        group.add(inst);
      }
    });
  }
  return group;
}
