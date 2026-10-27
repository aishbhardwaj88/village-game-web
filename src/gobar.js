/**
 * Gobar cakes (J0, 27 Oct playthrough note): two Blender models from tools/blender/build_gobar.py (wall patch of hand-patted cakes, conical bitauda stack with straw cap).
 * Same scheme as src/haystacks.js: clone per placement, merged per material, a draw call or two per site.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from './loaders.js';
import { swapShared } from './stagingYard.js';
import { floatGeometry } from './pots.js';

export const GOBAR_TYPES = ['wall', 'stack'];

let modelsPromise = null;
function loadGobar() {
  if (!modelsPromise) {
    modelsPromise = Promise.all(GOBAR_TYPES.map((t) => getGLTFLoader().loadAsync(`assets/models/gobar_${t}_v2.glb`).then((gltf) => {
      gltf.scene.updateWorldMatrix(true, true);
      const parts = [];
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        swapShared(o);
        parts.push({ geo: floatGeometry(o.geometry).applyMatrix4(o.matrixWorld), mat: o.material });
      });
      return [t, parts];
    }))).then((entries) => Object.fromEntries(entries));
  }
  return modelsPromise;
}

/**
 * Add haystacks to `group` (its local frame). Each placement: { type, x, y, z, ry, s, tint }.
 * Baked, merged per material and added once the models arrive; returns the Promise.
 */
export function addGobar(group, placements, name = 'gobar') {
  return loadGobar().then((models) => {
    const byMat = new Map();
    placements.forEach((p) => {
      const parts = models[p.type];
      if (!parts) return;
      const s = p.s || 1;
      const mat4 = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y || 0, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.ry || 0), new THREE.Vector3(s, s, s));
      for (const part of parts) {
        const g = part.geo.clone().applyMatrix4(mat4);
        const col = g.attributes.color;
        if (col && p.tint != null) {
          const t = new THREE.Color(p.tint);
          for (let k = 0; k < col.count; k++) col.setXYZ(k, col.getX(k) * t.r, col.getY(k) * t.g, col.getZ(k) * t.b);
        }
        if (!byMat.has(part.mat)) byMat.set(part.mat, []);
        byMat.get(part.mat).push(g);
      }
    });
    let n = 0;
    for (const [mat, list] of byMat) {
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      mesh.name = `${name}_${n++}`;
      mesh.castShadow = false; // a cast mesh costs a second draw call and the bazaar view sits at the ceiling
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }).catch((err) => console.warn('haystacks did not load', err));
}
