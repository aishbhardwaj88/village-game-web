import * as THREE from 'three';
import { LAND_QUALITY } from './landQuality.js';
import { getLayout } from '../layout/layout.js';
import { orientedBoxes, frameHook } from './landInstancing.js';
import { landMaterial } from './landMaterials.js';
import { planMapObjects, hash01, toWorld, nearestRoad } from './mapObjectsPlan.js';
import { buildDesign } from './mapObjectsKit.js';
import { buildGroundAndWater } from './mapObjectsGround.js';
import { makeSignTexture, signQuad, signMaterial, SIGN_RECTS } from './mapObjectsSigns.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getGLTFLoader } from '../loaders.js';
import { swapShared } from '../stagingYard.js';
import { floatGeometry } from '../pots.js';
import { createCattleHerd } from '../animals.js';
import { roadEmptyPush } from '../mapRoads.js';
const ROAD_EMPTY_REMOVE = true; // 25 Nov (her order): an object that cannot be moved clear of a road is removed; false puts it back
import { yieldToMain } from './lateBuild.js';

/**
 * MAP OBJECTS layer (S7 sprint, map objects agent; ?layout=new only, loaded as its own chunk by src/kit/mapObjectsInit.js).
 * Builds every small object of the approved map that no other kit builds (list and reasons: src/kit/mapObjectsPlan.js):
 * 11 tubewell pump rooms with hauz and outlet, 10 field channels, mobile tower, transformer, welcome gate, notice board,
 * 10 milestones, water trough, 8 machans, 8 scarecrows, 41 clay pots in the potter's yard, 3 ponds, the temple tank,
 * 4 buffaloes, 9 resting spots, washing platform, 2 barbers' corners, and the painted ground of the cricket pitch,
 * kabaddi court, parkings, drying ground, play patches, house plots, potter's yard, tempo stand, cane centre and market.
 *
 * Draw calls (whole layer, any view): one BatchedMesh per library set for every built design (<= 9: brick, plaster,
 * concrete, wood, metal, rust, terracotta, jute, tarpaulin), one for the game's own pot and milestone models, ground 1,
 * water 1, painted faces 1, buffaloes 1 = at most 14. Each instance is culled on its own (BatchedMesh) and hidden past
 * its reach (small props LAND_QUALITY.propM x 1.2, big ones further).
 */
const PROP = LAND_QUALITY.propM * 1.2;
const REACH = { tower: 2500, gate: 700, templeTank: 450, tubewell: 450, transformer: 320, machan: 320, kiln: 260, caneHeap: 220, taraju: 220, swing: 200, scarecrow: 220, creases: PROP * 0.8, kabaddiLines: PROP * 0.8, hopscotch: PROP * 0.6, cloth: PROP * 0.8, brickWicket: PROP * 0.6, stumps: PROP };
// collider size per kind (w x d in the design's own frame); kinds not listed are walk-over (lines, cloth, heaps)
const SOLID = { tubewell: [3.3, 3.3], tower: [4.9, 4.9], transformer: null, notice: [2.0, 0.3], trough: null, machan: 'legs', scarecrow: [0.3, 0.3], barber: [1.3, 1.3], charpai: [1.9, 0.95], bench: [2.0, 0.5], potterWheel: [1.0, 1.0], kiln: [2.6, 2.6], taraju: [1.9, 1.9], caneHeap: [2.9, 1.5], plotPillar: [0.3, 0.3], swing: 'swing' };
const CLOTHS = [0xf2f0ea, 0xe8ecf2, 0xc8d8e8, 0xd84a3a, 0xe0b040, 0x4a8a6a, 0xd87aa0, 0xf0ead8, 0x6a7ab8, 0xe8e0c8];

