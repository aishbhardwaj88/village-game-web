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

const RUT_OFFSET = 1 / 3; // u is normalised -0.5..0.5 across the strip's width
const RUT_WIDTH = 0.05;
const RUT_DEPTH = 0.035;

/** Two shallow parallel wheel-track grooves, cheap to add on top of the general bumps
 * since the strip geometry already exists. */
function rutDepth(u) {
  const left = Math.exp(-(((u - RUT_OFFSET) / RUT_WIDTH) ** 2));
  const right = Math.exp(-(((u + RUT_OFFSET) / RUT_WIDTH) ** 2));
  return -RUT_DEPTH * (left + right);
}

/**
 * A straight dirt strip (lane or track segment) between two points, with gentle baked
 * height bumps. Reused by src/village.js (the lane) and src/field.js (the field
 * track loop) so both use the same construction and the same ground texture set at a
 * different tint/tiling from the open ground.
 */
export function buildStripSegment(start, end, width, { seed = 0, tint = 0xb7a179, ruts = false } = {}) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const segsAlong = Math.max(4, Math.round(length / 3));
  const segsAcross = 6;

  const geometry = new THREE.PlaneGeometry(width, length, segsAcross, segsAlong);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / width;
    const v = pos.getY(i) / length;
    let z = bumpHeight(u, v, seed);
    if (ruts) z += rutDepth(u);
    pos.setZ(i, z);
  }
  geometry.computeVertexNormals();
  // Bake the "lay flat" rotation into the geometry itself (local Y -> -Z, local
  // Z/bump -> Y/up), rather than applying it as a second runtime rotation.x
  // alongside rotation.y on the mesh. Two non-zero Euler components compose in a
  // fixed axis order (X, then Y, then Z here) that does NOT match "flatten, then
  // yaw" for an arbitrary yaw angle — that combination was rendering lane/track
  // segments with an inverted (downward) normal for some directions, reading as a
  // flat black strip. A single baked axis plus a single runtime rotation.y has no
  // such ambiguity. See docs/parked.md.
  geometry.rotateX(-Math.PI / 2);
  ensureUv2(geometry);

  const repeat = Math.max(1, Math.round(length / 4));
  // Ground102 — a smooth, compressed/stamped dirt texture, distinct from the open
  // ground's Ground109 (looser, pebbly) and the courtyards' concrete — so lane and
  // track read as a different kind of surface, not just a different tint of the same
  // one. See docs/look-standard.md / docs/parked.md.
  const material = getTiledMaterial('lane', { repeatX: 2, repeatY: repeat, tint, roughness: 1 });

  const mesh = new THREE.Mesh(geometry, material);
  const midX = (start.x + end.x) / 2;
  const midZ = (start.z + end.z) / 2;
  mesh.position.set(midX, 0.03, midZ);
  mesh.rotation.y = Math.atan2(-dx, -dz);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}
