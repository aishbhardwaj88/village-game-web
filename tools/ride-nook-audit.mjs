#!/usr/bin/env node
/**
 * PARALLEL.md PRIORITY 0b: "ride every road and lane end to end. If any stretch longer than about 8 seconds has nothing
 * worth looking at, put something there." A cycle does ~4-5 m/s, so 8 s is ~35 m.
 *
 * Method: every road and lane centreline of the 1 Nov map (docs/layout/village-plan-positions-2026-11-01.json, +MAP_SHIFT,
 * the same data tools/gap-list.mjs and tools/road-front-audit.mjs read) is sampled every 10 m of arc length. Each sample's
 * distance to the nearest INTERESTING item is measured. A run of consecutive samples with nothing within 15 m is a bare
 * stretch; a stretch is reported when it is longer than 35 m (run length = samples x 10 m).
 *
 * Interesting (static parse of the source, no browser):
 *  - places: every ANCHORS point (labels eastgali/westgali/highway/canal and open land field/cane skipped) and every built
 *    place shape on the 1 Nov map (NEW / not-built skipped; distance to the outline, 0 inside)
 *  - scenes, each spot resolved through its anchor (localPt): src/lifeScenes.js, src/lifeScenes2.js (requested spot; the game
 *    may slide it up to 30 m to clear ground), src/vendors.js, src/vendors2.js, src/smallShops.js, src/roadEvents.js (cow,
 *    goats, thela, khoonta points on their map lanes), src/nostalgia.js, src/villageFurniture.js .. villageFurniture4.js
 *  - also counted, because a rider sees them just the same: src/longWalks.js sites, src/villageOddities.js,
 *    src/villageFixtures.js, src/iceCreamCarts.js, src/scooters.js, src/milkCentre.js, and src/rideNooks.js (this audit's fill)
 * NOT counted: houses, abadi rows, trees, fields, lamps, haystacks/pumps that are part of a place yard (the place counts).
 *
 * Usage: node tools/ride-nook-audit.mjs [reach=15] [minRun=35]  -> docs/ride-nooks-<date>.md (+ JSON on stdout with --json)
 */
import fs from 'fs';
import { MAP_SHIFT } from '../src/mapPlan.js';
import { ANCHORS, localPt } from '../src/anchors.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const REACH = parseFloat(args[0] || '15');
const MIN_RUN = parseFloat(args[1] || '35');
const STEP = 10;
const MAP = JSON.parse(fs.readFileSync('docs/layout/village-plan-positions-2026-11-01.json', 'utf8'));
const sh = ([x, z]) => [x + MAP_SHIFT.x, z + MAP_SHIFT.z];
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');

// ---------- roads and lanes, same ids as src/mapRoads.js mapRoadLines() ----------
const lines = [];
for (const [id, r] of Object.entries(MAP.roads)) {
  const pts = r.centreline.map(sh);
  if (r.closed) pts.push(pts[0]);
  lines.push({ id, name: id, kind: id === 'highway' ? 'highway' : 'road', w: r.width_m, pts, closed: !!r.closed });
}
MAP.lanes_and_tracks.forEach((l, i) => {
  const kind = /front path/.test(l.type) ? 'front path' : /back/.test(l.type) ? 'back lane' : /farm/.test(l.type) ? 'farm track' : 'village lane';
  const pts = l.centreline.map(sh);
  if (l.closed) pts.push(pts[0]);
  lines.push({ id: `${i}_${l.name}`, name: l.name, kind, w: l.width_m, pts, closed: !!l.closed });
});

