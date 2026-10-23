import * as THREE from 'three';
import { buildMaidan } from './props.js';
import { powerMeter } from './minigames.js';

/**
 * Job 6 — Gilli-danda at the khel maidan (docs/MISSIONS_PLAN.md): a timing power meter decides how far the gilli flies; beat three
 * rival kids in turn, each with a longer score than the last. The best distance is kept (notebook records). Discovered by the
 * peepal poster or by hearing the kids shout (sound radar).
 */
const MAIDAN = { x: 46, z: 104 };
const KHEL_MAIDAN = { x: 165, z: 135 }; // createKhelMaidan in main.js
const RIVALS = [
  { role: 'kid_a', name: 'Bittu', score: 22 },
  { role: 'kid_b', name: 'Guddu', score: 29 },
  { role: 'kid_c', name: 'Pappu', score: 36 },
];

export function registerGilliJob(api, env) {
  const maidan = buildMaidan();
  maidan.position.set(MAIDAN.x, 0, MAIDAN.z);
  api.scene.add(maidan);
  RIVALS.forEach((r, i) => api.npc(r.role, { x: MAIDAN.x - 4 + i * 3.2, z: MAIDAN.z - 2.5 + (i % 2) * 2.5 }, Math.PI / 2 * (i % 2 ? 1 : -1), `npc_gilli_${i}`));
  api.npc('kid_d', { x: MAIDAN.x + 6, z: MAIDAN.z + 3 }, -Math.PI / 2, 'npc_gilli_ref');

  let shout = 3;
  let farShout = 5;
  api.onUpdate((dt) => {
    // the big khel maidan at the east edge (MAP.md) is lively too: fainter, longer-range cheers, no job there
    const pf = env.getPlayerPos();
    const df = Math.hypot(KHEL_MAIDAN.x - pf.x, KHEL_MAIDAN.z - pf.z);
    farShout -= dt;
    if (df < 70 && farShout <= 0) {
      api.audio.playCheer(Math.max(0.1, 0.8 - df / 70), 0.7);
      farShout = 6 + Math.random() * 4;
    }
    const p = env.getPlayerPos();
    const d = Math.hypot(MAIDAN.x - p.x, MAIDAN.z - p.z);
    shout -= dt;
    if (d < 65 && shout <= 0) {
      api.audio.playCheer(Math.max(0.15, 1 - d / 65), 0.8);
      shout = 4 + Math.random() * 3;
    }
    if (d < 38) api.discoverJob('gilli');
  });

  async function swing() {
    const res = await powerMeter(api, {
      title: { en: 'Gilli-danda — your turn', hi: 'गिल्ली-डंडा — तुम्हारी बारी' },
      actionEn: 'Strike!',
      actionHi: 'मारो!',
      hintEn: 'Stop the marker in the gold zone for the longest hit',
      hintHi: 'सबसे लंबे शॉट के लिए मार्कर को सुनहरे हिस्से में रोको',
      speed: 1.05,
      sweetSpot: 0.82,
      zoneHalf: 0.07,
    });
    if (!res) return null;
    const q = Math.max(0, 1 - Math.abs(res.power - 0.82) / 0.82);
    api.audio.playThump(1, 120);
    return Math.round(6 + 38 * q * q + Math.random() * 3);
  }

  async function match() {
    let best = 0;
    let wins = 0;
    for (const r of RIVALS) {
      await new Promise((res) => api.say([{ en: `${r.name} sends the gilli flying: ${r.score} steps! Beat that.`, hi: `${r.name} ने गिल्ली उड़ाई: ${r.score} कदम! इससे आगे मारो।` }], res));
      let mine = 0;
      for (let tries = 0; tries < 2 && mine <= r.score; tries++) {
        const d = await swing();
        if (d === null) return;
        mine = Math.max(mine, d);
        best = Math.max(best, d);
        if (mine <= r.score && tries === 0) await new Promise((res) => api.say([{ en: `${d} steps. Not enough yet — one more try!`, hi: `${d} कदम। अभी कम है — एक और मौका!` }], res));
      }
      if (mine > r.score) {
        wins += 1;
        await new Promise((res) => api.say([{ en: `${mine} steps! ${r.name} cheers: "Zabardast!"`, hi: `${mine} कदम! ${r.name} चिल्लाया: "ज़बरदस्त!"` }], res));
      } else {
        await new Promise((res) => api.say([{ en: `${mine} steps — ${r.name} wins this round, but you played well.`, hi: `${mine} कदम — ये बारी ${r.name} की, पर तुम अच्छा खेले।` }], res));
        break;
      }
    }
    const reward = wins * 10;
    const prev = api.quest.records.gilli || 0;
    if (best > prev) api.quest.records.gilli = best;
    api.addPocket(reward);
    await new Promise((res) => api.say([{ en: wins === 3 ? 'You beat all three! The kids carry you around on their shoulders.' : `You beat ${wins} of 3. The kids say "Come back tomorrow!"`, hi: wins === 3 ? 'तीनों को हरा दिया! बच्चे तुम्हें कंधों पर उठा लेते हैं।' : `तुमने 3 में से ${wins} को हराया। बच्चे कहते हैं "कल फिर आना!"` }], res));
    api.jobDone('gilli', { en: `₹${reward} · best ${api.quest.records.gilli} steps`, hi: `₹${reward} · सबसे लंबा ${api.quest.records.gilli} कदम` });
  }

  api.addInteraction({
    id: 'job_gilli',
    position: new THREE.Vector3(MAIDAN.x - 1, 0, MAIDAN.z),
    radius: 4.2,
    priority: 1,
    label: { en: 'Play gilli-danda', hi: 'गिल्ली-डंडा खेलो' },
    onInteract: () => {
      api.discoverJob('gilli', true);
      api.say(
        [{ en: `Three of us will challenge you! (Your best: ${api.quest.records.gilli || 0} steps)`, hi: `हम तीन तुम्हें चुनौती देंगे! (तुम्हारा सबसे लंबा: ${api.quest.records.gilli || 0} कदम)` }],
        () => match()
      );
    },
  });
}
