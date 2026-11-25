import * as THREE from 'three';
import { Parts } from './landInstancing.js';

/**
 * Map objects: the designs (S7, map objects agent). Every design is real geometry on the shared library sets only
 * (brick, plaster, concrete, wood, metal, rust, terracotta, jute, tarpaulin), UVs in metres per the library's own
 * tile sizes, colour by vertex tint (a multiplier over the photo texture, never a flat colour). Local frame: ground at
 * y 0, front on +z, metres. Each builder fills a Parts (src/kit/landInstancing.js) and returns nothing; the batch turns
 * it into one geometry per material.
 */
export const TILES = { brick: 1.2, plaster: 1.5, concrete: 1.0, wood: 1.0, metal: 1.0, rust: 1.0, terracotta: 0.6, jute: 0.5, tarpaulin: 1.0 };
export const MATS = Object.keys(TILES);

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), ONE = new THREE.Vector3(1, 1, 1);
const h01 = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/** square-section bar from a to b (angle iron, bamboo, rails) */
function rod(P, mat, a, b, r, color) {
  _a.set(...a); _b.set(...b); _d.subVectors(_b, _a);
  const len = _d.length();
  _q.setFromUnitVectors(UP, _d.normalize());
  const M = new THREE.Matrix4().compose(_a.clone().add(_b).multiplyScalar(0.5), _q, ONE);
  P.box(mat, 0, 0, 0, r * 2, len, r * 2, { color, matrix: M });
}
/** round pipe / pole from a to b */
function pipe(P, mat, a, b, r, color, seg = 8, r1 = r) {
  _a.set(...a); _b.set(...b); _d.subVectors(_b, _a);
  const len = _d.length();
  _q.setFromUnitVectors(UP, _d.normalize());
  P.cyl(mat, 0, 0, 0, r, r1, len, { color, seg, matrix: new THREE.Matrix4().compose(_a.clone(), _q, ONE), cap: true });
}
/** box tilted about its own x axis (rx) then turned ry, centred at (x, y, z) */
function tbox(P, mat, x, y, z, sx, sy, sz, { rx = 0, ry = 0, rz = 0, color = 0xffffff } = {}) {
  const M = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), ONE);
  P.box(mat, 0, 0, 0, sx, sy, sz, { color, matrix: M });
}

// ---------------------------------------------------------------------------------------------------------- colours
const BRICK = 0xe2d0c0, CEMENT = 0xd2ccbe, CEMENT_OLD = 0xb8b2a4, STEEL = 0xb4b8b8, IRON = 0x6a6560, PAINT_BLUE = 0x7c9a98;
const BAMBOO = 0xd2b980, BAMBOO_OLD = 0xa89468, WOOD_DARK = 0x8a6a48, ROPE = 0xd6c094, CLOTH = 0xdcd2bc, CLAY = 0xb87a58, STONE = 0xc9bca0;

// ------------------------------------------------------------------------------------------------- tubewell pump room
/** 3.2 m brick pump room on a plinth, steel door in a real opening (frame, ribs, hinges, hasp), grilled window with sill,
 *  RCC roof slab, meter box and service wire, outlet pipe on +x pouring into a small brick hauz whose weir lets the water
 *  out into the field channel. `door` = +1 (door on +z) or -1 (on -z). */
