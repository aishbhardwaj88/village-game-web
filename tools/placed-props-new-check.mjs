// Check for src/placedPropsNew.js (26 Nov 2026). Same road model and building footprints as tools/placed-props-farm-check.mjs (vehicle-spots.mjs).
// Rules (0 FAIL needed): nothing on a road band (+0.6 m), nothing inside a building (0.4 m clear; climbers touch only their own wall), not in ponds/canals/channels,
// not overlapping the props that placedPropsFarm/Shops/Chowk and villageVehicles already place, nor trees, nor haystacks/dung (never touched), nor each other.
// Scarecrows stand in a non-sugarcane field; beds stand inside their named field region (wheat only in Young wheat); fence runs join end to end on 1.8 m;
// mango trees 12 m apart; no two identical pots adjacent inside one place. Also prints placement counts and the added triangle count.
// Usage: node tools/placed-props-new-check.mjs           -> verify the rows in src/placedPropsNewData.js
//        node tools/placed-props-new-check.mjs --write   -> search legal spots and rewrite the rows between the BEGIN/END ROWS markers
import fs from 'node:fs';
import { roadInfo, nearestBuilding, distPoly, approved, mapData, polys, DIM } from './vehicle-spots.mjs';
import { SIZE, TRIS, FENCE_LEN, bedPoints } from '../src/placedPropsNewData.js';

const ROOT = new URL('../', import.meta.url);
const R = (p) => JSON.parse(fs.readFileSync(new URL(p, ROOT)));
const text = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
const lit = (src, name) => (0, eval)('(' + src.match(new RegExp(name + ' = (\\{[\\s\\S]*?\\n\\}|\\[[\\s\\S]*?\\n\\]);'))[1].replace(/\/\/.*$/gm, '') + ')');
const MARGIN = 0.6, BUILD_MIN = 0.4;
const inP = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
const dEdge = (x, z, p) => { let b = 1e9; for (let i = 0; i < p.length; i++) { const a = p[i], c = p[(i + 1) % p.length], dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); b = Math.min(b, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return b; };
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pts = (x, z, r) => { if (r < 0.2) return [[x, z]]; const o = [[x, z]]; for (let a = 0; a < 8; a++) o.push([x + Math.cos(a * Math.PI / 4) * r, z + Math.sin(a * Math.PI / 4) * r]); return o; };

// ---- world data ----
const objs = approved.objects;
const cropObjs = objs.filter((o) => o.kind === 'crops');
const crop = (i) => cropObjs[i];
const cropRings = cropObjs.flatMap((o) => o.rings);
const groundByIdx = (i) => objs[i];
const NOGO = /pond|tank|channel|canal|Haystack|Dung cake|Sugarcane buying|rail|Tempo|Truck parking|parking|Goods yard|Kabaddi|ricket|play|Washerman|Carrom/i;
const nogo = objs.filter((o) => (o.kind === 'ground' || o.kind === 'solids') && NOGO.test(o.label) && !/Mango baagh/.test(o.label)).flatMap((o) => o.rings.map((r) => ({ ring: r, m: /Haystack|Dung/i.test(o.label) ? 3 : 0.6 })));
const inNogo = (x, z) => nogo.some((n) => inP(x, z, n.ring) || dEdge(x, z, n.ring) < n.m);
const trees = objs.filter((o) => o.kind === 'trees').map((o) => { const r = o.rings[0], xs = r.map((q) => q[0]), zs = r.map((q) => q[1]); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2, r: (Math.max(...xs) - Math.min(...xs)) / 2, mango: /mango/i.test(o.label) }; });
const sugarOrHay = objs.filter((o) => o.kind === 'crops' && /Sugarcane/.test(o.label)).flatMap((o) => o.rings);

