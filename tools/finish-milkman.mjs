#!/usr/bin/env node
/**
 * 26 Nov: finishing recipe for the Milkman (Smart Mesh raw from Tripo, 6 clips; Tripo texture made with Remove Lighting OFF).
 *   node tools/finish-milkman.mjs <raw-or-face-passed.glb> <out.glb> [texPx=4096]
 * 1. clip names -> game convention (idle, walk, run, gesture_jump, gesture_laugh, gesture_wave)
 * 2. CLOTH FIX (same lesson as the daughter's frock, finish-tvdaughter.mjs): Tripo skinned the red towel on his LEFT shoulder to the arm chain
 *    (LeftShoulder / LeftArm), so it dragged along with the arm. Every red vertex (picked from the base colour texture) is re-weighted to
 *    Spine2 / Spine1 / Neck / LeftShoulder only, never an arm bone. The kurta lower body (between hem and chest, not sleeve, not skin) is re-weighted
 *    to Spine / Hips with a share of the legs growing toward the hem. Then welded-vertex smoothing so the seams do not tear.
 *    Triangles fused between a hand/forearm vertex and the body are cut (the hands cover the cut in rest pose).
 * 1b. gesture_wave = STANDING wave built from idle + the raw wave's left arm (tools/standwave.mjs); the raw clip is a squat
 * 3. matte (metalness 0)
 * 4. textures 4096 WebP q90, meshopt
 * DISABLED 27 Nov (owner rule 22 Nov, no painted/patched eyes on Tripo models; eye_patch.py is NOT run, use tools/rebuild-new-chars.sh): Face pass (tools/face_keys.py, ONLY, eye_patch.py is DISABLED 27 Nov: owner rule, no patched eyes; see tools/rebuild-new-chars.sh) is run BEFORE this script on the raw file.
 */
import { textureCompress, prune, meshopt } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { load, buildRig } from './tvaunty-rig.mjs';
import { fixWave } from './standwave.mjs';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';

const [inArg, outArg, texArg] = process.argv.slice(2);
if (!inArg || !outArg) { console.error('usage: node tools/finish-milkman.mjs <in.glb> <out.glb> [texPx]'); process.exit(1); }
const { io, doc } = await load(resolve(inArg));
const root = doc.getRoot();

// 1. clip names
const NAMES = [[/^idle/i, 'idle'], [/^walk/i, 'walk'], [/^run/i, 'run'], [/^jump/i, 'gesture_jump'], [/^laugh/i, 'gesture_laugh'], [/^wave/i, 'gesture_wave']];
for (const a of root.listAnimations()) { const h = NAMES.find(([re]) => re.test(a.getName())); if (!h) throw new Error(`unexpected clip ${a.getName()}`); a.setName(h[1]); }
const have = root.listAnimations().map((a) => a.getName()).sort().join(',');
if (have !== NAMES.map((n) => n[1]).sort().join(',')) throw new Error(`clip set wrong: ${have}`);

// 1b. 26 Nov: Tripo's raw 'wave_goodbye' is a deep SQUAT (hips drop 19 cm, hands clasped): replace it with a standing wave (idle + the wave clip's left arm)
fixWave(doc);

