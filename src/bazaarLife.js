import * as THREE from 'three';
import { resolveMove } from './movement.js';
import { BAZAAR_UNITS, bazaarUnitCx, BAZAAR_FRONT_Z, BAZAAR_WEST_X, BAZAAR_EAST_X, CHOWK_TEA_POS } from './bazaar.js';

/**
 * NPC life in the bazaar (this task's item 2) — reuses the same waypoint-loop idea
 * as src/npcRoutines.js (createWaypointLoop/createStirLoop), but as ONE shared
 * InstancedMesh instead of one Mesh per NPC ("keep them cheap and instanced where
 * possible", the brief's own words): a shopkeeper at each of the 8 bazaar counters
 * (stationary, a small per-trade idle sway), 4 villagers walking hand-picked loops
 * along the row frontage/chowk approach (same "chosen paths, not runtime avoidance"
 * philosophy as the existing child NPC, plus a resolveCollisions() safety net per
 * frame — the brief's "must respect the collision system"), and one seated at the
 * chowk tea stall's own bench. All 13 share one capsule geometry/Material, coloured
 * per-instance via InstancedMesh.setColorAt (a builtin, independent of the geometry's
 * own vertex-colour attribute), for exactly one draw call regardless of count.
 */
const NPC_RADIUS = 0.32;
const NPC_HEIGHT = 1.7;

const SHOPKEEPER_TINTS = [0xb08a5a, 0x6a8a5a, 0x8a5a6a, 0x5a7a8a, 0x9a7a4a, 0x7a5a8a, 0x9a9690, 0x8a6a3a];
const VILLAGER_TINTS = [0x4a6a8a, 0xa06a4a, 0x6a4a8a, 0x8a8a4a];
const SEATED_TINT = 0x7a5a4a;

// A small lean-and-circle sway per trade (createStirLoop's own technique, applied
// per-instance here) — varied rate/amount so the row doesn't read as one repeated
// idle animation, "appropriate to the trade" per the brief without needing bespoke
// per-trade animation code.
const IDLE_BY_TRADE = {
  kirana: { rate: 1.0, amount: 0.07 }, // minding the counter
  sabzi: { rate: 1.8, amount: 0.16 }, // arranging produce
  medical: { rate: 0.8, amount: 0.05 },
  tailor: { rate: 2.6, amount: 0.09 }, // small, quick stitching motion
  barber: { rate: 2.0, amount: 0.13 }, // snipping
  mobile: { rate: 0.6, amount: 0.05 }, // looking down at a phone
  bangle: { rate: 1.4, amount: 0.11 },
  sweet: { rate: 1.6, amount: 0.13 }, // stirring/ladling
};

const SHOPKEEPER_DEPTH = 2.0; // behind the counter collider (which sits ~0.6-1.2m out from the front), clear of it

const VILLAGER_LOOPS = [
  [{ x: BAZAAR_WEST_X + 4, z: 9 }, { x: BAZAAR_WEST_X + 16, z: 9 }],
  [{ x: BAZAAR_WEST_X + 20, z: 9 }, { x: BAZAAR_WEST_X + 32, z: 9 }],
  [{ x: BAZAAR_EAST_X - 4, z: 9 }, { x: BAZAAR_EAST_X - 16, z: 9 }],
  [{ x: CHOWK_TEA_POS.x + 4, z: 7.5 }, { x: CHOWK_TEA_POS.x + 2, z: 18 }],
];

const SPEED = 1.1;
const PAUSE_SECONDS = 2.5;

