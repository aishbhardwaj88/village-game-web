import * as THREE from 'three';
import { getTiledMaterial } from './materials.js';
import { mapRoadLines } from './mapRoads.js';
import { CANOPIES } from './trees.js';
import { drawBilingual } from './signPaint.js';
import { settlingReleased, lazyDue } from './standOn.js';
import { followGround } from './moverGround.js';

/**
 * The rest of "things that happen to the cyclist" (docs/VILLAGE_VOCABULARY.md section 8), all pure visuals, no colliders:
 *   tractor    - ride the highway and, once in a while, a tractor with a loaded trailer comes up behind, honks twice and
 *                overtakes in the left lane, then carries on. Painted tailboard: Hindi bold on top, English beneath.
 *   kid        - ride any road at speed and a kid (capsule stand-in) darts in from the verge ahead, runs alongside for
 *                about 5 s, then slows and drops off behind.
 *   kite fight - two kites fight over a field within sight; one is cut, drifts downwind and snags in the nearest tree
 *                canopy, where it stays caught for a while. (No strings drawn.)
 *
 * Draw calls (2): ONE dynamic vertex-coloured mesh holding tractor, trailer, kid and both kites (library 'tin' material,
 * vertices rewritten on the CPU each active frame, ~2k verts) + ONE canvas-painted tailboard plane.
 * Driven from the scene's onBeforeRender chain, so main.js needs only the one call line.
 */

const TAU = Math.PI * 2;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- geometry helpers: parts are lists of coloured, non-indexed primitives ----------
function Part() { return { pos: [], nor: [], col: [], uv: [] }; }
function addGeo(part, g, color, tf) {
  g = g.index ? g.toNonIndexed() : g;
  if (tf) g.applyMatrix4(tf);
  const c = new THREE.Color(color), n = g.attributes.position.count;
  const uv = g.attributes.uv;
  for (let i = 0; i < n; i++) {
    part.pos.push(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i));
    part.nor.push(g.attributes.normal.getX(i), g.attributes.normal.getY(i), g.attributes.normal.getZ(i));
    part.col.push(c.r, c.g, c.b);
    part.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
  }
}
const T = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
const box = (p, w, h, d, x, y, z, c) => addGeo(p, new THREE.BoxGeometry(w, h, d), c, T(x, y, z));
const wheel = (p, r, wd, x, y, z, c) => addGeo(p, new THREE.CylinderGeometry(r, r, wd, 14), c, T(x, y, z, 0, 0, Math.PI / 2));

