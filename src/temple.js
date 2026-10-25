import { pt } from './anchors.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedWallBox, getTiledMaterial, bakeFlatTintColors, ensureUv2 } from './materials.js';
import { PALETTE, darken, WALL_TINT_STRENGTH, WALL_THICKNESS } from './village.js';
import { mergeGroupByMaterial, mergeMeshList } from './mergeUtils.js';
import { buildStripSegment, buildKerbSegments, buildDrainSegments } from './paths.js';
import { colliderBoxFromTransform } from './collision.js';

/**
 * Village mandir + flower stall (headroom-pass task item 2, docs/parked.md).
 *
 * reference-from-unity/MAP.md gives a placement RULE for the four religious
 * buildings ("small, peripheral, spread around the edges of the abadi, none of
 * them dominant or central... scenery and ambient sound only, no gameplay of any
 * kind — see CLAUDE.md rule 5") but, being "a written spec, not a blueprint" per
 * its own preamble, no exact coordinate — and `Places V1/flower_stall/LAYOUT.md`'s
 * own WorldData mandir coordinate (-140, 220) is the old Unity reference project's
 * coordinate system, which this web build has never used literally (same reasoning
 * as the bazaar row's own placement — see the 2026-09-19 "in-game placement" entry
 * in docs/parked.md). Placed on new ground east of the hero-zone corridor and north
 * of the field/track loop (clear of both — the track's own north edge sits at
 * z=25 across the x range this would otherwise cross), reachable by a short new
 * lane spur off the corridor near the halwai (item 4's lane network). Genuinely
 * peripheral relative to the hero zone/bazaar cluster, matching MAP.md's rule.
 *
 * Plain and dignified per this task's own item 2 instruction and CLAUDE.md section
 * 4: no deity figures, no religious imagery, no text anywhere on or in it.
 */
export const TEMPLE_POS = pt('temple'); // entrance faces west (-x), toward the approach lane

export const PLOT = { w: 12, d: 10 }; // boundary wall footprint
export const PLINTH = { w: 6, d: 5, h: 0.4 };
// Peepal chabutra centre — exported so main.js can give it its own contact shadow
// (item 6, verify) without duplicating this offset.
export const PEEPAL_PLATFORM_POS = { x: TEMPLE_POS.x + PLOT.w / 2 + 2.5, z: TEMPLE_POS.z };
export const PEEPAL_PLATFORM_RADIUS = 1.4;
const SHRINE = { w: 2.6, d: 2.6, h: 2.6, cx: TEMPLE_POS.x + 1.5 }; // east half of the plinth
const PORCH = { w: 3, d: 2.2, h: 2.6, cx: TEMPLE_POS.x - 1.5 }; // west half, toward the entrance
const ROOF_Y = SHRINE.h;
const BOUNDARY_H = 0.7;
const GATE_W = 2.6; // gap in the west boundary wall, aligned with the plinth steps

const PLINTH_TINT = 0x8f8878; // matches BuildingKit's own plinth tone, docs/look-standard.md
const ROOF_TINT = 0xd7d2c4; // matches every other roof slab in the village
const WALL_TINT = PALETTE.cream;

function pushBox(geos, w, h, d, x, y, z, tint) {
  const g = new THREE.BoxGeometry(w, h, d);
  ensureUv2(g);
  bakeFlatTintColors(g, tint, 1);
  g.applyMatrix4(new THREE.Matrix4().setPosition(x, y, z));
  geos.push(g);
}

/** The mandir itself: boundary wall, raised plinth + steps, pillared porch, shrine
 * block, stepped shikhar, and a small bell hung at the porch entrance. Reuses the
 * village's one shared BuildingKit (main.js) for the plinth ring/pilasters/opening/
 * steps, same as every other building — kit.finalize() is called once, centrally,
 * not here. */
