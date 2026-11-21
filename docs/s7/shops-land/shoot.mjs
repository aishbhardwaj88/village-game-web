#!/usr/bin/env node
/**
 * Shops-land preview shots (headless, SwiftShader). Starts its own Vite dev server, opens
 * docs/s7/shops-land/preview.html for each view, saves docs/s7/shops-land/<name>.png and prints the
 * per-layer draw calls / triangles of that view plus any console errors.
 *   node docs/s7/shops-land/shoot.mjs [name ...]      (no names = every view)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const OUT = fileURLToPath(new URL('.', import.meta.url));
const PORT = 5321;
export const VIEWS = {
  // the square: two-storey shop-houses and kiosks, player eye height, then from above
  square_eye: { cam: [602.6, 1.6, -38], look: [602.6, 2.6, -10] },
  square_above: { cam: [640, 34, -62], look: [600, 0, -12] },
  kiosks_eye: { cam: [606, 1.6, 34], look: [596, 2.0, 48] },
  smallshop_eye: { cam: [608, 1.6, -64.5], look: [622, 2.2, -76] },
  orchard_eye: { cam: [846, 1.6, -137], look: [866, 3, -165] },
  orchard_above: { cam: [820, 30, -120], look: [865, 0, -165] },
  field_eye: { cam: [606, 1.6, -132], look: [585, 1.2, -170] },
  field_above: { cam: [560, 45, -120], look: [520, 0, -200] },
  canal_eye: { cam: [812, 1.6, 52], look: [826, 1.0, 34] },
  canal_above: { cam: [790, 26, 70], look: [824, 0, 34] },
  flag_eye: { cam: [592, 1.6, 34], look: [603, 4.5, 19] },
  flag_above: { cam: [585, 20, 42], look: [603, 0, 20] },
  peepal_eye: { cam: [552, 1.6, 74], look: [543, 4, 63] },
  kiln_green: { cam: [520, 1.6, -118], look: [500, 3, -140] },
};

const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
const base = `http://localhost:${PORT}/village-game-web/docs/s7/shops-land/preview.html`;
for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = {};
try {
  for (const name of names.length ? names : Object.keys(VIEWS)) {
    const v = VIEWS[name];
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (process.env.VERBOSE) console.log('  [' + m.type() + ']', m.text().slice(0, 300)); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${base}?cam=${v.cam.join(',')}&look=${v.look.join(',')}${only ? '&only=' + only : ''}`);
    await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 180000 });
    const err = await page.evaluate(() => window.__error);
    if (err) { console.log(name, 'ERROR', err); errors.push(err); }
    await page.evaluate(() => window.__snap());
    const url = await page.evaluate(() => window.__snap());
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
    const layers = await page.evaluate(() => window.__layerInfo && window.__layerInfo());
    const report = await page.evaluate(() => window.__land && JSON.stringify(window.__land.report));
    results[name] = { layers, errors };
    console.log(name, JSON.stringify(layers), errors.length ? 'ERRORS: ' + errors.join(' | ').slice(0, 600) : 'no errors');
    if (name === (names[0] || Object.keys(VIEWS)[0])) console.log('REPORT', report);
    await page.close();
  }
} finally {
  await browser.close();
  vite.kill();
}
