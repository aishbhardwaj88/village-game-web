import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHORS } from './anchors.js';
import { getTiledMaterial, texturedBox, texturedWallBox } from './materials.js';
import { PALETTE, WALL_TINT_STRENGTH } from './village.js';
import { colliderBoxFromTransform } from './collision.js';
import { createWideSignAtlas, mapFrontFaceToRow } from './signboards.js';
import { HI_FAMILY } from './signPaint.js';

/**
 * Three small shops (docs/PARALLEL.md section E, her 6 Nov brief: "bookstall, CD shop, mithai shop"), along the main road
 * and the cross road just west of the chowk:
 *   bookstall  - a plank counter on brick piers against a short limewashed wall, tarp on bamboo poles, newspapers,
 *                magazines pegged on a string, school notebooks on the shelf below
 *   CD shop    - a one-room plaster shop with racks of unbranded cassette and CD cases, a two-in-one and a speaker
 *   mithai     - a glass case of steel trays (laddoo, barfi, kaju katli, jalebi, peda, gulab jamun), a taraju,
 *                and a big kadhai on a brick chulha out front
 * Positions were scouted with every zone forced and the full collider list (tmp/smallshops/scout.mjs): footprint + 0.8 m
 * clear of every collider, 1.4 m forecourt from the road edge, facing the road. They are stored as offsets from the
 * chowk anchor so they ride with the square if it moves.
 *
 * Materials: the frozen library sets only (plaster, brick, concrete, wood, metal, tin, tarpaulin), at arch.py's tiling
 * (brick 1.2, tin 0.8, plaster 0.5, wood 1.0, metal 1.0 m per tile). Printed goods (paper, covers, cassette spines,
 * sweets) come from ONE procedural canvas atlas. Corrugation, planks, cases and sweets are modelled pieces, not paint.
 * Cost: everything merged per material across all three shops: 7 library meshes + 1 goods atlas + 1 glass + 1 sign
 * + 1 capsule InstancedMesh = 11 draw calls. Shopkeepers are capsule placeholders (characters are parked).
 */

// ---- where (offsets from the chowk anchor, world axes) ----
const SHOPS = [
  { kind: 'mithai', dx: -0.79, dz: 10.63, ry: 1.401 }, // west side of the main road, north of the square
  { kind: 'cd', dx: -9.75, dz: -2.67, ry: 3.044 }, // north side of the cross road, just west of the square
  { kind: 'book', dx: -14.22, dz: -2.88, ry: 3.044 }, // its neighbour, 4.5 m further west
];
const SIGNS = {
  book: { hi: 'अख़बार और किताबें', en: 'Newspapers and Books', bg: '#e9dcc0', fg: '#1f2a4a', border: '#2a3a66' },
  cd: { hi: 'सीडी और कैसेट', en: 'CD and Cassette Shop', bg: '#e8e0cc', fg: '#5a1a18', border: '#6e2420' },
  mithai: { hi: 'मिठाई की दुकान', en: 'Sweet Shop', bg: '#f0dfb8', fg: '#6e1a12', border: '#8a2a18' },
};
const TILE = { brick: 1.2, tin: 0.8, plaster: 0.5, wood: 1.0, metal: 1.0, concrete: 1.0, tarpaulin: 1.0, jute: 0.5 };
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const jit = (c, i, amt = 0.08) => { const k = 1 + (rnd(i) - 0.5) * 2 * amt; const col = new THREE.Color(c); return col.multiplyScalar(k).getHex(); };

// ---------------------------------------------------------------------------------------------------------------
// Goods atlas (procedural, 1024 x 1024): paper, covers, spines, sweets. Painted once, repainted when the font lands.
const AW = 1024, AH = 1024;
const R = (x, y, w, h) => [x / AW, 1 - (y + h) / AH, (x + w) / AW, 1 - y / AH];
const UV = {
  news: R(0, 0, 256, 320), edge: R(256, 0, 64, 64), plastic: R(256, 64, 64, 64), board: R(256, 128, 64, 64),
  mag: [0, 1, 2, 3].map((i) => R(320 + i * 128, 0, 128, 176)),
  nb: [R(832, 0, 96, 128), R(928, 0, 96, 128), R(832, 128, 96, 128), R(928, 128, 96, 128)],
  cass: R(0, 320, 1024, 96), cdsp: R(0, 416, 1024, 64), cdgrid: R(0, 480, 512, 256),
  poster: [R(512, 480, 160, 224), R(672, 480, 160, 224)], speaker: R(832, 480, 128, 128), deck: R(832, 608, 192, 96),
  sweet: { laddoo: R(0, 736, 128, 128), barfi: R(128, 736, 128, 128), kaju: R(256, 736, 128, 128), jalebi: R(384, 736, 128, 128), jamun: R(512, 736, 128, 128), peda: R(640, 736, 128, 128), oil: R(768, 736, 128, 128), syrup: R(896, 736, 128, 128) },
  box: R(0, 864, 256, 160), cal: R(256, 864, 128, 160),
};
const sub = (r, a, b) => [r[0] + (r[2] - r[0]) * a, r[1], r[0] + (r[2] - r[0]) * b, r[3]]; // horizontal slice of a strip

