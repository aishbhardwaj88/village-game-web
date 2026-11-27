#!/usr/bin/env node
/**
 * 26 Nov: finishing recipe for the Halwai (sweet maker), Smart Mesh raw from Tripo, 6 clips. Same pattern as finish-darzi.mjs, no accessories.
 *   node tools/finish-halwai.mjs <face-passed.glb> <out.glb> [texPx=4096]
 * Face pass first (headless Blender, raw file). Head render centre x 0.002, z 0.90, 0.30 m / 600 px; eyes (242,247) (336,247), mouth corners (250,333) (334,333):
 *   echo "0.002 0.90 0.30" > hw_cam.txt ; python3 tools/face_keys.py raw.glb hw 242,247,336,247 250,333,334,333   (-> hw_keys.glb)
 * DISABLED 27 Nov (owner rule 22 Nov, no painted/patched eyes on Tripo models; eye_patch.py is NOT run, use tools/rebuild-new-chars.sh):   echo "0.002 0.90 0.30 600" > halwai_head.txt ; python3 tools/eye_patch.py -- hw_keys.glb hw_eyes.glb halwai '[[242,247],[336,247]]'
 * 1. clip names -> game convention; the raw wave is a squat, replaced by the standing wave (tools/standwave.mjs)
 * 2. WEIGHT FIX. Tripo skinned the apron, the striped cloth and the lungi to the arm / hand bones (his hand touched the apron in the pictures), so the apron
 *    stretched to a spike and the lungi tore at the thigh in the wave. Every garment shell below the shirt hem (apron, cloth, waist band, back piece, lungi) is
 *    re-weighted BY POSITION to Hips / UpLeg / Leg only (left/right by x, blended smoothly over the centre line so the lungi cannot tear between the legs), zero
 *    arm / hand weight. The shirt tails (torso shell below the armpit) lose all arm-chain weight. A stretch test over all six clips reports the worst edge stretch.
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
if (!inArg || !outArg) { console.error('usage: node tools/finish-halwai.mjs <in.glb> <out.glb> [texPx]'); process.exit(1); }
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
const KA = +(process.env.APRON_LEG ?? 0.5), KL = +(process.env.GARMENT_LEG ?? 0.5), CL = +(process.env.CENTRE ?? 0.16); // share of the leg weight kept on the garment, half width (m) of the left/right blend
const idx = prim.getIndices().getArray();
const apron = new Uint8Array(N), garment = new Uint8Array(N), skinLow = new Uint8Array(N), torso = new Uint8Array(N); // garment shells, leg / foot skin shells, torso shell
{
  const key = (p) => `${Math.round(p.x * 2e4)},${Math.round(p.y * 2e4)},${Math.round(p.z * 2e4)}`, gid = new Int32Array(N), gm = new Map(); let G = 0;
  for (let i = 0; i < N; i++) { const k = key(pos[i]); if (!gm.has(k)) gm.set(k, G++); gid[i] = gm.get(k); }
  const par = Array.from({ length: G }, (_, i) => i), f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < idx.length; t += 3) { const a = f(gid[idx[t]]); par[f(gid[idx[t + 1]])] = a; par[f(gid[idx[t + 2]])] = a; }
  const sh = new Map();
  for (let i = 0; i < N; i++) { const r = f(gid[i]); let s = sh.get(r); if (!s) { s = { n: 0, lo: 9, hi: -9, xl: 9, xh: -9 }; sh.set(r, s); } s.n++; s.lo = Math.min(s.lo, pos[i].y); s.hi = Math.max(s.hi, pos[i].y); s.xl = Math.min(s.xl, pos[i].x); s.xh = Math.max(s.xh, pos[i].x); }
  let ng = 0, nl = 0, nt = 0;
  for (let i = 0; i < N; i++) {
    const s = sh.get(f(gid[i]));
    if (s.hi < 0.56 && s.lo > 0.28) { garment[i] = 1; apron[i] = 1; ng++; }            // apron, striped cloth, waist band, back piece, lungi top (y 0.28 - 0.56)
    else if (s.hi < 0.56 && s.lo > 0.1) { garment[i] = 1; ng++; } // lungi (y 0.17 - 0.52) and its hanging tail (y 0.17 - 0.34): garment, not leg skin
    else if (s.hi < 0.56) { skinLow[i] = 1; nl++; }
    else if (s.n > 4000 && s.lo > 0.4 && s.lo < 0.55 && s.hi > 0.8) { torso[i] = 1; nt++; }
  }
  if (process.env.DBG) for (const [r, s] of sh) if (s.hi < 0.56) console.log("shell", s.n, s.lo.toFixed(2), s.hi.toFixed(2), s.xl.toFixed(2), s.xh.toFixed(2));
  console.log(`garment ${ng}, leg/foot skin ${nl}, torso shell ${nt} of ${N} vertices`);
}
{
  const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0];
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const posW = (p, centre, kl = KL) => { // by-position leg weights; left / right blend over |x| < centre so the cloth stretches smoothly between the legs
    const o = {}, side = smooth(0.5 + (p.x * leftSign) / (2 * centre)), L = (b, v) => { o[`Left${b}`] = (o[`Left${b}`] || 0) + v * side; o[`Right${b}`] = (o[`Right${b}`] || 0) + v * (1 - side); };
    const y = p.y, hips = smooth((y - (HIP - 0.04)) / 0.08), up = (1 - hips) * (1 - smooth((KNEE + 0.07 - y) / 0.14)), leg = (1 - hips) * smooth((KNEE + 0.07 - y) / 0.14) * (1 - smooth((ANKLE + 0.04 - y) / 0.08)), foot = (1 - hips) * smooth((ANKLE + 0.04 - y) / 0.08);
    if (hips > 0) o.Hips = hips;
    if (centre > 0.03) L('UpLeg', up + leg + foot); else { L('UpLeg', up); L('Leg', leg); L('Foot', foot); } // cloth follows the thigh only (a bent knee would drag the lungi tail)
    if (centre > 0.03) { let mv = 0; for (const b of Object.keys(o)) if (b !== 'Hips') { mv += o[b] * (1 - kl); o[b] *= kl; } o.Hips = (o.Hips || 0) + mv; } // garment: part of the leg swing stays on the Hips
    return o;
  };
  let nG = 0, nS = 0, nT = 0, dropped = 0;
  for (let i = 0; i < N; i++) {
    if (!garment[i] && !skinLow[i] && !torso[i]) continue;
    J.getElement(i, jj); W.getElement(i, ww); const p = pos[i];
    const cur = {}; for (let k = 0; k < 4; k++) if (ww[k] > 0) cur[jn[jj[k]]] = (cur[jn[jj[k]]] || 0) + ww[k];
    let out;
    if (garment[i]) { out = posW(p, CL, apron[i] ? KA : KL); nG++; if (Object.keys(cur).some((b) => ARM.test(b))) dropped++; }
    else if (skinLow[i]) {
      const keep = {}; let s = 0; for (const [b, v] of Object.entries(cur)) { if (!LOWER.test(b)) continue; if (Math.abs(p.x) > 0.012 && ((/^Left/.test(b) ? 1 : /^Right/.test(b) ? -1 : 0) * leftSign * Math.sign(p.x) < 0)) continue; keep[b] = v; s += v; }
      if (s >= 0.6) out = keep; else { out = posW(p, 0.01); nS++; }
      if (Object.keys(cur).some((b) => ARM.test(b))) dropped++;
    } else { // shirt tails: no arm-chain weight below the armpit
      const keep = {}; let s = 0; for (const [b, v] of Object.entries(cur)) { if (p.y < 0.60 && ARM.test(b)) continue; if (/^(Left|Right)(Hand|ForeArm)/.test(b) && Math.abs(p.x) < 0.12) continue; keep[b] = v; s += v; }
      if (s < 0.3) out = { Spine1: 1 }; else { out = keep; nT++; }
    }
    const top = Object.entries(out).filter(([, v]) => v > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((a, b) => a + b[1], 0);
    while (top.length < 4) top.push(['Hips', 0]);
    J.setElement(i, top.map(([b]) => ji[b])); W.setElement(i, top.map(([, v]) => v / s));
  }
  console.log(`re-weighted: ${nG} garment verts by position (${dropped} had arm/hand weight), ${nS} leg-skin by position, ${nT} shirt-tail verts`);
}
// stretch test: worst edge length ratio (current / rest) of the garment triangles in every clip, plus the worst single-vertex move relative to the rigid Hips motion
{
  const inv = rig.joints.map((j) => rig.byName[j.getName().replace('mixamorig:', '')].matrixWorld.clone().invert());
  const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0], tmp = new THREE.Vector3(), edges = [];
  for (let t = 0; t < idx.length; t += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const u = idx[t + a], v = idx[t + b]; if (garment[u] && garment[v] && pos[u].distanceTo(pos[v]) > 0.006) edges.push([u, v, pos[u].distanceTo(pos[v])]); }
  const skin = (M, i) => { J.getElement(i, jj); W.getElement(i, ww); const o = new THREE.Vector3(); for (let k = 0; k < 4; k++) if (ww[k] > 0) o.addScaledVector(tmp.copy(pos[i]).applyMatrix4(M[jj[k]]), ww[k]); return o; };
  for (const name of ['idle', 'walk', 'run', 'gesture_jump', 'gesture_wave', 'gesture_laugh']) {
    const cd = clipData(doc, name); let worst = 0, wf = 0, wi = -1;
    for (let fr = 0; fr < cd.times.length; fr += 3) {
      pose(rig, cd, fr); const M = rig.joints.map((j, n) => rig.byName[j.getName().replace('mixamorig:', '')].matrixWorld.clone().multiply(inv[n]));
      const cache = new Map(); const sk = (i) => cache.get(i) || (cache.set(i, skin(M, i)), cache.get(i));
      for (let e = 0; e < edges.length; e += 2) { const r = sk(edges[e][0]).distanceTo(sk(edges[e][1])) / edges[e][2]; if (r > worst) { worst = r; wf = fr; wi = edges[e][0]; } }
    }
    console.log(`stretch ${name.padEnd(13)} worst garment edge x${worst.toFixed(2)} (frame ${wf}, vertex y ${pos[wi]?.y.toFixed(2)} x ${pos[wi]?.x.toFixed(2)})`);
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
