/**
 * Field props from tools/blender/build_field_props.py (well, field gate piers, field shrine, culvert ends).
 * One GLB, one named root per prop with its origin on the ground; each root is baked at its placement and merged per material,
 * so a placement list costs a few draw calls however many are placed.
 */

import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';
import { swapShared } from './stagingYard.js';
import { floatGeometry, flushMerged } from './pots.js';

let modelsPromise = null;
function loadParts() {
  if (!modelsPromise) {
    modelsPromise = getGLTFLoader().loadAsync('assets/models/field_props.glb').then((gltf) => {
      gltf.scene.updateWorldMatrix(true, true);
      const parts = {};
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        let root = o;
        while (root.parent && root.parent !== gltf.scene) root = root.parent;
        swapShared(o);
        (parts[root.name] ||= []).push({ geo: floatGeometry(o.geometry).applyMatrix4(o.matrixWorld), mat: o.material });
      });
      return parts;
    });
  }
  return modelsPromise;
}

/** Placements: { part, x, z, ry } in `group`'s local metres; the part's origin (on the ground) lands on (x, z). */
export function addFieldProps(group, placements, name = 'field_props') {
  return loadParts().then((parts) => {
    const byMat = new Map();
    const up = new THREE.Vector3(0, 1, 0);
    for (const p of placements) {
      const list = parts[p.part];
      if (!list) continue;
      const mat4 = new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion().setFromAxisAngle(up, p.ry || 0), new THREE.Vector3(1, 1, 1));
      for (const part of list) {
        if (!byMat.has(part.mat)) byMat.set(part.mat, []);
        byMat.get(part.mat).push(part.geo.clone().applyMatrix4(mat4));
      }
    }
    flushMerged(group, byMat, name, true);
  }).catch((err) => console.warn('field props did not load', err));
}
