import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Real-shaped village shop goods (FEEDBACK 24 Oct item 4: Gupta General Store had coloured cuboids): pillow packs of chips and
 * namkeen with crimped ends and a bulging belly, flat biscuit packs, wrapped soap bars, toffee jars, sachet strips on a string and
 * soda bottles with wrapped labels. Every item is a real silhouette carrying a printed wrapper from ONE generated atlas (generic
 * product names, no brands, nothing tobacco or alcohol), so a whole shop's goods are one merged mesh = one draw call.
 * Honest limit: wrapper art is drawn in code (no free photo of an un-branded packet exists), diffuse only, no normal map.
 */

const CELL = 256;
const COLS = 4;
const ROWS = 6;
// atlas cell index per design
export const DESIGN = {
  chipsRed: 0, chipsGreen: 1, chipsBlue: 2, biscuitBlue: 3, biscuitOrange: 4, soapGreen: 5, soapPink: 6, soapBlue: 7,
  toffeeJar: 8, sachet: 9, sodaOrange: 10, sodaLime: 11, sodaCola: 12, namkeen: 13, tea: 14, salt: 15,
  medWhite: 16, medGreen: 17, syrup: 18, phoneBox: 19, chargerBox: 20, clothStripe: 21, clothCheck: 22, clothPrint: 23,
};

