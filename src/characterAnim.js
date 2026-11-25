/**
 * 17 Nov: rigged Tripo characters (Mixamo skeleton) play their own baked clips:
 * "idle" when standing, "walk" when their container moves. Weight blends smoothly
 * between the two; walk playback speed follows how fast the character is moving.
 * Each character file carries clips retargeted by Tripo to its own body.
 */
import * as THREE from 'three';

const animators = [];
const tmp = new THREE.Vector3();
const tq = new THREE.Quaternion(), te = new THREE.Euler();

// 21 Nov: personality. Each character file now carries its own curated clips: idle, walk, (kids) run, and 1-2
// gesture_<name> clips (nod, point, wave, bless, ...). Walks were reshaped per character (graceful Maa, heavy
// Pitaji, slow stooped Dada/Dadi, dignified Sarpanch, hurrying Postman), so each walk has its own natural speed:
// `walkRef` is the ground speed (m/s) at which that clip's feet don't slide. Elders keep their stoop: no neck fix.
// walkRef = measured natural ground speed of each reshaped walk at in-game height (planted-foot speed, 21 Nov
// render check). `maxRate` caps how much faster than natural a walk may play (1.3x) so nobody scurries or slides
// much; the hurrying Postman and the player may go faster.
const PROFILE = {
  maa: { walkRef: 0.63, maxRate: 1.35 }, // 21 Nov: straight graceful walk, shorter steps
  pitaji: { walkRef: 0.99 },
  dada: { walkRef: 0.56, keepStoop: true },
  dadi: { walkRef: 0.38, keepStoop: true },
  darzi: { keepStoop: true },
  sarpanch: { walkRef: 0.58 },
  postman: { walkRef: 1.38, maxRate: 2.2 },
  teacher: { walkRef: 0.83 },
  didi: { walkRef: 0.86 },
  brother: { walkRef: 0.66, kid: true, runRef: 1.07 },
  sister: { walkRef: 0.99, kid: true, runRef: 1.55 },
  player: { walkRef: 0.66, kid: true, runRef: 1.07, maxRate: 2.2 },
  // 25 Nov: TV Uncle review pair (?compare=tvuncle): clip chosen by buttons (reviewPlay) instead of idle/walk/random gestures
  tvuncle_sm: { review: true },
  tvuncle_aunty: { review: true }, // 25 Nov: Gossip Aunty (tvaunty.glb): idle, walk, call, laugh, greet + Look (gesture_lookaround)
  tvuncle_didi: { review: true }, // Parlour Didi stands in the compare line-up for scale and face comparison (idle only: she has no walk/laugh review clips)
};
// review mode: one clip loops on every review character until reviewPlay() picks another (src/compareScene.js buttons)
let reviewClip = 'idle';
const REVIEW_NAMES = [[/^idle/i, 'idle'], [/^walk_phone/i, 'walk_phone'], [/^walk/i, 'walk'], [/^swagger/i, 'gesture_swagger'], [/^laugh/i, 'gesture_laugh'], [/^make_a_call/i, 'gesture_call'], [/^greet/i, 'gesture_greet'], [/^look_?around/i, 'gesture_lookaround'], [/^gesture_lookaround/i, 'gesture_lookaround']];
const reviewName = (n) => { const h = REVIEW_NAMES.find(([re]) => re.test(n)); return h ? h[1] : n; };
export function reviewPlay(name) {
  reviewClip = name;
  for (const a of animators) if (a.review) applyReview(a);
}
function applyReview(a) {
  const A = a.review.actions; // 25 Nov: Gossip Aunty has two walks: 'Walk' = on the phone (her default), 'Walk plain' = hands free; others have just 'walk'
  const next = (reviewClip === 'walk' ? (A.walk_phone || A.walk) : reviewClip === 'walk_plain' ? A.walk : A[reviewClip]) || A.idle; // a character without that clip (e.g. Look, Swagger) just stands in idle
  if (!next || a.review.cur === next) return;
  // 25 Nov: clipAction(clip) returns the SAME action the idle/walk/gesture setup above already parked at weight 0
  // (gestures at LoopOnce + clamp); reset() keeps that weight, so every faded-in clip stayed at 0 x 1 = frozen. Reset all three.
  next.reset(); next.setEffectiveWeight(1); next.setEffectiveTimeScale(1); next.clampWhenFinished = false; next.setLoop(THREE.LoopRepeat, Infinity); next.play();
  if (a.review.cur) next.crossFadeFrom(a.review.cur, 0.25, false);
  a.review.cur = next;
}
/** comfortable ground speed (m/s) for each character's walking routines (<= 1.3x natural) */
export const WALK_SPEED = { maa: 0.85, pitaji: 1.25, dada: 0.55, dadi: 0.4, sarpanch: 0.72, postman: 1.8, brother: 0.85, sister: 1.25 };
// kids switch from walk to run once walking would play faster than ~1.25x (feet would start to slide)
const RUN_SWITCH = 1.25;
const GESTURE_EVERY = [10, 20]; // seconds of standing between gestures
const GESTURE_FADE = 0.4;

