import * as THREE from 'three';
import { Parts } from './landInstancing.js';
import { stockInterior, stockStall } from './shopsStock.js';

/**
 * Shop bodies for ?layout=new, code-built from the approved library materials only (brick, plaster, concrete, wood,
 * rusted steel). Every design is built in its own frame: footprint centred on the origin, front = +z (the place's TRUE
 * front), width W along x (parallel to the road), depth D along z, ground at y = 0. Structure is modelled, not painted:
 * shutter slats, railing bars, window grilles, shelf planks, steps, plinth bands and parapets are real geometry.
 *
 * Designs:
 *   shopHouse   two-storey shop-house round the square: raised otla + steps, rolling shutter (rolled up or down),
 *               concrete slab running out over the otla as the balcony, railing or solid parapet, balcony door + window,
 *               roof parapet, signboard on the slab edge.
 *   shop        single storey: otla + step, one shutter per bay (or open front for dhaba / tea / workshop, or a door and
 *               windows for office-like places), chajja, parapet, board above the chajja.
 *   kiosk       a steel gumti on a concrete plinth with a prop-up flap awning, or a wooden stall under a rusted sheet roof.
 *   cart        a thela: plank bed on two spoked wheels, crates of goods, rusted-sheet canopy on four poles.
 *   shed        open shed (bus shelter, cycle stand, jaggery unit): posts and a rusted sheet roof on a concrete floor.
 *   far*        a few-dozen-triangle block for distance LOD.
 * Each returns { geo: { [material]: BufferGeometry }, sign: { x, y, z, w, h } | null } (sign in the design frame).
 */

export const TILES = { brick: 1.2, plaster: 0.5, concrete: 1.0, wood: 1.0, rust: 1.0 };

// colours baked into vertices (multiplied with the texture; plaster paint comes from the instance colour instead)
const CEMENT = 0xd7d2c4; // neutral concrete (look-standard law)
const PLINTH = 0x8f8878; // plinth course (law)
const SHADE = 0x5c564c; // interior lining, reads as shade inside the shop
const DEEP = 0x2e2a25; // the back of a deep opening
const IRON = 0x8a8a8c; // rust texture pulled toward painted/oxidised iron grey
const SHUTTER = [0xa9aca6, 0x8fa39a, 0x98a6b4, 0xb4aa94]; // painted steel: grey, faded green, faded blue, buff (concrete set = paint over grimy metal)
const DOORS = [0x8a6a4a, 0x6f8a80, 0x7c8fa4, 0x9a7a52]; // wood trim, faded green, faded blue, teak
const GOODS = [0xc8a060, 0xb8463a, 0x4a7a8a, 0xd8c890, 0x7a8a4a, 0xe0d0b0, 0x8a5a7a, 0xc87a3a, 0x5a6a8a, 0xd4b46a];

let LITE = false; // mid-distance tier: no stock on the shelves, fewer slats and bars
const rnd = (seed, k) => { const s = Math.sin(seed * 91.17 + k * 47.31) * 43758.5453; return s - Math.floor(s); };

// ------------------------------------------------------------------------------------------------------------ pieces
/** Wall in the plane z = zc (thickness t along z) from x0..x1, y0..y1, with rectangular openings [{x0,x1,y0,y1}]. */
function wall(P, mat, x0, x1, y0, y1, zc, t, openings = [], color = 0xffffff, skip = null) {
  const ops = openings.slice().sort((a, b) => a.x0 - b.x0);
  let x = x0;
  const pier = (a, b) => { if (b - a > 0.005) P.box(mat, (a + b) / 2, (y0 + y1) / 2, zc, b - a, y1 - y0, t, { color, skip }); };
  for (const o of ops) {
    pier(x, o.x0);
    if (o.y0 - y0 > 0.005) P.box(mat, (o.x0 + o.x1) / 2, (y0 + o.y0) / 2, zc, o.x1 - o.x0, o.y0 - y0, t, { color, skip });
    if (y1 - o.y1 > 0.005) P.box(mat, (o.x0 + o.x1) / 2, (o.y1 + y1) / 2, zc, o.x1 - o.x0, y1 - o.y1, t, { color, skip });
    x = o.x1;
  }
  pier(x, x1);
}
/** Same along the z axis (a side wall in the plane x = xc). */
function sideWall(P, mat, z0, z1, y0, y1, xc, t, color = 0xffffff, openings = []) {
  const ops = openings.slice().sort((a, b) => a.z0 - b.z0);
  let z = z0;
  const pier = (a, b) => { if (b - a > 0.005) P.box(mat, xc, (y0 + y1) / 2, (a + b) / 2, t, y1 - y0, b - a, { color }); };
  for (const o of ops) {
    pier(z, o.z0);
    if (o.y0 - y0 > 0.005) P.box(mat, xc, (y0 + o.y0) / 2, (o.z0 + o.z1) / 2, t, o.y0 - y0, o.z1 - o.z0, { color });
    if (y1 - o.y1 > 0.005) P.box(mat, xc, (o.y1 + y1) / 2, (o.z0 + o.z1) / 2, t, y1 - o.y1, o.z1 - o.z0, { color });
    z = o.z1;
  }
  pier(z, z1);
}

