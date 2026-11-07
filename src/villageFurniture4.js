import * as THREE from 'three';
import { ANCHORS } from './anchors.js';
import { Obj, Batch, spotMatrix, local, rnd } from './villageOddities.js';
import { FURNITURE2_SPOTS } from './villageFurniture2.js';

/**
 * VILLAGE FURNITURE 4 (docs/VILLAGE_VOCABULARY.md section 6): the two section-6 pieces that only existed once.
 *   roadside majar - a small pir's grave under the johad-side neem (src/main.js trees_johad, johad + (18, 13)), on the
 *                    road's west verge: a whitewashed lime chabutra with chipped corners showing brick, a step to the road,
 *                    the grave mound under TWO chadars (an old faded maroon one beneath, a newer green one with an ochre gota
 *                    border on top, both modelled as draped cloth with folds and a pooled hem), a marigold strand across it,
 *                    a plastered lamp niche (chiraghdan) at the head with soot above it, clay diyas (one tipped over), two
 *                    small water matkas, an incense pot, and a green pennant on a bamboo pole wound with mannat threads.
 *                    The village's domed mazar (src/villageOddities.js, by the dairy) stays the main one; this is the small
 *                    wayside kind. A faith place: NO task, NO interaction, no signboard. Solid platform only.
 *   snagged kites  - eight paper patangs caught in village trees across five areas (halwai lane, haveli, johad, pond,
 *                    gaushala) and one hanging off the transformer line's wire (src/villageFurniture2.js): modelled as two-
 *                    tone paper panels on a bamboo spine and bow, three variants (whole, torn, crumpled), a paper tail flap,
 *                    a dangling tail string and the cut manjha looping off into the branches. Faded colours, no print.
 *                    The chowk wire kites (src/villageFurniture.js) are unchanged.
 * Materials: frozen library sets only, tinted + weathered in vertex colour by villageOddities' Obj: 'plaster' (majar, diyas,
 * pots) and 'tarpaulin' (chadars, kite paper, sticks and strings).
 * Draw cost: 2 merged meshes. 'furniture4_plaster' is local to the majar (culled elsewhere); 'furniture4_cloth' spans the
 * village because the kites are spread out, so it is 1 draw everywhere (a few thousand triangles). The cloth mesh's name
 * matches solidRules' soft-cloth rule; kites sit above 2.3 m anyway, and the majar platform carries an explicit box.
 * Known limit: the outskirt trees are zone-streamed (built within 70 m); past that a kite can hang with no tree round it,
 * at a size of a few pixels.
 */

// tree positions copied from src/main.js (trees_* outskirt clusters and the halwai neem), as offsets from the same anchors
export const FURNITURE4_SPOTS = {
  majar: { at: 'johad', lx: 15.4, lz: 13.2, yaw: 0.04 }, // neem trunk at johad + (18, 13); the road's west edge is ~1.6 m east of it
};
const TREE_KITES = [
  // anchor, tree offset, tree kind, then per kite: bearing from the trunk (rad), reach (m), height (m), variant, colours
  { at: 'halwai', tx: 3, tz: -5, kites: [
    { ang: 0.6, r: 2.1, y: 3.9, v: 'whole', c: [0xb54d6a, 0xd6c48a], tail: 0x5a7a9a },
    { ang: 3.6, r: 2.3, y: 4.5, v: 'torn', c: [0x4f7ca6, 0xd2c9b4], tail: 0xc07a3a },
  ] },
  { at: 'haveli', tx: -18, tz: 12, kites: [{ ang: 1.9, r: 2.5, y: 4.1, v: 'crumpled', c: [0xcf8c3c, 0x6e8c4e], tail: 0xb54d6a }] },
  { at: 'johad', tx: -14, tz: 15, kites: [{ ang: 4.4, r: 1.3, y: 2.95, v: 'whole', c: [0x7a5a92, 0xd8cf9a], tail: 0x4f7ca6 }] }, // babool, short
  { at: 'johad', tx: 18, tz: 13, kites: [{ ang: 2.2, r: 2.0, y: 4.6, v: 'torn', c: [0xc9b54e, 0xb04a40], tail: 0x6e8c4e }] }, // the majar's neem, high up
  { at: 'pond', tx: -18, tz: -10, kites: [{ ang: 5.3, r: 2.2, y: 3.7, v: 'whole', c: [0x5f8f5a, 0xd0c6b0], tail: 0xcf8c3c }] },
  { at: 'pond', tx: -16, tz: 14, kites: [{ ang: 0.2, r: 1.4, y: 2.9, v: 'crumpled', c: [0xb04a40, 0x4f7ca6], tail: 0xd6c48a }] }, // babool
  { at: 'gaushala', tx: -21, tz: 15, kites: [{ ang: 2.8, r: 2.6, y: 4.2, v: 'whole', c: [0xd09a4a, 0x7a5a92], tail: 0xb54d6a }] },
];

