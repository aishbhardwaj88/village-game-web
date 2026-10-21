/**
 * Reusable mini-game widgets for the side jobs, rendered into the shared modal card (src/sideJobs.js). Every one is forgiving
 * (docs/MISSIONS_PLAN.md: never punishing, never a grind): misses cost a little time or score, never the job.
 * Input: Space / Enter / E, or a tap/click on the big button. Each widget cleans up its own listeners/timers when it finishes
 * or when the modal is closed from outside.
 */

function makeAction(body, labelEn, labelHi) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'panel-btn job-big-btn';
  btn.innerHTML = '<span class="btn-en"></span><span class="btn-hi"></span>';
  btn.querySelector('.btn-en').textContent = labelEn;
  btn.querySelector('.btn-hi').textContent = labelHi || '';
  body.appendChild(btn);
  return btn;
}

function onPress(btn, fn) {
  const keyHandler = (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
      e.preventDefault();
      fn();
    }
  };
  const ptr = (e) => {
    e.preventDefault();
    fn();
  };
  window.addEventListener('keydown', keyHandler);
  btn.addEventListener('pointerdown', ptr);
  return () => {
    window.removeEventListener('keydown', keyHandler);
    btn.removeEventListener('pointerdown', ptr);
  };
}

function track(body, zoneCentre, zoneHalf) {
  const t = document.createElement('div');
  t.className = 'job-track';
  const zone = document.createElement('div');
  zone.className = 'job-zone';
  zone.style.left = `${(zoneCentre - zoneHalf) * 100}%`;
  zone.style.width = `${zoneHalf * 200}%`;
  const marker = document.createElement('div');
  marker.className = 'job-marker';
  t.append(zone, marker);
  body.appendChild(t);
  return { marker, zone, el: t };
}

function line(body, en, hi, cls = '') {
  const p = document.createElement('p');
  p.className = `job-line ${cls}`;
  p.innerHTML = '<span class="jl-en"></span><span class="jl-hi"></span>';
  p.querySelector('.jl-en').textContent = en;
  p.querySelector('.jl-hi').textContent = hi || '';
  body.appendChild(p);
  return {
    set(newEn, newHi) {
      p.querySelector('.jl-en').textContent = newEn;
      p.querySelector('.jl-hi').textContent = newHi || '';
    },
  };
}

/**
 * Timing bar: a marker sweeps back and forth; press when it is inside the green zone. `strokes` hits finish it.
 * `onStroke(hit, n)` is called after every press. Resolves { hits, presses }.
 */
export function rhythmBar(api, { title, strokes = 4, speed = 1.1, zoneHalf = 0.12, actionEn = 'Pump!', actionHi = 'पंप!', hintEn, hintHi, onStroke }) {
  return new Promise((resolve) => {
    let raf = 0;
    let off = () => {};
    let done = false;
    api.modal({
      en: title.en,
      hi: title.hi,
      build(body, ctrl) {
        const status = line(body, `0 / ${strokes}`, '');
        if (hintEn) line(body, hintEn, hintHi, 'job-hint');
        const tr = track(body, 0.5, zoneHalf);
        const btn = makeAction(body, actionEn, actionHi);
        let hits = 0;
        let presses = 0;
        let pos = 0;
        let t0 = performance.now();
        const press = () => {
          if (done) return;
          presses += 1;
          const hit = Math.abs(pos - 0.5) <= zoneHalf;
          if (hit) hits += 1;
          tr.zone.classList.toggle('flash-hit', hit);
          tr.marker.classList.toggle('flash-miss', !hit);
          setTimeout(() => {
            tr.zone.classList.remove('flash-hit');
            tr.marker.classList.remove('flash-miss');
          }, 160);
          status.set(`${hits} / ${strokes}`, '');
          onStroke?.(hit, hits);
          if (hits >= strokes) {
            done = true;
            cleanup();
            ctrl.close();
            resolve({ hits, presses });
          }
        };
        off = onPress(btn, press);
        const frame = (now) => {
          const s = ((now - t0) / 1000) * speed;
          pos = 0.5 - 0.5 * Math.cos(s * Math.PI * 2);
          tr.marker.style.left = `${pos * 100}%`;
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      },
      onClose: () => {
        cleanup();
        if (!done) {
          done = true;
          resolve(null); // closed early (Esc / external close)
        }
      },
    });
    function cleanup() {
      cancelAnimationFrame(raf);
      off();
    }
  });
}

/**
 * Power meter: the bar fills and falls; press once to lock the power (0..1). Resolves { power }.
 * `sweetSpot` (0..1) is shown as a zone; closer = better (callers decide what power means).
 */
export function powerMeter(api, { title, actionEn = 'Hit!', actionHi = 'मारो!', hintEn, hintHi, speed = 0.9, sweetSpot = 0.78, zoneHalf = 0.08 }) {
  return new Promise((resolve) => {
    let raf = 0;
    let off = () => {};
    let done = false;
    api.modal({
      en: title.en,
      hi: title.hi,
      build(body, ctrl) {
        if (hintEn) line(body, hintEn, hintHi, 'job-hint');
        const tr = track(body, sweetSpot, zoneHalf);
        tr.el.classList.add('job-power');
        const btn = makeAction(body, actionEn, actionHi);
        let power = 0;
        const t0 = performance.now();
        const press = () => {
          if (done) return;
          done = true;
          cleanup();
          ctrl.close();
          resolve({ power });
        };
        off = onPress(btn, press);
        const frame = (now) => {
          const s = ((now - t0) / 1000) * speed;
          power = Math.abs(((s % 2) + 2) % 2 - 1); // triangle wave 0..1..0
          tr.marker.style.left = `${power * 100}%`;
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      },
      onClose: () => {
        cleanup();
        if (!done) {
          done = true;
          resolve(null);
        }
      },
    });
    function cleanup() {
      cancelAnimationFrame(raf);
      off();
    }
  });
}

/** Simple message card with one button: resolves when dismissed. */
export function infoCard(api, { title, lines, buttonEn = 'OK', buttonHi = 'ठीक है' }) {
  return new Promise((resolve) => {
    let resolved = false;
    api.modal({
      en: title.en,
      hi: title.hi,
      build(body) {
        for (const l of lines) line(body, l.en, l.hi);
      },
      buttons: [
        {
          en: buttonEn,
          hi: buttonHi,
          onClick: (ctrl) => {
            ctrl.close();
          },
        },
      ],
      onClose: () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      },
    });
  });
}

export { line, makeAction, onPress, track };
