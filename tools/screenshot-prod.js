#!/usr/bin/env node
/**
 * The production-build counterpart to tools/screenshot.js. Assumes `npm run build`
 * has already been run (this script does NOT build — call it explicitly first, so a
 * verification run always reflects a deliberate, known build, not a stale one).
 * Serves the real `dist/` output via `vite preview` (not the dev server — dev serves
 * from source with HMR and no minification, which is not what actually ships) and
 * runs the same headless-Chromium capture as tools/screenshot.js.
 *
 * Every camera in SHOTS below uses the player's own actual third-person camera rig
 * (src/player.js's ThirdPersonCamera — camRig.yaw/pitch/distance, the exact fields
 * mouse-look itself writes), at its real default values (yaw=PI, pitch=-0.15,
 * distance=5, height=2.2) unless a shot has a specific reason to differ, called via
 * the same camRig.update() the game's own per-frame loop calls. This is not a
 * separate debug/overhead camera — it is what a player actually sees.
 *
 * Usage: node tools/screenshot-prod.js [shot-name]
 *   Pass a single argument to run only one named shot from SHOTS below; otherwise
 *   runs all of them. Prints console errors + renderer.info per shot. Screenshots
 *   land in docs/shots/prod-<timestamp>/.
 *
 * A passing scripted assertion is not evidence a visual bug is fixed — this tool
 * exists so there's always an actual image to look at against the real build.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5194;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;

// Real defaults from src/player.js's ThirdPersonCamera constructor.
const DEFAULT_YAW = Math.PI;
const DEFAULT_PITCH = -0.15;
const DEFAULT_DISTANCE = 5;

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
  const only = process.argv[2] || null;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shotsDir = resolve(ROOT, 'docs', 'shots', `prod-${timestamp}`);
  mkdirSync(shotsDir, { recursive: true });

  console.log('Starting `vite preview` against dist/ (production build, not dev server)...');
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => process.stderr.write(`[vite preview] ${d}`));

  try {
    await waitForServer(BASE_URL);
    console.log('Preview server up. Launching headless Chromium (SwiftShader)...');
    const browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'load' });
    await page.waitForSelector('#start-overlay.ready', { timeout: 15000 }).catch(() => {});
    await page.click('#play-btn');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(1200); // let deferred content (field, background houses) load

    async function shot(label, { x, z, yaw = DEFAULT_YAW, pitch = DEFAULT_PITCH, distance = DEFAULT_DISTANCE }, extra) {
      await page.evaluate(
        ({ x, z, yaw, pitch, distance }) => {
          const d = window.__dopahar;
          d.teleportPlayer(x, z);
          d.camRig.yaw = yaw;
          d.camRig.pitch = pitch;
          d.camRig.distance = distance;
          d.camRig.update(10);
        },
        { x, z, yaw, pitch, distance }
      );
      if (extra) await extra();
      for (let i = 0; i < 8; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      await page.waitForTimeout(150);
      const filePath = resolve(shotsDir, `${label}.png`);
      await page.screenshot({ path: filePath });
      const info = await page.evaluate(() => {
        const d = window.__dopahar;
        return { calls: d.renderer.info.render.calls, triangles: d.renderer.info.render.triangles };
      });
      console.log(`Captured ${label} -> ${filePath} (draw calls: ${info.calls}, triangles: ${info.triangles})`);
      return filePath;
    }

    // Tractor spawns (-51,0,25) yaw=PI (src/vehicles.js spawnVehicles()). Bike spawns
    // (-48,0,28) yaw=0. General store is at (-52,0,20), open/counter side facing -x
    // (src/main.js STORE_ROT=-PI/2).
    const SHOTS = {
      // (a) Standing next to the tractor on foot, default camera. Player 3m NORTH of
      // the tractor's own spawn (-51,25), facing south (yaw=0 -> forward=-z, this
      // game's convention) so the tractor is in frame — NOT south of it, which is
      // where the general store sits (-52,20) and clips the camera into its own
      // interior (found by looking at the first attempt at this shot).
      a_player_near_tractor: () => shot('a_player_near_tractor', { x: -51, z: 28, yaw: 0 }),

      // (b) Mounted on the tractor with the trolley attached, stationary. Rear-chase
      // view (yaw=0, matching the drive direction) won't show the hitch clearly at
      // distance=5 since the trolley itself trails ~4.6m behind — close to/behind
      // the camera. Use a wider side view instead so both the tractor's hitch and
      // the trolley's drawbar are actually in frame together.
      b_mounted_trolley_attached: () =>
        shot('b_mounted_trolley_attached', { x: -58, z: 27, yaw: -Math.PI / 2, distance: 9 }, async () => {
          await page.evaluate(() => {
            const d = window.__dopahar;
            const tractor = d.vehicles.find((v) => v.preset.kind === 'tractor');
            if (tractor.trolley) tractor.attachTrolley(tractor.trolley); // fresh snap, no drift from earlier shots
            d.mount(tractor);
          });
          await page.evaluate(() => window.__dopahar.camRig.update(10));
        }),

      // (b2) Same moment, from directly above, to check the hitch gap without any
      // perspective ambiguity.
      b2_hitch_from_above: () =>
        shot('b2_hitch_from_above', { x: -51, z: 27, yaw: 0, pitch: 1.5, distance: 12 }, async () => {
          await page.evaluate(() => {
            const d = window.__dopahar;
            const tractor = d.vehicles.find((v) => v.preset.kind === 'tractor');
            if (tractor.trolley) tractor.attachTrolley(tractor.trolley);
            d.mount(tractor);
          });
          await page.evaluate(() => window.__dopahar.camRig.update(10));
        }),

      // (c) Mounted, driving forward into the general store wall until stopped.
      // Store is at (-52,20); start the tractor 10m NORTH of it (higher z) and drive
      // south (yaw=0 -> forward=-z) toward it. This tractor's own acceleration is
      // deliberately slow (established elsewhere in this project) — 25s is enough to
      // actually reach and stop at the wall from 10m out, confirmed by a direct
      // position trace before settling on this duration.
      c_drive_into_general_store: () =>
        shot('c_drive_into_general_store', { x: -58, z: 20, yaw: Math.PI / 2, distance: 10 }, async () => {
          await page.evaluate(() => {
            const d = window.__dopahar;
            const tractor = d.vehicles.find((v) => v.preset.kind === 'tractor');
            tractor.group.position.set(-52, 0, 30); // north of the store, facing it
            tractor.group.rotation.y = 0; // forward = -z per this game's convention (verified this session)
            if (tractor.trolley) tractor.attachTrolley(tractor.trolley); // snap the trolley in behind before driving
            d.teleportPlayer(-52, 30);
            d.mount(tractor);
          });
          await page.keyboard.down('KeyW');
          await page.waitForTimeout(25000);
          await page.keyboard.up('KeyW');
          await page.waitForTimeout(300);
          // Re-aim a wide side view at wherever the tractor actually ended up,
          // rather than a fixed world point, so it's in frame regardless of exactly
          // how far it got.
          await page.evaluate(() => {
            const d = window.__dopahar;
            const tractor = d.vehicles.find((v) => v.preset.kind === 'tractor');
            d.camRig.yaw = Math.PI / 2;
            d.camRig.pitch = 0.05;
            d.camRig.distance = 10;
            d.camRig.update(10);
          });
        }),

      // (d) The bicycle from 3m away at eye height (default camera pitch/distance —
      // that IS the player's normal eye-height third-person view). Dismount BEFORE
      // repositioning the camera — an earlier version of this shot dismounted as
      // the shot()-level "extra" step, which runs after camera setup, so
      // dismount()'s own camera reset (src/main.js: distance/height back to
      // defaults) silently undid the framing; still mounted was also just wrong —
      // showed whatever the tractor drove into during shot (c), not the bicycle.
      // Bike spawns (-48,0,28). The default north-facing framing (player south of the
      // bike, looking north) puts the general store's solid back wall (STORE_POS
      // (-52,20), a 3.5x3.2x3m box — src/shops.js buildShopWalls()) in the background,
      // and a too-close south approach can even point the camera almost straight at
      // it. Approach from the east instead, facing west (yaw=PI/2, this game's
      // forward=(-sin(yaw),-cos(yaw)) convention), which looks laterally across the
      // lane rather than toward either shop.
      // Empirically verified via a screen-space projection sweep (tmp/bike_yaw_search.mjs)
      // — every attempt at a lateral (east/west) approach put the bike off to the
      // side or fully off-screen (the camRig's over-shoulder offset means yaw does
      // not aim straight down the naive forward vector at short range). Standing
      // south of the bike at (-45,25) facing north (yaw=PI, the default) centers it
      // correctly (confirmed: NDC x = -0.085, i.e. within 5% of dead-centre).
      d_bicycle_3m: async () => {
        // window.__dopahar has no exposed mount-state getter (confirmed by reading
        // src/main.js's debug object) — dismount() itself throws if nothing is
        // mounted (it reads the mounted vehicle's .preset unconditionally), so a
        // try/catch is the only guard available from outside the module's closure.
        await page.evaluate(() => {
          try {
            window.__dopahar.dismount();
          } catch {
            /* wasn't mounted — nothing to do */
          }
        });
        return shot('d_bicycle_3m', { x: -45, z: 25, yaw: DEFAULT_YAW, distance: 6 });
      },
    };

    const results = {};
    if (only) {
      if (!SHOTS[only]) {
        console.error(`Unknown shot "${only}". Known: ${Object.keys(SHOTS).join(', ')}`);
        process.exitCode = 1;
      } else {
        results[only] = await SHOTS[only]();
      }
    } else {
      for (const [name, fn] of Object.entries(SHOTS)) results[name] = await fn();
    }

    // Whole-object grounding check — identical logic to tools/screenshot.js, run
    // here against this production build specifically (bug 5).
    const grounding = await page.evaluate(() => {
      const scene = window.__dopahar?.scene;
      const vehicles = window.__dopahar?.vehicles;
      const player = window.__dopahar?.player;
      const npcs = window.__dopahar?.npcs;
      const props = window.__dopahar?.props;
      if (!scene) return null;

      const { Box3, Matrix4 } = window.__dopahar;
      const TOLERANCE = 0.05;
      const results = [];
      const box = new Box3();
      const localBox = new Box3();
      const mat = new Matrix4();
      const fullMat = new Matrix4();

      function checkWholeObject(object, label) {
        if (!object) return;
        // `precise=true` — see tools/regression-check.js's checkWholeObject for
        // why: the default "fast" path over-estimates the AABB of an off-axis-
        // rotated mesh (any wheel not at a multiple of 90°) by transforming its
        // local bounding BOX's corners rather than its actual vertices.
        box.setFromObject(object, true);
        if (!isFinite(box.min.y)) return;
        const diff = box.min.y;
        if (Math.abs(diff) > TOLERANCE) {
          results.push({ label, lowestY: +box.min.y.toFixed(3), diff: +diff.toFixed(3) });
        }
      }

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

      const SKIP_CHILD_NAMES = new Set(['lane', 'trim', 'plinth', 'reveal', 'drainpipe', 'switchboard', 'step', 'shop_roofs', 'shop_signboards']);
      for (const name of ['hero_zone', 'background_houses', 'shops', 'temple_area', 'bazaar_row']) {
        const group = findByName(scene, name);
        if (!group) continue;
        for (const child of group.children) {
          if (SKIP_CHILD_NAMES.has(child.name) || child.userData?.mergedStatic) continue;
          checkWholeObject(child, `${name}/${child.name || child.type}`);
        }
      }

      if (vehicles) {
        for (const v of vehicles) {
          checkWholeObject(v.group, v.group.name);
          if (v.trolley) checkWholeObject(v.trolley.group, `${v.group.name}/trolley`);
        }
      }
      checkWholeObject(player, 'player');
      if (npcs) for (const npc of npcs) checkWholeObject(npc, npc.name);
      if (props) for (const prop of props) checkWholeObject(prop, prop.name);

      scene.traverse((o) => {
        if (o.isInstancedMesh && o.userData.groundLevel) checkInstancedGroundLevel(o, o.name || o.userData.kind || 'instanced');
      });

      return results;
    });

    console.log('\n--- grounding check (production build) ---');
    if (grounding === null) {
      console.error('Could not run grounding check — window.__dopahar.scene missing');
    } else if (grounding.length === 0) {
      console.log('(none — every placed object is within 5cm of the ground)');
    } else {
      for (const g of grounding) console.log(`  ${g.label}: lowest Y = ${g.lowestY} (off by ${g.diff})`);
    }

    console.log('\nerrors:', errors);
    console.log('Screenshots:', shotsDir);
    await browser.close();
  } finally {
    server.kill();
  }
}

main();
