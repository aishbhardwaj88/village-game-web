#!/usr/bin/env node
/**
 * 25 Nov: Gossip Aunty round 2 (owner's fixes), applied to the already finished tvaunty.glb (the output of tools/finish-tvaunty.mjs):
 *   node tools/finish-tvaunty2.mjs <finished-tvaunty.glb> <out.glb>
 * Run it ONCE on the file from commit ec1982a (it refuses a file that already has the phone).
 * 1. bindi 2.5x bigger (node scale about its own centre, still on the skin)
 * 2. pallu / shoulder drape re-weighted to Spine/Spine1/Spine2/Neck/LeftShoulder/Hips (welded-vertex smoothing), no more arm or leg weights
 * 3. every clip rebuilt from the original frames with an arm-clearance offset (arms ~9 degrees off the body so hands stay outside the saree)
 * 4. new ladylike walk (shorter steps, near-line feet, hip sway, shoulder counter-sway, small arm swing, upright), feet pinned by leg IK
 * 5. new walk_phone (same legs, right hand at the ear), phone-talking idle and call, bigger laugh (head back, shoulders shaking, hand to chest, slap thigh, bounce)
 * 6. phone mesh (15 x 7.5 x 0.8 cm) parented to the RIGHT hand bone; scaled to 0 in clips where the hand must be free
 * Model scale: 1 model unit = 1.6 m in game, so 1 cm = 0.00625.
 */
import * as THREE from 'three';
import { textureCompress, prune, meshopt } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptEncoder } from 'meshoptimizer';
import { load, buildRig, clipData, pose, store, rotWorld, wp } from './tvaunty-rig.mjs';
import { resolve } from 'node:path';
import { statSync } from 'node:fs';

const [inArg, outArg] = process.argv.slice(2);
const { io, doc } = await load(resolve(inArg));
const root = doc.getRoot();
if (root.listNodes().some((n) => n.getName() === 'phone_right')) throw new Error('already patched');
const rig = buildRig(doc), B = rig.byName;
const CM = 0.00625, D2R = Math.PI / 180;
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const qa = (axis, deg) => new THREE.Quaternion().setFromAxisAngle(axis, deg * D2R);
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- 1. bindi 2.5x ----------
const bindi = root.listNodes().find((n) => n.getName() === 'bindi_red');
bindi.setScale(bindi.getScale().map((s) => s * 2.5));