// ---- what other files already place (read from their source text, not edited) ----
const existing = [];
{
  const farmSrc = text('src/placedPropsFarm.js'), fs_ = lit(farmSrc, 'SIZE');
  for (const v of lit(farmSrc, 'FARM_PROPS')) existing.push({ x: v.x, z: v.z, r: fs_[v.file]?.[2] ?? 0.4, n: 'farm_' + v.file });
  const shopSrc = text('src/placedPropsShops.js'), ss = lit(shopSrc, 'SIZE');
  for (const v of lit(shopSrc, 'PLACED')) existing.push({ x: v.x, z: v.z, r: Math.min(0.9, (ss[v.f] ?? 0.6) * (v.s || 1) / 2), n: 'shop_' + v.f });
  const chSrc = text('src/placedPropsChowk.js'), fp = {};
  for (const m of chSrc.matchAll(/(\w+): \{[^}\n]*?fp: \[([\d.]+), ([\d.]+)\]/g)) fp[m[1]] = Math.max(+m[2], +m[3]) / 2;
  for (const v of lit(chSrc, 'PLACED')) existing.push({ x: v.x, z: v.z, r: fp[v.file] ?? 0.35, n: 'chowk_' + v.file });
  for (const v of lit(text('src/villageVehicles.js'), 'VILLAGE_VEHICLES')) existing.push({ x: v.x, z: v.z, r: Math.max(...(DIM[v.file] || [2.5, 1.4])) / 2, n: 'veh_' + v.file });
  // existing code-built scarecrows (src/villageFurniture.js) stand at the 'field' anchor; keep 6 m clear
  existing.push({ x: 604 - 12, z: -216 - 4, r: 6, n: 'old_scarecrowA' }, { x: 604 + 21, z: -216 + 10, r: 6, n: 'old_scarecrowB' });
}
const houses = R('src/kit/housesPlanData.json').rows.map((h) => ({ i: h[0], x: h[1], z: h[2], ry: h[3], w: h[4], d: h[5], road: h[7] }));
const shopRects = Object.entries(R('src/layout/shopRects.json').rects).map(([k, v]) => ({ k, ...v }));
const place = (id) => mapData.places.find((p) => p.id === id);

