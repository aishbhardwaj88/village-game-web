#!/usr/bin/env node
/**
 * Collision test (art director, 25 Oct 2026: "a screenshot cannot prove this").
 * Drives the REAL movement resolver (src/movement.js, through window.__dopahar.stepPlayerMove /
 * stepVehicle, the same functions the per-frame loop calls) at every solid object in the live scene
 * and fails on any pass-through. Four parts:
 *
 *   1. STATIC    every collider box the live scene produced, from 4 directions x 3 lateral offsets x
 *                3 speeds (walk, run, lag-spike frame). Fail = the player circle enters the box.
 *   2. DYNAMIC   the same for every vehicle / trolley box the player-vs-vehicle path uses, and a check
 *                that each vehicle's VISIBLE footprint is covered by its collision box.
 *   3. VEHICLES  tractor (forward + reverse, trolley attached), bike and cart driven into every
 *                solid object from 4 directions. Fail = the oriented body overlaps the box.
 *   4. NPCS      every NPC route walked through the real resolver; fail = it gets stuck inside a solid
 *                or ends up off its path (a route through a wall).
 *   5. COVERAGE  the part that catches MISSING colliders: independent of the collider list, every
 *                opaque visible mesh in the player's body band (0.35-1.5 m) is sampled to a 0.4 m grid
 *                and each cell must lie inside some collider, unless its material/source is on the
 *                NON_SOLID list below (crops, grass, foliage cards - things the brief says are walkable).
 *                Anything left is a solid-looking object the player walks through.
 *
 * Usage: npm run build && node tools/collision-test.js   (also runs at the end of `npm run build`)
 * Exit code 1 on any failure. Final line is the summary to paste in the commit message.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import { NON_SOLID_RULES, SKIP_TOP } from '../src/solidRules.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5199;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;

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

// What counts as deliberately walkable lives in src/solidRules.js and is shared with the game, so the test cannot drift from it.
const NON_SOLID = NON_SOLID_RULES;
const SKIP_TOP_RE = SKIP_TOP;

/** Builds and shows every streamed zone and stops the zone manager from tearing them down again, so the test sees the
 * whole village at once (src/zoneManager.js only keeps zones near the player). Async content (Blender .glb slot swaps)
 * needs a moment to arrive, hence a separate call and a wait before the checks run. */
function forceZones() {
  const d = window.__dopahar;
  d.zoneManager.update = () => {}; // the frame loop calls zoneManager.update(); freeze it so forced zones stay put
  for (const z of d.zoneManager.zones.values()) {
    if (!z.active) {
      const built = z.build();
      const plain = built.isObject3D;
      z.group = plain ? built : built.group;
      z.onFrame = plain ? null : built.onFrame || null;
      d.scene.add(z.group);
      z.active = true;
    }
    z.group.visible = true;
    z.group.userData.zoneHidden = false;
  }
}

