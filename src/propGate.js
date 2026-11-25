/**
 * Prop and vehicle streaming (25 Nov 2026, art director: props must never pop in after the player is in a scene).
 *
 * A "site" is a cluster of props/vehicles (centre, extent, file list, build function). Three stages:
 *  1. PREFETCH (title idle): after the title has painted, the GLB bytes are fetched at low priority into the HTTP cache,
 *     spawn site first, then outward. No parsing, no GPU work.
 *  2. REVEAL (Play): sites around the spawn load first; a short loading card holds the world until every prop there is
 *     parsed, its textures uploaded and its shaders compiled.
 *  3. RING (playing): a site LOADS when the player is within R_LOAD of its edge, each prop SHOWS only inside its own
 *     R_SHOW (by size) and only once ready, and the site is freed beyond R_UNLOAD. R_LOAD >= R_SHOW + 40 m, so at sprint
 *     (8.9 m/s) a prop has >= 4.5 s to finish loading before it can be seen. Loads go cone-ahead first.
 * GPU work (texture upload) is time-boxed to GPU_MS per frame. Nothing fades or scales in.
 */
import { getGLTFLoader, assetUrl, exemptModelUrls } from './loaders.js';

export const R_SHOW_BIG = 110, R_SHOW_MID = 80, R_SHOW_SMALL = 50; // m; props >= 1 m / 0.5-1 m / < 0.5 m (longest side)
export const LEAD_M = 40, UNLOAD_EXTRA = 60;
export const R_LOAD = R_SHOW_BIG + LEAD_M, R_UNLOAD = R_LOAD + UNLOAD_EXTRA; // 150 m and 210 m
export const SPAWN_RADIUS = R_SHOW_BIG + 30; // reveal waits for everything within this of the spawn
const HIDE_MARGIN = 8, MAX_PARSE = 3, TICK_MS = 250, COMPILE_CAP_MS = 1500;
export const GPU_MS_TITLE = 12, GPU_MS_PLAY = 3; // per-frame GPU upload budget: title covers the screen / while playing
let gpuMs = GPU_MS_TITLE;
export const showRadius = (size) => (size >= 1 ? R_SHOW_BIG : size >= 0.5 ? R_SHOW_MID : R_SHOW_SMALL);

const SITES = [];
let renderer = null, compileFn = null, getPos = null, revealAt = 0, started = false;
const stats = { loaded: 0, queue: 0, bytesInFlight: 0, latePop: 0, lateNeed: 0, prefetched: 0, prefetchTotal: 0 };
const sizes = new Map(); // url -> bytes, learnt by the prefetch
const uploaded = new WeakSet();

export function setPropGateRenderer(r, compile) { renderer = r; compileFn = compile || null; }
export function propStats() { return stats; }
export function propDebugText() {
  const open = SITES.filter((s) => s.state === 'loading').length;
  return `props loaded ${stats.loaded}  queue ${stats.queue}  loading sites ${open}  in flight ${(stats.bytesInFlight / 1024).toFixed(0)} KB\nlate pop-ins: ${stats.latePop + stats.lateNeed}${stats.prefetchTotal ? `  prefetch ${stats.prefetched}/${stats.prefetchTotal}` : ''}`;
}

