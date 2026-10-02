import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedWallBox, getTiledMaterial, bakeFlatTintColors, ensureUv2 } from './materials.js';
import { PALETTE, darken, WALL_TINT_STRENGTH, WALL_THICKNESS } from './village.js';
import { colliderBoxFromTransform } from './collision.js';

/**
 * Item 4 ("keep building the village") — 3 more abadi-core locations from
 * reference-from-unity/MAP.md's "Places inside the abadi" list ("Near
 * panchayat: post office..., ration shop..."; "Also: atta chakki (heard
 * before seen)..."), built the same lightweight way src/shops.js's tea
 * stall/general store are (small roadside stops, not hero-zone-scale
 * buildings): one solid texturedWallBox shell per building (real collider for
 * free, same as every wall in this codebase — src/collision.js's
 * buildCollidersFromScene() reads it automatically), a flat roof, a simple
 * counter/opening prop, a bilingual signboard. No walkable interior — none of
 * these three feed a quest.
 */

export const POST_OFFICE = { w: 3.2, d: 3, h: 3.0, counterTopY: 0.9, tint: PALETTE.fadedBlue, roofOverhang: 0.3 };
export const RATION_SHOP = { w: 3.6, d: 3, h: 3.0, counterTopY: 0.9, tint: PALETTE.mustard, roofOverhang: 0.3 };
export const ATTA_CHAKKI = { w: 3, d: 2.8, h: 2.7, tint: PALETTE.terracotta, roofOverhang: 0.3 };

function wallWorldMatrix(position, rotationY) {
  return new THREE.Matrix4().makeRotationY(rotationY).setPosition(position.x, 0, position.z);
}

export function buildPostOffice(position, rotationY = 0) {
  const group = new THREE.Group();
  group.name = 'post_office';
  group.position.set(position.x, 0, position.z);
  group.rotation.y = rotationY;
  return group;
}

export function buildRationShop(position, rotationY = 0) {
  const group = new THREE.Group();
  group.name = 'ration_shop';
  group.position.set(position.x, 0, position.z);
  group.rotation.y = rotationY;
  return group;
}

export function buildAttaChakki(position, rotationY = 0) {
  const group = new THREE.Group();
  group.name = 'atta_chakki';
  group.position.set(position.x, 0, position.z);
  group.rotation.y = rotationY;
  return group;
}

/** All 3 buildings' solid walls, merged into one draw call — same reasoning as
 * src/shops.js's buildShopWalls(): texturedWallBox always tiles at 1x1 (jitter
 * baked into UVs), so 3 walls of different tint/size still share one cached
 * Material and merge. Post office + ration shop are enclosed boxes (counter-
 * window front, like the general store); the atta chakki is open-fronted
 * (just a back wall + 2 short returns, like the tea stall) since it's a
 * working shed, not a shop you walk up to a window at. */