// ---------- 2. pallu weights ----------
{
  const prim = root.listMeshes()[0].listPrimitives()[0];
  const P = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), idx = prim.getIndices().getArray();
  const N = P.getCount(), jn = rig.joints.map((j) => j.getName().replace('mixamorig:', '')), ji = Object.fromEntries(jn.map((n, i) => [n, i]));
  const pos = [], e = [0, 0, 0], jj = [0, 0, 0, 0], ww = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) { P.getElement(i, e); pos.push(V(e[0] * 0.5057, e[1] * 0.5057 + 0.4938, e[2] * 0.5057)); } // dequantised bind pose (scale and offset baked into the inverse bind matrices)
  const segD = (p, a, b) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
  const sh = wp(B.LeftArm), el = wp(B.LeftForeArm), ha = wp(B.LeftHand);
  const wts = (y) => { // torso weights by height
    const A = [[0.80, { LeftShoulder: 0.45, Spine2: 0.4, Neck: 0.15 }], [0.72, { Spine2: 0.7, LeftShoulder: 0.15, Spine1: 0.15 }], [0.64, { Spine1: 0.7, Spine2: 0.3 }], [0.56, { Spine: 0.6, Spine1: 0.2, Hips: 0.2 }], [0.46, { Hips: 0.8, Spine: 0.2 }]];
    if (y >= A[0][0]) return A[0][1]; if (y <= A[4][0]) return A[4][1];
    for (let k = 0; k < 4; k++) if (y <= A[k][0] && y >= A[k + 1][0]) { const t = (A[k][0] - y) / (A[k][0] - A[k + 1][0]), o = {}; for (const [b, v] of Object.entries(A[k][1])) o[b] = (o[b] || 0) + v * (1 - t); for (const [b, v] of Object.entries(A[k + 1][1])) o[b] = (o[b] || 0) + v * t; return o; }
  };
  const cur = []; // per vertex Map(boneIdx -> weight)
  const mask = new Uint8Array(N), okDom = new Set(['LeftArm', 'LeftShoulder', 'LeftUpLeg', 'Hips', 'Spine', 'Spine1', 'Spine2']);
  for (let i = 0; i < N; i++) {
    J.getElement(i, jj); W.getElement(i, ww); const m = new Map(); for (let k = 0; k < 4; k++) if (ww[k] > 0) m.set(jj[k], (m.get(jj[k]) || 0) + ww[k]); cur.push(m);
    let b = 0; for (const [k, v] of m) if (v > (m.get(b) || 0)) b = k;
    const p = pos[i], dom = jn[b], dArm = Math.min(segD(p, sh, el), segD(p, el, ha));
    if (!okDom.has(dom) || p.x < 0.03) continue;
    if (p.z < -0.045 && p.y > 0.27 && p.y < 0.83 && dArm > 0.058 && p.x > 0.045) mask[i] = 1; // pallu hanging down the back
    else if (p.y > 0.66 && p.y < 0.83 && (dom === 'LeftArm' || dom === 'LeftShoulder') && dArm > 0.075) mask[i] = 1; // drape over the shoulder
  }
  // weld duplicate vertices (texture seams) so neighbours smooth across seams
  const key = (p) => `${Math.round(p.x * 2e4)},${Math.round(p.y * 2e4)},${Math.round(p.z * 2e4)}`, gid = new Int32Array(N), gmap = new Map(); let G = 0;
  for (let i = 0; i < N; i++) { const k = key(pos[i]); if (!gmap.has(k)) gmap.set(k, G++); gid[i] = gmap.get(k); }
  const nb = Array.from({ length: G }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) for (let a = 0; a < 3; a++) { const g1 = gid[idx[t + a]], g2 = gid[idx[t + (a + 1) % 3]]; if (g1 !== g2) { nb[g1].add(g2); nb[g2].add(g1); } }
  const gm = new Uint8Array(G); for (let i = 0; i < N; i++) if (mask[i]) gm[gid[i]] = 1;
  const grp = Array.from({ length: G }, () => null); // group weights
  for (let i = 0; i < N; i++) if (!grp[gid[i]]) grp[gid[i]] = new Map(cur[i]);
  for (let g = 0; g < G; g++) if (gm[g]) { const y = pos[gmap.size ? 0 : 0] && 0; }
  const gy = new Float32Array(G); for (let i = 0; i < N; i++) gy[gid[i]] = pos[i].y;
  for (let g = 0; g < G; g++) if (gm[g]) { const m = new Map(); for (const [b, v] of Object.entries(wts(gy[g]))) m.set(ji[b], v); grp[g] = m; }
  // smoothing region: masked groups + 3 rings
  const region = new Set(); let front = []; for (let g = 0; g < G; g++) if (gm[g]) { region.add(g); front.push(g); }
  for (let r = 0; r < 3; r++) { const nx = []; for (const g of front) for (const h of nb[g]) if (!region.has(h)) { region.add(h); nx.push(h); } front = nx; }
  for (let it = 0; it < 8; it++) {
    const out = new Map();
    for (const g of region) {
      const acc = new Map(); const add = (m, f) => { for (const [b, v] of m) acc.set(b, (acc.get(b) || 0) + v * f); };
      add(grp[g], 0.5); const ns = [...nb[g]]; for (const h of ns) add(grp[h], 0.5 / ns.length);
      out.set(g, acc);
    }
    for (const [g, m] of out) grp[g] = m;
  }
  let changed = 0;
  for (let i = 0; i < N; i++) {
    if (!region.has(gid[i])) continue;
    const top = [...grp[gid[i]]].sort((a, b) => b[1] - a[1]).slice(0, 4); const s = top.reduce((a, b) => a + b[1], 0);
    while (top.length < 4) top.push([0, 0]);
    J.setElement(i, top.map((t) => t[0])); W.setElement(i, top.map((t) => t[1] / s)); changed++;
  }
  console.log(`pallu: ${mask.reduce((a, b) => a + b, 0)} masked vertices, ${changed} re-weighted`);
}

