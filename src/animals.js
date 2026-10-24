import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// docs/FINISH_LINE.md Animals line: "the M6 monkey as a recognisable monkey" — it was
// a scaled-down generic humanoid capsule (src/npc.js's createNPC, tinted brown), not a
// monkey shape at all. Built here instead, same one-Mesh/one-shared-vertex-coloured-
// material convention src/vehicles.js's pmesh/bakeColor uses, so swapping it in costs
// zero extra draw calls: it replaces the capsule 1-for-1 in the same group slot (only
// ever visible during the M6 chase), and the result is still exactly one merged Mesh.
//
// Built at real-world size directly (no external .scale.setScalar hack) — a medium
// rural macaque/langur, ~0.5m body, running on all fours, tail arcing up behind it.
// Local +Z is the front, matching src/npcRoutines.js's atan2(dx, dz) rotation
// convention (NOT src/vehicles.js's -Z-front convention).

const HIDE = 0x6b5338; // warm greyish-brown fur
const FACE = 0xcbb089; // lighter muzzle/face patch

function bakeColor(geometry, color) {
  const c = new THREE.Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function part(geometry, matrix, color) {
  geometry.applyMatrix4(matrix);
  return bakeColor(geometry, color);
}

const _zAxis = new THREE.Vector3(0, 0, 1);
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _quat = new THREE.Quaternion();

/** A thin box spanning exactly between two 3D points (both ends meet their
 * neighbour exactly — same reasoning as src/vehicles.js's tubeBetween, generalised
 * to any direction, not just the Y-Z plane, since legs/tail vary in X too). */
function boxBetween(p0, p1, thickness, color) {
  _dir.subVectors(p1, p0);
  const length = _dir.length();
  _mid.addVectors(p0, p1).multiplyScalar(0.5);
  _quat.setFromUnitVectors(_zAxis, _dir.clone().normalize());
  const geo = new THREE.BoxGeometry(thickness, thickness, length);
  const m = new THREE.Matrix4().makeRotationFromQuaternion(_quat);
  m.setPosition(_mid.x, _mid.y, _mid.z);
  return part(geo, m, color);
}

const _yAxis = new THREE.Vector3(0, 1, 0);

/** Same idea as boxBetween() but a round capsule instead of a box — used for the
 * cattle/dog rework (Wave 4 item 4: "smoother body shapes" instead of blocky boxes
 * for legs/neck/tail). CapsuleGeometry's own long axis is Y, so this rotates Y to
 * the p0->p1 direction rather than boxBetween's Z. */
function capsuleBetween(p0, p1, radius, color, capSegments = 4, radialSegments = 8) {
  _dir.subVectors(p1, p0);
  const length = Math.max(_dir.length() - radius * 2, 0.001);
  _mid.addVectors(p0, p1).multiplyScalar(0.5);
  _quat.setFromUnitVectors(_yAxis, _dir.clone().normalize());
  const geo = new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);
  const m = new THREE.Matrix4().makeRotationFromQuaternion(_quat);
  m.setPosition(_mid.x, _mid.y, _mid.z);
  return part(geo, m, color);
}

const P = (x, y, z) => new THREE.Vector3(x, y, z);

/** Returns a single merged Mesh — the recognisable monkey silhouette. */
export function buildMonkeyMesh() {
  const geos = [];

  // Body — a horizontal capsule (rounder than a box, reads as a torso rather than a
  // crate), running posture, centred at the hip/shoulder midline height.
  const bodyGeo = new THREE.CapsuleGeometry(0.095, 0.22, 4, 8);
  geos.push(part(bodyGeo, new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, 0.32, 0), HIDE));

  // Head — a sphere just ahead of the body, round rather than boxy.
  const headGeo = new THREE.SphereGeometry(0.095, 8, 6);
  geos.push(part(headGeo, new THREE.Matrix4().setPosition(0, 0.41, 0.22), HIDE));
  // Muzzle — lighter patch, the single clearest "this is a face" cue at mid distance.
  geos.push(part(new THREE.BoxGeometry(0.07, 0.055, 0.07), new THREE.Matrix4().setPosition(0, 0.37, 0.31), FACE));
  // Ears — small flattened spheres either side of the head.
  for (const side of [-1, 1]) {
    geos.push(part(new THREE.SphereGeometry(0.035, 6, 5), new THREE.Matrix4().makeScale(1, 1, 0.5).setPosition(side * 0.085, 0.47, 0.2), HIDE));
  }

  // Tail — three tapering segments, each spanning exactly to the next so they read
  // as one continuous arc from the base of the spine up and forward over the back
  // (the single most monkey-specific silhouette cue a capsule could never have).
  const tailPts = [P(0, 0.32, -0.205), P(0, 0.4, -0.33), P(0, 0.52, -0.38), P(0, 0.63, -0.29)];
  const tailThickness = [0.042, 0.036, 0.028];
  for (let i = 0; i < 3; i++) geos.push(boxBetween(tailPts[i], tailPts[i + 1], tailThickness[i], HIDE));

  // Legs — mid-stride gallop: front legs reaching forward (one planted, one lifted),
  // back legs trailing (one planted, one lifted) — hip/shoulder points on the body,
  // feet at or near the ground.
  const legs = [
    [P(-0.07, 0.27, 0.16), P(-0.09, 0, 0.24)], // front-left, planted forward
    [P(0.07, 0.27, 0.16), P(0.1, 0.1, 0.09)], // front-right, lifted mid-stride
    [P(-0.07, 0.27, -0.15), P(-0.1, 0.1, -0.23)], // back-left, lifted mid-stride
    [P(0.07, 0.27, -0.15), P(0.09, 0, -0.1)], // back-right, planted
  ];
  for (const [hip, foot] of legs) geos.push(boxBetween(hip, foot, 0.055, HIDE));

  const merged = mergeGeometries(geos);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, vertexColors: true });
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Drop-in replacement for src/npc.js's createNPC(), for the monkey only. */
export function createMonkeyNPC(position, rotationY = 0, name = 'npc_monkey') {
  const group = new THREE.Group();
  group.name = name;
  const mesh = buildMonkeyMesh();
  group.add(mesh);
  group.userData.mesh = mesh;
  group.position.set(position.x, 0, position.z);
  group.rotation.y = rotationY;
  return group;
}

