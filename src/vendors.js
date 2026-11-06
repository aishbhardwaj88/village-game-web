import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHORS } from './anchors.js';
import { getTiledMaterial, texturedBox } from './materials.js';
import { colliderBoxFromTransform } from './collision.js';
import { createWideSignAtlas, mapFrontFaceToRow } from './signboards.js';

/**
 * Street vendors (docs/VILLAGE_VOCABULARY.md section 4, "all OPEN, goods spilling outward"):
 *   icecream - push cart with an insulated painted box, three steel lids, a tarp canopy and a brass bell on the handle
 *   golgappa - plank thela with a basin of puris under a red cloth, a steel matka of pani, aloo, dona stacks
 *   tailor   - a one-room plaster shop, treadle machine IN the doorway, a shirt and a kurta on hangers on the jambs
 *   mochi    - jute mat, a cobbler's box with a sloping foot rest, an iron last, chappals and shoes, a big umbrella
 *   kabadi   - plank cart stacked with tied newspaper, cardboard, a sack of bottles, tin sheet, a cycle rim, a spring balance
 *   bangle   - a wooden stand of dowels stacked with glass bangles, an A-frame of hanging sets, a tarp on bamboo poles
 * No paan, gutkha or tobacco anywhere (CLAUDE.md section 7). No text on anything except the tailor's bilingual board.
 *
 * Positions were scouted with every zone forced and the full collider list (tmp/vendors/scout.mjs, the smallShops
 * scout with a 2.8 x 2.4 m footprint): footprint + 0.8 m clear of every collider, 0.6 m from the road/lane edge, local
 * +z facing the road. Stored as offsets from the chowk anchor so they ride with the square.
 *
 * Materials: frozen library sets only (wood, metal, plaster, jute, tarpaulin) at arch.py's tiling, plus ONE procedural
 * goods atlas (painted cart panel, puris, pani, cloth, leather, paper, cardboard, bottles, bangle glass, machine enamel).
 * Planks, wheels, spokes, bangles, puris, shoes are modelled pieces. Everything is merged per material across all six:
 * 5 library meshes + 1 goods + 1 sign + 1 capsule InstancedMesh = 8 draw calls. People are capsule placeholders.
 */

// ---- where (offsets from the chowk anchor, world axes; ry turns local +z onto the road) ----
const VENDORS = [
  { kind: 'icecream', dx: 8.88, dz: -13.4, ry: -1.131 }, // east side of the main road, just south of the cross road
  { kind: 'golgappa', dx: -26.5, dz: -15.94, ry: -0.098 }, // north side of the cross road, near the bazaar
  { kind: 'bangle', dx: -53.94, dz: -36.49, ry: -1.451 }, // bazaar-side inner lane
  { kind: 'tailor', dx: -39.19, dz: 10.04, ry: -0.087 }, // council lane
  { kind: 'mochi', dx: -0.37, dz: 15.27, ry: 1.401 }, // west side of the main road, north of the mithai shop
  { kind: 'kabadi', dx: 41.7, dz: 10.99, ry: -0.088 }, // lane east of the square
];
const SIGN = { hi: 'दर्ज़ी', en: 'Tailor', bg: '#e6dcc4', fg: '#1f2a4a', border: '#2a3a66' };
const TILE = { plaster: 0.5, wood: 1.0, metal: 1.0, jute: 0.5, tarpaulin: 1.0 };
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const jit = (c, i, amt = 0.08) => new THREE.Color(c).multiplyScalar(1 + (rnd(i) - 0.5) * 2 * amt).getHex();

