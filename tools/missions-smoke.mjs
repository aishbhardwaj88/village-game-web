#!/usr/bin/env node
/**
 * Headless boot smoke for the missions agent (S7): the built game (dist-smoke/) under ?layout=old and ?layout=new.
 * For each layout: load, press Play, then read back from the RUNNING game where the mission people and vehicles really are,
 * start free roam (so the ten side jobs register for real), and walk (teleport) the player to the M7 baagh, the khet gate
 * and the kanche spot so their zones stream in. Red console errors and page errors are collected; an error that shows under
 * ?layout=new but not under ?layout=old fails the run.
 * Character models are skipped (they are not missions and run this shared box out of memory), like tools/layout-smoke.mjs.
 *
 * Usage: npx vite build --outDir dist-smoke && flock /tmp/s7-browser.lock node tools/missions-smoke.mjs [--only new|old]
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = +(process.env.PORT || 5347);
const DIST = path.join(ROOT, process.env.DIST || 'dist-smoke');
const BASE = `http://localhost:${PORT}/village-game-web/`;
const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.hdr': 'application/octet-stream', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wasm': 'application/wasm', '.ktx2': 'image/ktx2' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).replace('/village-game-web', '') || '/';
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
}).listen(PORT);

async function run(mode, browser) {
  const page = await browser.newPage({ viewport: { width: 480, height: 300 } });
  page.setDefaultTimeout(0);
  await page.addInitScript(() => { try { localStorage.setItem('dopahar_quality', 'low'); localStorage.removeItem('dopahar_save'); } catch (e) {} });
  const errors = [];
  page.on('crash', () => errors.push('page crashed (renderer)'));
  const CHAR_RE = /assets\/models\/(parlour_didi|sister|maa|pitaji|dada|dadi|brother|sarpanch|postman|teacher)\.glb/;
  await page.route(CHAR_RE, (route) => route.fulfill({ status: 404, body: '' }).catch(() => {}));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  const t0 = Date.now();
  await page.goto(`${BASE}?proof=1&dev=1&layout=${mode}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('#start-overlay.ready', { timeout: 90000 }).catch(() => {});
  await page.click('#play-btn');
  try {
    await page.waitForFunction(() => window.__dopahar && window.__dopahar.zoneManager && window.__dopahar.dialogue, null, { timeout: 150000 });
  } catch (e) {
    errors.push('boot after Play failed: ' + e.message.split('\n')[0]);
    await page.close().catch(() => {});
    return { mode, errors, crashed: true };
  }
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput && window.__dopahar.dialogue._advanceFromInput());
  const bootS = (Date.now() - t0) / 1000;
  const info = await page.evaluate(() => {
    const d = window.__dopahar, r = (v) => (v ? { x: +v.x.toFixed(1), z: +v.z.toFixed(1) } : null);
    const out = { vehicles: {}, npcs: {} };
    for (const v of d.vehicles || []) out.vehicles[v.preset.kind] = r(v.group.position);
    const trolley = (d.vehicles || []).find((v) => v.trolley);
    out.vehicles.trolleyAttached = !!trolley;
    for (const n of ['npc_dada', 'npc_maa', 'npc_pitaji', 'npc_child', 'npc_postman']) { let g = null; d.scene.traverse((o) => { if (!g && o.name === n) g = o; }); out.npcs[n] = g ? r(g.position) : null; }
    return out;
  });
  // free roam: the side jobs register for real
  await page.evaluate(() => window.__dopahar.startFreeRoam());
  await page.waitForTimeout(2500);
  const jobs = await page.evaluate(() => {
    const d = window.__dopahar, r = (v) => (v ? { x: +v.x.toFixed(1), z: +v.z.toFixed(1) } : null);
    const IP = d.INTERACTION_POINTS || (d.interactions && d.interactions.INTERACTION_POINTS) || [];
    const ip = (id) => r((IP.find((p) => p.id === id) || {}).position);
    return { sideJobs: !!d.sideJobs, points: Object.fromEntries(['job_dadi', 'job_pump_pump', 'stall_chaat', 'stall_banta', 'peepal_posters', 'job_kanche', 'job_gilli', 'job_milk_doodhwala', 'job_patang_kid', 'job_chakki_load', 'notice_board'].map((id) => [id, ip(id)])), interactions: IP.length };
  });
  // stream in the moved job grounds and the baagh
  const visits = {};
  for (const [name, x, z] of mode === 'new' ? [['baagh', 723.6, 86.4], ['gate', 684.4, 135], ['kanche', 583.4, 29]] : [['baagh', 737.7, 132.3]]) {
    await page.evaluate(([x, z]) => window.__dopahar.teleportPlayer(x, z), [x, z]);
    await page.waitForTimeout(5000);
    visits[name] = await page.evaluate(() => { const z = window.__dopahar.zoneManager.zones.get('trees_baagh'); return { baaghZone: z ? { x: +z.x.toFixed(1), z: +z.z.toFixed(1), active: !!z.active } : null }; });
  }
  await page.waitForTimeout(3000);
  await page.close();
  return { mode, bootS, errors, ...info, ...jobs, visits };
}

const browser = await chromium.launch({ headless: true, args: '--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --disable-gpu-sandbox'.split(' ') });
const out = {};
let failures = 0;
try {
  for (const mode of ['old', 'new']) {
    if (ONLY && ONLY !== mode) continue;
    const r = await run(mode, browser);
    out[mode] = r;
    console.log(`\n[${mode}] boot ${r.bootS ? r.bootS.toFixed(0) : '?'} s, errors ${r.errors.length}${r.crashed ? ' (CRASHED)' : ''}`);
    for (const e of [...new Set(r.errors)].slice(0, 15)) console.log('   error:', e);
    if (!r.crashed) console.log('   ', JSON.stringify({ vehicles: r.vehicles, npcs: r.npcs, sideJobs: r.sideJobs, interactions: r.interactions, points: r.points, visits: r.visits }));
  }
  if (out.old && out.new) {
    const base = new Set(out.old.errors);
    const fresh = [...new Set(out.new.errors)].filter((e) => !base.has(e));
    console.log(`\nnew-only errors under ?layout=new: ${fresh.length}`);
    for (const e of fresh) console.log('   ', e);
    failures += fresh.length;
  }
} finally {
  await browser.close();
  srv.close();
}
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tmp/missions-smoke.json'), JSON.stringify(out, null, 1));
process.exit(failures ? 1 : 0);
