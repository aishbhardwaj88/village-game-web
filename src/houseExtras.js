/**
 * Personality for the house-kit houses (her 6 Nov complaint: "houses which look like boxes"). Procedural add-ons in the kit
 * type's own frame (front = +z, origin on the plot centre), built as small boxes / cylinders in the kit cluster's attribute
 * layout (position, normal, uv in metres, vertex colour) and merged by src/villageHouses.js into the cluster's EXISTING
 * meshes (hb_main / hb_props / hb_metal / hb_brick): no new material, no new draw call.
 *
 * What the old bg_house_a..d / abadi rows had that the bare kit lacked: a second storey beside single ones, things
 * stuck on the wall (meter, plate), shade over windows, a painted dado, life on the roof and in front (washing, plants, a
 * cycle). Every feature is chosen per house (hash of its index), so two neighbours are never given the same set.
 */
import * as THREE from 'three';

const col = (hex) => new THREE.Color(hex);

/** Facade anchors per kit type (metres, from tools/blender/build_houses_kit.py): fz = front wall plane, bz = back wall plane,
 * roof = roof slab top, door/win = [x0, x1], hi = lintel heights, par = [y0, y1] parapet face, plate/meter = wall x. */
const T = {
  a: { fz: 0.2, door: [-0.5, 0.5], cycleX: -1.3, plantsAt: [1.95, 2.3, 0.62, 0] },
  b: { fz: 2.5, bz: -2.5, roof: 3.2, door: [-1.7, -0.7], win: [1.2, 2.4], dHi: 2.2, wHi: 2.2, par: [3.3, 3.55], plate: -2.3, meter: -0.2, plantsAt: [-0.2, 0.15, 2.75, 0], dado: 0.9, wash: [-2.3, -0.3, 0.8], upper: { x: [-2.9, 1.0], z: [-2.3, 0.4] } },
  c: { fz: 3.0, bz: -3.0, roof: 3.6, door: [-0.5, 0.5], win: [1.4, 2.5], dHi: 2.2, wHi: 2.3, par: [3.75, 4.05], plate: -1.2, meter: 0.95, plantsAt: [0.75, 1.1, 3.4, 0.3], dado: 0.8, band: 3.06, wash: [-2.3, -0.1, -1.6], upper: { x: [-2.85, 2.85], z: [-2.85, 0.9] } },
  d: { fz: 0.5, door: [-0.55, 0.55], win: [1.6, 3.0], plate: -1.1, meter: 1.1, plantsAt: [1.0, 1.4, 1.0, 0.3] },
  e: { fz: 3.5, bz: -3.5, roof: 3.7, door: [-0.6, 0.4], win: [1.4, 2.6], dHi: 2.2, wHi: 2.3, plate: -1.3, meter: 0.9, plantsAt: [1.6, 2.0, 3.85, 0.1], dado: 0.8, band: 3.56, cycleX: -1.9 },
  f: { fz: 4.0, door: [-0.9, 0.9], plate: 2.7 },
};
const CHAJJA = [0xb4b1a9, 0x7a3a3a, 0x8e9db0, 0xc97a4a, 0x5f7a63];
const DADO = [0x7a3a3a, 0x8e9db0, 0xc97a4a, 0x4e6f5a, 0xd2b04c, 0x6a4a7a];
const PLATE = [0x24405e, 0x2e5a3a, 0x6a2c2c, 0x3a3a3a];
const CLOTH = [0xc0392b, 0x3b5ba5, 0xeee6d2, 0xe0a030, 0x2e8b57, 0xd36b8b, 0x7a4a9a];
const CYCLE = [0x2a3a42, 0x7a2c2c, 0x2e5a3a, 0x1c1c1f];
const TINS = [0xb5693f, 0x8a8f94, 0x3c6e9a, 0xc9b25a, 0x9a3a2a];
const LEAF = [0x4c7a3a, 0x5e8c3d, 0x3e6b34, 0x6b9444];