// ---------------------------------------------------------------------------------------------------------------
// goods atlas, 1024 x 512, procedural
const AW = 1024, AH = 512;
const R = (x, y, w, h) => [x / AW, 1 - (y + h) / AH, (x + w) / AW, 1 - y / AH];
const UV = {
  panel: R(0, 0, 256, 192), puri: R(256, 0, 128, 128), pani: R(384, 0, 128, 128), aloo: R(512, 0, 128, 128),
  dona: R(640, 0, 128, 128), shirt: R(768, 0, 128, 128), bolts: R(896, 0, 128, 128),
  leather: R(0, 192, 128, 128), sole: R(128, 192, 128, 128), pedge: R(256, 192, 128, 128), news: R(384, 192, 128, 128),
  card: R(512, 192, 128, 128), bottle: R(640, 192, 128, 128), glass: R(768, 192, 128, 128), enamel: R(896, 192, 128, 128),
  cloth: R(0, 320, 128, 128), kurta: R(128, 320, 128, 128), tape: R(256, 320, 128, 32), plain: R(384, 320, 64, 64),
};
function grain(g, x, y, w, h, amt, seed = 1) {
  const img = g.getImageData(x, y, w, h), d = img.data;
  let s = seed * 9301 + 49297;
  for (let i = 0; i < d.length; i += 4) { s = (s * 9301 + 49297) % 233280; const n = (s / 233280 - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, x, y);
}
function check(g, x, y, w, h, base, lines, step, lw) {
  g.fillStyle = base; g.fillRect(x, y, w, h);
  g.fillStyle = lines;
  for (let k = 0; k < w; k += step) g.fillRect(x + k, y, lw, h);
  for (let k = 0; k < h; k += step) g.fillRect(x, y + k, w, lw);
}
function paintAtlas(g) {
  g.fillStyle = '#7a7268'; g.fillRect(0, 0, AW, AH);
  // ice-cream cart panel: cream with faded red and blue bands, painted cone / kulfi / cup shapes, rust and grime at the foot
  g.fillStyle = '#e6dcc6'; g.fillRect(0, 0, 256, 192);
  g.fillStyle = '#b8443a'; g.fillRect(0, 10, 256, 18); g.fillRect(0, 160, 256, 14);
  g.fillStyle = '#3a5a8a'; g.fillRect(0, 30, 256, 5); g.fillRect(0, 154, 256, 4);
  const cone = (cx, top, col) => { g.fillStyle = '#c89048'; g.beginPath(); g.moveTo(cx - 16, top + 22); g.lineTo(cx + 16, top + 22); g.lineTo(cx, top + 84); g.fill(); g.strokeStyle = '#a07030'; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(cx - 14 + k * 8, top + 24); g.lineTo(cx, top + 80); g.stroke(); } g.fillStyle = col; g.beginPath(); g.arc(cx, top + 18, 19, 0, 7); g.fill(); };
  cone(46, 50, '#e8b0c0'); cone(210, 50, '#f0e0a0');
  g.fillStyle = '#d8a060'; g.fillRect(100, 62, 22, 62); g.fillStyle = '#c8a078'; g.fillRect(108, 124, 6, 22); // kulfi on a stick
  g.fillStyle = '#e0d8c8'; g.beginPath(); g.moveTo(134, 80); g.lineTo(166, 80); g.lineTo(160, 130); g.lineTo(140, 130); g.fill(); // cup
  g.fillStyle = '#c87a8a'; g.beginPath(); g.arc(150, 78, 16, Math.PI, 0); g.fill();
  const dirt = g.createLinearGradient(0, 120, 0, 192); dirt.addColorStop(0, 'rgba(90,70,50,0)'); dirt.addColorStop(1, 'rgba(90,70,50,0.45)');
  g.fillStyle = dirt; g.fillRect(0, 120, 256, 72);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,80,50,${0.15 + Math.random() * 0.3})`; g.fillRect(Math.random() * 256, 140 + Math.random() * 50, 2 + Math.random() * 6, 1 + Math.random() * 3); }
  grain(g, 0, 0, 256, 192, 18, 1);
  // puri: golden crisp shell with darker blisters
  g.fillStyle = '#d6a052'; g.fillRect(256, 0, 128, 128);
  for (let i = 0; i < 160; i++) { g.fillStyle = ['#c08038', '#e4b468', '#b0702c'][i % 3]; g.beginPath(); g.arc(256 + Math.random() * 128, Math.random() * 128, 2 + Math.random() * 5, 0, 7); g.fill(); }
  grain(g, 256, 0, 128, 128, 20, 2);
  // pani: green-brown spiced water with floating mint and boondi
  g.fillStyle = '#5a7a3a'; g.fillRect(384, 0, 128, 128);
  for (let i = 0; i < 70; i++) { g.fillStyle = i % 2 ? '#3a5a26' : '#c89040'; g.beginPath(); g.arc(384 + Math.random() * 128, Math.random() * 128, 2 + Math.random() * 3, 0, 7); g.fill(); }
  // aloo masala: yellow mash with chana and coriander
  g.fillStyle = '#c8a050'; g.fillRect(512, 0, 128, 128);
  for (let i = 0; i < 120; i++) { g.fillStyle = ['#a87a3a', '#4a7a2a', '#d8b868', '#8a5a2a'][i % 4]; g.beginPath(); g.arc(512 + Math.random() * 128, Math.random() * 128, 2 + Math.random() * 4, 0, 7); g.fill(); }
  grain(g, 512, 0, 128, 128, 16, 3);
  // dona: dried sal-leaf bowl, veined
  g.fillStyle = '#8a7a4a'; g.fillRect(640, 0, 128, 128);
  g.strokeStyle = '#6a5a32'; g.lineWidth = 2; for (let k = 0; k < 12; k++) { g.beginPath(); g.moveTo(704, 64); g.lineTo(704 + Math.cos(k) * 70, 64 + Math.sin(k) * 70); g.stroke(); }
  grain(g, 640, 0, 128, 128, 22, 4);
  // shirt: pale blue check; cloth bolts: stripes of many cloths
  check(g, 768, 0, 128, 128, '#9ab0c4', 'rgba(60,80,110,0.45)', 16, 3); grain(g, 768, 0, 128, 128, 12, 5);
  for (let k = 0; k < 8; k++) { g.fillStyle = ['#8a3a3a', '#d8cbb0', '#3a5a7a', '#6a7a4a', '#c8a050', '#5a4a6a', '#b07858', '#e0d8c8'][k]; g.fillRect(896, k * 16, 128, 16); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(896, k * 16 + 14, 128, 2); }
  grain(g, 896, 0, 128, 128, 14, 6);
  // leather (scuffed brown), sole (worn rubber)
  g.fillStyle = '#6a4228'; g.fillRect(0, 192, 128, 128);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${150 + Math.random() * 40},110,70,0.25)`; g.fillRect(Math.random() * 128, 192 + Math.random() * 128, 3 + Math.random() * 10, 1 + Math.random() * 2); }
  grain(g, 0, 192, 128, 128, 20, 7);
  g.fillStyle = '#3a3430'; g.fillRect(128, 192, 128, 128); for (let y = 196; y < 320; y += 8) { g.fillStyle = '#2e2a26'; g.fillRect(128, y, 128, 3); }
  grain(g, 128, 192, 128, 128, 18, 8);
  // stacked paper edge, newsprint, cardboard, plastic bottle
  for (let y = 192; y < 320; y += 2) { g.fillStyle = y % 4 ? '#d4cebe' : '#aaa292'; g.fillRect(256, y, 128, 2); }
  g.fillStyle = '#ddd6c6'; g.fillRect(384, 192, 128, 128);
  g.fillStyle = '#3a3a38'; g.fillRect(392, 198, 112, 12);
  for (let yy = 216; yy < 316; yy += 5) { let xx = 392; while (xx < 500) { const L = 6 + Math.random() * 20; g.fillStyle = '#6a665e'; g.fillRect(xx, yy, Math.min(L, 504 - xx), 2); xx += L + 3; } }
  g.fillStyle = '#8a857a'; g.fillRect(392, 230, 50, 36);
  grain(g, 384, 192, 128, 128, 16, 9);
  g.fillStyle = '#a07c52'; g.fillRect(512, 192, 128, 128);
  for (let x = 512; x < 640; x += 5) { g.fillStyle = 'rgba(70,50,30,0.25)'; g.fillRect(x, 192, 2, 128); }
  g.fillStyle = 'rgba(200,180,140,0.6)'; g.fillRect(512, 244, 128, 14);
  grain(g, 512, 192, 128, 128, 22, 10);
  g.fillStyle = '#b8c8c4'; g.fillRect(640, 192, 128, 128);
  g.fillStyle = 'rgba(240,245,240,0.6)'; g.fillRect(650, 192, 14, 128); g.fillRect(700, 192, 6, 128);
  g.fillStyle = '#5a8a6a'; g.fillRect(640, 250, 128, 26); // unlabelled band
  grain(g, 640, 192, 128, 128, 14, 11);
  // bangle glass: pale with gloss streaks and gold flecks (colour comes from the vertex tint)
  g.fillStyle = '#d8d4cc'; g.fillRect(768, 192, 128, 128);
  for (let x = 768; x < 896; x += 9) { g.fillStyle = 'rgba(255,250,235,0.7)'; g.fillRect(x, 192, 3, 128); }
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(230,190,90,0.8)'; g.fillRect(768 + Math.random() * 128, 192 + Math.random() * 128, 2, 2); }
  // machine enamel: near-black with a worn gold scroll (no name)
  g.fillStyle = '#26241f'; g.fillRect(896, 192, 128, 128);
  g.strokeStyle = '#a88a48'; g.lineWidth = 3; g.beginPath(); for (let a = 0; a < 12; a += 0.2) { const r = 6 + a * 3.5; g.lineTo(960 + Math.cos(a) * r, 256 + Math.sin(a) * r * 0.6); } g.stroke();
  grain(g, 896, 192, 128, 128, 14, 12);
  // red cloth with white check (golgappa basin), kurta cotton (off-white)
  check(g, 0, 320, 128, 128, '#a83a32', 'rgba(230,220,200,0.55)', 20, 3); grain(g, 0, 320, 128, 128, 16, 13);
  g.fillStyle = '#ddd6c4'; g.fillRect(128, 320, 128, 128); for (let y = 320; y < 448; y += 3) { g.fillStyle = 'rgba(160,150,130,0.18)'; g.fillRect(128, y, 128, 1); }
  grain(g, 128, 320, 128, 128, 12, 14);
  // measuring tape: yellow with tick marks
  g.fillStyle = '#d8b840'; g.fillRect(256, 320, 128, 32); g.fillStyle = '#3a3220'; for (let x = 258; x < 384; x += 4) g.fillRect(x, 320, 1, x % 20 < 4 ? 14 : 7);
  // plain neutral (tinted per piece)
  g.fillStyle = '#c8c0b0'; g.fillRect(384, 320, 64, 64); grain(g, 384, 320, 64, 64, 18, 15);
}
let goodsTex = null;
function getGoodsMat() {
  if (!goodsTex) {
    const c = document.createElement('canvas'); c.width = AW; c.height = AH;
    paintAtlas(c.getContext('2d'));
    goodsTex = new THREE.CanvasTexture(c); goodsTex.colorSpace = THREE.SRGBColorSpace; goodsTex.anisotropy = 8;
  }
  return Object.assign(new THREE.MeshStandardMaterial({ map: goodsTex, roughness: 0.72, metalness: 0, vertexColors: true }), { name: 'vendor_goods' });
}

