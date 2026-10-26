import * as THREE from 'three';
import { isNonSolidSource, SKIP_TOP } from './solidRules.js';

/**
 * Colliders derived from what is actually visible. Hand-tagged colliders (src/collision.js) are exact where they
 * exist, but a whole class of objects never got one (village edge walls, the khel maidan boundary rope, haystacks,
 * stalls, stools, poles...), so the player walked through them. Rather than hand-typing another box per object, every
 * opaque mesh in the player's body band (BAND_LO..BAND_HI metres up) is rasterised to a CELL grid in XZ and the
 * cells are merged into rectangles. Cells already inside a hand-tagged box are dropped, so existing colliders keep
 * their exact shape and this only fills the gaps. What is deliberately walkable is listed in src/solidRules.js.
 *
 * Results are cached per mesh (zones are rebuilt often, geometry only changes when a mesh is replaced).
 */
const CELL = 0.2;
const STEP = 0.1; // sample spacing along triangles, half a cell, so no cell the triangle touches is skipped
const BAND_LO = 0.35;
const BAND_HI = 1.5;
const INSET = 0.04; // pull each merged rect in a little so a doorway is never closed by cell rounding
const OFFSET = 20000;
const keyOf = (cx, cz) => (cx + OFFSET) * 40000 + (cz + OFFSET);

const cache = new WeakMap(); // mesh -> { sig, boxes }; the signature changes when instances are re-sorted or the mesh moves
const meshSig = (mesh) => `${mesh.isInstancedMesh ? mesh.count + ':' + mesh.instanceMatrix.version : ''}|${mesh.matrixWorld.elements[12].toFixed(2)},${mesh.matrixWorld.elements[13].toFixed(2)},${mesh.matrixWorld.elements[14].toFixed(2)},${mesh.matrixWorld.elements[0].toFixed(3)},${mesh.matrixWorld.elements[2].toFixed(3)}`;

const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

/** Clips a triangle (3 world-space vectors) to the Y band; returns a polygon (array of [x,y,z]) or null. */
function clipToBand(a, b, c) {
  let poly = [[a.x, a.y, a.z], [b.x, b.y, b.z], [c.x, c.y, c.z]];
  for (const [axisLimit, keepAbove] of [[BAND_LO, true], [BAND_HI, false]]) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const pin = keepAbove ? p[1] >= axisLimit : p[1] <= axisLimit;
      const qin = keepAbove ? q[1] >= axisLimit : q[1] <= axisLimit;
      if (pin) out.push(p);
      if (pin !== qin) {
        const t = (axisLimit - p[1]) / (q[1] - p[1]);
        out.push([p[0] + (q[0] - p[0]) * t, axisLimit, p[2] + (q[2] - p[2]) * t]);
      }
    }
    if (out.length < 2) return null;
    poly = out;
  }
  return poly;
}

function markSegment(cells, x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.ceil(len / STEP));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const cx = Math.floor((x0 + (x1 - x0) * t) / CELL);
    const cz = Math.floor((z0 + (z1 - z0) * t) / CELL);
    cells.add(keyOf(cx, cz));
  }
}

function markPolygon(cells, poly) {
  // outline
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    markSegment(cells, p[0], p[2], q[0], q[2]);
  }
  // interior (fan from vertex 0), only worth doing when the footprint has real area
  for (let i = 1; i + 1 < poly.length; i++) {
    const a = poly[0], b = poly[i], c = poly[i + 1];
    const area2 = Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2]));
    if (area2 < 0.04) continue; // a vertical face: its outline above already covers it
    const e1 = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const e2 = Math.hypot(c[0] - a[0], c[2] - a[2]);
    const n1 = Math.min(200, Math.max(1, Math.ceil(e1 / STEP)));
    const n2 = Math.min(200, Math.max(1, Math.ceil(e2 / STEP)));
    for (let u = 1; u < n1; u++) {
      for (let w = 1; w < n2; w++) {
        if (u / n1 + w / n2 > 1) continue;
        const fu = u / n1, fw = w / n2;
        const x = a[0] + (b[0] - a[0]) * fu + (c[0] - a[0]) * fw;
        const z = a[2] + (b[2] - a[2]) * fu + (c[2] - a[2]) * fw;
        cells.add(keyOf(Math.floor(x / CELL), Math.floor(z / CELL)));
      }
    }
  }
}

