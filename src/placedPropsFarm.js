/**
 * Farm, gher yard, khalihan, chaupal, tea stall and house-courtyard props (25 Nov 2026, her order: roads stay EMPTY, every prop stands
 * >= 0.6 m beyond the drawn road band + dusty edge, inside its yard, clear of buildings and crop strips, no two overlapping).
 * Rows come from `node tools/placed-props-farm-check.mjs --suggest` and are verified by `node tools/placed-props-farm-check.mjs` (0 FAIL).
 * Credits: props_free rows are CC BY 4.0 (docs/CREDITS.md), props_ph are CC0. Streams after Play (gateRadius 0): one propGate site per
 * cluster of nearby props, one shared GLB request per file inside a site, one clone per prop (geometry + materials shared, so it stays light).
 * Each row: yaw = facing, k = per-prop scale jitter (0.92-1.08), y = yard the prop must stand inside (checked by the tool).
 * SIZE = file -> [folder under assets/, real-world LONGEST dimension in metres, footprint radius in metres]. Checked against a 1.7 m villager:
 * charpai 1.9 x 1.0 (knee-high cot), matka 0.45 high (shin to knee), milk can 0.6 (thigh), pitchfork 1.6 long (chest to shoulder),
 * wheelbarrow 1.4, hay bale 0.9 long, sickle 0.4. Garden-centre plants and plastic gear (anthurium, calathea, sprinkler, gloves, seed tray,
 * garden chairs) are left out: they do not suit a UP village. Change that one table if a model looks wrong.
 */
import * as THREE from 'three';
import { registerPropSite } from './propGate.js';

const SIZE = {
  charpai_a: ['props_free', 1.9, 0.95], charpai_b: ['props_free', 1.9, 0.95], matka: ['props_free', 0.45, 0.25], milk_can: ['props_free', 0.6, 0.3],
  bucket: ['props_free', 0.3, 0.2], bucket_b: ['props_free', 0.28, 0.2], hay_bale: ['props_free', 0.9, 0.5], pitchfork_a: ['props_free', 1.6, 0.3],
  pitchfork_b: ['props_free', 1.5, 0.3], wheelbarrow: ['props_free', 1.4, 0.75], sickle: ['props_free', 0.4, 0.25], well_c: ['props_free', 1.1, 0.6],
  grind_stone: ['props_free', 1.0, 0.55], brass_pan_01: ['props_ph', 0.45, 0.25], ceramic_pot: ['props_ph', 0.5, 0.3], greenchair_01: ['props_ph', 1.06, 0.4],
  hatchet: ['props_ph', 0.3, 0.2], tree_stump_02: ['props_ph/nature', 0.55, 0.3], dandelion_01: ['props_ph/nature', 0.25, 0.15],
  nettle_plant: ['props_ph/nature', 0.5, 0.25], shrub_02: ['props_ph/nature', 1.5, 0.75], shrub_03: ['props_ph/nature', 0.6, 0.3],
  shrub_04: ['props_ph/nature', 0.5, 0.25], shrub_sorrel_01: ['props_ph/nature', 0.3, 0.15], dry_branches_medium_01: ['props_ph/nature', 1.0, 0.5],
  stone_01: ['props_ph/nature', 0.25, 0.15],
};

