#!/usr/bin/env node
/**
 * Ground check (docs/PARALLEL.md G1, her order 10 Nov: "nothing should go inside the ground": pots, a cart, the cycle, feet).
 * Loads the BUILT game (vite preview of GC_OUTDIR), builds every streamed zone, then compares the LOWEST world point of every
 * placed object with the surface height under it: the dug ground (src/dips.js) or the highest upward-facing triangle of any
 * solid surface (road strip, plinth, chabutra, step) at or just above the object's foot. Fail when the lowest point is
 * more than 2 cm below or more than 3 cm above that surface.
 *
 *   Types     prop (lamps, pumps, haystacks, furniture, ...), pot, cart, vehicle, animal, person, cycle (the player's).
 *   Static    every connected piece (island) of every prop mesh, so one sunk pot inside a merged draw call is found alone.
 *             People and animals (capsule figures, cattle/dog/goat/... meshes, instanced crowds), vehicles and carts are
 *             measured from their own vertices too.
 *   Elevated  a static piece whose lowest point is > 25 cm above any surface (shelf, roof, on another prop) or > 60 cm
 *             below (a well shaft, a foundation modelled on purpose) is counted as "elevated", not failed.
 *   Ride      GC_SECONDS (default 90) of fixed-dt player cycle steps along the longest roads, sampled every 0.1 s
 *             (front and rear half of the rig separately = each wheel), with the live movers sampled between ride chunks.
 *
 * Why it no longer hangs (10 Nov): the old version ray-cast every probe against whole merged village meshes (hundreds of
 * thousands of triangles, no BVH) inside ONE page.evaluate with no timeout. Now: the surface triangles are put in a 2 m
 * grid once, every in-page step is time-sliced (a cursor, <= GC_SLICE ms per evaluate), every evaluate has a Node-side
 * timeout, and a hard deadline (GC_DEADLINE s, default 540) writes whatever was measured and exits.
 *
 * Usage: npx vite build --outDir dist-gc && perl -e 'alarm 600; exec @ARGV' node tools/ground-check.js
 *   env: GC_OUTDIR, GC_PORT, GC_SECONDS, GC_WAIT (settle wait ms, 42000), GC_NORIDE=1, GC_DEADLINE, GC_SLICE
 * Writes tmp/ground-check.json and docs/ground-check-<date>.md. Exit 1 on any failure, 2 on deadline.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = +(process.env.GC_PORT || 5311);
const OUTDIR = process.env.GC_OUTDIR || 'dist-gc';
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
const RIDE = !process.env.GC_NORIDE;
const SECONDS = +(process.env.GC_SECONDS || 90);
const DEADLINE_S = +(process.env.GC_DEADLINE || 540);
const SLICE = +(process.env.GC_SLICE || 400);
const LOW = 0.02, HIGH = 0.03;
const T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1).padStart(6)} s]`, ...a);

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => fetch(url).then(() => resolve()).catch(() => {
      if (Date.now() - start > timeoutMs) reject(new Error('preview server did not start'));
      else setTimeout(tryOnce, 300);
    });
    tryOnce();
  });
}

/** page.evaluate with a Node-side timeout: a stuck page can never hang the tool. */
async function ev(page, label, fn, arg, ms = 60000) {
  let timer;
  const t = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`TIMEOUT: ${label} took over ${ms} ms`)), ms); });
  try { return await Promise.race([page.evaluate(fn, arg), t]); } finally { clearTimeout(timer); }
}

function forceZones() {
  const d = window.__dopahar;
  d.zoneManager.update = () => {};
  let n = 0;
  for (const z of d.zoneManager.zones.values()) {
    if (!z.active) {
      const built = z.build();
      const plain = built.isObject3D;
      z.group = plain ? built : built.group;
      z.onFrame = plain ? null : built.onFrame || null;
      d.scene.add(z.group);
      z.active = true;
      n++;
    }
    if (z.group) { z.group.visible = true; z.group.userData.zoneHidden = false; }
  }
  return n;
}

