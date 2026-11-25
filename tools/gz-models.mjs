#!/usr/bin/env node
/**
 * Step 3 of the loading plan (25 Nov): GitHub Pages does not gzip .glb, so models travel at full size. Run AFTER the build on dist/:
 * every non-character .glb becomes <name>.glb.gz (gzip level 9, the plain file is removed from dist only) and
 * dist/assets/gz-models.json lists them. src/loaders.js reads that list, fetches the .gz and unpacks it in the browser
 * (DecompressionStream, with fflate as the fallback). Characters (skinned models) stay plain: they are already
 * meshopt-compressed by char-diet and are loaded by other code paths. Triangle counts and model contents are unchanged.
 * Without this step (dev server, desktop build) the manifest is absent and everything loads as plain .glb.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { computeAssetHashes, gzModelList } from './asset-hashes.mjs';

const dist = process.argv[2] || 'dist';
const out = [];
let before = 0, after = 0;
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (f.endsWith('.glb')) one(f); } };
function isSkinned(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) return true; // not a GLB: leave it alone
  const len = buf.readUInt32LE(12);
  try { const j = JSON.parse(buf.slice(20, 20 + len).toString()); return !!(j.skins && j.skins.length); } catch (e) { return true; }
}
function one(f) {
  const buf = fs.readFileSync(f);
  if (isSkinned(buf)) return;
  const gz = zlib.gzipSync(buf, { level: 9 });
  fs.writeFileSync(`${f}.gz`, gz); fs.unlinkSync(f);
  out.push(path.relative(dist, f).split(path.sep).join('/'));
  before += buf.length; after += gz.length;
}
walk(dist);
fs.writeFileSync(path.join(dist, 'assets', 'gz-models.json'), JSON.stringify(out.sort()));
// the browser gets its gzipped-model list and the ?v= hashes from the build (vite define, tools/asset-hashes.mjs): they must match what was packed here
const expect = gzModelList(computeAssetHashes()).join('\n'), got = out.join('\n');
if (expect !== got) { console.error('gz-models: packed list differs from tools/asset-hashes.mjs list (a model changed skin status after the build?)'); process.exit(1); }
console.log(`gz-models: ${out.length} models, ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
