#!/usr/bin/env node
/**
 * Perf budget gate. Serves dist/ via `vite preview` (run a build first), loads it in headless
 * Chromium (software GL) and, at four views, fails if draw calls exceed the per-view ratchet or
 * browser triangles exceed 1.1M. Draw calls and triangles are deterministic enough under software
 * GL; fps is not, so it is not checked.
 * TARGET: every view under 150 draw calls (CLAUDE.md section 9). Ratchets below are the measured
 * value plus headroom; LOWER them whenever a view improves, never raise them to hide a regression.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 5207, URL_ = `http://localhost:${PORT}/village-game-web/`;
const MAX_TRIS = 1.1e6;
// [name, x, z, yaw, ratchet draw calls]; null x = leave at spawn
const VIEWS = [
  ['spawn', null, null, Math.PI, 0],
  ['chauraha', 602.9, 19.9, Math.PI, 0],
  ['mainroad', 603, -60, Math.PI, 0],
  ['bazaar', 560, 15, Math.PI, 0],
];
const RATCHET = JSON.parse(process.env.RATCHET || '{}');
const LIMITS = { spawn: 130, chauraha: 140, mainroad: 190, bazaar: 152 }; // measured 127/135/186/149 on 8 Nov (software GL)
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const fails = [];
try {
  for (let i = 0; ; i++) { try { await fetch(URL_); break; } catch { if (i > 100) throw new Error('no server'); await new Promise(r => setTimeout(r, 300)); } }
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${URL_}?dev=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 120000 });
  await page.click('#play-btn');
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.__dopahar.dialogue?._advanceFromInput?.()).catch(() => {});
  for (const [name, x, z, yaw] of VIEWS) {
    await page.evaluate(([x, z, yaw]) => { const d = window.__dopahar; if (x != null) d.teleportPlayer(x, z); d.camRig.yaw = yaw; d.camRig.pitch = -0.15; d.camRig.distance = 5; d.camRig.update(10); }, [x, z, yaw]);
    await page.waitForTimeout(4000);
    const r = await page.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => { const i = window.__dopahar.renderer.info.render; res({ calls: i.calls, tris: i.triangles }); }))));
    const limit = RATCHET[name] ?? LIMITS[name];
    console.log(`${name.padEnd(9)} calls ${r.calls} (ratchet ${limit}, target 150)  tris ${(r.tris / 1e6).toFixed(2)}M (max ${MAX_TRIS / 1e6}M)`);
    if (r.calls > limit) fails.push(`${name}: ${r.calls} draw calls > ratchet ${limit}`);
    if (r.tris > MAX_TRIS) fails.push(`${name}: ${r.tris} triangles > ${MAX_TRIS}`);
  }
  if (errors.length) fails.push('page errors: ' + errors.slice(0, 3).join('; '));
  await browser.close();
} finally { server.kill(); }
console.log(fails.length ? 'PERF BUDGET: FAIL\n - ' + fails.join('\n - ') : 'PERF BUDGET: PASS');
process.exit(fails.length ? 1 : 0);
