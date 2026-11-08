// Settle-aware draw-call measurement per view (P1, 9 Nov).
// Same camera convention as world-validator check 8a (anchor, +-10 m, yaw 0 / PI, pitch -0.15, distance 5),
// plus views on the four chauraha arms looking both away from and back toward the ring.
// Each view waits until renderer.info.render.calls holds steady for 6 reads 250 ms apart (cap 40 s), so the
// lazy-built scenes (arm frontage, gully life, main-road life) are in before the reading is taken.
// Attribution: renderer.renderBufferDirect is wrapped for one frame, so every real draw (main pass AND shadow
// pass) is tallied to its top-level scene group. Run against the preview build:
//   npm run build:unchecked && node tools/perf-check-zones.mjs [--groups] [--only=bazaar,haveli]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const PORT = 5211, URL_ = `http://localhost:${PORT}/village-game-web/`;
const SHOW_GROUPS = process.argv.includes('--groups');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',') : null;

const RING = { x: 602.9, z: 19.9 };
const VIEWS = [];
for (const id of ['bazaar', 'chowk', 'school', 'haveli', 'gaushala', 'baagh', 'temple', 'mandi']) {
  for (const yaw of [0, Math.PI]) VIEWS.push({ name: `${id}@${yaw ? 'pi' : '0'}`, zone: id, anchor: id, yaw });
}
// Arms: 60 m out on each axis. Camera yaw such that the camera looks along +/- the arm.
// camRig: camera sits behind the player opposite its look direction; yaw 0 looks toward -z (validator stands at z+10).
const ARMS = [
  { arm: 'S', dx: 0, dz: -80 }, { arm: 'N', dx: 0, dz: 80 },
  { arm: 'E', dx: 80, dz: 0 }, { arm: 'W', dx: -80, dz: 0 },
];
for (const a of ARMS) {
  // look away from ring = look in direction (dx,dz). yaw 0 looks -z => yaw = atan2(-dx, -dz)
  const away = Math.atan2(-a.dx, -a.dz);
  VIEWS.push({ name: `arm${a.arm}-away`, zone: 'arm', x: RING.x + a.dx, z: RING.z + a.dz, yaw: away });
  VIEWS.push({ name: `arm${a.arm}-toring`, zone: 'arm', x: RING.x + a.dx, z: RING.z + a.dz, yaw: away + Math.PI });
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const waitServer = async () => { for (let i = 0; i < 100; i++) { try { await fetch(URL_); return; } catch { await new Promise((r) => setTimeout(r, 300)); } } throw new Error('no server'); };

try {
  await waitServer();
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${URL_}?dev=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 180000 }).catch(() => {});
  await page.click('#play-btn');
  await page.waitForTimeout(3000);
  await page.evaluate(() => { try { window.__dopahar.dialogue._advanceFromInput(); } catch {} });
  // install the per-group tally hook once
  await page.evaluate(() => {
    const d = window.__dopahar, r = d.renderer;
    const orig = r.renderBufferDirect.bind(r);
    window.__tally = null;
    r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      if (window.__tally) {
        let top = object; while (top.parent && !top.parent.isScene) top = top.parent;
        const key = (camera.isOrthographicCamera ? 'SHADOW:' : '') + (top.name || object.name || object.type);
        window.__tally[key] = (window.__tally[key] || 0) + 1;
      }
      return orig(camera, scene, geometry, material, object, group);
    };
  });
  const results = [];
  for (const v of VIEWS) {
    if (ONLY && !ONLY.some((o) => v.name.startsWith(o))) continue;
    await page.evaluate((v) => {
      const d = window.__dopahar;
      let x = v.x, z = v.z;
      if (v.anchor) { const a = d.ANCHORS[v.anchor]; x = a.x; z = a.z + (v.yaw === 0 ? 10 : -10); }
      d.teleportPlayer(x, z);
      d.camRig.yaw = v.yaw; d.camRig.pitch = -0.15; d.camRig.distance = 5; d.camRig.update(10);
    }, v);
    let last = -1, stable = 0, i = 0;
    for (; i < 160 && stable < 6; i++) {
      await page.evaluate(() => new Promise((r) => setTimeout(() => requestAnimationFrame(r), 250)));
      const c = await page.evaluate(() => window.__dopahar.renderer.info.render.calls);
      stable = c === last ? stable + 1 : 0; last = c;
    }
    const out = await page.evaluate(() => new Promise((res) => {
      window.__tally = {};
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const t = window.__tally; window.__tally = null;
        const info = window.__dopahar.renderer.info.render;
        res({ calls: info.calls, tris: info.triangles, tally: t });
      }));
    }));
    // tally covers ~1-2 frames; normalise by the frame count implied by total vs calls
    const totalTally = Object.values(out.tally).reduce((a, b) => a + b, 0);
    const frames = Math.max(1, Math.round(totalTally / Math.max(1, out.calls)));
    const groups = Object.entries(out.tally).map(([k, n]) => [k, Math.round(n / frames)]).sort((a, b) => b[1] - a[1]);
    results.push({ name: v.name, calls: out.calls, tris: out.tris, settledAfter: i });
    console.log(`${v.name.padEnd(16)} calls ${String(out.calls).padStart(4)}  tris ${(out.tris / 1e6).toFixed(2)}M  (settle reads ${i})`);
    if (SHOW_GROUPS) console.log('   ', groups.slice(0, 30).map(([k, n]) => `${k}:${n}`).join('  '));
  }
  const zones = {};
  for (const r of results) { const z = r.name.split('@')[0]; zones[z] = Math.max(zones[z] || 0, r.calls); }
  console.log('WORST', JSON.stringify(zones));
  await browser.close();
} finally { server.kill(); }
