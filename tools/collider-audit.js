#!/usr/bin/env node
/**
 * Item 1a — collider COVERAGE audit. Does NOT trust STATIC_COLLIDERS as ground
 * truth (that would be the same tautological mistake item 4's old test made —
 * checking a derived list against itself). Instead it independently measures
 * the real visual wall geometry that's actually in the merged scene (every
 * mesh whose material is 'plaster' — the one material every wall in this
 * codebase is built with, texturedWall()/texturedWallBox() or otherwise, see
 * CLAUDE.md/src/materials.js), reconstructs disjoint footprint "islands" from
 * it with grid-based XZ clustering (individual wall-segment identity is lost
 * after mergeAcrossGroups() folds everything into one mesh per material), and
 * cross-checks every occupied ~0.3m cell of that visual footprint against the
 * real STATIC_COLLIDERS box list for coverage.
 *
 * Usage: npm run build && node tools/collider-audit.js
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5196;
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
    await page.waitForTimeout(1200); // loadDeferredContent() + initStaticColliders() run inside this window

    const audit = await page.evaluate(() => {
      const d = window.__dopahar;
      const scene = d.scene;
      const colliders = d.getStaticColliders();
      const footprints = d.getBuildingFootprints();

      // 1. Collect every 'plaster' mesh's world-space XZ footprint by densely
      // sampling each triangle (not just its 3 corner vertices) — a wall is
      // typically 2 big triangles per face, so vertex-only sampling would only
      // ever mark the 4 corners of a multi-metre wall and miss a real gap
      // (missing/undersized collider) anywhere along its middle.
      const CELL = 0.3;
      const STEP = 0.2; // barycentric sample spacing, metres
      const cellKey = (cx, cz) => `${cx},${cz}`;
      const cells = new Map(); // key -> { cx, cz, wx, wz } (one representative world point)
      const p0 = new d.Vector3();
      const p1 = new d.Vector3();
      const p2 = new d.Vector3();
      const sample = new d.Vector3();
      function markCell(v) {
        const cx = Math.floor(v.x / CELL);
        const cz = Math.floor(v.z / CELL);
        const key = cellKey(cx, cz);
        if (!cells.has(key)) cells.set(key, { cx, cz, wx: v.x, wz: v.z });
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
          markCell(p0);
          markCell(p1);
          markCell(p2);
          const e1 = Math.hypot(p1.x - p0.x, p1.z - p0.z);
          const e2 = Math.hypot(p2.x - p0.x, p2.z - p0.z);
          const subdiv = Math.min(80, Math.max(1, Math.ceil(Math.max(e1, e2) / STEP)));
          for (let i = 0; i <= subdiv; i++) {
            for (let j = 0; j <= subdiv - i; j++) {
              const u = i / subdiv;
              const w = j / subdiv;
              sample.set(
                p0.x + (p1.x - p0.x) * u + (p2.x - p0.x) * w,
                0,
                p0.z + (p1.z - p0.z) * u + (p2.z - p0.z) * w
              );
              markCell(sample);
            }
          }
        }
      });

      // 2. Per-cell coverage: is this cell's world point inside any collider box
      // (padded slightly — colliders are wall-thickness boxes, vertices can sit
      // right on a face)?
      const PAD = 0.15;
      function isCovered(wx, wz) {
        for (const b of colliders) {
          if (wx >= b.minX - PAD && wx <= b.maxX + PAD && wz >= b.minZ - PAD && wz <= b.maxZ + PAD) return true;
        }
        return false;
      }
      for (const c of cells.values()) c.covered = isCovered(c.wx, c.wz);

      // 3. Connected-component clustering (4-connectivity) over ALL occupied
      // cells, to report per-island footprint + coverage; then a SEPARATE
      // clustering over only the UNCOVERED cells, to report exactly which real
      // wall-footprint islands have zero collider coverage (the bug list).
      function clusterCells(predicate) {
        const visited = new Set();
        const islands = [];
        for (const c of cells.values()) {
          if (!predicate(c)) continue;
          const key = cellKey(c.cx, c.cz);
          if (visited.has(key)) continue;
          const stack = [c];
          visited.add(key);
          const members = [];
          while (stack.length) {
            const cur = stack.pop();
            members.push(cur);
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nk = cellKey(cur.cx + dx, cur.cz + dz);
              if (visited.has(nk)) continue;
              const n = cells.get(nk);
              if (n && predicate(n)) {
                visited.add(nk);
                stack.push(n);
              }
            }
          }
          const minX = Math.min(...members.map((m) => m.wx));
          const maxX = Math.max(...members.map((m) => m.wx));
          const minZ = Math.min(...members.map((m) => m.wz));
          const maxZ = Math.max(...members.map((m) => m.wz));
          islands.push({ cellCount: members.length, minX, maxX, minZ, maxZ, centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2 });
        }
        return islands;
      }

      function nearestBuildingName(cx, cz) {
        let best = null;
        let bestDist = Infinity;
        for (const f of footprints) {
          const fcx = (f.minX + f.maxX) / 2;
          const fcz = (f.minZ + f.maxZ) / 2;
          const dist = Math.hypot(cx - fcx, cz - fcz);
          if (dist < bestDist) {
            bestDist = dist;
            best = f.name;
          }
        }
        return best ? `${best} (${bestDist.toFixed(1)}m away)` : 'unknown';
      }

      const allIslands = clusterCells(() => true).map((isl) => ({
        ...isl,
        fullyCovered: false, // filled below
        nearBuilding: nearestBuildingName(isl.centerX, isl.centerZ),
      }));
      const uncoveredIslands = clusterCells((c) => !c.covered).map((isl) => ({
        ...isl,
        nearBuilding: nearestBuildingName(isl.centerX, isl.centerZ),
      }));

      // fullyCovered = every cell within this island's bbox range that's occupied is covered
      for (const isl of allIslands) {
        let anyUncovered = false;
        for (const c of cells.values()) {
          if (c.wx >= isl.minX - 0.01 && c.wx <= isl.maxX + 0.01 && c.wz >= isl.minZ - 0.01 && c.wz <= isl.maxZ + 0.01 && !c.covered) {
            anyUncovered = true;
            break;
          }
        }
        isl.fullyCovered = !anyUncovered;
      }

      return {
        totalOccupiedCells: cells.size,
        colliderCount: colliders.length,
        buildingFootprintCount: footprints.length,
        allIslands,
        uncoveredIslands,
      };
    });

    console.log(`\nstatic collider count: ${audit.colliderCount}`);
    console.log(`building footprints captured: ${audit.buildingFootprintCount}`);
    console.log(`occupied 0.3m 'plaster' cells: ${audit.totalOccupiedCells}`);

    console.log('\n=== TABLE: every visual wall-footprint island vs. collider coverage ===');
    console.log('near building'.padEnd(38), 'footprint (X,Z)'.padEnd(38), 'cells', 'covered');
    for (const isl of audit.allIslands.sort((a, b) => b.cellCount - a.cellCount)) {
      const fp = `[${isl.minX.toFixed(1)},${isl.maxX.toFixed(1)}] x [${isl.minZ.toFixed(1)},${isl.maxZ.toFixed(1)}]`;
      console.log(isl.nearBuilding.padEnd(38), fp.padEnd(38), String(isl.cellCount).padEnd(5), isl.fullyCovered ? 'yes' : 'NO');
    }

    console.log('\n=== MISSING COLLIDER COVERAGE (the bug) ===');
    if (audit.uncoveredIslands.length === 0) {
      console.log('(none — every visual plaster-wall footprint cell overlaps a STATIC_COLLIDERS box)');
    } else {
      for (const isl of audit.uncoveredIslands.sort((a, b) => b.cellCount - a.cellCount)) {
        const fp = `[${isl.minX.toFixed(2)},${isl.maxX.toFixed(2)}] x [${isl.minZ.toFixed(2)},${isl.maxZ.toFixed(2)}]`;
        console.log(`- near ${isl.nearBuilding}: footprint ${fp}, ${isl.cellCount} uncovered cells`);
      }
    }

    await browser.close();
  } finally {
    server.kill();
  }
}

main();
