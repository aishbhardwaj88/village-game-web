// Road rule check: lists charpai / planter sites that lie inside a road band (+margin). Usage: node tools/road-clearance-props.mjs
// Reports MAP charpais (resting spots, mapObjects) and checks house-plan frontage points. House khaat/planters are also
// filtered at build time (src/kit/houses.js, src/kit/newHouseProps.js); this lists what the plan produces.
import fs from 'node:fs';
const map = JSON.parse(fs.readFileSync(new URL('../src/layout/mapData.json', import.meta.url)));
const segs = [];
for (const r of map.roads) for (let i = 0; i < r.pts.length - 1; i++) segs.push({ a: r.pts[i], b: r.pts[i + 1], half: (r.width || 4) / 2, id: r.id, kind: r.kind });
export function clearance(x, z) {
  let best = 1e9, id = null;
  for (const s of segs) {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2));
    const d = Math.hypot(x - (s.a[0] + dx * t), z - (s.a[1] + dz * t)) - s.half;
    if (d < best) { best = d; id = s.id; }
  }
  return { d: best, id };
}
const plan = JSON.parse(fs.readFileSync(new URL('../src/kit/housesPlanData.json', import.meta.url)));
const hits = [];
let n = 0;
for (const [i, x, z, ry, w, d] of plan.rows) {
  n++;
  // otla-front khaat centre and the two door flank planters, in house-local metres (door position unknown here: use planter at +-1 m of centre)
  const pts = [['khaat', 0, d / 2 + 0.85 + 0.95], ['khaat', -w / 4, d / 2 + 0.85 + 0.95], ['planter', -1, d / 2 + 1.15], ['planter', 1, d / 2 + 1.15]];
  for (const [k, lx, lz] of pts) {
    const wx = x + lx * Math.cos(ry) + lz * Math.sin(ry), wz = z - lx * Math.sin(ry) + lz * Math.cos(ry);
    const c = clearance(wx, wz);
    if (c.d < (k === 'khaat' ? 1.2 : 1.0)) hits.push(`${k} house#${i} at (${wx.toFixed(1)}, ${wz.toFixed(1)}) clearance ${c.d.toFixed(2)} m from ${c.id}`);
  }
}
for (const o of map.objects) if (/rest/i.test(o.name || '')) { const p = o.rings?.[0]?.[0]; if (p) { const c = clearance(p[0], p[1]); if (c.d < 1.2) hits.push(`map resting spot ${o.id} clearance ${c.d.toFixed(2)} (kit pulls it off roads)`); } }
console.log(`${n} houses checked; ${hits.length} sites inside the road rule (these are dropped at build time):`);
hits.slice(0, 15).forEach((h) => console.log(' ', h)); console.log(`  ... ${hits.filter((h) => h.startsWith('khaat')).length} khaat + ${hits.filter((h) => h.startsWith('planter')).length} planter sample points`);
