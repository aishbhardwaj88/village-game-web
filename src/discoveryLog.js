// Shared bits for the "scattered as discoveries" interactions (VILLAGE_VOCABULARY s11, s12, s13):
// a found-it log in localStorage (separate key, never touches quest save), and a few tiny procedural
// sounds that the AudioEngine does not already have. No meshes, no draw calls, no colliders.
import * as THREE from 'three';
import { registerInteraction } from './interactions.js';

const KEY = 'dopahar_discoveries_v1';
const ALL = new Set(); // every discovery id registered this session (the denominator)
let found;
try { found = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { found = new Set(); }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch (e) { /* private mode: count stays in memory */ } };

export const discoveryCount = () => ({ found: [...found].filter((id) => ALL.has(id)).length, total: ALL.size });

/**
 * Register one discovery: an interaction whose first press also ticks the log.
 * `lines(ctx, n)` returns the dialogue lines for the n-th press (0-based), `sound(audio, n)` is optional.
 */
export function registerDiscovery({ id, x, z, radius = 2.4, label, lines, sound, priority = 0.3, available }) {
  ALL.add(id);
  let n = 0;
  registerInteraction({
    id: `find_${id}`, position: new THREE.Vector3(x, 0, z), radius, priority, label, available,
    onInteract: (ctx) => {
      try { if (sound && ctx.audio?.started) sound(ctx.audio, n); } catch (e) { /* sound must never break the game */ }
      const out = lines(ctx, n).slice();
      if (!found.has(id)) {
        found.add(id); persist();
        const c = discoveryCount();
        out.push({ hi: `पुरानी यादें मिलीं: ${c.total} में से ${c.found}`, en: `Old memories found: ${c.found} of ${c.total}` });
      }
      n++;
      ctx.dialogue.say(out);
    },
  });
}

/** Cycle through a list of {hi, en} lines one per press. */
export const cycle = (list) => (ctx, n) => [list[n % list.length]];

// ---------------- procedural sounds (all through audio.master, so mute/volume/duck apply) ----------------
let noiseBuf = null;
function noise(ac) {
  if (noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf;
  const n = ac.sampleRate * 2; noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/** Filtered noise burst: splash, sand through a sieve, a paper rustle. */
export function noiseBurst(audio, { t = 0, dur = 0.4, peak = 0.12, type = 'bandpass', f0 = 900, f1 = f0, q = 0.8, attack = 0.01 } = {}) {
  const ac = audio.ctx, t0 = ac.currentTime + t;
  const src = ac.createBufferSource(); src.buffer = noise(ac);
  const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(audio.master);
  src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
}

/** One pitched note with an envelope, optionally low-passed. */
export function note(audio, { t = 0, f0 = 440, f1 = f0, dur = 0.3, peak = 0.06, type = 'sine', lp = 0, attack = 0.01 } = {}) {
  const ac = audio.ctx, t0 = ac.currentTime + t;
  const o = ac.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = o;
  if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
  node.connect(g).connect(audio.master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

/** A rope pulley's dry creak: a few short rasping glides. */
export function creak(audio, t = 0, count = 4) {
  for (let i = 0; i < count; i++) note(audio, { t: t + i * 0.42, f0: 210 + Math.random() * 40, f1: 150 + Math.random() * 30, dur: 0.3, peak: 0.035, type: 'sawtooth', lp: 900 });
}

/** A dhol: low thud plus a slap, `pattern` is beat offsets in seconds. */
export function dhol(audio, pattern = [0, 0.25, 0.5, 0.62, 0.75]) {
  pattern.forEach((b, i) => {
    note(audio, { t: b, f0: i % 2 ? 160 : 95, f1: i % 2 ? 120 : 60, dur: 0.22, peak: 0.16, type: 'sine', attack: 0.004 });
    if (i % 2) noiseBurst(audio, { t: b, dur: 0.07, peak: 0.06, f0: 2400, q: 1.2, attack: 0.002 });
  });
}
