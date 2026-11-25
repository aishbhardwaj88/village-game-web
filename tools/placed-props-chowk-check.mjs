// Placed-props check for src/placedPropsChowk.js (her rule, 25 Nov: ROADS MUST BE EMPTY, every standing item >= 0.6 m beyond the drawn road band + dusty edge).
// Road clearance and building maths are the same as tools/vehicle-spots.mjs (imported, so the two can never disagree). Tests, per row:
//   road >= 0.6 m (whole footprint) | building / place footprint >= 0.4 m | trees, ponds, channels, canal, rail, crops >= 0.4 m (not inside)
//   vs parked vehicles of src/villageVehicles.js (footprint overlap) | vs other rows (footprint circles) | wells and hand pumps >= 6 m from every existing well / pump
//   same-file neighbours within 15 m: yaw differs >= 0.35 rad and s differs >= 0.03 | s within 0.92-1.08.
// Usage: node tools/placed-props-chowk-check.mjs   -> one line per row and "FAIL count: N".   Imported by tmp/gen-placed-chowk.mjs to search legal spots.
import fs from 'node:fs';
import { roadInfo, nearestBuilding, distPoly, approved, DIM, samples } from './vehicle-spots.mjs';
const MARGIN = 0.6, BUILD_MIN = 0.4, NATURE_MIN = 0.4, WELL_GAP = 6;
const txt = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const evalLit = (src, name) => {
  const m = src.match(new RegExp(name + ' = (\\{[\\s\\S]*?\\n\\}|\\[[\\s\\S]*?\\n\\]);'));
  return (0, eval)('(' + m[1].replace(/\/\/.*$/gm, '') + ')');
};
const propSrc = txt('../src/placedPropsChowk.js');
const prep = propSrc.replace(/const F = '[^']*', P = '[^']*';/, '').replace(/dir: F/g, "dir: 'F'").replace(/dir: P/g, "dir: 'P'");
export const SIZES = evalLit(prep, 'SIZES');
export const PLACED = evalLit(propSrc, 'PLACED');
const vehSrc = txt('../src/villageVehicles.js');
const vehicles = (0, eval)(vehSrc.match(/VILLAGE_VEHICLES = (\[[\s\S]*?\n\]);/)[1].replace(/\/\/.*$/gm, ''));

