/**
 * Village parked vehicles (25 Nov 2026, her order: roads must be EMPTY, parked vehicles stand BESIDE the road facing along it).
 * Spots come from `node tools/vehicle-spots.mjs --suggest` and are verified by `node tools/vehicle-spots.mjs` (every footprint corner
 * at least 0.6 m beyond the drawn road edge + dusty apron, clear of houses / shops / place footprints, 0 FAIL).
 * yaw = HEADING: the vehicle's long axis lies along (sin yaw, cos yaw). Models whose nose is +X (bicycle, motorbike, thela_gadi) get the
 * -90 deg fix in MODEL_AXIS_FIX below; change that one table if a model looks sideways.
 * hex = body paint for applyVehicleColour (src/vehicleVariants.js); auto_rickshaw, tuk_tuk, trailer_pack and thela_gadi are never recoloured.
 * Streams after Play (gateRadius 0): one site per cluster of nearby vehicles, one shared GLB request per file inside a site.
 */
import * as THREE from 'three';
import { colliderBoxFromTransform } from './collision.js';
import { registerPropSite } from './propGate.js';
import { addThelaSign } from './thelaSign.js';
import { applyVehicleColour } from './vehicleVariants.js';

export const VILLAGE_VEHICLES = [
  { file: 'old_tractor', x: 516.3, z: -134.87, yaw: 1.509, hex: 0xb3261e, length: 3.5 }, // mandi road 2.13
  { file: 'trailer_pack', x: 512.61, z: -135.1, yaw: 1.509, length: 3.4 }, // behind tractor road 2.31
  { file: 'old_tractor', x: 438.14, z: -16.44, yaw: 1.342, hex: 0x1f3a6e, length: 3.5 }, // dairy road 2.89
  { file: 'old_tractor', x: 612.5, z: -168.32, yaw: 6.229, hex: 0x2d5a34, length: 3.5 }, // at road 0.65
  { file: 'trailer_pack', x: 612.7, z: -172.01, yaw: 6.229, length: 3.4 }, // behind tractor road 0.74
  { file: 'old_tractor', x: 466.5, z: -37.58, yaw: 0.032, hex: 0xc2561a, length: 3.5 }, // gaushala road 0.71
  { file: 'old_tractor', x: 579.48, z: 189.06, yaw: 3.12, hex: 0xb3261e, length: 3.5 }, // at road 1.00
  { file: 'old_tractor', x: 544.96, z: -135.78, yaw: 4.689, hex: 0x1f3a6e, length: 3.5 }, // khalihan road 3.50
  { file: 'auto_rickshaw', x: 534.33, z: -113.5, yaw: 4.696, length: 2.65 }, // new_tempo road 2.57
  { file: 'auto_rickshaw', x: 536.27, z: -116.2, yaw: 4.657, length: 2.65 }, // new_tempo road 1.24
  { file: 'auto_rickshaw', x: 535.19, z: -109.45, yaw: 1.481, length: 2.65 }, // yard_bus_adda road 2.96
  { file: 'auto_rickshaw', x: 528.53, z: -132.99, yaw: 1.621, length: 2.65 }, // at road 0.67
  { file: 'tuk_tuk', x: 538.73, z: -109.38, yaw: 1.55, length: 2.65 }, // new_tempo road 1.19
  { file: 'tuk_tuk', x: 519.56, z: -92.55, yaw: 4.63, length: 2.65 }, // yard_bus_adda road 0.86
  { file: 'tuk_tuk', x: 549.48, z: -132.9, yaw: 4.658, length: 2.65 }, // at road 0.90
  { file: 'bicycle', x: 589.32, z: 1.93, yaw: 0.662, hex: 0x2f4a6b, length: 1.75 }, // teastall road 3.35
  { file: 'bicycle', x: 553.34, z: 88.75, yaw: -1.446, hex: 0x3d5a40, length: 1.75 }, // school road 0.94
  { file: 'bicycle', x: 538.47, z: 37.65, yaw: 0.245, hex: 0x6b2a26, length: 1.75 }, // yard_chaupal road 3.29
  { file: 'bicycle', x: 610.66, z: 7.72, yaw: 0.966, hex: 0x2b2b2e, length: 1.75 }, // halwai road 0.69
  { file: 'bicycle', x: 613.79, z: -114.57, yaw: -0.334, hex: 0x2f4a6b, length: 1.75 }, // store road 2.70
  { file: 'bicycle', x: 582.76, z: 93.71, yaw: 1.703, hex: 0x3d5a40, length: 1.75 }, // anganwadi road 4.09
  { file: 'bicycle', x: 576.83, z: 51, yaw: 0.028, hex: 0x6b2a26, length: 1.75 }, // new_sqx_243 road 3.65
  { file: 'motorbike', x: 537.33, z: 23.09, yaw: 0.042, length: 2 }, // yard_panchayat road 3.85
  { file: 'motorbike', x: 581.73, z: 60.82, yaw: -1.338, length: 2 }, // health road 4.03
  { file: 'motorbike', x: 590.78, z: -96.98, yaw: 2.771, length: 2 }, // bazaar road 3.00
  { file: 'moped', x: 556.22, z: 68.94, yaw: -1.418, hex: 0x8a2c2a, length: 1.8 }, // post road 1.07
  { file: 'moped', x: 637.09, z: 28.19, yaw: 1.696, hex: 0x2e4a66, length: 1.8 }, // new_sqx_255 road 3.88
  { file: 'thela_gadi', x: 592.68, z: -99.58, yaw: 2.89, length: 2.4 }, // bazaar road 1.76
  { file: 'thela_gadi', x: 588.95, z: -19.13, yaw: 4.762, length: 2.4 }, // new_sqx_233 road 1.85
  { file: 'thela_gadi', x: 610.97, z: -105.81, yaw: -0.416, length: 2.4 }, // chemist road 2.92
  { file: 'mini_truck', x: 521.38, z: -135.25, yaw: 4.699, length: 3.4 }, // mandi road 2.71
  { file: 'water_tanker', x: 432.94, z: -16.68, yaw: 4.649, length: 5 }, // dairy road 2.33
  { file: 'thela_b', x: 588.95, z: -5.63, yaw: 4.79, length: 2.4 }, // new_sqx_236 road 2.79
  { file: 'willys_jeep', x: 537.97, z: 27.93, yaw: 0.019, length: 3.7 }, // yard_panchayat road 3.34
];

