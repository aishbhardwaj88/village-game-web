#!/usr/bin/env node
/** Lists every visible, frustum-passing draw item for one fixed zone camera (same as world-validator check 8a):
 *  node tools/draw-call-audit.mjs <x> <z> <yaw>   (uses ?proof=1, dev server) */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const [x, z, yaw] = process.argv.slice(2).map(Number);
const PORT = 5277, BASE = `http://localhost:${PORT}/`;
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
try {
  for (let i = 0; i < 100; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}?proof=1`); await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
  await page.click('#play-btn'); await page.waitForTimeout(3500);
  const r = await page.evaluate(({ x, z, yaw }) => {
    const d = window.__dopahar; d.teleportPlayer(x, z); d.camRig.yaw = yaw; d.camRig.pitch = -0.15; d.camRig.distance = 5; d.camRig.update(10);
    return new Promise((res) => { let n = 0; const f = () => { if (++n < 6) requestAnimationFrame(f); else {
      const cam = d.camera; cam.updateMatrixWorld(); const M = new d.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      const e = M.elements, planes = [];
      for (const [a, sg] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]) planes.push([0, 1, 2, 3].map((k) => e[k * 4 + 3] + sg * e[k * 4 + a]));
      const inFrustum = (o) => { if (o.isInstancedMesh && !o.boundingSphere) o.computeBoundingSphere(); if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const bs = o.isInstancedMesh ? o.boundingSphere : o.geometry.boundingSphere; if (!bs) return true; const c = bs.center.clone().applyMatrix4(o.matrixWorld); const sc = o.matrixWorld.getMaxScaleOnAxis() * bs.radius; return planes.every((p) => p[0] * c.x + p[1] * c.y + p[2] * c.z + p[3] >= -sc * 1.0); };
      const rows = [];
      d.scene.traverse((o) => {
        if (!(o.isMesh || o.isPoints || o.isLine)) return;
        let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) { vis = false; break; }
        if (!vis) return; if (!o.frustumCulled === false && o.isMesh && !inFrustum(o)) return;
        rows.push([o.name || o.type, Array.isArray(o.material) ? o.material.map(m=>m.name).join('+') : (o.material && o.material.name) || '', o.castShadow ? 'S' : '-', o.isInstancedMesh ? 'I' : '', o.parent && o.parent.name]);
      });
      res({ calls: d.renderer.info.render.calls, rows });
    } }; requestAnimationFrame(f); });
  }, { x, z, yaw });
  console.log('renderer calls', r.calls, 'visible meshes', r.rows.length, 'casting', r.rows.filter(a => a[2] === 'S').length);
  for (const row of r.rows) console.log(row.join(' | '));
  await browser.close();
} finally { server.kill(); }
