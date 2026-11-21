import { GB } from './housesGeom.js';
import { CELL } from './housesMaterial.js';

/**
 * The house kit (S7 sprint, houses agent): 8 designs typical of western UP villages, built as real geometry, parametric in
 * the footprint (w = front width, d = depth), local frame: x across the front, +z = front, y up, origin = footprint centre
 * at ground level. Everything stays inside the footprint: the front strip (otla, steps, verandah, angan wall) is part of it.
 *
 * Storeys are STACKED (each storey is its own band of wall, openings and slab edge), never scaled. One shared material,
 * one atlas (src/kit/housesMaterial.js): paint channel 1 = the house's wall colour (per instance), 2 = door/window paint.
 *
 *   A  single storey, plastered and limewashed, door + windows under chajjas, otla and steps, tank on a steel stand
 *   B  two storeys stacked, cantilevered balcony with a steel railing, stair room (mumty) with the black tank on top
 *   C  exposed brick with whitewash patches, rusted tin-roof verandah on steel posts, brick parapet
 *   D  two storeys: plastered ground floor, upper floor added later in bare brick, rebar stubs, tin shed on the roof
 *   E  single storey with an outside stair along the front up to the roof, jali (honeycomb brick) parapet
 *   F  front angan behind a brick boundary wall with a steel gate, single storey behind
 *   G  kachcha: mud plaster on a brick plinth, pitched country-tile (khaprail) roof on wooden rafters, plank door
 *   H  kachcha: mud walls, flat mud roof on wooden beams (kadi ends showing), low rounded mud parapet, ladder to the roof
 */
export const DESIGNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const DESIGN_INFO = {
  A: { storeys: 1, kachcha: false, name: 'Single storey, limewashed' },
  B: { storeys: 2, kachcha: false, name: 'Two storeys with balcony and stair room' },
  C: { storeys: 1, kachcha: false, name: 'Exposed brick with tin verandah' },
  D: { storeys: 2, kachcha: false, name: 'Two storeys, upper floor in bare brick' },
  E: { storeys: 1, kachcha: false, name: 'Outside stair to the roof' },
  F: { storeys: 1, kachcha: false, name: 'Walled front angan with steel gate' },
  G: { storeys: 1, kachcha: true, name: 'Mud house, country-tile roof' },
  H: { storeys: 1, kachcha: true, name: 'Mud house, flat mud roof' },
};

const T = 0.23; // wall thickness (one brick)
const PL = 0.45; // plinth / otla / floor level
const H = 3.0; // storey height
const PAR = 0.85; // parapet height
const STRIP = 1.3; // front strip: otla + steps

const C_CONC = [0.8, 0.78, 0.74], C_CONC_D = [0.66, 0.64, 0.6], C_DARK = [0.07, 0.065, 0.06], C_SOFFIT = [0.6, 0.58, 0.55];
const C_REVEAL = [0.86, 0.85, 0.83];
const C_BLACK = [0.075, 0.075, 0.08];
const C_MUD = [0.9, 0.84, 0.78];
const C_WOOD = [0.95, 0.85, 0.72];

const WALL = (cell, paint) => ({ cell, paint, col: [1, 1, 1] });

/** Front facade band: wall pieces around the openings (only the face and the outer ends are drawn) + inward reveals. */
function facade(g, x0, x1, y0, y1, zf, t, openings, wall, o = {}) {
  const xs = [x0, x1];
  for (const op of openings) xs.push(Math.max(x0, op.x0), Math.min(x1, op.x1));
  const ux = [...new Set(xs.map((v) => +v.toFixed(4)))].sort((a, b) => a - b);
  for (let i = 0; i + 1 < ux.length; i++) {
    const a = ux[i], b = ux[i + 1];
    if (b - a < 1e-3) continue;
    const cov = openings.filter((op) => op.x0 <= a + 1e-4 && op.x1 >= b - 1e-4).sort((p, q) => p.y0 - q.y0);
    let y = y0;
    const spans = [];
    for (const op of cov) { if (op.y0 > y + 1e-4) spans.push([y, op.y0]); y = Math.max(y, op.y1); }
    if (y1 > y + 1e-4) spans.push([y, y1]);
    for (const [ya, yb] of spans) {
      let skip = 'nz ny';
      if (a > x0 + 1e-4 || o.noEnds) skip += ' nx';
      if (b < x1 - 1e-4 || o.noEnds) skip += ' px';
      if (yb < y1 - 1e-4 || o.noTop) skip += ' py';
      g.box(a, b, ya, yb, zf - t, zf, { ...wall, skip });
    }
  }
  for (const op of openings) { // reveals: the wall's own thickness showing round the opening
    const rv = { ...wall, col: o.revealCol || C_REVEAL, paint: wall.paint === 1 ? 1 : 0 };
    g.quad([op.x0, op.y0, zf], [op.x0, op.y0, zf - t], [op.x0, op.y1, zf - t], [op.x0, op.y1, zf], rv);
    g.quad([op.x1, op.y0, zf - t], [op.x1, op.y0, zf], [op.x1, op.y1, zf], [op.x1, op.y1, zf - t], rv);
    g.quad([op.x0, op.y1, zf], [op.x0, op.y1, zf - t], [op.x1, op.y1, zf - t], [op.x1, op.y1, zf], { ...rv, col: rv.col.map((v) => v * 0.8) });
    if (!op.door) g.quad([op.x0, op.y0, zf - t], [op.x0, op.y0, zf], [op.x1, op.y0, zf], [op.x1, op.y0, zf - t], rv);
  }
}

