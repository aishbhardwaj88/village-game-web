#!/usr/bin/env node
/**
 * PARALLEL.md Priority 0: does every place FRONT the road its users arrive on?
 * Writes docs/road-front-audit-<date>.md. Read-only on src/ and the map.
 *
 * Front of a place in the world = its NATIVE front (the way the model / code-built site faces at ry 0) turned by its
 * anchor ry (three.js yaw: local (lx, lz) -> world (lx c + lz s, -lx s + lz c), src/anchors.js localPt).
 *  - every staging-yard v2 place (src/stagedPlaces.js): local +Z ("front = +z")
 *  - code-built sites: the "Front faces" column of docs/asset-slots.md (measured by src/siteSlots.js at ry 0)
 *  - hero places authored in world offsets (house, school, store, tea stall, chowk, temple...): +Z ASSUMED, marked "?"
 * Road kinds (1 Nov map + MAP_SHIFT): highway; road (main / cross / ring); village lane; farm track; front path; back lane.
 *
 * "Faces road" = a ray from the place centre along its front meets a road of the EXPECTED kind within
 * (half the place's depth + 30 m). Expected kind: highway for bus adda, petrol pump, dharam kanta, mandi, puncture
 * shop; the kiln drive for the bhatta; any road / village lane / front path for everything else (farm tracks also
 * count for farm places). Labels (eastgali, westgali, highway, canal) are listed but not judged.
 *
 * Usage: node tools/road-front-audit.mjs
 */
import fs from 'fs';
import { MAP_SHIFT, bendMapRoad } from '../src/mapPlan.js';
import { ANCHORS } from '../src/anchors.js';

const MAP = JSON.parse(fs.readFileSync('docs/layout/village-plan-positions-2026-11-01.json', 'utf8'));
const sh = ([x, z]) => [x + MAP_SHIFT.x, z + MAP_SHIFT.z];

const roads = [];
for (const [id, r] of Object.entries(MAP.roads))
  roads.push({ id, kind: id === 'highway' ? 'highway' : 'road', w: r.width_m, pts: bendMapRoad(id, r.centreline).map(sh) });
for (const l of MAP.lanes_and_tracks) {
  const kind = /front path/.test(l.type) ? 'front path' : /back/.test(l.type) ? 'back lane' : /farm/.test(l.type) ? 'farm track' : 'village lane';
  roads.push({ id: l.name, kind, w: l.width_m, pts: l.centreline.map(sh) });
}

// native front, local unit vector [lx, lz]
const PLUSZ = [0, 1], MINUSZ = [0, -1], PLUSX = [1, 0], MINUSX = [-1, 0];
const NATIVE = {
  anganwadi: PLUSZ, banta: PLUSZ, chaat: PLUSZ, chemist: PLUSZ, gurudwara: PLUSZ, health: PLUSZ, jain: PLUSZ,
  jalebi: PLUSZ, mandi: MINUSZ /* 9 Nov: createMandi road end (gantry, apron) is site -z; was -X when the yard lay along the highway */, manihari: PLUSZ, masjid: PLUSZ, mela: PLUSZ, haveli: PLUSZ, sabzi: PLUSZ,
};
// Hero places whose real front was read from the Blender script / main.js (7 Nov 2026) and whose in-game yaw differs from the anchor ry.
// nat = native front in the model's own frame; ry (deg, three.js yaw) replaces the anchor ry where main.js / village.js apply their own turn.
const HERO_FRONT = {
  school: { nat: MINUSZ, ryDeg: -11.2 }, // build_school.py: yard open to the lane on the -z side (gate); village.js SCHOOL_YAW
  halwai: { nat: MINUSX, ryDeg: -95 }, // build_halwai.py: FRONT = -x, the lane side; village.js HALWAI_YAW
  house: { nat: PLUSZ }, // build_house.py: south wall with the gate
  bazaar: { nat: MINUSZ }, // build_bazaar_row.py: shops open toward -z
  teastall: { nat: MINUSZ }, // build_tea_stall.py front = +wz; main.js TEA_SHOP_ROT = PI + ry (7 Nov), so the counter faces -z
  store: { nat: MINUSZ }, // build_general_store.py front = +wz; main.js STORE_ROT = PI + ry (7 Nov)
  gaushala: { nat: PLUSZ }, // build_gaushala.py: +z south = front, where the gate is
  temple: { nat: MINUSX }, // build_temple.py: gate gap on the west (-x) side
};
const V2_ALIAS = { post: 'yard_post', ration: 'yard_ration', chakki: 'yard_chakki', dairy: 'yard_dairy', khalihan: 'yard_khalihan',
  tubewell: 'yard_tubewell', tvhouse: 'yard_tvhouse', gurukul: 'yard_gurukul', maidan: 'yard_khel' };
