import { HOUSE_CENTER, SCHOOL_CENTER } from './village.js';
import { FIELD_CENTER, FIELD_SIZE } from './field.js';

/**
 * Footstep surface classifier (queue item 7) — cement inside the house/school
 * courtyards, soil inside the field, dirt everywhere else (the lane). A simple AABB
 * check against each area's known footprint is enough; there's no need to hit-test
 * actual floor meshes for something this coarse. Courtyard sizes (18x14, 30x24) must
 * stay in sync with the floor `PlaneGeometry` calls in src/village.js if those change.
 */
const HOUSE_COURTYARD = { halfX: 9, halfZ: 7 };
const SCHOOL_YARD = { halfX: 15, halfZ: 12 };

// Highway tarmac strip: 14 x 150 m centred on the highway anchor (205, 40), src/farmSites.js roadGeos.
const TARMAC = { x: 205, z: 40, halfX: 7, halfZ: 75 };

export const SURFACE = { CEMENT: 'cement', SOIL: 'soil', DIRT: 'dirt', TARMAC: 'tarmac' };

export function surfaceAt(x, z) {
  if (Math.abs(x - HOUSE_CENTER.x) < HOUSE_COURTYARD.halfX && Math.abs(z - HOUSE_CENTER.z) < HOUSE_COURTYARD.halfZ) {
    return SURFACE.CEMENT;
  }
  if (Math.abs(x - SCHOOL_CENTER.x) < SCHOOL_YARD.halfX && Math.abs(z - SCHOOL_CENTER.z) < SCHOOL_YARD.halfZ) {
    return SURFACE.CEMENT;
  }
  if (Math.abs(x - FIELD_CENTER.x) < FIELD_SIZE.x / 2 && Math.abs(z - FIELD_CENTER.z) < FIELD_SIZE.z / 2) {
    return SURFACE.SOIL;
  }
  if (Math.abs(x - TARMAC.x) < TARMAC.halfX && Math.abs(z - TARMAC.z) < TARMAC.halfZ) {
    return SURFACE.TARMAC;
  }
  return SURFACE.DIRT;
}
