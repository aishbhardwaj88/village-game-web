import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTiledMaterial, bakeFlatTintColors, ensureUv2 } from './materials.js';
import { bazaarUnitCx, BAZAAR_FRONT_Z } from './bazaar.js';

/**
 * Third errand ("wheat to the bazaar") props — no new gameplay systems, just
 * geometry plugged into the existing quest/dialogue/waypoint/interaction registries
 * (src/interactions.js registers the actual interaction points; this file only
 * builds what they need: the sack pile, a single reusable carried-sack mesh, and the
 * fixed positions for Pitaji and the kirana shop counter).
 */

// Open ground just south of the house compound, right by the tractor's own spawn
// point (-51, 25) — not the walled inner courtyard itself (HOUSE_DOOR_WIDTH is
// 1.3m, pedestrian-only, so the tractor+trolley could never physically reach a pile
// placed inside those walls). See docs/parked.md for this placement call.
export const SACK_PILE_POSITION = new THREE.Vector3(-45, 0, 29);
export const PITAJI_POSITION = new THREE.Vector3(-48, 0, 31);
// Kirana is bazaar unit 1 (src/bazaar.js BAZAAR_UNITS[0]) — a couple of metres out
// from its counter, on the lane-facing open side, same "stand just outside the
// counter" distance every other shop interaction in this game uses.
export const KIRANA_POSITION = new THREE.Vector3(bazaarUnitCx(0), 0, BAZAAR_FRONT_Z - 1.5);

const SACK_TINT = 0xc2a468;
const SACK_SIZE = { w: 0.42, h: 0.5, d: 0.34 };

function sackGeometry() {
  const g = new THREE.BoxGeometry(SACK_SIZE.w, SACK_SIZE.h, SACK_SIZE.d);
  ensureUv2(g);
  bakeFlatTintColors(g, SACK_TINT, 1);
  return g;
}

const sackMaterial = getTiledMaterial('wood', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });

/** A static decorative pile of 3 sacks at the yard pickup point, just outside the house — always shows
 * all 3 regardless of how many have actually been collected (a visible
 * simplification, same trade-off this session has made for other small background
 * props — see docs/parked.md), merged into the village's shared 'wood' draw call. */
export function buildSackPile() {
  const geos = [];
  const offsets = [
    { x: -0.22, z: -0.1, rot: 0.15 },
    { x: 0.2, z: -0.05, rot: -0.2 },
    { x: 0, z: 0.2, rot: 0.4 },
  ];
  for (const o of offsets) {
    const g = sackGeometry();
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(o.rot).setPosition(SACK_PILE_POSITION.x + o.x, SACK_SIZE.h / 2, SACK_PILE_POSITION.z + o.z));
    geos.push(g);
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos), sackMaterial);
  mesh.name = 'wheat_sack_pile';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const CARRY_SLOTS_PLAYER = [{ x: 0, y: 1.55, z: -0.28 }]; // on the player's back
const CARRY_SLOTS_TROLLEY = [
  { x: -0.5, y: 0.9 + SACK_SIZE.h / 2, z: -0.9 },
  { x: 0.5, y: 0.9 + SACK_SIZE.h / 2, z: 0 },
  { x: -0.5, y: 0.9 + SACK_SIZE.h / 2, z: 0.9 },
]; // trolley bed floor is at y=0.9 (src/vehicles.js TR.floorY)

/**
 * Tracks the 1-3 sacks currently "in transit" (collected but not yet delivered) as
 * real child meshes, parented either to the trolley (if it's attached to whatever
 * the player is driving and parked close to the pile when picked up) or to the
 * player capsule itself (on-foot carry) — the brief's own two paths. Each pickup
 * decides its own parent independently, so a player who picks up sack 1 on foot,
 * then fetches the tractor+trolley for sacks 2-3, ends up carrying one on their back
 * and two in the trolley bed at once — a small, deliberately-accepted realism gap
 * rather than a special case forcing a single mode for the whole errand.
 */
export function createSackCarrier(player) {
  const carried = []; // { mesh, onPlayer }

  function pickUp(trolleyGroup, trolleyNearby) {
    const geo = sackGeometry();
    const mesh = new THREE.Mesh(geo, sackMaterial);
    mesh.castShadow = true;
    const onPlayer = !trolleyNearby;
    const slots = onPlayer ? CARRY_SLOTS_PLAYER : CARRY_SLOTS_TROLLEY;
    const slot = slots[carried.filter((c) => c.onPlayer === onPlayer).length % slots.length];
    mesh.position.set(slot.x, slot.y, slot.z);
    if (onPlayer) {
      mesh.rotation.x = -0.25; // leant back, like it's slung over a shoulder
      player.add(mesh);
    } else {
      trolleyGroup.add(mesh);
    }
    carried.push({ mesh, onPlayer });
  }

  /** Removes exactly one carried sack (whichever was added most recently) — called
   * once per delivery press, matching sacksDelivered incrementing by 1 each time. */
  function deliverOne() {
    const entry = carried.pop();
    if (!entry) return;
    entry.mesh.parent?.remove(entry.mesh);
  }

  function clearAll() {
    while (carried.length) deliverOne();
  }

  return {
    pickUp,
    deliverOne,
    clearAll,
    get count() {
      return carried.length;
    },
    get playerCount() {
      return carried.filter((c) => c.onPlayer).length;
    },
  };
}

export const TROLLEY_NEARBY_RADIUS = 6;

/** Is a trolley, attached to whatever the player is (or was last) driving, parked
 * close enough to the pile/kirana counter to load/unload from right now? `tractor`
 * is the stable tractor reference main.js already keeps (src/main.js
 * `tractorForShadows`) — the only vehicle in this game a trolley ever attaches to. */
export function isTrolleyNearby(tractor, position) {
  const trolley = tractor?.trolley;
  if (!trolley || !trolley.attached) return false;
  return trolley.group.position.distanceTo(position) < TROLLEY_NEARBY_RADIUS;
}
