/**
 * Village pots (J0, 27 Oct playthrough note): matka, ghada, surahi, kulhad from tools/blender/build_pots.py.
 * Four small Blender models (clay on the shared terracotta set, the ghada on the shared metal set), loaded once. addPots() clones them
 * per placement with its own lean, size, yaw and tint, then merges per material: a placement list costs one draw call per set, never one per pot.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from './loaders.js';
import { swapShared } from './stagingYard.js';

export const POT_TYPES = ['matka', 'ghada', 'surahi', 'kulhad'];

let modelsPromise = null;
function loadPots() {
  if (!modelsPromise) {
    modelsPromise = Promise.all(POT_TYPES.map((t) => getGLTFLoader().loadAsync(`assets/models/pot_${t}_v2.glb`).then((gltf) => {
      gltf.scene.updateWorldMatrix(true, true);
      let mesh = null;
      gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
      swapShared(mesh);
      return [t, { geo: floatGeometry(mesh.geometry).applyMatrix4(mesh.matrixWorld), mat: mesh.material }];
    }))).then((entries) => Object.fromEntries(entries));
  }
  return modelsPromise;
}

/** A Float32 copy of a (possibly meshopt-quantised) geometry, so applyMatrix4 and tinting cannot clip normalised int attributes. */
export function floatGeometry(src) {
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

/**
 * Add pots to `group` (its local frame). Each placement: { type, x, y, z, ry, s, lean, tint } - y is the surface the pot stands on.
 * Placements are baked, merged per material and added once the models arrive; returns the Promise.
 */
export function addPots(group, placements, name = 'pots') {
  return loadPots().then((models) => {
    const byMat = new Map();
    placements.forEach((p, i) => {
      const m = models[p.type];
      if (!m) return;
      const s = p.s || 1;
      const mat4 = new THREE.Matrix4().compose(
        new THREE.Vector3(p.x, p.y || 0, p.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler((p.lean || 0) * Math.sin(i * 2.3 + 1), p.ry || 0, (p.lean || 0) * Math.cos(i * 1.7 + 2), 'YXZ')),
        new THREE.Vector3(s, s * (1 + 0.05 * Math.sin(i * 5.1)), s));
      const g = m.geo.clone().applyMatrix4(mat4);
      const col = g.attributes.color;
      if (col && p.tint != null) {
        const t = new THREE.Color(p.tint);
        for (let k = 0; k < col.count; k++) col.setXYZ(k, col.getX(k) * t.r, col.getY(k) * t.g, col.getZ(k) * t.b);
      }
      if (!byMat.has(m.mat)) byMat.set(m.mat, []);
      byMat.get(m.mat).push(g);
    });
    let n = 0;
    for (const [mat, list] of byMat) {
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      mesh.name = `${name}_${n++}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }).catch((err) => console.warn('pots did not load', err));
}