export function tubewell(P, { door = 1 } = {}) {
  const s = door, H0 = 0.24, H = 2.3, T = 0.23, half = 1.6;
  P.box('concrete', 0, H0 / 2, 0, 3.5, H0, 3.5, { color: CEMENT });
  const y = H0 + H / 2;
  P.box('brick', 0, y, -s * (half - T / 2), 3.2, H, T, { color: BRICK });                    // back wall
  for (const sx of [-1, 1]) P.box('brick', sx * (half - T / 2), y, 0, T, H, 3.2 - 2 * T, { color: BRICK }); // sides
  // front wall round a 0.9 x 1.95 door opening at x -0.6
  const dx = -0.6, dw = 0.9, dh = 1.95, fz = s * (half - T / 2);
  P.box('brick', (-half + dx - dw / 2) / 2, y, fz, dx - dw / 2 + half, H, T, { color: BRICK });
  P.box('brick', (half + dx + dw / 2) / 2, y, fz, half - dx - dw / 2, H, T, { color: BRICK });
  P.box('brick', dx, H0 + dh + (H - dh) / 2, fz, dw, H - dh, T, { color: BRICK });
  P.box('concrete', dx, H0 + dh + 0.07, s * half, dw + 0.5, 0.14, 0.06, { color: CEMENT_OLD }); // lintel face
  // cement plaster dado on the lower metre (sides and back), the bricks above left bare
  P.box('plaster', 0, H0 + 0.5, -s * (half + 0.012), 3.22, 1.0, 0.024, { color: 0xd8d2c6 });
  for (const sx of [-1, 1]) P.box('plaster', sx * (half + 0.012), H0 + 0.5, 0, 0.024, 1.0, 3.22, { color: 0xd8d2c6 });
  // door: angle-iron frame in the opening, the leaf set 0.14 m back (a real recess), two pressed ribs, hinges, hasp + lock
  const fy = H0 + dh / 2, iz = s * (half - 0.03);
  P.box('metal', dx - dw / 2 + 0.025, fy, iz, 0.05, dh, 0.06, { color: IRON });
  P.box('metal', dx + dw / 2 - 0.025, fy, iz, 0.05, dh, 0.06, { color: IRON });
  P.box('metal', dx, H0 + dh - 0.025, iz, dw, 0.05, 0.06, { color: IRON });
  const lz = s * (half - 0.16);
  P.box('rust', dx, fy, lz, dw - 0.1, dh - 0.06, 0.035, { color: PAINT_BLUE });
  for (const yy of [0.55, 1.35]) P.box('rust', dx, H0 + yy, lz + s * 0.025, dw - 0.2, 0.06, 0.02, { color: PAINT_BLUE });
  for (const yy of [0.3, 1.6]) P.box('metal', dx - dw / 2 + 0.08, H0 + yy, lz + s * 0.03, 0.12, 0.05, 0.02, { color: IRON });
  P.box('metal', dx + dw / 2 - 0.12, H0 + 1.0, lz + s * 0.035, 0.08, 0.12, 0.03, { color: 0x4a4440 });
  P.box('metal', dx, H0 + 0.02, s * (half + 0.1), dw + 0.1, 0.04, 0.3, { color: CEMENT_OLD }); // threshold step
  // window on -x: dark recess, wooden frame, five iron bars, cement sill and a small sunshade
  const wx = -half - 0.005;
  P.box('wood', wx + 0.06, H0 + 1.55, 0.2, 0.02, 0.5, 0.7, { color: 0x2a2420 });
  for (const [yy, hh] of [[1.31, 0.05], [1.79, 0.05]]) P.box('wood', wx - 0.02, H0 + yy, 0.2, 0.06, hh, 0.78, { color: WOOD_DARK });
  for (const zz of [-0.17, 0.57]) P.box('wood', wx - 0.02, H0 + 1.55, zz, 0.06, 0.53, 0.05, { color: WOOD_DARK });
  for (let k = 0; k < 5; k++) P.box('metal', wx - 0.01, H0 + 1.55, -0.07 + k * 0.135, 0.018, 0.48, 0.018, { color: IRON });
  P.box('concrete', wx - 0.05, H0 + 1.26, 0.2, 0.12, 0.05, 0.9, { color: CEMENT });
  P.box('concrete', wx - 0.16, H0 + 1.9, 0.2, 0.34, 0.05, 0.95, { color: CEMENT_OLD });
  // roof slab with a drip edge, a cement patch
  P.box('concrete', 0, H0 + H + 0.08, 0, 3.6, 0.16, 3.6, { color: CEMENT_OLD });
  P.box('concrete', 0.6, H0 + H + 0.165, -0.4, 1.1, 0.01, 0.8, { color: 0xc8c2b4 });
  // meter box and the service wire up over the parapet to the pole behind
  P.box('metal', 0.85, H0 + 1.75, s * (half + 0.08), 0.32, 0.42, 0.14, { color: 0x8a8e84 });
  rod(P, 'metal', [0.85, H0 + 1.96, s * (half + 0.08)], [0.85, H0 + H + 0.2, s * (half + 0.04)], 0.01, 0x2a2826);
  const pole = [-2.5, 0, -s * 1.3];
  pipe(P, 'concrete', pole, [pole[0], 6.6, pole[2]], 0.11, CEMENT_OLD, 6, 0.07);
  P.box('metal', pole[0], 6.2, pole[2], 0.9, 0.07, 0.07, { color: IRON });
  for (const k of [-1, 1]) pipe(P, 'terracotta', [pole[0] + k * 0.35, 6.23, pole[2]], [pole[0] + k * 0.35, 6.4, pole[2]], 0.04, 0x8a5a44, 6, 0.03);
  for (let k = 0; k < 6; k++) { // sagging service wire, pole -> roof
    const t0 = k / 6, t1 = (k + 1) / 6, A = [-1.5, H0 + H + 0.25, -s * 0.8], B = [pole[0] + 0.35, 6.3, pole[2]];
    const at = (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t - Math.sin(t * Math.PI) * 0.35, A[2] + (B[2] - A[2]) * t];
    rod(P, 'metal', at(t0), at(t1), 0.008, 0x262422);
  }
  // outlet: 4" pipe out of the +x wall with a flange and a bend down, over the hauz
  pipe(P, 'metal', [half - 0.05, 0.95, 0], [2.15, 0.95, 0], 0.075, 0x7a7670, 10);
  pipe(P, 'metal', [half + 0.02, 0.95, 0], [half + 0.07, 0.95, 0], 0.11, 0x6a6660, 10);
  pipe(P, 'metal', [2.12, 0.95, 0], [2.2, 0.86, 0], 0.075, 0x7a7670, 10);
  // hauz: brick tank 1.3 x 1.2, cement coping, a low weir on the channel side
  const hx0 = half, hx1 = 2.9, hz = 0.6, hh = 0.55, t = 0.12;
  for (const sz of [-1, 1]) P.box('brick', (hx0 + hx1) / 2, hh / 2, sz * (hz - t / 2), hx1 - hx0, hh, t, { color: BRICK });
  P.box('brick', hx1 - t / 2, 0.15, 0, t, 0.3, 2 * hz - 2 * t, { color: BRICK });
  P.box('concrete', (hx0 + hx1) / 2, 0.03, 0, hx1 - hx0, 0.06, 2 * hz, { color: 0x7a7a68 });
  for (const sz of [-1, 1]) P.box('concrete', (hx0 + hx1) / 2, hh + 0.025, sz * (hz - t / 2), hx1 - hx0 + 0.04, 0.05, t + 0.06, { color: CEMENT });
  P.box('concrete', hx1 - t / 2, 0.32, 0, t + 0.06, 0.04, 2 * hz - 2 * t, { color: CEMENT });
  // a steel bucket upside down on the coping, a rubber chappal's worth of daily use: a folded jute sack on the plinth
  P.cyl('metal', hx0 + 0.45, hh + 0.05, -hz + 0.06, 0.13, 0.16, 0.26, { seg: 10, color: 0xa8aaa8 });
  P.box('jute', dx + 0.9, H0 + 0.03, s * (half + 0.45), 0.6, 0.05, 0.4, { color: 0xc8b48a, ry: 0.3 });
}

// ------------------------------------------------------------------------------------------------------ mobile tower
/** 30 m four-legged lattice tower (galvanised angle iron, X-braced panels), antenna sectors, two dishes, platform,
 *  cable ladder, aviation lamp; on a concrete pad in a 5 x 5 m compound of RCC posts and barbed wire with a mesh gate,
 *  and the equipment cabinet. */
