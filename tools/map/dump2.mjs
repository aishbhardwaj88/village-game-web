import { createRequire } from 'module'; const { chromium } = createRequire('/home/claude/.npm-global/lib/node_modules/')('playwright');
import { spawn } from 'child_process';
import fs from 'fs';
const PORT = 5299, BASE = `http://localhost:${PORT}/village-game-web/`;
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const wait = async () => { for (let i = 0; i < 120; i++) { try { await fetch(BASE); return; } catch {} await sleep(500); } throw new Error('no server'); };
try {
  await wait();
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=6144'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 300 } });
  page.setDefaultTimeout(0);
  await page.addInitScript(() => { window.__NORENDER = true; });
  page.on('crash', () => console.log('PAGE CRASH'));
  page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 600)); });
  await page.goto(`${BASE}?dev=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('#start-overlay.ready', { timeout: 180000 });
  await page.evaluate(() => document.getElementById('play-btn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  for (let i = 0; i < 60; i++) { if (await page.evaluate(() => !!(window.__dopahar && window.__dopahar.zoneManager))) break; await sleep(5000); }
  console.log('booted');
  // build every zone, never tear down
  const nb = await page.evaluate(() => {
    const d = window.__dopahar, zm = d.zoneManager; let n = 0, fail = [];
    for (const z of zm.zones.values()) {
      z.teardownRadius = 1e9; z.visibleRadius = 1e9;
      if (z.active) continue;
      try { const b = z.build(); z.group = b.isObject3D ? b : b.group; z.onFrame = null; d.scene.add(z.group); z.active = true; n++; } catch (e) { fail.push(z.name + ': ' + e.message); }
    }
    return { n, fail };
  });
  console.log('built zones', JSON.stringify(nb).slice(0, 800));
  await sleep(40000); // async model loads (GLB yards) land
  await page.evaluate(() => { try { window.__dopahar.rebuildColliders(); } catch (e) {} });
  await sleep(8000);
  const n = await page.evaluate(fs.readFileSync('/home/claude/vgame/extract.js','utf8'));
  console.log('meshes', n);
  const sizes = []; for (let i = 0; i < n; i++) sizes.push(await page.evaluate((i) => window.__ex.info(i), i));
  fs.writeFileSync('/home/claude/vgame/mesh-list.json', JSON.stringify(sizes));
  const items = [], flats = [];
  for (let i = 0; i < n; i++) {
    const t0 = Date.now();
    const r = await page.evaluate((i) => window.__ex.run(i, i + 1), i);
    items.push(...r.items); flats.push(...r.flats);
    const dt = Date.now() - t0; if (dt > 3000) console.log('slow', i, JSON.stringify(sizes[i]), dt, 'ms');
    if (i % 200 === 0) console.log('done', i, '/', n, 'items', items.length);
  }
  const meta = await page.evaluate(() => window.__ex.meta());
  console.log('stats', JSON.stringify(meta.stats));
  fs.writeFileSync('/home/claude/vgame/world-dump2.json', JSON.stringify({ ...meta, items, flats }));
  await browser.close();
} finally { srv.kill(); }
