/**
 * Data for src/placedPropsNew.js (26 Nov 2026): the slimmed Sketchfab props of public/assets/props_new (docs/model-size-table-26nov.md).
 * Pure data and one pure function, no imports, so tools/placed-props-new-check.mjs can import it in node.
 * Rows between the BEGIN/END markers are written by `node tools/placed-props-new-check.mjs --write` (legal spots only), verified by the same tool without flags.
 * SIZE: file -> { r: footprint radius m (overlap test), h: real height m, n: longest side m (picks the show radius), sx/sz: extra scale (flat climbers), dy: lift m (corn_a base floats 0.17 m, so -0.17) }.
 * Models are already real metres, base on y = 0 (table), so rows only carry yaw and a jitter k (0.92-1.08). Front is +z; scarecrow front is unknown, so its yaw is random.
 * PROPS row: { f, x, z, yaw, k, g?, run? }  g = place tag (no two identical neighbours inside a tag), run = fence run id (panels join end to end on 1.8 m).
 * BEDS row: instanced patch { f, cx, cz, yaw, w, d, step, seed, reg } in field region `reg`; bedPoints() expands it to the plant positions.
 */
export const SIZE = {
  scarecrow: { r: 0.6, h: 1.85, n: 1.85 }, fence_section: { r: 0.9, h: 1.0, n: 1.8 }, fence_gate: { r: 0.42, h: 0.91, n: 0.91 },
  flower_pot: { r: 0.17, h: 0.5, n: 0.5 }, money_plant_pot: { r: 0.37, h: 0.6, n: 0.74 }, pot_plant_a: { r: 0.27, h: 0.7, n: 0.7 },
  pot_plant_b: { r: 0.2, h: 0.8, n: 0.8 }, planter_long: { r: 0.4, h: 0.45, n: 0.77 }, pot_plant_c: { r: 0.24, h: 0.6, n: 0.6 },
  pot_plant_d: { r: 0.17, h: 0.7, n: 0.7 }, plant_in_pot: { r: 0.57, h: 0.8, n: 1.17 }, potted_plant_1: { r: 0.35, h: 0.6, n: 0.69 },
  potted_plant_2: { r: 0.36, h: 0.6, n: 0.7 }, potted_plant_med: { r: 0.23, h: 0.9, n: 0.9 },
  jasmine_climber: { r: 0.5, h: 2.19, n: 2.19, sz: 0.5 }, snail_vine_climber: { r: 0.8, h: 2.0, n: 3.02, sx: 0.55, sz: 0.3 },
  banana_plant: { r: 0.95, h: 3.0, n: 3.01 }, banana_tree: { r: 0.9, h: 3.18, n: 3.18 }, mango_tree: { r: 2.6, h: 6.6, n: 6.6 },
  cabbage: { r: 0.15, h: 0.21, n: 0.3 }, tomato_plant: { r: 0.33, h: 1.0, n: 1.0 }, radish_leaf: { r: 0.17, h: 0.11, n: 0.35 },
  eggplant: { r: 0.1, h: 0.05, n: 0.2 }, watermelon_bush: { r: 0.75, h: 0.59, n: 1.5 }, corn_a: { r: 0.5, h: 2.2, n: 2.2, dy: -0.17 },
  corn_b: { r: 0.45, h: 2.3, n: 2.3 }, wheat_row: { r: 0.13, h: 0.75, n: 2.69 }, wheat_clump: { r: 0.32, h: 0.9, n: 0.9 },
};
export const TRIS = { scarecrow: 1680, fence_section: 216, fence_gate: 116, flower_pot: 1938, money_plant_pot: 2677, pot_plant_a: 158, pot_plant_b: 148, planter_long: 178, pot_plant_c: 58, pot_plant_d: 48, plant_in_pot: 1842, potted_plant_1: 767, potted_plant_2: 2714, potted_plant_med: 533, jasmine_climber: 2712, snail_vine_climber: 1842, banana_plant: 2879, banana_tree: 2836, mango_tree: 1730, cabbage: 1358, tomato_plant: 1358, radish_leaf: 700, eggplant: 1358, watermelon_bush: 1350, corn_a: 1355, corn_b: 1327, wheat_row: 1398, wheat_clump: 720 };
export const FENCE_LEN = { fence_section: 1.8, fence_gate: 0.82 };

