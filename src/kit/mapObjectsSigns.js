import * as THREE from 'three';
import { drawBilingual, hiFont, enFont } from '../signPaint.js';

/**
 * The painted faces of the map objects layer, ONE canvas, one material, one draw call:
 *   gate front  'अमराई खेड़ा में आपका स्वागत है' / 'Welcome to Amrai Khera'   (faces the highway)
 *   gate back   'धन्यवाद, फिर पधारें' / 'Thank you, visit again'
 *   notice      'ग्राम पंचायत सूचना पट्ट' / 'Gram Panchayat notice board' header + pinned papers
 * Signboard rule (25 Oct): Hindi bold on top and larger, English below, not bold, 60-70% of the Hindi cap height,
 * both in the same dark paint. The village name follows the flag island's name stone ('Amrai Khera').
 */
const W = 1024, H = 1024;
export const SIGN_RECTS = { gateFront: [0, 0, 1024, 200], gateBack: [0, 210, 1024, 200], notice: [0, 420, 600, 404] };

export function makeSignTexture() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const paint = () => {
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    // gate boards: sun-faded cream enamel paint on steel, maroon border, the letters in deep maroon
    for (const [k, hi, en] of [['gateFront', 'अमराई खेड़ा में आपका स्वागत है', 'Welcome to Amrai Khera'], ['gateBack', 'धन्यवाद, फिर पधारें', 'Thank you, visit again']]) {
      const [x, y, w, h] = SIGN_RECTS[k];
      g.fillStyle = '#ece2c6'; g.fillRect(x, y, w, h);
      grain(g, x, y, w, h, 1);
      g.strokeStyle = '#7a2a22'; g.lineWidth = 10; g.strokeRect(x + 10, y + 10, w - 20, h - 20);
      g.lineWidth = 3; g.strokeRect(x + 24, y + 24, w - 48, h - 48);
      drawBilingual(g, hi, en, { x: x + w / 2, y: y + 30, w: w - 90, h: h - 60, fg: '#5a1e18', fillFraction: 0.9 });
      rustStreaks(g, x, y, w, h, 2);
    }
    // notice board: header panel, then papers pinned on the board (lines suggest handwriting, never real notices)
    const [nx, ny, nw, nh] = SIGN_RECTS.notice;
    g.fillStyle = '#4e6a5a'; g.fillRect(nx, ny, nw, nh); grain(g, nx, ny, nw, nh, 3);
    g.fillStyle = '#efe6c8'; g.fillRect(nx + 14, ny + 12, nw - 28, 112);
    drawBilingual(g, 'ग्राम पंचायत सूचना पट्ट', 'Gram Panchayat notice board', { x: nx + nw / 2, y: ny + 16, w: nw - 60, h: 104, fg: '#1e2a48', fillFraction: 0.92 });
    const papers = [[30, 140, 150, 200, '#f4f0e4', 'सूचना'], [196, 150, 170, 120, '#f6f1d8', 'Notice'], [384, 136, 180, 230, '#eef0f2', 'सूचना'], [200, 286, 160, 104, '#f2e6c8', '']];
    papers.forEach(([px, py, pw, ph, c, head], i) => {
      g.save(); g.translate(nx + px + pw / 2, ny + py + ph / 2); g.rotate((i % 2 ? 1 : -1) * 0.03 * (i + 1));
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-pw / 2 + 4, -ph / 2 + 5, pw, ph);
      g.fillStyle = c; g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.fillStyle = '#2a2a3a';
      if (head) { g.font = head === 'Notice' ? enFont(22) : hiFont(24); g.textAlign = 'center'; g.fillText(head, 0, -ph / 2 + 30); }
      for (let l = 0, yy = -ph / 2 + 48; yy < ph / 2 - 12; l++, yy += 13) { g.fillStyle = 'rgba(40,40,60,0.55)'; g.fillRect(-pw / 2 + 12, yy, (pw - 24) * (0.55 + 0.45 * ((l * 37 + i * 11) % 10) / 10), 3); }
      g.fillStyle = '#b0302a'; g.beginPath(); g.arc(0, -ph / 2 + 8, 5, 0, Math.PI * 2); g.fill();
      g.restore();
    });
    rustStreaks(g, nx, ny, nw, nh, 5);
    tex.needsUpdate = true;
  };
  paint();
  if (typeof document !== 'undefined' && document.fonts) document.fonts.load('700 40px "Noto Sans Devanagari"').then(paint, paint);
  return tex;
}
function grain(g, x, y, w, h, seed) {
  for (let i = 0; i < 1400; i++) {
    const a = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453, r = a - Math.floor(a);
    const b = Math.sin(i * 4.1 + seed) * 9301.7, s = b - Math.floor(b);
    g.fillStyle = i % 3 ? 'rgba(80,60,40,0.05)' : 'rgba(255,250,235,0.06)';
    g.fillRect(x + r * w, y + s * h, 2 + (i % 6), 1 + (i % 3));
  }
}
function rustStreaks(g, x, y, w, h, seed) {
  for (let i = 0; i < 9; i++) {
    const a = Math.sin(i * 7.7 + seed * 3.1) * 999.1, r = a - Math.floor(a);
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, 'rgba(120,70,30,0.18)'); grd.addColorStop(1, 'rgba(120,70,30,0)');
    g.fillStyle = grd; g.fillRect(x + r * w, y, 3 + (i % 4) * 2, h * (0.3 + 0.5 * r));
  }
}

/** A flat quad (width along local x, height along y, facing +z) mapped to a canvas rect, transformed by `matrix`. */
export function signQuad(rect, w, h, matrix) {
  const [x, y, rw, rh] = rect;
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * rw) / W, 1 - (y + (1 - uv.getY(i)) * rh) / H);
  g.applyMatrix4(matrix);
  return g;
}

export function signMaterial(tex) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.05 });
  m.name = 's7_mapobjects_signs';
  return m;
}
