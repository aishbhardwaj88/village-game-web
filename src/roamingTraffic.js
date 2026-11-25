/**
 * Roaming traffic (26 Nov 2026, her order): autos, tuk tuks, motorbikes, mopeds and bicycles ROAM the village roads. Moving vehicles are
 * exempt from the roads-must-be-empty rule (parked ones are not, src/villageVehicles.js). No colliders, no new characters, no money.
 *
 * A small pool (MAX_ACTIVE) spawns on road polylines SPAWN_MIN..SPAWN_MAX m from the player and despawns past DESPAWN m, so the cost far
 * away is one distance check per vehicle. Each follows a road centreline on its LEFT (LANE_OFFSET m, India drives on the left), eases
 * round corners, picks a joining road (or turns round) at the end, brakes to a stop when the player or another roaming vehicle is within
 * BRAKE_DIST m ahead and resumes, and despawns after STUCK_S seconds stopped. Never rams, never pushes the player.
 * Models load lazily, one GLB request per file, the first time that file is picked (call createRoamingTraffic AFTER Play); clones share
 * geometry and materials. Bikes/bicycles/mopeds take VEHICLE_PAINT colours (src/vehicleVariants.js); autos and tuk tuks are never recoloured.
 * Riders/drivers are the existing villager builder (src/characters.js buildVillager), scaled and lowered to the seat, pooled and reused.
 * Wheels do not spin: the slimmed GLBs have no separate wheel nodes (bicycle: one merged `rama_low_whell_0` mesh).
 * The pure path maths (buildRoamPaths, laneAt) is exported so tools/roaming-check.mjs tests exactly what runs in the game.
 */
import * as THREE from 'three';
import { getRoads } from './layout/layout.js';
import { VEHICLE_PAINT, applyVehicleColour } from './vehicleVariants.js';
import { footOffsetY } from './vehicleFit.js';
import { createVehicleShadowSet, vehicleSurfaceY } from './vehicleContactShadow.js';

export const LANE_OFFSET = 1.2;
export const ROAM_KINDS = new Set(['highway', 'road', 'lane']);
export const MIN_ROAD_WIDTH = 3.5;
const MAX_ACTIVE = 8, SPAWN_MIN = 18, SPAWN_MAX = 70, DESPAWN = 90, BRAKE_DIST = 6, STUCK_S = 12, SHADOW_NEAR = 0;
const JOIN_TOL = 4; // m: a road whose end lies this close to our end is a joining road

// file, length (m, as the parked ones in villageVehicles.js), width, which model axis is long (x: nose +x, needs -90 deg), speed range m/s, seat [y, z, scale]
const KINDS = {
  bicycle:       { len: 1.7, wid: 0.6, axis: -Math.PI / 2, speed: [2, 3], seat: [0.23, -0.1, 0.9], cat: 'cycle' },
  motorbike:     { len: 2.1, wid: 0.8, axis: -Math.PI / 2, speed: [4, 6], seat: [0.08, -0.1, 0.9], cat: 'bike' },
  moped:         { len: 2.0, wid: 0.7, axis: Math.PI, speed: [4, 6], seat: [0.03, -0.05, 0.9], cat: 'bike' },
  auto_rickshaw: { len: 2.6, wid: 1.4, axis: Math.PI, speed: [3, 5], seat: [-0.1, 0.55, 0.88], cat: 'auto' },
  tuk_tuk:       { len: 2.7, wid: 1.4, axis: 0, speed: [3, 5], seat: [-0.1, 0.55, 0.88], cat: 'auto' },
};
const CATS = { cycle: ['bicycle'], bike: ['motorbike', 'moped'], auto: ['auto_rickshaw', 'tuk_tuk'] };
const MIX = [['cycle', 0.35], ['bike', 0.30], ['auto', 0.35]];
const BUSY = /^(main_road|ring_road|cross_road|highway|.*bazaar.*|.*chauraha.*)/i; // roads with the most traffic character: weighted 3x
const FRONT_CLEAR = 25; // m: never spawn inside the player's forward view cone closer than this

