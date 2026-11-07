import * as THREE from 'three';

/**
 * Village-wide BatchedMesh per shared place material (spike, 4 Nov). Every staged place model already has one mesh per material;
 * this folds those meshes of ALL batched places into ONE BatchedMesh per material, so a view with ten places costs
 * one draw per material, not ten.
 *
 * - The source meshes STAY in the scene graph on layer 1 (the camera never draws layer 1), so collision (src/autoColliders.js reads
 *   visible meshes), zone hiding and teardown work exactly as before. Only the drawing moves.
 * - Each place's world matrix becomes the instance matrix; the weathering shader (stagingYard addWeathering) adds batchingMatrix to
 *   its world position, so the mottling reads the same world coordinates as before.
 * - GLB attributes are dequantised to plain Float32 (position, normal, uv, color) so every geometry in a batch matches.
 * - Geometry is cached per source key and never freed (BatchedMesh space is bump-allocated); instances are freed on teardown.
 */
export const HIDDEN_LAYER = 1;
const root = new THREE.Group();
root.name = 'place_batches';
export function placeBatchRoot() { return root; }

const batches = new Map(); // material -> BatchedMesh
const geoCache = new Map(); // `${key}|${material uuid}` -> geometry id
const entries = new Set(); // { src, batch, gid, iid, key }

const eligible = (o) => o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !Array.isArray(o.material) && o.material.userData.placeBatchable
  && !o.material.transparent && !(o.material.alphaTest > 0) && o.geometry.attributes.position && o.geometry.attributes.normal && o.geometry.attributes.uv && o.geometry.attributes.color;

/** Materials of one texture set that differ ONLY in UV repeat share a batch: the repeat ratio is baked into the geometry UVs (same look, one draw). */
function setKey(mat) {
  const t = mat.map;
  if (!t || !t.source || mat.userData.noRepeatFold || t.offset.x || t.offset.y || t.rotation || mat.alphaMap) return null;
  return mat.name + '|' + t.source.uuid + '|' + (mat.normalMap ? mat.normalMap.source.uuid : '') + '|' + (mat.roughnessMap ? mat.roughnessMap.source.uuid : '') + '|' + mat.roughness + '|' + mat.metalness + '|' + mat.side + '|' + (mat.onBeforeCompile === Material.prototype.onBeforeCompile ? 'p' : mat.customProgramCacheKey());
}
const Material = THREE.Material;
const leaders = new Map(); // setKey -> leader material

function flat(src, ratio = [1, 1]) {
  const g = new THREE.BufferGeometry();
  for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2], ['color', 3]]) {
    const a = src.attributes[name];
    const f = new Float32Array(a.count * size);
    const get = [a.getX, a.getY, a.getZ];
    for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) f[i * size + k] = get[k].call(a, i) * (name === 'uv' ? ratio[k] : 1);
    g.setAttribute(name, new THREE.BufferAttribute(f, size));
  }
  if (src.index) g.setIndex(new THREE.BufferAttribute(Uint32Array.from(src.index.array), 1));
  else g.setIndex(new THREE.BufferAttribute(Uint32Array.from({ length: src.attributes.position.count }, (_, i) => i), 1));
  return g;
}

function batchFor(mat) {
  let b = batches.get(mat);
  if (!b) {
    b = new THREE.BatchedMesh(16, 60000, 180000, mat);
    b.name = 'placebatch_' + mat.name;
    b.castShadow = true; b.receiveShadow = true;
    b.frustumCulled = false; // instances are culled one by one
    b.userData.noAutoCollider = true; // the hidden source meshes carry the colliders
    b.userData.visualOnly = true;
    batches.set(mat, b);
    root.add(b);
  }
  return b;
}

/** Moves the drawing of `model`'s eligible meshes into the shared batches; call once, after the model (and any folded-in lanterns) is final. */
export function batchPlaceModel(model, key) {
  model.updateWorldMatrix(true, true);
  model.traverse((o) => {
    if (!eligible(o) || o.userData.placeBatched) return;
    let mat = o.material, ratio = [1, 1];
    const sk = setKey(mat);
    if (sk) {
      const lead = leaders.get(sk);
      if (!lead) leaders.set(sk, mat);
      else if (lead !== mat) { ratio = [mat.map.repeat.x / lead.map.repeat.x, mat.map.repeat.y / lead.map.repeat.y]; mat = lead; }
    }
    (globalThis.__pbDbg ||= []).push(sk || ('NOKEY|' + mat.name));
    const b = batchFor(mat);
    const ck = key + '|' + o.name + '|' + (o.material.userData.siteProps ? 'sp' + o.geometry.attributes.position.count + '|' + o.material.name + '|' + o.material.roughness : o.material.uuid); // site builders make a fresh material clone per build; geometry is deterministic, so key by shape to avoid re-adding on every re-stream
    let gid = geoCache.get(ck);
    if (gid === undefined) {
      const geo = flat(o.geometry, ratio);
      const nv = geo.attributes.position.count, ni = geo.index.count;
      if (b.unusedVertexCount < nv || b.unusedIndexCount < ni) b.setGeometrySize(Math.max(b._maxVertexCount * 2, b._nextVertexStart + nv), Math.max(b._maxIndexCount * 2, b._nextIndexStart + ni));
      gid = b.addGeometry(geo);
      geoCache.set(ck, gid);
    }
    if (b._instanceInfo.filter((x) => x.active).length >= b.maxInstanceCount) b.setInstanceCount(b.maxInstanceCount * 2);
    const iid = b.addInstance(gid);
    o.updateWorldMatrix(true, false);
    b.setMatrixAt(iid, o.matrixWorld);
    b.setVisibleAt(iid, false);
    o.layers.set(HIDDEN_LAYER);
    o.userData.placeBatched = true;
    entries.add({ src: o, batch: b, gid, iid });
  });
}

const pending = []; // { model, key, age }
/** Like batchPlaceModel, for builders that return a group before the zone manager has added it to the scene: batches once the group is rooted. */
export function batchPlaceModelWhenRooted(model, key) { pending.push({ model, key, age: 0 }); }

function rooted(o) {
  let visible = true;
  for (let p = o; p; p = p.parent) {
    if (!p.visible) visible = false;
    if (p.isScene) return visible;
  }
  return null;
}

/** Once a frame: mirrors each source mesh's visibility (zone / distance hiding) into its batch instance; frees instances of torn-down places. */
export function syncPlaceBatches() {
  for (let i = pending.length - 1; i >= 0; i--) {
    const p = pending[i];
    if (rooted(p.model) !== null) { pending.splice(i, 1); batchPlaceModel(p.model, p.key); } else if (++p.age > 1800) pending.splice(i, 1);
  }
  for (const e of entries) {
    const vis = rooted(e.src);
    if (vis === null) { e.batch.deleteInstance(e.iid); entries.delete(e); continue; }
    e.batch.setVisibleAt(e.iid, vis);
  }
}
