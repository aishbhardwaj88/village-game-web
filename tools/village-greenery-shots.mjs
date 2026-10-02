#!/usr/bin/env node
/**
 * Item 3e — before/after shots of the chowk and the bazaar lane, same camera
 * both times, to judge item 3's ground/vegetation/tree work at realistic
 * mid-distance (not a close-up).
 *
 * Usage: npm run build && node tools/village-greenery-shots.mjs <label>
 * `<label>` names the output subfolder (e.g. "before" / "after").
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5229;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
const label = process.argv[2] || 'shot';

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolvePromise, reject) => {
    const tryOnce = () => {
      fetch(url)
        .then(() => resolvePromise())
        .catch(() => {
          if (Date.now() - start > timeoutMs) reject(new Error('Preview server did not start in time'));
          else setTimeout(tryOnce, 300);
        });
    };
    tryOnce();
  });
}

async function main() {
  const shotsDir = resolve(ROOT, 'docs', 'shots', 'item3-greenery');
  mkdirSync(shotsDir, { recursive: true });

  console.log('Starting `vite preview` against dist/...');
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  server.stderr.on('data', (d) => process.stderr.write(`[vite preview] ${d}`));

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => console.error('pageerror:', e.message));

    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'load' });
    await page.waitForSelector('#start-overlay.ready', { timeout: 15000 }).catch(() => {});
    await page.click('#play-btn');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(1200);

    const SHOTS = [
      // Chowk — a real mid-distance player position, real third-person chase cam.
      { name: 'chowk', pos: { x: -55, z: 2 }, yaw: Math.PI },
      // Bazaar lane — standing partway down the lane looking toward the row.
      { name: 'bazaar_lane', pos: { x: -70, z: 0 }, yaw: Math.PI },
      // House/hero zone — the hand-pump damp patch + neem trees should be visible.
      { name: 'house_lane', pos: { x: -48, z: 24 }, yaw: Math.PI },
      // Temple chabutra — the peepal tree through the platform
      // (TEMPLE_POS{8,52} + PLOT.w/2 + 2.5 = {16.5,52}, src/temple.js).
      { name: 'temple_chabutra', pos: { x: 16.5, z: 62 }, yaw: 0 },
      // Field edge — babool trees at mid-distance (near TRACK_SE {80,-65} and
      // TRACK_SW {-40,-65}).
      { name: 'field_edge', pos: { x: 20, z: -50 }, yaw: Math.PI },
    ];

    for (const s of SHOTS) {
      await page.evaluate(
        ({ x, z, yaw }) => {
          const d = window.__dopahar;
          d.teleportPlayer(x, z);
          d.camRig.yaw = yaw;
          d.camRig.pitch = -0.1;
          d.camRig.distance = 7;
          d.camRig.height = 2.6;
          d.camRig.update(10);
        },
        { x: s.pos.x, z: s.pos.z, yaw: s.yaw }
      );
      for (let i = 0; i < 8; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      await page.waitForTimeout(150);
      const filePath = resolve(shotsDir, `${s.name}_${label}.png`);
      await page.screenshot({ path: filePath });
      console.log(`Captured ${s.name} (${label}) -> ${filePath}`);
    }

    await browser.close();
  } finally {
    server.kill();
  }
}

main();