function grain(g, x, y, w, h, amt, seed = 1) {
  const img = g.getImageData(x, y, w, h), d = img.data;
  let s = seed * 9301 + 49297;
  for (let i = 0; i < d.length; i += 4) { s = (s * 9301 + 49297) % 233280; const n = (s / 233280 - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, x, y);
}
function textLines(g, x, y, w, h, step, col) {
  g.fillStyle = col;
  for (let yy = y; yy < y + h; yy += step) { let xx = x; while (xx < x + w - 6) { const L = 6 + Math.random() * 26; g.fillRect(xx, yy, Math.min(L, x + w - xx), Math.max(1, step * 0.45)); xx += L + 3; } }
}
function paintAtlas(g) {
  g.fillStyle = '#7a7268'; g.fillRect(0, 0, AW, AH);
  // newspaper front page: masthead, headline, photo, columns (paper never pure white)
  g.fillStyle = '#e4dfd2'; g.fillRect(0, 0, 256, 320);
  g.fillStyle = '#2a2826'; g.font = `700 40px ${HI_FAMILY}`; g.textAlign = 'center'; g.fillText('समाचार', 128, 46);
  g.fillRect(10, 56, 236, 3);
  g.font = `700 22px ${HI_FAMILY}`; g.fillText('गाँव में नई सड़क', 128, 86);
  g.fillStyle = '#8a8478'; g.fillRect(12, 98, 110, 78); g.fillStyle = '#6a665c'; g.fillRect(24, 120, 40, 56); g.fillRect(70, 110, 38, 66);
  textLines(g, 132, 100, 112, 76, 6, '#5a5650'); textLines(g, 12, 186, 112, 126, 6, '#5a5650'); textLines(g, 132, 186, 112, 126, 6, '#5a5650');
  grain(g, 0, 0, 256, 320, 18, 2);
  // paper edge (stacked sheets), case plastic, board grey
  for (let y = 0; y < 64; y += 2) { g.fillStyle = y % 4 ? '#d8d2c4' : '#bdb6a6'; g.fillRect(256, y, 64, 2); }
  g.fillStyle = '#3a3a3c'; g.fillRect(256, 64, 64, 64); grain(g, 256, 64, 64, 64, 22, 3);
  g.fillStyle = '#b8b0a0'; g.fillRect(256, 128, 64, 64); grain(g, 256, 128, 64, 64, 26, 4);
  // magazine covers: coloured ground, Devanagari title, a photo block (no real titles, no brands)
  const mags = [['#b8483a', 'कहानियाँ'], ['#3a6a8a', 'खेती'], ['#d8a83a', 'बाल कथा'], ['#5a7a4a', 'सिनेमा']];
  mags.forEach(([c, t], i) => {
    const x = 320 + i * 128;
    g.fillStyle = c; g.fillRect(x, 0, 128, 176);
    g.fillStyle = '#efe6d0'; g.font = `700 24px ${HI_FAMILY}`; g.textAlign = 'center'; g.fillText(t, x + 64, 30);
    g.fillStyle = ['#d8b890', '#8ab070', '#e87a5a', '#c89878'][i]; g.fillRect(x + 14, 44, 100, 100);
    g.fillStyle = 'rgba(40,30,20,0.55)'; g.beginPath(); g.ellipse(x + 64, 108, 26, 34, 0, 0, 7); g.fill();
    textLines(g, x + 12, 152, 104, 18, 6, '#efe6d0');
    grain(g, x, 0, 128, 176, 16, 5 + i);
  });
  // school notebooks: plain covers with a white label box and ruled lines
  ['#2f5a8a', '#8a3a3a', '#3a7a5a', '#b88a3a'].forEach((c, i) => {
    const [x, y] = [[832, 0], [928, 0], [832, 128], [928, 128]][i];
    g.fillStyle = c; g.fillRect(x, y, 96, 128);
    g.fillStyle = '#e6e0d0'; g.fillRect(x + 14, y + 52, 68, 40);
    g.fillStyle = '#5a5a5a'; for (let k = 0; k < 3; k++) g.fillRect(x + 18, y + 62 + k * 10, 60, 1);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y, 8, 128);
    grain(g, x, y, 96, 128, 14, 9 + i);
  });
  // cassette spines: unbranded inlays in many colours, tiny text bars
  let x = 0;
  for (let i = 0; x < 1024; i++) {
    const w = 14 + (i % 3) * 2;
    g.fillStyle = `hsl(${(i * 47) % 360}, ${28 + (i % 4) * 9}%, ${34 + (i % 5) * 8}%)`; g.fillRect(x, 320, w, 96);
    g.fillStyle = 'rgba(240,230,210,0.7)'; g.fillRect(x + 4, 330, w - 8, 30 + (i % 4) * 10);
    g.fillStyle = 'rgba(20,20,20,0.5)'; g.fillRect(x, 320, 1, 96);
    x += w;
  }
  // CD spines (thin, glossy dark with a stripe)
  x = 0;
  for (let i = 0; x < 1024; i++) {
    const w = 8 + (i % 2) * 2;
    g.fillStyle = i % 3 ? '#2c2c30' : `hsl(${(i * 61) % 360}, 30%, 45%)`; g.fillRect(x, 416, w, 64);
    g.fillStyle = `hsl(${(i * 83) % 360}, 35%, 60%)`; g.fillRect(x + 2, 430, w - 4, 20);
    x += w;
  }
  // CD covers grid 4 x 2: abstract art, no names
  for (let i = 0; i < 8; i++) {
    const cx = (i % 4) * 128, cy = 480 + Math.floor(i / 4) * 128;
    const hue = (i * 53 + 20) % 360;
    const gr = g.createLinearGradient(cx, cy, cx + 128, cy + 128); gr.addColorStop(0, `hsl(${hue},40%,35%)`); gr.addColorStop(1, `hsl(${(hue + 60) % 360},45%,60%)`);
    g.fillStyle = gr; g.fillRect(cx + 4, cy + 4, 120, 120);
    g.fillStyle = 'rgba(30,20,20,0.5)'; g.beginPath(); g.ellipse(cx + 64 + (i % 3 - 1) * 20, cy + 76, 22, 32, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(240,230,210,0.8)'; g.fillRect(cx + 14, cy + 14, 60 + (i % 3) * 12, 9);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 4; g.strokeRect(cx + 2, cy + 2, 124, 124);
  }
  grain(g, 0, 480, 512, 256, 14, 21);
  // film-style posters, no text
  [['#3a2a4a', '#d87a3a'], ['#1a3a3a', '#e0c060']].forEach(([a, b], i) => {
    const px = 512 + i * 160;
    const gr = g.createLinearGradient(px, 480, px, 704); gr.addColorStop(0, a); gr.addColorStop(1, b);
    g.fillStyle = gr; g.fillRect(px, 480, 160, 224);
    g.fillStyle = 'rgba(20,15,10,0.6)'; g.beginPath(); g.ellipse(px + 55, 620, 30, 70, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(px + 108, 630, 26, 62, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(245,235,210,0.85)'; g.fillRect(px + 20, 500, 120, 14); g.fillRect(px + 40, 520, 80, 8);
    grain(g, px, 480, 160, 224, 20, 30 + i);
  });
  // speaker front: dark cone behind a mesh grille
  g.fillStyle = '#2a2622'; g.fillRect(832, 480, 128, 128);
  g.fillStyle = '#1a1816'; g.beginPath(); g.arc(896, 552, 46, 0, 7); g.fill();
  g.fillStyle = '#3a3632'; g.beginPath(); g.arc(896, 552, 16, 0, 7); g.fill();
  g.fillStyle = '#4a4640'; g.beginPath(); g.arc(896, 504, 12, 0, 7); g.fill();
  g.fillStyle = 'rgba(120,115,105,0.35)'; for (let yy = 482; yy < 606; yy += 4) for (let xx = 834; xx < 958; xx += 4) g.fillRect(xx, yy, 2, 2);
  // two-in-one front: two grilles and a cassette door
  g.fillStyle = '#4a4a4e'; g.fillRect(832, 608, 192, 96);
  for (const cx of [868, 988]) { g.fillStyle = '#222'; g.beginPath(); g.arc(cx, 656, 30, 0, 7); g.fill(); g.fillStyle = 'rgba(140,140,140,0.3)'; for (let a = 0; a < 6.28; a += 0.3) for (let rr = 6; rr < 30; rr += 5) g.fillRect(cx + Math.cos(a) * rr, 656 + Math.sin(a) * rr, 2, 2); }
  g.fillStyle = '#2c2c30'; g.fillRect(904, 626, 48, 40); g.fillStyle = '#6a6a70'; g.fillRect(910, 640, 36, 14);
  g.fillStyle = '#8a8a8e'; for (let k = 0; k < 5; k++) g.fillRect(906 + k * 9, 676, 6, 8);
  // sweets
  const blob = (x0, y0, base, dots, n, r) => { g.fillStyle = base; g.fillRect(x0, y0, 128, 128); for (let i = 0; i < n; i++) { g.fillStyle = dots[i % dots.length]; g.beginPath(); g.arc(x0 + Math.random() * 128, y0 + Math.random() * 128, r * (0.5 + Math.random()), 0, 7); g.fill(); } };
  blob(0, 736, '#d8882a', ['#e8a040', '#c0701e', '#f0b858'], 700, 3); // boondi laddoo
  blob(128, 736, '#e6dcc4', ['#d8cdb2', '#f0e8d8', '#9ab070'], 160, 3); // barfi with pista
  g.fillStyle = 'rgba(200,200,205,0.55)'; g.fillRect(150, 760, 80, 70); // silver varak
  blob(256, 736, '#e8d8b8', ['#dccaa6', '#f0e4cc'], 120, 4); // kaju katli
  g.fillStyle = 'rgba(205,205,210,0.5)'; g.fillRect(256, 736, 128, 128);
  blob(384, 736, '#d8761e', ['#e88e2a', '#b85a14', '#f0a040'], 260, 4); // jalebi
  blob(512, 736, '#4a2414', ['#5a2e18', '#3a1a0e', '#7a4a2a'], 200, 5); // gulab jamun
  blob(640, 736, '#c8a070', ['#b88e5c', '#d8b484', '#a07a4a'], 220, 4); // peda
  blob(768, 736, '#8a6a20', ['#a07a28', '#6a5018', '#c8a040'], 120, 6); // hot oil
  blob(896, 736, '#a8641e', ['#b8742a', '#8a4e16', '#c88a3a'], 90, 7); // syrup
  grain(g, 0, 736, 1024, 128, 16, 40);
  // mithai box lid: maroon and gold pattern, no name
  g.fillStyle = '#8a2a2a'; g.fillRect(0, 864, 256, 160);
  g.strokeStyle = '#d8b050'; g.lineWidth = 4; g.strokeRect(10, 874, 236, 140);
  for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(30 + (i % 6) * 40, 910 + Math.floor(i / 6) * 70, 10, 0, 7); g.stroke(); }
  // wall calendar: landscape picture + month grid
  g.fillStyle = '#e6e0d2'; g.fillRect(256, 864, 128, 160);
  g.fillStyle = '#6a9ab8'; g.fillRect(264, 872, 112, 50); g.fillStyle = '#7aa05a'; g.fillRect(264, 906, 112, 16);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { g.fillStyle = c === 0 ? '#a83a2a' : '#4a4a4a'; g.fillRect(266 + c * 15, 934 + r * 16, 9, 7); }
  grain(g, 256, 864, 128, 160, 14, 50);
}
let goodsTex = null;
function getGoodsTex() {
  if (goodsTex) return goodsTex;
  const c = document.createElement('canvas'); c.width = AW; c.height = AH;
  const g = c.getContext('2d');
  paintAtlas(g);
  goodsTex = new THREE.CanvasTexture(c);
  goodsTex.colorSpace = THREE.SRGBColorSpace; goodsTex.anisotropy = 8;
  Promise.all([document.fonts.load(`700 40px ${HI_FAMILY}`), document.fonts.ready]).then(() => { paintAtlas(g); goodsTex.needsUpdate = true; }, () => {});
  return goodsTex;
}
let goodsMat = null;
const getGoodsMat = () => goodsMat || (goodsMat = Object.assign(new THREE.MeshStandardMaterial({ map: getGoodsTex(), roughness: 0.82, metalness: 0, vertexColors: true }), { name: 'small_shop_goods' }));
let glassMat = null;
const getGlassMat = () => glassMat || (glassMat = Object.assign(new THREE.MeshStandardMaterial({ color: 0xd8e4e0, transparent: true, opacity: 0.2, roughness: 0.06, metalness: 0.1, depthWrite: false }), { name: 'small_shop_glass' }));

// ---------------------------------------------------------------------------------------------------------------
// geometry helpers: every piece is placed in the shop's local frame (x across the front, +z toward the road)
function tintGeo(geo, tint) {
  const n = geo.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color(tint);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
function remapUV(geo, r) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1])); return geo; }
/** BoxGeometry whose +Z face shows `front`, +Y face `top` (default front), the rest `side`. */
function atlasBoxGeo(w, h, d, front, side = UV.edge, top = null) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const r = f === 4 ? front : f === 2 ? (top || front) : side;
    for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1])); }
  }
  return geo;
}
/** metre UVs for a non-box geometry, projected on the plane whose normal is `axis`. */
function planarUV(geo, axis, tile) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (axis === 'y') uv.setXY(i, x / tile, z / tile); else if (axis === 'z') uv.setXY(i, x / tile, y / tile); else uv.setXY(i, z / tile, y / tile);
  }
  return geo;
}