/** Door in an opening (x0..x1, y0..y1) of a wall whose face is at zf, thickness t. */
function door(g, op, zf, t, style = 'panel') {
  const zr = zf - t * 0.55;
  const fw = 0.07;
  const P = { cell: CELL.wood, paint: 2, col: C_WOOD };
  if (style === 'plank') { // kachcha: bare wood planks with gaps, a wooden lintel and a chain latch
    const n = Math.max(4, Math.round((op.x1 - op.x0) / 0.16));
    const pw = (op.x1 - op.x0) / n;
    g.box(op.x0, op.x1, op.y0, op.y1, zr - 0.06, zr - 0.04, { cell: CELL.concrete, col: C_DARK, skip: 'nz ny py nx px' });
    for (let i = 0; i < n; i++) {
      const a = op.x0 + i * pw + 0.008, b = op.x0 + (i + 1) * pw - 0.008;
      g.box(a, b, op.y0, op.y1 - 0.01 * (i % 3), zr - 0.03, zr + 0.01, { cell: CELL.wood, col: [0.8 + 0.1 * ((i * 7) % 3) / 2, 0.72, 0.62], skip: 'nz ny' });
    }
    for (const y of [op.y0 + 0.35, op.y1 - 0.35]) g.box(op.x0 + 0.04, op.x1 - 0.04, y - 0.05, y + 0.05, zr + 0.01, zr + 0.04, { cell: CELL.wood, col: [0.75, 0.66, 0.56], skip: 'nz' });
    g.box(op.x0 - 0.12, op.x1 + 0.12, op.y1, op.y1 + 0.14, zf - t, zf + 0.04, { cell: CELL.wood, col: [0.7, 0.6, 0.5], skip: 'nz' }); // lintel
    const cx = (op.x0 + op.x1) / 2;
    g.box(cx - 0.02, cx + 0.02, op.y0 + 1.0, op.y0 + 1.22, zr + 0.04, zr + 0.07, { cell: CELL.rust, col: [0.6, 0.6, 0.6] });
    return;
  }
  // frame
  g.box(op.x0, op.x0 + fw, op.y0, op.y1, zr - 0.05, zr + 0.06, { ...P, skip: 'nz ny' });
  g.box(op.x1 - fw, op.x1, op.y0, op.y1, zr - 0.05, zr + 0.06, { ...P, skip: 'nz ny' });
  g.box(op.x0, op.x1, op.y1 - fw, op.y1, zr - 0.05, zr + 0.06, { ...P, skip: 'nz' });
  const lx0 = op.x0 + fw, lx1 = op.x1 - fw, ly0 = op.y0 + 0.01, ly1 = op.y1 - fw;
  const mid = (lx0 + lx1) / 2;
  if (style === 'steel') { // pressed-steel sheet door, painted: two leaves with stamped horizontal ribs
    for (const [a, b] of [[lx0, mid - 0.005], [mid + 0.005, lx1]]) {
      g.box(a, b, ly0, ly1, zr - 0.02, zr + 0.01, { ...P, skip: 'nz ny' });
      for (let y = ly0 + 0.25; y < ly1 - 0.15; y += 0.3) g.box(a + 0.06, b - 0.06, y, y + 0.08, zr + 0.01, zr + 0.025, { ...P, skip: 'nz ny' });
    }
  } else { // wooden double door: stiles, rails and sunk panels, painted
    for (const [a, b] of [[lx0, mid - 0.004], [mid + 0.004, lx1]]) {
      g.box(a, b, ly0, ly1, zr - 0.02, zr + 0.005, { ...P, skip: 'nz ny' }); // panel plane (sunk)
      const s = 0.085;
      g.box(a, a + s, ly0, ly1, zr + 0.005, zr + 0.03, { ...P, skip: 'nz' });
      g.box(b - s, b, ly0, ly1, zr + 0.005, zr + 0.03, { ...P, skip: 'nz' });
      for (const [r0, r1] of [[ly0, ly0 + 0.16], [ly0 + 0.95, ly0 + 1.07], [ly1 - 0.12, ly1]]) g.box(a + s, b - s, r0, r1, zr + 0.005, zr + 0.03, { ...P, skip: 'nz nx px' });
    }
  }
  // kunda latch, chain and two hinges each side (rusted iron)
  const R = { cell: CELL.rust, col: [0.55, 0.52, 0.5] };
  g.box(mid - 0.09, mid + 0.09, op.y0 + 1.12, op.y0 + 1.15, zr + 0.03, zr + 0.045, R);
  g.box(mid + 0.04, mid + 0.06, op.y0 + 1.0, op.y0 + 1.15, zr + 0.045, zr + 0.06, R);
  for (const x of [lx0 + 0.01, lx1 - 0.04]) for (const y of [ly0 + 0.25, ly1 - 0.3]) g.box(x, x + 0.03, y, y + 0.12, zr + 0.02, zr + 0.04, R);
  // threshold
  g.box(op.x0 - 0.05, op.x1 + 0.05, op.y0 - 0.04, op.y0 + 0.02, zr - 0.05, zf + 0.03, { cell: CELL.concrete, col: C_CONC_D, skip: 'ny nz' });
}

/** Window: sill, dark room behind, one shutter closed, painted frame, iron grille. */
function window_(g, op, zf, t, style = 'grille') {
  const cx = (op.x0 + op.x1) / 2;
  const zb = zf - t + 0.015;
  g.box(op.x0, op.x1, op.y0, op.y1, zb - 0.01, zb, { cell: CELL.concrete, col: C_DARK, skip: 'nz ny py nx px' }); // the room inside
  if (style === 'mud') { // kachcha: small opening, wooden bars, wooden frame
    g.box(op.x0 - 0.06, op.x1 + 0.06, op.y1, op.y1 + 0.1, zf - t, zf + 0.03, { cell: CELL.wood, col: [0.72, 0.62, 0.52], skip: 'nz' });
    const n = 4;
    for (let i = 1; i < n; i++) { const x = op.x0 + ((op.x1 - op.x0) * i) / n; g.box(x - 0.022, x + 0.022, op.y0, op.y1, zf - 0.12, zf - 0.08, { cell: CELL.wood, col: C_WOOD }); }
    return;
  }
  const P = { cell: CELL.wood, paint: 2, col: C_WOOD };
  // shutter: left leaf closed, right leaf open into the room (only the dark room shows)
  g.box(op.x0 + 0.05, cx, op.y0 + 0.05, op.y1 - 0.05, zb + 0.005, zb + 0.035, { ...P, skip: 'nz' });
  g.box(op.x0 + 0.12, cx - 0.07, op.y0 + 0.15, op.y1 - 0.15, zb + 0.035, zb + 0.05, { ...P, skip: 'nz', col: [0.85, 0.77, 0.66] });
  // frame
  const zr = zf - t * 0.5, fw = 0.06;
  g.box(op.x0, op.x0 + fw, op.y0, op.y1, zr - 0.04, zr + 0.04, { ...P, skip: 'nz' });
  g.box(op.x1 - fw, op.x1, op.y0, op.y1, zr - 0.04, zr + 0.04, { ...P, skip: 'nz' });
  g.box(op.x0, op.x1, op.y1 - fw, op.y1, zr - 0.04, zr + 0.04, { ...P, skip: 'nz' });
  g.box(op.x0, op.x1, op.y0, op.y0 + fw, zr - 0.04, zr + 0.04, { ...P, skip: 'nz' });
  // grille: square bars with two flats, set just inside the face
  const R = { cell: CELL.rust, col: [0.62, 0.6, 0.58] };
  const zg = zf - 0.06;
  const n = Math.max(5, Math.round((op.x1 - op.x0) / 0.13));
  for (let i = 1; i < n; i++) { const x = op.x0 + ((op.x1 - op.x0) * i) / n; g.box(x - 0.008, x + 0.008, op.y0 + fw, op.y1 - fw, zg - 0.008, zg + 0.008, R); }
  for (const y of [op.y0 + (op.y1 - op.y0) * 0.33, op.y0 + (op.y1 - op.y0) * 0.66]) g.box(op.x0 + fw, op.x1 - fw, y - 0.018, y + 0.018, zg - 0.004, zg + 0.012, R);
  // sill, projecting
  g.box(op.x0 - 0.08, op.x1 + 0.08, op.y0 - 0.06, op.y0, zf - 0.04, zf + 0.06, { cell: CELL.concrete, col: C_CONC, colBot: C_SOFFIT });
}

/** Chajja: a thin cantilevered concrete sunshade over openings, with a drip edge and a darker underside. */
function chajja(g, x0, x1, y, zf, proj = 0.55) {
  g.box(x0, x1, y - 0.07, y, zf, zf + proj, { cell: CELL.concrete, col: C_CONC, colBot: C_SOFFIT, skip: 'nz' });
  g.box(x0, x1, y - 0.11, y - 0.07, zf + proj - 0.05, zf + proj, { cell: CELL.concrete, col: C_CONC_D, skip: 'nz py' });
}

/** Side + back walls of one storey (the front is the facade band), with a plinth band on the outside. */
function bodyWalls(g, w, d, zf, y0, y1, wall, plinth = true) {
  g.box(-w / 2, w / 2, y0, y1, -d / 2, zf - T, { ...wall, skip: 'pz py ny' });
  if (plinth && y0 < 0.01) {
    g.box(-w / 2 - 0.03, w / 2 + 0.03, 0, PL, -d / 2 - 0.03, zf - T, { cell: CELL.concrete, col: C_CONC_D, skip: 'pz ny' });
  }
}

/** Floor/roof slab edge band across the front and the roof slab itself (top face). */
function slab(g, w, d, zf, y, roof) {
  g.box(-w / 2, w / 2, y - 0.16, y, zf - T, zf + 0.04, { cell: CELL.concrete, col: C_CONC, colBot: C_SOFFIT, skip: 'nz' });
  if (roof) g.box(-w / 2, w / 2, y - 0.16, y, -d / 2, zf - T, { cell: CELL.concrete, col: [0.74, 0.72, 0.68], skip: 'pz ny nx px nz' });
}

