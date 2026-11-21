import * as THREE from 'three';
import { buildHouse, buildFar, DESIGN_INFO } from './housesKit.js';
import { buildClutter } from './housesClutter.js';
import { getHouseMaterial, houseMaterialReady } from './housesMaterial.js';
import { createHouseBatch } from './housesInstancing.js';
import { planHouses, ringsOverlap, inRing, rectCorners } from './housesPlan.js';
import { isNewLayout } from './housesLayout.js';
import { dipHeightRaw } from '../dips.js';
import { requestColliderRebuild } from '../collision.js';
import { houseQuality } from './housesQuality.js';

/**
 * The new-map houses (S7 sprint, houses agent): all ~490 'new_house' footprints of the approved 21 Nov map, built from the
 * house kit (src/kit/housesKit.js), drawn as ONE BatchedMesh (src/kit/housesInstancing.js) with per-house near/far LOD and
 * front clutter near the player, plus simple box colliders per house. Only under ?layout=new (wired in src/main.js).
 */

/** Wall washes (multiplied into the limewash texture): off-white, pale yellow, pale blue, pink, faded green, cream, bare cement, peach. */
export const WASHES = [
  [0.97, 0.95, 0.9], [0.99, 0.9, 0.68], [0.8, 0.88, 0.96], [0.98, 0.82, 0.8], [0.82, 0.91, 0.79], [0.97, 0.91, 0.8], [0.82, 0.81, 0.77], [0.99, 0.86, 0.73],
];
const PAKKA_SHARES = { A: 0.22, B: 0.15, C: 0.14, D: 0.12, E: 0.13, F: 0.1 };
/** Footprint classes (front width x depth) the geometry is built for; a house takes the nearest and is scaled by the small rest
 *  (<= ~10%). The map's footprints: 5.5x6.5 (207), 6.5x8 (158), 7.5x8 (84), 6.5x5.5 (18), 8x7.5 (17), 8x6.5 (6). */
const CLASSES = [[5.5, 6.5], [6.5, 8], [7.5, 8], [6.5, 5.5], [7.5, 6.5], [6.5, 6.5]];
const classOf = (w, d) => CLASSES.reduce((b, c) => (Math.max(Math.abs(Math.log(w / c[0])), Math.abs(Math.log(d / c[1]))) < Math.max(Math.abs(Math.log(w / b[0])), Math.abs(Math.log(d / b[1]))) ? c : b), CLASSES[0]);
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

const Q = houseQuality();
export const NEAR_DIST = Q.nearDist; // full detail within this; the far box beyond
export const CLUTTER_DIST = Q.clutterDist;
export const FAR_DIST = Q.farDist; // the haze has eaten a house by then

/** Picks a design, mirror, wash and seed for each planned house. Deterministic. Neighbours never match in design AND wash. */
export function assignHouses(plan) {
  const rings = plan.map((h) => h.corners);
  const out = [];
  plan.forEach((h, i) => {
    // a back that looks onto open ground (no house right behind) marks the outer edge of a mohalla
    const bx = -h.front[0], bz = -h.front[1];
    const exposed = [1.2, 4].every((k) => { const p = [h.x + bx * (h.d / 2 + k), h.z + bz * (h.d / 2 + k)]; return !rings.some((r, j) => j !== i && Math.abs(r[0][0] - p[0]) < 12 && Math.abs(r[0][1] - p[1]) < 12 && inRing(p, r)); });
    const near = out.filter((o) => Math.hypot(o.x - h.x, o.z - h.z) < 9.5);
    let design = null, wash = 0;
    const kachcha = h.mud && (exposed ? hash(i * 3.1 + 2) < 0.55 : hash(i * 5.7 + 1) < 0.06);
    for (let t = 0; t < 6; t++) {
      if (kachcha) design = hash(i * 11 + t * 3) < 0.55 ? 'G' : 'H';
      else { let u = hash(i * 13.3 + t * 7.1), acc = 0; design = 'F'; for (const [k, v] of Object.entries(PAKKA_SHARES)) { acc += v; if (u < acc) { design = k; break; } } }
      if (h.w < 6.0 && design === 'F' && h.d < 6) design = 'A';
      wash = Math.floor(hash(i * 17.9 + t * 5.3) * WASHES.length);
      if (!near.some((o) => o.design === design) && !near.some((o) => o.wash === wash)) break;
      if (t >= 3 && !near.some((o) => o.design === design && o.wash === wash)) break;
    }
    const [cw, cd] = classOf(h.w, h.d);
    out.push({ ...h, design, wash, mirror: hash(i * 23.3 + 4) < 0.5, seed: hash(i * 31.7 + 9), cw, cd, sx: h.w / cw, sz: h.d / cd, kachcha: DESIGN_INFO[design].kachcha });
  });
  return out;
}

