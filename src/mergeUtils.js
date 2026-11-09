import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { turnGroupOf, turnBox, preTurnLeafBox } from './turn.js';
import { batchStaticGroup } from './placeBatch.js';

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

/** Wall-mounted flat boards and small jute sacks cast no useful shadow, and every
 * caster costs a second draw call in the shadow pass — headroom for the hero-zone ceiling. */
const NO_SHADOW_MATERIALS = new Set(['signboard', 'jute']);
const mayCast = (material, castShadow) => castShadow && !NO_SHADOW_MATERIALS.has(material.name);

/** Reads whatever collider information a source object (about to be merged away)
 * carries — either `userData.collider === true` on a real, never-yet-merged leaf
 * mesh (its own live world-space box is computed here, from the same
 * geometry+matrixWorld the merge itself is about to bake in), or
 * `userData.colliderBoxes` already computed by an EARLIER merge pass this object
 * itself was the output of — and appends whatever it finds to `into`. This is how
 * a building's real solid geometry stays the single source of truth for its
 * collider even after one or several passes of draw-call merging: see
 * src/collision.js's buildCollidersFromScene(), which reads the same
 * `userData.colliderBoxes` this leaves on the final merged mesh. */
function collectColliderBoxes(obj, into) {
  const tg = turnGroupOf(obj); // inside a map-turned place the boxes were built square: turn them now (src/turn.js)
  if (obj.userData.collider === true) {
    if (tg) {
      const pre = preTurnLeafBox(obj, tg);
      if (pre) into.push(...turnBox(pre, tg.userData.turn));
    } else {
      const box = new THREE.Box3().setFromObject(obj, true);
      if (isFinite(box.min.x)) into.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
    }
  }
  if (Array.isArray(obj.userData.colliderBoxes)) {
    if (tg) for (const b of obj.userData.colliderBoxes) into.push(...turnBox(b, tg.userData.turn));
    else into.push(...obj.userData.colliderBoxes);
  }
}

/** Merges every mesh descendant of `group` (InstancedMesh excluded — those are
 * already one draw call) that shares a Material, replacing them with one merged
 * Mesh per material added as a new direct child of `group`. Geometry is baked
 * relative to `group` itself (group must have no parent transform yet — true for
 * every builder in this codebase, which runs before scene.add). */
