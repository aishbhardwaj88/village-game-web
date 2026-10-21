import * as THREE from 'three';
import { MANGO_TREE_PLACEMENTS } from '../baagh.js';

/**
 * Job 8 — Mango variety collection (docs/MISSIONS_PLAN.md): six mango varieties among the baagh trees and the trees around it;
 * taste each once and the notebook ticks it off. Tasting all six earns a pocket-money reward and a mango lover's praise.
 */
const VARIETIES = [
  { id: 'dussehri', en: 'Dussehri', hi: 'दशहरी', line: { en: 'Dussehri: small, honey-sweet and fibreless — it melts on the tongue.', hi: 'दशहरी: छोटा, शहद सा मीठा, बिना रेशे — जीभ पर घुल जाता है।' } },
  { id: 'langra', en: 'Langra', hi: 'लंगड़ा', line: { en: 'Langra: green even when ripe, with a tangy-sweet kick.', hi: 'लंगड़ा: पकने पर भी हरा, खट्टे-मीठे स्वाद वाला।' } },
  { id: 'chausa', en: 'Chausa', hi: 'चौसा', line: { en: 'Chausa: golden and so juicy it drips to your elbows.', hi: 'चौसा: सुनहरा और इतना रसीला कि कोहनियों तक टपकता है।' } },
  { id: 'safeda', en: 'Safeda', hi: 'सफेदा', line: { en: 'Safeda: big, pale and creamy — one is a whole meal.', hi: 'सफेदा: बड़ा, हल्का और मलाईदार — एक ही पेट भर दे।' } },
  { id: 'totapuri', en: 'Totapuri', hi: 'तोतापुरी', line: { en: 'Totapuri: parrot-beak shaped, tart and crunchy — great with salt and chilli.', hi: 'तोतापुरी: तोते की चोंच जैसा, खट्टा और कुरकुरा — नमक-मिर्च के साथ मज़ेदार।' } },
  { id: 'desi', en: 'Desi aam', hi: 'देसी आम', line: { en: 'Desi aam: small, stringy and full of old-fashioned mango flavour. Dada\'s favourite.', hi: 'देसी आम: छोटा, रेशेदार, पुराने ज़माने के स्वाद वाला। दादा का पसंदीदा।' } },
];

export function registerMangoJob(api, env) {
  const spots = MANGO_TREE_PLACEMENTS.slice(0, 6).map((p) => ({ x: p.x, z: p.z }));
  // fall back to a ring round the baagh if fewer than six trees are exported
  while (spots.length < 6) {
    const a = spots.length * 1.1;
    spots.push({ x: -15 + Math.cos(a) * 9, z: 10 + Math.sin(a) * 9 });
  }
  VARIETIES.forEach((v, i) => {
    const sp = spots[i];
    api.addInteraction({
      id: `job_mango_${v.id}`,
      position: new THREE.Vector3(sp.x, 0, sp.z),
      radius: 3.2,
      priority: i < 3 ? 0 : 1,
      label: () => (api.quest.mangoVarieties.includes(v.id) ? { en: `${v.en} (tasted)`, hi: `${v.hi} (चखा)` } : { en: 'Taste a mango', hi: 'आम चखो' }),
      onInteract: () => {
        api.discoverJob('mango', true);
        const had = api.quest.mangoVarieties.includes(v.id);
        api.say([{ en: v.line.en, hi: v.line.hi }], () => {
          if (had) return;
          api.quest.mangoVarieties.push(v.id);
          api.env.save?.();
          api.freeRoam.toast(`${v.en} ticked off — ${api.quest.mangoVarieties.length}/6`, `${v.hi} दर्ज — ${api.quest.mangoVarieties.length}/6`, 3200);
          if (api.quest.mangoVarieties.length === 6) {
            api.say([{ en: 'All six! You are a true mango lover. Take Rs 50 from the baagh-wala.', hi: 'सब छह! तुम सच्चे आम-प्रेमी हो। बाग वाले की तरफ़ से ₹50 लो।' }], () => {
              api.addPocket(50);
              api.jobDone('mango', { en: '₹50', hi: '₹50' });
            });
          }
        });
      },
    });
  });
}
