import * as THREE from 'three';
import { getGLTFLoader } from './loaders.js';

// The bicycle under the player (3 Nov: the player starts mounted). player_cycle_v2.glb has
// its front toward +Z, origin between the wheels on the ground. One model, one child of the
// player group; it turns toward the movement direction and is hidden when on foot.
//
// Moving parts in TWO draw calls: tools/blender/build_player_cycle.py writes a part id into
// every vertex's COLOR_0 alpha (alpha = 1 - id/20). The vertex shader below reads it and
// spins the wheels, turns the cranks (pedals and feet stay level), steers fork + bar + front
// wheel about the real head-tube axis, and bends the placeholder rider's legs with two-bone
// IK. The geometry numbers below are copied from the builder: change one, change both.
const TURN_RATE = 8; // 1/s, exponential ease toward the heading
const HY = 0.355, FZ = 0.52, RZ = -0.52;          // axle height (= tyre radius), front / rear axle z
const BB = [0.275, -0.06];                        // bottom bracket (y, z)
const CROWN = [0, 0.724, 0.29];                   // a point on the steering axis
const AXIS = new THREE.Vector3(0, 0.914, -0.407).normalize(); // steering axis, up and back
const CRANK = 0.17;
const HIP = [1.045, -0.29];                       // (y, z)
const L1 = 0.46, L2 = 0.45;
const ANKLE = [0.075, -0.035];                    // ankle relative to pedal centre (dy, dz)
const GEAR = 44 / 18;                             // chainring / sprocket: wheel turns per crank turn
const MAX_STEER = 0.2;                            // rad: small, the hands sit on the grips
// Placeholder rider torso: the 2 m capsule is squashed to a seated height with its base on
// the saddle, set back over the saddle and leaning a little toward the bar. Goes when the
// real character arrives.
const SADDLE_TOP = 1.0, SADDLE_Z = -0.30, SEATED_HEIGHT = 0.9, SEATED_SLIM = 0.55, LEAN = 0.24;

// Riding feel (C4, 8 Nov). All numbers are deliberately small: this is a village cycle, not a stunt bike.
const MAX_LEAN = THREE.MathUtils.degToRad(12); // roll into a turn, cycle and rider together, about the tyre contact line
const LEAN_GAIN = 0.6;                          // fraction of the physical lean atan(v * yawRate / g)
const BOB = 0.014, SWAY = 0.03;                 // rider rise per pedal stroke (m) and torso side sway (rad), only while pedalling
const SPRING_W = 18, SPRING_Z = 0.35;           // bump spring: ~3 Hz, settles in a few bounces
const CAM_ROLL = 0.22, CAM_SHIFT = 0.25;        // camera rolls 22 % of the bike's lean (max ~2.6 deg), slides up to 0.25 m outward

const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();

/** A thumb-lever bicycle bell, procedural: the striker rattles against a steel dome in two quick bursts ("tring-tring").
 * Partials are a struck dome's inharmonic set, each a detuned pair so the ring beats a little like a real bell. */
function ringCycleBell(ctx, out) {
  const t0 = ctx.currentTime + 0.01;
  const f0 = 2350 * (0.98 + Math.random() * 0.04);
  const partials = [[1, 1, 0.55], [1.49, 0.55, 0.32], [2.42, 0.32, 0.18], [3.17, 0.18, 0.12]]; // ratio, gain, decay (s)
  const strikes = [];
  for (const [start, n] of [[0, 6], [0.4, 7]]) for (let k = 0; k < n; k++) strikes.push([t0 + start + k * 0.031 + Math.random() * 0.006, 1 - k * 0.06]);
  const end = strikes[strikes.length - 1][0] + 1.2;
  const bus = ctx.createGain();
  bus.gain.value = 0.11;
  bus.connect(out);
  for (const [ratio, g, decay] of partials) {
    for (const det of [-1, 1]) {
      const o = ctx.createOscillator(), a = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f0 * ratio + det * (2 + ratio * 1.5);
      a.gain.setValueAtTime(0, t0);
      for (const [t, v] of strikes) { a.gain.setTargetAtTime(g * v * 0.5, t, 0.002); a.gain.setTargetAtTime(0, t + 0.006, decay / 3); }
      o.connect(a).connect(bus);
      o.start(t0); o.stop(end);
    }
  }
}

