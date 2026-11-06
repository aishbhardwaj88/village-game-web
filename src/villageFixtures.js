import * as THREE from 'three';
import { ANCHORS } from './anchors.js';
import { colliderBoxFromTransform } from './collision.js';
import { Obj, Batch, rnd, local, spotMatrix } from './villageOddities.js';

/**
 * "EVERY VILLAGE HAS ONE OF THESE" (docs/VILLAGE_VOCABULARY.md section 11), the one hard-surface item
 * src/villageOddities.js and src/villageFurniture.js did not cover:
 *   newOldPair - a new pukka house (plastered brick, flat concrete roof with parapet, roof water tank, sunshade, grilled windows,
 *                paint-fresh door) standing right beside the old kachcha one it will replace (mud walls slumped to a stepped
 *                profile, a rafter run sagging out of a patched thatch/tin roof, a fallen-mud heap, the old door boarded).
 * Not built here on purpose: the bhootiya tree-through-roof and the banyan (organic, no CC0 model), the jhoola already exists in
 * villageFurniture.js, and the well / mazar / shamiana / scaffold / sand / bricks / half-built house in villageOddities.js.
 * Materials: the frozen library sets only (plaster, concrete, brick, wood, metal, lane = packed earth, jute), tiled in metres,
 * tint + weathering baked into vertex colour, so no flat colour and no new texture. One merged mesh per set.
 * The spot is an offset from a place anchor (src/anchors.js), so it rides along if the map moves.
 */

// anchor id, local x, local z (place frame), object yaw. Scouted for 17 x 7 m clear of every collider, visible mesh and road.
export const FIXTURE_SPOTS = {
  newOldPair: { at: 'banta', lx: -17.4, lz: 0.2, yaw: -1.4835 },
};

const MUD = 0xc2a47c, MUD2 = 0xb09270, PLASTER = 0xd7c9a8, PAINT = 0x7fa0a8, CONC = 0xa4a096, BRICK = 0xb06f4a;
const WOODD = 0x6a4c30, GREEN = 0x4f6a52;

