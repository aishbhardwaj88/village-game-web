// Road rule check (her rule, 26 Nov: NO OBJECT ON A ROAD). Builds the REAL khaat / doorstep clutter and planter sites of every
// new-map house (same code the game runs: housesAssign, housesKit, doorPropClear, newHouseSites) against the approved map roads,
// and reports how many are on or touching a road band BEFORE the build-time filter and AFTER it. Usage: node tools/road-clearance-props.mjs
import fs from 'node:fs';
import { buildHouse } from '../src/kit/housesKit.js';
import { assignHouses, clutterFor } from '../src/kit/housesAssign.js';
import { rectCorners } from '../src/kit/housesPlan.js';
import { clutterClearance, filterClutter } from '../src/kit/doorPropClear.js';
import { plantSitesFor, furnitureSitesFor } from '../src/kit/newHouseSites.js';
const map = JSON.parse(fs.readFileSync(new URL('../docs/layout/approved-map-2026-11-25.json', import.meta.url)));
const segs = [];
for (const r of map.roads) for (let i = 0; i < r.pts.length - 1; i++) segs.push({ a: r.pts[i], b: r.pts[i + 1], half: (r.width || 4) / 2, id: r.id });
const clearance = (x, z) => {
  let best = 1e9;
  for (const s of segs) {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2));
    best = Math.min(best, Math.hypot(x - (s.a[0] + dx * t), z - (s.a[1] + dz * t)) - s.half);
  }
  return best;
};
const idx = { clearance };
const data = JSON.parse(fs.readFileSync(new URL('../src/kit/housesPlanData.json', import.meta.url)));
const plan = data.rows.map(([i, x, z, ry, w, d, mud, road]) => ({ i, x, z, ry, w, d, mud: !!mud, road, front: [Math.sin(ry), Math.cos(ry)], corners: rectCorners(x, z, ry, w, d) }));
const entries = assignHouses(plan), infos = new Map(), houses = [];
let before = { khaat: 0, other: 0 }, after = { khaat: 0, other: 0 }, tot = { khaat: 0, other: 0 }, keptAfter = 0;
for (const e of entries) {
  const k = `${e.design}|${e.cw}|${e.cd}|${e.mirror ? 1 : 0}`;
  if (!infos.has(k)) infos.set(k, buildHouse(e.design, e.cw, e.cd, e.mirror).info);
  e.info = infos.get(k);
  const raw = clutterFor(e, e.info), kept = filterClutter(e, raw, clearance);
  for (const c of raw) { const t = c.kind === 'charpai' ? 'khaat' : 'other'; tot[t]++; if (clutterClearance(e, c, clearance) < 0) before[t]++; }
  for (const c of kept) { const t = c.kind === 'charpai' ? 'khaat' : 'other'; if (clutterClearance(e, c, clearance) < 0.6) after[t]++; }
  keptAfter += kept.length;
  const s = e.info;
  houses.push({ x: e.x, z: e.z, ry: e.ry, w: e.w, d: e.d, fz: (s.zf ?? e.cd / 2) * (e.sz || 1), dx0: s.door.x0 * (e.sx || 1), dx1: s.door.x1 * (e.sx || 1), stepD: (s.otlaDepth || 0) * (e.sz || 1), noStrip: !!s.noStrip });
}
const planters = plantSitesFor(houses, idx), planters0 = plantSitesFor(houses, null);
const bad = (l) => l.filter((p) => clearance(p.x, p.z) < 0.6).length;
const furn = furnitureSitesFor(houses, idx), furn0 = furnitureSitesFor(houses, null);
console.log(`${entries.length} houses`);
console.log(`khaat: ${tot.khaat} planned, ${before.khaat} touch a road band before filter, ${after.khaat} after`);
console.log(`other doorstep clutter: ${tot.other} planned, ${before.other} touch a road before filter, ${after.other} after`);
console.log(`planters: ${planters0.length} planned, ${bad(planters0)} within 0.6 m of a road before filter, ${bad(planters)} after (${planters.length} kept)`);
console.log(`street furniture: ${furn0.length} planned, ${bad(furn0)} within 0.6 m before, ${bad(furn)} after (${furn.length} kept)`);
