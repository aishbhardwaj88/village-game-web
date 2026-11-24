import * as THREE from 'three';
import { getTiledMaterial, cloneTiledMaterial, applySurfaceVariation, loadRaw } from '../materials.js';

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

/**
 * Wall variety for batched kits (shops): every instance of a BatchedMesh shares one plaster/brick/concrete material, so the
 * tile phase and scale are shifted per instance from the instance's own position (no extra texture, no extra draw call).
 * Neighbouring buildings therefore never show the same tile at the same place or scale. Works on a clone, so the shared
 * library material that other callers get from getTiledMaterial() is untouched.
 */
function perInstanceWallVariety(base) {
  const m = cloneTiledMaterial(base);
  const prev = Object.prototype.hasOwnProperty.call(m, 'onBeforeCompile') ? m.onBeforeCompile : null;
  const prevKey = Object.prototype.hasOwnProperty.call(m, 'customProgramCacheKey') ? m.customProgramCacheKey() : '';
  m.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_BATCHING
      {
        vec3 wv_ = batchingMatrix[3].xyz;
        float wh_ = fract(sin(dot(wv_.xz, vec2(12.9898, 78.233))) * 43758.5453);
        float ws_ = 0.85 + 0.3 * fract(wh_ * 7.31);
        vec2 wo_ = vec2(fract(wh_ * 3.17), fract(wh_ * 9.71)) * 3.0;
        #ifdef USE_MAP
          vMapUv = vMapUv * ws_ + wo_;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = vNormalMapUv * ws_ + wo_;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = vRoughnessMapUv * ws_ + wo_;
        #endif
      }
      #endif`);
  };
  m.customProgramCacheKey = () => 'wallVar1' + (prevKey ? '|' + prevKey : '');
  m.name = base.name + '_wallvar';
  return m;
}

/**
 * brick_b / concrete_f: per-shop alternatives (ambientCG Bricks105, Concrete046, public/assets/textures_mix/). They start as the
 * library brick / concrete (already loaded, so nothing new is requested before Play) and swap to their own maps ~8 s after
 * the page is up, in an idle slot; a failed load leaves the plain brick / concrete.
 */
const LATE = { brick_b: ['brick', 'brick_b'], concrete_f: ['concrete', 'concrete_f'] };
function lateVariant(name) {
  const [baseName, dir] = LATE[name];
  const m = perInstanceWallVariety(getTiledMaterial(baseName, { vertexColors: true }));
  m.name = name + '_wallvar';
  if (typeof window !== 'undefined') {
    setTimeout(() => (window.requestIdleCallback || setTimeout)(() => {
      const t = (k, srgb) => { const x = loadRaw(`assets/textures_mix/${dir}/${dir}_${k}.webp`, srgb).clone(); x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 4; return x; };
      try { m.map = t('color', true); m.normalMap = t('normal', false); m.roughnessMap = t('roughness', false); m.needsUpdate = true; } catch (e) { /* stays plain */ }
    }, window.requestIdleCallback ? { timeout: 1000 } : 1), 8000);
  }
  return m;
}

/** name: plaster | brick | concrete | wood | rust | terracotta | ground | grass | lane | crop */
export function landMaterial(name) {
  if (cache.has(name)) return cache.get(name);
  if (LATE[name]) { const lm = lateVariant(name); cache.set(name, lm); return lm; }
  let m = name === 'rust' ? rustMaterial() : getTiledMaterial(name, { vertexColors: true });
  if (name === 'plaster' || name === 'brick' || name === 'concrete') m = perInstanceWallVariety(m);
  cache.set(name, m);
  return m;
}

export function kitMaterials(names) {
  const out = {};
  for (const n of names) out[n] = landMaterial(n);
  return out;
}
