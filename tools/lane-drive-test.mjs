#!/usr/bin/env node
/**
 * Lane vehicle drive (BACKLOG A1f "drive the full vehicle route to confirm"). Puts the tractor at the start of every
 * drawn lane and steers it along the centre-line with pure pursuit through the real tractor physics step. A lane
 * fails if the tractor stops making progress (blocked) before the last point. Report only.
 * Usage: npm run build && node tools/lane-drive-test.mjs [kind=tractor]
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SPURS } from '../src/eastRoad.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5198;
const BASE = `http://localhost:${PORT}/village-game-web/`;
const KIND = process.argv[2] || 'tractor';
const SIGN = Number(process.env.STEER_SIGN || -1); // -1 = this game's steering convention
const TROLLEY = process.env.TROLLEY === '1'; // default: tractor alone; TROLLEY=1 hitches the trolley at each lane start
const LANES = eval(readFileSync(new URL('../src/freeRoam.js', import.meta.url), 'utf8').match(/export const LANES = (\[[\s\S]*?\n\]);/)[1].replace(/\/\/.*$/gm, ''));
void SPURS;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
let failed = 0;
try {
  for (let i = 0; i < 100; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}?dev=1`, { waitUntil: 'load' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 15000 }).catch(() => {});
  await page.click('#play-btn');
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
  await page.waitForTimeout(1500);
  for (let li = 0; li < LANES.length; li++) {
    const lane = LANES[li];
    const r = await page.evaluate(({ lane, kind, sign, trolley }) => {
      const d = window.__dopahar;
      const veh = d.vehicles.find((v) => v.preset.kind === kind);
      if (!trolley && veh.trolley && veh.trolley.attached) veh.detachTrolley();
      const [sx, sz] = lane[0], [nx, nz] = lane[1];
      if (!d.teleportVehicle(kind, sx, sz, Math.atan2(-(nx - sx), -(nz - sz)))) return { ok: false, x: sx, z: sz, seg: 0, noHitch: true };
      let seg = 1, stuck = 0, last = null, st = null;
      for (let f = 0; f < 60 * 240; f++) {
        const p = d.vehicles.find((v) => v.preset.kind === kind).group.position;
        const yaw = d.vehicles.find((v) => v.preset.kind === kind).group.rotation.y;
        const [tx, tz] = lane[seg];
        if (Math.hypot(tx - p.x, tz - p.z) < 2.5) { seg++; if (seg >= lane.length) return { ok: true, f }; continue; }
        const want = Math.atan2(-(tx - p.x), -(tz - p.z));
        let err = want - yaw; err = Math.atan2(Math.sin(err), Math.cos(err));
        st = d.stepVehicle(kind, 1 / 60, -1, Math.max(-1, Math.min(1, err * 2)) * sign);
        if (last && Math.hypot(st.x - last.x, st.z - last.z) < 0.002) stuck++; else stuck = 0;
        last = st;
        if (stuck > 90) return { ok: false, f, x: st.x, z: st.z, seg };
      }
      return { ok: false, timeout: true, x: last && last.x, z: last && last.z, seg };
    }, { lane, kind: KIND, sign: SIGN, trolley: TROLLEY });
    if (!r.ok) failed++;
    console.log(`lane ${li} start (${lane[0]}) -> ${r.ok ? 'OK' : 'BLOCKED at (' + (r.x ?? 0).toFixed(1) + ',' + (r.z ?? 0).toFixed(1) + ') heading for point ' + r.seg + (r.timeout ? ' [timeout]' : '') + (r.noHitch ? ' [trolley cannot hitch here: rest spot blocked]' : '')}`);
  }
  await browser.close();
  console.log(`\n${LANES.length - failed}/${LANES.length} lanes driven end to end by the ${KIND}`);
} finally { server.kill(); }
process.exit(0);