function tractorPart() {
  const p = Part(); // forward is +z, origin on the ground under the rear axle
  const RED = 0xa8322a, DARK = 0x1c1b19, GREY = 0x6b6e70, BLUE = 0x2f5a8a, WOOD = 0x8a6a42;
  box(p, 0.9, 0.75, 1.7, 0, 0.95, 1.1, RED); // bonnet
  box(p, 0.5, 0.06, 0.5, 0, 1.36, 1.55, 0x24221f); // air-cleaner base
  addGeo(p, new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), GREY, T(0.28, 1.72, 1.7)); // exhaust
  box(p, 1.1, 0.5, 0.9, 0, 0.8, -0.1, RED); // gearbox / rear body
  box(p, 0.5, 0.12, 0.5, 0, 1.2, -0.25, DARK); // seat
  box(p, 0.5, 0.45, 0.08, 0, 1.5, -0.5, DARK); // seat back
  box(p, 0.08, 1.2, 0.08, -0.5, 1.8, -0.3, GREY); box(p, 0.08, 1.2, 0.08, 0.5, 1.8, -0.3, GREY); // canopy posts
  box(p, 1.3, 0.05, 1.0, 0, 2.4, -0.1, BLUE); // sun canopy
  for (const s of [-1, 1]) {
    wheel(p, 0.72, 0.36, s * 0.95, 0.72, 0, DARK); wheel(p, 0.3, 0.38, s * 0.95, 0.72, 0, GREY); // rear tyre + rim
    wheel(p, 0.4, 0.2, s * 0.62, 0.4, 1.7, DARK); wheel(p, 0.17, 0.22, s * 0.62, 0.4, 1.7, GREY); // front
    box(p, 0.3, 0.05, 0.9, s * 0.95, 1.5, -0.1, RED); // mudguard
  }
  // trailer, behind: floor, sides, tailboard, two wheels, hay load
  const TZ = -3.4;
  box(p, 2.0, 0.12, 3.6, 0, 0.95, TZ, WOOD);
  box(p, 0.08, 0.6, 3.6, -0.96, 1.3, TZ, BLUE); box(p, 0.08, 0.6, 3.6, 0.96, 1.3, TZ, BLUE);
  box(p, 2.0, 0.6, 0.08, 0, 1.3, TZ + 1.76, BLUE); box(p, 2.0, 0.75, 0.08, 0, 1.38, TZ - 1.76, BLUE); // tailboard (sign sits on it)
  box(p, 1.8, 0.55, 3.2, 0, 1.55, TZ, 0xb9a15a); // straw load
  box(p, 0.12, 0.12, 2.0, 0, 0.7, TZ + 2.6, GREY); // drawbar
  for (const s of [-1, 1]) { wheel(p, 0.52, 0.28, s * 1.05, 0.52, TZ - 0.4, DARK); wheel(p, 0.22, 0.3, s * 1.05, 0.52, TZ - 0.4, GREY); }
  return p;
}
function kidPart() {
  const p = Part(); // capsule stand-in, 1.05 m
  addGeo(p, new THREE.CapsuleGeometry(0.17, 0.7, 4, 8), 0x3c7ab0, T(0, 0.55, 0));
  addGeo(p, new THREE.SphereGeometry(0.11, 8, 6), 0x7b5236, T(0, 1.05, 0));
  return p;
}
function kitePart(c1, c2) {
  const p = Part(); // flat diamond facing +z (front) and -z (back), plus a ragged tail; 1.3 x 1.0 m
  const mk = (pts, c) => {
    const g = new THREE.BufferGeometry();
    const v = [];
    for (const i of [0, 1, 2]) v.push(...pts[i]);
    for (const i of [0, 2, 1]) v.push(...pts[i]); // back face
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    const nrm = g.attributes.normal; for (let i = 0; i < 6; i++) nrm.setXYZ(i, 0, 0, i < 3 ? 1 : -1);
    addGeo(p, g, c, null);
  };
  const top = [0, 0.55, 0], bot = [0, -0.55, 0], l = [-0.5, 0.1, 0], r = [0.5, 0.1, 0];
  mk([top, l, bot], c1); mk([top, bot, r], c2);
  for (let i = 0; i < 4; i++) { const y = -0.6 - i * 0.28, x = (i % 2 ? 0.05 : -0.05); mk([[x - 0.06, y, 0], [x - 0.06, y - 0.18, 0], [x + 0.06, y - 0.09, 0]], i % 2 ? c1 : c2); }
  return p;
}

function signTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#d9a82a'; ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 496, 176);
  drawBilingual(ctx, 'हॉर्न ओके प्लीज़', 'Horn OK Please', { x: 256, y: 16, w: 470, h: 160, fg: '#241a12' });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// ---------- road polyline helpers ----------
function lineInfo(line) {
  const cum = [0];
  for (let i = 1; i < line.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(line.pts[i][0] - line.pts[i - 1][0], line.pts[i][1] - line.pts[i - 1][1]));
  return { line, cum, len: cum[cum.length - 1], hw: line.w / 2 };
}
function pointAt(li, s) {
  s = Math.max(0, Math.min(li.len, s));
  let i = 1; while (i < li.cum.length - 1 && li.cum[i] < s) i++;
  const [ax, az] = li.line.pts[i - 1], [bx, bz] = li.line.pts[i];
  const L = li.cum[i] - li.cum[i - 1] || 1, t = (s - li.cum[i - 1]) / L;
  return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: (bx - ax) / L, dz: (bz - az) / L };
}
function nearest(li, x, z) {
  let best = { d: 1e9, s: 0, dx: 1, dz: 0 };
  const pts = li.line.pts;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / L2));
    const d = Math.hypot(x - (ax + vx * t), z - (az + vz * t));
    if (d < best.d) { const L = Math.sqrt(L2); best = { d, s: li.cum[i - 1] + t * L, dx: vx / L, dz: vz / L }; }
  }
  return best;
}

