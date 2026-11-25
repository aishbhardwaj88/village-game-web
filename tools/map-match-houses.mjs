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
import './missions-node-env.mjs';
globalThis.__DOPAHAR_LAYOUT = 'new';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const raw = JSON.parse(fs.readFileSync(ROOT + 'docs/layout/approved-map-2026-11-25.json', 'utf8'));
const packed = JSON.parse(fs.readFileSync(ROOT + 'src/layout/mapData.json', 'utf8'));
const planData = JSON.parse(fs.readFileSync(ROOT + 'src/kit/housesPlanData.json', 'utf8'));
// Her road rules (25 Nov, tmp/move_rules.txt): the ONLY allowed differences from the drawn map are the houses LOGGED in
// src/kit/housesMoves.json (docs/layout/MOVE_LOG_HOUSES_25NOV.md). The log is checked here too: a logged row must equal the plan
// row, start within 0.5 m of a drawn house, move <= 5 m, and trim <= 1.6 m. Nothing else is waived.
const movesFile = JSON.parse(fs.readFileSync(ROOT + 'src/kit/housesMoves.json', 'utf8'));
const logged = new Map(movesFile.rows.map((r) => [r[0], r]));

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
  const lg = logged.get(best.i);
  if (bd > 0.5 && !(lg && bd <= 5.5)) bad.pos.push({ k: m.k, d: +bd.toFixed(2) });
  const s0 = Math.min(m.a, m.b), s1 = Math.max(m.a, m.b), g0 = Math.min(best.w, best.d), g1 = Math.max(best.w, best.d);
  const ds = Math.max(Math.abs(s0 - g0), Math.abs(s1 - g1));
  if (ds > 0.5 && !(lg && ds <= 1.7)) bad.size.push({ k: m.k, map: [s0, s1].map((v) => +v.toFixed(2)), game: [g0, g1].map((v) => +v.toFixed(2)) });
  const dr = Math.abs(deg(mod90(m.ang - (Math.PI / 2 - best.ry)))); // edge direction of the game rect vs map edge, mod 90
  const dr2 = Math.abs(deg(mod90(m.ang + best.ry)));
  const rot = Math.min(dr, dr2);
  if (rot > 5 && !lg) bad.rot.push({ k: m.k, deg: +rot.toFixed(1) });
  const f = frontOf(m);
  if (f && !lg) { const dot = f[0] * Math.sin(best.ry) + f[1] * Math.cos(best.ry); if (dot < Math.cos((15 * Math.PI) / 180)) bad.face.push({ k: m.k, deg: +deg(Math.acos(Math.max(-1, dot))).toFixed(0) }); }
}
const extra = built.filter((g) => !used.has(g.i));
// ---- HER ROAD RULES (25 Nov). Bands = approved-map road polyline buffered width/2, flat caps (+ the game's drawn, rounded roads).
const ROAD_CLEAR = 0.1, FACE_TOL = 5;
const bandSets = [raw.roads.map((r) => ({ id: r.id, w: r.width, pts: r.pts }))];
try {
  const { allRoadLines } = await import('../src/mapRoads.js');
  const { filletPolyline } = await import('../src/roadNetwork.js');
  bandSets.push(allRoadLines().map((l) => ({ id: l.id, w: l.w, pts: filletPolyline(l.pts, l.closed, l.w) })));
} catch (e) { console.log('note: drawn roads not loaded (' + e.message.split('\n')[0] + '), raw bands only'); }
/** Signed clearance of point p to a flat-capped, round-jointed band: negative = inside by that much. */
function bandClear(p, r) {
  let best = Infinity; const n = r.pts.length - 1;
  for (let k = 0; k < n; k++) {
    const a = r.pts[k], b = r.pts[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1e-9;
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L, perp = Math.abs(((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / L);
    let d;
    if (t >= 0 && t <= L) d = perp - r.w / 2;
    else if ((t < 0 && k === 0) || (t > L && k === n - 1)) d = Math.max(perp - r.w / 2, (t < 0 ? -t : t - L)); // flat free end
    else { const q = t < 0 ? a : b; d = Math.hypot(p[0] - q[0], p[1] - q[1]) - r.w / 2; } // joint: round
    if (d < best) best = d;
  }
  return best;
}
const sampleRing = (c) => { const out = []; for (let k = 0; k < 4; k++) { const a = c[k], b = c[(k + 1) % 4], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 0.05); for (let q = 0; q < n; q++) out.push([a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n]); } return out; };
const inPoly = (p, c) => { let ins = false; for (let i = 0, j = 3; i < 4; j = i++) if ((c[i][1] > p[1]) !== (c[j][1] > p[1]) && p[0] < (c[j][0] - c[i][0]) * (p[1] - c[i][1]) / (c[j][1] - c[i][1]) + c[i][0]) ins = !ins; return ins; };
bad.road = []; bad.facing = []; bad.log = [];
const planBy = new Map(plan.map((g) => [g.i, g]));
for (const g of plan) {
  const pts = sampleRing(g.corners); let worst = Infinity, wid = null;
  for (const set of bandSets) for (const r of set) {
    const bb = r.w / 2 + 3; // cheap reject
    if (!r.bb) r.bb = [Math.min(...r.pts.map((q) => q[0])) - bb, Math.min(...r.pts.map((q) => q[1])) - bb, Math.max(...r.pts.map((q) => q[0])) + bb, Math.max(...r.pts.map((q) => q[1])) + bb];
    if (g.x < r.bb[0] - 12 || g.x > r.bb[2] + 12 || g.z < r.bb[1] - 12 || g.z > r.bb[3] + 12) continue;
    for (const q of pts) { const c = bandClear(q, r); if (c < worst) { worst = c; wid = r.id; } }
  }
  if (worst < ROAD_CLEAR - 1e-6) bad.road.push({ house: g.i, clear: +worst.toFixed(3), road: wid });
}
// front road = the plan row's road (the one its front faces; nearest road when the row has none); front must be square to it (<= 5 deg) and point at it
const rawBy = new Map(raw.roads.map((r) => [r.id, r]));
const distSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2)); return { d: Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz), q: [a[0] + t * dx, a[1] + t * dz] }; };
const nearestOn = (r, p) => { let b = null; for (let k = 0; k + 1 < r.pts.length; k++) { const s = distSeg(p, r.pts[k], r.pts[k + 1]); if (!b || s.d < b.d) b = { ...s, a: r.pts[k], b: r.pts[k + 1] }; } return b; };
for (const row of planData.rows) {
  const [i, x, z, ry, w, d] = row, g = planBy.get(i);
  let road = rawBy.get(row[7]);
  const fm = [x + Math.sin(ry) * d / 2, z + Math.cos(ry) * d / 2];
  if (!road) { let bd = 1e9; for (const r of raw.roads) { const c = Math.min(...g.corners.map((q) => nearestOn(r, q).d)) - r.width / 2; if (c < bd) { bd = c; road = r; } } }
  const n = nearestOn(road, fm), th = Math.atan2(n.b[1] - n.a[1], n.b[0] - n.a[0]);
  let nx = Math.sin(th), nz = -Math.cos(th);
  if ((n.q[0] - fm[0]) * nx + (n.q[1] - fm[1]) * nz < 0) { nx = -nx; nz = -nz; }
  const off = Math.abs(deg(Math.atan2(Math.sin(Math.atan2(nx, nz) - ry), Math.cos(Math.atan2(nx, nz) - ry))));
  if (off > FACE_TOL) bad.facing.push({ house: i, road: road.id, offDeg: +off.toFixed(1) });
}
// the log must be honest: logged row == plan row, old spot is a drawn house (<= 0.5 m), move <= 5 m
for (const r of movesFile.rows) {
  const g = planBy.get(r[0]); const [i, ox, oz, , ow, od, nx, nz, nry, nw, nd, m] = r;
  const nearMap = mapH.some((q) => Math.hypot(q.cx - ox, q.cz - oz) <= 0.5);
  const same = g && Math.abs(g.x - nx) < 1e-6 && Math.abs(g.z - nz) < 1e-6 && Math.abs(g.ry - nry) < 1e-6 && Math.abs(g.w - nw) < 1e-6 && Math.abs(g.d - nd) < 1e-6;
  if (!g || !same || !nearMap || m > 5 || Math.hypot(nx - ox, nz - oz) > 5.0001) bad.log.push({ house: i, same, nearMap, m });
}
console.log(`road rule: ${bad.road.length} houses within ${ROAD_CLEAR} m of / on a road band | facing >${FACE_TOL} deg off the road it fronts: ${bad.facing.length} | logged moves ${movesFile.rows.length}, bad log rows ${bad.log.length}`);

const list = process.argv.includes('--list');
console.log(`map houses ${mapH.length} | plan rows ${plan.length} | dropped ${dropped.length} | drawn-overlapping pairs kept ${overlaps.length} | built ${built.length}`);
console.log(`position >0.5 m: ${bad.pos.length} | footprint >0.5 m: ${bad.size.length} | rotation >5 deg: ${bad.rot.length} | facing >15 deg off map front: ${bad.face.length}`);
console.log(`MISSING (map house not built): ${bad.missing.length} | EXTRA (built, no map house): ${extra.length}`);
if (list) for (const [n, v] of Object.entries({ ...bad, extra })) if (v.length) console.log(n, JSON.stringify(v.slice(0, 40)));
const total = bad.pos.length + bad.size.length + bad.rot.length + bad.face.length + bad.missing.length + extra.length + bad.road.length + bad.facing.length + bad.log.length;
process.exit(total ? 1 : 0);
