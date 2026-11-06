import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHORS } from './anchors.js';
import { getTiledMaterial } from './materials.js';
import { colliderBoxFromTransform } from './collision.js';
import { drawBilingual, hiFont, enFont, HI_FAMILY, EN_FAMILY } from './signPaint.js';

/**
 * VILLAGE FURNITURE 2 (docs/VILLAGE_VOCABULARY.md section 6 leftovers). Hard-surface only, no people/animals/plants.
 * Already built elsewhere (src/villageFurniture.js, src/wallWriting.js): scarecrows, thresher, chaff cutter, PCO board, To Let,
 * shaadi card, chalk cricket score. Built here:
 *   transformer  - ground transformer on a concrete platform with steps, HT/LT bushings, cooling fins, an earth rod, and a
 *                  3-pole line beside it with a crossarm, insulators and a bunch of sagging wires plus a tangle of service drops
 *   bullockcart  - a parked bullock cart, shafts tipped down to the ground, the yoke lying on the ground in front, a rope coil
 *   schoolwall / anganwadiwall - painted boundary wall panels: alphabet (English + Hindi varnamala), and cartoons (sun, flower, fish,
 *                  house, balloons). Painted brush shapes only, no brands or characters.
 * Skipped: a "wire cluster on EVERY pole" (street poles are built per zone in props.js; no pole list is exposed), scarecrow (exists).
 * Cost: 5 merged meshes (metal, wood, concrete, brick, jute) + 1 decal mesh = 6 draw calls.
 * Every spot is an offset from an anchor (src/anchors.js) so it rides along if the map moves.
 */

const TILE = { metal: 1.0, wood: 1.0, concrete: 1.0, brick: 1.2, jute: 0.5 };
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
const local = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(1, 1, 1));

export const FURNITURE2_SPOTS = {
  transformer: { at: 'tubewell', lx: -16, lz: 12, yaw: 0.15 },
  bullockcart: { at: 'khalihan', lx: -14, lz: 8, yaw: 0.5 },
  schoolwall: { at: 'school', lx: -17, lz: 24, yaw: 0 },
  anganwadiwall: { at: 'anganwadi', lx: 9, lz: 10, yaw: 0 },
};
function spotMatrix(sp) {
  const a = ANCHORS[sp.at];
  if (!a) return null;
  const ry = a.ry || 0, s = Math.sin(ry), c = Math.cos(ry);
  return new THREE.Matrix4().makeRotationY(ry + (sp.yaw || 0)).setPosition(a.x + sp.lx * c + sp.lz * s, 0, a.z - sp.lx * s + sp.lz * c);
}

function metreUV(geo, tile) {
  const p = geo.attributes.position, n = p.count, uv = new Float32Array(n * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
    const ax = Math.abs(e1.x), ay = Math.abs(e1.y), az = Math.abs(e1.z);
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k);
      let u, v;
      if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
      uv[(i + k) * 2] = u / tile; uv[(i + k) * 2 + 1] = v / tile;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
const DIRT = new THREE.Color(0x6a5a46), DUST = new THREE.Color(0xb8aa90);
function weather(geo, tint, seed, dirt = 0.3) {
  const p = geo.attributes.position, nm = geo.attributes.normal, n = p.count;
  const col = new Float32Array(n * 3), base = new THREE.Color(tint), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ny = nm.getY(i);
    c.copy(base).multiplyScalar(0.93 + 0.11 * (0.5 + 0.5 * Math.sin(x * 4.1 + seed) * Math.sin(z * 3.7 - seed * 0.7) * Math.cos(y * 5.3 + seed * 1.3)));
    c.lerp(DIRT, Math.max(0, 1 - y / 0.55) * dirt);
    if (ny > 0.3) c.lerp(DUST, 0.12 * ny);
    col[i * 3] = Math.min(0.9, Math.max(0.035, c.r)); col[i * 3 + 1] = Math.min(0.9, Math.max(0.035, c.g)); col[i * 3 + 2] = Math.min(0.9, Math.max(0.035, c.b));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

class Obj {
  constructor(by, world, seed) { this.by = by; this.world = world; this.seed = seed; this.n = 0; }
  add(set, geo, m, tint, dirt) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    if (m) g.applyMatrix4(m);
    metreUV(g, TILE[set] || 1);
    weather(g, tint, this.seed + this.n * 0.013, dirt);
    g.applyMatrix4(this.world);
    this.n++;
    if (!this.by.has(set)) this.by.set(set, []);
    this.by.get(set).push(g);
  }
  box(set, w, h, d, x, y, z, tint, rx = 0, ry = 0, rz = 0, dirt) { this.add(set, new THREE.BoxGeometry(w, h, d), local(x, y, z, rx, ry, rz), tint, dirt); }
  cyl(set, rt, rb, h, seg, x, y, z, tint, rx = 0, ry = 0, rz = 0, dirt) { this.add(set, new THREE.CylinderGeometry(rt, rb, h, seg), local(x, y, z, rx, ry, rz), tint, dirt); }
  rod(set, r, a, b, tint, seg = 5, dirt) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(B, A);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    this.add(set, new THREE.CylinderGeometry(r, r, d.length(), seg), new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), tint, dirt);
  }
  /** A sagging wire (catenary-ish) between two points, as short thin rods. */
  wire(a, b, sag, tint = 0x2a2724, r = 0.012) {
    let prev = a;
    for (let k = 1; k <= 7; k++) {
      const t = k / 7;
      const pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t];
      this.rod('metal', r, prev, pt, tint, 4, 0.05); prev = pt;
    }
  }
}