function profileFor(slotName) {
  const key = String(slotName || '').replace(/^(npc|gather)_/, '').replace(/_\d+$/, '');
  return PROFILE[key] || {};
}

export function attachCharacterAnim(root, clips, follow, slotName) {
  const idleClip = clips.find((c) => /idle/i.test(c.name));
  const walkClip = clips.find((c) => /walk/i.test(c.name));
  const runClip = clips.find((c) => /(^|_)run/i.test(c.name));
  const gestureClips = clips.filter((c) => /^gesture_/i.test(c.name));
  if (!idleClip && !walkClip) return;
  const prof = profileFor(slotName);
  root.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false; }); // bind-pose bounds don't follow the animated limbs
  const mixer = new THREE.AnimationMixer(root);
  const idle = idleClip ? mixer.clipAction(idleClip) : null;
  const walk = walkClip ? mixer.clipAction(walkClip) : null;
  if (idle) { idle.play(); idle.time = Math.random() * idleClip.duration; } // villagers don't breathe in sync
  if (walk) { walk.play(); walk.setEffectiveWeight(0); }
  const run = runClip && prof.kid ? mixer.clipAction(runClip) : null;
  if (run) { run.play(); run.setEffectiveWeight(0); }
  const gestures = gestureClips.map((c) => {
    const act = mixer.clipAction(c);
    act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.setEffectiveWeight(0);
    return act;
  });
  // 18 Nov: faces. Free shape keys made in Blender (tools/face_keys.py): "blink" closes the eyelids, "smile" lifts the
  // mouth corners. Blinks every 2-6 s (sometimes double), gentle smiles come and go while standing.
  const face = [];
  root.traverse((o) => { if (o.morphTargetDictionary && o.morphTargetDictionary.blink !== undefined) face.push(o); });
  // 20 Nov: posture. Tripo's idle/walk presets push the head forward 15-27 degrees (hunched, chin poking out).
  // Every frame after the clip plays, the neck is tilted back so it stands ~5 degrees off vertical, and the head
  // is counter-turned so the gaze stays level. Checked live on Sister and Postman.
  let neck = null, head = null;
  root.traverse((o) => {
    if (!o.isBone) return;
    if (!neck && /(^|rig|:)neck$/i.test(o.name)) neck = o;
    if (!head && /(^|rig|:)head$/i.test(o.name)) head = o;
  });
  if (prof.keepStoop) { neck = null; head = null; } // elders and the darzi are meant to stoop
  if (prof.review) {
    const actions = {};
    for (const c of clips) { const act = mixer.clipAction(c); act.setLoop(THREE.LoopRepeat, Infinity); actions[reviewName(c.name)] = act; }
    const a = { root, neck, head, mixer, follow, face: [], review: { actions, cur: null } };
    animators.push(a); applyReview(a);
    return;
  }
  animators.push({ root, neck, head, mixer, idle, walk, run, gestures, follow, prev: new THREE.Vector3(), first: true, speed: 0, w: 0,
    walkRef: prof.walkRef || 1.4, maxRate: prof.maxRate || 1.3, runRef: prof.runRef || 1.5, r: 0, g: null, gw: 0, gLast: -1, gIn: GESTURE_EVERY[0] * 0.5 + Math.random() * GESTURE_EVERY[1],
    face, blinkIn: 1 + Math.random() * 4, blinkT: -1, doubleBlink: false, smile: 0, smileWant: 0, smileIn: 2 + Math.random() * 5 });
}

