/**
 * Painted milestone stones on the east approach (docs/BACKLOG.md A-2c): from the east gali towards the highway and mandi.
 * One Blender model (tools/blender/build_milestone.py, 27 Oct playthrough note): whitewashed body, ochre rounded top, weathered, NO lettering
 * (the signposts carry the names and distances). All stones share one geometry source and one material; each is streamed per stone by the zone manager.
 */

import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';
import { swapShared } from './stagingYard.js';
import { PLACES } from './freeRoam.js';
import { roadAt } from './eastRoad.js';

const SPACING = [6, 50, 95, 140]; // metres along the east road (src/eastRoad.js), which starts at the east gali's end
// Stones on the highway's own west verge (road strip x 198..212, src/farmSites.js roadGeos): one per direction of travel.
const HIGHWAY_STONES = [
  { x: 196.6, z: -18, ry: Math.PI, to: 'mandi', back: 'chowk' },
  { x: 196.6, z: 82, ry: 0, to: 'mandi', back: 'chowk' },
];
const SIDE = 3.4; // stands this far to the right of the walker, clear of the carriageway

const byId = (id) => PLACES.find((p) => p.id === id);

// One Blender model (tools/blender/build_milestone.py): whitewashed body, ochre rounded top, no lettering. Loaded once, one shared material.
let modelPromise = null;
function loadModel() {
  if (!modelPromise) modelPromise = getGLTFLoader().loadAsync('assets/models/milestone_v2.glb').then((gltf) => {
    gltf.scene.updateWorldMatrix(true, true);
    let mesh = null;
    gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
    swapShared(mesh);
    const geo = floatGeometry(mesh.geometry).applyMatrix4(mesh.matrixWorld);
    return { geo, mat: mesh.material };
  });
  return modelPromise;
}

/** A Float32 copy of a (possibly meshopt-quantised) geometry, so applyMatrix4 cannot clip normalised int attributes. */
function floatGeometry(src) {
  const g = new THREE.BufferGeometry();
  for (const name of Object.keys(src.attributes)) {
    const a = src.attributes[name];
    const f = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) f[i * a.itemSize + k] = [a.getX, a.getY, a.getZ, a.getW][k].call(a, i);
    g.setAttribute(name, new THREE.BufferAttribute(f, a.itemSize));
  }
  if (src.index) g.setIndex(src.index.clone());
  return g;
}

/** Stone positions along START -> highway; ids are stable so each can be its own streamed zone. */
export function milestoneSites() {
  const hw = byId('highway');
  if (!hw) return [];
  const hwSites = HIGHWAY_STONES.map((h, i) => ({ id: `milestone_hw${i}`, cell: SPACING.length + i, x: h.x, z: h.z, ry: h.ry, hw: h }));
  return [...hwSites, ...SPACING.map((d, i) => {
    const { x, z, ux, uz } = roadAt(d);
    return {
      id: `milestone_${i}`,
      cell: i,
      x: x - uz * SIDE, // right of an eastbound walker (+z side)
      z: z + ux * SIDE,
      ry: Math.atan2(-ux, -uz), // face normal points back west along the road, towards the approaching walker
      toHighway: Math.round(Math.max(0, Math.hypot(hw.x - x, hw.z - z)) / 5) * 5,
    };
  })];
}

export function createMilestone(site) {
  const group = new THREE.Group();
  group.name = site.id;
  // per-stone variation from the id: a slight lean, yaw wobble and size, so no two stones are the same
  let h = 0;
  for (const c of site.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const r = (k) => (((h >>> k) & 255) / 255 - 0.5);
  loadModel().then(({ geo, mat }) => {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(site.x, 0, site.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(r(0) * 0.04, site.ry + r(8) * 0.12, r(16) * 0.05, 'YXZ')),
      new THREE.Vector3(1 + r(24) * 0.1, 1 + r(4) * 0.12, 1 + r(12) * 0.1));
    const mesh = new THREE.Mesh(geo.clone().applyMatrix4(m), mat);
    mesh.name = site.id;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }).catch((err) => console.warn('milestone did not load', err));
  const c = 0.4;
  group.userData.colliderBoxes = [{ minX: site.x - c, maxX: site.x + c, minZ: site.z - c, maxZ: site.z + c }];
  return group;
}
