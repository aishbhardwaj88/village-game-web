#!/usr/bin/env node
/**
 * Shops-land game smoke (headless, SwiftShader, no throttling): serves dist/ (run `npm run build:unchecked` first), opens
 * the game with ?layout=new&proof=1 and with ?layout=old&proof=1, presses Play, stands the player in the square, and
 * reports console errors (new ones = in new but not in old), whether the kit built, and the frame's draw calls.
 *   flock /tmp/s7-browser.lock node docs/s7/shops-land/game-smoke.mjs
 */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = 5600 + Math.floor(Math.random() * 300);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.hdr': 'application/octet-stream', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).replace('/village-game-web', '') || '/';
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=2048'] });
const out = {};
for (const layout of ['old', 'new']) {
  try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await page.goto(`http://localhost:${PORT}/village-game-web/?layout=${layout}&proof=1`, { waitUntil: 'commit' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 300000 });
  await page.evaluate(() => document.getElementById('play-btn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await page.waitForTimeout(15000);
  await page.evaluate(() => window.__dopahar?.teleportPlayer?.(602.6, -40));
  await page.waitForTimeout(25000);
  const r = await page.evaluate(() => {
    const d = window.__dopahar; const land = d?.scene.getObjectByName('s7_shops_land');
    return { built: !!land, layers: land ? land.children.map((c) => c.name) : [], calls: d?.renderer.info.render.calls, triangles: d?.renderer.info.render.triangles };
  });
  out[layout] = { ...r, errors };
  await page.close();
  } catch (e) { out[layout] = { crashed: String(e).slice(0, 200), errors: [] }; }
}
const newErrors = out.new.errors.filter((e) => !out.old.errors.includes(e));
console.log(JSON.stringify({ new: { ...out.new, errors: out.new.errors.length }, old: { ...out.old, errors: out.old.errors.length }, newErrors }, null, 1));
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
srv.close();
process.exit(0);
