import { dairyGoods, chemistGoods, buildGoodsMesh, DESIGN as GOODS } from './shopGoods.js';
import { createNPC } from './npc.js';
import { placeBoardsMesh } from './placeBoards.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildGardenPlants, GARDEN_KIND } from './vegetation.js';
import { getTiledMaterial } from './materials.js';
import { buildClothesline } from './laundry.js';
import { getGLTFLoader } from './loaders.js';
import { createWaterMaterial, blobWaterGeometry } from './water.js';

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
  const { roughness = 0.9, metalness, earth, set, ...rest } = opts;
  const water = roughness < 0.3;
  if (water) return new THREE.MeshStandardMaterial({ name: 'site_water', vertexColors: true, roughness, metalness, ...rest });
  const base = getTiledMaterial(set || (earth || roughness >= 1 ? 'ground' : 'plaster'), { repeatX: 1, repeatY: 1, vertexColors: true });
  const m = base.clone();
  m.name = 'site_props';
  m.aoMap = null;
  m.roughness = roughness;
  m.color.setScalar(1.7); // the scans are mid-grey; lift so the baked colours keep their value
  Object.assign(m, rest);
  return m;
};

/** Real lotus: a notched, slightly cupped pad with radial veins, and a flower of two rings of tapered petals (white at the base, pink at the tips) around a yellow seed head. */
function lotusPadGeo(x, z, r, rot, tone, lift = 0) {
  // Round pad, slightly cupped at the rim, with one narrow wedge notch; 28 segments so it reads round, not faceted.
  const SEG = 28, pos = [], col = [], idx = [];
  const c0 = new THREE.Color(tone), vein = c0.clone().multiplyScalar(0.72), rim = c0.clone().lerp(new THREE.Color(0x8aa04e), 0.3);
  pos.push(0, 0, 0); col.push(vein.r, vein.g, vein.b);
  const rings = [[0.45, 0.0, c0], [0.8, 0.012, c0.clone().multiplyScalar(0.94)], [1.0, 0.04, rim]];
  for (const [f, y, c] of rings) {
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const inNotch = i === 3 || i === 4; // the pad's radial slit, pulled in toward the stalk
      const ff = inNotch ? f * 0.12 : f;
      pos.push(Math.cos(a) * r * ff, y, Math.sin(a) * r * ff);
      const cc = i % 2 ? c : c.clone().multiplyScalar(0.9);
      col.push(cc.r, cc.g, cc.b);
    }
  }
  for (let i = 0; i < SEG; i++) { const j = (i + 1) % SEG; idx.push(0, 1 + j, 1 + i); }
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < SEG; i++) {
      const j = (i + 1) % SEG, a0 = 1 + k * SEG;
      idx.push(a0 + i, a0 + j, a0 + SEG + i, a0 + j, a0 + SEG + j, a0 + SEG + i);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.rotateY(rot);
  g.translate(x, 0.11 + lift, z);
  return bakeUv(g);
}
function lotusFlowerGeos(x, z, s, rot) {
  const geos = [];
  // A petal is a 4x5 grid: lens-shaped outline (widest at 40%), cupped inward along its length, base cream to tip pink.
  const petal = (len, wid, lean, ang, y0, tip, base) => {
    const NU = 4, NV = 5, pos = [], col = [], idx = [];
    const c0 = new THREE.Color(base), c1 = new THREE.Color(tip);
    for (let v = 0; v < NV; v++) {
      const t = v / (NV - 1);
      const w = wid * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75) * 0.97 + 0.04), 0.8) * 0.5;
      for (let u = 0; u < NU; u++) {
        const f = u / (NU - 1) * 2 - 1;
        pos.push(f * w, t * len, -0.55 * len * t * t + 0.35 * wid * f * f * (0.4 + t));
        const k = Math.pow(t, 1.2), c = c0.clone().lerp(c1, k);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let v = 0; v < NV - 1; v++) for (let u = 0; u < NU - 1; u++) {
      const i = v * NU + u;
      idx.push(i, i + 1, i + NU, i + 1, i + NU + 1, i + NU);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.rotateX(lean);
    g.rotateY(ang);
    g.translate(0, y0, 0);
    g.computeVertexNormals();
    return g;
  };
  for (let i = 0; i < 9; i++) geos.push(petal(0.34, 0.2, 1.05, (i / 9) * Math.PI * 2 + rot, 0.0, 0xec9db9, 0xfaf0ee));          // outer ring, open
  for (let i = 0; i < 7; i++) geos.push(petal(0.3, 0.19, 0.62, (i / 7) * Math.PI * 2 + rot + 0.3, 0.012, 0xf2adc6, 0xfbf3f0)); // middle ring
  for (let i = 0; i < 5; i++) geos.push(petal(0.24, 0.16, 0.25, (i / 5) * Math.PI * 2 + rot + 0.6, 0.02, 0xf5bccf, 0xfcf6f2)); // inner ring, upright
  geos.push(new THREE.CylinderGeometry(0.05, 0.035, 0.05, 8).translate(0, 0.09, 0));                                               // seed head
  geos[geos.length - 1] = bake(geos[geos.length - 1], new THREE.Matrix4(), 0xd9b73a);
  for (let k = 0; k < geos.length - 1; k++) geos[k].computeVertexNormals();
  return geos.map((g, i) => {
    if (i < geos.length - 1) { g.deleteAttribute('uv'); }
    const m = new THREE.Matrix4().makeScale(s, s, s).setPosition(x, 0.13, z);
    g.applyMatrix4(m);
    return i < geos.length - 1 ? bakeUv(g) : g;
  });
}
/** Box-projected UVs for a geometry that already has colours (bake() does this for plain geometry; petals carry their own colours). */
function bakeUv(g) {
  const n = g.attributes.position.count, pos = g.attributes.position, uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { uv[i * 2] = pos.getX(i) / 1.4; uv[i * 2 + 1] = pos.getZ(i) / 1.4; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

/** Soft outer shoulder: bands of the same blob outline stepping from dry mud into the surrounding grass tone, so the ring has no crisp rim. */
function softShoulder(rIn, rOut, seed, cIn, cOut, y, bands = 4) {
  const N = 28, pts = (r) => blobShape(r, seed).getPoints().slice(0, N);
  const a = new THREE.Color(cIn), b = new THREE.Color(cOut);
  const pos = [], col = [], idx = [];
  for (let k = 0; k <= bands; k++) {
    const t = k / bands, c = a.clone().lerp(b, t * t * (3 - 2 * t));
    for (const p of pts(rIn + (rOut - rIn) * t)) { pos.push(p.x, 0, -p.y); col.push(c.r, c.g, c.b); }
  }
  for (let k = 0; k < bands; k++) for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, i0 = k * N + i, j0 = k * N + j, i1 = (k + 1) * N + i, j1 = (k + 1) * N + j;
    idx.push(i0, i1, j0, j0, i1, j1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) g.setIndex(idx.map((v, i, arr) => arr[i - (i % 3) + [0, 2, 1][i % 3]]));
  g.computeVertexNormals();
  g.translate(0, y, 0);
  const n = g.attributes.position.count, uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { uv[i * 2] = g.attributes.position.getX(i) / 1.4; uv[i * 2 + 1] = g.attributes.position.getZ(i) / 1.4; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g.toNonIndexed();
}

/** Wet-earth shoreline ring: pale dried-crack mud outside, dark glistening wet mud inside, with footprints-sized pebbles. Earth set at low roughness so the wet band catches light. */
function shoreGeos(radius, seed, rnd) {
  const geos = [];
  geos.push(flatBlob(radius * 1.32, seed, 0.02, 0x8a7656));   // dry cracked outer mud
  geos.push(softShoulder(radius * 1.3, radius * 1.7, seed, 0x8a7656, 0x92b068, 0.016, 5));
  geos.push(flatBlob(radius * 1.18, seed, 0.024, 0x7a6848));  // damp mud
  geos.push(flatBlob(radius * 1.06, seed, 0.028, 0x594a35));  // wet dark mud at the waterline
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = radius * (1.05 + rnd() * 0.2), k = 0.04 + rnd() * 0.08;
    geos.push(bake(new THREE.SphereGeometry(k, 6, 4), new THREE.Matrix4().makeScale(1, 0.55, 1).setPosition(Math.cos(a) * r, 0.04, Math.sin(a) * r), 0x8d8676));
  }
  return geos;
}

/** Village pond: wet-mud shoreline, depth-tinted rippling water with a soft edge, real lotus pads and flowers, a bathing ghat. */
export function createPond(position) {
  const group = new THREE.Group();
  group.name = 'pond';
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  // Bathing ghat: two stepped cement slabs and a washing stone on the east bank (merged into the shore mesh: one draw call).
  const shore = shoreGeos(9.6, 1.3, rnd);
  for (let i = 0; i < 3; i++) shore.push(bake(new THREE.BoxGeometry(2.6 - i * 0.3, 0.16, 0.7), at(10.4 - i * 0.7, 0.08 + i * 0.15, 0.0, Math.PI / 2), 0xb4ac98));
  shore.push(bake(new THREE.BoxGeometry(0.9, 0.35, 0.55), at(11.9, 0.18, 2.0, 0.4), 0x8d8676));
  const bank = new THREE.Mesh(mergeGeometries(shore), vcMat({ roughness: 1 }));
  bank.receiveShadow = true;
  bank.userData.colliderBoxes = solidBoxes(position, discSolids(0, 0, 8.4)); // water body, inside the blob's narrowest radius so the shore stays walkable
  group.add(bank);
  const water = new THREE.Mesh(blobWaterGeometry(9.6, 1.3, 0.06), createWaterMaterial({ shallow: 0x80784a, deep: 0x34402c, scale: 1.1 }));
  water.name = 'pond_water';
  water.receiveShadow = true;
  group.add(water);

  // Lotus: pads (notched, veined, cupped) and flowers (two petal rings + seed head), clustered not uniform.
  const geos = [];
  for (let c = 0; c < 4; c++) { // clusters near the shore sides, as lotus grows in the shallows
    const ca = rnd() * Math.PI * 2, cr = 4.8 + rnd() * 1.8;
    for (let i = 0; i < 16; i++) {
      const a = ca + (rnd() - 0.5) * 1.0, r = cr + (rnd() - 0.5) * 2.4;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, size = 0.6 + rnd() * 0.6;
      geos.push(lotusPadGeo(x, z, size, rnd() * 6.28, i % 3 ? 0x4a6e30 : 0x5d8238, (i % 5) * 0.012));
      if (i % 4 === 0) geos.push(...lotusFlowerGeos(x + 0.5, z + 0.3, 1.5 + rnd() * 0.5, rnd() * 6.28));
    }
  }
  const lotus = new THREE.Mesh(mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g))), vcMat({ roughness: 0.8 }));
  lotus.material.side = THREE.DoubleSide;
  lotus.castShadow = false;
  lotus.receiveShadow = true;
  group.add(lotus);
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
  const water = new THREE.Mesh(mergeGeometries([
    new THREE.BoxGeometry(3.0, 0.04, 3.0).translate(cx, 0.5, cz),
    new THREE.BoxGeometry(0.22, 0.03, 4.3).translate(cx + 1.9, 0.12, cz + 3.8),
  ]), createWaterMaterial({ shallow: 0x6f7550, deep: 0x4a5636, depth: 0.55, scale: 2.2, opacity: 0.96 }));
  water.name = 'tubewell_water';
  // Woven charpai in the kothri's shade.
  charpaiGeos(geos, -0.5, 2.7, 0.15);
  // Two bhoosa haystacks behind the kothri (fodder kept next to the pump), a smaller one leaning beside them.
  const hay = [[-7.5, -5.5, 0.62, 1, 0xb4a276], [-9.8, -2.6, 0.5, 2, 0xc0ad80], [-5.2, -7.6, 0.38, 0, 0xa59468]];
  const hayGeos = [];
  for (const [x, z, k, n, tone] of hay) hayGeos.push(...haystackGeos(x, z, k, n, tone));
  const mesh = new THREE.Mesh(mergeGeometries(geos), vcMat());
  mesh.name = 'tubewell';
  // Kothri, hauz, motor and the charpai in its shade are solid (A0).
  mesh.userData.colliderBoxes = orientedSolids(position, 0, [[0, 0, 2.9, 2.5], [3.9, 0.4, 3.5, 3.5], [-2.1, 0.4, 0.6, 0.6], [-0.5, 2.7, 1.9, 1.0, 0.15], ...[[-7.5, -5.5, 0.62], [-9.8, -2.6, 0.5], [-5.2, -7.6, 0.38]].map(([x, z, k]) => [x, z, 3.2 * k, 3.2 * k])]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'tubewell_prop';
  const hayMesh = new THREE.Mesh(mergeGeometries(hayGeos), strawMaterial());
  hayMesh.name = 'tubewell_haystacks';
  hayMesh.castShadow = true;
  hayMesh.receiveShadow = true;
  group.add(mesh, water, hayMesh);
  group.position.set(position.x, 0, position.z);
  return group;
}

