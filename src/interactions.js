import * as THREE from 'three';
import { HOUSE_CENTER, HALWAI_CENTER } from './village.js';
import { QUEST_STEPS } from './quest.js';

/**
 * One reusable system, one data file (item 1 brief): every interaction point in the
 * game — the errand's two NPCs, the school bell, the charpai — is an entry here with
 * a position, a radius, a label, and what happens. main.js just asks
 * findNearestInteraction() for the closest in-range point each frame (foot only —
 * callers must not query this while mounted) and shows its label as a prompt, exactly
 * like the existing mount/dismount hint.
 *
 * `label` may be a plain string or `(ctx) => string` for state-dependent prompts (e.g.
 * "sit down" vs "stand up"); `available` likewise may gate whether a point can be
 * interacted with at all right now. `onInteract(ctx)` runs once per press.
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
  label: 'talk to Maa',
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
          ctx.onErrandComplete?.();
        }
      );
    } else {
      dialogue.say([{ hi: 'आज का काम हो गया, शुक्रिया बेटा।', en: "Today's errand is done, thank you." }]);
    }
  },
});

registerInteraction({
  id: 'halwai',
  position: HALWAI_NPC_POSITION,
  radius: 2.5,
  label: 'talk to the halwai',
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
