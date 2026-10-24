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
const ROWS = 11;
// atlas cell index per design
export const DESIGN = {
  chipsRed: 0, chipsGreen: 1, chipsBlue: 2, biscuitBlue: 3, biscuitOrange: 4, soapGreen: 5, soapPink: 6, soapBlue: 7,
  toffeeJar: 8, sachet: 9, sodaOrange: 10, sodaLime: 11, sodaCola: 12, namkeen: 13, tea: 14, salt: 15,
  medWhite: 16, medGreen: 17, syrup: 18, phoneBox: 19, chargerBox: 20, clothStripe: 21, clothCheck: 22, clothPrint: 23,
  tomato: 24, onion: 25, potato: 26, greens: 27, brinjal: 28, bangleRed: 29, bangleBlue: 30, bangleGreen: 31,
  laddoo: 32, gulab: 33, barfi: 34, jalebi: 35, samosa: 36, milk: 37, ghee: 38, dahi: 39,
  hairOil: 40, shampoo: 41, towel: 42, tyre: 43,
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
    // Produce skins: mottled colour with fine speckle so a heap reads as real vegetables, not tinted balls.
    const speckle = (n, rgba, rmax) => { for (let k = 0; k < n; k++) { g.fillStyle = rgba; g.beginPath(); g.arc(Math.random() * CELL, Math.random() * CELL, 0.6 + Math.random() * rmax, 0, 7); g.fill(); } };
    const seeded = (seed) => { let t = seed; Math.random = () => { t = (t * 16807) % 2147483647; return (t - 1) / 2147483646; }; };
    const realRandom = Math.random;
    seeded(4242);
    cell(DESIGN.tomato, () => { const gr = g.createLinearGradient(0, 0, 0, CELL); gr.addColorStop(0, '#6e9a2e'); gr.addColorStop(0.18, '#d23a22'); gr.addColorStop(0.7, '#c42a1a'); gr.addColorStop(1, '#8e1a12'); g.fillStyle = gr; g.fillRect(0, 0, CELL, CELL); speckle(260, 'rgba(255,170,120,.18)', 3); speckle(160, 'rgba(70,0,0,.16)', 3); g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(70, 110, 14, 34, 0.4, 0, 7); g.fill(); });
    cell(DESIGN.onion, () => { g.fillStyle = '#b4607c'; g.fillRect(0, 0, CELL, CELL); for (let k = 0; k < 40; k++) { g.fillStyle = k % 3 ? 'rgba(120,40,70,.28)' : 'rgba(235,190,200,.28)'; g.fillRect(k * 6.4 + Math.random() * 3, 0, 1.5 + Math.random() * 2.5, CELL); } g.fillStyle = '#c8a57a'; g.fillRect(0, 0, CELL, 22); speckle(120, 'rgba(255,230,230,.15)', 2); });
    cell(DESIGN.potato, () => { g.fillStyle = '#b79463'; g.fillRect(0, 0, CELL, CELL); speckle(520, 'rgba(110,80,45,.28)', 4); speckle(300, 'rgba(235,210,165,.25)', 3); for (let k = 0; k < 9; k++) { g.fillStyle = 'rgba(70,45,25,.55)'; g.beginPath(); g.ellipse(Math.random() * CELL, Math.random() * CELL, 2.5, 1.6, Math.random() * 3, 0, 7); g.fill(); } });
    cell(DESIGN.greens, () => { g.fillStyle = '#2f6a2a'; g.fillRect(0, 0, CELL, CELL); for (let k = 0; k < 9; k++) { const x = 14 + k * 28; g.strokeStyle = 'rgba(190,225,140,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, CELL); g.lineTo(x + (k % 2 ? 14 : -14), 0); g.stroke(); for (let j = 0; j < 7; j++) { g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + (k % 2 ? 2 : -2) * j, CELL - j * 36); g.lineTo(x + 26, CELL - j * 36 - 24); g.moveTo(x + (k % 2 ? 2 : -2) * j, CELL - j * 36); g.lineTo(x - 26, CELL - j * 36 - 24); g.stroke(); } } speckle(300, 'rgba(20,50,15,.25)', 3); speckle(200, 'rgba(150,200,90,.2)', 2); g.fillStyle = '#d9e0b8'; g.fillRect(0, CELL - 30, CELL, 30); });
    cell(DESIGN.brinjal, () => { const gr = g.createLinearGradient(0, 0, CELL, 0); gr.addColorStop(0, '#2a0f3e'); gr.addColorStop(0.35, '#5a2a7a'); gr.addColorStop(0.5, '#7a4a9a'); gr.addColorStop(1, '#2a0f3e'); g.fillStyle = gr; g.fillRect(0, 0, CELL, CELL); speckle(120, 'rgba(255,255,255,.07)', 3); g.fillStyle = '#4f7a35'; g.fillRect(0, 0, CELL, 38); });
    const bangle = (i, base, hi) => cell(i, () => { g.fillStyle = base; g.fillRect(0, 0, CELL, CELL); for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? hi : 'rgba(255,255,255,.35)'; g.fillRect(0, k * 32 + 12, CELL, 5); } g.fillStyle = '#e3c25a'; for (let x = 8; x < CELL; x += 24) { g.beginPath(); g.arc(x, 128, 4, 0, 7); g.fill(); } g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 60, CELL, 8); speckle(180, 'rgba(255,255,255,.3)', 1.6); });
    bangle(DESIGN.bangleRed, '#b8203f', '#e8c050'); bangle(DESIGN.bangleBlue, '#1f5fa8', '#d9e8f5'); bangle(DESIGN.bangleGreen, '#1f8a56', '#e8d068');
    // Halwai sweets and fried snacks: a skin texture each (boondi bumps, syrup gloss, silver leaf, blistered pastry), no flat colour.
    cell(DESIGN.laddoo, () => { g.fillStyle = '#e3a22a'; g.fillRect(0, 0, CELL, CELL); for (let k = 0; k < 260; k++) { g.fillStyle = k % 3 ? 'rgba(255,214,110,.75)' : 'rgba(170,98,18,.55)'; g.beginPath(); g.arc(Math.random() * CELL, Math.random() * CELL, 4 + Math.random() * 5, 0, 7); g.fill(); } speckle(140, 'rgba(255,240,190,.4)', 2); });
    cell(DESIGN.gulab, () => { const gr = g.createLinearGradient(0, 0, 0, CELL); gr.addColorStop(0, '#6a3014'); gr.addColorStop(0.5, '#3c1708'); gr.addColorStop(1, '#2a0f05'); g.fillStyle = gr; g.fillRect(0, 0, CELL, CELL); speckle(180, 'rgba(120,60,24,.35)', 4); g.fillStyle = 'rgba(255,200,140,.4)'; g.beginPath(); g.ellipse(70, 90, 22, 40, 0.5, 0, 7); g.fill(); g.fillStyle = 'rgba(255,170,90,.25)'; g.fillRect(0, 214, CELL, 6); });
    cell(DESIGN.barfi, () => { g.fillStyle = '#eddcae'; g.fillRect(0, 0, CELL, CELL); speckle(220, 'rgba(196,160,96,.35)', 3); g.fillStyle = 'rgba(214,220,226,.82)'; g.fillRect(0, 0, CELL, 70); for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(Math.random() * CELL, Math.random() * 70, 6 + Math.random() * 22, 2); } g.fillStyle = '#7a9a4a'; for (let k = 0; k < 14; k++) { g.beginPath(); g.ellipse(30 + (k % 5) * 48, 120 + Math.floor(k / 5) * 44, 9, 4, Math.random() * 3, 0, 7); g.fill(); } });
    cell(DESIGN.jalebi, () => { const gr = g.createLinearGradient(0, 0, CELL, CELL); gr.addColorStop(0, '#f08a1c'); gr.addColorStop(1, '#c4520e'); g.fillStyle = gr; g.fillRect(0, 0, CELL, CELL); for (let k = 0; k < 10; k++) { g.strokeStyle = k % 2 ? 'rgba(255,200,90,.55)' : 'rgba(150,50,6,.4)'; g.lineWidth = 7; g.beginPath(); g.arc(128, 128, 14 + k * 11, 0, 7); g.stroke(); } speckle(200, 'rgba(255,230,160,.35)', 2); });
    cell(DESIGN.samosa, () => { g.fillStyle = '#a2601a'; g.fillRect(0, 0, CELL, CELL); speckle(420, 'rgba(90,44,8,.45)', 5); speckle(260, 'rgba(214,150,64,.4)', 4); for (let k = 0; k < 9; k++) { g.strokeStyle = 'rgba(100,52,10,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(k * 30, 0); g.lineTo(k * 30 + 12, CELL); g.stroke(); } });
    // Dairy: a milk pouch, a ghee tin label and a curd-tub label (generic names, no brands).
    cell(DESIGN.milk, () => { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, CELL, CELL); g.fillStyle = '#2b6cb0'; g.fillRect(0, 0, CELL, 62); g.fillRect(0, 194, CELL, 62); g.fillStyle = '#7fb3e0'; g.beginPath(); g.ellipse(CELL / 2, 128, 86, 40, 0, 0, 7); g.fill(); text('TONED MILK', CELL / 2, 40, 30, '#ffffff'); text('FRESH DAIRY', CELL / 2, 118, 28, '#12406e'); hindi('टोंड दूध', CELL / 2, 148, 26, '#12406e'); text('500 ml', CELL / 2, 226, 26, '#ffffff', 700); for (let y = 0; y < CELL; y += 4) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, y, CELL, 1); } });
    cell(DESIGN.ghee, () => { const gr = g.createLinearGradient(0, 0, CELL, 0); gr.addColorStop(0, '#d9a41c'); gr.addColorStop(0.5, '#f2cd4e'); gr.addColorStop(1, '#b98710'); g.fillStyle = gr; g.fillRect(0, 0, CELL, CELL); g.fillStyle = '#fff6d8'; g.fillRect(0, 70, CELL, 120); text('PURE GHEE', CELL / 2, 108, 38, '#7a3a08'); hindi('शुद्ध घी', CELL / 2, 154, 30, '#7a3a08'); g.fillStyle = '#7a3a08'; g.fillRect(0, 60, CELL, 6); g.fillRect(0, 190, CELL, 6); text('1 kg', CELL / 2, 224, 26, '#5a2a04', 700); });
    cell(DESIGN.dahi, () => { g.fillStyle = '#f7f4ea'; g.fillRect(0, 0, CELL, CELL); g.fillStyle = '#c0392b'; g.fillRect(0, 0, CELL, 54); g.fillRect(0, 202, CELL, 54); text('FRESH CURD', CELL / 2, 28, 28, '#ffffff'); text('DAHI', CELL / 2, 110, 56, '#8a1f14'); hindi('ताज़ा दही', CELL / 2, 164, 30, '#8a1f14'); text('400 g', CELL / 2, 230, 24, '#ffffff', 700); });
    // Barber and puncture shop: hair-oil and shampoo bottle labels, a striped cotton towel, a tyre with sidewall print and tread (generic names, no brands).
    cell(DESIGN.hairOil, () => { g.fillStyle = '#e9d9a0'; g.fillRect(0, 0, CELL, CELL); g.fillStyle = '#1f6b3a'; g.fillRect(0, 0, CELL, 52); g.fillRect(0, 204, CELL, 52); g.fillStyle = '#f7f1d6'; g.beginPath(); g.ellipse(CELL / 2, 128, 96, 58, 0, 0, 7); g.fill(); text('AMLA', CELL / 2, 108, 50, '#1f5a30'); text('HAIR OIL', CELL / 2, 154, 30, '#7a3a08'); hindi('आंवला तेल', CELL / 2, 30, 26, '#ffffff'); text('200 ml', CELL / 2, 230, 24, '#ffffff', 700); });
    cell(DESIGN.shampoo, () => { const gr = g.createLinearGradient(0, 0, 0, CELL); gr.addColorStop(0, '#f4f7f8'); gr.addColorStop(1, '#bfe0ea'); g.fillStyle = gr; g.fillRect(0, 0, CELL, CELL); g.fillStyle = '#2a7fa8'; g.fillRect(0, 0, CELL, 52); g.fillRect(0, 204, CELL, 52); g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(CELL / 2, 124, 100, 54, 0, 0, 7); g.fill(); text('SILKY', CELL / 2, 108, 50, '#1f5f80'); text('SHAMPOO', CELL / 2, 150, 30, '#1f5f80'); hindi('शैम्पू', CELL / 2, 30, 28, '#ffffff'); text('100 ml', CELL / 2, 230, 24, '#ffffff', 700); });
    cell(DESIGN.towel, () => { g.fillStyle = '#f1ede2'; g.fillRect(0, 0, CELL, CELL); for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#2f5d9a' : '#b8352b'; g.fillRect(0, 20 + k * 38, CELL, k % 2 ? 10 : 18); } for (let k = 0; k < 3000; k++) { g.fillStyle = k % 2 ? 'rgba(120,110,95,.10)' : 'rgba(255,255,255,.18)'; g.fillRect(Math.random() * CELL, Math.random() * CELL, 1, 1 + Math.random() * 3); } g.fillStyle = 'rgba(160,150,130,.5)'; for (let x = 0; x < CELL; x += 4) g.fillRect(x, 0, 1, 12); });
    cell(DESIGN.tyre, () => { g.fillStyle = '#1b1b1a'; g.fillRect(0, 0, CELL, CELL); speckle(600, 'rgba(70,70,66,.55)', 2); for (let x = 0; x < CELL; x += 16) { g.fillStyle = 'rgba(8,8,8,.7)'; g.fillRect(x, 0, 6, CELL); } g.fillStyle = '#1b1b1a'; g.fillRect(0, 88, CELL, 80); speckle(240, 'rgba(90,90,84,.4)', 2); for (let k = 0; k < 4; k++) { text('TUBELESS', k * 64 + 32, 112, 12, 'rgba(210,210,200,.85)', 700); text('90/90-17', k * 64 + 32, 140, 12, 'rgba(210,210,200,.85)', 700); } });
    Math.random = realRandom;
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
// squat toiletry bottle: wide body, short shoulder, flip-top cap (reads as shampoo/hair oil, not a wine neck)
const SQUAT = [[0, 0], [0.034, 0], [0.037, 0.01], [0.037, 0.125], [0.03, 0.15], [0.016, 0.16], [0.016, 0.17], [0.02, 0.172], [0.02, 0.19], [0.014, 0.196], [0, 0.196]];
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
      case 'tomato': g = new THREE.SphereGeometry(0.04, 12, 9); g.scale(s, 0.82 * s, s); g.translate(0, 0.033 * s, 0); setUVs(g, it.design); break;
      case 'onion': g = new THREE.SphereGeometry(0.045, 12, 9); g.scale(s, 0.88 * s, s); g.translate(0, 0.04 * s, 0); setUVs(g, it.design); break;
      case 'potato': g = new THREE.SphereGeometry(0.045, 12, 9); g.scale(1.35 * s, 0.85 * s, s); g.translate(0, 0.038 * s, 0); setUVs(g, it.design); break;
      case 'brinjal': g = new THREE.SphereGeometry(0.035, 12, 9); g.scale(s, 2.6 * s, s); g.rotateZ(Math.PI / 2); g.translate(0, 0.035 * s, 0); setUVs(g, it.design); break;
      case 'greens': { // a bundle of leafy stalks: tilted double-sided blades fanning out from a tied base
        const parts = [];
        for (let k = 0; k < 7; k++) for (const flip of [0, Math.PI]) {
          const blade = new THREE.PlaneGeometry(0.11 * s, 0.3 * s, 1, 3);
          const bp = blade.attributes.position;
          for (let i = 0; i < bp.count; i++) bp.setZ(i, Math.pow(bp.getY(i) / (0.15 * s) + 1, 2) * 0.02 * s * (1 + (bp.getX(i) / (0.055 * s)) ** 2 * 0.4)); // leaf droops outward
          blade.translate(0, 0.15 * s, 0); blade.rotateX(-0.25 - ((k * 37) % 7) * 0.11); blade.rotateZ(((k * 53) % 5 - 2) * 0.09); blade.rotateY(flip + k * 0.9 + (k % 3) * 0.2);
          parts.push(setUVs(blade.toNonIndexed(), it.design));
        }
        g = mergeGeometries(parts); g.translate(0, 0.02 * s, 0); break;
      }
      case 'laddoo': g = new THREE.SphereGeometry(0.036, 12, 9); g.scale(s, 0.92 * s, s); g.translate(0, 0.033 * s, 0); setUVs(g, it.design); break;
      case 'gulab': g = new THREE.SphereGeometry(0.034, 12, 9); g.scale(s, 0.85 * s, s); g.translate(0, 0.029 * s, 0); setUVs(g, it.design); break;
      case 'barfi': g = flatPack(0.07 * s, 0.026 * s, 0.07 * s, it.design); g.translate(0, 0.013 * s, 0); break;
      case 'jalebi': { const t = new THREE.TorusGeometry(0.036 * s, 0.0085 * s, 6, 14); t.rotateX(Math.PI / 2); const t2 = new THREE.TorusGeometry(0.019 * s, 0.0085 * s, 6, 10); t2.rotateX(Math.PI / 2); t2.translate(0, 0.004 * s, 0); g = mergeGeometries([setUVs(t, it.design), setUVs(t2, it.design)]); g.translate(0, 0.01 * s, 0); break; }
      case 'samosa': g = new THREE.ConeGeometry(0.058 * s, 0.085 * s, 3, 1); g.rotateY(0.3); g.translate(0, 0.0425 * s, 0); g.scale(1, 0.9, 1); setUVs(g, it.design); break;
      case 'towel': g = flatPack(0.14 * s, 0.4 * s, 0.012 * s, it.design); g.translate(0, -0.2 * s, 0); break;
      case 'folded': g = flatPack(0.38 * s, 0.035 * s, 0.26 * s, it.design); g.translate(0, 0.0175 * s, 0); break;
      case 'tyre': { g = new THREE.TorusGeometry(0.3 * s, 0.075 * s, 10, 26); g.scale(1, 1, 1.15); setUVs(g, it.design); g.translate(0, 0.3 * s, 0); break; }
      case 'tube': { g = new THREE.TorusGeometry(0.22 * s, 0.04 * s, 8, 22); setUVs(g, it.design); g.translate(0, 0.22 * s, 0); break; }
      case 'bangle': g = new THREE.TorusGeometry(0.042 * s, 0.0065 * s, 6, 14); g.rotateX(Math.PI / 2); setUVs(g, it.design); break;
      case 'milkpouch': g = pillowPack(0.13 * s, 0.17 * s, 0.05 * s, it.design); g.translate(0, 0.085 * s, 0); break;
      case 'tub': g = lathe([[0, 0], [0.045, 0], [0.058, 0.02], [0.062, 0.075], [0.066, 0.08], [0, 0.08]], it.design); g.scale(s, s, s); break;
      case 'bottle': g = lathe(BOTTLE, it.design); g.scale(s, s, s); break;
      case 'toiletry': g = lathe(SQUAT, it.design); g.scale(s, s, s); break;
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

/** Dudh dairy stock, dairy-local frame (bench top y 0.51 at x 2.0, z 3.1; crates beside the cans): milk pouches, ghee tins, curd tubs. */
export function dairyGoods() {
  const items = [];
  let n = 0;
  const rnd = () => { n++; return ((Math.sin(n * 71.1) + 1) * 0.5 * 9973) % 1; };
  const D = DESIGN;
  // bench ends: a stack of curd tubs and a row of ghee tins, between/after the two cans
  for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) items.push({ kind: 'tub', design: D.dahi, x: 1.5 + (k % 2) * 0.01, y: 0.51 + j * 0.08, z: 3.1 + (k - 1) * 0.15, ry: rnd() * 6, s: 1 });
  for (let k = 0; k < 4; k++) items.push({ kind: 'jar', design: D.ghee, x: 2.45, y: 0.51, z: 2.9 + k * 0.13, ry: rnd() * 6, s: 0.8 + rnd() * 0.1 });
  // two stacks of milk pouches lying flat in rows on the floor beside the door (pillow pack lies on its back: rx = -90deg, y is its face)
  for (const cx of [-0.05, 0.7]) for (let layer = 0; layer < 4; layer++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) items.push({ kind: 'milkpouch', design: D.milk, x: cx + (i - 0.5) * 0.15 + (rnd() - 0.5) * 0.02, y: layer * 0.052, z: 3.55 + (j - 0.5) * 0.2, ry: (rnd() - 0.5) * 0.25, rx: -Math.PI / 2, s: 1 });
  return buildGoodsMesh(items, new THREE.Matrix4(), 'dairy_stock');
}

/** Yadav tea stall stock (tea-stall frame, tools/blender/build_tea_stall.py): printed packs on the back shelf (y 1.55) and snack strings on the front beam. */
export function teaStallGoods(world) {
  const items = [];
  let n = 0;
  const rnd = () => { n++; return ((Math.sin(n * 61.7) + 1) * 0.5 * 9973) % 1; };
  const D = DESIGN;
  const kinds = [['biscuit', D.biscuitBlue], ['tea', D.tea], ['chips', D.chipsRed], ['biscuit', D.biscuitOrange], ['namkeen', D.namkeen], ['salt', D.salt], ['chips', D.chipsGreen]];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
    const [kind, design] = kinds[(i + row * 3) % kinds.length];
    items.push({ kind, design, x: 0.35 + i * 0.18 + (rnd() - 0.5) * 0.02, y: 1.55, z: -0.97 + row * 0.14, ry: (rnd() - 0.5) * 0.3, rx: row ? -0.2 : -0.1, s: 0.9 + rnd() * 0.15 });
  }
  for (const [x0, designs] of [[-1.7, [D.chipsRed, D.chipsBlue, D.namkeen, D.chipsGreen]], [0.9, [D.chipsGreen, D.chipsRed, D.chipsBlue, D.namkeen]]]) {
    designs.forEach((design, k) => items.push({ kind: 'chips', design, x: x0 + k * 0.2, y: 2.12 - (k % 2) * 0.05, z: 1.14, ry: (rnd() - 0.5) * 0.3, s: 0.8 }));
  }
  items.push({ kind: 'sachets', design: D.sachet, x: 0.2, y: 2.36, z: 1.14 });
  items.push({ kind: 'sachets', design: D.sachet, x: -0.5, y: 2.36, z: 1.14 });
  // a few packs lying on the counter beside the tray
  items.push({ kind: 'biscuit', design: D.biscuitBlue, x: 1.2, y: 0.99, z: 0.66, ry: 0.4, rx: -Math.PI / 2, s: 1 });
  items.push({ kind: 'biscuit', design: D.biscuitOrange, x: 1.22, y: 1.025, z: 0.68, ry: -0.3, rx: -Math.PI / 2, s: 1 });
  return buildGoodsMesh(items, world, 'tea_stall_stock');
}

/** Chemist stock, chemist-local frame: counter top y 1.35 (x -1.6..1.6, z 2.25..2.95): stacked medicine cartons, syrup bottles in a row, a tray of strips. */
export function chemistGoods() {
  const items = [];
  let n = 0;
  const rnd = () => { n++; return ((Math.sin(n * 47.3) + 1) * 0.5 * 9973) % 1; };
  const D = DESIGN;
  // stacks of cartons along the back edge of the counter
  for (let i = 0; i < 9; i++) {
    const x = -1.4 + i * 0.34, h = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < h; k++) items.push({ kind: 'medbox', design: (i + k) % 3 ? D.medWhite : D.medGreen, x: x + (rnd() - 0.5) * 0.02, y: 1.35 + k * 0.07, z: 2.4, ry: (rnd() - 0.5) * 0.3, s: 0.95 + rnd() * 0.1 });
  }
  // cough-syrup bottles in the middle and at the right end
  for (let i = 0; i < 6; i++) items.push({ kind: 'syrup', design: D.syrup, x: -0.6 + i * 0.16, y: 1.35, z: 2.65 + (i % 2) * 0.08, ry: rnd() * 6, s: 0.9 + rnd() * 0.2 });
  // loose cartons lying flat near the customer side
  for (let i = 0; i < 5; i++) items.push({ kind: 'medbox', design: i % 2 ? D.medGreen : D.medWhite, x: 0.75 + (i % 3) * 0.2, y: 1.35 + Math.floor(i / 3) * 0.045, z: 2.78, ry: (rnd() - 0.5) * 0.5, rz: 0, s: 1 });
  return buildGoodsMesh(items, new THREE.Matrix4(), 'chemist_stock');
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

/** Sabzi (unit 2) produce heaps and the manihari's (unit 7) glass bangles; bazaar-row frame, y = surface. */
export function produceAndBangleItems({ sabzi, bangle, counterH, counterZ, backZ }) {
  const items = [];
  let n = 0;
  const rnd = () => { n++; return ((Math.sin(n * 37.9) + 1) * 0.5 * 9973) % 1; };
  const D = DESIGN;
  const heap = (x0, z0, w, d, y, kinds) => {
    for (let layer = 0; layer < 3; layer++) {
      const cnt = Math.round((w * d) / 0.012) - layer * 5;
      for (let i = 0; i < cnt; i++) {
        const kind = kinds[Math.floor(rnd() * kinds.length)];
        const inset = layer * 0.07;
        const x = x0 + (rnd() - 0.5) * (w - 0.1 - inset), z = z0 + (rnd() - 0.5) * (d - 0.1 - inset);
        items.push({ kind, design: D[kind], x, y: y + layer * 0.055, z, ry: rnd() * 6.28, rz: kind === 'brinjal' ? 0 : (rnd() - 0.5) * 0.4, s: 0.85 + rnd() * 0.3 });
      }
    }
  };
  heap(sabzi.left, sabzi.crateZ, 0.62, 0.42, 0.35, ['tomato']);
  heap(sabzi.left + 0.85, sabzi.crateZ, 0.62, 0.42, 0.35, ['onion', 'potato']);
  heap(sabzi.right - 0.35, sabzi.crateZ, 0.62, 0.42, 0.35, ['potato', 'brinjal', 'tomato']);
  for (let i = 0; i < 4; i++) items.push({ kind: 'greens', design: D.greens, x: sabzi.cx - 0.9 + i * 0.4, y: counterH + 0.08, z: counterZ + (i % 2) * 0.08, ry: 1.57 + (rnd() - 0.5) * 0.7, s: 0.9 + rnd() * 0.2 });
  heap(sabzi.cx + 0.9, counterZ, 0.5, 0.35, counterH + 0.08, ['tomato', 'onion']);
  // manihari: bangle stacks of three colours on the three rods (rod x offsets match bazaar.js)
  const cols = [D.bangleRed, D.bangleBlue, D.bangleGreen];
  for (let rod = 0; rod < 3; rod++) {
    const rx = bangle.cx - 1.3 + rod * 1.3;
    for (let i = 0; i < 40; i++) items.push({ kind: 'bangle', design: cols[(rod + Math.floor(i / 9)) % 3], x: rx, y: 1.08 + i * 0.019, z: bangle.rodZ, ry: rnd() * 6, s: 1 });
  }
  return items;
}

/** Halwai (HALWAI_CENTER frame, x/z offsets as authored in tools/blender/build_halwai.py): mithai on the three display-cabinet tiers and the frying jalebi and samosa in the two kadhais. */
export function halwaiGoods(world) {
  const items = [];
  let n = 0;
  const rnd = () => { n++; return ((Math.sin(n * 53.3) + 1) * 0.5 * 9973) % 1; };
  const D = DESIGN;
  const tx = 1.7;
  [0.55, 0.98, 1.38].forEach((hh, k) => {
    for (let i = 0; i < 3; i++) {
      const z = -1.75 + 0.28 + i * 0.47;
      const y = hh + 0.045;
      const mode = (i + k) % 3;
      const count = mode === 1 ? 9 : 11;
      for (let j = 0; j < count; j++) {
        const ring = j < 7 ? 0.11 : j < 10 ? 0.055 : 0;
        const a = (j < 7 ? j / 7 : (j - 7) / 3 + 0.4) * Math.PI * 2 + rnd() * 0.3;
        const px = tx + ring * Math.cos(a), pz = z + ring * Math.sin(a);
        const lift = j >= 7 ? (mode === 1 ? 0.026 : 0.05) : 0;
        if (mode === 0) items.push({ kind: j % 2 ? 'laddoo' : 'gulab', design: j % 2 ? D.laddoo : D.gulab, x: px, y: y + lift, z: pz, ry: rnd() * 6, s: 0.92 + rnd() * 0.16 });
        else if (mode === 1) items.push({ kind: 'barfi', design: D.barfi, x: px, y: y + lift, z: pz, ry: a + rnd() * 0.3, s: 0.95 + rnd() * 0.1 });
        else items.push({ kind: 'jalebi', design: D.jalebi, x: px, y: y + lift * 0.4, z: pz, ry: rnd() * 6, s: 0.9 + rnd() * 0.3 });
      }
    }
  });
  const kx = -1.755;
  for (let i = 0; i < 9; i++) { const a = i * 0.7, r = i ? 0.17 : 0; items.push({ kind: 'jalebi', design: D.jalebi, x: kx + r * Math.cos(a), y: 1.435, z: -1.15 + r * Math.sin(a), ry: rnd() * 6, s: 2.1 + (i % 3) * 0.4 }); }
  for (let i = 0; i < 8; i++) { const a = i * 0.8, r = i ? 0.2 : 0; items.push({ kind: 'samosa', design: D.samosa, x: kx + r * Math.cos(a), y: 1.425 + (i % 2) * 0.02, z: 1.15 + r * Math.sin(a), ry: rnd() * 6, rz: (rnd() - 0.5) * 0.4, s: 1.5 + rnd() * 0.25 }); }
  return buildGoodsMesh(items, world, 'halwai_stock');
}

/** Ration shop stock, shop-local frame (origin = block centre, counter window +z, counter top y 0.9, z = d/2+0.15 = 1.65): salt, tea, soap, hair-oil and syrup bottles on the counter and along a flank rack. */
export function rationGoods(world, w = 3.6, d = 3, counterTopY = 0.9) {
  const items = [];
  let n = 0;
  const rnd = () => { n++; return ((Math.sin(n * 61.3) + 1) * 0.5 * 9973) % 1; };
  const D = DESIGN;
  const cz = d / 2 + 0.2;
  const half = (w - 1) / 2 - 0.15;
  // counter front row: salt and tea packs standing, soap bars stacked, oil bottles; the scale and ledger sit at x -0.7 / 0.45
  let x = -half;
  while (x < half) {
    if (Math.abs(x + 0.7) < 0.4 || Math.abs(x - 0.45) < 0.25) { x += 0.12; continue; }
    const roll = rnd();
    const z = cz + 0.1 + rnd() * 0.05, ry = (rnd() - 0.5) * 0.4;
    if (roll < 0.35) { items.push({ kind: 'salt', design: D.salt, x, y: counterTopY, z, ry }); x += 0.12; }
    else if (roll < 0.65) { items.push({ kind: 'tea', design: D.tea, x, y: counterTopY, z, ry }); x += 0.13; }
    else if (roll < 0.85) { for (let k = 0; k < 3; k++) items.push({ kind: 'soap', design: [D.soapGreen, D.soapPink, D.soapBlue][Math.floor(rnd() * 3)], x: x + 0.04, y: counterTopY + k * 0.052, z, ry: (rnd() - 0.5) * 0.3 }); x += 0.14; }
    else { items.push({ kind: 'bottle', design: [D.hairOil, D.syrup][Math.floor(rnd() * 2)], x, y: counterTopY, z, ry: rnd() * 6, s: 1.1 }); x += 0.1; }
  }
  // a second, taller row of stacked packs against the back of the counter ledge
  for (let i = 0; i < 12; i++) items.push({ kind: i % 3 ? 'salt' : 'tea', design: i % 3 ? D.salt : D.tea, x: -half + i * 0.2 + (rnd() - 0.5) * 0.04, y: counterTopY + 0.17, z: cz - 0.02, ry: (rnd() - 0.5) * 0.3, rx: -0.05 });
  // flank crate of oil bottles and syrup, right of the sacks
  const fx = -(w / 2 + 0.45);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) items.push({ kind: 'bottle', design: (i + j) % 2 ? D.hairOil : D.syrup, x: fx - 0.12 + i * 0.12, y: 0.3, z: d / 2 - 0.65 + j * 0.13, ry: i * 1.9 + j, s: 1.1 });
  return buildGoodsMesh(items, world, 'ration_stock');
}
