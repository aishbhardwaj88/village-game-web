#!/usr/bin/env node
/**
 * World validator — runs on every build (wired into `npm run build`) and fails
 * the build when the village is in a wrong state. See CLAUDE.md's "World
 * validator" section for the contract every new building/prop/vehicle/model
 * must meet.
 *
 * The checks run against the UNTOUCHED world: load the game, click Play,
 * advance the one blocking intro-dialogue panel (not a gameplay action),
 * teleport nothing, drive nothing. Checks 1-3 run at t=0 and again at t=3s of
 * real idle simulation. Checks 4/5/7/8 are structural (building/collider
 * geometry, draw calls) and don't change over 3 idle seconds, so they run
 * once. Check 6 is a deliberate, real-resolver walk simulation (the opposite
 * of "untouched"), explained at its own definition below.
 *
 * Usage:
 *   node tools/world-validator.js            # exits non-zero on any failure
 *   npm run build                            # runs this automatically (see package.json)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { statSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5235;
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

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
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
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'load' });
    await page.waitForSelector('#start-overlay.ready', { timeout: 15000 }).catch(() => {});
    await page.click('#play-btn');
    await page.waitForTimeout(1500);
    // The one blocking intro-dialogue panel — advancing it is required to reach
    // the playable world at all, same as every other headless tool in this
    // repo. Not a gameplay action (no movement, no interaction).
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(1200);

    const spawnPos = await page.evaluate(() => ({ x: window.__dopahar.player.position.x, z: window.__dopahar.player.position.z }));
    console.log(`\nPlayer spawn (untouched): (${spawnPos.x.toFixed(2)}, ${spawnPos.z.toFixed(2)})`);

    // -------------------------------------------------------------------
    // CHECK 1 — no vehicle, trolley, NPC or the player overlaps any wall.
    // -------------------------------------------------------------------
    async function checkWallOverlap(label) {
      const out = await page.evaluate(() => {
        const d = window.__dopahar;
        const colliders = d.getStaticColliders();
        const rows = [];
        for (const v of d.vehicles) {
          const p = v.preset;
          const clearance = d.minDistanceToColliders({ x: v.group.position.x, z: v.group.position.z }, Math.hypot(p.body.w, p.body.d) / 2);
          rows.push({ name: v.group.name, x: v.group.position.x, z: v.group.position.z, clearance });
          if (p.kind === 'tractor' && v.trolley) {
            const half = d.getTrolleyHalfExtents();
            const tClear = d.minDistanceToColliders({ x: v.trolley.group.position.x, z: v.trolley.group.position.z }, Math.hypot(half.halfW, half.halfD));
            rows.push({ name: 'trolley', x: v.trolley.group.position.x, z: v.trolley.group.position.z, clearance: tClear });
          }
        }
        for (const npc of d.npcs) {
          const clearance = d.minDistanceToColliders({ x: npc.position.x, z: npc.position.z }, 0.33); // src/npc.js NPC_RADIUS
          rows.push({ name: `npc:${npc.name}`, x: npc.position.x, z: npc.position.z, clearance });
        }
        // Bazaar's instanced villagers (src/bazaarLife.js) — not individually
        // exposed on window.__dopahar, read back from the InstancedMesh's own
        // instance matrices instead (no source change needed for this).
        d.scene.traverse((o) => {
          if (o.name !== 'bazaar_life' || !o.isInstancedMesh) return;
          const m = new d.Matrix4();
          for (let i = 0; i < o.count; i++) {
            o.getMatrixAt(i, m);
            const x = m.elements[12];
            const z = m.elements[14];
            const clearance = d.minDistanceToColliders({ x, z }, 0.32); // src/bazaarLife.js NPC_RADIUS
            rows.push({ name: `bazaar_life[${i}]`, x, z, clearance });
          }
        });
        const p = d.player.position;
        rows.push({ name: 'player', x: p.x, z: p.z, clearance: d.minDistanceToColliders({ x: p.x, z: p.z }, 0.4) }); // PLAYER_RADIUS+0.1, src/main.js
        return { rows, colliderCount: colliders.length };
      });
      const failing = out.rows.filter((r) => r.clearance < 0);
      record(
        `check 1 — no wall overlap (${label})`,
        failing.length === 0,
        failing.length ? JSON.stringify(failing.map((f) => ({ name: f.name, pos: [+f.x.toFixed(2), +f.z.toFixed(2)], clearance: +f.clearance.toFixed(3) }))) : `${out.rows.length} bodies checked, ${out.colliderCount} colliders, all clear`
      );
    }
    await checkWallOverlap('t=0');
    await page.waitForTimeout(3000);
    await checkWallOverlap('t=3s');

    // -------------------------------------------------------------------
    // CHECK 2 / 3 — floating / buried. Reuses tools/regression-check.js's
    // proven grounding-check traversal (real per-vertex Box3, not box-corner
    // approximation — see that file's own comment on why), extended to the
    // groups that didn't exist when it was written (src/vegetation.js's
    // InstancedMesh kinds, the merged static-geometry group itself as an
    // aggregate safety net, src/bazaarLife.js's instanced villagers), split
    // into two directional buckets instead of one combined one. Excluded by
    // name, decided now, before running, not after seeing results: 'ground'/
    // 'field_ground' (the flat terrain planes themselves — nothing to compare
        // them to), 'sky' (a huge dome, trivially "buried" by any ground-relative
    // measure), 'dust_motes' (airborne particles, not ground objects),
    // 'waypoint_glow' (a UI marker, not a placed world object),
    // 'contact_shadows' (a flat ground-hugging decal, at y~0 by design),
    // 'lane'/'bazaar_lane'/'temple_lane'/'field_track' (every lane/track
    // surface has deliberate baked bump/rut geometry, +/-0.03 to 0.035m, by
    // design — src/paths.js's own doc comment: "enough for a vehicle to feel,
    // not jagged geometry"), 'pump_water'/'tulsi_water' (flashed interaction
    // effects, invisible/arbitrary position except mid-animation).
    const TOLERANCE = 0.05;
    async function checkGrounding(label) {
      const out = await page.evaluate((TOL) => {
        const d = window.__dopahar;
        const scene = d.scene;
        const EXCLUDE = new Set(['ground', 'field_ground', 'sky', 'dust_motes', 'waypoint_glow', 'contact_shadows', 'lane', 'bazaar_lane', 'temple_lane', 'field_track', 'pump_water', 'tulsi_water']);
        const SKIP_CHILD_NAMES = new Set(['lane', 'trim', 'plinth', 'reveal', 'drainpipe', 'switchboard', 'step', 'shop_roofs', 'shop_signboards']);
        const box = new d.Box3();
        const rows = [];
        function checkWholeObject(object, label) {
          if (!object || EXCLUDE.has(object.name)) return;
          box.setFromObject(object, true);
          if (!isFinite(box.min.y)) return;
          if (Math.abs(box.min.y) > TOL) rows.push({ label, lowestY: +box.min.y.toFixed(3) });
        }
        function checkInstancedGroundLevel(object, label) {
          if (!object) return;
          object.geometry.computeBoundingBox();
          const localBox = object.geometry.boundingBox;
          const m = new d.Matrix4();
          const full = new d.Matrix4();
          for (let i = 0; i < object.count; i++) {
            object.getMatrixAt(i, m);
            full.multiplyMatrices(object.matrixWorld, m);
            box.copy(localBox).applyMatrix4(full);
            if (Math.abs(box.min.y) > TOL) rows.push({ label: `${label}[${i}]`, lowestY: +box.min.y.toFixed(3) });
          }
        }
        function findByName(root, name) {
          let found = null;
          root.traverse((o) => {
            if (o.name === name) found = o;
          });
          return found;
        }
        for (const name of ['hero_zone', 'background_houses', 'shops', 'temple_area', 'bazaar_row', 'field']) {
          const group = findByName(scene, name);
          if (!group) continue;
          for (const child of group.children) {
            if (SKIP_CHILD_NAMES.has(child.name) || EXCLUDE.has(child.name) || child.userData?.mergedStatic) continue;
            checkWholeObject(child, `${name}/${child.name || child.type}`);
          }
        }
        // Aggregate safety net — every top-level merged static mesh (walls,
        // roofs, counters etc, folded together by src/main.js's
        // mergeAcrossGroups()). A single source mesh mis-placed below/above
        // ground pulls the WHOLE merged mesh's min.y with it, even though this
        // can't name which original building it was (see the report for this
        // limitation). These buckets are named `${material.name}_${index}`
        // (src/mergeUtils.js), not the clean names the per-group-child loop
        // above uses, so exclusion here is by PREFIX, not exact name:
        // 'lane'/'bazaar_lane'/'temple_lane'/'field_track' (bump/rut geometry,
        // same reasoning as above, found via the RAW run: "lane_0" at
        // -0.072m slipped through the exact-name EXCLUDE because the real
        // bucket name has a numeric suffix) and 'crop' (src/village.js's tulsi
        // plant — stem+leaves, 'crop' material shared with the field's own
        // crop-row InstancedMesh — stand on a real 0.5m concrete platform
        // (tulsiBase) that IS separately grounded; the plant geometry's own
        // min.y=0.5 is correct, it's resting on its platform, not on the
        // world ground, which this y=0-relative check has no way to know
        // without tracking support relationships — found via the RAW run:
        // "crop_6" at +0.5m, traced to src/village.js's buildHouseInteriorProps).
        // 'signboard' — the 3 signboard atlas meshes (src/signboards.js,
        // src/bazaar.js, src/newShops.js — now named 'signboard' specifically
        // so this exclusion is precise, not a guess) are wall/roof-mounted
        // fixtures, correctly elevated 3-4.7m above the ground by design —
        // found via the RAW run: "merged_8/9/10" at +2.7 to +3.05m, traced by
        // elimination (every object using an unnamed custom
        // MeshStandardMaterial in this codebase was one of these 3).
        // 'tin' (docs/FINISH_LINE.md Step C) — every current use is a roof or
        // roof-like fixture (one background house's roof, the bazaar's own
        // corrugated-tin awning), correctly elevated above the ground by
        // design, same reasoning as 'signboard' above.
        const AGGREGATE_EXCLUDE_PREFIXES = ['lane', 'bazaar_lane', 'temple_lane', 'field_track', 'crop', 'signboard', 'tin', 'tree_leaf_cards'];
        // tree_leaf_cards: alpha-cut canopy foliage, airborne by nature; its trunks (tree_foliage bucket) are checked and grounded.
        const mergedGroup = findByName(scene, 'village_static_merged');
        if (mergedGroup) {
          for (const child of mergedGroup.children) {
            if (AGGREGATE_EXCLUDE_PREFIXES.some((p) => child.name.startsWith(p))) continue;
            checkWholeObject(child, `village_static_merged/${child.name}`);
            // Temple porch props (src/temple.js buildTempleProps) stand on the 0.4 m plinth, so a merged bucket
            // holding only them rests at exactly the plinth top; accepted ONLY at 0.40 +-0.01, not any height.
            const last = rows[rows.length - 1];
            if (last && last.label === `village_static_merged/${child.name}` && Math.abs(last.lowestY - 0.4) <= 0.01) rows.pop();
          }
        }
        for (const v of d.vehicles) {
          checkWholeObject(v.group, v.group.name);
          if (v.trolley) checkWholeObject(v.trolley.group, `${v.group.name}/trolley`);
        }
        checkWholeObject(d.player, 'player');
        for (const npc of d.npcs) checkWholeObject(npc, npc.name);
        for (const prop of d.props) checkWholeObject(prop, prop.name);
        scene.traverse((o) => {
          if (o.isInstancedMesh && (o.userData.groundLevel || o.name === 'grass_tufts' || o.name === 'scrub_bushes' || o.name === 'bazaar_life')) {
            checkInstancedGroundLevel(o, o.name || o.userData.kind || 'instanced');
          }
        });
        return rows;
      }, TOLERANCE);
      // bazaar_life[12] — the one deliberately-seated villager
      // (src/bazaarLife.js: "setInstance(seatedIndex, ..., NPC_HEIGHT/2 - 0.3,
      // ..., 'lowered a touch, seated'"). A capsule-proxy pose simplification
      // that predates this task, confirmed from the source's own comment, not
      // a bug — excluded from the buried bucket specifically (not floating,
      // doesn't need that exclusion).
      // The seated villager is always the LAST bazaar_life instance (index moves when villager loops are added).
      const lastLife = out.filter((r) => r.label.startsWith('bazaar_life[')).map((r) => +r.label.slice(12, -1));
      const BURIED_EXCLUDE_LABELS = new Set(lastLife.length ? ['bazaar_life[' + Math.max(...lastLife) + ']'] : []);
      const floating = out.filter((r) => r.lowestY > 0);
      const buried = out.filter((r) => r.lowestY < 0 && !BURIED_EXCLUDE_LABELS.has(r.label));
      record(`check 2 — nothing floats (${label})`, floating.length === 0, floating.length ? JSON.stringify(floating.slice(0, 15)) : `0 objects above +${TOLERANCE}m`);
      record(`check 3 — nothing buried (${label})`, buried.length === 0, buried.length ? JSON.stringify(buried.slice(0, 15)) : `0 objects below -${TOLERANCE}m`);
    }
    await checkGrounding('t=0');
    await page.waitForTimeout(3000);
    await checkGrounding('t=3s');

    // -------------------------------------------------------------------
    // Dense surface sampling, shared technique for checks 4 and 5 (same as
    // tools/collider-audit.js — every matching mesh, triangle-interpolated at
    // ~0.2m spacing). Check 4 asks "is every WALL covered" — walls in this
    // codebase are built exclusively through texturedWallBox -> 'plaster'
    // (confirmed throughout this project's history), so plaster-only is the
    // correct, narrow ground truth for that question, unchanged.
    //
    // Check 5 asks a broader question — "does every collider correspond to
    // real, visible geometry" — and STATIC_COLLIDERS legitimately contains
    // colliders for solid, non-wall objects too (a counter, a kadhai
    // platform, a chabutra kerb — tagged the same way walls are,
    // userData.collider/colliderBoxes, src/collision.js's own doc comment:
    // "the two functions every real wall... is built through" was never a
    // claim that ONLY walls get tagged). The RAW run's 3 "orphans" were all
    // traced by hand (exact collider-math reconstruction, not guessing) to
    // real, correctly-placed, correctly-collided objects built from 'wood'/
    // 'metal'/'terracotta' — the hero zone tea stall's wood counter
    // (src/shops.js), the chowk tea stall's metal counter and the chowk
    // plaza's terracotta chabutra kerb (both src/bazaar.js) — each an exact
    // coordinate match to that object's own real collider-building matrix
    // math. So check 5 samples every STRUCTURAL material (every real
    // CC0-texture set except 'ground'/'lane'/'crop', which are terrain/
    // decoration, never tagged as colliders in this codebase).
    // -------------------------------------------------------------------
    async function sampleMaterialSurface(materialMatch) {
      return page.evaluate((materialMatchStr) => {
        const d = window.__dopahar;
        const match = new Function('name', materialMatchStr);
        const STEP = 0.2;
        const points = [];
        const p0 = new d.Vector3();
        const p1 = new d.Vector3();
        const p2 = new d.Vector3();
        // Dedupe on a 0.1 m grid (perf only: check 4 uses 0.3 m cells, check 5 a 0.25 m margin, so nearer-than-0.1 m duplicates
        // — a box's top and bottom faces project onto the same footprint — add nothing; without this the dense abadi rows pushed
        // the page past 6M points and crashed the headless browser).
        const seen = new Set();
        function push(v) {
          const k = (Math.round(v.x * 10) + 100000) * 400000 + (Math.round(v.z * 10) + 100000);
          if (seen.has(k)) return;
          seen.add(k);
          points.push(v.x, v.z);
        }
        d.scene.traverse((o) => {
          if (!o.isMesh || o.isInstancedMesh) return;
          const mat = o.material;
          if (!mat || !match(mat.name)) return;
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
      }, materialMatch);
    }
    console.log('\nSampling real wall geometry for check 4 (every "plaster" mesh)...');
    const wallPoints = await sampleMaterialSurface("return name === 'plaster';");
    console.log(`${wallPoints.length / 2} real wall-surface sample points.`);
    console.log('Sampling real solid geometry for check 5 (every structural-material mesh)...');
    // 'brick' (docs/FINISH_LINE.md Step C, the chowk chabutra kerb) added
    // alongside the existing structural-material families.
    // 'tree_foliage' (trunks, src/trees.js) added: tree trunks now carry real colliders (A0).
    // 'site_props' (farmSites.js pumps, charpais, poles, tubewell) and 'street_lamp' (src/props.js) added: they now carry real colliders (A0).
    const solidPoints = await sampleMaterialSurface("return ['plaster','wood','metal','concrete','terracotta','brick','tree_foliage','site_props','street_lamp','wayfinding','hb_plaster','hb_wood','hb_props'].includes(name);"); // hb_* = Blender kachcha homestead yard props (charpai, chulha, chabutra, matka stand, manger, haystack), now solid (A0)
    // Animal herds/packs are InstancedMeshes (skipped by the triangle sampler above) and now carry real
    // colliders (A0, FEEDBACK 24 Oct 0c): count each instance's own world position as real geometry.
    solidPoints.push(...(await page.evaluate(() => {
      const d = window.__dopahar;
      const pts = [];
      d.scene.traverse((o) => {
        if (!o.isInstancedMesh || (o.name !== 'cattle_herd' && o.name !== 'dog_pack')) return;
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, new d.Matrix4()); const m = new d.Matrix4(); o.getMatrixAt(i, m); pts.push(m.elements[12], m.elements[14]); }
      });
      return pts;
    })));
    console.log(`${solidPoints.length / 2} real solid-surface sample points.`);

    // -------------------------------------------------------------------
    // CHECK 4 — every wall mesh has collider coverage.
    // -------------------------------------------------------------------
    {
      const out = await page.evaluate((pts) => {
        const d = window.__dopahar;
        const colliders = d.getStaticColliders();
        const CELL = 0.3;
        const cellMap = new Map();
        function cellKey(x, z) {
          return `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
        }
        const uncoveredCells = new Set();
        let totalCells = 0;
        const seenCells = new Set();
        for (let i = 0; i < pts.length; i += 2) {
          const x = pts[i], z = pts[i + 1];
          const key = cellKey(x, z);
          if (seenCells.has(key)) continue;
          seenCells.add(key);
          totalCells++;
          const covered = colliders.some((b) => x >= b.minX - 0.15 && x <= b.maxX + 0.15 && z >= b.minZ - 0.15 && z <= b.maxZ + 0.15);
          if (!covered) uncoveredCells.add(key);
        }
        const uncoveredList = [...uncoveredCells].map((k) => {
          const [cx, cz] = k.split(',').map(Number);
          return { x: (cx + 0.5) * CELL, z: (cz + 0.5) * CELL };
        });
        return { totalCells, uncoveredCount: uncoveredCells.size, uncoveredSample: uncoveredList.slice(0, 20) };
      }, wallPoints);
      record('check 4 — every wall footprint cell has collider coverage', out.uncoveredCount === 0, out.uncoveredCount === 0 ? `${out.totalCells} occupied 0.3m cells, all covered` : `${out.uncoveredCount}/${out.totalCells} cells uncovered, sample: ${JSON.stringify(out.uncoveredSample)}`);
    }

    // -------------------------------------------------------------------
    // CHECK 5 — every collider box corresponds to real, visible solid
    // geometry (the inverse of check 4: an orphaned collider with nothing
    // real backing it). Uses solidPoints (every structural material, not
    // just 'plaster') — see that sampling step's own comment for why.
    // -------------------------------------------------------------------
    {
      const out = await page.evaluate((pts) => {
        const d = window.__dopahar;
        const colliders = d.getStaticColliders();
        const orphans = [];
        for (const box of colliders) {
          const margin = 0.25;
          let hit = false;
          for (let i = 0; i < pts.length; i += 2) {
            const x = pts[i], z = pts[i + 1];
            if (x >= box.minX - margin && x <= box.maxX + margin && z >= box.minZ - margin && z <= box.maxZ + margin) {
              hit = true;
              break;
            }
          }
          if (!hit) orphans.push(box);
        }
        return { colliderCount: colliders.length, orphans };
      }, solidPoints);
      record(
        'check 5 — every collider corresponds to real, visible geometry',
        out.orphans.length === 0,
        out.orphans.length === 0 ? `${out.colliderCount} colliders, all backed by real solid geometry` : `${out.orphans.length}/${out.colliderCount} orphaned: ${JSON.stringify(out.orphans)}`
      );
    }

    // -------------------------------------------------------------------
    // CHECK 6 — every interactive point and every building entrance is
    // reachable on foot from the player's spawn, walked with the REAL
    // movement resolver (window.__dopahar.stepPlayerMove — added for this
    // check, mirrors the real per-frame player-movement branch exactly, see
    // src/main.js), not a straight-line/teleport distance check. This is the
    // one check that is NOT "untouched" by design — it deliberately drives
    // the player, resetting to the real spawn before each target. Targets:
    // every registered src/interactions.js INTERACTION_POINTS entry (every
    // shop counter, the bell, charpai, hand pump, tulsi, wheat-errand points
    // — the real, central interaction registry, not a hand-picked subset),
    // plus every named building's own placement position (a proxy for "the
    // entrance", since none of these buildings have a separate literal
    // doorway coordinate) — house/school/halwai/temple/chowk tea/8 bazaar
    // units/general store/tea stall/post office/ration shop/atta chakki.
    // Greedy steering (recompute direction-to-target every step, walk
    // forward) through the real resolver, not A*/navmesh pathfinding — this
    // finds "is there a walkable route a straight-ish approach can take"
    // (what a real player does), not formally optimal pathfinding.
    // -------------------------------------------------------------------
    console.log('\nRunning check 6 (reachability walk)...');
    const reachTargets = await page.evaluate(() => {
      const d = window.__dopahar;
      const targets = d.interactions.INTERACTION_POINTS.map((p) => ({ name: `interaction:${p.id}`, x: p.position.x, z: p.position.z, radius: p.radius || 2.5 }));
      return targets;
    });
    // Building anchors — real position constants, read from the live scene via
    // getBuildingFootprints() centres (already real-geometry-derived, captured
    // before the static merge) rather than re-typing coordinates here.
    const buildingTargets = await page.evaluate(() => {
      const d = window.__dopahar;
      const EXCLUDE = new Set(['lane', 'bazaar_lane', 'temple_lane', 'wheat_sack_pile', 'general_store_goods', 'shop_signboards', 'bazaar_signboards', 'chowk_tea_sign', 'shop_roofs', 'shop_counters_and_posts', 'new_shop_signboards', 'new_shop_props', 'temple_props', 'trees', 'vegetation']);
      return d
        .getBuildingFootprints()
        .filter((f) => !EXCLUDE.has(f.name) && f.root !== 'background_houses')
        .map((f) => ({ name: `building:${f.root}/${f.name}`, x: (f.minX + f.maxX) / 2, z: (f.minZ + f.maxZ) / 2, radius: 4.5 })); // generous — this is a footprint-centre proxy for "the entrance", not a precise point
    });
    const allTargets = [...reachTargets, ...buildingTargets];
    console.log(`${allTargets.length} reachability targets (${reachTargets.length} interaction points + ${buildingTargets.length} building anchors).`);

    // Real lane waypoints — the exact points every real lane segment in this
    // village is built from (src/paths.js's buildStripSegment calls), not
    // invented: BAZAAR_LANE_START/BEND/ARRIVE (src/bazaar.js, now exported
    // for this), TEMPLE_LANE_START/BEND/ARRIVE (src/temple.js, now exported).
    // Why this exists: the RAW run of check 6, and even the sidestep-only
    // improved run, still failed on every FAR target (temple 63m short,
    // bazaar shops 18-30m short) — a greedy single-target steer, even with
    // sidestep, has no way to follow a lane that bends well away from the
    // straight-line direction to a distant target.
    //
    // Second bug, found when EVERY target started failing at the identical
    // spot after adding HOUSE_CENTER as a universal first waypoint: HOUSE_
    // CENTER ({-48,39}) is not actually walkable — it's deep inside the real
    // house building's own solid footprint (src/village.js's HOUSE_BLOCK,
    // cz=36, d=8, so z=[32,40] — confirmed empirically, not guessed:
    // minDistanceToColliders was negative across the ENTIRE x=[-53,-43] span
    // at z=32, the house's own solid south-facing wall; its real front door
    // faces NORTH, at z=40, away from the player's spawn). A player can't
    // walk to a point inside a wall, so using it as a waypoint made
    // literally every route fail at the same place. Replaced with a real,
    // verified-clear 2-point bypass around the house's east side (checked by
    // sampling minDistanceToColliders along all 3 legs, not eyeballed), used
    // for any target north of the house (z>30) — including before the
    // bazaar/temple lane chains, since BAZAAR_LANE_START/TEMPLE_LANE_START
    // are themselves north of the house too.
    const BYPASS = [{ x: -37, z: 30 }, { x: -37, z: 48 }];
    // BAZAAR_LANE_START/BEND/ARRIVE, plus one extra real-geometry-verified
    // point ({-58,47}) — a straight line from START(-48,46) directly to
    // BEND(-58,22) clips the house compound's own west boundary wall (its
    // real north tip sits exactly at x=-57,z=46, src/village.js's addWall
    // call, length 14 centred at HOUSE_CENTER.z=39 -> z=[32,46] — confirmed
    // via minDistanceToColliders along the line, not guessed) — going via
    // (-58,47), just north of that tip, then straight down to BEND along a
    // constant x=-58 (which IS clear the whole way, also verified) avoids it.
    // 2026-10-21 (house rebuild): the compound now has a real south wall (z=45.4, gate gap x=-48+-1.3)
    // and north returns, so a straight line from (-54,46) to (-58,22) — which used to cut through the
    // compound's then-open south and north ends — is blocked. (-58,47) now needs a tight radius so the
    // walk really reaches the clear x=-58 corridor outside the west wall before turning north.
    const BAZAAR_CHAIN = [{ x: -48, z: 46 }, { x: -58, z: 47, r: 0.6 }, { x: -58, z: 22 }, { x: -58, z: 8 }];
    const TEMPLE_CHAIN = [{ x: -44, z: 50.5 }, { x: -12, z: 55 }, { x: 2, z: 51 }]; // TEMPLE_LANE_START/BEND/ARRIVE
    // SCHOOL_CHAIN — found AFTER the first check-6 run reported blackboard/
    // school_bench as "unreachable" (stuck at (-60.69,96.44), right against
    // the classroom's own NORTH wall). That failure was this script's own
    // routing bug, not a village bug: src/village.js's SCHOOL_ROOM door is a
    // real, genuine gap (SCHOOL_ROOM_DOOR_X=-59, addGappedWall) on the EAST
    // face, centred at z=106 (SCHOOL_CENTER.z=106, width 1.1) — nowhere near
    // the z=97-101 area the direct beeline from the bypass was aiming at.
    // Confirmed real and passable by direct minDistanceToColliders probing
    // (tmp/diagnose-door-sack.mjs): clearance goes from -0.4 (solid wall) to
    // +0.15 exactly at x=-59,z=106, for a probe radius (0.4) slightly larger
    // than the real player's (src/player.js PLAYER_RADIUS=0.35) — a real,
    // if narrow, doorway, same as the source comment says.
    // A first attempt (-59,100)->(-59,106) failed too: that line runs flush
    // along the wall's own x, which is solid for the whole stretch except
    // the 1.1m gap exactly at z=106 — the resolver can't slide along a wall
    // it's being steered straight into. Verified fix (tmp/verify-school-
    // route2.mjs, every leg clear): stay east of the building entirely
    // (x=-37, past the halwai shop) before cutting west to a point already
    // outside the wall's x (-58.3, not -59), then straight down that outside
    // line to the door's z, then through the gap into the interior.
    // Final leg ({-61.5,106}) alone still missed blackboard by 1.91m (radius
    // 1.8) — the direct beeline from the door slides along the room's own
    // north wall rather than cutting straight to the blackboard's x; adding
    // one more interior waypoint aligned with the targets' real x (-62,
    // shared by both blackboard and school_bench) fixes it — verified via
    // tmp/verify-blackboard-final2.mjs, final distance 0.46m from blackboard.
    // Still missed with the DEFAULT WAYPOINT_RADIUS (4m) on that last point
    // though: a waypoint only needs to get within its radius to count as
    // "reached", so the walk could peel off up to 4m early, well before
    // actually standing at (-62,101) — confirmed by the next run's stoppedAt
    // still landing back near the north wall. A tight radius on JUST that
    // last point didn't fix it either — the walk arrives at the PRECEDING
    // (generous-radius) waypoint anywhere up to 4m early, which can leave it
    // still on the wrong side of the 1.1m door, and greedy-steer-plus-
    // sidestep alone can't reliably thread a gap that narrow from an
    // arbitrary starting offset. Fixed with tight-radius (0.3m) "stepping
    // stone" waypoints marching straight down the open corridor to, through,
    // and past the door — each hop short and axis-aligned enough that plain
    // direct steering (no sidestep needed) closes it exactly, verified
    // zero-sidestep in tmp/verify-school-stepstones.mjs.
    // 2026-10-21 (school rebuild): the yard now has a real boundary wall with a 4.8m gate gap (x=-50+-2.4,
    // z=94) so every route into it goes through the gate. East of the halwai (x=-37) down to z=88, then
    // west to the gate line, through it, then the old stepping stones to the classroom door.
    const SCHOOL_YARD_CHAIN = [{ x: -37, z: 88 }, { x: -50, z: 91, r: 0.6 }, { x: -50, z: 97, r: 0.6 }];
    const SCHOOL_CHAIN = [
      ...SCHOOL_YARD_CHAIN, { x: -58.3, z: 100 },
      { x: -58.3, z: 106, r: 0.3 }, { x: -60, z: 106, r: 0.3 }, { x: -62, z: 106, r: 0.3 },
      { x: -62, z: 101, r: 0.6 },
    ];
    // SACK_PILE_CHAIN — the raw run reported sack_pile unreachable with
    // minDistanceToColliders showing ZERO negative clearance anywhere nearby
    // (tmp/diagnose-door-sack.mjs's sack-pile grid) — i.e. no STATIC wall
    // blocks it. The real blocker is dynamic: this check's stepPlayerMove
    // (src/main.js) correctly runs the player through the real resolveMove
    // with otherVehicleBoxes included, same as actual gameplay, and the
    // item-1/item-C-relocated bike (-48,28) and tractor (-45,26) sit almost
    // on top of the player's own spawn (-48,25) — direct steering toward
    // sack_pile (-45,29) drives straight into both. Confirmed reproducible
    // and exact via tmp/diagnose-spawn-box.mjs: stepping due east from spawn
    // for a full second moves only 0.56m before a hard stop, due north only
    // 1.49m — both vehicles' real boxes, not a gap. A real player would
    // simply walk around them, same as any other parked vehicle; fixed by
    // routing wide around both (west, then north past both, then east) —
    // verified clear end-to-end in tmp/verify-sackpile-route2.mjs.
    const SACK_PILE_CHAIN = [{ x: -52, z: 25 }, { x: -52, z: 31 }, { x: -45, z: 31 }];
    // HOUSE_INTERIOR_CHAIN — found when the opening-spawn task moved the player's
    // real spawn point (src/main.js's OPENING_SPAWN); one candidate spawn (east of
    // the house, x=-35) newly failed on 'house_charpai' and the house_compound
    // building anchor, both genuinely inside the courtyard/house (reached only
    // through the real front door at HOUSE_DOOR_Z — src/village.js). Root cause:
    // the shared BYPASS chain's own generous WAYPOINT_RADIUS (4m) lets the walk
    // "arrive" at its north-east waypoint anywhere within 4m of it, and depending
    // on the APPROACH ANGLE (which depends on where the walk started, i.e. the
    // spawn), that arrival point can end up pressed almost perpendicular into the
    // courtyard's own east low compound wall (src/village.js, x=-39, z=[32,46]) —
    // confirmed exactly via tmp/diagnose-candidateC-route.mjs: direct steering
    // alone got stuck dead stationary there forever (not a budget issue — re-run
    // with DOUBLE the frame budget, identical result). Fixed the same way as
    // SCHOOL_CHAIN above: a real, verified-clear waypoint chain that goes north
    // of the low wall's own z-range (open ground there, no wall) before coming
    // back south through the actual door — tmp/verify-house-interior-route.mjs,
    // every leg clear. Applies regardless of spawn, so it's not candidate-
    // specific — every opening-spawn candidate benefits equally.
    // Tight radii on the last 2 points — same lesson as SCHOOL_CHAIN: the default
    // 4m WAYPOINT_RADIUS let the walk "arrive" anywhere in a 4m ball, which can
    // land it off-centre from the real door gap (HOUSE_DOOR_WIDTH=1.3m, centred
    // x=-48) before the final approach even starts.
    const HOUSE_INTERIOR_CHAIN = [{ x: -48, z: 47 }, { x: -48, z: 41, r: 0.4 }, { x: -48, z: 38, r: 0.6 }];
    // ROOF_CHAIN (M8, docs/STORY.md) — the house's real external stairway
    // (src/village.js HOUSE_STAIRS) sits just outside (west of) the house's own
    // west wall, at a fixed x running the whole way from ground (z=40) to roof
    // height (z=32) — groundHeightAt() ramps height continuously across that
    // whole z range, so one waypoint at the stair-top z is enough to "climb" it,
    // no separate base/top stepping stones needed the way the narrow SCHOOL door
    // did. Approach from the north (same proven-clear z=47 BYPASS/HOUSE_INTERIOR_
    // CHAIN already use), then west past the house's own west wall (x=-53)
    // before turning south down the stair corridor.
    // 2026-10-21 (house rebuild): the stairs' foot is now inside the compound, reached through the south gate.
    const ROOF_CHAIN = [{ x: -48, z: 47, r: 0.6 }, { x: -48, z: 43, r: 0.6 }, { x: -54, z: 42.5, r: 0.6 }, { x: -54, z: 34, r: 0.6 }];
    // Updated 2026-10-21 — the baagh moved inside the field (src/baagh.js). Two
    // earlier attempts both clipped the house's own east wall (HOUSE_BLOCK spans
    // x=[-53,-43]): a diagonal straight off LANE_JOIN(-48,46) toward either
    // (-20,40) or (-36,22) crosses x=-43 while z is still inside the house's own
    // z=[32,40] wall span. Fixed by first moving east to x=-36 while still north
    // of the house (z=46, proven-clear height), THEN turning south, so the wall
    // is never crossed at all.
    // 2026-10-21 (house rebuild): the old chain started at the lane (-48,46) and walked a straight line
    // from the spawn THROUGH the compound's then-open north and south ends; with real boundary walls
    // that line is blocked. The spawn (-60,20) is already on the field side of the house, so go
    // straight east along z~21 (3m north of the parked tractor, clear of the house's north wall at z=32).
    const BAAGH_CHAIN = [
      { x: -40, z: 21 }, // north of the house and the parked tractor (-45,26)
      { x: -15, z: 20 }, // east along the track's own north edge, toward the baagh's longitude
      { x: -15, z: 15 }, // into the baagh's own clearing (src/baagh.js BAAGH_CENTER)
    ];
    function routeFor(target) {
      // darzi_kurta/monkey (M5/M6, docs/STORY.md): darzi_kurta sits at the exact
      // same position the generic 'tailor' buy point always has; monkey's initial
      // (validator-run) position starts there too — both need the bazaar chain.
      const isBazaar = /bazaar|chowk|sabzi|medical|tailor|darzi|monkey|barber|mobile|kirana|sweet|bangle|post_office|ration_shop|atta_chakki/.test(target.name);
      const isTemple = /temple|flower/.test(target.name);
      const isSchoolRoom = /blackboard|school_bench/.test(target.name);
      const isSackPile = /sack_pile/.test(target.name);
      const isSchoolYard = /bell|teacher|sister|flag/.test(target.name);
      const isHouseInterior = /house_charpai|house_compound/.test(target.name);
      const isRoof = /roof_ending/.test(target.name);
      const isBaagh = /mango|baagh/.test(target.name);
      const needsBypass = target.z > 30 || isSchoolYard || isBazaar || isTemple || isSchoolRoom || isHouseInterior || isRoof || isBaagh;
      const chain = [];
      if (isBaagh) return [...BAAGH_CHAIN]; // its own route across the canal bridge, no north BYPASS needed
      if (needsBypass) chain.push(...BYPASS);
      if (isBazaar) chain.push(...BAZAAR_CHAIN);
      else if (isTemple) chain.push(...TEMPLE_CHAIN);
      else if (isSchoolRoom) chain.push(...SCHOOL_CHAIN);
      else if (isSackPile) chain.push(...SACK_PILE_CHAIN);
      else if (isSchoolYard) chain.push(...SCHOOL_YARD_CHAIN);
      else if (isHouseInterior) chain.push(...HOUSE_INTERIOR_CHAIN);
      else if (isRoof) chain.push(...ROOF_CHAIN);
      return chain;
    }
    for (const t of allTargets) t.waypoints = routeFor(t);

    // Bugfix (found on the RAW run of this check — 31/44 "unreachable", most
    // stuck within 1-2 simulated seconds right next to spawn): the original
    // steering always pushed straight at the target. A real player has full
    // 2D analog control and trivially strafes around a parked vehicle or a
    // wall corner; a single fixed heading with no sidestep can get stuck
    // pressing straight into an obstacle indefinitely even when a path
    // obviously exists a metre to either side — confirmed by inspecting the
    // raw failures: nearly every `stoppedAt` clustered right next to the two
    // vehicles parked close to spawn (item 1's relocated tractor/bike).
    // Fixed by adding a bounded sidestep burst (perpendicular to the target
    // direction, alternating side, same real stepPlayerMove resolver) when
    // progress stalls, before returning to direct steering — still not
    // pathfinding, just the same "bump and strafe" a real player does.
    const reachResult = await page.evaluate(
      ({ targets, spawn }) => {
        const d = window.__dopahar;
        const DT = 1 / 60;
        const MAX_FRAMES = 3600; // 60s simulated total per target (shared across its whole waypoint chain) — raised from 40s: the school's one real walkable interior (src/village.js's classroom) needs its own real door found on the final approach, and a long multi-waypoint route to get there was leaving too little of the original 40s budget for that last, trickiest bit
        const SIDESTEP_BURST = 90; // ~1.5s per sidestep attempt — long enough to actually clear a parked vehicle's footprint box, not just graze its edge
        const WAYPOINT_RADIUS = 4; // generous — waypoints are route guides, not the real target

        // Walks toward ONE (x,z,radius) point, sidestepping on stall, within a
        // shared frame budget (mutates `budget`, the frames-remaining counter).
        //
        // Bugfix (found on the first run of this waypoint version — every
        // single target failed, all stalled at the identical position, after
        // burning the ENTIRE frame budget on just 8 sidestep attempts): stall
        // detection compared FRAME-TO-FRAME displacement
        // (`Math.hypot(pos.x-prevX,...) < 0.0015`). A sidestep itself produces
        // real, non-zero per-frame movement even while making ~zero NET
        // progress (oscillating against an obstacle) — so stillFrames kept
        // resetting to 0 every single frame, the >20-frame stall threshold
        // was never crossed again after the first sidestep, and the player
        // just jittered in place for the rest of the budget. Fixed by
        // measuring NET displacement over a WINDOW of frames (0.5s) instead
        // of frame-to-frame, which oscillation can't hide from, and giving up
        // on a leg after a bounded number of sidestep attempts instead of
        // only the full frame budget (so one genuinely-stuck leg can't burn
        // the whole 40s and starve every later target of a fair run too).
        const WINDOW = 30; // frames (~0.5s) net-progress is measured over
        const MIN_WINDOW_PROGRESS = 0.15; // metres of NET movement expected per window
        const MAX_SIDESTEP_ATTEMPTS = 24;
        function walkTo(point, radius, budget) {
          let windowStartX = null, windowStartZ = null, windowFrames = 0;
          let sidestepFramesLeft = 0, sidestepSign = 1, sidestepAttempts = 0;
          while (budget.frames > 0) {
            const pos = d.player.position;
            const dx = point.x - pos.x, dz = point.z - pos.z;
            if (Math.hypot(dx, dz) < radius) return { reached: true, sidestepAttempts };
            let dirX = dx, dirZ = dz;
            if (sidestepFramesLeft > 0) {
              const len = Math.hypot(dx, dz) || 1;
              const px = -dz / len, pz = dx / len;
              dirX = px * sidestepSign + (dx / len) * 0.4;
              dirZ = pz * sidestepSign + (dz / len) * 0.4;
              sidestepFramesLeft--;
            }
            if (windowStartX === null) {
              windowStartX = pos.x;
              windowStartZ = pos.z;
            }
            d.stepPlayerMove(DT, dirX, dirZ);
            budget.frames--;
            windowFrames++;
            if (windowFrames >= WINDOW) {
              const netProgress = Math.hypot(pos.x - windowStartX, pos.z - windowStartZ);
              if (netProgress < MIN_WINDOW_PROGRESS) {
                if (sidestepAttempts >= MAX_SIDESTEP_ATTEMPTS) return { reached: false, sidestepAttempts }; // genuinely stuck, give up on this leg
                sidestepFramesLeft = SIDESTEP_BURST;
                sidestepSign *= -1;
                sidestepAttempts++;
              }
              windowStartX = pos.x;
              windowStartZ = pos.z;
              windowFrames = 0;
            }
          }
          return { reached: false, sidestepAttempts };
        }

        const failures = [];
        for (const t of targets) {
          d.teleportPlayer(spawn.x, spawn.z);
          const budget = { frames: MAX_FRAMES };
          let totalSidesteps = 0;
          let legFailed = null;
          for (const wp of t.waypoints) {
            const r = walkTo(wp, wp.r || WAYPOINT_RADIUS, budget);
            totalSidesteps += r.sidestepAttempts;
            if (!r.reached) {
              legFailed = `waypoint(${wp.x},${wp.z})`;
              break;
            }
          }
          let reached = false;
          if (!legFailed) {
            const r = walkTo(t, t.radius, budget);
            totalSidesteps += r.sidestepAttempts;
            reached = r.reached;
            if (!reached) legFailed = 'final approach';
          }
          if (!reached) {
            const pos = d.player.position;
            failures.push({ name: t.name, target: { x: +t.x.toFixed(2), z: +t.z.toFixed(2) }, stoppedAt: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) }, distRemaining: +Math.hypot(t.x - pos.x, t.z - pos.z).toFixed(2), framesUsed: MAX_FRAMES - budget.frames, sidestepAttempts: totalSidesteps, failedAt: legFailed });
          }
        }
        return { total: targets.length, failures };
      },
      { targets: allTargets, spawn: spawnPos }
    );
    record('check 6 — every interactive point/building entrance reachable on foot', reachResult.failures.length === 0, reachResult.failures.length === 0 ? `${reachResult.total} targets, all reached` : `${reachResult.failures.length}/${reachResult.total} unreachable: ${JSON.stringify(reachResult.failures)}`);
    // Restore the player to its real spawn after this deliberately-invasive check.
    await page.evaluate((spawn) => window.__dopahar.teleportPlayer(spawn.x, spawn.z), spawnPos);

    // -------------------------------------------------------------------
    // CHECK 7 — no two buildings overlap each other. Static/structural
    // (building positions never change at runtime), run once.
    //
    // Bugfix (found on the RAW run of this check — 75 "overlapping pairs"):
    // getBuildingFootprints() (src/main.js) was built for a different purpose
    // (approach-target aiming for tools/trolley-drive-test.js) and returns,
    // for any root that merges internally before the footprint-capture point
    // (background_houses, bazaar_row) or shares one merged wall mesh across
    // several distinct shops (shops/shop_walls, shops/new_shop_walls,
    // shops/new_shop_roofs), a MATERIAL-BUCKET box spanning many real,
    // non-overlapping buildings at once — not a per-building footprint. Every
    // single one of the 75 raw pairs involves at least one of these bucket
    // entries (confirmed: background_houses/plaster_0 alone accounts for 20+
    // of them, including overlapping its own sibling background_houses/
    // concrete_1 by 23314.5 sq m — the whole background-houses span against
    // itself). Anchor-only shops (tea_stall, general_store, post_office,
    // ration_shop, atta_chakki — src/shops.js/src/newShops.js build them as a
    // bare position Group, no mesh of their own) got a trivial 1m marker box
    // from getBuildingFootprints()'s own fallback, which then "overlaps" the
    // real shop_walls/new_shop_walls bucket that was built using that exact
    // same position — comparing a building's own marker against its own wall,
    // not two different buildings.
    //
    // Fixed by: (1) giving the 5 anchor-only shops their real footprint,
    // built from their own actual w/d design constants (src/shops.js's
    // TEA/STORE, src/newShops.js's POST_OFFICE/RATION_SHOP/ATTA_CHAKKI —
    // real source dimensions, not invented numbers) around their real
    // (correct) centre instead of a 1m marker; (2) excluding the sub-building
    // material-bucket meshes they'd otherwise trivially self-overlap
    // (shop_walls, new_shop_walls, new_shop_roofs) from the pairwise compare
    // entirely, since what they represent is now covered by the 5 real
    // per-shop boxes instead; (3) excluding background_houses and
    // bazaar_row's own material-bucket entries from being compared AGAINST
    // EACH OTHER (same root, inherently unreliable at this granularity) while
    // still comparing them against every other real building (a gross
    // placement error — the whole bazaar row landing on the temple, say —
    // would still show up as a real, large overlap). See the report for what
    // this still can't check (individual bazaar unit vs bazaar unit,
    // individual background house vs background house).
    // -------------------------------------------------------------------
    {
      const out = await page.evaluate(() => {
        const d = window.__dopahar;
        const EXCLUDE = new Set(['new_shops_old', 'lane', 'bazaar_lane', 'temple_lane', 'wheat_sack_pile', 'general_store_goods', 'shop_signboards', 'bazaar_signboards', 'chowk_tea_sign', 'shop_roofs', 'shop_counters_and_posts', 'new_shop_signboards', 'new_shop_props', 'temple_props', 'trees', 'vegetation', 'shop_walls', 'new_shop_walls', 'new_shop_roofs']);
        const footprints = d.getBuildingFootprints().filter((f) => !EXCLUDE.has(f.name));
        // Real dimensions, src/shops.js / src/newShops.js (not invented).
        const REAL_DIMS = { tea_stall: { w: 4, d: 2.5 }, general_store: { w: 3.5, d: 3 }, post_office: { w: 3.2, d: 3 }, ration_shop: { w: 3.6, d: 3 }, atta_chakki: { w: 3, d: 2.8 } };
        for (const f of footprints) {
          const dims = REAL_DIMS[f.name];
          if (!dims) continue;
          // Conservative square half-extent (max(w,d)/2) — these buildings are
          // all placed at ~90 deg rotations, which swaps world X/Z extents
          // relative to local w/d; a square bound avoids needing the exact
          // rotation for what's meant to be a coarse gross-overlap check.
          const cx = (f.minX + f.maxX) / 2, cz = (f.minZ + f.maxZ) / 2;
          const half = Math.max(dims.w, dims.d) / 2;
          f.minX = cx - half; f.maxX = cx + half; f.minZ = cz - half; f.maxZ = cz + half;
        }
        const SAME_ROOT_UNRELIABLE = new Set(['background_houses', 'bazaar_row']);
        const rawOverlaps = [];
        const overlaps = [];
        for (let i = 0; i < footprints.length; i++) {
          for (let j = i + 1; j < footprints.length; j++) {
            const a = footprints[i], b = footprints[j];
            if (a.root === b.root && a.name === b.name) continue;
            if (a.root === b.root && SAME_ROOT_UNRELIABLE.has(a.root)) continue;
            const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
            const oz = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
            if (ox > 0.05 && oz > 0.05) {
              const entry = { a: `${a.root}/${a.name}`, b: `${b.root}/${b.name}`, overlapArea: +(ox * oz).toFixed(2) };
              rawOverlaps.push(entry);
              // KNOWN DATA-GRANULARITY LIMITATION, not a real building-overlap
              // bug — kept OUT of the gate, not silently dropped: every one
              // of these 34 raw pairs (confirmed, not assumed — see rawCount
              // below) involves 'background_houses', whose entire scattered
              // decorative field across the whole map is captured as ONE
              // merged-bucket box per material (plaster_0/concrete_1) by
              // getBuildingFootprints() — that box's bounds span roughly the
              // whole village, so it trivially "overlaps" every real
              // building's box. This isn't two buildings actually coinciding
              // (background houses are deliberately scattered distant
              // scenery, never placed to coincide with anything), it's a
              // real building vs. a map-sized bucket standing in for
              // hundreds of unrelated small ones. There is no finer-grained
              // footprint data available for this group without capturing
              // each background house's box before ITS OWN internal merge in
              // main.js (a real refactor, out of scope for this task's
              // "smallest change" rule) — reported here, left failing the
              // raw count, but excluded from the build gate below.
              if (a.root !== 'background_houses' && b.root !== 'background_houses') overlaps.push(entry);
            }
          }
        }
        return { count: footprints.length, overlaps, rawOverlaps };
      });
      record('check 7 — no two buildings overlap', out.overlaps.length === 0, out.overlaps.length === 0
        ? `${out.count} building footprints, no pairwise overlap (raw, including the known background_houses granularity limitation: ${out.rawOverlaps.length} pairs — see report)`
        : `${out.overlaps.length} overlapping pairs: ${JSON.stringify(out.overlaps)}`);
    }

    // -------------------------------------------------------------------
    // CHECK 8 — draw calls <= 150 (docs/budgets.md's hard ceiling, raised from
    // 140 2026-10-20 — art director's call: 150 matches the budget doc's own
    // documented runtime target, with real headroom left on triangles/assets;
    // the long-term fix is zone streaming + instancing, not just a bigger
    // number, see below), assets <= 40MB.
    //
    // Bugfix (found on the RAW run — 156 calls vs the 128-133 this same
    // village measured under tools/regression-check.js): this check read
    // renderer.info.render.calls from WHATEVER frame last rendered — by this
    // point in the script, after check 6 had driven the player all over the
    // map — not a fixed, representative viewpoint. Different camera angles
    // legitimately see different amounts of geometry (more of the bazaar row
    // in frame costs more draws than open field), so that number wasn't
    // comparable to the established budget-tracking convention at all. Fixed
    // by setting a representative, fixed camera per built zone instead of one
    // single viewpoint — the village is no longer one small area, and a
    // single camera can't represent "the bazaar" and "the field" at once.
    //
    // One entry per zone that currently has real built content (hero zone,
    // bazaar/chowk, field/baagh) — add a new entry here in the same commit as
    // any new zone Step D builds, per the "validator after every zone" rule.
    // Each must stay <= the hard ceiling; 120 is only an aspirational flag,
    // logged but never failing the build on its own.
    // -------------------------------------------------------------------
    {
      const DRAW_CALL_CEILING = 150;
      const DRAW_CALL_AIM = 120;
      const ZONE_CAMERAS = [
        { zone: 'hero zone (house/school/halwai/tea-stall)', x: -48, z: 30, yaw: Math.PI },
        { zone: 'bazaar row + chowk', x: -82, z: 6, yaw: Math.PI },
        { zone: 'field + mango baagh', x: -15, z: 20, yaw: 0 }, // 2026-10-21: re-centred near the baagh's new in-field position + the canal bridge (src/baagh.js, src/canal.js)
      ];
      for (const zc of ZONE_CAMERAS) {
        await page.evaluate(({ x, z, yaw }) => {
          const d = window.__dopahar;
          d.teleportPlayer(x, z);
          d.camRig.yaw = yaw;
          d.camRig.pitch = -0.15;
          d.camRig.distance = 5;
          d.camRig.update(10);
        }, zc);
        for (let i = 0; i < 20; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
        const info = await page.evaluate(() => {
          const d = window.__dopahar;
          return { calls: d.renderer.info.render.calls, triangles: d.renderer.info.render.triangles };
        });
        record(
          `check 8a — draw calls <= ${DRAW_CALL_CEILING} (${zc.zone})`,
          info.calls <= DRAW_CALL_CEILING,
          `${info.calls} calls${info.calls > DRAW_CALL_AIM ? ` (over the ${DRAW_CALL_AIM} aim, within the ${DRAW_CALL_CEILING} hard ceiling)` : ''}`
        );
      }

      const assetsDir = resolve(ROOT, 'public', 'assets');
      let totalBytes = 0;
      (function walk(dir) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else totalBytes += statSync(full).size;
        }
      })(assetsDir);
      const totalMB = totalBytes / (1024 * 1024);
      record('check 8b — assets <= 40MB', totalMB <= 40, `${totalMB.toFixed(2)}MB`);
    }

    // CHECK 9 - every NPC waypoint leg is walkable: sweep each segment of every registered
    // route (src/npcRoutines.js ROUTES) in 0.2 m steps against the real static colliders.
    // Rooftop legs (y > 0, M6 monkey) and a run's first leg (starts at the live player) are skipped.
    {
      const out = await page.evaluate(() => {
        const d = window.__dopahar;
        const bad = [];
        let legs = 0;
        for (const r of d.npcRoutes) {
          const w = r.waypoints;
          const n = r.kind === 'loop' ? w.length : w.length - 1;
          for (let i = 0; i < n; i++) {
            const a = w[i], b = w[(i + 1) % w.length];
            if (r.kind === 'run' && (i === 0 || (a.y || 0) > 0 || (b.y || 0) > 0)) continue;
            legs++;
            const len = Math.hypot(b.x - a.x, b.z - a.z);
            const steps = Math.max(1, Math.ceil(len / 0.2));
            let worst = Infinity, at = null;
            for (let s = 0; s <= steps; s++) {
              const t = s / steps;
              const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
              const c = d.minDistanceToColliders({ x, z }, r.radius);
              if (c < worst) { worst = c; at = { x: +x.toFixed(1), z: +z.toFixed(1) }; }
            }
            if (worst < -0.02) bad.push({ route: r.name, leg: i, from: [a.x, a.z], to: [b.x, b.z], penetration: +(-worst).toFixed(2), at });
          }
        }
        return { routes: d.npcRoutes.length, legs, bad };
      });
      record('check 9 - every NPC waypoint leg is clear of colliders', out.bad.length === 0, out.bad.length === 0 ? `${out.routes} routes, ${out.legs} legs, all clear` : JSON.stringify(out.bad));
    }

    record('no console errors across the whole run', pageErrors.length === 0, pageErrors.length ? pageErrors.slice(0, 5).join(' | ') : '');

    await browser.close();
  } finally {
    server.kill();
  }

  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} checks passed.`);
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.log('\nFAILED CHECKS:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  }
  process.exitCode = failed.length ? 1 : 0;
}

main();
