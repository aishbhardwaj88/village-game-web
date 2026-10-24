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
  const gp = geometry.attributes.position, cArr = new Float32Array(gp.count * 3);
  const cx0 = FIELD_CENTER.x - FIELD_SIZE.x / 2 + FIELD_SIZE.x * (x0 + x1) / 2;
  for (let i = 0; i < gp.count; i++) {
    const wx = cx0 + gp.getX(i), wz = FIELD_CENTER.z - gp.getY(i);
    const fx = (wx - (FIELD_CENTER.x - FIELD_SIZE.x / 2)) / FIELD_SIZE.x;
    let t = [1, 1, 1];
    if (fx >= STUBBLE_FRAC && fx <= 0.67) {
      const k = plotKind(wx, wz);
      t = k === 'sarson' ? [1.8, 2.95, 0.2] : k === 'wheat_young' ? [0.6, 1.9, 0.5] : k === 'wheat_gold' ? [1.4, 1.75, 0.7] : k === 'ploughed' ? [0.8, 0.62, 0.5] : [0.8, 1.3, 0.6];
    } else if (fx > 0.67) t = [0.85, 1.35, 0.6];
    const n = 0.9 + 0.2 * (0.5 + 0.5 * Math.sin(wx * 0.9 + wz * 1.3) * Math.cos(wz * 0.7 - wx * 0.5));
    cArr[i * 3] = t[0] * n; cArr[i * 3 + 1] = t[1] * n; cArr[i * 3 + 2] = t[2] * n;
  }
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
const PLOT_KINDS = ['sarson', 'wheat_young', 'wheat_gold', 'sarson', 'ploughed', 'wheat_young', 'sarson', 'wheat_gold', 'veg', 'sarson', 'wheat_gold', 'wheat_young'];
function plotKind(rx, rz) {
  const wob = Math.sin(rz * 0.21) * 2.2 + Math.sin(rx * 0.17) * 1.6;
  const ix = Math.floor((rx + wob + 40) / 22), iz = Math.floor((rz + wob * 0.6 + 70) / 20);
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
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  material.name = 'crop';
  const mesh = new THREE.InstancedMesh(geometry, material, cols * rows);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.name = 'crop_rows';
  mesh.userData.groundLevel = true; // every instance sits at ground level — see tools/screenshot.js

  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  let index = 0;
  for (let r = 0; r < rows; r++) {
    const rz = FIELD_CENTER.z - halfZ + r * between;
    for (let k = 0; k < cols; k++) {
      const rx = FIELD_CENTER.x - halfX + k * along + (r % 2) * 0.35;
      // West third: harvested wheat stubble (MAP.md). East third: sabzi beds in bands of rows with a bare path between.
      const fx = (rx - (FIELD_CENTER.x - halfX)) / (halfX * 2);
      const stubble = fx < 0.33;
      const sabziZone = fx > 0.67;
      if (sabziZone && r % 4 === 3) continue; // walking path between sabzi beds
      const kind = stubble || sabziZone ? null : plotKind(rx, rz);
      if (kind === 'ploughed') continue; // bare furrowed earth (ground shader draws the furrows)
      const sabzi = sabziZone || kind === 'veg';
      // A real clearing around the mango baagh (src/baagh.js) — otherwise tufts would clip through trunks/canopies.
      if (Math.hypot(rx - BAAGH_CENTER.x, rz - BAAGH_CENTER.z) < BAAGH_CLEARING_RADIUS) continue;
      if (inKeepOut(rx, rz)) continue; // no crop standing in the tubewell naali / any water footprint
      const j = Math.sin(rx * 12.9 + rz * 7.1);
      dummy.position.set(rx + j * 0.12, 0, rz + Math.cos(rx * 5.3 + rz * 3.7) * 0.1);
      dummy.rotation.y = j * 3;
      const sc = 0.85 + 0.35 * (0.5 + 0.5 * Math.sin(rx * 3.1 - rz * 2.3));
      const lush = kind === 'sarson' ? 1.25 : 1;
      dummy.scale.set(sc * lush, sc * (stubble ? 0.22 : sabzi ? 0.7 : kind === 'wheat_young' ? 0.55 : kind === 'sarson' ? 1.15 : 1), sc * lush);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (stubble) c.setRGB(1.2, 1.05, 0.62);
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
  return mesh;
}

export function buildField(scene) {
  const group = new THREE.Group();
  group.name = 'field';
  group.add(buildFieldGround(0, STUBBLE_FRAC, STRAW_GROUND, 'field_ground_stubble'));
  group.add(buildFieldGround(STUBBLE_FRAC, 1, FIELD_GOLD, 'field_ground'));
  group.add(buildCropRows());
  group.add(buildTrack());
  const verge = buildTrackVerge();
  if (verge) group.add(verge);
  scene.add(group);
  return group;
}
