#!/usr/bin/env node
// Match check for every shop, kiosk, cart, shed and the shopkeeper's home, under HER RULE (25 Nov, replaces the marker-arrow facing and the
// "slide a stand 1 m" rules): every shop FACES THE ROAD IT FRONTS (walls square to it) and stands at 0 overlap with every road band
// (band = approved-map road polyline buffered by width/2, flat caps; clear by at least 0.1 m).
// It runs the game's OWN shops builder (src/kit/shopsPlace.js, raw map as the browser feeds it) in node and checks the rect each design is
// placed on, so a pass here is a pass of the code path the game runs, not of a data file. The geometry below is independent of
// tools/shop-rects-pack.mjs (area by 5 cm grid sampling, distance to flat-ended rectangles + joint discs).
// Usage: node tools/map-match-shops.mjs [--all]      exit 1 when a shop fails and is not in ALLOWED
import fs from 'node:fs';
import './missions-node-env.mjs';
globalThis.__DOPAHAR_LAYOUT = 'new';
const U = (p) => new URL(p, import.meta.url);
const map = JSON.parse(fs.readFileSync(U('../docs/layout/approved-map-2026-11-25.json')));
const { buildShops } = await import('../src/kit/shopsPlace.js');
const group = buildShops(map);
const rep = group.userData.report;
const rects = rep.rects; // { name, type, x, z, ry, w, d } as placed by shopsPlace.js
// ---- exceptions the rule cannot fix, each with its reason (docs/layout/MOVE_LOG_SHOPS_25NOV.md)
const ALLOWED = {}; // none: the Optician is 3.6 m wide (clears both bands) and the shopkeeper's home fronts gali_n41 under the review definition
// ---- roads: flat caps at the two ends of each polyline, round joins between segments
const roads = map.roads.map((r) => ({ id: r.id, half: (r.width || 4) / 2, pts: r.pts }));
const rectDist = (s, x, z) => { // distance from a point to the flat-ended rectangle of one segment (0 inside)
  const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
  const al = (x - s.a[0]) * ux + (z - s.a[1]) * uz, pe = Math.abs(-(x - s.a[0]) * uz + (z - s.a[1]) * ux);
  return Math.hypot(Math.max(0, -al, al - L), Math.max(0, pe - s.half));
};
const segs = [], discs = [];
for (const r of roads) { for (let i = 0; i < r.pts.length - 1; i++) segs.push({ id: r.id, a: r.pts[i], b: r.pts[i + 1], half: r.half }); for (let i = 1; i < r.pts.length - 1; i++) discs.push({ id: r.id, c: r.pts[i], half: r.half }); }
let nearSegs = segs, nearDiscs = discs; // pruned per shop to the roads within 40 m of it (a speed-up only)
const prune = (cx, cz) => { nearSegs = segs.filter((s) => rectDist(s, cx, cz) < 40); nearDiscs = discs.filter((c) => Math.hypot(cx - c.c[0], cz - c.c[1]) < 40 + c.half); };
const bandDist = (x, z) => { let m = 1e9, id = null; for (const s of nearSegs) { const d = rectDist(s, x, z); if (d < m) { m = d; id = s.id; } } for (const c of nearDiscs) { const d = Math.max(0, Math.hypot(x - c.c[0], z - c.c[1]) - c.half); if (d < m) { m = d; id = c.id; } } return { d: m, id }; };
// ---- built footprint (local x right, z front), measured from the src/kit/shopsKit.js designs (same table as the pack tool)
const FP = { shop: (w, d) => [w / 2 + 0.07, d / 2 + 0.1, w / 2 + 0.07, d / 2 + 0.1], shopHouse: (w, d) => [w / 2 + 0.07, d / 2 + 0.1, w / 2 + 0.07, d / 2 + 0.1], kiosk: (w, d) => [w / 2 + 0.12, d / 2 + 0.1, w / 2 + 0.12, d / 2 + 0.35], cart: () => [1.6, 0.7, 1.2, 0.7], shed: (w, d) => [w / 2 + 0.25, d / 2 + 0.28, w / 2 + 0.25, d / 2 + 0.28] }; // [-x, -z, +x, +z]
const W2 = (r, lx, lz) => { const c = Math.cos(r.ry), s = Math.sin(r.ry); return [r.x + lx * c + lz * s, r.z - lx * s + lz * c]; };
const rows = [];
for (const r of rects) {
  const bw = r.type === 'kiosk' ? Math.min(Math.round(r.w * 10) / 10, 3.2) : Math.round(r.w * 10) / 10, bd = r.type === 'kiosk' ? Math.min(Math.round(r.d * 10) / 10, 3.2) : Math.round(r.d * 10) / 10;
  const [mx, mz, px, pz] = FP[r.type](bw, bd); prune(r.x, r.z);
  // overlap area: 5 cm grid inside the footprint
  let hit = 0, n = 0, depthPts = 0;
  for (let lx = -mx + 0.025; lx < px; lx += 0.05) for (let lz = -mz + 0.025; lz < pz; lz += 0.05) { n++; const [x, z] = W2(r, lx, lz); if (bandDist(x, z).d <= 0) hit++; }
  // clearance: perimeter every 0.1 m
  let clear = 1e9, clearRoad = null;
  const perim = []; for (let lx = -mx; lx <= px + 1e-9; lx += 0.1) perim.push([lx, -mz], [lx, pz]); for (let lz = -mz; lz <= pz + 1e-9; lz += 0.1) perim.push([-mx, lz], [px, lz]);
  for (const [lx, lz] of perim) { const q = bandDist(...W2(r, lx, lz)); if (q.d < clear) { clear = q.d; clearRoad = q.id; } }
  // facing (REVIEW RULE 25 Nov): m_front = centre of the front face, m_back = centre of the back face (measured on the built box AND on the plot rect, the stricter counts);
  // the road it fronts = the band nearest m_front; PASS when that band is within 15 m (any distance for an enclosed building with no band within 15 m of any face),
  // m_front is not farther from a band than m_back is (+0.5 m), and the walls are square to that road's direction at the nearest point (5 deg, 10 on the curved ring roads)
  const f = [Math.sin(r.ry), Math.cos(r.ry)], faceMids = [[W2(r, (px - mx) / 2, pz), W2(r, (px - mx) / 2, -mz)], [[r.x + f[0] * bd / 2, r.z + f[1] * bd / 2], [r.x - f[0] * bd / 2, r.z - f[1] * bd / 2]]];
  let faceErr = 0, roadId = null; const CURVED = new Set(['ring_road', 'inner_loop', 'chauraha_ring']);
  const enclosed = [[0, pz], [0, -mz], [px, 0], [-mx, 0]].every(([lx, lz]) => bandDist(...W2(r, lx, lz)).d > 15);
  for (const [fm, bm] of faceMids) {
    let rid = null, rdist = 1e9; for (const rr of roads) { let m = 1e9; for (let i = 0; i < rr.pts.length - 1; i++) m = Math.min(m, rectDist({ a: rr.pts[i], b: rr.pts[i + 1], half: rr.half }, fm[0], fm[1])); for (let i = 1; i < rr.pts.length - 1; i++) m = Math.min(m, Math.max(0, Math.hypot(fm[0] - rr.pts[i][0], fm[1] - rr.pts[i][1]) - rr.half)); if (m < rdist) { rdist = m; rid = rr.id; } }
    const bdist = bandDist(bm[0], bm[1]).d; let e = 0;
    if (!enclosed && rdist > 15) e = 90;
    if (rdist > bdist + 0.5) e = Math.max(e, 90); // the back is nearer a road than the front
    // skew of the walls against the direction of that road at the nearest point (segments within 5 cm of the nearest distance; the best counts at a bend)
    let sk = 90; for (const s of segs) { if (s.id !== rid) continue; if (rectDist(s, fm[0], fm[1]) > rdist + 0.05) continue; const ang = Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]); sk = Math.min(sk, Math.abs(((r.ry - ang + Math.PI / 4) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4) * 180 / Math.PI); }
    if (sk > (CURVED.has(rid) ? 10 : 5)) e = Math.max(e, sk);
    if (e > faceErr) faceErr = e; roadId = rid;
  }
  const road = roadId;
  rows.push({ name: /^sqh\|/.test(r.name) ? "Shopkeeper's home and godown" : r.name, type: r.type, x: +r.x.toFixed(2), z: +r.z.toFixed(2), overlapM2: +(hit * 0.0025).toFixed(3), clear: +clear.toFixed(2), clearRoad, faceErr: faceErr == null ? null : +faceErr.toFixed(2), faceRoad: road });
}
// ---- results
const fails = [];
for (const r of rows) {
  const bad = [];
  if (r.overlapM2 > 0) bad.push('overlap');
  else if (r.clear < 0.1 - 1e-6) bad.push('clear');
  if (r.faceErr == null || r.faceErr > 0) bad.push('facing');
  r.bad = bad;
  if (bad.length) { const al = ALLOWED[r.name]; const kinds = bad.filter((b) => !(al && (al[b === 'clear' ? 'overlap' : b]))); r.allowed = al ? bad.filter((b) => al[b === 'clear' ? 'overlap' : b]) : []; if (kinds.length) fails.push(r); }
}
const key = (o) => o.label.split('|')[0].trim();
const expected = map.objects.filter((o) => o.kind === 'solids' && o.rings?.[0]?.length === 4 && /^new_(sqx|kiosk|cart|sqh)$|^new_[A-Z]/.test(key(o))).length;
const turned = rects.length; // placed
console.log(`shops placed by src/kit/shopsPlace.js: ${rows.length} (houses ${rep.shopHouses}, homes ${rep.shopkeeperHomes}, shops ${rep.shops}, kiosks ${rep.kiosks}, carts ${rep.carts}, sheds ${rep.sheds}; 3 railway buildings are built by railway.js)`);
console.log(`overlap with a road band (area > 0): ${rows.filter((r) => r.overlapM2 > 0).length} | clearance < 0.1 m: ${rows.filter((r) => r.clear < 0.1 - 1e-6).length} | fails the review facing rule (road within 15 m, front not farther than back + 0.5 m, walls square within 5/10 deg): ${rows.filter((r) => r.faceErr == null || r.faceErr > 1.5).length}`);
const allowed = rows.filter((r) => r.allowed?.length);
if (allowed.length) console.log('accepted exceptions (reason in MOVE_LOG_SHOPS_25NOV.md):\n' + allowed.map((r) => `  ${r.name} ${r.x},${r.z}: ${r.bad.join('+')} (${r.overlapM2} m2, clear ${r.clear} m, facing err ${r.faceErr}) - ${Object.values(ALLOWED[r.name]).join('; ')}`).join('\n'));
console.log('game builder own check (round-capped roads, report.onRoad):', rep.onRoad.length ? rep.onRoad.join(' | ') : 'none');
if (process.argv.includes('--all')) for (const r of rows) console.log(JSON.stringify(r));
if (fails.length) { console.log(`FAIL: ${fails.length} shops`); for (const r of fails) console.log('  ', JSON.stringify(r)); process.exit(1); }
console.log('PASS: every shop is square to the road it fronts, 0 overlap with every band (except the accepted exceptions)');
