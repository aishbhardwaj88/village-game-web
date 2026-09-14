import * as THREE from 'three';
import { getTiledMaterial, ensureUv2 } from './materials.js';

/** Smooth, low-amplitude pseudo-noise (no dependency) so bumps read as gentle
 * undulation — enough for a vehicle to feel, not jagged geometry. */
export function bumpHeight(u, v, seed) {
  return (
    Math.sin(u * 7.3 + seed) * 0.03 +
    Math.sin(v * 5.1 + seed * 1.7) * 0.03 +
    Math.sin((u + v) * 11.0 + seed * 0.6) * 0.015
  );
}

/**
 * A straight dirt strip (lane or track segment) between two points, with gentle baked
 * height bumps. Reused by src/village.js (the lane) and src/field.js (the field
 * track loop) so both use the same construction and the same ground texture set at a
 * different tint/tiling from the open ground.
 */
export function buildStripSegment(start, end, width, { seed = 0, tint = 0xb7a179 } = {}) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const segsAlong = Math.max(4, Math.round(length / 3));
  const segsAcross = 4;

  const geometry = new THREE.PlaneGeometry(width, length, segsAcross, segsAlong);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / width;
    const v = pos.getY(i) / length;
    pos.setZ(i, bumpHeight(u, v, seed));
  }
  geometry.computeVertexNormals();
  ensureUv2(geometry);

  const repeat = Math.max(1, Math.round(length / 4));
  const material = getTiledMaterial('ground', { repeatX: 2, repeatY: repeat, tint, roughness: 1 });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  const midX = (start.x + end.x) / 2;
  const midZ = (start.z + end.z) / 2;
  mesh.position.set(midX, 0.03, midZ);
  // rotation.x lays the plane flat (local Y -> world -Z); rotation.y then yaws it in
  // the ground plane to point along (dx, dz).
  mesh.rotation.y = Math.atan2(-dx, -dz);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}
