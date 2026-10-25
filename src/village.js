import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedBox, texturedWall, texturedThickBox, texturedWallBox, texturedFloor, getTiledMaterial, bakeFlatTintColors, ensureUv2 } from './materials.js';
import { getGLTFLoader } from './loaders.js';
import { buildStripSegment, buildKerbSegments } from './paths.js';
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
  // Step E (docs/FINISH_LINE.md — "the village still reads as a desert... ground
  // tone warmer and less grey", 2026-10-20) — a real, more saturated green for the
  // ground's own patchy grass tint (src/materials.js's applyGroundNoiseDetail) and
  // for flowering-plant foliage, distinct from greyGreen's deliberately dry/dusty
  // starting point above. Still earthy, not neon — see Mood board/1.png.
  grassGreen: 0x7c9452,
  marigold: 0xe8963a,
  bougainvillea: 0xc44d78,
};
export const WALL_TINT_STRENGTH = 0.3;
export const WALL_THICKNESS = 0.22; // law — see docs/look-standard.md

/** A deeper shade of the same hue, for bands/plinths — never a different, more
 * saturated colour (law). */
export function darken(hex, factor = 0.72) {
  return new THREE.Color(hex).multiplyScalar(factor).getHex();
}

// Blender pipeline (2026-10-20) — off-by-one from PALETTE.mustard (same reasoning
// as CONCRETE_HOUSE_ROOF above): src/bazaar.js's sabzi shop (unit 2) ALSO tints its
// walls PALETTE.mustard, so without this the house's walls would merge into the
// same shared bucket and hiding one would hide the other. Irrelevant once these
// meshes are hidden behind the new Blender model anyway, but needed now so they
// CAN be hidden without taking the sabzi shop's real, still-code-built walls with
// them.
const PLASTER_HOUSE = PALETTE.mustard + 1;
// Also isolated (see PLASTER_HOUSE above) — the interior partition wall shares
// PLASTER_HOUSE's own tint value by default, which would merge it into the SAME
// bucket as the 4 exterior walls once those get locally pre-merged below. The
// partition isn't part of the new Blender shell (interior, unaffected this pass)
// and must stay visible on its own, so it needs its own distinct tint too.
const PLASTER_HOUSE_PARTITION = 0xbccad4 + 2; // limewash blue-grey to match the Blender compound's own interior wall faces
const PLASTER_HALWAI = PALETTE.terracotta;
const PLASTER_SCHOOL = PALETTE.schoolYellow;
const SCHOOL_BAND = darken(PALETTE.schoolYellow);
const HOUSE_BAND = darken(PALETTE.mustard);
const WOOD_DOOR = PALETTE.woodTrim;
const CONCRETE_NEUTRAL = 0xd7d2c4; // already paler/less saturated than every palette value
// Blender pipeline (2026-10-20) — visually identical to CONCRETE_NEUTRAL (off by 1 in
// the blue channel, imperceptible) but a DIFFERENT tint value, so getTiledMaterial's
// cache key gives the house's roof/parapet their own Material object instead of
// sharing CONCRETE_NEUTRAL's — which merges into one shared bucket with every other
// building's floor/roof/staircase in the village. Without this, hiding "the house's
// roof" for the new Blender model would hide every other building's roof/floor too
// (src/assetSlots.js's hide-list works on real scene objects, and a shared merged
// mesh IS one real object). Only the house's roof/parapet use this — its floor/
// ceiling (not replaced by Blender yet) still share CONCRETE_NEUTRAL as before.
const CONCRETE_HOUSE_ROOF = 0xd7d2c5;
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
  frame.userData.collider = true; // solid bed (A0); mergeGroupByMaterial carries the box
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
  pumpBase.userData.collider = true; // solid post (A0); mergeGroupByMaterial carries the box
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
    const vessel = texturedBox(0.22, 0.22, 0.22, 'wood', { tint: 0xb5693f, tileSize: 1 }); // 'wood' family, not 'terracotta': the village-wide merge of the few raised terracotta props left it a lone floating mesh in the validator's grounding check once the temple kerb moved to Blender
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
  // Blender house rebuild (2026-10-21, docs/house-checklist.md) — the courtyard floor, low
  // compound walls and every new solid in the yard (south wall + gate, north returns, cattle
  // shed, jhoola, tree planter) are built here as an INVISIBLE, locally-merged 'house_yard_old'
  // group: it keeps the exact collision (and the validator's real-geometry backing) while
  // tools/blender/build_house.py's house_compound.glb draws everything you actually see.
  const houseYardOld = new THREE.Group();
  houseYardOld.name = 'house_yard_old';
  const floor = texturedFloor(18, 14, 'concrete', { tileSize: 2, tint: CONCRETE_NEUTRAL });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.015, cz);
  houseYardOld.add(floor);

  // Ground-floor house block, walkable (item 3): 4 real perimeter walls (a genuine
  // gap at the front door — see addGappedWall's doc comment) plus an interior
  // partition splitting it into a front room (just inside the door) and a back room,
  // each with its own real doorway. A staircase (below) climbs from the courtyard up
  // to the flat roof, which already existed and now doubles as the interior ceiling.
  // Blender pipeline (2026-10-20) — these 4 exterior walls are now replaced,
  // visually, by tools/blender/build_house.py's house_shell.glb (real bevels,
  // recessed door/windows, trim bands — docs/asset-slots.md's hide-list
  // convention, same as every Tripo slot). Built into their own local sub-group
  // and merged immediately below (not into the shared `group`) so the whole
  // exterior shell is ONE cleanly-hideable, still-just-2-draw-call object,
  // instead of getting folded into main.js's later VILLAGE-WIDE merge where it
  // couldn't be isolated from other buildings at all.
  const houseShellOld = new THREE.Group();
  houseShellOld.name = 'house_shell_old';
  addGappedWall(houseShellOld, { axis: 'x', length: blockW, height: blockH, thickness: WALL_THICKNESS, cx: blockCx, cz: HOUSE_DOOR_Z, gapWidth: HOUSE_DOOR_WIDTH, materialName: 'plaster', tint: PLASTER_HOUSE, seedBase });
  addWallBox(houseShellOld, blockW, blockH, WALL_THICKNESS, 'plaster', { x: blockCx, y: blockH / 2, z: blockCz - blockD / 2 }, seedBase + 10, { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWallBox(houseShellOld, WALL_THICKNESS, blockH, blockD, 'plaster', { x: blockCx - blockW / 2, y: blockH / 2, z: blockCz }, seedBase + 11, { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWallBox(houseShellOld, WALL_THICKNESS, blockH, blockD, 'plaster', { x: blockCx + blockW / 2, y: blockH / 2, z: blockCz }, seedBase + 12, { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addGappedWall(group, { axis: 'x', length: blockW, height: blockH, thickness: WALL_THICKNESS, cx: blockCx, cz: HOUSE_PARTITION_Z, gapWidth: HOUSE_PARTITION_DOOR_WIDTH, materialName: 'plaster', tint: PLASTER_HOUSE_PARTITION, seedBase: seedBase + 20 });

  // Interior floor + a false ceiling (the real roof, below, sits well above it) so
  // the rooms read as human-scaled rather than as tall as the full exterior mass.
  const interiorFloor = texturedFloor(blockW - WALL_THICKNESS * 2, blockD - WALL_THICKNESS * 2, 'concrete', { tileSize: 2, tint: CONCRETE_NEUTRAL });
  interiorFloor.rotation.x = -Math.PI / 2;
  interiorFloor.position.set(blockCx, 0.02, blockCz);
  group.add(interiorFloor);
  const ceilingY = 3.15;
  addThickBox(group, blockW - WALL_THICKNESS * 2, 0.1, blockD - WALL_THICKNESS * 2, 'concrete', { x: blockCx, y: ceilingY, z: blockCz }, { tint: CONCRETE_NEUTRAL });

  // Painted skirt band along the base of each wall segment — also superseded by
  // the Blender shell's own trim bands (see houseShellOld above), so these go
  // into the same hideable sub-group instead of the shared `group`.
  const houseBandH = 1.0;
  const doorSegLen = (blockW - HOUSE_DOOR_WIDTH) / 2;
  addBox(houseShellOld, doorSegLen + 0.06, houseBandH, WALL_THICKNESS + 0.06, 'plaster', { x: blockCx - blockW / 2 + doorSegLen / 2, y: houseBandH / 2, z: HOUSE_DOOR_Z }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(houseShellOld, doorSegLen + 0.06, houseBandH, WALL_THICKNESS + 0.06, 'plaster', { x: blockCx + blockW / 2 - doorSegLen / 2, y: houseBandH / 2, z: HOUSE_DOOR_Z }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(houseShellOld, blockW + 0.06, houseBandH, WALL_THICKNESS + 0.06, 'plaster', { x: blockCx, y: houseBandH / 2, z: blockCz - blockD / 2 }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(houseShellOld, WALL_THICKNESS + 0.06, houseBandH, blockD + 0.06, 'plaster', { x: blockCx - blockW / 2, y: houseBandH / 2, z: blockCz }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(houseShellOld, WALL_THICKNESS + 0.06, houseBandH, blockD + 0.06, 'plaster', { x: blockCx + blockW / 2, y: houseBandH / 2, z: blockCz }, { tint: HOUSE_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  // (the shared kit's plinth ring + corner pilasters are no longer added for the house —
  // the Blender compound model has its own plinth band, pilasters and door step)

  // Flat concrete roof with a parapet lip — overhangs the wall by 0.3m, visible edge.
  // Into houseShellOld too (see its own comment above) — the roof's TOP surface is
  // still the real walkable floor up there (same box, collider unaffected by
  // visibility), just rendered by the new Blender model once this is hidden.
  const overhang = 0.3;
  addThickBox(houseShellOld, blockW + overhang * 2, 0.3, blockD + overhang * 2, 'concrete', { x: blockCx, y: HOUSE_ROOF_Y, z: blockCz }, { tint: CONCRETE_HOUSE_ROOF });
  const parapetY = HOUSE_ROOF_Y + 0.55;
  addThickBox(houseShellOld, blockW + overhang * 2, 0.8, 0.2, 'concrete', { x: blockCx, y: parapetY, z: blockCz - blockD / 2 - 0.1 }, { tint: CONCRETE_HOUSE_ROOF });
  addThickBox(houseShellOld, blockW + overhang * 2, 0.8, 0.2, 'concrete', { x: blockCx, y: parapetY, z: blockCz + blockD / 2 + 0.1 }, { tint: CONCRETE_HOUSE_ROOF });
  addThickBox(houseShellOld, 0.2, 0.8, blockD, 'concrete', { x: blockCx - blockW / 2 - 0.1, y: parapetY, z: blockCz }, { tint: CONCRETE_HOUSE_ROOF });
  addThickBox(houseShellOld, 0.2, 0.8, blockD, 'concrete', { x: blockCx + blockW / 2 - 0.1, y: parapetY, z: blockCz }, { tint: CONCRETE_HOUSE_ROOF });
  mergeGroupByMaterial(houseShellOld); // 2 draw calls (plaster + concrete), isolated — see its own comment above
  group.add(houseShellOld);

  // Interior doorway — frame only (jambs + lintel), no reveal/leaf, since it's a
  // real passage (see addDoorFrameX's doc comment). The FRONT door's own frame is
  // no longer added here — tools/blender/build_house.py's Blender model builds its
  // own door jamb/lintel/reveal geometry directly into the house_shell.glb (real
  // bevels/recess, not a shared instanced trim bar), so a code-built frame at the
  // exact same opening would just double up/z-fight with it.
  addDoorFrameX(kit, { x: blockCx, y: 0, z: HOUSE_PARTITION_Z }, HOUSE_PARTITION_DOOR_WIDTH, 2.1, WALL_THICKNESS);
  kit.addSwitchboard({ x: blockCx + 1.4, y: 1.4, z: HOUSE_DOOR_Z + 0.02 });

  // Staircase, courtyard side of the west wall, climbing from the ground up to the
  // roof (item 3's "staircase to the roof").
  const s = HOUSE_STAIRS;
  const stairSteps = 10;
  const stairDepth = (s.zStart - s.zEnd) / stairSteps;
  group.add(buildStaircase(s.x, s.zStart, stairSteps, stairDepth, s.yTop / stairSteps, s.width, 'concrete', 0xb4c1cd));

  // Low compound walls, east/west courtyard edges (south stays open onto the lane).
  const wallH = 1.6;
  addWall(houseYardOld, 14, wallH, 'plaster', { x: cx - 9, y: wallH / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWall(houseYardOld, 14, wallH, 'plaster', { x: cx + 9, y: wallH / 2, z: cz }, 'z', { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  // New solids drawn by the Blender model (offsets from HOUSE_CENTER — keep in sync with
  // tools/blender/build_house.py): south boundary wall with a 2.6m gate gap at x=0 (just north
  // of the lane waypoints at z=46 the validator walks), the two north returns, the cattle
  // shed, the jhoola frame and the brick tree planter.
  const yardWall = (len, x, z, alongX = true) => {
    addWallBox(houseYardOld, alongX ? len : WALL_THICKNESS, wallH, alongX ? WALL_THICKNESS : len, 'plaster', { x: cx + x, y: wallH / 2, z: cz + z }, seedBase + 30 + x + z, { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  };
  yardWall(9.11 - 1.3, -(9.11 + 1.3) / 2, 6.4); // south wall, west of the gate
  yardWall(9.11 - 1.3, (9.11 + 1.3) / 2, 6.4); // south wall, east of the gate
  yardWall(2.51, -(9.11 + 6.6) / 2, -7); // north return, west yard
  yardWall(4.0, (9.11 + 5.11) / 2, -7); // north return, east yard
  const solid = (w, h, d, mat, x, z, tint) => {
    const m = texturedThickBox(w, h, d, mat, { tileSize: 2, tint });
    m.position.set(cx + x, h / 2, cz + z);
    houseYardOld.add(m);
  };
  solid(3.7, 2.2, 3.7, 'wood', 7.1, -5.0, 0x5a4636); // cattle shed (whole footprint)
  solid(1.8, 2.25, 2.2, 'wood', 7.0, -1.8, 0x5a4636); // jhoola frame
  solid(2.0, 0.55, 2.0, 'brick', 7.0, 3.4, 0xa4563a); // tree planter
  addWallBox(houseYardOld, 2.46, 3.2, 11.6, 'plaster', { x: cx - 7.88, y: 1.6, z: cz - 1.2 }, seedBase + 41, { tint: PLASTER_HOUSE, tileSize: 2, tintStrength: WALL_TINT_STRENGTH }); // west wing of rooms enclosing the aangan (build_house.py build_west_wing: x[-9.11,-6.8] z[-7,4.6]); addWallBox so it is a real tagged collider
  mergeGroupByMaterial(houseYardOld);
  group.add(houseYardOld);

  // Task 2 (draw-call budget) — every plaster-family mesh above shares one Material
  // (tint baked into vertex colour, see materials.js), and every concrete-family one
  // shares another, so this folds house_compound's ~20 meshes down to ~2. Runs
  // before the interior props below are added, so they get their own (small) merge
  // groups instead of being swept into these two.
  mergeGroupByMaterial(group, { skipNames: ['house_shell_old', 'house_yard_old'] });

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
function buildSchoolClassroom(group, schoolOld, kit) {
  const { w, h, d, cx: rx, cz: rz } = SCHOOL_ROOM;
  const seedBase = rx * 3.1 + rz * 1.7;
  const overhang = 0.3;
  const bandH = 0.9;

  addGappedWall(schoolOld, { axis: 'z', length: d, height: h, thickness: WALL_THICKNESS, cx: SCHOOL_ROOM_DOOR_X, cz: rz, gapWidth: SCHOOL_ROOM_DOOR_WIDTH, materialName: 'plaster', tint: PLASTER_SCHOOL, seedBase });
  addWallBox(schoolOld, w, h, WALL_THICKNESS, 'plaster', { x: rx, y: h / 2, z: rz - d / 2 }, seedBase + 10, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWallBox(schoolOld, w, h, WALL_THICKNESS, 'plaster', { x: rx, y: h / 2, z: rz + d / 2 }, seedBase + 11, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addWallBox(schoolOld, WALL_THICKNESS, h, d, 'plaster', { x: rx - w / 2, y: h / 2, z: rz }, seedBase + 12, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });

  // Floor + false ceiling (the real roof, below, sits well above).
  const floor = texturedFloor(w - WALL_THICKNESS * 2, d - WALL_THICKNESS * 2, 'concrete', { tileSize: 2, tint: CONCRETE_NEUTRAL });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(rx, 0.02, rz);
  group.add(floor);
  addThickBox(group, w - WALL_THICKNESS * 2, 0.1, d - WALL_THICKNESS * 2, 'concrete', { x: rx, y: 2.9, z: rz }, { tint: CONCRETE_NEUTRAL });

  // Band, matching each wall segment's own length/gap.
  addBox(schoolOld, w + 0.06, bandH, WALL_THICKNESS + 0.06, 'plaster', { x: rx, y: bandH / 2, z: rz - d / 2 }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(schoolOld, w + 0.06, bandH, WALL_THICKNESS + 0.06, 'plaster', { x: rx, y: bandH / 2, z: rz + d / 2 }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(schoolOld, WALL_THICKNESS + 0.06, bandH, d + 0.06, 'plaster', { x: rx - w / 2, y: bandH / 2, z: rz }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  const doorSegLen = (d - SCHOOL_ROOM_DOOR_WIDTH) / 2;
  addBox(schoolOld, WALL_THICKNESS + 0.06, bandH, doorSegLen + 0.06, 'plaster', { x: SCHOOL_ROOM_DOOR_X, y: bandH / 2, z: rz - d / 2 + doorSegLen / 2 }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addBox(schoolOld, WALL_THICKNESS + 0.06, bandH, doorSegLen + 0.06, 'plaster', { x: SCHOOL_ROOM_DOOR_X, y: bandH / 2, z: rz + d / 2 - doorSegLen / 2 }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  addThickBox(schoolOld, w + overhang * 2, 0.25, d + overhang * 2, 'concrete', { x: rx, y: h + 0.125, z: rz }, { tint: CONCRETE_NEUTRAL });

  // Real door + a step; a decorative window on the solid west wall (like every
  // other window in this file — not a passage, so the usual fake opening is fine).

  // Furniture: blackboard + teacher's table/chair at the north end (the "front" of
  // the room), benches in rows facing them, a wall chart on the west wall.
  furnishClassroom(group);
}

/** One canvas atlas for every paper/slate surface in the classroom (blackboard + 3 wall charts):
 * one material named 'signboard' (wall-mounted, elevated by design: world-validator check 2 exempts
 * that name), one draw call. Cells: board 1024x470 on top row, three 341x256 charts below. */
const CLASSROOM_ATLAS = { W: 1024, H: 750, board: { y: 0, h: 470 }, chartW: 341, chartY: 470, chartH: 256 };
function buildClassroomAtlas() {
  const { W, H, board, chartW, chartY, chartH } = CLASSROOM_ATLAS;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.save(); g.beginPath(); g.rect(0, board.y, W, board.h); g.clip(); g.translate(0, board.y); chalkBoardPaint(g, W, board.h); g.restore();
  for (let k = 0; k < 3; k++) {
    g.save(); g.beginPath(); g.rect(k * chartW, chartY, chartW, chartH); g.clip(); g.translate(k * chartW, chartY); chartPaint(k)(g, chartW, chartH); g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 });
  material.name = 'signboard';
  return material;
}
/** A plane (w x h) showing atlas rect (u0,v0,u1,v1 in canvas px), placed and yawed. */
function atlasPlane(material, w, h, rect, x, y, z, ry, rz = 0) {
  const { W, H } = CLASSROOM_ATLAS;
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (rect[0] + uv.getX(i) * (rect[2] - rect[0])) / W, 1 - (rect[3] - uv.getY(i) * (rect[3] - rect[1])) / H);
  }
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.rotation.set(0, ry, rz, 'YXZ');
  return m;
}

function chalkBoardPaint(g, W, H) {
  g.fillStyle = '#26332c'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { // faint wiped-chalk smears
    g.fillStyle = `rgba(210,215,205,${0.01 + Math.random() * 0.025})`;
    g.fillRect(Math.random() * W, Math.random() * H, 60 + Math.random() * 220, 10 + Math.random() * 26);
  }
  g.fillStyle = 'rgba(238,238,228,0.88)';
  g.textBaseline = 'alphabetic';
  g.font = `${H * 0.17}px "Segoe Print","Bradley Hand","Noto Sans Devanagari",cursive`;
  g.fillText('Class 5  -  Tuesday', W * 0.05, H * 0.2);
  g.font = `${H * 0.15}px "Noto Sans Devanagari","Kohinoor Devanagari",sans-serif`;
  g.fillText('\u0917\u0923\u093f\u0924 : \u0906\u0920 \u0915\u093e \u092a\u0939\u093e\u0921\u093c\u093e', W * 0.05, H * 0.42);
  g.font = `${H * 0.15}px "Segoe Print","Bradley Hand",cursive`;
  for (let i = 1; i <= 5; i++) g.fillText(`8 x ${i} = ${8 * i}`, W * 0.06, H * (0.42 + i * 0.105));
  g.font = `${H * 0.13}px "Segoe Print","Bradley Hand",cursive`;
  g.fillText('Spelling: mango  canal', W * 0.52, H * 0.62);
  g.fillText('Homework: page 14', W * 0.52, H * 0.82);
  g.strokeStyle = 'rgba(238,238,228,0.7)'; g.lineWidth = 3; // underline, as a teacher would
  g.beginPath(); g.moveTo(W * 0.05, H * 0.235); g.lineTo(W * 0.5, H * 0.24); g.stroke();
}

function chartPaint(kind) {
  return (g, W, H) => {
    g.fillStyle = kind === 0 ? '#e9d9a6' : kind === 1 ? '#cfe0d0' : '#e8c7b8';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(90,60,40,0.55)'; g.lineWidth = 6; g.strokeRect(10, 10, W - 20, H - 20);
    g.fillStyle = '#5a2a1e'; g.textAlign = 'center';
    if (kind === 0) {
      g.font = `${H * 0.13}px "Noto Sans Devanagari",sans-serif`;
      g.fillText('\u0905  \u0906  \u0907  \u0908  \u0909  \u090a', W / 2, H * 0.3);
      g.fillText('\u0915  \u0916  \u0917  \u0918  \u0919', W / 2, H * 0.55);
      g.fillText('\u091a  \u091b  \u091c  \u091d', W / 2, H * 0.8);
    } else if (kind === 1) {
      g.font = `bold ${H * 0.13}px sans-serif`;
      g.fillText('A  B  C  D  E', W / 2, H * 0.3);
      g.fillText('F  G  H  I  J', W / 2, H * 0.55);
      g.fillText('K  L  M  N  O', W / 2, H * 0.8);
    } else {
      g.font = `bold ${H * 0.11}px sans-serif`;
      g.fillText('Wash your hands', W / 2, H * 0.3);
      g.fillStyle = '#244a6a'; g.fillRect(W * 0.2, H * 0.42, W * 0.6, H * 0.45);
      g.fillStyle = '#e8e2d0'; g.font = `${H * 0.09}px sans-serif`;
      g.fillText('Clean school', W / 2, H * 0.62);
      g.fillText('Healthy village', W / 2, H * 0.78);
    }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,90,60,${Math.random() * 0.08})`; g.fillRect(Math.random() * W, Math.random() * H, 30, 30); }
  };
}

/** The classroom's contents (CLAUDE.md 5b rule 3): painted blackboard with chalk lesson, frame and
 * ledge, teacher's table with register, desk-benches in rows with per-piece wear, wall charts,
 * water pot with mug, cupboard, school bell, hanging bulb, scattered slates and bags. Walls/ceiling
 * x range is rx +/- 3, z range rz +/- 9; the door is on the east face at z = rz. */
function furnishClassroom(group) {
  const { w, h, d, cx: rx, cz: rz } = SCHOOL_ROOM;
  let seed = 41;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const jit = (a) => (rnd() - 0.5) * 2 * a;
  const WOODS = [0xd8aa74, 0xc29666, 0xe6bd88, 0xb48a5c, 0xd4a878]; // lighter: the tint multiplies a dark wood map
  const put = (m, x, y, z, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m; };
  const wood = (bw, bh, bd, x, y, z, ry, tint) => put(texturedBox(bw, bh, bd, 'wood', { tint, tileSize: 0.8 }), x, y, z, ry);
  const metal = (bw, bh, bd, x, y, z, ry, tint) => put(texturedBox(bw, bh, bd, 'metal', { tint, tileSize: 0.8 }), x, y, z, ry);
  const front = rz - d / 2 + 0.15; // north wall inner face (blackboard wall)

  // Blackboard: painted board in a wooden frame with a chalk ledge, duster and chalk.
  const bb = SCHOOL_BLACKBOARD_POSITION;
  const atlasMat = buildClassroomAtlas();
  group.add(atlasPlane(atlasMat, 2.4, 1.1, [0, 0, 1024, 470], bb.x, bb.y, front + 0.075, 0));
  for (const [fw, fh, fx, fy] of [[2.56, 0.08, 0, 0.59], [2.56, 0.08, 0, -0.59], [0.08, 1.26, -1.24, 0], [0.08, 1.26, 1.24, 0]]) wood(fw, fh, 0.07, bb.x + fx, bb.y + fy, front + 0.055, 0, 0x5a3e28);
  wood(2.4, 0.04, 0.1, bb.x, bb.y - 0.64, front + 0.1, 0, 0x6a4a30);
  wood(0.12, 0.05, 0.06, bb.x - 0.7, bb.y - 0.6, front + 0.1, 0.2, 0xc9c1a6); // duster
  wood(0.05, 0.015, 0.015, bb.x + 0.2, bb.y - 0.61, front + 0.11, 0.5, 0xeeeeee); // chalk

  // Teacher: table with drawer front, register + pen pot, cane-seat chair.
  const tz = rz - d / 2 + 1.7;
  wood(1.2, 0.05, 0.6, rx, 0.76, tz, 0, WOODS[2]);
  for (const [lx, lz] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) wood(0.06, 0.74, 0.06, rx + lx, 0.37, tz + lz, 0, WOODS[1]);
  wood(1.0, 0.16, 0.02, rx, 0.65, tz + 0.29, 0, WOODS[3]);
  wood(0.3, 0.025, 0.4, rx - 0.3, 0.80, tz, 0.15, 0x7a2a22); // register
  metal(0.06, 0.09, 0.06, rx + 0.35, 0.84, tz - 0.1, 0, 0x3a4a5a); // pen pot
  const cz2 = tz + 0.95;
  wood(0.42, 0.04, 0.42, rx + 0.05, 0.45, cz2, 0.12, WOODS[0]);
  wood(0.42, 0.45, 0.04, rx + 0.05, 0.7, cz2 + 0.2, 0.12, WOODS[0]);
  for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) wood(0.04, 0.44, 0.04, rx + 0.05 + lx, 0.22, cz2 + lz, 0.12, WOODS[1]);

  // Student desk-benches: low desk plank + seat plank on shared legs, 2 per row facing the board,
  // each with its own tint, small yaw error and a book/slate on top.
  const rowsZ = []; for (let i = 0; i < 5; i++) rowsZ.push(rz - d / 2 + 4 + i * 2.5);
  for (const [r, zz] of rowsZ.entries()) {
    for (const side of [-1, 1]) {
      const bx = rx + side * 1.15 + jit(0.06);
      const yaw = jit(0.035);
      const t = WOODS[Math.floor(rnd() * WOODS.length)];
      wood(1.5, 0.045, 0.38, bx, 0.62, zz, yaw, t); // desk top
      wood(1.5, 0.04, 0.28, bx, 0.34, zz + 0.62, yaw, t); // seat
      for (const lx of [-0.68, 0.68]) {
        wood(0.05, 0.62, 0.34, bx + lx, 0.31, zz, yaw, WOODS[1]);
        wood(0.05, 0.34, 0.26, bx + lx, 0.17, zz + 0.62, yaw, WOODS[1]);
      }
      wood(1.5, 0.03, 0.04, bx, 0.6, zz + 0.18, yaw, 0x6a4a30); // pencil groove lip
      // On the desk: an exercise book or a slate, never identical.
      if (rnd() < 0.8) wood(0.22 + jit(0.03), 0.015, 0.3, bx + jit(0.45), 0.655, zz, jit(0.5), [0x2a4f7a, 0x7a2a22, 0xcfc6a6, 0x2f5a3a][Math.floor(rnd() * 4)]);
      if (rnd() < 0.4) wood(0.2, 0.012, 0.15, bx + jit(0.5), 0.67, zz + 0.05, jit(0.4), 0x2a2e2a); // slate
      // School bag leaning/slumped beside some benches.
      if (rnd() < 0.5) {
        const bag = wood(0.3, 0.38, 0.14, bx + side * 0.95, 0.19, zz + 0.45, jit(0.6), [0x2a4a6a, 0x8a3a2a, 0x3a5a3a, 0x6a5a2a][Math.floor(rnd() * 4)]);
        bag.rotation.z = jit(0.12);
      }
    }
  }

  // West wall: charts (each different), a framed notice, a calendar-sized board.
  const west = rx - w / 2 + 0.13;
  [[0, rz - 3.5], [1, rz + 0.3], [2, rz + 3.6]].forEach(([k, zz], i) => {
    const cw = CLASSROOM_ATLAS.chartW;
    group.add(atlasPlane(atlasMat, 1.2, 0.9, [k * cw, 470, (k + 1) * cw, 726], west, 1.65 + jit(0.06), zz, Math.PI / 2, jit(0.03)));
  });
  // North wall beside the board: a framed picture and a hanging clock-ish disc.
  metal(0.36, 0.36, 0.04, rx + 2.0, 2.45, front + 0.05, 0, 0xe8e2d0); // wall clock

  // East wall (door side): water pot on an iron stand with mug, cupboard, bell.
  const east = rx + w / 2 - 0.35;
  for (let i = 0; i < 3; i++) { // iron tripod stand
    const a = i * 2.094;
    metal(0.025, 0.55, 0.025, east + Math.cos(a) * 0.2, 0.275, rz + 3.2 + Math.sin(a) * 0.2, 0, 0x2a2a2a);
  }
  wood(0.5, 0.42, 0.5, east, 0.8, rz + 3.2, 0.4, 0x8a4a30); // matka body
  wood(0.36, 0.2, 0.36, east, 1.05, rz + 3.2, 0.9, 0x7a4028); // matka shoulder
  metal(0.2, 0.03, 0.2, east, 1.1, rz + 3.2, 0, 0x7a3a22); // lid
  metal(0.08, 0.1, 0.08, east + 0.2, 0.62, rz + 3.5, 0, 0x8a8f94); // steel mug
  // Cupboard (almirah): doors, handles, shelf top with a stack of registers.
  const cup = { x: rx + w / 2 - 0.45, z: rz - 6.5 };
  wood(0.5, 1.8, 1.0, cup.x, 0.9, cup.z, 0, 0x3a5a52);
  wood(0.02, 1.6, 0.46, cup.x - 0.26, 0.9, cup.z - 0.24, 0, 0x2f4a43);
  wood(0.02, 1.6, 0.46, cup.x - 0.26, 0.9, cup.z + 0.24, 0, 0x2f4a43);
  metal(0.03, 0.12, 0.02, cup.x - 0.28, 0.95, cup.z - 0.03, 0, 0x9a9a8a);
  metal(0.03, 0.12, 0.02, cup.x - 0.28, 0.95, cup.z + 0.03, 0, 0x9a9a8a);
  for (let i = 0; i < 4; i++) wood(0.3 + jit(0.04), 0.04, 0.4, cup.x + jit(0.03), 1.84 + i * 0.045, cup.z + jit(0.1), jit(0.15), [0x7a2a22, 0x2a4f7a, 0xcfc6a6, 0x3a5a3a][i]);
  // School bell: brass bell on a bracket by the door, with a short rope.
  const bellZ = rz - 0.9;
  metal(0.05, 0.05, 0.3, east + 0.2, 2.35, bellZ, 0, 0x3a2a1c);
  metal(0.22, 0.2, 0.22, east + 0.2, 2.2, bellZ - 0.1, 0.4, 0xb88a3a); // brass bell
  metal(0.12, 0.08, 0.12, east + 0.2, 2.32, bellZ - 0.1, 0.4, 0xa07a30);
  metal(0.012, 0.5, 0.012, east + 0.2, 1.9, bellZ - 0.1, 0, 0x8a7a5a);

  // Ceiling: a single hanging bulb on a flex, a fan with three blades.
  const ceilY = 2.85;
  metal(0.012, 0.35, 0.012, rx - 0.3, ceilY - 0.17, rz + 1, 0, 0x1a1a1a);
  metal(0.1, 0.12, 0.1, rx - 0.3, ceilY - 0.4, rz + 1, 0, 0xfff1c8); // bulb
  const fanX = rx, fanZ = rz - 3;
  metal(0.02, 0.3, 0.02, fanX, ceilY - 0.15, fanZ, 0, 0x2a2a2a);
  metal(0.14, 0.08, 0.14, fanX, ceilY - 0.33, fanZ, 0, 0xcfc6a6);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + 0.3;
    metal(0.55, 0.012, 0.11, fanX + Math.cos(a) * 0.32, ceilY - 0.36, fanZ + Math.sin(a) * 0.32, -a, 0xcfc6a6);
  }
  // Floor clutter near the door: a broom of thin sticks, two scattered chalk-slates, a jute mat.
  metal(0.03, 1.1, 0.03, east - 0.1, 0.55, rz + 1.3, 0, 0x6a5a30).rotation.z = 0.12;
  wood(0.55, 0.012, 0.35, rx + w / 2 - 1.1, 0.03, rz + 0.4, 0.2, 0x9a8458); // door mat
}

function buildSchool(kit) {
  const group = new THREE.Group();
  group.name = 'school_compound';
  const cx = SCHOOL_CENTER.x;
  const cz = SCHOOL_CENTER.z;

  // Blender school rebuild (2026-10-21, docs/school-checklist.md): every wall/roof/band/yard solid is
  // built into this INVISIBLE locally-merged 'school_old' group — it keeps the exact collision and the
  // validator's real-geometry backing while tools/blender/build_school.py's school_compound.glb draws
  // what you actually see. The classroom's interior (floor, false ceiling, benches, blackboard,
  // teacher's table) stays visible code geometry in `group`.
  const schoolOld = new THREE.Group();
  schoolOld.name = 'school_old';

  // Yard floor: no longer drawn (the Blender yard is bare packed earth like the reference) but kept as hidden geometry.
  const floor = texturedFloor(30, 24, 'concrete', { tileSize: 2, tint: CONCRETE_NEUTRAL });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.015, cz);
  schoolOld.add(floor);

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
    addWallBox(schoolOld, b.w, b.h, b.d, 'plaster', { x: b.x, y: b.h / 2, z: b.z }, b.x * 3.1 + b.z * 1.7, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
    addBox(schoolOld, b.w + 0.06, bandH, b.d + 0.06, 'plaster', { x: b.x, y: bandH / 2, z: b.z }, { tint: SCHOOL_BAND, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
    addThickBox(schoolOld, b.w + overhang * 2, 0.25, b.d + overhang * 2, 'concrete', { x: b.x, y: b.h + 0.125, z: b.z }, { tint: CONCRETE_NEUTRAL });
  }

  buildSchoolClassroom(group, schoolOld, kit);

  // New solids drawn by the Blender model (offsets from SCHOOL_CENTER — keep in sync with
  // tools/blender/build_school.py): south boundary wall with a 4.8 m gate gap, wall returns at the four
  // corners, verandah pillars, gate pillars, the brick tree ring, the vegetable-plot fence and the tin shed.
  const WH = 1.6;
  const wallAt = (len, x, z, alongX) => {
    addWallBox(schoolOld, alongX ? len : WALL_THICKNESS, WH, alongX ? WALL_THICKNESS : len, 'plaster', { x: cx + x, y: WH / 2, z: cz + z }, cx * 3.1 + x + z, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  };
  wallAt(15.11 - 2.7, -(15.11 + 2.7) / 2, -12, true); // south wall west of the gate
  wallAt(15.11 - 2.7, (15.11 + 2.7) / 2, -12, true); // south wall east of the gate
  wallAt(3.0, -15, -10.6, false); // west/east wall returns south of the wings
  wallAt(3.0, 15, -10.6, false);
  wallAt(3.0, -15, 10.6, false); // ...and north of them
  wallAt(3.0, 15, 10.6, false);
  wallAt(3.0, -13.5, 12, true); // north corner returns beside the main block
  wallAt(3.0, 13.5, 12, true);
  const pil = (x, z, w = 0.4, h = 3.6) => {
    addWallBox(schoolOld, w, h, w, 'plaster', { x: cx + x, y: h / 2, z: cz + z }, cx * 3.1 + x * 7 + z, { tint: PLASTER_SCHOOL, tileSize: 2, tintStrength: WALL_TINT_STRENGTH });
  };
  for (const x of [-8, -4, 0, 4, 8]) pil(x, 4.0); // main verandah
  for (const z of [-8, -4, 3.2]) { pil(7.0, z); pil(-6.89, z === 3.2 ? 4 : z); } // east + west wing verandahs
  pil(-2.7, -12, 0.6, 2.5); // gate pillars
  pil(2.7, -12, 0.6, 2.5);
  const solid = (w, h, d, mat, x, z, tint) => {
    const m = texturedThickBox(w, h, d, mat, { tileSize: 2, tint });
    m.position.set(cx + x, h / 2, cz + z);
    schoolOld.add(m);
  };
  solid(3.2, 0.9, 3.2, 'brick', -4.5, -6.2, 0xb5603e); // tree ring
  solid(3.2, 1.0, 4.2, 'wood', 4.5, -6.4, 0x6a5238); // vegetable plot fence
  solid(4.6, 2.2, 2.3, 'wood', 12.5, -10.65, 0x6a5238); // tin shed

  // Task 2 (draw-call budget) — folds the 3 wallBox + 3 band walls into one
  // 'plaster' mesh, the floor + 3 roofs into one 'concrete' mesh, and the 3 gate
  // bars into one 'metal' mesh (~13 meshes -> 3).
  mergeGroupByMaterial(schoolOld);
  group.add(schoolOld);
  mergeGroupByMaterial(group, { skipNames: ['school_old'] });

  return group;
}

function buildHalwai(kit) {
  const group = new THREE.Group();
  group.name = 'halwai_shop';
  // Blender halwai rebuild (2026-10-21, docs/halwai-checklist.md): all code geometry below is the
  // INVISIBLE collision/validator backing (this whole 'halwai_shop' group is hidden by the slot); tools/blender/build_halwai.py's
  // halwai_compound.glb draws the shop. (Collision: the roof slab is a 2D collider over the whole footprint.)
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

  // Kadhai platform: 0.9m deep band nearest the street — tall/solid enough at the
  // front to be worth blocking (playtest structural fix: tagged here, at the
  // source, instead of a hand-typed matching box in src/collision.js).
  addBox(group, 0.9, 0.4, width, 'concrete', { x: xFront + 0.45, y: 0.2, z: cz }, { tint: KADHAI_PLATFORM_TINT, tintStrength: WALL_TINT_STRENGTH }).userData.collider = true;

  // Sweet display cabinet, in the 0.6m band after the 2.5m working aisle.
  addBox(group, 0.6, 1.6, 1.5, 'wood', { x: xBack - 0.55, y: 0.8, z: cz - 1 }, { tint: WOOD_DOOR, tileSize: 1 });

  // Two plastic chairs outside the open (south) side.
  addBox(group, 0.4, 0.4, 0.4, 'wood', { x: cx - 0.5, y: 0.2, z: cz + width / 2 + 0.6 }, { tint: 0xb23a3a, tileSize: 1 });
  addBox(group, 0.4, 0.4, 0.4, 'wood', { x: cx + 0.5, y: 0.2, z: cz + width / 2 + 1.1 }, { tint: 0x3a9955, tileSize: 1 });

  // Task 2 (draw-call budget) — folds the 2 walls + roof into one 'plaster'/
  // 'concrete' pair, and the kadhai platform + cabinet + 2 chairs (three different
  // tints) into one 'concrete' + one 'wood' mesh. Runs before the clay pots' async
  // GLTF load resolves, so they're added afterwards untouched (own draw calls).
  mergeGroupByMaterial(group);

  return group;
}

// The lane ends at the school's south gate (z = centre - 13), not at the compound's centre, so it no longer runs through the yard wall.
const SCHOOL_GATE_LANE_END = (() => {
  const z = SCHOOL_CENTER.z - 13;
  const t = (z - HALWAI_CENTER.z) / (SCHOOL_CENTER.z - HALWAI_CENTER.z);
  return { x: HALWAI_CENTER.x + (SCHOOL_CENTER.x - HALWAI_CENTER.x) * t, z };
})();

function buildLane() {
  // Task 2 (draw-call budget) — both segments share the lane's default tint, and
  // buildStripSegment now bakes its own repeat/tint into the geometry (see
  // paths.js), so they merge into a single mesh instead of a 2-mesh group.
  const mesh = mergeMeshList(
    [buildStripSegment({ x: HOUSE_CENTER.x, z: HOUSE_CENTER.z + 8.6 }, HALWAI_CENTER, 6, { seed: 1.0, ruts: true }), buildStripSegment(HALWAI_CENTER, SCHOOL_GATE_LANE_END, 6, { seed: 2.0, ruts: true }), ...buildKerbSegments(HALWAI_CENTER, SCHOOL_GATE_LANE_END, 6, 0.12, 0.88, { seed: 2.0 })],
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
