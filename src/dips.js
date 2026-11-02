import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTiledMaterial } from './materials.js';
import { pt } from './anchors.js';

/**
 * Local dips (docs/PARALLEL.md item 5): real ground height ONLY around the pond, the johad and the canal.
 * Not a terrain system. The flat ground plane gets a shader hole over each dip (discard, no geometry change),
 * and each dip is its own small vertex-coloured mesh on the shared 'ground' texture set (pond, johad) or the
 * shared 'concrete' set (canal lining). Banks slope in, the water sits below the bank line, outlines wobble.
 *
 * One outline formula (blobEdge) drives the water surface (src/water.js blobWaterGeometry), the bank mesh,
 * the ground hole (GLSL copy below) and the walk height (dipHeightAt), so the four can never drift apart.
 *
 * A pond/johad hole is only cut while its bank mesh is in the scene (zone streamed): checked each frame from
 * the ground's own onBeforeRender, so a torn-down zone leaves flat ground, never a hole into the void.
 */

// Water radius R is the water's own outline (same R/seed the old flat pond used). Banks rise from u=1 (water
// edge) to u=rim (ground level); beyond that a short flat ring fades the mud colour out over the ground.
export const BLOB_DIPS = {
  pond: { ...pt('pond'), R: 9.6, seed: 1.3, water: -0.5, bed: -1.45, rim: 1.25, segs: 48 },
  johad: { ...pt('johad'), R: 5.4, seed: 4.1, water: -0.38, bed: -1.0, rim: 1.32, segs: 36 },
};
const FADE = 0.15; // u beyond the rim the flat mud ring reaches (covers the hole edge)
const LIFT = 0.012; // that flat ring sits this far above the ground plane

/** Outline radius multiplier at polar angle a (same formula as water.js blobWaterGeometry; world z = -sin(a)). */
export function blobEdge(a, seed) {
  return 1 + 0.16 * Math.sin(a * 2 + seed) + 0.09 * Math.sin(a * 3 + seed * 2.3) + 0.05 * Math.sin(a * 5 + seed * 0.7);
}
/** Bank-top line in u: wobbles at a higher frequency than the water outline, so the lip is never a scaled copy of the shore. */
function rimU(d, a) {
  return d.rim + 0.05 * Math.sin(a * 7 + d.seed * 3) + 0.03 * Math.sin(a * 13 + d.seed);
}
const sstep = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

/** Height of the dip surface at polar coordinate u (1 = water edge) for angle a. */
function blobProfile(d, u, a) {
  const ur = rimU(d, a);
  if (u >= ur) return 0;
  if (u >= 1) return d.water * (1 - sstep((u - 1) / (ur - 1)));
  return d.water + (d.bed - d.water) * sstep((1 - u) / 0.65); // a gentle muddy shelf at the waterline, then down to the bed
}
function blobPolar(d, x, z) {
  const dx = x - d.x, dz = z - d.z;
  const a = Math.atan2(-dz, dx);
  return { a, u: Math.hypot(dx, dz) / (d.R * blobEdge(a, d.seed)) };
}

// ---------------------------------------------------------------- canal (registered by src/canal.js)
let CANAL = null;
/** src/canal.js hands its own numbers over, so this module never imports canal.js (no import cycle). */
export function registerCanalDip(c) { CANAL = { half: 2.98, water: -0.5, bed: -1.1, toe: 1.6, endRamp: 1.6, ...c }; return CANAL; }
function canalProfile(x, z) {
  const c = CANAL;
  const ad = Math.abs(z - c.z);
  if (ad >= c.half || x <= c.minX || x >= c.maxX) return 0;
  const across = ad <= c.toe ? c.bed - 0.05 * (1 - ad / c.toe) : c.bed * (c.half - ad) / (c.half - c.toe);
  return across * sstep(Math.min(x - c.minX, c.maxX - x) / c.endRamp);
}

// ---------------------------------------------------------------- active flags + walk height
const ACTIVE = { pond: false, johad: false };
const BANK_MESH = {};
const PADS = []; // { minX, maxX, minZ, maxZ, y, dip } flat walkable tops inside a dip (ghat steps)
function inScene(o) { while (o) { if (o.isScene) return true; o = o.parent; } return false; }
function refreshActive() { for (const id in ACTIVE) ACTIVE[id] = !!BANK_MESH[id] && inScene(BANK_MESH[id]); }

/** Dip surface height ignoring streaming (for placing props). 0 outside every dip. */
export function dipHeightRaw(x, z) {
  for (const id in BLOB_DIPS) {
    const d = BLOB_DIPS[id];
    if (Math.abs(x - d.x) > d.R * 2 || Math.abs(z - d.z) > d.R * 2) continue;
    const { a, u } = blobPolar(d, x, z);
    return blobProfile(d, u, a);
  }
  return CANAL ? canalProfile(x, z) : 0;
}