export function createBazaarLife() {
  const geometry = new THREE.CapsuleGeometry(NPC_RADIUS, NPC_HEIGHT - NPC_RADIUS * 2, 4, 8);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const shopkeeperCount = BAZAAR_UNITS.length;
  const villagerCount = VILLAGER_LOOPS.length;
  const total = shopkeeperCount + villagerCount + 1; // +1 seated

  const mesh = new THREE.InstancedMesh(geometry, material, total);
  mesh.name = 'bazaar_life';
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const _pos = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _scale = new THREE.Vector3(1, 1, 1);
  const _euler = new THREE.Euler();
  const _mat = new THREE.Matrix4();
  const _color = new THREE.Color();

  function setInstance(index, x, y, z, rotY) {
    _pos.set(x, y, z);
    _euler.set(0, rotY, 0);
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    mesh.setMatrixAt(index, _mat);
  }

  const shopkeepers = BAZAAR_UNITS.map((unit, idx) => ({
    index: idx,
    x: bazaarUnitCx(idx),
    z: BAZAAR_FRONT_Z + SHOPKEEPER_DEPTH,
    idle: IDLE_BY_TRADE[unit.trade] || { rate: 1, amount: 0.1 },
    t: idx * 0.9, // phase offset so they don't all sway in lockstep
  }));
  shopkeepers.forEach((s, i) => {
    mesh.setColorAt(s.index, _color.setHex(SHOPKEEPER_TINTS[i % SHOPKEEPER_TINTS.length]));
    setInstance(s.index, s.x, NPC_HEIGHT / 2, s.z, Math.PI); // facing south, toward the lane
  });

  const villagers = VILLAGER_LOOPS.map((waypoints, i) => {
    const index = shopkeeperCount + i;
    mesh.setColorAt(index, _color.setHex(VILLAGER_TINTS[i % VILLAGER_TINTS.length]));
    const pos = new THREE.Vector3(waypoints[0].x, 0, waypoints[0].z);
    setInstance(index, pos.x, NPC_HEIGHT / 2, pos.z, 0);
    return { index, pos, rotY: 0, waypointIndex: 0, waypoints, pauseTimer: i * 0.6 };
  });

  const seatedIndex = shopkeeperCount + villagerCount;
  // Same bench src/bazaar.js buildChowkPlaza() places at CHOWK_TEA_POS.x-2.6, z+1.5.
  const seatedPos = { x: CHOWK_TEA_POS.x - 2.6, z: CHOWK_TEA_POS.z + 1.5 };
  mesh.setColorAt(seatedIndex, _color.setHex(SEATED_TINT));
  setInstance(seatedIndex, seatedPos.x, NPC_HEIGHT / 2 - 0.3, seatedPos.z, Math.PI * 0.3); // lowered a touch, "seated"

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;

  const _toTarget = new THREE.Vector3();

  function update(dt) {
    for (const s of shopkeepers) {
      s.t += dt * s.idle.rate;
      const wobble = Math.sin(s.t) * s.idle.amount;
      setInstance(s.index, s.x, NPC_HEIGHT / 2, s.z, Math.PI + wobble);
    }

    for (const v of villagers) {
      const target = v.waypoints[v.waypointIndex];
      _toTarget.set(target.x - v.pos.x, 0, target.z - v.pos.z);
      const dist = _toTarget.length();
      if (dist < 0.15) {
        v.pauseTimer += dt;
        if (v.pauseTimer >= PAUSE_SECONDS) {
          v.pauseTimer = 0;
          v.waypointIndex = (v.waypointIndex + 1) % v.waypoints.length;
        }
      } else {
        _toTarget.multiplyScalar(1 / dist);
        const step = Math.min(SPEED * dt, dist);
        // Structural fix (playtest, item 2) — the one swept resolver every
        // moving body in this game goes through now (see CLAUDE.md); the
        // hand-picked waypoints already route clear of counters/kerbs, this is
        // the same safety net src/npcRoutines.js's own routines rely on.
        resolveMove(v.pos, _toTarget.x * step, _toTarget.z * step, NPC_RADIUS, []);
        const targetYaw = Math.atan2(_toTarget.x, _toTarget.z);
        let diff = targetYaw - v.rotY;
        diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
        v.rotY += diff * Math.min(1, dt * 4);
      }
      setInstance(v.index, v.pos.x, NPC_HEIGHT / 2, v.pos.z, v.rotY);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}
