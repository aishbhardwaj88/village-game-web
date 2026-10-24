// Static findability audit (A-2c): for each PLACES entry, how far is it from a drawn lane, is it on a signpost/milestone,
// and roughly how long is the walk from the house. Heuristic, no browser. Usage: node tools/findability-audit.mjs [--md]
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/freeRoam.js', import.meta.url), 'utf8');
const placesSrc = src.match(/export const PLACES = (\[[\s\S]*?\n\]);/)[1];
const lanesSrc = src.match(/export const LANES = (\[[\s\S]*?\n\]);/)[1];
const PLACES = eval(placesSrc.replace(/\/\/.*$/gm, ''));
const SPURS = eval(readFileSync(new URL('../src/eastRoad.js', import.meta.url), 'utf8').match(/export const SPURS = (\[[\s\S]*?\n\]);/)[1].replace(/\/\/.*$/gm, ''));
const LANES = eval(lanesSrc.replace(/\/\/.*$/gm, ''));
const way = readFileSync(new URL('../src/wayfinding.js', import.meta.url), 'utf8');
const signed = new Set();
for (const m of way.matchAll(/to: \[([^\]]*)\]/g)) for (const id of m[1].match(/'(\w+)'/g) || []) signed.add(id.replace(/'/g, ''));
const mile = readFileSync(new URL('../src/milestones.js', import.meta.url), 'utf8');
for (const id of ['highway', 'mandi']) if (mile.includes(`'${id}'`)) signed.add(id);

const SPEED = 4.0; // m/s, walking (assumed; run is faster)
const WALK_FACTOR = 1.25; // lanes are not straight lines
const distSeg = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - (a[0] + t * dx), p.z - (a[1] + t * dz));
};
const laneDist = (p) => Math.min(...LANES.flatMap((l) => l.slice(1).map((pt, i) => distSeg(p, l[i], pt))));
const house = PLACES.find((p) => p.id === 'house');
const rows = PLACES.filter((p) => p.id !== 'house').map((p) => {
  const ld = laneDist(p), d = Math.hypot(p.x - house.x, p.z - house.z);
  const path = ld <= 10 ? 'on a lane' : ld <= 30 ? 'near a lane' : 'STRANDED';
  const sign = signed.has(p.id);
  const secs = Math.round((d * WALK_FACTOR + Math.max(0, ld - 10)) / SPEED);
  const needsMap = !sign && ld > 30;
  return { id: p.id, en: p.en, dist: Math.round(d), laneDist: Math.round(ld), path, sign, secs, needsMap };
}).sort((a, b) => b.laneDist - a.laneDist);
console.log('id | straight m | m from nearest lane | path | on a signpost/milestone | walk s');
for (const r of rows) console.log(`${r.id} | ${r.dist} | ${r.laneDist} | ${r.path} | ${r.sign ? 'yes' : 'no'} | ${r.secs}${r.needsMap ? '  <-- NOT FINDABLE WITHOUT MAP' : ''}`);
console.log(`\nNot findable without the map: ${rows.filter((r) => r.needsMap).length} of ${rows.length}`);