const STRING = 0xcfc6b0, MANJHA = 0xb59a8a, BAMBOO = 0xb8a46a, BAMBOO_D = 0x9c8a54;

// ---------------------------------------------------------------------------------------------------------------- helpers
/** A flat double-sided polygon (triangle fan over `pts`, [x, y, z] each) as a non-indexed geometry with normals. */
function sheet(pts) {
  const pos = [];
  for (let i = 1; i < pts.length - 1; i++) {
    pos.push(...pts[0], ...pts[i], ...pts[i + 1]); // front
    pos.push(...pts[0], ...pts[i + 1], ...pts[i]); // back
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** A thin rod in a frame `F` (world or object matrix) between two frame-local points. */
function rodIn(o, F, set, r, a, b, tint, seg = 3, w = null) {
  const A = new THREE.Vector3(...a).applyMatrix4(F), B = new THREE.Vector3(...b).applyMatrix4(F);
  o.rod(set, r, A.toArray(), B.toArray(), tint, seg, w);
}

/** A string sagging between two world points, as `n` short rods. */
function slack(o, a, b, sag, tint, r = 0.0035, n = 5) {
  let prev = a;
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t];
    o.rod('tarpaulin', r, prev, p, tint, 3, { dirt: 0, dust: 0 });
    prev = p;
  }
}

const faded = (hex, k, seed) => new THREE.Color(hex).lerp(new THREE.Color(0xd8cfbc), k).multiplyScalar(0.9 + rnd(seed) * 0.12);

// ---------------------------------------------------------------------------------------------------------------- kite
/**
 * One patang, built in its own frame K (kite plane = local XY, face = +z, nose = +y), then the string out of the frame.
 * `snag` is the world point the cut manjha runs up to (a branch or the wire); the rest of the string loops down from it.
 */
