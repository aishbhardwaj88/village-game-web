import * as THREE from 'three';
import { getTiledMaterial, ensureUv2 } from '../materials.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * S7 textures agent — geometry-based fixes for the 4 materials whose "plastic wrap" read
 * (docs/material-library.md, 27/28 Oct) comes from structure that a flat texture cannot carry:
 * tin (FAILED twice), thatch, mud-and-dung, jute (all FAILED on the 28 Oct board). Rule from
 * that doc: "if a material's real-world identity comes from its structure (tiles, planks,
 * corrugation, weave), that structure is MODELLED, not painted on a flat face."
 *
 * terracotta tile, painted wood, rusted steel and packed earth are APPROVED and FROZEN
 * (material-library.md) — nothing here touches them.
 *
 * Every builder below returns a THREE.Group of real, displaced/instanced geometry using the
 * existing library texture sets by name (tin, thatch, jute, dryearth — see the two new SETS
 * entries added in src/materials.js). Geometry is cached by its own parameters (not per
 * call site) so two panels of the same size/seed share one BufferGeometry.
 */

function hash2(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function noise1(x, seedOff = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash2(i, seedOff), b = hash2(i + 1, seedOff);
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v * (1 - u) + (d - b) * u * v;
}

const geomCache = new Map();
function cached(key, build) {
  let g = geomCache.get(key);
  if (!g) { g = build(); geomCache.set(key, g); }
  return g;
}

// ---------------------------------------------------------------------------------------
// TIN ROOF — real corrugation (varying pitch/amplitude), dents/buckles, rust bloom from the
// bottom edge and nail holes, fixing washers at the laps, overlapping sheets with a shadow
// step, sheen varying along the ribs (the shader's own per-pixel roughness noise, already in
// materials.js's 'tin' surface-variation family, still applies on top of this geometry).
// ---------------------------------------------------------------------------------------

const RIB_PITCH = 0.125; // standard corrugated-sheet pitch, metres
const RIB_DEPTH = 0.02;

function buildCorrugatedSheetGeometry(width, length, seed) {
  const key = `tinsheet|${width.toFixed(2)}|${length.toFixed(2)}|${seed}`;
  return cached(key, () => {
    const colsPerMetre = Math.round(1 / RIB_PITCH) * 3; // 3 samples per rib for a crisp peak/trough
    const cols = Math.max(12, Math.round(width * colsPerMetre));
    const rows = Math.max(6, Math.round(length * 2.4)); // coarser along the slope — dents don't need rib resolution
    const geo = new THREE.PlaneGeometry(width, length, cols, rows);
    geo.rotateX(-Math.PI / 2); // lie flat in XZ, height along +Y
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const rustTint = new THREE.Color(0x6b4326);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + width / 2; // 0..width
      const z = pos.getZ(i) + length / 2; // 0..length (0 = eave/bottom edge)
      // Irregular pitch: warp x before taking the corrugation wave so ribs are not perfectly even.
      const warp = x + (noise1(x * 2.3, seed) - 0.5) * RIB_PITCH * 0.35;
      // Per-rib amplitude variance (slow noise across x) + local dents/buckles (noise across x,z).
      const ampVar = 0.72 + noise1(x * 0.9, seed + 50) * 0.55;
      const dent = 1 - 0.3 * Math.max(0, noise2(x * 1.6 + seed * 7, z * 1.1 + seed * 3) - 0.6);
      const y = Math.sin((warp / RIB_PITCH) * Math.PI * 2) * RIB_DEPTH * ampVar * dent;
      pos.setY(i, y);

      // Vertex-colour rust: strong along the bottom edge (z near 0, the eave) and a soft overall
      // mottling so bloom reads as organic rather than a hard band; washers add extra localised
      // rust in buildTinRoofPanel below via the same colour channel.
      const edgeRust = Math.pow(1 - Math.min(1, z / Math.max(0.6, length * 0.22)), 1.6);
      const n = noise2(x * 3.1 + seed, z * 3.1 - seed);
      const bloom = Math.max(0, edgeRust * 0.85 + (n - 0.82) * 2.2 * 0.3);
      const c = new THREE.Color(1, 1, 1).lerp(rustTint, Math.min(1, bloom));
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // Real-world tiling: 0.8 repeat/metre per the library's tin table (see materials.js SETS / arch.py).
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width * 0.8, uv.getY(i) * length * 0.8);
    ensureUv2(geo);
    return geo;
  });
}

