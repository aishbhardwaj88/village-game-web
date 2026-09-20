import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mergeGroupByMaterial } from './mergeUtils.js';
import { resolveCollisions } from './collision.js';

/**
 * Kitbash vehicles built to Places V1/vehicles/LAYOUT.md's exact measurements (queue
 * items 1-3) — simple untextured primitives in placeholder colours, not CC0 textures,
 * per that item's brief. Physicality (item 4 — pitch/roll/rock/lag/sway) lives in
 * Vehicle.update()/Trolley.updateAttached() below.
 *
 * Reconciliation note (see docs/parked.md): LAYOUT.md's tractor "Overall... 2.60 m
 * tall to top of steering wheel" doesn't arithmetically match its own more detailed
 * part list (wheel centre at 1.60m + 0.21m radius = 1.81m; the tallest individually-
 * specified part is the exhaust at 2.15m + a small cap). The detailed part numbers are
 * used literally; 2.60m is treated as the vehicle's general envelope/scale reference
 * (which is also what the existing camera-rig tuning already assumed).
 */

const V = {
  tractorBody: 0xa8312a, // deep tomato red, dulled sheen
  tractorBodyDust: 0xb54a3f, // dry pale dust film, upward faces only (slightly lighter)
  rim: 0xb9bec2, // clean silver-grey
  tire: 0x1c1c1c, // matte black, dry soil in tread (kept flat colour — no texture per brief)
  exhaust: 0x3a3d40, // darkened steel
  seat: 0x2b211c, // worn dark vinyl
  steeringCover: 0x161616, // black padded cover
  chassisSteel: 0x53585c,
  timber: 0x8a6a45, // weathered warm brown, trolley planking
  timberDark: 0x6e5236,
  glassDark: 0x232a2c,
  bullockHide: 0xd9c9a8,
  bikeFrame: 0x24313a,
};

function mat(color, roughness = 0.85, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Task 2 (draw-call budget) — every vehicle is a kitbash of many flat-coloured
 * primitives on a shared rigid pivot (bodyPivot pitches/rolls as one unit; a
 * trolley/bullock's non-leg parts never move independently at all), so most of
 * these never need to be separate meshes. `paint()` returns ONE cached white
 * MeshStandardMaterial per (roughness, metalness) pair — the real, meaningful
 * material distinction (rubber vs chrome vs painted steel) — and `pbox`/`pmesh`
 * bake each part's actual colour into a vertex-colour attribute instead of
 * material.color, so parts that only differ by hue can be merged into one draw
 * call via src/mergeUtils.js's mergeGroupByMaterial(). Wheels keep using the
 * plain mat()/box() above — they roll/steer independently and can never merge.
 */
const paintCache = new Map(); // "roughness|metalness" -> Material
function paint(roughness, metalness) {
  const key = `${roughness}|${metalness}`;
  let m = paintCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness, metalness, vertexColors: true });
    m.name = `vehiclePaint_${key}`;
    paintCache.set(key, m);
  }
  return m;
}

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
}

/** A flat-coloured mesh on a shared geometry (safe to reuse the same geometry
 * object across several pmesh() calls, same as the plain mat()/box() pattern
 * above — colour/position/rotation live on the Mesh and its baked attribute, not
 * on a shared geometry's identity). */
function pmesh(geometry, color, roughness = 0.85, metalness = 0) {
  bakeColor(geometry, color);
  const mesh = new THREE.Mesh(geometry, paint(roughness, metalness));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pbox(w, h, d, color, roughness = 0.85, metalness = 0) {
  return pmesh(new THREE.BoxGeometry(w, h, d), color, roughness, metalness);
}

/**
 * A steerable, spinning road wheel (tractor/trolley/bike): an outer `steer` pivot
 * (rotation.y turns it left/right, at ground-projected axle position), containing a
 * `roll` pivot (rotation.z=90° orients the cylinder's natural Y-spin-axis to the
 * world X axis — an axle running left-right) wrapping the actual tyre+rim mesh, which
 * spins via `roll.rotation.x` each frame (see updateWheelRoll). Two nested pivots
 * keep "point the wheel" and "spin the wheel" independent, since three.js Euler
 * rotations don't compose the way naive single-mesh rotation math would need.
 */
function createRoadWheel({ radius, width, ribbed = false }) {
  const steer = new THREE.Group();
  const roll = new THREE.Group();
  roll.rotation.z = Math.PI / 2;
  steer.add(roll);

  const tireSegments = ribbed ? 14 : 18;
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, tireSegments), mat(V.tire, 0.95));
  tire.castShadow = true;
  roll.add(tire);

  const rimRadius = radius * (ribbed ? 0.55 : 0.4);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(rimRadius, rimRadius, width * 1.02, 10), mat(V.rim, 0.5, 0.6));
  roll.add(rim);

  steer.userData.roll = roll;
  return steer;
}

/** A spoked wheel for the bullock cart — a rim + thin radial spokes (merged into one
 * geometry/draw call — 10 separate spoke meshes per wheel was a real draw-call cost,
 * see docs/parked.md) plus a small separate hub cap. */
function createSpokedWheel(radius, width, spokeCount = 8) {
  const steer = new THREE.Group();
  const roll = new THREE.Group();
  roll.rotation.z = Math.PI / 2;
  steer.add(roll);

  const rimMat = mat(V.timber, 0.9);
  const parts = [];
  const rimGeo = new THREE.TorusGeometry(radius * 0.92, radius * 0.08, 6, 20);
  parts.push(rimGeo);
  const spokeGeoBase = new THREE.CylinderGeometry(radius * 0.04, radius * 0.04, radius * 0.92, 5);
  const m = new THREE.Matrix4();
  for (let i = 0; i < spokeCount; i++) {
    const spokeGeo = spokeGeoBase.clone();
    m.makeRotationZ((i / spokeCount) * Math.PI * 2);
    spokeGeo.applyMatrix4(m);
    parts.push(spokeGeo);
  }
  const merged = mergeGeometries(parts);
  const wheelMesh = new THREE.Mesh(merged, rimMat);
  wheelMesh.castShadow = true;
  roll.add(wheelMesh);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.14, radius * 0.14, width, 8), mat(V.chassisSteel, 0.6, 0.5));
  roll.add(hub);

  steer.userData.roll = roll;
  return steer;
}

/** Advances a wheel's rolling spin (angular velocity = linear speed / radius) and,
 * for front wheels, its steer angle. Called once per wheel per frame. */
function updateWheel(wheel, { linearSpeed, radius, dt, steerAngle = null }) {
  wheel.userData.roll.rotation.x += (linearSpeed / radius) * dt;
  if (steerAngle !== null) wheel.rotation.y = steerAngle;
}

