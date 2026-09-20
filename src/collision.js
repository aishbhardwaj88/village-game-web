import * as THREE from 'three';

/**
 * Simple axis-aligned box colliders — no physics engine. Player and vehicles are
 * circles in the XZ plane (see resolveCollisions); each box pushes the circle out
 * along the shallowest penetration axis, which is what produces "slide along the
 * surface" instead of a hard stop.
 *
 * Structural fix (playtest): this file used to hand-type a box per building,
 * matched by eye to src/village.js/shops.js/bazaar.js/temple.js's own numbers —
 * which is exactly how the general store's collider went stale when the store
 * moved and nobody remembered to update the copy living here. There is now
 * exactly one way a collider comes into existence: something in the actual scene
 * graph is tagged solid (`mesh.userData.collider = true`, set once, at the
 * source, by src/materials.js's texturedWall()/texturedWallBox() — the two
 * functions every real wall in this game is built through) and
 * buildCollidersFromScene() below reads its real, current, transformed geometry.
 * A wall that moves, resizes, or gets added later needs no matching edit here —
 * there is nothing here left to edit. Field crops/grass are not solid (per the
 * brief) — they are simply never tagged.
 */

const _box3 = new THREE.Box3();
const _corner = new THREE.Vector3();

/** For a wall/box segment about to be merged away by src/mergeUtils.js's ad-hoc
 * (non-mergeGroupByMaterial) merge pattern — src/bazaar.js's back wall and party
 * walls, src/shops.js's buildShopWalls(), src/temple.js's boundary — computes its
 * world-space AABB collider from the exact width/depth and placement matrix
 * already being used to bake its real geometry, so the two can never drift apart.
 * Only X/Z matter (colliders are 2D); `matrix` is the full world placement
 * (local offset already composed with the building's own position/rotation, same
 * convention every one of those call sites already uses for its geometry). */
export function colliderBoxFromTransform(width, depth, matrix) {
  const hw = width / 2;
  const hd = depth / 2;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of [
    [-hw, -hd],
    [hw, -hd],
    [-hw, hd],
    [hw, hd],
  ]) {
    _corner.set(x, 0, z).applyMatrix4(matrix);
    minX = Math.min(minX, _corner.x);
    maxX = Math.max(maxX, _corner.x);
    minZ = Math.min(minZ, _corner.z);
    maxZ = Math.max(maxZ, _corner.z);
  }
  return { minX, maxX, minZ, maxZ };
}

/** Walks the whole scene ONCE, after every building has been added to it, and
 * derives the complete static collider list from real geometry — every object
 * tagged `userData.collider === true` (a real, still-standalone wall mesh)
 * contributes its own live world-space box; every object carrying
 * `userData.colliderBoxes` (an array — the result of one or more draw-call
 * merges having folded several tagged source meshes together, see
 * src/mergeUtils.js) contributes those directly, preserving real gaps between
 * segments (a doorway, the open front of a shop) instead of flattening a whole
 * run of separate walls into one solid span. Call once, after scene construction
 * finishes (main.js) — not per-frame; the result only needs recomputing if
 * something solid is added to the scene afterward. */
export function buildCollidersFromScene(scene) {
  const boxes = [];
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.userData.collider === true) {
      _box3.setFromObject(obj, true);
      if (isFinite(_box3.min.x)) boxes.push({ minX: _box3.min.x, maxX: _box3.max.x, minZ: _box3.min.z, maxZ: _box3.max.z });
    }
    if (Array.isArray(obj.userData.colliderBoxes)) boxes.push(...obj.userData.colliderBoxes);
  });
  return boxes;
}

// Populated once by initStaticColliders() (main.js, after scene construction).
// Kept as a plain mutable module-level array (not a getter/setter) so every
// existing resolveCollisions() call site keeps working unchanged — this is the
// one and only place that array is built.
export let STATIC_COLLIDERS = [];

export function initStaticColliders(scene) {
  STATIC_COLLIDERS = buildCollidersFromScene(scene);
}

/** Push a circle (in the XZ plane) out of a box if it overlaps, returning true if a
 * correction was applied. Pushing out along the shallowest penetration axis (not
 * straight back toward the circle's previous position) is what produces sliding. */
function resolveCircleVsBox(pos, radius, box) {
  const closestX = Math.min(Math.max(pos.x, box.minX), box.maxX);
  const closestZ = Math.min(Math.max(pos.z, box.minZ), box.maxZ);
  const dx = pos.x - closestX;
  const dz = pos.z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq > 0) {
    if (distSq >= radius * radius) return false;
    const dist = Math.sqrt(distSq);
    const overlap = radius - dist;
    pos.x += (dx / dist) * overlap;
    pos.z += (dz / dist) * overlap;
    return true;
  }

  // Degenerate case: circle centre is exactly on/inside the box edge (e.g. spawned
  // there) — push out along whichever axis has the smaller escape distance.
  const escapeLeft = pos.x - box.minX;
  const escapeRight = box.maxX - pos.x;
  const escapeDown = pos.z - box.minZ;
  const escapeUp = box.maxZ - pos.z;
  const minEscape = Math.min(escapeLeft, escapeRight, escapeDown, escapeUp);
  if (minEscape === escapeLeft) pos.x = box.minX - radius;
  else if (minEscape === escapeRight) pos.x = box.maxX + radius;
  else if (minEscape === escapeDown) pos.z = box.minZ - radius;
  else pos.z = box.maxZ + radius;
  return true;
}

/** Resolves `pos` (a THREE.Vector3-like, only .x/.z used) against every collider —
 * static buildings plus any extra (dynamic) boxes passed in, e.g. parked vehicles. */
export function resolveCollisions(pos, radius, extraBoxes = []) {
  for (const box of STATIC_COLLIDERS) resolveCircleVsBox(pos, radius, box);
  for (const box of extraBoxes) resolveCircleVsBox(pos, radius, box);
}

/** True if a circle (pos, radius) overlaps any box in `boxes` — read-only test,
 * used by the swept movement resolver (src/movement.js) to find the furthest
 * point along a proposed path that's still clear, without mutating `pos`. */
export function circleHitsAnyBox(pos, radius, boxes) {
  for (const box of boxes) {
    const closestX = Math.min(Math.max(pos.x, box.minX), box.maxX);
    const closestZ = Math.min(Math.max(pos.z, box.minZ), box.maxZ);
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

/** The signed distance from a circle (pos, radius) to the nearest of `boxes` —
 * positive if clear, negative (by how much) if actually penetrating. Read-only,
 * for verification/acceptance measurement (item 4's "report the minimum
 * distance between each collider pair; any negative value is a failure"), not
 * used by the resolver itself. */
export function minSignedDistanceToColliders(pos, radius, boxes) {
  let min = Infinity;
  for (const box of boxes) {
    const closestX = Math.min(Math.max(pos.x, box.minX), box.maxX);
    const closestZ = Math.min(Math.max(pos.z, box.minZ), box.maxZ);
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    const dist = Math.hypot(dx, dz) - radius;
    if (dist < min) min = dist;
  }
  return min;
}

/** An axis-aligned box matching a vehicle's current footprint, for blocking other
 * vehicles/the player while this one is parked (or just driving around). */
export function vehicleFootprintBox(vehicle) {
  const p = vehicle.preset;
  const halfDiag = Math.hypot(p.body.w, p.body.d) / 2;
  const x = vehicle.group.position.x;
  const z = vehicle.group.position.z;
  return { minX: x - halfDiag, maxX: x + halfDiag, minZ: z - halfDiag, maxZ: z + halfDiag };
}