// ---------------------------------------------------------------------------------------------------------------
// geometry helpers (local frame: x across the front, +z toward the road)
function tintGeo(geo, tint) {
  const n = geo.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color(tint);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
function remapUV(geo, r) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1])); return geo; }
function atlasBox(w, h, d, front, side = front, top = front) {
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const r = (f === 4 || f === 5) ? front : (f === 2 || f === 3) ? top : side;
    for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1])); }
  }
  return geo;
}
function planarUV(geo, axis, tile) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (axis === 'y') uv.setXY(i, x / tile, z / tile); else if (axis === 'z') uv.setXY(i, x / tile, y / tile); else uv.setXY(i, z / tile, y / tile);
  }
  return geo;
}

class Batch {
  constructor() { this.by = new Map(); }
  add(key, geo) { if (!this.by.has(key)) this.by.set(key, []); this.by.get(key).push(geo); }
  flush(group) {
    const out = {};
    for (const [key, list] of this.by) {
      const norm = list.map((g) => { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) x.deleteAttribute(k); return x; });
      const mat = key === 'goods' ? getGoodsMat() : getTiledMaterial(key, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
      const m = new THREE.Mesh(mergeGeometries(norm), mat);
      m.name = `vendors_${key}`; m.castShadow = true; m.receiveShadow = true;
      group.add(m); out[key] = m;
    }
    return out;
  }
}

class Site {
  constructor(site, batch) { this.site = site; this.b = batch; }
  place(geo, lx, ly, lz, yaw = 0, roll = 0, pitch = 0) {
    if (pitch) geo.rotateX(pitch);
    if (roll) geo.rotateZ(roll);
    if (yaw) geo.rotateY(yaw);
    geo.translate(lx, ly, lz); geo.rotateY(this.site.ry); geo.translate(this.site.x, 0, this.site.z);
    return geo;
  }
  box(set, w, h, d, lx, ly, lz, tint, yaw = 0, roll = 0, pitch = 0) {
    this.b.add(set, this.place(texturedBox(w, h, d, set, { tileSize: TILE[set], tint }).geometry, lx, ly, lz, yaw, roll, pitch));
  }
  lib(set, geo, lx, ly, lz, tint, yaw = 0, roll = 0, pitch = 0) { this.b.add(set, this.place(tintGeo(geo.index ? geo.toNonIndexed() : geo, tint), lx, ly, lz, yaw, roll, pitch)); }
  goods(geo, lx, ly, lz, tint = 0xffffff, yaw = 0, roll = 0, pitch = 0) { this.b.add('goods', this.place(tintGeo(geo.index ? geo.toNonIndexed() : geo, tint), lx, ly, lz, yaw, roll, pitch)); }
  /** round rod between two local points (bamboo, iron tube, dowel) */
  rod(set, r, a, b, tint, seg = 6) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(r, r, L, seg, 1); planarUV(g, 'x', TILE[set] || 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
    const m = A.add(B).multiplyScalar(0.5);
    this.lib(set, g, m.x, m.y, m.z, tint);
  }
  /** spoked wheel, axle along local x at (lx, r, lz); tyre, rim, spokes, hub */
  wheel(r, lx, lz, seed, spokes = 10) {
    const tyre = new THREE.TorusGeometry(r - 0.02, 0.022, 5, 20); planarUV(tyre, 'z', TILE.metal);
    this.lib('metal', tyre, lx, r, lz, jit(0x2c2a28, seed, 0.1), Math.PI / 2);
    const rim = new THREE.TorusGeometry(r - 0.045, 0.008, 3, 20); planarUV(rim, 'z', TILE.metal);
    this.lib('metal', rim, lx, r, lz, jit(0x8a8478, seed + 1, 0.1), Math.PI / 2);
    for (let k = 0; k < spokes; k++) this.box('metal', 0.006, 2 * (r - 0.05), 0.006, lx, r, lz, 0x9a968c, Math.PI / 2, (k / spokes) * Math.PI + rnd(seed) * 0.3);
    const hub = new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8); planarUV(hub, 'x', TILE.metal);
    this.lib('metal', hub, lx, r, lz, 0x5a5650, 0, Math.PI / 2);
  }
  /** plank deck along x: n boards with small gaps and per-board tint/height jitter */
  planks(w, d, n, ly, lz, tint, seed, lx = 0) {
    const bw = d / n;
    for (let k = 0; k < n; k++) this.box('wood', w + (rnd(seed + k) - 0.5) * 0.04, 0.03 + rnd(seed + k * 3) * 0.006, bw - 0.012, lx + (rnd(seed + k * 5) - 0.5) * 0.02, ly, lz - d / 2 + bw * (k + 0.5), jit(tint, seed + k, 0.14));
  }
}

const people = [];
const person = (site, lx, lz, h, yaw, tint, sit = 0) => people.push({ site, lx, lz, h, yaw, tint, sit });

// ---------------------------------------------------------------------------------------------------------------
function buildIceCream(s, seed) {
  // chassis, four spoked wheels, handle
  s.box('metal', 1.25, 0.04, 0.66, 0, 0.56, 0, 0x4a4e52);
  for (const sx of [-1, 1]) s.box('metal', 0.04, 0.32, 0.04, sx * 0.5, 0.4, 0, 0x4a4e52);
  s.box('metal', 1.1, 0.03, 0.03, 0, 0.26, 0, 0x5a5a56); // axle bar
  for (const sx of [-0.45, 0.45]) for (const sz of [-0.37, 0.37]) s.wheel(0.26, sx, sz, seed + sx * 7 + sz * 3, 8);
  for (const sz of [-0.28, 0.28]) s.rod('metal', 0.014, [-0.62, 0.6, sz], [-1.05, 0.98, sz * 0.9], 0x5a5e62);
  s.rod('metal', 0.018, [-1.05, 0.98, -0.3], [-1.05, 0.98, 0.3], 0x6a6e70);
  for (const sz of [-0.12, 0.12]) s.box('jute', 0.06, 0.06, 0.12, -1.05, 0.98, sz, 0x7a4a3a); // rag-wrapped grips
  // insulated box: painted panels, steel top, three lids, a rust line along the foot
  s.goods(atlasBox(1.15, 0.6, 0.62, UV.panel, UV.panel, UV.plain), 0, 0.88, 0, jit(0xf2ece0, seed, 0.05));
  s.box('metal', 1.19, 0.025, 0.66, 0, 1.19, 0, 0xb4b2aa);
  s.box('metal', 1.17, 0.04, 0.64, 0, 0.6, 0, 0x6a5a48); // rusted foot rail
  for (let k = 0; k < 3; k++) {
    const lid = new THREE.CylinderGeometry(0.13, 0.135, 0.035, 16); planarUV(lid, 'y', TILE.metal);
    s.lib('metal', lid, -0.36 + k * 0.36, 1.22, 0.02, jit(0xc4c2ba, seed + k, 0.07));
    const knob = new THREE.SphereGeometry(0.025, 8, 5); planarUV(knob, 'y', TILE.metal);
    s.lib('metal', knob, -0.36 + k * 0.36, 1.255, 0.02, 0x3a3836);
  }
  // red check cloth over one corner, a steel scoop, a cone holder of wafers
  s.goods(atlasBox(0.32, 0.01, 0.4, UV.cloth), 0.42, 1.21, -0.12, 0xe8dcd0, 0.2, 0.08);
  s.box('metal', 0.22, 0.012, 0.03, 0.18, 1.215, 0.22, 0xb8b6ae, 0.4);
  const holder = new THREE.CylinderGeometry(0.05, 0.05, 0.16, 10, 1, true); planarUV(holder, 'z', TILE.metal);
  s.lib('metal', holder, 0.62, 1.1, 0.22, 0x9a9890);
  for (let k = 0; k < 4; k++) { const c = new THREE.ConeGeometry(0.03, 0.12, 8); s.goods(remapUV(c, UV.puri), 0.62, 1.2 + k * 0.012, 0.22, 0xffffff, 0, 0, Math.PI); }
  // canopy: four thin tubes, a tarp peaked along x, a cloth fringe
  for (const sx of [-0.55, 0.55]) for (const sz of [-0.3, 0.3]) s.rod('metal', 0.012, [sx, 1.2, sz], [sx, 1.98, sz], 0x7a7c7c, 5);
  for (const side of [-1, 1]) s.box('tarpaulin', 1.4, 0.012, 0.48, 0, 2.02, side * 0.21, jit(0xc85a48, seed + 9, 0.06), 0, 0, side * 0.2);
  for (const side of [-1, 1]) s.box('tarpaulin', 1.4, 0.1, 0.008, 0, 1.92, side * 0.45, 0xe0d4b8);
  // brass bell on the handle bar, with its pull cord
  const prof = []; for (let i = 0; i <= 6; i++) { const t = i / 6; prof.push(new THREE.Vector2(0.012 + Math.pow(t, 1.6) * 0.05, -t * 0.07)); }
  const bell = new THREE.LatheGeometry(prof, 12); planarUV(bell, 'y', TILE.metal);
  s.lib('metal', bell, -1.05, 0.975, 0.18, 0xb89848, 0, 0, Math.PI); // mouth up, a cycle-type gong bell
  s.box('metal', 0.01, 0.03, 0.01, -1.05, 0.995, 0.18, 0x6a5a30);
  s.rod('jute', 0.004, [-1.05, 0.99, 0.22], [-0.9, 0.8, 0.28], 0xd8c8a0, 3);
  // vendor at the handle, a child at the front
  person(s.site, -1.45, 0.05, 1.66, Math.PI / 2, 0x8a7a5a);
  person(s.site, 0.15, 0.85, 1.15, Math.PI, 0x6a5a8a);
}

