import * as THREE from 'three';
import {
  HOUSE_CENTER,
  HALWAI_CENTER,
  SCHOOL_CENTER,
  HOUSE_CHARPAI_POSITION,
  HOUSE_HAND_PUMP_POSITION,
  HOUSE_TULSI_POSITION,
  SCHOOL_BLACKBOARD_POSITION,
  SCHOOL_BENCH_POSITION,
} from './village.js';
import { QUEST_STEPS, SACK_TARGET } from './quest.js';
import { SACK_PILE_POSITION, PITAJI_POSITION, KIRANA_POSITION, isTrolleyNearby } from './wheatErrand.js';

/**
 * One reusable system, one data file (item 1 brief): every interaction point in the
 * game — the errand's two NPCs, the school bell, the charpai — is an entry here with
 * a position, a radius, a label, and what happens. main.js just asks
 * findNearestInteraction() for the closest in-range point each frame (foot only —
 * callers must not query this while mounted) and shows its label as a prompt, exactly
 * like the existing mount/dismount hint.
 *
 * `label` is a `{hi, en}` pair (or `(ctx) => {hi, en}` for state-dependent prompts);
 * `available` likewise may gate whether a point can be interacted with at all right
 * now. `onInteract(ctx)` runs once per press.
 */
export const INTERACTION_POINTS = [];

export function registerInteraction(point) {
  INTERACTION_POINTS.push(point);
}

const _diff = new THREE.Vector3();

export function findNearestInteraction(pos, ctx) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const point of INTERACTION_POINTS) {
    if (point.available && !point.available(ctx)) continue;
    _diff.set(point.position.x - pos.x, 0, point.position.z - pos.z);
    const d = _diff.length();
    if (d < point.radius && d < nearestDist) {
      nearest = point;
      nearestDist = d;
    }
  }
  return nearest;
}

export function resolveLabel(point, ctx) {
  return typeof point.label === 'function' ? point.label(ctx) : point.label;
}

// --- errand NPC positions (used by main.js to place their capsule stand-ins too) ---
export const MAA_POSITION = new THREE.Vector3(HOUSE_CENTER.x, 0, HOUSE_CENTER.z + 3); // courtyard, south of the house block's door
export const HALWAI_NPC_POSITION = new THREE.Vector3(HALWAI_CENTER.x + 1.3, 0, HALWAI_CENTER.z); // the working aisle, between the kadhai and the display cabinet

registerInteraction({
  id: 'maa',
  position: MAA_POSITION,
  radius: 2.5,
  label: { hi: 'माँ से बात करें', en: 'Talk to Maa' },
  onInteract: (ctx) => {
    const { quest, dialogue } = ctx;
    if (quest.step === QUEST_STEPS.NOT_STARTED) {
      dialogue.say(
        [{ hi: 'बेटा, यह पैसे लो और शाम से पहले हलवाई से जलेबी ले आओ।', en: 'Beta, take this money and bring back jalebi from the halwai before evening.' }],
        () => {
          quest.step = QUEST_STEPS.HAVE_MONEY;
          ctx.onObjectiveChange?.();
        }
      );
    } else if (quest.step === QUEST_STEPS.HAVE_MONEY) {
      dialogue.say([{ hi: 'हलवाई की दुकान भूलना मत!', en: "Don't forget the halwai's shop!" }]);
    } else if (quest.step === QUEST_STEPS.HAVE_JALEBI) {
      dialogue.say(
        [{ hi: 'वाह! शाबाश बेटा, बिल्कुल घर जैसी मीठी जलेबी।', en: 'Wonderful! Well done — jalebi as sweet as home.' }],
        () => {
          quest.step = QUEST_STEPS.COMPLETE;
          ctx.onErrandComplete?.(QUEST_STEPS.COMPLETE);
        }
      );
    } else if (quest.step === QUEST_STEPS.COMPLETE) {
      // Second errand (task 4) — unlocked only now, by talking to Maa again.
      dialogue.say(
        [{ hi: 'बेटा, अब यह खाली टिफिन स्कूल ले जाओ और अपनी बहन को घर ले आओ।', en: 'Beta, now take this empty tiffin to the school and bring your sister home.' }],
        () => {
          quest.step = QUEST_STEPS.HAVE_TIFFIN;
          ctx.onObjectiveChange?.();
        }
      );
    } else if (quest.step === QUEST_STEPS.HAVE_TIFFIN) {
      dialogue.say([{ hi: 'स्कूल जाकर टिफिन देना मत भूलना, और बहन को साथ लाना।', en: "Don't forget to drop the tiffin at school, and bring your sister back with you." }]);
    } else if (quest.step === QUEST_STEPS.HAVE_SISTER) {
      dialogue.say(
        [{ hi: 'शाबाश! तुम दोनों घर पहुँच गए।', en: 'Well done! You both made it home.' }],
        () => {
          quest.step = QUEST_STEPS.ERRAND2_COMPLETE;
          ctx.onErrandComplete?.(QUEST_STEPS.ERRAND2_COMPLETE);
        }
      );
    } else {
      dialogue.say([{ hi: 'आज का सारा काम हो गया, बहुत शुक्रिया बेटा।', en: "All of today's work is done, thank you so much." }]);
    }
  },
});

