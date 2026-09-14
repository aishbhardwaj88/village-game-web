import * as THREE from 'three';

const MAX_PIXEL_RATIO = 1.5;

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // Colour: the difference between real and flat.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  renderer.shadowMap.enabled = true;
  // three.js r186 removed PCFSoftShadowMap (silently falls back to PCFShadowMap with a
  // console warning) — use PCFShadowMap directly. See docs/parked.md.
  renderer.shadowMap.type = THREE.PCFShadowMap;

  return renderer;
}

export function resizeRendererToDisplaySize(renderer, camera) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