/** Two bhoosa haystacks stacked behind the Yadav tea stall (fodder for the dairy cattle); reuses the shared straw material. */
export function createTeaStallHaystacks(position) {
  const hay = [[0, 0, 0.6, 1, 0xb4a276], [-2.6, 2.4, 0.42, 2, 0xc0ad80]];
  const geos = [];
  for (const [x, z, k, n, tone] of hay) geos.push(...haystackGeos(x, z, k, n, tone));
  const mesh = new THREE.Mesh(mergeGeometries(geos), strawMaterial());
  mesh.name = 'tea_stall_haystacks';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.colliderBoxes = orientedSolids(position, 0, hay.map(([x, z, k]) => [x, z, 3.2 * k, 3.2 * k]));
  const group = new THREE.Group();
  group.name = 'tea_stall_haystacks_prop';
  group.add(mesh);
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
  let sr = 5;
  const rr = () => { sr = (sr * 16807) % 2147483647; return sr / 2147483647; };
  const rim = new THREE.Mesh(mergeGeometries(shoreGeos(5.4, 4.1, rr)), vcMat({ roughness: 1 }));
  rim.receiveShadow = true;
  rim.userData.colliderBoxes = solidBoxes(position, discSolids(0, 0, 4.6, 0.9));
  group.add(rim);
  const water = new THREE.Mesh(blobWaterGeometry(5.4, 4.1, 0.06, 6, 28), createWaterMaterial({ shallow: 0x77704a, deep: 0x3a4630, scale: 1.4 }));
  water.name = 'johad_water';
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

let STRAW_MAT = null;
/** Straw (bhoosa) material: canvas-drawn strand texture (fine vertical straw streaks, dark gaps, bright flecks) used as colour + bump, rough, shared by every haystack. */
function strawMaterial() {
  if (STRAW_MAT) return STRAW_MAT;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d');
  x.fillStyle = '#b8a26a'; x.fillRect(0, 0, N, N);
  let sd = 7; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    const px = r() * N, len = 20 + r() * 90, py = r() * N, g = 110 + r() * 110;
    x.strokeStyle = `rgba(${g + 30},${g},${g * 0.55},${0.25 + r() * 0.5})`; x.lineWidth = 0.6 + r() * 1.4;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 6, py + len); x.stroke();
  }
  for (let i = 0; i < 350; i++) { x.fillStyle = `rgba(60,45,20,${0.2 + r() * 0.3})`; x.fillRect(r() * N, r() * N, 1, 6 + r() * 20); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const bump = new THREE.CanvasTexture(c); bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  STRAW_MAT = new THREE.MeshStandardMaterial({ name: 'straw', map: tex, bumpMap: bump, bumpScale: 2.2, vertexColors: true, roughness: 1, metalness: 0 });
  STRAW_MAT.color.setScalar(0.85);
  return STRAW_MAT;
}

/** One bhoosa (straw) haystack: lathe profile with a bulging flank tapering to a rounded crown, jittered so it reads as piled straw, wound with a rope band. */
function haystackGeos(x, z, k, n, tone) {
  // Three stack shapes by n so neighbours differ: rounded beehive, tall peaked cone with a straw tuft, squat wide heap.
  const shapes = [
    [[1.9, 0], [2.0, 0.5], [1.95, 1.3], [1.7, 2.1], [1.2, 2.8], [0.55, 3.2], [0, 3.35]],
    [[1.7, 0], [1.85, 0.6], [1.75, 1.6], [1.45, 2.6], [0.95, 3.5], [0.4, 4.2], [0.12, 4.6], [0, 4.7]],
    [[2.2, 0], [2.3, 0.4], [2.15, 1.0], [1.7, 1.7], [1.0, 2.2], [0.45, 2.45], [0, 2.55]],
  ];
  const prof = shapes[((n % 3) + 3) % 3].map(([r, y]) => new THREE.Vector2(r * k, y * k));
  const g = new THREE.LatheGeometry(prof, 24);
  const p = g.attributes.position;
  const lean = 0.05 * Math.sin(n * 2.1 + 1);
  // Rope band radius: profile radius where it crosses height 1.0 * k.
  const hi = prof.findIndex((q) => q.y >= k);
  const a = prof[hi - 1], b = prof[hi];
  const ropeR = a.x + (b.x - a.x) * ((k - a.y) / (b.y - a.y));
  for (let v = 0; v < p.count; v++) {
    const px = p.getX(v), py = p.getY(v), pz = p.getZ(v);
    // Vertical creases where forkfuls were laid, plus a low-frequency lumpiness and a slight lean toward the crown.
    const h = Math.sin(px * 3.1 + py * 2.3 + n) * Math.cos(pz * 2.7 + py * 1.9);
    const crease = Math.sin(Math.atan2(pz, px) * 7 + n * 1.3) * 0.035;
    const f = 1 + 0.06 * h + crease;
    p.setXYZ(v, px * f * (1 + 0.05 * Math.cos(n)) + py * lean, py, pz * f * (1 - 0.05 * Math.cos(n)));
  }
  g.computeVertexNormals();
  // Trampled loose straw skirt round the base so the stack sits in the ground instead of on it.
  const skirt = new THREE.ShapeGeometry(blobShape(2.9 * k, 3 + n));
  skirt.rotateX(-Math.PI / 2);
  return [bake(skirt, at(x, 0.035, z, n * 1.7), 0x9a8656), bake(g, at(x, 0, z, n), tone), bake(new THREE.TorusGeometry(ropeR * 1.02, 0.05, 4, 16), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x, 1.0 * k, z), 0x8a7a50)];
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
  const tones = [0xb8a678, 0xa99868, 0xc0ad80, 0xa08f62];
  for (const [x, z, k, n] of stacks) geos.push(...haystackGeos(x, z, k, n, tones[n]));
  const mesh = new THREE.Mesh(mergeGeometries(geos), strawMaterial()); // threshing floor + stacks share the straw material: one draw call
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
  // Real door and two grilled windows on the +z face (shared openings: recess, frame, panels, hinges, handle, sill).
  const face = at(0, 0.35, d / 2);
  doorOpening(geos, face, 1.1, 2.1, door, 0x2f2016, band);
  const wx = Math.max(w * 0.3, 1.5);
  for (const sx of [-1, 1]) windowOpening(geos, at(sx * wx, 0.35 + 1.7, d / 2), 0.9, 1.0, 0x4a3524, 0xe9e2cf);
  return geos;
}

/** Grilled windows on the two side walls and the back wall of a smallBuilding(), so no faith-building face is a blank slab. */
function sideWindows(geos, { w, d, h }, perSide = 3) {
  const y = 0.35 + 1.7;
  for (let i = 0; i < perSide; i++) {
    const z = (i - (perSide - 1) / 2) * (d * 0.62 / Math.max(1, perSide - 1));
    for (const sx of [-1, 1]) windowOpening(geos, at(sx * w / 2, y, z, sx * Math.PI / 2), 0.9, 1.0, 0x4a3524, 0xe9e2cf);
  }
  for (const sx of [-1, 0, 1]) windowOpening(geos, at(sx * w * 0.28, y, -d / 2, Math.PI), 0.9, 1.0, 0x4a3524, 0xe9e2cf);
}

/** Rooftop parapet signboard for a smallBuilding(): centred on the +z face, sitting on the parapet. */
function parapetBoard(id, { w, d, h }, bw) {
  return { id, x: 0, y: 0.35 + h + 0.5, z: d / 2 + 0.24, w: bw ?? Math.min(w + 0.2, 4.4) };
}

/** Pipe or plank between two points (cylinder when `sq` is false, box otherwise). */
function limbGeo(a, b, r, color, sq = false, rz = r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const g = sq ? new THREE.BoxGeometry(r * 2, len, rz * 2) : new THREE.CylinderGeometry(r, r, len, 10);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return bake(g, new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), color);
}

/** Playground swing set: two A-frames, top bar, two swings on thin chains with black rubber seats, swung slightly forward. Local x = bar axis. */
function swingSetGeos(x, z, ry = 0, frame = 0x2f5fa3) {
  const geos = [], P = (lx, y, lz) => { const v = new THREE.Vector3(lx, y, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); return [x + v.x, y, z + v.z]; };
  const top = 2.3;
  for (const sx of [-1.6, 1.6]) {
    for (const sz of [-0.8, 0.8]) geos.push(limbGeo(P(sx, 0, sz), P(sx, top, 0), 0.04, frame));
    geos.push(limbGeo(P(sx, 0.9, -0.36), P(sx, 0.9, 0.36), 0.025, frame)); // cross brace
    for (const sz of [-0.8, 0.8]) geos.push(bake(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), at(...P(sx, 0.03, sz)), 0x8f8a80)); // concrete footing
  }
  geos.push(limbGeo(P(-1.7, top, 0), P(1.7, top, 0), 0.05, frame));
  for (const [i, sx] of [-0.65, 0.65].entries()) {
    const sw = i ? 0.22 : 0.1; // each seat hangs at a slightly different angle
    for (const dx of [-0.2, 0.2]) {
      geos.push(limbGeo(P(sx + dx, top - 0.04, 0), P(sx + dx, 0.54, sw * 2.2), 0.012, 0x8d9296)); // chain
      geos.push(bake(new THREE.TorusGeometry(0.03, 0.008, 5, 10), at(...P(sx + dx, top - 0.04, 0)), 0x6f7378)); // top hanger ring
      geos.push(bake(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 6), at(...P(sx + dx, 0.53, sw * 2.2)), 0x6f7378)); // seat eye bolt
    }
    // moulded rubber seat: thick slab with a raised front and back lip, so it reads as a belt seat, not a plank
    geos.push(bake(new THREE.BoxGeometry(0.5, 0.05, 0.22), at(...P(sx, 0.49, sw * 2.2), ry), 0x1f1d1b));
    for (const dz of [-0.1, 0.1]) geos.push(bake(new THREE.BoxGeometry(0.5, 0.035, 0.03), at(...P(sx, 0.52, sw * 2.2 + dz), ry), 0x2a2826));
  }
  return geos;
}

/** Playground slide: ladder, railed platform, curved-lip steel chute run out along local +z. */
function slideGeos(x, z, ry = 0, frame = 0xd8a22a) {
  const geos = [], P = (lx, y, lz) => { const v = new THREE.Vector3(lx, y, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); return [x + v.x, y, z + v.z]; };
  const H = 1.25, W = 0.38;
  for (const sx of [-W, W]) {
    geos.push(limbGeo(P(sx, 0, -0.9), P(sx, H, -0.35), 0.03, frame)); // ladder stile
    geos.push(limbGeo(P(sx, 0, 0.2), P(sx, H, 0.2), 0.03, frame)); // platform post front
    geos.push(limbGeo(P(sx, H, -0.35), P(sx, H, 0.2), 0.025, frame)); // platform side
    geos.push(limbGeo(P(sx, H + 0.5, -0.35), P(sx, H + 0.5, 0.2), 0.02, frame)); // hand rail
    geos.push(limbGeo(P(sx, H, -0.35), P(sx, H + 0.5, -0.35), 0.02, frame));
    geos.push(limbGeo(P(sx, H, 0.2), P(sx, H + 0.5, 0.2), 0.02, frame));
  }
  for (let k = 1; k <= 4; k++) { const t = k / 5; geos.push(limbGeo(P(-W, H * t, -0.9 + 0.55 * t), P(W, H * t, -0.9 + 0.55 * t), 0.018, 0xb7bcc0)); } // rungs
  geos.push(bake(new THREE.BoxGeometry(W * 2, 0.04, 0.55), at(...P(0, H, -0.08), ry), 0x7a5a3a)); // wooden platform deck
  const A = P(0, H - 0.02, 0.2), B = P(0, 0.12, 2.5);
  geos.push(limbGeo(A, B, W, 0xc3c8cc, true, 0.012)); // steel chute
  for (const sx of [-W, W]) geos.push(limbGeo(P(sx, H + 0.05, 0.2), P(sx, 0.17, 2.5), 0.03, frame, true, 0.014)); // chute side lips
  for (const sz of [0.9, 1.7]) geos.push(limbGeo(P(-W, 0, sz), P(-W, H - (H * (sz - 0.2)) / 2.3 - 0.02, sz), 0.02, frame), limbGeo(P(W, 0, sz), P(W, H - (H * (sz - 0.2)) / 2.3 - 0.02, sz), 0.02, frame)); // chute props
  return geos;
}

