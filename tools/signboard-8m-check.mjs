#!/usr/bin/env node
/**
 * docs/FINISH_LINE.md Step B — "Every shop/place signboard is legible at 8 m in a
 * 1280x800 screenshot." Frames EVERY real signboard in the game (2 hero-zone +
 * 8 bazaar units + 1 chowk tea stall = 11) from exactly 8m away, square-on, at
 * real player eye height, looking up at the board the way someone standing in
 * front of a shop actually would — not an idealised dead-centre framing.
 *
 * Positions/facings below are taken directly from the same source constants the
 * real signboards are built from (src/bazaar.js, src/shops.js, src/main.js) —
 * see the inline derivation comments for each one.
 *
 * Usage: npm run build && node tools/signboard-8m-check.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5228;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
// Matches the real in-game third-person chase camera height (src/player.js's
// own CAMERA_HEIGHT, also used by tools/signboard-legibility-check.mjs's own
// "real third-person chase cam" shot) — NOT a seated/standing eye height.
// Verified empirically first (tmp/tea_sign_check2.mjs): at 1.65m the tea
// stall's own counter/back-wall structure (unrelated geometry, directly below
// its sign) rises high enough in frame from that shallower angle to occlude
// most of the sign, leaving only a thin unreadable sliver above it — purely a
// framing-height artifact, not a wrong-facing or missing-texture bug (the
// exact same camera position/distance at 2.2m reads the sign cleanly).
const EYE_Y = 2.2;
const DISTANCE = 8;

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolvePromise, reject) => {
    const tryOnce = () => {
      fetch(url).then(() => resolvePromise()).catch(() => {
        if (Date.now() - start > timeoutMs) reject(new Error('Preview server did not start in time'));
        else setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

// --- Bazaar units (src/bazaar.js) ---
const BAZAAR_WEST_X = -100;
const BAZAAR_UNIT_W = 4.5;
const BAZAAR_FRONT_Z = 12.5; // BAZAAR_ROW_CZ(15) - BAZAAR_UNIT_D(5)/2
const BAZAAR_UNITS = [
  { n: 1, en: 'Kirana Store', wallHeight: 3.9 },
  { n: 2, en: 'Sabzi Shop', wallHeight: 4.15 },
  { n: 3, en: 'Medical Store', wallHeight: 3.95 },
  { n: 4, en: 'Tailor Shop', wallHeight: 4.2 },
  { n: 5, en: 'Barber Shop', wallHeight: 4.0 },
  { n: 6, en: 'Mobile and Cyber', wallHeight: 3.85 },
  { n: 7, en: 'Bangle Shop', wallHeight: 4.1 },
  { n: 8, en: 'Sweet Shop', wallHeight: 3.95 },
];
const bazaarUnitCx = (idx) => BAZAAR_WEST_X + BAZAAR_UNIT_W * idx + BAZAAR_UNIT_W / 2;

const SIGNS = [
  // Hero zone (src/main.js TEA_SHOP_POS/ROT, src/shops.js TEA dims; see
  // buildSignboards()'s own local-offset formula: (0, boardY, depth/2 - 0.06)).
  { label: 'hero_tea_stall_Sharma_Tea_Stall', pos: { x: -50.81, y: 3.8, z: 78 }, facing: { x: 1, z: 0 } }, // faces +X (east); y = postH(2.6)+1.2
  // STORE_POS/ROT, STORE dims; local offset (0, boardY, depth/2 + 0.06).
  { label: 'hero_general_store_Gupta_General_Store', pos: { x: -53.56, y: 3.1, z: 20 }, facing: { x: -1, z: 0 } }, // faces -X (west)
];
for (let idx = 0; idx < BAZAAR_UNITS.length; idx++) {
  const u = BAZAAR_UNITS[idx];
  SIGNS.push({
    label: `bazaar_unit${u.n}_${u.en.replace(/\s+/g, '_')}`,
    pos: { x: bazaarUnitCx(idx), y: u.wallHeight + 0.77, z: BAZAAR_FRONT_Z - 0.05 },
    facing: { x: 0, z: -1 }, // all bazaar units face -Z (south, toward the lane)
  });
}
// Chowk tea stall (CHOWK_TEA_POS=(-55,10); local offset (0, roofEdgeH+0.8,
// -d/2-0.05) = (0, 3.6, -1.8), rotated by CHOWK_TEA_ROT=-PI/2).
// Bugfix: the comment here (and this script's own first attempt) assumed the
// readable face points -X ("faces west, toward the bazaar row" per
// src/bazaar.js's own comment, describing the STALL's open/customer side, not
// which way this specific sign box's textured face ends up after rotation) —
// empirically wrong (tmp/chowk_sign_check3/4.mjs: the sign only reads from
// the EAST side). Don't trust a building-orientation comment for which way a
// child mesh's own texture faces; verify directly.
SIGNS.push({ label: 'chowk_tea_stall_Yadav_Chai_Nashta', pos: { x: -53.2, y: 3.6, z: 10 }, facing: { x: 1, z: 0 } }); // faces +X (east) — verified empirically

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shotsDir = resolve(ROOT, 'docs', 'shots', `normal-mode-signboard-8m-${timestamp}`);
  mkdirSync(shotsDir, { recursive: true });

  console.log('Starting `vite preview` against dist/...');
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  server.stderr.on('data', (d) => process.stderr.write(`[vite preview] ${d}`));

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => console.error('pageerror:', e.message));

    await page.goto(`${BASE_URL}?proof=1`, { waitUntil: 'load' });
    await page.waitForSelector('#start-overlay.ready', { timeout: 15000 }).catch(() => {});
    await page.click('#play-btn');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(1200);

    for (const s of SIGNS) {
      const camX = s.pos.x + s.facing.x * DISTANCE;
      const camZ = s.pos.z + s.facing.z * DISTANCE;
      await page.evaluate(
        ({ camX, camZ, eyeY, lookAt }) => {
          const d = window.__dopahar;
          d.player.visible = false;
          if (!d.camRig._frameObjectOrigUpdate) d.camRig._frameObjectOrigUpdate = d.camRig.update.bind(d.camRig);
          d.camRig.update = () => {};
          d.camera.position.set(camX, eyeY, camZ);
          d.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
          d.camera.updateProjectionMatrix();
        },
        { camX, camZ, eyeY: EYE_Y, lookAt: s.pos }
      );
      for (let i = 0; i < 8; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      await page.waitForTimeout(150);
      const filePath = resolve(shotsDir, `${s.label}.png`);
      await page.screenshot({ path: filePath });
      console.log(`Captured ${s.label} -> ${filePath}`);
    }

    await browser.close();
    console.log(`\nAll ${SIGNS.length} shots in ${shotsDir}`);
  } finally {
    server.kill();
  }
}

main();
