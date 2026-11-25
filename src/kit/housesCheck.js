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
import { planHouses, footprintRoadClearance, inRing, segDist, ringsOverlap as overlap, roadIndex, rectCorners } from './housesPlan.js';
import { houseMapFrom } from './housesLayout.js';

// The game's own map (the layout agent's src/layout/mapData.json: the approved export with galis trimmed at junctions and the
// chauraha ring added) when it is there, else the approved export itself.
const LAYOUT_DATA = new URL('../layout/mapData.json', import.meta.url);
const APPROVED = new URL('../../docs/layout/approved-map-2026-11-25.json', import.meta.url);
let mapSource = 'src/layout/mapData.json';
let map;
try { map = JSON.parse(readFileSync(LAYOUT_DATA)); } catch { map = JSON.parse(readFileSync(APPROVED)); mapSource = 'docs/layout/approved-map-2026-11-25.json'; }
console.log('map:', mapSource);
// Houses sit EXACTLY on the approved map's drawn rectangles (centre, size, facing): plan from the raw approved file, no turning, trimming or nudging.
const approved = JSON.parse(readFileSync(APPROVED));
const { roads, solids } = houseMapFrom(map);
const { houses } = houseMapFrom(approved);
// the map's own front per house (layout derivation, same footprint: nearest centre within 8 m)
const packedRects = map.objects.filter((o) => o.label.startsWith('new_house') && o.rect).map((o) => o.rect);
for (const h of houses) {
  const cx = h.ring.reduce((t, p) => t + p[0], 0) / 4, cz = h.ring.reduce((t, p) => t + p[1], 0) / 4;
  let best = null, bd = 8;
  for (const r of packedRects) { const d = Math.hypot(r.cx - cx, r.cz - cz); if (d < bd) { bd = d; best = r; } }
  if (best) h.frontHint = best.front;
}
const plan = planHouses(houses, roads, solids, { exact: true });
mapSource = 'docs/layout/approved-map-2026-11-25.json (exact)';
// Her road rules (25 Nov): the logged moves in housesMoves.json (made by the road-clearance pass) override the drawn spot,
// size and facing of the houses they list, so re-running --write-plan never undoes them. Row: [i, old x5, new x5, metres, facing, road].
try {
  const mv = JSON.parse(readFileSync(new URL('./housesMoves.json', import.meta.url))).rows;
  for (const [i, , , , , , x, z, ry, w, d, , , road] of mv) {
    const h = plan.find((q) => q.i === i);
    if (!h) continue;
    Object.assign(h, { x, z, ry, w, d, front: [Math.sin(ry), Math.cos(ry)], corners: rectCorners(x, z, ry, w, d), road: road || h.road });
  }
  console.log('applied', mv.length, 'logged moves (housesMoves.json)');
} catch (e) { console.log('no housesMoves.json applied:', e.message); }

const convex = (r) => r.length >= 3;

