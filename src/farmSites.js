import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildGardenPlants, GARDEN_KIND } from './vegetation.js';
import { getTiledMaterial } from './materials.js';
import { buildClothesline } from './laundry.js';
import { getGLTFLoader } from './loaders.js';

/**
 * MAP.md farm and water sites, each streamed by zoneManager (src/main.js):
 *   - pond just outside the west boundary (bathing, buffaloes, lotus)
 *   - tubewell + kothri (shade hut) in the family's north fields
 *   - ganna (sugarcane) belt, ten feet tall, planted in walls
 * MAP.md gives no coordinates for any of them; main.js picks open ground.
 * Vertex-coloured merged meshes, a handful of draw calls per zone.
 */

function bake(geometry, matrix, color) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.applyMatrix4(matrix);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  if (!g.attributes.normal) g.computeVertexNormals();
  // Box-projected UVs (world scale, ~1.4 m per tile) so the shared PBR maps tile on every face.
  const pos = g.attributes.position, nor = g.attributes.normal;
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / 1.4; uv[i * 2 + 1] = v / 1.4;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
const at = (x, y, z, ry = 0) => new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);

/** Face-local placement: a matrix at (x,y,z) turned ry, so openings can be built facing +z and put on any wall. */
const faceBox = (geos, face, w, h, d, lx, ly, lz, color) =>
  geos.push(bake(new THREE.BoxGeometry(w, h, d), new THREE.Matrix4().multiplyMatrices(face, new THREE.Matrix4().makeTranslation(lx, ly, lz)), color));
const faceCyl = (geos, face, r, len, lx, ly, lz, color, alongZ = false) =>
  geos.push(bake(new THREE.CylinderGeometry(r, r, len, 6), new THREE.Matrix4().multiplyMatrices(face, new THREE.Matrix4().makeTranslation(lx, ly, lz).multiply(new THREE.Matrix4().makeRotationX(alongZ ? Math.PI / 2 : 0))), color));

/** Real window: dark recess, painted frame, iron grille bars (vertical + one rail), projecting sill. `face` sits on the wall surface looking out (+z local), y = window centre. */
function windowOpening(geos, face, w = 1.1, h = 1.3, frame = 0x4a3524, trim = 0xe9e2cf) {
  faceBox(geos, face, w, h, 0.08, 0, 0, 0.02, 0x1d1a17); // recess
  const t = 0.07;
  faceBox(geos, face, w + 2 * t, t, 0.14, 0, h / 2 + t / 2, 0.06, frame);
  faceBox(geos, face, w + 2 * t, t, 0.14, 0, -h / 2 - t / 2, 0.06, frame);
  for (const sx of [-1, 1]) faceBox(geos, face, t, h, 0.14, sx * (w / 2 + t / 2), 0, 0.06, frame);
  const bars = Math.max(3, Math.round(w / 0.16));
  for (let i = 0; i < bars; i++) faceCyl(geos, face, 0.014, h, -w / 2 + (i + 0.5) * (w / bars), 0, 0.1, 0x26262a);
  faceBox(geos, face, w, 0.025, 0.03, 0, h * 0.12, 0.1, 0x26262a);
  faceBox(geos, face, w + 0.3, 0.07, 0.26, 0, -h / 2 - t - 0.035, 0.1, trim); // sill
}

/** Real door: dark recess, frame, two raised panels with a middle rail, hinges, handle, threshold step. */
function doorOpening(geos, face, w = 1.1, h = 2.1, leaf = 0x4f3523, frame = 0x2f2016, trim = 0xcfc7b0) {
  faceBox(geos, face, w + 0.2, h, 0.06, 0, h / 2, 0.01, 0x14110e); // recess
  const t = 0.09;
  faceBox(geos, face, w + 2 * t, t, 0.16, 0, h + t / 2, 0.07, frame);
  for (const sx of [-1, 1]) faceBox(geos, face, t, h + t, 0.16, sx * (w / 2 + t / 2), (h + t) / 2, 0.07, frame);
  faceBox(geos, face, w, h, 0.07, 0, h / 2, 0.06, leaf);
  for (const [cy, ch] of [[h * 0.27, h * 0.38], [h * 0.73, h * 0.38]]) faceBox(geos, face, w * 0.72, ch, 0.03, 0, cy, 0.1, 0x3d2818);
  faceBox(geos, face, w, 0.08, 0.05, 0, h * 0.5, 0.1, frame);
  for (const hy of [0.3, h - 0.3]) faceBox(geos, face, 0.16, 0.05, 0.03, -w / 2 + 0.08, hy, 0.1, 0x26262a);
  faceCyl(geos, face, 0.025, 0.1, w / 2 - 0.12, h * 0.5, 0.12, 0xa8894a, true); // brass handle
  faceBox(geos, face, w + 0.5, 0.12, 0.4, 0, 0.06, 0.2, trim); // threshold step
}

/** Irregular blob outline (never a perfect circle: MAP.md wants organic edges). */
function blobShape(radius, seed) {
  const shape = new THREE.Shape();
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = radius * (1 + 0.16 * Math.sin(a * 2 + seed) + 0.09 * Math.sin(a * 3 + seed * 2.3) + 0.05 * Math.sin(a * 5 + seed * 0.7));
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}
function flatBlob(radius, seed, y, color) {
  const g = new THREE.ShapeGeometry(blobShape(radius, seed));
  g.rotateX(-Math.PI / 2);
  return bake(g, at(0, y, 0), color);
}

/** Textured (plaster PBR set, or ground for earth) tinted by baked vertex colours; water passes metalness/low roughness and keeps no maps. */
const vcMat = (opts = {}) => {
  const { roughness = 0.9, metalness, earth, ...rest } = opts;
  const water = roughness < 0.3;
  if (water) return new THREE.MeshStandardMaterial({ name: 'site_water', vertexColors: true, roughness, metalness, ...rest });
  const base = getTiledMaterial(earth || roughness >= 1 ? 'ground' : 'plaster', { repeatX: 1, repeatY: 1, vertexColors: true });
  const m = base.clone();
  m.name = 'site_props';
  m.aoMap = null;
  m.roughness = roughness;
  m.color.setScalar(1.7); // the scans are mid-grey; lift so the baked colours keep their value
  Object.assign(m, rest);
  return m;
};

/** Village pond: muddy bank ring, murky green water, lotus pads and a few pink lotus. */
export function createPond(position) {
  const group = new THREE.Group();
  group.name = 'pond';
  // Bank: wide trampled-mud ring under the water, so the edge reads as wet earth, not a sticker.
  const bank = new THREE.Mesh(mergeGeometries([
    flatBlob(12.5, 1.3, 0.025, 0x6e5a3c),
    flatBlob(10.8, 1.3, 0.03, 0x4f4430),
  ]), vcMat({ roughness: 1 }));
  bank.receiveShadow = true;
  group.add(bank);
  const water = new THREE.Mesh(
    flatBlob(9.6, 1.3, 0.06, 0x4f5238),
    vcMat({ roughness: 0.08, metalness: 0.35 })
  );
  water.name = 'pond_water';
  water.material.polygonOffset = true;
  water.material.polygonOffsetFactor = -1;
  water.receiveShadow = true;
  group.add(water);

  // Lotus pads (flat discs) and flowers (small pink cones) scattered on the water.
  const geos = [];
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 7.2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const size = 0.5 + rnd() * 0.45;
    geos.push(bake(new THREE.CircleGeometry(size, 9), new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(x, 0.085, z), i % 3 ? 0x4f7233 : 0x62843c));
    if (i % 5 === 0) {
      geos.push(bake(new THREE.ConeGeometry(0.28, 0.4, 7), at(x, 0.28, z), 0xd9709a));
      geos.push(bake(new THREE.ConeGeometry(0.18, 0.3, 6), at(x + 0.2, 0.24, z + 0.08), 0xefb0c8));
    }
  }
  // Bathing ghat: two stepped cement slabs and a washing stone on the east bank.
  for (let i = 0; i < 3; i++) geos.push(bake(new THREE.BoxGeometry(2.6 - i * 0.3, 0.16, 0.7), at(10.4 - i * 0.7, 0.08 + i * 0.15, 0.0, Math.PI / 2), 0xb4ac98));
  geos.push(bake(new THREE.BoxGeometry(0.9, 0.35, 0.55), at(11.9, 0.18, 2.0, 0.4), 0x8d8676));
  const props = new THREE.Mesh(mergeGeometries(geos), vcMat());
  props.castShadow = false;
  props.receiveShadow = true;
  group.add(props);
  group.position.set(position.x, 0, position.z);
  return group;
}

/** Proper charpai: wooden frame on four turned legs with crisscrossed jute/niwar webbing that sags slightly in the middle. Pushes geometry for a bed centred at (x, z), frame top at y0+0.4. */
function charpaiGeos(geos, x, z, rot = 0, y0 = 0) {
  const L = 1.9, W = 1.0, TOP = y0 + 0.4;
  const place = (lx, ly, lz) => { const c = Math.cos(rot), sn = Math.sin(rot); return at(x + lx * c + lz * sn, ly, z - lx * sn + lz * c, rot); };
  const WOOD = 0x6b4a2c, LEG = 0x5a3f27, JUTE = 0xb9a77a, JUTE2 = 0xa38f62;
  geos.push(bake(new THREE.BoxGeometry(L, 0.06, 0.07), place(0, TOP, -W / 2 + 0.035), WOOD));
  geos.push(bake(new THREE.BoxGeometry(L, 0.06, 0.07), place(0, TOP, W / 2 - 0.035), WOOD));
  geos.push(bake(new THREE.BoxGeometry(0.07, 0.06, W), place(-L / 2 + 0.035, TOP, 0), WOOD));
  geos.push(bake(new THREE.BoxGeometry(0.07, 0.06, W), place(L / 2 - 0.035, TOP, 0), WOOD));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    geos.push(bake(new THREE.CylinderGeometry(0.035, 0.028, TOP - y0, 6), place(sx * (L / 2 - 0.05), y0 + (TOP - y0) / 2, sz * (W / 2 - 0.05)), LEG));
    geos.push(bake(new THREE.SphereGeometry(0.045, 6, 4), place(sx * (L / 2 - 0.05), y0 + 0.25, sz * (W / 2 - 0.05)), LEG)); // turned bulge
  }
  // Webbing: strips along the length (warp) and across (weft), each dropped by a parabola so the middle sags ~4 cm.
  const sag = (u) => -0.045 * (1 - u * u);
  const nWarp = 9, nWeft = 17;
  for (let i = 0; i < nWarp; i++) {
    const lz = -W / 2 + 0.08 + (i / (nWarp - 1)) * (W - 0.16);
    geos.push(bake(new THREE.BoxGeometry(L - 0.14, 0.012, 0.045), place(0, TOP - 0.01 + sag(lz / (W / 2)), lz), i % 2 ? JUTE : JUTE2));
  }
  for (let i = 0; i < nWeft; i++) {
    const lx = -L / 2 + 0.1 + (i / (nWeft - 1)) * (L - 0.2);
    geos.push(bake(new THREE.BoxGeometry(0.045, 0.012, W - 0.14), place(lx, TOP + 0.004 + sag(lx / (L / 2)) * 0.9, 0), i % 2 ? JUTE2 : JUTE));
  }
}

