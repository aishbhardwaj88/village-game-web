/**
 * Free-vehicle pilot (24 Nov 2026, her request): two Sketchfab CC BY vehicles parked near the opening spawn
 * so she can judge if slimmed free models look good in the game. Loaded only after Play (no start-up cost).
 * Files were slimmed in a separate pass (meshopt geometry + WebP textures; auto rickshaw also switched from
 * see-through to solid, which was the cause of its "broken" look). Credits: docs/CREDITS.md.
 */
import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';
import { colliderBoxFromTransform, requestColliderRebuild } from './collision.js';
import { gateByDistance } from './propGate.js';
import { addThelaSign } from './thelaSign.js';

export const PILOT_VEHICLES = [
  { file: 'auto_rickshaw', x: 607.6, z: 45.6, yaw: 1.2, length: 2.65 },
  { file: 'old_tractor', x: 606.1, z: 52.2, yaw: 1.25, length: 3.1 },
  { file: 'tuk_tuk', x: 604.2, z: 42.8, yaw: 0.6, length: 2.65 },
  { file: 'motorbike', x: 608.8, z: 41.8, yaw: 2.2, length: 2.0 },
  { file: 'thela_gadi', x: 603.8, z: 47.4, yaw: 0.3, length: 2.4 },
  { file: 'bicycle', x: 609.2, z: 49.2, yaw: 1.9, length: 1.8 },
  { file: 'moped', x: 603.6, z: 51.2, yaw: 0.9, length: 1.8 },
  { file: 'trailer_pack', x: 607.2, z: 58.2, yaw: 1.25, length: 2.28 },
];

const VEHICLES_CENTER = { x: 606, z: 50 }; // load within 50 m, freed beyond 120 m (src/propGate.js)
export function addPilotVehicles(scene, groundAt, getPlayerPos) {
  return gateByDistance(scene, 'pilot_vehicles', VEHICLES_CENTER, getPlayerPos, () => new THREE.Group(), (group) => loadPilotVehicles(group, groundAt), requestColliderRebuild);
}
function loadPilotVehicles(group, groundAt) {
  return Promise.all(PILOT_VEHICLES.map((v) => getGLTFLoader().loadAsync(`assets/vehicles_free/${v.file}.glb`).then((gltf) => {
    const m = gltf.scene;
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const k = v.length / Math.max(size.x, size.z);
    const c = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group();
    holder.name = `pilot_${v.file}`;
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
  }).catch((e) => console.warn('[pilotVehicles]', v.file, e)))).then(() => requestColliderRebuild());
}
