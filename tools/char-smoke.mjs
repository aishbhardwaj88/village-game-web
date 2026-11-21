#!/usr/bin/env node
/**
 * S7: short headless smoke (under ~3 minutes, run it under `flock /tmp/s7-browser.lock`): boots the built game, records
 * every console error and WHEN each character file is requested (before or after Play), clicks Play, waits, and prints
 * window.__charLOD. Usage: node tools/char-smoke.mjs [--dist dist] [--url '?proof=1'] [--wait 60] [--lean]
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTER_FILES } from '../src/characterLOD.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const get = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const PORT = 4351;
const server = spawn(process.execPath, [resolve(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--outDir', get('--dist', 'dist'), '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
const base = `http://localhost:${PORT}/village-game-web/`;
const out = { url: get('--url', '?proof=1'), errors: [], requests: [], playAtS: null };
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 300)); }
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    const t0 = Date.now();
    page.on('console', (m) => { if (m.type() === 'error') out.errors.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => out.errors.push(`pageerror: ${String(e.message).slice(0, 300)}`));
    page.on('crash', () => out.errors.push('PAGE CRASHED'));
    page.on('request', (r) => {
      const m = r.url().match(/assets\/models\/([a-z_0-9]+)\.glb/);
      if (m && CHARACTER_FILES.has(m[1])) out.requests.push({ file: m[1], method: r.method(), atS: Math.round((Date.now() - t0) / 1000), afterPlay: out.playAtS !== null });
    });
    if (a.includes('--lean')) await page.route(/assets\/(models|props|plants3d)\/[^/]+\.glb/, (route) => {
      const m = route.request().url().match(/assets\/models\/([a-z_0-9]+)\.glb/);
      return m && CHARACTER_FILES.has(m[1]) ? route.continue() : route.abort();
    });
    await page.goto(base + out.url);
    await page.waitForSelector('#start-overlay.ready', { timeout: 90000 }).catch(() => {});
    out.readyAtS = Math.round((Date.now() - t0) / 1000);
    out.requestsBeforePlay = out.requests.length;
    out.playAtS = out.readyAtS;
    await page.click('#play-btn', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(Number(get('--wait', '60')) * 1000);
    out.lod = await page.evaluate(() => window.__charLOD && { quality: window.__charLOD.quality, LOD: window.__charLOD.LOD, stats: { ...window.__charLOD.stats }, tiers: window.__charLOD.entries(), waiting: window.__charLOD.waiting() }).catch((e) => `evaluate failed: ${e.message.slice(0, 80)}`);
  } finally { await browser.close(); }
} finally { server.kill(); }
console.log(JSON.stringify(out, null, 1));
if (get('--json', null)) writeFileSync(resolve(ROOT, get('--json')), JSON.stringify(out, null, 2));
