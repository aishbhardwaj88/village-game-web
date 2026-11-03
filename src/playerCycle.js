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
  let heading = 0, steer = 0, dist = 0;
  let lastX = playerGroup.position.x, lastZ = playerGroup.position.z;
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
    holder.add(out);
  }).catch((e) => console.warn('player cycle model failed', e));

  return {
    /** Call every frame. moveX/moveZ is the world-space step direction (0 when standing). */
    update(dt, onCycle, moveX, moveZ) {
      holder.visible = onCycle;
      // Distance actually travelled (after collision), so the wheels never spin against a wall.
      const px = playerGroup.position.x, pz = playerGroup.position.z;
      let step = Math.hypot(px - lastX, pz - lastZ);
      lastX = px; lastZ = pz;
      if (!onCycle || step > 3) step = 0;   // teleports and on-foot moves do not turn the wheels
      dist += step;

      if (!onCycle) {
        if (body) { body.scale.set(1, 1, 1); body.position.set(0, standY, 0); body.rotation.set(0, 0, 0); }
        return;
      }
      let turnRate = 0;
      if (onCycle && moveX * moveX + moveZ * moveZ >= 1e-4) {
        const target = Math.atan2(moveX, moveZ);
        let d = target - heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const turn = d * (1 - Math.exp(-TURN_RATE * dt));
        heading += turn;
        turnRate = dt > 0 ? turn / dt : 0;
        holder.rotation.y = heading;
      }
      const steerTarget = THREE.MathUtils.clamp(turnRate * 0.06, -MAX_STEER, MAX_STEER);
      steer += (steerTarget - steer) * (1 - Math.exp(-10 * dt));

      // Rolling forward turns the top of each wheel toward +z: a negative angle in the shader's convention.
      const wheelA = -dist / HY;
      const crankA = wheelA / GEAR;
      uniforms.cyA.value.set(wheelA % (Math.PI * 2), wheelA % (Math.PI * 2), crankA % (Math.PI * 2), steer);
      pose(crankA % (Math.PI * 2));

      if (body) {
        if (onCycle) {
          const k = SEATED_HEIGHT / standH;
          body.scale.set(SEATED_SLIM, k, SEATED_SLIM);
          const cz = SADDLE_Z + (SEATED_HEIGHT / 2) * Math.sin(LEAN);
          body.position.set(Math.sin(heading) * cz, SADDLE_TOP + (SEATED_HEIGHT / 2) * Math.cos(LEAN), Math.cos(heading) * cz);
          body.rotation.set(LEAN, heading, 0, 'YXZ');
        } else {
          body.scale.set(1, 1, 1);
          body.position.set(0, standY, 0);
          body.rotation.set(0, 0, 0);
        }
      }
    },
  };
}
