import * as THREE from 'three';

/**
 * Bugfix 3/4 — a soft, cheap, always-visible "contact shadow" directly under each
 * object's own footprint, independent of the sun's real (directional, single-sided)
 * cast shadow. Diagnosis (docs/parked.md has the full writeup): objects were never
 * actually floating above the terrain (checked programmatically — every placed
 * object's Y position is genuinely 0) and the ground has zero vertex displacement (a
 * flat 1x1 PlaneGeometry, nothing to "dip away"). The real cause is that the only
 * grounding cue in the scene was the sun's own shadow, which — at this sun's 20°
 * elevation — falls well off to one side of every object, not underneath it; a
 * top-down diagnostic render confirmed a real, correctly-offset shadow exists, but a
 * viewer positioned low and close (exactly the reported bug) is very often looking
 * from an angle where that one-sided shadow simply isn't in view. This adds a second,
 * omnidirectional cue that reads as "touching the ground" from any angle.
 *
 * One InstancedMesh for every contact shadow in the game — a canvas-generated soft
 * radial-gradient dark blob (no download), alpha-blended, sitting a hair above the
 * ground with a small negative polygon offset to avoid z-fighting instead of needing a
 * larger Y gap (which would itself look like a floating decal).
 */

function generateContactShadowTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.42)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quatIdentity = new THREE.Quaternion();

/**
 * `staticPlacements`: [{ x, z, radiusX, radiusZ? }] baked once, for anything that
 * never moves (buildings, props). `dynamicCount`: extra instance slots reserved for
 * movers (vehicles) — start hidden (off-scene, zero scale) until the first update().
 * Returns `{ mesh, update(dynamicEntries) }`; `dynamicEntries` must be the same
 * length/order every call.
 */
export function buildContactShadows(staticPlacements, dynamicCount = 0) {
  const total = staticPlacements.length + dynamicCount;
  const geometry = new THREE.CircleGeometry(1, 20);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    map: generateContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(total, 1));
  mesh.name = 'contact_shadows';
  // Spread across the whole map (buildings + roaming vehicles) — a single
  // auto-computed bounding sphere would over-cull the same way src/dust.js's does.
  mesh.frustumCulled = false;

  let i = 0;
  for (const p of staticPlacements) {
    _pos.set(p.x, 0.012, p.z);
    _scale.set(p.radiusX, 1, p.radiusZ ?? p.radiusX);
    _mat4.compose(_pos, _quatIdentity, _scale);
    mesh.setMatrixAt(i, _mat4);
    i++;
  }
  for (; i < total; i++) {
    _pos.set(0, -50, 0); // parked off-scene until update() places it
    _scale.set(0, 1, 0);
    _mat4.compose(_pos, _quatIdentity, _scale);
    mesh.setMatrixAt(i, _mat4);
  }
  mesh.instanceMatrix.needsUpdate = true;

  const dynamicStart = staticPlacements.length;
  function update(dynamicEntries) {
    for (let j = 0; j < dynamicEntries.length; j++) {
      const p = dynamicEntries[j];
      _pos.set(p.x, 0.012, p.z);
      _scale.set(p.radiusX, 1, p.radiusZ ?? p.radiusX);
      _mat4.compose(_pos, _quatIdentity, _scale);
      mesh.setMatrixAt(dynamicStart + j, _mat4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}
