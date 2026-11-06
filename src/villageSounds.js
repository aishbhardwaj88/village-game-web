// Village soundscape (VILLAGE_VOCABULARY s10). All procedural Web Audio, no files.
// Routes through the AudioEngine's master gain, so M mute, the volume slider and the
// dialogue duck all apply. Nothing plays until audio.start() ran inside the user gesture.
// Self-scheduling (setInterval), so main.js needs only one call line.
import { ANCHORS } from './anchors.js';

export function createVillageSounds(audio, getListener) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ready = () => audio.started && audio.ctx && audio.master && audio.ctx.state === 'running';
  const at = (a) => ({ x: a.x, z: a.z });
  const pos = {
    temple: at(ANCHORS.temple), tubewell: at(ANCHORS.tubewell), chakki: at(ANCHORS.chakki),
    house: at(ANCHORS.house), dairy: at(ANCHORS.dairy), gurudwara: at(ANCHORS.gurudwara),
  };
  const hwy = ANCHORS.highway;

  /** 0..1 loudness for a source at distance d: full inside `near`, silent past `far`. */
  const att = (d, near, far) => Math.max(0, Math.min(1, 1 - (d - near) / (far - near)));
  const distTo = (p) => { const l = getListener(); return Math.hypot(l.x - p.x, l.z - p.z); };

  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    const c = audio.ctx, n = c.sampleRate * 2;
    noiseBuf = c.createBuffer(1, n, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function env(g, t, peak, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(type, f0, f1, t, dur, peak, a = 0.01, filt = 0) {
    const c = audio.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, a, dur);
    let node = o;
    if (filt) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; o.connect(f); node = f; }
    node.connect(g).connect(audio.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // Temple bell: struck metal, inharmonic partials, long ring. Quiet beyond ~150 m.
  function templeBell() {
    const v = att(distTo(pos.temple), 15, 170) * 0.5 + 0.03;
    const t0 = audio.ctx.currentTime, n = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const t = t0 + k * rnd(0.9, 1.2);
      for (const [m, p] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) tone('sine', 620 * m, 620 * m * 0.995, t, 3.2 / m ** 0.3, 0.12 * v * p, 0.004);
    }
  }
  // Azaan: brief, quiet, far away. A few sung drone phrases (formant-filtered sawtooth with
  // slow vibrato), unworded, low in level. No place is tied to it; it comes from the far lanes.
  function azaan() {
    const c = audio.ctx, t0 = c.currentTime + 0.1;
    const notes = [[293, 1.8], [330, 1.4], [349, 2.2], [330, 1.2], [293, 2.6]];
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    const lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2.2;
    lfo.frequency.value = 5.2; lg.gain.value = 6; lfo.connect(lg).connect(o.frequency);
    let t = t0; o.frequency.setValueAtTime(notes[0][0], t);
    for (const [fr, d] of notes) { o.frequency.linearRampToValueAtTime(fr, t + 0.25); t += d; }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.018, t0 + 1.2);
    g.gain.setValueAtTime(0.018, t - 1.5);
    g.gain.linearRampToValueAtTime(0.0001, t);
    o.connect(f).connect(g).connect(audio.master);
    o.start(t0); lfo.start(t0); o.stop(t + 0.1); lfo.stop(t + 0.1);
  }
  // Pressure cooker whistle: breathy pitched hiss with a couple of short pulses, from a house.
  function cooker() {
    const c = audio.ctx, v = att(distTo(pos.house), 6, 60);
    if (v < 0.02) return;
    const t0 = c.currentTime;
    for (let k = 0; k < 3; k++) {
      const t = t0 + k * 0.9;
      tone('sine', 2650, 2600, t, 0.7, 0.05 * v, 0.05);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = noise(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 6;
      env(g, t, 0.03 * v, 0.05, 0.7);
      s.connect(f).connect(g).connect(audio.master); s.start(t, rnd(0, 1)); s.stop(t + 0.75);
    }
  }
  // Diesel engine thump: single-cylinder, ~3.5 beats/s, only near the tubewell.
  let thumpTimer = 0;
  function thump() {
    const v = att(distTo(pos.tubewell), 4, 55);
    if (v < 0.02) return;
    const t = audio.ctx.currentTime;
    tone('sine', 85, 40, t, 0.16, 0.5 * v, 0.004);
    tone('triangle', 170, 70, t, 0.08, 0.12 * v, 0.002, 400);
  }
  // Chakki hum: a low drone with a belt flutter, gain follows distance (always running, cheap).
  let hum = null;
  function ensureHum() {
    if (hum) return;
    const c = audio.ctx, g = c.createGain(); g.gain.value = 0;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), lf = c.createOscillator(), lg = c.createGain();
    o1.type = 'sawtooth'; o1.frequency.value = 58; o2.type = 'triangle'; o2.frequency.value = 116.7;
    lf.frequency.value = 11; lg.gain.value = 0.4; lf.connect(lg).connect(g.gain);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    o1.connect(f); o2.connect(f); f.connect(g).connect(audio.master);
    o1.start(); o2.start(); lf.start(); hum = { g };
  }
  function updateHum() {
    ensureHum();
    hum.g.gain.setTargetAtTime(att(distTo(pos.chakki), 3, 40) * 0.05, audio.ctx.currentTime, 0.4);
  }
  // Cycle bell: two bright rings (B key, and now and then far down a lane).
  function cycleBell(v = 0.25) {
    if (!ready()) return;
    const t = audio.ctx.currentTime;
    for (let k = 0; k < 2; k++) for (const m of [1, 1.51]) tone('sine', 2300 * m, 2290 * m, t + k * 0.16, 0.5, 0.08 * v * (m > 1 ? 0.5 : 1), 0.002);
  }
  // Birds and animals: short synthesized calls, louder in the fields/orchard side of the village.
  function crow() {
    const c = audio.ctx, t0 = c.currentTime, n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const t = t0 + k * 0.38, f0 = rnd(420, 520);
      const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + 0.25);
      fl.type = 'bandpass'; fl.frequency.value = 1100; fl.Q.value = 1.5;
      env(g, t, 0.05, 0.02, 0.26);
      o.connect(fl).connect(g).connect(audio.master); o.start(t); o.stop(t + 0.3);
    }
  }
  function koel() { // rising "ku-oo" whistle, repeated higher
    const t0 = audio.ctx.currentTime, n = 4 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const t = t0 + k * 0.42, f = 780 + k * 70;
      tone('sine', f, f * 1.35, t, 0.3, 0.035, 0.03);
    }
  }
  function peacock() { // loud "may-awww" cry, two repeats
    const c = audio.ctx, t0 = c.currentTime;
    for (let k = 0; k < 2; k++) {
      const t = t0 + k * 0.9;
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(600, t); o.frequency.linearRampToValueAtTime(1050, t + 0.25); o.frequency.linearRampToValueAtTime(760, t + 0.6);
      f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 3;
      env(g, t, 0.05, 0.05, 0.65);
      o.connect(f).connect(g).connect(audio.master); o.start(t); o.stop(t + 0.7);
    }
  }
  function buffalo() { // low drawn-out moo
    const v = att(distTo(pos.dairy), 10, 90) * 0.8 + 0.1;
    const c = audio.ctx, t = c.currentTime;
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(130, t + 0.5); o.frequency.linearRampToValueAtTime(82, t + 1.6);
    f.type = 'lowpass'; f.frequency.value = 420;
    env(g, t, 0.12 * v, 0.25, 1.7);
    o.connect(f).connect(g).connect(audio.master); o.start(t); o.stop(t + 1.8);
  }
  function truckHorn() { // twin-tone air horn, passing on the highway; loud only near it
    const l = getListener(), d = Math.abs(l.x - hwy.x);
    const v = att(d, 20, 320) * 0.9 + 0.05;
    const t = audio.ctx.currentTime, dur = rnd(0.7, 1.3);
    for (const fr of [311, 392]) tone('square', fr, fr, t, dur, 0.04 * v, 0.06, 1200);
  }

  // Scheduler: each event has its own next-due time (seconds of wall clock).
  const events = [
    { fn: templeBell, every: [150, 260] }, { fn: azaan, every: [360, 540], first: [200, 300] },
    { fn: cooker, every: [60, 120] }, { fn: crow, every: [18, 40] }, { fn: koel, every: [40, 80] },
    { fn: peacock, every: [70, 140] }, { fn: buffalo, every: [35, 80] }, { fn: truckHorn, every: [45, 100] },
    { fn: () => cycleBell(0.12), every: [50, 110] },
  ];
  const now = () => performance.now() / 1000;
  for (const e of events) e.due = now() + rnd(...(e.first || [8, e.every[0]]));

  let last = now();
  setInterval(() => {
    if (!ready()) return;
    const t = now(), dt = t - last; last = t;
    try {
      updateHum();
      thumpTimer += dt;
      if (thumpTimer >= 0.285) { thumpTimer = 0; thump(); }
      for (const e of events) if (t >= e.due) { e.due = t + rnd(...e.every); e.fn(); }
    } catch (err) { /* sound must never break the game */ }
  }, 100);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB' && !e.repeat) cycleBell(0.4);
  });
  return { cycleBell, templeBell, azaan, cooker };
}