export function buildTemple(kit) {
  const group = new THREE.Group();
  group.name = 'temple';
  // Blender temple (2026-10-21, docs/temple-checklist.md): everything built here is the INVISIBLE collision/validator
  // backing ('temple_old'); tools/blender/build_temple.py's temple.glb draws it. `group` stays the root the flower
  // stall and lane attach to.
  const old = new THREE.Group();
  old.name = 'temple_old';

  // --- Boundary wall: low, with a gap on the west (entrance) side. ---
  const bx0 = TEMPLE_POS.x - PLOT.w / 2;
  const bx1 = TEMPLE_POS.x + PLOT.w / 2;
  const bz0 = TEMPLE_POS.z - PLOT.d / 2;
  const bz1 = TEMPLE_POS.z + PLOT.d / 2;
  const boundaryMeshes = [
    texturedWallBox(PLOT.w, BOUNDARY_H, WALL_THICKNESS, 'plaster', { tint: WALL_TINT, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH, seed: 11.3 }), // south
    texturedWallBox(PLOT.w, BOUNDARY_H, WALL_THICKNESS, 'plaster', { tint: WALL_TINT, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH, seed: 22.7 }), // north
    texturedWallBox(PLOT.d, BOUNDARY_H, WALL_THICKNESS, 'plaster', { tint: WALL_TINT, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH, seed: 33.1 }), // east
  ];
  const westSegLen = (PLOT.d - GATE_W) / 2;
  const westMeshes = [
    texturedWallBox(westSegLen, BOUNDARY_H, WALL_THICKNESS, 'plaster', { tint: WALL_TINT, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH, seed: 44.5 }),
    texturedWallBox(westSegLen, BOUNDARY_H, WALL_THICKNESS, 'plaster', { tint: WALL_TINT, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH, seed: 55.9 }),
  ];
  // Structural fix (item 1c, collider-coverage audit) — w/d here must match the
  // LOCAL (pre-rotation) box each matrix is built for, same as the geometry
  // above (texturedWallBox(PLOT.d, ..., WALL_THICKNESS) for east,
  // texturedWallBox(westSegLen, ..., WALL_THICKNESS) for the west segments):
  // local X = the wall's long run, local Z = its thickness, THEN the Y
  // rotation carries that into world Z-long/X-thin. These three entries had
  // w/d swapped, so colliderBoxFromTransform's rotated corners came out
  // long-in-X/thin-in-Z instead of long-in-Z/thin-in-X — a real ~10m
  // collider-less gap along the east and west boundary walls (tools/collider-
  // audit.js caught it; the visual wall was always there, nothing solid was).
  const boundarySegments = [
    { w: PLOT.w, d: WALL_THICKNESS, matrix: new THREE.Matrix4().setPosition(TEMPLE_POS.x, BOUNDARY_H / 2, bz0) }, // south
    { w: PLOT.w, d: WALL_THICKNESS, matrix: new THREE.Matrix4().setPosition(TEMPLE_POS.x, BOUNDARY_H / 2, bz1) }, // north
    { w: PLOT.d, d: WALL_THICKNESS, matrix: new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(bx1, BOUNDARY_H / 2, TEMPLE_POS.z) }, // east
    {
      w: westSegLen,
      d: WALL_THICKNESS,
      matrix: new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(bx0, BOUNDARY_H / 2, TEMPLE_POS.z - GATE_W / 2 - westSegLen / 2),
    },
    {
      w: westSegLen,
      d: WALL_THICKNESS,
      matrix: new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(bx0, BOUNDARY_H / 2, TEMPLE_POS.z + GATE_W / 2 + westSegLen / 2),
    },
  ];
  const boundaryGeos = [
    boundaryMeshes[0].geometry.clone().applyMatrix4(boundarySegments[0].matrix),
    boundaryMeshes[1].geometry.clone().applyMatrix4(boundarySegments[1].matrix),
    boundaryMeshes[2].geometry.clone().applyMatrix4(boundarySegments[2].matrix),
    westMeshes[0].geometry.clone().applyMatrix4(boundarySegments[3].matrix),
    westMeshes[1].geometry.clone().applyMatrix4(boundarySegments[4].matrix),
  ];
  const boundaryMesh = new THREE.Mesh(mergeGeometries(boundaryGeos), boundaryMeshes[0].material);
  boundaryMesh.name = 'temple_boundary_wall';
  boundaryMesh.castShadow = true;
  boundaryMesh.receiveShadow = true;
  // Note the real gap at the west (entrance) face — two separate segments flanking
  // GATE_W, not one hand-typed notched box (playtest structural fix).
  boundaryMesh.userData.colliderBoxes = boundarySegments.map((s) => colliderBoxFromTransform(s.w, s.d, s.matrix));
  old.add(boundaryMesh);

  // --- Raised plinth (kit.addPlinthSegment as one solid slab, not a ring — this is
  // a platform to stand ON, not a building's foundation skirt) + 3 steps on the west
  // (entrance) side. ---

  // --- Shrine block (garbhagriha) — plain walls, one west-facing opening (no door
  // leaf: left open, deliberately no interior detail/idol per this item's "no
  // deity figures, no religious imagery" instruction), sitting on the plinth's
  // east half. ---
  const shrineWallMesh = texturedWallBox(SHRINE.w, SHRINE.h, SHRINE.d, 'plaster', { tint: WALL_TINT, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH, seed: 66.2 });
  const shrineMatrix = new THREE.Matrix4().setPosition(SHRINE.cx, PLINTH.h + SHRINE.h / 2, TEMPLE_POS.z);
  const shrineGeo = shrineWallMesh.geometry.clone().applyMatrix4(shrineMatrix);
  // Pre-existing bug found while wiring up collision (unrelated to this task, fixed
  // in passing): this geometry was computed but never added to the scene — the
  // shrine's own walls were invisible, only ever colliding on an object nobody
  // could see, via this file's own now-removed hand-written templeColliders().
  const shrineMesh = new THREE.Mesh(shrineGeo, shrineWallMesh.material);
  shrineMesh.name = 'temple_shrine_wall';
  shrineMesh.castShadow = true;
  shrineMesh.receiveShadow = true;
  shrineMesh.userData.colliderBoxes = [colliderBoxFromTransform(SHRINE.w, SHRINE.d, shrineMatrix)];
  old.add(shrineMesh);

  // --- Porch — 4 plain square pillars, open on 3 sides, same roof as the shrine. ---
  const pillarSize = 0.25;
  const pillarInset = 0.2;
  const porchPillarGeos = [];
  for (const px of [PORCH.cx - PORCH.w / 2 + pillarInset, PORCH.cx + PORCH.w / 2 - pillarInset]) {
    for (const pz of [TEMPLE_POS.z - PORCH.d / 2 + pillarInset, TEMPLE_POS.z + PORCH.d / 2 - pillarInset]) {
      pushBox(porchPillarGeos, pillarSize, PORCH.h, pillarSize, px, PLINTH.h + PORCH.h / 2, pz, PALETTE.woodTrim);
    }
  }
  const pillarMaterial = getTiledMaterial('wood', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const pillarMesh = new THREE.Mesh(mergeGeometries(porchPillarGeos), pillarMaterial);
  pillarMesh.name = 'temple_porch_pillars';
  pillarMesh.castShadow = true;
  pillarMesh.receiveShadow = true;
  old.add(pillarMesh);

  // --- One flat roof slab over the whole plinth footprint (shrine + porch), plus a
  // plain stepped shikhar rising above the shrine's own half only. ---
  const roofGeos = [];
  pushBox(roofGeos, PLINTH.w + 0.3, 0.15, PLINTH.d + 0.3, TEMPLE_POS.x, PLINTH.h + ROOF_Y + 0.075, TEMPLE_POS.z, ROOF_TINT);
  const tiers = [
    { w: 1.8, h: 0.8 },
    { w: 1.3, h: 0.7 },
    { w: 0.9, h: 0.55 },
    { w: 0.45, h: 0.45 }, // finial cap — plain, no ornamentation
  ];
  let tierY = PLINTH.h + ROOF_Y + 0.15;
  for (const t of tiers) {
    pushBox(roofGeos, t.w, t.h, t.w, SHRINE.cx, tierY + t.h / 2, TEMPLE_POS.z, ROOF_TINT);
    tierY += t.h;
  }
  const roofMaterial = getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const roofMesh = new THREE.Mesh(mergeGeometries(roofGeos), roofMaterial);
  roofMesh.name = 'temple_roof_shikhar';
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  old.add(roofMesh);

  // --- A small bell hung from the porch's own lintel, at the entrance. Same
  // construction as the bazaar interior's bangle rings (torus + a short chain) —
  // uv2 baked so it shares the village's one vertex-coloured 'metal' Material. ---
  const bellGeos = [];
  const bellX = TEMPLE_POS.x - PLINTH.w / 2 - 0.5;
  const bellTopY = PLINTH.h + PORCH.h - 0.1;
  {
    const chain = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6);
    ensureUv2(chain);
    bakeFlatTintColors(chain, 0x2a2a2a, 1);
    chain.applyMatrix4(new THREE.Matrix4().setPosition(bellX, bellTopY - 0.17, TEMPLE_POS.z));
    bellGeos.push(chain);

    const bell = new THREE.TorusGeometry(0.1, 0.045, 8, 16);
    ensureUv2(bell);
    bakeFlatTintColors(bell, 0x8a7a3a, 1);
    bell.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(bellX, bellTopY - 0.4, TEMPLE_POS.z));
    bellGeos.push(bell);
  }
  const bellMaterial = getTiledMaterial('metal', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const bellMesh = new THREE.Mesh(mergeGeometries(bellGeos), bellMaterial);
  bellMesh.name = 'temple_bell';
  bellMesh.castShadow = true;
  old.add(bellMesh);

  // --- Peepal platform beside the temple — same round brick-kerb chabutra as the
  // chowk's (src/bazaar.js buildChowkPlaza), left EMPTY (no tree — see docs/parked.md
  // on why: no licensed tree model exists this session, same reasoning as the
  // chowk's own chabutra) and explicitly reserved for one. ---
  const chabX = PEEPAL_PLATFORM_POS.x;
  const chabZ = PEEPAL_PLATFORM_POS.z;
  const kerbGeos = [];
  const kerbSegs = 14;
  const kerbR = PEEPAL_PLATFORM_RADIUS;
  for (let i = 0; i < kerbSegs; i++) {
    const a0 = (i / kerbSegs) * Math.PI * 2;
    pushBox(kerbGeos, 0.6, 0.5, 0.25, chabX + Math.sin(a0) * kerbR, 0.25, chabZ + Math.cos(a0) * kerbR, darken(PALETTE.terracotta));
  }
  const kerbMaterial = getTiledMaterial('terracotta', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const kerbMesh = new THREE.Mesh(mergeGeometries(kerbGeos), kerbMaterial);
  kerbMesh.name = 'temple_peepal_kerb';
  kerbMesh.castShadow = true;
  kerbMesh.receiveShadow = true;
  old.add(kerbMesh);

  const deckGeos = [];
  pushBox(deckGeos, 2.4, 0.06, 2.4, chabX, 0.53, chabZ, ROOF_TINT);
  const deckMaterial = getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const deckMesh = new THREE.Mesh(deckGeos[0], deckMaterial);
  deckMesh.name = 'temple_peepal_deck';
  deckMesh.receiveShadow = true;
  old.add(deckMesh);

  mergeGroupByMaterial(old);
  group.add(old);
  return group;
}

/** Informal roadside flower stall (Places V1/flower_stall/LAYOUT.md) — 2.5 x 2 x
 * 2.2m, 4 bamboo poles, a sagging dark green tarp roof, a low plank table with
 * garlands hung from a bamboo rod across the front. No walls, no shutter, no
 * signboard (LAYOUT.md is explicit: "the bilingual signboard rule does not apply
 * here"). Placed just outside the temple's west (entrance) approach, per the
 * LAYOUT.md's own placement note ("just outside the temple approach... on the side
 * people walk in from") — no tree over it (see docs/parked.md, same no-licensed-
 * tree-model reasoning as the chabutra above). */
const FLOWER_STALL = { w: 2.5, d: 2, h: 2.2, tableH: 0.4 };
export const FLOWER_STALL_POS = { x: TEMPLE_POS.x - PLOT.w / 2 - 4, z: TEMPLE_POS.z - 2 };

export function buildFlowerStall() {
  const group = new THREE.Group();
  group.name = 'flower_stall';
  const { x: fx, z: fz } = FLOWER_STALL_POS;

  const poleGeos = [];
  for (const [px, pz] of [
    [-FLOWER_STALL.w / 2 + 0.08, -FLOWER_STALL.d / 2 + 0.08],
    [FLOWER_STALL.w / 2 - 0.08, -FLOWER_STALL.d / 2 + 0.08],
    [-FLOWER_STALL.w / 2 + 0.08, FLOWER_STALL.d / 2 - 0.08],
    [FLOWER_STALL.w / 2 - 0.08, FLOWER_STALL.d / 2 - 0.08],
  ]) {
    pushBox(poleGeos, 0.06, FLOWER_STALL.h, 0.06, fx + px, FLOWER_STALL.h / 2, fz + pz, 0x9a8352);
  }
  // Bamboo rod across the front (south side, facing the approach) — garlands hang
  // from this in the finished scene, per LAYOUT.md's "working details".
  pushBox(poleGeos, FLOWER_STALL.w - 0.1, 0.04, 0.04, fx, FLOWER_STALL.h - 0.5, fz - FLOWER_STALL.d / 2 + 0.08, 0x9a8352);
  const poleMaterial = getTiledMaterial('wood', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const poleMesh = new THREE.Mesh(mergeGeometries(poleGeos), poleMaterial);
  poleMesh.name = 'flower_stall_poles';
  poleMesh.castShadow = true;
  group.add(poleMesh);

  // Sagging tarp roof — a single thin slab, tinted dark green ('metal' family so it
  // shares a draw call with the temple's own bell/other small metal-ish props rather
  // than opening a whole new one-off material).
  const tarpGeos = [];
  pushBox(tarpGeos, FLOWER_STALL.w + 0.2, 0.05, FLOWER_STALL.d + 0.2, fx, FLOWER_STALL.h, fz, 0x2f4a34);
  const tarpMaterial = getTiledMaterial('metal', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const tarpMesh = new THREE.Mesh(mergeGeometries(tarpGeos), tarpMaterial);
  tarpMesh.name = 'flower_stall_tarp';
  tarpMesh.castShadow = true;
  group.add(tarpMesh);

  // Low plank table on stacked bricks, plus a couple of shallow flower baskets —
  // all one 'wood'-family draw call, tinted per-piece via baked vertex colour.
  const furnitureGeos = [];
  pushBox(furnitureGeos, 1.4, FLOWER_STALL.tableH, 0.5, fx, FLOWER_STALL.tableH / 2, fz + 0.3, 0x8a6a4a);
  pushBox(furnitureGeos, 0.35, 0.15, 0.35, fx - 0.6, FLOWER_STALL.tableH + 0.075, fz + 0.3, PALETTE.mustard); // marigold basket
  pushBox(furnitureGeos, 0.35, 0.15, 0.35, fx + 0.3, FLOWER_STALL.tableH + 0.075, fz + 0.3, 0xb23a3a); // rose/hibiscus basket
  pushBox(furnitureGeos, 0.3, 0.35, 0.3, fx + 0.9, 0.175, fz + 0.6, PALETTE.mustard); // a stool-height stack of loose marigold
  // Marigold garlands hanging from the front rod: dense strands of orange, deep
  // saffron and yellow, with the odd pink rose strand. Same wood-family draw call.
  const garlandColours = [0xe8731a, 0xf0a020, 0xe8731a, 0xf4c430, 0xd9531e, 0xf0a020, 0xc2457a, 0xe8731a, 0xf4c430, 0xd9531e];
  const rodY = FLOWER_STALL.h - 0.5;
  garlandColours.forEach((colour, i) => {
    const gx = fx - FLOWER_STALL.w / 2 + 0.2 + i * ((FLOWER_STALL.w - 0.4) / (garlandColours.length - 1));
    const len = 0.7 + ((i * 37) % 5) * 0.12;
    pushBox(furnitureGeos, 0.1, len, 0.1, gx, rodY - len / 2, fz - FLOWER_STALL.d / 2 + 0.1, colour);
  });
  const furnitureMaterial = getTiledMaterial('wood', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const furnitureMesh = new THREE.Mesh(mergeGeometries(furnitureGeos), furnitureMaterial);
  furnitureMesh.name = 'flower_stall_furniture';
  furnitureMesh.castShadow = true;
  furnitureMesh.receiveShadow = true;
  group.add(furnitureMesh);

  // Poles and furniture both use the shared vertex-coloured 'wood' Material (same
  // cache key regardless of their own per-piece tint — see materials.js), so this
  // folds them into one draw call; the tarp keeps its own ('metal' family).
  mergeGroupByMaterial(group);
  return group;
}

// Structural fix (playtest): templeColliders() — a hand-typed box per wall
// segment, matched by eye to the numbers above — is gone. The boundary wall and
// the shrine wall (see buildTemple() above) now tag/collect their own real
// colliders at the point they're built, read automatically by
// src/collision.js's buildCollidersFromScene().

/** Item 4 (tie the village together) — the new lane spur connecting the hero-zone
 * corridor to the temple's west gate / the flower stall. Same bent-waypoint-chain,
 * baked-bump/rut technique as every other lane in this game (src/village.js's
 * buildLane(), src/bazaar.js's buildBazaarLane()) — never a single straight segment,
 * and never a hard edge where it meets open ground (the strip's own edge already
 * fades via the same bump noise every other lane segment uses). 6m wide, matching
 * the hero-zone and bazaar lanes, so the tractor+trolley and the bullock cart have
 * the same clearance here they already have everywhere else.
 *
 * Forks off the house->halwai lane segment at its midpoint (-44, 50.5) — BEFORE
 * reaching the halwai, not east of it. A first version forked at (-32, 64), east of
 * HALWAI_CENTER: since the halwai's only 2 real walls are its north and east ones
 * (src/collision.js), a straight line from anywhere near its open west/south sides
 * out to a point due east of it runs straight through that east wall's own
 * collider. Found by the scripted drive test (item 4's own docs/parked.md entry),
 * not by inspection — same discipline this whole session has used throughout. */
// Exported (item 3b — vegetation needs real lane geometry to cluster along);
// values unchanged.
export const TEMPLE_LANE_START = { x: -44, z: 50.5 };
export const TEMPLE_LANE_BEND = { x: -12, z: 55 };
export const TEMPLE_LANE_ARRIVE = { x: 2, z: 51 }; // temple's west gate opening / beside the flower stall
export const TEMPLE_LANE_WIDTH = 6;

export function buildTempleLane() {
  const segments = [
    buildStripSegment(TEMPLE_LANE_START, TEMPLE_LANE_BEND, TEMPLE_LANE_WIDTH, { seed: 71, ruts: true }),
    buildStripSegment(TEMPLE_LANE_BEND, TEMPLE_LANE_ARRIVE, TEMPLE_LANE_WIDTH, { seed: 72, ruts: true }),
    ...buildKerbSegments(TEMPLE_LANE_START, TEMPLE_LANE_BEND, TEMPLE_LANE_WIDTH, 0.1, 0.9, { seed: 71 }),
    ...buildKerbSegments(TEMPLE_LANE_BEND, TEMPLE_LANE_ARRIVE, TEMPLE_LANE_WIDTH, 0.1, 0.85, { seed: 72 }),
    ...buildDrainSegments(TEMPLE_LANE_START, TEMPLE_LANE_BEND, TEMPLE_LANE_WIDTH, 0.1, 0.9, { seed: 73, side: 1 }),
    ...buildDrainSegments(TEMPLE_LANE_BEND, TEMPLE_LANE_ARRIVE, TEMPLE_LANE_WIDTH, 0.1, 0.85, { seed: 74, side: -1 }),
  ];
  return mergeMeshList(segments, 'temple_lane');
}

/** Visible daily-use props on the porch and plinth (5b rule 3): brass lamp stand with
 * diyas, a donation box, a water kalash, a woven mat, a heap of marigold offerings
 * and two hanging garlands. No idol, no imagery, no tasks. Plain wood/metal/jute/
 * terracotta geometry on the village's shared vertex-coloured materials, so the
 * across-group merge folds it into existing draw calls (no new ones). */
export function buildTempleProps() {
  const group = new THREE.Group();
  group.name = 'temple_props';
  const lists = { wood: [], metal: [], jute: [], terracotta: [] };
  const colliders = [];
  let seed = 31;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const jit = (a) => (rnd() - 0.5) * 2 * a;
  const put = (list, geo, x, y, z, tint, ry = 0) => {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
    ensureUv2(geo);
    bakeFlatTintColors(geo, tint, 1);
    lists[list].push(geo);
  };
  const FLOOR = PLINTH.h;
  const zc = TEMPLE_POS.z;
  const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();

  // Woven mat on the porch floor, slightly skewed, with a darker border strip.
  put('jute', new THREE.BoxGeometry(1.7, 0.025, 1.05), PORCH.cx + 0.1, FLOOR + 0.0125, zc + 0.15, 0x9a6a48, 0.12);
  put('jute', new THREE.BoxGeometry(1.7, 0.03, 0.08), PORCH.cx + 0.1, FLOOR + 0.0135, zc + 0.15 + 0.5, 0x5e3a2a, 0.12);

  // Brass lamp stand (deepstambh): base, stem, wide tray and five diyas.
  const lx = PORCH.cx + 0.4, lz = zc + PORCH.d / 2 + 0.85;
  const brass = 0xb08d3c;
  put('metal', new THREE.CylinderGeometry(0.2, 0.24, 0.06, 12), lx, FLOOR + 0.03, lz, mix(brass, 0x2a2a2a, 0.25));
  put('metal', new THREE.CylinderGeometry(0.04, 0.06, 0.8, 8), lx, FLOOR + 0.46, lz, brass);
  put('metal', new THREE.CylinderGeometry(0.26, 0.2, 0.06, 14), lx, FLOOR + 0.88, lz, mix(brass, 0xd4b45a, 0.4));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const d = new THREE.SphereGeometry(0.055, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    d.scale(1, 0.55, 1);
    put('terracotta', d, lx + Math.cos(a) * 0.15, FLOOR + 0.91, lz + Math.sin(a) * 0.15, mix(0x9a4a28, 0x6e3418, rnd()));
    put('metal', new THREE.SphereGeometry(0.014, 5, 4), lx + Math.cos(a) * 0.15, FLOOR + 0.935, lz + Math.sin(a) * 0.15, 0xffd27a);
  }
  colliders.push(colliderBoxFromTransform(0.5, 0.5, new THREE.Matrix4().setPosition(lx, 0, lz)));

  // Donation box (hundi): painted tin box on a short wooden stand, slot on top.
  const hx = PORCH.cx + 1.2, hz = zc - PORCH.d / 2 - 0.55;
  put('wood', new THREE.BoxGeometry(0.42, 0.55, 0.42), hx, FLOOR + 0.275, hz, 0x6a4a30);
  put('metal', new THREE.BoxGeometry(0.4, 0.34, 0.4), hx, FLOOR + 0.72, hz, 0x7a2a22);
  put('metal', new THREE.BoxGeometry(0.16, 0.02, 0.025), hx, FLOOR + 0.895, hz, 0x1a1a1a);
  put('metal', new THREE.BoxGeometry(0.08, 0.06, 0.03), hx, FLOOR + 0.62, hz - 0.205, 0x2a2a2a); // padlock
  colliders.push(colliderBoxFromTransform(0.5, 0.5, new THREE.Matrix4().setPosition(hx, 0, hz)));

  // Water kalash (brass pot) with a mouth rim, and a loose lota beside it.
  const kx = PORCH.cx - 1.1, kz = zc + PORCH.d / 2 + 0.7;
  const pot = new THREE.SphereGeometry(0.17, 12, 9);
  pot.scale(1, 0.9, 1);
  put('metal', pot, kx, FLOOR + 0.17, kz, mix(brass, 0xc9a24a, 0.5));
  put('metal', new THREE.CylinderGeometry(0.09, 0.07, 0.1, 10), kx, FLOOR + 0.35, kz, brass);
  put('metal', new THREE.TorusGeometry(0.095, 0.014, 5, 12).rotateX(Math.PI / 2), kx, FLOOR + 0.4, kz, mix(brass, 0x2a2a2a, 0.2));
  const lota = new THREE.SphereGeometry(0.09, 10, 8);
  lota.scale(1, 0.8, 1);
  put('metal', lota, kx + 0.4, FLOOR + 0.07, kz - 0.08, 0xa6a39a);

  // Marigold and rose offerings heaped on a leaf plate beside the shrine step.
  const ox = SHRINE.cx - SHRINE.w / 2 - 0.35, oz = zc - 0.35;
  put('jute', new THREE.CylinderGeometry(0.28, 0.26, 0.015, 10), ox, FLOOR + 0.0075, oz, 0x3d5a2a);
  for (let i = 0; i < 34; i++) {
    const r = Math.sqrt(rnd()) * 0.22, a = rnd() * 6.283;
    const petal = new THREE.SphereGeometry(0.04 + rnd() * 0.02, 6, 4);
    petal.scale(1, 0.6, 1);
    const tint = rnd() < 0.8 ? mix(0xe8820e, 0xf5b81c, rnd()) : mix(0xb02a46, 0xd8607a, rnd());
    put('jute', petal, ox + Math.cos(a) * r, FLOOR + 0.04 + (0.22 - r) * 0.25 + rnd() * 0.02, oz + Math.sin(a) * r, tint);
  }
  // A few diyas set along the foot of the shrine wall.
  for (let i = 0; i < 4; i++) {
    const d = new THREE.SphereGeometry(0.05, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    d.scale(1, 0.55, 1);
    put('terracotta', d, ox + 0.1 + jit(0.04), FLOOR + 0.002, zc + 0.35 + i * 0.22 + jit(0.03), mix(0x9a4a28, 0x6e3418, rnd()));
  }

  // Two marigold garlands sagging between the entrance pillars (west face).
  const px = PORCH.cx - PORCH.w / 2 + 0.2 - 0.17;
  for (const [z0, z1, topY, c0, c1] of [[zc - PORCH.d / 2 + 0.2, zc, 2.75, 0xe8820e, 0xf5b81c], [zc, zc + PORCH.d / 2 - 0.2, 2.7, 0xf5b81c, 0xd9561a]]) {
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const t = i / n, sag = Math.sin(t * Math.PI) * 0.32;
      const bead = new THREE.SphereGeometry(0.055 + jit(0.008), 6, 5);
      bead.scale(1, 1.2, 1);
      put('jute', bead, px + jit(0.01), FLOOR + topY - sag, z0 + (z1 - z0) * t, mix(c0, c1, rnd()));
    }
  }

  const mats = {
    wood: getTiledMaterial('wood', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }),
    metal: getTiledMaterial('metal', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }),
    jute: getTiledMaterial('jute', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }),
    terracotta: getTiledMaterial('terracotta', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }),
  };
  for (const key of Object.keys(lists)) {
    const mesh = new THREE.Mesh(mergeGeometries(lists[key]), mats[key]);
    mesh.name = `temple_props_${key}`;
    mesh.castShadow = key !== 'jute';
    mesh.receiveShadow = true;
    if (key === 'metal') mesh.userData.colliderBoxes = colliders;
    group.add(mesh);
  }
  return group;
}
