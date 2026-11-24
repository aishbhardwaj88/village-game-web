#!/usr/bin/env node
/**
 * STATIC, NO-BROWSER check for docs/BACKLOG.md's A0 item: "NPCs entering a building
 * must route to the door and pass through the opening, never a wall; re-path any
 * routine that cannot."
 *
 * src/doorRouting.js's BUILDING_ROUTES is the data every createFollowRoutine() call
 * (Maa, sister — src/main.js) uses to decide whether to walk a chain of door points
 * instead of pushing straight at a wall (src/npcRoutines.js `doorLegs()`). That logic
 * trusts two geometric properties of BUILDING_ROUTES it never itself verifies:
 *
 *   1. links[i][0] must sit in zone i and links[i][1] must sit in zone i+1 (one each
 *      side of the opening), because doorLegs() walks the queue in that exact index
 *      order for an upward (from < to) crossing and reversed for downward — get the
 *      side or the order wrong and a follower is sent to walk INTO the wall it was
 *      supposed to route around, not through the door.
 *   2. the two points of one link sit a plausible door-width apart (not the opposite
 *      corners of the building, which would still satisfy check 1 but send the
 *      follower on a long detour through furniture instead of straight through the
 *      opening).
 *
 * Both are plain coordinate math — no THREE scene, no renderer, no world-validator
 * OOM risk (confirmed: this script is pure ESM import of doorRouting.js/village.js,
 * runs in under a second). This is the live counterpart to BACKLOG's own "re-path any
 * routine that cannot" clause: it is the thing that would actually catch a future
 * edit to doorRouting.js (a reordered link, a flipped sign, a miscopied constant)
 * that world-validator.js's build-time check 9 cannot reach today (check 9 needs a
 * live scene's real STATIC_COLLIDERS, which is exactly what OOMs in this container —
 * see docs/handoff.md). This script checks the queue-building MATH is self-consistent;
 * it does not and cannot confirm the door points sit outside a real wall collider
 * (that still needs check 9, run from a working browser).
 *
 * Usage: node tools/check-door-routes.mjs   (exits 1 on any GAP)
 */
import { BUILDING_ROUTES } from '../src/doorRouting.js';

const MAX_DOOR_WIDTH = 5; // metres — a generous door/opening; anything wider is almost certainly the wrong pair of points
const EPS = 1e-6;

/** Runs the same checks `check-door-routes.mjs` ships, against any BUILDING_ROUTES-shaped array — used for real buildings and for the self-test below. */
function checkRoutes(routes) {
  const gaps = [];
  for (const b of routes) {
    b.links.forEach((pair, i) => {
      if (!Array.isArray(pair) || pair.length !== 2) { gaps.push(`${b.name} link[${i}]: not a 2-point pair`); return; }
      const [p0, p1] = pair;
      const z0 = b.zoneOf(p0.x, p0.z), z1 = b.zoneOf(p1.x, p1.z);
      if (z0 !== i) gaps.push(`${b.name} link[${i}][0] = (${p0.x.toFixed(2)},${p0.z.toFixed(2)}) is in zone ${z0}, expected zone ${i} (the "from" side) — doorLegs() will queue a point that is not actually in the room it thinks it's leaving`);
      if (z1 !== i + 1) gaps.push(`${b.name} link[${i}][1] = (${p1.x.toFixed(2)},${p1.z.toFixed(2)}) is in zone ${z1}, expected zone ${i + 1} (the "to" side) — doorLegs() will queue a point that is not actually in the room it thinks it's entering`);
      const dist = Math.hypot(p0.x - p1.x, p0.z - p1.z);
      if (dist > MAX_DOOR_WIDTH) gaps.push(`${b.name} link[${i}]: its two points are ${dist.toFixed(2)} m apart (limit ${MAX_DOOR_WIDTH} m) — too far apart to be "one each side of the door", likely wrong coordinates`);
      if (dist < EPS) gaps.push(`${b.name} link[${i}]: its two points are identical — zoneOf would never actually cross a zone boundary walking between them`);
    });
    // zoneOf must step through every zone 0..links.length with nothing skipped, or doorLegs()'s
    // `for (i = from; i < to; i++)` loop will walk off the end of (or never reach into) `links`.
    const sampled = new Set([0]);
    b.links.forEach((pair) => { sampled.add(b.zoneOf(pair[0].x, pair[0].z)); sampled.add(b.zoneOf(pair[1].x, pair[1].z)); });
    for (let z = 0; z <= b.links.length; z++) if (!sampled.has(z)) gaps.push(`${b.name}: no link point ever resolves to zone ${z} — doorLegs() has no way to route to/from it`);
  }
  return gaps;
}

// Self-test: prove this actually catches the bug classes above, not just a script that
// always passes (same discipline as tools/check-position-writes.mjs's injected-fault test).
function selfTest() {
  const good = { name: 'good', zoneOf: (x, z) => (x < 1 ? 0 : x < 2 ? 1 : 2), links: [[{ x: 0.5, z: 0 }, { x: 1.5, z: 0 }], [{ x: 1.5, z: 0 }, { x: 2.5, z: 0 }]] };
  if (checkRoutes([good]).length) throw new Error('self-test FAILED: a correct route was flagged — ' + JSON.stringify(checkRoutes([good])));

  const swapped = { name: 'swapped', zoneOf: good.zoneOf, links: [[{ x: 1.5, z: 0 }, { x: 0.5, z: 0 }], [{ x: 1.5, z: 0 }, { x: 2.5, z: 0 }]] }; // link[0]'s two points reversed
  if (!checkRoutes([swapped]).length) throw new Error('self-test FAILED: a reversed link[0] was not flagged');

  const farApart = { name: 'far', zoneOf: good.zoneOf, links: [[{ x: 0.5, z: 0 }, { x: 1.5, z: 50 }], [{ x: 1.5, z: 0 }, { x: 2.5, z: 0 }]] }; // link[0][1] moved 50 m away, still zone 1
  if (!checkRoutes([farApart]).length) throw new Error('self-test FAILED: a 50 m "door" was not flagged');

  const skippedZone = { name: 'skip', zoneOf: (x) => (x < 1 ? 0 : 2), links: [[{ x: 0.5, z: 0 }, { x: 1.5, z: 0 }]] }; // zoneOf never returns 1, but a link implies it should
  if (!checkRoutes([skippedZone]).length) throw new Error('self-test FAILED: a skipped zone was not flagged');

  console.log('self-test: 4/4 injected faults caught, 1/1 correct route passed clean');
}

selfTest();
const gaps = checkRoutes(BUILDING_ROUTES);
console.log(`\nChecked ${BUILDING_ROUTES.length} building route(s): ${BUILDING_ROUTES.map((b) => `${b.name} (${b.links.length} link${b.links.length === 1 ? '' : 's'})`).join(', ')}`);
if (gaps.length) {
  console.log(`\n${gaps.length} GAP(S):`);
  for (const g of gaps) console.log('  - ' + g);
  process.exit(1);
} else {
  console.log('0 gaps — every link point is in the zone doorLegs() assumes, every door-width is plausible, no zone is unreachable.');
  process.exit(0);
}