/** Tubewell kothri (brick shade hut), motor pump, pipe and cistern with an outlet channel. */
export function createTubewell(position) {
  const geos = [];
  const BRICK = 0xb88b6a, LIME = 0xd9d0b8, SLAB = 0x9a968c, DOOR = 0x2f6b5a, IRON = 0x4d4a46, WATER = 0x3f5560, STAIN = 0x8c8a7e, WET = 0x6b5f4a;
  // Kothri 2.8 x 2.4, walls 2.3 high, flat slab roof with lip, plinth band.
  geos.push(bake(new THREE.BoxGeometry(2.8, 2.3, 2.4), at(0, 1.15, 0), LIME));
  geos.push(bake(new THREE.BoxGeometry(2.9, 0.45, 2.5), at(0, 0.22, 0), BRICK));
  geos.push(bake(new THREE.BoxGeometry(3.2, 0.16, 2.8), at(0, 2.38, 0), SLAB));
  geos.push(bake(new THREE.BoxGeometry(3.2, 0.1, 0.1), at(0, 2.5, 1.4), SLAB));
  // Door: dark wooden frame, planked leaf with vertical plank lines, hinges, handle, concrete threshold.
  const FRAME = 0x3a2a1c, PLANK = 0x1f4a3c;
  geos.push(bake(new THREE.BoxGeometry(1.1, 1.85, 0.06), at(0.2, 0.98, 1.2), FRAME));
  geos.push(bake(new THREE.BoxGeometry(0.9, 1.7, 0.08), at(0.2, 0.95, 1.23), DOOR));
  for (const px of [-0.15, 0.0, 0.15, 0.3]) geos.push(bake(new THREE.BoxGeometry(0.018, 1.6, 0.02), at(0.2 + px, 0.95, 1.28), PLANK));
  for (const hy of [0.3, 1.6]) geos.push(bake(new THREE.BoxGeometry(0.1, 0.06, 0.03), at(-0.2, hy, 1.28), IRON));
  geos.push(bake(new THREE.BoxGeometry(0.04, 0.16, 0.05), at(0.55, 0.95, 1.29), IRON));
  geos.push(bake(new THREE.BoxGeometry(1.3, 0.08, 0.35), at(0.2, 0.04, 1.4), SLAB));
  // Window: wooden frame, recessed dark opening, iron grille bars, shutter leaf, projecting sill.
  geos.push(bake(new THREE.BoxGeometry(0.62, 0.62, 0.05), at(-0.9, 1.5, 1.2), FRAME));
  geos.push(bake(new THREE.BoxGeometry(0.48, 0.48, 0.03), at(-0.9, 1.5, 1.23), 0x1c1a18));
  for (const gx of [-0.15, -0.05, 0.05, 0.15]) geos.push(bake(new THREE.BoxGeometry(0.014, 0.5, 0.014), at(-0.9 + gx, 1.5, 1.26), IRON));
  for (const gy of [-0.12, 0.12]) geos.push(bake(new THREE.BoxGeometry(0.5, 0.014, 0.014), at(-0.9, 1.5 + gy, 1.26), IRON));
  geos.push(bake(new THREE.BoxGeometry(0.2, 0.5, 0.025), at(-1.31, 1.5, 1.27, -0.9), DOOR));
  geos.push(bake(new THREE.BoxGeometry(0.76, 0.06, 0.16), at(-0.9, 1.17, 1.28), SLAB));
  // Motor + starter box outside, pipe rising then bending to the cistern.
  geos.push(bake(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 12), at(-2.1, 0.35, 0.4), 0x2f5c7a));
  geos.push(bake(new THREE.BoxGeometry(0.35, 0.5, 0.2), at(-1.55, 1.4, 1.25), 0x6b7378));
  geos.push(bake(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8), at(-2.1, 1.25, 0.4), IRON));
  geos.push(bake(new THREE.CylinderGeometry(0.07, 0.07, 3.0, 8), new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(-0.7, 1.8, 0.4), IRON));
  // Cistern (hauz): low cement tank with rim, water inside, outlet channel into the field.
  const cx = 3.9, cz = 0.4;
  geos.push(bake(new THREE.BoxGeometry(3.4, 0.7, 0.18), at(cx, 0.35, cz - 1.6), SLAB));
  geos.push(bake(new THREE.BoxGeometry(3.4, 0.7, 0.18), at(cx, 0.35, cz + 1.6), SLAB));
  geos.push(bake(new THREE.BoxGeometry(0.18, 0.7, 3.2), at(cx - 1.6, 0.35, cz), SLAB));
  geos.push(bake(new THREE.BoxGeometry(0.18, 0.7, 3.2), at(cx + 1.6, 0.35, cz), SLAB));
  // Waterline stain band on the inner walls (just above the water), damp patch at the outlet.
  for (const [w, d, ox, oz] of [[3.0, 0.02, 0, -1.5], [3.0, 0.02, 0, 1.5], [0.02, 3.0, -1.5, 0], [0.02, 3.0, 1.5, 0]]) geos.push(bake(new THREE.BoxGeometry(w, 0.1, d), at(cx + ox, 0.5, cz + oz), STAIN));
  geos.push(bake(new THREE.BoxGeometry(2.0, 0.015, 1.4), at(cx + 1.9, 0.02, cz + 2.0), WET));
  geos.push(bake(new THREE.BoxGeometry(0.4, 0.12, 4.5), at(cx + 1.9, 0.05, cz + 3.8), SLAB));
  const water = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.04, 3.0), new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.06, metalness: 0.25, envMapIntensity: 1.4 }));
  water.position.set(cx, 0.5, cz);
  const naali = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 4.3), water.material);
  naali.position.set(cx + 1.9, 0.12, cz + 3.8);
  // Woven charpai in the kothri's shade.
  charpaiGeos(geos, -0.5, 2.7, 0.15);
  const mesh = new THREE.Mesh(mergeGeometries(geos), vcMat());
  mesh.name = 'tubewell';
  // Kothri, hauz, motor and the charpai in its shade are solid (A0).
  mesh.userData.colliderBoxes = orientedSolids(position, 0, [[0, 0, 2.9, 2.5], [3.9, 0.4, 3.5, 3.5], [-2.1, 0.4, 0.6, 0.6], [-0.5, 2.7, 1.9, 1.0, 0.15]]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'tubewell_prop';
  group.add(mesh, water, naali);
  group.position.set(position.x, 0, position.z);
  return group;
}

/**
 * Sugarcane belt: rows of 3 m clumps, 4 stalks + arching leaf blades each, one InstancedMesh.
 * Rows run along x with a one-clump-wide gap every few rows so the belt can be crossed (a rough maze).
 */
export function createSugarcaneBelt({ x0, z0, width, depth }) {
  const geos = [];
  const STALK = 0x7a8a3c, STALK_DARK = 0x5f6e2c, LEAF = 0x5c7a2e, LEAF_DARK = 0x46612a;
  let s = 11;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const stalks = 6;
  for (let i = 0; i < stalks; i++) {
    const a = (i / stalks) * Math.PI * 2 + rnd(), r = 0.1 + rnd() * 0.18;
    const h = 2.8 + rnd() * 0.5;
    const g = new THREE.CylinderGeometry(0.016, 0.026, h, 4, 1, true);
    g.translate(0, h / 2, 0);
    geos.push(bake(g, at(Math.cos(a) * r, 0, Math.sin(a) * r), i % 2 ? STALK : STALK_DARK));
  }
  // Leaf blades: tapering, bending two-segment strips from the stalk tops, outward and drooping.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rnd() * 0.4;
    const baseY = 0.7 + rnd() * 2.4, len = 0.9 + rnd() * 0.6;
    const w = 0.055;
    const pos = [], idx = [];
    const pts = [[0, 0], [len * 0.5, 0.25 * len], [len, -0.05 * len]];
    pts.forEach(([out, up], k) => {
      const t = k / 2, ww = w * (1 - 0.85 * t * t);
      pos.push(-ww, up, out, ww, up, out);
    });
    for (let k = 0; k < 2; k++) { const b = k * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    geos.push(bake(g, at(0, baseY, 0, a), i % 2 ? LEAF : LEAF_DARK));
  }
  const geometry = mergeGeometries(geos);
  const material = vcMat({ side: THREE.DoubleSide, roughness: 0.8 });
  const placements = [];
  const SPACING_X = 1.7, SPACING_Z = 1.7;
  const rows = Math.floor(depth / SPACING_Z);
  const cols = Math.floor(width / SPACING_X);
  for (let r = 0; r < rows; r++) {
    if (r % 7 === 3) continue; // lane through the belt
    for (let c = 0; c < cols; c++) {
      if (c % 11 === 5 && r % 2) continue; // cross-gaps so it is a maze, not a hedge
      placements.push([x0 + c * SPACING_X + (rnd() - 0.5) * 0.4, z0 + r * SPACING_Z + (rnd() - 0.5) * 0.4]);
    }
  }
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = 'sugarcane_belt';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  placements.forEach(([x, z], i) => {
    const k = 0.85 + rnd() * 0.35;
    q.setFromAxisAngle(up, rnd() * Math.PI * 2);
    m.compose(p.set(x, 0, z), q, sc.set(k, 0.9 + rnd() * 0.3, k));
    mesh.setMatrixAt(i, m);
    const v = 0.85 + rnd() * 0.3;
    mesh.setColorAt(i, col.setRGB(v, v, v));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false; // belt is large: skip the second shadow pass draw
  mesh.receiveShadow = true;
  mesh.frustumCulled = false; // instance bounds are not computed per-instance
  const group = new THREE.Group();
  group.name = 'sugarcane_belt_zone';
  group.add(mesh);
  return group;
}

/** Johad: small rain-fed village pond, a brown-green dip with a trampled rim and a few reeds. */
export function createJohad(position) {
  const group = new THREE.Group();
  group.name = 'johad';
  const rim = new THREE.Mesh(mergeGeometries([
    flatBlob(7.8, 4.1, 0.025, 0x75623f),
    flatBlob(6.3, 4.1, 0.03, 0x54492f),
  ]), vcMat({ roughness: 1 }));
  rim.receiveShadow = true;
  group.add(rim);
  const water = new THREE.Mesh(flatBlob(5.4, 4.1, 0.06, 0x5a5b3c), vcMat({ roughness: 0.1, metalness: 0.3 }));
  water.material.polygonOffset = true;
  water.material.polygonOffsetFactor = -1;
  water.receiveShadow = true;
  group.add(water);
  const geos = [];
  let s = 23;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  // Reed clumps along the shore, and a flat stone where kids stand to throw pitthu.
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2, r = 5.8 + rnd() * 1.2;
    for (let k = 0; k < 4; k++) {
      const h = 0.9 + rnd() * 0.7;
      const g = new THREE.CylinderGeometry(0.012, 0.03, h, 4, 1, true);
      g.translate(0, h / 2, 0);
      geos.push(bake(g, new THREE.Matrix4().makeRotationZ((rnd() - 0.5) * 0.35).setPosition(Math.cos(a) * r + (rnd() - 0.5) * 0.4, 0, Math.sin(a) * r + (rnd() - 0.5) * 0.4), k % 2 ? 0x6f7d3a : 0x58662f));
    }
  }
  geos.push(bake(new THREE.BoxGeometry(1.0, 0.22, 0.7), at(-7.0, 0.11, 1.5, 0.5), 0x948c7a));
  const props = new THREE.Mesh(mergeGeometries(geos), vcMat({ side: THREE.DoubleSide }));
  props.receiveShadow = true;
  group.add(props);
  group.position.set(position.x, 0, position.z);
  return group;
}

/**
 * Khalihan (threshing floor) with bhoosa stacks: a packed-earth circle with a central post
 * and a few straw heaps and a round stack at the edge for jumping into (MAP.md west zone).
 */
export function createKhalihan(position) {
  const geos = [];
  const EARTH = 0x9c845a, STRAW = 0xa8905a, STRAW_DARK = 0x9a8450, POST = 0x5a4228, ROPE = 0x8a7a50;
  geos.push(flatBlob(8.5, 2.2, 0.03, 0x8c7650));
  geos.push(flatBlob(7.2, 2.2, 0.04, EARTH));
  // Threshing post and a bullock-turned beam lying on the floor.
  geos.push(bake(new THREE.CylinderGeometry(0.09, 0.11, 1.2, 8), at(0, 0.6, 0), POST));
  geos.push(bake(new THREE.BoxGeometry(2.2, 0.1, 0.12), at(1.1, 0.07, 0.4, 0.5), POST));
  // Loose straw drifts on the floor.
  for (const [x, z, r] of [[-2.5, 1.5, 1.4], [2.4, -2.2, 1.2], [-1.2, -3.0, 1.0]]) {
    const g = new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    geos.push(bake(g, new THREE.Matrix4().makeScale(1, 0.25, 1).setPosition(x, 0.05, z), STRAW_DARK));
  }
  // Bhoosa stacks: tall domed haystacks with a wound rope band, around the floor's rim.
  const stacks = [[-9.5, -3, 0.75, 0], [-10.5, 4.5, 0.9, 1], [9.8, 5.5, 0.65, 2], [11, -2.5, 0.85, 3]];
  const tones = [0x9a8350, 0x8c7848, 0xa28c58, 0x836f42];
  for (const [x, z, k, n] of stacks) {
    // One lathe profile: bulging flank, tapering to a rounded crown; vertices jittered so it reads as piled straw.
    const prof = [[1.9, 0], [2.0, 0.5], [1.95, 1.3], [1.7, 2.1], [1.2, 2.8], [0.55, 3.2], [0, 3.35]].map(([r, y]) => new THREE.Vector2(r * k, y * k));
    const g = new THREE.LatheGeometry(prof, 24);
    const p = g.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const h = Math.sin(p.getX(v) * 3.1 + p.getY(v) * 2.3 + n) * Math.cos(p.getZ(v) * 2.7 + p.getY(v) * 1.9);
      p.setXYZ(v, p.getX(v) * (1 + 0.06 * h), p.getY(v), p.getZ(v) * (1 + 0.06 * h));
    }
    g.computeVertexNormals();
    geos.push(bake(g, at(x, 0, z, n), tones[n]));
    geos.push(bake(new THREE.TorusGeometry(1.95 * k, 0.05, 4, 16), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x, 1.0 * k, z), ROPE));
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos), vcMat({ roughness: 1 }));
  mesh.name = 'khalihan';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'khalihan_prop';
  mesh.userData.colliderBoxes = orientedSolids(position, 0, [[0, 0, 0.3, 0.3], ...stacks.map(([x, z, k]) => [x, z, 3.2 * k, 3.2 * k])]); // threshing post + bhoosa stacks
  group.add(mesh);
  group.position.set(position.x, 0, position.z);
  return group;
}

