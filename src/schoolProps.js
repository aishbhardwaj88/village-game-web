/**
 * School yard props from tools/blender/build_school_props.py (slides, swings, see-saw, stapu court, dustbins, water pots).
 * One GLB holds every prop laid out in a row; each named group is lifted out, centred on its own footprint and baked at the
 * requested place, then merged per material, so the whole yard costs a few draw calls however many are placed.
 */

import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';
import { swapShared } from './stagingYard.js';
import { floatGeometry, flushMerged } from './pots.js';

const PARTS = {
  slideBig: /^sl_big_/, slideSmall: /^sl_small_/, seesaw: /^ss_/, swings: /^sw_/, stapu: /^st_l/,
  binDrum: /^db_drum/, binMoulded: /^db_moulded/, binConcrete: /^db_concrete/, pots: /^pot_/,
};

let modelsPromise = null;
function loadParts() {
  if (!modelsPromise) {
    modelsPromise = getGLTFLoader().loadAsync('assets/models/school_props.glb').then((gltf) => {
      gltf.scene.updateWorldMatrix(true, true);
      const parts = Object.fromEntries(Object.keys(PARTS).map((k) => [k, []]));
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const key = Object.keys(PARTS).find((k) => PARTS[k].test(o.name));
        if (!key) return;
        swapShared(o);
        parts[key].push({ geo: floatGeometry(o.geometry).applyMatrix4(o.matrixWorld), mat: o.material });
      });
      for (const list of Object.values(parts)) {
        const box = new THREE.Box3();
        for (const p of list) { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox); }
        list.centre = new THREE.Vector2((box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2);
      }
      return parts;
    });
  }
  return modelsPromise;
}

/** Placements: { part, x, z, ry, y } in `group`'s local metres; the part's footprint centre lands on (x, z). */
export function addSchoolProps(group, placements, name = 'school_props') {
  return loadParts().then((parts) => {
    const byMat = new Map();
    const up = new THREE.Vector3(0, 1, 0);
    for (const p of placements) {
      const list = parts[p.part];
      if (!list) continue;
      const mat4 = new THREE.Matrix4()
        .compose(new THREE.Vector3(p.x, p.y || 0, p.z), new THREE.Quaternion().setFromAxisAngle(up, p.ry || 0), new THREE.Vector3(1, 1, 1))
        .multiply(new THREE.Matrix4().makeTranslation(-list.centre.x, 0, -list.centre.y));
      for (const part of list) {
        if (!byMat.has(part.mat)) byMat.set(part.mat, []);
        byMat.get(part.mat).push(part.geo.clone().applyMatrix4(mat4));
      }
    }
    flushMerged(group, byMat, name, true);
  }).catch((err) => console.warn('school props did not load', err));
}