const GREY = 0x6d7176, DGREY = 0x3c3e40, CONC = 0x9a978e, WOODD = 0x6e5236, INS = 0x7d5a44, IRONC = 0x55504a;

function buildTransformer(o) {
  // concrete platform with two steps, a stub plinth under the tank
  o.box('concrete', 2.6, 0.5, 2.0, 0, 0.25, 0, CONC, 0, 0, 0, 0.45);
  o.box('concrete', 1.2, 0.17, 0.4, 0, 0.085, 1.2, CONC, 0, 0, 0, 0.5);
  o.box('concrete', 1.2, 0.33, 0.3, 0, 0.165, 0.95, CONC, 0, 0, 0, 0.4);
  // tank: body, conservator drum on top, rib fins at both ends, lid
  o.box('metal', 1.5, 1.25, 0.95, 0, 1.12, 0, GREY, 0, 0, 0, 0.1);
  o.box('metal', 1.6, 0.06, 1.05, 0, 1.78, 0, DGREY);
  o.cyl('metal', 0.14, 0.14, 1.3, 14, 0, 1.98, -0.25, GREY, 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) o.box('metal', 0.18, 1.0, 0.025, sx * 0.84, 1.1, -0.38 + k * 0.152, DGREY);
  // three HT bushings (ceramic brown) on the lid, three LT bushings on the side face
  for (let k = -1; k <= 1; k++) {
    o.cyl('metal', 0.045, 0.06, 0.36, 8, k * 0.42, 2.0, 0.22, INS);
    o.cyl('metal', 0.07, 0.07, 0.04, 8, k * 0.42, 1.9, 0.22, INS);
    o.cyl('metal', 0.03, 0.04, 0.2, 8, k * 0.3, 1.34, 0.52, INS, Math.PI / 2);
  }
  o.box('metal', 0.45, 0.35, 0.18, -0.5, 0.95, 0.56, 0x5a6a58, 0, 0, 0, 0.1); // LT fuse / meter box
  // earth rod and strip down to the ground
  o.rod('metal', 0.012, [0.72, 0.5, 0.5], [0.95, 0.0, 0.75], 0x7a5a30, 4);
  // fence of angle-iron posts and rails round the platform, open at the steps
  for (const [px, pz] of [[-1.7, -1.35], [1.7, -1.35], [-1.7, 1.35], [1.7, 1.35]]) o.box('metal', 0.07, 2.2, 0.07, px, 1.1, pz, IRONC);
  for (const h of [0.5, 1.1, 1.7]) {
    o.box('metal', 3.4, 0.035, 0.035, 0, h, -1.35, IRONC);
    o.box('metal', 0.035, 0.035, 2.7, -1.7, h, 0, IRONC);
    o.box('metal', 0.035, 0.035, 2.7, 1.7, h, 0, IRONC);
  }
  for (const h of [0.5, 1.1, 1.7]) { o.box('metal', 0.85, 0.035, 0.035, -1.28, h, 1.35, IRONC); o.box('metal', 0.85, 0.035, 0.035, 1.28, h, 1.35, IRONC); }
  // the pole line: three wooden poles, crossarm, three pin insulators each, lead wires, and a bunch of service drops
  const poles = [[-4.5, -3.2], [-0.2, -3.6], [4.2, -3.0]];
  const tops = [];
  poles.forEach(([px, pz], i) => {
    const hgt = 8.2 + rnd(i + 3) * 0.6, lean = (rnd(i + 8) - 0.5) * 0.06;
    o.rod('wood', 0.1, [px, 0, pz], [px + lean * hgt, hgt, pz], WOODD, 8, 0.4);
    const tx = px + lean * hgt;
    o.box('wood', 1.9, 0.09, 0.09, tx, hgt - 0.4, pz, 0x5a4630);
    o.box('wood', 0.07, 0.07, 0.6, tx - 0.5, hgt - 0.7, pz, 0x5a4630, 0.0, 0, 0.0); // brace
    for (const k of [-0.8, 0, 0.8]) { o.cyl('metal', 0.04, 0.05, 0.14, 7, tx + k, hgt - 0.28, pz, INS); tops.push([tx + k, hgt - 0.2, pz, i]); }
    // stay wire and a few staples + loose cable ends hanging from the pole (the "cluster")
    o.rod('metal', 0.012, [tx, hgt - 2.0, pz], [tx + 1.6 * (i === 2 ? 1 : -1), 0.0, pz - 1.1], IRONC, 4);
    for (let k = 0; k < 5; k++) o.wire([tx + 0.07, hgt - 1.2 - k * 0.38, pz + 0.1], [tx + 0.9 - k * 0.45, hgt - 2.4 - k * 0.15, pz + 1.3 + k * 0.4], 0.18 + k * 0.05, 0x1f1d1b, 0.01);
    o.cyl('metal', 0.1, 0.1, 0.22, 7, tx + 0.15, hgt - 3.1, pz + 0.1, 0x3a3a3c); // joint box / MCB strapped on
  });
  for (let a = 0; a < 3; a++) for (let p = 0; p < poles.length - 1; p++) {
    const A = tops.filter((t) => t[3] === p)[a], B = tops.filter((t) => t[3] === p + 1)[a];
    o.wire([A[0], A[1] + 0.12, A[2]], [B[0], B[1] + 0.12, B[2]], 0.3 + rnd(a * 5 + p) * 0.15);
  }
  // down leads from the middle pole to the HT bushings (slack wires)
  for (let k = -1; k <= 1; k++) o.wire([-0.2 + k * 0.8, 7.6, -3.6], [k * 0.42, 2.3, 0.22], 0.5, 0x242220, 0.014);
  return [{ w: 2.6, d: 2.0, x: 0, z: 0 }, ...poles.map(([px, pz]) => ({ w: 0.3, d: 0.3, x: px, z: pz }))];
}

