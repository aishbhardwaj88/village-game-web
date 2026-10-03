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
    vWorldPosition = worldPosition.xyz;
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
    float sunDot = max(dot(dir, normalize(sunDirection)), 0.0);
    float sunDisc = pow(sunDot, 800.0) * 2.2;
    float sunGlow = pow(sunDot, 24.0) * 0.3;
    sky += sunColor * (sunDisc + sunGlow);

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
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'sky';
  mesh.renderOrder = -1;
  mesh.matrixAutoUpdate = false; // stays centred on the origin, never moves/rotates
  return mesh;
}

/** Call once per frame (main.js) so the dust/haze veil drifts almost imperceptibly —
 * real elapsed seconds, not frame count, so it's framerate-independent. */
export function updateSky(sky, elapsedSeconds) {
  if (sky.material.uniforms?.time) sky.material.uniforms.time.value = elapsedSeconds;
}
