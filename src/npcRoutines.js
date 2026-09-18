import * as THREE from 'three';
import { resolveCollisions } from './collision.js';
import { NPC_RADIUS } from './npc.js';

/**
 * Simple waypoint-loop routines for the placeholder NPCs (queue item 8) — no
 * pathfinding library. Each waypoint list is hand-picked to route around building
 * footprints (see docs/parked.md for the child's route past the halwai), which is
 * what "must not walk through walls" means here: chosen paths, not runtime avoidance.
 */

const _toTarget = new THREE.Vector3();

/**
 * Walks `npcGroup` through `waypoints` in order, looping back to the start, pausing
 * `pauseSeconds` at each stop. Faces the direction of travel while moving. Returns an
 * update(dt) function — call once per frame.
 */
export function createWaypointLoop(npcGroup, waypoints, { speed = 1.1, pauseSeconds = 2.5 } = {}) {
  let index = 0;
  let pauseTimer = pauseSeconds * 0.5; // start mid-pause so NPCs don't all move in lockstep from frame 1

  return function update(dt) {
    const target = waypoints[index];
    _toTarget.set(target.x - npcGroup.position.x, 0, target.z - npcGroup.position.z);
    const dist = _toTarget.length();

    if (dist < 0.15) {
      pauseTimer += dt;
      if (pauseTimer >= pauseSeconds) {
        pauseTimer = 0;
        index = (index + 1) % waypoints.length;
      }
      return;
    }

    _toTarget.multiplyScalar(1 / dist); // normalize
    npcGroup.position.addScaledVector(_toTarget, Math.min(speed * dt, dist));
    const targetYaw = Math.atan2(_toTarget.x, _toTarget.z);
    // Shortest-path yaw damp so it doesn't spin the long way round.
    let diff = targetYaw - npcGroup.rotation.y;
    diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
    npcGroup.rotation.y += diff * Math.min(1, dt * 4);
  };
}

/**
 * The halwai's stirring motion (queue item 8) — stationary, a slow lean-and-circle
 * over the kadhai rather than a waypoint walk. `mesh` is the NPC's own capsule mesh
 * (child of the group) so the lean doesn't move the group's own position/collision.
 */
export function createStirLoop(mesh, { rate = 1.6, amount = 0.14 } = {}) {
  let t = 0;
  return function update(dt) {
    t += dt * rate;
    mesh.rotation.x = Math.sin(t) * amount;
    mesh.rotation.z = Math.sin(t * 0.6) * amount * 0.5;
  };
}

const _toFollowTarget = new THREE.Vector3();

/**
 * Task 4 (second errand) — walks `npcGroup` toward whatever `getTargetPosition()`
 * currently returns (called fresh every frame, e.g. the player's live position),
 * stopping at `stopDistance`, facing the direction of travel (same yaw-damp as
 * createWaypointLoop above), and pushed back out of building walls the same way the
 * player/vehicles are (src/collision.js `resolveCollisions` — the actual "does not
 * pass through walls" behaviour; there's no separate avoidance system to write).
 */
export function createFollowRoutine(npcGroup, getTargetPosition, { stopDistance = 2, speed = 1.8 } = {}) {
  return function update(dt) {
    const target = getTargetPosition();
    _toFollowTarget.set(target.x - npcGroup.position.x, 0, target.z - npcGroup.position.z);
    const dist = _toFollowTarget.length();

    if (dist > stopDistance) {
      _toFollowTarget.multiplyScalar(1 / dist);
      const step = Math.min(speed * dt, dist - stopDistance);
      npcGroup.position.addScaledVector(_toFollowTarget, step);
      const targetYaw = Math.atan2(_toFollowTarget.x, _toFollowTarget.z);
      let diff = targetYaw - npcGroup.rotation.y;
      diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
      npcGroup.rotation.y += diff * Math.min(1, dt * 4);
    }

    resolveCollisions(npcGroup.position, NPC_RADIUS, []);
  };
}
