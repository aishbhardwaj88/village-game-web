import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Small vertex-coloured props for the side jobs (hand pump, banta / chaat / kulfi carts, buckets, milk cans, kites, gate posts).
 * Each prop is merged into ONE mesh sharing ONE material, and the whole set is non-shadow-casting, so a prop costs a single
 * draw call and nothing in the draw-call budget at story time (everything here is only built once free roam starts).
 * Placeholder-grade like the other code-built props; Blender versions can replace them through asset slots later.
 */
export const JOB_PROP_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
JOB_PROP_MATERIAL.name = 'job_props';

/** A coloured, transformed, non-indexed geometry piece. */
export function part(geo, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g = g.clone();
  g.scale(sx, sy, sz);
  if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)));
  g.translate(x, y, z);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
const sph = (r, seg = 8) => new THREE.SphereGeometry(r, seg, seg - 2);
const cone = (r, h, seg = 10) => new THREE.ConeGeometry(r, h, seg);

/** Merges parts into one Mesh (one draw call, no shadow). */
export function mergeProp(parts, name) {
  const mesh = new THREE.Mesh(mergeGeometries(parts, false), JOB_PROP_MATERIAL);
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

const WOOD = 0x7a5a3a;
const WOOD_D = 0x4a3426;
const STEEL = 0xb9bdc2;
const GREEN = 0x3f6b45;

function wheel(x, z, r = 0.32) {
  return [
    part(cyl(r, r, 0.06, 14), 0x2a2a2c, { x, y: r, z, rz: Math.PI / 2 }),
    part(cyl(0.05, 0.05, 0.1, 8), STEEL, { x, y: r, z, rz: Math.PI / 2 }),
    part(box(0.03, r * 1.9, 0.03), 0x6a6a6a, { x, y: r, z }),
    part(box(0.03, 0.03, r * 1.9), 0x6a6a6a, { x, y: r, z }),
  ];
}

/** Village hand pump on a small concrete platform, facing +z (spout toward +z). */
export function buildPump() {
  const p = [
    part(box(1.4, 0.12, 1.4), 0xb9b4a6, { y: 0.06 }),
    part(box(0.5, 0.22, 0.5), 0xa59f90, { y: 0.23 }),
    part(cyl(0.09, 0.11, 0.9, 10), GREEN, { y: 0.78 }),
    part(sph(0.15), GREEN, { y: 1.28 }),
    part(box(0.07, 0.07, 0.8), 0x2a2a2c, { y: 1.34, z: -0.28, rx: -0.5 }),
    part(box(0.06, 0.06, 0.4), GREEN, { y: 0.75, z: 0.24 }),
    part(box(0.34, 0.06, 0.5), 0x8a8a82, { y: 0.15, z: 0.52 }),
  ];
  return mergeProp(p, 'job_pump');
}

/** A bucket (carried or standing), with a water disc. */
export function buildBucketParts(x = 0, y = 0, z = 0, fill = 1) {
  return [
    part(cyl(0.17, 0.13, 0.3, 12), 0x9aa0a6, { x, y: y + 0.15, z }),
    part(cyl(0.155, 0.155, 0.02, 12), 0x3a6a8a, { x, y: y + 0.12 + 0.17 * fill, z }),
  ];
}

/** Banta (marble-stopper lemon soda) cart: wooden handcart with a rack of bottles under a striped umbrella. */
export function buildBantaCart() {
  const p = [
    part(box(1.5, 0.12, 0.9), WOOD, { y: 0.78 }),
    part(box(1.5, 0.5, 0.06), WOOD_D, { y: 0.5, z: 0.42 }),
    part(box(1.5, 0.5, 0.06), WOOD_D, { y: 0.5, z: -0.42 }),
    part(box(0.06, 0.5, 0.9), WOOD_D, { y: 0.5, x: 0.72 }),
    part(box(0.06, 0.5, 0.9), WOOD_D, { y: 0.5, x: -0.72 }),
    ...wheel(0.8, 0), ...wheel(-0.8, 0),
    part(box(0.07, 0.07, 1.2), WOOD_D, { y: 0.55, x: 1.3 }),
    part(cyl(0.025, 0.025, 1.5, 6), 0x8a8a8a, { y: 1.6 }),
    part(cone(1.0, 0.3, 12), 0xd9382b, { y: 2.3 }),
    part(cone(0.7, 0.18, 12), 0xefe6cf, { y: 2.38 }),
    part(box(1.3, 0.04, 0.6), 0x5a3a24, { y: 1.0, z: -0.1 }),
  ];
  for (let i = 0; i < 9; i++) {
    const x = -0.56 + (i % 5) * 0.28;
    const z = -0.15 + Math.floor(i / 5) * 0.3;
    p.push(part(cyl(0.065, 0.065, 0.28, 8), i % 2 ? 0xbfe3d6 : 0x8fd1a8, { x, y: 0.98 + 0.14, z }));
    p.push(part(cyl(0.025, 0.04, 0.1, 8), 0xbfe3d6, { x, y: 1.35, z }));
  }
  return mergeProp(p, 'job_banta_cart');
}

/** Chaat thela: handcart with a big flat tawa, stacked plates and a red/white striped canopy. */
export function buildChaatThela() {
  const p = [
    part(box(1.7, 0.14, 1.0), WOOD, { y: 0.8 }),
    part(box(1.7, 0.6, 0.06), 0xc0392b, { y: 0.48, z: 0.47 }),
    part(box(1.7, 0.6, 0.06), 0xc0392b, { y: 0.48, z: -0.47 }),
    part(box(0.06, 0.6, 1.0), 0xc0392b, { y: 0.48, x: 0.82 }),
    part(box(0.06, 0.6, 1.0), 0xc0392b, { y: 0.48, x: -0.82 }),
    ...wheel(0.9, 0), ...wheel(-0.9, 0),
    part(box(0.07, 0.07, 1.3), WOOD_D, { y: 0.6, x: 1.45 }),
    part(cyl(0.45, 0.45, 0.08, 16), 0x2a2a2c, { y: 0.92, x: -0.35 }),
    part(cyl(0.08, 0.1, 0.12, 8), STEEL, { y: 1.0, x: 0.3, z: 0.1 }),
    part(cyl(0.12, 0.12, 0.28, 10), 0xd9a21e, { y: 1.04, x: 0.6, z: -0.2 }),
    part(cyl(0.025, 0.025, 1.45, 6), 0x8a8a8a, { y: 1.6, x: -0.78, z: -0.42 }),
    part(cyl(0.025, 0.025, 1.45, 6), 0x8a8a8a, { y: 1.6, x: 0.78, z: -0.42 }),
    part(cyl(0.025, 0.025, 1.45, 6), 0x8a8a8a, { y: 1.6, x: -0.78, z: 0.42 }),
    part(cyl(0.025, 0.025, 1.45, 6), 0x8a8a8a, { y: 1.6, x: 0.78, z: 0.42 }),
  ];
  for (let i = 0; i < 6; i++) p.push(part(box(0.3, 0.55, 1.1), i % 2 ? 0xefe6cf : 0xc0392b, { x: -0.65 + i * 0.26, y: 2.35, z: 0 }));
  p.push(part(box(1.8, 0.05, 1.12), 0xefe6cf, { y: 2.12 }));
  return mergeProp(p, 'job_chaat_thela');
}

/** Kulfi handcart: a red cloth-wrapped matka box with an ice-white lid, bell on the handle. Front (handle) toward +x. */
export function buildKulfiCart() {
  const p = [
    part(box(1.3, 0.1, 0.8), WOOD, { y: 0.7 }),
    part(cyl(0.38, 0.34, 0.62, 14), 0xb5693f, { x: -0.1, y: 1.1 }),
    part(cyl(0.4, 0.4, 0.07, 14), 0xc0392b, { x: -0.1, y: 1.45 }),
    part(cyl(0.38, 0.4, 0.2, 14), 0xc0392b, { x: -0.1, y: 1.26 }),
    part(cyl(0.12, 0.12, 0.05, 10), 0xefe6cf, { x: -0.1, y: 1.5 }),
    ...wheel(0.4, 0.05, 0.3), ...wheel(-0.5, 0.05, 0.3),
    part(box(0.9, 0.07, 0.07), WOOD_D, { y: 0.74, x: 1.05, z: 0.3 }),
    part(box(0.9, 0.07, 0.07), WOOD_D, { y: 0.74, x: 1.05, z: -0.3 }),
    part(box(0.07, 0.07, 0.7), WOOD_D, { y: 1.0, x: 1.45 }),
    part(cone(0.07, 0.1, 8), 0xc9a23a, { y: 0.9, x: 1.45, z: 0.25, rx: Math.PI }),
    part(box(0.8, 0.5, 0.04), 0xf2c21e, { y: 1.15, x: 0.3, z: 0.4 }),
  ];
  return mergeProp(p, 'job_kulfi_cart');
}

/** Milk cans (two steel cans, a lid, a small ladle) — hung on a bicycle carrier or set down. */
export function buildMilkCans() {
  const p = [];
  for (const x of [-0.14, 0.14]) {
    p.push(part(cyl(0.12, 0.13, 0.5, 12), STEEL, { x, y: 0.25 }));
    p.push(part(cyl(0.08, 0.12, 0.1, 12), STEEL, { x, y: 0.55 }));
    p.push(part(cyl(0.09, 0.09, 0.04, 12), 0x9a9ea3, { x, y: 0.62 }));
  }
  return mergeProp(p, 'job_milk_cans');
}

/** A kite: a diamond with a cross-spar and a tail of paper bows. Faces +z. */
export function buildKiteGeometryParts(colour = 0xe0392b, colour2 = 0xf2b01e) {
  const sq = new THREE.PlaneGeometry(0.9, 1.1);
  const a = part(sq, colour, { rz: Math.PI / 4, sx: 0.6, sy: 0.9 });
  const b = part(new THREE.PlaneGeometry(0.4, 0.5), colour2, { rz: Math.PI / 4, sy: 0.9, z: 0.01 });
  const tail = [];
  for (let i = 0; i < 6; i++) tail.push(part(box(0.1, 0.12, 0.01), i % 2 ? colour : colour2, { x: Math.sin(i * 0.9) * 0.1, y: -0.75 - i * 0.2 }));
  return [a, b, ...tail];
}

/** The khet gate: two stone pillars with a low brick wall running out from each side, opening along x of width `gap`, centred at the
 * origin. Returns the mesh; `gateColliders(cx, cz, gap)` gives the matching world-space collider boxes. */
export const GATE_WALL_LEN = 6;
export function buildGatePillars(gap = 3.2) {
  const p = [];
  for (const s of [-1, 1]) {
    const px = s * (gap / 2 + 0.3);
    p.push(part(box(0.6, 1.9, 0.6), 0xd2c6a6, { x: px, y: 0.95 }));
    p.push(part(box(0.72, 0.12, 0.72), 0xb5ab90, { x: px, y: 1.96 }));
    p.push(part(box(0.66, 0.55, 0.66), 0xd9a33e, { x: px, y: 0.28 }));
    p.push(part(sph(0.16), 0xc9a23a, { x: px, y: 2.12 }));
    const wx = s * (gap / 2 + 0.6 + GATE_WALL_LEN / 2);
    p.push(part(box(GATE_WALL_LEN, 1.1, 0.3), 0xe3d7b5, { x: wx, y: 0.55 }));
    p.push(part(box(GATE_WALL_LEN, 0.4, 0.34), 0xd9a33e, { x: wx, y: 0.2 }));
    p.push(part(box(GATE_WALL_LEN + 0.1, 0.07, 0.4), 0xb5ab90, { x: wx, y: 1.13 }));
  }
  return mergeProp(p, 'job_khet_gate');
}

export function gateColliders(cx, cz, gap = 3.2) {
  const boxes = [];
  for (const s of [-1, 1]) {
    const a = cx + s * (gap / 2);
    const b = cx + s * (gap / 2 + 0.6 + GATE_WALL_LEN);
    boxes.push({ minX: Math.min(a, b), maxX: Math.max(a, b), minZ: cz - 0.2, maxZ: cz + 0.2 });
  }
  return boxes;
}

/** Marble ring (a sand circle with scattered glass marbles) + a chalk hopscotch (stapu) grid, flat on the ground. */
export function buildKancheGround() {
  const p = [part(cyl(1.15, 1.15, 0.02, 24), 0xd8c08a, { y: 0.012 })];
  const cols = [0xd9382b, 0x2e86c1, 0x27ae60, 0xf2c21e, 0x8e44ad, 0xe67e22, 0x1abc9c];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const r = i === 0 ? 0 : 0.25 + (i % 4) * 0.16;
    p.push(part(sph(0.05), cols[i % cols.length], { x: Math.cos(a) * r, y: 0.06, z: Math.sin(a) * r }));
  }
  // chalk hopscotch: 1 - 2/3 - 4 - 5/6 - 7 as flat white outlines
  const cell = 0.55;
  const spec = [[0, 0], [-0.5, 1], [0.5, 1], [0, 2], [-0.5, 3], [0.5, 3], [0, 4]];
  for (const [cx, cz] of spec) {
    const x = 3.2 + cx * cell, z = cz * cell;
    p.push(part(box(cell, 0.008, 0.03), 0xf4f0e6, { x, y: 0.03, z: z - cell / 2 }));
    p.push(part(box(cell, 0.008, 0.03), 0xf4f0e6, { x, y: 0.03, z: z + cell / 2 }));
    p.push(part(box(0.03, 0.008, cell), 0xf4f0e6, { x: x - cell / 2, y: 0.03, z }));
    p.push(part(box(0.03, 0.008, cell), 0xf4f0e6, { x: x + cell / 2, y: 0.03, z }));
  }
  return mergeProp(p, 'job_kanche_ground');
}

