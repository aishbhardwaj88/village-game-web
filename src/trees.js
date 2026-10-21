import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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

const BARK_COLOR = 0x3b2b22; // dark, damp-looking trunk (art review 2: darker trunks)
const BARK_COLOR_LIGHT = 0x4a3a2e;
// Bugfix: PALETTE.greyGreen (0xbcbfa8) is already a light, desaturated sage —
// correct for a sun-faded WALL tint, but under this scene's warm sun + ACES
// tone mapping + warm colour grade, a canopy built from it (or anything
// lerped toward it) read as near-cream, indistinguishable from the temple's
// own plaster (confirmed via tools/village-greenery-shots.mjs's
// temple_chabutra shot — the peepal canopy was invisible against the sky/
// building). A markedly darker shade of the SAME hue (darken(), this
// codebase's own established "deeper shade of the same hue, never a
// different colour" rule) reads as foliage instead of wall.
// Art review 2 (2026-10-21): canopies were grey-beige. Real foliage greens now (sRGB hex).
const LEAF_NEEM = new THREE.Color(0x3f5a2f);
const LEAF_PEEPAL = new THREE.Color(0x3a5f32);
const LEAF_BABOOL = new THREE.Color(0x6b7340); // lighter olive acacia, still clearly green
const LEAF_MANGO = new THREE.Color(0x294d27);

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
  geo.deleteAttribute('uv');
  geo.translate(0, height / 2, 0);
  if (lean) geo.rotateZ(lean);
  paintFlat(geo, new THREE.Color(barkHex));
  return geo;
}

/** One faceted canopy "blob" at a given offset/radius — flattened in Y by
 * `squash` (1 = round, <1 = flatter, for an umbrella-shaped canopy). */
