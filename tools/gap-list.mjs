#!/usr/bin/env node
/**
 * PARALLEL.md section B: every patch of ground INSIDE THE RING ROAD that is more than 35 m from anything built.
 * Writes docs/gaps-<date>.md. Read-only on src/ and the map.
 *
 * "Built" = every place footprint on the 1 Nov map (NEW / not-built entries skipped), every map house footprint,
 * the village square, compound walls, the abadi rows (src/scenery.js PLACEMENTS, ~20 x 8 m each) and the kit houses
 * (src/villageHouses.js VILLAGE_HOUSES, ~8 x 8 m each). Roads, lanes, fields and water do NOT count as built.
 *
 * Method: 1 m grid inside the ring-road polygon (its centreline, MAP_SHIFT applied); distance from each cell to the
 * nearest built outline; cells > 35 m are grouped into connected patches. Each patch is reported by its emptiest
 * cell (centre) and that cell's clearance (radius: a disc of that radius about the centre holds nothing built).
 *
 * Usage: node tools/gap-list.mjs [thresholdMetres=35]
 */
import fs from 'fs';
import { MAP_SHIFT } from '../src/mapPlan.js';
import { ANCHORS } from '../src/anchors.js';

const TH = parseFloat(process.argv[2] || '35');
const MAP = JSON.parse(fs.readFileSync('docs/layout/village-plan-positions-2026-11-01.json', 'utf8'));
const sh = ([x, z]) => [x + MAP_SHIFT.x, z + MAP_SHIFT.z];

// ---------- built outlines (each a closed polygon or a polyline) ----------
const built = []; // { name, pts, closed }
const rectAt = (x, z, ry, x0, x1, z0, z1) => {
  const s = Math.sin(ry), c = Math.cos(ry);
  return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([lx, lz]) => [x + lx * c + lz * s, z - lx * s + lz * c]);
};
for (const p of MAP.places) {
  if (/NEW/i.test(String(p.in_code_today))) continue;
  const name = p.map_name || p.in_code_today;
  for (const s of p.shapes || []) if (s.corners) built.push({ name, pts: s.corners.map(sh), closed: true });
  for (const h of p.house_footprints || []) built.push({ name: `${name} (house)`, pts: h.corners.map(sh), closed: true });
}
if (MAP.village_square) built.push({ name: 'Village square', pts: MAP.village_square.corners.map(sh), closed: true });
for (const w of MAP.compound_walls || []) for (const l of w.lines) built.push({ name: `wall: ${w.belongs_to}`, pts: l.map(sh), closed: false });

const scen = fs.readFileSync('src/scenery.js', 'utf8');
const plBlock = scen.slice(scen.indexOf('const PLACEMENTS = ['), scen.indexOf('];', scen.indexOf('const PLACEMENTS = [')));
for (const m of plBlock.matchAll(/x:\s*([-\d.]+),\s*z:\s*([-\d.]+),\s*ry:\s*([-\d.]+)/g))
  built.push({ name: 'abadi row', pts: rectAt(+m[1], +m[2], +m[3], -10, 10, -3.5, 4.5), closed: true });
const vh = fs.readFileSync('src/villageHouses.js', 'utf8');
const vhBlock = vh.slice(vh.indexOf('export const VILLAGE_HOUSES = ['), vh.indexOf('];', vh.indexOf('export const VILLAGE_HOUSES = [')));
for (const m of vhBlock.matchAll(/x:\s*([-\d.]+),\s*z:\s*([-\d.]+),\s*ry:\s*([-\d.]+)/g))
  built.push({ name: 'kit house', pts: rectAt(+m[1], +m[2], +m[3], -4, 4, -4, 4), closed: true });
// places that are on ANCHORS but not drawn as a map shape: a 6 m disc-ish square at the anchor
for (const [id, a] of Object.entries(ANCHORS)) {
  if (['eastgali', 'westgali', 'highway', 'canal', 'field'].includes(id)) continue;
  built.push({ name: id, pts: rectAt(a.x, a.z, a.ry || 0, -3, 3, -3, 3), closed: true });
}

// ---------- geometry ----------
const segDist = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};
const inside = (px, pz, pts) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const distTo = (px, pz, b) => {
  if (b.closed && inside(px, pz, b.pts)) return 0;
  let d = Infinity;
  const n = b.pts.length, m = b.closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const [ax, az] = b.pts[i], [bx, bz] = b.pts[(i + 1) % n];
    d = Math.min(d, segDist(px, pz, ax, az, bx, bz));
  }
  return d;
};