// ---- runs inside the page. Installs window.__gc; every heavy step is a cursor that runs for at most `ms` per call ----
function install(cfg) {
  const d = window.__dopahar;
  const { Vector3, Matrix4, Box3 } = d;
  const dipH = (window.__dips && window.__dips.dipHeightRaw) || (() => 0);
  const SURFACE_SKIP = /water|ripple|grass|tuft|crop|cane|reed|flower|foliage|canopy|leaf|bush|hedge|plant_|laundry|cloth|bunting|garland|flag|shadow|contact|dust|steam|smoke|sky|waypoint|glow|beam|halo|fire|rangoli|decal/i;
  const PROP_SKIP = /capsule|people/i;
  const MOVER_TOP = /^(vehicle_|trolley|jeep|npc|player)/;
  const BUILDING_TOP = /^(hero_zone|shops|bazaar_row|arm_frontage|main_road_frontage|gully_life|map_wall|background_houses|village_kit_houses|village_static_merged|blender_|canal|pond|roof_|field|vegetation|flowering_plants|ground|sky|place_|trim|material_board|ration_shop|tv_house|panchayat|temple_area|chaupal|banta_shop|tripo_|contact_shadows|waypoint|switchboard|wayfinding|map_gates|mapCompound)/;
  const ANIMAL_RE = /cattle|herd|bovine|buffalo|\bcow|_cow|dog|goat|monkey|peacock|bullock|animal/i;
  const ANIMAL_NOT = /cart|sign|board|poster|mural|bowl|kennel|trough|nand|manger|peg|rope|statue|fodder|haystack|heap/i;
  const exempt = cfg.exempt.map(([s, f, why]) => [new RegExp(s, f), why]);
  const SUB = [
    ['pot', /pot|matka|ghada|surahi|kulhad|ceramic|terracotta|clay|earthen|handi/i],
    ['cart', /cart|thela|handcart|icecream/i],
    ['vehicle', /scooter|jeep|bike|tractor|trolley|motorcycle/i],
    ['lamp', /lamp|lantern|pole/i],
    ['pump', /pump|\btap\b|well|tank/i],
    ['haystack', /hay|dung|gobar|fodder/i],
    ['furniture', /charpai|stool|bench|furniture|chair|table|trough|manger/i],
    ['milestone', /milestone|flagpole|bell/i],
  ];
  const subOf = (s) => { for (const [t, re] of SUB) if (re.test(s)) return t; return 'other'; };
  const typeOfSub = (s) => (s === 'pot' || s === 'cart' || s === 'vehicle' ? s : 'prop');
  const pathOf = (o) => { const p = []; for (let q = o; q && !q.isScene; q = q.parent) p.unshift(q.name || q.type); return p.join('/'); };
  const topOf = (o) => { let t = o; while (t.parent && !t.parent.isScene) t = t.parent; return t; };
  const shown = (o) => { for (let q = o; q; q = q.parent) { if (q.visible === false) return false; if (q.isScene) return true; } return false; };
  const matName = (o) => (Array.isArray(o.material) ? o.material[0] : o.material)?.name || '';
  const isPersonCapsule = (g) => g && g.type === 'CapsuleGeometry' && g.parameters && g.parameters.radius >= 0.12 && (g.parameters.height ?? g.parameters.length) + 2 * g.parameters.radius >= 0.7;
  const r3 = (n) => +n.toFixed(3);
  const v = new Vector3(), va = new Vector3(), vb = new Vector3(), vc = new Vector3(), mw = new Matrix4(), mi = new Matrix4();

  // ---------- classification (once) ----------
  const staticObjs = [], figures = [], figureMeshes = new Set(), surfaceList = [], propSurf = new Set();
  let surfIsProp = null, surfRoot = [];
  const placeRootOf = (path) => { const m = /^(.*?[a-z0-9]_v2)(?:_wrap)?\//.exec(path); return m ? m[1].replace(/_wrap$/, '') : ''; };
  function classify() {
    d.scene.updateMatrixWorld(true);
    const vehicleGroups = new Set((d.vehicles || []).map((x) => x.group).filter(Boolean));
    const inVehicle = (o) => { for (let q = o; q; q = q.parent) if (vehicleGroups.has(q)) return true; return false; };
    d.scene.traverse((o) => {
      if (!o.isMesh || o.isBatchedMesh || !shown(o) || !o.geometry?.attributes?.position) return;
      const path = pathOf(o);
      if (/^player/.test(path)) return;
      if (isPersonCapsule(o.geometry) || (ANIMAL_RE.test(path) && !ANIMAL_NOT.test(o.name || '') && !inVehicle(o))) {
        figureMeshes.add(o);
        const kind = isPersonCapsule(o.geometry) ? 'person' : 'animal';
        if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) figures.push({ label: `${path}#${i}`, mesh: o, i, kind });
        else figures.push({ label: path, mesh: o, i: -1, kind });
      }
    });
    d.scene.traverse((o) => {
      if (!o.isMesh || o.isBatchedMesh || !shown(o) || figureMeshes.has(o) || !o.geometry?.attributes?.position) return;
      if (o.isSprite || o.isPoints || o.isLine) return;
      const top = topOf(o).name || '';
      const path = pathOf(o), mat = matName(o);
      const pm = path + '/' + mat;
      // static props: not a building, not a mover, not a plant / cloth / decal
      const isProp = !o.isInstancedMesh && !BUILDING_TOP.test(top) && !MOVER_TOP.test(top) && !inVehicle(o)
        && !SURFACE_SKIP.test(path) && !SURFACE_SKIP.test(mat) && !PROP_SKIP.test(path)
        && o.geometry.attributes.position.count <= 120000 && o.geometry.type !== 'CapsuleGeometry';
      if (isProp) { staticObjs.push(o); propSurf.add(o); surfaceList.push(o); return; } // a prop is ground for people, carts, the cycle; never for another prop
      // surfaces
      if (top === 'ground' || MOVER_TOP.test(top) || inVehicle(o)) return;
      if (/^ground(\/|$)/.test(path) || /\/ground$/.test(o.name)) return; // flat plane: replaced by dipH (it has shader holes)
      if (SURFACE_SKIP.test(pm.replace(/ride_nook_\d+_[a-z]+/g, 'nook')) || PROP_SKIP.test(path)) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m && m.transparent && m.opacity < 0.5) return;
      if (o.userData.noGroundSurface) return;
      surfaceList.push(o);
    });
    const vehicles = (d.vehicles || []).filter((x) => x.group && shown(x.group)).length;
    surfIsProp = surfaceList.map((o) => propSurf.has(o));
    surfRoot = surfaceList.map((o) => placeRootOf(pathOf(o)));
    return { props: staticObjs.length, figures: figures.length, surfaces: surfaceList.length - staticObjs.length, vehicles };
  }

  // ---------- surface grid: upward-facing triangles in 2 m cells ----------
  const CELL = 2;
  const tris = []; // flat: ax,ay,az,bx,by,bz,cx,cy,cz,surfaceIndex
  const cells = new Map(), big = [];
  let sCur = 0, sInst = 0, sTri = 0;
  function cellKey(ix, iz) { return ix * 100003 + iz; }
  function addTri(si) {
    // normal y of (b-a)x(c-a)
    const e1x = vb.x - va.x, e1y = vb.y - va.y, e1z = vb.z - va.z, e2x = vc.x - va.x, e2y = vc.y - va.y, e2z = vc.z - va.z;
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz); if (len < 1e-9) return;
    if (Math.abs(ny) / len < 0.25) return; // walls never hold anything up
    const t = tris.length / 10;
    tris.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z, si);
    const x0 = Math.floor(Math.min(va.x, vb.x, vc.x) / CELL), x1 = Math.floor(Math.max(va.x, vb.x, vc.x) / CELL);
    const z0 = Math.floor(Math.min(va.z, vb.z, vc.z) / CELL), z1 = Math.floor(Math.max(va.z, vb.z, vc.z) / CELL);
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 2500) { big.push(t); return; }
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) { const k = cellKey(ix, iz); let a = cells.get(k); if (!a) cells.set(k, (a = [])); a.push(t); }
  }
  function indexSurfaces(ms) {
    const tEnd = performance.now() + ms;
    while (sCur < surfaceList.length) {
      const o = surfaceList[sCur], geo = o.geometry, pos = geo.attributes.position, ix = geo.index ? geo.index.array : null;
      const nT = ix ? ix.length / 3 : pos.count / 3, nI = o.isInstancedMesh ? o.count : 1;
      while (sInst < nI) {
        mw.copy(o.matrixWorld); if (o.isInstancedMesh) { o.getMatrixAt(sInst, mi); mw.multiply(mi); }
        for (; sTri < nT; sTri++) {
          const a = ix ? ix[sTri * 3] : sTri * 3, b = ix ? ix[sTri * 3 + 1] : sTri * 3 + 1, c = ix ? ix[sTri * 3 + 2] : sTri * 3 + 2;
          va.fromBufferAttribute(pos, a).applyMatrix4(mw); vb.fromBufferAttribute(pos, b).applyMatrix4(mw); vc.fromBufferAttribute(pos, c).applyMatrix4(mw);
          addTri(sCur);
          if ((sTri & 1023) === 1023 && performance.now() > tEnd) { sTri++; return { done: false, at: sCur, of: surfaceList.length, tris: tris.length / 10 }; }
        }
        sTri = 0; sInst++;
      }
      sInst = 0; sCur++;
      if (performance.now() > tEnd) break;
    }
    return { done: sCur >= surfaceList.length, at: sCur, of: surfaceList.length, tris: tris.length / 10, cells: cells.size, big: big.length };
  }
  /** Highest surface at (x,z) not above footY + probe. */
  function triY(t, x, z) {
    const o = t * 10, ax = tris[o], az = tris[o + 2], bx = tris[o + 3], bz = tris[o + 5], cx = tris[o + 6], cz = tris[o + 8];
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(det) < 1e-12) return null;
    const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det, l3 = 1 - l1 - l2;
    if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) return null;
    return l1 * tris[o + 1] + l2 * tris[o + 4] + l3 * tris[o + 7];
  }
  /** own = place-model root of the piece being measured: that model's own upward faces (plinth, deck, step) count as ground for it,
   *  but only faces no higher than the piece's own point (+2 cm), so a piece never stands on its own top. */
  function surfaceAt(x, z, footY, probe = 0.3, props = false, own = '', ptY = 0) {
    let best = dipH(x, z), bt = -1;
    const top = footY + probe;
    const scan = (arr) => { if (!arr) return; for (const t of arr) { const si = tris[t * 10 + 9]; const isOwn = own && surfRoot[si] === own; if (!props && surfIsProp[si] && !isOwn) continue; const y = triY(t, x, z); if (y !== null && y <= (isOwn ? Math.min(top, ptY + 0.02) : top) && y > best) { best = y; bt = t; } } };
    scan(cells.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)))); scan(big);
    return { y: best, what: bt < 0 ? (best < -0.005 ? 'dug ground' : 'ground') : pathOf(surfaceList[tris[bt * 10 + 9]]) };
  }

  /** pts flat [x,y,z,...]. Clearance over the 12 cm bottom band, 8 cm buckets. */
  function clearanceOf(pts, n, probe, props = false, own = '') {
    let minY = Infinity;
    for (let k = 0; k < n; k++) if (pts[k * 3 + 1] < minY) minY = pts[k * 3 + 1];
    if (!isFinite(minY)) return null;
    const buckets = new Map();
    for (let k = 0; k < n; k++) {
      const y = pts[k * 3 + 1];
      if (y > minY + 0.12) continue;
      const key = Math.round(pts[k * 3] / 0.08) + ',' + Math.round(pts[k * 3 + 2] / 0.08);
      const b = buckets.get(key);
      if (!b || y < b[1]) buckets.set(key, [pts[k * 3], y, pts[k * 3 + 2]]);
    }
    let clear = Infinity, at = null, on = '', cnt = 0;
    for (const [x, y, z] of buckets.values()) {
      if (++cnt > 32) break;
      const s = surfaceAt(x, z, minY, probe, props, own, y);
      const c = y - s.y;
      if (c < clear) { clear = c; at = [x, z]; on = s.what; }
    }
    return { clear, at, on, minY };
  }
  const rec = (type, sub, mode, label, c, extra) => ({ type, sub, mode, label, clear: r3(c.clear), at: c.at.map((q) => +q.toFixed(2)), y: r3(c.minY), on: c.on, ...extra });

  /** Connected pieces of a geometry (vertices welded at 1 mm). */
  function islands(geo) {
    const pos = geo.attributes.position, n = pos.count;
    const parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
    const weld = new Map();
    for (let i = 0; i < n; i++) {
      const k = Math.round(pos.getX(i) * 1000) + ',' + Math.round(pos.getY(i) * 1000) + ',' + Math.round(pos.getZ(i) * 1000);
      const j = weld.get(k); if (j === undefined) weld.set(k, i); else union(i, j);
    }
    if (geo.index) { const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { union(ix[i], ix[i + 1]); union(ix[i], ix[i + 2]); } }
    else for (let i = 0; i + 2 < n; i += 3) { union(i, i + 1); union(i, i + 2); }
    const groups = new Map();
    for (let i = 0; i < n; i++) { const r = find(i); let a = groups.get(r); if (!a) groups.set(r, (a = [])); a.push(i); }
    return [...groups.values()];
  }

  /** Islands that touch or overlap (2 cm) in x, y and z are one object: a haystack's straw, a pot on its stool, a sack pile. */
  function clusters(isl, pos) {
    if (isl.length < 2) return isl;
    const bx = isl.map((part, i) => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const k of part) { v.fromBufferAttribute(pos, k).applyMatrix4(mw); if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y; if (v.z < z0) z0 = v.z; if (v.z > z1) z1 = v.z; }
      return [x0 - 0.02, x1 + 0.02, y0 - 0.02, y1 + 0.02, z0 - 0.02, z1 + 0.02, i];
    }).sort((a, b) => a[0] - b[0]);
    const par = isl.map((_, i) => i);
    const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    for (let i = 0; i < bx.length; i++) {
      const A = bx[i];
      for (let j = i + 1; j < bx.length && bx[j][0] <= A[1]; j++) {
        const B = bx[j];
        if (B[2] > A[3] || B[3] < A[2] || B[4] > A[5] || B[5] < A[4]) continue;
        const ra = find(A[6]), rb = find(B[6]); if (ra !== rb) par[ra] = rb;
      }
    }
    const g = new Map();
    isl.forEach((part, i) => { const r = find(i); const a = g.get(r); if (a) { for (const k of part) a.push(k); } else g.set(r, part.slice()); });
    return [...g.values()];
  }

  // ---------- static props, cursor ----------
  let pCur = 0; const staticOut = []; let elevated = 0;
  function measureStatic(ms) {
    const tEnd = performance.now() + ms;
    while (pCur < staticObjs.length && performance.now() < tEnd) {
      const o = staticObjs[pCur++];
      const geo = o.geometry, pos = geo.attributes.position;
      mw.copy(o.matrixWorld);
      const path = pathOf(o), sub0 = subOf(path + '/' + matName(o)), type = typeOfSub(sub0);
      const sub = sub0 === 'other' && /_v2(_wrap)?\//.test(path) && /\/hb_\w+$/.test(path) ? 'place model part' : sub0;
      const parts = pos.count > 40 ? clusters(islands(geo), pos) : [Array.from({ length: pos.count }, (_, i) => i)];
      for (const part of parts) {
        const pts = new Float32Array(part.length * 3);
        for (let k = 0; k < part.length; k++) { v.fromBufferAttribute(pos, part[k]).applyMatrix4(mw); pts[k * 3] = v.x; pts[k * 3 + 1] = v.y; pts[k * 3 + 2] = v.z; }
        const c = clearanceOf(pts, part.length, 0.3, false, placeRootOf(path));
        if (!c) continue;
        if (c.clear > 0.25 || c.clear < -0.6) { elevated++; continue; }
        staticOut.push(rec(type, sub, 'static', path, c, { verts: part.length }));
      }
    }
    return { done: pCur >= staticObjs.length, at: pCur, of: staticObjs.length, rows: staticOut.length, elevated };
  }

  // ---------- figures (people, animals) and vehicles: one pass, cursor ----------
  function measureFigure(f, mode) {
    const ex = exempt.find(([re]) => re.test(f.label)) || (f.i >= 0 && f.mesh.userData.footExempt && f.mesh.userData.footExempt.includes(f.i) ? [0, 'footExempt (animated / lying pose)'] : null);
    if (ex) return { exempt: ex[1] };
    if (!shown(f.mesh)) return null;
    mw.copy(f.mesh.matrixWorld); if (f.i >= 0) { f.mesh.getMatrixAt(f.i, mi); mw.multiply(mi); }
    const pos = f.mesh.geometry.attributes.position, pts = new Float32Array(pos.count * 3);
    for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k).applyMatrix4(mw); pts[k * 3] = v.x; pts[k * 3 + 1] = v.y; pts[k * 3 + 2] = v.z; }
    const c = clearanceOf(pts, pos.count, 0.4, true);
    if (!c) return null;
    if (c.clear > 1.0) return { elevated: true }; // on a roof / cart / platform with no surface under it within the probe
    return rec(f.kind, f.kind, mode, f.label, c);
  }
  function measureVehicle(veh, idx, mode) {
    const g = veh.group; if (!g || !shown(g)) return null;
    g.updateMatrixWorld(true);
    const pts = [];
    g.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || figureMeshes.has(o) || !o.geometry?.attributes?.position) return;
      if (SURFACE_SKIP.test(o.name) || o.geometry.type === 'PlaneGeometry' || o.geometry.type === 'CapsuleGeometry') return;
      const pos = o.geometry.attributes.position; mw.copy(o.matrixWorld);
      for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k).applyMatrix4(mw); pts.push(v.x, v.y, v.z); }
    });
    if (!pts.length) return null;
    const c = clearanceOf(pts, pts.length / 3, 0.4, true);
    if (!c) return null;
    const kind = veh.preset?.kind || g.name || 'vehicle';
    const type = /cart|thela|rehri/i.test(kind + g.name) ? 'cart' : 'vehicle';
    return rec(type, String(kind), mode, `${g.name || 'vehicle'}[${idx}:${kind}]`, c);
  }
  let fCur = 0; const moverOut = [], exemptOut = []; let figElevated = 0;
  function measureMovers(ms, mode, reset) {
    if (reset) fCur = 0;
    const tEnd = performance.now() + ms;
    if (fCur === 0) { d.scene.updateMatrixWorld(true); (d.vehicles || []).forEach((veh, i) => { const r = measureVehicle(veh, i, mode); if (r) moverOut.push(r); }); }
    while (fCur < figures.length && performance.now() < tEnd) {
      const f = figures[fCur++];
      const r = measureFigure(f, mode);
      if (!r) continue;
      if (r.exempt) { if (mode === 'static') exemptOut.push({ label: f.label, why: r.exempt }); continue; }
      if (r.elevated) { figElevated++; continue; }
      moverOut.push(r);
    }
    return { done: fCur >= figures.length, at: fCur, of: figures.length, rows: moverOut.length, exempt: exemptOut.length, elevated: figElevated };
  }

  // ---------- player cycle ride, cursor ----------
  const DT = 1 / 60;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const rideOut = []; let rig = null, lines = null, li = 0, k = 1, sOnLine = 0, step = 0, totalSteps = 0, stuck = 0, lastX = 0, lastZ = 0, saved = null;
  function rideInit(seconds) {
    d.scene.traverse((o) => { if (o.name === 'player_cycle_rig') rig = o; });
    if (!rig) return { error: 'no player_cycle_rig' };
    if (!d.setCycle || !d.stepCycle || !d.roadLines) return { error: 'cycle hooks missing (setCycle/stepCycle/roadLines)' };
    try { d.rebuildColliders && d.rebuildColliders(); } catch (e) { /* colliders optional */ }
    lines = d.roadLines().filter((l) => l.pts.length > 3).sort((a, b) => b.pts.length - a.pts.length).slice(0, 12);
    totalSteps = Math.round(seconds / DT); li = -1; saved = null;
    return { lines: lines.length, totalSteps };
  }
  function startLine() {
    li++; if (li >= lines.length) return false;
    const pts = lines[li].pts;
    d.setCycle({ x: pts[0][0], z: pts[0][1], heading: Math.atan2(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), speed: 5 });
    k = 1; sOnLine = 0; stuck = 0; lastX = pts[0][0]; lastZ = pts[0][1];
    return true;
  }
  function sampleRig() {
    rig.updateMatrixWorld(true);
    const st = d.cycleState();
    const fx = Math.sin(st.heading), fz = Math.cos(st.heading);
    const front = [], rear = [];
    rig.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position || !shown(o)) return;
      if (SURFACE_SKIP.test(o.name) || o.geometry.type === 'PlaneGeometry' || o.geometry.type === 'CapsuleGeometry') return;
      const pos = o.geometry.attributes.position; if (pos.count > 30000) return;
      mw.copy(o.matrixWorld);
      for (let q = 0; q < pos.count; q++) { v.fromBufferAttribute(pos, q).applyMatrix4(mw); ((v.x - st.x) * fx + (v.z - st.z) * fz >= 0 ? front : rear).push(v.x, v.y, v.z); }
    });
    const res = [];
    for (const [name, pts] of [['front wheel', front], ['rear wheel', rear]]) {
      if (!pts.length) continue;
      const c = clearanceOf(pts, pts.length / 3, 0.4, true);
      if (c) res.push(rec('cycle', name, 'ride', `player cycle ${name} on ${lines[li].id} t=${(step * DT).toFixed(1)}s`, c, { speed: r3(st.speed) }));
    }
    return res;
  }
  function rideStep(ms) {
    if (!rig) return { done: true, error: 'no rig' };
    const tEnd = performance.now() + ms;
    if (li < 0 && !startLine()) return { done: true, steps: step };
    if (saved) d.setCycle(saved); // the game's own frame loop ran between evaluates: put the cycle back where the ride left it
    const stepEnd = step + 60;
    while (step < totalSteps && step < stepEnd && performance.now() < tEnd) {
      const pts = lines[li].pts;
      const st = d.cycleState();
      while (k < pts.length - 1 && Math.hypot(pts[k][0] - st.x, pts[k][1] - st.z) < 4) k++;
      const err = wrap(Math.atan2(pts[k][0] - st.x, pts[k][1] - st.z) - st.heading);
      d.stepCycle(DT, 1, Math.max(-1, Math.min(1, -err * 2)), false);
      step++; sOnLine++;
      if (step % 6 === 0) for (const r of sampleRig()) rideOut.push(r);
      let next = sOnLine >= 60 * 40 || (k >= pts.length - 1 && Math.hypot(pts[k][0] - st.x, pts[k][1] - st.z) < 4);
      if (sOnLine % 60 === 59) { if (Math.hypot(st.x - lastX, st.z - lastZ) < 1) { if (++stuck > 1) next = true; } else stuck = 0; lastX = st.x; lastZ = st.z; }
      if (next && !startLine()) { step = totalSteps; break; }
    }
    const s = d.cycleState(); saved = { x: s.x, z: s.z, heading: s.heading, speed: s.speed };
    return { done: step >= totalSteps, steps: step, of: totalSteps, line: li, samples: rideOut.length };
  }

  window.__gc = {
    classify, indexSurfaces, measureStatic, measureMovers, rideInit, rideStep,
    results: () => ({ staticOut, moverOut, rideOut, exemptOut, elevated, figElevated }),
  };
  return true;
}