function buildGolgappa(s, seed) {
  // thela: four spoked wheels, iron frame, plank top with a lip
  s.box('metal', 1.5, 0.05, 0.82, 0, 0.62, 0, 0x4a4842);
  for (const sx of [-0.55, 0.55]) for (const sz of [-0.44, 0.44]) s.wheel(0.3, sx, sz, seed + sx * 5 + sz, 10);
  s.planks(1.62, 0.92, 6, 0.68, 0, 0x8a6a4a, seed);
  for (const sz of [-0.47, 0.47]) s.box('wood', 1.64, 0.06, 0.04, 0, 0.72, sz, 0x6a4e36);
  s.rod('metal', 0.016, [0.8, 0.66, -0.35], [1.2, 0.95, -0.35], 0x5a5852); s.rod('metal', 0.016, [0.8, 0.66, 0.35], [1.2, 0.95, 0.35], 0x5a5852);
  s.rod('metal', 0.02, [1.2, 0.95, -0.36], [1.2, 0.95, 0.36], 0x6a6862);
  // big steel parat heaped with puris, half under a red cloth
  const parat = new THREE.CylinderGeometry(0.34, 0.3, 0.07, 22, 1, true); planarUV(parat, 'z', TILE.metal);
  s.lib('metal', parat, -0.3, 0.78, -0.05, 0xc0beb6);
  const base = new THREE.CircleGeometry(0.3, 20); base.rotateX(-Math.PI / 2); planarUV(base, 'y', TILE.metal);
  s.lib('metal', base, -0.3, 0.75, -0.05, 0xa8a6a0);
  let i = 0;
  for (let layer = 0; layer < 3; layer++) {
    const n = [30, 18, 8][layer], rr = [0.26, 0.18, 0.09][layer];
    for (let k = 0; k < n; k++, i++) {
      const a = (k / n) * Math.PI * 2 + layer, rad = rr * Math.sqrt(rnd(seed + i));
      s.goods(remapUV(new THREE.IcosahedronGeometry(0.034, 1), UV.puri), -0.3 + Math.cos(a) * rad, 0.79 + layer * 0.045, -0.05 + Math.sin(a) * rad, jit(0xffffff, i, 0.1), 0, 0, 0);
    }
  }
  const cloth = new THREE.PlaneGeometry(0.62, 0.5, 6, 4); cloth.rotateX(-Math.PI / 2);
  { const p = cloth.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k); p.setY(k, 0.11 * Math.cos(x * 2.4) * Math.cos(z * 2.8) + 0.02 * rnd(k + seed)); } cloth.computeVertexNormals(); }
  s.goods(remapUV(cloth, UV.cloth), -0.38, 0.8, -0.18, 0xece0d4, 0.4);
  // steel matka of pani with a ladle, aloo bowl, onion and chutney katoris, dona stacks
  const mp = []; for (let k = 0; k <= 10; k++) { const t = k / 10; mp.push(new THREE.Vector2(0.03 + Math.sin(t * Math.PI) * 0.17 + t * 0.06, t * 0.34)); }
  const matka = new THREE.LatheGeometry(mp, 18); planarUV(matka, 'y', TILE.metal);
  s.lib('metal', matka, 0.38, 0.7, -0.12, 0xc8c6be);
  const pani = new THREE.CircleGeometry(0.085, 14); pani.rotateX(-Math.PI / 2); s.goods(remapUV(pani, UV.pani), 0.38, 1.0, -0.12, 0xffffff);
  s.rod('metal', 0.006, [0.38, 0.95, -0.12], [0.5, 1.2, 0.0], 0x9a988e, 4);
  const bowl = (lx, lz, r, uv, tint) => {
    const b = new THREE.CylinderGeometry(r, r * 0.75, r * 0.6, 14, 1, true); planarUV(b, 'z', TILE.metal);
    s.lib('metal', b, lx, 0.7 + r * 0.3, lz, 0xbcbab2);
    const f = new THREE.CircleGeometry(r * 0.95, 12); f.rotateX(-Math.PI / 2); s.goods(remapUV(f, uv), lx, 0.7 + r * 0.5, lz, tint);
  };
  bowl(0.15, 0.25, 0.13, UV.aloo, 0xffffff); bowl(0.45, 0.28, 0.07, UV.pani, 0x8a5a3a); bowl(0.62, 0.15, 0.07, UV.plain, 0xd8b8c8);
  for (let st = 0; st < 2; st++) for (let k = 0; k < 9; k++) { const d = new THREE.CylinderGeometry(0.055, 0.035, 0.03, 10, 1, true); s.goods(remapUV(d, UV.dona), -0.68 + st * 0.13, 0.71 + k * 0.012, 0.3, jit(0xffffff, k + st * 9, 0.12)); }
  // canopy: two bamboo poles at the back, faded blue tarp sloping to the front
  for (const sx of [-0.78, 0.78]) s.rod('wood', 0.025, [sx, 0.7, -0.45], [sx + (rnd(seed + sx) - 0.5) * 0.05, 2.1, -0.45], 0xc0a870, 6);
  s.box('tarpaulin', 1.8, 0.012, 1.2, 0, 2.02, 0.1, jit(0x5a7a9a, seed, 0.06), 0, 0, Math.atan2(0.18, 1.2));
  // used donas on the ground in front, a steel dustbin bucket
  for (let k = 0; k < 5; k++) { const d = new THREE.CylinderGeometry(0.05, 0.035, 0.025, 8, 1, true); s.goods(remapUV(d, UV.dona), -0.5 + rnd(seed + k) * 1.4, 0.03, 0.62 + rnd(seed + k + 5) * 0.45, 0xb0a890, 0, (rnd(k) - 0.5) * 2, 0.8); }
  const bin = new THREE.CylinderGeometry(0.16, 0.13, 0.36, 12, 1, true); planarUV(bin, 'z', TILE.metal);
  s.lib('metal', bin, 1.05, 0.18, 0.35, 0x8a8a84);
  person(s.site, -0.1, -0.85, 1.64, 0, 0x7a6a4a);
  person(s.site, 0.15, 0.95, 1.58, Math.PI, 0x8a4a6a);
  person(s.site, -0.55, 0.9, 1.7, Math.PI + 0.3, 0x4a6a8a);
}

