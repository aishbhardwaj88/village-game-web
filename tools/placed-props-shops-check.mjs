// Shop / school / puncture prop spot check (her rule, 25 Nov: ROADS MUST BE EMPTY, every standing item >= 0.6 m beyond the drawn road band + dusty edge).
// Reads SIZE and PLACED from src/placedPropsShops.js; tests each prop's footprint (from docs/props_ph_manifest.json scaled to the size table, or FREE_DIMS)
// against the road model (same maths as tools/vehicle-spots.mjs / src/mapRoads.js), building footprints (houses, shopRects.json, EXISTING_FOOTPRINTS, map solids,
// positions from src/anchors.js pt()), the school's own wings, the parked vehicles of src/villageVehicles.js, and each other.
// Usage: node tools/placed-props-shops-check.mjs   -> one line per prop plus FAIL lines, and "FAIL count: N"
import fs from 'node:fs';
import { EXISTING_FOOTPRINTS } from '../src/layout/footprints.js';
import { pt } from '../src/anchors.js';
const R = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
export const mapData = R('../src/layout/mapData.json');
export const approved = R('../docs/layout/approved-map-2026-11-25.json');
const shopRects = R('../src/layout/shopRects.json').rects;
const housePlan = R('../src/kit/housesPlanData.json').rows;
const manifest = Object.fromEntries(R('../docs/props_ph_manifest.json').map((m) => [m.name, m]));
export const MARGIN = 0.6, BUILD_MIN = 0.15;
const AMP = { highway: 0.2, road: 0.32, lane: 0.3, back: 0.2, track: 0.45, path: 0.2 };
const APRON = { highway: 0.58, road: 0.42, lane: 0.31, back: 0.19, track: 0.46, path: 0.17 };
const segs = [];
for (const r of mapData.roads) { const k = r.kind || 'lane'; for (let i = 0; i + 1 < r.pts.length; i++) segs.push({ a: r.pts[i], b: r.pts[i + 1], e: (r.width || 4) / 2 + Math.max((AMP[k] ?? 0.3) * 1.4, APRON[k] ?? 0.31), id: r.id }); }
{ const cx = 602.9, cz = 19.9, ringR = 9.5, ringW = 7; for (let i = 0; i < 40; i++) { const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1) / 40) * Math.PI * 2; segs.push({ a: [cx + Math.cos(a0) * ringR, cz + Math.sin(a0) * ringR], b: [cx + Math.cos(a1) * ringR, cz + Math.sin(a1) * ringR], e: ringW / 2 + Math.max(0.32 * 1.4, 0.42), id: 'chauraha' }); } }
export function roadInfo(x, z) {
  let best = 1e9, bs = null;
  for (const s of segs) {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2));
    const c = Math.hypot(x - (s.a[0] + dx * t), z - (s.a[1] + dz * t)) - s.e;
    if (c < best) { best = c; bs = s; }
  }
  return { clear: best, seg: bs };
}
// local frame (x along ux, z along uz) -> world
export const rect = (cx, cz, ry, lx0, lx1, lz0, lz1) => { const ux = [Math.cos(ry), -Math.sin(ry)], uz = [Math.sin(ry), Math.cos(ry)]; return [[lx0, lz0], [lx1, lz0], [lx1, lz1], [lx0, lz1]].map(([a, b]) => [cx + ux[0] * a + uz[0] * b, cz + ux[1] * a + uz[1] * b]); };
export const placeFrame = (id) => { const p = mapData.places.find((q) => q.id === id), a = pt(id); return { x: a.x, z: a.z, ry: a.ry ?? p.ry, box: EXISTING_FOOTPRINTS[id]?.box, front: p.front }; };
const polys = [];
for (const h of housePlan) polys.push({ n: `house#${h[0]}`, p: rect(h[1], h[2], h[3], -h[4] / 2, h[4] / 2, -h[5] / 2, h[5] / 2) });
for (const [k, r] of Object.entries(shopRects)) polys.push({ n: k.split('@')[0], p: rect(r.cx, r.cz, r.ry, -r.w / 2, r.w / 2, -r.d / 2, r.d / 2) });
const SKIP_OPEN = new Set(['field', 'khalihan', 'maidan', 'yard_volleyball', 'yard_akhada', 'gilli', 'yard_khel', 'school']);
for (const pl of mapData.places) { const f = EXISTING_FOOTPRINTS[pl.id]; if (!f || SKIP_OPEN.has(pl.id)) continue; const a = pt(pl.id); for (const b of f.boxes || [f.box]) polys.push({ n: pl.id, p: rect(a.x, a.z, a.ry ?? pl.ry, b[0], b[1], b[2], b[3]) }); }
for (const o of approved.objects) if (o.kind === 'solids' && (o.y1 ?? 1) > 0.5) for (const ring of o.rings) polys.push({ n: o.label.split('|')[0].trim(), p: ring });
// school compound (557.1, 111.5, ry 0.1955): the compound box is open yard, so only its wings, flagpole, neems and the gate lane are obstacles (src/main.js schoolPt table)
export const SCHOOL = placeFrame('school');
for (const [n, b] of Object.entries({ back_block: [-12.4, 12.4, 5.6, 12.4], east_wing: [8.6, 15.4, -9.4, 9.4], west_classroom: [-15.2, -8.6, -9.4, 9.4], flagpole: [-0.6, 0.6, -8.6, -7.4], neem_a: [-5.3, -3.7, -7, -5.4], neem_b: [5.4, 7, -1.8, -0.2], gate_lane: [-2.2, 2.2, -14.5, -5] })) polys.push({ n: `school_${n}`, p: rect(SCHOOL.x, SCHOOL.z, SCHOOL.ry, b[0], b[1], b[2], b[3]) });
for (const o of polys) { o.x0 = Math.min(...o.p.map((q) => q[0])); o.x1 = Math.max(...o.p.map((q) => q[0])); o.z0 = Math.min(...o.p.map((q) => q[1])); o.z1 = Math.max(...o.p.map((q) => q[1])); }
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
export function distPoly(x, z, o) {
  if (inPoly(x, z, o.p)) return -0.01;
  let best = 1e9; const p = o.p;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); }
  return best;
}
export function nearestBuilding(x, z, reach = 6) { let best = { d: 1e9, n: '-' }; for (const o of polys) { if (x < o.x0 - reach || x > o.x1 + reach || z < o.z0 - reach || z > o.z1 + reach) continue; const d = distPoly(x, z, o); if (d < best.d) best = { d, n: o.n }; } return best; }

