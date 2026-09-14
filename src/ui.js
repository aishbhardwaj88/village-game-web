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
 * Shows the tap-to-start overlay, requests pointer lock on desktop, and reveals touch
 * controls on touch devices. Resolves once the player has tapped/clicked to start —
 * taps are ignored until setupLoadingScreen() has marked the overlay "ready" (assets
 * loaded, or the safety timeout fired). `onStart` is called synchronously inside the
 * pointerdown handler — callers that need to unlock a Web Audio AudioContext
 * (iOS/Safari requires this inside a user gesture) should create/resume it there, not
 * after an await.
 */
export function setupStartOverlay({ isTouch, onStart }) {
  const overlay = document.getElementById('start-overlay');
  const touchControls = document.getElementById('touch-controls');
  const hint = document.getElementById('start-overlay-hint');

  hint.textContent = isTouch ? 'Tap to start' : 'Click to start · WASD to move · Esc to release mouse';

  const start = () => {
    if (!overlay.classList.contains('ready')) return;
    overlay.removeEventListener('pointerdown', start);
    overlay.classList.add('hidden');

    if (isTouch) {
      touchControls.classList.add('active');
    }

    onStart();
  };

  overlay.addEventListener('pointerdown', start);
}
