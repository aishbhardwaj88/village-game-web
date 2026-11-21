#!/usr/bin/env node
/**
 * S7 fixes preview shots (headless, SwiftShader). Starts its own Vite, opens the map objects preview page
 * (docs/s7/mapobjects/preview.html: the game's renderer, sky, fog, grade) with the shops-land layers named in --ctx,
 * saves docs/s7/fixes/<name>.jpg per view (JPEG) and prints draw calls / triangles.
 *   flock /tmp/s7-browser.lock node docs/s7/fixes/shoot.mjs [name ...] [--ctx=shops,trees,fields]
 * Extra views: pass --view=name:cx,cy,cz:lx,ly,lz (repeatable).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const OUT = fileURLToPath(new URL('.', import.meta.url));
const PORT = 5361;
export const VIEWS = {
  shopkeeper_home: { cam: [589.6, 1.6, -3.6], look: [587.0, 3.4, -12.6] },
  shopkeeper_home_above: { cam: [580, 11, 3], look: [587.2, 2.5, -12.6] },
};
for (const a of process.argv) if (a.startsWith('--view=')) { const [n, c, l] = a.slice(7).split(':'); VIEWS[n] = { cam: c.split(',').map(Number), look: l.split(',').map(Number) }; }
const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ctx = process.argv.find((a) => a.startsWith('--ctx='))?.slice(6) ?? 'shops,trees,fields';
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
const base = `http://localhost:${PORT}/village-game-web/docs/s7/mapobjects/preview.html`;
for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const killer = setTimeout(() => { console.log('TIMEOUT'); try { vite.kill(); } catch {} process.exit(2); }, 285000);
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const list = names.length ? names : Object.keys(VIEWS);
  const first = VIEWS[list[0]];
  await page.goto(`${base}?cam=${first.cam.join(',')}&look=${first.look.join(',')}&ctx=${ctx}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 220000 });
  const err = await page.evaluate(() => window.__error);
  if (err) errors.push(err);
  for (const name of list) {
    const v = VIEWS[name];
    await page.evaluate(([c, l]) => { const { camera } = window.__dbg; camera.position.set(...c); camera.lookAt(...l); camera.updateMatrixWorld(); }, [v.cam, v.look]);
    await page.evaluate(() => window.__snap());
    await page.waitForTimeout(250);
    const url = await page.evaluate(() => window.__snap());
    fs.writeFileSync(path.join(OUT, `${name}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    const all = await page.evaluate(() => { const { renderer, scene, camera } = window.__dbg; renderer.info.reset(); renderer.render(scene, camera); return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; });
    console.log(name, 'whole scene', JSON.stringify(all), 'mapobjects', JSON.stringify((await page.evaluate(() => window.__layerInfo())).mapobjects));
  }
  console.log('SHOPS REPORT', await page.evaluate(() => { const g = window.__dbg.scene.getObjectByName('s7_shops'); const r = g && g.userData.report; return r ? JSON.stringify({ shopkeeperHomes: r.shopkeeperHomes, shopHouses: r.shopHouses, skipped: r.skipped, onRoad: r.onRoad.filter((s) => /sqh/.test(s)), backToRoad: r.backToRoad.filter((s) => /sqh/.test(s)) }) : 'no shops layer'; }));
  console.log(errors.length ? 'ERRORS: ' + errors.join(' | ').slice(0, 2000) : 'console errors: 0');
} finally {
  clearTimeout(killer);
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
  vite.kill();
  process.exit(0);
}