/** Which of the features each house carries. `pre` forces a feature set (new houses); otherwise every feature is a hashed dice roll per type. */
export function pickFeatures(p, i, hash, pre) {
  const t = p.t;
  const a = T[t];
  if (pre) return new Set(pre);
  const f = new Set();
  const r = (k) => hash(i * 17 + k * 5.3 + 0.7);
  if (a.win && a.wHi && r(1) < 0.7) f.add('chajja');
  if (a.dHi && r(2) < 0.45) f.add('hood');
  if (a.plate !== undefined && r(3) < 0.6) f.add('plate');
  if (a.meter !== undefined && r(4) < 0.55) f.add('meter');
  if (a.dado && r(5) < 0.55) f.add('dado');
  if (a.par && r(6) < 0.55) f.add('vents');
  if (a.wash && r(7) < 0.35) f.add('wash');
  if (a.plantsAt && r(8) < 0.6) f.add('plants');
  if (a.cycleX !== undefined && r(9) < 0.55) f.add('cycle');
  if (a.upper && r(10) < (t === 'c' ? 0.3 : 0.18)) f.add('upper');
  return f;
}

/* ---------------------------------------------------------------- geometry helpers: kit attribute layout, uv in metres, linear vertex colour */
function finish(g, colour, m, scale) {
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { c[k * 3] = colour.r * scale.r; c[k * 3 + 1] = colour.g * scale.g; c[k * 3 + 2] = colour.b * scale.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.deleteAttribute('uv1');
  g.applyMatrix4(m);
  return g;
}
const E = new THREE.Euler(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
const mat = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), ONE);

function boxG(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x -x +y -y +z -z
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  return g;
}
function cylG(rt, rb, h, seg = 8) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1);
  const uv = g.attributes.uv, c = Math.PI * (rt + rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * c, uv.getY(i) * h);
  return g;
}

/** Builds the add-ons of house `p` (kit type p.t) as { main, props, metal, brick } geometry lists in WORLD space.
 * `place` = the house's placement matrix, `wall` = its wall tint, `wear` its value, `rnd(k)` a 0..1 hash for this house. Returns also `roofKeep` / `noFittings`. */