// ---------- animation toolkit ----------
const HIPS = B.Hips;
const setWorldQuat = (bone, Q) => { bone.parent.getWorldQuaternion(_p); bone.quaternion.copy(_p.invert().multiply(Q)); bone.updateMatrixWorld(true); };
const _p = new THREE.Quaternion(), _w = new THREE.Quaternion();
const wq = (b) => b.getWorldQuaternion(new THREE.Quaternion());
function aim(bone, child, target) { // rotate bone so that bone->child points at target
  const a = wp(bone), c = wp(child);
  const q = new THREE.Quaternion().setFromUnitVectors(c.sub(a).normalize(), target.clone().sub(a).normalize());
  rotWorld(bone, q);
}
function ik(upper, lower, end, T, pole) { // two-bone IK, end ends up on T (or as near as it reaches)
  const S = wp(upper), E = wp(lower), W = wp(end), l1 = S.distanceTo(E), l2 = E.distanceTo(W);
  const dv = T.clone().sub(S), d = Math.max(0.02, Math.min(l1 + l2 - 1e-4, dv.length())), dir = dv.normalize();
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  const perp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const E2 = S.clone().addScaledVector(dir, a).addScaledVector(perp, h);
  aim(upper, lower, E2);
  aim(lower, end, S.clone().addScaledVector(dir, d));
}
// hand frame: bind-pose long axis (wrist -> middle finger) and palm normal; side = +1 for her left hand (palm normal -x), -1 right (+x)
rig.top.updateMatrixWorld(true);
const HAND = {};
for (const side of ['Left', 'Right']) {
  const w0 = wp(B[side + 'Hand']), L0 = wp(B[side + 'HandMiddle1']).sub(w0).normalize(), N0 = V(side === 'Left' ? -1 : 1, 0, 0);
  N0.sub(L0.clone().multiplyScalar(N0.dot(L0))).normalize();
  HAND[side] = { q0: wq(B[side + 'Hand']), L0, N0 };
}
const basis = (L, N) => { const n = N.clone().sub(L.clone().multiplyScalar(N.dot(L))).normalize(), l = L.clone().normalize(); return new THREE.Matrix4().makeBasis(n.clone().cross(l), l, n); }; // x = n x l... right-handed: x = y cross z
function handQuat(side, L, N) { // world quaternion that puts the hand's long axis on L and palm normal on N
  const h = HAND[side], q0 = h.q0;
  const b0 = basis(h.L0, h.N0), b1 = basis(L, N);
  const R = b1.multiply(b0.clone().invert()); // rotates bind-world frame to target frame
  return new THREE.Quaternion().setFromRotationMatrix(R).multiply(q0);
}
const hipsBindY = wp(HIPS).y;
// pin the feet: record world foot targets, then IK legs back onto them
function legIK(targets) {
  for (const s of ['Left', 'Right']) { const t = targets[s]; ik(B[s + 'UpLeg'], B[s + 'Leg'], B[s + 'Foot'], t.pos, V(0, 0.05, 1)); setWorldQuat(B[s + 'Foot'], t.q); }
}
const footTargets = () => { const o = {}; for (const s of ['Left', 'Right']) o[s] = { pos: wp(B[s + 'Foot']), q: wq(B[s + 'Foot']) }; return o; };
const groundMin = () => Math.min(...['Left', 'Right'].flatMap((s) => [wp(B[s + 'Foot']).y, wp(B[s + 'ToeBase']).y]));
// arm clearance: arms ~9 degrees off the body (hands at x ~0.185 + saree skirt width)
const ARM_OUT = 12;
function clearance(deg = ARM_OUT) { rotWorld(B.LeftArm, qa(Z, deg)); rotWorld(B.RightArm, qa(Z, -deg)); }

