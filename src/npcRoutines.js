import * as THREE from 'three';
import { resolveMove } from './movement.js';
import { NPC_RADIUS } from './npc.js';

/**
 * Simple waypoint-loop routines for the placeholder NPCs (queue item 8) — no
 * pathfinding library. Each waypoint list is hand-picked to route around building
 * footprints (see docs/parked.md for the child's route past the halwai), which is
 * what "must not walk through walls" means here: chosen paths, not runtime avoidance.
 */

const _toTarget = new THREE.Vector3();

/** Every waypoint route created, for the build-time path check (tools/world-validator.js
 * check 9). `scripted` routes start at a runtime position (waypoint 0 is the player), so the
 * first leg is skipped there. */
export const ROUTES = [];


/**
 * Walks `npcGroup` through `waypoints` in order, looping back to the start, pausing
 * `pauseSeconds` at each stop. Faces the direction of travel while moving. Returns an
 * update(dt) function — call once per frame.
 */
export function createWaypointLoop(npcGroup, waypoints, { speed = 1.1, pauseSeconds = 2.5, getExtraBoxes = () => [] } = {}) {
  ROUTES.push({ kind: 'loop', name: npcGroup.name, waypoints, radius: NPC_RADIUS });
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
    // Structural fix (playtest, item 2) — this used to write position directly
    // with no collision check at all (routes were hand-picked to avoid walls,
    // so nothing ever caught a real bug here, but every moving body must go
    // through the one resolver now regardless — see CLAUDE.md).
    const step = Math.min(speed * dt, dist);
    resolveMove(npcGroup.position, _toTarget.x * step, _toTarget.z * step, NPC_RADIUS, getExtraBoxes());
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

/**
 * Like createWaypointLoop, but stops and stays put at the last waypoint (calling
 * `onDone` once) instead of looping back to the first — for one-shot scripted
 * sequences (M6's monkey chase, docs/STORY.md) rather than an ambient wander.
 *
 * A waypoint may carry an optional `y` (default 0) — M6's chase uses this to send
 * the monkey up onto a real bazaar roof slab and back down (docs/STORY.md: "across
 * rooftops and lanes"). Height is eased toward the waypoint's `y` independently of
 * the XZ collision resolver below (resolveMove is 2D, ground-plane only, same as
 * every other NPC routine) — deliberately not run through collision at all: this is
 * a short, scripted, comedic beat ("never a stat/damage system"), not a real climb.
 */
export function createWaypointRun(npcGroup, waypoints, { speed = 1.6, pauseSeconds = 0.6, onDone, getExtraBoxes = () => [] } = {}) {
  ROUTES.push({ kind: 'run', name: npcGroup.name, waypoints, radius: NPC_RADIUS });
  let index = 0;
  let pauseTimer = 0;
  let done = false;

  return function update(dt) {
    if (done) return;
    const target = waypoints[index];
    _toTarget.set(target.x - npcGroup.position.x, 0, target.z - npcGroup.position.z);
    const dist = _toTarget.length();
    npcGroup.position.y += ((target.y ?? 0) - npcGroup.position.y) * Math.min(1, dt * 1.5);

    if (dist < 0.2) {
      if (index >= waypoints.length - 1) {
        done = true;
        onDone?.();
        return;
      }
      pauseTimer += dt;
      if (pauseTimer >= pauseSeconds) {
        pauseTimer = 0;
        index += 1;
      }
      return;
    }

    _toTarget.multiplyScalar(1 / dist);
    const step = Math.min(speed * dt, dist);
    resolveMove(npcGroup.position, _toTarget.x * step, _toTarget.z * step, NPC_RADIUS, getExtraBoxes());
    const targetYaw = Math.atan2(_toTarget.x, _toTarget.z);
    let diff = targetYaw - npcGroup.rotation.y;
    diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
    npcGroup.rotation.y += diff * Math.min(1, dt * 4);
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
export function createFollowRoutine(npcGroup, getTargetPosition, { stopDistance = 2, speed = 1.8, getExtraBoxes = () => [], buildings = [] } = {}) {
  // Door routing: when the follower and the target are in different rooms of a building
  // (src/doorRouting.js), walk the chain of door points first instead of pushing at the wall.
  let queue = [];
  let queueKey = '';
  let stuckTime = 0, sidestepTime = 0, sidestepSign = 1;
  const doorLegs = (target) => {
    for (const b of buildings) {
      const from = b.zoneOf(npcGroup.position.x, npcGroup.position.z);
      const to = b.zoneOf(target.x, target.z);
      if (from === to) continue;
      const key = `${b.name}:${from}>${to}`;
      if (key !== queueKey) {
        queueKey = key;
        queue = [];
        if (to > from) for (let i = from; i < to; i++) queue.push(b.links[i][0], b.links[i][1]);
        else for (let i = from - 1; i >= to; i--) queue.push(b.links[i][1], b.links[i][0]);
      }
      return;
    }
    queueKey = '';
    queue = [];
  };
  return function update(dt) {
    const target = getTargetPosition();
    doorLegs(target);
    while (queue.length && Math.hypot(queue[0].x - npcGroup.position.x, queue[0].z - npcGroup.position.z) < 0.45) queue.shift();
    const goal = queue.length ? queue[0] : target;
    const stop = queue.length ? 0 : stopDistance;
    _toFollowTarget.set(goal.x - npcGroup.position.x, 0, goal.z - npcGroup.position.z);
    const dist = _toFollowTarget.length();

    if (dist > stop) {
      _toFollowTarget.multiplyScalar(1 / dist);
      const step = Math.min(speed * dt, dist - stop);
      // Snag avoidance: if the swept resolver has held the follower back for ~0.6 s (a prop or corner between it and
      // the goal), slide along the obstacle to one side for a second instead of pushing into it forever.
      let dx = _toFollowTarget.x, dz = _toFollowTarget.z;
      if (sidestepTime > 0) {
        sidestepTime -= dt;
        const k = 0.8; // mostly sideways, a little forward
        const sx = -dz * sidestepSign, sz = dx * sidestepSign;
        dx = sx * k + dx * (1 - k); dz = sz * k + dz * (1 - k);
      }
      const bx = npcGroup.position.x, bz = npcGroup.position.z;
      resolveMove(npcGroup.position, dx * step, dz * step, NPC_RADIUS, getExtraBoxes());
      const moved = Math.hypot(npcGroup.position.x - bx, npcGroup.position.z - bz);
      if (moved < step * 0.35 && sidestepTime <= 0) {
        stuckTime += dt;
        if (stuckTime > 0.6) { stuckTime = 0; sidestepTime = 1.0; sidestepSign = -sidestepSign; }
      } else if (moved >= step * 0.35) stuckTime = 0;
      const targetYaw = Math.atan2(_toFollowTarget.x, _toFollowTarget.z);
      let diff = targetYaw - npcGroup.rotation.y;
      diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
      npcGroup.rotation.y += diff * Math.min(1, dt * 4);
    }
  };
}
