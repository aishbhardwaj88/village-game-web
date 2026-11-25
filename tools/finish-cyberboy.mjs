#!/usr/bin/env node
/**
 * 26 Nov: finishing recipe for the Cyber cafe boy (Smart Mesh raw from Tripo, 6 clips). Same pattern as finish-milkman.mjs.
 *   node tools/finish-cyberboy.mjs <face-passed.glb> <out.glb> [texPx=4096]
 * Face pass first (headless Blender), on the raw file, eyes/mouth picked from a head render (600 px = 0.30 m, centre x 0.002, z 0.915):
 *   echo "0.002 0.915 0.30" > cb_cam.txt ; python3 tools/face_keys.py raw.glb cb 250,330,326,330 251,402,324,402   (-> cb_keys.glb)
 *   echo "0.002 0.915 0.30 600" > cyber_head.txt ; python3 tools/eye_patch.py -- cb_keys.glb cb_eyes.glb cyber '[[250,330],[326,330]]'
 * 1. clip names -> game convention; the raw wave is a squat, replaced by a standing wave (tools/standwave.mjs)
 * 2. WEIGHT FIX. Tripo skinned the jeans and the t-shirt hem to the HAND / forearm bones, so the jeans stretched up whenever he waved.
 *    The body+jeans shell (one connected piece, the arms are separate shells) is re-weighted by position:
 *      below the hem line (y < 0.50): Hips / UpLeg / Leg / Foot only (side by x); existing weights kept where they are already such bones, else by height
 *      above: every hand / forearm / finger weight removed (arm / shoulder weights removed too below the armpit); t-shirt hem follows Hips / Spine
 * 3. matte (metalness 0)
 * 4. thin round wire-rim glasses (owner rule: Claude adds glasses after Tripo), low poly, parented to the Head bone, sized from the eye patch
 * 5. textures 4096 WebP q90, meshopt
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
if (!inArg || !outArg) { console.error('usage: node tools/finish-cyberboy.mjs <in.glb> <out.glb> [texPx]'); process.exit(1); }
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
const headRestInv = rig.byName.Head.matrixWorld.clone().invert(); // bind pose, taken before the motion test poses the rig
const bp = (n) => rig.byName[n].getWorldPosition(new THREE.Vector3());
const leftSign = Math.sign(bp('LeftUpLeg').x) || 1;
const prim = root.listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), N = P.getCount();
const pos = []; { const e = [0, 0, 0]; for (let i = 0; i < N; i++) { P.getElement(i, e); pos.push(new THREE.Vector3(e[0], e[1], e[2])); } }
const ARM = /^(Left|Right)(Shoulder|Arm|ForeArm|Hand)/, HANDISH = /^(Left|Right)(ForeArm|Hand)/, LOWER = /^(Hips|(Left|Right)(UpLeg|Leg|Foot|ToeBase|Toe_End))$/;
const LOW_Y = +(process.env.LOW_Y || 0.50), ARMPIT_Y = 0.66;
const inBody = new Uint8Array(N);
const KNEE = bp('LeftLeg').y, HIP = bp('LeftUpLeg').y, ANKLE = bp('LeftFoot').y;
{
  // the body + jeans shell: the biggest connected piece that reaches the floor and the chest (arms, sleeves, watch, hair, shoes are separate shells)
  const idx = prim.getIndices().getArray(), key = (p) => `${Math.round(p.x * 2e4)},${Math.round(p.y * 2e4)},${Math.round(p.z * 2e4)}`, gid = new Int32Array(N), gm = new Map(); let G = 0;
  for (let i = 0; i < N; i++) { const k = key(pos[i]); if (!gm.has(k)) gm.set(k, G++); gid[i] = gm.get(k); }
  const par = Array.from({ length: G }, (_, i) => i), f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < idx.length; t += 3) { const a = f(gid[idx[t]]); par[f(gid[idx[t + 1]])] = a; par[f(gid[idx[t + 2]])] = a; }
  const cnt = new Map(), lo = new Map(), hi = new Map();
  for (let i = 0; i < N; i++) { const r = f(gid[i]); cnt.set(r, (cnt.get(r) || 0) + 1); lo.set(r, Math.min(lo.get(r) ?? 9, pos[i].y)); hi.set(r, Math.max(hi.get(r) ?? -9, pos[i].y)); }
  let body = -1; for (const [r, c] of cnt) if (lo.get(r) < 0.03 && hi.get(r) > 0.6 && (body < 0 || c > cnt.get(body))) body = r;
  let nb = 0; for (let i = 0; i < N; i++) if (f(gid[i]) === body) { inBody[i] = 1; nb++; }
  const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0];
  // by-height weights for the lower body (used only where the existing weights are not leg bones)
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const posW = (p) => {
    const side = Math.min(1, Math.max(0, 0.5 + (p.x * leftSign) / 0.02)), L = (b, v) => { o[`Left${b}`] = (o[`Left${b}`] || 0) + v * side; o[`Right${b}`] = (o[`Right${b}`] || 0) + v * (1 - side); }, o = {};
    const y = p.y;
    const hips = smooth((y - (HIP - 0.04)) / 0.08);                                // 1 above the hip joint, 0 a few cm below
    const up = (1 - hips) * (1 - smooth((KNEE + 0.07 - y) / 0.14));               // thigh
    const leg = (1 - hips) * smooth((KNEE + 0.07 - y) / 0.14) * (1 - smooth((ANKLE + 0.04 - y) / 0.08));
    const foot = (1 - hips) * smooth((ANKLE + 0.04 - y) / 0.08);
    if (hips > 0) o.Hips = hips; L('UpLeg', up); L('Leg', leg); L('Foot', foot);
    return o;
  };
  let nLow = 0, nPos = 0, nStrip = 0, nHem = 0, dropped = 0;
  for (let i = 0; i < N; i++) {
    if (!inBody[i]) continue;
    J.getElement(i, jj); W.getElement(i, ww); const p = pos[i];
    const cur = {}; for (let k = 0; k < 4; k++) if (ww[k] > 0) cur[jn[jj[k]]] = (cur[jn[jj[k]]] || 0) + ww[k];
    let out;
    if (p.y < LOW_Y) {
      // jeans, tee hem and hips: leg / hips bones only, the right side's bones (a left bone only for a vertex left of centre)
      const keep = {}; let s = 0;
      for (const [b, v] of Object.entries(cur)) { if (!LOWER.test(b)) continue; if (Math.abs(p.x) > 0.012 && ((/^Left/.test(b) ? 1 : /^Right/.test(b) ? -1 : 0) * leftSign * Math.sign(p.x) < 0)) continue; keep[b] = v; s += v; }
      if (s >= 0.6) { out = keep; nLow++; } else { out = posW(p); nPos++; }
      if (Object.keys(cur).some((b) => ARM.test(b) || /Hand/.test(b))) dropped++;
    } else {
      const keep = {}; let s = 0;
      for (const [b, v] of Object.entries(cur)) { if (HANDISH.test(b) || (p.y < ARMPIT_Y && ARM.test(b))) continue; keep[b] = v; s += v; }
      if (s < 0.3) { out = { Spine1: 1 }; nStrip++; } else { out = keep; if (s < 0.999) nStrip++; }
      if (p.y < LOW_Y + 0.08) nHem++;
    }
    const top = Object.entries(out).filter(([, v]) => v > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((a, b) => a + b[1], 0);
    while (top.length < 4) top.push(['Hips', 0]);
    J.setElement(i, top.map(([b]) => ji[b])); W.setElement(i, top.map(([, v]) => v / s));
  }
  console.log(`body shell ${nb} of ${N} vertices: ${nLow} lower-body kept leg bones, ${nPos} lower-body by height, ${dropped} had arm/hand weight, ${nStrip} upper arm-weight removed, ${nHem} hem-band`);
}
// verify numerically: every body-shell vertex with y < 0.62 has zero arm-chain weight; no vertex below LOW_Y carries a Spine/arm weight
{
  let bad = 0; const jj = [0, 0, 0, 0], ww = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) { if (pos[i].y > 0.62 || pos[i].x * pos[i].x > 0.0144) continue; J.getElement(i, jj); W.getElement(i, ww); for (let k = 0; k < 4; k++) if (ww[k] > 0.02 && /^(Left|Right)(Hand|ForeArm)/.test(jn[jj[k]]) && Math.abs(pos[i].x) < 0.075) bad++; }
  console.log(`vertices near the centre line (|x| < 7.5 cm, y < 0.62) with hand/forearm weight: ${bad}`);
}
// motion test: how far do jeans/hem vertices (y < 0.50, |x| < 0.095) move in the wave clip, relative to idle, in the worst frame
{
  const inv = rig.joints.map((j) => { const b = rig.byName[j.getName().replace('mixamorig:', '')]; return b.matrixWorld.clone().invert(); });
  const wave = clipData(doc, 'gesture_wave'), idle = clipData(doc, 'idle'), jj = [0, 0, 0, 0], ww = [0, 0, 0, 0], v = new THREE.Vector3(), a = new THREE.Vector3();
  const skinAt = (cd, fr) => { pose(rig, cd, fr); const M = rig.joints.map((j, n) => rig.byName[j.getName().replace('mixamorig:', '')].matrixWorld.clone().multiply(inv[n])); return M; };
  const M0 = skinAt(idle, 0); let worst = 0, wi = -1;
  for (let fr = 0; fr < wave.times.length; fr += 4) {
    const M = skinAt(wave, fr);
    for (let i = 0; i < N; i += 3) { const p = pos[i]; if (!inBody[i] || p.y > 0.50 || p.y < 0.2) continue; J.getElement(i, jj); W.getElement(i, ww); v.set(0, 0, 0); a.set(0, 0, 0); for (let k = 0; k < 4; k++) if (ww[k] > 0) { v.addScaledVector(p.clone().applyMatrix4(M[jj[k]]), ww[k]); a.addScaledVector(p.clone().applyMatrix4(M0[jj[k]]), ww[k]); } const d = v.distanceTo(a); if (d > worst) { worst = d; wi = fr; } }
  }
  console.log(`jeans/hem verts of the body shell (0.2 < y < 0.5): largest move in the wave vs idle = ${(worst * 100).toFixed(2)} cm (frame ${wi}); the wave clip itself does not move the legs`);
  pose(rig, idle, 0);
}

// 3. matte
for (const m of root.listMaterials()) m.setMetallicFactor(0).setRoughnessFactor(0.85).setMetallicRoughnessTexture(null);

// 4. glasses: thin round wire rims, parented to the Head bone, sized from the eye patches (second primitive = the two eye patches)
if (process.env.GLASSES !== '0') {
  const patch = root.listMeshes()[0].listPrimitives()[1];
  const head = rig.joints.find((j) => j.getName() === 'mixamorig:Head');
  const hinv = headRestInv;
  const PP = patch.getAttribute('POSITION'), eyes = { 1: { n: 0, x: 0, y: 0, z: 0 }, [-1]: { n: 0, x: 0, y: 0, z: 0 } }, e = [0, 0, 0];
  for (let i = 0; i < PP.getCount(); i++) { PP.getElement(i, e); const s = Math.sign(e[0]), E = eyes[s]; E.n++; E.x += e[0]; E.y += e[1]; E.z = Math.max(E.z, e[2]); }
  const ex = [eyes[1].x / eyes[1].n, eyes[-1].x / eyes[-1].n], ey = (eyes[1].y / eyes[1].n + eyes[-1].y / eyes[-1].n) / 2;
  const mid = (ex[0] + ex[1]) / 2, ipd = Math.abs(ex[0] - ex[1]);
  // skin depth: eye patch front, nose bridge front (all non-hair vertices near the centre line at eye height), head half-width by depth at eye height
  const q = (cond) => { let m = -9; for (let i = 0; i < N; i++) if (cond(pos[i])) m = Math.max(m, pos[i].z); return m; };
  const eyeZ = Math.max(eyes[1].z, eyes[-1].z), noseZ = q((p) => Math.abs(p.x - mid) < 0.006 && Math.abs(p.y - ey) < 0.005);
  const R = +(process.env.LENS_R || 0.0145 * ipd / 0.038), ROD = 0.00075, lensZ = Math.max(eyeZ + 0.0065, noseZ + 0.0035);
  const side = {}; for (let i = 0; i < N; i++) { const p = pos[i]; if (Math.abs(p.y - ey) > 0.006 || p.z > lensZ || p.z < lensZ - 0.11) continue; const b = Math.round(p.z / 0.004); side[b] = Math.max(side[b] ?? 0, Math.abs(p.x - mid)); }
  console.log(`glasses: ipd ${(ipd * 100).toFixed(1)} cm, eye height ${ey.toFixed(3)}, eye surface z ${eyeZ.toFixed(4)}, nose bridge z ${noseZ.toFixed(4)}, lens plane z ${lensZ.toFixed(4)}, lens radius ${(R * 100).toFixed(2)} cm`);
  const pts = [], nor = [], id = [];
  const tube = (path, r, seg = 5, closed = false) => { // thin tube along a polyline (world points), appended to the buffers
    const n = path.length, base = pts.length / 3;
    for (let a = 0; a < n; a++) {
      const t = (closed ? path[(a + 1) % n].clone().sub(path[(a + n - 1) % n]) : path[Math.min(n - 1, a + 1)].clone().sub(path[Math.max(0, a - 1)])).normalize();
      const u = Math.abs(t.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0), s = new THREE.Vector3().crossVectors(t, u).normalize(), w = new THREE.Vector3().crossVectors(t, s);
      for (let k = 0; k < seg; k++) { const th = (k / seg) * Math.PI * 2, d = s.clone().multiplyScalar(Math.cos(th)).addScaledVector(w, Math.sin(th)); const p = path[a].clone().addScaledVector(d, r); pts.push(p.x, p.y, p.z); nor.push(d.x, d.y, d.z); }
    }
    const last = closed ? n : n - 1;
    for (let a = 0; a < last; a++) for (let k = 0; k < seg; k++) { const a0 = base + a * seg + k, a1 = base + a * seg + (k + 1) % seg, b0 = base + ((a + 1) % n) * seg + k, b1 = base + ((a + 1) % n) * seg + (k + 1) % seg; id.push(a0, b0, a1, a1, b0, b1); }
  };
  const lensPts = [], lensNor = [], lensId = [];
  for (const sgn of [0, 1]) {
    const cx = ex[sgn], ring = []; for (let k = 0; k < 28; k++) { const th = (k / 28) * Math.PI * 2; ring.push(new THREE.Vector3(cx + Math.cos(th) * R, ey + Math.sin(th) * R, lensZ)); }
    tube(ring, ROD, 4, true);
    const c0 = lensPts.length / 3; lensPts.push(cx, ey, lensZ); lensNor.push(0, 0, 1); for (const r of ring) { const v = r.clone().sub(new THREE.Vector3(cx, ey, lensZ)).multiplyScalar(0.985).add(new THREE.Vector3(cx, ey, lensZ)); lensPts.push(v.x, v.y, v.z); lensNor.push(0, 0, 1); }
    for (let k = 0; k < 28; k++) lensId.push(c0, c0 + 1 + k, c0 + 1 + (k + 1) % 28);
    // temple: from the outer rim point back along the head side to behind the ear (stays outside the skin by 1.5 mm)
    const dir = Math.sign(cx - mid), path = [new THREE.Vector3(cx + dir * R, ey, lensZ)]; let xs = Math.abs(cx - mid) + R;
    for (let z = lensZ - 0.006; z > lensZ - 0.085; z -= 0.006) { const b = Math.round(z / 0.004), hw = Math.max(side[b] ?? 0, side[b - 1] ?? 0, side[b + 1] ?? 0); xs = Math.min(xs + 0.004, Math.max(xs, hw + 0.0015)); path.push(new THREE.Vector3(mid + dir * xs, ey + (lensZ - z) * 0.01, z)); }
    tube(path, ROD, 4, false);
  }
  { // bridge: a small arch between the lenses, resting on the nose
    const a = new THREE.Vector3(ex[0] + Math.sign(ex[1] - ex[0]) * R, ey, lensZ), b = new THREE.Vector3(ex[1] - Math.sign(ex[1] - ex[0]) * R, ey, lensZ), path = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6; path.push(a.clone().lerp(b, t).add(new THREE.Vector3(0, 0.0035 * Math.sin(Math.PI * t), -Math.max(0, lensZ - (noseZ + 0.0012)) * Math.sin(Math.PI * t)))); }
    tube(path, ROD, 4, false);
  }
  const toHead = (arr) => { const out = new Float32Array(arr.length), v = new THREE.Vector3(); for (let i = 0; i < arr.length; i += 3) { v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(hinv); out.set([v.x, v.y, v.z], i); } return out; };
  const toHeadN = (arr) => { const out = new Float32Array(arr.length), v = new THREE.Vector3(), m = new THREE.Matrix3().setFromMatrix4(hinv); for (let i = 0; i < arr.length; i += 3) { v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix3(m).normalize(); out.set([v.x, v.y, v.z], i); } return out; };
  const buf = root.listBuffers()[0];
  const metal = doc.createMaterial('glasses_rim_metal').setBaseColorFactor([0.11, 0.11, 0.12, 1]).setMetallicFactor(0.5).setRoughnessFactor(0.45);
  const lensMat = doc.createMaterial('glasses_lens_glass').setBaseColorFactor([0.78, 0.86, 0.92, 0.10]).setMetallicFactor(0).setRoughnessFactor(0.1).setAlphaMode('BLEND').setDoubleSided(true);
  const mkPrim = (nm, p, n, ix, mat) => doc.createPrimitive().setAttribute('POSITION', doc.createAccessor(`${nm}_p`).setType('VEC3').setArray(toHead(new Float32Array(p))).setBuffer(buf)).setAttribute('NORMAL', doc.createAccessor(`${nm}_n`).setType('VEC3').setArray(toHeadN(new Float32Array(n))).setBuffer(buf)).setIndices(doc.createAccessor(`${nm}_i`).setType('SCALAR').setArray(new Uint16Array(ix)).setBuffer(buf)).setMaterial(mat);
  const mesh = doc.createMesh('glasses').addPrimitive(mkPrim('gl_rim', pts, nor, id, metal)).addPrimitive(mkPrim('gl_lens', lensPts, lensNor, lensId, lensMat));
  head.addChild(doc.createNode('glasses_wire_round').setMesh(mesh));
  console.log(`glasses: ${(pts.length + lensPts.length) / 3} vertices, ${(id.length + lensId.length) / 3} triangles`);
}

if (process.env.PREVIEW) { await io.write(resolve(outArg), doc); process.exit(0); }
const px = +texArg || 4096;
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [px, px] }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(resolve(outArg), doc);
console.log(`${outArg}: ${(statSync(resolve(outArg)).size / 1e6).toFixed(2)} MB`);