export function tower(P) {
  P.box('concrete', 0, 0.075, 0, 4.9, 0.15, 4.9, { color: CEMENT_OLD });
  const posts = [];
  for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) {
    const t = -2.35 + j * 2.35, c = [[t, -2.35], [2.35, t], [-t, 2.35], [-2.35, -t]][k];
    posts.push(c);
  }
  for (const [x, z] of posts) P.box('concrete', x, 1.05, z, 0.12, 1.8, 0.12, { color: CEMENT });
  for (const [x, z] of posts) tbox(P, 'concrete', x, 2.05, z, 0.1, 0.35, 0.1, { rx: 0.5, ry: Math.atan2(x, z), color: CEMENT }); // cranked tops
  const E = 2.35;
  for (const y of [0.45, 0.95, 1.45, 1.85]) {
    rod(P, 'metal', [-E, y, -E], [E, y, -E], 0.006, 0x5a5652);
    rod(P, 'metal', [E, y, -E], [E, y, E], 0.006, 0x5a5652);
    rod(P, 'metal', [-E, y, E], [-E, y, -E], 0.006, 0x5a5652);
    rod(P, 'metal', [-E, y, E], [-0.7, y, E], 0.006, 0x5a5652);
    rod(P, 'metal', [0.7, y, E], [E, y, E], 0.006, 0x5a5652);
  }
  // mesh gate on the front
  for (const x of [-0.65, 0.65]) P.box('rust', x, 0.95, E, 0.05, 1.7, 0.05, { color: 0x6a7068 });
  for (const y of [0.15, 1.75]) P.box('rust', 0, y, E, 1.3, 0.04, 0.04, { color: 0x6a7068 });
  for (let k = 0; k < 7; k++) P.box('rust', -0.54 + k * 0.18, 0.95, E, 0.012, 1.58, 0.012, { color: 0x6a7068 });
  // lattice: legs from 2.2 m square at the foot to 0.7 m at the top, 10 panels, horizontals + X bracing
  const N = 10, Htop = 30, foot = 1.1, top = 0.35;
  const at = (y) => foot + (top - foot) * (y / Htop);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rod(P, 'metal', [sx * foot, 0.15, sz * foot], [sx * top, Htop, sz * top], 0.055, STEEL);
  for (let i = 0; i < N; i++) {
    const y0 = 0.15 + (Htop - 0.15) * (i / N), y1 = 0.15 + (Htop - 0.15) * ((i + 1) / N), a0 = at(y0), a1 = at(y1);
    const faces = [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]];
    for (const [[ax, az], [bx, bz]] of faces) {
      rod(P, 'metal', [ax * a1, y1, az * a1], [bx * a1, y1, bz * a1], 0.03, STEEL);
      rod(P, 'metal', [ax * a0, y0, az * a0], [bx * a1, y1, bz * a1], 0.022, STEEL);
      rod(P, 'metal', [bx * a0, y0, bz * a0], [ax * a1, y1, az * a1], 0.022, STEEL);
    }
  }
  // cable ladder down the front-right leg
  rod(P, 'rust', [0.95, 0.3, 0.75], [0.3, 27, 0.2], 0.05, 0x7a7a74);
  // platform + rail at 27.2 m, antenna sectors at 28.6 m, dishes at 24 m, lightning rod and lamp on top
  const pa = at(27.2);
  P.box('metal', 0, 27.2, 0, 2 * pa + 0.9, 0.06, 2 * pa + 0.9, { color: 0x8e9290 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) rod(P, 'metal', [sx * (pa + 0.45), 27.2, sz * (pa + 0.45)], [sx * (pa + 0.45), 28.2, sz * (pa + 0.45)], 0.025, STEEL);
  for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) rod(P, 'metal', [a[0] * (pa + 0.45), 28.2, a[1] * (pa + 0.45)], [b[0] * (pa + 0.45), 28.2, b[1] * (pa + 0.45)], 0.02, STEEL);
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * Math.PI * 2 + 0.3, cx = Math.sin(ang) * (pa + 0.55), cz = Math.cos(ang) * (pa + 0.55);
    for (const off of [-0.32, 0.32]) {
      const ox = Math.cos(ang) * off, oz = -Math.sin(ang) * off;
      pipe(P, 'metal', [cx + ox, 27.3, cz + oz], [cx + ox, 30.1, cz + oz], 0.035, STEEL, 6);
      tbox(P, 'metal', cx + ox + Math.sin(ang) * 0.12, 28.8, cz + oz + Math.cos(ang) * 0.12, 0.28, 1.5, 0.11, { ry: ang, color: 0xd8dad4 });
    }
  }
  for (const [ang, y] of [[1.2, 24.2], [3.9, 22.6]]) {
    const cx = Math.sin(ang) * (at(y) + 0.3), cz = Math.cos(ang) * (at(y) + 0.3);
    const M = new THREE.Matrix4().compose(new THREE.Vector3(cx, y, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, ang, 0, 'YXZ')), ONE);
    P.cyl('metal', 0, -0.08, 0, 0.36, 0.3, 0.16, { seg: 14, color: 0xdcdcd6, matrix: M });
  }
  pipe(P, 'metal', [0, Htop, 0], [0, Htop + 1.6, 0], 0.02, STEEL, 6);
  P.box('metal', 0.12, Htop + 0.15, 0, 0.12, 0.16, 0.12, { color: 0xb03a2c });
  // equipment cabinet on its plinth, with a cable run to the ladder
  P.box('concrete', 1.75, 0.25, 1.55, 0.95, 0.2, 1.3, { color: CEMENT });
  P.box('metal', 1.75, 1.15, 1.55, 0.8, 1.6, 1.1, { color: 0xc8cac2 });
  P.box('metal', 1.34, 1.15, 1.55, 0.02, 1.4, 0.9, { color: 0xb4b6ae });
  P.box('metal', 1.33, 1.2, 1.25, 0.03, 0.12, 0.03, { color: 0x3a3836 });
  rod(P, 'rust', [1.5, 1.95, 1.2], [0.95, 2.1, 0.75], 0.04, 0x6a6a64);
}

// ------------------------------------------------------------------------------------------------------- transformer
/** pad-mounted distribution transformer: concrete plinth with a step, tank with cooling fins and conservator drum,
 *  HT/LT bushings, fuse box, earth strip; angle-iron fence; an RCC pole behind with crossarm, insulators and drop wires. */
