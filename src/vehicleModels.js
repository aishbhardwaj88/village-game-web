/**
 * Real models on the DRIVABLE vehicles (25 Nov 2026, her order: the downloaded free models are the look).
 * The code-built tractor, trolley and bicycle in src/vehicles.js stay as the physics body and as the fallback: colliders, hitch,
 * mount points, speed and ground contact are untouched. When a model has streamed in (src/propGate.js, one site per file, so
 * nothing is requested before the Play gate: gateRadius 0, the ring loads them after Play; the player's own cycle stays player_cycle_v2.glb), the code-built visuals are
 * hidden and the model is parented to the vehicle, so it moves, sways and tows with it.
 * Files: public/assets/vehicles_free/{old_tractor,trailer_pack,bicycle}.glb (credits: docs/CREDITS.md).
 * Wheels: the tractor is one mesh (no wheel spin). The trailer's wheel mesh holds both axles and the bicycle's holds both wheels:
 * each is split by triangle position into one mesh per axle/wheel, which spins about its own centre.
 */
import * as THREE from 'three';
import { registerPropSite } from './propGate.js';
import { footOffsetY } from './vehicleFit.js';
import { createVehicleShadowSet } from './vehicleContactShadow.js';

const BASE = 'assets/vehicles_free/';
// bed of the trailer in the file: z -2.03..2.04 (4.08 m), drawbar eye at z 4.07, wheels on two axles (z about -1.2 and +1.2)
export const TRAILER_SCALE = 3.5 / 4.08; // bed 3.5 x 1.94 m, same as the trolley collider (TR.bedLen x TR.bedW)
export const TRAILER_DRAWBAR_M = 4.07 * TRAILER_SCALE - 1.75; // drawbar eye ahead of the bed's front edge, so the eye meets the hitch
const _m = new THREE.Matrix4(), _v = new THREE.Vector3();

/** Splits a mesh's triangles into two meshes by the world position of each triangle's centre along `axis` (0 x, 2 z). */
function splitByAxis(mesh, axis) {
  const g = mesh.geometry, pos = g.attributes.position, idx = g.index;
  const n = idx ? idx.count : pos.count, cen = [];
  let lo = Infinity, hi = -Infinity;
  for (let t = 0; t < n; t += 3) {
    let s = 0;
    for (let k = 0; k < 3; k++) { _v.fromBufferAttribute(pos, idx ? idx.getX(t + k) : t + k).applyMatrix4(mesh.matrixWorld); s += axis === 0 ? _v.x : _v.z; }
    s /= 3; cen.push(s); lo = Math.min(lo, s); hi = Math.max(hi, s);
  }
  const mid = (lo + hi) / 2, parts = [[], []];
  for (let t = 0, i = 0; t < n; t += 3, i++) for (let k = 0; k < 3; k++) parts[cen[i] < mid ? 0 : 1].push(idx ? idx.getX(t + k) : t + k);
  return parts.map((list) => {
    const geo = new THREE.BufferGeometry();
    for (const name in g.attributes) geo.setAttribute(name, g.attributes[name]); // shared buffers, only the index differs
    geo.setIndex(list);
    const box = new THREE.Box3(), local = new THREE.Box3();
    for (const i of list) { _v.fromBufferAttribute(pos, i); local.expandByPoint(_v); box.expandByPoint(_v.applyMatrix4(mesh.matrixWorld)); }
    geo.boundingBox = local; geo.boundingSphere = local.getBoundingSphere(new THREE.Sphere()); // the shared buffer would give the whole wheel mesh's bounds
    const mat = mesh.material;
    const m = new THREE.Mesh(geo, mat);
    m.matrixWorld.copy(mesh.matrixWorld);
    return { mesh: m, centre: box.getCenter(new THREE.Vector3()), radius: (box.max.y - box.min.y) / 2 };
  });
}

/** One spinning wheel part. Same contract as createRoadWheel's result for updateWheel(): userData.roll.rotation.y spins it.
 * `sign` is +1 when the frame's forward is -Z (the vehicle group) and -1 when it is +Z (the bicycle's inner frame). */
function spinPart(part, sign) {
  const steer = new THREE.Group(); // kept so updateWheel's steer assignment has somewhere to go; the model wheel does not steer
  steer.position.copy(part.centre);
  const orient = new THREE.Group(); orient.rotation.z = sign * Math.PI / 2; steer.add(orient);
  const roll = new THREE.Group(); orient.add(roll);
  const inner = new THREE.Group(); inner.rotation.z = -sign * Math.PI / 2; roll.add(inner);
  part.mesh.matrixAutoUpdate = false;
  part.mesh.matrix.copy(_m.makeTranslation(-part.centre.x, -part.centre.y, -part.centre.z).multiply(part.mesh.matrixWorld));
  part.mesh.matrixWorld.identity();
  inner.add(part.mesh);
  steer.userData.roll = roll;
  steer.userData.radius = part.radius;
  return steer;
}

/**
 * Scales and orients the glTF in the vehicle's own frame. Returns { holder, wheels } (wheels: spinning parts, if the wheel mesh
 * was found). `centre`: 'box' centres the bounding box on x/z, 'origin' keeps the file's own origin (the trailer's bed centre).
 */
