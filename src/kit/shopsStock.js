/**
 * Trade stock for the new-layout shops (24 Nov playtest: "shops are empty inside"). Called from shopsKit.interior() for every
 * trade listed in STOCKED; the shell (floor, lining) is already drawn. Goods are plain boxes, tapered cylinders and low-poly balls
 * merged into the shop's own design geometry (concrete / wood / rust with baked colours), so a shop stays inside the same
 * five batched meshes: no new material, no new draw call, matte. No brands, no lettering on any pack.
 * Frame: x across the shop, z from zBack (shelf wall) to zFront (the open front), y up from yFloor.
 */
import * as THREE from 'three';

const rnd = (seed, k) => { const s = Math.sin(seed * 91.17 + k * 47.31) * 43758.5453; return s - Math.floor(s); };
const BRIGHT = [0xc8402f, 0x2f6fb0, 0xe0a82a, 0x3a9a58, 0xd86aa0, 0xe07a2a, 0x7a4aa8, 0x2aa0a8];
const MUTED = [0xb8654a, 0x5a7a9a, 0xc9a45a, 0x6a8a62, 0xa8708a, 0xc88a52, 0x7a6a9a, 0x5a9a9a];
const STEEL = 0xc2c4c6, BRASS = 0xc4993a, COPPER = 0xb4683c, WHITE = 0xe8e4d8, PAPER = 0xd8cfb8, DARK = 0x3a3632, CREAM = 0xe6dcc0, WOOD = 0x8a6a4a;

/** Trades this module stocks (kiosk/cart kinds are in stockStall). */
export const STOCKED = new Set(['bangle', 'watch', 'toy', 'cloth', 'utensil', 'electrical', 'medical', 'stationery', 'footwear', 'bag', 'cosmetics',
  'jeweller', 'optician', 'mobile', 'plastic', 'pooja', 'gift', 'spices', 'sweets2', 'bakery', 'dairy', 'hardware', 'tailor', 'barber', 'photo', 'cyber', 'kirana2']);

export function stockTradeOf(name) {
  const n = name.toLowerCase();
  if (/bangle|manihari/.test(n)) return 'bangle';
  if (/watch|clock/.test(n)) return 'watch';
  if (/toy|kite/.test(n)) return 'toy';
  if (/saree|cloth|readymade|uniform/.test(n) && !/books/.test(n)) return 'cloth';
  if (/utensil/.test(n)) return 'utensil';
  if (/electrical/.test(n)) return 'electrical';
  if (/medical|chemist|pharma/.test(n) && !/health/.test(n)) return 'medical';
  if (/stationery|book/.test(n)) return 'stationery';
  if (/shoe|footwear/.test(n)) return 'footwear';
  if (/bag shop/.test(n)) return 'bag';
  if (/cosmetic|beauty/.test(n)) return 'cosmetics';
  if (/jewel/.test(n)) return 'jeweller';
  if (/optic/.test(n)) return 'optician';
  if (/mobile|recharge/.test(n)) return 'mobile';
  if (/cyber/.test(n)) return 'cyber';
  if (/plastic/.test(n)) return 'plastic';
  if (/pooja/.test(n)) return 'pooja';
  if (/gift/.test(n)) return 'gift';
  if (/spice|dry fruit|pickle|papad/.test(n)) return 'spices';
  if (/bakery/.test(n)) return 'bakery';
  if (/sweet|mithai|namkeen|biscuit/.test(n) && !/tea/.test(n)) return 'sweets2';
  if (/lassi|milk|dairy/.test(n)) return 'dairy';
  if (/hardware|paint/.test(n)) return 'hardware';
  if (/tailor/.test(n)) return 'tailor';
  if (/barber/.test(n)) return 'barber';
  if (/photo/.test(n)) return 'photo';
  return null;
}

// ------------------------------------------------------------------------------------------------------ primitives
const B = (P, x, y, z, w, h, d, c, o = {}) => P.box('concrete', x, y, z, w, h, d, { color: c, skip: ['ny'], ...o });
const W_ = (P, x, y, z, w, h, d, c = WOOD, o = {}) => P.box('wood', x, y, z, w, h, d, { color: c, ...o });
const Iron = (P, x, y, z, w, h, d, c = 0x6a6a6c) => P.box('rust', x, y, z, w, h, d, { color: c });
const V = (P, x, y0, z, r0, r1, h, c, seg = 8, cap = true) => P.cyl('concrete', x, y0, z, r0, r1, h, { color: c, seg, cap });
// cylinder lying along x (len), centred on (x,y,z)
const X = (P, x, y, z, r, len, c, seg = 8, mat = 'concrete') => P.cyl(mat, 0, 0, 0, r, r, len, { color: c, seg, matrix: new THREE.Matrix4().makeTranslation(x - len / 2, y, z).multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 2)) });
// cylinder disc facing +z (a clock face, a tin lid seen from the front), centre (x,y,z), thickness len
const Z = (P, x, y, z, r, len, c, seg = 14, mat = 'concrete') => P.cyl(mat, 0, 0, 0, r, r, len, { color: c, seg, matrix: new THREE.Matrix4().makeTranslation(x, y, z - len / 2).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)) });
// low-poly ball: three tapered bands
function ball(P, x, y, z, r, c, seg = 8) {
  V(P, x, y - r, z, r * 0.5, r * 0.92, r * 0.5, c, seg, false);
  V(P, x, y - r * 0.5, z, r * 0.92, r * 0.92, r, c, seg, false);
  V(P, x, y + r * 0.5, z, r * 0.92, r * 0.45, r * 0.5, c, seg, true);
}
// ------------------------------------------------------------------------------------------- shelf structure + helpers
function shelves(P, xa, xb, z, y0, levels, sh, deep = 0.4) {
  for (let l = 0; l <= levels; l++) W_(P, (xa + xb) / 2, y0 + l * sh, z, xb - xa, 0.03, deep);
  const n = Math.max(2, Math.round((xb - xa) / 1.3) + 1);
  for (let i = 0; i < n; i++) W_(P, xa + 0.025 + (i * (xb - xa - 0.05)) / (n - 1), y0 + (levels * sh) / 2, z, 0.05, levels * sh, deep, 0x6a4e34);
}
/** Fill x from xa to xb with items; pick(k) -> { w, draw(xc) }. */
function row(xa, xb, pick, maxN = 60) {
  let x = xa;
  for (let k = 0; k < maxN; k++) {
    const it = pick(k);
    if (x + it.w > xb) break;
    it.draw(x + it.w / 2);
    x += it.w;
  }
}

/**
 * Draws the stock. Returns true when the trade is handled (the caller then skips its generic shelves).
 */
