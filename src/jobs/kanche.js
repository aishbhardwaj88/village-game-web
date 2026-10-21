import * as THREE from 'three';
import { buildKancheGround } from './props.js';
import { powerMeter, rhythmBar } from './minigames.js';

/**
 * Job 10 — Kanche (marbles) and stapu (hopscotch) with the village kids near the chowk (docs/MISSIONS_PLAN.md): two quick
 * mini-games, win marbles, your pouch shows the count (notebook page + HUD). Replayable.
 *   Kanche: three shots against a kid — set the aim, then the power; a clean shot knocks a marble out of the ring.
 *   Stapu:  hop through five squares, each press timed to the beat.
 */
const CENTRE = { x: -46, z: 12 };

export function registerKancheJob(api, env) {
  const ground = buildKancheGround();
  ground.position.set(CENTRE.x, 0, CENTRE.z);
  api.scene.add(ground);

  const kidRoles = ['kid_a', 'kid_b', 'kid_c', 'kid_d'];
  const kids = kidRoles.map((role, i) => {
    const a = (i / kidRoles.length) * Math.PI * 2 + 0.4;
    const k = api.npc(role, { x: CENTRE.x + Math.cos(a) * 1.7, z: CENTRE.z + Math.sin(a) * 1.7 }, Math.atan2(-Math.cos(a), -Math.sin(a)), `npc_kid_${i}`);
    return k;
  });

  async function playKanche() {
    let wins = 0;
    for (let round = 1; round <= 3; round++) {
      const aim = await powerMeter(api, {
        title: { en: `Kanche — shot ${round} of 3`, hi: `कंचा — ${round} / 3` },
        actionEn: 'Lock the aim',
        actionHi: 'निशाना पक्का',
        hintEn: 'Stop the marker in the middle for a straight aim',
        hintHi: 'सीधे निशाने के लिए मार्कर को बीच में रोको',
        speed: 1.1,
        sweetSpot: 0.5,
        zoneHalf: 0.1,
      });
      if (!aim) return;
      const power = await powerMeter(api, {
        title: { en: `Kanche — shot ${round} of 3`, hi: `कंचा — ${round} / 3` },
        actionEn: 'Flick!',
        actionHi: 'मारो!',
        hintEn: 'Not too soft, not too hard — stop in the gold zone',
        hintHi: 'न ज्यादा धीरे, न ज्यादा जोर से — सुनहरे हिस्से में रोको',
        speed: 1.0,
        sweetSpot: 0.72,
        zoneHalf: 0.1,
      });
      if (!power) return;
      const good = Math.abs(aim.power - 0.5) <= 0.1 && Math.abs(power.power - 0.72) <= 0.1;
      const half = Math.abs(aim.power - 0.5) <= 0.2 && Math.abs(power.power - 0.72) <= 0.2;
      const hit = good || (half && Math.random() < 0.5);
      api.audio.playClack(1);
      if (hit) {
        wins += 1;
        api.quest.marbles += 1;
        api.env.refreshHud?.();
        api.hud(`Marbles: ${api.quest.marbles}`, `कंचे: ${api.quest.marbles}`);
        await new Promise((res) => api.say([{ en: 'Clack! Out of the ring — that one is yours!', hi: 'खट! घेरे से बाहर — ये कंचा तुम्हारा!' }], res));
      } else {
        await new Promise((res) => api.say([{ en: 'Missed! The marble rolls past. Try the next one.', hi: 'चूक गए! कंचा आगे निकल गया। अगला मारो।' }], res));
      }
    }
    if (wins >= 2) {
      api.quest.marbles += 2;
      await new Promise((res) => api.say([{ en: 'Wah! You beat me fair and square. Take two more marbles!', hi: 'वाह! तुमने ईमानदारी से हराया। दो कंचे और लो!' }], res));
    } else {
      await new Promise((res) => api.say([{ en: 'Good game! Come again and we will play for keeps.', hi: 'अच्छा खेले! फिर आना, अगली बार पक्की शर्त।' }], res));
    }
    api.jobDone('kanche', { en: `${api.quest.marbles} marbles in your pouch`, hi: `थैली में ${api.quest.marbles} कंचे` });
    api.env.save?.();
  }

  async function playStapu() {
    const res = await rhythmBar(api, {
      title: { en: 'Stapu — hop through five squares', hi: 'स्टापू — पाँच खानों में कूदो' },
      strokes: 5,
      speed: 1.35,
      zoneHalf: 0.14,
      actionEn: 'Hop!',
      actionHi: 'कूदो!',
      hintEn: 'Hop when the marker is in the green square',
      hintHi: 'मार्कर हरे खाने में हो तब कूदो',
      onStroke: (hit) => api.audio.playBlip(hit ? 740 : 220, 0.1, 0.8, 'triangle'),
    });
    if (!res) return;
    const misses = res.presses - res.hits;
    const won = misses <= 2;
    if (won) {
      api.quest.marbles += 2;
      api.env.refreshHud?.();
    }
    await new Promise((r) =>
      api.say(
        [{ en: won ? 'Not one foot on the line! The kids give you two marbles as a prize.' : 'You stepped on a line a few times — the kids giggle and say try again.', hi: won ? 'एक भी बार लकीर पर पैर नहीं! बच्चे इनाम में दो कंचे देते हैं।' : 'कुछ बार लकीर पर पैर पड़ा — बच्चे हँसकर कहते हैं फिर कोशिश करो।' }],
        r
      )
    );
    api.jobDone('kanche', { en: won ? '+2 marbles' : 'good try', hi: won ? '+2 कंचे' : 'अच्छी कोशिश' });
  }

  api.addInteraction({
    id: 'job_kanche',
    position: new THREE.Vector3(CENTRE.x, 0, CENTRE.z),
    radius: 3.6,
    priority: 1,
    label: { en: 'Play with the kids', hi: 'बच्चों के साथ खेलो' },
    onInteract: () => {
      api.discoverJob('kanche', true);
      api.say([{ en: `Bhaiya! Play kanche or stapu with us? (Your pouch: ${api.quest.marbles} marbles)`, hi: `भैया! हमारे साथ कंचे या स्टापू खेलोगे? (थैली में ${api.quest.marbles} कंचे)` }], () =>
        api.choose({ en: 'Which game?', hi: 'कौन सा खेल?' }, [{ id: 'kanche', en: 'Kanche (marbles)', hi: 'कंचे' }, { id: 'stapu', en: 'Stapu (hopscotch)', hi: 'स्टापू' }, { id: 'no', en: 'Later', hi: 'बाद में' }], (id) => {
          if (id === 'kanche') playKanche();
          else if (id === 'stapu') playStapu();
        })
      );
    },
  });
}
