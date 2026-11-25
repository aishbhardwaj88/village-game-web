/**
 * Runs `fn` once, when the game is really ready (the Play button is live, window.__readyAt set by src/ui.js markReady) plus a short
 * pause, in an idle slot. Replaces the two fixed 8 s timers (house atlas variants, shop brick_b / concrete_f): 8 s was a guess at
 * "after the page is up"; on a slow link Play is not ready by then and the 2.4 MB of variant surfaces competed with the opening
 * view, on a fast one they waited for no reason. Checked every 500 ms, so it costs nothing before ready.
 */
const PAUSE_MS = 1500;
export function afterReady(fn) {
  if (typeof window === 'undefined') return;
  const run = () => setTimeout(() => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 1000 }) : setTimeout(fn, 1)), PAUSE_MS);
  if (window.__readyAt) { run(); return; }
  const poll = setInterval(() => { if (window.__readyAt) { clearInterval(poll); run(); } }, 500);
}
