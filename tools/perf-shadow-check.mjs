#!/usr/bin/env node
/**
 * Shadows before/after: the same views with the sun's shadows on (?shadows=follow), once with the distance
 * shadow manager off (?shadowdist=0) and once on. Reads the shadow-pass and main-pass draw calls per view.
 * Views are taken shortly after Play (the village is still assembling further out, the same for both runs),
 * so it also works on a small machine where a full ride runs out of memory.
 *
 *   SKIP_BUILD=1 node tools/perf-shadow-check.mjs        (DIST=dist, LAYOUT=old, NOCHARS=1 to skip the 10 big characters)
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const env = process.env;
const DIST = env.DIST || 'dist';
if (!env.SKIP_BUILD) execSync('npm run build:unchecked', { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
const PORT = 5900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}/village-game-web/`;
const srv = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
const stop = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
process.on('exit', stop);
process.on('unhandledRejection', () => {});
for (let i = 0; i < 100; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }

const VIEWS = (env.VIEWS || 'bazaar,chowk,school,haveli').split(',');
const CHAR_RE = /assets\/models\/(parlour_didi|sister|maa|pitaji|dada|dadi|brother|sarpanch|postman|teacher)\.glb/;

async function measure(query) {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  if (env.NOCHARS) await page.route(CHAR_RE, (r) => r.fulfill({ status: 404, body: '' }).catch(() => {}));
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}?layout=${env.LAYOUT || 'old'}&proof=1&${query}`);
  await page.waitForSelector('#start-overlay.ready', { timeout: 300000 });
  await page.evaluate(() => document.getElementById('play-btn').click());
  await page.waitForFunction(() => (window.__loadMarks || {}).firstRender, null, { timeout: 120000 });
  await page.evaluate(() => {
    const d = window.__dopahar, r = d.renderer;
    const cams = new Set(); d.scene.traverse((o) => { if (o.isLight && o.shadow && o.shadow.camera) cams.add(o.shadow.camera); });
    const c = (window.__sc = { main: 0, shadow: 0 });
    const orig = r.renderBufferDirect.bind(r);
    r.renderBufferDirect = function (camera, ...rest) { if (cams.has(camera)) c.shadow++; else if (camera === d.camera) c.main++; return orig(camera, ...rest); };
    try { d.dialogue._advanceFromInput(); } catch {}
  });
  const out = {};
  for (const v of VIEWS) {
    await page.evaluate((v) => { const a = window.__dopahar.ANCHORS[v]; window.__dopahar.teleportPlayer(a.x, a.z + 12); }, v);
    await page.waitForTimeout(Number(env.SETTLE || 4000)); // shadow manager ticks every 250 ms, zones build nearby
    out[v] = await page.evaluate(async () => {
      // average over 5 frames
      const s = { main: 0, shadow: 0, all: 0, n: 0 };
      for (let i = 0; i < 5; i++) {
        window.__sc.main = 0; window.__sc.shadow = 0;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        s.main += window.__sc.main; s.shadow += window.__sc.shadow; s.all += window.__dopahar.renderer.info.render.calls; s.n += 2;
      }
      const st = window.__perfS7?.shadows || {};
      return { main: Math.round(s.main / s.n), shadow: Math.round(s.shadow / s.n), casters: st.casters, castingNow: st.castingNow, blobs: st.blobs, tickMs: st.lastTickMs };
    });
  }
  await browser.close();
  return { query, views: out, errors };
}

const before = await measure('shadows=follow&shadowdist=0');
console.log('before (shadows on, distance manager off):', JSON.stringify(before.views));
const after = await measure('shadows=follow');
console.log('after  (shadows on, distance manager on): ', JSON.stringify(after.views));
const res = { date: new Date().toISOString(), layout: env.LAYOUT || 'old', noChars: !!env.NOCHARS, before, after };
fs.mkdirSync(path.join(ROOT, 'docs/s7/perf'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/s7/perf/shadows.json'), JSON.stringify(res, null, 1));
stop();
process.exit(0);
