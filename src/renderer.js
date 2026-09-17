import * as THREE from 'three';

const MAX_PIXEL_RATIO = 1.5;
// Phone perf pass (queue item 5): touch devices cap lower — 1.5x on a high-DPI phone
// GPU is a lot more pixels to shade than the same ratio on a desktop dGPU. Recorded
// alongside the other mobile settings in docs/look-standard.md.
const MAX_PIXEL_RATIO_TOUCH = 1.0;

function maxPixelRatioFor(isTouch) {
  return isTouch ? MAX_PIXEL_RATIO_TOUCH : MAX_PIXEL_RATIO;
}

export function createRenderer(canvas, isTouch = false) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatioFor(isTouch)));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // Colour: the difference between real and flat.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // 1.0 blew the horizon/sun-glow out to flat clipped white in review screenshots.
  // 0.8 keeps the sky holding its blue/amber gradient and the sun glow bright without
  // clipping. See docs/look-standard.md / docs/parked.md.
  renderer.toneMappingExposure = 0.55;

  renderer.shadowMap.enabled = true;
  // three.js r186 removed PCFSoftShadowMap (silently falls back to PCFShadowMap with a
  // console warning) — use PCFShadowMap directly. See docs/parked.md.
  renderer.shadowMap.type = THREE.PCFShadowMap;

  return renderer;
}

export function resizeRendererToDisplaySize(renderer, camera, isTouch = false) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatioFor(isTouch)));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
