#!/usr/bin/env node
/**
 * Item 1e evidence — drives the real tractor+trolley (via
 * window.__dopahar.stepTractorTrolleyPhysics(), the same deterministic
 * physics step tools/trolley-drive-test.js uses) up to each of the locations
 * item 1a's collider-audit found a real missing-collider gap at (the temple's
 * east and west boundary walls — since fixed, src/temple.js) plus one general
 * confirmation shot (school_compound, the single biggest wall run in the
 * village), stops it there, and captures a frameObjects() shot with the
 * tractor AND the whole trolley both in frame.
 *
 * Usage: npm run build && node tools/item1e-screenshots.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5200;
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
  const shotsDir = resolve(ROOT, 'docs', 'shots', `item1e-${timestamp}`);
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

    const footprints = await page.evaluate(() => window.__dopahar.getBuildingFootprints());
    const byName = (name) => footprints.find((f) => f.name === name);

    // forward = (-sin(yaw), 0, -cos(yaw)) — see tools/trolley-drive-test.js's own
    // note; each dir's yaw here faces the OPPOSITE of its own dx/dz, back toward
    // the target building.
    const TARGETS = [
      { label: 'temple_east_wall_fixed_gap', building: byName('temple'), dir: { dx: 1, dz: 0, yaw: Math.PI / 2 }, angleDeg: 20 },
      { label: 'temple_west_wall_flower_stall_fixed_gap', building: byName('temple'), dir: { dx: -1, dz: 0, yaw: -Math.PI / 2 }, angleDeg: -20 },
      { label: 'school_compound_confirmation', building: byName('school_compound'), dir: { dx: 0, dz: -1, yaw: Math.PI }, angleDeg: 25 },
    ];

    for (const t of TARGETS) {
      if (!t.building) {
        console.error(`skip ${t.label} — building footprint not found`);
        continue;
      }
      const cx = (t.building.minX + t.building.maxX) / 2;
      const cz = (t.building.minZ + t.building.maxZ) / 2;
      const hx = (t.building.maxX - t.building.minX) / 2;
      const hz = (t.building.maxZ - t.building.minZ) / 2;
      const startX = cx + t.dir.dx * (hx + 15);
      const startZ = cz + t.dir.dz * (hz + 15);

      await page.evaluate(
        ({ startX, startZ, yaw }) => {
          window.__dopahar.teleportVehicle('tractor', startX, startZ, yaw);
        },
        { startX, startZ, yaw: t.dir.yaw }
      );
      // Drive it to a stop via the real physics step, same as
      // tools/trolley-drive-test.js — position-settled, not speed-based (this
      // stripped-down physics step doesn't replicate the real per-frame loop's
      // "properlyBlocked -> speed=0" zeroing for the tractor itself, only the
      // trolley-shortfall one, so speed alone is unreliable here).
      await page.evaluate(() => {
        const d = window.__dopahar;
        const trolley = d.vehicles.find((v) => v.preset.kind === 'tractor').trolley;
        let prevX = null, prevZ = null, stillFrames = 0;
        for (let i = 0; i < 1800; i++) {
          d.stepTractorTrolleyPhysics(1 / 60, -1, 0);
          const pos = trolley.group.position;
          if (prevX !== null && Math.hypot(pos.x - prevX, pos.z - prevZ) < 0.002) {
            stillFrames++;
            if (stillFrames > 30) break;
          } else {
            stillFrames = 0;
          }
          prevX = pos.x;
          prevZ = pos.z;
        }
      });

      // frameObjects() alone only sees the tractor+trolley — not enough to
      // prove they're stopped OUTSIDE the wall, since the wall itself has no
      // stable name left after mergeAcrossGroups() folds it into a shared
      // 'plaster_N' mesh. Union in the building's own known real footprint
      // (from getBuildingFootprints(), the same ground truth item 1a/1b use)
      // as an explicit extra box so the wall is guaranteed in shot too.
      const frameInfo = await page.evaluate(
        ({ angleDeg, building }) => {
          const d = window.__dopahar;
          const box = new d.Box3();
          let any = false;
          for (const name of ['vehicle_tractor', 'trolley']) {
            d.scene.traverse((o) => {
              if (o.name !== name) return;
              const b = new d.Box3().setFromObject(o, true);
              if (isFinite(b.min.x)) {
                box.union(b);
                any = true;
              }
            });
          }
          if (!any) return { found: false };
          // Clip the building's own (possibly huge, e.g. a whole L-shaped
          // school) footprint to a margin around the vehicle before unioning,
          // so the shot frames "the wall right here" rather than the whole
          // building envelope shrinking the vehicle to a speck.
          const vc = box.getCenter(new d.Vector3());
          const MARGIN = 12;
          const clipMinX = Math.max(building.minX, vc.x - MARGIN);
          const clipMaxX = Math.min(building.maxX, vc.x + MARGIN);
          const clipMinZ = Math.max(building.minZ, vc.z - MARGIN);
          const clipMaxZ = Math.min(building.maxZ, vc.z + MARGIN);
          if (clipMinX < clipMaxX && clipMinZ < clipMaxZ) {
            box.union(new d.Box3(new d.Vector3(clipMinX, 0, clipMinZ), new d.Vector3(clipMaxX, 3, clipMaxZ)));
          }
          const center = box.getCenter(new d.Vector3());
          const size = box.getSize(new d.Vector3());
          const radius = Math.max(size.length() / 2, 0.05);
          const deg2rad = (deg) => (deg * Math.PI) / 180;
          const vFov = deg2rad(d.camera.fov);
          const dist = radius / 0.85 / Math.tan(vFov / 2);
          const angleRad = deg2rad(angleDeg);
          const elevRad = deg2rad(15);
          d.camera.position.set(center.x + dist * Math.sin(angleRad) * Math.cos(elevRad), center.y + dist * Math.sin(elevRad), center.z + dist * Math.cos(angleRad) * Math.cos(elevRad));
          d.camera.lookAt(center);
          d.camera.updateProjectionMatrix();
          d.player.visible = false;
          if (!d.camRig._frameObjectOrigUpdate) d.camRig._frameObjectOrigUpdate = d.camRig.update.bind(d.camRig);
          d.camRig.update = () => {};
          return { found: true, size: { x: size.x, y: size.y, z: size.z }, distance: dist };
        },
        { angleDeg: t.angleDeg, building: t.building }
      );
      if (!frameInfo.found) {
        console.error(`skip ${t.label} — tractor/trolley not found for framing`);
        continue;
      }
      for (let i = 0; i < 8; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      await page.waitForTimeout(150);
      const filePath = resolve(shotsDir, `${t.label}.png`);
      await page.screenshot({ path: filePath });
      await page.evaluate(() => window.__dopahar.unfreezeCamera());
      console.log(`Captured ${t.label} -> ${filePath} (bbox size ${JSON.stringify(frameInfo.size)}, camera distance ${frameInfo.distance.toFixed(2)}m)`);
    }

    await browser.close();
    console.log(`\nAll shots in ${shotsDir}`);
  } finally {
    server.kill();
  }
}

main();
