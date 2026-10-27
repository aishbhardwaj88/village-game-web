import * as THREE from 'three';

// Flat North Indian farmland (Amrai Khera) — no hills, no mountains, no HDRI landscape
// in the visible background. The HDRI stays for lighting only (scene.environment / IBL);
// the sky you actually see is this gradient dome + a soft sun glow toward the light
// direction. Colours come from src/atmosphere.js's active preset, shared with fog (see
// applyFog in scene.js) so the ground fades into the same horizon tone instead of a
// visible seam.
const SKY_RADIUS = 400;

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = position; // direction from the dome centre (the dome follows the camera, so world position is meaningless)
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 horizonColor;
  uniform vec3 hazeColor;
  uniform vec3 zenithColor;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform vec3 dustColor;
  uniform float dustStrength;
  uniform float time;
  uniform float nightMix;
  varying vec3 vWorldPosition;

  // Cheap screen-space hash for dithering — breaks up the 8-bit banding a smooth
  // gradient over a large area shows (visible as flat colour steps), without adding
  // visible noise of its own. See docs/parked.md.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Cheap 2D value noise (direction-space, not screen-space) for a slow-drifting
  // dust/haze veil — thin bleached streaks, not puffy cumulus, to match "hot, hazy,
  // slightly bleached" rather than a default-engine cloud layer.
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec3 dir = normalize(vWorldPosition);

    // Real structure instead of a single 2-stop blend: horizon -> a hazy bleached
    // mid-band -> a deeper zenith blue. The mid-band sits low (full strength by
    // ~0.12 of the horizon->zenith span) so the "bleached near the horizon" read
    // dominates the lower sky, same as a real hazy afternoon, while the zenith still
    // holds real blue depth overhead.
    float hLow = smoothstep(-0.02, 0.1, dir.y);
    float hHigh = smoothstep(0.08, 0.32, dir.y);
    vec3 sky = mix(horizonColor, hazeColor, hLow);
    sky = mix(sky, zenithColor, hHigh);

    // Slow dust/haze drift — two octaves of direction-space value noise, sampled
    // mostly across the lower sky (fades out toward the zenith via skyMask) so it
    // reads as a thin heat-haze veil near the horizon, not a cloud layer floating
    // overhead. time drifts it very slowly — barely perceptible frame to frame,
    // just enough that the sky isn't a static-looking texture.
    float skyMask = 1.0 - smoothstep(0.0, 0.5, dir.y);
    vec2 cloudUv = dir.xz / max(0.05, (dir.y + 0.15)) * 0.35 + vec2(time * 0.0015, time * 0.0009);
    float n1 = valueNoise(cloudUv);
    float n2 = valueNoise(cloudUv * 2.3 + 11.0);
    float dust = (n1 * 0.65 + n2 * 0.35);
    dust = smoothstep(0.35, 0.75, dust) * skyMask;
    sky = mix(sky, dustColor, dust * dustStrength);

    // The glow term (wide, gentle falloff) was the main cause of a large clipped-white
    // halo around the sun rather than a warm bright glow — pulled back alongside the
    // disc itself. See docs/parked.md.
    float sunDot = max(dot(dir, normalize(sunDirection)), 1e-4); // never exactly 0: pow(0.0, y) renders as a black patch on some GL implementations
    float sunDisc = pow(sunDot, 800.0) * 2.2;
    float sunGlow = pow(sunDot, 24.0) * 0.3;
    sky += sunColor * (sunDisc + sunGlow);

    // Night: stars on a direction-space grid (twinkle with time), faded near the horizon haze.
    if (nightMix > 0.01) {
      vec3 sd = dir * 140.0;
      vec3 cell = floor(sd);
      float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      vec3 local = fract(sd) - 0.5;
      float star = step(0.985, h) * smoothstep(0.32, 0.0, length(local));
      star *= 0.6 + 0.4 * sin(time * 2.0 + h * 80.0);
      sky += vec3(0.85, 0.9, 1.0) * star * smoothstep(0.06, 0.4, dir.y) * nightMix;
    }

    float dither = (hash(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);
    sky += dither;

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export function createSky(sunDirection, preset) {
  const geometry = new THREE.SphereGeometry(SKY_RADIUS, 32, 16);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      horizonColor: { value: preset.skyHorizonColor.clone() },
      hazeColor: { value: preset.skyHazeColor.clone() },
      zenithColor: { value: preset.skyZenithColor.clone() },
      sunDirection: { value: sunDirection.clone().normalize() },
      sunColor: { value: preset.sunColor.clone() },
      dustColor: { value: preset.dustColor.clone() },
      dustStrength: { value: preset.dustStrength },
      time: { value: 0 },
      nightMix: { value: 0 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'sky';
  mesh.renderOrder = -1;
  mesh.matrixAutoUpdate = false; // never rotates; updateSky() re-centres it on the camera every frame
  mesh.frustumCulled = false;
  return mesh;
}

/** Call once per frame (main.js) so the dust/haze veil drifts almost imperceptibly —
 * real elapsed seconds, not frame count, so it's framerate-independent. */
export function updateSky(sky, elapsedSeconds, camera) {
  // Centred on the camera: a dome fixed at the origin ran past the camera far plane (500) from the far east
  // (x 205 looking west: 605 m away), clipping to a black dome in the sky.
  if (camera) { sky.position.copy(camera.position); sky.updateMatrix(); sky.updateMatrixWorld(true); }
  if (sky.material.uniforms?.time) sky.material.uniforms.time.value = elapsedSeconds;
}
