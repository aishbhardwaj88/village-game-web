import * as THREE from 'three';
import { texturedBox, texturedWall, getTiledMaterial, ensureUv2 } from './materials.js';
import { getGLTFLoader } from './loaders.js';

// Hero-zone coordinates, 1 unit = 1 m, same axes as reference-from-unity/MAP.md and
// WorldData/*.json (reserved.json: PlayersHouse centre (-48, 33.5) 50x53m footprint,
// SchoolCompound centre (-50, 106) 85x75m footprint).
const HOUSE_CENTER = { x: -48, z: 39 };
const SCHOOL_CENTER = { x: -50, z: 106 };
const HALWAI_CENTER = { x: -40, z: 62 };

// Sun-faded, intact palette (art-direction 7.1b — worn-in is fine, damage is not).
const PLASTER_HOUSE = 0xe8d9b0; // warm sun-faded cream
const PLASTER_SCHOOL = 0xdce8ef; // pale blue-white, per MAP.md "blue-and-white walls"
const SCHOOL_BAND = 0x3d6fa3; // painted accent band, echoes the sky zenith blue
const WOOD_DOOR = 0x8a6238;
const CONCRETE_NEUTRAL = 0xd7d2c4;
const KADHAI_PLATFORM_TINT = 0xb08a5c; // warm cement/brick-toned plinth, no brick texture

function addBox(group, width, height, depth, materialName, position, opts = {}) {
  const mesh = texturedBox(width, height, depth, materialName, opts);
  mesh.position.set(position.x, position.y, position.z);
  group.add(mesh);
  return mesh;
}

/** A thin standing wall (see texturedWall). `axis: 'x'` runs east-west (no yaw
 * needed), `axis: 'z'` runs north-south (yawed 90°). */
function addWall(group, length, height, materialName, position, axis, opts = {}) {
  const mesh = texturedWall(length, height, materialName, opts);
  mesh.position.set(position.x, position.y, position.z);
  if (axis === 'z') mesh.rotation.y = Math.PI / 2;
  group.add(mesh);
  return mesh;
}

function buildHouse() {
  const group = new THREE.Group();
  group.name = 'house_compound';
  const cx = HOUSE_CENTER.x;
  const cz = HOUSE_CENTER.z;

  // Courtyard: 18m (x) x 14m (z), cement floor, centred exactly on the given point.
  const floorGeo = ensureUv2(new THREE.PlaneGeometry(18, 14));
  const floorMat = getTiledMaterial('concrete', { repeatX: 18 / 2, repeatY: 14 / 2, tint: CONCRETE_NEUTRAL });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.015, cz);
  floor.receiveShadow = true;
  group.add(floor);

  // Two-storey house block along the courtyard's north edge, front door facing south
  // (toward the lane / +z).
  const blockW = 10;
  const blockH = 6;
  const blockD = 8;
  const blockCx = cx;
  const blockCz = cz - 3; // north side of the 14m-deep courtyard (cz-7 .. cz+7)
  addBox(group, blockW, blockH, blockD, 'plaster', { x: blockCx, y: blockH / 2, z: blockCz }, { tint: PLASTER_HOUSE, tileSize: 2 });

  // Flat concrete roof with a parapet lip.
  const roofY = blockH + 0.15;
  addBox(group, blockW + 0.4, 0.3, blockD + 0.4, 'concrete', { x: blockCx, y: roofY, z: blockCz }, { tint: CONCRETE_NEUTRAL });
  const parapetY = roofY + 0.55;
  addBox(group, blockW + 0.4, 0.8, 0.2, 'concrete', { x: blockCx, y: parapetY, z: blockCz - blockD / 2 - 0.1 }, { tint: CONCRETE_NEUTRAL });
  addBox(group, blockW + 0.4, 0.8, 0.2, 'concrete', { x: blockCx, y: parapetY, z: blockCz + blockD / 2 + 0.1 }, { tint: CONCRETE_NEUTRAL });
  addBox(group, 0.2, 0.8, blockD, 'concrete', { x: blockCx - blockW / 2 - 0.1, y: parapetY, z: blockCz }, { tint: CONCRETE_NEUTRAL });
  addBox(group, 0.2, 0.8, blockD, 'concrete', { x: blockCx + blockW / 2 - 0.1, y: parapetY, z: blockCz }, { tint: CONCRETE_NEUTRAL });

  // Wooden front door, south face of the block.
  addBox(group, 1.3, 2.2, 0.12, 'wood', { x: blockCx, y: 1.1, z: blockCz + blockD / 2 + 0.06 }, { tint: WOOD_DOOR, tileSize: 1 });

  // Low compound walls, east/west courtyard edges (south stays open onto the lane).
  const wallH = 1.6;
  addWall(group, 14, wallH, 'plaster', { x: cx - 9, y: wallH / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 2 });
  addWall(group, 14, wallH, 'plaster', { x: cx + 9, y: wallH / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 2 });

  return group;
}

