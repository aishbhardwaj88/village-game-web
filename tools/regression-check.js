#!/usr/bin/env node
/**
 * Permanent regression guard (added after the playtest-bug-fix regressions of
 * 2026-09-20/21 — see CLAUDE.md's "Regression guard" rule). Captures/checks
 * everything that has broken before while fixing something else:
 *
 *  - every prompt badge renders inside the top-right region of the viewport
 *  - the whole-scene grounding check is empty
 *  - draw calls / triangles / asset size stay under budget
 *  - all three errands complete end to end, through the real interaction system
 *    (teleport + the same interact()/mount()/dismount() dev hooks a real E-press
 *    or mount action calls — not by writing quest.step directly)
 *  - no red console errors across the whole run
 *  - the player can walk, mount and drive each vehicle kind, and reach the
 *    bazaar, temple, school and field
 *
 * Usage:
 *   npm run build && node tools/regression-check.js            # compare vs baseline
 *   npm run build && node tools/regression-check.js --save-baseline    # first run / intentional baseline update
 *
 * Without --save-baseline, if docs/regression-baseline.json doesn't exist yet,
 * this run's results ARE saved as the baseline (there's nothing to compare
 * against). If it does exist, results are compared against it and the script
 * exits non-zero if anything that previously passed now fails — a regression —
 * without silently overwriting the baseline. Pass --save-baseline to
 * deliberately record the current results as the new baseline (e.g. after a
 * verified, intentional improvement).
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5195;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
const BASELINE_PATH = resolve(ROOT, 'docs', 'regression-baseline.json');
const SAVE_BASELINE = process.argv.includes('--save-baseline');

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

const results = []; // { name, pass, detail }
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  console.log('Starting `vite preview` against dist/ (production build, not dev server)...');
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => process.stderr.write(`[vite preview] ${d}`));

  const consoleErrors = [];

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`);
    });

    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'load' });
    await page.waitForSelector('#start-overlay.ready', { timeout: 15000 }).catch(() => {});
    await page.click('#play-btn');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(1200); // let deferred content (field, bazaar, background) load

    async function settle(frames = 8, ms = 150) {
      for (let i = 0; i < frames; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      await page.waitForTimeout(ms);
    }

    async function setCamera({ x, z, yaw = DEFAULT_YAW, pitch = DEFAULT_PITCH, distance = DEFAULT_DISTANCE }) {
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
    }

    async function advanceDialogueUntilClosed(maxIterations = 20) {
      for (let i = 0; i < maxIterations; i++) {
        const isOpen = await page.evaluate(() => window.__dopahar.dialogue.isOpen);
        if (!isOpen) return true;
        await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
        await page.waitForTimeout(350);
      }
      return await page.evaluate(() => !window.__dopahar.dialogue.isOpen);
    }

    async function dismiss(vehicle) {
      if (vehicle) return; // still mounted, caller handles it
    }

    // ---------------------------------------------------------------------
    // 1. Prompt badges render inside the top-right region.
    // ---------------------------------------------------------------------
    {
      // Stand next to the tractor so #interact-hint shows "Mount Tractor".
      const tractorPos = await page.evaluate(() => {
        const t = window.__dopahar.vehicles.find((v) => v.preset.kind === 'tractor');
        return { x: t.group.position.x, z: t.group.position.z };
      });
      await setCamera({ x: tractorPos.x, z: tractorPos.z + 3, yaw: 0 });
      await settle();
      const rect = await page.evaluate(() => {
        const el = document.getElementById('interact-hint');
        if (!el || !el.classList.contains('visible')) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      });
      const VW = 1280;
      const VH = 800;
      const inTopRightThird = rect && rect.left >= (VW * 2) / 3 - 40 && rect.top <= VH / 3 + 20;
      record(
        'prompt badge renders in top-right region',
        !!inTopRightThird,
        rect ? `bounds ${JSON.stringify(rect)}` : 'no visible prompt found to check'
      );
    }

    // ---------------------------------------------------------------------
    // 2. Whole-scene grounding check (same logic as tools/screenshot-prod.js).
    // ---------------------------------------------------------------------
    async function runGroundingCheck() {
      return page.evaluate(() => {
        const scene = window.__dopahar?.scene;
        const vehicles = window.__dopahar?.vehicles;
        const player = window.__dopahar?.player;
        const npcs = window.__dopahar?.npcs;
        const props = window.__dopahar?.props;
        if (!scene) return null;
        const { Box3, Matrix4 } = window.__dopahar;
        const TOLERANCE = 0.05;
        const out = [];
        const box = new Box3();
        const localBox = new Box3();
        const mat = new Matrix4();
        const fullMat = new Matrix4();

        function checkWholeObject(object, label) {
          if (!object) return;
          // `precise=true` — Box3.setFromObject()'s default ("fast") path
          // transforms each mesh's LOCAL axis-aligned bounding box by
          // matrixWorld and unions the results, rather than transforming the
          // actual vertices. For a mesh rotated off-axis (any wheel not at a
          // multiple of 90°, now that they roll correctly about a horizontal
          // axle — see Bug B) that box-corner approach over-estimates the
          // AABB by up to a factor of sqrt(2) (confirmed empirically: 0.30m
          // of false "sinking" at 45° that vanished with `precise`), which
          // otherwise-correct wheels were tripping this check on. `precise`
          // uses real per-vertex bounds instead.
          box.setFromObject(object, true);
          if (!isFinite(box.min.y)) return;
          if (Math.abs(box.min.y) > TOLERANCE) out.push({ label, lowestY: +box.min.y.toFixed(3) });
        }
        function checkInstancedGroundLevel(object, label) {
          if (!object) return;
          object.geometry.computeBoundingBox();
          localBox.copy(object.geometry.boundingBox);
          for (let i = 0; i < object.count; i++) {
            object.getMatrixAt(i, mat);
            fullMat.multiplyMatrices(object.matrixWorld, mat);
            box.copy(localBox).applyMatrix4(fullMat);
            if (Math.abs(box.min.y) > TOLERANCE) out.push({ label: `${label}[${i}]`, lowestY: +box.min.y.toFixed(3) });
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
        return out;
      });
    }
    const grounding = await runGroundingCheck();
    record('grounding check empty', grounding !== null && grounding.length === 0, grounding && grounding.length ? JSON.stringify(grounding.slice(0, 5)) : grounding === null ? 'scene missing' : '');

    // ---------------------------------------------------------------------
    // 3. Performance budget (draw calls / triangles) at a representative shot.
    // ---------------------------------------------------------------------
    {
      await setCamera({ x: -48, z: 30, yaw: DEFAULT_YAW });
      await settle();
      const info = await page.evaluate(() => {
        const d = window.__dopahar;
        return { calls: d.renderer.info.render.calls, triangles: d.renderer.info.render.triangles };
      });
      record('draw calls under 120', info.calls < 120, `${info.calls} calls`);
      record('triangles under 400k', info.triangles < 400000, `${info.triangles} triangles`);
    }

    // ---------------------------------------------------------------------
    // 4. Asset budget (public/assets under 40MB, models/textures within limits)
    //    — filesystem check, reuses tools/check-budget.js.
    // ---------------------------------------------------------------------
    {
      const r = spawnSync('node', ['tools/check-budget.js'], { cwd: ROOT, encoding: 'utf-8' });
      record('asset budget (tools/check-budget.js)', r.status === 0, r.status === 0 ? '' : (r.stdout + r.stderr).split('\n').slice(0, 5).join(' | '));
    }

    // ---------------------------------------------------------------------
    // 5. All three errands complete end to end, through real interaction hooks.
    // ---------------------------------------------------------------------
    async function runFullErrandWalkthrough() {
      const d = () => page.evaluate(() => ({
        MAA: window.__dopahar.interactions.MAA_POSITION,
        HALWAI: window.__dopahar.interactions.HALWAI_NPC_POSITION,
        TEACHER: window.__dopahar.interactions.TEACHER_POSITION,
        BELL: window.__dopahar.interactions.BELL_POSITION,
        PITAJI: window.__dopahar.interactions.PITAJI_POSITION,
        SACK_PILE: window.__dopahar.interactions.SACK_PILE_POSITION,
        KIRANA: window.__dopahar.interactions.KIRANA_POSITION,
        STORE: window.__dopahar.interactions.INTERACTION_POINTS.find((p) => p.id === 'buy_general_store')?.position,
      }));
      const pos = await d();

      async function goInteract(p) {
        await page.evaluate(({ x, z }) => window.__dopahar.teleportPlayer(x, z), { x: p.x, z: p.z });
        await page.evaluate(() => window.__dopahar.interact());
        await page.waitForTimeout(200);
        await advanceDialogueUntilClosed();
      }

      // Errand 1: money -> jalebi -> back to Maa.
      await page.evaluate(() => {
        window.__dopahar.quest.step = window.__dopahar.QUEST_STEPS.NOT_STARTED;
      });
      await goInteract(pos.MAA); // -> HAVE_MONEY
      await goInteract(pos.HALWAI); // -> HAVE_JALEBI
      await goInteract(pos.MAA); // -> COMPLETE, shows end card
      await page.click('#end-continue-btn').catch(() => {});
      await page.waitForTimeout(200);
      await goInteract(pos.MAA); // COMPLETE -> HAVE_TIFFIN (errand 2 start)
      await goInteract(pos.TEACHER); // -> HAVE_SISTER
      await goInteract(pos.MAA); // -> ERRAND2_COMPLETE, shows end card
      await page.click('#end-continue-btn').catch(() => {});
      await page.waitForTimeout(200);
      await goInteract(pos.PITAJI); // ERRAND2_COMPLETE -> LOADING_WHEAT

      // Errand 3: 3 sacks on foot (one at a time, per the errand's own rule).
      for (let i = 0; i < 3; i++) {
        await goInteract(pos.SACK_PILE);
        await goInteract(pos.KIRANA);
      }
      // quest.step should now be WHEAT_DELIVERED.
      if (pos.STORE) await goInteract(pos.STORE); // -> BOUGHT_GOODS
      await goInteract(pos.PITAJI); // -> ALL_COMPLETE, terminal (no continue button)

      return page.evaluate(() => window.__dopahar.quest.step);
    }
    let finalStep = null;
    let walkthroughError = null;
    try {
      finalStep = await runFullErrandWalkthrough();
    } catch (e) {
      walkthroughError = e.message;
    }
    record('all three errands complete end to end', finalStep === 'all_complete', walkthroughError || `ended at step "${finalStep}"`);

    // ---------------------------------------------------------------------
    // 6. Player can walk.
    // ---------------------------------------------------------------------
    {
      const before = await page.evaluate(() => {
        window.__dopahar.teleportPlayer(-48, 20);
        return { x: window.__dopahar.player.position.x, z: window.__dopahar.player.position.z };
      });
      await page.keyboard.down('KeyW');
      // 2500ms, not 1200ms — this headless SwiftShader environment's frame pacing
      // is noisy enough that 1200ms sat right at the 0.5m threshold (0.63m one
      // run, 0.42m the next, same unchanged code) and produced a false
      // regression. More hold time gives real headroom above that noise floor.
      await page.waitForTimeout(2500);
      await page.keyboard.up('KeyW');
      const after = await page.evaluate(() => ({ x: window.__dopahar.player.position.x, z: window.__dopahar.player.position.z }));
      const moved = Math.hypot(after.x - before.x, after.z - before.z);
      record('player can walk', moved > 0.8, `moved ${moved.toFixed(2)}m`);
    }

    // ---------------------------------------------------------------------
    // 7. Player can mount and drive each vehicle kind. Hold duration and the
    //    distance considered "moved enough" are per-kind — the tractor and
    //    cart accelerate deliberately slowly by design (established earlier
    //    this session: the tractor took ~25s to cover ~10m from a stop), so a
    //    short hold that's fine for the bike would wrongly flag them.
    // ---------------------------------------------------------------------
    const VEHICLE_DRIVE_CHECKS = {
      bike: { holdMs: 2500, minMoved: 0.5 },
      tractor: { holdMs: 8000, minMoved: 0.5 },
      cart: { holdMs: 8000, minMoved: 0.3 },
    };
    for (const [kind, { holdMs, minMoved }] of Object.entries(VEHICLE_DRIVE_CHECKS)) {
      const before = await page.evaluate((kind) => {
        const d = window.__dopahar;
        const v = d.vehicles.find((v) => v.preset.kind === kind);
        d.teleportPlayer(v.group.position.x, v.group.position.z);
        d.mount(v);
        return { x: v.group.position.x, z: v.group.position.z };
      }, kind);
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(holdMs);
      await page.keyboard.up('KeyW');
      await page.waitForTimeout(500);
      const after = await page.evaluate((kind) => {
        const d = window.__dopahar;
        const v = d.vehicles.find((v) => v.preset.kind === kind);
        return { x: v.group.position.x, z: v.group.position.z };
      }, kind);
      await page.evaluate(() => window.__dopahar.dismount()).catch(() => {});
      const moved = Math.hypot(after.x - before.x, after.z - before.z);
      record(`can mount and drive the ${kind}`, moved > minMoved, `moved ${moved.toFixed(2)}m in ${holdMs}ms`);
    }

    // ---------------------------------------------------------------------
    // 8. Player can reach the bazaar, temple, school and field.
    //    "Reach" = walk there under real input and confirm the player's
    //    position actually advances toward it (not stuck/frozen) — not just a
    //    teleport, which would trivially "succeed" regardless of any bug.
    // ---------------------------------------------------------------------
    // Each approach direction matters — e.g. the temple's entrance faces west
    // (src/temple.js) with a boundary wall on the other sides, so approaching
    // from the south (into the wall) would fail regardless of any real bug.
    const LANDMARKS = {
      bazaar: { x: -54, z: 13, from: { dx: 0, dz: -6 }, yaw: Math.PI }, // CHOWK_CENTER, src/bazaar.js
      temple: { x: 8, z: 52, from: { dx: -6, dz: 0 }, yaw: -Math.PI / 2 }, // TEMPLE_POS, src/temple.js — entrance faces west
      school: { x: -50, z: 106, from: { dx: 0, dz: -6 }, yaw: Math.PI }, // SCHOOL_CENTER, src/village.js
      field: { x: 20, z: -20, from: { dx: 0, dz: -6 }, yaw: Math.PI }, // FIELD_CENTER, src/field.js
    };
    for (const [name, target] of Object.entries(LANDMARKS)) {
      const before = await page.evaluate(
        ({ x, z, from, yaw }) => {
          const d = window.__dopahar;
          d.teleportPlayer(x + from.dx, z + from.dz);
          d.camRig.yaw = yaw;
          d.camRig.update(10);
          return { x: d.player.position.x, z: d.player.position.z };
        },
        target
      );
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(2500);
      await page.keyboard.up('KeyW');
      const after = await page.evaluate(() => ({ x: window.__dopahar.player.position.x, z: window.__dopahar.player.position.z }));
      const distBefore = Math.hypot(before.x - target.x, before.z - target.z);
      const distAfter = Math.hypot(after.x - target.x, after.z - target.z);
      record(`player can reach the ${name}`, distAfter < distBefore - 1, `distance to target went from ${distBefore.toFixed(1)}m to ${distAfter.toFixed(1)}m`);
    }

    // ---------------------------------------------------------------------
    // 9. No red console errors across the whole run.
    // ---------------------------------------------------------------------
    record('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));

    await browser.close();
  } finally {
    server.kill();
  }

  // -------------------------------------------------------------------------
  // Compare against / save the baseline.
  // -------------------------------------------------------------------------
  const summary = { timestamp: new Date().toISOString(), results };
  mkdirSync(resolve(ROOT, 'docs'), { recursive: true });

  let regressionFound = false;
  if (existsSync(BASELINE_PATH) && !SAVE_BASELINE) {
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'));
    const baselineByName = Object.fromEntries(baseline.results.map((r) => [r.name, r.pass]));
    console.log('\n--- comparing against baseline ---');
    for (const r of results) {
      const wasPass = baselineByName[r.name];
      if (wasPass === true && r.pass === false) {
        console.log(`REGRESSION: "${r.name}" was passing in the baseline, now fails — ${r.detail}`);
        regressionFound = true;
      }
    }
    if (!regressionFound) console.log('No regressions vs. baseline.');
  } else {
    writeFileSync(BASELINE_PATH, JSON.stringify(summary, null, 2));
    console.log(`\nBaseline saved to ${BASELINE_PATH}`);
  }

  const failCount = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failCount}/${results.length} checks passed.`);
  if (regressionFound || failCount > 0) process.exitCode = 1;
}

main();
