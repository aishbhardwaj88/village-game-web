import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedWallBox, texturedThickBox, getTiledMaterial, bakeFlatTintColors, ensureUv2 } from './materials.js';
import { PALETTE, darken, WALL_TINT_STRENGTH, WALL_THICKNESS, HOUSE_CENTER } from './village.js';
import { mergeGroupByMaterial, mergeMeshList } from './mergeUtils.js';
import { buildStripSegment, buildKerbSegments, buildDrainSegments } from './paths.js';
import { colliderBoxFromTransform } from './collision.js';
import { buildGoodsMesh, DESIGN as GOODS } from './shopGoods.js';

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
  // Converted from a second sweet shop (docs/NEEDS_YOU.md — "two sweet shops" was
  // one too many for a small village; the lane halwai stays, this one became a
  // puncture/cycle repair shop instead, 2026-10-20) — keeps the same cream wall
  // tint (no new texture asset) with a worn-metal shutter colour instead of the
  // old mithai red.
  { n: 8, trade: 'puncture', hi: 'पंचर और साइकिल मरम्मत', en: 'Puncture and Cycle Repair', shutter: 0x5a5a52, wallTint: PALETTE.cream, wallHeight: 3.95 },
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

// Structural fix (playtest): bazaarColliders() — a hand-typed box per back-wall
// segment, party wall and counter, matched by eye to the numbers below — is
// gone. Every one of those meshes now tags/collects its own real collider at
// the point it's built (see buildBazaarRow()/buildBazaarCountersAndShutters()
// above), read automatically by src/collision.js's buildCollidersFromScene().

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
  // Blender bazaar rebuild (2026-10-21, docs/bazaar-row-checklist.md): everything this function builds is the
  // INVISIBLE collision/validator backing ('bazaar_row_old'); tools/blender/build_bazaar_row.py's bazaar_row.glb draws
  // the terrace. (`group` stays the root the chowk, plaza and lane attach to.)
  const old = new THREE.Group();
  old.name = 'bazaar_row_old';

  const backZ = BAZAAR_ROW_CZ + BAZAAR_UNIT_D / 2;
  const frontZ = BAZAAR_FRONT_Z;

  // --- Back wall: 8 segments, each unit's own tint + own (slightly varied) height,
  // merged into one draw call (texturedWallBox always shares the 'plaster' material
  // cache regardless of tint/height — see src/materials.js). ---
  const wallGeos = [];
  const backWallColliders = [];
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
    // This mesh is about to be merged away by the manual mergeGeometries() below,
    // not src/mergeUtils.js's own merge functions (which do this automatically) —
    // same reasoning as src/materials.js's collider tag, just collected by hand
    // here since this call site builds its own merged mesh directly.
    backWallColliders.push(colliderBoxFromTransform(BAZAAR_UNIT_W, WALL_THICKNESS, local));

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
  backWallMesh.userData.colliderBoxes = backWallColliders;
  old.add(backWallMesh);

  // --- Party walls (9): thin dividers running the full unit depth. A uniform height
  // (tallest unit + a hair) reads fine end-on — the back wall above is what actually
  // carries the visible stepped skyline. ---
  const partyH = Math.max(...BAZAAR_UNITS.map((u) => u.wallHeight)) + 0.05;
  const partyGeos = [];
  const partyWallColliders = [];
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
    partyWallColliders.push(colliderBoxFromTransform(WALL_THICKNESS, BAZAAR_UNIT_D, local));
  }
  const partyWallMesh = new THREE.Mesh(mergeGeometries(partyGeos), partyMaterial);
  partyWallMesh.name = 'bazaar_party_walls';
  partyWallMesh.castShadow = true;
  partyWallMesh.receiveShadow = true;
  partyWallMesh.userData.colliderBoxes = partyWallColliders;
  old.add(partyWallMesh);

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
  old.add(roofMesh);

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
  // docs/FINISH_LINE.md Step C — real corrugated tin texture, matching what
  // this whole feature is already named above ("corrugated-tin awning") —
  // it had been built with the generic flat-tinted 'metal' set (shared with
  // the school gate) the whole time. Same one-shared-Material pattern, so
  // this costs nothing extra (still exactly one draw call for the awning).
  for (const g of awningGeos) {
    ensureUv2(g);
    bakeFlatTintColors(g, 0xffffff, 0);
  }
  const awningMaterial = getTiledMaterial('tin', { repeatX: awningLen / 2, repeatY: 1, roughness: 0.85, vertexColors: true });
  const awningMesh = new THREE.Mesh(mergeGeometries(awningGeos), awningMaterial);
  awningMesh.name = 'bazaar_awning';
  awningMesh.castShadow = true;
  awningMesh.receiveShadow = true;
  old.add(awningMesh);

  // --- Continuous front step/plinth, per LAYOUT.md ("a low continuous step runs the
  // length of the front") — reuses BuildingKit's shared plinth instance, same as
  // every other building's plinth ring. Item 2c (shopfronts read flat): a touch
  // taller/deeper than the original so its own shadow actually reads at a normal
  // viewing distance — still "low" per LAYOUT.md, not a full porch step. ---
  const stepH = 0.2;
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
  old.add(floorMesh);

  // --- Lintel band + jamb trim per unit front (item 1's "recessed openings with a
  // lintel band" rule, adapted: the front has no wall to cut a hole into — see the
  // file doc comment — so this is a header beam across the opening plus trim on the
  // flanking party walls' inner front edge, at BuildingKit's shared trim colour).
  // Item 2c (shopfronts read flat): thickened from the original 0.1x0.1/0.08x0.08 —
  // too thin to cast a visible shadow at normal viewing distance. ---

  // --- Drainpipes/switchboards "here and there" (item 1), not on every unit. ---

  mergeGroupByMaterial(old);
  group.add(old);
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
  const counterColliders = [];
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
    // The counter blocks walk/drive-through past each unit's open (wall-less)
    // shopfront — same collider-tagging reasoning as the walls, see
    // src/materials.js's texturedWallBox(); texturedThickBox() doesn't tag itself
    // (used for lots of non-blocking trim too), so it's collected by hand here.
    counterColliders.push(colliderBoxFromTransform(counterW, 0.5, counterLocal));

    // Item 2c (shopfronts read flat) — a solid housing box the shutter rolls up
    // into, set back slightly from the opening plane (a real recess, not a flat
    // cutout), dark neutral so it doesn't compete with each unit's own trade
    // colour on the bundle below it. Same 'metal' family/repeat as the shutter
    // bundle (tint is vertex-baked, not a separate Material — see materials.js's
    // doc comment) so this stays inside the shutter mesh's one draw call.
    const openingW = BAZAAR_UNIT_W - WALL_THICKNESS - 0.2;
    const housingMesh = texturedThickBox(openingW, 0.3, 0.2, 'metal', { tint: darken(PALETTE.woodTrim, 0.55), tileSize: 1, roughness: 1 });
    shutterMaterial = housingMesh.material;
    const housingLocal = new THREE.Matrix4().makeTranslation(cx, BAZAAR_AWNING_EDGE_H - 0.15, frontZ + 0.03);
    shutterGeos.push(housingMesh.geometry.clone().applyMatrix4(housingLocal));

    // Rolled-open shutter — a thick horizontal bundle tucked just under the
    // housing, in this unit's own LAYOUT.md trade colour, sitting slightly
    // forward of it (real depth between the two, not coplanar). Reads as "open"
    // (not blocking the opening) since it sits high and doesn't extend down.
    const shutterMesh = texturedThickBox(openingW - 0.06, 0.26, 0.18, 'metal', { tint: unit.shutter, tileSize: 1, roughness: 1 });
    const shutterLocal = new THREE.Matrix4().makeTranslation(cx, BAZAAR_AWNING_EDGE_H - 0.32, frontZ - 0.04);
    shutterGeos.push(shutterMesh.geometry.clone().applyMatrix4(shutterLocal));
  });

  const counterMeshMerged = new THREE.Mesh(mergeGeometries(counterGeos), counterMaterial);
  counterMeshMerged.name = 'bazaar_counters';
  counterMeshMerged.castShadow = true;
  counterMeshMerged.receiveShadow = true;
  counterMeshMerged.userData.colliderBoxes = counterColliders;
  group.add(counterMeshMerged);

  const shutterMeshMerged = new THREE.Mesh(mergeGeometries(shutterGeos), shutterMaterial);
  shutterMeshMerged.name = 'bazaar_shutters';
  shutterMeshMerged.castShadow = true;
  group.add(shutterMeshMerged);

  return group;
}

