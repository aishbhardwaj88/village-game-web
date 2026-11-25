/**
 * RULE (26 Nov, her order): tractors (old_tractor + trailer_pack) stand in the FARMS / OUTSKIRTS only (field edges and farm tracks, >= 20 m from any
 * house or shop, >= 60 m apart, >= 3 m clear of crop strips), never in the village core. Roaming traffic (src/roamingTraffic.js) owns the roads, so
 * parked small vehicles stay few: autos 2 + tuk tuks 2 (Tempo / bus adda only), bicycles 3, motorbike 1, moped 1.
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
import { frontFix, fitLen } from './vehicleFit.js';

export const VILLAGE_VEHICLES = [
  { file: 'old_tractor', x: 614, z: -225.2, yaw: -3.108, hex: 0xb3261e, length: 3.5 }, // Our khet, wheat track edge
  { file: 'trailer_pack', x: 614.12, z: -221.5, yaw: -3.108, length: 3.4 }, // behind tractor
  { file: 'old_tractor', x: 564.7, z: 207.7, yaw: -0.072, hex: 0x1f3a6e, length: 3.5 }, // Field gate, main road edge
  { file: 'old_tractor', x: 280, z: -95.3, yaw: -0.106, hex: 0x2d5a34, length: 3.5 }, // west haystack, farm loop edge
  { file: 'trailer_pack', x: 280.39, z: -98.98, yaw: -0.106, length: 3.4 }, // behind tractor
  { file: 'old_tractor', x: 826.6, z: 90, yaw: 0, hex: 0xc2561a, length: 3.5 }, // east canal bank road edge
  { file: 'old_tractor', x: 676.1, z: -311.9, yaw: -1.571, hex: 0xb3261e, length: 3.5 }, // Clay pit pond, farm loop edge
  { file: 'old_tractor', x: 289.3, z: 30.4, yaw: 0.099, hex: 0x1f3a6e, length: 3.5 }, // sugarcane edge, farm loop
  { file: 'auto_rickshaw', x: 534.33, z: -113.5, yaw: 4.696, length: 2.6 }, // new_tempo road 2.57
  { file: 'auto_rickshaw', x: 535.19, z: -109.45, yaw: 1.481, length: 2.6 }, // yard_bus_adda road 2.96
  { file: 'tuk_tuk', x: 538.73, z: -109.38, yaw: 1.55, length: 2.7 }, // new_tempo road 1.19
  { file: 'tuk_tuk', x: 519.56, z: -92.55, yaw: 4.63, length: 2.7 }, // yard_bus_adda road 0.86
  { file: 'bicycle', x: 589.32, z: 1.93, yaw: 0.662, hex: 0x2f4a6b, length: 1.75 }, // teastall road 3.35
  { file: 'bicycle', x: 553.34, z: 88.75, yaw: -1.446, hex: 0x3d5a40, length: 1.75 }, // school road 0.94
  { file: 'bicycle', x: 538.47, z: 37.65, yaw: 0.245, hex: 0x6b2a26, length: 1.75 }, // yard_chaupal road 3.29
  { file: 'motorbike', x: 590.78, z: -96.98, yaw: 2.771, length: 2.1 }, // bazaar road 3.00
  { file: 'moped', x: 556.22, z: 68.94, yaw: -1.418, hex: 0x8a2c2a, length: 1.8 }, // post road 1.07
  { file: 'thela_gadi', x: 592.68, z: -99.58, yaw: 2.89, length: 2.4 }, // bazaar road 1.76
  { file: 'thela_gadi', x: 588.95, z: -19.13, yaw: 4.762, length: 2.4 }, // new_sqx_233 road 1.85
  { file: 'thela_gadi', x: 610.97, z: -105.81, yaw: -0.416, length: 2.4 }, // chemist road 2.92
  { file: 'mini_truck', x: 521.38, z: -135.25, yaw: 4.699, length: 4.2 }, // mandi road 2.71
  { file: 'water_tanker', x: 432.94, z: -16.68, yaw: 4.649, length: 5 }, // dairy road 2.33
  { file: 'thela_b', x: 588.95, z: -5.63, yaw: 4.79, length: 2.2 }, // new_sqx_236 road 2.79
  { file: 'willys_jeep', x: 537.97, z: 27.93, yaw: 0.019, length: 3.4 }, // yard_panchayat road 3.34
  { file: 'willys_jeep', x: 563.99, z: 35.29, yaw: -0.065, length: 3.4 }, // at road 3.30
  { file: 'moped', x: 608.42, z: 58.82, yaw: 1.832, hex: 0x3a5a48, length: 1.8 }, // at road 0.84
  { file: 'moped', x: 577.48, z: -20.29, yaw: 1.709, hex: 0xb8b2a0, length: 1.8 }, // at road 3.45
  { file: 'motorbike', x: 577.01, z: 49.47, yaw: -0.106, length: 2.1 }, // at road 3.65
  { file: 'motorbike', x: 590.51, z: -57.59, yaw: 3.688, length: 2.1 }, // at road 0.66
  { file: 'bicycle', x: 609.3, z: 6.94, yaw: 1.044, hex: 0x2b2b2e, length: 1.75 }, // at road 0.69
  { file: 'bicycle', x: 577.65, z: 120.55, yaw: 2.753, hex: 0x3d5a40, length: 1.75 }, // at road 3.55
  { file: 'bicycle', x: 528.65, z: 53.6, yaw: 0.129, hex: 0x2f4a6b, length: 1.75 }, // at road 0.79
  { file: 'bicycle', x: 617.41, z: 35.68, yaw: 3.073, hex: 0x6b2a26, length: 1.75 }, // at road 4.06
  { file: 'auto_rickshaw', x: 543.14, z: -106.81, yaw: 4.846, length: 2.6 }, // at road 3.54
  { file: 'tuk_tuk', x: 589.43, z: -92.09, yaw: 2.764, length: 2.7 }, // at road 2.28
  { file: 'thela_gadi', x: 603.72, z: -90.33, yaw: 1.335, length: 2.4 }, // at road 0.85
  { file: 'thela_b', x: 577.93, z: -91.93, yaw: 4.717, length: 2.2 }, // at road 1.64
];

const L = (v) => fitLen(v.file, v.length);
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
    const k = L(v) / Math.max(size.x, size.z);
    const ctr = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.name = `village_${v.file}`;
    holder.userData.propSize = L(v);
    m.scale.multiplyScalar(k);
    m.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
    holder.add(m);
    if (v.file === 'thela_gadi') addThelaSign(holder).catch((e) => console.warn('[thelaSign]', e));
    if (v.hex !== undefined) applyVehicleColour(holder, `${v.file}.glb`, v.hex);
    const ry = v.yaw + frontFix(v.file);
    holder.position.set(v.x, groundAt ? groundAt(v.x, v.z) : 0, v.z);
    holder.rotation.y = ry;
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    holder.updateMatrixWorld(true);
    // collider: length x width along the heading (world yaw = heading, the box is built in the heading frame)
    holder.userData.colliderBoxes = [colliderBoxFromTransform(WIDTH[v.file] || 1.4, L(v), new THREE.Matrix4().makeRotationY(v.yaw).setPosition(v.x, 0, v.z))];
    group.add(holder);
  });
}
