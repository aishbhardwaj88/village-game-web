#!/usr/bin/env node
/**
 * Lane clearance audit (BACKLOG A1f "audit every prop sitting in a navigable lane"). Samples each drawn lane
 * centre-line every 1 m and lists every STATIC collider box that intrudes into a 1.1 m half-width corridor
 * (cart / tractor body). Report only: nothing is moved. Usage: npm run build && node tools/lane-clearance-audit.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pt } from '../src/anchors.js';
import { STAGED_PLACES } from '../src/stagedPlaces.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5197;
const BASE = `http://localhost:${PORT}/village-game-web/`;
const HALF = 1.1;
import { SPURS } from '../src/eastRoad.js';
const LANES = eval(readFileSync(new URL('../src/freeRoam.js', import.meta.url), 'utf8').match(/export const LANES = (\[[\s\S]*?\n\]);/)[1].replace(/\/\/.*$/gm, ''));
void pt; void STAGED_PLACES;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
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
  const boxes = await page.evaluate(() => window.__dopahar.getStaticColliders().map((b) => [b.minX, b.maxX, b.minZ, b.maxZ, b.src || (b.auto ? 'auto' : '?')]));
  await browser.close();
  const hits = new Map();
  LANES.forEach((lane, li) => {
    for (let s = 1; s < lane.length; s++) {
      const [ax, az] = lane[s - 1], [bx, bz] = lane[s];
      const len = Math.hypot(bx - ax, bz - az);
      for (let d = 0; d <= len; d += 1) {
        const x = ax + ((bx - ax) * d) / len, z = az + ((bz - az) * d) / len;
        boxes.forEach((b, bi) => {
          if (x > b[0] - HALF && x < b[1] + HALF && z > b[2] - HALF && z < b[3] + HALF) {
            const k = `${li}:${bi}`;
            if (!hits.has(k)) hits.set(k, { lane: li, box: b.slice(0, 4).map((v) => +v.toFixed(1)), src: b[4], at: [+x.toFixed(1), +z.toFixed(1)] });
          }
        });
      }
    }
  });
  console.log(`lanes ${LANES.length}, boxes ${boxes.length}, intrusions into ${HALF} m corridor: ${hits.size}`);
  for (const h of hits.values()) console.log(`lane ${h.lane} first at (${h.at}) box x ${h.box[0]}..${h.box[1]} z ${h.box[2]}..${h.box[3]} src=${h.src}`);
} finally { server.kill(); }