function buildCanopyBlob(cx, cy, cz, radius, squash, color, detail = 1, sat = false) {
  let geo = new THREE.IcosahedronGeometry(radius, detail);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo = mergeVertices(geo);
  // slightly lumpy, then smooth-shaded so the canopy reads as rounded foliage, not faceted rock
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + 0.08 * Math.sin(pos.getX(i) * 5.1 + pos.getZ(i) * 3.7 + cx * 7.3) * Math.cos(pos.getY(i) * 4.3 + cz);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * squash * k, pos.getZ(i) * k);
  }
  geo.translate(cx, cy, cz);
  geo.computeVertexNormals();
  geo = geo.toNonIndexed();
  // per-vertex colour: darker underneath, sunlit lighter top, small hue jitter per blob
  const p2 = geo.attributes.position;
  const colors = new Float32Array(p2.count * 3);
  const fr = Math.abs(Math.sin(cx * 12.9 + cz * 78.2 + cy * 3.1) * 43758.5453) % 1;
  const jit = 0.92 + 0.16 * fr;
  const c = new THREE.Color();
  for (let i = 0; i < p2.count; i++) {
    const t = Math.min(1, Math.max(0, (p2.getY(i) - (cy - radius * squash)) / (2 * radius * squash)));
    // leaf-clump noise + a warm olive/yellow lean on sunlit tops, cooler deep green underneath
    const nz = 0.88 + 0.24 * (0.5 + 0.5 * Math.sin(p2.getX(i) * 6.3 + p2.getZ(i) * 4.1) * Math.cos(p2.getY(i) * 5.7 + p2.getX(i) * 2.3));
    c.copy(color).multiplyScalar((0.58 + 0.55 * t) * jit * nz);
    c.r *= 1 + 0.12 * t; c.b *= 1 - 0.1 * t;
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (!sat && radius > 0.7) {
    // satellite leaf clumps break the lollipop silhouette (art review 2: rounder but not blobby-perfect)
    const parts = [geo];
    for (let k = 0; k < 3; k++) {
      const a = k * 2.399 + cx * 3.1 + cz;
      const ry = 0.25 + 0.5 * ((k * 0.37 + fr) % 1);
      parts.push(buildCanopyBlob(cx + Math.cos(a) * radius * 0.85, cy + (ry - 0.3) * radius * squash, cz + Math.sin(a) * radius * 0.85, radius * (0.42 + 0.12 * ((k + fr * 5) % 1)), 0.85, color, 0, true));
    }
    return mergeGeometries(parts, false);
  }
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

/** Mango — M7's baagh (docs/STORY.md), the signature "knock mangoes down" tree.
 * Dense, rounded, a bit shorter and bushier than the neem — reads as an orchard
 * tree, not a shade tree. Same build pattern as the three species above. */
export function buildMangoTree(seed = 3) {
  const group = new THREE.Group();
  group.name = 'tree_mango';
  const rand = mulberry32(seed);
  const height = 3.6 + rand() * 0.5;
  const trunkGeo = buildTrunk(height * 0.5, 0.2, 0.13, BARK_COLOR);
  const canopyParts = [];
  const canopyY = height * 0.5;
  const blobCount = 6;
  for (let i = 0; i < blobCount; i++) {
    const a = (i / blobCount) * Math.PI * 2;
    const r = 0.95 + rand() * 0.3;
    canopyParts.push(
      buildCanopyBlob(Math.cos(a) * r * 0.85, canopyY + height * 0.2 + (rand() - 0.5) * 0.35, Math.sin(a) * r * 0.85, 1.1 + rand() * 0.25, 0.95, LEAF_MANGO)
    );
  }
  canopyParts.push(buildCanopyBlob(0, canopyY + height * 0.34, 0, 1.25, 0.9, LEAF_MANGO));
  const mesh = new THREE.Mesh(mergeAndColor([trunkGeo, ...canopyParts]), null);
  mesh.name = 'tree_mango_mesh';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

/** Eucalyptus — the tall, slim, pale-barked row behind the school (Places V1 school reference). A straight light trunk and a narrow,
 * drooping blue-green crown made of stacked elongated clumps. */
const LEAF_EUCALYPTUS = new THREE.Color(0x5c7550);
export function buildEucalyptusTree(seed = 4) {
  const group = new THREE.Group();
  group.name = 'tree_eucalyptus';
  const rand = mulberry32(seed);
  const height = 8.2 + rand() * 1.6;
  const lean = (rand() - 0.5) * 0.06;
  const trunkGeo = buildTrunk(height * 0.8, 0.14, 0.07, 0xb9b3a2, lean);
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const y = height * (0.42 + 0.5 * t);
    const r = 0.95 - 0.45 * t + rand() * 0.15;
    parts.push(buildCanopyBlob((rand() - 0.5) * 0.3, y, (rand() - 0.5) * 0.3, r, 1.55, LEAF_EUCALYPTUS));
  }
  const mesh = new THREE.Mesh(mergeAndColor([trunkGeo, ...parts]), null);
  mesh.name = 'tree_eucalyptus_mesh';
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

const BUILDERS = { neem: buildNeemTree, peepal: buildPeepalTree, babool: buildBaboolTree, mango: buildMangoTree, eucalyptus: buildEucalyptusTree };

/** Places a handful of real-location trees — `placements`:
 * [{ kind: 'neem'|'peepal'|'babool'|'mango', x, z, rotationY, seed }]. One shared
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

/** Alpha-cut leaf-sprig texture (white leaves so per-vertex colour tints them). */
function makeLeafTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const rand = mulberry32(77);
  for (let i = 0; i < 16; i++) {
    const x = 14 + rand() * 100, y = 14 + rand() * 100, a = rand() * Math.PI;
    const l = 15 + rand() * 9, w = 4.5 + rand() * 2.5;
    const v = Math.floor(205 + rand() * 50);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath();
    g.ellipse(x, y, l, w, a, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(120,120,120,1)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

let LEAF_MATERIAL = null;
function leafMaterial() {
  if (!LEAF_MATERIAL) {
    LEAF_MATERIAL = new THREE.MeshStandardMaterial({ map: makeLeafTexture(), vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
    LEAF_MATERIAL.name = 'tree_leaf_cards';
  }
  return LEAF_MATERIAL;
}

/** Scatter alpha-cut leaf cards over a tree's canopy surface (vertices that are green, not bark). */
function buildLeafCards(geo, seed) {
  const pos = geo.attributes.position, col = geo.attributes.color, nor = geo.attributes.normal;
  const rand = mulberry32(seed * 31 + 5);
  const P = [], U = [], C = [], I = [];
  const n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let q = 0;
  for (let i = 0; i < pos.count; i += 16) {
    const r = col.getX(i), g = col.getY(i), b = col.getZ(i);
    if (g < r * 1.05) continue; // bark
    n.set(nor.getX(i), nor.getY(i), nor.getZ(i)).normalize();
    n.y = n.y * 0.6 + 0.25; n.normalize(); // lean cards up so they catch the sun
    t1.crossVectors(n, up);
    if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0);
    t1.normalize();
    t2.crossVectors(n, t1).normalize();
    const ang = rand() * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
    const ax = t1.clone().multiplyScalar(ca).addScaledVector(t2, sa);
    const ay = t2.clone().multiplyScalar(ca).addScaledVector(t1, -sa);
    const s = 0.38 + rand() * 0.22;
    const cx = pos.getX(i) + n.x * 0.06, cy = pos.getY(i) + n.y * 0.06, cz = pos.getZ(i) + n.z * 0.06;
    const k = 0.85 + rand() * 0.35;
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      P.push(cx + (ax.x * u + ay.x * v) * s, cy + (ax.y * u + ay.y * v) * s, cz + (ax.z * u + ay.z * v) * s);
      U.push((u + 1) / 2, (v + 1) / 2);
      C.push(Math.min(1, r * k * 1.15), Math.min(1, g * k * 1.15), Math.min(1, b * k));
    }
    I.push(q, q + 1, q + 2, q, q + 2, q + 3);
    q += 4;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  out.setIndex(I);
  out.computeVertexNormals();
  return out;
}

export function buildTrees(placements) {
  const material = TREE_MATERIAL;
  const group = new THREE.Group();
  group.name = 'trees';
  for (const p of placements) {
    const builder = BUILDERS[p.kind];
    if (!builder) continue;
    const tree = builder(p.seed ?? 0);
    tree.children[0].material = material;
    const cards = new THREE.Mesh(buildLeafCards(tree.children[0].geometry, p.seed ?? 0), leafMaterial());
    cards.name = 'tree_leaf_cards';
    cards.castShadow = true;
    cards.receiveShadow = true;
    tree.add(cards);
    tree.position.set(p.x, p.y ?? 0, p.z);
    tree.rotation.y = p.rotationY || 0;
    if (p.scale) tree.scale.setScalar(p.scale); // e.g. the small neem in the house courtyard's brick planter
    group.add(tree);
  }
  return group;
}