/** Two-bone IK in the (y, z) plane, knee forward. Angles from straight down toward +z. Same as leg_ik() in the builder. */
function legIK(hy, hz, ty, tz) {
  const dz = tz - hz, dy = ty - hy;
  const d = Math.min(Math.hypot(dz, dy), (L1 + L2) * 0.995);
  const alpha = Math.atan2(dz, -dy);
  const beta = Math.acos(THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const t = alpha + beta;
  const ky = hy - L1 * Math.cos(t), kz = hz + L1 * Math.sin(t);
  return { t, s: Math.atan2(tz - kz, -(ty - ky)), ky, kz };
}

/** Pedal centre (y, z) for a side (+1 right, crank forward at rest) at crank angle a (same rotation as the shader). */
function pedal(side, a) {
  const z0 = side * CRANK, c = Math.cos(a), s = Math.sin(a);
  return [BB[0] + z0 * s, BB[1] + z0 * c];
}

const SHADER_HEAD = /* glsl */ `
uniform vec4 cyA;      // front spin, rear spin, crank, steer
uniform vec4 cyLeg;    // thigh delta R, thigh delta L, shin-relative delta R, shin-relative delta L
uniform vec4 cyPed;    // pedal offset (y, z) right, (y, z) left
uniform vec4 cyKnee;   // rest knee (y, z) right, (y, z) left
uniform float cyRider;
vec3 cyRotX(vec3 v, vec2 piv, float a) {          // piv = (y, z); a > 0 turns -y toward +z
  vec2 d = vec2(v.y - piv.x, v.z - piv.y);
  float c = cos(a), s = sin(a);
  return vec3(v.x, piv.x + d.x * c + d.y * s, piv.y + d.y * c - d.x * s);
}
vec3 cyRotN(vec3 n, float a) { float c = cos(a), s = sin(a); return vec3(n.x, n.y * c + n.z * s, n.z * c - n.y * s); }
vec3 cyRodr(vec3 v, vec3 k, float a) { return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a)); }
void cyPose(inout vec3 p, inout vec3 n, float pid) {
  const vec3 CR = vec3(${CROWN.join(', ')});
  const vec3 AX = vec3(${AXIS.x.toFixed(5)}, ${AXIS.y.toFixed(5)}, ${AXIS.z.toFixed(5)});
  bool right = p.x >= 0.0;
  if (pid > 5.5 && cyRider < 0.5) { p = vec3(0.0, 0.5, 0.0); return; }
  if (pid == 1.0) { p = cyRotX(p, vec2(${HY}, ${FZ}), cyA.x); n = cyRotN(n, cyA.x); }
  if (pid == 2.0) { p = cyRotX(p, vec2(${HY}, ${RZ}), cyA.y); n = cyRotN(n, cyA.y); }
  if (pid == 4.0) { p = cyRotX(p, vec2(${BB.join(', ')}), cyA.z); n = cyRotN(n, cyA.z); }
  if (pid == 5.0 || pid == 9.0) { vec2 o = right ? cyPed.xy : cyPed.zw; p.yz += o; }
  if (pid == 8.0) {
    vec2 k = right ? cyKnee.xy : cyKnee.zw;
    float r = right ? cyLeg.z : cyLeg.w;
    p = cyRotX(p, k, r); n = cyRotN(n, r);
  }
  if (pid == 7.0 || pid == 8.0) {
    float t = right ? cyLeg.x : cyLeg.y;
    p = cyRotX(p, vec2(${HIP.join(', ')}), t); n = cyRotN(n, t);
  }
  if (pid == 1.0 || pid == 3.0 || pid == 10.0) { p = CR + cyRodr(p - CR, AX, cyA.w); n = cyRodr(n, AX, cyA.w); }
}
`;

function animateMaterial(m, uniforms) {
  const mat = m.clone();
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SHADER_HEAD}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
vec3 cyP = vec3(position);
#ifdef USE_COLOR_ALPHA
cyPose(cyP, objectNormal, floor((1.0 - color.a) * 20.0 + 0.5));
#endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = cyP;');
  };
  mat.customProgramCacheKey = () => 'playerCycle';
  return mat;
}

