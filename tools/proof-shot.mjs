#!/usr/bin/env node
/**
 * Normal-mode proof screenshots. Loads the built game with `?proof=1` (positioning hook
 * only — none of dev mode's visible extras), clicks Play like a player, then captures
 * each shot given as JSON: node tools/proof-shot.mjs <outDir> '<[{name,x,z,yaw,pitch,distance,eval?}]>'
 * Uses `vite dev` (no build needed) unless PREVIEW=1. Prints draw calls + console errors.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const [outDir, shotsJson] = [process.argv[2], process.argv[3]];
const shots = JSON.parse(shotsJson);
mkdirSync(outDir, { recursive: true });
const PREVIEW = !!process.env.PREVIEW;
const PORT = PREVIEW ? 5271 : 5272;
const BASE = PREVIEW ? `http://localhost:${PORT}/village-game-web/` : `http://localhost:${PORT}/`;
const wait = async (u) => { for (let i = 0; i < 100; i++) { try { await fetch(u); return; } catch { await new Promise((r) => setTimeout(r, 300)); } } throw new Error('server'); };
const server = spawn('npx', PREVIEW ? ['vite', 'preview', '--port', String(PORT), '--strictPort'] : ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
try {
  await wait(BASE);
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}?proof=1${process.env.EXTRA_QS || ''}`, { waitUntil: 'load' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
  await page.click('#play-btn');
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
  await page.waitForTimeout(2500);
  for (const s of shots) {
    if (s.cam) {
      // free photo camera: {cam:{pos:[x,y,z],target:[x,y,z],fov}} — player teleported to (x,z) too so zone streaming builds around it
      await page.evaluate(({ x, z, cam }) => { const d = window.__dopahar; d.unfreezeCamera(); d.teleportPlayer(x ?? cam.target[0], z ?? cam.target[2]); }, s);
      await page.waitForTimeout(800);
      await page.evaluate((cam) => window.__dopahar.photoCamera(cam), s.cam);
    } else {
      await page.evaluate(({ x, z, yaw = Math.PI, pitch = -0.15, distance = 5 }) => {
        const d = window.__dopahar;
        d.unfreezeCamera();
        d.teleportPlayer(x, z);
        d.camRig.yaw = yaw; d.camRig.pitch = pitch; d.camRig.distance = distance; d.camRig.update(10);
      }, s);
    }
    if (s.eval) { const r = await page.evaluate(s.eval); if (r !== undefined) console.log(s.name, 'eval:', JSON.stringify(r)); }
    for (let i = 0; i < 10; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${outDir}/${s.name}.png` });
    const info = await page.evaluate(() => ({ calls: window.__dopahar.renderer.info.render.calls, tris: window.__dopahar.renderer.info.render.triangles }));
    console.log(s.name, JSON.stringify(info));
  }
  console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
  await browser.close();
} finally { server.kill(); }
