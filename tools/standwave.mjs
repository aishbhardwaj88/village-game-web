/**
 * 26 Nov: Tripo's "wave_goodbye" clip is a deep SQUAT with a goodbye wave (hips drop ~19 cm, feet planted forward, hands clasped between waves).
 * Build a STANDING wave instead: the idle clip for the whole body, with the LEFT arm chain (shoulder / arm / forearm / hand / fingers) blended
 * to the wave clip's own arm rotations while the hand is up. Replaces the raw wave animation. Call after the other clips are named (idle, gesture_wave).
 *   fixWave(doc, { t0: 1.8, len: 4.0, fps: 24 })
 */
import * as THREE from 'three';

function sample(sampler, t, size) { // linear / step sampling of one sampler at time t -> array(size)
  const T = sampler.getInput().getArray(), O = sampler.getOutput().getArray(), step = sampler.getInterpolation() === 'STEP';
  const n = T.length; const out = new Array(size);
  let i = 0; if (t <= T[0]) i = 0; else if (t >= T[n - 1]) i = n - 1; else { while (T[i + 1] < t) i++; }
  if (step || i === n - 1 || t <= T[0]) { for (let k = 0; k < size; k++) out[k] = O[Math.min(i, n - 1) * size + k]; return out; }
  const f = (t - T[i]) / (T[i + 1] - T[i]);
  if (size === 4) { const a = new THREE.Quaternion().fromArray(O, i * 4), b = new THREE.Quaternion().fromArray(O, (i + 1) * 4); return a.slerp(b, f).toArray(); }
  for (let k = 0; k < size; k++) out[k] = O[i * size + k] * (1 - f) + O[(i + 1) * size + k] * f;
  return out;
}
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export function fixWave(doc, { t0 = 1.8, len = 4.0, fps = 24, up = [0.4, 1.0], down = [2.5, 3.3] } = {}) {
  const root = doc.getRoot(), anims = root.listAnimations();
  const idle = anims.find((a) => a.getName() === 'idle'), wave = anims.find((a) => a.getName() === 'gesture_wave');
  if (!idle || !wave) throw new Error('fixWave: need idle and gesture_wave');
  const wch = new Map(); for (const c of wave.listChannels()) wch.set(`${c.getTargetNode().getName()}|${c.getTargetPath()}`, c);
  const nF = Math.round(len * fps) + 1, times = new Float32Array(nF).map((_, k) => k / fps);
  const buf = root.listBuffers()[0];
  const mkAcc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  const timeAcc = mkAcc('SCALAR', times);
  const out = doc.createAnimation('gesture_wave_new');
  const SZ = { translation: 3, rotation: 4, scale: 3 }, TYPE = { 3: 'VEC3', 4: 'VEC4' };
  const isArm = (n) => /^Left(Shoulder|Arm|ForeArm|Hand)/.test(n.replace('mixamorig:', ''));
  let blended = 0;
  for (const c of idle.listChannels()) {
    const node = c.getTargetNode(), name = node.getName(), path = c.getTargetPath(), size = SZ[path];
    const wc = isArm(name) && path === 'rotation' ? wch.get(`${name}|${path}`) : null;
    const arr = new Float32Array(nF * size);
    for (let k = 0; k < nF; k++) {
      const T = times[k]; let v = sample(c.getSampler(), T, size);
      if (wc) {
        const w = sm((T - up[0]) / (up[1] - up[0])) * (1 - sm((T - down[0]) / (down[1] - down[0])));
        if (w > 0) { const wv = sample(wc.getSampler(), t0 + T, 4); v = new THREE.Quaternion().fromArray(v).slerp(new THREE.Quaternion().fromArray(wv), w).toArray(); }
      }
      arr.set(v, k * size);
    }
    if (wc) blended++;
    const s = doc.createAnimationSampler().setInput(timeAcc).setOutput(mkAcc(TYPE[size], arr)).setInterpolation('LINEAR');
    out.addSampler(s); out.addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(s));
  }
  wave.dispose(); out.setName('gesture_wave');
  console.log(`fixWave: standing wave built (${nF} frames, ${blended} arm tracks blended from the raw wave)`);
}
