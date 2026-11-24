/**
 * Free-prop review row (24 Nov 2026): Sketchfab CC BY props, slimmed (meshopt + WebP, matte, colour-shifted, brands
 * painted out) and lined up on open ground at x 600-612, z 36-40 for the art director to judge. Loaded only AFTER Play,
 * in small groups (Poly Haven rows at z 26-34 too), so nothing here costs start-up time. Other workers place them in the village later.
 * Credits: docs/CREDITS.md. Files: public/assets/props_free/.
 */
import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';
import { colliderBoxFromTransform, requestColliderRebuild } from './collision.js';

// dim: 'h' = height, 'l' = longest horizontal side, in metres. solid: gets a collider.
export const FREE_PROPS = [
  // group 1: small tools and kitchen things
  { file: 'matka', dim: 'h', size: 0.45 }, { file: 'milk_can', dim: 'h', size: 0.55 }, { file: 'bucket', dim: 'h', size: 0.3 },
  { file: 'bucket_b', dim: 'h', size: 0.26 }, { file: 'watering_can', dim: 'h', size: 0.35 }, { file: 'kettle', dim: 'h', size: 0.26 },
  { file: 'pressure_cooker', dim: 'h', size: 0.26 }, { file: 'kerosene_lamp', dim: 'h', size: 0.36 },
  // group 2: farm tools and household
  { file: 'pitchfork_a', dim: 'h', size: 1.6 }, { file: 'pitchfork_b', dim: 'h', size: 1.5 }, { file: 'sickle', dim: 'h', size: 0.4 },
  { file: 'radio', dim: 'l', size: 0.36 }, { file: 'sewing_machine', dim: 'l', size: 0.42 }, { file: 'trunk', dim: 'l', size: 0.75, solid: true },
  { file: 'handpump', dim: 'h', size: 0.9, solid: true }, { file: 'hay_bale', dim: 'h', size: 0.5, solid: true },
  // group 3: big pieces
  { file: 'grind_stone', dim: 'l', size: 1.0, solid: true }, { file: 'wheelbarrow', dim: 'l', size: 1.4, solid: true },
  { file: 'charpai_a', dim: 'l', size: 1.9, solid: true }, { file: 'charpai_b', dim: 'l', size: 1.9, solid: true },
  { file: 'gate', dim: 'l', size: 1.6, solid: true }, { file: 'well_a', dim: 'h', size: 1.1, solid: true },
  { file: 'well_c', dim: 'h', size: 1.1, solid: true }, { file: 'water_tank', dim: 'h', size: 4.0, solid: true },
];
const GROUPS = [8, 8, 8];

