import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedBox, texturedWall, texturedThickBox, texturedWallBox, texturedFloor, getTiledMaterial, bakeFlatTintColors, ensureUv2 } from './materials.js';
import { getGLTFLoader } from './loaders.js';
import { buildStripSegment } from './paths.js';
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

/**
 * Item 3 (house interior) — a wall with a real, centred doorway-width gap: 2 actual
 * wall segments, not the decorative reveal-over-solid-mass every exterior door
 * elsewhere in this file uses (kit.addOpening) — those were never meant to be walked
 * through, this one has to be. `axis` is which world axis the wall's own length runs
 * along; `thickness` is the wall's own depth (the other horizontal axis).
 */
function addGappedWall(group, { axis, length, height, thickness, cx, cz, gapWidth, materialName, tint, seedBase }) {
  const segLen = (length - gapWidth) / 2;
  if (axis === 'x') {
    addWallBox(group, segLen, height, thickness, materialName, { x: cx - length / 2 + segLen / 2, y: height / 2, z: cz }, seedBase, { tint, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
    addWallBox(group, segLen, height, thickness, materialName, { x: cx + length / 2 - segLen / 2, y: height / 2, z: cz }, seedBase + 1, { tint, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  } else {
    addWallBox(group, thickness, height, segLen, materialName, { x: cx, y: height / 2, z: cz - length / 2 + segLen / 2 }, seedBase, { tint, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
    addWallBox(group, thickness, height, segLen, materialName, { x: cx, y: height / 2, z: cz + length / 2 - segLen / 2 }, seedBase + 1, { tint, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  }
}

/** Just the frame (jambs + lintel) around a real doorway — no reveal (there's real
 * daylight/interior behind a real gap, not a fake recessed backing) and no door leaf
 * (the player has to see/walk through, not find a closed panel). Doorway width runs
 * along X for every door in this file. */
function addDoorFrameX(kit, center, width, height, wallThickness) {
  const frameW = 0.1;
  for (const side of [-1, 1]) {
    kit.addTrimBar({ x: center.x + (side * width) / 2, y: center.y + height / 2, z: center.z }, { x: frameW, y: height, z: wallThickness + 0.02 });
  }
  kit.addTrimBar({ x: center.x, y: center.y + height + frameW / 2, z: center.z }, { x: width + frameW * 2, y: frameW, z: wallThickness + 0.02 });
}

/** A solid masonry-look staircase (steps solid down to the ground, not floating
 * slabs) — one merged mesh regardless of step count. Runs along Z, climbing as z
 * decreases from `zStart`. */
function buildStaircase(x, zStart, steps, stepDepth, stepRise, stepWidth, materialName, tint) {
  const geos = [];
  for (let i = 0; i < steps; i++) {
    const stepHeight = (i + 1) * stepRise;
    const geo = ensureUv2(new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth));
    const z = zStart - (i + 0.5) * stepDepth;
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(x, stepHeight / 2, z));
    geos.push(geo);
  }
  const merged = mergeGeometries(geos);
  bakeFlatTintColors(merged, tint, WALL_TINT_STRENGTH);
  const material = getTiledMaterial(materialName, { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = 'house_stairs';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Item 3 (house interior) — exact layout, shared between buildHouse (geometry),
// buildHouseInteriorProps (furniture), and src/collision.js (colliders must match
// this file's actual wall positions since they're hand-authored, same rule every
// other building here already follows).
export const HOUSE_BLOCK = { w: 10, h: 6, d: 8, cx: HOUSE_CENTER.x, cz: HOUSE_CENTER.z - 3 };
export const HOUSE_DOOR_Z = HOUSE_BLOCK.cz + HOUSE_BLOCK.d / 2;
export const HOUSE_DOOR_WIDTH = 1.3;
export const HOUSE_PARTITION_Z = HOUSE_BLOCK.cz + 0.6; // front room (entry) / back room
export const HOUSE_PARTITION_DOOR_WIDTH = 1.1;
export const HOUSE_ROOF_Y = HOUSE_BLOCK.h + 0.15;
export const HOUSE_STAIRS = {
  x: HOUSE_BLOCK.cx - HOUSE_BLOCK.w / 2 - 0.9,
  zStart: HOUSE_BLOCK.cz + HOUSE_BLOCK.d / 2, // ground level, south end
  zEnd: HOUSE_BLOCK.cz - HOUSE_BLOCK.d / 2, // roof level, north end
  width: 1.2,
  yTop: HOUSE_ROOF_Y,
};

// Item 4 (school interior) — the west wing is the one walkable classroom; exact
// layout shared with src/collision.js the same way HOUSE_* is.
export const SCHOOL_ROOM = { w: 6, h: 3.4, d: 18, cx: SCHOOL_CENTER.x - 12, cz: SCHOOL_CENTER.z };
export const SCHOOL_ROOM_DOOR_X = SCHOOL_ROOM.cx + SCHOOL_ROOM.w / 2; // east face, toward the yard
export const SCHOOL_ROOM_DOOR_WIDTH = 1.1;

// Item 5's new interaction points need these same positions — exported once here
// (not recomputed) so buildHouseInteriorProps/buildSchoolClassroom and
// src/interactions.js can never drift apart.
export const HOUSE_CHARPAI_POSITION = { x: HOUSE_BLOCK.cx - 3.4, y: 0.42, z: (HOUSE_PARTITION_Z + HOUSE_DOOR_Z) / 2 };
export const HOUSE_HAND_PUMP_POSITION = { x: HOUSE_CENTER.x - 2.5, y: 0, z: HOUSE_CENTER.z + 5.5 };
export const HOUSE_TULSI_POSITION = { x: HOUSE_CENTER.x + 3, y: 0, z: HOUSE_CENTER.z + 4.5 };
export const SCHOOL_BLACKBOARD_POSITION = { x: SCHOOL_ROOM.cx, y: 1.7, z: SCHOOL_ROOM.cz - SCHOOL_ROOM.d / 2 + 0.15 };
export const SCHOOL_BENCH_POSITION = { x: SCHOOL_ROOM.cx - 0.4, y: 0, z: SCHOOL_ROOM.cz - SCHOOL_ROOM.d / 2 + 4 };

const TULSI_GREEN = 0x4a7a3a;
const CLOTH_COLORS = [0xd8d0b8, 0x5a7a9a, 0x8a3a3a];

/**
 * Item 3's furniture list, built as plain geometry (no time spent on detail — same
 * "placeholder" spirit as src/vehicles.js). `charpai` and `hand_pump` are each kept
 * in their own small Group (self-merged to one draw call, but not folded into the
 * building's own merged walls) so the asset-slot system (item 1, src/assetSlots.js)
 * can hide each independently once a real model exists for that slot; everything
 * else here (trunk, shelf + vessels, tulsi platform, clothesline) isn't a named slot,
 * so it's merged straight into one shared "misc" group instead.
 */
function buildHouseInteriorProps(houseGroup) {
  const { cx: blockCx, cz: blockCz, w: blockW } = HOUSE_BLOCK;

  // Charpai — front room, against its west wall.
  const charpaiGroup = new THREE.Group();
  charpaiGroup.name = 'charpai';
  const charpaiCx = HOUSE_CHARPAI_POSITION.x;
  const charpaiCz = HOUSE_CHARPAI_POSITION.z;
  const charpaiTopY = 0.42;
  const frame = texturedBox(0.9, 0.08, 1.9, 'wood', { tint: PALETTE.woodTrim, tileSize: 1 });
  frame.position.set(charpaiCx, charpaiTopY, charpaiCz);
  charpaiGroup.add(frame);
  for (const [lx, lz] of [
    [-0.4, -0.85],
    [0.4, -0.85],
    [-0.4, 0.85],
    [0.4, 0.85],
  ]) {
    const leg = texturedBox(0.06, charpaiTopY - 0.04, 0.06, 'wood', { tint: 0x4a3a28, tileSize: 1 });
    leg.position.set(charpaiCx + lx, (charpaiTopY - 0.04) / 2, charpaiCz + lz);
    charpaiGroup.add(leg);
  }
  mergeGroupByMaterial(charpaiGroup);
  houseGroup.add(charpaiGroup);

  // Hand pump — courtyard, clear of the staircase (which sits further west).
  const handPumpGroup = new THREE.Group();
  handPumpGroup.name = 'hand_pump';
  const pumpX = HOUSE_HAND_PUMP_POSITION.x;
  const pumpZ = HOUSE_HAND_PUMP_POSITION.z;
  const pumpBase = texturedBox(0.4, 0.15, 0.4, 'metal', { tint: 0x3a3a3a, tileSize: 1 });
  pumpBase.position.set(pumpX, 0.075, pumpZ);
  handPumpGroup.add(pumpBase);
  const pumpPipe = texturedBox(0.09, 1.1, 0.09, 'metal', { tint: 0x2a2a2a, tileSize: 1 });
  pumpPipe.position.set(pumpX, 0.15 + 0.55, pumpZ);
  handPumpGroup.add(pumpPipe);
  const pumpHandle = texturedBox(0.5, 0.07, 0.07, 'metal', { tint: 0x2a2a2a, tileSize: 1 });
  pumpHandle.position.set(pumpX - 0.25, 1.3, pumpZ);
  pumpHandle.rotation.z = 0.3;
  handPumpGroup.add(pumpHandle);
  const pumpSpout = texturedBox(0.07, 0.3, 0.07, 'metal', { tint: 0x2a2a2a, tileSize: 1 });
  pumpSpout.position.set(pumpX, 0.75, pumpZ + 0.18);
  pumpSpout.rotation.x = 0.5;
  handPumpGroup.add(pumpSpout);
  mergeGroupByMaterial(handPumpGroup);
  houseGroup.add(handPumpGroup);

  // Everything else — merged once into `misc`, not individually referenceable.
  const misc = new THREE.Group();

  // Steel trunk — back room, near its west wall.
  const trunk = texturedBox(1.1, 0.55, 0.6, 'metal', { tint: 0x5a6068, tileSize: 1 });
  trunk.position.set(blockCx - 3.5, 0.275, blockCz - 2.8);
  misc.add(trunk);

  // Shelf + vessels — back room, against its east wall.
  const shelfX = blockCx + blockW / 2 - 0.3;
  const shelf = texturedBox(0.3, 1.7, 1.8, 'wood', { tint: PALETTE.woodTrim, tileSize: 1 });
  shelf.position.set(shelfX, 0.85, blockCz - 1.5);
  misc.add(shelf);
  for (let i = 0; i < 3; i++) {
    const vessel = texturedBox(0.22, 0.22, 0.22, 'terracotta', { tint: 0xb5693f, tileSize: 1 });
    vessel.position.set(shelfX - 0.05, 1.55, blockCz - 2.1 + i * 0.55);
    misc.add(vessel);
  }

  // Tulsi platform — courtyard, clear of the door's direct path.
  const tulsiX = HOUSE_TULSI_POSITION.x;
  const tulsiZ = HOUSE_TULSI_POSITION.z;
  const tulsiBase = texturedThickBox(0.7, 0.5, 0.7, 'concrete', { tint: CONCRETE_NEUTRAL });
  tulsiBase.position.set(tulsiX, 0.25, tulsiZ);
  misc.add(tulsiBase);
  const tulsiStem = texturedBox(0.06, 0.5, 0.06, 'crop', { tint: TULSI_GREEN, tileSize: 1 });
  tulsiStem.position.set(tulsiX, 0.75, tulsiZ);
  misc.add(tulsiStem);
  for (const [dx, dz, dy] of [
    [0, 0, 1.05],
    [0.15, 0.1, 0.95],
    [-0.15, -0.08, 0.98],
    [0.1, -0.15, 1.15],
  ]) {
    const leaf = texturedBox(0.22, 0.16, 0.22, 'crop', { tint: TULSI_GREEN, tileSize: 1 });
    leaf.position.set(tulsiX + dx, dy, tulsiZ + dz);
    misc.add(leaf);
  }

  // Clothesline — two posts, a line, a few pieces of drying cloth.
  const lineY = 1.5;
  const postAX = HOUSE_CENTER.x + 1.5;
  const postBX = HOUSE_CENTER.x + 4.8;
  const lineZ = HOUSE_CENTER.z + 6.2;
  for (const px of [postAX, postBX]) {
    const post = texturedBox(0.08, lineY, 0.08, 'wood', { tint: 0x4a3a28, tileSize: 1 });
    post.position.set(px, lineY / 2, lineZ);
    misc.add(post);
  }
  const line = texturedBox(postBX - postAX, 0.02, 0.02, 'wood', { tint: 0x2a2a2a, tileSize: 1 });
  line.position.set((postAX + postBX) / 2, lineY, lineZ);
  misc.add(line);
  const clothSpan = postBX - postAX - 0.4;
  for (let i = 0; i < 3; i++) {
    const cloth = texturedBox(0.55, 0.6, 0.03, 'wood', { tint: CLOTH_COLORS[i], tileSize: 1 });
    cloth.position.set(postAX + 0.3 + (i / 2) * clothSpan, lineY - 0.32, lineZ);
    cloth.rotation.y = (i - 1) * 0.15;
    misc.add(cloth);
  }

  mergeGroupByMaterial(misc);
  for (const child of [...misc.children]) houseGroup.add(child);

  // Water effect meshes (item 5's pump/tulsi interactions) — hidden by default,
  // toggled visible briefly by src/main.js. Kept out of the merge groups above so
  // each can be shown/hidden individually.
  const pumpWaterMesh = texturedBox(0.05, 0.4, 0.05, 'metal', { tint: 0x6fa8c9, tileSize: 1 });
  pumpWaterMesh.name = 'pump_water'; // named so the village-wide merge (main.js) can skip it — see mergeUtils.js
  pumpWaterMesh.position.set(pumpX, 0.55, pumpZ + 0.18);
  pumpWaterMesh.visible = false;
  houseGroup.add(pumpWaterMesh);

  const tulsiWaterMesh = texturedBox(0.5, 0.05, 0.5, 'metal', { tint: 0x6fa8c9, tileSize: 1 });
  tulsiWaterMesh.name = 'tulsi_water'; // named so the village-wide merge (main.js) can skip it — see mergeUtils.js
  tulsiWaterMesh.position.set(tulsiX, 0.52, tulsiZ);
  tulsiWaterMesh.visible = false;
  houseGroup.add(tulsiWaterMesh);

  return { charpaiGroup, handPumpGroup, pumpWaterMesh, tulsiWaterMesh };
}

function buildHouse(kit) {
  const group = new THREE.Group();
  group.name = 'house_compound';
  const cx = HOUSE_CENTER.x;
  const cz = HOUSE_CENTER.z;
  const { w: blockW, h: blockH, d: blockD, cx: blockCx, cz: blockCz } = HOUSE_BLOCK;
  const seedBase = blockCx * 3.1 + blockCz * 1.7;

  // Courtyard: 18m (x) x 14m (z), cement floor, open to the sky, centred exactly on
  // the given point.
  const floor = texturedFloor(18, 14, 'concrete', { tileSize: 2, tint: CONCRETE_NEUTRAL });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.015, cz);
  group.add(floor);

  // Ground-floor house block, walkable (item 3): 4 real perimeter walls (a genuine
  // gap at the front door — see addGappedWall's doc comment) plus an interior
  // partition splitting it into a front room (just inside the door) and a back room,
  // each with its own real doorway. A staircase (below) climbs from the courtyard up
  // to the flat roof, which already existed and now doubles as the interior ceiling.
  addGappedWall(group, { axis: 'x', length: blockW, height: blockH, thickness: WALL_THICKNESS, cx: blockCx, cz: HOUSE_DOOR_Z, gapWidth: HOUSE_DOOR_WIDTH, materialName: 'plaster', tint: PLASTER_HOUSE, seedBase });
  addWallBox(group, blockW, blockH, WALL_THICKNESS, 'plaster', { x: blockCx, y: blockH / 2, z: blockCz - blockD / 2 }, seedBase + 10, { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWallBox(group, WALL_THICKNESS, blockH, blockD, 'plaster', { x: blockCx - blockW / 2, y: blockH / 2, z: blockCz }, seedBase + 11, { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWallBox(group, WALL_THICKNESS, blockH, blockD, 'plaster', { x: blockCx + blockW / 2, y: blockH / 2, z: blockCz }, seedBase + 12, { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addGappedWall(group, { axis: 'x', length: blockW, height: blockH, thickness: WALL_THICKNESS, cx: blockCx, cz: HOUSE_PARTITION_Z, gapWidth: HOUSE_PARTITION_DOOR_WIDTH, materialName: 'plaster', tint: PLASTER_HOUSE, seedBase: seedBase + 20 });

  // Interior floor + a false ceiling (the real roof, below, sits well above it) so
  // the rooms read as human-scaled rather than as tall as the full exterior mass.
  const interiorFloor = texturedFloor(blockW - WALL_THICKNESS * 2, blockD - WALL_THICKNESS * 2, 'concrete', { tileSize: 2, tint: CONCRETE_NEUTRAL });
  interiorFloor.rotation.x = -Math.PI / 2;
  interiorFloor.position.set(blockCx, 0.02, blockCz);
  group.add(interiorFloor);
  const ceilingY = 3.15;
  addThickBox(group, blockW - WALL_THICKNESS * 2, 0.1, blockD - WALL_THICKNESS * 2, 'concrete', { x: blockCx, y: ceilingY, z: blockCz }, { tint: CONCRETE_NEUTRAL });

  // Painted skirt band along the base of each wall segment (matching each one's own
  // length/gap so it never fills a doorway), plus a proud structural plinth right at
  // the ground line.
  const houseBandH = 1.0;
  const doorSegLen = (blockW - HOUSE_DOOR_WIDTH) / 2;
  addBox(group, doorSegLen + 0.06, houseBandH, WALL_THICKNESS + 0.06, 'plaster', { x: blockCx - blockW / 2 + doorSegLen / 2, y: houseBandH / 2, z: HOUSE_DOOR_Z }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(group, doorSegLen + 0.06, houseBandH, WALL_THICKNESS + 0.06, 'plaster', { x: blockCx + blockW / 2 - doorSegLen / 2, y: houseBandH / 2, z: HOUSE_DOOR_Z }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(group, blockW + 0.06, houseBandH, WALL_THICKNESS + 0.06, 'plaster', { x: blockCx, y: houseBandH / 2, z: blockCz - blockD / 2 }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(group, WALL_THICKNESS + 0.06, houseBandH, blockD + 0.06, 'plaster', { x: blockCx - blockW / 2, y: houseBandH / 2, z: blockCz }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(group, WALL_THICKNESS + 0.06, houseBandH, blockD + 0.06, 'plaster', { x: blockCx + blockW / 2, y: houseBandH / 2, z: blockCz }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  kit.addPlinthRing(blockCx, blockCz, blockW, blockD, WALL_THICKNESS);
  kit.addCornerPilasters(blockCx, blockCz, blockW, blockD, blockH, WALL_THICKNESS);

  // Flat concrete roof with a parapet lip — overhangs the wall by 0.3m, visible edge.
  const overhang = 0.3;
  addThickBox(group, blockW + overhang * 2, 0.3, blockD + overhang * 2, 'concrete', { x: blockCx, y: HOUSE_ROOF_Y, z: blockCz }, { tint: CONCRETE_NEUTRAL });
  const parapetY = HOUSE_ROOF_Y + 0.55;
  addThickBox(group, blockW + overhang * 2, 0.8, 0.2, 'concrete', { x: blockCx, y: parapetY, z: blockCz - blockD / 2 - 0.1 }, { tint: CONCRETE_NEUTRAL });
  addThickBox(group, blockW + overhang * 2, 0.8, 0.2, 'concrete', { x: blockCx, y: parapetY, z: blockCz + blockD / 2 + 0.1 }, { tint: CONCRETE_NEUTRAL });
  addThickBox(group, 0.2, 0.8, blockD, 'concrete', { x: blockCx - blockW / 2 - 0.1, y: parapetY, z: blockCz }, { tint: CONCRETE_NEUTRAL });
  addThickBox(group, 0.2, 0.8, blockD, 'concrete', { x: blockCx + blockW / 2 - 0.1, y: parapetY, z: blockCz }, { tint: CONCRETE_NEUTRAL });

  // Front door + interior doorway — frame only (jambs + lintel), no reveal/leaf,
  // since both are real passages now (see addDoorFrameX's doc comment).
  addDoorFrameX(kit, { x: blockCx, y: 0, z: HOUSE_DOOR_Z }, HOUSE_DOOR_WIDTH, 2.2, WALL_THICKNESS);
  addDoorFrameX(kit, { x: blockCx, y: 0, z: HOUSE_PARTITION_Z }, HOUSE_PARTITION_DOOR_WIDTH, 2.1, WALL_THICKNESS);
  kit.addStep({ x: blockCx, y: 0.08, z: HOUSE_DOOR_Z + 0.35 }, { x: 1.6, y: 0.16, z: 0.5 });
  kit.addSwitchboard({ x: blockCx + 1.4, y: 1.4, z: HOUSE_DOOR_Z + 0.02 });
  kit.addDrainpipe({ x: blockCx - blockW / 2 - 0.05, y: blockH / 2, z: blockCz - blockD / 2 - 0.05 }, blockH);

  // Staircase, courtyard side of the west wall, climbing from the ground up to the
  // roof (item 3's "staircase to the roof").
  const s = HOUSE_STAIRS;
  const stairSteps = 10;
  const stairDepth = (s.zStart - s.zEnd) / stairSteps;
  group.add(buildStaircase(s.x, s.zStart, stairSteps, stairDepth, s.yTop / stairSteps, s.width, 'concrete', CONCRETE_NEUTRAL));

  // Low compound walls, east/west courtyard edges (south stays open onto the lane).
  const wallH = 1.6;
  addWall(group, 14, wallH, 'plaster', { x: cx - 9, y: wallH / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWall(group, 14, wallH, 'plaster', { x: cx + 9, y: wallH / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });

  // Task 2 (draw-call budget) — every plaster-family mesh above shares one Material
  // (tint baked into vertex colour, see materials.js), and every concrete-family one
  // shares another, so this folds house_compound's ~20 meshes down to ~2. Runs
  // before the interior props below are added, so they get their own (small) merge
  // groups instead of being swept into these two.
  mergeGroupByMaterial(group);

  const { charpaiGroup, handPumpGroup, pumpWaterMesh, tulsiWaterMesh } = buildHouseInteriorProps(group);

  return { group, charpaiGroup, handPumpGroup, pumpWaterMesh, tulsiWaterMesh };
}

/** Same reasoning as addDoorFrameX (house, above) but for a doorway whose width runs
 * along Z instead of X — this room's one real door faces east/west, not north/south. */
function addDoorFrameZ(kit, center, width, height, wallThickness) {
  const frameW = 0.1;
  for (const side of [-1, 1]) {
    kit.addTrimBar({ x: center.x, y: center.y + height / 2, z: center.z + (side * width) / 2 }, { x: wallThickness + 0.02, y: height, z: frameW });
  }
  kit.addTrimBar({ x: center.x, y: center.y + height + frameW / 2, z: center.z }, { x: wallThickness + 0.02, y: frameW, z: width + frameW * 2 });
}


/** The walkable classroom, item 4: real east-facing doorway (a genuine gap, like the
 * house — see addGappedWall's doc comment), solid north/south/west walls, a
 * blackboard + teacher's table/chair at the north end, benches in rows facing them,
 * a wall chart on the west wall. Same plaster/cement treatment as every other block
 * here, folded into buildSchool's own merge pass — see mergeGroupByMaterial below. */
function buildSchoolClassroom(group, kit) {
  const { w, h, d, cx: rx, cz: rz } = SCHOOL_ROOM;
  const seedBase = rx * 3.1 + rz * 1.7;
  const overhang = 0.3;
  const bandH = 0.9;

  addGappedWall(group, { axis: 'z', length: d, height: h, thickness: WALL_THICKNESS, cx: SCHOOL_ROOM_DOOR_X, cz: rz, gapWidth: SCHOOL_ROOM_DOOR_WIDTH, materialName: 'plaster', tint: PLASTER_SCHOOL, seedBase });
  addWallBox(group, w, h, WALL_THICKNESS, 'plaster', { x: rx, y: h / 2, z: rz - d / 2 }, seedBase + 10, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWallBox(group, w, h, WALL_THICKNESS, 'plaster', { x: rx, y: h / 2, z: rz + d / 2 }, seedBase + 11, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWallBox(group, WALL_THICKNESS, h, d, 'plaster', { x: rx - w / 2, y: h / 2, z: rz }, seedBase + 12, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });

  // Floor + false ceiling (the real roof, below, sits well above).
  const floor = texturedFloor(w - WALL_THICKNESS * 2, d - WALL_THICKNESS * 2, 'concrete', { tileSize: 2, tint: CONCRETE_NEUTRAL });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(rx, 0.02, rz);
  group.add(floor);
  addThickBox(group, w - WALL_THICKNESS * 2, 0.1, d - WALL_THICKNESS * 2, 'concrete', { x: rx, y: 2.9, z: rz }, { tint: CONCRETE_NEUTRAL });

  // Band, matching each wall segment's own length/gap.
  addBox(group, w + 0.06, bandH, WALL_THICKNESS + 0.06, 'plaster', { x: rx, y: bandH / 2, z: rz - d / 2 }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(group, w + 0.06, bandH, WALL_THICKNESS + 0.06, 'plaster', { x: rx, y: bandH / 2, z: rz + d / 2 }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(group, WALL_THICKNESS + 0.06, bandH, d + 0.06, 'plaster', { x: rx - w / 2, y: bandH / 2, z: rz }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  const doorSegLen = (d - SCHOOL_ROOM_DOOR_WIDTH) / 2;
  addBox(group, WALL_THICKNESS + 0.06, bandH, doorSegLen + 0.06, 'plaster', { x: SCHOOL_ROOM_DOOR_X, y: bandH / 2, z: rz - d / 2 + doorSegLen / 2 }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(group, WALL_THICKNESS + 0.06, bandH, doorSegLen + 0.06, 'plaster', { x: SCHOOL_ROOM_DOOR_X, y: bandH / 2, z: rz + d / 2 - doorSegLen / 2 }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  kit.addPlinthRing(rx, rz, w, d, WALL_THICKNESS);
  kit.addCornerPilasters(rx, rz, w, d, h, WALL_THICKNESS);
  addThickBox(group, w + overhang * 2, 0.25, d + overhang * 2, 'concrete', { x: rx, y: h + 0.125, z: rz }, { tint: CONCRETE_NEUTRAL });

  // Real door + a step; a decorative window on the solid west wall (like every
  // other window in this file — not a passage, so the usual fake opening is fine).
  addDoorFrameZ(kit, { x: SCHOOL_ROOM_DOOR_X, y: 0, z: rz }, SCHOOL_ROOM_DOOR_WIDTH, 2.1, WALL_THICKNESS);
  kit.addStep({ x: SCHOOL_ROOM_DOOR_X + 0.3, y: 0.08, z: rz }, { x: 0.45, y: 0.16, z: 1.4 });
  kit.addOpening({ center: { x: rx - w / 2, y: 0, z: rz + 5 }, width: 1.3, height: 1.3, wallThickness: WALL_THICKNESS, widthAxis: 'z', sill: 1.1 });
  kit.addDrainpipe({ x: rx - w / 2 - 0.05, y: h / 2, z: rz - d / 2 - 0.05 }, h);

  // Furniture: blackboard + teacher's table/chair at the north end (the "front" of
  // the room), benches in rows facing them, a wall chart on the west wall.
  const blackboard = texturedBox(2.4, 1.1, 0.06, 'wood', { tint: 0x1c2a22, tileSize: 1 });
  blackboard.position.set(SCHOOL_BLACKBOARD_POSITION.x, SCHOOL_BLACKBOARD_POSITION.y, SCHOOL_BLACKBOARD_POSITION.z);
  group.add(blackboard);
  const teacherTable = texturedBox(1.1, 0.75, 0.5, 'wood', { tint: PALETTE.woodTrim, tileSize: 1 });
  teacherTable.position.set(rx, 0.375, rz - d / 2 + 1.6);
  group.add(teacherTable);
  const teacherChair = texturedBox(0.4, 0.75, 0.4, 'wood', { tint: 0x4a3a28, tileSize: 1 });
  teacherChair.position.set(rx, 0.375, rz - d / 2 + 2.4);
  group.add(teacherChair);
  const chart = texturedBox(1.2, 0.9, 0.04, 'wood', { tint: 0xdcd0a8, tileSize: 1 });
  chart.position.set(rx - w / 2 + 0.1, 1.6, rz + 2);
  group.add(chart);
  for (let row = 0; row < 5; row++) {
    const bench = texturedBox(3.4, 0.42, 0.35, 'wood', { tint: PALETTE.woodTrim, tileSize: 1 });
    bench.position.set(SCHOOL_BENCH_POSITION.x, 0.21, SCHOOL_BENCH_POSITION.z + row * 2.3);
    group.add(bench);
  }
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

  // Back (north) classroom block, plus the east wing — solid mass with decorative
  // fake openings, same as every other building here (see docs/parked.md's 2026-09-15
  // "real wall thickness" entry). The west wing is the one walkable classroom (item 4,
  // built separately below) so it's not in this generic loop.
  // Heights vary slightly between blocks so the skyline isn't one flat line.
  const blocks = [
    { w: 24, d: 6, x: cx, z: cz + 12 - 3, h: 3.7, doorAxis: 'x', doorSign: 1, windows: 2 }, // back, faces yard (+z)
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

  buildSchoolClassroom(group, kit);

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

  // Kadhai platform: 0.9m deep band nearest the street — tall/solid enough at the
  // front to be worth blocking (playtest structural fix: tagged here, at the
  // source, instead of a hand-typed matching box in src/collision.js).
  addBox(group, 0.9, 0.4, width, 'concrete', { x: xFront + 0.45, y: 0.2, z: cz }, { tint: KADHAI_PLATFORM_TINT, tintStrength: WALL_TINT_STRENGTH }).userData.collider = true;

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

export function buildHeroZone(scene, kit) {
  const group = new THREE.Group();
  group.name = 'hero_zone';
  group.add(buildLane());
  const house = buildHouse(kit);
  group.add(house.group);
  group.add(buildSchool(kit));
  group.add(buildHalwai(kit));
  scene.add(group);
  return {
    group,
    charpaiGroup: house.charpaiGroup,
    handPumpGroup: house.handPumpGroup,
    pumpWaterMesh: house.pumpWaterMesh,
    tulsiWaterMesh: house.tulsiWaterMesh,
  };
}

export { HOUSE_CENTER, SCHOOL_CENTER, HALWAI_CENTER };
