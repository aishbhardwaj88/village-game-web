/**
 * Boot-CPU scheduler (25 Nov): shops, land and map objects are built AFTER the Play gate, in short slices, while the title
 * screen is up (nothing renders under it: renderOK stays false until Play is pressed). Nothing is ever switched on in
 * front of a camera: the first 3D frame waits for lateDone() if the player presses Play before the slices have finished.
 *
 *   whenGateOpen()      resolves a beat after the Play button appears (window.__readyAt), or after a safety deadline
 *   yieldToMain()       hand the thread back (MessageChannel, no 4 ms timer clamp) so input and paint run between slices
 *   sliceGen(gen, ms)   drive a generator for at most `ms` per turn, yielding to the main thread between turns
 *   track(p) / lateDone() / isLateDone()   every late build registers here; main.js holds the first 3D frame on it
 */
const T0 = () => (typeof performance !== 'undefined' ? performance.now() : 0);

let gateP = null;
export function whenGateOpen({ beatMs = 300, deadlineMs = 14000 } = {}) {
  if (gateP) return gateP;
  gateP = new Promise((resolve) => {
    const start = T0();
    const poll = () => {
      const r = typeof window !== 'undefined' ? window.__readyAt : 0;
      if (r || T0() - start > deadlineMs) { setTimeout(() => { (window.__loadMarks = window.__loadMarks || {}).lateStart = performance.now(); resolve(); }, beatMs); return; }
      setTimeout(poll, 60);
    };
    poll();
  });
  return gateP;
}

let ch = null; const waiting = [];
export function yieldToMain() {
  if (typeof MessageChannel === 'undefined') return new Promise((r) => setTimeout(r, 0));
  if (!ch) { ch = new MessageChannel(); ch.port1.onmessage = () => { const f = waiting.shift(); if (f) f(); }; }
  return new Promise((r) => { waiting.push(r); ch.port2.postMessage(0); });
}

/** Run a generator to completion, at most `ms` of work per turn, yielding to the main thread between turns. */
export async function sliceGen(gen, ms = 4) {
  for (;;) {
    const t = T0();
    for (;;) { const r = gen.next(); if (r.done) return r.value; if (T0() - t >= ms) break; }
    await yieldToMain();
  }
}
/** Run a generator to completion synchronously (the pre-existing sync entry points). */
export function runSync(gen) { for (;;) { const r = gen.next(); if (r.done) return r.value; } }

let pending = 0, pendingAny = false; const doneWaiters = [];
export function track(p) {
  pending++; pendingAny = true;
  const fin = () => { pending--; if (!pending) { const w = doneWaiters.splice(0); if (typeof window !== 'undefined') (window.__loadMarks = window.__loadMarks || {}).lateEnd = performance.now(); w.forEach((f) => f()); } };
  Promise.resolve(p).then(fin, fin);
  return p;
}
export const isLateDone = () => pending === 0;
export function lateDone() { return pending === 0 ? Promise.resolve() : new Promise((r) => doneWaiters.push(r)); }
