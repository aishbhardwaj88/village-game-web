#!/usr/bin/env node
/**
 * 26 Nov: finishing recipe for the Kirana (shopkeeper), Smart Mesh raw from Tripo, 6 clips. Same pattern as finish-halwai.mjs / finish-darzi.mjs.
 *   node tools/finish-kirana.mjs <face-passed.glb> <out.glb> [texPx=4096]
 * Face pass first (headless Blender, raw file). Head render centre x 0.0, z 0.915, 0.20 m / 600 px; eyes (215,277) (350,277), mouth corners (228,405) (338,405):
 *   echo "0.0 0.915 0.20" > kr_cam.txt ; python3 tools/face_keys.py raw.glb kr 215,277,350,277 228,405,338,405   (-> kr_keys.glb)
 * DISABLED 27 Nov (owner rule 22 Nov, no painted/patched eyes on Tripo models; eye_patch.py is NOT run, use tools/rebuild-new-chars.sh):   echo "0.0 0.915 0.20 600" > kirana_head.txt ; python3 tools/eye_patch.py -- kr_keys.glb kr_eyes.glb kirana '[[215,277],[350,277]]'
 * 1. clip names -> game convention; the raw wave is a squat, replaced by the standing wave (tools/standwave.mjs)
 * 2. WEIGHT FIX. The whole body is one shell, so by POSITION: below the vest hem (y < 0.50, |x| < 0.125) the long kurta and the trousers are Hips / UpLeg / Leg / Foot only,
 *    zero arm / hand weight. From the kurta hem up the left/right split blends smoothly over the centre line (the kurta cannot tear between the legs) and part of the
 *    leg swing stays on the Hips; below the hem the legs split tightly. A stretch test over all six clips reports the worst edge stretch.
 * 3. matte (metalness 0)   4. textures 4096 WebP q90, meshopt
 */
import { textureCompress, prune, meshopt } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { load, buildRig, clipData, pose } from './tvaunty-rig.mjs';
import { fixWave } from './standwave.mjs';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';

const [inArg, outArg, texArg] = process.argv.slice(2);
if (!inArg || !outArg) { console.error('usage: node tools/finish-kirana.mjs <in.glb> <out.glb> [texPx]'); process.exit(1); }
const { io, doc } = await load(resolve(inArg));
const root = doc.getRoot();

// 1. clip names
const NAMES = [[/^idle/i, 'idle'], [/^walk/i, 'walk'], [/^run/i, 'run'], [/^jump/i, 'gesture_jump'], [/^laugh/i, 'gesture_laugh'], [/^wave/i, 'gesture_wave']];
for (const a of root.listAnimations()) { const h = NAMES.find(([re]) => re.test(a.getName())); if (!h) throw new Error(`unexpected clip ${a.getName()}`); a.setName(h[1]); }
const have = root.listAnimations().map((a) => a.getName()).sort().join(',');
if (have !== NAMES.map((n) => n[1]).sort().join(',')) throw new Error(`clip set wrong: ${have}`);
fixWave(doc);

