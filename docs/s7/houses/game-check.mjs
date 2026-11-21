// In-game check of the new-map houses (S7 sprint, houses agent): node docs/s7/houses/game-check.mjs [new|old]
// Build first: npx vite build --outDir tmp/dist-houses. Boots the built game headless (character models skipped: they run this
// shared box out of memory and are not houses), waits for the houses, measures their draw calls and triangles (renderer.info with the houses
// shown vs hidden, same camera), checks colliders were registered, takes two in-game shots and lists console errors.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const layout = process.argv[2] || 'new';
const extra = process.argv[3] || ''; // e.g. '&nohouses=1'
const PORT = +(process.env.PORT || 5398);
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', 'tmp/dist-houses', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
server.stderr.on('data', () => {});
for (let i = 0; i < 200; i++) { try { await fetch(`http://localhost:${PORT}/village-game-web/`); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const out = { layout };
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  const T = Date.now(); const log = (m) => console.error(`[${((Date.now() - T) / 1000).toFixed(0)}s] ${m}`);
  page.on('crash', () => log('PAGE CRASHED'));
  await page.addInitScript(() => { try { localStorage.setItem('dopahar_quality', 'low'); localStorage.removeItem('dopahar_save'); } catch (e) {} });
  await page.route(/assets\/models\/(parlour_didi|sister|maa|pitaji|dada|dadi|brother|sarpanch|postman|teacher)\.glb/, (r) => r.fulfill({ status: 404, body: '' }).catch(() => {}));
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  const isCharErr = (t) => /Failed to load resource: the server responded with a status of 404/.test(t);
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${PORT}/village-game-web/?dev=1&layout=${layout}${extra}`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForSelector('#start-overlay.ready', { timeout: 400000 }).catch(() => {});
  log('title ready'); await page.click('#play-btn').catch(() => {}); log('play clicked');
  const t0 = Date.now();
  if (layout === 'new' && !extra.includes('nohouses')) {
    await page.waitForFunction(() => window.__newHouses && window.__newHouses.report && window.__newHouses.report.houses, null, { timeout: 600000, polling: 2000 });
    out.buildSeconds = (Date.now() - t0) / 1000; log('houses built');
    out.report = await page.evaluate(() => window.__newHouses.report);
  }
  await page.waitForTimeout(8000);
  const views = {
    gali_eye: { pos: [455, 1.6, -61.9], target: [490, 2.4, -62.6] },
    gali_above: { pos: [430, 45, -20], target: [470, 0, -62] },
    square_east: { pos: [700, 1.7, -24.5], target: [740, 2.6, -28.3] },
  };
  for (const [name, v] of Object.entries(views)) {
    await page.evaluate((v) => { window.__dopahar.teleportPlayer(v.pos[0], v.pos[2]); window.__dopahar.photoCamera(v); }, v);
    await page.waitForTimeout(6000);
    const m = await page.evaluate(() => new Promise((res) => {
      const d = window.__dopahar, info = d.renderer.info;
      const grab = () => ({ calls: info.render.calls, triangles: info.render.triangles });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const all = grab();
        const g = d.scene.getObjectByName('houses_s7_root');
        if (!g) return res({ all });
        g.visible = false;
        requestAnimationFrame(() => requestAnimationFrame(() => { const without = grab(); g.visible = true; res({ all, without, houseCalls: all.calls - without.calls, houseTriangles: all.triangles - without.triangles }); }));
      }));
    }));
    out[name] = m;
    await page.waitForTimeout(1500);
    await page.screenshot({ timeout: 240000, path: `docs/s7/houses/ingame_${layout}_${name}.png` });
  }
  out.colliders = await page.evaluate(() => { const m = window.__dopahar.scene.getObjectByName('houses_s7_colliders'); return m ? m.userData.colliderBoxes.length : 0; });
  out.oldRowsDrawn = await page.evaluate(() => { let n = 0; window.__dopahar.scene.traverse((o) => { if (/^abadi_row_/.test(o.name) && o.visible && o.count) n += o.count; }); return n; });
  out.errors = errors.filter((t) => !isCharErr(t)); out.skipped404 = errors.length - out.errors.length;
} catch (e) { out.failure = String(e); }
console.log(JSON.stringify(out, null, 1));
writeFileSync(`docs/s7/houses/game-check-${layout}.json`, JSON.stringify(out, null, 1));
await browser.close();
server.kill();
