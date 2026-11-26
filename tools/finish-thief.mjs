#!/usr/bin/env node
/**
 * 26 Nov: finishing recipe for the Thief character (in-game label RASCAL), Smart Mesh raw from Tripo, 6 clips. Same pattern as finish-kulfiwala.mjs / finish-nai.mjs.
 *   node tools/finish-thief.mjs <face-passed.glb> <out.glb> [texPx=4096]
 * Face pass first (headless Blender, raw file). Head render centre x 0.0, z 0.875, 0.20 m / 600 px; eyes (232,243) (368,248), mouth corners (238,382) (352,380):
 *   echo "0.0 0.875 0.20" > th_cam.txt ; python3 tools/face_keys.py raw.glb th 232,243,368,248 238,382,352,380   (-> th_keys.glb)
 *   echo "0.0 0.875 0.20 600" > thief_head.txt ; python3 tools/eye_patch.py -- th_keys.glb th_eyes.glb thief '[[232,243],[368,248]]'
 * 1. clip names -> game convention; the raw wave is a squat, replaced by the standing wave (tools/standwave.mjs)
 * 2. WEIGHT FIX. Jute sack + strap + mangoes (separate shells on the RIGHT shoulder, found by shell position) are rigid on Spine / Spine1 / Spine2 (+ a little RightShoulder on the strap), never an arm or hand bone.
 *    The checked lungi (found by colour in the leg shell + its two pleat shells) and the shirt hem are Hips / UpLeg / Leg only, left/right blended over the centre line, zero arm / hand weight.
 *    Thumb / sleeve welds are cut; a stretch test over all six clips reports the worst edge stretch.
 * 3. matte skin (slight sheen kept for sweat)   4. textures 4096 WebP q90, meshopt
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
if (!inArg || !outArg) { console.error('usage: node tools/finish-thief.mjs <in.glb> <out.glb> [texPx]'); process.exit(1); }
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
const KL = +(process.env.KURTA_LEG ?? 0.6), CL = +(process.env.CENTRE ?? 0.16), HEM = +(process.env.HEM ?? 0.29); // share of the leg swing the lungi keeps (rest rides the Hips), half width (m) of the left/right blend, lungi hem y
let idx = prim.getIndices().getArray();
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
// texture colour per vertex
const tex = root.listTextures()[0], img = await sharp(Buffer.from(tex.getImage())).raw().toBuffer({ resolveWithObject: true }), UV = prim.getAttribute('TEXCOORD_0'), uv = [0, 0];
const colAt = (i) => { UV.getElement(i, uv); const x = Math.min(img.info.width - 1, Math.max(0, Math.floor(uv[0] * img.info.width))), y = Math.min(img.info.height - 1, Math.max(0, Math.floor(uv[1] * img.info.height))), o = (y * img.info.width + x) * img.info.channels; return [img.data[o], img.data[o + 1], img.data[o + 2]]; };
// Shells (connected pieces): main = body / shirt / head / arms; the leg shell (legs + lungi + feet), the two lungi pleat shells, and the sack + strap + two mangoes are separate shells.
const gid = new Int32Array(N), gm = new Map(); let G = 0;
for (let i = 0; i < N; i++) { const k = `${Math.round(pos[i].x * 2e4)},${Math.round(pos[i].y * 2e4)},${Math.round(pos[i].z * 2e4)}`; if (!gm.has(k)) gm.set(k, G++); gid[i] = gm.get(k); }
const par = Array.from({ length: G }, (_, i) => i), fnd = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
for (let t = 0; t < idx.length; t += 3) { const a = fnd(gid[idx[t]]); par[fnd(gid[idx[t + 1]])] = a; par[fnd(gid[idx[t + 2]])] = a; }
const comp = new Map(); for (let i = 0; i < N; i++) { const r = fnd(gid[i]), c = comp.get(r) || comp.set(r, { n: 0, mn: [9, 9, 9], mx: [-9, -9, -9] }).get(r); c.n++; for (const [k, v] of [[0, pos[i].x], [1, pos[i].y], [2, pos[i].z]]) { c.mn[k] = Math.min(c.mn[k], v); c.mx[k] = Math.max(c.mx[k], v); } }
let mainR = -1; for (const [r, c] of comp) if (mainR < 0 || c.n > comp.get(mainR).n) mainR = r;
const cOf = (i) => comp.get(fnd(gid[i]));
const sackSel = new Uint8Array(N), legShell = new Uint8Array(N), pleat = new Uint8Array(N);
for (let i = 0; i < N; i++) { const r = fnd(gid[i]); if (r === mainR) continue; const c = comp.get(r); if (c.mx[0] < 0.0 && c.mn[1] > 0.45 && c.mx[1] < 0.9) sackSel[i] = 1; else if (c.mx[1] < 0.56) { legShell[i] = 1; if (c.n < 1500) pleat[i] = 1; } }
const lungiSel = new Uint8Array(N);
const lcol = ([r, g, b]) => (r - g > 80 && r - b > 60) || (g > r + 8 && g > b + 3) || (r + g + b < 150);
let nLc = 0; for (let i = 0; i < N; i++) { if (!legShell[i]) continue; if (pleat[i] || (pos[i].y > 0.28 && lcol(colAt(i)))) { lungiSel[i] = 1; nLc++; } }
for (let pass = 0; pass < 2; pass++) { const got = []; for (let t = 0; t < idx.length; t += 3) { const v = [idx[t], idx[t + 1], idx[t + 2]]; if (v.some((q) => lungiSel[q])) for (const q of v) if (!lungiSel[q] && legShell[q] && pos[q].y > 0.3 && pos[q].y < 0.56) got.push(q); } for (const q of got) lungiSel[q] = 1; }
console.log(`shells: main ${comp.get(mainR).n} verts; sack-side ${sackSel.reduce((a, b) => a + b, 0)}; leg shell ${legShell.reduce((a, b) => a + b, 0)}; lungi by colour ${nLc} (+ ring grow = ${lungiSel.reduce((a, b) => a + b, 0)})`);
const lower = new Uint8Array(N), upper = new Uint8Array(N), side = new Uint8Array(N); // lower = lungi + shirt hem; side = vest side edge / armhole: forearm and hand weights only
const handDom = new Uint8Array(N), jh = [0, 0, 0, 0], wh = [0, 0, 0, 0];
for (let i = 0; i < N; i++) {
  J.getElement(i, jh); W.getElement(i, wh); let hw = 0; for (let k = 0; k < 4; k++) if (/^(Left|Right)Hand/.test(jn[jh[k]])) hw += wh[k];
  if (hw > 0.5) { handDom[i] = 1; continue; } // the hands are left exactly as Tripo skinned them
  if (sackSel[i]) continue;
  const p = pos[i];
  if (lungiSel[i]) { lower[i] = 1; continue; }
  if (legShell[i]) continue;
  if (Math.abs(p.x) < 0.155 && p.y < 0.50) lower[i] = 1; else if (Math.abs(p.x) < 0.155 && p.y < 0.60) upper[i] = 1; else if (Math.abs(p.x) < 0.175 && p.y >= 0.5 && p.y < 0.72) side[i] = 1;
}
// Tripo welded the thumbs to the shirt hem: cut every triangle that joins a hand vertex to a lower-body / vest vertex
{
  const keep = []; let cut = 0;
  for (let t = 0; t < idx.length; t += 3) { const v = [idx[t], idx[t + 1], idx[t + 2]]; if (v.some((q) => handDom[q]) && v.some((q) => lower[q] || upper[q] || side[q])) { cut++; continue; } keep.push(...v); }
  prim.getIndices().setArray(new Uint32Array(keep)); idx = prim.getIndices().getArray(); console.log(`cut ${cut} triangles joining a thumb to the shirt`);
}
{
  const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0];
  const posW = (p) => { // by-position leg weights; across the lungi / hem the left/right split blends over the centre line so the cloth cannot tear between the legs
    const t = sm((p.y - (HEM - 0.04)) / 0.08), centre = 0.01 + (CL - 0.01) * t, kl = 1 - (1 - KL) * t;
    const o = {}, sd = sm(0.5 + (p.x * leftSign) / (2 * centre)), L = (b, v) => { o[`Left${b}`] = (o[`Left${b}`] || 0) + v * sd; o[`Right${b}`] = (o[`Right${b}`] || 0) + v * (1 - sd); };
    const y = p.y, hips = sm((y - (HIP - 0.04)) / 0.08), up = (1 - hips) * (1 - sm((KNEE + 0.07 - y) / 0.14)), leg = (1 - hips) * sm((KNEE + 0.07 - y) / 0.14) * (1 - sm((ANKLE + 0.04 - y) / 0.08)), foot = (1 - hips) * sm((ANKLE + 0.04 - y) / 0.08);
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
  console.log(`re-weighted: ${nL} lungi / hem verts by position (${dropped} had arm/hand weight), ${nU} vest-hem verts stripped of arm weight`);
}
// SACK + STRAP + MANGOES (right shoulder, hanging at his back): rigid on Spine / Spine1 / Spine2, the strap top also on RightShoulder. Never an arm or hand bone, so it cannot stretch when he runs or waves.
{
  let n = 0;
  for (let i = 0; i < N; i++) {
    if (!sackSel[i]) continue; const y = pos[i].y, hi = sm((y - 0.58) / 0.14), sh = sm((y - 0.74) / 0.05);
    const out = { Spine2: 0.1 + 0.6 * hi, Spine1: 0.5 * (1 - hi), Spine: 0.2 * (1 - hi), RightShoulder: 0.3 * sh };
    const e = Object.entries(out).filter(([, v]) => v > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4), s = e.reduce((a, b) => a + b[1], 0); while (e.length < 4) e.push(['Hips', 0]);
    J.setElement(i, e.map(([b]) => ji[b])); W.setElement(i, e.map(([, v]) => v / s)); n++;
  }
  console.log(`sack / strap / mangoes: ${n} vertices on Spine / Spine1 / Spine2 / RightShoulder (zero arm weight)`);
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
for (const m of root.listMaterials()) m.setMetallicFactor(0).setRoughnessFactor(0.78).setMetallicRoughnessTexture(null);

if (process.env.PREVIEW) { await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 80, resize: [1024, 1024] })); await io.write(resolve(outArg), doc); process.exit(0); }
const px = +texArg || 4096;
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [px, px] }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(resolve(outArg), doc);
console.log(`${outArg}: ${(statSync(resolve(outArg)).size / 1e6).toFixed(2)} MB`);