export function buildHouseExtras(p, f, place, wall, wear, rnd) {
  const a = T[p.t];
  const out = { main: [], props: [], metal: [], brick: [], roofKeep: [], noFittings: false };
  const plain = new THREE.Color(wear, wear, wear);
  const wallT = wall.clone().multiplyScalar(1);
  const put = (list, g, hex, m, tint = plain) => { list.push(finish(g, col(hex), m.clone().premultiply(place), tint)); };
  const pick = (arr, k) => arr[Math.floor(rnd(k) * arr.length) % arr.length];

  // chajja over the window (a projecting slab on two brackets) and, on some, a hood over the door
  if (f.has('chajja') && a.win) {
    const [x0, x1] = a.win, w = x1 - x0 + 0.55, c = pick(CHAJJA, 1);
    put(out.main, boxG(w, 0.07, 0.5), c, mat((x0 + x1) / 2, a.wHi + 0.16, a.fz + 0.25));
    for (const x of [x0 - 0.18, x1 + 0.18]) put(out.main, boxG(0.06, 0.2, 0.06), c, mat(x, a.wHi + 0.04, a.fz + 0.4));
  }
  if (f.has('hood') && a.door && a.dHi) {
    const [x0, x1] = a.door, c = pick(CHAJJA, 2);
    put(out.main, boxG(x1 - x0 + 0.7, 0.07, 0.6), c, mat((x0 + x1) / 2, a.dHi + 0.28, a.fz + 0.3));
    for (const x of [x0 - 0.3, x1 + 0.3]) put(out.main, boxG(0.06, 0.26, 0.06), c, mat(x, a.dHi + 0.13, a.fz + 0.5));
  }
  // painted dado over the original skirting, broken at the doorway
  if (f.has('dado') && a.dado) {
    const c = pick(DADO, 3), zz = (a.band || a.fz) + 0.02;
    const xl = (a.win ? Math.min(a.door[0], a.win[0]) : a.door[0]), hw = p.t === 'b' ? 3.0 : 3.03;
    const cut = [[-hw, a.door[0] - 0.12], [a.door[1] + 0.12, hw]];
    for (const [s, e] of cut) {
      put(out.main, boxG(e - s, a.dado, 0.04), c, mat((s + e) / 2, a.dado / 2, zz));
      put(out.main, boxG(e - s, 0.05, 0.06), 0xf1ead8, mat((s + e) / 2, a.dado + 0.02, zz + 0.005));
    }
    void xl;
  }
  // name plate by the door and an electric meter box with its conduit up to the roof
  if (f.has('plate') && a.plate !== undefined) {
    const c = pick(PLATE, 4), z = a.fz;
    put(out.props, boxG(0.5, 0.26, 0.03), c, mat(a.plate, 1.7, z + 0.015));
    put(out.props, boxG(0.42, 0.18, 0.012), 0xe9e2cf, mat(a.plate, 1.7, z + 0.034));
    put(out.props, boxG(0.3, 0.03, 0.012), 0x2a2420, mat(a.plate, 1.74, z + 0.043));
    put(out.props, boxG(0.22, 0.025, 0.012), 0x2a2420, mat(a.plate, 1.66, z + 0.043));
  }
  if (f.has('meter') && a.meter !== undefined) {
    const z = a.fz, top = a.roof || 3.0;
    put(out.metal, boxG(0.3, 0.42, 0.14), 0x9a9ea0, mat(a.meter, 1.5, z + 0.07));
    put(out.metal, boxG(0.18, 0.13, 0.012), 0x1c2226, mat(a.meter, 1.56, z + 0.146));
    put(out.metal, boxG(0.26, 0.04, 0.16), 0x7b7f82, mat(a.meter, 1.73, z + 0.08));
    put(out.metal, cylG(0.022, 0.022, top - 1.74, 6), 0x4b4f52, mat(a.meter, 1.74 + (top - 1.74) / 2, z + 0.03));
    put(out.metal, boxG(0.08, 0.08, 0.1), 0x7b7f82, mat(a.meter, top - 0.02, z + 0.05)); // service-head at the eave
  }
  // vents in the parapet: dark openings along the front
  if (f.has('vents') && a.par) {
    const [y0, y1] = a.par, n = 4 + Math.floor(rnd(5) * 2), span = 4.6;
    for (let k = 0; k < n; k++) {
      const x = -span / 2 + (k + 0.5) * span / n;
      put(out.main, boxG(0.22, y1 - y0, 0.03), 0x241f1b, mat(x, (y0 + y1) / 2, a.fz + 0.012));
    }
  }
  // washing line on the roof, a few clothes pegged out
  if (f.has('wash') && a.wash && !f.has('upper')) {
    const [xa, xb, z] = a.wash, y = a.roof + 1.7;
    for (const x of [xa, xb]) put(out.metal, cylG(0.03, 0.03, 1.7, 6), 0x8a6a48, mat(x, a.roof + 0.85, z));
    put(out.metal, cylG(0.008, 0.008, xb - xa, 4), 0xb89a64, mat((xa + xb) / 2, y - 0.02, z, 0, 0, Math.PI / 2));
    const n = 3 + Math.floor(rnd(6) * 3);
    for (let k = 0; k < n; k++) {
      const x = xa + 0.25 + (k + rnd(10 + k) * 0.5) * (xb - xa - 0.5) / n, wd = 0.35 + rnd(20 + k) * 0.3, ht = 0.5 + rnd(30 + k) * 0.5;
      put(out.props, boxG(wd, ht, 0.012), pick(CLOTH, 40 + k), mat(x, y - 0.05 - ht / 2, z + 0.01 * (k % 2), 0, 0, (rnd(50 + k) - 0.5) * 0.06));
    }
    out.roofKeep.push([(xa + xb) / 2, z, 1.5]);
  }
  // plants in old tins and paint cans
  if (f.has('plants') && a.plantsAt) {
    const [x0, x1, z, y] = a.plantsAt, n = 2 + Math.floor(rnd(7) * 2);
    for (let k = 0; k < n; k++) {
      const x = x0 + (x1 - x0) * (k / Math.max(1, n - 1)) + (rnd(60 + k) - 0.5) * 0.08, h = 0.24 + rnd(70 + k) * 0.14, r = 0.1 + rnd(80 + k) * 0.04;
      put(out.metal, cylG(r, r * 0.88, h, 8), pick(TINS, 90 + k), mat(x, y + h / 2, z));
      const s = new THREE.IcosahedronGeometry(r * 1.9, 0);
      const uv = s.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * r * 4, uv.getY(q) * r * 4);
      put(out.props, s, pick(LEAF, 100 + k), mat(x, y + h + r * 1.1, z, 0, rnd(110 + k) * 3, 0).scale(V.set(1, 0.85 + rnd(120 + k) * 0.5, 1)));
    }
  }
  // a bicycle leaned on the front wall
  if (f.has('cycle') && a.cycleX !== undefined) {
    const c = pick(CYCLE, 7), z = a.fz + 0.3, sc = 0.9 + rnd(8) * 0.12, flip = rnd(9) < 0.5 ? -1 : 1;
    const base = new THREE.Matrix4().compose(V.set(a.cycleX, (a.fz < 1 ? 0 : (p.t === 'e' ? 0.1 : 0)), z), Q.setFromEuler(E.set(-0.2, 0, 0)), V.clone().set(sc * flip, sc, sc));
    const piece = (g, hex, m, list = out.metal) => list.push(finish(g, col(hex), m.premultiply(base).premultiply(place), plain));
    const limb = (x0, y0, x1, y1, r) => { const L = Math.hypot(x1 - x0, y1 - y0); piece(cylG(r, r, L, 5), c, mat((x0 + x1) / 2, (y0 + y1) / 2, 0, 0, 0, Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2)); };
    for (const x of [-0.55, 0.55]) {
      piece(new THREE.TorusGeometry(0.33, 0.022, 5, 18), 0x15171a, mat(x, 0.33, 0));
      piece(new THREE.TorusGeometry(0.3, 0.008, 4, 14), 0xb9bdc1, mat(x, 0.33, 0));
    }
    limb(-0.55, 0.33, 0, 0.3, 0.016); limb(0, 0.3, -0.2, 0.86, 0.016); limb(-0.2, 0.86, -0.55, 0.33, 0.014);
    limb(0, 0.3, 0.42, 0.8, 0.016); limb(-0.2, 0.84, 0.42, 0.8, 0.016); limb(0.42, 0.8, 0.55, 0.33, 0.014);
    piece(boxG(0.22, 0.05, 0.1), 0x1c1c1f, mat(-0.22, 0.9, 0));
    piece(cylG(0.014, 0.014, 0.5, 5), 0x6f7478, mat(0.42, 0.86, 0, Math.PI / 2, 0, 0));
    piece(cylG(0.01, 0.01, 0.12, 5), 0x6f7478, mat(0.42, 0.82, 0));
  }
  // outside stair to the roof, up the back wall, with a pipe rail
  if (f.has('stair') && a.bz !== undefined) {
    const top = a.roof, n = Math.ceil(top / 0.19), rise = top / n, tread = 0.26, len = n * tread, dir = f.has('stairL') ? -1 : 1;
    const xs = dir > 0 ? -len / 2 - 0.3 : len / 2 + 0.3, depth = 0.85, zc = a.bz - depth / 2 + 0.05;
    for (let k = 1; k <= n; k++) {
      const xa = xs + dir * (k - 1) * tread, xb = xs + dir * len, w = Math.abs(xb - xa);
      put(out.main, boxG(w, k * rise, depth), 0xb4b1a9, mat((xa + xb) / 2, k * rise / 2, zc), plain);
    }
    const zr = a.bz - depth + 0.08, x0 = xs + dir * tread * 0.5, x1 = xs + dir * len, L = Math.hypot(x1 - x0, top);
    put(out.metal, cylG(0.025, 0.025, L, 6), 0x7b7f82, mat((x0 + x1) / 2, top / 2 + 0.9, zr, 0, 0, Math.atan2(top, x1 - x0) - Math.PI / 2 + (dir < 0 ? Math.PI : 0) * 0));
    for (let k = 0; k <= 4; k++) { const x = x0 + (x1 - x0) * k / 4, y = top * k / 4; put(out.metal, cylG(0.022, 0.022, 0.9, 6), 0x7b7f82, mat(x, y + 0.45, zr)); }
  }
  // a real second floor over the front-less part of the roof: walls, window, door to the terrace, chajja, its own slab and parapet
  if (f.has('upper') && a.upper) {
    const [ux0, ux1] = a.upper.x, [uz0, uz1] = a.upper.z, y0 = a.roof, h = 3.0, w = ux1 - ux0, d = uz1 - uz0;
    const brick = p.t === 'b';
    put(brick ? out.brick : out.main, boxG(w, h, d), 0xffffff, mat((ux0 + ux1) / 2, y0 + h / 2, (uz0 + uz1) / 2), brick ? plain : wallT.clone().multiplyScalar(wear));
    put(out.main, boxG(w + 0.5, 0.2, d + 0.5), 0xb4b1a9, mat((ux0 + ux1) / 2, y0 + h + 0.1, (uz0 + uz1) / 2), plain);
    // dark band at the floor line + parapet round the new roof
    const cc = pick(DADO, 11);
    put(out.main, boxG(w + 0.06, 0.1, d + 0.06), cc, mat((ux0 + ux1) / 2, y0 + 0.07, (uz0 + uz1) / 2), plain);
    const ph = 0.45, t = 0.16, cy = y0 + h + 0.2 + ph / 2;
    for (const [bw, bd, cx, cz] of [[w + 0.4, t, (ux0 + ux1) / 2, uz1 + 0.2 - t / 2], [w + 0.4, t, (ux0 + ux1) / 2, uz0 - 0.2 + t / 2], [t, d + 0.4 - 2 * t, ux0 - 0.2 + t / 2, (uz0 + uz1) / 2], [t, d + 0.4 - 2 * t, ux1 + 0.2 - t / 2, (uz0 + uz1) / 2]]) {
      put(out.main, boxG(bw, ph, bd), 0xffffff, mat(cx, cy, cz), wallT.clone().multiplyScalar(wear));
    }
    // front: terrace door and window with frames, chajja, a small tank on the new roof
    const fz = uz1, dc = pick(CHAJJA, 12), wc = pick([0x2e6fb5, 0x2f7a4a, 0x5a3c28, 0x2e6f72], 13);
    put(out.props, boxG(1.0, 2.1, 0.06), 0x2a2420, mat(ux0 + 1.2, y0 + 1.05, fz + 0.01));
    put(out.props, boxG(0.84, 1.95, 0.05), wc, mat(ux0 + 1.2, y0 + 1.02, fz + 0.035));
    put(out.props, boxG(0.1, 0.1, 0.06), 0xc8a44a, mat(ux0 + 1.55, y0 + 1.0, fz + 0.075));
    put(out.props, boxG(1.2, 1.1, 0.06), 0x2a2420, mat(ux1 - 1.3, y0 + 1.7, fz + 0.01));
    put(out.props, boxG(1.04, 0.94, 0.05), wc, mat(ux1 - 1.3, y0 + 1.7, fz + 0.035));
    for (let k = 1; k < 6; k++) put(out.metal, boxG(0.025, 0.94, 0.02), 0x2a2a2c, mat(ux1 - 1.3 - 0.52 + k * 0.173, y0 + 1.7, fz + 0.07));
    put(out.main, boxG(1.8, 0.07, 0.5), dc, mat(ux1 - 1.3, y0 + 2.36, fz + 0.25));
    put(out.main, boxG(1.4, 0.07, 0.6), dc, mat(ux0 + 1.2, y0 + 2.34, fz + 0.3));
    out.noFittings = true;
    out.upperRoof = { y: y0 + h + 0.2, rect: [ux0 + 0.3, ux1 - 0.3, uz0 + 0.3, uz1 - 0.5] };
  }
  return out;
}
