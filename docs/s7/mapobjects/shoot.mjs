#!/usr/bin/env node
/**
 * Map objects preview shots (headless, SwiftShader). Starts its own Vite, opens docs/s7/mapobjects/preview.html, saves
 * docs/s7/mapobjects/<name>.jpg per view and prints the layer's draw calls / triangles in that view.
 *   flock /tmp/s7-browser.lock node docs/s7/mapobjects/shoot.mjs [name ...] [--ctx=fields,trees]
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const OUT = fileURLToPath(new URL('.', import.meta.url));
const PORT = 5347;
export const VIEWS = {
  tubewell: { cam: [370.5, 1.7, -166.5], look: [379, 1.1, -174.5] },
  ponds: { cam: [452, 3.2, -33], look: [471, 0, -50] },
  buffalo_pond: { cam: [731, 3.0, 90], look: [749, 0, 102] },
  temple_tank: { cam: [750, 4.5, -92], look: [761, 0, -107] },
  cricket: { cam: [617, 2.2, 164], look: [632, 0.3, 158] },
  kabaddi: { cam: [700, 4.5, 125], look: [714, 0, 114] },
  tower_transformer: { cam: [672, 1.7, 26], look: [698, 9, -30] },
  tower: { cam: [728, 1.7, -46], look: [716, 12, -65] },
  transformer: { cam: [676.5, 1.7, 17.5], look: [681, 1.3, 12] },
  machan_scarecrow: { cam: [391, 1.7, -204], look: [399, 1.6, -226] },
  notice: { cam: [546.5, 1.6, 34.2], look: [546.5, 1.5, 37.5] },
  gate: { cam: [612, 1.7, -136], look: [605, 5, -113] },
  wash_barber: { cam: [512, 2.2, 20], look: [504, 0.6, 30] },
  trough_rest: { cam: [476, 2.0, -2], look: [470, 0.4, -12] },
  rest: { cam: [694, 1.8, -14], look: [691, 0.4, -19.2] },
  potter: { cam: [457, 2.6, -147], look: [467, 0.3, -157] },
};
const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ctx = process.argv.find((a) => a.startsWith('--ctx='))?.slice(6) ?? 'fields,trees';
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
const base = `http://localhost:${PORT}/village-game-web/docs/s7/mapobjects/preview.html`;
for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const killer = setTimeout(() => { console.log('TIMEOUT'); try { vite.kill(); } catch {} process.exit(2); }, 285000);
const results = {};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (process.env.VERBOSE) console.log('  [' + m.type() + ']', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const list = names.length ? names : Object.keys(VIEWS);
  const first = VIEWS[list[0]];
  await page.goto(`${base}?cam=${first.cam.join(',')}&look=${first.look.join(',')}&ctx=${ctx}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 200000 });
  const err = await page.evaluate(() => window.__error);
  if (err) errors.push(err);
  for (const name of list) {
    const v = VIEWS[name];
    await page.evaluate(([c, l]) => { const { camera } = window.__dbg; camera.position.set(...c); camera.lookAt(...l); camera.updateMatrixWorld(); }, [v.cam, v.look]);
    await page.evaluate(() => window.__snap());
    await page.waitForTimeout(250);
    const url = await page.evaluate(() => window.__snap());
    fs.writeFileSync(path.join(OUT, `${name}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    results[name] = await page.evaluate(() => window.__layerInfo());
    console.log(name, JSON.stringify(results[name]));
  }
  console.log('REPORT', await page.evaluate(() => JSON.stringify(window.__mo.report)));
  console.log(errors.length ? 'ERRORS: ' + errors.join(' | ').slice(0, 2000) : 'console errors: 0');
  fs.writeFileSync(path.join(OUT, 'last-run.json'), JSON.stringify({ results, errors }, null, 1));
} finally {
  clearTimeout(killer);
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
  vite.kill();
  process.exit(0);
}
