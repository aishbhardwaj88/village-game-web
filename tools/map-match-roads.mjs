#!/usr/bin/env node
// MAP MATCH: roads, canal, railway vs docs/layout/approved-map-2026-11-25.json (the only spec).
// For every road in the map: max deviation (m) between the game's DRAWN centreline (src/mapRoads.js allRoadLines, after the
// network's own corner rounding, roadNetwork.filletPolyline) and the map polyline, both ways, plus width and kind. Lists
// roads the game lacks, EXTRA lines the game draws that the map does not have, canal and railway coordinates.
// Usage: node tools/map-match-roads.mjs   (exit 1 when any road deviates > 0.5 m, is missing, is extra or differs in width)
import { readFileSync } from 'node:fs';
import './missions-node-env.mjs';
globalThis.__DOPAHAR_LAYOUT = 'new';
const spec = JSON.parse(readFileSync(new URL('../docs/layout/approved-map-2026-11-25.json', import.meta.url), 'utf8'));
const { allRoadLines } = await import('../src/mapRoads.js');
const { filletPolyline } = await import('../src/roadNetwork.js');
const { CHAURAHA } = await import('../src/mapPlan.js');
const TOL = 0.5;

const dSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L)); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dz - p[1]); };
const dPoly = (p, pts) => { let m = Infinity; for (let i = 1; i < pts.length; i++) m = Math.min(m, dSeg(p, pts[i - 1], pts[i])); return m; };
const resample = (pts, step = 0.5) => { const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return out; };
const nearRing = (p) => Math.hypot(p[0] - CHAURAHA.x, p[1] - CHAURAHA.z) < CHAURAHA.ringR + 0.6; // the chauraha ring replaces the road inside it

const game = allRoadLines();
const gameBy = new Map(); // map id -> its game lines (main_road / cross_road are split at the ring)
for (const l of game) { const id = l.id.replace(/_(s|e)$/, ''); if (!gameBy.has(id)) gameBy.set(id, []); gameBy.get(id).push(l); }
const specIds = new Set(spec.roads.map((r) => r.id));
let bad = 0;
const rows = [];
for (const r of spec.roads) {
  const gl = gameBy.get(r.id);
  if (!gl) { rows.push(`MISSING  ${r.id}`); bad++; continue; }
  const drawn = gl.map((l) => filletPolyline(l.pts, l.closed, l.w));
  let dev = 0;
  for (const d of drawn) for (const p of resample(d)) dev = Math.max(dev, dPoly(p, r.pts)); // game -> map
  let cover = 0; // map -> game (a missing stretch)
  for (const p of resample(r.pts)) if (!nearRing(p)) cover = Math.max(cover, Math.min(...drawn.map((d) => dPoly(p, d))));
  const w = gl[0].w, kind = gl[0].kind;
  const flags = [];
  if (Math.max(dev, cover) > TOL) flags.push(`DEV ${Math.max(dev, cover).toFixed(2)} m`);
  if (Math.abs(w - r.width) > 0.01) flags.push(`WIDTH game ${w} map ${r.width}`);
  if (kind !== r.kind) flags.push(`KIND game ${kind} map ${r.kind}`);
  if (flags.length) bad++;
  rows.push(`${flags.length ? 'FAIL' : 'ok  '}  ${r.id.padEnd(30)} ${r.kind.padEnd(7)} w${String(r.width).padEnd(4)} dev ${dev.toFixed(2)} cover ${cover.toFixed(2)} ${flags.join('; ')}`);
}
const extras = [...gameBy.keys()].filter((id) => !specIds.has(id) && id !== 'chauraha_ring');
for (const id of extras) { rows.push(`EXTRA    ${id} (drawn by the game, not in the map)`); bad++; }
console.log(rows.join('\n'));
const ro = spec.objects.find((o) => /^road_roundabout/.test(o.label));
if (ro) { const xs = ro.rings[0].map((p) => p[0]), zs = ro.rings[0].map((p) => p[1]); const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cz = (Math.max(...zs) + Math.min(...zs)) / 2, R = (Math.max(...xs) - Math.min(...xs)) / 2; const e = Math.hypot(cx - CHAURAHA.x, cz - CHAURAHA.z), eR = Math.abs(R - (CHAURAHA.ringR + CHAURAHA.ringW / 2)); console.log(`roundabout map centre ${cx.toFixed(1)},${cz.toFixed(1)} R ${R.toFixed(1)}; game centre off ${e.toFixed(2)} m, outer radius off ${eR.toFixed(2)} m`); if (e > TOL || eR > TOL) bad++; }

