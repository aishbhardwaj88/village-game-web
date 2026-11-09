#!/usr/bin/env node
/**
 * Cycle handling course (docs/PARALLEL.md C, 10 Nov). Drives the SAME stepCycle() the game's frame loop rides with
 * (window.__dopahar.stepCycle, fixed dt 1/60, scripted inputs), in the built game, against the real colliders:
 *   1. turning circle at full lock, three speeds (slow 2 m/s, cruise 7.5, sprint 9.5), measured in open ground
 *   2. turn on the spot at a standstill (A/D) and walk it backwards (S)
 *   3. handlebar ease-in / recentre times
 *   4. figure-8 round the chowk roundabout island (602.9, 19.9): a lap anticlockwise, a U-turn in the ring, a lap clockwise
 *   5. a U-turn in the narrowest gali (village lanes measured for clear width between colliders)
 *   6. ride head-on into a wall at 7.5 m/s and get out (S, then A/D); a glancing hit at 20 deg
 * Prints the numbers and any step where the cycle was stuck (no progress for 1 s with input held).
 *
 * Usage: npx vite build && node tools/cycle-course.mjs        (PORT / DIST env as in tools/collision-test.js)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = +(process.env.PORT || 5213);
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

function forceZones() {
  const d = window.__dopahar;
  d.zoneManager.update = () => {};
  for (const z of d.zoneManager.zones.values()) {
    if (!z.active) {
      let built = z.build();
      if (built && typeof built.next === 'function' && !built.isObject3D) { let s; do { s = built.next(); } while (!s.done); built = s.value; } // time-sliced builds (generators)
      if (!built) continue;
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

// ---- runs inside the page, in ONE evaluate, so the game's own frame loop cannot move the cycle between steps ----
function course() {
  const d = window.__dopahar;
  d.rebuildColliders();
  const DT = 1 / 60;
  const { halfW, halfL } = d.cycleHalfExtents;
  const out = { stuck: [] };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const deg = (r) => r * 180 / Math.PI;
  const free = (x, z, r = 1.2) => !d.isBlockedAt(x, z, r);
  // stuck watchdog: input held for a full second and the cycle neither moved 5 cm nor turned 2 deg
  function run(label, seconds, ctl) {
    const n = Math.round(seconds / DT);
    const tr = [];
    let wx = d.cycleState().x, wz = d.cycleState().z, wh = d.cycleState().heading, wt = 0, stuckFor = 0;
    for (let i = 0; i < n; i++) {
      const s = d.cycleState();
      const c = ctl(s, i * DT);
      if (c === 'stop') break;
      const r = d.stepCycle(DT, c.pedal || 0, c.steer || 0, !!c.sprint);
      tr.push({ t: i * DT, x: r.x, z: r.z, h: r.heading, v: r.speed, bar: r.bar, wall: r.wall, lean: d.cycleState().lean });
      wt += DT;
      if (wt >= 1) {
        const moved = Math.hypot(r.x - wx, r.z - wz), turned = Math.abs(wrap(r.heading - wh));
        const input = Math.abs(c.pedal || 0) > 0.1 || Math.abs(c.steer || 0) > 0.1;
        if (input && moved < 0.05 && turned < 0.035) { stuckFor += 1; out.stuck.push({ label, t: +(i * DT).toFixed(1), x: +r.x.toFixed(1), z: +r.z.toFixed(1) }); }
        wx = r.x; wz = r.z; wh = r.heading; wt = 0;
      }
    }
    return tr;
  }

  // ---- 1. turning circle at full lock, open ground (search a 40 m clear square near the chowk's east fields) ----
  function openSpot() {
    for (let r = 0; r < 400; r += 10) for (let a = 0; a < 16; a++) {
      const x = 602.9 + 60 + r * Math.cos(a * Math.PI / 8), z = 19.9 + r * Math.sin(a * Math.PI / 8);
      let ok = true;
      for (let gx = -12; gx <= 12 && ok; gx += 2) for (let gz = -12; gz <= 12 && ok; gz += 2) if (!free(x + gx, z + gz, 1)) ok = false;
      if (ok) return { x, z };
    }
    return null;
  }
  const open = openSpot();
  out.openSpot = open;
  out.circles = [];
  for (const [name, v, pedal, sprint] of [['slow', 2, 2 / 7.5, false], ['cruise', 7.5, 1, false], ['sprint', 9.5, 1, true]]) {
    d.setCycle({ x: open.x, z: open.z, heading: 0, speed: v });
    run('circle-settle-' + name, 1.0, () => ({ pedal, steer: 1, sprint }));
    const tr = run('circle-' + name, 6, () => ({ pedal, steer: 1, sprint }));
    // radius from the path: the circumcentre is the mean of the points over one whole turn; radius = mean distance to it
    let turned = 0, k = 1;
    for (; k < tr.length && turned < 2 * Math.PI; k++) turned += Math.abs(wrap(tr[k].h - tr[k - 1].h));
    const lap = tr.slice(0, k);
    const cx = lap.reduce((s, p) => s + p.x, 0) / lap.length, cz = lap.reduce((s, p) => s + p.z, 0) / lap.length;
    const rad = lap.reduce((s, p) => s + Math.hypot(p.x - cx, p.z - cz), 0) / lap.length;
    const vMean = lap.reduce((s, p) => s + p.v, 0) / lap.length;
    out.circles.push({ name, speed: +vMean.toFixed(2), radius: +rad.toFixed(2), diameter: +(2 * rad).toFixed(2), yawDegS: +deg(vMean / rad).toFixed(0), lapSeconds: +(lap.length * DT).toFixed(2), leanDeg: +deg(Math.max(...lap.map((p) => Math.abs(p.lean || 0)))).toFixed(1), walls: lap.filter((p) => p.wall).length });
  }

  // ---- 2. standstill turn and reverse ----
  d.setCycle({ x: open.x, z: open.z, heading: 0, speed: 0 });
  let tr = run('spot-turn', 2, () => ({ steer: -1 }));
  out.spotTurnDegS = +deg(Math.abs(wrap(tr[tr.length - 1].h - tr[60].h))).toFixed(0); // second 1..2, after the bar has eased in
  out.spotTurnMovedM = +Math.hypot(tr[tr.length - 1].x - open.x, tr[tr.length - 1].z - open.z).toFixed(2);
  d.setCycle({ x: open.x, z: open.z, heading: 0, speed: 0 });
  tr = run('reverse', 2, () => ({ pedal: -1 }));
  out.reverseSpeed = +tr[tr.length - 1].v.toFixed(2);
  out.reverseMetres2s = +Math.hypot(tr[tr.length - 1].x - open.x, tr[tr.length - 1].z - open.z).toFixed(2);

  // ---- 3. handlebar timing (at 3 m/s) ----
  d.setCycle({ x: open.x, z: open.z, heading: 0, speed: 3 });
  tr = run('bar', 1.0, (s, t) => ({ pedal: 3 / 7.5, steer: t < 0.5 ? 1 : 0 }));
  const barFull = Math.max(...tr.map((p) => p.bar));
  const tIn = tr.find((p) => p.bar >= 0.95 * barFull).t;
  const tOut = tr.find((p) => p.t > 0.5 && p.bar <= 0.05 * barFull)?.t - 0.5;
  out.barInS = +tIn.toFixed(3); out.barOutS = +(tOut || NaN).toFixed(3); out.barMaxDeg3ms = +deg(barFull).toFixed(1);

  // ---- 4. figure-8 round the chowk island: lap anticlockwise on the ring centreline (9.5 m), U-turn in the ring, lap clockwise ----
  const C = { x: 602.9, z: 19.9 }, RING = 9.5;
  function follow(dir, laps, label) {
    // pure pursuit on the ring centreline; dir +1 anticlockwise (seen from above, +x east, +z south)
    let total = 0, prev = null, minR = 1e9, maxR = 0, hits = 0;
    const tr = run(label, 40 * laps, (s) => {
      const a = Math.atan2(s.z - C.z, s.x - C.x);
      if (prev !== null) total += wrap(a - prev) * dir;
      prev = a;
      if (total >= laps * 2 * Math.PI) return 'stop';
      const r = Math.hypot(s.x - C.x, s.z - C.z); minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      const la = a + dir * 3.5 / RING; // look-ahead point 3.5 m along the ring
      const tx = C.x + RING * Math.cos(la), tz = C.z + RING * Math.sin(la);
      const want = Math.atan2(tx - s.x, tz - s.z);
      const err = wrap(want - s.heading);
      return { pedal: 4.5 / 7.5, steer: Math.max(-1, Math.min(1, -err * 2.5)) };
    });
    hits = tr.filter((p) => p.wall).length;
    return { laps: +(total / (2 * Math.PI)).toFixed(2), seconds: +(tr.length * DT).toFixed(1), minR: +minR.toFixed(2), maxR: +maxR.toFixed(2), wallFrames: hits, completed: total >= laps * 2 * Math.PI - 0.01 };
  }
  // start on the ring, south side, heading for anticlockwise travel
  const sA = Math.PI / 2;
  let sx = C.x + RING * Math.cos(sA), sz = C.z + RING * Math.sin(sA);
  // tangent for increasing angle a: d/da (cos a, sin a) = (-sin a, cos a)
  d.setCycle({ x: sx, z: sz, heading: Math.atan2(-Math.sin(sA), Math.cos(sA)), speed: 4 });
  out.fig8 = { ringStartFree: free(sx, sz, 0.8), lap1: follow(1, 1, 'fig8-lap1') };
  // U-turn in the ring: slow, full lock, then pull away the other way
  {
    const s0 = d.cycleState();
    const h0 = s0.heading;
    const t = run('fig8-uturn', 8, (s) => (Math.abs(wrap(s.heading - h0)) > Math.PI * 0.92 ? 'stop' : { pedal: 1.5 / 7.5, steer: -1 }));
    out.fig8.uturnSeconds = +(t.length * DT).toFixed(1);
    out.fig8.uturnWidthM = +(Math.max(...t.map((p) => Math.hypot(p.x - s0.x, p.z - s0.z)))).toFixed(2);
  }
  out.fig8.lap2 = follow(-1, 1, 'fig8-lap2');

  // ---- 5. narrowest gali: lanes of kind 'lane'; clear width measured perpendicular at points along each ----
  const lines = d.roadLines().filter((l) => l.kind === 'lane' || /gully|gali|lane/i.test(l.id));
  const cand = [];
  for (const l of lines) {
    for (let i = 0; i + 1 < l.pts.length; i++) {
      const [x0, z0] = l.pts[i], [x1, z1] = l.pts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0);
      if (len < 4) continue;
      const ux = (x1 - x0) / len, uz = (z1 - z0) / len, nx = -uz, nz = ux;
      for (let s = 2; s < len - 2; s += 3) {
        const px = x0 + ux * s, pz = z0 + uz * s;
        if (!free(px, pz, 0.35)) continue;
        // clear width: walk out each side until a collider (static or vehicle) is hit
        let a = 0, b = 0;
        while (a < 15 && free(px + nx * (a + 0.1), pz + nz * (a + 0.1), 0.05)) a += 0.1;
        while (b < 15 && free(px - nx * (b + 0.1), pz - nz * (b + 0.1), 0.05)) b += 0.1;
        // and it must stay that narrow for 6 m along (a pinch point is not a gali you turn in)
        if (a + b < 14) cand.push({ id: l.id, w: l.w, x: px, z: pz, ux, uz, nx, nz, a, b, clear: a + b });
      }
    }
  }
  cand.sort((p, q) => p.clear - q.clear);
  // narrowest spot that is still >= 2 m clear (a cycle-width pinch between two props is not a gali to U-turn in)
  // narrowest spot that is still >= 2 m clear (a cycle-width pinch between two props is not a gali to turn in), and the
  // narrowest that is >= 6 m (the spec's "U-turn in a 6 m gali" while riding)
  function uturn(g, label, mode) {
    const mid = (g.a - g.b) / 2;
    const cx0 = g.x + g.nx * mid, cz0 = g.z + g.nz * mid;
    const h0 = Math.atan2(g.ux, g.uz);
    const res = { lane: g.id, mapWidth: g.w, at: [+cx0.toFixed(1), +cz0.toFixed(1)], clearWidth: +g.clear.toFixed(2), how: mode };
    if (mode === 'ride') {
      // start against the right-hand edge (keep left: a U-turn to the left then has the full width), slow, full left lock
      const off = g.clear / 2 - halfW - 0.15;
      // the lane normal (nx, nz) points left of travel when ux,uz is forward? right of travel = (cz, -sx) for heading h0
      const rx = Math.cos(h0), rz = -Math.sin(h0);
      d.setCycle({ x: cx0 + rx * off, z: cz0 + rz * off, heading: h0, speed: 1.5 });
    } else d.setCycle({ x: cx0, z: cz0, heading: h0, speed: 0 });
    let backs = 0, phase = 'go', backT = 0;
    const t = run(label, 15, (s) => {
      if (Math.abs(wrap(s.heading - h0)) > Math.PI * 0.95) return 'stop';
      if (mode === 'spot') return { steer: -1 };
      if (phase === 'go') {
        const nose = halfL + 0.3;
        if (!free(s.x + Math.sin(s.heading) * nose, s.z + Math.cos(s.heading) * nose, 0.25)) { phase = 'back'; backT = 0; backs++; }
        return { pedal: 1.5 / 7.5, steer: -1 };
      }
      backT += DT; if (backT > 0.8) phase = 'go';
      return { pedal: -1, steer: 1 };
    });
    res.done = Math.abs(wrap(t[t.length - 1].h - h0)) > Math.PI * 0.94;
    res.seconds = +(t.length * DT).toFixed(1);
    res.backUps = backs;
    res.wallFrames = t.filter((p) => p.wall).length;
    return res;
  }
  const gN = cand.find((c) => c.clear >= 2);
  // a real 6 m gali: 6-7 m clear here AND 3 m either way along the lane (one wide point between two narrow ones is not a gali)
  const widthAt = (x, z, nx, nz) => { let a = 0, b = 0; while (a < 15 && free(x + nx * (a + 0.1), z + nz * (a + 0.1), 0.05)) a += 0.1; while (b < 15 && free(x - nx * (b + 0.1), z - nz * (b + 0.1), 0.05)) b += 0.1; return a + b; };
  const g6 = cand.filter((c) => c.clear >= 6 && c.clear <= 7.2).find((c) => [-3, -1.5, 1.5, 3].every((k) => { const w = widthAt(c.x + c.ux * k, c.z + c.uz * k, c.nx, c.nz); return w >= 5.8 && w <= 7.5; }));
  out.galiNarrowest = gN ? uturn(gN, 'gali-narrowest-spot-turn', 'spot') : null;
  out.gali6m = g6 ? uturn(g6, 'gali-6m-ride-uturn', 'ride') : null;

  // ---- 6. head-on wall at 7.5 m/s and out; glancing at 20 deg ----
  // find a long straight wall face: a static box >= 4 m along x with 15 m clear south of it
  const boxes = d.getStaticColliders().filter((b) => !b.auto && b.maxX - b.minX > 10 && b.maxZ - b.minZ > 0.15);
  let wall = null;
  for (const b of boxes) {
    const x = (b.minX + b.maxX) / 2, z = b.maxZ + 0.01;
    let ok = true;
    for (let s = 1.2; s < 16 && ok; s += 1) for (const ox of [-1.5, 0, 1.5]) if (!free(x + ox, z + s, 0.4)) ok = false;
    for (let ox = b.minX - 3; ox < b.maxX && ok; ox += 1) if (!free(ox, z + 1.2, 0.4)) ok = false; // the glancing run along the face
    if (ok) { wall = { x, z, b }; break; }
  }
  out.wall = { found: !!wall };
  if (wall) {
    out.wall.at = [+wall.x.toFixed(1), +wall.z.toFixed(1)];
    // heading Math.PI = travelling -z, i.e. north into the wall's south face
    d.setCycle({ x: wall.x, z: wall.z + 14, heading: Math.PI, speed: 7.5 });
    let hitT = null;
    const hitsBefore = d.cycleState().wallHits;
    const t1 = run('wall-ride-in', 4, (s, t) => { if (hitT === null && d.cycleState().wallHits > hitsBefore) hitT = t; return hitT !== null && t > hitT + 0.8 ? 'stop' : hitT !== null ? {} : { pedal: 1 }; }); // hands off after the hit: how far does it bounce
    out.wall.impactSpeed = +Math.max(...t1.map((p) => p.v)).toFixed(2);
    out.wall.bounceSpeed = +Math.min(...t1.map((p) => p.v)).toFixed(2);
    const contactZ = Math.min(...t1.map((p) => p.z));
    out.wall.bounceBackM = +(t1[t1.length - 1].z - contactZ).toFixed(2);
    // keep holding W for 1 s: must not jitter or dig in
    const tHold = run('wall-hold-W', 1, () => ({ pedal: 1 }));
    out.stuck = out.stuck.filter((x) => x.label !== 'wall-hold-W'); // pedalling into a wall is meant to go nowhere; escaping is tested next
    out.wall.holdWMinGapM = +(Math.min(...tHold.map((p) => p.z)) - wall.z - halfL).toFixed(3);
    // escape A: S (walk back) until 1.5 m clear of the face
    const sHold = d.cycleState();
    const tS = run('wall-escape-S', 5, (s) => (s.z - wall.z - halfL > 1.5 ? 'stop' : { pedal: -1 }));
    out.wall.escapeS_seconds = +(tS.length * DT).toFixed(2);
    // escape B: from the wall again, A held at a standstill until it points along the wall, then ride off
    d.setCycle({ x: sHold.x, z: sHold.z, heading: Math.PI, speed: 0 });
    let turnedAt = null;
    const tA = run('wall-escape-A', 5, (s, t) => {
      if (turnedAt === null && Math.abs(wrap(s.heading - Math.PI)) > Math.PI * 0.45) turnedAt = t;
      if (turnedAt !== null && Math.hypot(s.x - sHold.x, s.z - sHold.z) > 1.5) return 'stop';
      return turnedAt === null ? { steer: -1 } : { pedal: 1, steer: 0 };
    });
    out.wall.escapeA_seconds = +(tA.length * DT).toFixed(2);
    // glancing: 20 deg to the wall face, 7.5 m/s
    const g0 = Math.PI / 2 + (20 * Math.PI) / 180; // mostly +x, 20 deg toward -z (into the wall)
    d.setCycle({ x: wall.b.minX - 2, z: wall.z + 2.2, heading: g0, speed: 7.5 });
    const tG = run('wall-glance', 1.4, () => ({ pedal: 1 }));
    out.wall.glanceTrace = tG.filter((_, i) => i % 6 === 0).map((p) => [+p.x.toFixed(2), +p.z.toFixed(2), +deg(p.h).toFixed(0), +p.v.toFixed(2), p.wall || '']);
    const firstHit = tG.findIndex((p) => p.wall);
    out.wall.glance = { hit: firstHit >= 0, speedIn: 7.5, speedAfter: firstHit >= 0 ? +tG[Math.min(tG.length - 1, firstHit + 30)].v.toFixed(2) : null, endHeadingDeg: +deg(tG[tG.length - 1].h).toFixed(0) };
  }
  return out;
}

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', ...(process.env.DIST ? ['--outDir', process.env.DIST] : [])], { cwd: ROOT, stdio: 'pipe' });
  let code = 0;
  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 480, height: 300 } });
    page.setDefaultTimeout(0);
    page.on('pageerror', (e) => console.error('pageerror:', e.message));
    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => document.getElementById('play-btn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForFunction(() => window.__dopahar && window.__dopahar.zoneManager && window.__dopahar.dialogue && window.__dopahar.stepCycle, null, { timeout: 120000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(1500);
    await page.evaluate(forceZones);
    await page.waitForTimeout(6000);
    const r = await page.evaluate(course);
    await browser.close();
    mkdirSync(`${ROOT}tmp`, { recursive: true });
    writeFileSync(`${ROOT}tmp/cycle-course-result.json`, JSON.stringify(r, null, 1));
    console.log(JSON.stringify(r, null, 1));
    if (r.stuck.length) code = 1;
  } finally {
    server.kill();
  }
  process.exit(code);
}
main().catch((e) => { console.error(e); process.exit(2); });
