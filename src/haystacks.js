/**
 * Village haystacks (J0, 27 Oct playthrough note): three Blender models from tools/blender/build_haystack.py (cone, heap, half-used).
 * Same scheme as src/handPumps.js: clone per placement, merged per material, one draw call per site. `hay` rows are the old [x, z, k, n, tone] lists.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from './loaders.js';
import { swapShared } from './stagingYard.js';
import { floatGeometry } from './pots.js';
import { cloneTiledMaterial } from './materials.js';

export const HAY_TYPES = ['cone', 'heap', 'half'];

// 27 Nov playtest note: "Haystacks look shiny. Haystacks are never shiny: roughness 1, no
// specular, matte." swapShared() above puts a haystack's thatch mesh on the SAME shared
// 'thatch' library material real roofs use (stagingYard.js sharedSetMaterial, keyed by
// set+repeat) - editing that material's properties in place would also flatten every
// thatched roof in the village, not just haystacks. cloneTiledMaterial (materials.js) gives
// one haystack-only clone that still carries the addWeathering onBeforeCompile hook (a plain
// .clone() silently drops it - see that function's own comment), with roughness forced to 1
// (belt and braces: the roughness map itself already averages 0.72-1.0, matte already) and
// envMapIntensity zeroed so the sky HDRI stops putting a reflected highlight on it - the
// actual "shiny" culprit, since MeshStandardMaterial has no separate specular toggle to turn
// off. Cached per source material, so this is one extra Material object total, not per
// placement: addHaystacks groups meshes by material reference, so the merged-mesh/draw-call
// count below is unchanged.
const matteCache = new Map();
function matteThatch(mat) {
  let m = matteCache.get(mat);
  if (!m) {
    m = cloneTiledMaterial(mat);
    m.roughness = 1;
    m.envMapIntensity = 0;
    matteCache.set(mat, m);
  }
  return m;
}

let modelsPromise = null;
function loadHay() {
  if (!modelsPromise) {
    modelsPromise = Promise.all(HAY_TYPES.map((t) => getGLTFLoader().loadAsync(`assets/models/haystack_${t}_v2.glb`).then((gltf) => {
      gltf.scene.updateWorldMatrix(true, true);
      const parts = [];
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        swapShared(o);
        parts.push({ geo: floatGeometry(o.geometry).applyMatrix4(o.matrixWorld), mat: matteThatch(o.material) });
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
export function addHaystacks(group, placements, name = 'haystacks') {
  return loadHay().then((models) => {
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

const BASE_TONE = new THREE.Color(0xe0cb8c);
const TYPE_BY_N = ['half', 'cone', 'heap'];

/** Old-style rows [x, z, k, n, tone] (k = size, n = shape, tone = straw colour) -> placements; tint is tone relative to the model's baked colour. */
export function hayPlacements(rows) {
  return rows.map(([x, z, k, n, tone]) => {
    const t = new THREE.Color(tone);
    return { type: TYPE_BY_N[((n % 3) + 3) % 3], x, y: 0, z, ry: n * 1.9 + x, s: k, tint: new THREE.Color(Math.min(1, t.r / BASE_TONE.r), Math.min(1, t.g / BASE_TONE.g), Math.min(1, t.b / BASE_TONE.b)).getHex() };
  });
}