export function transformer(P, { w = 2.5, d = 2 } = {}) {
  P.box('concrete', 0, 0.22, -0.1, 1.6, 0.44, 1.2, { color: CEMENT_OLD });
  P.box('concrete', 0, 0.1, 0.6, 0.8, 0.2, 0.3, { color: CEMENT_OLD });
  P.box('metal', 0, 0.98, -0.1, 1.1, 1.08, 0.72, { color: 0x6d7176 });
  P.box('metal', 0, 1.55, -0.1, 1.18, 0.05, 0.8, { color: 0x4c4e50 });
  P.cyl('metal', 0, 0, 0, 0.12, 0.12, 0.95, { seg: 12, color: 0x6d7176, matrix: new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(0.48, 1.75, -0.35) });
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) P.box('metal', sx * 0.64, 0.95, -0.38 + k * 0.14, 0.16, 0.86, 0.022, { color: 0x4c4e50 });
  for (let k = -1; k <= 1; k++) {
    pipe(P, 'terracotta', [k * 0.32, 1.57, 0.05], [k * 0.32, 1.92, 0.05], 0.055, 0x7a5040, 8, 0.04);
    pipe(P, 'terracotta', [k * 0.22, 1.2, 0.26], [k * 0.22, 1.2, 0.42], 0.035, 0x7a5040, 8);
  }
  P.box('metal', -0.38, 0.85, 0.32, 0.34, 0.3, 0.14, { color: 0x5a6a58 });
  rod(P, 'metal', [0.5, 0.45, 0.25], [0.75, 0.0, 0.5], 0.012, 0x7a5a30);
  // fence (angle iron) round the plinth, open at the step
  const fx = w / 2 - 0.08, fz = d / 2 - 0.08;
  for (const [px, pz] of [[-fx, -fz], [fx, -fz], [-fx, fz], [fx, fz]]) P.box('metal', px, 0.95, pz, 0.06, 1.9, 0.06, { color: IRON });
  for (const h of [0.45, 1.0, 1.55]) {
    P.box('metal', 0, h, -fz, 2 * fx, 0.03, 0.03, { color: IRON });
    for (const sx of [-1, 1]) P.box('metal', sx * fx, h, 0, 0.03, 0.03, 2 * fz, { color: IRON });
    for (const sx of [-1, 1]) P.box('metal', sx * (fx - 0.3), h, fz, 0.6, 0.03, 0.03, { color: IRON });
  }
  P.box('metal', fx - 0.3, 1.25, fz + 0.02, 0.3, 0.22, 0.01, { color: 0xb84a34 }); // plain red danger plate (no lettering)
  // pole and line
  const pz = -fz - 0.25;
  pipe(P, 'concrete', [0, 0, pz], [0, 8.2, pz], 0.13, CEMENT_OLD, 6, 0.08);
  P.box('metal', 0, 7.7, pz, 1.6, 0.08, 0.08, { color: IRON });
  for (const k of [-0.7, 0, 0.7]) {
    pipe(P, 'terracotta', [k, 7.74, pz], [k, 7.98, pz], 0.045, 0x8a5a44, 6, 0.03);
    rod(P, 'metal', [k, 7.98, pz], [k * 0.46, 1.92, 0.05], 0.009, 0x2a2826);
  }
}

// ------------------------------------------------------------------------------------------------------ notice board
/** two square steel posts in concrete footings, a framed board (its painted face is the signs layer), a tin hood */
export function notice(P) {
  for (const x of [-0.92, 0.92]) {
    P.box('concrete', x, 0.06, 0, 0.3, 0.12, 0.3, { color: CEMENT_OLD });
    P.box('metal', x, 1.12, -0.02, 0.07, 2.1, 0.07, { color: 0x5e7a6a });
  }
  P.box('metal', 0, 1.55, -0.05, 1.86, 1.24, 0.03, { color: 0x6a7a70 });       // backing plate
  P.box('wood', 0, 2.2, 0, 1.96, 0.06, 0.08, { color: WOOD_DARK });             // frame
  P.box('wood', 0, 0.9, 0, 1.96, 0.06, 0.08, { color: WOOD_DARK });
  for (const x of [-0.95, 0.95]) P.box('wood', x, 1.55, 0, 0.06, 1.36, 0.08, { color: WOOD_DARK });
  tbox(P, 'rust', 0, 2.33, 0.08, 2.15, 0.025, 0.42, { rx: 0.35, color: 0x8a9a96 }); // tin hood
}

// ----------------------------------------------------------------------------------------------------- cattle trough
export function trough(P, { w = 3.2, d = 0.9 } = {}) {
  const h = 0.55, t = 0.12;
  P.box('concrete', 0, 0.05, 0, w, 0.1, d, { color: CEMENT_OLD });
  for (const sz of [-1, 1]) P.box('concrete', 0, h / 2, sz * (d / 2 - t / 2), w, h, t, { color: 0xbab4a4 });
  for (const sx of [-1, 1]) P.box('concrete', sx * (w / 2 - t / 2), h / 2, 0, t, h, d - 2 * t, { color: 0xbab4a4 });
  for (const sz of [-1, 1]) P.box('concrete', 0, 0.26, sz * (d / 2 - t - 0.006), w - 2 * t, 0.34, 0.012, { color: 0x8c9a70 }); // green water line inside
  P.box('concrete', 0.6, h + 0.004, d / 2 - t / 2, 0.5, 0.008, t, { color: 0xa8a294 }); // chipped, re-patched rim
  // khoonta (tethering peg) with a rope coil, chopped straw spilled by the trough
  pipe(P, 'wood', [-w / 2 - 0.6, 0, d / 2 + 0.4], [-w / 2 - 0.6, 0.55, d / 2 + 0.42], 0.045, WOOD_DARK, 7, 0.035);
  P.cyl('jute', -w / 2 - 0.6, 0.38, d / 2 + 0.42, 0.09, 0.09, 0.05, { seg: 8, color: ROPE });
  P.box('jute', w / 2 + 0.3, 0.015, 0.1, 0.7, 0.03, 0.5, { color: 0xc8b47a, ry: 0.4 });
}

// ------------------------------------------------------------------------------------------------------------ machan
/** watch platform: four bamboo poles lashed with jute, a frame of rails and a slatted floor at 2.1 m, X braces,
 *  a thatch canopy on top, a lashed bamboo ladder */
