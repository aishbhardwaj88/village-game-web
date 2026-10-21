import * as THREE from 'three';
import { texturedBox, texturedThickBox } from './materials.js';
import { mergeGroupByMaterial } from './mergeUtils.js';

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
  for (const z of [northBankZ, southBankZ]) {
    addBankSegment(group, CANAL_MIN_X, bridgeMinX, z, BANK_WIDTH / 2, true);
    addBankSegment(group, bridgeMaxX, CANAL_MAX_X, z, BANK_WIDTH / 2, true);
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
  }

  // Draw-call budget — banks (4 segments) + rails (2) fold into one 'ground'-ish
  // dirt mesh; the water plane and bridge deck each keep their own distinct
  // material (water's own MeshStandardMaterial, concrete's own tiled set) so this
  // whole feature costs 3 draw calls total, not 7+.
  mergeGroupByMaterial(group);
  return group;
}
