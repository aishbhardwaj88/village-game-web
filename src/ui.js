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

/**
 * Shows the tap-to-start overlay, unlocks audio on first interaction, requests
 * pointer lock on desktop, and reveals touch controls on touch devices. Resolves once
 * the player has tapped/clicked to start.
 */
export function setupStartOverlay({ isTouch, onStart }) {
  const overlay = document.getElementById('start-overlay');
  const touchControls = document.getElementById('touch-controls');
  const hint = document.getElementById('start-overlay-hint');

  hint.textContent = isTouch ? 'Tap to start' : 'Click to start · WASD to move · Esc to release mouse';

  const start = () => {
    overlay.removeEventListener('pointerdown', start);
    overlay.classList.add('hidden');

    // Unlock audio playback on iOS/Safari by resuming a context inside the gesture.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === 'suspended') ctx.resume();
      }
    } catch (e) {
      // Audio unlock is best-effort; ignore failures.
    }

    if (isTouch) {
      touchControls.classList.add('active');
    }

    onStart();
  };

  overlay.addEventListener('pointerdown', start);
}
