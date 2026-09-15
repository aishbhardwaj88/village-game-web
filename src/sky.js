import * as THREE from 'three';

// Flat North Indian farmland (Amrai Khera) — no hills, no mountains, no HDRI landscape
// in the visible background. The HDRI stays for lighting only (scene.environment / IBL);
// the sky you actually see is this gradient dome + a soft sun glow toward the light
// direction. Colours are shared with fog (see applyFog in scene.js) so the ground fades
// into the same horizon tone instead of a visible seam.
export const SKY_HORIZON_COLOR = new THREE.Color(0xf6dcae); // warm pale near the ground
export const SKY_ZENITH_COLOR = new THREE.Color(0x3f6fa3); // deeper blue overhead

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
  uniform vec3 zenithColor;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  varying vec3 vWorldPosition;

  // Cheap screen-space hash for dithering — breaks up the 8-bit banding a smooth
  // gradient over a large area shows (visible as flat colour steps), without adding
  // visible noise of its own. See docs/parked.md.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 dir = normalize(vWorldPosition);
    // Tighter than before (was -0.05..0.45) — the sky reaches its full zenith blue by
    // ~13 degrees of elevation instead of ~26, so it holds colour instead of reading
    // as mostly the pale horizon tone. See docs/parked.md.
    float h = smoothstep(-0.02, 0.22, dir.y);
    vec3 sky = mix(horizonColor, zenithColor, h);

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

export function createSky(sunDirection) {
  const geometry = new THREE.SphereGeometry(SKY_RADIUS, 32, 16);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      horizonColor: { value: SKY_HORIZON_COLOR },
      zenithColor: { value: SKY_ZENITH_COLOR },
      sunDirection: { value: sunDirection.clone().normalize() },
      sunColor: { value: new THREE.Color(0xfff1d6) },
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
