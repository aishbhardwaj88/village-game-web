import * as THREE from 'three';

// Pedalling legs for a placeholder rider on the code-built bike (buildBikeGroup): two thighs, two shins and two pedals, plain boxes,
// no textures. Legs sit 180 deg apart, hip and knee follow the pedals' circle (two-bone IK, knee forward), and the crank turns with
// wheel speed: one crank turn = GEAR wheel turns. Still when stopped. The player's own cycle has its own rig (src/playerCycle.js).
const GEAR = 44 / 18;      // chainring / sprocket, same as src/playerCycle.js
const CRANK = 0.17;        // m, crank length
const THIGH = 0.5, SHIN = 0.5, LEG_X = 0.15;
const geo = new THREE.BoxGeometry(1, 1, 1);
const trouser = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.9 });
const skin = new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.85 });
const pedalMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.6, metalness: 0.2 });

function segment(parent, mat, w) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; parent.add(m);
  m.userData.w = w;
  return m;
}
// A box between two points in the (y, z) plane at a fixed x.
function place(m, x, y1, z1, y2, z2) {
  const dy = y2 - y1, dz = z2 - z1, len = Math.hypot(dy, dz) || 1e-4, w = m.userData.w;
  m.scale.set(w, w, len);
  m.position.set(x, (y1 + y2) / 2, (z1 + z2) / 2);
  m.rotation.set(Math.atan2(-dy, dz), 0, 0);
}

/** bb = [y, z] bottom bracket, hip = [y, z] (rider frame, +z forward). Returns { update(speed, dt), crank }. */
export function createRiderLegs(parent, bb, hip, wheelR) {
  const g = new THREE.Group(); g.name = 'rider_legs'; parent.add(g);
  const legs = [1, -1].map((side) => ({
    side, thigh: segment(g, trouser, 0.13), shin: segment(g, trouser, 0.1), foot: segment(g, skin, 0.09), pedal: segment(g, pedalMat, 0.1),
  }));
  const state = { crank: 0 };
  function update(speed, dt) {
    if (speed > 0.2) state.crank -= (speed * dt) / wheelR / GEAR; // wheel speed -> crank speed; still when stopped
    for (const l of legs) {
      const a = state.crank + (l.side > 0 ? 0 : Math.PI);
      const py = bb[0] + CRANK * Math.sin(a), pz = bb[1] + CRANK * Math.cos(a); // pedal centre
      const ay = py + 0.07, az = pz - 0.03;                                       // ankle just above the pedal
      let dy = ay - hip[0], dz = az - hip[1];
      const d = Math.min(Math.hypot(dy, dz), THIGH + SHIN - 0.005);
      const ang = Math.atan2(dz, -dy);                                            // from straight down toward +z
      const inner = Math.acos(THREE.MathUtils.clamp((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d), -1, 1));
      const t = ang + inner;                                                      // thigh angle: knee forward
      const ky = hip[0] - THIGH * Math.cos(t), kz = hip[1] + THIGH * Math.sin(t);
      const x = l.side * LEG_X;
      place(l.thigh, x, hip[0], hip[1], ky, kz);
      place(l.shin, x, ky, kz, ay, az);
      place(l.foot, x, ay, az, py + 0.03, pz + 0.08);                             // foot rests on the pedal, toes forward
      place(l.pedal, l.side * (CRANK + 0.02), py, pz - 0.05, py, pz + 0.05);
    }
  }
  update(0, 0);
  return { update, state, group: g };
}
