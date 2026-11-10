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
let indexGen = 0;
function buildIndex(scene) {
  const _t = performance.now();
  const cells = new Map(), big = [];
  const first = !index || index.scene !== scene, fresh = [];
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
    const e = o.matrixWorld.elements; let stamp = 0; for (let q = 0; q < 16; q++) stamp += e[q] * (q * 2 + 1); // any move, turn or scale rebuilds its box and triangle grid
    let c = boxCache.get(o);
    const gp = o.geometry && o.geometry.attributes.position, gn = gp ? gp.count : 0; // streamed meshes swap or refill geometry under one transform
    if (!c || c.stamp !== stamp || c.geo !== o.geometry || c.gn !== gn || c.ic !== o.count) { c = { stamp, geo: o.geometry, gn, ic: o.count, box: new THREE.Box3().setFromObject(o), seen: performance.now() }; boxCache.set(o, c); }
    const b = c.box;
    if (!isFinite(b.min.x)) return;
    if (c.gen !== indexGen) fresh.push(b); // not in the last index: a new or changed surface (a zone .glb swapped in, a house shown again), so figures over it settle again
    c.gen = indexGen + 1;
    const s = { o, b, stamp };
    noteStatic(o, top);
    const x0 = Math.floor(b.min.x / CELL), x1 = Math.floor(b.max.x / CELL), z0 = Math.floor(b.min.z / CELL), z1 = Math.floor(b.max.z / CELL);
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 64) { big.push(s); return; }
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const k = i * 100003 + j;
      let a = cells.get(k); if (!a) cells.set(k, (a = [])); a.push(s);
    }
  });
  index = { scene, cells, big, at: performance.now() };
  if (!first) for (const e of ENTRIES) if (e.fb && e.stage > 0) for (const b of fresh) {
    if (b.max.x < e.fb[0] - 0.3 || b.min.x > e.fb[1] + 0.3 || b.max.z < e.fb[2] - 0.3 || b.min.z > e.fb[3] + 0.3) continue;
    e.redo = true; break;
  }
  if (typeof window !== 'undefined') { const w = (window.__standOnIdx = window.__standOnIdx || { n: 0, ms: 0, fresh: 0 }); w.n++; w.ms += performance.now() - _t; w.fresh += first ? 0 : fresh.length; }
  indexGen++;
  pAdd('standOn.buildIndex', performance.now() - _t);
}
const INDEX_MAX_AGE = 5000; // a full-scene traverse is a visible hitch: rebuild rarely, never from a per-frame caller
let inRun = false; // inside a scheduled settle run: runEntry already refreshed the index once, never again per ray
function getIndex(scene, fresh = false) {
  if (inRun) fresh = false;
  if (!index || index.scene !== scene || (fresh && performance.now() - index.at > INDEX_MAX_AGE)) buildIndex(scene);
  return index;
}

