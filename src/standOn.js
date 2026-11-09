import * as THREE from 'three';
import { dipHeightRaw } from './dips.js';
import { pAdd } from './perfProbe.js';

/**
 * Feet on the ground (docs/PARALLEL.md G1). Every person and animal stands ON whatever is under it: the dug ground
 * of the pond / johad / canal (src/dips.js), the road and lane surfaces (which sit 1-8 cm proud of the ground plane,
 * with bumps), a chabutra, a plinth, a stool, a roof. Nothing here is a terrain system: it raycasts the real meshes
 * once a figure's surroundings are in the scene, so a raised floor that arrives later in a .glb is picked up too.
 *
 *   settleDy(scene, mesh, i)    how far to move a figure (mesh, or instance i of an InstancedMesh) so its lowest
 *                               feet touch the surface: the same measure tools/feet-check.js fails on.
 *   groundAt(scene, x, z, y)    surface height under one point (for things that walk every frame).
 *   keepOnGround(obj, fn, mv)   runs fn(scene) when obj is in a scene, again at 2, 6 and 15 s (late .glb floors),
 *                               and, with mv = true, whenever obj has moved 0.25 m (walkers).
 *
 * Figures never count as surfaces for one another (markFigure), nor do plants, cloth, water, vehicles or the player.
 */

const SKIP = /water|ripple|grass|tuft|crop|cane|reed|flower|foliage|canopy|leaf|bush|hedge|plant_|laundry|cloth|bunting|garland|flag|shadow|contact|dust|steam|smoke|sky|waypoint|glow|beam|halo|fire|rangoli|decal|people|capsule/i;
const SKIP_TOP = /^(npc_|vehicle_|player|trolley|sky|waypoint|placebatch)/;
const NOOK = /ride_nook_\d+_[a-z]+/g;
const BAND = 0.12; // feet = vertices within 12 cm (same band as tools/feet-check.js; 6 cm missed plinth and charpai edges) of the lowest point (hoof soles, the round bottom of a capsule)
const BUCKET = 0.08; // same buckets as tools/feet-check.js: 0.2 probed too few points and missed edges the check finds
const PROBE = 0.45; // rays start this far above the feet: steps up onto a chabutra or plinth, never a table overhead
const CELL = 8;

const FIGURES = new WeakSet();
export function markFigure(mesh) { FIGURES.add(mesh); return mesh; }

// ---------------------------------------------------------------- surface index (rebuilt at most once a second)
let index = null;
const boxCache = new WeakMap();
function topName(o) { let t = o; while (t.parent && !t.parent.isScene) t = t.parent; return t.name || ''; }
function shown(o) { for (let q = o; q; q = q.parent) { if (q.visible === false) return false; if (q.isScene) return true; } return false; }
function buildIndex(scene) {
  const _t = performance.now();
  const cells = new Map(), big = [];
  scene.updateMatrixWorld();
  scene.traverse((o) => {
    if (!o.isMesh || o.isBatchedMesh || FIGURES.has(o)) return;
    if (!shown(o)) return;
    const top = topName(o);
    if (top === 'ground' || SKIP_TOP.test(top)) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const nm = o.name.replace(NOOK, 'nook'), tn = top.replace(NOOK, 'nook'); // a nook's own name (laundry...) must not hide its charpai
    if (SKIP.test(nm) || SKIP.test(tn) || (mat && SKIP.test(mat.name || ''))) return;
    if (mat && mat.transparent && mat.opacity < 0.5) return;
    const e = o.matrixWorld.elements, stamp = e[12] + e[13] * 7 + e[14] * 13 + e[0] * 3;
    let c = boxCache.get(o);
    const gp = o.geometry && o.geometry.attributes.position, gn = gp ? gp.count : 0; // streamed meshes swap or refill geometry under one transform
    if (!c || c.stamp !== stamp || c.geo !== o.geometry || c.gn !== gn || c.ic !== o.count) { c = { stamp, geo: o.geometry, gn, ic: o.count, box: new THREE.Box3().setFromObject(o) }; boxCache.set(o, c); }
    const b = c.box;
    if (!isFinite(b.min.x)) return;
    const s = { o, b };
    const x0 = Math.floor(b.min.x / CELL), x1 = Math.floor(b.max.x / CELL), z0 = Math.floor(b.min.z / CELL), z1 = Math.floor(b.max.z / CELL);
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 64) { big.push(s); return; }
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const k = i * 100003 + j;
      let a = cells.get(k); if (!a) cells.set(k, (a = [])); a.push(s);
    }
  });
  index = { scene, cells, big, at: performance.now() };
  pAdd('standOn.buildIndex', performance.now() - _t);
}
const INDEX_MAX_AGE = 5000; // a full-scene traverse is a visible hitch: rebuild rarely, never from a per-frame caller
let inRun = false; // inside a scheduled settle run: runEntry already refreshed the index once, never again per ray
function getIndex(scene, fresh = false) {
  if (inRun) fresh = false;
  if (!index || index.scene !== scene || (fresh && performance.now() - index.at > INDEX_MAX_AGE)) buildIndex(scene);
  return index;
}