/** Greedy merge of a cell set into rectangles: horizontal runs first, then identical runs stacked vertically. */
function mergeCells(cells, src) {
  const byRow = new Map();
  for (const k of cells) {
    const cx = Math.floor(k / 40000) - OFFSET;
    const cz = (k % 40000) - OFFSET;
    let row = byRow.get(cz);
    if (!row) byRow.set(cz, (row = []));
    row.push(cx);
  }
  const open = new Map(); // "x0,x1" -> { x0, x1, z0, z1 }
  const out = [];
  const rows = [...byRow.keys()].sort((a, b) => a - b);
  let prevRow = null;
  for (const cz of rows) {
    const xs = byRow.get(cz).sort((a, b) => a - b);
    const runs = [];
    let s = xs[0], p = xs[0];
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] === p + 1) { p = xs[i]; continue; }
      runs.push([s, p]);
      s = p = xs[i];
    }
    runs.push([s, p]);
    const next = new Map();
    for (const [x0, x1] of runs) {
      const key = `${x0},${x1}`;
      const prev = prevRow === cz - 1 ? open.get(key) : null;
      if (prev) { prev.z1 = cz; next.set(key, prev); open.delete(key); }
      else next.set(key, { x0, x1, z0: cz, z1: cz });
    }
    for (const r of open.values()) out.push(r);
    open.clear();
    for (const [k, r] of next) open.set(k, r);
    prevRow = cz;
  }
  for (const r of open.values()) out.push(r);
  return out.map((r) => ({
    minX: r.x0 * CELL + INSET, maxX: (r.x1 + 1) * CELL - INSET,
    minZ: r.z0 * CELL + INSET, maxZ: (r.z1 + 1) * CELL - INSET,
    auto: true,
    src,
  }));
}

/** True when this mesh should be turned into colliders at all. */
export function isAutoSolidMesh(mesh, top) {
  if (!mesh.isMesh || mesh.userData.collider === true || mesh.userData.noAutoCollider) return false;
  if (SKIP_TOP.test(top)) return false;
  const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (!m || m.transparent || m.alphaTest > 0 || m.visible === false) return false;
  const g = mesh.geometry;
  if (!g || !g.attributes.position) return false;
  if (Array.isArray(mesh.userData.colliderBoxes) && mesh.userData.colliderBoxes.some((b) => b.animalBox)) return false;
  return !isNonSolidSource(`${top}/${mesh.name || '?'}/${m.name || ''}`);
}

/** Merged rectangles for one mesh (all instances), minus cells already covered by `isCovered(x, z)`. */
export function deriveMeshBoxes(mesh, isCovered, top = '') {
  const sig = meshSig(mesh);
  const hit = cache.get(mesh);
  if (hit && hit.sig === sig) return hit.boxes;
  const g = mesh.geometry;
  const pos = g.attributes.position;
  const idx = g.index;
  const tc = idx ? idx.count / 3 : pos.count / 3;
  mesh.updateWorldMatrix(true, false);
  const cells = new Set();
  const n = mesh.isInstancedMesh ? mesh.count : 1;
  for (let i = 0; i < n; i++) {
    if (mesh.isInstancedMesh) { mesh.getMatrixAt(i, _m2); _m.multiplyMatrices(mesh.matrixWorld, _m2); } else _m.copy(mesh.matrixWorld);
    for (let t = 0; t < tc; t++) {
      const a = idx ? idx.getX(t * 3) : t * 3;
      const b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      _v[0].fromBufferAttribute(pos, a).applyMatrix4(_m);
      _v[1].fromBufferAttribute(pos, b).applyMatrix4(_m);
      _v[2].fromBufferAttribute(pos, c).applyMatrix4(_m);
      if (Math.max(_v[0].y, _v[1].y, _v[2].y) < BAND_LO || Math.min(_v[0].y, _v[1].y, _v[2].y) > BAND_HI) continue;
      const poly = clipToBand(_v[0], _v[1], _v[2]);
      if (poly) markPolygon(cells, poly);
    }
  }
  for (const k of cells) {
    const cx = Math.floor(k / 40000) - OFFSET;
    const cz = (k % 40000) - OFFSET;
    if (isCovered((cx + 0.5) * CELL, (cz + 0.5) * CELL)) cells.delete(k);
  }
  const result = cells.size ? mergeCells(cells, `${top}/${mesh.name || '?'}`) : [];
  cache.set(mesh, { sig, boxes: result });
  return result;
}