const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** Plant positions of one bed (world x, z, yaw, k). Grid in the bed's own frame (w along local x, d along local z), jitter 0.15 step, 8 % gaps. wheat_row strips stay parallel to the bed. */
export function bedPoints(b) {
  const R = rng(b.seed), out = [], nx = Math.max(1, Math.floor(b.w / b.step)), nz = Math.max(1, Math.floor(b.d / (b.f === 'wheat_row' ? 2.8 : b.step)));
  const sx = b.w / nx, sz = b.d / nz, c = Math.cos(b.yaw), s = Math.sin(b.yaw), strip = b.f === 'wheat_row';
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (!strip && R() < 0.08) continue;
    const lx = -b.w / 2 + (i + 0.5) * sx + (R() - 0.5) * 0.3 * (strip ? 0.3 : b.step), lz = -b.d / 2 + (j + 0.5) * sz + (R() - 0.5) * 0.3 * (strip ? 0.3 : b.step);
    out.push({ x: +(b.cx + c * lx + s * lz).toFixed(2), z: +(b.cz - s * lx + c * lz).toFixed(2), yaw: strip ? b.yaw + (R() - 0.5) * 0.12 : R() * Math.PI * 2, k: +(0.92 + R() * 0.16).toFixed(2) });
  }
  return out;
}

