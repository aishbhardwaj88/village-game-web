import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Drying laundry: real garments with distinct silhouettes (sari, dhoti, kurta, salwar, dupatta, shirt,
 * trousers, child's frock, towel, bedsheet, gamcha) folded over a sagging rope, with cloth pegs.
 * One shared material for every clothesline in the village: a woven-cotton atlas (colour + normal
 * generated on a canvas at load, so nothing is downloaded) and a vertex-shader breeze where the hem
 * moves more than the top and every garment is out of phase. No per-frame CPU work.
 */

// ---- fabric atlas: 4 x 2 cells of 256 px; cell row 0 is the top of the canvas --------------------------
const CELL = 256;
const FABRICS = [
  { base: '#b3262a', border: '#d9a93a', motif: '#e8c872', kind: 'dots' },        // 0 red sari with gold border
  { base: '#ece6d6', border: '#8a97ad', motif: '#cfc8b6', kind: 'plain' },       // 1 cream cotton, thin blue-grey border
  { base: '#3f7a52', border: '#e9e1c8', motif: '#e9e1c8', kind: 'check' },       // 2 green check gamcha
  { base: '#d79a26', border: '#8c2f1f', motif: '#8c2f1f', kind: 'blocks' },      // 3 mustard block-print dupatta
  { base: '#2c3f78', border: '#c9cfe0', motif: '#aab4d0', kind: 'stripes' },     // 4 indigo stripes
  { base: '#d8708f', border: '#f1e2b8', motif: '#f1e2b8', kind: 'dots' },        // 5 pink with border
  { base: '#7aa6a3', border: '#f0ead6', motif: '#f3efe0', kind: 'floral' },      // 6 faded teal floral bedsheet
  { base: '#8a3a2e', border: '#e9d9b0', motif: '#e9d9b0', kind: 'stripes' },     // 7 maroon striped towel
];

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; };
}

function drawFabric(ctx, f, ox, oy, r) {
  ctx.fillStyle = f.base; ctx.fillRect(ox, oy, CELL, CELL);
  ctx.fillStyle = f.motif; ctx.strokeStyle = f.motif;
  if (f.kind === 'dots') {
    for (let i = 0; i < 160; i++) { ctx.globalAlpha = 0.5 + r() * 0.4; ctx.beginPath(); ctx.arc(ox + r() * CELL, oy + r() * (CELL - 50), 0.9 + r() * 1.3, 0, 7); ctx.fill(); }
  } else if (f.kind === 'check') {
    ctx.globalAlpha = 0.55; ctx.lineWidth = 5;
    for (let x = 0; x < CELL; x += 32) { ctx.beginPath(); ctx.moveTo(ox + x, oy); ctx.lineTo(ox + x, oy + CELL); ctx.stroke(); }
    for (let y = 0; y < CELL; y += 32) { ctx.beginPath(); ctx.moveTo(ox, oy + y); ctx.lineTo(ox + CELL, oy + y); ctx.stroke(); }
  } else if (f.kind === 'stripes') {
    ctx.globalAlpha = 0.5;
    for (let x = 6; x < CELL; x += 26 + Math.floor(r() * 10)) ctx.fillRect(ox + x, oy, 3 + r() * 3, CELL);
  } else if (f.kind === 'blocks') {
    ctx.globalAlpha = 0.7;
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 6; gx++) {
      const cx = ox + 22 + gx * 42 + (gy % 2) * 21, cy = oy + 18 + gy * 38;
      ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 8, cy); ctx.closePath(); ctx.fill();
    }
  } else if (f.kind === 'floral') {
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < 22; i++) {
      const cx = ox + r() * CELL, cy = oy + r() * (CELL - 50);
      for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(cx + Math.cos(p * 1.256) * 7, cy + Math.sin(p * 1.256) * 7, 5, 0, 7); ctx.fill(); }
    }
  } else if (f.kind === 'plain') {
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 90; i++) ctx.fillRect(ox + r() * CELL, oy + r() * CELL, 1 + r() * 18, 1);
  }
  ctx.globalAlpha = 1;
  // hem border along the bottom of the cell (a hanging garment's lower edge is v = cell bottom)
  ctx.fillStyle = f.border; ctx.fillRect(ox, oy + CELL - 34, CELL, 20);
  ctx.fillStyle = f.base; ctx.fillRect(ox, oy + CELL - 12, CELL, 12);
  ctx.fillStyle = f.border; ctx.globalAlpha = 0.6; ctx.fillRect(ox, oy + CELL - 8, CELL, 3); ctx.globalAlpha = 1;
  // sun fade: wash toward pale, stronger on the upper half that sits in the sun
  const grad = ctx.createLinearGradient(0, oy, 0, oy + CELL);
  grad.addColorStop(0, 'rgba(255,248,230,0.22)'); grad.addColorStop(1, 'rgba(255,248,230,0.04)');
  ctx.fillStyle = grad; ctx.fillRect(ox, oy, CELL, CELL);
}