function buildTailor(s, seed) {
  const W = 3.0, D = 2.0, H = 2.75, T = 0.2, zc = -0.4, front = zc + D / 2;
  const wall = jit(0xd8ceb4, seed, 0.05);
  s.box('plaster', W + 0.2, 0.2, D + 0.6, 0, 0.1, zc + 0.3, 0xa8a49a); // cement plinth with a front landing
  s.box('plaster', 1.3, 0.1, 0.35, 0, 0.05, front + 0.75, 0x9a968c); // step
  s.box('plaster', W, H, T, 0, H / 2 + 0.2, zc - D / 2 + T / 2, jit(wall, 1, 0.04));
  for (const sx of [-1, 1]) s.box('plaster', T, H, D, sx * (W / 2 - T / 2), H / 2 + 0.2, zc, jit(wall, sx + 3, 0.04));
  const DW = 1.3, DH = 2.1;
  for (const sx of [-1, 1]) s.box('plaster', (W - DW) / 2, H, T, sx * (DW / 2 + (W - DW) / 4), H / 2 + 0.2, front - T / 2, jit(wall, sx + 5, 0.04));
  s.box('plaster', DW, H - DH, T, 0, 0.2 + DH + (H - DH) / 2, front - T / 2, wall);
  s.box('plaster', W, 0.35, T + 0.02, 0, 0.375, front - T / 2 + 0.005, jit(0x8a9a8a, seed, 0.06)); // green dado band
  s.box('plaster', W + 0.3, 0.12, D + 0.3, 0, H + 0.26, zc + 0.05, 0xb4b0a6); // roof slab
  s.box('plaster', DW + 0.5, 0.07, 0.5, 0, 0.2 + DH + 0.25, front + 0.25, 0xb8b4aa); // chajja over the door
  // dirt and rain stains: darker skins along the foot and under the chajja
  s.box('plaster', W + 0.01, 0.22, T + 0.03, 0, 0.31, front - T / 2, 0x8a826e);
  // door frame (jambs, lintel), two leaves folded back against the wall
  for (const sx of [-1, 1]) s.box('wood', 0.08, DH, 0.12, sx * (DW / 2 - 0.04), 0.2 + DH / 2, front + 0.01, 0x6a4a32);
  s.box('wood', DW, 0.1, 0.12, 0, 0.2 + DH - 0.05, front + 0.01, 0x6a4a32);
  for (const sx of [-1, 1]) {
    s.box('wood', 0.6, DH - 0.12, 0.04, sx * (DW / 2 + 0.32), 0.2 + (DH - 0.12) / 2 + 0.02, front + 0.05, jit(0x5a7a8a, seed + sx, 0.08));
    for (const py of [0.6, 1.3, 1.9]) s.box('wood', 0.5, 0.06, 0.02, sx * (DW / 2 + 0.32), 0.2 + py, front + 0.08, jit(0x4a6a7a, py * 10 + sx, 0.08));
    for (const py of [0.4, 1.8]) s.box('metal', 0.1, 0.03, 0.02, sx * (DW / 2 + 0.05), 0.2 + py, front + 0.07, 0x3a3834); // hinges
  }
  // inside: back shelf of cloth bolts, a bulb on a flex, a calendar-free bare wall, cut-cloth bundle on the floor
  const back = zc - D / 2 + T;
  for (let k = 0; k < 2; k++) {
    s.box('wood', W - 0.6, 0.03, 0.3, 0, 1.2 + k * 0.5, back + 0.15, 0x7a5a3a);
    for (let b = 0; b < 6; b++) s.goods(atlasBox(0.32, 0.12 + rnd(seed + b + k * 6) * 0.08, 0.26, UV.bolts, UV.bolts, UV.bolts), -1.0 + b * 0.4, 1.28 + k * 0.5 + 0.02, back + 0.15, jit(0xffffff, b + k * 6, 0.12), (rnd(b) - 0.5) * 0.1);
  }
  s.rod('metal', 0.003, [0.3, 2.95, zc], [0.3, 2.3, zc], 0x2a2a28, 3);
  s.lib('metal', planarUV(new THREE.SphereGeometry(0.04, 8, 6), 'y', 1), 0.3, 2.27, zc, 0xe8e4d4);
  // treadle machine IN the doorway: table, iron stand with treadle plate and flywheel, enamel head, cloth under the needle
  const tz = front + 0.05;
  s.planks(0.95, 0.48, 3, 0.95, tz, 0x7a5a3a, seed + 40);
  for (const sx of [-1, 1]) {
    s.box('metal', 0.05, 0.72, 0.05, sx * 0.38, 0.56, tz - 0.18, 0x2e2c2a, 0, sx * 0.06);
    s.box('metal', 0.05, 0.72, 0.05, sx * 0.38, 0.56, tz + 0.18, 0x2e2c2a, 0, sx * 0.06);
    s.box('metal', 0.04, 0.04, 0.44, sx * 0.4, 0.24, tz, 0x2e2c2a);
  }
  s.box('metal', 0.5, 0.025, 0.28, 0, 0.3, tz + 0.02, 0x3a3836, 0, 0, 0.15); // treadle plate
  const fly = new THREE.TorusGeometry(0.17, 0.018, 4, 18); planarUV(fly, 'z', 1); s.lib('metal', fly, 0.33, 0.58, tz, 0x34322e, Math.PI / 2);
  s.rod('metal', 0.006, [0.33, 0.75, tz + 0.01], [0.33, 1.08, tz + 0.01], 0x5a4a38, 3); // belt
  s.goods(atlasBox(0.4, 0.05, 0.2, UV.enamel, UV.enamel, UV.enamel), 0, 0.99, tz, 0xffffff);
  s.goods(atlasBox(0.08, 0.24, 0.12, UV.enamel), 0.15, 1.13, tz, 0xffffff);
  s.goods(atlasBox(0.36, 0.08, 0.11, UV.enamel), 0.0, 1.27, tz, 0xffffff);
  s.goods(atlasBox(0.06, 0.15, 0.08, UV.enamel), -0.16, 1.18, tz, 0xffffff);
  const hw = new THREE.CylinderGeometry(0.065, 0.065, 0.03, 14); planarUV(hw, 'y', 1); s.lib('metal', hw, 0.22, 1.2, tz, 0x8a8a84, 0, Math.PI / 2);
  s.goods(atlasBox(0.42, 0.006, 0.34, UV.kurta), -0.12, 0.98, tz + 0.02, jit(0xc8d8e0, seed, 0.05), 0.15);
  s.goods(atlasBox(0.6, 0.004, 0.03, UV.tape), 0.05, 0.97, tz + 0.24, 0xffffff, 0.2, 0, 1.3); // tape over the edge
  s.box('metal', 0.14, 0.008, 0.02, 0.32, 0.975, tz + 0.12, 0x9a9890, 0.5); s.box('metal', 0.14, 0.008, 0.02, 0.32, 0.977, tz + 0.12, 0x9a9890, 0.25); // scissors
  s.box('wood', 0.34, 0.45, 0.34, 0, 0.42, tz - 0.55, 0x6a4a32); // stool
  person(s.site, 0, tz - 0.55, 1.6, 0, 0x5a6a7a, 1);
  // shirt and kurta on hangers hooked to nails in the jambs, outside
  const hanger = (lx, top) => {
    s.rod('metal', 0.005, [lx - 0.21, top - 0.1, front + 0.14], [lx, top, front + 0.14], 0x8a8478, 3);
    s.rod('metal', 0.005, [lx + 0.21, top - 0.1, front + 0.14], [lx, top, front + 0.14], 0x8a8478, 3);
    s.rod('metal', 0.005, [lx - 0.21, top - 0.1, front + 0.14], [lx + 0.21, top - 0.1, front + 0.14], 0x8a8478, 3);
    const hook = new THREE.TorusGeometry(0.025, 0.004, 3, 8, Math.PI * 1.3); planarUV(hook, 'z', 1); s.lib('metal', hook, lx, top + 0.03, front + 0.13, 0x8a8478, Math.PI / 2);
    s.box('metal', 0.012, 0.012, 0.08, lx, top + 0.05, front + 0.09, 0x3a3836); // nail
  };
  const garment = (lx, top, len, uv, tint, sway) => {
    hanger(lx, top);
    s.goods(atlasBox(0.44, len, 0.03, uv), lx, top - 0.1 - len / 2, front + 0.15, tint, 0, sway);
    for (const sx of [-1, 1]) s.goods(atlasBox(0.16, 0.42, 0.025, uv), lx + sx * 0.25, top - 0.32, front + 0.15, jit(tint, sx + 2, 0.04), 0, sx * 0.32 + sway);
    s.goods(atlasBox(0.16, 0.05, 0.04, uv), lx, top - 0.08, front + 0.16, jit(tint, 9, 0.05));
  };
  garment(DW / 2 + 0.25, 2.08, 0.62, UV.shirt, jit(0xe6eef4, seed + 2, 0.04), 0.04);
  garment(-DW / 2 - 0.25, 2.08, 0.95, UV.kurta, jit(0xe8d0b0, seed + 3, 0.05), -0.03);
}