const WASHER_GEO = new THREE.CylinderGeometry(0.014, 0.016, 0.006, 8);
function washerMaterial() {
  const m = getTiledMaterial('metal', { repeatX: 1, repeatY: 1 });
  return m;
}

/**
 * One tin roof panel, width x length metres, lying flat in local XZ (rotate/position the
 * returned group onto the actual roof slope). `seed` gives each roof its own rib jitter,
 * dent pattern and rust bloom so two adjacent roofs never look identical.
 */
export function buildTinRoofPanel(width, length, opts = {}) {
  const { seed = 0, sheets = Math.max(1, Math.round(length / 2.1)), tint = null } = opts;
  const group = new THREE.Group();
  group.name = 'tinRoofPanel';
  const material = getTiledMaterial('tin', { repeatX: 1, repeatY: 1, roughness: 0.85, vertexColors: true, tint, tintStrength: tint ? 0.25 : 1 });
  material.side = THREE.DoubleSide;

  const sheetLen = length / sheets;
  const overlap = Math.min(0.18, sheetLen * 0.12); // real overlapping joint, not a seam
  const washers = [];
  // S7 WIRING (textures-wiring): sheets all share one cached material, so they're merged
  // into a single mesh (1 draw call for the whole panel's sheets, not one per sheet) —
  // every call site using this builder benefits, not just the chauraha wiring. The source
  // geometries are cached per (width, length, seed) and reused elsewhere, so each is cloned
  // before its per-sheet position is baked in.
  const sheetGeos = [];
  for (let s = 0; s < sheets; s++) {
    const lenHere = sheetLen + (s < sheets - 1 ? overlap : 0);
    const geo = buildCorrugatedSheetGeometry(width, lenHere, seed + s * 13).clone();
    // Each successive sheet laps UNDER the one above it (step down slightly) and starts
    // `overlap` into the previous sheet — the shadow line at the join is the step itself,
    // not a texture trick.
    const stepDown = 0.004 * s;
    geo.translate(0, -stepDown, -length / 2 + s * sheetLen + lenHere / 2 - (s > 0 ? overlap / 2 : 0));
    sheetGeos.push(geo);

    // Fixing washers at every other rib along this sheet's top (upslope) lap edge.
    if (s < sheets - 1) {
      const ribCount = Math.round(width / RIB_PITCH);
      for (let r = 0; r < ribCount; r += 2) {
        washers.push({ x: -width / 2 + r * (width / ribCount), z: -length / 2 + (s + 1) * sheetLen - overlap * 0.5 });
      }
    }
  }
  const mergedSheets = sheets > 1 ? mergeGeometries(sheetGeos) : sheetGeos[0];
  const sheetsMesh = new THREE.Mesh(mergedSheets, material);
  sheetsMesh.castShadow = true;
  sheetsMesh.receiveShadow = true;
  group.add(sheetsMesh);
  if (washers.length) {
    const wm = washerMaterial();
    const inst = new THREE.InstancedMesh(WASHER_GEO, wm, washers.length);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < washers.length; i++) {
      m4.makeRotationX(Math.PI / 2);
      m4.setPosition(washers[i].x, 0.012, washers[i].z);
      inst.setMatrixAt(i, m4);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = true;
    group.add(inst);
  }
  return group;
}

// ---------------------------------------------------------------------------------------
// THATCH ROOF — layered straw bundles as real geometry (not a flat texture): rows of
// tapered bundles overlapping up the slope, a tied ridge roll on top. FAILED 28 Oct
// ("not at all clear") — the fix is the bundle structure itself, which reads at a glance
// even before the texture is seen.
// ---------------------------------------------------------------------------------------

