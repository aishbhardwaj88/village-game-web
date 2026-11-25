import * as THREE from 'three';
import { releaseSettling } from './standOn.js';

export function isDevMode() {
  return new URLSearchParams(window.location.search).has('dev');
}

/** F toggles a small readout, top-left: fps and frame ms (worst frame of the last half second). `?dev=1` shows it from the start.
 *  Her machine is the only one with a GPU, so this is how she reads the real number back to us (9 Nov playtest, S2). */
export function setupFpsCounter() {
  const el = document.getElementById('fps-counter');
  if (!el) return { update: () => {} };
  let on = isDevMode();
  el.style.display = on ? 'block' : 'none';
  el.style.whiteSpace = 'pre';
  // L1 (10 Nov): her load-time numbers, read off window.__loadMarks (ms since the page was opened).
  // Ready = page open to the Play button shown; Village = Play pressed to the first frame with the opening view fully built.
  const loadLines = () => {
    const m = window.__loadMarks || {};
    const ready = m.readyFrame || window.__readyAt;
    let s = `\nReady in ${ready ? (ready / 1000).toFixed(1) + ' s' : '...'}`;
    if (m.playPressed) s += `\nVillage in ${m.villageReady ? ((m.villageReady - m.playPressed) / 1000).toFixed(1) + ' s' : '...'}`;
    return s;
  };
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyF' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    on = !on;
    el.style.display = on ? 'block' : 'none';
  });
  let frames = 0, worst = 0, last = 0;
  let lastSample = performance.now();

  return {
    update(now) {
      if (last) worst = Math.max(worst, now - last);
      last = now;
      frames += 1;
      const elapsed = now - lastSample;
      if (elapsed >= 500) {
        if (on) el.textContent = `${Math.round((frames * 1000) / elapsed)} fps  ${(elapsed / frames).toFixed(1)} ms (worst ${Math.round(worst)})` + loadLines();
        frames = 0;
        worst = 0;
        lastSample = now;
      }
    },
  };
}

// 26 Nov, the honest gate. No timer: Play unlocks only when the start area is really ready (see setReadyGate in src/main.js).
// The bar is honest for the START AREA only: bytes of every file requested through THREE.DefaultLoadingManager (sizes come from
// asset-sizes.json, written at build time next to index.html) plus five build stages. It never moves backwards.
const STAGES = ['slots', 'world', 'ring', 'textures', 'shaders', 'props'];
const stageDone = new Set();
const sizes = { map: null };
let known = 0, done = 0, pending = 0, shown = 0;
const idleWaiters = [];
const sizeOf = (url) => {
  if (!sizes.map) return 0;
  const i = url.indexOf('assets/'); if (i < 0) return 0;
  const k = url.slice(i).split('?')[0];
  return sizes.map[k] || sizes.map[k.replace(/\.gz$/, '')] || 0;
};
let paint = () => {};
export function reportStage(name) { stageDone.add(name); paint(); }
export const downloadsIdleNow = () => pending === 0;
/** Resolves once nothing is downloading (checked twice, 60 ms apart, so a load that chains another is not missed). */
export function downloadsIdle() {
  return new Promise((resolve) => {
    const check = () => { if (pending === 0) setTimeout(() => (pending === 0 ? resolve() : idleWaiters.push(check)), 60); else idleWaiters.push(check); };
    check();
  });
}
const fmtMB = (b) => (b / 1048576).toFixed(1);

let readyGate = null;
export function setReadyGate(fn) { readyGate = fn; }