/** Clutter on one house front, in house-local metres: [{ kind, x, y, z, yaw }]. */
export function clutterFor(e, info) {
  if (info.noStrip || info.otlaY == null) return [];
  const w = e.cw, items = [];
  const dx0 = info.door.x0 - 0.35, dx1 = info.door.x1 + 0.35;
  const spans = [[-w / 2 + 0.35, dx0], [dx1, w / 2 - 0.35]].filter(([a, b]) => b - a > 0.5).sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
  const r = (k) => hash(e.i * 7.7 + k * 3.3);
  const zw = info.zf + 0.04;
  const y = info.otlaY;
  const pool = e.kachcha ? ['charpai', 'matka', 'bucket'] : ['charpai', 'cylinder', 'bicycle', 'tulsi', 'matka', 'bucket'];
  const n = 1 + Math.floor(r(1) * 2.4);
  let used = new Set();
  for (let k = 0; k < n && spans.length; k++) {
    let kind = pool[Math.floor(r(2 + k) * pool.length)];
    if (used.has(kind)) kind = pool[(pool.indexOf(kind) + 1) % pool.length];
    used.add(kind);
    const sp = spans[0];
    const len = sp[1] - sp[0];
    if (kind === 'charpai') {
      if (len < 2.0) continue;
      const x = sp[0] + 1.0;
      items.push({ kind, x, y, z: zw + 0.02, yaw: 0 }); sp[0] += 2.05;
    } else if (kind === 'bicycle') { // on the ground in front of the otla, along the house
      if (!info.otlaDepth || len < 1.8) continue;
      const x = (sp[0] + sp[1]) / 2;
      items.push({ kind, x, y: 0, z: info.zf + info.otlaDepth + 0.3, yaw: r(9) < 0.5 ? 0 : Math.PI });
    } else {
      const x = sp[0] + 0.35 + r(5 + k) * Math.max(0, len - 0.7);
      items.push({ kind, x, y, z: zw + 0.32, yaw: (r(6 + k) - 0.5) * 0.6 }); sp[0] = x + 0.5;
    }
    spans.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
  }
  return items;
}

/** Axis-aligned slices of a turned rectangle (colliders are AABBs): error under ~0.25 m at the edges, never more than 64 boxes. */
export function sliceRect(x, z, ry, w, d) {
  const c = Math.cos(ry), s = Math.sin(ry);
  let off = Math.abs(Math.atan2(s, c)) % (Math.PI / 2);
  off = Math.min(off, Math.PI / 2 - off);
  const step = off < 1e-3 ? Infinity : Math.max(0.5, 0.25 / Math.sin(off));
  let nx = Math.max(1, Math.ceil(w / step)), nz = Math.max(1, Math.ceil(d / step));
  while (nx * nz > 64) { nx = Math.ceil(nx / 2); nz = Math.ceil(nz / 2); }
  const hx = w / nx / 2, hz = d / nz / 2;
  const ex = Math.abs(c) * hx + Math.abs(s) * hz, ez = Math.abs(s) * hx + Math.abs(c) * hz;
  const out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const lx = -w / 2 + hx * (2 * i + 1), lz = -d / 2 + hz * (2 * j + 1);
    const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
    out.push({ minX: wx - ex, maxX: wx + ex, minZ: wz - ez, maxZ: wz + ez });
  }
  return out;
}

/**
 * Builds the batch for a list of assigned houses (each with x, z, y, ry, design, mirror, cw, cd, sx, sz, wash, seed).
 * Returns { group, batch, update(px, pz), colliderBoxes, stats, houses }.
 */