// ---------------------------------------------------------------------------
// TRACTOR — Places V1/vehicles/LAYOUT.md "tractor" section, exact measurements.
// ---------------------------------------------------------------------------

const T = {
  length: 3.5,
  width: 1.9,
  noseZ: -1.75,
  bonnetLen: 1.6,
  bonnetW: 0.7,
  bonnetTopY: 1.25,
  bonnetFrontDrop: 0.12,
  grilleH: 0.55,
  headlampDia: 0.16,
  headlampY: 1.05,
  exhaustDia: 0.09,
  exhaustTopY: 2.15,
  seatTopY: 1.15,
  seatSize: 0.45,
  backrestH: 0.35,
  wheelCenterY: 1.6,
  wheelDia: 0.42,
  rearWheelDia: 1.5,
  rearWheelW: 0.4,
  rearAxleY: 0.75,
  rearTrack: 1.55,
  frontWheelDia: 0.75,
  frontWheelW: 0.18,
  frontAxleY: 0.375,
  frontTrack: 1.2,
  wheelbase: 1.95,
  // Task 3 (proportions pass): was 1.85, narrower than the wheels themselves
  // (rearTrack 1.55 + rearWheelW 0.4 = 1.95 wheel-to-wheel outer span) — wheels stuck
  // out past the mudguards, which is the opposite of "nothing wider than the
  // mudguards". Now the widest point on the whole vehicle, with real clearance.
  mudguardOuterW: 2.05,
  mudguardTopY: 1.45,
  toolbox: { w: 0.45, h: 0.25, d: 0.25 },
  hitchY: 0.55,
  hitchZFromNose: 3.4,
};
T.rearAxleZ = 0.9;
T.frontAxleZ = T.rearAxleZ - T.wheelbase;
T.hitchZ = T.noseZ + T.hitchZFromNose;
// Task 3: the seat now sits AT the rear axle's own Z — literally between the two rear
// mudguards — instead of 0.4m forward of them (which read as floating disconnected
// from the wheels, part of why the whole machine looked toy-proportioned). The
// steering column keeps LAYOUT.md's "0.55m ahead of the seat" relationship, just
// carried along with the seat's move.
T.seatZ = T.rearAxleZ;
T.steerZ = T.seatZ - 0.55;

