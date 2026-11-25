// Parked-vehicle spot check (her rule, 25 Nov: ROADS MUST BE EMPTY, every standing item >= 0.6 m beyond the drawn road band + dusty edge).
// Reads VILLAGE_VEHICLES from src/villageVehicles.js and tests each vehicle's whole footprint (length x width, long axis along the heading)
// against the road model (same maths as src/mapRoads.js drawnRoadClearance: half width + max(amp*1.4, apron), chauraha ring included) and
// against building footprints (houses, shopRects.json, EXISTING_FOOTPRINTS, map solids), and against each other.
// Usage: node tools/vehicle-spots.mjs            -> prints one line per vehicle plus FAIL lines, and "FAIL count: N"
//        node tools/vehicle-spots.mjs --suggest  -> searches legal spots near the hard-coded ANCHORS and prints VILLAGE_VEHICLES rows
import fs from 'node:fs';
import { EXISTING_FOOTPRINTS } from '../src/layout/footprints.js';
const R = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const mapData = R('../src/layout/mapData.json');
const approved = R('../docs/layout/approved-map-2026-11-25.json');
const shopRects = R('../src/layout/shopRects.json').rects;
const housePlan = R('../src/kit/housesPlanData.json').rows;
const MARGIN = 0.6, BUILD_MIN = 0.4;
const AMP = { highway: 0.2, road: 0.32, lane: 0.3, back: 0.2, track: 0.45, path: 0.2 };
const APRON = { highway: 0.58, road: 0.42, lane: 0.31, back: 0.19, track: 0.46, path: 0.17 };
// vehicle footprint (length along heading, width) and which model axis is long (z: nose +z; x: nose +x, needs the -90 deg fix in villageVehicles.js)
export const DIM = { old_tractor: [3.5, 1.9], trailer_pack: [3.4, 1.9], auto_rickshaw: [2.65, 1.4], tuk_tuk: [2.65, 1.4], bicycle: [1.75, 0.6], motorbike: [2.0, 0.8], moped: [1.8, 0.7], thela_gadi: [2.4, 1.3], mini_truck: [3.4, 1.8], water_tanker: [5.0, 2.2], thela_b: [2.4, 1.3], willys_jeep: [3.7, 1.7] };

