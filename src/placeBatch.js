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

const IDENTITY = new THREE.Matrix4();
const eligible = (o) => o.isMesh && o.name !== 'tyre' && !o.isInstancedMesh && !o.isSkinnedMesh && !Array.isArray(o.material) && o.material.userData.placeBatchable && (!o.material.userData.worldBakedOnly || o.matrixWorld.equals(IDENTITY))
  && (!o.material.transparent || o.material.userData.batchTransparent) && !(o.material.alphaTest > 0) && o.geometry.attributes.position && o.geometry.attributes.normal && o.geometry.attributes.uv && o.geometry.attributes.color;

/** Materials of one texture set that differ ONLY in UV repeat share a batch: the repeat ratio is baked into the geometry UVs (same look, one draw). */
function setKey(mat) {
  const t = mat.map;
  if (!t || !t.source || mat.aoMap || mat.vertexColors !== true && mat.userData.worldBakedOnly || mat.userData.noRepeatFold || t.rotation || mat.alphaMap) return null;
  return mat.name + '|' + t.source.uuid + '|off' + t.offset.x + ',' + t.offset.y + '|' + (mat.normalMap ? mat.normalMap.source.uuid + ':' + mat.normalMap.offset.x + ',' + mat.normalMap.offset.y + ',' + mat.normalMap.repeat.x + ',' + mat.normalMap.repeat.y : '') + '|' + (mat.roughnessMap ? mat.roughnessMap.source.uuid : '') + '|' + mat.roughness + '|' + mat.metalness + '|' + mat.color.getHex() + '|' + mat.vertexColors + '|' + mat.side + '|' + (mat.onBeforeCompile === Material.prototype.onBeforeCompile ? 'p' : mat.customProgramCacheKey());
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

/** Same rule as mergeUtils.js NO_SHADOW_MATERIALS: small jute sacks cast no useful shadow and every caster costs a second draw in the shadow pass. */
const NO_SHADOW_NAMES = new Set(['jute', 'hb_jute']);

// Kept off mat.userData: Material.copy() JSON-serialises userData, and a twin pointing back at its material is circular.
// One batch per (material, shadow flag): the material's natural flag uses the material itself as key, the other flag a twin key.
const castTwins = new WeakMap();
const naturalCast = (mat) => !mat.userData.batchNoShadow && !NO_SHADOW_NAMES.has(mat.name);
function batchFor(mat, cast = true, exact = false) {
  const nat = naturalCast(mat);
  const want = exact ? !!cast : nat && (mat.userData.worldBakedOnly ? cast : true);
  let bk = mat;
  if (want !== nat) { let t = castTwins.get(mat); if (!t) castTwins.set(mat, t = {}); bk = t[want] || (t[want] = { mat, want }); }
  let b = batches.get(bk);
  if (!b) {
    b = new THREE.BatchedMesh(16, 60000, 180000, mat);
    b.name = 'placebatch_' + mat.name;
    b.castShadow = want; b.receiveShadow = true;
    b.frustumCulled = false; // instances are culled one by one
    b.userData.noAutoCollider = true; // the hidden source meshes carry the colliders
    b.userData.visualOnly = true;
    batches.set(bk, b);
    root.add(b);
  }
  return b;
}

/** Moves the drawing of `model`'s eligible meshes into the shared batches; call once, after the model (and any folded-in lanterns) is final. */
export function batchPlaceModel(model, key, exactCast = false) {
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
    const b = batchFor(mat, exactCast || mat.userData.worldBakedOnly ? o.castShadow : true, exactCast);
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
export function batchPlaceModelWhenRooted(model, key, late = false) { pending.push({ model, key, age: 0, late, rooted: false }); }

/** The village-wide static merge (src/mergeUtils.js mergeAcrossGroups): its per-material meshes whose material is a place-batch material
 *  join that material's batch instead of costing a call of their own. Each keeps its own shadow flag (exact), its distance gate (the
 *  source mesh's .visible is mirrored every frame) and its colliders (the source stays in the graph on the hidden layer). */
export function batchStaticGroup(group, key) { pending.push({ model: group, key, age: 0, late: false, rooted: false, exact: true }); }

/** World-baked static groups built after the village merge (road events, vendors2, life scenes 2, cyclist events): their code-built tiled meshes
 *  (geometry already in world space, so the world-space mottling shaders stay correct) join one batch per material and shadow flag. */
const TILED = new Set(['wood', 'metal', 'concrete', 'plaster', 'brick', 'terracotta', 'tin', 'jute', 'tarpaulin']);
function markTiled(root) {
  root.traverse((o) => {
    const m = o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) ? o.material : null;
    if (!m || !m.isMeshStandardMaterial || m.transparent || !m.map || !TILED.has(m.name) || m.userData.placeBatchable || m.userData.baseGrime) return;
    m.userData.placeBatchable = true; m.userData.worldBakedOnly = true;
  });
}
export function batchLateGroup(group, key) { pending.push({ model: group, key, age: 0, late: true, rooted: false, tiled: true }); }

/** Static capsule-people InstancedMeshes (ride nooks, vendors, small shops, ambient life scenes) fold into ONE BatchedMesh with one shared
 *  material and per-instance colour; the source meshes stay in the graph on the hidden layer and drive visibility. */
const peopleSrc = []; // { mesh, iids, last }
let peopleBatch = null, peopleCount = 0;
const peopleGeo = new Map();
export function batchPeopleMesh(mesh) { peopleSrc.push({ mesh, iids: null, last: null, age: 0 }); }
/** Re-copy a batched people mesh's instance matrices into the shared batch (after they were moved, e.g. settled on the ground). */
export function refreshPeopleMesh(mesh) {
  const e = peopleSrc.find((s) => s.mesh === mesh);
  if (!e || !e.iids) return;
  const mm = new THREE.Matrix4();
  mesh.updateWorldMatrix(true, false);
  for (let k = 0; k < e.iids.length; k++) { mesh.getMatrixAt(k, mm); mm.premultiply(mesh.matrixWorld); peopleBatch.setMatrixAt(e.iids[k], mm); }
}
function peopleBatchGet() {
  if (!peopleBatch) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 }); mat.name = 'people_pool';
    peopleBatch = new THREE.BatchedMesh(64, 20000, 80000, mat);
    peopleBatch.name = 'placebatch_people'; peopleBatch.castShadow = true; peopleBatch.receiveShadow = true;
    peopleBatch.frustumCulled = false; peopleBatch.userData.noAutoCollider = true; peopleBatch.userData.visualOnly = true;
    root.add(peopleBatch);
  }
  return peopleBatch;
}
function syncPeople() {
  for (let i = peopleSrc.length - 1; i >= 0; i--) {
    const e = peopleSrc[i], m = e.mesh, vis = rooted(m);
    if (!e.iids) {
      if (vis === null) { if (++e.age > 1800) peopleSrc.splice(i, 1); continue; }
      const g = m.geometry, pr = g.parameters;
      if (!pr || pr.radius === undefined || !pr.capSegments) { peopleSrc.splice(i, 1); continue; } // only capsule placeholders
      const b = peopleBatchGet();
      const gk = [pr.radius, pr.height ?? pr.length, pr.capSegments, pr.radialSegments].join('|');
      let gid = peopleGeo.get(gk);
      if (gid === undefined) { gid = b.addGeometry(g.clone()); peopleGeo.set(gk, gid); }
      m.updateWorldMatrix(true, false);
      const mm = new THREE.Matrix4(), c = new THREE.Color();
      e.iids = [];
      for (let k = 0; k < m.count; k++) {
        if (b._instanceInfo.filter((x) => x.active).length >= b.maxInstanceCount) b.setInstanceCount(b.maxInstanceCount * 2);
        const iid = b.addInstance(gid); peopleCount++;
        m.getMatrixAt(k, mm); mm.premultiply(m.matrixWorld); b.setMatrixAt(iid, mm);
        if (m.instanceColor) { m.getColorAt(k, c); b.setColorAt(iid, c); } else b.setColorAt(iid, c.set(0xffffff));
        b.setVisibleAt(iid, false); e.iids.push(iid);
      }
      m.layers.set(HIDDEN_LAYER);
    }
    if (vis === null) { for (const iid of e.iids) peopleBatch.deleteInstance(iid); peopleCount -= e.iids.length; peopleSrc.splice(i, 1); continue; }
    if (e.last !== vis) { for (const iid of e.iids) peopleBatch.setVisibleAt(iid, vis); e.last = vis; }
  }
}


