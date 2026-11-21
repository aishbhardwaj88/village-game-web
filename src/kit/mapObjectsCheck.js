/**
 * Node check for the map objects layer (S7, map objects agent). Not imported by the game.
 *   node src/kit/mapObjectsCheck.js [--json]
 * Lists every object it places, and the overlaps with houses (the houses agent's final rectangles), shops / kiosks / carts
 * and other map solids, and roads (footprint into a road corridor). Nothing is moved: the map is law; overlaps are reported.
 */
import { readFileSync } from 'node:fs';
import { planMapObjects, designRing, rectRing, roadClearance, nearestRoad } from './mapObjectsPlan.js';
import { ringsOverlap } from './housesPlan.js';

const map = JSON.parse(readFileSync(new URL('../layout/mapData.json', import.meta.url)));
const housePlan = JSON.parse(readFileSync(new URL('./housesPlanData.json', import.meta.url)));
const F = housePlan.fields;
const houses = housePlan.rows.map((r) => { const o = Object.fromEntries(F.map((f, i) => [f, r[i]])); return { ...o, ring: rectRing(o.x, o.z, o.ry, o.w, o.d) }; });
const plan = planMapObjects(map);
const key = (o) => o.label.split('|')[0].trim();
const MINE = /^new_(tubewell|Mobile tower|Transformer|notice|Water trough|machan|scarecrow|Washing platform|Barber under a tree|Resting spot|milestone|pots|Buffalo|cattle|gate|Buffalo pond|Cattle pond|Clay pit pond|temple_tank|cricket|Kabaddi ground|parking|Truck parking|Washerman's drying ground|Kids play patch|Kids' play corner|House plot|potter|Tempo and auto stand|Sugarcane buying centre|Weekly market ground|channel)$/;
const solids = map.objects.filter((o) => o.kind === 'solids' && o.rings?.[0]?.length === 4 && !MINE.test(key(o)) && key(o) !== 'new_house' && key(o) !== 'new_sign');

const items = [];
for (const d of plan.designs) items.push({ what: `${d.kind} ${d.id}`, ring: designRing(d), x: d.x, z: d.z, soft: d.soft, ground: false });
for (const m of plan.milestones) items.push({ what: `milestone ${m.id}`, ring: rectRing(m.x, m.z, m.ry, 0.6, 0.4), x: m.x, z: m.z });
for (const p of plan.patches) items.push({ what: `ground ${p.kind} ${p.id}`, ring: p.ring, x: p.x, z: p.z, ground: true });
for (const p of plan.ponds) items.push({ what: `pond ${p.kind}`, ring: p.bankBuilt || p.bank || p.water, x: p.x, z: p.z, round: true });
for (const p of plan.ponds) if (p.water) items.push({ what: `pond water ${p.kind}`, ring: p.waterBuilt || p.water, x: p.x, z: p.z, round: true, roadOnly: true });
for (const t of plan.tanks) items.push({ what: 'temple tank', ring: rectRing(t.x, t.z, t.ry, t.outer, t.outer), x: t.x, z: t.z });
if (plan.gate) for (const p of plan.gate.pillars) items.push({ what: `gate pillar ${p.id}`, ring: rectRing(p.x, p.z, 0, p.w, p.w), x: p.x, z: p.z });
for (const a of plan.animals) items.push({ what: `buffalo ${a.id}`, ring: rectRing(a.x, a.z, a.ry, 0.9, 2.2), x: a.x, z: a.z });
for (const p of plan.pots) items.push({ what: `pot ${p.id}`, ring: rectRing(p.x, p.z, 0, p.r * 2, p.r * 2), x: p.x, z: p.z });

const convexOverlap = (a, b) => {
  // round rings (ponds) are convex enough; for many-point rings use a point-in test fallback
  if (a.length <= 4 && b.length <= 4) return ringsOverlap(a, b);
  const inR = (p, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) ins = !ins; } return ins; };
  return a.some((p) => inR(p, b)) || b.some((p) => inR(p, a)) || ringsOverlap(hull(a), hull(b));
};
const hull = (r) => r; // the map's round markers are already convex

const res = { houses: [], solids: [], roads: [] };
for (const it of items) {
  if (!it.roadOnly) for (const h of houses) {
    if (Math.abs(h.x - it.x) > 40 || Math.abs(h.z - it.z) > 40) continue;
    if (convexOverlap(it.ring, h.ring)) res.houses.push(`${it.what} (${it.x.toFixed(1)}, ${it.z.toFixed(1)}) x house #${h.i} (${h.x.toFixed(1)}, ${h.z.toFixed(1)})`);
  }
  if (!it.roadOnly) for (const s of solids) {
    if (Math.abs(s.cx - it.x) > 40 || Math.abs(s.cz - it.z) > 40) continue;
    if (convexOverlap(it.ring, s.rings[0])) res.solids.push(`${it.what} (${it.x.toFixed(1)}, ${it.z.toFixed(1)}) x ${s.label} (${s.cx.toFixed(1)}, ${s.cz.toFixed(1)})`);
  }
  // road: worst clearance over the ring edges and centre
  let worst = roadClearance(map.roads, it.x, it.z);
  const R = it.ring;
  for (let k = 0; k < R.length; k++) {
    const a = R[k], b = R[(k + 1) % R.length];
    for (let t = 0; t <= 1; t += 0.25) worst = Math.min(worst, roadClearance(map.roads, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t));
  }
  if (worst < -0.05) res.roads.push(`${it.what} (${it.x.toFixed(1)}, ${it.z.toFixed(1)}) ${(-worst).toFixed(2)} m into ${nearestRoad(map.roads, it.x, it.z).id}`);
}
// channels crossing roads
for (const c of plan.channels) {
  const L = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]);
  const hits = [];
  for (let s = 0; s <= L; s += 0.5) { const x = c.a[0] + (c.b[0] - c.a[0]) * s / L, z = c.a[1] + (c.b[1] - c.a[1]) * s / L; if (roadClearance(map.roads, x, z) < 0.5) hits.push(s); }
  if (hits.length) res.roads.push(`channel ${c.id}: crosses a road between ${hits[0].toFixed(1)} and ${hits[hits.length - 1].toFixed(1)} m of its ${L.toFixed(1)} m (${nearestRoad(map.roads, c.a[0] + (c.b[0] - c.a[0]) * hits[0] / L, c.a[1] + (c.b[1] - c.a[1]) * hits[0] / L).id})`);
}

console.log('counts', JSON.stringify(plan.counts));
console.log('skipped (built by others):\n  ' + plan.skipped.join('\n  '));
for (const k of ['houses', 'solids', 'roads']) console.log(`\n${k}: ${res[k].length}\n  ` + res[k].join('\n  '));
if (process.argv.includes('--json')) console.log(JSON.stringify({ counts: plan.counts, ...res }));