class Shop {
  constructor(site, batch) { this.site = site; this.b = batch; }
  place(geo, lx, ly, lz, yaw = 0, roll = 0, pitch = 0) {
    if (pitch) geo.rotateX(pitch);
    if (roll) geo.rotateZ(roll);
    if (yaw) geo.rotateY(yaw);
    geo.translate(lx, ly, lz); geo.rotateY(this.site.ry); geo.translate(this.site.x, 0, this.site.z);
    return geo;
  }
  /** library-textured box at arch.py tiling */
  box(set, w, h, d, lx, ly, lz, tint, yaw = 0, roll = 0, pitch = 0) {
    const geo = texturedBox(w, h, d, set, { tileSize: TILE[set], tint }).geometry;
    this.b.add(set, this.place(geo, lx, ly, lz, yaw, roll, pitch));
  }
  /** weathered wall: jittered tiling, baked dirt / bleach / rain streaks */
  wall(w, h, d, lx, lz, tint, seed) {
    const geo = texturedWallBox(w, h, d, 'plaster', { tileSize: TILE.plaster, tint, tintStrength: WALL_TINT_STRENGTH * 1.6, seed }).geometry;
    geo.translate(0, h / 2, 0);
    this.b.add('plaster', this.place(geo, lx, 0, lz));
  }
  /** any geometry in a library set (uv already in metres), tinted */
  lib(set, geo, lx, ly, lz, tint, yaw = 0, roll = 0, pitch = 0) { this.b.add(set, this.place(tintGeo(geo.index ? geo.toNonIndexed() : geo, tint), lx, ly, lz, yaw, roll, pitch)); }
  goods(geo, lx, ly, lz, tint = 0xffffff, yaw = 0, roll = 0, pitch = 0) { this.b.add('goods', this.place(tintGeo(geo.index ? geo.toNonIndexed() : geo, tint), lx, ly, lz, yaw, roll, pitch)); }
  glass(w, h, d, lx, ly, lz) { const g = new THREE.BoxGeometry(w, h, d); this.b.add('glass', this.place(tintGeo(g.toNonIndexed(), 0xffffff), lx, ly, lz)); }
  /** corrugated tin sheet, w across, d down-slope, sloping down toward +z by `drop` metres; modelled ribs (76 mm pitch) */
  tin(w, d, lx, ly, lz, drop, tint, sag = 0) {
    const seg = Math.round(w / 0.019);
    const geo = new THREE.PlaneGeometry(w, d, seg, 2);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sin((x / 0.076) * Math.PI * 2) * 0.012 - sag * (1 - (2 * x / w) ** 2) * (0.5 + z / d)); }
    geo.computeVertexNormals();
    planarUV(geo, 'y', TILE.tin);
    // a thin underside so it is not see-through from below
    const under = geo.clone(); const ip = under.index.array; for (let i = 0; i < ip.length; i += 3) { const t = ip[i]; ip[i] = ip[i + 2]; ip[i + 2] = t; }
    under.translate(0, -0.004, 0); under.computeVertexNormals();
    const pitch = Math.atan2(drop, d);
    for (const g of [geo, under]) this.lib('tin', g, lx, ly, lz, tint, 0, 0, pitch);
  }
}

