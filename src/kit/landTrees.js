import * as THREE from 'three';
import { LAND_QUALITY } from './landQuality.js';
import { ver } from '../assetUrl.js';
import { treeParts, treeMaterials, CANOPIES } from '../trees.js';
import { BatchKit, orientedBoxes } from './landInstancing.js';
import { labelKey, labelName, ringCentre, ringRadius, hash01, inRing, makeRoadIndex } from './landLayout.js';
import SHADE_TREES from './landShadeTrees.json'; // S7 fixes: one neem / peepal per "under a tree" spot (planned by src/kit/landShadeTrees.js)
import { yieldToMain } from './lateBuild.js';

/**
 * Every tree of the approved map (?layout=new), ~585: mango (orchards), guava / jamun (orchard + village), eucalyptus rows
 * along field edges, neem / shisham in the village, the green strip by the canal and the kiln green, and the one big
 * peepal by the chaupal. Species and look come from src/trees.js (real leaf-photo cards on branching trunks).
 *
 * Instancing: three BatchedMeshes for the whole village, whatever the count:
 *   bark (trunk + branches) | leaf cards | impostors (two crossed baked-render quads)
 * Distance tiers, re-checked when the camera moves 5 m: full crown within NEAR_M, every third card + trunk to MID_M,
 * impostor beyond. So trees cost 3 draw calls in the main pass, never more.
 */
const NEAR_M = LAND_QUALITY.treeNearM, MID_M = LAND_QUALITY.treeMidM, VARIANTS = LAND_QUALITY.treeVariants;

const KIND_OF = {
  new_mango: () => 'mango',
  new_guava: (h) => (h < 0.75 ? 'guava' : 'jamun'),
  new_rowtree: () => 'eucalyptus',
  new_tree: (h) => (h < 0.55 ? 'neem' : 'shisham'),
  new_greenbelt: (h) => (h < 0.5 ? 'shisham' : 'neem'),
  new_kilngreen: (h) => (h < 0.5 ? 'neem' : 'shisham'),
  new_peepal: () => 'peepal',
};
// jamun = a mango-structured tree with darker, glossier foliage and a darker trunk
const SPEC_OF = { mango: 'mango', guava: 'guava', jamun: 'mango', eucalyptus: 'eucalyptus', neem: 'neem', shisham: 'shisham', peepal: 'peepal' };
const LEAF_TINT = { jamun: 0x8c9a8a, mango: 0xffffff, guava: 0xffffff, eucalyptus: 0xffffff, neem: 0xffffff, shisham: 0xffffff, peepal: 0xffffff };
const TRUNK_R = { neem: 0.3, shisham: 0.28, peepal: 0.45, mango: 0.38, jamun: 0.38, guava: 0.2, eucalyptus: 0.25 };
const IMPOSTORS = ['neem', 'peepal', 'mango', 'babool', 'eucalyptus'];

function indexed(g) {
  if (!g.index) { const n = g.attributes.position.count; const idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); }
  return g;
}
/** Leaf geometry keeping every `step`-th card, compacted (cards are 4 vertices, 6 indices). */
function thinCards(leafGeo, step) {
  const src = leafGeo.attributes, cards = leafGeo.index.count / 6;
  const keep = [];
  for (let c = 0; c < cards; c += step) keep.push(c);
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'uv', 'color', 'normal']) {
    const a = src[name], n = a.itemSize, arr = new Float32Array(keep.length * 4 * n);
    keep.forEach((c, k) => { const v0 = leafGeo.index.getX(c * 6); for (let j = 0; j < 4 * n; j++) arr[k * 4 * n + j] = a.array[v0 * n + j]; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  const idx = [];
  keep.forEach((_, k) => idx.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3));
  out.setIndex(idx);
  // a thinned crown lets light through: make each remaining card a little bigger so the silhouette holds
  const p = out.attributes.position;
  for (let k = 0; k < keep.length; k++) {
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < 4; j++) { cx += p.getX(k * 4 + j) / 4; cy += p.getY(k * 4 + j) / 4; cz += p.getZ(k * 4 + j) / 4; }
    for (let j = 0; j < 4; j++) { const i = k * 4 + j; p.setXYZ(i, cx + (p.getX(i) - cx) * 1.35, cy + (p.getY(i) - cy) * 1.35, cz + (p.getZ(i) - cz) * 1.35); }
  }
  return out;
}

