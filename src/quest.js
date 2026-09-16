/**
 * The errand, v1 (item 3 brief). All state lives in one small in-memory object — no
 * save system; "play again" just recreates it. src/interactions.js drives the step
 * transitions (talking to Maa/the halwai); main.js reads `step` to render the
 * top-left objective text and the end card.
 */
export const QUEST_STEPS = {
  NOT_STARTED: 'not_started', // go talk to Maa
  HAVE_MONEY: 'have_money', // go give it to the halwai
  HAVE_JALEBI: 'have_jalebi', // go back to Maa
  COMPLETE: 'complete', // errand done — end card shows
};

export const OBJECTIVE_TEXT = {
  [QUEST_STEPS.NOT_STARTED]: { hi: 'माँ से बात करो', en: 'Talk to Maa' },
  [QUEST_STEPS.HAVE_MONEY]: { hi: 'हलवाई को पैसे दो', en: 'Take the money to the halwai' },
  [QUEST_STEPS.HAVE_JALEBI]: { hi: 'जलेबी लेकर माँ के पास जाओ', en: 'Bring the jalebi back to Maa' },
  [QUEST_STEPS.COMPLETE]: { hi: 'काम पूरा हुआ', en: 'Errand complete' },
};

export function createQuestState() {
  return { step: QUEST_STEPS.NOT_STARTED };
}
