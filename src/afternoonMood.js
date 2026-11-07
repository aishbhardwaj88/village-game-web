import * as THREE from 'three';
import { Effect, EffectAttribute } from 'postprocessing';
import { pt } from './anchors.js';

// VILLAGE_VOCABULARY section 7 (afternoon mood). Anchored to the school anchor so it follows a map change.
//  - heat haze: fog density breathes a few percent on slow sines (no colour write, dayline/night own the colour)
//  - drifting kites and crows: ONE THREE.Points (1 draw call) circling high over the village centre
// Not wired until main.js calls it. Returns { update(dt, t), dispose() }; self-drives on rAF if update is not called.
export function createAfternoonMood(scene, opts = {}) {
  const c = opts.center || pt('school');
  const N = 16;
  const pos = new Float32Array(N * 3);
  const orbit = [];
  for (let i = 0; i < N; i++) {
    const kite = i < 5;
    orbit.push({
      r: kite ? 30 + i * 9 : 45 + (i % 6) * 14,
      h: kite ? 38 + i * 3 : 24 + (i % 5) * 4,
      w: (kite ? 0.05 : 0.11) * (i % 2 ? 1 : -1),
      p: i * 2.4, wob: 0.6 + (i % 4) * 0.2,
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 16;
  const cx = cv.getContext('2d');
  const gr = cx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 16, 16);
  const mat = new THREE.PointsMaterial({ size: 1.6, map: new THREE.CanvasTexture(cv), color: 0x2a2420, transparent: true,
    opacity: 0.85, depthWrite: false, sizeAttenuation: true, fog: true });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  scene.add(pts);

  const baseDensity = scene.fog ? scene.fog.density : 0;
  let last = performance.now() / 1000, raf = 0, external = false;
  function update(dt, t) {
    external = true;
    const a = g.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const o = orbit[i], ang = o.p + t * o.w;
      a[i * 3] = c.x + Math.cos(ang) * o.r;
      a[i * 3 + 1] = o.h + Math.sin(t * o.wob + o.p) * 1.5;
      a[i * 3 + 2] = c.z + Math.sin(ang) * o.r * 0.7;
    }
    g.attributes.position.needsUpdate = true;
    if (scene.fog && scene.fog.density !== undefined) {
      scene.fog.density = baseDensity * (1 + 0.04 * Math.sin(t * 0.35) + 0.02 * Math.sin(t * 1.1 + 1.7));
    }
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    const t = performance.now() / 1000; update(t - last, t); last = t; external = false;
  }
  update(0, last); external = false;
  raf = requestAnimationFrame(loop);
  return { update, dispose() { cancelAnimationFrame(raf); scene.remove(pts); g.dispose(); mat.dispose(); if (scene.fog) scene.fog.density = baseDensity; } };
}

// VILLAGE_VOCABULARY s7 "haze": heat shimmer over the far ground. A UV-only effect merged INTO the
// existing single EffectPass (postfx.js), so it costs zero draw calls and no extra pass; the only
// new GPU work is the composer's depth blit, which gates the wobble to distant surfaces (60 m+) in a
// band around the horizon, so near people and walls never ripple and the sky dome (depth 1) is left
// alone. Amplitude is ~1-2 px at 1080p: felt more than seen. Fades with night and late dusk via getStrength().
// Call again after any composer rebuild (main.js setQuality). Skip on touch (caller decides).
export function addHeatShimmer(composer, camera, getStrength = () => 1) {
  const pass = composer.passes.find((p) => p.name === 'EffectPass');
  if (!pass) return null;
  const frag = /* glsl */`
uniform float strength;
uniform float horizonY;
void mainUv(inout vec2 uv) {
  if (strength <= 0.001) return;
  float band = 1.0 - smoothstep(0.0, 0.14, abs(uv.y - (horizonY - 0.03)));
  if (band <= 0.0) return;
  float d = readDepth(uv);
  if (d >= 0.9999) return;
  float dist = -getViewZ(d);
  float a = strength * band * smoothstep(60.0, 170.0, dist);
  if (a <= 0.0) return;
  float w = 0.6 * sin(uv.y * 820.0 + time * 6.3) + 0.4 * sin(uv.y * 1530.0 - time * 9.7 + uv.x * 37.0);
  uv.x += w * a * 0.0011;
  uv.y += sin(uv.x * 540.0 + uv.y * 310.0 + time * 4.1) * a * 0.0005;
}`;
  const fx = new Effect('HeatShimmerEffect', frag, {
    attributes: EffectAttribute.DEPTH,
    uniforms: new Map([['strength', new THREE.Uniform(0)], ['horizonY', new THREE.Uniform(0.5)]]),
  });
  const v = new THREE.Vector3(), f = new THREE.Vector3();
  fx.update = () => {
    camera.getWorldDirection(f); f.y = 0;
    if (f.lengthSq() < 1e-6) { fx.uniforms.get('strength').value = 0; return; }
    f.normalize();
    v.copy(camera.position).addScaledVector(f, 400).project(camera);
    fx.uniforms.get('horizonY').value = v.y * 0.5 + 0.5;
    let s = 1; try { s = getStrength(); } catch (e) { s = 0; }
    fx.uniforms.get('strength').value = Math.max(0, Math.min(1, s));
  };
  // Re-add the pass so the composer sees it now needs depth (creates the depth texture, wires every pass).
  const idx = composer.passes.indexOf(pass);
  composer.removePass(pass);
  pass.setEffects([...pass.effects, fx]);
  composer.addPass(pass, idx);
  return fx;
}