const _ray = new THREE.Raycaster();
_ray.layers.enableAll(); // place-batched source meshes sit on a hidden layer but are still the real geometry
const _down = new THREE.Vector3(0, -1, 0), _o = new THREE.Vector3();
const _cands = [];
let lastHit = null; // tools/feet-check diagnostics: the mesh groundAt last stood on
/** Height of the surface at (x, z) a figure with feet at footY stands on. */
export function groundAt(scene, x, z, footY = 0, fresh = true) {
  let best = dipHeightRaw(x, z);
  if (!scene) return best;
  const idx = getIndex(scene, fresh);
  const top = footY + PROBE;
  _cands.length = 0;
  const test = (s) => {
    const b = s.b;
    if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z || b.min.y > top || b.max.y < best - 0.01) return;
    _cands.push(s.o);
  };
  const a = idx.cells.get(Math.floor(x / CELL) * 100003 + Math.floor(z / CELL));
  if (a) for (const s of a) test(s);
  for (const s of idx.big) test(s);
  if (_cands.length) {
    _ray.set(_o.set(x, top, z), _down);
    _ray.far = top - best + 0.01;
    const hits = _ray.intersectObjects(_cands, false);
    if (hits.length && hits[0].point.y > best) { best = hits[0].point.y; lastHit = hits[0].object; } else lastHit = null;
  } else lastHit = null;
  return best;
}

// ---------------------------------------------------------------- feet of a figure
const bandCache = new WeakMap(); // geometry -> vertex indices of its bottom band, in its own frame
function bandOf(geo) {
  let b = bandCache.get(geo);
  if (b && b.count === geo.attributes.position.count) return b.idx;
  const p = geo.attributes.position;
  let min = Infinity;
  for (let k = 0; k < p.count; k++) min = Math.min(min, p.getY(k));
  const idx = [];
  for (let k = 0; k < p.count; k++) if (p.getY(k) <= min + BAND * 2) idx.push(k); // 2x: survives a non-unit y scale
  bandCache.set(geo, (b = { count: p.count, idx }));
  return idx;
}
const allCache = new WeakMap();
function allOf(geo) { let a = allCache.get(geo); if (!a) allCache.set(geo, (a = Array.from({ length: geo.attributes.position.count }, (_, k) => k))); return a; }
const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _v = new THREE.Vector3();
/** Vertical move that puts instance i (or the whole mesh, i < 0) on what is under its feet. */
export function settleDy(scene, mesh, i = -1) {
  mesh.updateWorldMatrix(true, false);
  _m.copy(mesh.matrixWorld);
  if (i >= 0) { mesh.getMatrixAt(i, _mi); _m.multiply(_mi); }
  const p = mesh.geometry.attributes.position;
  const tilt = Math.hypot(_m.elements[4], _m.elements[6]) / Math.hypot(_m.elements[4], _m.elements[5], _m.elements[6]) > 0.3;
  const idx = tilt ? allOf(mesh.geometry) : bandOf(mesh.geometry); // a lying figure rests on its side, not its feet
  let minY = Infinity;
  const pts = [];
  for (const k of idx) { _v.fromBufferAttribute(p, k).applyMatrix4(_m); pts.push(_v.x, _v.y, _v.z); if (_v.y < minY) minY = _v.y; }
  const buckets = new Map();
  for (let n = 0; n < pts.length; n += 3) {
    if (pts[n + 1] > minY + BAND) continue;
    const key = Math.round(pts[n] / BUCKET) * 100003 + Math.round(pts[n + 2] / BUCKET);
    const b = buckets.get(key);
    if (!b || pts[n + 1] < b[1]) buckets.set(key, [pts[n], pts[n + 1], pts[n + 2]]);
  }
  let clear = Infinity;
  const fp = _fp; fp.length = 0;
  for (const [x, y, z] of buckets.values()) { const c = y - groundAt(scene, x, z, minY); fp.push(x, z, c); clear = Math.min(clear, c); }
  return isFinite(clear) ? -clear : 0;
}
const _fp = []; // last settleDy footprint: x, z, clearance per foot bucket