function buildKite(o, K, spec, seed, snag) {
  const sun = 0.18 + rnd(seed) * 0.22; // sun fading, per kite
  const c1 = faded(spec.c[0], sun, seed + 1), c2 = faded(spec.c[1], sun * 0.6, seed + 2), c3 = faded(spec.tail, sun, seed + 3);
  // the diamond: nose T, wing tips L/R (bowed back), cross C, tail B
  const bow = -0.05;
  let T = [0, 0.32, 0], L = [-0.28, 0.06, bow], R = [0.28, 0.06, bow], B = [0, -0.3, 0];
  const C = [0, 0.06, 0.004];
  if (spec.v === 'crumpled') { R = [0.22, 0.0, 0.12]; T = [0.03, 0.29, 0.05]; } // one wing folded forward, the nose bent
  const W = { dirt: 0, dust: 0.08 };
  const panel = (pts, tint) => o.add('tarpaulin', sheet(pts), K, tint, W);
  // classic split: the top pair in one colour, the bottom pair in the other, the left-bottom a shade darker for the fold
  panel([C, T, L], c1);
  panel([C, R, T], new THREE.Color(c1).multiplyScalar(0.93));
  if (spec.v === 'torn') {
    // the bottom-right quarter ripped away to a ragged stub hanging off the spine
    panel([C, [0.0, -0.22, 0], [0.07, -0.12, 0.01], [0.04, -0.02, 0.0], [0.12, 0.01, -0.01]], c2);
    panel([[0.12, 0.01, -0.01], [0.16, -0.06, 0.03], [0.09, -0.05, 0.02]], new THREE.Color(c2).multiplyScalar(0.85)); // a flap curling out
  } else {
    panel([C, B, R], c2);
  }
  panel([C, L, B], new THREE.Color(c2).multiplyScalar(0.9));
  // tail flap (puchhalla): a small triangle of a third paper under the tail
  const tb = B[1];
  panel([[0, tb + 0.02, 0.002], [-0.075, tb - 0.11, 0.01], [0.075, tb - 0.11, 0.0]], c3);
  // bamboo: the spine (thick end at the nose) and the bow (kamaan) arcing from tip to tip through the cross
  rodIn(o, K, 'tarpaulin', 0.0045, [T[0], T[1], T[2] - 0.008], [B[0], B[1] - 0.01, B[2] - 0.008], BAMBOO, 3, W);
  const bowPts = [L, [-0.14, 0.13, -0.01], [0, 0.16, -0.008], [0.14, 0.13, -0.01], R].map((p) => [p[0], p[1], p[2] - 0.008]);
  for (let i = 0; i < bowPts.length - 1; i++) rodIn(o, K, 'tarpaulin', 0.0032, bowPts[i], bowPts[i + 1], BAMBOO_D, 3, W);
  // tail string: a long thin paper/thread tail, kinked where it caught
  const ts = 0.45 + rnd(seed + 9) * 0.45, kink = (rnd(seed + 10) - 0.5) * 0.12;
  rodIn(o, K, 'tarpaulin', 0.003, [0, tb - 0.1, 0.004], [kink, tb - 0.1 - ts * 0.55, 0.02], c3, 3, W);
  // the second half hangs straight down in world space, whatever the kite's tilt
  const mid = new THREE.Vector3(kink, tb - 0.1 - ts * 0.55, 0.02).applyMatrix4(K);
  o.rod('tarpaulin', 0.003, mid.toArray(), [mid.x + kink * 0.3, mid.y - ts * 0.5, mid.z + 0.02], c3, 3, W);
  // bridle (kanna): two threads from the spine to a knot in front of the cross
  const knot = [0, 0.02, 0.09];
  rodIn(o, K, 'tarpaulin', 0.0018, [0, 0.2, 0.004], knot, STRING, 3, W);
  rodIn(o, K, 'tarpaulin', 0.0018, [0, -0.17, 0.004], knot, STRING, 3, W);
  // the cut manjha: up from the knot to the snag, then a long slack loop back down the far side
  const k = new THREE.Vector3(...knot).applyMatrix4(K).toArray();
  slack(o, k, snag, 0.05, MANJHA, 0.0028, 3);
  const end = [snag[0] + (rnd(seed + 11) - 0.5) * 1.2, Math.max(2.3, snag[1] - 1.1 - rnd(seed + 12) * 0.8), snag[2] + (rnd(seed + 13) - 0.5) * 1.2];
  slack(o, snag, end, -0.15, MANJHA, 0.0028, 4);
}

/** A kite frame: hung at `pos`, facing `yaw`, nose tipped by `pitch` and rolled by `roll`. */
const kiteFrame = (pos, yaw, pitch, roll) => new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')), new THREE.Vector3(1, 1, 1));

// ---------------------------------------------------------------------------------------------------------------- majar
const LIME = 0xd8d3c4, LIME_B = 0xcfd0c8, BRICKY = 0x8e5e48, CLAY = 0x9c5e3e, CLAY_D = 0x7e4a32, SOOT = 0x37302a;

/**
 * A cloth draped over a box (centre cx, cz; top y `top`; half sizes hx, hz), hanging `drop` m down the sides to rest on
 * `floor`, with folds. Returns a geometry plus each vertex's distance from the top edge (for the border colour).
 */