registerInteraction({
  id: 'halwai',
  position: HALWAI_NPC_POSITION,
  radius: 2.5,
  label: { hi: 'हलवाई से बात करें', en: 'Talk to the halwai' },
  onInteract: (ctx) => {
    const { quest, dialogue, audio } = ctx;
    if (quest.step === QUEST_STEPS.NOT_STARTED) {
      dialogue.say([{ hi: 'नमस्ते! पहले माँ से बात कर लो।', en: 'Hello! Talk to Maa first.' }]);
    } else if (quest.step === QUEST_STEPS.HAVE_MONEY) {
      audio.playFrying(2.0);
      dialogue.say(
        [
          { hi: 'जलेबी? अभी बनाता हूँ, गरम-गरम!', en: 'Jalebi? Coming right up, hot and fresh!', holdMs: 2200 },
          { hi: 'लो बेटा, ताज़ी जलेबी!', en: 'Here you go, fresh jalebi!' },
        ],
        () => {
          quest.step = QUEST_STEPS.HAVE_JALEBI;
          ctx.onObjectiveChange?.();
        }
      );
    } else {
      dialogue.say([{ hi: 'जलेबी ठंडी होने से पहले घर ले जाओ!', en: 'Get the jalebi home before it cools!' }]);
    }
  },
});

// --- item 5: two optional points, not part of the errand ---
export const BELL_POSITION = new THREE.Vector3(SCHOOL_CENTER.x - 5, 0, 116); // beside the back block's yard-facing door
export const CHARPAI_POSITION = new THREE.Vector3(HALWAI_CENTER.x, 0, HALWAI_CENTER.z + 5.5 / 2 + 0.85); // between the two chairs outside the halwai

// --- task 4: second errand — the teacher and the school bell (already above) are the
// two alternate ways to hand over the tiffin and collect the sister. ---
export const TEACHER_POSITION = new THREE.Vector3(SCHOOL_CENTER.x + 4, 0, 116); // opposite side of the same yard-facing door as the bell
export const SISTER_SCHOOL_POSITION = new THREE.Vector3(SCHOOL_CENTER.x + 4, 0, 113); // beside the teacher, inside the yard — until collected

/** Shared by both alternate triggers below — advances the quest and tells main.js to
 * start the sister NPC following the player (src/npcRoutines.js createFollowRoutine,
 * wired up in main.js). */
function collectSister(ctx) {
  ctx.quest.step = QUEST_STEPS.HAVE_SISTER;
  ctx.onObjectiveChange?.();
  ctx.onSisterCollected?.();
}

registerInteraction({
  id: 'school_bell',
  position: BELL_POSITION,
  radius: 2.2,
  label: { hi: 'घंटी बजाएं', en: 'Ring the school bell' },
  onInteract: (ctx) => {
    ctx.audio.ringBell();
    if (ctx.quest.step === QUEST_STEPS.HAVE_TIFFIN) {
      ctx.dialogue.say(
        [
          {
            hi: 'घंटी बजी! शिक्षिका बाहर आईं — "टिफिन के लिए शुक्रिया! अपनी बहन को घर ले जाओ।"',
            en: 'The bell rings! The teacher steps out — "Thank you for the tiffin! Take your sister home now."',
          },
        ],
        () => collectSister(ctx)
      );
    } else {
      ctx.dialogue.say([{ hi: 'घंटी की आवाज़ पूरे स्कूल में गूंज उठी।', en: 'The bell rings out across the schoolyard.' }]);
    }
  },
});