/** Parapet round the roof (y = roof top). style: plain | jali | step. gap: [x0, x1] left open on the front (stair landing). */
function parapet(g, w, d, zf, y, wall, style = 'plain', gap = null) {
  const t = 0.12, h = PAR;
  const cop = { cell: CELL.concrete, col: C_CONC, colBot: C_SOFFIT };
  const run = (x0, x1, z0, z1, along) => {
    g.box(x0, x1, y, y + h, z0, z1, { ...wall, skip: 'ny' });
    const o = 0.035;
    g.box(x0 - (along ? 0 : o), x1 + (along ? 0 : o), y + h, y + h + 0.06, z0 - (along ? o : 0), z1 + (along ? o : 0), cop);
  };
  // sides and back
  run(-w / 2, -w / 2 + t, -d / 2 + t, zf - t, false);
  run(w / 2 - t, w / 2, -d / 2 + t, zf - t, false);
  run(-w / 2, w / 2, -d / 2, -d / 2 + t, true);
  // front
  const segs = gap ? [[-w / 2, gap[0]], [gap[1], w / 2]] : [[-w / 2, w / 2]];
  for (const [a, b] of segs) {
    if (b - a < 0.05) continue;
    if (style === 'jali' && b - a > 1.2) { // honeycomb brick: solid base and top band, piers with gaps between
      const B = { cell: CELL.brick, col: [1, 1, 1] };
      g.box(a, b, y, y + 0.3, zf - t, zf, { ...wall, skip: 'ny' });
      g.box(a, b, y + 0.68, y + h, zf - t, zf, { ...wall, skip: '' });
      const n = Math.floor((b - a - 0.24) / 0.24);
      const x0 = a + (b - a - n * 0.24) / 2;
      g.box(a, x0 + 0.12, y + 0.3, y + 0.68, zf - t, zf, { ...wall, skip: 'ny py' });
      for (let i = 1; i < n; i++) g.box(x0 + i * 0.24, x0 + i * 0.24 + 0.12, y + 0.3, y + 0.68, zf - t, zf, { ...B, skip: 'ny py' });
      g.box(x0 + n * 0.24, b, y + 0.3, y + 0.68, zf - t, zf, { ...wall, skip: 'ny py' });
      g.box(a, b, y + h, y + h + 0.06, zf - t - 0.035, zf + 0.035, cop);
    } else if (style === 'step') { // raised middle panel, the old-house pediment
      run(a, b, zf - t, zf, true);
      const m = (a + b) / 2;
      g.box(m - 0.9, m + 0.9, y + h + 0.06, y + h + 0.42, zf - t, zf, { ...wall, skip: 'ny' });
      g.box(m - 0.95, m + 0.95, y + h + 0.42, y + h + 0.48, zf - t - 0.035, zf + 0.035, cop);
    } else run(a, b, zf - t, zf, true);
  }
  // rainwater spout through the front parapet base
  const sx = w / 2 - 0.6;
  g.box(sx - 0.05, sx + 0.05, y + 0.02, y + 0.1, zf, zf + 0.38, { cell: CELL.concrete, col: C_CONC_D });
}

/** Black ribbed water tank (1000 l), on a steel stand or on a slab. */
function tank(g, x, z, y, stand = true) {
  let base = y;
  if (stand) {
    const R = { cell: CELL.rust, col: [0.55, 0.53, 0.5] };
    for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) g.box(x + dx - 0.025, x + dx + 0.025, y, y + 1.2, z + dz - 0.025, z + dz + 0.025, R);
    g.box(x - 0.6, x + 0.6, y + 1.2, y + 1.25, z - 0.6, z + 0.6, R);
    g.bar([x - 0.5, y + 0.4, z - 0.5], [x + 0.5, y + 0.9, z - 0.5], 0.03, R);
    g.bar([x - 0.5, y + 0.4, z + 0.5], [x + 0.5, y + 0.9, z + 0.5], 0.03, R);
    base = y + 1.25;
  }
  const r = 0.56;
  const prof = [[r - 0.04, 0], [r, 0.04], [r, 0.24], [r + 0.025, 0.27], [r, 0.3], [r, 0.52], [r + 0.025, 0.55], [r, 0.58], [r, 0.86], [r - 0.08, 0.98], [0.24, 1.06], [0.24, 1.12], [0.2, 1.14], [0, 1.15]].map(([rr, yy]) => [rr, base + yy]);
  g.lathe(x, z, prof, 14, { cell: CELL.concrete, col: C_BLACK });
  // inlet pipe down the side
  g.bar([x + r, base + 0.9, z], [x + r + 0.05, y + 0.02, z], 0.035, { cell: CELL.concrete, col: [0.2, 0.2, 0.2] });
}

/** Stair room (mumty) on the roof at x0..x1, z0..z1, floor y: walls, painted steel door, its own slab and lip. */
function mumty(g, x0, x1, z0, z1, y, wall) {
  const h = 2.35;
  const op = { x0: (x0 + x1) / 2 - 0.42, x1: (x0 + x1) / 2 + 0.42, y0: y, y1: y + 2.0, door: true };
  g.box(x0, x1, y, y + h, z0, z1 - 0.2, { ...wall, skip: 'ny pz py' });
  facade(g, x0, x1, y, y + h, z1, 0.2, [op], wall, { noTop: true });
  door(g, op, z1, 0.2, 'steel');
  g.box(x0 - 0.05, x1 + 0.05, y + h, y + h + 0.12, z0 - 0.05, z1 + 0.25, { cell: CELL.concrete, col: C_CONC, colBot: C_SOFFIT });
  g.box(x0 - 0.05, x1 + 0.05, y + h + 0.12, y + h + 0.3, z1 + 0.15, z1 + 0.25, { ...wall, skip: 'ny' });
  return y + h + 0.12;
}

/** Corrugated sheet from the line (x0..x1, z0, y0) down to (x0..x1, z1, y1); waves run along x. Rusted steel, lapped panels. */
function corrugated(g, x0, x1, z0, y0, z1, y1, o = {}) {
  const pitch = o.pitch || 0.1, amp = o.amp || 0.014, sm = 6, pw = o.panel || 0.92;
  const M = { cell: CELL.rust, col: o.col || [0.95, 0.92, 0.9] };
  let px = x0, k = 0;
  while (px < x1 - 0.01) {
    const pe = Math.min(x1, px + pw);
    const lift = (k % 2) * 0.012; // every other panel laps over its neighbour
    const nw = Math.max(1, Math.round((pe - px) / pitch));
    const pts = [];
    for (let i = 0; i <= nw * sm; i++) { const t = i / (nw * sm); pts.push([px + (pe - px) * t, Math.sin(t * nw * Math.PI * 2) * amp + lift]); }
    for (let i = 0; i + 1 < pts.length; i++) {
      const [xa, ha] = pts[i], [xb, hb] = pts[i + 1];
      const tl = (ux, h, z, yy) => [ux, yy + h, z];
      g.quad(tl(xa, ha, z1, y1), tl(xb, hb, z1, y1), tl(xb, hb, z0, y0), tl(xa, ha, z0, y0), { ...M, double: true });
    }
    px = pe - 0.06; k++;
    if (pe >= x1) break;
  }
}