/**
 * Where the player's feet go (src/main.js groundHeightAt). Inside a live dip: the bank surface, ghat step tops,
 * the canal bridge deck / pulia planks, and never more than 0.18 m under the water (ankle-deep wading at the
 * collider's edge, never sunk to the neck). 0 everywhere else, so the rest of the village is untouched.
 */
export function dipHeightAt(x, z) {
  for (const id in BLOB_DIPS) {
    const d = BLOB_DIPS[id];
    if (!ACTIVE[id] || Math.abs(x - d.x) > d.R * 2 || Math.abs(z - d.z) > d.R * 2) continue;
    let y = dipHeightRaw(x, z);
    for (const p of PADS) if (p.dip === id && x > p.minX && x < p.maxX && z > p.minZ && z < p.maxZ) y = Math.max(y, p.y);
    return Math.max(y, d.water - 0.18);
  }
  if (!CANAL) return 0;
  const c = CANAL;
  const ad = Math.abs(z - c.z);
  for (const deck of c.decks || []) {
    if (Math.abs(x - deck.x) < deck.halfX && ad < deck.halfZ) {
      const ramp = deck.ramp ? Math.min(1, (deck.halfZ - ad) / deck.ramp) : 1;
      return Math.max(canalProfile(x, z), deck.y * ramp);
    }
  }
  const y = canalProfile(x, z);
  return y < 0 ? Math.max(y, c.water - 0.18) : 0;
}

/** Ghat steps and other flat tops inside a dip (world rect). */
export function registerDipPad(dip, rect) { PADS.push({ dip, ...rect }); }

