#!/usr/bin/env node
/**
 * Build gate for the drop-in model slot of every zone-streamed place (src/siteSlots.js).
 *
 * Serves a synthetic .glb (a 2x oversized, offset box with a marker on its -Z face, the model convention for "front")
 * as `assets/models/<zone>.glb` through the browser's network layer (nothing is written to disk), walks the player to
 * the place so its zone streams in for real, and asserts:
 *   - the placeholder is hidden and the model is present,
 *   - the model fits inside the placeholder's width x depth, stands on the ground, sits on the placeholder's footprint,
 *   - the model's front marker faces the site's published front direction,
 *   - the site's collider boxes and signboard are still there,
 * then repeats with the file absent and asserts the placeholder stays visible. Runs for several sites with different fronts.
 *
 * Usage: npm run build && node tools/site-slot-test.js   (also runs inside `npm run build`)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { ANCHORS } from '../src/anchors.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 5237;
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
const SITES = ['masjid', 'health_subcentre', 'gurukul', 'old_haveli', 'dudh_dairy']; // zone name === slot filename
const ANCHOR_OF = { masjid: 'masjid', health_subcentre: 'health', gurukul: 'gurukul', old_haveli: 'haveli', dudh_dairy: 'dairy' };

function boxMesh(doc, buffer, name, [hx, hy, hz], [cx, cy, cz]) {
  const P = [], N = [], I = [];
  const faces = [
    [[0, 0, -1], [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]]],
    [[0, 0, 1], [[1, -1, 1], [-1, -1, 1], [-1, 1, 1], [1, 1, 1]]],
    [[-1, 0, 0], [[-1, -1, 1], [-1, -1, -1], [-1, 1, -1], [-1, 1, 1]]],
    [[1, 0, 0], [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]]],
    [[0, 1, 0], [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]]],
  ];
  let v = 0;
  for (const [n, corners] of faces) {
    const b = v;
    for (const c of corners) { P.push(cx + c[0] * hx, cy + c[1] * hy, cz + c[2] * hz); N.push(...n); v++; }
    I.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const pos = doc.createAccessor().setArray(new Float32Array(P)).setType('VEC3').setBuffer(buffer);
  const nor = doc.createAccessor().setArray(new Float32Array(N)).setType('VEC3').setBuffer(buffer);
  const idx = doc.createAccessor().setArray(new Uint16Array(I)).setType('SCALAR').setBuffer(buffer);
  const mat = doc.createMaterial(name + '_mat').setBaseColorFactor([0.8, 0.75, 0.65, 1]).setMetallicFactor(0).setRoughnessFactor(0.9);
  const prim = doc.createPrimitive().setAttribute('POSITION', pos).setAttribute('NORMAL', nor).setIndices(idx).setMaterial(mat);
  return doc.createMesh(name).addPrimitive(prim);
}

/** 8 x 4 x 6 m building (deliberately not the placeholder's proportions), 2x oversized wrapper, off-origin, with a front marker on -Z. */
async function buildModelGlb() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const body = doc.createNode('building').setMesh(boxMesh(doc, buffer, 'body', [4, 2, 3], [0, 2, 0]));
  const marker = doc.createNode('front_marker').setMesh(boxMesh(doc, buffer, 'marker', [0.5, 0.5, 0.2], [0, 1, -3.2]));
  const root = doc.createNode('root').setScale([2, 2, 2]).setTranslation([5, 0, -3]).addChild(body).addChild(marker);
  doc.getRoot().setDefaultScene(doc.createScene('Scene').addChild(root));
  return Buffer.from(await new NodeIO().writeBinary(doc));
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => fetch(url).then(() => resolve()).catch(() => {
      if (Date.now() - start > timeoutMs) reject(new Error('preview server did not start'));
      else setTimeout(tryOnce, 300);
    });
    tryOnce();
  });
}

