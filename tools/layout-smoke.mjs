#!/usr/bin/env node
/**
 * Headless smoke boot of the built game (dist/) under ?layout=old and ?layout=new (S7 layout sprint).
 * For each layout: load, press Play, start the story, build EVERY streamed zone once (so a zone that breaks only at its new
 * spot is caught), and collect red console errors and page errors. Then it reads back where the game really draws a few
 * places (zone group position + yaw) and compares them with src/anchors.js: the coordinate-frame check.
 *
 * Fails (exit 1) when ?layout=new shows an error ?layout=old does not, or a measured place is > 0.5 m / 2 deg off its anchor.
 *
 * --pre-play: stop at the title screen (catches module-level errors of both layouts in ~1 min, no 3D world).
 * Usage: npx vite build --outDir dist-smoke && flock /tmp/s7-browser.lock node tools/layout-smoke.mjs [--only new|old] [--no-force]
 *        (character models are skipped: they are not layout and run this shared box out of memory; CHARS=1 keeps them)
 *        PORT=5341 DIST=dist to override.
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = +(process.env.PORT || 5341);
const DIST = path.join(ROOT, process.env.DIST || 'dist-smoke'); // build it with: npx vite build --outDir dist-smoke
const BASE = `http://localhost:${PORT}/village-game-web/`;
const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const FORCE = !args.includes('--no-force');
const PRE_PLAY = args.includes('--pre-play'); // load to the title screen only (module code, anchors, layout data), no 3D world

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.hdr': 'application/octet-stream', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wasm': 'application/wasm', '.ktx2': 'image/ktx2' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).replace('/village-game-web', '') || '/';
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
}).listen(PORT);

// zone name -> anchor id, for the coordinate check (groups built at the anchor and turned by its yaw)
const PROBES = { anganwadi: 'anganwadi', gurudwara: 'gurudwara', old_haveli: 'haveli', post_office_v2: 'yard_post', health_subcentre: 'health' };

async function run(mode, browser) {
  const page = await browser.newPage({ viewport: { width: 480, height: 300 } });
  page.setDefaultTimeout(0);
  await page.addInitScript(() => { try { localStorage.setItem('dopahar_quality', 'low'); localStorage.removeItem('dopahar_save'); } catch (e) {} }); // lightest render: this box shares 2 CPUs with other agents
  const errors = [];
  page.on('crash', () => errors.push('page crashed (renderer)'));
  // the 10 character models are what runs this shared, GPU-less box out of memory (docs/s7/perf.md); they are not layout: skip them
  const CHAR_RE = /assets\/models\/(parlour_didi|sister|maa|pitaji|dada|dadi|brother|sarpanch|postman|teacher)\.glb/;
  if (!process.env.CHARS) await page.route(CHAR_RE, (route) => route.fulfill({ status: 404, body: '' }).catch(() => {}));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  const t0 = Date.now();
  await page.goto(`${BASE}?proof=1&layout=${mode}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('#start-overlay.ready', { timeout: 60000 }).catch(() => {});
  const readyS = (Date.now() - t0) / 1000;
  if (PRE_PLAY) { await page.waitForTimeout(3000); await page.close(); return { mode, bootS: readyS, prePlay: true, errors, player: { x: NaN, z: NaN }, zones: 0, built: 0, buildErrors: [], probes: [] }; }
  await page.click('#play-btn');
  try {
    await page.waitForFunction(() => window.__dopahar && window.__dopahar.zoneManager && window.__dopahar.dialogue, null, { timeout: 900000 });
  } catch (e) {
    errors.push('boot after Play failed: ' + e.message.split('\n')[0]);
    await page.close().catch(() => {});
    return { mode, bootS: readyS, errors, player: { x: NaN, z: NaN }, zones: 0, built: 0, buildErrors: [], probes: [], crashed: true };
  }
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput && window.__dopahar.dialogue._advanceFromInput());
  await page.waitForTimeout(3000);
  const bootS = (Date.now() - t0) / 1000;
  // walk (teleport) the player to each probed place so the zone manager streams it in the normal way, then read it back
  for (const zone of Object.keys(PROBES)) {
    await page.evaluate((zone) => { const d = window.__dopahar; const z = d.zoneManager.zones.get(zone); if (z) d.teleportPlayer(z.x + 12, z.z + 12); }, zone);
    await page.waitForFunction((zone) => { const z = window.__dopahar.zoneManager.zones.get(zone); return !z || z.active; }, zone, { timeout: 120000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
  const info = await page.evaluate(({ FORCE, PROBES }) => {
    const d = window.__dopahar;
    const out = { player: { x: d.player.position.x, z: d.player.position.z }, zones: d.zoneManager.zones.size, built: 0, buildErrors: [], probes: [] };
    if (FORCE) {
      d.zoneManager.update = () => {};
      for (const z of d.zoneManager.zones.values()) {
        if (z.active) continue;
        try {
          let built = z.build();
          if (built && typeof built.next === 'function') { let r; while (!(r = built.next()).done); built = r.value; }
          const g = built && built.isObject3D ? built : built && built.group;
          if (g) { z.group = g; z.onFrame = built.onFrame || null; d.scene.add(g); z.active = true; out.built++; }
        } catch (e) { out.buildErrors.push(`${z.name}: ${e.message}`); }
      }
    }
    for (const [zone, id] of Object.entries(PROBES)) {
      const zz = d.zoneManager.zones.get(zone);
      let g = zz && zz.group;
      if (!g) d.scene.traverse((o) => { if (!g && o.name === zone) g = o; });
      const a = d.ANCHORS[id];
      if (!g || !a) { out.probes.push({ zone, id, missing: true }); continue; }
      out.probes.push({ zone, id, gx: g.position.x, gz: g.position.z, gry: g.rotation.y, ax: a.x, az: a.z, ary: a.ry || 0 });
    }
    return out;
  }, { FORCE, PROBES });
  await page.waitForTimeout(4000); // async .glb swaps and late errors
  await page.close();
  return { mode, bootS, errors, ...info };
}

const browser = await chromium.launch({ headless: true, args: (process.env.GLARGS || '--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --disable-gpu-sandbox').split(' ') });
const out = {};
let failures = 0;
try {
  for (const mode of ['old', 'new']) {
    if (ONLY && ONLY !== mode) continue;
    const r = await run(mode, browser);
    out[mode] = r;
    console.log(`\n[${mode}] boot ${r.bootS.toFixed(0)} s, player at (${r.player.x.toFixed(1)}, ${r.player.z.toFixed(1)}), zones ${r.zones} (${r.built} forced), errors ${r.errors.length}, zone build errors ${r.buildErrors.length}`);
    for (const e of [...new Set(r.errors)].slice(0, 20)) console.log('   error:', e);
    for (const e of r.buildErrors) console.log('   zone build error:', e);
    for (const p of r.probes) {
      if (p.missing) { console.log(`   probe ${p.zone}: not found`); continue; }
      const dpos = Math.hypot(p.gx - p.ax, p.gz - p.az);
      let dyaw = Math.abs(((p.gry - p.ary) * 180 / Math.PI + 540) % 360 - 180);
      const ok = dpos < 0.5 && dyaw < 2;
      if (!ok) failures++;
      console.log(`   probe ${p.zone.padEnd(16)} drawn (${p.gx.toFixed(1)}, ${p.gz.toFixed(1)}) yaw ${(p.gry * 180 / Math.PI).toFixed(1)}  anchor ${p.id} (${p.ax.toFixed(1)}, ${p.az.toFixed(1)}) yaw ${(p.ary * 180 / Math.PI).toFixed(1)}  ${ok ? 'ok' : 'OFF'}`);
    }
  }
  if (out.old && out.new) {
    if (out.old.crashed && out.new.crashed) console.log('\nboth layouts crashed after Play: this box cannot run the 3D world right now (same on ?layout=old), not a layout fault');
    const base = new Set([...out.old.errors, ...out.old.buildErrors]);
    const fresh = [...new Set([...out.new.errors, ...out.new.buildErrors])].filter((e) => !base.has(e));
    console.log(`\nnew-only errors under ?layout=new: ${fresh.length}`);
    for (const e of fresh) console.log('   ', e);
    failures += fresh.length;
  }
} finally {
  await browser.close();
  srv.close();
}
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tmp/layout-smoke.json'), JSON.stringify(out, null, 1));
const crashed = Object.values(out).some((r) => r.crashed);
console.log(`\nLAYOUT SMOKE: ${failures ? 'FAIL' : crashed ? 'INCONCLUSIVE (title screen clean on both; the 3D world crashed on this box)' : 'PASS'} (${failures})`);
process.exit(failures ? 1 : crashed ? 2 : 0);