/** Front strip: otla platform across the facade and two steps up to the door. Kept inside the footprint. */
function otla(g, w, zf, doorOp, o = {}) {
  const S = { cell: o.cell ?? CELL.concrete, col: o.col || C_CONC, colSide: o.colSide || C_CONC_D };
  const depth = o.depth || 0.85;
  g.box(-w / 2 + (o.inset || 0), w / 2 - (o.inset || 0), 0, PL, zf, zf + depth, { ...S, skip: 'nz ny' });
  g.box(-w / 2 + (o.inset || 0), w / 2 - (o.inset || 0), PL - 0.05, PL, zf + depth, zf + depth + 0.03, { ...S, skip: 'nz ny' }); // nosing
  if (doorOp) {
    const a = doorOp.x0 - 0.2, b = doorOp.x1 + 0.2;
    g.box(a, b, 0, PL * 0.66, zf + depth, zf + depth + 0.24, { ...S, skip: 'nz ny' });
    g.box(a, b, 0, PL * 0.33, zf + depth + 0.24, zf + depth + 0.45, { ...S, skip: 'nz ny' });
  }
}

/** Electric meter box with the service wire running up to the roof. */
function meter(g, x, zf, yTop) {
  g.box(x - 0.15, x + 0.15, 1.75, 2.15, zf, zf + 0.1, { cell: CELL.concrete, col: [0.55, 0.56, 0.55] });
  g.box(x - 0.01, x + 0.01, 2.15, yTop + 0.6, zf + 0.04, zf + 0.06, { cell: CELL.concrete, col: [0.12, 0.12, 0.12] });
}

/** Opening layout for a facade of width w: door + windows; `mirror` swaps the sides. */
function groundOpenings(w, y0, mirror, doorW = 1.05, doorH = 2.15) {
  const s = mirror ? -1 : 1;
  const ops = [];
  const place = (cx, ww, yy0, yy1, isDoor) => { const c = cx * s; ops.push({ x0: c - ww / 2, x1: c + ww / 2, y0: yy0, y1: yy1, door: isDoor }); };
  if (w < 6) { place(-w / 2 + 1.25, doorW, y0, y0 + doorH, true); place(w / 2 - 1.45, 1.1, y0 + 0.9, y0 + 2.05, false); }
  else if (w < 7.2) { place(-w / 2 + 1.35, doorW, y0, y0 + doorH, true); place(w / 2 - 1.6, 1.2, y0 + 0.9, y0 + 2.1, false); }
  else { place(-w / 2 + 1.25, 1.1, y0 + 0.9, y0 + 2.1, false); place(-0.35, doorW * 1.1, y0, y0 + doorH, true); place(w / 2 - 1.45, 1.2, y0 + 0.9, y0 + 2.1, false); }
  return ops;
}
function upperOpenings(w, y0, mirror, withDoor) {
  const s = mirror ? -1 : 1, ops = [];
  const place = (cx, ww, yy0, yy1, isDoor) => { const c = cx * s; ops.push({ x0: c - ww / 2, x1: c + ww / 2, y0: yy0, y1: yy1, door: isDoor }); };
  if (withDoor) place(-w / 2 + 1.35, 0.95, y0 + 0.02, y0 + 2.1, true);
  place(w / 2 - 1.55, 1.2, y0 + 0.9, y0 + 2.1, false);
  if (w >= 7.2 && !withDoor) place(-w / 2 + 1.45, 1.1, y0 + 0.9, y0 + 2.1, false);
  return ops;
}

/** Chajja runs over the openings of one storey (merged when close). */
function chajjas(g, ops, zf, w, proj = 0.55) {
  const runs = ops.map((o) => [o.x0 - 0.25, o.x1 + 0.25, o.y1 + 0.18]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const r of runs) { const l = out[out.length - 1]; if (l && r[0] < l[1] + 0.5 && Math.abs(r[2] - l[2]) < 0.3) { l[1] = Math.max(l[1], r[1]); l[2] = Math.max(l[2], r[2]); } else out.push([...r]); }
  for (const [a, b, y] of out) chajja(g, Math.max(-w / 2, a), Math.min(w / 2, b), y, zf, proj);
}

/** One pakka storey: side/back walls, facade with openings, doors, windows, chajjas. Returns the openings. */
function pakkaStorey(g, w, d, zf, y0, y1, ops, wall, o = {}) {
  bodyWalls(g, w, d, zf, y0, y1, o.sideWall || wall, y0 < 0.01);
  facade(g, -w / 2, w / 2, y0, y1, zf, T, ops, wall);
  for (const op of ops) op.door ? door(g, op, zf, T, o.doorStyle || 'panel') : window_(g, op, zf, T);
  if (o.chajja !== false) chajjas(g, ops, zf, w, o.chajjaProj);
}

