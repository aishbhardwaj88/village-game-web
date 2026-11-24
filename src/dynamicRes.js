import * as THREE from 'three';

/**
 * Adaptive render resolution for the web edition (art director's brief, 24 Nov: lighter, no visible quality drop).
 *
 * Default and floor = 1.0 (the pixel count the game really rendered before). It may step UP in 0.25 steps toward 1.5 only
 * when the 30-frame average stays under 12 ms for 6 s, and steps back DOWN at once (one step per 30-frame refresh) when the
 * average is above 18 ms for 1 s. After a step down the level just left is blocked for 30 s, doubling each time (max 300 s),
 * so it cannot flap. Up-steps are at least 2 s apart. Gaps over 200 ms (hidden tab, loading hitch) are not counted.
 *
 * Off on touch, off in 'full'/'light' (adaptiveRes false), off with ?dynres=0. ?pr=1.5 forces one ratio (any preset).
 * It only changes the renderer's pixel ratio, through the 'dopahar-res' window event that main.js answers.
 * State for tests: window.__perfS7.dynres.
 */
export const DYN = { enabled: false, forced: 0, base: 1.0, upMax: 1.5, floor: 1.0, cap: 1.5, current: 1.0, avgMs: 0, changes: 0, lastChange: -Infinity, downs: 0 };

const STEP = 0.25, WINDOW = 30, SLOW_MS = 18, FAST_MS = 12, DOWN_AFTER = 1000, UP_AFTER = 6000, MIN_UP_GAP = 2000;

export function configureDynamicRes({ enabled, base = 1.0, upMax = 1.5 }) {
  let off = false, pr = 0;
  try {
    const q = new URLSearchParams(globalThis.location?.search || '');
    off = q.get('dynres') === '0';
    pr = parseFloat(q.get('pr')) || 0;
  } catch (e) { /* node */ }
  DYN.forced = pr > 0 ? Math.min(Math.max(pr, 0.5), 3) : 0;
  DYN.enabled = !!enabled && !off && !DYN.forced;
  DYN.base = base; DYN.upMax = upMax; DYN.floor = base; DYN.cap = upMax; DYN.current = base;
}

/** Pause menu level: lower levels lower the floor/ceiling; 'high' passes Infinity (no change). */
export function setDynamicResCap(menuCap) {
  DYN.floor = Math.min(DYN.base, menuCap);
  DYN.cap = Math.max(DYN.floor, Math.min(DYN.upMax, menuCap));
  DYN.current = Math.min(Math.max(DYN.current, DYN.floor), DYN.cap);
}

/** The ratio the renderer should use right now (before the screen's own devicePixelRatio limit). */
export function dynamicRatio() { return DYN.forced || DYN.current; }

export function createDynamicResSentinel(scene) {
  const gaps = new Float32Array(WINDOW);
  let n = 0, idx = 0, last = 0, slowSince = 0, fastSince = 0, sum = 0;
  const blockedUp = new Map(); // level -> time before which it may not be tried again
  const sentinel = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 0, colorWrite: false, depthWrite: false, depthTest: false }));
  sentinel.name = 'perf_dynres_sentinel';
  sentinel.frustumCulled = false;
  sentinel.raycast = () => {};
  sentinel.userData.noCollide = true;
  function change(now, next, down) {
    if (next === DYN.current) return;
    DYN.current = next; DYN.lastChange = now; DYN.changes++;
    if (down) { DYN.downs++; blockedUp.set(DYN.current + STEP, now + Math.min(300000, 30000 * 2 ** (DYN.downs - 1))); }
    slowSince = 0; fastSince = 0; n = 0; idx = 0; sum = 0; // fresh window at the new resolution
    window.dispatchEvent(new Event('dopahar-res'));
  }
  sentinel.onBeforeRender = () => {
    if (!DYN.enabled) return;
    const now = performance.now();
    const gap = last ? now - last : 0;
    last = now;
    if (gap <= 0 || gap > 200) { slowSince = 0; fastSince = 0; return; }
    if (n === WINDOW) sum -= gaps[idx]; else n++;
    gaps[idx] = gap; sum += gap; idx = (idx + 1) % WINDOW;
    if (n < WINDOW) return;
    const avg = sum / WINDOW;
    DYN.avgMs = +avg.toFixed(1);
    if (avg > SLOW_MS) {
      fastSince = 0;
      if (!slowSince) slowSince = now;
      if (now - slowSince >= DOWN_AFTER && DYN.current > DYN.floor) change(now, Math.max(DYN.floor, DYN.current - STEP), true);
    } else if (avg < FAST_MS) {
      slowSince = 0;
      if (!fastSince) fastSince = now;
      const next = Math.min(DYN.cap, DYN.current + STEP);
      if (now - fastSince >= UP_AFTER && now - DYN.lastChange >= MIN_UP_GAP && now >= (blockedUp.get(next) || 0) && DYN.current < DYN.cap) change(now, next, false);
    } else { slowSince = 0; fastSince = 0; }
  };
  scene.add(sentinel);
  return sentinel;
}
