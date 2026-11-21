#!/usr/bin/env node
/**
 * S7 perf ride: production build -> vite preview -> playwright -> a scripted 90 s ride at cycle speed
 * through the bazaar, the square (chowk), the school, the galis and the east side, once for
 * ?layout=old and once for ?layout=new. Writes docs/s7/perf/latest.json and docs/s7/perf/latest.md
 * (plain words). tools/check-budget.js reads the JSON.
 *
 *   node tools/perf-ride.mjs                     headless Chromium here (software GL: frame times are not real)
 *   npm run perf:ride:mac                         on the MacBook: real GPU, a visible window, Chrome then Safari (WebKit)
 *
 * Environment:
 *   SKIP_BUILD=1          use the existing dist/ (default: runs npm run build:unchecked first)
 *   LAYOUTS=old,new       which layouts to ride (default old,new)
 *   BROWSERS=chromium     chromium and/or webkit (Safari's engine), comma separated
 *   HEADED=1              show the browser window
 *   GL=metal|gpu          Chromium on the real GPU (Mac: metal). Default here: SwiftShader software GL
 *   CHANNEL=chrome        use the installed Google Chrome instead of Playwright's Chromium
 *   SECS=90               ride length in seconds
 *   NET=none              no network throttle (default 20 Mbit/s, 40 ms, cold cache; Chromium only)
 *   OUT=docs/s7/perf/latest.json
 *   TAG=before            free text saved with the run (e.g. "before shadows")
 *   NOCHARS=1             do not load the 4K character models (for a low-memory machine: software GL keeps every texture
 *                         in RAM and the ride gets killed). Their bytes are still counted as "would have downloaded".
 *
 * What it measures per run:
 *   Play ready (page clock, F-overlay mark readyFrame), Village ready after Play (villageReady - playPressed),
 *   MB downloaded before Play (sized as GitHub Pages serves it: js/css/html/json gzipped, models as-is),
 *   each second: draw calls (all, main pass, shadow pass), triangles (all, main pass), textures, geometries,
 *   shader programs, GPU texture memory estimate (every WebGL texture/renderbuffer upload tracked by size),
 *   CPU frame time (time spent inside requestAnimationFrame callbacks per frame) p50/p95/p99/max, and the
 *   frame interval (time between frames) p50/p95/p99/max.
 */
import { chromium, webkit } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import os from 'node:os';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const env = process.env;
const DIST = path.join(ROOT, env.DIST || 'dist');
const LAYOUTS = (env.LAYOUTS || 'old,new').split(',').map((s) => s.trim()).filter(Boolean);
const BROWSERS = (env.BROWSERS || 'chromium').split(',').map((s) => s.trim()).filter(Boolean);
const SECS = Number(env.SECS || 90);
const HEADED = !!env.HEADED;
const OUT = path.join(ROOT, env.OUT || 'docs/s7/perf/latest.json');
const PORT = 5600 + Math.floor(Math.random() * 300);
const BASE = `http://localhost:${PORT}/village-game-web/`;

if (!env.SKIP_BUILD) {
  console.log('building (npm run build:unchecked) ...');
  execSync('npm run build:unchecked', { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
}

// Size of every dist file as GitHub Pages sends it (gzip for text types), so "MB before Play" matches the real site.
const GZ = new Set(['.html', '.js', '.css', '.json', '.svg', '.mjs']);
const servedSize = new Map();
function pagesBytes(url) {
  let p = decodeURIComponent(url.split('?')[0].split('#')[0]);
  const i = p.indexOf('/village-game-web/');
  if (i < 0) return 0;
  p = p.slice(i + '/village-game-web/'.length) || 'index.html';
  if (p.endsWith('/')) p += 'index.html';
  if (servedSize.has(p)) return servedSize.get(p);
  const f = path.join(DIST, p);
  let n = 0;
  if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile()) {
    const buf = fs.readFileSync(f);
    n = GZ.has(path.extname(f)) ? zlib.gzipSync(buf).length : buf.length;
  }
  servedSize.set(p, n);
  return n;
}

// vite started directly (not through npx) in its own process group, so stopping it really stops it.
const srv = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--outDir', path.relative(ROOT, DIST), '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
const stop = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} try { srv.kill(); } catch {} };
process.on('SIGINT', () => { stop(); process.exit(130); });
process.on('exit', stop);
for (let i = 0; i < 100; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }

// ---- in-page instrumentation (installed before the game's own scripts run) ----
function pageInstrument() {
  // CPU time per frame: every requestAnimationFrame callback is timed; callbacks sharing a frame timestamp add up.
  const cpu = (window.__perfRide = { on: false, frames: [], lastT: -1, gpuTexBytes: 0, gpuRbBytes: 0 });
  const origRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => origRaf((t) => {
    const s = performance.now();
    try { cb(t); } finally {
      if (cpu.on) {
        const d = performance.now() - s;
        if (t === cpu.lastT && cpu.frames.length) cpu.frames[cpu.frames.length - 1][1] += d;
        else { cpu.frames.push([t, d]); cpu.lastT = t; }
      }
    }
  });
  // GPU memory estimate: track every texture / renderbuffer allocation by size.
  const BPP = { 0x8058: 4, 0x8c43: 4, 0x8051: 4, 0x8c41: 4, 0x881a: 8, 0x881b: 8, 0x8814: 16, 0x8815: 16, 0x8229: 1, 0x822b: 2, 0x822d: 2, 0x822f: 4, 0x822e: 4, 0x8230: 8, 0x81a5: 2, 0x81a6: 4, 0x8cac: 4, 0x88f0: 4, 0x8cad: 8, 0x1908: 4, 0x1907: 4, 0x1909: 1, 0x190a: 2, 0x1906: 1, 0x8c3a: 4, 0x8f97: 4, 0x8d62: 2, 0x8056: 2, 0x8057: 2 };
  const COMPRESSED_BPP = (fmt) => ((fmt >= 0x83f0 && fmt <= 0x83f1) || fmt === 0x8c4c || fmt === 0x8c4d || fmt === 0x9274 || fmt === 0x9275 || fmt === 0x8d64 ? 0.5 : 1);
  for (const Ctx of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!Ctx) continue;
    const P = Ctx.prototype;
    const st = new WeakMap();
    const S = (gl) => { let s = st.get(gl); if (!s) st.set(gl, (s = { unit: 0x84c0, bound: new Map(), rb: null })); return s; };
    const texSize = new WeakMap(); // texture -> Map(levelKey -> bytes)
    const rbSize = new WeakMap();
    const boundTex = (gl, target) => { const t = (target >= 0x8515 && target <= 0x851a) ? 0x8513 : target; return S(gl).bound.get(S(gl).unit + ':' + t); };
    const setLevel = (gl, target, level, bytes) => {
      const tex = boundTex(gl, target); if (!tex) return;
      let m = texSize.get(tex); if (!m) texSize.set(tex, (m = new Map()));
      const k = target + ':' + level; const old = m.get(k) || 0; m.set(k, bytes); cpu.gpuTexBytes += bytes - old;
    };
    const wrap = (name, fn) => { const o = P[name]; if (!o) return; P[name] = function (...a) { fn(this, a); return o.apply(this, a); }; };
    wrap('activeTexture', (gl, a) => { S(gl).unit = a[0]; });
    wrap('bindTexture', (gl, a) => { S(gl).bound.set(S(gl).unit + ':' + a[0], a[1]); });
    wrap('texImage2D', (gl, a) => {
      let w, h, fmt = a[2];
      if (a.length >= 8) { w = a[3]; h = a[4]; } else { const src = a[5]; w = src && (src.naturalWidth || src.videoWidth || src.width); h = src && (src.naturalHeight || src.videoHeight || src.height); }
      if (w && h) setLevel(gl, a[0], a[1], w * h * (BPP[fmt] || 4));
    });
    wrap('texImage3D', (gl, a) => { if (a.length >= 9) setLevel(gl, a[0], a[1], a[3] * a[4] * a[5] * (BPP[a[2]] || 4)); });
    wrap('compressedTexImage2D', (gl, a) => setLevel(gl, a[0], a[1], a[3] * a[4] * COMPRESSED_BPP(a[2])));
    wrap('texStorage2D', (gl, a) => {
      let w = a[3], h = a[4], bytes = 0; const bpp = BPP[a[2]] ?? COMPRESSED_BPP(a[2]);
      for (let l = 0; l < a[1]; l++) { bytes += w * h * bpp; w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); }
      const faces = a[0] === 0x8513 ? 6 : 1; setLevel(gl, a[0] === 0x8513 ? 0x8513 : a[0], 'storage', bytes * faces);
    });
    wrap('texStorage3D', (gl, a) => { let w = a[3], h = a[4], bytes = 0; for (let l = 0; l < a[1]; l++) { bytes += w * h * a[5] * (BPP[a[2]] || 4); w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); } setLevel(gl, a[0], 'storage', bytes); });
    wrap('generateMipmap', (gl, a) => { const tex = boundTex(gl, a[0]); const m = tex && texSize.get(tex); if (m && m.get(a[0] + ':0')) { const b = Math.round(m.get(a[0] + ':0') / 3); const k = a[0] + ':mips'; cpu.gpuTexBytes += b - (m.get(k) || 0); m.set(k, b); } });
    wrap('deleteTexture', (gl, a) => { const m = a[0] && texSize.get(a[0]); if (m) { for (const v of m.values()) cpu.gpuTexBytes -= v; texSize.delete(a[0]); } });
    wrap('bindRenderbuffer', (gl, a) => { S(gl).rb = a[1]; });
    const rbAlloc = (gl, samples, fmt, w, h) => { const rb = S(gl).rb; if (!rb) return; const b = w * h * (BPP[fmt] || 4) * Math.max(1, samples); cpu.gpuRbBytes += b - (rbSize.get(rb) || 0); rbSize.set(rb, b); };
    wrap('renderbufferStorage', (gl, a) => rbAlloc(gl, 1, a[1], a[2], a[3]));
    wrap('renderbufferStorageMultisample', (gl, a) => rbAlloc(gl, a[1], a[2], a[3], a[4]));
    wrap('deleteRenderbuffer', (gl, a) => { const b = a[0] && rbSize.get(a[0]); if (b) { cpu.gpuRbBytes -= b; rbSize.delete(a[0]); } });
  }
}

