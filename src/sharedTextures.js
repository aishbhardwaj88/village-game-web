import * as THREE from 'three';

/**
 * Shared library textures for the OLDER Blender models (gaushala, temple, house_compound, abadi rows, chowk, shops...).
 * tools/strip-textures.mjs --relink removed their embedded copies of the library maps (public/assets/textures/<set>/) and
 * wrote extras.dopahar_relink = { set, c, n, mr, ns } on each material: which set, plus the exact texture-info of each slot
 * (uv set, KHR_texture_transform scale/offset/rotation, sampler, normal scale). This GLTFLoader plugin puts the shared maps
 * back before the load resolves, so every load site sees the same material it always did, and each image is downloaded once
 * for the whole game instead of once per model. Unlike stagingYard.js swapShared(), the material is NOT replaced and no
 * weathering is added: the look is exactly the exported one.
 */
const images = new Map();   // url -> Promise<THREE.Source>
function sourceFor(set, kind) {
  const url = `assets/textures/${set}/${set}_${kind}.webp`;
  let p = images.get(url);
  if (!p) {
    p = new THREE.ImageLoader().loadAsync(url).then((img) => new THREE.Source(img));
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
