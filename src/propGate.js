/**
 * Prop and vehicle streaming (25 Nov 2026, art director: everything ready BEFORE the player sees a scene, no pop-in).
 *
 * A "site" is a cluster of props/vehicles (centre, extent, file list, build function). Three stages:
 *  1. GATE (title up): every site whose show radius reaches the spawn (or the saved position) is downloaded, unpacked,
 *     texture-uploaded (12 ms/frame) and shader-compiled (capped 1.5 s) before the Play button unlocks. No timeout; a file
 *     that fails twice is skipped for the session. The rest is prefetched into the HTTP cache, one file at a time, from
 *     the moment the title is 'ready' and also after Play.
 *  2. SHOW RULE: a prop shows within min(size x 450, 265) m (0.25 m prop 112 m, 0.5 m 225 m, 0.6 m+ 265 m cap).
 *  3. RING (playing): a site LOADS when the player is within its load radius = show radius + 8.9 m/s x lead seconds,
 *     lead = max(5, 1 + uncached bytes / measured speed + 0.02 x textures), min 45 m; it is freed beyond load radius + 60 m.
 *     One global queue (4 downloads, 2 unpacks at a time) sorted by time until visible, re-sorted every 250 ms, direction of
 *     travel first. A prop that becomes ready late is switched on only while outside the camera frustum.
 * GPU work (texture upload) is time-boxed to 12 ms per frame on the title, 3 ms while playing. Nothing fades or scales in.
 */
import * as THREE from 'three';
import { SHOW_CAP } from './showCap.js';
import { getGLTFLoader, assetUrl, exemptModelUrls, modelLoads, fetchModel, modelFetchUrl, gzReady } from './loaders.js';

export const SHOW_PER_M = 450, SHOW_MAX = SHOW_CAP; // m of show radius per metre of prop size, and its cap
export const SPRINT = 8.9, MIN_LOAD = 45, UNLOAD_EXTRA = 60; // m/s, m, m
const HIDE_MARGIN = 8, DL_MAX = 4, PARSE_MAX = 2, TICK_MS = 250, COMPILE_CAP_MS = 1500;
export const GPU_MS_TITLE = 12, GPU_MS_PLAY = 3; // per-frame GPU upload budget: title covers the screen / while playing
let gpuMs = GPU_MS_TITLE;
let showCap = SHOW_MAX; // 26 Nov: SHOW_MAX is the 265 m show cap (src/showCap.js), was 380; lowered to 250 for props over 1 m only if the measured draw calls demand it (see report)
export const showRadius = (size) => Math.min(size * SHOW_PER_M, size > 1 ? showCap : SHOW_MAX);

const SITES = [];
let renderer = null, camera = null, compileFn = null, getPos = null, revealAt = 0, started = false;
const stats = { loaded: 0, queue: 0, bytesInFlight: 0, latePop: 0, lateNeed: 0, prefetched: 0, prefetchTotal: 0 };
const sizes = new Map(); // url -> bytes, learnt by the prefetch
const uploaded = new WeakSet();

export function setPropGateRenderer(r, compile, cam) { renderer = r; compileFn = compile || null; camera = cam || null; }
export function propStats() { return stats; }
export function propDebugText() {
  const open = SITES.filter((s) => s.state === 'loading').length;
  return `props loaded ${stats.loaded}  queue ${stats.queue}  loading sites ${open}  in flight ${(stats.bytesInFlight / 1024).toFixed(0)} KB\nlate pop-ins: ${stats.latePop + stats.lateNeed}${stats.prefetchTotal ? `  prefetch ${stats.prefetched}/${stats.prefetchTotal}` : ''}`;
}

/** site: { name, center:{x,z}, extent (m), items:[{url}], makeGroup(), build(gltfs, group) }. Call before the title (no cost). */
export function registerPropSite(site) {
  const items = site.items.map((it) => Object.assign({}, it, { url: assetUrl(it.url) }));
  const showMax = Math.max(...items.map((it) => showRadius(it.size ?? it.v?.size ?? 1)));
  for (const it of items) exemptModelUrls.add(it.url);
  SITES.push(Object.assign({ state: 'idle', group: null, token: 0, bytes: 0, readyCount: 0, total: items.length, pend: [], prio: 1e9, showMax }, site, { items }));
}
const edgeDist = (s, p) => Math.max(0, Math.hypot(p.x - s.center.x, p.z - s.center.z) - s.extent);
// ---------- load radius from measured speed ----------
const cached = new Set(); // urls already pulled into the HTTP cache this session
let speed = 1e6; // bytes/s, measured from real downloads (aggregate across the parallel slots); 1 MB/s until something is measured
const noteSpeed = (bytes, ms, parallel) => { if (bytes > 20000 && ms > 0) speed = 0.7 * speed + 0.3 * Math.max(5e4, (bytes / ms) * 1000 * parallel); };
function leadSeconds(s) {
  let bytes = 0;
  for (const it of s.items) if (!cached.has(it.url)) bytes += sizes.get(it.url) || 150000;
  return Math.max(5, 1 + bytes / speed + 0.02 * s.items.length * 3); // ~3 textures per prop file
}
const loadRadius = (s) => Math.max(MIN_LOAD, s.showMax + SPRINT * leadSeconds(s));
const freeRadius = (s) => loadRadius(s) + UNLOAD_EXTRA;