export function machan(P, { seed = 1 } = {}) {
  const e = 0.95, fy = 2.1;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    pipe(P, 'wood', [sx * (e + 0.06), 0, sz * (e + 0.06)], [sx * e, 3.05, sz * e], 0.05, h01(sx + seed, sz) < 0.5 ? BAMBOO : BAMBOO_OLD, 7, 0.04);
    P.cyl('jute', sx * e, fy - 0.06, sz * e, 0.065, 0.065, 0.12, { seg: 7, color: ROPE });
  }
  for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) {
    pipe(P, 'wood', [a[0] * e, fy, a[1] * e], [b[0] * e, fy, b[1] * e], 0.04, BAMBOO);
    pipe(P, 'wood', [a[0] * e, 2.65, a[1] * e], [b[0] * e, 2.65, b[1] * e], 0.03, BAMBOO_OLD); // hand rail
  }
  for (let k = 0; k < 10; k++) P.box('wood', -0.86 + k * 0.19, fy + 0.05, 0, 0.15, 0.04, 2.0, { color: h01(k, seed) < 0.5 ? 0xb89c6a : 0x9a8058 });
  pipe(P, 'wood', [-e, 0.3, e], [e, fy - 0.1, e], 0.025, BAMBOO_OLD);
  pipe(P, 'wood', [e, 0.3, e], [-e, fy - 0.1, e], 0.025, BAMBOO_OLD);
  pipe(P, 'wood', [-e, 0.3, -e], [-e, fy - 0.1, e], 0.025, BAMBOO_OLD);
  // thatch: two sloping layers of straw on a bamboo ridge
  pipe(P, 'wood', [-1.2, 3.25, 0], [1.2, 3.25, 0], 0.035, BAMBOO);
  for (const sz of [-1, 1]) tbox(P, 'jute', 0, 3.08, sz * 0.62, 2.6, 0.1, 1.45, { rx: sz * 0.42, color: 0xc9ad6e });
  // ladder against the front
  for (const x of [-0.25, 0.25]) pipe(P, 'wood', [x, 0, 1.75], [x, fy + 0.4, e + 0.05], 0.03, BAMBOO);
  for (let k = 1; k <= 6; k++) { const t = k / 7, z = 1.75 + (e + 0.05 - 1.75) * t, y = (fy + 0.4) * t; pipe(P, 'wood', [-0.25, y, z], [0.25, y, z], 0.02, BAMBOO_OLD); }
  P.box('jute', 0.4, fy + 0.1, -0.3, 0.7, 0.06, 0.5, { color: 0xb8a078, ry: 0.4 }); // a folded sack to sit on
}

// --------------------------------------------------------------------------------------------------------- scarecrow
export function scarecrow(P) {
  pipe(P, 'wood', [0, 0, 0], [0, 1.95, 0], 0.03, BAMBOO_OLD, 6);
  pipe(P, 'wood', [-0.75, 1.52, 0], [0.75, 1.56, 0], 0.025, BAMBOO, 6);
  P.cyl('terracotta', 0, 1.86, 0, 0.17, 0.2, 0.3, { seg: 12, color: CLAY });          // upturned matka head
  P.cyl('terracotta', 0, 2.16, 0, 0.12, 0.06, 0.05, { seg: 12, color: 0x9a6248 });
  P.box('terracotta', 0, 2.0, 0.19, 0.2, 0.025, 0.01, { color: 0xe8e2d4 });             // limewash eyes and mouth
  P.cyl('jute', 0, 2.17, 0, 0.3, 0.05, 0.08, { seg: 12, color: 0xb89a62 });            // straw hat
  P.box('jute', 0, 1.2, 0, 0.5, 0.72, 0.16, { color: CLOTH });                           // kurta
  P.box('jute', 0, 1.49, 0, 1.36, 0.22, 0.1, { color: CLOTH });                          // sleeves
  tbox(P, 'jute', 0.72, 1.4, 0.02, 0.12, 0.32, 0.03, { rz: 0.15, color: 0xc8b88e });     // straw poking out of a cuff
  P.box('jute', 0, 0.62, 0, 0.42, 0.5, 0.11, { color: 0x8a7a66 });                       // dhoti
  tbox(P, 'tarpaulin', -0.5, 1.3, 0.02, 0.08, 0.5, 0.01, { rz: -0.1, color: 0xc84a3a });  // a red rag tied on to flap
}

// ------------------------------------------------------------------------------------------------ washing platform
export function washplatform(P, { w = 4, d = 2 } = {}) {
  P.box('concrete', 0, 0.17, 0, w, 0.34, d, { color: CEMENT_OLD });
  for (const sz of [-1, 1]) P.box('concrete', 0, 0.39, sz * (d / 2 - 0.05), w, 0.1, 0.1, { color: CEMENT });
  P.box('concrete', -w / 2 + 0.05, 0.39, 0, 0.1, 0.1, d - 0.2, { color: CEMENT });
  P.box('concrete', w / 2 + 0.2, 0.2, 0, 0.5, 0.05, 0.22, { color: CEMENT }); // drain spout
  for (const sz of [-1, 1]) P.box('concrete', w / 2 + 0.2, 0.25, sz * 0.12, 0.5, 0.06, 0.03, { color: CEMENT });
  P.box('concrete', 0, 0.345, 0, w - 0.3, 0.01, d - 0.3, { color: 0x9a9888 }); // wet, darker floor
  // two washing stones raised at the back on bricks, slanting towards the drain
  for (const x of [-1.0, 0.6]) {
    P.box('brick', x, 0.45, -0.55, 0.22, 0.12, 0.3, { color: BRICK });
    tbox(P, 'concrete', x, 0.46, -0.35, 0.55, 0.08, 0.75, { rx: 0.22, color: STONE });
  }
  // standpipe and tap, a steel bucket, a mug, a folded wet dhoti
  pipe(P, 'metal', [-w / 2 + 0.3, 0.34, -d / 2 + 0.3], [-w / 2 + 0.3, 1.05, -d / 2 + 0.3], 0.025, 0x8a8a84);
  pipe(P, 'metal', [-w / 2 + 0.3, 1.0, -d / 2 + 0.3], [-w / 2 + 0.5, 1.0, -d / 2 + 0.3], 0.022, 0x8a8a84);
  P.box('metal', -w / 2 + 0.3, 1.1, -d / 2 + 0.3, 0.08, 0.06, 0.04, { color: 0x6a6662 });
  P.cyl('metal', -w / 2 + 0.55, 0.35, -d / 2 + 0.35, 0.15, 0.17, 0.3, { seg: 12, color: 0xb0b2b0 });
  P.cyl('metal', 0.2, 0.35, 0.3, 0.05, 0.05, 0.1, { seg: 8, color: 0xa8aaa8 });
  P.box('tarpaulin', 1.2, 0.37, 0.35, 0.6, 0.05, 0.4, { color: 0xe8e4da, ry: 0.2 });
}

