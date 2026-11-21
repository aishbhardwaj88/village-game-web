/**
 * S7 (21 Nov): distance tiers for the rigged Tripo characters (docs/s7/characters.md, budget in docs/s7/SPRINT.md).
 *
 *   near  (<= 25 m, on screen)   fully animated, blink + smile. At most 12 at once, nearest first; the rest drop to mid.
 *   mid   (25-50 m, on screen)   animation stepped at 12 per second instead of every frame; blink/smile switched off.
 *   off screen (<= 50 m)         animation paused (still drawn, so a shadow at the screen edge is never missing).
 *   far   (> 50 m)               hidden and paused; its bones are not even updated.
 *
 * How it hooks in without touching other files: src/characterAnim.js gives every character its own
 * THREE.AnimationMixer and calls mixer.update(dt) once per frame. initCharacterLOD() wraps AnimationMixer.update ONCE:
 * a mixer whose root holds a SkinnedMesh is registered as a character on its first update, and from then on its update
 * is passed through, stepped at 12 Hz, or skipped, by tier. Mixers without a skinned mesh are untouched. Tiers are worked
 * out once per frame from the camera (distance + view frustum). A small hysteresis (2 m) stops anyone flickering at a
 * boundary. Visibility: a character is hidden only by this module and only shown again by this module, so any other
 * code that hides a model keeps control of it.
 *
 * Loading (22 Nov, integrator): no character file is downloaded before Play. initCharacterLOD wraps assetSlots.register:
 * a character slot (the cast files below, ?gather=1 actors, `<key>#<n>` side-job people) is marked "already resolved"
 * so the title screen never waits for it and nothing downloads at boot (the code-built stand-in stays visible). After
 * Play, characters within LOAD_RADIUS of the camera are loaded nearest first, two at a time; anyone further away loads
 * when the camera comes within range. With the tiers off they still wait for Play, then all load nearest first.
 *
 * `?charlod=0` turns the tiers off (for before/after measurements). window.__charLOD exposes counts for tests.
 */
import * as THREE from 'three';

// ONE config for every limit. 'full' = the full-quality game (default, built first); 'light' = the later web edition
// (docs/s7/SPRINT.md budget).
// The edition is passed by main.js (initCharacterLOD({ ..., profile })); `?charprofile=light` (or full) overrides it for testing.
export const LOD_PROFILES = {
  light: { NEAR: 25, FAR: 50, MAX_FULL: 12, MID_HZ: 12, HYST: 2, LOAD_RADIUS: 55, LOAD_AT_ONCE: 2 },
  full: { NEAR: 40, FAR: 90, MAX_FULL: 24, MID_HZ: 20, HYST: 2, LOAD_RADIUS: 95, LOAD_AT_ONCE: 3 },
};
export const LOD = { ...LOD_PROFILES.full }; // the live values (filled from the chosen profile at init)
// Character model files (public/assets/models/<file>.glb). Slots named gather_* or <key>#<n> count as characters too.
// A new Tripo character wired some other way: add its file name here so it waits for Play instead of loading at boot.
export const CHARACTER_FILES = new Set(['maa', 'dadi', 'pitaji', 'sarpanch', 'dada', 'postman', 'sister', 'brother', 'teacher', 'parlour_didi',
  'halwai', 'doodhwala', 'kulfiwala', 'chaatwala', 'bantawala', 'shopkeeper', 'villager_aunty', 'kid_a', 'kid_b', 'kid_c', 'kid_d']);
const FULL = 0, MID = 1, PAUSED = 2, HIDDEN = 3;
const NAMES = ['full', 'mid', 'paused', 'hidden'];

const entries = [];
const seen = new WeakSet();
const frustum = new THREE.Frustum();
const projView = new THREE.Matrix4();
const camPos = new THREE.Vector3(), pos = new THREE.Vector3();
const sphere = new THREE.Sphere();
let installed = false;
const stats = { total: 0, full: 0, mid: 0, paused: 0, hidden: 0, mixerUpdates: 0, mixerSkips: 0, waiting: 0, loading: 0, loaded: 0 };
const pending = []; // { name, slot } character slots not downloaded yet
let loadingNow = 0;

function register(mixer) {
  const root = mixer.getRoot();
  if (!root || !root.isObject3D) return null;
  let skinned = false;
  const faces = [];
  root.traverse((o) => {
    if (o.isSkinnedMesh) skinned = true;
    if (o.isMesh && o.morphTargetInfluences && o.morphTargetInfluences.length) faces.push(o);
  });
  if (!skinned) return null;
  // height from the (bind pose) box, in the root's own scale; used for the on-screen sphere
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const e = { mixer, root, faces, height: Math.max(0.5, box.max.y - box.min.y), base: box.min.y - (root.parent || root).getWorldPosition(pos).y, tier: FULL, acc: 0, hiddenByLod: false, dist: 0 };
  // blink/smile off below the near tier: zeroed right before this mesh is drawn (characterAnim writes them every frame)
  for (const m of faces) {
    const prev = m.onBeforeRender;
    m.onBeforeRender = function (...args) {
      if (e.tier !== FULL) this.morphTargetInfluences.fill(0);
      return prev.apply(this, args);
    };
  }
  root.userData.charLOD = e;
  entries.push(e);
  return e;
}

/** in the scene, and every parent visible (the root itself may be hidden by us) */
function live(root) {
  let o = root.parent, top = root;
  while (o) { if (!o.visible) return false; top = o; o = o.parent; }
  return top.isScene === true;
}

function setHidden(e, hide) {
  if (hide) {
    if (e.root.visible) { e.root.visible = false; e.hiddenByLod = true; e.root.matrixWorldAutoUpdate = false; }
  } else if (e.hiddenByLod) {
    e.root.visible = true; e.hiddenByLod = false; e.root.matrixWorldAutoUpdate = true;
  }
}

