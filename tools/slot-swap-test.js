#!/usr/bin/env node
/**
 * Permanent build gate (wired into `npm run build` alongside world-validator.js)
 * for src/assetSlots.js's self-correcting import pipeline — the thing that lets
 * any future Tripo .glb drop into public/assets/models/ with ZERO code changes.
 *
 * It does NOT test real Tripo content (none exists yet). It generates its own
 * worst-case-bad synthetic .glb for all 6 October staging slots — each a plain
 * box at the slot's documented real-world size, deliberately wrapped in a 2x
 * scale, an origin offset, a 180-degree facing flip, and a shiny metallic
 * material (the exact 4 defects this pipeline exists to correct) — drops them
 * into public/assets/models/, and asserts the import pipeline corrects every
 * one of them, every time: a model that breaks this is not finished.
 *
 * Two full game loads:
 *   1. All 6 bad files PRESENT — asserts each slot's placeholder is replaced,
 *      with correct size, ground contact, facing, and clamped (never-too-
 *      shiny) material, and no console errors.
 *   2. All 6 files ABSENT (removed again, see finally-block below — this
 *      script must never leave synthetic test fixtures behind in the shipped
 *      asset folder) — asserts every placeholder falls back and stays
 *      visible, with no console errors.
 *
 * Usage:
 *   npm run build && node tools/slot-swap-test.js    # exits non-zero on any failure
 *   npm run build                                    # runs this automatically (see package.json)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { copyFileSync, unlinkSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5236;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
// dist/, not public/ — this script runs against an already-built game (same
// assumption as world-validator.js/regression-check.js, both driven by `vite
// preview`, which serves the static dist/ snapshot). Dropping a file into
// public/assets/models/ at this point would have zero effect: dist/ was
// already built before this script ran, and vite preview never re-reads
// public/ at request time.
const MODELS_DIR = resolve(ROOT, 'dist/assets/models');

// Slot name -> documented real-world box + required facing, exactly matching
// docs/asset-slots.md's "October Tripo-day staging slots" table. `rotationY`
// is the slot's own documented placement rotation (src/main.js's
// TRIPO_STAGING_SLOTS) — used here to compute where the test box's "front"
// marker (its local -Z face, this engine's universal forward convention)
// should land in WORLD space once correctly imported.
const SLOTS = {
  tripo_tractor: { w: 1.9, h: 2.6, d: 3.5, rotationY: 0, checkFacing: true },
  tripo_mother: { w: 0.66, h: 1.65, d: 0.66, rotationY: 0, checkFacing: true },
  tripo_halwai_kiosk: { w: 5.5, h: 3.5, d: 4.5, rotationY: 0, checkFacing: true },
  tripo_tree_neem: { w: 3.0, h: 4.5, d: 3.0, rotationY: 0, checkFacing: false },
  tripo_tree_peepal: { w: 3.5, h: 5.5, d: 3.5, rotationY: 0, checkFacing: false },
  tripo_bush: { w: 1.0, h: 0.9, d: 1.0, rotationY: 0, checkFacing: false },
};

function quatFromYRotation(rad) {
  const half = rad / 2;
  return [0, Math.sin(half), 0, Math.cos(half)];
}

/** Builds one deliberately-bad test .glb: correct box proportions, wrapped in
 * a 2x scale + origin offset + 180-degree rotation + shiny metal material. */