// --------------------------------------------------------------------------------------------- barber under a tree
export function barber(P) {
  // wooden chair with arm rests
  for (const [x, z] of [[-0.25, -0.22], [0.25, -0.22], [-0.25, 0.22], [0.25, 0.22]]) P.box('wood', x, 0.23, z, 0.05, 0.46, 0.05, { color: WOOD_DARK });
  P.box('wood', 0, 0.47, 0, 0.56, 0.04, 0.5, { color: 0x9a7a52 });
  for (const x of [-0.25, 0.25]) P.box('wood', x, 0.75, -0.22, 0.05, 0.6, 0.05, { color: WOOD_DARK });
  P.box('wood', 0, 0.85, -0.23, 0.5, 0.22, 0.03, { color: 0x9a7a52 });
  for (const x of [-0.27, 0.27]) P.box('wood', x, 0.66, 0.0, 0.05, 0.04, 0.48, { color: WOOD_DARK });
  P.box('tarpaulin', 0, 0.98, -0.25, 0.42, 0.12, 0.04, { color: 0xeae6dc }); // towel over the back
  // mirror on a post in front of the chair
  pipe(P, 'wood', [0, 0, 0.62], [0, 1.6, 0.62], 0.03, WOOD_DARK, 6);
  P.box('wood', 0, 1.35, 0.6, 0.36, 0.46, 0.03, { color: 0x6a4a30 });
  P.box('metal', 0, 1.35, 0.583, 0.3, 0.4, 0.008, { color: 0xc8d2d4 });
  // stool with the tin box of razors and combs, a steel bowl of water, a stone for sharpening
  for (const [x, z] of [[0.45, 0.25], [0.69, 0.25], [0.45, 0.49], [0.69, 0.49]]) P.box('wood', x, 0.18, z, 0.04, 0.36, 0.04, { color: WOOD_DARK });
  P.box('wood', 0.57, 0.37, 0.37, 0.34, 0.03, 0.34, { color: 0x8a6a48 });
  P.box('rust', 0.55, 0.44, 0.37, 0.24, 0.1, 0.16, { color: 0x8a9a9e });
  P.cyl('metal', 0.66, 0.39, 0.3, 0.06, 0.05, 0.04, { seg: 10, color: 0xb8bab8 });
  P.cyl('metal', -0.4, 0, 0.35, 0.13, 0.15, 0.26, { seg: 10, color: 0xa8aaa8 });
}

// ------------------------------------------------------------------------------------------ resting spot: charpai
export function charpai(P, { seed = 0 } = {}) {
  const L = 1.9, W = 0.95, H = 0.42, fr = h01(seed, 1) < 0.5 ? 0x8a6a48 : 0x9a7a50, rope = h01(seed, 2) < 0.5 ? ROPE : 0xc8a878;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.box('wood', sx * (L / 2 - 0.05), H / 2, sz * (W / 2 - 0.05), 0.075, H, 0.075, { color: fr });
  for (const s of [-1, 1]) { P.box('wood', 0, H - 0.02, s * (W / 2 - 0.05), L, 0.065, 0.06, { color: fr }); P.box('wood', s * (L / 2 - 0.05), H - 0.02, 0, 0.06, 0.065, W - 0.1, { color: fr }); }
  const yAt = (u) => H - 0.01 - 0.03 * (1 - u * u);
  for (let i = 0; i < 7; i++) { const zz = -W / 2 + 0.12 + (i * (W - 0.24)) / 6; P.box('jute', 0, yAt(zz / (W / 2)) + (i % 2 ? 0.004 : -0.004), zz, L - 0.16, 0.014, 0.05, { color: rope }); }
  for (let i = 0; i < 15; i++) { const xx = -L / 2 + 0.12 + (i * (L - 0.24)) / 14; P.box('jute', xx, yAt(xx / (L / 2)) + (i % 2 ? -0.004 : 0.004), 0, 0.05, 0.014, W - 0.16, { color: rope }); }
  if (h01(seed, 3) < 0.6) P.box('tarpaulin', 0.5, H + 0.02, 0.05, 0.6, 0.04, 0.7, { color: h01(seed, 4) < 0.5 ? 0xc8d0d8 : 0xd8c8a8, ry: 0.1 }); // a folded sheet
}
// --------------------------------------------------------------------------------------------- resting spot: bench
export function bench(P) {
  for (const x of [-0.75, 0.75]) P.box('concrete', x, 0.21, 0, 0.14, 0.42, 0.36, { color: CEMENT_OLD });
  P.box('concrete', 0, 0.45, 0, 2.0, 0.07, 0.45, { color: CEMENT });
  P.box('concrete', 0, 0.75, -0.2, 2.0, 0.28, 0.06, { color: CEMENT });
  for (const x of [-0.75, 0.75]) P.box('concrete', x, 0.6, -0.2, 0.1, 0.25, 0.06, { color: CEMENT_OLD });
}

