#!/usr/bin/env node
/**
 * S7: CPU cost of the characters per frame, with and without src/characterLOD.js (?charlod=0), on the production build.
 * Opens ?gather=1&proof=1 (the whole cast at the square + the village NPCs), points the camera at the group from
 * 6 m, 35 m and 70 m, and for each reads window.__perfProbe for 8 s: 'npcLifeHead' (= the cast's walking script +
 * every character's animation update, src/main.js tick) and 'logic' (whole frame minus drawing), ms per frame.
 * Also prints the tier counts from window.__charLOD.
 *
 * Usage: node tools/char-lod-measure.mjs [--dist dist] [--lean] [--json docs/s7/characters/lod.json]
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const get = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const DIST = get('--dist', 'dist'), PORT = 4331, LEAN = a.includes('--lean');
const CAST = new Set(['maa', 'dadi', 'pitaji', 'sarpanch', 'dada', 'postman', 'sister', 'brother', 'teacher', 'parlour_didi']);

const server = spawn(process.execPath, [resolve(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
const base = `http://localhost:${PORT}/village-game-web/`;
for (let i = 0; i < 100; i++) { try { if ((await fetch(base)).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 300)); }

// The machine is shared with other agents' browsers (one memory pool, ~8 GB): wait until ~3.5 GB is free first.
async function waitForMemory(mb = 3500, maxMin = 15) {
  const free = () => { try { return Number(execSync("free -m | awk '/^Mem:/ {print $7}'").toString()); } catch { return mb; } };
  const t0 = Date.now();
  while (free() < mb && Date.now() - t0 < maxMin * 60000) await new Promise((r) => setTimeout(r, 10000));
  return free();
}

async function measure(lod) {
  console.log(`LOD ${lod ? 'on' : 'off'}: free memory ${await waitForMemory()} MB`);
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
    if (LEAN) {
      await page.route(/assets\/(models|props|plants3d)\/[^/]+\.glb/, (route) => {
        const m = route.request().url().match(/assets\/models\/([a-z_0-9]+)\.glb/);
        return m && CAST.has(m[1]) ? route.continue() : route.abort();
      });
      await page.route(/\.(mp3|ogg|wav|m4a|hdr|exr)(\?|$)/, (route) => route.abort());
    }
    await page.goto(`${base}?gather=1&proof=1${lod ? '' : '&charlod=0'}`);
    await page.waitForSelector('#start-overlay.ready', { timeout: 120000 }).catch(() => {});
    await page.click('#play-btn').catch(() => {});
    await page.waitForFunction(() => { const d = window.__dopahar; return d && ['maa', 'dadi', 'pitaji', 'sarpanch', 'dada', 'postman', 'sister', 'brother', 'teacher', 'didi'].every((k) => d.scene.getObjectByName(`gather_${k}_model`)); }, null, { timeout: 240000, polling: 1000 });
    await page.waitForTimeout(5000);
    const out = { lod, characters: 0, views: {}, errors };
    out.characters = await page.evaluate(() => { let n = 0; window.__dopahar.scene.traverse((o) => { if (o.isSkinnedMesh && o.morphTargetDictionary && o.morphTargetDictionary.blink !== undefined) n++; }); return n; });
    for (const [label, back] of [['6 m', 6], ['35 m', 35], ['70 m', 70]]) {
      await page.evaluate((back) => {
        const d = window.__dopahar, g = d.scene.getObjectByName('gather_pitaji');
        const p = g.getWorldPosition(g.position.clone());
        d.photoCamera({ pos: [p.x - 2, p.y + 1.7 + back * 0.15, p.z + back], target: [p.x - 2, p.y + 1, p.z], fov: 55 });
      }, back);
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.__perfReset());
      await page.waitForTimeout(8000);
      out.views[label] = await page.evaluate(() => {
        const p = window.__perfProbe, f = Math.max(1, p.frames);
        const lodInfo = window.__charLOD ? { ...window.__charLOD.stats } : null;
        return { frames: p.frames, npcLifeHeadMs: +((p.t.npcLifeHead || 0) / f).toFixed(3), logicMs: +((p.t.logic || 0) / f).toFixed(3), renderMs: +((p.t.render || 0) / f).toFixed(2), calls: window.__dopahar.renderer.info.render.calls, tiers: lodInfo };
      });
      await page.screenshot({ path: resolve(ROOT, `tmp/lod_${lod ? 'on' : 'off'}_${back}m.png`) });
      console.log(lod ? 'LOD on ' : 'LOD off', label, JSON.stringify(out.views[label]));
    }
    return out;
  } finally { await browser.close(); }
}

mkdirSync(resolve(ROOT, 'tmp'), { recursive: true });
const results = [];
try {
  for (const lod of [false, true]) {
    for (let t = 1; t <= 4; t++) {
      try { results.push(await measure(lod)); break; } catch (e) { console.log(`attempt ${t} failed: ${String(e.message).split('\n')[0]}`); await new Promise((r) => setTimeout(r, 45000)); }
    }
  }
} finally { server.kill(); }
if (get('--json', null)) writeFileSync(resolve(ROOT, get('--json')), JSON.stringify({ when: new Date().toISOString(), lean: LEAN, results }, null, 2));
