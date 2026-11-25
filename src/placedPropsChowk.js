/**
 * Placed props, chowk and lanes batch (26 Nov 2026): the unused free + Poly Haven props that belong in the open village, put where they are used.
 * RULE: roads stay EMPTY. Every row is verified by `node tools/placed-props-chowk-check.mjs` (every footprint corner >= 0.6 m beyond the drawn road
 * band + dusty apron, outside building footprints, clear of trees / ponds / crops, clear of src/villageVehicles.js, wells and pumps >= 6 m from any
 * existing well or pump, 0 FAIL). Not owned here: charpai, matka, milk_can, hay_bale, pitchfork, wheelbarrow (src/placedPropsFarm.js), school and shop furniture
 * (src/placedPropsShops.js). No shrines, no brands, no alcohol or tobacco.
 * Streams after Play (gateRadius 0): one propGate site per cluster of rows, one shared GLB request per file inside a site, one clone per instance.
 *
 * SIZES: len = real-world size in metres, dim = which side it measures: 'h' height, 'l' longest horizontal side, 'long' longest of all three
 * (same words as src/freeProps.js). A 1.7 m villager is the yardstick: well ~1.8 m wide with a 0.8 m parapet, tank 1.2, ladder 2.2, broom 1.2 ...
 * fp = footprint [width, depth] in metres AFTER fit and `lie` (used for the collider and for tools/placed-props-chowk-check.mjs).
 * top = height a thing stands on (stool, fire pit) when another row says `on`. lie = lay it flat (thin axis up): 'x' or 'z' = axis it is turned about.
 * solid = gets a collider. Rows: s = size jitter 0.92-1.08, yaw = heading; same-file neighbours differ by >= 0.35 rad and >= 0.03 in s.
 */
import * as THREE from 'three';
import { colliderBoxFromTransform } from './collision.js';
import { registerPropSite } from './propGate.js';

const F = 'assets/props_free/', P = 'assets/props_ph/';
export const SIZES = {
  well_a: { dir: F, len: 1.8, dim: 'l', fp: [1.8, 1.1], solid: true }, // village well, parapet ~0.8 m
  well_c: { dir: F, len: 1.7, dim: 'l', fp: [1.7, 1.6], solid: true }, // old well with a pulley frame, ~2.1 m tall
  handpump: { dir: F, len: 1.1, dim: 'h', fp: [1.4, 1.6], solid: true },
  water_tank: { dir: F, len: 1.2, dim: 'l', fp: [1.15, 1.2], solid: true },
  gate: { dir: F, len: 1.25, dim: 'h', fp: [0.4, 1.05], solid: true },
  trunk: { dir: F, len: 0.75, dim: 'l', fp: [0.41, 0.75] },
  radio: { dir: F, len: 0.36, dim: 'l', fp: [0.36, 0.15] },
  sewing_machine: { dir: F, len: 0.42, dim: 'l', fp: [0.42, 0.2] },
  kettle: { dir: F, len: 0.26, dim: 'h', fp: [0.34, 0.17] },
  kerosene_lamp: { dir: F, len: 0.36, dim: 'h', fp: [0.19, 0.2] },
  bucket: { dir: F, len: 0.3, dim: 'h', fp: [0.29, 0.28] },
  bucket_b: { dir: F, len: 0.26, dim: 'h', fp: [0.3, 0.32] },
  watering_can: { dir: F, len: 0.35, dim: 'h', fp: [0.2, 0.49] },
  pressure_cooker: { dir: F, len: 0.26, dim: 'h', fp: [0.27, 0.43] },
  sickle: { dir: F, len: 0.4, dim: 'long', fp: [0.4, 0.15], lie: 'z' },
  barrel_01: { dir: P, len: 0.88, dim: 'h', fp: [0.56, 0.56], solid: true },
  barrel_02: { dir: P, len: 0.88, dim: 'h', fp: [0.49, 0.48], solid: true },
  barrel_03: { dir: P, len: 0.93, dim: 'h', fp: [0.63, 0.64], solid: true },
  folding_wooden_stool: { dir: P, len: 0.55, dim: 'l', fp: [0.53, 0.55], top: 0.44 },
  stone_fire_pit: { dir: P, len: 1.2, dim: 'l', fp: [1.2, 1.19], top: 0.32 },
  hand_truck: { dir: P, len: 1.2, dim: 'long', fp: [0.5, 0.6] },
  metal_trash_can: { dir: P, len: 1.1, dim: 'long', fp: [1.1, 0.34], solid: true },
  metal_jerrycan: { dir: P, len: 0.45, dim: 'long', fp: [0.35, 0.17] },
  plastic_jerrycan: { dir: P, len: 0.34, dim: 'long', fp: [0.27, 0.34] },
  planter_box_01: { dir: P, len: 0.9, dim: 'l', fp: [0.91, 0.41] },
  periwinkle_plant: { dir: P, len: 0.8, dim: 'l', fp: [0.8, 0.21] },
  power_box_01: { dir: P, len: 0.5, dim: 'long', fp: [0.34, 0.11] },
  utility_box_01: { dir: P, len: 1.1, dim: 'long', fp: [0.51, 0.42], solid: true },
  utility_box_02: { dir: P, len: 1.1, dim: 'long', fp: [0.9, 0.42], solid: true },
  wooden_ladder: { dir: P, len: 2.2, dim: 'long', fp: [1.58, 0.82], solid: true },
  wooden_broom: { dir: P, len: 1.2, dim: 'long', fp: [0.41, 1.2], lie: 'x' },
  rusted_spade_01: { dir: P, len: 1.1, dim: 'long', fp: [0.17, 1.1], lie: 'x' },
  rusted_wheel_rim_01: { dir: P, len: 0.44, dim: 'long', fp: [0.43, 0.43], lie: 'x' },
  tire_pump: { dir: P, len: 0.58, dim: 'long', fp: [0.26, 0.58], lie: 'x' },
  lantern_01: { dir: P, len: 0.23, dim: 'long', fp: [0.12, 0.1] },
  watering_can_metal_01: { dir: P, len: 0.45, dim: 'long', fp: [0.19, 0.45] },
};

