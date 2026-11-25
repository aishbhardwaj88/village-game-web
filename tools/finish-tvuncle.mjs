#!/usr/bin/env node
/**
 * 25 Nov: finishing recipe for the TV Uncle review pair (HD + Smart Mesh), same steps for both so the comparison is fair.
 *   node tools/finish-tvuncle.mjs <raw.glb> <out.glb>
 * 1. clip names -> the game's convention (idle, walk, gesture_swagger/laugh/call/greet)
 * 2. body material: metalness 0, no metal-rough texture (matte skin and cloth, art rule)
 * 3. gold kada on the LEFT wrist, gold wristwatch on the RIGHT wrist: small separate meshes parented to the forearm bones
 * 4. tools/shrink.js: textures 2048 WebP, meshopt, triangles untouched
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const [inArg, outArg] = process.argv.slice(2);
if (!inArg || !outArg) { console.error('usage: node tools/finish-tvuncle.mjs <raw.glb> <out.glb>'); process.exit(1); }
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(resolve(inArg));
const root = doc.getRoot();

// 1. clip names
const NAMES = [[/^idle/i, 'idle'], [/^walk/i, 'walk'], [/^swagger/i, 'gesture_swagger'], [/^laugh/i, 'gesture_laugh'], [/^make_a_call/i, 'gesture_call'], [/^greet/i, 'gesture_greet']];
for (const a of root.listAnimations()) {
  const hit = NAMES.find(([re]) => re.test(a.getName()));
  if (!hit) throw new Error(`unexpected clip name ${a.getName()}`);
  a.setName(hit[1]);
}
const have = root.listAnimations().map((a) => a.getName()).sort().join(',');
if (have !== NAMES.map((n) => n[1]).sort().join(',')) throw new Error(`clip set wrong: ${have}`);

// 2. matte body
for (const m of root.listMaterials()) {
  m.setMetallicFactor(0).setRoughnessFactor(0.85).setMetallicRoughnessTexture(null);
}

// 3. jewellery on the wrist bones
const skin = root.listSkins()[0];
const bone = (n) => skin.listJoints().find((j) => j.getName() === `mixamorig:${n}`);
const M4 = (n) => new THREE.Matrix4().fromArray(n.getWorldMatrix());
const prim = root.listMeshes()[0].listPrimitives()[0];
const POS = prim.getAttribute('POSITION'), JT = prim.getAttribute('JOINTS_0'), WT = prim.getAttribute('WEIGHTS_0');
const jointIdx = (n) => skin.listJoints().indexOf(bone(n));

function wristInfo(side, tAxial) {
  const fa = bone(`${side}ForeArm`), hand = bone(`${side}Hand`);
  const a = new THREE.Vector3().setFromMatrixPosition(M4(fa)), b = new THREE.Vector3().setFromMatrixPosition(M4(hand));
  const axis = b.clone().sub(a), len = axis.length(); axis.normalize();
  const want = [jointIdx(`${side}ForeArm`), jointIdx(`${side}Hand`)];
  const pts = [], rs = [];
  const v = [0, 0, 0], j = [0, 0, 0, 0], w = [0, 0, 0, 0];
  for (let i = 0; i < POS.getCount(); i++) {
    POS.getElement(i, v); JT.getElement(i, j); WT.getElement(i, w);
    let best = 0; for (let k = 1; k < 4; k++) if (w[k] > w[best]) best = k;
    if (!want.includes(j[best])) continue;
    const p = new THREE.Vector3(v[0], v[1], v[2]), rel = p.clone().sub(a), t = rel.dot(axis);
    if (Math.abs(t - tAxial) > 0.006) continue;
    pts.push(p.clone().sub(axis.clone().multiplyScalar(t - tAxial)).sub(a)); // projected to the slab plane
    rs.push(rel.sub(axis.clone().multiplyScalar(t)).length());
  }
  if (pts.length < 8) throw new Error(`no arm vertices near ${side} wrist`);
  const c = new THREE.Vector3(); for (const p of pts) c.add(p); c.divideScalar(pts.length);
  const radial = pts.map((p) => p.clone().sub(c).sub(axis.clone().multiplyScalar(p.clone().sub(c).dot(axis))).length()).sort((x, y) => x - y);
  return { fa, len, axis, centre: c.add(a), r: radial[Math.floor(radial.length * 0.9)], n: pts.length };
}

// lathe a closed profile (array of [radius, y, nr, ny]) round local Y; returns {pos, nor, idx}
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
const torus = (R, r, ring = 12) => lathe(Array.from({ length: ring + 1 }, (_, i) => { const a = (i / ring) * Math.PI * 2; return [R + r * Math.cos(a), r * Math.sin(a), Math.cos(a), Math.sin(a)]; }));
const band = (Rin, h, th) => lathe([[Rin, -h / 2, 0, -1], [Rin + th, -h / 2, 0, -1], [Rin + th, -h / 2, 1, 0], [Rin + th, h / 2, 1, 0], [Rin + th, h / 2, 0, 1], [Rin, h / 2, 0, 1], [Rin, h / 2, -1, 0], [Rin, -h / 2, -1, 0]].reduce((o, p) => (o.push(p), o), []));
const disc = (R, h) => lathe([[0, -h / 2, 0, -1], [R, -h / 2, 0, -1], [R, -h / 2, 1, 0], [R, h / 2, 1, 0], [R, h / 2, 0, 1], [0, h / 2, 0, 1]]);

function addMesh(parent, name, g, material, matrix) {
  const pos = new Float32Array(g.pos), nor = new Float32Array(g.nor);
  const tp = new THREE.Vector3(), tn = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(matrix);
  for (let i = 0; i < pos.length; i += 3) {
    tp.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(matrix); tn.set(nor[i], nor[i + 1], nor[i + 2]).applyMatrix3(nm).normalize();
    pos.set([tp.x, tp.y, tp.z], i); nor.set([tn.x, tn.y, tn.z], i);
  }
  const buf = root.listBuffers()[0];
  const P = doc.createAccessor(`${name}_pos`).setType('VEC3').setArray(pos).setBuffer(buf);
  const N = doc.createAccessor(`${name}_nor`).setType('VEC3').setArray(nor).setBuffer(buf);
  const I = doc.createAccessor(`${name}_idx`).setType('SCALAR').setArray(new Uint16Array(g.idx)).setBuffer(buf);
  const p = doc.createPrimitive().setAttribute('POSITION', P).setAttribute('NORMAL', N).setIndices(I).setMaterial(material);
  parent.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(p)));
}
const gold = doc.createMaterial('gold_jewellery').setBaseColorFactor([1.0, 0.76, 0.28, 1]).setMetallicFactor(1).setRoughnessFactor(0.3);
const dialMat = doc.createMaterial('watch_dial').setBaseColorFactor([0.08, 0.08, 0.1, 1]).setMetallicFactor(0).setRoughnessFactor(0.9);
// a matrix in the bone's local frame: place at `centreWorld`, local Y = arm axis (bones' own Y already is), optional rotation of the lathe axis onto `dirLocal`
function local(boneNode, pWorld, yOff, extra) {
  const inv = M4(boneNode).invert();
  const p = pWorld.clone().applyMatrix4(inv);
  const m = new THREE.Matrix4().makeTranslation(p.x, yOff === null ? p.y : yOff, p.z);
  return extra ? m.multiply(extra) : m;
}

const TUBE = 0.0085; // model units (the model is ~0.98 high; x1.7 in game, so ~1.4 cm real radius: chunky)
{ // kada: LEFT wrist (the character's left, +x)
  const w = wristInfo('Left', 0.146 - 0.024);
  const R = w.r + TUBE * 0.5;
  addMesh(w.fa, 'kada_gold_left', torus(R, TUBE), gold, local(w.fa, w.centre, null));
  console.log(`kada: wrist r=${w.r.toFixed(4)} (${w.n} verts) ring R=${R.toFixed(4)}`);
}
{ // watch: RIGHT wrist
  const w = wristInfo('Right', w_len() - 0.034);
  function w_len() { return new THREE.Vector3().setFromMatrixPosition(M4(bone('RightHand'))).sub(new THREE.Vector3().setFromMatrixPosition(M4(bone('RightForeArm')))).length(); }
  const strapH = 0.016, th = 0.0028;
  addMesh(w.fa, 'watch_strap_gold_right', band(w.r, strapH, th), gold, local(w.fa, w.centre, null));
  // case + dial on the back of the wrist (outward, away from the body: -x for the right arm), in the bone's local frame
  const out = new THREE.Vector3(-1, 0, 0); out.sub(w.axis.clone().multiplyScalar(out.dot(w.axis))).normalize();
  const dirLocal = out.clone().transformDirection(M4(w.fa).invert());
  const rot = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirLocal));
  const centreLocal = w.centre.clone().applyMatrix4(M4(w.fa).invert());
  const caseC = centreLocal.clone().add(dirLocal.clone().multiplyScalar(w.r + th + 0.0035));
  const place = (off) => new THREE.Matrix4().makeTranslation(caseC.x + dirLocal.x * off, caseC.y + dirLocal.y * off, caseC.z + dirLocal.z * off).multiply(rot);
  addMesh(w.fa, 'watch_case_gold_right', disc(0.0135, 0.0075), gold, place(0));
  addMesh(w.fa, 'watch_dial_right', disc(0.0098, 0.0078), dialMat, place(0.0004));
  console.log(`watch: wrist r=${w.r.toFixed(4)} (${w.n} verts)`);
}

const tmp = resolve(ROOT, 'tmp', 'tvuncle_stage1.glb');
await io.write(tmp, doc);
// 4. the repo's own shrink tool: 2048 px WebP, meshopt, triangle budget far above the model (so none are removed)
execFileSync('node', [resolve(ROOT, 'tools/shrink.js'), tmp, resolve(outArg), '1000000', '0.01', '2048'], { stdio: 'inherit' });
console.log(`${outArg}: ${(statSync(resolve(outArg)).size / 1e6).toFixed(2)} MB`);
