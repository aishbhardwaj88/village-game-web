#!/usr/bin/env node
/**
 * L2/L4 (10 Nov) boot profile and ride hitch report.
 * Serves a built dist with `vite preview` (no gzip, as specified), Chromium with SwiftShader (software GL: this machine has
 * no usable GPU in headless, so render/compile ms are far above a real Mac's), network throttled to 20 Mbit/s, 40 ms
 * latency, cold cache, 1280x720 desktop, no CPU throttle.
 *
 *   DIST=dist-l node tools/boot-profile.mjs            boot table: marks, MB before Play, CPU by step (PROFILE=1)
 *   DIST=dist-l RIDE=90 node tools/boot-profile.mjs     + a scripted 90 s ride bazaar -> chowk -> school -> haveli
 *
 * PROFILE=1 adds a sampled CPU profile bucketed by function name; use it on a `vite build --minify false` dist so the
 * names survive (DIST=dist-lnm).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = process.env.DIST || 'dist';
const PORT = 5400 + Math.floor(Math.random() * 300);
const BASE = `http://localhost:${PORT}/village-game-web/`;
const RIDE = Number(process.env.RIDE || 0);
const srv = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
const stop = () => { try { srv.kill(); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 100; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 300)); } }

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 20e6 / 8, uploadThroughput: 5e6 / 8 });
let bytes = 0; const reqUrl = new Map(), sizes = [];
cdp.on('Network.requestWillBeSent', (e) => reqUrl.set(e.requestId, e.request.url));
cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength || 0; sizes.push([e.encodedDataLength || 0, (reqUrl.get(e.requestId) || '').replace(BASE, '')]); });
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(() => {
  window.__lt = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ entryTypes: ['longtask'] });
});
if (process.env.PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdp.send('Profiler.start'); }

const t0 = Date.now();
await page.goto(BASE + (RIDE ? '?proof=1' : ''), { waitUntil: 'commit' });
await page.waitForSelector('#start-overlay.ready', { timeout: 300000 });
const readyWall = Date.now() - t0, mbReady = bytes / 1048576;
const nReady = sizes.length;
await page.evaluate(() => document.getElementById('play-btn').click());
await page.waitForFunction(() => (window.__loadMarks || {}).villageReady, null, { timeout: Number(process.env.VWAIT || 180) * 1000, polling: 200 }).catch(() => {});
await page.waitForTimeout(1500);
const marks = await page.evaluate(() => Object.fromEntries(Object.entries(window.__loadMarks || {}).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v])));
const lt = await page.evaluate(() => window.__lt);
const fq = await page.evaluate(() => ({ ...window.__frameQueue.stats }));
const zb = await page.evaluate(() => ({ worstMs: Math.round(window.__zoneBuildStats?.worstMs || 0), worstName: window.__zoneBuildStats?.worstName, over16: window.__zoneBuildStats?.over16?.slice(0, 12) }));

if (process.env.PROFILE) {
  const { profile } = await cdp.send('Profiler.stop');
  const byId = new Map(profile.nodes.map((n) => [n.id, n])), parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const self = new Map(); profile.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (profile.timeDeltas[i] || 0)));
  // bucket each sample by the OUTERMOST matching frame on its stack
  const BUCKETS = [
    ['mergeAcrossGroups', /^mergeAcrossGroups$/], ['colliders (initStaticColliders)', /^initStaticColliders$/],
    ['shader compile (compileAsync/getProgram)', /^(compileAsync|compile|getProgram|WebGLProgram|initMaterial|setProgram)$/],
    ['model parse (GLTF/meshopt)', /^(parse|_invokeAll|loadNode|loadMesh|loadBufferView|decodeGltfBuffer|decodeGltfBufferAsync|createNodeMesh|loadAccessor|loadMaterial|loadTexture|getDependency)$/],
    ['texture upload (initTexture/texImage2D)', /^(initTexture|uploadTexture|texImage2D|texSubImage2D|setTexture2D)$/],
    ['zone builds after Play', /^update$/], // zoneManager.update (outermost match only reached after Play)
    ['deferred assembly (field, canal, ...)', /^deferredSteps$/],
    ['main() village generators', /^main$/],
    ['render (composer.render)', /^render$/],
  ];
  const bucketOf = (id) => { let hit = null; for (let n = id; n !== undefined; n = parent.get(n)) { const f = byId.get(n).callFrame.functionName; for (const [name, re] of BUCKETS) if (re.test(f)) hit = name; } return hit || 'other'; };
  const agg = new Map();
  for (const [id, us] of self) { const b = bucketOf(id); agg.set(b, (agg.get(b) || 0) + us); }
  console.log('CPU by step (sampled, ms, whole run to village ready):');
  [...agg].sort((a, b) => b[1] - a[1]).forEach(([k, us]) => console.log('  ' + (us / 1000).toFixed(0).padStart(6), k));
  const selfBy = new Map();
  for (const [id, us] of self) { const f = byId.get(id).callFrame; const k = `${f.functionName || '(anon)'} ${f.url.replace(BASE, '')}:${f.lineNumber}`; selfBy.set(k, (selfBy.get(k) || 0) + us); }
  console.log('top self time:');
  [...selfBy].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOPN || 20)).forEach(([k, us]) => console.log('  ' + (us / 1000).toFixed(0).padStart(6), k));
  if (process.env.WHO) { // inclusive time of every stack frame whose function name matches WHO, by caller chain
    const re = new RegExp(process.env.WHO), incl = new Map();
    const tot = (id) => { const n = byId.get(id); let t = self.get(id) || 0; for (const c of n.children || []) t += tot(c); return t; };
    for (const n of profile.nodes) if (re.test(n.callFrame.functionName)) { const chain = []; for (let p = parent.get(n.id), i = 0; p !== undefined && i < 4; p = parent.get(p), i++) chain.push(byId.get(p).callFrame.functionName || '?'); const k = n.callFrame.functionName + ' <- ' + chain.join(' <- '); incl.set(k, (incl.get(k) || 0) + tot(n.id)); }
    [...incl].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, us]) => console.log('  incl ' + (us / 1000).toFixed(0).padStart(6), k));
  }
}

console.log(`DIST ${DIST}; SwiftShader software GL; 20 Mbit/s, 40 ms, cold cache; vite preview (no gzip)`);
console.log(`Play ready (wall): ${readyWall} ms; downloaded before Play: ${mbReady.toFixed(2)} MB in ${nReady} requests`);
console.log('marks', JSON.stringify(marks));
const m = marks;
const row = (k, a, b) => console.log(`  ${k.padEnd(34)} ${a != null && b != null ? String(b - a).padStart(6) + ' ms' : '   n/a'}`);
console.log('boot steps (page clock):');
row('nav -> main() starts (JS dl+parse)', 0, m.mainStart);
row('main() sync (generators, scene)', m.mainStart, m.mainSyncEnd);
row('slots start -> near models in', m.slotsStart, m.nearLoaded);
row('HDRI set (from nav)', 0, m.envSet);
row('gate (env wait + compileAsync)', m.gateStart, m.gateEnd);
row('nav -> Play shown (Ready)', 0, m.readyFrame);
row('Play -> first frame', m.playPressed, m.firstRender);
row('  first frame render itself', m.firstRenderStart, m.firstRender);
row('Play -> deferred assembly start', m.playPressed, m.deferredStart);
row('deferred assembly (sliced)', m.deferredStart, m.deferredEnd);
console.log(`  ${'  mergeAcrossGroups'.padEnd(34)} ${m.mergeMs} ms (one frame)`);
console.log(`  ${'  initStaticColliders'.padEnd(34)} ${m.collidersMs} ms (one frame)`);
row('Play -> Village ready', m.playPressed, m.villageReady);
row('Play -> settled incl. downloads', m.playPressed, m.settledAll);
console.log(`frameQueue worst step ${Math.round(fq.worstStepMs)} ms (${fq.worstStep}), worst frame ${Math.round(fq.worstFrameMs || 0)} ms; zone build worst ${zb.worstMs} ms (${zb.worstName}) over16 ${JSON.stringify(zb.over16)}`);
const ltBig = lt.filter((x) => x[1] > 200);
console.log(`long tasks > 200 ms: ${ltBig.length}, total ${ltBig.reduce((s, x) => s + x[1], 0)} ms; first 12 ${JSON.stringify(ltBig.slice(0, 12))}`);
console.log(`long frames [start, logic ms, render ms] first 15: ${JSON.stringify(await page.evaluate(() => (window.__longFrames || []).slice(0, 15)))}`);
if (process.env.LIST) sizes.slice(0, nReady).sort((a, b) => b[0] - a[0]).slice(0, 20).forEach(([n, u]) => console.log((n / 1048576).toFixed(2).padStart(6), u));

if (RIDE) {
  // Scripted ride on the cycle at 7.5 m/s through bazaar, chowk, school, haveli and back (position driven, so the
  // route ignores walls: it measures streaming and build work, not handling).
  const route = await page.evaluate(() => { const A = window.__dopahar.ANCHORS; return ['bazaar', 'chowk', 'school', 'haveli', 'bazaar'].map((k) => A[k] ? [A[k].x, A[k].z, k] : null).filter(Boolean); });
  console.log('ride route', JSON.stringify(route.map(([x, z, k]) => [k, Math.round(x), Math.round(z)])));
  await page.evaluate(() => { window.__perfReset(); const s = window.__frameQueue.stats; s.worstFrameMs = 0; s.worstStepMs = 0; const z = window.__zoneBuildStats; z.worstMs = 0; z.over16.length = 0; window.__lt.length = 0; window.__longFrames = []; });
  const r = await page.evaluate(async ([route, secs]) => {
    const d = window.__dopahar; const p = d.player.position;
    let seg = 0, segT = 0; const SPEED = 7.5; const frames = []; let last = performance.now();
    const legLen = (i) => Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
    const t0 = performance.now();
    await new Promise((res) => {
      const step = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000); frames.push(now - last); last = now;
        segT += SPEED * dt; while (seg < route.length - 1 && segT > legLen(seg)) { segT -= legLen(seg); seg++; }
        if (seg >= route.length - 1 || now - t0 > secs * 1000) return res();
        const f = segT / legLen(seg), a = route[seg], b = route[seg + 1];
        p.x = a[0] + (b[0] - a[0]) * f; p.z = a[1] + (b[1] - a[1]) * f;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    const pp = window.__perfProbe; const fq = window.__frameQueue.stats; const zb = window.__zoneBuildStats;
    return { secs: Math.round((performance.now() - t0) / 1000), frames: frames.length, worstGap: Math.round(Math.max(...frames)),
      worstLogic: Math.round(pp.max.logic || 0), worstZone: Math.round(pp.max.zoneManager || 0), worstQueueFrame: Math.round(fq.worstFrameMs || 0),
      worstRender: Math.round(pp.max.render || 0), worstZoneBuild: Math.round(zb.worstMs), worstZoneName: zb.worstName, over16: zb.over16.slice(0, 10),
      longFrames: (window.__longFrames || []).slice(0, 10), lt: window.__lt.filter((x) => x[1] > 100).length };
  }, [route, RIDE]);
  console.log(`RIDE ${r.secs} s, ${r.frames} frames: worst CPU frame logic ${r.worstLogic} ms (zoneManager ${r.worstZone} ms, frameQueue ${r.worstQueueFrame} ms); worst single zone build ${r.worstZoneBuild} ms (${r.worstZoneName}); worst render ${r.worstRender} ms (software GL); worst rAF gap ${r.worstGap} ms; long tasks >100 ms: ${r.lt}`);
  console.log('zone builds > 16 ms', JSON.stringify(r.over16));
}
console.log(`page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close(); stop(); process.exit(0);
