import * as THREE from 'three';
import { texturedBox, texturedThickBox } from './materials.js';
import { mergeGroupByMaterial } from './mergeUtils.js';
import { buildGardenPlants, GARDEN_KIND } from './vegetation.js';

/**
 * The nahar (canal) — reference-from-unity/MAP.md: "Runs east-west across the
 * north, between the village and the family's own fields... kachcha bank roads on
 * both sides... two crossings, deliberately different: a pukka (tractor-width)
 * bridge, and a narrow foot pulia." This pass builds the pukka bridge only (the one
 * crossing CLAUDE.md's Wave 4 item 1 actually requires — "at least one crossing the
 * tractor+trolley and bullock cart can drive over"); the patli pulia foot-shortcut
 * is a smaller follow-up, not blocking M3/M7.
 *
 * Positioned next to the mango baagh's new in-field location (src/baagh.js,
 * BAAGH_CENTER x=-15) rather than on src/field.js's older LANE_JOIN->TRACK_NW
 * spur — that spur sits in the same narrow corridor several other hand-verified
 * tools/world-validator.js routes already cross (see CANAL_MIN_X's own comment
 * below), so the real, game-relevant crossing was moved a bit east of it instead,
 * right where the baagh trip actually needs one.
 */
export const CANAL_Z = 33;
const CANAL_HALF_WIDTH = 3; // water channel spans z: [CANAL_Z - 3, CANAL_Z + 3]
const BANK_WIDTH = 1.2; // raised kachcha bank on each side of the water
// Deliberately does NOT span the whole map width (MAP.md's "runs east-west across
// the north" is the narrative intent, not a literal coordinate) — the corridor
// west of here (roughly x=-58 to -33, z=22-48) is where several already-verified
// tools/world-validator.js reachability routes converge and cross on foot
// (BYPASS, ROOF_CHAIN, SACK_PILE_CHAIN — all hand-tuned against real wall
// geometry, see that file's own comments): a canal spanning that far west would
// have put real collision across every one of them. Starting the canal east of
// x=-33 keeps all of that untouched; this stretch, right next to the mango baagh
// (src/baagh.js, BAAGH_CENTER x=-15), is the one that actually needs a real
// crossing. (An earlier draw-call-ceiling overshoot traced to the banks/bridge
// defaulting to castShadow=true, not to this feature's x-position specifically —
// see the explicit castShadow=false below — so this range is picked purely for
// what's narratively/functionally sensible, not to dodge any camera.)
const CANAL_MIN_X = -28;
const CANAL_MAX_X = 0;

export const BRIDGE_X = -15; // right at the baagh (src/baagh.js BAAGH_CENTER x=-15)
const BRIDGE_HALF_WIDTH = 4;
export const PULIA_X = -3; // narrow foot crossing (MAP.md patli pulia); a 1.6 m gap in the bank colliders, walkable but too narrow for any vehicle
const PULIA_HALF_WIDTH = 0.8;

// Art review 1 (canal): the water read as flat swimming-pool blue. Now a murky green-brown nahar with fine ripples (procedural normal map).
const WATER_TINT = 0x6b7448;
const BANK_TINT = 0x8a7248;
const BRIDGE_TINT = 0xb8b2a0;

function addBankSegment(group, minX, maxX, z, halfSpanZ, collider) {
  if (maxX <= minX) return;
  const width = maxX - minX;
  const cx = (minX + maxX) / 2;
  const bank = texturedBox(width, 0.35, halfSpanZ * 2, 'ground', { tint: BANK_TINT, tileSize: 2, tintStrength: 0.5 });
  bank.position.set(cx, 0.175, z);
  bank.name = 'canal_bank';
  bank.castShadow = false; // low, flat ground-level feature — not worth its own shadow pass cost
  group.add(bank);
  if (collider) bank.userData.collider = true;
}

/** Builds the canal + one pukka bridge, returns a Group named 'canal' ready to
 * scene.add(). Bank colliders run the FULL east-west span except for a bridge-width
 * gap at BRIDGE_X, so the bridge is the one place a vehicle or the player can
 * actually get across — everywhere else the two raised banks block it. */
