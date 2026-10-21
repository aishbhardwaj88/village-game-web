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
import { QUEST_STEPS, SACK_TARGET, MANGO_TARGET } from './quest.js';
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
    const score = d - (point.priority || 0); // a point with `priority` wins over a generic one at about the same spot (side-job counters vs the shared Buy)
    if (d < point.radius && score < nearestDist) {
      nearest = point;
      nearestDist = score;
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
    } else if (quest.step === QUEST_STEPS.ERRAND4_COMPLETE) {
      dialogue.say(
        [{ hi: 'दर्जी ने दादा का कुर्ता सिल दिया है — शाम को दुकान बंद होने से पहले ले आ।', en: "The darzi finished Dada's kurta — go get it before the shop closes for the evening." }],
        () => {
          quest.step = QUEST_STEPS.GOING_TO_DARZI;
          ctx.onObjectiveChange?.();
        }
      );
    } else if (quest.step === QUEST_STEPS.GOING_TO_DARZI || quest.step === QUEST_STEPS.HAVE_KURTA) {
      dialogue.say([{ hi: 'दर्जी से कुर्ता ले आना मत भूलना।', en: "Don't forget to collect the kurta from the darzi." }]);
    } else if (quest.step === QUEST_STEPS.FREE_ROAM && ctx.hooks?.maaFreeRoam) {
      ctx.hooks.maaFreeRoam(); // free-roam side jobs (src/jobs/ration.js)
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
// Bugfix (world-validator check 1/6): the school's back classroom block
// (src/village.js's buildSchool()) is a SOLID 24x6m mass at z=[112,118], not a
// thin wall — these three positions all used z=113-116, which the validator's
// real STATIC_COLLIDERS check confirmed is genuinely inside that solid block
// (clearance exactly -NPC_RADIUS, i.e. these NPCs are centred ON the wall
// boundary), not actually "beside the door" / "inside the yard" as the
// original comments intended. Moved 6m south, clear of the block.
export const BELL_POSITION = new THREE.Vector3(SCHOOL_CENTER.x - 6, 0, 110); // between two verandah pillars of the back block (Blender school, pillars at x=-8,-4,0,4,8)
export const CHARPAI_POSITION = new THREE.Vector3(HALWAI_CENTER.x, 0, HALWAI_CENTER.z + 5.5 / 2 + 0.85); // between the two chairs outside the halwai

// --- task 4: second errand — the teacher and the school bell (already above) are the
// two alternate ways to hand over the tiffin and collect the sister. ---
export const TEACHER_POSITION = new THREE.Vector3(SCHOOL_CENTER.x + 2, 0, 110); // opposite side of the same yard-facing wall as the bell, in the open yard
export const SISTER_SCHOOL_POSITION = new THREE.Vector3(SCHOOL_CENTER.x + 2, 0, 107); // beside the teacher, inside the yard — until collected

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
        [{ hi: 'शाबाश बेटा! दादा के तोहफे के लिए काफी पैसे हो गए।', en: "Well done, beta! That's enough for Dada's gift." }],
        () => {
          quest.step = QUEST_STEPS.ERRAND3_COMPLETE;
          ctx.onErrandComplete?.(QUEST_STEPS.ERRAND3_COMPLETE);
        }
      );
    } else if (quest.step === QUEST_STEPS.ERRAND3_COMPLETE) {
      dialogue.say(
        [
          {
            hi: 'पोस्टमैन के पास बुआ की चिट्ठी होनी चाहिए — वह अभी अपना चक्कर लगा रहा होगा। बाजार से आगे जाने से पहले उसे पकड़ लो।',
            en: "The postman should have Bua's letter — he does his round about now. Catch him before he moves past the bazaar.",
          },
        ],
        () => {
          quest.step = QUEST_STEPS.FINDING_POSTMAN;
          ctx.onObjectiveChange?.();
        }
      );
    } else if (quest.step === QUEST_STEPS.FINDING_POSTMAN) {
      dialogue.say([{ hi: 'पोस्टमैन लेन या बाजार में कहीं होगा।', en: 'The postman should be somewhere on the lane or in the bazaar.' }]);
    } else if (quest.step === QUEST_STEPS.HAVE_LETTER) {
      dialogue.say(
        [{ hi: 'बुआ की लिखावट — वह कभी जन्मदिन नहीं भूलतीं। तोहफों के साथ रख दो।', en: "Bua's handwriting — she never misses a birthday. Put it with the gifts." }],
        () => {
          quest.step = QUEST_STEPS.ERRAND4_COMPLETE;
          ctx.onErrandComplete?.(QUEST_STEPS.ERRAND4_COMPLETE);
        }
      );
    } else if (quest.step === QUEST_STEPS.KURTA_RECOVERED) {
      dialogue.say(
        [{ hi: 'बंदर, सच में? चलो, आज रात दादा के पास कुर्ते के साथ एक किस्सा भी होगा।', en: 'A monkey, really? At least Dada will have a story to go with his kurta tonight.' }],
        () => {
          quest.step = QUEST_STEPS.ERRAND6_COMPLETE;
          ctx.onErrandComplete?.(QUEST_STEPS.ERRAND6_COMPLETE);
        }
      );
    } else if (quest.step === QUEST_STEPS.ERRAND6_COMPLETE) {
      dialogue.say(
        [
          {
            hi: 'ट्रैक्टर बाग ले जाओ — दादा को जन्मदिन की थाली में हमेशा ताज़े आम चाहिए होते हैं। ट्रॉली भर के ले आना।',
            en: 'Take the tractor out to the baagh — Dada always wants fresh mangoes on his birthday table. Bring back a trolley-load.',
          },
        ],
        () => {
          quest.step = QUEST_STEPS.GOING_TO_BAAGH;
          ctx.onObjectiveChange?.();
        }
      );
    } else if (quest.step === QUEST_STEPS.GOING_TO_BAAGH || quest.step === QUEST_STEPS.KNOCKING_MANGOES) {
      dialogue.say([{ hi: 'बाग से आम ले आओ।', en: 'Bring back mangoes from the baagh.' }]);
    } else if (quest.step === QUEST_STEPS.MANGOES_LOADED) {
      dialogue.say(
        [{ hi: 'इतने काफी हैं — दादा के पसंदीदा। अच्छा चलाया।', en: "That's plenty — Dada's favourite. Good driving." }],
        () => {
          quest.step = QUEST_STEPS.ERRAND7_COMPLETE;
          ctx.onErrandComplete?.(QUEST_STEPS.ERRAND7_COMPLETE);
        }
      );
    } else if (quest.step === QUEST_STEPS.ERRAND7_COMPLETE) {
      dialogue.say(
        [{ hi: 'सब कुछ तैयार है। छत पर आओ — आज दादा का जन्मदिन है।', en: "Everything's ready. Come up to the roof — it's Dada's birthday." }],
        () => {
          quest.step = QUEST_STEPS.GOING_TO_ROOF;
          ctx.onObjectiveChange?.();
        }
      );
    } else if (quest.step === QUEST_STEPS.FREE_ROAM && ctx.hooks?.pitajiFreeRoam) {
      ctx.hooks.pitajiFreeRoam(); // free-roam side jobs (src/jobs/gate.js)
    } else {
      dialogue.say([{ hi: 'आज का काम हो गया, बहुत शुक्रिया।', en: "Today's work is done, thank you." }]);
    }
  },
});