/** LIVE meshes: animated InstancedMeshes (animals, people scenes) and single merged character meshes whose matrices change every frame.
 *  Draw moves into one shared BatchedMesh per material signature; the source stays in the graph on the hidden layer and keeps driving
 *  its own matrices, which are mirrored (only while visible) once a frame. Same look: one material, per-instance colour, same geometry. */
const liveSrc = []; // { mesh, iids, gid, batch, last, age, colV, key }
const liveBatches = new Map(); // signature -> BatchedMesh
const liveGeo = new Map(); // `${batch uuid}|${geometry uuid}` -> { gid, refs }
/** `opts.static`: the mesh and its parents never move after the first frame (trees): matrices are copied once, on first visible frame. */
export function batchLiveMesh(mesh, opts = {}) { liveSrc.push({ mesh, iids: null, gid: -1, batch: null, last: null, age: 0, colV: -1, geoKey: null, still: !!opts.static, copied: false }); }
const SHARED_ATTRS = ['position', 'normal', 'uv'];
const FULL_ATTRS = ['position', 'normal', 'uv', 'color'];
function liveSig(m) {
  return [m.type, m.map && m.map.source.uuid, m.normalMap && m.normalMap.source.uuid, m.bumpMap && m.bumpMap.source.uuid, m.roughnessMap && m.roughnessMap.source.uuid,
    m.roughness, m.metalness, m.color.getHex(), m.vertexColors, m.side, m.bumpScale, m.emissive.getHex(), m.alphaTest, m.name].join('|');
}
const liveEligible = (o) => (o.isMesh && !o.isSkinnedMesh && !Array.isArray(o.material) && o.material.isMeshStandardMaterial && !o.material.transparent
  && (o.material.userData.liveBatchable || (!(o.material.alphaTest > 0) && o.material.onBeforeCompile === Material.prototype.onBeforeCompile)) && !o.material.aoMap && !o.material.alphaMap && !o.material.emissiveMap && !o.material.displacementMap
  && o.geometry.attributes.position && o.geometry.attributes.normal && o.geometry.isBufferGeometry);