// ----------------------------------------------------------------------------------------- cricket / kabaddi / play
const LIME = 0xf2f0e6;
// lime lines stand a little proud: the painted ground under them is drawn with a polygon offset (shops-land field shader)
const line = (P, x, z, lx, lz, ry = 0) => P.box('plaster', x, 0.04, z, lx, 0.012, lz, { color: LIME, ry, skip: ['ny'] });
export function stumps(P) {
  for (const z of [-0.11, 0, 0.11]) pipe(P, 'wood', [0, 0, z], [0, 0.71, z], 0.018, 0xd8c8a0, 6);
  for (const z of [-0.055, 0.055]) P.box('wood', 0, 0.72, z, 0.022, 0.02, 0.11, { color: 0xd8c8a0 });
}
/** creases of a 20 m pitch along local x: bowling and popping creases at both ends, return creases */
export function creases(P, { len = 20 } = {}) {
  for (const s of [-1, 1]) {
    line(P, s * 9.4, 0, 0.05, 2.64);
    line(P, s * 8.18, 0, 0.05, 3.66);
    for (const zz of [-1.32, 1.32]) line(P, s * 8.8, zz, 1.22 + 0.05, 0.05);
  }
}
export function kabaddiLines(P, { w = 13, d = 10 } = {}) {
  const W = w - 0.6, D = d - 0.6;
  for (const s of [-1, 1]) { line(P, 0, s * D / 2, W, 0.06); line(P, s * W / 2, 0, 0.06, D); }
  line(P, 0, 0, 0.08, D);                             // mid line
  for (const s of [-1, 1]) { line(P, s * 3.0, 0, 0.05, D); line(P, s * 4.0, 0, 0.05, D); } // baulk and bonus lines
  for (const s of [-1, 1]) P.box('jute', s * (W / 2 + 0.25), 0.03, D / 2 - 0.6, 0.5, 0.06, 0.4, { color: 0xb89a62 }); // the dhurries the waiting side sits on
}
export function hopscotch(P) {
  const S = 0.5, cells = [[0, 0], [1, 0], [2, -0.5], [2, 0.5], [3, 0], [4, -0.5], [4, 0.5], [5, 0]];
  for (const [i, j] of cells) {
    const x = i * S, z = j * S;
    line(P, x - S / 2, z, 0.035, S); line(P, x + S / 2, z, 0.035, S);
    line(P, x, z - S / 2, S, 0.035); line(P, x, z + S / 2, S, 0.035);
  }
  P.box('concrete', 1.1, 0.02, 0.6, 0.08, 0.03, 0.06, { color: 0x8a8478, ry: 0.5 }); // the flat stone (gitti)
}
export function swing(P) {
  const C = 0x6a7a8a;
  for (const sx of [-1.3, 1.3]) { pipe(P, 'rust', [sx, 0, -0.75], [sx, 2.4, 0], 0.04, C); pipe(P, 'rust', [sx, 0, 0.75], [sx, 2.4, 0], 0.04, C); }
  pipe(P, 'rust', [-1.4, 2.4, 0], [1.4, 2.4, 0], 0.045, C);
  for (const x of [-0.65, 0.65]) {
    for (const dx of [-0.2, 0.2]) rod(P, 'metal', [x + dx, 2.38, 0], [x + dx, 0.5, 0], 0.006, 0x5a5856);
    P.box('wood', x, 0.48, 0, 0.5, 0.04, 0.2, { color: 0x8a6a48 });
  }
}
export function brickWicket(P) {
  for (let k = 0; k < 4; k++) P.box('brick', 0, 0.04 + k * 0.075, 0, 0.23, 0.075, 0.11, { color: k % 2 ? BRICK : 0xd8c0a8, ry: (k % 2) * 0.08 });
}
export function plotPillar(P) {
  P.box('brick', 0, 0.3, 0, 0.3, 0.6, 0.3, { color: BRICK });
  P.box('plaster', 0, 0.61, 0, 0.32, 0.03, 0.32, { color: 0xf0ece2 });
}

// ---------------------------------------------------------------------------------------------- potter's yard props
export function potterWheel(P) {
  P.cyl('concrete', 0, 0, 0, 0.12, 0.08, 0.15, { seg: 10, color: 0x6a6660 });
  P.cyl('concrete', 0, 0.15, 0, 0.46, 0.46, 0.1, { seg: 20, color: 0x8a8478 });
  P.cyl('terracotta', 0, 0.25, 0, 0.12, 0.09, 0.14, { seg: 12, color: 0x9a6248 });
  P.box('wood', 0, 0.08, -0.75, 0.45, 0.06, 0.3, { color: 0x8a6a48 });          // patla to squat on
  pipe(P, 'wood', [0.55, 0.02, 0.1], [0.4, 0.04, 0.7], 0.02, WOOD_DARK, 6);       // the stick that spins the wheel
  P.cyl('terracotta', -0.6, 0, 0.4, 0.16, 0.2, 0.22, { seg: 12, color: CLAY });  // water pot for wet hands
}
export function kiln(P) {
  P.cyl('brick', 0, 0, 0, 1.3, 1.15, 0.75, { seg: 18, color: 0xc8a890, cap: false });
  P.cyl('concrete', 0, 0.74, 0, 1.16, 1.0, 0.08, { seg: 18, color: 0x5a5650 });   // ash and cow-dung cap
  P.box('concrete', 0, 0.2, 1.25, 0.45, 0.35, 0.12, { color: 0x24201c });         // fire mouth, sooted
  for (let k = 0; k < 6; k++) P.box('terracotta', Math.sin(k * 1.9) * 1.6, 0.03, Math.cos(k * 1.9) * 1.6, 0.18, 0.04, 0.12, { color: CLAY, ry: k }); // shards
}
export function clayHeap(P) {
  P.cyl('terracotta', 0, 0, 0, 0.9, 0.25, 0.5, { seg: 14, color: 0x8a5a40 });
  P.cyl('terracotta', 0.55, 0, 0.3, 0.45, 0.15, 0.3, { seg: 10, color: 0x7a5038 });
  P.box('jute', -0.9, 0.12, -0.3, 0.6, 0.24, 0.4, { color: 0xc4b08a, ry: 0.5 });
}

