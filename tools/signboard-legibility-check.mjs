#!/usr/bin/env node
/**
 * Item 2a — reproduce the reported signboard illegibility at REAL play distance
 * and angle, not a convenient close-up: camera at player eye height
 * (src/player.js's PLAYER_HEIGHT=2m, eye a bit below the top of the capsule),
 * standing on the lane in front of the bazaar row, looking at the boards the
 * way a player walking past actually sees them — an oblique angle down the
 * row, not square-on to one board.
 *
 * Usage: npm run build && node tools/signboard-legibility-check.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5227;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;

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
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shotsDir = resolve(ROOT, 'docs', 'shots', `signboard-legibility-${timestamp}`);
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

    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'load' });
    await page.waitForSelector('#start-overlay.ready', { timeout: 15000 }).catch(() => {});
    await page.click('#play-btn');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(1200);

    // Two shots: (A) walking-past angle — standing on the lane, looking down the
    // row at a shallow angle, the realistic way signboards are actually seen in
    // play; (B) the game's REAL third-person chase camera (5m back, 2.2m up,
    // src/player.js) at a normal walking position in front of the row — exactly
    // what a player's screen shows during ordinary play, not a staged angle.
    const SHOTS = [
      {
        label: 'A_walking_past_eye_height',
        cam: { x: -92, y: 1.65, z: 8 },
        look: { x: -84, y: 3.6, z: 13 },
      },
      {
        label: 'B_real_third_person_chase_cam',
        playerPos: { x: -88.75, z: 7 },
        camYaw: Math.PI, // facing +Z, i.e. north into the row, same convention as other tools
      },
    ];

    for (const s of SHOTS) {
      if (s.playerPos) {
        await page.evaluate(
          ({ x, z, yaw }) => {
            const d = window.__dopahar;
            d.teleportPlayer(x, z);
            d.camRig.yaw = yaw;
            d.camRig.pitch = -0.08;
            d.camRig.distance = 5; // src/player.js CAMERA_DISTANCE
            d.camRig.height = 2.2; // src/player.js CAMERA_HEIGHT
            d.camRig.update(10);
          },
          { x: s.playerPos.x, z: s.playerPos.z, yaw: s.camYaw }
        );
      } else {
        await page.evaluate(
          ({ cam, look }) => {
            const d = window.__dopahar;
            d.player.visible = false;
            if (!d.camRig._frameObjectOrigUpdate) d.camRig._frameObjectOrigUpdate = d.camRig.update.bind(d.camRig);
            d.camRig.update = () => {};
            d.camera.position.set(cam.x, cam.y, cam.z);
            d.camera.lookAt(look.x, look.y, look.z);
            d.camera.updateProjectionMatrix();
          },
          s
        );
      }
      for (let i = 0; i < 8; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      await page.waitForTimeout(150);
      const filePath = resolve(shotsDir, `${s.label}.png`);
      await page.screenshot({ path: filePath });
      await page.evaluate(() => window.__dopahar.unfreezeCamera()).catch(() => {});
      console.log(`Captured ${s.label} -> ${filePath}`);
    }

    // Diagnostic dump — the actual texture/material settings on a signboard mesh,
    // to check (per item 2b's candidate list) resolution, filtering, colorSpace.
    const diag = await page.evaluate(() => {
      const d = window.__dopahar;
      const out = [];
      d.scene.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        if (!m || !m.map || !m.map.isCanvasTexture) return;
        out.push({
          meshName: o.name,
          materialName: m.name,
          mapImageSize: { w: m.map.image.width, h: m.map.image.height },
          colorSpace: m.map.colorSpace,
          needsUpdate: m.map.needsUpdate,
          minFilter: m.map.minFilter,
          magFilter: m.map.magFilter,
          anisotropy: m.map.anisotropy,
          generateMipmaps: m.map.generateMipmaps,
          roughness: m.roughness,
        });
      });
      return out;
    });
    console.log('\n=== Signboard texture/material diagnostic ===');
    console.log(JSON.stringify(diag, null, 2));

    await browser.close();
    console.log(`\nAll shots in ${shotsDir}`);
  } finally {
    server.kill();
  }
}

main();
