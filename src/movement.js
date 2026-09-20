import { resolveCollisions, circleHitsAnyBox, STATIC_COLLIDERS } from './collision.js';

/**
 * Structural fix 2/3 (playtest): the single movement resolver. Before this,
 * the player, the tractor/bike/cart and NPCs each wrote their own position and
 * separately (sometimes not at all — src/npcRoutines.js's waypoint loop never
 * called any collision check) resolved it against colliders. Every moving body
 * in this game now proposes a movement through resolveMove() below and nothing
 * else — see CLAUDE.md's regression-guard rule.
 *
 * Swept, not a single endpoint check: the proposed delta is walked in small
 * substeps (each capped below the thinnest wall in the game, WALL_THICKNESS —
 * see src/village.js) with a real collision resolve after every substep, so a
 * fast-moving body's position is never more than one substep away from a
 * point that was actually checked. A single "move the full delta, then
 * resolve the endpoint" check — the pattern this replaces everywhere — can
 * skip clean through a wall thinner than one frame's movement; this can't.
 */
const MAX_SUBSTEP = 0.08; // metres — comfortably under WALL_THICKNESS

/** Moves `pos` (a THREE.Vector3-like, only .x/.z used) by (dx, dz), resolving
 * collision after every substep. Mutates `pos` in place. `extraBoxes` are
 * additional (dynamic) colliders on top of the static scene-derived ones —
 * e.g. other parked/driving vehicles (src/collision.js's vehicleFootprintBox). */
export function resolveMove(pos, dx, dz, radius, extraBoxes = []) {
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-6) return;
  const steps = Math.max(1, Math.ceil(dist / MAX_SUBSTEP));
  const stepX = dx / steps;
  const stepZ = dz / steps;
  for (let i = 0; i < steps; i++) {
    pos.x += stepX;
    pos.z += stepZ;
    resolveCollisions(pos, radius, extraBoxes);
  }
}

/** True if a circle at `pos` (radius) currently overlaps any static collider or
 * any of `extraBoxes` — a read-only check, used where a caller needs to know
 * "would this be blocked" without committing to moving there (the tractor
 * asking whether its towed trolley's target spot is clear, below). */
export function positionBlocked(pos, radius, extraBoxes = []) {
  return circleHitsAnyBox(pos, radius, STATIC_COLLIDERS) || circleHitsAnyBox(pos, radius, extraBoxes);
}

/**
 * Moves a rigidly-towed trolley to `targetPos` (the tractor's hitch point,
 * offset by the trolley's own geometry — see Trolley.updateAttached()),
 * swept from its current position the same way resolveMove() sweeps any other
 * body, EXCEPT the trolley is never allowed to just slide off the rigid link:
 * if it ends up blocked anywhere short of `targetPos`, this reports exactly
 * how far short (`shortfallX/Z`) so the caller can pull the TRACTOR back by
 * the same amount — "when the trolley is blocked, the tractor is blocked
 * too" (this task's item 2), rather than the trolley silently detaching from
 * its hitch point to slide along a wall on its own. */
export function resolveTowedMove(pos, targetPos, radius, extraBoxes = []) {
  const dx = targetPos.x - pos.x;
  const dz = targetPos.z - pos.z;
  resolveMove(pos, dx, dz, radius, extraBoxes);
  return { shortfallX: targetPos.x - pos.x, shortfallZ: targetPos.z - pos.z };
}
