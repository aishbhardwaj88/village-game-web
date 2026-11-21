import * as THREE from 'three';
import { LAND_QUALITY } from './landQuality.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cropTuftParts, buildCaneClumps, buildSarsonBloom, FIELD_CENTER, FIELD_SIZE } from '../field.js';
import { labelKey, labelName, inRing, makeRoadIndex, hash01 } from './landLayout.js';

/**
 * Fields, orchards floors and green strips of the approved map (?layout=new), as big painted ground patches:
 * every crop polygon is triangulated once and lies just above the ground plane (under the roads), and ONE shader paints it:
 * real soil (the library 'ground' photo set, warmed), crop rows running along the field's long side, broken and patchy,
 * fading to the crop's average colour where the rows get finer than a pixel (no shimmering moire at distance).
 * A low earthen bund (mend) runs round every field. The orchard floors, the canal green strip and the kiln green use the
 * same shader with grass instead of rows. All of it is ONE mesh, ONE draw call.
 *
 * Real crop plants only near the roads, where the player actually walks: a band 1.5-14 m from a road edge gets wheat /
 * stubble tufts, sugarcane clumps or mustard in flower (the field kit's own instanced plants, src/field.js), packed each time
 * the camera moves 6 m so only plants within PLANT_M are ever drawn: 3 more draw calls.
 */
const PLANT_M = LAND_QUALITY.plantM;
const D2R = Math.PI / 180;

// crop -> painted look: colour, row spacing (m), cover (0..1 of each row period that is plant), soil tint, plants near roads
const CROPS = {
  'Sugarcane': { color: 0x4d6b2e, spacing: 1.1, cover: 0.82, soil: 0x8a7458, plant: 'cane' },
  'Young wheat': { color: 0x6b8c34, spacing: 0.24, cover: 0.62, soil: 0x9a7e5a, plant: 'wheat' },
  'Mustard in flower': { color: 0x5a7a2c, flower: 0xd8b830, flowerDensity: 0.62, spacing: 0.45, cover: 0.9, soil: 0x9a7e5a, plant: 'sarson' },
  'Potato': { color: 0x4c6a30, spacing: 0.75, cover: 0.52, soil: 0x8e7050, plant: null },
  'Marigold': { color: 0x4c6a2e, flower: 0xd8802a, flowerDensity: 0.35, spacing: 0.9, cover: 0.62, soil: 0x957a56, plant: null },
  'Chilli': { color: 0x3f5f2c, flower: 0xa83a24, flowerDensity: 0.08, spacing: 0.9, cover: 0.55, soil: 0x957a56, plant: null },
  'Brinjal': { color: 0x3d5a2e, flower: 0x4a2a48, flowerDensity: 0.06, spacing: 1.0, cover: 0.58, soil: 0x8e7050, plant: null },
  'Cauliflower': { color: 0x6a8a6c, flower: 0xe4dcc0, flowerDensity: 0.18, spacing: 0.7, cover: 0.6, soil: 0x8e7050, plant: null },
  'Green fodder': { color: 0x5c8a34, spacing: 0.3, cover: 0.9, soil: 0x8e7050, plant: 'wheat_young' },
  'Harvested paddy, stubble': { color: 0xbfa66a, spacing: 0.25, cover: 0.45, soil: 0xb09468, plant: 'stubble' },
};
// The family khet of the wheat errand (src/field.js, kept under the new layout: gameplay) with its track loop: the painted
// patches leave a hole over it (shader discard) and no plants are placed inside, so the two never fight.
const KHET = { minX: FIELD_CENTER.x - 63, maxX: FIELD_CENTER.x + 63, minZ: FIELD_CENTER.z - 48, maxZ: FIELD_CENTER.z + 48 };
const inKhet = (x, z) => x > KHET.minX && x < KHET.maxX && z > KHET.minZ && z < KHET.maxZ;
const GRASS = { color: 0x74853f, spacing: 0, cover: 1, soil: 0x8a7a58, plant: null };

