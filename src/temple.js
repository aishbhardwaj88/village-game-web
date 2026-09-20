import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedWallBox, getTiledMaterial, bakeFlatTintColors, ensureUv2 } from './materials.js';
import { PALETTE, darken, WALL_TINT_STRENGTH, WALL_THICKNESS } from './village.js';
import { mergeGroupByMaterial, mergeMeshList } from './mergeUtils.js';
import { buildStripSegment } from './paths.js';

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
export const TEMPLE_POS = { x: 8, z: 52 }; // entrance faces west (-x), toward the approach lane

const PLOT = { w: 12, d: 10 }; // boundary wall footprint
const PLINTH = { w: 6, d: 5, h: 0.4 };
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
  const boundaryGeos = [
    boundaryMeshes[0].geometry.clone().applyMatrix4(new THREE.Matrix4().setPosition(TEMPLE_POS.x, BOUNDARY_H / 2, bz0)),
    boundaryMeshes[1].geometry.clone().applyMatrix4(new THREE.Matrix4().setPosition(TEMPLE_POS.x, BOUNDARY_H / 2, bz1)),
    boundaryMeshes[2]
      .geometry.clone()
      .applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(bx1, BOUNDARY_H / 2, TEMPLE_POS.z)),
    westMeshes[0].geometry.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(bx0, BOUNDARY_H / 2, TEMPLE_POS.z - GATE_W / 2 - westSegLen / 2)),
    westMeshes[1].geometry.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(bx0, BOUNDARY_H / 2, TEMPLE_POS.z + GATE_W / 2 + westSegLen / 2)),
  ];
  const boundaryMesh = new THREE.Mesh(mergeGeometries(boundaryGeos), boundaryMeshes[0].material);
  boundaryMesh.name = 'temple_boundary_wall';
  boundaryMesh.castShadow = true;
  boundaryMesh.receiveShadow = true;
  group.add(boundaryMesh);

  // --- Raised plinth (kit.addPlinthSegment as one solid slab, not a ring — this is
  // a platform to stand ON, not a building's foundation skirt) + 3 steps on the west
  // (entrance) side. ---
  kit.addPlinthSegment({ x: TEMPLE_POS.x, y: PLINTH.h / 2, z: TEMPLE_POS.z }, { x: PLINTH.w, y: PLINTH.h, z: PLINTH.d });
  const stepCount = 3;
  const stepD = 0.35;
  const stepH = PLINTH.h / stepCount;
  for (let i = 0; i < stepCount; i++) {
    const stepX = TEMPLE_POS.x - PLINTH.w / 2 - stepD * (stepCount - i - 0.5);
    kit.addStep({ x: stepX, y: (stepH * (i + 1)) / 2, z: TEMPLE_POS.z }, { x: stepD, y: stepH * (i + 1), z: 2.4 });
  }

  // --- Shrine block (garbhagriha) — plain walls, one west-facing opening (no door
  // leaf: left open, deliberately no interior detail/idol per this item's "no
  // deity figures, no religious imagery" instruction), sitting on the plinth's
  // east half. ---
  const shrineWallMesh = texturedWallBox(SHRINE.w, SHRINE.h, SHRINE.d, 'plaster', { tint: WALL_TINT, tileSize: 1.5, tintStrength: WALL_TINT_STRENGTH, seed: 66.2 });
  const shrineGeo = shrineWallMesh.geometry
    .clone()
    .applyMatrix4(new THREE.Matrix4().setPosition(SHRINE.cx, PLINTH.h + SHRINE.h / 2, TEMPLE_POS.z));
  kit.addOpening({
    center: { x: SHRINE.cx - SHRINE.w / 2, y: PLINTH.h, z: TEMPLE_POS.z },
    width: 1.1,
    height: 2.0,
    wallThickness: WALL_THICKNESS,
    widthAxis: 'z',
    isDoor: false,
  });
  kit.addCornerPilasters(SHRINE.cx, TEMPLE_POS.z, SHRINE.w, SHRINE.d, SHRINE.h, WALL_THICKNESS);

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
  group.add(pillarMesh);

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
  group.add(roofMesh);

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
  group.add(bellMesh);

  // --- Peepal platform beside the temple — same round brick-kerb chabutra as the
  // chowk's (src/bazaar.js buildChowkPlaza), left EMPTY (no tree — see docs/parked.md
  // on why: no licensed tree model exists this session, same reasoning as the
  // chowk's own chabutra) and explicitly reserved for one. ---
  const chabX = TEMPLE_POS.x + PLOT.w / 2 + 2.5;
  const chabZ = TEMPLE_POS.z;
  const kerbGeos = [];
  const kerbSegs = 14;
  const kerbR = 1.4;
  for (let i = 0; i < kerbSegs; i++) {
    const a0 = (i / kerbSegs) * Math.PI * 2;
    pushBox(kerbGeos, 0.6, 0.5, 0.25, chabX + Math.sin(a0) * kerbR, 0.25, chabZ + Math.cos(a0) * kerbR, darken(PALETTE.terracotta));
  }
  const kerbMaterial = getTiledMaterial('terracotta', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const kerbMesh = new THREE.Mesh(mergeGeometries(kerbGeos), kerbMaterial);
  kerbMesh.name = 'temple_peepal_kerb';
  kerbMesh.castShadow = true;
  kerbMesh.receiveShadow = true;
  group.add(kerbMesh);

  const deckGeos = [];
  pushBox(deckGeos, 2.4, 0.06, 2.4, chabX, 0.53, chabZ, ROOF_TINT);
  const deckMaterial = getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const deckMesh = new THREE.Mesh(deckGeos[0], deckMaterial);
  deckMesh.name = 'temple_peepal_deck';
  deckMesh.receiveShadow = true;
  group.add(deckMesh);

  mergeGroupByMaterial(group);
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

/** Colliders — the temple's boundary wall (with the entrance gate left open) and the
 * shrine block itself (the porch's open pillars are deliberately not solid, same
 * reasoning as every other porch/awning post in this game). */
export function templeColliders() {
  const boxes = [];
  const bx0 = TEMPLE_POS.x - PLOT.w / 2;
  const bx1 = TEMPLE_POS.x + PLOT.w / 2;
  const bz0 = TEMPLE_POS.z - PLOT.d / 2;
  const bz1 = TEMPLE_POS.z + PLOT.d / 2;
  const t = WALL_THICKNESS;
  boxes.push({ minX: bx0, maxX: bx1, minZ: bz0 - t / 2, maxZ: bz0 + t / 2 }); // south
  boxes.push({ minX: bx0, maxX: bx1, minZ: bz1 - t / 2, maxZ: bz1 + t / 2 }); // north
  boxes.push({ minX: bx1 - t / 2, maxX: bx1 + t / 2, minZ: bz0, maxZ: bz1 }); // east
  const westSegLen = (PLOT.d - GATE_W) / 2;
  boxes.push({ minX: bx0 - t / 2, maxX: bx0 + t / 2, minZ: bz0, maxZ: bz0 + westSegLen }); // west, south segment
  boxes.push({ minX: bx0 - t / 2, maxX: bx0 + t / 2, minZ: bz1 - westSegLen, maxZ: bz1 }); // west, north segment
  boxes.push({
    minX: SHRINE.cx - SHRINE.w / 2,
    maxX: SHRINE.cx + SHRINE.w / 2,
    minZ: TEMPLE_POS.z - SHRINE.d / 2,
    maxZ: TEMPLE_POS.z + SHRINE.d / 2,
  });
  return boxes;
}

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
const TEMPLE_LANE_START = { x: -44, z: 50.5 };
const TEMPLE_LANE_BEND = { x: -12, z: 55 };
const TEMPLE_LANE_ARRIVE = { x: 2, z: 51 }; // temple's west gate opening / beside the flower stall
const TEMPLE_LANE_WIDTH = 6;

export function buildTempleLane() {
  const segments = [
    buildStripSegment(TEMPLE_LANE_START, TEMPLE_LANE_BEND, TEMPLE_LANE_WIDTH, { seed: 71, ruts: true }),
    buildStripSegment(TEMPLE_LANE_BEND, TEMPLE_LANE_ARRIVE, TEMPLE_LANE_WIDTH, { seed: 72, ruts: true }),
  ];
  return mergeMeshList(segments, 'temple_lane');
}