class Batch {
  constructor() { this.by = new Map(); }
  add(key, geo) { if (!this.by.has(key)) this.by.set(key, []); this.by.get(key).push(geo); }
  flush(group) {
    const out = {};
    for (const [key, list] of this.by) {
      const norm = list.map((g) => { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) x.deleteAttribute(k); return x; });
      const mat = key === 'goods' ? getGoodsMat() : key === 'glass' ? getGlassMat() : getTiledMaterial(key, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
      const m = new THREE.Mesh(mergeGeometries(norm), mat);
      m.name = `small_shops_${key}`; m.castShadow = key !== 'glass'; m.receiveShadow = true;
      if (key === 'glass') m.renderOrder = 3;
      group.add(m); out[key] = m;
    }
    return out;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// shared shell for the two masonry shops: plinth, back + side walls, fascia above the opening, roof slab, rolled shutter
function shell(s, W, D, H, wallTint, seed, shutterTint) {
  const T = 0.22, OPEN_H = 2.45;
  s.box('concrete', W + 0.1, 0.18, D + 0.05, 0, 0.09, 0, 0xb8b0a2); // raised floor
  s.box('concrete', W + 0.1, 0.12, 0.38, 0, 0.06, D / 2 + 0.2, jit(0xa8a090, seed)); // front step
  s.wall(W, H, T, 0, -D / 2 + T / 2, wallTint, seed);
  s.wall(T, H, D, -W / 2 + T / 2, 0, wallTint, seed + 1);
  s.wall(T, H, D, W / 2 - T / 2, 0, wallTint, seed + 2);
  s.wall(W, H - OPEN_H, T, 0, D / 2 - T / 2, wallTint, seed + 3);
  { const g = s.b.by.get('plaster').pop(); g.translate(0, OPEN_H, 0); s.b.add('plaster', g); } // the fascia sits on the opening's lintel line
  s.box('plaster', W + 0.04, 0.32, T + 0.04, 0, 0.16 + 0.18, D / 2 - T / 2, jit(0xb89868, seed + 5)); // ochre dado band on the front piers
  s.box('concrete', W + 0.35, 0.13, D + 0.35, 0, H + 0.065, 0.08, 0xc0b8aa); // roof slab with drip edge
  s.box('brick', W + 0.2, 0.32, 0.12, 0, H + 0.29, D / 2 + 0.18, 0xd0a890); // parapet front, bare brick
  // rolled-up shutter: a drum of laths in a housing, two guide channels
  const drum = new THREE.CylinderGeometry(0.15, 0.15, W - 0.5, 14, 1); drum.rotateZ(Math.PI / 2); planarUV(drum, 'z', TILE.metal);
  s.lib('metal', drum, 0, OPEN_H - 0.18, D / 2 + 0.06, shutterTint);
  for (const sx of [-1, 1]) s.box('metal', 0.06, OPEN_H - 0.2, 0.08, sx * (W / 2 - 0.25), (OPEN_H - 0.2) / 2 + 0.18, D / 2 + 0.03, 0x6a6a66);
  return { T, OPEN_H };
}
function awningBrackets(s, W, D, y0, out) {
  for (const sx of [-1, 1]) {
    s.box('metal', 0.04, 0.04, out, sx * (W / 2 - 0.15), y0 - 0.02, D / 2 + out / 2, 0x5a5a56, 0, 0, Math.atan2(0.25, out));
    s.box('metal', 0.03, 0.03, out * 0.9, sx * (W / 2 - 0.15), y0 - 0.35, D / 2 + out * 0.42, 0x5a5a56, 0, 0, -0.5);
  }
}

// ---------------------------------------------------------------------------------------------------------------
function buildBook(s, seed, signs, people) {
  const W = 2.6, wallH = 2.6;
  s.box('concrete', W + 0.3, 0.12, 2.0, 0, 0.06, 0.1, 0xb4ac9c); // plinth slab
  s.wall(W + 0.2, wallH, 0.24, 0, -0.75, PALETTE.cream, seed); // the house wall it leans on
  s.wall(0.24, wallH * 0.85, 1.3, -W / 2 - 0.02, -0.2, PALETTE.cream, seed + 1); // short return
  s.box('brick', W + 0.3, 0.12, 0.3, 0, wallH + 0.06, -0.75, 0xc89a80); // brick coping
  // counter: two brick piers, a thick plank top made of three boards
  for (const sx of [-0.95, 0.95]) s.box('brick', 0.24, 0.72, 0.46, sx, 0.48, 0.3, jit(0xd0a088, seed + sx * 3));
  for (let k = 0; k < 3; k++) s.box('wood', 2.4, 0.045, 0.2, (rnd(seed + k) - 0.5) * 0.04, 0.865, 0.1 + k * 0.205, jit(0x9a7a58, seed + k, 0.12), (rnd(k + 4) - 0.5) * 0.01);
  s.box('wood', 2.2, 0.035, 0.48, 0, 0.32, 0.3, 0x8a6c4c); // lower shelf
  // bamboo poles, front batten, tarp sloping back to the wall
  const pole = (lx, lz, h) => { const g = new THREE.CylinderGeometry(0.035, 0.042, h, 7); planarUV(g, 'x', TILE.wood); s.lib('wood', g, lx, h / 2 + 0.12, lz, 0xc8b078, 0, (rnd(lx + seed) - 0.5) * 0.03); };
  pole(-1.3, 0.95, 2.28); pole(1.3, 0.95, 2.3);
  s.box('wood', 2.75, 0.06, 0.06, 0, 2.36, 0.95, 0xb09868);
  const tarp = new THREE.BoxGeometry(2.95, 0.012, 1.95, 10, 1, 6);
  { const p = tarp.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) - 0.07 * (1 - (2 * x / 2.95) ** 2) * (1 - (2 * z / 1.95) ** 2)); } tarp.computeVertexNormals(); planarUV(tarp, 'y', TILE.tarpaulin); }
  s.lib('tarpaulin', tarp, 0, 2.52, 0.18, 0x6a86a8, 0, 0, Math.atan2(0.26, 1.7));
  // newspapers: folded stacks of different heights, top sheet printed, sheet edges on the sides
  for (let k = 0; k < 6; k++) {
    const h = 0.03 + rnd(seed + k * 7) * 0.07;
    s.goods(atlasBoxGeo(0.36, h, 0.27, UV.edge, UV.edge, UV.news), -1.0 + k * 0.4, 0.89 + h / 2, 0.33 + (rnd(k) - 0.5) * 0.1, jit(0xf2ece0, k), (rnd(k + 2) - 0.5) * 0.18);
  }
  // magazines fanned along the front edge
  for (let k = 0; k < 9; k++) s.goods(atlasBoxGeo(0.2, 0.006, 0.27, UV.edge, UV.edge, UV.mag[k % 4]), -1.05 + k * 0.26, 0.893 + (k % 2) * 0.004, 0.52, 0xffffff, (rnd(k + 9) - 0.5) * 0.3, 0, 0.08);
  // magazines pegged on a string between the poles
  const str = new THREE.CylinderGeometry(0.004, 0.004, 2.6, 4); str.rotateZ(Math.PI / 2); planarUV(str, 'z', 1);
  s.lib('jute', str, 0, 1.82, 0.96, 0xd8ccb0);
  for (let k = 0; k < 8; k++) {
    s.goods(atlasBoxGeo(0.2, 0.27, 0.004, UV.mag[(k + 1) % 4], UV.edge), -1.05 + k * 0.3, 1.68, 0.97, 0xffffff, (rnd(k + 20) - 0.5) * 0.2, (rnd(k + 21) - 0.5) * 0.08);
    s.box('wood', 0.015, 0.06, 0.012, -1.05 + k * 0.3, 1.81, 0.975, 0xc0a880); // wooden peg
  }
  // notebook stacks on the lower shelf and one at the counter end, each book a little askew
  for (let st = 0; st < 5; st++) {
    const n = 4 + Math.floor(rnd(seed + st) * 5), lx = st < 4 ? -0.8 + st * 0.48 : 1.02, ly = st < 4 ? 0.34 : 0.89;
    for (let i = 0; i < n; i++) s.goods(atlasBoxGeo(0.17, 0.018, 0.24, UV.edge, UV.edge, UV.nb[(st + i) % 4]), lx + (rnd(st * 9 + i) - 0.5) * 0.02, ly + 0.009 + i * 0.019, (st < 4 ? 0.3 : 0.15), 0xffffff, (rnd(st * 9 + i + 3) - 0.5) * 0.12);
  }
  // a stone paperweight on the tallest stack and a tin trunk under the shelf
  s.lib('concrete', new THREE.IcosahedronGeometry(0.05, 0), -0.6, 1.0, 0.33, 0x9a948a);
  s.box('metal', 0.7, 0.26, 0.4, 0.5, 0.13 + 0.12, -0.35, 0x4a5a6a);
  // stool and the stall-keeper behind the counter
  s.box('wood', 0.35, 0.42, 0.35, 0.2, 0.33, -0.35, 0x7a5a3a);
  people.push({ site: s.site, lx: 0.2, lz: -0.35, h: 1.2, sit: true, yaw: 0, tint: 0x6a5a8a });
  signs.push({ site: s.site, w: 1.9, lx: 0, ly: 2.12, lz: 1.0, row: 0 });
}