function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(1);
}

async function rideOnce(browserName, layout) {
  const type = browserName === 'webkit' ? webkit : chromium;
  const launch = { headless: !HEADED };
  if (browserName === 'chromium') {
    if (env.CHANNEL) launch.channel = env.CHANNEL;
    launch.args = env.GL === 'metal' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']
      : env.GL === 'gpu' ? ['--enable-gpu', '--ignore-gpu-blocklist']
        : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'];
  }
  const browser = await type.launch(launch);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  if (browserName === 'chromium' && env.NET !== 'none') {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    // cold cache = a fresh browser profile (new context); the cache stays ON so a file fetched twice is downloaded once, as on the real site
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 20e6 / 8, uploadThroughput: 5e6 / 8 });
  }
  const t0 = Date.now();
  let bytes = 0, played = false, beforePlayBytes = 0, beforePlayReqs = 0, reqs = 0;
  const beforeList = [];
  let blockedBytes = 0, blockedBeforePlay = 0;
  const CHAR_RE = /assets\/models\/(parlour_didi|sister|maa|pitaji|dada|dadi|brother|sarpanch|postman|teacher)\.glb/;
  if (env.NOCHARS) await page.route(CHAR_RE, (route) => { const n = pagesBytes(route.request().url()); blockedBytes += n; if (!played) blockedBeforePlay += n; if (env.LIST) console.log(`    blocked at ${((Date.now() - t0) / 1000).toFixed(1)} s: ${route.request().url().replace(BASE, '')}`); route.fulfill({ status: 404, body: '' }); });
  page.on('requestfinished', (r) => { if (env.NOCHARS && CHAR_RE.test(r.url())) return; const n = pagesBytes(r.url()); bytes += n; reqs++; if (!played) { beforePlayBytes += n; beforePlayReqs++; beforeList.push([n, r.url().replace(BASE, ''), ((Date.now() - t0) / 1000).toFixed(1)]); } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await page.addInitScript(pageInstrument);

  await page.goto(`${BASE}?layout=${layout}&proof=1`, { waitUntil: 'commit' });
  await page.waitForSelector('#start-overlay.ready', { timeout: 300000 });
  const playReadyWall = Date.now() - t0;
  const log = (m) => { if (env.VERBOSE !== '0') console.log(`  [${((Date.now() - t0) / 1000).toFixed(0)} s] ${m}`); };
  log(`Play ready, ${(beforePlayBytes / 1048576).toFixed(1)} MB so far`);
  if (env.LIST) beforeList.sort((a, b) => b[0] - a[0]).slice(0, 15).forEach(([n, u, at]) => console.log('    ' + (n / 1048576).toFixed(2), u, 'done at', at, 's'));
  played = true;
  const gpu = await page.evaluate(() => {
    const gl = window.__dopahar?.renderer?.getContext?.(); if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  }).catch(() => null);
  await page.evaluate(() => document.getElementById('play-btn').click());
  await page.waitForFunction(() => (window.__loadMarks || {}).villageReady, null, { timeout: 240000, polling: 250 }).catch(() => {});
  log('village ready (or timed out)');
  await page.evaluate(() => { try { window.__dopahar.dialogue._advanceFromInput(); } catch {} });
  await page.waitForTimeout(2000);
  const marks = await page.evaluate(() => Object.fromEntries(Object.entries(window.__loadMarks || {}).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v])));

  // Route: the places the brief names, read from the running game's own anchors (they move with the layout).
  const route = await page.evaluate(() => {
    const A = window.__dopahar.ANCHORS;
    const want = ['bazaar', 'chowk', 'school', 'westgali', 'eastgali', 'haveli', 'health', 'sabzi', 'canal'];
    return want.filter((k) => A[k]).map((k) => [A[k].x, A[k].z, k]);
  });

  // Draw-call split per frame: main pass vs the sun's shadow pass vs post-processing.
  await page.evaluate(() => {
    const d = window.__dopahar, r = d.renderer, pr = window.__perfRide;
    const shadowCams = new Set();
    d.scene.traverse((o) => { if (o.isLight && o.shadow && o.shadow.camera) shadowCams.add(o.shadow.camera); });
    pr.mainCalls = 0; pr.shadowCalls = 0; pr.mainTris = 0;
    const orig = r.renderBufferDirect.bind(r);
    r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      if (shadowCams.has(camera)) pr.shadowCalls++;
      else if (camera === d.camera) {
        pr.mainCalls++;
        const n = group ? group.count : (geometry.index ? geometry.index.count : (geometry.attributes.position?.count || 0));
        const dr = geometry.drawRange.count;
        pr.mainTris += (Math.min(n, dr) / 3) * (object.isInstancedMesh ? object.count : 1);
      }
      return orig(camera, scene, geometry, material, object, group);
    };
  });

  log(`riding ${route.map((r) => r[2]).join(' > ')}`);
  const result = await page.evaluate(async ([route, secs]) => {
    const d = window.__dopahar, pr = window.__perfRide, info = d.renderer.info;
    const p = d.player.position;
    const legs = [];
    for (let i = 0; i < route.length - 1; i++) legs.push(Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]));
    const total = legs.reduce((a, b) => a + b, 0);
    const speed = Math.max(5, Math.min(14, total / secs)); // cycle pace
    const perSecond = [];
    const intervals = [];
    let seg = 0, segT = 0, last = performance.now(), lastSample = last;
    let peakFrame = { calls: 0, main: 0, shadow: 0, tris: 0, mainTris: 0 };
    let secAgg = { callsMax: 0, mainMax: 0, shadowMax: 0, trisMax: 0, mainTrisMax: 0 };
    pr.frames.length = 0; pr.on = true;
    if (window.__perfReset) window.__perfReset();
    const t0 = performance.now();
    await new Promise((res) => {
      const step = (now) => {
        // previous frame's counters (info is reset at the start of each game frame; read before it is)
        const f = { calls: info.render.calls, main: pr.mainCalls, shadow: pr.shadowCalls, tris: info.render.triangles, mainTris: Math.round(pr.mainTris) };
        pr.mainCalls = 0; pr.shadowCalls = 0; pr.mainTris = 0;
        for (const k of Object.keys(peakFrame)) if (f[k] > peakFrame[k]) peakFrame[k] = f[k];
        secAgg.callsMax = Math.max(secAgg.callsMax, f.calls); secAgg.mainMax = Math.max(secAgg.mainMax, f.main); secAgg.shadowMax = Math.max(secAgg.shadowMax, f.shadow);
        secAgg.trisMax = Math.max(secAgg.trisMax, f.tris); secAgg.mainTrisMax = Math.max(secAgg.mainTrisMax, f.mainTris);
        const dt = Math.min(0.1, (now - last) / 1000); intervals.push(now - last); last = now;
        segT += speed * dt;
        while (seg < legs.length && segT > legs[seg]) { segT -= legs[seg]; seg++; }
        if (seg >= legs.length || now - t0 > secs * 1000) return res();
        const a = route[seg], b = route[seg + 1], k = segT / legs[seg];
        const dx = b[0] - a[0], dz = b[1] - a[1];
        p.x = a[0] + dx * k; p.z = a[1] + dz * k;
        if (d.camRig) d.camRig.yaw = Math.atan2(-dx, -dz); // camera behind the rider, looking along the road
        if (now - lastSample >= 1000) {
          lastSample = now;
          perSecond.push({ t: Math.round((now - t0) / 1000), x: Math.round(p.x), z: Math.round(p.z), place: route[seg][2] + '->' + route[seg + 1][2],
            calls: secAgg.callsMax, mainCalls: secAgg.mainMax, shadowCalls: secAgg.shadowMax, triangles: secAgg.trisMax, mainTriangles: secAgg.mainTrisMax,
            textures: info.memory.textures, geometries: info.memory.geometries, programs: info.programs ? info.programs.length : null,
            gpuTexMB: +(pr.gpuTexBytes / 1048576).toFixed(1), gpuRbMB: +(pr.gpuRbBytes / 1048576).toFixed(1) });
          secAgg = { callsMax: 0, mainMax: 0, shadowMax: 0, trisMax: 0, mainTrisMax: 0 };
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    pr.on = false;
    const pp = window.__perfProbe || { max: {} };
    return { speed: +speed.toFixed(1), routeMetres: Math.round(total), secs: +((performance.now() - t0) / 1000).toFixed(1), perSecond, intervals: intervals.slice(1),
      cpuFrames: pr.frames.map((f) => f[1]), peakFrame, gpuTexMB: +(pr.gpuTexBytes / 1048576).toFixed(1), gpuRbMB: +(pr.gpuRbBytes / 1048576).toFixed(1),
      worstLogic: Math.round(pp.max.logic || 0), worstZoneManager: Math.round(pp.max.zoneManager || 0), worstRenderCpu: Math.round(pp.max.render || 0) };
  }, [route, SECS]);
  await browser.close();

  const cpu = result.cpuFrames, iv = result.intervals;
  const gpuTexPeak = Math.max(result.gpuTexMB, ...result.perSecond.map((s) => s.gpuTexMB));
  const summary = {
    playReadyMs: marks.readyFrame ?? null,
    playReadyWallMs: playReadyWall,
    villageAfterPlayMs: marks.villageReady && marks.playPressed ? marks.villageReady - marks.playPressed : null,
    beforePlayMB: +((beforePlayBytes + blockedBeforePlay) / 1048576).toFixed(2),
    charactersBlockedMB: env.NOCHARS ? +(blockedBytes / 1048576).toFixed(1) : undefined,
    charactersRequestedBeforePlayMB: env.NOCHARS ? +(blockedBeforePlay / 1048576).toFixed(1) : undefined,
    beforePlayRequests: beforePlayReqs,
    totalMBByEnd: +(bytes / 1048576).toFixed(1),
    drawCallsMax: result.peakFrame.calls,
    mainPassCallsMax: result.peakFrame.main,
    shadowCallsMax: result.peakFrame.shadow,
    trianglesMax: result.peakFrame.tris,
    mainTrianglesMax: result.peakFrame.mainTris,
    texturesMax: Math.max(0, ...result.perSecond.map((s) => s.textures)),
    geometriesMax: Math.max(0, ...result.perSecond.map((s) => s.geometries)),
    gpuTextureMB: +gpuTexPeak.toFixed(1),
    gpuRenderbufferMB: result.gpuRbMB,
    frameP50: pct(cpu, 50), frameP95: pct(cpu, 95), frameP99: pct(cpu, 99), frameMax: pct(cpu, 100),
    intervalP50: pct(iv, 50), intervalP95: pct(iv, 95), intervalP99: pct(iv, 99), intervalMax: pct(iv, 100),
    frames: cpu.length, framesOver50: cpu.filter((x) => x > 50).length,
    worstLogicMs: result.worstLogic, worstZoneManagerMs: result.worstZoneManager, worstRenderCpuMs: result.worstRenderCpu,
    rideSecs: result.secs, rideMetres: result.routeMetres, speed: result.speed,
    errors: errors.length,
  };
  return { browser: browserName, layout, gpu, route: route.map(([x, z, k]) => [k, Math.round(x), Math.round(z)]), marks, summary, perSecond: result.perSecond, errors: errors.slice(0, 10) };
}

const runs = [];
for (const b of BROWSERS) for (const l of LAYOUTS) {
  console.log(`ride: ${b}, layout=${l}, ${SECS} s ...`);
  let res = null;
  for (let attempt = 1; attempt <= Number(env.TRIES || 2) && !res?.summary; attempt++) {
    try { res = await rideOnce(b, l); } catch (e) {
      console.error(`ride ${b} ${l} attempt ${attempt} failed: ${e.message.split('\n')[0]}${/crash/i.test(e.message) ? ' (the browser ran out of memory; NOCHARS=1 helps on a small machine)' : ''}`);
      res = { browser: b, layout: l, failed: String(e.message).slice(0, 400) };
    }
  }
  runs.push(res);
  const r = runs[runs.length - 1];
  if (r.summary) console.log('  ' + JSON.stringify(r.summary));
}

const gpuName = runs.find((r) => r.gpu)?.gpu || null;
const softwareGL = /swiftshader|llvmpipe|software/i.test(gpuName || '') || (!env.GL && BROWSERS.includes('chromium') && !env.CHANNEL);
let commit = null;
try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch {}
const out = { date: new Date().toISOString(), tag: env.TAG || null, noChars: !!env.NOCHARS, commit, machine: `${os.type()} ${os.arch()} ${os.cpus()[0]?.model || ''} x${os.cpus().length}`.trim(), gpu: gpuName, softwareGL, secs: SECS, net: env.NET === 'none' ? 'none' : '20 Mbit/s, 40 ms, cold cache (Chromium)', runs };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

// Plain-words summary next to the JSON.
const L = [];
L.push(`# Perf ride, ${out.date.slice(0, 16).replace('T', ' ')} UTC${out.tag ? ` (${out.tag})` : ''}`, '');
L.push(`- Machine: ${out.machine}; graphics: ${gpuName || 'unknown'}${softwareGL ? ' (software, no real GPU: frame times are NOT what a player sees)' : ''}`);
if (env.NOCHARS) L.push('- The 10 character models were NOT loaded (low-memory machine); their download is still counted, their drawing is not.');
L.push(`- Ride: ${SECS} s at cycle speed through ${runs[0]?.route?.map((r) => r[0]).join(', ') || '?'}`, '');
for (const r of runs) {
  if (r.failed) { L.push(`## ${r.browser}, layout=${r.layout}: FAILED`, `- ${r.failed}`, ''); continue; }
  const s = r.summary;
  const ok = (v, lim) => (v == null ? 'n/a' : v <= lim ? 'ok' : 'OVER');
  L.push(`## ${r.browser}, layout=${r.layout}`);
  L.push(`- Play button ready: ${(s.playReadyMs / 1000).toFixed(1)} s (budget 4 s: ${ok(s.playReadyMs, 4000)})`);
  L.push(`- Village ready after Play: ${s.villageAfterPlayMs == null ? 'n/a' : (s.villageAfterPlayMs / 1000).toFixed(1) + ' s'} (budget 2 s: ${ok(s.villageAfterPlayMs, 2000)})`);
  L.push(`- Downloaded before Play: ${s.beforePlayMB} MB (budget 8 MB: ${ok(s.beforePlayMB, 8)}); by the end of the ride: ${s.totalMBByEnd} MB`);
  L.push(`- Draw calls, worst moment: ${s.mainPassCallsMax} main (budget 150: ${ok(s.mainPassCallsMax, 150)}), ${s.shadowCallsMax} shadow, ${s.drawCallsMax} all (budget 250: ${ok(s.drawCallsMax, 250)})`);
  L.push(`- Triangles, worst moment: ${s.mainTrianglesMax.toLocaleString('en')} on screen (budget 450k: ${ok(s.mainTrianglesMax, 450000)}), ${s.trianglesMax.toLocaleString('en')} incl. shadows`);
  L.push(`- GPU texture memory: about ${s.gpuTextureMB} MB (budget 400: ${ok(s.gpuTextureMB, 400)}), plus ${s.gpuRenderbufferMB} MB screen buffers; ${s.texturesMax} textures, ${s.geometriesMax} meshes' data`);
  L.push(`- CPU per frame: typical ${s.frameP50} ms, 95% under ${s.frameP95} ms (budget 12: ${softwareGL ? 'not judged on software GL' : ok(s.frameP95, 12)}), worst ${s.frameMax} ms (budget 50: ${softwareGL ? 'not judged' : ok(s.frameMax, 50)}); ${s.framesOver50} of ${s.frames} frames over 50 ms`);
  L.push(`- Time between frames: typical ${s.intervalP50} ms, 95% under ${s.intervalP95} ms, worst ${s.intervalMax} ms`);
  L.push(`- Game's own worst logic frame ${s.worstLogicMs} ms (zone streaming ${s.worstZoneManagerMs} ms); console errors: ${s.errors}`, '');
}
fs.writeFileSync(OUT.replace(/\.json$/, '.md'), L.join('\n') + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)} and .md`);
stop();
process.exit(runs.some((r) => r.failed) ? 1 : 0);
