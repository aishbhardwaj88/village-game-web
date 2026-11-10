#!/usr/bin/env node
/**
 * Ground check (docs/PARALLEL.md G1, her order 10 Nov: "nothing should go inside the ground": pots, a cart, the cycle, feet).
 * Loads the BUILT game (vite preview of OUTDIR), builds every streamed zone, then compares the LOWEST world point of every
 * placed object with the surface height under it (dug ground from src/dips.js, or the first solid surface a ray finds:
 * a road strip, plinth, chabutra, step). Fail when lowest point is > 2 cm below or > 3 cm above that surface.
 *
 *   Objects   static: every connected piece (island) of every prop mesh (pots, lamps, pumps, haystacks, charpai, nook props,
 *             carts, scooters, ...), typed by name. Merged meshes are split into islands, so one sunk pot in a merged
 *             draw call is found on its own. Movers: each vehicle / trolley / cart group, each walking NPC group and every
 *             instance of the moving crowd / herd meshes (bottom corners of the instance box).
 *   Elevated  an object whose lowest point is more than 25 cm above any surface, or that rests on another prop of the same
 *             merged mesh (a pot on a stool), is counted as "elevated, not ground-standing" and not failed. Printed as a count.
 *   Mode 1    standing still (default).  Mode 2 (GC_RIDE=1): the movers sampled every 0.5 s for GC_SECONDS (90) of live
 *             play, plus the player cycle ridden for 90 s of fixed-dt steps along the main road, sampled every 0.1 s.
 *   People and animals standing still are measured by tools/feet-check.js (GC_FEET=1 runs it and prints its count).
 *
 * Usage: npx vite build --outDir dist-gc && node tools/ground-check.js     GC_OUTDIR, GC_PORT, GC_RIDE=1, GC_FEET=1
 * Exit 1 on any failure. The 20 worst are written to tmp/ground-check-result.json too.
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = +(process.env.GC_PORT || 5311);
const OUTDIR = process.env.GC_OUTDIR || 'dist-gc';
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
const RIDE = !!process.env.GC_RIDE;
const SECONDS = +(process.env.GC_SECONDS || 90);
const LOW = 0.02, HIGH = 0.03;

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
      const built = z.build();
      const plain = built.isObject3D;
      z.group = plain ? built : built.group;
      z.onFrame = plain ? null : built.onFrame || null;
      d.scene.add(z.group);
      z.active = true;
    }
    if (z.group) { z.group.visible = true; z.group.userData.zoneHidden = false; }
  }
}

// ---- runs inside the page. Installs window.__gc = { static(), movers(), ride(seconds) } ----
function install(cfg) {
  const d = window.__dopahar;
  const { Vector3, Matrix4, Raycaster, Box3 } = d;
  const dipH = (window.__dips && window.__dips.dipHeightRaw) || (() => 0);
  const SURFACE_SKIP = /water|ripple|grass|tuft|crop|cane|reed|flower|foliage|canopy|leaf|bush|hedge|plant_|laundry|cloth|bunting|garland|flag|shadow|contact|dust|steam|smoke|sky|waypoint|glow|beam|halo|fire|rangoli|decal|capsule|people/i;
  const MOVER_TOP = /^(vehicle_|trolley|jeep|npc_|player)/;
  const BUILDING_TOP = /^(hero_zone|shops|bazaar_row|arm_frontage|main_road_frontage|gully_life|map_wall|background_houses|village_kit_houses|village_static_merged|blender_|canal|pond|roof_|field|vegetation|flowering_plants|ground|sky|place_|trim|material_board|ration_shop|tv_house|panchayat|temple_area|chaupal|banta_shop|tripo_|contact_shadows|waypoint|switchboard|wayfinding|map_gates|mapCompound)/;
  const TYPES = [
    ['pot', /pot|matka|ghada|surahi|kulhad|ceramic/i],
    ['cart', /cart|thela|handcart|icecream/i],
    ['lamp', /lamp|lantern|pole/i],
    ['pump', /pump|\btap\b|well|tank/i],
    ['haystack', /hay|dung|gobar|fodder/i],
    ['furniture', /charpai|stool|bench|furniture|chair|table|trough|manger/i],
    ['milestone', /milestone|flagpole|bell/i],
    ['scooter', /scooter|jeep|bike/i],
  ];
  const typeOf = (s) => { for (const [t, re] of TYPES) if (re.test(s)) return t; return 'other'; };
  const pathOf = (o) => { const p = []; for (let q = o; q && !q.isScene; q = q.parent) p.unshift(q.name || q.type); return p.join('/'); };
  const topOf = (o) => { let t = o; while (t.parent && !t.parent.isScene) t = t.parent; return t; };
  const shown = (o) => { for (let q = o; q; q = q.parent) { if (q.visible === false) return false; if (q.isScene) return true; } return false; };

  const ray = new Raycaster(); ray.layers.enableAll();
  const down = new Vector3(0, -1, 0), origin = new Vector3();
  let surfaces = [], excluded = new Set();
  const cache = new Map();

  function buildSurfaces() {
    d.scene.updateMatrixWorld(true);
    surfaces = []; cache.clear();
    d.scene.traverse((o) => {
      if (!o.isMesh || o.isBatchedMesh || !shown(o) || excluded.has(o)) return;
      if (o.isSprite || o.isPoints || o.isLine) return;
      const top = topOf(o).name || '';
      if (top === 'ground' || MOVER_TOP.test(top)) return;
      const path = pathOf(o) + '/' + ((Array.isArray(o.material) ? o.material[0] : o.material)?.name || '');
      if (/^ground(\/|$)/.test(path) || /\/ground$/.test(o.name)) return;
      if (SURFACE_SKIP.test(path.replace(/ride_nook_\d+_[a-z]+/g, 'nook'))) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m && m.transparent && m.opacity < 0.5) return;
      if (o.userData.noGroundSurface) return;
      const box = new Box3().setFromObject(o);
      if (!isFinite(box.min.x)) return;
      surfaces.push({ o, box });
    });
  }

  function surfaceAt(x, z, footY, probe = 0.3) {
    const key = Math.round(x * 20) + ',' + Math.round(z * 20) + ',' + Math.round(footY * 20);
    const hit = cache.get(key); if (hit) return hit;
    let best = dipH(x, z), what = best < -0.005 ? 'dug ground' : 'ground';
    const top = footY + probe, cands = [];
    for (const s of surfaces) {
      const b = s.box;
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      if (b.min.y > top || b.max.y < best - 0.01) continue;
      cands.push(s.o);
    }
    if (cands.length) {
      origin.set(x, top, z); ray.set(origin, down); ray.far = top - best + 0.01;
      const hits = ray.intersectObjects(cands, false);
      for (const h of hits) { if (h.point.y > best) { best = h.point.y; what = pathOf(h.object); } break; }
    }
    const r = { y: best, what };
    cache.set(key, r);
    return r;
  }

  /** points: flat array [x,y,z,...] in world space. Returns { clear, at, on, minY } over the 12 cm bottom band (8 cm buckets). */
  function clearanceOf(pts, n) {
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
      if (++cnt > 24) break; // a round pot bottom: 24 probes is plenty
      const s = surfaceAt(x, z, minY);
      const c = y - s.y;
      if (c < clear) { clear = c; at = [x, z]; on = s.what; }
    }
    return { clear, at, on, minY };
  }

  const r3 = (n) => +n.toFixed(3);
  const v = new Vector3(), mw = new Matrix4(), mi = new Matrix4();

  /** Connected pieces of a mesh geometry, as arrays of vertex indices (vertices welded at 1 mm). */
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

  /** Static props: every island of every non-building, non-mover mesh that is not a crowd / plant. */
  const staticObjs = [];
  function collectStatic() {
    staticObjs.length = 0;
    excluded = new Set();
    d.scene.updateMatrixWorld(true);
    d.scene.traverse((o) => {
      if (!o.isMesh || o.isBatchedMesh || !shown(o) || o.isInstancedMesh) return;
      const top = topOf(o).name || '';
      if (BUILDING_TOP.test(top) || MOVER_TOP.test(top)) return;
      const path = pathOf(o);
      const mat = (Array.isArray(o.material) ? o.material[0] : o.material)?.name || '';
      if (SURFACE_SKIP.test(path) || SURFACE_SKIP.test(mat)) return;
      if (!o.geometry || !o.geometry.attributes.position || o.geometry.attributes.position.count > 120000) return;
      if (o.geometry.type === 'CapsuleGeometry') return;
      staticObjs.push(o);
    });
  }

  function measureStatic() {
    collectStatic();
    for (const o of staticObjs) excluded.add(o); // props never count as the ground under other props (a ray would hit the prop itself)
    buildSurfaces();
    const out = [];
    let elevated = 0, measured = 0;
    for (const o of staticObjs) {
      const geo = o.geometry, pos = geo.attributes.position;
      mw.copy(o.matrixWorld);
      const path = pathOf(o);
      const mat = (Array.isArray(o.material) ? o.material[0] : o.material)?.name || '';
      const type = typeOf(path + '/' + mat);
      const parts = pos.count > 40 ? islands(geo) : [Array.from({ length: pos.count }, (_, i) => i)];
      for (const part of parts) {
        const pts = new Float32Array(part.length * 3);
        for (let k = 0; k < part.length; k++) { v.fromBufferAttribute(pos, part[k]).applyMatrix4(mw); pts[k * 3] = v.x; pts[k * 3 + 1] = v.y; pts[k * 3 + 2] = v.z; }
        const c = clearanceOf(pts, part.length);
        if (!c) continue;
        if (c.clear > 0.25) { elevated++; continue; } // on a shelf, a roof, another prop: not ground-standing
        if (c.clear < -0.6) { elevated++; continue; } // a pit / well shaft / buried foundation modelled on purpose
        measured++;
        out.push({ type, mode: 'static', label: path, clear: r3(c.clear), at: c.at.map((n) => +n.toFixed(2)), on: c.on, verts: part.length });
      }
    }
    return { objs: out, elevated, measured };
  }

  /** Movers: groups and instanced crowds. */
  function measureMovers() {
    const out = [];
    const tops = new Map();
    d.scene.traverse((o) => { if (o.parent && o.parent.isScene && (MOVER_TOP.test(o.name || '') && !/^player/.test(o.name))) tops.set(o.name, o); });
    for (const [name, g] of tops) {
      if (!shown(g)) continue;
      g.updateMatrixWorld(true);
      const pts = []; let wheelLike = 0;
      g.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || !o.geometry?.attributes.position) return;
        if (SURFACE_SKIP.test(o.name) || o.geometry.type === 'PlaneGeometry') return;
        const pos = o.geometry.attributes.position; mw.copy(o.matrixWorld);
        for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k).applyMatrix4(mw); pts.push(v.x, v.y, v.z); }
      });
      if (!pts.length) continue;
      const c = clearanceOf(pts, pts.length / 3);
      if (!c) continue;
      out.push({ type: /npc_/.test(name) ? 'person' : /cart/.test(name) ? 'cart' : 'vehicle', mode: 'mover', label: name, clear: r3(c.clear), at: c.at.map((n) => +n.toFixed(2)), on: c.on });
    }
    // moving crowds / herds / cyclists: every instance of an instanced mesh with these names, bottom corners of the instance box
    d.scene.traverse((o) => {
      if (!o.isInstancedMesh || !shown(o)) return;
      const p = pathOf(o);
      if (!/people|cyclist|cattle|herd|buffalo|bovine|dog|goat|bullock|monkey|peacock|animal|rider|life_scenes/i.test(p)) return;
      if (/wallow|nostalgia_animals|roof_monkeys/.test(p)) return;
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      const sink = o.userData.footExempt || [];
      const type = /people|capsule/i.test(p) ? 'person' : 'animal';
      for (let i = 0; i < o.count; i++) {
        if (sink.includes(i)) continue;
        o.getMatrixAt(i, mi); mw.copy(o.matrixWorld).multiply(mi);
        const pts = [];
        for (const x of [bb.min.x, bb.max.x]) for (const z of [bb.min.z, bb.max.z]) { v.set(x, bb.min.y, z).applyMatrix4(mw); pts.push(v.x, v.y, v.z); }
        v.set((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2).applyMatrix4(mw); pts.push(v.x, v.y, v.z);
        const c = clearanceOf(pts, 5);
        if (!c || c.clear > 0.25 || c.clear < -0.6) continue;
        out.push({ type, mode: 'mover', label: `${p}#${i}`, clear: r3(c.clear), at: c.at.map((n) => +n.toFixed(2)), on: c.on });
      }
    });
    return out;
  }

  /** The player cycle ridden along the main road for `seconds`, fixed dt, sampled every 0.1 s. */
  function ride(seconds) {
    d.rebuildColliders();
    const DT = 1 / 60;
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    let rig = null; d.scene.traverse((o) => { if (o.name === 'player_cycle_rig') rig = o; });
    if (!rig) return { error: 'no player_cycle_rig' };
    const lines = d.roadLines().filter((l) => l.pts.length > 3).sort((a, b) => b.pts.length - a.pts.length);
    const out = []; let n = 0, i0 = 0;
    // loop over road lines, riding each from its start toward its end, until the time is used
    const totalSteps = Math.round(seconds / DT);
    let step = 0;
    for (const line of lines) {
      if (step >= totalSteps) break;
      const pts = line.pts;
      d.setCycle({ x: pts[0][0], z: pts[0][1], heading: Math.atan2(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), speed: 5 });
      let k = 1, stuck = 0, lastX = pts[0][0], lastZ = pts[0][1];
      for (let s = 0; s < 60 * 40 && step < totalSteps; s++, step++) { // at most 40 s per line, then the next road
        const st = d.cycleState();
        while (k < pts.length - 1 && Math.hypot(pts[k][0] - st.x, pts[k][1] - st.z) < 4) k++;
        const want = Math.atan2(pts[k][0] - st.x, pts[k][1] - st.z);
        const err = wrap(want - st.heading);
        d.stepCycle(DT, 1, Math.max(-1, Math.min(1, -err * 2)), false);
        if (step % 6 === 0) {
          rig.updateMatrixWorld(true);
          const pp = [];
          rig.traverse((o) => {
            if (!o.isMesh || !o.geometry?.attributes.position) return;
            o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; mw.copy(o.matrixWorld);
            for (const x of [bb.min.x, bb.max.x]) for (const z of [bb.min.z, bb.max.z]) { v.set(x, bb.min.y, z).applyMatrix4(mw); pp.push(v.x, v.y, v.z); }
          });
          const c = clearanceOf(pp, pp.length / 3);
          if (c) out.push({ type: 'cycle', mode: 'ride', label: `cycle on ${line.id} t=${(step * DT).toFixed(1)}s`, clear: r3(c.clear), at: c.at.map((q) => +q.toFixed(2)), on: c.on, wheelClearance: r3(window.__gcWheel ? window.__gcWheel() : 0) });
        }
        if (s % 60 === 59) { if (Math.hypot(st.x - lastX, st.z - lastZ) < 1) { if (++stuck > 1) break; } else stuck = 0; lastX = st.x; lastZ = st.z; }
      }
    }
    return { samples: out, steps: step };
  }

  window.__gc = { measureStatic, measureMovers, ride, rebuild: () => { collectStatic(); buildSurfaces(); } };
}

