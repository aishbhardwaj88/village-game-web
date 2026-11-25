/**
 * Shop, school and workshop props from the unused-asset inventory (docs/unused-3d-inventory.md, 25 Nov 2026): Poly Haven CC0 props_ph plus
 * kettle and radio from props_free. Roads stay EMPTY (her order): every standing prop is >= 0.6 m beyond the drawn road band, outside building
 * footprints, clear of the parked vehicles of src/villageVehicles.js and of each other. Verified by `node tools/placed-props-shops-check.mjs` (0 FAIL).
 * No shop has a walkable interior in code (src/kit/shopsPlace.js, src/smallShops.js have none), so shop goods stand on the frontage under the awning;
 * the school's classroom is hero-coded, so the open-air class stands in the school yard (local x -7..-3, z -2..4, clear of the gate lane and the wings).
 * Not placed: roller shutters, ceiling fan, fluorescent lights, wall clocks, pocket watch, lightbulb, pipe lamp, gate latch (wall or ceiling parts, no mount
 * point in code); modular_chainlink_fence (334 KB, not slimmed); water_tank (Panchayat roof, other task); general-store rects on the inner loop (front is on the road).
 * SIZE = real-world LONGEST dimension in metres per file (a 1.7 m villager is the yardstick; manifest sizes that look odd are judged by the model's own box:
 * the bench vice, tool chest, school chair and barber chair are scaled down to real size). Every prop is scaled so its own bounding-box longest side equals
 * SIZE x s, s = per-instance jitter 0.92-1.08. yaw = rotation.y (a model's +z is its front). y = lift above the ground for a prop standing on a table.
 * Streams after Play (gateRadius 0): one site per cluster, one shared GLB request per file inside a site, one clone per instance (materials shared, tiny props).
 */
import * as THREE from 'three';
import { colliderBoxFromTransform } from './collision.js';
import { registerPropSite } from './propGate.js';

export const SIZE = {
  alarm_clock_01: 0.17, bananas: 0.45, barbershopchair_01: 1.1, boombox: 0.5, cardboard_box_01: 0.5, cashregister_01: 0.42, cassette_player: 0.24,
  food_apple_01: 0.09, food_pomegranate_01: 0.11, lemon: 0.07, metal_stool_02: 0.46, ornate_mirror_01: 0.7, painted_wooden_shelves: 1.3,
  plastic_container: 0.8, plastic_crate_01: 0.42, plastic_crate_02: 0.5, plastic_crate_03: 0.45, shelf_01: 1.8, steel_frame_shelves_01: 1.8,
  steel_frame_shelves_02: 1.8, sweet_potato: 0.12, television_02: 0.42, woodentable_01: 1.5, woodentable_02: 0.4, woodentable_03: 1.2, worn_metal_rack: 1.7,
  yellow_onion: 0.08, food_ginger_01: 0.25, food_lime_01: 0.05, food_lychee_01: 0.04, food_pears_asian_01: 0.15,
  schooldesk_01: 0.85, schoolchair_01: 0.85, standing_chalkboard_01: 1.2, binder_notebook: 0.3, stationery_supplies: 0.2, megaphone_01: 0.3, dustpan: 0.35,
  adjustable_wrench: 0.25, barrel_stove: 0.86, bench_vice_01: 0.3, metal_stool_03: 0.75, metal_tool_chest: 0.7, metal_toolbox: 0.4, pastic_torch_6v: 0.22,
  portable_searchlight: 0.25, rusted_wheel_rim_02: 0.45, small_plastic_torch: 0.2, industrial_storage_cart: 1.25,
  kettle: 0.3, radio: 0.36, outdoor_table_chair_set_01: 1.8,
};
const FREE = new Set(['kettle', 'radio']); // props_free; everything else is props_ph

