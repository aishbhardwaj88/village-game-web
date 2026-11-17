/**
 * 17 Nov: rigged Tripo characters (Mixamo skeleton) play their own baked clips:
 * "idle" when standing, "walk" when their container moves. Weight blends smoothly
 * between the two; walk playback speed follows how fast the character is moving.
 * Each character file carries clips retargeted by Tripo to its own body.
 */
import * as THREE from 'three';

const animators = [];
const tmp = new THREE.Vector3();

export function attachCharacterAnim(root, clips, follow) {
  const idleClip = clips.find((c) => /idle/i.test(c.name));
  const walkClip = clips.find((c) => /walk/i.test(c.name));
  if (!idleClip && !walkClip) return;
  root.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false; }); // bind-pose bounds don't follow the animated limbs
  const mixer = new THREE.AnimationMixer(root);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const walk = walkClip ? mixer.clipAction(walkClip) : null;
  if (idle) { idle.play(); idle.time = Math.random() * idleClip.duration; } // villagers don't breathe in sync
  if (walk) { walk.play(); walk.setEffectiveWeight(0); }
  animators.push({ mixer, idle, walk, follow, prev: new THREE.Vector3(), first: true, speed: 0, w: 0 });
}

export function updateCharacterAnims(dt) {
  if (!(dt > 0)) return;
  for (const a of animators) {
    a.follow.getWorldPosition(tmp);
    const raw = a.first ? 0 : Math.hypot(tmp.x - a.prev.x, tmp.z - a.prev.z) / dt;
    a.first = false;
    a.prev.copy(tmp);
    a.speed += (raw - a.speed) * Math.min(1, dt * 8);
    // walking pace only: standing still, or riding something fast (cycle, tractor), uses idle
    const want = a.speed > 0.35 && a.speed < 7 ? 1 : 0;
    a.w += (want - a.w) * Math.min(1, dt * 6);
    if (a.idle) a.idle.setEffectiveWeight(a.walk ? 1 - a.w : 1);
    if (a.walk) {
      a.walk.setEffectiveWeight(a.idle ? a.w : 1);
      a.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(a.speed / 1.4, 0.7, 2.2));
    }
    a.mixer.update(dt);
  }
}
