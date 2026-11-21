#!/usr/bin/env node
/**
 * S7: before/after proof for the character diet, on the real production build.
 * Serves two builds with `vite preview` (before = plain `vite build`, after = `vite build` + tools/char-diet.mjs), opens
 * ?gather=1&lineup=1&proof=1 in headless chromium (software GL), and for each build:
 *   - bytes downloaded (each character GLB, and the whole page), console errors
 *   - whole-line screenshot, then for EVERY character (the lineup's own Next button): a body shot (standing, facing
 *     the camera, right after the walk) and the face close-up the lineup glides to
 *   - live checks: every character's blink influence goes above 0.5 at least once, and its bones move (animation runs)
 * Writes docs/s7/characters/<name>_{body,face}_{before,after}.png, side-by-side <name>_compare.png, lineup_*.png and
 * docs/s7/characters/proof.json.
 *
 * Usage: node tools/char-proof.mjs [--before dist-before] [--after dist] [--only maa,dada] [--size 960x720]
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const get = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const OUT = resolve(ROOT, 'docs/s7/characters');
mkdirSync(OUT, { recursive: true });
const ORDER = ['sister', 'brother', 'maa', 'dadi', 'dada', 'pitaji', 'sarpanch', 'postman', 'teacher', 'didi'];
const FILE = { didi: 'parlour_didi' };
const ONLY = get('--only', '') ? get('--only', '').split(',') : null;
const [W, H] = get('--size', '960x720').split('x').map(Number);
const LEAN = a.includes('--lean');
const ONLY_VARIANT = get('--variant', null);
const VARIANTS = [
  { name: 'before', dir: get('--before', 'dist-before'), port: 4311 },
  { name: 'after', dir: get('--after', 'dist'), port: 4312 },
];

// The machine is shared with other agents' browsers (one memory pool, ~8 GB): wait until ~3.5 GB is free first.
async function waitForMemory(mb = 3500, maxMin = 15) {
  const free = () => { try { return Number(execSync("free -m | awk '/^Mem:/ {print $7}'").toString()); } catch { return mb; } };
  const t0 = Date.now();
  while (free() < mb && Date.now() - t0 < maxMin * 60000) await new Promise((r) => setTimeout(r, 10000));
  return free();
}

async function serve(dir, port) {
  const p = spawn(process.execPath, [resolve(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--outDir', dir, '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: 'pipe' });
  const base = `http://localhost:${port}/village-game-web/`;
  for (let i = 0; i < 100; i++) { try { const r = await fetch(base); if (r.ok) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 300)); }
  return { p, base };
}

async function run(v, browser) {
  const { p, base } = await serve(v.dir, v.port);
  const res = { variant: v.name, glbBytes: {}, totalBytes: 0, errors: [], blink: {}, moves: {}, shots: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    if (LEAN) {
      // --lean: only the cast's models load; buildings/props/plants keep their placeholders. Same in both builds, so the
      // comparison is fair; it keeps the full-size "before" build inside this shared machine's memory.
      const cast = new Set(ORDER.map((k) => FILE[k] || k));
      await page.route(/assets\/(models|props|plants3d)\/[^/]+\.glb/, (route) => {
        const m = route.request().url().match(/assets\/models\/([a-z_0-9]+)\.glb/);
        if (m && cast.has(m[1])) return route.continue();
        return route.abort();
      });
      // ground/wall/sky textures and sound too: not needed to judge a character (sky light still comes from the shader)
      await page.route(/\.(mp3|ogg|wav|m4a|hdr|exr)(\?|$)/, (route) => route.abort());
    }
    page.on('crash', () => res.errors.push('PAGE CRASHED'));
    page.on('console', (m) => { if (m.type() === 'error') res.errors.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => res.errors.push(`pageerror: ${String(e.message).slice(0, 300)}`));
    page.on('response', async (r) => {
      if (r.request().method() !== 'GET') return;
      try {
        const b = await r.body(); res.totalBytes += b.length;
        const m = r.url().match(/assets\/models\/([a-z_]+)\.glb/);
        if (m) res.glbBytes[m[1]] = b.length;
      } catch { /* redirects etc */ }
    });
    await page.goto(`${base}?gather=1&lineup=1&proof=1`);
    await page.waitForSelector('#start-overlay.ready', { timeout: 120000 }).catch(() => {});
    await page.click('#play-btn').catch(() => {});
    // all ten in the line
    await page.waitForFunction((order) => {
      const d = window.__dopahar; if (!d) return false;
      return order.every((k) => d.scene.getObjectByName(`gather_${k}_model`));
    }, ORDER, { timeout: 240000, polling: 500 });
    await page.waitForTimeout(4000);
    // dismiss any opening dialogue so it never covers a shot
    await page.evaluate(() => { try { const d = window.__dopahar; if (d.dialogue && d.dialogue.isOpen) d.dialogue._advanceFromInput(); } catch (e) { /* none */ } });
    await page.screenshot({ path: `${OUT}/lineup_${v.name}.png` });
    res.shots.push(`lineup_${v.name}.png`);
    // live: blink and bone movement for everyone, sampled for 8 s of page time
    const live = await page.evaluate(async (order) => {
      const d = window.__dopahar, out = { blink: {}, moves: {} };
      const faces = {}, hands = {}, p0 = {};
      for (const k of order) {
        const m = d.scene.getObjectByName(`gather_${k}_model`);
        faces[k] = []; m.traverse((o) => { if (o.morphTargetDictionary && o.morphTargetDictionary.blink !== undefined) faces[k].push(o); if (!hands[k] && o.isBone && /RightHand$/.test(o.name)) hands[k] = o; });
        out.blink[k] = 0; out.moves[k] = 0;
        p0[k] = hands[k] ? hands[k].getWorldPosition(new d.camera.position.constructor()).clone() : null;
      }
      const t0 = performance.now();
      await new Promise((done) => {
        const step = () => {
          for (const k of order) {
            for (const f of faces[k]) out.blink[k] = Math.max(out.blink[k], f.morphTargetInfluences[f.morphTargetDictionary.blink]);
            if (hands[k] && p0[k]) {
              const p = hands[k].getWorldPosition(new d.camera.position.constructor());
              out.moves[k] = Math.max(out.moves[k], p.distanceTo(p0[k]));
            }
          }
          if (performance.now() - t0 < 8000) requestAnimationFrame(step); else done();
        };
        requestAnimationFrame(step);
      });
      return out;
    }, ORDER);
    res.blink = live.blink; res.moves = live.moves;
    // per character: Next button walks through the line in ORDER
    const next = page.locator('button', { hasText: 'Next' });
    for (let i = 0; i < ORDER.length; i++) {
      await next.click();
      const k = ORDER[i];
      if (ONLY && !ONLY.includes(k)) continue;
      // body: after the walk the person snaps back to their spot facing the camera, camera still on the whole body
      await page.waitForFunction(({ k, i, order }) => {
        const d = window.__dopahar, g = d.scene.getObjectByName(`gather_${k}`);
        const j = i === 0 ? 1 : 0, o = d.scene.getObjectByName(`gather_${order[j]}`);
        const want = o.position.x + (i - j) * 1.15;
        return Math.abs(g.position.x - want) < 0.01 && d.camera.fov > 44.9;
      }, { k, i, order: ORDER }, { timeout: 300000, polling: 'raf' });
      await page.screenshot({ path: `${OUT}/${k}_body_${v.name}.png` });
      await page.waitForFunction(() => window.__dopahar.camera.fov < 30.01, null, { timeout: 120000, polling: 'raf' });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${k}_face_${v.name}.png` });
      res.shots.push(`${k}_body_${v.name}.png`, `${k}_face_${v.name}.png`);
      console.log(`${v.name}: ${k} shots done`);
    }
    await ctx.close();
  } finally { p.kill(); }
  return res;
}

// one build at a time, a fresh browser each (two software-GL pages at once ran this 8 GB machine out of memory)
const results = [];
// The machine is shared with other agents' browsers; a page killed for memory is retried after a pause.
for (const v of VARIANTS.filter((x) => !ONLY_VARIANT || x.name === ONLY_VARIANT)) {
  for (let attempt = 1; attempt <= Number(get('--tries', '4')); attempt++) {
    console.log(`${v.name}: attempt ${attempt}, free memory ${await waitForMemory()} MB`);
    const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    try {
      const r = await run(v, browser); r.lean = LEAN;
      writeFileSync(`${OUT}/proof-${v.name}.json`, JSON.stringify(r, null, 2));
      console.log(`${v.name}: done`);
      break;
    } catch (e) {
      console.log(`${v.name}: attempt ${attempt} failed (${String(e.message).split('\n')[0]})`);
      await new Promise((r) => setTimeout(r, 45000));
    } finally { await browser.close().catch(() => {}); }
  }
}
for (const v of VARIANTS) { if (existsSync(`${OUT}/proof-${v.name}.json`)) results.push(JSON.parse(readFileSync(`${OUT}/proof-${v.name}.json`, 'utf8'))); }
if (results.length < 2) { console.log('only one build measured so far; run the other with --variant'); process.exit(0); }

// side by side: [body before | body after | face before | face after] with labels
const label = (t) => Buffer.from(`<svg width="${W}" height="40"><rect width="100%" height="100%" fill="black"/><text x="12" y="28" font-family="sans-serif" font-size="24" fill="white">${t}</text></svg>`);
for (const k of ORDER) {
  if (!existsSync(`${OUT}/${k}_face_before.png`) || !existsSync(`${OUT}/${k}_face_after.png`)) continue;
  const tiles = [['body', 'before'], ['body', 'after'], ['face', 'before'], ['face', 'after']];
  const comp = [];
  tiles.forEach(([s, v], n) => {
    const x = (n % 2) * W, y = Math.floor(n / 2) * (H + 40);
    comp.push({ input: label(`${k} ${s}: ${v === 'before' ? 'BEFORE (original)' : 'AFTER (slim)'}`), left: x, top: y });
    comp.push({ input: `${OUT}/${k}_${s}_${v}.png`, left: x, top: y + 40 });
  });
  await sharp({ create: { width: W * 2, height: (H + 40) * 2, channels: 3, background: '#000' } }).composite(comp).png().toFile(`${OUT}/${k}_compare.png`);
}
await sharp({ create: { width: W * 2, height: H + 40, channels: 3, background: '#000' } }).composite([
  { input: label('whole line: BEFORE'), left: 0, top: 0 }, { input: `${OUT}/lineup_before.png`, left: 0, top: 40 },
  { input: label('whole line: AFTER'), left: W, top: 0 }, { input: `${OUT}/lineup_after.png`, left: W, top: 40 },
]).png().toFile(`${OUT}/lineup_compare.png`);

const [b, af] = results;
const castBytes = (r) => ORDER.reduce((s, k) => s + (r.glbBytes[FILE[k] || k] || 0), 0);
const newErrors = af.errors.filter((e) => !b.errors.includes(e));
const summary = {
  when: new Date().toISOString(), viewport: `${W}x${H}`,
  perCharacterMB: Object.fromEntries(ORDER.map((k) => [k, { before: +((b.glbBytes[FILE[k] || k] || 0) / 1048576).toFixed(2), after: +((af.glbBytes[FILE[k] || k] || 0) / 1048576).toFixed(2) }])),
  castMB: { before: +(castBytes(b) / 1048576).toFixed(1), after: +(castBytes(af) / 1048576).toFixed(1) },
  wholePageMB: { before: +(b.totalBytes / 1048576).toFixed(1), after: +(af.totalBytes / 1048576).toFixed(1) },
  blinkMax: { before: b.blink, after: af.blink },
  handMovedM: { before: b.moves, after: af.moves },
  errors: { before: b.errors, after: af.errors, newInAfter: newErrors },
};
writeFileSync(`${OUT}/proof.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ castMB: summary.castMB, wholePageMB: summary.wholePageMB, newErrors: newErrors.length, blinkAfter: af.blink }, null, 1));