function liveGeometry(src, names) {
  const n = src.attributes.position.count, g = new THREE.BufferGeometry();
  for (const name of names) {
    const size = name === 'uv' ? 2 : 3, a = src.attributes[name], f = new Float32Array(n * size);
    if (a) { const get = [a.getX, a.getY, a.getZ]; for (let i = 0; i < n; i++) for (let k = 0; k < size; k++) f[i * size + k] = get[k].call(a, i); }
    else if (name === 'color') f.fill(1);
    g.setAttribute(name, new THREE.BufferAttribute(f, size));
  }
  g.setIndex(new THREE.BufferAttribute(src.index ? Uint32Array.from(src.index.array) : Uint32Array.from({ length: n }, (_, i) => i), 1));
  return g;
}
function liveBatchFor(m, cast) {
  const sig = liveSig(m);
  const plain = !m.map && !m.normalMap && !m.bumpMap && !m.roughnessMap && !m.vertexColors && m.roughness === 0.85 && m.metalness === 0 && m.color.getHex() === 0xffffff && m.side === THREE.FrontSide && m.emissive.getHex() === 0;
  if (plain) return { b: peopleBatchGet(), names: SHARED_ATTRS, sig: 'people' };
  const key = sig + '|' + cast;
  let b = liveBatches.get(key);
  if (!b) {
    b = new THREE.BatchedMesh(32, 6000, 24000, m);
    b.name = 'placebatch_live_' + (m.name || 'mat'); b.castShadow = cast; b.receiveShadow = true;
    b.frustumCulled = false; b.userData.noAutoCollider = true; b.userData.visualOnly = true;
    liveBatches.set(key, b); root.add(b);
  }
  return { b, names: FULL_ATTRS, sig: key };
}
const _lm = new THREE.Matrix4(), _lc = new THREE.Color();
const liveActive = new Map(); // batch -> instances with a visible source this frame
function liveRelease(e) {
  if (!e.iids) return;
  for (const iid of e.iids) e.batch.deleteInstance(iid);
  const r = liveGeo.get(e.geoKey);
  if (r && --r.refs <= 0) { try { e.batch.deleteGeometry(r.gid); } catch (err) { /* already gone */ } liveGeo.delete(e.geoKey); }
  e.iids = null;
}
function syncLive() {
  liveActive.clear();
  for (let i = liveSrc.length - 1; i >= 0; i--) {
    const e = liveSrc[i], m = e.mesh, vis = rooted(m);
    if (!e.iids) {
      if (vis === null) { if (++e.age > 3600) liveSrc.splice(i, 1); continue; }
      if (!liveEligible(m)) { liveSrc.splice(i, 1); continue; }
      const { b, names, sig } = liveBatchFor(m.material, m.castShadow);
      const gk = b.uuid + '|' + m.geometry.uuid;
      let rec = liveGeo.get(gk);
      if (!rec) {
        const geo = liveGeometry(m.geometry, names);
        const nv = geo.attributes.position.count, ni = geo.index.count;
        if (b.unusedVertexCount < nv || b.unusedIndexCount < ni) b.setGeometrySize(Math.max(b._maxVertexCount * 2, b._nextVertexStart + nv), Math.max(b._maxIndexCount * 2, b._nextIndexStart + ni));
        rec = { gid: b.addGeometry(geo), refs: 0 }; liveGeo.set(gk, rec);
      }
      rec.refs++;
      const cnt = m.isInstancedMesh ? m.count : 1;
      e.iids = []; e.batch = b; e.geoKey = gk; e.sig = sig;
      for (let k = 0; k < cnt; k++) {
        if (b._instanceInfo.filter((x) => x.active).length >= b.maxInstanceCount) b.setInstanceCount(b.maxInstanceCount * 2);
        const iid = b.addInstance(rec.gid);
        b.setColorAt(iid, _lc.setRGB(1, 1, 1)); b.setVisibleAt(iid, false); e.iids.push(iid);
      }
      m.layers.set(HIDDEN_LAYER); e.last = false; e.colV = -1;
    }
    if (vis === null) { liveRelease(e); liveSrc.splice(i, 1); continue; }
    const b = e.batch;
    if (e.last !== vis) { for (const iid of e.iids) b.setVisibleAt(iid, vis); e.last = vis; if (e.still) e.copied = false; }
    if (!vis) continue;
    if (e.still && e.copied) { liveActive.set(b, (liveActive.get(b) || 0) + e.iids.length); continue; }
    m.updateWorldMatrix(true, false); e.copied = true;
    if (m.isInstancedMesh) {
      const n = Math.min(m.count, e.iids.length);
      for (let k = 0; k < n; k++) { m.getMatrixAt(k, _lm); _lm.premultiply(m.matrixWorld); b.setMatrixAt(e.iids[k], _lm); }
      if (m.instanceColor && m.instanceColor.version !== e.colV) { for (let k = 0; k < n; k++) { m.getColorAt(k, _lc); b.setColorAt(e.iids[k], _lc); } e.colV = m.instanceColor.version; }
    } else b.setMatrixAt(e.iids[0], m.matrixWorld);
    liveActive.set(b, (liveActive.get(b) || 0) + e.iids.length);
  }
  for (const b of liveBatches.values()) b.visible = (liveActive.get(b) || 0) > 0;
}

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
    if (p.tiled) markTiled(p.model);
    if (p.rooted) { // `late` groups get meshes added after the first frame (async model loads): sweep again for a few seconds
      if (++p.age < 240 || p.age % 30 === 0) batchPlaceModel(p.model, p.key);
      if (p.age > 3000 || rooted(p.model) === null) pending.splice(i, 1);
    } else if (rooted(p.model) !== null) { batchPlaceModel(p.model, p.key, !!p.exact); if (p.late) { p.rooted = true; p.age = 0; } else pending.splice(i, 1); } else if (++p.age > 1800) pending.splice(i, 1);
  }
  syncPeople();
  syncLive();
  liveCount.clear();
  for (const e of entries) {
    const vis = rooted(e.src);
    if (vis === null) { e.batch.deleteInstance(e.iid); entries.delete(e); continue; }
    e.batch.setVisibleAt(e.iid, vis);
    if (vis) liveCount.set(e.batch, (liveCount.get(e.batch) || 0) + 1);
  }
  // A batch with no visible instance (its places are zone-hidden or torn down) is not submitted at all: three still counts an empty
  // multi-draw as a call. No place is hidden by this, only batches that currently draw nothing.
  for (const b of batches.values()) b.visible = (liveCount.get(b) || 0) > 0;
}
const liveCount = new Map();