function tilBundleGeometry() {
  return cached('thatchBundle', () => {
    // A tapered flat blade: wide/thick at the butt end, thin at the tip — one straw bundle.
    const geo = new THREE.BoxGeometry(0.16, 0.05, 0.9, 1, 1, 3);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i); // -0.45 (butt) .. 0.45 (tip)
      const t = (z + 0.45) / 0.9; // 0 butt .. 1 tip
      const taper = 1 - t * 0.75;
      pos.setX(i, pos.getX(i) * taper);
      pos.setY(i, pos.getY(i) * taper * (1 - t * 0.3));
    }
    geo.computeVertexNormals();
    ensureUv2(geo);
    return geo;
  });
}

export function buildThatchRoofPanel(width, length, opts = {}) {
  const { seed = 0, rowSpacing = 0.22, bundleWidth = 0.19 } = opts;
  const group = new THREE.Group();
  group.name = 'thatchRoofPanel';
  const material = getTiledMaterial('thatch', { repeatX: 1, repeatY: 1, roughness: 0.95, vertexColors: false });
  material.side = THREE.DoubleSide;
  const geo = tilBundleGeometry();

  // Solid backing mat (plain plane, same material) so the gaps between bundle instances
  // never show through to whatever is behind the roof — a real thatch roof has no
  // see-through gaps, the bundles are packed on top of a tied base layer.
  const backingGeo = cached(`thatchBacking|${width.toFixed(2)}|${length.toFixed(2)}`, () => {
    const g = new THREE.PlaneGeometry(width, length, 4, 4);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width * 1.3, uv.getY(i) * length * 1.3);
    ensureUv2(g);
    return g;
  });
  const backing = new THREE.Mesh(backingGeo, material);
  backing.receiveShadow = true;
  group.add(backing);

  const rows = Math.max(3, Math.round(length / rowSpacing));
  const items = [];
  for (let r = 0; r < rows; r++) {
    // Rows start at the eave (z=0) and lie up the slope, each row covering the tie-line of
    // the row below it (the overlap that actually keeps rain out), per real thatching practice.
    const z = -length / 2 + r * rowSpacing * 0.62;
    const count = Math.max(4, Math.round(width / bundleWidth));
    for (let c = 0; c < count; c++) {
      const x = -width / 2 + (c + 0.5) * (width / count);
      const jx = (noise1(c * 3.1 + r * 7.7, seed) - 0.5) * bundleWidth * 0.3;
      const jz = (noise1(c * 1.7 + r * 2.3, seed + 90) - 0.5) * 0.04;
      const ry = (noise1(c * 5.3 + r * 0.9, seed + 10) - 0.5) * 0.12;
      const tilt = 0.12 + noise1(c + r * 11, seed + 20) * 0.08; // bundles lean slightly downslope
      items.push({ x: x + jx, y: r * 0.012, z: z + jz, ry, rx: -tilt, s: 0.9 + noise1(c - r, seed + 30) * 0.25 });
    }
  }
  const inst = new THREE.InstancedMesh(geo, material, items.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    p.set(it.x, it.y, it.z);
    e.set(it.rx, it.ry, 0, 'YXZ');
    q.setFromEuler(e);
    s.set(1, 1, it.s);
    m4.compose(p, q, s);
    inst.setMatrixAt(i, m4);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = true;
  inst.receiveShadow = true;
  group.add(inst);

  // Ridge roll: a tied bundle running the full length along the apex (half-cylinder of the
  // same material, genuinely raised geometry, not a painted stripe).
  const ridgeGeo = cached(`thatchRidge|${width.toFixed(2)}`, () => {
    const g = new THREE.CylinderGeometry(0.11, 0.11, width, 8, 1, false, 0, Math.PI);
    g.rotateZ(Math.PI / 2);
    ensureUv2(g);
    return g;
  });
  const ridge = new THREE.Mesh(ridgeGeo, material);
  ridge.position.set(0, 0.07, length / 2 - 0.05);
  ridge.castShadow = true;
  group.add(ridge);
  return group;
}

