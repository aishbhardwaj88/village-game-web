import * as THREE from 'three';
import { batchLiveMesh } from './placeBatch.js';
import { keepOnGround, markFigure, groundAt, sceneOf, sliceSpent } from './standOn.js';
import { followGround } from './moverGround.js';
import { ANCHORS } from './anchors.js';
import { ROUTES } from './npcRoutines.js';
import { resolveMove } from './movement.js';
import { BAZAAR_UNITS, bazaarUnitCx, BAZAAR_FRONT_Z, BAZAAR_WEST_X, BAZAAR_EAST_X, CHOWK_TEA_POS, CHOWK_FURN_ORIGIN, bazaarXZ, BAZAAR_YAW } from './bazaar.js';

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
const VILLAGER_TINTS = [0x4a6a8a, 0xa06a4a, 0x6a4a8a, 0x8a8a4a, 0x7a3a3a, 0x3a6a5a];
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

const SHOP_FLOOR_SINK = 0.015; // see settleOne
const SHOPKEEPER_DEPTH = 3.0; // behind the counter collider (which sits ~0.6-1.2m out from the front), clear of it

const LH = ANCHORS.halwai; // hero-lane loops are offsets from the halwai anchor, so moving it carries them
const VILLAGER_LOOPS = [
  [bazaarXZ(BAZAAR_WEST_X + 8, BAZAAR_FRONT_Z - 3.5), bazaarXZ(BAZAAR_WEST_X + 18, BAZAAR_FRONT_Z - 3.5)],
  [bazaarXZ(BAZAAR_WEST_X + 20, BAZAAR_FRONT_Z - 3.5), bazaarXZ(BAZAAR_WEST_X + 32, BAZAAR_FRONT_Z - 3.5)],
  [bazaarXZ(BAZAAR_EAST_X - 4, BAZAAR_FRONT_Z - 3.5), bazaarXZ(BAZAAR_EAST_X - 16, BAZAAR_FRONT_Z - 3.5)],
  [{ x: CHOWK_TEA_POS.x + 4, z: CHOWK_TEA_POS.z - 0.7 }, { x: CHOWK_TEA_POS.x + 4, z: CHOWK_TEA_POS.z + 1.8 }], // stays inside the map's square tea stall compound wall (z +1.2..+7)
  // village lane between the house and the school: neighbours out on errands
  [{ x: LH.x - 2.5, z: LH.z + 9 }, { x: LH.x - 2.5, z: LH.z + 10.6 }], // shortened: the map's gher yard walls stand from z LH.z+12
  [{ x: LH.x - 6.5, z: LH.z + 24 }, { x: LH.x - 6.5, z: LH.z + 29 }],
  [{ x: LH.x - 5, z: LH.z - 3 }, { x: LH.x - 5, z: LH.z - 7 }],
  // a few more walkers so the bazaar frontage and lane are not empty
  [bazaarXZ(BAZAAR_WEST_X + 10, BAZAAR_FRONT_Z - 2.5), bazaarXZ(BAZAAR_WEST_X + 26, BAZAAR_FRONT_Z - 2.5)], // z 10: the shopfront props (awning poles, benches) stand along z 10.6-13.3; tools/collision-test.js proves this strip is walkable
  [bazaarXZ(BAZAAR_EAST_X - 10, BAZAAR_FRONT_Z - 2.5), bazaarXZ(BAZAAR_EAST_X - 26, BAZAAR_FRONT_Z - 2.5)],
  [{ x: LH.x - 6, z: LH.z }, { x: LH.x - 6.5, z: LH.z + 7 }],
  [{ x: LH.x - 8, z: LH.z + 37 }, { x: LH.x - 8, z: LH.z + 44 }], // west of the fence strip at x -47..-45
];

const SPEED = 1.1;
const PAUSE_SECONDS = 2.5;