let fieldMat = null;
/** The one field material: library 'ground' photo set (colour, normal, roughness) + the row painter. */
export function fieldMaterial() {
  if (fieldMat) return fieldMat;
  const L = new THREE.TextureLoader();
  const t = (m, srgb) => { const x = L.load(`assets/textures/ground/ground_${m}.webp`); x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8; if (srgb) x.colorSpace = THREE.SRGBColorSpace; return x; };
  const mat = new THREE.MeshStandardMaterial({ map: t('color', true), normalMap: t('normal'), roughnessMap: t('roughness'), roughness: 1, vertexColors: true });
  mat.name = 's7_fields';
  mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -2;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uKhet = { value: new THREE.Vector4(KHET.minX, KHET.maxX, KHET.minZ, KHET.maxZ) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aCrop; attribute vec4 aRow; attribute vec4 aFlower; varying vec3 vCrop; varying vec4 vRow; varying vec4 vFlower; varying vec2 vFxz;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCrop = aCrop; vRow = aRow; vFlower = aFlower; vFxz = (modelMatrix * vec4(position, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vCrop; varying vec4 vRow; varying vec4 vFlower; varying vec2 vFxz; uniform vec4 uKhet;
float fHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float fNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fHash(i), fHash(i + vec2(1, 0)), f.x), mix(fHash(i + vec2(0, 1)), fHash(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vFxz.x > uKhet.x && vFxz.x < uKhet.y && vFxz.y > uKhet.z && vFxz.y < uKhet.w) discard; // the family khet shows through
{
  // vColor = soil tint, vCrop = crop colour, vRow = (row angle, spacing, cover, dots)
  vec2 p = vFxz;
  float big = fNoise(p * 0.045) * 0.6 + fNoise(p * 0.13) * 0.4;       // 10-25 m patches: uneven growth, wet and dry soil
  diffuseColor.rgb *= mix(0.86, 1.1, big);
  float cover = vRow.z;
  float mask;
  if (vRow.y < 0.01) {
    mask = cover * smoothstep(0.18, 0.55, big + fNoise(p * 0.9) * 0.35);  // grass: patchy, a little bare earth showing
  } else {
    float ca = cos(vRow.x), sa = sin(vRow.x);
    // rows wander a little (hand-sown furrows are never ruled lines)
    float across = (dot(p, vec2(-sa, ca)) + (fNoise(p * 0.07) - 0.5) * 0.8) / vRow.y;
    float along = dot(p, vec2(ca, sa)) / vRow.y;
    float wave = 0.5 + 0.5 * cos(across * 6.2831853);                       // 1 on the row line, 0 in the furrow
    float leaf = fNoise(vec2(along * 1.7, across * 1.3)) * 0.55 + fNoise(p * 3.7 + 3.1) * 0.45;
    mask = smoothstep(1.0 - cover - 0.3, 1.0 - cover + 0.3, wave) * (0.55 + 0.45 * leaf);
    mask *= smoothstep(0.1, 0.45, big + fNoise(p * 0.33) * 0.3);            // thin and failed patches, metres across
    float fw = fwidth(across);
    mask = mix(mask, cover * 0.75 * (0.55 + 0.45 * big), smoothstep(0.2, 0.7, fw)); // finer than a pixel: the average, never moire
  }
  vec3 crop = vCrop * (0.78 + 0.4 * fNoise(p * 0.21 + 7.0)) * (0.9 + 0.2 * big);
  float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  diffuseColor.rgb = mix(diffuseColor.rgb, crop * (0.75 + 0.5 * lum), clamp(mask * 0.92, 0.0, 1.0));
  if (vFlower.a > 0.0) {
    float sp = fNoise(p * 6.5) * 0.6 + fNoise(p * 13.0 + 5.0) * 0.4;
    float fl = smoothstep(1.0 - vFlower.a - 0.06, 1.0 - vFlower.a + 0.06, sp) * clamp(mask * 1.4, 0.0, 1.0);
    fl = mix(fl, vFlower.a * mask, smoothstep(0.02, 0.08, fwidth(p.x * 6.5)));  // far: the average tint, no sparkle
    diffuseColor.rgb = mix(diffuseColor.rgb, vFlower.rgb * (0.85 + 0.3 * big), clamp(fl, 0.0, 1.0));
  }
}`);
  };
  mat.customProgramCacheKey = () => 's7_fields_v3';
  fieldMat = mat;
  return mat;
}

/** Principal direction of a ring (row angle along the long side). */
function longAngle(ring) {
  let best = 0, ang = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L > best) { best = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); }
  }
  return ang;
}

function patchGeometry(ring, look, y, angle) {
  const pts = ring.map(([x, z]) => new THREE.Vector2(x, z));
  if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
  const tris = THREE.ShapeUtils.triangulateShape(pts, []);
  const n = pts.length, pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), nor = new Float32Array(n * 3);
  pts.forEach((p, i) => { pos.set([p.x, y, p.y], i * 3); uv.set([p.x / 5, p.y / 5], i * 2); nor.set([0, 1, 0], i * 3); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const idx = [];
  for (const t of tris) idx.push(t[0], t[2], t[1]); // +y facing with x east, z south
  g.setIndex(idx);
  paint(g, look, angle);
  return g;
}
export function paint(g, look, angle) {
  const n = g.attributes.position.count;
  const soil = new THREE.Color(look.soil), crop = new THREE.Color(look.color);
  const col = new Float32Array(n * 3), ac = new Float32Array(n * 3), ar = new Float32Array(n * 4), af = new Float32Array(n * 4);
  const fc = new THREE.Color(look.flower ?? 0xffffff), fd = look.flowerDensity || 0;
  for (let i = 0; i < n; i++) { col.set([soil.r * 1.25, soil.g * 1.25, soil.b * 1.25], i * 3); ac.set([crop.r, crop.g, crop.b], i * 3); ar.set([angle, look.spacing, look.cover, 0], i * 4); af.set([fc.r, fc.g, fc.b, fd], i * 4); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aCrop', new THREE.BufferAttribute(ac, 3));
  g.setAttribute('aRow', new THREE.BufferAttribute(ar, 4));
  g.setAttribute('aFlower', new THREE.BufferAttribute(af, 4));
}

/** The earthen bund (mend) round a field: a 0.5 m wide, 0.12 m high ridge of bare soil along the outline. */
function bundGeometry(ring, y) {
  const pos = [], nor = [], uv = [], idx = [];
  const w = 0.25, h = 0.12;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.3) continue;
    const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    const base = pos.length / 3;
    // two sloped faces meeting at the crest
    const v = [[a[0] + nx * w, y, a[1] + nz * w], [b[0] + nx * w, y, b[1] + nz * w], [b[0], y + h, b[1]], [a[0], y + h, a[1]], [a[0] - nx * w, y, a[1] - nz * w], [b[0] - nx * w, y, b[1] - nz * w]];
    for (const p of v) { pos.push(...p); uv.push(p[0] / 5, p[2] / 5); }
    const up = 0.9;
    nor.push(nx * 0.45, up, nz * 0.45, nx * 0.45, up, nz * 0.45, 0, 1, 0, 0, 1, 0, -nx * 0.45, up, -nz * 0.45, -nx * 0.45, up, -nz * 0.45);
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2, base + 3, base + 5, base + 2, base + 3, base + 4, base + 5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  paint(g, { soil: 0x8a7254, color: 0x6a7a3a, spacing: 0, cover: 0.25 }, 0);
  return g;
}

/** Pack an InstancedMesh's drawn instances to those within PLANT_M of the camera (the full list stays in master arrays). */
function nearPack(mesh, total) {
  const M = mesh.instanceMatrix.array.slice(0, total * 16);
  const C = mesh.instanceColor ? mesh.instanceColor.array.slice(0, total * 3) : null;
  let lx = 1e9, lz = 1e9;
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.onBeforeRender = (renderer, scene, cam) => {
    const p = cam.position;
    if (Math.abs(p.x - lx) + Math.abs(p.z - lz) < 6) return;
    lx = p.x; lz = p.z;
    let n = 0;
    for (let i = 0; i < total; i++) {
      const dx = M[i * 16 + 12] - p.x, dz = M[i * 16 + 14] - p.z, d2 = dx * dx + dz * dz;
      if (d2 > PLANT_M * PLANT_M || (d2 > 1600 && i % 2)) continue; // full density to 40 m, half beyond
      mesh.instanceMatrix.array.set(M.subarray(i * 16, i * 16 + 16), n * 16);
      if (C) mesh.instanceColor.array.set(C.subarray(i * 3, i * 3 + 3), n * 3);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (C) mesh.instanceColor.needsUpdate = true;
  };
}

export async function build(map, { camera = null } = {}) {
  const roads = makeRoadIndex(map.roads);
  const geos = [];
  const spots = { wheat: [], wheat_young: [], stubble: [], cane: [], sarson: [] };
  const report = { fields: 0, orchards: 0, green: 0, byCrop: {}, plants: {} };
  for (const o of map.objects) {
    const key = labelKey(o), name = labelName(o);
    const ring = o.rings?.[0];
    if (!ring || ring.length < 3) continue;
    let look = null, y = 0.016, rows = true;
    if (key === 'new_field') { look = CROPS[name] || CROPS['Young wheat']; report.fields++; report.byCrop[name] = (report.byCrop[name] || 0) + 1; }
    else if (key === 'new_orchard') { look = { ...GRASS, color: 0x6f7f3c }; rows = false; report.orchards++; }
    else if ((key === 'new_greenbelt' || key === 'new_kilngreen' || key === 'new_grazing' || key === 'new_Mango baagh') && o.kind === 'ground') { look = GRASS; rows = false; y = 0.018; report.green++; }
    if (!look) continue;
    const angle = longAngle(ring);
    geos.push(patchGeometry(ring, rows ? look : { ...look, spacing: 0 }, y, angle));
    if (key === 'new_field') geos.push(bundGeometry(ring, y));
    // real plants only in the band beside a road
    if (key === 'new_field' && look.plant) {
      const xs = ring.map((p) => p[0]), zs = ring.map((p) => p[1]);
      const step = look.plant === 'cane' ? 0.95 : look.plant === 'sarson' ? 0.9 : 0.75;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      for (let x = Math.min(...xs); x < Math.max(...xs); x += step) {
        for (let z = Math.min(...zs); z < Math.max(...zs); z += step) {
          // snap onto the field's own rows: rotate into row space, keep the grid
          const jx = x + (hash01(x, z) - 0.5) * step * 0.5, jz = z + (hash01(z, x) - 0.5) * step * 0.5;
          const cl = roads.clearance(jx, jz);
          if (cl < 1.5 || cl > 14) continue;
          if (!inRing(ring, jx, jz) || inKhet(jx, jz)) continue;
          const across = (-sa * jx + ca * jz) / (look.plant === 'cane' ? 1.1 : 0.75);
          if (Math.abs(across - Math.round(across)) > 0.3) continue; // rows, with walkable furrows between
          if (hash01(jx * 1.3, jz * 0.7) < 0.18) continue; // gaps: a hand-sown row is never full
          spots[look.plant].push([jx, jz]);
        }
      }
    }
  }
  const group = new THREE.Group();
  group.name = 's7_fields';
  const merged = mergeGeometries(geos);
  const ground = new THREE.Mesh(merged, fieldMaterial());
  ground.name = 's7_field_ground';
  ground.receiveShadow = true;
  ground.userData.noAutoCollider = true;
  ground.userData.groundLevel = true;
  group.add(ground);

  // tufts: wheat (green), young fodder (lush green), paddy stubble (short, straw) in one InstancedMesh
  const tuftSpots = [...spots.wheat.map((s) => [...s, 'wheat']), ...spots.wheat_young.map((s) => [...s, 'young']), ...spots.stubble.map((s) => [...s, 'stubble'])];
  if (tuftSpots.length) {
    const { geometry, material } = cropTuftParts();
    const mesh = new THREE.InstancedMesh(geometry, material, tuftSpots.length);
    mesh.name = 's7_field_tufts';
    mesh.receiveShadow = true;
    mesh.userData.groundLevel = true;
    mesh.userData.noAutoCollider = true;
    const d = new THREE.Object3D(), c = new THREE.Color();
    tuftSpots.forEach(([x, z, k], i) => {
      const j = Math.sin(x * 12.9 + z * 7.1), sc = 0.6 + 0.65 * hash01(x * 2.7, z * 3.1);
      d.position.set(x, 0, z); d.rotation.set(0, j * 3, 0);
      d.scale.set(sc, sc * (k === 'stubble' ? 0.25 : k === 'young' ? 0.6 : 0.7), sc);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      if (k === 'stubble') c.setRGB(1.0, 0.88, 0.55); else c.setRGB(0.48 + 0.06 * j, 0.72, 0.38); // dusty field greens, never lime
      mesh.setColorAt(i, c);
    });
    nearPack(mesh, tuftSpots.length);
    group.add(mesh);
  }
  if (spots.cane.length) { const m = buildCaneClumps(spots.cane); m.name = 's7_field_cane'; m.userData.noAutoCollider = true; nearPack(m, spots.cane.length); group.add(m); }
  if (spots.sarson.length) { const m = buildSarsonBloom(spots.sarson); m.name = 's7_field_sarson'; m.userData.noAutoCollider = true; nearPack(m, spots.sarson.length); group.add(m); }
  for (const k in spots) report.plants[k] = spots[k].length;
  report.triangles = merged.index.count / 3;
  group.userData.report = report;
  return group;
}