let atlas = null;
function getAtlas() {
  if (atlas) return atlas;
  const canvas = document.createElement('canvas');
  canvas.width = CELL * COLS; canvas.height = CELL * ROWS;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const paint = () => {
    const cell = (i, draw) => { g.save(); g.translate((i % COLS) * CELL, Math.floor(i / COLS) * CELL); g.beginPath(); g.rect(0, 0, CELL, CELL); g.clip(); draw(g); g.restore(); };
    const text = (s, x, y, px, color, weight = 900, family = 'Arial, Helvetica, sans-serif') => { g.fillStyle = color; g.font = `${weight} ${px}px ${family}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); };
    const hindi = (s, x, y, px, color) => text(s, x, y, px, color, 600, '"Noto Sans Devanagari", sans-serif');
    const chip = (x, y, r, rot) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#e8b653'; g.beginPath(); g.ellipse(0, 0, r, r * 0.72, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(160,100,30,.55)'; g.beginPath(); g.ellipse(r * 0.1, r * 0.05, r * 0.7, r * 0.45, 0, 0, 7); g.fill(); g.restore(); };
    const pack = (i, bg1, bg2, title, sub, hi, ink, accent) => cell(i, () => {
      const grad = g.createLinearGradient(0, 0, 0, CELL); grad.addColorStop(0, bg1); grad.addColorStop(1, bg2);
      g.fillStyle = grad; g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = accent; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, 30 + k * 18); g.bezierCurveTo(70, 5 + k * 18, 150, 55 + k * 18, CELL, 25 + k * 18); g.lineTo(CELL, 40 + k * 18); g.bezierCurveTo(150, 70 + k * 18, 70, 20 + k * 18, 0, 46 + k * 18); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.ellipse(CELL / 2, 118, 104, 38, 0, 0, 7); g.fill();
      text(title, CELL / 2, 108, 40, ink); text(sub, CELL / 2, 138, 22, ink, 700);
      hindi(hi, CELL / 2, 168, 22, ink);
      chip(60, 205, 26, 0.3); chip(110, 222, 22, -0.4); chip(160, 208, 28, 0.8); chip(205, 225, 21, 0.1);
      text('NET WT 30 g', CELL / 2, 246, 14, 'rgba(255,255,255,.85)', 700);
    });
    pack(DESIGN.chipsRed, '#d6382b', '#9c1d18', 'CRUNCH', 'MASALA CHIPS', 'मसाला चिप्स', '#8a1410', '#f2c21e');
    pack(DESIGN.chipsGreen, '#2e9e5b', '#17653a', 'CRISPY', 'SALTED CHIPS', 'नमकीन चिप्स', '#145a33', '#e9f5d0');
    pack(DESIGN.chipsBlue, '#2e86c1', '#195781', 'TANGY', 'TOMATO CHIPS', 'टमाटर चिप्स', '#143f66', '#f08a24');
    pack(DESIGN.namkeen, '#f2b01e', '#c4761a', 'MIXTURE', 'CHATPATA NAMKEEN', 'चटपटा नमकीन', '#7a2e0e', '#d9382b');
    const biscuit = (i, bg, ink, title, hi) => cell(i, () => {
      g.fillStyle = bg; g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 70, CELL, 110);
      text(title, CELL / 2, 108, 30, ink); hindi(hi, CELL / 2, 150, 24, ink);
      for (let k = 0; k < 4; k++) { g.fillStyle = '#d9a45a'; g.beginPath(); g.arc(40 + k * 58, 212, 22, 0, 7); g.fill(); g.fillStyle = '#b57a30'; for (let d = 0; d < 6; d++) { g.beginPath(); g.arc(40 + k * 58 + Math.cos(d * 1.1) * 9, 212 + Math.sin(d * 1.1) * 9, 2.2, 0, 7); g.fill(); } }
      text('NET WT 60 g', CELL / 2, 40, 16, 'rgba(255,255,255,.9)', 700);
    });
    biscuit(DESIGN.biscuitBlue, '#2c5fa8', '#1d3f7a', 'GLUCOSE', 'ग्लूकोज़ बिस्कुट');
    biscuit(DESIGN.biscuitOrange, '#e0782a', '#8a3b0a', 'COCONUT', 'नारियल कुकीज़');
    const soap = (i, bg, ink, title, hi) => cell(i, () => {
      g.fillStyle = bg; g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = 'rgba(255,255,255,.88)'; g.fillRect(14, 60, CELL - 28, 120);
      text(title, CELL / 2, 105, 38, ink); hindi(hi, CELL / 2, 150, 28, ink);
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 6; g.strokeRect(8, 8, CELL - 16, CELL - 16);
    });
    soap(DESIGN.soapGreen, '#3f9a4f', '#1c5a28', 'NEEM', 'नीम साबुन');
    soap(DESIGN.soapPink, '#dc6f93', '#8e2a4d', 'ROSE', 'गुलाब साबुन');
    soap(DESIGN.soapBlue, '#4a9bd0', '#1c527e', 'LIME', 'नींबू साबुन');
    cell(DESIGN.toffeeJar, () => { // jar body: glass tint, toffees in many colours, red lid on top
      g.fillStyle = '#cfe3e0'; g.fillRect(0, 0, CELL, CELL);
      const cols = ['#d9382b', '#f2c21e', '#2e9e5b', '#e0509a', '#7b4fb0', '#f08a24', '#2e86c1'];
      for (let k = 0; k < 150; k++) { g.save(); g.translate(Math.random() * CELL, 70 + Math.random() * (CELL - 70)); g.rotate(Math.random() * 3); g.fillStyle = cols[k % cols.length]; g.fillRect(-8, -4, 16, 8); g.beginPath(); g.moveTo(-8, 0); g.lineTo(-14, -5); g.lineTo(-14, 5); g.fill(); g.beginPath(); g.moveTo(8, 0); g.lineTo(14, -5); g.lineTo(14, 5); g.fill(); g.restore(); }
      g.fillStyle = 'rgba(230,245,242,.35)'; g.fillRect(10, 70, 26, CELL - 80);
      g.fillStyle = '#c0392b'; g.fillRect(0, 0, CELL, 64); g.fillStyle = '#8a2418'; g.fillRect(0, 56, CELL, 8);
    });
    cell(DESIGN.sachet, () => { g.fillStyle = '#e8b930'; g.fillRect(0, 0, CELL, CELL); g.fillStyle = '#b0801a'; for (let k = 0; k < 14; k++) g.fillRect(0, k * 20, CELL, 4); g.fillStyle = '#fff6d0'; g.fillRect(24, 70, CELL - 48, 110); text('SHINE', CELL / 2, 108, 40, '#7a3a0a'); hindi('शैम्पू', CELL / 2, 150, 28, '#7a3a0a'); });
    const soda = (i, glass, label, ink, title, hi) => cell(i, () => { // bottle: top = glass + cap, middle = label, bottom = liquid-coloured glass
      g.fillStyle = glass; g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(18, 0, 22, CELL);
      g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, CELL, 22);
      g.fillStyle = label; g.fillRect(0, 105, CELL, 95);
      text(title, CELL / 2, 138, 34, ink); hindi(hi, CELL / 2, 172, 22, ink);
    });
    soda(DESIGN.sodaOrange, '#d97a1c', '#f7efe0', '#a8480a', 'ORANGE', 'संतरा');
    soda(DESIGN.sodaLime, '#5aa860', '#f2f7e6', '#216b2c', 'LIME SODA', 'नींबू सोडा');
    soda(DESIGN.sodaCola, '#3a1f12', '#f0e2d0', '#4a1f0c', 'COLA', 'कोला');
    pack(DESIGN.tea, '#2f7d4a', '#174d2c', 'CHAI', 'STRONG TEA', 'कड़क चाय', '#124a28', '#f2e8b0');
    cell(DESIGN.salt, () => { g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, CELL, CELL); g.fillStyle = '#2a5ea8'; g.fillRect(0, 0, CELL, 60); g.fillRect(0, CELL - 50, CELL, 50); text('SALT', CELL / 2, 125, 50, '#1d3f7a'); hindi('नमक', CELL / 2, 175, 32, '#1d3f7a'); text('1 kg', CELL / 2, 28, 24, '#fff', 800); });
    const med = (i, bg, band, ink, title, hi) => cell(i, () => { // strip-tablet carton: white/green box, coloured band, bilingual generic name
      g.fillStyle = bg; g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = band; g.fillRect(0, 150, CELL, 70);
      text(title, CELL / 2, 92, 34, ink); hindi(hi, CELL / 2, 130, 24, ink);
      text('10 TABLETS', CELL / 2, 196, 26, '#ffffff', 800);
      g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(40 + k * 44, 40, 11, 0, 7); g.fill(); }
    });
    med(DESIGN.medWhite, '#f4f4ee', '#2f6fa8', '#1d3f66', 'PARACET', 'बुखार की गोली');
    med(DESIGN.medGreen, '#dcebd2', '#3a8a4c', '#1c5a28', 'VITAMIN C', 'विटामिन सी');
    cell(DESIGN.syrup, () => { // amber glass bottle: cap strip on top, cream label in the middle
      g.fillStyle = '#7a3f12'; g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = '#d8d8d0'; g.fillRect(0, 0, CELL, 24);
      g.fillStyle = 'rgba(255,230,180,.25)'; g.fillRect(18, 24, 20, CELL);
      g.fillStyle = '#f4ecd6'; g.fillRect(0, 95, CELL, 105);
      text('COUGH', CELL / 2, 135, 34, '#5a2a0a'); hindi('खाँसी सिरप', CELL / 2, 172, 26, '#5a2a0a');
    });
    cell(DESIGN.phoneBox, () => { // keypad-phone retail carton: dark blue, phone silhouette, generic name
      g.fillStyle = '#1c2a44'; g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = '#0c0f18'; g.beginPath(); g.roundRect(78, 56, 100, 160, 14); g.fill();
      g.fillStyle = '#6fa3b8'; g.fillRect(90, 70, 76, 44);
      g.fillStyle = '#c8ccd0'; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g.fillRect(92 + c * 26, 126 + r * 24, 20, 16);
      text('KEYPAD 2 SIM', CELL / 2, 38, 26, '#f2c21e'); hindi('मोबाइल फ़ोन', CELL / 2, 244, 24, '#ffffff');
    });
    cell(DESIGN.chargerBox, () => {
      g.fillStyle = '#e8e8e2'; g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = '#2a8a5a'; g.fillRect(0, 0, CELL, 64);
      text('CHARGER', CELL / 2, 46, 36, '#ffffff'); hindi('मोबाइल चार्जर', CELL / 2, 120, 26, '#1c3a2a');
      g.fillStyle = '#222'; g.fillRect(96, 150, 64, 56); g.fillStyle = '#999'; g.fillRect(108, 206, 12, 28); g.fillRect(136, 206, 12, 28);
    });
    cell(DESIGN.clothStripe, () => { // cloth bolt: woven stripes, warm madder-and-indigo
      g.fillStyle = '#b8423a'; g.fillRect(0, 0, CELL, CELL);
      for (let k = 0; k < 16; k++) { g.fillStyle = k % 4 === 0 ? '#f2e2b8' : k % 4 === 2 ? '#2c3f6e' : 'rgba(0,0,0,.12)'; g.fillRect(k * 16, 0, k % 4 === 1 ? 3 : 8, CELL); }
      g.globalAlpha = 0.15; g.fillStyle = '#000'; for (let y = 0; y < CELL; y += 3) g.fillRect(0, y, CELL, 1); g.globalAlpha = 1;
    });
    cell(DESIGN.clothCheck, () => { // indigo-and-white check
      g.fillStyle = '#e8e4d6'; g.fillRect(0, 0, CELL, CELL);
      g.fillStyle = 'rgba(44,63,110,.8)'; for (let k = 0; k < 8; k++) { g.fillRect(k * 32, 0, 14, CELL); g.fillRect(0, k * 32, CELL, 14); }
      g.globalAlpha = 0.12; g.fillStyle = '#000'; for (let y = 0; y < CELL; y += 3) g.fillRect(0, y, CELL, 1); g.globalAlpha = 1;
    });
    cell(DESIGN.clothPrint, () => { // block-print: olive ground, small cream and rust motifs
      g.fillStyle = '#6f7240'; g.fillRect(0, 0, CELL, CELL);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const cx = x * 32 + (y % 2) * 16 + 16, cy = y * 32 + 16; g.fillStyle = '#efe3c0'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill(); g.fillStyle = '#a8502c'; g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill(); }
    });
    texture.needsUpdate = true;
  };
  paint();
  Promise.all([document.fonts.load('600 20px "Noto Sans Devanagari"'), document.fonts.ready]).then(paint, paint);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.42, metalness: 0.12 });
  material.name = 'shop_goods';
  atlas = { texture, material };
  return atlas;
}

function cellUV(design) {
  const col = design % COLS, row = Math.floor(design / COLS);
  const eps = 0.004;
  return { u0: col / COLS + eps, u1: (col + 1) / COLS - eps, v0: 1 - (row + 1) / ROWS + eps, v1: 1 - row / ROWS - eps };
}

function setUVs(geo, design) {
  const { u0, u1, v0, v1 } = cellUV(design);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return geo;
}

/** A pillow pack: front/back printed faces that bulge in the middle, flat crimped ends. */
function pillowPack(w, h, d, design) {
  const geo = new THREE.BoxGeometry(w, h, d, 6, 12, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ny = y / (h / 2), nx = x / (w / 2);
    const belly = Math.max(0, 1 - ny * ny) ** 0.6 * (1 - 0.35 * nx * nx); // fat in the middle, tapering to the crimps
    const crimp = Math.abs(ny) > 0.86 ? 0.06 : 1;
    p.setZ(i, z * belly * crimp + (Math.abs(ny) > 0.86 ? Math.sin(x * 120) * 0.0035 * Math.sign(z) : 0));
    p.setX(i, x * (1 - 0.06 * (1 - Math.max(0, 1 - ny * ny)))); // pinched at the crimps
  }
  geo.computeVertexNormals();
  return setUVs(geo, design);
}

function flatPack(w, h, d, design) { return setUVs(new THREE.BoxGeometry(w, h, d), design); }

/** Lathe bottle/jar with the label cell wrapped around it. profile: [[radius, y]...]. */
function lathe(profile, design) {
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 14);
  const uv = geo.attributes.uv; const maxY = profile[profile.length - 1][1];
  for (let i = 0; i < uv.count; i++) uv.setY(i, geo.attributes.position.getY(i) / maxY);
  return setUVs(geo, design);
}
const BOTTLE = [[0, 0], [0.032, 0], [0.034, 0.012], [0.034, 0.17], [0.03, 0.2], [0.014, 0.235], [0.013, 0.265], [0.016, 0.268], [0.016, 0.28], [0, 0.28]];
const JAR = [[0, 0], [0.07, 0], [0.075, 0.02], [0.075, 0.2], [0.065, 0.225], [0.065, 0.26], [0, 0.26]];

function place(geo, x, y, z, ry = 0, rz = 0, rx = 0) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)).setPosition(x, y, z);
  return geo.clone().applyMatrix4(m);
}

/**
 * Items: [{ kind: 'chips'|'biscuit'|'soap'|'jar'|'sachets'|'bottle'|'namkeen'|'tea'|'salt', design, x, y, z, ry?, rz?, s? }]
 * in the shop's local frame; `world` moves them into the village. y is the surface they stand on. Returns one Mesh (one draw call).
 */
export function buildGoodsMesh(items, world, name = 'shop_goods') {
  const geos = [];
  for (const it of items) {
    const s = it.s ?? 1;
    let g;
    switch (it.kind) {
      case 'chips': case 'namkeen': g = pillowPack(0.15 * s, 0.22 * s, 0.045 * s, it.design); g.translate(0, 0.11 * s, 0); break;
      case 'tea': g = pillowPack(0.11 * s, 0.17 * s, 0.04 * s, it.design); g.translate(0, 0.085 * s, 0); break;
      case 'salt': g = flatPack(0.1 * s, 0.17 * s, 0.05 * s, it.design); g.translate(0, 0.085 * s, 0); break;
      case 'biscuit': g = flatPack(0.13 * s, 0.2 * s, 0.035 * s, it.design); g.translate(0, 0.1 * s, 0); break;
      case 'soap': g = flatPack(0.085 * s, 0.05 * s, 0.1 * s, it.design); g.translate(0, 0.025 * s, 0); break;
      case 'syrup': g = lathe(BOTTLE, it.design); g.scale(s * 1.15, s * 1.15, s * 1.15); break;
      case 'medbox': g = flatPack(0.13 * s, 0.07 * s, 0.045 * s, it.design); g.translate(0, 0.035 * s, 0); break;
      case 'phonebox': g = flatPack(0.1 * s, 0.17 * s, 0.05 * s, it.design); g.translate(0, 0.085 * s, 0); break;
      case 'bolt': g = lathe([[0, 0], [0.13, 0], [0.14, 0.01], [0.14, 0.49], [0.13, 0.5], [0, 0.5]], it.design); g.scale(s, s, s); break;
      case 'bottle': g = lathe(BOTTLE, it.design); g.scale(s, s, s); break;
      case 'jar': g = lathe(JAR, it.design); g.scale(s, s, s); break;
      case 'sachets': { // a strip of foil sachets on a string, hanging from y downward
        const parts = [];
        for (let k = 0; k < 7; k++) parts.push(place(pillowPack(0.06 * s, 0.085 * s, 0.014 * s, it.design), 0, -k * 0.095 * s - 0.045 * s, 0, 0, (k % 2 ? 0.05 : -0.05)));
        g = mergeGeometries(parts); break;
      }
      default: continue;
    }
    geos.push(place(g, it.x, it.y, it.z, it.ry ?? 0, it.rz ?? 0, it.rx ?? 0));
  }
  const clean = geos.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; });
  const mesh = new THREE.Mesh(mergeGeometries(clean), getAtlas().material);
  mesh.applyMatrix4(world);
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

/** The Gupta General Store's stock, local frame: origin = block centre, front (counter window) = +z; shelves in the recess. */
export function generalStoreGoods(world) {
  const items = [];
  let n = 0;
  const rnd = () => { n++; return ((Math.sin(n * 91.7) + 1) * 0.5 * 9973) % 1; };
  const D = DESIGN;
  // back-wall shelves: tops at y 1.23 / 1.58 / 1.93, shelf depth z 0.65-1.0
  const shelf = (y, row) => {
    let x = -1.08;
    while (x < 1.08) {
      const roll = rnd();
      const z = 0.78 + rnd() * 0.14;
      const ry = (rnd() - 0.5) * 0.35;
      if (row === 0) { // bottom shelf: soda bottles, soap, salt
        if (roll < 0.45) { items.push({ kind: 'bottle', design: [D.sodaOrange, D.sodaLime, D.sodaCola][Math.floor(rnd() * 3)], x, y, z, ry: rnd() * 6, s: 1.05 }); x += 0.085; }
        else if (roll < 0.8) { for (let k = 0; k < 3; k++) items.push({ kind: 'soap', design: [D.soapGreen, D.soapPink, D.soapBlue][Math.floor(rnd() * 3)], x: x + 0.05, y: y + k * 0.052, z, ry: (rnd() - 0.5) * 0.3 }); x += 0.15; }
        else { items.push({ kind: 'salt', design: D.salt, x, y, z, ry }); x += 0.13; }
      } else if (row === 1) { // middle: biscuit packs leaning, tea, toffee jars
        if (roll < 0.5) { items.push({ kind: 'biscuit', design: rnd() < 0.5 ? D.biscuitBlue : D.biscuitOrange, x, y, z: z + 0.04, ry, rx: -0.12 }); x += 0.145; }
        else if (roll < 0.78) { items.push({ kind: 'tea', design: D.tea, x, y, z, ry }); x += 0.125; }
        else { items.push({ kind: 'jar', design: D.toffeeJar, x: x + 0.05, y, z: z - 0.02, ry: rnd() * 6, s: 0.95 }); x += 0.19; }
      } else { // top shelf: chips and namkeen stacked upright
        items.push({ kind: rnd() < 0.7 ? 'chips' : 'namkeen', design: rnd() < 0.7 ? [D.chipsRed, D.chipsGreen, D.chipsBlue][Math.floor(rnd() * 3)] : D.namkeen, x, y, z, ry, s: 0.9 + rnd() * 0.15 }); x += 0.145;
      }
    }
  };
  shelf(1.23, 0); shelf(1.58, 1); shelf(1.93, 2);
  // counter top (y 0.96): toffee jars at the front corners, a tray of soap and sodas
  for (const [x, z] of [[-1.05, 1.72], [-0.55, 1.78], [1.05, 1.72]]) items.push({ kind: 'jar', design: D.toffeeJar, x, y: 0.96, z, ry: x * 5, s: 1.1 });
  for (let k = 0; k < 5; k++) items.push({ kind: 'chips', design: [D.chipsRed, D.chipsGreen, D.chipsBlue][k % 3], x: 0.05 + k * 0.17, y: 0.96, z: 1.7, ry: 0.15 * (k % 2 ? 1 : -1), rx: -0.25, s: 0.95 });
  // strings of snack packs and sachet strips down both sides of the window (the string itself is in the Blender model)
  for (const side of [-1, 1]) for (let col = 0; col < 2; col++) {
    const x = side * (1.45 + col * 0.18);
    for (let k = 0; k < 7; k++) items.push({ kind: 'chips', design: [D.chipsRed, D.chipsGreen, D.chipsBlue, D.namkeen][(k + col * 2 + (side > 0 ? 1 : 0)) % 4], x, y: 2.1 - k * 0.2 - 0.2, z: 1.56, ry: (k % 2 ? 0.1 : -0.1), s: 0.7 });
  }
  items.push({ kind: 'sachets', design: D.sachet, x: -1.2, y: 2.05, z: 1.56 });
  items.push({ kind: 'sachets', design: D.sachet, x: 1.2, y: 2.05, z: 1.56 });
  // the red crate of soda bottles outside, left of the counter
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) items.push({ kind: 'bottle', design: [D.sodaOrange, D.sodaLime, D.sodaCola][(i + j) % 3], x: -1.5 + i * 0.13, y: 0.3, z: 1.85 + j * 0.15, ry: i * 1.7 + j });
  return buildGoodsMesh(items, world, 'general_store_stock');
}

/** Fold several goods meshes (same atlas material) into one draw call; world transforms are baked in. */
export function mergeGoodsMeshes(meshes, name) {
  const geos = meshes.map((m) => { m.updateMatrix(); return m.geometry.clone().applyMatrix4(m.matrix); });
  const mesh = new THREE.Mesh(mergeGeometries(geos), meshes[0].material);
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}
