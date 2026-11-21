import * as THREE from 'three';

/**
 * Instancing helpers for the house kit (S7 sprint, houses agent).
 *
 * The shared chunked helper is the PERF agent's src/kit/instancing.js (createChunkedInstances / createChunkedLOD), copied in
 * unchanged from s7-perf.
 * The houses themselves do not use per-chunk InstancedMeshes: with 8 designs x 7 footprint sizes x 2 mirrors plus far boxes
 * and 6 clutter pieces, one InstancedMesh per geometry per 100 m chunk would cost ~100+ draw calls. They use ONE BatchedMesh
 * (createHouseBatch): every geometry is stored once, every house is an instance, the batch culls each instance against the
 * camera itself (per-instance bounding spheres), so the whole village of houses is one draw call in the main pass.
 */

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
