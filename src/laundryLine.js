/**
 * Drying laundry line (J0, 27 Oct): the Blender model from tools/blender/build_laundry.py (6 garments thrown over a rope, pegs, two posts).
 * Garments share one cloth material (vertex colour x per-garment tint, woven normal map, breeze shader from laundry.js); posts, rope and pegs
 * merge into one static mesh on the shared wood set. A line costs two draw calls, instances are baked, never cloned meshes.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from './loaders.js';
import { addBreeze } from './laundry.js';
import { floatGeometry } from './pots.js';

export const LAUNDRY_HALF_SPAN = 2.75;

let modelPromise = null;
function loadLine() {
  if (!modelPromise) {
    modelPromise = getGLTFLoader().loadAsync('assets/models/laundry_line.glb').then((gltf) => {
      gltf.scene.updateWorldMatrix(true, true);
      const garments = [], fixed = [];
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const matName = o.material.name;
        if (matName === 'ldy_cloth') {
          const local = floatGeometry(o.geometry); // garment-local: y = 0 at the rope, negative below
          const pos = local.attributes.position, sway = new Float32Array(pos.count * 2);
          for (let i = 0; i < pos.count; i++) sway[i * 2] = Math.max(0, -pos.getY(i));
          const c4 = local.attributes.color;
          if (c4 && c4.itemSize === 4) { const c3 = new Float32Array(pos.count * 3); for (let i = 0; i < pos.count; i++) c3.set([c4.getX(i), c4.getY(i), c4.getZ(i)], i * 3); local.setAttribute('color', new THREE.BufferAttribute(c3, 3)); }
          local.setAttribute('aSway', new THREE.BufferAttribute(sway, 2));
          const gUv = new Float32Array(pos.count * 2); // the glb ships no UVs (its textures were stripped): thread-scale UVs for the weave normal map
          for (let i = 0; i < pos.count; i++) { gUv[i * 2] = pos.getX(i); gUv[i * 2 + 1] = pos.getY(i) + pos.getZ(i); }
          local.setAttribute('uv', new THREE.BufferAttribute(gUv, 2));
          garments.push({ geo: local.applyMatrix4(o.matrixWorld), id: garments.length });
        } else {
          const g = floatGeometry(o.geometry).applyMatrix4(o.matrixWorld);
          const col = matName === 'ldy_rope' ? 0x9a8658 : matName === 'ldy_wood' ? 0x5e4228 : 0x4e3822;
          const c = new THREE.Color(col), n = g.attributes.position.count, arr = new Float32Array(n * 3), uv = new Float32Array(n * 2);
          for (let i = 0; i < n; i++) {
            arr.set([c.r, c.g, c.b], i * 3);
            uv[i * 2] = g.attributes.position.getX(i) + g.attributes.position.getZ(i); uv[i * 2 + 1] = g.attributes.position.getY(i);
          }
          g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
          g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          g.setAttribute('aSway', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
          fixed.push(g);
        }
      });
      return { garments, fixed };
    });
  }
  return modelPromise;
}

let CLOTH = null;
function clothMat() {
  if (CLOTH) return CLOTH;
  // small tiling plain-weave normal map: 128 px = 8 mm of thread, repeated over each garment
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const ctx = c.getContext('2d'), img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const hx = Math.sin(x * Math.PI / 4) * ((y >> 2) & 1 ? 1 : -1), hy = Math.sin(y * Math.PI / 4) * ((x >> 2) & 1 ? 1 : -1);
    const p = (y * N + x) * 4;
    img.data[p] = 128 + hx * 30; img.data[p + 1] = 128 + hy * 30; img.data[p + 2] = 255; img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const normalMap = new THREE.CanvasTexture(c);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping; normalMap.repeat.set(30, 30); normalMap.anisotropy = 4;
  CLOTH = new THREE.MeshStandardMaterial({ name: 'laundry_cloth_model', vertexColors: true, normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.94, metalness: 0, side: THREE.DoubleSide });
  addBreeze(CLOTH);
  return CLOTH;
}
const TINTS = [0xffffff, 0xfff0d8, 0xd8e4ff, 0xffd8d8, 0xe8ffd8, 0xf4d8ff];

/** Put a laundry line in `group` (its local frame): { x, z, ry, seed }. The line runs along local x, posts 5.4 m apart, on ground y = 0. */
export function addLaundryLine(group, { x = 0, z = 0, ry = 0, seed = 1, name = 'laundry_line' } = {}) {
  return loadLine().then(({ garments, fixed }) => {
    const rnd = (k) => { const v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
    const mat4 = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1));
    const cloth = [];
    garments.forEach((gm, i) => {
      if (i > 0 && rnd(i) < 0.18) return; // an occasional gap on the line
      const g = gm.geo.clone();
      const col = g.attributes.color, t = new THREE.Color(TINTS[Math.floor(rnd(i + 20) * TINTS.length)]);
      const sh = 0.72 + rnd(i + 40) * 0.2; // sun-softened, not showroom-bright
      if (col) for (let k = 0; k < col.count; k++) col.setXYZ(k, col.getX(k) * t.r * sh, col.getY(k) * t.g * sh, col.getZ(k) * t.b * sh);
      const ph = g.attributes.aSway;
      for (let k = 0; k < ph.count; k++) ph.setY(k, seed * 0.7 + i * 1.9);
      g.applyMatrix4(mat4);
      cloth.push(g);
    });
    // posts, rope and pegs ride in the cloth mesh (hang 0 so they never sway): one draw call per line
    fixed.forEach((g) => cloth.push(g.clone().applyMatrix4(mat4)));
    {
      const m = new THREE.Mesh(mergeGeometries(cloth), clothMat());
      m.name = name + '_cloth'; m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false;
      group.add(m);
    }
  }).catch((err) => console.warn('laundry line did not load', err));
}
