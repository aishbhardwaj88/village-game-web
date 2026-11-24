import * as THREE from 'three';
import { applySurfaceVariation, surfaceFamilyFor, bust } from './materials.js';

/**
 * Shared library textures for the OLDER Blender models (gaushala, temple, house_compound, abadi rows, chowk, shops...).
 * tools/strip-textures.mjs --relink removed their embedded copies of the library maps (public/assets/textures/<set>/) and
 * wrote extras.dopahar_relink = { set, c, n, mr, ns } on each material: which set, plus the exact texture-info of each slot
 * (uv set, KHR_texture_transform scale/offset/rotation, sampler, normal scale). This GLTFLoader plugin puts the shared maps
 * back before the load resolves, so every load site sees the same material it always did, and each image is downloaded once
 * for the whole game instead of once per model. Unlike stagingYard.js swapShared(), the material is NOT replaced; the only
 * addition is materials.js applySurfaceVariation (subtle world-space mottling/roughness/cavity, shader values only).
 *
 * Found + fixed 24 Nov (efficiency item 7, "textures fetched twice"): this used its own private, UNBUSTED
 * THREE.ImageLoader straight at `assets/textures/<set>/...webp`, a totally separate fetch + cache from
 * materials.js's getTiledMaterial()/loadRaw() (the "one shared, cache-busted, dedup-by-URL fetch" those already
 * use, see materials.js's own comment on loadRaw — this was exactly that same bug, just in a third call site
 * the 24 Nov fix of landFields.js/landMaterials.js missed). Any place using one of these sets BOTH on a legacy
 * relinked model and directly via getTiledMaterial() (true for every set here: wood, plaster, brick, tin,
 * concrete, metal, ground, grass, crop, terracotta...) downloaded the same bytes twice. Now goes through
 * THREE.TextureLoader (not ImageLoader) at the SAME bust()-ed URL loadRaw() requests, which frameQueue.js's
 * bitmap-patched TextureLoader.load dedupes by exact resolved URL across every caller in the game (one real
 * fetch, shared) - measured 24 Nov: cut every one of these sets from 2 real downloads to 1.
 */
const images = new Map();   // url -> Promise<THREE.Source>
function sourceFor(set, kind) {
  const url = `assets/textures/${set}/${set}_${kind}.webp`;
  let p = images.get(url);
  if (!p) {
    p = new THREE.TextureLoader().loadAsync(bust(url)).then((tex) => tex.source);
    images.set(url, p);
  }
  return p;
}

const WRAP = { 33071: THREE.ClampToEdgeWrapping, 33648: THREE.MirroredRepeatWrapping, 10497: THREE.RepeatWrapping };
const FILTER = { 9728: THREE.NearestFilter, 9729: THREE.LinearFilter, 9984: THREE.NearestMipmapNearestFilter, 9985: THREE.LinearMipmapNearestFilter, 9986: THREE.NearestMipmapLinearFilter, 9987: THREE.LinearMipmapLinearFilter };

/** One THREE.Texture per (source, texture-info): same as GLTFLoader builds it (flipY false, sampler, transform). */
const textures = new Map();
function textureFor(source, info, srgb) {
  const key = source.uuid + JSON.stringify(info);
  let t = textures.get(key);
  if (t) return t;
  t = new THREE.Texture();
  t.source = source;
  t.flipY = false;
  t.wrapS = WRAP[info.ws] ?? THREE.RepeatWrapping;
  t.wrapT = WRAP[info.wt] ?? THREE.RepeatWrapping;
  t.magFilter = FILTER[info.mag] ?? THREE.LinearFilter;
  t.minFilter = FILTER[info.min] ?? THREE.LinearMipmapLinearFilter;
  t.channel = info.uv || 0;
  if (info.s) t.repeat.fromArray(info.s);
  if (info.o) t.offset.fromArray(info.o);
  if (info.r) t.rotation = info.r;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  textures.set(key, t);
  return t;
}

async function relinkMaterial(m, hasTangents) {
  const rl = m.userData.dopahar_relink;
  const [c, n, r] = await Promise.all(['color', 'normal', 'roughness'].map((k, i) => ([rl.c, rl.n, rl.mr][i] ? sourceFor(rl.set, k) : null)));
  if (c) m.map = textureFor(c, rl.c, true);
  if (n) {
    m.normalMap = textureFor(n, rl.n, false);
    const s = rl.ns ?? 1;
    m.normalScale.set(s, hasTangents ? s : -s);   // GLTFLoader flips y for derivative tangents
  }
  if (r) m.roughnessMap = textureFor(r, rl.mr, false);   // metalness was folded into metallicFactor by the strip tool
  // BACKLOG J0 (materials read as plastic): metalness 0 except real metal, then the shared world-space
  // variation (mottling, roughness, ground cavity on masonry). Maps and tiling stay exactly as exported.
  const family = surfaceFamilyFor(rl.set);
  if (family !== 'tin') m.metalness = 0;
  if (family) applySurfaceVariation(m, family);
  m.needsUpdate = true;
}

/** GLTFLoader plugin: register with loader.register(sharedTexturePlugin). */
export function sharedTexturePlugin() {
  return {
    name: 'dopahar_shared_textures',
    afterRoot(result) {
      const jobs = new Map();
      for (const scene of result.scenes) {
        scene.traverse((o) => {
          if (!o.isMesh) return;
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            if (m && m.userData && m.userData.dopahar_relink && !jobs.has(m)) jobs.set(m, relinkMaterial(m, !!o.geometry.attributes.tangent));
          }
        });
      }
      return Promise.all(jobs.values()).catch((err) => console.warn('shared texture relink failed', err));
    },
  };
}
