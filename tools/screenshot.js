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
        // A large dt forces the occlusion-easing distance to fully converge in one
        // call — screenshot presets want deterministic framing, not real-time easing.
        rig.update(10);
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

    console.log('\n--- grounding check ---');
    const grounding = await page.evaluate(() => {
      const scene = window.__dopahar?.scene;
      const vehicles = window.__dopahar?.vehicles;
      const player = window.__dopahar?.player;
      if (!scene) return null;

      const { Box3, Matrix4 } = window.__dopahar;
      const TOLERANCE = 0.05;
      const results = [];
      const box = new Box3();
      const localBox = new Box3();
      const mat = new Matrix4();
      const fullMat = new Matrix4();

      // Whole-object check: the union bounding box of an entire placed object (a
      // building, a vehicle, the player) should touch the ground at its lowest point
      // — this is what "for every placed object" means for something like a house,
      // where the floor/plinth sits at y=0 but the roof is metres up on purpose.
      // Checking every individual sub-mesh (roofs, lintels, window frames) would
      // flag hundreds of pieces that are *supposed* to be elevated as part of the
      // structure, not independently "placed".
      function checkWholeObject(object, label) {
        if (!object) return;
        box.setFromObject(object);
        if (!isFinite(box.min.y)) return;
        const diff = box.min.y;
        if (Math.abs(diff) > TOLERANCE) {
          results.push({ label, lowestY: +box.min.y.toFixed(3), diff: +diff.toFixed(3) });
        }
      }

      // Per-instance check: only for instanced pieces whose every instance is
      // individually meant to sit at ground level (plinths, drainpipes, steps, crop
      // rows) — unlike trim bars (door jambs from the floor, but also lintels and
      // window frames well above it) or switchboards (deliberately wall-mounted),
      // which mix elevated and ground-level pieces in one shared mesh and so can't be
      // checked this way; those are covered by their parent building's whole-object
      // check instead.
      function checkInstancedGroundLevel(object, label) {
        if (!object) return;
        object.geometry.computeBoundingBox();
        localBox.copy(object.geometry.boundingBox);
        for (let i = 0; i < object.count; i++) {
          object.getMatrixAt(i, mat);
          fullMat.multiplyMatrices(object.matrixWorld, mat);
          box.copy(localBox).applyMatrix4(fullMat);
          const lowestY = box.min.y;
          if (Math.abs(lowestY) > TOLERANCE) {
            results.push({ label: `${label}[${i}]`, lowestY: +lowestY.toFixed(3), diff: +lowestY.toFixed(3) });
          }
        }
      }

      function findByName(root, name) {
        let found = null;
        root.traverse((o) => {
          if (o.name === name) found = o;
        });
        return found;
      }

      // Buildings and background houses, as whole objects. Skip the lane (terrain
      // with intentional bumps/ruts, not a "placed object") and the instanced kit
      // meshes (checked separately below, per-instance, where that's meaningful).
      const SKIP_CHILD_NAMES = new Set(['lane', 'trim', 'plinth', 'reveal', 'drainpipe', 'switchboard', 'step']);
      for (const name of ['hero_zone', 'background_houses']) {
        const group = findByName(scene, name);
        if (!group) continue;
        for (const child of group.children) {
          if (SKIP_CHILD_NAMES.has(child.name)) continue;
          checkWholeObject(child, `${name}/${child.name || child.type}`);
        }
      }

      // Vehicles + trolley, and the player, as whole objects.
      if (vehicles) {
        for (const v of vehicles) {
          checkWholeObject(v.group, v.group.name);
          if (v.trolley) checkWholeObject(v.trolley, `${v.group.name}/trolley`);
        }
      }
      checkWholeObject(player, 'player');

      // Ground-level-only instanced kit pieces (plinth, drainpipe, step, crop rows),
      // per instance — identified by a `groundLevel` flag set on the mesh itself at
      // creation time (see src/buildingKit.js, src/field.js), since trim/reveal/
      // switchboard meshes mix elevated and ground-level pieces and can't be checked
      // this way (covered by the whole-building check instead).
      scene.traverse((o) => {
        if (o.isInstancedMesh && o.userData.groundLevel) {
          checkInstancedGroundLevel(o, o.name || o.userData.kind || 'instanced');
        }
      });

      return results;
    });

    if (grounding === null) {
      console.error('Could not run grounding check — window.__dopahar.scene missing');
    } else if (grounding.length === 0) {
      console.log('(none — every placed object is within 5cm of the ground)');
    } else {
      for (const g of grounding) {
        console.error(`${g.diff > 0 ? 'ABOVE' : 'BELOW'} ground by ${Math.abs(g.diff)}m: ${g.label} (lowest point y=${g.lowestY})`);
      }
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
