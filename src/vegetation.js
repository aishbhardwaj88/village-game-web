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

function buildTuftGeometry() {
  const parts = buildBladeClusterGeometry({ bladeCount: 5, height: 0.32, width: 0.03, spread: 0.08, leanMax: 0.35, includeTwigs: false });
  const geo = mergeGeometries(parts);
  paintClusterColors(geo, parts, [GRASS_GREEN, GRASS_GREEN, GRASS_GREEN_DARK, GRASS_GREEN_DRY]);
  return geo;
}

function buildScrubGeometry() {
  const parts = buildBladeClusterGeometry({ bladeCount: 6, height: 0.55, width: 0.045, spread: 0.16, leanMax: 0.5, includeTwigs: true });
  const geo = mergeGeometries(parts);
  paintClusterColors(geo, parts, [GRASS_GREEN_DARK, GRASS_GREEN_DRY, GRASS_GREEN_DRY]);
  return geo;
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
      positions.push({
        x: a.x + Math.cos(ang) * r + (Math.random() - 0.5) * perInstanceJitter,
        z: a.z + Math.sin(ang) * r + (Math.random() - 0.5) * perInstanceJitter,
      });
    }
  }
  return positions;
}

function buildInstancedKind(geometry, positions, { scaleMin, scaleMax }) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
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
  const tuftMesh = buildInstancedKind(buildTuftGeometry(), tuftPositions, { scaleMin: 0.8, scaleMax: 1.3 });
  tuftMesh.name = 'grass_tufts';
  group.add(tuftMesh);

  const scrubPositions = buildClusterPositions(scrubAnchors, 0.5);
  const scrubMesh = buildInstancedKind(buildScrubGeometry(), scrubPositions, { scaleMin: 0.85, scaleMax: 1.25 });
  scrubMesh.name = 'scrub_bushes';
  group.add(scrubMesh);

  return group;
}
