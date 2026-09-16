/**
 * Reusable bottom speech/message panel (item 2 brief) — bilingual, Devanagari larger
 * on top, English smaller beneath. Advances on click, tap or Space; a line with
 * `holdMs` instead advances itself after that delay (used for the halwai's short
 * "packing the jalebi" wait, item 3) and ignores click/tap/Space while it's showing.
 * One instance is shared by every interaction — callers just call say(lines, onDone).
 */
export class Dialogue {
  constructor() {
    this._panel = document.getElementById('dialogue-panel');
    this._hiEl = document.getElementById('dialogue-hi');
    this._enEl = document.getElementById('dialogue-en');
    this._queue = [];
    this._onComplete = null;
    this._autoTimer = null;

    this._panel.addEventListener('pointerdown', () => this._advanceFromInput());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.isOpen) {
        e.preventDefault();
        this._advanceFromInput();
      }
    });
  }

  get isOpen() {
    return this._panel.classList.contains('visible');
  }

  /** lines: [{hi, en, holdMs?}, ...]. onComplete fires once the last line is closed. */
  say(lines, onComplete = null) {
    this._queue = lines.slice();
    this._onComplete = onComplete;
    this._panel.classList.add('visible');
    this._showCurrent();
  }

  _showCurrent() {
    clearTimeout(this._autoTimer);
    if (this._queue.length === 0) {
      this._panel.classList.remove('visible');
      const cb = this._onComplete;
      this._onComplete = null;
      if (cb) cb();
      return;
    }
    const line = this._queue[0];
    this._hiEl.textContent = line.hi;
    this._enEl.textContent = line.en;
    this._panel.classList.toggle('waiting', !!line.holdMs);
    if (line.holdMs) {
      this._autoTimer = setTimeout(() => this._advance(), line.holdMs);
    }
  }

  _advanceFromInput() {
    if (!this.isOpen) return;
    const line = this._queue[0];
    if (line && line.holdMs) return; // auto-timed line — input does nothing until it elapses
    this._advance();
  }

  _advance() {
    this._queue.shift();
    this._showCurrent();
  }
}
