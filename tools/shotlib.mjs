/**
 * Shared clean-capture helpers for every proof screenshot (FEEDBACK 24 Oct item 0a,
 * ART_REVIEW standing rules 1-5). Makes the rules automatic instead of remembered:
 *   - no fps counter / dev overlay / tutorial / dialogue / HUD text in frame
 *   - no capsule placeholder people and no player capsule in frame
 *   - the real fps is measured and every headless shot is labelled as headless
 *   - a named subject must be in frame and not fully occluded, or the capture throws
 *
 * Usage (from any tmp/*.mjs or tools/*.js script, after the game is started):
 *   import { startGame, cleanCapture, cleanup } from '../tools/shotlib.mjs';
 *   const g = await startGame({ port: 5330 });
 *   await g.page.evaluate(([x,z]) => window.__dopahar.teleportPlayer(x,z), [x,z]);
 *   await g.page.evaluate(() => window.__dopahar.photoCamera({ pos:[..], target:[..], fov:60 }));
 *   await cleanCapture(g.page, 'docs/shots/x/y.png', { subject: { point: [x,y,z], radius: 3 } });
 *   await g.close();
 *
 * Subject forms:  { name: 'sceneObjectName' }  |  { point: [x,y,z], radius?: m }
 *                 |  { box: [minX,minY,minZ,maxX,maxY,maxZ] }
 * Pass { people: true } to keep capsule people visible (only for shots whose subject
 * IS a person); the shot is then not eligible as a proof of anything else.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const HIDE_CSS = `
  #fps-counter, #dialogue-panel, #objective-panel, #interact-hint, #attach-hint,
  #money-panel, #toast, #job-hud, #waypoint-arrow, #minimap-wrap, #touch-controls,
  #pause-btn-touch, #top-right-stack { display: none !important; }
`;

export async function startGame({ port = 5330, viewport = { width: 1280, height: 800 }, dismissTutorial = true } = {}) {
  const base = `http://localhost:${port}/`;
  const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
  server.stderr.on('data', () => {});
  for (let i = 0; i < 100; i++) {
    try { await fetch(base); break; } catch { await new Promise((r) => setTimeout(r, 300)); }
  }
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
  });
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(`${base}?dev=1`, { waitUntil: 'load' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
  await page.click('#play-btn');
  await page.waitForTimeout(2500);
  if (dismissTutorial) await dismissOverlays(page);
  return {
    page, errors,
    close: async () => { await browser.close(); server.kill(); },
  };
}

/** Closes the tutorial / any dialogue and keeps it closed. */
export async function dismissOverlays(page) {
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => { try { window.__dopahar?.dialogue?._advanceFromInput(); } catch {} });
    await page.waitForTimeout(150);
  }
}

/** Measures real fps over ~1.5 s of rAF. */
export async function measureFps(page, ms = 1500) {
  return page.evaluate((ms) => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(Math.round((n * 1000) / (performance.now() - t0) * 10) / 10); };
    requestAnimationFrame(f);
  }), ms);
}

/** Hide overlays, player and capsule people. Returns a restore() fn. */
export async function hideForCapture(page, { people, player = false }) {
  await page.evaluate((css) => { if (document.getElementById('shot-hide-css')) return; const st = document.createElement('style'); st.id = 'shot-hide-css'; st.textContent = css; document.head.appendChild(st); }, HIDE_CSS);
  await page.evaluate(({ people, player }) => {
    const d = window.__dopahar;
    d.__hidden = [];
    const hide = (o) => { if (o.visible) { o.visible = false; d.__hidden.push(o); } };
    if (d.player && !player) hide(d.player);
    if (!people) {
      for (const n of d.npcs || []) hide(n);
      d.scene.traverse((o) => {
        if (o.isMesh && o.geometry && o.geometry.type === 'CapsuleGeometry') hide(o.parent && o.parent.isGroup && o.parent !== d.scene ? o.parent : o);
        else if (/^(npc_|person|people|villager|crowd|ped_|bazaar_life)/i.test(o.name || '')) hide(o);
      });
    }
  }, { people, player });
}
export async function restoreAfterCapture(page) {
  await page.evaluate(() => { document.getElementById('shot-hide-css')?.remove(); const d = window.__dopahar; for (const o of d.__hidden || []) o.visible = true; d.__hidden = []; });
}