// BEGIN ROWS
export const PROPS = [
  { f: 'scarecrow', x: 888.54, z: 2.65, yaw: 0.842, k: 1.03 },
  { f: 'scarecrow', x: 880.66, z: 146.25, yaw: 5.667, k: 1.07 },
  { f: 'scarecrow', x: 886.63, z: 221.54, yaw: 0.959, k: 0.97 },
  { f: 'scarecrow', x: 494.88, z: 139.42, yaw: 4.121, k: 0.98 },
  { f: 'scarecrow', x: 588.72, z: -141.53, yaw: 4.391, k: 1.03 },
  { f: 'scarecrow', x: 545.31, z: -236.44, yaw: 4.83, k: 1 },
  { f: 'scarecrow', x: 464.15, z: -225.61, yaw: 3.204, k: 0.99 },
  { f: 'scarecrow', x: 344.47, z: -208.8, yaw: 5.267, k: 0.96 },
  { f: 'scarecrow', x: 754.23, z: 198.63, yaw: 4.545, k: 0.94 },
  { f: 'scarecrow', x: 771.99, z: 146.35, yaw: 5.635, k: 1 },
  { f: 'fence_section', x: 641.15, z: 46.19, yaw: -1.376, k: 1, run: 'run0' },
  { f: 'fence_section', x: 641.5, z: 47.96, yaw: -1.376, k: 1, run: 'run0' },
  { f: 'fence_gate', x: 641.75, z: 49.24, yaw: -1.376, k: 1, run: 'run0' },
  { f: 'fence_section', x: 551.62, z: -54.81, yaw: 3.014, k: 1, run: 'run1' },
  { f: 'fence_section', x: 549.83, z: -55.04, yaw: 3.014, k: 1, run: 'run1' },
  { f: 'fence_gate', x: 548.53, z: -55.2, yaw: 3.014, k: 1, run: 'run1' },
  { f: 'fence_section', x: 681.26, z: -33.8, yaw: 1.477, k: 1, run: 'run2' },
  { f: 'fence_section', x: 681.43, z: -35.59, yaw: 1.477, k: 1, run: 'run2' },
  { f: 'fence_gate', x: 681.55, z: -36.9, yaw: 1.477, k: 1, run: 'run2' },
  { f: 'fence_section', x: 684.05, z: -40.06, yaw: -0.094, k: 1, run: 'run3' },
  { f: 'fence_section', x: 685.84, z: -39.89, yaw: -0.094, k: 1, run: 'run3' },
  { f: 'fence_gate', x: 687.14, z: -39.77, yaw: -0.094, k: 1, run: 'run3' },
  { f: 'fence_section', x: 525.89, z: 60, yaw: -3.02, k: 1, run: 'run4' },
  { f: 'fence_section', x: 524.1, z: 60.22, yaw: -3.02, k: 1, run: 'run4' },
  { f: 'fence_gate', x: 522.8, z: 60.38, yaw: -3.02, k: 1, run: 'run4' },
  { f: 'pot_plant_b', x: 732.41, z: 90.35, yaw: 5.151, k: 1.01, g: 'house398' },
  { f: 'pot_plant_d', x: 731.79, z: 88.34, yaw: 0.701, k: 0.95, g: 'house398' },
  { f: 'pot_plant_a', x: 581.7, z: -98.53, yaw: 2.027, k: 1.05, g: 'house221' },
  { f: 'potted_plant_2', x: 581.23, z: -97.53, yaw: 2.572, k: 1, g: 'house221' },
  { f: 'potted_plant_med', x: 733.82, z: 37.58, yaw: 1.383, k: 1.08, g: 'house372' },
  { f: 'potted_plant_1', x: 733.91, z: 36.63, yaw: 2.652, k: 0.94, g: 'house372' },
  { f: 'money_plant_pot', x: 684.07, z: -56.41, yaw: 2.635, k: 1.01, g: 'house439' },
  { f: 'pot_plant_d', x: 681.89, z: -55.7, yaw: 1.431, k: 0.93, g: 'house439' },
  { f: 'pot_plant_c', x: 684.28, z: -55.11, yaw: 6.075, k: 0.99, g: 'house439' },
  { f: 'pot_plant_b', x: 683.52, z: -55.4, yaw: 5.174, k: 0.99, g: 'house439' },
  { f: 'potted_plant_2', x: 746.99, z: 1.84, yaw: 0.74, k: 1.04, g: 'house197' },
  { f: 'pot_plant_d', x: 745.68, z: 1.9, yaw: 5.864, k: 1.07, g: 'house197' },
  { f: 'pot_plant_b', x: 743.66, z: 0.72, yaw: 2.593, k: 0.97, g: 'house197' },
  { f: 'pot_plant_a', x: 606.96, z: -68.79, yaw: 2.95, k: 0.99, g: 'house417' },
  { f: 'potted_plant_med', x: 605.75, z: -69.26, yaw: 0.988, k: 1.05, g: 'house417' },
  { f: 'pot_plant_d', x: 659.03, z: -24.39, yaw: 2.28, k: 0.95, g: 'house430' },
  { f: 'potted_plant_2', x: 658.43, z: -24.94, yaw: 6.248, k: 0.99, g: 'house430' },
  { f: 'potted_plant_1', x: 657.14, z: -25.41, yaw: 0.155, k: 0.99, g: 'house430' },
  { f: 'pot_plant_b', x: 799.5, z: -10.09, yaw: 0.584, k: 0.93, g: 'house183' },
  { f: 'pot_plant_d', x: 799.06, z: -8.34, yaw: 4.288, k: 1.08, g: 'house183' },
  { f: 'money_plant_pot', x: 735.29, z: 33.33, yaw: 5.929, k: 0.93, g: 'house357' },
  { f: 'potted_plant_1', x: 734.24, z: 32.25, yaw: 1.359, k: 1.03, g: 'house357' },
  { f: 'potted_plant_med', x: 735.3, z: 35.25, yaw: 2.159, k: 0.95, g: 'house357' },
  { f: 'pot_plant_d', x: 558.38, z: -45.62, yaw: 0.895, k: 1, g: 'house408' },
  { f: 'flower_pot', x: 557.76, z: -45.79, yaw: 5.414, k: 0.95, g: 'house408' },
  { f: 'pot_plant_c', x: 798.99, z: -31.49, yaw: 0.214, k: 1, g: 'house165' },
  { f: 'plant_in_pot', x: 797.58, z: -29.42, yaw: 3.64, k: 1.02, g: 'house165' },
  { f: 'planter_long', x: 582.09, z: -12.93, yaw: 4.672, k: 1.02, g: 'shop0' },
  { f: 'potted_plant_2', x: 582.8, z: -13.65, yaw: 1.549, k: 0.99, g: 'shop0' },
  { f: 'pot_plant_a', x: 1000000, z: 1000000, yaw: 4.938, k: 0.93, g: 'school' },
  { f: 'planter_long', x: 575.09, z: 101.3, yaw: 1.511, k: 0.94, g: 'school' },
  { f: 'pot_plant_b', x: 572.6, z: 102.45, yaw: 1.68, k: 1.04, g: 'school' },
  { f: 'plant_in_pot', x: 539.83, z: 99.99, yaw: 6, k: 0.95, g: 'school' },
  { f: 'potted_plant_1', x: 540.24, z: 106.92, yaw: 0.133, k: 1.06, g: 'school' },
  { f: 'pot_plant_b', x: 539.95, z: 19.91, yaw: 3.752, k: 0.98, g: 'pancha' },
  { f: 'pot_plant_d', x: 563.87, z: 23.93, yaw: 4.914, k: 0.98, g: 'pancha' },
  { f: 'pot_plant_a', x: 548.79, z: 9.96, yaw: 4.322, k: 0.98, g: 'pancha' },
  { f: 'plant_in_pot', x: 535.04, z: 11.43, yaw: 2.907, k: 1, g: 'pancha' },
  { f: 'flower_pot', x: 572.68, z: 79.76, yaw: 5.961, k: 0.96, g: 'angan' },
  { f: 'potted_plant_med', x: 570.18, z: 80.88, yaw: 4.906, k: 1.08, g: 'angan' },
  { f: 'planter_long', x: 581.76, z: 92.37, yaw: 4.093, k: 1.08, g: 'angan' },
  { f: 'jasmine_climber', x: 584.23, z: -31.49, yaw: -1.681, k: 1.05, host: 'house#431' },
  { f: 'snail_vine_climber', x: 673.86, z: 47.99, yaw: -0.08, k: 0.97, host: 'house#47' },
  { f: 'jasmine_climber', x: 709.75, z: 58.62, yaw: -0.036, k: 0.95, host: 'house#402' },
  { f: 'snail_vine_climber', x: 455.23, z: 43.43, yaw: -3.095, k: 0.93, host: 'house#317' },
  { f: 'jasmine_climber', x: 453.6, z: -52.53, yaw: 1.571, k: 1.03, host: 'house#268' },
  { f: 'snail_vine_climber', x: 456.67, z: 63.77, yaw: -3.095, k: 0.94, host: 'house#315' },
  { f: 'jasmine_climber', x: 440.24, z: 47.26, yaw: -1.546, k: 1, host: 'house#305' },
  { f: 'snail_vine_climber', x: 433.12, z: -41.18, yaw: -1.571, k: 0.97, host: 'house#271' },
  { f: 'banana_tree', x: 614.96, z: -97.06, yaw: 0.04, k: 0.93 },
  { f: 'banana_tree', x: 617.67, z: -97.93, yaw: 2.626, k: 1.07 },
  { f: 'banana_tree', x: 616.95, z: -95.11, yaw: 4, k: 1 },
  { f: 'banana_tree', x: 721.13, z: 75.64, yaw: 5.931, k: 0.94 },
  { f: 'banana_tree', x: 724.02, z: 76.92, yaw: 2.727, k: 1.01 },
  { f: 'banana_tree', x: 723.28, z: 73.91, yaw: 2.546, k: 0.96 },
  { f: 'banana_tree', x: 680.9, z: -67.06, yaw: 4.601, k: 1 },
  { f: 'banana_tree', x: 684.86, z: -68.45, yaw: 2.458, k: 0.95 },
  { f: 'banana_tree', x: 683.93, z: -65.72, yaw: 1.375, k: 0.99 },
  { f: 'mango_tree', x: 594.25, z: 164.51, yaw: 2.056, k: 0.94 },
  { f: 'mango_tree', x: 638.9, z: -214.69, yaw: 5.732, k: 0.98 },
  { f: 'mango_tree', x: 874.03, z: -170.52, yaw: 5.18, k: 0.99 },
  { f: 'mango_tree', x: 711.47, z: 68.94, yaw: 2.952, k: 0.94 },
  { f: 'mango_tree', x: 582.58, z: 322.44, yaw: 2.827, k: 0.97 },
];
export const BEDS = [
  { f: 'cabbage', cx: 617.76, cz: -139.83, yaw: 0, w: 4.2, d: 2.8, step: 0.7, seed: 100, reg: 'c10' },
  { f: 'radish_leaf', cx: 615.8, cz: -136.09, yaw: -0.192, w: 4, d: 2.2, step: 0.5, seed: 108, reg: 'c10' },
  { f: 'tomato_plant', cx: 570.43, cz: -138.73, yaw: 0, w: 4.5, d: 2.7, step: 0.9, seed: 3109, reg: 'c39' },
  { f: 'eggplant', cx: 793.67, cz: -130.77, yaw: 0, w: 3.6, d: 2.4, step: 0.6, seed: 3128, reg: 'c9' },
  { f: 'cabbage', cx: 719.75, cz: 140.58, yaw: 0, w: 4.2, d: 2.8, step: 0.7, seed: 3129, reg: 'c7' },
  { f: 'watermelon_bush', cx: 777.67, cz: 299.8, yaw: 0, w: 7.2, d: 3.6, step: 1.8, seed: 3130, reg: 'c21' },
  { f: 'corn_a', cx: 744.01, cz: 142.62, yaw: 0, w: 4.4, d: 3.3, step: 1.1, seed: 3131, reg: 'c21' },
  { f: 'corn_b', cx: 778.1, cz: 247.22, yaw: 0.066, w: 5.5, d: 3.3, step: 1.1, seed: 6133, reg: 'c21' },
  { f: 'wheat_row', cx: 533.76, cz: -250.85, yaw: 0.183, w: 4.4, d: 5.6, step: 0.55, seed: 6135, reg: 'c32' },
  { f: 'wheat_clump', cx: 442.92, cz: -242.68, yaw: -0.142, w: 4.8, d: 3.2, step: 0.8, seed: 6138, reg: 'c41' },
  { f: 'wheat_clump', cx: 357.66, cz: -222.1, yaw: 0, w: 4.8, d: 3.2, step: 0.8, seed: 6139, reg: 'c42' },
  { f: 'tomato_plant', cx: 784.42, cz: 145.97, yaw: 0.04, w: 4.5, d: 2.7, step: 0.9, seed: 6142, reg: 'c7' },
];
// END ROWS