function buildBullockCart(o) {
  const tilt = -0.19, ay = 0.6;
  const root = o.world.clone();
  // everything cart-shaped hangs from the axle: tipped so the shaft ends rest on the ground
  const tiltM = new THREE.Matrix4().makeTranslation(0, ay, 0).multiply(new THREE.Matrix4().makeRotationX(tilt)).multiply(new THREE.Matrix4().makeTranslation(0, -ay, 0));
  o.world = root.clone().multiply(tiltM);
  // bed: planks, side rails, cross beams
  for (let k = 0; k < 7; k++) o.box('wood', 1.6, 0.05, 0.42, 0, 0.9, -0.1 + (k - 3) * 0.43, k % 2 ? WOODD : 0x7c5e40, 0, 0, 0, 0.3);
  for (const sx of [-0.8, 0.8]) { o.box('wood', 0.06, 0.28, 3.1, sx, 1.05, -0.1, 0x5c4630); for (let k = 0; k < 5; k++) o.box('wood', 0.04, 0.25, 0.05, sx, 1.2, -1.4 + k * 0.7, 0x5c4630); }
  o.box('wood', 1.7, 0.07, 0.1, 0, 0.84, 0.6, 0x4e3a28); o.box('wood', 1.7, 0.07, 0.1, 0, 0.84, -0.8, 0x4e3a28);
  // axle and two spoked wheels with iron rims and hubs
  o.cyl('metal', 0.04, 0.04, 2.0, 8, 0, ay, 0, IRONC, 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) {
    const x = sx * 0.95;
    o.cyl('wood', 0.09, 0.09, 0.2, 10, x, ay, 0, 0x5a4630, 0, 0, Math.PI / 2);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 6; o.box('wood', 0.07, 0.07, 1.1, x, ay, 0, WOODD, a, 0, 0); }
    o.add('metal', new THREE.TorusGeometry(0.58, 0.028, 5, 24), local(x, ay, 0, 0, Math.PI / 2, 0), IRONC, 0.35); // iron tyre
    o.add('wood', new THREE.TorusGeometry(0.55, 0.045, 5, 20), local(x, ay, 0, 0, Math.PI / 2, 0), WOODD, 0.35); // felloe
  }
  // two long shafts running forward (-z) from the bed to the ground, a cross-bar between them
  for (const sx of [-0.45, 0.45]) o.rod('wood', 0.045, [sx, 0.88, 0.2], [sx, 0.85, -3.7], 0x6a5038, 6, 0.3);
  o.box('wood', 1.0, 0.06, 0.08, 0, 0.84, -3.1, 0x5c4630);
  // a jute sack and a coil of rope on the bed
  o.box('jute', 0.6, 0.22, 0.4, 0.2, 1.04, 0.7, 0xb59d6a, 0.05, 0.3, 0);
  o.add('jute', new THREE.TorusGeometry(0.2, 0.04, 5, 12), local(-0.3, 0.98, -0.4, Math.PI / 2, 0, 0), 0xa89060);
  // the yoke on the ground ahead of the shafts: beam, two bow pegs each side, rope ties (untilted)
  o.world = root;
  const yz = -5.0;
  o.box('wood', 0.09, 0.09, 1.5, 0.1, 0.05, yz, 0x5c4630, 0, 0.12, 0);
  for (const dz of [-0.35, 0.35]) for (const dx of [-0.07, 0.07]) o.rod('wood', 0.012, [0.1 + dz * 0.12, 0.04, yz + dz * 1.0 + dx * 0 - dx], [0.1 + dz * 0.12, 0.45, yz + dz - dx], 0x6a5038, 4);
  o.add('jute', new THREE.TorusGeometry(0.16, 0.025, 5, 10), local(-0.55, 0.03, yz + 0.9, Math.PI / 2, 0, 0), 0xa89060);
  return [{ w: 2.2, d: 3.8, x: 0, z: -0.5 }];
}