/** Small vertex-coloured plastered building: plinth, walls, flat roof with parapet, door, window, painted band. */
function smallBuilding({ w, d, h, wall, band, door, roof = 0x8d8a82 }) {
  const geos = [];
  geos.push(bake(new THREE.BoxGeometry(w + 0.2, 0.35, d + 0.2), at(0, 0.175, 0), 0x8f8878));
  geos.push(bake(new THREE.BoxGeometry(w, h, d), at(0, 0.35 + h / 2, 0), wall));
  geos.push(bake(new THREE.BoxGeometry(w + 0.04, 0.35, d + 0.04), at(0, 0.35 + h * 0.62, 0), band));
  geos.push(bake(new THREE.BoxGeometry(w + 0.4, 0.18, d + 0.4), at(0, 0.35 + h + 0.09, 0), roof));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(0.16, 0.5, d + 0.4), at(sx * (w / 2 + 0.12), 0.35 + h + 0.43, 0), roof));
  for (const sz of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(w + 0.4, 0.5, 0.16), at(0, 0.35 + h + 0.43, sz * (d / 2 + 0.12)), roof));
  // Door and two windows on the +z face.
  geos.push(bake(new THREE.BoxGeometry(1.1, 2.1, 0.1), at(0, 0.35 + 1.05, d / 2 + 0.03), door));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(0.9, 0.9, 0.1), at(sx * w * 0.3, 0.35 + 1.6, d / 2 + 0.03), 0x3f3a33));
  return geos;
}

/** Anganwadi: pink limewashed one-room childcare centre with a painted yard wall and a small slide. */
export function createAnganwadi(position) {
  const geos = smallBuilding({ w: 7, d: 5, h: 3.1, wall: 0xe0b6b0, band: 0xc9877f, door: 0x2f6b5d });
  // Low yard wall with gap in front of the door, and a kid-sized slide + seesaw.
  for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(3.6, 0.9, 0.2), at(sx * 3.5, 0.45, 6.5), 0xd9c9a8));
  geos.push(bake(new THREE.BoxGeometry(0.2, 0.9, 8), at(-5.2, 0.45, 3.0), 0xd9c9a8));
  geos.push(bake(new THREE.BoxGeometry(0.2, 0.9, 8), at(5.2, 0.45, 3.0), 0xd9c9a8));
  geos.push(bake(new THREE.BoxGeometry(0.9, 0.08, 2.2), new THREE.Matrix4().makeRotationX(0.55).setPosition(3.6, 0.8, 4.6), 0xd8a22a));
  geos.push(bake(new THREE.BoxGeometry(0.9, 0.08, 0.7), at(3.6, 1.45, 3.6), 0xd8a22a));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(0.06, 1.5, 0.06), at(3.6 + sx * 0.4, 0.75, 3.6), 0x6d6d6d));
  geos.push(bake(new THREE.BoxGeometry(0.2, 0.3, 2.4), at(-3.4, 0.2, 4.2), 0x7a5a3a));
  geos.push(bake(new THREE.BoxGeometry(2.6, 0.06, 0.35), at(-3.4, 0.5, 4.2, 0.1), 0x2f6b5d));
  const mesh = new THREE.Mesh(mergeGeometries(geos), vcMat());
  mesh.userData.colliderBoxes = solidBoxes(position, [[0, 0, 7.2, 5.2]]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'anganwadi';
  group.add(mesh);
  group.position.set(position.x, 0, position.z);
  return group;
}

/** Dudh dairy: cream-walled collection room with a steel can stack, a milk-can rack and a tin awning. */
export function createDudhDairy(position) {
  const geos = smallBuilding({ w: 5, d: 4, h: 3.0, wall: 0xe7dcc0, band: 0x4a78a6, door: 0x7a4a2a });
  geos.push(bake(new THREE.BoxGeometry(5.6, 0.07, 1.8), new THREE.Matrix4().makeRotationX(0.12).setPosition(0, 2.75, 3.0), 0x8e969c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), at(sx * 2.6, 1.2, 3.7), 0x5a5a5a));
  // Milk cans (tall steel cylinders with lids) in two rows beside the door.
  for (let i = 0; i < 6; i++) {
    const x = -2.2 + (i % 3) * 0.55, z = 2.9 + Math.floor(i / 3) * 0.55;
    geos.push(bake(new THREE.CylinderGeometry(0.2, 0.24, 0.8, 10), at(x, 0.4, z), 0xb9bdc0));
    geos.push(bake(new THREE.CylinderGeometry(0.14, 0.2, 0.12, 10), at(x, 0.86, z), 0x9fa4a8));
  }
  geos.push(bake(new THREE.BoxGeometry(1.4, 0.5, 0.9), at(2.0, 0.25, 3.1), 0x7a5a3a));
  const mesh = new THREE.Mesh(mergeGeometries(geos), vcMat({ roughness: 0.8 }));
  mesh.userData.colliderBoxes = solidBoxes(position, [[0, 0, 5.2, 4.2]]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'dudh_dairy';
  group.add(mesh);
  group.position.set(position.x, 0, position.z);
  return group;
}

/** Local [cx, cz, w, d] footprints -> world AABBs (sites are unrotated), so streamed buildings block the player (zoneManager rebuilds STATIC_COLLIDERS on every zone change). */
function solidBoxes(position, solids) {
  return solids.map(([cx, cz, w, d]) => ({ minX: position.x + cx - w / 2, maxX: position.x + cx + w / 2, minZ: position.z + cz - d / 2, maxZ: position.z + cz + d / 2 }));
}

/** World AABBs for local oriented rectangles [cx, cz, w, d, rot] inside a site group rotated by ry about its position (A0: charpais, pumps, poles block movement). */
function orientedSolids(position, ry, rects) {
  const cg = Math.cos(ry), sg = Math.sin(ry);
  return rects.map(([cx, cz, w, d, rot = 0]) => {
    const wx = position.x + cx * cg + cz * sg, wz = position.z - cx * sg + cz * cg;
    const a = Math.abs(Math.cos(rot + ry)), b = Math.abs(Math.sin(rot + ry));
    const hx = (a * w + b * d) / 2, hz = (b * w + a * d) / 2;
    return { minX: wx - hx, maxX: wx + hx, minZ: wz - hz, maxZ: wz + hz };
  });
}

function finishSite(name, geos, position, opts = {}) {
  const mesh = new THREE.Mesh(mergeGeometries(geos), vcMat(opts));
  if (opts.solids) mesh.userData.colliderBoxes = solidBoxes(position, opts.solids);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = name;
  group.add(mesh);
  group.position.set(position.x, 0, position.z);
  return group;
}

/** Health sub-centre: white-and-green one-storey block with a verandah and a waiting bench (no brand marks). */
export function createHealthSubCentre(position) {
  const geos = smallBuilding({ w: 9, d: 5.5, h: 3.2, wall: 0xece6d6, band: 0x4f8f6a, door: 0x3d6f58 });
  geos.push(bake(new THREE.BoxGeometry(9.6, 0.1, 2.2), at(0, 3.0, 3.9), 0xb9b4a6));
  for (const sx of [-1, 0, 1]) geos.push(bake(new THREE.BoxGeometry(0.25, 2.7, 0.25), at(sx * 4.2, 1.7, 4.8), 0xece6d6));
  geos.push(bake(new THREE.BoxGeometry(2.6, 0.08, 0.5), at(-2.4, 0.5, 4.2), 0x7a5a3a));
  geos.push(bake(new THREE.BoxGeometry(2.6, 0.5, 0.08), at(-2.4, 0.75, 3.95), 0x7a5a3a));
  return finishSite('health_subcentre', geos, position, { solids: [[0, 0, 9.2, 5.7]] });
}

/** Chemist: narrow cream shop with a green shutter, tin awning and a glass counter front. */
export function createChemist(position) {
  const geos = smallBuilding({ w: 4.2, d: 4, h: 3.1, wall: 0xe9d9c3, band: 0x2f7d5b, door: 0x2f7d5b });
  geos.push(bake(new THREE.BoxGeometry(4.8, 0.07, 1.6), new THREE.Matrix4().makeRotationX(0.14).setPosition(0, 2.75, 2.8), 0x8e969c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), at(sx * 2.2, 1.2, 3.4), 0x5a5a5a));
  geos.push(bake(new THREE.BoxGeometry(3.2, 1.0, 0.7), at(0, 0.85, 2.6), 0x9a7a52));
  geos.push(bake(new THREE.BoxGeometry(3.0, 0.9, 0.05), at(0, 1.8, 2.3), 0x9fb8bd));
  return finishSite('chemist', geos, position, { roughness: 0.85, solids: [[0, 0, 4.4, 4.2]] });
}

/** Masjid: modest limewashed prayer hall with a green-and-white dome, one slim minaret and an ablution tap row. Scenery only. */
export function createMasjid(position) {
  const geos = smallBuilding({ w: 8, d: 7, h: 3.6, wall: 0xeee8d8, band: 0x3f7a5a, door: 0x2f5d49, roof: 0xd8d2c0 });
  geos.push(bake(new THREE.CylinderGeometry(2.4, 2.6, 0.5, 16), at(0, 4.6, 0), 0xd8d2c0));
  geos.push(bake(new THREE.SphereGeometry(2.3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), at(0, 4.85, 0), 0xf2eee2));
  geos.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), at(0, 7.6, 0), 0xc8a24a));
  geos.push(bake(new THREE.BoxGeometry(1.1, 7.6, 1.1), at(-5.2, 3.8, -1.5), 0xeee8d8));
  geos.push(bake(new THREE.BoxGeometry(1.5, 0.3, 1.5), at(-5.2, 6.0, -1.5), 0xd8d2c0));
  geos.push(bake(new THREE.SphereGeometry(0.65, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), at(-5.2, 7.6, -1.5), 0x3f7a5a));
  for (let i = 0; i < 3; i++) geos.push(bake(new THREE.BoxGeometry(0.4, 0.6, 0.3), at(2 + i * 0.9, 0.5, 4.2), 0xb9bdc0));
  geos.push(bake(new THREE.BoxGeometry(4, 0.12, 0.5), at(3, 0.4, 4.6), 0xb7b0a0));
  return finishSite('masjid', geos, position, { solids: [[0, 0, 8.2, 7.2], [-5.2, -1.5, 1.2, 1.2]] });
}

/** Gurudwara: white hall with a gold-topped dome, small chhatris, and a saffron nishan sahib flagpole. Scenery only. */
export function createGurudwara(position) {
  const geos = smallBuilding({ w: 9, d: 7, h: 3.6, wall: 0xf1ede2, band: 0xd69a2e, door: 0x6a4a2a, roof: 0xdcd6c6 });
  geos.push(bake(new THREE.CylinderGeometry(2.2, 2.4, 0.5, 16), at(0, 4.6, 0), 0xdcd6c6));
  geos.push(bake(new THREE.SphereGeometry(2.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), at(0, 4.85, 0), 0xf6f2e6));
  geos.push(bake(new THREE.ConeGeometry(0.22, 1.0, 8), at(0, 7.4, 0), 0xd9a63a));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    geos.push(bake(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 8), at(sx * 3.7, 4.6, sz * 2.7), 0xdcd6c6));
    geos.push(bake(new THREE.SphereGeometry(0.45, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), at(sx * 3.7, 4.85, sz * 2.7), 0xf6f2e6));
  }
  geos.push(bake(new THREE.CylinderGeometry(0.1, 0.12, 9, 8), at(6.5, 4.5, 4.5), 0xd9d3c3));
  geos.push(bake(new THREE.BoxGeometry(0.05, 1.3, 0.9), at(6.5, 8.2, 4.95), 0xe0861f));
  return finishSite('gurudwara', geos, position, { solids: [[0, 0, 9.2, 7.2]] });
}

/** TV house: the one house with a television. Pale-green plaster, flat roof, and a rooftop antenna mast. No brand marks. */
export function createTvHouse(position) {
  const geos = smallBuilding({ w: 8, d: 6, h: 3.3, wall: 0xc9d8c0, band: 0xb8574a, door: 0x2f4f6b });
  geos.push(bake(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 6), at(2.4, 5.7, -1.2), 0x6d6d6d));
  for (let i = 0; i < 4; i++) geos.push(bake(new THREE.BoxGeometry(0.04, 0.04, 1.3 - i * 0.2), at(2.4, 4.6 + i * 0.5, -1.2), 0x7a7a7a));
  geos.push(bake(new THREE.BoxGeometry(2.4, 0.5, 1.4), at(-1.8, 4.1, 0), 0x3a5a7a)); // water tank on roof
  geos.push(bake(new THREE.BoxGeometry(2.8, 0.1, 1.8), at(0, 3.0, 3.9), 0xb9b4a6)); // porch slab
  charpaiGeos(geos, 0, 4.4, 0.1, 0.1); // woven charpai on the porch slab
  return finishSite('tv_house', geos, position, { solids: [[0, 0, 8.2, 6.2], [0, 4.4, 1.9, 1.0]] }); // house + porch charpai
}