/** Builds design `design` for a w x d footprint. mirror swaps door/window sides. Returns { near: GB, info }. */
export function buildHouse(design, w, d, mirror = false) {
  const g = new GB();
  const info = { tanks: [], roofY: 0, frontY: 0 };
  const plaster = WALL(CELL.plaster, 1);
  const zfront = d / 2;
  switch (design) {
    case 'A': {
      const zf = zfront - STRIP;
      const ops = groundOpenings(w, PL, mirror);
      g.box(-w / 2, w / 2, 0, PL, zf - T, zf, { cell: CELL.concrete, col: C_CONC_D, skip: 'nz ny' }); // plinth under the facade
      pakkaStorey(g, w, d, zf, PL, PL + H, ops, plaster);
      g.box(-w / 2, w / 2, PL + H - 0.4, PL + H - 0.3, zf, zf + 0.03, { cell: CELL.concrete, col: C_CONC, skip: 'nz' }); // cornice line
      slab(g, w, d, zf, PL + H, true);
      parapet(g, w, d, zf, PL + H, plaster, w >= 6.4 ? 'step' : 'plain');
      otla(g, w, zf, ops.find((o) => o.door));
      meter(g, (mirror ? 1 : -1) * (w / 2 - 0.35), zf, PL + H);
      const tx = (mirror ? -1 : 1) * (w / 2 - 1.0), tz = -d / 2 + 1.0;
      tank(g, tx, tz, PL + H, true);
      info.tanks.push([tx, PL + H + 1.25 + 1.15, tz]);
      info.zf = zf; info.otlaY = PL; info.otlaDepth = 0.85; info.door = ops.find((o) => o.door);
      info.roofY = PL + H;
      break;
    }
    case 'B': {
      const zf = zfront - STRIP;
      const ops = groundOpenings(w, PL, mirror);
      g.box(-w / 2, w / 2, 0, PL, zf - T, zf, { cell: CELL.concrete, col: C_CONC_D, skip: 'nz ny' });
      pakkaStorey(g, w, d, zf, PL, PL + H, ops, plaster, { chajja: false });
      // first-floor slab cantilevers over the otla as a balcony (covers the ground floor's door and windows)
      const yb = PL + H;
      g.box(-w / 2, w / 2, yb - 0.16, yb, zf - T, zf + 1.05, { cell: CELL.concrete, col: C_CONC, colBot: C_SOFFIT, skip: 'nz' });
      const R = { cell: CELL.rust, col: [0.5, 0.48, 0.46] };
      const rz = zf + 1.0;
      g.box(-w / 2 + 0.05, w / 2 - 0.05, yb + 0.9, yb + 0.95, rz - 0.03, rz + 0.03, R); // handrail
      g.box(-w / 2 + 0.05, w / 2 - 0.05, yb + 0.1, yb + 0.14, rz - 0.02, rz + 0.02, R);
      for (let x = -w / 2 + 0.1; x <= w / 2 - 0.1; x += 0.12) g.box(x - 0.008, x + 0.008, yb, yb + 0.9, rz - 0.008, rz + 0.008, R);
      for (const sx of [-1, 1]) for (let zz = zf + 0.1; zz < rz; zz += 0.12) g.box(sx * (w / 2 - 0.05) - 0.008, sx * (w / 2 - 0.05) + 0.008, yb, yb + 0.9, zz - 0.008, zz + 0.008, R);
      for (const sx of [-1, 1]) g.box(sx * (w / 2 - 0.05) - 0.02, sx * (w / 2 - 0.05) + 0.02, yb + 0.9, yb + 0.95, zf, rz, R);
      const up = upperOpenings(w, yb, mirror, true);
      pakkaStorey(g, w, d, zf, yb, yb + H, up, plaster, { doorStyle: 'steel', chajjaProj: 0.45 });
      slab(g, w, d, zf, yb + H, true);
      parapet(g, w, d, zf, yb + H, plaster, 'plain');
      otla(g, w, zf, ops.find((o) => o.door), { depth: 0.85 });
      meter(g, (mirror ? 1 : -1) * (w / 2 - 0.35), zf, yb);
      const mx0 = mirror ? w / 2 - 0.12 - 2.4 : -w / 2 + 0.12, mz0 = -d / 2 + 0.12;
      const top = mumty(g, mx0, mx0 + 2.4, mz0, mz0 + Math.min(2.8, d - STRIP - 1.6), yb + H, plaster);
      const tx = mx0 + 1.2, tz = mz0 + 1.0;
      tank(g, tx, tz, top, false);
      info.tanks.push([tx, top + 1.15, tz]);
      info.zf = zf; info.otlaY = PL; info.otlaDepth = 0.85; info.door = ops.find((o) => o.door);
      info.roofY = yb + H;
      break;
    }
    case 'C': {
      const zf = zfront - STRIP;
      const ops = groundOpenings(w, PL, mirror);
      const brick = WALL(CELL.brickWash, 0);
      g.box(-w / 2, w / 2, 0, PL, zf - T, zf, { cell: CELL.brick, col: [0.9, 0.9, 0.9], skip: 'nz ny' });
      pakkaStorey(g, w, d, zf, PL, PL + H - 0.2, ops, brick, { chajja: false });
      slab(g, w, d, zf, PL + H - 0.2, true);
      parapet(g, w, d, zf, PL + H - 0.2, WALL(CELL.brick, 0), 'plain');
      otla(g, w, zf, ops.find((o) => o.door), { cell: CELL.brick, col: [0.92, 0.9, 0.88], colSide: [0.85, 0.83, 0.8] });
      // tin verandah over the front strip: ledger on the wall, two steel posts, sloping sheet
      const R = { cell: CELL.rust, col: [0.62, 0.6, 0.58] };
      const yTop = PL + H - 0.45, yLow = yTop - 0.38, z1 = zfront - 0.05;
      g.box(-w / 2 + 0.05, w / 2 - 0.05, yTop - 0.1, yTop, zf, zf + 0.08, R);
      for (const sx of [-1, 1]) {
        const x = sx * (w / 2 - 0.25);
        g.lathe(x, z1 - 0.15, [[0.045, PL], [0.045, yLow], [0, yLow]], 8, R);
        g.box(x - 0.08, x + 0.08, 0, 0.06, z1 - 0.23, z1 - 0.07, { cell: CELL.concrete, col: C_CONC_D });
      }
      g.box(-w / 2 + 0.05, w / 2 - 0.05, yLow - 0.09, yLow, z1 - 0.2, z1 - 0.1, R); // front purlin
      corrugated(g, -w / 2 + 0.02, w / 2 - 0.02, zf, yTop + 0.02, z1, yLow + 0.01, { col: [0.95, 0.9, 0.86] });
      const tx = (mirror ? 1 : -1) * (w / 2 - 1.0), tz = -d / 2 + 1.0;
      tank(g, tx, tz, PL + H - 0.2, false);
      info.tanks.push([tx, PL + H - 0.2 + 1.15, tz]);
      info.zf = zf; info.otlaY = PL; info.otlaDepth = 0.85; info.door = ops.find((o) => o.door); info.posts = true;
      info.roofY = PL + H - 0.2;
      break;
    }
    case 'D': {
      const zf = zfront - STRIP;
      const ops = groundOpenings(w, PL, mirror);
      g.box(-w / 2, w / 2, 0, PL, zf - T, zf, { cell: CELL.concrete, col: C_CONC_D, skip: 'nz ny' });
      pakkaStorey(g, w, d, zf, PL, PL + H, ops, plaster);
      slab(g, w, d, zf, PL + H, false);
      const yb = PL + H;
      const brick = WALL(CELL.brick, 0);
      const up = upperOpenings(w, yb, mirror, false);
      pakkaStorey(g, w, d, zf, yb, yb + H - 0.1, up, brick, { sideWall: brick, chajja: false });
      for (const op of up) g.box(op.x0 - 0.12, op.x1 + 0.12, op.y1, op.y1 + 0.12, zf - T, zf + 0.01, { cell: CELL.concrete, col: C_CONC_D, skip: 'nz' }); // bare RCC lintels
      slab(g, w, d, zf, yb + H - 0.1, true);
      const yr = yb + H - 0.1;
      // low brick parapet started and not finished, column stubs with rusted rebar for the next floor
      parapet(g, w, d, zf, yr, brick, 'plain');
      const R = { cell: CELL.rust, col: [0.7, 0.62, 0.55] };
      for (const [cx, cz] of [[-w / 2 + 0.12, zf - 0.12], [w / 2 - 0.12, zf - 0.12], [-w / 2 + 0.12, -d / 2 + 0.12], [w / 2 - 0.12, -d / 2 + 0.12]]) {
        g.box(cx - 0.12, cx + 0.12, yr + PAR + 0.06, yr + PAR + 0.32, cz - 0.12, cz + 0.12, { cell: CELL.concrete, col: C_CONC_D, skip: 'ny' });
        for (const [dx, dz] of [[-0.07, -0.07], [0.07, -0.07], [0.07, 0.07], [-0.07, 0.07]]) g.bar([cx + dx, yr + PAR + 0.3, cz + dz], [cx + dx * 1.3, yr + PAR + 1.2, cz + dz * 1.3], 0.014, R);
      }
      // tin shed at the back of the roof (fodder, cots)
      const sz0 = -d / 2 + 0.15, sz1 = -d / 2 + Math.min(2.6, d - STRIP - 1.2);
      for (const sx of [-w / 2 + 0.3, 0, w / 2 - 0.3]) g.lathe(sx, sz1 - 0.1, [[0.04, yr], [0.04, yr + 2.0], [0, yr + 2.0]], 8, R);
      g.box(-w / 2 + 0.2, w / 2 - 0.2, yr + 1.92, yr + 2.0, sz1 - 0.16, sz1 - 0.06, R);
      corrugated(g, -w / 2 + 0.15, w / 2 - 0.15, sz1 + 0.05, yr + 2.02, sz0, yr + 2.3, { col: [0.9, 0.85, 0.8] });
      otla(g, w, zf, ops.find((o) => o.door));
      meter(g, (mirror ? 1 : -1) * (w / 2 - 0.35), zf, yb);
      const tx = (mirror ? 1 : -1) * (w / 2 - 1.1), tz = (sz1 + zf) / 2;
      tank(g, tx, tz, yr, false);
      info.tanks.push([tx, yr + 1.15, tz]);
      info.zf = zf; info.otlaY = PL; info.otlaDepth = 0.85; info.door = ops.find((o) => o.door);
      info.roofY = yr;
      break;
    }
    case 'E': {
      const zf = zfront - 1.05;
      const s = mirror ? -1 : 1;
      const yr = PL + H;
      // door under the high end of the stair, a small ventilator high on the wall at the low end
      const dx = -s * (w / 2 - 1.05);
      const ops = [{ x0: dx - 0.5, x1: dx + 0.5, y0: 0.15, y1: 2.25, door: true }];
      const vx = s * (w / 2 - 1.7);
      ops.push({ x0: vx - 0.45, x1: vx + 0.45, y0: 2.45, y1: 3.0, door: false });
      if (w >= 6.4) { const mx = s * (w / 2 - 3.4); ops.push({ x0: mx - 0.55, x1: mx + 0.55, y0: 1.6, y1: 2.9, door: false }); }
      g.box(-w / 2, w / 2, 0, 0.15, zf - T, zf, { cell: CELL.concrete, col: C_CONC_D, skip: 'nz ny' });
      pakkaStorey(g, w, d, zf, 0.15, yr, ops, plaster, { chajja: false });
      chajja(g, dx - 0.65, dx + 0.65, 2.45, zf, 0.3);
      slab(g, w, d, zf, yr, true);
      const run0 = s * (w / 2 - 0.15), run1 = -s * (w / 2 - 0.15); // stair rises from the low end (run0) to the roof (run1)
      const n = Math.ceil(yr / 0.185), rise = yr / n, tread = Math.abs(run1 - run0) / n;
      const z0 = zf, z1 = zf + 0.9;
      const S = { cell: CELL.concrete, col: C_CONC };
      for (let i = 0; i < n; i++) {
        const xa = run0 - s * i * tread, xb = run0 - s * (i + 1) * tread;
        const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
        const top = (i + 1) * rise;
        g.box(lo, hi, top - rise - 0.02, top, z0, z1, { ...S, colSide: C_CONC_D, skip: 'nz ny' + (i ? (s > 0 ? ' px' : ' nx') : '') });
        // waist: the stepped outer face down to the sloping soffit
        const soff = (x) => Math.max(0, (Math.abs(x - run0) / Math.abs(run1 - run0)) * yr - 0.38);
        const fa = s > 0 ? hi : lo, fb = s > 0 ? lo : hi;
        if (top - rise - 0.02 > soff(fa) + 0.01) g.quad([lo, soff(lo), z1], [hi, soff(hi), z1], [hi, top - rise - 0.02, z1], [lo, top - rise - 0.02, z1], { ...plaster });
        g.quad([lo, soff(lo), z0], [hi, soff(hi), z0], [hi, soff(hi), z1], [lo, soff(lo), z1], { cell: CELL.concrete, col: C_SOFFIT });
      }
      // plastered dwarf wall along the stair's outer edge
      const sl = (x) => (Math.abs(x - run0) / Math.abs(run1 - run0)) * yr;
      const pa = run0 - s * tread * 2, pb = run1;
      const lo = Math.min(pa, pb), hi = Math.max(pa, pb);
      const yl = (x) => sl(x) + 0.75;
      g.quad([lo, sl(lo), z1 + 0.1], [hi, sl(hi), z1 + 0.1], [hi, yl(hi), z1 + 0.1], [lo, yl(lo), z1 + 0.1], plaster);
      g.quad([hi, sl(hi), z1], [lo, sl(lo), z1], [lo, yl(lo), z1], [hi, yl(hi), z1], plaster);
      g.quad([lo, yl(lo), z1 + 0.1], [hi, yl(hi), z1 + 0.1], [hi, yl(hi), z1], [lo, yl(lo), z1], { cell: CELL.concrete, col: C_CONC });
      const gx = run1 + s * 0.05;
      parapet(g, w, d, zf, yr, plaster, 'jali', s > 0 ? [-w / 2 - 0.01, -w / 2 + 1.0] : [w / 2 - 1.0, w / 2 + 0.01]);
      void gx;
      meter(g, s * (w / 2 - 0.4), zf, yr);
      const tx = s * (w / 2 - 1.0), tz = -d / 2 + 1.0;
      tank(g, tx, tz, yr, true);
      info.tanks.push([tx, yr + 1.25 + 1.15, tz]);
      info.zf = zf; info.otlaY = null; info.door = ops[0]; info.noStrip = true;
      info.roofY = yr;
      break;
    }
    case 'F': {
      const zf = zfront - 2.3; // the angan: 2 m of swept courtyard behind the boundary wall
      const ops = groundOpenings(w, PL, mirror);
      g.box(-w / 2, w / 2, 0, PL, zf - T, zf, { cell: CELL.concrete, col: C_CONC_D, skip: 'nz ny' });
      pakkaStorey(g, w, d, zf, PL, PL + H, ops, plaster, { chajjaProj: 0.6 });
      slab(g, w, d, zf, PL + H, true);
      parapet(g, w, d, zf, PL + H, plaster, 'plain');
      otla(g, w, zf, ops.find((o) => o.door), { depth: 0.6, inset: 0.2 });
      // courtyard floor (brick on edge) and the boundary wall with pillars and a steel gate
      g.box(-w / 2 + 0.2, w / 2 - 0.2, 0, 0.04, zf + 0.6, zfront - 0.2, { cell: CELL.brick, col: [0.85, 0.83, 0.8], skip: 'ny nz pz nx px', uvRot: true });
      const yw = 1.65, gw = 1.35;
      const gc = (mirror ? 1 : -1) * (w / 2 - 1.35);
      const gx0 = gc - gw / 2, gx1 = gc + gw / 2;
      const bw = WALL(CELL.plaster, 1);
      const wz0 = zfront - 0.2, wz1 = zfront;
      for (const [a, b] of [[-w / 2, gx0 - 0.3], [gx1 + 0.3, w / 2]]) {
        g.box(a, b, 0, yw, wz0, wz1, { ...bw, skip: 'ny' });
        g.box(a - 0.02, b + 0.02, yw, yw + 0.06, wz0 - 0.03, wz1 + 0.03, { cell: CELL.concrete, col: C_CONC, colBot: C_SOFFIT });
      }
      for (const x of [gx0 - 0.15, gx1 + 0.15]) {
        g.box(x - 0.17, x + 0.17, 0, yw + 0.25, wz0 - 0.07, wz1 + 0.07, { ...bw, skip: 'ny' });
        g.box(x - 0.21, x + 0.21, yw + 0.25, yw + 0.33, wz0 - 0.11, wz1 + 0.11, { cell: CELL.concrete, col: C_CONC });
        g.box(x - 0.12, x + 0.12, yw + 0.33, yw + 0.42, wz0 - 0.03, wz1 + 0.03, { cell: CELL.concrete, col: C_CONC_D });
      }
      const R = { cell: CELL.rust, col: [0.7, 0.68, 0.66] }, Pt = { cell: CELL.rust, paint: 2, col: [0.85, 0.85, 0.85] };
      const gz = (wz0 + wz1) / 2;
      for (const [a, b] of [[gx0, gc - 0.01], [gc + 0.01, gx1]]) {
        g.box(a, b, 0.08, 0.14, gz - 0.02, gz + 0.02, Pt); g.box(a, b, 1.5, 1.56, gz - 0.02, gz + 0.02, Pt); g.box(a, b, 0.8, 0.85, gz - 0.02, gz + 0.02, Pt);
        g.box(a, a + 0.05, 0.08, 1.56, gz - 0.02, gz + 0.02, Pt); g.box(b - 0.05, b, 0.08, 1.56, gz - 0.02, gz + 0.02, Pt);
        g.box(a + 0.05, b - 0.05, 0.14, 0.8, gz - 0.006, gz + 0.006, Pt); // lower sheet
        for (let x = a + 0.12; x < b - 0.06; x += 0.11) g.box(x - 0.008, x + 0.008, 0.85, 1.5, gz - 0.008, gz + 0.008, R);
      }
      meter(g, (mirror ? -1 : 1) * (w / 2 - 0.35), zf, PL + H);
      const tx = (mirror ? -1 : 1) * (w / 2 - 1.0), tz = -d / 2 + 1.0;
      tank(g, tx, tz, PL + H, true);
      info.tanks.push([tx, PL + H + 1.25 + 1.15, tz]);
      info.zf = zf; info.otlaY = null; info.door = ops.find((o) => o.door); info.noStrip = true;
      info.roofY = PL + H;
      break;
    }
    case 'G': {
      const zf = zfront - 1.15;
      const yw = 2.75;
      const mud = { cell: CELL.mud, paint: 0, col: C_MUD };
      const s = mirror ? -1 : 1;
      const dop = { x0: -s * (w / 2 - 1.2) - 0.45, x1: -s * (w / 2 - 1.2) + 0.45, y0: 0.4, y1: 2.15, door: true };
      const wx = s * (w / 2 - 1.5);
      const ops = [dop, { x0: wx - 0.32, x1: wx + 0.32, y0: 1.2, y1: 1.85 }];
      // brick plinth, mud walls on it (thicker than pakka walls)
      g.box(-w / 2 - 0.03, w / 2 + 0.03, 0, 0.4, -d / 2 - 0.03, zf + 0.03, { cell: CELL.brick, col: [0.82, 0.78, 0.74], skip: 'ny' });
      g.box(-w / 2, w / 2, 0.4, yw, -d / 2, zf - 0.38, { ...mud, skip: 'pz py ny' });
      facade(g, -w / 2, w / 2, 0.4, yw, zf, 0.38, ops, mud, { revealCol: [0.9, 0.83, 0.72] });
      door(g, dop, zf, 0.38, 'plank');
      window_(g, ops[1], zf, 0.38, 'mud');
      // niche (taakh) beside the door
      const nx = -s * (w / 2 - 2.15);
      g.box(nx - 0.15, nx + 0.15, 1.5, 1.82, zf - 0.02, zf + 0.001, { cell: CELL.mud, col: [0.45, 0.4, 0.34], skip: 'nz ny' });
      // earthen otla
      g.box(-w / 2 + 0.3, w / 2 - 0.3, 0, 0.32, zf, zf + 0.75, { cell: CELL.mud, col: [0.9, 0.82, 0.7], skip: 'nz ny' });
      // pitched country-tile roof, ridge parallel to the front
      const zb = -d / 2 - 0.3, ze = zf + 1.0, zr = (-d / 2 + zf) / 2, yr = yw + 1.05;
      const yEave = (z) => yw - 0.15 + ((zr - Math.abs(z - zr)) / (zr - zb)) * 0;
      void yEave;
      // gable ends (mud triangles) on both sides
      for (const sx of [-1, 1]) {
        const x = sx * w / 2;
        const tri = sx > 0 ? [[x, yw, zf - 0.38], [x, yw, -d / 2], [x, yr - 0.08, zr]] : [[x, yw, -d / 2], [x, yw, zf - 0.38], [x, yr - 0.08, zr]];
        g.quad(tri[0], tri[1], tri[2], tri[2], mud);
      }
      const front = { z0: zr, y0: yr, z1: ze, y1: yw - 0.25 };
      const back = { z0: zr, y0: yr, z1: zb, y1: yw - 0.15 };
      tileSlope(g, -w / 2 - 0.25, w / 2 + 0.25, front, true);
      tileSlope(g, -w / 2 - 0.25, w / 2 + 0.25, back, false);
      // rafters showing under the front eave, a wall plate along the facade top
      const W = { cell: CELL.wood, col: [0.62, 0.54, 0.46] };
      g.box(-w / 2, w / 2, yw - 0.12, yw, zf - 0.38, zf + 0.04, W);
      for (let x = -w / 2 + 0.2; x <= w / 2 - 0.1; x += 0.6) {
        const zz0 = zf - 0.3, zz1 = ze - 0.05;
        const ya = yr - ((zz0 - zr) / (ze - zr)) * (yr - front.y1) - 0.12, yb2 = yr - ((zz1 - zr) / (ze - zr)) * (yr - front.y1) - 0.12;
        g.bar([x, ya, zz0], [x, yb2, zz1], 0.08, W);
      }
      // ridge tiles
      ridge(g, -w / 2 - 0.25, w / 2 + 0.25, yr, zr);
      info.zf = zf; info.otlaY = 0.32; info.otlaDepth = 0.75; info.door = dop;
      info.roofY = yw;
      break;
    }
    case 'H': {
      const zf = zfront - 1.15;
      const yw = 2.95;
      const mud = { cell: CELL.mud, paint: 0, col: C_MUD };
      const s = mirror ? -1 : 1;
      const dop = { x0: s * (w / 2 - 1.4) - 0.45, x1: s * (w / 2 - 1.4) + 0.45, y0: 0.35, y1: 2.15, door: true };
      const wx = -s * (w / 2 - 1.4);
      const ops = [dop, { x0: wx - 0.35, x1: wx + 0.35, y0: 1.2, y1: 1.9 }];
      g.box(-w / 2 - 0.03, w / 2 + 0.03, 0, 0.35, -d / 2 - 0.03, zf + 0.03, { cell: CELL.brick, col: [0.8, 0.76, 0.72], skip: 'ny' });
      g.box(-w / 2, w / 2, 0.35, yw, -d / 2, zf - 0.38, { ...mud, skip: 'pz py ny' });
      facade(g, -w / 2, w / 2, 0.35, yw, zf, 0.38, ops, mud, { revealCol: [0.9, 0.83, 0.72] });
      door(g, dop, zf, 0.38, 'plank');
      window_(g, ops[1], zf, 0.38, 'mud');
      // flat mud roof on wooden beams: beam ends (kadi) out of the front wall, mud slab, low rounded parapet
      const W = { cell: CELL.wood, col: [0.6, 0.52, 0.44] };
      for (let x = -w / 2 + 0.3; x < w / 2 - 0.15; x += 0.55) g.box(x - 0.06, x + 0.06, yw - 0.13, yw, zf - 0.38, zf + 0.22, W);
      g.box(-w / 2 - 0.02, w / 2 + 0.02, yw, yw + 0.22, -d / 2 - 0.02, zf + 0.06, { ...mud, colTop: [0.86, 0.78, 0.66] });
      const pt = 0.25, ph = 0.4;
      for (const [x0, x1, z0, z1] of [[-w / 2, w / 2, zf - pt + 0.06, zf + 0.06], [-w / 2, w / 2, -d / 2, -d / 2 + pt], [-w / 2, -w / 2 + pt, -d / 2 + pt, zf - pt + 0.06], [w / 2 - pt, w / 2, -d / 2 + pt, zf - pt + 0.06]]) {
        g.box(x0, x1, yw + 0.22, yw + 0.22 + ph - 0.08, z0, z1, { ...mud, skip: 'ny py' });
        g.box(x0 + 0.04, x1 - 0.04, yw + 0.22 + ph - 0.08, yw + 0.22 + ph, z0 + 0.04, z1 - 0.04, { ...mud, colTop: [0.93, 0.85, 0.73], skip: 'ny' }); // rounded-off top
      }
      // mud otla and a bamboo-and-wood ladder leaning up to the roof
      g.box(-w / 2 + 0.25, w / 2 - 0.25, 0, 0.3, zf, zf + 0.7, { cell: CELL.mud, col: [0.9, 0.82, 0.7], skip: 'nz ny' });
      const lx = -s * (w / 2 - 0.55);
      const L = { cell: CELL.wood, col: [0.78, 0.7, 0.58] };
      const zl0 = zf + 1.0, zl1 = zf + 0.08, yl = yw + 0.55;
      for (const dxl of [-0.22, 0.22]) g.bar([lx + dxl, 0, zl0], [lx + dxl, yl, zl1], 0.055, L);
      for (let k = 1; k < 10; k++) { const t = k / 10; const z = zl0 + (zl1 - zl0) * t, y = yl * t; g.bar([lx - 0.24, y, z], [lx + 0.24, y, z], 0.035, L); }
      info.zf = zf; info.otlaY = 0.3; info.otlaDepth = 0.7; info.door = dop; info.ladderX = lx;
      info.roofY = yw + 0.22;
      break;
    }
    default: throw new Error('unknown design ' + design);
  }
  return { near: g, info };
}