// ---------- interesting items ----------
const items = []; // { src, label, x, z } points
const shapes = []; // { src, label, pts } closed polygons
const SKIP_ANCHOR = new Set(['eastgali', 'westgali', 'highway', 'canal', 'field', 'cane']);
for (const [id, a] of Object.entries(ANCHORS)) if (!SKIP_ANCHOR.has(id)) items.push({ src: 'place', label: id, x: a.x, z: a.z });
for (const p of MAP.places) {
  if (/NEW|not built/i.test(String(p.in_code_today))) continue;
  if (/field|crop|orchard/i.test(String(p.map_name || ''))) continue;
  for (const s of p.shapes || []) if (s.corners) shapes.push({ src: 'place', label: p.map_name || p.in_code_today, pts: s.corners.map(sh) });
}
const at = (id, lx, lz) => (ANCHORS[id] ? localPt(id, lx, lz) : null);

/** Every `{ at|anchor: 'id', ... lx: n, ... lz: n }` (and `tx/tz`) object literal in a file. */
function anchorSpots(file, src) {
  const t = read(file);
  for (const m of t.matchAll(/\{[^{}]*?\b(?:at|anchor):\s*'(\w+)'[^{}]*?\b[lt]x:\s*(-?[\d.]+)[^{}]*?\b[lt]z:\s*(-?[\d.]+)[^{}]*?\}?/g)) {
    const q = at(m[1], +m[2], +m[3]);
    if (q) items.push({ src, label: `${m[1]} (${m[2]}, ${m[3]})`, x: q.x, z: q.z });
  }
}
// chaupal scenes (src/lifeScenes.js): bare { lx, lz } in LIFE_SCENES, all on yard_chaupal
{
  const t = read('src/lifeScenes.js');
  const blk = t.slice(t.indexOf('LIFE_SCENES = {'), t.indexOf('};', t.indexOf('LIFE_SCENES = {')));
  for (const m of blk.matchAll(/(\w+):\s*\{\s*lx:\s*(-?[\d.]+),\s*lz:\s*(-?[\d.]+)/g)) {
    const q = at('yard_chaupal', +m[2], +m[3]);
    if (q) items.push({ src: 'lifeScenes', label: m[1], x: q.x, z: q.z });
  }
}
// life scenes 2: ['name', 'anchor', lx, lz, ...]
for (const m of read('src/lifeScenes2.js').matchAll(/\['(\w+)',\s*'(\w+)',\s*(-?[\d.]+),\s*(-?[\d.]+),/g)) {
  const q = at(m[2], +m[3], +m[4]);
  if (q) items.push({ src: 'lifeScenes2', label: `${m[1]} near ${m[2]}`, x: q.x, z: q.z });
}
// chowk-relative dx/dz (vendors, small shops)
for (const [file, src] of [['src/vendors.js', 'vendors'], ['src/smallShops.js', 'smallShops']]) {
  for (const m of read(file).matchAll(/kind:\s*'(\w+)',\s*dx:\s*(-?[\d.]+),\s*dz:\s*(-?[\d.]+)/g)) {
    const c = ANCHORS.chowk;
    if (c) items.push({ src, label: m[1], x: c.x + +m[2], z: c.z + +m[3] });
  }
}
// road events: { road, seg, t } / ts on map lines
{
  const t = read('src/roadEvents.js');
  const frame = (name, seg, tt) => {
    const l = lines.find((q) => q.id === name || q.id.endsWith(`_${name}`));
    if (!l) return null;
    const s = Math.min(seg, l.pts.length - 2);
    const [ax, az] = l.pts[s], [bx, bz] = l.pts[s + 1];
    return { x: ax + (bx - ax) * tt, z: az + (bz - az) * tt };
  };
  for (const m of t.matchAll(/const (\w+_(?:SITE|LANE)) = \{ road: '([^']+)', seg: (\d+), (?:t: ([\d.]+)|ts: \[([^\]]+)\])/g)) {
    const ts = m[4] ? [+m[4]] : m[5].split(',').map(Number);
    for (const tt of ts) { const q = frame(m[2], +m[3], tt); if (q) items.push({ src: 'roadEvents', label: `${m[1]} on ${m[2]}`, ...q }); }
  }
}
// vendors2, nostalgia, furniture 1-4, oddities, fixtures, ice-cream carts, scooters: anchor-local spots
for (const [file, src] of [['src/vendors2.js', 'vendors2'], ['src/nostalgia.js', 'nostalgia'], ['src/villageFurniture.js', 'villageFurniture'],
  ['src/villageFurniture2.js', 'villageFurniture2'], ['src/villageFurniture3.js', 'villageFurniture3'], ['src/villageFurniture4.js', 'villageFurniture4'],
  ['src/villageOddities.js', 'villageOddities'], ['src/villageFixtures.js', 'villageFixtures'], ['src/iceCreamCarts.js', 'iceCreamCarts'], ['src/scooters.js', 'scooters']])
  anchorSpots(file, src);
// world-placed site tables: longWalks, milkCentre, rideNooks
for (const [file, src] of [['src/longWalks.js', 'longWalks'], ['src/milkCentre.js', 'milkCentre'], ['src/rideNooks.js', 'rideNooks']]) {
  for (const m of read(file).matchAll(/\{\s*(?:kind:\s*'(\w+)',\s*)?x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)/g)) items.push({ src, label: m[1] || src, x: +m[2], z: +m[3] });
}

// ---------- geometry ----------
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};
const inside = (px, pz, pts) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const shapeDist = (px, pz, pts) => {
  if (inside(px, pz, pts)) return 0;
  let d = Infinity;
  for (let i = 0; i < pts.length; i++) d = Math.min(d, segDist(px, pz, pts[i], pts[(i + 1) % pts.length]));
  return d;
};
function nearestItem(x, z) {
  let best = { d: Infinity, label: '-', src: '-' };
  for (const it of items) { const d = Math.hypot(it.x - x, it.z - z); if (d < best.d) best = { d, label: it.label, src: it.src }; }
  for (const s of shapes) { const d = shapeDist(x, z, s.pts); if (d < best.d) best = { d, label: s.label, src: s.src }; }
  return best;
}
/** Points every STEP m of arc length along a polyline, each with its along-distance and segment direction. */
function sample(pts) {
  const out = [];
  let along = 0, next = STEP / 2;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    while (next <= along + L) {
      const t = (next - along) / (L || 1);
      out.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, along: next, dx: (bx - ax) / (L || 1), dz: (bz - az) / (L || 1) });
      next += STEP;
    }
    along += L;
  }
  return { out, length: along };
}

