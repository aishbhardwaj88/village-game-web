#!/usr/bin/env node
/**
 * Pot LOD numbers (S7 fixes): opens the map objects preview (game renderer), and for each view renders the map objects
 * 'models' layer (pots + milestones) alone with the pot stand-ins OFF (before) and ON (after), main pass, renderer.info.
 *   flock /tmp/s7-browser.lock node docs/s7/fixes/pots-measure.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs'; import path from 'node:path';
const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const OUT = fileURLToPath(new URL('.', import.meta.url));
const PORT = 5367;
const VIEWS = {
  potter: { cam: [457, 2.6, -147], look: [467, 0.3, -157] }, // the map objects agent's view: inside the yard
  potter_lane_30m: { cam: [440, 1.7, -140], look: [467, 0.5, -156] },
  potter_45m: { cam: [425, 1.7, -135], look: [467, 0.5, -156] },
  potter_70m: { cam: [400, 1.7, -125], look: [467, 0.5, -156] },
};
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
const base = `http://localhost:${PORT}/village-game-web/docs/s7/mapobjects/preview.html`;
for (let i = 0; i < 100; i++) { try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const killer = setTimeout(() => { console.log('TIMEOUT'); vite.kill(); process.exit(2); }, 285000);
const res = {};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const v0 = VIEWS.potter;
  await page.goto(`${base}?cam=${v0.cam.join(',')}&look=${v0.look.join(',')}&ctx=`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 220000 });
  for (const [name, v] of Object.entries(VIEWS)) {
    res[name] = {};
    for (const lod of [false, true]) {
      const r = await page.evaluate(([c, l, on]) => {
        const { camera, renderer, scene } = window.__dbg; const mo = window.__mo;
        mo.group.userData.setPotLod(on);
        camera.position.set(...c); camera.lookAt(...l); camera.updateMatrixWorld();
        window.__snap();
        const m = mo.layers.models;
        const vis = new Map(); scene.children.forEach((ch) => { vis.set(ch, ch.visible); ch.visible = ch === mo.group; });
        mo.group.children.forEach((ch) => { ch.visible = ch === m || ch.name === 's7_frame_hook'; });
        renderer.info.reset(); renderer.render(scene, camera);
        const out = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, tiers: mo.report.modelTris };
        mo.group.children.forEach((ch) => { ch.visible = true; }); scene.children.forEach((ch) => { ch.visible = vis.get(ch); });
        return out;
      }, [v.cam, v.look, lod]);
      res[name][lod ? 'after' : 'before'] = r;
    }
    if (name === 'potter') { // information only: what a 12 m switch for every pot would give inside the yard
      res.potter.at12m = await page.evaluate(([c, l]) => {
        const { camera, renderer, scene } = window.__dbg; const mo = window.__mo;
        mo.group.userData.setPotLod(true, 12);
        camera.position.set(c[0] + 0.01, c[1], c[2]); camera.lookAt(...l); camera.updateMatrixWorld(); window.__snap();
        const m = mo.layers.models, vis = new Map(); scene.children.forEach((ch) => { vis.set(ch, ch.visible); ch.visible = ch === mo.group; });
        mo.group.children.forEach((ch) => { ch.visible = ch === m || ch.name === 's7_frame_hook'; });
        renderer.info.reset(); renderer.render(scene, camera);
        const out = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, tiers: mo.report.modelTris };
        mo.group.children.forEach((ch) => { ch.visible = true; }); scene.children.forEach((ch) => { ch.visible = vis.get(ch); });
        mo.group.userData.setPotLod(true);
        return out;
      }, [v.cam, v.look]);
      const url = await page.evaluate(() => window.__snap());
      fs.writeFileSync(path.join(OUT, `potter_lod.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    } else {
      const url = await page.evaluate(() => window.__snap());
      fs.writeFileSync(path.join(OUT, `${name}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
    console.log(name, JSON.stringify(res[name]));
  }
  // the stand-ins up close (every pot forced to its lathe stand-in), to compare outlines with potter_lod.jpg
  for (const [file, near] of [['pots_standin_close.jpg', 0.001], ['pots_full_close.jpg', null]]) {
    const url = await page.evaluate(([c, l, n]) => { const { camera } = window.__dbg; const mo = window.__mo; mo.group.userData.setPotLod(true, n); camera.position.set(c[0] + Math.random() * 0.01, c[1], c[2]); camera.lookAt(...l); camera.updateMatrixWorld(); window.__snap(); return window.__snap(); }, [[462, 1.6, -150], [466.5, 0.3, -156], near]);
    fs.writeFileSync(path.join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(errors.length ? 'ERRORS: ' + errors.join(' | ').slice(0, 1500) : 'console errors: 0');
  fs.writeFileSync(path.join(OUT, 'pots-measure.json'), JSON.stringify({ res, errors }, null, 1));
} finally {
  clearTimeout(killer);
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
  vite.kill();
  process.exit(0);
}
