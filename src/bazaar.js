import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedWallBox, texturedThickBox, getTiledMaterial } from './materials.js';
import { PALETTE, darken, WALL_TINT_STRENGTH, WALL_THICKNESS } from './village.js';
import { BuildingKit } from './buildingKit.js';
import { mergeGroupByMaterial } from './mergeUtils.js';

/**
 * Bazaar row — Places V1/bazaar_row/LAYOUT.md is the authority for counts, names,
 * colours, sizes (its own reference image undercounts the shutters by one; LAYOUT.md
 * itself flags this and says build eight). ONE continuous terrace, not eight separate
 * buildings — the eight units share party walls; only the shopfronts (item 2) and
 * interiors (item 3) distinguish them.
 */

export const BAZAAR_UNIT_W = 4.5;
export const BAZAAR_UNIT_D = 5;
export const BAZAAR_PARAPET_H = 4;
export const BAZAAR_AWNING_EDGE_H = 2.8;
export const BAZAAR_COUNTER_H = 0.9;
export const BAZAAR_WEST_X = -100; // unit 1's west (outer) edge
export const BAZAAR_ROW_CZ = 15; // row centreline z; shopfronts open south (-z) toward the lane/chowk
export const BAZAAR_FRONT_Z = BAZAAR_ROW_CZ - BAZAAR_UNIT_D / 2; // open face
export const BAZAAR_EAST_X = BAZAAR_WEST_X + BAZAAR_UNIT_W * 8; // = -64, unit 8's east (outer) edge, chowk end

// Eight units, exact spellings/colours from LAYOUT.md's table — never from the
// reference image (it renders garbled English: "Sabri Shop", "Garber Shop", etc).
// Wall tint cycles through 7 of the 8 look-standard.md palette hues (woodTrim is trim,
// not a wall colour) so no two ADJACENT units share one — this session's own item 1
// instruction ("its own palette colour... no two adjacent the same"), layered on top
// of LAYOUT.md's plainer "mostly cream, one or two in soft blue" wall description.
// Shutter colour is LAYOUT.md's own per-unit trade colour, already unique per unit by
// construction (8 units, 8 named colours) — softened/desaturated per "paint softened
// by sun but whole and clean," never a bright/saturated pick (art-direction 7.1b).
export const BAZAAR_UNITS = [
  { n: 1, trade: 'kirana', hi: 'किराना स्टोर', en: 'Kirana Store', shutter: 0x3d7d82, wallTint: PALETTE.cream, wallHeight: 3.9 },
  { n: 2, trade: 'sabzi', hi: 'सब्ज़ी की दुकान', en: 'Sabzi Shop', shutter: 0x3f6b45, wallTint: PALETTE.mustard, wallHeight: 4.15 },
  { n: 3, trade: 'medical', hi: 'दवा की दुकान', en: 'Medical Store', shutter: 0x7a2f35, wallTint: PALETTE.terracotta, wallHeight: 3.95 },
  { n: 4, trade: 'tailor', hi: 'दर्ज़ी की दुकान', en: 'Tailor Shop', shutter: 0xc9a227, wallTint: PALETTE.teal, wallHeight: 4.2 },
  { n: 5, trade: 'barber', hi: 'नाई की दुकान', en: 'Barber Shop', shutter: 0x9fc0d4, wallTint: PALETTE.fadedBlue, wallHeight: 4.0 },
  { n: 6, trade: 'mobile', hi: 'मोबाइल और साइबर', en: 'Mobile and Cyber', shutter: 0x6b6f3a, wallTint: PALETTE.schoolYellow, wallHeight: 3.85 },
  { n: 7, trade: 'bangle', hi: 'मनिहारी की दुकान', en: 'Bangle Shop', shutter: 0x8a8a86, wallTint: PALETTE.greyGreen, wallHeight: 4.1 },
  { n: 8, trade: 'sweet', hi: 'मिष्ठान भंडार', en: 'Sweet Shop', shutter: 0x8a2e2e, wallTint: PALETTE.cream, wallHeight: 3.95 },
];

/** Unit centre X, index 0-7. */
export function bazaarUnitCx(idx) {
  return BAZAAR_WEST_X + BAZAAR_UNIT_W * idx + BAZAAR_UNIT_W / 2;
}

