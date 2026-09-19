import { HOUSE_CENTER, SCHOOL_CENTER, HALWAI_CENTER, WALL_THICKNESS, HOUSE_BLOCK, HOUSE_DOOR_Z, HOUSE_DOOR_WIDTH, HOUSE_PARTITION_Z, HOUSE_PARTITION_DOOR_WIDTH } from './village.js';

/**
 * Simple axis-aligned box colliders — no physics engine. Player and vehicles are
 * circles in the XZ plane (see resolveCollisions); each box pushes the circle out
 * along the shallowest penetration axis, which is what produces "slide along the
 * surface" instead of a hard stop. Field crops/grass are not solid (per the brief) —
 * they simply have no entry here.
 *
 * Building box values are hand-matched to src/village.js's actual geometry (not
 * derived from the meshes at runtime) so a door/window opening can leave a real gap —
 * the visual walls are solid-mass boxes with a *fake* recessed opening (see
 * docs/parked.md), so collision needs its own notched shape, not the mesh bounds.
 * If village.js's building dimensions ever change, update the matching entry here.
 */

/** A rectangular footprint with a door-width notch on one face, as 2-3 AABBs: two
 * full-depth boxes flanking the door, plus a box for the rest of the footprint set
 * back by `recess` from the door face so the door reads as a shallow alcove, matching
 * the visual reveal depth, rather than a full passage into solid mass. */
function footprintWithDoorNotch(cx, cz, w, d, doorFace, doorWidth, recess = WALL_THICKNESS) {
  const boxes = [];
  const hw = w / 2;
  const hd = d / 2;
  const hdoor = doorWidth / 2;

  if (doorFace === 'north' || doorFace === 'south') {
    // Door on a Z-face; width runs along X.
    boxes.push({ minX: cx - hw, maxX: cx - hdoor, minZ: cz - hd, maxZ: cz + hd }); // left of door
    boxes.push({ minX: cx + hdoor, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd }); // right of door
    const backZmin = doorFace === 'south' ? cz - hd : cz - hd + recess;
    const backZmax = doorFace === 'south' ? cz + hd - recess : cz + hd;
    boxes.push({ minX: cx - hdoor, maxX: cx + hdoor, minZ: backZmin, maxZ: backZmax });
  } else {
    // Door on an X-face ('east'/'west'); width runs along Z.
    boxes.push({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz - hdoor }); // "left" of door
    boxes.push({ minX: cx - hw, maxX: cx + hw, minZ: cz + hdoor, maxZ: cz + hd }); // "right" of door
    // The recess cuts into whichever side the door is actually on: 'east' (door at
    // max X) recesses maxX; 'west' (door at min X) recesses minX. This was backwards
    // before — it recessed the far/blank wall and left a full-depth gap through to
    // the actual door face, which is how the tractor drove straight into the school's
    // side wings (see docs/parked.md).
    const backXmin = doorFace === 'east' ? cx - hw : cx - hw + recess;
    const backXmax = doorFace === 'east' ? cx + hw - recess : cx + hw;
    boxes.push({ minX: backXmin, maxX: backXmax, minZ: cz - hdoor, maxZ: cz + hdoor });
  }
  return boxes;
}

