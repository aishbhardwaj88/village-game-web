/**
 * One URL per file (25 Nov caching plan, task A). ver(url) appends ?v=<content hash> to anything under assets/ or fonts/,
 * using the map vite.config.js builds from tools/asset-hashes.mjs (__ASSET_H__). Same content = same URL across deploys,
 * so the service worker (public/sw.js) and the browser keep it; changed content = new URL, never stale.
 * Idempotent: an url that already carries ?v= is rewritten, never doubled. Unknown files (dev server, manifest.json,
 * cross-origin, data:/blob:) come back untouched.
 * main() installs it as THREE.DefaultLoadingManager's URL modifier, so GLTFLoader / TextureLoader / ImageLoader calls need
 * no edit; raw fetch() and FontFace call sites call ver() themselves. Other agents (src/propGate.js): fetch(ver(url)).
 */
const HASHES = typeof __ASSET_H__ !== 'undefined' ? __ASSET_H__ : {};
const KEY = /(?:^|\/)((?:assets|fonts)\/[^?#]+)/;

export function ver(url) {
  if (typeof url !== 'string' || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const hashIdx = url.indexOf('#');
  const frag = hashIdx >= 0 ? url.slice(hashIdx) : '';
  let rest = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const qIdx = rest.indexOf('?');
  const path = qIdx >= 0 ? rest.slice(0, qIdx) : rest;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) && typeof location !== 'undefined' && !path.startsWith(location.origin)) return url; // cross-origin
  const m = KEY.exec(path);
  const h = m && HASHES[decodeURIComponent(m[1])];
  if (!h) return url;
  let query = qIdx >= 0 ? rest.slice(qIdx + 1).split('&').filter((p) => p && !p.startsWith('v=')) : [];
  query.push('v=' + h);
  return path + '?' + query.join('&') + frag;
}

/** The known hash of a path under public/ ("assets/x.webp"), or '' - for tools and the service worker seeding. */
export function hashOf(p) { return HASHES[p] || ''; }
