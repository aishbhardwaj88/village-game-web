import * as THREE from 'three';

/**
 * Shops-land instancing helpers.
 *
 * 1. createChunkedInstances / createChunkedLOD: re-exported from the perf agent's shared helper (src/kit/instancing.js).
 *
 * 2. BatchKit - many different designs, one draw call per MATERIAL for the whole village. Every design is a set of
 *    per-material geometries (built in local space, front = +z); every placed copy is an instance in one THREE.BatchedMesh per
 *    material (per-instance frustum culling, per-instance colour, per-instance show/hide for distance LOD).
 */

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const _c = new THREE.Color();

// The real shared helper (perf agent, src/kit/instancing.js) replaced the stand-in that lived here; re-exported for callers.
export { createChunkedInstances, createChunkedLOD } from './instancing.js';

/** Part builder: per-material indexed geometry with position / normal / uv (in texture tiles) / color. */
export class Parts {
  constructor(tiles = {}) { this.tiles = tiles; this.m = new Map(); this._mat = new THREE.Matrix4(); this._nm = new THREE.Matrix3(); }
  _get(mat) {
    let b = this.m.get(mat);
    if (!b) { b = { pos: [], nor: [], uv: [], col: [], idx: [] }; this.m.set(mat, b); }
    return b;
  }
  /** Raw quad (4 corners in order, counter-clockwise seen from the front), uv corners given. */
  quad(mat, a, b, c, d, uvs, color = 0xffffff, matrix = null) {
    const B = this._get(mat), base = B.pos.length / 3;
    const v = [a, b, c, d].map((p) => new THREE.Vector3(...p));
    if (matrix) v.forEach((p) => p.applyMatrix4(matrix));
    const n = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0])).normalize();
    _c.set(color);
    for (let i = 0; i < 4; i++) { B.pos.push(v[i].x, v[i].y, v[i].z); B.nor.push(n.x, n.y, n.z); B.uv.push(uvs[i][0], uvs[i][1]); B.col.push(_c.r, _c.g, _c.b); }
    B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  /**
   * Axis box centred at (cx,cy,cz) with size (sx,sy,sz); optional yaw `ry` about its own centre and a parent `matrix`.
   * UVs are in texture tiles (metres / tile size of the material), measured in the part's frame so neighbours line up.
   * `skip`: face names to leave out ('px','nx','py','ny','pz','nz') - hidden faces cost triangles for nothing.
   */
  box(mat, cx, cy, cz, sx, sy, sz, { color = 0xffffff, ry = 0, matrix = null, skip = null, tile = null } = {}) {
    const t = tile || this.tiles[mat] || 1;
    const x0 = -sx / 2, x1 = sx / 2, y0 = -sy / 2, y1 = sy / 2, z0 = -sz / 2, z1 = sz / 2;
    const M = new THREE.Matrix4().makeRotationY(ry).setPosition(cx, cy, cz);
    if (matrix) M.premultiply(matrix);
    const ox = cx, oy = cy, oz = cz; // UV origin in the part frame (world-ish metres)
    const U = (u, v) => [u / t, v / t];
    const faces = {
      pz: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], (p) => U(p[0] + ox, p[1] + oy)],
      nz: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], (p) => U(-p[0] - ox, p[1] + oy)],
      px: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], (p) => U(-p[2] - oz, p[1] + oy)],
      nx: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], (p) => U(p[2] + oz, p[1] + oy)],
      py: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], (p) => U(p[0] + ox, -p[2] - oz)],
      ny: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], (p) => U(p[0] + ox, p[2] + oz)],
    };
    for (const k in faces) {
      if (skip && skip.includes(k)) continue;
      const f = faces[k];
      this.quad(mat, f[0], f[1], f[2], f[3], [f[4](f[0]), f[4](f[1]), f[4](f[2]), f[4](f[3])], color, M);
    }
  }
  /** Vertical cylinder (open or capped), `seg` sides, UV wraps round in metres. */
  cyl(mat, cx, cy0, cz, r0, r1, h, { seg = 10, color = 0xffffff, cap = true, matrix = null, tile = null } = {}) {
    const t = tile || this.tiles[mat] || 1;
    const M = new THREE.Matrix4().setPosition(cx, cy0, cz);
    if (matrix) M.premultiply(matrix);
    const circ = 2 * Math.PI * Math.max(r0, r1);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const p = (a, r, y) => [Math.sin(a) * r, y, Math.cos(a) * r];
      const u0 = (i / seg) * circ / t, u1 = ((i + 1) / seg) * circ / t;
      this.quad(mat, p(a0, r0, 0), p(a1, r0, 0), p(a1, r1, h), p(a0, r1, h), [[u0, 0], [u1, 0], [u1, h / t], [u0, h / t]], color, M);
      // smooth the side normals so a few sides read round
      const B = this._get(mat), n = B.nor.length;
      const s = [[a0], [a1], [a1], [a0]];
      for (let k = 0; k < 4; k++) { const a = s[k][0]; const vv = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)); if (matrix) vv.transformDirection(matrix); B.nor[n - 12 + k * 3] = vv.x; B.nor[n - 12 + k * 3 + 1] = vv.y; B.nor[n - 12 + k * 3 + 2] = vv.z; }
      if (cap && r1 > 0) this.quad(mat, [0, h, 0], p(a0, r1, h), p(a1, r1, h), [0, h, 0], [[0, 0], [Math.sin(a0) * r1 / t, Math.cos(a0) * r1 / t], [Math.sin(a1) * r1 / t, Math.cos(a1) * r1 / t], [0, 0]], color, M);
    }
  }
  /** -> { [mat]: BufferGeometry } */
  build() {
    const out = {};
    for (const [mat, B] of this.m) {
      if (!B.idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(B.col, 3));
      g.setIndex(B.idx);
      g.computeBoundingSphere();
      g.computeBoundingBox();
      out[mat] = g;
    }
    return out;
  }
}