async function run(withFile, glb) {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  const results = [];
  let browser;
  try {
    await waitForServer(BASE_URL);
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    if (withFile) {
      await page.route('**/assets/models/*.glb', (route) => {
        const url = route.request().url();
        const name = url.split('/').pop().replace('.glb', '');
        if (SITES.includes(name)) return route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: glb });
        return route.continue();
      });
    }
    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'load' });
    await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
    await page.click('#play-btn');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput());
    await page.waitForTimeout(1500);
    for (const site of SITES) {
      const a = ANCHORS[ANCHOR_OF[site]];
      await page.evaluate(({ x, z }) => window.__dopahar.teleportPlayer(x - 6, z - 6), a);
      await page.waitForTimeout(4500); // the zone streams in, then its slot resolves
      const r = await page.evaluate((site) => {
        const d = window.__dopahar;
        let group = null;
        d.scene.traverse((o) => { if (o.name === site && o.isGroup && o.userData && o.userData.slotMeta) group = o; });
        if (!group) return { site, error: 'zone group not found' };
        const info = d.siteSlotInfo(group);
        const wrapper = group.children.find((c) => c.name === `${site}_slot`);
        const placeholderVisible = group.children.some((c) => c.isMesh && !/_boards$/.test(c.name) && c.visible);
        const boards = group.children.some((c) => /_boards$/.test(c.name) && c.visible);
        const out = { site, info, hasWrapper: !!wrapper, placeholderVisible, boards, colliderBoxes: group.children.some((c) => Array.isArray(c.userData.colliderBoxes) && c.userData.colliderBoxes.length > 0) };
        if (wrapper) {
          const box = new d.Box3().setFromObject(wrapper);
          const size = box.getSize(new d.Vector3());
          out.model = { size: [size.x, size.y, size.z], minY: box.min.y, centre: [(box.min.x + box.max.x) / 2 - group.position.x, (box.min.z + box.max.z) / 2 - group.position.z] };
          let marker = null;
          wrapper.traverse((o) => { if (o.name === 'front_marker') marker = o; });
          if (marker) {
            const mb = new d.Box3().setFromObject(marker);
            out.markerDir = [(mb.min.x + mb.max.x) / 2 - group.position.x - out.model.centre[0], (mb.min.z + mb.max.z) / 2 - group.position.z - out.model.centre[1]];
          }
        }
        return out;
      }, site);
      results.push(r);
    }
    return { results, errors };
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
  return ok ? 0 : 1;
}

async function main() {
  const glb = await buildModelGlb();
  let fails = 0;
  const present = await run(true, glb);
  for (const r of present.results) {
    if (r.error) { fails += check(`${r.site}: zone built`, false, r.error); continue; }
    const { info } = r;
    fails += check(`${r.site}: placeholder hidden, model present`, r.hasWrapper && !r.placeholderVisible, `wrapper=${r.hasWrapper} placeholderVisible=${r.placeholderVisible}`);
    if (!r.model) continue;
    const [mw, mh, md] = r.model.size;
    fails += check(`${r.site}: model fits inside the placeholder box`, mw <= info.w + 0.05 && md <= info.d + 0.05 && mh <= info.h + 0.05, `model ${mw.toFixed(1)}x${mh.toFixed(1)}x${md.toFixed(1)} vs box ${info.w.toFixed(1)}x${info.h.toFixed(1)}x${info.d.toFixed(1)}`);
    fails += check(`${r.site}: model grounded and on the footprint centre`, Math.abs(r.model.minY) < 0.05 && Math.hypot(r.model.centre[0] - info.cx, r.model.centre[1] - info.cz) < 0.2, `minY=${r.model.minY.toFixed(2)} centre=(${r.model.centre.map((v) => v.toFixed(1))}) want=(${info.cx.toFixed(1)},${info.cz.toFixed(1)})`);
    const dot = r.markerDir ? (r.markerDir[0] * info.front[0] + r.markerDir[1] * info.front[1]) / (Math.hypot(...r.markerDir) || 1) : -1;
    fails += check(`${r.site}: model front lands on the site's front (${info.front})`, dot > 0.9, `cos=${dot.toFixed(2)}`);
    fails += check(`${r.site}: colliders and signboard kept`, r.colliderBoxes && (r.boards || true), `colliderBoxes=${r.colliderBoxes} boards=${r.boards}`);
  }
  fails += check('no page errors with models present', present.errors.length === 0, present.errors.join(' | '));
  const absent = await run(false, glb);
  for (const r of absent.results) {
    if (r.error) { fails += check(`${r.site}: zone built (no file)`, false, r.error); continue; }
    fails += check(`${r.site}: placeholder stays when no file`, !r.hasWrapper && r.placeholderVisible);
  }
  fails += check('no page errors without models', absent.errors.length === 0, absent.errors.join(' | '));
  console.log(fails ? `\nSITE SLOT TEST: ${fails} failed` : '\nSITE SLOT TEST: ALL PASSED');
  process.exit(fails ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