export function buildHouseBatch(entries, { withFar = true, withClutter = true, nearDist = NEAR_DIST, clutterDist = CLUTTER_DIST, farDist = FAR_DIST, cache = null } = {}) {
  const geos = cache ? cache.geos : new Map(), infos = cache ? cache.infos : new Map();
  const nearKey = (e) => `${e.design}|${e.cw}|${e.cd}|${e.mirror ? 1 : 0}`;
  const farKey = (e) => `far|${e.design}|${e.cw}|${e.cd}`;
  let nearTris = 0, nearCount = 0;
  for (const e of entries) {
    const k = nearKey(e);
    if (!geos.has(k)) { const b = buildHouse(e.design, e.cw, e.cd, e.mirror); geos.set(k, b.near.toGeometry()); infos.set(k, b.info); }
    if (withFar) { const f = farKey(e); if (!geos.has(f)) geos.set(f, buildFar(e.design, e.cw, e.cd, false).toGeometry()); }
    e.info = infos.get(k);
    e.clutter = withClutter ? clutterFor(e, e.info) : [];
    for (const c of e.clutter) { const ck = 'c|' + c.kind; if (!geos.has(ck)) geos.set(ck, buildClutter(c.kind).toGeometry()); }
  }
  const instances = entries.length * (withFar ? 2 : 1) + entries.reduce((s, e) => s + e.clutter.length, 0);
  const hb = createHouseBatch(geos, getHouseMaterial(), instances + 8);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), lm = new THREE.Matrix4();
  const UP = THREE.Object3D.DEFAULT_UP;
  for (const e of entries) {
    m.compose(p.set(e.x, e.y || 0, e.z), q.setFromAxisAngle(UP, e.ry), sc.set(e.sx || 1, 1, e.sz || 1));
    const wash = WASHES[e.wash];
    const rgba = [wash[0], wash[1], wash[2], e.seed];
    e.nearId = hb.add(nearKey(e), m, rgba);
    if (withFar) e.farId = hb.add(farKey(e), m, rgba);
    e.clutterIds = e.clutter.map((c) => {
      lm.compose(p.set(c.x, c.y, c.z), q.setFromAxisAngle(UP, c.yaw), sc.set(1, 1, 1));
      return hb.add('c|' + c.kind, new THREE.Matrix4().multiplyMatrices(m, lm), [wash[0], wash[1], wash[2], hash(e.seed * 91 + c.x)]);
    });
    nearTris += geos.get(nearKey(e)).index.count / 3; nearCount++;
  }
  const batch = hb.batch;
  batch.receiveShadow = true;
  batch.castShadow = Q.castShadow;
  // LOD rides the camera that draws the batch: no per-frame call needed from main.js
  const baseBefore = batch.onBeforeRender;
  batch.onBeforeRender = function (renderer, scene, camera, ...rest) {
    update(camera.position.x, camera.position.z);
    return baseBefore.call(this, renderer, scene, camera, ...rest);
  };

  const colliderBoxes = [];
  for (const e of entries) colliderBoxes.push(...sliceRect(e.x, e.z, e.ry, e.w ?? e.cw * (e.sx || 1), e.d ?? e.cd * (e.sz || 1)));
  const colliders = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
  colliders.name = 'houses_s7_colliders';
  colliders.visible = false;
  colliders.userData.colliderBoxes = colliderBoxes;
  colliders.userData.noAutoCollider = true;

  const group = new THREE.Group();
  group.name = 'houses_s7';
  group.add(batch, colliders);

  let lx = 1e9, lz = 1e9;
  const state = { near: 0, far: 0, clutter: 0 };
  function update(px, pz, force = false) {
    if (!force && Math.abs(px - lx) + Math.abs(pz - lz) < 3) return;
    lx = px; lz = pz;
    state.near = state.far = state.clutter = 0;
    for (const e of entries) {
      const d = Math.hypot(e.x - px, e.z - pz);
      const near = d < nearDist || !withFar;
      batch.setVisibleAt(e.nearId, near);
      if (withFar) batch.setVisibleAt(e.farId, !near && d < farDist);
      const cl = d < clutterDist;
      for (const id of e.clutterIds) batch.setVisibleAt(id, cl);
      if (near) state.near++; else if (d < farDist) state.far++;
      if (cl) state.clutter += e.clutterIds.length;
    }
  }
  let vtx = 0, idx = 0;
  for (const g of geos.values()) { vtx += g.attributes.position.count; idx += g.index.count; }
  const stats = {
    houses: entries.length, geometries: geos.size, instances, vertices: vtx, indices: idx,
    geometryMB: +((vtx * 28 + idx * 4) / 1048576).toFixed(1),
    avgNearTriangles: Math.round(nearTris / Math.max(1, nearCount)), lod: state,
  };
  return { group, batch, update, colliderBoxes, stats, houses: entries };
}

/** Builds every geometry the entries need, a few per frame (keeps each frame under ~8 ms of building), for buildHouseBatch's cache. */
export async function prebuildGeometries(entries, withFar = true) {
  const cache = { geos: new Map(), infos: new Map() };
  let t = performance.now();
  const yieldNow = async () => { if (performance.now() - t > 8) { await new Promise((r) => setTimeout(r, 0)); t = performance.now(); } };
  for (const e of entries) {
    const k = `${e.design}|${e.cw}|${e.cd}|${e.mirror ? 1 : 0}`;
    if (!cache.geos.has(k)) { const b = buildHouse(e.design, e.cw, e.cd, e.mirror); cache.geos.set(k, b.near.toGeometry()); cache.infos.set(k, b.info); await yieldNow(); }
    const f = `far|${e.design}|${e.cw}|${e.cd}`;
    if (withFar && !cache.geos.has(f)) { cache.geos.set(f, buildFar(e.design, e.cw, e.cd, false).toGeometry()); await yieldNow(); }
  }
  return cache;
}