// phone ear geometry in the head's local frame (bind pose): phone centre against the right ear
rig.top.updateMatrixWorld(true);
const headQ0 = wq(B.Head), headP0 = wp(B.Head);
const earLocal = V(-0.082, 0.862, -0.006).sub(headP0).applyQuaternion(headQ0.clone().invert());
const PHONE_L = V(0, 0.95, 0.31).normalize(), PHONE_N = V(1, 0, 0), WRIST_TO_CENTRE = 0.056, PALM_OFF = 0.005;
function phoneArm(amount = 1, wobble = 0) { // right hand holds the phone to the ear
  const hq = wq(B.Head), ear = earLocal.clone().applyQuaternion(hq).add(wp(B.Head));
  const L = PHONE_L.clone().applyQuaternion(hq), N = PHONE_N.clone().applyQuaternion(hq);
  const wrist = ear.clone().addScaledVector(L, -WRIST_TO_CENTRE).addScaledVector(N, -PALM_OFF);
  wrist.y += wobble;
  if (amount < 1) { const w0 = wp(B.RightHand); wrist.lerp(w0, 1 - amount); }
  ik(B.RightArm, B.RightForeArm, B.RightHand, wrist, V(-0.6, -0.7, 0.25));
  const hqT = handQuat('Right', L, N); if (amount < 1) hqT.slerp(wq(B.RightHand), 1 - amount);
  setWorldQuat(B.RightHand, hqT);
}
// pose of the hand relative to the phone, fixed: used to place the phone mesh in the hand bone's frame (computed once at the ear pose)
function phoneLocal() {
  pose(rig, clipData(doc, 'idle'), 0); clearance();
  phoneArm(1);
  const hq = wq(B.Head), L = PHONE_L.clone().applyQuaternion(hq), N = PHONE_N.clone().applyQuaternion(hq);
  const ear = earLocal.clone().applyQuaternion(hq).add(wp(B.Head));
  const m = basis(L, N); // phone axes: x width, y length (along L), z thickness (screen normal N toward the head)
  const qh = wq(B.Hand ? B.Hand : B.RightHand), hinv = qh.clone().invert();
  const q = new THREE.Quaternion().setFromRotationMatrix(m).premultiply(hinv);
  const p = ear.clone().sub(wp(B.RightHand)).applyQuaternion(hinv);
  return { q, p };
}
const PH = phoneLocal();

// ---------- clip builder ----------
const orig = Object.fromEntries(['walk', 'idle', 'gesture_greet', 'gesture_lookaround', 'gesture_laugh', 'gesture_call'].map((n) => [n, clipData(doc, n)]));
const origFrames = (n) => orig[n].times.length;
const boneNames = Object.keys(B);
const outClips = [];
function addClip(name, frames, phone, frameFn, loopFix = true) {
  const rots = Object.fromEntries(boneNames.map((n) => [n, new Float32Array(frames * 4)]));
  const hipsT = new Float32Array(frames * 3);
  for (let i = 0; i < frames; i++) {
    frameFn(i);
    for (const n of boneNames) { const q = B[n].quaternion; rots[n].set([q.x, q.y, q.z, q.w], i * 4); }
    hipsT.set([HIPS.position.x, HIPS.position.y, HIPS.position.z], i * 3);
  }
  outClips.push({ name, frames, phone, rots, hipsT });
}
const quatEq = (a, b) => 1 - Math.abs(a.dot(b));

// ---------- original-frame clips (greet, lookaround) with arm clearance ----------
for (const n of ['gesture_greet', 'gesture_lookaround']) { const f = origFrames(n); addClip(n, f, false, (i) => { pose(rig, orig[n], i); clearance(); }); }

