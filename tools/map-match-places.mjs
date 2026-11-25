#!/usr/bin/env node
// Compares every named place (map existing:true or minor:false) in the approved map with where the game puts it.
// Spec: docs/layout/approved-map-2026-11-25.json ONLY. Flags > 0.5 m or > 5 deg. Usage: node tools/map-match-places.mjs
import { readFileSync } from 'node:fs';
globalThis.__DOPAHAR_LAYOUT = 'new';
const raw = JSON.parse(readFileSync(new URL('../docs/layout/approved-map-2026-11-25.json', import.meta.url), 'utf8'));
const pack = JSON.parse(readFileSync(new URL('../src/layout/mapData.json', import.meta.url), 'utf8'));
const { ANCHORS } = await import('../src/anchors.js');
const { ANCHOR_SOURCE } = await import('../src/layout/layout.js');
const packed = Object.fromEntries(pack.places.map((p) => [p.id, p]));
const anchorFor = {};
for (const id of Object.keys(ANCHORS)) anchorFor[ANCHOR_SOURCE[id] || id] = ANCHORS[id];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let checked = 0, bad = 0, worstM = 0;
for (const p of raw.places) {
  if (!(p.existing || p.minor === false)) continue;
  const g = packed[p.id], a = anchorFor[p.id];
  if (!g || !a) continue; // only places the game positions through ANCHORS
  checked++;
  const mapYaw = Math.atan2(p.front[0], p.front[1]);
  const dPack = Math.hypot(g.x - p.x, g.z - p.z), dFront = Math.abs(wrap(g.frontYaw - mapYaw)) * 180 / Math.PI;
  const dAnc = a ? Math.hypot(a.x - p.x, a.z - p.z) : null;
  const dRy = a ? Math.abs(wrap(a.ry - g.ry)) * 180 / Math.PI : null;
  worstM = Math.max(worstM, dPack, dAnc || 0);
  const flag = dPack > 0.5 || (!g.untouched && dFront > 5) || (dAnc !== null && dAnc > 0.5) || (dRy !== null && dRy > 5);
  if (flag) bad++;
  if (flag || process.argv.includes('--all'))
    console.log(`${flag ? 'FLAG' : 'ok  '} ${p.id.padEnd(18)} map ${p.x},${p.z} front ${p.front} | game ${g.x},${g.z} pos ${dPack.toFixed(2)}m front ${dFront.toFixed(1)}deg` + (a ? ` | anchor ${a.x.toFixed(1)},${a.z.toFixed(1)} ${dAnc.toFixed(2)}m ry-vs-map-ry ${dRy.toFixed(1)}deg` : ' | no anchor'));
}
console.log(`${checked} places checked, ${bad} flagged, worst ${worstM.toFixed(2)} m`);