/** One BatchedMesh per material over many designs, per-instance matrix / colour / distance visibility. */
class ObjBatch {
  constructor(name) { this.name = name; this.designs = new Map(); this.inst = []; this.mats = new Map(); }
  design(key, build) { if (!this.designs.has(key)) this.designs.set(key, build()); return this.designs.get(key); }
  /** lod (optional, S7 fixes): { key, near } = draw design `key` instead of this one beyond `near` metres (up to `reach`) */
  add(key, matrix, color, reach, lod = null) { this.inst.push({ key, matrix, color, reach, lod, x: matrix.elements[12], z: matrix.elements[14], ids: {}, lowIds: {}, vis: true, tier: 0 }); }
  finalize(materialFor) {
    const group = new THREE.Group();
    group.name = this.name;
    const per = new Map();
    const count = (key) => { for (const mat in this.designs.get(key)) {
      if (!per.has(mat)) per.set(mat, { count: 0, verts: 0, idx: 0, keys: new Set() });
      const e = per.get(mat), g = this.designs.get(key)[mat];
      e.count++;
      if (!e.keys.has(key)) { e.keys.add(key); e.verts += g.attributes.position.count; e.idx += g.index ? g.index.count : g.attributes.position.count; }
    } };
    for (const it of this.inst) { count(it.key); if (it.lod) count(it.lod.key); }
    this.batches = new Map();
    for (const [mat, e] of per) {
      const bm = new THREE.BatchedMesh(e.count, e.verts, e.idx, materialFor(mat));
      bm.name = `${this.name}_${mat}`;
      bm.receiveShadow = true;
      bm.castShadow = false;
      bm.userData.noAutoCollider = true;
      const gids = new Map();
      for (const k of e.keys) gids.set(k, bm.addGeometry(this.designs.get(k)[mat]));
      this.batches.set(mat, { bm, gids });
      group.add(bm);
    }
    const c = new THREE.Color();
    const place = (it, key, ids, visible) => { for (const mat in this.designs.get(key)) {
      const b = this.batches.get(mat);
      const id = b.bm.addInstance(b.gids.get(key));
      b.bm.setMatrixAt(id, it.matrix);
      b.bm.setColorAt(id, c.set(it.color));
      if (!visible) b.bm.setVisibleAt(id, false);
      ids[mat] = id;
    } };
    for (const it of this.inst) { place(it, it.key, it.ids, true); if (it.lod) place(it, it.lod.key, it.lowIds, false); }
    return group;
  }
  /** hide instances past their reach; returns how many are drawn */
  update(cam) {
    let n = 0;
    for (const it of this.inst) {
      const dx = it.x - cam.position.x, dz = it.z - cam.position.z, d2 = dx * dx + dz * dz;
      // tier 0 = full model, 1 = low-poly stand-in (only when the instance has one), 2 = hidden
      const tier = d2 >= it.reach * it.reach ? 2 : it.lod && d2 >= it.lod.near * it.lod.near ? 1 : 0;
      if (tier < 2) n++;
      if (tier === it.tier) continue;
      it.tier = tier;
      for (const mat in it.ids) this.batches.get(mat).bm.setVisibleAt(it.ids[mat], tier === 0);
      for (const mat in it.lowIds) this.batches.get(mat).bm.setVisibleAt(it.lowIds[mat], tier === 1);
    }
    return n;
  }
  tris() { let t = 0; for (const it of this.inst) { const d = this.designs.get(it.key); for (const m in d) t += (d[m].index ? d[m].index.count : d[m].attributes.position.count) / 3; } return t; }
  /** triangles drawn right now (after update), full and low-poly stand-ins counted separately */
  drawnTris() {
    const tri = (key) => { let t = 0; const d = this.designs.get(key); for (const m in d) t += (d[m].index ? d[m].index.count : d[m].attributes.position.count) / 3; return t; };
    let full = 0, low = 0;
    for (const it of this.inst) { if (it.tier === 0) full += tri(it.key); else if (it.tier === 1) low += tri(it.lod.key); }
    return { full, low };
  }
}

