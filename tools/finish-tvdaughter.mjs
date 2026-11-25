#!/usr/bin/env node
/**
 * 25 Nov: finishing recipe for Aunty's Daughter (Smart Mesh raw from Tripo, 6 clips).
 *   node tools/finish-tvdaughter.mjs <raw-or-face-passed.glb> <out.glb> [texPx=4096]
 * 1. clip names -> game convention (idle, walk, run, gesture_greet, gesture_cheer, gesture_jump)
 * 2. FROCK FIX: Tripo skinned the navy pinafore (skirt, belt, bodice, straps) partly to the arm / hand / shoulder chain, so the frock lifted
 *    with the arms in jump / cheer / greet and tore in idle. Every navy vertex (picked from the base colour texture) between the hem and the
 *    shoulders is re-weighted: bodice Spine2/Spine1/Spine, waist Hips, skirt Hips blended toward LeftUpLeg/RightUpLeg toward the hem
 *    (left/right share by x), then welded-vertex smoothing (like finish-tvaunty2.mjs did for the pallu). Arm, sleeve and skin vertices untouched.
 * 3. matte (metalness 0), small gold stud earrings parented to the Head bone
 * 4. textures 4096 WebP q90, meshopt
 */
import { textureCompress, prune, meshopt } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import { load, buildRig } from './tvaunty-rig.mjs';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';

const [inArg, outArg, texArg] = process.argv.slice(2);
if (!inArg || !outArg) { console.error('usage: node tools/finish-tvdaughter.mjs <in.glb> <out.glb> [texPx]'); process.exit(1); }
const { io, doc } = await load(resolve(inArg));
const root = doc.getRoot();

// 1. clip names
const NAMES = [[/^idle/i, 'idle'], [/^walk/i, 'walk'], [/^run/i, 'run'], [/^greet/i, 'gesture_greet'], [/^cheer/i, 'gesture_cheer'], [/^jump/i, 'gesture_jump']];
for (const a of root.listAnimations()) { const h = NAMES.find(([re]) => re.test(a.getName())); if (!h) throw new Error(`unexpected clip ${a.getName()}`); a.setName(h[1]); }
const have = root.listAnimations().map((a) => a.getName()).sort().join(',');
if (have !== NAMES.map((n) => n[1]).sort().join(',')) throw new Error(`clip set wrong: ${have}`);

