import * as THREE from 'three';
import { buildGatePillars, gateColliders, part, mergeProp } from './props.js';

/**
 * Job 4 — Trolley gate challenge (docs/MISSIONS_PLAN.md): reverse the tractor + trolley through the narrow khet gate into the
 * yard behind it. Timed, best time saved (notebook records); generous tolerance (the gap is wider than the trolley by 1 m) and
 * it never fails — bumping a pillar just costs seconds. Reward: Pitaji's praise + money (more for a fast run).
 */
const GATE = { x: 30, z: 40 };
const GAP = 4.0;
const YARD_Z0 = GATE.z - 9; // the target zone, north of the gate
const YARD_Z1 = GATE.z - 0.2; // trolley centre this far past the gate line = rear axle through

export function registerGateJob(api, env) {
  const st = { stage: 'idle', t: 0, started: false };
  const gate = buildGatePillars(GAP);
  gate.position.set(GATE.x, 0, GATE.z);
  const colliders = gateColliders(GATE.x, GATE.z, GAP);
  gate.userData.colliderBoxes = colliders;
  // a bare yard patch behind the gate with a painted target square
  const yard = mergeProp([part(new THREE.BoxGeometry(11, 0.02, YARD_Z1 - YARD_Z0 + 2), 0xcdb98a, { x: 0, y: 0.012, z: (YARD_Z0 + YARD_Z1) / 2 - GATE.z }), part(new THREE.BoxGeometry(3.8, 0.03, 5.6), 0x7fbf6a, { y: 0.03, z: (YARD_Z0 + YARD_Z1) / 2 - GATE.z })], 'job_gate_yard');
  yard.position.set(GATE.x, 0, GATE.z);
  api.scene.add(gate, yard);
  env.rebuildColliders();

  function trolleyGroup() {
    return env.getTrolley()?.group || null;
  }
  const inYard = (g) => Math.abs(g.position.x - GATE.x) < 2.0 && g.position.z > YARD_Z0 && g.position.z < YARD_Z1;
  const fmt = (t) => `${t.toFixed(1)}s`;

  env.hooks.pitajiFreeRoam = () => {
    if (st.stage === 'idle') {
      api.discoverJob('gate', true);
      const best = api.quest.records.gate;
      api.say(
        [
          { hi: 'बेटा, खेत के उस तंग फाटक से ट्रॉली पीछे की तरफ़ निकालकर दिखाओ — पूरे साल किसी से नहीं हुआ।', en: 'Beta, back the trolley through the narrow khet gate for me — nobody has managed it all year.' },
          { hi: best ? `तुम्हारा सबसे अच्छा समय: ${fmt(best)}।` : 'जल्दी मत करना — घड़ी चल रही है, पर कोई जुर्माना नहीं।', en: best ? `Your best time: ${fmt(best)}.` : 'No hurry — the clock runs, but there is no penalty.' },
        ],
        () => {
          st.stage = 'run';
          st.t = 0;
          st.started = false;
          env.setJobWaypoint(new THREE.Vector3(GATE.x, 0, GATE.z + 6));
          api.hud('Hitch the trolley (F), then reverse it through the khet gate', 'ट्रॉली जोड़ो (F), फिर उसे खेत के फाटक से पीछे निकालो');
        }
      );
    } else {
      api.say([{ hi: 'फाटक पूरब की तरफ़ है — ट्रॉली पीछे से अंदर ले जाओ।', en: 'The gate is over by the track — back the trolley in, tail first.' }]);
    }
  };

  api.onUpdate((dt) => {
    if (st.stage !== 'run') return;
    const g = trolleyGroup();
    const tractor = env.vehicles.find((v) => v.preset.kind === 'tractor');
    const mounted = env.getMounted();
    if (!st.started && mounted && mounted === tractor && tractor.trolley) st.started = true;
    if (st.started) st.t += dt;
    api.hud(`Gate challenge ${st.started ? fmt(st.t) : '— hitch the trolley and go'}`, `फाटक की चुनौती ${st.started ? fmt(st.t) : '— ट्रॉली जोड़ो और चलो'}`);
    if (st.started && g && inYard(g)) {
      st.stage = 'done';
      env.setJobWaypoint(new THREE.Vector3(-48, 0, 31)); // back to Pitaji
      api.hud(`In! ${fmt(st.t)} — tell Pitaji`, `अंदर! ${fmt(st.t)} — पिताजी को बताओ`);
    }
  });

  // the report back to Pitaji pays out
  const oldHook = env.hooks.pitajiFreeRoam;
  env.hooks.pitajiFreeRoam = () => {
    if (st.stage === 'done') {
      const best = api.quest.records.gate;
      const newBest = !best || st.t < best;
      if (newBest) api.quest.records.gate = Math.round(st.t * 10) / 10;
      const pay = 25 + (st.t < 45 ? 25 : st.t < 90 ? 10 : 0);
      env.setJobWaypoint(null);
      api.hudClear();
      api.say(
        [
          { hi: `${fmt(st.t)} में! ${newBest ? 'नया रिकॉर्ड!' : ''} शाबाश, बेटा — मुझे तुम पर गर्व है।`, en: `${fmt(st.t)}! ${newBest ? 'A new record! ' : ''}Well done, beta — I am proud of you.` },
          { hi: `यह लो ₹${pay}।`, en: `Here, Rs ${pay}.` },
        ],
        () => {
          api.addPocket(pay);
          api.jobDone('gate', { en: `${fmt(st.t)} · ₹${pay}`, hi: `${fmt(st.t)} · ₹${pay}` });
          st.stage = 'idle';
        }
      );
      return;
    }
    oldHook();
  };
}
