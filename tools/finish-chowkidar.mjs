#!/usr/bin/env node
/**
 * 27 Nov: finishing recipe for the Chowkidar (grey turban, brown shawl, kurta, white pyjama), Smart Mesh raw from Tripo, 6 clips. Cloned from finish-chowkidar.mjs (same weight-fix pattern).
 *   node tools/finish-chowkidar.mjs <face-keys.glb> <out.glb> [texPx=4096]
 * Face pass: tools/face_keys.py only (blink + smile keys on Tripo's own face; default weights zeroed by tools/zero-morph-weights.mjs). NO eye_patch.py (owner rule 22 Nov).
 * 1. clip names -> game convention; raw wave is a squat, replaced by the standing wave (tools/standwave.mjs)
 * 2. WEIGHT FIX by position (one shell): trousers / hem are Hips / UpLeg / Leg / Foot only, zero arm weight; thumb / sleeve welds cut; stretch tests report the worst edge.
 * 3. matte materials   4. textures 4096 WebP q90, meshopt
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
if (!inArg || !outArg) { console.error('usage: node tools/finish-chowkidar.mjs <in.glb> <out.glb> [texPx]'); process.exit(1); }
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
const TOWEL = { x0: 0.02, y0: 0.545, test: ([r, g, b]) => Math.min(r, g, b) > 140 && Math.max(r, g, b) - Math.min(r, g, b) < 50 }; // white towel
const ARM = /^(Left|Right)(Shoulder|Arm|ForeArm|Hand)/, LOWER = /^(Hips|(Left|Right)(UpLeg|Leg|Foot|ToeBase|Toe_End))$/;
const HIP = bp('LeftUpLeg').y, KNEE = bp('LeftLeg').y, ANKLE = bp('LeftFoot').y;
const KL = +(process.env.KURTA_LEG ?? 0.85), CL = +(process.env.CENTRE ?? 0.10), HEM = +(process.env.HEM ?? 0.40), HALF = 0.125; // share of the leg swing the kurta keeps (rest rides the Hips), half width (m) of the left/right blend, crotch y, half width
let idx = prim.getIndices().getArray();
// Everything is ONE shell here (body, kurta, trousers, sandals, vest, sleeves), so the lower body is picked by position: |x| < 0.125 and y < 0.50 (below the vest hem). The two hands are separate shells and are not touched.
const lower = new Uint8Array(N), upper = new Uint8Array(N), side = new Uint8Array(N); // side = vest side edge / armhole: forearm and hand weights only (Tripo dragged it to the hand in the wave)
const handDom = new Uint8Array(N), jh = [0, 0, 0, 0], wh = [0, 0, 0, 0];
for (let i = 0; i < N; i++) {
  J.getElement(i, jh); W.getElement(i, wh); let hw = 0; for (let k = 0; k < 4; k++) if (/^(Left|Right)Hand/.test(jn[jh[k]])) hw += wh[k];
  if (hw > 0.5) { handDom[i] = 1; continue; } // the hands (their thumbs reach x 0.12, the kurta edge) are left exactly as Tripo skinned them
  let aw = 0; for (let k = 0; k < 4; k++) if (/^(Left|Right)(Arm|ForeArm)/.test(jn[jh[k]])) aw += wh[k];
  const p = pos[i]; if (Math.abs(p.x) < HALF && p.y < 0.50 && !(aw > 0.45 || (aw > 0.12 && p.y > 0.5 && Math.abs(p.x) > 0.085))) lower[i] = 1; // sleeves / rolled cuffs (arm-dominant) are not cloth of the lower body, they keep Tripo's arm weights
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
    if (lower[i]) { // below the shorts waist: by position; across the belly (0.50-0.64) it blends back into Tripo's own torso weights (arm chain stripped) so the spine can bend without a seam
      out = posW(p); nL++; if (Object.keys(cur).some((b) => ARM.test(b))) dropped++;
      const bl = smooth((p.y - 0.38) / 0.12);
      if (bl > 0) { const keep = {}; let s = 0; for (const [b, v] of Object.entries(cur)) { if (ARM.test(b)) continue; keep[b] = v; s += v; } if (s < 0.3) { keep.Spine1 = 1; s = 1; } const o2 = {}; for (const [b, v] of Object.entries(out)) o2[b] = v * (1 - bl); for (const [b, v] of Object.entries(keep)) o2[b] = (o2[b] || 0) + (v / s) * bl; out = o2; }
    }
    else { const keep = {}; let s = 0; for (const [b, v] of Object.entries(cur)) { if (side[i] ? /^(Left|Right)(ForeArm|Hand)/.test(b) : ARM.test(b)) continue; keep[b] = v; s += v; } if (s < 0.3) out = { Spine1: 1 }; else out = keep; nU++; }
    const top = Object.entries(out).filter(([, v]) => v > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((a, b) => a + b[1], 0);
    while (top.length < 4) top.push(['Hips', 0]);
    J.setElement(i, top.map(([b]) => ji[b])); W.setElement(i, top.map(([, v]) => v / s));
  }
  console.log(`re-weighted: ${nL} lower-body verts by position (${dropped} had arm/hand weight), ${nU} vest-hem verts stripped of arm weight`);
}
// SHAWL: the brown wrap over both shoulders and hanging down the left side. Found by colour in the base texture (brown, not skin / beige kurta / olive vest / grey turban), weighted to
// Spine2 / Neck / the matching Shoulder / Spine1 / Hips ONLY, never an arm bone or the hand, so it rides the body and cannot be dragged by a swinging or raised arm.
const towelSel = new Uint8Array(N);
{
  const tex = root.listTextures()[0], img = await sharp(Buffer.from(tex.getImage())).raw().toBuffer({ resolveWithObject: true }), UV = prim.getAttribute('TEXCOORD_0'), uv = [0, 0];
  const colAt = (i) => { UV.getElement(i, uv); const x = Math.min(img.info.width - 1, Math.max(0, Math.floor(uv[0] * img.info.width))), y = Math.min(img.info.height - 1, Math.max(0, Math.floor(uv[1] * img.info.height))), o = (y * img.info.width + x) * img.info.channels; return [img.data[o], img.data[o + 1], img.data[o + 2]]; };
  // 27 Nov live fix: the mouth / beard (dark brownish pixels, y 0.82-0.86, front z>0.02) matched 'brown' and was welded to Spine2, so the head nodding in idle tore the mouth open (gash with teeth). Face front keeps Tripo's head weights.
  const FACE = (p) => p.y > 0.815 && Math.abs(p.x) < 0.075 && p.z > 0.02;
  const brown = ([r, g, b]) => r < 135 && r > b + 18 && g < r - 6 && g > b - 4 && r > 45, foreW = new Float32Array(N);
  for (let i = 0; i < N; i++) { J.getElement(i, jh); W.getElement(i, wh); for (let k = 0; k < 4; k++) if (/^(Left|Right)(ForeArm|Hand)/.test(jn[jh[k]])) foreW[i] += wh[k]; }
  let n0 = 0;
  for (let i = 0; i < N; i++) { const p = pos[i]; if (p.y < 0.2 || p.y > 0.86 || handDom[i] || foreW[i] > 0.2 || FACE(p)) continue; if (brown(colAt(i))) { towelSel[i] = 1; n0++; } }
  const add = [];
  for (let pass = 0; pass < 2; pass++) { const got = []; for (let t = 0; t < idx.length; t += 3) { const v = [idx[t], idx[t + 1], idx[t + 2]]; if (v.some((q) => towelSel[q])) for (const q of v) if (!towelSel[q] && !FACE(pos[q]) && pos[q].y > 0.2 && pos[q].y < 0.86 && !handDom[q] && foreW[q] <= 0.2 && brown(colAt(q))) got.push(q); } for (const q of got) if (!towelSel[q]) { towelSel[q] = 1; add.push(q); } }
  const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  let nT = 0;
  for (let i = 0; i < N; i++) {
    if (!towelSel[i]) continue; const y = pos[i].y, top = sm((y - 0.62) / 0.10), low = 1 - sm((y - 0.42) / 0.12), sh = pos[i].x * leftSign > 0 ? 'LeftShoulder' : 'RightShoulder';
    const out = { Spine2: 1 - 0.45 * top - 0.8 * low, Neck: 0.2 * top, [sh]: 0.25 * top, Spine1: 0.5 * low, Hips: 0.3 * low };
    const e = Object.entries(out).filter(([, v]) => v > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4), s = e.reduce((a, b) => a + b[1], 0); while (e.length < 4) e.push(['Hips', 0]);
    J.setElement(i, e.map(([b]) => ji[b])); W.setElement(i, e.map(([, v]) => v / s)); nT++;
  }
  if (process.env.DBG) { const f=[]; for (let i=0;i<N;i++) if (towelSel[i]&&pos[i].y>0.78) f.push(pos[i]); const mn=(k)=>Math.min(...f.map(p=>p[k])).toFixed(3), mx=(k)=>Math.max(...f.map(p=>p[k])).toFixed(3); console.log('DBG shawl y>0.78 n',f.length,'x',mn('x'),mx('x'),'y',mn('y'),mx('y'),'z',mn('z'),mx('z')); const c=f.filter(p=>Math.abs(p.x)<0.06&&p.y>0.80); console.log('DBG centre y>0.80',c.length, c.length?[mn('z'),mx('z')]:''); }
  console.log(`shawl: ${n0} by colour + ${add.length} neighbours = ${nT} vertices on Spine2/Neck/Shoulder/Spine1/Hips (zero arm weight)`);
}
if (!process.env.NOSLEEVECUT)
// The sleeves touch the vest / kurta edge and Tripo joined them: cut every triangle below the armpit that joins an arm-chain vertex to a body vertex, or raising the arm drags a sheet of cloth along.
{
  const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0], armW = new Float32Array(N);
  for (let i = 0; i < N; i++) { J.getElement(i, jj); W.getElement(i, ww); for (let k = 0; k < 4; k++) if (ARM.test(jn[jj[k]]) || /^(Left|Right)Hand/.test(jn[jj[k]])) armW[i] += ww[k]; }
  const keep = []; let cut = 0;
  for (let t = 0; t < idx.length; t += 3) { const v = [idx[t], idx[t + 1], idx[t + 2]]; if (!v.some((q) => towelSel[q]) && v.every((q) => pos[q].y < 0.66) && v.some((q) => Math.abs(pos[q].x) < 0.17) && v.some((q) => armW[q] > 0.6) && v.some((q) => armW[q] < 0.4)) { cut++; continue; } keep.push(...v); }
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
      for (let t = 0; t < idx.length; t += 3) { if (bad[t / 3] || towelSel[idx[t]] || towelSel[idx[t + 1]] || towelSel[idx[t + 2]] || pos[idx[t]].y > 0.74 || pos[idx[t]].y < 0.2) continue; for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const u = idx[t + a], v = idx[t + b], d1 = sk(u).distanceTo(sk(v)); if (d1 > 0.10 && d1 > 3 * pos[u].distanceTo(pos[v])) { bad[t / 3] = 1; break; } } }
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

// 3. matte skin and jeans; the satin shirt keeps a little sheen (roughness 0.78, not 0.85)
for (const m of root.listMaterials()) m.setMetallicFactor(0).setRoughnessFactor(0.78).setMetallicRoughnessTexture(null);

if (process.env.PREVIEW) { await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 80, resize: [1024, 1024] })); await io.write(resolve(outArg), doc); process.exit(0); }
const px = +texArg || 4096;
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [px, px] }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(resolve(outArg), doc);
console.log(`${outArg}: ${(statSync(resolve(outArg)).size / 1e6).toFixed(2)} MB`);