/** Small tiling ripple normal map from summed sines (no texture asset). */
function makeRippleNormalMap() {
  const N = 128;
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = (x / N) * Math.PI * 2, v = (y / N) * Math.PI * 2;
      h[y * N + x] = Math.sin(3 * u + 2 * v) * 0.5 + Math.sin(5 * u - 3 * v + 1.3) * 0.35 + Math.sin(9 * u + 7 * v + 2.1) * 0.2 + Math.sin(2 * v + 0.7) * 0.3;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x + N - 1) % N)];
      const dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
      const nx = -dx * 1.2, ny = -dy * 1.2, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const o = (y * N + x) * 4;
      img.data[o] = (nx / l * 0.5 + 0.5) * 255;
      img.data[o + 1] = (ny / l * 0.5 + 0.5) * 255;
      img.data[o + 2] = (nz / l * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function buildCanal() {
  const group = new THREE.Group();
  group.name = 'canal';

  // Water — a simple flat-tinted plane sitting in a shallow trench (not a CC0
  // texture set; no water set exists in src/materials.js's SETS, and a flat tint
  // reads fine for a narrow, mostly-tree-shaded irrigation canal at this camera
  // distance). Slightly glossy (unlike every matte building material) because
  // real still water does read with a soft sheen — not run through
  // assetSlots.js's enforceMatteMaterial clamp, which only applies to imported
  // Tripo/Blender models, not hand-authored code materials.
  const waterGeo = new THREE.PlaneGeometry(CANAL_MAX_X - CANAL_MIN_X, CANAL_HALF_WIDTH * 2);
  const waterMat = new THREE.MeshStandardMaterial({ color: WATER_TINT, roughness: 0.38, metalness: 0.0, normalMap: makeRippleNormalMap(), normalScale: new THREE.Vector2(0.55, 0.55) });
  waterMat.normalMap.repeat.set(24, 2);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set((CANAL_MIN_X + CANAL_MAX_X) / 2, 0.05, CANAL_Z); // just above the ground plane so it actually renders, between the 0.35m-high banks
  water.name = 'canal_water';
  water.receiveShadow = true;
  group.add(water);

  // Banks — raised kachcha (dirt) strips on both sides of the water, each split
  // into a west/east segment around the bridge gap. North bank = the village side
  // (smaller z would be further still, but "village side" here just means the edge
  // closer to the hero zone, i.e. the +z edge given CANAL_Z sits between the hero
  // zone at z~36-46 and the field loop at z<=25); south bank = the field side.
  const bridgeMinX = BRIDGE_X - BRIDGE_HALF_WIDTH;
  const bridgeMaxX = BRIDGE_X + BRIDGE_HALF_WIDTH;
  const northBankZ = CANAL_Z + CANAL_HALF_WIDTH + BANK_WIDTH / 2;
  const southBankZ = CANAL_Z - CANAL_HALF_WIDTH - BANK_WIDTH / 2;
  const pMin = PULIA_X - PULIA_HALF_WIDTH, pMax = PULIA_X + PULIA_HALF_WIDTH;
  const spans = [[CANAL_MIN_X, bridgeMinX], [bridgeMaxX, pMin], [pMax, CANAL_MAX_X]]; // bank runs between the two gaps
  for (const z of [northBankZ, southBankZ]) {
    for (const [a, b] of spans) addBankSegment(group, a, b, z, BANK_WIDTH / 2, true);
  }

  // The pukka bridge — a flat concrete deck flush with the surrounding ground
  // height (collision in this game is 2D/xz-only, so what matters functionally is
  // simply that NO collider sits across this x-gap; the deck is the visual sell
  // that this specific gap is a real, built crossing rather than just an opening
  // in the banks) plus two low parapet rails for a "real bridge" read.
  const deckSpanZ = CANAL_HALF_WIDTH * 2 + BANK_WIDTH * 2 + 0.6;
  const deck = texturedThickBox(BRIDGE_HALF_WIDTH * 2, 0.3, deckSpanZ, 'concrete', { tint: BRIDGE_TINT, tileSize: 2, collider: false }); // the deck is what you drive ON — it must never be a solid box
  deck.position.set(BRIDGE_X, -0.07, CANAL_Z); // top face at ~0.08, a hair above the water
  deck.name = 'canal_bridge_deck';
  deck.castShadow = false;
  group.add(deck);
  for (const side of [-1, 1]) {
    const rail = texturedThickBox(0.15, 0.5, deckSpanZ, 'concrete', { tint: 0x9a9488, tileSize: 1 });
    rail.position.set(BRIDGE_X + side * (BRIDGE_HALF_WIDTH - 0.08), 0.42, CANAL_Z);
    rail.name = 'canal_bridge_rail';
    rail.castShadow = false;
    group.add(rail);
    // Whitewashed-cement coping on top of each parapet, and a squat post at each end
    const coping = texturedThickBox(0.3, 0.1, deckSpanZ + 0.1, 'concrete', { tint: 0xcfc8b6, tileSize: 1 });
    coping.position.set(BRIDGE_X + side * (BRIDGE_HALF_WIDTH - 0.08), 0.72, CANAL_Z);
    coping.name = 'canal_bridge_coping';
    coping.castShadow = false;
    group.add(coping);
    for (const end of [-1, 1]) {
      const post = texturedThickBox(0.4, 0.9, 0.4, 'concrete', { tint: 0xbdb6a4, tileSize: 1 });
      post.position.set(BRIDGE_X + side * (BRIDGE_HALF_WIDTH - 0.08), 0.45, CANAL_Z + end * (deckSpanZ / 2 - 0.2));
      post.name = 'canal_bridge_post';
      post.castShadow = false;
      group.add(post);
    }
  }

  // Patli pulia: a plank-and-rail foot crossing, bank to bank. Same 'ground' material as the banks (no new draw call).
  const pHalfSpan = CANAL_HALF_WIDTH + BANK_WIDTH + 0.4;
  const planks = texturedThickBox(PULIA_HALF_WIDTH * 2 - 0.1, 0.1, pHalfSpan * 2, 'ground', { tint: 0x6b4f33, tileSize: 1, tintStrength: 0.9, collider: false });
  planks.position.set(PULIA_X, 0.4, CANAL_Z);
  planks.name = 'canal_pulia_planks';
  planks.castShadow = false;
  group.add(planks);
  for (const side of [-1, 1]) {
    const handrail = texturedThickBox(0.06, 0.06, pHalfSpan * 2, 'ground', { tint: 0x7a5a3a, tileSize: 1, tintStrength: 0.9, collider: false });
    handrail.position.set(PULIA_X + side * (PULIA_HALF_WIDTH - 0.05), 1.0, CANAL_Z);
    handrail.name = 'canal_pulia_rail';
    handrail.castShadow = false;
    group.add(handrail);
    for (const k of [-1, -0.5, 0, 0.5, 1]) {
      const post = texturedThickBox(0.08, 0.65, 0.08, 'ground', { tint: 0x5e4528, tileSize: 1, tintStrength: 0.9, collider: false });
      post.position.set(PULIA_X + side * (PULIA_HALF_WIDTH - 0.05), 0.72, CANAL_Z + k * (pHalfSpan - 0.1));
      post.name = 'canal_pulia_post';
      post.castShadow = false;
      group.add(post);
    }
  }

  // Cement lining: a pukka lip along both water edges (the nahar is a maintained
  // irrigation channel), plus a greener grassy strip on each bank's outer edge.
  // Same two materials as the bank/deck, so no extra draw calls.
  for (const edge of [-1, 1]) {
    const lipZ = CANAL_Z + edge * (CANAL_HALF_WIDTH + 0.12);
    for (const [a, b] of spans) {
      const lip = texturedThickBox(b - a, 0.42, 0.24, 'concrete', { tint: 0xa9a392, tileSize: 1.5 });
      lip.position.set((a + b) / 2, 0.21, lipZ);
      lip.name = 'canal_lining';
      lip.castShadow = false;
      group.add(lip);
      const grass = texturedThickBox(b - a, 0.06, 0.5, 'ground', { tint: 0x6f7a3c, tileSize: 2, tintStrength: 0.7 });
      grass.position.set((a + b) / 2, 0.37, CANAL_Z + edge * (CANAL_HALF_WIDTH + BANK_WIDTH - 0.25));
      grass.name = 'canal_bank_grass';
      grass.castShadow = false;
      group.add(grass);
    }
  }

  // Draw-call budget — banks (4 segments) + rails (2) fold into one 'ground'-ish
  // dirt mesh; the water plane and bridge deck each keep their own distinct
  // material (water's own MeshStandardMaterial, concrete's own tiled set) so this
  // whole feature costs 3 draw calls total, not 7+.
  mergeGroupByMaterial(group);

  // Bank-side greenery just outside each grassy strip: sparse bougainvillea, tulsi and
  // banana clumps, kept clear of the bridge deck and the pulia. One draw call.
  const plants = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const edge of [-1, 1]) {
    for (let x = CANAL_MIN_X + 1.5; x < CANAL_MAX_X - 1; x += 2.2 + rnd() * 2.4) {
      if (Math.abs(x - BRIDGE_X) < BRIDGE_HALF_WIDTH + 1.2 || Math.abs(x - PULIA_X) < PULIA_HALF_WIDTH + 1.2) continue;
      const r = rnd();
      const kind = r < 0.4 ? GARDEN_KIND.TULSI : r < 0.75 ? GARDEN_KIND.BOUGAINVILLEA : GARDEN_KIND.BANANA;
      plants.push({ x, z: CANAL_Z + edge * (CANAL_HALF_WIDTH + BANK_WIDTH + 0.5 + rnd() * 0.6), y: 0.35, kind, scale: kind === GARDEN_KIND.BANANA ? 0.8 : 0.9 + rnd() * 0.3 });
    }
  }
  const greens = buildGardenPlants(plants);
  if (greens) { greens.name = 'canal_bank_plants'; group.add(greens); }
  return group;
}
