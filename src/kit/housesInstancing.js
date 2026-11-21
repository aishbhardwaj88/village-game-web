import * as THREE from 'three';

/**
 * Instancing helpers for the house kit (S7 sprint, houses agent).
 *
 * The PERF agent owns the shared helper (src/kit/instancing.js, createChunkedInstances). It did not exist when the houses
 * were built, so this file carries a minimal stand-in with the SAME signature (swap the import when the shared one lands).
 *
 * The houses themselves do not use per-chunk InstancedMeshes: with 8 designs x 7 footprint sizes x 2 mirrors plus far boxes
 * and 6 clutter pieces, one InstancedMesh per geometry per 100 m chunk would cost ~100+ draw calls. They use ONE BatchedMesh
 * (createHouseBatch): every geometry is stored once, every house is an instance, the batch culls each instance against the
 * camera itself (per-instance bounding spheres), so the whole village of houses is one draw call in the main pass.
 */

/** Stand-in for src/kit/instancing.js: one InstancedMesh per chunk of `chunkSize` metres, each with its own bounding sphere. */
export function createChunkedInstances({ geometry, material, items, chunkSize = 100, castShadow = false, name = 'chunked' }) {
  const group = new THREE.Group();
  group.name = name;
  const chunks = new Map();
  for (const it of items) {
    const k = Math.floor(it.x / chunkSize) + ',' + Math.floor(it.z / chunkSize);
    let l = chunks.get(k);
    if (!l) chunks.set(k, (l = []));
    l.push(it);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  for (const [k, list] of chunks) {
    const im = new THREE.InstancedMesh(geometry, material, list.length);
    im.name = `${name}_${k}`;
    list.forEach((it, i) => {
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, it.ry || 0);
      m.compose(p.set(it.x, it.y || 0, it.z), q, s.set(it.sx || 1, it.sy || 1, it.sz || 1));
      im.setMatrixAt(i, m);
      if (it.color != null) im.setColorAt(i, c.set(it.color));
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.castShadow = castShadow; im.receiveShadow = true;
    group.add(im);
  }
  return group;
}

/**
 * One BatchedMesh holding a set of named geometries. add(key, matrix, rgba) -> instance id.
 * `geometries` must all carry the same attributes (position, normal, uv, color, aCellPaint) and an index.
 */
export function createHouseBatch(geometries, material, maxInstances, name = 'houses_s7') {
  let verts = 0, idx = 0;
  for (const g of geometries.values()) { verts += g.attributes.position.count; idx += g.index.count; }
  const batch = new THREE.BatchedMesh(maxInstances, verts, idx, material);
  batch.name = name;
  batch.sortObjects = false; // opaque, and 2000 instances: the sort is not worth its CPU
  batch.perObjectFrustumCulled = true;
  batch.frustumCulled = false; // spread over the whole village: the batch-level sphere would never cull; instances are culled one by one
  batch.userData.noAutoCollider = true; // colliders are simple boxes per house (src/kit/houses.js)
  batch.userData.visualOnly = true;
  const ids = new Map();
  for (const [k, g] of geometries) ids.set(k, batch.addGeometry(g));
  const v4 = new THREE.Vector4();
  return {
    batch,
    geometryId: (k) => ids.get(k),
    add(key, matrix, rgba) {
      const id = batch.addInstance(ids.get(key));
      batch.setMatrixAt(id, matrix);
      batch.setColorAt(id, v4.set(rgba[0], rgba[1], rgba[2], rgba[3]));
      return id;
    },
  };
}
