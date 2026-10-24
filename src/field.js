import * as THREE from 'three';
import { getTiledMaterial, ensureUv2, applyGroundNoiseDetail } from './materials.js';
import { buildStripSegment } from './paths.js';
import { HOUSE_CENTER } from './village.js';
import { getActiveAtmosphere } from './atmosphere.js';
import { mergeMeshList } from './mergeUtils.js';
import { buildGardenPlants, GARDEN_KIND, inKeepOut } from './vegetation.js';
import { BAAGH_CENTER, BAAGH_CLEARING_RADIUS } from './baagh.js';

// South-east of the hero zone lane, per item 3. Track is a closed ~400m loop with one
// spur connecting it back to the lane near the house (see docs/parked.md for why a
// single spur, not two).
export const FIELD_CENTER = { x: 20, z: -20 };
export const FIELD_SIZE = { x: 110, z: 80 };

const TRACK_NW = { x: -40, z: 25 };
const TRACK_NE = { x: 80, z: 25 };
const TRACK_SE = { x: 80, z: -65 };
const TRACK_SW = { x: -40, z: -65 };
const LANE_JOIN = { x: HOUSE_CENTER.x, z: HOUSE_CENTER.z + 7 }; // house courtyard's south edge

// Item 6 (dust motes) reuses the same loop corners, so it drifts along the actual
// track instead of a re-guessed one.
export const TRACK_CORNERS = [TRACK_NW, TRACK_NE, TRACK_SE, TRACK_SW];

const TRACK_WIDTH = 5;
const FIELD_GOLD = 0xc9a24f; // golden wheat/sabzi soil, distinct from the main dirt ground and lane

// Sparse verge planting just outside the track loop (tulsi, marigold).
// One garden-plant draw call; no colliders, kept off the NW spur and the baagh clearing.
function buildTrackVerge() {
  const plants = [];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const corners = [TRACK_NW, TRACK_NE, TRACK_SE, TRACK_SW, TRACK_NW];
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / len, dz = (b.z - a.z) / len;
    const nx = -dz, nz = dx; // outward side: away from the field centre
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const out = Math.sign(nx * (mx - (TRACK_NW.x + TRACK_NE.x) / 2) + nz * (mz - (TRACK_NW.z + TRACK_SE.z) / 2)) || 1;
    for (let t = 4; t < len - 4; t += 3 + rnd() * 4) {
      const off = (TRACK_WIDTH / 2 + 1.6 + rnd() * 0.8) * out;
      const x = a.x + dx * t + nx * off, z = a.z + dz * t + nz * off;
      if (Math.hypot(x - BAAGH_CENTER.x, z - BAAGH_CENTER.z) < BAAGH_CLEARING_RADIUS + 3) continue;
      const r = rnd();
      const kind = r < 0.5 ? GARDEN_KIND.TULSI : GARDEN_KIND.MARIGOLD;
      plants.push({ x, z, y: 0, kind, scale: 0.9 + rnd() * 0.3 });
    }
  }
  // Banana clumps and bougainvillea at the loop's corners, where field bunds meet: the farm edge
  // reads as tended, not bare. Same garden-plant call, nothing added to the draw count.
  for (const c of corners.slice(0, 4)) {
    const sx = Math.sign(c.x - FIELD_CENTER.x), sz = Math.sign(c.z - FIELD_CENTER.z);
    for (let k = 0; k < 3; k++) {
      const x = c.x + sx * (TRACK_WIDTH / 2 + 2.5 + rnd() * 2.5), z = c.z + sz * (TRACK_WIDTH / 2 + 1.5 + rnd() * 3);
      if (Math.hypot(x - BAAGH_CENTER.x, z - BAAGH_CENTER.z) < BAAGH_CLEARING_RADIUS + 3) continue;
      plants.push({ x, z, y: 0, kind: k === 2 ? GARDEN_KIND.BOUGAINVILLEA : GARDEN_KIND.BANANA, scale: 1 + rnd() * 0.3 });
    }
  }
  const greens = buildGardenPlants(plants);
  if (greens) greens.name = 'field_track_verge';
  return greens;
}

