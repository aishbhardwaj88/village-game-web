#!/usr/bin/env node
/**
 * Flat-wall audit: lists every HOUSE mesh a player can see whose material has no colour texture (a flat-coloured wall,
 * roof or trim). Loads the game in headless Chromium (vite dev, ?dev=1), walks the player through every house area so the
 * distance-streamed clusters/rows build, and at each stop traverses the scene. A mesh counts as a house mesh when its own
 * name or any ancestor's name matches HOUSE (kit houses, abadi rows near + far LOD, bg houses, haveli plots, chauraha
 * edge houses, gully houses, house compound). Hidden sources (layer 1 batch sources) are included because they are what
 * the batch draws; meshes hidden with visible=false at every stop are not.
 *
 *   node tools/flat-wall-audit.mjs            -> summary + the flat list
 *   DISCOVER=1 node tools/flat-wall-audit.mjs -> also prints every top-level group name with flat meshes (to find new houses)
 *
 * Exit code is always 0; the count is the result.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 5291, BASE = `http://localhost:${PORT}/`;
// stops: every house area (kit-house areas, abadi rows N/E/S/W, haveli plots, chauraha, gullies)
const STOPS = [
  ['north_w', 545, -60], ['north_e', 630, -62], ['east', 685, -35], ['east_rich', 712, -45], ['south_e', 650, 62],
  ['south_w', 565, 82], ['west_n', 530, -35], ['west_s', 518, 45], ['outer_w', 505, 50], ['haveli', 612, -22],
  ['gapA', 565, -31], ['gapB', 575, 50], ['gapC', 652, 12], ['chauraha', 603, 20], ['gully', 590, 30],
];
const HOUSE = /house|abadi|haveli|plot|kachcha|chauraha_edge|edge_house|gully|homestead|kit_|hb_main|bg_/i;
const NOT_HOUSE = /people|ambient_life|cattle|lamp|shadow|collider|solids|lanes|decal|sign|board|tree|plant|leaf/i;

const wait = async (u) => { for (let i = 0; i < 120; i++) { try { await fetch(u); return; } catch { await new Promise((r) => setTimeout(r, 300)); } } throw new Error('server'); };
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
try {
  await wait(BASE);
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  const start = async () => {
    await page.goto(`${BASE}?dev=1`, { waitUntil: 'load' });
    await page.waitForSelector('#start-overlay.ready', { timeout: 120000 }).catch(() => {});
    await page.click('#play-btn', { force: true, timeout: 8000 }).catch(() => page.evaluate(() => document.querySelector('#play-btn')?.click()));
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.__dopahar.dialogue._advanceFromInput()).catch(() => {});
  };
  await start();
  const all = new Map(); // key -> record
  const groupsFlat = new Map();
  for (const [stop, x, z] of STOPS) for (let attempt = 0; attempt < 3; attempt++) try {
    await page.evaluate(([x, z]) => { const d = window.__dopahar; d.teleportPlayer(x, z); d.camRig.update(10); }, [x, z]);
    await page.waitForTimeout(4500);
    const rows = await page.evaluate(({ hs, ns }) => {
      const HOUSE = new RegExp(hs, 'i'), NOT = new RegExp(ns, 'i');
      const out = [];
      window.__dopahar.scene.traverse((o) => {
        if (!(o.isMesh || o.isInstancedMesh)) return;
        if (o.isBatchedMesh) return; // batches are drawn from their sources, audited there
        let p = o, vis = true, path = [];
        while (p && !p.isScene) { if (!p.visible && !(p === o && p.layers.mask === 2)) vis = false; path.unshift(p.name || p.type); p = p.parent; }
        if (!vis) return;
        if (o.isInstancedMesh && o.count === 0) return;
        const pathS = path.join('/');
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        // texture tiles per metre on this geometry: uv span / world span over a sample of triangles, times the map repeat
        const g = o.geometry, pos = g.attributes.position, uv = g.attributes.uv;
        let tpm = null;
        if (uv && pos.count >= 3) {
          let su = 0, sw = 0; const idx = g.index;
          const n = Math.min(400, Math.floor((idx ? idx.count : pos.count) / 3));
          const step = Math.max(1, Math.floor((idx ? idx.count : pos.count) / 3 / n));
          for (let t = 0; t < n; t++) {
            const a = idx ? idx.getX(t * step * 3) : t * step * 3, b = idx ? idx.getX(t * step * 3 + 1) : t * step * 3 + 1;
            const dw = Math.hypot(pos.getX(a) - pos.getX(b), pos.getY(a) - pos.getY(b), pos.getZ(a) - pos.getZ(b));
            const du = Math.hypot(uv.getX(a) - uv.getX(b), uv.getY(a) - uv.getY(b));
            if (dw > 1e-4) { su += du; sw += dw; }
          }
          if (sw > 0) tpm = su / sw;
        }
        for (const m of mats) {
          if (!m || m.isMeshBasicMaterial && !m.map && o.visible === false) continue;
          if (m.colorWrite === false || m.visible === false) continue;
          const src = m.map && m.map.source && m.map.source.data;
          const url = src && (src.currentSrc || src.src) ? String(src.currentSrc || src.src).replace(/^.*assets\/textures\//, '') : (m.map ? (m.map.isCanvasTexture ? 'canvas' : m.map.isDataTexture ? 'data' : 'other') : '');
          const rep = m.map ? Math.max(m.map.repeat.x, m.map.repeat.y) : 0;
          const tiles = tpm !== null && m.map ? tpm * rep : null;
          const library = /^[a-z]+\/[a-z]+_color\.webp/.test(url);
          // flat = no colour map, or a map that is not a library photo set, or no normal map, or tiling so fine (> 3 tiles/m) or so coarse (< 0.03) it reads as one colour
          const why = !m.map ? 'no colour map' : !library ? `map not a library set (${url})` : !m.normalMap ? 'no normal map' : tiles !== null && tiles > 3 ? `tiles ${tiles.toFixed(1)}/m (averages to flat)` : tiles !== null && tiles < 0.03 ? `tiles ${tiles.toFixed(3)}/m (stretched flat)` : '';
          const flat = !!why;
          const house = HOUSE.test(pathS) && !NOT.test(pathS);
          out.push({ path: pathS, top: path[0], mat: m.name || m.type, flat, why, url, tiles, house, tris: g.index ? g.index.count / 3 : pos.count / 3 });
        }
      });
      return out;
    }, { hs: HOUSE.source, ns: NOT_HOUSE.source });
    for (const r of rows) {
      if (r.flat) { const gk = r.top + ' [' + r.mat + '] ' + r.why; groupsFlat.set(gk, (groupsFlat.get(gk) || 0) + 1); }
      if (!r.house) continue;
      const k = r.path + '|' + r.mat;
      if (!all.has(k)) all.set(k, { ...r, stop });
    }
    console.error(`stop ${stop}: ${rows.length} mesh-materials seen`);
    break;
  } catch (e) { console.error(`stop ${stop} failed (${e.message.split('\n')[0]}), page reloaded (a dev-server reload from another edit?), retrying`); await start(); }
  const house = [...all.values()];
  const flat = house.filter((r) => r.flat);
  console.log(`HOUSE mesh-materials seen: ${house.length}`);
  console.log(`FLAT (no colour texture): ${flat.length}`);
  for (const r of flat.sort((a, b) => a.path.localeCompare(b.path))) console.log(`  FLAT  ${r.path}  [${r.mat}]  ${r.why}  ${Math.round(r.tris)} tris  (first seen at ${r.stop})`);
  if (process.env.ALL) for (const r of house.sort((a, b) => a.path.localeCompare(b.path))) console.log(`  ok?   ${r.path}  [${r.mat}]  ${r.url}  tiles/m ${r.tiles === null ? '-' : r.tiles.toFixed(2)}`);
  if (process.env.DISCOVER) {
    console.log('\nTop-level groups with any flat mesh-material (all stops):');
    for (const [k, n] of [...groupsFlat].sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${k}`);
  }
  await browser.close();
} finally { server.kill(); }
