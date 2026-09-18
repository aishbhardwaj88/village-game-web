import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedWallBox, getTiledMaterial } from './materials.js';
import { PALETTE, WALL_TINT_STRENGTH, WALL_THICKNESS } from './village.js';

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

  const material = getTiledMaterial('wood', { repeatX: 1, repeatY: 1, tint: TEA.tealTint, roughness: 1 });
  const mesh = new THREE.Mesh(mergeGeometries([teaGeo, storeGeo, ...postGeos]), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'shop_counters_and_posts';
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

  const storeWallMesh = texturedWallBox(STORE.w, STORE.h, STORE.d, 'plaster', {
    tint: PALETTE.cream,
    tileSize: 1.5,
    tintStrength: WALL_TINT_STRENGTH,
    seed: storePosition.x * 3.1 + storePosition.z * 1.7,
  });
  const storeLocal = new THREE.Matrix4().makeTranslation(0, STORE.h / 2, 0);
  const storeWorld = new THREE.Matrix4().makeRotationY(storeRotationY).setPosition(storePosition.x, 0, storePosition.z);
  const storeGeo = storeWallMesh.geometry.clone().applyMatrix4(storeLocal).applyMatrix4(storeWorld);

  const mesh = new THREE.Mesh(mergeGeometries([teaGeo, storeGeo]), teaWallMesh.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'shop_walls';
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

  const material = getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, tint, roughness: 1 });
  const mesh = new THREE.Mesh(mergeGeometries([geoTea, geoStore]), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'shop_roofs';
  return mesh;
}