function assign(camera) {
  camera.updateMatrixWorld();
  projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projView);
  camera.getWorldPosition(camPos);
  const near = [];
  stats.full = stats.mid = stats.paused = stats.hidden = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (!e.root.parent) { entries.splice(i, 1); continue; } // model taken out of the scene for good
    if (!live(e.root)) { e.tier = PAUSED; continue; } // a hidden container (missions, interiors) draws nothing anyway
    e.root.parent.getWorldPosition(pos); // the parent: a hidden root's own matrix is frozen (matrixWorldAutoUpdate off)
    const d = pos.distanceTo(camPos);
    e.dist = d;
    const wasHidden = e.tier === HIDDEN, wasNear = e.tier === FULL;
    if (d > LOD.FAR + (wasHidden ? -LOD.HYST : LOD.HYST)) { e.tier = HIDDEN; setHidden(e, true); continue; }
    setHidden(e, false);
    sphere.center.set(pos.x, pos.y + e.base + e.height * 0.5, pos.z);
    sphere.radius = e.height * 0.75 + 1.0; // arms out, plus a margin so shadows at the screen edge keep moving
    if (!frustum.intersectsSphere(sphere)) { e.tier = PAUSED; continue; }
    if (d <= LOD.NEAR + (wasNear ? LOD.HYST : 0)) near.push(e);
    else e.tier = MID;
  }
  near.sort((a, b) => a.dist - b.dist);
  near.forEach((e, k) => { e.tier = k < LOD.MAX_FULL ? FULL : MID; });
  for (const e of entries) stats[NAMES[e.tier]]++;
  stats.total = entries.length;
}

function isCharacterSlot(name, slot) {
  if (name === 'player') return false; // ?play=<name>: the player's own body loads with the game
  return CHARACTER_FILES.has(slot.file || slot.name) || /^gather_/.test(name) || /#\d+$/.test(name);
}

function deferCharacterLoads(assetSlots) {
  const register = assetSlots.register;
  assetSlots.register = function (name, opts) {
    const r = register.call(this, name, opts);
    const slot = assetSlots.slots.get(name);
    if (slot && !slot.resolvePromise && isCharacterSlot(name, slot)) {
      // assetSlots.resolveSlot returns this instead of loading: the title screen and resolveAll() see it as done
      slot.resolvePromise = Promise.resolve({ name, replaced: false, deferred: true });
      pending.push({ name, slot });
    }
    return r;
  };
}

const started = () => { const o = typeof document !== 'undefined' && document.getElementById('start-overlay'); return !o || o.classList.contains('hidden'); };
function inScene(o) { while (o.parent) o = o.parent; return o.isScene === true; }

function loadNearest(assetSlots, radius) {
  if (!pending.length || loadingNow >= LOD.LOAD_AT_ONCE || !started()) return;
  let best = -1, bestD = Infinity;
  for (let i = 0; i < pending.length; i++) {
    const c = pending[i].slot.placements[0].container;
    if (!inScene(c)) continue;
    const d = c.getWorldPosition(pos).distanceTo(camPos);
    if (d <= radius && d < bestD) { bestD = d; best = i; }
  }
  if (best < 0) return;
  const { name, slot } = pending.splice(best, 1)[0];
  delete slot.resolvePromise; // let assetSlots load it for real now
  loadingNow++; stats.loading = loadingNow;
  assetSlots.resolveOne(name).catch(() => {}).finally(() => { loadingNow--; stats.loading = loadingNow; stats.loaded++; });
}

export function initCharacterLOD({ camera, assetSlots, profile = 'full' }) { // 22 Nov owner: full-quality game first
  if (installed) return;
  installed = true;
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  Object.assign(LOD, LOD_PROFILES[q.get('charprofile') || profile] || LOD_PROFILES.full);
  const tiersOn = q.get('charlod') !== '0';
  if (assetSlots) deferCharacterLoads(assetSlots);
  const loop = () => {
    requestAnimationFrame(loop);
    if (tiersOn && entries.length) assign(camera);
    if (assetSlots && pending.length) {
      camera.getWorldPosition(camPos);
      for (let k = 0; k < LOD.LOAD_AT_ONCE; k++) loadNearest(assetSlots, tiersOn ? LOD.LOAD_RADIUS : Infinity);
    }
    stats.waiting = pending.length;
  };
  requestAnimationFrame(loop);
  if (typeof window !== 'undefined') window.__charLOD = { LOD, profile: q.get('charprofile') || profile, stats, entries: () => entries.map((e) => ({ name: e.root.name, dist: +e.dist.toFixed(1), tier: NAMES[e.tier] })), waiting: () => pending.map((p) => p.name) };
  if (!tiersOn) return;
  const update = THREE.AnimationMixer.prototype.update;
  THREE.AnimationMixer.prototype.update = function (dt) {
    let e = this.__charLOD;
    if (e === undefined) {
      if (!seen.has(this)) { seen.add(this); e = register(this); this.__charLOD = e || null; }
      else e = null;
    }
    if (!e) return update.call(this, dt);
    if (e.tier === FULL) { const t = dt + e.acc; e.acc = 0; stats.mixerUpdates++; return update.call(this, t); }
    if (e.tier === MID) {
      e.acc += dt;
      if (e.acc >= 1 / LOD.MID_HZ) { const t = e.acc; e.acc = 0; stats.mixerUpdates++; return update.call(this, t); }
      stats.mixerSkips++; return this;
    }
    // paused / hidden: time stands still for this character (it is not seen), no catch-up when it comes back
    e.acc = 0; stats.mixerSkips++; return this;
  };
}
