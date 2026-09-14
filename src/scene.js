import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

const GROUND_SIZE = 200; // metres
const GROUND_TEXTURE_REPEAT = 40; // 200m / 40 = 5m per texture tile

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
  const loader = new THREE.TextureLoader();
  const base = 'assets/textures/ground/';

  const map = loadTexture(loader, base + 'ground_color.jpg', { srgb: true, repeat: GROUND_TEXTURE_REPEAT });
  const normalMap = loadTexture(loader, base + 'ground_normal.jpg', { repeat: GROUND_TEXTURE_REPEAT });
  const roughnessMap = loadTexture(loader, base + 'ground_roughness.jpg', { repeat: GROUND_TEXTURE_REPEAT });
  const aoMap = loadTexture(loader, base + 'ground_ao.jpg', { repeat: GROUND_TEXTURE_REPEAT });

  const geometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 1, 1);
  // uv2 needed for aoMap
  geometry.setAttribute('uv2', geometry.attributes.uv);

  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap,
    aoMap,
    aoMapIntensity: 0.8,
    roughness: 1.0,
  });

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

  scene.environment = envMap;
  scene.background = envMap;
  scene.backgroundBlurriness = 0.02;

  hdrTexture.dispose();
  pmrem.dispose();

  return envMap;
}

export function applyFog(scene, horizonColorHex = 0xd98c53) {
  // Warm exponential fog matched to the golden-hour sky horizon colour.
  scene.fog = new THREE.FogExp2(horizonColorHex, 0.006);
}
