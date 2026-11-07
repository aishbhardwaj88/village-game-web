// VILLAGE_VOCABULARY s11 "every village has one of these": the oddities stand (src/villageOddities.js,
// src/villageFurniture3.js) but you could only look. Each is now a small action: draw a bucket from the old well,
// sieve the sand, tap the shamiana band's drum, peer into the bhootiya ghar, and so on, ticking the shared discovery
// log (src/discoveryLog.js). Positions come from the builders' spot tables. No meshes, no draw calls, no colliders.
// The mazar was removed on her order (7 Nov) and gets nothing here.
import * as THREE from 'three';
import { ODDITY_SPOTS, spotMatrix } from './villageOddities.js';
import { FURNITURE3_SPOTS } from './villageFurniture3.js';
import { registerDiscovery, cycle, noiseBurst, note, creak, dhol } from './discoveryLog.js';

const _v = new THREE.Vector3();
/** world x/z of a point (lx, lz) in a spot's own frame, or null if its anchor is gone */
function ptIn(sp, lx = 0, lz = 0) {
  const m = sp && spotMatrix(sp);
  if (!m) return null;
  _v.set(lx, 0, lz).applyMatrix4(m);
  return { x: _v.x, z: _v.z };
}

export function createOddityDiscoveries() {
  const S = ODDITY_SPOTS;

  // old well with a pulley and a bucket on a rope (collider 3.6 m square)
  let p = ptIn(S.well);
  if (p) registerDiscovery({
    id: 'old_well', ...p, radius: 2.9,
    label: { hi: 'कुएँ से बाल्टी खींचें', en: 'Draw a bucket from the well' },
    sound: (a) => {
      creak(a, 0, 3); // the bucket going down
      noiseBurst(a, { t: 1.35, dur: 0.5, peak: 0.1, type: 'lowpass', f0: 1400, f1: 300, attack: 0.005 }); // splash, far below
      creak(a, 2.0, 5); // hauling it up
    },
    lines: cycle([
      { hi: 'रस्सी चरखी पर चरमराती है। नीचे छपाक। बाल्टी भारी होकर ऊपर आती है, पानी बर्फ़ जैसा ठंडा।', en: 'The rope creaks over the pulley. A splash far below. The bucket comes up heavy, the water ice cold.' },
      { hi: 'कुएँ में झाँककर "हो!" कहा। आवाज़ लौटकर आई।', en: 'You lean over and call "ho!" into the well. It calls back.' },
      { hi: 'दादी कहती हैं, नल आने से पहले पूरा गाँव यहीं से पानी भरता था।', en: 'Grandmother says the whole village drew water here before the handpumps came.' },
    ]),
  });

  // half-built house with iron rods sticking out of the roof (6 x 5 m shell)
  p = ptIn(S.halfbuilt);
  if (p) registerDiscovery({
    id: 'half_built_house', ...p, radius: 5.6, // shell + rod stubs pad the collider to ~4.2 m half-width; 5.6 leaves a ring you can stand in
    label: { hi: 'अधूरा मकान देखें', en: 'Look at the half-built house' },
    sound: (a) => { for (let i = 0; i < 3; i++) note(a, { t: i * 0.5, f0: 1900 + i * 60, dur: 0.35, peak: 0.03, type: 'triangle' }); }, // tapping a rebar
    lines: cycle([
      { hi: 'छत से सरिया बाहर झाँक रहे हैं। अगली मंज़िल बेटे की नौकरी लगने के बाद बनेगी।', en: 'Iron rods poke out of the roof. The next floor goes up when the son gets a job.' },
      { hi: 'सरियों पर एक काली हांडी उल्टी लटकी है, नज़र से बचाने को।', en: 'A black pot hangs upside down on the rods, to ward off the evil eye.' },
    ]),
  });

  // sand pile with a sieve and stacked bricks (7.2 x 3.6 m)
  p = ptIn(S.sandpile, 0.4, 0);
  if (p) registerDiscovery({
    id: 'sand_pile', ...p, radius: 4.6,
    label: { hi: 'रेत छानें', en: 'Sieve some sand' },
    sound: (a) => { for (let i = 0; i < 4; i++) noiseBurst(a, { t: i * 0.45, dur: 0.4, peak: 0.07, type: 'highpass', f0: 3000, attack: 0.08 }); },
    lines: cycle([
      { hi: 'झरनी पर रेत डाली, हिलाई। महीन रेत नीचे, कंकड़ ऊपर। मिस्त्री ने अँगूठा दिखाया।', en: 'You throw sand on the sieve and shake it. Fine sand below, pebbles on top. The mason gives you a thumbs up.' },
      { hi: 'बच्चों ने रेत के ढेर पर क़िला बना रखा है। तुमने उसे नहीं छुआ।', en: 'The children have built a fort on the sand pile. You leave it alone.' },
    ]),
  });

  // bamboo scaffolding on a wall going up
  p = ptIn(S.scaffold, 0, 0.4);
  if (p) registerDiscovery({
    id: 'bamboo_scaffold', ...p, radius: 3.4,
    label: { hi: 'बाँस की मचान देखें', en: 'Look at the bamboo scaffold' },
    sound: (a) => { note(a, { f0: 320, f1: 260, dur: 0.18, peak: 0.07, type: 'triangle' }); note(a, { t: 0.25, f0: 300, f1: 240, dur: 0.18, peak: 0.06, type: 'triangle' }); }, // knocking a bamboo
    lines: cycle([
      { hi: 'बाँस रस्सी से बँधे हैं, एक कील नहीं। ऊपर मज़दूर गाना गाते हुए ईंटें पकड़ा रहे हैं।', en: 'Bamboo poles lashed with rope, not one nail. Up top the labourers sing as they pass bricks.' },
      { hi: 'ईंट नीचे से ऊपर फेंकी जाती है, और हर बार पकड़ी जाती है।', en: 'Bricks are tossed up from below, and caught every single time.' },
    ]),
  });

  // shamiana going up for a shaadi: chairs stacked, the band's drum (stack at local (W/2-0.7, D/2-0.9))
  p = ptIn(S.shamiana, 2.3, 1.6);
  if (p) registerDiscovery({
    id: 'shamiana_drum', ...p, radius: 2.4,
    label: { hi: 'बैंड का ढोल बजाएं', en: "Tap the band's drum" },
    sound: (a) => dhol(a),
    lines: cycle([
      { hi: 'धम-धम-धम। कुर्सियाँ लगाने वाले लड़के नाचने लगे। टेंट वाले ने हँसकर डाँटा।', en: 'Dhum-dhum-dhum. The boys stacking chairs start to dance. The tent man laughs and tells them off.' },
      { hi: 'शामियाना आधा तना है। शाम तक बत्तियाँ लग जाएँगी, बारात रात को आएगी।', en: 'The shamiana is half up. The lights go on by evening; the barat comes tonight.' },
    ]),
  });

  // the bhootiya ghar, the ruined house with the peepal growing through it (6 x 4.8 m)
  p = ptIn(FURNITURE3_SPOTS.ruin);
  if (p) registerDiscovery({
    id: 'bhootiya_ghar', ...p, radius: 4.4,
    label: { hi: 'भूतिया घर में झाँकें', en: 'Peer into the bhootiya ghar' },
    sound: (a, n) => {
      noiseBurst(a, { dur: 2.2, peak: 0.06, type: 'bandpass', f0: 500, f1: 900, q: 3, attack: 0.6 }); // wind through the gaps
      if (n % 2 === 0) for (let i = 0; i < 6; i++) noiseBurst(a, { t: 0.8 + i * 0.07, dur: 0.06, peak: 0.08, f0: 1800, q: 1 }); // wings
    },
    lines: cycle([
      { hi: 'अंदर अँधेरा, पीपल की जड़ें दीवारें तोड़कर निकली हैं। अचानक कबूतर फड़फड़ाकर उड़े। दिल धक से रह गया।', en: 'Dark inside, peepal roots splitting the walls. Pigeons burst out flapping. Your heart jumps.' },
      { hi: 'बच्चे कहते हैं रात को यहाँ से पायल की आवाज़ आती है। दिन में तो बस हवा है।', en: 'The kids say you can hear anklets in here at night. By day there is only the wind.' },
      { hi: 'दरवाज़े के पास कोयले से लिखा है "भूत बंगला", साथ में टेढ़ा-मेढ़ा भूत। किसी बच्चे की लिखावट।', en: 'Charcoal by the door: "Ghost house", with a wobbly ghost drawn beside it. A child\'s hand.' },
    ]),
  });
}