export function setupLoadingScreen() {
  const overlay = document.getElementById('start-overlay');
  const progressFill = document.getElementById('progress-fill');
  const pctEl = document.getElementById('progress-pct');
  const mbEl = document.getElementById('progress-mb');
  const hiEl = document.getElementById('progress-hi');

  paint = () => {
    const bytesFrac = known > 0 ? Math.min(1, done / known) : 0;
    const stageFrac = stageDone.size / STAGES.length;
    const f = Math.min(ready ? 1 : 0.99, 0.7 * bytesFrac + 0.3 * stageFrac);
    shown = Math.max(shown, f);
    const pct = Math.floor(shown * 100);
    progressFill.style.width = `${shown * 100}%`;
    if (pctEl) pctEl.textContent = `Loading the village ${pct}%`;
    if (hiEl) hiEl.textContent = `गाँव लोड हो रहा है ${pct}%`;
    if (mbEl) mbEl.textContent = known > 0 ? `${fmtMB(done)} of ${fmtMB(known)} MB` : '';
  };

  // Stuck-load watchdog (25 Nov, her machine sat 10 min at 89%): when nothing moves for 20 s it says what it is waiting for under the bar
  // and saves that to localStorage 'dopahar_stuck'; at 45 s with no progress it reloads the page once (a reload fixes stale or hung requests).
  {
    let sig = '', since = performance.now();
    const waitingFor = () => {
      const miss = STAGES.filter((n) => !stageDone.has(n));
      let urls = []; try { urls = (window.__gateOpen && window.__gateOpen().urls) || []; } catch (e) { /* ignore */ }
      return { stages: miss, urls: urls.map((u) => String(u).split('/').slice(-2).join('/').split('?')[0]), pending, marks: Object.keys(window.__loadMarks || {}).slice(-1)[0] || '' };
    };
    const watch = setInterval(() => {
      if (document.getElementById('start-overlay') && document.getElementById('start-overlay').classList.contains('ready')) { clearInterval(watch); return; }
      const w = waitingFor();
      const now = `${done}|${pending}|${stageDone.size}|${Object.keys(window.__loadMarks || {}).length}`;
      if (now !== sig) { sig = now; since = performance.now(); return; }
      const idle = performance.now() - since;
      if (idle > 20000) {
        if (mbEl) mbEl.textContent = 'Still working on: ' + (w.urls[0] || w.stages.join(', ') || w.marks);
        try { localStorage.setItem('dopahar_stuck', JSON.stringify({ t: new Date().toISOString(), idleMs: Math.round(idle), ...w, ua: navigator.userAgent.slice(0, 80) })); } catch (e) { /* ignore */ }
        console.warn('[load] stuck', w);
      }
      if (idle > 45000) {
        let again = false; try { again = !!sessionStorage.getItem('dopahar_stuck_reload'); sessionStorage.setItem('dopahar_stuck_reload', '1'); } catch (e) { again = true; }
        if (!again) location.reload();
      }
    }, 1000);
  }

  let ready = false, gateRunning = false;
  const markReady = () => {
    if (gateRunning || ready) return;
    gateRunning = true;
    (window.__loadMarks = window.__loadMarks || {}).markReady = performance.now();
    const gate = readyGate;
    if (gate) { Promise.resolve().then(gate).catch(() => {}).then(finish); } else finish();
  };
  const finish = () => {
    ready = true;
    STAGES.forEach((n) => stageDone.add(n)); paint();
    progressFill.style.width = '100%';
    overlay.classList.add('ready');
    // Feet settling and the lazy builds keyed to it are released on the Play press (launch below), not here.
    window.__readyAt = performance.now();
    requestAnimationFrame(() => { (window.__loadMarks = window.__loadMarks || {}).readyFrame = performance.now(); }); // first frame that can show the button
  };

  // Sizes: tiny json, best effort (the bar falls back to stages only without it).
  fetch(new URL('asset-sizes.json', document.baseURI)).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) { sizes.map = j; paint(); } }).catch(() => {});

  const M = THREE.DefaultLoadingManager;
  const itemStart = M.itemStart.bind(M), itemEnd = M.itemEnd.bind(M);
  const sz = new Map(); const open = new Map(); window.__gateOpen = () => ({ pending, urls: [...open.keys()].slice(0, 8) });
  M.itemStart = (url) => { pending++; open.set(url, (open.get(url) || 0) + 1); const b = sizeOf(url); if (b) { known += b; sz.set(url, (sz.get(url) || 0) + b); } paint(); itemStart(url); };
  M.itemEnd = (url) => { if (!open.has(url)) { itemEnd(url); return; } /* started before this wrapper (boot-hold, early loads): not counted */ pending--; { const c = (open.get(url) || 1) - 1; if (c) open.set(url, c); else open.delete(url); } const b = sz.get(url) || 0; if (b) { done += b; sz.delete(url); } paint(); itemEnd(url); if (pending === 0) idleWaiters.splice(0).forEach((f) => f()); };
  // markReady fires when the first burst of downloads (and main()'s boot hold) is over; the gate then waits for the rest.
  M.onLoad = markReady;
  M.onError = (url) => console.error('Asset failed to load:', url);
  paint();
}

