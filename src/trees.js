import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTiledMaterial } from './materials.js';

/**
 * Queue item 2 — procedural trees. No CC0 foliage cutout texture was ever found (see
 * docs/parked.md, 2026-09-15) so this draws the leaf-cluster alpha texture on a
 * canvas instead of downloading anything: irregular soft-edged blobs of varied green,
 * radial-gradient alpha so the cutout silhouette is ragged rather than a hard circle,
 * a few punched-out gaps so it doesn't read as one solid mass. Each tree is a cross of
 * 3 leaf arms (6 single-sided planes, a front/back pair per arm — see
 * buildLeafCrossGeometry's own comment for why not 3 double-sided ones) with
 * "spherical" normals (applySphericalNormals) so the canopy shades like a soft volume
 * instead of flat lit panels — see docs/parked.md for how that was actually found,
 * the first two theories tried were wrong — plus a tapered trunk textured with the
 * existing 'wood' set (tinted bark-brown) since no dedicated bark texture exists
 * either and none was worth a download for this. Both trunk and leaves are one
 * InstancedMesh per species (3 species x 2 = 6 draw calls total, for however many
 * individual trees are scattered).
 */

function drawSoftBlob(ctx, x, y, r, hue, sat, light, alpha) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`);
  grad.addColorStop(0.65, `hsla(${hue}, ${sat}%, ${light}%, ${alpha * 0.7})`);
  grad.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Bakes one leaf-cluster canopy texture. `hue` (0-360) + `satRange`/`lightRange` set
 * the species' overall colour character (neem: pale fine green; peepal: yellow-green;
 * mango: deep dense green) — see SPECIES below. */
function generateLeafTexture({ hue, satRange, lightRange, size = 512, density = 850 }) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size * 0.54;
  const maxR = size * 0.44;

  for (let i = 0; i < density; i++) {
    const angle = Math.random() * Math.PI * 2;
    // sqrt-biased radius keeps density roughly even across the disc instead of
    // clumping at the centre, with a touch of extra spread so the edge is ragged.
    const dist = Math.sqrt(Math.random()) * maxR * (0.8 + Math.random() * 0.35);
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const r = 7 + Math.random() * 20;
    const h = hue + (Math.random() - 0.5) * 20;
    const s = satRange[0] + Math.random() * (satRange[1] - satRange[0]);
    const l = lightRange[0] + Math.random() * (lightRange[1] - lightRange[0]);
    drawSoftBlob(ctx, x, y, r, h, s, l, 0.55 + Math.random() * 0.35);
  }

  // Punch a handful of fully-transparent gaps through — breaks up "one solid green
  // disc" into something with real depth/irregularity when alpha-tested.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < density * 0.05; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * maxR * 0.85;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const r = 5 + Math.random() * 16;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** One tree's worth of geometry — 3 cross-planes (60° apart) sized to the species'
 * canopy width/height, merged into a single geometry so a whole species can be one
 * InstancedMesh regardless of how many trees use it. */
function buildLeafCrossGeometry(canopyWidth, canopyHeight, canopyBaseY) {
  // Attempt 1 (see docs/parked.md): a single THREE.DoubleSide plane per cross arm.
  // From most angles one plane is seen edge-on while its neighbour is seen face-on —
  // three.js flips the surface normal for whichever face is pointing away from the
  // camera so it still lights *as if* facing the camera, and that flipped normal
  // sometimes catches the sun more directly than the genuinely-front-facing neighbour
  // beside it, producing a visible brighter/flatter-coloured stripe right at the seam.
  // Building each arm as two single-sided planes, back to back, gives every triangle
  // a real, never-flipped normal matching its true facing direction instead — same
  // "solid from any angle" silhouette, no lighting seam. A small hub offset (~7% of
  // canopy width) also keeps the two backs from ever sharing the exact same depth.
  const hubOffset = canopyWidth * 0.07;
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI) / 3; // 0°, 60°, 120° — 3 arms span a full cross apart

    const front = new THREE.PlaneGeometry(canopyWidth, canopyHeight);
    front.translate(0, canopyBaseY + canopyHeight / 2, hubOffset);
    front.rotateY(angle);
    parts.push(front);

    const back = new THREE.PlaneGeometry(canopyWidth, canopyHeight);
    back.translate(0, canopyBaseY + canopyHeight / 2, hubOffset);
    back.rotateY(Math.PI); // face the opposite way — ends up at -hubOffset, normal flipped for real
    back.rotateY(angle);
    parts.push(back);
  }
  const merged = mergeGeometries(parts);
  applySphericalNormals(merged, { x: 0, y: canopyBaseY + canopyHeight / 2, z: 0 });
  return merged;
}

const _normalDir = new THREE.Vector3();

/**
 * Attempts 1-2 (see docs/parked.md) were chasing the wrong cause: the visible seams
 * between cross-plane arms aren't a lighting bug, they're *correct* — each plane is
 * genuinely flat and really does face a different direction, so real directional
 * sunlight really does light each one a different, uniform flat shade. That reads as
 * exactly the "flat cards" failure this item warned about. The actual fix (a standard
 * one for billboard/cross-plane foliage): replace each vertex's normal with the
 * direction from the canopy's own centre out to that vertex, as if the canopy were a
 * rough sphere. Lighting then varies smoothly across each leaf plane instead of being
 * one flat value per plane, so the whole canopy shades like a soft volume.
 */
function applySphericalNormals(geometry, center) {
  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    _normalDir.set(pos.getX(i) - center.x, pos.getY(i) - center.y, pos.getZ(i) - center.z).normalize();
    normal.setXYZ(i, _normalDir.x, _normalDir.y, _normalDir.z);
  }
  normal.needsUpdate = true;
}

function buildTrunkGeometry(trunkHeight, baseRadius, topRadius) {
  const geo = new THREE.CylinderGeometry(topRadius, baseRadius, trunkHeight, 6);
  geo.translate(0, trunkHeight / 2, 0);
  return geo;
}

const SPECIES = {
  neem: {
    // Broad, low canopy — the widest of the three, not the tallest.
    trunkHeight: 3.6,
    baseRadius: 0.22,
    topRadius: 0.12,
    canopyWidth: 6.2,
    canopyHeight: 3.4,
    canopyBaseY: 2.6,
    leaf: { hue: 102, satRange: [30, 45], lightRange: [34, 48] }, // pale, fine green
  },
  peepal: {
    // Tall and narrower — a real peepal reads as a vertical mass, not a mushroom.
    trunkHeight: 5.6,
    baseRadius: 0.28,
    topRadius: 0.14,
    canopyWidth: 5.0,
    canopyHeight: 6.2,
    canopyBaseY: 4.6,
    leaf: { hue: 92, satRange: [28, 42], lightRange: [30, 42] }, // yellow-green
  },
  mango: {
    // Rounded and dense — shortest trunk, roughly equal canopy width/height.
    trunkHeight: 3.0,
    baseRadius: 0.24,
    topRadius: 0.14,
    canopyWidth: 5.6,
    canopyHeight: 5.2,
    canopyBaseY: 2.2,
    leaf: { hue: 128, satRange: [32, 48], lightRange: [22, 34] }, // deep, dense green
  },
};

const BARK_TINT = 0x6b5a44;

/**
 * Hand-picked clusters near the hero zone (house/halwai/school/shops — for the 5m/20m
 * distance judging) and the background houses, plus two jittered rows along the
 * field's north and west edges (outside the track loop, corners (-40,25)/(80,25)/
 * (80,-65)/(-40,-65) — see src/field.js) so there's something to silhouette-check
 * "from across the field." A tiny seeded PRNG (not Math.random()) keeps the field
 * rows stable between rebuilds, same reasoning as src/materials.js's wall jitter.
 */
export function defaultTreePlacements() {
  const placements = [];

  // Close cluster near the house/lane — 5-20m judging distance.
  placements.push(
    { species: 'neem', x: -60, z: 33, scale: 1.05, rotationY: 0.4 },
    { species: 'peepal', x: -58, z: 44, scale: 0.95, rotationY: 1.8 },
    { species: 'mango', x: -62, z: 39, scale: 1.1, rotationY: 2.6 }
  );
  // Halwai/shops corner.
  placements.push({ species: 'mango', x: -28, z: 66, scale: 1.0, rotationY: 1.1 }, { species: 'neem', x: -24, z: 84, scale: 0.9, rotationY: 3.0 });
  // School perimeter.
  placements.push(
    { species: 'peepal', x: -70, z: 98, scale: 1.15, rotationY: 0.7 },
    { species: 'neem', x: -28, z: 112, scale: 1.0, rotationY: 2.1 },
    { species: 'mango', x: -68, z: 116, scale: 0.95, rotationY: 4.0 }
  );
  // Background houses — echoes the existing "village doesn't end abruptly" reasoning
  // (src/scenery.js).
  placements.push(
    { species: 'neem', x: -122, z: 12, scale: 1.0, rotationY: 0.2 },
    { species: 'mango', x: -108, z: 20, scale: 0.9, rotationY: 2.4 },
    { species: 'peepal', x: 32, z: 132, scale: 1.05, rotationY: 1.0 },
    { species: 'neem', x: 18, z: 124, scale: 0.95, rotationY: 3.3 },
    { species: 'mango', x: -102, z: 170, scale: 1.0, rotationY: 1.6 }
  );

  const species3 = ['neem', 'peepal', 'mango'];
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  // North edge (toward the lane), just outside the track's z=25 boundary.
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const x = -38 + t * 116 + (rand() - 0.5) * 8;
    const z = 30 + (rand() - 0.5) * 6;
    placements.push({ species: species3[i % 3], x, z, scale: 0.85 + rand() * 0.4, rotationY: rand() * Math.PI * 2 });
  }
  // West edge, clear of the 5m-wide track (centred x=-40, so its own edge is ~x=-42.5).
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const x = -46 + (rand() - 0.5) * 4;
    const z = 22 - t * 84 + (rand() - 0.5) * 8;
    placements.push({ species: species3[(i + 1) % 3], x, z, scale: 0.85 + rand() * 0.4, rotationY: rand() * Math.PI * 2 });
  }

  return placements;
}

/** Builds every species' 2 InstancedMeshes (trunk, leaves) and scatters `placements`
 * (an array of {species, x, z, scale, rotationY}) across them. Returns the group to
 * add to the scene, plus a flat list of {x, z, radius} for trunk collision. */
export function buildTrees(placements) {
  const group = new THREE.Group();
  group.name = 'trees';
  const colliders = [];

  const bySpecies = new Map();
  for (const p of placements) {
    if (!bySpecies.has(p.species)) bySpecies.set(p.species, []);
    bySpecies.get(p.species).push(p);
  }

  for (const [speciesName, spec] of Object.entries(SPECIES)) {
    const instances = bySpecies.get(speciesName) || [];
    if (instances.length === 0) continue;

    const trunkGeo = buildTrunkGeometry(spec.trunkHeight, spec.baseRadius, spec.topRadius);
    const trunkMat = getTiledMaterial('wood', { repeatX: 1, repeatY: 2, tint: BARK_TINT, roughness: 1 });
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, instances.length);
    trunkMesh.name = `tree_${speciesName}_trunk`;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;

    const leafGeo = buildLeafCrossGeometry(spec.canopyWidth, spec.canopyHeight, spec.canopyBaseY);
    const leafTexture = generateLeafTexture(spec.leaf);
    const leafMat = new THREE.MeshStandardMaterial({
      map: leafTexture,
      alphaTest: 0.4,
      // FrontSide, not DoubleSide — buildLeafCrossGeometry() now builds 6 genuinely
      // single-facing planes (a front/back pair per arm) instead of 3 double-sided
      // ones, so whichever half-planes face away from the camera at any angle are
      // simply culled rather than flip-lit; there's always a complete front-facing
      // shell left over. DoubleSide would still trigger the flip-lighting this was
      // built to avoid, just on fewer surfaces. See buildLeafCrossGeometry's comment.
      side: THREE.FrontSide,
      roughness: 0.95,
      // A little fill light so shadow-side foliage doesn't read flat-black — same
      // spirit as the scene's own HemisphereLight fill (src/main.js), just cheap and
      // local to this material instead.
      emissive: new THREE.Color(0x1c2410),
      emissiveIntensity: 0.35,
    });
    const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, instances.length);
    leafMesh.name = `tree_${speciesName}_leaves`;
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = false;

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scaleV = new THREE.Vector3();
    for (let i = 0; i < instances.length; i++) {
      const p = instances[i];
      const scale = p.scale ?? 1;
      pos.set(p.x, 0, p.z);
      euler.set(0, p.rotationY ?? 0, 0);
      quat.setFromEuler(euler);
      scaleV.setScalar(scale);
      m.compose(pos, quat, scaleV);
      trunkMesh.setMatrixAt(i, m);
      leafMesh.setMatrixAt(i, m);
      colliders.push({ x: p.x, z: p.z, radius: spec.baseRadius * scale });
    }
    trunkMesh.instanceMatrix.needsUpdate = true;
    leafMesh.instanceMatrix.needsUpdate = true;

    group.add(trunkMesh);
    group.add(leafMesh);
  }

  return { group, colliders };
}