// ---- everything below the marker runs inside the page ----
function inPage(cfg) {
  const d = window.__dopahar;
  const R = d.playerRadius;
  // Zone-streamed content (src/zoneManager.js) only exists near the player. Build and show EVERY zone, then rebuild the
  // collider list exactly as the zone manager does after a change, so streamed objects are tested too. This all runs
  // inside this one evaluate, so the game's frame loop cannot tear a zone down again before the checks finish.
  const zonesForced = d.zoneManager.zones.size; // built and shown by forceZones() before this runs
  d.rebuildColliders();
  const all = d.getStaticColliders();

  // ---------- helpers ----------
  const radiusFor = (b, r) => (b.auto && r > d.autoBodyRadius ? d.autoBodyRadius : r); // derived prop boxes are soft (src/collision.js)
  const boxDist = (x, z, b) => {
    const dx = Math.max(b.minX - x, 0, x - b.maxX);
    const dz = Math.max(b.minZ - z, 0, z - b.maxZ);
    if (dx === 0 && dz === 0) return -Math.min(x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z) - 1e-6; // inside
    return Math.hypot(dx, dz);
  };
  const near = (cx, cz, r, extra) => all.filter((b) => b.maxX > cx - r && b.minX < cx + r && b.maxZ > cz - r && b.minZ < cz + r || extra === b);
  const fmt = (b) => `box x[${b.minX.toFixed(2)},${b.maxX.toFixed(2)}] z[${b.minZ.toFixed(2)},${b.maxZ.toFixed(2)}]`;
  const label = (b) => {
    const a = d.getBuildingFootprints().reduce((best, f) => {
      const dd = Math.hypot((f.minX + f.maxX) / 2 - (b.minX + b.maxX) / 2, (f.minZ + f.maxZ) / 2 - (b.minZ + b.maxZ) / 2);
      return dd < best.dd ? { dd, n: f.name } : best;
    }, { dd: Infinity, n: '?' });
    return `${fmt(b)} (nearest building: ${a.n}, ${a.dd.toFixed(0)} m)`;
  };
  // oriented rect (halfW along local X, halfD along local Z, yaw) vs AABB: penetration depth along the shallowest axis (0 if apart)
  const obbPen = (x, z, yaw, hw, hd, b) => {
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2, ex = (b.maxX - b.minX) / 2, ez = (b.maxZ - b.minZ) / 2;
    const dx = x - cx, dz = z - cz, c = Math.cos(yaw), s = Math.sin(yaw);
    let min = Infinity;
    for (const [ax, az] of [[1, 0], [0, 1], [c, -s], [s, c]]) {
      const ov = Math.abs(ex * ax) + Math.abs(ez * az) + Math.abs(hw * (c * ax - s * az)) + Math.abs(hd * (s * ax + c * az)) - Math.abs(dx * ax + dz * az);
      if (ov <= 0) return 0;
      if (ov < min) min = ov;
    }
    return min;
  };

  // ---------- 1+2. player into every box ----------
  const SPEEDS = [['walk', 1 / 60], ['run', 1 / 30], ['lag-spike', 0.2]];
  const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // direction of travel; start is on the opposite side
  const SLACK = 0.05;
  function playerAt(boxes, label0) {
    const fails = [];
    let tested = 0, skipped = 0, boxesWithTests = 0;
    const seen = new Set();
    for (const b of boxes) {
      const key = [b.minX, b.maxX, b.minZ, b.maxZ].map((v) => v.toFixed(2)).join();
      if (seen.has(key)) continue;
      seen.add(key);
      if (!(b.maxX > b.minX) || !(b.maxZ > b.minZ)) continue;
      const nb = near((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2, 22, b);
      d.setStaticColliders(nb);
      let any = false;
      let failed = null;
      for (const [dx, dz] of DIRS) {
        const along = dx === 0 ? b.maxX - b.minX : b.maxZ - b.minZ; // lateral extent
        const lat = along > 4 ? [-0.3, 0, 0.3] : [0];
        const depth = dx === 0 ? b.maxZ - b.minZ : b.maxX - b.minX;
        for (const lo of lat) {
          const midX = (b.minX + b.maxX) / 2, midZ = (b.minZ + b.maxZ) / 2;
          const px = dx === 0 ? midX + lo * along : (dx > 0 ? b.minX - 2.5 - R : b.maxX + 2.5 + R);
          const pz = dz === 0 ? midZ + lo * along : (dz > 0 ? b.minZ - 2.5 - R : b.maxZ + 2.5 + R);
          for (const [sname, dt] of SPEEDS) {
            d.player.position.set(px, 0, pz);
            // start must be free of everything (otherwise this approach is shadowed by a neighbour)
            if (nb.some((o) => boxDist(px, pz, o) < radiusFor(o, R))) { skipped++; continue; }
            any = true; tested++;
            const steps = Math.ceil((5 + depth + 2 * R) / (4.2 * dt)) + 10;
            for (let i = 0; i < steps; i++) {
              const p = d.stepPlayerMove(dt, dx, dz);
              const dist = boxDist(p.x, p.z, b);
              const Rb = radiusFor(b, R);
              if (dist < Rb - SLACK) {
                failed = { label: label0, box: b, dir: [dx, dz], speed: sname, at: [p.x, p.z], pen: Rb - dist, inside: dist < 0 };
                break;
              }
            }
            if (failed) break;
          }
          if (failed) break;
        }
        if (failed) break;
      }
      d.setStaticColliders(all);
      if (any) boxesWithTests++;
      if (failed) fails.push(failed);
      else if (!any) fails.push({ label: label0, box: b, enclosed: true });
    }
    return { fails, tested, skipped, boxesWithTests, boxes: seen.size };
  }

  d.setStaticColliders(all);
  const T0 = performance.now(); const tick = (n) => console.log('[collision-test] ' + n + ' done at ' + ((performance.now() - T0) / 1000).toFixed(1) + ' s');
  const stat = playerAt(all, 'static');
  tick('part 1');
  const staticFails = stat.fails.filter((f) => !f.enclosed);
  const enclosed = stat.fails.filter((f) => f.enclosed);

  // dynamic boxes (vehicles, trolley) - drive the player at them with the live scene colliders in place
  const dynBoxes = d.getDynamicBoxes();
  const dynFails = [];
  let dynTested = 0;
  for (const b of dynBoxes) {
    if (!(b.maxX > b.minX)) continue;
    const nb = near((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2, 22, null);
    d.setStaticColliders(nb);
    let failed = null;
    for (const [dx, dz] of DIRS) {
      for (const [sname, dt] of SPEEDS) {
        const px = dx === 0 ? (b.minX + b.maxX) / 2 : (dx > 0 ? b.minX - 2.5 - R : b.maxX + 2.5 + R);
        const pz = dz === 0 ? (b.minZ + b.maxZ) / 2 : (dz > 0 ? b.minZ - 2.5 - R : b.maxZ + 2.5 + R);
        d.player.position.set(px, 0, pz);
        if (nb.some((o) => boxDist(px, pz, o) < radiusFor(o, R))) continue;
        dynTested++;
        const steps = Math.ceil(12 / (4.2 * dt));
        for (let i = 0; i < steps && !failed; i++) {
          const p = d.stepPlayerMove(dt, dx, dz);
          if (boxDist(p.x, p.z, b) < radiusFor(b, R) - SLACK) failed = { box: b, dir: [dx, dz], speed: sname, at: [p.x, p.z] };
        }
        if (failed) break;
      }
      if (failed) break;
    }
    d.setStaticColliders(all);
    if (failed) dynFails.push(failed);
  }
  tick('part 2a');
  // visible vehicle footprint vs the box the resolver uses
  const vehicleCover = [];
  for (const v of d.vehicles) {
    const vs = d.getVehicleSolids().find((e) => e.kind === v.preset.kind);
    const bx = new d.Box3().setFromObject(v.group, true);
    const box = {
      minX: Math.min(...vs.boxes.map((b) => b.minX)), maxX: Math.max(...vs.boxes.map((b) => b.maxX)),
      minZ: Math.min(...vs.boxes.map((b) => b.minZ)), maxZ: Math.max(...vs.boxes.map((b) => b.maxZ)),
    };
    const over = Math.max(box.minX - bx.min.x, bx.max.x - box.maxX, box.minZ - bx.min.z, bx.max.z - box.maxZ);
    // bodies are oriented rects inside an AABB, so allow the visible AABB to exceed the box by up to 0.35 m
    if (over > 0.35) vehicleCover.push({ kind: v.preset.kind, why: `visible mesh sticks out ${over.toFixed(2)} m past its collision box` });
  }

  // ---------- 3. vehicles into every solid ----------
  const vehFails = [];
  let vehTested = 0;
  const vehicleKinds = d.vehicles.map((v) => v.preset.kind);
  // Vehicles are driven at every hand-tagged solid and every derived rect over 2 m long, plus 1 in 8 of the small derived
  // rects (hundreds of 0.3 m cells of the same fence add nothing a longer rect of it does not already prove).
  const seenKey = new Set();
  const bigBoxes = all.filter((b, i) => {
    if (!(b.maxX > b.minX && b.maxZ > b.minZ)) return false;
    const k = [b.minX, b.maxX, b.minZ, b.maxZ].map((v) => v.toFixed(2)).join();
    if (seenKey.has(k)) return false;
    seenKey.add(k);
    return !b.auto || b.maxX - b.minX >= 2 || b.maxZ - b.minZ >= 2 || i % 8 === 0;
  });
  const saveVeh = d.vehicles.map((v) => ({ kind: v.preset.kind, x: v.group.position.x, z: v.group.position.z, yaw: v.group.rotation.y }));
  for (const kind of (cfg.skipVehicles ? [] : vehicleKinds)) {
    const veh = d.vehicles.find((v) => v.preset.kind === kind);
    const asm = veh.preset.assembly || null;
    const hw = asm ? asm.hw : veh.preset.body.w / 2, hd = asm ? asm.hd : veh.preset.body.d / 2;
    const lzc = asm ? asm.cz : 0; // local-z of the oriented rect's centre
    const rad = Math.hypot(hw, hd);
    const modes = kind === 'tractor' ? [['fwd', -1], ['rev', 1]] : [['fwd', -1]];
    // which way does throttle -1 send a vehicle at yaw 0 ?
    d.setStaticColliders([]);
    d.teleportVehicle(kind, 0, 0, 0);
    for (let i = 0; i < 20; i++) d.stepVehicle(kind, 1 / 60, -1, 0);
    const fwdHead = Math.atan2(veh.group.position.x, veh.group.position.z); // heading of forward at yaw 0
    d.setStaticColliders(all);
    for (const [bi, b] of bigBoxes.entries()) {
      if (b.maxX - b.minX < 0.3 && b.maxZ - b.minZ < 0.3 && false) continue;
      const nb = near((b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2, 30, b);
      let failed = null;
      for (const [dx, dz] of DIRS) {
        for (const [mname, thr] of modes) {
          const dist0 = 9 + Math.max(hw, hd);
          const mx = (b.minX + b.maxX) / 2, mz = (b.minZ + b.maxZ) / 2;
          const sx = dx === 0 ? mx : (dx > 0 ? b.minX - dist0 : b.maxX + dist0);
          const sz = dz === 0 ? mz : (dz > 0 ? b.minZ - dist0 : b.maxZ + dist0);
          // vehicle moves along heading; for 'rev' it moves opposite to forward, so face away from the box
          const want = Math.atan2(dx, dz) + (thr > 0 ? Math.PI : 0);
          const yaw = want - fwdHead;
          d.setStaticColliders(nb);
          if (Math.abs(sx) > d.groundHalfExtent - 1 || Math.abs(sz) > d.groundHalfExtent - 1) continue; // the world edge clamps the start
          if (!d.teleportVehicle(kind, sx, sz, yaw)) continue; // trolley rest spot blocked: not a valid start
          if (nb.some((o) => obbPen(sx + lzc * Math.sin(yaw), sz + lzc * Math.cos(yaw), yaw, hw + 0.2, hd + 0.2, o) > 0)) continue;
          vehTested++;
          let still = 0;
          for (let i = 0; i < 700 && !failed; i++) {
            const prev = veh.group.position.x + veh.group.position.z;
            d.stepVehicle(kind, 1 / 60, thr, 0);
            const px = veh.group.position.x, pz = veh.group.position.z, py = veh.group.rotation.y;
            const pen = (kind === 'tractor' || asm) ? obbPen(px + lzc * Math.sin(py), pz + lzc * Math.cos(py), py, hw, hd, b) : Math.max(0, rad - boxDist(px, pz, b));
            if (pen > 0.1) failed = { kind, mname, box: b, dir: [dx, dz], at: [px, pz], pen };
            if (Math.abs(prev - (px + pz)) < 1e-5) { if (++still > 30) break; } else still = 0;
          }
          if (kind === 'tractor') {
            // the trolley rides behind (fwd) or leads (rev): same test for its own footprint
            const t = d.currentTrolley();
            if (t && !failed) {
              const he = d.getTrolleyHalfExtents();
              const pen = obbPen(t.x, t.z, t.yaw, he.halfW, he.halfD, b);
              if (pen > 0.1) failed = { kind: 'trolley(' + mname + ')', mname, box: b, dir: [dx, dz], at: [t.x, t.z], pen };
            }
          }
          d.setStaticColliders(all);
          if (failed) break;
        }
        if (failed) break;
      }
      d.setStaticColliders(all);
      if (failed) vehFails.push(failed);
    }
  }
  for (const s of saveVeh) d.teleportVehicle(s.kind, s.x, s.z, s.yaw);
  d.setStaticColliders(all);

  tick('part 3');
  // ---------- 4. NPC routes through the real resolver ----------
  const npcFails = [];
  let npcLegs = 0, roofLegs = 0;
  for (const route of d.npcRoutes) {
    const wps = route.waypoints;
    if (!wps || wps.length < 2) continue;
    const pos = new d.Vector3(wps[0].x, 0, wps[0].z);
    const n = route.kind === 'loop' ? wps.length : wps.length - 1;
    for (let i = 0; i < n; i++) {
      const a = wps[i], b = wps[(i + 1) % wps.length];
      if (a == null || b == null) continue;
      if ((a.y ?? 0) > 0.5 || (b.y ?? 0) > 0.5) { // rooftop legs: the NPC walks over the walls on purpose (see createWaypointRun)
        roofLegs++; // collision is 2D with no box heights, so the legs can't be walked; but each ground-level end must not sit inside a solid
        for (const e of [a, b]) {
          if ((e.y ?? 0) > 0.5) continue;
          const bad = near(e.x, e.z, 4, null).find((o) => boxDist(e.x, e.z, o) < radiusFor(o, route.radius) - SLACK);
          if (bad) npcFails.push({ route: route.name, leg: i, from: [a.x, a.z], to: [b.x, b.z], insideSolid: (bad.src || 'hand-tagged') + ' (rooftop-leg ground end)' });
        }
        continue;
      }
      pos.set(a.x, 0, a.z);
      npcLegs++;
      const nbx = near((a.x + b.x) / 2, (a.z + b.z) / 2, Math.hypot(b.x - a.x, b.z - a.z) / 2 + 6, null);
      d.setStaticColliders(nbx);
      // a waypoint inside a solid is itself the bug
      const inside = nbx.find((o) => boxDist(b.x, b.z, o) < radiusFor(o, route.radius) - SLACK) || nbx.find((o) => boxDist(a.x, a.z, o) < radiusFor(o, route.radius) - SLACK);
      const insideSrc = inside ? (inside.src || 'hand-tagged') + ` x[${inside.minX.toFixed(1)},${inside.maxX.toFixed(1)}] z[${inside.minZ.toFixed(1)},${inside.maxZ.toFixed(1)}]` : null;
      let maxOff = 0, final = null;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.ceil(len / (1.1 / 30)) + 5;
      for (let k = 0; k < steps && len > 0.2; k++) {
        const step = Math.min(1.1 / 30, Math.hypot(b.x - pos.x, b.z - pos.z));
        const ddx = b.x - pos.x, ddz = b.z - pos.z, dl = Math.hypot(ddx, ddz) || 1;
        d.resolveMove(pos, (ddx / dl) * step, (ddz / dl) * step, route.radius);
        // distance from the straight leg
        const t = Math.max(0, Math.min(1, ((pos.x - a.x) * (b.x - a.x) + (pos.z - a.z) * (b.z - a.z)) / (len * len)));
        maxOff = Math.max(maxOff, Math.hypot(pos.x - (a.x + t * (b.x - a.x)), pos.z - (a.z + t * (b.z - a.z))));
        if (Math.hypot(b.x - pos.x, b.z - pos.z) < 0.15) break;
      }
      final = Math.hypot(b.x - pos.x, b.z - pos.z);
      const blocker = final > 0.3 ? nbx.find((o) => boxDist(pos.x, pos.z, o) < radiusFor(o, route.radius) + 0.1) : null;
      const blockerSrc = blocker ? (blocker.src || 'hand-tagged') + ` x[${blocker.minX.toFixed(1)},${blocker.maxX.toFixed(1)}] z[${blocker.minZ.toFixed(1)},${blocker.maxZ.toFixed(1)}]` : null;
      d.setStaticColliders(all);
      if (inside || final > 0.3 || maxOff > 0.6) npcFails.push({ route: route.name, leg: i, from: [a.x, a.z], to: [b.x, b.z], insideSolid: insideSrc, stoppedShort: +final.toFixed(2), blockedBy: blockerSrc, maxOffPath: +maxOff.toFixed(2) });
    }
  }

  tick('part 4');
  // ---------- 5. coverage: visible solid-looking geometry with no collider ----------
  const CELL = 0.4, PAD = 0.4; // derived colliders skip cells whose CENTRE is within 0.3 m of a hand-tagged box (src/collision.js); a sample point can lie half a 0.2 cell further out
  const cells = new Map();
  const P0 = new d.Vector3(), P1 = new d.Vector3(), P2 = new d.Vector3(), S = new d.Vector3();
  const M = new d.Matrix4(), M2 = new d.Matrix4();
  const skipTop = new RegExp(cfg.skipTop[0], cfg.skipTop[1]);
  const nonSolid = cfg.nonSolid.map(([src, flags]) => [new RegExp(src, flags)]);
  const topName = (o) => { let t = o; while (t.parent && t.parent.type !== 'Scene') t = t.parent; return t.name || t.type; };
  const vis = (o) => { for (let a = o; a; a = a.parent) if (a.visible === false || (a.userData && a.userData.zoneHidden)) return false; return true; };
  d.scene.traverse((o) => {
    if (!o.isMesh || !vis(o) || o.userData.collider === true) return;
    const top = topName(o);
    if (skipTop.test(top)) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.transparent || m.alphaTest > 0) return;
    const src = `${top}/${o.name || '?'}/${m.name || ''}`;
    if (nonSolid.some(([re]) => re.test(src))) return;
    const g = o.geometry, pos = g && g.attributes.position, idx = g && g.index;
    if (!pos) return;
    const tc = idx ? idx.count / 3 : pos.count / 3;
    o.updateWorldMatrix(true, false);
    const n = o.isInstancedMesh ? o.count : 1;
    for (let i = 0; i < n; i++) {
      if (o.isInstancedMesh) { o.getMatrixAt(i, M2); M.multiplyMatrices(o.matrixWorld, M2); } else M.copy(o.matrixWorld);
      for (let t = 0; t < tc; t++) {
        const a = idx ? idx.getX(t * 3) : t * 3, b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        P0.fromBufferAttribute(pos, a).applyMatrix4(M); P1.fromBufferAttribute(pos, b).applyMatrix4(M); P2.fromBufferAttribute(pos, c).applyMatrix4(M);
        if (Math.max(P0.y, P1.y, P2.y) < 0.35 || Math.min(P0.y, P1.y, P2.y) > 1.5) continue;
        const e = Math.max(Math.hypot(P1.x - P0.x, P1.z - P0.z), Math.hypot(P2.x - P0.x, P2.z - P0.z), Math.hypot(P2.x - P1.x, P2.z - P1.z));
        const sub = Math.min(80, Math.max(1, Math.ceil(e / 0.2)));
        for (let u = 0; u <= sub; u++) for (let w = 0; w <= sub - u; w++) {
          const fu = u / sub, fw = w / sub;
          const sy = P0.y + (P1.y - P0.y) * fu + (P2.y - P0.y) * fw;
          if (sy < 0.35 || sy > 1.5) continue; // only surface points that are really at knee-to-chest height
          S.set(P0.x + (P1.x - P0.x) * fu + (P2.x - P0.x) * fw, 0, P0.z + (P1.z - P0.z) * fu + (P2.z - P0.z) * fw);
          const cx = Math.floor(S.x / CELL), cz = Math.floor(S.z / CELL), k = cx + ',' + cz;
          if (!cells.has(k)) cells.set(k, { x: S.x, z: S.z, src });
        }
      }
    }
  });
  const walkable = d.getWalkableAreas(); // doorways and stair footprints: deliberately not solid
  const inWalkable = (x, z) => walkable.some((c) => x >= c.minX - 0.2 && x <= c.maxX + 0.2 && z >= c.minZ - 0.2 && z <= c.maxZ + 0.2); // 0.2 = the derived cell size, so a sample a cell off the rect edge is not blamed
  const covered = (x, z) => inWalkable(x, z) || all.some((b) => x >= b.minX - PAD && x <= b.maxX + PAD && z >= b.minZ - PAD && z <= b.maxZ + PAD);
  const bySrc = {};
  for (const c of cells.values()) if (!covered(c.x, c.z)) (bySrc[c.src] = bySrc[c.src] || []).push(c);
  const uncovered = Object.entries(bySrc).map(([src, cs]) => ({ src, cells: cs.length, minX: Math.min(...cs.map((c) => c.x)), maxX: Math.max(...cs.map((c) => c.x)), minZ: Math.min(...cs.map((c) => c.z)), maxZ: Math.max(...cs.map((c) => c.z)) })).sort((a, b) => b.cells - a.cells);

  return {
    colliders: all.length,
    autoSources: (() => { const m = {}; for (const b of all) if (b.auto) { const k = b.src || '?'; m[k] = (m[k] || 0) + 1; } return m; })(),
    zonesForced,
    stat: { boxes: stat.boxes, tested: stat.tested, skipped: stat.skipped, boxesWithTests: stat.boxesWithTests, fails: staticFails.map((f) => ({ ...f, text: label(f.box) })), enclosed: enclosed.length },
    dyn: { boxes: dynBoxes.length, tested: dynTested, fails: dynFails, vehicleCover },
    veh: { tested: vehTested, kinds: vehicleKinds, objects: bigBoxes.length, fails: vehFails.map((f) => ({ ...f, text: label(f.box) })) },
    npc: { routes: d.npcRoutes.length, legs: npcLegs, roofLegs, fails: npcFails },
    cover: { cells: cells.size, uncovered },
  };
}

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  let failures = 0;
  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
    page.setDefaultTimeout(0);
    page.on('pageerror', (e) => console.error('pageerror:', e.message));
    page.on('console', (m) => { if (m.text().startsWith('[collision-test]')) console.log(m.text()); });
    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'load' });
    await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
    await page.click('#play-btn');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(2000);
    // [6] LIVE STREAM: before any zone is forced, walk the real frame loop (zone manager running) to every zone and
    // after each stop (plus a wait for .glb swaps) compare the live collider list with a fresh full rebuild. Any
    // difference is a collider that registered late or never (the A0a "registered late during streaming" cause).
    const live = await page.evaluate(async () => {
      const d = window.__dopahar;
      const keyOf = (b) => [b.minX, b.maxX, b.minZ, b.maxZ].map((n) => n.toFixed(2)).join(',');
      const stops = [...d.zoneManager.zones.values()].filter((_, i) => i % 4 === 0).map((z) => ({ name: z.name, x: z.x, z: z.z }));
      const fails = []; let checked = 0;
      // latency: time from a model's meshes appearing in the scene to the collider list being rebuilt. A player standing at a
      // zone edge can walk into the new geometry during this window, so it is bounded (game: 250 ms debounce, 1.5 s safety pass)
      let maxLatency = 0, worstZone = '', pendingSince = 0, curMeshes = -1, curBuilds = -1, frames = 0;
      // measured in rendered frames, not ms: the player only moves between frames, and headless software GL renders ~1 frame/s
      const tick = () => { frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
      for (const s of stops) {
        d.teleportPlayer(s.x + 3, s.z + 3);
        // zones build nearest-first within a frame budget and .glb swaps arrive async: wait until no collider rebuild has
        // happened for 2.5 s (cap 20 s), which in the game means the streaming around this spot has finished
        let lastBuilds = -1, lastMeshes = -1, quietSince = Date.now(), quietFrame = frames;
        // quiet = 2.5 s AND 10 rendered frames with no change: at ~1 fps headless 2.5 s is only 2-3 frames, less than the
        // 4-frame rebuild latency, so a wall-clock-only wait could check a collider list that is still one debounce behind
        for (const t0 = Date.now(); Date.now() - t0 < 30000 && (Date.now() - quietSince < 2500 || frames - quietFrame < 10);) {
          await new Promise((r) => setTimeout(r, 100));
          // a model that finished loading adds meshes now and its collider rebuild follows ~250 ms later, so a changing mesh
          // count also counts as "still streaming" (otherwise a slow .glb landing at the 2.5 s boundary is checked mid-debounce)
          let meshes = 0; // only geometry the collider builder can see: skip zone groups built early but not drawn yet
          (function cnt(o) { if (o.userData.zoneHidden || o.visible === false) return; if (o.isMesh) meshes++; for (const c of o.children) cnt(c); })(d.scene);
          const now = frames;
          if (curMeshes >= 0 && meshes !== curMeshes && !pendingSince) pendingSince = now;
          if (d.colliderStats.builds !== curBuilds && pendingSince) {
            if (now - pendingSince > maxLatency) { maxLatency = now - pendingSince; worstZone = s.name; }
            pendingSince = 0;
          }
          curMeshes = meshes; curBuilds = d.colliderStats.builds;
          if (d.colliderStats.builds !== lastBuilds || meshes !== lastMeshes) { lastBuilds = d.colliderStats.builds; lastMeshes = meshes; quietSince = Date.now(); quietFrame = frames; }
        }
        const before = new Set(d.getStaticColliders().map(keyOf));
        d.rebuildColliders();
        const missing = d.getStaticColliders().filter((b) => !before.has(keyOf(b)));
        checked++;
        if (missing.length) fails.push({ zone: s.name, at: [s.x, s.z], missing: missing.length, sample: keyOf(missing[0]) + ' src=' + missing[0].src + ' auto=' + missing[0].auto });
      }
      return { checked, fails, maxLatency, worstZone };
    });
    console.log(`[6] LIVE STREAM ${live.checked} zone stops walked with the zone manager running, live collider list vs fresh rebuild; worst mesh-appears-to-collider latency ${live.maxLatency} rendered frames (${live.worstZone || 'none seen'}, limit 30)`);
    if (live.maxLatency > 30) { console.log(`  FAIL collider rebuild lagged ${live.maxLatency} frames behind new geometry in ${live.worstZone}`); failures++; }
    for (const f of live.fails) console.log(`  FAIL zone ${f.zone} at (${f.at.map((n) => n.toFixed(0))}): ${f.missing} colliders not registered until a manual rebuild, e.g. ${f.sample}`);
    failures += live.fails.length;
    await page.evaluate(forceZones);
    await page.waitForTimeout(6000); // let zone-streamed .glb models arrive
    const t0 = Date.now();
    const r = await page.evaluate(inPage, { nonSolid: NON_SOLID.map(([re]) => [re.source, re.flags]), skipTop: [SKIP_TOP_RE.source, SKIP_TOP_RE.flags], skipVehicles: !!process.env.SKIP_VEHICLES });
    await browser.close();

    mkdirSync(`${ROOT}tmp`, { recursive: true });
    writeFileSync(`${ROOT}tmp/collision-test-result.json`, JSON.stringify(r, null, 1));
    const f2 = (v) => v.map((n) => n.toFixed(1)).join(',');
    console.log(`collision-test: ${r.colliders} colliders in the live scene with all ${r.zonesForced} streamed zones built (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

    console.log(`\n[1] STATIC  ${r.stat.boxes} solid boxes, ${r.stat.tested} drive-throughs (4 dirs x walk/run/lag-spike), ${r.stat.skipped} approaches skipped (start blocked by a neighbour), ${r.stat.enclosed} boxes fully enclosed (unreachable)`);
    for (const f of r.stat.fails) console.log(`  FAIL ${f.text}: ${f.speed} dir(${f.dir}) ended at (${f2(f.at)}), ${(f.pen * 100).toFixed(0)} cm in${f.inside ? ' (CENTRE INSIDE)' : ''}`);
    failures += r.stat.fails.length;

    console.log(`[2] DYNAMIC ${r.dyn.boxes} vehicle/trolley boxes, ${r.dyn.tested} drive-throughs`);
    for (const f of r.dyn.fails) console.log(`  FAIL vehicle box x[${f2([f.box.minX, f.box.maxX])}] z[${f2([f.box.minZ, f.box.maxZ])}] passed ${f.speed} dir(${f.dir}) at (${f2(f.at)})`);
    for (const f of r.dyn.vehicleCover) console.log(`  FAIL ${f.kind}: ${f.why}`);
    failures += r.dyn.fails.length + r.dyn.vehicleCover.length;

    console.log(`[3] VEHICLES ${r.veh.kinds.join('/')} into ${r.veh.objects} solids, ${r.veh.tested} drives (tractor fwd + reverse with trolley)`);
    for (const f of r.veh.fails) console.log(`  FAIL ${f.kind} (${f.mname}) into ${f.text}: dir(${f.dir}) ended at (${f2(f.at)}), ${(f.pen * 100).toFixed(0)} cm overlap`);
    failures += r.veh.fails.length;

    console.log(`[4] NPCS ${r.npc.routes} routes, ${r.npc.legs} legs walked through the real resolver, ${r.npc.roofLegs} rooftop legs only end-checked (collision has no box heights)`);
    for (const f of r.npc.fails) console.log(`  FAIL route ${f.route} leg ${f.leg} (${f2(f.from)})->(${f2(f.to)}): ${f.insideSolid ? 'waypoint inside ' + f.insideSolid + '; ' : ''}stopped ${f.stoppedShort} m short${f.blockedBy ? ' at ' + f.blockedBy : ''}, ${f.maxOffPath} m off the path`);
    failures += r.npc.fails.length;

    console.log(`[5] COVERAGE ${r.cover.cells} cells of visible solid-looking geometry checked against the collider list`);
    for (const u of r.cover.uncovered) console.log(`  FAIL no collider: ${u.src} - ${u.cells} cells, x[${f2([u.minX, u.maxX])}] z[${f2([u.minZ, u.maxZ])}]`);
    failures += r.cover.uncovered.length;

    const objects = r.stat.boxes + r.dyn.boxes + r.veh.objects * r.veh.kinds.length + r.npc.legs + r.cover.uncovered.length;
    console.log(`\nCOLLISION TEST: ${r.stat.boxes} static solids + ${r.dyn.boxes} vehicle boxes + ${r.veh.kinds.length} vehicles + ${r.npc.legs} NPC legs tested, ${failures} failed.`);
    void objects;
  } finally {
    server.kill();
  }
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