registerInteraction({
  id: 'postman',
  position: new THREE.Vector3(), // placeholder — main.js overwrites this with the postman NPC's own live position object before the game starts, so this point always tracks him
  radius: 2.2,
  label: { hi: 'पोस्टमैन से बात करें', en: 'Talk to the postman' },
  available: (ctx) => ctx.quest.step === QUEST_STEPS.FINDING_POSTMAN,
  onInteract: (ctx) => {
    ctx.dialogue.say(
      [
        {
          hi: 'अरे, जन्मदिन वाला घर! हाँ हाँ — एक चिट्ठी, बुआ के घर से आई है। संभल के, मोड़ना मत।',
          en: 'Ah, the birthday house! Yes, yes — one letter, all the way from Bua\'s family. Careful, don\'t crumple it.',
        },
      ],
      () => {
        ctx.quest.step = QUEST_STEPS.HAVE_LETTER;
        ctx.onObjectiveChange?.();
      }
    );
  },
});

/** Called once from main.js with the postman NPC's own live position (a Vector3
 * that keeps moving as he walks his route) — replaces the placeholder above so
 * findNearestInteraction() always checks against where he actually is right now,
 * same trick registerDarziKurta below doesn't need (the darzi never moves). */
export function linkPostmanPosition(livePosition) {
  const point = INTERACTION_POINTS.find((p) => p.id === 'postman');
  if (point) point.position = livePosition;
}

registerInteraction({
  id: 'monkey',
  position: new THREE.Vector3(), // linked to the monkey NPC's live position, same trick as 'postman' above
  radius: 2.2,
  label: { hi: 'बंदर को पकड़ें', en: 'Catch up to the monkey' },
  available: (ctx) => ctx.quest.step === QUEST_STEPS.KURTA_STOLEN,
  onInteract: (ctx) => {
    ctx.quest.step = QUEST_STEPS.KURTA_RECOVERED;
    ctx.onObjectiveChange?.();
    ctx.onKurtaRecovered?.();
  },
});

/** Same live-position trick as linkPostmanPosition, for the monkey's NPC. */
export function linkMonkeyPosition(livePosition) {
  const point = INTERACTION_POINTS.find((p) => p.id === 'monkey');
  if (point) point.position = livePosition;
}