function makeAtlas() {
  const W = CELL * 4, H = CELL * 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  FABRICS.forEach((f, i) => drawFabric(ctx, f, (i % 4) * CELL, Math.floor(i / 4) * CELL, rng(i + 11)));
  // plain-weave threads: height field, baked lightly into colour and fully into the normal map
  const img = ctx.getImageData(0, 0, W, H);
  const hgt = new Float32Array(W * H);
  const nr = rng(5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const warp = Math.sin(x * Math.PI / 2), weft = Math.sin(y * Math.PI / 2);
    const h = 0.5 + 0.25 * warp * ((y >> 1) & 1 ? 1 : -1) + 0.25 * weft * ((x >> 1) & 1 ? 1 : -1) + (nr() - 0.5) * 0.12;
    hgt[y * W + x] = h;
    const k = 0.93 + h * 0.14, p = (y * W + x) * 4;
    img.data[p] *= k; img.data[p + 1] *= k; img.data[p + 2] *= k;
  }
  ctx.putImageData(img, 0, 0);
  const nc = document.createElement('canvas'); nc.width = W; nc.height = H;
  const nctx = nc.getContext('2d'); const nimg = nctx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = hgt[y * W + ((x + 1) % W)] - hgt[y * W + ((x + W - 1) % W)];
    const dy = hgt[((y + 1) % H) * W + x] - hgt[((y + H - 1) % H) * W + x];
    const p = (y * W + x) * 4;
    nimg.data[p] = 128 - dx * 150; nimg.data[p + 1] = 128 + dy * 150; nimg.data[p + 2] = 255; nimg.data[p + 3] = 255;
  }
  nctx.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const normalMap = new THREE.CanvasTexture(nc); normalMap.anisotropy = 4;
  return { map, normalMap };
}

