#!/usr/bin/env node
/**
 * Load-time gate: serves dist/ (run `npm run build` first), throttles to ~4G
 * (9 Mbit/s down (typical 4G), 100 ms RTT) with a 4x CPU slowdown, and reports:
 *  - ms until the title text is painted (must come before the Play button is ready)
 *  - ms until Play is ready, and bytes transferred by then
 * Fails if the title is not painted before Play is ready, or title > 3 s, or Play > 10 s.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5197;
const URL_ = `http://localhost:${PORT}/village-game-web/`;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch {} };
process.on('exit', stop);

for (let i = 0; i < 100; i++) {
  try { await fetch(URL_); break; } catch { await new Promise(r => setTimeout(r, 300)); }
}

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: (9e6 / 8), uploadThroughput: (750e3 / 8) });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU || 4) });
let bytes = 0;
cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength || 0; });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

const t0 = Date.now();
await page.goto(URL_, { waitUntil: 'commit' });
await page.waitForSelector('#start-overlay .title-en', { state: 'visible', timeout: 60000 });
const titleMs = Date.now() - t0;
const readyAtTitle = await page.evaluate(() => document.getElementById('start-overlay').classList.contains('ready'));
const bytesAtTitle = bytes;
await page.waitForSelector('#start-overlay.ready', { timeout: 120000 });
const readyMs = Date.now() - t0;
const bytesAtReady = bytes;
await browser.close(); stop();

const mb = n => (n / 1048576).toFixed(2) + ' MB';
console.log(`title painted: ${titleMs} ms (${mb(bytesAtTitle)} transferred, Play ready yet: ${readyAtTitle})`);
console.log(`Play ready:    ${readyMs} ms (${mb(bytesAtReady)} transferred)`);
console.log(`page errors:   ${errors.length}`);
const fails = [];
if (readyAtTitle) fails.push('Play was already ready when the title painted: title did not precede loading');
if (titleMs > 3000) fails.push(`title took ${titleMs} ms (> 3000)`);
if (readyMs > 10000) fails.push(`Play ready took ${readyMs} ms on throttled 4G (> 10000)`);
if (errors.length) fails.push(errors.join('; '));
console.log(fails.length ? 'LOAD TIME: FAIL\n - ' + fails.join('\n - ') : 'LOAD TIME: PASS');
process.exit(fails.length ? 1 : 0);