/** Window in a front wall (plane z = zf, outward +z): recessed dark back, wooden frame, iron grille bars, concrete sill. */
function windowAt(P, cx, y0, w, h, zf, t, seed) {
  const zb = zf - t / 2 + 0.04;
  P.box('concrete', cx, y0 + h / 2, zb, w, h, 0.04, { color: DEEP, skip: ['nz'] });
  const fw = 0.07, frameZ = zf - 0.02, wc = DOORS[Math.floor(rnd(seed, 3) * DOORS.length)];
  P.box('wood', cx, y0 + h - fw / 2, frameZ, w, fw, 0.08, { color: wc });
  P.box('wood', cx, y0 + fw / 2, frameZ, w, fw, 0.08, { color: wc });
  P.box('wood', cx - w / 2 + fw / 2, y0 + h / 2, frameZ, fw, h - 2 * fw, 0.08, { color: wc });
  P.box('wood', cx + w / 2 - fw / 2, y0 + h / 2, frameZ, fw, h - 2 * fw, 0.08, { color: wc });
  P.box('wood', cx, y0 + h / 2, frameZ - 0.01, 0.05, h - 2 * fw, 0.06, { color: wc }); // mullion
  const bars = LITE ? 3 : Math.max(3, Math.round(w / 0.13));
  for (let i = 1; i < bars; i++) P.box('rust', cx - w / 2 + (i * w) / bars, y0 + h / 2, zf + 0.0, 0.018, h - 2 * fw, 0.018, { color: IRON, skip: ['py', 'ny'] });
  P.box('rust', cx, y0 + h * 0.5, zf, w - 2 * fw, 0.025, 0.02, { color: IRON });
  P.box('concrete', cx, y0 - 0.04, zf + 0.06, w + 0.16, 0.08, t / 2 + 0.12, { color: CEMENT }); // sill, proud of the wall
  P.box('concrete', cx, y0 + h + 0.07, zf + 0.04, w + 0.2, 0.14, t / 2 + 0.08, { color: CEMENT }); // lintel band
}

/** Door in a front wall: frame, recessed panelled leaf (two leaves when wide), iron handle, threshold. */
function doorAt(P, cx, y0, w, h, zf, t, seed) {
  const wc = DOORS[Math.floor(rnd(seed, 5) * DOORS.length)];
  const fw = 0.08, frameZ = zf - 0.02;
  P.box('wood', cx, y0 + h - fw / 2, frameZ, w, fw, 0.1, { color: wc });
  P.box('wood', cx - w / 2 + fw / 2, y0 + h / 2, frameZ, fw, h, 0.1, { color: wc });
  P.box('wood', cx + w / 2 - fw / 2, y0 + h / 2, frameZ, fw, h, 0.1, { color: wc });
  const leafZ = zf - 0.1, lw = w - 2 * fw, lh = h - fw;
  const leaves = w > 1.2 ? 2 : 1;
  for (let k = 0; k < leaves; k++) {
    const lx = cx - lw / 2 + (lw / leaves) * (k + 0.5), ww = lw / leaves - 0.01;
    P.box('wood', lx, y0 + lh / 2, leafZ, ww, lh, 0.05, { color: wc });
    // raised panels (two per leaf) and a top rail: the leaf reads as joinery, not a flat slab
    P.box('wood', lx, y0 + lh * 0.72, leafZ + 0.03, ww - 0.16, lh * 0.36, 0.02, { color: new THREE.Color(wc).multiplyScalar(0.86).getHex() });
    P.box('wood', lx, y0 + lh * 0.27, leafZ + 0.03, ww - 0.16, lh * 0.36, 0.02, { color: new THREE.Color(wc).multiplyScalar(0.86).getHex() });
    P.box('rust', lx + (k === 0 ? ww / 2 - 0.1 : -ww / 2 + 0.1), y0 + lh * 0.48, leafZ + 0.05, 0.03, 0.16, 0.03, { color: IRON });
  }
  P.box('concrete', cx, y0 + 0.02, zf - 0.05, w, 0.04, t, { color: CEMENT });
}

/** Rolling shutter in an opening (x0..x1, y0..y1) in the wall plane zf. `down` = closed. Slats are real ribs. */
function shutterAt(P, x0, x1, y0, y1, zf, down, seed) {
  const w = x1 - x0, cx = (x0 + x1) / 2, col = SHUTTER[Math.floor(rnd(seed, 7) * SHUTTER.length)];
  // guide channels both sides and the roll box at the head
  P.box('rust', x0 + 0.03, (y0 + y1) / 2, zf + 0.02, 0.06, y1 - y0, 0.07, { color: IRON });
  P.box('rust', x1 - 0.03, (y0 + y1) / 2, zf + 0.02, 0.06, y1 - y0, 0.07, { color: IRON });
  P.box('concrete', cx, y1 + 0.13, zf + 0.1, w + 0.08, 0.3, 0.26, { color: col });
  const visible = down ? y1 - y0 : 0.35 + rnd(seed, 8) * 0.25; // a rolled-up shutter still shows its bottom slats
  const slat = 0.085, n = Math.max(2, Math.round(visible / slat));
  if (LITE) P.box('concrete', cx, y1 - (n * slat) / 2, zf + 0.04, w - 0.1, n * slat, 0.03, { color: col, skip: ['nz', 'ny'] });
  else for (let i = 0; i < n; i++) {
    const yy = y1 - (i + 0.5) * slat;
    const oxid = down && i >= n - 2; // the bottom slats, scraped by the ground every day, have rusted through the paint
    P.box(oxid ? 'rust' : 'concrete', cx, yy, zf + 0.035 + (i % 2) * 0.012, w - 0.1, slat * 0.92, 0.02, { color: oxid ? 0x9a8a80 : new THREE.Color(col).multiplyScalar(0.9 + 0.1 * ((i * 7) % 3) / 2).getHex(), skip: ['nz', 'px', 'nx'] });
  }
  P.box('rust', cx, y1 - n * slat - 0.02, zf + 0.04, w - 0.1, 0.05, 0.05, { color: IRON }); // bottom bar
  if (down) { // two lock hasps at the foot
    P.box('rust', cx - w * 0.25, y0 + 0.12, zf + 0.06, 0.08, 0.12, 0.04, { color: IRON });
    P.box('rust', cx + w * 0.25, y0 + 0.12, zf + 0.06, 0.08, 0.12, 0.04, { color: IRON });
  }
}

