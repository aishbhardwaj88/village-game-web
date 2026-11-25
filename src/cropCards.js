import * as THREE from 'three';
import { loadRaw } from './materials.js';

/**
 * Crop tuft = three crossed vertical cards (6 triangles, down from 10) cut out by a procedural stalk-and-ear alpha mask and
 * shaded with the real CC0 ambientCG Grass001 colour + normal + roughness set already shipped in public/assets/textures/crop/
 * (no new file; poly haven / ambientCG downloads are blocked in this container). Hue comes from the per-instance colour, base-to-tip
 * darkening from vertex colour, and a cheap vertex-shader wind sway (per-instance phase, bends the top only) from one shared time uniform.
 */
const windTime = { value: 0 };
let _mask = null;

function stalkMask() {
  if (_mask) return _mask;
  const W = 128, H = 256;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const N = 11;
  for (let i = 0; i < N; i++) {
    const x0 = 10 + (i / (N - 1)) * (W - 20) + (rnd() - 0.5) * 6;
    const topX = x0 + (rnd() - 0.5) * 22, top = 6 + rnd() * 70, bend = (rnd() - 0.5) * 18;
    // tapered curved leaf blade from the base up to the stalk top
    g.beginPath();
    g.moveTo(x0 - 3.2, H);
    g.quadraticCurveTo(x0 + bend - 2, H * 0.55, topX, top + 34);
    g.quadraticCurveTo(x0 + bend + 2, H * 0.55, x0 + 3.2, H);
    g.closePath(); g.fill();
    // the ear: a spiky oval of grains at the stalk top (wheat head), some stalks short = leaf only
    if (i % 4 !== 3) {
      g.save(); g.translate(topX, top + 22); g.rotate((topX - x0) * 0.012);
      g.beginPath(); g.ellipse(0, -8, 4.6, 24, 0, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 7; k++) { g.fillRect(-7 + rnd() * 2, -26 + k * 6.5, 14 - rnd() * 2, 1.4); } // awns
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  _mask = t;
  return t;
}

export function cropTuftParts() {
  const pos = [], nor = [], uv = [], col = [], idx = [];
  const CARDS = 3, HALF_W = 0.34, HEIGHT = 1.0;
  for (let c = 0; c < CARDS; c++) {
    const a = (c / CARDS) * Math.PI + 0.35, ca = Math.cos(a), sa = Math.sin(a);
    const nx = -sa * 0.4, nz = ca * 0.4; // soft normal: mostly up, a little of the card's own facing, so cards never shade black edge-on
    const b = pos.length / 3;
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      pos.push(ca * HALF_W * (u * 2 - 1), v * HEIGHT, sa * HALF_W * (u * 2 - 1));
      const l = Math.hypot(nx, 0.9, nz); nor.push(nx / l, 0.9 / l, nz / l);
      uv.push(u, v);
      const k = 0.5 + 0.5 * v; col.push(k, k, k * 0.95);
    }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometry.setIndex(idx);
  const base = 'assets/textures/crop/crop_';
  const material = new THREE.MeshStandardMaterial({
    name: 'crop', vertexColors: true, side: THREE.DoubleSide,
    map: loadRaw(base + 'color.webp', true), normalMap: loadRaw(base + 'normal.webp', false), roughnessMap: loadRaw(base + 'roughness.webp', false),
    alphaMap: stalkMask(), alphaTest: 0.5, roughness: 1,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCropTime = windTime;
    shader.vertexShader = 'uniform float uCropTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
      vec2 ip = instanceMatrix[3].xz;
#else
      vec2 ip = vec2(0.0);
#endif
      float bend = position.y * position.y;
      float gust = sin(uCropTime * 1.5 + ip.x * 0.23 + ip.y * 0.17) + 0.5 * sin(uCropTime * 3.1 + ip.x * 0.9 + ip.y * 1.3);
      transformed.x += gust * 0.07 * bend;
      transformed.z += gust * 0.04 * bend;`);
  };
  material.customProgramCacheKey = () => 'cropcards-wind';
  return { geometry, material };
}

/** Drives the shared wind clock (one number per rendered mesh, no per-frame JS over instances). */
export function attachCropWind(mesh) {
  mesh.onBeforeRender = () => { windTime.value = performance.now() * 0.001; };
  return mesh;
}
