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

// Bugfix (real playtest regression, screenshot evidence — trolley buried ~2m into
// a wall near the bazaar): this used to be a SINGLE pass, one resolveCircleVsBox
// call per box, static and extra boxes in two separate loops, each box resolved
// once in arbitrary order and never re-checked. At a corner — anywhere two
// collider boxes meet or nearly meet, which is exactly every building corner and
// every party wall between adjacent bazaar shops — box A's correction can push
// the body straight into box B, which (being earlier in iteration order, or just
// never revisited) is never re-checked that frame. The frame ends with the body
// penetrating, and a swept resolveMove() calling this same function every substep
// doesn't help: every substep has the identical single-pass bug. Fix: iterate the
// full pass (static AND extra boxes together, so a dynamic/static pair at a
// corner gets the same treatment) until no box applies a correction, capped so a
// genuinely wedged body can't loop forever.
const MAX_RESOLVE_PASSES = 6; // verified empirically (tools/trolley-corner-test.js):
// raising this to 20 produced a byte-identical result to 6 across all 164
// corner-approach test runs — 6 already fully converges every real case in this
// village; the remaining sub-5cm residuals in that test are wall-sampling-grid
// precision noise (confirmed independent of pass count), not an under-iterated
// resolve.

/** Resolves `pos` (a THREE.Vector3-like, only .x/.z used) against every collider —
 * static buildings plus any extra (dynamic) boxes passed in, e.g. parked vehicles. */
export function resolveCollisions(pos, radius, extraBoxes = []) {
  for (let pass = 0; pass < MAX_RESOLVE_PASSES; pass++) {
    let corrected = false;
    for (const box of STATIC_COLLIDERS) {
      if (resolveCircleVsBox(pos, radius, box)) corrected = true;
    }
    for (const box of extraBoxes) {
      if (resolveCircleVsBox(pos, radius, box)) corrected = true;
    }
    if (!corrected) break;
  }
}

// Bugfix (defect 2 of the real playtest regression): a circle can never correctly
// represent the trolley's real 3.5 x 2.0 bed (or the tractor's own rectangular
// body) — TROLLEY_COLLISION_RADIUS used Math.max(bedLen,bedW)/2=1.75m, but the
// bed's own corners sit at a true half-diagonal of hypot(1.75,1.0)=2.02m from its
// centre, outside that circle. Any approximation using a single radius is either
// too fat (blocks a gate it should fit through) or too thin (its own real corners
// can be inside a wall while the circle reads clear) for a 3.5 x 2.0 rectangle.
// This is a proper oriented-box (the real bed footprint, at its current yaw) vs
// axis-aligned-box (every STATIC_COLLIDERS/extraBoxes entry) separating-axis test
// — exact, not an approximation — used for the trolley and the tractor body.
// For two boxes in 2D there are only 4 possible separating axes: the AABB's own
// two axes, and the oriented box's own two local axes (each box has only two
// distinct edge normals). `halfW`/`halfD` are the oriented box's half-extents
// along its LOCAL X (lateral/width) and LOCAL Z (forward/length) axes — same
// convention this file's colliderBoxFromTransform() and src/vehicles.js already
// use. World direction of local X at yaw θ is (cosθ,-sinθ); local Z is
// (sinθ,cosθ) — derived from the same localToWorld convention src/vehicles.js's
// hitchTargetPosition() documents ("local (0,*,z) at yaw θ is (z sinθ, *, z cosθ)").
function resolveOrientedBoxVsBox(pos, yaw, halfW, halfD, box) {
  const cx = (box.minX + box.maxX) / 2;
  const cz = (box.minZ + box.maxZ) / 2;
  const ex = (box.maxX - box.minX) / 2;
  const ez = (box.maxZ - box.minZ) / 2;
  const dx = pos.x - cx;
  const dz = pos.z - cz;

  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const axes = [
    { x: 1, z: 0 },
    { x: 0, z: 1 },
    { x: cosY, z: -sinY }, // oriented box's local X (width) axis, in world space
    { x: sinY, z: cosY }, // oriented box's local Z (length) axis, in world space
  ];

  let minOverlap = Infinity;
  let minAxis = null;
  let minSign = 1;

  for (const axis of axes) {
    const aabbProj = Math.abs(ex * axis.x) + Math.abs(ez * axis.z);
    const obbProj = Math.abs(halfW * (cosY * axis.x - sinY * axis.z)) + Math.abs(halfD * (sinY * axis.x + cosY * axis.z));
    const centerDist = dx * axis.x + dz * axis.z;
    const overlap = aabbProj + obbProj - Math.abs(centerDist);
    if (overlap <= 0) return false; // this axis separates the two boxes — no collision
    if (overlap < minOverlap) {
      minOverlap = overlap;
      minAxis = axis;
      minSign = centerDist >= 0 ? 1 : -1;
    }
  }

  // Minimum-translation-vector push: move along whichever axis had the smallest
  // overlap, away from the box's centre.
  pos.x += minAxis.x * minOverlap * minSign;
  pos.z += minAxis.z * minOverlap * minSign;
  return true;
}

/** Oriented-box equivalent of resolveCollisions() — same iterate-to-convergence
 * fix (defect 1), applied with the exact rectangular footprint instead of a
 * circle (defect 2). Used for the trolley and the tractor body. */
export function resolveOrientedCollisions(pos, yaw, halfW, halfD, extraBoxes = []) {
  for (let pass = 0; pass < MAX_RESOLVE_PASSES; pass++) {
    let corrected = false;
    for (const box of STATIC_COLLIDERS) {
      if (resolveOrientedBoxVsBox(pos, yaw, halfW, halfD, box)) corrected = true;
    }
    for (const box of extraBoxes) {
      if (resolveOrientedBoxVsBox(pos, yaw, halfW, halfD, box)) corrected = true;
    }
    if (!corrected) break;
  }
}

/** Read-only oriented-box overlap test — returns the first offending box (or
 * null if clear). Used by the dev-mode per-frame penetration guard (main.js) to
 * report which collider a vehicle/trolley is overlapping, and available for any
 * caller that needs a "would this be blocked" check without moving `pos`. */
export function orientedBoxOverlapsAnyBox(pos, yaw, halfW, halfD, boxes) {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const axes = [
    { x: 1, z: 0 },
    { x: 0, z: 1 },
    { x: cosY, z: -sinY },
    { x: sinY, z: cosY },
  ];
  for (const box of boxes) {
    const cx = (box.minX + box.maxX) / 2;
    const cz = (box.minZ + box.maxZ) / 2;
    const ex = (box.maxX - box.minX) / 2;
    const ez = (box.maxZ - box.minZ) / 2;
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    let overlapping = true;
    for (const axis of axes) {
      const aabbProj = Math.abs(ex * axis.x) + Math.abs(ez * axis.z);
      const obbProj = Math.abs(halfW * (cosY * axis.x - sinY * axis.z)) + Math.abs(halfD * (sinY * axis.x + cosY * axis.z));
      const centerDist = dx * axis.x + dz * axis.z;
      if (aabbProj + obbProj - Math.abs(centerDist) <= 0) {
        overlapping = false;
        break;
      }
    }
    if (overlapping) return box;
  }
  return null;
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