registerInteraction({
  id: 'teacher',
  position: TEACHER_POSITION,
  radius: 2.2,
  label: { hi: 'शिक्षिका से बात करें', en: 'Talk to the teacher' },
  onInteract: (ctx) => {
    const { quest, dialogue } = ctx;
    if (quest.step === QUEST_STEPS.HAVE_TIFFIN) {
      dialogue.say([{ hi: 'टिफिन के लिए शुक्रिया! अपनी बहन को घर ले जाओ।', en: 'Thank you for the tiffin! Take your sister home now.' }], () => collectSister(ctx));
    } else if (quest.step === QUEST_STEPS.HAVE_SISTER) {
      dialogue.say([{ hi: 'रास्ते में उसका ध्यान रखना।', en: 'Take care of her on the way.' }]);
    } else {
      dialogue.say([{ hi: 'नमस्ते!', en: 'Hello!' }]);
    }
  },
});

registerInteraction({
  id: 'charpai',
  position: CHARPAI_POSITION,
  radius: 1.8,
  label: { hi: 'बैठ जाएं', en: 'Sit down' },
  // Once sitting, standing back up is handled directly by main.js's dedicated
  // "sitting" state (same E key) rather than through this registry — so this point
  // simply isn't offered again until the player stands up.
  available: (ctx) => !ctx.sitting,
  onInteract: (ctx) => ctx.onSitDown?.(),
});

// --- new-queue item 5: interactions in the new spaces, none touch quest state ---

registerInteraction({
  id: 'house_charpai',
  position: new THREE.Vector3(HOUSE_CHARPAI_POSITION.x, 0, HOUSE_CHARPAI_POSITION.z),
  radius: 1.6,
  label: { hi: 'लेट जाएं', en: 'Lie down' },
  // Same reasoning as 'charpai' above — standing back up is main.js's own "lying"
  // state (same E key), not a second registry entry.
  available: (ctx) => !ctx.lying && !ctx.sitting,
  onInteract: (ctx) => ctx.onLieDown?.(),
});

registerInteraction({
  id: 'hand_pump',
  position: new THREE.Vector3(HOUSE_HAND_PUMP_POSITION.x, 0, HOUSE_HAND_PUMP_POSITION.z),
  radius: 1.6,
  label: { hi: 'पानी खींचें', en: 'Pump water' },
  onInteract: (ctx) => {
    ctx.audio.playPump();
    ctx.onPumpWater?.();
  },
});

registerInteraction({
  id: 'tulsi',
  position: new THREE.Vector3(HOUSE_TULSI_POSITION.x, 0, HOUSE_TULSI_POSITION.z),
  radius: 1.4,
  label: { hi: 'तुलसी को पानी दें', en: 'Water the tulsi' },
  onInteract: (ctx) => {
    ctx.audio.playPump();
    ctx.onWaterTulsi?.();
  },
});

registerInteraction({
  id: 'blackboard',
  position: new THREE.Vector3(SCHOOL_BLACKBOARD_POSITION.x, 0, SCHOOL_BLACKBOARD_POSITION.z + 1.2),
  radius: 1.8,
  label: { hi: 'ब्लैकबोर्ड पर लिखें', en: 'Write on the blackboard' },
  onInteract: (ctx) => {
    ctx.dialogue.say([{ hi: 'अ से अनार, आ से आम।', en: 'A is for Anar (pomegranate), Aa is for Aam (mango).' }]);
  },
});

registerInteraction({
  id: 'school_bench',
  position: new THREE.Vector3(SCHOOL_BENCH_POSITION.x, 0, SCHOOL_BENCH_POSITION.z),
  radius: 1.4,
  label: { hi: 'बेंच पर बैठें', en: 'Sit on the bench' },
  available: (ctx) => !ctx.sitting && !ctx.lying,
  onInteract: (ctx) => ctx.onSitDown?.(),
});

// --- Third errand ("wheat to the bazaar") — reuses this same registry/quest/
// dialogue/waypoint machinery, no new systems. ctx additionally needs `tractor`
// (main.js's stable tractor reference, for isTrolleyNearby) and `sackCarrier`
// (src/wheatErrand.js createSackCarrier()). ---