function buildTrack() {
  // Task 2 (draw-call budget) — all 5 segments share the same tint, and
  // buildStripSegment now bakes its own repeat/tint into the geometry (see
  // paths.js), so they merge into one mesh instead of 5.
  const corners = [TRACK_NW, TRACK_NE, TRACK_SE, TRACK_SW, TRACK_NW];
  const segments = [];
  for (let i = 0; i < corners.length - 1; i++) {
    segments.push(buildStripSegment(corners[i], corners[i + 1], TRACK_WIDTH, { seed: 3.0 + i, tint: 0xa88a5e, ruts: true }));
  }
  // 2026-10-21 (house rebuild): the old straight LANE_JOIN->TRACK_NW diagonal ran straight through
  // the house compound's courtyard. Drawn instead as two legs outside its walls — east along the
  // lane (z=47.5, just south of the gate wall), then north along x=-36 up to the track corner:
  // the same route tools/world-validator.js's BAAGH_CHAIN already walks.
  const spurZ = LANE_JOIN.z + 1.5;
  segments.push(buildStripSegment({ x: LANE_JOIN.x, z: spurZ }, { x: -36, z: spurZ }, TRACK_WIDTH, { seed: 9.0, tint: 0xa88a5e, ruts: true }));
  segments.push(buildStripSegment({ x: -36, z: spurZ }, TRACK_NW, TRACK_WIDTH, { seed: 10.0, tint: 0xa88a5e, ruts: true }));
  return mergeMeshList(segments, 'field_track');
}

// West third (stubble) gets a paler straw-coloured ground; the rest keeps the golden soil.
const STUBBLE_FRAC = 0.33;
const STRAW_GROUND = 0xe3cf94;

function buildFieldGround(x0, x1, tint, name) {
  const width = FIELD_SIZE.x * (x1 - x0);
  const segX = Math.max(1, Math.round(width / 2.2)), segZ = Math.round(FIELD_SIZE.z / 2.2);
  const geometry = ensureUv2(new THREE.PlaneGeometry(width, FIELD_SIZE.z, segX, segZ));
  // Per-vertex canopy tint: the ground under each plot carries the crop colour (flowering mustard yellow, green wheat...) so the field reads as a
  // continuous crop carpet from a distance. Values above 1 are intentional (the dark scanned soil needs overdriving). No extra draw call.
  const gp = geometry.attributes.position, cArr = new Float32Array(gp.count * 3), bund = new Uint8Array(gp.count);
  const cx0 = FIELD_CENTER.x - FIELD_SIZE.x / 2 + FIELD_SIZE.x * (x0 + x1) / 2;
  for (let i = 0; i < gp.count; i++) {
    const wx = cx0 + gp.getX(i), wz = FIELD_CENTER.z - gp.getY(i);
    const fx = (wx - (FIELD_CENTER.x - FIELD_SIZE.x / 2)) / FIELD_SIZE.x;
    let t = [1, 1, 1];
    const outer = fx < STUBBLE_FRAC || fx > 0.67;
    if (outer) { // the outer thirds are divided by bunds too, and each plot has its own soil tone (stubble ages, sabzi beds)
      const [a0, a1] = plotCell(wx, wz), [b0, b1] = plotCell(wx + 1.2, wz + 1.2), [c0, c1] = plotCell(wx - 1.2, wz - 1.2);
      if (a0 !== b0 || a1 !== b1 || a0 !== c0 || a1 !== c1) { gp.setZ(i, 0.14 + 0.05 * Math.sin(wx * 1.7 + wz * 2.3)); bund[i] = 1; }
      const v = outerVariant(wx, wz);
      t = fx < STUBBLE_FRAC ? [[1, 1, 1], [1.12, 1.06, 0.9], [0.72, 0.62, 0.5], [0.82, 0.76, 0.66]][v] : [[0.85, 1.35, 0.6], [0.7, 1.1, 0.5], [0.8, 0.66, 0.52], [0.95, 1.5, 0.65]][v];
    } else {
      // Bund: where the plot cell changes within ~1.2 m, raise a low earthen ridge in drier, paler soil (khets are divided by bunds, not
      // painted blocks). Rides on the ground vertices, so no extra draw call.
      const [a0, a1] = plotCell(wx, wz), [b0, b1] = plotCell(wx + 1.2, wz + 1.2), [c0, c1] = plotCell(wx - 1.2, wz - 1.2);
      if (a0 !== b0 || a1 !== b1 || a0 !== c0 || a1 !== c1) { gp.setZ(i, 0.14 + 0.05 * Math.sin(wx * 1.7 + wz * 2.3)); bund[i] = 1; }
      const k = plotKind(wx, wz);
      t = k === 'sarson' ? [1.8, 2.95, 0.2] : k === 'wheat_young' ? [0.6, 1.9, 0.5] : k === 'wheat_gold' ? [1.4, 1.75, 0.7] : k === 'ploughed' ? [0.8, 0.62, 0.5] : [0.8, 1.3, 0.6];
    }
    const n = 0.9 + 0.2 * (0.5 + 0.5 * Math.sin(wx * 0.9 + wz * 1.3) * Math.cos(wz * 0.7 - wx * 0.5));
    if (bund[i]) t = [1.25, 1.0, 0.7];
    cArr[i * 3] = t[0] * n; cArr[i * 3 + 1] = t[1] * n; cArr[i * 3 + 2] = t[2] * n;
  }
  geometry.computeVertexNormals();
  geometry.setAttribute('color', new THREE.BufferAttribute(cArr, 3));
  const material = getTiledMaterial('ground', {
    repeatX: width / 5,
    repeatY: FIELD_SIZE.z / 5,
    tint,
    roughness: 1,
    vertexColors: true,
  });
  applyGroundNoiseDetail(material, {
    patchContrast: getActiveAtmosphere().groundContrastMultiplier,
    furrows: { spacing: 1.5, originZ: FIELD_CENTER.z - FIELD_SIZE.z / 2 + 2, depth: 0.32 },
  }); // Fix 4/4 (playtest pass) — see materials.js
  if (tint === STRAW_GROUND) material.color.multiplyScalar(1.9); // dark scanned soil needs overdriving to read as dry straw
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(FIELD_CENTER.x - FIELD_SIZE.x / 2 + FIELD_SIZE.x * (x0 + x1) / 2, 0.02, FIELD_CENTER.z);
  mesh.receiveShadow = true;
  mesh.name = name;
  return mesh;
}

