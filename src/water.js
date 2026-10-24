import * as THREE from 'three';

/**
 * Shared village water (playtest block item 7). One material recipe for pond, johad, canal and the tubewell hauz:
 *   - depth tint: shallow olive-brown at the shore, deep murky green-brown in the middle (per-vertex `depth` 0..1, or a constant),
 *   - movement: two slowly drifting ripple layers perturb the normal in the fragment shader (shared `uTime`, ticked by updateWater),
 *   - reflection: low roughness + scene.environment (the HDRI feeds the env map) gives a fresnel sheen,
 *   - soft shoreline: alpha fades to 0 at the shore so the wet mud ring shows through, no hard sticker edge.
 * Cheap: no extra texture, no extra pass; one draw call per water body, same as before.
 */
const uTime = { value: 0 };
export function updateWater(t) { uTime.value = t; }

/**
 * @param {object} o
 * @param {number} [o.shallow] shore colour, @param {number} [o.deep] centre colour
 * @param {number} [o.depth] constant depth 0..1 when the geometry carries no `depth` attribute
 * @param {number} [o.scale] ripple scale (higher = finer)
 */
export function createWaterMaterial({ shallow = 0x7b7a4a, deep = 0x3e4a32, depth = null, scale = 1.0, opacity = 0.93, roughness = 0.14 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness, metalness: 0.0, transparent: true, envMapIntensity: 1.6 });
  mat.name = 'village_water';
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uShallow = { value: new THREE.Color(shallow) };
    shader.uniforms.uDeep = { value: new THREE.Color(deep) };
    shader.uniforms.uRippleScale = { value: scale };
    shader.uniforms.uOpacity = { value: opacity };
    shader.uniforms.uConstDepth = { value: depth === null ? -1 : depth };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float depth;\nvarying float vDepth;\nvarying vec2 vWaterXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDepth = depth;\nvWaterXZ = (modelMatrix * vec4(position, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform vec3 uShallow; uniform vec3 uDeep; uniform float uRippleScale; uniform float uOpacity; uniform float uConstDepth;
varying float vDepth; varying vec2 vWaterXZ;
float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y); }
float wHeight(vec2 p) { return wNoise(p * 1.7 + vec2(uTime * 0.18, uTime * 0.11)) * 0.6 + wNoise(p * 3.9 - vec2(uTime * 0.23, -uTime * 0.17)) * 0.4; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float d = uConstDepth >= 0.0 ? uConstDepth : clamp(vDepth, 0.0, 1.0);
diffuseColor.rgb = mix(uShallow, uDeep, smoothstep(0.0, 0.85, d));
diffuseColor.a = uOpacity * (uConstDepth >= 0.0 ? 1.0 : smoothstep(0.0, 0.28, d));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec2 wp = vWaterXZ * uRippleScale;
  float e = 0.06;
  float h0 = wHeight(wp);
  float hx = wHeight(wp + vec2(e, 0.0));
  float hz = wHeight(wp + vec2(0.0, e));
  vec3 rn = normalize(vec3(-(hx - h0) * 1.6, 1.0, -(hz - h0) * 1.6)); // world-space ripple normal (water surface faces +Y)
  normal = normalize(mix(normal, normalize((viewMatrix * vec4(rn, 0.0)).xyz), 0.85));
  // sky reflection: grazing view tints toward hazy afternoon sky, plus a faint broken glitter on the ripple crests
  float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.40, 0.45, 0.44), fres * 0.30);
  float crest = smoothstep(0.62, 0.78, wHeight(wp * 2.3 + 7.0));
  diffuseColor.rgb += vec3(0.06, 0.055, 0.04) * crest * (0.4 + 0.6 * fres);
}`);
  };
  mat.customProgramCacheKey = () => `village_water2_${shallow}_${deep}_${scale}_${opacity}_${depth}`;
  return mat;
}

/**
 * Irregular blob water surface as a polar grid (centre + rings) so every vertex carries a `depth` (1 centre, 0 at the shore).
 * Same outline formula as farmSites.js blobShape so it matches the mud ring around it. Lies flat at y.
 */
export function blobWaterGeometry(radius, seed, y, rings = 7, segs = 32) {
  const pos = [], dep = [], idx = [];
  pos.push(0, y, 0); dep.push(1);
  for (let r = 1; r <= rings; r++) {
    const f = r / rings;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const edge = radius * (1 + 0.16 * Math.sin(a * 2 + seed) + 0.09 * Math.sin(a * 3 + seed * 2.3) + 0.05 * Math.sin(a * 5 + seed * 0.7));
      pos.push(Math.cos(a) * edge * f, y, Math.sin(a) * edge * f);
      dep.push(Math.pow(1 - f, 0.8)); // shelves off gently
    }
  }
  for (let i = 0; i < segs; i++) idx.push(0, 1 + ((i + 1) % segs), 1 + i); // up-facing winding
  for (let r = 1; r < rings; r++) {
    const a0 = 1 + (r - 1) * segs, b0 = 1 + r * segs;
    for (let i = 0; i < segs; i++) {
      const i1 = (i + 1) % segs;
      idx.push(a0 + i, a0 + i1, b0 + i, a0 + i1, b0 + i1, b0 + i);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('depth', new THREE.Float32BufferAttribute(dep, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Straight channel (canal): width w along x, length l along z-less plane lying flat; depth 1 on the centre line, 0 at both banks. */
export function channelWaterGeometry(length, width, y, across = 8) {
  const g = new THREE.PlaneGeometry(length, width, 1, across);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  const p = g.attributes.position, dep = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) dep[i] = Math.pow(1 - Math.min(1, Math.abs(p.getZ(i)) / (width / 2)), 0.6);
  g.setAttribute('depth', new THREE.BufferAttribute(dep, 1));
  return g;
}
