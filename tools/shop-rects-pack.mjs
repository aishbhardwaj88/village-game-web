#!/usr/bin/env node
/**
 * Shop footprints for the approved map, with HER RULE (25 Nov): every shop, kiosk, cart, shed and the shopkeeper's home
 *   1. FACES THE ROAD IT FRONTS: front (door/sign side) points at the nearest road, walls square to that road;
 *   2. stands at 0 overlap with every road band (band = road polyline buffered by width/2), clear by at least 0.1 m.
 * Reads ONLY docs/layout/approved-map-2026-11-25.json (+ house plots and place footprints as obstacles) and writes
 * src/layout/shopRects.json: for EVERY shop, { cx, cz, w, d, ry, front, frontMid }. The game's shops builder
 * (src/kit/shopsPlace.js, which reads the RAW map at runtime) and src/layout/layout.js (getLayout() consumers, missions)
 * both read this file, so they agree.
 *   position = centre of the drawn plot, moved the smallest distance that clears every band by 0.1 m (push along the road
 *              normal; if that hits another building, slide along the road; never more than 5 m, else left and listed)
 *   size     = the plot's own edges, (front-axis edge = depth)
 *   front    = the nearest road's normal pointing at it
 * The footprint tested is the BUILT mesh extent (measured from the shopsKit designs), not the bare plot.
 * Usage: node tools/shop-rects-pack.mjs [--check]   (--check: report only, nothing written)
 *        node tools/shop-rects-pack.mjs --log       (also prints the move table used for docs/layout/MOVE_LOG_SHOPS_25NOV.md)
 */