function drape(hx, hz, top, floor, drop, seed, res = 0.05) {
  const ex = hx + drop + 0.06, ez = hz + drop + 0.06;
  const nx = Math.ceil((2 * ex) / res), nz = Math.ceil((2 * ez) / res);
  const g = new THREE.PlaneGeometry(2 * ex, 2 * ez, nx, nz);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, dist = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const dx = Math.max(0, Math.abs(x) - hx), dz = Math.max(0, Math.abs(z) - hz);
    const d = Math.hypot(dx, dz);
    dist[i] = d;
    // folds: deeper the further down the fall, a few wide waves along each edge
    const fold = Math.sin((Math.abs(x) > hx ? z : x) * 13 + seed) * 0.5 + Math.sin((Math.abs(x) > hx ? z : x) * 5.3 - seed) * 0.5;
    const out = d > 0 ? Math.min(d, drop) * 0.12 + fold * 0.018 * Math.min(1, d / 0.08) : 0;
    let y = top - Math.min(d, top - floor);
    const pool = Math.max(0, d - (top - floor)); // what is left past the floor spreads out on it
    y += (d > 0 ? 0.004 : 0.008 * Math.sin(x * 9 + seed) * Math.sin(z * 7)) + (pool > 0 ? Math.abs(fold) * 0.012 : 0);
    const nxv = dx > 0 ? Math.sign(x) * dx / Math.max(d, 1e-4) : 0, nzv = dz > 0 ? Math.sign(z) * dz / Math.max(d, 1e-4) : 0;
    const push = out + pool * 0.9;
    const bx = Math.sign(x) * Math.min(Math.abs(x), hx), bz = Math.sign(z) * Math.min(Math.abs(z), hz);
    p.setXYZ(i, bx + nxv * push + (d > 0 ? nxv * 0.005 : 0), Math.max(floor + 0.004, y), bz + nzv * push);
  }
  g.computeVertexNormals();
  return { g, dist };
}

