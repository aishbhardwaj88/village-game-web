// Roaming-traffic path check (26 Nov): samples every drivable polyline src/roamingTraffic.js uses (buildRoamPaths) in both travel
// directions and checks (1) the centreline point lies on a real road of src/layout/mapData.json, (2) the left-lane point (offset 1.2 m,
// India drives on the left) sits on the carriageway: inside the road's band with at least 0.3 m to spare, and on the LEFT of travel,
// (3) every road end either joins another used road or is a turn-round (counted). Prints counts and "FAIL count: N".
// Usage: node tools/roaming-check.mjs
import fs from 'node:fs';
import { buildRoamPaths, laneAt, pointAt, LANE_OFFSET, MIN_ROAD_WIDTH } from '../src/roamingTraffic.js';
const mapData = JSON.parse(fs.readFileSync(new URL('../src/layout/mapData.json', import.meta.url)));
const paths = buildRoamPaths();
const bands = [];
for (const r of mapData.roads) for (let i = 0; i + 1 < r.pts.length; i++) bands.push({ a: r.pts[i], b: r.pts[i + 1], half: (r.width || 4) / 2, id: r.id });
function dist(x, z, s) { const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2)); return Math.hypot(x - (s.a[0] + dx * t), z - (s.a[1] + dz * t)); }
const roadClear = (x, z, ownId) => { let best = 1e9; for (const s of bands) if (s.id === ownId) best = Math.min(best, dist(x, z, s) - s.half); return best; }; // metres inside its own band (negative = inside)
const anyClear = (x, z) => { let best = 1e9; for (const s of bands) best = Math.min(best, dist(x, z, s) - s.half); return best; };
let n = 0, fail = 0, ends = 0, joins = 0, turns = 0, len = 0;
const bad = (m) => { fail++; if (fail <= 25) console.log('FAIL', m); };
for (const p of paths) {
  len += p.len;
  if (p.w < MIN_ROAD_WIDTH) bad(`${p.id} width ${p.w}`);
  for (const dir of [1, -1]) {
    for (let s = 0; s <= p.len; s += 1.5) {
      n++;
      const q = laneAt(p, s, dir), c = pointAt(p, s);
      if (anyClear(c.x, c.z) > 0.01) bad(`${p.id} s=${s.toFixed(1)} centreline point not on a road (${anyClear(c.x, c.z).toFixed(2)})`);
      const inside = roadClear(q.x, q.z, p.id);
      if (inside > -0.3) bad(`${p.id} s=${s.toFixed(1)} dir=${dir} lane point ${inside.toFixed(2)} m from band edge (needs <= -0.3)`);
      const fx = Math.sin(q.yaw), fz = Math.cos(q.yaw), side = (q.x - q.cx) * fz - (q.z - q.cz) * fx; // left of forward is (fz, -fx): dot with it > 0
      if (Math.abs(Math.hypot(q.x - q.cx, q.z - q.cz) - LANE_OFFSET) > 1e-6 || side <= 0) bad(`${p.id} s=${s.toFixed(1)} dir=${dir} not LANE_OFFSET to the left`);
    }
  }
  for (const e of [p.pts[0], p.pts[p.pts.length - 1]]) {
    ends++;
    const j = paths.some((o) => o !== p && [o.pts[0], o.pts[o.pts.length - 1]].some((f) => Math.hypot(f[0] - e[0], f[1] - e[1]) < 4));
    if (j) joins++; else turns++;
  }
}
console.log(`roads used: ${paths.length}  total ${len.toFixed(0)} m  lane samples: ${n}  road ends: ${ends} (${joins} join another road, ${turns} turn round)`);
console.log(`FAIL count: ${fail}`);
process.exit(fail ? 1 : 0);