/** Manihari: bangle-seller's small stall, a wooden counter with a striped awning and rods of coloured bangles. */
export function createManihari(position) {
  const geos = [];
  geos.push(bake(new THREE.BoxGeometry(3.2, 0.9, 1.2), at(0, 0.45, 0), 0x8a6a45));
  geos.push(bake(new THREE.BoxGeometry(3.4, 0.08, 1.4), at(0, 0.94, 0), 0x6f5233));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6), at(sx * 1.6, 1.25, -0.5), 0x6f5233));
  for (let i = 0; i < 6; i++) geos.push(bake(new THREE.BoxGeometry(0.55, 0.06, 1.7), new THREE.Matrix4().makeRotationX(-0.18).setPosition(-1.4 + i * 0.56, 2.55, 0.1), i % 2 ? 0xc4372f : 0xe8d9b0));
  const cols = [0xc4372f, 0x2f7d5b, 0xd8a22a, 0x3a5aa6, 0x8a3a8a];
  for (let i = 0; i < 10; i++) geos.push(bake(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 10), at(-1.35 + i * 0.3, 1.1, 0.1), cols[i % cols.length]));
  geos.push(bake(new THREE.BoxGeometry(1.0, 0.06, 0.5), at(-3, 0.35, 0.8), 0x7a5a3a)); // stool
  return finishSite('manihari', geos, position, { solids: [[0, 0, 3.4, 1.4], [-3, 0.8, 1.0, 0.5]] }); // counter + stool
}

/** Sabzi rehris: three wooden handcarts piled with vegetables, parked in a row under a tarpaulin shade. */
export function createSabziRehris(position) {
  const geos = [];
  const piles = [[0xb2342b, 0xd8872a], [0x4f8f3a, 0x8aad3a], [0xd8c8a0, 0x7a3a8a]]; // tomato/carrot, gourd/chilli, onion/brinjal
  piles.forEach((pc, i) => {
    const x = (i - 1) * 3.2;
    geos.push(bake(new THREE.BoxGeometry(2.2, 0.12, 1.2), at(x, 0.85, 0), 0x8a6a45));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.BoxGeometry(0.08, 0.8, 0.08), at(x + sx * 0.95, 0.4, sz * 0.5), 0x6f5233));
    for (const sz of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(2.2, 0.25, 0.06), at(x, 1.0, sz * 0.58), 0x7a5a3a));
    geos.push(bake(new THREE.CylinderGeometry(0.4, 0.5, 0.4, 8), at(x - 0.5, 1.2, 0), pc[0]));
    geos.push(bake(new THREE.CylinderGeometry(0.4, 0.5, 0.4, 8), at(x + 0.5, 1.2, 0), pc[1]));
    for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 14), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x + sx * 0.8, 0.42, 0.7), 0x3a3a3a));
    geos.push(bake(new THREE.BoxGeometry(0.1, 0.1, 1.6), at(x, 0.8, 1.7), 0x6f5233));
  });
  geos.push(bake(new THREE.BoxGeometry(10.2, 0.05, 3.6), new THREE.Matrix4().makeRotationX(0.1).setPosition(0, 2.9, 0.3), 0x9a5f3c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 6), at(sx * 4.9, 1.45, -1.3), 0x5a5a5a));
  return finishSite('sabzi_rehris', geos, position, { solids: [[-3.2, 0.2, 2.3, 1.3], [0, 0.2, 2.3, 1.3], [3.2, 0.2, 2.3, 1.3], [-4.9, -1.3, 0.12, 0.12], [4.9, -1.3, 0.12, 0.12]] }); // three carts + tarp poles
}

/** Jain mandir: small white shikhara temple on a plinth with a pillared porch. Scenery only, no tasks. */
export function createJainMandir(position) {
  const geos = smallBuilding({ w: 6, d: 6, h: 3.2, wall: 0xf3efe4, band: 0xc9a24a, door: 0x6a4a2a, roof: 0xe2dccb });
  geos.push(bake(new THREE.BoxGeometry(7.4, 0.3, 7.4), at(0, 0.15, 0), 0xcfc8b6));
  geos.push(bake(new THREE.ConeGeometry(2.0, 3.6, 4), at(0, 5.45, 0, Math.PI / 4), 0xf3efe4));
  geos.push(bake(new THREE.ConeGeometry(0.7, 1.4, 4), at(0, 8.0, 0, Math.PI / 4), 0xe9e2cf));
  geos.push(bake(new THREE.SphereGeometry(0.2, 8, 6), at(0, 8.8, 0), 0xd9a63a));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.22, 0.26, 2.6, 8), at(sx * 1.6, 1.6, 3.9), 0xe9e2cf));
  geos.push(bake(new THREE.BoxGeometry(4.4, 0.25, 1.8), at(0, 3.0, 3.9), 0xd8d2c0));
  return finishSite('jain_mandir', geos, position, { solids: [[0, 0, 7.4, 7.4]] });
}

/** Highway cluster (east edge): paved two-lane road strip, petrol pump with canopy, bus adda shelter and a dharam kanta weighbridge. Unbranded. */
export function createHighwayCluster(position) {
  const geos = [];
  geos.push(bake(new THREE.BoxGeometry(14, 0.1, 150), at(0, 0.05, 0), 0x3d3d40));
  for (let z = -70; z <= 70; z += 8) geos.push(bake(new THREE.BoxGeometry(0.2, 0.02, 3.5), at(0, 0.11, z), 0xe8e2c8));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(0.2, 0.02, 150), at(sx * 6.4, 0.11, 0), 0xe8e2c8));
  // Petrol pump: forecourt slab, canopy on four posts, two pumps, small office.
  geos.push(bake(new THREE.BoxGeometry(22, 0.12, 16), at(-19, 0.06, -35), 0x9a9890));
  geos.push(bake(new THREE.BoxGeometry(14, 0.5, 9), at(-19, 5.0, -35), 0xd8d2c2));
  geos.push(bake(new THREE.BoxGeometry(14.04, 0.2, 9.04), at(-19, 4.65, -35), 0xc4372f));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.CylinderGeometry(0.2, 0.2, 4.8, 8), at(-19 + sx * 5.5, 2.4, -35 + sz * 3.2), 0xd8d2c2));
  for (const sx of [-1, 1]) {
    geos.push(bake(new THREE.BoxGeometry(0.9, 1.7, 0.6), at(-19 + sx * 2.5, 0.97, -35), 0xc4372f));
    geos.push(bake(new THREE.BoxGeometry(0.7, 0.4, 0.62), at(-19 + sx * 2.5, 1.5, -35), 0x2a2a2a));
  }
  geos.push(bake(new THREE.BoxGeometry(4, 3, 3.5), at(-27, 1.6, -41), 0xe4dcc6));
  geos.push(bake(new THREE.BoxGeometry(4.4, 0.2, 3.9), at(-27, 3.2, -41), 0x8d8a82));
  // Bus adda: tin-roof shelter, bench, kerb-side concrete pad.
  geos.push(bake(new THREE.BoxGeometry(8, 0.15, 3.5), at(-10, 0.08, 20), 0xa8a59c));
  geos.push(bake(new THREE.BoxGeometry(8.4, 0.08, 3.8), new THREE.Matrix4().makeRotationX(0.06).setPosition(-10, 3.0, 20), 0x8e969c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.07, 0.07, 3, 6), at(-10 + sx * 3.8, 1.5, 19), 0x5a5a5a));
  geos.push(bake(new THREE.BoxGeometry(0.1, 0.9, 3), at(-10, 0.6, 21.5), 0xc9b79a));
  geos.push(bake(new THREE.BoxGeometry(5, 0.1, 0.5), at(-10, 0.5, 20.8), 0x7a5a3a));
  // Dharam kanta: weighbridge platform flush with the road verge, small cabin with weighing display post.
  geos.push(bake(new THREE.BoxGeometry(4, 0.2, 14), at(-11, 0.1, 55), 0x6d6d70));
  geos.push(bake(new THREE.BoxGeometry(3.4, 0.05, 13.4), at(-11, 0.22, 55), 0x8a8a8c));
  geos.push(bake(new THREE.BoxGeometry(3, 2.8, 3), at(-16, 1.4, 50), 0xdcd2b8));
  geos.push(bake(new THREE.BoxGeometry(3.4, 0.18, 3.4), at(-16, 2.9, 50), 0x8d8a82));
  geos.push(bake(new THREE.BoxGeometry(1.2, 0.6, 0.15), at(-13.5, 2.4, 50), 0x2a2a2a));
  return finishSite('highway_cluster', geos, position, { roughness: 0.92, solids: [
    [-27, -41, 4, 3.5], [-16, 50, 3, 3], [-13.5, 50, 1.2, 0.2], // petrol office, dharam kanta cabin, display post
    [-21.5, -35, 0.9, 0.6], [-16.5, -35, 0.9, 0.6], // two pumps
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [-19 + sx * 5.5, -35 + sz * 3.2, 0.4, 0.4]), // canopy posts
    [-13.8, 19, 0.15, 0.15], [-6.2, 19, 0.15, 0.15], [-10, 21.5, 3, 0.2], // bus adda posts + back panel
  ] });
}

/** Jalebi + samosa stall: handcart with a wide black kadhai on a brazier, glass case of samosas and a striped tarp. Unbranded. */
export function createJalebiStall(position) {
  const geos = [];
  geos.push(bake(new THREE.BoxGeometry(3.0, 0.1, 1.4), at(0, 0.9, 0), 0x8a6a45));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.BoxGeometry(0.1, 0.9, 0.1), at(sx * 1.35, 0.45, sz * 0.6), 0x6f5233));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 14), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(sx * 1.2, 0.45, 0.85), 0x3a3a3a));
  geos.push(bake(new THREE.CylinderGeometry(0.4, 0.3, 0.4, 12), at(-0.7, 1.15, 0), 0x6b4a3a)); // brazier
  geos.push(bake(new THREE.CylinderGeometry(0.62, 0.45, 0.22, 16), at(-0.7, 1.45, 0), 0x25221f)); // kadhai
  geos.push(bake(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 16), at(-0.7, 1.56, 0), 0xd88a1f)); // oil + jalebi
  geos.push(bake(new THREE.BoxGeometry(1.1, 0.7, 0.9), at(0.8, 1.3, 0), 0xb8cdd0)); // glass case
  geos.push(bake(new THREE.BoxGeometry(0.9, 0.2, 0.7), at(0.8, 1.05, 0), 0xc98a3a)); // samosas
  geos.push(bake(new THREE.BoxGeometry(3.6, 0.05, 2.6), new THREE.Matrix4().makeRotationX(0.12).setPosition(0, 2.7, 0.1), 0xb85a3a));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.04, 0.04, 2.7, 6), at(sx * 1.7, 1.35, -1.0), 0x5a5a5a));
  geos.push(bake(new THREE.BoxGeometry(0.6, 0.35, 0.6), at(2.1, 0.18, 0.2), 0x7a5a3a)); // stool
  return finishSite('jalebi_stall', geos, position, { solids: [[0, 0, 3.0, 1.4], [2.1, 0.2, 0.6, 0.6], [-1.7, -1.0, 0.1, 0.1], [1.7, -1.0, 0.1, 0.1]] }); // cart, stool, tarp poles
}

/** Lane street life (MAP.md "carrom and ludo boards set up in the lane outside houses"): a jute mat, a carrom board, a ludo board,
 *  four low wooden peedhas and a steel lota of water. Visual only; one mesh. `ry` turns it to sit along the lane. */