// file, x, z, yaw (heading, radians), s (size jitter), on (stands on the stool / fire pit at the same x,z)
export const PLACED = [
  { file: 'well_a', x: 586.99, z: 1.73, yaw: 1.385, s: 0.94 },
  { file: 'handpump', x: 632.59, z: 14.36, yaw: 1.565, s: 1.03 },
  { file: 'bucket', x: 585.49, z: 2.3, yaw: 0.835, s: 0.98 },
  { file: 'bucket_b', x: 585.39, z: 1.75, yaw: 3.67, s: 0.96 },
  { file: 'watering_can', x: 631.09, z: 14.93, yaw: 5.78, s: 1 },
  { file: 'bucket', x: 630.99, z: 14.38, yaw: 4.466, s: 1.03 },
  { file: 'folding_wooden_stool', x: 596.47, z: 4.22, yaw: 3.273, s: 1.05 },
  { file: 'kettle', x: 596.47, z: 4.22, yaw: 2.845, s: 0.97, on: 'folding_wooden_stool' },
  { file: 'folding_wooden_stool', x: 590.03, z: 3.44, yaw: 4.016, s: 0.93 },
  { file: 'kerosene_lamp', x: 590.03, z: 3.44, yaw: 4.484, s: 1.06, on: 'folding_wooden_stool' },
  { file: 'folding_wooden_stool', x: 536.74, z: 24.87, yaw: 0.214, s: 1.07 },
  { file: 'radio', x: 536.74, z: 24.87, yaw: -0.204, s: 0.92, on: 'folding_wooden_stool' },
  { file: 'folding_wooden_stool', x: 590.22, z: 38.58, yaw: 4.572, s: 1.01 },
  { file: 'sewing_machine', x: 590.22, z: 38.58, yaw: 5.007, s: 0.99, on: 'folding_wooden_stool' },
  { file: 'stone_fire_pit', x: 618.98, z: 2.48, yaw: -0.129, s: 0.94 },
  { file: 'pressure_cooker', x: 618.98, z: 2.48, yaw: -0.382, s: 1.01, on: 'stone_fire_pit' },
  { file: 'folding_wooden_stool', x: 618.26, z: 33.36, yaw: 3.14, s: 1.05 },
  { file: 'lantern_01', x: 618.26, z: 33.36, yaw: 3.714, s: 1.04, on: 'folding_wooden_stool' },
  { file: 'barrel_01', x: 617.69, z: 8.07, yaw: 5.464, s: 0.99 },
  { file: 'barrel_02', x: 612.71, z: 9.38, yaw: 5.299, s: 1.01 },
  { file: 'barrel_03', x: 443.81, z: -16.37, yaw: 0.356, s: 1.06 },
  { file: 'barrel_02', x: 466.48, z: -34.87, yaw: 0.887, s: 0.98 },
  { file: 'metal_trash_can', x: 614.26, z: 29.77, yaw: -0.705, s: 1.01 },
  { file: 'metal_trash_can', x: 588.95, z: 28.18, yaw: -2.546, s: 1.07 },
  { file: 'hand_truck', x: 593, z: -102.37, yaw: 2.843, s: 1.07 },
  { file: 'metal_jerrycan', x: 615.49, z: 30.48, yaw: 4.896, s: 1.02 },
  { file: 'plastic_jerrycan', x: 613.82, z: 10.33, yaw: 0.45, s: 0.92 },
  { file: 'planter_box_01', x: 560.05, z: 67.96, yaw: 6.117, s: 1.04 },
  { file: 'periwinkle_plant', x: 559.35, z: 68.67, yaw: 0.158, s: 1 },
  { file: 'planter_box_01', x: 584.31, z: 54.33, yaw: 3.688, s: 1.03 },
  { file: 'periwinkle_plant', x: 583.61, z: 55.04, yaw: 3.569, s: 1.01 },
  { file: 'power_box_01', x: 558.51, z: 68.77, yaw: 3.379, s: 1.05 },
  { file: 'utility_box_01', x: 712.52, z: 11.69, yaw: 4.94, s: 0.93 },
  { file: 'utility_box_02', x: 540.15, z: 22.21, yaw: 1.775, s: 1.01 },
  { file: 'wooden_ladder', x: 658.31, z: 40.51, yaw: 2.707, s: 1.05 },
  { file: 'wooden_broom', x: 585.88, z: 54.31, yaw: 2.204, s: 1.01 },
  { file: 'wooden_broom', x: 668.16, z: -34.99, yaw: 6.096, s: 0.95 },
  { file: 'rusted_spade_01', x: 669.32, z: 168.99, yaw: 3.194, s: 1.05 },
  { file: 'rusted_wheel_rim_01', x: 551.48, z: -107.95, yaw: 0.018, s: 1.05 },
  { file: 'tire_pump', x: 550.6, z: -108.5, yaw: 2.994, s: 1.05 },
  { file: 'handpump', x: 528.28, z: 56.63, yaw: 0.267, s: 0.99 },
  { file: 'bucket_b', x: 527.5, z: 58.03, yaw: 2.341, s: 0.97 },
  { file: 'watering_can', x: 527.07, z: 57.68, yaw: 2.403, s: 1.02 },
  { file: 'handpump', x: 482.25, z: -41.06, yaw: 4.595, s: 0.94 },
  { file: 'bucket', x: 481.47, z: -39.66, yaw: 5.139, s: 0.92 },
  { file: 'well_a', x: 576.43, z: 56.89, yaw: 0.132, s: 1.07 },
  { file: 'bucket', x: 575.65, z: 58.29, yaw: 6.186, s: 1.02 },
  { file: 'well_c', x: 558.15, z: -148.07, yaw: 5.615, s: 1.03 },
  { file: 'well_c', x: 681.07, z: 145.2, yaw: 5.147, s: 1.06 },
  { file: 'water_tank', x: 657.45, z: -48.64, yaw: 5.634, s: 1.01 },
  { file: 'trunk', x: 658.31, z: 34.01, yaw: 1.397, s: 0.96 },
  { file: 'trunk', x: 646.59, z: 3.1, yaw: 3.34, s: 0.93 },
  { file: 'gate', x: 627.41, z: 147.68, yaw: 5.237, s: 1.01 },
  { file: 'gate', x: 544.59, z: -158.89, yaw: 6.022, s: 1.05 },
  { file: 'sickle', x: 550.95, z: -155.8, yaw: 3.327, s: 1.02 },
  { file: 'sickle', x: 612.9, z: -215.97, yaw: 0.521, s: 1 },
];

