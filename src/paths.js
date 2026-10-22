import * as THREE from 'three';
import { getTiledMaterial, ensureUv2 } from './materials.js';

/** Smooth, low-amplitude pseudo-noise (no dependency) so bumps read as gentle
 * undulation — enough for a vehicle to feel, not jagged geometry. */
export function bumpHeight(u, v, seed) {
  return (
    Math.sin(u * 7.3 + seed) * 0.03 +
    Math.sin(v * 5.1 + seed * 1.7) * 0.03 +
    Math.sin((u + v) * 11.0 + seed * 0.6) * 0.015
  );
}

const RUT_OFFSET = 1 / 3; // u is normalised -0.5..0.5 across the strip's width
const RUT_WIDTH = 0.05;
const RUT_DEPTH = 0.035;

/** Two shallow parallel wheel-track grooves, cheap to add on top of the general bumps
 * since the strip geometry already exists. */
function rutDepth(u) {
  const left = Math.exp(-(((u - RUT_OFFSET) / RUT_WIDTH) ** 2));
  const right = Math.exp(-(((u + RUT_OFFSET) / RUT_WIDTH) ** 2));
  return -RUT_DEPTH * (left + right);
}

/**
 * Cross-section of a lane edge: the strip rolls down into the surrounding ground,
 * with a shallow damp drain channel just inside the edge and a dusty berm beside it.
 * `au` is |u| (0 centre .. 0.5 edge); returns a height offset, a brightness multiplier
 * and a 0-1 blend toward grass colour. Distances are in metres from the lane edge.
 */
function edgeProfile(au, width) {
  const e = (0.5 - au) * width;
  const edgeFade = Math.max(0, 1 - e / 0.35);
  const drain = Math.exp(-(((e - 0.6) / 0.3) ** 2));
  const berm = Math.exp(-(((e - 1.0) / 0.3) ** 2));
  return {
    dz: -0.012 * edgeFade - 0.016 * drain + 0.012 * berm,
    shade: 1 - 0.35 * drain + 0.06 * berm,
    grass: 0.55 * edgeFade * edgeFade,
  };
}

/**
 * A straight dirt strip (lane or track segment) between two points, with gentle baked
 * height bumps. Reused by src/village.js (the lane) and src/field.js (the field
 * track loop) so both use the same construction and the same ground texture set at a
 * different tint/tiling from the open ground.
 */