/** A standing figure whose foot only clips the edge of a bench, plinth or charpai is slid off it (up to 30 cm), not hoisted onto
 *  the edge. Returns true when it moved instance i in x/z; the caller re-measures. */
const _inv = new THREE.Matrix4(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
function slideOffEdge(scene, mesh, i, dy, m) {
  const fp = _fp, n = fp.length / 3;
  if (n < 3) return false;
  let hx = 0, hz = 0, nh = 0, lx = 0, lz = 0, nl = 0;
  for (let k = 0; k < fp.length; k += 3) {
    if (-fp[k + 2] > dy - 0.03) { hx += fp[k]; hz += fp[k + 1]; nh++; } else { lx += fp[k]; lz += fp[k + 1]; nl++; }
  }
  if (!nl || nh * 2 > n) return false; // mostly on it: he stands or sits on it
  let dx = lx / nl - hx / nh, dz = lz / nl - hz / nh;
  const L = Math.hypot(dx, dz); if (L < 1e-4) return false;
  dx /= L; dz /= L;
  mesh.getMatrixAt(i, m);
  const x0 = m.elements[12], z0 = m.elements[14];
  _inv.copy(mesh.matrixWorld).invert();
  for (let step = 0.06; step <= 0.3001; step += 0.06) {
    _a.set(0, 0, 0).applyMatrix4(mesh.matrixWorld); _b.set(_a.x + dx * step, _a.y, _a.z + dz * step).applyMatrix4(_inv); _a.applyMatrix4(_inv);
    m.elements[12] = x0 + _b.x - _a.x; m.elements[14] = z0 + _b.z - _a.z;
    mesh.setMatrixAt(i, m);
    const d2 = settleDy(scene, mesh, i);
    let spread = 0; for (let k = 0; k < _fp.length; k += 3) spread = Math.max(spread, _fp[k + 2] + d2); // highest foot above its surface, once the lowest touches
    if (d2 < dy - 0.03 && spread <= 0.03) return true;
  }
  m.elements[12] = x0; m.elements[14] = z0; mesh.setMatrixAt(i, m); // nothing clear within 30 cm: leave it for the lift
  return false;
}

/** Settle every instance of a capsule-people InstancedMesh onto its surface; pass refresh(mesh) to re-copy a place batch. */
let pending = false; // set when a sliced settle ran out of its time budget: the scheduler calls it again next frame
let SLICE_MS = 3;
export function settleInstances(scene, mesh, refresh) {
  const m = new THREE.Matrix4();
  const deadline = performance.now() + SLICE_MS;
  let i = mesh.userData._settleAt || 0;
  for (; i < mesh.count; i++) {
    if (performance.now() > deadline) break;
    let dy = settleDy(scene, mesh, i);
    if (dy > 0.05 && Math.abs(dy) <= 0.6 && slideOffEdge(scene, mesh, i, dy, m)) dy = settleDy(scene, mesh, i);
    if (Math.abs(dy) < 0.005 || Math.abs(dy) > 0.6) continue;
    mesh.getMatrixAt(i, m);
    m.elements[13] += dy; // parents only turn about Y, so a world dy is a local dy
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (refresh) refresh(mesh);
  if (i < mesh.count) { mesh.userData._settleAt = i; pending = true; } else mesh.userData._settleAt = 0;
}
/** For hand-written settle loops: true when the time slice is spent; the loop resumes at the returned cursor next frame. */
export function sliceSpent(deadline) { if (performance.now() > deadline) { pending = true; return true; } return false; }
export { sceneOf };

// ---------------------------------------------------------------- scheduler (own rAF, so no main.js hook)
const ENTRIES = [];
const STAGES = [0, 3000, 10000, 20000, 30000, 40000, 50000, 60000, 75000, 90000]; // re-settle every ~10 s for 90 s as zone models stream in; 40 s: road strip chunks stream in late and sit 3 cm above the dips ground
function sceneOf(o) { for (let q = o; q; q = q.parent) if (q.isScene) return q; return null; }
function runEntry(e, scene, now) {
  const _r = performance.now();
  pending = false;
  // One index refresh per stage, here, never per ray: on a slow frame (1 fps test browser) every ray found the index >5 s old
  // and re-traversed the whole scene, so each 3 ms slice settled ONE figure and most entries never left stage 0 (feet-check 73 fails).
  if (!e.again) getIndex(scene, true);
  inRun = true;
  try { e.fn(scene); } catch (err) { console.error('standOn settle failed', err); } finally { inRun = false; }
  const _d = performance.now() - _r;
  if (_d > 40 && typeof window !== 'undefined') (window.__standOnSlow = window.__standOnSlow || []).push([e.obj.name || e.obj.type, e.stage, Math.round(_d)]);
  e.lx = e.obj.position.x; e.lz = e.obj.position.z;
  if (!e.t0) e.t0 = now;
  if (pending) { e.again = true; return; } // unfinished: same stage again next frame
  e.again = false;
  e.stage++;
}
// Load-time (docs/perf-2026-11-08.md): the settle raycasts are ~10 s of main thread under the 4G/4x test, all before Play.
// Nothing needs feet settled until the title is gone, so the scheduler idles until ui.js says the opening view is ready.
let held = true;
let releasedAt = 0;
export function releaseSettling() { if (held) releasedAt = performance.now(); held = false; }
export function settlingReleased() { return !held; }
/** True once `frames` rendered frames have passed since the opening view, OR n x 100 ms of wall clock. Lazy builds gated on
 * frames alone land ~n seconds late on a 1 fps machine (the test browser), after the collider list was last checked. */
export function lazyDue(frames, n) { return frames > n || (!held && performance.now() - releasedAt > n * 100); }
let rr = 0, lastTick = 0; // round-robin cursor: every entry gets its turn, early ones (npc_postmaster, bazaar_life) were starved
function tick() {
  if (held) { if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(tick); return; }
  const now = performance.now();
  const _t = now;
  // Time budget, scaled to the frame: 4 ms at 60 fps, up to 15% of a slow frame (a 1 fps test browser still settles everything).
  const frame = lastTick ? Math.min(1000, now - lastTick) : 16;
  lastTick = now;
  const budgetMs = Math.max(4, frame * 0.15);
  const N = ENTRIES.length;
  for (let k = 0; k < N && ENTRIES.length; k++) {
    if (performance.now() - _t > budgetMs) break;
    if (rr >= ENTRIES.length) rr = 0;
    const n = rr++;
    const e = ENTRIES[n];
    const scene = sceneOf(e.obj);
    if (!scene) { if (e.stage > 0 && !e.obj.parent && ++e.orphan > 600) { ENTRIES.splice(n, 1); rr--; } continue; }
    e.orphan = 0;
    const due = e.again || (e.stage < STAGES.length && now - (e.t0 || now) >= STAGES[e.stage]);
    const moved = e.moving && e.stage > 0 && now - (e.lastRun || 0) > 400 && Math.hypot(e.obj.position.x - e.lx, e.obj.position.z - e.lz) > 0.25;
    if (due || moved) { e.lastRun = now; runEntry(e, scene, now); }
  }
  pAdd('standOn.tick', performance.now() - _t);
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(tick);
}
let started = false;
/** fn(scene) puts obj on the ground; run when obj is first in a scene, at 2 / 6 / 15 s, and on moving if `moving`. */
export function keepOnGround(obj, fn, moving = false) {
  ENTRIES.push({ obj, fn, moving, stage: 0, t0: 0, lx: 0, lz: 0, orphan: 0 });
  if (!started && typeof requestAnimationFrame !== 'undefined') { started = true; requestAnimationFrame(tick); }
}

// tools/feet-check.js settles everything at once (same code path as the timers, without waiting for them).
if (typeof window !== 'undefined') {
  window.__standOn = {
    settleAll() {
      index = null;
      const now = performance.now();
      let n = 0;
      const was = SLICE_MS; SLICE_MS = 1e9; // a test settle runs every figure to the end, not one 3 ms slice
      try { for (const e of ENTRIES) { const s = sceneOf(e.obj); if (s) { runEntry(e, s, now); n++; } } } finally { SLICE_MS = was; }
      return n;
    },
    count: () => ENTRIES.length,
    state: () => ENTRIES.map((e) => [e.obj.name || e.obj.type, e.stage, !!e.again, e.t0 ? Math.round(performance.now() - e.t0) : -1, !!sceneOf(e.obj)]),
    settleDy, groundAt, // tools/feet-check diagnostics
    lastHit: () => lastHit,
    indexed(o) { const idx = index; if (!idx) return 'no index'; for (const a of idx.cells.values()) for (const s of a) if (s.o === o) return 'cell'; for (const s of idx.big) if (s.o === o) return 'big'; return FIGURES.has(o) ? 'figure' : 'absent'; },
  };
}