// ---------------------------------------------------------------- vertical-ray triangle grid (D2, 9 Nov)
// A THREE.Raycaster ray tests every triangle of a mesh: 25-50 ms per ray against the merged village / place meshes, ~1 s per
// capsule (20 foot buckets), so the settle scheduler never left stage 0 for most entries (feet-check 74-78 fails, all
// "again" at stage 0 after 200 s). Every ray here is straight down, so each surface mesh gets a lazily built world-space
// xz grid of its triangles (1 m cells) and a ray tests only the few triangles in its cell. Same answer as the raycaster:
// same material side culling (front faces only for FrontSide), same groups / draw range, instances included.
const GCELL = 1;
const gridCache = new WeakMap();
const _gm = new THREE.Matrix4(), _gi = new THREE.Matrix4(), _ga = new THREE.Vector3(), _gb = new THREE.Vector3(), _gc = new THREE.Vector3();
function gridOf(o, stamp) {
  const geo = o.geometry, pos = geo && geo.attributes.position;
  if (!pos) return null;
  const index = geo.index;
  const ver = (o.isInstancedMesh ? o.instanceMatrix.version * 1e6 + o.count : 0) + pos.version * 7 + (index ? index.version * 13 : 0);
  let g = gridCache.get(o);
  if (g && g.stamp === stamp && g.geo === geo && g.n === pos.count && g.ver === ver) return g;
  // A version bump is not a change: the abadi rows re-upload their instance matrices on every visibility refresh and the
  // staged place models re-flag their buffers, so version-keyed grids were rebuilt ~4000 times in 45 s (11 s of the settle
  // budget on the far abadi rows alone, D2 9 Nov) and the crowds never finished a stage. Same contents: keep the grid.
  const sum = contentSum(o, pos, index);
  if (g && g.stamp === stamp && g.geo === geo && g.n === pos.count && g.sum === sum) { g.ver = ver; return g; }
  const _why = !g ? 'new' : g.stamp !== stamp ? 'stamp' : g.geo !== geo ? 'geo' : g.n !== pos.count ? 'n' : 'ver';
  if (typeof window !== 'undefined' && window.__standOnGridWhy) { const W = window.__standOnGridWhy, k = topName(o) + '/' + o.name + ':' + _why; W[k] = (W[k] || 0) + 1; }
  const _t = performance.now();
  const mats = o.material;
  const ranges = []; // [start, end, side] in index (or vertex) units
  const cnt = index ? index.count : pos.count, dr = geo.drawRange;
  if (Array.isArray(mats)) {
    for (const gr of geo.groups) {
      const m = mats[gr.materialIndex]; if (!m) continue;
      ranges.push([Math.max(gr.start, dr.start), Math.min(cnt, gr.start + gr.count, dr.start + dr.count), m.side]);
    }
  } else if (mats) ranges.push([Math.max(0, dr.start), Math.min(cnt, dr.start + dr.count), mats.side]);
  const verts = [], cells = new Map(), srcv = []; // srcv: first vertex index of each triangle (static settle masks its own prop's faces)
  const ninst = o.isInstancedMesh ? o.count : 1;
  for (let k = 0; k < ninst; k++) {
    _gm.copy(o.matrixWorld);
    if (o.isInstancedMesh) { o.getMatrixAt(k, _gi); _gm.multiply(_gi); }
    const flip = _gm.determinant() < 0 ? -1 : 1;
    for (const [s, e, side] of ranges) {
      for (let j = s; j + 2 < e; j += 3) {
        const ia = index ? index.getX(j) : j, ib = index ? index.getX(j + 1) : j + 1, ic = index ? index.getX(j + 2) : j + 2;
        _ga.fromBufferAttribute(pos, ia).applyMatrix4(_gm); _gb.fromBufferAttribute(pos, ib).applyMatrix4(_gm); _gc.fromBufferAttribute(pos, ic).applyMatrix4(_gm);
        const ny = ((_gb.z - _ga.z) * (_gc.x - _ga.x) - (_gb.x - _ga.x) * (_gc.z - _ga.z)) * flip; // (b-a)x(c-a).y, in the mesh's own winding
        if (ny === 0 || (side === THREE.FrontSide && ny < 0) || (side === THREE.BackSide && ny > 0)) continue; // a ray straight down only hits these faces
        const id = verts.length / 9;
        srcv.push(ia);
        verts.push(_ga.x, _ga.y, _ga.z, _gb.x, _gb.y, _gb.z, _gc.x, _gc.y, _gc.z);
        const x0 = Math.floor(Math.min(_ga.x, _gb.x, _gc.x) / GCELL), x1 = Math.floor(Math.max(_ga.x, _gb.x, _gc.x) / GCELL);
        const z0 = Math.floor(Math.min(_ga.z, _gb.z, _gc.z) / GCELL), z1 = Math.floor(Math.max(_ga.z, _gb.z, _gc.z) / GCELL);
        for (let i = x0; i <= x1; i++) for (let q = z0; q <= z1; q++) {
          const key = i * 100003 + q;
          let a = cells.get(key); if (!a) cells.set(key, (a = [])); a.push(id);
        }
      }
    }
  }
  g = { stamp, geo, n: pos.count, ver, sum, v: new Float32Array(verts), cells, src: o.isInstancedMesh ? null : Int32Array.from(srcv) };
  gridCache.set(o, g);
  pAdd('standOn.grid', performance.now() - _t);
  if (typeof window !== 'undefined' && window.__standOnGridLog) { const L = window.__standOnGridLog, k = topName(o) + '/' + o.name; const r = L[k] || (L[k] = [0, 0, 0]); r[0]++; r[1] += performance.now() - _t; r[2] = verts.length / 9; }
  return g;
}
/** Cheap fingerprint of what a grid was built from: every live instance matrix in full, ~512 sampled position / index values. */
function contentSum(o, pos, index) {
  let s = 0;
  if (o.isInstancedMesh) { const a = o.instanceMatrix.array, n = o.count * 16; for (let k = 0; k < n; k++) s += a[k] * ((k % 61) + 1); s += o.count * 1e-3; }
  const pa = pos.array, ps = Math.max(1, Math.floor(pa.length / 512));
  for (let k = 0; k < pa.length; k += ps) s += pa[k] * ((k % 53) + 1) * 1e-2;
  if (index) { const ia = index.array, is = Math.max(1, Math.floor(ia.length / 512)); for (let k = 0; k < ia.length; k += is) s += ia[k] * ((k % 47) + 1) * 1e-4; }
  return s;
}
/** Highest y of o's downward-facing-ray triangles at (x, z) within [lo, hi], or -Infinity. */
function gridHit(o, stamp, x, z, lo, hi) {
  const g = gridOf(o, stamp);
  if (!g) return -Infinity;
  const ids = g.cells.get(Math.floor(x / GCELL) * 100003 + Math.floor(z / GCELL));
  if (!ids) return -Infinity;
  const v = g.v;
  const mask = SELF && g.src ? SELF.get(o) : null; // a static prop being settled never stands on its own faces
  let best = -Infinity;
  for (const id of ids) {
    if (mask && mask[g.src[id]] === SELF_ID) continue;
    const p = id * 9;
    const ax = v[p], ay = v[p + 1], az = v[p + 2], bx = v[p + 3], by = v[p + 4], bz = v[p + 5], cx = v[p + 6], cy = v[p + 7], cz = v[p + 8];
    if (Math.max(ay, by, cy) < lo || Math.min(ay, by, cy) > hi) continue;
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (d === 0) continue;
    const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d;
    if (l1 < -1e-7) continue;
    const l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
    if (l2 < -1e-7 || l1 + l2 > 1 + 1e-7) continue;
    const y = l1 * ay + l2 * by + (1 - l1 - l2) * cy;
    if (y >= lo && y <= hi && y > best) best = y;
  }
  return best;
}

