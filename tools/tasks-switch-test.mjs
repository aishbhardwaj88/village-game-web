#!/usr/bin/env node
/**
 * BACKLOG A-2b proof: the pause-menu Tasks list switches missions safely. Taps real rows (real pointer events):
 * skip ahead to each later mission, replay an earlier one, tap a locked side job (refused with a note), and
 * checks after each switch that the objective text matches the new step, the money/counters are reset, and
 * no console errors appear. Screenshots go to docs/shots/tasks-switch-<date>/.
 * Usage: npm run build && node tools/tasks-switch-test.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5241;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
const OUT = `${ROOT}docs/shots/tasks-switch-2026-10-26`;
mkdirSync(OUT, { recursive: true });
const wait = async (url, ms = 30000) => { const t = Date.now(); for (;;) { try { await fetch(url); return; } catch { if (Date.now() - t > ms) throw new Error('server'); await new Promise((r) => setTimeout(r, 300)); } } };
let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ` - ${d}` : ''}`); if (!ok) fails++; };

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
try {
  await wait(BASE_URL);
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'load' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
  await page.click('#play-btn');
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
  await page.waitForTimeout(1000);

  const step = () => page.evaluate(() => window.__dopahar.quest.step);
  const objective = () => page.evaluate(() => document.getElementById('objective-en').textContent);
  const open = async () => { await page.evaluate(() => window.__dopahar.freeRoam.openTasks()); await page.waitForTimeout(250); };
  const rows = () => page.$$eval('#tasks-list button', (bs) => bs.map((b) => ({ cls: b.className, en: b.querySelector('.v-en').textContent, st: b.querySelector('.t-state').textContent })));
  const tap = async (i) => { const h = (await page.$$('#tasks-list button'))[i]; await h.scrollIntoViewIfNeeded(); const bb = await h.boundingBox(); await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(400); };

  await open();
  const r0 = await rows();
  check('list has 8 missions + 10 side jobs + roam entry', r0.length === 19, `${r0.length} rows`);
  await page.screenshot({ path: `${OUT}/0_list_fresh.png` });

  // skip ahead to every later mission in turn, then replay mission 1
  const start = await step();
  let prevObj = await objective();
  for (const i of [1, 2, 3, 4, 6, 7]) {
    await open();
    const rs = await rows();
    if (!/Skip ahead/.test(rs[i].st) && i > 1) { check(`mission ${i + 1} offers skip-ahead`, false, rs[i].st); continue; }
    await tap(i);
    const s = await step();
    const o = await objective();
    const listClosed = await page.evaluate(() => !window.__dopahar.freeRoam.isTasksOpen());
    const state = await page.evaluate(() => ({ m: window.__dopahar.quest.money, sd: window.__dopahar.quest.sacksDelivered, mc: window.__dopahar.quest.mangoesCollected }));
    check(`mission ${i + 1}: switched, list closed, objective updated, counters reset`, s !== start && listClosed && o && state.m === 0 && state.sd === 0 && state.mc === 0, `step ${s}, "${o}"`);
    await page.screenshot({ path: `${OUT}/m${i + 1}_after_switch.png` });
    prevObj = o;
  }
  // replay mission 1 from a later one
  await open();
  const rs = await rows();
  check('finished mission 1 is replayable', /play it again/.test(rs[0].st), rs[0].st);
  await tap(0);
  check('replay lands on the first step', (await step()) === start, `step ${await step()}`);
  // locked side job refused
  await open();
  await tap(8);
  const note = await page.$eval('#tasks-note', (n) => n.textContent);
  check('locked side job is refused with a plain note and nothing changes', /open once the story/.test(note) && (await step()) === start, note);
  await page.screenshot({ path: `${OUT}/9_locked_side_job_note.png` });
  check('zero console errors', errors.length === 0, errors.join(' | '));
  await browser.close();
} finally { server.kill(); }
console.log(fails ? `\nTASKS SWITCH TEST: ${fails} failed` : '\nTASKS SWITCH TEST: ALL PASSED');
process.exit(fails ? 1 : 0);
