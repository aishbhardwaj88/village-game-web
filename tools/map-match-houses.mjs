#!/usr/bin/env node
/**
 * Map match for houses: compares every 'new_house' rectangle of the approved map
 * (docs/layout/approved-map-2026-11-25.json, raw drawn rings) with the houses the game builds
 * (src/kit/housesPlanData.json after the same overlap-drop createNewMapHouses applies).
 * Reports count, position (>0.5 m), footprint (>0.5 m), rotation (>5 deg, mod 90) and facing
 * (vs the map's own derived front in src/layout/mapData.json), plus EXTRA and MISSING.
 * Usage: node tools/map-match-houses.mjs [--list]    (exit 1 if anything is off)
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rectCorners, ringsOverlap } from '../src/kit/housesPlan.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const raw = JSON.parse(fs.readFileSync(ROOT + 'docs/layout/approved-map-2026-11-25.json', 'utf8'));
const packed = JSON.parse(fs.readFileSync(ROOT + 'src/layout/mapData.json', 'utf8'));
const planData = JSON.parse(fs.readFileSync(ROOT + 'src/kit/housesPlanData.json', 'utf8'));

const mapH = raw.objects.filter((o) => o.label.startsWith('new_house') && o.rings && o.rings.length).map((o, k) => {
  const r = o.rings[0];
  const cx = r.reduce((s, p) => s + p[0], 0) / r.length, cz = r.reduce((s, p) => s + p[1], 0) / r.length;
  const e0 = [r[1][0] - r[0][0], r[1][1] - r[0][1]], e1 = [r[2][0] - r[1][0], r[2][1] - r[1][1]];
  return { k, cx, cz, a: Math.hypot(...e0), b: Math.hypot(...e1), ang: Math.atan2(e0[1], e0[0]), mud: /Mud/.test(o.label), label: o.label };
});
const packedH = packed.objects.filter((o) => o.label.startsWith('new_house') && o.rect);
// map front = the layout agent's front for the same house (nearest centre in the packed copy)
const frontOf = (m) => { let best = null, bd = 1e9; for (const o of packedH) { const d = Math.hypot(o.rect.cx - m.cx, o.rect.cz - m.cz); if (d < bd) { bd = d; best = o; } } return best && bd < 6 ? best.rect.front : null; };

/** The game's houses: the plan rows minus the same overlap-drop createNewMapHouses applies. */
export function gameHouses() {
  const plan = planData.rows.map(([i, x, z, ry, w, d, mud]) => ({ i, x, z, ry, w, d, mud: !!mud, corners: rectCorners(x, z, ry, w, d) }));
  const drop = new Set(), overlaps = [];
  for (let i = 0; i < plan.length; i++) for (let j = i + 1; j < plan.length; j++) {
    if (drop.has(i) || Math.abs(plan[i].x - plan[j].x) > 12 || Math.abs(plan[i].z - plan[j].z) > 12) continue;
    if (ringsOverlap(plan[i].corners, plan[j].corners, 0.1)) overlaps.push([i, j]); // reported, never dropped: the map count wins
  }
  return { plan, built: plan.filter((p) => !drop.has(p.i)), dropped: [...drop], overlaps };
}

const { plan, built, dropped, overlaps } = gameHouses();
const mod90 = (a) => { let d = ((a % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); return d > Math.PI / 4 ? d - Math.PI / 2 : d; };
const deg = (r) => (r * 180) / Math.PI;
const used = new Set();
const bad = { pos: [], size: [], rot: [], face: [], missing: [] };
for (const m of mapH) {
  let best = null, bd = 1e9;
  for (const g of built) { if (used.has(g.i)) continue; const d = Math.hypot(g.x - m.cx, g.z - m.cz); if (d < bd) { bd = d; best = g; } }
  if (!best || bd > 12) { bad.missing.push(m); continue; }
  used.add(best.i);
  if (bd > 0.5) bad.pos.push({ k: m.k, d: +bd.toFixed(2) });
  const s0 = Math.min(m.a, m.b), s1 = Math.max(m.a, m.b), g0 = Math.min(best.w, best.d), g1 = Math.max(best.w, best.d);
  const ds = Math.max(Math.abs(s0 - g0), Math.abs(s1 - g1));
  if (ds > 0.5) bad.size.push({ k: m.k, map: [s0, s1].map((v) => +v.toFixed(2)), game: [g0, g1].map((v) => +v.toFixed(2)) });
  const dr = Math.abs(deg(mod90(m.ang - (Math.PI / 2 - best.ry)))); // edge direction of the game rect vs map edge, mod 90
  const dr2 = Math.abs(deg(mod90(m.ang + best.ry)));
  const rot = Math.min(dr, dr2);
  if (rot > 5) bad.rot.push({ k: m.k, deg: +rot.toFixed(1) });
  const f = frontOf(m);
  if (f) { const dot = f[0] * Math.sin(best.ry) + f[1] * Math.cos(best.ry); if (dot < Math.cos((15 * Math.PI) / 180)) bad.face.push({ k: m.k, deg: +deg(Math.acos(Math.max(-1, dot))).toFixed(0) }); }
}
const extra = built.filter((g) => !used.has(g.i));
const list = process.argv.includes('--list');
console.log(`map houses ${mapH.length} | plan rows ${plan.length} | dropped ${dropped.length} | drawn-overlapping pairs kept ${overlaps.length} | built ${built.length}`);
console.log(`position >0.5 m: ${bad.pos.length} | footprint >0.5 m: ${bad.size.length} | rotation >5 deg: ${bad.rot.length} | facing >15 deg off map front: ${bad.face.length}`);
console.log(`MISSING (map house not built): ${bad.missing.length} | EXTRA (built, no map house): ${extra.length}`);
if (list) for (const [n, v] of Object.entries({ ...bad, extra })) if (v.length) console.log(n, JSON.stringify(v.slice(0, 40)));
const total = bad.pos.length + bad.size.length + bad.rot.length + bad.face.length + bad.missing.length + extra.length;
process.exit(total ? 1 : 0);