function buildCD(s, seed, signs, people) {
  const W = 3.0, D = 2.6, H = 3.3;
  const { T, OPEN_H } = shell(s, W, D, H, PALETTE.fadedBlue, seed, 0x5a7a72);
  const back = -D / 2 + T;
  // back-wall racks: four shelves of cassettes (spines out) and one of CDs, each run a different slice of the spine strip
  for (let k = 0; k < 5; k++) {
    const y = 0.75 + k * 0.33;
    s.box('wood', W - 0.6, 0.03, 0.2, 0, y, back + 0.1, 0x8a6a48);
    const cd = k === 4, a = rnd(seed + k) * 0.5;
    s.goods(atlasBoxGeo(W - 0.7, cd ? 0.14 : 0.11, 0.07, sub(cd ? UV.cdsp : UV.cass, a, a + 0.45), UV.plastic), (rnd(k) - 0.5) * 0.08, y + 0.015 + (cd ? 0.07 : 0.055), back + 0.08);
  }
  for (const sx of [-1, 1]) s.box('wood', 0.04, 1.8, 0.22, sx * (W / 2 - 0.32), 1.5, back + 0.1, 0x7a5a3a); // rack uprights
  // left wall: CD covers face out on a sloping board; right wall: two posters and a calendar
  s.box('wood', 0.04, 0.95, 1.5, -W / 2 + T + 0.04, 1.55, -0.1, 0x7a5a3a, 0, 0.08);
  s.goods(atlasBoxGeo(1.4, 0.7, 0.01, UV.cdgrid, UV.plastic), -W / 2 + T + 0.08, 1.55, -0.1, 0xffffff, Math.PI / 2, 0, 0);
  s.goods(atlasBoxGeo(0.5, 0.7, 0.005, UV.poster[0], UV.board), W / 2 - T - 0.005, 1.75, -0.45, 0xf4ece0, -Math.PI / 2, 0.03);
  s.goods(atlasBoxGeo(0.5, 0.7, 0.005, UV.poster[1], UV.board), W / 2 - T - 0.005, 1.7, 0.2, 0xece4d4, -Math.PI / 2, -0.02);
  s.goods(atlasBoxGeo(0.32, 0.42, 0.004, UV.cal, UV.board), -0.6, 2.25, back + 0.005, 0xffffff);
  // counter across the front with a glass-topped display of CDs
  s.box('wood', 2.2, 0.82, 0.5, -0.1, 0.18 + 0.41, D / 2 - 0.55, 0x6a5038);
  s.box('wood', 2.28, 0.04, 0.56, -0.1, 1.02, D / 2 - 0.55, 0x5a4230);
  s.goods(atlasBoxGeo(1.9, 0.005, 0.44, UV.cdgrid, UV.plastic, UV.cdgrid), -0.1, 1.045, D / 2 - 0.55, 0xd8d8d8);
  s.glass(2.1, 0.012, 0.48, -0.1, 1.056, D / 2 - 0.55);
  // two-in-one deck and a speaker on the counter, loose cassettes
  s.goods(atlasBoxGeo(0.46, 0.19, 0.16, UV.deck, UV.plastic, UV.plastic), 0.45, 1.157, D / 2 - 0.62, 0xffffff, -0.15);
  s.goods(atlasBoxGeo(0.24, 0.36, 0.2, UV.speaker, UV.plastic), -0.85, 1.24, D / 2 - 0.62, 0xd0c8b8, 0.25);
  for (let k = 0; k < 5; k++) s.goods(atlasBoxGeo(0.11, 0.017, 0.07, sub(UV.cass, rnd(k + seed) * 0.9, rnd(k + seed) * 0.9 + 0.012), UV.plastic, UV.plastic), -0.2 + k * 0.09, 1.07 + (k === 2 ? 0.017 : 0), D / 2 - 0.42, 0xffffff, (rnd(k) - 0.5) * 0.6);
  // a second speaker on a bracket outside, aimed at the road, its wire running down the pier
  s.box('metal', 0.04, 0.04, 0.3, W / 2 - 0.25, 2.05, D / 2 + 0.15, 0x5a5a56);
  s.goods(atlasBoxGeo(0.26, 0.38, 0.22, UV.speaker, UV.plastic), W / 2 - 0.25, 1.82, D / 2 + 0.35, 0xc8c0b0, -0.3, 0, 0.12);
  s.box('metal', 0.012, 1.7, 0.012, W / 2 - 0.12, 1.0 + 0.85 - 0.6, D / 2 + 0.02, 0x2a2a2a);
  // tube light on the back wall, a stool, the shopkeeper
  s.box('metal', 1.2, 0.05, 0.06, 0.3, 2.35, back + 0.04, 0xd8d6cc);
  s.box('wood', 0.34, 0.5, 0.34, -0.3, 0.43, -0.2, 0x7a5a3a);
  people.push({ site: s.site, lx: -0.3, lz: -0.2, h: 1.65, yaw: 0, tint: 0x4a6a6a });
  // tin awning
  awningBrackets(s, W, D, OPEN_H + 0.05, 0.95);
  s.tin(W + 0.2, 1.05, 0, OPEN_H + 0.02 - 0.12, D / 2 + 0.5, 0.25, 0xb8b4a8, 0.02);
  signs.push({ site: s.site, w: 2.5, lx: 0, ly: (OPEN_H + H) / 2 + 0.02, lz: D / 2 + 0.035, row: 1 });
}