// ---------------------------------------------------------------- ground hole (shader only)
/** Cuts the ground plane over every dip: one discard test per fragment, no texture, no draw call. Call once, before first render. */
export function applyDipHoles(ground) {
  const mat = ground.material;
  const ids = Object.keys(BLOB_DIPS);
  const uBlob = ids.map((id) => { const d = BLOB_DIPS[id]; return new THREE.Vector4(d.x, d.z, d.R, d.seed); });
  const uRim = ids.map((id) => new THREE.Vector2(BLOB_DIPS[id].rim, 0));
  const uCanal = { value: new THREE.Vector4(0, 0, 0, -1) };
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    shader.uniforms.uDipBlob = { value: uBlob };
    shader.uniforms.uDipRim = { value: uRim };
    shader.uniforms.uDipCanal = uCanal;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDipW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDipW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vDipW;
uniform vec4 uDipBlob[${ids.length}]; uniform vec2 uDipRim[${ids.length}]; uniform vec4 uDipCanal;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
if (vDipW.y < 0.05) {
  for (int i = 0; i < ${ids.length}; i++) {
    if (uDipRim[i].y < 0.5) continue;
    vec4 d = uDipBlob[i];
    vec2 q = vDipW.xz - d.xy;
    float a = atan(-q.y, q.x);
    float e = d.z * (1.0 + 0.16 * sin(a * 2.0 + d.w) + 0.09 * sin(a * 3.0 + d.w * 2.3) + 0.05 * sin(a * 5.0 + d.w * 0.7));
    float ur = uDipRim[i].x + 0.05 * sin(a * 7.0 + d.w * 3.0) + 0.03 * sin(a * 13.0 + d.w);
    if (length(q) < e * (ur + ${(FADE * 0.5).toFixed(3)})) discard;
  }
  if (uDipCanal.w > 0.0 && vDipW.x > uDipCanal.x && vDipW.x < uDipCanal.y && abs(vDipW.z - uDipCanal.z) < uDipCanal.w) discard;
}`);
  };
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => prevKey() + '-dips1';
  mat.needsUpdate = true;
  const prevBR = ground.onBeforeRender;
  ground.onBeforeRender = function (...args) {
    if (prevBR) prevBR.apply(this, args);
    refreshActive();
    ids.forEach((id, i) => { uRim[i].y = ACTIVE[id] ? 1 : 0; });
    if (CANAL) uCanal.value.set(CANAL.minX, CANAL.maxX, CANAL.z, CANAL.half - 0.02);
  };
}

// ---------------------------------------------------------------- meshes
let EARTH_MAT = null;
function earthMaterial() {
  if (EARTH_MAT) return EARTH_MAT;
  const m = getTiledMaterial('ground', { repeatX: 1, repeatY: 1, vertexColors: true }).clone();
  m.name = 'dip_earth';
  m.aoMap = null;
  m.color.setScalar(1.7); // same lift as farmSites vcMat: the scan is mid-grey, the vertex colours carry the value
  m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; // the flat outer ring wins over the ground plane
  EARTH_MAT = m;
  return m;
}
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const C = (h) => new THREE.Color(h);
const MUD = { bed: C(0x3c3324), wet: C(0x4f4231), damp: C(0x6e5d44), dry: C(0x8a7858), silt: C(0xa39a82), edge: C(0x847a58), grass: C(0x6f7a46) };

/**
 * Bank mesh for one blob dip, in the dip's LOCAL frame (add it to a group positioned at the dip centre).
 * Polar grid: under-water rings, bank rings spaced up to the wobbling rim, a flat fade ring over the hole edge.
 * Colours: dark wet mud at the waterline, a pale broken silt line just above it (old high-water mark), damp then
 * dry cracked earth up the bank, fading to a grassy ground tone at the outside. Per-vertex noise everywhere.
 */
export function createDipBank(id, extraGeos = []) {
  const d = BLOB_DIPS[id];
  const S = d.segs;
  const rings = [0.25, 0.5, 0.7, 0.82, 0.9, 0.95, 1.0, 'b0.12', 'b0.25', 'b0.42', 'b0.6', 'b0.8', 'b1', 'f0.5', 'f1'];
  const pos = [0, d.bed, 0], col = [], uv = [], idx = [];
  const push = (x, y, z, c, n) => {
    const v = 0.86 + 0.24 * n;
    col.push(c.r * v, c.g * v, c.b * v);
    uv.push((x + d.x) / 5 + 0.4, -(z + d.z) / 5 + 0.4); // same world-metre mapping as the ground plane (5 m tile), so the earth grain lines up
  };
  push(0, d.bed, 0, MUD.bed, 0.5);
  const silt = (a) => 0.16 + 0.08 * Math.sin(a * 9 + d.seed) + 0.05 * Math.sin(a * 23);
  for (const r of rings) {
    for (let i = 0; i < S; i++) {
      const a = (i / S) * Math.PI * 2;
      const e = d.R * blobEdge(a, d.seed), ur = rimU(d, a);
      let u;
      if (typeof r === 'number') u = r;
      else if (r[0] === 'b') u = 1 + (ur - 1) * parseFloat(r.slice(1));
      else u = ur + FADE * parseFloat(r.slice(1)) * (r === 'f1' ? 0.75 + 0.5 * hash(a * 3.1, d.seed) : 1); // ragged outer edge, never a scaled copy of the rim
      const x = Math.cos(a) * e * u, z = -Math.sin(a) * e * u;
      let y = blobProfile(d, u, a);
      if (u >= ur) y = LIFT;
      const n = hash(x + d.x, z + d.z);
      const t = u <= 1 ? 0 : (u - 1) / (ur - 1); // 0 waterline .. 1 bank top
      let c;
      if (u < 1) c = MUD.bed.clone().lerp(MUD.wet, sstep((u - 0.6) / 0.4));
      else if (u >= ur) c = MUD.edge.clone().lerp(MUD.grass, Math.min(1, (u - ur) / FADE) * (0.55 + 0.4 * n));
      else {
        c = MUD.wet.clone().lerp(MUD.damp, sstep(t / 0.45)).lerp(MUD.dry, sstep((t - 0.4) / 0.5));
        const s = Math.abs(t - silt(a)); // broken pale silt band, the old high-water mark
        if (s < 0.07 && n > 0.25) c.lerp(MUD.silt, 0.55 * (1 - s / 0.07));
      }
      pos.push(x, y, z);
      push(x, y, z, c, n);
    }
  }
  for (let i = 0; i < S; i++) idx.push(0, 1 + i, 1 + ((i + 1) % S));
  for (let r = 1; r < rings.length; r++) {
    const a0 = 1 + (r - 1) * S, b0 = 1 + r * S;
    for (let i = 0; i < S; i++) { const i1 = (i + 1) % S; idx.push(a0 + i, b0 + i, a0 + i1, a0 + i1, b0 + i, b0 + i1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Extra non-indexed position/normal/color/uv geometry (ghat steps, stones, pebbles) rides in the same draw call.
  const geo = extraGeos.length ? mergeGeometries([g.toNonIndexed(), ...extraGeos]) : g;
  const mesh = new THREE.Mesh(geo, earthMaterial());
  mesh.name = `${id}_dip`;
  mesh.receiveShadow = true;
  BANK_MESH[id] = mesh;
  return mesh;
}

/**
 * Collider strips [cx, cz, w, d] (dip-local) that stay INSIDE the water outline at u <= uMax, so the player can
 * walk down the bank to the waterline but not out into the pond. Same [cx,cz,w,d] form as farmSites discSolids.
 */
export function blobSolids(id, uMax = 0.9, strip = 1.0) {
  const d = BLOB_DIPS[id], out = [];
  const inside = (x, z) => { const a = Math.atan2(-z, x); return Math.hypot(x, z) < d.R * blobEdge(a, d.seed) * uMax; };
  const extent = (z, dir) => { let x = 0; while (inside(x + dir * 0.1, z)) x += dir * 0.1; return x; };
  const lim = d.R * 1.3;
  for (let z = -lim; z < lim; z += strip) {
    if (!inside(0, z) || !inside(0, z + strip)) continue;
    const xl = Math.max(extent(z, -1), extent(z + strip, -1), extent(z + strip / 2, -1));
    const xr = Math.min(extent(z, 1), extent(z + strip, 1), extent(z + strip / 2, 1));
    if (xr - xl > 0.3) out.push([(xl + xr) / 2, z + strip / 2, xr - xl, strip]);
  }
  return out;
}

/**
 * Canal trench: a cement-lined trapezoid between the two raised banks, with ramped ends. Built in WORLD
 * coordinates on the cached 'concrete' vertex-colour material, indexed, position/normal/uv/color, so
 * src/canal.js's mergeGroupByMaterial folds it into the bridge deck's draw call (no new draw call).
 * Panel joints are modelled: a pair of close columns every 3 m carries a dark joint line.
 */
export function createCanalTrench() {
  const c = CANAL;
  const xs = [c.minX - 0.3];
  for (let x0 = c.minX; x0 < c.maxX - 0.01; x0 += 3) {
    for (const o of [0, 0.05, 0.12, 1.0, 2.0, 2.88, 2.95]) if (x0 + o < c.maxX) xs.push(x0 + o);
  }
  xs.push(c.maxX, c.maxX + 0.3);
  const dzs = [-3.3, -c.half, -2.75, -2.5, -2.3, -2.1, -1.85, -c.toe, -0.8, 0, 0.8, c.toe, 1.85, 2.1, 2.3, 2.5, 2.75, c.half, 3.3];
  const pos = [], col = [], uv = [], idx = [];
  const DRY = C(0x9a9484), WET = C(0x56533f), MOSS = C(0x4f5a36), SILT = C(0x4d4431), STAIN = C(0x7a705a);
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const local = ((x - c.minX) % 3 + 3) % 3;
    const joint = local < 0.06 || local > 2.94;
    const panel = 0.9 + 0.2 * hash(Math.floor((x - c.minX) / 3), 7.3); // per-panel tone: each slab poured on a different day
    for (const dz of dzs) {
      const z = c.z + dz, ad = Math.abs(dz);
      let y = canalProfile(x, z);
      if (ad > c.half - 0.001 || x < c.minX || x > c.maxX) y = 0.01;
      const n = hash(x, z);
      const wetLine = c.water + 0.1 + 0.06 * Math.sin(x * 1.7 + dz) + 0.04 * Math.sin(x * 4.3); // irregular damp tide mark above the water
      let col3;
      if (ad <= c.toe + 0.01) col3 = SILT.clone();
      else if (y < c.water - 0.05) col3 = MOSS.clone().lerp(WET, n);
      else if (y < wetLine) col3 = WET.clone().lerp(MOSS, 0.4 * n);
      else col3 = DRY.clone().lerp(STAIN, 0.3 * n + 0.5 * Math.max(0, 1 - (y - wetLine) / 0.3) + 0.25 * Math.max(0, Math.sin(x * 0.9 + 1.7) * Math.sin(x * 2.3))); // dirt drying down from the old water level, streaky along the run
      let v = panel * (0.9 + 0.18 * n);
      if (joint && ad > c.toe && ad < c.half) v *= 0.55;
      pos.push(x, y, z);
      col.push(col3.r * v, col3.g * v, col3.b * v);
      uv.push(x / 1.5, (dz + Math.sign(dz) * Math.max(0, y)) / 1.5);
    }
  }
  const W = dzs.length;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < W - 1; j++) {
    const a = i * W + j, b = (i + 1) * W + j;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('uv2', new THREE.Float32BufferAttribute(uv, 2)); // textured boxes carry uv2 (aoMap); same attribute set so the merge accepts it
  g.setIndex(idx);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(Math.floor(W / 2)) < 0) { // keep the lining facing up
    for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
    g.setIndex(idx); g.computeVertexNormals();
  }
  const mesh = new THREE.Mesh(g, getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
  mesh.name = 'canal_trench';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}