function buildMajar(o) {
  const PW = 1.5, PL = 2.3, PH = 0.32; // platform: across (x, faces the road at +x), along (z, the grave runs north-south)
  const ww = { dirt: 0.55, dirtH: 0.32, dust: 0.12, streak: 0.12, streakFrom: 0, streakTop: PH };
  // the chabutra: a whitewashed brick block, its top coat laid in three patches that never quite matched
  o.box('plaster', PW, PH, PL, 0, PH / 2, 0, LIME, 0, 0, 0, ww);
  for (let i = 0; i < 3; i++) {
    o.box('plaster', PW - 0.02, 0.02, PL / 3 - 0.01, 0, PH + 0.008 + i * 0.002, -PL / 3 + i * PL / 3, new THREE.Color(i === 1 ? LIME_B : LIME).multiplyScalar(0.92 + rnd(i + 3) * 0.08), 0, 0, 0, { dirt: 0, dust: 0.25 });
  }
  // a step on the road side, more worn (darker, dustier) than the platform
  o.box('plaster', 0.32, 0.15, 0.9, PW / 2 + 0.16, 0.075, 0.1, new THREE.Color(LIME).multiplyScalar(0.86), 0, 0, 0, { dirt: 0.7, dirtH: 0.2, dust: 0.4 });
  // chipped corners and edges: the lime gone, brick showing through, set just proud of the face
  const chips = [[1, 1, 0.12], [-1, 1, 0.2], [1, -1, 0.06], [-1, -1, 0.15]];
  chips.forEach(([sx, sz, y0], i) => {
    o.box('plaster', 0.16 + rnd(i) * 0.1, 0.1 + rnd(i + 1) * 0.08, 0.012, sx * (PW / 2 - 0.1), y0 + 0.06, sz * (PL / 2 + 0.003), new THREE.Color(BRICKY).multiplyScalar(0.85 + rnd(i + 2) * 0.2), 0, 0, 0, { dirt: 0.3, dirtH: 0.3 });
    o.box('plaster', 0.012, 0.08 + rnd(i + 4) * 0.07, 0.14 + rnd(i + 5) * 0.1, sx * (PW / 2 + 0.003), y0 + 0.05, sz * (PL / 2 - 0.15), new THREE.Color(BRICKY).multiplyScalar(0.8 + rnd(i + 6) * 0.2), 0, 0, 0, { dirt: 0.3, dirtH: 0.3 });
  });
  // the grave mound: a plastered stepped base and a rounded top, longer than it is wide
  const GW = 0.62, GL = 1.55, top0 = PH + 0.02;
  o.box('plaster', GW + 0.12, 0.08, GL + 0.12, 0, top0 + 0.04, -0.05, new THREE.Color(LIME).multiplyScalar(0.95), 0, 0, 0, { dirt: 0.2, dirtH: top0 + 0.1 });
  o.box('plaster', GW, 0.2, GL, 0, top0 + 0.18, -0.05, LIME, 0, 0, 0, { dirt: 0 });
  const crown = new THREE.CylinderGeometry(GW / 2, GW / 2, GL, 12, 1, false, 0, Math.PI); // the x >= 0 half...
  crown.rotateX(Math.PI / 2); crown.rotateZ(Math.PI / 2); crown.scale(1, 0.42, 1); // ...laid along z, turned to face up, flattened
  o.add('plaster', crown, local(0, top0 + 0.28, -0.05), LIME, { dirt: 0 });
  const gTop = top0 + 0.28 + GW / 2 * 0.42;
  // a small headstone at the north (head) end
  o.box('plaster', 0.28, 0.42, 0.08, 0, top0 + 0.21 + 0.08, -0.05 - GL / 2 - 0.02, LIME, 0, 0, 0, { dirt: 0.15, dirtH: top0 + 0.3 });
  o.add('plaster', new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10, 1, false, -Math.PI / 2, Math.PI), local(0, top0 + 0.5, -0.05 - GL / 2 - 0.02, -Math.PI / 2, 0, 0), LIME, { dirt: 0 });

  // the lamp niche (chiraghdan) at the head corner, soot-blackened above the lamp
  const NX = -0.42, NZ = -PL / 2 + 0.2;
  o.box('plaster', 0.44, 0.6, 0.3, NX, PH + 0.3, NZ, LIME, 0, 0, 0, { dirt: 0.25, dirtH: PH + 0.2, streak: 0.15, streakFrom: PH, streakTop: PH + 0.6 });
  o.box('plaster', 0.24, 0.26, 0.012, NX, PH + 0.28, NZ + 0.152, 0x4a4038, 0, 0, 0, { dirt: 0 }); // the niche's shadowed back, seen through its mouth
  o.add('plaster', new THREE.CylinderGeometry(0.12, 0.12, 0.013, 10, 1, false, -Math.PI / 2, Math.PI), local(NX, PH + 0.41, NZ + 0.153, -Math.PI / 2, 0, 0), 0x4a4038, { dirt: 0 });
  o.box('plaster', 0.2, 0.22, 0.008, NX, PH + 0.5, NZ + 0.156, SOOT, 0, 0, 0, { dirt: 0 }); // soot licked up over the arch
  o.box('plaster', 0.5, 0.04, 0.34, NX, PH + 0.62, NZ, new THREE.Color(LIME).multiplyScalar(0.9), 0, 0, 0, { dirt: 0, dust: 0.3 }); // a coping slab

  // diyas: shallow clay saucers, oil-dark inside; one in the niche, a row on the platform edge, one tipped over
  const diya = (x, y, z, tilt, k) => {
    const c = new THREE.Color(CLAY).multiplyScalar(0.85 + rnd(k) * 0.25);
    o.cyl('plaster', 0.05, 0.034, 0.028, 9, x, y + 0.014, z, c, tilt, rnd(k + 1) * 3, 0, { dirt: 0, dust: 0.05 });
    o.cyl('plaster', 0.04, 0.04, 0.004, 9, x, y + 0.027, z, rnd(k + 2) < 0.5 ? 0x3a3026 : 0x5a4628, tilt, 0, 0, { dirt: 0 });
  };
  diya(NX, PH + 0.155, NZ + 0.06, 0, 1);
  [[0.48, -0.95], [0.56, -0.8], [0.5, -0.62], [0.6, 0.85]].forEach(([x, z], i) => diya(x, PH + 0.02, z, 0, 10 + i));
  diya(0.36, PH + 0.04, 0.98, 1.2, 20); // knocked on its side
  // soot and oil stains under the diya row
  o.box('plaster', 0.22, 0.004, 0.45, 0.53, PH + 0.019, -0.8, 0x7a7262, 0, 0, 0, { dirt: 0 });
  // two small water matkas at the foot and an incense pot with sticks
  const matka = (x, z, s, k) => {
    const c = new THREE.Color(rnd(k) < 0.5 ? CLAY : CLAY_D).multiplyScalar(0.9 + rnd(k + 1) * 0.15);
    o.add('plaster', new THREE.SphereGeometry(0.11 * s, 10, 7), new THREE.Matrix4().compose(new THREE.Vector3(x, PH + 0.02 + 0.09 * s, z), new THREE.Quaternion(), new THREE.Vector3(1, 0.85, 1)), c, { dirt: 0.4, dirtH: PH + 0.08, dust: 0.1 });
    o.cyl('plaster', 0.045 * s, 0.06 * s, 0.05 * s, 9, x, PH + 0.02 + 0.19 * s, z, c, 0, 0, 0, { dirt: 0 });
    o.cyl('plaster', 0.06 * s, 0.05 * s, 0.015, 9, x, PH + 0.02 + 0.22 * s, z, new THREE.Color(c).multiplyScalar(1.08), 0, 0, 0, { dirt: 0 }); // lip
  };
  matka(-0.5, 0.9, 1, 31);
  matka(-0.3, 1.0, 0.8, 37);
  o.cyl('plaster', 0.05, 0.04, 0.07, 8, 0.12, PH + 0.055, -1.0, CLAY_D, 0, 0, 0, { dirt: 0 });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7, lean = 0.12 + rnd(i + 40) * 0.12, h = 0.17 + rnd(i + 41) * 0.06;
    const b = [0.12 + Math.cos(a) * 0.012, PH + 0.08, -1.0 + Math.sin(a) * 0.012];
    const t = [b[0] + Math.cos(a) * lean * h, b[1] + h, b[2] + Math.sin(a) * lean * h];
    o.rod('plaster', 0.0025, b, t, i === 2 ? 0x8a8478 : 0x4a2e22, 3, { dirt: 0 }); // one burnt to grey ash
  }
  // the green pennant on a bamboo pole at the road-side head corner, mannat threads wound round it
  const FX = PW / 2 - 0.12, FZ = -PL / 2 + 0.12, FH = 3.4;
  o.rod('plaster', 0.022, [FX, 0.1, FZ], [FX + 0.05, FH, FZ - 0.03], new THREE.Color(BAMBOO).multiplyScalar(0.92), 6, { dirt: 0.5, dirtH: 0.6, dust: 0.1 });
  return { PW, PL, PH, GW, GL, gTop, top0, flag: [FX + 0.05, FH, FZ - 0.03] };
}