/** In-page: is the subject in frame and not fully occluded? Returns a report. */
async function checkSubject(page, subject) {
  return page.evaluate((subject) => {
    const d = window.__dopahar;
    const cam = d.camera;
    const V = d.Vector3;
    cam.updateMatrixWorld(true);
    let box; let root = null;
    if (subject.name) {
      d.scene.traverse((o) => { if (o.name === subject.name && !root) root = o; });
      if (!root) return { ok: false, why: `subject '${subject.name}' not found in scene` };
      box = new d.Box3().setFromObject(root, true);
    } else if (subject.box) {
      const b = subject.box; box = new d.Box3(new V(b[0], b[1], b[2]), new V(b[3], b[4], b[5]));
    } else if (subject.point) {
      const r = subject.radius ?? 2; const p = subject.point;
      box = new d.Box3(new V(p[0] - r, p[1] - 0.2, p[2] - r), new V(p[0] + r, p[1] + r, p[2] + r));
    } else return { ok: false, why: 'no subject given' };
    // Sample a 3x3x3 grid of points inside the subject box and test each.
    const samples = [];
    for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.15, 0.5, 0.85]) for (const fz of [0.15, 0.5, 0.85]) {
      samples.push(new V(box.min.x + (box.max.x - box.min.x) * fx, box.min.y + (box.max.y - box.min.y) * fy, box.min.z + (box.max.z - box.min.z) * fz));
    }
    const rc = new (d.Raycaster)();
    const occluders = [];
    d.scene.traverse((o) => { if ((o.isMesh) && o.visible) { let a = o, vis = true; while (a) { if (!a.visible) { vis = false; break; } a = a.parent; } if (vis) occluders.push(o); } });
    let inFrame = 0, unoccluded = 0;
    const isUnder = (o) => { if (!root) return false; for (let a = o; a; a = a.parent) if (a === root) return true; return false; };
    for (const s of samples) {
      const n = s.clone().project(cam);
      if (n.z > 1 || n.x < -1 || n.x > 1 || n.y < -1 || n.y > 1) continue;
      inFrame++;
      const dir = s.clone().sub(cam.position); const dist = dir.length(); dir.normalize();
      rc.set(cam.position, dir); rc.far = dist + 0.01;
      const hits = rc.intersectObjects(occluders, false);
      const first = hits.find((h) => !(h.object.material && h.object.material.transparent && h.object.material.opacity < 0.2));
      if (!first || first.distance >= dist - 0.6 || isUnder(first.object)) unoccluded++;
    }
    return { ok: inFrame >= 3 && unoccluded >= 2, inFrame, unoccluded, total: samples.length, why: inFrame < 3 ? 'subject not in frame' : 'subject occluded' };
  }, subject);
}

/**
 * The one capture function proof shots should use. Throws if the subject is not
 * visibly in frame. Returns { path, fps, headless }.
 */
export async function cleanCapture(page, path, { subject, people = false, player = false, settleMs = 1200 } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  await dismissOverlays(page);
  await hideForCapture(page, { people, player });
  await page.waitForTimeout(settleMs);
  try {
    if (subject) {
      const r = await checkSubject(page, subject);
      if (!r.ok) throw new Error(`SUBJECT CHECK FAILED for ${path}: ${r.why} (in frame ${r.inFrame}/${r.total}, unoccluded ${r.unoccluded})`);
    } else {
      console.warn(`WARNING: ${path} captured without a subject check - not eligible as proof of a specific item`);
    }
    const fps = await measureFps(page);
    await page.screenshot({ path });
    console.log(`captured ${path}  [HEADLESS SwiftShader software GL, ${fps} fps - look/layout evidence only, not a performance measure]`);
    return { path, fps, headless: true };
  } finally {
    await restoreAfterCapture(page);
  }
}
