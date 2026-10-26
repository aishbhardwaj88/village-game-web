import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

let sharedLoader = null;

/** Bumped every time a .glb finishes loading. Models are swapped into the scene by the caller's own callback after this
 * fires, and their collision boxes only exist once that has happened, so src/zoneManager.js watches this counter and
 * rebuilds the collider list shortly after it changes (a model arriving late used to stay walk-through until the next
 * zone change). */
export const modelLoads = { count: 0 };

export function getGLTFLoader() {
  if (!sharedLoader) {
    sharedLoader = new GLTFLoader();
    sharedLoader.setMeshoptDecoder(MeshoptDecoder);
    const loadAsync = sharedLoader.loadAsync.bind(sharedLoader);
    sharedLoader.loadAsync = (...a) => loadAsync(...a).then((g) => { modelLoads.count++; return g; });
    const load = sharedLoader.load.bind(sharedLoader);
    sharedLoader.load = (url, onLoad, ...rest) => load(url, (g) => { try { if (onLoad) onLoad(g); } finally { modelLoads.count++; } }, ...rest);
  }
  return sharedLoader;
}