export const FARM_PROPS = [
  { file: 'hay_bale', x: 637, z: 48.8, yaw: 0.001, k: 0.99, y: 'gher' },
  { file: 'hay_bale', x: 636.46, z: 49.87, yaw: 4.381, k: 1, y: 'gher' },
  { file: 'hay_bale', x: 635.8, z: 48.87, yaw: 3.76, k: 1.07, y: 'gher' },
  { file: 'pitchfork_a', x: 636.34, z: 47.79, yaw: 0.161, k: 0.99, y: 'gher' },
  { file: 'pitchfork_b', x: 637.25, z: 47.63, yaw: 0.469, k: 1.03, y: 'gher' },
  { file: 'wheelbarrow', x: 638.46, z: 48.15, yaw: 0.759, k: 1, y: 'gher' },
  { file: 'milk_can', x: 638.07, z: 49.34, yaw: 2.907, k: 0.98, y: 'gher' },
  { file: 'milk_can', x: 635.26, z: 47.81, yaw: 0.815, k: 1.07, y: 'gher' },
  { file: 'bucket', x: 637.37, z: 49.94, yaw: 3.624, k: 1.01, y: 'gher' },
  { file: 'tree_stump_02', x: 635.99, z: 47.07, yaw: 6.039, k: 1.06, y: 'gher' },
  { file: 'hatchet', x: 636.99, z: 46.8, yaw: 1.138, k: 1.06, y: 'gher' },
  { file: 'charpai_a', x: 547.66, z: 60.24, yaw: 3.346, k: 0.96 },
  { file: 'charpai_b', x: 542.34, z: 37.46, yaw: 6.071, k: 0.93 },
  { file: 'charpai_a', x: 557.54, z: 44.34, yaw: 4.15, k: 1.07 },
  { file: 'matka', x: 557.38, z: 46.86, yaw: 4.417, k: 0.97 },
  { file: 'bucket_b', x: 557.43, z: 49.73, yaw: 5.737, k: 1.06 },
  { file: 'matka', x: 591.62, z: 4.83, yaw: 5.985, k: 0.97 },
  { file: 'matka', x: 680.91, z: -110, yaw: 3.107, k: 0.92 },
  { file: 'matka', x: 668.56, z: 64.86, yaw: 1.095, k: 0.96 },
  { file: 'matka', x: 433.31, z: -0.71, yaw: 0.052, k: 0.95 },
  { file: 'matka', x: 680.62, z: 28.04, yaw: 1.032, k: 1.05 },
  { file: 'matka', x: 609.86, z: -78.76, yaw: 0.201, k: 0.99 },
  { file: 'matka', x: 588.99, z: 80.29, yaw: 2.136, k: 0.94 },
  { file: 'milk_can', x: 592.22, z: 4.41, yaw: 5.055, k: 0.96 },
  { file: 'milk_can', x: 679.88, z: -109.86, yaw: 2.04, k: 1.02 },
  { file: 'milk_can', x: 668.02, z: 63.5, yaw: 2.863, k: 0.97 },
  { file: 'milk_can', x: 432.08, z: -0.9, yaw: 6.193, k: 0.94 },
  { file: 'charpai_b', x: 589.42, z: 2.23, yaw: 4.956, k: 1.02 },
  { file: 'charpai_a', x: 679.37, z: 28.78, yaw: 6.042, k: 1.06 },
  { file: 'matka', x: 434.98, z: 21.22, yaw: 2.852, k: 0.93 },
  { file: 'charpai_b', x: 775.35, z: 42.27, yaw: 5.097, k: 1.06 },
  { file: 'bucket', x: 779.31, z: 38.46, yaw: 1.368, k: 1 },
  { file: 'matka', x: 645.97, z: -19.14, yaw: 3.243, k: 0.93 },
  { file: 'ceramic_pot', x: 646.93, z: -19.26, yaw: 4.972, k: 1.05 },
  { file: 'charpai_a', x: 637.66, z: -20.16, yaw: 2.852, k: 0.94 },
  { file: 'brass_pan_01', x: 632.41, z: -23.19, yaw: 0.795, k: 0.99 },
  { file: 'bucket_b', x: 554.41, z: -62.79, yaw: 4.364, k: 0.94 },
  { file: 'matka', x: 554.63, z: -63.94, yaw: 2.652, k: 1.06 },
  { file: 'charpai_b', x: 645.77, z: -73.17, yaw: 1.076, k: 0.94 },
  { file: 'ceramic_pot', x: 647.67, z: -72.42, yaw: 0.594, k: 1.06 },
  { file: 'grind_stone', x: 687.04, z: -19.66, yaw: 3.019, k: 0.97 },
  { file: 'matka', x: 681.54, z: -14.36, yaw: 1.739, k: 1.04 },
  { file: 'charpai_a', x: 698.18, z: 55.44, yaw: 5.058, k: 1.06 },
  { file: 'greenchair_01', x: 702.27, z: 49.97, yaw: 4.553, k: 0.94 },
  { file: 'charpai_b', x: 550.73, z: 88.6, yaw: 1.815, k: 1.05 },
  { file: 'bucket_b', x: 543.49, z: 84.56, yaw: 0.295, k: 1.02 },
  { file: 'matka', x: 522.29, z: 26.11, yaw: 4.785, k: 0.97 },
  { file: 'bucket', x: 521.11, z: 26.19, yaw: 6.008, k: 1.08 },
  { file: 'charpai_a', x: 505.29, z: -75.29, yaw: 3.359, k: 1.01 },
  { file: 'ceramic_pot', x: 507.14, z: -74.84, yaw: 5.911, k: 1.04 },
  { file: 'charpai_b', x: 664.17, z: 78.54, yaw: 5.154, k: 1.02 },
  { file: 'brass_pan_01', x: 664.13, z: 76.63, yaw: 3.351, k: 1.03 },
  { file: 'hay_bale', x: 548.95, z: -151.28, yaw: 1.875, k: 1.03 },
  { file: 'hay_bale', x: 548.09, z: -152.14, yaw: 3.639, k: 1.01 },
  { file: 'hay_bale', x: 548.7, z: -153.19, yaw: 2.867, k: 0.97 },
  { file: 'pitchfork_a', x: 549.69, z: -153.06, yaw: 0.971, k: 1 },
  { file: 'pitchfork_b', x: 550.07, z: -152.4, yaw: 3.332, k: 0.93 },
  { file: 'wheelbarrow', x: 550.45, z: -151.11, yaw: 2.842, k: 0.94 },
  { file: 'sickle', x: 547.31, z: -152.59, yaw: 2.904, k: 0.93 },
  { file: 'dry_branches_medium_01', x: 547.26, z: -153.51, yaw: 4.576, k: 1.03 },
  { file: 'tree_stump_02', x: 549.4, z: -154.04, yaw: 4.449, k: 0.93 },
  { file: 'sickle', x: 550.24, z: -153.64, yaw: 2.547, k: 1 },
  { file: 'shrub_02', x: 551.24, z: -152.68, yaw: 1.649, k: 1.08 },
  { file: 'shrub_04', x: 548.31, z: -150.64, yaw: 0.685, k: 0.98 },
  { file: 'stone_01', x: 548.07, z: -151.3, yaw: 0.541, k: 1.07 },
  { file: 'dandelion_01', x: 547.88, z: -153, yaw: 2.137, k: 1.07 },
  { file: 'nettle_plant', x: 548.13, z: -154.25, yaw: 1.2, k: 1.06 },
  { file: 'shrub_03', x: 549.49, z: -150.11, yaw: 0.938, k: 1.07 },
  { file: 'shrub_sorrel_01', x: 547.6, z: -151.25, yaw: 0.559, k: 0.99 },
  { file: 'well_c', x: 612.3, z: -169.01, yaw: 4.898, k: 1.02 },
  { file: 'sickle', x: 611.8, z: -168.07, yaw: 0.27, k: 1.04 },
  { file: 'shrub_02', x: 612.48, z: -166.22, yaw: 5.594, k: 0.98 },
  { file: 'nettle_plant', x: 612.58, z: -167.85, yaw: 4.706, k: 1.07 },
  { file: 'hay_bale', x: 569.35, z: -168.91, yaw: 0.299, k: 0.98 },
  { file: 'pitchfork_b', x: 569.52, z: -165.36, yaw: 0.612, k: 1.07 },
  { file: 'dry_branches_medium_01', x: 569.17, z: -166.4, yaw: 5.843, k: 1.03 },
  { file: 'well_c', x: 578.78, z: 187.99, yaw: 3.992, k: 0.98 },
  { file: 'sickle', x: 567.43, z: 187.97, yaw: 5.919, k: 0.93 },
  { file: 'shrub_03', x: 567.75, z: 186.54, yaw: 4.651, k: 0.99 },
  { file: 'stone_01', x: 578.57, z: 189.03, yaw: 5.265, k: 1.04 },
];