// ---- natural obstacles: trees (rings), water / channel / canal / rail ground, crop strips
const nat = [];
const bb = (p) => ({ x0: Math.min(...p.map((q) => q[0])), x1: Math.max(...p.map((q) => q[0])), z0: Math.min(...p.map((q) => q[1])), z1: Math.max(...p.map((q) => q[1])) });
for (const o of approved.objects) {
  const lab = (o.label || '').toLowerCase();
  const isNat = o.kind === 'trees' || o.kind === 'crops' || (o.kind === 'ground' && /pond|channel|canal|rail|platform|water|sleeper/.test(lab));
  if (isNat) for (const r of o.rings) nat.push({ n: o.kind === 'ground' ? lab.split('|')[0].trim() : o.kind, p: r, ...bb(r) });
}
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
export function natureDist(x, z, reach = 4) {
  let best = { d: 1e9, n: '-' };
  for (const o of nat) {
    if (x < o.x0 - reach || x > o.x1 + reach || z < o.z0 - reach || z > o.z1 + reach) continue;
    const d = distPoly(x, z, { p: o.p });
    if (d < best.d) best = { d, n: o.n };
  }
  return best;
}
// ---- existing wells and hand pumps: approved map solids, place anchors, long-walk wells, house pump
export const WELLS = [];
for (const o of approved.objects) if (o.kind === 'solids' && /well|hand pump|pump room/i.test(o.label || '')) { const r = o.rings[0]; WELLS.push({ n: o.label.split('|')[0].trim(), x: r.reduce((s, q) => s + q[0], 0) / r.length, z: r.reduce((s, q) => s + q[1], 0) / r.length }); }
const placesSrc = JSON.parse(txt('../src/layout/mapData.json'));
for (const p of placesSrc.places) if (/well|pump|water_spot|tubewell/.test(p.id)) WELLS.push({ n: p.id, x: p.x, z: p.z });
for (const m of txt('../src/longWalks.js').matchAll(/kind: '(well|pump)', x: ([-\d.]+), z: ([-\d.]+)/g)) WELLS.push({ n: `longwalk_${m[1]}`, x: +m[2], z: +m[3] });
{ const hc = txt('../src/village.js').match(/HOUSE_CENTER = \{[^}]*x: ([-\d.]+)[^}]*z: ([-\d.]+)/); if (hc) WELLS.push({ n: 'house_pump', x: +hc[1] - 2.5, z: +hc[2] + 5.5 }); }
const isWell = (f) => f === 'well_a' || f === 'well_c' || f === 'handpump';
const radius = (f) => Math.max(...SIZES[f].fp) / 2;
const fpSamples = (f, x, z, yaw) => { // same sampling as vehicle-spots, any footprint [w, d]; depth runs along the heading
  const [W, L] = SIZES[f].fp; const fw = [Math.sin(yaw), Math.cos(yaw)], sd = [Math.cos(yaw), -Math.sin(yaw)], pts = [];
  const nl = Math.max(1, Math.ceil(L / 0.4)), nw = Math.max(1, Math.ceil(W / 0.4));
  for (let i = 0; i <= nl; i++) for (let j = 0; j <= nw; j++) { const a = (i / nl - 0.5) * L, b = (j / nw - 0.5) * W; pts.push([x + fw[0] * a + sd[0] * b, z + fw[1] * a + sd[1] * b]); }
  return pts;
};
const angDiff = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
export function testRow(v, others) {
  const msgs = []; let road = 1e9, rid = '', bd = 1e9, bn = '-', nd = 1e9, nn = '-';
  if (!SIZES[v.file]) return { msgs: ['unknown file'], road, rid, bd, bn };
  if (!(v.s >= 0.92 && v.s <= 1.08)) msgs.push(`s ${v.s} outside 0.92-1.08`);
  for (const [px, pz] of fpSamples(v.file, v.x, v.z, v.yaw)) {
    const r = roadInfo(px, pz); if (r.clear < road) { road = r.clear; rid = r.seg.id; }
    const b = nearestBuilding(px, pz, 6); if (b.d < bd) { bd = b.d; bn = b.n; }
    const n = natureDist(px, pz); if (n.d < nd) { nd = n.d; nn = n.n; }
  }
  if (road < MARGIN) msgs.push(`road ${rid} margin ${road.toFixed(2)} < ${MARGIN}`);
  if (isWell(v.file) && bd < 1.5) msgs.push(`${v.file} only ${bd.toFixed(2)} m from ${bn} (< 1.5, a well or pump needs working room)`);
  if (bd < BUILD_MIN) msgs.push(`building ${bn} distance ${bd.toFixed(2)} < ${BUILD_MIN}`);
  if (nd < NATURE_MIN) msgs.push(`${nn} distance ${nd.toFixed(2)} < ${NATURE_MIN}`);
  for (const w of vehicles) { const L = (DIM[w.file] || [2.5, 1.4])[0]; if (Math.hypot(v.x - w.x, v.z - w.z) < L / 2 + radius(v.file) + 0.3) msgs.push(`on vehicle ${w.file} (${w.x}, ${w.z})`); }
  if (isWell(v.file)) for (const w of WELLS) if (Math.hypot(v.x - w.x, v.z - w.z) < WELL_GAP) msgs.push(`${(Math.hypot(v.x - w.x, v.z - w.z)).toFixed(1)} m from existing ${w.n} (< ${WELL_GAP})`);
  others.forEach((w, j) => {
    if (w === v) return;
    const stacked = (v.on && w.file === v.on && Math.hypot(v.x - w.x, v.z - w.z) < 0.05) || (w.on && v.file === w.on && Math.hypot(v.x - w.x, v.z - w.z) < 0.05);
    if (stacked) return;
    const lim = radius(v.file) + radius(w.file) + 0.1;
    if (Math.hypot(v.x - w.x, v.z - w.z) < lim) msgs.push(`overlaps #${j} ${w.file}`);
    if (isWell(v.file) && isWell(w.file) && Math.hypot(v.x - w.x, v.z - w.z) < WELL_GAP) msgs.push(`${w.file} #${j} within ${WELL_GAP} m`);
    if (w.file === v.file && Math.hypot(v.x - w.x, v.z - w.z) < 15 && (angDiff(v.yaw, w.yaw) < 0.35 || Math.abs(v.s - w.s) < 0.03)) msgs.push(`same-way neighbour #${j} ${w.file}`);
  });
  return { msgs, road, rid, bd, bn };
}
export { roadInfo, nearestBuilding, natureDist as nature, fpSamples, radius, vehicles };

if (process.argv[1] && process.argv[1].endsWith('placed-props-chowk-check.mjs')) {
  let fails = 0; const counts = {};
  PLACED.forEach((v, i) => {
    counts[v.file] = (counts[v.file] || 0) + 1;
    const t = testRow(v, PLACED);
    if (t.msgs.length) { fails++; console.log(`FAIL #${i} ${v.file} (${v.x}, ${v.z}): ${t.msgs.join('; ')}`); }
    else console.log(`ok   #${i} ${v.file} (${v.x}, ${v.z}) road clear ${t.road.toFixed(2)} m (${t.rid}), nearest building ${t.bn} ${t.bd.toFixed(2)} m`);
  });
  console.log(`${PLACED.length} props: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  console.log(`existing wells/pumps known: ${WELLS.length}`);
  console.log(`FAIL count: ${fails}`);
  process.exitCode = fails ? 1 : 0;
}