// ---------- the walk ----------
const WK = orig.walk, WF = WK.times.length; // 57 frames, 2 cycles, last = first
const SWING = 0.62;       // forward/back foot reach kept (shorter steps)
const FOOT_LINE = 0.7;    // sideways foot offset kept (feet closer to a line)
const CLR = +process.env.CLR || 15;
const SWAY = { lat: 0.0085, yaw: 6, roll: 3.2, shYaw: 5 };
const walkSignals = [];
{ // phase signal from the original: d = left foot forward of right foot (normalised); sway = -d/dt
  const d = [];
  for (let i = 0; i < WF - 1; i++) { pose(rig, WK, i); d.push(wp(B.LeftFoot).z - wp(B.RightFoot).z); }
  const m = Math.max(...d.map(Math.abs)); const dn = d.map((x) => x / m); const n = dn.length;
  const dd = dn.map((_, i) => dn[(i + 1) % n] - dn[(i - 1 + n) % n]); const md = Math.max(...dd.map(Math.abs));
  for (let i = 0; i < n; i++) walkSignals.push({ d: dn[i], s: -dd[i] / md });
  walkSignals.push(walkSignals[0]);
}
const walkFrame = (phone) => (i) => {
  pose(rig, WK, i); const sg = walkSignals[i];
  // 1. shorter steps, feet nearer a line: the foot targets keep their height (grounded stays grounded) but their forward reach is scaled about the hips
  const hp = wp(HIPS), tg = {};
  for (const s of ['Left', 'Right']) { const f = wp(B[s + 'Foot']); tg[s] = { pos: V(hp.x + (f.x - hp.x) * FOOT_LINE, f.y, hp.z + (f.z - hp.z) * SWING), q: wq(B[s + 'Foot']) }; }
  legIK(tg);
  const ft = footTargets();
  // 3. matakna: hips side shift + yaw + roll, chest counter-sway
  const sw = V(SWAY.lat * sg.s, 0, 0); HIPS.position.add(sw.applyQuaternion(HIPS.parent.getWorldQuaternion(new THREE.Quaternion()).invert())); HIPS.updateMatrixWorld(true);
  rotWorld(HIPS, qa(Y, -SWAY.yaw * sg.d).multiply(qa(Z, SWAY.roll * sg.s)));
  rotWorld(B.Spine1, qa(Y, (SWAY.yaw * 0.5 + SWAY.shYaw) * sg.d).multiply(qa(Z, -SWAY.roll * 0.8 * sg.s)));
  rotWorld(B.Spine2, qa(X, -3)); rotWorld(B.Spine, qa(X, -2)); // upright, chest lifted
  legIK(ft);
  // 4. arms: small soft swing, held close but clear of the saree
  const swing = 0.36;
  for (const s of ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm']) {
    const o = WK.ch[s].rotation, cur = new THREE.Quaternion(o.arr[i * 4], o.arr[i * 4 + 1], o.arr[i * 4 + 2], o.arr[i * 4 + 3]);
    const mean = meanQ.get(s); B[s].quaternion.copy(mean.clone().slerp(cur, swing)); B[s].updateMatrixWorld(true);
  }
  rotWorld(B.LeftForeArm, qa(X, -14)); rotWorld(B.RightForeArm, qa(X, -14)); // soft elbows
  clearance(CLR);
  rotWorld(B.LeftHand, qa(X, -8)); rotWorld(B.RightHand, qa(X, -8));
  rotWorld(B.Head, qa(X, 0));
  if (phone) phoneArm(1, 0.004 * Math.sin(2 * Math.PI * i / 28));
};
const meanQ = new Map();
for (const s of ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm']) { // mean local rotation over the cycle
  const o = WK.ch[s].rotation, acc = new THREE.Quaternion(0, 0, 0, 0), q0 = new THREE.Quaternion(o.arr[0], o.arr[1], o.arr[2], o.arr[3]);
  for (let i = 0; i < WF - 1; i++) { const q = new THREE.Quaternion(o.arr[i * 4], o.arr[i * 4 + 1], o.arr[i * 4 + 2], o.arr[i * 4 + 3]); if (q.dot(q0) < 0) q.set(-q.x, -q.y, -q.z, -q.w); acc.set(acc.x + q.x, acc.y + q.y, acc.z + q.z, acc.w + q.w); }
  meanQ.set(s, acc.normalize());
}
addClip('walk', WF, false, walkFrame(false));
addClip('walk_phone', WF, true, walkFrame(true));

// ---------- idle (phone talking) and call ----------
const ID = orig.idle, IF = ID.times.length;
const bump = (t, c, w) => { const x = (t - c) / w; return x > -1 && x < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * x) : 0; }; // smooth bell, width w each side
function talkFrame(dur, gestures, nodAmp, lively) {
  return (i) => {
    const t = (i / (IF - 1)) * dur, u = i / (IF - 1);
    pose(rig, ID, i % (IF - 1)); clearance();
    const ft = footTargets();
    if (lively) { HIPS.position.add(V(0.006 * Math.sin(2 * Math.PI * u * 3), 0, 0).applyQuaternion(HIPS.parent.getWorldQuaternion(new THREE.Quaternion()).invert())); HIPS.updateMatrixWorld(true); rotWorld(HIPS, qa(Z, 2 * Math.sin(2 * Math.PI * u * 3))); }
    // free left hand gestures now and then
    let g = 0, gs = 0; for (const [c, w] of gestures) { const b = bump(t, c, w); g = Math.max(g, b); gs += b * Math.sin(2 * Math.PI * (t - c) * 2.2); }
    rotWorld(B.LeftArm, qa(Z, 6 * g)); rotWorld(B.LeftForeArm, qa(X, -62 * g)); rotWorld(B.LeftHand, qa(Y, 20 * gs).multiply(qa(X, -10 * g)));
    // head nods and a slight turn
    const nod = nodAmp * (Math.sin(2 * Math.PI * u * (lively ? 9 : 6)) * (0.5 + 0.5 * Math.sin(2 * Math.PI * u * 3)));
    rotWorld(B.Head, qa(X, nod)); rotWorld(B.Head, qa(Y, (lively ? 7 : 4) * Math.sin(2 * Math.PI * u * 2)));
    rotWorld(B.Neck, qa(Z, 2.5));
    if (lively) legIK(ft);
    phoneArm(1, 0.003 * Math.sin(2 * Math.PI * u * 5));
  };
}
const IDLE_DUR = (IF - 1) / 24;
addClip('idle', IF, true, talkFrame(IDLE_DUR, [[2.6, 1.2], [8.2, 1.4], [12.6, 1.0]], 4.5, false));
addClip('gesture_call', IF, true, talkFrame(IDLE_DUR, [[1.6, 1.0], [4.4, 1.2], [7.2, 1.0], [10.0, 1.2], [13.0, 1.0]], 6.5, true));