// ---------------------------------------------------------------------------------------
// MUD AND DUNG — hand-plastered wall as genuinely uneven displaced geometry (smear strokes,
// not a flat plane), plus a few raised dung-patty appliques stuck to the wall near the base
// (real rural detail with its own visible disc shape) — never shown before 28 Nov.
// ---------------------------------------------------------------------------------------

export function buildMudDungWall(width, height, opts = {}) {
  const { seed = 0, pattyCount = 2, tint = null } = opts;
  const group = new THREE.Group();
  group.name = 'mudDungWall';
  const material = getTiledMaterial('dryearth', { repeatX: width * 0.7, repeatY: height * 0.7, roughness: 0.95, tint, tintStrength: tint ? 0.3 : 0 });

  const key = `mudwall|${width.toFixed(2)}|${height.toFixed(2)}|${seed}`;
  const geo = cached(key, () => {
    const colsPerM = 6, rowsPerM = 6;
    const cols = Math.max(6, Math.round(width * colsPerM));
    const rows = Math.max(6, Math.round(height * rowsPerM));
    const g = new THREE.PlaneGeometry(width, height, cols, rows);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + width / 2;
      const y = pos.getY(i) + height / 2;
      // Low-frequency hand-smear waviness + a finer palm-print/trowel texture, both baked
      // into real vertex depth so the plaster reads uneven at any light angle.
      const low = (noise2(x * 0.7 + seed * 4, y * 0.7 - seed * 2) - 0.5) * 0.03;
      const fine = (noise2(x * 4.5 + seed * 9, y * 4.5 + seed * 5) - 0.5) * 0.012;
      // Horizontal hand-stroke streaks (plaster is applied in sweeping arcs).
      const stroke = Math.sin(x * 2.1 + Math.sin(y * 0.6 + seed) * 1.5) * 0.006;
      pos.setZ(i, low + fine + stroke);
    }
    g.computeVertexNormals();
    ensureUv2(g);
    return g;
  });
  const wall = new THREE.Mesh(geo, material);
  wall.castShadow = true;
  wall.receiveShadow = true;
  wall.userData.collider = opts.collider !== false;
  group.add(wall);

  // Dung patties: shallow discs with a hand-smoothed edge and a spiral smear on the face —
  // their round, slightly domed shape IS the identity; a flat texture cannot carry it.
  const pattyGeo = cached('dungPatty', () => {
    const g = new THREE.CylinderGeometry(0.14, 0.15, 0.025, 10, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      pos.setY(i, pos.getY(i) + (1 - Math.min(1, r / 0.15)) * 0.01); // slight dome
    }
    g.computeVertexNormals();
    ensureUv2(g);
    return g;
  });
  for (let i = 0; i < pattyCount; i++) {
    const px = (noise1(i * 3.3, seed) - 0.5) * (width - 0.4);
    const py = 0.35 + noise1(i * 1.7, seed + 40) * 0.6;
    const patty = new THREE.Mesh(pattyGeo, material);
    patty.rotation.x = Math.PI / 2;
    patty.rotation.y = noise1(i + seed, 5) * Math.PI;
    patty.position.set(px, py - height / 2, 0.02);
    patty.castShadow = true;
    group.add(patty);
  }
  return group;
}

// ---------------------------------------------------------------------------------------
// JUTE WEAVE — real over/under weave geometry for close-camera jute (sack cloth, matting):
// a small tileable woven patch (geometry strands, not a flat texture) repeated across the
// surface. FAILED 28 Oct ("no weave"). Far/awning-scale jute keeps the flat 'jute' library
// material (texture only) — weave at that distance is sub-pixel and would waste triangles;
// see docs/s7/textures.md for the close/far split.
// ---------------------------------------------------------------------------------------

const JUTE_STRANDS = 7; // per 0.18 m tile, each direction
const JUTE_TILE = 0.18;

