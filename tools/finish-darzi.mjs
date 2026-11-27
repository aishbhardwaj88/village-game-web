#!/usr/bin/env node
/**
 * 26 Nov: finishing recipe for the Darzi (tailor), Smart Mesh raw from Tripo, 6 clips. Same pattern as finish-cyberboy.mjs, plus a tape measure and a wrist thread.
 *   node tools/finish-darzi.mjs <face-passed.glb> <out.glb> [texPx=4096]
 * Face pass first (headless Blender): head render centre x 0.002, z 0.915, 0.30 m / 600 px; eyes (243,306) (337,306), mouth corners (240,396) (346,396):
 *   echo "0.002 0.915 0.30" > dz_cam.txt ; python3 tools/face_keys.py raw.glb dz 243,306,337,306 240,396,346,396   (-> dz_keys.glb)
 * DISABLED 27 Nov (owner rule 22 Nov, no painted/patched eyes on Tripo models; eye_patch.py is NOT run, use tools/rebuild-new-chars.sh):   echo "0.002 0.915 0.30 600" > darzi_head.txt ; python3 tools/eye_patch.py -- dz_keys.glb dz_eyes.glb darzi '[[243,306],[337,306]]'
 * Weight fix: kurta below the vest hem (y < 0.47) and the churidar = Hips / UpLeg / Leg / Foot only (left/right by x), no arm or hand weight at all.
 * Small items added here (owner rule): round wire glasses on the Head bone; a yellow tailor's tape over the shoulders and down the chest (skinned: weights copied
 * from the nearest vest vertex, arm-chain weights stripped, so it never follows the arms); the thin cord on the right wrist (weights from the forearm).
 * Face pass first (headless Blender), on the raw file, eyes/mouth picked from a head render (600 px = 0.30 m, centre x 0.002, z 0.915):
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
if (!inArg || !outArg) { console.error('usage: node tools/finish-darzi.mjs <in.glb> <out.glb> [texPx]'); process.exit(1); }
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
const restHand = bp('RightHand').clone(), restFore = bp('RightForeArm').clone(); // bind pose, before the motion test poses the rig
const leftSign = Math.sign(bp('LeftUpLeg').x) || 1;
const prim = root.listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), N = P.getCount();
const pos = []; { const e = [0, 0, 0]; for (let i = 0; i < N; i++) { P.getElement(i, e); pos.push(new THREE.Vector3(e[0], e[1], e[2])); } }
const ARM = /^(Left|Right)(Shoulder|Arm|ForeArm|Hand)/, HANDISH = /^(Left|Right)(ForeArm|Hand)/, LOWER = /^(Hips|(Left|Right)(UpLeg|Leg|Foot|ToeBase|Toe_End))$/;
const KL = +(process.env.KURTA_LEG ?? 0.75), ARMPIT_Y = 0.66; // kurta hem follows the legs at 75 % (rest on Hips) so it does not shear between the legs in the run
const inBody = new Uint8Array(N), armVert = new Uint8Array(N), headVert = new Uint8Array(N); // arm shells (forearm + hand), the head shell
const KNEE = bp('LeftLeg').y, HIP = bp('LeftUpLeg').y, ANKLE = bp('LeftFoot').y;
{
  // shells (connected pieces). Lower garments = the kurta shell (y 0.35-0.52), both churidar leg shells and the sandals: leg bones only.
  // Upper = the vest + shirt-sleeve shell: torso part (|x| < 0.10) loses hand/forearm weight, the sleeves keep theirs (rolled cuffs follow the forearm).
  const idx = prim.getIndices().getArray(), key = (p) => `${Math.round(p.x * 2e4)},${Math.round(p.y * 2e4)},${Math.round(p.z * 2e4)}`, gid = new Int32Array(N), gm = new Map(); let G = 0;
  for (let i = 0; i < N; i++) { const k = key(pos[i]); if (!gm.has(k)) gm.set(k, G++); gid[i] = gm.get(k); }
  const par = Array.from({ length: G }, (_, i) => i), f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let t = 0; t < idx.length; t += 3) { const a = f(gid[idx[t]]); par[f(gid[idx[t + 1]])] = a; par[f(gid[idx[t + 2]])] = a; }
  const sh = new Map();
  for (let i = 0; i < N; i++) { const r = f(gid[i]); let s = sh.get(r); if (!s) { s = { n: 0, lo: 9, hi: -9, xl: 9, xh: -9 }; sh.set(r, s); } s.n++; s.lo = Math.min(s.lo, pos[i].y); s.hi = Math.max(s.hi, pos[i].y); s.xl = Math.min(s.xl, pos[i].x); s.xh = Math.max(s.xh, pos[i].x); }
  const isLowerShell = (s) => s.hi < 0.55 && s.lo < 0.5 && !(s.lo > 0.3 && Math.abs((s.xl + s.xh) / 2) > 0.12);
  let nb = 0, nUp = 0;
  const isKurta = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const s = sh.get(f(gid[i])); if (s.lo > 0.3 && s.hi < 0.7 && Math.abs((s.xl + s.xh) / 2) > 0.12) armVert[i] = 1; if (s.lo > 0.7 && s.hi > 0.95) headVert[i] = 1; }
  for (let i = 0; i < N; i++) { const r = f(gid[i]), s = sh.get(r); if (isLowerShell(s)) { inBody[i] = 1; nb++; if (s.lo > 0.3) isKurta[i] = 1; } else if (s.n > 4000 && s.lo > 0.4 && s.lo < 0.55 && s.hi > 0.8 && Math.abs(pos[i].x) < 0.10) { inBody[i] = 2; nUp++; } }
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
    if (inBody[i] === 1) {
      // jeans, tee hem and hips: leg / hips bones only, the right side's bones (a left bone only for a vertex left of centre)
      const keep = {}; let s = 0;
      for (const [b, v] of Object.entries(cur)) { if (!LOWER.test(b)) continue; if (Math.abs(p.x) > 0.012 && ((/^Left/.test(b) ? 1 : /^Right/.test(b) ? -1 : 0) * leftSign * Math.sign(p.x) < 0)) continue; keep[b] = v; s += v; }
      if (s >= 0.6) { out = keep; nLow++; } else { out = posW(p); nPos++; }
      if (Object.keys(cur).some((b) => ARM.test(b) || /Hand/.test(b))) dropped++;
      if (isKurta[i] && KL < 1) { let mv = 0; for (const b of Object.keys(out)) if (b !== 'Hips') { mv += out[b] * (1 - KL); out[b] *= KL; } out.Hips = (out.Hips || 0) + mv; }
    } else {
      const keep = {}; let s = 0;
      for (const [b, v] of Object.entries(cur)) { if (HANDISH.test(b) || (p.y < ARMPIT_Y && ARM.test(b))) continue; keep[b] = v; s += v; }
      if (s < 0.3) { out = { Spine1: 1 }; nStrip++; } else { out = keep; if (s < 0.999) nStrip++; }
      if (p.y < 0.56) nHem++;
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
    for (let i = 0; i < N; i += 3) { const p = pos[i]; if (!inBody[i] || p.y > 0.52 || p.y < 0.2) continue; J.getElement(i, jj); W.getElement(i, ww); v.set(0, 0, 0); a.set(0, 0, 0); for (let k = 0; k < 4; k++) if (ww[k] > 0) { v.addScaledVector(p.clone().applyMatrix4(M[jj[k]]), ww[k]); a.addScaledVector(p.clone().applyMatrix4(M0[jj[k]]), ww[k]); } const d = v.distanceTo(a); if (d > worst) { worst = d; wi = fr; } }
  }
  console.log(`jeans/hem verts of the body shell (0.2 < y < 0.5): largest move in the wave vs idle = ${(worst * 100).toFixed(2)} cm (frame ${wi}); the wave clip itself does not move the legs`);
  pose(rig, idle, 0);
}

// 3. matte
for (const m of root.listMaterials()) m.setMetallicFactor(0).setRoughnessFactor(0.85).setMetallicRoughnessTexture(null);

// 4. glasses: thin round wire rims, parented to the Head bone, sized from the eye patches (second primitive = the two eye patches)
if (process.env.GLASSES !== '0') {
  const patch = root.listMeshes()[0].listPrimitives()[1] || null; // 27 Nov: no eye-patch primitive any more, the eye points come from Tripo's own eyelid vertices (the ones the blink key moves)
  const head = rig.joints.find((j) => j.getName() === 'mixamorig:Head');
  const hinv = headRestInv;
  const P0 = root.listMeshes()[0].listPrimitives()[0], BT = P0.listTargets()[0] && P0.listTargets()[0].getAttribute('POSITION'), PP = patch ? patch.getAttribute('POSITION') : P0.getAttribute('POSITION'), eyes = { 1: { n: 0, x: 0, y: 0, z: 0 }, [-1]: { n: 0, x: 0, y: 0, z: 0 } }, e = [0, 0, 0];
  const dd = [0, 0, 0]; for (let i = 0; i < PP.getCount(); i++) { PP.getElement(i, e); if (!patch) { BT.getElement(i, dd); if (Math.hypot(dd[0], dd[1], dd[2]) < 1e-4) continue; } const s = Math.sign(e[0]), E = eyes[s]; E.n++; E.x += e[0]; E.y += e[1]; E.z = Math.max(E.z, e[2]); }
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

// 5. tape measure + wrist cord: extra skinned primitives on the same mesh (weights copied from the nearest cloth / forearm vertex, arm chain stripped on the tape)
if (process.env.TAPE !== '0') {
  const near = (p, ok) => { let b = -1, bd = 9; for (let i = 0; i < N; i++) { if (!ok(i)) continue; const d = pos[i].distanceToSquared(p); if (d < bd) { bd = d; b = i; } } return b; };
  const jj2 = [0, 0, 0, 0], ww2 = [0, 0, 0, 0];
  const weightsFrom = (i, stripArms) => {
    J.getElement(i, jj2); W.getElement(i, ww2); const o = {}; for (let k = 0; k < 4; k++) if (ww2[k] > 0) { const b = jn[jj2[k]]; if (stripArms && ARM.test(b)) continue; o[b] = (o[b] || 0) + ww2[k]; }
    let tot = Object.values(o).reduce((a, b) => a + b, 0); if (tot < 0.3) return { Spine2: 1 };
    const top = Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 4); tot = top.reduce((a, b) => a + b[1], 0);
    const j = [0, 0, 0, 0], w = [0, 0, 0, 0]; top.forEach(([b, v], k) => { j[k] = ji[b]; w[k] = v / tot; }); return { j, w };
  };
  const sample = (cond, pick, init) => { let m = init; for (let i = 0; i < N; i++) if (cond(pos[i])) m = pick(m, pos[i]); return m; };
  const CL = 0.0035, HW = 0.0075, XT = 0.066, XF = 0.052, XC = 0.002; // clearance off the cloth, half width of the tape, x of the strand over the shoulder / down the chest
  const topY = (x, z) => sample((p) => Math.abs(p.x - x) < 0.012 && Math.abs(p.z - z) < 0.006 && p.y < 0.86, (m, p) => Math.max(m, p.y), -9);
  const frontZ = (x, y) => sample((p) => Math.abs(p.x - x) < 0.012 && Math.abs(p.y - y) < 0.008 && p.y < 0.80, (m, p) => Math.max(m, p.z), -9);
  const backZ = (x, y) => sample((p) => Math.abs(p.x - x) < 0.01 && Math.abs(p.y - y) < 0.01 && p.y < 0.82, (m, p) => Math.min(m, p.z), 9);
  const strands = [];
  for (const sg of [1, -1]) {
    const pts = [], z0 = -0.082;
    for (let z = z0; z <= 0.040; z += 0.012) { const t = (z - z0) / (0.040 - z0), x = sg * (0.040 + (XT - 0.040) * Math.sin(Math.PI * Math.min(1, t * 1.6) / 2)); const y = topY(x, z); if (y > 0) pts.push(new THREE.Vector3(x, y + CL, z)); }
    for (let y = 0.80; y >= 0.395; y -= 0.025) { const t = Math.min(1, (0.80 - y) / 0.12), x = sg * (XT + (XF - XT) * t), z = frontZ(x, y); if (z > -1 && (pts.length === 0 || y < pts[pts.length - 1].y - 0.004)) pts.push(new THREE.Vector3(x, y, z + CL)); }
    strands.push(pts);
  }
  const back = []; for (let x = strands[1][0].x; x <= strands[0][0].x + 1e-6; x += 0.012) { const z = backZ(x, strands[0][0].y); back.push(new THREE.Vector3(x, strands[0][0].y, z - CL)); }
  strands.push(back);
  const tp = [], tn = [], tuv = [], tix = [], tj = [], tw = [];
  for (const path of strands) {
    const base = tp.length / 3; let len = 0;
    for (let a = 0; a < path.length; a++) {
      const t = path[Math.min(path.length - 1, a + 1)].clone().sub(path[Math.max(0, a - 1)]).normalize(), p = path[a];
      const c = new THREE.Vector3(XC, Math.min(p.y, 0.72), 0), o = p.clone().sub(c).normalize(), w = new THREE.Vector3().crossVectors(o, t).normalize(), n = new THREE.Vector3().crossVectors(t, w).normalize();
      if (a) len += p.distanceTo(path[a - 1]);
      for (const sd of [-1, 1]) { const q = p.clone().addScaledVector(w, sd * HW); tp.push(q.x, q.y, q.z); tn.push(n.x, n.y, n.z); tuv.push(sd < 0 ? 0 : 1, len / 0.09); }
      const wt = weightsFrom(near(p, (i) => !armVert[i] && !headVert[i] && pos[i].y < 0.86), true);
      for (let k = 0; k < 2; k++) { const j = wt.j || [ji.Spine2, 0, 0, 0], w2 = wt.w || [1, 0, 0, 0]; tj.push(...j); tw.push(...w2); }
      if (a) { const b0 = base + (a - 1) * 2; tix.push(b0, b0 + 1, b0 + 2, b0 + 1, b0 + 3, b0 + 2); }
    }
  }
  // wrist cord: three thin turns on the RIGHT wrist (character's right = -x here), just above the hand
  const wp = [], wn = [], wix = [], wj = [], ww3 = [];
  { const hand = restHand, fore = restFore, d = hand.clone().sub(fore).normalize();
    const u = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 0, 1)).normalize(), v = new THREE.Vector3().crossVectors(d, u).normalize();
    const c0 = hand.clone().addScaledVector(d, -0.030), rad = []; // slab of the forearm around the first turn: median distance from the axis
    for (let i = 0; i < N; i++) if (armVert[i] && pos[i].x < 0) { const r = pos[i].clone().sub(c0), h = r.dot(d); if (Math.abs(h) < 0.02) { rad.push(r.addScaledVector(d, -h).length()); } }
    rad.sort((a, b) => a - b); const R0 = (rad[Math.floor(rad.length * 0.5)] || 0.02) + 0.0008; console.log('radial pct', [0.1, 0.5, 0.9].map((q) => (rad[Math.floor(rad.length * q)] * 100).toFixed(2)).join(' '), 'n', rad.length);
    console.log(`wrist cord: hand ${hand.toArray().map((x) => x.toFixed(3))}, forearm radius ${(R0 * 100).toFixed(2)} cm`);
    for (let r = 0; r < 3; r++) {
      const c = c0.clone().addScaledVector(d, r * 0.0052 - 0.004), base = wp.length / 3, SEG = 14, TS = 4, mr = 0.0028;
      for (let a = 0; a < SEG; a++) for (let b = 0; b < TS; b++) {
        const th = (a / SEG) * Math.PI * 2, ph = (b / TS) * Math.PI * 2, rad2 = u.clone().multiplyScalar(Math.cos(th)).addScaledVector(v, Math.sin(th)), nn = rad2.clone().multiplyScalar(Math.cos(ph)).addScaledVector(d, Math.sin(ph));
        const q = c.clone().addScaledVector(rad2, R0 + mr * 0.8 + mr * Math.cos(ph)).addScaledVector(d, mr * Math.sin(ph) + 0.0015 * Math.sin(th * 2 + r)); wp.push(q.x, q.y, q.z); wn.push(nn.x, nn.y, nn.z);
        const wt = weightsFrom(near(q, (i) => armVert[i] && pos[i].x < 0), false); wj.push(...(wt.j || [ji.RightForeArm, 0, 0, 0])); ww3.push(...(wt.w || [1, 0, 0, 0]));
        const a1 = (a + 1) % SEG, b1 = (b + 1) % TS; wix.push(base + a * TS + b, base + a1 * TS + b, base + a * TS + b1, base + a1 * TS + b, base + a1 * TS + b1, base + a * TS + b1);
      }
    }
  }
  // tape texture: yellow with black cm ticks and numbers
  const TW = 64, TH = 512; let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}"><rect width="${TW}" height="${TH}" fill="#e9c22a"/><rect x="0" width="3" height="${TH}" fill="#2a2412"/><rect x="${TW - 3}" width="3" height="${TH}" fill="#2a2412"/>`;
  for (let k = 0; k < 64; k++) { const y = k * 8 + 2, long = k % 10 === 0 ? 30 : k % 5 === 0 ? 20 : 11; svg += `<rect x="4" y="${y}" width="${long}" height="1.6" fill="#1b170a"/>`; if (k % 10 === 0 && k) svg += `<text x="${TW - 26}" y="${y + 9}" font-size="12" font-family="sans-serif" font-weight="700" fill="#1b170a">${k}</text>`; }
  const tapePng = await sharp(Buffer.from(svg + '</svg>')).png().toBuffer();
  const buf = root.listBuffers()[0], mesh0 = root.listMeshes()[0];
  const tex = doc.createTexture('tailor_tape').setImage(tapePng).setMimeType('image/png');
  const tapeMat = doc.createMaterial('tailor_tape').setBaseColorTexture(tex).setMetallicFactor(0).setRoughnessFactor(0.6).setDoubleSided(true);
  const cordMat = doc.createMaterial('wrist_cord').setBaseColorFactor([0.80, 0.70, 0.52, 1]).setMetallicFactor(0).setRoughnessFactor(0.9);
  const acc = (nm, type, arr) => doc.createAccessor(nm).setType(type).setArray(arr).setBuffer(buf);
  const mk = (nm, p, n, uv, ix, j, w, mat) => { const pr = doc.createPrimitive().setAttribute('POSITION', acc(`${nm}_p`, 'VEC3', new Float32Array(p))).setAttribute('NORMAL', acc(`${nm}_n`, 'VEC3', new Float32Array(n))).setAttribute('JOINTS_0', acc(`${nm}_j`, 'VEC4', new Uint16Array(j))).setAttribute('WEIGHTS_0', acc(`${nm}_w`, 'VEC4', new Float32Array(w))).setIndices(acc(`${nm}_i`, 'SCALAR', new Uint16Array(ix))).setMaterial(mat); if (uv) pr.setAttribute('TEXCOORD_0', acc(`${nm}_uv`, 'VEC2', new Float32Array(uv))); return pr; };
  mesh0.addPrimitive(mk('tape', tp, tn, tuv, tix, tj, tw, tapeMat)).addPrimitive(mk('cord', wp, wn, null, wix, wj, ww3, cordMat));
  console.log(`tape: ${tp.length / 3} vertices, ${tix.length / 3} triangles (strands ${strands.map((s) => s.length).join('/')}); cord ${wp.length / 3} vertices`);
}

if (process.env.PREVIEW) { await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 80, resize: [1024, 1024] })); await io.write(resolve(outArg), doc); process.exit(0); }
const px = +texArg || 4096;
await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [px, px] }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(resolve(outArg), doc);
console.log(`${outArg}: ${(statSync(resolve(outArg)).size / 1e6).toFixed(2)} MB`);
