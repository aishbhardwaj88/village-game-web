import * as THREE from 'three';

export function isDevMode() {
  return new URLSearchParams(window.location.search).has('dev');
}

export function setupFpsCounter() {
  const el = document.getElementById('fps-counter');
  if (!isDevMode()) return { update: () => {} };

  el.style.display = 'block';
  let frames = 0;
  let lastSample = performance.now();

  return {
    update(now) {
      frames += 1;
      const elapsed = now - lastSample;
      if (elapsed >= 500) {
        const fps = Math.round((frames * 1000) / elapsed);
        el.textContent = `${fps} fps`;
        frames = 0;
        lastSample = now;
      }
    },
  };
}

const LOADING_SAFETY_TIMEOUT_MS = 9000; // never get stuck if some asset never resolves

/**
 * Drives the loading screen's progress bar from THREE.DefaultLoadingManager, which
 * every loader in this project uses implicitly (none of them are constructed with an
 * explicit manager). Must be called BEFORE any texture/model/HDRI load is kicked off
 * — main.js calls this first, before building any scene content — otherwise items
 * that finish loading before this attaches would never be counted and onLoad could
 * fire before we're listening, or never fire again after.
 */
export function setupLoadingScreen() {
  const overlay = document.getElementById('start-overlay');
  const progressFill = document.getElementById('progress-fill');

  let ready = false;
  const markReady = () => {
    if (ready) return;
    ready = true;
    progressFill.style.width = '100%';
    overlay.classList.add('ready');
  };

  THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
    progressFill.style.width = `${total > 0 ? (loaded / total) * 100 : 100}%`;
  };
  THREE.DefaultLoadingManager.onLoad = markReady;
  THREE.DefaultLoadingManager.onError = (url) => console.error('Asset failed to load:', url);

  setTimeout(markReady, LOADING_SAFETY_TIMEOUT_MS);
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
export function setupStartOverlay({ isTouch, hasSave, onStart }) {
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
  }

  const start = (isContinue) => {
    if (!overlay.classList.contains('ready')) return;
    playBtn.removeEventListener('pointerdown', startNew);
    continueBtn.removeEventListener('pointerdown', startContinue);
    overlay.classList.add('hidden');

    if (isTouch) {
      touchControls.classList.add('active');
    }

    onStart(isContinue);
  };
  const startNew = () => start(false);
  const startContinue = () => start(true);

  playBtn.addEventListener('pointerdown', startNew);
  continueBtn.addEventListener('pointerdown', startContinue);
}