function buildBadGlb(name, { w, h, d }) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const hw = w / 2, hd = d / 2;
  const positions = [], normals = [], colors = [], indices = [];
  const faces = [
    [[0, 0, -1], [[-hw, 0, -hd], [hw, 0, -hd], [hw, h, -hd], [-hw, h, -hd]], [0.85, 0.15, 0.15]], // -Z = front, red
    [[0, 0, 1], [[hw, 0, hd], [-hw, 0, hd], [-hw, h, hd], [hw, h, hd]], [0.15, 0.15, 0.85]], // +Z = back, blue
    [[-1, 0, 0], [[-hw, 0, hd], [-hw, 0, -hd], [-hw, h, -hd], [-hw, h, hd]], [0.2, 0.7, 0.2]], // -X, green
    [[1, 0, 0], [[hw, 0, -hd], [hw, 0, hd], [hw, h, hd], [hw, h, -hd]], [0.9, 0.8, 0.1]], // +X, yellow
    [[0, -1, 0], [[-hw, 0, hd], [hw, 0, hd], [hw, 0, -hd], [-hw, 0, -hd]], [0.3, 0.3, 0.3]], // bottom
    [[0, 1, 0], [[-hw, h, -hd], [hw, h, -hd], [hw, h, hd], [-hw, h, hd]], [0.9, 0.9, 0.9]], // top
  ];
  let vi = 0;
  for (const [n, corners, c] of faces) {
    const base = vi;
    for (const p of corners) {
      positions.push(...p);
      normals.push(...n);
      colors.push(...c, 1);
      vi++;
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const posAcc = doc.createAccessor().setArray(new Float32Array(positions)).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor().setArray(new Float32Array(normals)).setType('VEC3').setBuffer(buffer);
  const colorAcc = doc.createAccessor().setArray(new Float32Array(colors)).setType('VEC4').setBuffer(buffer);
  const idxAcc = doc.createAccessor().setArray(new Uint16Array(indices)).setType('SCALAR').setBuffer(buffer);
  const mat = doc.createMaterial(`${name}_shiny_metal`).setBaseColorFactor([0.9, 0.9, 0.95, 1]).setMetallicFactor(1).setRoughnessFactor(0.05);
  const prim = doc.createPrimitive().setAttribute('POSITION', posAcc).setAttribute('NORMAL', normAcc).setAttribute('COLOR_0', colorAcc).setIndices(idxAcc).setMaterial(mat);
  const mesh = doc.createMesh(`${name}_mesh`).addPrimitive(prim);
  const node = doc.createNode(`${name}_root`).setMesh(mesh).setScale([2, 2, 2]).setTranslation([0.8, 1.0, 0]).setRotation(quatFromYRotation(Math.PI));
  const scene = doc.createScene('Scene').addChild(node);
  doc.getRoot().setDefaultScene(scene);
  return doc;
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolvePromise, reject) => {
    const tryFetch = () => {
      fetch(url)
        .then(() => resolvePromise())
        .catch(() => {
          if (Date.now() - start > timeoutMs) reject(new Error(`Server at ${url} did not respond within ${timeoutMs}ms`));
          else setTimeout(tryFetch, 300);
        });
    };
    tryFetch();
  });
}

async function withGame(fn) {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  let browser;
  try {
    await waitForServer(BASE_URL);
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));
    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'load' });
    await page.waitForSelector('#start-overlay.ready', { timeout: 15000 }).catch(() => {});
    await page.click('#play-btn');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(2500); // give assetSlots.resolveAll() (fire-and-forget) time to finish
    return await fn(page, consoleErrors);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

const failures = [];
function check(label, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures.push(label);
}