function buildMithai(s, seed, signs, people) {
  const W = 3.6, D = 3.0, H = 3.4;
  const { T, OPEN_H } = shell(s, W, D, H, PALETTE.cream, seed, 0x8a3a2a);
  const back = -D / 2 + T;
  // glass case: painted wooden base, glass box with steel corner frames, trays of sweets inside on two steps
  const cz = D / 2 - 0.45, cw = 2.7;
  s.box('wood', cw, 0.78, 0.62, -0.25, 0.18 + 0.39, cz, 0xa86a4a);
  s.box('wood', cw + 0.06, 0.03, 0.66, -0.25, 0.975, cz, 0x7a4a34);
  s.box('wood', cw - 0.1, 0.12, 0.26, -0.25, 1.05, cz - 0.16, 0x8a5a3a); // raised back step for the second row
  s.glass(cw, 0.5, 0.62, -0.25, 1.24, cz);
  for (const ex of [-cw / 2, cw / 2]) for (const ez of [-0.31, 0.31]) s.box('metal', 0.025, 0.5, 0.025, -0.25 + ex, 1.24, cz + ez, 0xb8b8b4);
  for (const ez of [-0.31, 0.31]) s.box('metal', cw, 0.025, 0.025, -0.25, 1.49, cz + ez, 0xb8b8b4);
  const kinds = ['laddoo', 'barfi', 'jalebi', 'kaju', 'peda', 'jamun', 'barfi', 'laddoo', 'jalebi', 'peda'];
  kinds.forEach((kind, i) => {
    const row = i < 5 ? 0 : 1, col = i % 5;
    const tx = -0.25 - 1.08 + col * 0.54, ty = row ? 1.115 : 0.995, tz = cz + (row ? -0.16 : 0.12);
    s.box('metal', 0.48, 0.02, 0.24, tx, ty + 0.01, tz, 0xc8c8c4); // steel thali-tray
    sweets(s, kind, tx, ty + 0.02, tz, seed * 31 + i, row ? 0x9a9a9a : 0xffffff);
  });
  // on top of the case: a taraju (beam scale), stacked sweet boxes, a steel jar
  s.box('metal', 0.03, 0.42, 0.03, 0.75, 1.5 + 0.21, cz, 0x7a7a74);
  s.box('metal', 0.5, 0.02, 0.02, 0.75, 1.92, cz, 0x8a8a84);
  for (const sx of [-1, 1]) {
    const pan = new THREE.CylinderGeometry(0.11, 0.08, 0.03, 12); planarUV(pan, 'y', TILE.metal);
    s.lib('metal', pan, 0.75 + sx * 0.24, 1.66, cz, 0xb0a890);
    for (const a of [0, 2.1, 4.2]) s.box('metal', 0.004, 0.26, 0.004, 0.75 + sx * 0.24 + Math.cos(a) * 0.05, 1.79, cz + Math.sin(a) * 0.05, 0x6a6a64);
  }
  for (let k = 0; k < 5; k++) s.goods(atlasBoxGeo(0.26, 0.07, 0.2, UV.box, UV.box, UV.box), -1.25 + (rnd(k) - 0.5) * 0.04, 1.535 + k * 0.071, cz, jit(0xffffff, k, 0.1), (rnd(k + 5) - 0.5) * 0.15);
  const jar = new THREE.CylinderGeometry(0.11, 0.12, 0.3, 14); planarUV(jar, 'z', TILE.metal);
  s.lib('metal', jar, -0.6, 1.65, cz, 0xc4c4c0);
  // back wall: shelves of steel dabbas and sweet boxes, calendar, tube light
  for (let k = 0; k < 2; k++) {
    s.box('wood', W - 0.6, 0.035, 0.32, 0, 1.3 + k * 0.5, back + 0.16, 0x8a6a48);
    for (let i = 0; i < 6; i++) {
      const r = 0.08 + rnd(seed + i + k * 7) * 0.05, h = 0.14 + rnd(i * 3 + k) * 0.14;
      const dab = new THREE.CylinderGeometry(r, r, h, 12); planarUV(dab, 'z', TILE.metal);
      s.lib('metal', dab, -1.15 + i * 0.46, 1.32 + k * 0.5 + h / 2, back + 0.16, jit(0xc0c0bc, i + k * 6, 0.1));
    }
  }
  for (let k = 0; k < 4; k++) s.goods(atlasBoxGeo(0.3, 0.08, 0.22, UV.box, UV.box, UV.box), 1.1, 0.27 + k * 0.081, back + 0.2, jit(0xffffff, k + 30, 0.1), (rnd(k + 40) - 0.5) * 0.2);
  s.goods(atlasBoxGeo(0.34, 0.44, 0.004, UV.cal, UV.board), 0.9, 2.2, back + 0.005, 0xffffff);
  s.box('metal', 1.2, 0.05, 0.06, -0.4, 2.38, back + 0.04, 0xd8d6cc);
  // the halwai behind the case
  people.push({ site: s.site, lx: -0.5, lz: -0.3, h: 1.62, yaw: 0, tint: 0x8a7a5a });
  // out front, right of the step: brick chulha and the big kadhai, jalebi frying in the oil, a jhara resting on the rim
  const kx = W / 2 + 0.55, kz = D / 2 + 0.3;
  s.box('brick', 0.72, 0.62, 0.72, kx, 0.31, kz, 0xc89a80);
  s.box('concrete', 0.3, 0.26, 0.05, kx, 0.17, kz + 0.37, 0x2a2622); // stoke hole, sooted
  const prof = []; for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; prof.push(new THREE.Vector2(Math.sin(a) * 0.42 + 0.001, -Math.cos(a) * 0.17)); }
  const kad = new THREE.LatheGeometry(prof, 20); planarUV(kad, 'y', TILE.metal);
  s.lib('metal', kad, kx, 0.62 + 0.17, kz, 0x4a4440);
  const kadIn = new THREE.LatheGeometry(prof.map((v) => new THREE.Vector2(v.x * 0.98, v.y + 0.005)).reverse(), 20); planarUV(kadIn, 'y', TILE.metal);
  s.lib('metal', kadIn, kx, 0.62 + 0.17, kz, 0x3a3430);
  for (const sx of [-1, 1]) { const h = new THREE.TorusGeometry(0.05, 0.012, 5, 10, Math.PI); planarUV(h, 'z', TILE.metal); s.lib('metal', h, kx + sx * 0.43, 0.8, kz, 0x3a3632, Math.PI / 2 * sx, 0, 0); }
  const oil = new THREE.CircleGeometry(0.36, 20); oil.rotateX(-Math.PI / 2); remapUV(planarUV(oil, 'y', 0.72), [0, 0, 1, 1]);
  { const uv = oil.attributes.uv, r = UV.sweet.oil; for (let i = 0; i < uv.count; i++) uv.setXY(i, r[0] + (uv.getX(i) + 0.5) * (r[2] - r[0]), r[1] + (uv.getY(i) + 0.5) * (r[3] - r[1])); }
  s.goods(oil, kx, 0.71, kz, 0xffffff);
  for (let k = 0; k < 6; k++) { const j = remapUV(new THREE.TorusGeometry(0.04, 0.01, 4, 10), UV.sweet.jalebi); s.goods(j, kx + Math.cos(k * 1.1) * 0.18, 0.715, kz + Math.sin(k * 1.1) * 0.18, 0xffffff, 0, 0, -Math.PI / 2); }
  s.box('metal', 0.02, 0.02, 0.7, kx + 0.2, 0.86, kz - 0.05, 0x6a6a64, 0.6, 0, -0.35);
  // tin awning
  awningBrackets(s, W, D, OPEN_H + 0.05, 1.1);
  s.tin(W + 0.3, 1.2, 0, OPEN_H + 0.02 - 0.13, D / 2 + 0.58, 0.28, 0xa8a49a, 0.025);
  signs.push({ site: s.site, w: 2.9, lx: 0, ly: (OPEN_H + H) / 2 + 0.02, lz: D / 2 + 0.035, row: 2 });
}

