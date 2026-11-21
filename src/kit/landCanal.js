import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createWaterMaterial, channelWaterGeometry } from '../water.js';
import { Parts } from './landInstancing.js';
import { landMaterial } from './landMaterials.js';
import { fieldMaterial, paint } from './landFields.js';
import { labelKey, labelName, ringCentre } from './landLayout.js';

/**
 * The nahar of the approved map (?layout=new): north-south on the east side, centre x 824, 6 m of water, 690 m long.
 * The game's ground is flat (y 0, no dug terrain outside the old dips), so the canal is an embanked, cement-lined channel,
 * the way branch canals across western UP actually run: lined walls rise 0.55 m above the fields, grassy bunds slope down
 * on both sides, the water stands 0.2 m above field level inside the lining. Bridges are low humped slabs (pulia) with
 * parapets and ramps where the highway, the east road and the field tracks cross; washing steps (ghat) on the west bank;
 * the kachcha bank track runs along the east bund (x 831.5).
 * Draw calls: water 1, concrete (lining, bridges, ghat) 1, grass bunds + bank track 1 (the field material) = 3.
 * group.userData.heightAt(x, z) = walk height on the bridges, ramps and bunds (Wiring needed: main.js groundHeightAt).
 */
const X = 824, HALF = 3, LIP = 0.55, WATER_Y = 0.2, WALL_T = 0.25, BUND = 2.2, Z0 = -340, Z1 = 350;
const DECK = 0.8, RAMP = 4.5, DECK_X0 = X - HALF - WALL_T - BUND + 0.2, DECK_X1 = X + HALF + WALL_T + BUND - 0.2;
const CEMENT = 0xcfc9ba, OLD = 0xb5ae9e;