export const PLACED = [
  // General store front
  { f: 'steel_frame_shelves_01', x: 613.13, z: -112.51, yaw: -1.833, s: 0.955 },
  { f: 'worn_metal_rack', x: 614.11, z: -115.35, yaw: -1.925, s: 0.997 },
  { f: 'plastic_crate_01', x: 612.34, z: -112.37, yaw: -1.8, s: 0.969 },
  { f: 'plastic_crate_02', x: 612.26, z: -113.04, yaw: -0.842, s: 0.922 },
  { f: 'cardboard_box_01', x: 613.73, z: -115.91, yaw: -1.834, s: 1.012 },
  { f: 'plastic_container', x: 612.9, z: -115.68, yaw: -1.965, s: 0.922 },
  { f: 'metal_stool_02', x: 613.1, z: -115.07, yaw: -1.31, s: 1.062 },
  { f: 'woodentable_03', x: 612.18, z: -113.7, yaw: -1.775, s: 0.936 },
  { f: 'cashregister_01', x: 612.18, z: -113.7, yaw: -1.847, s: 1.073, y: 0.68 },
  { f: 'woodentable_01', x: 614.37, z: -116.79, yaw: -0.434, s: 1.072 },
  { f: 'food_apple_01', x: 614.08, z: -117.05, yaw: -0.314, s: 0.947, y: 0.48 },
  { f: 'food_apple_01', x: 614.58, z: -116.65, yaw: 1.359, s: 1.072, y: 0.48 },
  { f: 'food_apple_01', x: 614.17, z: -116.66, yaw: 3.086, s: 1.08, y: 0.48 },
  { f: 'food_apple_01', x: 614.83, z: -116.63, yaw: 4.568, s: 0.989, y: 0.48 },
  { f: 'food_pomegranate_01', x: 614.1, z: -117.09, yaw: -0.624, s: 1.018, y: 0.48 },
  { f: 'food_pomegranate_01', x: 614.6, z: -116.69, yaw: 1.399, s: 1.072, y: 0.48 },
  { f: 'bananas', x: 614.18, z: -116.91, yaw: -0.284, s: 0.976, y: 0.48 },
  { f: 'lemon', x: 613.99, z: -116.85, yaw: -0.368, s: 0.92, y: 0.48 },
  { f: 'lemon', x: 614.66, z: -116.82, yaw: 1.286, s: 1.072, y: 0.48 },
  { f: 'lemon', x: 614.25, z: -116.84, yaw: 2.97, s: 1.029, y: 0.48 },
  { f: 'yellow_onion', x: 613.96, z: -116.79, yaw: -0.461, s: 1.056, y: 0.48 },
  { f: 'yellow_onion', x: 614.63, z: -116.76, yaw: 1.465, s: 1.068, y: 0.48 },
  { f: 'yellow_onion', x: 614.22, z: -116.78, yaw: 3.09, s: 0.988, y: 0.48 },
  { f: 'sweet_potato', x: 613.96, z: -116.79, yaw: -0.544, s: 1.001, y: 0.48 },
  { f: 'sweet_potato', x: 614.63, z: -116.76, yaw: 1.087, s: 0.928, y: 0.48 },
  { f: 'sweet_potato', x: 614.22, z: -116.78, yaw: 2.81, s: 1.052, y: 0.48 },
  // Ration shop front
  { f: 'steel_frame_shelves_02', x: 589.82, z: -54.37, yaw: 2.22, s: 0.936 },
  { f: 'steel_frame_shelves_02', x: 587.17, z: -59.76, yaw: 2.256, s: 1.074 },
  { f: 'shelf_01', x: 588.87, z: -55.74, yaw: 2.113, s: 0.945 },
  { f: 'plastic_crate_03', x: 588.11, z: -59.21, yaw: 1.944, s: 1.031 },
  { f: 'plastic_crate_01', x: 588.2, z: -59.93, yaw: 2.874, s: 1.052 },
  { f: 'cardboard_box_01', x: 590.01, z: -55.58, yaw: 2.022, s: 1.061 },
  { f: 'cardboard_box_01', x: 590.68, z: -55.13, yaw: 3.321, s: 1.001 },
  { f: 'plastic_container', x: 591.34, z: -54.68, yaw: 2.148, s: 0.936 },
  { f: 'woodentable_01', x: 589.25, z: -59.16, yaw: 3.535, s: 1.041 },
  { f: 'alarm_clock_01', x: 589.71, z: -59.35, yaw: 3.509, s: 1.058, y: 0.46 },
  { f: 'cassette_player', x: 588.93, z: -59.14, yaw: 3.843, s: 0.92, y: 0.46 },
  { f: 'boombox', x: 589.33, z: -58.98, yaw: 3.658, s: 0.925, y: 0.48 },
  { f: 'woodentable_02', x: 588.25, z: -60.96, yaw: 2.152, s: 0.967 },
  { f: 'television_02', x: 588.25, z: -60.96, yaw: 2.208, s: 0.971, y: 0.38 },
  // Bazaar kirana
  { f: 'shelf_01', x: 595.95, z: -112.99, yaw: 1.22, s: 1.078 },
  { f: 'plastic_crate_02', x: 596.03, z: -111.15, yaw: 1.592, s: 1.041 },
  { f: 'cardboard_box_01', x: 596.88, z: -112.33, yaw: 3.221, s: 1.025 },
  { f: 'plastic_container', x: 596.68, z: -110.6, yaw: 1.329, s: 0.959 },
  // Bazaar sabzi
  { f: 'woodentable_03', x: 594.8, z: -107.77, yaw: 1.272, s: 1 },
  { f: 'bananas', x: 594.71, z: -107.57, yaw: 1.193, s: 0.993, y: 0.73 },
  { f: 'food_pears_asian_01', x: 594.54, z: -107.46, yaw: 1.276, s: 0.999, y: 0.73 },
  { f: 'food_pears_asian_01', x: 594.86, z: -108.01, yaw: 3.024, s: 0.939, y: 0.73 },
  { f: 'food_pears_asian_01', x: 594.9, z: -107.6, yaw: 4.671, s: 1.051, y: 0.73 },
  { f: 'food_pears_asian_01', x: 594.84, z: -108.26, yaw: 6.258, s: 1.01, y: 0.73 },
  { f: 'food_ginger_01', x: 594.71, z: -107.41, yaw: 1.221, s: 1.044, y: 0.73 },
  { f: 'food_ginger_01', x: 595.04, z: -107.96, yaw: 3.001, s: 0.937, y: 0.73 },
  { f: 'food_lime_01', x: 594.85, z: -107.37, yaw: 1.151, s: 0.982, y: 0.73 },
  { f: 'food_lime_01', x: 594.8, z: -108.03, yaw: 3.141, s: 1.002, y: 0.73 },
  { f: 'food_lime_01', x: 594.83, z: -107.63, yaw: 4.538, s: 0.983, y: 0.73 },
  { f: 'food_lime_01', x: 594.78, z: -108.28, yaw: 6.506, s: 1.054, y: 0.73 },
  { f: 'food_lychee_01', x: 594.71, z: -107.41, yaw: 1.168, s: 1.036, y: 0.73 },
  { f: 'food_lychee_01', x: 595.04, z: -107.96, yaw: 2.866, s: 0.965, y: 0.73 },
  { f: 'food_lychee_01', x: 594.69, z: -107.67, yaw: 4.839, s: 0.97, y: 0.73 },
  { f: 'food_lychee_01', x: 595.01, z: -108.21, yaw: 6.397, s: 1.031, y: 0.73 },
  { f: 'lemon', x: 594.79, z: -107.39, yaw: 1.277, s: 0.988, y: 0.73 },
  { f: 'lemon', x: 594.73, z: -108.05, yaw: 3.069, s: 0.991, y: 0.73 },
  { f: 'lemon', x: 594.77, z: -107.64, yaw: 4.786, s: 0.922, y: 0.73 },
  { f: 'plastic_crate_03', x: 594.48, z: -106.29, yaw: 1.63, s: 1.045 },
  { f: 'plastic_crate_01', x: 595.59, z: -109.07, yaw: 3.117, s: 1.045 },
  // Bazaar medical
  { f: 'metal_stool_02', x: 593.16, z: -102.94, yaw: 1.326, s: 1.018 },
  { f: 'cardboard_box_01', x: 593.54, z: -104.29, yaw: 2.513, s: 1.055 },
  // Bazaar tailor
  { f: 'metal_stool_02', x: 591.92, z: -98.07, yaw: 3.445, s: 0.942 },
  { f: 'plastic_crate_02', x: 593.82, z: -99.5, yaw: 2.117, s: 0.938 },
  // Bazaar barber
  { f: 'barbershopchair_01', x: 590.58, z: -95.25, yaw: 1.354, s: 1.059 },
  { f: 'woodentable_03', x: 589.74, z: -94.39, yaw: 1.41, s: 0.978 },
  { f: 'ornate_mirror_01', x: 589.74, z: -94.39, yaw: 1.442, s: 1.019, y: 0.71 },
  // Bazaar mobile
  { f: 'woodentable_03', x: 588.42, z: -90.19, yaw: 1.41, s: 0.935 },
  { f: 'television_02', x: 588.37, z: -89.89, yaw: 1.503, s: 1.02, y: 0.68 },
  { f: 'boombox', x: 588.48, z: -90.54, yaw: 1.821, s: 1.012, y: 0.68 },
  { f: 'cassette_player', x: 588.32, z: -90.21, yaw: 2.495, s: 0.974, y: 0.68 },
  { f: 'metal_stool_02', x: 588.54, z: -89.61, yaw: 1.973, s: 1.071 },
  // Bazaar bangle
  { f: 'plastic_crate_02', x: 587.43, z: -87.46, yaw: 1.613, s: 0.941 },
  { f: 'plastic_crate_03', x: 587.01, z: -85.7, yaw: 2.848, s: 0.998 },
  // Bazaar puncture unit
  { f: 'rusted_wheel_rim_02', x: 585.9, z: -83.23, yaw: 1.211, s: 0.987 },
  { f: 'rusted_wheel_rim_02', x: 586, z: -82.03, yaw: 2.619, s: 1.032 },
  { f: 'metal_toolbox', x: 585.22, z: -81.35, yaw: 1.252, s: 1.056 },
  { f: 'adjustable_wrench', x: 585.22, z: -81.35, yaw: 1.918, s: 0.972, y: 0.31 },
  { f: 'metal_stool_03', x: 586.67, z: -83.59, yaw: 2.129, s: 0.958 },
  // Puncture shop
  { f: 'barrel_stove', x: 557.45, z: -117.15, yaw: 3.272, s: 0.932 },
  { f: 'woodentable_03', x: 555.56, z: -117.68, yaw: 3.245, s: 0.931 },
  { f: 'bench_vice_01', x: 555.86, z: -117.71, yaw: 3.22, s: 0.982, y: 0.68 },
  { f: 'adjustable_wrench', x: 555.21, z: -117.69, yaw: 4.151, s: 1.025, y: 0.68 },
  { f: 'metal_tool_chest', x: 553.26, z: -117.61, yaw: 3.285, s: 1.069 },
  { f: 'metal_toolbox', x: 552.06, z: -117.83, yaw: 3.864, s: 0.931 },
  { f: 'pastic_torch_6v', x: 552.06, z: -117.83, yaw: 4.09, s: 1.006, y: 0.28 },
  { f: 'rusted_wheel_rim_02', x: 551.26, z: -117.94, yaw: 3.038, s: 1.03 },
  { f: 'metal_stool_03', x: 559.21, z: -113.73, yaw: 3.827, s: 0.983 },
  // Petrol pump workshop corner
  { f: 'industrial_storage_cart', x: 468.61, z: -112.66, yaw: 4.752, s: 1.058 },
  { f: 'metal_toolbox', x: 468.61, z: -112.66, yaw: 5.069, s: 0.977, y: 1.1 },
  { f: 'metal_stool_03', x: 468.56, z: -115.66, yaw: 3.581, s: 0.988 },
  { f: 'metal_tool_chest', x: 468.66, z: -108.66, yaw: 4.142, s: 1.076 },
  // Tea stall
  { f: 'outdoor_table_chair_set_01', x: 592.14, z: 4.18, yaw: 1.758, s: 1.016 },
  { f: 'woodentable_02', x: 589.08, z: 3.19, yaw: 0.562, s: 0.963 },
  { f: 'kettle', x: 589.08, z: 3.19, yaw: 0.617, s: 1.036, y: 0.37 },
  // School open-air class
  { f: 'standing_chalkboard_01', x: 553.15, z: 116.26, yaw: 3.189, s: 0.93 },
  { f: 'schooldesk_01', x: 551.02, z: 113.72, yaw: 0.268, s: 0.92 },
  { f: 'binder_notebook', x: 551.02, z: 113.72, yaw: 0.73, s: 1.046, y: 0.78 },
  { f: 'schoolchair_01', x: 550.93, z: 113.11, yaw: -0.016, s: 0.92 },
  { f: 'schooldesk_01', x: 552.49, z: 113.43, yaw: 0.438, s: 0.952 },
  { f: 'stationery_supplies', x: 552.49, z: 113.43, yaw: 1.053, s: 1.006, y: 0.81 },
  { f: 'schoolchair_01', x: 552.4, z: 112.82, yaw: 0.281, s: 0.952 },
  { f: 'schooldesk_01', x: 553.96, z: 113.14, yaw: 0.226, s: 0.984 },
  { f: 'schoolchair_01', x: 553.87, z: 112.53, yaw: 0.373, s: 0.984 },
  { f: 'schooldesk_01', x: 550.8, z: 112.03, yaw: 0.066, s: 1.016 },
  { f: 'schoolchair_01', x: 550.66, z: 111.43, yaw: 0.126, s: 1.016 },
  { f: 'schooldesk_01', x: 552.28, z: 111.74, yaw: 0.41, s: 1.048 },
  { f: 'schoolchair_01', x: 552.14, z: 111.14, yaw: 0.216, s: 1.048 },
  { f: 'schooldesk_01', x: 553.75, z: 111.45, yaw: 0.138, s: 1.08 },
  { f: 'megaphone_01', x: 553.75, z: 111.45, yaw: 0.763, s: 1.008, y: 0.77 },
  { f: 'schoolchair_01', x: 553.61, z: 110.85, yaw: 0.167, s: 1.08 },
  { f: 'dustpan', x: 555.6, z: 116.28, yaw: 1.055, s: 0.943 },
];