// canal: water + banks vs map
const c = spec.canal, cg = (await import('../src/layout/layout.js')).getCanal();
console.log(`canal map centre_x ${c.centre_x} width ${c.width} bank ${c.bank} bank_track_x ${c.bank_track_x}; game ${cg.centre_x}/${cg.width}/${cg.bank}/${cg.bank_track_x}`);
if (cg.centre_x !== c.centre_x || cg.width !== c.width || cg.bank_track_x !== c.bank_track_x) bad++;
const src = readFileSync(new URL('../src/canal.js', import.meta.url), 'utf8') + readFileSync(new URL('../src/kit/landCanal.js', import.meta.url), 'utf8');
console.log('canal source mentions NEW_X 824:', /NEW_X\s*=\s*824/.test(src));

// railway: bed x 389.8..394.2, z -330..330; crossings, platform, station, shelter, hall read straight from the map objects
const rail = spec.objects.filter((o) => /^new_(rail|platform|boom|Railway|Ticket)/.test(o.label));
const rsrc = readFileSync(new URL('../src/kit/railway.js', import.meta.url), 'utf8');
const bedX = +/BED_X = (\d+)/.exec(rsrc)[1], z0 = +/LINE_Z0 = (-?\d+)/.exec(rsrc)[1], z1 = +/LINE_Z1 = (-?\d+)/.exec(rsrc)[1];
const bed = spec.objects.find((o) => /^new_rail_bed \| Railway track bed/.test(o.label)).rings[0];
const bx = (Math.min(...bed.map((p) => p[0])) + Math.max(...bed.map((p) => p[0]))) / 2;
console.log(`railway: game bed x ${bedX} z ${z0}..${z1}; map bed centre x ${bx} z ${Math.min(...bed.map((p) => p[1]))}..${Math.max(...bed.map((p) => p[1]))}; ${rail.length} map rail objects, built from them unmoved (railway.js objs())`);
if (Math.abs(bx - bedX) > 0.5) bad++;
// no road band through a railway building / platform; crossings sit on a road
const bands = spec.roads.map((r) => ({ r, hw: r.width / 2 }));
const inPoly = (p, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if ((ring[i][1] > p[1]) !== (ring[j][1] > p[1]) && p[0] < (ring[j][0] - ring[i][0]) * (p[1] - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) ins = !ins; return ins; };
for (const o of rail) {
  const ring = o.rings[0], name = o.label.split('|')[0].trim();
  const isXing = /crossing/.test(name), isBuild = /Railway station|Ticket|platform|shelter/i.test(o.label) && !/crossing/.test(name);
  const xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]);
  const cen = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
  if (isXing) { const best = bands.map((b) => ({ id: b.r.id, d: dPoly(cen, b.r.pts) })).sort((a, b) => a.d - b.d)[0]; console.log(`crossing "${o.label.split('|')[1].trim()}" centre ${cen.map((v) => v.toFixed(1))}: nearest road ${best.id} ${best.d.toFixed(1)} m off its centreline`); }
  if (isBuild) { let hit = 0, worst = ''; for (const b of bands) for (const p of resample(b.r.pts, 0.5)) { const d = 0; if (inPoly(p, ring)) { hit++; worst = b.r.id; } } if (hit) { console.log(`ROAD CENTRELINE THROUGH ${o.label}: ${worst}`); bad++; } }
}
console.log(bad ? `\n${bad} problem(s)` : '\nall roads match the map');
process.exit(bad ? 1 : 0);