const segs = [];
for (const r of mapData.roads) { const k = r.kind || 'lane'; for (let i = 0; i + 1 < r.pts.length; i++) segs.push({ a: r.pts[i], b: r.pts[i + 1], e: (r.width || 4) / 2 + Math.max((AMP[k] ?? 0.3) * 1.4, APRON[k] ?? 0.31), id: r.id }); }
{ const cx = 602.9, cz = 19.9, ringR = 9.5, ringW = 7; for (let i = 0; i < 40; i++) { const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1) / 40) * Math.PI * 2; segs.push({ a: [cx + Math.cos(a0) * ringR, cz + Math.sin(a0) * ringR], b: [cx + Math.cos(a1) * ringR, cz + Math.sin(a1) * ringR], e: ringW / 2 + Math.max(0.32 * 1.4, 0.42), id: 'chauraha' }); } }
function roadInfo(x, z) {
  let best = 1e9, bs = null;
  for (const s of segs) {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2));
    const c = Math.hypot(x - (s.a[0] + dx * t), z - (s.a[1] + dz * t)) - s.e;
    if (c < best) { best = c; bs = s; }
  }
  return { clear: best, seg: bs };
}
const polys = []; // obstacle polygons (world)
const rect = (cx, cz, ry, lx0, lx1, lz0, lz1) => { const ux = [Math.cos(ry), -Math.sin(ry)], uz = [Math.sin(ry), Math.cos(ry)]; return [[lx0, lz0], [lx1, lz0], [lx1, lz1], [lx0, lz1]].map(([a, b]) => [cx + ux[0] * a + uz[0] * b, cz + ux[1] * a + uz[1] * b]); };
for (const h of housePlan) polys.push({ n: `house#${h[0]}`, p: rect(h[1], h[2], h[3], -h[4] / 2, h[4] / 2, -h[5] / 2, h[5] / 2) });
for (const [k, r] of Object.entries(shopRects)) polys.push({ n: k.split('@')[0], p: rect(r.cx, r.cz, r.ry, -r.w / 2, r.w / 2, -r.d / 2, r.d / 2) });
const SKIP_OPEN = new Set(['field', 'khalihan', 'maidan', 'yard_volleyball', 'yard_akhada', 'gilli', 'yard_khel']);
for (const pl of mapData.places) { const f = EXISTING_FOOTPRINTS[pl.id]; if (!f || SKIP_OPEN.has(pl.id)) continue; for (const b of f.boxes || [f.box]) polys.push({ n: pl.id, p: rect(pl.x, pl.z, pl.ry, b[0], b[1], b[2], b[3]) }); }
for (const o of approved.objects) if (o.kind === 'solids' && (o.y1 ?? 1) > 0.5) for (const ring of o.rings) polys.push({ n: o.label.split('|')[0].trim(), p: ring });
for (const o of polys) { o.x0 = Math.min(...o.p.map((q) => q[0])); o.x1 = Math.max(...o.p.map((q) => q[0])); o.z0 = Math.min(...o.p.map((q) => q[1])); o.z1 = Math.max(...o.p.map((q) => q[1])); }
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
function distPoly(x, z, o) {
  if (inPoly(x, z, o.p)) return -0.01;
  let best = 1e9; const p = o.p;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); }
  return best;
}
function nearestBuilding(x, z, reach = 30) { let best = { d: 1e9, n: '-' }; for (const o of polys) { if (x < o.x0 - reach || x > o.x1 + reach || z < o.z0 - reach || z > o.z1 + reach) continue; const d = distPoly(x, z, o); if (d < best.d) best = { d, n: o.n }; } return best; }
// footprint sample points of a vehicle at (x,z) with heading h (long axis (sin h, cos h))
export function samples(file, x, z, h) {
  const [L, W] = DIM[file] || [2.5, 1.4], f = [Math.sin(h), Math.cos(h)], s = [Math.cos(h), -Math.sin(h)], pts = [];
  const nl = Math.max(2, Math.ceil(L / 0.5)), nw = Math.max(2, Math.ceil(W / 0.5));
  for (let i = 0; i <= nl; i++) for (let j = 0; j <= nw; j++) { const a = (i / nl - 0.5) * L, b = (j / nw - 0.5) * W; pts.push([x + f[0] * a + s[0] * b, z + f[1] * a + s[1] * b]); }
  return pts;
}
export function test(file, x, z, h) {
  const pts = samples(file, x, z, h); let road = 1e9, rid = '', bd = 1e9, bn = '-';
  for (const [px, pz] of pts) { const r = roadInfo(px, pz); if (r.clear < road) { road = r.clear; rid = r.seg.id; } const b = nearestBuilding(px, pz, 6); if (b.d < bd) { bd = b.d; bn = b.n; } }
  return { road, rid, bd, bn };
}

const src = fs.readFileSync(new URL('../src/villageVehicles.js', import.meta.url), 'utf8');
const ANCHORS = []; // filled below for --suggest
export { roadInfo, nearestBuilding, distPoly, approved, mapData, polys };
if (process.argv[1] && process.argv[1].endsWith('vehicle-spots.mjs')) { if (process.argv.includes('--suggest')) await suggest(); else check(); }