/** One canvas holding the five baked impostor sprites side by side, so all impostors share one material. */
function impostorAtlas() {
  const W = 256, canvas = document.createElement('canvas');
  canvas.width = W * IMPOSTORS.length; canvas.height = W;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, vertexColors: true });
  mat.name = 'tree_impostor_atlas';
  const ctx = canvas.getContext('2d');
  const ready = Promise.all(IMPOSTORS.map((sp, i) => new Promise((res) => {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, i * W, 0, W, W); tex.needsUpdate = true; res(); };
    img.onerror = () => res();
    img.src = ver(`assets/trees/impostor_${sp}.webp`); // same ?v= url as trees.js, one download
  })));
  return { mat, ready, cell: (sp) => IMPOSTORS.indexOf(sp) };
}

function impostorGeometry(cellIdx, box) {
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const w = Math.max(size.x, size.z) * 1.33, h = size.y * 1.5;
  const n = IMPOSTORS.length;
  const quad = (rot) => {
    const g = new THREE.PlaneGeometry(w, h).rotateY(rot).translate(c.x, c.y, c.z);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, (cellIdx + 0.004 + uv.getX(i) * 0.992) / n);
    return g;
  };
  const a = quad(0), b = quad(Math.PI / 2);
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const A = a.attributes[name], B = b.attributes[name];
    const arr = new Float32Array(A.array.length + B.array.length); arr.set(A.array); arr.set(B.array, A.array.length);
    g.setAttribute(name, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const ia = Array.from(a.index.array), ib = Array.from(b.index.array).map((v) => v + a.attributes.position.count);
  g.setIndex([...ia, ...ib]);
  // normals point up-and-out so the far crown is lit like a volume, not two flat cards
  const nr = g.attributes.normal, p = g.attributes.position;
  for (let i = 0; i < nr.count; i++) { const v = new THREE.Vector3(p.getX(i) - c.x, 0.9, p.getZ(i) - c.z).normalize(); nr.setXYZ(i, v.x, v.y, v.z); }
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.count * 3).fill(1), 3));
  return g;
}

