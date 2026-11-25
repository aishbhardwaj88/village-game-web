#!/usr/bin/env node
// Her rule: NO OBJECT MAY STAND ON A ROAD. Lists every placement whose footprint touches a road band (kinds highway, road, lane,
// back, track; half-width = width / 2). Usage: node tools/road-clearance.mjs   (report only, exit 0)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
globalThis.__DOPAHAR_LAYOUT = 'new';
const map = JSON.parse(readFileSync(new URL('../src/layout/mapData.json', import.meta.url), 'utf8'));
const { nearestRoad } = await import('../src/layout/layoutCore.js');
const { planMapObjects } = await import('../src/kit/mapObjectsPlan.js');
const roads = map.roads.map((r) => ({ ...r, bbox: [Math.min(...r.pts.map((p) => p[0])), Math.min(...r.pts.map((p) => p[1])), Math.max(...r.pts.map((p) => p[0])), Math.max(...r.pts.map((p) => p[1]))] }));
const hits = [];
const test = (src, id, x, z, r) => { const n = nearestRoad(roads, x, z); if (n && n.edge < r) hits.push(`${src.padEnd(12)} ${String(id).padEnd(34)} (${x.toFixed(1)},${z.toFixed(1)}) r=${r.toFixed(1)} on ${n.road.id}/${n.road.kind} by ${(r - n.edge).toFixed(2)} m`); };
const ctr = (ring) => ring.reduce((a, p) => [a[0] + p[0] / ring.length, a[1] + p[1] / ring.length], [0, 0]);
const rad = (ring) => { const c = ctr(ring); return Math.max(...ring.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1]))); };
// 1. the map's own small objects (raw)
for (const o of map.objects) {
  const k = o.label.split('|')[0].trim(), ring = o.rings?.[0];
  if (!ring) continue;
  const c = ctr(ring), r = rad(ring);
  if (k === 'new_Hand pump') test('map-pump', o.id, c[0], c[1], 1.2);
  else if (k === 'new_pots') test('map-pot', o.id, o.cx ?? c[0], o.cz ?? c[1], o.r || 0.35);
  else if (/Transformer|Resting|notice|trough|machan|scarecrow|Barber|Washing|Haystack|straw|Dung|Well|well|milestone/i.test(k + o.label)) test('map-small', o.id + ' ' + k, c[0], c[1], Math.min(r, 3));
}
// 2. after the planner's own nudge
const plan = planMapObjects({ roads, objects: map.objects });
for (const d of plan.designs) test('plan', d.id + ' ' + d.kind, d.x, d.z, Math.hypot(d.w || 1.5, d.d || 1) / 2);
for (const p of plan.pots) test('plan-pot', p.id, p.x, p.z, p.r);
console.log('planner nudged:', (plan.nudged || []).length, 'objects');
// 3. map buildings (reported, never nudged)
for (const p of map.places) if (p.x != null) test('building', p.id, p.x, p.z, 0.1);
// 4. old-layout site tables (importable)
for (const [mod, name] of [['../src/rideNooks.js', 'RIDE_NOOK_SITES'], ['../src/longWalks.js', 'LONG_WALK_SITES']]) {
  try { const m = await import(mod); for (const s of m[name]) test(name, s.kind, s.x, s.z, 3.5); } catch (e) { console.log('could not import', mod, e.message.split('\n')[0]); }
}
console.log(hits.join('\n') || 'no hits'); console.log(hits.length, 'items touch a road band');
