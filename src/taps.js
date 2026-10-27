/**
 * Village drinking taps (J0, 27 Oct playthrough note): three Blender models from tools/blender/build_tap.py (wall tap over a trough, standpipe, pyaau stand).
 * Same scheme as src/handPumps.js: clone per placement with its own yaw, size and tint, merged per material (two draw calls per placement list).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from './loaders.js';
import { swapShared } from './stagingYard.js';
import { floatGeometry, flushMerged } from './pots.js';

export const TAP_TYPES = ['wall', 'stand', 'pyaau'];

let modelsPromise = null;
function loadTaps() {
  if (!modelsPromise) {
    modelsPromise = Promise.all(TAP_TYPES.map((t) => getGLTFLoader().loadAsync(`assets/models/tap_${t}_v2.glb`).then((gltf) => {
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
 * Add pumps to `group` (its local frame). Each placement: { type, x, y, z, ry, s, tint } - y is the ground the plinth stands on.
 * Baked, merged per material and added once the models arrive; returns the Promise.
 */
export function addTaps(group, placements, name = 'taps', sink = null) {
  return loadTaps().then((models) => {
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
    flushMerged(group, byMat, name, false, sink);
  }).catch((err) => console.warn('taps did not load', err));
}
