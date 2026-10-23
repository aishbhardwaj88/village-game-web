import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildGardenPlants, GARDEN_KIND } from './vegetation.js';

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
  g.deleteAttribute('uv');
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}
const at = (x, y, z, ry = 0) => new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);

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

const vcMat = (opts = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, ...opts });

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

/** Tubewell kothri (brick shade hut), motor pump, pipe and cistern with an outlet channel. */
export function createTubewell(position) {
  const geos = [];
  const BRICK = 0xb88b6a, LIME = 0xd9d0b8, SLAB = 0x9a968c, DOOR = 0x2f6b5a, IRON = 0x4d4a46, WATER = 0x5d6b3f;
  // Kothri 2.8 x 2.4, walls 2.3 high, flat slab roof with lip, plinth band.
  geos.push(bake(new THREE.BoxGeometry(2.8, 2.3, 2.4), at(0, 1.15, 0), LIME));
  geos.push(bake(new THREE.BoxGeometry(2.9, 0.45, 2.5), at(0, 0.22, 0), BRICK));
  geos.push(bake(new THREE.BoxGeometry(3.2, 0.16, 2.8), at(0, 2.38, 0), SLAB));
  geos.push(bake(new THREE.BoxGeometry(3.2, 0.1, 0.1), at(0, 2.5, 1.4), SLAB));
  geos.push(bake(new THREE.BoxGeometry(0.9, 1.7, 0.08), at(0.2, 0.95, 1.22), DOOR));
  geos.push(bake(new THREE.BoxGeometry(0.5, 0.5, 0.08), at(-0.9, 1.5, 1.22), IRON));
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
  geos.push(bake(new THREE.BoxGeometry(3.0, 0.04, 3.0), at(cx, 0.5, cz), WATER));
  geos.push(bake(new THREE.BoxGeometry(0.4, 0.12, 4.5), at(cx + 1.9, 0.05, cz + 3.8), SLAB));
  geos.push(bake(new THREE.BoxGeometry(0.22, 0.03, 4.3), at(cx + 1.9, 0.12, cz + 3.8), WATER));
  // Charpai in the kothri's shade and a steel water pot.
  geos.push(bake(new THREE.BoxGeometry(1.8, 0.08, 0.95), at(-0.5, 0.5, 2.7, 0.15), 0x7a5a38));
  for (const [dx, dz] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) geos.push(bake(new THREE.BoxGeometry(0.07, 0.5, 0.07), at(-0.5 + dx, 0.25, 2.7 + dz, 0.15), 0x5a4228));
  const mesh = new THREE.Mesh(mergeGeometries(geos), vcMat());
  mesh.name = 'tubewell';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'tubewell_prop';
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
  geos.push(bake(new THREE.BoxGeometry(2.0, 0.05, 0.9), at(0, 0.55, 4.4), 0xb34a3a)); // charpai-style cot cover
  return finishSite('tv_house', geos, position, { solids: [[0, 0, 8.2, 6.2]] });
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
  return finishSite('manihari', geos, position);
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
  return finishSite('sabzi_rehris', geos, position);
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
  return finishSite('highway_cluster', geos, position, { roughness: 0.92 });
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
  return finishSite('jalebi_stall', geos, position);
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
  return finishSite('mela_ground', geos, position);
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
  return finishSite('khel_maidan', geos, position);
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
    if (w > d) for (let i = 0; i < 6; i++) for (const y of [2.2, 5.6]) geos.push(bake(new THREE.BoxGeometry(1.4, 1.3, 0.1), at(x - w / 2 + 2 + i * 3.6, y, zf), 0x3f3a33));
  }
  // Verandah colonnade on the yard side of the long block.
  for (let i = 0; i < 6; i++) geos.push(bake(new THREE.CylinderGeometry(0.2, 0.24, 3.2, 8), at(-9 + i * 3.6, 1.8, -4.9), 0xe9e2cf));
  geos.push(bake(new THREE.BoxGeometry(22, 0.25, 2), at(0, 3.5, -4.9), 0xd8d2c0));
  // Yard wall with gate pillars at the open side.
  geos.push(bake(new THREE.BoxGeometry(14, 1.6, 0.3), at(9, 0.8, 12), 0xe0d2b0));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.BoxGeometry(0.9, 2.8, 0.9), at(2 + sx * 2.2, 1.4, 12), 0xcdbf9a));
  geos.push(bake(new THREE.CylinderGeometry(0.06, 0.08, 8, 6), at(6, 4, 4), 0x9a9a9a));
  return finishSite('gurukul', geos, position);
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
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const x = sx * (4.2 + i * 2.6);
      geos.push(bake(new THREE.BoxGeometry(1.1, 1.8, 0.12), at(x, 2.2, zf), wood));
      geos.push(bake(new THREE.BoxGeometry(1.1, 1.6, 0.12), at(x, 5.9, zf), 0x3d2f22));
      geos.push(bake(new THREE.BoxGeometry(1.4, 0.18, 0.4), at(x, 6.85, zf), trim));
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
  return finishSite('gaushala', geos, position, { solids: [[0, -D / 2, L, 0.4]] });
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
  geos.push(bake(new THREE.BoxGeometry(3.8, 0.2, 3.8), at(-11, 3.1, 22), 0x8d8a82));
  geos.push(bake(new THREE.BoxGeometry(1.6, 0.8, 0.15), at(-11, 3.8, 20.2), 0x2a2a2a));
  geos.push(bake(new THREE.BoxGeometry(5, 0.1, 0.1), at(-6, 1.1, 12.5), 0xd8d2c2));
  geos.push(bake(new THREE.BoxGeometry(0.1, 0.1, 0.1), at(-8.5, 1.1, 12.5), 0xc4372f));
  // Dhaba: low truck-stop eatery with a tin verandah, charpais and a tandoor chimney.
  geos.push(bake(new THREE.BoxGeometry(9, 3.2, 6), at(5, 1.75, 32), 0xe4cfa0));
  geos.push(bake(new THREE.BoxGeometry(9.06, 0.4, 6.06), at(5, 0.9, 32), 0xb8574a));
  geos.push(bake(new THREE.BoxGeometry(10.5, 0.1, 9), new THREE.Matrix4().makeRotationX(-0.07).setPosition(5, 3.6, 30), 0x8e969c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), at(5 + sx * 4.8, 1.7, 26), 0x6f5233));
  geos.push(bake(new THREE.CylinderGeometry(0.3, 0.38, 2, 8), at(8.5, 4.2, 33), 0xb0a590));
  for (let i = 0; i < 4; i++) {
    geos.push(bake(new THREE.BoxGeometry(1.0, 0.08, 2.0), at(1.5 + i * 2.1, 0.5, 25), 0x8a6a42));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geos.push(bake(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 5), at(1.5 + i * 2.1 + sx * 0.45, 0.25, 25 + sz * 0.9), 0x6f5233));
  }
  geos.push(bake(new THREE.BoxGeometry(0.1, 0.9, 3), at(3.3, 2.55, 29.01), 0x2f5f4a));
  // Parked trucks in plain colours (no marks).
  truck(geos, 3, -2, 0xc4372f, 0.0);
  truck(geos, 9, 48, 0x3f7a5a, Math.PI);
  truck(geos, -4, 40, 0xd9a43a, 0.12);
  return finishSite('mandi', geos, position, { roughness: 0.92 });
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
