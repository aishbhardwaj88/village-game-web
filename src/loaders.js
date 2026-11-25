import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { gunzipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { sharedTexturePlugin } from './sharedTextures.js';
import { ver } from './assetUrl.js';

let sharedLoader = null;

/** KTX2 (Basis) GPU textures for props and vehicles. The transcoder (public/basis/) is only fetched when the first KTX2
 * texture is parsed, which happens after Play, so nothing here touches the title screen. Needs the renderer once, to
 * ask which GPU formats it takes (BC7 / ASTC / ETC2, else RGBA8 as a fallback, so every browser works). */
let ktx2 = null;
export function setLoaderRenderer(renderer) {
  // No .ktx2 / KHR_texture_basisu asset ships today (checked 25 Nov), so KTX2Loader is a separate chunk fetched 10 s after boot,
  // never on the boot path. A model that needs it before then would fail to parse; add the first KTX2 asset only together
  // with an eager import here.
  const start = () => import('three/examples/jsm/loaders/KTX2Loader.js').then(({ KTX2Loader }) => {
    if (!ktx2) ktx2 = new KTX2Loader().setTranscoderPath(`${import.meta.env.BASE_URL}basis/`).setWorkerLimit(2);
    ktx2.detectSupport(renderer);
    if (sharedLoader) sharedLoader.setKTX2Loader(ktx2);
  }).catch(() => {});
  setTimeout(start, 10000);
}

/** Bumped every time a .glb finishes loading. Models are swapped into the scene by the caller's own callback after this
 * fires, and their collision boxes only exist once that has happened, so src/zoneManager.js watches this counter and
 * rebuilds the collider list shortly after it changes (a model arriving late used to stay walk-through until the next
 * zone change). */
export const modelLoads = { count: 0 };

/** D1 (load time): while held, model loads the predicate does not exempt are queued and only start on releaseModelLoads(),
 * so the opening-view models are not sharing the 4G link with the far half of the village. Off unless main.js holds. */
let holdKeep = null; const heldLoads = [];
export function holdModelLoads(exempt) { holdKeep = exempt; }
export function releaseModelLoads() { if (!holdKeep) return; holdKeep = null; (window.__loadMarks = window.__loadMarks || {}).modelsReleased = performance.now(); heldLoads.splice(0).forEach((f) => f()); }
/** ONE place that turns a project-relative asset path into the URL every fetch and every GLTF load uses (prefetch, props, vehicles).
 * Same string everywhere = one HTTP cache entry, so a later content-hash / cache-bust change here cannot download a file twice. */
export const assetUrl = (path) => new URL(path, document.baseURI).href;
/** Prop and vehicle URLs (src/propGate.js) are never held back by holdModelLoads: they gate the Play button themselves. */
export const exemptModelUrls = new Set();

/** Step 3 (gzip models): after the build, tools/gz-models.mjs turns every non-character .glb in dist/ into .glb.gz (GitHub Pages
 * does not compress .glb) and the build embeds the list. Everything that loads a model goes through this block:
 * listed files are fetched as .gz and unpacked here (DecompressionStream, fflate if the browser lacks it); anything not listed
 * (characters, dev server, desktop build) loads as the plain file exactly as before. */
const gzKey = (url) => { try { const u = new URL(url, document.baseURI); return u.pathname.slice(new URL('./', document.baseURI).pathname.length); } catch (e) { return url; } };
// the list is embedded by the build (vite define __GZ_MODELS__, from tools/asset-hashes.mjs): no extra fetch before the first model.
const gzSet = new Set(typeof __GZ_MODELS__ !== 'undefined' ? __GZ_MODELS__ : []);
export const gzReady = Promise.resolve();
// the .gz url carries ?v=<hash> (ver) so public/sw.js caches it cache-first, like every other hashed asset
export const modelFetchUrl = (url) => { const u = new URL(url, document.baseURI); return gzSet.has(gzKey(url)) ? ver(`${u.origin}${u.pathname}.gz${u.search}`) : url; };
async function gunzip(buf) {
  const h = new Uint8Array(buf, 0, 2); if (h[0] !== 0x1f || h[1] !== 0x8b) return buf; // a server that already unpacked it in transit
  if (typeof DecompressionStream === 'function') {
    try { return await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(); } catch (e) { /* fall through to fflate */ }
  }
  const u = gunzipSync(new Uint8Array(buf)); return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);
}
/** Fetches a model's bytes ready to parse (unpacked when it travelled gzipped). Rejects on HTTP errors. */
export async function fetchModel(url, init) {
  await gzReady;
  const target = modelFetchUrl(url);
  const r = await fetch(target, init);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${target}`);
  const buf = await r.arrayBuffer();
  return target === url ? buf : gunzip(buf);
}
const held = (url) => { if (!holdKeep || exemptModelUrls.has(url)) return false; try { return !holdKeep(url); } catch (e) { return true; } };

export function getGLTFLoader() {
  if (!sharedLoader) {
    sharedLoader = new GLTFLoader();
    sharedLoader.setMeshoptDecoder(MeshoptDecoder);
    if (ktx2) sharedLoader.setKTX2Loader(ktx2);
    sharedLoader.register(sharedTexturePlugin); // older models ship without their library textures (tools/strip-textures.mjs --relink)
    const loadAsync = sharedLoader.loadAsync.bind(sharedLoader);
    const load = sharedLoader.load.bind(sharedLoader);
    sharedLoader.load = (url, onLoad, onProgress, onError) => {
      const done = (g) => { try { if (onLoad) onLoad(g); } finally { modelLoads.count++; } };
      const go = () => {
        gzReady.then(() => {
          if (modelFetchUrl(url) === url) { load(url, done, onProgress, onError); return; }
          // gzipped model: same loading-manager bookkeeping as GLTFLoader.load, so the title's progress and ready signal still count it
          const m = sharedLoader.manager; m.itemStart(url);
          const abs = new URL(url, document.baseURI).href;
          fetchModel(url).then((buf) => sharedLoader.parse(buf, abs.slice(0, abs.lastIndexOf('/') + 1), (g) => { done(g); m.itemEnd(url); }, (e) => { if (onError) onError(e); m.itemError(url); m.itemEnd(url); }))
            .catch((e) => { if (onError) onError(e); else console.error(e); m.itemError(url); m.itemEnd(url); });
        });
      };
      if (held(url)) heldLoads.push(go); else go();
    };
    // three's loadAsync calls this.load, so it is held by the same wrapper above
    sharedLoader.loadAsync = (...a) => loadAsync(...a).then((g) => { modelLoads.count++; return g; });
  }
  return sharedLoader;
}