const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function mat4(x, y, z, ry, s = 1, sx = s, sy = s, sz = s, rx = 0, rz = 0) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')).clone(), new THREE.Vector3(sx, sy, sz));
}
/** near-white tint with a little drift, so no two neighbours match */
function tint(id, k = 0.08) {
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = hash01(h % 9973, 1), b = hash01(h % 7919, 2), c = hash01(h % 6007, 3);
  const L = 1 - k + 2 * k * a;
  return new THREE.Color(L * (1 + (b - 0.5) * k * 0.6), L, L * (1 + (c - 0.5) * k * 0.8));
}

const designKey = (d) => {
  switch (d.kind) {
    case 'tubewell': return { key: `tubewell|${d.door}`, params: { door: d.door } };
    case 'transformer': return { key: `transformer|${d.w}|${d.d}`, params: { w: d.w, d: d.d } };
    case 'trough': return { key: `trough|${d.w}|${d.d}`, params: { w: d.w, d: d.d } };
    case 'washplatform': return { key: `washplatform|${d.w}|${d.d}`, params: { w: d.w, d: d.d } };
    case 'machan': { const s = Math.floor(hash01(d.x, d.z) * 2); return { key: `machan|${s}`, params: { seed: s } }; }
    case 'charpai': { const s = Math.floor(hash01(d.x, d.z) * 3); return { key: `charpai|${s}`, params: { seed: s } }; }
    case 'caneHeap': { const s = Math.floor(hash01(d.x, d.z) * 2); return { key: `caneHeap|${s}`, params: { seed: s } }; }
    case 'creases': return { key: `creases|${Math.round(d.len)}`, params: { len: d.len } };
    case 'kabaddiLines': return { key: `kabaddi|${d.w}|${d.d}`, params: { w: d.w, d: d.d } };
    default: return { key: d.kind, params: {} };
  }
};

async function loadModel(file) {
  const gltf = await getGLTFLoader().loadAsync(`assets/models/${file}.glb`);
  gltf.scene.updateWorldMatrix(true, true);
  let mesh = null;
  gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  swapShared(mesh);
  const g = floatGeometry(mesh.geometry).applyMatrix4(mesh.matrixWorld);
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  const col = g.attributes.color;
  if (!col) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  else if (col.itemSize === 4) { const f = new Float32Array(col.count * 3); for (let i = 0; i < col.count; i++) { f[i * 3] = col.getX(i); f[i * 3 + 1] = col.getY(i); f[i * 3 + 2] = col.getZ(i); } g.setAttribute('color', new THREE.BufferAttribute(f, 3)); }
  if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
  return { geo: g, mat: mesh.material };
}

/**
 * Low-poly stand-in for a turned pot (S7 fixes): a lathe of the model's own outline (widest radius per height band, plus the
 * rim turning in at the mouth), same material and UV/colour attributes, so it joins the same batch. Pots 9 bands x 8 sides
 * = 192 triangles, kulhads 5 x 6 = 108, instead of the full models'; used beyond POT_LOD_M (kulhads beyond KULHAD_LOD_M).
 */
export function latheStandIn(src, { bands = 12, sides = 10 } = {}) {
  const pos = src.attributes.position;
  src.computeBoundingBox();
  const bb = src.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, y0 = bb.min.y, H = bb.max.y - bb.min.y || 0.01;
  const rMax = new Array(bands).fill(0);
  for (let i = 0; i < pos.count; i++) {
    const b = Math.min(bands - 1, Math.floor(((pos.getY(i) - y0) / H) * bands));
    rMax[b] = Math.max(rMax[b], Math.hypot(pos.getX(i) - cx, pos.getZ(i) - cz));
  }
  for (let b = 0; b < bands; b++) if (!rMax[b]) rMax[b] = rMax[b - 1] || 0.01; // empty band: carry the one below
  const pts = [new THREE.Vector2(0, y0), new THREE.Vector2(rMax[0] * 0.92, y0)];
  for (let b = 0; b < bands; b++) pts.push(new THREE.Vector2(rMax[b], y0 + ((b + 0.5) / bands) * H));
  const rTop = rMax[bands - 1];
  pts.push(new THREE.Vector2(rTop, y0 + H), new THREE.Vector2(rTop * 0.8, y0 + H), new THREE.Vector2(rTop * 0.72, y0 + H - Math.min(0.06, H * 0.15)));
  const g = new THREE.LatheGeometry(pts, sides).translate(cx, 0, cz);
  // the same attribute set as the full model (BatchedMesh needs it): colour = the model's mean vertex colour
  const col = src.attributes.color, mean = [0, 0, 0];
  for (let i = 0; i < col.count; i++) { mean[0] += col.getX(i); mean[1] += col.getY(i); mean[2] += col.getZ(i); }
  const n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = mean[0] / col.count; arr[i * 3 + 1] = mean[1] / col.count; arr[i * 3 + 2] = mean[2] / col.count; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  for (const k of Object.keys(g.attributes)) if (!src.attributes[k]) g.deleteAttribute(k);
  return g;
}
const POT_LOD_M = 25, KULHAD_LOD_M = 12; // switch to the lathe stand-in beyond these (a kulhad is a 10 cm cup)