// ---------------------------------------------------------------- pure path maths (no browser)
/** Drivable polylines: highway / road / lane kinds at least MIN_ROAD_WIDTH wide. [{ id, w, pts, cum, len }] */
export function buildRoamPaths(roads = getRoads()) {
  const out = [];
  for (const r of roads) {
    if (!ROAM_KINDS.has(r.kind) || (r.width || 4) < MIN_ROAD_WIDTH || r.pts.length < 2) continue;
    const cum = [0];
    for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
    if (cum[cum.length - 1] < 12) continue;
    out.push({ id: r.id, w: r.width || 4, pts: r.pts, cum, len: cum[cum.length - 1] });
  }
  return out;
}
/** Centreline point at arc length s (clamped): { x, z }. */
export function pointAt(path, s) {
  s = Math.max(0, Math.min(path.len, s));
  let i = 1;
  while (i < path.cum.length - 1 && path.cum[i] < s) i++;
  const a = path.pts[i - 1], b = path.pts[i], seg = path.cum[i] - path.cum[i - 1] || 1, t = (s - path.cum[i - 1]) / seg;
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t };
}
/**
 * Lane position at arc length s travelling in direction dir (+1 / -1 along the polyline): the centreline point pushed LANE_OFFSET m to the
 * left of travel. Heading uses the chord from 2 m behind to 2 m ahead, which rounds the corners. Returns { x, z, cx, cz, yaw } (yaw: forward = (sin, cos)).
 */
export function laneAt(path, s, dir, offset = LANE_OFFSET) {
  const c = pointAt(path, s), a = pointAt(path, s - 2 * dir), b = pointAt(path, s + 2 * dir);
  let fx = b.x - a.x, fz = b.z - a.z; const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
  return { x: c.x + fz * offset, z: c.z - fx * offset, cx: c.x, cz: c.z, yaw: Math.atan2(fx, fz) }; // left of forward (fx, fz) is (fz, -fx)
}

// ---------------------------------------------------------------- runtime
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const HEX = (file) => { const p = VEHICLE_PAINT[`${file}.glb`]; return p && p.mode !== 'none' ? p.palette : null; };
const RIDERS = [ // buildVillager options (existing figure builder), cycled
  { skin: 0xa8795a, shirt: 0x3b6ea5, lower: 'trousers', lowerColor: 0x3a3f4a, mustache: true },
  { skin: 0xb98a62, shirt: 0xe8e0c8, lower: 'trousers', lowerColor: 0x4a4a52, hair: 0x2a2a2a },
  { skin: 0xc4956a, shirt: 0xd9a21e, lower: 'lungi', lowerColor: 0x2e6e4a, mustache: true },
  { skin: 0xa8795a, shirt: 0x7a2f35, lower: 'trousers', lowerColor: 0x2a2f3a, cap: 0xe8d8b0 },
  { skin: 0xb98a62, shirt: 0x5a7a4a, lower: 'trousers', lowerColor: 0x3a3a4a, hair: 0x1c1712 },
];