const UP = new THREE.Vector3(0, 1, 0);
const fwd = new THREE.Vector3(), side = new THREE.Vector3(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
const qw = new THREE.Quaternion(), qp = new THREE.Quaternion(), qh = new THREE.Quaternion(), qh2 = new THREE.Quaternion();
const NECK_WANT = THREE.MathUtils.degToRad(5);
const NECK_MAX = THREE.MathUtils.degToRad(30);

// rotate a bone by a world-space rotation q, keeping its parent untouched
function rotateBoneWorld(bone, q) {
  bone.parent.getWorldQuaternion(qp);
  const local = qp.clone().invert().multiply(q).multiply(qp);
  bone.quaternion.premultiply(local);
  bone.updateWorldMatrix(false, true);
}

function straightenNeck(a) {
  a.root.updateWorldMatrix(true, true);
  fwd.set(0, 0, 1).transformDirection(a.root.matrixWorld);
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-6) return;
  fwd.normalize();
  side.crossVectors(UP, fwd).normalize();
  a.neck.getWorldPosition(pa);
  a.head.getWorldPosition(pb);
  pb.sub(pa);
  const lean = Math.atan2(pb.dot(fwd), pb.y); // + = head pushed forward
  const delta = THREE.MathUtils.clamp(NECK_WANT - lean, -NECK_MAX, NECK_MAX);
  if (Math.abs(delta) < 0.01) return;
  a.head.getWorldQuaternion(qh);
  rotateBoneWorld(a.neck, qw.setFromAxisAngle(side, delta));
  a.head.getWorldQuaternion(qh2);
  rotateBoneWorld(a.head, qh.multiply(qh2.invert())); // keep the face looking where it was
}

// one gesture now and then while standing: fade in over idle, play once, fade back out; never while walking
function updateGesture(a, dt) {
  if (!a.gestures.length) return;
  const standing = a.w < 0.05 && a.speed < 0.2;
  if (a.g) {
    a.gT += dt;
    const dur = a.g.getClip().duration;
    let target = Math.min(1, a.gT / GESTURE_FADE, Math.max(0, (dur - a.gT) / GESTURE_FADE));
    if (!standing) target = 0; // started walking: let go quickly
    a.gw += (target - a.gw) * Math.min(1, dt * (standing ? 12 : 8));
    a.g.setEffectiveWeight(a.gw);
    if (a.gT >= dur || (!standing && a.gw < 0.02)) {
      a.g.stop(); a.g.setEffectiveWeight(0); a.g = null; a.gw = 0;
      a.gIn = GESTURE_EVERY[0] + Math.random() * (GESTURE_EVERY[1] - GESTURE_EVERY[0]);
    }
    return;
  }
  if (!standing) return;
  a.gIn -= dt;
  if (a.gIn > 0) return;
  let i = Math.floor(Math.random() * a.gestures.length);
  if (a.gestures.length > 1 && i === a.gLast) i = (i + 1) % a.gestures.length;
  a.gLast = i; a.g = a.gestures[i]; a.gT = 0; a.gw = 0;
  a.g.reset(); a.g.setEffectiveWeight(0); a.g.play();
}

