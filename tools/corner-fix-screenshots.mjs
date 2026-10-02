#!/usr/bin/env node
/**
 * Evidence for the real playtest regression ("trolley ends up inside a building",
 * screenshot: tractor outside, trolley buried ~2m into a wall near the bazaar,
 * player dismounted). Reproduces the actual failure shape — an ANGLED approach at
 * a CORNER where two buildings/walls meet, not a straight-on approach to one
 * building's face (tools/item1e-screenshots.mjs's own targets, kept for the
 * temple/school gap evidence from the earlier session, don't cover this) — using
 * the same diagonal approach pattern tools/trolley-corner-test.js uses to drive
 * the reproduction test, then frames tractor + whole trolley + the nearby wall
 * stopped outside it, from the approach (lane) angle.
 *
 * Usage: npm run build && node tools/corner-fix-screenshots.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5215;
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
  const shotsDir = resolve(ROOT, 'docs', 'shots', `corner-fix-${timestamp}`);
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

    // Three real corners that tools/trolley-corner-test.js exercised before this
    // fix (the before-fix log: tmp/trolley-corner-test-BEFORE-fix.txt) — a bazaar
    // row party-wall corner ("near the bazaar end", matching the bug report's own
    // description), the house_compound corner (the single worst pre-fix
    // penetration, 0.877-1.03m), and a school_compound corner.
    const TARGETS = [
      { label: 'bazaar_row_corner_angled_approach', corner: { x: -82.0, z: 17.4 }, dir: { fx: -Math.SQRT1_2, fz: -Math.SQRT1_2 } }, // NE diagonal, same as trolley-corner-test.js
      { label: 'house_compound_corner_angled_approach', corner: { x: -48.0, z: 40.0 }, dir: { fx: -Math.SQRT1_2, fz: Math.SQRT1_2 } }, // SE diagonal — worst pre-fix case (0.877-1.03m)
      { label: 'school_compound_corner_angled_approach', corner: { x: -59.1, z: 114.9 }, dir: { fx: -Math.SQRT1_2, fz: -Math.SQRT1_2 } }, // NE diagonal
    ];
    const APPROACH_GAP = 10;

    function yawFacing(fx, fz) {
      return Math.atan2(-fx, -fz);
    }

    for (const t of TARGETS) {
      const yaw = yawFacing(t.dir.fx, t.dir.fz);
      const startX = t.corner.x - t.dir.fx * APPROACH_GAP;
      const startZ = t.corner.z - t.dir.fz * APPROACH_GAP;

      await page.evaluate(
        ({ startX, startZ, yaw }) => window.__dopahar.teleportVehicle('tractor', startX, startZ, yaw),
        { startX, startZ, yaw }
      );
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

      // Frame tractor + trolley, plus every STATIC_COLLIDERS box within 6m of the
      // vehicle union (guaranteed to include whichever real wall it stopped
      // against, regardless of which merged mesh/building name owns it).
      const frameInfo = await page.evaluate(
        ({ approachFx, approachFz }) => {
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
          const vc = box.getCenter(new d.Vector3());
          const NEARBY = 3; // closest-POINT distance, not centroid — a 10m+ wall's
          // centroid can be far from the vehicle even while its near edge is
          // right next to it.
          const CLIP_MARGIN = 6; // clip each nearby collider to this margin around
          // the vehicle before unioning — a 14m-long compound wall (house_compound)
          // or an 8-unit bazaar row would otherwise pull the whole span into the
          // frame and shrink the vehicle to a speck.
          for (const c of d.getStaticColliders()) {
            const closestX = Math.min(Math.max(vc.x, c.minX), c.maxX);
            const closestZ = Math.min(Math.max(vc.z, c.minZ), c.maxZ);
            if (Math.hypot(closestX - vc.x, closestZ - vc.z) < NEARBY) {
              const clipMinX = Math.max(c.minX, vc.x - CLIP_MARGIN);
              const clipMaxX = Math.min(c.maxX, vc.x + CLIP_MARGIN);
              const clipMinZ = Math.max(c.minZ, vc.z - CLIP_MARGIN);
              const clipMaxZ = Math.min(c.maxZ, vc.z + CLIP_MARGIN);
              if (clipMinX < clipMaxX && clipMinZ < clipMaxZ) {
                box.union(new d.Box3(new d.Vector3(clipMinX, 0, clipMinZ), new d.Vector3(clipMaxX, 2.6, clipMaxZ)));
              }
            }
          }
          const center = box.getCenter(new d.Vector3());
          const size = box.getSize(new d.Vector3());
          const radius = Math.max(size.length() / 2, 0.05);
          const deg2rad = (deg) => (deg * Math.PI) / 180;
          const vFov = deg2rad(d.camera.fov);
          const dist = radius / 0.6 / Math.tan(vFov / 2); // generous headroom — a
          // tight fill factor let a roof overhang clip the tractor at the
          // school_compound corner (occlusion, not penetration).
          // Camera azimuth derived from the vehicle's OWN approach direction
          // (back the way it came, same convention as yawFacing: atan2(-fx,-fz)
          // for a direction (fx,fz)), not an arbitrary compass angle — guarantees
          // the camera sits on the open side the vehicle actually drove in from,
          // never inside an enclosed courtyard on the far side of the wall it
          // stopped at (a real failure mode with a fixed per-target angle, since
          // house_compound's walls enclose a courtyard on one side).
          const angleRad = Math.atan2(approachFx, approachFz) + deg2rad(20); // back-direction + a slight twist for a 3/4 view
          const elevRad = deg2rad(50); // near-top-down — a lower elevation let a
          // perpendicular wall wing at a tight building corner occlude the tractor
          // entirely (school_compound) — not a penetration bug, a camera framing
          // bug; a near-overhead view has minimal vertical-wall silhouette to hide
          // behind.
          d.camera.position.set(center.x + dist * Math.sin(angleRad) * Math.cos(elevRad), center.y + dist * Math.sin(elevRad), center.z + dist * Math.cos(angleRad) * Math.cos(elevRad));
          d.camera.lookAt(center);
          d.camera.updateProjectionMatrix();
          d.player.visible = false;
          if (!d.camRig._frameObjectOrigUpdate) d.camRig._frameObjectOrigUpdate = d.camRig.update.bind(d.camRig);
          d.camRig.update = () => {};
          return { found: true, size: { x: size.x, y: size.y, z: size.z }, distance: dist };
        },
        { approachFx: -t.dir.fx, approachFz: -t.dir.fz }
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