export async function build(map, { camera = null } = {}) {
  const trees = [];
  for (const o of map.objects) {
    // The game's packed layout (src/layout/mapData.json) gives trees as cx/cz/r with no rings; the raw export has rings (21 Nov).
    if (o.kind !== 'trees' || !(o.rings?.[0] || Number.isFinite(o.cx))) continue;
    const key = labelKey(o), pick = KIND_OF[key];
    if (!pick) continue;
    const c = o.rings?.[0] ? ringCentre(o.rings[0]) : { x: o.cx, z: o.cz }, r = o.rings?.[0] ? ringRadius(o.rings[0]) : (o.r || 3);
    const h = hash01(c.x, c.z);
    trees.push({ kind: pick(h), x: c.x, z: c.z, d: r * 2, h: o.y1 || 9, seed: Math.floor(hash01(c.z, c.x) * VARIANTS), ry: hash01(c.x * 3.1, c.z) * Math.PI * 2 });
  }

  // S7 fixes: the map's "under a tree" spots (2 barbers, the carrom, 9 resting spots) draw no tree of their own; each gets one
  // shade tree, trunk on the sun side of the seat and clear of the seat, roads and buildings (rule: docs/s7/fixes.md).
  for (const t of SHADE_TREES) trees.push({ kind: t.kind, x: t.x, z: t.z, d: t.d, h: t.h, seed: Math.floor(hash01(t.z, t.x) * VARIANTS), ry: hash01(t.x * 3.1, t.z) * Math.PI * 2, shade: true });

  // Orchards in rows: the map draws orchard trees mostly along the orchard edges (the east mango orchard has 12 trees on
  // 3,600 m2), so every orchard's empty middle is filled with rows of its own species at ~10.5 m, the spacing the map uses
  // where it is full, never within 8 m of a drawn tree or 4 m of a road.
  const roads = makeRoadIndex(map.roads);
  let filled = 0;
  for (const o of map.objects) {
    if (labelKey(o) !== 'new_orchard' || !o.rings?.[0]) continue;
    const ring = o.rings[0], name = labelName(o);
    let area = 0;
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; area += a[0] * b[1] - b[0] * a[1]; }
    area = Math.abs(area) / 2;
    const xs = ring.map((q) => q[0]), zs = ring.map((q) => q[1]), step = 10.5;
    for (let x = Math.min(...xs) + step / 2; x < Math.max(...xs); x += step) {
      for (let z = Math.min(...zs) + step / 2; z < Math.max(...zs); z += step) {
        const jx = x + (hash01(x, z) - 0.5) * 1.2, jz = z + (hash01(z, x) - 0.5) * 1.2;
        if (!inRing(ring, jx, jz) || roads.clearance(jx, jz) < 4) continue;
        if (trees.some((t) => (t.x - jx) ** 2 + (t.z - jz) ** 2 < 64)) continue; // keep the drawn trees, fill only the gaps
        const h = hash01(jx, jz);
        const kind = /guava/i.test(name) ? (h < 0.75 ? 'guava' : 'jamun') : 'mango';
        trees.push({ kind, x: jx, z: jz, d: kind === 'mango' ? 7.2 : 5.2, h: 9, seed: Math.floor(hash01(jz, jx) * VARIANTS), ry: h * Math.PI * 2 });
        filled++;
      }
    }
  }

  const kit = new BatchKit('s7_trees');
  const imp = impostorAtlas();
  const natural = new Map(); // `${kind}|${seed}` -> Box3 of the near crown
  for (const t of trees) {
    const k = `${t.kind}|${t.seed}`;
    if (natural.has(k)) continue;
    const parts = treeParts(SPEC_OF[t.kind], t.seed * 7 + 1);
    const trunk = indexed(parts.trunkGeo);
    trunk.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(trunk.attributes.position.count * 2), 2));
    parts.leafGeo.computeBoundingBox();
    const box = parts.leafGeo.boundingBox.clone();
    trunk.computeBoundingBox(); box.union(trunk.boundingBox);
    natural.set(k, box);
    kit.design(`${k}|near`, () => ({ bark: trunk, leaf: parts.leafGeo }));
    kit.design(`${k}|mid`, () => ({ bark: trunk, leaf: thinCards(parts.leafGeo, 2) }));
    kit.design(`${k}|far`, () => ({ imp: impostorGeometry(imp.cell(parts.impostor), box) }));
  }

  const colliders = [];
  const lod = [];
  const group = new THREE.Group();
  group.name = 's7_trees';
  let sliceT = performance.now(); // 26 Nov: ~560 trees placed in one task; yield to the main thread every ~8 ms
  for (const t of trees) {
    if (performance.now() - sliceT > 8) { await yieldToMain(); sliceT = performance.now(); }
    const k = `${t.kind}|${t.seed}`, box = natural.get(k);
    const nat = box.getSize(new THREE.Vector3());
    const wide = Math.max(nat.x, nat.z);
    let s = THREE.MathUtils.clamp(t.d / wide, 0.6, 2.2);
    if (t.kind === 'peepal' && !t.shade) s = Math.max(s, 1.45); // the chaupal peepal is the biggest tree in the village: its crown spreads well past the chabutra
    // the map's canopy height wins where the natural crown would be too short (eucalyptus rows): stretch up to 1.35x
    const sy = THREE.MathUtils.clamp(t.h / nat.y, s * 0.9, s * 1.35);
    const leafTint = new THREE.Color(LEAF_TINT[t.kind]).multiplyScalar(0.92 + 0.16 * hash01(t.x, 7));
    const colors = { leaf: leafTint.getHex(), imp: new THREE.Color(leafTint).multiplyScalar(t.kind === 'guava' || t.kind === 'shisham' ? 1.08 : 1).getHex(), bark: t.kind === 'jamun' ? 0xb8b0a8 : 0xffffff };
    const ids = [`${k}|near`, `${k}|mid`, `${k}|far`].map((dk, tier) => kit.add(dk, { x: t.x, z: t.z, ry: t.ry, s, colors, visible: tier === 2 }));
    // stretch y on every tier (BatchKit composes a uniform scale; patch the y scale into the stored instance)
    for (const id of ids) kit.instances[id].sy = sy;
    lod.push({ x: t.x, z: t.z, ids, tier: 2 });
    const tr = TRUNK_R[t.kind] * s;
    colliders.push(...orientedBoxes(t.x, t.z, 0, tr * 2, tr * 2));
    const reach = (Math.max(nat.x, nat.z) / 2) * s * 0.8;
    CANOPIES.push({ x: t.x, z: t.z, y0: nat.y * sy * 0.45, y1: nat.y * sy * 1.05, r: reach, root: group });
  }
  // non-uniform scale: apply before finalize by swapping the stored scale for a matrix
  const origFinalize = kit.finalize.bind(kit);
  const mats = treeMaterials();
  const bodies = origFinalize({ bark: mats.trunk, leaf: mats.leaves, imp: imp.mat });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  sliceT = performance.now(); // same instance count again (3 LOD tiers each): slice this pass too
  for (const inst of kit.instances) {
    if (performance.now() - sliceT > 8) { await yieldToMain(); sliceT = performance.now(); }
    m.compose(new THREE.Vector3(inst.x, inst.y, inst.z), q.setFromAxisAngle(up, inst.ry), new THREE.Vector3(inst.s, inst.sy ?? inst.s, inst.s));
    for (const mat in inst.ids) kit.batches.get(mat).bm.setMatrixAt(inst.ids[mat], m);
  }
  group.add(bodies);
  const barkBM = kit.batches.get('bark').bm;
  barkBM.castShadow = true;
  barkBM.userData.colliderBoxes = colliders;
  for (const b of kit.batches.values()) b.bm.userData.noAutoCollider = true;

  let lx = 1e9, lz = 1e9;
  const update = (cam) => {
    if (!cam) return;
    const p = cam.position;
    if (Math.abs(p.x - lx) + Math.abs(p.z - lz) < 5) return;
    lx = p.x; lz = p.z;
    for (const e of lod) {
      const d2 = (e.x - p.x) ** 2 + (e.z - p.z) ** 2;
      const tier = d2 < NEAR_M * NEAR_M ? 0 : d2 < MID_M * MID_M ? 1 : 2;
      if (tier === e.tier) continue;
      e.tier = tier;
      e.ids.forEach((id, k) => kit.setVisible(id, k === tier));
    }
  };
  for (const b of kit.batches.values()) {
    const orig = b.bm.onBeforeRender.bind(b.bm);
    b.bm.onBeforeRender = (renderer, scene, cam, geo, mat, grp) => { update(cam); orig(renderer, scene, cam, geo, mat, grp); };
  }
  if (camera) update(camera);
  await imp.ready;

  const counts = {};
  for (const t of trees) counts[t.kind] = (counts[t.kind] || 0) + 1;
  group.userData.report = { trees: trees.length, orchardRowsAdded: filled, shadeTrees: SHADE_TREES.length, bySpecies: counts, kit: kit.stats() };
  group.userData.update = update;
  return group;
}
