import * as THREE from 'three';
import { mergeGroupByMaterial } from './mergeUtils.js';

/**
 * Finish-line Step 2 — code-built stylised people, replacing the flat capsule
 * placeholders (src/npc.js) for the four named characters the art director
 * asked for first: Maa, Dada, Postman, Halwai. Matches docs/art-rules-
 * characters.md's style decision (STYLISED FORMS, REAL MATTE MATERIALS — not
 * photoreal, not a capsule) and the real reference art in Characters V1/.
 *
 * Draw-call discipline (CLAUDE.md's budget section — every spare draw call at
 * 134/140 already spent): every part below is baked with vertex colour (same
 * `bakeColor`/`paint()` pattern src/vehicles.js already uses) into exactly ONE
 * shared (roughness 0.85, metalness 0) material — a value that simultaneously
 * satisfies every docs/art-rules-characters.md minimum (skin >=0.75, cotton/
 * wool/hair >=0.8, leather >=0.6) — so mergeGroupByMaterial() folds an entire
 * character into exactly ONE draw call, same as a capsule was. "Idle
 * breathing" and "walk cycle" are therefore a whole-body rock/bob/sway on an
 * inner pivot group, not per-limb animation — the same technique
 * src/vehicles.js already uses for the tractor/trolley/cart's own motion, and
 * the only one compatible with a single merged mesh. At this game's mid-
 * distance camera (art-direction.md 7.0) this reads as a real walk, not a
 * glide — verify against a real screenshot before trusting that claim.
 */

const paintCache = new Map();
function paint(roughness = 0.85, metalness = 0) {
  const key = `${roughness}|${metalness}`;
  let m = paintCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness, metalness, vertexColors: true });
    m.name = `characterPaint_${key}`;
    paintCache.set(key, m);
  }
  return m;
}