export function buildNewShopWalls(postOfficePos, postOfficeRot, rationShopPos, rationShopRot, attaChakkiPos, attaChakkiRot) {
  const geos = [];
  const colliders = [];
  let sharedMaterial = null;

  for (const [dims, pos, rot, seedBase] of [
    [POST_OFFICE, postOfficePos, postOfficeRot, 91.3],
    [RATION_SHOP, rationShopPos, rationShopRot, 73.1],
  ]) {
    const wallMesh = texturedWallBox(dims.w, dims.h, dims.d, 'plaster', {
      tint: dims.tint,
      tileSize: 1.5,
      tintStrength: WALL_TINT_STRENGTH,
      seed: pos.x * 3.1 + pos.z * 1.7 + seedBase,
    });
    sharedMaterial = wallMesh.material;
    const local = new THREE.Matrix4().makeTranslation(0, dims.h / 2, 0);
    const world = wallWorldMatrix(pos, rot);
    geos.push(wallMesh.geometry.clone().applyMatrix4(local).applyMatrix4(world));
    colliders.push(colliderBoxFromTransform(dims.w, dims.d, new THREE.Matrix4().multiplyMatrices(world, local)));
  }

  // Atta chakki — back wall only (open front + sides, same construction as the
  // tea stall), so the grinding shed reads as a real working structure you can
  // see/hear into, not a sealed box.
  {
    const dims = ATTA_CHAKKI;
    const wallMesh = texturedWallBox(dims.w, dims.h, WALL_THICKNESS, 'plaster', {
      tint: dims.tint,
      tileSize: 1.5,
      tintStrength: WALL_TINT_STRENGTH,
      seed: attaChakkiPos.x * 3.1 + attaChakkiPos.z * 1.7 + 55.7,
    });
    sharedMaterial = sharedMaterial || wallMesh.material;
    const local = new THREE.Matrix4().makeTranslation(0, dims.h / 2, -dims.d / 2 + WALL_THICKNESS / 2);
    const world = wallWorldMatrix(attaChakkiPos, attaChakkiRot);
    geos.push(wallMesh.geometry.clone().applyMatrix4(local).applyMatrix4(world));
    colliders.push(colliderBoxFromTransform(dims.w, WALL_THICKNESS, new THREE.Matrix4().multiplyMatrices(world, local)));
  }

  const mesh = new THREE.Mesh(mergeGeometries(geos), sharedMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'new_shop_walls';
  mesh.userData.colliderBoxes = colliders;
  return mesh;
}

/** Roofs for all 3, merged into one draw call — same pattern as
 * src/shops.js's buildShopRoofs(). */
export function buildNewShopRoofs(postOfficePos, postOfficeRot, rationShopPos, rationShopRot, attaChakkiPos, attaChakkiRot) {
  const tint = 0xd7d2c4;
  const roofGeos = [];
  for (const [dims, pos, rot, extraY] of [
    [POST_OFFICE, postOfficePos, postOfficeRot, 0.125],
    [RATION_SHOP, rationShopPos, rationShopRot, 0.125],
    [ATTA_CHAKKI, attaChakkiPos, attaChakkiRot, 0.1],
  ]) {
    const geo = new THREE.BoxGeometry(dims.w + dims.roofOverhang * 2, 0.22, dims.d + dims.roofOverhang * 2);
    const m = wallWorldMatrix(pos, rot).multiply(new THREE.Matrix4().makeTranslation(0, dims.h + extraY, 0));
    geo.applyMatrix4(m);
    ensureUv2(geo);
    bakeFlatTintColors(geo, tint, 1);
    roofGeos.push(geo);
  }
  const material = getTiledMaterial('concrete', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const mesh = new THREE.Mesh(mergeGeometries(roofGeos), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'new_shop_roofs';
  return mesh;
}

/** Counters/props: post office + ration shop counter-windows (like the
 * general store's), the atta chakki's millstone + motor (small, simple —
 * "heard before seen", ambient dressing, not an interactive prop). All one
 * merged 'wood'/'metal'-family draw call split, same as buildShopCounters(). */
export function buildNewShopProps(postOfficePos, postOfficeRot, rationShopPos, rationShopRot, attaChakkiPos, attaChakkiRot) {
  const woodGeos = [];
  const metalGeos = [];

  for (const [dims, pos, rot] of [
    [POST_OFFICE, postOfficePos, postOfficeRot],
    [RATION_SHOP, rationShopPos, rationShopRot],
  ]) {
    const openingWidth = dims.w - 1.0;
    const world = wallWorldMatrix(pos, rot);
    const counterGeo = new THREE.BoxGeometry(openingWidth, dims.counterTopY, 0.4);
    counterGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, dims.counterTopY / 2, dims.d / 2 + 0.15)).applyMatrix4(world);
    const lintelGeo = new THREE.BoxGeometry(openingWidth + 0.1, 0.16, 0.16);
    lintelGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, dims.counterTopY + 0.95, dims.d / 2 + 0.14)).applyMatrix4(world);
    const stepGeo = new THREE.BoxGeometry(openingWidth + 0.2, 0.14, 0.4);
    stepGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.07, dims.d / 2 + 0.4)).applyMatrix4(world);
    for (const g of [counterGeo, lintelGeo, stepGeo]) {
      ensureUv2(g);
      bakeFlatTintColors(g, PALETTE.woodTrim, 1);
      woodGeos.push(g);
    }
  }

  // Atta chakki: a squat millstone cylinder + a small motor box, sitting just
  // inside the open front — enough to read as "a grinding mill," not a
  // detailed machine.
  {
    const world = wallWorldMatrix(attaChakkiPos, attaChakkiRot);
    const stoneGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.35, 12);
    stoneGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(-0.5, 0.18, -0.2)).applyMatrix4(world);
    ensureUv2(stoneGeo);
    bakeFlatTintColors(stoneGeo, darken(PALETTE.woodTrim, 0.6), 1);
    woodGeos.push(stoneGeo);

    const motorGeo = new THREE.BoxGeometry(0.4, 0.3, 0.3);
    motorGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0.6, 0.15, -0.3)).applyMatrix4(world);
    ensureUv2(motorGeo);
    bakeFlatTintColors(motorGeo, 0x53585c, 1);
    metalGeos.push(motorGeo);

    const beltGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
    beltGeo.rotateZ(Math.PI / 2);
    beltGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0.1, 0.22, -0.25)).applyMatrix4(world);
    ensureUv2(beltGeo);
    bakeFlatTintColors(beltGeo, 0x2a2a2a, 1);
    metalGeos.push(beltGeo);
  }

  const group = new THREE.Group();
  group.name = 'new_shop_props';

  const woodMaterial = getTiledMaterial('wood', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const woodMesh = new THREE.Mesh(mergeGeometries(woodGeos), woodMaterial);
  woodMesh.name = 'new_shop_wood_props';
  woodMesh.castShadow = true;
  woodMesh.receiveShadow = true;
  group.add(woodMesh);

  const metalMaterial = getTiledMaterial('metal', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
  const metalMesh = new THREE.Mesh(mergeGeometries(metalGeos), metalMaterial);
  metalMesh.name = 'new_shop_metal_props';
  metalMesh.castShadow = true;
  metalMesh.receiveShadow = true;
  group.add(metalMesh);

  return group;
}

// --- Bilingual signboards — same technique as src/signboards.js/src/bazaar.js
// (one shared canvas atlas, one draw call, anisotropy=8 set from the start —
// item 2's own fix, not repeated as a bug here). Devanagari primary (larger,
// on top), English secondary (smaller, beneath) per CLAUDE.md's language-order
// law — these are ordinary UI/world signage, NOT one of the in-world shop
// signboards src/signboards.js's own exception covers, but matching that
// existing in-world convention (Devanagari-first) is what every other
// in-world board in this game already does, including src/bazaar.js's row —
// kept consistent with its immediate neighbours rather than applying the
// opposite (UI) order to just these three boards.
const SIGN_CELL = 512;
const SIGN_COLS = 3;

function drawSign(ctx, col, hi, en) {
  const x = col * SIGN_CELL;
  ctx.fillStyle = '#e8dcc4';
  ctx.fillRect(x + 4, 4, SIGN_CELL - 8, SIGN_CELL - 8);
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 6;
  ctx.strokeRect(x + 4, 4, SIGN_CELL - 8, SIGN_CELL - 8);
  const cx = x + SIGN_CELL / 2;
  ctx.fillStyle = '#2a2018';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 58px "Noto Sans Devanagari", sans-serif';
  ctx.fillText(hi, cx, SIGN_CELL * 0.42);
  ctx.font = '600 30px -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(en, cx, SIGN_CELL * 0.7);
}

async function buildNewShopSignAtlas() {
  await document.fonts.load('700 58px "Noto Sans Devanagari"');
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = SIGN_CELL * SIGN_COLS;
  canvas.height = SIGN_CELL;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawSign(ctx, 0, 'डाकघर', 'Post Office');
  drawSign(ctx, 1, 'राशन की दुकान', 'Ration Shop');
  drawSign(ctx, 2, 'आटा चक्की', 'Atta Chakki');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.anisotropy = 8; // item 2's fix, applied from the start here
  return texture;
}

function mapFrontFaceToCell(geometry, col) {
  const uv = geometry.attributes.uv;
  const uMin = (col + 0.02) / SIGN_COLS;
  const uMax = (col + 0.98) / SIGN_COLS;
  const groups = geometry.groups; // BoxGeometry: [+X,-X,+Y,-Y,+Z,-Z]
  const frontGroup = groups[4]; // +Z — the front face every one of these 3 buildings opens toward
  const touched = new Uint8Array(uv.count);
  for (let i = frontGroup.start; i < frontGroup.start + frontGroup.count; i++) {
    const vi = geometry.index.array[i];
    if (touched[vi]) continue;
    touched[vi] = 1;
    uv.setXY(vi, uMin + uv.getX(vi) * (uMax - uMin), 0.02 + uv.getY(vi) * 0.96);
  }
  uv.needsUpdate = true;
}

/** All 3 boards, one shared atlas/mesh/draw call. Async (font/canvas) — not
 * awaited inline by the caller, same pattern as every other signboard build
 * function in this codebase. */
export async function buildNewShopSignboards(postOfficePos, postOfficeRot, rationShopPos, rationShopRot, attaChakkiPos, attaChakkiRot) {
  const texture = await buildNewShopSignAtlas();
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  const geos = [];
  const placements = [
    [POST_OFFICE, postOfficePos, postOfficeRot, 0],
    [RATION_SHOP, rationShopPos, rationShopRot, 1],
    [ATTA_CHAKKI, attaChakkiPos, attaChakkiRot, 2],
  ];
  for (const [dims, pos, rot, col] of placements) {
    const geo = new THREE.BoxGeometry(Math.min(dims.w - 0.5, 2.2), 0.5, 0.04);
    mapFrontFaceToCell(geo, col);
    const world = wallWorldMatrix(pos, rot).multiply(new THREE.Matrix4().makeTranslation(0, dims.h + 0.42, dims.d / 2 + 0.03));
    geo.applyMatrix4(world);
    geos.push(geo);
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos), material);
  mesh.name = 'new_shop_signboards';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
