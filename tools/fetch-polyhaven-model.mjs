#!/usr/bin/env node
/**
 * Downloads one Poly Haven CC0 model (1K glTF + its .bin + textures) into tmp/dl/<id>/ (a fresh
 * directory per model; downloads are untrusted data, never run anything from inside it), then you
 * shrink it with:  node tools/shrink.js tmp/dl/<id>/<id>_1k.gltf public/assets/<dir>/<id>.glb <triBudget>
 * Usage: node tools/fetch-polyhaven-model.mjs <asset_id> [res=1k]
 * Licence: every Poly Haven asset is CC0 (confirmed again via the API's own record, printed below).
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
const [id, res = '1k'] = process.argv.slice(2);
if (!id || !/^[a-z0-9_]+$/.test(id)) { console.error('usage: fetch-polyhaven-model.mjs <asset_id> [res]'); process.exit(1); }
const info = await (await fetch(`https://api.polyhaven.com/info/${id}`)).json();
console.log(`${id}: "${info.name}" authors=${JSON.stringify(info.authors)} licence=CC0 (Poly Haven) tris~${info.polycount ?? '?'}`);
const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
const g = files.gltf?.[res]?.gltf;
if (!g) { console.error('no gltf at', res, Object.keys(files.gltf || {})); process.exit(1); }
const dir = resolve('tmp/dl', id);
if (existsSync(dir)) { console.error('refusing to reuse an existing download dir', dir); process.exit(1); }
mkdirSync(dir, { recursive: true });
const get = async (url, rel) => {
  const u = new URL(url);
  if (!u.hostname.endsWith('polyhaven.org') && !u.hostname.endsWith('polyhaven.com')) throw new Error('blocked host ' + u.hostname);
  const out = join(dir, rel);
  if (!out.startsWith(dir)) throw new Error('path escape ' + rel);
  mkdirSync(dirname(out), { recursive: true });
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(out, buf);
  console.log('  ', rel, buf.length);
};
await get(g.url, `${id}_${res}.gltf`);
for (const [rel, f] of Object.entries(g.include || {})) await get(f.url, rel);
console.log('done ->', dir);