/** Anganwadi: pink limewashed one-room childcare centre with a painted yard wall and a small slide. */
export function createAnganwadi(position) {
  const geos = smallBuilding({ w: 7, d: 5, h: 3.1, wall: 0xe0b6b0, band: 0xc9877f, door: 0x2f6b5d });
  // Low yard wall with gap in front of the door, and a kid-sized slide + seesaw.
  for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(3.6, 0.9, 0.2), at(sx * 3.5, 0.45, 6.5), 0xd9c9a8));
  geos.push(bake(new THREE.BoxGeometry(0.2, 0.9, 8), at(-5.2, 0.45, 3.0), 0xd9c9a8));
  geos.push(bake(new THREE.BoxGeometry(0.2, 0.9, 8), at(5.2, 0.45, 3.0), 0xd9c9a8));
  // Playground steel (slide, swing frame, chains, seesaw) rides the real metal PBR set in its own mesh; the building stays plaster.
  const playGeos = [...slideGeos(3.6, 3.4, 0), ...swingSetGeos(-4.3, 4.6, Math.PI / 2)];
  geos.push(bake(new THREE.BoxGeometry(0.2, 0.3, 2.4), at(-1.3, 0.2, 5.4), 0x7a5a3a));
  playGeos.push(bake(new THREE.BoxGeometry(2.6, 0.06, 0.35), at(-1.3, 0.5, 5.4, 0.1), 0x2f6b5d));
  const mesh = new THREE.Mesh(mergeGeometries(geos), vcMat());
  mesh.userData.colliderBoxes = solidBoxes(position, [[0, 0, 7.2, 5.2], [3.6, 4.0, 1.0, 1.3], [-4.3, 3.0, 1.8, 0.2], [-4.3, 6.2, 1.8, 0.2]]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'anganwadi';
  group.add(mesh);
  const play = new THREE.Mesh(mergeGeometries(playGeos), vcMat({ set: 'metal', roughness: 0.62, metalness: 0.4 }));
  play.name = 'anganwadi_playground';
  play.castShadow = true;
  group.add(play);
  group.add(placeBoardsMesh([parapetBoard('anganwadi', { w: 7, d: 5, h: 3.1 }, 3.8)], 'anganwadi_boards'));
  group.position.set(position.x, 0, position.z);
  return group;
}

/** One steel milk can, 0.78 m tall: lathe profile + lid dome + knob + two rolled bands + two side lugs. */
function milkCanGeos(x, z, rot, tone) {
  const prof = [[0.0, 0.0], [0.19, 0.0], [0.215, 0.04], [0.2, 0.08], [0.2, 0.5], [0.19, 0.56], [0.14, 0.62], [0.115, 0.66], [0.115, 0.7], [0.13, 0.71]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.LatheGeometry(prof, 18);
  const out = [bake(body, at(x, 0, z, rot), tone)];
  out.push(bake(new THREE.SphereGeometry(0.135, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.Matrix4().makeScale(1, 0.55, 1).setPosition(x, 0.71, z), 0x9fa4a8)); // lid dome
  out.push(bake(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), at(x, 0.8, z), 0x7d8286));                                                                           // lid knob
  for (const y of [0.1, 0.46]) out.push(bake(new THREE.TorusGeometry(0.205, 0.014, 5, 18), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x, y, z), 0x8d9296)); // bands
  for (const sx of [-1, 1]) out.push(bake(new THREE.TorusGeometry(0.045, 0.012, 5, 8, Math.PI), new THREE.Matrix4().makeRotationZ(Math.PI / 2 * sx).setPosition(x + sx * 0.18, 0.56, z), 0x8d9296)); // lugs
  return out;
}

/** Dudh dairy: cream-walled collection room with a steel can stack, a milk-can rack and a tin awning. */
export function createDudhDairy(position) {
  const geos = smallBuilding({ w: 5, d: 4, h: 3.0, wall: 0xe7dcc0, band: 0x4a78a6, door: 0x7a4a2a });
  geos.push(bake(new THREE.BoxGeometry(5.6, 0.07, 1.8), new THREE.Matrix4().makeRotationX(0.12).setPosition(0, 2.75, 3.0), 0x8e969c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), at(sx * 2.6, 1.2, 3.7), 0x5a5a5a));
  // Milk cans: real dairy cans (flared foot, straight body, sloped shoulder, narrow neck, domed lid with a knob, two rolled bands, side lugs), two rows beside the door.
  for (let i = 0; i < 6; i++) {
    const x = -2.2 + (i % 3) * 0.55, z = 2.9 + Math.floor(i / 3) * 0.55;
    geos.push(...milkCanGeos(x, z, i * 0.9, [0xb9bdc0, 0xaeb4b8, 0xc4c8ca][i % 3]));
  }
  // Collection bench (plank top on four legs, brace rail) with two full cans on it, instead of a solid box.
  geos.push(bake(new THREE.BoxGeometry(1.4, 0.06, 0.7), at(2.0, 0.48, 3.1), 0x7a5a3a));
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.BoxGeometry(0.07, 0.45, 0.07), at(2.0 + lx * 0.62, 0.225, 3.1 + lz * 0.29), 0x5a3f27));
  geos.push(bake(new THREE.BoxGeometry(1.2, 0.04, 0.05), at(2.0, 0.2, 3.1), 0x5a3f27));
  for (const dx of [-0.32, 0.32]) geos.push(...milkCanGeos(2.0 + dx, 3.1, dx * 3, 0xb9bdc0).map((g) => g.translate(0, 0.51, 0)));
  const mesh = new THREE.Mesh(mergeGeometries(geos), vcMat({ roughness: 0.8 }));
  mesh.userData.colliderBoxes = solidBoxes(position, [[0, 0, 5.2, 4.2]]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'dudh_dairy';
  group.add(mesh);
  group.add(dairyGoods());
  const dairyBoard = parapetBoard('dairy', { w: 5, d: 4, h: 3.0 }, 3.6);
  // Second board on the lane (south) face: the front opens north, so walkers coming from the bazaar saw a blank back wall.
  group.add(placeBoardsMesh([dairyBoard, { ...dairyBoard, z: -dairyBoard.z, ry: Math.PI }], 'dairy_boards'));
  group.position.set(position.x, 0, position.z);
  return group;
}

/** Local [cx, cz, w, d] footprints -> world AABBs (sites are unrotated), so streamed buildings block the player (zoneManager rebuilds STATIC_COLLIDERS on every zone change). */
function solidBoxes(position, solids) {
  return solids.map(([cx, cz, w, d]) => ({ minX: position.x + cx - w / 2, maxX: position.x + cx + w / 2, minZ: position.z + cz - d / 2, maxZ: position.z + cz + d / 2 }));
}

/** Local [cx, cz, w, d] strips filling a disc of radius r centred at (cx, cz): water bodies block walking and driving (A0). Each strip is as wide as the disc at its farther edge, so none pokes past the disc. */
function discSolids(cx, cz, r, strip = 1.2) {
  const out = [];
  for (let z = -r; z < r; z += strip) {
    const far = Math.max(Math.abs(z), Math.abs(z + strip));
    const hw = Math.sqrt(Math.max(0, r * r - far * far));
    if (hw > 0.3) out.push([cx, cz + z + strip / 2, hw * 2, strip]);
  }
  return out;
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
  // Optional extra material groups ({ wood: [...geos], metal: [...geos] }): real PBR sets for the parts that are not plaster.
  for (const [set, list] of Object.entries(opts.sets || {})) {
    if (!list.length) continue;
    const m = new THREE.Mesh(mergeGeometries(list), vcMat({ set, roughness: opts.roughness }));
    m.castShadow = true; m.receiveShadow = true; m.name = name + '_' + set;
    group.add(m);
  }
  if (opts.boards) group.add(placeBoardsMesh(opts.boards, name + '_boards')); // bilingual signboard(s), one draw call (src/placeBoards.js)
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
  return finishSite('health_subcentre', geos, position, { solids: [[0, 0, 9.2, 5.7]], boards: [parapetBoard('health', { w: 9, d: 5.5, h: 3.2 }, 4.4)] });
}

/** Chemist: narrow cream shop with a green shutter, tin awning and a glass counter front. */
export function createChemist(position) {
  const geos = smallBuilding({ w: 4.2, d: 4, h: 3.1, wall: 0xe9d9c3, band: 0x2f7d5b, door: 0x2f7d5b });
  geos.push(bake(new THREE.BoxGeometry(4.8, 0.07, 1.6), new THREE.Matrix4().makeRotationX(0.14).setPosition(0, 2.75, 2.8), 0x8e969c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), at(sx * 2.2, 1.2, 3.4), 0x5a5a5a));
  geos.push(bake(new THREE.BoxGeometry(3.2, 1.0, 0.7), at(0, 0.85, 2.6), 0x9a7a52));
  geos.push(bake(new THREE.BoxGeometry(3.0, 0.9, 0.05), at(0, 1.8, 2.3), 0x9fb8bd));
  const site = finishSite('chemist', geos, position, { roughness: 0.85, solids: [[0, 0, 4.4, 4.2]], boards: [parapetBoard('chemist', { w: 4.2, d: 4, h: 3.1 }, 3.6)] });
  site.add(chemistGoods());
  return site;
}

/** Masjid: modest limewashed prayer hall with a green-and-white dome, one slim minaret and an ablution tap row. Scenery only. */
export function createMasjid(position) {
  const geos = smallBuilding({ w: 8, d: 7, h: 3.6, wall: 0xeee8d8, band: 0x3f7a5a, door: 0x2f5d49, roof: 0xd8d2c0 });
  sideWindows(geos, { w: 8, d: 7, h: 3.6 });
  geos.push(bake(new THREE.CylinderGeometry(2.4, 2.6, 0.5, 16), at(0, 4.6, 0), 0xd8d2c0));
  geos.push(bake(new THREE.SphereGeometry(2.3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), at(0, 4.85, 0), 0xf2eee2));
  geos.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), at(0, 7.6, 0), 0xc8a24a));
  geos.push(bake(new THREE.BoxGeometry(1.1, 7.6, 1.1), at(-5.2, 3.8, -1.5), 0xeee8d8));
  geos.push(bake(new THREE.BoxGeometry(1.5, 0.3, 1.5), at(-5.2, 6.0, -1.5), 0xd8d2c0));
  geos.push(bake(new THREE.SphereGeometry(0.65, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), at(-5.2, 7.6, -1.5), 0x3f7a5a));
  for (let i = 0; i < 3; i++) geos.push(bake(new THREE.BoxGeometry(0.4, 0.6, 0.3), at(2 + i * 0.9, 0.5, 4.2), 0xb9bdc0));
  geos.push(bake(new THREE.BoxGeometry(4, 0.12, 0.5), at(3, 0.4, 4.6), 0xb7b0a0));
  // Entrance iwan (hall front faces +z): four slim pillars under a flat canopy with a green band, three steps, and two small corner chhatris on the roofline.
  for (const px of [-2.2, -0.75, 0.75, 2.2]) {
    geos.push(bake(new THREE.CylinderGeometry(0.16, 0.2, 2.7, 10), at(px, 1.65, 5.1), 0xeee8d8));
    geos.push(bake(new THREE.BoxGeometry(0.46, 0.16, 0.46), at(px, 3.1, 5.1), 0xd8d2c0));
  }
  geos.push(bake(new THREE.BoxGeometry(5.8, 0.22, 2.2), at(0, 3.3, 4.6), 0xd8d2c0));
  geos.push(bake(new THREE.BoxGeometry(5.9, 0.12, 0.1), at(0, 3.52, 5.7), 0x3f7a5a));
  for (let i = 0; i < 3; i++) geos.push(bake(new THREE.BoxGeometry(5.6 + i * 0.4, 0.14, 1.1 - i * 0.25), at(0, 0.07 + i * 0.14, 5.7 - i * 0.1 + (2 - i) * 0.3), 0xe2dccc));
  for (const sx of [-1, 1]) {
    geos.push(bake(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8), at(sx * 3.4, 3.8, 2.8), 0xd8d2c0));
    geos.push(bake(new THREE.SphereGeometry(0.34, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), at(sx * 3.4, 4.0, 2.8), 0xf2eee2));
  }
  return finishSite('masjid', geos, position, { solids: [[0, 0, 8.2, 7.2], [-5.2, -1.5, 1.2, 1.2]], boards: [parapetBoard('masjid', { w: 8, d: 7, h: 3.6 }, 3.6)] });
}