// ---------- 1. prefetch: bytes only, low priority, nearest site first. Starts when the title gets 'ready', keeps running after Play ----------
const failedUrls = new Set(); // a file that fails twice is skipped for the session
let prefetchStarted = false;
const ringBusy = () => SITES.some((s) => s.state === 'loading');
export function startPrefetch(spawns) {
  if (prefetchStarted) return;
  prefetchStarted = true;
  const near = (s) => Math.min(...spawns.map((sp) => edgeDist(s, sp)));
  const urls = [], seen = new Set();
  for (const s of [...SITES].sort((a, b) => near(a) - near(b))) {
    if (s.state !== 'idle') continue; // the gate already has these
    for (const it of s.items) if (!seen.has(it.url)) { seen.add(it.url); urls.push(it.url); }
  }
  stats.prefetchTotal = urls.length;
  let next = 0;
  (async () => { // one at a time; ring loads jump the queue (we wait while any site is loading)
    await gzReady;
    while (next < urls.length) {
      if (ringBusy()) { await new Promise((res) => setTimeout(res, 150)); continue; }
      const url = urls[next++];
      if (failedUrls.has(url)) continue;
      try {
        const r = await fetch(modelFetchUrl(url), { priority: 'low' });
        const buf = await r.arrayBuffer(); // drained into the HTTP cache, never parsed
        sizes.set(url, buf.byteLength); cached.add(url);
      } catch (e) { /* the real load will retry and report it */ }
      stats.prefetched++;
      await new Promise((res) => setTimeout(res, 30));
    }
  })();
}

// ---------- shared helpers ----------
export function disposeTree(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) {
      for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose();
      m.dispose();
    }
  });
}
function pendingTextures(obj) {
  const out = [];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material || [])) for (const k in m) { const t = m[k]; if (t && t.isTexture && !uploaded.has(t) && !out.includes(t)) out.push(t); }
  });
  return out;
}

// ---------- 3. streaming ring ----------
const uploadQueue = []; // {site, holder, token, tex} props whose textures still need the GPU
let pumping = false;
function pump() {
  pumping = false;
  const t0 = performance.now();
  while (uploadQueue.length) {
    const job = uploadQueue[0];
    if (job.site.token !== job.token) { uploadQueue.shift(); continue; } // site was freed meanwhile
    if (!job.tex) job.tex = pendingTextures(job.holder);
    while (job.tex.length && (performance.now() - t0 < gpuMs)) {
      const t = job.tex.shift(); uploaded.add(t);
      try { renderer.initTexture(t); } catch (e) { /* first render uploads it instead */ }
    }
    if (job.tex.length) break; // out of frame budget: the rest next frame
    uploadQueue.shift();
    job.site.pend.push(job.holder); job.site.readyCount++;
    if (job.site.readyCount >= job.site.total) siteReady(job.site, job.token);
    if (performance.now() - t0 >= gpuMs) break;
  }
  stats.queue = uploadQueue.length;
  if (uploadQueue.length) { pumping = true; requestAnimationFrame(pump); }
}
const kickPump = () => { if (!pumping) { pumping = true; requestAnimationFrame(pump); } };
const countLoaded = () => SITES.reduce((n, s) => n + (s.state === 'ready' ? s.total : 0), 0);

const gateWaiters = [];
async function siteReady(site, token) {
  site.state = 'compiling';
  // shaders compiled on the still-hidden props (briefly made visible, because compile only walks visible objects); capped, never blocks forever
  if (compileFn && site.group) {
    const hs = site.group.children, was = hs.map((h) => h.visible);
    hs.forEach((h) => { h.visible = true; });
    let p = null; try { p = compileFn(site.group); } catch (e) { /* compiled at first draw instead */ }
    hs.forEach((h, i) => { h.visible = was[i]; });
    try { await Promise.race([p, new Promise((r) => setTimeout(r, COMPILE_CAP_MS))]); } catch (e) { /* ignore */ }
  }
  if (site.token !== token) return; // freed meanwhile
  const now = performance.now();
  for (const h of site.pend) { h.userData.ready = true; h.userData.readyAt = now; }
  site.pend = [];
  site.state = 'ready';
  stats.loaded = countLoaded();
  site.onChange?.();
  gateWaiters.slice().forEach((f) => f());
}