function prepare(gltf, { file, axis, length, scale, yaw, centre, wheelName, wheelAxis, spinSign }) {
  const holder = new THREE.Group();
  const body = new THREE.Group();
  const model = gltf.scene;
  body.add(model);
  model.updateMatrixWorld(true);
  const raw = new THREE.Box3().setFromObject(model, true).getSize(new THREE.Vector3());
  const k = length ? length / raw[axis] : (scale || 1);
  body.scale.setScalar(k);
  body.rotation.y = yaw;
  body.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(body, true);
  const c = box.getCenter(new THREE.Vector3());
  body.position.set(centre === 'origin' ? 0 : -c.x, footOffsetY(file, box.min.y, box.max.y - box.min.y, 1), centre === 'origin' ? 0 : -c.z); // tyre contact on y 0 (box is already scaled, k = 1)
  holder.add(body);
  holder.updateMatrixWorld(true);
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const wheels = [];
  if (wheelName) {
    let wm = null;
    model.traverse((o) => { if (o.isMesh && wheelName.test(o.name)) wm = o; });
    if (wm) {
      const parts = splitByAxis(wm, wheelAxis);
      wm.parent.remove(wm);
      for (const p of parts) { const s = spinPart(p, spinSign); holder.add(s); wheels.push(s); }
    }
  }
  return { holder, wheels, scale: k };
}

function hideAll(list) { for (const o of list) if (o) o.visible = false; }

export const _sites = []; // for tools/tests: the registered site descriptors (build/onReady can be driven without the ring)
function register({ name, file, size, center, spec, attach }) {
  let built = null;
  const site = {
    name, center, extent: 3, gateRadius: 0, once: true, dead: true, // dead: the code-built vehicle shows meanwhile, no hole to hold the game for
    items: [{ url: `${BASE}${file}.glb`, size }],
    makeGroup: () => new THREE.Group(),
    build: (gltfs, group) => { if (!gltfs[0] || built) return; built = prepare(gltfs[0], { ...spec, file }); built.holder.userData.propSize = size; group.add(built.holder); },
    onReady: () => {
      if (!built || built.holder.userData.attached) return;
      built.holder.userData.attached = true;
      attach(built);
      built.holder.visible = true;
    },
  };
  _sites.push(site);
  registerPropSite(site);
}

/** Called from spawnVehicles(): registers the three model sites. `tractor`, `trolley`, `bike` are the Vehicle/Trolley objects. */
/** Rotated soft contact shadow parented to the vehicle's ground-aligned group (the group tilts with the road, so it stays flat on it). */
function addGroundShadow(group, len, wid) {
  const set = createVehicleShadowSet(1, 'vehicle_contact_shadow'); set.place(0, 0, 0, 0, 0, len, wid); group.add(set.mesh);
}

export function registerVehicleModels({ tractor, trolley, bike }) {
  register({
    name: 'veh_tractor', file: 'old_tractor', size: 3.5, center: { x: tractor.group.position.x, z: tractor.group.position.z },
    spec: { axis: 'z', length: 3.5, yaw: Math.PI, centre: 'box' }, // file's nose is +Z, the game's is -Z
    attach: ({ holder }) => {
      hideAll([...tractor.bodyPivot.children, ...tractor.rearWheels, ...tractor.frontWheels]);
      tractor.bodyPivot.add(holder);
      addGroundShadow(tractor.group, 3.5, 1.9);
    },
  });
  register({
    name: 'veh_trolley', file: 'trailer_pack', size: 3.5, center: { x: trolley.group.position.x, z: trolley.group.position.z },
    spec: { axis: 'z', length: null, yaw: Math.PI, centre: 'origin', wheelName: /wheels/, wheelAxis: 2, spinSign: 1, scale: TRAILER_SCALE },
    attach: ({ holder, wheels }) => {
      hideAll(trolley.group.children);
      trolley.group.add(holder);
      addGroundShadow(trolley.group, 3.5, 1.94);
      for (const w of wheels) w.userData.spinScale = (1.1 / 2) / w.userData.radius; // updateWheel is given the code-built wheel radius
      if (wheels.length) trolley.wheels.splice(0, trolley.wheels.length, ...wheels);
    },
  });
  register({
    name: 'veh_bike', file: 'bicycle', size: 1.7, center: { x: bike.group.position.x, z: bike.group.position.z },
    spec: { axis: 'x', length: 1.7, yaw: -Math.PI / 2, centre: 'box', wheelName: /whell/, wheelAxis: 2, spinSign: -1 }, // file's front is +X; the bike's inner frame has its front at +Z
    attach: ({ holder, wheels }) => {
      hideAll([...bike.bodyPivot.children, bike.frontWheel, bike.rearWheel]);
      bike.bodyPivot.add(holder);
      addGroundShadow(bike.group, 1.7, 0.6);
      for (const w of wheels) w.userData.spinScale = 0.3 / w.userData.radius;
      if (wheels.length === 2) {
        // after the -90 deg turn the file's front (+X) is +Z: the wheel further along +Z is the front one
        const [a, b] = wheels, front = a.position.z > b.position.z ? a : b;
        bike.frontWheel = front; bike.rearWheel = front === a ? b : a;
      }
    },
  });
}