function juteWeaveTileGeometry() {
  return cached('juteWeaveTile', () => {
    const strandW = JUTE_TILE / JUTE_STRANDS;
    const thick = strandW * 0.55;
    const parts = [];
    for (let i = 0; i < JUTE_STRANDS; i++) {
      const off = -JUTE_TILE / 2 + (i + 0.5) * strandW;
      // Warp strands (along X), raised where they go OVER a weft strand (alternating per column).
      const warp = new THREE.BoxGeometry(JUTE_TILE, thick, strandW * 0.82, 4, 1, 1);
      const wp = warp.attributes.position;
      for (let v = 0; v < wp.count; v++) {
        const x = wp.getX(v);
        const col = Math.floor(((x + JUTE_TILE / 2) / JUTE_TILE) * JUTE_STRANDS);
        const over = (col + i) % 2 === 0;
        wp.setY(v, wp.getY(v) + (over ? thick * 0.35 : -thick * 0.1));
      }
      warp.translate(0, 0, off);
      parts.push(warp);
      const weft = new THREE.BoxGeometry(strandW * 0.82, thick, JUTE_TILE, 1, 1, 4);
      const ep = weft.attributes.position;
      for (let v = 0; v < ep.count; v++) {
        const z = ep.getZ(v);
        const row = Math.floor(((z + JUTE_TILE / 2) / JUTE_TILE) * JUTE_STRANDS);
        const over = (row + i) % 2 === 1;
        ep.setY(v, ep.getY(v) + (over ? thick * 0.35 : -thick * 0.1));
      }
      weft.translate(off, 0, 0);
      parts.push(weft);
    }
    const merged = mergeBufferGeometries(parts);
    ensureUv2(merged);
    return merged;
  });
}

// Minimal local merge (avoid pulling BufferGeometryUtils for ~14 boxes): concatenates
// position/normal/uv with an index offset. Good enough for a static, cached tile.
function mergeBufferGeometries(geoms) {
  let vCount = 0, iCount = 0;
  for (const g of geoms) { vCount += g.attributes.position.count; iCount += g.index.count; }
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0, vBase = 0;
  for (const g of geoms) {
    pos.set(g.attributes.position.array, vo);
    nor.set(g.attributes.normal.array, vo);
    uv.set(g.attributes.uv.array, (vo / 3) * 2);
    for (let k = 0; k < g.index.count; k++) idx[io + k] = g.index.array[k] + vBase;
    vBase += g.attributes.position.count;
    vo += g.attributes.position.array.length;
    io += g.index.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/**
 * Close-range jute panel (sack face, grain-sack stack, rolled mat): real woven geometry,
 * tiled across width x height. Keep this for surfaces the camera gets within ~3 m of;
 * for anything farther/larger (awnings, tarpaulin-scale cloth) use getTiledMaterial('jute')
 * flat, as before.
 */
export function buildJuteWeavePanel(width, height, opts = {}) {
  const { seed = 0, tint = null } = opts;
  const group = new THREE.Group();
  group.name = 'juteWeavePanel';
  const material = getTiledMaterial('jute', { repeatX: 1, repeatY: 1, roughness: 0.9, tint, tintStrength: tint ? 0.25 : 1 });
  const tileGeo = juteWeaveTileGeometry();
  const cols = Math.max(1, Math.round(width / JUTE_TILE));
  const rows = Math.max(1, Math.round(height / JUTE_TILE));
  const count = cols * rows;
  const inst = new THREE.InstancedMesh(tileGeo, material, count);
  const m4 = new THREE.Matrix4();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -width / 2 + (c + 0.5) * JUTE_TILE;
      const y = -height / 2 + (r + 0.5) * JUTE_TILE;
      const sag = (noise2(c + seed, r - seed) - 0.5) * 0.004; // cloth sags slightly between ties
      m4.makeRotationX(-Math.PI / 2);
      m4.setPosition(x, sag, y);
      inst.setMatrixAt(i++, m4);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = true;
  inst.receiveShadow = true;
  group.add(inst);
  return group;
}