export function createBazaarLife({ getExtraBoxes = () => [] } = {}) {
  const geometry = new THREE.CapsuleGeometry(NPC_RADIUS, NPC_HEIGHT - NPC_RADIUS * 2, 4, 8);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85 });
  const shopkeeperCount = BAZAAR_UNITS.length;
  const villagerCount = VILLAGER_LOOPS.length;
  const total = shopkeeperCount + villagerCount + 1; // +1 seated

  const mesh = new THREE.InstancedMesh(geometry, material, total);
  mesh.name = 'bazaar_life';
  markFigure(mesh); batchLiveMesh(mesh);
  const gy = new Float32Array(total); // per-figure lift onto the surface under its feet (src/standOn.js)
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const _pos = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _scale = new THREE.Vector3(1, 1, 1);
  const _euler = new THREE.Euler();
  const _mat = new THREE.Matrix4();
  const _color = new THREE.Color();

  function setInstance(index, x, y, z, rotY) {
    _pos.set(x, y + gy[index], z);
    _euler.set(0, rotY, 0);
    _quat.setFromEuler(_euler);
    _mat.compose(_pos, _quat, _scale);
    mesh.setMatrixAt(index, _mat);
  }

  const shopkeepers = BAZAAR_UNITS.map((unit, idx) => ({
    index: idx,
    ...bazaarXZ(bazaarUnitCx(idx), BAZAAR_FRONT_Z + SHOPKEEPER_DEPTH),
    idle: IDLE_BY_TRADE[unit.trade] || { rate: 1, amount: 0.1 },
    t: idx * 0.9, // phase offset so they don't all sway in lockstep
  }));
  shopkeepers.forEach((s, i) => {
    mesh.setColorAt(s.index, _color.setHex(SHOPKEEPER_TINTS[i % SHOPKEEPER_TINTS.length]));
    setInstance(s.index, s.x, NPC_HEIGHT / 2, s.z, Math.PI + BAZAAR_YAW); // facing south, toward the lane (the row is turned)
  });

  VILLAGER_LOOPS.forEach((waypoints, i) => ROUTES.push({ kind: 'loop', name: `bazaar_villager_${i}`, waypoints, radius: NPC_RADIUS }));
  const villagers = VILLAGER_LOOPS.map((waypoints, i) => {
    const index = shopkeeperCount + i;
    mesh.setColorAt(index, _color.setHex(VILLAGER_TINTS[i % VILLAGER_TINTS.length]));
    const pos = new THREE.Vector3(waypoints[0].x, 0, waypoints[0].z);
    setInstance(index, pos.x, NPC_HEIGHT / 2, pos.z, 0);
    return { index, pos, rotY: 0, waypointIndex: 0, waypoints, pauseTimer: i * 0.6 };
  });

  const seatedIndex = shopkeeperCount + villagerCount;
  // Same bench src/bazaar.js buildChowkPlaza() places at CHOWK_TEA_POS.x-2.6, z+1.5.
  const seatedPos = { x: CHOWK_FURN_ORIGIN.x - 2.6, z: CHOWK_FURN_ORIGIN.z + 2.9 }; // 1.4 m clear of a plaza prop he sank 9.6 cm into
  mesh.setColorAt(seatedIndex, _color.setHex(SEATED_TINT));
  setInstance(seatedIndex, seatedPos.x, NPC_HEIGHT / 2, seatedPos.z, Math.PI * 0.3); // the bench that stood here is gone from the map: he stands, on the ground

  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;

  const _toTarget = new THREE.Vector3();
    const FOOT = [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22], [0.16, 0.16], [-0.16, 0.16], [0.16, -0.16], [-0.16, -0.16]]; // the capsule's 12 cm foot band is 0.23 m across (as tools/feet-check.js measures): 0.3 m probes lifted him onto a step he does not touch
  function settleOne(scene, i, quick = false) { // absolute, not cumulative: a shelf or counter edge must not ratchet a figure upwards
    const p = i < shopkeeperCount ? shopkeepers[i] : i < seatedIndex ? villagers[i - shopkeeperCount].pos : seatedPos;
    const g0 = groundAt(scene, p.x, p.z, 0, !quick);
    if (quick) { gy[i] = Math.min(0.35, Math.max(0, g0)); return; } // per-frame walker re-seat: centre point only, on the cached index
    let g = g0; // the round foot is wider than the centre point: take the highest surface under it (road bumps, kerbs)
    for (const [dx, dz] of FOOT) g = Math.max(g, groundAt(scene, p.x + dx, p.z + dz, g0));
    gy[i] = Math.min(0.35, Math.max(0, g));
    // Shopkeepers stand on the bazaar_row.glb shop floor (top y 0.061): seated 1.5 cm into it, half of tools/feet-check.js's
    // 3 cm band and invisible behind the counter, so the figure's lowest point stays inside the 5 cm world-validator check 2 band.
    if (i < shopkeeperCount) gy[i] = Math.max(0, gy[i] - SHOP_FLOOR_SINK);
  }
  let settleAt = 0;
  keepOnGround(mesh, (scene) => { // time-sliced: 3 ms a frame, resumes where it stopped (src/standOn.js)
    const dl = performance.now() + 3;
    for (; settleAt < total; settleAt++) { if (sliceSpent(dl)) return; settleOne(scene, settleAt); }
    settleAt = 0;
  });
  let rr = 0, lastSeat = 0, seatedGy = NaN;

  function update(dt) {
    for (const s of shopkeepers) {
      s.t += dt * s.idle.rate;
      const wobble = Math.sin(s.t) * s.idle.amount;
      setInstance(s.index, s.x, NPC_HEIGHT / 2, s.z, Math.PI + BAZAAR_YAW + wobble);
    }

    const scW = sceneOf(mesh); // G3: each walker's feet follow the surface under it every frame (cached index, re-probed after 12 cm)
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
        resolveMove(v.pos, _toTarget.x * step, _toTarget.z * step, NPC_RADIUS, getExtraBoxes());
        if (scW) gy[v.index] = Math.min(0.35, Math.max(0, followGround(v, scW, v.pos.x, v.pos.z, gy[v.index])));
        const targetYaw = Math.atan2(_toTarget.x, _toTarget.z);
        let diff = targetYaw - v.rotY;
        diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
        v.rotY += diff * Math.min(1, dt * 4);
      }
      setInstance(v.index, v.pos.x, NPC_HEIGHT / 2, v.pos.z, v.rotY);
    }
    // Static seated figure: written again only when the settle pass moved his ground height (event-driven, was every frame).
    if (gy[seatedIndex] !== seatedGy) { seatedGy = gy[seatedIndex]; setInstance(seatedIndex, seatedPos.x, NPC_HEIGHT / 2, seatedPos.z, Math.PI * 0.3); }
    const nowMs = performance.now(); // walkers cross kerbs and road surfaces: re-seat one every 250 ms (wall clock, not frame count)
    const sc = nowMs - lastSeat > 250 ? sceneOf(mesh) : null;
    if (sc && villagers.length && (lastSeat = nowMs)) settleOne(sc, villagers[rr++ % villagers.length].index, true); // the plaza props stream in after the timed settles

    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}
