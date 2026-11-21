#!/usr/bin/env node
/**
 * S7 fixes game smoke (headless, SwiftShader): serves dist/ (run `npm run build:unchecked` first), boots the game with
 * ?layout=<old|new>&proof=1, logs EVERY failed request (status >= 400 or network failure) with its URL from the first byte
 * on, presses Play, walks the player to a spot, and saves the corner minimap and the notebook map as JPEGs.
 *   flock /tmp/s7-browser.lock node docs/s7/fixes/game-smoke.mjs <old|new> [x,z] [--no-play]
 * Writes docs/s7/fixes/smoke-<layout>.json (failed requests, console errors) and minimap-<layout>.jpg / notebook-<layout>.jpg.
 */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const OUT = fileURLToPath(new URL('.', import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = 5900 + Math.floor(Math.random() * 300);
const layout = process.argv[2] || 'new';
const at = (process.argv.find((a) => /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(a)) || '790,75').split(',').map(Number);
const noPlay = process.argv.includes('--no-play');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.hdr': 'application/octet-stream', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ktx2': 'image/ktx2', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).replace('/village-game-web', '') || '/';
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=2048'] });
const killer = setTimeout(() => { console.log('TIMEOUT'); dump(); process.exit(2); }, 280000);
const failed = [], errors = [], phase = { now: 'boot' };
let result = {};
function dump() { fs.writeFileSync(path.join(OUT, `smoke-${layout}.json`), JSON.stringify({ layout, failed, errors, result }, null, 1)); }
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  page.on('response', (r) => { if (r.status() >= 400) failed.push({ status: r.status(), url: r.url().replace(/^http:\/\/localhost:\d+/, ''), phase: phase.now }); });
  page.on('requestfailed', (r) => failed.push({ status: 'failed ' + (r.failure()?.errorText || ''), url: r.url().replace(/^http:\/\/localhost:\d+/, ''), phase: phase.now }));
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await page.goto(`http://localhost:${PORT}/village-game-web/?layout=${layout}&proof=1`, { waitUntil: 'commit' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 200000 });
  phase.now = 'title';
  if (!noPlay) {
    await page.waitForTimeout(3000);
    phase.now = 'play';
    await page.evaluate(() => document.getElementById('play-btn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(12000);
    await page.evaluate(([x, z]) => window.__dopahar?.teleportPlayer?.(x, z), at);
    await page.waitForTimeout(15000);
    const mm = await page.evaluate(() => { const c = document.getElementById('minimap-canvas'); return c && c.width ? c.toDataURL('image/jpeg', 0.92) : null; });
    if (mm) fs.writeFileSync(path.join(OUT, `minimap-${layout}.jpg`), Buffer.from(mm.split(',')[1], 'base64'));
    await page.evaluate(() => document.getElementById('minimap-wrap')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(1500);
    const nb = await page.evaluate(() => { const c = document.getElementById('notebook-canvas'); return c && c.width ? c.toDataURL('image/jpeg', 0.85) : null; });
    if (nb) fs.writeFileSync(path.join(OUT, `notebook-${layout}.jpg`), Buffer.from(nb.split(',')[1], 'base64'));
    result = { minimap: !!mm, notebook: !!nb, at };
  }
  await page.close();
} catch (e) { result.crashed = String(e).slice(0, 300); }
clearTimeout(killer);
dump();
const by = {};
for (const f of failed) by[f.phase] = (by[f.phase] || 0) + 1;
console.log(JSON.stringify({ layout, failedByPhase: by, failed: failed.map((f) => `${f.status} ${f.phase} ${f.url}`), consoleErrors: errors.length, result }, null, 1));
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
srv.close();
process.exit(0);