// ---- tests ----
function legal(p, others, o = {}) {
  const z = SIZE[p.f], r = o.r ?? z.r, why = [];
  const P = o.single ? [[p.x, p.z]] : pts(p.x, p.z, Math.min(r, 1.2));
  let road = 1e9, bd = 1e9, bn = '-';
  for (const [x, zz] of P) { const ri = roadInfo(x, zz); road = Math.min(road, ri.clear); const b = nearestBuilding(x, zz, 6); if (b.d < bd || (b.d === bd && b.n === o.host)) { bd = b.d; bn = b.n; } }
  const roadMin = o.roadMin ?? MARGIN;
  if (road < roadMin) why.push(`road margin ${road.toFixed(2)} < ${roadMin}`);
  if (o.host) { if (!(bd >= -0.01 && bd <= 0.7 && bn === o.host)) why.push(`not against ${o.host} (${bn} ${bd.toFixed(2)})`); } else if (bd < (o.bm ?? BUILD_MIN)) why.push(`building ${bn} ${bd.toFixed(2)}`);
  if (!o.inField && P.some(([x, zz]) => cropRings.some((c) => inP(x, zz, c)))) why.push('in a crop field');
  if (P.some(([x, zz]) => inNogo(x, zz))) why.push('in pond/canal/hay/dung/parking ground');
  if (P.some(([x, zz]) => sugarOrHay.some((c) => inP(x, zz, c)))) why.push('in sugarcane');
  for (const t of trees) if (Math.hypot(t.x - p.x, t.z - p.z) < t.r * 0.6 + r + 0.1 && !o.inOrchard) { why.push('overlaps a tree'); break; }
  for (const q of existing) if (Math.hypot(q.x - p.x, q.z - p.z) < q.r + r + 0.1) { why.push(`overlaps existing ${q.n}`); break; }
  for (const q of others) if (q !== p && !(o.skip && o.skip(q)) && Math.hypot(q.x - p.x, q.z - p.z) < SIZE[q.f].r + r + (o.gap ?? 0.1)) { why.push(`overlaps new ${q.f}`); break; }
  return { ok: !why.length, why, road, bd, bn };
}
const regionRing = (reg) => (reg[0] === 'c' ? crop(+reg.slice(1)).rings[0] : groundByIdx(+reg.slice(1)).rings[0]);
const insideRing = (x, z, ring, m) => inP(x, z, ring) && dEdge(x, z, ring) >= m;
function bedRect(b, pad = 0) { const c = Math.cos(b.yaw), s = Math.sin(b.yaw), o = []; for (const [a, d] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) { const lx = a * (b.w / 2 + pad), lz = d * (b.d / 2 + pad); o.push([b.cx + c * lx + s * lz, b.cz - s * lx + c * lz]); } return o; }
function bedLegal(b, props, beds) {
  const why = [], ring = regionRing(b.reg);
  if (b.f === 'wheat_row' || b.f === 'wheat_clump') { if (!/Young wheat/.test(crop(+b.reg.slice(1))?.label || '')) why.push('wheat outside a Young wheat field'); }
  for (const [x, z] of bedRect(b, 0.3)) if (!insideRing(x, z, ring, 1.0)) { why.push('bed corner outside its region'); break; }
  const gx = [];
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) { const lx = (i / 8 - 0.5) * b.w, lz = (j / 8 - 0.5) * b.d, c = Math.cos(b.yaw), s = Math.sin(b.yaw); gx.push([b.cx + c * lx + s * lz, b.cz - s * lx + c * lz]); }
  for (const [x, z] of gx) { const ri = roadInfo(x, z); if (ri.clear < MARGIN) { why.push(`road ${ri.seg.id} margin ${ri.clear.toFixed(2)}`); break; } }
  for (const [x, z] of gx) { const bb = nearestBuilding(x, z, 6); if (bb.d < BUILD_MIN) { why.push(`building ${bb.n}`); break; } }
  for (const [x, z] of gx) if (inNogo(x, z) || sugarOrHay.some((c) => inP(x, z, c))) { why.push('in no-go ground / sugarcane'); break; }
  for (const q of existing) { const c = Math.cos(b.yaw), s = Math.sin(b.yaw), dx = q.x - b.cx, dz = q.z - b.cz, lx = c * dx - s * dz, lz = s * dx + c * dz; if (Math.abs(lx) < b.w / 2 + q.r + 0.2 && Math.abs(lz) < b.d / 2 + q.r + 0.2) { why.push(`overlaps existing ${q.n}`); break; } }
  for (const q of props) { const c = Math.cos(b.yaw), s = Math.sin(b.yaw), dx = q.x - b.cx, dz = q.z - b.cz, lx = c * dx - s * dz, lz = s * dx + c * dz; if (Math.abs(lx) < b.w / 2 + SIZE[q.f].r + 0.2 && Math.abs(lz) < b.d / 2 + SIZE[q.f].r + 0.2) { why.push(`overlaps new ${q.f}`); break; } }
  for (const o of beds) if (o !== b) { const a = bedRect(b, 0.2), c2 = bedRect(o, 0.2); if (a.some(([x, z]) => { const c = Math.cos(o.yaw), s = Math.sin(o.yaw), dx = x - o.cx, dz = z - o.cz; return Math.abs(c * dx - s * dz) < o.w / 2 + 0.2 && Math.abs(s * dx + c * dz) < o.d / 2 + 0.2; }) || c2.some(([x, z]) => { const c = Math.cos(b.yaw), s = Math.sin(b.yaw), dx = x - b.cx, dz = z - b.cz; return Math.abs(c * dx - s * dz) < b.w / 2 + 0.2 && Math.abs(s * dx + c * dz) < b.d / 2 + 0.2; })) { why.push('overlaps another bed'); break; } }
  return why;
}

