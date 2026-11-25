#!/usr/bin/env node
// Compares every named place (map existing:true or minor:false) in the approved map with where the game puts it.
// Spec: docs/layout/approved-map-2026-11-25.json ONLY. Flags > 0.5 m or > 5 deg. Usage: node tools/map-match-places.mjs
import { readFileSync } from 'node:fs';
globalThis.__DOPAHAR_LAYOUT = 'new';
const raw = JSON.parse(readFileSync(new URL('../docs/layout/approved-map-2026-11-25.json', import.meta.url), 'utf8'));
const pack = JSON.parse(readFileSync(new URL('../src/layout/mapData.json', import.meta.url), 'utf8'));
const { ANCHORS } = await import('../src/anchors.js');
const { ANCHOR_SOURCE } = await import('../src/layout/layout.js');
const { PLACE_MOVES } = await import('../src/layout/placeMoves.js');
const { EXISTING_FOOTPRINTS } = await import('../src/layout/footprints.js');
const { frontOffsetDeg } = await import('../src/layout/frontOffsets.js');
const packed = Object.fromEntries(pack.places.map((p) => [p.id, p]));
const anchorFor = {};
for (const id of Object.keys(ANCHORS)) anchorFor[ANCHOR_SOURCE[id] || id] = ANCHORS[id];
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// 25 Nov (her rule): the ONLY allowed differences from the map are the logged moves (src/layout/placeMoves.js, docs/layout/MOVE_LOG_PLACES_25NOV.md):
// a place may sit exactly its logged slide from the map, or carry its logged turn; everything else must still match the map to 0.5 m / 5 deg.
const MOVE = {};
for (const m of PLACE_MOVES) for (const id of [...m.ids, ...(m.srcs || [m.src])]) MOVE[id] = m;
// road bands: polyline buffered width/2, flat caps = one rectangle per segment (the round-join wedge on a bend is under 0.1 m2 and is left out)
const bandPieces = [];
for (const r of raw.roads) {
  const h = r.width / 2;
  for (let i = 0; i + 1 < r.pts.length; i++) {
    const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (!L) continue;
    const nx = -(bz - az) / L * h, nz = (bx - ax) / L * h;
    bandPieces.push({ id: r.id, poly: [[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz]], a: [ax, az], b: [bx, bz], h });
  }
}
const area = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return a / 2; };
function clip(subject, clipper) { // Sutherland-Hodgman, clipper convex
  const ccw = area(clipper) > 0; let out = subject;
  for (let i = 0; i < clipper.length && out.length; i++) {
    const A = clipper[i], B = clipper[(i + 1) % clipper.length], inside = (p) => (ccw ? 1 : -1) * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) >= 0;
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const P = inp[j], Q = inp[(j + 1) % inp.length], pi = inside(P), qi = inside(Q);
      const cut = () => { const d1 = [Q[0] - P[0], Q[1] - P[1]], d2 = [B[0] - A[0], B[1] - A[1]], den = d1[0] * d2[1] - d1[1] * d2[0], t = ((A[0] - P[0]) * d2[1] - (A[1] - P[1]) * d2[0]) / den; return [P[0] + t * d1[0], P[1] + t * d1[1]]; };
      if (pi) { out.push(P); if (!qi) out.push(cut()); } else if (qi) out.push(cut());
    }
  }
  return out;
}
const segSeg = (p, q, r, s) => { // distance between segments pq and rs
  const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  if (ccw(p, r, s) !== ccw(q, r, s) && ccw(p, q, r) !== ccw(p, q, s)) return 0;
  const pd = (a, b, c) => { const dx = c[0] - b[0], dz = c[1] - b[1], L2 = dx * dx + dz * dz, t = L2 ? Math.max(0, Math.min(1, ((a[0] - b[0]) * dx + (a[1] - b[1]) * dz) / L2)) : 0; return Math.hypot(a[0] - b[0] - t * dx, a[1] - b[1] - t * dz); };
  return Math.min(pd(p, r, s), pd(q, r, s), pd(r, p, q), pd(s, p, q));
};
function roadStats(corners) {
  let ov = 0, gap = 1e9, hit = new Set(), near = null;
  const cc = [corners.reduce((s, c) => s + c[0], 0) / 4, corners.reduce((s, c) => s + c[1], 0) / 4];
  for (const b of bandPieces) {
    const o = clip(corners, b.poly); const a = o.length > 2 ? Math.abs(area(o)) : 0;
    if (a > 0.005) { ov += a; hit.add(b.id); }
    let d = a > 0.005 ? 0 : 1e9;
    if (d) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) d = Math.min(d, segSeg(corners[i], corners[(i + 1) % 4], b.poly[j], b.poly[(j + 1) % 4]));
    if (d < gap) gap = d;
    const dc = segSeg(cc, cc, b.a, b.b); if (!near || dc < near.d) near = { d: dc, id: b.id, b };
  }
  return { ov, gap, hit: [...hit], near };
}
// the footprint box (footprints.js, whole site) at the built anchor: a place with 0 overlap and a front that looks at its nearest road
function footprintCorners(a, box) { const c = Math.cos(a.ry), s = Math.sin(a.ry); return [[box[0], box[2]], [box[1], box[2]], [box[1], box[3]], [box[0], box[3]]].map(([lx, lz]) => [a.x + lx * c + lz * s, a.z - lx * s + lz * c]); }
// front ray: from the footprint's front-edge midpoint along the true front yaw (anchor ry minus the asset's front offset), first road band hit within 40 m
function frontRoad(a, box, id) {
  const fy = a.ry - frontOffsetDeg(id) * Math.PI / 180, f = [Math.sin(fy), Math.cos(fy)], la = -frontOffsetDeg(id) * Math.PI / 180, lf = [Math.sin(la), Math.cos(la)];
  const ex = lf[0] > 0.5 ? box[1] : lf[0] < -0.5 ? box[0] : 0, ez = lf[1] > 0.5 ? box[3] : lf[1] < -0.5 ? box[2] : 0, c = Math.cos(a.ry), s = Math.sin(a.ry);
  const m = [a.x + ex * c + ez * s, a.z - ex * s + ez * c];
  for (let t = 0; t <= 40; t += 0.25) { const q = [m[0] + f[0] * t, m[1] + f[1] * t]; for (const b of bandPieces) if (b.h && segSeg(q, q, b.a, b.b) <= b.h) return { t, id: b.id, f, b }; }
  return null;
}
// Listed in docs/layout/MOVE_LOG_PLACES_25NOV.md as NOT movable under 5 m (her rule: do not move, list with the number); they still overlap and say so
const KNOWN_LEFT = new Set([]); // 25 Nov (final 4): mela and pond trimmed, field split by its track, so nothing is listed-left any more
let overlapBad = 0;
let checked = 0, bad = 0, worstM = 0;
for (const p of raw.places) {
  if (!(p.existing || p.minor === false)) continue;
  const g = packed[p.id], a = anchorFor[p.id];
  if (!g || !a) continue; // only places the game positions through ANCHORS
  checked++;
  const mapYaw = Math.atan2(p.front[0], p.front[1]);
  const mv = MOVE[p.id] || MOVE[a && Object.keys(ANCHORS).find((k) => ANCHORS[k] === a)];
  const dPack = Math.hypot(g.x - p.x, g.z - p.z), dFront = Math.abs(wrap(g.frontYaw - mapYaw)) * 180 / Math.PI;
  const slide = mv ? Math.hypot(mv.dx, mv.dz) : 0, turnTo = mv && mv.ry !== undefined ? mv.ry : null;
  const dAnc = a ? Math.abs(Math.hypot(a.x - p.x, a.z - p.z) - slide) : null; // distance from where the map (plus its logged slide) puts it
  if (mv && a && Math.abs(Math.hypot(a.x - p.x, a.z - p.z) - slide) <= 0.05 && slide > 5) { console.log('FLAG ' + p.id + ' slides more than 5 m'); bad++; }
  const dRy = a ? Math.abs(wrap(a.ry - (turnTo !== null ? turnTo : g.ry))) * 180 / Math.PI : null;
  worstM = Math.max(worstM, dPack - 0, dAnc || 0);
  let flag = (!mv && dPack > 0.5) || (!g.untouched && !mv && dFront > 5) || (dAnc !== null && dAnc > 0.5) || (dRy !== null && dRy > 5);
  // her rule (25 Nov): 0 overlap with every road band, and the front looks at the road it fronts
  const fp = EXISTING_FOOTPRINTS[p.id];
  let roadNote = '';
  if (a && fp) {
    let rs = null; // a place with several footprint boxes (the split wheat field) is judged on all of them: worst overlap, smallest gap
    for (const bx of fp.boxes || [fp.box]) { const r1 = roadStats(footprintCorners(a, bx)); rs = !rs ? r1 : { ...rs, ov: rs.ov + r1.ov, gap: Math.min(rs.gap, r1.gap), hit: [...new Set([...rs.hit, ...r1.hit])] }; }
    if (rs.ov > 0.005 && !KNOWN_LEFT.has(p.id)) { flag = true; overlapBad++; roadNote += ` ROAD-OVERLAP ${rs.ov.toFixed(2)}m2 on ${rs.hit.join(',')}`; }
    else if (rs.ov > 0.005) roadNote += ` listed-left overlap ${rs.ov.toFixed(2)}m2 on ${rs.hit.join(',')}`;
    else if (rs.gap < 0.09) { flag = true; overlapBad++; roadNote += ` TOUCHES-ROAD gap ${rs.gap.toFixed(2)}m`; }
    const fr = frontRoad(a, fp.box, p.id);
    if (fr) { // squareness: angle between the front and the road's normal at the hit
      const tx = fr.b.b[0] - fr.b.a[0], tz = fr.b.b[1] - fr.b.a[1], L = Math.hypot(tx, tz) || 1, sq = Math.asin(Math.min(1, Math.abs(fr.f[0] * tx + fr.f[1] * tz) / L)) * 180 / Math.PI;
      roadNote += ` front->${fr.id} ${fr.t.toFixed(1)}m sq ${sq.toFixed(0)}deg`;
    } else roadNote += ' front->no road within 40m';
    if (!fp.open && rs.near && rs.near.d < 12 && !fr && !KNOWN_LEFT.has(p.id)) { /* informational: a built place with a road within 12 m whose front sees none */ roadNote += ' (front sees no road, road near)'; }
  }
  if (flag) bad++;
  if (flag || process.argv.includes('--all'))
    console.log(`${flag ? 'FLAG' : 'ok  '} ${p.id.padEnd(18)} map ${p.x},${p.z} front ${p.front} | game ${g.x},${g.z} pos ${dPack.toFixed(2)}m front ${dFront.toFixed(1)}deg` + (a ? ` | anchor ${a.x.toFixed(1)},${a.z.toFixed(1)} off-allowed ${dAnc.toFixed(2)}m ry-vs-allowed ${dRy.toFixed(1)}deg${mv ? ' MOVED' : ''}${roadNote}` : ' | no anchor'));
}
console.log(`${checked} places checked, ${bad} flagged (${overlapBad} on a road), worst ${worstM.toFixed(2)} m off its allowed spot`);
process.exitCode = bad ? 1 : 0;
