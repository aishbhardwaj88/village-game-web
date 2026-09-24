#!/usr/bin/env node
/**
 * Item 1b — dynamic confirmation, independent of item 1a's static audit and of
 * item 4's old (tautological) test. For every real building in the village,
 * places a tractor+trolley 15m out on each of the 4 axis directions, floors
 * the throttle straight at it, and — every fixed-dt physics step — measures
 * the TROLLEY's real oriented world footprint (its actual 3.5x2.0 bed
 * rectangle at its current yaw, measured from its own geometry, not
 * TROLLEY_COLLISION_RADIUS and not any STATIC_COLLIDERS box) against the real
 * VISUAL wall geometry near it.
 *
 * Ground truth is NOT a building's overall bounding box (getBuildingFootprints()
 * is used only to aim the approach, since a "house_compound" bbox includes its
 * whole courtyard/interior, not just its outer wall — an early version of this
 * script used that bbox as ground truth and got false "overlaps" against open
 * courtyard space nowhere near a real wall). It's the same dense, per-triangle
 * sampling of every 'plaster' mesh tools/collider-audit.js uses (the one
 * material every wall in this codebase is built with) — real wall surface
 * points, independent of STATIC_COLLIDERS.
 *
 * Physics is stepped via window.__dopahar.stepTractorTrolleyPhysics(dt) — the
 * exact vehicle.update()/resolveMove()/resolveTowedMove() sequence main.js's
 * real per-frame loop runs for a mounted tractor+trolley, just called
 * directly with a fixed dt instead of depending on real frame pacing. Nothing
 * in src/movement.js is touched or reimplemented.
 *
 * Usage: npm run build && node tools/trolley-drive-test.js
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5199;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;

// Footprint entries that are real named groups but not solid buildings (used
// only to pick approach-target aim points — lanes/signboards/goods/roofs
// aren't things a trolley could visually end up "inside").
const EXCLUDE_NAMES = new Set([
  'lane', 'bazaar_lane', 'temple_lane',
  'wheat_sack_pile', 'general_store_goods',
  'shop_signboards', 'bazaar_signboards', 'chowk_tea_sign',
  'shop_roofs', 'shop_counters_and_posts',
]);

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

    const footprints = await page.evaluate((exclude) => window.__dopahar.getBuildingFootprints().filter((f) => !exclude.includes(f.name) && f.root !== 'background_houses'), [...EXCLUDE_NAMES]);

    console.log(`\n${footprints.length} building targets (after excluding lanes/signboards/props/background houses):`);
    for (const f of footprints) console.log(`  - ${f.root}/${f.name}: X[${f.minX.toFixed(1)},${f.maxX.toFixed(1)}] Z[${f.minZ.toFixed(1)},${f.maxZ.toFixed(1)}]`);

    // Dense real wall-surface points — same sampling as tools/collider-audit.js
    // (every 'plaster' mesh, triangle-interpolated at ~0.2m spacing) — computed
    // once, reused as the ground truth for every run below.
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
      return points; // flat [x0,z0,x1,z1,...]
    });
    console.log(`${wallPoints.length / 2} real wall-surface sample points.`);

    // forward = (-sin(yaw), 0, -cos(yaw)) — this game's convention (src/main.js,
    // confirmed via src/vehicles.js Vehicle.update()). Start on the +X side of the
    // target (dx=1) means the target is toward -X, so the tractor must FACE -X,
    // i.e. forward=(-1,0,0) => yaw=+PI/2 (and so on for the other 3 — each dir's
    // yaw here faces the OPPOSITE of its own dx/dz, back toward the target).
    const DIRS = [
      { name: '+X', dx: 1, dz: 0, yaw: Math.PI / 2 },
      { name: '-X', dx: -1, dz: 0, yaw: -Math.PI / 2 },
      { name: '+Z', dx: 0, dz: 1, yaw: 0 },
      { name: '-Z', dx: 0, dz: -1, yaw: Math.PI },
    ];
    const APPROACH_GAP = 15;
    const NEARBY_MARGIN = 25; // pre-filter wallPoints to this margin around each target bbox
    const DT = 1 / 60;
    const MAX_FRAMES = 1800; // 30s sim time — generous given the tractor's own slow accel

    const failures = [];
    let runCount = 0;

    for (const target of footprints) {
      const cx = (target.minX + target.maxX) / 2;
      const cz = (target.minZ + target.maxZ) / 2;
      const hx = (target.maxX - target.minX) / 2;
      const hz = (target.maxZ - target.minZ) / 2;

      // Pre-filter (in Node, once per target — not per frame) to nearby wall points.
      const nearbyPoints = [];
      const nMinX = target.minX - NEARBY_MARGIN, nMaxX = target.maxX + NEARBY_MARGIN;
      const nMinZ = target.minZ - NEARBY_MARGIN, nMaxZ = target.maxZ + NEARBY_MARGIN;
      for (let i = 0; i < wallPoints.length; i += 2) {
        const x = wallPoints[i], z = wallPoints[i + 1];
        if (x >= nMinX && x <= nMaxX && z >= nMinZ && z <= nMaxZ) nearbyPoints.push(x, z);
      }

      for (const dir of DIRS) {
        runCount++;
        const startX = cx + dir.dx * (hx + APPROACH_GAP);
        const startZ = cz + dir.dz * (hz + APPROACH_GAP);

        const result = await page.evaluate(
          ({ startX, startZ, yaw, nearbyPoints, dt, maxFrames }) => {
            const d = window.__dopahar;

            // Real oriented local footprint of the trolley bed, measured from
            // its own geometry once (zero its yaw, measure the resulting
            // axis-aligned box, restore yaw — see tools/trolley-drive-test.js
            // header comment).
            const trolley = d.vehicles.find((v) => v.preset.kind === 'tractor').trolley;
            const g = trolley.group;
            const savedYaw = g.rotation.y;
            const savedPos = g.position.clone();
            g.rotation.y = 0;
            g.updateWorldMatrix(true, true);
            const localBox = new d.Box3().setFromObject(g, true);
            g.rotation.y = savedYaw;
            g.position.copy(savedPos);
            g.updateWorldMatrix(true, true);
            const halfX = (localBox.max.x - localBox.min.x) / 2;
            const halfZ = (localBox.max.z - localBox.min.z) / 2;
            const offX = (localBox.max.x + localBox.min.x) / 2 - savedPos.x;
            const offZ = (localBox.max.z + localBox.min.z) / 2 - savedPos.z;

            d.teleportVehicle('tractor', startX, startZ, yaw);

            // Guard against a bad spawn choice, not a real bug: this script
            // picks a straight approach line from the target's bbox centre
            // along one raw axis, which can occasionally cross close to a
            // DIFFERENT, unrelated building before ever reaching the real
            // target (confirmed case: general_store's +Z line passes near
            // house_compound's own wall). If the trolley is already inside
            // real geometry at frame 0 — before resolveMove/resolveCollisions
            // has run even once — that's this test's approach line, not a
            // collision-system failure.
            const spawnClearance = d.minDistanceToColliders({ x: trolley.group.position.x, z: trolley.group.position.z }, 0.01);
            if (spawnClearance < 1.8) {
              return { skipped: true, reason: `spawn point already ${spawnClearance.toFixed(2)}m from unrelated geometry`, frameFailures: [], finalPos: { x: trolley.group.position.x, z: trolley.group.position.z } };
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

              // Real oriented world footprint check: is any real wall-surface
              // point inside the trolley's current rotated rectangle? Inverse-
              // rotate each candidate point into the trolley's local frame
              // (R(yaw) is orthogonal, so inverse = transpose) rather than
              // computing world-space rectangle corners — cheaper per point.
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

              // Stop condition: position genuinely settled (not vehicle.speed —
              // this stripped-down physics step doesn't replicate the real per-
              // frame loop's "properlyBlocked -> speed=0" zeroing, only the
              // trolley-shortfall one, so speed alone is an unreliable signal
              // here even though it is fine in the real game).
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
          { startX, startZ, yaw: dir.yaw, nearbyPoints, dt: DT, maxFrames: MAX_FRAMES }
        );

        if (result.skipped) {
          console.log(`  [skip] ${target.root}/${target.name} from ${dir.name}: ${result.reason}`);
        } else if (result.frameFailures.length) {
          failures.push({ target: `${target.root}/${target.name}`, dir: dir.name, ...result });
        }
      }
    }

    console.log(`\n${runCount} drive-test runs (buildings x 4 directions).`);
    console.log(`\n=== FAILURES (trolley's real oriented footprint overlapped real wall geometry) ===`);
    if (failures.length === 0) {
      console.log('(none)');
    } else {
      for (const f of failures) {
        const worst = f.frameFailures.reduce((a, b) => (b.overlapM > a.overlapM ? b : a));
        const firstFrame = f.frameFailures[0].frame;
        console.log(`- approaching ${f.target} from ${f.dir}: first overlap at frame ${firstFrame}, worst ${worst.overlapM}m at frame ${worst.frame}, ${f.frameFailures.length} failing frames total, final pos (${f.finalPos.x.toFixed(2)},${f.finalPos.z.toFixed(2)})`);
      }
    }

    await browser.close();
    process.exitCode = failures.length ? 1 : 0;
  } finally {
    server.kill();
  }
}

main();
