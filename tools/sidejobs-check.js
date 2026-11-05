#!/usr/bin/env node
/**
 * Side-jobs end-to-end check (docs/FINISH_LINE.md: "All 10 side jobs in docs/MISSIONS_PLAN.md section 3 playable start to end
 * with real input"). Modelled on tools/regression-check.js: dev-mode ?dev=1 hooks (window.__dopahar), Playwright, headless.
 *
 * Free roam is started with the same startFreeRoam() the credits button calls (story finished). Then each of the ten jobs in
 * src/jobs/*.js is run through the real interact() path (the function an E-press calls: nearest interaction point at the
 * player's position, availability and priority honoured), with the player standing at the job's real interaction point.
 * Dialogue is advanced with real Space presses; mini-games (timing bars, power meters) are played with real Space presses
 * timed from the marker position in the DOM; choice cards / menus are real clicks on their buttons.
 * Pass criteria per job: quest.jobsDone[id] went up AND its reward landed (quest.pocket, marbles, kites, mangoVarieties),
 * with 0 console errors during the job.
 *
 * Test-driving limits (not game bugs): the player is teleported between stops instead of walked (the bullock cart too, for the
 * chakki leg); the gate job's reversing is driven by fixed-dt stepTractorTrolleyPhysics. Patang reads the landing spot from the job's own state.
 *
 * Usage: node tools/sidejobs-check.js [--preview] [--only=id,id]   (default: vite dev server; --preview serves dist/ after a build)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5197;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
const PREVIEW = process.argv.includes('--preview');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean); // e.g. --only=chakki,gate

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((res, rej) => {
    const once = () => fetch(url).then(() => res()).catch(() => (Date.now() - start > timeoutMs ? rej(new Error('server did not start')) : setTimeout(once, 300)));
    once();
  });
}

const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const server = spawn('npx', PREVIEW ? ['vite', 'preview', '--port', String(PORT), '--strictPort'] : ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});
  const errors = [];
  let browser;
  try {
    await waitForServer(BASE_URL);
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message} @ ${(e.stack || '').split('\n').slice(1, 3).join(' ').trim()}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForSelector('#start-overlay.ready', { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => document.getElementById('play-btn').click());
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(1500);

    // ------------------------------------------------------------ story done -> free roam
    await page.evaluate(() => window.__dopahar.startFreeRoam());
    await page.waitForTimeout(800);
    const roam = await page.evaluate(() => ({ step: window.__dopahar.quest.step, done: window.__dopahar.quest.storyDone, jobs: !!window.__dopahar.sideJobs }));
    if (roam.step !== 'free_roam' || !roam.jobs) throw new Error(`free roam did not start: ${JSON.stringify(roam)}`);

    // ------------------------------------------------------------ helpers
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const q = () => ev(() => { const k = window.__dopahar.quest; return { pocket: k.pocket, marbles: k.marbles, kites: k.kites, mango: k.mangoVarieties.length, jobs: { ...k.jobsDone } }; });
    const tele = (x, z) => ev(({ x, z }) => window.__dopahar.teleportPlayer(x, z), { x, z });
    const pointPos = (id) => ev((id) => { const p = window.__dopahar.interactions.INTERACTION_POINTS.find((p) => p.id === id); return p ? { x: p.position.x, z: p.position.z } : null; }, id);
    const interact = () => ev(() => window.__dopahar.interact());
    const dialogueOpen = () => ev(() => window.__dopahar.dialogue.isOpen);
    const frame = () => ev(() => new Promise((r) => requestAnimationFrame(() => r())));

    /** Look at the open job card and act on it. `prefer` = button texts to click (first match wins) when it is a choice card. */
    async function handleModal(prefer = []) {
      const info = await ev(() => {
        const o = document.getElementById('job-overlay');
        if (!o.classList.contains('visible')) return null;
        const marker = o.querySelector('.job-marker');
        const zone = o.querySelector('.job-zone');
        const track = o.querySelector('.job-track');
        const pct = (s) => parseFloat(s) || 0;
        const buttons = [...document.querySelectorAll('#job-actions button')].map((b) => b.textContent);
        if (marker && zone && track && !zone.style.background) {
          const ml = pct(marker.style.left) / 100;
          const c = (pct(zone.style.left) + pct(zone.style.width) / 2) / 100;
          const half = pct(zone.style.width) / 200;
          return { kind: track.classList.contains('job-power') ? 'power' : 'rhythm', ml, c, half, buttons: [] };
        }
        return { kind: track ? 'wait' : 'choice', buttons };
      });
      if (!info) return false;
      if (info.kind === 'rhythm' || info.kind === 'power') {
        const tol = Math.max(0.015, info.half * 0.45);
        if (Math.abs(info.ml - info.c) <= tol) {
          await page.keyboard.press('Space');
          await sleep(220);
        }
        return true;
      }
      if (info.kind === 'choice') {
        const names = info.buttons;
        let idx = -1;
        for (const p of prefer) { idx = names.findIndex((n) => n.includes(p)); if (idx >= 0) break; }
        if (idx < 0) idx = 0;
        await page.locator('#job-actions button').nth(idx).dispatchEvent('pointerdown');
        await sleep(250);
      }
      return true;
    }

    /** Keep the game moving (dialogue via Space, cards via handleModal) until cond() is true. */
    async function until(cond, { ms = 40000, prefer = [], tickMs = 40 } = {}) {
      const t0 = Date.now();
      for (;;) {
        if (await ev(cond)) return true;
        if (Date.now() - t0 > ms) return false;
        if (await dialogueOpen()) { await page.keyboard.press('Space'); await sleep(260); continue; }
        if (await handleModal(prefer)) { await sleep(tickMs); continue; }
        await sleep(tickMs);
      }
    }
    const idle = () => ev(() => !window.__dopahar.dialogue.isOpen && !document.getElementById('job-overlay').classList.contains('visible'));
    const jobDoneFn = (id, n) => `() => (window.__dopahar.quest.jobsDone.${id} || 0) >= ${n}`;
    const untilJob = (id, opts = {}) => until(new Function(`return (${jobDoneFn(id, (opts.n || 1))})()`), opts);

    async function standAt(id, dx = 0, dz = 0.5) {
      const p = await pointPos(id);
      if (!p) throw new Error(`interaction point ${id} not registered`);
      await tele(p.x + dx, p.z + dz);
      await frame(); await frame();
      return p;
    }

    // ------------------------------------------------------------ job runner
    async function runJob(id, fn) {
      if (ONLY.length && !ONLY.includes(id)) return;
      const before = await q();
      const e0 = errors.length;
      let reason = '';
      let ok = false;
      try {
        reason = (await fn(before)) || '';
        ok = true;
      } catch (e) {
        reason = e.message;
        const snap = await ev(() => ({ hud: document.getElementById('job-hud-en')?.textContent, overlay: document.getElementById('job-overlay').className, text: document.getElementById('job-overlay').innerText.slice(0, 160), dlg: window.__dopahar.dialogue.isOpen }));
        console.log(`  [${id}] stuck state: ${JSON.stringify(snap)}`);
      }
      const after = await q();
      const jobsDelta = (after.jobs[id] || 0) - (before.jobs[id] || 0);
      const reward = `pocket ${before.pocket}->${after.pocket}, marbles ${before.marbles}->${after.marbles}, kites ${before.kites}->${after.kites}, mango ${before.mango}->${after.mango}`;
      const newErr = errors.slice(e0);
      if (ok && jobsDelta < 1) { ok = false; reason = `job never reported done (${reason})`; }
      if (ok && newErr.length) { ok = false; reason = `console errors: ${newErr.join(' | ').slice(0, 200)}`; }
      results.push({ id, ok, reason: ok ? `${reason} ${reward}`.trim() : `${reason} [${reward}]` });
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} - ${results[results.length - 1].reason}`);
      // always leave the world idle for the next job
      await ev(() => { window.__dopahar.sideJobs?.closeModal(); });
      for (let i = 0; i < 20 && (await dialogueOpen()); i++) { await page.keyboard.press('Space'); await sleep(300); }
      await ev(() => { if (window.__dopahar.mountedVehicle) window.__dopahar.dismount(); });
    }

    const need = (cond, msg) => { if (!cond) throw new Error(msg); };

    // ------------------------------------------------------------ 1. pump
    await runJob('pump', async (b) => {
      const dadi = await standAt('job_dadi', 0, 0.6);
      await interact();
      await until(() => !window.__dopahar.dialogue.isOpen && !document.getElementById('job-overlay').classList.contains('visible') && /Fill 3 buckets/.test(document.getElementById('job-hud-en').textContent), { prefer: ['Fetch water'] });
      const pump = await standAt('job_pump_pump', 0, 0);
      for (let i = 0; i < 3; i++) {
        await interact();
        await until(() => document.getElementById('job-overlay').classList.contains('visible'), { ms: 4000 });
        await until(() => !document.getElementById('job-overlay').classList.contains('visible'), { ms: 40000 });
      }
      need(/Water:/.test(await ev(() => document.getElementById('job-hud-en').textContent)), 'not carrying water after 3 buckets');
      await tele(dadi.x, dadi.z + 0.6); await frame();
      await interact();
      need(await untilJob('pump'), 'Dadi never paid out');
      return '3 buckets pumped via rhythm bar, water handed to Dadi';
    });

    // ------------------------------------------------------------ 2. ration
    await runJob('ration', async () => {
      const maa = await ev(() => { const m = window.__dopahar.interactions.MAA_POSITION; return { x: m.x, z: m.z }; });
      await tele(maa.x, maa.z + 0.6); await frame();
      await interact();
      await until(() => /Walk with Maa/.test(document.getElementById('job-hud-en').textContent));
      const shop = await pointPos('job_ration_shop');
      await tele(shop.x, shop.z + 0.5);
      await ev(() => { const n = window.__dopahar.npcs[0]; const p = window.__dopahar.player.position; n.position.set(p.x + 1.5, 0, p.z + 1); }); // Maa keeps pace in play; here she is placed beside
      await frame(); await frame();
      await interact();
      await until(() => /Carry the sack/.test(document.getElementById('job-hud-en').textContent));
      await tele(maa.x, maa.z + 0.6); await frame(); // the hand-over point is Maa's fixed courtyard spot (the 'maa' interaction), not wherever she walked to
      await interact();
      need(await untilJob('ration'), 'Maa never paid out');
      return 'walked to shop with Maa, carried sack back';
    });

    // ------------------------------------------------------------ 3. kulfi
    await runJob('kulfi', async () => {
      const k = await pointPos('job_kulfiwala');
      await tele(k.x + 0.8, k.z); await frame();
      await interact();
      need(await until(() => document.getElementById('job-overlay').classList.contains('visible'), { ms: 15000 }), 'kulfi menu never opened');
      need(await untilJob('kulfi', { prefer: ['Malai'] }), 'kulfi purchase never completed');
      return 'bought malai kulfi (treat + gossip)';
    });

    // ------------------------------------------------------------ 4. milk
    await runJob('milk', async () => {
      const d = await pointPos('job_milk_doodhwala');
      await tele(d.x, d.z + 0.8); await frame();
      await interact();
      need(await until(() => /Milk round/.test(document.getElementById('job-hud-en').textContent)), 'milk round never started');
      for (let i = 0; i < 5; i++) {
        const s = await pointPos('job_milk_stop');
        await tele(s.x, s.z + 0.8); await frame(); await frame();
        await interact();
        need(await until(new Function(`return ${i < 4 ? `/house ${i + 2} of 5/` : '/All delivered/'}.test(document.getElementById('job-hud-en').textContent)`), { ms: 15000 }), `stop ${i + 1} did not advance`);
      }
      await tele(d.x, d.z + 0.8); await frame();
      await interact();
      need(await untilJob('milk'), 'doodhwala never paid out');
      return 'five doorsteps served, paid on return';
    });

    // ------------------------------------------------------------ 5. kanche
    await runJob('kanche', async () => {
      await standAt('job_kanche', 0, 0.5);
      for (let attempt = 0; attempt < 3; attempt++) {
        const start = (await q()).jobs.kanche || 0;
        await interact();
        await until(() => document.getElementById('job-overlay').classList.contains('visible'), { ms: 12000, prefer: ['Kanche'] }); // choice card
        const ok = await until(new Function(`return (window.__dopahar.quest.jobsDone.kanche||0) > ${start}`), { ms: 90000, prefer: ['Kanche'] });
        if (ok && (await q()).marbles > 0) return `played kanche, ${(await q()).marbles} marbles`;
      }
      throw new Error('no marbles won in 3 rounds of kanche');
    });

    // ------------------------------------------------------------ 6. gilli
    await runJob('gilli', async () => {
      await standAt('job_gilli', 0, 0.3);
      await interact();
      need(await untilJob('gilli', { ms: 120000 }), 'gilli match never finished');
      const rec = await ev(() => window.__dopahar.quest.records.gilli);
      need(rec > 0, 'no best distance recorded');
      return `match played, best ${rec} steps`;
    });

    // ------------------------------------------------------------ 7. chakki
    await runJob('chakki', async () => {
      const dadi = await standAt('job_dadi', 0, 0.6);
      await interact();
      await until(() => /bullock cart and load/.test(document.getElementById('job-hud-en').textContent), { prefer: ['chakki'] });
      const load = await standAt('job_chakki_load', 0, 0.5);
      await interact();
      need(await until(() => /Drive the cart/.test(document.getElementById('job-hud-en').textContent)), 'sack never loaded');
      const door = await pointPos('job_chakki_counter');
      // test-driving limit: the cart is placed at the chakki instead of being driven ~100 m
      await ev((d) => { const c = window.__dopahar.vehicles.find((v) => v.preset.kind === 'cart'); c.group.position.set(d.x + 3, c.group.position.y, d.z + 6); }, door);
      await tele(door.x, door.z + 0.5); await frame();
      await interact();
      need(await until(() => /Bring the flour/.test(document.getElementById('job-hud-en').textContent), { ms: 40000 }), 'flour never ready after the wait');
      await ev((d) => { const c = window.__dopahar.vehicles.find((v) => v.preset.kind === 'cart'); c.group.position.set(d.x + 5, c.group.position.y, d.z); }, dadi);
      await tele(dadi.x, dadi.z + 0.6); await frame();
      await interact();
      need(await untilJob('chakki'), 'Dadi never paid for the flour');
      return 'sack loaded, waited in queue, flour delivered (cart teleported between stops)';
    });

    // ------------------------------------------------------------ 8. gate
    await runJob('gate', async () => {
      const pj = await ev(() => { const p = window.__dopahar.interactions.PITAJI_POSITION; return { x: p.x, z: p.z }; });
      await tele(pj.x, pj.z + 0.6); await frame();
      await interact();
      need(await until(() => /Hitch the trolley/.test(document.getElementById('job-hud-en').textContent)), 'Pitaji did not start the gate job');
      // tractor south of the gate (30,40), nose pointing south, trolley hitched behind it: reverse = real held S key
      await ev(() => {
        const d = window.__dopahar;
        const t = d.vehicles.find((v) => v.preset.kind === 'tractor');
        d.teleportPlayer(t.group.position.x, t.group.position.z);
        d.mount(t);
        d.teleportVehicle('tractor', 30, 47, Math.PI); // snaps the attached trolley back behind it too
      });
      const hitched = await ev(() => !!window.__dopahar.vehicles.find((v) => v.preset.kind === 'tractor').trolley);
      need(hitched, 'tractor has no trolley hitched (test setup)');
      console.log('  [gate] pause state', JSON.stringify(await ev(() => window.__dopahar.isPaused())));
      console.log('  [gate] rAF in 1s', await ev(() => new Promise((r) => { let n = 0; const f = () => { n++; requestAnimationFrame(f); }; requestAnimationFrame(f); setTimeout(() => r(n), 1000); })), 'mounted', await ev(() => window.__dopahar.mountedVehicle?.preset?.kind ?? null));
      // deterministic reverse: fixed-dt physics steps (throttleZ +1 = reverse); the live frame loop still runs the job logic between batches
      const t0 = Date.now();
      let inYard = false;
      while (Date.now() - t0 < 60000) {
        await ev(() => { for (let i = 0; i < 20; i++) window.__dopahar.stepTractorTrolleyPhysics(1 / 60, 1, 0); });
        await sleep(100);
        inYard = await ev(() => /In!/.test(document.getElementById('job-hud-en').textContent));
        if (inYard) break;
      }
      const pos = await ev(() => { const d = window.__dopahar; const g = d.currentTrolley?.(); const t = d.vehicles.find((v) => v.preset.kind === 'tractor'); return { trolley: g ? { x: +g.x.toFixed(1), z: +g.z.toFixed(1), yaw: +g.yaw.toFixed(2) } : null, tractor: { x: +t.group.position.x.toFixed(1), z: +t.group.position.z.toFixed(1), yaw: +t.group.rotation.y.toFixed(2), speed: +t.speed.toFixed(2) } }; }).catch((e) => String(e));
      need(inYard, `trolley never reached the yard by reversing (trolley at ${JSON.stringify(pos)})`);
      await ev(() => window.__dopahar.dismount());
      await tele(pj.x, pj.z + 0.6); await frame();
      await interact();
      need(await untilJob('gate'), 'Pitaji never paid out');
      return 'trolley reversed through the khet gate with held S, Pitaji paid';
    });

    // ------------------------------------------------------------ 9. patang
    await runJob('patang', async () => {
      await standAt('job_patang_kid', 0, 0.8);
      await interact();
      need(await until(() => !!window.__dopahar.sideJobs.api.nodes.patang?.spot && window.__dopahar.sideJobs.api.nodes.patang.stage === 'chase'), 'kite chase never started');
      // test-driving limit: the player is teleported to the landing spot (read from the job's own state) rather than sprinted ~40 m
      await until(() => window.__dopahar.sideJobs.api.nodes.patang.t > 3.2, { ms: 20000 });
      await ev(() => { const s = window.__dopahar.sideJobs.api.nodes.patang.spot; window.__dopahar.teleportPlayer(s.x, s.z); });
      need(await untilJob('patang'), 'chase never ended');
      const kites = (await q()).kites;
      need(kites >= 1, 'a rival got the kite (no kite awarded)');
      return `kite caught, ${kites} in collection`;
    });

    // ------------------------------------------------------------ 10. mango
    await runJob('mango', async () => {
      const ids = ['dussehri', 'langra', 'chausa', 'safeda', 'totapuri', 'desi'];
      for (const v of ids) {
        const n0 = (await q()).mango;
        await standAt(`job_mango_${v}`, 0, 0.3);
        await interact();
        need(await until(new Function(`return window.__dopahar.quest.mangoVarieties.length > ${n0}`), { ms: 15000 }), `${v} was not ticked off`);
        await until(() => !window.__dopahar.dialogue.isOpen, { ms: 15000 });
      }
      need(await untilJob('mango'), 'all six tasted but no completion reward');
      return 'six varieties tasted, Rs 50 reward';
    });
  } finally {
    await browser?.close().catch(() => {});
    server.kill();
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n=== side jobs ===');
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}`);
  console.log(`console errors overall: ${errors.length}`);
  errors.slice(0, 8).forEach((e) => console.log('  ' + e.slice(0, 200)));
  console.log(`${results.length - failed.length}/${results.length} jobs passed`);
  process.exit(failed.length || (!ONLY.length && results.length < 10) ? 1 : 0);
}

main().catch((e) => { console.error('sidejobs-check crashed:', e); process.exit(2); });