registerInteraction({
  id: 'pitaji',
  position: PITAJI_POSITION,
  radius: 2.5,
  label: { hi: 'पिताजी से बात करें', en: 'Talk to Pitaji' },
  onInteract: (ctx) => {
    const { quest, dialogue } = ctx;
    if (quest.step === QUEST_STEPS.ERRAND2_COMPLETE) {
      dialogue.say(
        [
          {
            hi: 'बेटा, ट्रॉली जोड़ो और आंगन से गेहूं की तीन बोरियां किराना दुकान पहुंचा दो। पैदल भी जा सकते हो, बस थोड़ा समय लगेगा।',
            en: 'Beta, hitch the trolley and take three sacks of wheat from the pile outside to the kirana shop. You can go on foot too, it will just take longer.',
          },
        ],
        () => {
          quest.step = QUEST_STEPS.LOADING_WHEAT;
          quest.sacksCollected = 0;
          quest.sacksDelivered = 0;
          quest.money = 0;
          ctx.onObjectiveChange?.();
        }
      );
    } else if (quest.step === QUEST_STEPS.LOADING_WHEAT) {
      dialogue.say([{ hi: 'गेहूं की बोरियां किराना दुकान तक पहुंचा दो।', en: 'Get the wheat sacks to the kirana shop.' }]);
    } else if (quest.step === QUEST_STEPS.WHEAT_DELIVERED) {
      dialogue.say([{ hi: 'अब जनरल स्टोर से कुछ खरीद लाओ।', en: 'Now go buy something from the general store.' }]);
    } else if (quest.step === QUEST_STEPS.BOUGHT_GOODS) {
      dialogue.say(
        [{ hi: 'शाबाश बेटा! आज का सारा काम हो गया।', en: "Well done, beta! Today's work is all done." }],
        () => {
          quest.step = QUEST_STEPS.ALL_COMPLETE;
          ctx.onErrandComplete?.(QUEST_STEPS.ALL_COMPLETE);
        }
      );
    } else {
      dialogue.say([{ hi: 'आज का काम हो गया, बहुत शुक्रिया।', en: "Today's work is done, thank you." }]);
    }
  },
});

registerInteraction({
  id: 'sack_pile',
  position: SACK_PILE_POSITION,
  radius: 2,
  label: (ctx) =>
    isTrolleyNearby(ctx.tractor, SACK_PILE_POSITION)
      ? { hi: 'बोरी ट्रॉली में लादें', en: 'Load a sack into the trolley' }
      : { hi: 'बोरी उठाएं', en: 'Pick up a sack' },
  available: (ctx) => {
    const { quest } = ctx;
    if (quest.step !== QUEST_STEPS.LOADING_WHEAT) return false;
    if (quest.sacksCollected >= SACK_TARGET) return false;
    const carrying = quest.sacksCollected - quest.sacksDelivered;
    // On foot, carry one at a time (per this task's own brief) — must deliver the
    // one already picked up before picking up the next. Loading straight into a
    // nearby trolley isn't limited this way (that's the point of bringing it).
    return carrying === 0 || isTrolleyNearby(ctx.tractor, SACK_PILE_POSITION);
  },
  onInteract: (ctx) => {
    const trolleyReady = isTrolleyNearby(ctx.tractor, SACK_PILE_POSITION);
    ctx.sackCarrier.pickUp(ctx.tractor?.trolley?.group, trolleyReady);
    ctx.quest.sacksCollected++;
    ctx.onObjectiveChange?.();
  },
});

registerInteraction({
  id: 'kirana',
  position: KIRANA_POSITION,
  radius: 2.5,
  label: (ctx) =>
    ctx.quest.sacksCollected - ctx.quest.sacksDelivered > 0
      ? { hi: 'बोरी उतारें', en: 'Unload the sack' }
      : { hi: 'खरीदें', en: 'Buy something' },
  // Always available (item 3 brief: the shared buy works "at any shop counter",
  // kirana included) — the sack-delivery case only applies while actually carrying
  // one, same as every other step of this errand.
  onInteract: (ctx) => {
    const { quest, dialogue } = ctx;
    const carrying = quest.sacksCollected - quest.sacksDelivered;
    if (carrying > 0) {
      ctx.sackCarrier.deliverOne();
      quest.sacksDelivered++;
      if (quest.sacksDelivered >= SACK_TARGET) {
        quest.money += 150;
        quest.step = QUEST_STEPS.WHEAT_DELIVERED;
        dialogue.say([{ hi: 'शुक्रिया! यह लो ₹150।', en: 'Thank you! Here is ₹150.' }], () => ctx.onObjectiveChange?.());
      } else {
        dialogue.say([{ hi: 'एक और बोरी लाना बाकी है।', en: 'A few more sacks to go.' }], () => ctx.onObjectiveChange?.());
      }
    } else {
      // Same shared "buy" as every other shop counter — see registerShopBuy below.
      const options = BUY_ITEMS.kirana;
      const item = options[Math.floor(Math.random() * options.length)];
      dialogue.say([{ hi: `${item.hi} लिया — ₹${item.price}`, en: `Bought ${item.en} — ₹${item.price}` }]);
    }
  },
});

