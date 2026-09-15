import { HOUSE_CENTER, SCHOOL_CENTER, HALWAI_CENTER, WALL_THICKNESS } from './village.js';

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

  // House block: 10x8 at (cx, cz-3), door on the south face (per src/village.js).
  {
    const cx = HOUSE_CENTER.x;
    const cz = HOUSE_CENTER.z - 3;
    boxes.push(...footprintWithDoorNotch(cx, cz, 10, 8, 'south', 1.3));
    // Low compound walls, east/west courtyard edges (thin — treat as strips).
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

  return boxes;
}

export const STATIC_COLLIDERS = buildStaticColliders();

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
