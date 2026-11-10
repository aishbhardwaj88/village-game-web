/** Frame-time probe. Accumulates ms per named section; read by tmp/perf-profile.mjs via window.__perfProbe.
 * Cost when idle: two performance.now() calls per section per frame. */
export const perfProbe = { t: Object.create(null), n: Object.create(null), max: Object.create(null), frames: 0, cur: Object.create(null), worstFrame: null };
export function pAdd(name, ms) {
  perfProbe.t[name] = (perfProbe.t[name] || 0) + ms;
  perfProbe.n[name] = (perfProbe.n[name] || 0) + 1;
  perfProbe.cur[name] = (perfProbe.cur[name] || 0) + ms;
  if (name === 'logic') { if (!perfProbe.worstFrame || ms > perfProbe.worstFrame.logic) perfProbe.worstFrame = { ...perfProbe.cur }; perfProbe.cur = Object.create(null); } // sections of the single worst logic frame
  if (!(ms <= perfProbe.max[name])) perfProbe.max[name] = ms; // worst single frame per section (L4 ride report)
}
export function pReset() { perfProbe.t = Object.create(null); perfProbe.n = Object.create(null); perfProbe.max = Object.create(null); perfProbe.frames = 0; perfProbe.cur = Object.create(null); perfProbe.worstFrame = null; }
if (typeof window !== 'undefined') window.__perfProbe = perfProbe, window.__perfReset = pReset;