// 2. frock weights
const mat0 = root.listMaterials()[0];
const rig = buildRig(doc), jn = rig.joints.map((j) => j.getName().replace('mixamorig:', '')), ji = Object.fromEntries(jn.map((n, i) => [n, i]));
rig.top.updateMatrixWorld(true);
const bp = (n) => rig.byName[n].getWorldPosition(new THREE.Vector3());
const leftSign = Math.sign(bp('LeftUpLeg').x) || 1; // which side of x the character's left leg is on
{
  const prim = root.listMeshes()[0].listPrimitives()[0];
  const P = prim.getAttribute('POSITION'), U = prim.getAttribute('TEXCOORD_0'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), idx = prim.getIndices().getArray();
  const N = P.getCount();
  const SZ = 1024, { data } = await sharp(Buffer.from(mat0.getBaseColorTexture().getImage())).resize(SZ, SZ, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pos = [], uv = [0, 0], e = [0, 0, 0], jj = [0, 0, 0, 0], ww = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) { P.getElement(i, e); pos.push(new THREE.Vector3(e[0], e[1], e[2])); }
  const navy = new Uint8Array(N), mask = new Uint8Array(N);
  const HEM = 0.27, TOP = 0.80;
  for (let i = 0; i < N; i++) {
    U.getElement(i, uv); const x = Math.min(SZ - 1, Math.max(0, Math.floor(uv[0] * SZ))), y = Math.min(SZ - 1, Math.max(0, Math.floor(uv[1] * SZ))), k = (y * SZ + x) * 3;
    const R = data[k], G = data[k + 1], B = data[k + 2];
    navy[i] = B > R + 12 && B > G + 4 && R < 90 && B < 150 ? 1 : 0;
    if (navy[i] && pos[i].y > HEM && pos[i].y < TOP) mask[i] = 1;
  }
  // stray frock vertices: weighted mostly to an arm / hand / shoulder bone yet lying far from that arm's own bones (they stretch to the hands)
  const armSegs = { Left: [], Right: [] };
  for (const side of ['Left', 'Right']) rig.top.traverse((b) => { if (b.isBone && b.name.startsWith(side + 'Shoulder')) { b.traverse((c) => { if (c.isBone && c.parent && c.parent.isBone) armSegs[side].push([bp(c.parent.name), bp(c.name)]); }); } });
  const segD = (p, a, b) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
  const armIdx = new Map(); jn.forEach((n, i) => { const m = /^(Left|Right)(Shoulder|Arm|ForeArm|Hand)/.exec(n); if (m) armIdx.set(i, m[1]); });
  let stray = 0;
  for (let i = 0; i < N; i++) {
    if (mask[i] || pos[i].y > 0.6 || pos[i].y < 0.2) continue; // skirt zone only (sleeves are wide and legitimately far from the arm bone)
    J.getElement(i, jj); W.getElement(i, ww); const acc = { Left: 0, Right: 0 };
    for (let k = 0; k < 4; k++) if (armIdx.has(jj[k])) acc[armIdx.get(jj[k])] += ww[k];
    const side = acc.Left > acc.Right ? 'Left' : 'Right';
    if (acc[side] < 0.3) continue;
    const d = Math.min(...armSegs[side].map(([a, b]) => segD(pos[i], a, b)));
    if (d > +(process.env.STRAY_D || 0.05)) { mask[i] = 1; stray++; }
  }
  console.log(`stray arm-weighted vertices away from the arm: ${stray}`);
  const handDom = new Uint8Array(N);
  for (let i = 0; i < N; i++) { J.getElement(i, jj); W.getElement(i, ww); let b = 0; for (let k = 1; k < 4; k++) if (ww[k] > ww[b]) b = k; if (/^(Left|Right)(Hand|ForeArm)/.test(jn[jj[b]]) && !mask[i]) handDom[i] = 1; }
  const wts = (p) => { // target weights for a frock vertex at bind position p
    const y = p.y, o = {}; const add = (b, v) => { if (v > 0) o[b] = (o[b] || 0) + v; };
    const torso = [[0.76, { Spine2: 0.8, Spine1: 0.2 }], [0.68, { Spine2: 0.55, Spine1: 0.45 }], [0.62, { Spine1: 0.75, Spine: 0.25 }], [0.57, { Spine: 0.8, Spine1: 0.1, Hips: 0.1 }], [0.53, { Hips: 1 }]];
    if (y >= 0.53) {
      if (y >= torso[0][0]) for (const [b, v] of Object.entries(torso[0][1])) add(b, v);
      else for (let k = 0; k < torso.length - 1; k++) if (y <= torso[k][0] && y >= torso[k + 1][0]) { const t = (torso[k][0] - y) / (torso[k][0] - torso[k + 1][0]); for (const [b, v] of Object.entries(torso[k][1])) add(b, v * (1 - t)); for (const [b, v] of Object.entries(torso[k + 1][1])) add(b, v * t); break; }
      return o;
    }
    // skirt: waist 100% Hips, hem 38% Hips + 62% legs (side by x, centre line shared)
    const t = Math.min(1, (0.53 - y) / (0.53 - HEM)), lw = 0.62 * t * t * (3 - 2 * t) * 1, side = Math.min(1, Math.max(0, 0.5 + (p.x * leftSign) / 0.1));
    add('Hips', 1 - lw); add('LeftUpLeg', lw * side); add('RightUpLeg', lw * (1 - side));
    return o;
  };
  // weld seams so smoothing crosses them
  const key = (p) => `${Math.round(p.x * 2e4)},${Math.round(p.y * 2e4)},${Math.round(p.z * 2e4)}`, gid = new Int32Array(N), gmap = new Map(); let G = 0;
  for (let i = 0; i < N; i++) { const k = key(pos[i]); if (!gmap.has(k)) gmap.set(k, G++); gid[i] = gmap.get(k); }
  const nb = Array.from({ length: G }, () => new Set());
  for (let t = 0; t < prim.getIndices().getCount(); t += 3) for (let a = 0; a < 3; a++) { const idx = prim.getIndices().getArray(); const g1 = gid[idx[t + a]], g2 = gid[idx[t + (a + 1) % 3]]; if (g1 !== g2) { nb[g1].add(g2); nb[g2].add(g1); } }
  const gm = new Uint8Array(G); for (let i = 0; i < N; i++) if (mask[i]) gm[gid[i]] = 1;
  // grow the mask groups by 1 ring of navy neighbours below the shoulders is not needed; smoothing region = mask + 2 rings
  const grp = new Array(G).fill(null);
  for (let i = 0; i < N; i++) if (!grp[gid[i]]) { J.getElement(i, jj); W.getElement(i, ww); const m = new Map(); for (let k = 0; k < 4; k++) if (ww[k] > 0) m.set(jj[k], (m.get(jj[k]) || 0) + ww[k]); grp[gid[i]] = m; }
  const gp = new Array(G); for (let i = 0; i < N; i++) gp[gid[i]] = pos[i];
  for (let g = 0; g < G; g++) if (gm[g]) { const m = new Map(); for (const [b, v] of Object.entries(wts(gp[g]))) m.set(ji[b], v); grp[g] = m; }
  const handG = new Set(); for (let i = 0; i < N; i++) if (handDom[i]) handG.add(gid[i]); // hand / forearm vertices keep their own weights, never smoothed into the frock
  const fixed = new Set(); for (let g = 0; g < G; g++) if (gm[g]) fixed.add(g);
  const region = new Set(fixed); let front = [...fixed];
  for (let r = 0; r < +(process.env.RINGS || 4); r++) { const nx = []; for (const g of front) for (const h of nb[g]) if (!region.has(h) && !handG.has(h)) { region.add(h); nx.push(h); } front = nx; }
  for (let it = 0; it < +(process.env.ITERS || 10); it++) {
    const out = new Map();
    for (const g of region) { const acc = new Map(); const add = (m, f) => { for (const [b, v] of m) acc.set(b, (acc.get(b) || 0) + v * f); }; add(grp[g], 0.6); const ns = [...nb[g]].filter((h) => region.has(h)); add(grp[g], 0); if (ns.length) { for (const h of ns) add(grp[h], 0.4 / ns.length); } else add(grp[g], 0.4); out.set(g, acc); }
    for (const [g, m] of out) grp[g] = m;
  }
  let changed = 0;
  for (let i = 0; i < N; i++) {
    if (!region.has(gid[i])) continue;
    const top = [...grp[gid[i]]].sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((a, b) => a + b[1], 0);
    while (top.length < 4) top.push([0, 0]);
    J.setElement(i, top.map((t) => t[0])); W.setElement(i, top.map((t) => t[1] / s)); changed++;
  }
  // the mesh is fused where the hands touch the frock / hips: triangles joining a hand or forearm vertex to a non-arm vertex stretch into long
  // streaks when the arms move, so cut them (FINAL weights; the hands cover the cut in the rest pose)
  {
    const dom = new Uint8Array(N); // 1 = hand/forearm, 2 = arm chain (shoulder/arm), 0 = rest of the body
    for (let i = 0; i < N; i++) { J.getElement(i, jj); W.getElement(i, ww); let b = 0; for (let k = 1; k < 4; k++) if (ww[k] > ww[b]) b = k; const nm = jn[jj[b]]; dom[i] = /^(Left|Right)(Hand|ForeArm)/.test(nm) ? 1 : /^(Left|Right)(Shoulder|Arm)/.test(nm) ? 2 : 0; }
    const old = prim.getIndices().getArray(), keep = []; let cut = 0;
    for (let t = 0; t < old.length; t += 3) {
      const a = old[t], b = old[t + 1], c = old[t + 2], d = [dom[a], dom[b], dom[c]];
      if (d.includes(1) && d.includes(0)) { cut++; continue; }
      keep.push(a, b, c);
    }
    prim.setIndices(prim.getIndices().clone().setArray(old.constructor.from(keep)));
    console.log(`cut ${cut} triangles joining the hands to the body/frock`);
  }
  console.log(`frock: ${mask.reduce((a, b) => a + b, 0)} navy vertices re-weighted, ${changed} smoothed (of ${N})`);
}

