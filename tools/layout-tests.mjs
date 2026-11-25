#!/usr/bin/env node
/**
 * LAYOUT TESTS for the approved 21 Nov map (?layout=new). Measured, never judged. Exit 1 on any failure.
 *
 *  0. SYNC     src/layout/mapData.json is the packed copy of docs/layout/approved-map-2026-11-25.json.
 *  1. ANCHORS  every existing place's "before" position is where src/anchors.js has it today (coordinate frame check).
 *  2. FRONT    every named building's front edge faces its nearest road: the road is in front of it, the gap from the front
 *              edge to the road edge is at most 3 m, and the front edge is parallel to the road within 3 deg.
 *  3. ROAD     no building footprint and no tree trunk stands on a road's carriageway.
 *  4. GROUND   nothing floats or sinks: no footprint over the pond / johad dip (the game's own ground height, src/dips.js
 *              dipHeightRaw with the new anchors) or in the canal water.
 *  5. OVERLAP  no two building footprints overlap (and no tree trunk inside a building).
 *
 * "Named building" = an existing place with a built footprint (src/layout/footprints.js, not open ground) or a map place
 * that sits on a solid footprint and is not a small prop (pumps, wells, washing lines, milestones...). Houses (new_house)
 * are checked by 3, 4 and 5; their front is reported (not failed) in 2, because each house's front is chosen as the side
 * nearest its gali by the loader.
 *
 * Usage: node tools/layout-tests.mjs [--district NAME] [--verbose] [--json out.json]
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

globalThis.__DOPAHAR_LAYOUT = 'new';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const DISTRICT = args.includes('--district') ? args[args.indexOf('--district') + 1] : null;
const JSON_OUT = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
// --as-drawn: test the new shops/houses where the map DRAWS them (their rings), not where the snap puts them (o.rect); existing
// places, roads and galis as the game uses them. This is what is built while a kit still places from o.rings[0].
const AS_DRAWN = args.includes('--as-drawn');

const { inputsHash, OUT, compact, SRC } = await import('./layout-pack.mjs');
const L = await import('../src/layout/layout.js');
const C = await import('../src/layout/layoutCore.js');
const S = await import('../src/layout/layoutSnap.js');
const { ANCHORS } = await import('../src/anchors.js');
const { dipHeightRaw } = await import('../src/dips.js');

const MAX_GAP = 3, MAX_PAR = 3, ROAD_TOL = 0.1, OVERLAP_TOL = 0.05, GROUND_TOL = 0.05;
const results = { sync: [], anchors: [], front: [], road: [], ground: [], overlap: [] };
const fail = (k, row) => results[k].push(row);

// ------------------------------------------------------------------ 0. sync
// the pack records a hash of everything it was derived from (the approved map + the derivation rules); a stale pack fails here
if (JSON.parse(fs.readFileSync(OUT, 'utf8')).inputsHash !== inputsHash()) fail('sync', { what: 'src/layout/mapData.json out of date (node tools/layout-pack.mjs)' });

// ------------------------------------------------------------------ 1. anchors / coordinate frame
const LABELS = new Set(['eastgali', 'westgali']);
for (const r of L.anchorReport) {
  if (LABELS.has(r.src) || r.beforeMatches !== false) continue;
  const p = L.getPlace(r.src);
  const off = Math.hypot(p.before.x - r.old.x, p.before.z - r.old.z);
  if (off > 1) fail('anchors', { id: r.id, what: `map "before" (${p.before.x}, ${p.before.z}) is ${off.toFixed(1)} m from today's anchor (${r.old.x.toFixed(1)}, ${r.old.z.toFixed(1)})` });
}

// ------------------------------------------------------------------ districts (nearest district label of the map)
let layout = L.getLayout();
if (AS_DRAWN) {
  const drawn = C.buildLayout(compact(JSON.parse(fs.readFileSync(SRC, 'utf8'))));
  for (const p of drawn.list) if (p.existing && layout.places[p.id]) Object.assign(p, layout.places[p.id]); // existing places: as the game moves them
  layout = { ...layout, objects: drawn.objects, places: drawn.places, list: drawn.list, nudges: [] };
}
const districts = layout.list.filter((p) => p.id.startsWith('new_zone_')).map((p) => ({ name: p.name, x: p.x, z: p.z }));
const districtOf = (x, z) => {
  let best = null, bd = Infinity;
  for (const d of districts) { const dd = Math.hypot(d.x - x, d.z - z); if (dd < bd) { bd = dd; best = d; } }
  return bd < 140 ? best.name : 'OUTSKIRTS';
};
const inDistrict = (x, z) => !DISTRICT || districtOf(x, z).toLowerCase().includes(DISTRICT.toLowerCase());

// ------------------------------------------------------------------ footprints (the same list the road snap uses)
const buildings = S.footprintItems(layout).map((it) => ({ ...it, cx: it.corners.reduce((s, q) => s + q[0], 0) / 4, cz: it.corners.reduce((s, q) => s + q[1], 0) / 4, open: !!it.open, untouched: !!(it.place && it.place.untouched && it.kind === 'place') }));
const sel = buildings.filter((b) => inDistrict(b.cx, b.cz));
const roads = layout.roads;
const samples = (corners, step = 0.5) => {
  const [p0, p1, , p3] = corners;
  const ux = p1[0] - p0[0], uz = p1[1] - p0[1], vx = p3[0] - p0[0], vz = p3[1] - p0[1];
  const nu = Math.max(1, Math.ceil(Math.hypot(ux, uz) / step)), nv = Math.max(1, Math.ceil(Math.hypot(vx, vz) / step));
  const out = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) out.push([p0[0] + ux * i / nu + vx * j / nv, p0[1] + uz * i / nu + vz * j / nv]);
  return out;
};

// ------------------------------------------------------------------ 2. front faces road
// From 9 points along the front edge, walk straight out along the front (0.25 m steps, up to 30 m) until a road's carriageway
// starts. gap = the shortest such walk; the road hit there must run parallel to the front edge. Untouched places are reported
// (kept exactly as today on the owner's instruction), never failed.
const ACCEPTED = { yard_bhatta: 'kiln set back behind its green strip, as drawn', temple: 'kept exactly as drawn (her order, 25 Nov)', sabzi: 'kept exactly as drawn (her order, 25 Nov)' };
const accepted = [];
const frontRows = [];
for (const b of sel) {
  if (b.open || b.crossing) continue;
  if (!b.named && b.kind !== 'house') continue;
  const pr = C.frontProbe(roads, b.corners, b.front, 30);
  const row = { id: b.id, name: b.name, kind: b.kind, district: districtOf(b.cx, b.cz) };
  if (!pr) { row.road = 'none within 30 m'; row.gap = Infinity; row.par = 90; }
  else { row.road = pr.road.id; row.gap = pr.gap; row.par = pr.par; }
  row.ok = row.gap <= MAX_GAP && row.par <= MAX_PAR;
  if (b.untouched) row.kept = 'untouched';
  frontRows.push(row);
  // ACCEPTED EXCEPTION (integrator, 22 Nov): the brick kiln stands 18 m back from the highway behind its own green strip of
  // neem and shisham, as the approved map draws it ('Green strip (grass and trees between the highway and the kiln)').
  if (!row.ok && ACCEPTED[b.id]) { row.accepted = ACCEPTED[b.id]; accepted.push(row); }
  else if (!row.ok && b.named && !b.untouched) fail('front', row);
}

// ------------------------------------------------------------------ 3. on a road / 4. ground
for (const b of sel) {
  if (b.crossing) continue;
  const worst = C.roadDepth(roads, b.corners, ROAD_TOL);
  if (worst && !b.open && !b.untouched) fail('road', { id: b.id, name: b.name, kind: b.kind, road: worst.road.id, depth: +worst.pen.toFixed(2), district: districtOf(b.cx, b.cz) });
  if (b.kind === 'place' && (b.id === 'pond' || b.id === 'johad')) continue;
  const pts = samples(b.corners);
  let dip = 0;
  for (const [x, z] of pts) dip = Math.max(dip, Math.abs(dipHeightRaw(x, z)));
  const canal = layout.canal;
  const inCanal = pts.some(([x]) => Math.abs(x - canal.centre_x) < canal.width / 2);
  if (dip > GROUND_TOL || inCanal) fail('ground', { id: b.id, name: b.name, kind: b.kind, what: inCanal ? 'in the canal water' : `ground dips ${dip.toFixed(2)} m under it (pond/johad bank)`, district: districtOf(b.cx, b.cz) });
}
for (const t of L.getObjects('trees')) {
  if (!inDistrict(t.cx, t.cz)) continue;
  const h = C.roadUnder(roads, t.cx, t.cz, ROAD_TOL);
  if (h) fail('road', { id: t.id, name: t.name, kind: 'tree', road: h.r.id, depth: +h.pen.toFixed(2), district: districtOf(t.cx, t.cz) });
}

// ------------------------------------------------------------------ 5. overlaps (grid of 20 m cells)
const cell = 20, grid = new Map();
const solidsForOverlap = buildings.filter((b) => !b.crossing && !(b.kind === 'place' && b.open));
const pairKept = (A, B) => A.untouched && B.untouched; // two places the owner keeps exactly as today
solidsForOverlap.forEach((b, i) => {
  const xs = b.corners.map((q) => q[0]), zs = b.corners.map((q) => q[1]);
  b._bb = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  for (let gx = Math.floor(b._bb[0] / cell); gx <= Math.floor(b._bb[2] / cell); gx++) for (let gz = Math.floor(b._bb[1] / cell); gz <= Math.floor(b._bb[3] / cell); gz++) {
    const k = gx + ',' + gz; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i);
  }
});
const seenPair = new Set();
for (const list of grid.values()) for (let a = 0; a < list.length; a++) for (let c = a + 1; c < list.length; c++) {
  const i = Math.min(list[a], list[c]), j = Math.max(list[a], list[c]), key = i + ':' + j;
  if (seenPair.has(key)) continue; seenPair.add(key);
  const A = solidsForOverlap[i], B = solidsForOverlap[j];
  if (!inDistrict(A.cx, A.cz) && !inDistrict(B.cx, B.cz)) continue;
  if (A._bb[2] < B._bb[0] || B._bb[2] < A._bb[0] || A._bb[3] < B._bb[1] || B._bb[3] < A._bb[1]) continue;
  if (A.place && B.place && A.place === B.place && A.kind !== B.kind) continue; // a place and its own footprint object
  if (pairKept(A, B)) continue;
  const ov = C.quadOverlap(A.corners, B.corners);
  if (ov > OVERLAP_TOL) fail('overlap', { a: `${A.id} (${A.name})`, b: `${B.id} (${B.name})`, depth: +ov.toFixed(2), district: districtOf((A.cx + B.cx) / 2, (A.cz + B.cz) / 2) });
}
const inside = (q, corners) => { let s = 0; for (let i = 0; i < 4; i++) { const a = corners[i], c = corners[(i + 1) % 4]; const cr = (c[0] - a[0]) * (q[1] - a[1]) - (c[1] - a[1]) * (q[0] - a[0]); if (cr > 0) s |= 1; else if (cr < 0) s |= 2; } return s !== 3; };
for (const t of L.getObjects('trees')) {
  if (!inDistrict(t.cx, t.cz)) continue;
  for (const b of solidsForOverlap) {
    if (t.cx < b._bb[0] || t.cx > b._bb[2] || t.cz < b._bb[1] || t.cz > b._bb[3]) continue;
    if (inside([t.cx, t.cz], b.corners)) { fail('overlap', { a: `${t.id} (${t.name})`, b: `${b.id} (${b.name})`, depth: 'trunk inside', district: districtOf(t.cx, t.cz) }); break; }
  }
}

// ------------------------------------------------------------------ report
const named = frontRows.filter((r) => r.kind !== 'house');
const houses = frontRows.filter((r) => r.kind === 'house');
const byDistrict = {};
const bump = (d, k) => { byDistrict[d] = byDistrict[d] || { front: 0, frontFail: 0, road: 0, ground: 0, overlap: 0 }; byDistrict[d][k]++; };
for (const r of named) { bump(r.district, 'front'); if (!r.ok) bump(r.district, 'frontFail'); }
for (const k of ['road', 'ground', 'overlap']) for (const r of results[k]) bump(r.district, k);

console.log(`\nLAYOUT TESTS (approved map 21 Nov, ?layout=new)${AS_DRAWN ? ' AS DRAWN (new buildings on their rings, not snapped)' : ''}${DISTRICT ? ` district ~ "${DISTRICT}"` : ''}\n`);
console.log('district'.padEnd(20), 'named', 'front-fail', 'on-road', 'ground', 'overlap');
for (const [d, v] of Object.entries(byDistrict).sort()) console.log(d.padEnd(20), String(v.front).padStart(5), String(v.frontFail).padStart(10), String(v.road).padStart(7), String(v.ground).padStart(6), String(v.overlap).padStart(7));
console.log(`\nhouses facing a road within ${MAX_GAP} m and ${MAX_PAR} deg: ${houses.filter((r) => r.ok).length} / ${houses.length} (reported, not failed)`);
const sections = [['sync', 'map pack'], ['anchors', 'anchor / coordinate check'], ['front', 'front faces road'], ['road', 'on a road'], ['ground', 'floating / sunk'], ['overlap', 'overlaps']];
let total = 0;
for (const [k, title] of sections) {
  const rows = results[k];
  total += rows.length;
  console.log(`\n${rows.length ? 'FAIL' : 'pass'}  ${title}: ${rows.length}`);
  for (const r of rows.slice(0, VERBOSE ? 1e9 : 15)) console.log('   ', Object.entries(r).map(([a, b]) => `${a}=${typeof b === 'number' ? +b.toFixed(2) : b}`).join('  '));
  if (!VERBOSE && rows.length > 15) console.log(`    ... ${rows.length - 15} more (--verbose)`);
}
for (const r of accepted) console.log(`accepted exception: ${r.id} (${r.name}) gap ${r.gap} m: ${r.accepted}`);
const nudges = layout.nudges || [];
console.log(`
road snap (tools/layout-pack.mjs): ${nudges.length} footprints nudged onto their road (${nudges.filter((n) => n.kind === 'place').length} existing places, ${nudges.filter((n) => n.kind === 'solid').length} named new, ${nudges.filter((n) => n.kind === 'house').length} houses); largest move ${Math.max(0, ...nudges.map((n) => n.move)).toFixed(1)} m, largest turn ${Math.max(0, ...nudges.map((n) => Math.abs(n.turnDeg))).toFixed(1)} deg`);
if (VERBOSE) for (const n of nudges) console.log('    nudge', n.id, n.name, 'turn', n.turnDeg, 'move', n.move);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ results, frontRows, byDistrict }, null, 1));
console.log(`\nLAYOUT TESTS: ${total ? 'FAIL' : 'PASS'} (${total} failures; ${named.length} named buildings, ${houses.length} houses, ${buildings.length} footprints checked)`);
process.exit(total ? 1 : 0);
