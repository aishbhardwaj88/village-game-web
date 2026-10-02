import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE, darken } from './village.js';

/**
 * Item 3c (real playtest report — "the village reads as desert", no vegetation
 * anywhere; a village called Amrai Khera has no plants in it) — 3 simple,
 * code-built placeholder trees (neem, peepal, babool/acacia), no texture/model
 * asset, no Tripo. A trunk (tapered cylinder) plus a handful of overlapping
 * low-poly canopy blobs (icosahedra, deliberately faceted — not an attempt at
 * a realistic canopy, a placeholder silhouette). Stays inside the fixed
 * palette (`PALETTE.greyGreen` for foliage, `PALETTE.woodTrim` for bark — never
 * a new, more saturated green invented for this).
 *
 * `src/trees.js` existed once before this session and was deleted (see
 * docs/parked.md, "playtest bugfix 4/4") because the brief at the time
 * required EITHER a real licensed tree model OR no trees at all — procedural
 * placeholders were explicitly out of scope then. This task explicitly asks
 * for placeholder trees instead ("These are placeholders that Tripo will
 * replace in October, spend minimum effort") — a different brief, so this is
 * a fresh, simpler build (solid low-poly blobs, not the earlier cross-plane
 * billboard technique with spherical-normal lighting — more robust for a
 * minimum-effort placeholder since real 3D volume lights correctly from any
 * angle with no special-case shader work).
 */

const BARK_COLOR = darken(PALETTE.woodTrim, 0.75);
const BARK_COLOR_LIGHT = darken(PALETTE.woodTrim, 0.9);
// Bugfix: PALETTE.greyGreen (0xbcbfa8) is already a light, desaturated sage —
// correct for a sun-faded WALL tint, but under this scene's warm sun + ACES
// tone mapping + warm colour grade, a canopy built from it (or anything
// lerped toward it) read as near-cream, indistinguishable from the temple's
// own plaster (confirmed via tools/village-greenery-shots.mjs's
// temple_chabutra shot — the peepal canopy was invisible against the sky/
// building). A markedly darker shade of the SAME hue (darken(), this
// codebase's own established "deeper shade of the same hue, never a
// different colour" rule) reads as foliage instead of wall.
const LEAF_NEEM = new THREE.Color(darken(PALETTE.greyGreen, 0.42));
const LEAF_PEEPAL = new THREE.Color(darken(PALETTE.greyGreen, 0.5));
const LEAF_BABOOL = new THREE.Color(darken(PALETTE.greyGreen, 0.38)).lerp(new THREE.Color(PALETTE.mustard), 0.22); // dry, dusty acacia scrub — still visibly darker than the ground