export function updateCharacterAnims(dt) {
  if (!(dt > 0)) return;
  for (const a of animators) {
    const lod = a.root && a.root.userData && a.root.userData.charLOD; // S7 characters: distance tiers
    if (lod && lod.tier >= 2) { a.first = true; continue; }
    if (a.review) {
      a.mixer.update(dt);
      if (a.neck && a.head && (!lod || lod.stepped)) straightenNeck(a);
      continue;
    }
    a.follow.getWorldPosition(tmp);
    const raw = a.first ? 0 : Math.hypot(tmp.x - a.prev.x, tmp.z - a.prev.z) / dt;
    a.first = false;
    a.prev.copy(tmp);
    a.speed += (raw - a.speed) * Math.min(1, dt * 8);
    // 21 Nov: turning on the spot steps the feet (walk clip, slow) instead of spinning on planted feet
    a.follow.getWorldQuaternion(tq); te.setFromQuaternion(tq, 'YXZ');
    const yaw = te.y, dy = a.yawPrev === undefined ? 0 : Math.atan2(Math.sin(yaw - a.yawPrev), Math.cos(yaw - a.yawPrev));
    a.yawPrev = yaw; a.turn = (a.turn || 0) + (dy / dt - (a.turn || 0)) * Math.min(1, dt * 8);
    const turning = a.speed < 0.35 && Math.abs(a.turn) > 0.5;
    // walking pace only: standing still, or riding something fast (cycle, tractor), uses idle
    const want = a.speed > 0.35 && a.speed < 7 ? 1 : turning ? 0.6 : 0;
    a.w += (want - a.w) * Math.min(1, dt * 6);
    // kids: walk -> run once the walk would play faster than RUN_SWITCH x natural
    const runWant = a.run && a.speed > a.walkRef * RUN_SWITCH ? 1 : 0;
    a.r += (runWant - a.r) * Math.min(1, dt * 5);
    updateGesture(a, dt);
    const keep = 1 - a.gw; // a gesture borrows weight from idle only (it never plays while walking)
    if (a.idle) a.idle.setEffectiveWeight((a.walk ? 1 - a.w : 1) * keep);
    if (a.walk) {
      a.walk.setEffectiveWeight((a.idle ? a.w : 1) * (1 - a.r) * keep);
      a.walk.setEffectiveTimeScale(turning ? 0.75 : THREE.MathUtils.clamp(a.speed / a.walkRef, 0.6, a.maxRate));
    }
    if (a.run) {
      a.run.setEffectiveWeight(a.w * a.r * keep);
      a.run.setEffectiveTimeScale(THREE.MathUtils.clamp(a.speed / a.runRef, 0.8, a.maxRate));
    }
    a.mixer.update(dt);
    if (a.neck && a.head && (!lod || lod.stepped)) straightenNeck(a);
    if (a.face.length && (!lod || lod.tier === 0)) {
      // blink: 0.09 s close, 0.11 s open
      if (a.blinkT < 0) { a.blinkIn -= dt; if (a.blinkIn <= 0) { a.blinkT = 0; } }
      let b = 0;
      if (a.blinkT >= 0) {
        a.blinkT += dt;
        b = a.blinkT < 0.09 ? a.blinkT / 0.09 : Math.max(0, 1 - (a.blinkT - 0.09) / 0.11);
        if (a.blinkT > 0.2) {
          a.blinkT = -1;
          if (!a.doubleBlink && Math.random() < 0.2) { a.doubleBlink = true; a.blinkIn = 0.12; }
          else { a.doubleBlink = false; a.blinkIn = 2 + Math.random() * 4; }
        }
      }
      // smile: drifts between a soft resting smile and a warmer one, less while walking
      a.smileIn -= dt;
      if (a.smileIn <= 0) { a.smileWant = Math.random() < 0.55 ? 0.25 + Math.random() * 0.2 : 0.08; /* above ~0.5 the lips pucker (18 Nov live check) */ a.smileIn = 2 + Math.random() * 5; }
      a.smile += ((a.w > 0.5 ? Math.min(a.smileWant, 0.2) : a.smileWant) - a.smile) * Math.min(1, dt * 3);
      for (const m of a.face) {
        m.morphTargetInfluences[m.morphTargetDictionary.blink] = b;
        if (m.morphTargetDictionary.smile !== undefined) m.morphTargetInfluences[m.morphTargetDictionary.smile] = a.smile;
      }
    }
  }
}
