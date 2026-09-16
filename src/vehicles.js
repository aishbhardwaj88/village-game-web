import * as THREE from 'three';
import { texturedBox, getTiledMaterial } from './materials.js';

// One controller, four presets — differ only in these numbers plus a couple of
// per-kind cosmetic flourishes (lean/rock/sway/legs) in Vehicle.update() below.
// Sizes are real-world metres per item 4's brief.
export const VEHICLE_PRESETS = {
  bike: {
    kind: 'bike',
    label: 'Bicycle',
    body: { w: 0.7, h: 1.1, d: 2 },
    maxSpeed: 8.5,
    accel: 9,
    brakeDecel: 14, // "quick stop"
    turnRate: 2.2, // rad/s at full steering
    tint: 0x2a2a2a,
    cameraDistance: 5.5,
    cameraHeight: 2.0,
    mountRadius: 2.5,
  },
  tractor: {
    kind: 'tractor',
    label: 'Tractor',
    body: { w: 1.9, h: 2.6, d: 3.5 },
    maxSpeed: 3.2,
    accel: 2.2,
    brakeDecel: 3,
    turnRate: 0.55, // "wide turning circle"
    tint: 0xbf4026,
    cameraDistance: 8,
    cameraHeight: 3.2,
    mountRadius: 3.5,
    hasTrolley: true,
    trolley: { w: 2, h: 1.2, d: 3.5, tint: 0x8c6640 },
    towOffset: 2.6, // metres behind the tractor's tow point
  },
  cart: {
    kind: 'cart',
    label: 'Bullock cart',
    body: { w: 1.6, h: 1.5, d: 3 },
    maxSpeed: 1.8,
    accel: 1.1,
    brakeDecel: 2,
    turnRate: 0.7,
    tint: 0x805933,
    cameraDistance: 7,
    cameraHeight: 2.8,
    mountRadius: 3.5,
    hasBullocks: true,
    wheelRadius: 0.6, // 1.2m wheels
  },
};

function addWheel(group, radius, x, y, z) {
  const geometry = new THREE.CylinderGeometry(radius, radius, 0.18, 10);
  const material = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 });
  const wheel = new THREE.Mesh(geometry, material);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(x, y, z);
  wheel.castShadow = true;
  group.add(wheel);
  return wheel;
}

function buildBullock(tint) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 1.5), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);

  const legGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);
  const legs = [];
  for (const [lx, lz] of [
    [-0.2, 0.5],
    [0.2, 0.5],
    [-0.2, -0.5],
    [0.2, -0.5],
  ]) {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(lx, 0.35, lz);
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);
  }
  group.userData.legs = legs;
  return group;
}