// 3. matte
for (const m of root.listMaterials()) m.setMetallicFactor(0).setRoughnessFactor(0.85).setMetallicRoughnessTexture(null);

// earrings
if (process.env.EARRINGS !== '0') {
  const head = rig.joints.find((j) => j.getName() === 'mixamorig:Head');
  const buf = root.listBuffers()[0];
  const gold = doc.createMaterial('gold_jewellery').setBaseColorFactor([1, 0.76, 0.28, 1]).setMetallicFactor(0).setRoughnessFactor(0.45);
  const sphere = (r, seg = 12) => { const pos = [], nor = [], id = []; for (let a = 0; a <= seg; a++) for (let b = 0; b <= seg * 2; b++) { const th = (a / seg) * Math.PI, ph = (b / (seg * 2)) * Math.PI * 2, x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph); pos.push(x * r, y * r, z * r); nor.push(x, y, z); } for (let a = 0; a < seg; a++) for (let b = 0; b < seg * 2; b++) { const i0 = a * (seg * 2 + 1) + b, i1 = i0 + seg * 2 + 1; id.push(i0, i1, i0 + 1, i1, i1 + 1, i0 + 1); } return { pos: new Float32Array(pos), nor: new Float32Array(nor), id: new Uint16Array(id) }; };
  const hb = rig.byName.Head, hinv = new THREE.Matrix4().copy(hb.matrixWorld).invert();
  const EAR = (process.env.EAR_POS || '0.0805,0.9,-0.003').split(',').map(Number); // bind-pose lobe position (x,y,z) of the character's +x ear; mirrored for the other
  [1, -1].forEach((s, n) => {
    const p = new THREE.Vector3(EAR[0] * s, EAR[1], EAR[2]).applyMatrix4(hinv), g = sphere(0.0042);
    const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor(`ear${n}_p`).setType('VEC3').setArray(g.pos).setBuffer(buf)).setAttribute('NORMAL', doc.createAccessor(`ear${n}_n`).setType('VEC3').setArray(g.nor).setBuffer(buf)).setIndices(doc.createAccessor(`ear${n}_i`).setType('SCALAR').setArray(g.id).setBuffer(buf)).setMaterial(gold);
    head.addChild(doc.createNode(`earring_gold_${s > 0 ? 'px' : 'nx'}`).setTranslation(p.toArray()).setMesh(doc.createMesh(`earring${n}`).addPrimitive(prim)));
  });
}

if (process.env.PREVIEW) { await io.write(resolve(outArg), doc); process.exit(0); }
const px = +texArg || 4096;
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [px, px] }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(resolve(outArg), doc);
console.log(`${outArg}: ${(statSync(resolve(outArg)).size / 1e6).toFixed(2)} MB`);
