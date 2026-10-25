import * as THREE from 'three';
import { part, mergeProp, buildKiteGeometryParts } from './props.js';
import { pt } from '../anchors.js';

/**
 * Job 1 — Patang loot (docs/MISSIONS_PLAN.md): a cut kite drifts across the sky; race three kids to where it lands. Reach the
 * landing spot first and the kite joins your collection (+Rs 10). The kids run at a slightly slower pace than you.
 * Start: talk to the kid with the charkhi near the chowk (or any kid there) once the kite match is on.
 */
const STARTER = { x: -58.5, z: 18.5 };
const SPOTS = [
  { x: 2, z: 30 }, { x: -22, z: 25 }, { x: 24, z: 34 }, { x: -30, z: 60 }, { x: 18, z: 20 },
];
const KID_START = [{ x: -4, z: 0 }, { x: -8, z: 4 }, { x: 0, z: 6 }].map((o) => ({ x: pt('store').x + o.x, z: pt('store').z + o.z })); // offsets from the store anchor

export function registerPatangJob(api, env) {
  const st = { stage: 'idle', t: 0, from: null, to: null, spot: null, runners: [] };
  const starter = api.npc('kid_d', STARTER, 0, 'npc_patang_kid');
  const kite = mergeProp(buildKiteGeometryParts(0xe0392b, 0xf2b01e), 'job_kite');
  kite.scale.setScalar(1.6);
  kite.visible = false;
  api.scene.add(kite);
  const rivals = ['kid_a', 'kid_b', 'kid_c'].map((role, i) => {
    const r = api.npc(role, KID_START[i], 0, `npc_patang_rival_${i}`);
    r.root.visible = false;
    return r;
  });
  const DURATION = 18; // seconds the kite drifts before it lands
  const follows = rivals.map((r, i) => env.followRoutine(r.root, () => st.spot, { stopDistance: 0.6, speed: 3.0 + i * 0.1, getExtraBoxes: () => env.otherVehicleBoxes(null) }));

  api.addInteraction({
    id: 'job_patang_kid',
    position: starter.root.position,
    radius: 2.6,
    priority: 1,
    label: { en: 'Join the kite chase', hi: 'पतंग लूटने चलो' },
    onInteract: () => {
      if (st.stage !== 'idle') {
        api.say([{ en: 'Look up! Run, run, it is coming down!', hi: 'ऊपर देखो! भागो भागो, पतंग उतर रही है!' }]);
        return;
      }
      api.discoverJob('patang', true);
      api.say([{ en: 'A kite is cut! The one who reaches it first keeps it — ready? Go go go!', hi: 'पतंग कट गई! जो सबसे पहले पहुँचे, उसकी — तैयार? भागो!' }], () => {
        st.spot = new THREE.Vector3(...(() => { const s = SPOTS[Math.floor(Math.random() * SPOTS.length)]; return [s.x, 0, s.z]; })());
        st.from = new THREE.Vector3(STARTER.x - 4, 28, STARTER.z - 10);
        st.t = 0;
        st.stage = 'chase';
        kite.visible = true;
        rivals.forEach((r, i) => {
          r.root.visible = true;
          r.root.position.set(KID_START[i].x, 0, KID_START[i].z);
        });
        env.setJobWaypoint(st.spot);
        api.hud('Chase the kite! Run to the arrow before the kids do', 'पतंग के पीछे भागो! बच्चों से पहले तीर तक पहुँचो');
      });
    },
  });

  function finish(won) {
    st.stage = 'idle';
    kite.visible = false;
    rivals.forEach((r) => (r.root.visible = false));
    env.setJobWaypoint(null);
    api.hudClear();
    if (won) {
      api.quest.kites += 1;
      api.addPocket(10);
      api.say([{ en: `Got it! The kite is yours — that is ${api.quest.kites} in your collection.`, hi: `मिल गई! पतंग तुम्हारी — अब ${api.quest.kites} पतंगें हैं।` }], () => api.jobDone('patang', { en: `kite #${api.quest.kites} · ₹10`, hi: `पतंग #${api.quest.kites} · ₹10` }));
    } else {
      api.say([{ en: 'A kid grabbed it first! Never mind — the sky has more kites.', hi: 'एक बच्चा पहले पहुँच गया! कोई बात नहीं — आसमान में और पतंगें हैं।' }], () => api.jobDone('patang', { en: 'good chase', hi: 'अच्छी दौड़' }));
    }
  }

  api.onUpdate((dt) => {
    if (st.stage !== 'chase') return;
    st.t += dt;
    const k = Math.min(1, st.t / DURATION);
    // drift: from the start in a gentle arc down to the landing spot
    kite.position.lerpVectors(st.from, st.spot, k);
    kite.position.y = st.from.y * (1 - k) + 0.6 + Math.sin(st.t * 2.2) * 0.4 * (1 - k);
    kite.rotation.y = Math.atan2(st.spot.x - st.from.x, st.spot.z - st.from.z);
    kite.rotation.z = Math.sin(st.t * 1.7) * 0.25;
    rivals.forEach((r, i) => {
      follows[i](dt);
      r.animate(dt, true);
    });
    const p = env.getPlayerPos();
    if (Math.hypot(p.x - st.spot.x, p.z - st.spot.z) < 2.4 && st.t > 3) return finish(true);
    for (const r of rivals) if (Math.hypot(r.root.position.x - st.spot.x, r.root.position.z - st.spot.z) < 1.2 && st.t > 3) return finish(false);
    if (st.t > DURATION + 40) finish(false);
  });
}
