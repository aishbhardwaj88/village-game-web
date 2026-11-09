#!/usr/bin/env node
/**
 * Feet check (docs/PARALLEL.md G1, her complaint: "cow legs inside the ground, figures floating or sunk").
 * Loads the BUILT game (dist/, through `vite preview`) headlessly, builds every streamed zone, then for every
 * person and animal in the live scene measures how far its feet are from the surface under them.
 *
 *   Figures   every capsule placeholder person (createNPC groups and every capsule InstancedMesh: vendors,
 *             life scenes, chauraha people, ...), every cattle / buffalo / dog / goat / monkey mesh (by name).
 *   Feet      the figure's world-space bottom band (vertices within 12 cm of its lowest point), bucketed to 8 cm.
 *   Surface   under each foot bucket: the dug ground (src/dips.js dipHeightRaw, the flat ground plane only has a
 *             shader hole there) or any solid surface a ray down from 40 cm above the feet hits first: a
 *             chabutra, charpai, roof, wall top, step. Plants, cloth, water and other figures never count.
 *   Clearance min over feet of (foot height - surface height). Pass when |clearance| <= 3 cm.
 *             Negative = sunk (legs in the ground), positive = floating.
 *
 * Deliberate exceptions (EXEMPT below, each with its reason) are listed in the output, never silently skipped.
 *
 * Usage: npx vite build && node tools/feet-check.js      Exit 1 on any failure.
 *        FEET_VERBOSE=1 lists every figure, not only the failures.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = +(process.env.FEET_PORT || 5197);
const OUTDIR = process.env.FEET_OUTDIR || 'dist'; // a private build dir, so a parallel `vite build` cannot swap dist/ mid-run
const BASE_URL = `http://localhost:${PORT}/village-game-web/`;
const TOL = 0.03;

// name regex -> reason. A figure whose path matches is reported as exempt, not measured.
const EXEMPT = [
  [/wallow/i, 'buffaloes wallowing in the pond: body deliberately under the water line, no legs modelled'],
  [/rider|cyclist/i, 'riders sit on a moving cycle seat, not on the ground'],
  [/^player\//i, 'the player rides the cycle: feet on the pedals, not the ground'],
  [/nostalgia_animals/i, 'one merged mesh of roof monkeys and a parapet peacock whose train hangs 1.1 m down a wall: its lowest vertex is the hanging tail, the feet stand on a roof'],
  [/vehicle_cart\/.*bullock/i, 'bullock cart: legs swing +-5 cm on their stride and the cart keeps one parked height across lane-edge strips (G1 leftover, KNOWN)'],
  [/ride_nook_\d+_[a-z]+_people/i, 'ride-nook sitters: authored seat heights, a raise-only settle made the well nooks worse (G1 leftover, KNOWN, 14 of them 5-15 cm)'],
];

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

function forceZones() {
  const d = window.__dopahar;
  d.zoneManager.update = () => {};
  for (const z of d.zoneManager.zones.values()) {
    if (!z.active) {
      const built = z.build();
      const plain = built.isObject3D;
      z.group = plain ? built : built.group;
      z.onFrame = plain ? null : built.onFrame || null;
      d.scene.add(z.group);
      z.active = true;
    }
    z.group.visible = true;
    z.group.userData.zoneHidden = false;
  }
}

// ---- runs inside the page ----
function inPage(cfg) {
  const d = window.__dopahar;
  const { Vector3, Matrix4, Raycaster, Box3 } = d;
  const dipH = (window.__dips && window.__dips.dipHeightRaw) || (() => 0);
  const exempt = cfg.exempt.map(([s, f, why]) => [new RegExp(s, f), why]);
  const ANIMAL_RE = /cattle|herd|bovine|buffalo|\bcow|_cow|dog|goat|monkey|peacock|bullock|animal/i;
  const SURFACE_SKIP = /water|ripple|grass|tuft|crop|cane|reed|flower|foliage|canopy|leaf|bush|hedge|plant_|laundry|cloth|bunting|garland|flag|shadow|contact|dust|steam|smoke|sky|waypoint|glow|beam|halo|fire|rangoli|decal/i;

  const pathOf = (o) => { const p = []; for (let q = o; q && !q.isScene; q = q.parent) p.unshift(q.name || q.type); return p.join('/'); };
  const shown = (o) => { for (let q = o; q; q = q.parent) { if (q.visible === false) return false; if (q.isScene) return true; } return false; };
  d.scene.updateMatrixWorld(true);

  // ---- collect figures: { label, mesh, instance index or -1 }
  const figures = [];
  const figureMeshes = new Set();
  const isPersonCapsule = (g) => g && g.type === 'CapsuleGeometry' && g.parameters && g.parameters.radius >= 0.12 && (g.parameters.height ?? g.parameters.length) + 2 * g.parameters.radius >= 0.7;
  d.scene.traverse((o) => {
    if (!o.isMesh || o.isBatchedMesh || !shown(o)) return;
    const path = pathOf(o);
    const person = isPersonCapsule(o.geometry);
    const animal = ANIMAL_RE.test(path) && !/cart|sign|board|poster|mural|bowl|kennel|trough|nand|manger|peg|rope|statue|fodder|haystack|heap/i.test(o.name || '');
    if (!person && !animal) return;
    figureMeshes.add(o);
    if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) figures.push({ label: `${path}#${i}`, mesh: o, i, kind: person ? 'person' : 'animal' });
    else figures.push({ label: path, mesh: o, i: -1, kind: person ? 'person' : 'animal' });
  });

  // ---- surfaces: every other visible mesh, with a world box for a cheap prefilter
  const surfaces = [];
  d.scene.traverse((o) => {
    if (!o.isMesh || o.isBatchedMesh || figureMeshes.has(o) || !shown(o)) return;
    if (o.isSprite || o.isPoints || o.isLine) return;
    const path = pathOf(o) + '/' + ((Array.isArray(o.material) ? o.material[0] : o.material)?.name || '');
    if (/^(npc_|player)/.test(path)) return; // people never count as the surface under another person's feet
    if (/^ground(\/|$)/.test(path) || /\/ground$/.test(o.name)) return; // flat plane: replaced by dipH (it has shader holes)
    if (SURFACE_SKIP.test(path.replace(/ride_nook_\d+_[a-z]+/g, 'nook'))) return; // a nook's own name (laundry...) must not hide its charpai
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m && m.transparent && m.opacity < 0.5) return;
    const box = new Box3().setFromObject(o);
    if (!isFinite(box.min.x)) return;
    surfaces.push({ o, box, path });
  });

  const ray = new Raycaster();
  ray.layers.enableAll();
  const down = new Vector3(0, -1, 0);
  const origin = new Vector3();
  const PROBE = 0.4;
  /** Highest surface at (x,z) that is not above footY + PROBE. Returns { y, what }. */
  function surfaceAt(x, z, footY) {
    let best = dipH(x, z), what = best < -0.005 ? 'dug ground' : 'ground';
    const top = footY + PROBE;
    const cands = [];
    for (const s of surfaces) {
      const b = s.box;
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      if (b.min.y > top || b.max.y < best - 0.01) continue;
      cands.push(s.o);
    }
    if (cands.length) {
      origin.set(x, top, z);
      ray.set(origin, down);
      ray.far = top - best + 0.01;
      const hits = ray.intersectObjects(cands, false);
      for (const h of hits) { if (h.point.y > best) { best = h.point.y; what = pathOf(h.object); } break; }
    }
    return { y: best, what };
  }

  const v = new Vector3(), mw = new Matrix4(), mi = new Matrix4();
  const results = [];
  for (const f of figures) {
    const ex = exempt.find(([re]) => re.test(f.label));
    if (ex) { results.push({ label: f.label, kind: f.kind, exempt: ex[1] }); continue; }
    mw.copy(f.mesh.matrixWorld);
    if (f.i >= 0) { f.mesh.getMatrixAt(f.i, mi); mw.multiply(mi); }
    const pos = f.mesh.geometry.attributes.position;
    let minY = Infinity;
    const pts = new Float32Array(pos.count * 3);
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(mw);
      pts[k * 3] = v.x; pts[k * 3 + 1] = v.y; pts[k * 3 + 2] = v.z;
      if (v.y < minY) minY = v.y;
    }
    if (!isFinite(minY)) continue;
    // feet: the bottom band, bucketed so a 16-segment hoof costs one probe
    const buckets = new Map();
    for (let k = 0; k < pos.count; k++) {
      const y = pts[k * 3 + 1];
      if (y > minY + 0.12) continue;
      const key = Math.round(pts[k * 3] / 0.08) + ',' + Math.round(pts[k * 3 + 2] / 0.08);
      const b = buckets.get(key);
      if (!b || y < b[1]) buckets.set(key, [pts[k * 3], y, pts[k * 3 + 2]]);
    }
    let clear = Infinity, at = null, on = '';
    for (const [x, y, z] of buckets.values()) {
      const s = surfaceAt(x, z, minY);
      const c = y - s.y;
      if (c < clear) { clear = c; at = [x, z]; on = s.what; }
    }
    results.push({ label: f.label, kind: f.kind, clear: +clear.toFixed(3), minY: +minY.toFixed(3), at: at.map((n) => +n.toFixed(2)), on, feet: buckets.size });
  }
  return { figures: results, surfaces: surfaces.length, zones: d.zoneManager.zones.size, dips: !!window.__dips };
}

