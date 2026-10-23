import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE, darken } from './village.js';

/**
 * Item 3b (real playtest report — "the village reads as desert", no vegetation
 * anywhere) — low ground vegetation, code-built only (no new texture/model
 * assets, no Tripo): grass tufts and scrub bushes, each one kind = one
 * InstancedMesh = one draw call regardless of how many instances, same pattern
 * src/bazaarLife.js already uses for repeated NPCs. Placed in CLUSTERS (never
 * an even scatter — see buildClusterPositions below), at real anchor points the
 * caller (main.js) derives from real lane-waypoint/building-position constants,
 * not invented coordinates.
 *
 * Both "kinds" are the same construction technique (a merged handful of thin,
 * slightly irregular blade/branch shapes, vertex-coloured, no texture) at a
 * different scale/colour balance — a grass tuft reads as mostly green blades, a
 * scrub bush as a sparser, woodier little shape with less green showing. Both
 * stay inside the fixed palette (`PALETTE.greyGreen`, already the driest/most
 * desaturated green in the palette, and `PALETTE.woodTrim` for twig/stem
 * colour) — never a new, more saturated "grass green" invented for this.
 */

// Bugfix: PALETTE.greyGreen used at full/near-full value (see src/trees.js's
// matching comment) washed out to near-white/cream under this scene's warm
// sun + ACES tone mapping — confirmed via tools/village-greenery-shots.mjs's
// bazaar_lane shot (tufts read as pale straw-grey, barely visible as
// "vegetation"). Darkened versions of the same hue read as grass instead.
const GRASS_GREEN = new THREE.Color(darken(PALETTE.greyGreen, 0.55));
const GRASS_GREEN_DARK = new THREE.Color(darken(PALETTE.greyGreen, 0.4));
const GRASS_GREEN_DRY = new THREE.Color(darken(PALETTE.greyGreen, 0.6)).lerp(new THREE.Color(PALETTE.mustard), 0.3); // a few blades gone straw-dry
const TWIG_COLOR = new THREE.Color(darken(PALETTE.woodTrim, 0.8));

/** A handful of thin, slightly bent blade shapes radiating from a common base —
 * the one repeated unit both tuft and scrub are built from, at different
 * counts/scale/lean. */
function buildBladeClusterGeometry({ bladeCount, height, width, spread, leanMax, includeTwigs }) {
  const parts = [];
  for (let i = 0; i < bladeCount; i++) {
    const h = height * (0.75 + 0.5 * Math.random());
    const geo = new THREE.BoxGeometry(width, h, width * 0.6);
    geo.translate(0, h / 2, 0); // pivot at the base, not the centre
    const lean = (Math.random() - 0.5) * leanMax;
    geo.rotateZ(lean);
    geo.rotateY(Math.random() * Math.PI * 2);
    const r = Math.random() * spread;
    const a = Math.random() * Math.PI * 2;
    geo.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
    parts.push(geo);
  }
  if (includeTwigs) {
    // A couple of thicker, shorter, darker woody stems peeking through — scrub
    // reads as a plant with structure, not just a denser tuft.
    for (let i = 0; i < 2; i++) {
      const h = height * 0.5;
      const geo = new THREE.BoxGeometry(width * 1.8, h, width * 1.8);
      geo.translate(0, h / 2, 0);
      geo.rotateZ((Math.random() - 0.5) * 0.3);
      const r = Math.random() * spread * 0.5;
      const a = Math.random() * Math.PI * 2;
      geo.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
      geo.userData = { twig: true };
      parts.push(geo);
    }
  }
  return parts;
}

