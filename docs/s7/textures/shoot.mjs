#!/usr/bin/env node
/**
 * S7 textures agent — one headless render of the 4 geometry-based material fixes (tin,
 * thatch, mud-and-dung, jute). Starts its own Vite dev server, opens preview.html, saves
 * docs/s7/textures/board.png, prints console errors.
 *   node docs/s7/textures/shoot.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const OUT = fileURLToPath(new URL('.', import.meta.url));
const PORT = 5322;
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
const base = `http://localhost:${PORT}/village-game-web/docs/s7/textures/preview.html`;
for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 700 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
  const err = await page.evaluate(() => window.__error);
  if (err) errors.push(err);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__snap());
  await page.screenshot({ path: OUT + 'board.png' });
  console.log('saved', OUT + 'board.png');
  if (errors.length) { console.log('CONSOLE ERRORS:'); for (const e of errors) console.log(' -', e.slice(0, 400)); }
  else console.log('no console errors');
} finally {
  await browser.close();
  vite.kill();
}