const CLUSTER_M = 60; // props within this distance of a cluster's first member share one propGate site

function clusters() {
  const out = [];
  for (const v of PLACED) {
    let c = out.find((k) => Math.hypot(k.x0 - v.x, k.z0 - v.z) < CLUSTER_M);
    if (!c) { c = { x0: v.x, z0: v.z, list: [] }; out.push(c); }
    c.list.push(v);
  }
  for (const c of out) {
    c.x = c.list.reduce((s, v) => s + v.x, 0) / c.list.length; c.z = c.list.reduce((s, v) => s + v.z, 0) / c.list.length;
    c.extent = Math.max(...c.list.map((v) => Math.hypot(v.x - c.x, v.z - c.z))) + 4;
    c.files = [...new Set(c.list.map((v) => v.f))];
  }
  return out;
}
const urlOf = (f) => `assets/${FREE.has(f) ? 'props_free' : 'props_ph'}/${f}.glb`;

export function registerShopProps(scene, groundAt) {
  clusters().forEach((c, i) => registerPropSite({
    name: `shop_props_${i}`, gateRadius: 0, center: { x: c.x, z: c.z }, extent: c.extent,
    items: c.files.map((f) => ({ url: urlOf(f), size: SIZE[f] })),
    makeGroup: () => new THREE.Group(), build: (gltfs, group) => buildCluster(c, gltfs, group, groundAt),
  }));
}

function buildCluster(c, gltfs, group, groundAt) {
  c.list.forEach((v) => {
    const g = gltfs[c.files.indexOf(v.f)];
    if (!g) return;
    const m = g.scene.clone(true); // one shared request per file, one copy per prop (geometry and materials shared)
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const k = (SIZE[v.f] * v.s) / Math.max(size.x, size.y, size.z); // the model's own box decides, not the manifest
    const ctr = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.name = `shopprop_${v.f}`;
    holder.userData.propSize = SIZE[v.f];
    m.scale.multiplyScalar(k);
    m.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
    holder.add(m);
    holder.position.set(v.x, (groundAt ? groundAt(v.x, v.z) : 0) + (v.y || 0), v.z);
    holder.rotation.y = v.yaw;
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    holder.updateMatrixWorld(true);
    const w = size.x * k, d = size.z * k, h = size.y * k;
    if (!v.y && Math.max(w, d) >= 0.5 && h >= 0.4) { // big enough to walk into: a collider along the prop's own heading
      holder.userData.colliderBoxes = [colliderBoxFromTransform(w, d, new THREE.Matrix4().makeRotationY(v.yaw).setPosition(v.x, 0, v.z))];
    }
    group.add(holder);
  });
}
