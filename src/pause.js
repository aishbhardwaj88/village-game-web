import { QUALITY_LEVELS } from './quality.js';

/**
 * Pause menu (task 2) — Esc on desktop, a top-right button on touch. Purely DOM
 * wiring; all the actual side effects (freezing the tick loop, changing quality,
 * restarting the errand, showing credits) are callbacks supplied by main.js, which
 * owns that state.
 */
export function setupPauseMenu({ isTouch, initialQuality, initialVolume = 1, onOpen, onResume, onRestart, onQualityChange, onVolumeChange, onShowCredits }) {
  const overlay = document.getElementById('pause-overlay');
  const touchBtn = document.getElementById('pause-btn-touch');
  const resumeBtn = document.getElementById('resume-btn');
  const restartBtn = document.getElementById('restart-btn');
  const creditsBtn = document.getElementById('pause-credits-btn');
  const qualityBtns = Array.from(document.querySelectorAll('.quality-btn'));
  const volumeSlider = document.getElementById('volume-slider');

  if (isTouch) touchBtn.classList.add('visible');
  volumeSlider.value = String(Math.round(initialVolume * 100));

  let open = false;

  function setQualityButtonsUI(level) {
    for (const btn of qualityBtns) {
      btn.classList.toggle('active', btn.dataset.quality === level);
    }
  }
  setQualityButtonsUI(initialQuality);

  function openPause() {
    if (open) return;
    open = true;
    overlay.classList.add('visible');
    onOpen?.();
  }

  function closePause() {
    if (!open) return;
    open = false;
    overlay.classList.remove('visible');
    onResume?.();
  }

  function togglePause() {
    if (open) closePause();
    else openPause();
  }

  touchBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    togglePause();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    e.preventDefault();
    togglePause();
  });

  resumeBtn.addEventListener('pointerdown', closePause);

  restartBtn.addEventListener('pointerdown', () => {
    onRestart?.();
    closePause();
  });

  creditsBtn.addEventListener('pointerdown', () => {
    onShowCredits?.();
  });

  for (const btn of qualityBtns) {
    const level = btn.dataset.quality;
    if (!QUALITY_LEVELS.includes(level)) continue;
    btn.addEventListener('pointerdown', () => {
      setQualityButtonsUI(level);
      onQualityChange?.(level);
    });
  }

  volumeSlider.addEventListener('input', () => {
    onVolumeChange?.(Number(volumeSlider.value) / 100);
  });

  return {
    isOpen: () => open,
    close: closePause,
  };
}
