import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { getTiledMaterial, ensureUv2, applyGroundNoiseDetail } from './materials.js';
import { getActiveAtmosphere } from './atmosphere.js';

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

export function createGround({ grassTint = null, grassCoverage = undefined, dampSpots = [] } = {}) {
  // The drawn plane is much larger than the playable extent (GROUND_SIZE) so the mandi/highway at x~230 never show the world's edge;
  // same tiling density, so the look near the village is unchanged.
  const drawn = GROUND_SIZE * 3.8; // reaches x 912: the staging yard (src/stagedPlaces.js) lies east of the village
  const repeat = drawn / GROUND_TILE_METRES;
  const geometry = ensureUv2(new THREE.PlaneGeometry(drawn, drawn, 1, 1));
  const material = getTiledMaterial('ground', { repeatX: repeat, repeatY: repeat, roughness: 1.0 });
  material.aoMapIntensity = 0.8;
  // Fix 4/4 (playtest pass) + item 3a (real playtest report — "the village reads
  // as desert") — grassTint/dampSpots are village-specific (real palette colour,
  // real hand-pump position), supplied by the caller (main.js) rather than
  // imported here, so this stays a generic renderer-setup module.
  const detailOpts = { grassTint, dampSpots, patchContrast: getActiveAtmosphere().groundContrastMultiplier };
  if (grassCoverage !== undefined) detailOpts.grassCoverage = grassCoverage;
  applyGroundNoiseDetail(material, detailOpts);

  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  return ground;
}

export function createSun(isTouch = false, preset) {
  // Mid-to-late-afternoon sun — angle/colour/intensity come from the active
  // src/atmosphere.js preset (see docs/look-standard.md for the chosen values and
  // why: high enough for short, hard shadows, warm-white rather than golden-hour
  // orange).
  const sun = new THREE.DirectionalLight(preset.sunColor.getHex(), preset.sunIntensity);
  const elevationDeg = preset.sunElevationDeg;
  const elevationRad = THREE.MathUtils.degToRad(elevationDeg);
  const distance = 80;
  sun.position.set(
    Math.cos(elevationRad) * distance,
    Math.sin(elevationRad) * distance,
    Math.cos(elevationRad) * distance * 0.4
  );
  sun.castShadow = true;
  // Phone perf pass (queue item 5): a 2048 shadow map over a 60m extent is a lot of
  // shadow-pass fill on a phone GPU — touch gets a smaller map over a tighter extent
  // (shadows still cover the hero zone the player actually stands in, just not the
  // full 60m). Recorded in docs/look-standard.md.
  const mapSize = isTouch ? 1024 : 2048;
  sun.shadow.mapSize.set(mapSize, mapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = isTouch ? 120 : 200;
  const shadowExtent = isTouch ? 38 : 60;
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

export function applyFog(scene, preset) {
  // A real haze colour/density from the active atmosphere preset — see
  // docs/look-standard.md. Lower density than the old flat 0.0085 (which pasted
  // everything past ~60-80m onto a uniform wash instead of a true distance fade) —
  // fogColor is deliberately NOT identical to the sky horizon colour in every preset
  // any more (slightly different, so the ground-to-sky transition isn't a dead seam,
  // while still reading as the same hazy air).
  scene.fog = new THREE.FogExp2(preset.fogColor.getHex(), preset.fogDensity);
}