import fs from 'node:fs';
const U = (p) => new URL(p, import.meta.url);
const raw = JSON.parse(fs.readFileSync(U('../docs/layout/approved-map-2026-11-25.json')));
const labelKey = (o) => o.label.split('|')[0].trim(), labelName = (o) => (o.label.split('|')[1] || '').trim();
const r3 = (v) => Math.round(v * 1000) / 1000;
// same maths as src/kit/landLayout.js (ringRect, matchPlace), copied because that module pulls in the browser build's virtual imports
function ringRect(ring, front) {
  const c = { x: ring.reduce((a, p) => a + p[0], 0) / ring.length, z: ring.reduce((a, p) => a + p[1], 0) / ring.length };
  const e1 = [ring[1][0] - ring[0][0], ring[1][1] - ring[0][1]], e2 = [ring[2][0] - ring[1][0], ring[2][1] - ring[1][1]];
  const l1 = Math.hypot(...e1), l2 = Math.hypot(...e2), f = front;
  const p1 = Math.abs((e1[0] * f[0] + e1[1] * f[1]) / l1), p2 = Math.abs((e2[0] * f[0] + e2[1] * f[1]) / l2);
  const depth = p1 > p2 ? l1 : l2, width = p1 > p2 ? l2 : l1, de = p1 > p2 ? e1 : e2, dl = p1 > p2 ? l1 : l2;
  let sf = [de[0] / dl, de[1] / dl]; if (sf[0] * f[0] + sf[1] * f[1] < 0) sf = [-sf[0], -sf[1]];
  return { x: c.x, z: c.z, width, depth, front: sf, ry: Math.atan2(sf[0], sf[1]) };
}
function matchPlace(places, name, x, z, maxD = 6) {
  let best = null, bd = maxD;
  for (const p of places) { if (p.existing) continue; const pn = p.name.replace(/ \(2-storey\)$/, ''); if (pn !== name && p.name !== name) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
  return best;
}
// ---------------------------------------------------------------- roads
const segs = []; for (const r of raw.roads) for (let i = 0; i < r.pts.length - 1; i++) segs.push({ a: r.pts[i], b: r.pts[i + 1], half: (r.width || 4) / 2, id: r.id, capA: i === 0, capB: i === r.pts.length - 2 });
// signed distance to the band (negative = depth inside): flat caps at the two ends of each road polyline (shapely buffer cap_style=flat, as the audit), round joins at interior vertices
function segQ(s, x, z) {
  const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1, L = Math.sqrt(L2), tr = ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2;
  const t = Math.max(0, Math.min(1, tr)), px = s.a[0] + dx * t, pz = s.a[1] + dz * t, perp = Math.abs((x - s.a[0]) * dz - (z - s.a[1]) * dx) / L, u = perp - s.half;
  let d;
  if (tr < 0) d = s.capA ? Math.hypot(Math.max(u, 0), -tr * L) : Math.hypot(x - px, z - pz) - s.half;
  else if (tr > 1) d = s.capB ? Math.hypot(Math.max(u, 0), (tr - 1) * L) : Math.hypot(x - px, z - pz) - s.half;
  else if (u >= 0) d = u;
  else d = -Math.min(-u, s.capA ? tr * L : 1e9, s.capB ? (1 - tr) * L : 1e9); // inside the band: depth to the nearest boundary (side or flat end)
  return { d, px, pz, dx, dz };
}
const CELL = 20, grid = new Map();
for (const s of segs) { const x0 = Math.floor((Math.min(s.a[0], s.b[0]) - s.half - 30) / CELL), x1 = Math.floor((Math.max(s.a[0], s.b[0]) + s.half + 30) / CELL), z0 = Math.floor((Math.min(s.a[1], s.b[1]) - s.half - 30) / CELL), z1 = Math.floor((Math.max(s.a[1], s.b[1]) + s.half + 30) / CELL); for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) { const k = gx + ',' + gz; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); } }
const near = (x, z) => grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)) || [];
const clearance = (x, z) => { let best = 30; for (const s of near(x, z)) { const q = segQ(s, x, z); if (q.d < best) best = q.d; } return best; };
const nearestSeg = (x, z) => { let best = null; for (const s of near(x, z)) { const q = segQ(s, x, z); if (!best || q.d < best.d) best = { ...q, id: s.id }; } return best; };
// ---------------------------------------------------------------- built footprints (local frame: x right, z = front), measured from src/kit/shopsKit.js designs
const FP = {
  shop: (w, d) => [-(w / 2 + 0.07), w / 2 + 0.07, -(d / 2 + 0.1), d / 2 + 0.1],
  shopHouse: (w, d) => [-(w / 2 + 0.07), w / 2 + 0.07, -(d / 2 + 0.1), d / 2 + 0.1],
  kiosk: (w, d) => [-(w / 2 + 0.12), w / 2 + 0.12, -(d / 2 + 0.1), d / 2 + 0.35],
  cart: () => [-1.6, 1.2, -0.7, 0.7],
  shed: (w, d) => [-(w / 2 + 0.25), w / 2 + 0.25, -(d / 2 + 0.28), d / 2 + 0.28],
};
const toW = (r, lx, lz) => { const c = Math.cos(r.ry), s = Math.sin(r.ry); return [r.x + lx * c + lz * s, r.z - lx * s + lz * c]; };
const poly = (r) => { const [x0, x1, z0, z1] = r.box; return [toW(r, x0, z0), toW(r, x1, z0), toW(r, x1, z1), toW(r, x0, z1)]; };
function samples(r) { // perimeter every <=0.1 m, plus an interior 1 m grid (a road stub ending inside the footprint)
  const [x0, x1, z0, z1] = r.box, out = [], n = (len) => Math.max(1, Math.ceil(len / 0.1));
  for (let i = 0; i <= n(x1 - x0); i++) { const lx = x0 + (x1 - x0) * i / n(x1 - x0); out.push(toW(r, lx, z0), toW(r, lx, z1)); }
  for (let i = 0; i <= n(z1 - z0); i++) { const lz = z0 + (z1 - z0) * i / n(z1 - z0); out.push(toW(r, x0, lz), toW(r, x1, lz)); }
  for (let lx = x0 + 0.5; lx < x1; lx += 1) for (let lz = z0 + 0.5; lz < z1; lz += 1) out.push(toW(r, lx, lz));
  return out;
}
const worstAt = (r) => { let m = 1e9, w = null; for (const [x, z] of samples(r)) { const c = clearance(x, z); if (c < m) { m = c; w = [x, z]; } } return w; };
const footClear = (r) => { let m = 1e9; for (const [x, z] of samples(r)) { const c = clearance(x, z); if (c < m) m = c; } return m; };
// SAT penetration depth of two convex quads (0 when apart)
function pen(A, B) {
  let min = 1e9;
  for (const P of [A, B]) for (let i = 0; i < 4; i++) {
    const ex = P[(i + 1) % 4][0] - P[i][0], ez = P[(i + 1) % 4][1] - P[i][1], L = Math.hypot(ex, ez) || 1, nx = -ez / L, nz = ex / L;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const p of A) { const v = p[0] * nx + p[1] * nz; a0 = Math.min(a0, v); a1 = Math.max(a1, v); }
    for (const p of B) { const v = p[0] * nx + p[1] * nz; b0 = Math.min(b0, v); b1 = Math.max(b1, v); }
    const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return 0; min = Math.min(min, o);
  }
  return min;
}
// ---------------------------------------------------------------- shops: the game's own selection + front logic (src/kit/shopsPlace.js, raw map path)
const NOT_SHOPS = new Set(['Hand pump', 'Well', 'Washing line', 'Dung cakes', 'Resting spot', 'Buffalo', 'Haystack', 'Old well', 'Transformer', 'Mobile tower', 'Water trough', 'Washing platform', 'Barber under a tree', 'Weekly market ground']);
const SHEDS = new Set(['Bus shelter', 'Cycle stand', 'Jaggery making unit', 'Milk carts']);
const shops = [];
for (const o of raw.objects) {
  if (o.kind !== 'solids' || !o.rings?.[0] || o.rings[0].length !== 4) continue;
  const key = labelKey(o), name = labelName(o);
  if (!key.startsWith('new_')) continue;
  const isSqh = key === 'new_sqh', isSqx = key === 'new_sqx', isKiosk = key === 'new_kiosk' || key === 'new_cart', isSingle = /^new_[A-Z]/.test(key) && !NOT_SHOPS.has(name);
  if (!(isSqh || isSqx || isKiosk || isSingle)) continue;
  if (/^(Railway|Ticket window|Platform|Waiting)/.test(name)) continue; // built by src/kit/railway.js from the raw ring
  const rg = o.rings[0], c0 = { x: rg.reduce((a, p) => a + p[0], 0) / 4, z: rg.reduce((a, p) => a + p[1], 0) / 4 };
  let front, how = 'marker';
  const place = isSqh ? null : matchPlace(raw.places, isSqx ? name.replace(/ \(2-storey\)$/, '') : name, c0.x, c0.z);
  if (place) front = place.front;
  else {
    how = isSqh ? 'sqh edge' : 'plot edge facing the nearest road';
    const cand = isSqh ? [[0, 1], [0, -1], [1, 0], [-1, 0]] : [];
    if (!isSqh) { const ee = [[rg[1][0] - rg[0][0], rg[1][1] - rg[0][1]], [rg[2][0] - rg[1][0], rg[2][1] - rg[1][1]]]; for (const e of ee) { const L = Math.hypot(...e) || 1; for (const sg of [1, -1]) cand.push([sg * e[0] / L, sg * e[1] / L]); } }
    let best = null;
    for (const f of cand) { const rr = ringRect(rg, f); const cl = clearance(rr.x + rr.front[0] * (rr.depth / 2 + 3), rr.z + rr.front[1] * (rr.depth / 2 + 3)); if (!best || cl < best.cl) best = { cl, f }; }
    front = best.f;
  }
  const rr = ringRect(rg, front);
  const type = isSqx || isSqh ? 'shopHouse' : isKiosk ? ((/cart$/i.test(name) || key === 'new_cart') ? 'cart' : 'kiosk') : SHEDS.has(name) ? (name === 'Milk carts' ? 'cart' : 'shed') : (name === 'Newspaper stand' || name === 'Sugarcane juice cart' || /cart$/.test(name)) ? 'cart' : 'shop';
  const W = Math.round(rr.width * 10) / 10, D = Math.round(rr.depth * 10) / 10;
  const bw = type === 'kiosk' ? Math.min(W, 3.2) : W, bd = type === 'kiosk' ? Math.min(D, 3.2) : D; // built dims, as shopsPlace.js passes them to the designs
  const s = { label: o.label, name: name || key, type, how, rk: `${o.label}@${rg[0][0]},${rg[0][1]}`, w: rr.width, d: rr.depth, x: rr.x, z: rr.z, ry: rr.ry, plot: rg };
  s.box = FP[type](bw, bd);
  s.x0 = s.x; s.z0 = s.z; s.ry0 = s.ry; shops.push(s);
}
// ---------------------------------------------------------------- obstacles (other buildings): house plots + non-open place footprints
const obstacles = [];
for (const o of raw.objects) if (o.kind === 'solids' && o.label.startsWith('new_house') && o.rings?.[0]) obstacles.push({ n: o.label, p: o.rings[0].slice(0, 4) });
try {
  await import('./missions-node-env.mjs'); globalThis.__DOPAHAR_LAYOUT = 'new';
  const { ANCHORS } = await import('../src/anchors.js'), { EXISTING_FOOTPRINTS } = await import('../src/layout/footprints.js');
  for (const [id, a] of Object.entries(ANCHORS)) { const f = EXISTING_FOOTPRINTS[id]; if (!f || f.open) continue; const r = { x: a.x, z: a.z, ry: a.ry || 0, box: f.box }; obstacles.push({ n: 'place ' + id, p: poly(r) }); }
} catch (e) { console.error('place footprints not loaded (houses only):', e.message.split('\n')[0]); }
// ---------------------------------------------------------------- 1. face the nearest road, 2. clear the bands
const deg = (v) => v * 180 / Math.PI;
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
function segFoot(sg, x, z) { const dx = sg.b[0] - sg.a[0], dz = sg.b[1] - sg.a[1], L2 = dx * dx + dz * dz || 1; return ((x - sg.a[0]) * dx + (z - sg.a[1]) * dz) / L2; }
function roadNormalYaw(s) { // front yaw pointing at the road the front face looks at (nearest band to the front-face midpoint), walls square to it
  const f0 = [Math.sin(s.ry0), Math.cos(s.ry0)], fx = s.x0 + f0[0] * s.d / 2, fz = s.z0 + f0[1] * s.d / 2;
  let best = null; // only segments whose perpendicular foot lies inside the segment (a gali's end cap is not "the road in front")
  for (const sg of near(fx, fz)) { const t = segFoot(sg, fx, fz); if (t < 0 || t > 1) continue; const q = segQ(sg, fx, fz); if (!best || q.d < best.d) best = { ...q, id: sg.id }; }
  if (!best || best.d > 15) best = nearestSeg(fx, fz);
  let nx = -best.dz, nz = best.dx; const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
  if (nx * f0[0] + nz * f0[1] < 0) { nx = -nx; nz = -nz; } // the normal on the side the shop already faces
  return { ry: Math.atan2(nx, nz), road: best.id, dist: best.d };
}
const MAXMOVE = 5, CLEAR = 0.1;
const log = [], unmoved = [], notTurned = [];
const others = (s) => shops.filter((t) => t !== s);
const hits = (s) => { const P = poly(s); for (const ob of obstacles) if (!ob.ignore?.has(s) && pen(P, ob.p) > 0.05 && !(s.pre && s.pre.has(ob.n))) return ob.n; for (const t of others(s)) if (pen(P, poly(t)) > 0.05 && !(s.pre && s.pre.has(t.label))) return t.label; return null; };
for (const s of shops) { // overlaps that already exist on the drawn map (neighbour plots that touch, house plots) are not ours to solve
  s.pre = new Set(); const P = poly(s);
  for (const ob of obstacles) if (pen(P, ob.p) > 0.05) s.pre.add(ob.n);
  for (const t of others(s)) if (pen(P, poly(t)) > 0.05) s.pre.add(t.label);
}
for (const s of shops) {
  const f = roadNormalYaw(s), turn = Math.abs(deg(wrap(f.ry - s.ry0)));
  s.cur = { road: f.road }; s.roadDist = f.dist; const cap = s.type === 'cart' || s.type === 'kiosk' ? 90 : 45; s.ryNew = turn > cap ? s.ry0 : f.ry; // a turn of more than 45 deg (90 for carts and kiosks) means the road found is not the one in front: left as drawn and listed
  if (turn > cap) notTurned.push(`${s.name} at ${s.x0.toFixed(1)},${s.z0.toFixed(1)}: would turn ${turn.toFixed(0)} deg to face ${f.road}, left as drawn`);
  s.N = [Math.sin(s.ryNew), Math.cos(s.ryNew)]; s.T = [Math.cos(s.ryNew), -Math.sin(s.ryNew)];
}
// turn all first (so neighbours see each other's final walls), then clear bands one by one
for (const s of shops) s.ry = s.ryNew;
const grad = (x, z) => { const h = 0.02, gx = clearance(x + h, z) - clearance(x - h, z), gz = clearance(x, z + h) - clearance(x, z - h), L = Math.hypot(gx, gz) || 1; return [gx / L, gz / L]; };
const hitsProbe = (p, self) => { const P = poly(p); for (const ob of obstacles) if (pen(P, ob.p) > 0.05 && !self.pre.has(ob.n)) return ob.n; for (const t of shops) if (t !== self && pen(P, poly(t)) > 0.05 && !self.pre.has(t.label)) return t.label; return null; };
for (const s of shops) {
  const c0 = footClear(s); s.clear0 = c0;
  const turnHit = hitsProbe(s, s); // turning to face the road can swing a corner into a neighbour that was clear before
  if (c0 >= CLEAR && !turnHit) continue;
  const x0 = s.x, z0 = s.z, probe = { ...s }; let done = null, blocked = null;
  // 1. push away from the road (the direction in which clearance grows fastest at the worst point: the road normal, or along a gali's flat end), smallest distance
  for (let it = 0; it < 400 && !done && c0 < CLEAR; it++) {
    const w = worstAt(probe), c = clearance(...w); if (c >= CLEAR) { done = { x: probe.x, z: probe.z }; break; }
    const g = grad(...w), st = Math.min(CLEAR - c + 0.01, 0.25); probe.x += g[0] * st; probe.z += g[1] * st;
    if (Math.hypot(probe.x - x0, probe.z - z0) > MAXMOVE) break;
    const h = hitsProbe(probe, s); if (h) { blocked = h; break; }
  }
  if (!done) { // 2. that hit another building (or ran past 5 m): slide along the road as well, the smallest total distance on a 0.1 m grid
    Object.assign(probe, { x: x0, z: z0 }); const g0 = c0 < CLEAR ? grad(...worstAt(probe)) : s.N, p0 = [-g0[1], g0[0]]; let bestC = 1e9;
    for (let t = -MAXMOVE; t <= MAXMOVE + 1e-9; t += 0.1) for (let d = -1; d <= MAXMOVE + 1e-9; d += 0.1) { const c = Math.hypot(d, t); if (c >= bestC || c > MAXMOVE) continue; Object.assign(probe, { x: x0 + g0[0] * d + p0[0] * t, z: z0 + g0[1] * d + p0[1] * t }); if (footClear(probe) >= CLEAR && !hitsProbe(probe, s)) { bestC = c; done = { x: probe.x, z: probe.z }; } }
    if (done) s.slid = true;
  }
  if (!done) { unmoved.push(`${s.name} at ${s.x.toFixed(1)},${s.z.toFixed(1)}: ${blocked ? 'blocked by ' + blocked + ', ' : ''}no clear spot within ${MAXMOVE} m (clearance ${c0.toFixed(2)} m at ${worstAt(s).map((v) => v.toFixed(1))} on ${nearestSeg(...worstAt(s)).id})`); continue; }
  s.x = done.x; s.z = done.z;
}
// ---------------------------------------------------------------- result
const newHits = []; for (const s of shops) { const h = hitsProbe(s, s); if (h) newHits.push(`${s.name} at ${s.x.toFixed(1)},${s.z.toFixed(1)} now overlaps ${h}`); }
const rects = {}, rows = [];
for (const s of shops) {
  const f = [Math.sin(s.ry), Math.cos(s.ry)];
  rects[s.rk] = { cx: r3(s.x), cz: r3(s.z), w: r3(s.w), d: r3(s.d), ry: r3(s.ry), front: [r3(f[0]), r3(f[1])], frontMid: [r3(s.x + f[0] * s.d / 2), r3(s.z + f[1] * s.d / 2)] };
  const moved = Math.hypot(s.x - s.x0, s.z - s.z0), turn = Math.abs(deg(wrap(s.ry - s.ry0))), c1 = footClear(s);
  rows.push({ facing0: ((deg(s.ry0) % 360) + 360) % 360, name: s.name, type: s.type, from: [s.x0, s.z0], to: [s.x, s.z], moved, turn, facing: ((deg(s.ry) % 360) + 360) % 360, road: s.cur.road, clear0: s.clear0 ?? footClear({ ...s, x: s.x0, z: s.z0, ry: s.ry0 }), clear1: c1, slid: !!s.slid, how: s.how });
}
const movedRows = rows.filter((r) => r.moved > 0.005), turnedRows = rows.filter((r) => r.turn > 1);
console.log(`shops ${shops.length} | turned >1 deg to face the nearest road: ${turnedRows.length} (max ${Math.max(0, ...rows.map((r) => r.turn)).toFixed(1)} deg) | moved off a band: ${movedRows.length} (max ${Math.max(0, ...rows.map((r) => r.moved)).toFixed(2)} m) | still touching a band (<0.1 m): ${rows.filter((r) => r.clear1 < CLEAR - 1e-6).length}`);
if (newHits.length) console.log('NEW overlap with another building:\n' + newHits.join('\n'));
if (notTurned.length) console.log('NOT TURNED:\n' + notTurned.join('\n'));
if (unmoved.length) console.log('NOT MOVED (cannot be done under 5 m):\n' + unmoved.join('\n'));
if (process.argv.includes('--log')) {
  console.log('| Shop | Type | Old spot | New spot | Moved m | Facing deg old -> new | Turned deg | Nearest road | Clearance old -> new m |\n|---|---|---|---|---|---|---|---|---|');
  for (const r of rows.filter((r) => r.moved > 0.005 || r.turn > 1)) console.log(`| ${r.name} | ${r.type} | ${r.from[0].toFixed(2)}, ${r.from[1].toFixed(2)} | ${r.to[0].toFixed(2)}, ${r.to[1].toFixed(2)} | ${r.moved.toFixed(2)}${r.slid ? ' (slid)' : ''} | ${r.facing0.toFixed(1)} -> ${r.facing.toFixed(1)} | ${r.turn.toFixed(1)} | ${r.road} | ${r.clear0.toFixed(2)} -> ${r.clear1.toFixed(2)} |`);
}
if (process.argv.includes('--check') || process.argv.includes('--log')) { /* report only */ }
else { fs.writeFileSync(U('../src/layout/shopRects.json'), JSON.stringify({ made: 'node tools/shop-rects-pack.mjs', source: 'docs/layout/approved-map-2026-11-25.json', rule: 'faces the nearest road, 0 overlap with every road band (>= 0.1 m), her rule 25 Nov', rects })); console.log('wrote src/layout/shopRects.json', Object.keys(rects).length, 'rects'); }