// ---------- loud laugh ----------
{
  const LF = 144, LD = (LF - 1) / 24;
  addClip('gesture_laugh', LF, false, (i) => {
    const t = (i / (LF - 1)) * LD, u = i / (LF - 1);
    pose(rig, ID, 0); clearance(6);
    const e = smooth(t / 0.45) * smooth((LD - t) / 0.7);          // fade in/out of the whole laugh
    const burst = 0.65 + 0.35 * Math.sin(2 * Math.PI * (t / LD) * 4); // ha-ha-ha waves
    const k = e * burst, s6 = Math.sin(2 * Math.PI * 6.5 * t), s3 = Math.sin(2 * Math.PI * 3.25 * t);
    const ft = footTargets();
    // bounce: knees give, body drops and rises with the laugh
    HIPS.position.add(V(0, -0.016 * e - 0.014 * k * (0.5 + 0.5 * s3), 0).applyQuaternion(HIPS.parent.getWorldQuaternion(new THREE.Quaternion()).invert())); HIPS.updateMatrixWorld(true);
    rotWorld(HIPS, qa(Z, 2.2 * k * s3));
    rotWorld(B.Spine, qa(X, -5 * e)); rotWorld(B.Spine1, qa(X, -6 * e + 2.5 * k * s3)); rotWorld(B.Spine2, qa(X, -4 * e + 1.5 * k * s6));
    rotWorld(B.LeftShoulder, qa(Z, 5 * k * s6)); rotWorld(B.RightShoulder, qa(Z, -5 * k * s6)); // shoulders shaking
    rotWorld(B.Spine2, qa(Z, 2 * k * s6));
    rotWorld(B.Neck, qa(X, -11 * e)); rotWorld(B.Head, qa(X, -24 * e + 3.5 * k * s6)); rotWorld(B.Head, qa(Z, 5 * k * Math.sin(2 * Math.PI * 1.6 * t)));
    legIK(ft);
    // right hand on the chest (trembling), left hand slaps the thigh in time
    const sq = wq(B.Spine2), sp = wp(B.Spine2);
    const chest = V(-0.035, 0.015, 0.105).applyQuaternion(sq).add(sp);
    const hqR = handQuat('Right', V(1, -0.2, 0).applyQuaternion(sq), V(0, 0.1, -1).applyQuaternion(sq));
    const wr = chest.clone().addScaledVector(V(1, -0.2, 0).applyQuaternion(sq).normalize(), -0.04); wr.y += 0.004 * s6;
    const rCur = [wq(B.RightArm), wq(B.RightForeArm), wq(B.RightHand)];
    ik(B.RightArm, B.RightForeArm, B.RightHand, wr, V(-0.5, -0.8, -0.1)); setWorldQuat(B.RightHand, hqR);
    const slap = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.25 * t - 1); // 0 = hand on the thigh, 1 = lifted
    const hipsP = wp(HIPS), hq = wq(HIPS);
    const thigh = V(0.125, -0.07 + 0.045 * slap, 0.12).applyQuaternion(wq(B.Spine)).add(hipsP);
    ik(B.LeftArm, B.LeftForeArm, B.LeftHand, thigh, V(0.6, -0.7, -0.3));
    setWorldQuat(B.LeftHand, handQuat('Left', V(0, -0.35, 0.9), V(0, -0.9, -0.3)));
  });
}

