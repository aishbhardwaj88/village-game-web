import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { sharedTexturePlugin } from './sharedTextures.js';

let sharedLoader = null;

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
const held = (url) => { if (!holdKeep) return false; try { return !holdKeep(url); } catch (e) { return true; } };

export function getGLTFLoader() {
  if (!sharedLoader) {
    sharedLoader = new GLTFLoader();
    sharedLoader.setMeshoptDecoder(MeshoptDecoder);
    sharedLoader.register(sharedTexturePlugin); // older models ship without their library textures (tools/strip-textures.mjs --relink)
    const loadAsync = sharedLoader.loadAsync.bind(sharedLoader);
    const load = sharedLoader.load.bind(sharedLoader);
    sharedLoader.load = (url, onLoad, ...rest) => {
      const go = () => load(url, (g) => { try { if (onLoad) onLoad(g); } finally { modelLoads.count++; } }, ...rest);
      if (held(url)) heldLoads.push(go); else go();
    };
    // three's loadAsync calls this.load, so it is held by the same wrapper above
    sharedLoader.loadAsync = (...a) => loadAsync(...a).then((g) => { modelLoads.count++; return g; });
  }
  return sharedLoader;
}
