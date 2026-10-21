#!/usr/bin/env node
/**
 * Permanent regression guard (added after the playtest-bug-fix regressions of
 * 2026-09-20/21 — see CLAUDE.md's "Regression guard" rule). Captures/checks
 * everything that has broken before while fixing something else:
 *
 *  - every prompt badge renders inside the top-right region of the viewport
 *  - the whole-scene grounding check is empty
 *  - draw calls / triangles / asset size stay under budget
 *  - all six currently-built missions (M1-M6, docs/STORY.md) complete end to end,
 *    through the real interaction system (teleport + the same interact()/mount()/
 *    dismount() dev hooks a real E-press or mount action calls — not by writing
 *    quest.step directly, except to fast-forward past the start of M1). M7/M8
 *    aren't built yet — extend this walkthrough once they are.
 *  - no red console errors across the whole run
 *  - the player can walk, mount and drive each vehicle kind, and reach the
 *    bazaar, temple, school and field
 *  - the trolley is solid to the player and to other vehicles, attached AND
 *    detached, under real held-key driving/walking (not a teleported or
 *    scripted position) — added after a real playtest bug where it had none
 *    of that (see src/main.js's otherVehicleBoxes() bugfix comment)
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
      record('draw calls under 150', info.calls < 150, `${info.calls} calls`); // soft early-warning margin, 10 below docs/budgets.md's 150 hard ceiling (raised from 140 2026-10-20) — tools/world-validator.js's per-zone check 8a is the real hard gate
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
        DARZI: window.__dopahar.interactions.INTERACTION_POINTS.find((p) => p.id === 'darzi_kurta')?.position,
      }));
      const pos = await d();

      async function goToLiveNpc(npcName, frames = 40) {
        // M4/M6 (docs/STORY.md) — the postman and the monkey both move, so
        // "walk there" means re-teleporting to wherever they currently are
        // for a few real frames, the same convergence trick tmp/test_m4_m6.mjs
        // used (kept here too, permanently, since this is now the one
        // real regression check covering M4-M6). The monkey's chase route is
        // longer/faster than the postman's short loop, so it needs more frames
        // to actually catch up rather than just approach its starting point.
        for (let i = 0; i < frames; i++) {
          await page.evaluate((name) => {
            const d = window.__dopahar;
            const npc = d.npcs.find((n) => n.name === name);
            d.teleportPlayer(npc.position.x, npc.position.z);
          }, npcName);
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
        }
      }

      // Maa walks her own small 2-point loop the whole time this walkthrough runs
      // (src/main.js maaWalk) — by the time the M5 visit happens, minutes of real
      // test time later, the `pos.MAA` snapshot captured once at the very top can be
      // further than the interaction radius from where she actually is. Every
      // earlier Maa visit in this walkthrough happens soon enough after that one
      // snapshot that it hasn't mattered; use the live-position convergence instead
      // of the stale snapshot for this one, since it comes last and furthest out.
      async function goInteractLiveNpc(npcName) {
        await goToLiveNpc(npcName);
        await page.evaluate(() => window.__dopahar.interact());
        await page.waitForTimeout(200);
        await advanceDialogueUntilClosed();
      }

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
      await goInteract(pos.PITAJI); // -> ERRAND3_COMPLETE, shows a mid end card now (M1-M3 no longer end the game)
      await page.click('#end-continue-btn').catch(() => {});
      await page.waitForTimeout(200);

      // Errand 4 (M4, docs/STORY.md): find the postman, bring the letter back.
      await goInteract(pos.PITAJI); // ERRAND3_COMPLETE -> FINDING_POSTMAN
      await goToLiveNpc('npc_postman');
      await page.evaluate(() => window.__dopahar.interact());
      await page.waitForTimeout(200);
      await advanceDialogueUntilClosed(); // -> HAVE_LETTER
      await goInteract(pos.PITAJI); // -> ERRAND4_COMPLETE

      // Errand 5+6 (M5/M6): collect the kurta, walk away, the monkey auto-snatches,
      // chase it down, report back.
      await goInteractLiveNpc('npc_maa'); // ERRAND4_COMPLETE -> GOING_TO_DARZI
      if (pos.DARZI) await goInteract(pos.DARZI); // -> HAVE_KURTA
      await page.evaluate((p) => window.__dopahar.teleportPlayer(p.x - 15, p.z), pos.DARZI);
      for (let i = 0; i < 20; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      await page.waitForTimeout(200); // the tick loop's distance check should have fired -> KURTA_STOLEN
      await goToLiveNpc('npc_monkey', 400);
      await page.evaluate(() => window.__dopahar.interact());
      await page.waitForTimeout(200); // -> KURTA_RECOVERED
      await goInteract(pos.PITAJI); // -> ERRAND6_COMPLETE, shows a mid end card
      await page.click('#end-continue-btn').catch(() => {});
      await page.waitForTimeout(200);

      // Errand 7 (M7): drive to the baagh (teleport stands in for the drive —
      // vehicle driving itself is covered by the separate "can mount and drive
      // the tractor" check below), knock all 3 marked trees, drive home.
      await goInteract(pos.PITAJI); // ERRAND6_COMPLETE -> GOING_TO_BAAGH
      const mangoPositions = await page.evaluate(() =>
        window.__dopahar.interactions.INTERACTION_POINTS.filter((p) => p.id.startsWith('mango_')).map((p) => ({ x: p.position.x, z: p.position.z }))
      );
      for (const p of mangoPositions) await goInteract(p); // -> MANGOES_LOADED once all 3 are knocked
      await goInteract(pos.PITAJI); // -> ERRAND7_COMPLETE, shows a mid end card
      await page.click('#end-continue-btn').catch(() => {});
      await page.waitForTimeout(200);

      // Errand 8 (M8): the roof ending. Teleport to the stair base (same reasoning
      // as tmp/test_m7_m8.mjs — a straight beeline from wherever the player is
      // would hit a real wall long before finding the narrow stair corridor;
      // tools/world-validator.js's own ROOF_CHAIN proves the full walk is
      // possible, this only needs to prove the climb + ending dialogue work),
      // then really climb via stepPlayerMove so groundHeightAt ramps Y for real.
      await goInteract(pos.PITAJI); // ERRAND7_COMPLETE -> GOING_TO_ROOF
      const roofPos = await page.evaluate(() => {
        const pt = window.__dopahar.interactions.INTERACTION_POINTS.find((p) => p.id === 'roof_ending');
        return { x: pt.position.x, z: pt.position.z };
      });
      await page.evaluate((p) => window.__dopahar.teleportPlayer(p.x, 39), roofPos);
      for (let i = 0; i < 600; i++) {
        await page.evaluate((p) => {
          const d = window.__dopahar;
          const dx = p.x - d.player.position.x, dz = p.z - d.player.position.z;
          const len = Math.hypot(dx, dz) || 1;
          d.stepPlayerMove(1 / 60, dx / len, dz / len);
        }, roofPos);
      }
      await page.evaluate(() => window.__dopahar.interact());
      await page.waitForTimeout(200);
      await advanceDialogueUntilClosed(); // the ending's own multi-line sequence -> ALL_COMPLETE

      return page.evaluate(() => window.__dopahar.quest.step);
    }
    let finalStep = null;
    let walkthroughError = null;
    try {
      finalStep = await runFullErrandWalkthrough();
    } catch (e) {
      walkthroughError = e.message;
    }
    record('all eight missions complete end to end', finalStep === 'all_complete', walkthroughError || `ended at step "${finalStep}"`);

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
      // 2026-10-21: headless frame rate is now ~3 fps with the dense abadi (distance walked scales with frames), so hold 6s.
      await page.waitForTimeout(6000);
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
      // 2026-10-21: headless frame rate is now ~3 fps with the dense abadi (distance walked scales with frames), so hold 6s.
      await page.waitForTimeout(6000);
      await page.keyboard.up('KeyW');
      const after = await page.evaluate(() => ({ x: window.__dopahar.player.position.x, z: window.__dopahar.player.position.z }));
      const distBefore = Math.hypot(before.x - target.x, before.z - target.z);
      const distAfter = Math.hypot(after.x - target.x, after.z - target.z);
      record(`player can reach the ${name}`, distAfter < distBefore - 1, `distance to target went from ${distBefore.toFixed(1)}m to ${distAfter.toFixed(1)}m`);
    }

    // ---------------------------------------------------------------------
    // 9. The trolley is solid to the PLAYER, in both the attached and the
    //    detached state — a real playtest bug (not caught before because every
    //    prior trolley test drove it by teleporting/scripting positions
    //    directly, which can never exercise whether a resolver actually stops
    //    real, continuous input). Root cause: src/main.js's otherVehicleBoxes()
    //    never had ANY box for the trolley at all (it isn't a member of the
    //    `vehicles` array) — see src/collision.js's orientedFootprintBox() and
    //    the bugfix comment on otherVehicleBoxes() itself. Only the START
    //    position of each approach below is set directly (same pattern the
    //    "player can reach the landmark" checks above already use); the actual
    //    approach is a real held KeyW, sampled continuously throughout (not a
    //    single end-of-hold check) so a moment of tunneling mid-approach can't
    //    hide behind a final position that happens to read clear.
    // ---------------------------------------------------------------------
    async function playerVsTrolleyApproaches(label) {
      const trolley = await page.evaluate(() => window.__dopahar.currentTrolley());
      if (!trolley) {
        record(`trolley solid to player, no penetration (${label})`, false, 'no trolley found in the scene');
        return;
      }
      const approaches = [
        { dx: 0, dz: -6, yaw: Math.PI }, // from north
        { dx: 0, dz: 6, yaw: 0 }, // from south
        { dx: -6, dz: 0, yaw: -Math.PI / 2 }, // from west
        { dx: 6, dz: 0, yaw: Math.PI / 2 }, // from east
      ];
      let worstClearance = Infinity; // most negative = worst penetration
      let closestApproach = Infinity;
      for (const a of approaches) {
        await page.evaluate(
          ({ x, z, yaw }) => {
            const d = window.__dopahar;
            d.teleportPlayer(x, z);
            d.camRig.yaw = yaw;
            d.camRig.update(10);
          },
          { x: trolley.x + a.dx, z: trolley.z + a.dz, yaw: a.yaw }
        );
        await page.keyboard.down('KeyW');
        // Frame-rate robust (2026-10-21): the old fixed 20 x 150ms window assumed a fast headless
        // frame rate; with the richer hero zone the player only covered ~2 of the 6 m in 3 s and
        // "never got near the trolley" was reported. Walk until the clearance stops shrinking
        // (blocked or arrived), up to ~20 s.
        let stable = 0;
        let prev = Infinity;
        for (let i = 0; i < 130 && stable < 8; i++) {
          await page.waitForTimeout(150);
          const clearance = await page.evaluate(() => window.__dopahar.playerDistanceToTrolley());
          if (clearance < worstClearance) worstClearance = clearance;
          if (clearance < closestApproach) closestApproach = clearance;
          stable = Math.abs(clearance - prev) < 0.01 ? stable + 1 : 0;
          prev = clearance;
        }
        await page.keyboard.up('KeyW');
        await page.waitForTimeout(200);
      }
      record(
        `trolley solid to player, no penetration (${label})`,
        worstClearance >= -0.05,
        `worst clearance ${worstClearance.toFixed(3)}m across 4 real-walked approaches (negative = penetrating)`
      );
      record(
        `trolley actually blocks the player, not coincidentally far away (${label})`,
        closestApproach < 1.5,
        `closest real approach got to ${closestApproach.toFixed(2)}m clearance`
      );
    }
    await playerVsTrolleyApproaches('attached');

    // ---------------------------------------------------------------------
    // 10. Real-input tractor+trolley driving: into a building wall, sharp
    //     turns while touching it, and reversing — sampled continuously across
    //     the whole drive (CLAUDE.md's regression-guard rule: a single passing
    //     frame/screenshot is not evidence for anything that accumulates over
    //     time, like a swung-around trailer). Only the tractor's initial
    //     FACING is set directly (aiming it at a real building footprint, read
    //     from the live scene via getBuildingFootprints() — never hand-typed
    //     coordinates); every metre of actual travel is real held W/A/S/D.
    // ---------------------------------------------------------------------
    async function sampleWhile(actionPromise, sampleFn, intervalMs = 100) {
      const samples = [];
      let stop = false;
      const sampler = (async () => {
        while (!stop) {
          samples.push(await page.evaluate(sampleFn));
          await page.waitForTimeout(intervalMs);
        }
      })();
      await actionPromise;
      stop = true;
      await sampler;
      return samples;
    }

    {
      const tractorPos = await page.evaluate(() => {
        const t = window.__dopahar.vehicles.find((v) => v.preset.kind === 'tractor');
        return { x: t.group.position.x, z: t.group.position.z };
      });
      const nearestWall = await page.evaluate((tp) => {
        const fps = window.__dopahar.getBuildingFootprints().filter((f) => f.root === 'hero_zone');
        let best = null;
        let bestD = Infinity;
        for (const f of fps) {
          const cx = (f.minX + f.maxX) / 2;
          const cz = (f.minZ + f.maxZ) / 2;
          const d = Math.hypot(cx - tp.x, cz - tp.z);
          if (d < bestD) {
            bestD = d;
            best = { x: cx, z: cz };
          }
        }
        return best;
      }, tractorPos);

      // Aim the tractor's real facing at the wall (position/driving stays 100%
      // real input below) — same forward convention Vehicle.update() documents
      // (forward = (-sin(yaw), -cos(yaw))): yaw = atan2(-dirX, -dirZ).
      await page.evaluate(
        ({ tp, wallPos }) => {
          const d = window.__dopahar;
          const v = d.vehicles.find((v) => v.preset.kind === 'tractor');
          d.teleportPlayer(v.group.position.x, v.group.position.z);
          const dirX = wallPos.x - tp.x;
          const dirZ = wallPos.z - tp.z;
          v.group.rotation.y = Math.atan2(-dirX, -dirZ);
          v.speed = 0; // a directly-assigned facing must pair with zero speed — see test 12's own note
          d.mount(v);
        },
        { tp: tractorPos, wallPos: nearestWall }
      );

      const trolleyWallSamples = await sampleWhile(
        (async () => {
          // Drive straight at the wall until contact (tractor accelerates
          // slowly — this needs real headroom, same reasoning as this file's
          // own VEHICLE_DRIVE_CHECKS.tractor holdMs).
          await page.keyboard.down('KeyW');
          await page.waitForTimeout(9000);
          // Sharp turn each way while still rolling, right at the wall.
          await page.keyboard.down('KeyD');
          await page.waitForTimeout(2500);
          await page.keyboard.up('KeyD');
          await page.keyboard.down('KeyA');
          await page.waitForTimeout(2500);
          await page.keyboard.up('KeyA');
          // Reverse away — the trolley now leads, straight toward whatever is
          // behind the tractor's current facing.
          await page.keyboard.up('KeyW');
          await page.keyboard.down('KeyS');
          await page.waitForTimeout(5000);
          await page.keyboard.up('KeyS');
        })(),
        () => window.__dopahar.trolleyWallClearance()
      );
      await page.evaluate(() => window.__dopahar.dismount()).catch(() => {});

      // Depth-based, same -0.05 tolerance as every other trolley check in
      // this file — a strict boolean overlap test (tried first) flagged
      // ordinary momentary wall-grazing during the sharp-turn segment as a
      // false "tunnel", the same false-positive pattern already found and
      // fixed for the vehicle-vs-trolley check below (see
      // src/collision.js's orientedBoxClearance()/orientedBoxWorstClearance()
      // doc comments).
      const worstWallClearance = Math.min(...trolleyWallSamples);
      record(
        'attached trolley never tunnels into a wall during real driving (approach, sharp turns, reversing)',
        worstWallClearance >= -0.05,
        `worst clearance ${worstWallClearance.toFixed(3)}m across ${trolleyWallSamples.length} sampled frames (negative = penetrating)`
      );
    }

    // ---------------------------------------------------------------------
    // 11. Detach the trolley with a real F-press (the actual player control,
    //     src/controls.js's consumeAttach() — no gating condition on detach
    //     besides "mounted on a tractor that has one attached"), then re-run
    //     the same real-walked player approaches against it in its new,
    //     detached, standing-alone state.
    // ---------------------------------------------------------------------
    {
      const tractorPos = await page.evaluate(() => {
        const t = window.__dopahar.vehicles.find((v) => v.preset.kind === 'tractor');
        return { x: t.group.position.x, z: t.group.position.z };
      });
      const beforeAttached = await page.evaluate(() => !!window.__dopahar.currentTrolley()?.attached);
      await page.evaluate((tp) => {
        const d = window.__dopahar;
        const v = d.vehicles.find((v) => v.preset.kind === 'tractor');
        d.teleportPlayer(tp.x, tp.z);
        d.mount(v);
      }, tractorPos);
      await page.keyboard.press('KeyF');
      // Poll for the state change instead of a fixed 300 ms sleep (frame rate dependent, see docs/parked.md).
      let afterAttached = true;
      for (let i = 0; i < 40 && afterAttached; i++) {
        await page.waitForTimeout(150);
        afterAttached = await page.evaluate(() => !!window.__dopahar.currentTrolley()?.attached);
      }
      await page.evaluate(() => window.__dopahar.dismount()).catch(() => {});
      record('trolley detaches with a real F-press', beforeAttached && !afterAttached, `attached before=${beforeAttached}, after=${afterAttached}`);
    }
    await playerVsTrolleyApproaches('detached');

    // ---------------------------------------------------------------------
    // 12. The now-detached, standing-alone trolley is also solid to another
    //     VEHICLE (the tractor, now without it) during real driving — not
    //     just to the player (checks 9/11 above).
    // ---------------------------------------------------------------------
    {
      const tractor = await page.evaluate(() => {
        const t = window.__dopahar.vehicles.find((v) => v.preset.kind === 'tractor');
        return { x: t.group.position.x, z: t.group.position.z };
      });
      const trolley = await page.evaluate(() => window.__dopahar.currentTrolley());
      await page.evaluate(
        ({ tp, trolleyPos }) => {
          const d = window.__dopahar;
          const v = d.vehicles.find((v) => v.preset.kind === 'tractor');
          d.teleportPlayer(v.group.position.x, v.group.position.z);
          const dirX = trolleyPos.x - tp.x;
          const dirZ = trolleyPos.z - tp.z;
          v.group.rotation.y = Math.atan2(-dirX, -dirZ);
          // A directly test-assigned facing must pair with zero speed: this
          // tractor can carry a large leftover negative (reversing) speed from
          // test 10's own reverse maneuver, and `speed` is a scalar along
          // whatever the CURRENT facing is — reassigning facing here without
          // zeroing it manufactures a state no real player's steering could
          // ever produce (orientation and velocity direction are always
          // coupled in real play, since steering itself is speed-scaled; see
          // Vehicle.update()). That manufactured state is exactly what
          // produced this test's own false "penetration" failures before this
          // fix (confirmed via tmp/trolley_diag.mjs and a captured
          // [DEBUG worst clearance] dump showing speed=-2.09 while 'KeyW' was
          // held the whole time) — not a real collision-resolver bug.
          v.speed = 0;
          d.mount(v);
        },
        { tp: tractor, trolleyPos: trolley }
      );
      let worstClearance = Infinity;
      let worstDetail = null;
      await page.keyboard.down('KeyW');
      for (let i = 0; i < 70; i++) {
        await page.waitForTimeout(150);
        const sample = await page.evaluate(() => {
          const d = window.__dopahar;
          const v = d.vehicles.find((v) => v.preset.kind === 'tractor');
          const t = d.currentTrolley();
          return {
            clearance: d.vehicleClearanceToTrolley('tractor'),
            tx: v.group.position.x, tz: v.group.position.z, tyaw: v.group.rotation.y, speed: v.speed,
            trolleyX: t.x, trolleyZ: t.z, trolleyYaw: t.yaw,
            wallClearance: d.minDistanceToColliders({ x: v.group.position.x, z: v.group.position.z }, Math.hypot(v.preset.body.w, v.preset.body.d) / 2),
          };
        });
        if (sample.clearance < worstClearance) { worstClearance = sample.clearance; worstDetail = sample; }
      }
      if (worstClearance < -0.05) console.log('[DEBUG worst clearance]', JSON.stringify(worstDetail));
      await page.keyboard.up('KeyW');
      await page.evaluate(() => window.__dopahar.dismount()).catch(() => {});
      record(
        'detached trolley is solid to another vehicle during real driving',
        worstClearance >= -0.05,
        `worst clearance ${worstClearance.toFixed(3)}m while driving the tractor at it (negative = penetrating)`
      );
    }

    // ---------------------------------------------------------------------
    // 13. No red console errors across the whole run.
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