const CLUSTER_M = 45; // props within this distance of a cluster's first member share one propGate site

function clusters() {
  const out = [];
  for (const v of FARM_PROPS) {
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

export function registerFarmProps(scene, groundAt) {
  clusters().forEach((c, i) => registerPropSite({
    name: `placed_farm_props_${i}`, gateRadius: 0, center: { x: c.x, z: c.z }, extent: c.extent,
    items: c.files.map((f) => ({ url: `assets/${SIZE[f][0]}/${f}.glb`, size: SIZE[f][1] })),
    makeGroup: () => new THREE.Group(), build: (gltfs, group) => buildCluster(c, gltfs, group, groundAt),
  }));
}

function buildCluster(c, gltfs, group, groundAt) {
  c.list.forEach((v) => {
    const g = gltfs[c.files.indexOf(v.file)];
    if (!g) return;
    const m = g.scene.clone(true); // one shared request per file, one copy per prop (geometry and materials stay shared)
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const len = SIZE[v.file][1] * v.k;
    const s = len / Math.max(size.x, size.y, size.z); // real-world longest dimension, feet on the ground
    const ctr = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.name = `farm_${v.file}`;
    holder.userData.propSize = len;
    m.scale.multiplyScalar(s);
    m.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
    holder.add(m);
    holder.position.set(v.x, groundAt ? groundAt(v.x, v.z) : 0, v.z);
    holder.rotation.y = v.yaw;
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    holder.updateMatrixWorld(true);
    group.add(holder);
  });
}