// ---------- grid ----------
const ring = MAP.roads.ring_road.centreline.map(sh);
const xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]);
const X0 = Math.floor(Math.min(...xs)), X1 = Math.ceil(Math.max(...xs)), Z0 = Math.floor(Math.min(...zs)), Z1 = Math.ceil(Math.max(...zs));
const W = X1 - X0 + 1, H = Z1 - Z0 + 1;
const D = new Float32Array(W * H).fill(-1);
let cellsIn = 0;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x = X0 + i + 0.5, z = Z0 + j + 0.5;
  if (!inside(x, z, ring)) continue;
  cellsIn++;
  let d = Infinity, who = '';
  for (const b of built) { const e = distTo(x, z, b); if (e < d) { d = e; who = b.name; } }
  D[j * W + i] = d;
}

// connected patches of cells > TH
const seen = new Uint8Array(W * H), gaps = [];
for (let k = 0; k < W * H; k++) {
  if (seen[k] || D[k] <= TH) continue;
  const stack = [k]; seen[k] = 1;
  let n = 0, best = k, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  while (stack.length) {
    const c = stack.pop(); n++;
    if (D[c] > D[best]) best = c;
    const ci = c % W, cj = (c / W) | 0;
    minX = Math.min(minX, ci); maxX = Math.max(maxX, ci); minZ = Math.min(minZ, cj); maxZ = Math.max(maxZ, cj);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const q = nj * W + ni;
      if (!seen[q] && D[q] > TH) { seen[q] = 1; stack.push(q); }
    }
  }
  const bx = X0 + (best % W) + 0.5, bz = Z0 + ((best / W) | 0) + 0.5;
  // nearest built thing to the centre, for orientation
  let nd = Infinity, nn = '';
  for (const b of built) { const e = distTo(bx, bz, b); if (e < nd) { nd = e; nn = b.name; } }
  gaps.push({ x: bx, z: bz, r: D[best], area: n, ext: [maxX - minX + 1, maxZ - minZ + 1], nearest: nn });
}
gaps.sort((a, b) => b.r - a.r);

// the emptiest point overall, even if below threshold
let mx = 0, mk = -1;
for (let k = 0; k < W * H; k++) if (D[k] > mx) { mx = D[k]; mk = k; }
const date = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
const out = [];
out.push(`# Gaps inside the ring road, ${date}`, '');
out.push(`Generated by \`node tools/gap-list.mjs ${TH}\`. Measured, not judged.`, '');
out.push(`- Ring road polygon (centreline, world coords): x ${X0}..${X1}, z ${Z0}..${Z1}; ${cellsIn} m² inside.`);
out.push(`- Built outlines counted: ${built.length} (map place shapes, map house footprints, village square, compound walls, abadi rows, kit houses, anchors). Roads, lanes, fields, water are NOT built.`);
out.push(`- Threshold: more than ${TH} m from anything built.`);
if (mk >= 0) out.push(`- Emptiest point inside the ring: (${(X0 + (mk % W) + 0.5).toFixed(1)}, ${(Z0 + ((mk / W) | 0) + 0.5).toFixed(1)}), ${mx.toFixed(1)} m from anything built.`);
out.push('');
if (!gaps.length) out.push(`**No patch inside the ring road is more than ${TH} m from anything built.**`);
else {
  out.push('| # | centre x | centre z | radius m (clear disc) | patch area m² (cells > threshold) | patch extent x by z m | nearest built thing |');
  out.push('|---|---|---|---|---|---|---|');
  gaps.forEach((g, i) => out.push(`| ${i + 1} | ${g.x.toFixed(1)} | ${g.z.toFixed(1)} | ${g.r.toFixed(1)} | ${g.area} | ${g.ext[0]} x ${g.ext[1]} | ${g.nearest} |`));
}
// a secondary, lower-threshold view so the list is still useful when the 35 m list is short
const T2 = 20;
const sub = [];
{
  const s2 = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k++) {
    if (s2[k] || D[k] <= T2) continue;
    const st = [k]; s2[k] = 1; let best = k, n = 0;
    while (st.length) {
      const c = st.pop(); n++; if (D[c] > D[best]) best = c;
      const ci = c % W, cj = (c / W) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const q = nj * W + ni; if (!s2[q] && D[q] > T2) { s2[q] = 1; st.push(q); }
      }
    }
    sub.push({ x: X0 + (best % W) + 0.5, z: Z0 + ((best / W) | 0) + 0.5, r: D[best], area: n });
  }
  sub.sort((a, b) => b.r - a.r);
}
out.push('', `## For reference: patches more than ${T2} m from anything built`, '');
if (!sub.length) out.push('None.');
else {
  out.push('| # | centre x | centre z | radius m | area m² |', '|---|---|---|---|---|');
  sub.forEach((g, i) => out.push(`| ${i + 1} | ${g.x.toFixed(1)} | ${g.z.toFixed(1)} | ${g.r.toFixed(1)} | ${g.area} |`));
}
const file = `docs/gaps-${date}.md`;
fs.writeFileSync(file, out.join('\n') + '\n');
console.log(`${file}: ${gaps.length} gaps > ${TH} m, ${sub.length} > ${T2} m; emptiest point ${mx.toFixed(1)} m`);
