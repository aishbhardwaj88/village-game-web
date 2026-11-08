#!/usr/bin/env node
/**
 * Frame-time + draw-call check (P1 step 7). Serves dist/ via `vite preview` (run `npm run build` first), loads it in
 * headless Chromium (software GL) and at four views reads src/perfProbe.js's per-frame averages.
 *
 * Headless software rendering cannot give real fps and a busy machine makes wall time noisy, so the gates are:
 *   - CPU-side JS per frame ("logic" section = everything before composer.render, plus the sub-sections) under a
 *     lenient ceiling: LOGIC_MS (default 25) and no single named sub-section over SECTION_MS (default 12).
 *   - draw calls per view under the same ratchet as perf-budget-check.js (hard cap 250).
 *   - the standOn scheduler (own rAF) must cost under STANDON_MS (default 8) per rendered frame after settling.
 *   - fps is only printed, and only fails below FPS_FLOOR (default 0.5, i.e. "the page is not frozen").
 * Override with env vars. Not part of `npm run build` (takes ~2 min); run `npm run perf-check-fps`.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 5393, URL_ = `http://localhost:${PORT}/village-game-web/`;
const env = (k, d) => Number(process.env[k] ?? d);
const LOGIC_MS = env('LOGIC_MS', 25), SECTION_MS = env('SECTION_MS', 12), STANDON_MS = env('STANDON_MS', 8);
const FPS_FLOOR = env('FPS_FLOOR', 0.5), CALL_CAP = env('CALL_CAP', 250), SETTLE = env('SETTLE', 45000), SEC = env('SEC', 6);
const VIEWS = [['spawn', null, null], ['chauraha', 602.9, 19.9], ['mainroad', 603, -60], ['bazaar', 560, 15]];
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const fails = [];
try {
  for (let i = 0; ; i++) { try { await fetch(URL_); break; } catch { if (i > 100) throw new Error('no server'); await new Promise(r => setTimeout(r, 300)); } }
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${URL_}?dev=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 120000 });
  await page.click('#play-btn', { noWaitAfter: true, timeout: 180000 });
  await page.waitForTimeout(SETTLE); // lets the standOn settling stages (0/3/40 s) finish
  for (const [name, x, z] of VIEWS) {
    if (x != null) await page.evaluate(([x, z]) => { const d = window.__dopahar; d.teleportPlayer(x, z); d.camRig.yaw = Math.PI; d.camRig.pitch = -0.15; d.camRig.distance = 5; d.camRig.update(10); }, [x, z]);
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.__perfReset());
    await page.waitForTimeout(SEC * 1000);
    const r = await page.evaluate((SEC) => {
      const p = window.__perfProbe, f = Math.max(1, p.frames), t = {};
      for (const k in p.t) t[k] = p.t[k] / f;
      const i = window.__dopahar.renderer.info.render;
      return { t, frames: p.frames, fps: p.frames / SEC, calls: i.calls, tris: i.triangles };
    }, SEC);
    const subs = Object.entries(r.t).filter(([k]) => !['logic', 'render'].includes(k) && !k.startsWith('standOn')).sort((a, b) => b[1] - a[1]);
    const top = subs[0];
    const so = r.t['standOn.tick'] || 0;
    console.log(`${name.padEnd(9)} fps ${r.fps.toFixed(1)}  logic ${(r.t.logic || 0).toFixed(2)}ms  render(cpu) ${(r.t.render || 0).toFixed(2)}ms  standOn ${so.toFixed(2)}ms  top ${top ? top[0] + ' ' + top[1].toFixed(2) + 'ms' : '-'}  calls ${r.calls}  tris ${(r.tris / 1e6).toFixed(2)}M`);
    if ((r.t.logic || 0) > LOGIC_MS) fails.push(`${name}: logic ${(r.t.logic).toFixed(1)} ms/frame > ${LOGIC_MS}`);
    for (const [k, v] of subs) if (v > SECTION_MS) fails.push(`${name}: section ${k} ${v.toFixed(1)} ms/frame > ${SECTION_MS}`);
    if (so > STANDON_MS) fails.push(`${name}: standOn.tick ${so.toFixed(1)} ms/frame > ${STANDON_MS}`);
    if (r.calls > CALL_CAP) fails.push(`${name}: ${r.calls} draw calls > ${CALL_CAP}`);
    if (r.fps < FPS_FLOOR) fails.push(`${name}: fps ${r.fps.toFixed(2)} < floor ${FPS_FLOOR}`);
  }
  if (errors.length) fails.push('page errors: ' + errors.slice(0, 3).join('; '));
  await browser.close();
} finally { server.kill(); }
console.log(fails.length ? 'PERF CHECK: FAIL\n - ' + fails.join('\n - ') : 'PERF CHECK: PASS');
process.exit(fails.length ? 1 : 0);
