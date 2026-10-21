import * as THREE from 'three';
import { buildKulfiCart } from './props.js';
import { GOSSIP_TEXT } from './data.js';
import { openMenu } from './stalls.js';

/**
 * Job 3 — Kulfiwala (docs/MISSIONS_PLAN.md): his bell carries across the village (sound radar, louder as you near); find him, pick a
 * flavour. Reward: a treat + a line of gossip that reveals another side job. He pushes his cart round the lanes all afternoon.
 */
const ROUTE = [
  { x: -45, z: 62 }, { x: -45, z: 98 }, { x: -45, z: 62 }, { x: -58, z: 47 }, { x: -58, z: 24 }, { x: -58, z: 47 },
  { x: -30, z: 55 }, { x: -12, z: 55 }, { x: -30, z: 55 },
];
const FLAVOURS = [
  { en: 'Malai kulfi', hi: 'मलाई कुल्फी', price: 10, line: { en: 'Creamy malai kulfi on a stick, so cold it makes your teeth ring.', hi: 'डंडी पर मलाई कुल्फी, इतनी ठंडी कि दाँत बज उठें।' } },
  { en: 'Mango kulfi', hi: 'आम की कुल्फी', price: 12, line: { en: 'Mango kulfi — the whole baagh in one bite.', hi: 'आम की कुल्फी — पूरा बाग एक निवाले में।' } },
  { en: 'Pista kulfi', hi: 'पिस्ता कुल्फी', price: 12, line: { en: 'Pista kulfi, green and rich, with crunchy bits.', hi: 'पिस्ता कुल्फी, हरी और गाढ़ी, कुरकुरे टुकड़ों के साथ।' } },
  { en: 'Rose kulfi', hi: 'गुलाब कुल्फी', price: 10, line: { en: 'Rose kulfi — it tastes the way a garden smells.', hi: 'गुलाब कुल्फी — जैसे बाग की खुशबू का स्वाद।' } },
];

export function registerKulfiJob(api, env) {
  const walker = api.npc('kulfiwala', ROUTE[0], 0, 'npc_kulfiwala');
  const cart = buildKulfiCart();
  cart.rotation.y = Math.PI / 2;
  cart.position.set(0, 0, 1.75);
  walker.root.add(cart);
  const walk = env.waypointLoop(walker.root, ROUTE, { speed: 1.1, pauseSeconds: 4, getExtraBoxes: () => env.otherVehicleBoxes(null) });

  let belled = 0;
  let animT = 0;
  api.onUpdate((dt) => {
    walk(dt);
    const moved = true;
    walker.animate(dt, moved);
    // sound radar
    const p = env.getPlayerPos();
    const d = Math.hypot(walker.root.position.x - p.x, walker.root.position.z - p.z);
    belled -= dt;
    if (d < 55 && belled <= 0) {
      api.audio.playCartBell(Math.max(0.12, 1 - d / 55));
      belled = 3.2 + (d / 55) * 3; // rings more often as you get closer
    }
    if (d < 30) api.discoverJob('kulfi');
    animT += dt;
  });

  api.addInteraction({
    id: 'job_kulfiwala',
    position: walker.root.position, // live position: he walks his round
    radius: 3.0,
    priority: 1,
    label: { en: 'Buy kulfi from the kulfiwala', hi: 'कुल्फी वाले से कुल्फी लें' },
    onInteract: () => {
      api.discoverJob('kulfi', true);
      const free = api.quest.pocket < 10 && !(api.quest.jobsDone.kulfi > 0);
      openMenu(api, {
        seller: { en: 'Kulfiwala', hi: 'कुल्फी वाला' },
        greeting: { en: 'Kulfi! Cold, creamy kulfi! Which one, beta?', hi: 'कुल्फी! ठंडी, मलाईदार कुल्फी! कौन सी, बेटा?' },
        items: FLAVOURS.map((f) => ({
          ...f,
          price: free ? 0 : f.price,
          after: () => {
            const next = api.discoverRandom('kulfi');
            if (next) {
              const g = GOSSIP_TEXT[next];
              api.say([{ en: `Psst, between you and me: ${g.en}`, hi: `धीरे से: ${g.hi}` }], () => api.discoverJob(next));
            }
            api.jobDone('kulfi', { en: 'a cold treat', hi: 'ठंडी कुल्फी' });
          },
        })),
      });
    },
  });
}