export function mergeGroupByMaterial(group, { skipNames = [] } = {}) {
  group.updateWorldMatrix(true, true);

  const buckets = new Map(); // material -> { geometries, castShadow, receiveShadow, colliderBoxes }
  const toRemove = [];
  const hiddenBoxes = []; // footprints of invisible collider boxes, carried by one invisible mesh after the merge

  // `skipNames`: named sub-groups (already locally merged, e.g. 'house_shell_old') to leave
  // completely alone — folding them into this merge would make them un-hideable.
  (function walk(obj) {
    if (obj !== group && skipNames.includes(obj.name)) return;
    for (const child of obj.children) walk(child);
    if (obj === group) return;
    if (!obj.isMesh || obj.isInstancedMesh) return;
    if (obj.userData.lodExtra) { toRemove.push(obj); return; } // lower LOD levels mean nothing once merged
    if (obj.userData.collider === true && obj.visible === false) { collectColliderBoxes(obj, hiddenBoxes); toRemove.push(obj); return; } // hidden collider: footprint kept, never drawn
    let bucket = buckets.get(obj.material);
    if (!bucket) buckets.set(obj.material, (bucket = { geometries: [], castShadow: false, receiveShadow: false, colliderBoxes: [] }));
    bucket.geometries.push(obj.geometry.clone().applyMatrix4(obj.matrixWorld));
    bucket.castShadow = bucket.castShadow || obj.castShadow;
    bucket.receiveShadow = bucket.receiveShadow || obj.receiveShadow;
    collectColliderBoxes(obj, bucket.colliderBoxes);
    toRemove.push(obj);
  })(group);

  for (const obj of toRemove) obj.parent.remove(obj);

  let i = 0;
  for (const [material, bucket] of buckets) {
    const geometry = bucket.geometries.length > 1 ? mergeGeometries(bucket.geometries) : bucket.geometries[0];
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${material.name || 'merged'}_${i++}`;
    mesh.castShadow = mayCast(material, bucket.castShadow);
    mesh.receiveShadow = bucket.receiveShadow;
    // A merged mesh folds together sub-components of one or more buildings (e.g.
    // just the roofs, elevated by design) — never a single "placed object" of its
    // own, so tools/screenshot.js's whole-object grounding check skips anything
    // flagged this way, the same way it already skips shop_roofs/trim/plinth/etc.
    mesh.userData.mergedStatic = true;
    if (bucket.colliderBoxes.length) mesh.userData.colliderBoxes = bucket.colliderBoxes;
    group.add(mesh);
  }
  addHiddenColliderCarrier(group, hiddenBoxes);
}

function addHiddenColliderCarrier(group, boxes) {
  if (!boxes.length) return;
  const carrier = new THREE.Mesh(new THREE.BufferGeometry());
  carrier.name = 'merged_hidden_colliders';
  carrier.visible = false;
  carrier.userData.colliderBoxes = boxes;
  group.add(carrier);
}

/** Geometries of one material can differ in indexing or attribute set (small prop modules vs Blender models); mergeGeometries needs them identical.
 * Leaves an already-compatible list untouched; otherwise makes all non-indexed with position/normal/uv (+ white colour if the material reads it). */
function compatGeometries(list, material) {
  const sig = (g) => (g.index ? 'i' : 'n') + Object.keys(g.attributes).sort().map((k) => k + g.attributes[k].itemSize).join(',');
  if (list.every((g) => sig(g) === sig(list[0]))) return list;
  return list.map((g0) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    if (material.vertexColors && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    else if (!material.vertexColors && g.attributes.color) g.deleteAttribute('color');
    const col = g.attributes.color;
    if (col && col.itemSize !== 3) { // a glb's RGBA colour beside code-built RGB: mergeGeometries returns null on mixed item sizes
      const rgb = new Float32Array(col.count * 3);
      for (let i = 0; i < col.count; i++) { rgb[i * 3] = col.getX(i); rgb[i * 3 + 1] = col.getY(i); rgb[i * 3 + 2] = col.itemSize > 2 ? col.getZ(i) : 1; }
      g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
    }
    return g;
  });
}

/** Splits a world-space geometry (several welded boxes from an earlier per-building merge) into ground-clutter triangles
 * (connected pieces under 2 m in every direction, touching the ground, e.g. pots, charpais, crates) and the rest. Returns null when
 * there is nothing to split. Pieces are found by welding vertices at 1 mm, so each source box is one piece. */
// Measured 8 Nov (docs/perf-2026-11-08.md): ON adds draw calls (spawn 92->108, chauraha 121->140) and removes no triangles, so it stays OFF.
const SPLIT_MERGED_PROPS = false;
function splitGroundProps(geo) {
  const pos = geo.attributes.position, idx = geo.index;
  if (!pos) return null;
  const triCount = (idx ? idx.count : pos.count) / 3;
  if (triCount < 2) return null;
  const vi = (t, k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k);
  const weld = new Map(), parent = [];
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  const vid = new Int32Array(pos.count).fill(-1);
  const idOf = (v) => {
    if (vid[v] >= 0) return vid[v];
    const k = `${Math.round(pos.getX(v) * 1000)},${Math.round(pos.getY(v) * 1000)},${Math.round(pos.getZ(v) * 1000)}`;
    let id = weld.get(k);
    if (id === undefined) { id = parent.length; parent.push(id); weld.set(k, id); }
    return (vid[v] = id);
  };
  const triRoot = new Int32Array(triCount);
  for (let t = 0; t < triCount; t++) {
    const a = idOf(vi(t, 0)), b = idOf(vi(t, 1)), c = idOf(vi(t, 2));
    const ra = find(a), rb = find(b), rc = find(c);
    parent[rb] = ra; parent[find(rc)] = ra;
    triRoot[t] = a;
  }
  const bb = new Map();
  for (let t = 0; t < triCount; t++) {
    const r = find(triRoot[t]);
    let b = bb.get(r);
    if (!b) bb.set(r, (b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]));
    for (let k = 0; k < 3; k++) {
      const v = vi(t, k), x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
      if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (z < b[2]) b[2] = z;
      if (x > b[3]) b[3] = x; if (y > b[4]) b[4] = y; if (z > b[5]) b[5] = z;
    }
  }
  const isProp = new Map();
  for (const [r, b] of bb) isProp.set(r, Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) < 2 && b[1] < 0.5);
  const propTris = [], restTris = [];
  for (let t = 0; t < triCount; t++) (isProp.get(find(triRoot[t])) ? propTris : restTris).push(t);
  if (!propTris.length) return null;
  const take = (tris) => {
    if (!tris.length) return null;
    const g = new THREE.BufferGeometry();
    for (const name of Object.keys(geo.attributes)) {
      const src = geo.attributes[name], n = src.itemSize, arr = new src.array.constructor(tris.length * 3 * n);
      let o = 0;
      for (const t of tris) for (let k = 0; k < 3; k++) { const v = vi(t, k); for (let j = 0; j < n; j++) arr[o++] = src.array[v * n + j]; }
      g.setAttribute(name, new THREE.BufferAttribute(arr, n, src.normalized));
    }
    return g;
  };
  return { props: take(propTris), rest: take(restTris) };
}

/** Merges same-material meshes ACROSS several already-built, already-in-the-scene
 * static root groups (e.g. the hero zone, the bazaar row, the background houses —
 * each already merged internally by its own builder) into one mesh per material,
 * added as a new child of `dest`. This is what actually saves draw calls "across
 * the whole village, not just within a building" (headroom pass, docs/parked.md):
 * texturedWallBox/texturedThickBox/etc already share one cached Material per
 * texture family+tiling+roughness regardless of which building or tint used it, so
 * a house's already-merged 'plaster_0' and a shop's already-merged 'plaster_0' still
 * share that one Material object and fold together here.
 *
 * Only ever pass STATIC roots — never scene itself, and never a root that contains
 * an animated object (vehicles, NPCs, the player): every mesh this touches is
 * detached from its original parent and rebuilt as a brand-new Mesh, so anything
 * that relied on its old parent's transform (to move/rotate with it) breaks.
 * `skipNames` — subtree root names inside those roots to leave untouched, same
 * reasoning as mergeGroupByMaterial's own `skipNames` (a stale `hide` list in
 * assetSlots.js otherwise). */
export function mergeAcrossGroups(roots, dest, { skipNames = [] } = {}) {
  const buckets = new Map();
  const keyMaterial = new Map();
  const propKeys = new Set();
  const toRemove = [];
  const hiddenBoxes = [];
  const propGeoms = [];

  for (const root of roots) {
    root.updateWorldMatrix(true, true);
    (function walk(obj) {
      if (obj !== root && skipNames.includes(obj.name)) return;
      if (obj.isMesh && obj.userData.lodExtra) toRemove.push(obj);
      else if (obj.isMesh && obj.userData.collider === true && obj.visible === false) { collectColliderBoxes(obj, hiddenBoxes); toRemove.push(obj); } // hidden collider: footprint kept, never drawn
      else if (obj.isMesh && !obj.isInstancedMesh) {
        // Shop stock (tiny packets, ~125k tris) is split into 100 m cells so the per-frame distance gate (userData.distGate) can drop far cells.
        let key = obj.material;
        if (obj.material.name === 'shop_goods') {
          const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
          key = `shop_goods:${Math.floor(c.x / 100)}:${Math.floor(c.z / 100)}`;
          keyMaterial.set(key, obj.material);
        }
        else {
          // Small clutter (pots, charpais, crates, washing, vendors; under ~2 m) is split out per 100 m cell so it can carry a short distance gate; buildings keep the 350 m range.
          const bb = new THREE.Box3().setFromObject(obj), sz = bb.getSize(new THREE.Vector3());
          if (Math.max(sz.x, sz.y, sz.z) < 2 && bb.min.y < 0.5 && !obj.material.transparent) { // ground clutter only: raised bits (hanging cloth) would make a bucket whose lowest point floats
            const c = bb.getCenter(new THREE.Vector3());
            key = `prop:${obj.material.uuid}:${Math.floor(c.x / 100)}:${Math.floor(c.z / 100)}`;
            keyMaterial.set(key, obj.material);
            propKeys.add(key);
          }
        }
        let bucket = buckets.get(key);
        if (!bucket) buckets.set(key, (bucket = { geometries: [], castShadow: false, receiveShadow: false, colliderBoxes: [] }));
        let wgeo = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
        // A big mesh from an earlier per-building merge hides its ground clutter inside the 350 m bucket: pull those pieces out into 80 m prop buckets.
        if (SPLIT_MERGED_PROPS && !propKeys.has(key) && key === obj.material && !obj.material.transparent && !obj.material.name?.startsWith('shop_goods')) {
          const sp = splitGroundProps(wgeo);
          if (sp && sp.props) {
            propGeoms.push({ material: obj.material, geo: sp.props, castShadow: obj.castShadow, receiveShadow: obj.receiveShadow });
            wgeo = sp.rest;
          }
        }
        if (wgeo) bucket.geometries.push(wgeo);
        // Remember the source mesh name while every source agrees on it, so a bucket with an unnamed material is still identifiable.
        if (bucket.srcName === undefined) bucket.srcName = obj.name || null; else if (bucket.srcName !== obj.name) bucket.srcName = null;
        bucket.castShadow = bucket.castShadow || obj.castShadow;
        bucket.receiveShadow = bucket.receiveShadow || obj.receiveShadow;
        collectColliderBoxes(obj, bucket.colliderBoxes);
        toRemove.push(obj);
      }
      for (const child of obj.children) walk(child);
    })(root);
  }

  for (const obj of toRemove) obj.parent.remove(obj);

  for (const pg of propGeoms) {
    pg.geo.computeBoundingBox();
    const c = pg.geo.boundingBox.getCenter(new THREE.Vector3());
    const key = `prop:${pg.material.uuid}:${Math.floor(c.x / 100)}:${Math.floor(c.z / 100)}`;
    keyMaterial.set(key, pg.material);
    propKeys.add(key);
    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, (bucket = { geometries: [], castShadow: false, receiveShadow: false, colliderBoxes: [] }));
    bucket.geometries.push(pg.geo);
    bucket.castShadow = bucket.castShadow || pg.castShadow;
    bucket.receiveShadow = bucket.receiveShadow || pg.receiveShadow;
  }
  for (const [key, bucket] of [...buckets]) if (!bucket.geometries.length) { hiddenBoxes.push(...bucket.colliderBoxes); buckets.delete(key); }

  let i = 0;
  for (const [key, bucket] of buckets) {
    const material = keyMaterial.get(key) || key;
    const geometry = bucket.geometries.length > 1 ? mergeGeometries(compatGeometries(bucket.geometries, material)) : bucket.geometries[0];
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${material.name || bucket.srcName || 'merged'}_${i++}`; // unnamed material: the shared source mesh name, so the world validator can tell what a bucket is
    if (material.name === 'shop_goods') {
      geometry.computeBoundingSphere();
      const bs = geometry.boundingSphere;
      mesh.userData.distGate = { x: bs.center.x, z: bs.center.z, r: bs.radius, range: 30 };
    } else {
      // Small merged clusters (a handful of props, one patch of ground) stop drawing well past fog distance: each costs a call from anywhere in view.
      geometry.computeBoundingSphere();
      const bs = geometry.boundingSphere;
      if (propKeys.has(key)) mesh.userData.distGate = { x: bs.center.x, z: bs.center.z, r: bs.radius, range: 80 };
      else if (bs.radius <= 60) mesh.userData.distGate = { x: bs.center.x, z: bs.center.z, r: bs.radius, range: 350 };
    }
    mesh.castShadow = mayCast(material, bucket.castShadow);
    mesh.receiveShadow = bucket.receiveShadow;
    mesh.userData.mergedStatic = true; // see mergeGroupByMaterial's own comment on this flag
    if (bucket.colliderBoxes.length) mesh.userData.colliderBoxes = bucket.colliderBoxes;
    dest.add(mesh);
  }
  addHiddenColliderCarrier(dest, hiddenBoxes);
  batchStaticGroup(dest, 'static:' + (dest.name || 'merged')); // place-batch materials draw through their shared batch, not a call each (src/placeBatch.js)
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