function buildTractorGroup() {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group(); // pitch/roll under throttle/brake/turns (item 4)
  group.add(bodyPivot);

  // Chassis rail — a low connecting spine so the bonnet/seat/wheels read as one machine.
  const chassis = pbox(0.5, 0.28, T.length - 0.3, V.chassisSteel, 0.55, 0.6);
  chassis.position.set(0, 0.42, 0.1);
  bodyPivot.add(chassis);

  // Bonnet: main box + a shorter "nose cap" to suggest the 0.12m front slope without
  // true beveling (a placeholder kitbash, not a modelled asset).
  const bonnetBottomY = 0.55;
  const bonnetMainLen = T.bonnetLen - 0.3;
  const bonnetMain = pbox(T.bonnetW, T.bonnetTopY - bonnetBottomY, bonnetMainLen, V.tractorBody, 0.75);
  bonnetMain.position.set(0, (T.bonnetTopY + bonnetBottomY) / 2, T.noseZ + 0.3 + bonnetMainLen / 2);
  bodyPivot.add(bonnetMain);
  const noseCapTopY = T.bonnetTopY - T.bonnetFrontDrop;
  const noseCap = pbox(T.bonnetW, noseCapTopY - bonnetBottomY, 0.3, V.tractorBodyDust, 0.9);
  noseCap.position.set(0, (noseCapTopY + bonnetBottomY) / 2, T.noseZ + 0.15);
  bodyPivot.add(noseCap);
  // Thin dust film strip along the bonnet's top (upward-facing) surface only.
  const dustStrip = pbox(T.bonnetW - 0.02, 0.015, bonnetMainLen, V.tractorBodyDust, 0.9);
  dustStrip.position.set(0, T.bonnetTopY + 0.008, T.noseZ + 0.3 + bonnetMainLen / 2);
  bodyPivot.add(dustStrip);

  // Grille: dark backing + vertical slats, full bonnet width, at the very front.
  const grilleY = (T.bonnetTopY + bonnetBottomY) / 2 - 0.05;
  const grilleBacking = pbox(T.bonnetW - 0.04, T.grilleH, 0.04, 0x14100e, 0.9);
  grilleBacking.position.set(0, grilleY, T.noseZ + 0.01);
  bodyPivot.add(grilleBacking);
  const slatCount = 6;
  for (let i = 0; i < slatCount; i++) {
    const slat = pbox(0.035, T.grilleH - 0.04, 0.05, 0x8f9296, 0.5, 0.4);
    slat.position.set((i / (slatCount - 1) - 0.5) * (T.bonnetW - 0.12), grilleY, T.noseZ - 0.005);
    bodyPivot.add(slat);
  }

  // Headlamps: round, either side of the grille.
  const lampGeo = new THREE.SphereGeometry(T.headlampDia / 2, 10, 8);
  for (const side of [-1, 1]) {
    const lamp = pmesh(lampGeo, 0xf2ecd8, 0.35, 0.1);
    lamp.position.set(side * (T.bonnetW / 2 - T.headlampDia / 2 - 0.02), T.headlampY, T.noseZ - 0.01);
    bodyPivot.add(lamp);
  }

  // Exhaust stack: vertical, right side of the bonnet, small rain cap on top.
  const exhaustX = T.bonnetW / 2 - 0.05;
  const exhaustZ = T.noseZ + 0.9;
  const exhaustH = T.exhaustTopY - T.bonnetTopY;
  const exhaust = pmesh(new THREE.CylinderGeometry(T.exhaustDia / 2, T.exhaustDia / 2, exhaustH, 10), V.exhaust, 0.6, 0.5);
  exhaust.position.set(exhaustX, T.bonnetTopY + exhaustH / 2, exhaustZ);
  bodyPivot.add(exhaust);
  const cap = pmesh(new THREE.CylinderGeometry(T.exhaustDia / 2 + 0.015, T.exhaustDia / 2 + 0.015, 0.04, 10), V.exhaust, 0.5, 0.6);
  cap.position.set(exhaustX, T.exhaustTopY + 0.02, exhaustZ);
  bodyPivot.add(cap);

  // Seat: cushion + low backrest.
  const cushion = pbox(T.seatSize, 0.1, T.seatSize, V.seat, 0.95);
  cushion.position.set(0, T.seatTopY - 0.05, T.seatZ);
  bodyPivot.add(cushion);
  const backrest = pbox(T.seatSize, T.backrestH, 0.08, V.seat, 0.95);
  backrest.position.set(0, T.seatTopY + T.backrestH / 2, T.seatZ + T.seatSize / 2 - 0.04);
  bodyPivot.add(backrest);

  // Steering column (raked 25°) + wheel + a small dash with 2 dials.
  const columnLen = 0.75;
  const column = pmesh(new THREE.CylinderGeometry(0.025, 0.03, columnLen, 8), V.chassisSteel, 0.6, 0.5);
  column.position.set(0, 0.55 + (Math.cos(THREE.MathUtils.degToRad(25)) * columnLen) / 2, T.steerZ - (Math.sin(THREE.MathUtils.degToRad(25)) * columnLen) / 2);
  column.rotation.x = THREE.MathUtils.degToRad(25);
  bodyPivot.add(column);
  const wheelRing = pmesh(new THREE.TorusGeometry(T.wheelDia / 2, 0.028, 8, 16), V.steeringCover, 0.85);
  wheelRing.position.set(0, T.wheelCenterY, T.steerZ);
  wheelRing.rotation.x = Math.PI / 2 - THREE.MathUtils.degToRad(25);
  bodyPivot.add(wheelRing);
  const dash = pbox(0.3, 0.12, 0.06, 0x2a2a2a, 0.7);
  dash.position.set(0, 1.32, T.steerZ - 0.2);
  bodyPivot.add(dash);
  const dialGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.01, 10);
  for (const side of [-1, 1]) {
    const dial = pmesh(dialGeo, 0xd8d8d8, 0.4);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(side * 0.08, 1.34, T.steerZ - 0.23);
    bodyPivot.add(dial);
  }

  // Toolbox, behind the seat.
  const toolbox = pbox(T.toolbox.w, T.toolbox.h, T.toolbox.d, V.chassisSteel, 0.55, 0.6);
  toolbox.position.set(0, 0.75 + T.toolbox.h / 2, T.seatZ + T.seatSize / 2 + 0.25);
  bodyPivot.add(toolbox);

  // Hitch bracket at the rear.
  const hitch = pmesh(new THREE.TorusGeometry(0.06, 0.018, 6, 10), V.chassisSteel, 0.55, 0.6);
  hitch.position.set(0, T.hitchY, T.hitchZ);
  hitch.rotation.y = Math.PI / 2;
  bodyPivot.add(hitch);

  // Mudguards over the rear wheels only — an open half-cylinder arcing over the top.
  // Positioned by axle height + clearance (not "desired top minus radius" — that
  // assumed the half-arc's vertical span matched a full circle's, which it doesn't,
  // and put the whole mesh partly underground; see docs/parked.md). A smaller radius
  // and this centring keeps the bounding box above ground regardless of which half of
  // the arc CylinderGeometry's theta range actually lands on.
  const mudguardRadius = T.rearWheelDia / 2 + 0.1;
  for (const side of [-1, 1]) {
    const mudguard = pmesh(
      new THREE.CylinderGeometry(mudguardRadius, mudguardRadius, T.rearWheelW + 0.08, 16, 1, true, Math.PI, Math.PI),
      V.tractorBody,
      0.7
    );
    mudguard.rotation.z = Math.PI / 2;
    mudguard.position.set(side * (T.mudguardOuterW / 2 - (T.rearWheelW + 0.08) / 2), T.rearAxleY + 0.2, T.rearAxleZ);
    bodyPivot.add(mudguard);
  }

  // Rear axle/differential housing — connects the two rear wheels so the machine
  // reads as one connected body instead of a thin chassis rail between two big wheels.
  const axleHousing = pmesh(new THREE.CylinderGeometry(0.16, 0.16, T.rearTrack - 0.5, 8), V.chassisSteel, 0.55, 0.6);
  axleHousing.rotation.z = Math.PI / 2;
  axleHousing.position.set(0, T.rearAxleY, T.rearAxleZ);
  bodyPivot.add(axleHousing);
  const gearbox = pbox(0.55, 0.5, 0.7, V.tractorBody, 0.75);
  gearbox.position.set(0, T.rearAxleY + 0.1, T.rearAxleZ - 0.45);
  bodyPivot.add(gearbox);

  // Task 2 (draw-call budget) — bodyPivot's ~28 static parts above share only ~11
  // distinct (roughness, metalness) material pairs (see pbox/pmesh, materials.js-
  // style vertex-colour tint baking), so this folds them into ~11 draw calls
  // instead of one per part. Wheels (independently rolling/steering) are added to
  // `group` below, outside bodyPivot, and are never touched by this merge.
  mergeGroupByMaterial(bodyPivot);

  // Wheels — front wheels steer (own pivot below the body), rear wheels don't.
  const rearWheels = [];
  const frontWheels = [];
  for (const side of [-1, 1]) {
    const rw = createRoadWheel({ radius: T.rearWheelDia / 2, width: T.rearWheelW });
    rw.position.set(side * T.rearTrack / 2, T.rearAxleY, T.rearAxleZ);
    group.add(rw);
    rearWheels.push(rw);

    const fw = createRoadWheel({ radius: T.frontWheelDia / 2, width: T.frontWheelW, ribbed: true });
    fw.position.set(side * T.frontTrack / 2, T.frontAxleY, T.frontAxleZ);
    group.add(fw);
    frontWheels.push(fw);
  }

  return { group, bodyPivot, rearWheels, frontWheels };
}

// ---------------------------------------------------------------------------
// TROLLEY — LAYOUT.md "trolley" section. A fully separate object (item 2): attaches/
// detaches at the tractor's hitch rather than being permanently parented.
// ---------------------------------------------------------------------------

const TR = {
  bedLen: 3.5,
  bedW: 2.0,
  floorY: 0.9,
  wallH: 0.6,
  wheelDia: 1.1,
  wheelW: 0.3,
  track: 1.7, // not specified in LAYOUT.md — picked to sit inboard of the side walls (see docs/parked.md)
  drawbarLen: 1.2,
  hitchY: 0.55,
};
TR.frontZ = -TR.bedLen / 2;
TR.rearZ = TR.bedLen / 2;
TR.hitchLocalZ = TR.frontZ - TR.drawbarLen;