// ---------------------------------------------------------------------------
// FINISH_LINE.md Animals line: "cows/buffalo, street dogs". Both are built as a
// single shared geometry fed into an InstancedMesh (the src/bazaarLife.js pattern —
// one draw call regardless of herd size), not one Mesh per animal. A neutral
// near-white vertex colour on the hide (horns/hooves stay their own dark baked
// tint) leaves room for InstancedMesh.setColorAt to supply the real per-instance
// colour — cows tan/white, buffalo dark grey/black — so ONE bovine mesh covers
// both animals MAP.md asks for, at the cost of one draw call rather than two.
// Both are standing/idle only (no leg animation) — a real roaming/moving herd is a
// bigger feature than this pass's "recognisable, present in the world" bar, same
// trade-off this session already made for the monkey's running pose being static
// per-frame rather than animated.
// ---------------------------------------------------------------------------

const HIDE_NEUTRAL = 0xd8d4c8; // near-white — InstancedMesh.setColorAt multiplies the real tint over this
const HORN_DARK = 0x3a332a;

/** Returns raw geometry (not a Mesh) — body/hump/neck/head/horns/4 static legs, same
 * InstancedMesh-base purpose as before, reworked for Wave 4 item 4 ("cows/buffalo
 * read tiny and blocky — real size, ~1.4m at the shoulder, smoother body shapes"):
 * the torso/neck/legs/tail are now round capsules instead of flat boxes (same
 * capsuleBetween() technique the monkey rework already proved out for limbs), and
 * the shoulder height is tuned to a real ~1.4m (torsoY + torsoRadius below). Buffalo
 * vs. cow is still one shared geometry (one InstancedMesh, one draw call either
 * way) — createCattleHerd() applies the "heavier/bigger" difference as a per-
 * instance non-uniform scale baked into that instance's own matrix, so the extra
 * bulk costs nothing structurally. */