export function createLaneGames(position, name = 'lane_games', ry = 0) {
  const geos = [];
  const R = (x, y, z, r = 0) => at(x, y, z, r);
  geos.push(bake(new THREE.BoxGeometry(2.6, 0.025, 2.0), R(0, 0.013, 0), 0xb59a62)); // chatai (woven mat)
  geos.push(bake(new THREE.BoxGeometry(2.6, 0.03, 0.06), R(0, 0.03, 1.0), 0x7a3b2a)); // red mat borders
  geos.push(bake(new THREE.BoxGeometry(2.6, 0.03, 0.06), R(0, 0.03, -1.0), 0x7a3b2a));
  // carrom board: dark frame, pale ply face, four corner pockets, centre ring, two coloured arrow lines
  geos.push(bake(new THREE.BoxGeometry(0.78, 0.04, 0.78), R(-0.45, 0.05, 0.1, 0.2), 0x6b4326));
  geos.push(bake(new THREE.BoxGeometry(0.66, 0.02, 0.66), R(-0.45, 0.075, 0.1, 0.2), 0xe6cf98));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = -0.45 + (sx * 0.3) * Math.cos(0.2) + (sz * 0.3) * Math.sin(0.2);
    const pz = 0.1 - (sx * 0.3) * Math.sin(0.2) + (sz * 0.3) * Math.cos(0.2);
    geos.push(bake(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 10), R(px, 0.088, pz), 0x1d1a17));
  }
  geos.push(bake(new THREE.CylinderGeometry(0.09, 0.09, 0.008, 16), R(-0.45, 0.088, 0.1), 0xa23a2a));
  // scattered carrom men (cream / dark) and the striker
  [[0.04, 0.0, 0xf2e8c8], [-0.04, 0.05, 0x25211d], [0.0, -0.06, 0xf2e8c8], [0.07, 0.07, 0x25211d], [-0.08, -0.03, 0xf2e8c8]].forEach(([dx, dz, c]) => {
    geos.push(bake(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 8), R(-0.45 + dx, 0.094, 0.1 + dz), c));
  });
  geos.push(bake(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 10), R(-0.62, 0.094, 0.28), 0xc4372f));
  // ludo board: folded cloth/cardboard square with four coloured home corners
  geos.push(bake(new THREE.BoxGeometry(0.62, 0.012, 0.62), R(0.7, 0.032, -0.35, -0.25), 0xefe6cf));
  [[-1, -1, 0xc4372f], [1, -1, 0x2f7d5b], [-1, 1, 0xd8a22a], [1, 1, 0x3a5aa6]].forEach(([sx, sz, c]) => {
    const lx = sx * 0.2, lz = sz * 0.2;
    geos.push(bake(new THREE.BoxGeometry(0.2, 0.012, 0.2), R(0.7 + lx * Math.cos(-0.25) + lz * Math.sin(-0.25), 0.04, -0.35 - lx * Math.sin(-0.25) + lz * Math.cos(-0.25), -0.25), c));
  });
  // four peedhas (low wooden stools) around the mat edges, one tipped slightly as if just left
  [[-0.45, -1.15, 0], [-0.45, 1.3, 0.3], [-1.55, 0.1, 0.1], [0.7, 1.25, 0.5]].forEach(([x, z, r]) => {
    geos.push(bake(new THREE.CylinderGeometry(0.19, 0.17, 0.06, 12), R(x, 0.27, z, r), 0x7a5a3a));
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.CylinderGeometry(0.025, 0.02, 0.24, 5), R(x + lx * 0.1, 0.12, z + lz * 0.1, r), 0x5a3f27));
  });
  geos.push(bake(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 10), R(1.15, 0.09, 0.55), 0xb8bcc0)); // steel lota
  const g = finishSite(name, geos, position);
  g.rotation.y = ry;
  return g;
}