// ---------- write the animations ----------
for (const a of root.listAnimations()) a.dispose();
const buf = root.listBuffers()[0];
const phoneNode = (() => { const n = doc.createNode('phone_right'); n.setTranslation(PH.p.toArray()); n.setRotation(PH.q.toArray()); return n; })();
rig.map.forEach((o, j) => { if (j.getName() === 'mixamorig:RightHand') j.addChild(phoneNode); });
const f32 = (name, arr, type) => doc.createAccessor(name).setType(type).setArray(arr).setBuffer(buf);
for (const c of outClips) {
  const anim = doc.createAnimation(c.name), times = new Float32Array(c.frames); for (let i = 0; i < c.frames; i++) times[i] = i / 24;
  const T = f32(`${c.name}_t`, times, 'SCALAR');
  const mk = (node, path, out, input = T, type) => { const s = doc.createAnimationSampler().setInput(input).setOutput(out).setInterpolation('LINEAR'); anim.addSampler(s); anim.addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(s)); };
  const jointNode = Object.fromEntries(rig.joints.map((j) => [j.getName().replace('mixamorig:', ''), j]));
  const T2 = f32(`${c.name}_t2`, new Float32Array([0, times[c.frames - 1]]), 'SCALAR');
  for (const n of boneNames) {
    mk(jointNode[n], 'rotation', f32(`${c.name}_${n}_r`, c.rots[n], 'VEC4'));
    if (n === 'Hips') mk(jointNode[n], 'translation', f32(`${c.name}_hips_t`, c.hipsT, 'VEC3'));
    else { const p = jointNode[n].getTranslation(); mk(jointNode[n], 'translation', f32(`${c.name}_${n}_p`, new Float32Array([...p, ...p]), 'VEC3'), T2); }
    const sc = jointNode[n].getScale(); mk(jointNode[n], 'scale', f32(`${c.name}_${n}_s`, new Float32Array([...sc, ...sc]), 'VEC3'), T2);
  }
  const v = c.phone ? 1 : 0;
  mk(phoneNode, 'scale', f32(`${c.name}_phone_s`, new Float32Array([v, v, v, v, v, v]), 'VEC3'), T2);
}

// ---------- the phone ----------
{
  const body = doc.createMaterial('phone_body').setBaseColorFactor([0.025, 0.027, 0.032, 1]).setMetallicFactor(0.6).setRoughnessFactor(0.35);
  const glass = doc.createMaterial('phone_screen').setBaseColorFactor([0.02, 0.03, 0.06, 1]).setEmissiveFactor([0.03, 0.06, 0.14]).setMetallicFactor(0).setRoughnessFactor(0.15);
  const box = (w, h, d, oz) => { // centred box, 24 verts
    const P = [], Nn = [], I = [], hw = w / 2, hh = h / 2, hd = d / 2;
    const faces = [[[0, 0, 1], [-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], [[0, 0, -1], [hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]], [[1, 0, 0], [hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]], [[-1, 0, 0], [-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], [[0, 1, 0], [-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]], [[0, -1, 0], [-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]]];
    faces.forEach(([n, ...c], f) => { for (const p of c) { P.push(p[0], p[1], p[2] + oz); Nn.push(...n); } I.push(f * 4, f * 4 + 1, f * 4 + 2, f * 4, f * 4 + 2, f * 4 + 3); });
    return { P: new Float32Array(P), N: new Float32Array(Nn), I: new Uint16Array(I) };
  };
  const mkPrim = (g, m, nm) => doc.createPrimitive().setAttribute('POSITION', f32(`${nm}_p`, g.P, 'VEC3')).setAttribute('NORMAL', f32(`${nm}_n`, g.N, 'VEC3')).setIndices(doc.createAccessor(`${nm}_i`).setType('SCALAR').setArray(g.I).setBuffer(buf)).setMaterial(m);
  const W_ = 7.5 * CM, H_ = 15 * CM, D_ = 0.8 * CM;
  phoneNode.setMesh(doc.createMesh('phone').addPrimitive(mkPrim(box(W_, H_, D_, 0), body, 'phone_body')).addPrimitive(mkPrim(box(W_ * 0.9, H_ * 0.93, 0.05 * CM, D_ / 2 + 0.01 * CM), glass, 'phone_screen')));
}

if (process.env.PREVIEW) { for (const e of root.listExtensionsUsed()) if (e.extensionName === 'EXT_meshopt_compression') e.dispose(); await io.write(resolve(outArg), doc); process.exit(0); }
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [4096, 4096] }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
await io.write(resolve(outArg), doc);
console.log(`${outArg}: ${(statSync(resolve(outArg)).size / 1e6).toFixed(2)} MB`);