// 2. weights
const rig = buildRig(doc), jn = rig.joints.map((j) => j.getName().replace('mixamorig:', '')), ji = Object.fromEntries(jn.map((n, i) => [n, i]));
rig.top.updateMatrixWorld(true);
const bp = (n) => rig.byName[n].getWorldPosition(new THREE.Vector3());
const leftSign = Math.sign(bp('LeftUpLeg').x) || 1;
const prim = root.listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), N = P.getCount();
const pos = []; { const e = [0, 0, 0]; for (let i = 0; i < N; i++) { P.getElement(i, e); pos.push(new THREE.Vector3(e[0], e[1], e[2])); } }
const ARM = /^(Left|Right)(Shoulder|Arm|ForeArm|Hand)/, LOWER = /^(Hips|(Left|Right)(UpLeg|Leg|Foot|ToeBase|Toe_End))$/;
const HIP = bp('LeftUpLeg').y, KNEE = bp('LeftLeg').y, ANKLE = bp('LeftFoot').y;
const KL = +(process.env.KURTA_LEG ?? 0.55), CL = +(process.env.CENTRE ?? 0.16), HEM = +(process.env.HEM ?? 0.33), HALF = 0.125; // share of the leg swing the kurta keeps (rest rides the Hips), half width (m) of the left/right blend, kurta hem y, kurta half width
let idx = prim.getIndices().getArray();
// Everything is ONE shell here (body, kurta, trousers, sandals, vest, sleeves), so the lower body is picked by position: |x| < 0.125 and y < 0.50 (below the vest hem). The two hands are separate shells and are not touched.
const lower = new Uint8Array(N), upper = new Uint8Array(N), side = new Uint8Array(N); // side = vest side edge / armhole: forearm and hand weights only (Tripo dragged it to the hand in the wave)
const handDom = new Uint8Array(N), jh = [0, 0, 0, 0], wh = [0, 0, 0, 0];
for (let i = 0; i < N; i++) {
  J.getElement(i, jh); W.getElement(i, wh); let hw = 0; for (let k = 0; k < 4; k++) if (/^(Left|Right)Hand/.test(jn[jh[k]])) hw += wh[k];
  if (hw > 0.5) { handDom[i] = 1; continue; } // the hands (their thumbs reach x 0.12, the kurta edge) are left exactly as Tripo skinned them
  const p = pos[i]; if (Math.abs(p.x) < HALF && p.y < 0.50) lower[i] = 1; else if (Math.abs(p.x) < 0.12 && p.y < 0.60) upper[i] = 1; else if (Math.abs(p.x) < 0.145 && p.y >= 0.5 && p.y < 0.72) side[i] = 1;
}
// Tripo welded the thumbs to the kurta edge (x 0.12): cut every triangle that joins a hand vertex to a lower-body / vest vertex, or the cloth is dragged to the hand
{
  const keep = []; let cut = 0;
  for (let t = 0; t < idx.length; t += 3) { const v = [idx[t], idx[t + 1], idx[t + 2]]; if (v.some((q) => handDom[q]) && v.some((q) => lower[q] || upper[q] || side[q])) { cut++; continue; } keep.push(...v); }
  prim.getIndices().setArray(new Uint32Array(keep)); idx = prim.getIndices().getArray(); console.log(`cut ${cut} triangles joining a thumb to the kurta`);
}
{
  const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0];
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const posW = (p) => { // by-position leg weights. Below the hem the legs are separate (tight left/right split); from the hem up (the kurta) the split blends over the whole centre line so the long kurta cannot tear between the legs
    const t = smooth((p.y - (HEM - 0.04)) / 0.08), centre = 0.01 + (CL - 0.01) * t, kl = 1 - (1 - KL) * t;
    const o = {}, side = smooth(0.5 + (p.x * leftSign) / (2 * centre)), L = (b, v) => { o[`Left${b}`] = (o[`Left${b}`] || 0) + v * side; o[`Right${b}`] = (o[`Right${b}`] || 0) + v * (1 - side); };
    const y = p.y, hips = smooth((y - (HIP - 0.04)) / 0.08), up = (1 - hips) * (1 - smooth((KNEE + 0.07 - y) / 0.14)), leg = (1 - hips) * smooth((KNEE + 0.07 - y) / 0.14) * (1 - smooth((ANKLE + 0.04 - y) / 0.08)), foot = (1 - hips) * smooth((ANKLE + 0.04 - y) / 0.08);
    if (hips > 0) o.Hips = hips;
    if (t > 0.5) L('UpLeg', up + leg + foot); else { L('UpLeg', up); L('Leg', leg); L('Foot', foot); }
    let mv = 0; for (const b of Object.keys(o)) if (b !== 'Hips') { mv += o[b] * (1 - kl); o[b] *= kl; } o.Hips = (o.Hips || 0) + mv;
    return o;
  };
  let nL = 0, nU = 0, dropped = 0;
  for (let i = 0; i < N; i++) {
    if (!lower[i] && !upper[i] && !side[i]) continue;
    J.getElement(i, jj); W.getElement(i, ww); const p = pos[i];
    const cur = {}; for (let k = 0; k < 4; k++) if (ww[k] > 0) cur[jn[jj[k]]] = (cur[jn[jj[k]]] || 0) + ww[k];
    let out;
    if (lower[i]) { out = posW(p); nL++; if (Object.keys(cur).some((b) => ARM.test(b))) dropped++; }
    else { const keep = {}; let s = 0; for (const [b, v] of Object.entries(cur)) { if (side[i] ? /^(Left|Right)(ForeArm|Hand)/.test(b) : ARM.test(b)) continue; keep[b] = v; s += v; } if (s < 0.3) out = { Spine1: 1 }; else out = keep; nU++; }
    const top = Object.entries(out).filter(([, v]) => v > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((a, b) => a + b[1], 0);
    while (top.length < 4) top.push(['Hips', 0]);
    J.setElement(i, top.map(([b]) => ji[b])); W.setElement(i, top.map(([, v]) => v / s));
  }
  console.log(`re-weighted: ${nL} lower-body verts by position (${dropped} had arm/hand weight), ${nU} vest-hem verts stripped of arm weight`);
}
// Small loose shells (pen, buttons, studs; < 1000 vertices) were skinned by Tripo to the hand bones and stretched into long rods in the run / jump / wave.
// Each gets the weights of its nearest main-body vertex with the arm chain stripped (Spine1 if nothing is left), so it rides the chest rigidly.
{
  const key = (p) => `${Math.round(p.x * 2e4)},${Math.round(p.y * 2e4)},${Math.round(p.z * 2e4)}`, gid = new Int32Array(N), gm = new Map(); let G = 0;
  for (let i = 0; i < N; i++) { const k = key(pos[i]); if (!gm.has(k)) gm.set(k, G++); gid[i] = gm.get(k); }
  const par = Array.from({ length: G }, (_, i) => i), f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < idx.length; t += 3) { const a = f(gid[idx[t]]); par[f(gid[idx[t + 1]])] = a; par[f(gid[idx[t + 2]])] = a; }
  const cnt = new Map(); for (let i = 0; i < N; i++) { const r = f(gid[i]); cnt.set(r, (cnt.get(r) || 0) + 1); }
  const big = [], small = []; for (let i = 0; i < N; i++) (cnt.get(f(gid[i])) > 4000 ? big : small).push(i);
  const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0]; let n = 0;
  for (const i of small) {
    const p = pos[i]; if (Math.abs(p.x) > 0.125 && p.y < 0.52) continue; // the two hands are shells of 2 600+ vertices, not small
    if (cnt.get(f(gid[i])) > 1000) continue;
    let best = -1, bd = 9; for (const j of big) { const d = p.distanceToSquared(pos[j]); if (d < bd) { bd = d; best = j; } }
    J.getElement(best, jj); W.getElement(best, ww); const keep = {}; let s = 0;
    for (let k = 0; k < 4; k++) if (ww[k] > 0 && !ARM.test(jn[jj[k]])) { keep[jn[jj[k]]] = (keep[jn[jj[k]]] || 0) + ww[k]; s += ww[k]; }
    const out = s < 0.3 ? { Spine1: 1 } : keep, top = Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 4), t = top.reduce((a, b) => a + b[1], 0);
    while (top.length < 4) top.push(['Hips', 0]);
    J.setElement(i, top.map(([b]) => ji[b])); W.setElement(i, top.map(([, v]) => v / t)); n++;
  }
  console.log(`small shells (pen, buttons): ${n} vertices re-weighted to the chest`);
}
// The sleeves touch the vest / kurta edge and Tripo joined them: cut every triangle below the armpit that joins an arm-chain vertex to a body vertex, or raising the arm drags a sheet of cloth along.
{
  const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0], armW = new Float32Array(N);
  for (let i = 0; i < N; i++) { J.getElement(i, jj); W.getElement(i, ww); for (let k = 0; k < 4; k++) if (ARM.test(jn[jj[k]]) || /^(Left|Right)Hand/.test(jn[jj[k]])) armW[i] += ww[k]; }
  const keep = []; let cut = 0;
  for (let t = 0; t < idx.length; t += 3) { const v = [idx[t], idx[t + 1], idx[t + 2]]; if (v.every((q) => pos[q].y < 0.66) && v.some((q) => armW[q] > 0.6) && v.some((q) => armW[q] < 0.4)) { cut++; continue; } keep.push(...v); }
  prim.getIndices().setArray(new Uint32Array(keep)); idx = prim.getIndices().getArray(); console.log(`cut ${cut} triangles joining a sleeve to the body below the armpit`);
}
// Last pass: any remaining triangle below the armpit that any clip stretches to > 3.5x its rest edge (and > 12 cm) is a weld Tripo left between two parts that move apart: cut it.
{
  const inv = rig.joints.map((j) => rig.byName[j.getName().replace('mixamorig:', '')].matrixWorld.clone().invert());
  const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0], tmp = new THREE.Vector3(), bad = new Uint8Array(idx.length / 3);
  const skin = (M, i) => { J.getElement(i, jj); W.getElement(i, ww); const o = new THREE.Vector3(); for (let k = 0; k < 4; k++) if (ww[k] > 0) o.addScaledVector(tmp.copy(pos[i]).applyMatrix4(M[jj[k]]), ww[k]); return o; };
  for (const name of ['idle', 'walk', 'run', 'gesture_jump', 'gesture_wave', 'gesture_laugh']) {
    const cd = clipData(doc, name);
    for (let fr = 0; fr < cd.times.length; fr += 2) {
      pose(rig, cd, fr); const M = rig.joints.map((j, n) => rig.byName[j.getName().replace('mixamorig:', '')].matrixWorld.clone().multiply(inv[n]));
      const cache = new Map(); const sk = (i) => cache.get(i) || (cache.set(i, skin(M, i)), cache.get(i));
      for (let t = 0; t < idx.length; t += 3) { if (bad[t / 3] || pos[idx[t]].y > 0.74 || pos[idx[t]].y < 0.2) continue; for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const u = idx[t + a], v = idx[t + b], d1 = sk(u).distanceTo(sk(v)); if (d1 > 0.10 && d1 > 3 * pos[u].distanceTo(pos[v])) { bad[t / 3] = 1; break; } } }
    }
  }
  const keep = []; let cut = 0; for (let t = 0; t < idx.length; t += 3) { if (bad[t / 3]) { cut++; continue; } keep.push(idx[t], idx[t + 1], idx[t + 2]); }
  prim.getIndices().setArray(new Uint32Array(keep)); idx = prim.getIndices().getArray(); console.log(`cut ${cut} more welded triangles that stretch past 3.5x in a clip`);
  pose(rig, clipData(doc, 'idle'), 0);
}
// stretch test: worst edge length ratio (current / rest) of the lower-body triangles in every clip
{
  const inv = rig.joints.map((j) => rig.byName[j.getName().replace('mixamorig:', '')].matrixWorld.clone().invert());
  const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0], tmp = new THREE.Vector3(), edges = [];
  for (let t = 0; t < idx.length; t += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const u = idx[t + a], v = idx[t + b]; if (lower[u] && lower[v] && pos[u].y > 0.2 && pos[u].distanceTo(pos[v]) > 0.006) edges.push([u, v, pos[u].distanceTo(pos[v])]); }
  const skin = (M, i) => { J.getElement(i, jj); W.getElement(i, ww); const o = new THREE.Vector3(); for (let k = 0; k < 4; k++) if (ww[k] > 0) o.addScaledVector(tmp.copy(pos[i]).applyMatrix4(M[jj[k]]), ww[k]); return o; };
  for (const name of ['idle', 'walk', 'run', 'gesture_jump', 'gesture_wave', 'gesture_laugh']) {
    const cd = clipData(doc, name); let worst = 0, wf = 0, wi = -1;
    for (let fr = 0; fr < cd.times.length; fr += 3) {
      pose(rig, cd, fr); const M = rig.joints.map((j, n) => rig.byName[j.getName().replace('mixamorig:', '')].matrixWorld.clone().multiply(inv[n]));
      const cache = new Map(); const sk = (i) => cache.get(i) || (cache.set(i, skin(M, i)), cache.get(i));
      for (let e = 0; e < edges.length; e++) { const r = sk(edges[e][0]).distanceTo(sk(edges[e][1])) / edges[e][2]; if (r > worst) { worst = r; wf = fr; wi = edges[e][0]; } }
    }
    console.log(`stretch ${name.padEnd(13)} worst lower-body edge x${worst.toFixed(2)} (frame ${wf}, vertex y ${pos[wi]?.y.toFixed(2)} x ${pos[wi]?.x.toFixed(2)})`);
  }
  pose(rig, clipData(doc, 'idle'), 0);
}

// 3. matte
for (const m of root.listMaterials()) m.setMetallicFactor(0).setRoughnessFactor(0.85).setMetallicRoughnessTexture(null);

if (process.env.PREVIEW) { await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 80, resize: [1024, 1024] })); await io.write(resolve(outArg), doc); process.exit(0); }
const px = +texArg || 4096;
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [px, px] }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(resolve(outArg), doc);
console.log(`${outArg}: ${(statSync(resolve(outArg)).size / 1e6).toFixed(2)} MB`);
