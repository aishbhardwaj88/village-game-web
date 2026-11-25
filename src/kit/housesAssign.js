import { DESIGN_INFO } from './housesKit.js';
import { inRing } from './housesPlan.js';

/** Wall washes (multiplied into the limewash texture): off-white, pale yellow, pale blue, pink, faded green, cream, bare cement, peach. */
export const WASHES = [
  [0.97, 0.95, 0.9], [0.99, 0.9, 0.68], [0.8, 0.88, 0.96], [0.98, 0.82, 0.8], [0.82, 0.91, 0.79], [0.97, 0.91, 0.8], [0.82, 0.81, 0.77], [0.99, 0.86, 0.73],
  // 25 Nov variety: more paint and cement colours seen on real village walls (sun-faded, never neon)
  [0.74, 0.86, 0.88], [0.9, 0.78, 0.55], [0.7, 0.8, 0.72], [0.9, 0.72, 0.62], [0.72, 0.74, 0.8], [0.62, 0.62, 0.6], [0.86, 0.8, 0.66], [0.78, 0.7, 0.62],
];
const PAKKA_SHARES = { A: 0.22, B: 0.15, C: 0.14, D: 0.12, E: 0.13, F: 0.1 };
/** Footprint classes (front width x depth) the geometry is built for; a house takes the nearest and is scaled by the small rest
 *  (<= ~10%). The map's footprints: 5.5x6.5 (207), 6.5x8 (158), 7.5x8 (84), 6.5x5.5 (18), 8x7.5 (17), 8x6.5 (6). */
const CLASSES = [[5.5, 6.5], [6.5, 8], [7.5, 8], [6.5, 5.5], [7.5, 6.5], [6.5, 6.5]];
const classOf = (w, d) => CLASSES.reduce((b, c) => (Math.max(Math.abs(Math.log(w / c[0])), Math.abs(Math.log(d / c[1]))) < Math.max(Math.abs(Math.log(w / b[0])), Math.abs(Math.log(d / b[1]))) ? c : b), CLASSES[0]);
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export { hash };

/** Picks a design, mirror, wash and seed for each planned house. Deterministic. Neighbours never match in design AND wash. */
export function assignHouses(plan) {
  const rings = plan.map((h) => h.corners);
  const out = [];
  plan.forEach((h, i) => {
    // a back that looks onto open ground (no house right behind) marks the outer edge of a mohalla
    const bx = -h.front[0], bz = -h.front[1];
    const exposed = [1.2, 4].every((k) => { const p = [h.x + bx * (h.d / 2 + k), h.z + bz * (h.d / 2 + k)]; return !rings.some((r, j) => j !== i && Math.abs(r[0][0] - p[0]) < 12 && Math.abs(r[0][1] - p[1]) < 12 && inRing(p, r)); });
    const near = out.filter((o) => Math.hypot(o.x - h.x, o.z - h.z) < 9.5);
    let design = null, wash = 0;
    const kachcha = h.mud && (exposed ? hash(i * 3.1 + 2) < 0.55 : hash(i * 5.7 + 1) < 0.06);
    for (let t = 0; t < 6; t++) {
      if (kachcha) design = hash(i * 11 + t * 3) < 0.55 ? 'G' : 'H';
      else { let u = hash(i * 13.3 + t * 7.1), acc = 0; design = 'F'; for (const [k, v] of Object.entries(PAKKA_SHARES)) { acc += v; if (u < acc) { design = k; break; } } }
      if (h.w < 6.0 && design === 'F' && h.d < 6) design = 'A';
      wash = Math.floor(hash(i * 17.9 + t * 5.3) * WASHES.length);
      if (!near.some((o) => o.design === design) && !near.some((o) => o.wash === wash)) break;
      if (t >= 3 && !near.some((o) => o.design === design && o.wash === wash)) break;
    }
    const [cw, cd] = classOf(h.w, h.d);
    // 25 Nov wall variety: the shader picks the plaster surface (1 of 5) and tile turn (1 of 4) from the seed, so re-roll the seed
    // (deterministic, try 0 = the old seed) until no pakka neighbour within 9.5 m has the same surface, then the same turn
    const isK = DESIGN_INFO[design].kachcha, fr = (x) => x - Math.floor(x);
    const surf = (sd) => Math.floor(fr(sd * 17.31) * 5), turn = (sd) => Math.floor(fr(sd * 41.9) * 4);
    const clear = (sd) => fr(fr(sd * 17.31) * 5) > 0.08 && fr(fr(sd * 17.31) * 5) < 0.92 && fr(fr(sd * 41.9) * 4) > 0.08 && fr(fr(sd * 41.9) * 4) < 0.92;
    const nearP = isK ? [] : near.filter((o) => !o.kachcha);
    let seed = hash(i * 31.7 + 9), bestSeed = seed, bestScore = 1e9;
    for (let t = 0; t < 14 && !isK; t++) {
      const sd = t ? hash(i * 31.7 + 9 + t * 0.713) : seed;
      if (!clear(sd)) continue;
      const score = nearP.filter((o) => surf(o.seed) === surf(sd)).length * 4 + nearP.filter((o) => turn(o.seed) === turn(sd)).length;
      if (score < bestScore) { bestScore = score; bestSeed = sd; }
      if (score === 0) break;
    }
    seed = bestSeed;
    out.push({ ...h, design, wash, mirror: hash(i * 23.3 + 4) < 0.5, seed, cw, cd, sx: h.w / cw, sz: h.d / cd, kachcha: isK });
  });
  return out;
}