/** Party-wall boundary X positions, 9 of them (west outer edge, 7 internal, east outer edge). */
export function bazaarBoundaryXs() {
  const xs = [];
  for (let i = 0; i <= 8; i++) xs.push(BAZAAR_WEST_X + BAZAAR_UNIT_W * i);
  return xs;
}

/** AABB colliders for the whole row — back wall, all 9 party walls, and (once item 2
 * adds counters) each unit's counter blocks entry past the open shopfront, the same
 * way the existing halwai/tea-stall/general-store shops already work (open front,
 * solid counter, no walk-in interior). Exported so main.js can register them via
 * src/collision.js's addStaticColliders() without duplicating these numbers. */
export function bazaarColliders() {
  const boxes = [];
  const backZ = BAZAAR_ROW_CZ + BAZAAR_UNIT_D / 2;
  // Back wall — one long thin box the full row length.
  boxes.push({ minX: BAZAAR_WEST_X, maxX: BAZAAR_EAST_X, minZ: backZ - WALL_THICKNESS, maxZ: backZ });
  // Party walls (9), each thin in X, spanning the unit depth in Z.
  for (const x of bazaarBoundaryXs()) {
    boxes.push({ minX: x - WALL_THICKNESS / 2, maxX: x + WALL_THICKNESS / 2, minZ: BAZAAR_ROW_CZ - BAZAAR_UNIT_D / 2, maxZ: backZ });
  }
  // Counters (item 2) — placed a little inside the front edge, block walk-through.
  const counterZ = BAZAAR_FRONT_Z + 0.6;
  for (let idx = 0; idx < 8; idx++) {
    const cx = bazaarUnitCx(idx);
    boxes.push({ minX: cx - BAZAAR_UNIT_W / 2 + 0.3, maxX: cx + BAZAAR_UNIT_W / 2 - 0.3, minZ: counterZ - 0.3, maxZ: counterZ + 0.3 });
  }
  return boxes;
}

/**
 * The terrace shell: back wall (8 segments, own tint/height per unit — this is what
 * both varies the skyline and carries the palette-colour law), 9 party walls (unit1's
 * west + unit8's east are the two exposed end walls LAYOUT.md calls out, the other 7
 * are shared mid-terrace dividers), a stepped roof/parapet per unit, one continuous
 * sloped corrugated-tin awning on posts, and a continuous front step/plinth. Openings
 * are fully open (no wall to cut a hole into, per LAYOUT.md's "opens at the front
 * only") — a lintel trim bar across each unit's front plus jamb trim on the flanking
 * party walls stands in for the "recessed opening + lintel band" detail rule.
 */
