import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedWallBox, getTiledMaterial, bakeFlatTintColors, ensureUv2 } from './materials.js';
import { PALETTE, WALL_TINT_STRENGTH, WALL_THICKNESS } from './village.js';
import { colliderBoxFromTransform } from './collision.js';

/**
 * Two more Places V1 locations (queue item 9) — no LAYOUT.md exists for either (only
 * MAIN_*_orthos.png/MAIN_*_views.png reference images; see docs/parked.md), so
 * dimensions/names/colours below are read directly off the orthographic reference
 * images' printed dimension lines and signboard text, the same way LAYOUT.md would be
 * read. texturedWallBox (Fix 4/4's per-wall tiling/rotation jitter + dirt/bleach
 * vertex shading) covers the base-darkening a separate skirt band would otherwise
 * add, so these skip that extra mesh; a shared BuildingKit (passed in from main.js)
 * covers plinth/opening; the two roofs merge into one draw call (see
 * buildShopRoofs()). Deliberately lighter than house/school/halwai — no drainpipe/
 * switchboard/opening trim/loose furniture/signboard yet (the last two are added in
 * item 10, once there's a texture to put on them) — these are small roadside stops,
 * and every extra mesh here is a draw call against the same 150 budget the hero
 * zone's buildings already use most of (see docs/parked.md).
 */

// --- Tea stall — Places V1/tea_stall/MAIN_tea_stall_orthos.png ---
// "शर्मा चाय की दुकान / Sharma Tea Stall". 4m wide x 2.5m deep x 2.6m tall (front post).
// Open on 3 sides (front + both sides just posts, no walls) — only the back wall and
// the serving counter are solid, per the reference.
export const TEA = {
  w: 4,
  d: 2.5,
  postH: 2.6,
  counterTopY: 0.9,
  tealTint: PALETTE.teal,
  roofOverhang: 0.35,
};

export function buildTeaStall(position, rotationY = 0) {
  const group = new THREE.Group();
  group.name = 'tea_stall';

  // The two corner posts are built in buildShopCounters() (merged into the same draw
  // call — same 'wood'/tealTint material family, see that function's doc comment). No
  // plinth ring (draw-call budget — see docs/parked.md): a minor foundation detail,
  // cut once the budget left no room for it.

  group.position.set(position.x, 0, position.z);
  group.rotation.y = rotationY;
  return group;
}

// --- General store — Places V1/general_store/MAIN_general_store_orthos.png ---
// "गुप्ता जनरल स्टोर / Gupta General Store". 3.5m wide x 3m deep x 3.2m tall. Enclosed on
// 3 sides (back + 2 side walls solid), open counter-window at the front.
export const STORE = {
  w: 3.5,
  d: 3,
  h: 3.2,
  counterTopY: 0.9,
  tealTint: PALETTE.teal,
  roofOverhang: 0.3,
};

export function buildGeneralStore(position, rotationY = 0) {
  const group = new THREE.Group();
  group.name = 'general_store';
  const cx = 0;
  const cz = 0;

  // No plinth ring (draw-call budget — see docs/parked.md).

  // Front counter-window — no separate reveal box (draw-call budget; see the file doc
  // comment): the counter itself, sitting proud of the wall, already reads as the
  // gap you buy through.

  group.position.set(position.x, 0, position.z);
  group.rotation.y = rotationY;
  return group;
}

/** General store interior — shelves of packets, tins and snack jars, visible through
 * the front counter-window (headroom-pass item 3, docs/parked.md; the store has no
 * walkable interior — see that entry — so this is dressing seen from outside, same
 * as the bazaar's own shop interiors, src/bazaar.js buildBazaarInteriors()). All
 * packets share one merged 'wood' draw call, all tins/jars a second merged 'metal'
 * one — "instanced" in the same sense this whole codebase has used it throughout
 * (many repeated small props folded into one draw call via a shared vertex-coloured
 * Material, not a literal THREE.InstancedMesh — same technique, same one-draw-call
 * result). No real brand names, logos, or text on any of it. */