let audioCtx = null;
function honk(vol = 0.05) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    audioCtx = audioCtx || new AC(); if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    for (const f of [311, 392]) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'square'; o.frequency.value = f; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.03); g.gain.setValueAtTime(vol, t0 + 0.35); g.gain.linearRampToValueAtTime(0, t0 + 0.45);
      o.start(t0); o.stop(t0 + 0.5);
    }
  } catch { /* audio is optional */ }
}

export function createCyclistEvents2(scene, { getPlayer, isOnCycle }) {
  const group = new THREE.Group(); group.name = 'cyclist_events2';
  scene.add(group);
  const info = { tractor: 'idle', tractorPasses: 0, kid: 'idle', kidRuns: 0, kite: 'idle', kiteFights: 0 };
  if (typeof window !== 'undefined') window.__cyclistEvents2 = info;

  const parts = [tractorPart(), kidPart(), kitePart(0xc8352a, 0xe8c040), kitePart(0x2a6cb5, 0xf0f0e8)]; // 0 tractor, 1 kid, 2/3 kites
  const IT = 0, IK = 1, IA = 2, IB = 3;
  const counts = parts.map((p) => p.pos.length / 3), offs = []; let total = 0;
  for (const c of counts) { offs.push(total); total += c; }
  const geo = new THREE.BufferGeometry();
  const cat = (k, n) => { const a = new Float32Array(total * n); let o = 0; for (const p of parts) { a.set(p[k], o); o += p[k].length; } return a; };
  const base = cat('pos', 3), baseN = cat('nor', 3);
  const posAttr = new THREE.BufferAttribute(new Float32Array(total * 3), 3); posAttr.setUsage(THREE.DynamicDrawUsage);
  const norAttr = new THREE.BufferAttribute(new Float32Array(total * 3), 3); norAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr); geo.setAttribute('normal', norAttr);
  geo.setAttribute('color', new THREE.BufferAttribute(cat('col', 3), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(cat('uv', 2), 2));
  const mat = getTiledMaterial('tin', { repeatX: 1, repeatY: 1, roughness: 0.8, vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat); mesh.name = 'cyclist_events2_dynamic'; mesh.frustumCulled = false; mesh.castShadow = false; mesh.visible = false;
  group.add(mesh);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.64), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.85, metalness: 0 }));
  sign.name = 'tractor_tailboard_sign'; sign.visible = false; sign.frustumCulled = false; group.add(sign);

  // pose per part: null = hidden
  const pose = parts.map(() => null);
  const _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _v = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
  function setPose(i, x, y, z, yaw, pitch = 0, roll = 0) { pose[i] = { x, y, z, yaw, pitch, roll }; }
  function flush() {
    const pa = posAttr.array, na = norAttr.array;
    let any = false;
    for (let i = 0; i < parts.length; i++) {
      const o = offs[i] * 3, n = counts[i] * 3, ps = pose[i];
      if (!ps) { if (pa[o] !== 0 || pa[o + 1] !== 0 || pa[o + 2] !== 0 || pa[o + 3] !== 0) pa.fill(0, o, o + n); continue; }
      any = true;
      _e.set(ps.pitch, ps.yaw, ps.roll); _q.setFromEuler(_e); _p.set(ps.x, ps.y, ps.z);
      _m.compose(_p, _q, _s); _n.getNormalMatrix(_m);
      for (let k = 0; k < n; k += 3) {
        _v.set(base[o + k], base[o + k + 1], base[o + k + 2]).applyMatrix4(_m); pa[o + k] = _v.x; pa[o + k + 1] = _v.y; pa[o + k + 2] = _v.z;
        _v.set(baseN[o + k], baseN[o + k + 1], baseN[o + k + 2]).applyMatrix3(_n).normalize(); na[o + k] = _v.x; na[o + k + 1] = _v.y; na[o + k + 2] = _v.z;
      }
    }
    posAttr.needsUpdate = true; norAttr.needsUpdate = true;
    mesh.visible = any;
  }

  let built = false, frames = 0, last = 0, elapsed = 0;
  let hwy = null, roads = [];
  const pl = { x: 0, z: 0, hx: 1, hz: 0, speed: 0, init: false };
  const tr = { on: false, s: 0, dir: 1, v: 0, honked: 0, t: 0, cool: 20 };
  const kid = { on: false, t: 0, rel: 0, lat: 1.4, cool: 30, side: 1, phase: 0 };
  const kite = { state: 'idle', t: 0, cool: 35, fx: 0, fz: 0, wx: 1, wz: 0, tree: null, bx: 0, by: 0, bz: 0, landed: 0 };
  let scanT = 0;

  function build() {
    const all = mapRoadLines();
    const h = all.find((l) => l.id === 'highway');
    if (h) { hwy = lineInfo(h); info.hwyPts = h.pts; }
    roads = all.filter((l) => l.kind === 'road' || l.kind === 'highway' || l.kind === 'lane').map(lineInfo);
  }

  function stepTractor(dt, px, pz, riding) {
    if (!hwy) return;
    if (!tr.on) {
      tr.cool -= dt;
      if (tr.cool > 0 || !riding || pl.speed < 3) return;
      const n = nearest(hwy, px, pz);
      if (n.d > hwy.hw + 1) return;
      tr.dir = (pl.hx * n.dx + pl.hz * n.dz) >= 0 ? 1 : -1;
      tr.s = n.s - tr.dir * 55; tr.v = Math.max(11, pl.speed + 6); tr.honked = 0; tr.t = 0;
      if (tr.s < 0 || tr.s > hwy.len) { tr.cool = 8; return; }
      tr.on = true; info.tractor = 'approach';
    }
    tr.t += dt; tr.s += tr.dir * tr.v * dt;
    const n = nearest(hwy, px, pz);
    const ahead = (tr.s - n.s) * tr.dir; // + once past the player
    if (tr.honked === 0 && ahead > -35) { honk(); tr.honked = 1; }
    if (tr.honked === 1 && ahead > -9) { honk(0.07); tr.honked = 2; info.tractor = 'overtaking'; }
    if (ahead > 0) info.tractor = 'passed';
    if (ahead > 90 || tr.s < 0 || tr.s > hwy.len || tr.t > 40) {
      tr.on = false; tr.cool = 70 + hash(info.tractorPasses) * 40; pose[IT] = null; sign.visible = false;
      info.tractor = 'idle'; info.tractorPasses++; return;
    }
    const f = pointAt(hwy, tr.s), d = tr.dir;
    const lx = f.dz * d, lz = -f.dx * d, off = hwy.hw * 0.42; // left of travel (India drives on the left)
    const x = f.x + lx * off, z = f.z + lz * off, yaw = Math.atan2(f.dx * d, f.dz * d);
    const rumble = Math.sin(elapsed * 31) * 0.012;
    // G3: wheels on the surface. Origin is under the rear axle; front axle +1.7 m, trailer axle -3.8 m. Pitched to the line
    // between the front and trailer contacts, then lifted so none of the three is under its surface.
    const fx0 = Math.sin(yaw), fz0 = Math.cos(yaw), gc = tr.gc || (tr.gc = [{}, {}, {}]);
    const gR = followGround(gc[0], scene, x, z, tr.gy || 0, 0.25), gF = followGround(gc[1], scene, x + fx0 * 1.7, z + fz0 * 1.7, tr.gy || 0, 0.25);
    const gT = followGround(gc[2], scene, x - fx0 * 3.8, z - fz0 * 3.8, tr.gy || 0, 0.25);
    const tp = Math.max(-0.2, Math.min(0.2, -Math.atan2(gF - gT, 5.5))), sp = Math.sin(tp);
    tr.gy = Math.max(gR, gF + 1.7 * sp, gT - 3.8 * sp);
    setPose(IT, x, rumble + tr.gy, z, yaw, tp);
    // tailboard sign: 5.1 m behind the rear axle, on the outside of the board, facing backwards
    const fx = Math.sin(yaw), fz = Math.cos(yaw), bz = -3.4 - 1.82;
    sign.position.set(x + fx * bz, 1.4 + rumble + tr.gy - bz * Math.sin(tp), z + fz * bz);
    sign.rotation.set(0, yaw + Math.PI, 0); sign.visible = true;
    sign.updateMatrixWorld(true); // onBeforeRender runs after the scene's matrix update: without this the board lags a frame
  }

  function nearRoad(x, z) {
    for (const r of roads) if (nearest(r, x, z).d < r.hw + 1.5) return true;
    return false;
  }

  function stepKid(dt, px, pz, riding) {
    if (!kid.on) {
      kid.cool -= dt;
      if (kid.cool > 0 || !riding || pl.speed < 3.5 || tr.on) return;
      if (!nearRoad(px, pz)) return;
      kid.on = true; kid.t = 0; kid.rel = 9; kid.side = hash(info.kidRuns * 3 + 1) > 0.5 ? 1 : -1; info.kid = 'running';
    }
    kid.t += dt;
    // rel = metres ahead of the cyclist along its heading: darts in from ahead, keeps pace ~5 s, then falls away behind
    const keep = kid.t < 5.5;
    if (kid.t < 2.2) kid.rel += (0.6 - kid.rel) * Math.min(1, dt * 1.6);
    else if (keep) kid.rel += (0.6 - kid.rel) * Math.min(1, dt * 2);
    else { kid.rel -= pl.speed * Math.min(1, (kid.t - 5.5) * 0.5) * dt; info.kid = 'dropping'; }
    const lat = kid.t < 2.2 ? 3.2 - 1.8 * (kid.t / 2.2) : 1.4;
    if (kid.t > 11 || kid.rel < -30) { kid.on = false; kid.cool = 70 + hash(info.kidRuns) * 50; pose[IK] = null; info.kid = 'idle'; info.kidRuns++; return; }
    const x = px + pl.hx * kid.rel + pl.hz * lat * kid.side;
    const zz = pz + pl.hz * kid.rel - pl.hx * lat * kid.side;
    const running = keep || kid.t < 8;
    const bob = running ? Math.abs(Math.sin(elapsed * 14)) * 0.09 : 0;
    kid.gy = followGround(kid, scene, x, zz, kid.gy || 0); // G3: feet on the surface under him, not y 0
    setPose(IK, x, bob + kid.gy, zz, Math.atan2(pl.hx, pl.hz), running ? 0.2 : 0, running ? Math.sin(elapsed * 7) * 0.08 : 0);
  }

  function stepKite(dt, px, pz) {
    const k = kite;
    if (k.state === 'idle') {
      k.cool -= dt;
      if (k.cool > 0) return;
      let best = null, bd = 1e9;
      for (const c of CANOPIES) {
        if (!(c.root.parent) || c.root.visible === false || c.root.userData?.zoneHidden) continue;
        const d = Math.hypot(c.x - px, c.z - pz);
        if (d > 22 && d < 70 && d < bd) { bd = d; best = c; }
      }
      if (!best) { k.cool = 5; return; }
      const ang = hash(info.kiteFights + 7) * TAU;
      k.wx = Math.cos(ang); k.wz = Math.sin(ang); k.tree = best;
      k.fx = best.x - k.wx * 22; k.fz = best.z - k.wz * 22; k.t = 0; k.state = 'fight'; info.kite = 'fight';
    }
    k.t += dt;
    const tree = k.tree, yaw = Math.atan2(px - k.fx, pz - k.fz);
    const tilt = -0.55, sway = Math.sin(elapsed * 2.1) * 0.15;
    if (k.state === 'fight') {
      const a = k.t * 1.3, R = 3.2 - Math.min(1.6, k.t * 0.12);
      // A and B circle and dive at each other
      const ax = k.fx + Math.cos(a) * R, az = k.fz + Math.sin(a) * R, ay = 24 + Math.sin(a * 1.7) * 2.2;
      const bxx = k.fx - Math.cos(a) * R, bzz = k.fz - Math.sin(a) * R, byy = 24 - Math.sin(a * 1.7) * 2.2;
      setPose(IA, ax, ay, az, yaw + Math.sin(a * 2) * 0.4, tilt, sway);
      setPose(IB, bxx, byy, bzz, yaw + Math.cos(a * 2) * 0.4, tilt, -sway);
      k.bx = bxx; k.by = byy; k.bz = bzz;
      if (k.t > 11) { k.state = 'cut'; k.t = 0; info.kite = 'cut'; k.ax = ax; k.ay = ay; k.az = az; }
    } else if (k.state === 'cut' || k.state === 'caught') {
      // A flies off the winner's way; B drifts downwind into the canopy
      const tx = tree.x, tz = tree.z, ty = tree.y1 - 0.4;
      const dur = 9;
      const u = Math.min(1, k.t / dur), e = u * u * (3 - 2 * u);
      const flutter = Math.sin(k.t * 3.1) * (1 - u) * 1.6;
      const bx = k.bx + (tx - k.bx) * e + -k.wz * flutter, bz = k.bz + (tz - k.bz) * e + k.wx * flutter;
      const by = k.by + (ty - k.by) * (u < 1 ? Math.pow(u, 0.8) : 1);
      const spin = (1 - u) * k.t * 3.5;
      setPose(IB, bx, by + Math.sin(k.t * 5) * 0.2 * (1 - u), bz, yaw + spin, u < 1 ? -0.9 : -1.15, Math.sin(k.t * 2.4) * (u < 1 ? 0.5 : 0.12));
      if (k.state === 'cut' && u >= 1) { k.state = 'caught'; info.kite = 'caught'; }
      // winner circles upward and slides away
      const w = Math.min(1, k.t / 14);
      setPose(IA, k.ax + k.wx * w * 12, k.ay + w * 6, k.az + k.wz * w * 12, yaw + Math.sin(k.t) * 0.3, tilt, sway);
      if (k.t > 14) pose[IA] = null;
      if (k.t > 100 || Math.hypot(tx - px, tz - pz) > 160) { pose[IB] = null; pose[IA] = null; k.state = 'idle'; k.cool = 120; info.kite = 'idle'; info.kiteFights++; }
    }
  }

  function animate(dt) {
    elapsed += dt;
    const player = getPlayer();
    if (!player || dt <= 0) return;
    const px = player.position.x, pz = player.position.z, riding = isOnCycle();
    if (pl.init) {
      const vx = (px - pl.x) / dt, vz = (pz - pl.z) / dt, sp = Math.hypot(vx, vz);
      if (sp > 0.5 && sp < 40) { const k = Math.min(1, dt * 4); pl.hx += (vx / sp - pl.hx) * k; pl.hz += (vz / sp - pl.hz) * k; const l = Math.hypot(pl.hx, pl.hz) || 1; pl.hx /= l; pl.hz /= l; }
      pl.speed += (Math.min(sp, 40) - pl.speed) * Math.min(1, dt * 3);
    }
    pl.x = px; pl.z = pz; pl.init = true;
    stepTractor(dt, px, pz, riding);
    stepKid(dt, px, pz, riding);
    stepKite(dt, px, pz);
    if (tr.on || kid.on || kite.state !== 'idle' || mesh.visible) flush();
  }

  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    if (prev) prev.apply(this, args);
    if (settlingReleased()) frames++; // load time: lazy builds wait for the opening view (docs/perf-2026-11-08.md)
    if (!built && lazyDue(frames, 40)) { built = true; build(); }
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, last ? now - last : 0); last = now;
    if (built) animate(dt);
  };
  // debug hooks for headless checks (force an event now)
  info.force = (what) => { if (what === 'tractor') tr.cool = 0; if (what === 'kid') kid.cool = 0; if (what === 'kite') kite.cool = 0; };
  return { group };
}
