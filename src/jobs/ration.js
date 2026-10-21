import * as THREE from 'three';
import { part, mergeProp } from './props.js';

/**
 * Job 9 — Ration run with Maa (docs/MISSIONS_PLAN.md): Maa walks with you to the ration shop, the shopkeeper weighs out the
 * wheat, you carry the sack home on your back with Maa beside you, and hand it over. Reward: pocket money + Maa's blessing.
 */
const SHOP_COUNTER = new THREE.Vector3(-65.2, 0, 31);
const KEEPER_POS = { x: -65.9, z: 32.6 };

function sackMesh() {
  const jute = 0xb99a64;
  const parts = [
    part(new THREE.CylinderGeometry(0.2, 0.26, 0.62, 10), jute, { y: 0 }),
    part(new THREE.SphereGeometry(0.2, 8, 6), jute, { y: 0.32, sy: 0.55 }),
    part(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), 0x6b4a2a, { y: 0.37 }),
  ];
  const m = mergeProp(parts, 'carried_sack');
  m.position.set(0, 1.0, -0.32);
  m.rotation.x = -0.25;
  return m;
}

export function registerRationJob(api, env) {
  const st = { stage: 'idle' }; // idle -> walking -> carrying
  const maa = env.npcs.maa;
  let carryRemove = null;

  const keeper = api.npc('shopkeeper', KEEPER_POS, Math.PI / 2, 'npc_ration_keeper');
  env.addStaticAnimated?.(keeper);

  env.hooks.maaFreeRoam = () => {
    if (st.stage === 'idle') {
      api.say(
        [{ hi: 'बेटा, राशन की दुकान तक चलो — गेहूं की बोरी लानी है। मैं साथ चलती हूँ।', en: 'Beta, walk with me to the ration shop — we need a sack of wheat. I will come along.' }],
        () => {
          st.stage = 'walking';
          env.setMaaFollowing(true);
          api.discoverJob('ration', true);
          api.hud('Walk with Maa to the ration shop', 'माँ के साथ राशन की दुकान चलो');
        }
      );
    } else if (st.stage === 'walking') {
      api.say([{ hi: 'चलो, राशन की दुकान उधर है।', en: 'Come on, the ration shop is over there.' }]);
    } else if (st.stage === 'carrying') {
      const pocket = 30;
      carryRemove?.();
      carryRemove = null;
      env.setMaaFollowing(false);
      api.hudClear();
      api.say(
        [
          { hi: 'शाबाश बेटा! पूरी बोरी बिना रुके ले आए।', en: 'Well done, beta! The whole sack, without once putting it down.' },
          { hi: `यह लो, ₹${pocket} — जो चाहे खा लेना।`, en: `Here, Rs ${pocket} — buy yourself something nice.` },
        ],
        () => {
          api.addPocket(pocket);
          api.jobDone('ration', { en: `₹${pocket}`, hi: `₹${pocket}` });
          st.stage = 'idle';
        }
      );
    } else {
      api.say([{ hi: 'आज का सारा काम हो गया, बहुत शुक्रिया बेटा।', en: "All of today's work is done, thank you so much." }]);
    }
  };

  api.addInteraction({
    id: 'job_ration_shop',
    position: SHOP_COUNTER,
    radius: 2.8,
    priority: 1.5,
    label: { hi: 'राशन की बोरी लें', en: 'Collect the wheat sack' },
    available: () => st.stage === 'walking',
    onInteract: () => {
      const p = env.getPlayerPos();
      const near = Math.hypot(maa.position.x - p.x, maa.position.z - p.z) < 9;
      if (!near) {
        api.say([{ hi: 'माँ को आने दो, बेटा — वो पीछे रह गईं।', en: 'Wait for Maa, beta — she is a little behind.' }]);
        return;
      }
      api.say(
        [
          { hi: 'नमस्ते बहनजी! आज पूरी बोरी चाहिए?', en: 'Namaste, behenji! The full sack today?' },
          { hi: 'हाँ भैया, तौल दीजिए — बेटा उठा लेगा।', en: 'Yes, bhaiya, weigh it out — my son will carry it.', holdMs: 1800 },
          { hi: 'यह लो — पूरे पच्चीस किलो।', en: 'Here you go — a full twenty-five kilos.' },
        ],
        () => {
          st.stage = 'carrying';
          carryRemove = api.attachToPlayer(sackMesh());
          api.hud('Carry the sack home to Maa', 'बोरी घर ले चलो');
        }
      );
    },
  });
}
