#!/usr/bin/env node
/**
 * Starts the Vite dev server, loads the game in headless Chromium (SwiftShader
 * software WebGL, since there's no real GPU in CI/headless), waits for the scene to
 * settle, then captures screenshots from 3 preset camera positions into
 * docs/shots/<timestamp>/. Prints console errors and renderer.info stats.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEV_PORT = 5183;
const DEV_URL = `http://localhost:${DEV_PORT}/`;

const CAMERA_PRESETS = [
  { name: 'spawn_behind', yaw: Math.PI, pitch: -0.15, distance: 5 },
  { name: 'low_angle', yaw: Math.PI * 0.6, pitch: -0.05, distance: 3.5 },
  { name: 'high_overview', yaw: Math.PI * 1.4, pitch: 0.45, distance: 5 },
];

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolvePromise, reject) => {
    const tryOnce = () => {
      fetch(url)
        .then(() => resolvePromise())
        .catch(() => {
          if (Date.now() - start > timeoutMs) reject(new Error('Dev server did not start in time'));
          else setTimeout(tryOnce, 300);
        });
    };
    tryOnce();
  });
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shotsDir = resolve(ROOT, 'docs', 'shots', timestamp);
  mkdirSync(shotsDir, { recursive: true });

  console.log('Starting dev server...');
  const server = spawn('npx', ['vite', '--port', String(DEV_PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => process.stderr.write(`[vite] ${d}`));

  try {
    await waitForServer(DEV_URL);
    console.log('Dev server up. Launching headless Chromium (SwiftShader)...');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--disable-gpu-sandbox',
      ],
    });

    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    await page.goto(`${DEV_URL}?dev=1`, { waitUntil: 'load' });

    // The overlay only accepts a tap once THREE.DefaultLoadingManager reports every
    // queued asset loaded (see src/ui.js setupLoadingScreen) — wait for that class
    // before clicking, same gate a real player hits.
    await page.waitForSelector('#start-overlay.ready', { timeout: 15000 }).catch(() => {});
    await page.click('#start-overlay');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);

    for (const preset of CAMERA_PRESETS) {
      await page.evaluate((p) => {
        const rig = window.__dopahar?.camRig;
        if (!rig) return;
        rig.yaw = p.yaw;
        rig.pitch = p.pitch;
        rig.distance = p.distance;
        rig.update();
      }, preset);
      await page.waitForTimeout(200);

      const shotPath = resolve(shotsDir, `${preset.name}.png`);
      await page.screenshot({ path: shotPath });
      console.log(`Captured ${preset.name} -> ${shotPath}`);
    }

    const stats = await page.evaluate(() => {
      const renderer = window.__dopahar?.renderer;
      if (!renderer) return null;
      return {
        triangles: renderer.info.render.triangles,
        calls: renderer.info.render.calls,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };
    });

    console.log('\n--- renderer.info ---');
    if (stats) {
      console.log(`triangles: ${stats.triangles} (target < 400000)`);
      console.log(`draw calls: ${stats.calls} (target < 150)`);
      console.log(`geometries: ${stats.geometries}, textures: ${stats.textures}`);
      if (stats.triangles >= 400000) console.error('BUDGET FAIL: triangle count over target');
      if (stats.calls >= 150) console.error('BUDGET FAIL: draw call count over target');
    } else {
      console.error('Could not read renderer.info — window.__dopahar missing (dev flag not active?)');
    }

    console.log('\n--- console errors ---');
    if (consoleErrors.length === 0) {
      console.log('(none)');
    } else {
      for (const e of consoleErrors) console.error(e);
    }

    await browser.close();
    console.log(`\nScreenshots: ${shotsDir}`);

    if (consoleErrors.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