const EXEMPT = [
  [/wallow/i, 'buffaloes wallowing in the pond: body deliberately under the water line'],
  [/rider|cyclist/i, 'riders sit on a moving cycle seat, not on the ground'],
  [/nostalgia_animals/i, 'merged roof monkeys + parapet peacock whose tail hangs down a wall'],
];

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--outDir', OUTDIR], { cwd: ROOT, stdio: 'pipe' });
  let browser = null, page = null, finished = false;
  const phases = {};
  const writeOut = async (reason) => {
    let res = null;
    if (page) res = await ev(page, 'results', () => (window.__gc ? window.__gc.results() : null), null, 20000).catch((e) => { log('results fetch failed: ' + e.message); return null; });
    return report(res, reason, phases);
  };
  const deadline = setTimeout(async () => {
    if (finished) return;
    log(`DEADLINE ${DEADLINE_S} s reached: writing partial results`);
    try { await writeOut(`partial: deadline ${DEADLINE_S} s`); } catch (e) { log(e.message); }
    server.kill(); process.exit(2);
  }, DEADLINE_S * 1000);
  let failures = 0;
  try {
    await waitForServer(BASE_URL);
    log('preview up');
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
    page = await browser.newPage({ viewport: { width: 640, height: 400 } });
    page.setDefaultTimeout(120000);
    page.on('pageerror', (e) => console.error('pageerror:', (e.stack || e.message).split('\n')[0]));
    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('#start-overlay.ready', { timeout: 60000 }).catch(() => log('start overlay not ready in 60 s, pressing Play anyway'));
    log('page loaded');
    await page.waitForFunction(() => {
      const d = window.__dopahar;
      if (d && d.zoneManager && d.dialogue) return true;
      const b = document.getElementById('play-btn');
      if (b) { b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.click(); }
      return false;
    }, null, { timeout: 180000, polling: 1000 });
    log('game started');
    await page.waitForTimeout(1500);
    log(`zones forced: ${await ev(page, 'forceZones', forceZones, null, 120000)} built`);
    const wait = +(process.env.GC_WAIT || 42000);
    log(`waiting ${wait / 1000} s for the game's own settle stage`);
    await page.waitForTimeout(5000 + wait);
    await ev(page, 'install', install, { exempt: EXEMPT.map(([re, why]) => [re.source, re.flags, why]) });
    phases.classify = await ev(page, 'classify', () => window.__gc.classify(), null, 60000);
    log('classified', JSON.stringify(phases.classify));

    const loop = async (label, call, arg, maxCalls = 2000) => {
      let r;
      for (let i = 0; i < maxCalls; i++) {
        r = await ev(page, label, call, arg, 30000);
        if (r.error) { log(`${label}: ${r.error}`); return r; }
        if (i % 10 === 0 || r.done) log(`${label}: ${JSON.stringify(r)}`);
        if (r.done) return r;
      }
      log(`${label}: stopped after ${maxCalls} slices`); return r;
    };
    phases.index = await loop('index surfaces', (ms) => window.__gc.indexSurfaces(ms), SLICE);
    phases.static = await loop('static props', (ms) => window.__gc.measureStatic(ms), SLICE);
    phases.figures = await loop('figures+vehicles (standing)', (ms) => window.__gc.measureMovers(ms, 'static', false), SLICE);

    if (RIDE) {
      const ri = await ev(page, 'rideInit', (s) => window.__gc.rideInit(s), SECONDS);
      log('ride init', JSON.stringify(ri));
      phases.rideInit = ri;
      if (!ri.error) {
        let r, liveSamples = 0;
        for (let i = 0; i < 4000; i++) {
          r = await ev(page, 'ride', (ms) => window.__gc.rideStep(ms), SLICE, 30000);
          if (i % 10 === 0 || r.done) log('ride', JSON.stringify(r));
          if (r.done || r.error) break;
          // live movers while riding (the frame loop moves people, herds, carts between evaluates); one full pass every 10 slices
          if (i % 6 === 3) {
            let m; let first = true;
            do { m = await ev(page, 'live movers', ({ ms, reset }) => window.__gc.measureMovers(ms, 'live', reset), { ms: SLICE, reset: first }, 30000); first = false; } while (!m.done);
            liveSamples++;
          }
          await page.waitForTimeout(150);
        }
        phases.ride = { ...r, liveSamples };
      }
    }
    failures = await writeOut('complete');
    finished = true;
  } catch (e) {
    log('ERROR: ' + e.message);
    try { failures = await writeOut('partial: ' + e.message); } catch (e2) { log(e2.message); }
    finished = true;
    failures = failures || 1;
  } finally {
    clearTimeout(deadline);
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }
  process.exit(failures ? 1 : 0);
}