/**
 * Collects designs and instances, then builds ONE BatchedMesh per material.
 *   kit.design(key, () => ({ [mat]: geometry }))   (built once per key)
 *   const id = kit.add(key, { x, z, y, ry, colors: { [mat]: hex } })
 *   kit.finalize(materials) -> Group;  kit.setVisible(id, bool)
 */
export class BatchKit {
  constructor(name) { this.name = name; this.designs = new Map(); this.instances = []; this.batches = null; }
  design(key, build) {
    if (!this.designs.has(key)) this.designs.set(key, build());
    return this.designs.get(key);
  }
  add(key, { x, z, y = 0, ry = 0, s = 1, colors = null, visible = true }) {
    const d = this.designs.get(key);
    if (!d) throw new Error(`BatchKit ${this.name}: unknown design ${key}`);
    this.instances.push({ key, x, y, z, ry, s, colors, visible, ids: null });
    return this.instances.length - 1;
  }
  finalize(materials, { castShadow = false } = {}) {
    const group = new THREE.Group();
    group.name = this.name;
    const perMat = new Map(); // mat -> { verts, idx, count, geos:Set }
    for (const inst of this.instances) {
      const d = this.designs.get(inst.key);
      for (const mat in d) {
        if (!perMat.has(mat)) perMat.set(mat, { verts: 0, idx: 0, count: 0, keys: new Set() });
        const e = perMat.get(mat);
        e.count++;
        if (!e.keys.has(inst.key)) { e.keys.add(inst.key); e.verts += d[mat].attributes.position.count; e.idx += d[mat].index.count; }
      }
    }
    this.batches = new Map();
    for (const [mat, e] of perMat) {
      const material = materials[mat];
      if (!material) { console.warn(`BatchKit ${this.name}: no material "${mat}"`); continue; }
      const bm = new THREE.BatchedMesh(e.count, e.verts, e.idx, material);
      bm.name = `${this.name}_${mat}`;
      bm.castShadow = castShadow;
      bm.receiveShadow = true;
      bm.userData.noAutoCollider = true; // colliders are explicit boxes (userData.colliderBoxes on the kit group's holder)
      const gids = new Map();
      for (const key of e.keys) gids.set(key, bm.addGeometry(this.designs.get(key)[mat]));
      this.batches.set(mat, { bm, gids });
      group.add(bm);
    }
    for (const inst of this.instances) {
      const d = this.designs.get(inst.key);
      inst.ids = {};
      _p.set(inst.x, inst.y, inst.z); _q.setFromAxisAngle(_up, inst.ry); _s.setScalar(inst.s);
      _m.compose(_p, _q, _s);
      for (const mat in d) {
        const b = this.batches.get(mat);
        if (!b) continue;
        const id = b.bm.addInstance(b.gids.get(inst.key));
        b.bm.setMatrixAt(id, _m);
        b.bm.setColorAt(id, _c.set(inst.colors?.[mat] ?? 0xffffff));
        if (!inst.visible) b.bm.setVisibleAt(id, false);
        inst.ids[mat] = id;
      }
    }
    return group;
  }
  setVisible(i, v) {
    const inst = this.instances[i];
    if (!inst || inst.visible === v) return;
    inst.visible = v;
    for (const mat in inst.ids) this.batches.get(mat).bm.setVisibleAt(inst.ids[mat], v);
  }
  /** Triangles this kit would draw with everything visible (for the notes). */
  stats() {
    let tris = 0;
    for (const inst of this.instances) { const d = this.designs.get(inst.key); for (const m in d) tris += d[m].index.count / 3; }
    return { instances: this.instances.length, designs: this.designs.size, batches: this.batches ? this.batches.size : 0, tris };
  }
}

