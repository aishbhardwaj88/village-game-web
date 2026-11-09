#!/usr/bin/env node
/**
 * D1 companion to load-time-test.mjs: same throttling (4G + CPU x4, SwiftShader), but it also presses Play the moment
 * it unlocks and records what the player feels next: ms from press to the first rendered frame, the worst frame gaps
 * and the long-task total in the first WATCH ms of play. Play-ready alone hides work that was merely moved past the press.
 * Usage: DIST=dist-d1 [QUERY=x] [WATCH=15000] node tools/load-play-test.mjs
 */
import { chromium } from 'playwright';
import http from 'node:http'; import zlib from 'node:zlib'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5198 + Math.floor(Math.random() * 300);
const URL_ = `http://localhost:${PORT}/village-game-web/`;
const QUERY = process.env.QUERY ? `?${process.env.QUERY}` : '';
const WATCH = Number(process.env.WATCH || 15000);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const GZ = new Set(['.html', '.js', '.css', '.json', '.svg']);
const DIST = path.join(ROOT, process.env.DIST || 'dist');
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).replace('/village-game-web', '') || '/';
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  const ext = path.extname(f); let buf = fs.readFileSync(f);
  const h = { 'content-type': MIME[ext] || 'application/octet-stream' };
  if (GZ.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { buf = zlib.gzipSync(buf); h['content-encoding'] = 'gzip'; }
  res.writeHead(200, h); res.end(buf);
}).listen(PORT);

const browser = await chromium.launch({ args: process.env.GL === 'metal' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }) /* GL=metal: this Mac's real GPU */;
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 9e6 / 8, uploadThroughput: 750e3 / 8 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU || 4) });
let bytes = 0; cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength || 0; });
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(() => {
  window.__lt = []; window.__frames = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ entryTypes: ['longtask'] });
  const raf = window.requestAnimationFrame.bind(window);
  const tick = (t) => { window.__frames.push(Math.round(t)); raf(tick); }; raf(tick);
});
const t0 = Date.now();
await page.goto(URL_ + QUERY, { waitUntil: 'commit' });
await page.waitForSelector('#start-overlay.ready', { timeout: 300000 });
const readyMs = Date.now() - t0; const bytesReady = bytes;
if (process.env.PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 4000 }); await cdp.send('Profiler.start'); }
const pressAt = await page.evaluate(() => { const b = document.getElementById('play-btn'); const t = performance.now();
  b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return t; });
await page.waitForTimeout(WATCH);
const r = await page.evaluate(([pressAt, WATCH]) => {
  const m = window.__loadMarks || {};
  const fr = window.__frames.filter((t) => t >= pressAt && t <= pressAt + WATCH);
  const gaps = []; for (let i = 1; i < fr.length; i++) gaps.push(fr[i] - fr[i - 1]);
  const lt = window.__lt.filter(([s]) => s >= pressAt && s <= pressAt + WATCH);
  return { firstRender: m.firstRender ? Math.round(m.firstRender - pressAt) : -1, frames: fr.length,
    worstGaps: gaps.sort((a, b) => b - a).slice(0, 5), longTaskMs: lt.reduce((s, x) => s + x[1], 0),
    longTasks: lt.filter((x) => x[1] > 300).map(([s, d]) => [Math.round(s - pressAt), d]),
    preLong: window.__lt.filter(([s, d]) => s < pressAt && d > 300) };
}, [pressAt, WATCH]);
if (process.env.PROFILE) {
  const { profile } = await cdp.send('Profiler.stop');
  const dt = profile.timeDeltas, byId = new Map(profile.nodes.map((n) => [n.id, n])), selfT = new Map();
  const PT0 = Number(process.env.PT0 || 0) * 1000, PT1 = Number(process.env.PT1 || 1e9) * 1000; let pt = 0; // window in ms after press
  profile.samples.forEach((id, i) => { pt += dt[i] || 0; if (pt >= PT0 && pt <= PT1) selfT.set(id, (selfT.get(id) || 0) + (dt[i] || 0)); });
  const memo = new Map(); const tot = (id) => { if (memo.has(id)) return memo.get(id); const n = byId.get(id); let s = selfT.get(id) || 0; for (const c of n.children || []) s += tot(c); memo.set(id, s); return s; };
  const MIN = Number(process.env.MIN || 500) * 1000;
  const walk = (id, d) => { const n = byId.get(id), f = n.callFrame, s = tot(id); if (s > MIN && d < Number(process.env.DEPTH || 18)) { console.log(' '.repeat(d) + (s / 1000).toFixed(0) + ' ms ' + (f.functionName || '(anon)') + ' ' + f.url.replace(URL_, '') + ':' + f.lineNumber); for (const c of n.children || []) walk(c, d + 1); } };
  walk(profile.nodes[0].id, 0);
}
await browser.close(); srv.close();
console.log(`Play ready: ${readyMs} ms (${(bytesReady / 1048576).toFixed(2)} MB)`);
console.log(`press -> first 3D frame: ${r.firstRender} ms; frames in ${WATCH} ms: ${r.frames}; worst gaps ${JSON.stringify(r.worstGaps)}`);
console.log(`long tasks after press: ${r.longTaskMs} ms total; >300 ms [t after press, dur]: ${JSON.stringify(r.longTasks)}`);
console.log(`long tasks >300 ms before press [start, dur]: ${JSON.stringify(r.preLong)}`);
console.log(`page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
