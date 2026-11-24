/**
 * Hand-painted sign on the pilot thela (tea cart), 25 Nov 2026. The cart model carries no lettering of its own, so a thin
 * board is hung flat on the canopy fascia, both long sides. Painted-board rule (CLAUDE.md section 7), through
 * src/signPaint.js drawBilingual: Hindi bold and larger on line 1, English smaller but legible on line 2, same dark paint
 * on a pale limewashed board. Called from src/pilotVehicles.js after the thela is scaled and placed.
 */
import * as THREE from 'three';
import { drawBilingual, clearSignLayoutCache } from './signPaint.js';

const HI = 'राम चाय वाला';
const EN = 'Ram chai wala';
const W = 1024, H = 232; // 4.4 : 1, the shape of the canopy fascia

async function paintTexture() {
  try { await document.fonts.load('700 60px "Noto Sans Devanagari"'); await document.fonts.ready; } catch { /* system font */ }
  clearSignLayoutCache();
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#e4dcc8'; // limewashed board, never pure white
  ctx.fillRect(0, 0, W, H);
  let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(120,104,80,${0.03 + r() * 0.05})`; ctx.fillRect(r() * W, r() * H, 20 + r() * 90, 1 + r() * 3); }
  ctx.strokeStyle = 'rgba(52,48,42,0.85)'; ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  drawBilingual(ctx, HI, EN, { x: W / 2, y: 20, w: W - 56, h: H - 40, fg: '#2c2924', fillFraction: 0.96, gapFraction: 0.08 });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * holder: the thela's holder group with the scaled model already inside, and holder still at identity (call before it is
 * positioned and rotated), so its Box3 is in holder space. Adds two sign planes on the +z and -z canopy faces.
 */
export async function addThelaSign(holder) {
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const tex = await paintTexture();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 });
  const bw = box.max.x - box.min.x, bh = box.max.y - box.min.y;
  const w = bw * 0.72, h = w * H / W;
  const y = box.max.y - bh * 0.115; // centre of the canopy fascia (the canopy is the top ~22 percent of the cart)
  const cx = (box.max.x + box.min.x) / 2, cz = (box.max.z + box.min.z) / 2, half = (box.max.z - box.min.z) / 2;
  for (const side of [1, -1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.name = 'thela_sign';
    m.position.set(cx, y, cz + side * (half + 0.012));
    if (side < 0) m.rotation.y = Math.PI;
    m.castShadow = false; m.receiveShadow = true;
    holder.add(m);
  }
}