function buildMochi(s, seed) {
  s.box('jute', 1.4, 0.012, 0.95, 0.05, 0.006, 0.25, jit(0x9a7a50, seed, 0.08), 0.06);
  for (let k = 0; k < 9; k++) s.box('jute', 0.01, 0.014, 0.95, -0.6 + k * 0.16, 0.008, 0.25, 0x6a5232, 0.06); // woven warp bands
  // cobbler's box: wooden chest with a sloping foot rest and a drawer
  s.box('wood', 0.46, 0.26, 0.32, 0.25, 0.14, 0.4, jit(0x6a4a30, seed, 0.1));
  s.box('wood', 0.4, 0.03, 0.26, 0.25, 0.32, 0.4, 0x5a3e28, 0, 0, -0.38);
  s.box('wood', 0.07, 0.1, 0.24, 0.25, 0.32, 0.47, 0x5a3e28);
  s.box('metal', 0.06, 0.02, 0.01, 0.25, 0.14, 0.565, 0x8a8478);
  // iron last (T-stand with a foot), hammer, polish tins, brushes, a spool of thread
  s.rod('metal', 0.012, [-0.05, 0.01, 0.55], [-0.05, 0.3, 0.55], 0x3a3834, 6);
  s.box('metal', 0.08, 0.05, 0.24, -0.05, 0.32, 0.56, 0x34322e);
  s.box('wood', 0.02, 0.02, 0.22, 0.6, 0.02, 0.5, 0x8a6a48, 0.4); s.box('metal', 0.07, 0.03, 0.03, 0.56, 0.025, 0.42, 0x4a4844, 0.4);
  for (let k = 0; k < 4; k++) {
    const t = new THREE.CylinderGeometry(0.04, 0.04, 0.025, 12); planarUV(t, 'y', 1);
    s.lib('metal', t, 0.55 + (k % 2) * 0.1, 0.025, 0.15 + Math.floor(k / 2) * 0.1, [0x3a3028, 0x6a3a28, 0x8a8478, 0x2e2c2a][k]);
  }
  for (let k = 0; k < 2; k++) { s.box('wood', 0.14, 0.03, 0.05, 0.35 + k * 0.18, 0.02, 0.7, 0x8a6a48, 0.3 + k); s.box('jute', 0.12, 0.025, 0.04, 0.35 + k * 0.18, 0.045, 0.7, 0x2e2a26, 0.3 + k); }
  s.lib('jute', planarUV(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), 'z', 0.5), 0.4, 0.035, 0.0, 0xd8d0b8);
  // chappals and shoes lined along the front edge of the mat, some waiting, some mended
  for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) {
    const x = -0.55 + k * 0.24 + sx * 0.05, z = 0.62 + (rnd(seed + k) - 0.5) * 0.06, y0 = 0.012;
    s.goods(atlasBox(0.09, 0.02, 0.25, UV.sole), x, y0 + 0.01, z, jit(0xffffff, k, 0.1), (rnd(k + 9) - 0.5) * 0.25);
    if (k < 2) { const st = new THREE.TorusGeometry(0.04, 0.008, 4, 10, Math.PI); s.goods(remapUV(st, UV.leather), x, y0 + 0.02, z + 0.04, jit(0xffffff, k + 3, 0.15), Math.PI / 2 * 0); }
    else { s.goods(atlasBox(0.09, 0.07, 0.15, UV.leather), x, y0 + 0.055, z - 0.04, jit([0xffffff, 0x9a8a7a][k - 2], k + sx, 0.08)); s.goods(atlasBox(0.085, 0.04, 0.1, UV.leather), x, y0 + 0.04, z + 0.07, jit([0xffffff, 0x9a8a7a][k - 2], k + sx + 4, 0.08)); }
  }
  // umbrella: patched tarp cone on a bamboo pole lashed to a brick-weighted stand
  const pole = [-0.75, 0, -0.3];
  s.rod('wood', 0.022, pole, [-0.6, 2.05, -0.15], 0xb8a068, 6);
  const umb = new THREE.ConeGeometry(1.15, 0.38, 8, 1, true); planarUV(umb, 'y', TILE.tarpaulin);
  s.lib('tarpaulin', umb, -0.5, 2.15, 0.0, jit(0x3a5a8a, seed, 0.06), 0.2, 0.1, 0.12);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; s.rod('metal', 0.004, [-0.5, 2.3, 0], [-0.5 + Math.cos(a) * 1.08, 1.98 + Math.sin(a) * 0.1, Math.sin(a) * 1.08], 0x5a5852, 3); }
  s.box('plaster', 0.3, 0.12, 0.3, pole[0], 0.06, pole[2], 0x9a8a78);
  person(s.site, -0.3, 0.15, 1.6, 0, 0x6a5a4a, 2);
  person(s.site, 0.95, 0.95, 1.68, Math.PI + 0.6, 0x4a5a6a);
}

