// Check for src/placedPropsFarm.js (her rule, 25 Nov: ROADS MUST BE EMPTY, every standing prop >= 0.6 m beyond the drawn road band + dusty edge).
// Same road model and building footprints as tools/vehicle-spots.mjs (imported, not re-typed), plus: yard props inside their yard ground polygon,
// nothing standing in a crop strip, no two props overlapping, no two same-file neighbours with the same facing.
// Usage: node tools/placed-props-farm-check.mjs            -> one line per prop plus FAIL lines and "FAIL count: N"
//        node tools/placed-props-farm-check.mjs --suggest  -> searches legal spots around the PLAN anchors, prints FARM_PROPS rows
import fs from 'node:fs';
import { roadInfo, nearestBuilding, approved, mapData } from './vehicle-spots.mjs';
const MARGIN = 0.6, BUILD_MIN = 0.4;
const src = fs.readFileSync(new URL('../src/placedPropsFarm.js', import.meta.url), 'utf8');
const lit = (name) => (0, eval)('(' + src.match(new RegExp(name + ' = (\\{[\\s\\S]*?\\n\\}|\\[[\\s\\S]*?\\n\\]);'))[1].replace(/\/\/.*$/gm, '') + ')');
const SIZE = lit('SIZE'); // file -> [folder, longest metres, footprint radius]
const inP = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
const cropRings = approved.objects.filter((o) => o.kind === 'crops').flatMap((o) => o.rings);
const gher = approved.objects.find((o) => o.label === 'new_Gher yard | Gher yard').rings[0];
const YARDS = { gher }; // tag -> ground polygon the prop must stand inside
const pts = (x, z, r) => { const o = [[x, z]]; for (let a = 0; a < 8; a++) o.push([x + Math.cos(a * Math.PI / 4) * r, z + Math.sin(a * Math.PI / 4) * r]); return o; };
const dEdge = (x, z, p) => { let b = 1e9; for (let i = 0; i < p.length; i++) { const a = p[i], c = p[(i + 1) % p.length], dx = c[0] - a[0], dz = c[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); b = Math.min(b, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return b; };
const angD = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };
export function test(p) {
  const [, , r] = SIZE[p.file]; let road = 1e9, rid = '', bd = 1e9, bn = '-';
  for (const [x, z] of pts(p.x, p.z, r)) { const ri = roadInfo(x, z); if (ri.clear < road) { road = ri.clear; rid = ri.seg.id; } const b = nearestBuilding(x, z, 6); if (b.d < bd) { bd = b.d; bn = b.n; } }
  const crop = pts(p.x, p.z, r).some(([x, z]) => cropRings.some((c) => inP(x, z, c)));
  const yard = p.y && YARDS[p.y] ? inP(p.x, p.z, YARDS[p.y]) && dEdge(p.x, p.z, YARDS[p.y]) >= r * 0.5 : true;
  return { road, rid, bd, bn, crop, yard };
}
const bad = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < SIZE[a.file][2] + SIZE[b.file][2] + 0.15;
const sameFace = (a, b) => a.file === b.file && Math.hypot(a.x - b.x, a.z - b.z) < 6 && angD(a.yaw, b.yaw) < 0.3;
const ok = (t) => t.road >= MARGIN && t.bd >= BUILD_MIN && !t.crop && t.yard;
if (process.argv[1] && process.argv[1].endsWith('placed-props-farm-check.mjs')) { if (process.argv.includes('--suggest')) suggest(); else check(); }

function check() {
  const list = lit('FARM_PROPS'); let fails = 0; const counts = {};
  list.forEach((v, i) => {
    counts[v.file] = (counts[v.file] || 0) + 1; const t = test(v), m = [];
    if (!SIZE[v.file]) m.push('unknown file');
    if (t.road < MARGIN) m.push(`road ${t.rid} margin ${t.road.toFixed(2)} < ${MARGIN}`);
    if (t.bd < BUILD_MIN) m.push(`building ${t.bn} distance ${t.bd.toFixed(2)} < ${BUILD_MIN}`);
    if (t.crop) m.push('stands in a crop strip');
    if (!t.yard) m.push(`outside yard ${v.y}`);
    list.forEach((w, j) => { if (j > i && bad(v, w)) m.push(`overlaps #${j} ${w.file}`); if (j !== i && j > i && sameFace(v, w)) m.push(`same facing as #${j} ${w.file}`); });
    if (!(v.k >= 0.92 && v.k <= 1.08)) m.push(`jitter ${v.k} outside 0.92-1.08`);
    if (m.length) { fails++; console.log(`FAIL #${i} ${v.file} (${v.x}, ${v.z}): ${m.join('; ')}`); }
    else console.log(`ok   #${i} ${v.file} (${v.x}, ${v.z}) road ${t.road.toFixed(2)} m (${t.rid}), building ${t.bn} ${t.bd.toFixed(2)} m`);
  });
  console.log(`${list.length} props: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  console.log(`FAIL count: ${fails}`); process.exitCode = fails ? 1 : 0;
}

function suggest() {
  const P = Object.fromEntries(mapData.places.map((p) => [p.id, p]));
  const houses = JSON.parse(fs.readFileSync(new URL('../src/kit/housesPlanData.json', import.meta.url))).rows;
  const solids = (re) => approved.objects.filter((o) => o.kind === 'solids' && re.test(o.label)).map((o) => { const r = o.rings[0]; return [r.reduce((s, q) => s + q[0], 0) / r.length, r.reduce((s, q) => s + q[1], 0) / r.length]; });
  const PLAN = []; // { file, at:[x,z], rMin, rMax, y? }
  const add = (file, at, rMin, rMax, y) => PLAN.push({ file, at, rMin, rMax, y });
  const GC = [637, 48.8]; // gher yard centre
  for (const f of ['hay_bale', 'hay_bale', 'hay_bale', 'pitchfork_a', 'pitchfork_b', 'wheelbarrow', 'milk_can', 'milk_can', 'bucket', 'tree_stump_02', 'hatchet']) add(f, GC, 0, 5, 'gher');
  const CH = [P.yard_chaupal.x, P.yard_chaupal.z];
  for (const f of ['charpai_a', 'charpai_b', 'charpai_a', 'matka', 'bucket_b']) add(f, CH, 3, 11);
  for (const [x, z] of [[P.teastall.x, P.teastall.z], ...solids(/Tea stall \|/)]) { add('matka', [x, z], 2, 5); }
  for (const [x, z] of [[P.teastall.x, P.teastall.z], ...solids(/Tea stall \|/).slice(0, 3)]) { add('milk_can', [x, z], 2, 5); }
  add('charpai_b', [P.teastall.x, P.teastall.z], 3, 8); add('charpai_a', solids(/Tea stall \|/)[3], 3, 7);
  const hs = [3, 8, 14, 20, 27, 33, 41, 48, 55, 62, 70, 78].map((i) => houses[i % houses.length]).filter(Boolean);
  const set = [['charpai_a', 'matka'], ['charpai_b', 'bucket'], ['matka', 'ceramic_pot'], ['charpai_a', 'brass_pan_01'], ['bucket_b', 'matka'], ['charpai_b', 'ceramic_pot'], ['grind_stone', 'matka'], ['charpai_a', 'greenchair_01'], ['charpai_b', 'bucket_b'], ['matka', 'bucket'], ['charpai_a', 'ceramic_pot'], ['charpai_b', 'brass_pan_01']];
  hs.forEach((h, i) => { for (const f of set[i]) add(f, [h[1], h[2]], 2.5, 8); });
  const KH = [P.khalihan.x, P.khalihan.z];
  for (const f of ['hay_bale', 'hay_bale', 'hay_bale', 'pitchfork_a', 'pitchfork_b', 'wheelbarrow', 'sickle', 'dry_branches_medium_01', 'tree_stump_02', 'sickle', 'shrub_02', 'shrub_04', 'stone_01', 'dandelion_01', 'nettle_plant', 'shrub_03', 'shrub_sorrel_01']) add(f, KH, 1, 13);
  add('well_c', [609, -168.2], 3, 9); add('sickle', [609, -168.2], 2, 8); add('shrub_02', [609, -168.2], 4, 9); add('nettle_plant', [609, -168.2], 2, 8);
  add('hay_bale', [582.9, -167.8], 2, 8); add('pitchfork_b', [582.9, -167.8], 2, 8); add('dry_branches_medium_01', [582.9, -167.8], 3, 9);
  add('well_c', [573, 188.5], 3, 9); add('sickle', [573, 188.5], 2, 8); add('shrub_03', [573, 188.5], 2, 8); add('stone_01', [573, 188.5], 2, 8);
  const placed = []; let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const q of PLAN) {
    if (!q.at) continue; let best = null;
    for (let r = q.rMin; r <= q.rMax + 6 && !best; r += 0.4) for (let n = 0; n < 24 && !best; n++) {
      const ang = (n / 24) * Math.PI * 2 + r * 1.7, x = +(q.at[0] + Math.cos(ang) * r).toFixed(2), z = +(q.at[1] + Math.sin(ang) * r).toFixed(2);
      for (let tries = 0; tries < 6 && !best; tries++) {
        const yaw = +(rnd() * Math.PI * 2).toFixed(3), cand = { file: q.file, x, z, yaw, k: +(0.92 + rnd() * 0.16).toFixed(2), y: q.y };
        if (!ok(test(cand)) || placed.some((p) => bad(p, cand) || sameFace(p, cand))) continue;
        best = cand;
      }
    }
    if (best) placed.push(best); else console.log(`// NO SPOT for ${q.file} near ${q.at}`);
  }
  for (const b of placed) console.log(`  { file: '${b.file}', x: ${b.x}, z: ${b.z}, yaw: ${b.yaw}, k: ${b.k}${b.y ? `, y: '${b.y}'` : ''} },`);
}