/** One tray of one kind of sweet, every piece a modelled shape with its own small offset. */
function sweets(s, kind, tx, ty, tz, seed, tint) {
  const uv = UV.sweet[kind];
  const grid = (nx, nz, sx, sz, make) => { let i = 0; for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++, i++) make(tx - (nx - 1) * sx / 2 + a * sx + (rnd(seed + i) - 0.5) * sx * 0.15, tz - (nz - 1) * sz / 2 + b * sz + (rnd(seed + i + 50) - 0.5) * sz * 0.15, i); };
  if (kind === 'laddoo') grid(6, 3, 0.07, 0.07, (x, z, i) => { s.goods(remapUV(new THREE.IcosahedronGeometry(0.03, 1), uv), x, ty + 0.028, z, jit(tint, i, 0.06)); if (i % 3 === 1) s.goods(remapUV(new THREE.IcosahedronGeometry(0.03, 1), uv), x + 0.035, ty + 0.075, z, jit(tint, i + 9, 0.06)); });
  else if (kind === 'barfi') grid(6, 3, 0.072, 0.07, (x, z, i) => s.goods(atlasBoxGeo(0.064, 0.024, 0.062, uv, uv, uv), x, ty + 0.012, z, jit(tint, i, 0.05), (rnd(i + seed) - 0.5) * 0.08));
  else if (kind === 'kaju') grid(7, 4, 0.06, 0.05, (x, z, i) => s.goods(atlasBoxGeo(0.04, 0.008, 0.04, uv, uv, uv), x, ty + 0.004 + (i % 4 === 0 ? 0.008 : 0), z, jit(tint, i, 0.04), Math.PI / 4 + (rnd(i) - 0.5) * 0.1));
  else if (kind === 'peda') grid(6, 3, 0.07, 0.07, (x, z, i) => { const g = new THREE.CylinderGeometry(0.026, 0.03, 0.018, 9); s.goods(remapUV(g, uv), x, ty + 0.009, z, jit(tint, i, 0.07)); });
  else if (kind === 'jamun') {
    const bowl = new THREE.CylinderGeometry(0.16, 0.12, 0.08, 16, 1, true); planarUV(bowl, 'z', TILE.metal);
    s.lib('metal', bowl, tx, ty + 0.04, tz, 0xc0c0bc);
    const syr = new THREE.CircleGeometry(0.155, 16); syr.rotateX(-Math.PI / 2); s.goods(remapUV(syr, UV.sweet.syrup), tx, ty + 0.06, tz, 0xffffff);
    for (let i = 0; i < 9; i++) s.goods(remapUV(new THREE.IcosahedronGeometry(0.028, 1), uv), tx + Math.cos(i * 0.9) * (i ? 0.08 : 0), ty + 0.07, tz + Math.sin(i * 0.9) * (i ? 0.08 : 0), jit(tint, i, 0.06));
  } else { // jalebi heap: coils lying at random angles
    for (let i = 0; i < 16; i++) { const g = remapUV(new THREE.TorusGeometry(0.035, 0.009, 4, 10), uv); s.goods(g, tx + (rnd(seed + i) - 0.5) * 0.36, ty + 0.012 + (i % 3) * 0.014, tz + (rnd(seed + i + 7) - 0.5) * 0.16, jit(tint, i, 0.08), rnd(i) * 3, (rnd(i + 3) - 0.5) * 0.4, -Math.PI / 2); }
  }
}