function paintFlat(geometry, color) {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function buildTrunk(height, baseRadius, topRadius, barkHex, lean = 0) {
  // .toNonIndexed() — IcosahedronGeometry (the canopy blobs below) is
  // naturally non-indexed (PolyhedronGeometry needs unique, unshared vertices
  // per face for flat-faceted normals), but CylinderGeometry is indexed by
  // default. mergeGeometries() refuses to mix indexed and non-indexed
  // geometries in one call ("make sure index attribute exists among all
  // geometries, or in none of them") — it fails silently to a console.error
  // and returns null, which then crashes downstream (a Mesh with null
  // geometry breaks Box3/merge/raycast). Every part merged together here
  // needs to be in the same (non-indexed) state.
  const geo = new THREE.CylinderGeometry(topRadius, baseRadius, height, 7, 2).toNonIndexed();
  geo.translate(0, height / 2, 0);
  if (lean) geo.rotateZ(lean);
  paintFlat(geo, new THREE.Color(barkHex));
  return geo;
}

/** One faceted canopy "blob" at a given offset/radius — flattened in Y by
 * `squash` (1 = round, <1 = flatter, for an umbrella-shaped canopy). */
function buildCanopyBlob(cx, cy, cz, radius, squash, color, detail = 0) {
  const geo = new THREE.IcosahedronGeometry(radius, detail); // already non-indexed
  geo.scale(1, squash, 1);
  geo.translate(cx, cy, cz);
  paintFlat(geo, color);
  return geo;
}

function mergeAndColor(parts) {
  const geo = mergeGeometries(parts, false);
  return geo;
}

/** Neem — a tall, dense, roughly dome-shaped shade tree. */
export function buildNeemTree(seed = 0) {
  const group = new THREE.Group();
  group.name = 'tree_neem';
  const rand = mulberry32(seed);
  const height = 4.3 + rand() * 0.6;
  const trunkGeo = buildTrunk(height * 0.55, 0.22, 0.14, BARK_COLOR);
  const canopyParts = [];
  const canopyY = height * 0.55;
  const blobCount = 6;
  for (let i = 0; i < blobCount; i++) {
    const a = (i / blobCount) * Math.PI * 2;
    const r = 0.9 + rand() * 0.3;
    canopyParts.push(
      buildCanopyBlob(Math.cos(a) * r * 0.8, canopyY + height * 0.22 + (rand() - 0.5) * 0.4, Math.sin(a) * r * 0.8, 1.15 + rand() * 0.25, 0.85, LEAF_NEEM)
    );
  }
  canopyParts.push(buildCanopyBlob(0, canopyY + height * 0.38, 0, 1.3, 0.8, LEAF_NEEM));
  const mesh = new THREE.Mesh(mergeAndColor([trunkGeo, ...canopyParts]), null);
  mesh.name = 'tree_neem_mesh';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

/** Peepal — the one the temple's chabutra platform was already built to hold a
 * tree through (src/temple.js's PEEPAL_PLATFORM_POS/RADIUS, docs/parked.md's
 * "Bazaar item 4" entry: "orthos show a tree growing through the circular
 * brick platform... no tree, rather than... leaving the chabutra out
 * entirely"). A broader, flatter canopy than the neem and a thicker trunk —
 * peepal trees read as wide and spreading, not a tight dome. */
export function buildPeepalTree(seed = 1) {
  const group = new THREE.Group();
  group.name = 'tree_peepal';
  const rand = mulberry32(seed);
  const height = 5.2 + rand() * 0.5;
  const trunkGeo = buildTrunk(height * 0.5, 0.32, 0.2, BARK_COLOR_LIGHT);
  const canopyParts = [];
  const canopyY = height * 0.5;
  const blobCount = 7;
  for (let i = 0; i < blobCount; i++) {
    const a = (i / blobCount) * Math.PI * 2;
    const r = 1.5 + rand() * 0.5;
    canopyParts.push(
      buildCanopyBlob(Math.cos(a) * r, canopyY + height * 0.18 + (rand() - 0.5) * 0.5, Math.sin(a) * r, 1.3 + rand() * 0.3, 0.7, LEAF_PEEPAL)
    );
  }
  canopyParts.push(buildCanopyBlob(0, canopyY + height * 0.32, 0, 1.6, 0.65, LEAF_PEEPAL));
  const mesh = new THREE.Mesh(mergeAndColor([trunkGeo, ...canopyParts]), null);
  mesh.name = 'tree_peepal_mesh';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

/** Babool (acacia) — short, gnarled, a wide flat "umbrella" canopy well clear
 * of the trunk, sparse and dry — a field-boundary scrub tree, not a shade
 * tree. The flattest/driest of the three on purpose; it's meant to read as
 * scrubby from across the field, not lush. */
export function buildBaboolTree(seed = 2) {
  const group = new THREE.Group();
  group.name = 'tree_babool';
  const rand = mulberry32(seed);
  const height = 2.6 + rand() * 0.4;
  const lean = (rand() - 0.5) * 0.18; // a visible gnarled lean, not ramrod straight
  const trunkGeo = buildTrunk(height * 0.75, 0.12, 0.07, BARK_COLOR, lean);
  const canopyParts = [];
  const canopyY = height * 0.78;
  const blobCount = 5;
  for (let i = 0; i < blobCount; i++) {
    const a = (i / blobCount) * Math.PI * 2;
    const r = 0.9 + rand() * 0.4;
    canopyParts.push(buildCanopyBlob(Math.cos(a) * r, canopyY + (rand() - 0.5) * 0.15, Math.sin(a) * r, 0.75 + rand() * 0.2, 0.35, LEAF_BABOOL));
  }
  const mesh = new THREE.Mesh(mergeAndColor([trunkGeo, ...canopyParts]), null);
  mesh.name = 'tree_babool_mesh';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

// Deterministic tiny PRNG (not Math.random()) so repeated builds (e.g. a future
// hot-reload) produce the same tree shape at the same seed — same technique
// src/field.js's crop placement already uses for reproducible scatter.
function mulberry32(seed) {
  let a = seed * 2654435761 + 0x6d2b79f5;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BUILDERS = { neem: buildNeemTree, peepal: buildPeepalTree, babool: buildBaboolTree };

/** Places a handful of real-location trees — `placements`:
 * [{ kind: 'neem'|'peepal'|'babool', x, z, rotationY, seed }]. One shared
 * MeshStandardMaterial (vertex-coloured, no map) for every tree regardless of
 * species/location, so this whole function costs at most the handful of
 * meshes it returns, not a draw call each — the caller merges them into the
 * same static-geometry group every building already merges into
 * (src/main.js's mergeAcrossGroups), same as any other static prop.
 *
 * Bugfix: this material must be a module-level SINGLETON, not constructed
 * fresh inside this function — main.js calls buildTrees() 3 separate times
 * (temple, hero zone, field), and mergeGroupByMaterial/mergeAcrossGroups
 * (src/mergeUtils.js) bucket strictly by Material object IDENTITY, so 3 fresh
 * materials (even if visually identical) would merge into 3 separate draw
 * calls instead of 1 — confirmed by measurement (135 draw calls with a
 * per-call material, 130 with this shared one). */
const TREE_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
TREE_MATERIAL.name = 'tree_foliage';

export function buildTrees(placements) {
  const material = TREE_MATERIAL;
  const group = new THREE.Group();
  group.name = 'trees';
  for (const p of placements) {
    const builder = BUILDERS[p.kind];
    if (!builder) continue;
    const tree = builder(p.seed ?? 0);
    tree.children[0].material = material;
    tree.position.set(p.x, 0, p.z);
    tree.rotation.y = p.rotationY || 0;
    group.add(tree);
  }
  return group;
}