function buildSchool() {
  const group = new THREE.Group();
  group.name = 'school_compound';
  const cx = SCHOOL_CENTER.x;
  const cz = SCHOOL_CENTER.z;

  // Yard: 30m (x) x 24m (z), cement floor, centred on the given point.
  const floorGeo = ensureUv2(new THREE.PlaneGeometry(30, 24));
  const floorMat = getTiledMaterial('concrete', { repeatX: 15, repeatY: 12, tint: CONCRETE_NEUTRAL });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.015, cz);
  floor.receiveShadow = true;
  group.add(floor);

  const wallH = 3.5;
  const bandH = 0.9;

  // Back (north) classroom block, plus two side wings — a U open south onto the yard.
  const blocks = [
    { w: 24, d: 6, x: cx, z: cz + 12 - 3 }, // back
    { w: 6, d: 18, x: cx - 15 + 3, z: cz }, // west wing
    { w: 6, d: 18, x: cx + 15 - 3, z: cz }, // east wing
  ];

  for (const b of blocks) {
    addBox(group, b.w, wallH, b.d, 'plaster', { x: b.x, y: wallH / 2, z: b.z }, { tint: PLASTER_SCHOOL, tileSize: 2 });
    addBox(group, b.w + 0.06, bandH, b.d + 0.06, 'plaster', { x: b.x, y: bandH / 2, z: b.z }, { tint: SCHOOL_BAND, tileSize: 2 });
    addBox(group, b.w + 0.3, 0.25, b.d + 0.3, 'concrete', { x: b.x, y: wallH + 0.15, z: b.z }, { tint: CONCRETE_NEUTRAL });
  }

  // Steel gate at the yard's south (open) entrance.
  const gateZ = cz - 12;
  addBox(group, 0.15, 2.2, 0.15, 'metal', { x: cx - 4, y: 1.1, z: gateZ }, { tileSize: 1 });
  addBox(group, 0.15, 2.2, 0.15, 'metal', { x: cx + 4, y: 1.1, z: gateZ }, { tileSize: 1 });
  addBox(group, 8, 0.15, 0.15, 'metal', { x: cx, y: 2.1, z: gateZ }, { tileSize: 1 });

  return group;
}