// ---------------------------------------------------------------------------------------------------------------
export function createSmallShops(scene) {
  const group = new THREE.Group(); group.name = 'small_shops';
  const c = ANCHORS.chowk; if (!c) return { group };
  const batch = new Batch();
  const signs = [], people = [], colliders = [];
  SHOPS.forEach((sp, i) => {
    const site = { x: c.x + sp.dx, z: c.z + sp.dz, ry: sp.ry, kind: sp.kind };
    const s = new Shop(site, batch);
    const seed = 17 + i * 13;
    const world = new THREE.Matrix4().makeRotationY(site.ry).setPosition(site.x, 0, site.z);
    if (sp.kind === 'book') { buildBook(s, seed, signs, people); colliders.push(colliderBoxFromTransform(2.95, 1.95, new THREE.Matrix4().multiplyMatrices(world, new THREE.Matrix4().makeTranslation(0, 0, 0.1)))); }
    if (sp.kind === 'cd') { buildCD(s, seed, signs, people); colliders.push(colliderBoxFromTransform(3.1, 2.7, world)); }
    if (sp.kind === 'mithai') { buildMithai(s, seed, signs, people); colliders.push(colliderBoxFromTransform(3.7, 3.1, world)); }
  });
  const meshes = batch.flush(group);
  (meshes.plaster || Object.values(meshes)[0]).userData.colliderBoxes = colliders;

  // signboards: one atlas (Hindi bold line 1, English line 2, same dark paint), boards on wooden battens
  const atlas = createWideSignAtlas([SIGNS.book, SIGNS.cd, SIGNS.mithai]);
  const signMat = Object.assign(new THREE.MeshStandardMaterial({ map: atlas.texture, roughness: 0.85 }), { name: 'signboard' });
  const boards = signs.map((sg) => {
    const h = sg.w / 4.41;
    const g = new THREE.BoxGeometry(sg.w, h, 0.03);
    mapFrontFaceToRow(g, sg.row, atlas.rows);
    g.translate(sg.lx, sg.ly, sg.lz); g.rotateY(sg.site.ry); g.translate(sg.site.x, 0, sg.site.z);
    return g;
  });
  const signMesh = new THREE.Mesh(mergeGeometries(boards), signMat);
  signMesh.name = 'small_shops_signs'; signMesh.castShadow = true; group.add(signMesh);

  // shopkeepers: capsule placeholders (characters are parked), one InstancedMesh
  const cap = new THREE.CapsuleGeometry(0.3, 1.1, 4, 8);
  const pm = new THREE.InstancedMesh(cap, new THREE.MeshStandardMaterial({ roughness: 0.85 }), people.length);
  pm.name = 'small_shops_people'; pm.castShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  people.forEach((pp, i) => {
    const k = pp.h / 1.7, sy = pp.sit ? k * 0.62 : k;
    const sn = Math.sin(pp.site.ry), cs = Math.cos(pp.site.ry);
    p.set(pp.site.x + pp.lx * cs + pp.lz * sn, (pp.sit ? 0.42 : 0.18) + 0.85 * sy, pp.site.z - pp.lx * sn + pp.lz * cs);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pp.site.ry + pp.yaw); sc.set(k, sy, k);
    pm.setMatrixAt(i, m.compose(p, q, sc)); pm.setColorAt(i, col.setHex(pp.tint));
  });
  group.add(pm);

  scene.add(group);
  let tris = 0; group.traverse((o) => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); });
  if (typeof window !== 'undefined') window.__smallShops = { shops: SHOPS.map((sp) => ({ kind: sp.kind, x: +(c.x + sp.dx).toFixed(2), z: +(c.z + sp.dz).toFixed(2) })), tris: Math.round(tris), drawCalls: group.children.length };
  return { group };
}
