import * as THREE from 'three';
import { buildPump, buildBucketParts, mergeProp } from './props.js';
import { rhythmBar } from './minigames.js';

/**
 * Job 7 — Hand pump for Dadi (docs/MISSIONS_PLAN.md): fill 3 buckets at the lane hand pump with a rhythm pump, carry them home
 * without spilling (sharp turns slosh water out), hand them to Dadi. Reward scales with the water left (never fails).
 */
const PUMP_POS = new THREE.Vector3(-55.5, 0, 28);

export function registerPumpJob(api, env) {
  const { quest } = api;
  const st = { stage: 'idle', filled: 0, water: 1 }; // idle -> toPump -> carrying
  let carryRemove = null;
  let lastPos = null;
  let lastHeading = null;

  // The pump itself.
  const pump = buildPump();
  pump.position.copy(PUMP_POS);
  pump.rotation.y = Math.PI / 2;
  api.scene.add(pump);

  function bucketsMesh(n) {
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(...buildBucketParts(i === 2 ? 0 : (i ? 0.5 : -0.5), i === 2 ? 1.75 : 0.45, i === 2 ? 0 : 0.12, 1));
    const m = mergeProp(parts, 'carried_buckets');
    return m;
  }

  function startCarry() {
    st.stage = 'carrying';
    st.water = 1;
    lastPos = null;
    carryRemove = api.attachToPlayer(bucketsMesh(3));
    api.hud(`Water: ${Math.round(st.water * 100)}% — carry it home to Dadi (turn gently)`, `पानी: ${Math.round(st.water * 100)}% — दादी के पास ले जाओ (धीरे मुड़ो)`);
  }
  function endCarry() {
    carryRemove?.();
    carryRemove = null;
    api.hudClear();
  }

  api.registerDadi({
    id: 'pump',
    label: { en: 'Fetch water from the pump', hi: 'पंप से पानी लाओ' },
    handleLabel: { hi: 'दादी को पानी दें', en: 'Give Dadi the water' },
    active: () => st.stage === 'carrying',
    canStart: () => st.stage === 'idle',
    handle: () => {
      const pocket = Math.round(10 + 30 * st.water);
      endCarry();
      api.say(
        [
          { hi: st.water > 0.7 ? 'वाह! एक बूँद भी नहीं गिरी। जीते रहो बेटा।' : 'थोड़ा छलक गया, कोई बात नहीं — पानी तो पानी है!', en: st.water > 0.7 ? 'Wonderful! Not a drop spilled. God bless you, beta.' : 'A little spilled, never mind — water is water!' },
          { hi: `यह लो, तुम्हारी मेहनत के ₹${pocket}।`, en: `Here, Rs ${pocket} for your trouble.` },
        ],
        () => {
          api.addPocket(pocket);
          api.jobDone('pump', { en: `₹${pocket}`, hi: `₹${pocket}` });
          st.stage = 'idle';
          st.filled = 0;
        }
      );
    },
    start: () => {
      api.discoverJob('pump', true);
      api.say(
        [{ hi: 'बेटा, चौक वाले पंप से तीन बाल्टी पानी ले आओ — मीठा पानी वहीं का है। छलकाना मत!', en: "Beta, bring three buckets of water from the pump at the chowk — the sweet water is there. Don't spill it!" }],
        () => {
          st.stage = 'toPump';
          api.hud('Fill 3 buckets at the lane hand pump', 'लेन के हैंडपंप से 3 बाल्टी भरो');
        }
      );
    },
  });

  api.addInteraction({
    id: 'job_pump_pump',
    position: new THREE.Vector3(PUMP_POS.x, 0, PUMP_POS.z + 0.8),
    radius: 2.2,
    label: { hi: 'पंप चलाएँ', en: 'Work the hand pump' },
    available: () => st.stage === 'toPump',
    onInteract: async () => {
      const bucket = st.filled + 1;
      const res = await rhythmBar(api, {
        title: { en: `Bucket ${bucket} of 3`, hi: `बाल्टी ${bucket} / 3` },
        strokes: 4,
        speed: 1.25,
        zoneHalf: 0.13,
        hintEn: 'Press when the marker is in the green zone',
        hintHi: 'मार्कर हरे हिस्से में हो तब दबाओ',
        onStroke: (hit) => api.audio.playPump?.(),
      });
      if (!res) return;
      st.filled += 1;
      if (st.filled >= 3) {
        api.hud('Buckets full!', 'बाल्टियाँ भर गईं!');
        startCarry();
      } else {
        api.hud(`Buckets filled: ${st.filled}/3`, `भरी बाल्टियाँ: ${st.filled}/3`);
      }
    },
  });

  api.onUpdate((dt) => {
    if (st.stage !== 'carrying') return;
    const p = env.getPlayerPos();
    if (lastPos) {
      const dx = p.x - lastPos.x;
      const dz = p.z - lastPos.z;
      if (Math.hypot(dx, dz) > 0.01) {
        const heading = Math.atan2(dx, dz);
        if (lastHeading !== null) {
          let d = Math.abs(heading - lastHeading);
          if (d > Math.PI) d = Math.PI * 2 - d;
          const rate = d / Math.max(dt, 1e-3);
          if (rate > 2.4) st.water = Math.max(0.15, st.water - 0.012 * (rate - 2.4)); // sharp turns slosh water out; never below 15%
        }
        lastHeading = heading;
      }
    }
    lastPos = { x: p.x, z: p.z };
    api.hud(`Water: ${Math.round(st.water * 100)}% — carry it home to Dadi (turn gently)`, `पानी: ${Math.round(st.water * 100)}% — दादी के पास ले जाओ (धीरे मुड़ो)`);
  });
}