export function buildStripSegment(start, end, width, { seed = 0, tint = 0xb7a179, ruts = false } = {}) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const segsAlong = Math.max(4, Math.round(length / 3));
  const segsAcross = Math.min(24, Math.max(12, Math.round(width * 3.5)));

  const geometry = new THREE.PlaneGeometry(width, length, segsAcross, segsAlong);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / width;
    const v = pos.getY(i) / length;
    let z = bumpHeight(u, v, seed);
    if (ruts) z += rutDepth(u);
    z += edgeProfile(Math.abs(u), width).dz;
    pos.setZ(i, z);
  }
  geometry.computeVertexNormals();
  // Bake the "lay flat" rotation into the geometry itself (local Y -> -Z, local
  // Z/bump -> Y/up), rather than applying it as a second runtime rotation.x
  // alongside rotation.y on the mesh. Two non-zero Euler components compose in a
  // fixed axis order (X, then Y, then Z here) that does NOT match "flatten, then
  // yaw" for an arbitrary yaw angle — that combination was rendering lane/track
  // segments with an inverted (downward) normal for some directions, reading as a
  // flat black strip. A single baked axis plus a single runtime rotation.y has no
  // such ambiguity. See docs/parked.md.
  geometry.rotateX(-Math.PI / 2);
  ensureUv2(geometry);

  // repeatY is baked into the UV (instead of passed to the material) and tint is
  // baked into a flat vertex colour (instead of material.color) — task 2 (draw-call
  // budget): every segment then requests the SAME cached 'lane' material regardless
  // of its own length or tint, so segments (with different tints even, e.g. the lane
  // vs the field track) can be merged into one draw call via src/mergeUtils.js.
  const repeat = Math.max(1, Math.round(length / 4));
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * repeat);
  }
  uv.needsUpdate = true;

  const colors = new Float32Array(pos.count * 3);
  const tintColor = new THREE.Color(tint);
  const grassColor = new THREE.Color(0x6f7a46);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / width;
    const v = pos.getY(i) / length;
    const { shade, grass } = edgeProfile(Math.abs(u), width);
    // slow patchy brightness along the lane + darker, polished wheel tracks
    let k = shade * (0.94 + 0.08 * Math.sin(v * 9.0 + seed * 2.3) + 0.04 * Math.sin(u * 13.0 + v * 4.0 + seed));
    if (ruts) k *= 1 - 0.14 * (Math.exp(-(((u - RUT_OFFSET) / 0.08) ** 2)) + Math.exp(-(((u + RUT_OFFSET) / 0.08) ** 2)));
    c.copy(tintColor).multiplyScalar(k).lerp(grassColor, grass);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Ground102 — a smooth, compressed/stamped dirt texture, distinct from the open
  // ground's Ground109 (looser, pebbly) and the courtyards' concrete — so lane and
  // track read as a different kind of surface, not just a different tint of the same
  // one. See docs/look-standard.md / docs/parked.md.
  const material = getTiledMaterial('lane', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });

  const mesh = new THREE.Mesh(geometry, material);
  const midX = (start.x + end.x) / 2;
  const midZ = (start.z + end.z) / 2;
  mesh.position.set(midX, 0.03, midZ);
  mesh.rotation.y = Math.atan2(-dx, -dz);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

/**
 * A raised cement kerb along both edges of a lane stretch (t0..t1 as fractions of the
 * segment), made of short slabs with slight height/length jitter so it reads laid by
 * hand, not extruded. Uses the shared 'lane' material with a pale-cement vertex colour,
 * so it merges into the lane's one draw call (see src/village.js buildLane).
 */
export function buildKerbSegments(start, end, width, t0, t1, { seed = 0 } = {}) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dx, -dz);
  const ux = dx / length;
  const uz = dz / length;
  const nx = -uz;
  const nz = ux;
  const slab = 1.2;
  const count = Math.max(1, Math.floor(((t1 - t0) * length) / slab));
  const meshes = [];
  const color = new THREE.Color();
  for (const side of [-1, 1]) {
    for (let i = 0; i < count; i++) {
      const r = Math.sin((i + 1) * 12.9898 + side * 78.233 + seed * 3.7) * 0.5 + 0.5;
      const h = 0.14 + r * 0.03;
      const geometry = new THREE.BoxGeometry(0.16, h, slab - 0.02);
      const pos = geometry.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      // pale cement, dustier toward the base, slight per-slab brightness
      // channels above 1 cancel the lane texture's brown so the slab reads grey cement
      color.setRGB(1.6, 1.95, 2.6).multiplyScalar(0.9 + r * 0.14);
      for (let v = 0; v < pos.count; v++) {
        const dust = pos.getY(v) < 0 ? 0.78 : 1;
        colors[v * 3] = color.r * dust;
        colors[v * 3 + 1] = color.g * dust;
        colors[v * 3 + 2] = color.b * dust;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      ensureUv2(geometry);
      const material = getTiledMaterial('lane', { repeatX: 1, repeatY: 1, roughness: 1, vertexColors: true });
      const mesh = new THREE.Mesh(geometry, material);
      const along = (t0 * length) + (i + 0.5) * slab;
      const off = side * (width / 2 + 0.02);
      mesh.position.set(start.x + ux * along + nx * off, 0.03 + h / 2 - 0.02, start.z + uz * along + nz * off);
      mesh.rotation.y = yaw;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      meshes.push(mesh);
    }
  }
  return meshes;
}