export function buildGeneralStoreGoods(position, rotationY = 0) {
  const world = new THREE.Matrix4().makeRotationY(rotationY).setPosition(position.x, 0, position.z);
  const backZ = -STORE.d / 2 + 0.12;

  const packetTints = [PALETTE.mustard, PALETTE.terracotta, PALETTE.teal, PALETTE.fadedBlue, PALETTE.greyGreen, 0xb8a23c];
  const packetGeos = [];
  const shelfGeos = [];
  const tierYs = [0.45, 1.05, 1.65];
  for (const tierY of tierYs) {
    // The shelf plank itself.
    const shelf = new THREE.BoxGeometry(STORE.w - 0.5, 0.04, 0.35);
    ensureUv2(shelf);
    bakeFlatTintColors(shelf, PALETTE.woodTrim, 1);
    shelf.applyMatrix4(new THREE.Matrix4().setPosition(0, tierY, backZ).premultiply(world));
    shelfGeos.push(shelf);

    // A row of small packet boxes sitting on it, varied size/tint so it doesn't read
    // as one repeated identical prop.
    const count = 7;
    for (let i = 0; i < count; i++) {
      const px = -((STORE.w - 0.6) / 2) + (i / (count - 1)) * (STORE.w - 0.6);
      const pw = 0.16 + (i % 3) * 0.03;
      const ph = 0.14 + ((i + 1) % 3) * 0.03;
      const box = new THREE.BoxGeometry(pw, ph, 0.14);
      ensureUv2(box);
      bakeFlatTintColors(box, packetTints[i % packetTints.length], 1);
      box.applyMatrix4(new THREE.Matrix4().setPosition(px, tierY + 0.02 + ph / 2, backZ + 0.05).premultiply(world));
      packetGeos.push(box);
    }
  }
  const woodGeos = [...shelfGeos, ...packetGeos];
  const woodMaterial = getTiledMaterial('wood', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const woodMesh = new THREE.Mesh(mergeGeometries(woodGeos), woodMaterial);
  woodMesh.name = 'general_store_shelves';
  woodMesh.castShadow = true;
  woodMesh.receiveShadow = true;

  // Tins (short, wide) and snack jars (tall, narrow) clustered on the side shelf.
  const tinTints = [0xb0b4b8, 0x8f8878, 0xc9a24f, 0x9aa6ad];
  const tinGeos = [];
  const sideX = STORE.w / 2 - 0.35;
  for (let i = 0; i < 6; i++) {
    const isJar = i % 2 === 0;
    const r = isJar ? 0.06 : 0.09;
    const h = isJar ? 0.22 : 0.13;
    const cyl = new THREE.CylinderGeometry(r, r, h, 8);
    ensureUv2(cyl);
    bakeFlatTintColors(cyl, tinTints[i % tinTints.length], 1);
    const row = Math.floor(i / 3);
    const col = i % 3;
    cyl.applyMatrix4(
      new THREE.Matrix4().setPosition(sideX - col * 0.18, 0.45 + h / 2, backZ + 0.5 + row * 0.22).premultiply(world)
    );
    tinGeos.push(cyl);
  }
  const tinMaterial = getTiledMaterial('metal', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const tinMesh = new THREE.Mesh(mergeGeometries(tinGeos), tinMaterial);
  tinMesh.name = 'general_store_tins_and_jars';
  tinMesh.castShadow = true;
  tinMesh.receiveShadow = true;

  const group = new THREE.Group();
  group.name = 'general_store_goods';
  group.add(woodMesh);
  group.add(tinMesh);
  return group;
}

/** Both shops' serving counters, merged into one draw call — plain unit-tiled wood
 * material (not texturedBox's per-size repeat, which would give each counter its own
 * material and defeat the merge) since these are small enough that one tile each
 * reads fine. Also carries the tea stall's two roof-support posts — same material
 * family, so folding them in here costs nothing extra (one more draw call saved). */
export function buildShopCounters(teaPosition, teaRotationY, storePosition, storeRotationY) {
  const teaW = TEA.w - 0.3;
  const teaGeo = new THREE.BoxGeometry(teaW, TEA.counterTopY, 0.5);
  const teaLocal = new THREE.Matrix4().makeTranslation(0, TEA.counterTopY / 2, TEA.d / 2 - 0.5);
  const teaWorld = new THREE.Matrix4().makeRotationY(teaRotationY).setPosition(teaPosition.x, 0, teaPosition.z);
  const teaCounterMatrix = new THREE.Matrix4().multiplyMatrices(teaWorld, teaLocal);
  teaGeo.applyMatrix4(teaLocal).applyMatrix4(teaWorld);

  const storeOpeningWidth = STORE.w - 1.0;
  const storeGeo = new THREE.BoxGeometry(storeOpeningWidth, STORE.counterTopY, 0.4);
  const storeLocal = new THREE.Matrix4().makeTranslation(0, STORE.counterTopY / 2, STORE.d / 2 + 0.15);
  const storeWorld = new THREE.Matrix4().makeRotationY(storeRotationY).setPosition(storePosition.x, 0, storePosition.z);
  storeGeo.applyMatrix4(storeLocal).applyMatrix4(storeWorld);

  const postGeoBase = new THREE.BoxGeometry(0.12, TEA.postH, 0.12);
  const postGeos = [-TEA.w / 2 + 0.08, TEA.w / 2 - 0.08].map((px) => {
    const g = postGeoBase.clone();
    const local = new THREE.Matrix4().makeTranslation(px, TEA.postH / 2, TEA.d / 2 - 0.08);
    return g.applyMatrix4(local).applyMatrix4(teaWorld);
  });

  // Item 2c (shopfronts read flat) — a lintel header over the general store's
  // counter-window opening (the tea stall has no wall to put one over — open on
  // 3 sides, per the file doc comment) and a low front step/threshold at both
  // shops, same reasoning as the bazaar row's own step/lintel (buildBazaarRow).
  const storeLintelGeo = new THREE.BoxGeometry(storeOpeningWidth + 0.1, 0.16, 0.16);
  const storeLintelLocal = new THREE.Matrix4().makeTranslation(0, STORE.counterTopY + 0.95, STORE.d / 2 + 0.14);
  storeLintelGeo.applyMatrix4(storeLintelLocal).applyMatrix4(storeWorld);

  const teaStepGeo = new THREE.BoxGeometry(TEA.w - 0.1, 0.14, 0.55);
  const teaStepLocal = new THREE.Matrix4().makeTranslation(0, 0.07, TEA.d / 2 - 0.25);
  teaStepGeo.applyMatrix4(teaStepLocal).applyMatrix4(teaWorld);

  const storeStepGeo = new THREE.BoxGeometry(storeOpeningWidth + 0.2, 0.14, 0.4);
  const storeStepLocal = new THREE.Matrix4().makeTranslation(0, 0.07, STORE.d / 2 + 0.4);
  storeStepGeo.applyMatrix4(storeStepLocal).applyMatrix4(storeWorld);

  // Headroom pass (docs/parked.md) — tint baked into vertex colour (not the
  // material) so this shares the one cached 'wood' Material every other wood-family
  // object in the village uses, letting the village-wide merge (main.js) fold this
  // in too, instead of paying its own separate draw call.
  const counterGeos = [teaGeo, storeGeo, ...postGeos, storeLintelGeo, teaStepGeo, storeStepGeo];
  for (const g of counterGeos) {
    ensureUv2(g);
    bakeFlatTintColors(g, TEA.tealTint, 1);
  }
  const material = getTiledMaterial('wood', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const mesh = new THREE.Mesh(mergeGeometries(counterGeos), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'shop_counters_and_posts';
  // Only the tea stall's counter (its only solid side is the back wall — this is
  // what actually blocks walking in through its open front, same as the bazaar's
  // own counters). The general store's counter sits inside its own full solid
  // wall collider (buildShopWalls() above) already, so tagging it too would just
  // be a redundant duplicate box.
  mesh.userData.colliderBoxes = [colliderBoxFromTransform(teaW, 0.5, teaCounterMatrix)];
  return mesh;
}

/** Both shops' solid walls (tea's back wall, the store's full block), merged into a
 * single draw call — texturedWallBox always tiles at repeat 1,1 (the scale/rotation
 * jitter is baked into the UVs, not texture.repeat), so two walls with the same tint/
 * roughness/tintStrength share one cached material regardless of size, same as the
 * roofs above. Each wall's own local offset within its shop is baked in first, then
 * the shop's own world position/rotation. Call once from main.js after both shops'
 * openings/counters/etc. are placed (those still read from these dimensions). */
export function buildShopWalls(teaPosition, teaRotationY, storePosition, storeRotationY) {
  const teaWallMesh = texturedWallBox(TEA.w, TEA.postH, WALL_THICKNESS, 'plaster', {
    tint: PALETTE.cream,
    tileSize: 1.5,
    tintStrength: WALL_TINT_STRENGTH,
    seed: teaPosition.x * 3.1 + teaPosition.z * 1.7,
  });
  const teaLocal = new THREE.Matrix4().makeTranslation(0, TEA.postH / 2, -TEA.d / 2 + WALL_THICKNESS / 2);
  const teaWorld = new THREE.Matrix4().makeRotationY(teaRotationY).setPosition(teaPosition.x, 0, teaPosition.z);
  const teaGeo = teaWallMesh.geometry.clone().applyMatrix4(teaLocal).applyMatrix4(teaWorld);
  const teaWallMatrix = new THREE.Matrix4().multiplyMatrices(teaWorld, teaLocal);

  const storeWallMesh = texturedWallBox(STORE.w, STORE.h, STORE.d, 'plaster', {
    tint: PALETTE.cream,
    tileSize: 1.5,
    tintStrength: WALL_TINT_STRENGTH,
    seed: storePosition.x * 3.1 + storePosition.z * 1.7,
  });
  const storeLocal = new THREE.Matrix4().makeTranslation(0, STORE.h / 2, 0);
  const storeWorld = new THREE.Matrix4().makeRotationY(storeRotationY).setPosition(storePosition.x, 0, storePosition.z);
  const storeGeo = storeWallMesh.geometry.clone().applyMatrix4(storeLocal).applyMatrix4(storeWorld);
  const storeWallMatrix = new THREE.Matrix4().multiplyMatrices(storeWorld, storeLocal);

  const mesh = new THREE.Mesh(mergeGeometries([teaGeo, storeGeo]), teaWallMesh.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'shop_walls';
  // Structural fix (playtest): this replaces a hand-typed box in src/collision.js
  // that went stale the first time STORE_POS moved — these two boxes are derived
  // from the exact width/depth/transform already driving the real wall geometry
  // two lines up, so they cannot drift from it again.
  mesh.userData.colliderBoxes = [colliderBoxFromTransform(TEA.w, WALL_THICKNESS, teaWallMatrix), colliderBoxFromTransform(STORE.w, STORE.d, storeWallMatrix)];
  return mesh;
}

/** Both shops' flat roofs, merged into a single draw call — same material (concrete,
 * neutral tint, default roughness), just two positioned boxes baked into one mesh.
 * Call once from main.js after both shops are placed. */
export function buildShopRoofs(teaPosition, teaRotationY, storePosition, storeRotationY) {
  const tint = 0xd7d2c4;
  const geoTea = new THREE.BoxGeometry(TEA.w + TEA.roofOverhang * 2, 0.12, TEA.d + TEA.roofOverhang * 2);
  const geoStore = new THREE.BoxGeometry(STORE.w + STORE.roofOverhang * 2, 0.25, STORE.d + STORE.roofOverhang * 2);

  const mTea = new THREE.Matrix4()
    .makeRotationY(teaRotationY)
    .setPosition(teaPosition.x, TEA.postH + 0.06, teaPosition.z);
  geoTea.applyMatrix4(mTea);

  const mStore = new THREE.Matrix4()
    .makeRotationY(storeRotationY)
    .setPosition(storePosition.x, STORE.h + 0.125, storePosition.z);
  geoStore.applyMatrix4(mStore);

  // Headroom pass (docs/parked.md) — same vertex-colour-tint conversion as
  // buildShopCounters above, so this folds into the village-wide 'concrete' merge.
  const roofGeos = [geoTea, geoStore];
  for (const g of roofGeos) {
    ensureUv2(g);
    bakeFlatTintColors(g, tint, 1);
  }
  const material = getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const mesh = new THREE.Mesh(mergeGeometries(roofGeos), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'shop_roofs';
  return mesh;
}