const LABELS = new Set(['eastgali', 'westgali', 'highway', 'canal']);
// open land with no built front: fields, orchard, ponds, play grounds
const OPEN = new Set(['field', 'cane', 'baagh', 'pond', 'johad', 'gilli', 'maidan', 'yard_khel', 'yard_akhada', 'mela']);
// the map's own "Front path to X" lanes: doorstep end at the place, far end at the road it arrives from
const FRONT_PATH = { yard_dharam_kanta: 'Truck weighbridge', mandi: 'Wholesale grain market', teastall: 'Tea stall', chaat: 'Chaat cart',
  post: 'Post office', yard_post: 'Post office', store: 'General store', gaushala: 'Cow shelter', dairy: 'Milk dairy', yard_dairy: 'Milk dairy' };
const HIGHWAY = new Set(['yard_bus_adda', 'yard_petrol', 'yard_dharam_kanta', 'mandi', 'yard_puncture']);
const FARM = new Set(['field', 'cane', 'baagh', 'khalihan', 'yard_khalihan', 'tubewell', 'yard_tubewell', 'gaushala', 'pond', 'johad', 'dairy', 'yard_dairy']);
const expected = (id) => HIGHWAY.has(id) ? ['highway'] : id === 'yard_bhatta' ? ['kiln']
  : FARM.has(id) ? ['highway', 'road', 'village lane', 'front path', 'farm track'] : ['highway', 'road', 'village lane', 'front path'];

// map footprints (to size the ray) by in_code_today key
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const mapBy = new Map();
for (const p of MAP.places) {
  if (/NEW/i.test(String(p.in_code_today))) continue;
  for (const t of String(p.in_code_today).split(/[,/;+]| or /)) { const k = norm(t.split('(')[0]); if (k && !mapBy.has(k)) mapBy.set(k, p); }
}
const halfSize = (id) => {
  const p = mapBy.get(norm(id)) || mapBy.get(norm(V2_ALIAS[id] || ''));
  if (!p || !p.shapes) return 8;
  let r = 0;
  for (const s of p.shapes) for (const [x, z] of s.corners || []) r = Math.max(r, Math.hypot(x - p.centre[0], z - p.centre[1]));
  return r || 8;
};

const segNear = (px, pz, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L)) : 0;
  const qx = a[0] + t * dx, qz = a[1] + t * dz;
  return [Math.hypot(px - qx, pz - qz), qx, qz];
};
const nearest = (px, pz, list) => {
  let best = null;
  for (const r of list) for (let i = 0; i + 1 < r.pts.length; i++) {
    const [d, qx, qz] = segNear(px, pz, r.pts[i], r.pts[i + 1]);
    const e = Math.max(0, d - r.w / 2);
    if (!best || e < best.d) best = { r, d: e, qx, qz };
  }
  return best;
};
// first road hit by a ray (x,z)+t*(fx,fz), t in [0,maxT]: sample every 0.5 m against road half-widths
const rayHit = (x, z, fx, fz, maxT) => {
  for (let t = 1; t <= maxT; t += 0.5) {
    const px = x + fx * t, pz = z + fz * t;
    let hit = null;
    for (const r of roads) for (let i = 0; i + 1 < r.pts.length; i++) {
      const [d] = segNear(px, pz, r.pts[i], r.pts[i + 1]);
      if (d <= r.w / 2 + 0.5 && (!hit || r.kind === 'highway')) hit = r;
    }
    if (hit && hit.kind !== 'back lane') return { r: hit, t };
  }
  return null;
};
const compass = (fx, fz) => {
  const a = (Math.atan2(fx, -fz) * 180 / Math.PI + 360) % 360; // 0 = north (-z), 90 = east (+x)
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(a / 45) % 8] + ` (${a.toFixed(0)}°)`;
};

