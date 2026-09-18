import * as THREE from 'three';
import { HOUSE_CENTER, HALWAI_CENTER, SCHOOL_CENTER } from './village.js';
import { QUEST_STEPS } from './quest.js';

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
          quest.step = QUEST_STEPS.ALL_COMPLETE;
          ctx.onErrandComplete?.(QUEST_STEPS.ALL_COMPLETE);
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