/** Printed carrom board face (ply with grain, baselines with end circles, corner arcs, centre rings, four pockets), drawn once and shared. */
let CARROM_FACE = null;
function carromFaceTexture() {
  if (CARROM_FACE) return CARROM_FACE;
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d');
  x.fillStyle = '#e1c68c'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${150 + (i * 37) % 50},${105 + (i * 17) % 40},60,0.07)`; x.fillRect(0, (i * 53) % N, N, 1 + (i % 3)); }
  x.strokeStyle = '#2b211a'; x.lineWidth = 2.5; x.fillStyle = '#2b211a';
  x.strokeRect(34, 34, N - 68, N - 68);
  const circle = (cx, cy, r, f) => { x.beginPath(); x.arc(cx, cy, r, 0, 7); f ? x.fill() : x.stroke(); };
  for (const [px, py] of [[22, 22], [N - 22, 22], [22, N - 22], [N - 22, N - 22]]) { x.fillStyle = '#16110e'; circle(px, py, 20, true); }
  x.fillStyle = '#9d3a2a';
  for (const [a, b] of [[0, 1], [1, 0]]) for (const f of [0, 1]) { // baselines on all four sides with a red end disc each
    const o = 100, w = N - 200, line = f ? N - 96 : 96;
    x.lineWidth = 2; x.strokeStyle = '#2b211a';
    x.strokeRect(a ? o : line - 6, a ? line - 6 : o, a ? w : 12, a ? 12 : w);
    for (const e of [o, N - o]) { x.fillStyle = '#9d3a2a'; circle(a ? e : line, a ? line : e, 9, true); circle(a ? e : line, a ? line : e, 9, false); }
  }
  x.strokeStyle = '#2b211a'; x.lineWidth = 2;
  circle(N / 2, N / 2, 76, false); circle(N / 2, N / 2, 54, false); x.fillStyle = '#9d3a2a'; circle(N / 2, N / 2, 20, true);
  for (let k = 0; k < 8; k++) { x.save(); x.translate(N / 2, N / 2); x.rotate(k * Math.PI / 4); x.beginPath(); x.moveTo(54, 0); x.lineTo(76, 0); x.stroke(); x.restore(); }
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { // corner arrows
    x.beginPath(); x.moveTo(N / 2 + sx * 76 * 0.7, N / 2 + sy * 76 * 0.7); x.lineTo(N / 2 + sx * 190, N / 2 + sy * 190); x.stroke();
    x.beginPath(); x.arc(N / 2 + sx * 205, N / 2 + sy * 205, 18, 0, 7); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  CARROM_FACE = t;
  return t;
}

const CARROM_PROPS = [ // file, real-world height (m)
  ['round_wooden_table_01', 0.72], ['wooden_stool_02', 0.46], ['painted_wooden_chair_01', 0.85],
];

/**
 * The one carrom scene (MAP.md street life), at the chowk: a round wooden table with a printed carrom board mid-game, four older
 * men (capsule placeholders until characters land) on two stools and two chairs, tea glasses, a folded gamcha, a tin of
 * board powder, a katori of pocketed coins and slippers left beside the seats. Table, stool and chair are CC0 Poly Haven scans
 * (public/assets/props) loaded after the zone builds, so the first frame never waits on them. `ry` turns the whole scene.
 */
export function createCarromScene(position, name = 'carrom_scene', ry = 0) {
  const T = 0.72, geos = [];
  const R = (x, y, z, r = 0) => at(x, y, z, r);
  // board frame, rim and ply sit on the table top; the printed face is its own textured plane below
  geos.push(bake(new THREE.BoxGeometry(0.78, 0.03, 0.78), R(0, T + 0.015, 0), 0x6b4326));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshStandardMaterial({ map: carromFaceTexture(), roughness: 0.55 }));
  face.rotation.x = -Math.PI / 2; face.position.set(0, T + 0.0315, 0); face.receiveShadow = true;
  face.name = 'carrom_board_face';
  // mid-game coins, queen and striker
  const coinRng = rng01(name.length * 17 + 3);
  for (let i = 0; i < 13; i++) {
    const a = coinRng() * 6.28, d = coinRng() * 0.22;
    const col = i === 0 ? 0xa23a2a : i % 2 ? 0xf0e6c6 : 0x241f1b;
    geos.push(bake(new THREE.CylinderGeometry(0.0155, 0.0155, 0.009, 10), R(Math.cos(a) * d, T + 0.036, Math.sin(a) * d), col));
  }
  geos.push(bake(new THREE.CylinderGeometry(0.021, 0.021, 0.011, 12), R(0.12, T + 0.037, 0.29), 0xc4372f)); // striker at a baseline
  // on the table beside the board: two tea glasses, a folded gamcha, a powder tin, a steel katori of pocketed coins
  for (const [gx, gz] of [[0.44, 0.1], [-0.4, -0.3]]) {
    geos.push(bake(new THREE.CylinderGeometry(0.033, 0.028, 0.085, 10), R(gx, T + 0.045, gz), 0xd9b678));
    geos.push(bake(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 10), R(gx, T + 0.006, gz), 0xb8bcc0));
  }
  geos.push(bake(new THREE.BoxGeometry(0.2, 0.025, 0.12), R(0.1, T + 0.013, -0.46, 0.2), 0xe6dfc9));
  geos.push(bake(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 10), R(-0.42, T + 0.025, 0.3), 0xe9e4d6));
  geos.push(bake(new THREE.CylinderGeometry(0.05, 0.035, 0.04, 12), R(0.38, T + 0.02, -0.34), 0xb8bcc0));
  // four seated placeholders facing the table: kurta, head, cap or turban; seats at N/E/S/W
  const SEATS = [[0, 0.98, 0, 0xe9e1cb, 0xf0f0e6], [1.05, 0, 1, 0xb8c4cf, 0xd8cfc0], [0, -0.98, 0, 0xcfb98f, 0xefe7d6], [-1.05, 0, 1, 0xe3d8bd, 0xc8a24a]];
  const SEAT_Y = [0.46, 0.46, 0.46, 0.46];
  SEATS.forEach(([sx, sz, isChair, kurta, cap], i) => {
    const face2 = Math.atan2(-sx, -sz); // yaw so local +z points at the table
    const f = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), face2).add(new THREE.Vector3(sx, 0, sz));
    const place = (geo, local, col, rotMat) => {
      const m = new THREE.Matrix4().makeRotationY(face2);
      if (rotMat) m.multiply(rotMat);
      const p = f(local[0], local[1], local[2]); m.setPosition(p);
      geos.push(bake(geo, m, col));
    };
    const sy = isChair ? 0.47 : SEAT_Y[i];
    place(new THREE.CapsuleGeometry(0.17, 0.34, 4, 10), [0, sy + 0.34, -0.03], kurta);            // torso
    place(new THREE.SphereGeometry(0.115, 10, 8), [0, sy + 0.78, 0.0], 0x8a5e44);                   // head
    place(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), [0, sy + 0.8, 0.0], cap); // cap / turban
    place(new THREE.CapsuleGeometry(0.075, 0.28, 3, 8), [-0.1, sy + 0.1, 0.2], 0xe8e2d2, new THREE.Matrix4().makeRotationX(Math.PI / 2)); // thighs
    place(new THREE.CapsuleGeometry(0.075, 0.28, 3, 8), [0.1, sy + 0.1, 0.2], 0xe8e2d2, new THREE.Matrix4().makeRotationX(Math.PI / 2));
    place(new THREE.CapsuleGeometry(0.06, 0.28, 3, 8), [-0.1, sy - 0.16, 0.36], 0xe8e2d2);         // shins
    place(new THREE.CapsuleGeometry(0.06, 0.28, 3, 8), [0.1, sy - 0.16, 0.36], 0xe8e2d2);
    place(new THREE.CapsuleGeometry(0.05, 0.3, 3, 8), [-0.27, sy + 0.2, 0.12], kurta, new THREE.Matrix4().makeRotationX(-0.9)); // arms reaching in
    place(new THREE.CapsuleGeometry(0.05, 0.3, 3, 8), [0.27, sy + 0.2, 0.12], kurta, new THREE.Matrix4().makeRotationX(-0.9));
    // a pair of slippers left on the ground beside each seat
    place(new THREE.BoxGeometry(0.1, 0.02, 0.26), [0.42, 0.012, 0.25], i % 2 ? 0x2f3d5c : 0x4a3426, new THREE.Matrix4().makeRotationY(0.3));
    place(new THREE.BoxGeometry(0.1, 0.02, 0.26), [0.56, 0.012, 0.2], i % 2 ? 0x2f3d5c : 0x4a3426, new THREE.Matrix4().makeRotationY(-0.4));
  });
  const group = finishSite(name, geos, position, { roughness: 0.9 });
  group.children[0].userData.colliderBoxes = orientedSolids(position, ry, [[0, 0, 1.15, 1.15], [0, 0.98, 0.55, 0.55], [0, -0.98, 0.55, 0.55], [1.05, 0, 0.55, 0.55], [-1.05, 0, 0.55, 0.55]]);
  group.children[0].castShadow = false; // placeholders + props cast no shadow: keeps the shadow pass cheap in the chowk view
  group.add(face);
  // CC0 scans: table in the centre, stools at N and S, chairs at E and W (facing the table)
  Promise.all(CARROM_PROPS.map(([file, h]) => getGLTFLoader().loadAsync(`assets/props/${file}.glb`).then((gltf) => {
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    return { scene: gltf.scene, box, k: h / Math.max(0.01, box.max.y - box.min.y) };
  }))).then(([table, stool, chair]) => {
    // stools and chairs are InstancedMesh (two copies, one draw each part) and cast no shadow: keeps the shadow pass and hero view cheap
    const place = (src, spots, shadow) => {
      const wrap = new THREE.Group();
      const c = src.box.getCenter(new THREE.Vector3());
      const fit = new THREE.Matrix4().makeScale(src.k, src.k, src.k).setPosition(-c.x * src.k, -src.box.min.y * src.k, -c.z * src.k);
      // every part of these scans shares one material, so the parts merge into a single geometry: one draw per asset
      const parts = [];
      src.scene.traverse((m) => {
        if (!m.isMesh) return;
        const g = m.geometry.clone();
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(fit, m.matrixWorld));
        parts.push({ g, mat: m.material });
      });
      const merged = mergeGeometries(parts.map((p) => { const g = p.g.index ? p.g.toNonIndexed() : p.g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; }));
      const im = new THREE.InstancedMesh(merged, parts[0].mat, spots.length);
      spots.forEach(([x, z, yaw], i) => im.setMatrixAt(i, new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z)));
      im.castShadow = shadow; im.receiveShadow = true; im.frustumCulled = false;
      wrap.add(im);
      group.add(wrap);
    };
    place(table, [[0, 0, 0.3]], false);
    place(stool, [[0, 0.98, 0.5], [0, -0.98, 2.2]], false);
    place(chair, [[1.05, 0, -Math.PI / 2], [-1.05, 0, Math.PI / 2]], false);
  }).catch(() => {});
  group.rotation.y = ry;
  return group;
}

function rng01(seed) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

/** Lane laundry corner: a charpai with a folded quilt and drying red chillies, a steel tub, and a clothesline of saris and dupattas between two poles. Visual only. */
export function createLaneLaundry(position, name = 'lane_laundry', ry = 0) {
  const geos = [];
  const R = (x, y, z, r = 0) => at(x, y, z, r);
  charpaiGeos(geos, 0, 0);
  // folded quilt and a bolster at one end, a tray of red chillies drying at the other
  geos.push(bake(new THREE.BoxGeometry(0.7, 0.1, 0.8), R(-0.5, 0.5, 0, 0.05), 0x3a5aa6));
  geos.push(bake(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(-0.05, 0.52, 0), 0xd8a22a));
  geos.push(bake(new THREE.BoxGeometry(0.5, 0.025, 0.6), R(0.5, 0.455, 0), 0xe6d9b0));
  for (const [dx, dz] of [[-0.12, -0.15], [0.08, -0.05], [-0.05, 0.12], [0.14, 0.15], [0.0, 0.0], [-0.16, 0.04]]) geos.push(bake(new THREE.SphereGeometry(0.07, 6, 4), R(0.5 + dx, 0.485, dz), 0xb8261c));
  // steel washing tub and a bar of soap
  geos.push(bake(new THREE.CylinderGeometry(0.34, 0.27, 0.2, 14), R(1.9, 0.1, 0.6), 0xb8bcc0));
  geos.push(bake(new THREE.BoxGeometry(0.1, 0.04, 0.06), R(1.5, 0.02, 0.9), 0x7a9a3a));
  // clothesline: two poles, a taut cord, hanging cloth
  const h = 2.1, span = 4.4, z0 = -1.4;
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.04, 0.05, h, 6), R(sx * span / 2, h / 2, z0), 0x5a3f27));
  // sagging rope in short segments, real garments over it (src/laundry.js), pegs on the cloth
  const line = buildClothesline({ span, ropeY: h - 0.1, z0, seed: 1 + Math.abs(Math.round(position.x * 3 + position.z * 7)) % 997 });
  for (const s of line.rope) {
    const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
    geos.push(bake(new THREE.CylinderGeometry(0.007, 0.007, len, 4), new THREE.Matrix4().makeRotationZ(Math.atan2(s.y1 - s.y0, s.x1 - s.x0) - Math.PI / 2).setPosition((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, z0), 0x4a4036));
  }
  for (const pg of line.pegs) geos.push(bake(new THREE.BoxGeometry(0.028, 0.085, 0.03), new THREE.Matrix4().makeRotationZ(pg.r).setPosition(pg.x, pg.y, pg.z), pg.c));
  const g = finishSite(name, geos, position);
  g.add(line.cloth);
  g.children[0].userData.colliderBoxes = orientedSolids(position, ry, [[0, 0, 1.9, 1.0], [-2.2, -1.4, 0.15, 0.15], [2.2, -1.4, 0.15, 0.15]]); // charpai + the two clothesline poles
  g.rotation.y = ry;
  return g;
}

/** Lane water corner: a cast-iron hand pump on a cement platform with a drain apron, a stack of brass-and-clay matkas, two steel ghadas, a bucket and a washing slab. Visual only. */
export function createLaneWaterCorner(position, name = 'lane_water', ry = 0) {
  const geos = [];
  const R = (x, y, z, r = 0) => at(x, y, z, r);
  geos.push(bake(new THREE.BoxGeometry(1.7, 0.18, 1.7), R(0, 0.09, 0), 0xb4aea0)); // cement platform
  geos.push(bake(new THREE.BoxGeometry(1.9, 0.02, 0.9), R(0, 0.03, 1.3), 0x6d7a78)); // damp apron, flat on the ground past the platform edge
  // soak-away: a dark wet patch in the earth where the apron drains, ringed with pebbles
  geos.push(bake(new THREE.CylinderGeometry(0.62, 0.7, 0.012, 14), R(0.1, 0.012, 2.05), 0x3f4543));
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7 + 0.3;
    geos.push(bake(new THREE.SphereGeometry(0.06 + (i % 3) * 0.015, 5, 4), R(0.1 + Math.cos(a) * 0.72, 0.03, 2.05 + Math.sin(a) * 0.62), i % 2 ? 0x8a867c : 0x6f6b62));
  }
  // pump: base, body, spout, handle with grip
  geos.push(bake(new THREE.CylinderGeometry(0.17, 0.2, 0.3, 10), R(0, 0.33, 0), 0x2f3a3d));
  geos.push(bake(new THREE.CylinderGeometry(0.07, 0.09, 0.8, 8), R(0, 0.85, 0), 0x2f3a3d));
  geos.push(bake(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 10), R(0, 1.3, 0), 0x2f3a3d));
  geos.push(bake(new THREE.BoxGeometry(0.06, 0.06, 0.4), R(0, 0.95, 0.28), 0x2f3a3d));
  geos.push(bake(new THREE.BoxGeometry(0.05, 0.05, 1.0), new THREE.Matrix4().makeRotationX(0.5).setPosition(0, 1.5, -0.3), 0x2f3a3d));
  geos.push(bake(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), new THREE.Matrix4().makeRotationX(0.5).setPosition(0, 1.4, -0.7), 0x7a2a22));
  // steel bucket under the spout, with a little water in it
  geos.push(bake(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 14), R(0, 0.34, 0.58), 0xb8bcc0));
  geos.push(bake(new THREE.CylinderGeometry(0.18, 0.18, 0.01, 14), R(0, 0.47, 0.58), 0x6f8f98));
  // matkas: clay pots, two stacked on a wooden stand, one beside, plus two steel ghadas
  geos.push(bake(new THREE.BoxGeometry(0.9, 0.05, 0.45), R(-1.5, 0.3, -0.2), 0x6b4a2c));
  for (const lx of [-0.3, 0.3]) geos.push(bake(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), R(-1.5 + lx, 0.15, -0.2), 0x5a3f27));
  for (const [x, z] of [[-1.75, -0.2], [-1.3, -0.2]]) {
    geos.push(bake(new THREE.SphereGeometry(0.22, 12, 8), R(x, 0.56, z), 0xa8552f));
    geos.push(bake(new THREE.CylinderGeometry(0.1, 0.14, 0.1, 10), R(x, 0.79, z), 0xa8552f));
  }
  geos.push(bake(new THREE.SphereGeometry(0.2, 12, 8), R(-1.0, 0.2, 0.7), 0x9b4a28));
  geos.push(bake(new THREE.CylinderGeometry(0.09, 0.13, 0.1, 10), R(-1.0, 0.4, 0.7), 0x9b4a28));
  for (const [x, z] of [[1.25, 0.4], [1.6, 0.9]]) {
    geos.push(bake(new THREE.SphereGeometry(0.21, 12, 8), R(x, 0.21, z), 0xb8bcc0));
    geos.push(bake(new THREE.CylinderGeometry(0.1, 0.14, 0.12, 10), R(x, 0.43, z), 0xb8bcc0));
  }
  // flat washing stone with a bar of soap
  geos.push(bake(new THREE.BoxGeometry(0.8, 0.12, 0.5), R(1.5, 0.06, -0.5, 0.2), 0x8d8a82));
  geos.push(bake(new THREE.BoxGeometry(0.1, 0.04, 0.06), R(1.55, 0.14, -0.5, 0.2), 0xd8c25a));
  const g = finishSite(name, geos, position);
  g.children[0].userData.colliderBoxes = orientedSolids(position, ry, [[0, 0, 0.5, 0.5], [-1.5, -0.2, 0.9, 0.45]]); // pump post + matka stand
  g.rotation.y = ry;
  return g;
}

/** Mela + wedding ground (SW outskirts): trampled open field, shamiana tent on poles, string-light mast, a ferris-wheel-free swing frame. */
export function createMelaGround(position) {
  const geos = [];
  geos.push(flatBlob(28, 7, 0.03, 0xb59a6a));
  // Shamiana: striped canopy on corner poles with a low stage.
  const stripe = [0xc4372f, 0xe8d9b0, 0xd8a22a, 0x2f7d5b];
  for (let i = 0; i < 8; i++) geos.push(bake(new THREE.BoxGeometry(2.5, 0.06, 12), new THREE.Matrix4().makeRotationZ(i % 2 ? 0.0 : 0.0).setPosition(-8.75 + i * 2.5, 4.4, 0), stripe[i % 4]));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.CylinderGeometry(0.1, 0.1, 4.4, 8), at(sx * 9.7, 2.2, sz * 5.7), 0x6f5233));
  geos.push(bake(new THREE.BoxGeometry(5, 0.7, 3), at(0, 0.35, -4), 0x9a5f3c));
  geos.push(bake(new THREE.BoxGeometry(5, 0.05, 3), at(0, 0.72, -4), 0xc4372f));
  for (let i = 0; i < 4; i++) geos.push(bake(new THREE.BoxGeometry(5, 0.4, 0.5), at(0, 0.25, -0.5 + i * 1.5), 0x8e969c)); // plastic-free bench rows (tin)
  // Swing frame (jhoola).
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.1, 0.1, 4, 6), new THREE.Matrix4().makeRotationZ(sx * 0.2).setPosition(15 + sx * 1.6, 2, 12), 0x3a5aa6));
  geos.push(bake(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(15, 3.9, 12), 0x3a5aa6));
  for (const sx of [-0.6, 0.6]) {
    geos.push(bake(new THREE.BoxGeometry(0.03, 2.8, 0.03), at(15 + sx, 2.4, 12), 0x5a5a5a));
    geos.push(bake(new THREE.BoxGeometry(0.6, 0.06, 0.4), at(15 + sx, 1.0, 12), 0x7a5a3a));
  }
  // Stalls: three small cloth-roofed counters along the east edge.
  for (let i = 0; i < 3; i++) {
    const z = -12 + i * 6;
    geos.push(bake(new THREE.BoxGeometry(2.4, 0.9, 1.2), at(18, 0.45, z), 0x8a6a45));
    geos.push(bake(new THREE.BoxGeometry(2.8, 0.05, 2.0), new THREE.Matrix4().makeRotationX(0.1).setPosition(18, 2.4, z), stripe[(i + 1) % 4]));
    for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), at(18 + sx * 1.3, 1.2, z - 0.6), 0x5a5a5a));
  }
  return finishSite('mela_ground', geos, position, { solids: [
    [-9.7, -5.7, 0.25, 0.25], [9.7, -5.7, 0.25, 0.25], [-9.7, 5.7, 0.25, 0.25], [9.7, 5.7, 0.25, 0.25], // shamiana poles
    [0, -4, 5, 3], // stage
    ...[0, 1, 2, 3].map((i) => [0, -0.5 + i * 1.5, 5, 0.5]), // bench rows
    [13.4, 12, 0.3, 0.3], [16.6, 12, 0.3, 0.3], // swing legs
    ...[0, 1, 2].map((i) => [18, -12 + i * 6, 2.4, 1.2]), // stall counters
  ] });
}

/** Khel maidan (SE edge): rolled cricket strip, stumps, boundary rope posts, a badminton net and a low pavilion shade. */
export function createKhelMaidan(position) {
  const geos = [];
  geos.push(flatBlob(24, 3, 0.03, 0x8f9a5a));
  geos.push(bake(new THREE.BoxGeometry(3, 0.02, 20), at(0, 0.06, 0), 0xc2ab7a));
  for (const sz of [-1, 1]) for (const sx of [-0.12, 0, 0.12]) geos.push(bake(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6), at(sx, 0.4, sz * 9.2), 0xe8dcb0));
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    geos.push(bake(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), at(Math.cos(t) * 21, 0.45, Math.sin(t) * 21), 0xe8e2c8));
  }
  // Badminton net on two poles, off to one side.
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), at(11 + sx * 3.1, 0.8, 8), 0x5a5a5a));
  geos.push(bake(new THREE.BoxGeometry(6.2, 0.7, 0.02), at(11, 1.25, 8), 0xdcdcd0));
  // Pavilion shade: tin roof on four poles, a long bench.
  geos.push(bake(new THREE.BoxGeometry(6, 0.08, 2.8), new THREE.Matrix4().makeRotationX(-0.06).setPosition(-17, 2.7, 0), 0x8e969c));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.CylinderGeometry(0.07, 0.07, 2.7, 6), at(-17 + sx * 2.8, 1.35, sz * 1.2), 0x6f5233));
  geos.push(bake(new THREE.BoxGeometry(5, 0.08, 0.5), at(-17, 0.5, 1.0), 0x7a5a3a));
  return finishSite('khel_maidan', geos, position, { solids: [
    [7.9, 8, 0.2, 0.2], [14.1, 8, 0.2, 0.2], // badminton net poles
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [-17 + sx * 2.8, sz * 1.2, 0.25, 0.25]), // pavilion poles
    [-17, 1.0, 5, 0.5], // pavilion bench
  ] });
}

/** Gurukul inter college (SE, outside the abadi): two-storey classroom block around a yard with a gate and a flagless mast. */
export function createGurukul(position) {
  const geos = [];
  const wall = 0xe8d9b4, band = 0xb8574a;
  for (const [w, d, x, z, ry] of [[22, 7, 0, -9, 0], [7, 18, -7.5, 1, 0]]) {
    geos.push(bake(new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3), at(x, 0.2, z), 0x8f8878));
    geos.push(bake(new THREE.BoxGeometry(w, 7, d), at(x, 3.9, z), wall));
    geos.push(bake(new THREE.BoxGeometry(w + 0.1, 0.5, d + 0.1), at(x, 3.9, z), band));
    geos.push(bake(new THREE.BoxGeometry(w + 0.5, 0.25, d + 0.5), at(x, 7.55, z), 0x8d8a82));
    const zf = z + d / 2 + 0.03;
    if (w > d) {
      for (let i = 0; i < 6; i++) for (const y of [2.2, 5.6]) windowOpening(geos, at(x - w / 2 + 2 + i * 3.6, y, zf - 0.03), 1.3, 1.3);
    } else {
      // Side block: windows on its +x yard face and a door at the south end.
      for (let i = 0; i < 4; i++) for (const y of [2.2, 5.6]) windowOpening(geos, at(x + w / 2 + 0.0, y, z - d / 2 + 3 + i * 4, Math.PI / 2), 1.3, 1.3);
      doorOpening(geos, at(x + w / 2, 0.4, z + d / 2 - 2.2, Math.PI / 2), 1.3, 2.3);
    }
  }
  doorOpening(geos, at(0, 0.4, -5.47), 1.6, 2.5); // main entrance, long block
  // Verandah colonnade on the yard side of the long block.
  for (let i = 0; i < 6; i++) geos.push(bake(new THREE.CylinderGeometry(0.2, 0.24, 3.2, 8), at(-9 + i * 3.6, 1.8, -4.9), 0xe9e2cf));
  geos.push(bake(new THREE.BoxGeometry(22, 0.25, 2), at(0, 3.5, -4.9), 0xd8d2c0));
  // Yard wall with gate pillars at the open side.
  geos.push(bake(new THREE.BoxGeometry(14, 1.6, 0.3), at(9, 0.8, 12), 0xe0d2b0));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(0.9, 2.8, 0.9), at(2 + sx * 2.2, 1.4, 12), 0xcdbf9a));
  geos.push(bake(new THREE.CylinderGeometry(0.06, 0.08, 8, 6), at(6, 4, 4), 0x9a9a9a));
  return finishSite('gurukul', geos, position, { solids: [
    [0, -9, 22.3, 7.3], [-7.5, 1, 7.3, 18.3], // classroom blocks
    ...[0, 1, 2, 3, 4, 5].map((i) => [-9 + i * 3.6, -4.9, 0.5, 0.5]), // verandah columns
    [9, 12, 14, 0.4], [-0.2, 12, 1.0, 1.0], [4.2, 12, 1.0, 1.0], // yard wall + gate pillars
    [6, 4, 0.2, 0.2], // flag mast
  ] });
}

/** Old haveli (MAP.md, east, quiet): two-storey courtyard mansion, faded ochre plaster, arched-front jharokhas, closed carved gate, quiet and cared-for. */
export function createOldHaveli(position) {
  const geos = [];
  const wall = 0xd9b98a, trim = 0xf0e6cf, wood = 0x5a3a24;
  // Four ranges around a 10 x 10 m courtyard (open to the sky), 20 x 20 m outer footprint.
  const ranges = [[20, 5, 0, -7.5], [20, 5, 0, 7.5], [5, 10, -7.5, 0], [5, 10, 7.5, 0]];
  geos.push(bake(new THREE.BoxGeometry(21, 0.4, 21), at(0, 0.2, 0), 0x9a9486));
  for (const [w, d, x, z] of ranges) {
    geos.push(bake(new THREE.BoxGeometry(w, 7.6, d), at(x, 4.2, z), wall));
    geos.push(bake(new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3), at(x, 8.2, z), trim));
    geos.push(bake(new THREE.BoxGeometry(w + 0.1, 0.5, d + 0.1), at(x, 4.4, z), trim));
  }
  // Parapet with small corner chhatris on the roof.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) geos.push(bake(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 6), at(sx * 8.5 + dx, 9.5, sz * 8.5 + dz), trim));
    geos.push(bake(new THREE.CylinderGeometry(0.1, 1.5, 0.9, 10), at(sx * 8.5, 10.9, sz * 8.5), 0xc8a66f));
  }
  // Front (+z) face: big arched gate, pairs of shuttered windows, two projecting wooden jharokhas upstairs.
  const zf = 10.04;
  geos.push(bake(new THREE.BoxGeometry(3.4, 3.8, 0.3), at(0, 2.3, zf), wood));
  geos.push(bake(new THREE.CylinderGeometry(1.7, 1.7, 0.3, 14, 1, false, Math.PI / 2, Math.PI), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, 4.2, zf), wood));
  geos.push(bake(new THREE.BoxGeometry(4.4, 0.35, 0.5), at(0, 6.0, zf), trim));
  doorOpening(geos, at(0, 0.4, zf + 0.12), 2.2, 3.2, 0x4a2f1c, 0x2a1c12, 0xb8ae98); // gate leaf, frame, hinges, handle
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const x = sx * (4.2 + i * 2.6);
      windowOpening(geos, at(x, 2.4, zf - 0.04), 0.95, 1.5, wood, trim);
      windowOpening(geos, at(x, 5.9, zf - 0.04), 0.95, 1.4, wood, trim);
    }
    geos.push(bake(new THREE.BoxGeometry(2.4, 1.9, 0.9), at(sx * 7.6, 5.7, zf + 0.35), wood));
    geos.push(bake(new THREE.BoxGeometry(2.7, 0.2, 1.1), at(sx * 7.6, 6.75, zf + 0.35), trim));
  }
  // Courtyard: tulsi chabutra and a swept stone floor.
  geos.push(bake(new THREE.BoxGeometry(9.4, 0.12, 9.4), at(0, 0.46, 0), 0xb8ae98));
  geos.push(bake(new THREE.BoxGeometry(1, 0.9, 1), at(0, 0.85, 0), 0xe6dcc4));
  geos.push(bake(new THREE.SphereGeometry(0.35, 8, 6), at(0, 1.5, 0), 0x4e6b3a));
  // Low boundary wall and gate approach.
  for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(10, 1.2, 0.3), at(sx * 11, 0.6, 14), 0xd8c9a4));
  geos.push(bake(new THREE.BoxGeometry(12, 0.06, 4), at(0, 0.03, 12), 0xb09a78));
  return finishSite('old_haveli', geos, position, { solids: ranges.map(([w, d, x, z]) => [x, z, w, d]) });
}

/** Gaushala (MAP.md, village edge): long open-sided cattle shed on posts, tin roof, feed trough, bhoosa heap, a few resting cows. */
export function createGaushala(position) {
  const geos = [];
  const L = 24, D = 8;
  geos.push(bake(new THREE.BoxGeometry(L + 2, 0.12, D + 2), at(0, 0.06, 0), 0x8a7458));
  for (let i = 0; i <= 6; i++) for (const sz of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.12, 0.14, 3.4, 8), at(-L / 2 + i * (L / 6), 1.7, sz * D / 2), 0x6f5233));
  // Back wall (mud-plaster) and a sloped tin roof.
  geos.push(bake(new THREE.BoxGeometry(L, 2.6, 0.3), at(0, 1.3, -D / 2), 0xb89a74));
  geos.push(bake(new THREE.BoxGeometry(L + 1.2, 0.1, D + 1.6), new THREE.Matrix4().makeRotationX(0.1).setPosition(0, 3.6, 0), 0x8e969c));
  // Feed trough (cement) along the front and a hay heap at one end.
  geos.push(bake(new THREE.BoxGeometry(L - 4, 0.5, 0.7), at(0, 0.3, D / 2 - 1.2), 0xa8a39a));
  geos.push(bake(new THREE.BoxGeometry(L - 4.4, 0.08, 0.5), at(0, 0.58, D / 2 - 1.2), 0xc7a85a));
  geos.push(bake(new THREE.SphereGeometry(2.2, 10, 8), at(L / 2 - 2.5, 0.6, -D / 2 + 1.8), 0xa88f52));
  // Cows resting on the swept floor: barrel body, head, legs folded; per-cow hide colour.
  const hides = [0xe8e0d0, 0x8a6a4a, 0xd9cdb8, 0x5a4636, 0xb59a7c];
  for (let i = 0; i < 5; i++) {
    const x = -L / 2 + 3.2 + i * 4.3, z = -0.6 + (i % 2) * 0.8, ry = (i % 2 ? 0.15 : -0.1);
    geos.push(bake(new THREE.BoxGeometry(1.7, 0.75, 0.8), at(x, 0.55, z, ry), hides[i]));
    geos.push(bake(new THREE.BoxGeometry(0.5, 0.45, 0.45), at(x + 1.0, 0.8, z, ry), hides[i]));
    geos.push(bake(new THREE.BoxGeometry(0.3, 0.2, 0.2), at(x + 1.3, 0.7, z, ry), 0x5a4a40));
    geos.push(bake(new THREE.BoxGeometry(0.3, 0.3, 0.25), at(x + 0.5, 0.95, z + 0.1, ry), hides[i]));
  }
  // Swept yard with a water tub and a low wall to the road.
  geos.push(bake(new THREE.CylinderGeometry(0.7, 0.8, 0.5, 12), at(-L / 2 - 2, 0.25, D / 2 + 2), 0x9a948a));
  geos.push(bake(new THREE.BoxGeometry(L + 2, 0.8, 0.25), at(0, 0.4, D / 2 + 5), 0xcfc2a2));
  return finishSite('gaushala', geos, position, { solids: [[0, -D / 2, L, 0.4], [0, D / 2 - 1.2, L - 4, 0.7], [-L / 2 - 2, D / 2 + 2, 1.6, 1.6], [L / 2 - 2.5, -D / 2 + 1.8, 3.6, 3.6]] }); // + feed trough, water tub, hay heap
}

/** Mandi (town market past the highway, MAP.md): paved yard, grain godown, vegetable yard shed, big weighbridge, dhaba and parked trucks. Unbranded. */
function truck(geos, x, z, body, ry = 0) {
  const m = (lx, y, lz) => { const v = new THREE.Vector3(lx, y, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); return at(x + v.x, v.y, z + v.z, ry); };
  geos.push(bake(new THREE.BoxGeometry(2.5, 0.35, 8), m(0, 0.9, -0.5), 0x2f2f33));
  geos.push(bake(new THREE.BoxGeometry(2.5, 2.4, 5.6), m(0, 2.3, -1.7), body));
  geos.push(bake(new THREE.BoxGeometry(2.5, 1.9, 2.0), m(0, 1.95, 2.6), 0x3b6ea0));
  geos.push(bake(new THREE.BoxGeometry(2.3, 0.7, 0.1), m(0, 2.4, 3.62), 0x2a2f33));
  for (const sx of [-1, 1]) for (const lz of [2.4, -2.2, -3.6]) geos.push(bake(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 12), (() => { const mm = m(sx * 1.25, 0.55, lz); return mm.multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)); })(), 0x1d1d1f));
}

export function createMandi(position) {
  const geos = [];
  // Paved yard slab with a kerb line, wide connecting road back to the highway.
  geos.push(bake(new THREE.BoxGeometry(24, 0.12, 74), at(0, 0.06, 0), 0x8f8e88));
  geos.push(bake(new THREE.BoxGeometry(14, 0.1, 10), at(-18, 0.05, 0), 0x3d3d40));
  geos.push(bake(new THREE.BoxGeometry(0.3, 0.2, 74), at(-12.1, 0.1, 0), 0xb4b0a4));
  // Grain wholesale godown: long warehouse, tin roof, big sliding doors, sacks stacked outside.
  geos.push(bake(new THREE.BoxGeometry(10, 5, 18), at(5, 2.6, -22), 0xe0d2b0));
  geos.push(bake(new THREE.BoxGeometry(10.06, 1.1, 18.06), at(5, 0.7, -22), 0xb8574a));
  geos.push(bake(new THREE.BoxGeometry(10.8, 0.12, 19), new THREE.Matrix4().makeRotationZ(0.1).setPosition(5, 5.6, -22), 0x8e969c));
  for (const lz of [-27, -17]) geos.push(bake(new THREE.BoxGeometry(0.2, 3.4, 4), at(-0.05, 1.9, lz), 0x4f6b7a));
  for (const lz of [-27, -17]) doorOpening(geos, at(-0.1, 0.12, lz, -Math.PI / 2), 3.4, 3.2, 0x3f5b6a, 0x2a2f33, 0xb4b0a4);
  for (const lz of [-24.5, -19.5]) windowOpening(geos, at(-0.1, 4.0, lz, -Math.PI / 2), 0.9, 0.7);
  for (let i = 0; i < 12; i++) geos.push(bake(new THREE.BoxGeometry(0.9, 0.35, 0.55), at(-2.6 + (i % 4) * 0.95 * 0.0, 0.3 + Math.floor(i / 4) * 0.36, -22 + (i % 4) * 1.0 - 1.5), 0xd9c9a2));
  // Vegetable wholesale yard: open pillared tin shed, crates and gunny heaps.
  geos.push(bake(new THREE.BoxGeometry(12, 0.1, 14), new THREE.Matrix4().makeRotationX(0.05).setPosition(4, 3.4, 4), 0x8e969c));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) geos.push(bake(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6), at(4 + sx * 5.5, 1.7, 4 + sz * 6.5), 0x6f5233));
  const veg = [0xb5472f, 0x5f8a3a, 0xd9a43a, 0x7b4a8a, 0xc9c27a];
  for (let i = 0; i < 14; i++) {
    const cx = 0 + (i % 5) * 2.0, cz = 0 + Math.floor(i / 5) * 3.2;
    geos.push(bake(new THREE.BoxGeometry(1.1, 0.4, 0.8), at(cx, 0.32, cz), 0x9a7a4a));
    geos.push(bake(new THREE.BoxGeometry(0.95, 0.22, 0.65), at(cx, 0.6, cz), veg[i % veg.length]));
  }
  // Bigger weighing station: long platform, cabin with display board, boom barrier.
  geos.push(bake(new THREE.BoxGeometry(4.5, 0.25, 20), at(-6, 0.13, 22), 0x6d6d70));
  geos.push(bake(new THREE.BoxGeometry(3.9, 0.05, 19.4), at(-6, 0.28, 22), 0x8a8a8c));
  geos.push(bake(new THREE.BoxGeometry(3.4, 3, 3.4), at(-11, 1.5, 22), 0xdcd2b8));
  windowOpening(geos, at(-9.3, 1.9, 22, Math.PI / 2), 1.2, 0.9); // cabin window onto the weighing platform
  doorOpening(geos, at(-11, 0.12, 23.7), 0.9, 2.0);
  geos.push(bake(new THREE.BoxGeometry(3.8, 0.2, 3.8), at(-11, 3.1, 22), 0x8d8a82));
  geos.push(bake(new THREE.BoxGeometry(1.6, 0.8, 0.15), at(-11, 3.8, 20.2), 0x2a2a2a));
  geos.push(bake(new THREE.BoxGeometry(5, 0.1, 0.1), at(-6, 1.1, 12.5), 0xd8d2c2));
  geos.push(bake(new THREE.BoxGeometry(0.1, 0.1, 0.1), at(-8.5, 1.1, 12.5), 0xc4372f));
  // Dhaba: low truck-stop eatery with a tin verandah, charpais and a tandoor chimney.
  geos.push(bake(new THREE.BoxGeometry(9, 3.2, 6), at(5, 1.75, 32), 0xe4cfa0));
  geos.push(bake(new THREE.BoxGeometry(9.06, 0.4, 6.06), at(5, 0.9, 32), 0xb8574a));
  doorOpening(geos, at(2.6, 0.12, 29.0), 1.3, 2.2);
  windowOpening(geos, at(7.4, 2.0, 29.0), 1.4, 1.1);
  geos.push(bake(new THREE.BoxGeometry(10.5, 0.1, 9), new THREE.Matrix4().makeRotationX(-0.07).setPosition(5, 3.6, 30), 0x8e969c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), at(5 + sx * 4.8, 1.7, 26), 0x6f5233));
  geos.push(bake(new THREE.CylinderGeometry(0.3, 0.38, 2, 8), at(8.5, 4.2, 33), 0xb0a590));
  for (let i = 0; i < 4; i++) charpaiGeos(geos, 1.5 + i * 2.1, 25, Math.PI / 2 + (i % 2 ? 0.05 : -0.04));
  geos.push(bake(new THREE.BoxGeometry(0.1, 0.9, 3), at(3.3, 2.55, 29.01), 0x2f5f4a));
  // Parked trucks in plain colours (no marks).
  truck(geos, 3, -2, 0xc4372f, 0.0);
  truck(geos, 9, 48, 0x3f7a5a, Math.PI);
  truck(geos, -4, 40, 0xd9a43a, 0.12);
  const mandi = finishSite('mandi', geos, position, { roughness: 0.92 });
  const truckSolid = (x, z, ry) => [x - Math.sin(ry) * 0.5, z - Math.cos(ry) * 0.5, 2.7, 8.6, ry]; // body centre sits 0.5 m behind the origin along the truck's own axis
  const rects = [
    [5, -22, 10.2, 18.2], // grain godown
    [5, 32, 9.2, 6.2], // dhaba hall
    [-11, 22, 3.6, 3.6], // weighbridge cabin
    ...[-1, 1, 0].flatMap((sx) => [-1, 1].map((sz) => [4 + sx * 5.5, 4 + sz * 6.5, 0.35, 0.35])), // vegetable shed poles
    ...[0, 1, 2].map((r) => [4, r * 3.2, 9.4, 0.9]), // crate rows
    truckSolid(3, -2, 0), truckSolid(9, 48, Math.PI), truckSolid(-4, 40, 0.12),
    ...[0, 1, 2, 3].map((i) => [1.5 + i * 2.1, 25, 1.9, 1.0, Math.PI / 2 + (i % 2 ? 0.05 : -0.04)]), // dhaba charpais
  ];
  mandi.children[0].userData.colliderBoxes = orientedSolids(position, 0, rects);
  return mandi;
}

/** Kachcha canal-bank road (MAP.md: "kachcha bank roads on both sides"): packed-earth track on the field side of the nahar with twin tyre ruts, a grassy verge, cart-wheel dung patches and marker pegs. Visual only, no colliders. */
export function createCanalBankRoad(position, name = 'canal_bank_road') {
  const geos = [];
  const L = 84; // x -42..42 around the position
  const strip = (w, y, x0, x1, z, color) => geos.push(bake(new THREE.BoxGeometry(x1 - x0, 0.02, w), at((x0 + x1) / 2, y, z), color));
  let seed = name === 'canal_bank_road' ? 7 : 19;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Track bed in a few slightly different earth tones so it never reads as one flat ribbon.
  for (let i = 0; i < 12; i++) {
    const x0 = -L / 2 + (i * L) / 12, x1 = x0 + L / 12 + 0.2;
    strip(3.2 + rnd() * 0.5, 0.035, x0, x1, rnd() * 0.3 - 0.15, [0x9a8560, 0x8f7a56, 0xa38e68][i % 3]);
  }
  // Twin worn ruts; the verge is left to the ground's own grass so no hard-edged green rectangles show.
  for (const rz of [-0.85, 0.85]) strip(0.35, 0.05, -L / 2, L / 2, rz, 0x6f5d3f);
  // Faint dust-pale patches between the ruts, broken up so the bed has no repeating stripe.
  for (let i = 0; i < 14; i++) { const x0 = -L / 2 + rnd() * (L - 6); strip(0.5 + rnd() * 0.5, 0.045, x0, x0 + 2 + rnd() * 4, (rnd() - 0.5) * 0.8, 0xb09d76); }
  // Dung-cake patches and small stones: lived-in, not dirty.
  for (let i = 0; i < 9; i++) geos.push(bake(new THREE.CylinderGeometry(0.28, 0.3, 0.05, 8), at(-L / 2 + rnd() * L, 0.06, rnd() * 3 - 1.5), 0x6a5a3a));
  for (let i = 0; i < 14; i++) geos.push(bake(new THREE.DodecahedronGeometry(0.1 + rnd() * 0.08, 0), at(-L / 2 + rnd() * L, 0.08, (rnd() - 0.5) * 3.6), 0x9b9588));
  // Whitewashed marker pegs every 20 m, as on irrigation channels.
  for (let i = 0; i < 5; i++) geos.push(bake(new THREE.BoxGeometry(0.18, 0.7, 0.18), at(-L / 2 + 6 + i * 18, 0.35, 2.1), 0xe6e0cf));
  return finishSite(name, geos, position);
}

/**
 * Village boundary wall (MAP.md organic edge): a low, cared-for compound wall of lime-washed plaster on a
 * brick-red plinth with cement coping, pilasters every 4 m and a gap for each lane that leaves the abadi.
 * `runs` are world-space {a:{x,z}, b:{x,z}} segments; `gaps` are world-space {x,z,w} openings. Visual only, no colliders.
 */
export function createBoundaryWall(position, name, runs, gaps = []) {
  const geos = [];
  const plants = [];
  const H = 1.15, T = 0.24;
  const tones = [0xe4dcc6, 0xdcd2b8, 0xe9d9bf, 0xd8d4c4];
  let seed = 31;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const inGap = (x, z) => gaps.some((g) => Math.hypot(x - g.x, z - g.z) < g.w / 2 + 0.2);
  for (const { a, b } of runs) {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const ang = Math.atan2(-(b.z - a.z), b.x - a.x); // makeRotationY(ang) maps +x onto the run direction
    const dx = (b.x - a.x) / len, dz = (b.z - a.z) / len;
    const SEG = 4;
    const n = Math.ceil(len / SEG);
    for (let i = 0; i < n; i++) {
      const s0 = i * SEG, s1 = Math.min(len, s0 + SEG), sl = s1 - s0;
      const mx = a.x + dx * (s0 + s1) / 2 - position.x, mz = a.z + dz * (s0 + s1) / 2 - position.z;
      if (inGap(mx + position.x, mz + position.z)) continue;
      const hh = H * (0.94 + rnd() * 0.12);
      geos.push(bake(new THREE.BoxGeometry(sl, 0.4, T + 0.04), at(mx, 0.2, mz, ang), 0x9a5a3e)); // brick-red plinth
      geos.push(bake(new THREE.BoxGeometry(sl, hh - 0.4, T), at(mx, 0.4 + (hh - 0.4) / 2, mz, ang), tones[Math.floor(rnd() * tones.length)]));
      geos.push(bake(new THREE.BoxGeometry(sl + 0.04, 0.07, T + 0.1), at(mx, hh + 0.035, mz, ang), 0xb8b3a6)); // coping
      const px = a.x + dx * s0 - position.x, pz = a.z + dz * s0 - position.z;
      if (!inGap(px + position.x, pz + position.z)) geos.push(bake(new THREE.BoxGeometry(0.34, hh + 0.28, 0.34), at(px, (hh + 0.28) / 2, pz, ang), 0xd6cfba)); // pilaster
      // wall-base greenery, one side or the other, sparse so the wall still reads
      if (!inGap(mx + position.x, mz + position.z) && rnd() < 0.55) {
        const side = rnd() < 0.5 ? 1 : -1, off = side * (T / 2 + 0.55);
        const r = rnd();
        const kind = r < 0.3 ? GARDEN_KIND.BOUGAINVILLEA : r < 0.55 ? GARDEN_KIND.MARIGOLD : r < 0.85 ? GARDEN_KIND.CREEPER : GARDEN_KIND.BANANA;
        const wx = mx + position.x, wz = mz + position.z;
        plants.push(kind === GARDEN_KIND.CREEPER
          ? { x: wx - dz * side * (T / 2 + 0.06), z: wz + dx * side * (T / 2 + 0.06), kind, scale: 0.4 }
          : { x: wx - dz * off, z: wz + dx * off, kind, scale: kind === GARDEN_KIND.BANANA ? 0.8 : 1 });
      }
    }
  }
  const group = finishSite(name, geos, position);
  const mesh = buildGardenPlants(plants);
  if (mesh) { mesh.position.set(-position.x, 0, -position.z); group.add(mesh); }
  return group;
}