/** Clutter on one house front, in house-local metres: [{ kind, x, y, z, yaw }]. */
export function clutterFor(e, info) {
  if (info.noStrip || info.otlaY == null) return [];
  const w = e.cw, items = [];
  const dx0 = info.door.x0 - 0.7, dx1 = info.door.x1 + 0.7; // 0.35 m of that is the planters' flank beside the door
  const spans = [[-w / 2 + 0.35, dx0], [dx1, w / 2 - 0.35]].filter(([a, b]) => b - a > 0.5).sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
  const r = (k) => hash(e.i * 7.7 + k * 3.3);
  const zw = info.zf + 0.04;
  const y = info.otlaY;
  const pool = e.kachcha ? ['charpai', 'matka', 'bucket'] : ['charpai', 'cylinder', 'bicycle', 'tulsi', 'matka', 'bucket'];
  const n = 1 + Math.floor(r(1) * 2.4);
  let used = new Set();
  for (let k = 0; k < n && spans.length; k++) {
    let kind = pool[Math.floor(r(2 + k) * pool.length)];
    if (used.has(kind)) kind = pool[(pool.indexOf(kind) + 1) % pool.length];
    used.add(kind);
    const sp = spans[0];
    const len = sp[1] - sp[0];
    if (kind === 'charpai') {
      if (len < 2.0) continue;
      // a khaat always lies flat on LEVEL GROUND in front of the otla (never on the step, never against the wall)
      const x = sp[0] + 1.0;
      items.push({ kind, x, y: 0, z: info.zf + (info.otlaDepth || 0) + 0.45 + 0.5, yaw: 0 }); sp[0] += 2.05;
    } else if (kind === 'bicycle') { // on the ground in front of the otla, along the house
      if (!info.otlaDepth || len < 1.8) continue;
      const x = (sp[0] + sp[1]) / 2;
      items.push({ kind, x, y: 0, z: info.zf + info.otlaDepth + 0.3, yaw: r(9) < 0.5 ? 0 : Math.PI });
    } else {
      const x = sp[0] + 0.35 + r(5 + k) * Math.max(0, len - 0.7);
      items.push({ kind, x, y, z: zw + 0.32, yaw: (r(6 + k) - 0.5) * 0.6 }); sp[0] = x + 0.5;
    }
    spans.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
  }
  return items;
}