function buildWall(o) {
  // painted boundary wall: brick course, plaster-white face is the decal, a coping slab on top
  o.box('brick', 4.8, 1.55, 0.26, 0, 0.775, 0, 0xb8a086, 0, 0, 0, 0.35);
  o.box('concrete', 4.95, 0.1, 0.36, 0, 1.6, 0, 0xa09c92, 0, 0, 0, 0.3);
  for (const x of [-2.4, 2.4]) o.box('brick', 0.42, 1.8, 0.42, x, 0.9, 0, 0xb09880, 0, 0, 0, 0.35);
  return [{ w: 5.0, d: 0.45, x: 0, z: 0 }];
}

const BUILDERS = { transformer: buildTransformer, bullockcart: buildBullockCart, schoolwall: buildWall, anganwadiwall: buildWall };

// ---------- painted panels (one canvas, two cells) ----------
const AW = 1536, AH = 880, CELL = { alpha: { x: 0, y: 0, w: 1536, h: 400 }, toon: { x: 0, y: 440, w: 1536, h: 400 } };
function paint(g) {
  g.clearRect(0, 0, AW, AH);
  const panel = (c, bg, border) => {
    g.fillStyle = bg; g.fillRect(c.x, c.y, c.w, c.h);
    g.strokeStyle = border; g.lineWidth = 12; g.strokeRect(c.x + 14, c.y + 14, c.w - 28, c.h - 28);
  };
  // alphabet: lime-washed blue panel, header, two rows of coloured letters
  {
    const c = CELL.alpha; panel(c, '#e9e2c8', '#2a5f9a');
    drawBilingual(g, 'आओ अक्षर सीखें', 'Learn the Alphabet', { x: c.x + c.w / 2, y: c.y + 24, w: c.w - 120, h: 120, fg: '#14306e', maxHiPx: 80 });
    const cols = ['#c0392b', '#2f6fa0', '#e0a030', '#2e7d4a', '#8a3a8a', '#d2691e'];
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    'ABCDEFGHIJ'.split('').forEach((ch, i) => { g.fillStyle = cols[i % 6]; g.font = `800 92px ${EN_FAMILY}`; g.fillText(ch, c.x + 110 + i * 142, c.y + 245); });
    'अआइईउऊएऐओऔ'.split('').forEach((ch, i) => { g.fillStyle = cols[(i + 3) % 6]; g.font = `700 92px ${HI_FAMILY}`; g.fillText(ch, c.x + 110 + i * 142, c.y + 355); });
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(90,70,50,${0.04 + rnd(i) * 0.1})`; g.fillRect(c.x + rnd(i + 1) * c.w, c.y + rnd(i + 2) * c.h, 4 + rnd(i + 3) * 24, 2 + rnd(i + 4) * 3); }
  }
  // cartoons: sunny face, flower, fish, house, balloons on a cream wall
  {
    const c = CELL.toon; panel(c, '#f0e6c4', '#c0392b');
    const ox = c.x, oy = c.y;
    g.fillStyle = '#f2b830'; g.beginPath(); g.arc(ox + 150, oy + 130, 62, 0, 6.3); g.fill();
    g.strokeStyle = '#f2b830'; g.lineWidth = 9;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(ox + 150 + Math.cos(a) * 78, oy + 130 + Math.sin(a) * 78); g.lineTo(ox + 150 + Math.cos(a) * 104, oy + 130 + Math.sin(a) * 104); g.stroke(); }
    g.fillStyle = '#5a3a1a'; g.beginPath(); g.arc(ox + 128, oy + 118, 7, 0, 6.3); g.arc(ox + 172, oy + 118, 7, 0, 6.3); g.fill();
    g.strokeStyle = '#8a2a1a'; g.lineWidth = 6; g.beginPath(); g.arc(ox + 150, oy + 140, 30, 0.2, Math.PI - 0.2); g.stroke();
    // house
    g.fillStyle = '#d98a3a'; g.fillRect(ox + 380, oy + 190, 190, 130); g.fillStyle = '#a23a2a'; g.beginPath(); g.moveTo(ox + 360, oy + 190); g.lineTo(ox + 475, oy + 110); g.lineTo(ox + 590, oy + 190); g.fill();
    g.fillStyle = '#4a3220'; g.fillRect(ox + 450, oy + 240, 50, 80); g.fillStyle = '#8fc4e8'; g.fillRect(ox + 395, oy + 215, 40, 36); g.fillRect(ox + 515, oy + 215, 40, 36);
    // flower
    g.strokeStyle = '#2e7d4a'; g.lineWidth = 10; g.beginPath(); g.moveTo(ox + 760, oy + 330); g.lineTo(ox + 760, oy + 190); g.stroke();
    g.fillStyle = '#2e7d4a'; g.beginPath(); g.ellipse(ox + 800, oy + 270, 34, 14, -0.5, 0, 6.3); g.fill();
    g.fillStyle = '#d6407a'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.arc(ox + 760 + Math.cos(a) * 36, oy + 160 + Math.sin(a) * 36, 26, 0, 6.3); g.fill(); }
    g.fillStyle = '#f2b830'; g.beginPath(); g.arc(ox + 760, oy + 160, 22, 0, 6.3); g.fill();
    // fish
    g.fillStyle = '#2f9ac0'; g.beginPath(); g.ellipse(ox + 1030, oy + 230, 95, 52, 0, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(ox + 1110, oy + 230); g.lineTo(ox + 1180, oy + 180); g.lineTo(ox + 1180, oy + 280); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ox + 985, oy + 215, 12, 0, 6.3); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(ox + 982, oy + 215, 5, 0, 6.3); g.fill();
    g.strokeStyle = '#7ec8e3'; g.lineWidth = 5; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(ox + 1060 + i * 26, oy + 230, 22, -1, 1); g.stroke(); }
    // balloons
    ['#c0392b', '#2f6fa0', '#2e7d4a'].forEach((col, i) => {
      const bx = ox + 1300 + i * 62, by = oy + 130 + (i % 2) * 30;
      g.strokeStyle = '#555'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx, by + 50); g.quadraticCurveTo(bx + 20, by + 130, ox + 1360, oy + 330); g.stroke();
      g.fillStyle = col; g.beginPath(); g.ellipse(bx, by, 36, 46, 0, 0, 6.3); g.fill();
    });
    drawBilingual(g, 'हँसो, खेलो, सीखो', 'Laugh, Play, Learn', { x: ox + c.w / 2, y: oy + c.h - 90, w: c.w - 700, h: 70, fg: '#6e1a12', maxHiPx: 46 });
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(90,70,50,${0.04 + rnd(i + 9) * 0.1})`; g.fillRect(ox + rnd(i + 11) * c.w, oy + rnd(i + 12) * c.h, 4 + rnd(i + 13) * 24, 2 + rnd(i + 14) * 3); }
  }
}

