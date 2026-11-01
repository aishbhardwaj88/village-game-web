import * as THREE from 'three';

/**
 * Map turns (docs/layout/village-plan-positions-2026-11-01.json `turn_deg`). A place built square to the grid is turned as ONE
 * piece about a pivot: its group gets the rotation (so every mesh, merged or not, follows) and `userData.turn` records it so
 * the colliders follow too. Colliders are axis-aligned boxes only, so a hand-tagged box built square is turned into a few
 * small axis-aligned slices that cover the true rotated rectangle with an overshoot of about 0.25 m at most.
 * Rotation convention is the map's: three.js rotation.y = -turn_deg in radians (src/mapPlan.js).
 */
export const TURN_SLICE_ERR = 0.25;

/** Turn the group about pivot (px, pz). `deg` is the map's turn_deg. Returns the turn record. */
export function applyTurn(group, px, pz, deg) {
  const theta = -deg * Math.PI / 180;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  group.rotation.y = theta;
  group.position.set(px - (c * px + s * pz), 0, pz - (-s * px + c * pz));
  group.userData.turn = { px, pz, theta, c, s };
  return group.userData.turn;
}

/** Where a point built square lands once the place is turned (pre-turn x, z -> world x, z). */
export function turnXZ(px, pz, deg, x, z) {
  const theta = -deg * Math.PI / 180;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const dx = x - px;
  const dz = z - pz;
  return { x: px + dx * c + dz * s, z: pz - dx * s + dz * c };
}

/** The nearest ancestor (or self) that carries a turn record, or null. */
export function turnOf(obj) {
  for (let o = obj; o; o = o.parent) if (o.userData && o.userData.turn) return o.userData.turn;
  return null;
}

/** A turn record from the group that owns it (needed when a leaf is measured against that group's matrix). */
export function turnGroupOf(obj) {
  for (let o = obj; o; o = o.parent) if (o.userData && o.userData.turn) return o;
  return null;
}

/** Turn a pre-turn point to world. */
export function turnPointRec(t, x, z) {
  const dx = x - t.px;
  const dz = z - t.pz;
  return { x: t.px + dx * t.c + dz * t.s, z: t.pz - dx * t.s + dz * t.c };
}

/** World point -> pre-turn point (inverse). */
export function unturnPointRec(t, x, z) {
  const dx = x - t.px;
  const dz = z - t.pz;
  return { x: t.px + dx * t.c - dz * t.s, z: t.pz + dx * t.s + dz * t.c };
}

/** Pre-turn AABB -> array of world AABBs (each carrying `pre` and `turn` so doorways can still be found square). */
export function turnBox(box, t) {
  if (box.pre) return [box];
  const w = box.maxX - box.minX;
  const d = box.maxZ - box.minZ;
  const sa = Math.max(Math.abs(t.s), 1e-6);
  const step = Math.max(0.5, TURN_SLICE_ERR / sa);
  let nx = Math.max(1, Math.ceil(w / step));
  let nz = Math.max(1, Math.ceil(d / step));
  while (nx * nz > 400) { nx = Math.ceil(nx / 2); nz = Math.ceil(nz / 2); }
  const hx = w / nx / 2;
  const hz = d / nz / 2;
  const ex = Math.abs(t.c) * hx + Math.abs(t.s) * hz;
  const ez = Math.abs(t.s) * hx + Math.abs(t.c) * hz;
  const out = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const p = turnPointRec(t, box.minX + hx * (2 * i + 1), box.minZ + hz * (2 * j + 1));
      out.push({ minX: p.x - ex, maxX: p.x + ex, minZ: p.z - ez, maxZ: p.z + ez, pre: box, turn: t });
    }
  }
  return out;
}

/** Pre-turn XZ box of a solid-tagged leaf mesh that sits under a turned group. */
export function preTurnLeafBox(mesh, turnGroup) {
  const m = new THREE.Matrix4().copy(turnGroup.matrixWorld).invert().multiply(mesh.matrixWorld);
  const pos = mesh.geometry.attributes.position;
  const v = new THREE.Vector3();
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m);
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.z < minZ) minZ = v.z;
    if (v.z > maxZ) maxZ = v.z;
  }
  return isFinite(minX) ? { minX, maxX, minZ, maxZ } : null;
}