// 2. cloth weights
const mat0 = root.listMaterials()[0];
const rig = buildRig(doc), jn = rig.joints.map((j) => j.getName().replace('mixamorig:', '')), ji = Object.fromEntries(jn.map((n, i) => [n, i]));
rig.top.updateMatrixWorld(true);
const bp = (n) => rig.byName[n].getWorldPosition(new THREE.Vector3());
const leftSign = Math.sign(bp('LeftUpLeg').x) || 1; // which side of x the character's left leg / shoulder is on
{
  const prim = root.listMeshes()[0].listPrimitives()[0];
  const P = prim.getAttribute('POSITION'), U = prim.getAttribute('TEXCOORD_0'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
  const N = P.getCount();
  const SZ = 1024, { data } = await sharp(Buffer.from(mat0.getBaseColorTexture().getImage())).resize(SZ, SZ, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pos = [], uv = [0, 0], e = [0, 0, 0], jj = [0, 0, 0, 0], ww = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) { P.getElement(i, e); pos.push(new THREE.Vector3(e[0], e[1], e[2])); }
  const kind = new Uint8Array(N); // 1 = towel (red), 2 = kurta lower body, 0 = leave alone
  const HEM = 0.335, TOWEL_BOT = 0.52, KURTA_TOP = 0.56, KURTA_X = 0.158, TOWEL_TOP = 0.84;
  const dominant = (i) => { J.getElement(i, jj); W.getElement(i, ww); let b = 0; for (let k = 1; k < 4; k++) if (ww[k] > ww[b]) b = k; return jn[jj[b]]; };
  let nT = 0, nK = 0;
  for (let i = 0; i < N; i++) {
    U.getElement(i, uv); const x = Math.min(SZ - 1, Math.max(0, Math.floor(uv[0] * SZ))), y = Math.min(SZ - 1, Math.max(0, Math.floor(uv[1] * SZ))), k = (y * SZ + x) * 3;
    const R = data[k], G = data[k + 1], B = data[k + 2], p = pos[i];
    const red = R > 110 && R > G + 45 && R > B + 35;
    const skin = R > G + 18 && G > B + 8 && !(R > 200 && G > 190); // brown skin / arms; cream cloth has R~G~B
    if (red && p.y > TOWEL_BOT && p.y < TOWEL_TOP && p.x * leftSign > 0.0) { kind[i] = 1; nT++; }
    else if (!red && !skin && p.y > HEM && p.y < KURTA_TOP && Math.abs(p.x) < KURTA_X && !/^(Left|Right)(Hand|ForeArm)/.test(dominant(i))) { kind[i] = 2; nK++; }
  }
  const wts = (p, kd) => {
    const y = p.y, o = {}; const add = (b, v) => { if (v > 0) o[b] = (o[b] || 0) + v; };
    if (kd === 1) { // towel on the left shoulder: Spine2 / Spine1 / Neck / LeftShoulder only
      const t = Math.min(1, Math.max(0, (TOWEL_TOP - y) / (TOWEL_TOP - 0.6))); // 0 at the shoulder, 1 hanging low on the chest
      add('Neck', 0.22 * (1 - t)); add('LeftShoulder', 0.28 * (1 - t)); add('Spine2', 0.5 * (1 - t) + 0.62 * t); add('Spine1', 0.38 * t);
      return o;
    }
    // kurta: waist-line 100% Spine/Hips, hem 55% Hips + 45% legs (side by x)
    const t = Math.min(1, Math.max(0, (KURTA_TOP - y) / (KURTA_TOP - HEM))), sm = t * t * (3 - 2 * t), lw = 0.45 * sm, side = Math.min(1, Math.max(0, 0.5 + (p.x * leftSign) / 0.1));
    add('Spine', (1 - sm) * 0.7); add('Spine1', (1 - sm) * 0.3); add('Hips', sm * 0.55 + 0); add('LeftUpLeg', lw * side); add('RightUpLeg', lw * (1 - side));
    return o;
  };
  // weld seams so smoothing crosses them
  const key = (p) => `${Math.round(p.x * 2e4)},${Math.round(p.y * 2e4)},${Math.round(p.z * 2e4)}`, gid = new Int32Array(N), gmap = new Map(); let G = 0;
  for (let i = 0; i < N; i++) { const k = key(pos[i]); if (!gmap.has(k)) gmap.set(k, G++); gid[i] = gmap.get(k); }
  const nb = Array.from({ length: G }, () => new Set()), idx0 = prim.getIndices().getArray();
  for (let t = 0; t < idx0.length; t += 3) for (let a = 0; a < 3; a++) { const g1 = gid[idx0[t + a]], g2 = gid[idx0[t + (a + 1) % 3]]; if (g1 !== g2) { nb[g1].add(g2); nb[g2].add(g1); } }
  const gkind = new Uint8Array(G); for (let i = 0; i < N; i++) if (kind[i]) gkind[gid[i]] = kind[i];
  const grp = new Array(G).fill(null), gp = new Array(G);
  for (let i = 0; i < N; i++) if (!grp[gid[i]]) { J.getElement(i, jj); W.getElement(i, ww); const m = new Map(); for (let k = 0; k < 4; k++) if (ww[k] > 0) m.set(jj[k], (m.get(jj[k]) || 0) + ww[k]); grp[gid[i]] = m; gp[gid[i]] = pos[i]; }
  for (let g = 0; g < G; g++) if (gkind[g]) { const m = new Map(); for (const [b, v] of Object.entries(wts(gp[g], gkind[g]))) m.set(ji[b], v); grp[g] = m; }
  // hand / forearm vertices keep their own weights, never smoothed into the cloth
  const handG = new Set(); for (let i = 0; i < N; i++) if (/^(Left|Right)(Hand|ForeArm)/.test(dominant(i)) && !kind[i]) handG.add(gid[i]);
  const fixed = new Set(); for (let g = 0; g < G; g++) if (gkind[g]) fixed.add(g);
  const region = new Set(fixed); let front = [...fixed];
  for (let r = 0; r < +(process.env.RINGS || 2); r++) { const nx = []; for (const g of front) for (const h of nb[g]) if (!region.has(h) && !handG.has(h)) { region.add(h); nx.push(h); } front = nx; }
  for (let it = 0; it < +(process.env.ITERS || 8); it++) {
    const out = new Map();
    for (const g of region) { const acc = new Map(); const add = (m, f) => { for (const [b, v] of m) acc.set(b, (acc.get(b) || 0) + v * f); }; add(grp[g], 0.6); const ns = [...nb[g]].filter((h) => region.has(h)); if (ns.length) { for (const h of ns) add(grp[h], 0.4 / ns.length); } else add(grp[g], 0.4); out.set(g, acc); }
    for (const [g, m] of out) grp[g] = m;
  }
  let changed = 0;
  for (let i = 0; i < N; i++) {
    if (!region.has(gid[i])) continue;
    const top = [...grp[gid[i]]].sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((a, b) => a + b[1], 0);
    while (top.length < 4) top.push([0, 0]);
    J.setElement(i, top.map((t) => t[0])); W.setElement(i, top.map((t) => t[1] / s)); changed++;
  }
  // triangles fused between a hand / forearm vertex and the body stretch into streaks when the arms move: cut them (FINAL weights)
  {
    const dom = new Uint8Array(N);
    for (let i = 0; i < N; i++) { const nm = dominant(i); dom[i] = /^(Left|Right)(Hand|ForeArm)/.test(nm) ? 1 : /^(Left|Right)(Shoulder|Arm)/.test(nm) ? 2 : 0; }
    const old = prim.getIndices().getArray(), keep = []; let cut = 0;
    for (let t = 0; t < old.length; t += 3) { const d = [dom[old[t]], dom[old[t + 1]], dom[old[t + 2]]]; if (d.includes(1) && d.includes(0)) { cut++; continue; } keep.push(old[t], old[t + 1], old[t + 2]); }
    prim.setIndices(prim.getIndices().clone().setArray(old.constructor.from(keep)));
    console.log(`cut ${cut} triangles joining the hands to the body`);
  }
  // report: any towel / kurta vertex still carrying arm-chain weight above 5%
  let bad = 0;
  for (let i = 0; i < N; i++) if (kind[i]) { J.getElement(i, jj); W.getElement(i, ww); let a = 0; for (let k = 0; k < 4; k++) if (/^(Left|Right)(Arm|ForeArm|Hand)/.test(jn[jj[k]])) a += ww[k]; if (a > 0.05) bad++; }
  console.log(`towel: ${nT} red vertices, kurta: ${nK} vertices re-weighted, ${changed} smoothed (of ${N}); cloth verts with arm weight > 5%: ${bad}`);
}

// 3. matte
for (const m of root.listMaterials()) m.setMetallicFactor(0).setRoughnessFactor(0.85).setMetallicRoughnessTexture(null);

if (process.env.PREVIEW) { await io.write(resolve(outArg), doc); process.exit(0); }
const px = +texArg || 4096;
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [px, px] }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(resolve(outArg), doc);
console.log(`${outArg}: ${(statSync(resolve(outArg)).size / 1e6).toFixed(2)} MB`);
