import * as THREE from 'three';

// Item 6 (queue) — fine dust motes drifting near the ground, denser on the lane and
// field, absent indoors. One THREE.Points draw call for the whole field (GPU-native
// screen-facing sprites, no per-instance billboard shader needed), texture generated
// on a canvas (no download), positions confined to a handful of outdoor "zones" —
// building interiors are never inside a zone, so "absent indoors" holds by
// construction rather than needing a runtime indoor/outdoor check.

function generateDustTexture(size = 32) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,248,228,0.95)');
  grad.addColorStop(0.45, 'rgba(255,240,210,0.45)');
  grad.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Same small linear-congruential PRNG src/trees.js uses for its field-row jitter —
// stable between rebuilds, no external dependency.
function makePrng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * zones: mix of two shapes —
 *  - rectangle: { cx, cz, halfW, halfD, count, minY?, maxY? }, an axis-aligned patch
 *    (used for the open field, which has no buildings inside it to avoid).
 *  - segment: { a, b, halfWidth, count, inset?, minY?, maxY? }, a strip following the
 *    line from a to b with lateral jitter (used for the lane and track loop) — `inset`
 *    (0-0.5, default 0.12) keeps sampled points away from the segment's own endpoints,
 *    which are building centers (house/halwai/school), so dust never clusters into a
 *    doorway or wall.
 * Denser lane/field coverage is just a bigger `count`; leaving building interiors out
 * of every zone/inset is what keeps them dust-free, no runtime indoor check needed.
 */
export function buildDust(zones, seed = 41) {
  const totalCount = zones.reduce((sum, z) => sum + z.count, 0);
  const basePositions = new Float32Array(totalCount * 3);
  const phases = new Float32Array(totalCount);
  const swayAmounts = new Float32Array(totalCount);
  const driftSpeeds = new Float32Array(totalCount);
  const riseSpeeds = new Float32Array(totalCount);
  const riseCycles = new Float32Array(totalCount);
  const minYs = new Float32Array(totalCount);

  const rand = makePrng(seed);
  let idx = 0;
  for (const zone of zones) {
    const minY = zone.minY ?? 0.1;
    const maxY = zone.maxY ?? 1.4;
    for (let i = 0; i < zone.count; i++) {
      let x, z;
      if (zone.a && zone.b) {
        const inset = zone.inset ?? 0.12;
        const t = inset + rand() * (1 - inset * 2);
        const dx = zone.b.x - zone.a.x;
        const dz = zone.b.z - zone.a.z;
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len; // perpendicular unit vector, for lateral jitter
        const nz = dx / len;
        const lateral = (rand() - 0.5) * zone.halfWidth * 2;
        x = zone.a.x + dx * t + nx * lateral;
        z = zone.a.z + dz * t + nz * lateral;
      } else {
        x = zone.cx + (rand() - 0.5) * zone.halfW * 2;
        z = zone.cz + (rand() - 0.5) * zone.halfD * 2;
      }
      const y = minY + rand() * (maxY - minY);
      basePositions[idx * 3] = x;
      basePositions[idx * 3 + 1] = y;
      basePositions[idx * 3 + 2] = z;
      phases[idx] = rand() * Math.PI * 2;
      swayAmounts[idx] = 0.3 + rand() * 0.5;
      driftSpeeds[idx] = 0.15 + rand() * 0.2;
      riseSpeeds[idx] = 0.03 + rand() * 0.05;
      riseCycles[idx] = maxY - minY;
      minYs[idx] = minY;
      idx++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(basePositions.slice(), 3);
  positionAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positionAttr);

  const material = new THREE.PointsMaterial({
    map: generateDustTexture(),
    size: 0.16,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'dust_motes';
  // Spread across the whole outdoor area — a single auto-computed bounding sphere
  // would either over-cull (motes near the player vanish because far-zone motes pull
  // the sphere's center away) or force a per-frame recompute; frustum culling one
  // subtle, cheap Points object isn't worth either cost.
  points.frustumCulled = false;

  function update(dt, elapsedTime) {
    const arr = positionAttr.array;
    for (let i = 0; i < totalCount; i++) {
      const t = elapsedTime * driftSpeeds[i] + phases[i];
      arr[i * 3] = basePositions[i * 3] + Math.sin(t) * swayAmounts[i];
      arr[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(t * 0.8) * swayAmounts[i];
      const cycle = riseCycles[i] || 1;
      arr[i * 3 + 1] = minYs[i] + ((elapsedTime * riseSpeeds[i] + phases[i] * 0.3) % cycle);
    }
    positionAttr.needsUpdate = true;
  }

  return { points, update };
}