export function buildBazaarRow() {
  const group = new THREE.Group();
  group.name = 'bazaar_row';
  const kit = new BuildingKit(120);

  const backZ = BAZAAR_ROW_CZ + BAZAAR_UNIT_D / 2;
  const frontZ = BAZAAR_FRONT_Z;

  // --- Back wall: 8 segments, each unit's own tint + own (slightly varied) height,
  // merged into one draw call (texturedWallBox always shares the 'plaster' material
  // cache regardless of tint/height — see src/materials.js). ---
  const wallGeos = [];
  let sharedWallMaterial = null;
  BAZAAR_UNITS.forEach((unit, idx) => {
    const cx = bazaarUnitCx(idx);
    const wallMesh = texturedWallBox(BAZAAR_UNIT_W, unit.wallHeight, WALL_THICKNESS, 'plaster', {
      tint: unit.wallTint,
      tileSize: 1.5,
      tintStrength: WALL_TINT_STRENGTH,
      seed: cx * 3.1 + BAZAAR_ROW_CZ * 1.7,
    });
    sharedWallMaterial = wallMesh.material;
    const local = new THREE.Matrix4().makeTranslation(cx, unit.wallHeight / 2, backZ - WALL_THICKNESS / 2);
    wallGeos.push(wallMesh.geometry.clone().applyMatrix4(local));

    // Ochre/darker base band along this unit's own back wall, per LAYOUT.md — a
    // deeper shade of the SAME hue (law, docs/look-standard.md), not a separate
    // ochre hex; "one or two units in soft blue instead" is the wallTint swap above,
    // not a second band colour.
    const bandH = 0.5 + (idx % 3) * 0.06; // "varying slightly in height... between units"
    const band = texturedWallBox(BAZAAR_UNIT_W + 0.02, bandH, WALL_THICKNESS + 0.02, 'plaster', {
      tint: darken(unit.wallTint),
      tileSize: 1.2,
      tintStrength: WALL_TINT_STRENGTH + 0.15,
      seed: cx * 5.3,
    });
    const bandLocal = new THREE.Matrix4().makeTranslation(cx, bandH / 2, backZ - WALL_THICKNESS / 2);
    wallGeos.push(band.geometry.clone().applyMatrix4(bandLocal));
  });
  const backWallMesh = new THREE.Mesh(mergeGeometries(wallGeos), sharedWallMaterial);
  backWallMesh.name = 'bazaar_back_wall';
  backWallMesh.castShadow = true;
  backWallMesh.receiveShadow = true;
  group.add(backWallMesh);

  // --- Party walls (9): thin dividers running the full unit depth. A uniform height
  // (tallest unit + a hair) reads fine end-on — the back wall above is what actually
  // carries the visible stepped skyline. ---
  const partyH = Math.max(...BAZAAR_UNITS.map((u) => u.wallHeight)) + 0.05;
  const partyGeos = [];
  let partyMaterial = null;
  for (const x of bazaarBoundaryXs()) {
    const wallMesh = texturedWallBox(WALL_THICKNESS, partyH, BAZAAR_UNIT_D, 'plaster', {
      tint: PALETTE.cream,
      tileSize: 1.5,
      tintStrength: WALL_TINT_STRENGTH,
      seed: x * 2.3,
    });
    partyMaterial = wallMesh.material;
    const local = new THREE.Matrix4().makeTranslation(x, partyH / 2, BAZAAR_ROW_CZ);
    partyGeos.push(wallMesh.geometry.clone().applyMatrix4(local));
  }
  const partyWallMesh = new THREE.Mesh(mergeGeometries(partyGeos), partyMaterial);
  partyWallMesh.name = 'bazaar_party_walls';
  partyWallMesh.castShadow = true;
  partyWallMesh.receiveShadow = true;
  group.add(partyWallMesh);

  // --- Roof: 8 slabs, each capping its own unit's wall height (this is the real
  // "steps slightly between units" — a genuine stepped roofline, not just cosmetic),
  // plus a thin proud parapet lip on each, merged into one 'concrete' draw call. ---
  const roofOverhang = 0.3;
  const roofGeos = [];
  const concreteTint = 0xd7d2c4;
  BAZAAR_UNITS.forEach((unit, idx) => {
    const cx = bazaarUnitCx(idx);
    const slabT = 0.12;
    const slab = new THREE.BoxGeometry(BAZAAR_UNIT_W + roofOverhang * 2, slabT, BAZAAR_UNIT_D + roofOverhang * 2);
    const slabLocal = new THREE.Matrix4().makeTranslation(cx, unit.wallHeight + slabT / 2, BAZAAR_ROW_CZ);
    roofGeos.push(slab.applyMatrix4(slabLocal));

    // Parapet lip — set in from the roof edge, low and thin.
    const lipH = 0.28;
    const lip = new THREE.BoxGeometry(BAZAAR_UNIT_W - 0.1, lipH, WALL_THICKNESS + 0.02);
    const lipLocal = new THREE.Matrix4().makeTranslation(cx, unit.wallHeight + slabT + lipH / 2, backZ - WALL_THICKNESS / 2);
    roofGeos.push(lip.applyMatrix4(lipLocal));
  });
  const roofMaterial = getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, tint: concreteTint, roughness: 1 });
  const roofMesh = new THREE.Mesh(mergeGeometries(roofGeos), roofMaterial);
  roofMesh.name = 'bazaar_roof';
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  group.add(roofMesh);

  // --- Continuous sloped corrugated-tin awning on posts, whole frontage, per
  // LAYOUT.md — one metal draw call for both the awning slab and its posts. ---
  const awningBackY = 3.4;
  const awningFrontY = BAZAAR_AWNING_EDGE_H;
  const awningDepth = 1.8;
  const awningLen = BAZAAR_UNIT_W * 8 + 0.6;
  const awningCx = (BAZAAR_WEST_X + BAZAAR_EAST_X) / 2;
  const awningCz = frontZ - awningDepth / 2;
  const awningMidY = (awningBackY + awningFrontY) / 2;
  const awningTilt = Math.atan2(awningBackY - awningFrontY, awningDepth); // slope up toward the wall
  const awningSlab = new THREE.BoxGeometry(awningLen, 0.06, awningDepth);
  awningSlab.rotateX(-awningTilt);
  const awningLocal = new THREE.Matrix4().makeTranslation(awningCx, awningMidY, awningCz);
  const awningGeos = [awningSlab.applyMatrix4(awningLocal)];
  // Posts support the awning's LOW outer edge (2.8m, out over the porch, away from
  // the building) — the high inner edge (3.4m) sits right at the roof's own front
  // overhang and needs no separate post.
  const awningOuterZ = frontZ - awningDepth + 0.06;
  for (const x of bazaarBoundaryXs()) {
    const post = new THREE.BoxGeometry(0.1, awningFrontY, 0.1);
    const postLocal = new THREE.Matrix4().makeTranslation(x, awningFrontY / 2, awningOuterZ);
    awningGeos.push(post.applyMatrix4(postLocal));
  }
  const awningMaterial = getTiledMaterial('metal', { repeatX: 1, repeatY: 1, tint: 0x5c6a70, roughness: 1 });
  const awningMesh = new THREE.Mesh(mergeGeometries(awningGeos), awningMaterial);
  awningMesh.name = 'bazaar_awning';
  awningMesh.castShadow = true;
  awningMesh.receiveShadow = true;
  group.add(awningMesh);

  // --- Continuous front step/plinth, per LAYOUT.md ("a low continuous step runs the
  // length of the front") — reuses BuildingKit's shared plinth instance, same as
  // every other building's plinth ring. ---
  const stepH = 0.15;
  kit.addStep({ x: awningCx, y: stepH / 2, z: frontZ - 0.25 }, { x: awningLen, y: stepH, z: 0.5 });
  // A shallow interior floor slab per unit (concrete), set slightly proud of the step.
  const floorGeos = [];
  BAZAAR_UNITS.forEach((unit, idx) => {
    const cx = bazaarUnitCx(idx);
    const floor = new THREE.BoxGeometry(BAZAAR_UNIT_W - 0.06, 0.06, BAZAAR_UNIT_D - 0.06);
    const local = new THREE.Matrix4().makeTranslation(cx, 0.03, BAZAAR_ROW_CZ);
    floorGeos.push(floor.applyMatrix4(local));
  });
  const floorMesh = new THREE.Mesh(mergeGeometries(floorGeos), roofMaterial); // shares the concrete material cache
  floorMesh.name = 'bazaar_floor';
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // --- Lintel band + jamb trim per unit front (item 1's "recessed openings with a
  // lintel band" rule, adapted: the front has no wall to cut a hole into — see the
  // file doc comment — so this is a header beam across the opening plus trim on the
  // flanking party walls' inner front edge, at BuildingKit's shared trim colour). ---
  BAZAAR_UNITS.forEach((unit, idx) => {
    const cx = bazaarUnitCx(idx);
    const openingW = BAZAAR_UNIT_W - WALL_THICKNESS - 0.2;
    kit.addTrimBar({ x: cx, y: BAZAAR_AWNING_EDGE_H - 0.05, z: frontZ - 0.02 }, { x: openingW, y: 0.1, z: 0.1 });
    for (const side of [-1, 1]) {
      kit.addTrimBar({ x: cx + (side * openingW) / 2, y: BAZAAR_AWNING_EDGE_H / 2, z: frontZ - 0.02 }, { x: 0.08, y: BAZAAR_AWNING_EDGE_H, z: 0.08 });
    }
  });

  // --- Drainpipes/switchboards "here and there" (item 1), not on every unit. ---
  kit.addDrainpipe({ x: bazaarBoundaryXs()[2], y: BAZAAR_UNITS[1].wallHeight / 2, z: backZ - 0.02 }, BAZAAR_UNITS[1].wallHeight);
  kit.addDrainpipe({ x: bazaarBoundaryXs()[6], y: BAZAAR_UNITS[5].wallHeight / 2, z: backZ - 0.02 }, BAZAAR_UNITS[5].wallHeight);
  kit.addSwitchboard({ x: bazaarUnitCx(3) + 1.5, y: 1.3, z: backZ - WALL_THICKNESS - 0.02 }, Math.PI);
  kit.addSwitchboard({ x: bazaarUnitCx(6) - 1.5, y: 1.3, z: backZ - WALL_THICKNESS - 0.02 }, Math.PI);

  kit.finalize(group);
  mergeGroupByMaterial(group);
  return group;
}