const baseLabel = (r) => (r.mode === 'ride' ? 'player cycle ' + r.sub : r.label);
const TYPES = ['prop', 'pot', 'cart', 'vehicle', 'animal', 'person', 'cycle'];
function report(res, reason, phases) {
  mkdirSync(`${ROOT}tmp`, { recursive: true });
  if (!res) { writeFileSync(`${ROOT}tmp/ground-check.json`, JSON.stringify({ reason, phases, error: 'no results from page' }, null, 1)); log('no results'); return 1; }
  const standing = [...res.staticOut, ...res.moverOut.filter((r) => r.mode === 'static')];
  const moving = [...res.rideOut, ...res.moverOut.filter((r) => r.mode === 'live')];
  const isBad = (r) => r.clear < -LOW || r.clear > HIGH;
  // one entry per object (a mover sampled many times keeps its worst; static islands keyed by position too)
  const uniq = (rows) => {
    const m = new Map();
    for (const r of rows.filter(isBad)) {
      const key = r.type + '|' + baseLabel(r) + '|' + (r.mode === 'static' && r.verts ? r.at.join(',') : '');
      const w = m.get(key); if (!w || Math.abs(r.clear) > Math.abs(w.clear)) m.set(key, r);
    }
    return [...m.values()].sort((a, b) => Math.abs(b.clear) - Math.abs(a.clear));
  };
  const table = (rows) => {
    const u = uniq(rows);
    const t = {};
    for (const ty of TYPES) {
      const measured = rows.filter((r) => r.type === ty);
      const objs = new Set(measured.map((r) => baseLabel(r) + (r.verts ? r.at.join(',') : '')));
      const b = u.filter((r) => r.type === ty);
      t[ty] = { measured: objs.size, samples: measured.length, sunk: b.filter((r) => r.clear < 0).length, floating: b.filter((r) => r.clear > 0).length, sunkGround: b.filter((r) => r.clear < 0 && /ground$/.test(r.on)).length };
    }
    return { table: t, worst: u };
  };
  const S = table(standing), M = table(moving);
  const out = {
    date: new Date().toISOString(), reason, rule: `fail if lowest point > ${LOW * 100} cm below or > ${HIGH * 100} cm above the surface under it`,
    phases, elevatedStaticPieces: res.elevated, elevatedFigures: res.figElevated, exempt: res.exemptOut,
    standing: { counts: S.table, failures: S.worst.length, worst20: S.worst.slice(0, 20), all: S.worst.slice(0, 400) },
    ride: { counts: M.table, failures: M.worst.length, worst20: M.worst.slice(0, 20), all: M.worst.slice(0, 400) },
  };
  writeFileSync(`${ROOT}tmp/ground-check.json`, JSON.stringify(out, null, 1));

  const day = new Date().toISOString().slice(0, 10);
  const md = [];
  const fmtTable = (t) => {
    md.push('| type | objects measured | samples | sunk > 2 cm | of which into the ground (rest: into a plinth / road / step) | floating > 3 cm |', '|---|---:|---:|---:|---:|---:|');
    for (const ty of TYPES) md.push(`| ${ty} | ${t[ty].measured} | ${t[ty].samples} | ${t[ty].sunk} | ${t[ty].sunkGround} | ${t[ty].floating} |`);
  };
  const fmtWorst = (w) => {
    md.push('| # | cm | verdict | type | name | x, z | on |', '|---:|---:|---|---|---|---|---|');
    w.slice(0, 20).forEach((r, i) => md.push(`| ${i + 1} | ${(r.clear * 100).toFixed(1)} | ${r.clear < 0 ? 'SUNK' : 'FLOAT'} | ${r.type}${r.sub && r.sub !== r.type ? ' (' + r.sub + ')' : ''} | ${r.label.replace(/\|/g, '/')} | ${r.at.join(', ')} | ${String(r.on).replace(/\|/g, '/')} |`));
  };
  md.push(`# Ground check, ${day}`, '', `Tool: tools/ground-check.js (docs/PARALLEL.md G1). Run: ${reason}. Rule: ${out.rule}.`,
    `Raw data: tmp/ground-check.json. Elevated static pieces (shelf, roof, on another prop, or deliberate pit) not counted: ${res.elevated}. Figures with no surface within 1 m under them: ${res.figElevated}. Exempt figures: ${res.exemptOut.length}.`, '',
    `## Standing still: ${S.worst.length} objects off the ground`, '');
  fmtTable(S.table); md.push('', '### 20 worst, standing', ''); fmtWorst(S.worst);
  md.push('', `## During the scripted ride (${phases.ride ? `${phases.ride.steps} cycle steps of 1/60 s, ${phases.ride.liveSamples} live mover passes` : 'not run'}): ${M.worst.length} objects off the ground`, '');
  fmtTable(M.table); md.push('', '### 20 worst, riding', ''); fmtWorst(M.worst);
  md.push('', '## Notes', '', '- Surface = dug ground (src/dips.js) or the highest upward-facing triangle of any non-prop mesh at most 30 cm (props) / 40 cm (figures, vehicles, cycle) above the lowest point.',
    '- The cycle is split into front and rear half of the rig along its heading, so each line is one wheel. The rider capsule is excluded.',
    '- Static props are split into connected pieces, so a name can appear once per piece (one sunk pot in a merged pot mesh).');
  writeFileSync(`${ROOT}docs/ground-check-${day}.md`, md.join('\n') + '\n');

  console.log('\nSTANDING           measured  sunk  float');
  for (const ty of TYPES) console.log(`  ${ty.padEnd(9)} ${String(S.table[ty].measured).padStart(14)}  ${String(S.table[ty].sunk).padStart(4)}  ${String(S.table[ty].floating).padStart(5)}`);
  console.log('RIDING             measured  sunk  float');
  for (const ty of TYPES) console.log(`  ${ty.padEnd(9)} ${String(M.table[ty].measured).padStart(14)}  ${String(M.table[ty].sunk).padStart(4)}  ${String(M.table[ty].floating).padStart(5)}`);
  console.log('\n20 worst standing:'); for (const r of S.worst.slice(0, 20)) console.log(`  ${(r.clear * 100).toFixed(1).padStart(7)} cm ${r.type} ${r.label} (${r.at.join(', ')}) on ${r.on}`);
  console.log('20 worst riding:'); for (const r of M.worst.slice(0, 20)) console.log(`  ${(r.clear * 100).toFixed(1).padStart(7)} cm ${r.type} ${r.label} (${r.at.join(', ')}) on ${r.on}`);
  console.log(`\nGROUND CHECK (${reason}): standing ${S.worst.length} off, riding ${M.worst.length} off. ${((Date.now() - T0) / 1000).toFixed(0)} s.`);
  return S.worst.length + M.worst.length;
}

main().catch((e) => { console.error(e); process.exit(1); });