/** Oriented rectangle -> axis boxes covering it, for the 2D collision system. Axis-aligned = one exact box; otherwise a grid of
 *  ~1 m cells, each its own box, so a turned shop never bulges more than ~0.2 m past its real wall. */
export function orientedBoxes(x, z, ry, w, d, step = 1.0) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const near = Math.abs(Math.sin(2 * ry)) < 0.03;
  const nx = near ? 1 : Math.max(1, Math.ceil(w / step)), nz = near ? 1 : Math.max(1, Math.ceil(d / step));
  const out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a0 = -w / 2 + (i * w) / nx, a1 = -w / 2 + ((i + 1) * w) / nx, b0 = -d / 2 + (j * d) / nz, b1 = -d / 2 + ((j + 1) * d) / nz;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const lx of [a0, a1]) for (const lz of [b0, b1]) {
      const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
      minX = Math.min(minX, wx); maxX = Math.max(maxX, wx); minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
    }
    out.push({ minX, maxX, minZ, maxZ });
  }
  return out;
}

/**
 * Distance packing for an InstancedMesh whose instances are spread over the whole village: keeps the full list in master
 * arrays and draws only the instances within `radius` of the camera (re-packed when the camera has moved `step` m).
 * Returns update(camera). The mesh is frustum-culling-free (its drawn set is always near), and hides when empty.
 */
export function nearPacker(mesh, radius, step = 6) {
  const total = mesh.count;
  const M = mesh.instanceMatrix.array.slice(0, total * 16);
  const C = mesh.instanceColor ? mesh.instanceColor.array.slice(0, total * 3) : null;
  let lx = 1e9, lz = 1e9;
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.visible = false;
  return (cam) => {
    const p = cam.position;
    if (Math.abs(p.x - lx) + Math.abs(p.z - lz) < step) return;
    lx = p.x; lz = p.z;
    let n = 0;
    for (let i = 0; i < total; i++) {
      const dx = M[i * 16 + 12] - p.x, dz = M[i * 16 + 14] - p.z;
      if (dx * dx + dz * dz > radius * radius) continue;
      mesh.instanceMatrix.array.set(M.subarray(i * 16, i * 16 + 16), n * 16);
      if (C) mesh.instanceColor.array.set(C.subarray(i * 3, i * 3 + 3), n * 3);
      n++;
    }
    mesh.count = n;
    mesh.visible = n > 0;
    mesh.instanceMatrix.needsUpdate = true;
    if (C) mesh.instanceColor.needsUpdate = true;
  };
}

/** An empty, never-culled mesh whose onBeforeRender runs `fn(camera)` once per frame without costing a draw call. */
export function frameHook(fn) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  g.setDrawRange(0, 0);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ visible: true, colorWrite: false, depthWrite: false }));
  m.name = 's7_frame_hook';
  m.frustumCulled = false;
  m.userData.noAutoCollider = true;
  m.onBeforeRender = (renderer, scene, cam) => fn(cam);
  return m;
}
