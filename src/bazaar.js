import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedWallBox, texturedThickBox, getTiledMaterial, bakeFlatTintColors, ensureUv2 } from './materials.js';
import { PALETTE, darken, WALL_TINT_STRENGTH, WALL_THICKNESS, HOUSE_CENTER } from './village.js';
import { mergeGroupByMaterial, mergeMeshList } from './mergeUtils.js';
import { buildStripSegment } from './paths.js';

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
export function buildBazaarRow(kit) {
  const group = new THREE.Group();
  group.name = 'bazaar_row';

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
  // Headroom pass (docs/parked.md) — tint baked into vertex colour so this shares
  // the one cached 'concrete' Material the rest of the village's concrete already
  // uses, instead of its own separate direct-tint Material/draw call.
  for (const g of roofGeos) {
    ensureUv2(g);
    bakeFlatTintColors(g, concreteTint, 1);
  }
  const roofMaterial = getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
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
  // Headroom pass (docs/parked.md) — vertex-colour tint so this shares the village's
  // one cached 'metal' Material instead of its own direct-tint one.
  for (const g of awningGeos) {
    ensureUv2(g);
    bakeFlatTintColors(g, 0x5c6a70, 1);
  }
  const awningMaterial = getTiledMaterial('metal', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
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
  for (const g of floorGeos) {
    ensureUv2(g);
    bakeFlatTintColors(g, concreteTint, 1);
  }
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

// --- Item 3: shop interiors — shelving, stacked goods, one signature element per
// trade. Geometry and instancing only, no new systems. Draw-call budget is tight
// (110/120 already after items 1-2), so every prop across all 8 shops folds into
// just THREE merged meshes by shape/material family, not one mesh per prop: boxy
// wood-family goods (shelving, crates, cloth bolts, medicine/phone boxes, the
// sewing machine and chair bodies, the sabzi platform), cylindrical goods (sacks,
// tins, pots, chair legs, the balance beam post — one shared 'terracotta' family,
// close enough for small background props at this distance), and the bangle shop's
// rings (torus, its own small batch since no other shop needs one). ---

export function buildBazaarInteriors() {
  const group = new THREE.Group();
  group.name = 'bazaar_interiors';
  const backInnerZ = BAZAAR_ROW_CZ + BAZAAR_UNIT_D / 2 - WALL_THICKNESS - 0.18;
  const counterZ = BAZAAR_FRONT_Z + 0.6;
  const wood = PALETTE.woodTrim;

  // Local to this call (not module-level) so a second call — hot reload, or any
  // future caller — never accumulates stale geometry from a previous run.
  const boxGeos = [];
  const cylGeos = [];
  const torusGeos = [];

  function pushBox(w, h, d, x, y, z, tint, rotY = 0) {
    const mesh = texturedThickBox(w, h, d, 'wood', { tint, tileSize: Math.max(w, d, 0.4), roughness: 1 });
    const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, y, z);
    boxGeos.push(mesh.geometry.clone().applyMatrix4(m));
  }

  function pushCyl(radiusTop, radiusBottom, h, x, y, z, tint) {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, h, 10);
    ensureUv2(geo); // raw CylinderGeometry has no uv2 — needed to merge with texturedThickBox's own 'terracotta' geometry
    bakeFlatTintColors(geo, tint, 1);
    geo.applyMatrix4(new THREE.Matrix4().setPosition(x, y, z));
    cylGeos.push(geo);
  }

  function pushTorus(radius, tube, x, y, z, tint, rotX = Math.PI / 2) {
    const geo = new THREE.TorusGeometry(radius, tube, 8, 16);
    ensureUv2(geo); // raw TorusGeometry has no uv2 — needed to merge with texturedThickBox's own 'metal' geometry
    bakeFlatTintColors(geo, tint, 1);
    const m = new THREE.Matrix4().makeRotationX(rotX).setPosition(x, y, z);
    geo.applyMatrix4(m);
    torusGeos.push(geo);
  }

  /** Shelving common to most units: 2 boards against the back wall. */
  function addShelving(cx, tint) {
    const w = BAZAAR_UNIT_W - 0.7;
    pushBox(w, 0.05, 0.32, cx, 1.2, backInnerZ, tint);
    pushBox(w, 0.05, 0.32, cx, 2.05, backInnerZ, tint);
  }

  BAZAAR_UNITS.forEach((unit, idx) => {
    const cx = bazaarUnitCx(idx);
    const left = cx - BAZAAR_UNIT_W / 2 + 0.5;
    const right = cx + BAZAAR_UNIT_W / 2 - 0.5;

    if (unit.trade === 'kirana') {
      addShelving(cx, wood);
      // Sacks on the floor, tins on the shelf.
      pushCyl(0.22, 0.3, 0.55, left, 0.275, counterZ + 1.3, 0xc9a86a);
      pushCyl(0.2, 0.28, 0.5, left + 0.5, 0.25, counterZ + 1.3, 0xb99456);
      for (let i = 0; i < 5; i++) pushCyl(0.09, 0.09, 0.22, cx - 1.2 + i * 0.45, 2.16, backInnerZ + 0.1, 0x8a9aa0 + i * 0x040000);
    } else if (unit.trade === 'sabzi') {
      // Crates instead of shelving — a produce shop's goods sit low, in the open.
      pushBox(0.7, 0.35, 0.5, left, 0.175, counterZ + 1.2, 0x4a7a3a);
      pushBox(0.7, 0.35, 0.5, left + 0.85, 0.175, counterZ + 1.2, 0x6a8a3f);
      pushBox(0.7, 0.35, 0.5, right - 0.35, 0.175, counterZ + 1.2, 0x8a3a2f);
      // Signature: a hanging pan balance — post, beam, two pans.
      const balX = cx;
      pushCyl(0.03, 0.03, 1.6, balX, 1.5, backInnerZ + 0.3, 0x2a2a2a);
      pushBox(0.9, 0.04, 0.04, balX, 2.25, backInnerZ + 0.3, 0x2a2a2a);
      pushCyl(0.16, 0.13, 0.08, balX - 0.4, 1.85, backInnerZ + 0.3, 0xb08040);
      pushCyl(0.16, 0.13, 0.08, balX + 0.4, 1.85, backInnerZ + 0.3, 0xb08040);
    } else if (unit.trade === 'medical') {
      addShelving(cx, wood);
      pushBox(BAZAAR_UNIT_W - 0.7, 0.05, 0.32, cx, 2.6, backInnerZ, wood);
      // A grid of small medicine boxes across the 3 shelves, muted pastel tints.
      const medTints = [0xb8ccd8, 0xd8c8a8, 0xc8d8b8, 0xd8b8b8, 0xb8c8d8];
      const shelfYs = [1.28, 2.13, 2.68];
      shelfYs.forEach((sy, si) => {
        for (let i = 0; i < 7; i++) {
          pushBox(0.12, 0.08, 0.2, cx - 1.8 + i * 0.6, sy + 0.05, backInnerZ + 0.08, medTints[(i + si) % medTints.length]);
        }
      });
    } else if (unit.trade === 'tailor') {
      addShelving(cx, wood);
      // Bolts of cloth — short horizontal cylinders in varied tints, stacked on the shelf.
      const clothTints = [0xa83a4a, 0x3a5a8a, 0xc9a227, 0x4a7a5a, 0x8a4a8a];
      clothTints.forEach((t, i) => pushCyl(0.14, 0.14, 0.5, cx - 1.4 + i * 0.7, 2.05 + 0.16, backInnerZ, t));
      // Signature: a treadle sewing machine on the counter.
      pushBox(0.5, 0.18, 0.28, cx, 1.02, counterZ - 0.05, 0x1a1a1a);
      pushCyl(0.1, 0.1, 0.06, cx - 0.15, 0.88, counterZ - 0.05, 0x3a3a3a);
      pushBox(0.04, 0.22, 0.04, cx + 0.18, 1.15, counterZ - 0.05, 0x2a2a2a);
    } else if (unit.trade === 'barber') {
      // Signature: mirror on the back wall + a chair.
      pushBox(0.6, 0.8, 0.03, cx, 1.6, backInnerZ, 0xbfd0d8);
      pushBox(1.0, 0.08, 0.35, cx, 0.95, backInnerZ + 0.3, wood);
      const chairX = cx;
      pushBox(0.42, 0.06, 0.42, chairX, 0.46, counterZ + 1.0, 0x8a2e2e);
      pushBox(0.42, 0.5, 0.06, chairX, 0.75, counterZ + 1.2, 0x8a2e2e);
      for (const [dx, dz] of [
        [-0.18, -0.18],
        [0.18, -0.18],
        [-0.18, 0.18],
        [0.18, 0.18],
      ]) {
        pushCyl(0.025, 0.025, 0.46, chairX + dx, 0.23, counterZ + 1.0 + dz, 0x2a2a2a);
      }
    } else if (unit.trade === 'mobile') {
      addShelving(cx, wood);
      const boxTints = [0x2a2a2a, 0x3a3a3a, 0x8a2e2e, 0x2a5a2a];
      for (let i = 0; i < 6; i++) pushBox(0.16, 0.08, 0.1, cx - 1.5 + i * 0.5, 2.09, backInnerZ + 0.1, boxTints[i % boxTints.length]);
      // Signature: a monitor on the counter.
      pushBox(0.4, 0.3, 0.05, cx, 1.1, counterZ - 0.1, 0x1a1a1a);
      pushBox(0.32, 0.22, 0.01, cx, 1.12, counterZ - 0.075, 0x3a5a6a);
      pushBox(0.05, 0.1, 0.05, cx, 0.95, counterZ - 0.1, 0x1a1a1a);
    } else if (unit.trade === 'bangle') {
      // Signature: rods on the back wall with stacked glass-bangle rings.
      const bangleTints = [0xc94f6a, 0x4f9fc9, 0xc9a227, 0x4fc98a, 0xa04fc9];
      for (let rod = 0; rod < 3; rod++) {
        const rx = cx - 1.3 + rod * 1.3;
        pushCyl(0.02, 0.02, 1.1, rx, 1.6, backInnerZ + 0.25, 0x8a6a4a);
        for (let i = 0; i < 8; i++) {
          pushTorus(0.09, 0.015, rx, 1.15 + i * 0.065, backInnerZ + 0.25, bangleTints[(rod + i) % bangleTints.length]);
        }
      }
    } else if (unit.trade === 'sweet') {
      addShelving(cx, wood);
      // Trays/tins of sweets — short wide cylinders, warm mithai tints, on the
      // counter and the shelf.
      const sweetTints = [0xd9922f, 0xc9701f, 0xe0b24a, 0xb85a1f];
      for (let i = 0; i < 4; i++) pushCyl(0.16, 0.16, 0.14, left + i * 0.55, 1.07, counterZ - 0.1, sweetTints[i % sweetTints.length]);
      for (let i = 0; i < 4; i++) pushCyl(0.14, 0.14, 0.12, cx - 1.2 + i * 0.7, 2.11, backInnerZ + 0.1, sweetTints[(i + 2) % sweetTints.length]);
    }
  });

  if (boxGeos.length) {
    const boxMat = texturedThickBox(1, 1, 1, 'wood', { tint: wood, tileSize: 1, roughness: 1 }).material;
    const boxMesh = new THREE.Mesh(mergeGeometries(boxGeos), boxMat);
    boxMesh.name = 'bazaar_interior_boxes';
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    group.add(boxMesh);
  }
  if (cylGeos.length) {
    const cylMat = getTiledMaterial('terracotta', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
    const cylMesh = new THREE.Mesh(mergeGeometries(cylGeos), cylMat);
    cylMesh.name = 'bazaar_interior_cylinders';
    cylMesh.castShadow = true;
    cylMesh.receiveShadow = true;
    group.add(cylMesh);
  }
  if (torusGeos.length) {
    const torusMat = getTiledMaterial('metal', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
    const torusMesh = new THREE.Mesh(mergeGeometries(torusGeos), torusMat);
    torusMesh.name = 'bazaar_interior_rings';
    torusMesh.castShadow = true;
    group.add(torusMesh);
  }

  return group;
}

// --- Item 4: the chowk — the second tea stall from
// Places V1/tea_stall_chowk/ (no LAYOUT.md there either, only
// MAIN_tea_stall_chowk_orthos.png/_views.png — dimensions/name/counter-height read
// off the orthos' own printed callouts, same as item 9 of an earlier queue read
// tea_stall/general_store off their orthos). "यादव चाय नाश्ता / Yadav Chai Nashta",
// 6m wide x 3.5m deep, roof edge 2.8m, counter 0.9m, solid back wall only (open on
// the other 3 sides, post-supported), teal counter/posts, cream/ochre walls — the
// same materials/palette law as the rest of the village. ---

export const CHOWK_TEA = { w: 6, d: 3.5, roofEdgeH: 2.8, counterH: 0.9, backWallH: 2.8 };
export const CHOWK_TEA_POS = { x: -55, z: 10 };
export const CHOWK_TEA_ROT = -Math.PI / 2; // faces west, toward the bazaar row
export const CHOWK_CENTER = { x: -54, z: 13 }; // the open plaza itself — chabutra/seating live here

function chowkWorldMatrix() {
  return new THREE.Matrix4().makeRotationY(CHOWK_TEA_ROT).setPosition(CHOWK_TEA_POS.x, 0, CHOWK_TEA_POS.z);
}

/** Walls + roof + counter + posts, merged into 2 draw calls (plaster wall; teal
 * metal-family counter+posts+roof share one, same per-vertex-tint merge trick as
 * everywhere else in this file). */
export function buildTeaStallChowk() {
  const group = new THREE.Group();
  group.name = 'tea_stall_chowk';
  const world = chowkWorldMatrix();
  const { w, d, roofEdgeH, counterH, backWallH } = CHOWK_TEA;

  // Solid back wall only (local +Z) — every other side stays open, post-supported.
  const backWallMesh = texturedWallBox(w, backWallH, WALL_THICKNESS, 'plaster', {
    tint: PALETTE.cream,
    tileSize: 1.5,
    tintStrength: WALL_TINT_STRENGTH,
    seed: CHOWK_TEA_POS.x * 3.1,
  });
  const wallLocal = new THREE.Matrix4().makeTranslation(0, backWallH / 2, d / 2 - WALL_THICKNESS / 2);
  const wallGeo = backWallMesh.geometry.clone().applyMatrix4(wallLocal).applyMatrix4(world);
  const band = texturedWallBox(w + 0.02, 0.5, WALL_THICKNESS + 0.02, 'plaster', {
    tint: darken(PALETTE.cream),
    tileSize: 1.2,
    tintStrength: WALL_TINT_STRENGTH + 0.15,
    seed: CHOWK_TEA_POS.x * 5.3,
  });
  const bandLocal = new THREE.Matrix4().makeTranslation(0, 0.25, d / 2 - WALL_THICKNESS / 2);
  const bandGeo = band.geometry.clone().applyMatrix4(bandLocal).applyMatrix4(world);
  const wallMesh = new THREE.Mesh(mergeGeometries([wallGeo, bandGeo]), backWallMesh.material);
  wallMesh.name = 'chowk_tea_wall';
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  // Teal counter + posts + sloped roof, one merged 'metal' draw call. Raw
  // BoxGeometry throughout, each given a baked uv2 + vertex colour below (headroom
  // pass, docs/parked.md) so it shares the village's one cached vertex-coloured
  // 'metal' Material instead of its own direct-tint one — mergeGeometries requires
  // every input to share the same attribute set, which baking uv2 on every piece
  // here guarantees regardless of which helper built it (an earlier direct-tint-only
  // version of this hit that mismatch — found via the actual render throwing, not by
  // inspection).
  const teal = PALETTE.teal;
  const tealGeos = [];
  const counter = new THREE.BoxGeometry(w - 0.6, counterH, 0.5);
  const counterLocal = new THREE.Matrix4().makeTranslation(0, counterH / 2, -d / 2 + 0.3);
  tealGeos.push(counter.applyMatrix4(counterLocal).applyMatrix4(world));

  for (const [px, pz, ph] of [
    [-w / 2 + 0.1, -d / 2 + 0.1, roofEdgeH],
    [w / 2 - 0.1, -d / 2 + 0.1, roofEdgeH],
    [-w / 2 + 0.1, d / 2 - 0.1, backWallH + 0.5],
    [w / 2 - 0.1, d / 2 - 0.1, backWallH + 0.5],
  ]) {
    const post = new THREE.BoxGeometry(0.1, ph, 0.1);
    const postLocal = new THREE.Matrix4().makeTranslation(px, ph / 2, pz);
    tealGeos.push(post.applyMatrix4(postLocal).applyMatrix4(world));
  }

  // Single-pitch sloped roof: low at the open front, high at the back wall.
  const roofBackY = backWallH + 0.5;
  const roofMidY = (roofEdgeH + roofBackY) / 2;
  const roofTilt = Math.atan2(roofBackY - roofEdgeH, d);
  const roofSlab = new THREE.BoxGeometry(w + 0.4, 0.06, d + 0.3);
  roofSlab.rotateX(roofTilt);
  const roofLocal = new THREE.Matrix4().makeTranslation(0, roofMidY, 0);
  tealGeos.push(roofSlab.applyMatrix4(roofLocal).applyMatrix4(world));

  for (const g of tealGeos) {
    ensureUv2(g);
    bakeFlatTintColors(g, teal, 1);
  }
  const tealMaterial = getTiledMaterial('metal', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const tealMesh = new THREE.Mesh(mergeGeometries(tealGeos), tealMaterial);
  tealMesh.name = 'chowk_tea_counter_roof';
  tealMesh.castShadow = true;
  tealMesh.receiveShadow = true;
  group.add(tealMesh);

  return group;
}

/** Bilingual sign for the chowk tea stall — "यादव चाय नाश्ता / Yadav Chai Nashta",
 * spelled exactly as the orthos' own printed signboard reads. Its own small canvas/
 * texture/mesh (one draw call) — not folded into the bazaar's 8-unit atlas, a
 * different building entirely. Async, same pattern as every other signboard here. */
export async function buildTeaStallChowkSign() {
  await document.fonts.load('700 70px "Noto Sans Devanagari"');
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e8dcc4';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 1012, 500);
  ctx.fillStyle = '#2a2018';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 84px "Noto Sans Devanagari", sans-serif';
  ctx.fillText('यादव चाय नाश्ता', 512, 210);
  ctx.font = '600 44px -apple-system, "Segoe UI", sans-serif';
  ctx.fillText('Yadav Chai Nashta', 512, 340);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  const geo = new THREE.BoxGeometry(CHOWK_TEA.w - 1.2, 0.6, 0.04);
  const world = chowkWorldMatrix();
  const local = new THREE.Matrix4().makeTranslation(0, CHOWK_TEA.roofEdgeH + 0.55, -CHOWK_TEA.d / 2 - 0.05);
  geo.applyMatrix4(local).applyMatrix4(world);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.name = 'chowk_tea_sign';
  return mesh;
}

/** The plaza itself: a chabutra (circular brick platform — no tree on it, see
 * docs/parked.md for why this session has no licensed tree model to plant), a
 * couple of benches, a few plastic chairs, with clear open ground left around all
 * of it "for future content" per the brief. One merged draw call (wood family,
 * per-vertex tint — chabutra deck, benches, and chairs all share it). */
export function buildChowkPlaza() {
  const group = new THREE.Group();
  group.name = 'chowk_plaza';
  const geos = [];
  let material = null;

  // Chabutra — a round brick kerb + a slightly raised deck, per the orthos' "Tree
  // Platform 0.5m" callout (built as a plain seating platform here, no tree).
  const chabX = CHOWK_CENTER.x - 3;
  const chabZ = CHOWK_CENTER.z + 2;
  const kerbSegs = 12;
  const kerbR = 1.15;
  for (let i = 0; i < kerbSegs; i++) {
    const a0 = (i / kerbSegs) * Math.PI * 2;
    const segMesh = texturedThickBox(0.55, 0.5, 0.25, 'terracotta', { tint: darken(PALETTE.terracotta), tileSize: 0.5, roughness: 1 });
    material = material || segMesh.material;
    const m = new THREE.Matrix4().makeRotationY(a0).setPosition(chabX + Math.sin(a0) * kerbR, 0.25, chabZ + Math.cos(a0) * kerbR);
    geos.push(segMesh.geometry.clone().applyMatrix4(m));
  }
  const deckMesh = texturedThickBox(2.0, 0.06, 2.0, 'concrete', { tint: 0xd7d2c4, tileSize: 1, roughness: 1 });
  const deckLocal = new THREE.Matrix4().makeTranslation(chabX, 0.53, chabZ);
  geos.push(deckMesh.geometry.clone().applyMatrix4(deckLocal));

  // Benches (2), maroon, near the stall's open front.
  const benchMesh = texturedThickBox(1.4, 0.45, 0.4, 'wood', { tint: 0x6a2a2a, tileSize: 1, roughness: 1 });
  material = material || benchMesh.material;
  geos.push(benchMesh.geometry.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(CHOWK_TEA_POS.x - 2.6, 0.225, CHOWK_TEA_POS.z - 1.5)));
  geos.push(benchMesh.geometry.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(CHOWK_TEA_POS.x - 2.6, 0.225, CHOWK_TEA_POS.z + 1.5)));

  // A few plastic chairs — plain tinted boxes, same crude-but-legible scale the
  // halwai's own plastic chairs already use elsewhere in this game.
  const chairTints = [0xb23a3a, 0x3a9955, 0xb23a3a, 0x3a9955];
  chairTints.forEach((tint, i) => {
    const chairMesh = texturedThickBox(0.4, 0.4, 0.4, 'wood', { tint, tileSize: 1, roughness: 1 });
    material = material || chairMesh.material;
    const cx2 = CHOWK_TEA_POS.x - 4.5 + (i % 2) * 0.7;
    const cz2 = CHOWK_TEA_POS.z - 0.6 + Math.floor(i / 2) * 0.7;
    geos.push(chairMesh.geometry.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(cx2, 0.2, cz2)));
  });

  const mesh = new THREE.Mesh(mergeGeometries(geos), material);
  mesh.name = 'chowk_plaza_furniture';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

/** Colliders for the chowk — the tea stall's back wall + counter (blocks walk-
 * through, same reasoning as the bazaar's own counters), the chabutra kerb. Chairs/
 * benches are deliberately NOT solid (small enough, and low-stakes to walk through —
 * matching how this game never bothered colliding the halwai's own plastic chairs). */
export function chowkColliders() {
  const world = chowkWorldMatrix();
  const toWorld = (lx, lz) => {
    const v = new THREE.Vector3(lx, 0, lz).applyMatrix4(world);
    return { x: v.x, z: v.z };
  };
  const boxes = [];
  const { w, d } = CHOWK_TEA;
  const backA = toWorld(-w / 2, d / 2 - WALL_THICKNESS);
  const backB = toWorld(w / 2, d / 2);
  boxes.push({ minX: Math.min(backA.x, backB.x), maxX: Math.max(backA.x, backB.x), minZ: Math.min(backA.z, backB.z), maxZ: Math.max(backA.z, backB.z) });
  const counterA = toWorld(-w / 2 + 0.3, -d / 2 + 0.05);
  const counterB = toWorld(w / 2 - 0.3, -d / 2 + 0.55);
  boxes.push({ minX: Math.min(counterA.x, counterB.x), maxX: Math.max(counterA.x, counterB.x), minZ: Math.min(counterA.z, counterB.z), maxZ: Math.max(counterA.z, counterB.z) });
  const chabX = CHOWK_CENTER.x - 3;
  const chabZ = CHOWK_CENTER.z + 2;
  boxes.push({ minX: chabX - 1.3, maxX: chabX + 1.3, minZ: chabZ - 1.3, maxZ: chabZ + 1.3 });
  return boxes;
}

// --- Item 5: connect the lane from the hero zone to the bazaar. Same treatment as
// every other lane in the village (src/paths.js buildStripSegment — a bumpy, jittered
// strip, never a flat straight ribbon) — a 2-segment bend from the house down to the
// chowk (a single straight shot would cross the "no straight lines" rule) plus one
// long segment running the length of the bazaar's own frontage, so the tractor/cart
// can drive from one end of the row to the other, not just up to the chowk and no
// further. All 3 segments merge into ONE draw call, same as the field track loop. ---

// Bugfix (found via a scripted drive test, not inspection): the lane's own start
// point must be a real, open, vehicle-width point, not just any point the existing
// lane network's geometry happens to touch. HOUSE_CENTER itself sits inside the
// house's z=[32,40] footprint, essentially at the doorway threshold — the 1.3m door
// gap is wide enough for the player on foot but not for a ~2m-wide tractor, so a
// vehicle spawned/driven there gets stuck fighting wall collision every frame (speed
// climbs normally, position barely moves — the tell-tale sign, not a rendering bug).
// `{x: HOUSE_CENTER.x, z: HOUSE_CENTER.z + 7}` is the same courtyard point
// src/field.js's own LANE_JOIN already uses to spur the existing lane to the track —
// proven open, real vehicles already use it.
const BAZAAR_LANE_START = { x: HOUSE_CENTER.x, z: HOUSE_CENTER.z + 7 };
const BAZAAR_LANE_BEND = { x: -58, z: 22 };
const BAZAAR_LANE_ARRIVE = { x: -58, z: 8 }; // just north-east of the chowk plaza
const BAZAAR_LANE_ROW_WIDTH = 6;

export function buildBazaarLane() {
  const rowFrontageStart = { x: BAZAAR_WEST_X + 2, z: 8 }; // just past unit 1's west end
  const segments = [
    buildStripSegment(BAZAAR_LANE_START, BAZAAR_LANE_BEND, BAZAAR_LANE_ROW_WIDTH, { seed: 41, ruts: true }),
    buildStripSegment(BAZAAR_LANE_BEND, BAZAAR_LANE_ARRIVE, BAZAAR_LANE_ROW_WIDTH, { seed: 42, ruts: true }),
    buildStripSegment(BAZAAR_LANE_ARRIVE, rowFrontageStart, BAZAAR_LANE_ROW_WIDTH, { seed: 43, ruts: true }),
  ];
  return mergeMeshList(segments, 'bazaar_lane');
}
