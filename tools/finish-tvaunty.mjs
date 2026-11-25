#!/usr/bin/env node
/**
 * 25 Nov: finishing recipe for GOSSIP AUNTY (TV Aunty), same idea as Parlour Didi / the TV Uncles.
 *   node tools/finish-tvaunty.mjs <face-passed.glb> <out.glb> [stage1-out.glb]
 * Input = Tripo Smart Mesh export that has already been through tools/face_keys.py (blink + smile keys), then tools/eye_patch.py.
 * 1. clip names -> idle, walk, gesture_call, gesture_laugh, gesture_greet, gesture_lookaround
 * 2. matte skin and saree (metalness 0, no metal-rough texture)
 * 3. small items Tripo cannot make (owner's rule), each parented to the right bone and placed ON the mesh surface by ray-casting
 *    the bind-pose head (so nothing floats): bindi, sindoor, nose pin (her LEFT nostril), gold jhumkas, 4 thin bangles per wrist,
 *    thin gold watch on the LEFT wrist above the bangles
 * 4. textures stay 4096 (WebP q90, like Didi: never shrunk), meshopt
 * Model scale: the model is ~1.0 high and stands ~1.6 m in game, so 1 mm real = 0.000625 model units.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';

const [inArg, outArg, stageArg] = process.argv.slice(2);
if (!inArg || !outArg) { console.error('usage: node tools/finish-tvaunty.mjs <face-passed.glb> <out.glb> [stage1.glb]'); process.exit(1); }
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(resolve(inArg));
const root = doc.getRoot();
const MM = 0.000625; // model units per real millimetre

// 1. clip names
const NAMES = [[/^idle/i, 'idle'], [/^walk/i, 'walk'], [/^make_a_call/i, 'gesture_call'], [/^laugh/i, 'gesture_laugh'], [/^greet/i, 'gesture_greet'], [/^look_around/i, 'gesture_lookaround']];
for (const a of root.listAnimations()) {
  const hit = NAMES.find(([re]) => re.test(a.getName()));
  if (!hit) throw new Error(`unexpected clip name ${a.getName()}`);
  a.setName(hit[1]);
}
const have = root.listAnimations().map((a) => a.getName()).sort().join(',');
if (have !== NAMES.map((n) => n[1]).sort().join(',')) throw new Error(`clip set wrong: ${have}`);

// 2. matte body
for (const m of root.listMaterials()) m.setMetallicFactor(0).setRoughnessFactor(0.85).setMetallicRoughnessTexture(null);

const skin = root.listSkins()[0];
const bone = (n) => skin.listJoints().find((j) => j.getName() === `mixamorig:${n}`);
const M4 = (n) => new THREE.Matrix4().fromArray(n.getWorldMatrix());
const P3 = (n) => new THREE.Vector3().setFromMatrixPosition(M4(n));
const prims = root.listMeshes()[0].listPrimitives();
const prim = prims[0]; // skin + hair + saree prim (the second prim is the eye-lid patch)
const POS = prim.getAttribute('POSITION'), JT = prim.getAttribute('JOINTS_0'), WT = prim.getAttribute('WEIGHTS_0');
const jointIdx = (n) => skin.listJoints().indexOf(bone(n));

// ray-casting against the bind-pose mesh
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POS.getArray()), 3));
geo.setIndex(new THREE.BufferAttribute(new Uint32Array(prim.getIndices().getArray()), 1));
const rayMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
rayMesh.updateMatrixWorld(true);
const rc = new THREE.Raycaster();
function hit(origin, target) { // first surface hit travelling from origin toward target
  const d = target.clone().sub(origin).normalize();
  rc.set(origin, d); rc.near = 0; rc.far = 5;
  const h = rc.intersectObject(rayMesh, false)[0];
  if (!h) throw new Error(`no surface hit ${origin.toArray()} -> ${target.toArray()}`);
  const n = h.face.normal.clone(); if (n.dot(d) > 0) n.negate();
  return { p: h.point.clone(), n };
}
// head front view -> model coords (the numbers tools/prep.py wrote: centre x, centre z, 0.2 m over 600 px)
const HC = { cx: 0.00219731405377388, zc: 0.91650390625, s: 0.2 / 600 };
const fx = (px) => HC.cx + (px - 300) * HC.s, fy = (py) => HC.zc - (py - 300) * HC.s;
const front = (px, py) => hit(new THREE.Vector3(fx(px), fy(py), 1), new THREE.Vector3(fx(px), fy(py), 0));

// geometry helpers (lathe round local Y)
function lathe(profile, seg = 28) {
  const pos = [], nor = [], idx = [];
  for (let s = 0; s <= seg; s++) {
    const ang = (s / seg) * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang);
    for (const [r, y, nr, ny] of profile) { pos.push(r * c, y, r * sn); nor.push(nr * c, ny, nr * sn); }
  }
  const n = profile.length;
  for (let s = 0; s < seg; s++) for (let k = 0; k < n - 1; k++) {
    const a = s * n + k, b = (s + 1) * n + k, c2 = (s + 1) * n + k + 1, d = s * n + k + 1;
    idx.push(a, d, b, b, d, c2);
  }
  return { pos, nor, idx };
}
const torus = (R, r, ring = 10) => lathe(Array.from({ length: ring + 1 }, (_, i) => { const a = (i / ring) * Math.PI * 2; return [R + r * Math.cos(a), r * Math.sin(a), Math.cos(a), Math.sin(a)]; }), 40);
const band = (Rin, h, th) => lathe([[Rin, -h / 2, 0, -1], [Rin + th, -h / 2, 0, -1], [Rin + th, -h / 2, 1, 0], [Rin + th, h / 2, 1, 0], [Rin + th, h / 2, 0, 1], [Rin, h / 2, 0, 1], [Rin, h / 2, -1, 0], [Rin, -h / 2, -1, 0]], 40);
const disc = (R, h) => lathe([[0, -h / 2, 0, -1], [R, -h / 2, 0, -1], [R, -h / 2, 1, 0], [R, h / 2, 1, 0], [R, h / 2, 0, 1], [0, h / 2, 0, 1]], 32);
const sphere = (R, seg = 14) => lathe(Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI; return [R * Math.sin(a), R * Math.cos(a), Math.sin(a), Math.cos(a)]; }), seg);
// jhumka dome: top at y=0, hangs down, open underneath
const dome = (R) => lathe(Array.from({ length: 11 }, (_, i) => { const a = (i / 10) * 1.75; return [R * Math.sin(a), R * Math.cos(a) - R, Math.sin(a), Math.cos(a)]; }), 24);

function addMesh(parent, name, g, material, worldMatrix) {
  const matrix = M4(parent).invert().multiply(worldMatrix); // world (bind pose) -> parent bone's local frame
  const pos = new Float32Array(g.pos), nor = new Float32Array(g.nor);
  const tp = new THREE.Vector3(), tn = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(matrix);
  for (let i = 0; i < pos.length; i += 3) {
    tp.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(matrix); tn.set(nor[i], nor[i + 1], nor[i + 2]).applyMatrix3(nm).normalize();
    pos.set([tp.x, tp.y, tp.z], i); nor.set([tn.x, tn.y, tn.z], i);
  }
  const buf = root.listBuffers()[0];
  const P = doc.createAccessor(`${name}_pos`).setType('VEC3').setArray(pos).setBuffer(buf);
  const N = doc.createAccessor(`${name}_nor`).setType('VEC3').setArray(nor).setBuffer(buf);
  const I = doc.createAccessor(`${name}_idx`).setType('SCALAR').setArray(new Uint32Array(g.idx)).setBuffer(buf);
  const p = doc.createPrimitive().setAttribute('POSITION', P).setAttribute('NORMAL', N).setIndices(I).setMaterial(material);
  parent.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(p)));
}
const Y = new THREE.Vector3(0, 1, 0);
// world matrix: put local Y along `dir` at `pos`
const frame = (pos, dir) => new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, dir.clone().normalize())));

const gold = doc.createMaterial('gold_jewellery').setBaseColorFactor([1.0, 0.76, 0.28, 1]).setMetallicFactor(1).setRoughnessFactor(0.3).setDoubleSided(true);
const redMat = doc.createMaterial('sindoor_red').setBaseColorFactor([0.62, 0.02, 0.03, 1]).setMetallicFactor(0).setRoughnessFactor(0.7).setDoubleSided(true);
const dialMat = doc.createMaterial('watch_dial').setBaseColorFactor([0.93, 0.9, 0.82, 1]).setMetallicFactor(0).setRoughnessFactor(0.6);

// ---------- face items (parented to the Head bone) ----------
const head = bone('Head');
const DBG = {};
{ // BINDI: round red dot centred between the brows, lying on the forehead
  const h = front(+process.env.BINDI_X || 293, +process.env.BINDI_Y || 274);
  addMesh(head, 'bindi_red', disc(3.4 * MM, 0.5 * MM), redMat, frame(h.p.clone().addScaledVector(h.n, 0.15 * MM), h.n));
  DBG.bindi = h.p.toArray();
}
{ // SINDOOR: thin red line along the centre parting, from the hairline back ~4 cm (strip hugging the surface)
  const PX = (py) => (+process.env.PART_X0 || 291) + (py - 160) * (+process.env.PART_DX || 0.04); // parting x in the front picture
  let py = +process.env.HAIRLINE_Y || 160; const pts = [];
  let len = 0, last = null; const L = 40 * MM / 0.9; // 4 cm real (the strip is slightly shorter than this arc)
  while (len < L && py > 20) {
    const h = front(PX(py), py); pts.push(h);
    if (last) len += h.p.distanceTo(last.p);
    last = h; py -= 1.5;
  }
  const W = 1.8 * MM, pos = [], nor = [], idx = [];
  pts.forEach((h, i) => {
    const a = pts[Math.max(0, i - 1)].p, b = pts[Math.min(pts.length - 1, i + 1)].p;
    const t = b.clone().sub(a).normalize(), side = t.clone().cross(h.n).normalize();
    const w = W * (i === 0 ? 0.6 : 1) * (i > pts.length - 6 ? Math.max(0.35, (pts.length - 1 - i) / 5) : 1) / 2; // slight taper at both ends
    for (const sgn of [-1, 1]) { const p = h.p.clone().addScaledVector(side, sgn * w).addScaledVector(h.n, 0.25 * MM); pos.push(p.x, p.y, p.z); nor.push(h.n.x, h.n.y, h.n.z); }
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  addMesh(head, 'sindoor_red', { pos, nor, idx }, redMat, new THREE.Matrix4());
  DBG.sindoor = { n: pts.length, from: pts[0].p.toArray(), to: pts[pts.length - 1].p.toArray(), arcReal_cm: +(len / MM / 10).toFixed(2) };
}
{ // NOSE PIN: tiny gold stud on HER LEFT nostril (+x, image right in front view)
  const tx = +process.env.NOSE_X || 327, ty = +process.env.NOSE_Y || 383;
  const t = new THREE.Vector3(fx(tx), fy(ty), 0.07);
  const h = hit(new THREE.Vector3(t.x + 0.05, t.y, t.z + 0.07), t);
  addMesh(head, 'nose_pin_gold', sphere(1.2 * MM, 12), gold, new THREE.Matrix4().makeTranslation(...h.p.clone().addScaledVector(h.n, 0.25 * MM).toArray()));
  DBG.nose = h.p.toArray();
}
{ // EARRINGS: gold jhumkas, one per ear, hanging from the lobe
  for (const sgn of [1, -1]) {
    const v = [0, 0, 0]; let best = null;
    for (let i = 0; i < POS.getCount(); i++) {
      POS.getElement(i, v);
      if (sgn * v[0] > 0.05 && v[1] > 0.855 && v[1] < 0.89 && v[2] > -0.03 && v[2] < -0.005 && (!best || v[1] < best[1])) best = [...v];
    }
    if (!best) throw new Error('no ear lobe found');
    // outer surface of the lobe at that height
    const h = hit(new THREE.Vector3(sgn * 0.3, best[1] + 0.004, best[2]), new THREE.Vector3(0, best[1] + 0.004, best[2]));
    const lobe = h.p.clone(); lobe.x = sgn * (Math.abs(lobe.x) - 0.0006);
    const name = sgn > 0 ? 'left' : 'right';
    const R = 4.6 * MM, top = new THREE.Vector3(best[0] + sgn * 0.0008, best[1] + 0.0013, best[2]); // bell hangs from the very bottom of the lobe
    addMesh(head, `jhumka_stud_${name}`, sphere(1.8 * MM, 12), gold, new THREE.Matrix4().makeTranslation(lobe.x + sgn * 0.0006, best[1] + 0.0027, lobe.z));
    addMesh(head, `jhumka_dome_${name}`, dome(R), gold, new THREE.Matrix4().makeTranslation(top.x, top.y, top.z));
    addMesh(head, `jhumka_drop_${name}`, sphere(1.4 * MM, 10), gold, new THREE.Matrix4().makeTranslation(top.x, top.y - 1.18 * R - 0.9 * MM, top.z));
    DBG['ear_' + name] = { lobe: lobe.toArray(), bottom: best };
  }
}

// ---------- wrists ----------
const axisCache = {};
function fitAxis(side) { // the bone line is not the arm's real axis (Tripo A-pose): fit the axis through two skin-slab centres near the wrist
  if (axisCache[side]) return axisCache[side];
  const L = P3(bone(`${side}Hand`)).distanceTo(P3(bone(`${side}ForeArm`)));
  let axis = null;
  for (let it = 0; it < 3; it++) {
    const c1 = wristInfo(side, L - 0.075, axis, true).centre, c2 = wristInfo(side, L - 0.01, axis, true).centre;
    axis = c2.clone().sub(c1).normalize();
  }
  return (axisCache[side] = axis);
}
function wristInfo(side, tAxial, axisIn, raw) {
  const fa = bone(`${side}ForeArm`);
  const a = P3(fa), b = P3(bone(`${side}Hand`));
  const axis = axisIn || (raw ? b.clone().sub(a).normalize() : fitAxis(side)), len = b.clone().sub(a).length();
  const want = [jointIdx(`${side}ForeArm`), jointIdx(`${side}Hand`)];
  const pts = [], v = [0, 0, 0], j = [0, 0, 0, 0], w = [0, 0, 0, 0];
  for (let i = 0; i < POS.getCount(); i++) {
    POS.getElement(i, v); JT.getElement(i, j); WT.getElement(i, w);
    let best = 0; for (let k = 1; k < 4; k++) if (w[k] > w[best]) best = k;
    if (!want.includes(j[best])) continue;
    const p = new THREE.Vector3(v[0], v[1], v[2]), rel = p.clone().sub(a), t = rel.dot(axis);
    if (Math.abs(t - tAxial) > 0.006) continue;
    pts.push(rel.sub(axis.clone().multiplyScalar(t))); // radial vector from the arm axis
  }
  if (pts.length < 8) throw new Error(`no arm vertices near ${side} wrist`);
  // centre = middle of the slab's extent in two perpendicular directions (robust to uneven vertex density); radius = mean half-extent
  const e1 = new THREE.Vector3(0, 0, 1).sub(axis.clone().multiplyScalar(axis.z)).normalize(), e2 = axis.clone().cross(e1).normalize();
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (const p of pts) { const u = p.dot(e1), vv = p.dot(e2); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, vv); v1 = Math.max(v1, vv); }
  const c = e1.clone().multiplyScalar((u0 + u1) / 2).addScaledVector(e2, (v0 + v1) / 2);
  return { fa, len, axis, centre: a.clone().addScaledVector(axis, tAxial).add(c), r: Math.max(u1 - u0, v1 - v0) / 2, n: pts.length };
}
for (const side of ['Left', 'Right']) {
  const L = P3(bone(`${side}Hand`)).distanceTo(P3(bone(`${side}ForeArm`)));
  const TUBE = 1.3 * MM;
  for (let k = 0; k < 4; k++) { // 4 thin bangles, 7 mm apart, just before the hand
    const w = wristInfo(side, L - 0.012 - k * 0.0045);
    addMesh(w.fa, `bangle_gold_${side.toLowerCase()}_${k}`, torus(w.r + TUBE * 0.35, TUBE), gold, frame(w.centre, w.axis));
    if (k === 0) console.log(`${side} bangles at ${w.centre.toArray().map((x) => x.toFixed(3))}: wrist r=${w.r.toFixed(4)} (${w.n} verts) forearm ${L.toFixed(3)}`);
  }
  if (side === 'Left') { // thin delicate gold watch above the bangles
    const t = L - 0.012 - 3 * 0.0045 - 0.0075;
    const w = wristInfo('Left', t);
    const th = 0.8 * MM, strapH = 9 * MM;
    addMesh(w.fa, 'watch_strap_gold_left', band(w.r, strapH, th), gold, frame(w.centre, w.axis));
    const out = new THREE.Vector3(1, 0, 0); out.sub(w.axis.clone().multiplyScalar(out.dot(w.axis))).normalize(); // back of the wrist (+x for her left arm)
    const at = (off) => frame(w.centre.clone().addScaledVector(out, w.r + th + off), out);
    addMesh(w.fa, 'watch_case_gold_left', disc(7.5 * MM, 3.2 * MM), gold, at(1.4 * MM));
    addMesh(w.fa, 'watch_dial_left', disc(5.8 * MM, 3.4 * MM), dialMat, at(1.5 * MM));
    console.log(`watch at ${w.centre.toArray().map((x) => x.toFixed(3))} r=${w.r.toFixed(4)} out=${out.toArray().map((x) => x.toFixed(2))}`);
  }
}
console.log('placed', JSON.stringify(DBG));

if (stageArg) await io.write(resolve(stageArg), doc);
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [4096, 4096] }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
await io.write(resolve(outArg), doc);
console.log(`${outArg}: ${(statSync(resolve(outArg)).size / 1e6).toFixed(2)} MB`);