// ---------- stretches ----------
const stretches = [];
let sampled = 0, totalLen = 0;
for (const l of lines) {
  const { out, length } = sample(l.pts);
  totalLen += length;
  sampled += out.length;
  const bare = out.map((p) => ({ ...p, near: nearestItem(p.x, p.z) })).map((p) => ({ ...p, bare: p.near.d > REACH }));
  // runs of bare samples (a closed loop's first and last runs join)
  const runs = [];
  let cur = null;
  bare.forEach((p, i) => {
    if (p.bare) { if (!cur) cur = { i0: i, i1: i }; else cur.i1 = i; } else if (cur) { runs.push(cur); cur = null; }
  });
  if (cur) runs.push(cur);
  if (l.closed && runs.length > 1 && runs[0].i0 === 0 && runs[runs.length - 1].i1 === bare.length - 1) {
    const last = runs.pop();
    runs[0] = { i0: last.i0, i1: runs[0].i1 + bare.length, wrap: bare.length };
  }
  for (const r of runs) {
    const n = r.i1 - r.i0 + 1;
    const len = n * STEP;
    if (len <= MIN_RUN) continue;
    const at = (k) => bare[k % bare.length];
    const mid = at(Math.floor((r.i0 + r.i1) / 2));
    let worst = 0;
    for (let k = r.i0; k <= r.i1; k++) worst = Math.max(worst, at(k).near.d);
    stretches.push({ line: l.id, name: l.name, kind: l.kind, w: l.w, len, from: at(r.i0).along - STEP / 2, to: at(r.i1).along + STEP / 2,
      start: [at(r.i0).x, at(r.i0).z], end: [at(r.i1).x, at(r.i1).z], mid: [mid.x, mid.z], dir: [mid.dx, mid.dz], worst, nearMid: mid.near });
  }
}
stretches.sort((a, b) => b.len - a.len || b.worst - a.worst);