/** Gurudwara: white hall with a gold-topped dome, small chhatris, and a saffron nishan sahib flagpole. Scenery only. */
export function createGurudwara(position) {
  const geos = smallBuilding({ w: 9, d: 7, h: 3.6, wall: 0xf1ede2, band: 0xd69a2e, door: 0x6a4a2a, roof: 0xdcd6c6 });
  sideWindows(geos, { w: 9, d: 7, h: 3.6 });
  geos.push(bake(new THREE.CylinderGeometry(2.2, 2.4, 0.5, 16), at(0, 4.6, 0), 0xdcd6c6));
  geos.push(bake(new THREE.SphereGeometry(2.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), at(0, 4.85, 0), 0xf6f2e6));
  geos.push(bake(new THREE.ConeGeometry(0.22, 1.0, 8), at(0, 7.4, 0), 0xd9a63a));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    geos.push(bake(new THREE.CylinderGeometry(0.4, 0.4, 0.5, 8), at(sx * 3.7, 4.6, sz * 2.7), 0xdcd6c6));
    geos.push(bake(new THREE.SphereGeometry(0.45, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), at(sx * 3.7, 4.85, sz * 2.7), 0xf6f2e6));
  }
  // Entrance porch (the hall front faces +z): four fluted pillars, a flat canopy with a gold edge, and three marble steps.
  for (const px of [-2.4, -0.8, 0.8, 2.4]) {
    geos.push(bake(new THREE.CylinderGeometry(0.2, 0.24, 2.9, 10), at(px, 1.8, 5.3), 0xf1ede2));
    geos.push(bake(new THREE.BoxGeometry(0.55, 0.18, 0.55), at(px, 0.44, 5.3), 0xdcd6c6));
    geos.push(bake(new THREE.BoxGeometry(0.55, 0.18, 0.55), at(px, 3.3, 5.3), 0xdcd6c6));
  }
  geos.push(bake(new THREE.BoxGeometry(6.4, 0.22, 2.6), at(0, 3.5, 4.8), 0xdcd6c6));
  geos.push(bake(new THREE.BoxGeometry(6.5, 0.1, 0.1), at(0, 3.7, 6.1), 0xd69a2e));
  for (let i = 0; i < 3; i++) geos.push(bake(new THREE.BoxGeometry(6.2 + i * 0.5, 0.14, 1.2 - i * 0.3), at(0, 0.07 + i * 0.14, 6.1 - i * 0.1 + (2 - i) * 0.3), 0xe4dfd0));
  // Kanguras (scalloped parapet teeth) along the hall roofline.
  for (let i = -4; i <= 4; i++) geos.push(bake(new THREE.ConeGeometry(0.22, 0.45, 4), at(i, 4.55, 3.62), 0xf6f2e6));
  geos.push(bake(new THREE.CylinderGeometry(0.1, 0.12, 9, 8), at(6.5, 4.5, 4.5), 0xd9d3c3));
  geos.push(bake(new THREE.BoxGeometry(0.05, 1.3, 0.9), at(6.5, 8.2, 4.95), 0xe0861f));
  return finishSite('gurudwara', geos, position, { solids: [[0, 0, 9.2, 7.2]], boards: [parapetBoard('gurudwara', { w: 9, d: 7, h: 3.6 }, 4.4)] });
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
  return finishSite('manihari', geos, position, { solids: [[0, 0, 3.4, 1.4], [-3, 0.8, 1.0, 0.5]], boards: [{ id: 'manihari', x: 0, y: 2.15, z: -0.52, w: 2.9 }] }); // counter + stool
}

/** Heap of real-shaped produce on a cart bed: individual fruits scattered over a dome (denser and taller at the centre), each with its own size, turn and colour jitter.
 *  kind: tomato | onion (squashed spheres), carrot | chilli (thin cones lying every way), gourd | brinjal (long ellipsoids). Deterministic from seed. */
function produceHeap(geos, cx, cy, cz, kind, colors, seed) {
  let sd = seed * 7919 + 13;
  const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const base = new THREE.Color(colors[0]), alt = new THREE.Color(colors[1]);
  const thin = kind === 'chilli' || kind === 'carrot';
  const n = thin ? 46 : 26;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.42;
    const y = cy + (1 - (r / 0.46) ** 2) * 0.2 * (0.7 + rnd() * 0.3);
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.85;
    const col = base.clone().lerp(alt, rnd() < 0.2 ? 0.7 : rnd() * 0.25).multiplyScalar(0.85 + rnd() * 0.3);
    // thin produce lies on the heap (cone axis near horizontal, any heading); round produce just gets a random turn
    const m = new THREE.Matrix4().makeRotationFromEuler(thin ? new THREE.Euler((rnd() - 0.5) * 0.5, rnd() * 6.28, Math.PI / 2 + (rnd() - 0.5) * 0.5, 'YXZ') : new THREE.Euler(rnd() * 3, rnd() * 6.28, rnd() * 3)).setPosition(x, thin ? y - 0.03 : y, z);
    let g;
    if (kind === 'tomato') g = new THREE.SphereGeometry(0.065 + rnd() * 0.02, 7, 5);
    else if (kind === 'onion') g = new THREE.SphereGeometry(0.07 + rnd() * 0.02, 7, 5).scale(1, 0.85, 1);
    else if (kind === 'carrot' || kind === 'chilli') g = new THREE.ConeGeometry(kind === 'carrot' ? 0.03 : 0.014, kind === 'carrot' ? 0.2 + rnd() * 0.06 : 0.13 + rnd() * 0.05, 5);
    else g = new THREE.SphereGeometry(kind === 'gourd' ? 0.065 : 0.05, 7, 5).scale(1, kind === 'gourd' ? 2.6 : 2.2, 1);
    geos.push(bake(g, m, col));
  }
}

/** Sabzi rehris: three wooden handcarts piled with vegetables, parked in a row under a tarpaulin shade. */
export function createSabziRehris(position) {
  const geos = [];
  const piles = [[0xb2342b, 0xd8872a], [0x4f8f3a, 0x8aad3a], [0xd8c8a0, 0x7a3a8a]]; // tomato/carrot, gourd/chilli, onion/brinjal
  const kinds = [['tomato', 'carrot'], ['gourd', 'chilli'], ['onion', 'brinjal']];
  piles.forEach((pc, i) => {
    const x = (i - 1) * 3.2;
    geos.push(bake(new THREE.BoxGeometry(2.2, 0.12, 1.2), at(x, 0.85, 0), 0x8a6a45));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.BoxGeometry(0.08, 0.8, 0.08), at(x + sx * 0.95, 0.4, sz * 0.5), 0x6f5233));
    for (const sz of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(2.2, 0.25, 0.06), at(x, 1.0, sz * 0.58), 0x7a5a3a));
    const heapCols = [[[pc[0], 0xd9482f], [pc[1], 0xe8a23c]], [[pc[0], 0x6aa04a], [pc[1], 0x3f7a2c]], [[pc[0], 0xe3b9a0], [pc[1], 0x4a1f5a]]][i];
    produceHeap(geos, x - 0.5, 0.97, 0, kinds[i][0], heapCols[0], i * 2 + 1);
    produceHeap(geos, x + 0.5, 0.97, 0, kinds[i][1], heapCols[1], i * 2 + 2);
    for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 14), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(x + sx * 0.8, 0.42, 0.7), 0x3a3a3a));
    geos.push(bake(new THREE.BoxGeometry(0.1, 0.1, 1.6), at(x, 0.8, 1.7), 0x6f5233));
  });
  geos.push(bake(new THREE.BoxGeometry(10.2, 0.05, 3.6), new THREE.Matrix4().makeRotationX(0.1).setPosition(0, 2.9, 0.3), 0x9a5f3c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 6), at(sx * 4.9, 1.45, -1.3), 0x5a5a5a));
  return finishSite('sabzi_rehris', geos, position, { solids: [[-3.2, 0.2, 2.3, 1.3], [0, 0.2, 2.3, 1.3], [3.2, 0.2, 2.3, 1.3], [-4.9, -1.3, 0.12, 0.12], [4.9, -1.3, 0.12, 0.12]], boards: [{ id: 'sabzi', x: 0, y: 2.35, z: -1.3, w: 4.4 }] }); // three carts + tarp poles
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
  // Porch completed: two more pillars, three plinth steps, and four small corner spires (mini shikharas) on the roof.
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.2, 0.24, 2.6, 8), at(sx * 2.8, 1.6, 3.9), 0xe9e2cf));
  for (let i = 0; i < 3; i++) geos.push(bake(new THREE.BoxGeometry(4.2 + i * 0.4, 0.12, 1.0 - i * 0.2), at(0, 0.06 + i * 0.12, 4.9 + (2 - i) * 0.25), 0xe2dccb));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.ConeGeometry(0.45, 1.1, 4), at(sx * 2.4, 3.75, sz * 2.4, Math.PI / 4), 0xf3efe4));
  return finishSite('jain_mandir', geos, position, { solids: [[0, 0, 7.4, 7.4]] });
}

/** Worn village highway (z -75..75 about the cluster origin): dark asphalt on the concrete PBR set with tar patches, hairline cracks, broken faded centre dashes and edge lines
 *  (no crisp kerb), dust margins creeping onto the shoulder, sand drifts, and both ends running out as a narrowing dirt track with wheel ruts. Deterministic. */
