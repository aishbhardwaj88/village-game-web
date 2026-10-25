/**
 * Places the player walks ON even though geometry rises through the body band there (stair steps, ramps). Derived
 * colliders (src/autoColliders.js) skip these rectangles, otherwise every riser would become a wall. Whoever builds
 * a staircase or ramp registers its footprint here; height is handled by the ground-height ramp, not by collision.
 */
export const WALKABLE_RECTS = [];

export function registerWalkable(rect) {
  WALKABLE_RECTS.push(rect);
}
