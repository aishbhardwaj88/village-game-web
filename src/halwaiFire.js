import * as THREE from 'three';

/**
 * Live fire at the halwai's two bhattis: flame tongues licking up the kadhai sides, a lazy wood-smoke column and
 * thin oil steam. One THREE.Points object = one draw call, decorative only (no collision). `sources` = [{ x, y, z }]
 * world positions of each kadhai's centre at rim height. Per-particle size/alpha/colour are attributes so flame,
 * smoke and steam share the one draw call.
 */
const FLAME = 12;
const SMOKE = 6;
const STEAM = 5;

export function createHalwaiFire(sources) {
  const per = FLAME + SMOKE + STEAM;
  const n = sources.length * per;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const alpha = new Float32Array(n);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uScale: { value: 500 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
      uniform float uScale; varying vec3 vC; varying float vA;
      void main() {
        vC = aColor; vA = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / max(0.5, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = exp(-d * d * 6.0) * (1.0 - smoothstep(0.8, 1.0, d)) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vC, a);
      }`,
  });
  material.onBeforeRender = (renderer) => { material.uniforms.uScale.value = renderer.domElement.height * 0.5; };

  const points = new THREE.Points(geometry, material);
  points.name = 'halwai_fire';
  points.frustumCulled = false;

  const rnd = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
  let t = 0;

  function update(dt) {
    t += dt;
    for (let s = 0; s < sources.length; s++) {
      const o = sources[s];
      for (let i = 0; i < per; i++) {
        const k = s * per + i;
        const seed = k + 1;
        let x, y, z, sz, a, r, g, b;
        if (i < FLAME) {
          // flame tongue: rises ~0.28 m from the kadhai's lower side, flickers, shrinks and goes red-orange to dark
          const speed = 1.6 + rnd(seed, 1) * 1.2;
          const life = (t * speed + rnd(seed, 2)) % 1;
          const ang = rnd(seed, 3) * 6.283 + Math.sin(t * 3 + seed) * 0.25;
          const rad = 0.47 + 0.04 * Math.sin(t * 9 + seed * 2);
          x = o.x + Math.cos(ang) * rad;
          z = o.z + Math.sin(ang) * rad;
          y = o.y - 0.25 + life * 0.32;
          sz = 0.3 * (1 - life * 0.5) * (0.85 + 0.3 * Math.sin(t * 14 + seed));
          a = (1 - life) * 1.0;
          r = 1.0; g = 0.78 - life * 0.5; b = 0.2 - life * 0.15;
        } else if (i < FLAME + SMOKE) {
          // wood smoke: slow, widening, drifts with a faint breeze, fades out ~2.4 m up
          const j = i - FLAME;
          const life = (t * 0.16 + j / SMOKE + rnd(seed, 4) * 0.1) % 1;
          x = o.x + Math.sin(t * 0.5 + j * 1.9) * 0.1 * life + life * 0.35;
          z = o.z + Math.cos(t * 0.4 + j * 2.3) * 0.1 * life;
          y = o.y - 0.1 + life * 2.5;
          sz = 0.3 + life * 0.9;
          a = Math.sin(life * Math.PI) * 0.16;
          r = 0.45; g = 0.45; b = 0.47;
        } else {
          // oil steam: thin white wisps just over the rim
          const j = i - FLAME - SMOKE;
          const life = (t * 0.45 + j / STEAM + rnd(seed, 5) * 0.1) % 1;
          x = o.x + Math.sin(t * 0.9 + j * 1.7) * 0.16 * (0.3 + life);
          z = o.z + Math.cos(t * 0.8 + j * 2.1) * 0.16 * (0.3 + life);
          y = o.y + 0.08 + life * 0.8;
          sz = 0.2 + life * 0.3;
          a = Math.sin(life * Math.PI) * 0.22;
          r = 0.95; g = 0.95; b = 0.93;
        }
        pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
        col[k * 3] = r; col[k * 3 + 1] = g; col[k * 3 + 2] = b;
        size[k] = sz; alpha[k] = a;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  }
  update(0);
  return { points, update };
}