/** Patchwork of plots in the middle third (real khets are never one crop): sarson in yellow flower, young green wheat, ripe golden wheat, bare
 * ploughed earth and a small vegetable patch. Deterministic per ~22 x 20 m plot, with the plot edge wobbled so borders are not ruler-straight. */
const PLOT_KINDS = ['sarson', 'wheat_young', 'wheat_gold', 'sarson', 'ploughed', 'cane', 'sarson', 'wheat_gold', 'veg', 'sarson', 'sarson', 'wheat_young'];

/** Shared procedural leaf atlas for the crop meshes (replaces flat vertex colour): left half = blade (dark edge, pale midrib, fine
 * longitudinal veins, base-to-tip fade), right half = cane stalk (fine fibres + dark nodes every ~0.18 v), plus a speckle strip
 * for mustard flower heads in the top rows. Greyscale-ish so the vertex/instance colour still sets the hue. */
let _bladeTex = null;
function bladeAtlas() {
  if (_bladeTex) return _bladeTex;
  const W = 256, H = 256;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W / 2; x++) { // blade half, u = x / 128, v from bottom (y = H - v*H)
    const u = x / (W / 2), mid = 1 - Math.abs(u - 0.5) * 2; // 1 at the midrib, 0 at the edges
    for (let y = 0; y < H; y++) {
      const v = 1 - y / H;
      let b = 0.62 + 0.3 * Math.pow(mid, 0.6) + 0.16 * Math.exp(-Math.pow((u - 0.5) / 0.035, 2));
      b *= 0.78 + 0.22 * v;
      b *= 0.9 + 0.1 * Math.sin(u * 150 + Math.sin(v * 9 + u * 30) * 1.4);
      b *= 0.94 + 0.12 * rnd();
      const k = Math.max(0, Math.min(255, Math.round(b * 255)));
      g.fillStyle = `rgb(${k},${k},${k})`; g.fillRect(x, y, 1, 1);
    }
  }
  for (let x = W / 2; x < W; x++) { // stalk half
    const u = (x - W / 2) / (W / 2);
    for (let y = 0; y < H; y++) {
      const v = 1 - y / H, ring = Math.abs(((v * 5.5) % 1) - 0.02);
      let b = 0.78 + 0.12 * Math.sin(u * 90) + 0.06 * (rnd() - 0.5);
      if (ring < 0.045) b *= 0.5; else if (ring < 0.09) b *= 0.8 + (ring - 0.045) * 4;
      b *= 0.86 + 0.14 * Math.sin(u * Math.PI);
      const k = Math.max(0, Math.min(255, Math.round(b * 255)));
      g.fillStyle = `rgb(${k},${k},${k})`; g.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  _bladeTex = t;
  return t;
}

function plotCell(rx, rz) {
  const wob = Math.sin(rz * 0.21) * 2.2 + Math.sin(rx * 0.17) * 1.6;
  return [Math.floor((rx + wob + 40) / 22), Math.floor((rz + wob * 0.6 + 70) / 20)];
}

/** 0..3 per plot cell in the stubble and sabzi thirds: stubble = normal / tall pale / ploughed bare / burnt-dark; sabzi = leafy / low / bare bed / lush. */
function outerVariant(rx, rz) {
  const [ix, iz] = plotCell(rx, rz);
  return (((ix * 3 + iz * 5 + ix * iz) % 4) + 4) % 4;
}

function plotKind(rx, rz) {
  const [ix, iz] = plotCell(rx, rz);
  return PLOT_KINDS[(((ix * 5 + iz * 7) % PLOT_KINDS.length) + PLOT_KINDS.length) % PLOT_KINDS.length];
}

/** Crop rows as one InstancedMesh of real-looking tufts (ship mode, 2026-10-21: the old 0.18 x 0.55 m boxes on a 3 m grid read as
 * dark fence posts). Each tuft is six thin blades leaning outward, dark at the base and golden-green at the tip; planted in
 * furrows (1 m along the row, 1.5 m between rows) with every third row a greener vegetable (sabzi) row. ~5k instances, 6
 * triangles each, no shadow casting. */
function buildCropRows() {
  const along = 1.15;
  const between = 1.5;
  const halfX = FIELD_SIZE.x / 2 - 2;
  const halfZ = FIELD_SIZE.z / 2 - 2;
  const cols = Math.floor((halfX * 2) / along);
  const rows = Math.floor((halfZ * 2) / between);

  const pos = [];
  const col = [];
  const uv = [];
  const base = new THREE.Color(0x4f5f1f);
  const tipWheat = new THREE.Color(0xd2b84e);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const h = 0.55 + 0.22 * ((i * 37) % 5) / 4;
    const lean = 0.12 + 0.1 * ((i * 17) % 3) / 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const r0 = 0.03;
    // blade: base edge (perpendicular to the lean direction) up to a tip offset outward
    const px = -sa * 0.045, pz = ca * 0.045;
    const bx = ca * r0, bz = sa * r0;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + ca * lean, h, bz + sa * lean);
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, tipWheat.r, tipWheat.g, tipWheat.b);
    uv.push(0, 0, 0.5, 0, 0.25, 1);
  }
  // Four flower / ear spikes per tuft, standing at the top (one triangle each). Cream-gold by default; the per-instance colour turns them
  // saturated mustard yellow (sarson in flower), pale gold (ripe wheat ears) or leaf green (young wheat, sabzi tops).
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.9;
    const ca = Math.cos(a), sa = Math.sin(a);
    const cx = ca * 0.07, cz = sa * 0.07, h0 = 0.62 + 0.08 * (i % 2);
    const px = -sa * 0.05, pz = ca * 0.05;
    pos.push(cx - px, h0, cz - pz, cx + px, h0, cz + pz, cx + ca * 0.02, h0 + 0.17, cz + sa * 0.02);
    for (let k = 0; k < 3; k++) col.push(0.95, 0.8, 0.28);
    uv.push(0, 0, 0.5, 0, 0.25, 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, map: bladeAtlas(), roughness: 1, side: THREE.DoubleSide });
  material.name = 'crop';
  const mesh = new THREE.InstancedMesh(geometry, material, cols * rows);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.name = 'crop_rows';
  mesh.userData.groundLevel = true; // every instance sits at ground level — see tools/screenshot.js

  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  let index = 0;
  const caneSpots = [];
  const sarsonSpots = [];
  for (let r = 0; r < rows; r++) {
    const rz = FIELD_CENTER.z - halfZ + r * between;
    for (let k = 0; k < cols; k++) {
      const rx = FIELD_CENTER.x - halfX + k * along + (r % 2) * 0.35;
      // West third: harvested wheat stubble (MAP.md). East third: sabzi beds in bands of rows with a bare path between.
      const fx = (rx - (FIELD_CENTER.x - halfX)) / (halfX * 2);
      const stubble = fx < 0.33;
      const sabziZone = fx > 0.67;
      if (sabziZone && r % 4 === 3) continue; // walking path between sabzi beds
      const ov = stubble || sabziZone ? outerVariant(rx, rz) : 0;
      if (ov === 2) continue; // a ploughed, bare plot among the stubble / an unsown sabzi bed (ground tint carries it)
      const kind = stubble || sabziZone ? null : plotKind(rx, rz);
      if (kind === 'ploughed') continue; // bare furrowed earth (ground shader draws the furrows)
      if (kind === 'cane') { if (k % 3 !== 2 && !(Math.hypot(rx - BAAGH_CENTER.x, rz - BAAGH_CENTER.z) < BAAGH_CLEARING_RADIUS) && !inKeepOut(rx, rz)) caneSpots.push([rx + Math.sin(rx * 9.1 + rz) * 0.25, rz + Math.cos(rz * 7.3 + rx) * 0.25]); continue; } // sugarcane block: tall clumps, drawn by buildCaneClumps
      const sabzi = sabziZone || kind === 'veg';
      if (kind === 'sarson' && !(Math.hypot(rx - BAAGH_CENTER.x, rz - BAAGH_CENTER.z) < BAAGH_CLEARING_RADIUS) && !inKeepOut(rx, rz)) sarsonSpots.push([rx, rz]);
      // A real clearing around the mango baagh (src/baagh.js) — otherwise tufts would clip through trunks/canopies.
      if (Math.hypot(rx - BAAGH_CENTER.x, rz - BAAGH_CENTER.z) < BAAGH_CLEARING_RADIUS) continue;
      if (inKeepOut(rx, rz)) continue; // no crop standing in the tubewell naali / any water footprint
      const j = Math.sin(rx * 12.9 + rz * 7.1);
      dummy.position.set(rx + j * 0.12, 0, rz + Math.cos(rx * 5.3 + rz * 3.7) * 0.1);
      dummy.rotation.y = j * 3;
      const sc = 0.85 + 0.35 * (0.5 + 0.5 * Math.sin(rx * 3.1 - rz * 2.3));
      const lush = kind === 'sarson' ? 1.25 : 1;
      dummy.scale.set(sc * lush, sc * (stubble ? (ov === 1 ? 0.4 : ov === 3 ? 0.12 : 0.22) : sabzi ? (ov === 1 ? 0.45 : ov === 3 ? 0.95 : 0.7) : kind === 'wheat_young' ? 0.55 : kind === 'sarson' ? 1.15 : 1), sc * lush);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (stubble) c.setRGB(ov === 3 ? 0.55 : 1.2, ov === 3 ? 0.5 : 1.05, ov === 3 ? 0.4 : 0.62);
      else if (sabzi) c.setRGB(0.5 + 0.15 * (r % 4), 1.25, 0.55);
      else if (kind === 'sarson') c.setRGB(1.1 + 0.08 * j, 1.05 + 0.06 * j, 0.35);          // flowering mustard: saturated yellow tops
      else if (kind === 'wheat_young') c.setRGB(0.55 + 0.08 * j, 1.12, 0.55);               // green knee-high wheat
      else c.setRGB(1.0 + 0.1 * j, 0.9 + 0.08 * j, 0.78);                                    // ripe wheat, pale gold ears
      mesh.setColorAt(index, c);
      index++;
    }
  }
  mesh.count = index;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.userData.caneSpots = caneSpots;
  mesh.userData.sarsonSpots = sarsonSpots;
  return mesh;
}

