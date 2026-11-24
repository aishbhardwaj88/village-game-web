import * as THREE from 'three';

/**
 * Adaptive render resolution for the web edition (art director's brief, 24 Nov: lighter, no visible quality drop).
 *
 * The pixel ratio sits at the cap (1.5 on web) and only steps DOWN, in 0.25 steps toward 1.0, when the average of the last
 * 30 frames stays above 20 ms for 2 s. It steps back UP slowly: only after 6 s of 30-frame averages under 14 ms, and each
 * step down doubles the wait before that level may be tried again (30 s, 60 s ... 300 s) so it cannot flap. Never more than
 * one change per 2 s. Gaps over 200 ms (hidden tab, loading hitch) are not counted.
 *
 * Off on touch (already 1.0 there), off in 'full'/'light' presets (adaptiveRes false) and with ?dynres=0.
 * It changes only the renderer's pixel ratio, through the 'dopahar-res' window event that main.js answers.
 * State for tests: window.__perfS7.dynres, and ?debug=1 readers.
 */
export const DYN = { enabled: false, cap: 1.5, floor: 1.0, current: 1.5, avgMs: 0, changes: 0, lastChange: -Infinity, downs: 0 };

const STEP = 0.25, WINDOW = 30, SLOW_MS = 20, FAST_MS = 14, DOWN_AFTER = 2000, UP_AFTER = 6000, MIN_GAP = 2000;

export function configureDynamicRes({ enabled, cap }) {
  let off = false;
  try { off = new URLSearchParams(globalThis.location?.search || '').get('dynres') === '0'; } catch (e) { /* node */ }
  DYN.enabled = !!enabled && !off;
  if (cap) { DYN.cap = cap; if (DYN.current > cap || !DYN.enabled) DYN.current = cap; }
}

/** Pause menu / quality change: a new ceiling. Current ratio is clamped under it (and starts at it). */
export function setDynamicResCap(cap) {
  DYN.cap = cap;
  DYN.current = Math.min(DYN.current, cap);
  if (DYN.current < DYN.floor) DYN.current = Math.min(cap, DYN.floor);
}

/** The ratio the renderer should use right now (before the screen's own devicePixelRatio limit). */
export function dynamicRatio() { return Math.max(Math.min(DYN.floor, DYN.cap), Math.min(DYN.current, DYN.cap)); }

export function createDynamicResSentinel(scene) {
  const gaps = new Float32Array(WINDOW);
  let n = 0, idx = 0, last = 0, slowSince = 0, fastSince = 0, upBlockedUntil = 0, sum = 0;
  const sentinel = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 0, colorWrite: false, depthWrite: false, depthTest: false }));
  sentinel.name = 'perf_dynres_sentinel';
  sentinel.frustumCulled = false;
  sentinel.raycast = () => {};
  sentinel.userData.noCollide = true;
  function change(now, next, down) {
    if (next === DYN.current) return;
    DYN.current = next; DYN.lastChange = now; DYN.changes++;
    if (down) { DYN.downs++; upBlockedUntil = now + Math.min(300000, 30000 * 2 ** (DYN.downs - 1)); }
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
    if (now - DYN.lastChange < MIN_GAP) { slowSince = 0; fastSince = 0; return; }
    if (avg > SLOW_MS) {
      fastSince = 0;
      if (!slowSince) slowSince = now;
      if (now - slowSince >= DOWN_AFTER && DYN.current > DYN.floor) change(now, Math.max(DYN.floor, DYN.current - STEP), true);
    } else if (avg < FAST_MS) {
      slowSince = 0;
      if (!fastSince) fastSince = now;
      if (now - fastSince >= UP_AFTER && now >= upBlockedUntil && DYN.current < DYN.cap) change(now, Math.min(DYN.cap, DYN.current + STEP), false);
    } else { slowSince = 0; fastSince = 0; }
  };
  scene.add(sentinel);
  return sentinel;
}