// Item 2a (draw-call budget) — 5x2 grid: 8 bazaar-unit cells + 1 for the chowk tea
// stall's own sign (cell index 8), one shared atlas/mesh/draw-call instead of two
// separate ones. Cell 9 is unused (drawn as plain background, never mapped to).
const SIGN_ATLAS_COLS = 2;
const SIGN_ATLAS_ROWS = 5;
// Wide 4:1 cells matching the real boards (a square cell on an 8:1 board squashed the text flat).
const SIGN_CELL_W = 1024;
const SIGN_CELL_H = 256;
const SIGN_ATLAS_W = SIGN_CELL_W * SIGN_ATLAS_COLS;
const SIGN_ATLAS_H = SIGN_CELL_H * SIGN_ATLAS_ROWS;
const CHOWK_SIGN_CELL_INDEX = 8;

function drawBazaarSign(ctx, col, row, hi, en) {
  const x = col * SIGN_CELL_W;
  const y = row * SIGN_CELL_H;
  ctx.fillStyle = '#f1e4c4';
  ctx.fillRect(x + 4, y + 4, SIGN_CELL_W - 8, SIGN_CELL_H - 8);
  ctx.strokeStyle = '#7a2a1a';
  ctx.lineWidth = 12;
  ctx.strokeRect(x + 10, y + 10, SIGN_CELL_W - 20, SIGN_CELL_H - 20);
  const cx = x + SIGN_CELL_W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Hindi top, small and light; English second line, larger and bolder (the line a player reads). One dark paint colour.
  const fit = (text, font, maxPx, startPx) => {
    let px = startPx;
    ctx.font = font(px);
    while (ctx.measureText(text).width > maxPx && px > 20) { px -= 4; ctx.font = font(px); }
  };
  ctx.fillStyle = '#6e1a12';
  fit(hi, (px) => `500 ${px}px "Noto Sans Devanagari", sans-serif`, SIGN_CELL_W - 140, 60);
  ctx.fillText(hi, cx, y + SIGN_CELL_H * 0.25);
  fit(en, (px) => `900 ${px}px -apple-system, "Segoe UI", Arial, sans-serif`, SIGN_CELL_W - 100, 140);
  ctx.fillText(en, cx, y + SIGN_CELL_H * 0.65);
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
  // Chowk tea stall's own sign — "यादव चाय नाश्ता / Yadav Chai Nashta", spelled
  // exactly as the orthos' own printed signboard reads. A different building from
  // the bazaar row, but sharing this atlas (item 2a) cuts a whole extra draw call.
  drawBazaarSign(ctx, CHOWK_SIGN_CELL_INDEX % SIGN_ATLAS_COLS, Math.floor(CHOWK_SIGN_CELL_INDEX / SIGN_ATLAS_COLS), 'यादव चाय नाश्ता', 'Yadav Chai Nashta');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  // Bugfix (item 2, real playtest report — signboards illegible at play
  // distance/angle): same fix as src/signboards.js — anisotropy defaulted to 1,
  // which lets three.js's mipmap selection collapse the text into a flat blur
  // at the raking angle a board is actually seen from while walking past (not
  // square-on), confirmed via tools/signboard-legibility-check.mjs. Every tiled
  // ground/wall texture in this codebase already sets this (src/materials.js,
  // src/scene.js); this canvas texture just never had it.
  texture.anisotropy = 8;
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

/** All 8 bazaar-unit bilingual signboards PLUS the chowk tea stall's own sign (item
 * 2a — one shared atlas/mesh/draw call instead of two), spellings taken from
 * LAYOUT.md's table (never the reference image, which renders garbled English).
 * Mounted above each unit's own roof/parapet (its own varied height, so the
 * boards ride the stepped skyline like the reference orthos show), not on the awning
 * fascia — a board at fascia height sits almost exactly where the awning's own
 * high/wall-attached edge reaches (3.4m), which hid the whole board behind the sloped
 * awning panel in an early version of this function; see docs/parked.md. Async
 * (font/canvas), same pattern as src/signboards.js — not awaited inline by the caller. */
export async function buildBazaarSignboards() {
  const texture = await buildBazaarSignAtlas();
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  material.name = 'signboard'; // world-validator (check 2) — see src/signboards.js's matching comment
  const geos = [];
  BAZAAR_UNITS.forEach((unit, idx) => {
    const cx = bazaarUnitCx(idx);
    const boardY = unit.wallHeight + 0.12 + 0.28 + 0.12 + (BAZAAR_UNIT_W - 0.5) / 8; // clear of this unit's own roof slab + parapet lip
    const geo = new THREE.BoxGeometry(BAZAAR_UNIT_W - 0.5, (BAZAAR_UNIT_W - 0.5) / 4, 0.04);
    const col = idx % SIGN_ATLAS_COLS;
    const row = Math.floor(idx / SIGN_ATLAS_COLS);
    mapFrontFaceToAtlasCell(geo, col, row);
    const local = new THREE.Matrix4().makeTranslation(cx, boardY, BAZAAR_FRONT_Z - (idx === 4 ? 0.22 : 0.05)); // unit 5: stand proud of the Blender pediment_a (FRONT-0.15) that hid the Barber board
    geos.push(geo.applyMatrix4(local));
  });
  // Item 2a — the chowk tea stall's board, sharing this same atlas/mesh (was its
  // own separate buildTeaStallChowkSign() mesh/draw call).
  {
    const chowkGeo = new THREE.BoxGeometry(CHOWK_TEA.w - 1.2, (CHOWK_TEA.w - 1.2) / 4, 0.04);
    mapFrontFaceToAtlasCell(chowkGeo, CHOWK_SIGN_CELL_INDEX % SIGN_ATLAS_COLS, Math.floor(CHOWK_SIGN_CELL_INDEX / SIGN_ATLAS_COLS));
    const chowkWorld = chowkWorldMatrix();
    // Bugfix (docs/FINISH_LINE.md Step B, real-camera check —
    // tools/signboard-8m-check.mjs): +0.55 left the Devanagari line brushing
    // right against the pavilion roof's own sloped near edge at a real 8m
    // viewing distance (same category of issue as the hero-zone tea stall's
    // own sign, just milder here) — the English line read fine, but the
    // primary (larger, per CLAUDE.md's language-order law) line shouldn't be
    // the one left tight to an edge. +0.8 gives it the same real clearance
    // margin the tea stall's own fix uses.
    const chowkLocal = new THREE.Matrix4().makeTranslation(0, CHOWK_TEA.roofEdgeH + 0.5 + (CHOWK_TEA.w - 1.2) / 8, -CHOWK_TEA.d / 2 - 0.05);
    geos.push(chowkGeo.applyMatrix4(chowkLocal).applyMatrix4(chowkWorld));
  }
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

/** Kirana (unit 1) stock: real-shaped printed packets on the two shelf boards and the counter, one merged mesh (src/shopGoods.js atlas). */
export function buildBazaarKiranaGoods() {
  const cx = bazaarUnitCx(0);
  const backZ = BAZAAR_ROW_CZ + BAZAAR_UNIT_D / 2 - WALL_THICKNESS - 0.18;
  const D = GOODS;
  const items = [];
  let n = 0;
  const rnd = () => { n++; return ((Math.sin(n * 53.3) + 1) * 0.5 * 9973) % 1; };
  const half = (BAZAAR_UNIT_W - 0.7) / 2 - 0.1;
  // shelf boards are at y 1.2 / 2.05 (+0.025 board half-thickness), depth 0.32 centred on backZ; shop faces -z, so packs turn by PI
  for (const [y, row] of [[1.225, 0], [2.075, 1]]) {
    let x = -half;
    while (x < half) {
      const roll = rnd();
      const z = backZ - 0.04 + (rnd() - 0.5) * 0.08;
      const ry = Math.PI + (rnd() - 0.5) * 0.35;
      if (row === 0) {
        if (roll < 0.4) { items.push({ kind: 'biscuit', design: rnd() < 0.5 ? D.biscuitBlue : D.biscuitOrange, x: cx + x, y, z, ry, rx: -0.1 }); x += 0.145; }
        else if (roll < 0.7) { items.push({ kind: 'tea', design: D.tea, x: cx + x, y, z, ry }); x += 0.125; }
        else { items.push({ kind: 'jar', design: D.toffeeJar, x: cx + x, y, z, ry: rnd() * 6, s: 0.95 }); x += 0.19; }
      } else {
        items.push({ kind: rnd() < 0.65 ? 'chips' : 'namkeen', design: rnd() < 0.65 ? [D.chipsRed, D.chipsGreen, D.chipsBlue][Math.floor(rnd() * 3)] : D.namkeen, x: cx + x, y, z, ry, s: 0.9 + rnd() * 0.15 });
        x += 0.145;
      }
    }
  }
  // counter top (y 0.9): toffee jars and a row of soap
  const counterZ = BAZAAR_FRONT_Z + 0.6;
  for (const dx of [-1.3, -0.9, 1.3]) items.push({ kind: 'jar', design: D.toffeeJar, x: cx + dx, y: BAZAAR_COUNTER_H + 0.08, z: counterZ, ry: dx * 5, s: 1.05 });
  for (let k = 0; k < 4; k++) items.push({ kind: 'soap', design: [D.soapGreen, D.soapPink, D.soapBlue][k % 3], x: cx + 0.2 + k * 0.11, y: BAZAAR_COUNTER_H + 0.08, z: counterZ, ry: (k - 1.5) * 0.1 });
  return buildGoodsMesh(items, new THREE.Matrix4(), 'bazaar_kirana_stock');
}

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
    cylGeos.push(geo); // rings ride in the cylinder mesh (one draw call fewer; tinted rubber/glass rings read the same at lane distance)
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
    } else if (unit.trade === 'puncture') {
      // Converted from a second sweet shop (docs/NEEDS_YOU.md). Three signature
      // props, all through the same three zero-extra-draw-call buckets every other
      // unit's interior already shares (pushBox/pushCyl/pushTorus below merge into
      // one mesh per category across all 8 units): a puncture tub with a tyre
      // resting in it, a standing hand pump, and a cycle flipped upside down on its
      // seat/handlebars for repair (wheels up) — the universal roadside-mechanic
      // tableau.
      pushCyl(0.32, 0.36, 0.3, cx - 1.1, 0.15, counterZ + 1.0, 0x6a6a62); // the tub
      pushTorus(0.26, 0.055, cx - 1.1, 0.32, counterZ + 1.0, 0x1c1c1c); // tyre resting in the tub (face-up, default rotX)
      pushCyl(0.045, 0.06, 0.05, cx - 1.1, 0.33, counterZ + 1.0, 0x8a8278); // tub base ring, under the tyre
      pushCyl(0.03, 0.045, 0.72, cx + 1.1, 0.36, backInnerZ + 0.1, 0x8a1f1f); // standing hand pump, barrel
      pushBox(0.22, 0.04, 0.05, cx + 1.1, 0.7, backInnerZ + 0.1, 0x2a2a2a); // pump handle
      // Upside-down cycle on the back shelf: frame bar low, two wheels standing
      // above it (same face-on torus orientation src/bazaar.js's bangle rods use).
      pushBox(0.06, 0.06, 1.0, cx, 1.2, backInnerZ + 0.1, 0x2a3a42);
      pushTorus(0.26, 0.05, cx - 0.5, 1.55, backInnerZ + 0.1, 0x1c1c1c);
      pushTorus(0.26, 0.05, cx + 0.5, 1.55, backInnerZ + 0.1, 0x1c1c1c);
      pushBox(0.05, 0.05, 0.35, cx - 0.5, 1.37, backInnerZ + 0.1, 0x3a3a3a);
      pushBox(0.05, 0.05, 0.35, cx + 0.5, 1.37, backInnerZ + 0.1, 0x3a3a3a);
      pushBox(0.22, 0.05, 0.14, cx, 1.02, backInnerZ + 0.1, 0x1a1a1a); // seat, resting on the (implicit) bench below
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
  const wallWorldMatrix = new THREE.Matrix4().multiplyMatrices(world, wallLocal);
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
  wallMesh.userData.colliderBoxes = [colliderBoxFromTransform(w, WALL_THICKNESS, wallWorldMatrix)];
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
  const counterWorldMatrix = new THREE.Matrix4().multiplyMatrices(world, counterLocal);
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
  // Only the counter (blocks walk/drive-through past the open front) — posts and
  // the sloped roof above head height are deliberately not solid.
  tealMesh.userData.colliderBoxes = [colliderBoxFromTransform(w - 0.6, 0.5, counterWorldMatrix)];
  group.add(tealMesh);

  return group;
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
    // docs/FINISH_LINE.md Step C — real (CC0, intact/"modern"-tagged, never
    // damaged) brick texture instead of tinted terracotta, matching what this
    // function's own doc comment already called this ("a chabutra (circular
    // brick platform)") — this is also the material the WHOLE merged mesh
    // (kerb+deck+benches+chairs) ends up drawn with (`material = material ||
    // ...` below takes whichever texturedThickBox call runs first), so this
    // one swap is the real fix, at no extra draw-call cost.
    const segMesh = texturedThickBox(0.55, 0.5, 0.25, 'brick', { tint: 0xffffff, tileSize: 0.6, tintStrength: 0, roughness: 0.95 });
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
  // Chabutra kerb — a real (if approximate) collider derived from the same
  // kerbR/chabX/chabZ driving the 12 real kerb-segment meshes above, not a
  // separately hand-typed box (playtest structural fix). Chairs/benches are
  // deliberately not solid (small, low-stakes to walk through — matching how
  // this game never bothered colliding the halwai's own plastic chairs).
  mesh.userData.colliderBoxes = [{ minX: chabX - kerbR, maxX: chabX + kerbR, minZ: chabZ - kerbR, maxZ: chabZ + kerbR }];

  mesh.name = 'chowk_plaza_furniture';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
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
// Exported (item 3b, real playtest report — vegetation needs real lane geometry
// to cluster along, not invented coordinates) — values unchanged, just visible
// to src/main.js now.
export const BAZAAR_LANE_START = { x: HOUSE_CENTER.x, z: HOUSE_CENTER.z + 7 };
export const BAZAAR_LANE_BEND = { x: -58, z: 22 };
export const BAZAAR_LANE_ARRIVE = { x: -58, z: 8 }; // just north-east of the chowk plaza
export const BAZAAR_LANE_ROW_WIDTH = 6;
export const BAZAAR_ROW_FRONTAGE_START = { x: BAZAAR_WEST_X + 2, z: 8 }; // just past unit 1's west end

export function buildBazaarLane() {
  const rowFrontageStart = BAZAAR_ROW_FRONTAGE_START;
  const segments = [
    // 2026-10-21 (house rebuild): the straight START->BEND diagonal sliced diagonally through the
    // house compound's courtyard; drawn instead as two legs that stay outside the compound walls —
    // west along the lane (z=47.5, just south of the gate wall) then north along x=-58 (the same
    // route tools/world-validator.js's BAZAAR_CHAIN already walks). Constants above are unchanged.
    buildStripSegment({ x: BAZAAR_LANE_START.x, z: BAZAAR_LANE_START.z + 1.5 }, { x: -58, z: BAZAAR_LANE_START.z + 1.5 }, BAZAAR_LANE_ROW_WIDTH, { seed: 41, ruts: true }),
    buildStripSegment({ x: -58, z: BAZAAR_LANE_START.z + 1.5 }, BAZAAR_LANE_BEND, BAZAAR_LANE_ROW_WIDTH, { seed: 44, ruts: true }),
    buildStripSegment(BAZAAR_LANE_BEND, BAZAAR_LANE_ARRIVE, BAZAAR_LANE_ROW_WIDTH, { seed: 42, ruts: true }),
    buildStripSegment(BAZAAR_LANE_ARRIVE, rowFrontageStart, BAZAAR_LANE_ROW_WIDTH, { seed: 43, ruts: true }),
    // Cement kerbs on the three approach legs only; the frontage leg stays open to the shop steps.
    ...buildKerbSegments({ x: BAZAAR_LANE_START.x, z: BAZAAR_LANE_START.z + 1.5 }, { x: -58, z: BAZAAR_LANE_START.z + 1.5 }, BAZAAR_LANE_ROW_WIDTH, 0.1, 0.9, { seed: 41 }),
    ...buildKerbSegments({ x: -58, z: BAZAAR_LANE_START.z + 1.5 }, BAZAAR_LANE_BEND, BAZAAR_LANE_ROW_WIDTH, 0.1, 0.9, { seed: 44 }),
    ...buildKerbSegments(BAZAAR_LANE_BEND, BAZAAR_LANE_ARRIVE, BAZAAR_LANE_ROW_WIDTH, 0.1, 0.9, { seed: 42 }),
    ...buildDrainSegments({ x: BAZAAR_LANE_START.x, z: BAZAAR_LANE_START.z + 1.5 }, { x: -58, z: BAZAAR_LANE_START.z + 1.5 }, BAZAAR_LANE_ROW_WIDTH, 0.1, 0.9, { seed: 45, side: -1 }),
    ...buildDrainSegments({ x: -58, z: BAZAAR_LANE_START.z + 1.5 }, BAZAAR_LANE_BEND, BAZAAR_LANE_ROW_WIDTH, 0.1, 0.9, { seed: 46, side: 1 }),
    ...buildDrainSegments(BAZAAR_LANE_BEND, BAZAAR_LANE_ARRIVE, BAZAAR_LANE_ROW_WIDTH, 0.1, 0.9, { seed: 47, side: -1 }),
  ];
  return mergeMeshList(segments, 'bazaar_lane');
}