let CLOTH_MATERIAL = null;
export function clothMaterial() {
  if (CLOTH_MATERIAL) return CLOTH_MATERIAL;
  const { map, normalMap } = makeAtlas();
  CLOTH_MATERIAL = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.93, metalness: 0, vertexColors: true, side: THREE.DoubleSide });
  CLOTH_MATERIAL.name = 'laundry_cloth';
  const uTime = { value: 0 };
  CLOTH_MATERIAL.onBeforeRender = () => { uTime.value = performance.now() / 1000; };
  CLOTH_MATERIAL.onBeforeCompile = (shader) => {
    shader.uniforms.uBreezeTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uBreezeTime;\nattribute vec2 aSway;')
      // aSway.x = metres below the rope, aSway.y = this garment's phase
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float hang = aSway.x;
          float gust = 0.55 + 0.45 * sin(uBreezeTime * 0.37 + aSway.y * 0.3);
          float sw = sin(uBreezeTime * 1.7 + aSway.y + hang * 2.2) * 0.045 + sin(uBreezeTime * 2.9 + aSway.y * 1.7 + position.x * 3.0) * 0.015;
          float amt = hang * hang * 0.55 * gust;
          transformed.z += sw * amt * 3.0;
          transformed.x += sin(uBreezeTime * 1.3 + aSway.y * 0.7) * 0.012 * hang * gust;
          transformed.y += abs(sw) * amt * 0.4;
        }`);
  };
  return CLOTH_MATERIAL;
}

// ---- garment catalogue ------------------------------------------------------------------------------
// parts: [t0, t1, xl(t), xr(t)] with t = 0 at the rope, 1 at the hem, x measured across the garment.
const rect = (w, t0 = 0, t1 = 1) => [t0, t1, () => -w / 2, () => w / 2];
const GARMENTS = {
  sari: { L: 1.7, cell: [0, 5], w: 1.15, pleat: [13, 0.035], parts: [rect(1.15)] },
  dhoti: { L: 1.25, cell: [1], w: 0.85, pleat: [7, 0.03], parts: [rect(0.85)] },
  kurta: { L: 0.95, cell: [1, 3, 5], w: 1.24, pleat: [8, 0.02], parts: [rect(0.54), [0, 0.5, (t) => -0.62 + t * 0.2, () => -0.27], [0, 0.5, () => 0.27, (t) => 0.62 - t * 0.2]] },
  salwar: { L: 1.1, cell: [5, 3, 0], w: 0.56, pleat: [9, 0.025], parts: [rect(0.56, 0, 0.28), [0.28, 1, (t) => -0.28 + (t - 0.28) * 0.08, () => -0.02], [0.28, 1, () => 0.02, (t) => 0.28 - (t - 0.28) * 0.08]] },
  dupatta: { L: 1.5, cell: [3, 5, 6], w: 0.55, pleat: [10, 0.03], parts: [rect(0.55)] },
  shirt: { L: 0.72, cell: [4, 2, 1], w: 0.95, pleat: [8, 0.02], parts: [rect(0.5), [0, 0.38, (t) => -0.47 + t * 0.12, () => -0.25], [0, 0.38, () => 0.25, (t) => 0.47 - t * 0.12]] },
  trousers: { L: 0.98, cell: [4, 7], w: 0.5, pleat: [9, 0.02], parts: [rect(0.5, 0, 0.22), [0.22, 1, () => -0.25, () => -0.015], [0.22, 1, () => 0.015, () => 0.25]] },
  frock: { L: 0.55, cell: [5, 3, 6], w: 0.7, pleat: [10, 0.02], parts: [[0, 1, (t) => -0.17 - t * 0.14, (t) => 0.17 + t * 0.14], [0, 0.3, (t) => -0.3 + t * 0.2, () => -0.15], [0, 0.3, () => 0.15, (t) => 0.3 - t * 0.2]] },
  towel: { L: 0.8, cell: [7, 2], w: 0.45, pleat: [5, 0.02], parts: [rect(0.45)] },
  bedsheet: { L: 1.25, cell: [6, 1], w: 1.5, pleat: [6, 0.04], parts: [rect(1.5)] },
  gamcha: { L: 0.95, cell: [2], w: 0.4, pleat: [6, 0.02], parts: [rect(0.4)] },
};
export const GARMENT_TYPES = Object.keys(GARMENTS);

/** One garment, hung from y=0 (the rope) with its front face toward +z. Returns an indexed BufferGeometry. */
function garmentGeometry(type, seed, tint, phase) {
  const spec = GARMENTS[type], r = rng(seed);
  const cell = spec.cell[Math.floor(r() * spec.cell.length)];
  const cu0 = ((cell % 4) * CELL + 3) / (CELL * 4), cu1 = (((cell % 4) + 1) * CELL - 3) / (CELL * 4);
  const row = Math.floor(cell / 4);
  const cv1 = 1 - (row * CELL + 3) / (CELL * 2), cv0 = 1 - ((row + 1) * CELL - 3) / (CELL * 2);
  const scale = 0.94 + r() * 0.12, L = spec.L * scale;
  const [k1, amp] = spec.pleat;
  const ph1 = r() * 6.28, ph2 = r() * 6.28, k2 = k1 * (1.7 + r() * 0.6);
  const hemPh = r() * 6.28, hemAmp = 0.025 + r() * 0.03;
  const layers = [{ zOff: 0.012, len: 1 }, { zOff: -0.022, len: 0.8 }]; // front layer and the shorter back layer folded over the rope
  const geos = [];
  const SX = 8, ST = 14;
  for (const layer of layers) {
    for (const [t0, t1, xl, xr] of spec.parts) {
      const t0e = t0, t1e = Math.min(t1, layer.len);
      if (t1e <= t0e) continue;
      const pos = [], uv = [], sway = [], col = [], idx = [];
      for (let j = 0; j <= ST; j++) {
        const t = t0e + (t1e - t0e) * (j / ST);
        const a = xl(t) * scale, b = xr(t) * scale;
        for (let i = 0; i <= SX; i++) {
          const fx = i / SX, x = a + (b - a) * fx;
          const hang = t * L;
          // wrinkles deepen toward the hem; hem line is uneven
          const wob = (Math.sin(x * k1 + ph1) + 0.5 * Math.sin(x * k2 + ph2)) * amp * (0.25 + t * 1.1);
          const hem = t > 0.85 ? Math.sin(x * 6 + hemPh) * hemAmp * (t - 0.85) / 0.15 : 0;
          // cloth bellies out a little under its own weight in the middle
          const belly = Math.sin(t * Math.PI) * 0.02;
          pos.push(x, -hang - hem, layer.zOff + wob + (layer.zOff > 0 ? belly : -belly * 0.5));
          uv.push(cu0 + (cu1 - cu0) * Math.min(1, Math.max(0, (x / scale) / spec.w + 0.5)), cv1 - (cv1 - cv0) * t);
          sway.push(hang, phase);
          const shade = tint * (0.93 + 0.1 * Math.sin(x * k1 * 0.5 + ph1) * (0.4 + t));
          col.push(shade, shade, shade);
        }
      }
      for (let j = 0; j < ST; j++) for (let i = 0; i < SX; i++) {
        const a = j * (SX + 1) + i, b = a + 1, c = a + SX + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      geos.push(g);
    }
  }
  // fold over the rope: a short arch joining the two layers
  const arch = new THREE.BufferGeometry();
  const aw = spec.w * scale * 0.5 * 0.98;
  const ap = [], au = [], asw = [], ac = [], ai = [];
  const archZ = [0.012, 0.022, 0.0, -0.022];
  const archY = [-0.004, 0.012, 0.022, -0.004];
  for (let k = 0; k < 4; k++) for (const x of [-aw, aw]) {
    ap.push(x, archY[k], archZ[k]); au.push(x < 0 ? cu0 : cu1, cv1); asw.push(0, phase); ac.push(tint, tint, tint);
  }
  for (let k = 0; k < 3; k++) { const a = k * 2; ai.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  arch.setAttribute('position', new THREE.Float32BufferAttribute(ap, 3));
  arch.setAttribute('uv', new THREE.Float32BufferAttribute(au, 2));
  arch.setAttribute('aSway', new THREE.Float32BufferAttribute(asw, 2));
  arch.setAttribute('color', new THREE.Float32BufferAttribute(ac, 3));
  arch.setIndex(ai); arch.computeVertexNormals();
  geos.push(arch);
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return merged;
}

const PEG_COLOURS = [0x7a5a3a, 0x8a6a45, 0xc4372f, 0x3a5aa6, 0x2f7d5b, 0xd8a22a];

/**
 * Plan a clothesline between two poles: sagging rope segments, garments sorted along it, pegs.
 * Returns { cloth: Mesh, rope: [{x0,y0,x1,y1}], pegs: [{x,y,z,c,r}] } in the caller's local space.
 */
export function buildClothesline({ span, ropeY, z0, seed, sag = 0.1, types = null }) {
  const r = rng(seed * 7 + 3);
  const ropeAt = (x) => ropeY - sag * (1 - Math.pow((2 * x) / span, 2));
  const slope = (x) => (ropeAt(x + 0.05) - ropeAt(x - 0.05)) / 0.1;
  const rope = [];
  const N = 10;
  for (let i = 0; i < N; i++) {
    const x0 = -span / 2 + (span * i) / N, x1 = -span / 2 + (span * (i + 1)) / N;
    rope.push({ x0, y0: ropeAt(x0), x1, y1: ropeAt(x1) });
  }
  const pool = types || ['sari', 'dhoti', 'kurta', 'salwar', 'dupatta', 'shirt', 'trousers', 'frock', 'towel', 'bedsheet', 'gamcha'];
  const geos = [], pegs = [];
  let cursor = -span / 2 + 0.2, last = '', n = 0;
  while (n < 9) {
    let type = pool[Math.floor(r() * pool.length)];
    if (type === last) type = pool[(pool.indexOf(type) + 1) % pool.length];
    const spec = GARMENTS[type];
    if (cursor + spec.w > span / 2 - 0.15) {
      // try something narrow to fill the rest, otherwise stop
      const small = ['towel', 'gamcha', 'dupatta'].find((t) => cursor + GARMENTS[t].w <= span / 2 - 0.15 && t !== last);
      if (!small) break;
      type = small;
    }
    const w = GARMENTS[type].w;
    const x = cursor + w / 2;
    const gGeo = garmentGeometry(type, seed * 100 + n * 13 + 1, 0.82 + r() * 0.2, r() * 6.28);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, ropeAt(x), z0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (r() - 0.5) * 0.28, Math.atan(slope(x)) * 0.95)),
      new THREE.Vector3(r() < 0.35 ? -1 : 1, 1, 1),
    );
    gGeo.applyMatrix4(m);
    geos.push(gGeo);
    for (const side of [-0.38, 0.38]) pegs.push({ x: x + side * w, y: ropeAt(x + side * w) - 0.015, z: z0 + 0.03, c: PEG_COLOURS[Math.floor(r() * PEG_COLOURS.length)], r: (r() - 0.5) * 0.3 });
    if (w > 0.8) pegs.push({ x: x + (r() - 0.5) * 0.1, y: ropeAt(x) - 0.015, z: z0 + 0.03, c: PEG_COLOURS[Math.floor(r() * PEG_COLOURS.length)], r: (r() - 0.5) * 0.3 });
    cursor += w + 0.02 + r() * 0.1;
    last = type; n++;
  }
  const cloth = new THREE.Mesh(mergeGeometries(geos), clothMaterial());
  geos.forEach((g) => g.dispose());
  cloth.name = 'laundry_cloth';
  cloth.castShadow = false; // keeps the shadow pass cheap; the garments are thin
  cloth.receiveShadow = true;
  cloth.frustumCulled = false; // vertex sway moves hems outside the rest-pose bounds
  return { cloth, rope, pegs, ropeAt };
}