// NEW PUKKA HOUSE, centred on the origin: 7 x 5 m, 3.1 m, front (door side) toward +z
function pukka(o) {
  const W = 7, D = 5, H = 3.1;
  o.box('concrete', W + 0.3, 0.45, D + 0.3, 0, 0.225, 0, CONC, 0, 0, 0, { dirt: 0.25 }); // plinth
  o.box('plaster', W, H - 0.45, D, 0, 0.45 + (H - 0.45) / 2, 0, PLASTER, 0, 0, 0, { dirt: 0.2, dust: 0.1 });
  // a painted lower band on the front and the side facing the old house
  o.box('plaster', W + 0.02, 0.9, D + 0.02, 0, 0.9, 0, PAINT, 0, 0, 0, { dirt: 0.2, dust: 0 });
  // roof slab with a parapet all round
  o.box('concrete', W + 0.5, 0.18, D + 0.5, 0, H + 0.09, 0, CONC, 0, 0, 0, { dirt: 0.1, dust: 0.3, streak: 0.12, streakFrom: H, streakTop: H + 0.2 });
  for (const sz of [-1, 1]) o.box('concrete', W + 0.5, 0.45, 0.14, 0, H + 0.4, sz * (D / 2 + 0.18), 0xaaa69c, 0, 0, 0, { dirt: 0.15, dust: 0.3 });
  for (const sx of [-1, 1]) o.box('concrete', 0.14, 0.45, D + 0.5, sx * (W / 2 + 0.18), H + 0.4, 0, 0xaaa69c, 0, 0, 0, { dirt: 0.15, dust: 0.3 });
  // door: frame, leaf, step, a concrete sunshade over it
  const fz = D / 2;
  o.box('wood', 1.3, 2.2, 0.1, 0.6, 0.45 + 1.1, fz + 0.01, WOODD);
  o.box('wood', 1.05, 2.05, 0.06, 0.6, 0.45 + 1.05, fz + 0.06, GREEN, 0, 0, 0, { dirt: 0.15 });
  for (const py of [0.9, 1.5, 2.1]) o.box('wood', 0.8, 0.5, 0.02, 0.6, py, fz + 0.1, 0x42584a, 0, 0, 0, { dirt: 0 });
  o.box('metal', 0.04, 0.2, 0.04, 0.2, 1.5, fz + 0.12, 0x6a6a64);
  o.box('concrete', 1.6, 0.18, 1.0, 0.6, 0.18, fz + 0.65, CONC, 0, 0, 0, { dirt: 0.4 });
  o.box('concrete', 2.2, 0.1, 0.9, 0.6, 2.62, fz + 0.45, CONC, 0, 0, -0.03, { dirt: 0.15, dust: 0.3 });
  // two grilled windows on the front, one on the side toward the old house; recess frame, bars, sill
  const win = (x, y, z, ry) => {
    const M = local(x, y, z, 0, ry, 0), at = (m) => M.clone().multiply(m);
    o.add('wood', new THREE.BoxGeometry(1.1, 1.0, 0.12), at(local(0, 0, 0)), WOODD);
    o.add('wood', new THREE.BoxGeometry(0.9, 0.8, 0.14), at(local(0, 0, 0.01)), 0x2a2a28, { dirt: 0, dust: 0 });
    for (let k = 0; k < 6; k++) o.add('metal', new THREE.BoxGeometry(0.018, 0.84, 0.02), at(local(-0.37 + k * 0.148, 0, 0.09)), 0x3a3a38, { dirt: 0 });
    for (const yy of [-0.2, 0.2]) o.add('metal', new THREE.BoxGeometry(0.94, 0.02, 0.02), at(local(0, yy, 0.09)), 0x3a3a38, { dirt: 0 });
    o.add('concrete', new THREE.BoxGeometry(1.3, 0.07, 0.25), at(local(0, -0.54, 0.1)), CONC, { dirt: 0.3 });
  };
  win(-1.9, 1.7, fz + 0.02, 0); win(2.35, 1.7, fz + 0.02, 0); win(W / 2 + 0.02, 1.7, 0.2, Math.PI / 2);
  // roof: tank stand with a black water tank, a staircase headhouse stub, a few rods of rebar left for a second floor
  o.box('brick', 1.4, 0.9, 1.4, -2.3, H + 0.18 + 0.45, -1.2, BRICK, 0, 0, 0, { dirt: 0.15 });
  o.cyl('tarpaulin', 0.62, 0.55, 1.0, 16, -2.3, H + 0.18 + 0.9 + 0.5, -1.2, 0x2b2c2e, 0, 0, 0, { dirt: 0.1, dust: 0.25 });
  o.cyl('tarpaulin', 0.3, 0.3, 0.08, 12, -2.3, H + 0.18 + 0.9 + 1.04, -1.2, 0x242526);
  o.box('brick', 1.5, 2.2, 1.7, 2.3, H + 0.18 + 1.1, -1.4, PLASTER, 0, 0, 0, { dirt: 0.25 });
  o.box('concrete', 1.8, 0.1, 2.0, 2.3, H + 0.18 + 2.25, -1.4, CONC, 0, 0, 0, { dirt: 0.1, dust: 0.3 });
  for (let k = 0; k < 6; k++) o.rod('metal', 0.007, [3.1 + (k % 3) * 0.15, H + 0.2, 1.8 + Math.floor(k / 3) * 0.15], [3.1 + (k % 3) * 0.15 + (rnd(k + 3) - 0.5) * 0.06, H + 0.9 + rnd(k) * 0.5, 1.8 + Math.floor(k / 3) * 0.15], 0x7a4a30, 4, { streak: 0.5, streakFrom: H, streakTop: H + 1.2, dirt: 0 });
  // a hand pump pipe riser, a meter box and a cable on the wall
  o.box('metal', 0.3, 0.4, 0.14, -3.2, 1.7, fz + 0.08, 0x6b6e68, 0, 0, 0, { dirt: 0.2 });
  o.rod('metal', 0.012, [-3.2, 1.5, fz + 0.1], [-3.2, 0.45, fz + 0.1], 0x2a2a28, 4, { dirt: 0 });
}