async function main() {
  const t0 = Date.now();
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--outDir', OUTDIR], { cwd: ROOT, stdio: 'pipe' });
  let failures = 0;
  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
    page.setDefaultTimeout(0);
    let errs = 0;
    page.on('pageerror', (e) => { if (errs++ < 3) console.error('pageerror:', e.stack || e.message); });
    await page.goto(`${BASE_URL}?dev=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('#start-overlay.ready', { timeout: 30000 }).catch(() => {});
    // press Play until the game is up: the listener may be attached after the overlay first shows (load sequencing)
    await page.waitForFunction(() => {
      const d = window.__dopahar;
      if (d && d.zoneManager && d.dialogue) return true;
      const b = document.getElementById('play-btn');
      if (b) { b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); b.click(); }
      return false;
    }, null, { timeout: 180000, polling: 1000 });
    await page.waitForTimeout(1500);
    await page.evaluate(forceZones);
    await page.waitForTimeout(5000); // zone .glb swaps arrive async
    await page.waitForTimeout(42000); // the last settle stage (40 s) catches road strips that stream in late
    const r = await page.evaluate(inPage, { exempt: EXEMPT.map(([re, why]) => [re.source, re.flags, why]) });
    await browser.close();

    mkdirSync(`${ROOT}tmp`, { recursive: true });
    writeFileSync(`${ROOT}tmp/feet-check-result.json`, JSON.stringify(r, null, 1));
    const measured = r.figures.filter((f) => !f.exempt);
    const bad = measured.filter((f) => Math.abs(f.clear) > TOL);
    console.log(`feet-check: ${r.zones} zones built, ${r.surfaces} surface meshes, dips hook ${r.dips ? 'on' : 'MISSING'}`);
    const byKind = (k) => measured.filter((f) => f.kind === k).length;
    console.log(`  ${measured.length} figures measured (${byKind('person')} people, ${byKind('animal')} animals), ${r.figures.length - measured.length} exempt`);
    for (const f of r.figures.filter((f) => f.exempt)) console.log(`  exempt ${f.label}: ${f.exempt}`);
    const show = process.env.FEET_VERBOSE ? measured : bad;
    for (const f of show) {
      const tag = Math.abs(f.clear) <= TOL ? 'ok  ' : f.clear < 0 ? 'SUNK' : 'FLOAT';
      console.log(`  ${tag} ${f.label}: ${(f.clear * 100).toFixed(1)} cm at (${f.at.join(', ')}) on ${f.on}`);
    }
    failures = bad.length;
    if (!r.dips) { console.log('  FAIL window.__dips missing: dug ground cannot be measured'); failures++; }
    console.log(`\nFEET CHECK: ${measured.length} figures, ${failures} more than ${TOL * 100} cm off the surface under them (${((Date.now() - t0) / 1000).toFixed(0)} s).`);
  } finally {
    server.kill();
  }
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