const fails = { onRoad: [], houseOverlap: [], solidOverlap: [], placeInside: [], treeTrunkInHouse: [], notParallel: [], noRoad: [] };
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
    if (!best) return; // a logged move (housesMoves.json) changed the footprint: the stale probe gap no longer reaches the road; map-match-houses.mjs checks facing instead
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
// shops-land trees (src/kit/landTrees.js): the drawn tree markers + the rows it fills orchards with (same rule, copied here).
// A trunk inside (or within 0.3 m of) a house is a fail; a crown over a roof is only counted.
const hash01 = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const TREE_KEYS = new Set(['new_mango', 'new_guava', 'new_rowtree', 'new_tree', 'new_greenbelt', 'new_kilngreen', 'new_peepal']);
const trees = [];
for (const o of map.objects) {
  if (o.kind !== 'trees' || !TREE_KEYS.has(o.label.split('|')[0].trim())) continue;
  if (o.cx != null) { trees.push({ x: o.cx, z: o.cz, rad: o.r || 3, label: o.label }); continue; } // layout data: centre + radius
  if (!o.rings?.[0]) continue;
  const r = o.rings[0], cx = r.reduce((t, p) => t + p[0], 0) / r.length, cz = r.reduce((t, p) => t + p[1], 0) / r.length;
  trees.push({ x: cx, z: cz, rad: r.reduce((t, p) => t + Math.hypot(p[0] - cx, p[1] - cz), 0) / r.length, label: o.label });
}
const RI2 = roadIndex(map.roads);
for (const o of map.objects) {
  if (o.label.split('|')[0].trim() !== 'new_orchard' || !o.rings?.[0]) continue;
  const ring = o.rings[0], xs = ring.map((q) => q[0]), zs = ring.map((q) => q[1]), step = 10.5;
  const mango = !/guava/i.test(o.label.split('|')[1] || '');
  for (let x = Math.min(...xs) + step / 2; x < Math.max(...xs); x += step) for (let z = Math.min(...zs) + step / 2; z < Math.max(...zs); z += step) {
    const jx = x + (hash01(x, z) - 0.5) * 1.2, jz = z + (hash01(z, x) - 0.5) * 1.2;
    if (!inRing([jx, jz], ring) || RI2.clearance([jx, jz]) < 4) continue;
    if (trees.some((t) => (t.x - jx) ** 2 + (t.z - jz) ** 2 < 64)) continue;
    trees.push({ x: jx, z: jz, rad: mango ? 3.6 : 2.6, label: 'orchard fill' });
  }
}
let crownsOverRoofs = 0;
for (const h of plan) for (const t of trees) {
  if (Math.abs(t.x - h.x) > 12 || Math.abs(t.z - h.z) > 12) continue;
  const c = Math.cos(h.ry), sn = Math.sin(h.ry), dx = t.x - h.x, dz = t.z - h.z;
  const lx = dx * c - dz * sn, lz = dx * sn + dz * c; // into the house frame (local +z = front)
  const ox = Math.abs(lx) - h.w / 2, oz = Math.abs(lz) - h.d / 2;
  const dist = Math.hypot(Math.max(ox, 0), Math.max(oz, 0)) + Math.min(Math.max(ox, oz), 0);
  if (dist < 0.3) fails.treeTrunkInHouse.push({ i: h.i, x: +h.x.toFixed(1), z: +h.z.toFixed(1), tree: t.label, by: +(0.3 - dist).toFixed(2) });
  else if (dist < t.rad * 0.6) crownsOverRoofs++;
}
const sizes = {};
for (const h of plan) { const k = `${h.w.toFixed(1)}x${h.d.toFixed(1)}`; sizes[k] = (sizes[k] || 0) + 1; }
const byRoad = {};
for (const h of plan) byRoad[h.road] = (byRoad[h.road] || 0) + 1;
console.log(`houses: ${plan.length} (mud ${plan.filter((h) => h.mud).length})`);
console.log('front x depth classes:', sizes);
console.log('fronts per road:', byRoad);
for (const [k, v] of Object.entries(fails)) console.log(`${k}: ${v.length}`, v.length ? JSON.stringify(v.slice(0, 12)) : '');
console.log(`trees checked: ${trees.length}; crowns reaching over a roof (fine, shade): ${crownsOverRoofs}`);
const outIdx = process.argv.indexOf('--json');
if (outIdx > 0) writeFileSync(process.argv[outIdx + 1], JSON.stringify({ plan, fails }, null, 0));

// --write-plan: the planned houses as a small file the game loads instead of the whole map + the planning walk (~30 KB vs 550 KB)
if (process.argv.includes('--write-plan')) {
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const rows = plan.map((h) => [h.i, r3(h.x), r3(h.z), Math.round(h.ry * 1e5) / 1e5, r3(h.w), r3(h.d), h.mud ? 1 : 0, h.road]);
  writeFileSync(new URL('./housesPlanData.json', import.meta.url), JSON.stringify({ source: mapSource, made: 'node src/kit/housesCheck.js --write-plan', fields: ['i', 'x', 'z', 'ry', 'w', 'd', 'mud', 'road'], rows }));
  console.log('wrote src/kit/housesPlanData.json', rows.length);
}
