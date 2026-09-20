/**
 * The errand(s), v3 (item 3 brief + task 4's second errand + this task's third
 * errand). All state lives in one small in-memory object — no save system beyond
 * localStorage's own `questStep` (plus, from the third errand on, `sacksCollected`/
 * `sacksDelivered`/`money`); "play again" just recreates it. One continuous `step`
 * enum covers all three errands (ERRAND2_COMPLETE, reached at the end of the second
 * errand, is not terminal — talking to Pitaji from there offers the third) rather than
 * separate per-errand state objects, so "restart" naturally resets all three at once.
 * src/interactions.js drives the step transitions; main.js reads `step` to render the
 * top-left objective text, the waypoint target, and the end card(s).
 */
export const QUEST_STEPS = {
  NOT_STARTED: 'not_started', // go talk to Maa
  HAVE_MONEY: 'have_money', // go give it to the halwai
  HAVE_JALEBI: 'have_jalebi', // go back to Maa
  COMPLETE: 'complete', // errand 1 done — end card shows once, "Continue" unlocks errand 2
  HAVE_TIFFIN: 'have_tiffin', // errand 2: take the tiffin to school
  HAVE_SISTER: 'have_sister', // sister is following — bring her home to Maa
  ERRAND2_COMPLETE: 'errand2_complete', // errands 1+2 done — "Continue" unlocks errand 3 (talk to Pitaji)
  LOADING_WHEAT: 'loading_wheat', // errand 3: carry sacksCollected/sacksDelivered between the pile and the kirana shop
  WHEAT_DELIVERED: 'wheat_delivered', // all 3 sacks delivered and paid for — go buy something at the general store
  BOUGHT_GOODS: 'bought_goods', // bought something — head home to Pitaji
  ALL_COMPLETE: 'all_complete', // all three errands done — final end card
};

const SACK_TARGET = 3;

export const OBJECTIVE_TEXT = {
  [QUEST_STEPS.NOT_STARTED]: { hi: 'माँ से बात करो', en: 'Talk to Maa' },
  [QUEST_STEPS.HAVE_MONEY]: { hi: 'हलवाई को पैसे दो', en: 'Take the money to the halwai' },
  [QUEST_STEPS.HAVE_JALEBI]: { hi: 'जलेबी लेकर माँ के पास जाओ', en: 'Bring the jalebi back to Maa' },
  [QUEST_STEPS.COMPLETE]: { hi: 'माँ से फिर बात करो', en: 'Talk to Maa again' },
  [QUEST_STEPS.HAVE_TIFFIN]: { hi: 'टिफिन लेकर स्कूल जाओ', en: 'Take the tiffin to school' },
  [QUEST_STEPS.HAVE_SISTER]: { hi: 'बहन को लेकर घर जाओ', en: 'Bring your sister home' },
  [QUEST_STEPS.ERRAND2_COMPLETE]: { hi: 'पिताजी से बात करो', en: 'Talk to Pitaji' },
  [QUEST_STEPS.LOADING_WHEAT]: (quest) =>
    quest.sacksCollected > quest.sacksDelivered
      ? { hi: `गेहूं की बोरी किराना दुकान पर पहुंचाओ (${quest.sacksDelivered}/${SACK_TARGET})`, en: `Deliver the wheat sack to the kirana shop (${quest.sacksDelivered}/${SACK_TARGET})` }
      : { hi: `आंगन से गेहूं की बोरी उठाओ (${quest.sacksDelivered}/${SACK_TARGET})`, en: `Pick up a wheat sack from the courtyard pile (${quest.sacksDelivered}/${SACK_TARGET})` },
  [QUEST_STEPS.WHEAT_DELIVERED]: { hi: 'वापसी में जनरल स्टोर से कुछ खरीदो', en: 'Buy something from the general store on the way back' },
  [QUEST_STEPS.BOUGHT_GOODS]: { hi: 'घर जाकर पिताजी को बताओ', en: 'Go home and tell Pitaji' },
  [QUEST_STEPS.ALL_COMPLETE]: { hi: 'आज का सारा काम हो गया', en: "Today's work is all done" },
};

export function createQuestState() {
  return { step: QUEST_STEPS.NOT_STARTED, sacksCollected: 0, sacksDelivered: 0, money: 0 };
}

export { SACK_TARGET };