// --- Shop interactions (item 3 brief) — one shared "buy" usable at any shop
// counter, quest-agnostic except for the one documented case (the general store,
// mid-errand-3) — see the doc comment on registerShopBuy below. ---

const BUY_ITEMS = {
  general_store: [
    { hi: 'बिस्कुट', en: 'biscuits', price: 20 },
    { hi: 'नमक', en: 'salt', price: 12 },
    { hi: 'चायपत्ती', en: 'tea leaves', price: 35 },
  ],
  tea_stall: [{ hi: 'एक कप चाय', en: 'a cup of tea', price: 10 }],
  kirana: [
    { hi: 'चावल', en: 'rice', price: 40 },
    { hi: 'दाल', en: 'dal', price: 55 },
  ],
  medical: [{ hi: 'दवा', en: 'medicine', price: 50 }],
  tailor: [{ hi: 'कपड़े की सिलाई', en: 'a stitching job', price: 80 }],
  barber: [{ hi: 'बाल कटवाना', en: 'a haircut', price: 30 }],
  mobile: [{ hi: 'टॉक टाइम', en: 'talk time', price: 20 }],
  sweet: [{ hi: 'मिठाई', en: 'sweets', price: 60 }],
};

/** One shared interaction, called once per shop counter (src/main.js) with that
 * shop's own `id`/position — a short bilingual "bought X — ₹Y" line, nothing more.
 * The one exception: buying at the general store while errand 3 is waiting on a
 * purchase (`WHEAT_DELIVERED`) also advances that errand step, same as `pitaji`/
 * `kirana` above — every other shop, and every other quest step, never touches
 * quest state at all. */
export function registerShopBuy(id, position, radius = 2.2) {
  registerInteraction({
    id: `buy_${id}`,
    position,
    radius,
    label: { hi: 'खरीदें', en: 'Buy something' },
    onInteract: (ctx) => {
      const options = BUY_ITEMS[id] || [{ hi: 'सामान', en: 'something', price: 20 }];
      const item = options[Math.floor(Math.random() * options.length)];
      ctx.dialogue.say([{ hi: `${item.hi} लिया — ₹${item.price}`, en: `Bought ${item.en} — ₹${item.price}` }], () => {
        if (id === 'general_store' && ctx.quest.step === QUEST_STEPS.WHEAT_DELIVERED) {
          ctx.quest.money = Math.max(0, ctx.quest.money - item.price);
          ctx.quest.step = QUEST_STEPS.BOUGHT_GOODS;
          ctx.onObjectiveChange?.();
        }
      });
    },
  });
}

/** Sabzi shop's signature interaction — weighing produce on the pan balance. A short
 * scripted moment (the balance tips, a sound plays) instead of the generic buy. */
export function registerSabziWeighing(position, radius = 2.2) {
  registerInteraction({
    id: 'sabzi_weighing',
    position,
    radius,
    label: { hi: 'तराज़ू पर तौलें', en: 'Weigh on the pan balance' },
    onInteract: (ctx) => {
      ctx.audio.playWeighingScale?.();
      ctx.onWeighingScale?.();
      ctx.dialogue.say([{ hi: 'तराज़ू झूला — पूरा एक किलो!', en: 'The balance tips — a full kilo!' }]);
    },
  });
}

/** Bangle shop's signature interaction — trying on a set of glass bangles. */
export function registerBangleTryOn(position, radius = 2.2) {
  registerInteraction({
    id: 'bangle_tryon',
    position,
    radius,
    label: { hi: 'चूड़ियां पहन कर देखें', en: 'Try on the bangles' },
    onInteract: (ctx) => {
      ctx.audio.playBangleJingle?.();
      ctx.dialogue.say([{ hi: 'कांच की चूड़ियां खनक उठीं!', en: 'The glass bangles jingle!' }]);
    },
  });
}
