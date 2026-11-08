/** Frame-time probe. Accumulates ms per named section; read by tmp/perf-profile.mjs via window.__perfProbe.
 * Cost when idle: two performance.now() calls per section per frame. */
export const perfProbe = { t: Object.create(null), n: Object.create(null), frames: 0 };
export function pAdd(name, ms) {
  perfProbe.t[name] = (perfProbe.t[name] || 0) + ms;
  perfProbe.n[name] = (perfProbe.n[name] || 0) + 1;
}
export function pReset() { perfProbe.t = Object.create(null); perfProbe.n = Object.create(null); perfProbe.frames = 0; }
if (typeof window !== 'undefined') window.__perfProbe = perfProbe, window.__perfReset = pReset;