/** The precomputed plan (src/kit/housesPlanData.json, made by `node src/kit/housesCheck.js --write-plan` from the approved map). */
export async function loadPlannedHouses() {
  const mod = await import('./housesPlanData.json');
  const data = mod.default || mod;
  const plan = data.rows.map(([i, x, z, ry, w, d, mud, road]) => ({ i, x, z, ry, w, d, mud: !!mud, road, front: [Math.sin(ry), Math.cos(ry)], corners: rectCorners(x, z, ry, w, d) }));
  return { plan };
}

/** World data other systems may want once the new houses are built (roof tanks for the monkeys, doorsteps for jobs). */
export const NEW_HOUSES = [];
export const NEW_HOUSE_TANK_TOPS = [];

/**
 * The game entry point (?layout=new): reads the map, plans fronts, assigns designs, builds the batch, registers colliders.
 * `map` = { houses, roads } from src/kit/housesLayout.js; groundAt(x, z) = ground height (the game's dipHeightRaw).
 * Returns { group, update(px, pz), ready: Promise, report }.
 */
export function createNewMapHouses(scene, { loadMap, groundAt = () => 0, onBuilt = () => {} }) {
  const holder = new THREE.Group();
  holder.name = 'houses_s7_root';
  scene.add(holder);
  let built = null;
  const report = {};
  const ready = Promise.all([loadMap(), houseMaterialReady()]).then(async ([map]) => {
    const plan = map.plan || planHouses(map.houses, map.roads);
    // a pair drawn overlapping on the map: the later one is left out (reported)
    const drop = new Set();
    for (let i = 0; i < plan.length; i++) for (let j = i + 1; j < plan.length; j++) {
      if (drop.has(i) || Math.abs(plan[i].x - plan[j].x) > 12 || Math.abs(plan[i].z - plan[j].z) > 12) continue;
      if (ringsOverlap(plan[i].corners, plan[j].corners, 0.1)) drop.add(j);
    }
    const entries = assignHouses(plan).filter((e) => !drop.has(e.i));
    let worstStep = 0;
    for (const e of entries) {
      const ys = [...e.corners, [e.x, e.z]].map(([x, z]) => groundAt(x, z));
      e.y = Math.max(...ys);
      worstStep = Math.max(worstStep, e.y - Math.min(...ys));
    }
    const cache = await prebuildGeometries(entries);
    built = buildHouseBatch(entries, { cache });
    holder.add(built.group);
    for (const e of entries) {
      const c = Math.cos(e.ry), s = Math.sin(e.ry);
      const dx = (e.info.door.x0 + e.info.door.x1) / 2, dz = e.cd / 2 + 0.6;
      NEW_HOUSES.push({ x: e.x, z: e.z, ry: e.ry, w: e.w, d: e.d, design: e.design, door: { x: e.x + dx * c + dz * s, z: e.z - dx * s + dz * c } });
      for (const [tx, ty, tz] of e.info.tanks) NEW_HOUSE_TANK_TOPS.push({ x: e.x + tx * c + tz * s, z: e.z - tx * s + tz * c, y: e.y + ty, rad: 0.5, yaw: e.ry });
    }
    Object.assign(report, built.stats, { dropped: [...drop], worstGroundStep: +worstStep.toFixed(3), designs: entries.reduce((m, e) => ((m[e.design] = (m[e.design] || 0) + 1), m), {}) });
    built.update(lastX, lastZ, true);
    onBuilt(built);
    return built;
  });
  let lastX = 0, lastZ = 0;
  return {
    group: holder,
    ready,
    report,
    update(px, pz) { lastX = px; lastZ = pz; if (built) built.update(px, pz); },
  };
}

/**
 * main.js entry (one call, inside the S7 WIRING (houses) block): under ?layout=new builds every new-map house into `scene`
 * and asks for a collider rebuild once they stand; under any other layout does nothing. Debug: window.__newHouses.
 */
export function initNewMapHouses(scene) {
  if (!isNewLayout()) return null;
  if (typeof location !== 'undefined' && /[?&]nohouses=1/.test(location.search)) return null; // A/B switch for audits
  const h = createNewMapHouses(scene, { loadMap: loadPlannedHouses, groundAt: dipHeightRaw, onBuilt: () => requestColliderRebuild() });
  if (typeof window !== 'undefined') window.__newHouses = h;
  h.ready.catch((err) => console.warn('new-map houses did not build', err));
  return h;
}
