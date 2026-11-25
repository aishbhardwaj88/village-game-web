#!/usr/bin/env node
/**
 * Shop footprints that follow the approved map exactly (26 Nov). Reads ONLY docs/layout/approved-map-2026-11-25.json and the packed
 * src/layout/mapData.json (to see what the pack tool made), and writes src/layout/shopRects.json: for every shop-like object whose
 * packed rect (o.rect) is not the drawn plot or not facing the map's own front, the replacement rect.
 *   position = centre of the drawn plot; size = the plot's own edges; front = the place marker's front (marker within 6 m of the
 *   plot, same name), or for a shop with no marker of its own the plot edge that faces the nearest road.
 * src/layout/layout.js applies the file when it loads, so shopsPlace, missions and every other reader see the same rects.
 * Usage: node tools/shop-rects-pack.mjs [--check]
 */
import fs from 'node:fs';
const U = (p) => new URL(p, import.meta.url);
const raw = JSON.parse(fs.readFileSync(U('../docs/layout/approved-map-2026-11-25.json')));
const packed = JSON.parse(fs.readFileSync(U('../src/layout/mapData.json')));
const labelKey = (o) => o.label.split('|')[0].trim(), labelName = (o) => (o.label.split('|')[1] || '').trim();
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
const segs = []; for (const r of raw.roads) for (let i = 0; i < r.pts.length - 1; i++) segs.push({ a: r.pts[i], b: r.pts[i + 1], half: (r.width || 4) / 2 });
const roads = { clearance(x, z) { let best = 1e9; for (const s of segs) { const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2)); const d = Math.hypot(x - s.a[0] - dx * t, z - s.a[1] - dz * t) - s.half; if (d < best) best = d; } return best; } };
const NOT_SHOPS = new Set(['Hand pump', 'Well', 'Washing line', 'Dung cakes', 'Resting spot', 'Buffalo', 'Haystack', 'Old well', 'Transformer', 'Mobile tower', 'Water trough', 'Washing platform', 'Barber under a tree', 'Weekly market ground']);
const rk = (o) => `${o.label}@${o.rings[0][0][0]},${o.rings[0][0][1]}`;
const r3 = (v) => Math.round(v * 1000) / 1000;
const out = {}, rep = [];
const MAXOFF = 4.5; // deg: a shop whose plot is turned further than this off its front is turned to the front (never more than needed)
packed.objects.forEach((o, oi) => {
  if (o.kind !== 'solids' || !o.rings?.[0] || o.rings[0].length !== 4) return;
  const key = labelKey(o), name = labelName(o);
  if (!key.startsWith('new_') || key === 'new_sqh') return;
  const isSqx = key === 'new_sqx', isKiosk = key === 'new_kiosk' || key === 'new_cart', isSingle = /^new_[A-Z]/.test(key) && !NOT_SHOPS.has(name);
  if (!isSqx && !isKiosk && !isSingle) return;
  const rg = o.rings[0], c = { x: rg.reduce((a, p) => a + p[0], 0) / 4, z: rg.reduce((a, p) => a + p[1], 0) / 4 };
  let place = matchPlace(raw.places, isSqx ? name.replace(/ \(2-storey\)$/, '') : name, c.x, c.z), how = 'marker';
  let f;
  if (place) { const L = Math.hypot(...place.front) || 1; f = [place.front[0] / L, place.front[1] / L]; }
  else if (isSqx || isKiosk) {
    how = 'plot edge facing the nearest road'; let best = null;
    const ee = [[rg[1][0] - rg[0][0], rg[1][1] - rg[0][1]], [rg[2][0] - rg[1][0], rg[2][1] - rg[1][1]]];
    for (const e of ee) { const L = Math.hypot(...e) || 1; for (const sg of [1, -1]) { const ff = [sg * e[0] / L, sg * e[1] / L], rr = ringRect(rg, ff); const cl = roads.clearance(c.x + ff[0] * (rr.depth / 2 + 3), c.z + ff[1] * (rr.depth / 2 + 3)); if (!best || cl < best.cl) best = { cl, f: ff }; } }
    f = best.f;
  } else return;
  const rr = ringRect(rg, f); // dims + the plot's own edge direction nearest f
  const yawF = Math.atan2(f[0], f[1]), yawE = rr.ry;
  let dd = yawF - yawE; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
  let ry = yawE;
  const off = Math.abs(dd) * 180 / Math.PI;
  if (off > MAXOFF) ry = yawF; // exact front for a plot drawn more than 4.5 deg off its marker's front
  const fr = [Math.sin(ry), Math.cos(ry)];
  const want = { cx: r3(rr.x), cz: r3(rr.z), w: r3(rr.width), d: r3(rr.depth), ry: r3(ry), front: [r3(fr[0]), r3(fr[1])], frontMid: [r3(rr.x + fr[0] * rr.depth / 2), r3(rr.z + fr[1] * rr.depth / 2)] };
  const cur = o.rect;
  const posOff = cur ? Math.hypot(cur.cx - want.cx, cur.cz - want.cz) : 0;
  let fd = 0; if (cur) { const dot = cur.front[0] * fr[0] + cur.front[1] * fr[1]; fd = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI; }
  if (!cur) { if (off > MAXOFF) { out[rk(o)] = want; rep.push(`${o.label} (no packed rect) front ${off.toFixed(1)} deg off its plot: turned to the ${how}`); } return; }
  if (posOff > 0.05 || fd > 1 || Math.abs(cur.w - want.w) > 0.3 || Math.abs(cur.d - want.d) > 0.3) {
    out[rk(o)] = want;
    rep.push(`${o.label} @${want.cx},${want.cz}: moved ${posOff.toFixed(2)} m, front ${fd.toFixed(1)} deg, plot skew ${off.toFixed(1)} (${how})`);
  }
});
if (process.argv.includes('--check')) { console.log(rep.join('\n')); console.log(Object.keys(out).length, 'overrides'); }
else { fs.writeFileSync(U('../src/layout/shopRects.json'), JSON.stringify({ made: 'node tools/shop-rects-pack.mjs', source: 'docs/layout/approved-map-2026-11-25.json', rects: out })); console.log('wrote src/layout/shopRects.json', Object.keys(out).length, 'rects'); console.log(rep.join('\n')); }
