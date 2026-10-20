import * as THREE from 'three';

/**
 * M7's mango baagh (docs/STORY.md). Moved 2026-10-21 (Wave 4 item 1 — "move the
 * mango baagh to match MAP.md: north of the village, across the canal, next to
 * the family's own khet, so every farm trip crosses the nahar") from its old spot
 * east of the field/track loop (x=100, z=-20 — a dangling patch of open ground not
 * actually connected to anything, reached only by driving straight off the track's
 * own edge) to a real spot INSIDE the family's own field (src/field.js's crop
 * rectangle), just south of the new canal crossing (src/canal.js — the single
 * pukka bridge at x=-10). The route from the house now genuinely crosses the
 * canal every time: house -> bridge (x=-43, z~33) -> south into the field -> the
 * baagh. src/field.js's buildCropRows() carves a real clearing around this centre
 * (BAAGH_CLEARING_RADIUS) so the wheat crop tufts don't visually clip through the
 * mango trees.
 */
export const BAAGH_CENTER = { x: -15, z: 10 };
export const BAAGH_CLEARING_RADIUS = 11; // covers the tree spread below (max |dx|/|dz| = 9) plus margin

// A loose cluster of mango trees (src/trees.js's 'mango' species) around the
// centre — three "marked" ones close to the natural tractor approach (west side,
// facing the track) double as the knock interaction points, three more further
// in purely for atmosphere. All fold into the same free, shared tree draw call
// (src/trees.js's TREE_MATERIAL singleton + the village-wide static merge) —
// adding more mango trees here costs triangles, not draw calls.
export const MANGO_TREE_PLACEMENTS = [
  { kind: 'mango', x: BAAGH_CENTER.x - 9, z: BAAGH_CENTER.z - 6, rotationY: 0.4, seed: 31 },
  { kind: 'mango', x: BAAGH_CENTER.x - 2, z: BAAGH_CENTER.z - 9, rotationY: 1.8, seed: 32 },
  { kind: 'mango', x: BAAGH_CENTER.x + 7, z: BAAGH_CENTER.z - 6, rotationY: 3.1, seed: 33 },
  { kind: 'mango', x: BAAGH_CENTER.x - 6, z: BAAGH_CENTER.z + 7, rotationY: 2.2, seed: 34 },
  { kind: 'mango', x: BAAGH_CENTER.x + 2, z: BAAGH_CENTER.z + 9, rotationY: 0.9, seed: 35 },
  { kind: 'mango', x: BAAGH_CENTER.x + 9, z: BAAGH_CENTER.z + 5, rotationY: 4.0, seed: 36 },
];

// The first 3 placements above, 2.5m toward the baagh centre from each tree's own
// trunk (so the interaction point sits in the open, not inside the canopy/trunk) —
// these are M7's "marked trees" to knock.
function towardCentre(p, dist) {
  const dx = BAAGH_CENTER.x - p.x;
  const dz = BAAGH_CENTER.z - p.z;
  const len = Math.hypot(dx, dz) || 1;
  return new THREE.Vector3(p.x + (dx / len) * dist, 0, p.z + (dz / len) * dist);
}

export const MANGO_KNOCK_POSITIONS = MANGO_TREE_PLACEMENTS.slice(0, 3).map((p) => towardCentre(p, 2.5));

export const BAAGH_POSITION = new THREE.Vector3(BAAGH_CENTER.x, 0, BAAGH_CENTER.z);