/** Inside of an open shop: shade lining, floor, shelves with stock, a counter near the front, by trade. */
function interior(P, x0, x1, zBack, zFront, yFloor, yCeil, trade, seed) {
  const w = x1 - x0, cx = (x0 + x1) / 2, d = zFront - zBack;
  P.box('concrete', cx, yFloor + 0.01, (zBack + zFront) / 2, w, 0.02, d, { color: 0x9a948a, skip: ['ny'] });
  P.box('plaster', cx, (yFloor + yCeil) / 2, zBack + 0.02, w, yCeil - yFloor, 0.04, { color: SHADE, skip: ['nz'] });
  P.box('plaster', x0 + 0.02, (yFloor + yCeil) / 2, (zBack + zFront) / 2, 0.04, yCeil - yFloor, d, { color: SHADE, skip: ['nx'] });
  P.box('plaster', x1 - 0.02, (yFloor + yCeil) / 2, (zBack + zFront) / 2, 0.04, yCeil - yFloor, d, { color: SHADE, skip: ['px'] });
  P.box('plaster', cx, yCeil - 0.02, (zBack + zFront) / 2, w, 0.04, d, { color: 0x6a645a, skip: ['py'] });
  const g = (k) => new THREE.Color(GOODS[Math.floor(rnd(seed, k) * GOODS.length)]).multiplyScalar(0.62).getHex(); // stock sits in the shop's shade
  if (trade === 'dhaba') {
    // tables and benches, a brick chulha with a black tawa by the front
    for (let i = 0; i < 2; i++) {
      const tz = zBack + d * (0.3 + i * 0.35);
      P.box('wood', cx, yFloor + 0.74, tz, Math.min(2.2, w - 0.8), 0.05, 0.7, { color: 0x9a7a52 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.box('wood', cx + sx * (Math.min(2.2, w - 0.8) / 2 - 0.08), yFloor + 0.36, tz + sz * 0.27, 0.06, 0.72, 0.06, { color: 0x7a5a3a });
      for (const sz of [-1, 1]) P.box('wood', cx, yFloor + 0.43, tz + sz * 0.62, Math.min(2.2, w - 0.8), 0.05, 0.3, { color: 0x8a6a4a });
    }
    P.box('brick', x1 - 0.6, yFloor + 0.35, zFront - 0.45, 0.8, 0.7, 0.6, { color: 0xd8c8b8 });
    P.cyl('rust', x1 - 0.6, yFloor + 0.7, zFront - 0.45, 0.34, 0.3, 0.06, { color: 0x2a2826, seg: 12 });
    return;
  }
  if (trade === 'workshop') {
    P.box('wood', cx, yFloor + 0.45, zBack + 0.5, w * 0.7, 0.9, 0.7, { color: 0x6a5a48 }); // workbench
    for (let i = 0; i < 3; i++) P.cyl('rust', x0 + 0.5 + i * 0.25, yFloor, zBack + 1.3, 0.32, 0.32, 0.12, { color: 0x2c2a28, seg: 12 }); // tyres
    P.box('rust', x1 - 0.5, yFloor + 0.3, zBack + 1.0, 0.4, 0.6, 0.3, { color: 0x4a4a4c }); // anvil block / compressor
    for (let i = 0; i < 6; i++) P.box('rust', x0 + 0.4 + i * 0.3, yFloor + 1.5 + (i % 2) * 0.2, zBack + 0.06, 0.04, 0.4, 0.04, { color: IRON }); // hung tools
    return;
  }
  if (trade === 'office') {
    P.box('wood', cx, yFloor + 0.4, zBack + d * 0.45, 1.4, 0.05, 0.7, { color: 0x7a5a3a });
    P.box('wood', cx, yFloor + 0.2, zBack + d * 0.45, 1.3, 0.4, 0.6, { color: 0x6a4a30 });
    P.box('rust', x0 + 0.45, yFloor + 0.9, zBack + 0.3, 0.8, 1.8, 0.45, { color: 0x8a948c }); // steel almirah
    return;
  }
  if (LITE) { // mid distance: the shelf block reads as a dark stocked wall, the counter stays
    P.box('wood', cx, (yFloor + yCeil) / 2 - 0.2, zBack + 0.25, w - 0.2, yCeil - yFloor - 0.6, 0.4, { color: 0x6a5240, skip: ['nz', 'ny'] });
    P.box('plaster', cx + w * 0.1, yFloor + 0.45, zFront - 0.55, w * 0.6, 0.9, 0.5, { color: 0xd8d0c0, skip: ['ny'] });
    return;
  }
  if (stockInterior(P, trade, { x0, x1, zBack, zFront, yFloor, yCeil, seed })) return; // trade-specific stock (src/kit/shopsStock.js)
  // stock shelves on the back wall and one side: planks on uprights, boxes / bales / tins on each level
  const levels = 4, sh = (yCeil - yFloor - 0.5) / levels;
  for (const [sx0, sx1, sz, along] of [[x0 + 0.1, x1 - 0.1, zBack + 0.25, 'x'], [x0 + 0.1, x0 + 0.5, null, 'z']]) {
    if (along === 'x') {
      for (let l = 0; l <= levels; l++) P.box('wood', (sx0 + sx1) / 2, yFloor + 0.3 + l * sh, sz, sx1 - sx0, 0.03, 0.4, { color: 0x8a6a4a });
      for (const ux of [sx0 + 0.03, (sx0 + sx1) / 2, sx1 - 0.03]) P.box('wood', ux, yFloor + 0.3 + (levels * sh) / 2, sz, 0.05, levels * sh, 0.4, { color: 0x6a4e34 });
      for (let l = 0; l < levels; l++) {
        let x = sx0 + 0.08;
        for (let k = 0; x < sx1 - 0.2; k++) {
          const bw = trade === 'cloth' ? 0.36 : 0.24 + rnd(seed, l * 31 + k) * 0.26, bh = trade === 'cloth' ? sh * 0.7 : sh * (0.4 + rnd(seed, l * 17 + k) * 0.45);
          if (rnd(seed, l * 13 + k * 3) > 0.12) P.box('concrete', x + bw / 2, yFloor + 0.32 + l * sh + bh / 2, sz + 0.02, bw - 0.02, bh, trade === 'cloth' ? 0.34 : 0.26, { color: g(l * 7 + k), skip: ['nz', 'ny'] });
          x += bw;
        }
      }
    } else {
      const z0 = zBack + 0.5, z1 = zFront - 1.0;
      if (z1 - z0 < 0.4) continue;
      for (let l = 0; l <= levels; l++) P.box('wood', x0 + 0.3, yFloor + 0.3 + l * sh, (z0 + z1) / 2, 0.4, 0.03, z1 - z0, { color: 0x8a6a4a });
      for (let l = 0; l < levels; l++) {
        let z = z0 + 0.05;
        for (let k = 0; z < z1 - 0.2; k++) {
          const bw = 0.26 + rnd(seed, 90 + l * 7 + k) * 0.26, bh = sh * (0.4 + rnd(seed, 70 + l * 5 + k) * 0.45);
          P.box('concrete', x0 + 0.3, yFloor + 0.32 + l * sh + bh / 2, z + bw / 2, 0.3, bh, bw - 0.02, { color: g(50 + l * 3 + k), skip: ['nx', 'ny'] });
          z += bw;
        }
      }
    }
  }
  // counter: plastered front, wooden top, a jar row on top for the kirana / sweets trades
  const cz = zFront - 0.55;
  P.box('plaster', cx + w * 0.1, yFloor + 0.45, cz, w * 0.6, 0.9, 0.5, { color: 0xd8d0c0 });
  P.box('wood', cx + w * 0.1, yFloor + 0.93, cz, w * 0.62, 0.05, 0.56, { color: 0x8a6a4a });
  if (trade === 'kirana' || trade === 'sweets') for (let k = 0; k < 5; k++) P.cyl('concrete', cx + w * 0.1 - w * 0.25 + k * w * 0.12, yFloor + 0.96, cz, 0.08, 0.08, 0.22, { color: g(200 + k), seg: 8 });
  // sacks on the floor in front of the counter (kirana / seeds): rounded by a few sides
  if (trade === 'kirana' || trade === 'seeds') for (let k = 0; k < 3; k++) P.cyl('concrete', x0 + 0.5 + k * 0.5, yFloor, zFront - 0.25, 0.22, 0.18, 0.55, { color: 0xc8b48c, seg: 7 });
}

/** Steps (count n) in front of a platform of height h, across width w, starting at zEdge going +z. */
function steps(P, cx, w, zEdge, h, n) {
  const rise = h / (n + 1), tread = 0.3;
  for (let i = 0; i < n; i++) P.box('concrete', cx, (rise * (n - i)) / 2, zEdge + tread * (i + 0.5), w, rise * (n - i), tread, { color: CEMENT });
}

// --------------------------------------------------------------------------------------------------------- designs
/** Two-storey shop-house. opts: { W, D, H, shutterDown, balcony: 'rail'|'parapet', trade, seed } */
export function shopHouse({ W, D, H = 7, shutterDown = false, balcony = 'rail', trade = 'general', seed = 1, lite = false, homeDoor = false }) {
  LITE = lite;
  const P = new Parts(TILES);
  const t = 0.23, otla = Math.min(1.1, D * 0.16), fz = D / 2 - otla; // front wall plane
  const plinthH = 0.45, gfTop = 3.35, slab = 0.18, ffTop = H - 0.55, roofSlab = 0.16;
  // otla platform + steps (inside the plot, never on the road)
  P.box('concrete', 0, plinthH / 2, fz + (otla - 0.6) / 2, W, plinthH, otla - 0.6 + 0.02, { color: CEMENT });
  steps(P, 0, W, fz + otla - 0.6, plinthH, 2);
  // plinth course round sides/back
  P.box('concrete', 0, plinthH / 2, -D / 2 + 0.02, W + 0.06, plinthH, 0.08, { color: PLINTH });
  for (const s of [-1, 1]) P.box('concrete', s * (W / 2 + 0.01), plinthH / 2, (fz - D / 2) / 2, 0.08, plinthH, fz + D / 2, { color: PLINTH });
  // ground floor walls (plaster; side walls exposed brick on some for variety)
  const sideMat = rnd(seed, 1) < 0.35 ? 'brick' : 'plaster';
  for (const s of [-1, 1]) sideWall(P, sideMat, -D / 2, fz + t / 2, plinthH, gfTop, s * (W / 2 - t / 2), t, sideMat === 'brick' ? 0xe8ddd0 : 0xffffff);
  wall(P, 'plaster', -W / 2 + t, W / 2 - t, plinthH, gfTop, -D / 2 + t / 2, t);
  // homeDoor (S7 fixes, the shopkeeper's home and godown): the family's own panelled door beside a narrower godown shutter
  const hdw = 0.95, hdh = 2.1, hdx = W / 2 - 0.32 - 0.6;
  const ox0 = -W / 2 + 0.32, ox1 = homeDoor ? W / 2 - 0.32 - 1.35 : W / 2 - 0.32, oy0 = plinthH, oy1 = 2.75;
  const gfOps = [{ x0: ox0, x1: ox1, y0: oy0, y1: oy1 }];
  if (homeDoor) gfOps.push({ x0: hdx - hdw / 2, x1: hdx + hdw / 2, y0: plinthH, y1: plinthH + hdh });
  wall(P, 'plaster', -W / 2, W / 2, plinthH, gfTop, fz, t, gfOps);
  shutterAt(P, ox0, ox1, oy0, oy1, fz + t / 2, shutterDown, seed);
  if (homeDoor) {
    doorAt(P, hdx, plinthH, hdw, hdh, fz + t / 2, t, seed + 11);
    P.box('concrete', hdx, plinthH + hdh + 0.06, fz + t / 2 + 0.03, hdw + 0.2, 0.12, 0.1, { color: CEMENT }); // lintel
  }
  if (!shutterDown) interior(P, -W / 2 + t, W / 2 - t, -D / 2 + t + Math.max(0, D - otla - 4.2), fz - t / 2, plinthH, gfTop, trade, seed);
  // first-floor slab, running out over the otla as the balcony floor; drip edge
  P.box('concrete', 0, gfTop + slab / 2, -0.02, W + 0.04, slab, D - 0.04, { color: CEMENT });
  P.box('concrete', 0, gfTop - 0.03, D / 2 - 0.08, W + 0.04, 0.06, 0.06, { color: 0xbcb6a8 });
  const fy0 = gfTop + slab;
  // upper floor
  for (const s of [-1, 1]) sideWall(P, 'plaster', -D / 2, fz + t / 2, fy0, ffTop, s * (W / 2 - t / 2), t);
  wall(P, 'plaster', -W / 2 + t, W / 2 - t, fy0, ffTop, -D / 2 + t / 2, t);
  const dw = 0.95, dh = 2.1, dx = -W / 2 + 0.5 + dw / 2, ww = Math.min(1.4, W - dw - 1.4), wx = W / 2 - 0.45 - ww / 2, wy0 = fy0 + 0.9, wh = 1.2;
  wall(P, 'plaster', -W / 2, W / 2, fy0, ffTop, fz, t, [{ x0: dx - dw / 2, x1: dx + dw / 2, y0: fy0, y1: fy0 + dh }, { x0: wx - ww / 2, x1: wx + ww / 2, y0: wy0, y1: wy0 + wh }]);
  doorAt(P, dx, fy0, dw, dh, fz + t / 2, t, seed);
  P.box('concrete', dx, fy0 + dh + 0.06, fz + t / 2 + 0.03, dw + 0.2, 0.12, 0.1, { color: CEMENT });
  windowAt(P, wx, wy0, ww, wh, fz + t / 2, t, seed + 3);
  // window shade (small chajja)
  P.box('concrete', wx, wy0 + wh + 0.22, fz + t / 2 + 0.22, ww + 0.3, 0.07, 0.45, { color: CEMENT });
  // balcony front: iron railing or a plastered parapet, side returns
  const bz = D / 2 - 0.1;
  if (balcony === 'rail') {
    P.box('rust', 0, fy0 + 0.95, bz, W - 0.1, 0.05, 0.05, { color: IRON });
    P.box('rust', 0, fy0 + 0.12, bz, W - 0.1, 0.04, 0.04, { color: IRON });
    const nb = Math.round(W / (LITE ? 0.45 : 0.14));
    for (let i = 0; i <= nb; i++) P.box('rust', -W / 2 + 0.05 + (i * (W - 0.1)) / nb, fy0 + 0.53, bz, 0.02, 0.82, 0.02, { color: IRON, skip: ['py', 'ny'] });
    for (const s of [-1, 1]) P.box('rust', s * (W / 2 - 0.05), fy0 + 0.95, (bz + fz) / 2, 0.05, 0.05, bz - fz, { color: IRON });
  } else {
    P.box('plaster', 0, fy0 + 0.5, bz, W, 1.0, 0.12, { color: 0xffffff });
    P.box('concrete', 0, fy0 + 1.03, bz, W + 0.04, 0.06, 0.18, { color: CEMENT });
  }
  // roof slab + parapet + a cement band
  P.box('concrete', 0, ffTop + roofSlab / 2, (fz - D / 2) / 2 + 0.04, W + 0.06, roofSlab, fz + D / 2 + 0.2, { color: CEMENT });
  const pTop = H, pY0 = ffTop + roofSlab;
  P.box('plaster', 0, (pY0 + pTop) / 2, fz + 0.1, W, pTop - pY0, 0.15);
  P.box('plaster', 0, (pY0 + pTop) / 2, -D / 2 + 0.08, W, pTop - pY0, 0.15);
  for (const s of [-1, 1]) P.box('plaster', s * (W / 2 - 0.075), (pY0 + pTop) / 2, (fz - D / 2) / 2, 0.15, pTop - pY0, fz + D / 2 - 0.3);
  P.box('concrete', 0, pTop + 0.03, fz + 0.1, W + 0.04, 0.06, 0.22, { color: CEMENT });
  P.box('concrete', 0, gfTop - 0.25, fz + t / 2 + 0.02, W, 0.07, 0.04, { color: 0xbcb6a8 }); // string course under the slab
  // drain spout through the parapet
  P.box('concrete', W / 2 - 0.4, pY0 + 0.1, fz + 0.3, 0.1, 0.1, 0.45, { color: 0x8a8478 });
  // signboard on the slab edge, over the otla
  const sign = { x: 0, y: gfTop - 0.02, z: D / 2 - 0.0, w: Math.min(W - 0.25, 4.2), h: 0.72 };
  return { geo: P.build(), sign };
}

/** Single-storey shop. opts: { W, D, H, front: 'shutter'|'open'|'office', shutterDown, trade, seed, sideBrick } */
export function shop({ W, D, H = 3.6, front = 'shutter', shutterDown = false, trade = 'general', seed = 1, lite = false }) {
  LITE = lite;
  const P = new Parts(TILES);
  const t = 0.23, otla = Math.min(1.0, D * 0.18), fz = D / 2 - otla;
  const plinthH = 0.35, top = H - 0.5, slab = 0.16;
  P.box('concrete', 0, plinthH / 2, fz + (otla - 0.35) / 2, W, plinthH, otla - 0.35 + 0.02, { color: CEMENT });
  steps(P, 0, Math.min(W, 2.4), fz + otla - 0.35, plinthH, 1);
  P.box('concrete', 0, plinthH / 2, -D / 2 + 0.02, W + 0.06, plinthH, 0.08, { color: PLINTH });
  const sideMat = rnd(seed, 2) < 0.5 ? 'brick' : 'plaster';
  for (const s of [-1, 1]) {
    P.box('concrete', s * (W / 2 + 0.01), plinthH / 2, (fz - D / 2) / 2, 0.08, plinthH, fz + D / 2, { color: PLINTH });
    sideWall(P, sideMat, -D / 2, fz + t / 2, plinthH, top, s * (W / 2 - t / 2), t, sideMat === 'brick' ? 0xe8ddd0 : 0xffffff);
  }
  wall(P, rnd(seed, 4) < 0.5 ? 'brick' : 'plaster', -W / 2 + t, W / 2 - t, plinthH, top, -D / 2 + t / 2, t, [], 0xe8ddd0);
  const bays = Math.max(1, Math.round((W - 0.4) / (front === 'office' ? 3.2 : 3.4)));
  const bw = (W - 0.3) / bays, ops = [];
  for (let b = 0; b < bays; b++) {
    const x0 = -W / 2 + 0.15 + b * bw + 0.2, x1 = x0 + bw - 0.4;
    if (front === 'office') {
      const isDoor = b === Math.floor(bays / 2);
      const cx = (x0 + x1) / 2;
      if (isDoor) ops.push({ x0: cx - 0.7, x1: cx + 0.7, y0: plinthH, y1: plinthH + 2.2, kind: 'door' });
      else ops.push({ x0: cx - 0.65, x1: cx + 0.65, y0: plinthH + 0.85, y1: plinthH + 2.1, kind: 'win' });
    } else ops.push({ x0, x1, y0: plinthH, y1: Math.min(top - 0.8, plinthH + 2.4), kind: front }); // shutter head + roll box sit under the chajja
  }
  wall(P, 'plaster', -W / 2, W / 2, plinthH, top, fz, t, ops);
  ops.forEach((o, i) => {
    if (o.kind === 'door') doorAt(P, (o.x0 + o.x1) / 2, o.y0, o.x1 - o.x0, o.y1 - o.y0, fz + t / 2, t, seed + i);
    else if (o.kind === 'win') windowAt(P, (o.x0 + o.x1) / 2, o.y0, o.x1 - o.x0, o.y1 - o.y0, fz + t / 2, t, seed + i);
    else if (o.kind === 'shutter') shutterAt(P, o.x0, o.x1, o.y0, o.y1, fz + t / 2, shutterDown && i === 0, seed + i);
  });
  const anyOpen = ops.some((o) => o.kind === 'open' || (o.kind === 'shutter' && !(shutterDown && ops.length === 1)));
  if (front === 'office') interior(P, -W / 2 + t, W / 2 - t, -D / 2 + t, fz - t / 2, plinthH, top, 'office', seed);
  else if (anyOpen) interior(P, -W / 2 + t, W / 2 - t, -D / 2 + t, fz - t / 2, plinthH, top, trade, seed);
  // roof slab, chajja over the otla, parapet
  P.box('concrete', 0, top + slab / 2, (fz - D / 2) / 2 + 0.05, W + 0.08, slab, fz + D / 2 + 0.3, { color: CEMENT });
  const cj = otla - t / 2 - 0.03;
  P.box('concrete', 0, top - 0.48, fz + t / 2 + cj / 2, W + 0.04, 0.08, cj, { color: CEMENT });
  P.box('concrete', 0, top - 0.53, fz + t / 2 + cj - 0.03, W + 0.04, 0.05, 0.06, { color: 0xbcb6a8 });
  const pY0 = top + slab;
  P.box('plaster', 0, (pY0 + H) / 2, fz + 0.12, W + 0.06, H - pY0, 0.16);
  P.box('plaster', 0, (pY0 + H) / 2, -D / 2 + 0.08, W, H - pY0, 0.15);
  for (const s of [-1, 1]) P.box('plaster', s * (W / 2 - 0.075), (pY0 + H) / 2, (fz - D / 2) / 2, 0.15, H - pY0, fz + D / 2 - 0.3);
  P.box('concrete', 0, H + 0.03, fz + 0.12, W + 0.1, 0.06, 0.24, { color: CEMENT });
  // the board sits on the front wall between the chajja and the parapet cap, proud of the wall
  const sign = { x: 0, y: top - 0.4, z: fz + 0.26, w: Math.min(W - 0.3, front === 'office' ? 3.6 : 4.4), h: Math.min(0.8, H - (top - 0.4) - 0.06) }; // above the chajja, clear of it from eye height
  return { geo: P.build(), sign };
}

/** Kiosk. kind 'gumti' (steel box) or 'stall' (wooden table under a sheet roof). Fits inside W x D. */
export function kiosk({ W, D, kind = 'gumti', seed = 1, lite = false, goods = null }) {
  LITE = lite;
  const P = new Parts(TILES);
  const w = Math.min(W - 0.3, 2.6), d = Math.min(D - 0.4, 1.8);
  if (kind === 'gumti') {
    const col = SHUTTER[Math.floor(rnd(seed, 1) * SHUTTER.length)];
    P.box('concrete', 0, 0.12, 0, w + 0.2, 0.24, d + 0.2, { color: CEMENT });
    const y0 = 0.24, h = 2.0, zf = d / 2;
    // walls of sheet steel with a seam every 0.6 m (real folded seams, not paint)
    P.box('concrete', 0, y0 + h / 2, -d / 2 + 0.02, w, h, 0.04, { color: col });
    for (const s of [-1, 1]) P.box('concrete', s * (w / 2 - 0.02), y0 + h / 2, 0, 0.04, h, d, { color: col });
    P.box('concrete', 0, y0 + 0.45, zf - 0.02, w, 0.9, 0.04, { color: col }); // counter front
    P.box('concrete', 0, y0 + h - 0.2, zf - 0.02, w, 0.4, 0.04, { color: col }); // header
    for (let x = -w / 2 + 0.6; x < w / 2 - 0.1; x += 0.6) P.box('rust', x, y0 + 0.45, zf, 0.025, 0.9, 0.02, { color: IRON });
    P.box('rust', 0, y0 + h + 0.03, 0, w + 0.2, 0.06, d + 0.2, { color: 0xb09a86 }); // roof sheet, weathered to rust
    P.box('wood', 0, y0 + 0.92, zf - 0.15, w - 0.1, 0.04, 0.36, { color: 0x8a6a4a }); // counter board
    // inside: shade lining and a shelf of stock
    P.box('plaster', 0, y0 + h / 2, -d / 2 + 0.05, w - 0.1, h - 0.1, 0.02, { color: SHADE, skip: ['nz'] });
    for (let l = 0; l < 2; l++) {
      P.box('wood', 0, y0 + 1.25 + l * 0.35, -d / 2 + 0.2, w - 0.16, 0.03, 0.28, { color: 0x8a6a4a });
      for (let k = 0; k < 6; k++) P.box('concrete', -w / 2 + 0.25 + k * (w - 0.4) / 5, y0 + 1.36 + l * 0.35, -d / 2 + 0.2, 0.16, 0.2, 0.2, { color: GOODS[(seed + k + l * 3) % GOODS.length] });
    }
    if (goods && !LITE) stockStall(P, goods, -w / 2 + 0.1, w / 2 - 0.1, zf - 0.15, y0 + 0.945, seed);
    // the flap awning propped up on two rods
    const fl = 0.7;
    const flap = new THREE.Matrix4().makeTranslation(0, y0 + h - 0.05, zf).multiply(new THREE.Matrix4().makeRotationX(-0.35));
    P.box('concrete', 0, 0, fl / 2, w, 0.03, fl, { color: col, matrix: flap });
    for (const s of [-1, 1]) P.box('rust', s * (w / 2 - 0.1), y0 + h - 0.25, zf + 0.5, 0.02, 0.5, 0.02, { color: IRON });
    return { geo: P.build(), sign: { x: 0, y: y0 + h + 0.06, z: zf - 0.1, w: w * 0.95, h: 0.42 } };
  }
  // stall: plank table, four poles, rusted corrugated sheet roof, crates of goods
  const h = 2.25;
  P.box('wood', 0, 0.82, 0.1, w, 0.05, d * 0.7, { color: 0x9a7a52 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.box('wood', sx * (w / 2 - 0.06), 0.41, 0.1 + sz * (d * 0.35 - 0.06), 0.06, 0.82, 0.06, { color: 0x6a4e34 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.box('wood', sx * (w / 2 + 0.05), h / 2, sz * (d / 2), 0.07, h, 0.07, { color: 0x5a4430 });
  const ribs = LITE ? 1 : Math.round((w + 0.5) / 0.12);
  for (let i = 0; i < ribs; i++) P.box('rust', -w / 2 - 0.25 + (i + 0.5) * (w + 0.5) / ribs, h + 0.05 + (i % 2) * 0.025, 0, (w + 0.5) / ribs, 0.012, d + 0.5, { color: 0xb09a86, skip: ['px', 'nx'] });
  for (let k = 0; k < 4; k++) {
    const cx = -w / 2 + 0.3 + k * (w - 0.6) / 3;
    P.box('wood', cx, 0.95, 0.1, 0.45, 0.2, 0.35, { color: 0x9a7a52 });
    P.box('concrete', cx, 1.06, 0.1, 0.4, 0.04, 0.3, { color: GOODS[(seed * 3 + k) % GOODS.length] });
  }
  if (goods && !LITE) stockStall(P, goods, -w / 2 + 0.1, w / 2 - 0.1, 0.1, 1.07, seed);
  return { geo: P.build(), sign: { x: 0, y: h - 0.5, z: d / 2 + 0.06, w: w * 0.85, h: 0.4 } };
}

/** Thela cart on two spoked wheels with a canopy. */
export function cart({ W, D, seed = 1, food = false, lite = false, goods = null }) {
  LITE = lite;
  const P = new Parts(TILES);
  const L = Math.min(Math.max(W, D) - 0.2, 2.0), B = Math.min(Math.min(W, D) - 0.2, 1.0);
  // the cart's long axis runs along x (parallel to the road), the customer side is +z
  const bedY = 0.82;
  P.box('wood', 0, bedY, 0, L, 0.06, B, { color: 0x9a7a52 });
  for (let i = 0; i < 6; i++) P.box('wood', -L / 2 + (i + 0.5) * L / 6, bedY + 0.035, 0, L / 6 - 0.02, 0.01, B - 0.02, { color: 0x8a6a46 }); // plank seams
  for (const sz of [-1, 1]) P.box('wood', 0, bedY + 0.1, sz * (B / 2 - 0.02), L, 0.14, 0.04, { color: 0x7a5a3a });
  // wheels: rim, hub, spokes (iron), on an axle under the middle
  for (const sz of [-1, 1]) {
    const z = sz * (B / 2 + 0.06), r = 0.36;
    const rimN = LITE ? 0 : 10;
    if (LITE) P.cyl('rust', 0, -0.02, 0, r, r, 0.04, { color: 0x3a3836, seg: 8, matrix: new THREE.Matrix4().makeTranslation(0, 0.38, z).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)) });
    for (let k = 0; k < rimN; k++) {
      const a = (k / rimN) * Math.PI * 2;
      const m = new THREE.Matrix4().makeTranslation(0, 0.38, z).multiply(new THREE.Matrix4().makeRotationZ(-a)).multiply(new THREE.Matrix4().makeTranslation(0, r, 0));
      P.box('rust', 0, 0, 0, 0.24, 0.035, 0.035, { color: 0x3a3836, matrix: m, skip: ['px', 'nx'] });
    }
    for (let k = 0; k < (LITE ? 0 : 6); k++) {
      const a = (k / 6) * Math.PI;
      const m = new THREE.Matrix4().makeTranslation(0, 0.38, z).multiply(new THREE.Matrix4().makeRotationZ(a));
      P.box('rust', 0, 0, 0, 0.012, r * 2, 0.012, { color: IRON, matrix: m, skip: ['py', 'ny'] });
    }
    P.cyl('rust', 0, 0.38 - 0.05, z, 0.05, 0.05, 0.1, { color: 0x4a4644, seg: 6 });
  }
  P.box('rust', 0, 0.38, 0, 0.04, 0.04, B + 0.2, { color: IRON }); // axle
  // front legs and the push handles
  for (const sz of [-1, 1]) {
    P.box('wood', L / 2 - 0.1, bedY / 2, sz * (B / 2 - 0.08), 0.05, bedY, 0.05, { color: 0x5a4430 });
    P.box('wood', -L / 2 - 0.25, bedY + 0.04, sz * (B / 2 - 0.08), 0.6, 0.04, 0.04, { color: 0x5a4430 });
  }
  // goods: crates heaped toward the customer, or a cook-top for the food carts
  if (food) {
    P.box('rust', -L * 0.2, bedY + 0.3, 0, L * 0.45, 0.5, B * 0.7, { color: 0xb8b4aa });
    P.cyl('rust', L * 0.22, bedY + 0.05, 0, 0.28, 0.25, 0.08, { color: 0x2a2826, seg: 12 });
    P.box('concrete', L * 0.22, bedY + 0.2, -0.3, 0.3, 0.3, 0.25, { color: 0xb8b0a0 });
  } else {
    for (let k = 0; k < 4; k++) {
      const cx = -L / 2 + 0.3 + k * (L - 0.6) / 3;
      P.box('wood', cx, bedY + 0.15, 0.05, 0.42, 0.2, B * 0.7, { color: 0x9a7a52 });
      P.box('concrete', cx, bedY + 0.27, 0.05, 0.38, 0.06, B * 0.64, { color: GOODS[(seed + k * 2) % GOODS.length], skip: ['ny'] }); // the heap of produce in the crate
    }
  }
  if (goods && !LITE) stockStall(P, goods, -L / 2 + 0.1, L / 2 - 0.1, 0.05, bedY + 0.31, seed);
  // canopy: four thin poles and a rusted sheet
  const ch = 2.05;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.box('wood', sx * (L / 2 - 0.05), (bedY + ch) / 2, sz * (B / 2 - 0.05), 0.035, ch - bedY, 0.035, { color: 0x5a4430 });
  const ribs = LITE ? 1 : Math.round((L + 0.3) / 0.12);
  for (let i = 0; i < ribs; i++) P.box('rust', -L / 2 - 0.15 + (i + 0.5) * (L + 0.3) / ribs, ch + (i % 2) * 0.02, 0, (L + 0.3) / ribs, 0.012, B + 0.3, { color: 0xb09a86, skip: ['px', 'nx'] });
  return { geo: P.build(), sign: { x: 0, y: ch - 0.3, z: B / 2 + 0.17, w: L * 0.8, h: 0.34 } };
}

/** Open shed: posts on a concrete floor and a rusted corrugated roof (bus shelter, cycle stand, jaggery unit). */
export function shed({ W, D, H = 3.0, seed = 1, brickBack = false, lite = false }) {
  LITE = lite;
  const P = new Parts(TILES);
  P.box('concrete', 0, 0.08, 0, W, 0.16, D, { color: CEMENT });
  const nx = Math.max(2, Math.round(W / 3) + 1);
  for (let i = 0; i < nx; i++) for (const sz of [-1, 1]) {
    const x = -W / 2 + 0.15 + (i * (W - 0.3)) / (nx - 1);
    P.box('brick', x, H / 2, sz * (D / 2 - 0.15), 0.3, H, 0.3, { color: 0xe8ddd0 });
  }
  if (brickBack) wall(P, 'brick', -W / 2, W / 2, 0.16, H - 0.2, -D / 2 + 0.12, 0.23, [], 0xe8ddd0);
  P.box('rust', 0, H, 0, W, 0.08, 0.08, { color: IRON });
  for (const sz of [-1, 1]) P.box('rust', 0, H - 0.04, sz * (D / 2 - 0.15), W, 0.08, 0.08, { color: IRON });
  const ribs = Math.round((W + 0.4) / 0.13);
  for (let i = 0; i < ribs; i++) P.box('rust', -W / 2 - 0.2 + (i + 0.5) * (W + 0.4) / ribs, H + 0.08 + (i % 2) * 0.025, 0, (W + 0.4) / ribs, 0.012, D + 0.5, { color: 0xb09a86, skip: ['px', 'nx'] });
  // a bench along the back for the bus shelter
  P.box('concrete', 0, 0.45, -D / 2 + 0.45, W * 0.8, 0.06, 0.4, { color: CEMENT });
  for (const s of [-1, 0, 1]) P.box('concrete', s * W * 0.35, 0.22, -D / 2 + 0.45, 0.12, 0.44, 0.3, { color: CEMENT });
  return { geo: P.build(), sign: { x: 0, y: H - 0.55, z: D / 2 - 0.05, w: Math.min(W * 0.6, 3.2), h: 0.5 } };
}

/** Distance block: body, slab and parapet only (~60 triangles), same plot and height. */
export function farBlock({ W, D, H, storeys = 1 }) {
  const P = new Parts(TILES);
  const otla = storeys === 2 ? Math.min(1.1, D * 0.16) : Math.min(1.0, D * 0.18), fz = D / 2 - otla;
  P.box('plaster', 0, (H - 0.5) / 2, (fz - D / 2) / 2, W, H - 0.5, fz + D / 2, { skip: ['ny'] });
  P.box('concrete', 0, 0.2, fz + otla / 2, W, 0.4, otla, { color: CEMENT, skip: ['ny'] });
  if (storeys === 2) P.box('concrete', 0, 3.44, otla / 2, W, 0.18, D, { color: CEMENT });
  P.box('plaster', 0, H - 0.25, (fz - D / 2) / 2, W + 0.05, 0.5, fz + D / 2 + 0.05, { skip: ['ny'] });
  // a dark band where the shop front opening is, so the block still reads as a shop from afar
  P.box('concrete', 0, 1.55, fz + 0.005, W - 0.6, 2.3, 0.02, { color: 0x4a443c, skip: ['ny', 'nz'] });
  return { geo: P.build(), sign: null };
}
