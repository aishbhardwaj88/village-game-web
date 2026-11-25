#!/usr/bin/env node
// ZONE MAP BAKE (ORDER-26NOV). Runs the first-draft rules of src/groundZones.js (zoneAt) over the village and writes the low-res
// zone map the ground shader reads: public/assets/textures_mix/ground_zones/zonemap.png (R zone id, G neighbour zone id,
// B distance to the border in 1/16 m, no alpha) plus a flat-colour preview at tmp/zonemap-debug.png.
// The PNG is the file to paint over: keep R as the zone id (see ZONES in src/groundZones.js); re-run this script with --keep-paint
// to rebuild G and B (neighbour and border distance) from a hand-edited R without touching the ids.
// Usage: node tools/zone-map-bake.mjs [--keep-paint]
import './missions-node-env.mjs';
globalThis.__DOPAHAR_LAYOUT = 'new';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const { ZONES, ZONE_MAP, zoneAt } = await import('../src/groundZones.js');
const OUT = 'public/assets/textures_mix/ground_zones/zonemap.png';
const N = ZONE_MAP.size, C = ZONE_MAP.cell;
const keep = process.argv.includes('--keep-paint');
const ids = new Uint8Array(N * N);
if (keep) {
  const { data, info } = await sharp(OUT).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < N * N; i++) ids[i] = data[i * info.channels];
} else {
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) ids[j * N + i] = zoneAt(ZONE_MAP.x0 + (i + 0.5) * C, ZONE_MAP.z0 + (j + 0.5) * C);
}
// distance to the nearest texel with a different zone (3-4 chamfer, two passes), carrying that texel's id as the neighbour
const INF = 1e9, dist = new Float32Array(N * N).fill(INF), nb = new Uint8Array(N * N);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const k = j * N + i; nb[k] = ids[k];
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= N || b >= N) continue;
    if (ids[b * N + a] !== ids[k]) { dist[k] = 0; nb[k] = ids[b * N + a]; break; }
  }
}
const relax = (k, a, b, w) => { if (a < 0 || b < 0 || a >= N || b >= N) return; const q = b * N + a, d = dist[q] + w; if (d < dist[k]) { dist[k] = d; nb[k] = nb[q]; } };
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; relax(k, i - 1, j, 1); relax(k, i, j - 1, 1); relax(k, i - 1, j - 1, 1.414); relax(k, i + 1, j - 1, 1.414); }
for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) { const k = j * N + i; relax(k, i + 1, j, 1); relax(k, i, j + 1, 1); relax(k, i + 1, j + 1, 1.414); relax(k, i - 1, j + 1, 1.414); }
const rgb = Buffer.alloc(N * N * 3), dbg = Buffer.alloc(N * N * 3), count = new Map();
for (let k = 0; k < N * N; k++) {
  const d = dist[k] >= INF ? 255 : Math.min(255, Math.round((dist[k] + 0.5) * C * 16));
  rgb[k * 3] = ids[k]; rgb[k * 3 + 1] = d >= 255 ? ids[k] : nb[k]; rgb[k * 3 + 2] = d;
  const z = ZONES.find((q) => q.id === ids[k]) || ZONES[0];
  dbg[k * 3] = (z.dbg >> 16) & 255; dbg[k * 3 + 1] = (z.dbg >> 8) & 255; dbg[k * 3 + 2] = z.dbg & 255;
  count.set(ids[k], (count.get(ids[k]) || 0) + 1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.mkdirSync('tmp', { recursive: true });
await sharp(rgb, { raw: { width: N, height: N, channels: 3 } }).png({ compressionLevel: 9 }).toFile(OUT);
await sharp(dbg, { raw: { width: N, height: N, channels: 3 } }).png().toFile('tmp/zonemap-debug.png');
console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB), ${N}x${N} at ${C} m/texel, origin (${ZONE_MAP.x0}, ${ZONE_MAP.z0})`);
for (const z of ZONES) console.log(`  zone ${String(z.id).padStart(2)} ${z.name.padEnd(34)} ${(((count.get(z.id) || 0) * C * C) / 1e4).toFixed(2)} ha`);