function buildTrolleyGroup() {
  const group = new THREE.Group();
  // Task 2 (draw-call budget) — every part except the wheels is rigid relative to
  // the trolley itself (no independent animation), so they all live in one
  // container that gets merged down to a handful of draw calls at the end.
  const staticParts = new THREE.Group();
  group.add(staticParts);

  // Plank floor.
  const floor = pbox(TR.bedW, 0.08, TR.bedLen, V.timber, 0.95);
  floor.position.set(0, TR.floorY - 0.04, 0);
  staticParts.add(floor);
  // A few visible plank seams (thin darker strips) so it doesn't read as one slab.
  for (let i = -2; i <= 2; i++) {
    const seam = pbox(TR.bedW, 0.005, 0.02, V.timberDark, 0.95);
    seam.position.set(0, TR.floorY + 0.001, (i / 2) * (TR.bedLen / 2) * 0.85);
    staticParts.add(seam);
  }

  // Side walls: horizontal planks between vertical steel posts.
  const postCount = 6;
  for (const side of [-1, 1]) {
    for (let i = 0; i < postCount; i++) {
      const post = pbox(0.05, TR.wallH, 0.05, V.chassisSteel, 0.55, 0.55);
      post.position.set((side * TR.bedW) / 2, TR.floorY + TR.wallH / 2, (i / (postCount - 1) - 0.5) * (TR.bedLen - 0.3));
      staticParts.add(post);
    }
    const plankRows = 3;
    for (let r = 0; r < plankRows; r++) {
      const plank = pbox(0.03, TR.wallH / plankRows - 0.02, TR.bedLen - 0.1, V.timber, 0.95);
      plank.position.set((side * TR.bedW) / 2, TR.floorY + (r + 0.5) * (TR.wallH / plankRows), 0);
      staticParts.add(plank);
    }
  }

  // Tailgate: hinged at the rear, full width, with two steel latches.
  const tailgate = pbox(TR.bedW - 0.06, TR.wallH, 0.04, V.timber, 0.95);
  tailgate.position.set(0, TR.floorY + TR.wallH / 2, TR.rearZ + 0.03);
  staticParts.add(tailgate);
  for (const side of [-1, 1]) {
    const latch = pbox(0.05, 0.1, 0.03, 0x2a2a2a, 0.5, 0.6);
    latch.position.set((side * TR.bedW) / 2.4, TR.floorY + TR.wallH * 0.6, TR.rearZ + 0.03);
    staticParts.add(latch);
  }

  // Drawbar + hitch eye (front).
  const drawbar = pbox(0.12, 0.1, TR.drawbarLen, V.chassisSteel, 0.55, 0.55);
  drawbar.position.set(0, TR.hitchY, TR.frontZ - TR.drawbarLen / 2);
  staticParts.add(drawbar);
  const hitchEye = pmesh(new THREE.TorusGeometry(0.055, 0.016, 6, 10), V.chassisSteel, 0.55, 0.55);
  hitchEye.position.set(0, TR.hitchY, TR.hitchLocalZ);
  hitchEye.rotation.y = Math.PI / 2;
  staticParts.add(hitchEye);

  // Mudguards — a single axle under the bed centre.
  for (const side of [-1, 1]) {
    const mudguard = pmesh(
      new THREE.CylinderGeometry(TR.wheelDia / 2 + 0.1, TR.wheelDia / 2 + 0.1, TR.wheelW + 0.06, 14, 1, true, Math.PI, Math.PI),
      V.chassisSteel,
      0.6,
      0.5
    );
    mudguard.rotation.z = Math.PI / 2;
    mudguard.position.set((side * TR.track) / 2, TR.wheelDia / 2 + 0.1 + 0.35, 0);
    staticParts.add(mudguard);
  }

  mergeGroupByMaterial(staticParts);

  const wheels = [];
  for (const side of [-1, 1]) {
    const w = createRoadWheel({ radius: TR.wheelDia / 2, width: TR.wheelW });
    w.position.set((side * TR.track) / 2, TR.wheelDia / 2, 0);
    group.add(w);
    wheels.push(w);
  }

  return { group, wheels };
}

const TRACTOR_TOW_OFFSET_REST = T.hitchZ - TR.hitchLocalZ; // trolley->tractor rest distance when attached, hitch-to-hitch
// Playtest bug 2 — a circle-vs-box approximation of the trolley's own footprint
// (bedLen x bedW), same convention main.js already uses for the tractor
// (`Math.max(p.body.w, p.body.d) / 2`), so it gets the same "slide along a wall"
// treatment instead of driving straight into one.
const TROLLEY_COLLISION_RADIUS = Math.max(TR.bedLen, TR.bedW) / 2;

export class Trolley {
  constructor(position, rotationY = 0) {
    const built = buildTrolleyGroup();
    this.group = built.group;
    this.group.name = 'trolley';
    this.wheels = built.wheels;
    this.group.position.copy(position);
    this.group.rotation.y = rotationY;

    this.attached = false;
    this.yaw = rotationY;
    this.yawVel = 0;
    this.velX = 0;
    this.velZ = 0;
    this.speed = 0; // approximate, for wheel roll while attached
    this.brakeCompression = 0;
  }

  get hitchWorldPoint() {
    return this.group.localToWorld(new THREE.Vector3(0, TR.hitchY, TR.hitchLocalZ));
  }

  addToScene(scene) {
    scene.add(this.group);
  }

