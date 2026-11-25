import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
export async function load(path) {
  await MeshoptDecoder.ready; await MeshoptEncoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  const doc = await io.read(path); return { io, doc };
}
// THREE copies of the joint hierarchy (bind pose = node rest TRS)
export function buildRig(doc) {
  const skin = doc.getRoot().listSkins()[0], joints = skin.listJoints(), map = new Map(), byName = {};
  for (const j of joints) { const o = new THREE.Bone(); o.name = j.getName().replace('mixamorig:', ''); const [x,y,z]=j.getTranslation(); o.position.set(x,y,z); const q=j.getRotation(); o.quaternion.set(q[0],q[1],q[2],q[3]); const s=j.getScale(); o.scale.set(...s); map.set(j, o); byName[o.name] = o; }
  const top = new THREE.Group(); const arm = skin.getSkeleton() ; 
  for (const j of joints) { const p = j.getParentNode(); if (p && map.has(p)) map.get(p).add(map.get(j)); else top.add(map.get(j)); }
  // armature node transform (identity here)
  top.updateMatrixWorld(true);
  return { joints, map, byName, top, skin };
}
export const names = (rig) => Object.keys(rig.byName);
function deq(acc) { const n = acc.getCount(), es = acc.getElementSize(), out = new Float32Array(n * es), e = new Array(es); for (let i = 0; i < n; i++) { acc.getElement(i, e); for (let k = 0; k < es; k++) out[i * es + k] = e[k]; } return out; }
export function clipData(doc, name) {
  const a = doc.getRoot().listAnimations().find((x) => x.getName() === name);
  const ch = {}; let times = null;
  for (const c of a.listChannels()) { const n = c.getTargetNode().getName().replace('mixamorig:', ''); (ch[n] ||= {})[c.getTargetPath()] = { c, arr: deq(c.getSampler().getOutput()), t: c.getSampler().getInput().getArray() }; if (c.getTargetPath()==='rotation' && n==='Hips') times = c.getSampler().getInput().getArray(); }
  return { a, ch, times };
}
export function pose(rig, cd, i) { // set every bone's local TRS from frame i
  for (const [n, o] of Object.entries(rig.byName)) {
    const c = cd.ch[n]; if (!c) continue;
    if (c.translation) { const k = c.translation.t.length > 2 ? i : 0; o.position.set(c.translation.arr[k*3], c.translation.arr[k*3+1], c.translation.arr[k*3+2]); }
    if (c.rotation) { const k = c.rotation.t.length > 2 ? i : 0; o.quaternion.set(...c.rotation.arr.slice(k*4, k*4+4)); }
  }
  rig.top.updateMatrixWorld(true);
}
export function store(rig, cd, i) { // write local TRS back into frame i
  for (const [n, o] of Object.entries(rig.byName)) {
    const c = cd.ch[n]; if (!c) continue;
    if (c.translation) { c.translation.arr[i*3]=o.position.x; c.translation.arr[i*3+1]=o.position.y; c.translation.arr[i*3+2]=o.position.z; }
    if (c.rotation) { c.rotation.arr[i*4]=o.quaternion.x; c.rotation.arr[i*4+1]=o.quaternion.y; c.rotation.arr[i*4+2]=o.quaternion.z; c.rotation.arr[i*4+3]=o.quaternion.w; }
  }
}
const _q = new THREE.Quaternion(), _p = new THREE.Quaternion();
// rotate bone by world-space quaternion q (parent untouched, children follow)
export function rotWorld(bone, q) {
  bone.parent.getWorldQuaternion(_p); const local = _p.clone().invert().multiply(q).multiply(_p);
  bone.quaternion.premultiply(local); bone.updateMatrixWorld(true);
}
export const wp = (b, v = new THREE.Vector3()) => b.getWorldPosition(v);
