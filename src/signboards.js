import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Shop signboards — Devanagari larger on top, English smaller beneath (the one
 * painted-board exception to CLAUDE.md's language order), generated as canvas
 * textures in code so the spelling is exactly what the reference images say.
 *
 * Art review 1/2 (2026-10-21): the boards were blurred/faded/illegible. Root cause: each
 * board was a SQUARE 512x512 atlas cell stretched over a ~4.4:1 wide board, squashing the
 * text 4x vertically. Fix, shared by every Blender-building board (tea stall, general
 * store, post office, ration shop, atta chakki): a WIDE cell (CELL_W x CELL_H, ~4.4:1,
 * matching the board), bold high-contrast text auto-fitted to the cell width, one atlas
 * per call (one draw call), anisotropy 8.
 */

export const SIGN_CELL_W = 1024;
export const SIGN_CELL_H = 232;

/** entries: [{ hi, en, bg?, fg?, border? }] -> { texture, rows }. One row per board, stacked vertically. */
export async function buildWideSignAtlas(entries) {
  await document.fonts.load('700 100px "Noto Sans Devanagari"');
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = SIGN_CELL_W;
  canvas.height = SIGN_CELL_H * entries.length;
  const ctx = canvas.getContext('2d');
  entries.forEach((e, row) => {
    const y = row * SIGN_CELL_H;
    ctx.fillStyle = e.bg || '#efe3c8';
    ctx.fillRect(0, y, SIGN_CELL_W, SIGN_CELL_H);
    ctx.strokeStyle = e.border || '#7a2a1a';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, y + 8, SIGN_CELL_W - 16, SIGN_CELL_H - 16);
    ctx.fillStyle = e.fg || '#b3201a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fit = (text, font, maxPx, startPx) => {
      let px = startPx;
      ctx.font = font(px);
      while (ctx.measureText(text).width > maxPx && px > 20) { px -= 4; ctx.font = font(px); }
    };
    fit(e.hi, (px) => `700 ${px}px "Noto Sans Devanagari", sans-serif`, SIGN_CELL_W - 90, 118);
    ctx.fillText(e.hi, SIGN_CELL_W / 2, y + SIGN_CELL_H * 0.40);
    ctx.fillStyle = e.fgEn || '#2a1a12';
    fit(e.en, (px) => `700 ${px}px -apple-system, "Segoe UI", Helvetica, sans-serif`, SIGN_CELL_W - 90, 62);
    ctx.fillText(e.en, SIGN_CELL_W / 2, y + SIGN_CELL_H * 0.78);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return { texture, rows: entries.length };
}

/** Maps a BoxGeometry's +Z (front) face onto atlas row `row` of `rows`, filling the whole cell. */
export function mapFrontFaceToRow(geometry, row, rows) {
  const uv = geometry.attributes.uv;
  const front = geometry.groups[4]; // BoxGeometry groups: [+X,-X,+Y,-Y,+Z,-Z]
  const v0 = 1 - (row + 1) / rows;
  const v1 = 1 - row / rows;
  const touched = new Uint8Array(uv.count);
  for (let i = front.start; i < front.start + front.count; i++) {
    const vi = geometry.index.array[i];
    if (touched[vi]) continue;
    touched[vi] = 1;
    uv.setXY(vi, uv.getX(vi), v0 + uv.getY(vi) * (v1 - v0));
  }
  uv.needsUpdate = true;
}

/**
 * Builds both shops' signboards as one merged mesh sharing one atlas texture. `tea`/
 * `store` are `{ position, rotationY, width, postTopY, depth }` describing where each
 * board sits (matching the dimensions in src/shops.js).
 */
export async function buildSignboards(tea, store) {
  const { texture, rows } = await buildWideSignAtlas([
    { hi: tea.hi, en: tea.en, bg: '#f0e4c6', fg: '#b3201a' },
    { hi: store.hi, en: store.en, bg: '#f0e4c6', fg: '#b3201a' },
  ]);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  material.name = 'signboard'; // world-validator (check 2) — wall/roof-mounted fixtures are correctly elevated above y=0 by design; named so that exclusion is precise, not a guess at merged-bucket identity

  const teaGeo = new THREE.BoxGeometry(tea.width, 0.5, 0.04);
  mapFrontFaceToRow(teaGeo, 0, rows);
  const teaLocal = new THREE.Matrix4().makeTranslation(0, tea.boardY, tea.depth / 2 - 0.06);
  const teaWorld = new THREE.Matrix4().makeRotationY(tea.rotationY).setPosition(tea.position.x, 0, tea.position.z);
  teaGeo.applyMatrix4(teaLocal).applyMatrix4(teaWorld);

  const storeGeo = new THREE.BoxGeometry(store.width, 0.55, 0.04);
  mapFrontFaceToRow(storeGeo, 1, rows);
  const storeLocal = new THREE.Matrix4().makeTranslation(0, store.boardY, store.depth / 2 + 0.06);
  const storeWorld = new THREE.Matrix4().makeRotationY(store.rotationY).setPosition(store.position.x, 0, store.position.z);
  storeGeo.applyMatrix4(storeLocal).applyMatrix4(storeWorld);

  const mesh = new THREE.Mesh(mergeGeometries([teaGeo, storeGeo]), material);
  mesh.castShadow = true;
  mesh.name = 'shop_signboards';
  return mesh;
}