export function buildBovineGeometry() {
  const geos = [];
  const legLen = 0.82;
  const torsoRadius = 0.3;
  const torsoHalfLen = 0.55; // cylindrical half-length; full capsule nose-tail-base span ~1.7m
  const torsoY = legLen + torsoRadius; // ~1.12 -> top of torso/hump reads at ~1.4m, a real desi cow's shoulder height

  // Torso — one smooth horizontal capsule instead of a flat box.
  geos.push(part(new THREE.CapsuleGeometry(torsoRadius, torsoHalfLen * 2, 4, 8), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, torsoY, 0), HIDE_NEUTRAL));

  // Shoulder hump — a flattened sphere bump where the neck joins.
  geos.push(part(new THREE.SphereGeometry(0.17, 8, 6), new THREE.Matrix4().makeScale(1, 0.7, 1).setPosition(0, torsoY + 0.15, torsoHalfLen - 0.08), HIDE_NEUTRAL));

  // Neck + head — smooth capsule angled up and forward, a round head instead of a box.
  const neckBase = P(0, torsoY + 0.02, torsoHalfLen + torsoRadius - 0.08);
  const neckTop = P(0, torsoY + 0.3, torsoHalfLen + torsoRadius + 0.28);
  geos.push(capsuleBetween(neckBase, neckTop, 0.17, HIDE_NEUTRAL));
  const headY = torsoY + 0.36;
  const headZ = torsoHalfLen + torsoRadius + 0.54;
  geos.push(part(new THREE.SphereGeometry(0.16, 8, 6), new THREE.Matrix4().makeScale(0.85, 0.85, 1.1).setPosition(0, headY, headZ), HIDE_NEUTRAL));
  geos.push(part(new THREE.BoxGeometry(0.15, 0.1, 0.1), new THREE.Matrix4().setPosition(0, headY - 0.05, headZ + 0.16), HORN_DARK)); // muzzle, dark

  for (const side of [-1, 1]) {
    const m = new THREE.Matrix4().makeRotationZ(side * 0.55).setPosition(side * 0.12, headY + 0.13, headZ - 0.08);
    geos.push(part(new THREE.ConeGeometry(0.03, 0.22, 6), m, HORN_DARK));
    geos.push(part(new THREE.SphereGeometry(0.075, 6, 5), new THREE.Matrix4().makeScale(1, 1, 0.4).setPosition(side * 0.18, headY + 0.02, headZ - 0.08), HIDE_NEUTRAL)); // ear
  }

  // Legs — round tapered capsules, front/back pairs under the torso's own ends.
  const legRadius = 0.09;
  for (const [lx, lz] of [
    [-0.18, torsoHalfLen - 0.14],
    [0.18, torsoHalfLen - 0.14],
    [-0.18, -torsoHalfLen + 0.14],
    [0.18, -torsoHalfLen + 0.14],
  ]) {
    geos.push(capsuleBetween(P(lx, legLen + 0.1, lz), P(lx, 0.02, lz), legRadius, HIDE_NEUTRAL));
  }

  // Tail — a thin capsule hanging from the rear.
  geos.push(capsuleBetween(P(0, torsoY + 0.05, -torsoHalfLen - torsoRadius + 0.1), P(0, torsoY - 0.55, -torsoHalfLen - torsoRadius - 0.05), 0.035, HORN_DARK));

  return mergeGeometries(geos);
}

/** A simple standing dog — body, head, snout, ears, tail, 4 legs, one merged
 * geometry, same InstancedMesh-base purpose as buildBovineGeometry(). Local +Z
 * front, matching this file's other animals. Wave 4 item 4 ("dogs lean"): a
 * slightly longer, thinner body and rounder capsule legs instead of boxes. */
export function buildDogGeometry() {
  const geos = [];
  geos.push(part(new THREE.CapsuleGeometry(0.085, 0.34, 4, 8), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, 0.32, 0), 0xffffff));
  geos.push(part(new THREE.SphereGeometry(0.095, 8, 6), new THREE.Matrix4().setPosition(0, 0.4, 0.27), 0xffffff));
  geos.push(part(new THREE.BoxGeometry(0.07, 0.06, 0.1), new THREE.Matrix4().setPosition(0, 0.35, 0.39), 0x3a332a)); // snout
  for (const side of [-1, 1]) {
    geos.push(part(new THREE.BoxGeometry(0.045, 0.1, 0.03), new THREE.Matrix4().makeRotationZ(side * 0.3).setPosition(side * 0.075, 0.5, 0.29), 0xffffff));
  }
  geos.push(capsuleBetween(P(0, 0.34, -0.25), P(0, 0.5, -0.4), 0.03, 0xffffff)); // tail, curled up
  const legs = [
    [P(-0.065, 0.3, 0.18), P(-0.065, 0, 0.18)],
    [P(0.065, 0.3, 0.18), P(0.065, 0, 0.18)],
    [P(-0.065, 0.3, -0.19), P(-0.065, 0, -0.19)],
    [P(0.065, 0.3, -0.19), P(0.065, 0, -0.19)],
  ];
  for (const [hip, foot] of legs) geos.push(capsuleBetween(hip, foot, 0.032, 0xffffff));
  return mergeGeometries(geos);
}

const COW_TINTS = [0xd9c9a0, 0xe8e0d0, 0xc4a876]; // tan/white — cow
const BUFFALO_TINTS = [0x3a3a38, 0x2a2a28]; // dark grey/black — buffalo
const DOG_TINTS = [0xb08858, 0x8a6a42, 0xc9b088];

/** Axis-aligned world box around a stationary animal (body runs along local z, yaw `rotY`),
 * so the player, NPCs and vehicles go around it instead of through it (A0 collision, FEEDBACK 0c).
 * `animalBox` lets the dev penetration guard skip an animal's own box. */
function animalColliderBox(x, z, rotY, halfLen, halfWid) {
  const s = Math.abs(Math.sin(rotY)), c = Math.abs(Math.cos(rotY));
  const hx = s * halfLen + c * halfWid, hz = c * halfLen + s * halfWid;
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz, animalBox: true };
}

