import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Shop signboards (queue item 10) — Devanagari larger on top, English smaller
 * beneath, generated as a canvas texture in code (so the spelling is exactly what the
 * reference images say, no image download). Both shops' signs share ONE canvas/
 * texture/mesh — a texture atlas, not one draw call per board — because the draw-call
 * budget had almost no headroom left after item 9 (see docs/parked.md). Only the tea
 * stall and general store get boards; the halwai has no documented name to put on one
 * (see docs/parked.md).
 */

const ATLAS_W = 1024;
const ATLAS_H = 512;

function drawSign(ctx, x, w, hi, en) {
  const cx = x + w / 2;
  ctx.fillStyle = '#2a2018';
  ctx.font = '700 64px "Noto Sans Devanagari", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hi, cx, ATLAS_H * 0.4);
  ctx.font = '600 34px -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(en, cx, ATLAS_H * 0.72);
}

async function buildAtlasTexture(teaHi, teaEn, storeHi, storeEn) {
  await document.fonts.load('700 64px "Noto Sans Devanagari"');
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#e8dcc4';
  ctx.fillRect(0, 0, ATLAS_W, ATLAS_H);
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, ATLAS_W / 2 - 6, ATLAS_H - 6);
  ctx.strokeRect(ATLAS_W / 2 + 3, 3, ATLAS_W / 2 - 6, ATLAS_H - 6);

  drawSign(ctx, 0, ATLAS_W / 2, teaHi, teaEn);
  drawSign(ctx, ATLAS_W / 2, ATLAS_W / 2, storeHi, storeEn);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Remaps a unit-cube BoxGeometry's UVs into one half (left/right) of the atlas —
 * only the +Z (front, visible) face needs the real atlas region; the rest can keep
 * whatever UV they already have, since they're edges/back nobody sees closely. */
function mapFrontFaceToAtlasHalf(geometry, half) {
  const uv = geometry.attributes.uv;
  const uMin = half === 'left' ? 0.02 : 0.52;
  const uMax = half === 'left' ? 0.48 : 0.98;
  const groups = geometry.groups; // BoxGeometry: [+X,-X,+Y,-Y,+Z,-Z]
  const frontGroup = groups[4];
  const touched = new Uint8Array(uv.count);
  for (let i = frontGroup.start; i < frontGroup.start + frontGroup.count; i++) {
    // The front face's 2 triangles share vertices via the index buffer — guard so a
    // shared vertex isn't remapped twice (which would double-transform its U value).
    const vi = geometry.index.array[i];
    if (touched[vi]) continue;
    touched[vi] = 1;
    const u = uv.getX(vi); // 0..1 within the front face already
    uv.setXY(vi, uMin + u * (uMax - uMin), uv.getY(vi));
  }
  uv.needsUpdate = true;
}

/**
 * Builds both shops' signboards as one merged mesh sharing one atlas texture. `tea`/
 * `store` are `{ position, rotationY, width, postTopY, depth }` describing where each
 * board sits (matching the dimensions in src/shops.js).
 */
export async function buildSignboards(tea, store) {
  const texture = await buildAtlasTexture(tea.hi, tea.en, store.hi, store.en);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });

  const teaGeo = new THREE.BoxGeometry(tea.width, 0.5, 0.04);
  mapFrontFaceToAtlasHalf(teaGeo, 'left');
  const teaLocal = new THREE.Matrix4().makeTranslation(0, tea.boardY, tea.depth / 2 - 0.06);
  const teaWorld = new THREE.Matrix4().makeRotationY(tea.rotationY).setPosition(tea.position.x, 0, tea.position.z);
  teaGeo.applyMatrix4(teaLocal).applyMatrix4(teaWorld);

  const storeGeo = new THREE.BoxGeometry(store.width, 0.55, 0.04);
  mapFrontFaceToAtlasHalf(storeGeo, 'right');
  const storeLocal = new THREE.Matrix4().makeTranslation(0, store.boardY, store.depth / 2 + 0.06);
  const storeWorld = new THREE.Matrix4().makeRotationY(store.rotationY).setPosition(store.position.x, 0, store.position.z);
  storeGeo.applyMatrix4(storeLocal).applyMatrix4(storeWorld);

  const mesh = new THREE.Mesh(mergeGeometries([teaGeo, storeGeo]), material);
  mesh.castShadow = true;
  mesh.name = 'shop_signboards';
  return mesh;
}
