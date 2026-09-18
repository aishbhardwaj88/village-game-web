import * as THREE from 'three';
import { getTiledMaterial, ensureUv2, applyGroundNoiseDetail } from './materials.js';
import { buildStripSegment } from './paths.js';
import { HOUSE_CENTER } from './village.js';

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

const TRACK_WIDTH = 5;
const FIELD_GOLD = 0xc9a24f; // golden wheat/sabzi soil, distinct from the main dirt ground and lane

function buildTrack() {
  const group = new THREE.Group();
  group.name = 'field_track';
  const corners = [TRACK_NW, TRACK_NE, TRACK_SE, TRACK_SW, TRACK_NW];
  for (let i = 0; i < corners.length - 1; i++) {
    group.add(buildStripSegment(corners[i], corners[i + 1], TRACK_WIDTH, { seed: 3.0 + i, tint: 0xa88a5e, ruts: true }));
  }
  group.add(buildStripSegment(LANE_JOIN, TRACK_NW, TRACK_WIDTH, { seed: 9.0, tint: 0xa88a5e, ruts: true }));
  return group;
}

function buildFieldGround() {
  const geometry = ensureUv2(new THREE.PlaneGeometry(FIELD_SIZE.x, FIELD_SIZE.z));
  const material = getTiledMaterial('ground', {
    repeatX: FIELD_SIZE.x / 5,
    repeatY: FIELD_SIZE.z / 5,
    tint: FIELD_GOLD,
    roughness: 1,
  });
  applyGroundNoiseDetail(material); // Fix 4/4 (playtest pass) — see materials.js
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(FIELD_CENTER.x, 0.02, FIELD_CENTER.z);
  mesh.receiveShadow = true;
  mesh.name = 'field_ground';
  return mesh;
}

/** Crop rows as one InstancedMesh — a simple low-poly tuft repeated on a grid, offset
 * row-to-row so it reads as planted furrows rather than a rigid checkerboard. */
function buildCropRows() {
  const spacing = 3;
  const rowOffset = 0.8;
  const halfX = FIELD_SIZE.x / 2 - 2;
  const halfZ = FIELD_SIZE.z / 2 - 2;
  const cols = Math.floor((halfX * 2) / spacing);
  const rows = Math.floor((halfZ * 2) / spacing);

  const geometry = ensureUv2(new THREE.BoxGeometry(0.18, 0.55, 0.18));
  const material = getTiledMaterial('crop', { repeatX: 1, repeatY: 1, tint: 0xb8a23c, roughness: 1 });
  const mesh = new THREE.InstancedMesh(geometry, material, cols * rows);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'crop_rows';
  mesh.userData.groundLevel = true; // every instance sits at ground level — see tools/screenshot.js

  const dummy = new THREE.Object3D();
  let index = 0;
  for (let r = 0; r < rows; r++) {
    const rz = FIELD_CENTER.z - halfZ + r * spacing;
    const offset = r % 2 === 0 ? 0 : rowOffset;
    for (let c = 0; c < cols; c++) {
      const rx = FIELD_CENTER.x - halfX + c * spacing + offset;
      dummy.position.set(rx, 0.275, rz);
      dummy.rotation.y = Math.sin(rx * 12.9 + rz * 7.1) * 0.3;
      dummy.updateMatrix();
      mesh.setMatrixAt(index++, dummy.matrix);
    }
  }
  mesh.count = index;
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function buildField(scene) {
  const group = new THREE.Group();
  group.name = 'field';
  group.add(buildFieldGround());
  group.add(buildCropRows());
  group.add(buildTrack());
  scene.add(group);
  return group;
}