// Poly Haven CC0 review rows (24 Nov 2026), real sizes from docs/props_ph_manifest.json (dim 'h' = real height in metres).
// Outdoor things first (z 33.5 and 31.3), then shop/school/kitchen interior pieces in their own rows (z 29.4, 28.0, 26.9).
const ROW_X0 = 600.4, ROW_X1 = 612, ROW_Z = [36.4, 39.4], GAP = 0.3;
const PH = 'assets/props_ph/';
const o = (file, h, solid) => ({ file, dim: 'h', size: h, solid: !!solid });
export const PH_OUTDOOR = [
  o('barrel_01', 0.88, 1), o('barrel_02', 0.88, 1), o('barrel_03', 0.93, 1), o('hand_truck', 1.402), o('wooden_ladder', 1.335),
  o('standing_chalkboard_01', 1.509), o('planter_box_01', 0.425, 1), o('periwinkle_plant', 0.346), o('wooden_broom', 1.444),
  o('rusted_spade_01', 1.101), o('power_box_01', 0.503, 1), o('tire_pump', 0.58), o('rusted_wheel_rim_01', 0.439),
  o('folding_wooden_stool', 0.442), o('metal_stool_03', 1.023), o('plastic_crate_01', 0.264), o('plastic_crate_02', 0.254),
  o('cardboard_box_01', 0.342), o('metal_jerrycan', 0.454), o('plastic_jerrycan', 0.318), o('metal_jug', 0.288), o('lantern_01', 0.234),
  o('watering_can_metal_01', 0.192), o('ceramic_pot', 0.372), o('metal_toolbox', 0.305), o('metal_tool_chest', 1.016, 1),
  o('hatchet', 0.289), o('adjustable_wrench', 0.253), o('dustpan', 0.1), o('football', 0.22),
];
export const PH_INDOOR = [
  o('painted_wooden_table', 0.959, 1), o('woodentable_01', 0.549, 1), o('woodentable_03', 0.83, 1), o('shelf_01', 2.08, 1),
  o('steel_frame_shelves_01', 2.141, 1), o('steel_frame_shelves_02', 2.142, 1), o('worn_metal_rack', 1.9, 1),
  o('painted_wooden_shelves', 1.125, 1), o('barbershopchair_01', 1.489), o('cashregister_01', 0.62), o('boombox', 0.406),
  o('television_02', 0.411), o('ornate_mirror_01', 0.744), o('schooldesk_01', 0.883), o('schoolchair_01', 1.006),
  o('metal_stool_02', 0.458), o('woodentable_02', 0.418), o('binder_notebook', 0.025), o('stationery_supplies', 0.164),
  o('cassette_player', 0.236), o('alarm_clock_01', 0.172), o('pocket_watch', 0.076), o('bananas', 0.179), o('food_apple_01', 0.085),
  o('food_pomegranate_01', 0.115), o('lemon', 0.095), o('sweet_potato', 0.1), o('yellow_onion', 0.086),
];
export function addFreeProps(scene, groundAt) {
  const group = new THREE.Group();
  group.name = 'free_props';
  scene.add(group);
  // one placer per set of rows; each keeps its own cursor so groups of one set continue where the last stopped
  const placer = (rows) => {
    let cx = ROW_X0, row = 0;
    return (v, gltf) => {
      const m = gltf.scene;
      m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3());
      const k = v.size / (v.dim === 'h' ? size.y : Math.max(size.x, size.z));
      const c = box.getCenter(new THREE.Vector3());
      const w = size.x * k, d = size.z * k;
      if (cx + w > ROW_X1 && cx > ROW_X0) { cx = ROW_X0; row = Math.min(row + 1, rows.length - 1); }
      const x = cx + w / 2, z = rows[row];
      cx += w + GAP;
      const holder = new THREE.Group();
      holder.name = `free_${v.file}`;
      m.scale.multiplyScalar(k);
      m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
      holder.add(m);
      holder.position.set(x, groundAt ? groundAt(x, z) : 0, z);
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      if (v.solid) holder.userData.colliderBoxes = [colliderBoxFromTransform(w, d, new THREE.Matrix4().setPosition(x, 0, z))];
      group.add(holder);
    };
  };
  const jobs = [];
  const pFree = placer(ROW_Z);
  let from = 0;
  for (const n of GROUPS) { jobs.push({ part: FREE_PROPS.slice(from, from + n), place: pFree, dir: 'assets/props_free/' }); from += n; }
  const pOut = placer([33.5, 31.3]), pIn = placer([29.4, 28.0, 26.9]);
  for (let i = 0; i < PH_OUTDOOR.length; i += 10) jobs.push({ part: PH_OUTDOOR.slice(i, i + 10), place: pOut });
  for (let i = 0; i < PH_INDOOR.length; i += 10) jobs.push({ part: PH_INDOOR.slice(i, i + 10), place: pIn });
  let chain = Promise.resolve();
  for (const j of jobs) {
    chain = chain.then(() => Promise.all(j.part.map((v) => getGLTFLoader().loadAsync(`${j.dir}${v.file}.glb`)
      .catch((e) => { console.warn('[freeProps]', v.file, e); return null; })))
      .then((gs) => { gs.forEach((g, i) => { if (g) j.place(j.part[i], g); }); requestColliderRebuild(); }));
  }
  return chain;
}
