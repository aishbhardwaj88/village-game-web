/**
 * The errand(s), v4 (Dopahar's 8-mission story — docs/STORY.md). All state lives in
 * one small in-memory object — no save system beyond localStorage's own `questStep`
 * (plus whichever counters the active mission needs); "play again" just recreates it.
 * One continuous `step` enum covers all eight missions (each ERRAND*_COMPLETE step is
 * an intermediate hub-conversation step, not terminal — talking to the right character
 * from there offers the next mission) rather than separate per-mission state objects,
 * so "restart" naturally resets everything at once. src/interactions.js drives the
 * step transitions; main.js reads `step` to render the top-left objective text, the
 * waypoint target, and the end card(s). Only ALL_COMPLETE (after M8's rooftop scene)
 * is the true, final end — every other *_COMPLETE step is a hub step that the next
 * mission's own first interaction immediately moves past.
 */
export const QUEST_STEPS = {
  // M1 — jalebi for Maa
  NOT_STARTED: 'not_started', // go talk to Maa
  HAVE_MONEY: 'have_money', // go give it to the halwai
  HAVE_JALEBI: 'have_jalebi', // go back to Maa
  COMPLETE: 'complete', // M1 done — end card shows once, "Continue" unlocks M2

  // M2 — tiffin to school, bring sister home
  HAVE_TIFFIN: 'have_tiffin', // take the tiffin to school
  HAVE_SISTER: 'have_sister', // sister is following — bring her home to Maa
  ERRAND2_COMPLETE: 'errand2_complete', // M1+M2 done — talk to Pitaji unlocks M3

  // M3 — wheat sacks to kirana, earn money for Dada's gift
  LOADING_WHEAT: 'loading_wheat', // carry sacksCollected/sacksDelivered between the pile and the kirana shop
  WHEAT_DELIVERED: 'wheat_delivered', // all 3 sacks delivered and paid for — go buy something at the general store
  BOUGHT_GOODS: 'bought_goods', // bought something — head home to Pitaji
  ERRAND3_COMPLETE: 'errand3_complete', // M1-M3 done — talk to Pitaji unlocks M4

  // M4 — find the postman, get Bua's letter
  FINDING_POSTMAN: 'finding_postman', // catch the postman on his cycle round
  HAVE_LETTER: 'have_letter', // bring the letter back to Pitaji
  ERRAND4_COMPLETE: 'errand4_complete', // M4 done — talk to Maa unlocks M5

  // M5 — Dada's kurta from the darzi
  GOING_TO_DARZI: 'going_to_darzi', // collect the kurta from the darzi
  HAVE_KURTA: 'have_kurta', // carrying it home — M6's monkey ambush triggers from here

  // M6 — the monkey and the kurta (starts automatically out of HAVE_KURTA, no hub step)
  KURTA_STOLEN: 'kurta_stolen', // chase the monkey through its route
  KURTA_RECOVERED: 'kurta_recovered', // got it back — tell Pitaji
  ERRAND6_COMPLETE: 'errand6_complete', // M5+M6 done — talk to Pitaji unlocks M7

  // M7 — mango baagh run
  GOING_TO_BAAGH: 'going_to_baagh', // drive the tractor+trolley out to the baagh
  KNOCKING_MANGOES: 'knocking_mangoes', // knock mangoes down from the marked trees
  MANGOES_LOADED: 'mangoes_loaded', // trolley's full — drive home
  ERRAND7_COMPLETE: 'errand7_complete', // M7 done — talk to Pitaji unlocks M8

  // M8 — sunset: the birthday (ending)
  GOING_TO_ROOF: 'going_to_roof', // go up to the roof — the whole family is waiting
  ALL_COMPLETE: 'all_complete', // all eight missions done — final end card + credits

  // After the credits (docs/MISSIONS_PLAN.md section 2) — the village stays open: no clock, no main objective, side jobs + pocket money.
  FREE_ROAM: 'free_roam',
};

const SACK_TARGET = 3;
const MANGO_TARGET = 5;

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
  [QUEST_STEPS.ERRAND3_COMPLETE]: { hi: 'पिताजी से बात करो', en: 'Talk to Pitaji' },
  [QUEST_STEPS.FINDING_POSTMAN]: { hi: 'डाकिये को उसके चक्कर में ढूंढो', en: 'Find the postman on his cycle round' },
  [QUEST_STEPS.HAVE_LETTER]: { hi: 'चिट्ठी लेकर पिताजी के पास जाओ', en: "Bring the letter back to Pitaji" },
  [QUEST_STEPS.ERRAND4_COMPLETE]: { hi: 'माँ से बात करो', en: 'Talk to Maa' },
  [QUEST_STEPS.GOING_TO_DARZI]: { hi: 'दर्जी से कुर्ता ले आओ', en: "Collect Dada's kurta from the darzi" },
  [QUEST_STEPS.HAVE_KURTA]: { hi: 'कुर्ता लेकर घर जाओ', en: 'Head home with the kurta' },
  [QUEST_STEPS.KURTA_STOLEN]: { hi: 'बंदर का पीछा करो!', en: 'Chase the monkey!' },
  [QUEST_STEPS.KURTA_RECOVERED]: { hi: 'पिताजी को बताओ', en: 'Tell Pitaji' },
  [QUEST_STEPS.ERRAND6_COMPLETE]: { hi: 'पिताजी से बात करो', en: 'Talk to Pitaji' },
  [QUEST_STEPS.GOING_TO_BAAGH]: { hi: 'ट्रैक्टर से बाग जाओ', en: 'Drive the tractor out to the baagh' },
  [QUEST_STEPS.KNOCKING_MANGOES]: (quest) => ({
    hi: `पेड़ों से आम गिराओ (${quest.mangoesCollected ?? 0}/${MANGO_TARGET})`,
    en: `Knock mangoes down from the trees (${quest.mangoesCollected ?? 0}/${MANGO_TARGET})`,
  }),
  [QUEST_STEPS.MANGOES_LOADED]: { hi: 'घर वापस चलो', en: 'Drive back home' },
  [QUEST_STEPS.ERRAND7_COMPLETE]: { hi: 'पिताजी से बात करो', en: 'Talk to Pitaji' },
  [QUEST_STEPS.GOING_TO_ROOF]: { hi: 'छत पर जाओ — सब इंतज़ार कर रहे हैं', en: 'Go up to the roof — everyone is waiting' },
  [QUEST_STEPS.ALL_COMPLETE]: { hi: 'आज का सारा काम हो गया', en: "Today's work is all done" },
  [QUEST_STEPS.FREE_ROAM]: { hi: 'दोपहर तुम्हारी है — गाँव में घूमो', en: 'The afternoon is yours — wander the village' },
};

export function createQuestState() {
  return {
    step: QUEST_STEPS.NOT_STARTED,
    sacksCollected: 0,
    sacksDelivered: 0,
    money: 0,
    mangoesCollected: 0,
    // Free roam (docs/MISSIONS_PLAN.md): set once the story ends; all persisted by src/save.js.
    storyDone: false,
    pocket: 0, // pocket money earned by side jobs (separate from the M3 wheat money above)
    discovered: [], // notebook-map ids of places and side jobs the player has found
    jobsDone: {}, // side job id -> number of times completed
    marbles: 0, // kanche pouch
    kites: 0, // collected kites
    mangoVarieties: [], // ids of mango varieties tasted
  };
}

export { SACK_TARGET, MANGO_TARGET };