const FREE_DIMS = { kettle: [0.3, 0.26], radio: [0.36, 0.2] }; // props_free (no manifest): [longest, depth] used when no manifest row
export function parseSrc() {
  const src = fs.readFileSync(new URL('../src/placedPropsShops.js', import.meta.url), 'utf8');
  const grab = (name) => { const m = src.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\}|\\[[\\s\\S]*?\\n\\]);`)); return (0, eval)(`(${m[1].replace(/\/\/.*$/gm, '')})`); };
  return { SIZE: grab('SIZE'), PLACED: grab('PLACED') };
}
// footprint [w, d] (local x, local z) and height of file at the table size x scale s
export function dims(file, size, s) {
  const m = manifest[file];
  if (!m) { const f = FREE_DIMS[file] || [size, size]; const k = (size * s) / f[0]; return { w: f[0] * k, d: f[1] * k, h: f[1] * k }; }
  const k = (size * s) / Math.max(m.height_m, m.width_m, m.depth_m);
  return { w: m.width_m * k, d: m.depth_m * k, h: m.height_m * k };
}
export function samples(x, z, yaw, w, d) {
  const u = [Math.cos(yaw), -Math.sin(yaw)], f = [Math.sin(yaw), Math.cos(yaw)], pts = [];
  const nw = Math.max(1, Math.ceil(w / 0.3)), nd = Math.max(1, Math.ceil(d / 0.3));
  for (let i = 0; i <= nw; i++) for (let j = 0; j <= nd; j++) { const a = (i / nw - 0.5) * w, b = (j / nd - 0.5) * d; pts.push([x + u[0] * a + f[0] * b, z + u[1] * a + f[1] * b]); }
  return pts;
}
export function test(x, z, yaw, w, d) {
  let road = 1e9, rid = '', bd = 1e9, bn = '-';
  for (const [px, pz] of samples(x, z, yaw, w, d)) { const r = roadInfo(px, pz); if (r.clear < road) { road = r.clear; rid = r.seg.id; } const b = nearestBuilding(px, pz, 4); if (b.d < bd) { bd = b.d; bn = b.n; } }
  return { road, rid, bd, bn };
}
// parked vehicles: footprint sample points (length x width along the heading) for the overlap test
const VDIM = { old_tractor: [3.5, 1.9], trailer_pack: [3.4, 1.9], auto_rickshaw: [2.65, 1.4], tuk_tuk: [2.65, 1.4], bicycle: [1.75, 0.6], motorbike: [2.0, 0.8], moped: [1.8, 0.7], thela_gadi: [2.4, 1.3], mini_truck: [3.4, 1.8], water_tanker: [5.0, 2.2], thela_b: [2.4, 1.3], willys_jeep: [3.7, 1.7] };
export function vehiclePts() {
  const src = fs.readFileSync(new URL('../src/villageVehicles.js', import.meta.url), 'utf8');
  const list = (0, eval)(src.match(/VILLAGE_VEHICLES = (\[[\s\S]*?\n\]);/)[1].replace(/\/\/.*$/gm, ''));
  return list.flatMap((v) => { const [L, W] = VDIM[v.file] || [2.5, 1.4], f = [Math.sin(v.yaw), Math.cos(v.yaw)], s = [Math.cos(v.yaw), -Math.sin(v.yaw)], out = [];
    for (let i = 0; i <= Math.ceil(L / 0.4); i++) for (let j = 0; j <= Math.ceil(W / 0.4); j++) out.push([v.x + f[0] * (i / Math.ceil(L / 0.4) - 0.5) * L + s[0] * (j / Math.ceil(W / 0.4) - 0.5) * W, v.z + f[1] * (i / Math.ceil(L / 0.4) - 0.5) * L + s[1] * (j / Math.ceil(W / 0.4) - 0.5) * W]); return out; });
}
const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

export function check() {
  const { SIZE, PLACED } = parseSrc(); const vpts = vehiclePts();
  let fails = 0; const counts = {}; const info = PLACED.map((p) => ({ ...p, ...dims(p.f, SIZE[p.f], p.s) }));
  info.forEach((p, i) => {
    counts[p.f] = (counts[p.f] || 0) + 1;
    const msgs = [];
    if (!SIZE[p.f]) msgs.push('no size row');
    if (p.s < 0.92 || p.s > 1.08) msgs.push(`scale ${p.s} outside 0.92-1.08`);
    if (!(p.y > 0)) { // standing on the ground: road, building, vehicle, overlap rules
      const t = test(p.x, p.z, p.yaw, p.w, p.d);
      if (t.road < MARGIN) msgs.push(`road ${t.rid} margin ${t.road.toFixed(2)} < ${MARGIN}`);
      if (t.bd < BUILD_MIN) msgs.push(`building ${t.bn} distance ${t.bd.toFixed(2)} < ${BUILD_MIN}`);
      const rad = Math.hypot(p.w, p.d) / 2;
      for (const [vx, vz] of vpts) if (Math.hypot(vx - p.x, vz - p.z) < rad * 0.7) { msgs.push('inside a parked vehicle'); break; }
      info.forEach((q, j) => { if (j > i && !(q.y > 0)) { const mn = Math.min(Math.hypot(p.w, p.d), Math.hypot(q.w, q.d)) / 2 * 0.75 + Math.min(p.w, p.d, q.w, q.d) * 0.1, dd = Math.hypot(p.x - q.x, p.z - q.z); if (dd < Math.max(0.08, mn)) msgs.push(`overlaps #${j} ${q.f}`); } });
    } else { // stacked: must lie within a ground parent's footprint circle
      const par = info.find((q) => !(q.y > 0) && Math.hypot(q.x - p.x, q.z - p.z) < Math.max(q.w, q.d) / 2 + 0.05);
      if (!par) msgs.push('stacked prop has no parent under it');
    }
    // same file within 4 m must differ in heading (>= 0.35 rad) or scale (>= 0.03)
    info.forEach((q, j) => { if (j !== i && q.f === p.f && Math.hypot(q.x - p.x, q.z - p.z) < 4 && angDiff(q.yaw, p.yaw) < 0.35 && Math.abs(q.s - p.s) < 0.03 && j > i) msgs.push(`identical neighbour #${j} ${q.f}`); });
    if (msgs.length) { fails++; console.log(`FAIL #${i} ${p.f} (${p.x}, ${p.z}): ${msgs.join('; ')}`); }
    else if (process.argv.includes('--verbose')) console.log(`ok   #${i} ${p.f} (${p.x}, ${p.z})`);
  });
  console.log(`${PLACED.length} props: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  console.log(`FAIL count: ${fails}`);
  process.exitCode = fails ? 1 : 0;
}
if (process.argv[1] && process.argv[1].endsWith('placed-props-shops-check.mjs')) check();
