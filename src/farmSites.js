import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'dudh_dairy';
  group.add(mesh);
  group.position.set(position.x, 0, position.z);
  return group;
}

function finishSite(name, geos, position, opts = {}) {
  const mesh = new THREE.Mesh(mergeGeometries(geos), vcMat(opts));
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
  return finishSite('health_subcentre', geos, position);
}

/** Chemist: narrow cream shop with a green shutter, tin awning and a glass counter front. */
export function createChemist(position) {
  const geos = smallBuilding({ w: 4.2, d: 4, h: 3.1, wall: 0xe9d9c3, band: 0x2f7d5b, door: 0x2f7d5b });
  geos.push(bake(new THREE.BoxGeometry(4.8, 0.07, 1.6), new THREE.Matrix4().makeRotationX(0.14).setPosition(0, 2.75, 2.8), 0x8e969c));
  for (const sx of [-1, 1]) geos.push(bake(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), at(sx * 2.2, 1.2, 3.4), 0x5a5a5a));
  geos.push(bake(new THREE.BoxGeometry(3.2, 1.0, 0.7), at(0, 0.85, 2.6), 0x9a7a52));
  geos.push(bake(new THREE.BoxGeometry(3.0, 0.9, 0.05), at(0, 1.8, 2.3), 0x9fb8bd));
  return finishSite('chemist', geos, position, { roughness: 0.85 });
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
  return finishSite('masjid', geos, position);
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
  return finishSite('gurudwara', geos, position);
}
