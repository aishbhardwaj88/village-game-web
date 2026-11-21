/**
 * Node check for the new-map houses (S7 sprint, houses agent). Not imported by the game.
 *   node src/kit/housesCheck.js [--json out.json]
 * Prints: count, size classes, front roads, and the failures of the hard rules:
 *  - a house footprint on a road (corridor = centre line +- half width), with its clearance in metres
 *  - two house footprints overlapping, or a house overlapping another solid of the map
 *  - a front edge not parallel to its road (> 3 deg)
 *  - a house with no road in front of it
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { planHouses, footprintRoadClearance, inRing, segDist, ringsOverlap as overlap } from './housesPlan.js';
import { houseMapFrom } from './housesLayout.js';

const map = JSON.parse(readFileSync(new URL('../../docs/layout/approved-map-2026-11-21.json', import.meta.url)));
const { houses, roads, solids } = houseMapFrom(map);
const plan = planHouses(houses, roads);

const convex = (r) => r.length >= 3;

const fails = { onRoad: [], houseOverlap: [], solidOverlap: [], placeInside: [], notParallel: [], noRoad: [] };
plan.forEach((h) => {
  const c = footprintRoadClearance(h.corners, roads);
  if (c < -0.05) fails.onRoad.push({ i: h.i, x: +h.x.toFixed(1), z: +h.z.toFixed(1), by: +(-c).toFixed(2) });
  if (!h.road) fails.noRoad.push({ i: h.i, x: +h.x.toFixed(1), z: +h.z.toFixed(1) });
  else {
    // the front road's nearest segment direction vs the front edge direction
    const r = roads.find((q) => q.id === h.road);
    const p = [h.x + h.front[0] * (h.d / 2 + h.roadGap), h.z + h.front[1] * (h.d / 2 + h.roadGap)];
    let best = null, bd = Infinity;
    for (let k = 0; k + 1 < r.pts.length; k++) { const d = segDist(p, r.pts[k], r.pts[k + 1]); if (d < bd) { bd = d; best = [r.pts[k], r.pts[k + 1]]; } }
    const rd = h.roadDir ?? Math.atan2(best[1][1] - best[0][1], best[1][0] - best[0][0]);
    const fd = Math.atan2(-h.front[0], h.front[1]); // edge direction = front normal turned 90 deg
    let a = Math.abs(((rd - fd) * 180) / Math.PI) % 180;
    if (a > 90) a = 180 - a;
    h.roadAngle = a;
    if (a > 3) fails.notParallel.push({ i: h.i, x: +h.x.toFixed(1), z: +h.z.toFixed(1), road: h.road, deg: +a.toFixed(1) });
  }
});
for (let i = 0; i < plan.length; i++) for (let j = i + 1; j < plan.length; j++) {
  if (Math.abs(plan[i].x - plan[j].x) > 12 || Math.abs(plan[i].z - plan[j].z) > 12) continue;
  if (overlap(plan[i].corners, plan[j].corners)) fails.houseOverlap.push([i, j]);
}
for (const h of plan) for (const s of solids) {
  if (!convex(s.ring)) continue;
  const sx = s.ring.reduce((t, p) => t + p[0], 0) / s.ring.length, sz = s.ring.reduce((t, p) => t + p[1], 0) / s.ring.length;
  if (Math.abs(sx - h.x) > 30 || Math.abs(sz - h.z) > 30) continue;
  if (s.ring.length === 4 ? overlap(h.corners, s.ring) : s.ring.some((p) => inRing(p, h.corners))) fails.solidOverlap.push({ i: h.i, solid: s.label });
}

// a map place (existing or new: shops, temple, school...) whose centre falls inside a house footprint
for (const h of plan) for (const pl of map.places) {
  if (Math.abs(pl.x - h.x) > 8 || Math.abs(pl.z - h.z) > 8) continue;
  if (inRing([pl.x, pl.z], h.corners)) fails.placeInside.push({ i: h.i, place: pl.id });
}
const sizes = {};
for (const h of plan) { const k = `${h.w.toFixed(1)}x${h.d.toFixed(1)}`; sizes[k] = (sizes[k] || 0) + 1; }
const byRoad = {};
for (const h of plan) byRoad[h.road] = (byRoad[h.road] || 0) + 1;
console.log(`houses: ${plan.length} (mud ${plan.filter((h) => h.mud).length})`);
console.log('front x depth classes:', sizes);
console.log('fronts per road:', byRoad);
for (const [k, v] of Object.entries(fails)) console.log(`${k}: ${v.length}`, v.length ? JSON.stringify(v.slice(0, 12)) : '');
const outIdx = process.argv.indexOf('--json');
if (outIdx > 0) writeFileSync(process.argv[outIdx + 1], JSON.stringify({ plan, fails }, null, 0));

// --write-plan: the planned houses as a small file the game loads instead of the whole map + the planning walk (~30 KB vs 550 KB)
if (process.argv.includes('--write-plan')) {
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const rows = plan.map((h) => [h.i, r3(h.x), r3(h.z), Math.round(h.ry * 1e5) / 1e5, r3(h.w), r3(h.d), h.mud ? 1 : 0, h.road]);
  writeFileSync(new URL('./housesPlanData.json', import.meta.url), JSON.stringify({ source: 'docs/layout/approved-map-2026-11-21.json', made: 'node src/kit/housesCheck.js --write-plan', fields: ['i', 'x', 'z', 'ry', 'w', 'd', 'mud', 'road'], rows }));
  console.log('wrote src/kit/housesPlanData.json', rows.length);
}
