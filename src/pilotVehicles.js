/**
 * Free-vehicle pilot (24 Nov 2026, her request): two Sketchfab CC BY vehicles parked near the opening spawn
 * so she can judge if slimmed free models look good in the game. Streamed by src/propGate.js (never in the Play gate: gateRadius 0, they stream after Play; the tractor, trailer and bicycle are now the real drivable vehicles, src/vehicleModels.js).
 * Files were slimmed in a separate pass (meshopt geometry + WebP textures; auto rickshaw also switched from
 * see-through to solid, which was the cause of its "broken" look). Credits: docs/CREDITS.md.
 */
import * as THREE from 'three';
import { colliderBoxFromTransform } from './collision.js';
import { registerPropSite } from './propGate.js';
import { addThelaSign } from './thelaSign.js';

export const PILOT_VEHICLES = [
  { file: 'auto_rickshaw', x: 607.6, z: 45.6, yaw: 1.2, length: 2.65 },
  { file: 'tuk_tuk', x: 604.2, z: 42.8, yaw: 0.6, length: 2.65 },
  { file: 'motorbike', x: 608.8, z: 41.8, yaw: 2.2, length: 2.0 },
  { file: 'thela_gadi', x: 603.8, z: 47.4, yaw: 0.3, length: 2.4 },
  { file: 'moped', x: 603.6, z: 51.2, yaw: 0.9, length: 1.8 },
];

const VEHICLES_SITE = { x: 606, z: 50, extent: 14 }; // src/propGate.js loads within 150 m of its edge
export function registerPilotVehicles(groundAt) {
  registerPropSite({
    name: 'pilot_vehicles', gateRadius: 0, center: { x: VEHICLES_SITE.x, z: VEHICLES_SITE.z }, extent: VEHICLES_SITE.extent,
    items: PILOT_VEHICLES.map((v) => ({ url: `assets/vehicles_free/${v.file}.glb`, size: v.length })),
    makeGroup: () => new THREE.Group(), build: (gltfs, group) => buildPilotVehicles(gltfs, group, groundAt),
  });
}
function buildPilotVehicles(gltfs, group, groundAt) {
  PILOT_VEHICLES.forEach((v, i) => {
    if (!gltfs[i]) return;
    const m = gltfs[i].scene;
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const k = v.length / Math.max(size.x, size.z);
    const c = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.name = `pilot_${v.file}`;
    holder.userData.propSize = v.length;
    m.scale.multiplyScalar(k);
    m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
    holder.add(m);
    // the thela has no lettering of its own: hang the painted Hindi/English board on its canopy (src/thelaSign.js); it reads the
    // holder bounds synchronously, so it must be called here, before the holder is positioned and rotated
    if (v.file === 'thela_gadi') addThelaSign(holder).catch((e) => console.warn('[thelaSign]', e));
    holder.position.set(v.x, groundAt ? groundAt(v.x, v.z) : 0, v.z);
    holder.rotation.y = v.yaw;
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    holder.updateMatrixWorld(true);
    const w = size.x * k, d = size.z * k;
    holder.userData.colliderBoxes = [colliderBoxFromTransform(w, d, new THREE.Matrix4().makeRotationY(v.yaw).setPosition(v.x, 0, v.z))];
    group.add(holder);
  });
}
