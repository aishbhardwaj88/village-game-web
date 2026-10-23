#!/usr/bin/env node
/** Greenery placement audit: lists every plant/tree/crop instance standing inside a water or tank footprint, or up on a roof.
 *  node tools/greenery-audit.mjs   (dev server, ?proof=1). Prints a report; exit 1 if any bad placement. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const PORT = 5278, BASE = `http://localhost:${PORT}/`;
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
try {
  for (let i = 0; i < 100; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}?proof=1`); await page.waitForSelector('#start-overlay.ready', { timeout: 60000 }).catch(() => {});
  await page.click('#play-btn'); await page.waitForTimeout(4000);
  const r = await page.evaluate(() => {
    const d = window.__dopahar; const S = d.scene; S.updateMatrixWorld(true);
    const WATER = /water|hauz|pond|johad|trough|tank|naali|drain|canal|matka|ghada|bucket|tub/i;
    const PLANT = /tuft|scrub|flowering|plant|tree|crop|wheat|cane|sabzi|grass|leaf|canopy|banana|marigold|foliage|bush/i;
    const names = {}; const water = []; const plants = [];
    const V = new d.Vector3();
    S.traverse((o) => {
      if (!(o.isMesh)) return;
      const chain = []; for (let p = o; p; p = p.parent) chain.push(p.name || '');
      const label = chain.join('/');
      const mat = (Array.isArray(o.material) ? o.material[0] : o.material) || {};
      const isWater = WATER.test(o.name || '') || WATER.test(mat.name || '') || (chain.slice(0, 3).some((n) => /hauz|pond|johad|trough|waterc|water_corner|canal/i.test(n)) && WATER.test(mat.name || o.name || ''));
      if (o.isInstancedMesh) { const k = (o.name || mat.name || '(unnamed)') + '|' + chain.slice(1, 3).join('/'); names[k] = (names[k] || 0) + o.count; }
      if (isWater && !o.isInstancedMesh) {
        o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
        water.push({ name: label.slice(0, 80), mat: mat.name, b: [b.min.x, b.min.z, b.max.x, b.max.z, b.min.y, b.max.y].map((v) => +v.toFixed(2)) });
      }
      if (o.isInstancedMesh && PLANT.test((o.name || '') + ' ' + (mat.name || ''))) {
        const m = new d.Matrix4();
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); m.premultiply(o.matrixWorld); V.setFromMatrixPosition(m); plants.push({ mesh: o.name || mat.name, x: +V.x.toFixed(2), y: +V.y.toFixed(2), z: +V.z.toFixed(2) }); }
      }
    });
    return { names, water, plants };
  });
  // Stream every site in: stand at each, then collect water footprints from named groups.
  const sites = await page.evaluate(() => [...new Set(window.__dopahar.freeRoam?.places?.map?.((p) => p.id) || [])]);
  const SITES = [[-132, 70], [78, 105], [-40, -8], [-14, 30], [16, 75.7], [-82.8, 90], [-44, 141.2], [-4.9, 122], [-125, -35], [150, -30]];
  const extra = await page.evaluate(async (SITES) => {
    const d = window.__dopahar; const out = { water: [], plants: [], groups: [] };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const V = new d.Vector3();
    for (const [x, z] of SITES) {
      d.teleportPlayer(x, z); await wait(1800);
      d.scene.updateMatrixWorld(true);
      d.scene.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh) return;
        const mat = (Array.isArray(o.material) ? o.material[0] : o.material) || {};
        const nm = (o.name || '') + ' ' + (mat.name || '');
        if (!/water|hauz|pond|johad|trough/i.test(nm)) return;
        let chain = []; for (let p = o; p; p = p.parent) chain.push(p.name || '');
        o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
        out.water.push({ name: chain.slice(0, 3).join('/') + '>' + (o.name || ''), mat: mat.name, b: [b.min.x, b.min.z, b.max.x, b.max.z, b.min.y, b.max.y].map((v) => +v.toFixed(2)) });
      });
    }
    const seen = new Set(); out.water = out.water.filter((w) => { const k = w.name + w.b.join(); if (seen.has(k)) return false; seen.add(k); return true; });
    d.scene.traverse((o) => { if (!o.isInstancedMesh) return; const mat = o.material || {}; if (!/tuft|scrub|flowering|plant|crop|canal_bank|verge/i.test((o.name || '') + (mat.name || ''))) return;
      const m = new d.Matrix4(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); m.premultiply(o.matrixWorld); V.setFromMatrixPosition(m); out.plants.push({ mesh: o.name, x: +V.x.toFixed(2), y: +V.y.toFixed(2), z: +V.z.toFixed(2) }); } });
    return out;
  }, SITES);
  r.water.push(...extra.water); r.plants = extra.plants;
  console.log('InstancedMesh kinds:'); for (const [k, v] of Object.entries(r.names)) console.log('  ', v, k);
  console.log('water-ish meshes:', r.water.length, ' plant instances:', r.plants.length);
  const bad = [];
  for (const p of r.plants) {
    if (p.y > 1.8) bad.push({ ...p, why: 'on a roof/high (y ' + p.y + ')' });
    for (const w of r.water) { const [x0, z0, x1, z1, y0, y1] = w.b; if ((x1 - x0) > 60 || (z1 - z0) > 60) continue; if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) bad.push({ ...p, why: 'inside ' + w.name + ' [' + w.mat + ']' }); }
  }
  for (const p of r.plants) for (const k of [{ x: -36.1, z: -7.6, r: 3.0 }, { x: -34.2, z: -3.8, r: 2.6 }, { x: -132, z: 70, r: 11 }, { x: 78, z: 105, r: 8 }]) if (Math.hypot(p.x - k.x, p.z - k.z) < k.r) bad.push({ ...p, why: 'inside known water ' + k.x + ',' + k.z });
  for (const p of r.plants) if (p.z > 30.2 && p.z < 35.8 && p.x > -28 && p.x < 0 && !/canal_bank/.test(p.mesh)) bad.push({ ...p, why: 'in canal channel' });
  console.log('BAD placements:', bad.length);
  const by = {}; for (const b of bad) { const k = b.mesh + ' :: ' + b.why; (by[k] ||= []).push(b); }
  for (const [k, a] of Object.entries(by)) console.log('  ', a.length, k, 'e.g.', a[0].x, a[0].z);
  console.log('WATER LIST'); for (const w of r.water) console.log('  ', w.name, '|', w.mat, '|', w.b.join(','));
  await browser.close();
  process.exitCode = bad.length ? 1 : 0;
} finally { server.kill(); }