export async function build(map) {
  const bridges = [], ghats = [];
  for (const o of map.objects) {
    const key = labelKey(o), name = labelName(o), r = o.rings?.[0];
    if (!r) continue;
    const zs = r.map((p) => p[1]), xs = r.map((p) => p[0]);
    if (key === 'canal_new' && name === 'bridge') bridges.push({ z0: Math.min(...zs), z1: Math.max(...zs) });
    if (key === 'new_ghat') ghats.push({ x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) });
  }
  // merge overlapping bridge rings (the east road crossing is drawn twice)
  bridges.sort((a, b) => a.z0 - b.z0);
  const spans = [];
  for (const b of bridges) { const last = spans[spans.length - 1]; if (last && b.z0 <= last.z1 + 0.5) last.z1 = Math.max(last.z1, b.z1); else spans.push({ ...b }); }
  const cuts = [...spans.map((s) => ({ z0: s.z0, z1: s.z1, kind: 'bridge' })), ...ghats.map((g) => ({ z0: g.z0, z1: g.z1, kind: 'ghat' }))].sort((a, b) => a.z0 - b.z0);
  const runs = []; // z-runs of plain canal between bridges / ghats
  let z = Z0;
  for (const c of cuts) { if (c.z0 > z) runs.push([z, c.z0]); z = Math.max(z, c.z1); }
  if (z < Z1) runs.push([z, Z1]);

  const P = new Parts({ concrete: 1.0 });
  // lining walls (both banks) along each run, with a cap and a dark wet band at the water line
  for (const [a, b] of runs) {
    const L = b - a, cz = (a + b) / 2;
    for (const s of [-1, 1]) {
      const wx = X + s * (HALF + WALL_T / 2);
      P.box('concrete', wx, (LIP - 0.3) / 2, cz, WALL_T, LIP + 0.3, L, { color: CEMENT });
      P.box('concrete', wx, LIP + 0.03, cz, WALL_T + 0.1, 0.06, L, { color: OLD });
      P.box('concrete', X + s * (HALF - 0.005), WATER_Y + 0.06, cz, 0.01, 0.12, L, { color: 0x6a6a58 }); // algae line
    }
    P.box('concrete', X, 0.025, cz, HALF * 2, 0.02, L, { color: 0x4a4a3c, skip: ['ny'] }); // silty bed under the water
  }
  // bridges: humped slab over the lining and bunds, parapets, ramps down to field level both sides
  for (const s of spans) {
    const w = s.z1 - s.z0, cz = (s.z0 + s.z1) / 2, L = DECK_X1 - DECK_X0;
    P.box('concrete', X, DECK - 0.17, cz, L, 0.34, w, { color: CEMENT });
    for (const side of [-1, 1]) {
      const pz = cz + side * (w / 2 - 0.15);
      P.box('concrete', X, DECK + 0.35, pz, L, 0.7, 0.3, { color: CEMENT });
      P.box('concrete', X, DECK + 0.72, pz, L + 0.1, 0.06, 0.36, { color: OLD });
      for (const ex of [DECK_X0, DECK_X1]) P.box('concrete', ex, DECK + 0.45, pz, 0.45, 0.9, 0.45, { color: OLD }); // end posts
    }
    // piers under the deck on the lining line
    for (const sx of [-1, 1]) P.box('concrete', X + sx * (HALF + WALL_T / 2), (DECK - 0.34) / 2, cz, WALL_T + 0.1, DECK - 0.34, w, { color: OLD });
    // ramps (a sloped slab each side)
    for (const dir of [-1, 1]) {
      const x0 = dir < 0 ? DECK_X0 : DECK_X1, x1 = x0 + dir * RAMP;
      const m = new THREE.Matrix4().makeTranslation((x0 + x1) / 2, DECK / 2 - 0.12, cz).multiply(new THREE.Matrix4().makeRotationZ(-dir * Math.atan2(DECK, RAMP)));
      P.box('concrete', 0, 0, 0, Math.hypot(RAMP, DECK) + 0.1, 0.25, w - 0.6, { color: 0xb8b2a4, matrix: m });
    }
  }
  // ghat: steps up the west bund, a landing on the lip, steps down to the water
  for (const g of ghats) {
    const w = g.z1 - g.z0, cz = (g.z0 + g.z1) / 2;
    const up = 4, x0 = X - HALF - WALL_T - BUND + 0.4, xl = X - HALF - WALL_T;
    for (let i = 0; i < up; i++) { const h = (LIP * (i + 1)) / up, xa = x0 + ((xl - x0) * i) / up; P.box('concrete', (xa + xl) / 2, h / 2, cz, xl - xa, h, w, { color: CEMENT }); }
    P.box('concrete', xl + WALL_T / 2, LIP / 2, cz, WALL_T, LIP, w, { color: CEMENT });
    for (let i = 0; i < 3; i++) { const h = LIP - ((LIP - WATER_Y + 0.15) * (i + 1)) / 3, xa = X - HALF + i * 0.4; P.box('concrete', xa + 0.2, Math.max(0.05, h) / 2, cz, 0.4, Math.max(0.05, h), w, { color: i ? 0x8a8676 : OLD }); }
    for (const side of [-1, 1]) P.box('concrete', (x0 + X - HALF + 1.2) / 2, LIP / 2 + 0.2, cz + side * (w / 2 + 0.12), X - HALF + 1.2 - x0, LIP + 0.4, 0.25, { color: OLD });
  }
  const parts = P.build();
  const group = new THREE.Group();
  group.name = 's7_canal';
  const concrete = new THREE.Mesh(parts.concrete, landMaterial('concrete'));
  concrete.name = 's7_canal_concrete';
  concrete.receiveShadow = true;
  concrete.userData.noAutoCollider = true;
  group.add(concrete);

  // water: one long ribbon (depth 1 mid-channel, 0 at the lining so the edge softens)
  const wg = channelWaterGeometry(Z1 - Z0, HALF * 2, 0, 6);
  wg.rotateY(Math.PI / 2).translate(X, WATER_Y, (Z0 + Z1) / 2);
  const water = new THREE.Mesh(wg, createWaterMaterial({ shallow: 0x6d6c46, deep: 0x3b4632, scale: 1.1 }));
  water.name = 's7_canal_water';
  water.renderOrder = 1;
  water.userData.noAutoCollider = true;
  group.add(water);

  // grassy bunds sloping from the lip to the fields, and the kachcha bank track on the east bund side
  const bunds = [];
  const strip = (xa, ya, xb, yb, a, b, look) => {
    const g = new THREE.BufferGeometry();
    const pos = [xa, ya, a, xb, yb, a, xb, yb, b, xa, ya, b];
    const nx = -(yb - ya), ny = Math.abs(xb - xa), L = Math.hypot(nx, ny);
    const n = [(nx / L) * Math.sign(xb - xa), ny / L, 0];
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([...n, ...n, ...n, ...n], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([xa / 5, a / 5, xb / 5, a / 5, xb / 5, b / 5, xa / 5, b / 5], 2));
    g.setIndex(xb > xa ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
    paint(g, look, 0);
    bunds.push(g);
  };
  const grass = { color: 0x6f8240, soil: 0x8a7a58, spacing: 0, cover: 0.95 };
  for (const [a, b] of [...runs, ...cuts.filter((c) => c.kind === 'ghat').map((c) => [c.z0, c.z1])]) {
    strip(X - HALF - WALL_T, LIP, X - HALF - WALL_T - BUND, 0.0, a, b, grass);
    strip(X + HALF + WALL_T, LIP, X + HALF + WALL_T + BUND, 0.0, a, b, grass);
  }
  strip(829.6, 0.012, 833.4, 0.012, Z0, Z1, { color: 0x8a8050, soil: 0xa08a62, spacing: 0, cover: 0.12 });
  const bund = new THREE.Mesh(mergeGeometries(bunds), fieldMaterial());
  bund.name = 's7_canal_bunds';
  bund.receiveShadow = true;
  bund.userData.noAutoCollider = true;
  group.add(bund);

  // colliders: the water channel (never the bridges); bridge parapets
  const boxes = [];
  for (const [a, b] of runs) for (let z0 = a; z0 < b; z0 += 20) boxes.push({ minX: X - HALF - WALL_T, maxX: X + HALF + WALL_T, minZ: z0, maxZ: Math.min(b, z0 + 20) });
  for (const g of ghats) boxes.push({ minX: X - HALF, maxX: X + HALF + WALL_T, minZ: g.z0, maxZ: g.z1 });
  for (const s of spans) for (const side of [-1, 1]) { const pz = (s.z0 + s.z1) / 2 + side * ((s.z1 - s.z0) / 2 - 0.15); boxes.push({ minX: DECK_X0 - 0.25, maxX: DECK_X1 + 0.25, minZ: pz - 0.18, maxZ: pz + 0.18 }); }
  concrete.userData.colliderBoxes = boxes;

  const heightAt = (x, z) => {
    for (const s of spans) {
      if (z < s.z0 || z > s.z1) continue;
      if (x >= DECK_X0 && x <= DECK_X1) return DECK;
      if (x > DECK_X0 - RAMP && x < DECK_X0) return DECK * (1 - (DECK_X0 - x) / RAMP);
      if (x > DECK_X1 && x < DECK_X1 + RAMP) return DECK * (1 - (x - DECK_X1) / RAMP);
    }
    const ax = Math.abs(x - X);
    if (z < Z0 || z > Z1 || ax < HALF + WALL_T || ax > HALF + WALL_T + BUND) return 0;
    return LIP * (1 - (ax - HALF - WALL_T) / BUND);
  };
  group.userData.heightAt = heightAt;
  group.userData.report = { lengthM: Z1 - Z0, bridges: spans.length, ghats: ghats.length, colliderBoxes: boxes.length, concreteTris: parts.concrete.index.count / 3 };
  return group;
}