/** Country tiles on one slope: courses of half-round channels, each course lapping the one below (real steps, real ridges). */
function tileSlope(g, x0, x1, sl, detailed) {
  const len = Math.hypot(sl.z1 - sl.z0, sl.y1 - sl.y0);
  const courses = Math.max(3, Math.round(len / 0.36));
  const pitch = 0.25, amp = 0.05, sm = detailed ? 4 : 1;
  const nw = Math.round((x1 - x0) / pitch);
  const M = { cell: CELL.terracotta };
  for (let c = 0; c < courses; c++) {
    const t0 = c / courses, t1 = (c + 1) / courses;
    const za = sl.z0 + (sl.z1 - sl.z0) * t0, ya = sl.y0 + (sl.y1 - sl.y0) * t0;
    const zb = sl.z0 + (sl.z1 - sl.z0) * t1, yb = sl.y0 + (sl.y1 - sl.y0) * t1;
    const lift = 0.04; // the lower edge of every course sits proud of the next: the lap shadow line
    const tone = 0.86 + 0.14 * (((c * 37) % 7) / 6);
    if (!detailed) {
      g.quad([x0, yb + lift, zb], [x1, yb + lift, zb], [x1, ya, za], [x0, ya, za], { ...M, col: [tone, tone * 0.97, tone * 0.95], double: false, ...(sl.z1 < sl.z0 ? {} : {}) });
      continue;
    }
    for (let i = 0; i < nw * sm; i++) {
      const xa = x0 + ((x1 - x0) * i) / (nw * sm), xb = x0 + ((x1 - x0) * (i + 1)) / (nw * sm);
      const ha = Math.abs(Math.sin((i / sm) * Math.PI)) * amp, hb = Math.abs(Math.sin(((i + 1) / sm) * Math.PI)) * amp;
      const odd = ((i / sm) | 0) + c * 3;
      const tt = tone * (0.93 + 0.07 * ((odd * 13) % 5) / 4) * (((odd * 29) % 23) === 0 ? 0.78 : 1); // the odd darker, replaced tile
      g.quad([xa, yb + lift + ha, zb], [xb, yb + lift + hb, zb], [xb, ya + ha, za], [xa, ya + ha, za], { ...M, col: [tt, tt * 0.96, tt * 0.92] });
    }
  }
  // underside: plank sheathing seen from below
  const dn = sl.z1 > sl.z0;
  const q = [[x0, sl.y0 - 0.03, sl.z0], [x1, sl.y0 - 0.03, sl.z0], [x1, sl.y1 - 0.03, sl.z1], [x0, sl.y1 - 0.03, sl.z1]];
  if (dn) g.quad(q[0], q[1], q[2], q[3], { cell: CELL.wood, col: [0.55, 0.48, 0.42] });
  else g.quad(q[3], q[2], q[1], q[0], { cell: CELL.wood, col: [0.55, 0.48, 0.42] });
  // the eave's front edge (tile ends)
  g.quad([x0, sl.y1 - 0.03, sl.z1], [x1, sl.y1 - 0.03, sl.z1], [x1, sl.y1 + 0.06, sl.z1], [x0, sl.y1 + 0.06, sl.z1], { ...M, col: [0.7, 0.62, 0.56], double: true });
}