const _herdMat = new THREE.Matrix4();
const _herdPos = new THREE.Vector3();
const _herdQuat = new THREE.Quaternion();
const _herdScale = new THREE.Vector3();
const _herdEuler = new THREE.Euler();

/** Every herd/pack mesh created, with its footprint radius, so the dev-mode penetration guard
 * (devCheckPenetration in src/main.js) can test animals against the real colliders. Streamed zones
 * detach their meshes, so the guard only checks meshes still in the scene (mesh.parent). */
export const ANIMAL_MESHES = [];
const COW_FOOTPRINT_RADIUS = 0.9;
const DOG_FOOTPRINT_RADIUS = 0.4;

/** A stationary herd — real geometry, one InstancedMesh, real world positions (not
 * decorative-only placeholders), covering both cows and buffalo via per-instance
 * tint (see the module doc comment above). `placements` is a flat [{x,z,rotationY,
 * buffalo}] list — `buffalo: true` picks a BUFFALO_TINTS colour AND a bigger,
 * non-uniform scale baked into that instance's own matrix (Wave 4 item 4: "buffalo
 * heavier and darker") — still one shared geometry/InstancedMesh/draw call.
 * Returns `{ mesh, update(dt) }` — update() drives a slow per-instance grazing sway
 * (gentle vertical bob + a touch of head-down pitch via the whole instance's own
 * rotation, since an InstancedMesh can't animate one sub-part independently) so the
 * herd doesn't read as a frozen diorama (Wave 4 item 4: "slow grazing... motion"). */
export function createCattleHerd(placements) {
  const geometry = buildBovineGeometry();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = 'cattle_herd';
  mesh.userData.colliderBoxes = placements.map((p) => animalColliderBox(p.x, p.z, p.rotationY ?? 0, p.buffalo ? 1.05 : 0.95, p.buffalo ? 0.5 : 0.42));
  ANIMAL_MESHES.push({ mesh, placements, radius: COW_FOOTPRINT_RADIUS });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const color = new THREE.Color();
  const instances = placements.map((p, i) => {
    const scale = p.buffalo ? { x: 1.12, y: 1.12, z: 1.22 } : { x: 1, y: 1, z: 1 };
    const tints = p.buffalo ? BUFFALO_TINTS : COW_TINTS;
    mesh.setColorAt(i, color.setHex(tints[i % tints.length]));
    return { x: p.x, z: p.z, rotY: p.rotationY ?? 0, scale, t: i * 1.7 + (p.buffalo ? 3 : 0), rate: 0.35 + (i % 3) * 0.05 };
  });
  function applyInstance(i, inst, graze) {
    _herdEuler.set(graze * 0.5, inst.rotY, 0);
    _herdQuat.setFromEuler(_herdEuler);
    _herdPos.set(inst.x, Math.max(graze, 0) * 0.015, inst.z);
    _herdScale.set(inst.scale.x, inst.scale.y, inst.scale.z);
    _herdMat.compose(_herdPos, _herdQuat, _herdScale);
    mesh.setMatrixAt(i, _herdMat);
  }
  instances.forEach((inst, i) => applyInstance(i, inst, 0));
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  function update(dt) {
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      inst.t += dt * inst.rate;
      applyInstance(i, inst, Math.sin(inst.t));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update };
}

/** A pack of stationary street dogs, same InstancedMesh pattern, with the same
 * slow idle sway as the cattle herd above. Returns `{ mesh, update(dt) }`. */
export function createDogPack(placements) {
  const geometry = buildDogGeometry();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = 'dog_pack';
  mesh.userData.colliderBoxes = placements.map((p) => animalColliderBox(p.x, p.z, p.rotationY ?? 0, 0.42, 0.2));
  ANIMAL_MESHES.push({ mesh, placements, radius: DOG_FOOTPRINT_RADIUS });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const color = new THREE.Color();
  const instances = placements.map((p, i) => {
    mesh.setColorAt(i, color.setHex(DOG_TINTS[i % DOG_TINTS.length]));
    return { x: p.x, z: p.z, rotY: p.rotationY ?? 0, t: i * 2.1, rate: 0.5 + (i % 2) * 0.1 };
  });
  function applyInstance(i, inst, sniff) {
    _herdEuler.set(0, inst.rotY + sniff * 0.12, 0);
    _herdQuat.setFromEuler(_herdEuler);
    _herdPos.set(inst.x, 0, inst.z);
    _herdScale.set(1, 1, 1);
    _herdMat.compose(_herdPos, _herdQuat, _herdScale);
    mesh.setMatrixAt(i, _herdMat);
  }
  instances.forEach((inst, i) => applyInstance(i, inst, 0));
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  function update(dt) {
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      inst.t += dt * inst.rate;
      applyInstance(i, inst, Math.sin(inst.t));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update };
}