/** The khel maidan: a dusty play-ground patch with a gilli circle, a rough boundary of bricks and a couple of bats/sticks. 22 x 16 m. */
export function buildMaidan() {
  const p = [
    part(box(22, 0.03, 16), 0xcfb584, { y: 0.015 }),
    part(cyl(0.45, 0.45, 0.02, 20), 0x8a6a42, { y: 0.035 }),
  ];
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const x = -11 + t * 22;
    p.push(part(box(0.22, 0.1, 0.12), 0xb5693f, { x, y: 0.06, z: -8 }));
    p.push(part(box(0.22, 0.1, 0.12), 0xb5693f, { x, y: 0.06, z: 8 }));
  }
  for (let i = 0; i < 10; i++) {
    const z = -8 + (i / 10) * 16;
    p.push(part(box(0.12, 0.1, 0.22), 0xb5693f, { x: -11, y: 0.06, z }));
    p.push(part(box(0.12, 0.1, 0.22), 0xb5693f, { x: 11, y: 0.06, z }));
  }
  // a danda (long stick) and a gilli (short pointed stick) lying by the circle
  p.push(part(cyl(0.025, 0.025, 0.9, 6), 0x7a5a3a, { x: 0.8, y: 0.05, z: 0.5, rz: Math.PI / 2, ry: 0.5 }));
  p.push(part(cyl(0.03, 0.03, 0.14, 6), 0x9a7a4a, { x: 0.3, y: 0.05, z: -0.3, rz: Math.PI / 2, ry: -0.6 }));
  return mergeProp(p, 'job_maidan');
}
