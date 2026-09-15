import * as THREE from 'three';
import { texturedBox, texturedWall, getTiledMaterial, ensureUv2 } from './materials.js';
import { getGLTFLoader } from './loaders.js';
import { buildStripSegment } from './paths.js';

// Hero-zone coordinates, 1 unit = 1 m, same axes as reference-from-unity/MAP.md and
// WorldData/*.json (reserved.json: PlayersHouse centre (-48, 33.5) 50x53m footprint,
// SchoolCompound centre (-50, 106) 85x75m footprint).
const HOUSE_CENTER = { x: -48, z: 39 };
const SCHOOL_CENTER = { x: -50, z: 106 };
const HALWAI_CENTER = { x: -40, z: 62 };

// Fixed palette, law — see docs/look-standard.md. Exact hex values, no per-call tuning.
// Applied at WALL_TINT_STRENGTH (0.3) so the plaster texture's own grain/colour stays
// visible instead of a flat saturated cut-out (see src/materials.js getTiledMaterial).
export const PALETTE = {
  cream: 0xe8dcc4,
  mustard: 0xdcc488,
  terracotta: 0xc98e72,
  teal: 0x8fafa6,
  fadedBlue: 0xa8bccb,
  schoolYellow: 0xefdca8,
  greyGreen: 0xbcbfa8,
  woodTrim: 0x8a6a4a,
};
export const WALL_TINT_STRENGTH = 0.3;

/** A deeper shade of the same hue, for bands/plinths — never a different, more
 * saturated colour (law). */
function darken(hex, factor = 0.72) {
  return new THREE.Color(hex).multiplyScalar(factor).getHex();
}

const PLASTER_HOUSE = PALETTE.mustard;
const PLASTER_HALWAI = PALETTE.terracotta;
const PLASTER_SCHOOL = PALETTE.schoolYellow;
const SCHOOL_BAND = darken(PALETTE.schoolYellow);
const HOUSE_BAND = darken(PALETTE.mustard);
const WOOD_DOOR = PALETTE.woodTrim;
const CONCRETE_NEUTRAL = 0xd7d2c4; // already paler/less saturated than every palette value
const KADHAI_PLATFORM_TINT = darken(PALETTE.terracotta);

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
  addBox(group, blockW, blockH, blockD, 'plaster', { x: blockCx, y: blockH / 2, z: blockCz }, { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });

  // Painted skirt band along the base of the wall.
  const houseBandH = 1.0;
  addBox(group, blockW + 0.06, houseBandH, blockD + 0.06, 'plaster', { x: blockCx, y: houseBandH / 2, z: blockCz }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });

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
  addWall(group, 14, wallH, 'plaster', { x: cx - 9, y: wallH / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWall(group, 14, wallH, 'plaster', { x: cx + 9, y: wallH / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });

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
    addBox(group, b.w, wallH, b.d, 'plaster', { x: b.x, y: wallH / 2, z: b.z }, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
    addBox(group, b.w + 0.06, bandH, b.d + 0.06, 'plaster', { x: b.x, y: bandH / 2, z: b.z }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
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

  addWall(group, depth, height, 'plaster', { x: cx, y: height / 2, z: zLeft }, 'x', { tint: PLASTER_HALWAI, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH }); // left/north wall
  addWall(group, width, height, 'plaster', { x: xBack, y: height / 2, z: cz }, 'z', { tint: PLASTER_HALWAI, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH }); // back/east wall
  addBox(group, depth + 0.6, 0.25, width + 0.6, 'concrete', { x: cx, y: height + 0.125, z: cz }, { tint: CONCRETE_NEUTRAL }); // roof

  // Kadhai platform: 0.9m deep band nearest the street.
  addBox(group, 0.9, 0.4, width, 'concrete', { x: xFront + 0.45, y: 0.2, z: cz }, { tint: KADHAI_PLATFORM_TINT, tintStrength: WALL_TINT_STRENGTH });

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

function buildLane() {
  const group = new THREE.Group();
  group.name = 'lane';
  group.add(buildStripSegment(HOUSE_CENTER, HALWAI_CENTER, 6, { seed: 1.0, ruts: true }));
  group.add(buildStripSegment(HALWAI_CENTER, SCHOOL_CENTER, 6, { seed: 2.0, ruts: true }));
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
