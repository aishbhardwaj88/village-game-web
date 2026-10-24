import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Shop signboards — Hindi on the TOP line, smaller and lighter, English on the second line,
 * clearly larger and bolder (art director 2026-10-23/24, CLAUDE.md section 7: the English is
 * the line a player reads at walking distance), both lines in the same dark paint colour, generated as canvas
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

/**
 * entries: [{ hi, en, bg?, fg?, border? }] -> { texture, rows, ready }. One row per board, stacked vertically.
 * The canvas texture exists immediately and is painted as soon as the fonts are loaded (`ready` resolves then),
 * so synchronous zone builders can use it. `cellW`/`cellH` default to the 1024x232 hero boards; fonts scale with width.
 */
export function createWideSignAtlas(entries, { cellW = SIGN_CELL_W, cellH = SIGN_CELL_H } = {}) {
  const k = cellW / SIGN_CELL_W;
  const canvas = document.createElement('canvas');
  canvas.width = cellW;
  canvas.height = cellH * entries.length;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const paint = () => {
    entries.forEach((e, row) => {
      const y = row * cellH;
      ctx.fillStyle = e.bg || '#efe3c8';
      ctx.fillRect(0, y, cellW, cellH);
      ctx.strokeStyle = e.border || '#7a2a1a';
      ctx.lineWidth = 10 * k;
      ctx.strokeRect(8 * k, y + 8 * k, cellW - 16 * k, cellH - 16 * k);
      ctx.fillStyle = e.fg || '#6e1a12'; // one dark paint colour for both lines (maroon / near-black / deep blue), never grey
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fit = (text, font, maxPx, startPx) => {
        let px = startPx;
        ctx.font = font(px);
        while (ctx.measureText(text).width > maxPx && px > 12) { px -= 2; ctx.font = font(px); }
      };
      // Hindi: top, small, light weight (reads as painted texture). English: bigger and bolder, dominant.
      fit(e.hi, (px) => `500 ${px}px "Noto Sans Devanagari", sans-serif`, cellW - 140 * k, 56 * k);
      ctx.fillText(e.hi, cellW / 2, y + cellH * 0.25);
      fit(e.en, (px) => `900 ${px}px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`, cellW - 90 * k, 132 * k);
      ctx.fillText(e.en, cellW / 2, y + cellH * 0.64);
    });
    texture.needsUpdate = true;
  };
  paint(); // fallback fonts first, repainted with Noto once it is loaded
  const ready = Promise.all([document.fonts.load('500 40px "Noto Sans Devanagari"'), document.fonts.ready]).then(paint, paint);
  return { texture, rows: entries.length, ready };
}

/** entries: [{ hi, en, bg?, fg?, border? }] -> { texture, rows }. One row per board, stacked vertically. */
export async function buildWideSignAtlas(entries) {
  const atlas = createWideSignAtlas(entries);
  await atlas.ready;
  return { texture: atlas.texture, rows: atlas.rows };
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
    { hi: tea.hi, en: tea.en, bg: '#f0e4c6', fg: '#6e1a12' },
    { hi: store.hi, en: store.en, bg: '#f0e4c6', fg: '#6e1a12' },
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