function buildHalwai() {
  const group = new THREE.Group();
  group.name = 'halwai_shop';
  const cx = HALWAI_CENTER.x;
  const cz = HALWAI_CENTER.z;

  // 5.5m wide (z, parallel to the lane) x 4.5m deep (x, street-inward) x 3.5m tall,
  // per Places V1/halwai/LAYOUT.md. Front (street/lane side, west, -x) and the right
  // side (south, +z, chair side) are both open.
  const width = 5.5; // z-span
  const depth = 4.5; // x-span
  const height = 3.5;
  const xFront = cx - depth / 2;
  const xBack = cx + depth / 2;
  const zLeft = cz - width / 2;

  addWall(group, depth, height, 'plaster', { x: cx, y: height / 2, z: zLeft }, 'x', { tint: PLASTER_HOUSE, tileSize: 1.5 }); // left/north wall
  addWall(group, width, height, 'plaster', { x: xBack, y: height / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 1.5 }); // back/east wall
  addBox(group, depth + 0.6, 0.25, width + 0.6, 'concrete', { x: cx, y: height + 0.125, z: cz }, { tint: CONCRETE_NEUTRAL }); // roof

  // Kadhai platform: 0.9m deep band nearest the street.
  addBox(group, 0.9, 0.4, width, 'concrete', { x: xFront + 0.45, y: 0.2, z: cz }, { tint: KADHAI_PLATFORM_TINT });

  // Sweet display cabinet, in the 0.6m band after the 2.5m working aisle.
  addBox(group, 0.6, 1.6, 1.5, 'wood', { x: xBack - 0.55, y: 0.8, z: cz - 1 }, { tint: WOOD_DOOR, tileSize: 1 });

  // Two plastic chairs outside the open (south) side.
  addBox(group, 0.4, 0.4, 0.4, 'wood', { x: cx - 0.5, y: 0.2, z: cz + width / 2 + 0.6 }, { tint: 0xb23a3a, tileSize: 1 });
  addBox(group, 0.4, 0.4, 0.4, 'wood', { x: cx + 0.5, y: 0.2, z: cz + width / 2 + 1.1 }, { tint: 0x3a9955, tileSize: 1 });

  // Clay pots at the front-left, reusing the shrunk CC0 test asset from the pipeline.
  getGLTFLoader().load('assets/models/ceramic_pot.glb', (gltf) => {
    for (const [dx, dz] of [
      [-0.6, -1.2],
      [-0.9, -0.6],
    ]) {
      const pot = gltf.scene.clone(true);
      pot.position.set(xFront - 0.3 + dx, 0, cz + dz);
      pot.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      group.add(pot);
    }
  });

  return group;
}

/** Smooth, low-amplitude pseudo-noise (no dependency) so the lane bumps read as
 * gentle undulation, not jagged geometry. */
function bumpHeight(u, v, seed) {
  return (
    Math.sin(u * 7.3 + seed) * 0.03 +
    Math.sin(v * 5.1 + seed * 1.7) * 0.03 +
    Math.sin((u + v) * 11.0 + seed * 0.6) * 0.015
  );
}

function buildLaneSegment(start, end, width, seed) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const segsAlong = Math.max(4, Math.round(length / 3));
  const segsAcross = 4;

  const geometry = new THREE.PlaneGeometry(width, length, segsAcross, segsAlong);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / width;
    const v = pos.getY(i) / length;
    pos.setZ(i, bumpHeight(u, v, seed));
  }
  geometry.computeVertexNormals();
  ensureUv2(geometry);

  const repeat = Math.max(1, Math.round(length / 4));
  const material = getTiledMaterial('ground', { repeatX: 2, repeatY: repeat, tint: 0xb7a179, roughness: 1 });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  const midX = (start.x + end.x) / 2;
  const midZ = (start.z + end.z) / 2;
  mesh.position.set(midX, 0.03, midZ);
  // rotation.x lays the plane flat (local Y -> world -Z); rotation.y then yaws it in
  // the ground plane to point along (dx, dz). See docs/parked.md derivation note if
  // this ever needs revisiting for a curved multi-segment lane.
  mesh.rotation.y = Math.atan2(-dx, -dz);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'lane';
  return mesh;
}

function buildLane() {
  const group = new THREE.Group();
  group.name = 'lane';
  group.add(buildLaneSegment(HOUSE_CENTER, HALWAI_CENTER, 6, 1.0));
  group.add(buildLaneSegment(HALWAI_CENTER, SCHOOL_CENTER, 6, 2.0));
  return group;
}

export function buildHeroZone(scene) {
  const group = new THREE.Group();
  group.name = 'hero_zone';
  group.add(buildLane());
  group.add(buildHouse());
  group.add(buildSchool());
  group.add(buildHalwai());
  scene.add(group);
  return group;
}

export { HOUSE_CENTER, SCHOOL_CENTER, HALWAI_CENTER };
