// Cheap body-colour variants for the slimmed vehicle models. Only the paint material is cloned
// (one per file+colour, shared by every copy); texture, glass, tyres, chrome stay shared.
// mode 'grey'  : material.color = hex, multiplied over a greyscale copy of the map (built once per file).
// mode 'paint' : single-atlas model; one 512px canvas per (file,hex) where only paint-hued pixels are
//                recoloured (luma * hex), tyres/rust/chrome pixels stay as painted.
// mode 'none'  : cannot be recoloured cleanly, applyVehicleColour returns the root untouched.
import * as THREE from 'three';

const TRACTOR = [0xb3261e, 0x1f3a6e, 0x2d5a34, 0xc2561a];
export const VEHICLE_PAINT = {
  'old_tractor.glb':  { material: 'old_tractor_body', mode: 'paint', hueMin: 340, hueMax: 30, satMin: 0.28, palette: TRACTOR },
  'bicycle.glb':      { material: 'frame', mode: 'grey', palette: [0x2f4a6b, 0x3d5a40, 0x6b2a26, 0x2b2b2e] },
  'moped.glb':        { material: 'moped_body', mode: 'grey', palette: [0x8a2c2a, 0x2e4a66, 0xb8b2a0, 0x3a5a48] },
  // atlas is rust/olive/grey with no clear paint island: no clean recolour
  'motorbike.glb':    { material: 'DefaultMaterial', mode: 'none', palette: [0x1f1f22, 0x7a2623, 0x2c4560, 0x3f4a3a] },
  'trailer_pack.glb': { material: 'farm_trailer_body', mode: 'grey', palette: [0xb3261e, 0x1f3a6e, 0x2d5a34, 0xb9732f, 0x6b4a2a] },
  // single atlas: whole cart tints (wood dominant, metal bands pick up a little tone)
  'thela_gadi.glb':   { material: 'lambert1', mode: 'grey', palette: [0x8a5a34, 0x6b4a2a, 0xa07a4c, 0x7a2f26] },
};

const greyCache = new Map(); // file -> { canvas, ctx, data (ImageData of source) }
const matCache = new Map();  // file|hex -> Material

function source(file, map) {
  let s = greyCache.get(file);
  if (s) return s;
  const img = map.image;
  const w = img.width, h = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  s = { w, h, src: ctx.getImageData(0, 0, w, h), grey: null };
  greyCache.set(file, s);
  return s;
}

function canvasTex(s, data, ref) {
  const c = document.createElement('canvas');
  c.width = s.w; c.height = s.h;
  c.getContext('2d').putImageData(data, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = ref.flipY; t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = ref.wrapS; t.wrapT = ref.wrapT; t.anisotropy = ref.anisotropy;
  return t;
}

function greyTexture(file, map) { // once per file, shared by every colour
  const s = source(file, map);
  if (!s.grey) {
    const d = new ImageData(new Uint8ClampedArray(s.src.data), s.w, s.h), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = l; }
    s.grey = canvasTex(s, d, map);
  }
  return s.grey;
}

function paintTexture(cfg, file, map, hex) {
  const s = source(file, map), d = new ImageData(new Uint8ClampedArray(s.src.data), s.w, s.h), p = d.data;
  const rr = (hex >> 16) & 255, gg = (hex >> 8) & 255, bb = hex & 255;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
    if (mx < 0.12 || dl / (mx || 1) < cfg.satMin) continue; // dark / unsaturated = tyre, chrome, rust-grey
    let h = dl === 0 ? 0 : mx === r ? ((g - b) / dl + 6) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
    h *= 60;
    if (!(h >= cfg.hueMin || h <= cfg.hueMax)) continue; // not the paint hue
    const l = Math.min(1.6, (0.299 * r + 0.587 * g + 0.114 * b) / 0.38); // 0.38 ~ mean luma of the red paint
    p[i] = Math.min(255, rr * l); p[i + 1] = Math.min(255, gg * l); p[i + 2] = Math.min(255, bb * l);
  }
  return canvasTex(s, d, map);
}

export function applyVehicleColour(root, file, hex) {
  const cfg = VEHICLE_PAINT[file];
  if (!cfg || cfg.mode === 'none' || typeof document === 'undefined') return root;
  const key = file + '|' + hex;
  let mat = matCache.get(key);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const out = list.map((m) => {
      if (!m || m.name !== cfg.material) return m; // glass, tyres, chrome etc stay shared
      if (!mat) {
        mat = m.clone(); mat.name = cfg.material + '_' + hex.toString(16);
        if (m.map && m.map.image) {
          if (cfg.mode === 'paint') { mat.map = paintTexture(cfg, file, m.map, hex); mat.color.setRGB(1, 1, 1); }
          else { mat.map = greyTexture(file, m.map); mat.color.setHex(hex); }
        } else mat.color.setHex(hex);
        mat.emissive && mat.emissive.setRGB(0, 0, 0);
        matCache.set(key, mat);
      }
      return mat;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  return root;
}
