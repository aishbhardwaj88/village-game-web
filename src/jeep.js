import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from './loaders.js';
import { floatGeometry } from './pots.js';
import { ANCHORS } from './anchors.js';
import { batchPlaceModelWhenRooted } from './placeBatch.js';
import { requestColliderRebuild } from './collision.js';

/**
 * THE OLD JEEP (docs/VILLAGE_VOCABULARY.md section 13): the Blender model from tools/blender/build_jeep.py, an open-top
 * army-surplus style jeep in faded olive with its canvas hood folded, spare wheel on the tail, jerrycan on the flank.
 * Generic: no brand, no badge, blank plates. One of it in the village, parked by the panchayat bhavan.
 *
 * Same pipeline as src/scooters.js: the placement is baked (yaw, a hair of scale, a slight tint lean), merged per shared
 * library material (metal, plaster-for-rubber, tarpaulin, relinked by src/sharedTextures.js), then folded into the
 * village-wide per-material batches (src/placeBatch.js), so it adds no draw call of its own once those batches exist.
 * Collision: the merged source meshes stay in the scene graph, so src/autoColliders.js rasterises them as solid.
 * The spot is an offset from its place's anchor (src/anchors.js), so it rides with the place when the map moves. It was
 * scouted clear of every collider, visible mesh, map road/lane and NPC route leg (tmp/jeep/search.mjs, all zones forced).
 */
export const JEEP_FILE = 'jeep_v2';

// anchor id, local x / z in the place's frame (front = +z), yaw (rad; the jeep's front is its +z)
export const JEEP_SPOTS = [
  { at: 'yard_panchayat', lx: -12.5, lz: 20.0, yaw: 1.57 },
];

const rnd = (i) => { const s = Math.sin(i * 57.3 + 4.1) * 43758.5453; return s - Math.floor(s); };

function loadModel() {
  return getGLTFLoader().loadAsync(`assets/models/${JEEP_FILE}.glb`).then((gltf) => {
    gltf.scene.updateWorldMatrix(true, true);
    const parts = [];
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.material.transparent) o.material.userData.placeBatchable = true;
      const g = floatGeometry(o.geometry).applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
      parts.push({ geo: g, mat: o.material });
    });
    return parts;
  });
}

function spotMatrix(sp, i) {
  const a = ANCHORS[sp.at];
  if (!a) return null;
  const ry = a.ry || 0, s = Math.sin(ry), c = Math.cos(ry);
  const x = a.x + sp.lx * c + sp.lz * s, z = a.z - sp.lx * s + sp.lz * c;
  const sc = 0.98 + rnd(i) * 0.04;
  const yaw = ry + sp.yaw + (rnd(i + 40) - 0.5) * 0.06;
  return new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(sc, sc, sc));
}

/** Loads the jeep, bakes its spot(s), adds one group 'jeep' to the scene and hands its meshes to the shared batches. */
export function createJeep(scene) {
  const group = new THREE.Group();
  group.name = 'jeep';
  scene.add(group);
  return loadModel().then((parts) => {
    const byMat = new Map(), boxes = [];
    JEEP_SPOTS.forEach((sp, i) => {
      const M = spotMatrix(sp, i);
      if (!M) return;
      const k = 0.95 + rnd(i + 7) * 0.08, warm = (rnd(i + 13) - 0.5) * 0.05;
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
      boxes.push({ at: sp.at, minX: bb.min.x, maxX: bb.max.x, minZ: bb.min.z, maxZ: bb.max.z });
    });
    let n = 0;
    for (const [mat, list] of byMat) {
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      mesh.name = `jeep_${mat.name || n}`; n++;
      mesh.castShadow = true; mesh.receiveShadow = true;
      group.add(mesh);
    }
    batchPlaceModelWhenRooted(group, 'jeep');
    requestColliderRebuild();
    if (typeof window !== 'undefined') window.__jeep = { boxes, meshes: group.children.length };
    return group;
  }).catch((err) => console.warn('jeep did not load', err));
}
