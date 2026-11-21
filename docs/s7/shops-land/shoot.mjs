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
  smallshop_eye: { cam: [613, 1.6, -88.5], look: [621, 2.4, -77] },
  orchard_eye: { cam: [641, 1.6, -142], look: [672, 3.5, -176] },
  orchard_above: { cam: [622, 34, -122], look: [680, 0, -200] },
  orchard_east: { cam: [842, 1.6, -134], look: [866, 3, -165] },
  field_eye: { cam: [846, 1.6, 127], look: [872, 1.0, 152] },
  field_above: { cam: [815, 42, 105], look: [868, 0, 162] },
  cane_eye: { cam: [843.5, 1.6, -92], look: [862, 1.4, -70] },
  canal_eye: { cam: [838, 1.6, 50], look: [822, 1.2, 36] },
  canal_above: { cam: [852, 26, 78], look: [824, 0, 30] },
  canal_strip: { cam: [810, 1.6, -60], look: [816, 2.0, -20] },
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
  // one page, one build; the camera moves between views (the layers re-pick their detail tiers on the move)
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (process.env.VERBOSE) console.log('  [' + m.type() + ']', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const first = VIEWS[(names[0] || Object.keys(VIEWS)[0])];
  await page.goto(`${base}?cam=${first.cam.join(',')}&look=${first.look.join(',')}${only ? '&only=' + only : ''}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 280000 });
  const err = await page.evaluate(() => window.__error);
  if (err) errors.push(err);
  for (const name of names.length ? names : Object.keys(VIEWS)) {
    const v = VIEWS[name];
    await page.evaluate(([c, l]) => { const { camera } = window.__dbg; camera.position.set(...c); camera.lookAt(...l); camera.updateMatrixWorld(); }, [v.cam, v.look]);
    await page.evaluate(() => window.__snap());
    await page.waitForTimeout(300);
    const url = await page.evaluate(() => window.__snap());
    fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
    const layers = await page.evaluate(() => window.__layerInfo && window.__layerInfo());
    results[name] = layers;
    console.log(name, JSON.stringify(layers));
  }
  console.log('REPORT', await page.evaluate(() => JSON.stringify(window.__land.report)));
  console.log(errors.length ? 'ERRORS: ' + errors.join(' | ').slice(0, 1500) : 'console errors: 0');
  fs.writeFileSync(path.join(OUT, 'last-run.json'), JSON.stringify({ results, errors }, null, 1));
} finally {
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
  vite.kill();
  process.exit(0);
}
