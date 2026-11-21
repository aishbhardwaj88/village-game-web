import { GB } from './housesGeom.js';
import { CELL } from './housesMaterial.js';

/**
 * Front clutter for the house kit (S7 sprint): things that live on a UP village house front. Only placed on fronts (the
 * backs of back-to-back rows are never seen). Each is built at the origin, +z toward the gali, on the shared atlas.
 * The tulsi plant itself is organic and is never code-built: the chaura (the plastered planter) is built here and the plant
 * goes on top from the game's real tulsi model (wiring: see docs/s7/houses.md).
 */
const W = { cell: CELL.wood, col: [0.85, 0.76, 0.64] };

export const CLUTTER = {
  /** Charpai stood on its side against the wall (by day): wooden frame and legs, woven cotton tape (nawar) lattice. */
  charpai(g) {
    const L = 1.9, B = 0.95, t = 0.06;
    // stood up: long axis along x, the bed plane vertical (y up to B), legs toward +z
    const lw = { ...W, col: [0.72, 0.6, 0.48] };
    g.box(-L / 2, L / 2, 0.05, 0.05 + t, -0.03, 0.03, lw);
    g.box(-L / 2, L / 2, B - t, B, -0.03, 0.03, lw);
    g.box(-L / 2, -L / 2 + t, 0.05, B, -0.03, 0.03, lw);
    g.box(L / 2 - t, L / 2, 0.05, B, -0.03, 0.03, lw);
    // legs stick out toward +z: build as bars
    for (const x of [-L / 2 + 0.03, L / 2 - 0.03]) for (const y of [0.08, B - 0.03]) g.bar([x, y, 0.03], [x, y, 0.38], 0.06, lw);
    const tape = { cell: CELL.wood, col: [0.95, 0.9, 0.8] }; // cotton nawar, greyed with use
    for (let x = -L / 2 + 0.12; x < L / 2 - 0.08; x += 0.075) g.box(x - 0.014, x + 0.014, 0.1, B - 0.05, -0.012, 0.004 + (Math.round(x * 14) % 2) * 0.006, tape);
    for (let y = 0.14; y < B - 0.06; y += 0.075) g.box(-L / 2 + 0.07, L / 2 - 0.07, y - 0.014, y + 0.014, -0.006, 0.01 - (Math.round(y * 14) % 2) * 0.006, tape);
  },
  /** LPG cylinder: painted steel (sun-faded red), collar and foot ring. */
  cylinder(g) {
    const R = { cell: CELL.rust, col: [1.25, 0.45, 0.38] };
    g.lathe(0, 0, [[0.14, 0], [0.15, 0.02], [0.15, 0.08], [0.155, 0.1], [0.155, 0.5], [0.13, 0.58], [0.07, 0.62], [0.05, 0.63], [0, 0.63]], 12, R);
    const M = { cell: CELL.rust, col: [0.75, 0.74, 0.72] };
    g.lathe(0, 0, [[0.045, 0.62], [0.045, 0.66], [0.03, 0.68], [0, 0.68]], 8, M);
    g.box(-0.1, 0.1, 0.66, 0.74, -0.01, 0.01, R); g.box(-0.1, -0.08, 0.6, 0.74, -0.01, 0.01, R); g.box(0.08, 0.1, 0.6, 0.74, -0.01, 0.01, R);
  },
  /** Black roadster bicycle leaning on its stand: two wheels with spokes, diamond frame, carrier, saddle, handlebar. */
  bicycle(g) {
    const B = { cell: CELL.rust, col: [0.16, 0.16, 0.17] }, Tyre = { cell: CELL.concrete, col: [0.08, 0.08, 0.08] }, Ch = { cell: CELL.rust, col: [0.7, 0.7, 0.7] };
    const r = 0.34, seg = 18;
    for (const cx of [-0.56, 0.56]) {
      for (let k = 0; k < seg; k++) {
        const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
        g.bar([cx + Math.cos(a0) * r, r + Math.sin(a0) * r, 0], [cx + Math.cos(a1) * r, r + Math.sin(a1) * r, 0], 0.035, Tyre);
        if (k % 3 === 0) g.bar([cx, r, 0], [cx + Math.cos(a0) * (r - 0.03), r + Math.sin(a0) * (r - 0.03), 0], 0.004, Ch);
      }
    }
    const P = (x, y) => [x, y, 0];
    const bb = P(0.0, 0.3), seat = P(-0.12, 0.85), head = P(0.42, 0.88), rear = P(-0.56, 0.34), front = P(0.56, 0.34);
    for (const [a, b] of [[bb, seat], [seat, head], [bb, head], [bb, rear], [seat, rear], [head, front]]) g.bar(a, b, 0.032, B);
    g.bar([-0.56, 0.72, 0], [-0.12, 0.8, 0], 0.025, B); // carrier
    g.box(-0.22, -0.02, 0.9, 0.95, -0.07, 0.07, { cell: CELL.wood, col: [0.25, 0.2, 0.18] }); // saddle
    g.bar([0.42, 0.88, 0], [0.4, 1.02, 0], 0.03, B);
    g.bar([0.38, 1.02, -0.27], [0.38, 1.02, 0.27], 0.025, Ch);
    g.bar([0.02, 0.3, 0.08], [-0.1, 0.0, 0.18], 0.02, B); // stand
  },
  /** Tulsi chaura: stepped plastered planter (the plant comes from the game's tulsi model). */
  tulsi(g) {
    const P = { cell: CELL.plaster, paint: 1, col: [1, 1, 1] };
    g.box(-0.32, 0.32, 0, 0.12, -0.32, 0.32, { ...P, skip: 'ny' });
    g.box(-0.24, 0.24, 0.12, 0.72, -0.24, 0.24, { ...P, skip: 'ny' });
    g.box(-0.29, 0.29, 0.72, 0.8, -0.29, 0.29, { ...P, skip: 'ny', colTop: [0.55, 0.45, 0.38] });
    g.box(-0.21, 0.21, 0.8, 0.81, -0.21, 0.21, { cell: CELL.mud, col: [0.55, 0.45, 0.35], skip: 'ny' }); // soil
    g.box(-0.08, 0.08, 0.35, 0.5, 0.239, 0.245, { cell: CELL.concrete, col: [0.15, 0.13, 0.12], skip: 'ny nz' }); // diya niche
  },
  /** Two clay matkas on an iron stand, a third on the ground. */
  matka(g) {
    const C = { cell: CELL.terracotta, col: [1, 0.92, 0.85] };
    const prof = (y0, s) => [[0.0, y0], [0.09 * s, y0], [0.17 * s, y0 + 0.06 * s], [0.2 * s, y0 + 0.17 * s], [0.17 * s, y0 + 0.28 * s], [0.08 * s, y0 + 0.34 * s], [0.075 * s, y0 + 0.38 * s], [0.09 * s, y0 + 0.4 * s], [0.06 * s, y0 + 0.4 * s]];
    const R = { cell: CELL.rust, col: [0.45, 0.43, 0.42] };
    for (const [x, z] of [[-0.22, -0.2], [0.22, -0.2], [0.22, 0.2], [-0.22, 0.2]]) g.box(x - 0.015, x + 0.015, 0, 0.45, z - 0.015, z + 0.015, R);
    g.box(-0.26, 0.26, 0.42, 0.45, -0.24, 0.24, R);
    g.lathe(-0.12, 0, prof(0.45, 1), 12, C);
    g.lathe(0.15, 0.02, prof(0.45, 0.85), 12, { ...C, col: [0.92, 0.82, 0.74] });
    g.lathe(0.55, 0.1, prof(0, 0.9), 12, { ...C, col: [0.95, 0.86, 0.78] });
  },
  /** Steel bucket and a low wooden stool (patla) by the step. */
  bucket(g) {
    const S = { cell: CELL.rust, col: [0.85, 0.85, 0.85] };
    g.lathe(0, 0, [[0, 0.01], [0.13, 0.01], [0.16, 0.3], [0.17, 0.31], [0.155, 0.31]], 12, S);
    g.bar([-0.16, 0.31, 0], [0, 0.45, 0], 0.01, S); g.bar([0, 0.45, 0], [0.16, 0.31, 0], 0.01, S);
    g.box(0.35, 0.75, 0.12, 0.17, -0.15, 0.15, W);
    g.box(0.37, 0.42, 0, 0.12, -0.13, 0.13, W); g.box(0.68, 0.73, 0, 0.12, -0.13, 0.13, W);
  },
};

export function buildClutter(kind) {
  const g = new GB();
  CLUTTER[kind](g);
  return g;
}
export const CLUTTER_KINDS = Object.keys(CLUTTER);