export function createPlayerCycle(playerGroup) {
  const holder = new THREE.Group();
  holder.name = 'player_cycle';
  holder.visible = false;
  playerGroup.add(holder);
  // holder: heading (y) here, and cyclistEvents.js writes its speed-breaker jolt into holder.position.y.
  // rig: lean (z) and bump pitch (x) / bump lift, about the ground point between the wheels.
  const rig = new THREE.Group();
  rig.name = 'player_cycle_rig';
  holder.add(rig);
  let heading = 0, steer = 0, dist = 0;
  let lastX = playerGroup.position.x, lastZ = playerGroup.position.z, lastY = playerGroup.position.y;
  let speed = 0, yawRate = 0, lean = 0, camLean = 0, crank = 0, pedalAmt = 0, ridingT = 0;
  let bumpY = 0, bumpV = 0, pitch = 0, pitchV = 0, roughT = 0;
  // Ground contact (9 Nov, her playtest: wheels went into the ground). probe(x, z, y) = main.js groundHeightAt. The rig is pitched to the
  // slope between the two tyre contact points and lifted so neither tyre goes under the ground; rises are taken at once, falls eased.
  let probe = null, slopePitch = 0, groundLift = 0, minWheelClear = 0;
  let lastBell = -1;
  const body = playerGroup.children.find((c) => c.isMesh && c.geometry?.type === 'CapsuleGeometry');
  const standY = body?.position.y ?? 1;
  const standH = body ? (body.geometry.computeBoundingBox(), body.geometry.boundingBox.max.y - body.geometry.boundingBox.min.y) : 2;

  const uniforms = {
    cyA: { value: new THREE.Vector4() },
    cyLeg: { value: new THREE.Vector4() },
    cyPed: { value: new THREE.Vector4() },
    cyKnee: { value: new THREE.Vector4() },
    cyRider: { value: body ? 1 : 0 },
  };
  // Rest pose (crank angle 0) is how the builder modelled the legs.
  const rest = [1, -1].map((side) => {
    const [py, pz] = pedal(side, 0);
    return legIK(HIP[0], HIP[1], py + ANKLE[0], pz + ANKLE[1]);
  });
  uniforms.cyKnee.value.set(rest[0].ky, rest[0].kz, rest[1].ky, rest[1].kz);

  function pose(crankA) {
    const u = uniforms;
    const legs = [1, -1].map((side, i) => {
      const [py, pz] = pedal(side, crankA);
      const [ry, rz] = pedal(side, 0);
      const ik = legIK(HIP[0], HIP[1], py + ANKLE[0], pz + ANKLE[1]);
      const dt = ik.t - rest[i].t;
      return { oy: py - ry, oz: pz - rz, dt, ds: ik.s - rest[i].s - dt };
    });
    u.cyPed.value.set(legs[0].oy, legs[0].oz, legs[1].oy, legs[1].oz);
    u.cyLeg.value.set(legs[0].dt, legs[1].dt, legs[0].ds, legs[1].ds);
  }
  pose(0);

  getGLTFLoader().loadAsync('assets/models/player_cycle_v2.glb').then((gltf) => {
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const out = new THREE.Group();
    root.traverse((o) => {
      if (!o.isMesh) return;
      // Bake the (meshopt-quantised) node transform into float positions, so the shader's pivots are in model metres.
      const g = o.geometry.clone();
      for (const k of ['position', 'normal']) {
        const a = g.getAttribute(k);
        if (!a) continue;
        const f = new Float32Array(a.count * 3);
        for (let i = 0; i < a.count; i++) { f[i * 3] = a.getX(i); f[i * 3 + 1] = a.getY(i); f[i * 3 + 2] = a.getZ(i); }
        g.setAttribute(k, new THREE.BufferAttribute(f, 3));
      }
      g.applyMatrix4(o.matrixWorld);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, animateMaterial(o.material, uniforms));
      m.name = o.name;
      m.castShadow = false;
      m.receiveShadow = true;
      out.add(m);
    });
    rig.add(out);
  }).catch((e) => console.warn('player cycle model failed', e));

  /** Kick the bump springs: lift (m/s) and nose pitch (rad/s, negative = nose up). */
  function kick(lift, nose) { bumpV += lift; pitchV += nose; }

  return {
    get ridingSeconds() { return ridingT; },
    /** Ring the handlebar bell through the game's master gain (so mute and volume apply). */
    ringBell(audio) {
      if (!audio?.started || !audio.ctx || !audio.master) return false;
      if (audio.ctx.currentTime - lastBell < 0.35) return false;
      lastBell = audio.ctx.currentTime;
      try { ringCycleBell(audio.ctx, audio.master); } catch (e) { /* sound must never break the game */ }
      return true;
    },
    /**
     * Call every frame. moveX/moveZ is the world-space step direction (0 when standing).
     * opts.pedalling: W is held and the cycle is rolling (the cranks freewheel otherwise).
     * opts.surface: surfaces.js SURFACE value under the cycle ('dirt', 'soil', ... ) for the rough-ground judder.
     */
    update(dt, onCycle, moveX, moveZ, opts = {}) {
      holder.visible = onCycle;
      // Distance actually travelled (after collision), so the wheels never spin against a wall.
      const px = playerGroup.position.x, pz = playerGroup.position.z, py = playerGroup.position.y;
      let step = Math.hypot(px - lastX, pz - lastZ);
      const dy = py - lastY;
      lastX = px; lastZ = pz; lastY = py;
      const teleport = step > 3;
      if (!onCycle || teleport) step = 0;   // teleports and on-foot moves do not turn the wheels
      dist += step;

      if (!onCycle) {
        if (body) { body.scale.set(1, 1, 1); body.position.set(0, standY, 0); body.rotation.set(0, 0, 0); }
        speed = 0; yawRate = 0; lean = 0; camLean = 0; bumpY = bumpV = pitch = pitchV = 0; pedalAmt = 0; ridingT = 0;
        rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0);
        return;
      }
      const k1 = (r) => 1 - Math.exp(-r * dt);
      if (dt > 0) speed += (step / dt - speed) * k1(10);
      if (speed > 1.5) ridingT += dt;

      let turnRate = 0;
      if (moveX * moveX + moveZ * moveZ >= 1e-4) {
        const target = Math.atan2(moveX, moveZ);
        let d = target - heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const turn = d * k1(TURN_RATE);
        heading += turn;
        turnRate = dt > 0 ? turn / dt : 0;
        if (Math.abs(turnRate) > 6) turnRate = 0; // a snap (pull-away re-aim, respawn) is not a carved turn
        holder.rotation.y = heading;
      }
      yawRate += (turnRate - yawRate) * k1(8);
      const steerTarget = THREE.MathUtils.clamp(turnRate * 0.06, -MAX_STEER, MAX_STEER);
      steer += (steerTarget - steer) * k1(10);

      // Lean: positive yawRate turns left (+heading swings forward toward +x); leaning left is a negative z roll.
      const leanTarget = THREE.MathUtils.clamp(Math.atan(speed * yawRate / 9.81) * LEAN_GAIN, -MAX_LEAN, MAX_LEAN);
      lean += (leanTarget - lean) * k1(5);
      camLean += (lean - camLean) * k1(2.2); // the camera follows the lean late: that lag is the turn feel

      // Wheels always turn with the ground; the cranks only while pedalling (freewheel), and drift level when coasting.
      const wheelA = -dist / HY;
      const pedalling = !!opts.pedalling && speed > 0.2;
      pedalAmt += ((pedalling ? 1 : 0) - pedalAmt) * k1(pedalling ? 6 : 3);
      if (pedalling) crank -= step / HY / GEAR;
      else {
        const level = Math.round(crank / Math.PI) * Math.PI;
        crank += (level - crank) * k1(2.5);
      }
      crank %= Math.PI * 2;
      uniforms.cyA.value.set(wheelA % (Math.PI * 2), wheelA % (Math.PI * 2), crank, steer);
      pose(crank);

      // Bumps: a sudden change of ground height under the cycle (kerb, platform edge, dip lip), plus a fine judder on kachcha ground.
      if (!teleport && speed > 0.8 && Math.abs(dy) > 0.012) {
        const h = Math.min(Math.abs(dy), 0.2);
        kick(h * 7 * Math.min(1, speed / 3), -h * 3 * Math.sign(dy));
      }
      const rough = opts.surface === 'soil' ? 1 : opts.surface === 'dirt' ? 0.45 : 0;
      if (rough > 0 && speed > 1) {
        roughT -= dt;
        if (roughT <= 0) {
          roughT = 0.09 + Math.random() * 0.16;
          const v = Math.min(1, speed / 7.5) * rough;
          kick((Math.random() * 0.06 + 0.02) * v, (Math.random() - 0.5) * 0.12 * v);
        }
      }
      const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let i = 0; i < sub; i++) {
        const h = dt / sub;
        bumpV += (-SPRING_W * SPRING_W * bumpY - 2 * SPRING_Z * SPRING_W * bumpV) * h; bumpY += bumpV * h;
        pitchV += (-SPRING_W * SPRING_W * pitch - 2 * SPRING_Z * SPRING_W * pitchV) * h; pitch += pitchV * h;
      }
      bumpY = THREE.MathUtils.clamp(bumpY, -0.03, 0.06); pitch = THREE.MathUtils.clamp(pitch, -0.05, 0.05);
      if (probe && !teleport) {
        // Tyre contact heights under both wheels, relative to the player's own ground height (py).
        const sh = Math.sin(heading), ch = Math.cos(heading);
        const gF = probe(px + sh * FZ, pz + ch * FZ, py) - py, gR = probe(px + sh * RZ, pz + ch * RZ, py) - py;
        const slope = THREE.MathUtils.clamp(Math.atan2(gF - gR, FZ - RZ), -0.35, 0.35);
        slopePitch += (-slope - slopePitch) * k1(20); // positive rotation.x tips the front down, so a rising front is negative
        // Lift so BOTH tyres clear the ground at the pitch actually drawn (the pitch is eased, so a plain average sagged a tyre on a kerb).
        const pit = pitch + slopePitch;
        const want = Math.max(gF + FZ * Math.sin(pit), gR + RZ * Math.sin(pit)) - Math.max(0, bumpY);
        groundLift = want > groundLift ? want : groundLift + (want - groundLift) * k1(25); // a rise lifts at once, a drop is followed
        minWheelClear = Math.min(groundLift + Math.max(0, bumpY) - FZ * Math.sin(pit) - gF, groundLift + Math.max(0, bumpY) - RZ * Math.sin(pit) - gR);
      } else if (teleport) { slopePitch = 0; groundLift = 0; }
      rig.position.set(0, groundLift + Math.max(0, bumpY), 0); // the suspension dip is never drawn below the ground
      rig.rotation.set(pitch + slopePitch, 0, -lean, 'ZXY');

      if (body) {
        // The seated torso rides on the same chain as the cycle: jolt, heading, lean, bump, then the seat offset, bob and sway.
        const k = SEATED_HEIGHT / standH;
        body.scale.set(SEATED_SLIM, k, SEATED_SLIM);
        const bob = pedalAmt * BOB * Math.sin(crank * 2) ** 2;
        const sway = pedalAmt * SWAY * Math.sin(crank);
        _m.makeTranslation(0, holder.position.y + groundLift + Math.max(0, bumpY), 0);
        _m.multiply(_m2.makeRotationY(heading));
        _m.multiply(_m2.makeRotationFromEuler(_e.set(pitch + slopePitch, 0, -lean + sway, 'ZXY')));
        _m.multiply(_m2.makeTranslation(0, SADDLE_TOP + bob, SADDLE_Z));
        _m.multiply(_m2.makeRotationX(LEAN));
        _m.multiply(_m2.makeTranslation(0, SEATED_HEIGHT / 2, 0));
        _m.decompose(body.position, _q, _s);
        body.quaternion.copy(_q);
      }
    },
    /**
     * Call right AFTER the camera rig's own update (which rebuilds the camera from scratch every frame, so nothing here
     * accumulates). Rolls the view a little into the turn, slides it outward as the lean builds (the late camLean is the
     * lag), and passes a fraction of each bump through. Never call it when the rig is frozen.
     */
    setGroundProbe(fn) { probe = fn; }, // (x, z, y) => ground height; main.js passes groundHeightAt
    get wheelClearance() { return minWheelClear; }, // metres: lowest tyre contact above (+) or below (-) the ground, last frame
    applyCamera(camera, active) {
      if (!active || !holder.visible) return;
      const leanLeft = camLean; // > 0 while turning left
      camera.translateX(leanLeft / MAX_LEAN * CAM_SHIFT); // turning left, the camera sits a little to the right of the line: it has not caught up yet
      camera.position.y += (bumpY + holder.position.y) * 0.35;
      camera.rotateZ(leanLeft * CAM_ROLL + pedalAmt * 0.002 * Math.sin(crank));
    },
  };
}
