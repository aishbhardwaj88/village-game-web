/**
 * Whole-yard Blender models (gher yard, kirana goods yard): one GLB, origin = the map centre, built square to the grid.
 * Merged per material on load (a few draw calls per yard); the caller turns the group with turnSiteGroup.
 */

import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';
import { swapShared } from './stagingYard.js';
import { floatGeometry, flushMerged } from './pots.js';
import { batchPlaceModel } from './placeBatch.js';

/** Build a yard group at `position` from assets/models/<glb>; `solids` are { x, z, w, d } in LOCAL metres (square), baked into world colliders. */
export function createYardSite(name, glb, position, solids) {
  const carrier = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  carrier.name = name;
  carrier.visible = false;
  carrier.userData.colliderBoxes = solids.map((s) => ({ minX: position.x + s.x - s.w / 2, maxX: position.x + s.x + s.w / 2, minZ: position.z + s.z - s.d / 2, maxZ: position.z + s.z + s.d / 2 }));
  const group = new THREE.Group();
  group.name = `${name}_prop`;
  group.add(carrier);
  group.position.set(position.x, 0, position.z);
  getGLTFLoader().loadAsync(`assets/models/${glb}`).then((gltf) => {
    gltf.scene.updateWorldMatrix(true, true);
    const byMat = new Map();
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      swapShared(o);
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(floatGeometry(o.geometry).applyMatrix4(o.matrixWorld));
    });
    flushMerged(group, byMat, `${name}_mesh`, true);
    batchPlaceModel(group, name); // drawing moves into the village-wide per-material batches (src/placeBatch.js); the merged meshes stay as hidden colliders/visibility sources
  }).catch((err) => console.warn(`${name} did not load`, err));
  return group;
}