function paintClusterColors(geometry, parts, colors) {
  const count = geometry.attributes.position.count;
  const colorArray = new Float32Array(count * 3);
  let vertOffset = 0;
  for (const part of parts) {
    const c = part.userData.twig ? TWIG_COLOR : colors[Math.floor(Math.random() * colors.length)];
    const n = part.attributes.position.count;
    for (let i = 0; i < n; i++) {
      colorArray[(vertOffset + i) * 3] = c.r;
      colorArray[(vertOffset + i) * 3 + 1] = c.g;
      colorArray[(vertOffset + i) * 3 + 2] = c.b;
    }
    vertOffset += n;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
}

/** Alpha-cut grass/scrub card texture: curved tapering blades, dark base to sunlit tip, a few
 * straw-dry ones. `kind` 'tuft' = fine green grass, 'scrub' = coarser, drier, woodier. */
function makeGrassTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  let a = kind === 'tuft' ? 4242 : 9191;
  const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const blades = kind === 'tuft' ? 22 : 15;
  for (let i = 0; i < blades; i++) {
    const bx = 128 + (r() - 0.5) * (kind === 'tuft' ? 150 : 110);
    const h = (kind === 'tuft' ? 110 : 150) + r() * (kind === 'tuft' ? 120 : 90);
    const w = (kind === 'tuft' ? 5 : 8) + r() * 3;
    const bend = (r() - 0.5) * (kind === 'tuft' ? 90 : 60);
    const dry = r() < (kind === 'tuft' ? 0.06 : 0.3);
    const grad = g.createLinearGradient(0, 252, 0, 252 - h);
    if (dry) { grad.addColorStop(0, '#5e5a30'); grad.addColorStop(1, '#a89a5a'); }
    else if (kind === 'tuft') { grad.addColorStop(0, '#223a1a'); grad.addColorStop(1, '#5f8a3a'); }
    else { grad.addColorStop(0, '#2c3e1e'); grad.addColorStop(1, '#6a8038'); }
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(bx - w, 254);
    g.quadraticCurveTo(bx - w * 0.6 + bend * 0.3, 254 - h * 0.55, bx + bend, 254 - h);
    g.quadraticCurveTo(bx + w * 0.6 + bend * 0.3, 254 - h * 0.55, bx + w, 254);
    g.closePath();
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Three crossed vertical cards, bottom edge on the ground. */
function buildCardGeometry(width, height) {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(width, height);
    geo.translate(0, height / 2, 0);
    geo.rotateY((i * Math.PI) / 3 + 0.3);
    parts.push(geo);
  }
  return mergeGeometries(parts);
}

function buildTuftGeometry() { return buildCardGeometry(0.55, 0.48); }
function buildScrubGeometry() { return buildCardGeometry(0.95, 0.8); }

/** Jittered points inside clusters around each anchor — "cluster them, never
 * scatter evenly" (item 3b's own rule). `anchors`: [{x,z,count,radius}]. */
function buildClusterPositions(anchors, perInstanceJitter) {
  const positions = [];
  for (const a of anchors) {
    const n = a.count;
    for (let i = 0; i < n; i++) {
      // Points biased toward the anchor centre (sqrt of a uniform radius sample
      // would be a uniform-density disc; skipping the sqrt biases toward the
      // middle, which reads as a real clump with a denser core and strays at
      // the edge, not a uniform-density disc of grass).
      const r = Math.random() * a.radius;
      const ang = Math.random() * Math.PI * 2;
      positions.push({
        x: a.x + Math.cos(ang) * r + (Math.random() - 0.5) * perInstanceJitter,
        z: a.z + Math.sin(ang) * r + (Math.random() - 0.5) * perInstanceJitter,
      });
    }
  }
  return positions;
}

function buildInstancedKind(geometry, positions, { scaleMin, scaleMax, map = null }) {
  const material = map
    ? new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
  mesh.castShadow = false; // thin blades casting a 2048 shadow map's worth of shadow acne isn't worth the cost for a placeholder
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const scale = scaleMin + Math.random() * (scaleMax - scaleMin);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    s.set(scale, scale, scale);
    m.compose(new THREE.Vector3(p.x, 0, p.z), q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

const WHITE = new THREE.Color(0xffffff);

/**
 * Step E (2026-10-20, art director — "a few flowering plants: marigold,
 * bougainvillea on walls") — same blade-cluster technique as tuft/scrub, but the
 * geometry is baked in plain WHITE (not green) so InstancedMesh.setColorAt can
 * supply the REAL colour per instance cleanly (vertexColor * instanceColor, and
 * white multiplies as a no-op) instead of muddying a green bake with an orange/
 * pink tint multiplied on top. `positions` entries may carry their own `color`
 * (a hex int); entries without one fall back to `defaultColors` (randomly
 * chosen), same spirit as paintClusterColors above.
 */
function buildFlowerGeometry() {
  const parts = buildBladeClusterGeometry({ bladeCount: 7, height: 0.26, width: 0.05, spread: 0.1, leanMax: 0.3, includeTwigs: false });
  const geo = mergeGeometries(parts);
  bakeFlatColor(geo, WHITE);
  return geo;
}

function bakeFlatColor(geometry, color) {
  const count = geometry.attributes.position.count;
  const colorArray = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colorArray[i * 3] = color.r;
    colorArray[i * 3 + 1] = color.g;
    colorArray[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
}

/** `positions`: [{x, z, color}] — color is a hex int (e.g. PALETTE.marigold). */
export function buildFlowerPatches(positions) {
  if (!positions.length) return null;
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const mesh = new THREE.InstancedMesh(buildFlowerGeometry(), material, positions.length);
  mesh.name = 'flowering_plants';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const scale = 0.85 + Math.random() * 0.45;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
    s.set(scale, scale, scale);
    m.compose(new THREE.Vector3(p.x, p.y ?? 0, p.z), q, s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.setHex(p.color));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** Cluster anchors along BOTH edges of a real lane segment (the same
 * start/end/width every lane is actually built from, src/paths.js's
 * buildStripSegment) — offset outward from the lane's own half-width plus a
 * clear margin, so a cluster can never land ON the lane itself (item 3b's own
 * rule). One cluster roughly every `everyMetres`, alternating/both sides. */
export function lanesideClusters(start, end, laneWidth, { everyMetres = 7, margin = 1.2, radius = 1.3, count = 5 } = {}) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.001) return [];
  const dirX = dx / length;
  const dirZ = dz / length;
  // Perpendicular (rotate direction 90°).
  const perpX = -dirZ;
  const perpZ = dirX;
  const sideOffset = laneWidth / 2 + margin;

  const anchors = [];
  const steps = Math.max(1, Math.round(length / everyMetres));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Keep clear of the very ends (junctions/arrival points, often close to a
    // building wall or another lane) — only cluster the middle 80% of each
    // segment.
    if (t < 0.1 || t > 0.9) continue;
    const cx = start.x + dirX * length * t;
    const cz = start.z + dirZ * length * t;
    for (const side of [1, -1]) {
      anchors.push({
        x: cx + perpX * sideOffset * side,
        z: cz + perpZ * sideOffset * side,
        radius,
        count,
      });
    }
  }
  return anchors;
}

/**
 * Builds the two vegetation InstancedMeshes from real cluster anchors.
 * `tuftAnchors`/`scrubAnchors`: [{x, z, radius, count}] — radius is the
 * cluster's own footprint (metres), count how many blade-units land inside it.
 * Returns a Group with both meshes (named, for contactShadows/camera-obstacle
 * lists to find or skip as needed) so main.js adds/positions one object.
 */
export function buildVegetation(tuftAnchors, scrubAnchors) {
  const group = new THREE.Group();
  group.name = 'vegetation';

  const tuftPositions = buildClusterPositions(tuftAnchors, 0.35);
  const tuftMesh = buildInstancedKind(buildTuftGeometry(), tuftPositions, { scaleMin: 0.8, scaleMax: 1.3, map: makeGrassTexture('tuft') });
  tuftMesh.name = 'grass_tufts';
  group.add(tuftMesh);

  const scrubPositions = buildClusterPositions(scrubAnchors, 0.5);
  const scrubMesh = buildInstancedKind(buildScrubGeometry(), scrubPositions, { scaleMin: 0.85, scaleMax: 1.25, map: makeGrassTexture('scrub') });
  scrubMesh.name = 'scrub_bushes';
  group.add(scrubMesh);

  return group;
}

// ---------------------------------------------------------------------------
// Garden plants (A3 low vegetation): marigold beds, banana clumps, tulsi and
// bougainvillea as alpha-cut crossed cards from ONE 4-cell atlas, so every
// kind shares a single material and a single draw call (cell chosen per
// instance through an instanced attribute, no extra meshes).
// ---------------------------------------------------------------------------
export const GARDEN_KIND = { MARIGOLD: 0, BANANA: 1, TULSI: 2, BOUGAINVILLEA: 3, CREEPER: 4 };
const GARDEN_SIZE = [
  [1.1, 0.55], // marigold bed: wide, low
  [2.6, 3.0], // banana clump: tall arching leaves
  [0.6, 0.7], // tulsi bush
  [1.5, 1.3], // bougainvillea mass
  [1.5, 3.0], // wall creeper: money-plant curtain climbing a wall
];

function makeGardenAtlas() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S * 5;
  c.height = S;
  const g = c.getContext('2d');
  let a = 7311;
  const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const leaf = (x, y, len, wid, ang, c0, c1) => {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    const grad = g.createLinearGradient(0, 0, 0, -len);
    grad.addColorStop(0, c0);
    grad.addColorStop(1, c1);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(wid, -len * 0.5, 0, -len);
    g.quadraticCurveTo(-wid, -len * 0.5, 0, 0);
    g.fill();
    g.restore();
  };
  const blob = (x, y, rad, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); };

  // 0: marigold bed - dusty green serrated foliage, orange and yellow pompoms
  g.save(); g.translate(0, 0);
  for (let i = 0; i < 26; i++) leaf(128 + (r() - 0.5) * 190, 250, 70 + r() * 70, 9 + r() * 6, (r() - 0.5) * 1.3, '#26391a', '#506a2c');
  for (let i = 0; i < 34; i++) {
    const x = 128 + (r() - 0.5) * 200, y = 250 - 50 - r() * 110;
    const col = r() < 0.6 ? '#d9791a' : '#e8b422';
    blob(x, y, 11 + r() * 5, col);
    blob(x - 2, y - 2, 6, r() < 0.5 ? '#f0a030' : '#f2cc44');
  }
  g.restore();

  // 1: banana clump - big arching leaves, pale midrib, a hanging dark pseudo-stem
  g.save(); g.translate(S, 0);
  g.fillStyle = '#4a5a2a'; g.fillRect(118, 150, 20, 106);
  for (let i = 0; i < 9; i++) {
    const ang = -1.25 + (i / 8) * 2.5 + (r() - 0.5) * 0.2;
    leaf(128, 160, 150 + r() * 70, 26 + r() * 10, ang, '#2b4a1c', i % 3 === 0 ? '#7f9a3e' : '#5d8230');
  }
  g.strokeStyle = '#a9b86a'; g.lineWidth = 2;
  for (let i = 0; i < 5; i++) { const ang = -1 + i * 0.5; g.beginPath(); g.moveTo(128, 160); g.lineTo(128 + Math.sin(ang) * 120, 160 - Math.cos(ang) * 120); g.stroke(); }
  g.restore();

  // 2: tulsi - dense small bush, darker green, pale purple flower spikes
  g.save(); g.translate(S * 2, 0);
  for (let i = 0; i < 40; i++) blob(128 + (r() - 0.5) * 150, 215 - r() * 120, 12 + r() * 8, r() < 0.5 ? '#2d4a22' : '#436a2e');
  for (let i = 0; i < 14; i++) { const x = 128 + (r() - 0.5) * 130, y = 100 - r() * 30 + 40; g.fillStyle = '#9a86b8'; g.fillRect(x, y - 24, 4, 24); }
  g.restore();

  // 3: bougainvillea - tangled green with magenta paper bracts
  g.save(); g.translate(S * 3, 0);
  for (let i = 0; i < 30; i++) blob(128 + (r() - 0.5) * 220, 240 - r() * 200, 12 + r() * 9, '#2e4a24');
  for (let i = 0; i < 70; i++) { const x = 128 + (r() - 0.5) * 230, y = 240 - r() * 210; blob(x, y, 5 + r() * 4, r() < 0.7 ? '#b6286a' : '#d4488a'); }
  g.restore();

  // 4: wall creeper - money-plant strands with heart-shaped leaves, rooted at the base
  g.save(); g.translate(S * 4, 0);
  g.strokeStyle = '#3a4a22'; g.lineWidth = 3;
  for (let i = 0; i < 11; i++) {
    let x = 128 + (r() - 0.5) * 190;
    g.beginPath(); g.moveTo(x, 256);
    for (let y = 256; y > 20 + r() * 60; y -= 18) { x += (r() - 0.5) * 22; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 190; i++) {
    const y = 250 - Math.pow(r(), 1.4) * 225;
    leaf(128 + (r() - 0.5) * 210 * (0.55 + (y / 256) * 0.45), y, 24 + r() * 14, 13 + r() * 6, (r() - 0.5) * 3, '#2a4620', r() < 0.3 ? '#8aa43e' : '#4f7a2e');
  }
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** `plants`: [{x, z, y?, kind: GARDEN_KIND.*, scale?}]. One InstancedMesh, one draw call. */
export function buildGardenPlants(plants) {
  if (!plants.length) return null;
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    geo.rotateY((i * Math.PI) / 3 + 0.3);
    parts.push(geo);
  }
  const geometry = mergeGeometries(parts);
  const cell = new Float32Array(plants.length);
  const material = new THREE.MeshStandardMaterial({ map: makeGardenAtlas(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCell;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vec2((vMapUv.x + aCell) * 0.2, vMapUv.y);\n#endif');
  };
  const mesh = new THREE.InstancedMesh(geometry, material, plants.length);
  mesh.name = 'flowering_plants';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  plants.forEach((p, i) => {
    const [w, h] = GARDEN_SIZE[p.kind];
    const k = (p.scale ?? 1) * (0.85 + Math.random() * 0.3);
    q.setFromAxisAngle(up, Math.random() * Math.PI * 2);
    s.set(w * k, h * k, w * k);
    m.compose(new THREE.Vector3(p.x, p.y ?? 0, p.z), q, s);
    mesh.setMatrixAt(i, m);
    cell[i] = p.kind;
  });
  geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 1));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
