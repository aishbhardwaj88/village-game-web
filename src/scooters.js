import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from './loaders.js';
import { floatGeometry } from './pots.js';
import { ANCHORS } from './anchors.js';
import { batchPlaceModelWhenRooted } from './placeBatch.js';
import { requestColliderRebuild } from './collision.js';

/**
 * SCOOTERS AND MOTORCYCLES (docs/VILLAGE_VOCABULARY.md section 13): the Blender models from tools/blender/build_scooter.py,
 * parked at house fronts and shop fronts. Two of each, so a row never repeats:
 *   scooter_covered_v2 / _b      a step-through scooter on its centre stand under a tied tarpaulin (blue / olive)
 *   scooter_motorcycle_v2 / _b   a 1990s single-cylinder roadster on its side stand (maroon / navy)
 * Generic: no brand, no badge, blank plates.
 *
 * Every placement is baked (own yaw, a hair of scale, a slight tint lean), merged per shared library material
 * (the relinked library sets: metal, plaster-for-rubber, tarpaulin; one copy of each shared by all four files), then folded into the village-wide per-material batches
 * (src/placeBatch.js), so the whole family adds no draw call of its own once those batches exist.
 * Collision: the merged source meshes stay in the scene graph, so src/autoColliders.js rasterises them as solid (a parked
 * vehicle is a body-height obstacle; nothing in src/solidRules.js makes them walkable).
 * Each spot is an offset from its place's anchor (src/anchors.js), so it rides with the place when the map moves.
 * Spots were scouted clear of every collider, visible mesh and map road/lane (tmp/scooters/search.mjs, all zones forced).
 * src/nostalgia.js no longer builds its code-built scooter and motorcycle; these replace them (tea stall spot kept, haveli moved 3 m).
 */
export const SCOOTER_FILES = ['scooter_covered_v2', 'scooter_covered_v2_b', 'scooter_motorcycle_v2', 'scooter_motorcycle_v2_b'];

// [anchor id, local x, local z (place frame, front = +z), yaw (rad; the vehicle's front is its +z), model, tint]
export const SCOOTER_SPOTS = [
  { at: 'haveli', lx: -3.2, lz: 12.0, yaw: -0.3, m: 'scooter_covered_v2' },
  { at: 'teastall', lx: 4.6, lz: 3.6, yaw: 1.35, m: 'scooter_motorcycle_v2' },
  { at: 'house', lx: -5.2, lz: 4.4, yaw: 0.12, m: 'scooter_covered_v2_b' },
  { at: 'store', lx: 4.4, lz: 4.2, yaw: -1.48, m: 'scooter_motorcycle_v2_b' },
  { at: 'halwai', lx: 1.1, lz: 5.1, yaw: 1.7, m: 'scooter_motorcycle_v2' },
  { at: 'post', lx: 7.1, lz: 0.0, yaw: 1.62, m: 'scooter_covered_v2' },
  { at: 'chemist', lx: 0.1, lz: -0.6, yaw: 1.52, m: 'scooter_motorcycle_v2_b' },
  { at: 'ration', lx: 3.0, lz: 6.0, yaw: 0.25, m: 'scooter_covered_v2_b' },
];

const rnd = (i) => { const s = Math.sin(i * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };

let modelsPromise = null;
function loadModels() {
  if (!modelsPromise) {
    const canon = new Map(); // material name -> the first loaded copy: all four files share hb_metal / hb_main / hb_thatch
    modelsPromise = Promise.all(SCOOTER_FILES.map((f) => getGLTFLoader().loadAsync(`assets/models/${f}.glb`).then((gltf) => {
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

/** Loads the four models, bakes every spot, adds one group 'scooters' to the scene and hands its meshes to the shared batches. */
export function createScooters(scene) {
  const group = new THREE.Group();
  group.name = 'scooters';
  scene.add(group);
  return loadModels().then((models) => {
    const byMat = new Map(), boxes = [];
    SCOOTER_SPOTS.forEach((sp, i) => {
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
      mesh.name = `scooters_${mat.name || n}`; n++;
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh);
    }
    batchPlaceModelWhenRooted(group, 'scooters');
    requestColliderRebuild();
    if (typeof window !== 'undefined') window.__scooters = { boxes, meshes: group.children.length };
    return group;
  }).catch((err) => console.warn('scooters did not load', err));
}
