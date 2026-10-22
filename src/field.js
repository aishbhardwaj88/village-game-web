import * as THREE from 'three';
import { getTiledMaterial, ensureUv2, applyGroundNoiseDetail } from './materials.js';
import { buildStripSegment } from './paths.js';
import { HOUSE_CENTER } from './village.js';
import { getActiveAtmosphere } from './atmosphere.js';
import { mergeMeshList } from './mergeUtils.js';
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
  const geometry = ensureUv2(new THREE.PlaneGeometry(width, FIELD_SIZE.z));
  const material = getTiledMaterial('ground', {
    repeatX: width / 5,
    repeatY: FIELD_SIZE.z / 5,
    tint,
    roughness: 1,
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

/** Crop rows as one InstancedMesh of real-looking tufts (ship mode, 2026-10-21: the old 0.18 x 0.55 m boxes on a 3 m grid read as
 * dark fence posts). Each tuft is six thin blades leaning outward, dark at the base and golden-green at the tip; planted in
 * furrows (1 m along the row, 1.5 m between rows) with every third row a greener vegetable (sabzi) row. ~5k instances, 6
 * triangles each, no shadow casting. */
function buildCropRows() {
  const along = 1.0;
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
      const sabzi = sabziZone || (!stubble && r % 3 === 2);
      // A real clearing around the mango baagh (src/baagh.js) — otherwise tufts would clip through trunks/canopies.
      if (Math.hypot(rx - BAAGH_CENTER.x, rz - BAAGH_CENTER.z) < BAAGH_CLEARING_RADIUS) continue;
      const j = Math.sin(rx * 12.9 + rz * 7.1);
      dummy.position.set(rx + j * 0.12, 0, rz + Math.cos(rx * 5.3 + rz * 3.7) * 0.1);
      dummy.rotation.y = j * 3;
      const sc = 0.85 + 0.35 * (0.5 + 0.5 * Math.sin(rx * 3.1 - rz * 2.3));
      dummy.scale.set(sc, sc * (stubble ? 0.22 : sabzi ? 0.7 : 1), sc);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (stubble) c.setRGB(1.2, 1.05, 0.62);
      else if (sabzi) c.setRGB(0.5 + 0.15 * (r % 4), 1.25, 0.55);
      else c.setRGB(0.92 + 0.1 * j, 0.95 + 0.08 * j, 0.85);
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
  scene.add(group);
  return group;
}