export function createVillageFurniture2(scene) {
  const group = new THREE.Group(); group.name = 'village_furniture2';
  const by = new Map(), colliders = [], report = [], decals = [];
  let seed = 211;
  for (const [kind, build] of Object.entries(BUILDERS)) {
    const sp = FURNITURE2_SPOTS[kind], world = sp && spotMatrix(sp);
    if (!world) continue;
    const sc = kind.endsWith('wall') ? 1 : 0.97 + rnd(seed) * 0.08;
    const w = world.clone().multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
    const o = new Obj(by, w, seed);
    const foot = build(o);
    for (const e of foot) colliders.push(colliderBoxFromTransform(e.w * sc, e.d * sc, w.clone().multiply(new THREE.Matrix4().makeTranslation(e.x, 0, e.z))));
    if (kind.endsWith('wall')) {
      const c = kind === 'schoolwall' ? CELL.alpha : CELL.toon;
      const geo = new THREE.PlaneGeometry(4.5, 4.5 * c.h / c.w);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (c.x + uv.getX(i) * c.w) / AW, 1 - (c.y + (1 - uv.getY(i)) * c.h) / AH);
      const back = geo.clone();
      decals.push(geo.applyMatrix4(w.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.8, 0.14))));
      decals.push(back.applyMatrix4(w.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, 0.8, -0.14)))); // same painting on the far face
    }
    const p = new THREE.Vector3().setFromMatrixPosition(world);
    report.push({ kind, x: +p.x.toFixed(2), z: +p.z.toFixed(2) });
    seed += 7;
  }
  let first = null;
  for (const [key, list] of by) {
    const m = new THREE.Mesh(mergeGeometries(list), getTiledMaterial(key, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
    m.name = `furniture2_${key}`; m.castShadow = true; m.receiveShadow = true;
    group.add(m); first = first || m;
  }
  if (first) first.userData.colliderBoxes = colliders;

  if (decals.length) {
    const canvas = document.createElement('canvas'); canvas.width = AW; canvas.height = AH;
    const g = canvas.getContext('2d'); paint(g);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    Promise.all([document.fonts.load(hiFont(40), 'क'), document.fonts.load(enFont(40), 'H'), document.fonts.ready]).then(() => { paint(g); tex.needsUpdate = true; }, () => {});
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mat.name = 'wall_writing'; // elevated wall fixture: exempt from the ground-contact check like signboards
    const dm = new THREE.Mesh(mergeGeometries(decals), mat);
    dm.name = 'furniture2_wall_paint'; dm.receiveShadow = true;
    group.add(dm);
  }
  scene.add(group);
  if (typeof window !== 'undefined') window.__furniture2 = { items: report, drawCalls: group.children.length };
  return { group, colliders };
}