// OLD KACHCHA HOUSE, centred on the origin: 4.6 x 4 m mud, a wall slumping to a stepped edge, roof sagging, mud heap
function kachcha(o) {
  const W = 4.6, D = 4.0, T = 0.45;
  // mud walls as courses of lumpy slabs so the top edge is ragged: front/back full, left side slumped low
  const wall = (len, ox, oz, alongX, hMax, hMin, tint, seed) => {
    const n = Math.round(len / 0.6);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), h = hMax - (hMax - hMin) * Math.pow(t, 1.6) + (rnd(seed + i) - 0.5) * 0.16;
      const u = -len / 2 + (i + 0.5) * (len / n);
      const tt = new THREE.Color(tint).multiplyScalar(0.88 + rnd(seed + i + 40) * 0.22);
      o.box('lane', alongX ? len / n + 0.02 : T + (rnd(seed + i + 9) - 0.5) * 0.06, h, alongX ? T + (rnd(seed + i + 9) - 0.5) * 0.06 : len / n + 0.02, ox + (alongX ? u : 0), h / 2, oz + (alongX ? 0 : u), tt, 0, (rnd(seed + i + 5) - 0.5) * 0.05, 0, { dirt: 0.5, dirtH: 1.2, dust: 0.2 });
    }
  };
  wall(W, 0, D / 2, true, 2.5, 2.1, MUD, 1);     // front wall (door gap boarded below)
  wall(W, 0, -D / 2, true, 2.6, 1.0, MUD2, 20);  // back wall, slumped toward one end
  wall(D, -W / 2, 0, false, 2.4, 0.5, MUD, 40);  // left wall, mostly gone
  wall(D, W / 2, 0, false, 2.5, 2.2, MUD2, 60);  // right wall, still standing
  // lime plaster patches flaking off the front, and exposed bricks where the mud has fallen from the corner
  o.box('plaster', 1.6, 1.1, 0.03, -0.9, 1.1, D / 2 + 0.24, 0xd0c4a4, 0, 0, 0, { dirt: 0.5, dust: 0.3 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) o.box('brick', 0.23, 0.075, 0.12, -W / 2 + 0.2 + c * 0.24 + (r % 2) * 0.12, 0.08 + r * 0.08, -D / 2 + 0.3, BRICK, 0, 0, 0, { dirt: 0.4 });
  // boarded-up old door: frame and planks
  o.box('wood', 1.0, 1.7, 0.12, 1.0, 0.85, D / 2 + 0.2, 0x5a4a38, 0, 0, 0, { dirt: 0.5 });
  for (let k = 0; k < 3; k++) o.box('wood', 1.1, 0.12, 0.05, 1.0, 0.4 + k * 0.5, D / 2 + 0.3, 0x7a6a50, 0, 0, (rnd(k) - 0.5) * 0.25, { dirt: 0.4 });
  // sagging roof: a run of bamboo-ish rafters in a dip, tin sheets patched over the standing half, a jute rag
  for (let k = 0; k < 7; k++) {
    const x = -W / 2 + 0.3 + k * 0.7, sag = Math.sin((k / 6) * Math.PI) * 0.35;
    o.rod('wood', 0.045, [x, 2.55 - sag - (k < 2 ? 0.6 : 0), D / 2 + 0.4], [x + (rnd(k) - 0.5) * 0.1, 2.75 - sag - (k < 2 ? 0.7 : 0), -D / 2 - 0.4], 0x7a6844, 5, { dirt: 0.3 });
  }
  for (let k = 0; k < 4; k++) o.box('metal', 1.0, 0.025, 2.3, W / 2 - 0.7 - k * 0.8 * 0 - (k % 2) * 0.05, 2.55, (k - 1.5) * 0.9, 0x8a6a4c, -0.04 * (k - 1.5), 0, 0.03 * (k - 1.5), { streak: 0.4, streakFrom: 2.4, streakTop: 2.7 });
  for (let k = 0; k < 3; k++) o.box('metal', 1.0, 0.022, 3.0, -0.5 + k * 1.0, 2.5 - (k === 0 ? 0.2 : 0) , 0, 0x7e6a54 , 0.05, 0, 0, { streak: 0.5, streakFrom: 2.3, streakTop: 2.7 });
  o.box('jute', 0.9, 0.03, 0.7, 0.1, 2.28, -1.2, 0x8a7650, 0.05, 0.2, 0, { dirt: 0.3 });
  // fallen mud and brick-rubble heap by the slumped corner, a broken matka, a leaning plank
  for (let k = 0; k < 14; k++) {
    const a = rnd(k + 90) * Math.PI * 2, r = rnd(k + 91) * 0.9, s = 0.3 + rnd(k + 92) * 0.35;
    o.add('lane', new THREE.DodecahedronGeometry(s, 0), local(-W / 2 - 0.5 + Math.cos(a) * r, s * 0.45, -0.8 + Math.sin(a) * r * 1.2, rnd(k) * 3, rnd(k + 1) * 3, 0), new THREE.Color(MUD).multiplyScalar(0.8 + rnd(k + 93) * 0.3), { dirt: 0.3, dust: 0.3 });
  }
  for (let k = 0; k < 6; k++) o.box('brick', 0.23, 0.075, 0.11, -W / 2 - 0.3 + rnd(k + 5) * 1.2, 0.04 + (k % 2) * 0.02, 0.8 + rnd(k + 7) * 0.8, BRICK, 0, rnd(k) * 3, 0, { dirt: 0.4 });
  o.rod('wood', 0.03, [-W / 2 - 0.9, 0, 1.6], [-W / 2 - 0.6, 0.9, 2.0], 0x6a5a40, 5);
}