export function stockInterior(P, trade, g) {
  const { x0, x1, zBack, zFront, yFloor, yCeil, seed } = g;
  if (!STOCKED.has(trade)) return false;
  const w = x1 - x0, cx = (x0 + x1) / 2, d = zFront - zBack;
  const R = (k) => rnd(seed + trade.length * 7, k);
  const pal = (k, set = BRIGHT) => set[Math.floor(R(k) * set.length)];
  const zs = zBack + 0.24; // shelf centre line on the back wall
  const top = Math.min(yCeil - yFloor - 0.35, 2.15);
  const cz = zFront - 0.55, cxC = cx + w * 0.1, cw = w * 0.6, cTop = yFloor + 0.95; // the counter the shell draws below
  const levels = Math.max(3, Math.floor((top - 0.3) / 0.42)), sh = (top - 0.3) / levels;
  const sy = (l) => yFloor + 0.3 + l * sh + 0.015; // top of plank l (items stand here)
  const xa = x0 + 0.1, xb = x1 - 0.1;
  const counter = (mat = 0xd8d0c0) => {
    P.box('plaster', cxC, yFloor + 0.45, cz, cw, 0.9, 0.5, { color: mat });
    W_(P, cxC, yFloor + 0.93, cz, cw + 0.02, 0.05, 0.56);
  };
  const cxa = cxC - cw / 2 + 0.1, cxb = cxC + cw / 2 - 0.1, cy = cTop + 0.025; // counter-top stock line
  const gl = (h = 0.32) => { // glass-topped case: four posts and a rim (the glass itself is not drawn)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) Iron(P, cxC + sx * (cw / 2 - 0.06), cy + h / 2, cz + sz * 0.22, 0.025, h, 0.025, 0x9a9a98);
    Iron(P, cxC, cy + h, cz, cw - 0.08, 0.02, 0.5, 0x9a9a98);
  };

  switch (trade) {
    case 'bangle': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const yr = sy(l) + sh - 0.07; // rod sits just under the plank above, bunches hang on it
        X(P, (xa + xb) / 2, yr, zs, 0.008, xb - xa - 0.1, 0x6a5a48, 5, 'wood');
        row(xa + 0.1, xb - 0.1, (k) => { const c1 = pal(l * 40 + k), c2 = pal(l * 40 + k + 99, MUTED); return { w: 0.115, draw: (xc) => { X(P, xc - 0.025, yr - 0.07, zs, 0.042, 0.05, c1, 7); X(P, xc + 0.025, yr - 0.07, zs, 0.042, 0.05, c2, 7); } }; });
      }
      counter(0xd9a6b0);
      B(P, cxC, cy + 0.005, cz, cw - 0.1, 0.012, 0.44, 0x8a2e3a); // velvet mat
      for (let r = 0; r < 2; r++) row(cxa + 0.05, cxb - 0.05, (k) => ({ w: 0.1, draw: (xc) => V(P, xc, cy + 0.01, cz - 0.1 + r * 0.2, 0.04, 0.04, 0.1, pal(r * 30 + k), 7) }));
      gl(0.12);
      for (let k = 0; k < 3; k++) { const x = x0 + 0.5 + k * 0.4; X(P, x, yCeil - 0.55, cz - 0.9, 0.007, 0.34, 0x6a5a48, 5, 'wood'); row(x - 0.15, x + 0.15, (j) => ({ w: 0.075, draw: (xc) => X(P, xc, yCeil - 0.62, cz - 0.9, 0.04, 0.05, pal(k * 9 + j), 7) })); }
      return true;
    }
    case 'watch': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        if (l >= levels - 2) {
          row(xa + 0.15, xb - 0.15, (k) => ({ w: 0.42, draw: (xc) => { const r = 0.15; Z(P, xc, y + r + 0.02, zs + 0.1, r, 0.05, 0x3a2e24); Z(P, xc, y + r + 0.02, zs + 0.13, r * 0.84, 0.012, CREAM); X(P, xc, y + r + 0.02, zs + 0.14, 0.005, r * 0.6, 0x222222, 4); B(P, xc, y + r + 0.07, zs + 0.14, 0.008, r * 0.5, 0.004, 0x222222, { skip: null }); B(P, xc + 0.03, y + r + 0.02, zs + 0.14, r * 0.38, 0.008, 0.004, 0x222222, { skip: null }); } }));
        } else {
          row(xa + 0.1, xb - 0.1, (k) => (k % 3 === 0
            ? { w: 0.3, draw: (xc) => { B(P, xc, y + 0.09, zs, 0.2, 0.17, 0.1, pal(k, MUTED)); Z(P, xc, y + 0.1, zs + 0.055, 0.065, 0.01, CREAM); } }
            : { w: 0.22, draw: (xc) => { B(P, xc, y + 0.08, zs, 0.13, 0.15, 0.1, pal(k, MUTED)); Z(P, xc, y + 0.09, zs + 0.055, 0.05, 0.01, CREAM); V(P, xc, y + 0.155, zs - 0.02, 0.018, 0.018, 0.02, STEEL, 6); } }));
        }
      }
      counter(0xcfc7b4);
      gl(0.14);
      for (let k = 0; k < 3; k++) { // velvet trays of wrist watches
        const tx = cxa + 0.2 + k * (cxb - cxa - 0.4) / 2;
        B(P, tx, cy + 0.008, cz, 0.36, 0.016, 0.36, 0x2a2a3a);
        for (let j = 0; j < 6; j++) { const wx = tx - 0.12 + (j % 3) * 0.12, wz = cz - 0.08 + Math.floor(j / 3) * 0.16; B(P, wx, cy + 0.02, wz, 0.02, 0.008, 0.2, DARK); V(P, wx, cy + 0.02, wz, 0.032, 0.032, 0.012, j % 2 ? STEEL : BRASS, 8); }
      }
      // repair bench with a lamp and a pegboard of small tools on the side wall
      W_(P, x1 - 0.45, yFloor + 0.4, zBack + 1.2, 0.7, 0.04, 0.5); W_(P, x1 - 0.45, yFloor + 0.2, zBack + 1.2, 0.66, 0.4, 0.46, 0x6a4a30);
      V(P, x1 - 0.3, yFloor + 0.42, zBack + 1.2, 0.05, 0.05, 0.02, DARK); X(P, x1 - 0.3, yFloor + 0.62, zBack + 1.2, 0.008, 0.01, DARK, 4); Iron(P, x1 - 0.3, yFloor + 0.55, zBack + 1.2, 0.01, 0.28, 0.01, DARK);
      W_(P, x1 - 0.03, yFloor + 1.4, zBack + 1.2, 0.03, 0.7, 0.8, 0x7a6a50);
      for (let k = 0; k < 9; k++) Iron(P, x1 - 0.06, yFloor + 1.2 + (k % 3) * 0.2, zBack + 0.95 + Math.floor(k / 3) * 0.25, 0.015, 0.14, 0.02, k % 2 ? 0x8a8a8c : 0x5a5a5c);
      return true;
    }
    case 'toy': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.08, xb - 0.08, (k) => {
          const kind = Math.floor(R(l * 50 + k) * 5), c = pal(l * 50 + k);
          if (kind === 0) return { w: 0.3, draw: (xc) => B(P, xc, y + 0.1, zs, 0.26, 0.19, 0.2, c) };
          if (kind === 1) return { w: 0.2, draw: (xc) => ball(P, xc, y + 0.1, zs, 0.095, c) };
          if (kind === 2) return { w: 0.18, draw: (xc) => { V(P, xc, y, zs, 0.06, 0.05, 0.14, c, 6); ball(P, xc, y + 0.2, zs, 0.055, 0xe0b890, 6); } };
          if (kind === 3) return { w: 0.26, draw: (xc) => { B(P, xc, y + 0.04, zs, 0.22, 0.06, 0.1, c); B(P, xc - 0.02, y + 0.09, zs, 0.1, 0.05, 0.08, pal(k + 5)); } };
          return { w: 0.2, draw: (xc) => { ball(P, xc, y + 0.075, zs, 0.07, 0xe8c63a, 6); B(P, xc, y + 0.16, zs, 0.04, 0.03, 0.04, 0xe07a2a); } };
        });
      }
      // balloons and plastic toys hanging from the ceiling, kites on the side wall
      for (let k = 0; k < 7; k++) {
        const bx = x0 + 0.5 + (k * (w - 1)) / 6, bz = zBack + 1.2 + (k % 2) * 0.7, by = yCeil - 0.55 - (k % 3) * 0.12;
        for (let j = 0; j < 3; j++) { Iron(P, bx + (j - 1) * 0.08, by + 0.2, bz, 0.004, 0.4, 0.004, 0xcccccc); ball(P, bx + (j - 1) * 0.1, by - 0.04 - j * 0.04, bz, 0.1, pal(k * 3 + j), 7); }
      }
      for (let k = 0; k < 4; k++) { const kz = zBack + 0.6 + k * 0.75, ky = yFloor + 1.5 + (k % 2) * 0.3; B(P, x0 + 0.045, ky, kz, 0.01, 0.42, 0.42, pal(k + 3), { skip: null, matrix: new THREE.Matrix4().makeTranslation(x0 + 0.045, ky, kz).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 4)).multiply(new THREE.Matrix4().makeTranslation(-(x0 + 0.045), -ky, -kz)) }); B(P, x0 + 0.045, ky - 0.4, kz, 0.006, 0.4, 0.012, 0xe8e0d0, { skip: null }); }
      counter(0xe0d4b8);
      for (let k = 0; k < 4; k++) ball(P, cxa + 0.15 + k * 0.28, cy + 0.1, cz - 0.08, 0.1, pal(k + 8), 8);
      row(cxa, cxb, (k) => ({ w: 0.22, draw: (xc) => { B(P, xc, cy + 0.05, cz + 0.12, 0.18, 0.1, 0.14, pal(k + 40)); } }));
      for (let k = 0; k < 3; k++) ball(P, x1 - 0.3 - k * 0.3, yFloor + 0.14, zFront - 0.3, 0.13, pal(k + 70), 8); // footballs on the floor
      return true;
    }
    case 'cloth': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        if (l === 1) { row(xa + 0.1, xb - 0.1, (k) => ({ w: 0.13, draw: (xc) => V(P, xc, y, zs, 0.055, 0.055, sh - 0.1, pal(k * 3 + 7), 8) })); continue; } // bolts standing
        row(xa + 0.06, xb - 0.06, (k) => {
          const n = 3 + Math.floor(R(l * 40 + k) * 4), c = pal(l * 40 + k), c2 = pal(l * 40 + k + 17, MUTED);
          return { w: 0.35, draw: (xc) => { for (let s = 0; s < n; s++) B(P, xc, y + 0.02 + s * 0.04, zs, 0.32, 0.038, 0.3, s % 2 ? c2 : c); B(P, xc, y + 0.02 + (n - 1) * 0.04, zs + 0.155, 0.32, 0.01, 0.01, 0xd4b45a); } };
        });
      }
      counter(0xd8d0c0);
      for (let k = 0; k < 3; k++) for (let s = 0; s < 4; s++) B(P, cxa + 0.3 + k * 0.4, cy + 0.02 + s * 0.04, cz, 0.34, 0.038, 0.3, s % 2 ? pal(k + 20) : pal(k + 30, MUTED));
      W_(P, cxC, cTop + 0.07, cz + 0.24, cw - 0.1, 0.015, 0.03, 0x9a7a52); // brass-edged measuring rod
      Iron(P, x1 - 0.12, yFloor + 1.75, zBack + 1.8, 0.03, 0.03, 1.8, 0x8a8a8c); // hanging rail with saree panels
      for (let k = 0; k < 5; k++) { const pz = zBack + 1.0 + k * 0.3, c = pal(k + 60); B(P, x1 - 0.12, yFloor + 1.15, pz, 0.025, 1.1, 0.26, c, { skip: null }); B(P, x1 - 0.12, yFloor + 0.62, pz, 0.03, 0.05, 0.26, 0xd4b45a, { skip: null }); }
      return true;
    }
    case 'utensil': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.1, xb - 0.1, (k) => {
          const kind = Math.floor(R(l * 33 + k) * 4), c = R(l * 33 + k + 5) < 0.4 ? BRASS : R(l * 33 + k + 8) < 0.2 ? COPPER : STEEL;
          if (kind === 0) return { w: 0.3, draw: (xc) => { for (let s = 0; s < 3; s++) V(P, xc, y + s * 0.1, zs, 0.13 - s * 0.012, 0.145 - s * 0.012, 0.095, c, 10); } }; // pot stack, big at the bottom
          if (kind === 1) return { w: 0.3, draw: (xc) => { for (let s = 0; s < 6; s++) V(P, xc, y + s * 0.03, zs, 0.13, 0.14, 0.028, c, 12); } }; // thali stack
          if (kind === 2) return { w: 0.28, draw: (xc) => { V(P, xc, y, zs, 0.1, 0.13, 0.18, c, 10); V(P, xc, y + 0.18, zs, 0.13, 0.05, 0.03, c, 10); } }; // handi / lota
          return { w: 0.22, draw: (xc) => { for (let s = 0; s < 4; s++) V(P, xc, y + s * 0.05, zs, 0.06, 0.07, 0.048, STEEL, 8); } }; // glasses
        });
      }
      counter(0xd0c8b8);
      row(cxa, cxb, (k) => ({ w: 0.3, draw: (xc) => { for (let s = 0; s < 5; s++) V(P, xc, cy + s * 0.03, cz, 0.12, 0.13, 0.028, k % 2 ? BRASS : STEEL, 10); } }));
      Iron(P, cx, yCeil - 0.5, zBack + 1.5, w - 0.4, 0.02, 0.02, 0x7a7a7c); // rail of hanging pots
      for (let k = 0; k < 6; k++) { const px = x0 + 0.45 + k * (w - 0.9) / 5; Iron(P, px, yCeil - 0.56, zBack + 1.5, 0.006, 0.1, 0.006, 0x7a7a7c); V(P, px, yCeil - 0.8, zBack + 1.5, 0.1, 0.12, 0.16, k % 2 ? BRASS : COPPER, 9); }
      for (let k = 0; k < 3; k++) for (let s = 0; s < 3; s++) V(P, x0 + 0.4 + k * 0.5, yFloor + s * 0.2, zFront - 0.25, 0.22 - s * 0.03, 0.27 - s * 0.03, 0.19, k === 1 ? BRASS : STEEL, 10); // big dekchi stacks on the floor
      return true;
    }
    case 'electrical': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.08, xb - 0.08, (k) => {
          const kind = Math.floor(R(l * 29 + k) * 5);
          if (kind === 0) return { w: 0.2, draw: (xc) => { B(P, xc, y + 0.07, zs, 0.16, 0.13, 0.12, pal(k, [0xe8e4d8, 0x3a7ab0, 0x3a9a58, 0xd8a62a])); ball(P, xc, y + 0.2, zs, 0.05, 0xf0ead0, 7); } }; // boxed bulb
          if (kind === 1) return { w: 0.24, draw: (xc) => { V(P, xc, y, zs, 0.1, 0.1, 0.08, pal(k, [0xb83a2a, 0x2a2a2a, 0xd8b42a, 0x2a7a3a]), 10); V(P, xc, y + 0.08, zs, 0.1, 0.1, 0.08, pal(k + 3, [0xb83a2a, 0x2a2a2a, 0xd8b42a, 0x2a7a3a]), 10); } }; // wire coils
          if (kind === 2) return { w: 0.2, draw: (xc) => { for (let s = 0; s < 2; s++) for (let t = 0; t < 2; t++) B(P, xc - 0.045 + t * 0.09, y + 0.05 + s * 0.1, zs + 0.1, 0.075, 0.075, 0.025, 0xece8dc); } }; // switch plates
          if (kind === 3) return { w: 0.18, draw: (xc) => B(P, xc, y + 0.09, zs, 0.14, 0.17, 0.1, 0x7a8a9a) };
          return { w: 0.22, draw: (xc) => { B(P, xc, y + 0.04, zs, 0.2, 0.07, 0.14, 0xd4c8a0); V(P, xc, y + 0.075, zs, 0.04, 0.04, 0.05, 0x2a2a2a, 6); } };
        });
      }
      for (let k = 0; k < 5; k++) { const bx = x0 + 0.45 + k * (w - 0.9) / 4, bz = zBack + 1.3 + (k % 2) * 0.8; Iron(P, bx, yCeil - 0.35, bz, 0.006, 0.55, 0.006, 0x2a2a2a); V(P, bx, yCeil - 0.66, bz, 0.025, 0.025, 0.04, BRASS, 6); ball(P, bx, yCeil - 0.74, bz, 0.06, 0xf4ecd0, 7); } // bulbs on cords
      for (let k = 0; k < 3; k++) { const tx = x1 - 0.12 - k * 0.1; X(P, tx, yFloor + 1.1, zBack + 0.9 + k * 0.05, 0.022, 1.2, 0xf2f0e6, 6); P.cyl('concrete', tx, yFloor, zBack + 0.9, 0.022, 0.022, 1.2, { color: 0xf2f0e6, seg: 6 }); } // tube lights leaning on the wall
      counter(0xd0c8b8);
      row(cxa, cxb, (k) => ({ w: 0.2, draw: (xc) => { ball(P, xc, cy + 0.07, cz - 0.05, 0.06, 0xf4ecd0, 7); V(P, xc, cy, cz - 0.05, 0.028, 0.03, 0.03, BRASS, 6); B(P, xc, cy + 0.025, cz + 0.12, 0.08, 0.05, 0.05, 0xece8dc); } }));
      for (let k = 0; k < 2; k++) { V(P, x0 + 0.45 + k * 0.55, yFloor, zFront - 0.25, 0.26, 0.26, 0.06, 0x7a5a3a, 10); V(P, x0 + 0.45 + k * 0.55, yFloor + 0.06, zFront - 0.25, 0.13, 0.13, 0.36, k ? 0x2a2a2a : 0xb83a2a, 9); V(P, x0 + 0.45 + k * 0.55, yFloor + 0.42, zFront - 0.25, 0.26, 0.26, 0.06, 0x7a5a3a, 10); } // cable drums on the floor
      return true;
    }
    case 'medical': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.06, xb - 0.06, (k) => {
          const kind = Math.floor(R(l * 21 + k) * 4);
          if (kind === 3) return { w: 0.12, draw: (xc) => { V(P, xc, y, zs, 0.04, 0.04, 0.16, 0x8a4a22, 8); V(P, xc, y + 0.16, zs, 0.026, 0.026, 0.03, 0xe8e4d8, 8); } }; // syrup bottle
          const c = pal(l * 21 + k, [0xe8e4d8, 0xe8e4d8, 0x8ac0a0, 0x9ab8d8, 0xe8c0c0, 0xe8d48a]);
          return { w: 0.17, draw: (xc) => { B(P, xc, y + 0.07, zs, 0.15, 0.13, 0.1, c); B(P, xc, y + 0.07, zs + 0.052, 0.15, 0.03, 0.006, pal(k + 3, [0x3a7a4a, 0x2a5a9a, 0xb83a3a]), { skip: null }); } };
        });
      }
      counter(0xdad4c6);
      gl(0.2);
      row(cxa, cxb, (k) => ({ w: 0.15, draw: (xc) => { B(P, xc, cy + 0.06, cz, 0.13, 0.11, 0.09, pal(k, [0xe8e4d8, 0x8ac0a0, 0x9ab8d8])); } }));
      for (let k = 0; k < 4; k++) V(P, cxb - 0.1 - k * 0.1, cy, cz + 0.17, 0.035, 0.035, 0.12, 0xc8d8e0, 8);
      B(P, x1 - 0.3, yFloor + 0.55, zBack + 1.0, 0.5, 1.1, 0.5, 0xe8e8e4); // refrigerator
      return true;
    }
    case 'stationery': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.06, xb - 0.06, (k) => {
          const kind = Math.floor(R(l * 17 + k) * 3), c = pal(l * 17 + k);
          if (kind === 0) return { w: 0.24, draw: (xc) => { for (let s = 0; s < 6; s++) B(P, xc, y + 0.012 + s * 0.024, zs, 0.2, 0.022, 0.15, s % 2 ? c : pal(k + s, MUTED)); } }; // notebook stack
          if (kind === 1) return { w: 0.1 * 4, draw: (xc) => { for (let s = 0; s < 4; s++) B(P, xc - 0.15 + s * 0.1, y + 0.12, zs, 0.04 + 0.01 * (s % 2), 0.22 - 0.02 * (s % 3), 0.15, pal(k * 4 + s)); } }; // books standing
          return { w: 0.15, draw: (xc) => { V(P, xc, y, zs, 0.055, 0.055, 0.12, 0x5a4a3a, 8); for (let s = 0; s < 5; s++) B(P, xc - 0.03 + s * 0.015, y + 0.14, zs, 0.008, 0.1, 0.008, pal(s + k)); } }; // pen pot
        });
      }
      counter(0xd8d0c0);
      for (let k = 0; k < 3; k++) for (let s = 0; s < 5; s++) B(P, cxa + 0.2 + k * 0.4, cy + 0.015 + s * 0.026, cz, 0.22, 0.024, 0.17, pal(k * 5 + s));
      for (let k = 0; k < 3; k++) V(P, x1 - 0.3 - k * 0.15, yFloor, zBack + 1.1, 0.05, 0.05, 0.7, PAPER, 8); // chart-paper rolls
      return true;
    }
    case 'footwear': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.08, xb - 0.08, (k) => {
          const c = pal(l * 13 + k, [0x3a2e24, 0x8a5a2a, 0x2a2a38, 0xc8402f, 0x2a6a4a, 0xd8c8a0, 0x4a4a4a]);
          if (l === levels - 1) return { w: 0.3, draw: (xc) => B(P, xc, y + 0.06, zs, 0.27, 0.11, 0.17, pal(k, [0xc8a05a, 0xe0d4b8, 0xb87a5a])) }; // shoe boxes on top
          return { w: 0.27, draw: (xc) => { for (const s of [-1, 1]) { B(P, xc + s * 0.06, y + 0.012, zs, 0.085, 0.022, 0.24, c); B(P, xc + s * 0.06, y + 0.04, zs - 0.07, 0.07, 0.03, 0.1, c); B(P, xc + s * 0.06, y + 0.045, zs + 0.03, 0.06, 0.04, 0.12, 0xd8d0c0); } } };
        });
      }
      for (let k = 0; k < 5; k++) { const sx = x1 - 0.06; for (let s = 0; s < 4; s++) B(P, sx, yFloor + 1.2 + s * 0.14, zBack + 0.6 + k * 0.5, 0.02, 0.06, 0.24, pal(k + s * 3, [0x2a2a38, 0xc8402f, 0x8a5a2a, 0x2a6a4a]), { skip: null }); }
      counter(0xd0c8b8);
      row(cxa, cxb, (k) => ({ w: 0.28, draw: (xc) => { for (const s of [-1, 1]) B(P, xc + s * 0.06, cy + 0.015, cz, 0.085, 0.025, 0.24, pal(k * 2, [0x8a5a2a, 0x2a2a38, 0xc8402f])); } }));
      for (let k = 0; k < 2; k++) V(P, x0 + 0.4 + k * 0.4, yFloor, zFront - 0.3, 0.14, 0.14, 0.32, 0x7a5a3a, 8);
      return true;
    }
    case 'bag': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.08, xb - 0.08, (k) => { const c = pal(l * 9 + k); return { w: 0.36, draw: (xc) => { B(P, xc, y + 0.17, zs, 0.3, 0.32, 0.13, c); B(P, xc, y + 0.22, zs + 0.07, 0.24, 0.12, 0.02, pal(k + 2, MUTED), { skip: null }); X(P, xc, y + 0.36, zs, 0.012, 0.16, DARK, 5); } }; });
      }
      Iron(P, cx, yCeil - 0.45, zBack + 1.5, w - 0.4, 0.02, 0.02, 0x7a7a7c);
      for (let k = 0; k < 6; k++) { const bx = x0 + 0.45 + k * (w - 0.9) / 5; Iron(P, bx, yCeil - 0.52, zBack + 1.5, 0.008, 0.12, 0.008, 0x7a7a7c); B(P, bx, yCeil - 0.8, zBack + 1.5, 0.3, 0.34, 0.14, pal(k + 40), { skip: null }); }
      counter(0xd0c8b8);
      for (let k = 0; k < 3; k++) B(P, cxa + 0.2 + k * 0.4, cy + 0.12, cz, 0.3, 0.24, 0.14, pal(k + 90));
      return true;
    }
    case 'cosmetics': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.06, xb - 0.06, (k) => {
          const c = pal(l * 19 + k, [0xd86aa0, 0xe8e4d8, 0x7a4aa8, 0xc8402f, 0xe8b84a, 0x2aa0a8]);
          return R(l * 19 + k + 4) < 0.5 ? { w: 0.1, draw: (xc) => { V(P, xc, y, zs, 0.035, 0.035, 0.12, c, 8); V(P, xc, y + 0.12, zs, 0.02, 0.02, 0.03, 0xd8d0c0, 6); } } : { w: 0.14, draw: (xc) => V(P, xc, y, zs, 0.055, 0.055, 0.07, c, 8) };
        });
      }
      counter(0xd9a6b0);
      gl(0.14);
      row(cxa, cxb, (k) => ({ w: 0.11, draw: (xc) => V(P, xc, cy, cz, 0.032, 0.032, 0.1, pal(k + 30), 8) }));
      B(P, cxC, yFloor + 1.5, zBack + 0.05, 0.7, 0.9, 0.02, 0xb8c8d0, { skip: null }); // mirror on the back wall
      return true;
    }
    case 'jeweller': {
      shelves(P, xa, xb, zs, yFloor + 0.3, 3, sh * 1.1);
      for (let l = 0; l < 3; l++) { const y = yFloor + 0.3 + l * sh * 1.1 + 0.015; row(xa + 0.1, xb - 0.1, (k) => ({ w: 0.2, draw: (xc) => { B(P, xc, y + 0.04, zs, 0.16, 0.07, 0.12, pal(k + l * 7, [0x7a1a2a, 0x1a2a5a, 0x2a2a2a])); } })); }
      counter(0xcfc7b4);
      gl(0.16);
      for (let k = 0; k < 2; k++) {
        const tx = cxC + (k - 0.5) * (cw / 2 + 0.05) * 0.9;
        B(P, tx, cy + 0.01, cz, 0.4, 0.02, 0.36, 0x7a1a2a);
        for (let j = 0; j < 8; j++) { const rx = tx - 0.15 + (j % 4) * 0.1, rz = cz - 0.08 + Math.floor(j / 4) * 0.16; X(P, rx, cy + 0.03, rz, 0.014, 0.012, 0xd9b24a, 6); } // gold rings
        V(P, tx, cy + 0.02, cz + 0.08, 0.05, 0.06, 0.12, 0x4a1a1a, 8); // necklace stand
      }
      Iron(P, x1 - 0.35, yFloor + 0.5, zBack + 0.6, 0.6, 1.0, 0.5, 0x4a5a58); // steel almirah (safe)
      return true;
    }
    case 'optician': {
      shelves(P, xa, xb, zs, yFloor + 0.3, 3, sh * 1.1);
      for (let l = 0; l < 3; l++) { const y = yFloor + 0.3 + l * sh * 1.1 + 0.015; row(xa + 0.1, xb - 0.1, (k) => ({ w: 0.2, draw: (xc) => { for (const s of [-1, 1]) Z(P, xc + s * 0.045, y + 0.1, zs + 0.1, 0.035, 0.01, pal(k + l * 5, [0x2a2a2a, 0x7a4a2a, 0xc8402f, 0x2a4a7a]), 8); B(P, xc, y + 0.1, zs + 0.1, 0.03, 0.008, 0.008, DARK, { skip: null }); } })); }
      B(P, cxC, yFloor + 1.45, zBack + 0.05, 0.9, 0.7, 0.02, 0xb8c8d0, { skip: null });
      B(P, x0 + 0.04, yFloor + 1.5, zBack + 1.6, 0.012, 0.6, 0.45, 0xf0ece0, { skip: null }); for (let k = 0; k < 5; k++) B(P, x0 + 0.05, yFloor + 1.7 - k * 0.1, zBack + 1.6, 0.006, 0.03, 0.12 - k * 0.018, DARK, { skip: null }); // eye chart
      counter(0xd0c8b8); gl(0.14);
      row(cxa, cxb, (k) => ({ w: 0.2, draw: (xc) => { for (const s of [-1, 1]) Z(P, xc + s * 0.045, cy + 0.06, cz, 0.035, 0.01, pal(k + 3, [0x2a2a2a, 0x7a4a2a]), 8); } }));
      return true;
    }
    case 'mobile': case 'cyber': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.06, xb - 0.06, (k) => ({ w: 0.1, draw: (xc) => B(P, xc, y + 0.09, zs, 0.085, 0.17, 0.05, pal(l * 11 + k, [0x2a2a38, 0xe8e4d8, 0xc8402f, 0x2f6fb0, 0x3a9a58])) }));
      }
      counter(0xd0c8b8); gl(0.12);
      row(cxa, cxb, (k) => ({ w: 0.12, draw: (xc) => { B(P, xc, cy + 0.01, cz, 0.07, 0.01, 0.14, 0x1a1a22); B(P, xc, cy + 0.016, cz, 0.06, 0.002, 0.12, 0x5a8ab0); } }));
      if (trade === 'cyber') for (let k = 0; k < 2; k++) { const px = x0 + 0.5 + k * 1.1; W_(P, px, yFloor + 0.72, zBack + 0.7, 0.9, 0.04, 0.5); B(P, px, yFloor + 0.95, zBack + 0.7, 0.4, 0.3, 0.05, 0x1a1a22); B(P, px, yFloor + 0.95, zBack + 0.73, 0.35, 0.25, 0.004, 0x5a8ab0, { skip: null }); B(P, px, yFloor + 0.76, zBack + 0.95, 0.4, 0.02, 0.12, 0x2a2a2a); }
      return true;
    }
    case 'plastic': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.08, xb - 0.08, (k) => {
          const c = pal(l * 6 + k);
          return k % 3 === 0 ? { w: 0.34, draw: (xc) => { for (let s = 0; s < 3; s++) V(P, xc, y + s * 0.07, zs, 0.12, 0.155, 0.17, s % 2 ? c : pal(k + 9), 10); } } : { w: 0.2, draw: (xc) => { V(P, xc, y, zs, 0.05, 0.065, 0.1, c, 8); V(P, xc, y + 0.11, zs, 0.05, 0.065, 0.1, pal(k + 4), 8); } };
        });
      }
      counter(0xd8d0c0);
      for (let k = 0; k < 3; k++) for (let s = 0; s < 3; s++) V(P, cxa + 0.2 + k * 0.4, cy + s * 0.12, cz, 0.13, 0.17, 0.12, pal(k + s * 3), 10);
      for (let k = 0; k < 2; k++) for (let s = 0; s < 4; s++) B(P, x0 + 0.45 + k * 0.6, yFloor + 0.2 + s * 0.14, zFront - 0.3, 0.42, 0.04, 0.42, pal(k + 50, [0xe8e4d8, 0x2f6fb0, 0xc8402f]), { skip: null }); // stacked plastic chairs
      return true;
    }
    case 'pooja': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.06, xb - 0.06, (k) => {
          const kind = Math.floor(R(l * 23 + k) * 4);
          if (kind === 0) return { w: 0.1, draw: (xc) => { B(P, xc, y + 0.1, zs, 0.04, 0.2, 0.04, pal(k, [0xc8402f, 0xe0a82a, 0x3a9a58])); } }; // agarbatti packs
          if (kind === 1) return { w: 0.2, draw: (xc) => { V(P, xc, y, zs, 0.07, 0.09, 0.1, BRASS, 8); V(P, xc, y + 0.1, zs, 0.09, 0.05, 0.04, BRASS, 8); } }; // brass lamp
          if (kind === 2) return { w: 0.14, draw: (xc) => ball(P, xc, y + 0.06, zs, 0.06, 0x6a4a2a, 7) }; // coconuts
          return { w: 0.26, draw: (xc) => { for (let s = 0; s < 4; s++) B(P, xc, y + 0.018 + s * 0.036, zs, 0.24, 0.034, 0.18, s % 2 ? 0xc8402f : 0xe0a82a); } }; // red / saffron cloth
        });
      }
      for (let k = 0; k < 4; k++) { const gx = x0 + 0.5 + k * (w - 1) / 3, gz = zBack + 1.2; Iron(P, gx, yCeil - 0.55, gz, 0.004, 1.0, 0.004, 0x9a8a5a); for (let s = 0; s < 8; s++) ball(P, gx, yCeil - 0.35 - s * 0.11, gz, 0.05, s % 3 ? 0xe88a1a : 0xe8b82a, 6); } // marigold strings
      counter(0xd9c8a0);
      row(cxa, cxb, (k) => ({ w: 0.16, draw: (xc) => { V(P, xc, cy, cz, 0.04, 0.05, 0.08, k % 2 ? BRASS : COPPER, 8); } }));
      return true;
    }
    case 'gift': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.08, xb - 0.08, (k) => {
          const c = pal(l * 9 + k);
          return k % 3 === 0 ? { w: 0.24, draw: (xc) => { ball(P, xc, y + 0.08, zs, 0.08, pal(k + 5, [0xc89a6a, 0xe8c8a8, 0xa86a4a]), 8); ball(P, xc, y + 0.2, zs, 0.055, pal(k + 5, [0xc89a6a, 0xe8c8a8, 0xa86a4a]), 7); } } : { w: 0.22, draw: (xc) => { B(P, xc, y + 0.08, zs, 0.18, 0.15, 0.14, c); B(P, xc, y + 0.08, zs + 0.072, 0.02, 0.15, 0.004, 0xe8d48a, { skip: null }); B(P, xc, y + 0.158, zs, 0.18, 0.01, 0.02, 0xe8d48a); } };
        });
      }
      counter(0xd8d0c0);
      for (let k = 0; k < 4; k++) B(P, cxa + 0.15 + k * 0.28, cy + 0.07, cz, 0.2, 0.14, 0.16, pal(k + 33));
      return true;
    }
    case 'spices': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.08, xb - 0.08, (k) => ({ w: 0.2, draw: (xc) => { V(P, xc, y, zs, 0.075, 0.075, 0.2, pal(l * 8 + k, [0xb83a2a, 0xe0a82a, 0x6a4a2a, 0x8a9a3a, 0xc88a52, 0xe8e0d0]), 10); V(P, xc, y + 0.2, zs, 0.08, 0.08, 0.03, 0xd8d0c0, 10); } }));
      }
      counter(0xd8d0c0);
      for (let k = 0; k < 3; k++) { const sx = cxa + 0.25 + k * 0.42; V(P, sx, cTop, cz, 0.15, 0.17, 0.12, 0xc8b48c, 9); V(P, sx, cTop + 0.12, cz, 0.13, 0.0, 0.1, pal(k + 3, [0xb83a2a, 0xe0a82a, 0x8a5a2a]), 9); } // open sacks with heaps
      for (let k = 0; k < 3; k++) V(P, x0 + 0.4 + k * 0.45, yFloor, zFront - 0.3, 0.2, 0.17, 0.5, 0xc8b48c, 7);
      return true;
    }
    case 'sweets2': case 'bakery': {
      shelves(P, xa, xb, zs, yFloor + 0.3, 3, sh * 1.1);
      for (let l = 0; l < 3; l++) { const y = yFloor + 0.3 + l * sh * 1.1 + 0.015; row(xa + 0.08, xb - 0.08, (k) => (trade === 'bakery' ? { w: 0.3, draw: (xc) => { V(P, xc, y, zs, 0.13, 0.13, 0.04, 0xe8d8b8, 10); V(P, xc, y + 0.04, zs, 0.11, 0.1, 0.1, pal(k, [0xe8c8d8, 0xe8e0d0, 0x8a5a3a]), 10); } } : { w: 0.22, draw: (xc) => { V(P, xc, y, zs, 0.08, 0.08, 0.15, pal(k + l * 4, [0xe8e4d8, 0xc89a4a, 0xe8c63a, 0xc87a3a]), 9); V(P, xc, y + 0.15, zs, 0.085, 0.085, 0.03, 0xd8d0c0, 9); } })); }
      counter(0xe0d4b8);
      for (let r = 0; r < 2; r++) row(cxa, cxb, (k) => ({ w: 0.15, draw: (xc) => { if (trade === 'bakery') B(P, xc, cy + 0.04, cz - 0.1 + r * 0.2, 0.12, 0.08, 0.12, pal(k, [0xc89a5a, 0xa8723a, 0xe8d8b8])); else ball(P, xc, cy + 0.05, cz - 0.1 + r * 0.2, 0.05, pal(k + r * 3, [0xe08a1a, 0xe8e0d0, 0x8a5a2a, 0xe8c63a]), 7); } }));
      gl(0.2);
      return true;
    }
    case 'dairy': {
      shelves(P, xa, xb, zs, yFloor + 0.3, 3, sh * 1.1);
      for (let l = 0; l < 3; l++) { const y = yFloor + 0.3 + l * sh * 1.1 + 0.015; row(xa + 0.1, xb - 0.1, (k) => ({ w: 0.26, draw: (xc) => { if (k % 2) { ball(P, xc, y + 0.11, zs, 0.11, 0xb8654a, 8); V(P, xc, y + 0.2, zs, 0.06, 0.06, 0.05, 0xb8654a, 8); } else for (let s = 0; s < 4; s++) V(P, xc, y + s * 0.05, zs, 0.06, 0.075, 0.048, STEEL, 8); } })); }
      counter(0xd8d0c0);
      for (let k = 0; k < 3; k++) { V(P, cxa + 0.2 + k * 0.4, cy, cz, 0.12, 0.14, 0.4, STEEL, 10); V(P, cxa + 0.2 + k * 0.4, cy + 0.4, cz, 0.08, 0.06, 0.06, STEEL, 10); } // milk cans
      for (let k = 0; k < 2; k++) V(P, x0 + 0.4 + k * 0.4, yFloor, zFront - 0.3, 0.14, 0.18, 0.55, STEEL, 10);
      return true;
    }
    case 'hardware': {
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) {
        const y = sy(l);
        row(xa + 0.08, xb - 0.08, (k) => {
          const kind = Math.floor(R(l * 31 + k) * 3);
          if (kind === 0) return { w: 0.24, draw: (xc) => { for (let s = 0; s < 2; s++) V(P, xc, y + s * 0.17, zs, 0.1, 0.1, 0.16, pal(l * 31 + k + s * 3), 10); } }; // paint tins
          if (kind === 1) return { w: 0.2, draw: (xc) => B(P, xc, y + 0.06, zs, 0.16, 0.1, 0.12, 0xb8a888) }; // nut-and-bolt boxes
          return { w: 0.22, draw: (xc) => { V(P, xc, y, zs, 0.1, 0.1, 0.07, 0xd8c8a0, 9); V(P, xc, y + 0.07, zs, 0.08, 0.08, 0.07, 0xc8b078, 9); } }; // rope coil
        });
      }
      for (let k = 0; k < 5; k++) X(P, x1 - 0.1, yFloor + 0.2 + k * 0.1, zBack + 1.5 + (k % 2) * 0.1, 0.035, 1.3, 0xb8b4aa, 7); // pipes lying on a rack
      counter(0xd0c8b8);
      for (let k = 0; k < 6; k++) Iron(P, cxa + 0.2 + k * 0.2, cy + 0.04, cz, 0.04, 0.08, 0.22, 0x5a5a5c);
      return true;
    }
    case 'tailor': {
      W_(P, cx - 0.5, yFloor + 0.8, zBack + 1.0, 0.8, 0.05, 0.45); for (const s of [-1, 1]) Iron(P, cx - 0.5 + s * 0.35, yFloor + 0.4, zBack + 1.0, 0.04, 0.8, 0.3, 0x2a2a2c);
      B(P, cx - 0.55, yFloor + 0.94, zBack + 1.0, 0.3, 0.12, 0.14, 0x2a2a2c); Z(P, cx - 0.4, yFloor + 0.98, zBack + 1.0 - 0.06, 0.07, 0.02, 0x8a8a8c, 10);
      shelves(P, xa, xb, zs, yFloor + 0.3, levels, sh);
      for (let l = 0; l < levels; l++) { const y = sy(l); row(xa + 0.06, xb - 0.06, (k) => ({ w: 0.13, draw: (xc) => V(P, xc, y, zs, 0.055, 0.055, sh - 0.1, pal(l * 6 + k, k % 2 ? MUTED : BRIGHT), 8) })); }
      Iron(P, x1 - 0.12, yFloor + 1.75, zBack + 1.8, 0.03, 0.03, 1.8, 0x8a8a8c);
      for (let k = 0; k < 5; k++) { const pz = zBack + 1.0 + k * 0.3; B(P, x1 - 0.12, yFloor + 1.3, pz, 0.04, 0.8, 0.28, pal(k + 80, MUTED), { skip: null }); }
      counter(0xd0c8b8);
      for (let s = 0; s < 4; s++) B(P, cxa + 0.3, cy + 0.02 + s * 0.04, cz, 0.34, 0.038, 0.3, pal(s + 90));
      V(P, x0 + 0.4, yFloor + 0.9, zFront - 0.35, 0.16, 0.12, 0.6, 0xd8c8a8, 9); V(P, x0 + 0.4, yFloor, zFront - 0.35, 0.012, 0.012, 0.9, 0x5a4a3a, 5); // dress form
      return true;
    }
    case 'barber': {
      B(P, cx, yFloor + 1.35, zBack + 0.05, 1.3, 0.9, 0.02, 0xb8c8d0, { skip: null });
      Iron(P, cx, yFloor + 1.35, zBack + 0.03, 1.38, 0.98, 0.012, 0x5a3a24);
      W_(P, cx, yFloor + 0.82, zBack + 0.3, 1.5, 0.04, 0.3); for (let k = 0; k < 8; k++) V(P, cx - 0.6 + k * 0.17, yFloor + 0.84, zBack + 0.3, 0.035, 0.035, 0.14, pal(k, [0xe8e4d8, 0x8ac0a0, 0xc8402f, 0x2f6fb0]), 8);
      for (let k = 0; k < 2; k++) { const px = cx - 0.5 + k * 1.0, pz = zBack + 1.7; V(P, px, yFloor, pz, 0.2, 0.06, 0.3, 0x2a2a2c, 8); V(P, px, yFloor + 0.3, pz, 0.06, 0.06, 0.3, 0x8a8a8c, 6); B(P, px, yFloor + 0.62, pz, 0.5, 0.1, 0.5, 0x7a1a1a); B(P, px, yFloor + 1.0, pz - 0.22, 0.5, 0.65, 0.1, 0x7a1a1a); }
      counter(0xd0c8b8);
      return true;
    }
    case 'photo': {
      for (let k = 0; k < 8; k++) { const fx = x0 + 0.45 + (k % 4) * 0.8, fy = yFloor + 1.9 - Math.floor(k / 4) * 0.7; B(P, fx, fy, zBack + 0.05, 0.5, 0.6, 0.03, 0x5a3a24, { skip: null }); B(P, fx, fy, zBack + 0.07, 0.4, 0.5, 0.006, pal(k, MUTED), { skip: null }); }
      for (const s of [-1, 0, 1]) Iron(P, x1 - 0.5 + s * 0.12, yFloor + 0.55, zBack + 1.5 + s * 0.1, 0.02, 1.1, 0.02, 0x2a2a2c); B(P, x1 - 0.5, yFloor + 1.18, zBack + 1.5, 0.18, 0.14, 0.14, 0x1a1a1a);
      V(P, x0 + 0.6, yFloor, zBack + 1.5, 0.15, 0.15, 0.45, 0x6a4a2a, 8);
      counter(0xd0c8b8);
      for (let k = 0; k < 3; k++) B(P, cxa + 0.2 + k * 0.38, cy + 0.03, cz, 0.3, 0.05, 0.24, pal(k + 3, MUTED));
      return true;
    }
    default: return false;
  }
}