async function main() {
  const tmpDir = mkdtempSync(join(tmpdir(), 'slot-swap-test-'));
  const io = new NodeIO();
  const badFiles = {};
  for (const [name, dims] of Object.entries(SLOTS)) {
    const path = join(tmpDir, `${name}.glb`);
    await io.write(path, buildBadGlb(name, dims));
    badFiles[name] = path;
  }

  const installedPaths = []; // public/assets/models/<name>.glb copies to clean up, no matter what happens below
  try {
    // ---- Pass 1: all 6 bad files PRESENT ----
    for (const [name, path] of Object.entries(badFiles)) {
      const dest = join(MODELS_DIR, `${name}.glb`);
      copyFileSync(path, dest);
      installedPaths.push(dest);
    }

    await withGame(async (page, consoleErrors) => {
      const results = await page.evaluate((slotNames) => {
        const d = window.__dopahar;
        return slotNames.map((name) => {
          const ph = d.scene.getObjectByName(`${name}_placeholder`);
          const wrapper = d.scene.children.find((c) => c.name === `${name}_slot`);
          const out = { name, placeholderVisible: ph ? ph.visible : null, wrapperFound: !!wrapper };
          if (!wrapper) return out;
          wrapper.updateWorldMatrix(true, true);
          let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
          let material = null;
          let frontWorldZ = null, frontWorldX = null; // the red (-Z local) face's world position, for facing
          wrapper.traverse((o) => {
            if (!o.isMesh) return;
            if (!material) material = o.material;
            const pos = o.geometry.attributes.position;
            const color = o.geometry.attributes.color;
            const e = o.matrixWorld.elements;
            for (let i = 0; i < pos.count; i++) {
              const lx = pos.getX(i), ly = pos.getY(i), lz = pos.getZ(i);
              const wx = e[0] * lx + e[4] * ly + e[8] * lz + e[12];
              const wy = e[1] * lx + e[5] * ly + e[9] * lz + e[13];
              const wz = e[2] * lx + e[6] * ly + e[10] * lz + e[14];
              if (wx < min[0]) min[0] = wx; if (wy < min[1]) min[1] = wy; if (wz < min[2]) min[2] = wz;
              if (wx > max[0]) max[0] = wx; if (wy > max[1]) max[1] = wy; if (wz > max[2]) max[2] = wz;
              if (color && color.getX(i) > 0.7 && color.getY(i) < 0.3 && color.getZ(i) < 0.3) {
                frontWorldZ = wz; frontWorldX = wx;
              }
            }
          });
          out.size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
          out.minY = min[0] === Infinity ? null : min[1];
          out.material = material ? { roughness: material.roughness, metalness: material.metalness } : null;
          out.frontWorldZ = frontWorldZ;
          out.frontWorldX = frontWorldX;
          out.center = [wrapper.position.x, wrapper.position.y, wrapper.position.z];
          return out;
        });
      }, Object.keys(SLOTS));

      check('present: no console errors', consoleErrors.length === 0, consoleErrors.length ? JSON.stringify(consoleErrors) : undefined);

      for (const r of results) {
        const dims = SLOTS[r.name];
        check(`${r.name}: placeholder hidden`, r.placeholderVisible === false, `placeholderVisible=${r.placeholderVisible}`);
        check(`${r.name}: model wrapper present`, r.wrapperFound, r.wrapperFound ? undefined : 'no *_slot wrapper found in scene');
        if (!r.wrapperFound) continue;
        const sizeOk = Math.abs(r.size[0] - dims.w) < 0.05 && Math.abs(r.size[1] - dims.h) < 0.05 && Math.abs(r.size[2] - dims.d) < 0.05;
        check(`${r.name}: imported size matches documented ${dims.w}x${dims.h}x${dims.d}m`, sizeOk, `got ${r.size.map((v) => v.toFixed(2)).join('x')}`);
        check(`${r.name}: grounded (lowest point at y=0)`, Math.abs(r.minY) < 0.02, `minY=${r.minY?.toFixed?.(3)}`);
        const isMetal = (r.material?.metalness ?? 0) >= 0.5;
        const matOk = isMetal ? r.material.roughness >= 0.25 - 1e-6 && r.material.roughness <= 0.45 + 1e-6 : r.material?.metalness === 0 && r.material?.roughness >= 0.8 - 1e-6;
        check(`${r.name}: material at or above its clamp`, matOk, JSON.stringify(r.material));
        if (dims.checkFacing) {
          // The red (-Z local) front marker, rotated by the slot's own documented
          // rotationY, must land toward the correspondingly-rotated world direction —
          // rotationY=0 -> world -Z; rotationY=PI/2 -> world -X (see src/main.js's
          // TRIPO_STAGING_SLOTS rotationY values and docs/asset-slots.md's facing column).
          const expectedZ = dims.rotationY === 0 ? r.center[2] - dims.d / 2 : null;
          const expectedX = Math.abs(dims.rotationY - Math.PI / 2) < 1e-6 ? r.center[0] - dims.w / 2 : null;
          const facingOk = expectedZ !== null ? Math.abs(r.frontWorldZ - expectedZ) < 0.1 : Math.abs(r.frontWorldX - expectedX) < 0.1;
          check(`${r.name}: facing matches documented direction`, facingOk, `front marker at (x=${r.frontWorldX?.toFixed?.(2)}, z=${r.frontWorldZ?.toFixed?.(2)}), centre=${JSON.stringify(r.center.map((v) => +v.toFixed(2)))}`);
        }
      }
    });
  } finally {
    // ---- cleanup: this script must NEVER leave synthetic fixtures behind ----
    for (const p of installedPaths) if (existsSync(p)) unlinkSync(p);
    rmSync(tmpDir, { recursive: true, force: true });
  }

  // ---- Pass 2: all 6 files ABSENT (fallback) ----
  await withGame(async (page, consoleErrors) => {
    const results = await page.evaluate((slotNames) => {
      const d = window.__dopahar;
      return slotNames.map((name) => {
        const ph = d.scene.getObjectByName(`${name}_placeholder`);
        return { name, found: !!ph, visible: ph ? ph.visible : null };
      });
    }, Object.keys(SLOTS));
    check('absent: no console errors', consoleErrors.length === 0, consoleErrors.length ? JSON.stringify(consoleErrors) : undefined);
    for (const r of results) {
      check(`${r.name}: placeholder falls back and stays visible when file absent`, r.found && r.visible === true, `found=${r.found} visible=${r.visible}`);
    }
  });

  console.log(`\n${failures.length === 0 ? 'ALL PASSED' : `${failures.length} FAILED`}`);
  if (failures.length) {
    console.log('FAILED:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exitCode = failures.length ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
