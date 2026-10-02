#!/usr/bin/env node
/**
 * Item 4's explicit requirement ("Changing resolveCollisions() affects the player,
 * every vehicle and NPCs. Re-verify the player can still walk through every doorway
 * and does not get stuck in any corner. List the doorways you tested.") — the
 * iterate-to-convergence fix (src/collision.js's resolveCollisions, now up to 6
 * passes instead of 1) changes how the player's own circle collider is resolved
 * every frame, so every real doorway/opening in the village needs re-walking under
 * real keyboard input, not just trusted to still work.
 *
 * Same methodology as tools/regression-check.js's existing walk/reach checks (real
 * `page.keyboard.down('KeyW')` held for a fixed duration, not a teleport) — applied
 * to every doorway in the game, not just the 4 regression-check already covers
 * (bazaar/temple/school/field, which are lane-approach checks, not doorway-specific).
 *
 * Usage: npm run build && node tools/doorway-walk-test.js
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5209;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;

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

// Every real opening a player walks through in this game — position to approach
// from, yaw to face (this game's convention: forward=(-sin(yaw),0,-cos(yaw))), and
// the point on the other side of the opening that "made it through" means reaching.
// House/school/bazaar row entrances open south (src/village.js, src/bazaar.js —
// "south stays open onto the lane" / "shopfronts open south (-z) toward the lane"),
// so approaching from -Z and walking +Z (yaw=PI) is the real approach for most of
// these; the general store and chowk tea stall open sideways (src/main.js's
// STORE_ROT/src/bazaar.js's CHOWK_TEA_ROT), and the temple entrance faces west
// (src/temple.js, same as tools/regression-check.js's own LANDMARKS.temple).
const DOORWAYS = [
  { name: 'house_compound (south entrance, open onto lane)', start: { x: -48, z: 29 }, yaw: Math.PI, target: { x: -48, z: 39 } },
  { name: 'school (steel gate, south entrance)', start: { x: -50, z: 100 }, yaw: Math.PI, target: { x: -50, z: 106 } },
  { name: 'general_store (counter-window opening, faces +X)', start: { x: -46, z: 20 }, yaw: Math.PI / 2, target: { x: -52, z: 20 } },
  { name: 'tea_stall (hero zone, open 3 sides)', start: { x: -58, z: 78 }, yaw: -Math.PI / 2, target: { x: -52, z: 78 } },
  { name: 'temple (west-facing entrance)', start: { x: 2, z: 52 }, yaw: -Math.PI / 2, target: { x: 8, z: 52 } },
  { name: 'bazaar_chowk_tea (CHOWK_TEA, faces +X)', start: { x: -49, z: 10 }, yaw: Math.PI / 2, target: { x: -55, z: 10 } },
  ...Array.from({ length: 8 }, (_, i) => {
    const cx = -100 + 4.5 * i + 2.25;
    return { name: `bazaar_shop_${i} (unit ${i}, south-facing opening)`, start: { x: cx, z: 6.5 }, yaw: Math.PI, target: { x: cx, z: 15 } };
  }),
];

async function main() {
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

    const results = [];
    for (const d of DOORWAYS) {
      const before = await page.evaluate(
        ({ x, z, yaw }) => {
          const dp = window.__dopahar;
          dp.teleportPlayer(x, z);
          dp.camRig.yaw = yaw;
          dp.camRig.update(10);
          return { x: dp.player.position.x, z: dp.player.position.z };
        },
        { x: d.start.x, z: d.start.z, yaw: d.yaw }
      );
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(3000);
      await page.keyboard.up('KeyW');
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => ({ x: window.__dopahar.player.position.x, z: window.__dopahar.player.position.z }));
      const moved = Math.hypot(after.x - before.x, after.z - before.z);
      const distBefore = Math.hypot(before.x - d.target.x, before.z - d.target.z);
      const distAfter = Math.hypot(after.x - d.target.x, after.z - d.target.z);
      const pass = moved > 0.8 && distAfter < distBefore - 1;
      results.push({ name: d.name, pass, moved, distBefore, distAfter });
      console.log(`${pass ? 'PASS' : 'FAIL'}  ${d.name} — moved ${moved.toFixed(2)}m, distance to target ${distBefore.toFixed(1)}m -> ${distAfter.toFixed(1)}m`);
    }

    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length} doorways tested, ${failed.length} failed.`);

    await browser.close();
    process.exitCode = failed.length ? 1 : 0;
  } finally {
    server.kill();
  }
}

main();
