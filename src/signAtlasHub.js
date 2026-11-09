import * as THREE from 'three';

/**
 * One shared canvas texture and one material for every flat shop signboard (hero tea/store,
 * new shops, bazaar row + chowk). Each builder paints its own atlas as before, then copies it
 * into its fixed slot here and remaps its geometry UVs, so the merge step folds all the
 * boards into a single draw call (was four).
 */
const W = 2048;
const H = 2904;
const SLOTS = {
  bazaar: { x: 0, y: 0, w: 2048, h: 1280 },
  hero: { x: 0, y: 1280, w: 1024, h: 464 },
  donation: { x: 0, y: 1744, w: 1024, h: 520 },
  newShops: { x: 1024, y: 1280, w: 1024, h: 1624 },
};

let hub = null;
function getHub() {
  if (hub) return hub;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  material.name = 'signboard'; // world-validator (check 2) — wall/roof-mounted fixtures are elevated above y=0 by design
  hub = { canvas, ctx: canvas.getContext('2d'), texture, material };
  return hub;
}

/** Copies a finished source atlas texture into `slot`; returns { material, remap(geometry) }. */
export function addToSignHub(slot, sourceTexture) {
  const { ctx, texture, material } = getHub();
  const s = SLOTS[slot];
  const src = sourceTexture.image;
  if (src.width > s.w || src.height > s.h) throw new Error(`sign atlas "${slot}" (${src.width}x${src.height}) does not fit its slot ${s.w}x${s.h}`);
  ctx.drawImage(src, s.x, s.y);
  texture.needsUpdate = true;
  const sw = src.width, sh = src.height;
  const remap = (geometry) => {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (s.x + uv.getX(i) * sw) / W, 1 - (s.y + (1 - uv.getY(i)) * sh) / H);
    }
    uv.needsUpdate = true;
    return geometry;
  };
  sourceTexture.dispose();
  return { material, remap };
}

/**
 * Shared sign page for the code-built frontage / shop boards (arm frontage, main road, gully, chauraha, small shops, milk centre).
 * Each builder still paints its own wide atlas (createWideSignAtlas); this copies that atlas into one shared canvas (and again once
 * the fonts land and the source repaints), remaps the merged board geometry's UVs, and hands back ONE shared 'signboard' material,
 * so every such board shares one texture source and the placeBatch live batcher folds them into a single draw.
 * Falls back to a private material if a page is full. Two 1024-wide columns per page, strips stacked downward.
 */
const PAGE_W = 2048, PAGE_H = 3072, COL_W = 1024;
const pages = [];
function newPage() {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W; canvas.height = PAGE_H;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  material.name = 'signboard';
  const p = { canvas, ctx: canvas.getContext('2d'), texture, material, colY: [0, 0] };
  pages.push(p);
  return p;
}
export function signPageMaterial(atlas, geometry) {
  const src = atlas.texture.image, sw = src.width, sh = src.height;
  if (sw > COL_W || sh > PAGE_H) return Object.assign(new THREE.MeshStandardMaterial({ map: atlas.texture, roughness: 0.85 }), { name: 'signboard' });
  let page = null, col = 0;
  for (const p of pages) { col = p.colY[0] <= p.colY[1] ? 0 : 1; if (p.colY[col] + sh <= PAGE_H) { page = p; break; } }
  if (!page) { page = newPage(); col = 0; }
  const x = col * COL_W, y = page.colY[col];
  page.colY[col] += sh;
  const copy = () => { page.ctx.drawImage(src, x, y); page.texture.needsUpdate = true; };
  copy();
  if (atlas.ready && atlas.ready.then) atlas.ready.then(copy, copy);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * sw) / PAGE_W, 1 - (y + (1 - uv.getY(i)) * sh) / PAGE_H);
  uv.needsUpdate = true;
  return page.material;
}
