// VILLAGE_VOCABULARY s7 + s10 gap: the afternoon cicada drone. The one sound missing from the
// UP summer afternoon (wind, birds, radio, chakki, tubewell, bells, cooker and dusk crickets
// already exist in audio.js / villageSounds.js). All procedural Web Audio, no files, no draw calls.
// Two "trees" of cicadas, panned apart, each singing in long swelling phrases with pauses, so the
// bed rises and falls instead of reading as steady hiss. Loud at midday, gone by dusk (the existing
// crickets take over), silent at night. Routes through audio.master, so mute/volume/duck all apply.
// getState() -> { day: 0..1 day progress, night: 0..1 night mix }. Self-scheduling; one call line.

export function createAmbientBeds(audio, getState) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ready = () => audio.started && audio.ctx && audio.master && audio.ctx.state === 'running';
  const voices = [];
  let bus = null;

  function build() {
    const c = audio.ctx;
    const n = c.sampleRate * 3;
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    bus = c.createGain();
    bus.gain.value = 0;
    bus.connect(audio.master);
    for (const [freq, pan, rasp] of [[5900, -0.55, 46], [6700, 0.6, 53]]) {
      const src = c.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.loopStart = rnd(0, 1); // the two voices never share a noise phase
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 7;
      const bp2 = c.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = freq * 1.5; bp2.Q.value = 9;
      // Rasp: the shrill buzz is amplitude-pulsed tens of times a second.
      const am = c.createGain(); am.gain.value = 0.45;
      const lfo = c.createOscillator(); lfo.type = 'triangle'; lfo.frequency.value = rasp;
      const lfoDepth = c.createGain(); lfoDepth.gain.value = 0.4;
      lfo.connect(lfoDepth).connect(am.gain);
      const phrase = c.createGain(); phrase.gain.value = 0.0001;
      const panner = c.createStereoPanner ? c.createStereoPanner() : null;
      const mix = c.createGain(); mix.gain.value = 1;
      src.connect(bp).connect(mix);
      const harm = c.createGain(); harm.gain.value = 0.35;
      src.connect(bp2).connect(harm).connect(mix);
      mix.connect(am).connect(phrase);
      if (panner) { panner.pan.value = pan; phrase.connect(panner).connect(bus); } else phrase.connect(bus);
      src.start(); lfo.start();
      voices.push({ phrase, lfo, due: performance.now() / 1000 + rnd(1, 6) });
    }
  }

  // One phrase: slow swell up, hold, slow fall, then a pause. Each voice decides independently.
  function sing(v, t) {
    const c = audio.ctx, now = c.currentTime;
    const rise = rnd(2.5, 5), hold = rnd(3, 9), fall = rnd(2.5, 5), peak = rnd(0.55, 1);
    const g = v.phrase.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.exponentialRampToValueAtTime(peak, now + rise);
    g.setValueAtTime(peak, now + rise + hold);
    g.exponentialRampToValueAtTime(0.0001, now + rise + hold + fall);
    v.lfo.frequency.setTargetAtTime(v.lfo.frequency.value * rnd(0.94, 1.06), now, 2);
    v.due = t + rise + hold + fall + rnd(3, 14);
  }

  const timer = setInterval(() => {
    if (!ready()) return;
    try {
      if (!bus) build();
      const s = getState() || {};
      const day = Number.isFinite(s.day) ? s.day : 0;
      const night = Number.isFinite(s.night) ? s.night : 0;
      // Full through the afternoon, fading 0.55 -> 0.85 as the dusk crickets (audio.js, from 0.6) come in.
      const dayF = 1 - Math.max(0, Math.min(1, (day - 0.55) / 0.3));
      const level = 0.014 * dayF * (1 - Math.max(0, Math.min(1, night)));
      bus.gain.setTargetAtTime(level, audio.ctx.currentTime, 1.5);
      const t = performance.now() / 1000;
      if (level > 0.0005) for (const v of voices) if (t >= v.due) sing(v, t);
    } catch (err) { /* sound must never break the game */ }
  }, 250);

  return { dispose() { clearInterval(timer); if (bus) bus.disconnect(); } };
}
