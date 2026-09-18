/**
 * The errand(s), v2 (item 3 brief + task 4's second errand). All state lives in one
 * small in-memory object — no save system; "play again" just recreates it. One
 * continuous `step` enum covers both errands (COMPLETE, reached at the end of the
 * jalebi errand, is not terminal — talking to Maa again from there offers the second
 * one) rather than a separate errand-2 state object, so "restart" naturally resets
 * both at once. src/interactions.js drives the step transitions (talking to Maa/the
 * halwai/the teacher/the school bell); main.js reads `step` to render the top-left
 * objective text, the waypoint target, and the end card(s).
 */
export const QUEST_STEPS = {
  NOT_STARTED: 'not_started', // go talk to Maa
  HAVE_MONEY: 'have_money', // go give it to the halwai
  HAVE_JALEBI: 'have_jalebi', // go back to Maa
  COMPLETE: 'complete', // errand 1 done — end card shows once, "Continue" unlocks errand 2
  HAVE_TIFFIN: 'have_tiffin', // errand 2: take the tiffin to school
  HAVE_SISTER: 'have_sister', // sister is following — bring her home to Maa
  ALL_COMPLETE: 'all_complete', // both errands done — final end card shows
};

export const OBJECTIVE_TEXT = {
  [QUEST_STEPS.NOT_STARTED]: { hi: 'माँ से बात करो', en: 'Talk to Maa' },
  [QUEST_STEPS.HAVE_MONEY]: { hi: 'हलवाई को पैसे दो', en: 'Take the money to the halwai' },
  [QUEST_STEPS.HAVE_JALEBI]: { hi: 'जलेबी लेकर माँ के पास जाओ', en: 'Bring the jalebi back to Maa' },
  [QUEST_STEPS.COMPLETE]: { hi: 'माँ से फिर बात करो', en: 'Talk to Maa again' },
  [QUEST_STEPS.HAVE_TIFFIN]: { hi: 'टिफिन लेकर स्कूल जाओ', en: 'Take the tiffin to school' },
  [QUEST_STEPS.HAVE_SISTER]: { hi: 'बहन को लेकर घर जाओ', en: 'Bring your sister home' },
  [QUEST_STEPS.ALL_COMPLETE]: { hi: 'सारे काम पूरे हुए', en: 'All errands complete' },
};

export function createQuestState() {
  return { step: QUEST_STEPS.NOT_STARTED };
}
