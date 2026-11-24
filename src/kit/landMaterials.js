import * as THREE from 'three';
import { getTiledMaterial, applySurfaceVariation, loadRaw } from '../materials.js';

/**
 * The library materials this kit uses, by name. Geometry carries its UVs in texture tiles and its tint in vertex colours,
 * so every kit shares exactly one material per library set (one draw call per set per batch).
 *
 * 'rust' (rusted steel, APPROVED 28 Oct) now has its own entry in src/materials.js SETS, but this kit still builds its
 * own material for it rather than getTiledMaterial('rust') because this one carries an explicit metalness (0.15) that
 * getTiledMaterial's shared cache doesn't set for any set — that's a material value this kit alone uses, so it isn't
 * folded into getTiledMaterial without her sign-off (CLAUDE.md 5a2: a place build may use the library by name, but
 * doesn't add new values to it unasked). It DOES go through the library's own shared, cache-busted loadRaw() now
 * (24 Nov fix) instead of a private TextureLoader straight at the same public/ path — same files as SETS.rust, so this
 * also means a future getTiledMaterial('rust') caller would share the fetch instead of downloading it again.
 */
const cache = new Map();

function rustMaterial() {
  const load = (map, srgb) => {
    const t = loadRaw(`assets/textures/rust/rust_${map}.webp`, srgb).clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
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