export class Vehicle {
  constructor(presetKey, position, rotationY = 0) {
    this.preset = VEHICLE_PRESETS[presetKey];
    this.group = new THREE.Group();
    this.group.name = `vehicle_${presetKey}`;
    this.group.position.copy(position);
    this.group.rotation.y = rotationY;

    const p = this.preset;
    this.body = texturedBox(p.body.w, p.body.h, p.body.d, 'metal', { tint: p.tint, tileSize: 1 });
    this.body.position.y = p.body.h / 2;
    this.bodyPivot = new THREE.Group();
    this.bodyPivot.add(this.body);
    this.group.add(this.bodyPivot);

    if (p.kind === 'bike') {
      addWheel(this.group, 0.33, 0, 0.33, p.body.d / 2 - 0.35);
      addWheel(this.group, 0.33, 0, 0.33, -p.body.d / 2 + 0.35);
    } else if (p.kind === 'tractor') {
      addWheel(this.group, 0.55, p.body.w / 2 - 0.1, 0.55, p.body.d / 2 - 0.7);
      addWheel(this.group, 0.55, -(p.body.w / 2 - 0.1), 0.55, p.body.d / 2 - 0.7);
      addWheel(this.group, 0.75, p.body.w / 2, 0.75, -p.body.d / 2 + 0.9);
      addWheel(this.group, 0.75, -(p.body.w / 2), 0.75, -p.body.d / 2 + 0.9);

      const t = p.trolley;
      this.trolley = new THREE.Group();
      this.trolleyBody = texturedBox(t.w, t.h, t.d, 'wood', { tint: t.tint, tileSize: 1 });
      this.trolleyBody.position.y = t.h / 2;
      this.trolley.add(this.trolleyBody);
      this.trolleyWheels = [
        addWheel(this.trolley, 0.5, t.w / 2, 0.5, 0.3),
        addWheel(this.trolley, 0.5, -(t.w / 2), 0.5, 0.3),
      ];
      // Trolley is its own top-level object (not parented — it needs to lag behind
      // turns, not rotate rigidly with the tractor), so its spawn position has to be
      // computed in world space from the tractor's actual spawn transform, not (0,0,z)
      // as if the tractor were at the origin.
      this.trolleyYaw = rotationY;
      const backward = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
      const towPoint = this.group.localToWorld(new THREE.Vector3(0, 0, p.body.d / 2));
      this.trolley.position.copy(towPoint).addScaledVector(backward, p.towOffset);
      this.trolley.rotation.y = rotationY;
    } else if (p.kind === 'cart') {
      const r = p.wheelRadius;
      this.wheelL = addWheel(this.group, r, p.body.w / 2 + 0.05, r, -0.2);
      this.wheelR = addWheel(this.group, r, -(p.body.w / 2 + 0.05), r, -0.2);

      this.bullocks = [];
      for (const side of [-1, 1]) {
        const bullock = buildBullock(0xd9c9a8);
        bullock.position.set(side * 0.4, 0, p.body.d / 2 + 1.1);
        this.group.add(bullock);
        this.bullocks.push(bullock);
      }
    }

    this.speed = 0;
    this._time = Math.random() * 10;
    this.mounted = false;
  }

  /** World-space mount point (for proximity checks) is the group's own position. */
  get position() {
    return this.group.position;
  }

  addToScene(scene) {
    scene.add(this.group);
    if (this.trolley) scene.add(this.trolley);
  }

  /** input: {moveX, moveZ} in -1..1, same convention as the walking controller
   * (moveZ negative = throttle forward). dt in seconds. */
  update(dt, input) {
    const p = this.preset;
    this._time += dt;

    const throttle = -input.moveZ;
    const steer = input.moveX;

    const targetSpeed = throttle * p.maxSpeed;
    // Accelerating (speeding up toward the target) uses accel; slowing down, braking,
    // or reversing direction uses the faster brakeDecel — "quick stop" for the bike.
    const speedingUp = Math.abs(targetSpeed) > Math.abs(this.speed) && Math.sign(targetSpeed || 1) === Math.sign(this.speed || targetSpeed || 1);
    const rate = speedingUp ? p.accel : p.brakeDecel;
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, rate, dt);
    if (Math.abs(this.speed) < 0.02 && throttle === 0) this.speed = 0;

    // Wider vehicles turn more slowly at low speed (a stationary tractor can't pivot
    // like a bike) and turnRate itself caps how tight the circle ever gets.
    // Negative sign: with forward = (-sin(rotation.y), 0, -cos(rotation.y)), a
    // positive rotation.y sweeps forward.x negative (a left/counter-clockwise turn),
    // so steer=+1 (D, "turn right") needs to DECREASE rotation.y, not increase it.
    // Math.sign(this.speed || 1) still reverses this when backing up, same as before —
    // that's what makes reverse steer like a real vehicle backing up.
    const speedFactor = THREE.MathUtils.clamp(Math.abs(this.speed) / (p.maxSpeed * 0.4), 0, 1);
    const yawDelta = -steer * p.turnRate * speedFactor * dt * Math.sign(this.speed || 1);
    this.group.rotation.y += yawDelta;