const MODEL_AXIS_FIX = { bicycle: -Math.PI / 2, motorbike: -Math.PI / 2, thela_gadi: -Math.PI / 2, thela_b: -Math.PI / 2 }; // thela_b assumed x-long like thela_gadi (unchecked)
const WIDTH = { old_tractor: 1.9, trailer_pack: 1.9, auto_rickshaw: 1.4, tuk_tuk: 1.4, bicycle: 0.6, motorbike: 0.8, moped: 0.7, thela_gadi: 1.3, thela_b: 1.3, mini_truck: 1.8, water_tanker: 2.2, willys_jeep: 1.7 };
const CLUSTER_M = 60; // vehicles within this distance of a cluster's first member share one propGate site

function clusters() {
  const out = [];
  for (const v of VILLAGE_VEHICLES) {
    let c = out.find((k) => Math.hypot(k.x0 - v.x, k.z0 - v.z) < CLUSTER_M);
    if (!c) { c = { x0: v.x, z0: v.z, list: [] }; out.push(c); }
    c.list.push(v);
  }
  for (const c of out) {
    c.x = c.list.reduce((s, v) => s + v.x, 0) / c.list.length; c.z = c.list.reduce((s, v) => s + v.z, 0) / c.list.length;
    c.extent = Math.max(...c.list.map((v) => Math.hypot(v.x - c.x, v.z - c.z))) + 6;
    c.files = [...new Set(c.list.map((v) => v.file))];
  }
  return out;
}

export function registerVillageVehicles(scene, groundAt) {
  clusters().forEach((c, i) => registerPropSite({
    name: `village_vehicles_${i}`, gateRadius: 0, center: { x: c.x, z: c.z }, extent: c.extent,
    items: c.files.map((f) => ({ url: `assets/vehicles_free/${f}.glb`, size: Math.max(...c.list.filter((v) => v.file === f).map((v) => v.length)) })),
    makeGroup: () => new THREE.Group(), build: (gltfs, group) => buildCluster(c, gltfs, group, groundAt),
  }));
}

function buildCluster(c, gltfs, group, groundAt) {
  c.list.forEach((v) => {
    const g = gltfs[c.files.indexOf(v.file)];
    if (!g) return;
    const m = g.scene.clone(true); // one shared request per file, one copy per vehicle
    m.traverse((o) => { if (o.isMesh && o.material) o.material = Array.isArray(o.material) ? o.material.map((x) => x.clone()) : o.material.clone(); });
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const k = v.length / Math.max(size.x, size.z);
    const ctr = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.name = `village_${v.file}`;
    holder.userData.propSize = v.length;
    m.scale.multiplyScalar(k);
    m.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
    holder.add(m);
    if (v.file === 'thela_gadi') addThelaSign(holder).catch((e) => console.warn('[thelaSign]', e));
    if (v.hex !== undefined) applyVehicleColour(holder, `${v.file}.glb`, v.hex);
    const ry = v.yaw + (MODEL_AXIS_FIX[v.file] || 0);
    holder.position.set(v.x, groundAt ? groundAt(v.x, v.z) : 0, v.z);
    holder.rotation.y = ry;
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    holder.updateMatrixWorld(true);
    // collider: length x width along the heading (world yaw = heading, the box is built in the heading frame)
    holder.userData.colliderBoxes = [colliderBoxFromTransform(WIDTH[v.file] || 1.4, v.length, new THREE.Matrix4().makeRotationY(v.yaw).setPosition(v.x, 0, v.z))];
    group.add(holder);
  });
}
