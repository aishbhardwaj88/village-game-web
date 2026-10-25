import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';

/**
 * The 8 village house types (Places V1/houses_kit, tools/blender/build_houses_kit.py -> public/assets/models/house_kit_<a..h>.glb) drawn INSTANCED:
 * one InstancedMesh per (type, material), per-instance placement, mirrored facing, width variation (x scale 0.88-1.15) and, on the plaster mesh only,
 * a pastel tint. Colliders come from the geometry itself (src/autoColliders.js reads InstancedMesh instances). Types share the staged-model material
 * pipeline (src/stagingYard.js applies the shared CC0 sets). Usage for the abadi: call placeKitHouses(group, models, placements).
 *
 * Plot footprints (x half-width, z min..max, front = +z), straight from the build script:
 */
export const KIT_TYPES = {
  a: { hw: 3.3, z0: -2.8, z1: 2.8 }, b: { hw: 3.6, z0: -2.8, z1: 5.2 }, c: { hw: 3.6, z0: -3.2, z1: 4.2 }, d: { hw: 4.0, z0: -6.2, z1: 5.2 },
  e: { hw: 3.6, z0: -3.6, z1: 4.4 }, f: { hw: 4.0, z0: -4.4, z1: 5.0 }, g: { hw: 6.0, z0: -9.5, z1: 9.5 }, h: { hw: 9.6, z0: -8.6, z1: 8.6 },
};
/** Generation shares (LAYOUT.md "Updated shares"). */
export const KIT_SHARES = { a: 0.12, b: 0.18, c: 0.22, d: 0.18, e: 0.10, f: 0.08, g: 0.07, h: 0.05 };
const WHITE = new THREE.Color(1, 1, 1);
const PASTELS = [0xf4c7c3, 0xf2c9a0, 0xc7e6d2, 0xf1e6b8, 0xf6e7a0, 0xc4d5ea];

/** A Float32 copy of a (possibly meshopt-quantised, normalised-int) geometry: applyMatrix4 on normalised int16 attributes would clip. */
function floatGeometry(src) {
  const g = new THREE.BufferGeometry();
  for (const name of Object.keys(src.attributes)) {
    const a = src.attributes[name];
    const f = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) f[i * a.itemSize + k] = [a.getX, a.getY, a.getZ, a.getW][k].call(a, i);
    g.setAttribute(name, new THREE.BufferAttribute(f, a.itemSize));
  }
  if (src.index) g.setIndex(src.index.clone());
  for (const grp of src.groups) g.addGroup(grp.start, grp.count, grp.materialIndex);
  return g;
}

export function loadKitModels() {
  const loader = getGLTFLoader();
  return Promise.all(Object.keys(KIT_TYPES).map((t) => loader.loadAsync(`assets/models/house_kit_${t}.glb`).then((g) => [t, g.scene])))
    .then((entries) => Object.fromEntries(entries));
}

/**
 * placements: [{ type, x, z, ry (0 = front +z, PI = front -z), sx (width scale), tint (0xRRGGBB or null) }] in `group`'s local frame.
 * `applyMaterial(mesh)` is called once per source mesh so the caller can swap in the shared texture sets.
 */
export function placeKitHouses(group, models, placements, applyMaterial = () => {}) {
  const byType = new Map();
  for (const p of placements) { const l = byType.get(p.type) || []; l.push(p); byType.set(p.type, l); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  for (const [type, list] of byType) {
    const src = models[type];
    if (!src) continue;
    src.updateWorldMatrix(true, true);
    src.traverse((mesh) => {
      if (!mesh.isMesh) return;
      applyMaterial(mesh);
      // the compressed GLB keeps its de-quantisation in the node matrix: bake it into a private copy of the geometry so the instances can carry their own matrices
      const geo = floatGeometry(mesh.geometry).applyMatrix4(mesh.matrixWorld);
      const inst = new THREE.InstancedMesh(geo, mesh.material, list.length);
      inst.name = `kit_${type}_${mesh.name || mesh.material.name}`;
      inst.castShadow = true; inst.receiveShadow = true;
      list.forEach((p, i) => {
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, p.ry || 0);
        s.set(p.sx || 1, 1, 1);
        pos.set(p.x, 0, p.z);
        m4.compose(pos, q, s);
        inst.setMatrixAt(i, m4);
        if (/hb_main/.test(mesh.material.name) && p.tint != null) inst.setColorAt(i, col.setHex(p.tint).lerp(WHITE, 0.6));
        else inst.setColorAt(i, col.setHex(0xffffff));
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      group.add(inst);
    });
  }
}

/** A deterministic mixed street from the shares: type order by weighted pick, widths 0.88-1.15, pastel tint, wall-to-wall with `gap` metres. Returns placements along +x starting at x0. */
export function kitStreet(seed, count, x0, z, ry = 0, gap = 0.4, types = null) {
  let r = seed >>> 0;
  const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
  const keys = types || Object.keys(KIT_SHARES);
  const out = [];
  let x = x0;
  let prev = '';
  for (let i = 0; i < count; i++) {
    let t;
    if (types) t = types[i % types.length];
    else { let tries = 0; do { let u = rnd(), acc = 0; t = keys[keys.length - 1]; for (const k of keys) { acc += KIT_SHARES[k]; if (u < acc) { t = k; break; } } } while (t === prev && tries++ < 6); }
    prev = t;
    const sx = 0.88 + rnd() * 0.27;
    const hw = KIT_TYPES[t].hw * sx;
    x += hw;
    out.push({ type: t, x, z, ry, sx, tint: PASTELS[Math.floor(rnd() * PASTELS.length)] });
    x += hw + gap;
  }
  return out;
}