function buildKabadi(s, seed) {
  // hand thela: iron frame, two big wheels and two small, plank deck, side rails
  s.box('metal', 1.8, 0.05, 0.92, 0, 0.58, 0, 0x3e3c38);
  for (const sz of [-0.5, 0.5]) s.wheel(0.32, 0.35, sz, seed + sz * 3, 12);
  for (const sz of [-0.48, 0.48]) s.wheel(0.2, -0.6, sz, seed + sz * 9 + 4, 8);
  s.box('metal', 0.04, 0.38, 0.04, -0.6, 0.39, 0, 0x3e3c38);
  s.planks(1.9, 0.98, 7, 0.64, 0, 0x7a6248, seed);
  for (const sz of [-0.5, 0.5]) { s.box('wood', 1.9, 0.07, 0.04, 0, 0.82, sz, jit(0x6a5238, seed + sz, 0.1)); for (const sx of [-0.9, 0, 0.9]) s.box('wood', 0.05, 0.22, 0.05, sx, 0.74, sz, 0x5a4430); }
  s.box('wood', 0.04, 0.07, 1.0, 0.95, 0.82, 0, 0x6a5238);
  for (const sz of [-0.38, 0.38]) s.rod('metal', 0.016, [-0.9, 0.6, sz], [-1.35, 0.92, sz * 0.9], 0x4a4842);
  s.rod('metal', 0.02, [-1.35, 0.92, -0.36], [-1.35, 0.92, 0.36], 0x5a5852);
  // the load: tied newspaper bundles, flattened cardboard, a bulging sack of bottles, tin sheet, rods, a cycle rim, a bucket
  for (let k = 0; k < 5; k++) {
    const h = 0.14 + rnd(seed + k) * 0.06, x = -0.55 + (k % 3) * 0.34, y = 0.66 + (k > 2 ? 0.17 : 0) + h / 2, z = -0.22 + (k > 2 ? 0.05 : 0);
    s.goods(atlasBox(0.32, h, 0.42, UV.pedge, UV.pedge, UV.news), x, y, z, jit(0xf0e8d8, k, 0.1), (rnd(k + 3) - 0.5) * 0.2);
    for (const bz of [-0.1, 0.1]) s.box('jute', 0.335, h + 0.01, 0.012, x, y, z + bz, 0xb8a078, (rnd(k + 3) - 0.5) * 0.2);
  }
  for (let k = 0; k < 6; k++) s.goods(atlasBox(0.7 + rnd(k) * 0.15, 0.012, 0.55 + rnd(k + 1) * 0.1, UV.card), 0.45, 0.67 + k * 0.014, 0.18, jit(0xffffff, k + seed, 0.12), (rnd(k + 6) - 0.5) * 0.3);
  const sack = new THREE.SphereGeometry(0.28, 12, 8); { const p = sack.attributes.position; for (let i = 0; i < p.count; i++) { p.setY(i, p.getY(i) * 1.25); p.setX(i, p.getX(i) * (1 + 0.08 * Math.sin(i * 1.7))); } sack.computeVertexNormals(); }
  planarUV(sack, 'z', TILE.jute); s.lib('jute', sack, 0.45, 1.0, -0.2, jit(0xb8a07a, seed, 0.08));
  for (let k = 0; k < 6; k++) { const b = new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8); s.goods(remapUV(b, UV.bottle), 0.35 + (k % 3) * 0.08, 1.38, -0.25 + Math.floor(k / 3) * 0.08, jit([0xffffff, 0xc8e0d0, 0xd8c8a8][k % 3], k, 0.06), 0, (rnd(k) - 0.5) * 0.8, (rnd(k + 2) - 0.5) * 0.7); }
  s.box('metal', 0.9, 0.012, 0.6, -0.05, 1.08, 0.12, 0x7a5a40, 0.2, 0.1, -0.45); // rusted tin sheet leaning on the stack
  for (let k = 0; k < 5; k++) s.rod('metal', 0.01, [-0.85, 0.72 + k * 0.02, 0.32 + k * 0.025], [0.85, 0.7 + k * 0.02, 0.3 + k * 0.03], jit(0x5a4a3a, k, 0.15), 4);
  const rimG = new THREE.TorusGeometry(0.3, 0.012, 4, 20); planarUV(rimG, 'z', 1); s.lib('metal', rimG, 0.8, 1.05, 0.0, 0x8a8478, Math.PI / 2, 0, 0.25);
  const buck = new THREE.CylinderGeometry(0.15, 0.12, 0.26, 12, 1, true); planarUV(buck, 'z', 1); s.lib('metal', buck, -0.1, 0.85, 0.3, 0x9a9a92, 0, 0.9);
  // spring balance hanging from a pole lashed to the rail
  s.rod('wood', 0.02, [0.92, 0.6, 0.48], [0.92, 1.9, 0.48], 0xa08858, 6);
  s.rod('wood', 0.015, [0.92, 1.85, 0.48], [1.2, 1.85, 0.48], 0xa08858, 5);
  s.box('metal', 0.04, 0.16, 0.03, 1.18, 1.7, 0.48, 0xb8b4a8); s.rod('metal', 0.003, [1.18, 1.62, 0.48], [1.18, 1.48, 0.48], 0x5a5852, 3);
  // spilled on the ground: a bundle, a few bottles, a second sack
  s.goods(atlasBox(0.32, 0.15, 0.42, UV.pedge, UV.pedge, UV.news), 0.95, 0.075, 0.75, 0xe8e0d0, 0.6);
  for (let k = 0; k < 3; k++) { const b = new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8); s.goods(remapUV(b, UV.bottle), -0.3 + k * 0.3, 0.035, 0.75 + rnd(k + seed) * 0.3, 0xffffff, rnd(k) * 3, Math.PI / 2); }
  const sack2 = new THREE.SphereGeometry(0.22, 10, 7); { const p = sack2.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Math.max(p.getY(i), -0.12)); sack2.computeVertexNormals(); }
  planarUV(sack2, 'z', TILE.jute); s.lib('jute', sack2, -1.0, 0.12, -0.75, 0xa89070);
  person(s.site, -1.65, 0.1, 1.68, Math.PI / 2, 0x7a6a5a);
}

