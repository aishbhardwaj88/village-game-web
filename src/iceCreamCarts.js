import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from './loaders.js';
import { floatGeometry } from './pots.js';
import { ANCHORS } from './anchors.js';
import { batchPlaceModelWhenRooted } from './placeBatch.js';
import { requestColliderRebuild } from './collision.js';

/**
 * ICE-CREAM CARTS (docs/VILLAGE_VOCABULARY.md section 4): Blender carts from tools/blender/build_icecream_cart.py, a push cart with a
 * bell at the school gate, the mela and the chowk. Same bake, merge and shared-batch path as src/scooters.js; spots are offsets
 * from the place anchors and are not yet scouted against colliders.
 */
export const ICECREAM_FILES = ['icecream_cart', 'icecream_cart_b'];

// [anchor id, local x, local z (place frame, front = +z), yaw (rad; the vehicle's front is its +z), model, tint]
export const ICECREAM_SPOTS = [
  { at: 'school', lx: 8.0, lz: 7.0, yaw: 1.2, m: 'icecream_cart' },
  { at: 'mela', lx: 5.0, lz: 6.0, yaw: -0.8, m: 'icecream_cart_b' },
  { at: 'chowk', lx: -12.0, lz: 9.0, yaw: 0.6, m: 'icecream_cart' },
];

const rnd = (i) => { const s = Math.sin(i * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };

let modelsPromise = null;
function loadModels() {
  if (!modelsPromise) {
    const canon = new Map(); // material name -> the first loaded copy: all four files share hb_metal / hb_main / hb_thatch
    modelsPromise = Promise.all(ICECREAM_FILES.map((f) => getGLTFLoader().loadAsync(`assets/models/${f}.glb`).then((gltf) => {
      gltf.scene.updateWorldMatrix(true, true);
      const parts = [];
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        // the relinked material (src/sharedTextures.js: library maps, metalness 0 for painted steel, world-space variation),
        // not stagingYard swapShared, whose 'metal' set at metalness 0.6 turned the maroon and navy paint near-black in game
        if (!canon.has(o.material.name)) { canon.set(o.material.name, o.material); if (!o.material.transparent) o.material.userData.placeBatchable = true; }
        o.material = canon.get(o.material.name);
        const g = floatGeometry(o.geometry).applyMatrix4(o.matrixWorld);
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
        parts.push({ geo: g, mat: o.material });
      });
      return [f, parts];
    }))).then((e) => Object.fromEntries(e));
  }
  return modelsPromise;
}

function spotMatrix(sp, i) {
  const a = ANCHORS[sp.at];
  if (!a) return null;
  const ry = a.ry || 0, s = Math.sin(ry), c = Math.cos(ry);
  const x = a.x + sp.lx * c + sp.lz * s, z = a.z - sp.lx * s + sp.lz * c;
  const sc = 0.97 + rnd(i) * 0.06;
  const yaw = ry + sp.yaw + (rnd(i + 40) - 0.5) * 0.12;
  return new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(sc, sc, sc));
}

/** Loads the four models, bakes every spot, adds one group 'icecream_carts' to the scene and hands its meshes to the shared batches. */
export function createIceCreamCarts(scene) {
  const group = new THREE.Group();
  group.name = 'icecream_carts';
  scene.add(group);
  return loadModels().then((models) => {
    const byMat = new Map(), boxes = [];
    ICECREAM_SPOTS.forEach((sp, i) => {
      const parts = models[sp.m], M = spotMatrix(sp, i);
      if (!parts || !M) return;
      // per-unit tint lean: a little warmer / cooler, a little lighter / darker, never saturating
      const k = 0.93 + rnd(i + 7) * 0.1, warm = (rnd(i + 13) - 0.5) * 0.06;
      const tint = [k * (1 + warm), k, k * (1 - warm)];
      const bb = new THREE.Box3();
      for (const p of parts) {
        const g = p.geo.clone().applyMatrix4(M);
        const col = g.attributes.color;
        if (col) for (let v = 0; v < col.count; v++) col.setXYZ(v, Math.min(0.92, col.getX(v) * tint[0]), Math.min(0.92, col.getY(v) * tint[1]), Math.min(0.92, col.getZ(v) * tint[2]));
        g.computeBoundingBox(); bb.union(g.boundingBox);
        if (!byMat.has(p.mat)) byMat.set(p.mat, []);
        byMat.get(p.mat).push(g);
      }
      boxes.push({ at: sp.at, m: sp.m, minX: bb.min.x, maxX: bb.max.x, minZ: bb.min.z, maxZ: bb.max.z });
    });
    let n = 0;
    for (const [mat, list] of byMat) {
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      mesh.name = `icecream_${mat.name || n}`; n++;
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh);
    }
    batchPlaceModelWhenRooted(group, 'icecream_carts');
    requestColliderRebuild();
    if (typeof window !== 'undefined') window.__icecream = { boxes, meshes: group.children.length };
    return group;
  }).catch((err) => console.warn('ice-cream carts did not load', err));
}