    const forward = new THREE.Vector3(-Math.sin(this.group.rotation.y), 0, -Math.cos(this.group.rotation.y));
    this.group.position.addScaledVector(forward, this.speed * dt);

    if (p.kind === 'bike') {
      const lean = -steer * speedFactor * 0.35;
      this.bodyPivot.rotation.z = THREE.MathUtils.damp(this.bodyPivot.rotation.z, lean, 8, dt);
      const bump = Math.sin(this._time * 14) * 0.01 * speedFactor;
      this.body.position.y = p.body.h / 2 + bump;
    } else if (p.kind === 'tractor') {
      const rock = Math.sin(this._time * 6) * 0.02 * speedFactor;
      this.bodyPivot.rotation.z = rock;
      this.bodyPivot.rotation.x = Math.sin(this._time * 5.3) * 0.015 * speedFactor;
      this._updateTrolley(dt);
    } else if (p.kind === 'cart') {
      const sway = Math.sin(this._time * 3.2) * 0.06 * (0.3 + speedFactor);
      this.bodyPivot.rotation.z = sway;
      const wobble = Math.sin(this._time * 9) * 0.05 * speedFactor;
      if (this.wheelL) this.wheelL.rotation.z = wobble;
      if (this.wheelR) this.wheelR.rotation.z = -wobble;
      this._updateBullockLegs();
    }
  }

  /** Trolley follows the tractor's tow point with lag, hinging around that point
   * rather than rigidly mirroring the tractor's own heading. */
  _updateTrolley(dt) {
    const p = this.preset;
    const towPoint = this.group.localToWorld(new THREE.Vector3(0, 0, p.body.d / 2));
    // The chase target is always directly behind the tractor's *current* heading —
    // not derived from the trolley's own position (that fed back on itself and could
    // converge on an arbitrary direction). Lag comes only from the lerp below, which
    // is what reads as a hinge swinging into line under turning/braking.
    const backward = new THREE.Vector3(Math.sin(this.group.rotation.y), 0, Math.cos(this.group.rotation.y));
    const desired = towPoint.clone().addScaledVector(backward, p.towOffset);
    this.trolley.position.lerp(desired, Math.min(1, dt * 4));

    const dx = towPoint.x - this.trolley.position.x;
    const dz = towPoint.z - this.trolley.position.z;
    const targetYaw = Math.atan2(-dx, -dz);
    this.trolleyYaw = THREE.MathUtils.damp(this.trolleyYaw, targetYaw, 3, dt);
    this.trolley.rotation.y = this.trolleyYaw;
  }

  _updateBullockLegs() {
    const strideSpeed = 6 + Math.abs(this.speed) * 4;
    for (let i = 0; i < this.bullocks.length; i++) {
      const legs = this.bullocks[i].userData.legs;
      const phase = i * Math.PI;
      for (let l = 0; l < legs.length; l++) {
        const legPhase = (l % 2 === 0 ? 0 : Math.PI) + phase;
        legs[l].rotation.x = Math.sin(this._time * strideSpeed + legPhase) * 0.4 * Math.min(1, Math.abs(this.speed) * 2 + 0.1);
      }
    }
  }
}

/** Spawns the hero-zone vehicle set near the player's house, per
 * WorldData/vehicles.json positions (Tractor_M1, Bicycle_PlayersHouse,
 * BullockCart_PlayersHouse). Scooter isn't one of the four presets — skipped. */
export function spawnVehicles(scene) {
  const vehicles = [];

  const bike = new Vehicle('bike', new THREE.Vector3(-48, 0, 28), 0);
  bike.addToScene(scene);
  vehicles.push(bike);

  const tractor = new Vehicle('tractor', new THREE.Vector3(-51, 0, 25), Math.PI);
  tractor.addToScene(scene);
  vehicles.push(tractor);

  const cart = new Vehicle('cart', new THREE.Vector3(-36, 0, 50), Math.PI * 0.5);
  cart.addToScene(scene);
  vehicles.push(cart);

  return vehicles;
}
