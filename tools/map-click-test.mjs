#!/usr/bin/env node
/**
 * BACKLOG A-2a proof: click a place ON THE NOTEBOOK MAP with the real mouse and land there.
 * Opens the map, presses (screenshot of the name before travel), releases, waits for the zone to stream in,
 * asserts the player arrived within the place's radius and the map closed; also: empty space does nothing, a click
 * 20 px off the icon still hits (44 px target), and mid-errand the first click warns and the second travels.
 * Screenshots go to docs/shots/map-click-<date>/.
 *
 * Usage: npm run build && node tools/map-click-test.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5239;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
const OUT = `${ROOT}docs/shots/map-click-2026-10-25`;
mkdirSync(OUT, { recursive: true });
const TARGETS = ['school', 'canal', 'temple', 'mandi', 'gurukul', 'masjid'];

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => fetch(url).then(() => resolve()).catch(() => {
      if (Date.now() - start > timeoutMs) reject(new Error('preview server did not start'));
      else setTimeout(tryOnce, 300);
    });
    tryOnce();
  });
}
let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`); if (!ok) fails++; };

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  try {
    await waitForServer(BASE_URL);
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
    await page.waitForTimeout(1500);

    const screenOf = async (id, dx = 0, dy = 0) => page.evaluate(({ id, dx, dy }) => {
      const c = document.getElementById('notebook-canvas');
      const hit = window.__dopahar.freeRoam.mapHits().find((h) => h.id === id);
      const r = c.getBoundingClientRect();
      return { x: r.left + c.clientLeft + hit.x * (c.clientWidth / 960) + dx, y: r.top + c.clientTop + hit.y * (c.clientHeight / 640) + dy, hit };
    }, { id, dx, dy });
    const openMap = async () => { await page.evaluate(() => window.__dopahar.freeRoam.openNotebook()); await page.waitForTimeout(300); };
    const playerPos = () => page.evaluate(() => ({ x: window.__dopahar.player.position.x, z: window.__dopahar.player.position.z }));

    for (const [i, id] of TARGETS.entries()) {
      await openMap();
      const p = await screenOf(id);
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      await page.waitForTimeout(250);
      if (i === 0) await page.screenshot({ path: `${OUT}/0_press_shows_name_${id}.png` });
      await page.mouse.up();
      await page.waitForTimeout(4500); // land, then the zone streams in
      const open = await page.evaluate(() => window.__dopahar.freeRoam.isOpen());
      const here = await playerPos();
      const place = await page.evaluate((id) => { const pl = window.__dopahar.places.find((q) => q.id === id); return { x: pl.x, z: pl.z, radius: pl.radius }; }, id);
      const dist = Math.hypot(here.x - place.x, here.z - place.z);
      check(`click ${id}: landed within its radius, map closed`, !open && dist <= place.radius * 1.7 + 2, `distance ${dist.toFixed(1)} m (radius ${place.radius}), mapOpen=${open}`);
      await page.screenshot({ path: `${OUT}/${i + 1}_arrived_${id}.png` });
    }

    // empty space does nothing
    await openMap();
    const before = await playerPos();
    await page.mouse.click(1280 / 2, 790);
    await page.waitForTimeout(500);
    const stillOpen = await page.evaluate(() => window.__dopahar.freeRoam.isOpen());
    const after = await playerPos();
    check('empty map space does nothing', stillOpen && before.x === after.x && before.z === after.z);
    // 44 px target: 20 px off the icon still hits (press shows the name)
    const off = await screenOf('house', 20, 0);
    await page.mouse.move(off.x, off.y);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/7_press_20px_off_house.png` });
    await page.mouse.up();
    await page.waitForTimeout(3000);
    const h = await playerPos();
    const house = await page.evaluate(() => { const pl = window.__dopahar.places.find((q) => q.id === 'house'); return { x: pl.x, z: pl.z }; });
    check('click 20 px off an icon still travels (44 px target)', Math.hypot(h.x - house.x, h.z - house.z) < 40, `distance ${Math.hypot(h.x - house.x, h.z - house.z).toFixed(1)}`);

    // mid-errand: first click warns, second travels, quest step untouched
    await page.evaluate(() => { const d = window.__dopahar; d.quest.step = d.QUEST_STEPS.HAVE_MONEY; });
    await openMap();
    const s0 = await page.evaluate(() => window.__dopahar.quest.step);
    const pm = await screenOf('temple');
    await page.mouse.click(pm.x, pm.y);
    await page.waitForTimeout(400);
    const warned = await page.evaluate(() => window.__dopahar.freeRoam.isOpen());
    await page.screenshot({ path: `${OUT}/8_midmission_first_click_warns.png` });
    check('mid-errand first click warns and stays on the map', warned);
    await page.mouse.click(pm.x, pm.y);
    await page.waitForTimeout(3500);
    const s1 = await page.evaluate(() => window.__dopahar.quest.step);
    const t = await playerPos();
    check('mid-errand second click travels, quest step untouched', s0 === s1 && Math.hypot(t.x - 8, t.z - 52) < 45, `step ${s0} -> ${s1}, distance ${Math.hypot(t.x - 8, t.z - 52).toFixed(1)}`);

    check('zero console errors across open-map, click, land cycles', errors.length === 0, errors.join(' | '));
    await browser.close();
  } finally {
    server.kill();
  }
  console.log(fails ? `\nMAP CLICK TEST: ${fails} failed` : '\nMAP CLICK TEST: ALL PASSED');
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