function flatQuad(w, d) { return new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2); }
/** Flat tapering track strip (no steps): from (x,z0) along sz*z for len, width w0 -> w1, wobbling edges, vertex colour ramp through `ramp` (hex stops), so tarmac/slab frays into earth then into the grass tone. */
function fadeStrip(x, z0, sz, len, w0, w1, ramp, y, seed = 1, segs = 14, boost = 0) {
  const pos = [], col = [], idx = [];
  const stops = ramp.map((h) => new THREE.Color(h));
  const c = new THREE.Color();
  const r = (k) => { const v = Math.sin(seed * 91.7 + k * 12.9898) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, w = (w0 + (w1 - w0) * t) / 2 * (1 + (r(i) - 0.5) * 0.25 * Math.min(1, t * 3));
    const f = t * (stops.length - 1), a = Math.floor(f), b = Math.min(stops.length - 1, a + 1);
    c.copy(stops[a]).lerp(stops[b], f - a);
    if (boost) c.multiplyScalar(1 + boost * Math.max(0, t - 0.12)); // the PBR concrete albedo is grey and mutes the tint; push the earth stops above 1 so the tail reads as dust, not tarmac
    const z = z0 + sz * len * t, yy = y - 0.012 * t;
    for (const side of [-1, 1]) { pos.push(x + side * (side < 0 ? w * (0.9 + r(i + 40) * 0.2) : w * (0.9 + r(i + 80) * 0.2)), yy, z); col.push(c.r, c.g, c.b); }
    if (i > 0) { const k = i * 2; if (sz > 0) idx.push(k - 2, k, k - 1, k - 1, k, k + 1); else idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  const uv = new Float32Array(ng.attributes.position.count * 2);
  for (let i = 0; i < ng.attributes.normal.count; i++) { ng.attributes.normal.setXYZ(i, 0, 1, 0); uv[i * 2] = ng.attributes.position.getX(i) / 4; uv[i * 2 + 1] = ng.attributes.position.getZ(i) / 4; }
  ng.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return ng;
}

function roadGeos() {
  const geos = [];
  let sd = 91;
  const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const Y = 0.105;
  geos.push(bake(new THREE.BoxGeometry(14, 0.1, 150), at(0, 0.05, 0), 0x45454a));
  // tar patches and repairs: darker or paler rectangles, a few in the wheel paths
  for (let i = 0; i < 26; i++) {
    const w = 0.8 + rnd() * 2.6, d = 1 + rnd() * 3.5, x = (rnd() - 0.5) * 12, z = (rnd() - 0.5) * 140;
    geos.push(bake(new flatQuad(w, d), at(x, Y + 0.002, z, (rnd() - 0.5) * 0.15), [0x3a3a3e, 0x404044, 0x505054, 0x454549][i % 4]));
  }
  // cracks: thin long dark slivers, slightly skewed
  for (let i = 0; i < 40; i++) {
    const len = 1 + rnd() * 4.5, x = (rnd() - 0.5) * 12.5, z = (rnd() - 0.5) * 140;
    geos.push(bake(new flatQuad(0.03 + rnd() * 0.03, len), at(x, Y + 0.026, z, (rnd() - 0.5) * 0.7), 0x2a2a2d));
  }
  // faded, broken centre dashes (some gone, none identical)
  for (let z = -72; z <= 72; z += 8) {
    if (rnd() < 0.18) continue;
    const len = 2.4 + rnd() * 1.4, off = (rnd() - 0.5) * 0.12;
    geos.push(bake(new flatQuad(0.18, len), at(off, Y + 0.012, z + (rnd() - 0.5) * 0.8), rnd() < 0.5 ? 0xc9c3a8 : 0xb4ae95));
  }
  // edge lines: patchy, worn through, never a continuous ruler line
  for (const sx of [-1, 1]) {
    let z = -74;
    while (z < 72) {
      const len = 3 + rnd() * 9, gap = rnd() < 0.5 ? 0.8 + rnd() * 3 : 0;
      geos.push(bake(new flatQuad(0.14 + rnd() * 0.06, len), at(sx * (6.3 + (rnd() - 0.5) * 0.1), Y + 0.012, z + len / 2), 0xbdb79c));
      z += len + gap;
    }
  }
  // dust / earth margins creeping over the shoulder
  for (const sx of [-1, 1]) {
    for (let z = -74; z < 74; z += 2.5 + rnd() * 3.5) {
      const w = 0.7 + rnd() * 1.7, d = 2.5 + rnd() * 3.5;
      geos.push(bake(new flatQuad(w, d), at(sx * (7.1 - w * 0.22 + rnd() * 0.3), 0.108, z), [0x7a6c52, 0x85775b, 0x6f6249][Math.floor(rnd() * 3)]));
    }
  }
  // run-outs: the tarmac frays in one continuous taper (no stepped slabs) into packed earth, then the grass tone, with two wheel ruts that fade out
  for (const sz of [-1, 1]) {
    const z0 = sz * 75;
    geos.push(fadeStrip(0, z0, sz, 52, 13, 0.7, [0x4a4a4e, 0x7a6c52, 0x8a7a58, 0x6a6440, 0x464c28], 0.108, 3 + sz, 16, 3.2));
    for (const rx of [-0.95, 0.95]) geos.push(fadeStrip(rx * (1 - 0.0), z0 + sz * 6, sz, 40, 0.45, 0.2, [0x6a5c42, 0x6a5c42, 0x5e5a38, 0x464c28], 0.114, 7 + sz, 12));
    for (let k = 0; k < 5; k++) geos.push(bake(new THREE.BoxGeometry(0.5 + rnd(), 0.02, 0.7 + rnd()), at((rnd() - 0.5) * 4, 0.06, z0 + sz * (8 + rnd() * 22)), 0x6f6248));
  }
  return geos;
}

/** Highway cluster (east edge): paved two-lane road strip, petrol pump with canopy, bus adda shelter and a dharam kanta weighbridge. Unbranded. */
export function createHighwayCluster(position) {
  const geos = [];
  const road = roadGeos(); // asphalt, patches, cracks, worn lines, dust margins, dirt run-outs: its own mesh on the concrete PBR set
  // Petrol pump: now the Blender model 'petrol_pump' (tools/blender/build_petrol_pump.py, asset slot in main.js); only its collision solids stay here.
  // Bus adda: tin-roof shelter, bench, kerb-side concrete pad.
  geos.push(bake(new THREE.BoxGeometry(8, 0.15, 3.5), at(-10, 0.08, 20), 0xa8a59c));
  geos.push(bake(new THREE.BoxGeometry(8.4, 0.08, 3.8), new THREE.Matrix4().makeRotationX(0.06).setPosition(-10, 3.0, 20), 0x8e969c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.07, 0.07, 3, 6), at(-10 + sx * 3.8, 1.5, 19), 0x5a5a5a));
  geos.push(bake(new THREE.BoxGeometry(0.1, 0.9, 3), at(-10, 0.6, 21.5), 0xc9b79a));
  geos.push(bake(new THREE.BoxGeometry(5, 0.1, 0.5), at(-10, 0.5, 20.8), 0x7a5a3a));
  // Dharam kanta: now the Blender model 'dharam_kanta' (tools/blender/build_dharam_kanta.py, asset slot in main.js); only its collision solids stay here.
  const site = finishSite('highway_cluster', geos, position, { roughness: 0.92, solids: [
    [-27, -41, 4, 3.5], [-16, 50, 3, 3], [-13.5, 50, 0.8, 1.1], // petrol office, dharam kanta cabin, display post
    [-21.5, -35, 0.9, 0.6], [-16.5, -35, 0.9, 0.6], // two pumps
    [-13.8, -34.7, 2.3, 3.0], // parked tractor at the east pumps (build_petrol_pump.py tractor())
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [-19 + sx * 5.5, -35 + sz * 3.2, 0.4, 0.4]), // canopy posts
    [-13.8, 19, 0.15, 0.15], [-6.2, 19, 0.15, 0.15], [-10, 21.5, 3, 0.2], // bus adda posts + back panel
  ], boards: [
    { id: 'petrol', x: -11.8, y: 5.1, z: -35, ry: Math.PI / 2, w: 4.2 }, // canopy front edge, facing the road
    { id: 'kanta', x: -14.3, y: 3.3, z: 50, ry: Math.PI / 2, w: 2.7 }, // standing on the cabin roof edge, facing the weighing platform
    { id: 'busadda', x: -10, y: 3.45, z: 18.1, ry: Math.PI, w: 4 }, // shelter roof front, facing the lane
  ] });
  const roadMesh = new THREE.Mesh(mergeGeometries(road), vcMat({ set: 'concrete', roughness: 0.88 }));
  roadMesh.name = 'highway_road';
  roadMesh.receiveShadow = true;
  site.add(roadMesh);
  return site;
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
  return finishSite('jalebi_stall', geos, position, { solids: [[0, 0, 3.0, 1.4], [2.1, 0.2, 0.6, 0.6], [-1.7, -1.0, 0.1, 0.1], [1.7, -1.0, 0.1, 0.1]], boards: [{ id: 'jalebi', x: 0, y: 2.25, z: -1.0, w: 3.2 }] }); // cart, stool, tarp poles
}

/** Banta shop (goli soda, nimbu pani): a small plank kiosk with a counter, a wooden crate of marble-stoppered soda bottles,
 *  a steel tub of ice, a lime basket and a tin awning. Unbranded, non-alcoholic. */
export function createBantaShop(position) {
  const geos = [], wood = [], metal = [];
  const box = (w, h, d, x, y, z, c, ry = 0, to = wood) => to.push(bake(new THREE.BoxGeometry(w, h, d), at(x, y, z, ry), c));
  box(2.6, 0.1, 1.2, 0, 0.95, 0, 0x8a6a45); // counter top
  box(2.5, 0.9, 0.08, 0, 0.5, 0.55, 0x7a5a3a); // plank front
  box(0.08, 0.9, 1.1, -1.25, 0.5, 0, 0x7a5a3a);
  box(0.08, 0.9, 1.1, 1.25, 0.5, 0, 0x7a5a3a);
  box(2.6, 2.3, 0.08, 0, 1.15, -0.6, 0x9a7a52); // back plank wall
  for (const sx of [-1, 1]) box(0.1, 2.5, 0.1, sx * 1.3, 1.25, 0.65, 0x6f5233); // awning posts
  metal.push(bake(new THREE.BoxGeometry(3.2, 0.05, 1.8), new THREE.Matrix4().makeRotationX(0.14).setPosition(0, 2.55, 0.2), 0x8e969c)); // tin awning
  box(0.8, 0.28, 0.5, -0.8, 1.14, 0, 0x7a5a3a); // soda crate
  for (let i = 0; i < 6; i++) { // goli soda bottles standing in the crate, pale green glass
    const bx = -1.05 + (i % 3) * 0.25, bz = -0.12 + Math.floor(i / 3) * 0.24;
    geos.push(bake(new THREE.CylinderGeometry(0.05, 0.06, 0.26, 8), at(bx, 1.42, bz), 0x9fc4b0));
    geos.push(bake(new THREE.CylinderGeometry(0.02, 0.05, 0.1, 8), at(bx, 1.6, bz), 0x9fc4b0));
  }
  metal.push(bake(new THREE.CylinderGeometry(0.38, 0.3, 0.32, 14), at(0.4, 1.17, 0), 0xb9bdc0)); // steel ice tub
  geos.push(bake(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 14), at(0.4, 1.34, 0), 0xe4eef0)); // ice
  wood.push(bake(new THREE.CylinderGeometry(0.28, 0.22, 0.2, 12), at(0.95, 1.1, 0.2), 0x9a7a52)); // lime basket
  geos.push(bake(new THREE.SphereGeometry(0.12, 8, 6), at(0.95, 1.25, 0.2), 0x9cb83a)); // limes
  box(0.6, 0.35, 0.6, 1.9, 0.18, 0.3, 0x7a5a3a); // customer stool
  const site = finishSite('banta_shop', geos, position, { sets: { wood, metal }, solids: [[0, 0, 2.7, 1.3], [1.9, 0.3, 0.6, 0.6]], boards: [{ id: 'banta', x: 0, y: 2.1, z: 0.65, w: 2.4 }] });
  site.add(createNPC(0xc0392b, { x: 0.1, z: -0.2 }, 0, 'npc_banta_keeper')); // shopkeeper behind the counter (capsule until the 3D people arrive)
  return site;
}

/** Chaat thela: a two-wheeled push-cart with a glass-fronted chaat case, a steel pot of tamarind water, a stack of leaf
 *  bowls, a hanging bulb and a faded umbrella. Unbranded. */
export function createChaatThela(position) {
  const geos = [], wood = [], metal = [];
  const box = (w, h, d, x, y, z, c, ry = 0, to = wood) => to.push(bake(new THREE.BoxGeometry(w, h, d), at(x, y, z, ry), c));
  box(2.2, 0.1, 1.2, 0, 0.9, 0, 0x8a6a45); // cart bed
  box(2.2, 0.5, 0.08, 0, 0.62, 0.56, 0x7a5a3a);
  box(2.2, 0.5, 0.08, 0, 0.62, -0.56, 0x7a5a3a);
  for (const sx of [-1, 1]) { // spoked cart wheels: steel rim, hub, eight wooden spokes
    metal.push(bake(new THREE.TorusGeometry(0.44, 0.035, 6, 20), at(sx * 0.6, 0.46, 0.7), 0x4a4a48));
    metal.push(bake(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8), new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(sx * 0.6, 0.46, 0.7), 0x3a3a38));
    for (let k = 0; k < 8; k++) wood.push(bake(new THREE.BoxGeometry(0.03, 0.84, 0.03), new THREE.Matrix4().makeRotationZ((k / 8) * Math.PI).setPosition(sx * 0.6, 0.46, 0.7), 0x7a5a3a));
  }
  box(1.4, 0.06, 0.06, -1.6, 0.9, 0, 0x6f5233); // push handle
  for (const [dx, dz] of [[-0.43, -0.38], [0.43, -0.38], [-0.43, 0.38], [0.43, 0.38]]) box(0.04, 0.6, 0.04, -0.5 + dx, 1.25, dz, 0x7a5a3a); // glass case frame
  box(0.94, 0.04, 0.84, -0.5, 1.56, 0, 0x7a5a3a);
  box(0.86, 0.04, 0.76, -0.5, 0.96, 0, 0x7a5a3a); // open display tray (the merged mesh cannot carry see-through glass)
  for (let i = 0; i < 4; i++) geos.push(bake(new THREE.CylinderGeometry(0.1, 0.08, 0.1, 10), at(-0.8 + i * 0.2, 1.05, 0), i % 2 ? 0xc98a3a : 0xb87a2a)); // heaps of papdi, chana, sev
  box(0.7, 0.18, 0.6, -0.5, 1.12, 0, 0xc98a3a, 0, geos); // papdi, chana
  metal.push(bake(new THREE.CylinderGeometry(0.28, 0.24, 0.4, 14), at(0.4, 1.15, 0.1), 0xb9bdc0)); // steel pot
  geos.push(bake(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 14), at(0.4, 1.36, 0.1), 0x8a5a2a)); // tamarind water
  geos.push(bake(new THREE.CylinderGeometry(0.14, 0.12, 0.2, 10), at(0.95, 1.05, -0.1), 0x9a8a52)); // leaf-bowl stack
  metal.push(bake(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), at(0.9, 2.0, -0.45), 0x5a5a5a)); // umbrella pole
  geos.push(bake(new THREE.ConeGeometry(1.5, 0.45, 12), at(0.9, 3.0, -0.45), 0xb85a3a)); // umbrella
  geos.push(bake(new THREE.SphereGeometry(0.08, 8, 6), at(0.2, 2.3, 0.3), 0xf2e2a8)); // bulb
  const site = finishSite('chaat_thela', geos, position, { sets: { wood, metal }, solids: [[0, 0, 2.3, 1.3]], boards: [{ id: 'chaat', x: 0, y: 2.05, z: 0.7, w: 2.2 }] });
  site.add(createNPC(0xd9a21e, { x: -0.1, z: -1.05 }, 0, 'npc_chaatwala')); // chaatwala behind the cart (capsule until the 3D people arrive)
  return site;
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

