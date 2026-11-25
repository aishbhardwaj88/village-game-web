// Lists every shop-like item of the approved map and what the game builds for it (re-implements src/kit/shopsPlace.js
// selection, matchPlace and ringRect in node; nothing is rendered). Usage: node tools/map-match-shops.mjs [--all]
import fs from 'node:fs';
const map = JSON.parse(fs.readFileSync(new URL('../docs/layout/approved-map-2026-11-25.json', import.meta.url)));
const NOT_SHOPS = new Set(['Hand pump', 'Well', 'Washing line', 'Dung cakes', 'Resting spot', 'Buffalo', 'Haystack', 'Old well', 'Transformer', 'Mobile tower', 'Water trough', 'Washing platform', 'Barber under a tree', 'Weekly market ground']);
const SHEDS = new Set(['Bus shelter', 'Cycle stand', 'Jaggery making unit', 'Milk carts']);
const RAIL = /^(Railway|Ticket window)/;
const key = (o) => o.label.split('|')[0].trim(), nm = (o) => (o.label.split('|')[1] || '').trim();
const ctr = (r) => ({ x: r.reduce((a, p) => a + p[0], 0) / r.length, z: r.reduce((a, p) => a + p[1], 0) / r.length });
function ringRect(ring, f) {
  const c = ctr(ring), e1 = [ring[1][0] - ring[0][0], ring[1][1] - ring[0][1]], e2 = [ring[2][0] - ring[1][0], ring[2][1] - ring[1][1]];
  const l1 = Math.hypot(...e1), l2 = Math.hypot(...e2);
  const p1 = Math.abs((e1[0] * f[0] + e1[1] * f[1]) / l1), p2 = Math.abs((e2[0] * f[0] + e2[1] * f[1]) / l2);
  const de = p1 > p2 ? e1 : e2, dl = p1 > p2 ? l1 : l2; let sf = [de[0] / dl, de[1] / dl];
  if (sf[0] * f[0] + sf[1] * f[1] < 0) sf = [-sf[0], -sf[1]];
  return { x: c.x, z: c.z, w: p1 > p2 ? l2 : l1, d: p1 > p2 ? l1 : l2, front: sf, skew: Math.acos(Math.min(1, Math.abs(sf[0] * f[0] + sf[1] * f[1]))) * 180 / Math.PI };
}
const game = JSON.parse(fs.readFileSync(new URL('../src/layout/mapData.json', import.meta.url)));
// roads as the game now DRAWS them = the approved file's own roads (26 Nov, tools/map-match-roads.mjs); --packed-roads uses the older clipped copy
const segs = []; for (const r of (process.argv.includes('--packed-roads') ? game.roads : map.roads)) for (let i = 0; i < r.pts.length - 1; i++) segs.push({ a: r.pts[i], b: r.pts[i + 1], half: (r.width || 4) / 2, id: r.id });
function roadAt(x, z) { let best = 1e9, id = null; for (const s of segs) { const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2)); const d = Math.hypot(x - s.a[0] - dx * t, z - s.a[1] - dz * t) - s.half; if (d < best) { best = d; id = s.id; } } return { d: best, id }; }
const clr = (x, z) => roadAt(x, z).d;
const matchPlace = (name, x, z) => { let b = null, bd = 6; for (const p of map.places) { if (p.existing) continue; const pn = p.name.replace(/ \(2-storey\)$/, ''); if (pn !== name && p.name !== name) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; b = p; } } return b; };
const deg = (v) => Math.atan2(v[0], v[1]) * 180 / Math.PI;
const sigSrc = fs.readFileSync(new URL('../src/kit/shopsSigns.js', import.meta.url), 'utf8');
const hiBlock = sigSrc.slice(sigSrc.indexOf('export const HINDI = {'), sigSrc.indexOf('};', sigSrc.indexOf('export const HINDI = {')));
const hasHindi = (n) => { const en = n.replace(/ \(2-storey\)$/, '').replace(/ (kiosk|cart)$/, ''); return hiBlock.includes(`'${en}':`) || hiBlock.includes(`"${en}":`); };
const rows = [];
for (const o of map.objects) {
  if (o.kind !== 'solids' || !o.rings?.[0]) continue;
  const k = key(o), name = nm(o);
  if (!k.startsWith('new_') || k === 'new_sign') continue;
  const sq = k === 'new_sqx', ki = k === 'new_kiosk' || k === 'new_cart', sqh = k === 'new_sqh';
  const single = /^new_[A-Z]/.test(k) && !NOT_SHOPS.has(name);
  if (!(sq || ki || sqh || single)) continue;
  const rg = o.rings[0], c0 = ctr(rg);
  const row = { label: o.label, name, type: sq ? 'sqx' : ki ? 'kiosk/cart' : sqh ? 'sqh' : SHEDS.has(name) ? 'shed' : 'single', mapX: +c0.x.toFixed(1), mapZ: +c0.z.toFixed(1), ringPts: rg.length };
  if (RAIL.test(name)) row.note = 'railway (railway.js)';
  if (rg.length !== 4) { row.status = 'SKIPPED (ring not 4 points)'; rows.push(row); continue; }
  let place = sqh ? null : matchPlace(sq ? name.replace(/ \(2-storey\)$/, '') : name, c0.x, c0.z), how = 'place';
  let front = place?.front;
  if (!place && (sq || ki)) {
    const e = [[rg[1][0] - rg[0][0], rg[1][1] - rg[0][1]], [rg[2][0] - rg[1][0], rg[2][1] - rg[1][1]]]; let best = null;
    for (const ed of e) { const L = Math.hypot(...ed) || 1; for (const sg of [1, -1]) { const f = [sg * ed[0] / L, sg * ed[1] / L], rr = ringRect(rg, f); const cl = clr(c0.x + f[0] * (rr.d / 2 + 3), c0.z + f[1] * (rr.d / 2 + 3)); if (!best || cl < best.cl) best = { cl, f }; } }
    front = best.f; how = 'ring-fallback';
  }
  if (sqh) { front = [0, 1]; how = 'sqh-edge'; }
  if (!front) { row.status = 'SKIPPED (no place with a front)'; rows.push(row); continue; }
  const rr = ringRect(rg, front);
  row.status = 'BUILT'; row.how = how; row.size = `${rr.w.toFixed(1)}x${rr.d.toFixed(1)}`;
  row.front = `${deg(rr.front).toFixed(0)}deg`; row.builtXZ = `${rr.x.toFixed(1)},${rr.z.toFixed(1)}`;
  row.offsetM = +Math.hypot(rr.x - c0.x, rr.z - c0.z).toFixed(2);
  row.frontOffDeg = place ? +Math.abs(((deg(rr.front) - deg(place.front) + 540) % 360) - 180).toFixed(1) : 0;
  let worst = 99; const cs = Math.cos(Math.atan2(rr.front[0], rr.front[1])), sn = Math.sin(Math.atan2(rr.front[0], rr.front[1]));
  for (const [lx, lz] of [[-rr.w / 2, -rr.d / 2], [rr.w / 2, -rr.d / 2], [rr.w / 2, rr.d / 2], [-rr.w / 2, rr.d / 2], [0, 0]]) worst = Math.min(worst, clr(rr.x + lx * cs + lz * sn, rr.z - lx * sn + lz * cs));
  row.roadClear = +worst.toFixed(2); row.roadId = roadAt(rr.x, rr.z).id;
  const small = ki || SHEDS.has(name), rad = Math.hypot(rr.w, rr.d) / 2;
  if (small && clr(rr.x, rr.z) < rad + 0.02) { row.status = 'BUILT, small stand slid off the road by the game (nudgeOffRoad)'; row.nudged = true; }
  else if (worst < -0.05) row.status = 'BUILT ON ROAD BAND (map position kept, NEEDS_YOU)';
  row.hasSign = !!name && name !== 'Cycle stand' && hasHindi(name); if (!row.hasSign) row.signMissing = true;
  rows.push(row);
}
const by = (f) => rows.filter(f).length;
console.log(`shop-like map items: ${rows.length} | built: ${by(r => r.status?.startsWith('BUILT'))} | skipped: ${by(r => r.status?.startsWith('SKIPPED'))} | railway: ${by(r => r.note)}`);
console.log(`ring-fallback fronts: ${by(r => r.how === 'ring-fallback')} | offset >0.3 m: ${by(r => r.offsetM > 0.3)} | front off >5 deg: ${by(r => r.frontOffDeg > 5)} | NO BOARD (no Hindi line): ${by(r => r.signMissing)} | small stands nudged off roads: ${by(r => r.nudged)} | touching a road band: ${by(r => r.roadClear < -0.05)}`);
const all = process.argv.includes('--all');
for (const r of rows) { const bad = r.signMissing || !r.status.startsWith('BUILT') || r.status !== 'BUILT' || r.offsetM > 0.3 || r.frontOffDeg > 5; if (all || bad) console.log(JSON.stringify(r)); }
const NAMED = ['Kirana', 'Jeweller', 'Readymade clothes', 'Pooja', 'Kites and toys', 'Gift shop', 'Hardware and paint', 'Village bank', 'Library and reading room', "Doctor's clinic", 'Animal hospital', 'Gas cylinder godown', "Farmers' cooperative and godown", 'Wedding and community hall', 'Tent and wedding lights'];
console.log('--- named list from MAP_COMPLETENESS');
for (const n of NAMED) for (const r of rows.filter(x => x.name.startsWith(n))) console.log(r.name, r.mapX, r.mapZ, r.status, r.builtXZ, 'off', r.offsetM, 'road', r.roadClear);
