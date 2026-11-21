import * as THREE from 'three';

/**
 * Chunked instancing helper for the S7 kits (houses, shops-land, trees, fields).
 *
 * Why: one InstancedMesh for 400 houses spread over 1 km is ONE draw call but it can never
 * be frustum-culled (its bounding sphere covers the whole village), so the GPU shades every
 * house every frame, and its shadow pass draws all of them too. Splitting the instances into
 * 100 m map chunks keeps draw calls low (one per occupied chunk) while chunks behind the
 * camera, or outside the sun's shadow box, are skipped.
 *
 * API (documented for the kit agents in docs/s7/perf.md):
 *
 *   createChunkedInstances({ geometry, material, items, chunkSize = 100,
 *                            castShadow = false, receiveShadow = true, name,
 *                            heightAt })
 *     items: [{ x, z, y?, ry?, sx = 1, sy = 1, sz = 1, color? }]
 *       x/z world metres, y defaults to heightAt(x, z) if given, else 0; ry = yaw in radians;
 *       color = hex number, CSS string or THREE.Color (multiplies material.color).
 *     returns a THREE.Group named `name`, one InstancedMesh child per occupied chunk.
 *       group.userData.chunks  = [{ key, cx, cz, mesh, center: Vector3, radius, count }]
 *       group.userData.count   = total instances
 *       group.userData.dispose() frees the instance buffers (NOT the shared geometry/material,
 *                                the caller owns those).
 *
 *   createChunkedLOD({ near: { geometry, material }, far: { geometry, material }, items,
 *                      chunkSize = 100, switchDistance = 120, castShadow = false,
 *                      receiveShadow = true, name, heightAt, farCastShadow = false })
 *     Same items. Each chunk gets a near and a far InstancedMesh; only one is visible,
 *     chosen by the horizontal distance from the camera to the chunk's edge (so the chunk
 *     you stand in is always near). Re-checked at most every 200 ms, automatically, during
 *     rendering (no wiring needed). 10% hysteresis so a chunk on the boundary does not
 *     flicker. far may be omitted ({ far: null }) to simply hide chunks beyond switchDistance.
 *     returns a THREE.Group; group.userData.update(camera, force?) forces a re-check,
 *     group.userData.chunks as above plus { near, far, isNear }.
 *
 * Every chunk mesh is tagged mesh.userData.chunked = true and mesh.userData.wantsShadow =
 * castShadow, so the distance shadow manager (src/renderer.js updateShadowCasters) can
 * switch castShadow per chunk by distance cheaply.
 */

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _box = new THREE.Box3();

function chunkKeyOf(x, z, chunkSize) {
  const cx = Math.floor(x / chunkSize);
  const cz = Math.floor(z / chunkSize);
  return { cx, cz, key: cx + ',' + cz };
}

function groupItems(items, chunkSize) {
  const buckets = new Map();
  for (const it of items) {
    if (!it || !Number.isFinite(it.x) || !Number.isFinite(it.z)) continue;
    const { cx, cz, key } = chunkKeyOf(it.x, it.z, chunkSize);
    let b = buckets.get(key);
    if (!b) { b = { key, cx, cz, items: [] }; buckets.set(key, b); }
    b.items.push(it);
  }
  return [...buckets.values()];
}

function itemMatrix(it, heightAt) {
  const y = Number.isFinite(it.y) ? it.y : (heightAt ? heightAt(it.x, it.z) : 0);
  _p.set(it.x, y, it.z);
  _e.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ');
  _q.setFromEuler(_e);
  _s.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
  return _m.compose(_p, _q, _s);
}