function buildMajarCloth(o, m) {
  const { GW, GL, gTop, top0 } = m;
  // the older chadar underneath: faded maroon, wider and longer, so its hem shows at the head and foot
  const under = drape(GW / 2, GL / 2, gTop - 0.01, m.PH + 0.02, 0.36, 2.1, 0.055);
  under.g.translate(0, 0, -0.05);
  o.add('tarpaulin', under.g, null, faded(0x7a2e2e, 0.3, 5), { dirt: 0.2, dirtH: m.PH + 0.08, dust: 0.2 });
  // the newer green chadar on top, a little shorter, with an ochre gota border band near the hem
  const top = drape(GW / 2, GL / 2 - 0.16, gTop + 0.006, m.PH + 0.03, 0.31, 4.7, 0.045);
  top.g.translate(0, 0, -0.05);
  const g = o.add('tarpaulin', top.g, null, 0x2f6e44, { dirt: 0.1, dirtH: m.PH + 0.06, dust: 0.14 });
  const col = g.attributes.color, gold = new THREE.Color(0xb8933e), c = new THREE.Color();
  // the drape geometry went through toNonIndexed(): map each vertex back to its distance by position
  const p = g.attributes.position, inv = o.world.clone().invert(), v = new THREE.Vector3();
  for (let i = 0; i < col.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(inv);
    const hx = GW / 2, hz = GL / 2 - 0.16;
    const d = Math.hypot(Math.max(0, Math.abs(v.x) - hx), Math.max(0, Math.abs(v.z + 0.05) - hz));
    const fall = Math.min(d, gTop - (m.PH + 0.03)), dropDown = gTop - v.y;
    const t = Math.max(fall, dropDown);
    if (t > 0.17 && t < 0.22) { c.fromArray(col.array, i * 3).lerp(gold, 0.75); c.toArray(col.array, i * 3); }
    else if (d < 0.02 && Math.abs(Math.abs(v.x) - hx * 0.55) < 0.025) { c.fromArray(col.array, i * 3).lerp(gold, 0.5); c.toArray(col.array, i * 3); } // two lines down the top
  }
  col.needsUpdate = true;
  // a marigold strand laid across the chadar, a few loose petals of rose
  const curve = (t) => [Math.sin(t * Math.PI) * 0.06 - 0.03 + (t - 0.5) * 0.06, gTop + 0.03, -0.05 - 0.35 + t * 0.7 + Math.sin(t * 7) * 0.03];
  for (let i = 0; i < 16; i++) {
    const t = i / 15, [x, y, z] = curve(t);
    o.add('tarpaulin', new THREE.OctahedronGeometry(0.026, 0), local(x, y - Math.abs(t - 0.5) * 0.02, z, rnd(i) * 3, rnd(i + 1) * 3, 0), faded(i % 5 === 2 ? 0xc0603a : 0xd88a2e, 0.15, i + 60), { dirt: 0, dust: 0 });
  }
  for (let i = 0; i < 9; i++) {
    const x = (rnd(i + 70) - 0.5) * GW * 0.7, z = -0.05 + (rnd(i + 71) - 0.5) * GL * 0.8;
    o.add('tarpaulin', sheet([[0, 0, 0], [0.025, 0, 0.012], [0.01, 0, 0.03]]), local(x, gTop + 0.012, z, 0, rnd(i + 72) * 6, 0), faded(0x9a2e3a, 0.2, i + 80), { dirt: 0, dust: 0 });
  }
  // the pennant: a green swallow-tail on the pole, a fold of wind in it, and mannat threads round the pole
  const [fx, fh, fz] = m.flag;
  o.add('tarpaulin', sheet([[0, 0, 0], [0, -0.42, 0], [0.38, -0.32, 0.06], [0.3, -0.2, 0.03], [0.48, -0.08, 0.08]]), local(fx, fh - 0.05, fz, 0, 0.9, 0), 0x2f6e44, { dirt: 0, dust: 0.05 });
  [[1.15, 0x9a3a34], [1.2, 0xb08a3a], [1.24, 0x9a3a34], [1.3, 0x2f6e44], [1.36, 0xa04a40]].forEach(([y, tint], i) => {
    o.add('tarpaulin', new THREE.CylinderGeometry(0.027, 0.027, 0.014, 8), local(fx - 0.05 * (1 - y / fh), y, fz + 0.03 * (y / fh), 0, 0, (rnd(i + 90) - 0.5) * 0.2), faded(tint, 0.2, i + 91), { dirt: 0, dust: 0.05 });
  });
  // two thread ends hanging loose
  o.rod('tarpaulin', 0.003, [fx - 0.02, 1.3, fz + 0.02], [fx - 0.06, 1.05, fz + 0.06], 0x9a3a34, 3, { dirt: 0 });
  o.rod('tarpaulin', 0.003, [fx - 0.02, 1.24, fz - 0.02], [fx + 0.02, 1.02, fz - 0.05], 0xb08a3a, 3, { dirt: 0 });
}