/** Lane water corner: a cement platform with a drain apron, a stack of clay matkas, two steel ghadas and a washing slab. No hand pump (removed on the art director's instruction, 24 Oct). Visual only. */
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
  // (the lane hand pump was removed 2026-10-24 on the art director's instruction: no hand pumps in the house streets)
  // matkas: clay pots, two stacked on a wooden stand, one beside, plus two steel ghadas
  geos.push(bake(new THREE.BoxGeometry(0.9, 0.05, 0.45), R(-1.5, 0.3, -0.2), 0x6b4a2c));
  for (const lx of [-0.3, 0.3]) geos.push(bake(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), R(-1.5 + lx, 0.15, -0.2), 0x5a3f27));
  // One lathed pot profile (belly, narrowed neck, flared rolled rim) for clay matkas and steel ghadas, scaled per pot.
  const potGeo = (r, h, flare) => new THREE.LatheGeometry([[0.0, 0], [0.55, 0], [0.82, 0.12], [1.0, 0.42], [0.92, 0.7], [0.58, 0.88], [0.5, 0.96], [0.5 * flare, 1.04], [0.58 * flare, 1.08], [0.5 * flare, 1.09]].map(([x, y]) => new THREE.Vector2(x * r, y * h)), 18);
  for (const [x, z, s, ry] of [[-1.75, -0.2, 1.0, 0], [-1.3, -0.2, 0.92, 1.1]]) geos.push(bake(potGeo(0.23 * s, 0.5 * s, 1.15), R(x, 0.32, z, ry), s > 0.95 ? 0xa8552f : 0x9b4a28)); // clay matkas on the stand
  geos.push(bake(potGeo(0.21, 0.46, 1.1), R(-1.0, 0.0, 0.7), 0x9b4a28));
  const steel = [];
  for (const [x, z, s] of [[1.25, 0.4, 1.0], [1.6, 0.9, 0.86]]) { // steel ghadas in the metal PBR set (a flat grey tint blew out to white)
    steel.push(bake(potGeo(0.22 * s, 0.48 * s, 1.0), R(x, 0.0, z, x * 3), 0x8d9296));
    steel.push(bake(new THREE.TorusGeometry(0.13 * s, 0.012, 5, 14), R(x, 0.5 * s, z).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), 0x8d9296)); // neck ring
  }
  // flat washing stone with a bar of soap
  geos.push(bake(new THREE.BoxGeometry(0.8, 0.12, 0.5), R(1.5, 0.06, -0.5, 0.2), 0x8d8a82));
  geos.push(bake(new THREE.BoxGeometry(0.1, 0.04, 0.06), R(1.55, 0.14, -0.5, 0.2), 0xd8c25a));
  const g = finishSite(name, geos, position, { sets: { metal: steel } });
  g.children[0].userData.colliderBoxes = orientedSolids(position, ry, [[-1.5, -0.2, 0.9, 0.45]]); // matka stand
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
  // Swing frame (jhoola): a proper two-seat swing set.
  geos.push(...swingSetGeos(15, 12, 0, 0x3a5aa6));
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
    [13.4, 12, 0.3, 1.8], [16.6, 12, 0.3, 1.8], // swing legs
    ...[0, 1, 2].map((i) => [18, -12 + i * 6, 2.4, 1.2]), // stall counters
  ], boards: [{ id: 'mela', x: 0, y: 3.55, z: -5.7, w: 6.4 }] });
}

/** Khel maidan (SE edge): rolled cricket strip, stumps, boundary rope posts, a badminton net and a low pavilion shade. */
let NET_TEX = null;
/** Badminton net: black mesh on transparent, white tape along the top (alpha-cut). */
function netTexture() {
  if (NET_TEX) return NET_TEX;
  const W = 512, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.strokeStyle = 'rgba(22,22,22,0.95)'; x.lineWidth = 1.6;
  for (let i = 8; i < W; i += 8) { x.beginPath(); x.moveTo(i, 10); x.lineTo(i, H); x.stroke(); }
  for (let j = 14; j < H; j += 8) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
  x.fillStyle = '#f2f0e8'; x.fillRect(0, 0, W, 12);
  NET_TEX = new THREE.CanvasTexture(c);
  NET_TEX.colorSpace = THREE.SRGBColorSpace;
  NET_TEX.anisotropy = 4;
  return NET_TEX;
}

/** Khel maidan outfield: a subdivided disc whose vertex colours drift between green, dry straw and bare dust at 4-9 m scale (breaks the
 *  grass scan's tiling) and fade to dirt at the rim; metric UVs, one tile per 6 m. */
function maidanOutfield(R) {
  const g = new THREE.RingGeometry(0.01, R, 72, 22);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(p.count * 3);
  const green = new THREE.Color(0x7d8a4a), straw = new THREE.Color(0xa49a5c), dust = new THREE.Color(0x9c8a63), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / R;
    p.setY(i, 0.03);
    uv.setXY(i, x / 6, z / 6);
    const n = 0.5 + 0.25 * Math.sin(x * 0.21 + Math.sin(z * 0.17) * 2.1) + 0.25 * Math.sin(z * 0.13 - x * 0.09 + 1.7);
    const m = 0.5 + 0.5 * Math.sin(x * 0.52 + z * 0.37 + Math.sin(x * 0.11) * 3);
    c.copy(green).lerp(straw, THREE.MathUtils.clamp(n * 1.1 - 0.2, 0, 1));
    c.lerp(dust, THREE.MathUtils.clamp((m - 0.55) * 1.4, 0, 0.6) * (0.4 + r));
    // Mown stripes (alternating 3 m bands, slightly lighter/darker) and fine tufty patchiness so the turf is not one flat olive.
    const stripe = Math.sin(x * 1.05 + z * 0.25) > 0 ? 1.07 : 0.93;
    const tuft = 0.92 + 0.16 * (0.5 + 0.5 * Math.sin(x * 2.3 + Math.sin(z * 1.9) * 1.7) * Math.sin(z * 2.7 - x * 0.8));
    c.lerp(dust, THREE.MathUtils.smoothstep(r, 0.72, 1.0) * 0.85);
    c.multiplyScalar(stripe * tuft);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** Khel maidan (SE): cricket outfield on real grass, a packed-mud pitch with worn run-ups and creases, a badminton court with
 *  regulation lines and a mesh net on poles, and a tin-roofed pavilion with a bench. Three meshes: grass, earth, structures (+ net). */
export function createKhelMaidan(position) {
  const grass = [maidanOutfield(24)];
  const earth = [];
  const geos = [];
  // Pitch: dry clay strip 3 x 20 with darker worn patches at both ends (bowler run-up, batter's stance) and a crack-patched centre.
  earth.push(bake(new THREE.BoxGeometry(3.2, 0.03, 21), at(0, 0.05, 0), 0xb59468));
  for (const sz of [-1, 1]) {
    earth.push(bake(new THREE.CylinderGeometry(1.5, 1.5, 0.03, 18), at(0, 0.07, sz * 8.2), 0x8d7048));
    earth.push(bake(new THREE.BoxGeometry(1.2, 0.03, 4.5), at(0, 0.075, sz * 5.4), 0xa07f56));
  }
  earth.push(bake(new THREE.BoxGeometry(1.4, 0.03, 8), at(0.2, 0.08, 0), 0xc2a478));
  // Creases: popping crease 1.22 m in front of the stumps, return creases, bowling crease through the stumps (chalk lines).
  for (const sz of [-1, 1]) {
    const stump = sz * 9.2;
    geos.push(bake(new THREE.BoxGeometry(2.6, 0.012, 0.05), at(0, 0.1, stump - sz * 1.22), 0xf2eee0));
    geos.push(bake(new THREE.BoxGeometry(2.6, 0.012, 0.05), at(0, 0.1, stump), 0xf2eee0));
    for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(0.05, 0.012, 2.4), at(sx * 1.3, 0.1, stump - sz * 1.0), 0xf2eee0));
    // wooden stumps with bails
    for (const sx of [-0.1, 0, 0.1]) geos.push(bake(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 8), at(sx, 0.42, stump), 0xd9c690));
    for (const sx of [-0.05, 0.05]) geos.push(bake(new THREE.BoxGeometry(0.1, 0.02, 0.025), at(sx, 0.79, stump), 0xe8dcb0));
  }
  // Boundary rope: white marker posts around the outfield.
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    geos.push(bake(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), at(Math.cos(t) * 21, 0.45, Math.sin(t) * 21), 0xe8e2c8));
    geos.push(bake(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 6), at(Math.cos(t) * 21, 0.6, Math.sin(t) * 21), 0xb0392e)); // red paint band
    // Boundary rope sagging to the next post (thin jute cord).
    const t2 = ((a + 1) / 24) * Math.PI * 2, mx = (Math.cos(t) + Math.cos(t2)) * 10.5, mz = (Math.sin(t) + Math.sin(t2)) * 10.5;
    geos.push(bake(new THREE.CylinderGeometry(0.012, 0.012, 5.4, 4), new THREE.Matrix4().makeRotationZ(Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationY(-(t + t2) / 2 - Math.PI / 2)).setPosition(mx, 0.74, mz), 0x9c8456));
  }
  // Badminton court (11, 8): packed-earth pad, regulation lines (13.4 x 6.1 doubles, 5.18 singles, service lines, centre line), net on two poles.
  const cx = 11, cz = 8, L = 0.04, ly = 0.075;
  earth.push(bake(new THREE.BoxGeometry(7.4, 0.03, 14.6), at(cx, 0.05, cz), 0x9d8461));
  const line = (w, d, x, z) => geos.push(bake(new THREE.BoxGeometry(w, 0.012, d), at(cx + x, ly + 0.02, cz + z), 0xf4f2ea));
  for (const sz of [-6.7, 6.7]) line(6.1 + L, L, 0, sz);                   // back lines
  for (const sx of [-3.05, 3.05]) line(L, 13.4, sx, 0);                    // doubles side lines
  for (const sx of [-2.59, 2.59]) line(L, 13.4, sx, 0);                    // singles side lines
  for (const sz of [-1.98, 1.98]) line(6.1, L, 0, sz);                     // short service lines
  for (const sz of [-5.94, 5.94]) line(6.1, L, 0, sz);                     // long service (doubles) lines
  for (const sz of [-1, 1]) line(L, 4.72, 0, sz * 4.34); // centre lines (net-side half omitted by the service line)
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 8), at(cx + sx * 3.1, 0.8, cz), 0x5a5a5a));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 10), at(cx + sx * 3.1, 0.04, cz), 0x77746c)); // base plates
  // Pavilion shade: tin roof on four poles, a long bench.
  geos.push(bake(new THREE.BoxGeometry(6, 0.08, 2.8), new THREE.Matrix4().makeRotationX(-0.06).setPosition(-17, 2.7, 0), 0x8e969c));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.CylinderGeometry(0.07, 0.07, 2.7, 6), at(-17 + sx * 2.8, 1.35, sz * 1.2), 0x6f5233));
  geos.push(bake(new THREE.BoxGeometry(5, 0.08, 0.5), at(-17, 0.5, 1.0), 0x7a5a3a));
  const group = finishSite('khel_maidan', geos, position, { solids: [
    [7.9, 8, 0.2, 0.2], [14.1, 8, 0.2, 0.2], // badminton net poles
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => [-17 + sx * 2.8, sz * 1.2, 0.25, 0.25]), // pavilion poles
    [-17, 1.0, 5, 0.5], // pavilion bench
  ], boards: [{ id: 'maidan', x: -17, y: 2.3, z: -1.2, w: 3.6 }] });
  const grassMat = getTiledMaterial('grass', { repeatX: 1, repeatY: 1, vertexColors: true }).clone();
  grassMat.name = 'maidan_grass'; grassMat.color.setScalar(1.5); grassMat.aoMap = null;
  const grassMesh = new THREE.Mesh(mergeGeometries(grass), grassMat);
  grassMesh.receiveShadow = true;
  // Box faces carry 0..1 UVs, which stretches the ground scan over each pad; remap to metric UVs (one tile per 5.5 m) so the scan reads as dried mud, not planks.
  const earthGeo = mergeGeometries(earth);
  const ep = earthGeo.attributes.position, eu = earthGeo.attributes.uv;
  for (let i = 0; i < ep.count; i++) eu.setXY(i, ep.getX(i) / 5.5 + ep.getZ(i) * 0.02, ep.getZ(i) / 5.5);
  const earthMesh = new THREE.Mesh(earthGeo, vcMat({ roughness: 1 }));
  earthMesh.receiveShadow = true;
  const netMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 0.76).translate(cx, 1.14, cz), new THREE.MeshStandardMaterial({ map: netTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }));
  netMesh.name = 'badminton_net';
  netMesh.rotation.y = 0;
  group.add(grassMesh, earthMesh, netMesh);
  return group;
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
  // Weathering and trim so the blocks read as a lived-in college: concrete sunshades (chhajja) over every window, a damp-stained
  // dado band at the foot of each wall, rainwater downpipes at the corners and a door canopy.
  for (let i = 0; i < 6; i++) for (const y of [2.2, 5.6]) geos.push(bake(new THREE.BoxGeometry(1.9 + (i % 2) * 0.1, 0.1, 0.55), at(-11 + 2 + i * 3.6 + 0, y + 0.95, -5.45 + 0.27), 0xb9b0a0));
  for (let i = 0; i < 4; i++) for (const y of [2.2, 5.6]) geos.push(bake(new THREE.BoxGeometry(0.55, 0.1, 1.9), at(-4 + 0.27, y + 0.95, 1 - 9 + 3 + i * 4 + 0.0 + 1 - 1), 0xb9b0a0));
  geos.push(bake(new THREE.BoxGeometry(22.04, 0.9, 7.04), at(0, 0.85, -9), 0xa89c86));
  geos.push(bake(new THREE.BoxGeometry(7.04, 0.9, 18.04), at(-7.5, 0.85, 1), 0xa89c86));
  for (const [px, pz] of [[-10.9, -5.45], [10.9, -5.45], [-4.05, 9.95]]) geos.push(bake(new THREE.CylinderGeometry(0.06, 0.06, 7.4, 8), at(px, 3.9, pz), 0x4d5258));
  geos.push(bake(new THREE.BoxGeometry(2.4, 0.12, 0.9), at(0, 3.0, -5.85), 0x9a8f7c));
  // Roof detail so the blocks do not read as bare boxes: parapet ring, stair-head (mumty), rooftop water tank, entrance steps, floor band.
  for (const [w, d, x, z] of [[22, 7, 0, -9], [7, 18, -7.5, 1]]) {
    for (const sz of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(w + 0.5, 0.7, 0.25), at(x, 8.0, z + sz * (d / 2 + 0.12)), 0xd9d0b8));
    for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(0.25, 0.7, d + 0.5), at(x + sx * (w / 2 + 0.12), 8.0, z), 0xd9d0b8));
    geos.push(bake(new THREE.BoxGeometry(w + 0.2, 0.18, d + 0.2), at(x, 2.0 + 0.0, z), 0xc9bfa6)); // plinth-to-sill band
  }
  geos.push(bake(new THREE.BoxGeometry(2.6, 2.4, 2.8), at(7.5, 8.9, -9), 0xe2d6b6)); // stair-head
  geos.push(bake(new THREE.BoxGeometry(2.9, 0.2, 3.1), at(7.5, 10.2, -9), 0x8d8a82));
  geos.push(bake(new THREE.CylinderGeometry(0.85, 0.85, 1.2, 14), at(-6, 8.9, -9), 0x2f3a44)); // rooftop tank
  geos.push(bake(new THREE.CylinderGeometry(0.88, 0.88, 0.1, 14), at(-6, 9.55, -9), 0x252d35));
  for (let i = 0; i < 3; i++) geos.push(bake(new THREE.BoxGeometry(3 - i * 0.25, 0.14, 0.45), at(0, 0.45 + i * 0.14, -5.0 + (2 - i) * 0.45), 0xb8b0a0)); // entrance steps
  // Cornice on the colonnade slab.
  geos.push(bake(new THREE.BoxGeometry(22.4, 0.15, 2.3), at(0, 3.7, -4.9), 0xc9bfa6));
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
  ], boards: [{ id: 'gurukul', x: 0, y: 4.5, z: -3.88, w: 4.4 }, { id: 'gurukul', x: 0, y: 4.6, z: -12.58, w: 5.2, ry: Math.PI }] }); // 2nd board on the lane-side (north) face
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
  return finishSite('old_haveli', geos, position, { solids: ranges.map(([w, d, x, z]) => [x, z, w, d]), boards: [{ id: 'haveli', x: 0, y: 7.1, z: 10.12, w: 5.2 }] });
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
  return finishSite('gaushala', geos, position, { solids: [[0, -D / 2, L, 0.4], [0, D / 2 - 1.2, L - 4, 0.7], [-L / 2 - 2, D / 2 + 2, 1.6, 1.6], [L / 2 - 2.5, -D / 2 + 1.8, 3.6, 3.6]], boards: [{ id: 'gaushala', x: 2, y: 1.95, z: -D / 2 + 0.2, w: 3.4 }] }); // + feed trough, water tub, hay heap
}