if (process.argv.includes('--json')) { console.log(JSON.stringify({ items: items.length, shapes: shapes.length, stretches }, null, 1)); process.exit(0); }

// ---------- report ----------
const date = new Date().toISOString().slice(0, 10);
const f1 = (v) => v.toFixed(1);
const byKind = {};
for (const s of stretches) { byKind[s.kind] = byKind[s.kind] || { n: 0, m: 0 }; byKind[s.kind].n++; byKind[s.kind].m += s.len; }
const srcCount = {};
for (const it of items) srcCount[it.src] = (srcCount[it.src] || 0) + 1;
let md = `# Ride nooks audit, ${date}\n\n`;
md += `PARALLEL.md PRIORITY 0b: every road and lane stretch longer than ~8 s of cycling (~${MIN_RUN} m at 4-5 m/s) must have something worth looking at within sight.\n\n`;
md += `Generated by \`node tools/ride-nook-audit.mjs\` (static: reads the 1 Nov map and the scene tables in src/, no browser). `;
md += `Every road/lane centreline sampled every ${STEP} m (${sampled} samples over ${Math.round(totalLen)} m of centreline). `;
md += `A sample is bare when no interesting item is within ${REACH} m; a run of bare samples longer than ${MIN_RUN} m is listed.\n\n`;
md += `Interesting items counted: ${items.length} points + ${shapes.length} map place outlines. Points by source: ${Object.entries(srcCount).map(([k, v]) => `${k} ${v}`).join(', ')}.\n`;
md += `Not counted: houses, abadi rows, trees, fields, lamps. lifeScenes2 spots are the requested spot (the game may slide them up to 30 m).\n\n`;
md += `## Summary\n\n${stretches.length} bare stretches, ${stretches.reduce((s, x) => s + x.len, 0)} m in all.\n\n| kind | stretches | metres |\n|---|---|---|\n`;
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1].m - a[1].m)) md += `| ${k} | ${v.n} | ${v.m} |\n`;
md += `\n## Every bare stretch, longest first\n\nCoordinates are world metres (x east, z south). "Along" is metres from the line's first point. "Worst gap" is the largest distance from a sample to anything interesting. "Nearest at mid" is what the middle sample is closest to.\n\n`;
md += `| # | line | kind | length m | along m | start (x, z) | end (x, z) | worst gap m | nearest at mid |\n|---|---|---|---|---|---|---|---|---|\n`;
stretches.forEach((s, i) => {
  md += `| ${i + 1} | ${s.name} | ${s.kind} | ${s.len} | ${Math.round(s.from)}-${Math.round(s.to)} | ${f1(s.start[0])}, ${f1(s.start[1])} | ${f1(s.end[0])}, ${f1(s.end[1])} | ${f1(s.worst)} | ${s.nearMid.src}: ${s.nearMid.label} (${f1(s.nearMid.d)} m) |\n`;
});
const out = `docs/ride-nooks-${date}.md`;
fs.writeFileSync(out, md);
console.log(`${out}: ${stretches.length} bare stretches (${stretches.reduce((s, x) => s + x.len, 0)} m); items ${items.length}, shapes ${shapes.length}`);
for (const s of stretches.slice(0, 25)) console.log(`${String(s.len).padStart(5)} m  ${s.kind.padEnd(12)} ${s.name.padEnd(42)} ${Math.round(s.from)}-${Math.round(s.to)}  mid ${f1(s.mid[0])},${f1(s.mid[1])}  worst ${f1(s.worst)}`);