function check() {
  const m = src.match(/VILLAGE_VEHICLES = (\[[\s\S]*?\n\]);/);
  const list = (0, eval)(m[1].replace(/\/\/.*$/gm, ''));
  let fails = 0; const counts = {};
  list.forEach((v, i) => {
    counts[v.file] = (counts[v.file] || 0) + 1;
    const t = test(v.file, v.x, v.z, v.yaw);
    const msgs = [];
    if (!DIM[v.file]) msgs.push('unknown file');
    if (t.road < MARGIN) msgs.push(`road ${t.rid} margin ${t.road.toFixed(2)} < ${MARGIN}`);
    if (t.bd < BUILD_MIN) msgs.push(`building ${t.bn} distance ${t.bd.toFixed(2)} < ${BUILD_MIN}`);
    list.forEach((w, j) => { if (j > i && Math.hypot(v.x - w.x, v.z - w.z) < (DIM[v.file][0] + DIM[w.file][0]) / 2 * 0.8 && !(v.file === 'old_tractor' && w.file === 'trailer_pack') ) msgs.push(`overlaps #${j} ${w.file}`); });
    if (msgs.length) { fails++; console.log(`FAIL #${i} ${v.file} (${v.x}, ${v.z}): ${msgs.join('; ')}`); }
    else console.log(`ok   #${i} ${v.file} (${v.x}, ${v.z}) road clear ${t.road.toFixed(2)} m (${t.rid}), nearest building ${t.bn} ${t.bd.toFixed(2)} m`);
  });
  console.log(`${list.length} vehicles: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  console.log(`FAIL count: ${fails}`);
  process.exitCode = fails ? 1 : 0;
}

// ---- suggestion mode: nearest legal spot beside the road around each anchor, heading along the nearest road with +-8 deg jitter
async function suggest() {
  const P = Object.fromEntries(mapData.places.map((p) => [p.id, p]));
  const a = (id, dx = 0, dz = 0) => ({ x: P[id].x + dx, z: P[id].z + dz });
  const plan = JSON.parse(fs.readFileSync(new URL('../tmp/vehicle-plan.json', import.meta.url)));
  const placed = []; let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = [], byIdx = {};
  for (const [pi, q] of plan.entries()) {
    const A = q.at ? { x: q.at[0], z: q.at[1] } : q.near ? a(q.near) : { x: 0, z: 0 };
    let best = null;
    if (q.behind !== undefined) {
      const T = byIdx[q.behind];
      if (T) { const f = [Math.sin(T.yaw), Math.cos(T.yaw)], d = (DIM.old_tractor[0] + DIM.trailer_pack[0]) / 2 + 0.25, x = +(T.x - f[0] * d).toFixed(2), z = +(T.z - f[1] * d).toFixed(2), t = test('trailer_pack', x, z, T.yaw);
        if (t.road >= MARGIN + 0.05 && t.bd >= 0.6) best = { file: 'trailer_pack', x, z, yaw: T.yaw, length: DIM.trailer_pack[0], tag: `behind tractor ${q.behind}`, t }; }
    }
    if (!best && q.behind === undefined) for (let r = 2; r <= (q.maxR || 28) && !best; r += 0.5) for (let k = 0; k < 48; k++) {
      const ang = (k / 48) * Math.PI * 2 + r, x = +(A.x + Math.cos(ang) * r).toFixed(2), z = +(A.z + Math.sin(ang) * r).toFixed(2);
      const ri = roadInfo(x, z); if (ri.clear > 4.5 || ri.clear < 0) continue;
      const s = ri.seg, dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1];
      let h = Math.atan2(dx, dz); if ((k + pi) % 2) h += Math.PI; h += (rnd() * 16 - 8) * Math.PI / 180;
      h = +h.toFixed(3);
      const t = test(q.file, x, z, h);
      if (t.road < MARGIN + 0.05 || t.bd < 0.6) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < (DIM[p.file][0] + DIM[q.file][0]) / 2 + 0.6)) continue;
      let tr = null;
      if (q.trailer) { const f = [Math.sin(h), Math.cos(h)], d = (DIM.old_tractor[0] + DIM.trailer_pack[0]) / 2 + 0.25, tx = +(x - f[0] * d).toFixed(2), tz = +(z - f[1] * d).toFixed(2), tt = test('trailer_pack', tx, tz, h);
        if (tt.road < MARGIN + 0.05 || tt.bd < 0.6) continue; tr = { file: 'trailer_pack', x: tx, z: tz, yaw: h, length: DIM.trailer_pack[0], tag: 'behind tractor', t: tt }; }
      best = { file: q.file, x, z, yaw: h, hex: q.hex, length: DIM[q.file][0], tag: q.near || 'at', t, tr };
    }
    if (best) { placed.push(best); out.push(best); byIdx[pi] = best; if (best.tr) { placed.push(best.tr); out.push(best.tr); } } else console.log(`// NO SPOT for ${q.file} near ${q.near || q.at}`);
  }
  for (const b of out) console.log(`  { file: '${b.file}', x: ${b.x}, z: ${b.z}, yaw: ${b.yaw}, ${b.hex !== undefined ? `hex: 0x${b.hex.toString(16).padStart(6, '0')}, ` : ''}length: ${b.length} }, // ${b.tag} road ${b.t.road.toFixed(2)}`);
}