// M7 — mango baagh (docs/STORY.md). `registerMangoKnock` is called once per
// "marked tree"; each knock adds a few mangoes until MANGO_TARGET is reached,
// at which point the errand itself advances — same shape as `sack_pile`'s
// per-pickup counter above, reusing the existing counter/target pattern rather
// than inventing a new one.
export function registerMangoKnock(id, position, radius = 2.2) {
  registerInteraction({
    id: `mango_${id}`,
    position,
    radius,
    label: { hi: 'पेड़ हिलाएं', en: 'Shake the tree' },
    available: (ctx) => [QUEST_STEPS.GOING_TO_BAAGH, QUEST_STEPS.KNOCKING_MANGOES].includes(ctx.quest.step) && (ctx.quest.mangoesCollected ?? 0) < MANGO_TARGET,
    onInteract: (ctx) => {
      const { quest, dialogue } = ctx;
      quest.step = QUEST_STEPS.KNOCKING_MANGOES;
      quest.mangoesCollected = Math.min(MANGO_TARGET, (quest.mangoesCollected ?? 0) + 2);
      ctx.audio.playMangoThud?.();
      if (quest.mangoesCollected >= MANGO_TARGET) {
        quest.step = QUEST_STEPS.MANGOES_LOADED;
        dialogue.say([{ hi: 'ट्रॉली भर गई — घर वापस चलो।', en: "The trolley's full — head back home." }], () => ctx.onObjectiveChange?.());
      } else {
        ctx.onObjectiveChange?.();
      }
    },
  });
}

// M8 — the ending (docs/STORY.md). A staged scene, not a new verb: reaching the
// roof's own open footprint (only possible via the stairs the house interior
// already has — see src/main.js groundHeightAt's comment on why standing at this
// exact x/z is impossible at ground level) plays the closing family dialogue,
// then rolls into the existing final-end-card/credits flow (ALL_COMPLETE is
// unchanged by the 8-mission rework — see src/quest.js's own doc comment).
export function registerRoofEnding(position, radius = 3) {
  registerInteraction({
    id: 'roof_ending',
    position,
    radius,
    label: { hi: 'परिवार से मिलें', en: 'Join the family' },
    available: (ctx) => ctx.quest.step === QUEST_STEPS.GOING_TO_ROOF,
    onInteract: (ctx) => {
      ctx.onReachRoofEnding?.();
      ctx.dialogue.say(
        [
          { hi: 'तुम सब, एक बूढ़े आदमी के लिए इतनी तैयारी।', en: "All of you, making such a fuss over an old man." },
          { hi: 'हर साल, बाऊजी — और हर साल यही कहते हो।', en: "Every year, Bauji — and every year you say the same thing." },
          { hi: 'चिट्ठी आई, कुर्ता आया, और आम भी — भाई ने आज सब किया!', en: "The letter came, the kurta came, and the mangoes — Bhai did everything today!" },
          { hi: 'अपने बूढ़े दादा के लिए पूरे गाँव में दौड़ लगाई। आओ, बैठो — आज छत की सबसे अच्छी जगह तुम्हारी है।', en: 'Running all over the village for your old Dada. Come, sit — the best seat on the roof is yours tonight.' },
          { hi: 'जन्मदिन मुबारक हो, बाऊजी।', en: 'Happy birthday, Bauji.' },
          { hi: 'दोपहर — एक दोपहर, एक परिवार।', en: 'Dopahar — one afternoon, one family.' },
        ],
        () => {
          ctx.quest.step = QUEST_STEPS.ALL_COMPLETE;
          ctx.onErrandComplete?.(QUEST_STEPS.ALL_COMPLETE);
        }
      );
    },
  });
}

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
  post_office: [{ hi: 'डाक टिकट', en: 'postage stamps', price: 15 }],
  ration_shop: [
    { hi: 'गेहूं', en: 'wheat', price: 25 },
    { hi: 'चीनी', en: 'sugar', price: 30 },
  ],
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

/** Tailor shop's M5 signature interaction — handing over Dada's finished kurta.
 * Same dual-mode shape as `kirana` above: the one specific quest moment
 * (GOING_TO_DARZI) plus the ordinary shared "buy" (BUY_ITEMS.tailor) at every
 * other time, so the shop still reads as a normal, always-open tailor. */
export function registerDarziKurta(position, radius = 2.2) {
  registerInteraction({
    id: 'darzi_kurta',
    position,
    radius,
    label: (ctx) =>
      ctx.quest.step === QUEST_STEPS.GOING_TO_DARZI
        ? { hi: 'कुर्ता ले लें', en: "Collect Dada's kurta" }
        : { hi: 'खरीदें', en: 'Buy something' },
    onInteract: (ctx) => {
      const { quest, dialogue } = ctx;
      if (quest.step === QUEST_STEPS.GOING_TO_DARZI) {
        dialogue.say(
          [
            {
              hi: 'दादा से कहना — हाथ से सिया है, दो बार हेम किया ताकि ठीक बैठे। उन्हें जन्मदिन मुबारक।',
              en: "Tell your Dada — stitched by hand, hemmed twice so it sits right. Happy birthday to him.",
            },
          ],
          () => {
            quest.step = QUEST_STEPS.HAVE_KURTA;
            ctx.onObjectiveChange?.();
            ctx.onKurtaCollected?.();
          }
        );
      } else {
        const options = BUY_ITEMS.tailor;
        const item = options[Math.floor(Math.random() * options.length)];
        dialogue.say([{ hi: `${item.hi} लिया — ₹${item.price}`, en: `Bought ${item.en} — ₹${item.price}` }]);
      }
    },
  });
}