/** site: { name, center:{x,z}, extent (m), items:[{url}], makeGroup(), build(gltfs, group) }. Call before the title (no cost). */
export function registerPropSite(site) {
  const items = site.items.map((it) => Object.assign({}, it, { url: assetUrl(it.url) }));
  for (const it of items) exemptModelUrls.add(it.url);
  SITES.push(Object.assign({ state: 'idle', group: null, token: 0, bytes: 0, readyCount: 0, total: items.length, pend: [] }, site, { items }));
}
const edgeDist = (s, p) => Math.max(0, Math.hypot(p.x - s.center.x, p.z - s.center.z) - s.extent);

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
    while (next < urls.length) {
      if (ringBusy()) { await new Promise((res) => setTimeout(res, 150)); continue; }
      const url = urls[next++];
      if (failedUrls.has(url)) continue;
      try {
        const r = await fetch(url, { priority: 'low' });
        const buf = await r.arrayBuffer(); // drained into the HTTP cache, never parsed
        sizes.set(url, buf.byteLength);
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

async function loadOne(url) {
  if (failedUrls.has(url)) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await getGLTFLoader().loadAsync(url); } catch (e) { console.warn('[propGate] load failed', attempt + 1, url, e); }
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
  let i = 0;
  const worker = async () => {
    while (i < site.items.length && site.token === mine) {
      const k = i++;
      gltfs[k] = await loadOne(site.items[k].url);
    }
  };
  await Promise.all(Array.from({ length: MAX_PARSE }, worker));
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

let last = null, heading = null;
function tickRing(scene, spawnOnly) {
  const p = getPos();
  if (!p) return;
  if (last) { const dx = p.x - last.x, dz = p.z - last.z, l = Math.hypot(dx, dz); if (l > 0.3) heading = { x: dx / l, z: dz / l }; }
  last = { x: p.x, z: p.z };
  const want = [];
  for (const s of SITES) {
    const d = edgeDist(s, p);
    if (s.state === 'idle' && d < (spawnOnly ? SPAWN_RADIUS : R_LOAD)) {
      let score = d;
      if (heading) { const tx = s.center.x - p.x, tz = s.center.z - p.z, l = Math.hypot(tx, tz) || 1; if ((tx * heading.x + tz * heading.z) / l > 0.5) score -= 60; } // the cone ahead first
      want.push({ s, score });
    } else if (s.state !== 'idle' && d > R_UNLOAD && !gateOpen) dropSite(s, scene);
  }
  want.sort((a, b) => a.score - b.score);
  for (const w of want) loadSite(w.s, scene);
  // visibility: only ready props, only inside their own show radius (with a little hysteresis)
  const now = performance.now();
  for (const s of SITES) {
    if (s.state === 'idle' || !s.group) continue;
    for (const h of s.group.children) {
      const dx = p.x - h.position.x, dz = p.z - h.position.z, d = Math.hypot(dx, dz), r = showRadius(h.userData.propSize || 2);
      if (!h.userData.ready) { if (revealAt && d < r && !h.userData.lateCounted) { h.userData.lateCounted = true; stats.lateNeed++; } continue; }
      if (!h.visible && d < r) {
        h.visible = true;
        if (revealAt && h.userData.readyAt > revealAt && now - h.userData.readyAt < 1000) stats.latePop++;
      } else if (h.visible && d > r + HIDE_MARGIN) h.visible = false;
    }
  }
}

// ---------- 2. gate: runs while the title is up; the Play button unlocks only when this resolves ----------
let gateOpen = false, gateResolve = null;
const gateDone = new Promise((r) => { gateResolve = r; });
/** Awaited by the title's ready gate (src/main.js). Resolves once startGate() has run and every prop in it is ready. */
export const propGateDone = () => gateDone;
/** Registered sites that can be seen from the given spawn(s) load now, with the title still up. No timeout: a file that fails twice is skipped, nothing else reveals early. */
export function startGate(scene, getPlayerPos, spawns, onChange) {
  gateOpen = true; getPos = getPlayerPos;
  for (const s of SITES) s.onChange = onChange;
  const reach = (s) => spawns.some((sp) => edgeDist(s, sp) < SPAWN_RADIUS);
  const near = SITES.filter(reach);
  for (const s of near) loadSite(s, scene);
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
  tickRing(scene, false);
  setInterval(() => tickRing(scene, false), TICK_MS);
  if (/[?&]debug=1/.test(location.search)) setInterval(() => console.info(`[props] late pop-ins: ${stats.latePop + stats.lateNeed}`), 10000);
  window.__propStream = { stats, sites: SITES, progress: () => 1 };
}
