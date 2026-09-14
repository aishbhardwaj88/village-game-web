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
    this.vehicleKind = null;
    this.vehicleSpeedRatio = 0;
  }

  start() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.started = true;
    this._startAmbience();
  }

  setWalking(isWalking, speedRatio = 1) {
    this.walking = isWalking;
    this.walkSpeedRatio = speedRatio;
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
        this._playFootstep(t);
      }
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

  _playFootstep(t) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(this.ctx, 0.08);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 220;
    filter.Q.value = 0.9;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(t);
    noise.stop(t + 0.1);
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
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
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
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
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

  _playBirdChirp() {
    if (!this.started) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const startFreq = 2200 + Math.random() * 800;
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

    setTimeout(() => this._playBirdChirp(), 4000 + Math.random() * 8000);
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
  }
}
