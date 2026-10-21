#!/usr/bin/env node
/** Normal-mode (?proof=1) close-ups of every mission-cast NPC that is visible at start + bazaar shopkeepers: docs/shots/normal-mode-cast-<stamp>/ */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const PORT = 5282, BASE = `http://localhost:${PORT}/`;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = `docs/shots/normal-mode-cast-${stamp}`;
mkdirSync(out, { recursive: true });
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
try {
  for (let i = 0; i < 100; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  await page.goto(`${BASE}?proof=1`); await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
  await page.click('#play-btn'); await page.waitForTimeout(1500);
  await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()); await page.waitForTimeout(2500);
  const names = await page.evaluate(() => window.__dopahar.npcs.filter((n) => n.visible).map((n) => n.name));
  console.log('visible NPCs at start:', names.join(', '));
  for (const n of names) {
    const info = await page.evaluate((n) => { const d = window.__dopahar; const o = d.scene.getObjectByName(n); d.teleportPlayer(o.position.x + 3, o.position.z + 3); return d.frameObject(n, { angleDeg: 20, elevationDeg: 8, fill: 0.6 }); }, n);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${n}.png` });
    await page.evaluate(() => window.__dopahar.unfreezeCamera());
  }
  // bazaar shopkeepers (instanced): stand in front of units 1, 3, 4 and frame the counter
  for (const [label, x] of [['kirana_owner', -97.75], ['darzi', -84.25], ['sabzi_seller', -93.25]]) {
    await page.evaluate(({ x }) => { const d = window.__dopahar; d.teleportPlayer(x, 8); d.photoCamera({ pos: [x, 1.9, 9.2], target: [x, 1.3, 15], fov: 40 }); }, { x });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/shop_${label}.png` });
    await page.evaluate(() => window.__dopahar.unfreezeCamera());
  }
  console.log('wrote', out);
  await browser.close();
} finally { server.kill(); }