function bakeColor(geometry, color) {
  const c = new THREE.Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function pmesh(geometry, color) {
  bakeColor(geometry, color);
  const mesh = new THREE.Mesh(geometry, paint());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A box centred at (x,y,z). */
function box(x, y, z, w, h, d, color) {
  const m = pmesh(new THREE.BoxGeometry(w, h, d), color);
  m.position.set(x, y, z);
  return m;
}

/** A sphere (possibly squashed via scale) centred at (x,y,z). */
function sphere(x, y, z, r, color, scaleX = 1, scaleY = 1, scaleZ = 1) {
  const m = pmesh(new THREE.SphereGeometry(r, 10, 8), color);
  m.position.set(x, y, z);
  m.scale.set(scaleX, scaleY, scaleZ);
  return m;
}

/** A vertical tapered cylinder spanning y1 (radius r1) to y2 (radius r2),
 * centred at (x, *, z) — the main tool for limbs, torsos, and drapes
 * (sari/dhoti). Matches src/vehicles.js's "derive length/position from real
 * endpoints" convention rather than a hand-picked centre+height. */
function taper(x, z, y1, r1, y2, r2, color, segments = 8) {
  const h = Math.abs(y2 - y1);
  const geo = new THREE.CylinderGeometry(r2, r1, h, segments);
  const m = pmesh(geo, color);
  m.position.set(x, (y1 + y2) / 2, z);
  return m;
}

/** A thin ring (bangle, cap brim) around a vertical axis at (x,y,z). */
function ring(x, y, z, r, tube, color) {
  const m = pmesh(new THREE.TorusGeometry(r, tube, 6, 14), color);
  m.position.set(x, y, z);
  m.rotation.x = Math.PI / 2;
  return m;
}

const SKIN = {
  maa: 0xd8a878,
  dada: 0xa8795a,
  postman: 0x8a5a3c,
  halwai: 0xc99268,
};

/**
 * Builds one character's full static geometry under a fresh Group, merges it
 * into one draw call, and wraps it in a `bodyPivot` group for idle/walk
 * rocking. `partsFn(parts)` pushes every THREE.Mesh for this character into
 * `parts` (via the helpers above); `partsFn` itself is what each build*()
 * function below supplies.
 */
function assemble(partsFn) {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);
  const parts = [];
  partsFn(parts);
  for (const p of parts) bodyPivot.add(p);
  mergeGroupByMaterial(bodyPivot);
  return { root, bodyPivot };
}

// ---------------------------------------------------------------------------
// MAA — Characters V1/people/_real/mother_real.png + family1/family1_mother.png.
// Mustard-yellow sari with a red/maroon short-sleeve blouse, bangles, braid,
// marigold earrings. The sari drapes the legs as one wrapped garment (no
// visible stride silhouette in the reference either), so her lower body is a
// single tapered cone, not separate legs — matches the reference exactly and
// keeps her at one draw call.
// ---------------------------------------------------------------------------
const MAA_SARI = 0xc99a2e;
const MAA_BLOUSE = 0x8a2a28;
const MAA_HAIR = 0x1c1712;
const MAA_EARRING = 0xe8941f;

function buildMaaParts(parts) {
  // Sari: hip (wider, the pallu bunched at the waist) to hem (slightly flared).
  parts.push(taper(0, 0, 0.82, 0.145, 0.06, 0.185, MAA_SARI, 10));
  // Pallu fold draped diagonally over the left shoulder, down the back — a
  // tapered cylinder (reads as a drape, not a flat cardboard flap).
  const pallu = taper(-0.12, -0.06, 1.3, 0.05, 0.7, 0.1, MAA_SARI, 8);
  pallu.rotation.x = -0.25;
  pallu.rotation.z = 0.2;
  parts.push(pallu);
  // Midriff sliver (sari sits low on the waist, blouse ends above it).
  parts.push(taper(0, 0, 0.78, 0.125, 0.86, 0.13, SKIN.maa, 10));
  // Blouse (short sleeve, fitted) — shoulders to waist.
  parts.push(taper(0, 0, 0.86, 0.135, 1.22, 0.145, MAA_BLOUSE, 10));
  // Shoulders — a short connecting cap so the arms don't float clear of the
  // torso with a visible gap at the join.
  for (const side of [-1, 1]) parts.push(sphere(side * 0.14, 1.19, 0, 0.055, MAA_BLOUSE));
  // Short sleeve cuffs, shoulder clearly past the torso's own 0.145 radius.
  for (const side of [-1, 1]) parts.push(taper(side * 0.21, 0, 1.15, 0.052, 1.04, 0.058, MAA_BLOUSE, 8));
  // Arms: upper arm (blouse colour would double the sleeve, so skin from cuff
  // down) bent slightly in toward the hips, forearm continuing to a hand.
  for (const side of [-1, 1]) {
    parts.push(taper(side * 0.225, 0.01, 1.04, 0.04, 0.87, 0.033, SKIN.maa, 8));
    parts.push(taper(side * 0.21, 0.04, 0.87, 0.033, 0.74, 0.027, SKIN.maa, 8));
    parts.push(sphere(side * 0.2, 0.71, 0.04, 0.033, SKIN.maa, 1, 1.2, 0.8));
    // Bangles at the wrist.
    parts.push(ring(side * 0.205, 0.78, 0.04, 0.029, 0.009, 0xc9a23a));
  }
  // Neck + head.
  parts.push(taper(0, 0, 1.22, 0.045, 1.27, 0.05, SKIN.maa, 8));
  parts.push(sphere(0, 1.37, 0, 0.1, SKIN.maa, 0.92, 1, 0.9));
  // Hair: centre-parted, close to the scalp, swept back into a long braid.
  parts.push(sphere(0, 1.395, -0.01, 0.103, MAA_HAIR, 0.95, 0.85, 0.98));
  parts.push(taper(0, 0.06, 1.3, 0.025, 0.95, 0.018, MAA_HAIR, 6));
  parts.push(taper(0, 0.07, 0.95, 0.018, 0.65, 0.012, MAA_HAIR, 6));
  // Marigold earrings.
  for (const side of [-1, 1]) parts.push(sphere(side * 0.1, 1.32, 0.01, 0.022, MAA_EARRING));
  // Sandal hint at the hem.
  for (const side of [-1, 1]) parts.push(box(side * 0.07, 0.025, 0.04, 0.07, 0.025, 0.17, 0x6b4a32));
}

export function buildMaa() {
  return assemble(buildMaaParts);
}

// ---------------------------------------------------------------------------
// DADA — Characters V1/people/family1/family1_grandfather.jpg. Cream checked
// kurta to mid-thigh, white Gandhi topi, white dhoti to the ankle, moustache,
// black loafers, brass keys at the waist (brief). Older posture: a slight
// forward stoop baked into the torso/head tilt.
// ---------------------------------------------------------------------------
const DADA_KURTA = 0xe3d9b8;
const DADA_DHOTI = 0xf2f0e8;
const DADA_CAP = 0xf5f3ea;
const DADA_SHOE = 0x1c1a18;
const DADA_KEYS = 0x8a6a2e;

function buildDadaParts(parts) {
  // Dhoti: looser drape than Maa's sari, narrower at the ankle, a visible
  // centre gather-fold (a thin vertical strip) like the reference.
  parts.push(taper(0, 0, 0.84, 0.14, 0.09, 0.1, DADA_DHOTI, 10));
  parts.push(box(0, 0.45, 0.095, 0.05, 0.7, 0.015, 0xd8d4c6));
  // Kurta: long, straight-ish, to mid-thigh, slight forward lean (age/posture).
  const kurta = taper(0, 0, 0.84, 0.155, 1.26, 0.16, DADA_KURTA, 10);
  kurta.position.z -= 0.015;
  parts.push(kurta);
  // Breast pocket.
  parts.push(box(0.09, 1.08, 0.165, 0.065, 0.08, 0.012, 0xd8cfa8));
  // Brass keys at the waist.
  parts.push(box(0.14, 0.86, 0.1, 0.03, 0.06, 0.015, DADA_KEYS));
  // Shoulders — a connecting cap so the arms join the kurta cleanly.
  for (const side of [-1, 1]) parts.push(sphere(side * 0.165, 1.23, -0.01, 0.06, DADA_KURTA));
  // Arms, hanging straight (relaxed, slightly forward with age), shoulder
  // clearly past the kurta's own 0.16 radius at this height.
  for (const side of [-1, 1]) {
    parts.push(taper(side * 0.235, -0.01, 1.22, 0.045, 0.95, 0.036, DADA_KURTA, 8));
    parts.push(taper(side * 0.21, -0.01, 0.95, 0.036, 0.74, 0.029, SKIN.dada, 8));
    parts.push(sphere(side * 0.2, 0.71, -0.01, 0.032, SKIN.dada, 1, 1.15, 0.8));
  }
  // Neck + head, tilted slightly down/forward.
  parts.push(taper(0, -0.01, 1.26, 0.045, 1.31, 0.05, SKIN.dada, 8));
  const head = sphere(0, 1.4, -0.015, 0.098, SKIN.dada, 0.92, 0.98, 0.92);
  head.rotation.x = 0.08;
  parts.push(head);
  // Ears.
  for (const side of [-1, 1]) parts.push(sphere(side * 0.095, 1.395, -0.015, 0.022, SKIN.dada));
  // Moustache.
  parts.push(box(0, 1.365, 0.085, 0.08, 0.018, 0.02, 0x3a362f));
  // Grey hair fringe beneath the cap, at the temples/back only.
  for (const side of [-1, 1]) parts.push(sphere(side * 0.085, 1.37, -0.05, 0.03, 0x8a887f, 1, 0.7, 0.7));
  // Gandhi topi.
  parts.push(taper(0, -0.015, 1.44, 0.095, 1.5, 0.078, DADA_CAP, 10));
  parts.push(sphere(0, 1.5, -0.015, 0.078, DADA_CAP, 1, 0.55, 1));
  // Loafers.
  for (const side of [-1, 1]) parts.push(box(side * 0.07, 0.03, 0.05, 0.08, 0.035, 0.19, DADA_SHOE));
}

export function buildDada() {
  return assemble(buildDadaParts);
}

// ---------------------------------------------------------------------------
// POSTMAN — Characters V1/people/villagers/postman_v2_master_frontback.png.
// Khaki uniform shirt + trousers, navy cap, moustache, olive shoulder bag
// (sling strap + satchel), belt, sandals. Trousers are form-fitting enough
// that two separate leg shapes read correctly even though they're baked into
// the same merged draw call (no independent leg motion needed either way).
// ---------------------------------------------------------------------------
const POSTMAN_UNIFORM = 0xb79a5e;
const POSTMAN_CAP = 0x2b3550;
const POSTMAN_BAG = 0x5a6b3e;
const POSTMAN_BELT = 0x3a2a1c;
const POSTMAN_SHOE = 0x6b4a32;

function buildPostmanParts(parts) {
  // Legs (trousers) — two separate tapered cylinders, straight-ish.
  for (const side of [-1, 1]) parts.push(taper(side * 0.075, 0, 0.82, 0.09, 0.08, 0.06, POSTMAN_UNIFORM, 8));
  // Sandals.
  for (const side of [-1, 1]) parts.push(box(side * 0.075, 0.03, 0.04, 0.075, 0.03, 0.18, POSTMAN_SHOE));
  // Torso (shirt), belt line.
  parts.push(taper(0, 0, 0.82, 0.165, 1.28, 0.175, POSTMAN_UNIFORM, 10));
  parts.push(ring(0, 0.84, 0, 0.165, 0.018, POSTMAN_BELT));
  // Shirt pockets.
  for (const side of [-1, 1]) parts.push(box(side * 0.08, 1.08, 0.175, 0.06, 0.07, 0.01, 0x9c8450));
  // Satchel bag + sling strap (diagonal thin box across the torso).
  const strap = box(0, 1.05, 0.17, 0.04, 0.5, 0.012, POSTMAN_BELT);
  strap.rotation.z = 0.55;
  parts.push(strap);
  parts.push(box(0.14, 0.78, 0.1, 0.16, 0.18, 0.1, POSTMAN_BAG));
  // Shoulders — a connecting cap so the arms join the shirt cleanly.
  for (const side of [-1, 1]) parts.push(sphere(side * 0.175, 1.26, 0, 0.065, POSTMAN_UNIFORM));
  // Arms, shoulder clearly past the shirt's own 0.175 radius at this height.
  for (const side of [-1, 1]) {
    parts.push(taper(side * 0.25, 0, 1.25, 0.05, 0.97, 0.04, POSTMAN_UNIFORM, 8));
    parts.push(taper(side * 0.225, 0, 0.97, 0.04, 0.74, 0.031, SKIN.postman, 8));
    parts.push(sphere(side * 0.215, 0.71, 0, 0.033, SKIN.postman, 1, 1.15, 0.8));
  }
  // Neck + head.
  parts.push(taper(0, 0, 1.28, 0.047, 1.33, 0.052, SKIN.postman, 8));
  parts.push(sphere(0, 1.43, 0, 0.1, SKIN.postman, 0.92, 1, 0.92));
  for (const side of [-1, 1]) parts.push(sphere(side * 0.097, 1.425, 0, 0.022, SKIN.postman));
  // Big moustache (reference's signature feature).
  parts.push(box(0, 1.4, 0.095, 0.1, 0.022, 0.02, 0x14100e));
  for (const side of [-1, 1]) {
    const curl = sphere(side * 0.065, 1.395, 0.09, 0.016, 0x14100e);
    parts.push(curl);
  }
  // Cap with a small brim.
  parts.push(taper(0, 0, 1.47, 0.098, 1.52, 0.082, POSTMAN_CAP, 10));
  parts.push(sphere(0, 1.52, 0, 0.082, POSTMAN_CAP, 1, 0.5, 1));
  parts.push(box(0, 1.465, 0.1, 0.16, 0.02, 0.06, POSTMAN_CAP));
}

export function buildPostman() {
  return assemble(buildPostmanParts);
}

// ---------------------------------------------------------------------------
// HALWAI — Characters V1/people/villagers/halwai.png. Stocky, bald with a
// grey side-fringe, mustard shirt worn open over a white banyan vest, big
// belly, blue plaid shorts/lungi to the knee, apron with ties, flip-flops.
// Strong forearms per the brief. His existing createStirLoop() (src/main.js)
// already rotates `npcGroup.userData.mesh` directly — this build keeps that
// contract by exposing the single merged mesh the same way.
// ---------------------------------------------------------------------------
const HALWAI_SHIRT = 0xc9962e;
const HALWAI_VEST = 0xf0ece0;
const HALWAI_SHORTS = 0x3a4a6e;
const HALWAI_APRON = 0xede8da;

function buildHalwaiParts(parts) {
  // Legs — short, stocky, bare below the shorts.
  for (const side of [-1, 1]) parts.push(taper(side * 0.1, 0, 0.62, 0.11, 0.07, 0.085, SKIN.halwai, 8));
  for (const side of [-1, 1]) parts.push(box(side * 0.1, 0.03, 0.05, 0.1, 0.03, 0.2, 0x4a3a2a));
  // Plaid shorts/lungi to the knee.
  parts.push(taper(0, 0, 0.6, 0.23, 0.92, 0.26, HALWAI_SHORTS, 10));
  // Big belly + torso — a wide sphere reads better than a box for this build.
  parts.push(sphere(0, 1.08, 0.02, 0.26, SKIN.halwai, 1, 1, 0.92));
  // White banyan vest (visible at the chest, under the open shirt).
  parts.push(taper(0, 0.02, 0.9, 0.2, 1.3, 0.16, HALWAI_VEST, 10));
  // Mustard shirt worn open — two narrow front panels hugging the belly's own
  // silhouette (not taller than the chest — a taller panel reads as "wings"
  // beside the neck, a real bug caught via screenshot), plus short sleeves.
  for (const side of [-1, 1]) {
    const panel = box(side * 0.24, 0.98, 0.16, 0.09, 0.32, 0.05, HALWAI_SHIRT);
    panel.rotation.y = side * 0.3;
    parts.push(panel);
  }
  // Shoulders — a connecting cap so the arms join the shirt cleanly.
  for (const side of [-1, 1]) parts.push(sphere(side * 0.27, 1.3, 0.02, 0.085, HALWAI_SHIRT));
  for (const side of [-1, 1]) parts.push(taper(side * 0.3, 0.02, 1.32, 0.08, 1.16, 0.072, HALWAI_SHIRT, 8));
  // Apron over the front, with a tie-bow at the back. z=0.28 clears the
  // belly sphere's own front surface (0.02 + 0.26*0.92 = 0.259) — sitting
  // inside it (an earlier z=0.23 did) let the belly occlude most of the
  // apron, leaving only a stray triangular sliver visible (caught via
  // screenshot, not visible from the numbers alone).
  parts.push(box(0, 0.86, 0.28, 0.32, 0.42, 0.015, HALWAI_APRON));
  const bow = box(0, 0.98, -0.25, 0.1, 0.05, 0.02, HALWAI_APRON);
  parts.push(bow);
  // Arms — strong forearms (thicker than upper arm) per the brief, shoulder
  // clearly past the belly's own 0.26 radius.
  for (const side of [-1, 1]) {
    parts.push(taper(side * 0.36, 0, 1.3, 0.056, 1.04, 0.054, SKIN.halwai, 8));
    parts.push(taper(side * 0.38, 0.05, 1.04, 0.054, 0.78, 0.047, SKIN.halwai, 8));
    parts.push(sphere(side * 0.39, 0.74, 0.08, 0.044, SKIN.halwai, 1, 1.1, 0.85));
  }
  // Neck + head, jowly, bald on top.
  parts.push(taper(0, 0.02, 1.34, 0.065, 1.38, 0.07, SKIN.halwai, 8));
  parts.push(sphere(0, 1.48, 0.02, 0.115, SKIN.halwai, 1, 0.98, 0.95));
  for (const side of [-1, 1]) parts.push(sphere(side * 0.11, 1.47, 0.02, 0.026, SKIN.halwai));
  // Grey side-fringe hair (bald on top, per reference).
  for (const side of [-1, 1]) parts.push(sphere(side * 0.09, 1.46, -0.04, 0.04, 0xb8b4a8, 1, 0.6, 0.8));
  parts.push(sphere(0, 1.42, -0.09, 0.07, 0xb8b4a8, 1, 0.5, 0.6));
}

export function buildHalwai() {
  return assemble(buildHalwaiParts);
}

// ---------------------------------------------------------------------------
// Idle breathing + walk-cycle animation — a whole-body rock/bob/sway on the
// `bodyPivot` group (same technique as src/vehicles.js's Vehicle.update()
// body pitch/roll). `isMoving` switches between a slow idle breathing bob and
// a faster walking rock.
// ---------------------------------------------------------------------------
export function createHumanoidAnimator(bodyPivot) {
  let t = Math.random() * 10;
  return function update(dt, isMoving) {
    t += dt * (isMoving ? 7 : 1.6);
    const bob = isMoving ? 0.028 : 0.01;
    const sway = isMoving ? 0.05 : 0.012;
    bodyPivot.position.y = Math.abs(Math.sin(t)) * bob;
    bodyPivot.rotation.z = Math.sin(t) * sway;
    bodyPivot.rotation.x = isMoving ? Math.sin(t * 2) * 0.03 : Math.sin(t * 0.5) * 0.008;
  };
}

export const CHARACTER_BUILDERS = {
  maa: buildMaa,
  dada: buildDada,
  postman: buildPostman,
  halwai: buildHalwai,
};