/**
 * Shows the title screen, requests pointer lock on desktop, and reveals touch
 * controls on touch devices. Resolves once the player taps/clicks Play/New game (or
 * Continue, when `hasSave` is true) — disabled (CSS `display: none`, see index.html
 * `#start-overlay.ready #play-btn`) until setupLoadingScreen() has marked the overlay
 * "ready" (assets loaded, or the safety timeout fired). `onStart(isContinue)` is
 * called synchronously inside the pointerdown handler — callers that need to unlock a
 * Web Audio AudioContext (iOS/Safari requires this inside a user gesture) should
 * create/resume it there, not after an await.
 */
export function setupStartOverlay({ isTouch, hasSave, storyDone = false, onStart }) {
  const overlay = document.getElementById('start-overlay');
  const touchControls = document.getElementById('touch-controls');
  const playBtn = document.getElementById('play-btn');
  const continueBtn = document.getElementById('continue-btn');
  const hint = document.getElementById('start-overlay-hint');

  hint.textContent = isTouch ? '' : 'WASD to move · Esc to pause';

  // Item 7 (save/continue) — a save only relabels "Play" to "New game" and reveals
  // "Continue" above it; with no save, the title screen is unchanged from before.
  if (hasSave) {
    playBtn.querySelector('.play-en').textContent = 'New game';
    playBtn.querySelector('.play-hi').textContent = 'नया खेल';
    continueBtn.classList.add('available');
    if (storyDone) {
      // the story is finished (docs/MISSIONS_PLAN.md section 2): Continue becomes Continue roaming
      continueBtn.querySelector('.play-en').textContent = 'Continue roaming';
      continueBtn.querySelector('.play-hi').textContent = 'घूमते रहो';
    }
  }

  // B1: the button is visible from the first frame as "Loading...". A press before the
  // overlay is ready is remembered and the game starts by itself the moment it is.
  const enEl = playBtn.querySelector('.play-en');
  const hiEl = playBtn.querySelector('.play-hi');
  const readyEn = enEl.textContent, readyHi = hiEl.textContent;
  let pending = null;
  let started = false;
  const isReady = () => overlay.classList.contains('ready');
  const showLoading = () => {
    playBtn.classList.add('loading');
    enEl.textContent = 'Loading...';
    hiEl.textContent = 'लोड हो रहा है...';
  };
  const launch = (isContinue) => {
    if (started) return;
    started = true;
    playBtn.removeEventListener('pointerdown', startNew);
    continueBtn.removeEventListener('pointerdown', startContinue);
    playBtn.removeEventListener('click', startNew);
    continueBtn.removeEventListener('click', startContinue);
    overlay.classList.add('hidden');
    releaseSettling(); // see finish() in setupLoadingScreen: post-title work starts once the player is in

    if (isTouch) {
      touchControls.classList.add('active');
    }

    onStart(isContinue);
  };
  const start = (isContinue) => {
    if (!isReady()) {
      pending = isContinue;
      showLoading();
      return;
    }
    launch(isContinue);
  };
  if (!isReady()) {
    showLoading();
    const obs = new MutationObserver(() => {
      if (!isReady()) return;
      obs.disconnect();
      playBtn.classList.remove('loading');
      enEl.textContent = readyEn;
      hiEl.textContent = readyHi;
      if (pending !== null) launch(pending);
    });
    obs.observe(overlay, { attributes: true, attributeFilter: ['class'] });
  }
  const startNew = () => start(false);
  const startContinue = () => start(true);

  playBtn.addEventListener('pointerdown', startNew);
  continueBtn.addEventListener('pointerdown', startContinue);
  // Keyboard (Enter/Space on the focused button), assistive tech and scripted .click() only
  // fire `click`, never pointerdown; launch() is idempotent so a mouse press that fires both is fine.
  playBtn.addEventListener('click', startNew);
  continueBtn.addEventListener('click', startContinue);
}

/** "Loading the next part of the village": shown while the world is held because the stream is behind the player (src/propGate.js streamHold). */
let _holdShown = false;
export function setStreamHoldNotice(on) {
  if (on === _holdShown) return;
  _holdShown = on;
  document.getElementById('stream-hold')?.classList.toggle('visible', on);
}
