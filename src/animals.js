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
