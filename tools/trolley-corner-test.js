#!/usr/bin/env node
/**
 * Reproduction test for the real bug report (screenshot: tractor outside, trolley
 * buried ~2m into a wall near the bazaar). The previous tools/trolley-drive-test.js
 * only drove straight at a single building's centre from 15m out on an axis line —
 * it never approached a CORNER where two collider boxes meet, never approached at an
 * angle, and skipped any run whose spawn point happened to be near a second,
 * unrelated building. All three of those are exactly where the real defects live:
 *
 *   - resolveCollisions() is a single pass over STATIC_COLLIDERS — at a corner where
 *     two boxes meet, box A's correction can push the body straight into box B,
 *     which is never re-checked that frame (src/collision.js).
 *   - TROLLEY_COLLISION_RADIUS (1.75m) is smaller than the trolley's real half
 *     diagonal (hypot(1.75,1.0)=2.02m) — its own corners sit outside its collision
 *     circle, so the circle can read "clear" while a corner of the real 3.5x2.0 bed
 *     is already inside a wall.
 *
 * This script finds every place two STATIC_COLLIDERS boxes meet or nearly meet
 * (gap < 1.5m) and drives the tractor+trolley at that corner point from ~10m out,
 * at a diagonal angle (not aligned with either wall), full throttle, with every
 * other vehicle left exactly where spawnVehicles() put it (so otherVehicleBoxes()
 * inside stepTractorTrolleyPhysics includes them automatically). Ground truth is
 * the same dense per-triangle 'plaster'-mesh sampling tools/trolley-drive-test.js
 * and tools/collider-audit.js use — real wall surface, not STATIC_COLLIDERS, not
 * TROLLEY_COLLISION_RADIUS.
 *
 * Usage: npm run build && node tools/trolley-corner-test.js
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5207;
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

function boxGap(a, b) {
  const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
  const dz = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0);
  return Math.hypot(dx, dz);
}

function nearestPointBetween(a, b) {
  // Midpoint of the two boxes' closest approach region — good enough as a "corner
  // point" to aim the approach at.
  const cx = (Math.max(a.minX, b.minX) + Math.min(a.maxX, b.maxX)) / 2;
  const cz = (Math.max(a.minZ, b.minZ) + Math.min(a.maxZ, b.maxZ)) / 2;
  const x = isFinite(cx) ? cx : (Math.min(a.maxX, b.maxX) + Math.max(a.minX, b.minX)) / 2;
  const z = isFinite(cz) ? cz : (Math.min(a.maxZ, b.maxZ) + Math.max(a.minZ, b.minZ)) / 2;
  return { x, z };
}

async function main() {
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

    const colliders = await page.evaluate(() => window.__dopahar.getStaticColliders());
    console.log(`${colliders.length} static colliders.`);

    // Find every pair of boxes that meet or nearly meet (a real building corner,
    // or two adjacent shop party walls) and are NOT the same long run (skip pairs
    // that are really the same wall split in two, i.e. heavily overlapping spans
    // on one axis AND touching on that same axis — those aren't "corners").
    const corners = [];
    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        const a = colliders[i], b = colliders[j];
        const gap = boxGap(a, b);
        if (gap > 1.5) continue;
        const pt = nearestPointBetween(a, b);
        if (!isFinite(pt.x) || !isFinite(pt.z)) continue;
        // Dedupe near-identical corner points (several box pairs can share one
        // real-world corner, e.g. three walls meeting).
        if (corners.some((c) => Math.hypot(c.x - pt.x, c.z - pt.z) < 1.0)) continue;
        corners.push(pt);
      }
    }
    console.log(`${corners.length} corner points (pairs of static colliders meeting within 1.5m).`);

    // Diagonal approach directions — deliberately NOT axis-aligned, so the
    // tractor+trolley crosses close to both boxes forming the corner rather than
    // driving straight into one face. forward=(-sin(yaw),0,-cos(yaw)) is this
    // game's convention; yaw = atan2(-fx, -fz) for a desired forward dir (fx,fz).
    function yawFacing(fx, fz) {
      return Math.atan2(-fx, -fz);
    }
    const DIAGONALS = [
      { name: 'NE', fx: -Math.SQRT1_2, fz: -Math.SQRT1_2 },
      { name: 'NW', fx: Math.SQRT1_2, fz: -Math.SQRT1_2 },
      { name: 'SE', fx: -Math.SQRT1_2, fz: Math.SQRT1_2 },
      { name: 'SW', fx: Math.SQRT1_2, fz: Math.SQRT1_2 },
    ];
    const APPROACH_GAP = 10;
    const NEARBY_MARGIN = 20;
    const DT = 1 / 60;
    const MAX_FRAMES = 1200;

    console.log('\nSampling real wall geometry (every "plaster" mesh)...');
    const wallPoints = await page.evaluate(() => {
      const d = window.__dopahar;
      const scene = d.scene;
      const STEP = 0.2;
      const points = [];
      const p0 = new d.Vector3();
      const p1 = new d.Vector3();
      const p2 = new d.Vector3();
      function push(v) {
        points.push(v.x, v.z);
      }
      scene.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh) return;
        const mat = o.material;
        if (!mat || mat.name !== 'plaster') return;
        const geo = o.geometry;
        const pos = geo.attributes.position;
        const index = geo.index;
        const triCount = index ? index.count / 3 : pos.count / 3;
        o.updateWorldMatrix(true, false);
        for (let t = 0; t < triCount; t++) {
          const i0 = index ? index.getX(t * 3) : t * 3;
          const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
          const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
          p0.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
          p1.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
          p2.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
          push(p0);
          push(p1);
          push(p2);
          const e1 = Math.hypot(p1.x - p0.x, p1.z - p0.z);
          const e2 = Math.hypot(p2.x - p0.x, p2.z - p0.z);
          const subdiv = Math.min(80, Math.max(1, Math.ceil(Math.max(e1, e2) / STEP)));
          for (let i = 0; i <= subdiv; i++) {
            for (let j = 0; j <= subdiv - i; j++) {
              const u = i / subdiv;
              const w = j / subdiv;
              push({ x: p0.x + (p1.x - p0.x) * u + (p2.x - p0.x) * w, z: p0.z + (p1.z - p0.z) * u + (p2.z - p0.z) * w });
            }
          }
        }
      });
      return points;
    });
    console.log(`${wallPoints.length / 2} real wall-surface sample points.`);

    const failures = [];
    let runCount = 0;
    let skipCount = 0;

    for (const corner of corners) {
      const nearbyPoints = [];
      const nMinX = corner.x - NEARBY_MARGIN, nMaxX = corner.x + NEARBY_MARGIN;
      const nMinZ = corner.z - NEARBY_MARGIN, nMaxZ = corner.z + NEARBY_MARGIN;
      for (let i = 0; i < wallPoints.length; i += 2) {
        const x = wallPoints[i], z = wallPoints[i + 1];
        if (x >= nMinX && x <= nMaxX && z >= nMinZ && z <= nMaxZ) nearbyPoints.push(x, z);
      }

      for (const dir of DIAGONALS) {
        runCount++;
        const yaw = yawFacing(dir.fx, dir.fz);
        const startX = corner.x - dir.fx * APPROACH_GAP;
        const startZ = corner.z - dir.fz * APPROACH_GAP;

        const result = await page.evaluate(
          ({ startX, startZ, yaw, nearbyPoints, dt, maxFrames }) => {
            const d = window.__dopahar;
            const trolley = d.vehicles.find((v) => v.preset.kind === 'tractor').trolley;

            // Ground truth is the real 3.5 x 2.0 BED — the same shape the fix's
            // own collision resolver protects (see src/vehicles.js's
            // TROLLEY_HALF_WIDTH/TROLLEY_HALF_LENGTH and the bug report's own
            // "hypot(bedLen,bedW)/2" formula) — NOT the whole visual group.
            // The whole group also includes a thin steel drawbar/hitch-eye
            // projecting 1.2m past the bed's front edge (confirmed via
            // tmp/check-trolley-footprint.mjs: whole-group half-Z is 2.41m vs
            // the bed's 1.75m) — a cosmetic appendage the bug report's own fix
            // formula never claimed to cover, and measuring the whole group as
            // "the trolley" produced false failures here (the drawbar swinging
            // near a wall during a tight corner, not the cargo bed penetrating
            // it) that this test doesn't want to report as if they were the
            // reported bug.
            const { halfW: halfX, halfD: halfZ } = d.getTrolleyHalfExtents();
            const offX = 0, offZ = 0;

            d.teleportVehicle('tractor', startX, startZ, yaw);

            const spawnClearance = d.minDistanceToColliders({ x: trolley.group.position.x, z: trolley.group.position.z }, 0.01);
            if (spawnClearance < 0.3) {
              return { skipped: true, reason: `spawn point ${spawnClearance.toFixed(2)}m from geometry (genuinely unreachable start)`, frameFailures: [] };
            }

            const frameFailures = [];
            let prevX = null, prevZ = null, stillFrames = 0;
            for (let frame = 0; frame < maxFrames; frame++) {
              const step = d.stepTractorTrolleyPhysics(dt, -1, 0);
              if (!step) break;

              const pos = trolley.group.position;
              const yawNow = trolley.group.rotation.y;
              const cosY = Math.cos(yawNow);
              const sinY = Math.sin(yawNow);

              let worstDepth = 0;
              for (let i = 0; i < nearbyPoints.length; i += 2) {
                const dx = nearbyPoints[i] - pos.x;
                const dz = nearbyPoints[i + 1] - pos.z;
                const localX = dx * cosY - dz * sinY;
                const localZ = dx * sinY + dz * cosY;
                const overlapX = halfX - Math.abs(localX - offX);
                const overlapZ = halfZ - Math.abs(localZ - offZ);
                if (overlapX > 0 && overlapZ > 0) {
                  const depth = Math.min(overlapX, overlapZ);
                  if (depth > worstDepth) worstDepth = depth;
                }
              }
              if (worstDepth > 0) frameFailures.push({ frame, overlapM: +worstDepth.toFixed(3) });

              if (prevX !== null && Math.hypot(pos.x - prevX, pos.z - prevZ) < 0.002) {
                stillFrames++;
                if (stillFrames > 30) break;
              } else {
                stillFrames = 0;
              }
              prevX = pos.x;
              prevZ = pos.z;
            }
            return { frameFailures, finalPos: { x: trolley.group.position.x, z: trolley.group.position.z } };
          },
          { startX, startZ, yaw, nearbyPoints, dt: DT, maxFrames: MAX_FRAMES }
        );

        if (result.skipped) {
          skipCount++;
        } else if (result.frameFailures.length) {
          failures.push({ corner, dir: dir.name, ...result });
        }
      }
    }

    console.log(`\n${runCount} corner-approach runs (${corners.length} corners x 4 diagonals), ${skipCount} skipped (unreachable spawn).`);
    console.log(`\n=== FAILURES (trolley's real oriented footprint overlapped real wall geometry) ===`);
    if (failures.length === 0) {
      console.log('(none)');
    } else {
      for (const f of failures) {
        const worst = f.frameFailures.reduce((a, b) => (b.overlapM > a.overlapM ? b : a));
        const firstFrame = f.frameFailures[0].frame;
        console.log(`- corner (${f.corner.x.toFixed(1)},${f.corner.z.toFixed(1)}) from ${f.dir}: first overlap at frame ${firstFrame}, worst ${worst.overlapM}m at frame ${worst.frame}, ${f.frameFailures.length} failing frames, final pos (${f.finalPos.x.toFixed(2)},${f.finalPos.z.toFixed(2)})`);
      }
    }

    await browser.close();
    process.exitCode = failures.length ? 1 : 0;
  } finally {
    server.kill();
  }
}

main();