export async function buildMapObjects(scene, { map = null, camera = null } = {}) {
  // always the game's own map data (rects, centres, trimmed galis); shops-land's loader may hand back the raw export
  if (!map || !map.objects?.some((o) => o.rect)) map = getLayout();
  const plan = planMapObjects(map);
  // 25 Nov, her order (ROADS MUST BE EMPTY): a design or milestone that stands within 0.3 m of a road's DRAWN edge (band + edge wander) is
  // pushed straight away from the road by the smallest distance (max 3 m); one that cannot be moved legally is removed (ROAD_EMPTY_REMOVE).
  // Moves are listed on report.roadEmpty. Colliders and models below read the moved position.
  const roadEmpty = [];
  const keepOff = (list, kind, probesOf) => list.filter((o) => {
    const r = roadEmptyPush(o.x, o.z, probesOf(o), 8, 0.6); // margin 0.6: 0.3 beyond the drawn edge plus the highway's wider alpha-0.5 apron (+0.3), her 25 Nov order
    if (r && r.moved === 0) return true;
    if (r) { roadEmpty.push({ id: o.id, kind, from: [+o.x.toFixed(2), +o.z.toFixed(2)], to: [+r.x.toFixed(2), +r.z.toFixed(2)], moved: +r.moved.toFixed(2) }); o.x = r.x; o.z = r.z; return true; }
    roadEmpty.push({ id: o.id, kind, from: [+o.x.toFixed(2), +o.z.toFixed(2)], removed: true }); // removed 25 Nov: stood on road, her order
    return !ROAD_EMPTY_REMOVE;
  });
  plan.designs = keepOff(plan.designs, 'design', (d) => { const c = Math.cos(d.ry || 0), sn = Math.sin(d.ry || 0), hw = Math.min(d.w || 1, 6) / 2, hd = Math.min(d.d || 1, 6) / 2, pr = [[0, 0]]; for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) pr.push([a * hw * c + b * hd * sn, -a * hw * sn + b * hd * c]); return pr; });
  plan.milestones = keepOff(plan.milestones, 'milestone', () => [[0, 0], [0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4]]);
  await yieldToMain(); // boot-CPU pass (25 Nov): one stage per turn, input and paint run between stages
  const group = new THREE.Group();
  group.name = 's7_mapobjects';
  const colliders = [], heightFns = [], layers = {};
  const report = { counts: plan.counts, skipped: plan.skipped, roadEmpty };

  // ---- 1. built designs, one batch over the library sets
  const kit = new ObjBatch('s7_mapobjects_kit');
  let sliceT = performance.now(); // 26 Nov: stage 1 builds every design + collider in one long task; yield to the main thread every ~8 ms
  for (const d of plan.designs) {
    if (performance.now() - sliceT > 8) { await yieldToMain(); sliceT = performance.now(); }
    const { key, params } = designKey(d);
    kit.design(key, () => buildDesign(d.kind, params));
    const big = ['tubewell', 'tower', 'transformer', 'notice', 'trough', 'washplatform', 'creases', 'kabaddiLines', 'plotPillar'].includes(d.kind);
    const s = big ? 1 : 0.93 + 0.14 * hash01(d.x * 1.7, d.z * 0.3);
    const yaw = big ? d.ry : d.ry + (hash01(d.z, d.x) - 0.5) * 0.12;
    let color = tint(d.id, d.kind === 'tower' ? 0.03 : 0.08);
    let m = mat4(d.x, 0, d.z, yaw, s);
    if (d.kind === 'cloth') { color = new THREE.Color(CLOTHS[d.seed % CLOTHS.length]).multiplyScalar(0.9 + 0.1 * hash01(d.seed)); const sx = 0.6 + hash01(d.seed, 5) * 1.6, sz = 0.6 + hash01(d.seed, 6) * 0.6; m = mat4(d.x, 0, d.z, d.ry, 1, sx, 1, sz); }
    kit.add(key, m, color, REACH[d.kind] || PROP);
    const so = SOLID[d.kind] === undefined ? undefined : SOLID[d.kind];
    if (so === 'legs') for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [x, z] = toWorld(d.x, d.z, yaw, a * 1.0, b * 1.0); colliders.push({ minX: x - 0.1, maxX: x + 0.1, minZ: z - 0.1, maxZ: z + 0.1 }); }
    else if (so === 'swing') for (const a of [-1.3, 1.3]) { const [x, z] = toWorld(d.x, d.z, yaw, a, 0); colliders.push({ minX: x - 0.12, maxX: x + 0.12, minZ: z - 0.8, maxZ: z + 0.8 }); }
    else if (so === null) colliders.push(...orientedBoxes(d.x, d.z, yaw, d.w, d.d, 0.8));
    else if (so) colliders.push(...orientedBoxes(d.x, d.z, yaw, so[0] * s, so[1] * s, 0.8));
    if (d.kind === 'tubewell') { const [hx, hz] = toWorld(d.x, d.z, d.ry, 2.25, 0); colliders.push(...orientedBoxes(hx, hz, d.ry, 1.3, 1.2, 0.7)); }
    if (d.kind === 'washplatform') { const c = Math.cos(yaw), sn = Math.sin(yaw), W = d.w / 2, D = d.d / 2; heightFns.push((x, z) => { const dx = x - d.x, dz = z - d.z, lx = dx * c - dz * sn, lz = dx * sn + dz * c; return Math.abs(lx) < W && Math.abs(lz) < D ? 0.35 : 0; }); }
  }
  for (const t of plan.tanks) {
    const key = `templeTank|${t.outer}|${t.inner}`;
    kit.design(key, () => buildDesign('templeTank', { outer: t.outer, inner: t.inner }));
    kit.add(key, mat4(t.x, 0, t.z, t.ry), tint('tank', 0.04), REACH.templeTank);
    // the outer wall is walkable (height function), the kund water is solid (ground module)
  }

  // ---- 2. the welcome gate: pillars where the map puts them, the beam between, boards facing the highway / the village
  const signGeos = [];
  const signTex = makeSignTexture();
  if (plan.gate && plan.gate.pillars.length === 2) {
    const [p1, p2] = plan.gate.pillars, span = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    const gx = (p1.x + p2.x) / 2, gz = (p1.z + p2.z) / 2, gry = Math.atan2(p2.x - p1.x, p2.z - p1.z);
    const arch = plan.gate.arch || { y0: 5, y1: 6.5 };
    const key = `gate|${span.toFixed(2)}`;
    kit.design(key, () => buildDesign('gate', { span, beamY0: arch.y0, beamY1: arch.y1, pillarH: p1.h }));
    kit.add(key, mat4(gx, 0, gz, gry), tint('gate', 0.03), REACH.gate);
    for (const p of [p1, p2]) colliders.push({ minX: p.x - 0.75, maxX: p.x + 0.75, minZ: p.z - 0.75, maxZ: p.z + 0.75 });
    // which face looks at the highway: local +x is (cos ry, -sin ry)
    const hw = nearestRoad(map.roads.filter((r) => r.kind === 'highway'), gx, gz);
    const lx = [Math.cos(gry), -Math.sin(gry)], out = hw ? Math.sign((hw.p[0] - gx) * lx[0] + (hw.p[1] - gz) * lx[1]) || 1 : 1;
    const G = mat4(gx, 0, gz, gry), bw = 7.2, bh = 1.4, by = (arch.y0 + arch.y1) / 2;
    for (const side of [1, -1]) {
      const M = G.clone().multiply(new THREE.Matrix4().makeTranslation(side * 0.302, by, 0)).multiply(new THREE.Matrix4().makeRotationY(side * Math.PI / 2));
      signGeos.push(signQuad(side === out ? SIGN_RECTS.gateFront : SIGN_RECTS.gateBack, bw, bh, M));
    }
    report.gate = { span: +span.toFixed(2), welcomeFaces: hw ? hw.id : 'none' };
  }
  for (const d of plan.designs) if (d.kind === 'notice') {
    const M = mat4(d.x, 0, d.z, d.ry).multiply(new THREE.Matrix4().makeTranslation(0, 1.55, -0.032));
    signGeos.push(signQuad(SIGN_RECTS.notice, 1.84, 1.24, M));
  }
  if (signGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(signGeos), signMaterial(signTex));
    m.name = 's7_mapobjects_signs';
    m.userData.noAutoCollider = true;
    group.add(m); layers.signs = m;
  }

  await yieldToMain();
  const kitGroup = kit.finalize((mat) => landMaterial(mat));
  await yieldToMain();
  group.add(kitGroup); layers.kit = kitGroup;

  // ---- 3. ground and water
  const gw = await buildGroundAndWater(plan, map.roads);
  if (gw.ground) { group.add(gw.ground); layers.ground = gw.ground; }
  if (gw.water) { group.add(gw.water); layers.water = gw.water; }
  colliders.push(...gw.colliders);
  heightFns.push(...gw.heightFns);
  report.ground = gw.report;

  await yieldToMain();
  // ---- 4. the game's own clay pot and milestone models (tools/blender/build_pots.py, build_milestone.py), one batch
  const models = new ObjBatch('s7_mapobjects_models');
  let modelsGroup = null;
  try {
    const potFiles = ['pot_matka_v2', 'pot_matka_v2_b', 'pot_matka_v2_c', 'pot_surahi_v2', 'pot_surahi_v2_b', 'pot_kulhad_v2'];
    const msFiles = ['milestone_v2', 'milestone_v2_b', 'milestone_v2_c'];
    const loaded = await Promise.all([...potFiles, ...msFiles].map((f) => loadModel(f).then((r) => [f, r])));
    const matOf = new Map();
    for (const [f, r] of loaded) {
      models.design(f, () => ({ [r.mat.uuid]: r.geo })); matOf.set(r.mat.uuid, r.mat);
      if (f.startsWith('pot_')) models.design(f + '|low', () => ({ [r.mat.uuid]: latheStandIn(r.geo, f.includes('kulhad') ? { bands: 5, sides: 6 } : { bands: 9, sides: 8 }) })); // S7 fixes: distance stand-in
    }
    // the potter's stock: matkas and surahis at the game's own size (0.45-0.7 m), and about one spot in four a little
    // group of kulhads (tea cups) set out to dry
    let sliceT4 = performance.now(); // 26 Nov: pots + milestones in one task; yield to the main thread every ~8 ms
    for (let i = 0; i < plan.pots.length; i++) {
      if (performance.now() - sliceT4 > 8) { await yieldToMain(); sliceT4 = performance.now(); }
      const p = plan.pots[i];
      const fired = hash01(i, 8) < 0.7; // most fired red, some still drying grey-brown
      const c = fired ? tint(p.id, 0.08) : new THREE.Color(0.86, 0.8, 0.74);
      if (hash01(p.x * 1.3, p.z * 2.9) < 0.25) {
        for (let k = 0; k < 5; k++) { const a = k * 1.26 + i, r = k ? 0.16 : 0; models.add('pot_kulhad_v2', mat4(p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r, a, 0.9 + 0.2 * hash01(i, k)), c, PROP * 0.6, { key: 'pot_kulhad_v2|low', near: KULHAD_LOD_M }); }
        continue;
      }
      const f = potFiles[Math.floor(hash01(p.x * 3.1, p.z * 1.7) * (potFiles.length - 1))];
      const s = 0.8 + 0.2 * hash01(i, 7);
      models.add(f, mat4(p.x, 0, p.z, hash01(i, 9) * 6.28, s, s, s, s, (hash01(i, 3) - 0.5) * 0.06, (hash01(i, 4) - 0.5) * 0.06), c, PROP, { key: f + '|low', near: POT_LOD_M });
      colliders.push({ minX: p.x - 0.22, maxX: p.x + 0.22, minZ: p.z - 0.22, maxZ: p.z + 0.22 });
    }
    for (let i = 0; i < plan.milestones.length; i++) {
      if (performance.now() - sliceT4 > 8) { await yieldToMain(); sliceT4 = performance.now(); }
      const m = plan.milestones[i];
      const f = msFiles[i % msFiles.length];
      models.add(f, mat4(m.x, 0, m.z, m.ry + (hash01(i, 2) - 0.5) * 0.12, 1, 1 + (hash01(i, 5) - 0.5) * 0.1, 1 + (hash01(i, 6) - 0.5) * 0.12, 1, (hash01(i, 3) - 0.5) * 0.05, (hash01(i, 4) - 0.5) * 0.06), tint(m.id, 0.05), PROP * 1.5);
      colliders.push({ minX: m.x - 0.4, maxX: m.x + 0.4, minZ: m.z - 0.4, maxZ: m.z + 0.4 });
    }
    modelsGroup = models.finalize((uuid) => matOf.get(uuid));
    group.add(modelsGroup); layers.models = modelsGroup;
  } catch (e) { console.warn('map objects: pot / milestone models did not load', e); }

  // ---- 5. buffaloes: the game's own instanced herd model (src/animals.js), one draw call, a slow idle sway
  let herd = null;
  if (plan.animals.length) {
    herd = createCattleHerd(plan.animals.map((a) => ({ x: a.x, z: a.z, rotationY: a.ry, buffalo: true })));
    herd.mesh.name = 's7_mapobjects_buffaloes';
    group.add(herd.mesh); layers.animals = herd.mesh;
  }

  // ---- colliders on one holder mesh, walk heights, per-frame distance packing
  const holder = layers.ground || kitGroup.children[0];
  if (holder) holder.userData.colliderBoxes = colliders;
  let lx = 1e9, lz = 1e9, last = performance.now();
  const update = (cam) => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (herd) herd.update(dt);
    if (Math.abs(cam.position.x - lx) + Math.abs(cam.position.z - lz) < 3) return;
    lx = cam.position.x; lz = cam.position.z;
    report.drawn = kit.update(cam) + models.update(cam);
    report.modelTris = models.drawnTris();
  };
  group.add(frameHook(update));
  if (camera) update(camera);
  // S7 fixes: switch the pot distance stand-ins off / on (measuring, comparing); the next camera move re-picks the tiers
  group.userData.setPotLod = (on, nearM = null) => { for (const it of models.inst) if (it.lod) { it.lod.base ??= it.lod.near; it.lod.near = !on ? 1e9 : nearM ? Math.min(nearM, it.lod.base) : it.lod.base; } lx = 1e9; };
  group.traverse((o) => { if (o.isMesh) o.userData.noAutoCollider = true; });
  group.userData.heightAt = (x, z) => { let y = 0; for (const f of heightFns) { const h = f(x, z); if (h > y) y = h; } return y; };
  report.colliders = colliders.length;
  report.triangles = { kit: kit.tris(), models: models.tris(), ground: gw.report.groundTris, water: gw.report.waterTris };
  report.designs = kit.designs.size;
  group.userData.report = report;
  if (scene) scene.add(group);
  return { group, layers, report, plan };
}
