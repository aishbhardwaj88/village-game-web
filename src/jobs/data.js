/**
 * Static data for the side jobs: map markers, the order the postman hands postcards out in, and the texts (postcard + gossip).
 */
import { pt } from '../anchors.js';

export const JOBS = {
  pump: { n: 7, en: 'Pump water for Dadi', hi: 'दादी के लिए पानी भरो', x: -55.5, z: 28 },
  ration: { n: 9, en: 'Ration run with Maa', hi: 'माँ के साथ राशन', ...pt('ration') },
  kulfi: { n: 3, en: 'Kulfiwala', hi: 'कुल्फी वाला', x: -54, z: 40 },
  kanche: { n: 10, en: 'Kanche and stapu', hi: 'कंचे और स्टापू', x: -46, z: 12 },
  gilli: { n: 6, en: 'Gilli-danda', hi: 'गिल्ली-डंडा', x: 46, z: 104 },
  milk: { n: 2, en: 'Milk round', hi: 'दूध का चक्कर', x: -44, z: 60 },
  chakki: { n: 5, en: 'Atta chakki run', hi: 'आटा चक्की', ...pt('chakki') },
  gate: { n: 4, en: 'Narrow khet gate', hi: 'तंग खेत का फाटक', x: 6, z: 14 },
  patang: { n: 1, en: 'Patang loot', hi: 'पतंग लूट', x: -60, z: 60 },
  mango: { n: 8, en: 'Mango varieties', hi: 'आम की किस्में', ...pt('baagh') },
};
// The postman hands these out in this order (the postcard names one new job each time he is passed).
export const POSTCARD_ORDER = ['pump', 'ration', 'kulfi', 'milk', 'kanche', 'chakki', 'gate', 'mango', 'gilli', 'patang'];
export const POSTCARD_TEXT = {
  pump: { en: 'Dadi says the pump water is sweetest at the chowk. She needs three buckets.', hi: 'दादी कहती हैं चौक के पंप का पानी सबसे मीठा है। उन्हें तीन बाल्टी चाहिए।' },
  ration: { en: 'Maa is going to the ration shop and could use a pair of hands.', hi: 'माँ राशन की दुकान जा रही हैं, उन्हें एक साथी चाहिए।' },
  kulfi: { en: 'Listen for a bell. The kulfiwala is somewhere in the village today.', hi: 'घंटी सुनो। आज कुल्फी वाला गाँव में कहीं है।' },
  milk: { en: 'The doodhwala is short of hands today. His round starts by the halwai.', hi: 'दूधवाले को आज मदद चाहिए। उसका चक्कर हलवाई के पास से शुरू होता है।' },
  kanche: { en: 'The kids at the chowk are playing kanche and stapu. Go and join.', hi: 'चौक पर बच्चे कंचे और स्टापू खेल रहे हैं। जाओ, शामिल हो जाओ।' },
  chakki: { en: 'Dadi wants fresh flour. Take a sack of wheat to the chakki on the bullock cart.', hi: 'दादी को ताज़ा आटा चाहिए। गेहूं की बोरी बैलगाड़ी से चक्की ले जाओ।' },
  gate: { en: 'Pitaji says nobody has reversed the trolley through the narrow khet gate this year.', hi: 'पिताजी कहते हैं इस साल किसी ने ट्रॉली को तंग फाटक से पीछे नहीं निकाला।' },
  mango: { en: 'There are six kinds of mango in the village. Have you tasted them all?', hi: 'गाँव में आम की छह किस्में हैं। सब चखी हैं?' },
  gilli: { en: 'Gilli-danda at the khel maidan this evening. Three kids want to challenge you.', hi: 'आज शाम खेल मैदान में गिल्ली-डंडा है। तीन बच्चे तुम्हें चुनौती दे रहे हैं।' },
  patang: { en: 'A kite match is on! Keep your eyes on the sky.', hi: 'पतंग का मुकाबला है! आसमान पर नज़र रखो।' },
};


// What the kulfiwala (or anyone) lets slip about another job.
export const GOSSIP_TEXT = {
  pump: { en: 'They say Dadi is waiting for someone to bring water from the chowk pump.', hi: 'सुना है दादी चौक के पंप से पानी मँगवाने के लिए किसी का इंतज़ार कर रही हैं।' },
  ration: { en: 'Maa was asking who could walk with her to the ration shop.', hi: 'माँ पूछ रही थीं कि राशन की दुकान तक कौन साथ चलेगा।' },
  kulfi: { en: 'Keep your ears open for my bell, beta!', hi: 'मेरी घंटी पर कान रखना, बेटा!' },
  milk: { en: 'The doodhwala is running late with his milk round — he could use a cyclist.', hi: 'दूधवाले का चक्कर देर से चल रहा है — उसे साइकिल वाला चाहिए।' },
  kanche: { en: 'The kids at the chowk are playing kanche — they say nobody beats them.', hi: 'चौक पर बच्चे कंचे खेल रहे हैं — कहते हैं उन्हें कोई नहीं हराता।' },
  chakki: { en: 'Dadi wants fresh flour, but the chakki is a bullock-cart ride away.', hi: 'दादी को ताज़ा आटा चाहिए, पर चक्की तक बैलगाड़ी से जाना पड़ेगा।' },
  gate: { en: 'Pitaji says the khet gate is narrower than any trolley.', hi: 'पिताजी कहते हैं खेत का फाटक हर ट्रॉली से तंग है।' },
  mango: { en: 'There are six kinds of mango around here. Only a real mango lover has tasted all six!', hi: 'यहाँ आम की छह किस्में हैं। सच्चा आम-प्रेमी ही सब चखता है!' },
  gilli: { en: 'There will be gilli-danda at the khel maidan this evening!', hi: 'आज शाम खेल मैदान में गिल्ली-डंडा होगा!' },
  patang: { en: 'A kite match is on today — keep an eye on the sky.', hi: 'आज पतंग का मुकाबला है — आसमान पर नज़र रखना।' },
};