  /** Damped-spring follow — see the module doc comment for why a spring (not a lerp)
   * is what produces "cuts the corner... overshoots slightly and settles" for free,
   * rather than needing each case hand-scripted. */
  updateAttached(dt, tractor) {
    const towPoint = tractor.group.localToWorld(new THREE.Vector3(0, T.hitchY, T.hitchZ));

    const speedDelta = tractor.speed - tractor._prevSpeedForTrolley;
    tractor._prevSpeedForTrolley = tractor.speed;
    const braking = Math.max(0, -speedDelta / Math.max(dt, 0.001));
    this.brakeCompression = THREE.MathUtils.damp(this.brakeCompression, Math.min(braking * 0.05, 0.55), 6, dt);

    const restLength = TRACTOR_TOW_OFFSET_REST - this.brakeCompression;
    const tractorBackward = new THREE.Vector3(Math.sin(tractor.group.rotation.y), 0, Math.cos(tractor.group.rotation.y));
    // Bugfix (playtest bug 1): base this on the tractor's own body position, the
    // same anchor spawnVehicles() uses for the initial placement
    // (`tractor.group.position + tractorBackward * TRACTOR_TOW_OFFSET_REST`) — not
    // `towPoint` (already offset from the body by the hitch's own local Z). Basing
    // it on towPoint double-counted that offset, so the running target sat roughly
    // one hitch-length further back than the trolley's own correct spawn position,
    // and the spring chased a permanently-too-far target every frame. `towPoint`
    // is still exactly right for the braking calc above and the yaw hinge below —
    // both are genuinely about the physical hitch point, not the body anchor.
    const targetPos = tractor.group.position.clone().addScaledVector(tractorBackward, restLength);

    // Slightly underdamped spring (c < 2*sqrt(k)) — a small, controlled overshoot,
    // not a bounce. Position first, then yaw hinges to face the tow point.
    const k = 13;
    const c = 6.2;
    const dx = targetPos.x - this.group.position.x;
    const dz = targetPos.z - this.group.position.z;
    this.velX += (k * dx - c * this.velX) * dt;
    this.velZ += (k * dz - c * this.velZ) * dt;
    const prevX = this.group.position.x;
    const prevZ = this.group.position.z;
    this.group.position.x += this.velX * dt;
    this.group.position.z += this.velZ * dt;

    // Playtest bug 2 — the towed trolley never had its own collision check at all
    // (only the mounted vehicle and the player did, in main.js), so it drove
    // straight through building walls. Same resolveCollisions() every other moving
    // thing in this game uses, checked every frame while attached, sliding it along
    // a wall rather than letting the spring pull it inside one.
    resolveCollisions(this.group.position, TROLLEY_COLLISION_RADIUS, []);

    this.speed = Math.hypot(this.group.position.x - prevX, this.group.position.z - prevZ) / Math.max(dt, 0.0001);

    const hingeX = towPoint.x - this.group.position.x;
    const hingeZ = towPoint.z - this.group.position.z;
    const targetYaw = Math.atan2(-hingeX, -hingeZ);
    let yawDiff = targetYaw - this.yaw;
    // Shortest angular path, wrapped to [-PI, PI). The old `((d + PI) % (2*PI)) -
    // PI` only wraps correctly when `d + PI` lands >= 0 — JS's `%` returns a
    // negative result for a negative dividend (unlike Python's), so for any raw
    // diff below -PI it was a silent no-op, leaving `yawDiff` many radians out of
    // range. That fed a huge, wrong-direction torque into the spring below, which
    // is what actually caused "the trolley doesn't follow" (bug 1 of this task) —
    // found by direct per-frame instrumentation, not by inspection. The extra
    // `+ Math.PI * 3` before the second `%` guarantees a non-negative dividend
    // there regardless of how far out of range the input was.
    yawDiff = ((yawDiff % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    const kYaw = 11;
    const cYaw = 5.2;
    this.yawVel += (kYaw * yawDiff - cYaw * this.yawVel) * dt;
    this.yaw += this.yawVel * dt;
    this.group.rotation.y = this.yaw;

    for (const w of this.wheels) updateWheel(w, { linearSpeed: this.speed, radius: TR.wheelDia / 2, dt });
  }

  /** Detach — "leaves the trolley standing where it is" (item 2 brief): just stop
   * following, keep current transform and zero out velocities so it doesn't drift. */
  detach() {
    this.attached = false;
    this.velX = 0;
    this.velZ = 0;
    this.yawVel = 0;
  }
}

// ---------------------------------------------------------------------------
// BULLOCK CART — LAYOUT.md "bullock_cart" section.
// ---------------------------------------------------------------------------

const C = {
  platformLen: 3.0,
  platformW: 1.6,
  floorY: 0.9,
  wheelDia: 1.2,
  wheelW: 0.14,
  yokeForward: 2.8,
  bullockShoulderY: 1.35,
};

// Task 3 (proportions pass): body length 1.5->1.6m, leg length 0.62->0.75m (both per
// this task's brief), plus a shoulder hump — a real silhouette feature the "pale
// boxes" placeholder was missing entirely, not an added decoration.
const BULLOCK_BODY_LEN = 1.6;
const BULLOCK_BODY_W = 0.55;
const BULLOCK_BODY_H = 0.75;
const BULLOCK_LEG_LEN = 0.75;

/**
 * Task 2 (draw-call budget) — a bullock's body/hump/neck/head/horns never move
 * independently (only its legs animate, see _updateBullockLegs), so they're built
 * straight into `offsetX`/`offsetZ`-shifted world-relative positions (not a
 * separately-positioned wrapper Group) and returned as a `staticGroup`, so
 * buildCartGroup can merge BOTH bullocks' static parts together into one mesh.
 * Legs are returned separately (unmerged — each needs its own swing rotation) for
 * the caller to add directly under the cart's own group.
 */
function buildBullock(offsetX, offsetZ) {
  const staticGroup = new THREE.Group();

  const body = pbox(BULLOCK_BODY_W, BULLOCK_BODY_H, BULLOCK_BODY_LEN, V.bullockHide, 0.9);
  body.position.set(offsetX, C.bullockShoulderY - BULLOCK_BODY_H / 2, offsetZ);
  staticGroup.add(body);

  // Shoulder hump — zebu cattle's defining silhouette feature, sat just behind the
  // neck junction, on top of the back.
  const hump = pbox(0.3, 0.2, 0.32, V.bullockHide, 0.9);
  hump.position.set(offsetX, C.bullockShoulderY + 0.1, offsetZ + BULLOCK_BODY_LEN / 2 - 0.28);
  staticGroup.add(hump);

  const neck = pbox(0.32, 0.32, 0.4, V.bullockHide, 0.9);
  neck.position.set(offsetX, C.bullockShoulderY - 0.1, offsetZ + BULLOCK_BODY_LEN / 2 + 0.15);
  staticGroup.add(neck);
  const head = pbox(0.28, 0.3, 0.35, V.bullockHide, 0.9);
  head.position.set(offsetX, C.bullockShoulderY, offsetZ + BULLOCK_BODY_LEN / 2 + 0.45);
  staticGroup.add(head);
  const hornGeo = new THREE.ConeGeometry(0.03, 0.22, 6);
  for (const side of [-1, 1]) {
    const horn = pmesh(hornGeo, 0xe8e2d0, 0.5);
    horn.position.set(offsetX + side * 0.1, C.bullockShoulderY + 0.2, offsetZ + BULLOCK_BODY_LEN / 2 + 0.4);
    horn.rotation.z = side * 0.5;
    staticGroup.add(horn);
  }

  // Legs: bottom at the ground (y=0) by construction, top reaching BULLOCK_LEG_LEN —
  // a little into the body's own bottom (0.75 vs the body's belly at shoulderY-bodyH
  // = 0.6), which is correct/expected (legs plug into the torso volume, not a precise
  // seam) rather than the old formula's arbitrary offset.
  const legGeo = new THREE.BoxGeometry(0.13, BULLOCK_LEG_LEN, 0.13);
  const legs = [];
  for (const [lx, lz] of [
    [-0.18, BULLOCK_BODY_LEN / 2 - 0.15],
    [0.18, BULLOCK_BODY_LEN / 2 - 0.15],
    [-0.18, -BULLOCK_BODY_LEN / 2 + 0.15],
    [0.18, -BULLOCK_BODY_LEN / 2 + 0.15],
  ]) {
    const leg = pmesh(legGeo, V.bullockHide, 0.9);
    leg.position.set(offsetX + lx, BULLOCK_LEG_LEN / 2, offsetZ + lz);
    legs.push(leg);
  }
  return { staticGroup, legs };
}

function buildCartGroup() {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const platform = pbox(C.platformW, 0.08, C.platformLen, V.timber, 0.9);
  platform.position.set(0, C.floorY - 0.04, 0);
  bodyPivot.add(platform);
  // A low rim so it reads as a platform, not a floating plank.
  for (const side of [-1, 1]) {
    const rim = pbox(0.05, 0.12, C.platformLen, V.timber, 0.9);
    rim.position.set((side * C.platformW) / 2, C.floorY + 0.02, 0);
    bodyPivot.add(rim);
  }

  // Task 3: raised to rest across the bullocks' shoulders (was at 0.8m — well below
  // shoulder height 1.35m, reading as a low drawbar rather than a yoke pole).
  const yoke = pbox(0.07, 0.07, C.yokeForward, V.timberDark, 0.9);
  yoke.position.set(0, C.bullockShoulderY - 0.05, -C.platformLen / 2 - C.yokeForward / 2);
  bodyPivot.add(yoke);

  // Task 2 (draw-call budget) — platform + rims + yoke are the same 'timber'/
  // 'timberDark' family (only tint differs), so they fold into one draw call.
  mergeGroupByMaterial(bodyPivot);

  const wheelZ = -0.15;
  const track = C.platformW + 0.1;
  const wheels = [];
  for (const side of [-1, 1]) {
    const w = createSpokedWheel(C.wheelDia / 2, C.wheelW);
    w.position.set((side * track) / 2, C.wheelDia / 2, wheelZ);
    group.add(w);
    wheels.push(w);
  }

  // Task 2 (draw-call budget) — both bullocks' bodies never move independently of
  // the cart (only their legs do), so their static parts merge into one mesh
  // across BOTH animals, while each leg stays its own mesh under `group` for
  // _updateBullockLegs()'s per-leg swing rotation.
  const bullocksStatic = new THREE.Group();
  group.add(bullocksStatic);
  const bullocks = [];
  for (const side of [-1, 1]) {
    const offsetX = side * 0.42;
    const offsetZ = -C.platformLen / 2 - C.yokeForward + 0.5;
    const built = buildBullock(offsetX, offsetZ);
    bullocksStatic.add(built.staticGroup);
    for (const leg of built.legs) group.add(leg);
    bullocks.push({ userData: { legs: built.legs } });
  }
  mergeGroupByMaterial(bullocksStatic);

  return { group, bodyPivot, wheels, bullocks };
}

// ---------------------------------------------------------------------------
// BIKE — LAYOUT.md "bike" section.
// ---------------------------------------------------------------------------

const B = {
  length: 2.0,
  width: 0.7,
  height: 1.1,
  wheelDia: 0.6,
};

/** A thin box spanning exactly between two points in the Y-Z plane (the bike is
 * symmetric in X, so every frame tube is centred on x=0) — computes its own length,
 * midpoint and tilt from the two endpoints instead of a hand-picked rotation.x, so
 * adjacent tubes actually meet at their shared joint (bottom bracket, head tube,
 * rear axle) rather than approximating it and leaving a gap. */
function tubeBetween(y1, z1, y2, z2, thickness, color, roughness = 0.6, metalness = 0.3) {
  const dy = y2 - y1;
  const dz = z2 - z1;
  const length = Math.hypot(dy, dz);
  const tube = pbox(thickness, thickness, length, color, roughness, metalness);
  tube.position.set(0, (y1 + y2) / 2, (z1 + z2) / 2);
  tube.rotation.x = Math.atan2(-dy, dz);
  return tube;
}

function buildBikeGroup() {
  const group = new THREE.Group();

  // Bug fix: this whole assembly below is authored with its front (handlebar, fork,
  // front wheel) at +Z, but every other vehicle — and the `forward` vector
  // Vehicle.update() computes from `group.rotation.y` — assumes front = -Z at
  // rotation.y = 0. That mismatch is why W drove the bike backward. Fixed by baking a
  // static 180° turn onto an inner `orient` group (every part below attaches to
  // `orient`, not `group` directly) rather than re-deriving every part's position/tilt
  // by hand — `group.rotation.y` itself can't carry this fix because the Vehicle
  // constructor and the steering code overwrite/add to it every frame.
  //
  // orient's rotation is set at the very END of this function, AFTER
  // mergeGroupByMaterial(bodyPivot) below — that call bakes each merged mesh's
  // matrixWorld (i.e. including every real ancestor transform that already exists at
  // merge time) into its geometry, then re-parents the merged mesh back under
  // bodyPivot; setting orient's 180° before the merge would get baked into the merged
  // tubes' geometry once AND applied again live via orient's own transform, rotating
  // them back to the original (wrong) direction while the unmerged parts (tank/seat/
  // handlebar/wheels) rotated correctly — a mismatched-frame bug. Setting it after
  // avoids that entirely.
  const orient = new THREE.Group();
  group.add(orient);

  const bodyPivot = new THREE.Group();
  orient.add(bodyPivot);

  const wheelR = B.wheelDia / 2;

  const frontAxleZ = B.length / 2 - 0.25;
  const rearAxleZ = -B.length / 2 + 0.25;

  // Playtest bug 4: the old frame was 3 short, 3-4cm-thin tubes that didn't reach
  // each other OR the rear axle — from 3m away it read as loose parts (two wheels,
  // a floating tank) because there was no continuous silhouette connecting them.
  // Rebuilt as a real diamond-ish frame — every joint below is a shared point two
  // tubes both end at, and every tube reaches an axle or another tube, so the
  // frame reads as one connected shape. Tubes are 6cm thick (real bike tubes are
  // ~3cm) — thin enough to still read as a bike, thick enough that a 3-4cm tube
  // doesn't vanish to a hairline at typical camera distance.
  const bbY = wheelR - 0.02; // bottom bracket (pedal centre) — just below axle height
  const bbZ = -0.15;
  const headY = wheelR + 0.78; // head tube top, below the handlebar
  const headZ = frontAxleZ - 0.2;
  const seatTopY = wheelR + 0.72;
  const seatTopZ = -0.6;
  const tubeThickness = 0.06;

  const seatTube = tubeBetween(bbY, bbZ, seatTopY, seatTopZ, tubeThickness, V.bikeFrame);
  bodyPivot.add(seatTube);
  const topTube = tubeBetween(seatTopY, seatTopZ, headY, headZ, tubeThickness, V.bikeFrame);
  bodyPivot.add(topTube);
  const downTube = tubeBetween(bbY, bbZ, headY, headZ, tubeThickness, V.bikeFrame);
  bodyPivot.add(downTube);
  const chainStay = tubeBetween(bbY, bbZ, wheelR, rearAxleZ, tubeThickness, V.bikeFrame);
  bodyPivot.add(chainStay);
  const seatStay = tubeBetween(seatTopY, seatTopZ, wheelR, rearAxleZ, tubeThickness, V.bikeFrame);
  bodyPivot.add(seatStay);
  const forkTube = tubeBetween(headY, headZ, wheelR, frontAxleZ, tubeThickness, V.bikeFrame);
  bodyPivot.add(forkTube);

  const tank = pbox(0.16, 0.14, 0.32, 0x8a1f1f, 0.55, 0.2);
  tank.position.set(0, (bbY + headY) / 2 + 0.1, (bbZ + headZ) / 2 - 0.05);
  bodyPivot.add(tank);

  const seat = pbox(0.16, 0.07, 0.28, V.seat, 0.9);
  seat.position.set(0, seatTopY + 0.05, seatTopZ - 0.04);
  bodyPivot.add(seat);

  const handlebar = pbox(0.4, 0.035, 0.035, 0x1c1c1c, 0.5, 0.4);
  handlebar.position.set(0, headY + 0.14, headZ);
  bodyPivot.add(handlebar);

  // Pedals (acceptance: "pedals at the centre") — a crank bar through the bottom
  // bracket plus a pedal block at each end, opposite sides so it reads as a crank,
  // not a single stray bar.
  const crank = pbox(0.34, 0.035, 0.035, 0x1c1c1c, 0.5, 0.4);
  crank.rotation.z = Math.PI / 2;
  crank.position.set(0, bbY, bbZ);
  bodyPivot.add(crank);
  const pedalGeoOffsets = [0.17, -0.17];
  for (const px of pedalGeoOffsets) {
    const pedal = pbox(0.05, 0.02, 0.1, 0x1c1c1c, 0.6, 0.2);
    pedal.position.set(px, bbY - 0.03, bbZ);
    bodyPivot.add(pedal);
  }

  // Task 2 (draw-call budget) — every bikeFrame-coloured tube merges into one draw
  // call; tank/seat/handlebar/crank/pedals stay their own single meshes (each a
  // distinct colour, so grouping by material still folds the two pedals together).
  mergeGroupByMaterial(bodyPivot);

  const frontWheel = createRoadWheel({ radius: wheelR, width: 0.09, ribbed: true });
  frontWheel.position.set(0, wheelR, frontAxleZ);
  orient.add(frontWheel);
  const rearWheel = createRoadWheel({ radius: wheelR, width: 0.09, ribbed: true });
  rearWheel.position.set(0, wheelR, rearAxleZ);
  orient.add(rearWheel);

  orient.rotation.y = Math.PI; // see the comment where `orient` is created, above

  return { group, bodyPivot, frontWheel, rearWheel };
}

// ---------------------------------------------------------------------------

export const VEHICLE_PRESETS = {
  bike: {
    kind: 'bike',
    label: 'Bicycle',
    body: { w: B.width, h: B.height, d: B.length },
    maxSpeed: 8.5,
    accel: 9,
    brakeDecel: 14,
    turnRate: 2.2,
    cameraDistance: 5.5,
    cameraHeight: 2.0,
    mountRadius: 2.5,
    maxSteerAngle: THREE.MathUtils.degToRad(32),
  },
  tractor: {
    kind: 'tractor',
    label: 'Tractor',
    body: { w: T.width, h: 2.6, d: T.length },
    maxSpeed: 3.2,
    accel: 2.2,
    brakeDecel: 3,
    turnRate: 0.55,
    cameraDistance: 8,
    cameraHeight: 3.2,
    mountRadius: 3.5,
    hasTrolley: true,
    maxSteerAngle: THREE.MathUtils.degToRad(26),
    attachRadius: 1.5, // item 2: how close the trolley's hitch must be, while reversing, to attach
  },
  cart: {
    kind: 'cart',
    label: 'Bullock cart',
    body: { w: C.platformW, h: 1.5, d: C.platformLen },
    maxSpeed: 1.8,
    accel: 1.1,
    brakeDecel: 2,
    turnRate: 0.7,
    cameraDistance: 7,
    cameraHeight: 2.8,
    mountRadius: 3.5,
    hasBullocks: true,
  },
};

export class Vehicle {
  constructor(presetKey, position, rotationY = 0) {
    this.preset = VEHICLE_PRESETS[presetKey];
    const p = this.preset;

    let built;
    if (p.kind === 'tractor') built = buildTractorGroup();
    else if (p.kind === 'cart') built = buildCartGroup();
    else built = buildBikeGroup();

    this.group = built.group;
    this.group.name = `vehicle_${presetKey}`;
    this.group.position.copy(position);
    this.group.rotation.y = rotationY;
    this.bodyPivot = built.bodyPivot;

    if (p.kind === 'tractor') {
      this.rearWheels = built.rearWheels;
      this.frontWheels = built.frontWheels;
      this.trolley = null; // attached via attachTrolley() (item 2) — starts unattached
      this._prevSpeedForTrolley = 0;
    } else if (p.kind === 'bike') {
      this.frontWheel = built.frontWheel;
      this.rearWheel = built.rearWheel;
    } else if (p.kind === 'cart') {
      this.wheels = built.wheels;
      this.bullocks = built.bullocks;
    }

    this.speed = 0;
    this._time = Math.random() * 10;
    this.mounted = false;
  }

  get position() {
    return this.group.position;
  }

  addToScene(scene) {
    scene.add(this.group);
  }

  /** Attaches a (currently unattached) Trolley instance to this tractor — item 2.
   * Snaps its drawbar eye to the hitch point immediately (playtest bug 1: this used
   * to just set the `attached` flag and leave the trolley wherever it already was —
   * up to `attachRadius` away — letting the follow spring slowly drag it in from
   * there instead of a real hitch-up). Same placement formula spawnVehicles() uses
   * for the initial already-attached state, so a fresh attach and a fresh spawn
   * produce an identical, exact (zero-gap) result. */
  attachTrolley(trolley) {
    const tractorBackward = new THREE.Vector3(Math.sin(this.group.rotation.y), 0, Math.cos(this.group.rotation.y));
    trolley.group.position.copy(this.group.position).addScaledVector(tractorBackward, TRACTOR_TOW_OFFSET_REST);
    trolley.group.rotation.y = this.group.rotation.y;
    trolley.yaw = this.group.rotation.y;
    this.trolley = trolley;
    trolley.attached = true;
    trolley.velX = 0;
    trolley.velZ = 0;
    trolley.yawVel = 0;
    trolley.brakeCompression = 0;
    this._prevSpeedForTrolley = this.speed;
  }

  /** Returns the detached Trolley instance so the caller (main.js) can keep a
   * reference to it — it stays in the scene, just unparented from this tractor. */
  detachTrolley() {
    const t = this.trolley;
    if (t) t.detach();
    this.trolley = null;
    return t;
  }

  update(dt, input) {
    const p = this.preset;
    this._time += dt;

    const throttle = -input.moveZ;
    const steer = input.moveX;

    const targetSpeed = throttle * p.maxSpeed;
    const speedingUp = Math.abs(targetSpeed) > Math.abs(this.speed) && Math.sign(targetSpeed || 1) === Math.sign(this.speed || targetSpeed || 1);
    const rate = speedingUp ? p.accel : p.brakeDecel;
    const prevSpeed = this.speed;
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, rate, dt);
    if (Math.abs(this.speed) < 0.02 && throttle === 0) this.speed = 0;
    const accelSigned = (this.speed - prevSpeed) / Math.max(dt, 0.0001); // for pitch (item 4)

    const speedFactor = THREE.MathUtils.clamp(Math.abs(this.speed) / (p.maxSpeed * 0.4), 0, 1);
    const yawDelta = -steer * p.turnRate * speedFactor * dt * Math.sign(this.speed || 1);
    this.group.rotation.y += yawDelta;

    const forward = new THREE.Vector3(-Math.sin(this.group.rotation.y), 0, -Math.cos(this.group.rotation.y));
    this.group.position.addScaledVector(forward, this.speed * dt);

    const steerAngle = -steer * p.maxSteerAngle;

    if (p.kind === 'bike') {
      // Lean into the turn, weighted by speed; a slow wobble/bounce at speed.
      const lean = -steer * speedFactor * 0.4;
      this.bodyPivot.rotation.z = THREE.MathUtils.damp(this.bodyPivot.rotation.z, lean, 7, dt);
      const bump = Math.sin(this._time * 14) * 0.008 * speedFactor;
      this.bodyPivot.position.y = bump;
      updateWheel(this.frontWheel, { linearSpeed: this.speed, radius: B.wheelDia / 2, dt, steerAngle });
      updateWheel(this.rearWheel, { linearSpeed: this.speed, radius: B.wheelDia / 2, dt });
    } else if (p.kind === 'tractor') {
      // Body pitches back under throttle, dips forward under braking; rolls outward
      // in turns; rocks slowly on bumps (item 4 — "weight, not wobble": damped, and
      // the rock amplitude itself fades in/out with speed rather than being constant).
      const pitchTarget = THREE.MathUtils.clamp(-accelSigned * 0.05, -0.05, 0.05);
      this.bodyPivot.rotation.x = THREE.MathUtils.damp(this.bodyPivot.rotation.x, pitchTarget + Math.sin(this._time * 5.3) * 0.012 * speedFactor, 5, dt);
      const rollTarget = steer * speedFactor * 0.05; // rolls OUTWARD: away from the turn direction
      this.bodyPivot.rotation.z = THREE.MathUtils.damp(this.bodyPivot.rotation.z, rollTarget + Math.sin(this._time * 6.1) * 0.018 * speedFactor, 4.5, dt);

      for (const w of this.rearWheels) updateWheel(w, { linearSpeed: this.speed, radius: T.rearWheelDia / 2, dt });
      for (const w of this.frontWheels) updateWheel(w, { linearSpeed: this.speed, radius: T.frontWheelDia / 2, dt, steerAngle });

      if (this.trolley && this.trolley.attached) this.trolley.updateAttached(dt, this);
    } else if (p.kind === 'cart') {
      // Slowest, heaviest: a side-to-side sway (not a lean-into-turn like the bike),
      // damped rather than a constant sine so it settles when stationary.
      const swayTarget = Math.sin(this._time * 2.6) * 0.07 * (0.25 + speedFactor);
      this.bodyPivot.rotation.z = THREE.MathUtils.damp(this.bodyPivot.rotation.z, swayTarget, 3, dt);
      const pitchTarget = THREE.MathUtils.clamp(-accelSigned * 0.06, -0.05, 0.05);
      this.bodyPivot.rotation.x = THREE.MathUtils.damp(this.bodyPivot.rotation.x, pitchTarget, 3.5, dt);
      for (const w of this.wheels) updateWheel(w, { linearSpeed: this.speed, radius: C.wheelDia / 2, dt });
      this._updateBullockLegs();
    }
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

  /** World-space hitch point (tractor only) — used by main.js to test attach range. */
  get hitchWorldPoint() {
    return this.group.localToWorld(new THREE.Vector3(0, T.hitchY, T.hitchZ));
  }
}

/** Spawns the hero-zone vehicle set near the player's house, per
 * WorldData/vehicles.json positions (Tractor_M1, Bicycle_PlayersHouse,
 * BullockCart_PlayersHouse). Scooter isn't one of the four presets — skipped. The
 * trolley spawns separately, already attached, just behind the tractor. */
export function spawnVehicles(scene) {
  const vehicles = [];

  const bike = new Vehicle('bike', new THREE.Vector3(-48, 0, 28), 0);
  bike.addToScene(scene);
  vehicles.push(bike);

  const tractor = new Vehicle('tractor', new THREE.Vector3(-51, 0, 25), Math.PI);
  tractor.addToScene(scene);
  vehicles.push(tractor);

  // Spawn position must go through the tractor's actual transform (localToWorld), not
  // a naive Z offset — the tractor spawns yawed 180°, so "behind" isn't simply
  // +Z/-Z in world space. (A naive +Z offset here once put the trolley in FRONT of
  // the tractor — reversing toward it then drove the tractor away, not closer; see
  // docs/parked.md.)
  const tractorBackward = new THREE.Vector3(Math.sin(tractor.group.rotation.y), 0, Math.cos(tractor.group.rotation.y));
  const trolleySpawnPos = tractor.group.position.clone().addScaledVector(tractorBackward, TRACTOR_TOW_OFFSET_REST);
  const trolley = new Trolley(trolleySpawnPos, tractor.group.rotation.y);
  trolley.addToScene(scene);
  tractor.attachTrolley(trolley);

  const cart = new Vehicle('cart', new THREE.Vector3(-36, 0, 50), Math.PI * 0.5);
  cart.addToScene(scene);
  vehicles.push(cart);

  return vehicles;
}
