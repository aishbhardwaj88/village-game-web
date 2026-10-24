import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE, darken } from './village.js';
import { addPlantInstances } from './realPlants.js';

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

/** Water and tank footprints no plant may stand in (hauz, pond, johad, canal channel). Circles {x,z,r} or canal-style z-bands {zMin,zMax,xMin,xMax}. */
export const VEG_KEEP_OUT = [
  { x: -36.1, z: -7.6, r: 3.0 }, // tubewell hauz + its outlet naali start
  { x: -34.2, z: -3.8, r: 2.6 }, // tubewell outlet channel
  { x: -132, z: 70, r: 11 }, // pond
  { x: 78, z: 105, r: 8 }, // johad
  { zMin: 29.5, zMax: 36.5, xMin: -28, xMax: 0 }, // canal water + banks
  { zMin: 96.5, zMax: 115.5, xMin: -65.5, xMax: -58.5 }, // school classroom (SCHOOL_ROOM in village.js): grass was sprouting through its floor
];
/** Every lane stretch passed to lanesideClusters: its kerb + open drain band (half width + 0.8 m) is also a keep-out, so no tuft grows in a nali or on a kerb. */
const LANE_BANDS = [];
const DRAIN_CLEARANCE = 0.8;
function inLaneBand(x, z) {
  for (const l of LANE_BANDS) {
    const t = ((x - l.ax) * l.ux + (z - l.az) * l.uz);
    if (t < 0 || t > l.len) continue;
    if (Math.abs((x - l.ax) * -l.uz + (z - l.az) * l.ux) < l.half + DRAIN_CLEARANCE) return true;
  }
  return false;
}
export function inKeepOut(x, z) {
  return inLaneBand(x, z) || VEG_KEEP_OUT.some((k) => (k.r !== undefined ? Math.hypot(x - k.x, z - k.z) < k.r : x > k.xMin && x < k.xMax && z > k.zMin && z < k.zMax));
}

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
      const x = a.x + Math.cos(ang) * r + (Math.random() - 0.5) * perInstanceJitter;
      const z = a.z + Math.sin(ang) * r + (Math.random() - 0.5) * perInstanceJitter;
      if (inKeepOut(x, z)) continue;
      positions.push({ x, z });
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
  LANE_BANDS.push({ ax: start.x, az: start.z, ux: dirX, uz: dirZ, len: length, half: laneWidth / 2 });

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

  // Real Poly Haven scans (src/realPlants.js), thinned to ~40% of the old card count: grass only where it would grow
  // (the keep-outs already exclude drains, kerbs, canal, floors) and in small clumps, not a carpet.
  const thin = (anchors, f) => anchors.map((a) => ({ ...a, count: Math.max(1, Math.round(a.count * f)) }));
  const tuftPositions = buildClusterPositions(thin(tuftAnchors, 0.4), 0.35);
  addPlantInstances(group, 'grass_medium_02', 0.5, tuftPositions.map((p) => ({ ...p, scale: 0.9 + Math.random() * 0.5 })), { seed: 3, tint: 0.25, radius: 28 });

  const scrubPositions = buildClusterPositions(thin(scrubAnchors, 0.5), 0.5);
  const half = Math.ceil(scrubPositions.length / 2);
  addPlantInstances(group, 'shrub_01', 0.55, scrubPositions.slice(0, half).map((p) => ({ ...p, scale: 0.9 + Math.random() * 0.6 })), { seed: 5, radius: 36 });
  return group;
}

// ---------------------------------------------------------------------------
// Garden plants (A3 low vegetation): marigold beds, banana clumps, tulsi and
// bougainvillea as alpha-cut crossed cards from ONE 4-cell atlas, so every
// kind shares a single material and a single draw call (cell chosen per
// instance through an instanced attribute, no extra meshes).
// ---------------------------------------------------------------------------
export const GARDEN_KIND = { MARIGOLD: 0, BANANA: 1, TULSI: 2, BOUGAINVILLEA: 3, CREEPER: 4 };
/**
 * `plants`: [{x, z, y?, kind: GARDEN_KIND.*, scale?}] -> Group (always a Group, possibly empty).
 * Only kinds that have a real scanned model are drawn: MARIGOLD -> Poly Haven "Flower Gazania" (orange-yellow daisy beds).
 * TULSI, BANANA, BOUGAINVILLEA and CREEPER used to be crossed alpha cards ("a poorly cut 2D image", the creeper glowed lime) and are
 * now NOT drawn at all until real models exist: an unconvincing plant is worse than none (art director, 24 Oct). One draw call.
 */
export function buildGardenPlants(plants) {
  const group = new THREE.Group();
  group.name = 'flowering_plants';
  const beds = plants.filter((p) => p.kind === GARDEN_KIND.MARIGOLD && !inKeepOut(p.x, p.z));
  addPlantInstances(group, 'flower_gazania', 0.4, beds.map((p) => ({ x: p.x, z: p.z, y: p.y ?? 0, scale: (p.scale ?? 1) * 1.15 })), { seed: 11, tint: 0.2, radius: 38 });
  return group;
}
