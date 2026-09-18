import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Draw-call reduction (task 2, docs/parked.md): merges static, non-animated meshes
 * that already share one Material object into a single Mesh per material — one
 * draw call regardless of how many separate boxes/planes went into it. Relies on
 * materials.js's textured* helpers baking tint and per-object UV repeat into the
 * geometry itself (vertex colours / baked UV) so objects that used to need their
 * own Material (different tint or size) now share one cached Material and can be
 * folded together here. Never pass an animated group (vehicles, NPCs) in — the
 * merged mesh has no way to move its parts independently afterwards.
 */

/** Merges every mesh descendant of `group` (InstancedMesh excluded — those are
 * already one draw call) that shares a Material, replacing them with one merged
 * Mesh per material added as a new direct child of `group`. Geometry is baked
 * relative to `group` itself (group must have no parent transform yet — true for
 * every builder in this codebase, which runs before scene.add). */
export function mergeGroupByMaterial(group) {
  group.updateWorldMatrix(true, true);

  const buckets = new Map(); // material -> { geometries, castShadow, receiveShadow }
  const toRemove = [];

  group.traverse((obj) => {
    if (obj === group) return;
    if (!obj.isMesh || obj.isInstancedMesh) return;
    let bucket = buckets.get(obj.material);
    if (!bucket) buckets.set(obj.material, (bucket = { geometries: [], castShadow: false, receiveShadow: false }));
    bucket.geometries.push(obj.geometry.clone().applyMatrix4(obj.matrixWorld));
    bucket.castShadow = bucket.castShadow || obj.castShadow;
    bucket.receiveShadow = bucket.receiveShadow || obj.receiveShadow;
    toRemove.push(obj);
  });

  for (const obj of toRemove) obj.parent.remove(obj);

  let i = 0;
  for (const [material, bucket] of buckets) {
    const geometry = bucket.geometries.length > 1 ? mergeGeometries(bucket.geometries) : bucket.geometries[0];
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${material.name || 'merged'}_${i++}`;
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    // A merged mesh folds together sub-components of one or more buildings (e.g.
    // just the roofs, elevated by design) — never a single "placed object" of its
    // own, so tools/screenshot.js's whole-object grounding check skips anything
    // flagged this way, the same way it already skips shop_roofs/trim/plinth/etc.
    mesh.userData.mergedStatic = true;
    group.add(mesh);
  }
}

/** Merges a flat list of already-positioned, unparented Meshes (e.g. several
 * buildStripSegment() results) that all share one Material into a single Mesh. */
export function mergeMeshList(meshes, name) {
  const geometries = meshes.map((m) => {
    m.updateMatrix();
    return m.geometry.clone().applyMatrix4(m.matrix);
  });
  const geometry = geometries.length > 1 ? mergeGeometries(geometries) : geometries[0];
  const mesh = new THREE.Mesh(geometry, meshes[0].material);
  mesh.name = name;
  mesh.castShadow = meshes.some((m) => m.castShadow);
  mesh.receiveShadow = meshes.some((m) => m.receiveShadow);
  return mesh;
}