function buildChunkMesh(geometry, material, bucket, opts, suffix) {
  const n = bucket.items.length;
  const mesh = new THREE.InstancedMesh(geometry, material, n);
  mesh.name = `${opts.name || 'chunked'}${suffix}_${bucket.key}`;
  const hasColor = bucket.items.some((it) => it.color !== undefined && it.color !== null);
  for (let i = 0; i < n; i++) {
    const it = bucket.items[i];
    mesh.setMatrixAt(i, itemMatrix(it, opts.heightAt));
    if (hasColor) {
      if (it.color === undefined || it.color === null) _c.setRGB(1, 1, 1);
      else if (it.color.isColor) _c.copy(it.color);
      else _c.set(it.color);
      mesh.setColorAt(i, _c);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  // Static: never re-upload, never recompute.
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  mesh.frustumCulled = true;
  mesh.castShadow = !!opts.castShadow;
  mesh.receiveShadow = opts.receiveShadow !== false;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  mesh.userData.chunked = true;
  mesh.userData.wantsShadow = !!opts.castShadow;
  return mesh;
}

function chunkRecord(bucket, mesh) {
  _box.copy(mesh.boundingBox);
  const center = mesh.boundingSphere.center.clone();
  return {
    key: bucket.key,
    cx: bucket.cx,
    cz: bucket.cz,
    count: bucket.items.length,
    mesh,
    center,
    radius: mesh.boundingSphere.radius,
    // XZ extent of the actual instances (used for edge distance in the LOD).
    minX: _box.min.x, maxX: _box.max.x, minZ: _box.min.z, maxZ: _box.max.z,
  };
}

export function createChunkedInstances({
  geometry, material, items, chunkSize = 100, castShadow = false, receiveShadow = true, name, heightAt,
} = {}) {
  if (!geometry || !material) throw new Error('createChunkedInstances: geometry and material are required');
  const group = new THREE.Group();
  group.name = name || 'chunked_instances';
  const opts = { castShadow, receiveShadow, name: group.name, heightAt };
  const chunks = [];
  let count = 0;
  for (const bucket of groupItems(items || [], chunkSize)) {
    const mesh = buildChunkMesh(geometry, material, bucket, opts, '');
    group.add(mesh);
    chunks.push(chunkRecord(bucket, mesh));
    count += bucket.items.length;
  }
  group.userData.chunks = chunks;
  group.userData.count = count;
  group.userData.chunkSize = chunkSize;
  group.userData.dispose = () => {
    for (const c of chunks) { c.mesh.dispose(); c.mesh.removeFromParent(); }
    chunks.length = 0;
  };
  return group;
}

// One shared material for the LOD sentinel. The sentinel is a THREE.Points with no position
// attribute, so three.js returns before issuing a draw call (renderer.info.calls is not
// incremented); it only exists to get an onBeforeRender callback with the real view camera.
// Points (not Mesh) so the merge passes (mergeUtils, isMesh) and collider builders ignore it.
let _sentinelMat = null;
function sentinelMaterial() {
  if (!_sentinelMat) _sentinelMat = new THREE.PointsMaterial({ size: 0, colorWrite: false, depthWrite: false, depthTest: false });
  return _sentinelMat;
}

const LOD_INTERVAL_MS = 200;
const HYSTERESIS = 0.1;

function edgeDistanceXZ(c, x, z) {
  const dx = x < c.minX ? c.minX - x : (x > c.maxX ? x - c.maxX : 0);
  const dz = z < c.minZ ? c.minZ - z : (z > c.maxZ ? z - c.maxZ : 0);
  return Math.hypot(dx, dz);
}

export function createChunkedLOD({
  near, far, items, chunkSize = 100, switchDistance = 120, castShadow = false, receiveShadow = true,
  name, heightAt, farCastShadow = false,
} = {}) {
  if (!near || !near.geometry || !near.material) throw new Error('createChunkedLOD: near.geometry and near.material are required');
  const group = new THREE.Group();
  group.name = name || 'chunked_lod';
  const chunks = [];
  let count = 0;
  for (const bucket of groupItems(items || [], chunkSize)) {
    const nearMesh = buildChunkMesh(near.geometry, near.material, bucket, { castShadow, receiveShadow, name: group.name, heightAt }, '_near');
    group.add(nearMesh);
    let farMesh = null;
    if (far && far.geometry && far.material) {
      farMesh = buildChunkMesh(far.geometry, far.material, bucket, { castShadow: farCastShadow, receiveShadow, name: group.name, heightAt }, '_far');
      farMesh.visible = false;
      group.add(farMesh);
    }
    const rec = chunkRecord(bucket, nearMesh);
    rec.near = nearMesh;
    rec.far = farMesh;
    rec.isNear = true;
    chunks.push(rec);
    count += bucket.items.length;
  }

  let lastUpdate = -Infinity;
  const camPos = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  const update = (camera, force = false) => {
    const now = performance.now();
    if (!force && now - lastUpdate < LOD_INTERVAL_MS) return;
    lastUpdate = now;
    camera.getWorldPosition(camPos);
    // Chunk extents are in the group's local space; bring the camera into it.
    group.updateWorldMatrix(true, false);
    inv.copy(group.matrixWorld).invert();
    camPos.applyMatrix4(inv);
    for (const c of chunks) {
      const d = edgeDistanceXZ(c, camPos.x, camPos.z);
      const limit = c.isNear ? switchDistance * (1 + HYSTERESIS) : switchDistance * (1 - HYSTERESIS);
      const wantNear = d < limit;
      if (wantNear === c.isNear) continue;
      c.isNear = wantNear;
      c.near.visible = wantNear;
      if (c.far) c.far.visible = !wantNear;
    }
  };

  // Automatic update: the sentinel is drawn (as nothing) every frame the group is in the scene.
  // castShadow false keeps it out of the shadow pass, so `camera` is always the view camera.
  const sentinel = new THREE.Points(new THREE.BufferGeometry(), sentinelMaterial());
  sentinel.raycast = () => {};
  sentinel.name = `${group.name}_lod_sentinel`;
  sentinel.frustumCulled = false;
  sentinel.castShadow = false;
  sentinel.receiveShadow = false;
  sentinel.userData.noCollide = true;
  sentinel.userData.lodSentinel = true;
  sentinel.onBeforeRender = (_renderer, _scene, camera) => {
    if (camera && camera.isCamera && !camera.isOrthographicCamera) update(camera);
  };
  group.add(sentinel);

  group.userData.chunks = chunks;
  group.userData.count = count;
  group.userData.chunkSize = chunkSize;
  group.userData.switchDistance = switchDistance;
  group.userData.update = update;
  group.userData.dispose = () => {
    for (const c of chunks) {
      c.near.dispose(); c.near.removeFromParent();
      if (c.far) { c.far.dispose(); c.far.removeFromParent(); }
    }
    sentinel.geometry.dispose();
    sentinel.removeFromParent();
    chunks.length = 0;
  };
  return group;
}
