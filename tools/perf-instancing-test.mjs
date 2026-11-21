#!/usr/bin/env node
/**
 * Unit test for src/kit/instancing.js in a real (headless) browser with WebGL.
 * Run: node tools/perf-instancing-test.mjs     (exit 1 on any failure)
 *
 * Checks: chunking (one InstancedMesh per occupied 100 m chunk), per-chunk bounding
 * sphere/box, colours, default y / heightAt, frustum culling per chunk (draw calls drop
 * when the camera looks away), LOD near/far swap by distance (auto, via the sentinel,
 * and the sentinel itself adds zero draw calls), dispose.
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const PAGE = `<!doctype html><html><body><canvas id="c" width="320" height="240"></canvas>
<script type="module">
import * as THREE from 'three';
import { createChunkedInstances, createChunkedLOD } from '/src/kit/instancing.js';
const out = { fails: [], notes: {} };
const ok = (c, msg) => { if (!c) out.fails.push(msg); };
try {
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c') });
  renderer.info.autoReset = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 4 / 3, 0.5, 2000);
  const geo = new THREE.BoxGeometry(4, 4, 4);
  const mat = new THREE.MeshStandardMaterial();
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // 3 chunks: (0,0) x3 coloured, (1,0) x2, (-1,-1) x1
  const items = [
    { x: 10, z: 10, ry: 0.3, color: 0xff0000 }, { x: 50, z: 60, color: '#00ff00' }, { x: 90, z: 20 },
    { x: 150, z: 20, sx: 2 }, { x: 170, z: 80 },
    { x: -40, z: -30, y: 5 },
  ];
  const g = createChunkedInstances({ geometry: geo, material: mat, items, name: 'test_inst', heightAt: (x, z) => 1.5 });
  const ch = g.userData.chunks;
  ok(g.isGroup && g.name === 'test_inst', 'returns a named Group');
  ok(g.children.length === 3 && ch.length === 3, 'one mesh per occupied chunk (want 3, got ' + g.children.length + ')');
  ok(g.userData.count === 6, 'count 6');
  const c00 = ch.find(c => c.key === '0,0');
  ok(c00 && c00.mesh.isInstancedMesh && c00.mesh.count === 3, 'chunk 0,0 has 3 instances');
  ok(c00.mesh.boundingSphere && c00.mesh.boundingBox, 'bounding sphere + box computed');
  ok(c00.mesh.boundingBox.min.x >= 8 - 1e-3 - 2 && c00.mesh.boundingBox.max.x <= 92 + 1e-3, 'bbox spans the chunk instances');
  ok(c00.mesh.frustumCulled === true, 'frustumCulled true');
  ok(c00.mesh.castShadow === false && c00.mesh.receiveShadow === true, 'shadow defaults');
  ok(!!c00.mesh.instanceColor, 'instanceColor when colours given');
  const col = new THREE.Color(); c00.mesh.getColorAt(2, col);
  ok(col.r === 1 && col.g === 1 && col.b === 1, 'uncoloured item in a coloured chunk is white');
  const c10 = ch.find(c => c.key === '1,0');
  ok(!c10.mesh.instanceColor, 'no instanceColor when the chunk has no colours');
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  c10.mesh.getMatrixAt(0, m); m.decompose(p, q, s);
  ok(Math.abs(p.y - 1.5) < 1e-6 && Math.abs(s.x - 2) < 1e-6, 'heightAt used for y, sx applied');
  const cm = ch.find(c => c.key === '-1,-1'); cm.mesh.getMatrixAt(0, m); m.decompose(p, q, s);
  ok(Math.abs(p.y - 5) < 1e-6, 'explicit y wins over heightAt');
  c00.mesh.getMatrixAt(0, m); m.decompose(p, q, s);
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  ok(Math.abs(e.y - 0.3) < 1e-5, 'ry applied');

  // Frustum culling per chunk: look at chunk 0,0 only, then away from everything.
  scene.add(g);
  camera.position.set(50, 30, 200); camera.lookAt(50, 0, 50); camera.updateMatrixWorld();
  renderer.render(scene, camera);
  const callsAll = renderer.info.render.calls;
  camera.position.set(50, 60, 50); camera.lookAt(50, 0, 50.01); camera.updateMatrixWorld(); // straight down over chunk 0,0 only
  renderer.render(scene, camera);
  const callsNarrow = renderer.info.render.calls;
  camera.position.set(0, 20, 500); camera.lookAt(0, 20, 1000); camera.updateMatrixWorld();
  renderer.render(scene, camera);
  const callsAway = renderer.info.render.calls;
  out.notes.frustum = { callsAll, callsNarrow, callsAway };
  ok(callsAway === 0, 'looking away draws 0 chunks (got ' + callsAway + ')');
  ok(callsAll === 3 && callsNarrow === 1, 'wide view draws 3 chunks, top-down view over one chunk draws 1 (got ' + callsAll + '/' + callsNarrow + ')');
  scene.remove(g);

  // LOD
  const farGeo = new THREE.BoxGeometry(4, 4, 4, 1, 1, 1); const farMat = new THREE.MeshBasicMaterial();
  const lodItems = [];
  for (let i = 0; i < 10; i++) lodItems.push({ x: i * 100 + 50, z: 50 });
  const lod = createChunkedLOD({ near: { geometry: geo, material: mat }, far: { geometry: farGeo, material: farMat }, items: lodItems, switchDistance: 120, name: 'test_lod' });
  ok(lod.userData.chunks.length === 10, 'LOD: 10 chunks');
  scene.add(lod);
  camera.position.set(50, 10, 50); camera.lookAt(1000, 0, 50); camera.updateMatrixWorld();
  renderer.render(scene, camera); // sentinel triggers update (first update always runs)
  const lc = lod.userData.chunks;
  const nearKeys = lc.filter(c => c.isNear).map(c => c.key);
  out.notes.lodNearAt50 = nearKeys;
  ok(nearKeys.join('|') === '0,0|1,0', 'LOD at x=50: chunks 0 and 1 near (edge distance < 120), got ' + nearKeys.join('|'));
  ok(lc.every(c => c.near.visible === c.isNear && c.far.visible === !c.isNear), 'exactly one of near/far visible per chunk');
  ok(renderer.info.render.calls <= 10, 'at most one call per chunk (got ' + renderer.info.render.calls + ')');
  // Move the camera; throttled for 200 ms, then swaps.
  camera.position.set(650, 10, 50); camera.updateMatrixWorld();
  renderer.render(scene, camera);
  ok(lc.filter(c => c.isNear).map(c => c.key).join('|') === '0,0|1,0', 'LOD update throttled within 200 ms');
  await new Promise(r => setTimeout(r, 230));
  renderer.render(scene, camera);
  const near2 = lc.filter(c => c.isNear).map(c => c.key).join('|');
  out.notes.lodNearAt650 = near2;
  ok(near2 === '5,0|6,0|7,0', 'LOD at x=650 after 200 ms: chunks 5,6,7 near, got ' + near2);
  // Hysteresis: at edge distance 125 (between 108 and 132) a near chunk stays near.
  const c7 = lc.find(c => c.key === '7,0');
  camera.position.set(c7.maxX + 125, 10, 50); camera.updateMatrixWorld();
  lod.userData.update(camera, true);
  const stay = c7.isNear;
  camera.position.set(c7.maxX + 140, 10, 50); camera.updateMatrixWorld();
  lod.userData.update(camera, true);
  out.notes.hysteresis = { at125: stay, at140: c7.isNear };
  ok(stay === true && c7.isNear === false, 'hysteresis: near chunk stays near at 125 m (band 108-132), goes far at 140 m');
  // far: null -> hide beyond
  const lod2 = createChunkedLOD({ near: { geometry: geo, material: mat }, far: null, items: lodItems, switchDistance: 120 });
  lod2.userData.update(camera, true);
  ok(lod2.userData.chunks.filter(c => !c.isNear).every(c => !c.near.visible), 'far: null hides distant chunks');
  // Sentinel costs zero draw calls: a far-only LOD group seen from 5 km away draws nothing at all.
  const sc = new THREE.Scene(); sc.add(lod2);
  camera.position.set(5000, 10, 50); camera.lookAt(0, 0, 50); camera.updateMatrixWorld();
  await new Promise(r => setTimeout(r, 230));
  renderer.render(sc, camera);
  out.notes.sentinelOnlyCalls = renderer.info.render.calls;
  ok(renderer.info.render.calls === 0 && lod2.userData.chunks.every(c => !c.near.visible), 'sentinel adds no draw call and auto-hides all chunks (calls ' + renderer.info.render.calls + ')');
  // dispose
  lod.userData.dispose(); g.userData.dispose();
  ok(lod.children.length === 0 && g.children.length === 0, 'dispose removes chunk meshes and sentinel');

  // Scale check: 2000 items over 1 km -> chunks, build time
  const many = []; for (let i = 0; i < 2000; i++) many.push({ x: Math.random() * 1000, z: Math.random() * 700 - 350, ry: Math.random() * 6, color: 0xffffff * Math.random() });
  const t0 = performance.now();
  const big = createChunkedInstances({ geometry: geo, material: mat, items: many });
  out.notes.build2000ms = +(performance.now() - t0).toFixed(1);
  out.notes.build2000chunks = big.userData.chunks.length;
  ok(big.userData.chunks.length <= 80 && big.userData.count === 2000, '2000 items -> <= 80 chunks');
} catch (err) { out.fails.push('threw: ' + (err && err.stack || err)); }
window.__result = out;
</script></body></html>`;

const server = await createServer({
  root: ROOT, base: '/', logLevel: 'error', server: { port: 5291, strictPort: false },
  plugins: [{ name: 'instancing-test-page', configureServer(s) { s.middlewares.use((req, res, next) => { if (req.url.startsWith('/__instancing_test')) { s.transformIndexHtml(req.url, PAGE).then((h) => { res.setHeader('content-type', 'text/html'); res.end(h); }); } else next(); }); } }],
});
await server.listen();
const url = server.resolvedUrls.local[0].replace(/\/$/, '') + '/__instancing_test';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.__result, null, { timeout: 60000 }).catch((e) => { console.error(errors.join('\n')); throw e; });
const res = await page.evaluate(() => window.__result);
await browser.close();
await server.close();
console.log('notes', JSON.stringify(res.notes));
const fails = [...res.fails, ...errors.map((e) => 'console: ' + e)];
if (fails.length) { console.error('FAILED:\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('instancing test: all checks passed');
