/**
 * The slimmed Sketchfab props of public/assets/props_new (26 Nov 2026, docs/model-size-table-26nov.md, all CC BY 4.0, credits in docs/CREDITS.md):
 * scarecrows in big fields, short fence runs round farm yards, pots by house, school and panchayat walls, climbers on house walls, banana clusters,
 * mango trees at orchard edges, and instanced vegetable beds (cabbage, tomato, radish, eggplant, watermelon, corn, wheat) in a few field plots.
 * Same pattern as src/placedPropsFarm.js: gateRadius 0 (streams after Play), one propGate site per 45 m cluster, one GLB request per file inside a site,
 * one clone per single prop (geometry and materials shared). Beds use ONE InstancedMesh per mesh of a model, so a bed costs a few draw calls.
 * Rows (src/placedPropsNewData.js) come from tools/placed-props-new-check.mjs --write and are verified by it (0 FAIL).
 * Never touches sugarcane, gobar, haystacks or their fields. Models are real metres with the base on y = 0, so only yaw and a 0.92-1.08 jitter are applied.
 */
import * as THREE from 'three';
import { registerPropSite } from './propGate.js';
import { SIZE, PROPS, BEDS, bedPoints } from './placedPropsNewData.js';

const CLUSTER_M = 45;
const url = (f) => `assets/props_new/${f}.glb`;

function clusters() {
  const items = [...PROPS.map((p) => ({ kind: 'prop', p, x: p.x, z: p.z })), ...BEDS.map((b) => ({ kind: 'bed', b, x: b.cx, z: b.cz }))];
  const out = [];
  for (const v of items) {
    let c = out.find((k) => Math.hypot(k.x0 - v.x, k.z0 - v.z) < CLUSTER_M);
    if (!c) { c = { x0: v.x, z0: v.z, list: [] }; out.push(c); }
    c.list.push(v);
  }
  for (const c of out) {
    c.x = c.list.reduce((s, v) => s + v.x, 0) / c.list.length; c.z = c.list.reduce((s, v) => s + v.z, 0) / c.list.length;
    c.extent = Math.max(...c.list.map((v) => Math.hypot(v.x - c.x, v.z - c.z) + (v.kind === 'bed' ? Math.max(v.b.w, v.b.d) / 2 : 3))) + 4;
    c.files = [...new Set(c.list.map((v) => (v.kind === 'prop' ? v.p.f : v.b.f)))];
  }
  return out;
}

export function registerNewProps(scene, groundAt) {
  clusters().forEach((c, i) => registerPropSite({
    name: `placed_new_props_${i}`, gateRadius: 0, center: { x: c.x, z: c.z }, extent: c.extent,
    items: c.files.map((f) => ({ url: url(f), size: SIZE[f].n })),
    makeGroup: () => new THREE.Group(), build: (gltfs, group) => buildCluster(c, gltfs, group, groundAt),
  }));
}

function buildCluster(c, gltfs, group, groundAt) {
  const gy = (x, z) => (groundAt ? groundAt(x, z) : 0);
  c.list.forEach((v) => {
    if (v.kind === 'prop') buildProp(v.p, gltfs[c.files.indexOf(v.p.f)], group, gy);
    else buildBed(v.b, gltfs[c.files.indexOf(v.b.f)], group, gy);
  });
}

function buildProp(p, g, group, gy) {
  if (!g) return;
  const z = SIZE[p.f], m = g.scene.clone(true); // one shared request per file, one copy per prop (geometry and materials stay shared)
  m.position.y = z.dy || 0; // corn_a: base floats 0.17 m after decimation, so it is sunk
  const holder = new THREE.Group();
  holder.name = `new_${p.f}`;
  holder.userData.propSize = z.n;
  holder.scale.set(p.k * (z.sx || 1), p.k, p.k * (z.sz || 1)); // climbers are squashed in depth so they lie flat against the wall
  holder.add(m);
  holder.position.set(p.x, gy(p.x, p.z), p.z);
  holder.rotation.y = p.yaw;
  m.traverse((o) => { if (o.isMesh) { o.castShadow = z.n >= 1.5; o.receiveShadow = true; } });
  holder.updateMatrixWorld(true);
  group.add(holder);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0);

function buildBed(b, g, group, gy) {
  if (!g) return;
  const z = SIZE[b.f], pts = bedPoints(b);
  if (!pts.length) return;
  g.scene.updateMatrixWorld(true);
  const holder = new THREE.Group();
  holder.name = `new_bed_${b.f}`;
  holder.userData.propSize = Math.max(z.n, 0.8);
  const y0 = gy(b.cx, b.cz);
  holder.position.set(b.cx, y0, b.cz);
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    const im = new THREE.InstancedMesh(o.geometry, o.material, pts.length); // one InstancedMesh per mesh, shared geometry and material
    pts.forEach((q, i) => {
      _q.setFromAxisAngle(_y, q.yaw); _s.setScalar(q.k); _p.set(q.x - b.cx, gy(q.x, q.z) - y0 + (z.dy || 0), q.z - b.cz);
      _m.compose(_p, _q, _s).multiply(o.matrixWorld);
      im.setMatrixAt(i, _m);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.castShadow = false; im.receiveShadow = true;
    holder.add(im);
  });
  holder.updateMatrixWorld(true);
  group.add(holder);
}
