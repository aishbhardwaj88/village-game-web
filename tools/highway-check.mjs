#!/usr/bin/env node
// HIGHWAY CHECK (25 Nov): headless geometry check of the main highway. No GPU, no browser.
// Spec used: 11 m total (approved map), 7 m two-lane carriageway + 2 x 2 m paved shoulders, broken white centre line,
// solid white edge lines 0.2 m inside the carriageway edge. Checks: width, every marking ribbon inside the carriageway,
// no marking under a building footprint or across a junction, camber height, mesh draw calls + triangles per chunk.
// Usage: node tools/highway-check.mjs   (exit 1 on any FAIL)
import './missions-node-env.mjs';
globalThis.__DOPAHAR_LAYOUT = 'new';
const { allRoadLines, mapRoadNetwork, ROAD_CHUNKS } = await import('../src/mapRoads.js');
const rn = await import('../src/roadNetwork.js');
const { CARRIAGE_HW, MARK, highwayMarkPlan, highwayMarksMesh, networkMesh, sampleSurface, underFootprint } = rn;
let fail = 0;
const ok = (c, msg) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${msg}`); if (!c) fail++; };
const hw = allRoadLines().filter((l) => l.kind === 'highway');
ok(hw.length >= 1, `highway lines found: ${hw.length}`);
ok(hw.every((l) => Math.abs(l.w - 11) < 1e-6), `highway width ${hw.map((l) => l.w).join(',')} m (expect 11 = 7 carriageway + 2 x 2 shoulder)`);
ok(CARRIAGE_HW * 2 + 4 === 11, 'spec arithmetic 7 + 2 x 2 = 11');
const net = mapRoadNetwork();
const hl = net.lines.filter((l) => l.kind === 'highway');
let ribbons = 0, pts = 0, outside = 0, onFoot = 0, wrongLat = 0, dashes = 0, edges = 0;
const huge = { x0: -1e5, x1: 1e5, z0: -1e5, z1: 1e5 };
const dSeg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)); return Math.hypot(a[0] + t * dx - x, a[1] + t * dz - z); };
for (const l of hl) for (const rb of highwayMarkPlan(net, l, huge)) {
  ribbons++; if (rb.w === MARK.dashW && rb.pts.length < 6 && rb.pts.length) dashes++; else edges++;
  for (const [x, z] of rb.pts) {
    pts++;
    let d = Infinity; for (let i = 1; i < l.pts.length; i++) d = Math.min(d, dSeg(x, z, l.pts[i - 1], l.pts[i]));
    if (d > CARRIAGE_HW + 1e-3) outside++;
    if (underFootprint(x, z)) onFoot++;
    const sf = sampleSurface(net, x, z);
    if (!sf || sf.hw < 0.5) wrongLat++;
  }
}
ok(ribbons > 0, `marking ribbons: ${ribbons} (${edges} continuous strands, ~${dashes} dashes)`);
ok(outside === 0, `marking points outside the 7 m carriageway: ${outside} / ${pts}`);
ok(onFoot === 0, `marking points under a building footprint: ${onFoot}`);
ok(wrongLat === 0, `marking points not on highway surface (junction or gap): ${wrongLat}`);
// camber and colour across the section at the first highway vertex region
const mid = hl[0].pts[Math.floor(hl[0].pts.length / 2)];
const p0 = hl[0].pts[Math.floor(hl[0].pts.length / 2) - 1] || hl[0].pts[0];
const ux = mid[0] - p0[0], uz = mid[1] - p0[1], L = Math.hypot(ux, uz) || 1, nx = -uz / L, nz = ux / L;
const prof = [0, 2, 3.4, 4.5, 5.4, 6.2].map((o) => sampleSurface(net, mid[0] + nx * o, mid[1] + nz * o));
console.log('section lat->y,alpha,grey:', [0, 2, 3.4, 4.5, 5.4, 6.2].map((o, i) => prof[i] ? `${o}m y=${prof[i].y.toFixed(3)} a=${prof[i].a.toFixed(2)} g=${prof[i].g.toFixed(2)}` : `${o}m none`).join(' | '));
ok(prof[0] && prof[2] && prof[0].y > prof[2].y, 'crown: centre higher than carriageway edge');
ok(prof[0] && prof[0].g < 0.4 && prof[3] && prof[3].g > prof[0].g, 'carriageway darker than the paved shoulder');
let draws = 0, tris = 0;
for (const c of ROAD_CHUNKS) {
  const m = networkMesh(net, c.rect, c.id), mk = highwayMarksMesh(net, c.rect, c.id + '_marks');
  const meshes = []; if (m) m.isGroup ? m.children.forEach((k) => meshes.push(k)) : meshes.push(m); if (mk) meshes.push(mk);
  for (const k of meshes) { draws++; tris += (k.geometry.index.count / 3) | 0; }
  console.log(`${c.id}: ${meshes.map((k) => `${k.name}=${k.geometry.index.count / 3}tri`).join(' ')}`);
}
console.log(`total road ground draws ${draws}, triangles ${tris}`);
console.log(fail ? `${fail} FAIL` : '0 FAIL');
process.exit(fail ? 1 : 0);
