#!/usr/bin/env node
/** Real-key canal crossing test (normal render; ?proof=1 only positions things). Mounts a vehicle with the real E key, holds W, and reports the z it reaches. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 5273, BASE = `http://localhost:${PORT}/`;
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const wait = async () => { for (let i = 0; i < 100; i++) { try { await fetch(BASE); return; } catch { await new Promise((r) => setTimeout(r, 300)); } } };
try {
  await wait();
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
  const errors = [];
  for (const [kind, bx, secs] of [['cart', 771, 40], ['tractor', 771, 24]]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${BASE}?proof=1`); await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
    await page.click('#play-btn'); await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()); await page.waitForTimeout(2500);
    const start = await page.evaluate(({ kind, bx }) => {
      const d = window.__dopahar; const v = d.vehicles.find((q) => q.preset.kind === kind);
      const t = v.trolley; // an attached trolley must move with the tractor, else it drags the tractor back to its old spot
      const off = t ? { x: t.group.position.x - v.group.position.x, z: t.group.position.z - v.group.position.z, ry: t.group.rotation.y - v.group.rotation.y } : null;
      const oy = v.group.rotation.y; const c = Math.cos(-oy), sn = Math.sin(-oy);
      v.group.position.set(bx, 0, 46); v.group.rotation.y = 0; v.yaw = 0; v.speed = 0;
      if (t) { const lx = off.x * c + off.z * sn, lz = -off.x * sn + off.z * c; t.group.position.set(bx + lx, t.group.position.y, 46 + lz); t.group.rotation.y = off.ry; }
      d.teleportPlayer(bx + 2.2, 46); return { z: v.group.position.z };
    }, { kind, bx });
    await page.waitForTimeout(500);
    if (kind === 'tractor') await page.evaluate(() => { const d = window.__dopahar; d.mount(d.vehicles.find((q) => q.preset.kind === 'tractor')); }); // same hook regression-check uses
    else await page.keyboard.press('KeyE');
    await page.waitForTimeout(600);
    const mounted = await page.evaluate((kind) => window.__dopahar.vehicles.find((q) => q.preset.kind === kind).mounted, kind);
    await page.keyboard.down('KeyW');
    const trace = [];
    for (let i = 0; i < secs; i++) { await page.waitForTimeout(1000); trace.push(await page.evaluate((kind) => { const v = window.__dopahar.vehicles.find((q) => q.preset.kind === kind); return +v.group.position.z.toFixed(1) + '/x' + v.group.position.x.toFixed(1); }, kind)); }
    await page.keyboard.up('KeyW');
    console.log(kind, 'at bridge x=', bx, 'mounted=', mounted, 'z trace:', trace.join(' '));
    await page.close();
  }
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
} finally { server.kill(); }