const _cands = [];
let lastHit = null; // tools/feet-check diagnostics: the mesh groundAt last stood on
/** Height of the surface at (x, z) a figure with feet at footY stands on. */
export function groundAt(scene, x, z, footY = 0, fresh = true) {
  let best = dipHeightRaw(x, z);
  if (!scene) return best;
  const fb = curEntry && curEntry.fb; // inside a scheduled settle: grow that entry's feet box (src/standOn.js redo)
  if (fb) { if (x < fb[0]) fb[0] = x; if (x > fb[1]) fb[1] = x; if (z < fb[2]) fb[2] = z; if (z > fb[3]) fb[3] = z; }
  const idx = getIndex(scene, fresh);
  const top = footY + PROBE;
  _cands.length = 0;
  const test = (s) => {
    const b = s.b;
    if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z || b.min.y > top || b.max.y < best - 0.01) return;
    _cands.push(s);
  };
  const a = idx.cells.get(Math.floor(x / CELL) * 100003 + Math.floor(z / CELL));
  if (a) for (const s of a) test(s);
  for (const s of idx.big) test(s);
  lastHit = null;
  const lo = best - 0.01; // the raycaster's far limit: top - best + 0.01 below the probe
  let hit = -Infinity;
  for (const s of _cands) {
    const y = gridHit(s.o, s.stamp, x, z, lo, top);
    if (y > hit) { hit = y; if (y > best) lastHit = s.o; }
  }
  if (hit > best) best = hit;
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
    // A foot on a sloped or lumpy surface (hay, tyre, pump base) only sees 45 cm above it per probe: settle again until it stops moving.
    for (let it = 0; it < 4; it++) {
      const d2 = settleDy(scene, mesh, i);
      if (Math.abs(d2) < 0.005 || Math.abs(d2) > 0.6) break;
      mesh.getMatrixAt(i, m); m.elements[13] += d2; mesh.setMatrixAt(i, m);
    }
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
  if (!e.again) { getIndex(scene, true); e.fb = [Infinity, -Infinity, Infinity, -Infinity]; e.redo = false; }
  inRun = true; curEntry = e; // settleDy grows e.fb (the feet's xz box): a surface that later lands inside it re-runs this entry
  try { e.fn(scene); } catch (err) { console.error('standOn settle failed', err); } finally { inRun = false; curEntry = null; }
  const _d = performance.now() - _r;
  if (_d > 40 && typeof window !== 'undefined') (window.__standOnSlow = window.__standOnSlow || []).push([e.obj.name || e.obj.type, e.stage, Math.round(_d)]);
  e.lx = e.obj.position.x; e.lz = e.obj.position.z;
  if (!e.t0) e.t0 = now;
  if (pending) { e.again = true; return; } // unfinished: same stage again next frame
  e.again = false;
  if (!e.redoRun) e.stage++;
  e.redoRun = false;
}
let curEntry = null;
// Load-time (docs/perf-2026-11-08.md): the settle raycasts are ~10 s of main thread under the 4G/4x test, all before Play.
// Nothing needs feet settled until the title is gone, so the scheduler idles until ui.js says the opening view is ready.
let held = true;
let releasedAt = 0;
export function releaseSettling() { if (held) releasedAt = performance.now(); held = false; }
export function settlingReleased() { return !held; }
/** True once `frames` rendered frames have passed since the opening view, OR n x 100 ms of wall clock. Lazy builds gated on
 * frames alone land ~n seconds late on a 1 fps machine (the test browser), after the collider list was last checked. */
