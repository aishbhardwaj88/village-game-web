/**
 * All sound is synthesised with the Web Audio API — no audio files, so no downloads
 * and no licence risk (item 5). It's a placeholder for real recordings later, but
 * aims to already have the right rhythm per vehicle. Everything starts only after
 * AudioEngine.start(), which must be called from the tap-to-start gesture (browsers
 * block audio before a user interaction).
 */

function createNoiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Item 8 (queue) — the pre-mix-pass level; the pause menu's master volume slider and
// the dialogue-open duck both multiply this, they don't replace it, so a user who
// never touches the slider hears exactly what every earlier item already tuned.
const BASE_MASTER_GAIN = 0.55;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.started = false;

    this._enginePhase = 0;
    this._footstepPhase = 0;
    this._creakGain = null;
    this._nextBellAt = 0;
    this._bellTimer = 0;

    this.walking = false;
    this.walkSpeedRatio = 0;
    this.surface = 'dirt'; // 'dirt' | 'cement' | 'soil' — see src/surfaces.js
    this.vehicleKind = null;
    this.vehicleSpeedRatio = 0;

    this._nextDogAt = 10 + Math.random() * 20; // first bark after a while, not immediately
    this._dogTimer = 0;

    this._masterVolume = 1; // pause menu slider, 0-1 (item 8)
    this._duckFactor = 1; // ducked while the dialogue panel is open (item 8)
  }

  start() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = BASE_MASTER_GAIN * this._masterVolume * this._duckFactor;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.started = true;
    this._startAmbience();
  }

  _applyMasterGain() {
    if (!this.started) return;
    this.master.gain.setTargetAtTime(BASE_MASTER_GAIN * this._masterVolume * this._duckFactor, this.ctx.currentTime, 0.25);
  }

  /** Pause menu master volume slider (item 8) — 0-1, multiplies every sound at once
   * since everything in this file already routes through `this.master`. */
  setMasterVolume(v) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    this._applyMasterGain();
  }

  /** "Sits under dialogue" (item 8) — the whole mix ducks a bit while the dialogue
   * panel is open, same one master gain, so nothing needs per-sound ducking logic.
   * Safe to call every frame with the same value; setTargetAtTime is a no-op ramp to
   * an unchanged target. */
  setDialogueOpen(isOpen) {
    const factor = isOpen ? 0.55 : 1;
    if (factor === this._duckFactor) return;
    this._duckFactor = factor;
    this._applyMasterGain();
  }

  setWalking(isWalking, speedRatio = 1) {
    this.walking = isWalking;
    this.walkSpeedRatio = speedRatio;
  }

  /** Footstep tone changes with what's underfoot (item 7) — lane dirt, a courtyard's
   * cement, or the field's soil. See src/surfaces.js surfaceAt(). */
  setSurface(surface) {
    this.surface = surface;
  }

  /** Distance (metres) from the player/camera to the halwai — drives the distant
   * radio's fade (item 7). Called once per frame; harmless before start() (no-op). */
  setListenerDistanceToRadio(distanceMetres) {
    if (!this.started || !this._radioGain) return;
    // Audible within ~18m, inaudible by ~35m — a soft-knee fade, not a hard cutoff.
    const t = 1 - Math.min(1, Math.max(0, (distanceMetres - 18) / 17));
    this._radioGain.gain.setTargetAtTime(t * 0.05, this.ctx.currentTime, 0.8);
  }

  /** Distance (metres) from the player to the canal channel — drives a soft water
   * murmur that is audible within ~14 m and gone by ~30 m. Harmless before start(). */
  setListenerDistanceToWater(distanceMetres) {
    if (!this.started || !this._waterGain) return;
    const t = 1 - Math.min(1, Math.max(0, (distanceMetres - 4) / 26));
    this._waterGain.gain.setTargetAtTime(t * t * 0.07, this.ctx.currentTime, 0.6);
  }

  /** Per-place ambience: a single noise bed whose tone and level follow the kind of
   * place the listener is inside (`closeness` 0 at the rim of its radius, 1 at the
   * centre). Bazaar kinds get a low crowd murmur, schools a brighter chatter, fields a
   * touch more wind; anything else fades to silence. Harmless before start(). */
  setPlaceAmbience(kind, closeness) {
    if (!this.started || !this._placeGain) return;
    const profile = { bazaar: [520, 0.045], shop: [650, 0.02], school: [1500, 0.04], field: [330, 0.03] }[kind];
    const c = Math.max(0, Math.min(1, closeness));
    const t = this.ctx.currentTime;
    if (profile) this._placeFilter.frequency.setTargetAtTime(profile[0], t, 0.8);
    this._placeGain.gain.setTargetAtTime(profile ? profile[1] * Math.sqrt(c) : 0, t, 0.8);
  }

  setVehicle(kind, speedRatio) {
    this.vehicleKind = kind;
    this.vehicleSpeedRatio = kind ? Math.abs(speedRatio) : 0;
    if (!kind && this._creakGain) this._creakGain.gain.value = 0;
  }

  /** Advances the per-frame trigger clocks for discrete sounds. Call once per frame. */
  update(dt) {
    if (!this.started) return;
    const t = this.ctx.currentTime;

    if (this.walking && !this.vehicleKind) {
      const rate = 1.6 + this.walkSpeedRatio * 1.2; // steps/sec
      this._footstepPhase += rate * dt;
      if (this._footstepPhase >= 1) {
        this._footstepPhase -= 1;
        this._playFootstep(t, this.surface);
      }
    }

    // A far-off dog, once in a while (item 7) — rare and quiet enough to read as
    // distant, not next to the player.
    this._dogTimer += dt;
    if (this._dogTimer >= this._nextDogAt) {
      this._dogTimer = 0;
      this._nextDogAt = 18 + Math.random() * 30;
      this._playDistantDog(t);
    }

    if (this.vehicleKind === 'tractor') {
      const idle = 2.2;
      const max = 7.5;
      const rate = idle + this.vehicleSpeedRatio * (max - idle);
      this._enginePhase += rate * dt;
      if (this._enginePhase >= 1) {
        this._enginePhase -= 1;
        this._playChug(t, this.vehicleSpeedRatio);
      }
    } else if (this.vehicleKind === 'bike') {
      const rate = 3.5 + this.vehicleSpeedRatio * 6;
      this._enginePhase += rate * dt;
      if (this._enginePhase >= 1) {
        this._enginePhase -= 1;
        this._playThump(t, this.vehicleSpeedRatio);
      }
    } else if (this.vehicleKind === 'cart') {
      if (this._creakGain) {
        const target = this.vehicleSpeedRatio > 0.05 ? 0.06 + this.vehicleSpeedRatio * 0.05 : 0;
        this._creakGain.gain.setTargetAtTime(target, t, 0.3);
      }
      this._bellTimer += dt;
      if (this.vehicleSpeedRatio > 0.1 && this._bellTimer >= this._nextBellAt) {
        this._bellTimer = 0;
        this._nextBellAt = 2.5 + Math.random() * 2.5;
        this._playBell(t);
      }
    }
  }

  // --- one-shot sounds -----------------------------------------------------

  /** Surface changes the footstep's filter/decay (item 7): cement is a brighter, drier
   * tap with a quick decay; soft field soil is duller/lower with a slightly longer,
   * more diffuse decay; lane dirt (the default) sits between the two. */
  _playFootstep(t, surface = 'dirt') {
    // Item 8 mix pass: footsteps fire on almost every step, more often than any other
    // sound in the game, so even a moderate peak reads as loud in practice — trimmed
    // from 0.22-0.25 so they sit under the vehicle/interaction one-shots instead of
    // washing them out.
    const profile =
      surface === 'cement'
        ? { freq: 650, q: 1.4, gain: 0.16, decay: 0.06 }
        : surface === 'tarmac'
          ? { freq: 520, q: 1.1, gain: 0.15, decay: 0.07 }
          : surface === 'soil'
            ? { freq: 140, q: 0.6, gain: 0.16, decay: 0.13 }
            : { freq: 220, q: 0.9, gain: 0.18, decay: 0.09 };

    const noise = this.ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(this.ctx, 0.16);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = profile.freq;
    filter.Q.value = profile.q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(profile.gain, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + profile.decay);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(t);
    noise.stop(t + profile.decay + 0.02);
  }

  /** A far-off dog bark (item 7) — heavily low-passed and quiet so it reads as
   * distant, not standing next to the player; 2-4 short barks per occurrence. */
  _playDistantDog(t) {
    const barks = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < barks; i++) {
      const bt = t + i * (0.16 + Math.random() * 0.06);
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      const baseFreq = 260 + Math.random() * 40;
      osc.frequency.setValueAtTime(baseFreq, bt);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, bt + 0.09);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900; // distant — no bright bite
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, bt);
      gain.gain.exponentialRampToValueAtTime(0.045, bt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, bt + 0.12);
      osc.connect(filter).connect(gain).connect(this.master);
      osc.start(bt);
      osc.stop(bt + 0.14);
    }
  }

  _playChug(t, speedRatio) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 45 + speedRatio * 40;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    // Item 8 mix pass: was 0.5, the loudest one-shot in the whole file by a wide
    // margin (footsteps peak ~0.18, everything else under 0.2) — the tractor engine
    // firing every ~0.13-0.45s at that level dominated any other sound near it.
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  _playThump(t, speedRatio) {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 90 + speedRatio * 30;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    // Item 8 mix pass: was 0.35, same reasoning as the tractor chug above.
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  _playBell(t) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1600;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  /** Public wrapper for the school bell interaction point (item 5) — reuses the same
   * bell strike as the cart's rhythm bell. */
  ringBell() {
    if (!this.started) return;
    this._playBell(this.ctx.currentTime);
  }

  /** "camera settles, ambience rises" while sitting (item 5) — a slow, smooth swell
   * of the wind bed rather than a new sound, so it stays subtle. */
  /** Dusk crickets: a high pulsing noise bed that fades in as the day progresses (0..1). */
  setDayProgress(p) {
    if (!this.started || !this._cricketGain) return;
    const g = Math.max(Math.max(0, Math.min(1, (p - 0.6) / 0.4)) * 0.022, (this._night || 0) * 0.045);
    this._cricketGain.gain.setTargetAtTime(g, this.ctx.currentTime, 1.5);
  }

  /** Night bed (0..1): crickets come right up, wind drops. Read by setDayProgress each frame. */
  setNight(m) {
    this._night = m;
    if (!this.started || !this._windGain) return;
    this._windGain.gain.setTargetAtTime(0.035 * (1 - 0.5 * m), this.ctx.currentTime, 0.8);
  }

  setSitting(sitting) {
    if (!this.started || !this._windGain) return;
    this._windGain.gain.setTargetAtTime(sitting ? 0.065 : 0.035, this.ctx.currentTime, 0.6);
  }

  /** A sizzling-oil bed for the halwai's short "packing the jalebi" wait (item 3) —
   * filtered noise, ramped in/out over `duration` seconds so it doesn't click. */
  playFrying(duration = 1.8) {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(this.ctx, duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    filter.Q.value = 0.6;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.15);
    gain.gain.setValueAtTime(0.12, t + Math.max(0.15, duration - 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(t);
    noise.stop(t + duration + 0.05);
  }

  /** A short pump-handle creak followed by a splash, for the hand pump interaction
   * (item 5 of the current queue) — same filtered-noise-burst technique as
   * playFrying above, just shaped differently (rising bandpass, then a lowpassed
   * splash right after). */
  playPump() {
    if (!this.started) return;
    const t = this.ctx.currentTime;

    const creak = this.ctx.createBufferSource();
    creak.buffer = createNoiseBuffer(this.ctx, 0.4);
    const creakFilter = this.ctx.createBiquadFilter();
    creakFilter.type = 'bandpass';
    creakFilter.frequency.setValueAtTime(500, t);
    creakFilter.frequency.exponentialRampToValueAtTime(1400, t + 0.3);
    creakFilter.Q.value = 4;
    const creakGain = this.ctx.createGain();
    creakGain.gain.setValueAtTime(0.0001, t);
    creakGain.gain.exponentialRampToValueAtTime(0.1, t + 0.08);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    creak.connect(creakFilter).connect(creakGain).connect(this.master);
    creak.start(t);
    creak.stop(t + 0.4);

    const splash = this.ctx.createBufferSource();
    splash.buffer = createNoiseBuffer(this.ctx, 0.5);
    const splashFilter = this.ctx.createBiquadFilter();
    splashFilter.type = 'lowpass';
    splashFilter.frequency.value = 2200;
    const splashGain = this.ctx.createGain();
    splashGain.gain.setValueAtTime(0.0001, t + 0.3);
    splashGain.gain.exponentialRampToValueAtTime(0.14, t + 0.38);
    splashGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    splash.connect(splashFilter).connect(splashGain).connect(this.master);
    splash.start(t + 0.3);
    splash.stop(t + 0.8);
  }

  // --- Side-job sound helpers (docs/MISSIONS_PLAN.md). `vol` 0-1 scales a sound for the sound-radar fade with distance. ---
  /** A short pitched blip: a tone with a fast attack/exponential decay. */
  playBlip(freq = 660, duration = 0.14, vol = 1, type = 'sine') {
    if (!this.started || vol <= 0.01) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16 * vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  /** The kulfiwala's handbell: two quick bright dings. */
  playCartBell(vol = 1) {
    if (!this.started) return;
    this.playBlip(2300, 0.35, vol, 'triangle');
    setTimeout(() => this.playBlip(3100, 0.4, vol, 'triangle'), 140);
  }

  /** A soft dull thump (the chakki's motor, a thrown gilli landing). */
  playThump(vol = 1, freq = 70) {
    if (!this.started || vol <= 0.01) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.1);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.28 * vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  /** A bright glassy click (marbles knocking). */
  playClack(vol = 1) {
    this.playBlip(1800 + Math.random() * 500, 0.06, vol * 0.8, 'square');
  }

  /** Kids cheering / shouting in the distance: a band-passed noise swell. */
  playCheer(vol = 1, duration = 0.9) {
    if (!this.started || vol <= 0.01) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(this.ctx, duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, t);
    filter.frequency.linearRampToValueAtTime(1700, t + duration * 0.5);
    filter.Q.value = 1.4;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.1 * vol, t + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(t);
    noise.stop(t + duration + 0.05);
  }

  /** Sabzi shop's pan-balance weighing (shop interactions task) — a short metallic
   * creak as the beam tips, then a soft settling thud. Same filtered-noise-burst
   * technique as playPump above. */
  playWeighingScale() {
    if (!this.started) return;
    const t = this.ctx.currentTime;

    const creak = this.ctx.createBufferSource();
    creak.buffer = createNoiseBuffer(this.ctx, 0.3);
    const creakFilter = this.ctx.createBiquadFilter();
    creakFilter.type = 'bandpass';
    creakFilter.frequency.setValueAtTime(900, t);
    creakFilter.frequency.exponentialRampToValueAtTime(500, t + 0.25);
    creakFilter.Q.value = 6;
    const creakGain = this.ctx.createGain();
    creakGain.gain.setValueAtTime(0.0001, t);
    creakGain.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    creak.connect(creakFilter).connect(creakGain).connect(this.master);
    creak.start(t);
    creak.stop(t + 0.32);

    const thud = this.ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(180, t + 0.28);
    thud.frequency.exponentialRampToValueAtTime(90, t + 0.42);
    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.0001, t + 0.28);
    thudGain.gain.exponentialRampToValueAtTime(0.15, t + 0.31);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    thud.connect(thudGain).connect(this.master);
    thud.start(t + 0.28);
    thud.stop(t + 0.52);
  }

  /** Bangle shop's signature interaction — a bright cluster of short glass-like
   * chimes (a handful of high sine tones, staggered), same oscillator technique as
   * _playBell above. */
  playBangleJingle() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const freqs = [2400, 2800, 3100, 2600, 3400];
    freqs.forEach((freq, i) => {
      const start = t + i * 0.045;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.06, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  /** M7's "knock mangoes down" interaction — a short, soft, low thud (a branch
   * shake, not an impact), same low-sine-drop technique as playWeighingScale's
   * own thud above. */
  playMangoThud() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const thud = this.ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(140, t);
    thud.frequency.exponentialRampToValueAtTime(70, t + 0.16);
    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.0001, t);
    thudGain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    thud.connect(thudGain).connect(this.master);
    thud.start(t);
    thud.stop(t + 0.24);

    const rustle = this.ctx.createBufferSource();
    rustle.buffer = createNoiseBuffer(this.ctx, 0.3);
    const rustleFilter = this.ctx.createBiquadFilter();
    rustleFilter.type = 'highpass';
    rustleFilter.frequency.value = 1800;
    const rustleGain = this.ctx.createGain();
    rustleGain.gain.setValueAtTime(0.0001, t);
    rustleGain.gain.exponentialRampToValueAtTime(0.04, t + 0.03);
    rustleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    rustle.connect(rustleFilter).connect(rustleGain).connect(this.master);
    rustle.start(t);
    rustle.stop(t + 0.32);
  }

  _playBirdChirp() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    // Mostly sparrow chirps, now and then a koel's rising two-note whistle or a distant
    // crow's caw, so the afternoon bed does not repeat one identical call.
    const r = Math.random();
    if (r < 0.6) this._playChirpNote(t, 2200 + Math.random() * 800);
    else if (r < 0.8) {
      const f = 2300 + Math.random() * 500;
      this._playChirpNote(t, f);
      this._playChirpNote(t + 0.2, f * 1.08); // quick answering second chirp
    } else if (r < 0.92) this._playKoel(t);
    else this._playCaw(t);

    setTimeout(() => this._playBirdChirp(), 4000 + Math.random() * 8000);
  }

  _playChirpNote(t, startFreq) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.4, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.9, t + 0.14);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** Koel: "ku-OO", a low soft note then a longer higher one gliding up. */
  _playKoel(t) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.setValueAtTime(900, t + 0.22);
    osc.frequency.exponentialRampToValueAtTime(1500, t + 0.62);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.035, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.012, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.04, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.75);
  }

  /** Far crow: two short nasal caws, band-passed sawtooth. */
  _playCaw(t) {
    for (let i = 0; i < 2; i++) {
      const s = t + i * 0.32;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, s);
      osc.frequency.exponentialRampToValueAtTime(300, s + 0.2);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 1.2;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, s);
      gain.gain.exponentialRampToValueAtTime(0.03, s + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, s + 0.22);
      osc.connect(filter).connect(gain).connect(this.master);
      osc.start(s);
      osc.stop(s + 0.25);
    }
  }

  // --- ambience --------------------------------------------------------------

  _startAmbience() {
    // Wind bed: looping filtered noise, very low and steady.
    const wind = this.ctx.createBufferSource();
    wind.buffer = createNoiseBuffer(this.ctx, 4);
    wind.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 500;
    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.035;
    wind.connect(windFilter).connect(windGain).connect(this.master);
    wind.start();
    this._windGain = windGain; // adjustable target for setSitting()

    // Cart creak: a second, quieter noise bed, filtered narrower and gated to 0 until
    // a cart is being driven (see update()).
    const creak = this.ctx.createBufferSource();
    creak.buffer = createNoiseBuffer(this.ctx, 3);
    creak.loop = true;
    const creakFilter = this.ctx.createBiquadFilter();
    creakFilter.type = 'bandpass';
    creakFilter.frequency.value = 700;
    creakFilter.Q.value = 1.5;
    this._creakGain = this.ctx.createGain();
    this._creakGain.gain.value = 0;
    creak.connect(creakFilter).connect(this._creakGain).connect(this.master);
    creak.start();

    setTimeout(() => this._playBirdChirp(), 2000 + Math.random() * 5000);

    // Crickets: band-passed noise gated by a ~14 Hz square LFO; silent until dusk.
    const cr = this.ctx.createBufferSource();
    cr.buffer = createNoiseBuffer(this.ctx, 3);
    cr.loop = true;
    const crFilter = this.ctx.createBiquadFilter();
    crFilter.type = 'bandpass';
    crFilter.frequency.value = 4600;
    crFilter.Q.value = 14;
    const crPulse = this.ctx.createGain();
    crPulse.gain.value = 0.5;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 14;
    const lfoDepth = this.ctx.createGain();
    lfoDepth.gain.value = 0.5;
    lfo.connect(lfoDepth).connect(crPulse.gain);
    this._cricketGain = this.ctx.createGain();
    this._cricketGain.gain.value = 0;
    cr.connect(crFilter).connect(crPulse).connect(this._cricketGain).connect(this.master);
    cr.start();
    lfo.start();

    // Faint distant radio near the halwai (item 7): narrow-band noise (a muffled,
    // AM-ish tone) with a slow amplitude wobble so it reads as indistinct chatter/
    // music rather than pure noise. Always playing, gain-only fade driven by listener
    // distance (setListenerDistanceToRadio, called from main.js each frame) — a
    // continuously-running loop is simpler and click-free than starting/stopping it
    // as the player wanders in and out of range.
    const radio = this.ctx.createBufferSource();
    radio.buffer = createNoiseBuffer(this.ctx, 5);
    radio.loop = true;
    const radioFilter = this.ctx.createBiquadFilter();
    radioFilter.type = 'bandpass';
    radioFilter.frequency.value = 1100;
    radioFilter.Q.value = 3;
    const radioWobble = this.ctx.createOscillator();
    radioWobble.type = 'sine';
    radioWobble.frequency.value = 4.2;
    const radioWobbleGain = this.ctx.createGain();
    radioWobbleGain.gain.value = 0.4;
    const radioWobbleBase = this.ctx.createConstantSource();
    radioWobbleBase.offset.value = 0.6;
    const radioAmpGain = this.ctx.createGain();
    radioWobble.connect(radioWobbleGain).connect(radioAmpGain.gain);
    radioWobbleBase.connect(radioAmpGain.gain);
    this._radioGain = this.ctx.createGain();
    this._radioGain.gain.value = 0; // starts silent; setListenerDistanceToRadio ramps it
    radio.connect(radioFilter).connect(radioAmpGain).connect(this._radioGain).connect(this.master);
    radio.start();
    radioWobble.start();
    radioWobbleBase.start();

    // Place bed: tone and level set by setPlaceAmbience(); a slow swell keeps it from
    // reading as steady hiss.
    const place = this.ctx.createBufferSource();
    place.buffer = createNoiseBuffer(this.ctx, 5);
    place.loop = true;
    this._placeFilter = this.ctx.createBiquadFilter();
    this._placeFilter.type = 'bandpass';
    this._placeFilter.Q.value = 0.9;
    const placeSwell = this.ctx.createOscillator();
    placeSwell.frequency.value = 0.21;
    const placeSwellGain = this.ctx.createGain();
    placeSwellGain.gain.value = 0.3;
    const placeBase = this.ctx.createConstantSource();
    placeBase.offset.value = 0.7;
    const placeAmp = this.ctx.createGain();
    placeAmp.gain.value = 0;
    placeSwell.connect(placeSwellGain).connect(placeAmp.gain);
    placeBase.connect(placeAmp.gain);
    this._placeGain = this.ctx.createGain();
    this._placeGain.gain.value = 0;
    place.connect(this._placeFilter).connect(placeAmp).connect(this._placeGain).connect(this.master);
    place.start();
    placeSwell.start();
    placeBase.start();

    // Canal water: band-passed noise with a slow swell, silent until the player is near
    // the channel (setListenerDistanceToWater, called each frame from main.js).
    const water = this.ctx.createBufferSource();
    water.buffer = createNoiseBuffer(this.ctx, 4);
    water.loop = true;
    const waterFilter = this.ctx.createBiquadFilter();
    waterFilter.type = 'bandpass';
    waterFilter.frequency.value = 900;
    waterFilter.Q.value = 0.7;
    const waterSwell = this.ctx.createOscillator();
    waterSwell.frequency.value = 0.35;
    const waterSwellGain = this.ctx.createGain();
    waterSwellGain.gain.value = 0.25;
    const waterBase = this.ctx.createConstantSource();
    waterBase.offset.value = 0.75;
    const waterAmp = this.ctx.createGain();
    waterAmp.gain.value = 0;
    waterSwell.connect(waterSwellGain).connect(waterAmp.gain);
    waterBase.connect(waterAmp.gain);
    this._waterGain = this.ctx.createGain();
    this._waterGain.gain.value = 0;
    water.connect(waterFilter).connect(waterAmp).connect(this._waterGain).connect(this.master);
    water.start();
    waterSwell.start();
    waterBase.start();
  }
}