/** Stock for kiosks and carts by what they sell. Returns true if handled. y is the top of the board / counter. */
export function stockStall(P, kind, x0, x1, z, y, seed) {
  const R = (k) => rnd(seed, k), pal = (k, set = BRIGHT) => set[Math.floor(R(k) * set.length)];
  const xa = x0 + 0.1, xb = x1 - 0.1;
  switch (kind) {
    case 'fruit': row(xa, xb, (k) => ({ w: 0.2, draw: (xc) => { const c = pal(k, [0xe8c63a, 0xc8402f, 0xd8d84a, 0x6a9a3a, 0xe88a1a]); ball(P, xc, y + 0.07, z - 0.08, 0.07, c, 7); ball(P, xc, y + 0.07, z + 0.1, 0.07, pal(k + 3, [0xe8c63a, 0xc8402f, 0x6a9a3a]), 7); } })); return true;
    case 'bangle': row(xa, xb, (k) => ({ w: 0.12, draw: (xc) => { V(P, xc, y, z - 0.06, 0.04, 0.04, 0.1, pal(k), 7); V(P, xc, y, z + 0.1, 0.04, 0.04, 0.1, pal(k + 5, MUTED), 7); } })); return true;
    case 'toy': row(xa, xb, (k) => ({ w: 0.22, draw: (xc) => { ball(P, xc, y + 0.28, z, 0.1, pal(k), 7); Iron(P, xc, y + 0.12, z, 0.004, 0.2, 0.004, 0xcccccc); B(P, xc, y + 0.04, z + 0.05, 0.18, 0.08, 0.12, pal(k + 4)); } })); return true;
    case 'food': row(xa, xb, (k) => ({ w: 0.24, draw: (xc) => { V(P, xc, y, z, 0.1, 0.11, 0.06, k % 2 ? STEEL : 0x2a2826, 9); ball(P, xc, y + 0.1, z, 0.05, pal(k, [0xc87a3a, 0xe8c63a, 0xa8522a]), 6); } })); return true;
    case 'mobile': row(xa, xb, (k) => ({ w: 0.12, draw: (xc) => B(P, xc, y + 0.1, z, 0.09, 0.17, 0.05, pal(k, [0x2a2a38, 0xe8e4d8, 0xc8402f])) })); return true;
    case 'drink': row(xa, xb, (k) => ({ w: 0.2, draw: (xc) => { V(P, xc, y, z, 0.07, 0.08, 0.18, k % 2 ? STEEL : 0xe8e4d8, 9); } })); return true;
    default: return false;
  }
}

/** Which kiosk/cart stock a name sells (null = the generic crates). */
export function stallGoodsOf(name) {
  const n = name.toLowerCase();
  if (/fruit/.test(n)) return 'fruit';
  if (/bangle/.test(n)) return 'bangle';
  if (/toy|balloon/.test(n)) return 'toy';
  if (/mobile/.test(n)) return 'mobile';
  if (/lassi|juice|gola|kulfi/.test(n)) return 'drink';
  if (/golgappa|samosa|chai|tikki|bhutta|corn|chana|moongphali|namkeen|rewari|dosa|momos/.test(n)) return 'food';
  return null;
}
