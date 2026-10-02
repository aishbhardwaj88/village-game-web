#!/usr/bin/env node
/**
 * Reproduction + permanent regression test for a real playtest bug: the trolley
 * spawns inside the general store, with zero input from the player. Not a
 * driving bug — spawnVehicles() (src/vehicles.js) places the trolley at
 * tractor.position + tractorBackward * TRACTOR_TOW_OFFSET_REST with no
 * collision check at all, and the tractor's spawn point and the general
 * store's position were chosen independently in different files.
 *
 * This script does the minimum possible: load the game, click Play, advance
 * the intro dialogue (same as every other headless test in this repo — it's
 * blocking, not an interaction with vehicles), then TOUCH NOTHING. No
 * teleportVehicle, no stepTractorTrolleyPhysics, no keyboard input. Just reads
 * positions at t=0 (right after load) and again at t=3s of real, unmodified
 * frame-by-frame simulation, and asserts every vehicle AND the trolley is
 * clear of every real static collider both times.
 *
 * Usage: npm run build && node tools/spawn-check.js
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5217;
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
    // Advances the blocking intro dialogue panel, same as every other headless
    // test in this repo — this is not a vehicle interaction.
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(1200);

    async function checkAll(label) {
      const result = await page.evaluate(() => {
        const d = window.__dopahar;
        const colliders = d.getStaticColliders();
        const out = [];
        for (const v of d.vehicles) {
          const p = v.preset;
          let overlap;
          if (p.kind === 'tractor') {
            overlap = d.minDistanceToColliders({ x: v.group.position.x, z: v.group.position.z }, Math.hypot(p.body.w, p.body.d) / 2);
          } else {
            overlap = d.minDistanceToColliders({ x: v.group.position.x, z: v.group.position.z }, Math.hypot(p.body.w, p.body.d) / 2);
          }
          out.push({ name: v.group.name, x: v.group.position.x, z: v.group.position.z, clearance: overlap });
          if (p.kind === 'tractor' && v.trolley) {
            const t = v.trolley;
            const half = d.getTrolleyHalfExtents();
            const tClear = d.minDistanceToColliders({ x: t.group.position.x, z: t.group.position.z }, Math.hypot(half.halfW, half.halfD));
            out.push({ name: 'trolley', x: t.group.position.x, z: t.group.position.z, clearance: tClear });
          }
        }
        return { out, colliderCount: colliders.length };
      });
      console.log(`\n=== ${label} (${result.colliderCount} static colliders) ===`);
      let anyFail = false;
      for (const r of result.out) {
        const fail = r.clearance < 0;
        if (fail) anyFail = true;
        console.log(`${fail ? 'FAIL' : 'PASS'}  ${r.name}: pos=(${r.x.toFixed(2)},${r.z.toFixed(2)}) clearance=${r.clearance.toFixed(3)}m${fail ? ' — OVERLAPPING A STATIC COLLIDER' : ''}`);
      }
      return anyFail;
    }

    const fail0 = await checkAll('t=0 (right after load, zero input)');

    // Let the game run, completely untouched, for 3 real seconds — no
    // teleport, no drive, no keyboard input of any kind.
    await page.waitForTimeout(3000);

    const fail3 = await checkAll('t=3s (3 more seconds, still zero input)');

    await browser.close();
    const anyFail = fail0 || fail3;
    console.log(`\n${anyFail ? 'FAIL: a vehicle or the trolley spawned overlapping a real static collider.' : 'PASS: every vehicle and the trolley are clear at spawn and after 3s idle.'}`);
    process.exitCode = anyFail ? 1 : 0;
  } finally {
    server.kill();
  }
}

main();