const rows = [];
for (const [id, a] of Object.entries(ANCHORS)) {
  const key = V2_ALIAS[id] || id;
  const isV2 = key.startsWith('yard_');
  const hero = HERO_FRONT[id];
  let nat = isV2 ? PLUSZ : hero ? hero.nat : NATIVE[id];
  const assumed = !nat;
  nat = nat || PLUSZ;
  const ry = hero && hero.ryDeg !== undefined ? hero.ryDeg * Math.PI / 180 : a.ry || 0, c = Math.cos(ry), s = Math.sin(ry);
  const fx = nat[0] * c + nat[1] * s, fz = -nat[0] * s + nat[1] * c;
  const near = nearest(a.x, a.z, roads.filter((r) => r.kind !== 'back lane'));
  const exp = expected(key);
  const expRoads = roads.filter((r) => exp.includes(r.kind) || (exp.includes('kiln') && r.id === 'Kiln drive'));
  const nearExp = nearest(a.x, a.z, expRoads);
  const reach = halfSize(id) + 30;
  const hit = rayHit(a.x, a.z, fx, fz, reach);
  const ok = hit && (exp.includes(hit.r.kind) || (exp.includes('kiln') && hit.r.id === 'Kiln drive'));
  // the map's front path: front should point from the doorstep end towards the road end
  let fp = '';
  let fpOk = null;
  if (FRONT_PATH[id]) {
    const path = roads.find((r) => r.id === 'Front path to ' + FRONT_PATH[id] || r.id.startsWith('Front path to ' + FRONT_PATH[id]));
    if (path) {
      const [p0, p1] = [path.pts[0], path.pts[path.pts.length - 1]];
      const [door, road] = Math.hypot(p0[0] - a.x, p0[1] - a.z) < Math.hypot(p1[0] - a.x, p1[1] - a.z) ? [p0, p1] : [p1, p0];
      const dx = road[0] - door[0], dz = road[1] - door[1], Lp = Math.hypot(dx, dz) || 1;
      const fa = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / Lp))) * 180 / Math.PI;
      fpOk = fa <= 60;
      fp = `map front path points ${compass(dx / Lp, dz / Lp).split(' ')[0]}, front off by ${fa.toFixed(0)}°`;
    }
  }
  let verdict = LABELS.has(id) ? 'label, not judged' : a.x < 450 && a.z < -150 && id.startsWith('yard_') && !['yard_bus_adda', 'yard_petrol', 'yard_dharam_kanta', 'yard_puncture', 'yard_bhatta', 'yard_khalihan', 'yard_paani_tanki'].includes(id) ? 'staging yard, not on map' : OPEN.has(id) ? 'open ground, not judged' : fpOk !== null ? (fpOk ? 'yes' : 'NO') : ok ? 'yes' : 'NO';
  if (assumed && !LABELS.has(id) && !OPEN.has(id)) verdict += ' (front unverified)';
  // angle from front to the nearest expected road
  let ang = '';
  if (nearExp) { const dx = nearExp.qx - a.x, dz = nearExp.qz - a.z, L = Math.hypot(dx, dz) || 1; ang = (Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / L))) * 180 / Math.PI).toFixed(0); }
  rows.push({ id, x: a.x, z: a.z, ry: ry * 180 / Math.PI, front: compass(fx, fz) + (assumed ? ' ?' : ''), near, nearExp, exp, hit, ang, verdict, fp });
}

const date = new Date().toLocaleDateString('en-CA');
const L = [];
L.push(`# Road-front audit, ${date}`, '', 'Generated by `node tools/road-front-audit.mjs`. Measured, not judged. World coords (+x east, +z south, so N = -z).', '',
  '- **front facing**: native front turned by the anchor ry. `?` = hero place authored in world offsets, native front assumed +Z (unverified).',
  '- **nearest road**: nearest road/lane/track/front path (back lanes ignored), distance from the place centre to its edge.',
  '- **road in front**: first road the front ray meets within half the footprint + 30 m.',
  '- **faces road**: the road in front is the kind its users arrive on (highway for bus adda / petrol / dharam kanta / mandi / puncture; kiln drive for the bhatta; any road, lane or front path otherwise).',
  '- **angle**: degrees between the front and the direction to the nearest road of the expected kind (0 = straight at it).', '',
  '- **map front path**: where the 1 Nov map draws a "Front path to X", it decides: the front must point along it to the road (within 60°).', '',
  '| place | x | z | ry° | front facing | nearest road | dist m | road in front (m) | expected | angle to it | map front path | faces road |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows)
  L.push(`| ${r.id} | ${r.x.toFixed(1)} | ${r.z.toFixed(1)} | ${r.ry.toFixed(1)} | ${r.front} | ${r.near ? `${r.near.r.id} (${r.near.r.kind})` : '-'} | ${r.near ? r.near.d.toFixed(1) : '-'} | ${r.hit ? `${r.hit.r.id} (${r.hit.t.toFixed(0)})` : 'none'} | ${r.exp.includes('kiln') ? 'Kiln drive' : r.exp.length === 1 ? r.exp[0] : 'any'}${r.nearExp ? `: ${r.nearExp.r.id} ${r.nearExp.d.toFixed(1)} m` : ''} | ${r.ang} | ${r.fp || '-'} | ${r.verdict} |`);
const no = rows.filter((r) => r.verdict.startsWith('NO'));
L.push('', `**${rows.length} anchors, ${rows.filter((r) => r.verdict.startsWith('yes')).length} face their road, ${no.length} do not:** ${no.map((r) => r.id + (r.verdict.includes('unverified') ? ' (front unverified)' : '')).join(', ') || 'none'}.`);
const file = `docs/road-front-audit-${date}.md`;
fs.writeFileSync(file, L.join('\n') + '\n');
console.log(file);
for (const r of rows) console.log(r.verdict.padEnd(26), r.id.padEnd(18), r.front.padEnd(12), r.hit ? r.hit.r.id + ' ' + r.hit.t : 'none', '| near', r.near && r.near.r.id, r.near && r.near.d.toFixed(1), '| exp', r.nearExp && r.nearExp.r.id, r.ang, r.fp);
