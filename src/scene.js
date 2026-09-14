import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { getTiledMaterial, ensureUv2 } from './materials.js';

export const GROUND_SIZE = 480; // metres — big enough for the hero zone + field + track
const GROUND_TILE_METRES = 5; // real-world metres per ground texture tile

export function createScene() {
  const scene = new THREE.Scene();
  return scene;
}

export function loadTexture(loader, url, { srgb = false, repeat = 1 } = {}) {
  const tex = loader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGround() {
  const repeat = GROUND_SIZE / GROUND_TILE_METRES;
  const geometry = ensureUv2(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 1, 1));
  const material = getTiledMaterial('ground', { repeatX: repeat, repeatY: repeat, roughness: 1.0 });
  material.aoMapIntensity = 0.8;

  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  return ground;
}

export function createSun() {
  // Warm ~4500K sun at 20 degrees elevation.
  const sun = new THREE.DirectionalLight(0xfff1d6, 3.2);
  const elevationDeg = 20;
  const elevationRad = THREE.MathUtils.degToRad(elevationDeg);
  const distance = 80;
  sun.position.set(
    Math.cos(elevationRad) * distance,
    Math.sin(elevationRad) * distance,
    Math.cos(elevationRad) * distance * 0.4
  );
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  const shadowExtent = 60;
  sun.shadow.camera.left = -shadowExtent;
  sun.shadow.camera.right = shadowExtent;
  sun.shadow.camera.top = shadowExtent;
  sun.shadow.camera.bottom = -shadowExtent;
  sun.shadow.bias = -0.0015;
  sun.shadow.normalBias = 0.02;
  return sun;
}

export async function loadEnvironment(renderer, scene, hdriUrl) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const hdrTexture = await new HDRLoader().loadAsync(hdriUrl);
  const envMap = pmrem.fromEquirectangular(hdrTexture).texture;

  // Lighting/IBL only — the visible sky is the gradient dome in sky.js. A foreign hilly
  // HDRI as scene.background read wrong for flat Amrai Khera and looked pixelated at
  // the horizon. See docs/parked.md.
  scene.environment = envMap;
  // camdeboo_road's sun disk is extremely hot (~80,000x middle grey — see docs/parked.md
  // from the sky-swap decision); at full IBL intensity its specular reflection blows
  // flat, favourably-angled walls to solid white. 0.45 keeps soft ambient fill/bounce
  // light without that hotspot.
  scene.environmentIntensity = 0.45;

  hdrTexture.dispose();
  pmrem.dispose();

  return envMap;
}

export function applyFog(scene, horizonColorHex) {
  // Matches sky.js's SKY_HORIZON_COLOR so the ground fades into the sky with no seam.
  scene.fog = new THREE.FogExp2(horizonColorHex, 0.0085);
}