/** Mandi (town market past the highway, MAP.md): paved yard, grain godown, vegetable yard shed, big weighbridge, dhaba and parked trucks. Unbranded. */
/** One gunny sack: a squashed rounded pillow on the jute set, own size and yaw per k. tf places the local frame. */
function sack(list, tf, lx, y, lz, k) {
  const r = ((k * 7919) % 97) / 97;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(lx, y, lz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (r - 0.5) * 0.35), new THREE.Vector3(0.9 + r * 0.1, 0.5 + r * 0.05, 0.55 + r * 0.06));
  list.push(bake(new THREE.CapsuleGeometry(0.5, 0.45, 3, 10).rotateZ(Math.PI / 2), tf.clone().multiply(m), [0x6c5a3c, 0x62523a, 0x74623f, 0x5a4a30][k % 4]));
}

function truck(geos, x, z, body, ry = 0, metal = geos, wood = geos) {
  const m = (lx, y, lz) => { const v = new THREE.Vector3(lx, y, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); return at(x + v.x, v.y, z + v.z, ry); };
  const paint = new THREE.Color(body).multiplyScalar(1.9);
  const dark = 0x2a2a2d, glass = 0x24323a;
  // Ladder chassis, fuel tank and rear mudflap.
  for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(0.16, 0.3, 8.2), m(sx * 0.85, 0.85, -0.3), 0x2f2f33));
  geos.push(bake(new THREE.CylinderGeometry(0.32, 0.32, 1.2, 10).rotateX(Math.PI / 2), m(1.15, 0.7, 0.9), 0x7d8286));
  // Flatbed: floor, slatted wooden side boards on iron posts, headboard behind the cab and a tailgate.
  wood.push(bake(new THREE.BoxGeometry(2.5, 0.1, 5.8), m(0, 1.1, -1.8), 0x8a6a40));
  for (const sx of [-1, 1]) {
    for (const ly of [1.4, 1.75, 2.1]) wood.push(bake(new THREE.BoxGeometry(0.06, 0.3, 5.8), m(sx * 1.22, ly, -1.8), [0x9a7a4a, 0x8a6a40, 0xa88650][Math.round(ly * 3) % 3]));
    for (const lz of [-4.6, -3.1, -1.6, -0.1, 1.0]) metal.push(bake(new THREE.BoxGeometry(0.08, 1.15, 0.1), m(sx * 1.27, 1.65, lz), dark));
  }
  for (const ly of [1.4, 1.75, 2.1, 2.45]) wood.push(bake(new THREE.BoxGeometry(2.5, 0.3, 0.06), m(0, ly, 1.1), 0x8a6a40));
  for (const ly of [1.4, 1.75]) wood.push(bake(new THREE.BoxGeometry(2.5, 0.3, 0.06), m(0, ly, -4.7), 0x9a7a4a));
  // Forward-control cab: painted lower body, upper cab, big windscreen, side windows, door seams, grille, lamps, mirrors.
  metal.push(bake(new THREE.BoxGeometry(2.4, 1.1, 2.0), m(0, 1.25, 2.55), paint));
  metal.push(bake(new THREE.BoxGeometry(2.3, 1.1, 1.7), m(0, 2.35, 2.3), paint));
  metal.push(bake(new THREE.BoxGeometry(2.0, 0.65, 0.06), m(0, 2.45, 3.18), glass));
  for (const sx of [-1, 1]) {
    metal.push(bake(new THREE.BoxGeometry(0.05, 0.6, 1.0), m(sx * 1.16, 2.45, 2.3), glass));
    metal.push(bake(new THREE.BoxGeometry(0.06, 1.0, 0.05), m(sx * 1.17, 1.4, 2.0), dark)); // door seam
    metal.push(bake(new THREE.BoxGeometry(0.1, 0.35, 0.18), m(sx * 1.35, 2.25, 3.0), dark)); // mirror
    metal.push(bake(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10).rotateX(Math.PI / 2), m(sx * 0.8, 1.0, 3.58), 0xf0e2b0)); // headlamp
  }
  metal.push(bake(new THREE.BoxGeometry(1.4, 0.5, 0.06), m(0, 1.0, 3.56), dark)); // grille
  metal.push(bake(new THREE.BoxGeometry(2.6, 0.2, 0.25), m(0, 0.55, 3.62), 0x8a8a8c)); // bumper
  // Tyres with hubs: front pair single, rear pair doubled.
  for (const sx of [-1, 1]) for (const lz of [2.5, -2.3, -3.6]) {
    const tf = m(sx * 1.15, 0.55, lz).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    geos.push(bake(new THREE.CylinderGeometry(0.55, 0.55, 0.38, 16), tf, 0x1d1d1f));
    metal.push(bake(new THREE.CylinderGeometry(0.26, 0.26, 0.42, 10), tf, 0x9a9a9c));
  }
}

