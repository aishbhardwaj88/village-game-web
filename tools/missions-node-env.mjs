/**
 * Lets Node import the game's own modules (for tools/missions-check.mjs): JSON imports without the attribute, asset imports
 * as empty strings, and a do-nothing `document` / `window` so modules that touch the page at import time still load.
 * Import this BEFORE any game module. The layout mode must be set first (globalThis.__DOPAHAR_LAYOUT = 'new' | 'old').
 */
import { register } from 'node:module';

const HOOKS = `
export async function resolve(spec, context, next) {
  if (/\\?(url|raw)$/.test(spec)) spec = spec.replace(/\\?(url|raw)$/, '');
  return next(spec, context);
}
export async function load(url, context, next) {
  if (url.endsWith('.json')) return next(url, { ...context, importAttributes: { type: 'json' } });
  if (/\\.(png|jpe?g|webp|ktx2|glb|gltf|css|svg|wav|mp3|ogg|hdr|exr)(\\?.*)?$/.test(url)) return { format: 'module', source: 'export default ""', shortCircuit: true };
  if (url.endsWith('.js') || url.endsWith('.mjs')) {
    // S7 QA audit (22 Nov): import.meta.glob is a Vite build-time macro, undefined under plain Node, so calling it threw and
    // crashed the whole import chain (src/kit/landLayout.js, landQuality.js, landIndex.js all use it). These files' own
    // comments say a glob that finds nothing should return {} and fall back gracefully, so always answering {} in Node is
    // the behaviour their own design already expects, not a workaround that changes it. The real Vite build is untouched.
    const result = await next(url, context);
    const raw = result && result.source;
    const src = typeof raw === 'string' ? raw : (raw ? Buffer.from(raw).toString('utf8') : null);
    if (src && src.includes('import.meta.glob')) {
      return { ...result, source: src.replace(/import\\.meta\\.glob\\(/g, '((..._g) => ({}))(') };
    }
    return result;
  }
  return next(url, context);
}`;
register('data:text/javascript,' + encodeURIComponent(HOOKS));

// A value that answers every property read, call and `new` with another such value (enough for module top levels).
const any = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === Symbol.iterator ? function* () {} : any()),
  apply: () => any(),
  construct: () => any(),
});
globalThis.document = any();
globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
if (!globalThis.navigator) globalThis.navigator = { userAgent: 'node', maxTouchPoints: 0 };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.location = { search: '', href: 'http://localhost/', hostname: 'localhost' };
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.Image = class { set src(v) {} };
