import * as THREE from 'three';
import { HOUSE_CENTER, HALWAI_CENTER } from './village.js';

/**
 * One reusable system, one data file (item 1 brief): every interaction point in the
 * game — the errand's two NPCs, the school bell, the charpai — is an entry here with
 * a position, a radius, a label, and what happens. main.js just asks
 * findNearestInteraction() for the closest in-range point each frame (foot only —
 * callers must not query this while mounted) and shows its label as a prompt, exactly
 * like the existing mount/dismount hint.
 *
 * `label` may be a plain string or `(ctx) => string` for state-dependent prompts (e.g.
 * "sit down" vs "stand up"); `available` likewise may gate whether a point can be
 * interacted with at all right now. `onInteract(ctx)` runs once per press.
 */
export const INTERACTION_POINTS = [];

export function registerInteraction(point) {
  INTERACTION_POINTS.push(point);
}

const _diff = new THREE.Vector3();

export function findNearestInteraction(pos, ctx) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const point of INTERACTION_POINTS) {
    if (point.available && !point.available(ctx)) continue;
    _diff.set(point.position.x - pos.x, 0, point.position.z - pos.z);
    const d = _diff.length();
    if (d < point.radius && d < nearestDist) {
      nearest = point;
      nearestDist = d;
    }
  }
  return nearest;
}

export function resolveLabel(point, ctx) {
  return typeof point.label === 'function' ? point.label(ctx) : point.label;
}

// --- errand NPC positions (used by main.js to place their capsule stand-ins too) ---
export const MAA_POSITION = new THREE.Vector3(HOUSE_CENTER.x, 0, HOUSE_CENTER.z + 3); // courtyard, south of the house block's door
export const HALWAI_NPC_POSITION = new THREE.Vector3(HALWAI_CENTER.x + 1.3, 0, HALWAI_CENTER.z); // the working aisle, between the kadhai and the display cabinet

registerInteraction({
  id: 'maa',
  position: MAA_POSITION,
  radius: 2.5,
  label: 'talk to Maa',
  onInteract: () => {},
});

registerInteraction({
  id: 'halwai',
  position: HALWAI_NPC_POSITION,
  radius: 2.5,
  label: 'talk to the halwai',
  onInteract: () => {},
});