// --- Item 2: shopfronts — counter, open/rolled shutter, bilingual signboard. ---

/** Counters (one per unit) + the rolled-open shutter bundle each unit's own trade
 * colour sits under the lintel — merged per material family (wood counters together,
 * shutter-colour boxes together) so this costs at most 2 extra draw calls for all 8
 * units, not 16. */
export function buildBazaarCountersAndShutters() {
  const group = new THREE.Group();
  group.name = 'bazaar_shopfronts';
  const frontZ = BAZAAR_FRONT_Z;

  const counterGeos = [];
  let counterMaterial = null;
  const shutterGeos = [];
  let shutterMaterial = null;

  BAZAAR_UNITS.forEach((unit, idx) => {
    const cx = bazaarUnitCx(idx);
    const counterW = BAZAAR_UNIT_W - 0.7;
    const counterMesh = texturedThickBox(counterW, BAZAAR_COUNTER_H, 0.5, 'wood', { tint: PALETTE.woodTrim, tileSize: 1, roughness: 1 });
    counterMaterial = counterMesh.material;
    const counterLocal = new THREE.Matrix4().makeTranslation(cx, BAZAAR_COUNTER_H / 2, frontZ + 0.6);
    counterGeos.push(counterMesh.geometry.clone().applyMatrix4(counterLocal));

    // Rolled-open shutter — a thick horizontal bundle tucked just under the lintel,
    // in this unit's own LAYOUT.md trade colour. Reads as "open" (not blocking the
    // opening) since it sits high and doesn't extend down.
    const openingW = BAZAAR_UNIT_W - WALL_THICKNESS - 0.2;
    const shutterMesh = texturedThickBox(openingW, 0.22, 0.16, 'metal', { tint: unit.shutter, tileSize: 1, roughness: 1 });
    shutterMaterial = shutterMesh.material;
    const shutterLocal = new THREE.Matrix4().makeTranslation(cx, BAZAAR_AWNING_EDGE_H - 0.16, frontZ - 0.02);
    shutterGeos.push(shutterMesh.geometry.clone().applyMatrix4(shutterLocal));
  });

  const counterMeshMerged = new THREE.Mesh(mergeGeometries(counterGeos), counterMaterial);
  counterMeshMerged.name = 'bazaar_counters';
  counterMeshMerged.castShadow = true;
  counterMeshMerged.receiveShadow = true;
  group.add(counterMeshMerged);

  const shutterMeshMerged = new THREE.Mesh(mergeGeometries(shutterGeos), shutterMaterial);
  shutterMeshMerged.name = 'bazaar_shutters';
  shutterMeshMerged.castShadow = true;
  group.add(shutterMeshMerged);

  return group;
}