const BANGLE_COLS = [0xb02828, 0x2a7a3a, 0xc89a30, 0x2a4a9a, 0xc84a8a, 0x6a1a2a, 0xe07a2a, 0x7a3a9a, 0x2a8a8a, 0xd8c8a0];
function bangle(s, lx, ly, lz, tint, yaw = 0, roll = 0, pitch = Math.PI / 2) {
  const g = new THREE.TorusGeometry(0.034, 0.0045, 3, 12); remapUV(g, UV.glass);
  s.goods(g, lx, ly, lz, tint, yaw, roll, pitch);
}
function buildBangle(s, seed) {
  // low wooden stand with a tray of upright dowels, each stacked with one colour run
  s.box('jute', 1.7, 0.012, 1.2, 0, 0.006, 0.1, jit(0xa8484a, seed, 0.08));
  for (const sx of [-0.45, 0.45]) for (const sz of [0.25, 0.75]) s.box('wood', 0.05, 0.5, 0.05, sx, 0.25, sz, 0x6a4a30);
  s.planks(1.0, 0.6, 3, 0.52, 0.5, 0x7a5a3a, seed);
  for (let k = 0; k < 8; k++) {
    const x = -0.4 + (k % 4) * 0.27, z = 0.35 + Math.floor(k / 4) * 0.3, n = 14 + Math.floor(rnd(seed + k) * 9);
    s.rod('wood', 0.008, [x, 0.53, z], [x, 0.53 + 0.36, z], 0x9a7a50, 5);
    const col = BANGLE_COLS[(k + seed) % BANGLE_COLS.length];
    for (let i = 0; i < n; i++) bangle(s, x + (rnd(i + k * 30) - 0.5) * 0.008, 0.55 + i * 0.0095, z, jit(i % 5 === 4 ? 0xc89a30 : col, i + k * 30, 0.12), rnd(i) * 3, (rnd(i + 7) - 0.5) * 0.12);
  }
  // A-frame rack behind with three bars of hanging sets
  for (const sx of [-0.7, 0.7]) { s.rod('wood', 0.022, [sx, 0, -0.55], [sx, 1.55, -0.3], 0x8a6a48, 6); s.rod('wood', 0.022, [sx, 0, -0.05], [sx, 1.55, -0.3], 0x8a6a48, 6); }
  for (let r = 0; r < 3; r++) {
    const y = 0.75 + r * 0.32, z = -0.3 + (2 - r) * 0.06 - 0.02;
    s.rod('wood', 0.012, [-0.75, y, z], [0.75, y, z], 0xa08060, 6);
    for (let g = 0; g < 5; g++) {
      const col = BANGLE_COLS[(r * 5 + g + seed * 3) % BANGLE_COLS.length], x = -0.56 + g * 0.28;
      for (let i = 0; i < 9; i++) bangle(s, x + (i - 4) * 0.011, y - 0.035, z + 0.012, jit(col, i + g * 9 + r * 50, 0.12), Math.PI / 2, 0, (rnd(i + g) - 0.5) * 0.2);
    }
  }
  // tin trunk, a small hand mirror, stool, a faded tarp on four bamboo poles
  s.box('metal', 0.6, 0.3, 0.38, -0.55, 0.15, -0.85, 0x3a5a7a);
  s.box('metal', 0.62, 0.03, 0.4, -0.55, 0.31, -0.85, 0x4a6a8a);
  s.box('wood', 0.16, 0.22, 0.02, 0.3, 0.64, 0.72, 0x6a4a30, 0, 0, -0.3);
  s.box('metal', 0.13, 0.18, 0.005, 0.3, 0.645, 0.735, 0xd8dcd8, 0, 0, -0.3);
  s.box('wood', 0.32, 0.3, 0.32, 0.55, 0.15, -0.35, 0x6a4a32);
  for (const sx of [-0.95, 0.95]) for (const sz of [-1.0, 0.95]) s.rod('wood', 0.025, [sx, 0, sz], [sx + (rnd(sx * 3 + sz) - 0.5) * 0.06, sz < 0 ? 2.25 : 2.0, sz], 0xc0a870, 6);
  s.box('tarpaulin', 2.1, 0.012, 2.15, 0, 2.12, -0.02, jit(0xb88a3a, seed, 0.06), 0, 0, -Math.atan2(0.25, 1.95));
  person(s.site, 0.55, -0.35, 1.58, 0, 0x8a5a7a, 1);
  person(s.site, -0.1, 1.05, 1.56, Math.PI, 0xa04a5a);
  person(s.site, 0.32, 1.15, 1.05, Math.PI - 0.4, 0x6a8a5a);
}

// ---------------------------------------------------------------------------------------------------------------
const FOOT = { icecream: [3.0, 1.3, -0.2], golgappa: [2.5, 1.2, 0], bangle: [2.0, 2.1, -0.02], tailor: [3.2, 2.7, -0.1], mochi: [1.5, 1.0, 0.3], kabadi: [2.8, 1.2, 0] };

export function createVendors(scene) {
  const group = new THREE.Group(); group.name = 'vendors';
  const c = ANCHORS.chowk; if (!c) return { group };
  const batch = new Batch();
  const colliders = [];
  people.length = 0;
  let signGeo = null;
  VENDORS.forEach((v, i) => {
    const seed = 23 + i * 17;
    const site = { x: c.x + v.dx, z: c.z + v.dz, ry: v.ry + (v.kind === 'tailor' ? 0 : (rnd(seed) - 0.5) * 0.12) };
    const s = new Site(site, batch);
    ({ icecream: buildIceCream, golgappa: buildGolgappa, tailor: buildTailor, mochi: buildMochi, kabadi: buildKabadi, bangle: buildBangle })[v.kind](s, seed);
    const [fw, fd, fz] = FOOT[v.kind];
    const world = new THREE.Matrix4().makeRotationY(site.ry).setPosition(site.x, 0, site.z).multiply(new THREE.Matrix4().makeTranslation(0, 0, fz));
    colliders.push(colliderBoxFromTransform(fw, fd, world));
    if (v.kind === 'tailor') {
      signGeo = new THREE.BoxGeometry(1.5, 1.5 / 4.41, 0.03);
      signGeo.translate(0, 2.775, -0.4 + 1.0 + 0.025); // on the fascia between the chajja and the roof slab signGeo.rotateY(site.ry); signGeo.translate(site.x, 0, site.z);
    }
  });
  const meshes = batch.flush(group);
  (meshes.wood || Object.values(meshes)[0]).userData.colliderBoxes = colliders;

  // the tailor's board: Hindi bold line 1, English line 2, same dark paint (createWideSignAtlas / signPaint.js)
  if (signGeo) {
    const atlas = createWideSignAtlas([SIGN], { cellW: 512, cellH: 116 });
    mapFrontFaceToRow(signGeo, 0, atlas.rows);
    const sm = new THREE.Mesh(signGeo, Object.assign(new THREE.MeshStandardMaterial({ map: atlas.texture, roughness: 0.85 }), { name: 'vendor_sign' }));
    sm.name = 'vendors_sign'; sm.castShadow = true; group.add(sm);
  }

  // people: capsule placeholders (characters are parked), one InstancedMesh
  const pm = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.3, 1.1, 4, 8), new THREE.MeshStandardMaterial({ roughness: 0.85 }), people.length);
  pm.name = 'vendors_people'; pm.castShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  people.forEach((pp, i) => {
    const k = pp.h / 1.7, sy = pp.sit === 1 ? k * 0.62 : pp.sit === 2 ? k * 0.45 : k;
    const sn = Math.sin(pp.site.ry), cs = Math.cos(pp.site.ry);
    const baseY = pp.sit === 1 ? 0.42 : pp.sit === 2 ? 0.0 : 0.18;
    p.set(pp.site.x + pp.lx * cs + pp.lz * sn, baseY + 0.85 * sy, pp.site.z - pp.lx * sn + pp.lz * cs);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pp.site.ry + pp.yaw); sc.set(k * (pp.sit === 2 ? 1.25 : 1), sy, k * (pp.sit === 2 ? 1.25 : 1));
    pm.setMatrixAt(i, m.compose(p, q, sc)); pm.setColorAt(i, col.setHex(pp.tint));
  });
  group.add(pm);

  scene.add(group);
  const per = {};
  group.traverse((o) => { if (o.isMesh) per[o.name] = Math.round((o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1)); });
  const tris = Object.values(per).reduce((a, b) => a + b, 0);
  if (typeof window !== 'undefined') window.__vendors = { vendors: VENDORS.map((v) => ({ kind: v.kind, x: +(c.x + v.dx).toFixed(2), z: +(c.z + v.dz).toFixed(2), ry: v.ry })), tris, per, drawCalls: group.children.length };
  return { group };
}