export function createMandi(position) {
  const geos = [];
  // Paved yard slab with a kerb line, wide connecting road back to the highway.
  geos.push(bake(new THREE.BoxGeometry(24, 0.12, 74), at(0, 0.06, 0), 0x8f8e88));
  geos.push(bake(new THREE.BoxGeometry(14, 0.1, 10), at(-18, 0.05, 0), 0x3d3d40));
  // The paved yard does not stop at a crisp edge: it frays into broken concrete, then packed earth with wheel ruts, both ends (road ends believably).
  for (const sz of [-1, 1]) {
    geos.push(fadeStrip(0, sz * 37, sz, 34, 17, 4.5, [0x8f8e88, 0x7d7c76, 0x7a6c52, 0x6f6a48], 0.121, 11 + sz));
    for (const rx of [-1.1, 1.1]) geos.push(fadeStrip(rx, sz * 43, sz, 28, 0.5, 0.3, [0x6a5c42, 0x6a5c42, 0x6f6a48], 0.126, 13 + sz, 10));
    for (const [bx, bz, bw, bd] of [[-6.5, 38.6, 3, 2.2], [5.8, 40.2, 2.4, 3], [-3, 41.5, 2.2, 1.6]]) geos.push(bake(new THREE.BoxGeometry(bw, 0.05, bd), at(bx, 0.135, sz * bz, 0.2 * sz), 0x66655f)); // broken slab chunks at the fray
  }
  geos.push(bake(new THREE.BoxGeometry(0.3, 0.2, 74), at(-12.1, 0.1, 0), 0xb4b0a4));
  // Grain wholesale godown: long warehouse, tin roof, big sliding doors, sacks stacked outside.
  geos.push(bake(new THREE.BoxGeometry(10, 5, 18), at(5, 2.6, -22), 0xe0d2b0));
  geos.push(bake(new THREE.BoxGeometry(10.06, 1.1, 18.06), at(5, 0.7, -22), 0xb8574a));
  geos.push(bake(new THREE.BoxGeometry(10.8, 0.12, 19), new THREE.Matrix4().makeRotationZ(0.1).setPosition(5, 5.6, -22), 0x8e969c));
  for (const lz of [-27, -17]) geos.push(bake(new THREE.BoxGeometry(0.2, 3.4, 4), at(-0.05, 1.9, lz), 0x4f6b7a));
  for (const lz of [-27, -17]) doorOpening(geos, at(-0.1, 0.12, lz, -Math.PI / 2), 3.4, 3.2, 0x3f5b6a, 0x2a2f33, 0xb4b0a4);
  for (const lz of [-24.5, -19.5]) windowOpening(geos, at(-0.1, 4.0, lz, -Math.PI / 2), 0.9, 0.7);
  // Stacked gunny sacks outside the godown door: 4 courses, brick-bonded, each with own size/yaw/tone (jute set).
  const sacks = [];
  for (const lz of [-27, -17]) for (let c = 0; c < 4; c++) for (let j = 0; j < 4 - c; j++) sack(sacks, at(-1.6 - (c % 2) * 0.15, 0.14 + c * 0.27, lz - 1.7 + c * 0.45 + j * 0.95), 0, 0, 0, lz * 7 + c * 5 + j);
  // Vegetable wholesale yard: open pillared tin shed, crates and gunny heaps.
  geos.push(bake(new THREE.BoxGeometry(12, 0.1, 14), new THREE.Matrix4().makeRotationX(0.05).setPosition(4, 3.4, 4), 0x8e969c));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) geos.push(bake(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6), at(4 + sx * 5.5, 1.7, 4 + sz * 6.5), 0x6f5233));
  // 14 open slatted wooden crates (real wood set, own tint each) heaped with tomato / potato / onion / brinjal from the shop-goods atlas.
  const crateWood = [], produce = [];
  const kinds = [['tomato'], ['potato'], ['onion'], ['brinjal', 'tomato'], ['potato', 'onion']];
  let cs = 11; const crnd = () => ((cs = (cs * 16807) % 2147483647) / 2147483647);
  const rel = (cx, cz, ry, lx, ly, lz) => at(cx, ly, cz, ry).multiply(new THREE.Matrix4().makeTranslation(lx, 0, lz));
  for (let i = 0; i < 14; i++) {
    const cx = 0 + (i % 5) * 2.0, cz = 0 + Math.floor(i / 5) * 3.2, ry = (crnd() - 0.5) * 0.25;
    const tint = [0x9a7a4a, 0x8a6a40, 0xa88650, 0x7f6038][Math.floor(crnd() * 4)];
    crateWood.push(bake(new THREE.BoxGeometry(1.1, 0.03, 0.8), at(cx, 0.17, cz, ry), tint));
    for (const sz of [-1, 1]) for (const lv of [0.26, 0.42]) crateWood.push(bake(new THREE.BoxGeometry(1.1, 0.12, 0.03), rel(cx, cz, ry, 0, lv, sz * 0.385), tint));
    for (const sx of [-1, 1]) for (const lv of [0.26, 0.42]) crateWood.push(bake(new THREE.BoxGeometry(0.03, 0.12, 0.8), rel(cx, cz, ry, sx * 0.535, lv, 0), tint));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) crateWood.push(bake(new THREE.BoxGeometry(0.06, 0.4, 0.06), rel(cx, cz, ry, sx * 0.52, 0.32, sz * 0.37), tint));
    const k = kinds[i % kinds.length];
    for (let layer = 0; layer < 3; layer++) for (let j = 0; j < 46 - layer * 12; j++) {
      const kind = k[Math.floor(crnd() * k.length)], inset = layer * 0.08;
      const lx = (crnd() - 0.5) * (0.92 - inset), lz = (crnd() - 0.5) * (0.62 - inset);
      produce.push({ kind, design: GOODS[kind], x: cx + lx * Math.cos(ry) + lz * Math.sin(ry), y: 0.2 + layer * 0.07, z: cz - lx * Math.sin(ry) + lz * Math.cos(ry), ry: crnd() * 6.28, rz: kind === 'brinjal' ? 0 : (crnd() - 0.5) * 0.4, s: 1.35 + crnd() * 0.4 });
    }
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
  // Tin verandah roof on the truck-metal set with iron-ribbed purlins, timber posts on the crate-wood set, tin flue chimney.
  const dhabaMetal = [], dhabaWood = [];
  dhabaMetal.push(bake(new THREE.BoxGeometry(10.5, 0.1, 9), new THREE.Matrix4().makeRotationX(-0.07).setPosition(5, 3.6, 30), 0x8e969c));
  for (let i = 0; i < 8; i++) dhabaMetal.push(bake(new THREE.BoxGeometry(10.5, 0.07, 0.1), new THREE.Matrix4().makeRotationX(-0.07).setPosition(5, 3.68, 25.8 + i * 1.2), 0x6f747a));
  for (const sx of [-1, 0, 1]) dhabaWood.push(bake(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), at(5 + sx * 4.8, 1.7, 26), 0x6f5233));
  dhabaMetal.push(bake(new THREE.CylinderGeometry(0.3, 0.38, 2, 12), at(8.5, 4.2, 33), 0x7a736a));
  dhabaMetal.push(bake(new THREE.CylinderGeometry(0.4, 0.3, 0.2, 12), at(8.5, 5.3, 33), 0x5c5650));
  // Working counter on the verandah: timber front, clay tandoor with a lit mouth, tall tea kettle, stacked steel handis, glasses shelf.
  dhabaWood.push(bake(new THREE.BoxGeometry(3.2, 0.95, 0.7), at(6.6, 0.55, 27.2), 0x8a6a40));
  dhabaWood.push(bake(new THREE.BoxGeometry(3.4, 0.07, 0.9), at(6.6, 1.06, 27.2), 0xa88650));
  dhabaWood.push(bake(new THREE.BoxGeometry(3.0, 0.05, 0.32), at(6.6, 1.9, 28.55), 0x8a6a40));
  for (const sx of [-1, 1]) dhabaWood.push(bake(new THREE.BoxGeometry(0.05, 0.9, 0.05), at(6.6 + sx * 1.5, 1.45, 28.55), 0x6f5233));
  geos.push(bake(new THREE.CylinderGeometry(0.5, 0.62, 1.15, 14), at(4.4, 0.6, 27.6), 0xa65a38)); // clay tandoor body
  geos.push(bake(new THREE.TorusGeometry(0.46, 0.07, 6, 14).rotateX(Math.PI / 2), at(4.4, 1.2, 27.6), 0x8b4a2e)); // rolled rim
  geos.push(bake(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 12), at(4.4, 1.12, 27.6), 0x1c1410)); // dark mouth
  for (let i = 0; i < 4; i++) dhabaMetal.push(bake(new THREE.CylinderGeometry(0.2 - i * 0.02, 0.22 - i * 0.02, 0.22, 12), at(7.3, 1.2 + i * 0.22, 27.1), 0xb9b9bc)); // handi stack
  dhabaMetal.push(bake(new THREE.CylinderGeometry(0.2, 0.26, 0.42, 12), at(6.2, 1.3, 27.2), 0xa4a4a8)); // kettle body
  dhabaMetal.push(bake(new THREE.CylinderGeometry(0.1, 0.2, 0.14, 12), at(6.2, 1.57, 27.2), 0xa4a4a8));
  dhabaMetal.push(bake(new THREE.BoxGeometry(0.4, 0.04, 0.04), at(6.0, 1.5, 27.2), 0x6f747a)); // spout
  for (let i = 0; i < 7; i++) dhabaMetal.push(bake(new THREE.CylinderGeometry(0.045, 0.035, 0.1, 8), at(5.7 + i * 0.28, 1.97, 28.55), 0xcfd8dc)); // tea glasses
  // Low wooden stools (patla) round the charpais, each a different yaw and slight tilt.
  for (let i = 0; i < 6; i++) {
    const a = i * 2.3 + 0.4, sx = 1.2 + i * 1.65, sz = 23.6 + (i % 2) * 0.4;
    dhabaWood.push(bake(new THREE.BoxGeometry(0.36, 0.05, 0.36), at(sx, 0.4, sz, a), 0x8a6a40));
    for (const [dx, dz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) dhabaWood.push(bake(new THREE.BoxGeometry(0.05, 0.4, 0.05), at(sx + dx * Math.cos(a) - dz * Math.sin(a), 0.2, sz + dx * Math.sin(a) + dz * Math.cos(a), a), 0x6f5233));
  }
  for (let i = 0; i < 4; i++) charpaiGeos(geos, 1.5 + i * 2.1, 25, Math.PI / 2 + (i % 2 ? 0.05 : -0.04));
  // Parked trucks in plain colours (no marks).
  const truckMetal = dhabaMetal;
  dhabaWood.forEach((g) => crateWood.push(g));
  truck(geos, 3, -2, 0xc4372f, 0.0, truckMetal, crateWood);
  truck(geos, 9, 48, 0x3f7a5a, Math.PI, truckMetal, crateWood);
  truck(geos, -4, 40, 0xd9a43a, 0.12, truckMetal, crateWood);
  // Gantry over the road entrance (facing the highway) on two posts, so the mandi is named from the road.
  for (const sz of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.12, 0.14, 4.6, 8), at(-12.6, 2.3, sz * 3.9), 0x5a5a5a));
  const mandi = finishSite('mandi', geos, position, { roughness: 0.92, sets: { wood: crateWood, jute: sacks, metal: truckMetal }, boards: [
    { id: 'mandi', x: -12.7, y: 4.45, z: 0, ry: -Math.PI / 2, w: 7.2 },
    { id: 'godown', x: -0.12, y: 4.1, z: -22, ry: -Math.PI / 2, w: 3.8 },
    { id: 'dhaba', x: 5, y: 3.0, z: 28.94, ry: Math.PI, w: 3.4 },
  ] });
  const truckSolid = (x, z, ry) => [x - Math.sin(ry) * 0.5, z - Math.cos(ry) * 0.5, 2.7, 8.6, ry]; // body centre sits 0.5 m behind the origin along the truck's own axis
  const rects = [
    [-12.6, -3.9, 0.3, 0.3], [-12.6, 3.9, 0.3, 0.3], // road gantry posts
    [5, -22, 10.2, 18.2], // grain godown
    [5, 32, 9.2, 6.2], // dhaba hall
    [-11, 22, 3.6, 3.6], // weighbridge cabin
    ...[-1, 1, 0].flatMap((sx) => [-1, 1].map((sz) => [4 + sx * 5.5, 4 + sz * 6.5, 0.35, 0.35])), // vegetable shed poles
    ...[0, 1, 2].map((r) => [4, r * 3.2, 9.4, 0.9]), // crate rows
    truckSolid(3, -2, 0), truckSolid(9, 48, Math.PI), truckSolid(-4, 40, 0.12),
    ...[0, 1, 2, 3].map((i) => [1.5 + i * 2.1, 25, 1.9, 1.0, Math.PI / 2 + (i % 2 ? 0.05 : -0.04)]), // dhaba charpais
  ];
  mandi.children[0].userData.colliderBoxes = orientedSolids(position, 0, rects);
  mandi.add(buildGoodsMesh(produce, new THREE.Matrix4(), 'mandi_produce'));
  mandi.add(createNPC(0x3f6a8a, { x: 5.5, z: 28.0 }, Math.PI, 'npc_dhaba_cook')); // cook between tandoor and counter, facing the road (capsule until the 3D people arrive)
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
 * One leg of the east road (src/eastRoad.js): packed-earth carriageway 5 m wide with twin ruts and dust, broken stone edging on both
 * sides, and an open drain with stone lips on the north side, bridged by a slab where a lane or field track would cross.
 * Built along local +x (centre at the midpoint of the leg), turned to the leg's heading. Visual only: edging and drain are kerb height.
 */
export function createEastRoadLeg(leg) {
  const geos = [];
  const L = leg.len + 1.6; // overlap the next leg so the bend has no gap
  const W = leg.w || 5;
  let seed = 41 + leg.i * 13 + (leg.id.length * 7) % 29;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const strip = (w, y, x0, x1, z, color) => geos.push(bake(new THREE.BoxGeometry(x1 - x0, 0.02, w), at((x0 + x1) / 2, y, z), color));
  const n = Math.ceil(L / 3.5);
  for (let i = 0; i < n; i++) {
    const x0 = -L / 2 + (i * L) / n, x1 = -L / 2 + ((i + 1) * L) / n + 0.15;
    strip(W - 0.3 + rnd() * 0.5, 0.035, x0, x1, (rnd() - 0.5) * 0.25, [0x93805f, 0x8f7c5b, 0x9a8663, 0x92805d][i % 4]);
  }
  for (const rz of [-0.9, 0.9]) strip(0.38, 0.05, -L / 2, L / 2, rz, 0x7c6a4b);
  for (let i = 0; i < L / 3; i++) { const x0 = -L / 2 + rnd() * (L - 6); strip(0.5 + rnd() * 0.6, 0.045, x0, x0 + 2 + rnd() * 4, (rnd() - 0.5) * 1.2, 0xa4916c); }
  // Broken edging stones (whitewashed once, now dusty), each turned and tinted a little; gaps where carts pull in.
  for (const side of [-1, 1]) {
    let x = -L / 2 + rnd();
    while (x < L / 2 - 1) {
      const len = 0.5 + rnd() * 0.5;
      if (rnd() > 0.12) {
        const h = 0.08 + rnd() * 0.07;
        geos.push(bake(new THREE.BoxGeometry(len, h, 0.16 + rnd() * 0.06), at(x + len / 2, h / 2, side * (W / 2 + (rnd() - 0.5) * 0.12), (rnd() - 0.5) * 0.1), [0xcfc6ae, 0xbfb59b, 0xd8cfb8, 0xa89e86][Math.floor(rnd() * 4)]));
      }
      x += len + 0.05 + (rnd() < 0.1 ? 1.2 : 0);
    }
  }
  // The north drain: dark silty bed between two stone lips, a slab bridge every ~38 m.
  const dz = -(W / 2 + 0.95);
  if (!leg.noDrain) strip(0.55, 0.012, -L / 2, L / 2, dz, 0x3b3226);
  if (!leg.noDrain) for (const lz of [dz - 0.36, dz + 0.36]) {
    let x = -L / 2;
    while (x < L / 2) {
      const len = 0.8 + rnd() * 0.6;
      geos.push(bake(new THREE.BoxGeometry(len, 0.12 + rnd() * 0.06, 0.17), at(x + len / 2, 0.07, lz, (rnd() - 0.5) * 0.06), [0x9a9282, 0xaaa290, 0x8c8474][Math.floor(rnd() * 3)]));
      x += len + 0.03;
    }
  }
  const slabX = -L / 2 + 8 + rnd() * 10;
  if (!leg.noDrain) geos.push(bake(new THREE.BoxGeometry(2.2, 0.1, 1.5), at(slabX, 0.16, dz), 0xaaa290));
  // Dung cakes, pebbles and a few dry straws of the day's traffic.
  for (let i = 0; i < L / 9; i++) geos.push(bake(new THREE.CylinderGeometry(0.26, 0.29, 0.05, 8), at(-L / 2 + rnd() * L, 0.06, (rnd() - 0.5) * 3.8), 0x6a5a3a));
  for (let i = 0; i < L / 2.5; i++) geos.push(bake(new THREE.DodecahedronGeometry(0.07 + rnd() * 0.08, 0), at(-L / 2 + rnd() * L, 0.07, (rnd() - 0.5) * 4.6, rnd() * 3), [0x9b9588, 0x8a8478, 0xa59c88][i % 3]));
  const g = finishSite(leg.id, geos, { x: (leg.a.x + leg.b.x) / 2, z: (leg.a.z + leg.b.z) / 2 }, { earth: true }); // real scanned ground PBR set under the baked tints (same call count);
  g.rotation.y = Math.atan2(-(leg.b.z - leg.a.z), leg.b.x - leg.a.x);
  return g;
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