// one global queue for the whole game: 4 downloads and 2 unpacks at a time, most urgent site (soonest visible) first
const dlQueue = [], parseQueue = [];
let dlActive = 0, parseActive = 0;
const sortQ = (q) => q.sort((a, b) => a.site.prio - b.site.prio);
function pumpDownloads() {
  while (dlActive < DL_MAX && dlQueue.length) {
    const j = sortQ(dlQueue).shift();
    if (j.site.token !== j.token) { j.res(null); continue; }
    dlActive++; const par = dlActive; const t0 = performance.now();
    (async () => {
      try {
        const buf = await fetchModel(j.url); // gzipped on the wire when the build packed it (tools/gz-models.mjs), unpacked here
        noteSpeed(buf.byteLength, performance.now() - t0, par); sizes.set(j.url, buf.byteLength); cached.add(j.url);
        j.res(buf);
      } catch (e) { j.res(undefined); } finally { dlActive--; pumpDownloads(); }
    })();
  }
}
function pumpParses() {
  while (parseActive < PARSE_MAX && parseQueue.length) {
    const j = sortQ(parseQueue).shift();
    if (j.site.token !== j.token) { j.res(null); continue; }
    parseActive++;
    getGLTFLoader().parseAsync(j.buf, j.url.slice(0, j.url.lastIndexOf('/') + 1))
      .then((g) => { modelLoads.count++; j.res(g); }, () => j.res(undefined))
      .finally(() => { parseActive--; pumpParses(); });
  }
}
const enqueue = (q, pump, o) => new Promise((res) => { q.push({ ...o, res }); pump(); });
async function loadOne(site, token, url) {
  if (failedUrls.has(url)) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const buf = await enqueue(dlQueue, pumpDownloads, { site, token, url });
    if (buf === null) return null; // site was freed
    if (buf) {
      const g = await enqueue(parseQueue, pumpParses, { site, token, url, buf });
      if (g === null) return null;
      if (g) return g;
    }
    console.warn('[propGate] load failed', attempt + 1, url);
  }
  failedUrls.add(url); // twice: skipped for the session
  return null;
}

async function loadSite(site, scene) {
  const mine = ++site.token;
  site.state = 'loading'; site.readyCount = 0; site.bytes = 0; site.pend = [];
  const group = site.group = site.makeGroup();
  group.name = site.name;
  scene.add(group);
  for (const it of site.items) site.bytes += sizes.get(it.url) || 0;
  stats.bytesInFlight += site.bytes;
  const gltfs = new Array(site.items.length).fill(null);
  await Promise.all(site.items.map(async (it, k) => { gltfs[k] = await loadOne(site, mine, it.url); }));
  stats.bytesInFlight = Math.max(0, stats.bytesInFlight - site.bytes);
  if (site.token !== mine) { for (const g of gltfs) if (g) disposeTree(g.scene); return; } // freed while loading
  site.build(gltfs, group); // places everything; each child holder carries userData.propSize (m)
  const holders = group.children.slice();
  site.total = holders.length;
  for (const h of holders) { h.visible = false; h.userData.ready = false; }
  holders.sort((a, b) => (b.userData.propSize || 0) - (a.userData.propSize || 0)); // big ones first: they show furthest out
  if (!holders.length) { siteReady(site, mine); return; }
  for (const h of holders) uploadQueue.push({ site, holder: h, token: mine, tex: null });
  stats.queue = uploadQueue.length;
  site.onChange?.(); // colliders
  kickPump();
}

function dropSite(site, scene) {
  site.token++;
  if (site.group) { scene.remove(site.group); disposeTree(site.group); site.group = null; }
  site.state = 'idle'; site.readyCount = 0; site.pend = [];
  stats.loaded = countLoaded();
  site.onChange?.();
}

