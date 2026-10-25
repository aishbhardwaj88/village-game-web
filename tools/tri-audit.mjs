#!/usr/bin/env node
/** Lists the heaviest visible meshes by triangle count (x2 if they cast shadows): node tools/tri-audit.mjs [x z yaw] */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const [x, z, yaw] = process.argv.length > 4 ? process.argv.slice(2).map(Number) : [-60, 20, 0];
const PORT = 5281, BASE = `http://localhost:${PORT}/`;
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
try {
  for (let i = 0; i < 100; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}?proof=1`); await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
  await page.click('#play-btn'); await page.waitForTimeout(4000);
  const r = await page.evaluate(({ x, z, yaw }) => {
    const d = window.__dopahar; d.teleportPlayer(x, z); d.camRig.yaw = yaw; d.camRig.update(10);
    // One forced render (no rAF waits: those hang under swiftshader), then count what is visible and in frustum.
    d.renderer.info.reset(); d.composer.render();
    const cam = d.camera; cam.updateMatrixWorld(); const M = new d.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const e = M.elements, planes = [];
    for (const [a, sg] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]) planes.push([0, 1, 2, 3].map((k) => e[k * 4 + 3] + sg * e[k * 4 + a]));
    const inF = (o) => { const g = o.geometry; if (o.isInstancedMesh) { if (!o.boundingSphere) o.computeBoundingSphere(); } else if (!g.boundingSphere) g.computeBoundingSphere();
      const bs = o.isInstancedMesh ? o.boundingSphere : g.boundingSphere; if (!bs) return true; const c = bs.center.clone().applyMatrix4(o.matrixWorld); const sc = o.matrixWorld.getMaxScaleOnAxis() * bs.radius;
      return planes.every((p) => p[0] * c.x + p[1] * c.y + p[2] * c.z + p[3] >= -sc); };
    const rows = [];
    d.scene.traverse((o) => { if (!o.isMesh) return; let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) { vis = false; break; } if (!vis || !inF(o)) return;
      const g = o.geometry; const tri = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      rows.push([o.name || o.type, (o.parent && o.parent.name) || '', Math.round(tri), o.castShadow]); });
    rows.sort((a, b) => b[2] - a[2]);
    return { info: d.renderer.info.render.triangles, calls: d.renderer.info.render.calls, rows: rows.slice(0, 25), total: rows.reduce((s, r) => s + r[2], 0) };
  }, { x, z, yaw });
  console.log('renderer triangles', r.info, 'calls', r.calls, 'sum of visible mesh tris', r.total);
  for (const row of r.rows) console.log(row.join(' | '));
  await browser.close();
} finally { server.kill(); }
