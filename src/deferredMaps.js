import * as THREE from 'three';

// 26 Nov (gate3): the normal, roughness and ao maps of the shared texture library are fetched only once the Play button has
// unlocked, not before it (about 3.3 MB of the old 6.8 MB web bytes before Play). loadRaw() (src/materials.js) hands out an
// empty Texture for them; every clone shares its Source, so when the image lands here, every material already holding it is
// updated in place (no new material, no shader change: the program was compiled with the map slot already set).
// The first 3D frame is held until they have all landed (main.js onStart, renderOK), so nothing she sees changes: the title
// is opaque, and on a laptop the maps are in before the button can be pressed. `?nodefer=1` loads them before Play as before.
const OFF = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('nodefer');
const RX = /_(normal|roughness|ao)\.webp$/;
const queue = []; // [url, texture]
let open = false, pending = 0;
const waiters = [];
// the game's TextureLoader (bitmap-patched in src/frameQueue.js: off-thread decode, one fetch per url shared with every caller)
const loader = () => new THREE.TextureLoader();

/** True when this url should wait for releaseDeferredMaps(). */
export const shouldDefer = (url, srgb) => !OFF && !open && !srgb && RX.test(url);

/** An empty texture now; its image arrives after releaseDeferredMaps(). `busted` is the versioned request url. */
export function deferredTexture(busted) {
  const tex = new THREE.Texture();
  queue.push([busted, (t) => { tex.image = t.image; tex.flipY = t.flipY; tex.needsUpdate = true; }]);
  return tex;
}

/** Same for a shared Source (src/sharedTextures.js, the relinked Blender models): filled in place, before its first upload. */
export function deferredSource(busted) {
  const src = new THREE.Source(null);
  queue.push([busted, (t) => { src.data = t.image; src.needsUpdate = true; }]);
  return src;
}

const tasks = []; // async jobs (house atlas n/r canvases, src/kit/housesMaterial.js) that fetch + draw their own maps after the unlock
/** Runs fn() now when deferral is off or already released (returns its promise); otherwise holds it for releaseDeferredMaps(). */
export function deferredTask(fn) {
  if (OFF || open) return Promise.resolve(fn());
  tasks.push(fn);
  return Promise.resolve();
}

function settle() { if (--pending === 0 && open) waiters.splice(0).forEach((f) => f()); }

/** Called once when the Play button unlocks: starts every held download (shared materials are updated in place). */
export function releaseDeferredMaps() {
  if (open) return;
  open = true;
  if (typeof window !== 'undefined') (window.__loadMarks = window.__loadMarks || {}).deferredMaps = queue.length;
  pending = queue.length + tasks.length + 1;
  const L = loader();
  for (const [url, fill] of queue.splice(0)) {
    L.load(url, (t) => { fill(t); settle(); }, undefined, () => settle()); // a failed file counts as done, like the other loaders
  }
  for (const fn of tasks.splice(0)) Promise.resolve().then(fn).catch(() => {}).then(settle);
  settle();
}

export const deferredMapsDone = () => open && pending === 0;
/** Resolves once every held map has landed (or failed). */
export const deferredMapsReady = () => (deferredMapsDone() ? Promise.resolve() : new Promise((r) => waiters.push(r)));
