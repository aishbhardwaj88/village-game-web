/** Wires the controls-help screen (index.html #controls-overlay) — reachable from
 * both the title screen and the pause menu (two separate trigger buttons share this
 * one overlay). Same shape as src/credits.js's setupCredits(): returns {open, close}
 * for main.js to call from those two triggers. */
export function setupControlsHelp() {
  const overlay = document.getElementById('controls-overlay');
  const closeBtn = document.getElementById('controls-close-btn');

  function open() {
    overlay.classList.add('visible');
  }
  function close() {
    overlay.classList.remove('visible');
  }

  closeBtn.addEventListener('pointerdown', close);

  return { open, close };
}