/** Sugarcane blocks inside the khet: ~2.6 m clumps (6 pale-green jointed stalks, arching leaf blades), one InstancedMesh for every cane plot. */
function buildCaneClumps(spots) {
  const pos = [], col = [], uv = [];
  const stalk = new THREE.Color(0x8a9a44), leaf = new THREE.Color(0x4f7a2a), leafTip = new THREE.Color(0x8aa23a);
  const tri = (a, b, c2, ca, cb, cc, stalkUv) => { pos.push(...a, ...b, ...c2); col.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b); uv.push(...(stalkUv ? [0.52, 0, 0.98, 0, 0.75, 1] : [0.02, 0, 0.48, 0, 0.25, 1])); };
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, r = 0.12 + 0.05 * (i % 2), h = 2.3 + 0.12 * ((i * 5) % 4);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, px = -Math.sin(a) * 0.022, pz = Math.cos(a) * 0.022;
    tri([x - px, 0, z - pz], [x + px, 0, z + pz], [x + px * 0.6, h, z + pz * 0.6], stalk.clone().multiplyScalar(0.7), stalk.clone().multiplyScalar(0.7), stalk, true);
    tri([x - px, 0, z - pz], [x + px * 0.6, h, z + pz * 0.6], [x - px * 0.6, h, z - pz * 0.6], stalk.clone().multiplyScalar(0.7), stalk, stalk, true);
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2 * (i % 3), y0 = 1.0 + 0.1 * ((i * 7) % 12), len = 0.9 + 0.08 * ((i * 3) % 6);
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa * 0.05, pz = ca * 0.05;
    const mx = ca * len * 0.55, mz = sa * len * 0.55, tx = ca * len, tz = sa * len;
    tri([ca * 0.1 - px, y0, sa * 0.1 - pz], [ca * 0.1 + px, y0, sa * 0.1 + pz], [mx + px, y0 + len * 0.28, mz + pz], leaf, leaf, leaf);
    tri([ca * 0.1 - px, y0, sa * 0.1 - pz], [mx + px, y0 + len * 0.28, mz + pz], [mx - px, y0 + len * 0.28, mz - pz], leaf, leaf, leaf);
    tri([mx - px, y0 + len * 0.28, mz - pz], [mx + px, y0 + len * 0.28, mz + pz], [tx, y0 + len * 0.1, tz], leaf, leaf, leafTip);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ name: 'cane', vertexColors: true, map: bladeAtlas(), roughness: 0.85, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(g, mat, spots.length);
  mesh.name = 'field_cane';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.userData.groundLevel = true;
  const d = new THREE.Object3D(), c = new THREE.Color();
  spots.forEach(([x, z], i) => {
    const j = Math.sin(x * 12.9 + z * 7.1), k = 0.85 + 0.3 * (0.5 + 0.5 * Math.sin(x * 3.1 - z * 2.3));
    d.position.set(x, 0, z); d.rotation.y = j * 3; d.scale.set(k, 0.85 + 0.3 * (0.5 + 0.5 * Math.cos(x * 1.7 + z)), k); d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    const v = 0.85 + 0.2 * (0.5 + 0.5 * j);
    mesh.setColorAt(i, c.setRGB(v, v, v * 0.92));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** Procedural mustard flower-head card: a raceme of tiny four-petal yellow florets climbing a green stem, buds at the tip, cut out with alpha. */
function sarsonBloomTexture() {
  const W = 128, H = 128;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.clearRect(0, 0, W, H);
  g.strokeStyle = '#4e6a22'; g.lineWidth = 2.5;
  for (let s2 = 0; s2 < 5; s2++) { // five branching racemes
    const x0 = 64 + (s2 - 2) * 14, lean = (s2 - 2) * 9;
    g.beginPath(); g.moveTo(x0, H); g.quadraticCurveTo(x0 + lean * 0.4, H * 0.5, x0 + lean, 14 + (s2 % 2) * 12); g.stroke();
    for (let i = 0; i < 22; i++) {
      const t = i / 21, x = x0 + lean * t * t + (rnd() - 0.5) * 9, y = (14 + (s2 % 2) * 12) + t * 62 + (rnd() - 0.5) * 5;
      const r = 3.6 - t * 1.4, hue = 46 + rnd() * 6;
      g.fillStyle = `hsl(${hue},95%,${52 + rnd() * 8}%)`;
      for (let p = 0; p < 4; p++) { const a = p * Math.PI / 2 + rnd() * 0.5; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.75, r * 0.5, a, 0, 6.3); g.fill(); }
      g.fillStyle = '#8a9a24'; g.beginPath(); g.arc(x, y, 1, 0, 6.3); g.fill();
    }
    g.fillStyle = '#9ab02a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x0 + lean + (rnd() - 0.5) * 6, 10 + (s2 % 2) * 12 + rnd() * 10, 2.2, 0, 6.3); g.fill(); }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Mustard in flower: a dense canopy of alpha-cut flower-head cards (racemes of yellow florets, see sarsonBloomTexture) over the sarson
 * plots (one InstancedMesh, 2 triangles per card) so the plot reads as a yellow carpet from a distance, not isolated sprigs. Stems below
 * are dark green. */
function buildSarsonBloom(spots) {
  const pos = [], col = [], uv = [];
  const stem = new THREE.Color(0x4a6420);
  const push = (pts, cols, uvs) => { pts.forEach((p) => pos.push(...p)); cols.forEach((q) => col.push(q.r, q.g, q.b)); uvs.forEach((q) => uv.push(...q)); };
  const white = new THREE.Color(1, 1, 1);
  for (let i = 0; i < 16; i++) {
    const a = i * 2.399, r = 0.08 + 0.62 * Math.sqrt((i + 0.5) / 16);
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, h = 0.62 + 0.2 * ((i * 7) % 5) / 4;
    const w = 0.3 + 0.06 * (i % 3), t = a + 1.1, hh = 0.34;
    const ux = Math.cos(t) * w, uz = Math.sin(t) * w, tilt = 0.05;
    const A = [cx - ux, h - hh * 0.5, cz - uz], B = [cx + ux, h - hh * 0.5, cz + uz], C = [cx + ux, h + hh * 0.5, cz + uz - tilt], D = [cx - ux, h + hh * 0.5, cz - uz - tilt];
    push([A, B, C], [white, white, white], [[0, 0], [1, 0], [1, 1]]);
    push([A, C, D], [white, white, white], [[0, 0], [1, 1], [0, 1]]);
  }
  for (let i = 0; i < 3; i++) {   // short stem bundles tying the canopy to the ground
    const a = i * 2.1, x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2;
    push([[x - 0.03, 0, z], [x + 0.03, 0, z], [x * 1.4, 0.7, z * 1.4]], [stem.clone().multiplyScalar(0.6), stem.clone().multiplyScalar(0.6), stem], [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5]]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ name: 'sarson', vertexColors: true, map: sarsonBloomTexture(), alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(g, mat, spots.length);
  mesh.name = 'field_sarson';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.userData.groundLevel = true;
  const d = new THREE.Object3D(), c = new THREE.Color();
  spots.forEach(([x, z], i) => {
    const j = Math.sin(x * 12.9 + z * 7.1), k = 1.0 + 0.3 * (0.5 + 0.5 * Math.sin(x * 3.1 - z * 2.3));
    d.position.set(x + j * 0.2, 0, z + Math.cos(x * 5.3 + z * 3.7) * 0.2); d.rotation.y = j * 3; d.scale.set(k, 0.9 + 0.25 * (0.5 + 0.5 * Math.cos(x * 1.7 + z)), k); d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    const v = 0.92 + 0.14 * (0.5 + 0.5 * j);
    mesh.setColorAt(i, c.setRGB(v, v, v * 0.9));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function buildField(scene) {
  const group = new THREE.Group();
  group.name = 'field';
  group.add(buildFieldGround(0, STUBBLE_FRAC, STRAW_GROUND, 'field_ground_stubble'));
  group.add(buildFieldGround(STUBBLE_FRAC, 1, FIELD_GOLD, 'field_ground'));
  const crops = buildCropRows();
  group.add(crops);
  if (crops.userData.caneSpots.length) group.add(buildCaneClumps(crops.userData.caneSpots));
  if (crops.userData.sarsonSpots.length) group.add(buildSarsonBloom(crops.userData.sarsonSpots));
  group.add(buildTrack());
  const verge = buildTrackVerge();
  if (verge) group.add(verge);
  scene.add(group);
  return group;
}
