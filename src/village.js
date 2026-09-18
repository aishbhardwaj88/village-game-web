import * as THREE from 'three';
import { texturedBox, texturedWall, texturedThickBox, texturedWallBox, texturedFloor } from './materials.js';
import { getGLTFLoader } from './loaders.js';
import { buildStripSegment } from './paths.js';
import { BuildingKit } from './buildingKit.js';
import { mergeGroupByMaterial, mergeMeshList } from './mergeUtils.js';

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
export const WALL_THICKNESS = 0.22; // law — see docs/look-standard.md

/** A deeper shade of the same hue, for bands/plinths — never a different, more
 * saturated colour (law). */
export function darken(hex, factor = 0.72) {
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

/** Roof slabs, parapets — anywhere one box dimension (thickness) is much smaller
 * than the other two. See texturedThickBox in src/materials.js. */
function addThickBox(group, width, height, depth, materialName, position, opts = {}) {
  const mesh = texturedThickBox(width, height, depth, materialName, opts);
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

/** A main exterior wall — solid block or real-thickness thin wall — with Fix 4/4's
 * per-wall tiling/rotation jitter and baked dirt/bleach/blotch vertex-colour shading.
 * `seed` should be stable per wall so variation doesn't reshuffle between rebuilds. */
function addWallBox(group, width, height, depth, materialName, position, seed, opts = {}) {
  const mesh = texturedWallBox(width, height, depth, materialName, { ...opts, seed });
  mesh.position.set(position.x, position.y, position.z);
  group.add(mesh);
  return mesh;
}

function buildHouse(kit) {
  const group = new THREE.Group();
  group.name = 'house_compound';
  const cx = HOUSE_CENTER.x;
  const cz = HOUSE_CENTER.z;

  // Courtyard: 18m (x) x 14m (z), cement floor, centred exactly on the given point.
  const floor = texturedFloor(18, 14, 'concrete', { tileSize: 2, tint: CONCRETE_NEUTRAL });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.015, cz);
  group.add(floor);

  // Two-storey house block along the courtyard's north edge, front door facing south
  // (toward the lane / +z).
  const blockW = 10;
  const blockH = 6;
  const blockD = 8;
  const blockCx = cx;
  const blockCz = cz - 3; // north side of the 14m-deep courtyard (cz-7 .. cz+7)
  addWallBox(group, blockW, blockH, blockD, 'plaster', { x: blockCx, y: blockH / 2, z: blockCz }, blockCx * 3.1 + blockCz * 1.7, { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });

  // Painted skirt band along the base of the wall, plus a proud structural plinth
  // right at the ground line (deeper, neutral — real plinths are usually exposed
  // concrete regardless of the wall's own paint colour).
  const houseBandH = 1.0;
  addBox(group, blockW + 0.06, houseBandH, blockD + 0.06, 'plaster', { x: blockCx, y: houseBandH / 2, z: blockCz }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  kit.addPlinthRing(blockCx, blockCz, blockW, blockD, WALL_THICKNESS);
  kit.addCornerPilasters(blockCx, blockCz, blockW, blockD, blockH, WALL_THICKNESS);

  // Flat concrete roof with a parapet lip — overhangs the wall by 0.3m, visible edge.
  const overhang = 0.3;
  const roofY = blockH + 0.15;
  addThickBox(group, blockW + overhang * 2, 0.3, blockD + overhang * 2, 'concrete', { x: blockCx, y: roofY, z: blockCz }, { tint: CONCRETE_NEUTRAL });
  const parapetY = roofY + 0.55;
  addThickBox(group, blockW + overhang * 2, 0.8, 0.2, 'concrete', { x: blockCx, y: parapetY, z: blockCz - blockD / 2 - 0.1 }, { tint: CONCRETE_NEUTRAL });
  addThickBox(group, blockW + overhang * 2, 0.8, 0.2, 'concrete', { x: blockCx, y: parapetY, z: blockCz + blockD / 2 + 0.1 }, { tint: CONCRETE_NEUTRAL });
  addThickBox(group, 0.2, 0.8, blockD, 'concrete', { x: blockCx - blockW / 2 - 0.1, y: parapetY, z: blockCz }, { tint: CONCRETE_NEUTRAL });
  addThickBox(group, 0.2, 0.8, blockD, 'concrete', { x: blockCx + blockW / 2 - 0.1, y: parapetY, z: blockCz }, { tint: CONCRETE_NEUTRAL });

  // Front door, south face: recessed reveal, frame, lintel and leaf, real wall
  // thickness expressed as the reveal depth.
  const doorZ = blockCz + blockD / 2;
  kit.addOpening({ center: { x: blockCx, y: 0, z: doorZ }, width: 1.3, height: 2.2, wallThickness: WALL_THICKNESS, widthAxis: 'x', isDoor: true });
  kit.addStep({ x: blockCx, y: 0.08, z: doorZ + 0.35 }, { x: 1.6, y: 0.16, z: 0.5 });
  kit.addSwitchboard({ x: blockCx + 1.4, y: 1.4, z: doorZ + 0.02 });
  kit.addDrainpipe({ x: blockCx - blockW / 2 - 0.05, y: blockH / 2, z: blockCz - blockD / 2 - 0.05 }, blockH);

  // Low compound walls, east/west courtyard edges (south stays open onto the lane).
  const wallH = 1.6;
  addWall(group, 14, wallH, 'plaster', { x: cx - 9, y: wallH / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWall(group, 14, wallH, 'plaster', { x: cx + 9, y: wallH / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });

  // Task 2 (draw-call budget) — the wall/band/compound-wall meshes above all share
  // one 'plaster' Material now (tint baked into vertex colour, see materials.js),
  // and the floor/roof/parapets all share one 'concrete' Material, so this folds
  // house_compound's ~10 meshes down to ~2 without moving a single vertex.
  mergeGroupByMaterial(group);

  return group;
}

function buildSchool(kit) {
  const group = new THREE.Group();
  group.name = 'school_compound';
  const cx = SCHOOL_CENTER.x;
  const cz = SCHOOL_CENTER.z;

  // Yard: 30m (x) x 24m (z), cement floor, centred on the given point.
  const floor = texturedFloor(30, 24, 'concrete', { tileSize: 2, tint: CONCRETE_NEUTRAL });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.015, cz);
  group.add(floor);

  const bandH = 0.9;
  const overhang = 0.3;

  // Back (north) classroom block, plus two side wings — a U open south onto the yard.
  // Heights vary slightly between blocks so the skyline isn't one flat line.
  const blocks = [
    { w: 24, d: 6, x: cx, z: cz + 12 - 3, h: 3.7, doorAxis: 'x', doorSign: 1, windows: 2 }, // back, faces yard (+z)
    { w: 6, d: 18, x: cx - 15 + 3, z: cz, h: 3.4, doorAxis: 'z', doorSign: 1, windows: 1 }, // west wing, faces yard (+x)
    { w: 6, d: 18, x: cx + 15 - 3, z: cz, h: 3.6, doorAxis: 'z', doorSign: -1, windows: 1 }, // east wing, faces yard (-x)
  ];

  for (const b of blocks) {
    addWallBox(group, b.w, b.h, b.d, 'plaster', { x: b.x, y: b.h / 2, z: b.z }, b.x * 3.1 + b.z * 1.7, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
    addBox(group, b.w + 0.06, bandH, b.d + 0.06, 'plaster', { x: b.x, y: bandH / 2, z: b.z }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
    addThickBox(group, b.w + overhang * 2, 0.25, b.d + overhang * 2, 'concrete', { x: b.x, y: b.h + 0.125, z: b.z }, { tint: CONCRETE_NEUTRAL });
    kit.addPlinthRing(b.x, b.z, b.w, b.d, WALL_THICKNESS);
    kit.addCornerPilasters(b.x, b.z, b.w, b.d, b.h, WALL_THICKNESS);

    // Yard-facing wall: a door plus one or two windows either side.
    const faceAxis = b.doorAxis === 'x' ? 'z' : 'x'; // the axis the wall's own face normal points along
    const faceOffset = (b.doorSign * (faceAxis === 'z' ? b.d : b.w)) / 2;
    const doorCenter = { x: b.x, y: 0, z: b.z };
    doorCenter[faceAxis] += faceOffset;
    kit.addOpening({ center: doorCenter, width: 1.1, height: 2.1, wallThickness: WALL_THICKNESS, widthAxis: b.doorAxis, isDoor: true });
    const stepPos = { x: doorCenter.x, y: 0.08, z: doorCenter.z };
    stepPos[faceAxis] += Math.sign(faceOffset) * 0.3;
    const stepSize = faceAxis === 'z' ? { x: 1.4, y: 0.16, z: 0.45 } : { x: 0.45, y: 0.16, z: 1.4 };
    kit.addStep(stepPos, stepSize);

    const windowSpan = b.doorAxis === 'x' ? b.w : b.d;
    for (let i = 0; i < b.windows; i++) {
      const side = b.windows === 1 ? 1 : i === 0 ? -1 : 1;
      const winCenter = { x: b.x, y: 0, z: b.z };
      winCenter[b.doorAxis] += side * Math.min(windowSpan / 2 - 1.2, 3 + i * 0.2);
      winCenter[faceAxis] += faceOffset;
      kit.addOpening({ center: winCenter, width: 1.3, height: 1.3, wallThickness: WALL_THICKNESS, widthAxis: b.doorAxis, sill: 1.1 });
    }

    kit.addDrainpipe({ x: b.x - b.w / 2 - 0.05, y: b.h / 2, z: b.z - b.d / 2 - 0.05 }, b.h);
  }

  // Steel gate at the yard's south (open) entrance.
  const gateZ = cz - 12;
  addBox(group, 0.15, 2.2, 0.15, 'metal', { x: cx - 4, y: 1.1, z: gateZ }, { tileSize: 1 });
  addBox(group, 0.15, 2.2, 0.15, 'metal', { x: cx + 4, y: 1.1, z: gateZ }, { tileSize: 1 });
  addBox(group, 8, 0.15, 0.15, 'metal', { x: cx, y: 2.1, z: gateZ }, { tileSize: 1 });

  // Task 2 (draw-call budget) — folds the 3 wallBox + 3 band walls into one
  // 'plaster' mesh, the floor + 3 roofs into one 'concrete' mesh, and the 3 gate
  // bars into one 'metal' mesh (~13 meshes -> 3).
  mergeGroupByMaterial(group);

  return group;
}

function buildHalwai(kit) {
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
  const overhang = 0.3;

  addWallBox(group, depth, height, WALL_THICKNESS, 'plaster', { x: cx, y: height / 2, z: zLeft }, cx * 3.1 + zLeft * 1.7, { tint: PLASTER_HALWAI, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH }); // left/north wall
  addWallBox(group, WALL_THICKNESS, height, width, 'plaster', { x: xBack, y: height / 2, z: cz }, xBack * 3.1 + cz * 1.7, { tint: PLASTER_HALWAI, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH }); // back/east wall
  addThickBox(group, depth + overhang * 2, 0.25, width + overhang * 2, 'concrete', { x: cx, y: height + 0.125, z: cz }, { tint: CONCRETE_NEUTRAL }); // roof

  // Plinth + a single corner pilaster at the one real (north/east) corner.
  kit.addPlinthSegment({ x: cx, y: 0.15, z: zLeft }, { x: depth + 0.1, y: 0.3, z: WALL_THICKNESS + 0.05 });
  kit.addPlinthSegment({ x: xBack, y: 0.15, z: cz }, { x: WALL_THICKNESS + 0.05, y: 0.3, z: width + 0.1 });
  kit.addTrimBar({ x: xBack, y: height / 2, z: zLeft }, { x: WALL_THICKNESS + 0.05, y: height, z: WALL_THICKNESS + 0.05 });
  kit.addDrainpipe({ x: xBack + 0.05, y: height / 2, z: zLeft - 0.05 }, height);
  kit.addSwitchboard({ x: xBack - 0.02, y: 1.4, z: cz + 1.5 }, Math.PI / 2);

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

  // Task 2 (draw-call budget) — folds the 2 walls + roof into one 'plaster'/
  // 'concrete' pair, and the kadhai platform + cabinet + 2 chairs (three different
  // tints) into one 'concrete' + one 'wood' mesh. Runs before the clay pots' async
  // GLTF load resolves, so they're added afterwards untouched (own draw calls).
  mergeGroupByMaterial(group);

  return group;
}

function buildLane() {
  // Task 2 (draw-call budget) — both segments share the lane's default tint, and
  // buildStripSegment now bakes its own repeat/tint into the geometry (see
  // paths.js), so they merge into a single mesh instead of a 2-mesh group.
  const mesh = mergeMeshList(
    [buildStripSegment(HOUSE_CENTER, HALWAI_CENTER, 6, { seed: 1.0, ruts: true }), buildStripSegment(HALWAI_CENTER, SCHOOL_CENTER, 6, { seed: 2.0, ruts: true })],
    'lane'
  );
  return mesh;
}

export function buildHeroZone(scene) {
  const group = new THREE.Group();
  group.name = 'hero_zone';
  const kit = new BuildingKit(200);
  group.add(buildLane());
  group.add(buildHouse(kit));
  group.add(buildSchool(kit));
  group.add(buildHalwai(kit));
  kit.finalize(group);
  scene.add(group);
  return group;
}

export { HOUSE_CENTER, SCHOOL_CENTER, HALWAI_CENTER };