function buildPair(o) {
  // the new house to the west, the old one 6.5 m east of it with a 1.2 m gap between the walls
  const a = new Obj(o.b, o.world.clone().multiply(local(-3.6, 0, 0)), o.seed, { dirt: 0.12, dust: 0.1 });
  pukka(a);
  const b = new Obj(o.b, o.world.clone().multiply(local(6.2, 0, 0.3, 0, 0.07, 0)), o.seed + 3, { dirt: 0.4, dust: 0.2 });
  kachcha(b);
  o.tris = a.tris + b.tris;
  return {
    w: 7.4, d: 5.4, cx: -3.6, cz: 0,
    extra: [{ w: 4.9, d: 4.3, x: 6.2, z: 0.3 }],
  };
}

const BUILDERS = { newOldPair: buildPair };

export function createVillageFixtures(scene) {
  const group = new THREE.Group(); group.name = 'village_fixtures';
  const batch = new Batch(), colliders = [], report = [];
  let seed = 131;
  for (const [kind, build] of Object.entries(BUILDERS)) {
    const sp = FIXTURE_SPOTS[kind];
    const world = sp && ANCHORS[sp.at] && spotMatrix(sp);
    if (!world) continue;
    const o = new Obj(batch, world, seed, { dirt: 0.2, dust: 0.12 });
    const fp = build(o);
    colliders.push(colliderBoxFromTransform(fp.w, fp.d, world.clone().multiply(new THREE.Matrix4().makeTranslation(fp.cx || 0, 0, fp.cz || 0))));
    for (const e of fp.extra || []) colliders.push(colliderBoxFromTransform(e.w, e.d, world.clone().multiply(new THREE.Matrix4().makeTranslation(e.x, 0, e.z))));
    const p = new THREE.Vector3().setFromMatrixPosition(world);
    report.push({ kind, x: +p.x.toFixed(2), z: +p.z.toFixed(2), tris: Math.round(o.tris), fp: { w: fp.w, d: fp.d } });
    seed += 7;
  }
  const meshes = batch.flush(group, 'fixtures_');
  const first = meshes.metal || Object.values(meshes)[0];
  if (first) first.userData.colliderBoxes = colliders;
  scene.add(group);
  if (typeof window !== 'undefined') window.__fixtures = { items: report, drawCalls: group.children.length, colliders };
  return { group, colliders };
}