export function lazyDue(frames, n) { return frames > n || (!held && performance.now() - releasedAt > n * 100); }
const REFRESH_MS = 4000;
let rr = 0, lastTick = 0; // round-robin cursor: every entry gets its turn, early ones (npc_postmaster, bazaar_life) were starved
function tick() {
  if (held) { if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(tick); return; }
  const now = performance.now();
  // Time budget, scaled to the frame: 4 ms at 60 fps, up to 15% of a slow frame (a 1 fps test browser still settles everything).
  const frame = lastTick ? Math.min(1000, now - lastTick) : 16;
  lastTick = now;
  const budgetMs = Math.max(4, frame * 0.15);
  // Surfaces that stream in after a figure's last timed stage (a house zone built when the player rides near) were never seen:
  // refresh the index every few seconds; buildIndex flags the entries whose feet a new surface covers (e.redo).
  if (index && index.scene && now - index.at > REFRESH_MS) buildIndex(index.scene);
  const _t = performance.now(); // the ~150 ms index rebuild above is not part of the settle budget: counted, it ate the whole slice on slow frames and entries sat at stage 2-4 after 60 s (feet-check 2-5 sunk)
  const N = ENTRIES.length;
  for (let k = 0; k < N && ENTRIES.length; k++) {
    if (performance.now() - _t > budgetMs) break;
    if (rr >= ENTRIES.length) rr = 0;
    const n = rr++;
    const e = ENTRIES[n];
    const scene = sceneOf(e.obj);
    if (!scene) { if (e.stage > 0 && !e.obj.parent && ++e.orphan > 600) { ENTRIES.splice(n, 1); rr--; } continue; }
    e.orphan = 0;
    const stageDue = e.stage < STAGES.length && now - (e.t0 || now) >= STAGES[e.stage];
    // Stages past 10 s only matter if a surface landed under the feet since the last run, and buildIndex already flags that (e.redo):
    // re-running ~110 entries x 7 late stages starved the scheduler on slow frames (entries still at stage 2 after 50 s, feet-check 5-74 off).
    if (stageDue && !e.again && !e.redo && e.stage >= 3 && e.stage !== 5 && !e.moving) { e.stage++; continue; } // stage 5 (40 s) always runs: a surface that landed under the feet unflagged (feet-check: 4 stale) is caught here
    const due = e.again || stageDue || e.redo;
    if (due && !e.again && !stageDue) e.redoRun = true; // a new surface under its feet, outside the timed stages
    const moved = e.moving && e.stage > 0 && now - (e.lastRun || 0) > 400 && Math.hypot(e.obj.position.x - e.lx, e.obj.position.z - e.lz) > 0.25;
    if (due || moved) { e.lastRun = now; SLICE_MS = Math.max(3, budgetMs / 4); runEntry(e, scene, now); SLICE_MS = 3; } // a 1 fps browser gives each entry a quarter of its 15% budget, not 3 ms: 60 frames x 3 ms never finished a 50-person mesh (feet-check 9 stuck at stage 3, again)
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

// ---------------------------------------------------------------- static props (G2, 10 Nov: "some pots were sunken, a cart was sunken")
// Props are built at y = 0 (or a hand-typed height), but the surface under them is not always 0: road and lane strips sit 1-8 cm
// proud of the ground plane, chabutras and plinths more, and the pond / johad / canal banks are dug below it (src/dips.js). Every
// static prop mesh (the same set tools/ground-check.js measures) is split into connected pieces, touching pieces are grouped into one
// rigid prop (a cart and its wheels, a matka stack and its plank), and each group is moved straight up or down onto the surface
// under its lowest points, on the same time-sliced scheduler (and the same re-runs as zone .glb floors stream in) as the figures.
// Only the prop's own faces are ignored as ground; everything else (a plinth, a stool in another mesh, the road) is a surface.
const STATIC_SKIP_TOP = /^(ground|sky|npc_|vehicle_|player|trolley|jeep|waypoint|placebatch|place_batches|place_boards_batch|contact_shadows|hero_zone|shops$|bazaar_row|arm_frontage_houses|main_road_frontage_houses|map_wall|background_houses|village_kit_houses|village_static_merged|blender_|canal|pond|johad|roof_|field|vegetation|trees|flowering_plants|place_|trim|material_board|ration_shop|tv_house|panchayat|temple_area|chaupal|banta_shop|tripo_|switchboard|wayfinding|map_gates|mapCompound|sugarcane|houses_kit|ambient_life)/i;
const PORTABLE = /pot|matka|ghada|surahi|kulhad|terracotta|ceramic|cart|thela|rehri|icecream|sack|jute|crate|drum|bucket|charpai|stool|bench|cycle|scooter|trough|basket/i;
const ISLAND_MAX = 3.2, CLUSTER_MAX = 4.2; // bigger pieces are buildings, roads, platforms: surfaces, never moved
const SINK_ANY = 0.12, SINK_PORTABLE = 0.2, FLOAT_MAX = 0.08, DIP_FLOAT_MAX = 1.6, DIP_WATERLINE = -0.33;
const STATIC_TOPS = new WeakSet(), STATIC_LIST = [];
let SELF = null, SELF_ID = 0; // groundAt ignores triangles whose vertex mask === SELF_ID (the prop being settled)
const staticStats = { tops: 0, clusters: 0, moved: 0, lifted: 0, lowered: 0, maxLift: 0, maxDrop: 0, skippedShared: 0, log: [] };
function staticMesh(o, top) {
  if (!o.isMesh || o.isInstancedMesh || o.isBatchedMesh || FIGURES.has(o) || o.userData.noSettle) return false;
  if (o.userData.propBucket) return true; // the village merge's ground-clutter buckets (src/mergeUtils.js): pots, charpais, crates
  if (STATIC_SKIP_TOP.test(top)) return false;
  const g = o.geometry, p = g && g.attributes.position;
  return !!p && p.count <= 200000 && g.type !== 'CapsuleGeometry';
}
function noteStatic(o, top) {
  if (!staticMesh(o, top) || (typeof window !== 'undefined' && window.__noStaticSettle)) return; // __noStaticSettle: before/after proof shots
  let t = o; while (t.parent && !t.parent.isScene) t = t.parent;
  if (STATIC_TOPS.has(t)) return;
  STATIC_TOPS.add(t); staticStats.tops++; STATIC_LIST.push(new WeakRef(t));
  keepOnGround(t, (sc) => settleStatic(sc, t));
}
/** Connected pieces of a geometry by its index (no weld: flat-shaded faces come out as separate pieces and are joined again by the
 *  touching-box grouping below). Cached per geometry. */
const pieceCache = new WeakMap();
function piecesOf(geo) {
  const pos = geo.attributes.position, n = pos.count;
  let c = pieceCache.get(geo);
  if (c && c.n === n) return c.list;
  const parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  const ix = geo.index ? geo.index.array : null, m = ix ? ix.length : n - (n % 3);
  for (let i = 0; i + 2 < m; i += 3) {
    const a = find(ix ? ix[i] : i), b = find(ix ? ix[i + 1] : i + 1), d = find(ix ? ix[i + 2] : i + 2);
    if (a !== b) parent[a] = b;
    const r = find(b); if (r !== d) parent[d] = r;
  }
  const map = new Map(), cnt = new Int32Array(n);
  for (let i = 0; i < n; i++) { const r = find(i); parent[i] = r; cnt[r]++; }
  const list = [];
  for (let i = 0; i < n; i++) { const r = parent[i]; let a = map.get(r); if (!a) { a = new Int32Array(cnt[r]); a.k = 0; map.set(r, a); list.push(a); } a[a.k++] = i; }
  pieceCache.set(geo, (c = { n, list }));
  return list;
}
const geoOwner = new WeakMap(); // geometry -> the one mesh allowed to edit it (shared geometry moves the mesh instead, or not at all)
const sstate = new WeakMap(); // top -> resumable run state
const _sv = new THREE.Vector3();
function settleStatic(scene, top) {
  const deadline = performance.now() + SLICE_MS;
  let st = sstate.get(top);
  if (!st || !curEntry || !curEntry.again) { // a fresh run: list the prop meshes again (pots and models arrive late, zones re-stream)
    const meshes = [];
    top.updateWorldMatrix(true, true);
    top.traverse((o) => {
      if (!staticMesh(o, top.name || '') || !shown(o)) return;
      const nm = o.name.replace(NOOK, 'nook'), mat = Array.isArray(o.material) ? o.material[0] : o.material;
      if (SKIP.test(nm) || (mat && (SKIP.test(mat.name || '') || (mat.transparent && mat.opacity < 0.5)))) return;
      const e = o.matrixWorld.elements;
      if (Math.abs(e[4]) > 1e-3 * Math.abs(e[5]) || Math.abs(e[6]) > 1e-3 * Math.abs(e[5])) return; // tilted frame: a world dy is not a local dy
      const own = geoOwner.get(o.geometry);
      if (own && own !== o) { o.userData._sharedGeo = true; }
      else geoOwner.set(o.geometry, o);
      meshes.push(o);
    });
    st = { meshes, mi: 0, pieces: [], clusters: null, ci: 0, dirty: new Set() };
    sstate.set(top, st);
  }
  // 1. small pieces near the ground, with world boxes
  for (; st.mi < st.meshes.length; st.mi++) {
    if (st.mi > 0 && sliceSpent(deadline)) return;
    const o = st.meshes[st.mi], pos = o.geometry.attributes.position, e = o.matrixWorld.elements;
    for (const vs of piecesOf(o.geometry)) {
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      for (let k = 0; k < vs.length; k++) {
        _sv.fromBufferAttribute(pos, vs[k]).applyMatrix4(o.matrixWorld);
        if (_sv.x < x0) x0 = _sv.x; if (_sv.x > x1) x1 = _sv.x; if (_sv.y < y0) y0 = _sv.y; if (_sv.y > y1) y1 = _sv.y; if (_sv.z < z0) z0 = _sv.z; if (_sv.z > z1) z1 = _sv.z;
      }
      if (y0 > 1.0 || y0 < -1.7 || x1 - x0 > ISLAND_MAX || z1 - z0 > ISLAND_MAX || y1 - y0 > ISLAND_MAX) continue;
      st.pieces.push({ o, vs, b: [x0, y0, z0, x1, y1, z1], e5: e[5] });
    }
  }
  // 2. touching pieces (boxes within 1 cm, any mesh of this top) are one rigid prop
  if (!st.clusters) {
    const P = st.pieces, n = P.length, parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const grid = new Map(), E = 0.01;
    P.forEach((p, i) => {
      const b = p.b;
      for (let gx = Math.floor((b[0] - E)); gx <= Math.floor(b[3] + E); gx++) for (let gz = Math.floor(b[2] - E); gz <= Math.floor(b[5] + E); gz++) {
        const key = gx * 100003 + gz; let a = grid.get(key); if (!a) grid.set(key, (a = []));
        for (const j of a) { const c = P[j].b; if (b[0] - E <= c[3] && b[3] + E >= c[0] && b[1] - E <= c[4] && b[4] + E >= c[1] && b[2] - E <= c[5] && b[5] + E >= c[2]) { const ra = find(i), rb = find(j); if (ra !== rb) parent[ra] = rb; } }
        a.push(i);
      }
    });
    const by = new Map();
    for (let i = 0; i < n; i++) { const r = find(i); let a = by.get(r); if (!a) by.set(r, (a = [])); a.push(P[i]); }
    st.clusters = [];
    for (const list of by.values()) {
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const p of list) { x0 = Math.min(x0, p.b[0]); y0 = Math.min(y0, p.b[1]); z0 = Math.min(z0, p.b[2]); x1 = Math.max(x1, p.b[3]); z1 = Math.max(z1, p.b[5]); }
      if (x1 - x0 > CLUSTER_MAX || z1 - z0 > CLUSTER_MAX || y0 > 0.6) continue;
      st.clusters.push({ list, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 });
    }
    staticStats.clusters += st.clusters.length;
  }
  // 3. each prop onto the surface under its lowest points
  for (; st.ci < st.clusters.length; st.ci++) {
    if (st.ci > 0 && sliceSpent(deadline)) return;
    settleCluster(scene, st.clusters[st.ci], st.dirty);
  }
  for (const o of st.dirty) {
    const g = o.geometry;
    if (!o.userData._movedWhole) { g.attributes.position.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere(); }
    gridCache.delete(o); boxCache.delete(o);
    if (o.userData.placeBatched && refreshBatched) refreshBatched(o);
  }
  st.dirty.clear();
}
let refreshBatched = null;
/** src/placeBatch.js hands in its re-upload, so a settled prop that draws through a shared batch shows its new height (no import cycle). */
export function setBatchedRefresh(fn) { refreshBatched = fn; }
const _cfp = [];
function clusterClear(scene, c) {
  let minY = Infinity;
  for (const p of c.list) if (p.b[1] < minY) minY = p.b[1];
  const buckets = new Map();
  for (const p of c.list) {
    if (p.b[1] > minY + BAND) continue;
    const pos = p.o.geometry.attributes.position, mw = p.o.matrixWorld;
    for (let k = 0; k < p.vs.length; k++) {
      _sv.fromBufferAttribute(pos, p.vs[k]).applyMatrix4(mw);
      if (_sv.y > minY + BAND) continue;
      const key = Math.round(_sv.x / BUCKET) * 100003 + Math.round(_sv.z / BUCKET);
      const b = buckets.get(key);
      if (!b || _sv.y < b[1]) buckets.set(key, [_sv.x, _sv.y, _sv.z]);
    }
  }
  let all = [...buckets.values()];
  if (all.length > 32) { const step = all.length / 32; all = Array.from({ length: 32 }, (_, i) => all[Math.floor(i * step)]); }
  let clear = Infinity; _cfp.length = 0;
  for (const [x, y, z] of all) { const c2 = y - groundAt(scene, x, z, minY, false); _cfp.push(c2); if (c2 < clear) clear = c2; }
  return isFinite(clear) ? clear : 0;
}
function settleCluster(scene, c, dirty) {
  const masks = new Map();
  SELF_ID++; // a fresh id per prop: marks left by earlier props never match (Int32, never wraps in a session)
  for (const p of c.list) {
    let m = p.o.userData._selfMask;
    const n = p.o.geometry.attributes.position.count;
    if (!m || m.length !== n) m = p.o.userData._selfMask = new Int32Array(n);
    for (let k = 0; k < p.vs.length; k++) m[p.vs[k]] = SELF_ID;
    masks.set(p.o, m);
  }
  SELF = masks;
  try {
    const portable = c.list.some((p) => { const mat = Array.isArray(p.o.material) ? p.o.material[0] : p.o.material; return PORTABLE.test(p.o.name) || PORTABLE.test((mat && mat.name) || '') || PORTABLE.test(topName(p.o)); });
    const inDip = dipHeightRaw(c.cx, c.cz) < -0.02;
    let total = 0;
    for (let it = 0; it < 3; it++) {
      const clear = clusterClear(scene, c);
      let dy = 0;
      if (clear < -0.005 && -clear <= (portable ? SINK_PORTABLE : SINK_ANY) && -clear < PROBE - 0.02) dy = -clear; // a hit at the probe limit is a shelf or plinth over the prop, not the ground it sinks into
      else if (clear > 0.005 && (clear <= FLOAT_MAX || (inDip && clear <= DIP_FLOAT_MAX && (Math.min(...c.list.map((p) => p.b[1])) - clear) > DIP_WATERLINE))) dy = -clear;
      if (!dy || (dy > 0 && total + dy > SINK_PORTABLE)) break; // stacked lifts mean a ledge above, not ground
      if (!moveCluster(c, dy, dirty)) break;
      if (dy > 0) total += dy;
      if (it === 0) { staticStats.moved++; if (dy > 0) staticStats.lifted++; else staticStats.lowered++; if (staticStats.log.length < 400) staticStats.log.push([topName(c.list[0].o), c.list[0].o.name, +c.cx.toFixed(2), +c.cz.toFixed(2), +dy.toFixed(3)]); }
      if (dy > staticStats.maxLift) staticStats.maxLift = dy; if (-dy > staticStats.maxDrop) staticStats.maxDrop = -dy;
    }
  } finally { SELF = null; }
}
/** Shift every piece of a prop by world dy (vertices; a mesh whose geometry is shared moves as a whole object, only if the prop is all of it). */
function moveCluster(c, dy, dirty) {
  for (const p of c.list) if (p.o.userData._sharedGeo) {
    const whole = c.list.filter((q) => q.o === p.o).reduce((s, q) => s + q.vs.length, 0) === p.o.geometry.attributes.position.count;
    if (!whole) { staticStats.skippedShared++; return false; }
  }
  const done = new Set();
  for (const p of c.list) {
    if (p.o.userData._sharedGeo) {
      if (!done.has(p.o)) { done.add(p.o); const s = p.o.parent ? p.o.parent.matrixWorld.elements[5] : 1; p.o.position.y += dy / (s || 1); p.o.updateMatrixWorld(true); p.o.userData._movedWhole = true; dirty.add(p.o); }
    } else {
      const pos = p.o.geometry.attributes.position, ly = dy / (p.e5 || 1);
      for (let k = 0; k < p.vs.length; k++) pos.setY(p.vs[k], pos.getY(p.vs[k]) + ly);
      p.o.userData._movedWhole = false; dirty.add(p.o);
    }
    p.b[1] += dy; p.b[4] += dy;
  }
  return true; // grids and boxes of the moved meshes are dropped once, at the end of the run (rebuilding a big grid per prop is the hitch)
}
export function staticSettleStats() { return staticStats; }
/** Diagnostics: every grouped prop of every settled top whose lowest points are > 2 cm under or > 3 cm over the surface. */
function staticAudit() {
  const out = []; let n = 0;
  for (const r of STATIC_LIST) {
    const t = r.deref(), st = t && sstate.get(t), scene = t && sceneOf(t);
    if (!st || !st.clusters || !scene) continue;
    for (const c of st.clusters) {
      SELF_ID++; const masks = new Map();
      for (const p of c.list) { const m = p.o.userData._selfMask; if (!m) continue; for (let k = 0; k < p.vs.length; k++) m[p.vs[k]] = SELF_ID; masks.set(p.o, m); }
      SELF = masks;
      let clear; try { clear = clusterClear(scene, c); } finally { SELF = null; }
      n++;
      if (clear < -0.02 || (clear > 0.03 && clear < 0.25)) {
        const o = c.list[0].o, mat = Array.isArray(o.material) ? o.material[0] : o.material;
        let y0 = Infinity, y1 = -Infinity; for (const p of c.list) { y0 = Math.min(y0, p.b[1]); y1 = Math.max(y1, p.b[4]); }
        const lh = lastHit; out.push([t.name, o.name, mat && mat.name, +c.cx.toFixed(2), +c.cz.toFixed(2), +clear.toFixed(3), c.list.length, +y0.toFixed(2), +y1.toFixed(2), lh ? topName(lh) + '/' + lh.name + '/' + ((Array.isArray(lh.material) ? lh.material[0] : lh.material)?.name || '') : 'ground/dip']);
      }
    }
  }
  out.sort((a, b) => a[5] - b[5]);
  return { props: n, off: out.length, worst: out.slice(0, 40) };
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
    staticStats: () => staticStats,
    state: () => ENTRIES.map((e) => [e.obj.name || e.obj.type, e.stage, !!e.again, e.t0 ? Math.round(performance.now() - e.t0) : -1, !!sceneOf(e.obj)]),
    /** tools/feet-check diagnostics: the settle entries whose feet box covers (x, z), and when the surface o was last (re)indexed. */
    entriesAt: (x, z) => ENTRIES.filter((e) => e.fb && x >= e.fb[0] - 0.3 && x <= e.fb[1] + 0.3 && z >= e.fb[2] - 0.3 && z <= e.fb[3] + 0.3).map((e) => ({ name: e.obj.name || e.obj.type, stage: e.stage, again: !!e.again, redo: !!e.redo, runAgo: e.lastRun ? Math.round(performance.now() - e.lastRun) : -1 })),
    surfaceAgo: (o) => { const c = boxCache.get(o); return c ? Math.round(performance.now() - c.seen) : -1; },
    indexAgo: () => (index ? Math.round(performance.now() - index.at) : -1),
    /** tools/feet-check diagnostics: the settle entry that owns o (o itself or a parent), its stage and feet box. */
    entryOf: (o) => { for (let q = o; q; q = q.parent) { const e = ENTRIES.find((x) => x.obj === q); if (e) return { name: q.name || q.type, stage: e.stage, again: !!e.again, redo: !!e.redo, fb: e.fb ? e.fb.map((n) => +n.toFixed(2)) : null, runAgo: e.lastRun ? Math.round(performance.now() - e.lastRun) : -1, ageMs: e.t0 ? Math.round(performance.now() - e.t0) : -1, settleAt: o.userData._settleAt || 0 }; } return null; },
    settleDy, groundAt, // tools/feet-check diagnostics
    staticStats: () => staticStats, staticAudit, // G2 static props: how many props were moved, and the first 400 (top, mesh, x, z, dy)
    lastHit: () => lastHit,
    indexed(o) { const idx = index; if (!idx) return 'no index'; for (const a of idx.cells.values()) for (const s of a) if (s.o === o) return 'cell'; for (const s of idx.big) if (s.o === o) return 'big'; return FIGURES.has(o) ? 'figure' : 'absent'; },
  };
}