// ---- check ----
function check() {
  const { PROPS, BEDS } = fs.existsSync(new URL('src/placedPropsNewData.js', ROOT)) ? awaitedData : {};
  let fails = 0; const fail = (m) => { fails++; console.log('FAIL ' + m); };
  PROPS.forEach((p, i) => {
    if (!SIZE[p.f]) return fail(`#${i} unknown file ${p.f}`);
    if (!(p.k >= 0.92 && p.k <= 1.08)) fail(`#${i} ${p.f} jitter ${p.k}`);
    const fence = p.f.startsWith('fence_'), climb = p.f.endsWith('_climber');
    let t;
    if (fence) { t = { ok: true, why: [] }; const L = FENCE_LEN[p.f], c = Math.cos(p.yaw), s = Math.sin(p.yaw); for (let a = -L / 2 + 0.1; a <= L / 2; a += 0.45) { const q = { f: p.f, x: p.x + c * a, z: p.z - s * a }, u = legal(q, PROPS.filter((o) => o !== p), { r: 0.2, roadMin: 2.5, single: true, skip: (o) => o.run === p.run }); if (!u.ok) { t = u; break; } } }
    else t = legal(p, PROPS, { host: climb ? p.host : undefined, inField: p.f === 'scarecrow', inOrchard: false, bm: climb ? 0 : undefined });
    if (p.f === 'scarecrow') { const ci = cropObjs.findIndex((o) => o.rings.some((r) => insideRing(p.x, p.z, r, 3))); if (ci < 0 || /Sugarcane|orchard/i.test(cropObjs[ci].label)) fail(`#${i} scarecrow not in a big non-sugarcane field`); const t2 = legal(p, PROPS, { inField: true }); t = { ok: !t2.why.filter((w) => !/crop field/.test(w)).length, why: t2.why.filter((w) => !/crop field/.test(w)) }; }
    if (!t.ok) fail(`#${i} ${p.f} (${p.x}, ${p.z}): ${t.why.join('; ')}`);
  });
  // fence runs end to end
  const runs = {}; PROPS.filter((p) => p.run).forEach((p) => (runs[p.run] ||= []).push(p));
  for (const [id, list] of Object.entries(runs)) for (let i = 1; i < list.length; i++) { const a = list[i - 1], b = list[i], want = (FENCE_LEN[a.f] + FENCE_LEN[b.f]) / 2, got = Math.hypot(a.x - b.x, a.z - b.z); if (Math.abs(got - want) > 0.03 || Math.abs(a.yaw - b.yaw) > 0.001) fail(`fence run ${id}: joint ${i} spacing ${got.toFixed(3)} want ${want}`); }
  // mango spacing, per-place variety
  const mg = PROPS.filter((p) => p.f === 'mango_tree'); mg.forEach((a, i) => mg.forEach((b, j) => { if (j > i && Math.hypot(a.x - b.x, a.z - b.z) < 12) fail(`mango trees ${i}/${j} closer than 12 m`); }));
  const byG = {}; PROPS.filter((p) => p.g).forEach((p) => (byG[p.g] ||= []).push(p));
  for (const [g, list] of Object.entries(byG)) { list.forEach((a, i) => { if (i && list[i - 1].f === a.f) fail(`place ${g}: identical neighbours ${a.f}`); }); if (/^(house|shop|school|pancha|angan)/.test(g) && (list.length < 2 || list.length > 6)) fail(`place ${g}: ${list.length} pots (want 2 to 6)`); }
  // beds
  BEDS.forEach((b, i) => { const w = bedLegal(b, PROPS, BEDS); if (w.length) fail(`bed #${i} ${b.f} (${b.cx}, ${b.cz}): ${w.join('; ')}`); const P = bedPoints(b); if (SIZE[b.f] && TRIS[b.f] > 1500) fail(`bed ${b.f} plant over 1500 tris`); if (!P.length) fail(`bed #${i} empty`); });
  // counts
  const counts = {}; let tris = 0;
  for (const p of PROPS) { counts[p.f] = (counts[p.f] || 0) + 1; tris += TRIS[p.f] || 0; }
  const bedCount = {}; for (const b of BEDS) { const n = bedPoints(b).length; bedCount[b.f] = (bedCount[b.f] || 0) + n; tris += n * TRIS[b.f]; }
  const sc = counts.scarecrow || 0, cl = (counts.jasmine_climber || 0) + (counts.snail_vine_climber || 0), bn = (counts.banana_plant || 0) + (counts.banana_tree || 0), mgN = counts.mango_tree || 0;
  if (sc < 6 || sc > 10) fail(`scarecrows ${sc} (want 6-10)`); if (cl < 6 || cl > 10) fail(`climbers ${cl} (want 6-10)`); if (mgN < 3 || mgN > 6) fail(`mango trees ${mgN} (want 3-6)`); if (bn < 8) fail(`banana plants ${bn}`);
  console.log('singles:', JSON.stringify(counts)); console.log('bed plants:', JSON.stringify(bedCount));
  console.log(`rows: ${PROPS.length} singles, ${BEDS.length} beds; added triangles if EVERYTHING were in view: ${tris} (streamed per site, only near the player)`);
  console.log(`FAIL count: ${fails}`); process.exitCode = fails ? 1 : 0;
}

