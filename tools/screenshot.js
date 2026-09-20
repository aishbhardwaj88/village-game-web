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
    await page.click('#play-btn');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);

    // One-time move/interact tutorial (item 2) — capture it once, then dismiss so it
    // doesn't sit on top of every shot below.
    await page.screenshot({ path: resolve(shotsDir, 'tutorial_line.png') });
    console.log(`Captured tutorial_line -> ${resolve(shotsDir, 'tutorial_line.png')}`);
    await page.evaluate(() => window.__dopahar?.dialogue._advanceFromInput());
    await page.waitForTimeout(150);

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

    // Vehicle kitbashes (queue items 1-4) — close side/rear views, not otherwise
    // framed by the 3 generic presets above. Player placed a few metres SOUTH of the
    // vehicle (larger Z), camera yaw=0 (camera further south, looking north) — the
    // same proven framing pattern as the Maa/halwai interaction shots earlier.
    // Player placed south of the target (larger Z) with a sideways X nudge — camera
    // yaw=0 (further south, looking north) — same proven framing as the Maa/halwai
    // shots earlier. The sideways nudge keeps the player capsule from sitting exactly
    // between the camera and the target (which hid Maa completely the first time
    // this pattern was tried, earlier in this session).
    async function framedOn(kind, sideways, southOf, distance, yaw = 0, pitch = -0.05) {
      await page.evaluate(
        ({ sideways, southOf, distance, yaw, pitch, kind }) => {
          const d = window.__dopahar;
          const target = d.vehicles.find((v) => v.preset.kind === kind).group.position;
          d.teleportPlayer(target.x + sideways, target.z + southOf);
          d.camRig.yaw = yaw;
          d.camRig.pitch = pitch;
          d.camRig.distance = distance;
          d.camRig.update(10);
        },
        { sideways, southOf, distance, yaw, pitch, kind }
      );
      await page.waitForTimeout(200);
    }

    await framedOn('tractor', 3.5, 5, 9);
    await page.screenshot({ path: resolve(shotsDir, 'vehicle_tractor_trolley_side.png') });
    console.log(`Captured vehicle_tractor_trolley_side -> ${resolve(shotsDir, 'vehicle_tractor_trolley_side.png')}`);

    await framedOn('tractor', 2.5, -4, 4.5, Math.PI);
    await page.screenshot({ path: resolve(shotsDir, 'vehicle_tractor_front.png') });
    console.log(`Captured vehicle_tractor_front -> ${resolve(shotsDir, 'vehicle_tractor_front.png')}`);

    await framedOn('cart', 3, 4.5, 6.5);
    await page.screenshot({ path: resolve(shotsDir, 'vehicle_cart_side.png') });
    console.log(`Captured vehicle_cart_side -> ${resolve(shotsDir, 'vehicle_cart_side.png')}`);

    await framedOn('bike', 1.8, 2.5, 3.2);
    await page.screenshot({ path: resolve(shotsDir, 'vehicle_bike_side.png') });
    console.log(`Captured vehicle_bike_side -> ${resolve(shotsDir, 'vehicle_bike_side.png')}`);

    // Waypoint (item 4): the glow at the target when it's in view, and the edge arrow
    // when it isn't — captured before the errand-flow shots below change quest.step.
    await page.evaluate(() => {
      const d = window.__dopahar;
      // Offset to the side and angled slightly so the ground glow isn't hidden
      // directly behind the player capsule from a dead-on angle.
      d.teleportPlayer(d.interactions.MAA_POSITION.x + 3, d.interactions.MAA_POSITION.z + 8);
      d.camRig.yaw = -0.3;
      d.camRig.pitch = -0.15;
      d.camRig.distance = 6;
      d.camRig.update(10);
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(shotsDir, 'waypoint_glow_onscreen.png') });
    console.log(`Captured waypoint_glow_onscreen -> ${resolve(shotsDir, 'waypoint_glow_onscreen.png')}`);

    await page.evaluate(() => {
      const d = window.__dopahar;
      d.camRig.yaw = Math.PI; // turn away from Maa — target now off camera
      d.camRig.update(10);
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(shotsDir, 'waypoint_arrow_offscreen.png') });
    console.log(`Captured waypoint_arrow_offscreen -> ${resolve(shotsDir, 'waypoint_arrow_offscreen.png')}`);

    // Feature shots: scripted moments that the 3 fixed camera presets above wouldn't
    // otherwise catch (the player has to actually be standing at a specific spot for
    // these UI elements to be visible at all).
    console.log('\n--- feature shots ---');
    await page.evaluate(() => {
      const d = window.__dopahar;
      if (!d) return;
      // Offset a little to the side so the player capsule doesn't sit exactly in
      // front of (and hide) Maa's capsule from a dead-on angle.
      d.teleportPlayer(d.interactions.MAA_POSITION.x + 1.3, d.interactions.MAA_POSITION.z + 2);
      d.camRig.yaw = 0; // camera south of the player, looking north toward Maa
      d.camRig.pitch = -0.1;
      d.camRig.distance = 5;
      d.camRig.update(10);
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(shotsDir, 'interact_prompt_maa.png') });
    console.log(`Captured interact_prompt_maa -> ${resolve(shotsDir, 'interact_prompt_maa.png')}`);

    await page.evaluate(() => window.__dopahar.interact());
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(shotsDir, 'dialogue_maa.png') });
    console.log(`Captured dialogue_maa -> ${resolve(shotsDir, 'dialogue_maa.png')}`);

    // Walk the whole errand (item 3) via dev hooks: advance Maa's dialogue (receive
    // money), go hand it to the halwai (through the frying wait), bring the jalebi
    // back to Maa, and land on the end card.
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()); // close Maa's line -> HAVE_MONEY
    await page.waitForTimeout(150);
    const stepAfterMaa1 = await page.evaluate(() => window.__dopahar.quest.step);
    console.log('quest step after talking to Maa:', stepAfterMaa1);
    await page.screenshot({ path: resolve(shotsDir, 'objective_have_money.png') });
    console.log(`Captured objective_have_money -> ${resolve(shotsDir, 'objective_have_money.png')}`);

    await page.evaluate(() => {
      const dd = window.__dopahar;
      dd.teleportPlayer(dd.interactions.HALWAI_NPC_POSITION.x, dd.interactions.HALWAI_NPC_POSITION.z + 1.8);
      dd.camRig.yaw = 0.35; // angled so the player capsule doesn't hide the halwai NPC behind it
      dd.camRig.pitch = -0.1;
      dd.camRig.distance = 4.5;
      dd.camRig.update(10);
      dd.interact();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(shotsDir, 'dialogue_halwai_frying.png') });
    console.log(`Captured dialogue_halwai_frying -> ${resolve(shotsDir, 'dialogue_halwai_frying.png')}`);

    await page.waitForTimeout(2300); // outlast the frying holdMs line
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()); // close "here you go" -> HAVE_JALEBI
    await page.waitForTimeout(150);
    const stepAfterHalwai = await page.evaluate(() => window.__dopahar.quest.step);
    console.log('quest step after the halwai:', stepAfterHalwai);

    await page.evaluate(() => {
      const dd = window.__dopahar;
      dd.teleportPlayer(dd.interactions.MAA_POSITION.x + 1.3, dd.interactions.MAA_POSITION.z + 2);
      dd.camRig.yaw = 0;
      dd.camRig.pitch = -0.1;
      dd.camRig.distance = 5;
      dd.camRig.update(10);
      dd.interact();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()); // close final line -> COMPLETE
    await page.waitForTimeout(300);
    const stepFinal = await page.evaluate(() => window.__dopahar.quest.step);
    console.log('quest step after returning the jalebi:', stepFinal);
    await page.screenshot({ path: resolve(shotsDir, 'end_card.png') });
    console.log(`Captured end_card -> ${resolve(shotsDir, 'end_card.png')}`);

    // Task 4 — errand 1's card is no longer the end of the game: "Continue" just
    // dismisses it (quest.step stays COMPLETE), which is what unlocks the second
    // errand on the next Maa visit.
    await page.click('#end-continue-btn');
    await page.waitForTimeout(150);
    const stepAfterContinue = await page.evaluate(() => window.__dopahar.quest.step);
    const endCardHiddenAfterContinue = await page.evaluate(() => !document.getElementById('end-card').classList.contains('visible'));
    console.log('quest step after Continue (should still be complete):', stepAfterContinue, '| end card hidden:', endCardHiddenAfterContinue);

    // Second errand (task 4): talk to Maa again -> HAVE_TIFFIN, walk to the school and
    // ring the bell (the item 5 bell prop doubles as one of the two collection
    // triggers) -> HAVE_SISTER, sister starts following -> back to Maa -> ALL_COMPLETE.
    await page.evaluate(() => {
      const dd = window.__dopahar;
      dd.teleportPlayer(dd.interactions.MAA_POSITION.x + 1.3, dd.interactions.MAA_POSITION.z + 2);
      dd.camRig.yaw = 0;
      dd.camRig.pitch = -0.1;
      dd.camRig.distance = 5;
      dd.camRig.update(10);
      dd.interact();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()); // close tiffin line -> HAVE_TIFFIN
    await page.waitForTimeout(150);
    const stepAfterTiffin = await page.evaluate(() => window.__dopahar.quest.step);
    console.log('quest step after Maa offers the tiffin errand:', stepAfterTiffin);
    await page.screenshot({ path: resolve(shotsDir, 'objective_have_tiffin.png') });
    console.log(`Captured objective_have_tiffin -> ${resolve(shotsDir, 'objective_have_tiffin.png')}`);

    await page.evaluate(() => {
      const dd = window.__dopahar;
      dd.teleportPlayer(dd.interactions.BELL_POSITION.x + 1.2, dd.interactions.BELL_POSITION.z + 1.2);
      dd.camRig.yaw = Math.PI / 4; // camera looks back toward the bell, southwest of the player here
      dd.camRig.pitch = -0.1;
      dd.camRig.distance = 5;
      dd.camRig.update(10);
      dd.interact();
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(shotsDir, 'bell_ring.png') });
    console.log(`Captured bell_ring -> ${resolve(shotsDir, 'bell_ring.png')}`);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()); // close bell line -> HAVE_SISTER
    await page.waitForTimeout(150);
    const stepAfterBell = await page.evaluate(() => window.__dopahar.quest.step);
    const sisterFollowingAfterBell = await page.evaluate(() => window.__dopahar.isSisterFollowing());
    console.log('quest step after ringing the bell (should be have_sister):', stepAfterBell, '| sister following:', sisterFollowingAfterBell);

    // Let the sister walk a couple of seconds so the "follows, stops at 2m, pushed
    // out of walls" behaviour actually runs before checking on it.
    await page.waitForTimeout(2000);
    const sisterDistToTeacher = await page.evaluate(() => {
      const dd = window.__dopahar;
      const sister = dd.npcs.find((n) => n.name === 'npc_sister');
      return sister.position.distanceTo(dd.interactions.TEACHER_POSITION);
    });
    console.log('sister distance from her school start point after 2s of following (should have moved):', sisterDistToTeacher);
    await page.screenshot({ path: resolve(shotsDir, 'sister_following.png') });
    console.log(`Captured sister_following -> ${resolve(shotsDir, 'sister_following.png')}`);

    await page.evaluate(() => {
      const dd = window.__dopahar;
      dd.teleportPlayer(dd.interactions.MAA_POSITION.x + 1.3, dd.interactions.MAA_POSITION.z + 2);
      dd.camRig.yaw = 0;
      dd.camRig.pitch = -0.1;
      dd.camRig.distance = 5;
      dd.camRig.update(10);
      dd.interact();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()); // close final line -> ERRAND2_COMPLETE
    await page.waitForTimeout(300);
    const stepErrand2Complete = await page.evaluate(() => window.__dopahar.quest.step);
    console.log('quest step after bringing the sister home (should be errand2_complete):', stepErrand2Complete);
    await page.screenshot({ path: resolve(shotsDir, 'errand2_end_card.png') });
    console.log(`Captured errand2_end_card -> ${resolve(shotsDir, 'errand2_end_card.png')}`);

    // Third errand (this task): dismiss errand 2's card (not final any more), talk to
    // Pitaji -> LOADING_WHEAT, pick up and deliver all 3 sacks on foot (no trolley
    // nearby, so one at a time), buy at the general store -> BOUGHT_GOODS, back to
    // Pitaji -> ALL_COMPLETE, the true final card.
    await page.click('#end-continue-btn');
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const dd = window.__dopahar;
      dd.teleportPlayer(dd.interactions.PITAJI_POSITION.x, dd.interactions.PITAJI_POSITION.z + 1.5);
      dd.camRig.yaw = 0;
      dd.camRig.pitch = -0.1;
      dd.camRig.distance = 5;
      dd.camRig.update(10);
      dd.interact();
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(shotsDir, 'pitaji_offer.png') });
    console.log(`Captured pitaji_offer -> ${resolve(shotsDir, 'pitaji_offer.png')}`);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()); // close Pitaji's line -> LOADING_WHEAT
    await page.waitForTimeout(150);
    const stepLoadingWheat = await page.evaluate(() => window.__dopahar.quest.step);
    console.log('quest step after talking to Pitaji (should be loading_wheat):', stepLoadingWheat);

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const dd = window.__dopahar;
        dd.teleportPlayer(dd.interactions.SACK_PILE_POSITION.x, dd.interactions.SACK_PILE_POSITION.z + 1);
        dd.camRig.update(10);
        dd.interact();
      });
      await page.waitForTimeout(150);
      if (i === 0) await page.screenshot({ path: resolve(shotsDir, 'sack_pickup.png') });
      await page.evaluate(() => {
        const dd = window.__dopahar;
        dd.teleportPlayer(dd.interactions.KIRANA_POSITION.x, dd.interactions.KIRANA_POSITION.z + 1);
        dd.camRig.update(10);
        dd.interact();
      });
      await page.waitForTimeout(150);
      await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
      await page.waitForTimeout(150);
    }
    const stepWheatDelivered = await page.evaluate(() => window.__dopahar.quest.step);
    const moneyAfterWheat = await page.evaluate(() => window.__dopahar.quest.money);
    console.log('quest step after delivering all 3 sacks (should be wheat_delivered), money (should be 150):', stepWheatDelivered, moneyAfterWheat);
    await page.screenshot({ path: resolve(shotsDir, 'wheat_delivered.png') });
    console.log(`Captured wheat_delivered -> ${resolve(shotsDir, 'wheat_delivered.png')}`);

    await page.evaluate(() => {
      const dd = window.__dopahar;
      dd.teleportPlayer(-52 - 2.5, 20); // general store's own buy point, src/main.js
      dd.camRig.update(10);
      dd.interact();
    });
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(150);
    const stepBoughtGoods = await page.evaluate(() => window.__dopahar.quest.step);
    console.log('quest step after buying at the general store (should be bought_goods):', stepBoughtGoods);

    await page.evaluate(() => {
      const dd = window.__dopahar;
      dd.teleportPlayer(dd.interactions.PITAJI_POSITION.x, dd.interactions.PITAJI_POSITION.z + 1.5);
      dd.camRig.yaw = 0;
      dd.camRig.pitch = -0.1;
      dd.camRig.distance = 5;
      dd.camRig.update(10);
      dd.interact();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()); // close final line -> ALL_COMPLETE
    await page.waitForTimeout(300);
    const stepAllComplete = await page.evaluate(() => window.__dopahar.quest.step);
    console.log('quest step after telling Pitaji (should be all_complete):', stepAllComplete);
    await page.screenshot({ path: resolve(shotsDir, 'final_end_card.png') });
    console.log(`Captured final_end_card -> ${resolve(shotsDir, 'final_end_card.png')}`);

    await page.click('#play-again-btn');
    await page.waitForTimeout(150);
    const stepAfterReset = await page.evaluate(() => window.__dopahar.quest.step);
    const endCardHiddenAfterReset = await page.evaluate(() => !document.getElementById('end-card').classList.contains('visible'));
    const sisterFollowingAfterReset = await page.evaluate(() => window.__dopahar.isSisterFollowing());
    console.log(
      'quest step after Play again (should be not_started):',
      stepAfterReset,
      '| end card hidden:',
      endCardHiddenAfterReset,
      '| sister following (should be false):',
      sisterFollowingAfterReset
    );

    await page.evaluate(() => {
      const dd = window.__dopahar;
      dd.teleportPlayer(dd.interactions.CHARPAI_POSITION.x, dd.interactions.CHARPAI_POSITION.z - 1.0);
      dd.camRig.yaw = Math.PI;
      dd.camRig.pitch = -0.05;
      dd.camRig.update(10);
      dd.sitDown();
      dd.camRig.update(10); // converge the eased distance to the sit-camera settings instantly
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(shotsDir, 'sit_charpai.png') });
    console.log(`Captured sit_charpai -> ${resolve(shotsDir, 'sit_charpai.png')}`);
    const sittingHint = await page.evaluate(() => document.getElementById('interact-hint').textContent);
    console.log('hint while sitting:', sittingHint);
    await page.evaluate(() => window.__dopahar.standUp());

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
      // shop_roofs/shop_signboards are legitimately elevated (roof height, sign
      // height) — like trim/reveal/etc., they're sub-components of a building, not
      // independently "placed objects" of their own, so they're excluded the same way.
      // mergedStatic (src/mergeUtils.js, task 2 draw-call budget) flags any mesh that
      // folds sub-components of one or more buildings together (e.g. just the roofs,
      // deliberately elevated) — same reasoning as shop_roofs/shop_signboards below,
      // generalised so new merges don't need a name added here by hand.
      const SKIP_CHILD_NAMES = new Set(['lane', 'trim', 'plinth', 'reveal', 'drainpipe', 'switchboard', 'step', 'shop_roofs', 'shop_signboards']);
      for (const name of ['hero_zone', 'background_houses', 'shops']) {
        const group = findByName(scene, name);
        if (!group) continue;
        for (const child of group.children) {
          if (SKIP_CHILD_NAMES.has(child.name) || child.userData?.mergedStatic) continue;
          checkWholeObject(child, `${name}/${child.name || child.type}`);
        }
      }

      // Vehicles + trolley, and the player, as whole objects.
      if (vehicles) {
        for (const v of vehicles) {
          checkWholeObject(v.group, v.group.name);
          // v.trolley is a Trolley class instance (queue item 2 — a separate,
          // attach/detachable object), not itself a THREE.Object3D — check its .group.
          if (v.trolley) checkWholeObject(v.trolley.group, `${v.group.name}/trolley`);
        }
      }
      checkWholeObject(player, 'player');
      if (npcs) {
        for (const npc of npcs) checkWholeObject(npc, npc.name);
      }
      if (props) {
        for (const prop of props) checkWholeObject(prop, prop.name);
      }

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
