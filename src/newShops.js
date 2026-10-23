import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { texturedWallBox, getTiledMaterial, bakeFlatTintColors, ensureUv2 } from './materials.js';
import { PALETTE, darken, WALL_TINT_STRENGTH, WALL_THICKNESS } from './village.js';
import { colliderBoxFromTransform } from './collision.js';
import { buildWideSignAtlas, mapFrontFaceToRow } from './signboards.js';

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

  // --- Furnishing (CLAUDE.md 5b rule 3): each trade's own stock and tools, hand-scattered with per-item
  // rotation, scale and tint, folded into the same wood/metal merges (+ one jute merge for sacks). ---
  const jute = [];
  const colliders = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const jit = (a) => (rnd() - 0.5) * 2 * a;
  const put = (list, geo, world, x, y, z, ry, tint) => {
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z)).applyMatrix4(world);
    ensureUv2(geo);
    bakeFlatTintColors(geo, tint, 1);
    list.push(geo);
  };
  const box = (list, world, w, h, d, x, y, z, ry, tint) => put(list, new THREE.BoxGeometry(w, h, d), world, x, y + h / 2, z, ry, tint);
  const cyl = (list, world, r, h, x, y, z, tint, seg = 10) => put(list, new THREE.CylinderGeometry(r, r * 1.05, h, seg), world, x, y + h / 2, z, rnd() * 6.28, tint);
  const sack = (world, x, y, z, ry, tint) => {
    const g = new THREE.CylinderGeometry(0.2, 0.25, 0.8, 9);
    g.rotateZ(Math.PI / 2); // lying sack
    g.scale(1, 0.55 + jit(0.06), 1.0);
    put(jute, g, world, x, y + 0.2, z, ry, tint);
  };
  const JUTE = [0xb59468, 0xa88a5e, 0xc2a478, 0x9c8156];

  // Ration shop: shelf of tins and measuring cans, sacks of grain and sugar stacked low on the right, crates,
  // and a beam scale + register ledger on the counter.
  {
    const world = wallWorldMatrix(rationShopPos, rationShopRot);
    const d = RATION_SHOP.d;
    // Stock stands outside on the flanks (the shell is a solid box with a shallow counter recess): grain and sugar sacks on the right, crates on the left.
    const fx = RATION_SHOP.w / 2 + 0.45;
    for (let i = 0; i < 6; i++) sack(world, fx + (i % 2) * 0.05 + jit(0.04), Math.floor(i / 3) * 0.34, d / 2 - 0.9 + (i % 3) * 0.5, jit(0.15) + Math.PI / 2, JUTE[i % 4]);
    colliders.push(colliderBoxFromTransform(0.7, 1.7, new THREE.Matrix4().multiplyMatrices(world, new THREE.Matrix4().makeTranslation(fx, 0.35, d / 2 - 0.4))));
    for (let i = 0; i < 3; i++) box(woodGeos, world, 0.5, 0.3, 0.4, -fx + jit(0.05), i === 2 ? 0.6 : 0, d / 2 - 0.5 + (i === 1 ? 0.5 : 0), jit(0.3), darken(PALETTE.woodTrim, 0.7 + i * 0.08));
    colliders.push(colliderBoxFromTransform(0.7, 1.0, new THREE.Matrix4().multiplyMatrices(world, new THREE.Matrix4().makeTranslation(-fx, 0.3, d / 2 - 0.2))));
    // beam scale on the counter: stand, beam, two pans
    const cy = RATION_SHOP.counterTopY, cz = d / 2 + 0.15;
    cyl(metalGeos, world, 0.03, 0.4, -0.7, cy, cz, 0x3a3d40, 8);
    box(metalGeos, world, 0.6, 0.02, 0.02, -0.7, cy + 0.4, cz, 0, 0x4a4d50);
    for (const sx of [-0.28, 0.28]) cyl(metalGeos, world, 0.11, 0.015, -0.7 + sx, cy + 0.24, cz, 0x9a9484, 12);
    box(woodGeos, world, 0.32, 0.05, 0.22, 0.45, cy, cz - 0.05, 0.2, 0x5a2a22); // ledger register
    box(woodGeos, world, 0.3, 0.03, 0.2, 0.46, cy + 0.05, cz - 0.05, 0.25, 0x8a7a58);
  }

  // Post office: pigeonhole letter rack, post bags, a small scale on the counter, rubber stamp + ink pad,
  // and the red pillar post box outside the door (solid).
  {
    const world = wallWorldMatrix(postOfficePos, postOfficeRot);
    const d = POST_OFFICE.d;
    const fx = POST_OFFICE.w / 2 + 0.4;
    for (let i = 0; i < 3; i++) sack(world, fx + jit(0.04), i === 2 ? 0.34 : 0, d / 2 - 0.7 + (i % 2) * 0.5, jit(0.4) + Math.PI / 2, JUTE[i % 4]); // post bags
    colliders.push(colliderBoxFromTransform(0.7, 1.2, new THREE.Matrix4().multiplyMatrices(world, new THREE.Matrix4().makeTranslation(fx, 0.3, d / 2 - 0.3))));
    const cy = POST_OFFICE.counterTopY, cz = d / 2 + 0.15;
    box(metalGeos, world, 0.3, 0.06, 0.22, 0.5, cy, cz - 0.05, 0.15, 0x6d7075); // letter scale
    cyl(metalGeos, world, 0.09, 0.012, 0.5, cy + 0.06, cz - 0.05, 0xb9b6aa, 12);
    box(woodGeos, world, 0.14, 0.02, 0.09, -0.4, cy, cz, 0.4, 0x2c2a4a); // ink pad
    cyl(woodGeos, world, 0.025, 0.07, -0.4, cy + 0.02, cz, 0x6a3a22, 8); // stamp
    // pillar box outside, left of the window
    const bx = -POST_OFFICE.w / 2 - 0.35, bz = d / 2 + 0.55;
    cyl(metalGeos, world, 0.19, 1.0, bx, 0, bz, 0xa8281f, 14);
    put(metalGeos, new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), world, bx, 1.0, bz, 0, 0x8f2019);
    box(metalGeos, world, 0.2, 0.025, 0.02, bx, 0.82, bz + 0.19, 0, 0x1a1a1a); // slot
    colliders.push(colliderBoxFromTransform(0.4, 0.4, new THREE.Matrix4().multiplyMatrices(world, new THREE.Matrix4().makeTranslation(bx, 0.5, bz))));
  }

  // Atta chakki: hopper over the stone, flour spout and collecting tray, sacks of grain and flour, scoops,
  // a platform scale; flour dust is a pale tint on the floor and sacks.
  {
    const world = wallWorldMatrix(attaChakkiPos, attaChakkiRot);
    const d = ATTA_CHAKKI.d;
    put(metalGeos, new THREE.CylinderGeometry(0.4, 0.1, 0.5, 4, 1, true), world, -0.5, 1.0, -0.2, Math.PI / 4, 0x7e8288); // hopper
    box(metalGeos, world, 0.06, 0.55, 0.06, -0.5, 0.35, -0.2, 0, 0x55595d); // feed pipe
    box(woodGeos, world, 0.7, 0.05, 0.5, -0.5, 0.02, 0.25, 0, darken(PALETTE.woodTrim, 0.8)); // tray
    box(metalGeos, world, 0.5, 0.5, 0.04, 0.0, 0.0, -d / 2 + 0.3, 0, 0x4a4d50); // belt guard
    box(woodGeos, world, 0.9, 0.7, 0.05, 0.9, 0.8, -d / 2 + 0.2, 0, darken(PALETTE.woodTrim, 0.7)); // sack shelf
    for (let i = 0; i < 4; i++) sack(world, 1.0 + (i % 2) * 0.5 + jit(0.04), Math.floor(i / 2) * 0.34, 0.1 + jit(0.1), jit(0.35), [0xd9d2bd, 0xcdc4a8, JUTE[0], 0xe2dccb][i]);
    for (let i = 0; i < 3; i++) sack(world, -1.1 + jit(0.05), i * 0.34, 0.3 + jit(0.08), Math.PI / 2 + jit(0.2), [JUTE[1], 0xd6cfb8, JUTE[2]][i]);
    box(metalGeos, world, 0.5, 0.06, 0.4, 0.3, 0, 0.8, 0.2, 0x5b5f63); // platform scale
    cyl(metalGeos, world, 0.03, 0.9, 0.3, 0.06, 0.62, 0x4a4d50, 8);
    cyl(metalGeos, world, 0.09, 0.07, -0.1, 0, 0.7, 0x9fa3a8, 10); // steel scoop bowl
    box(woodGeos, world, 0.9, 0.012, 0.8, -0.35, 0, 0.0, 0.2, 0xe4dfd0); // flour dust on the floor
    colliders.push(colliderBoxFromTransform(1.2, 1.0, new THREE.Matrix4().multiplyMatrices(world, new THREE.Matrix4().makeTranslation(-0.5, 0.5, -0.2))));
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

  const juteMesh = new THREE.Mesh(mergeGeometries(jute), getTiledMaterial('jute', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true }));
  juteMesh.name = 'new_shop_jute_props';
  juteMesh.castShadow = true;
  juteMesh.receiveShadow = true;
  group.add(juteMesh);
  metalMesh.userData.colliderBoxes = colliders;

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
// Art review 2: the old 512x512 square cells were stretched over 2.2x0.5 boards (text squashed
// ~4x, illegible). Now the shared wide-cell atlas in src/signboards.js, same as every other board.
/** All 3 boards, one shared atlas/mesh/draw call. Async (font/canvas) — not
 * awaited inline by the caller, same pattern as every other signboard build
 * function in this codebase. */
export async function buildNewShopSignboards(postOfficePos, postOfficeRot, rationShopPos, rationShopRot, attaChakkiPos, attaChakkiRot) {
  const { texture, rows } = await buildWideSignAtlas([
    { hi: 'डाकघर', en: 'Post Office', fg: '#b3201a' },
    { hi: 'राशन की दुकान', en: 'Ration Shop', fg: '#1f5a2e' },
    { hi: 'आटा चक्की', en: 'Atta Chakki', fg: '#1f3f8a' },
  ]);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
  material.name = 'signboard'; // world-validator (check 2) — see src/signboards.js's matching comment
  const geos = [];
  const placements = [
    [POST_OFFICE, postOfficePos, postOfficeRot, 0],
    [RATION_SHOP, rationShopPos, rationShopRot, 1],
    [ATTA_CHAKKI, attaChakkiPos, attaChakkiRot, 2],
  ];
  for (const [dims, pos, rot, col] of placements) {
    const geo = new THREE.BoxGeometry(Math.min(dims.w - 0.5, 2.2), 0.5, 0.04);
    mapFrontFaceToRow(geo, col, rows);
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