export function createRoamingTraffic(scene, { getPlayer, groundAt }) {
  const paths = buildRoamPaths();
  const totalLen = paths.reduce((s, p) => s + p.len, 0);
  const root = new THREE.Group(); root.name = 'roaming_traffic'; scene.add(root);
  const models = new Map(); // file -> { state: 'loading' | 'ready' | 'failed', tpl }
  const riderFree = []; let riderMade = 0, buildVillagerFn = null;
  const active = [];
  const shadowSet = createVehicleShadowSet(MAX_ACTIVE + 4, 'roaming_vehicle_shadows'); root.add(shadowSet.mesh); // one draw call for every roaming vehicle's blob
  const shadowSlots = Array.from({ length: MAX_ACTIVE + 4 }, (_, i) => i); // free instance slots
  const loaded = new Set(); let lastError = null, lastPP = null, fwd = null; // fwd: player's recent heading (x, z), the view direction proxy
  if (typeof window !== 'undefined') window.__roaming = { active: () => active.length, loaded: () => [...loaded], get lastError() { return lastError; } };
  let spawnT = 0, clock = 0;
  let seed = 90210;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  async function loadModel(file) {
    const prev = models.get(file); models.set(file, { state: 'loading', tries: prev && prev.tries ? prev.tries : 0 });
    try {
      const { fetchModel, getGLTFLoader, assetUrl, exemptModelUrls } = await import('./loaders.js');
      if (!buildVillagerFn) buildVillagerFn = (await import('./characters.js')).buildVillager;
      const url = assetUrl(`assets/vehicles_free/${file}.glb`); exemptModelUrls.add(url);
      const g = await getGLTFLoader().parseAsync(await fetchModel(url), url.slice(0, url.lastIndexOf('/') + 1));
      const m = g.scene; m.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
      const k = KINDS[file].len / Math.max(size.x, size.z);
      const fix = new THREE.Group(); // model axis fix, then centred and scaled, feet on y = 0
      m.scale.multiplyScalar(k); m.position.set(-ctr.x * k, footOffsetY(file, box.min.y, size.y, k), -ctr.z * k); // tyre contact on y 0, not Box3.min.y
      fix.add(m); fix.rotation.y = KINDS[file].axis;
      models.set(file, { state: 'ready', tpl: fix }); loaded.add(file);
    } catch (e) {
      console.warn('[roamingTraffic] model failed', file, e); lastError = `${file}: ${e && e.message || e}`;
      const tries = (models.get(file).tries || 0) + 1; models.set(file, { state: 'failed', tries });
      if (tries < 2) setTimeout(() => { if (models.get(file).state === 'failed') loadModel(file); }, 10000); // retry once after 10 s
    }
  }
  const ready = (f) => { const m = models.get(f); if (!m) { loadModel(f); return false; } return m.state === 'ready'; };
  const usable = (f) => { const m = models.get(f); return !m || m.state !== 'failed'; };
  // preload all five at Play start, one at a time, in the background (a failure never blocks the next)
  (async () => { for (const f of Object.keys(KINDS)) { if (!models.has(f)) await loadModel(f); } })();

  function takeRider() {
    if (riderFree.length) return riderFree.pop();
    if (!buildVillagerFn) return null;
    const b = buildVillagerFn(RIDERS[riderMade++ % RIDERS.length]);
    b.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    return b.root;
  }
  function setShadows(v, on) { if (v.shadows === on) return; v.shadows = on; v.model.traverse((o) => { if (o.isMesh) { o.castShadow = on; o.receiveShadow = on; } }); }

  function pickFile() {
    let r = rnd(), cat = MIX[MIX.length - 1][0];
    for (const [c, p] of MIX) { if (r < p) { cat = c; break; } r -= p; }
    const files = CATS[cat].slice().sort(() => rnd() - 0.5);
    for (const f of files) if (ready(f)) return f; // loading or failed kinds are skipped; the others still spawn
    for (const c of Object.keys(CATS)) for (const f of CATS[c]) if (models.get(f) && models.get(f).state === 'ready') return f; // nothing of this category yet: any loaded kind
    return null;
  }
  function randomSpot(pp) {
    const wts = paths.map((p) => (BUSY.test(String(p.id)) ? 3 : 1)), wsum = wts.reduce((x, y) => x + y, 0);
    for (let tries = 0; tries < 40; tries++) {
      let r = rnd() * wsum, pi = 0;
      for (; pi < paths.length - 1; pi++) { if (r < wts[pi]) break; r -= wts[pi]; }
      const path = paths[pi];
      const s = 4 + rnd() * Math.max(1, path.len - 8), dir = rnd() < 0.5 ? 1 : -1, q = laneAt(path, s, dir), dx = q.x - pp.x, dz = q.z - pp.z, d = Math.hypot(dx, dz);
      if (d < SPAWN_MIN || d > SPAWN_MAX) continue;
      if (fwd && d < FRONT_CLEAR && (dx * fwd.x + dz * fwd.z) / d > 0.5) continue; // not in view right in front of the camera
      if (d > 80 && rnd() < 0.5) continue; // weight toward 25-80 m
      if (d < 25 && rnd() < 0.6) continue;
      if (active.some((v) => Math.hypot(v.x - q.x, v.z - q.z) < 9)) continue;
      return { path, s, dir, q };
    }
    return null;
  }
  function spawn(pp) {
    if (!paths.length) return;
    const file = pickFile(); if (!file) return;
    if (!shadowSlots.length) return;
    const spot = randomSpot(pp); if (!spot) return;
    const K = KINDS[file], rider = takeRider(); if (!rider) return;
    const model = models.get(file).tpl.clone(true); // shares geometry and materials
    const hexes = HEX(file);
    if (hexes && K.cat !== 'auto') applyVehicleColour(model, `${file}.glb`, hexes[Math.floor(rnd() * hexes.length)]);
    const holder = new THREE.Group(), sway = new THREE.Group();
    holder.name = `roam_${file}`; holder.add(sway); sway.add(model);
    rider.position.set(0, K.seat[0], K.seat[1]); rider.scale.setScalar(K.seat[2]); sway.add(rider);
    root.add(holder);
    const q = spot.q;
    const v = { file, K, holder, sway, model, rider, path: spot.path, s: spot.s, dir: spot.dir, x: q.x, z: q.z, yaw: q.yaw, ex: 0, ez: 0, speed: 0,
      slot: shadowSlots.pop(), cruise: K.speed[0] + rnd() * (K.speed[1] - K.speed[0]), stopT: 0, phase: rnd() * 6.28, shadows: true };
    setShadows(v, false);
    const sy = vehicleSurfaceY(groundAt, v.x, v.z);
    holder.position.set(v.x, sy, v.z); holder.rotation.y = v.yaw; shadowSet.place(v.slot, v.x, sy, v.z, v.yaw, K.len, K.wid);
    active.push(v);
  }
  function remove(i) {
    const v = active[i]; shadowSet.hide(v.slot); shadowSlots.push(v.slot); root.remove(v.holder); v.sway.remove(v.rider); riderFree.push(v.rider); active.splice(i, 1);
  }
  // end of the polyline: take a joining road at random, else turn round (the lane flips with the direction)
  function nextRoad(v) {
    const endS = v.dir > 0 ? v.path.len : 0, e = pointAt(v.path, endS), opts = [];
    for (const p of paths) {
      if (p === v.path) continue;
      const a = p.pts[0], b = p.pts[p.pts.length - 1];
      if (Math.hypot(a[0] - e.x, a[1] - e.z) < JOIN_TOL) opts.push({ path: p, s: 0.5, dir: 1 });
      else if (Math.hypot(b[0] - e.x, b[1] - e.z) < JOIN_TOL) opts.push({ path: p, s: p.len - 0.5, dir: -1 });
    }
    const o = opts.length ? opts[Math.floor(rnd() * opts.length)] : null;
    if (o) { v.path = o.path; v.s = o.s; v.dir = o.dir; } else { v.dir = -v.dir; v.s = endS + v.dir * 0.5; }
  }

  function update(dt) {
    if (!(dt > 0) || !paths.length) return;
    dt = Math.min(dt, 0.1); clock += dt;
    const pl = getPlayer && getPlayer(); const pp = pl ? (pl.position || pl) : null;
    if (!pp) return;
    if (lastPP) { const mx = pp.x - lastPP.x, mz = pp.z - lastPP.z, ml = Math.hypot(mx, mz); if (ml > 0.02) fwd = { x: mx / ml, z: mz / ml }; }
    lastPP = { x: pp.x, z: pp.z };
    spawnT -= dt;
    if (spawnT <= 0) { spawnT = active.length < MAX_ACTIVE ? 0.35 : 0.7; if (active.length < MAX_ACTIVE) spawn(pp); }
    for (let i = active.length - 1; i >= 0; i--) {
      const v = active[i], dp = Math.hypot(v.x - pp.x, v.z - pp.z);
      if (dp > DESPAWN || v.stopT > STUCK_S) { remove(i); continue; }
      const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
      let blocked = false;
      const ahead = (ox, oz) => { const dx = ox - v.x, dz = oz - v.z, a = dx * fx + dz * fz; return a > 0 && a < BRAKE_DIST && Math.abs(dx * fz - dz * fx) < 1.5; };
      if (ahead(pp.x, pp.z)) blocked = true;
      else for (const o of active) if (o !== v && ahead(o.x, o.z)) { blocked = true; break; }
      // corner slow-down from the heading change still to come
      const lead = laneAt(v.path, v.s + v.dir * 4, v.dir), turn = Math.min(1, Math.abs(wrap(lead.yaw - v.yaw)) / 0.9);
      const target = blocked ? 0 : v.cruise * (1 - 0.45 * turn);
      v.speed += Math.max(-6 * dt, Math.min(3 * dt, target - v.speed));
      v.stopT = v.speed < 0.1 && blocked ? v.stopT + dt : 0;
      v.s += v.dir * v.speed * dt;
      if (v.s <= 0 || v.s >= v.path.len) {
        const oldX = v.x, oldZ = v.z; nextRoad(v);
        const q = laneAt(v.path, v.s, v.dir); v.ex = oldX - q.x; v.ez = oldZ - q.z; // glide across the joint instead of popping
      }
      const q = laneAt(v.path, v.s, v.dir), k = Math.exp(-dt * 5);
      v.ex *= k; v.ez *= k;
      v.x = q.x + v.ex; v.z = q.z + v.ez;
      v.yaw += wrap(q.yaw - v.yaw) * Math.min(1, dt * 6);
      const g = vehicleSurfaceY(groundAt, v.x, v.z); // terrain or the drawn road surface, whichever is higher (the road lies 2 to 7 cm above groundAt)
      v.holder.position.set(v.x, g, v.z); v.holder.rotation.y = v.yaw; shadowSet.place(v.slot, v.x, g, v.z, v.yaw, v.K.len, v.K.wid);
      const moving = Math.min(1, v.speed / 3), lean = v.K.cat === 'cycle' ? 0.03 : 0.012;
      v.sway.rotation.z = Math.sin(clock * 2.6 + v.phase) * lean * moving - wrap(q.yaw - v.yaw) * 0.25 * moving * (v.K.cat === 'auto' ? 0.15 : 1);
      v.sway.rotation.x = Math.sin(clock * 5.1 + v.phase) * 0.008 * moving;
      setShadows(v, dp < SHADOW_NEAR - (v.shadows ? 0 : 3));
    }
  }
  return { update, active };
}