// ---- generator ----
function generate() {
  const Rn = rng(2611); const PROPS = [], BEDS = [];
  const tryAdd = (p, o, list = PROPS) => { const t = legal(p, list, o); if (t.ok) { list.push(p); return true; } return false; };
  const rp = (x) => +x.toFixed(2), ry = (x) => +x.toFixed(3), jk = () => +(0.92 + Rn() * 0.16).toFixed(2);
  // scarecrows: one per big non-sugarcane field
  const SC = [1, 3, 14, 8, 18, 32, 41, 42, 21, 7];
  for (const ci of SC) { const ring = crop(ci).rings[0], xs = ring.map((q) => q[0]), zs = ring.map((q) => q[1]); let done = false;
    for (let n = 0; n < 400 && !done; n++) { const x = rp(Math.min(...xs) + Rn() * (Math.max(...xs) - Math.min(...xs))), z = rp(Math.min(...zs) + Rn() * (Math.max(...zs) - Math.min(...zs))); if (!insideRing(x, z, ring, 4)) continue; const p = { f: 'scarecrow', x, z, yaw: ry(Rn() * Math.PI * 2), k: jk() }; const t = legal(p, PROPS, { inField: true }); if (t.why.filter((w) => !/crop field/.test(w)).length) continue; PROPS.push(p); done = true; }
    if (!done) console.log('// NO SPOT scarecrow field', ci); }
  // fences around farm yards
  const yards = [[113, 'gher'], [117, 'plotA'], [118, 'plotB'], [119, 'plotC'], [120, 'plotD']]; let runId = 0;
  for (const [gi, name] of yards) { const ring = groundByIdx(gi).rings[0], cx = ring.reduce((s, q) => s + q[0], 0) / ring.length, cz = ring.reduce((s, q) => s + q[1], 0) / ring.length; let made = 0;
    const edges = ring.map((a, i) => [a, ring[(i + 1) % ring.length]]).sort(() => Rn() - 0.5);
    for (const [a, b] of edges) { if (made >= (name === 'gher' ? 1 : 2)) break; const L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L; let nx = -dz, nz = dx; if ((cx - a[0]) * nx + (cz - a[1]) * nz < 0) { nx = -nx; nz = -nz; }
      const yaw = ry(Math.atan2(-dz, dx)); let s = 1.2 + Rn(), run = [], id = `run${runId}`; const seq = ['fence_section', 'fence_section', 'fence_gate', 'fence_section'].slice(0, 3 + (Rn() > 0.5 ? 1 : 0));
      for (const f of seq) { const len = FENCE_LEN[f], c = s + len / 2, p = { f, x: rp(a[0] + dx * c + nx * 0.5), z: rp(a[1] + dz * c + nz * 0.5), yaw, k: 1, run: id }; s += len; if (s > L - 0.8) break;
        let ok = true; for (let q = -len / 2 + 0.1; q <= len / 2; q += 0.45) { const t = legal({ f, x: p.x + Math.cos(yaw) * q, z: p.z - Math.sin(yaw) * q }, PROPS, { r: 0.2, roadMin: 2.5, single: true, skip: (o) => o.run === id }); if (!t.ok) { ok = false; break; } } if (!ok) break; run.push(p); }
      if (run.length >= 2) { PROPS.push(...run); runId++; made++; } } }
  // pots
  const POTS = ['pot_plant_a', 'pot_plant_b', 'pot_plant_c', 'pot_plant_d', 'planter_long', 'potted_plant_med', 'potted_plant_1', 'flower_pot', 'money_plant_pot', 'plant_in_pot', 'potted_plant_2'];
  const potSet = (n) => { const pool = [...POTS].sort(() => Rn() - 0.5), out = []; for (const f of pool) { if (out.length >= n) break; if (['flower_pot', 'money_plant_pot', 'plant_in_pot', 'potted_plant_2'].includes(f) && out.filter((q) => ['flower_pot', 'money_plant_pot', 'plant_in_pot', 'potted_plant_2'].includes(q)).length >= 1) continue; out.push(f); } return out; };
  const fillPlace = (g, cands, n, att = 50) => { const files = potSet(n); let got = 0; const mine = []; for (const f of files) { for (let a = 0; a < att; a++) { const c = cands[Math.floor(Rn() * cands.length)](); const p = { f, x: rp(c[0]), z: rp(c[1]), yaw: ry(Rn() * Math.PI * 2), k: jk(), g }; if (legal(p, PROPS, { gap: 0.25 }).ok) { PROPS.push(p); mine.push(p); got++; break; } } } return got; };
  const shuf = (a) => a.map((v) => [Rn(), v]).sort((x, y) => x[0] - y[0]).map((v) => v[1]); const hs = shuf(houses); let hn = 0;
  for (const h of hs) { if (hn >= 14) break; const zx = [Math.sin(h.ry), Math.cos(h.ry)], ux = [Math.cos(h.ry), -Math.sin(h.ry)]; const ri = roadInfo(h.x, h.z), a = ri.seg.a, b = ri.seg.b, dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((h.x - a[0]) * dx + (h.z - a[1]) * dz) / (dx * dx + dz * dz || 1))), px = a[0] + dx * t - h.x, pz = a[1] + dz * t - h.z, sg = px * zx[0] + pz * zx[1] >= 0 ? 1 : -1;
    const cands = [() => { const o = 0.35 + Rn() * 2.2, l = (Rn() - 0.5) * (h.w + 1.5); return [h.x + zx[0] * sg * (h.d / 2 + o) + ux[0] * l, h.z + zx[1] * sg * (h.d / 2 + o) + ux[1] * l]; }];
    if (fillPlace(`house${h.i}`, cands, 2 + Math.floor(Rn() * 3)) >= 2) hn++; else for (let k = PROPS.length - 1; k >= 0 && PROPS[k].g === `house${h.i}`; k--) PROPS.pop(); }
  const shops = shuf(shopRects.filter((s) => !/cart|kiosk|sign/.test(s.k) && s.w >= 2.5)); let sn = 0;
  for (const s of shops) { if (sn >= 8) break; const f = s.front, u = [-f[1], f[0]]; const cands = [() => { const o = 0.3 + Rn() * 1.6, l = (Rn() - 0.5) * (s.w - 0.4); return [s.frontMid[0] + f[0] * o + u[0] * l, s.frontMid[1] + f[1] * o + u[1] * l]; }];
    if (fillPlace(`shop${sn}`, cands, 2 + Math.floor(Rn() * 3), 120) >= 2) sn++; else for (let k = PROPS.length - 1; k >= 0 && PROPS[k].g === `shop${sn}`; k--) PROPS.pop(); }
  for (const [id, g, n] of [['school', 'school', 5], ['yard_panchayat', 'pancha', 4], ['anganwadi', 'angan', 3]]) { const pl = place(id); if (!pl) continue; const cands = [() => { const a = Rn() * Math.PI * 2, r = 2 + Rn() * 18, x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r, bb = nearestBuilding(x, z, 3); if (!(bb.d >= 0.45 && bb.d <= 1.3) || (x - pl.x) * pl.front[0] + (z - pl.z) * pl.front[1] < 0) return [1e6, 1e6]; return [x, z]; }];
    const got = fillPlace(g, cands, n, 500); if (got < 2) { for (let k = PROPS.length - 1; k >= 0 && PROPS[k].g === g; k--) PROPS.pop(); console.log('// place without 2 pots', id, got); } }
  // climbers on house walls
  const cl = ['jasmine_climber', 'snail_vine_climber']; let cn = 0; const hs2 = shuf(houses);
  for (const h of hs2) { if (cn >= 8) break; const f = cl[cn % 2], gap = f === 'jasmine_climber' ? 0.3 : 0.47; for (let a = 0; a < 30; a++) { const side = Math.floor(Rn() * 4), c = Math.cos(h.ry), s = Math.sin(h.ry); const n = [[s, c], [-s, -c], [c, -s], [-c, s]][side], tg = [-n[1], n[0]], half = side < 2 ? h.d / 2 : h.w / 2, len = side < 2 ? h.w : h.d, l = (Rn() - 0.5) * (len - 2.2);
      const p = { f, x: rp(h.x + n[0] * (half + gap) + tg[0] * l), z: rp(h.z + n[1] * (half + gap) + tg[1] * l), yaw: ry(Math.atan2(n[0], n[1])), k: jk(), host: `house#${h.i}` }; if (legal(p, PROPS, { host: p.host, bm: 0 }).ok) { PROPS.push(p); cn++; break; } } }
  // banana clusters behind houses and by ponds
  const clusterAt = (cx, cz, n, spread) => { let got = 0; const keep = PROPS.length; for (let a = 0; a < 40 && got < n; a++) { const ang = Rn() * Math.PI * 2, r = Rn() * spread, f = Rn() > 0.5 ? 'banana_plant' : 'banana_tree', p = { f, x: rp(cx + Math.cos(ang) * r), z: rp(cz + Math.sin(ang) * r), yaw: ry(Rn() * Math.PI * 2), k: jk() }; if (legal(p, PROPS, { gap: 0.9 }).ok) { PROPS.push(p); got++; } } if (got < Math.min(3, n)) { PROPS.length = keep; return 0; } return got; };
  let bc = 0; for (const h of shuf(houses)) { if (bc >= 3) break; const zx = [Math.sin(h.ry), Math.cos(h.ry)]; const ri = roadInfo(h.x, h.z), a = ri.seg.a, b = ri.seg.b, dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((h.x - a[0]) * dx + (h.z - a[1]) * dz) / (dx * dx + dz * dz || 1))), sg = (a[0] + dx * t - h.x) * zx[0] + (a[1] + dz * t - h.z) * zx[1] >= 0 ? 1 : -1; if (clusterAt(h.x - zx[0] * sg * (h.d / 2 + 3.5), h.z - zx[1] * sg * (h.d / 2 + 3.5), 4, 2.8) >= 3) bc++; }
  for (const bi of [15, 17]) { const ring = groundByIdx(bi).rings[0]; for (let a = 0; a < 80; a++) { const q = ring[Math.floor(Rn() * ring.length)], cx = ring.reduce((s, w) => s + w[0], 0) / ring.length, cz = ring.reduce((s, w) => s + w[1], 0) / ring.length, d = Math.hypot(q[0] - cx, q[1] - cz) || 1, x = q[0] + (q[0] - cx) / d * 3, z = q[1] + (q[1] - cz) / d * 3; if (clusterAt(x, z, 3, 2.2) >= 3) break; } }
  // mango trees at orchard edges
  const MG = [crop(4).rings[0], crop(59).rings[0], crop(0).rings[0], groundByIdx(155).rings[0], crop(4).rings[0]];
  for (const ring of MG) { const xs = ring.map((q) => q[0]), zs = ring.map((q) => q[1]); let done = false; for (let n = 0; n < 600 && !done; n++) { const x = rp(Math.min(...xs) - 14 + Rn() * (Math.max(...xs) - Math.min(...xs) + 28)), z = rp(Math.min(...zs) - 14 + Rn() * (Math.max(...zs) - Math.min(...zs) + 28)); if (inP(x, z, ring) || dEdge(x, z, ring) > 12 || dEdge(x, z, ring) < 3) continue; const p = { f: 'mango_tree', x, z, yaw: ry(Rn() * Math.PI * 2), k: jk() }; if (PROPS.some((q) => q.f === 'mango_tree' && Math.hypot(q.x - x, q.z - z) < 14)) continue; if (legal(p, PROPS, { gap: 1 }).ok) { PROPS.push(p); done = true; } } }
  // beds
  const SPEC = [['cabbage', 'c10', 4.2, 2.8, 0.7], ['radish_leaf', 'c10', 4, 2.2, 0.5], ['tomato_plant', 'c8', 4.5, 2.7, 0.9], ['tomato_plant', 'c39', 4.5, 2.7, 0.9], ['eggplant', 'c9', 3.6, 2.4, 0.6], ['cabbage', 'c7', 4.2, 2.8, 0.7], ['watermelon_bush', 'c21', 7.2, 3.6, 1.8], ['corn_a', 'c21', 4.4, 3.3, 1.1], ['corn_a', 'c40', 4.4, 3.3, 1.1], ['corn_b', 'c21', 5.5, 3.3, 1.1], ['wheat_row', 'c32', 4.4, 5.6, 0.55], ['wheat_clump', 'c41', 4.8, 3.2, 0.8], ['wheat_clump', 'c42', 4.8, 3.2, 0.8], ['tomato_plant', 'c7', 4.5, 2.7, 0.9]];
  let seed = 100;
  for (const [f, reg, w, d, step] of SPEC) { const ring = regionRing(reg), xs = ring.map((q) => q[0]), zs = ring.map((q) => q[1]); let done = false;
    for (let n = 0; n < 3000 && !done; n++) { const yaw = n % 3 === 0 ? 0 : ry((Rn() - 0.5) * 0.4); const b = { f, cx: rp(Math.min(...xs) + Rn() * (Math.max(...xs) - Math.min(...xs))), cz: rp(Math.min(...zs) + Rn() * (Math.max(...zs) - Math.min(...zs))), yaw, w, d, step, seed: seed++, reg }; if (!bedLegal(b, PROPS, BEDS).length) { BEDS.push(b); done = true; } }
    if (!done) console.log('// NO SPOT bed', f, reg); }
  return { PROPS, BEDS };
}
function write() {
  const { PROPS, BEDS } = generate(); const file = new URL('src/placedPropsNewData.js', ROOT); let src = fs.readFileSync(file, 'utf8');
  const row = (o) => '  { ' + Object.entries(o).map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`).join(', ') + ' },';
  const block = `// BEGIN ROWS\nexport const PROPS = [\n${PROPS.map(row).join('\n')}\n];\nexport const BEDS = [\n${BEDS.map(row).join('\n')}\n];\n// END ROWS`;
  src = src.replace(/\/\/ BEGIN ROWS[\s\S]*\/\/ END ROWS/, block); fs.writeFileSync(file, src); console.log(`wrote ${PROPS.length} singles, ${BEDS.length} beds`);
}
let awaitedData = await import('../src/placedPropsNewData.js?t=' + Date.now());
if (process.argv.includes('--write')) write(); else check();
