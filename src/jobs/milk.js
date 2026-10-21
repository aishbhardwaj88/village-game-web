import * as THREE from 'three';
import { buildMilkCans } from './props.js';

/**
 * Job 2 — Milk round (docs/MISSIONS_PLAN.md): help the doodhwala deliver milk to five houses before his round ends (a generous
 * timer — on the cycle it is easy, on foot still doable; running out of time only halves the reward). Reward: pocket money.
 * The waypoint arrow points at the next house; one aunty NPC is moved to each doorstep in turn.
 */
const DOODH = { x: -47.5, z: 62 };
const STOPS = [
  { x: -22, z: 76, side: -1, who: 'Sharma-ji ki bahu', hi: 'शर्मा जी की बहू' },
  { x: -6, z: 76, side: 1, who: 'Chachi', hi: 'चाची' },
  { x: 12, z: 76, side: -1, who: 'Kamla tai', hi: 'कमला ताई' },
  { x: 26, z: 76, side: 1, who: 'Pushpa didi', hi: 'पुष्पा दीदी' },
  { x: -6, z: 95, side: 1, who: 'Rani bua', hi: 'रानी बुआ' },
];
const TIME_LIMIT = 220; // seconds

export function registerMilkJob(api, env) {
  const st = { stage: 'idle', idx: 0, timeLeft: 0 };
  const dood = api.npc('doodhwala', DOODH, Math.PI / 2, 'npc_doodhwala');
  const aunty = api.npc('villager_aunty', { x: 0, z: 0 }, 0, 'npc_milk_aunty');
  aunty.root.visible = false;
  let cansRemove = null;

  function nextStop() {
    const s = STOPS[st.idx];
    aunty.root.visible = true;
    aunty.root.position.set(s.x, 0, s.z + s.side * 2.0);
    aunty.root.rotation.y = s.side > 0 ? Math.PI : 0;
    env.setJobWaypoint(new THREE.Vector3(s.x, 0, s.z));
    hud();
  }
  function hud() {
    const t = Math.max(0, Math.ceil(st.timeLeft));
    api.hud(`Milk round: house ${st.idx + 1} of 5 — time ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, `दूध का चक्कर: घर ${st.idx + 1} / 5 — समय ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
  }
  function finishRound() {
    aunty.root.visible = false;
    env.setJobWaypoint(new THREE.Vector3(DOODH.x, 0, DOODH.z));
    st.stage = 'return';
    api.hud('All delivered! Go back to the doodhwala', 'सब बँट गया! दूधवाले के पास लौटो');
  }

  api.addInteraction({
    id: 'job_milk_doodhwala',
    position: dood.root.position,
    radius: 2.8,
    priority: 1,
    label: { en: 'Talk to the doodhwala', hi: 'दूधवाले से बात करें' },
    onInteract: () => {
      if (st.stage === 'idle') {
        api.discoverJob('milk', true);
        api.say(
          [
            { en: "Beta, my round is behind and my knees are old. Take my milk cans — five houses, and the cycle will make it quick.", hi: 'बेटा, मेरा चक्कर पिछड़ गया और घुटने बूढ़े हो गए। मेरे दूध के डिब्बे ले जाओ — पाँच घर, साइकिल से जल्दी हो जाएगा।' },
            { en: 'Follow the arrow. Hop off at each house and hand the milk over.', hi: 'तीर के पीछे चलो। हर घर पर उतरकर दूध दे देना।' },
          ],
          () => {
            st.stage = 'deliver';
            st.idx = 0;
            st.timeLeft = TIME_LIMIT;
            const cans = buildMilkCans();
            cans.position.set(0, 0.55, -0.45);
            cansRemove = api.attachToPlayer(cans);
            nextStop();
          }
        );
      } else if (st.stage === 'return') {
        cansRemove?.();
        cansRemove = null;
        env.setJobWaypoint(null);
        api.hudClear();
        const full = st.timeLeft > 0;
        const pay = full ? 20 + Math.min(20, Math.floor(st.timeLeft / 10)) : 10;
        api.say(
          [{ en: full ? `Right on time! Not a drop wasted. Here, Rs ${pay}.` : `A bit late, but the milk is delivered — thank you! Here, Rs ${pay}.`, hi: full ? `बिल्कुल समय पर! एक बूँद भी बर्बाद नहीं। लो, ₹${pay}।` : `थोड़ी देर हो गई, पर दूध बँट गया — शुक्रिया! लो, ₹${pay}।` }],
          () => {
            api.addPocket(pay);
            api.jobDone('milk', { en: `₹${pay}`, hi: `₹${pay}` });
            st.stage = 'idle';
          }
        );
      } else {
        api.say([{ en: 'Follow the arrow, beta — five houses.', hi: 'तीर के पीछे चलो, बेटा — पाँच घर।' }]);
      }
    },
  });

  api.addInteraction({
    id: 'job_milk_stop',
    position: aunty.root.position,
    radius: 2.6,
    priority: 1,
    label: { en: 'Hand over the milk', hi: 'दूध दें' },
    available: () => st.stage === 'deliver',
    onInteract: () => {
      const s = STOPS[st.idx];
      api.say(
        [{ en: `${s.who}: "Oh, the milk at last! Thank you, beta — tell the doodhwala his tea is on me."`, hi: `${s.hi}: "अरे, दूध आ गया! शुक्रिया बेटा — दूधवाले से कहना चाय मेरी तरफ से।"` }],
        () => {
          st.idx += 1;
          if (st.idx >= STOPS.length) finishRound();
          else nextStop();
        }
      );
    },
  });

  api.onUpdate((dt) => {
    if (st.stage !== 'deliver' && st.stage !== 'return') return;
    st.timeLeft = Math.max(0, st.timeLeft - dt);
    if (st.stage === 'deliver') hud();
  });
}