function ridge(g, x0, x1, y, z) {
  const n = 10, r = 0.11;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI;
    const P = (x, a) => [x, y - 0.02 + Math.sin(a) * r, z + Math.cos(a) * r];
    g.quad(P(x1, a0), P(x1, a1), P(x0, a1), P(x0, a0), { cell: CELL.terracotta, col: [0.8, 0.72, 0.66] });
  }
}

/** Far LOD: the house as a few boxes on the same atlas (body, parapet rim, a dark door, roof). ~100 triangles. */
export function buildFar(design, w, d, mirror = false) {
  const g = new GB();
  const k = DESIGN_INFO[design].kachcha;
  const zf = design === 'F' ? d / 2 - 2.3 : k ? d / 2 - 1.15 : design === 'E' ? d / 2 - 1.05 : d / 2 - STRIP;
  const storeys = DESIGN_INFO[design].storeys;
  const yr = k ? 2.85 : design === 'C' ? PL + H - 0.2 : PL + H * storeys - (design === 'D' ? 0.1 : 0);
  const wall = k ? { cell: CELL.mud, col: C_MUD } : design === 'C' ? { cell: CELL.brickWash, col: [1, 1, 1] } : { cell: CELL.plaster, paint: 1, col: [1, 1, 1] };
  g.box(-w / 2, w / 2, 0, yr, -d / 2, zf, { ...wall, skip: 'ny py' });
  if (design === 'D') g.box(-w / 2 + 0.001, w / 2 - 0.001, PL + H, yr, zf - 0.001, zf + 0.002, { cell: CELL.brick, col: [1, 1, 1], skip: 'ny py nz nx px' });
  const s = mirror ? -1 : 1;
  const dx = design === 'E' ? -s * (w / 2 - 1.05) : design === 'G' ? -s * (w / 2 - 1.2) : design === 'H' ? s * (w / 2 - 1.4) : s * (w < 7.2 ? -w / 2 + 1.35 : -0.35);
  g.quad([dx - 0.5, k ? 0.4 : PL, zf + 0.01], [dx + 0.5, k ? 0.4 : PL, zf + 0.01], [dx + 0.5, 2.5, zf + 0.01], [dx - 0.5, 2.5, zf + 0.01], { cell: CELL.wood, paint: k ? 0 : 2, col: [0.5, 0.45, 0.4] });
  if (k && design === 'G') {
    const zr = (-d / 2 + zf) / 2;
    g.quad([-w / 2 - 0.25, 2.5, zf + 1.0], [w / 2 + 0.25, 2.5, zf + 1.0], [w / 2 + 0.25, 3.8, zr], [-w / 2 - 0.25, 3.8, zr], { cell: CELL.terracotta, col: [0.9, 0.86, 0.82] });
    g.quad([w / 2 + 0.25, 2.6, -d / 2 - 0.3], [-w / 2 - 0.25, 2.6, -d / 2 - 0.3], [-w / 2 - 0.25, 3.8, zr], [w / 2 + 0.25, 3.8, zr], { cell: CELL.terracotta, col: [0.9, 0.86, 0.82] });
    for (const sx of [-1, 1]) { const x = sx * w / 2; const tri = sx > 0 ? [[x, 2.75, zf], [x, 2.75, -d / 2], [x, 3.75, zr]] : [[x, 2.75, -d / 2], [x, 2.75, zf], [x, 3.75, zr]]; g.quad(tri[0], tri[1], tri[2], tri[2], wall); }
  } else {
    // the parapet as a solid rim block (the roof inside it is never seen from the ground at far range), coping on top
    g.box(-w / 2, w / 2, yr - 0.01, yr + (k ? 0.45 : PAR), -d / 2, zf, { ...wall, skip: 'ny', colTop: C_CONC });
    g.box(-w / 2, w / 2, yr - 0.16, yr, zf, zf + 0.04, { cell: CELL.concrete, col: C_CONC, skip: 'nz' });
  }
  // front strip: a low slab (otla) so the far house keeps its step line
  if (!k) g.box(-w / 2, w / 2, 0, design === 'E' ? 0.15 : PL, zf, zf + 0.85, { cell: CELL.concrete, col: C_CONC, skip: 'ny nz' });
  if (design === 'F') g.box(-w / 2, w / 2, 0, 1.7, d / 2 - 0.2, d / 2, { cell: CELL.plaster, paint: 1, col: [1, 1, 1], skip: 'ny' });
  return g;
}
