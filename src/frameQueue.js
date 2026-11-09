import * as THREE from 'three';

/**
 * One shared, time-sliced work queue for everything that used to run as a single long task right after the Play press
 * (lazy frontage builds, the deferred village assembly, collider derivation). A job is an iterator (usually a generator):
 * each `yield` is a point where the job may be paused until the next frame. Per frame the queue runs steps until its
 * budget is spent, always at least one step, so a job of many small steps never takes the page below a few frames a
 * second, and a job of one long step is no worse than before.
 *
 * Budget: frameBudget(), ~4 ms on a fast frame, up to 8 ms on a slow one (load-play, 9 Nov: the old quarter-of-a-frame budget,
 * cap 30 ms, fed back on itself: work made the frame slow, the slow frame raised the budget). It is driven by its own
 * requestAnimationFrame, so callers need no hook in the render loop.
 *
 * Also here (load-play D1, 9 Nov): THREE.TextureLoader is switched to decode into an ImageBitmap off the main thread.
 * An <img> texture is decoded and flipped on the main thread inside texSubImage2D (~80 ms per 1K map at 4x CPU, ~3 s of
 * the first seconds after Play); a pre-flipped ImageBitmap uploads in ~2 ms. `?nobitmap` keeps the old <img> path.
 */

const jobs = [];
let rafOn = false;
const stats = { jobs: 0, steps: 0, ms: 0, worstStepMs: 0, done: 0 };
if (typeof window !== 'undefined') window.__frameQueue = { stats, get pending() { return jobs.length; }, budget: () => frameBudget() };

// One frame clock for every time-sliced system (this queue, src/zoneManager.js zone builds, src/placeBatch.js batching): a smoothed
// rAF interval, kept by its own always-on rAF (one tiny callback a frame), so the budget is right even when the queue is idle.
let lastT = 0, frameDt = 16;
function clock(t) {
  if (lastT) frameDt = frameDt * 0.7 + Math.min(1000, t - lastT) * 0.3;
  lastT = t;
  requestAnimationFrame(clock);
}
if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(clock);

/** Per-frame work budget in ms for ONE time-sliced system: 4 ms on a fast frame, up to 10% of a slow frame (cap 8 ms), so a
 *  throttled phone still makes progress without the work itself stretching the frame it is measured from. */
export function frameBudget() {
  return Math.min(8, Math.max(4, frameDt * 0.1));
}

function pump() {
  if (!jobs.length) { rafOn = false; return; }
  requestAnimationFrame(pump);
  const t0 = performance.now(), budget = frameBudget();
  let first = true;
  while (jobs.length && (first || performance.now() - t0 < budget)) {
    first = false;
    const job = jobs[0];
    const s0 = performance.now();
    let r;
    try { r = job.it.next(); } catch (err) { console.error(`frameQueue job "${job.name}" failed`, err); r = { done: true }; }
    const ds = performance.now() - s0;
    stats.steps++; stats.ms += ds; if (ds > stats.worstStepMs) { stats.worstStepMs = ds; stats.worstStep = job.name; }
    if (r.done) { jobs.shift(); stats.done++; job.resolve(); }
  }
  const pm = performance.now() - t0; if (!(pm <= stats.worstFrameMs)) stats.worstFrameMs = pm; // worst single frame of queue work (L4)
}

/** Queues `job` (an iterator, a generator function, or a plain function run as one step). Returns a promise for its end. */
export function schedule(job, name = 'job') {
  const it = typeof job === 'function' ? (job.prototype && typeof job.prototype.next === 'function' ? job() : (function* one() { job(); })()) : job;
  return new Promise((resolve) => {
    jobs.push({ it, name, resolve });
    stats.jobs++;
    if (typeof requestAnimationFrame === 'undefined') { drain(); return; }
    if (!rafOn) { rafOn = true; requestAnimationFrame(pump); }
  });
}

/** Runs an iterator to its end right now (the synchronous path: ?nodefer, tests). */
export function runNow(it) {
  for (let r = it.next(); !r.done; r = it.next());
}

function drain() {
  while (jobs.length) { const j = jobs.shift(); runNow(j.it); j.resolve(); }
}

/** True while any job is waiting. */
export function queueBusy() { return jobs.length > 0; }

// ---------------------------------------------------------------------------------------------------------------- textures
function bitmapsSupported() {
  if (typeof window === 'undefined' || typeof createImageBitmap === 'undefined' || typeof fetch === 'undefined') return false;
  if (/[?&]nobitmap\b/.test(window.location.search)) return false;
  const ua = navigator.userAgent || '';
  const ff = ua.match(/Firefox\/(\d+)/);
  if (ff) return Number(ff[1]) >= 98;
  return /Chrome\//.test(ua); // Chromium (desktop + Android). Safari/iOS keep <img>: its ImageBitmap options are unreliable.
}

let installed = false;
// One fetch + decode per URL: Blink's memory cache dedupes repeated <img> loads of one URL, fetch() does not (several
// modules load the same maps through their own TextureLoader caches), so without this the same file downloads again.
const bitmapByUrl = new Map();
function installBitmapTextureLoader() {
  if (installed || !bitmapsSupported()) return;
  installed = true;
  THREE.TextureLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    const texture = new THREE.Texture();
    const manager = this.manager;
    const full = manager.resolveURL(this.path !== undefined ? this.path + url : url);
    const crossOrigin = this.crossOrigin, path = this.path;
    manager.itemStart(full);
    const viaImage = () => { // the stock path, for anything fetch/createImageBitmap refused
      const il = new THREE.ImageLoader(manager);
      il.setCrossOrigin(crossOrigin); il.setPath(path);
      il.load(url, (image) => { texture.image = image; texture.needsUpdate = true; if (onLoad) onLoad(texture); }, onProgress, onError);
      manager.itemEnd(full);
    };
    let p = bitmapByUrl.get(full);
    if (!p) {
      // priority 'low' = what Blink gives an <img>: textures must not take 4G bandwidth from the opening-view models
      p = fetch(full, { credentials: crossOrigin === 'use-credentials' ? 'include' : 'same-origin', priority: 'low' })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
        // Same pixels the <img> path uploads: flipped (three's default flipY), unpremultiplied, no colour conversion.
        // WebGL ignores UNPACK_FLIP_Y for an ImageBitmap, so clones made before the load (still flipY=true) are right too.
        .then((blob) => createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }));
      bitmapByUrl.set(full, p);
      p.catch(() => bitmapByUrl.delete(full));
    }
    p.then((bitmap) => {
      texture.image = bitmap; texture.flipY = false; texture.needsUpdate = true;
      if (onLoad) onLoad(texture);
      manager.itemEnd(full);
    }, () => viaImage());
    return texture;
  };
}
installBitmapTextureLoader();
