import * as THREE from 'three';
import { getTiledMaterial, applySurfaceVariation } from '../materials.js';

/**
 * The library materials this kit uses, by name. Geometry carries its UVs in texture tiles and its tint in vertex colours,
 * so every kit shares exactly one material per library set (one draw call per set per batch).
 *
 * 'rust' (rusted steel, APPROVED 28 Oct) has its texture set in public/assets/textures/rust/ but no entry in
 * src/materials.js SETS yet, so it is assembled here from those same files with the same loader settings and the library's
 * own surface-variation shader ('tin' family). Wiring needed: add `rust` to SETS, then swap this for getTiledMaterial('rust').
 */
const cache = new Map();
const loader = new THREE.TextureLoader();

function rustMaterial() {
  const load = (map, srgb) => {
    const t = loader.load(`assets/textures/rust/rust_${map}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const m = new THREE.MeshStandardMaterial({ map: load('color', true), normalMap: load('normal'), roughnessMap: load('roughness'), roughness: 1, metalness: 0.15, vertexColors: true });
  m.name = 'rust';
  applySurfaceVariation(m, 'tin');
  return m;
}

/** name: plaster | brick | concrete | wood | rust | terracotta | ground | grass | lane | crop */
export function landMaterial(name) {
  if (cache.has(name)) return cache.get(name);
  const m = name === 'rust' ? rustMaterial() : getTiledMaterial(name, { vertexColors: true });
  cache.set(name, m);
  return m;
}

export function kitMaterials(names) {
  const out = {};
  for (const n of names) out[n] = landMaterial(n);
  return out;
}