function buildStaticColliders() {
  const boxes = [];

  // House block: item 3 made it walkable — 4 real thin perimeter walls (a genuine
  // gap at the front door, not the notched-solid-mass every other building here
  // still uses) plus the interior partition's own doorway, matching
  // src/village.js's buildHouse() exactly (both read from the same HOUSE_BLOCK/
  // HOUSE_DOOR_*/HOUSE_PARTITION_* constants, so they can't drift apart).
  {
    const { cx, cz, w, d } = HOUSE_BLOCK;
    const hw = w / 2;
    const hd = d / 2;
    const t = WALL_THICKNESS / 2;
    const doorHalf = HOUSE_DOOR_WIDTH / 2;
    // South wall (door), 2 segments.
    boxes.push({ minX: cx - hw, maxX: cx - doorHalf, minZ: HOUSE_DOOR_Z - t, maxZ: HOUSE_DOOR_Z + t });
    boxes.push({ minX: cx + doorHalf, maxX: cx + hw, minZ: HOUSE_DOOR_Z - t, maxZ: HOUSE_DOOR_Z + t });
    // North wall, solid.
    boxes.push({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd - t, maxZ: cz - hd + t });
    // East/west walls, solid.
    boxes.push({ minX: cx - hw - t, maxX: cx - hw + t, minZ: cz - hd, maxZ: cz + hd });
    boxes.push({ minX: cx + hw - t, maxX: cx + hw + t, minZ: cz - hd, maxZ: cz + hd });
    // Interior partition, its own doorway.
    const pDoorHalf = HOUSE_PARTITION_DOOR_WIDTH / 2;
    boxes.push({ minX: cx - hw, maxX: cx - pDoorHalf, minZ: HOUSE_PARTITION_Z - t, maxZ: HOUSE_PARTITION_Z + t });
    boxes.push({ minX: cx + pDoorHalf, maxX: cx + hw, minZ: HOUSE_PARTITION_Z - t, maxZ: HOUSE_PARTITION_Z + t });
    // Low compound walls, east/west courtyard edges (thin — treat as strips). The
    // staircase (src/village.js HOUSE_STAIRS) deliberately has no collider here — the
    // player has to be able to walk onto it; height comes from main.js's
    // groundHeightAt(), not from being blocked/stepped over.
    boxes.push({ minX: HOUSE_CENTER.x - 9 - 0.15, maxX: HOUSE_CENTER.x - 9 + 0.15, minZ: HOUSE_CENTER.z - 7, maxZ: HOUSE_CENTER.z + 7 });
    boxes.push({ minX: HOUSE_CENTER.x + 9 - 0.15, maxX: HOUSE_CENTER.x + 9 + 0.15, minZ: HOUSE_CENTER.z - 7, maxZ: HOUSE_CENTER.z + 7 });
  }

  // School: 3 blocks, each with a door on its yard-facing wall.
  {
    const cx = SCHOOL_CENTER.x;
    const cz = SCHOOL_CENTER.z;
    boxes.push(...footprintWithDoorNotch(cx, cz + 9, 24, 6, 'south', 1.1)); // back block, door faces +z (south, toward yard)
    boxes.push(...footprintWithDoorNotch(cx - 12, cz, 6, 18, 'east', 1.1)); // west wing, door faces +x
    boxes.push(...footprintWithDoorNotch(cx + 12, cz, 6, 18, 'west', 1.1)); // east wing, door faces -x
  }

  // Halwai: only 2 real walls (north, east) — no door, both other sides fully open.
  {
    const cx = HALWAI_CENTER.x;
    const cz = HALWAI_CENTER.z;
    const width = 5.5;
    const depth = 4.5;
    const t = WALL_THICKNESS;
    const xBack = cx + depth / 2;
    const zLeft = cz - width / 2;
    boxes.push({ minX: cx - depth / 2, maxX: xBack, minZ: zLeft - t / 2, maxZ: zLeft + t / 2 }); // north wall
    boxes.push({ minX: xBack - t / 2, maxX: xBack + t / 2, minZ: zLeft, maxZ: cz + width / 2 }); // east wall
    // Kadhai platform (a low box, but tall/solid enough at the front to be worth blocking).
    boxes.push({ minX: cx - depth / 2, maxX: cx - depth / 2 + 0.9, minZ: cz - width / 2, maxZ: cz + width / 2 });
  }

  // Background houses (src/scenery.js) — simple solid footprints, no doors modelled.
  for (const p of [
    { x: -115, z: 15, w: 9, d: 7 },
    { x: 25, z: 128, w: 8, d: 8 },
    { x: -95, z: 165, w: 10, d: 7 },
  ]) {
    boxes.push({ minX: p.x - p.w / 2, maxX: p.x + p.w / 2, minZ: p.z - p.d / 2, maxZ: p.z + p.d / 2 });
  }

  // Tea stall + general store (src/shops.js, item 9) — simple solid footprints
  // (world-space AABB, accounting for each one's 90°/-90° placement rotation — a
  // rotateY(θ) maps local (x,z) half-extents to world (|z|,|x|) half-extents at
  // θ=±90°, i.e. swapped, not the local w×d as authored).
  boxes.push({ minX: -53.25, maxX: -50.75, minZ: 76, maxZ: 80 }); // tea stall, 2.5(x) x 4(z) world footprint
  boxes.push({ minX: -39.5, maxX: -36.5, minZ: 88.25, maxZ: 91.75 }); // general store, 3(x) x 3.5(z) world footprint

  return boxes;
}

export const STATIC_COLLIDERS = buildStaticColliders();

/** Adds more boxes to the shared static collider list after the fact — for content
 * built outside village.js/shops.js that still needs to block movement the same way
 * (queue item 2's tree trunks, main.js — trees are placed at runtime, not known when
 * this module's own buildStaticColliders() list above is built). */
export function addStaticColliders(boxes) {
  STATIC_COLLIDERS.push(...boxes);
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

/** An axis-aligned box matching a vehicle's current footprint, for blocking other
 * vehicles/the player while this one is parked (or just driving around). */
export function vehicleFootprintBox(vehicle) {
  const p = vehicle.preset;
  const halfDiag = Math.hypot(p.body.w, p.body.d) / 2;
  const x = vehicle.group.position.x;
  const z = vehicle.group.position.z;
  return { minX: x - halfDiag, maxX: x + halfDiag, minZ: z - halfDiag, maxZ: z + halfDiag };
}