const SIGN_ATLAS_COLS = 4;
const SIGN_ATLAS_ROWS = 2;
const SIGN_CELL = 512;
const SIGN_ATLAS_W = SIGN_CELL * SIGN_ATLAS_COLS;
const SIGN_ATLAS_H = SIGN_CELL * SIGN_ATLAS_ROWS;

function drawBazaarSign(ctx, col, row, hi, en) {
  const x = col * SIGN_CELL;
  const y = row * SIGN_CELL;
  ctx.fillStyle = '#e8dcc4';
  ctx.fillRect(x + 4, y + 4, SIGN_CELL - 8, SIGN_CELL - 8);
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 6;
  ctx.strokeRect(x + 4, y + 4, SIGN_CELL - 8, SIGN_CELL - 8);
  const cx = x + SIGN_CELL / 2;
  ctx.fillStyle = '#2a2018';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Devanagari larger, on top; English smaller, beneath (law — see CLAUDE.md/
  // README's signboard rule). Font size backs off a little for the longer names
  // ("मोबाइल और साइबर", "Mobile and Cyber") so they stay inside the board.
  const hiSize = hi.length > 10 ? 52 : 60;
  const enSize = en.length > 16 ? 26 : 30;
  ctx.font = `700 ${hiSize}px "Noto Sans Devanagari", sans-serif`;
  ctx.fillText(hi, cx, y + SIGN_CELL * 0.42);
  ctx.font = `600 ${enSize}px -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText(en, cx, y + SIGN_CELL * 0.7);
}

async function buildBazaarSignAtlas() {
  await document.fonts.load('700 60px "Noto Sans Devanagari"');
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = SIGN_ATLAS_W;
  canvas.height = SIGN_ATLAS_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(0, 0, SIGN_ATLAS_W, SIGN_ATLAS_H);
  BAZAAR_UNITS.forEach((unit, idx) => {
    const col = idx % SIGN_ATLAS_COLS;
    const row = Math.floor(idx / SIGN_ATLAS_COLS);
    drawBazaarSign(ctx, col, row, unit.hi, unit.en);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Remaps a unit-cube BoxGeometry's front (-Z, the row's open/south face) UVs into
 * one atlas cell — same technique as src/signboards.js's mapFrontFaceToAtlasHalf,
 * generalised to an N-cell grid. */
function mapFrontFaceToAtlasCell(geometry, col, row) {
  const uv = geometry.attributes.uv;
  const uMin = (col + 0.02) / SIGN_ATLAS_COLS;
  const uMax = (col + 0.98) / SIGN_ATLAS_COLS;
  // Canvas Y grows downward but UV V grows upward — flip the row into V space.
  const vMin = (SIGN_ATLAS_ROWS - row - 0.98) / SIGN_ATLAS_ROWS;
  const vMax = (SIGN_ATLAS_ROWS - row - 0.02) / SIGN_ATLAS_ROWS;
  const groups = geometry.groups; // BoxGeometry: [+X,-X,+Y,-Y,+Z,-Z]
  const frontGroup = groups[5]; // -Z — the row's open/south face
  const touched = new Uint8Array(uv.count);
  for (let i = frontGroup.start; i < frontGroup.start + frontGroup.count; i++) {
    const vi = geometry.index.array[i];
    if (touched[vi]) continue;
    touched[vi] = 1;
    const u = uv.getX(vi);
    const v = uv.getY(vi);
    uv.setXY(vi, uMin + u * (uMax - uMin), vMin + v * (vMax - vMin));
  }
  uv.needsUpdate = true;
}

/** All 8 bilingual signboards, one merged mesh sharing one atlas texture — spellings
 * taken from LAYOUT.md's table (never the reference image, which renders garbled
 * English). Mounted above each unit's own roof/parapet (its own varied height, so the
 * boards ride the stepped skyline like the reference orthos show), not on the awning
 * fascia — a board at fascia height sits almost exactly where the awning's own
 * high/wall-attached edge reaches (3.4m), which hid the whole board behind the sloped
 * awning panel in an early version of this function; see docs/parked.md. Async
 * (font/canvas), same pattern as src/signboards.js — not awaited inline by the caller. */
export async function buildBazaarSignboards() {
  const texture = await buildBazaarSignAtlas();
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  const geos = [];
  BAZAAR_UNITS.forEach((unit, idx) => {
    const cx = bazaarUnitCx(idx);
    const boardY = unit.wallHeight + 0.12 + 0.28 + 0.37; // clear of this unit's own roof slab + parapet lip
    const geo = new THREE.BoxGeometry(BAZAAR_UNIT_W - 0.5, 0.5, 0.04);
    const col = idx % SIGN_ATLAS_COLS;
    const row = Math.floor(idx / SIGN_ATLAS_COLS);
    mapFrontFaceToAtlasCell(geo, col, row);
    const local = new THREE.Matrix4().makeTranslation(cx, boardY, BAZAAR_FRONT_Z - 0.05);
    geos.push(geo.applyMatrix4(local));
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), material);
  mesh.castShadow = true;
  mesh.name = 'bazaar_signboards';
  return mesh;
}
