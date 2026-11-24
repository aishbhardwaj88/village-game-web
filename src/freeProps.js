/**
 * Free-prop review row (24 Nov 2026): Sketchfab CC BY props, slimmed (meshopt + WebP, matte, colour-shifted, brands
 * painted out) and lined up on open ground at x 600-612, z 36-40 for the art director to judge. Loaded only AFTER Play,
 * in small groups, so nothing here costs start-up time. Other workers place them in the village later.
 * Credits: docs/CREDITS.md. Files: public/assets/props_free/.
 */
import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';
import { colliderBoxFromTransform, requestColliderRebuild } from './collision.js';

// dim: 'h' = height, 'l' = longest horizontal side, in metres. solid: gets a collider.
export const FREE_PROPS = [
  // group 1: small tools and kitchen things
  { file: 'matka', dim: 'h', size: 0.45 }, { file: 'milk_can', dim: 'h', size: 0.55 }, { file: 'bucket', dim: 'h', size: 0.3 },
  { file: 'bucket_b', dim: 'h', size: 0.26 }, { file: 'watering_can', dim: 'h', size: 0.35 }, { file: 'kettle', dim: 'h', size: 0.26 },
  { file: 'pressure_cooker', dim: 'h', size: 0.26 }, { file: 'kerosene_lamp', dim: 'h', size: 0.36 },
  // group 2: farm tools and household
  { file: 'pitchfork_a', dim: 'h', size: 1.6 }, { file: 'pitchfork_b', dim: 'h', size: 1.5 }, { file: 'sickle', dim: 'h', size: 0.4 },
  { file: 'radio', dim: 'l', size: 0.36 }, { file: 'sewing_machine', dim: 'l', size: 0.42 }, { file: 'trunk', dim: 'l', size: 0.75, solid: true },
  { file: 'handpump', dim: 'h', size: 0.9, solid: true }, { file: 'hay_bale', dim: 'h', size: 0.5, solid: true },
  // group 3: big pieces
  { file: 'grind_stone', dim: 'l', size: 1.0, solid: true }, { file: 'wheelbarrow', dim: 'l', size: 1.4, solid: true },
  { file: 'charpai_a', dim: 'l', size: 1.9, solid: true }, { file: 'charpai_b', dim: 'l', size: 1.9, solid: true },
  { file: 'gate', dim: 'l', size: 1.6, solid: true }, { file: 'well_a', dim: 'h', size: 1.1, solid: true },
  { file: 'well_c', dim: 'h', size: 1.1, solid: true }, { file: 'water_tank', dim: 'h', size: 4.0, solid: true },
];
const GROUPS = [8, 8, 8];
const ROW_X0 = 600.4, ROW_X1 = 612, ROW_Z = [36.4, 39.4], GAP = 0.3;

export function addFreeProps(scene, groundAt) {
  const group = new THREE.Group();
  group.name = 'free_props';
  scene.add(group);
  let cx = ROW_X0, row = 0, rowDepth = 0;
  const place = (v, gltf) => {
    const m = gltf.scene;
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const k = v.size / (v.dim === 'h' ? size.y : Math.max(size.x, size.z));
    const c = box.getCenter(new THREE.Vector3());
    const w = size.x * k, d = size.z * k;
    if (cx + w > ROW_X1 && cx > ROW_X0) { cx = ROW_X0; row = Math.min(row + 1, ROW_Z.length - 1); }
    const x = cx + w / 2, z = ROW_Z[row];
    cx += w + GAP;
    const holder = new THREE.Group();
    holder.name = `free_${v.file}`;
    m.scale.multiplyScalar(k);
    m.position.set(-c.x * k, -box.min.y * k, -c.z * k);
    holder.add(m);
    holder.position.set(x, groundAt ? groundAt(x, z) : 0, z);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (v.solid) holder.userData.colliderBoxes = [colliderBoxFromTransform(w, d, new THREE.Matrix4().setPosition(x, 0, z))];
    group.add(holder);
  };
  let from = 0;
  let chain = Promise.resolve();
  for (const n of GROUPS) {
    const part = FREE_PROPS.slice(from, from + n); from += n;
    chain = chain.then(() => Promise.all(part.map((v) => getGLTFLoader().loadAsync(`assets/props_free/${v.file}.glb`)
      .then((g) => g).catch((e) => { console.warn('[freeProps]', v.file, e); return null; })))
      .then((gs) => { gs.forEach((g, i) => { if (g) place(part[i], g); }); requestColliderRebuild(); }));
  }
  return chain;
}
