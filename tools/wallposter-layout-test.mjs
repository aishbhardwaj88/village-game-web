// Run: node tools/wallposter-layout-test.mjs   (pure node, synthesises boxes along mapData.json roads)
import fs from 'node:fs';
import { layoutWallPosters } from '../src/kit/wallPosterLayout.js';

const map = JSON.parse(fs.readFileSync(new URL('../src/layout/mapData.json', import.meta.url)));
const atlas = JSON.parse(fs.readFileSync(new URL('../src/kit/wallPosterAtlas.json', import.meta.url)));
const cells = atlas.cells;

// road index: segs + clearance(x,z) (metres to nearest road edge)
const segs = [];
for (const r of map.roads) for (let i = 0; i + 1 < r.pts.length; i++) segs.push({ a: r.pts[i], b: r.pts[i + 1], half: r.width / 2, kind: r.kind });
const roads = { segs, clearance(x, z) {
  let best = 1e9;
  for (const s of segs) {
    if (x < Math.min(s.a[0], s.b[0]) - 30 || x > Math.max(s.a[0], s.b[0]) + 30 || z < Math.min(s.a[1], s.b[1]) - 30 || z > Math.max(s.a[1], s.b[1]) + 30) continue;
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2));
    best = Math.min(best, Math.hypot(x - s.a[0] - dx * t, z - s.a[1] - dz * t) - s.half);
  }
  return best;
} };

// synthesise buildings along village roads (deterministic LCG)
let sd = 12345; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
const shopNames = ['Dudh dairy', 'Tea stall', 'Puncture shop', 'Barber shop', 'General store', 'Cycle repair', 'Halwai', 'Chemist', 'Kirana', 'Lassi corner'];
const boxes = [];
const overlaps = (x, z, w, d) => boxes.some((o) => Math.hypot(o.x - x, o.z - z) < (Math.hypot(w, d) + Math.hypot(o.w, o.d)) / 2 * 0.9);
const village = (x, z) => x > 380 && x < 800 && z > -200 && z < 200;
const rr = map.roads.filter((r) => ['road', 'lane', 'back'].includes(r.kind));
let guard = 0;
while ((boxes.length < 590) && guard++ < 200) {
  for (const r of rr) {
    for (let i = 0; i + 1 < r.pts.length && boxes.length < 590; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], len = Math.hypot(bx - ax, bz - az);
      if (len < 3) continue;
      const ux = (bx - ax) / len, uz = (bz - az) / len;
      for (let k = 0; k < 2; k++) {
        const t = rnd() * len, side = rnd() < 0.5 ? 1 : -1;
        const w = 5 + rnd() * 4, d = 5 + rnd() * 3, off = r.width / 2 + d / 2 + 1.2 + rnd() * 3;
        const x = ax + ux * t - uz * side * off, z = az + uz * t + ux * side * off;
        if (!village(x, z) || overlaps(x, z, w, d)) continue;
        const fx = uz * side, fz = -ux * side; // toward the road
        const isShop = r.kind === 'road' && rnd() < 0.3 && boxes.filter((b) => b.kind === 'shop').length < 100;
        boxes.push({ x, z, y: 0, ry: Math.atan2(fx, fz), w, d, seed: boxes.length, kind: isShop ? 'shop' : 'house',
          name: isShop ? shopNames[boxes.length % shopNames.length] : undefined, zFront: isShop ? d / 2 - 1 : undefined });
      }
    }
  }
}
const ctx = { roads, places: map.places };
const nShop = boxes.filter((b) => b.kind === 'shop').length;

const t0 = performance.now();
const a = layoutWallPosters(boxes, cells, ctx);
const ms = performance.now() - t0;
const b = layoutWallPosters(boxes, cells, ctx);
const same = JSON.stringify(a.placements) === JSON.stringify(b.placements);
if (!same) { console.error('FAIL: not deterministic'); process.exit(1); }

const st = a.stats;
console.log(`boxes ${boxes.length} (houses ${boxes.length - nShop}, shops ${nShop}); walls ${st.walls} (road-facing ${st.roadFacingWalls}); anchors ${st.anchors}`);
console.log(`scale ${st.scale}; placed ${st.placed}; clusters ${st.clusters} (avg ${st.avgPerCluster}/cluster); road-facing share ${(100 * st.roadFacingPlaced / st.placed).toFixed(1)}% posters, ${(100 * st.roadClusters / st.clusters).toFixed(1)}% clusters`);
const v = Object.values(st.perId); const ppl = st.perId;
console.log(`per id placed: min ${Math.min(...v)} avg ${(v.reduce((x, y) => x + y, 0) / v.length).toFixed(1)} max ${Math.max(...v)} over ${v.length} ids`);
const lo = Object.entries(ppl).filter(([id, n]) => n < st.targets[id]).map(([id, n]) => `${id} ${n}/${st.targets[id]}`);
console.log('below target:', lo.join(', ') || 'none');
console.log('ids with no eligible wall:', st.noEligibleWall.join(', ') || 'none');
console.log('sWantedThief placed:', ppl.sWantedThief ?? 0);
// invariants
let bad = 0; const seen = new Set();
for (const p of a.placements) {
  const k = p.id + '|' + p.cx.toFixed(1) + p.cz.toFixed(1); if (p.layer < 0 || p.layer > 3 || p.id === 'sWantedThief') bad++; seen.add(k);
}
console.log('invariant violations:', bad);
console.log(`runtime ${ms.toFixed(0)} ms; deterministic: ${same}`);