// ------------------------------------------------------------------------------------------- sugarcane buying centre
export function taraju(P) {
  const top = [0, 2.5, 0];
  for (const a of [0, 2.1, 4.2]) pipe(P, 'wood', [Math.sin(a) * 1.0, 0, Math.cos(a) * 1.0], top, 0.05, WOOD_DARK, 7);
  P.cyl('jute', 0, 2.3, 0, 0.08, 0.08, 0.15, { seg: 7, color: ROPE });
  rod(P, 'metal', [0, 2.3, 0], [0, 2.05, 0], 0.01, 0x3a3836);
  P.box('wood', 0, 2.03, 0, 1.6, 0.06, 0.06, { color: 0x6a4a30 });
  for (const x of [-0.75, 0.75]) {
    for (const dz of [-0.25, 0.25]) rod(P, 'jute', [x, 2.0, 0], [x, 0.62, dz], 0.008, ROPE);
    P.box('wood', x, 0.6, 0, 0.7, 0.04, 0.6, { color: 0x8a6a48 });
  }
  P.cyl('metal', 0.9, 0, 0.7, 0.1, 0.08, 0.14, { seg: 8, color: 0x4a4644 });     // iron weights
  P.cyl('metal', 1.1, 0, 0.65, 0.07, 0.06, 0.1, { seg: 8, color: 0x4a4644 });
}
export function caneHeap(P, { seed = 0 } = {}) {
  let k = 0;
  for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 6 - layer; i++) {
    const z = (i - (5 - layer) / 2) * 0.26, y = 0.12 + layer * 0.22, sk = h01(k++, seed);
    const col = sk < 0.4 ? 0xb8a35a : sk < 0.75 ? 0x9a9a52 : 0xa88a58;
    pipe(P, 'wood', [-1.4 + sk * 0.2, y, z], [1.4 + sk * 0.2, y + (sk - 0.5) * 0.06, z + (sk - 0.5) * 0.1], 0.12, col, 6);
    for (const x of [-0.7, 0.7]) P.cyl('jute', 0, -0.02, 0, 0.13, 0.13, 0.05, { seg: 6, color: ROPE, matrix: new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(x + sk * 0.2 + 0.025, y, z) });
  }
}

// ------------------------------------------------------------------------------------------------- drying cloth
export function cloth(P) {
  P.box('tarpaulin', 0, 0.03, 0, 1.6, 0.012, 1.0, { color: 0xffffff });
  tbox(P, 'tarpaulin', 0.82, 0.06, 0, 0.1, 0.012, 1.0, { rz: 0.5, color: 0xffffff }); // a rucked edge
}

// ---------------------------------------------------------------------------------------------- temple tank (kund)
/** stepped stone tank, built up from the flat ground (the game's ground cannot be dug): brick outer wall with a
 *  sandstone coping, three steps down on every side to the water, plain corner posts, steps up on the front */
export function templeTank(P, { outer = 12, inner = 8 } = {}) {
  const ring = (mat, half0, half1, y0, y1, color) => {
    const w = half1 - half0, h = y1 - y0, c = (half0 + half1) / 2, len = 2 * half1;
    P.box(mat, 0, (y0 + y1) / 2, -c, len, h, w, { color });
    P.box(mat, 0, (y0 + y1) / 2, c, len, h, w, { color });
    P.box(mat, -c, (y0 + y1) / 2, 0, w, h, 2 * half0, { color });
    P.box(mat, c, (y0 + y1) / 2, 0, w, h, 2 * half0, { color });
  };
  const O = outer / 2, I = inner / 2, step = (O - 0.5 - I) / 3;
  ring('brick', O - 0.5, O, 0, 0.6, BRICK);
  ring('concrete', O - 0.55, O + 0.04, 0.6, 0.66, STONE);
  for (let k = 0; k < 3; k++) ring('concrete', I + k * step, I + (k + 1) * step, 0, 0.15 + k * 0.15, k % 2 ? 0xc2b496 : 0xcabca0);
  ring('concrete', I - 0.05, I, -0.02, 0.1, 0x8a8a70); // green-stained lowest lip at the water
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    P.box('concrete', sx * (O - 0.2), 0.95, sz * (O - 0.2), 0.36, 0.6, 0.36, { color: STONE });
    P.box('concrete', sx * (O - 0.2), 1.3, sz * (O - 0.2), 0.46, 0.1, 0.46, { color: 0xc8b898 });
  }
  for (let k = 0; k < 3; k++) P.box('concrete', 0, 0.1 + k * 0.2, O + 0.9 - k * 0.3, 2.4, 0.2, 0.3 + 0.0, { color: k % 2 ? STONE : 0xc6b89a });
  for (const x of [-1.3, 1.3]) P.box('brick', x, 0.35, O + 0.55, 0.2, 0.7, 1.1, { color: BRICK });
}

// ------------------------------------------------------------------------------------------------------ welcome gate
/** two plastered pillars on plinths with stepped caps, an RCC beam across (the painted board faces are the signs
 *  layer). Local frame: the span runs along z from -span/2 to +span/2, the board faces +-x. */
export function gate(P, { span = 10.8, beamY0 = 5, beamY1 = 6.5, pillarH = 6 } = {}) {
  for (const s of [-1, 1]) {
    const z = s * span / 2;
    P.box('brick', 0, 0.2, z, 1.5, 0.4, 1.5, { color: BRICK });
    P.box('plaster', 0, 0.4 + (pillarH - 0.4) / 2, z, 1.2, pillarH - 0.4, 1.2, { color: 0xeadcc0 });
    P.box('plaster', 0, 1.0, z, 1.24, 0.08, 1.24, { color: 0xc88a58 });                   // painted band
    P.box('concrete', 0, pillarH + 0.08, z, 1.45, 0.16, 1.45, { color: CEMENT });
    P.box('plaster', 0, pillarH + 0.35, z, 1.0, 0.38, 1.0, { color: 0xe4d4b4 });
    P.box('concrete', 0, pillarH + 0.6, z, 0.7, 0.12, 0.7, { color: CEMENT });
    P.box('plaster', 0, pillarH + 0.78, z, 0.36, 0.24, 0.36, { color: 0xe4d4b4 });
  }
  P.box('concrete', 0, (beamY0 + beamY1) / 2, 0, 0.6, beamY1 - beamY0, span - 1.0, { color: 0xd8d0c0 });
  P.box('concrete', 0, beamY1 + 0.05, 0, 0.8, 0.1, span - 0.8, { color: CEMENT_OLD });
  P.box('concrete', 0, beamY0 - 0.05, 0, 0.7, 0.1, span - 0.9, { color: CEMENT_OLD });
}

export const BUILDERS = { tubewell, tower, transformer, notice, trough, machan, scarecrow, washplatform, barber, charpai, bench, stumps, creases, kabaddiLines, hopscotch, swing, brickWicket, plotPillar, potterWheel, kiln, clayHeap, taraju, caneHeap, cloth, templeTank, gate };

/** Build one design -> { [mat]: BufferGeometry } */
export function buildDesign(kind, params = {}) {
  const P = new Parts(TILES);
  BUILDERS[kind](P, params);
  return P.build();
}
