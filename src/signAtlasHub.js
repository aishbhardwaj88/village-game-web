import * as THREE from 'three';

/**
 * One shared canvas texture and one material for every flat shop signboard (hero tea/store,
 * new shops, bazaar row + chowk). Each builder paints its own atlas as before, then copies it
 * into its fixed slot here and remaps its geometry UVs, so the merge step folds all the
 * boards into a single draw call (was four).
 */
const W = 2048;
const H = 2440;
const SLOTS = {
  bazaar: { x: 0, y: 0, w: 2048, h: 1280 },
  hero: { x: 0, y: 1280, w: 1024, h: 464 },
  donation: { x: 0, y: 1744, w: 1024, h: 520 },
  newShops: { x: 1024, y: 1280, w: 1024, h: 1160 },
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