const frustum = new THREE.Frustum(), _pv = new THREE.Matrix4(), _sph = new THREE.Sphere();
const inView = (h) => { // is the prop (as a sphere) inside the camera's view right now?
  if (!camera) return false;
  _sph.center.copy(h.position); _sph.center.y += 0.5 * (h.userData.propSize || 1); _sph.radius = (h.userData.propSize || 1) * 0.75 + 0.5;
  return frustum.intersectsSphere(_sph);
};
let last = null, heading = null;
// ---------- hold: the player outran the stream. Freeze the world (like pause) with a notice instead of showing holes ----------
export const HOLD_M = 45, HOLD_GIVE_UP_MS = 8000; // a not-ready site this close would be a visible hole; one episode holds 8 s at most
let holding = false, holdSince = 0, holdGaveUp = false;
export const streamHold = () => holding;
function updateHold(p) {
  const blocked = SITES.some((s) => s.state !== 'ready' && !s.dead && edgeDist(s, p) < Math.min(HOLD_M, s.showMax));
  const now = performance.now();
  if (!blocked) { holding = false; holdGaveUp = false; return; }
  if (holdGaveUp) return;
  if (!holding) { holding = true; holdSince = now; stats.holds = (stats.holds || 0) + 1; }
  else if (now - holdSince > HOLD_GIVE_UP_MS) { holding = false; holdGaveUp = true; }
}
function tickRing(scene) {
  const p = getPos();
  if (!p) return;
  if (last) { const dx = p.x - last.x, dz = p.z - last.z, l = Math.hypot(dx, dz); if (l > 0.3) heading = { x: dx / l, z: dz / l }; }
  last = { x: p.x, z: p.z };
  for (const s of SITES) {
    const d = edgeDist(s, p);
    // seconds until the site's biggest prop could be seen; the cone ahead of the player counts 2 s sooner
    let tuv = (d - s.showMax) / SPRINT;
    if (heading) { const tx = s.center.x - p.x, tz = s.center.z - p.z, l = Math.hypot(tx, tz) || 1; if ((tx * heading.x + tz * heading.z) / l > 0.5) tuv -= 2; }
    if (!gateSites.has(s)) s.prio = tuv;
    if (s.state === 'idle') { if (d < loadRadius(s)) loadSite(s, scene); }
    else if (d > freeRadius(s) && !gateSites.has(s)) dropSite(s, scene);
  }
  stats.queue = uploadQueue.length;
  updateHold(p);
  // visibility: only ready props, only inside their own show radius (with a little hysteresis)
  if (camera) { camera.updateMatrixWorld(); _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(_pv); }
  const now = performance.now();
  for (const s of SITES) {
    if (s.state === 'idle' || !s.group) continue;
    for (const h of s.group.children) {
      const dx = p.x - h.position.x, dz = p.z - h.position.z, d = Math.hypot(dx, dz), r = showRadius(h.userData.propSize || 2);
      if (!h.userData.ready) { if (revealAt && d < r && !h.userData.lateCounted) { h.userData.lateCounted = true; stats.lateNeed++; } continue; }
      if (!h.visible && d < r) {
        // ready late (the player was already inside its radius when it finished): switch on only while it is outside the camera's view
        if (h.userData.lateCounted && inView(h)) continue;
        h.visible = true;
        if (revealAt && h.userData.readyAt > revealAt && now - h.userData.readyAt < 1000) stats.latePop++;
      } else if (h.visible && d > r + HIDE_MARGIN) h.visible = false;
    }
  }
}

// ---------- 2. gate: runs while the title is up; the Play button unlocks only when this resolves ----------
let gateOpen = false, gateResolve = null;
const gateSites = new Set(); // gate sites stay loaded and first in the queue until Play
const gateDone = new Promise((r) => { gateResolve = r; });
/** Awaited by the title's ready gate (src/main.js). Resolves once startGate() has run and every prop in it is ready. */
export const propGateDone = () => gateDone;
/** Registered sites that can be seen from the given spawn(s) load now, with the title still up. No timeout: a file that fails twice is skipped, nothing else reveals early. */
export function startGate(scene, getPlayerPos, spawns, onChange) {
  gateOpen = true; getPos = getPlayerPos;
  for (const s of SITES) s.onChange = onChange;
  const reach = (s) => spawns.some((sp) => edgeDist(s, sp) < s.showMax); // every site whose show radius reaches the spawn
  const near = SITES.filter(reach);
  for (const s of near) { gateSites.add(s); s.prio = -1e9; loadSite(s, scene); }
  const check = () => {
    if (!near.every((s) => s.state === 'ready')) return;
    gateWaiters.splice(gateWaiters.indexOf(check), 1);
    gateOpen = false; gateResolve(near.length);
  };
  if (!near.length) { gateOpen = false; gateResolve(0); return; }
  gateWaiters.push(check);
  window.__propStream = { stats, sites: SITES, progress: () => 1 };
}

/** Called at Play: the ring takes over. Ready props inside their radius show in the same frame; GPU budget drops to the playing figure. */
export function startStreaming(scene, getPlayerPos, spawn, onChange) {
  started = true; gpuMs = GPU_MS_PLAY;
  getPos = getPlayerPos;
  for (const s of SITES) s.onChange = onChange;
  revealAt = performance.now();
  gateSites.clear();
  tickRing(scene);
  setInterval(() => tickRing(scene), TICK_MS);
  if (/[?&]debug=1/.test(location.search)) setInterval(() => console.info(`[props] late pop-ins: ${stats.latePop + stats.lateNeed}`), 10000);
  window.__propStream = { stats, sites: SITES, progress: () => 1 };
}