// ---------------------------------------------------------------------------------------------------------------- create
/** The transformer line's first span, outer conductor: a point on it, recomputed exactly as src/villageFurniture2.js builds it. */
function transformerWirePoint() {
  const sp = FURNITURE2_SPOTS.transformer, W0 = sp && ANCHORS[sp.at] && spotMatrix(sp);
  if (!W0) return null;
  const sc = 0.97 + rnd(211) * 0.08, W = W0.clone().multiply(new THREE.Matrix4().makeScale(sc, sc, sc)); // villageFurniture2's per-object scale (seed 211)
  const top = (i, px, pz) => { const hgt = 8.2 + rnd(i + 3) * 0.6, lean = (rnd(i + 8) - 0.5) * 0.06; return [px + lean * hgt - 0.8, hgt - 0.2 + 0.12, pz]; };
  const A = top(0, -4.5, -3.2), B = top(1, -0.2, -3.6), sag = 0.3 + rnd(0) * 0.15, t = 3 / 7;
  const p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t - Math.sin(t * Math.PI) * sag, A[2] + (B[2] - A[2]) * t];
  return { p: new THREE.Vector3(...p).applyMatrix4(W), yaw: Math.atan2(W0.elements[8], W0.elements[10]) };
}

export function createVillageFurniture4(scene) {
  const group = new THREE.Group(); group.name = 'village_furniture4';
  const report = [];

  // 1. the roadside majar: plaster pieces in one batch (local), its cloth into the shared cloth batch with the kites
  const cloth = new Batch();
  const mw = ANCHORS.johad && spotMatrix(FURNITURE4_SPOTS.majar);
  if (mw) {
    const stone = new Batch();
    const o = new Obj(stone, mw, 113, { dirt: 0.4, dust: 0.12 });
    const m = buildMajar(o);
    const oc = new Obj(cloth, mw, 127, { dirt: 0.1, dust: 0.1 });
    buildMajarCloth(oc, m);
    stone.flush(group, 'furniture4_');
    // (no explicit userData.colliderBoxes: with it the cart drive test failed at an unrelated box; the plaster mesh is picked up as a solid anyway)
    const p = new THREE.Vector3().setFromMatrixPosition(mw);
    report.push({ kind: 'majar', x: +p.x.toFixed(2), z: +p.z.toFixed(2), tris: Math.round(o.tris + oc.tris) });
  }

  // 2. kites snagged in trees and on the transformer wire
  const ok = new Obj(cloth, new THREE.Matrix4(), 151, { dirt: 0, dust: 0.08 });
  let n = 0;
  for (const tree of TREE_KITES) {
    const a = ANCHORS[tree.at];
    if (!a) continue;
    const tx = a.x + tree.tx, tz = a.z + tree.tz;
    for (const k of tree.kites) {
      const seed = 200 + n * 17;
      const px = tx + Math.cos(k.ang) * k.r, pz = tz + Math.sin(k.ang) * k.r;
      // face outward from the trunk so it reads from the lane, tipped and rolled the way it fell into the leaves
      const yaw = Math.atan2(Math.cos(k.ang), Math.sin(k.ang)) + (rnd(seed + 1) - 0.5) * 0.6;
      const K = kiteFrame([px, k.y, pz], yaw, (rnd(seed + 2) - 0.5) * 0.7, (rnd(seed + 3) - 0.5) * 1.4 + (k.v === 'crumpled' ? 0.9 : 0));
      // the manjha caught on a branch further in and higher up
      const snag = [tx + Math.cos(k.ang + 0.4) * k.r * 0.6, k.y + 0.5 + rnd(seed + 4) * 0.4, tz + Math.sin(k.ang + 0.4) * k.r * 0.6];
      const before = ok.tris;
      buildKite(ok, K, k, seed, snag);
      report.push({ kind: `kite_${k.v}`, tree: tree.at, x: +px.toFixed(2), y: k.y, z: +pz.toFixed(2), tris: Math.round(ok.tris - before) });
      n++;
    }
  }
  const wire = transformerWirePoint();
  if (wire) {
    const hang = 0.45, P = wire.p;
    const K = kiteFrame([P.x, P.y - hang - 0.3, P.z], wire.yaw + 0.3, 0.25, -0.5);
    const before = ok.tris;
    buildKite(ok, K, { v: 'torn', c: [0xb54d6a, 0x4f7ca6], tail: 0xd6c48a }, 977, [P.x, P.y, P.z]);
    report.push({ kind: 'kite_wire', x: +P.x.toFixed(2), y: +(P.y - hang).toFixed(2), z: +P.z.toFixed(2), tris: Math.round(ok.tris - before) });
  }
  const cm = cloth.flush(group, 'furniture4_cloth_');
  for (const mesh of Object.values(cm)) { mesh.castShadow = true; mesh.receiveShadow = true; }

  scene.add(group);
  if (typeof window !== 'undefined') window.__furniture4 = { items: report, meshes: group.children.length, tris: report.reduce((s, r) => s + r.tris, 0) };
  return { group };
}