async function main() {
  const t0 = Date.now();
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--outDir', OUTDIR], { cwd: ROOT, stdio: 'pipe' });
  let failures = 0;
  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
    page.setDefaultTimeout(0);
    page.on('pageerror', (e) => console.error('pageerror:', (e.stack || e.message).split('\n')[0]));
    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => {
      const d = window.__dopahar;
      if (d && d.zoneManager && d.dialogue) return true;
      const b = document.getElementById('play-btn');
      if (b) { b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.click(); }
      return false;
    }, null, { timeout: 180000, polling: 1000 });
    await page.waitForTimeout(1500);
    await page.evaluate(forceZones);
    await page.waitForTimeout(5000);
    await page.waitForTimeout(+(process.env.GC_WAIT || 42000)); // the game's own settle stage finishes first; this tool measures what the game settled
    await page.evaluate(install, {});

    const st = await page.evaluate(() => window.__gc.measureStatic());
    let rows = st.objs;
    let ridden = 0;
    console.log(`ground-check static: ${st.measured} objects measured, ${st.elevated} elevated (on a shelf/roof/prop, not ground-standing)`);
    const mv = await page.evaluate(() => window.__gc.measureMovers());
    rows = rows.concat(mv);
    if (RIDE) {
      // movers over live play: every 0.5 s of game time for SECONDS (the frame loop moves them)
      const tEnd = Date.now() + SECONDS * 1000;
      let samples = 0;
      const rideRes = await page.evaluate((s) => window.__gc.ride(s), SECONDS);
      if (rideRes.error) console.log('  ride: ' + rideRes.error); else { rows = rows.concat(rideRes.samples); ridden = rideRes.steps; }
      while (Date.now() < tEnd && samples < 400) {
        const m2 = await page.evaluate(() => { window.__gc.rebuild(); return window.__gc.measureMovers(); });
        rows = rows.concat(m2.map((r) => ({ ...r, mode: 'live' })));
        samples++;
        await page.waitForTimeout(500);
      }
      console.log(`  ride: ${ridden} cycle steps, ${samples} live mover samples`);
    }
    await browser.close();

    mkdirSync(`${ROOT}tmp`, { recursive: true });
    const bad = rows.filter((r) => r.clear < -LOW || r.clear > HIGH);
    // one entry per object label+type (a mover sampled many times keeps its worst)
    const worstBy = new Map();
    for (const r of bad) { const k = r.type + '|' + r.label.replace(/ t=[\d.]+s/, '') + '|' + (r.mode === 'static' ? r.at.join(',') : ''); const w = worstBy.get(k); if (!w || Math.abs(r.clear) > Math.abs(w.clear)) worstBy.set(k, r); }
    const uniq = [...worstBy.values()].sort((a, b) => Math.abs(b.clear) - Math.abs(a.clear));
    const types = [...new Set(rows.map((r) => r.type))].sort();
    console.log('\ntype        measured  sunk(>2cm)  floating(>3cm)');
    for (const t of types) {
      const m = rows.filter((r) => r.type === t), ub = uniq.filter((r) => r.type === t);
      console.log(`${t.padEnd(11)} ${String(m.length).padStart(8)}  ${String(ub.filter((r) => r.clear < 0).length).padStart(10)}  ${String(ub.filter((r) => r.clear > 0).length).padStart(14)}`);
    }
    console.log('\n20 worst (clearance cm, type, name, world x,z, on):');
    for (const r of uniq.slice(0, 20)) console.log(`  ${r.clear < 0 ? 'SUNK ' : 'FLOAT'} ${(r.clear * 100).toFixed(1).padStart(6)} cm  ${r.type}  ${r.label}  (${r.at.join(', ')})  on ${r.on}`);
    writeFileSync(`${ROOT}tmp/ground-check-result.json`, JSON.stringify({ counts: Object.fromEntries(types.map((t) => [t, { measured: rows.filter((r) => r.type === t).length, bad: uniq.filter((r) => r.type === t).length }])), worst: uniq.slice(0, 200) }, null, 1));
    failures = uniq.length;
    if (process.env.GC_FEET) {
      const fr = spawnSync('node', ['tools/feet-check.js'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, FEET_OUTDIR: OUTDIR, FEET_PORT: String(PORT + 1) } });
      console.log('\nfeet-check (people and animals standing):\n' + fr.stdout.split('\n').filter((l) => /FEET CHECK|figures measured/.test(l)).join('\n'));
      if (fr.status) failures++;
    }
    console.log(`\nGROUND CHECK: ${rows.length} samples, ${uniq.length} objects off the ground by more than ${LOW * 100} cm below / ${HIGH * 100} cm above (${((Date.now() - t0) / 1000).toFixed(0)} s).`);
  } finally {
    server.kill();
  }
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