const CLUSTER_M = 60; // rows within this distance of a cluster's first row share one propGate site
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
    c.files = [...new Set(c.list.map((v) => v.file))];
  }
  return out;
}

export function registerChowkProps(scene, groundAt) {
  clusters().forEach((c, i) => registerPropSite({
    name: `placed_props_chowk_${i}`, gateRadius: 0, center: { x: c.x, z: c.z }, extent: c.extent,
    items: c.files.map((f) => ({ url: `${SIZES[f].dir}${f}.glb`, size: SIZES[f].len })),
    makeGroup: () => new THREE.Group(), build: (gltfs, group) => buildCluster(c, gltfs, group, groundAt),
  }));
}

function buildCluster(c, gltfs, group, groundAt) {
  c.list.forEach((v) => {
    const g = gltfs[c.files.indexOf(v.file)];
    const z = SIZES[v.file];
    if (!g || !z) return;
    const len = z.len * v.s;
    const m = g.scene.clone(true); // one shared request per file, one copy per instance
    if (z.lie === 'x') m.rotation.x = Math.PI / 2; else if (z.lie === 'z') m.rotation.z = Math.PI / 2;
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const ref = z.dim === 'h' ? size.y : z.dim === 'l' ? Math.max(size.x, size.z) : Math.max(size.x, size.y, size.z);
    const k = len / ref;
    const ctr = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.name = `chowk_${v.file}`;
    holder.userData.propSize = len;
    const wrap = new THREE.Group();
    wrap.add(m);
    wrap.scale.setScalar(k);
    wrap.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
    holder.add(wrap);
    let lift = 0;
    if (v.on) { const h = c.list.find((o) => o.file === v.on && Math.hypot(o.x - v.x, o.z - v.z) < 0.05); lift = h ? SIZES[v.on].top * h.s : 0; }
    holder.position.set(v.x, (groundAt ? groundAt(v.x, v.z) : 0) + lift, v.z);
    holder.rotation.y = v.yaw;
    wrap.traverse((o) => { if (o.isMesh) { o.castShadow = len >= 1.0; o.receiveShadow = true; } });
    holder.updateMatrixWorld(true);
    if (z.solid) holder.userData.colliderBoxes = [colliderBoxFromTransform(z.fp[0] * v.s, z.fp[1] * v.s, new THREE.Matrix4().makeRotationY(v.yaw).setPosition(v.x, 0, v.z))];
    group.add(holder);
  });
}
