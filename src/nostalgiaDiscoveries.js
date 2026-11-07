// VILLAGE_VOCABULARY s13 "nostalgic objects, scattered as discoveries": the objects were built (src/nostalgia.js,
// src/scooters.js) but nothing happened when you found one. Each now has a small action and a memory line, and the
// first find ticks the shared discovery log (src/discoveryLog.js). Positions come from the builders' own spot tables,
// so a map change moves these with them. No meshes, no draw calls, no colliders, no quest state.
import { ANCHORS } from './anchors.js';
import { NOSTALGIA_SPOTS } from './nostalgia.js';
import { SCOOTER_SPOTS } from './scooters.js';
import { registerDiscovery, cycle, noiseBurst, note } from './discoveryLog.js';

/** world x/z of an {at, lx, lz} spot, same maths as the builders' spotMatrix */
function spotXZ(sp) {
  const a = sp && ANCHORS[sp.at];
  if (!a) return null;
  const ry = a.ry || 0, s = Math.sin(ry), c = Math.cos(ry);
  return { x: a.x + sp.lx * c + sp.lz * s, z: a.z - sp.lx * s + sp.lz * c };
}

// The community TV's "channels": a short procedural signature tune each (no broadcaster names).
const TV_TUNES = [
  { notes: [392, 523, 494, 440, 392, 330, 392], step: 0.32, hi: 'टीवी: एक ही चैनल, धीमी सी शुरुआती धुन। सब चुपचाप बैठ जाते हैं।', en: 'TV: the one channel, its slow opening tune. Everyone settles down to watch.' },
  { notes: null, hi: 'टीवी: झिलमिल। किसी ने छत पर जाकर एंटीना घुमाने को कहा।', en: 'TV: snow and hiss. Someone shouts to go up and turn the antenna.' },
  { notes: [330, 330, 392, 440, 392, 330, 294], step: 0.24, hi: 'टीवी: रविवार सुबह का धारावाहिक। गली अचानक खाली हो गई।', en: 'TV: the Sunday morning serial. The lane is suddenly empty.' },
  { notes: [262, 330, 392, 330, 262], step: 0.3, hi: 'टीवी: कृषि दर्शन, खाद और बीज की बातें। दादाजी ध्यान से सुन रहे हैं।', en: 'TV: the farming programme, talk of seed and fertiliser. Grandfather listens closely.' },
];

export function createNostalgiaDiscoveries() {
  const S = NOSTALGIA_SPOTS;
  const at = (sp) => spotXZ(sp);

  // red letterbox at the post office
  let p = at(S.letterbox);
  if (p) registerDiscovery({
    id: 'letterbox', ...p, radius: 2.0,
    label: { hi: 'चिट्ठी डालें', en: 'Post a letter' },
    sound: (a) => { noiseBurst(a, { dur: 0.25, peak: 0.06, f0: 3000, f1: 1500 }); note(a, { t: 0.3, f0: 120, f1: 80, dur: 0.15, peak: 0.12, type: 'triangle' }); },
    lines: cycle([
      { hi: 'लाल डिब्बे में एक अंतर्देशीय पत्र। मौसी को, नानी के हालचाल पूछते हुए।', en: 'An inland letter drops into the red box. To your aunt, asking after grandmother.' },
      { hi: 'डाकिया शाम चार बजे डिब्बा खोलता है। अभी तीन ही बजे हैं।', en: 'The postman empties the box at four. It is only three now.' },
      { hi: 'पोस्टकार्ड पर पंद्रह पैसे का टिकट। पता दो बार लिखा, ताकि ग़लती न हो।', en: 'A postcard with a fifteen-paise stamp. You wrote the address twice to be sure.' },
    ]),
  });

  // community TV in its wooden cabinet at the panchayat
  p = at(S.tv);
  if (p) registerDiscovery({
    id: 'community_tv', ...p, radius: 2.6,
    label: { hi: 'टीवी का चैनल घुमाएं', en: 'Turn the TV knob' },
    sound: (a, n) => {
      note(a, { f0: 900, dur: 0.05, peak: 0.05, type: 'square' }); // the knob's clunk
      const t = TV_TUNES[n % TV_TUNES.length];
      if (!t.notes) { noiseBurst(a, { t: 0.1, dur: 1.6, peak: 0.05, type: 'highpass', f0: 1500, attack: 0.05 }); return; }
      t.notes.forEach((f, i) => note(a, { t: 0.15 + i * t.step, f0: f, dur: t.step * 0.95, peak: 0.04, type: 'triangle', lp: 1800 }));
    },
    lines: (ctx, n) => [TV_TUNES[n % TV_TUNES.length]],
  });

  // old saloon car at the panchayat
  p = at(S.ambassador);
  if (p) registerDiscovery({
    id: 'old_car', ...p, radius: 3.6,
    label: { hi: 'पुरानी गाड़ी देखें', en: 'Look at the old car' },
    sound: (a, n) => { if (n % 2) for (const f of [415, 523]) note(a, { f0: f, dur: 0.5, peak: 0.04, type: 'square', lp: 1400 }); },
    lines: cycle([
      { hi: 'प्रधान जी की पुरानी सफ़ेद गाड़ी। बोनट गरम है, धूप में खड़ी है।', en: "The pradhan's old white car. The bonnet is hot from standing in the sun." },
      { hi: 'ड्राइवर ने हॉर्न दबाकर हँसते हुए हटने को कहा।', en: 'The driver taps the horn and laughs at you to move along.' },
      { hi: 'शादी में यही गाड़ी फूलों से सजकर दूल्हा लाती है।', en: 'At weddings this same car comes decked in marigolds, carrying the groom.' },
    ]),
  });

  // gola cart at the mela ground
  p = at(S.gola);
  if (p) registerDiscovery({
    id: 'gola_cart', ...p, radius: 2.6,
    label: { hi: 'बर्फ़ का गोला लें', en: 'Get an ice gola' },
    sound: (a) => { for (let i = 0; i < 5; i++) noiseBurst(a, { t: i * 0.22, dur: 0.18, peak: 0.08, f0: 4200, f1: 2600, q: 1.5 }); },
    lines: cycle([
      { hi: 'पहिया घुमाते ही बर्फ़ घिसती है। ऊपर से लाल और हरा शरबत। होंठ रंग गए।', en: 'The wheel turns, ice shaves into the glass, red and green syrup on top. Your lips turn colours.' },
      { hi: 'आधा पिघल गया, शरबत कोहनी तक बह रहा है।', en: 'Half of it melts at once. Syrup runs down to your elbow.' },
      { hi: 'गोले वाले भैया ने थोड़ा और शरबत डाल दिया, मुफ़्त में।', en: 'The gola man pours on a little more syrup, no charge.' },
    ]),
  });

  // water tanker trailer at the mela ground
  p = at(S.tanker);
  if (p) registerDiscovery({
    id: 'water_tanker', ...p, radius: 3.4,
    label: { hi: 'टैंकर से पानी पिएं', en: 'Drink from the tanker tap' },
    sound: (a) => { note(a, { f0: 700, dur: 0.06, peak: 0.04, type: 'square' }); noiseBurst(a, { t: 0.08, dur: 1.4, peak: 0.07, f0: 1200, f1: 700, q: 0.6, attack: 0.08 }); },
    lines: cycle([
      { hi: 'नल खोला, लोहे के गिलास में ठंडा पानी। गिलास जंजीर से बँधा है।', en: 'You open the tap. Cool water into the tin tumbler, chained to the tank.' },
      { hi: 'टैंकर के नीचे की मिट्टी गीली है, एक कुत्ता वहीं सो रहा है।', en: 'The earth under the taps is wet. A dog sleeps right there in the cool.' },
    ]),
  });

  // bioscope at the mela ground
  p = at(S.bioscope);
  if (p) registerDiscovery({
    id: 'bioscope', ...p, radius: 2.2,
    label: { hi: 'बाइस्कोप में झाँकें', en: 'Peep into the bioscope' },
    sound: (a) => { [523, 587, 659, 587, 523, 440].forEach((f, i) => note(a, { t: i * 0.28, f0: f, dur: 0.26, peak: 0.035, type: 'triangle', lp: 2000 })); },
    lines: cycle([
      { hi: 'देखो देखो, दिल्ली का कुतुब मीनार देखो! बाइस्कोप वाला गा रहा है, तस्वीरें खिसकती हैं।', en: '"Look, look, see the great tower of Delhi!" The bioscope man sings as the pictures slide past.' },
      { hi: 'अब बंबई का समुंदर, फिर हाथी, फिर ताजमहल। पाँच मिनट में पूरा देश।', en: 'Now the sea at Bombay, then an elephant, then the Taj. The whole country in five minutes.' },
    ]),
  });

  // two-wheelers: the covered scooter and the old roadster motorcycle (src/scooters.js)
  const covered = SCOOTER_SPOTS.find((s) => s.m.startsWith('scooter_covered'));
  p = spotXZ(covered);
  if (p) registerDiscovery({
    id: 'covered_scooter', ...p, radius: 2.2,
    label: { hi: 'ढके स्कूटर को देखें', en: 'Look under the scooter cover' },
    lines: cycle([
      { hi: 'कवर के नीचे पुराना स्कूटर। चाचा इसे झुकाकर किक मारते हैं, तब चलता है।', en: 'An old scooter under the cover. Uncle has to tilt it over and kick it before it starts.' },
      { hi: 'कवर पर ईंट रखी है, ताकि आँधी में न उड़े।', en: 'A brick holds the cover down so the dust storms cannot take it.' },
    ]),
  });
  const bike = SCOOTER_SPOTS.find((s) => s.m.startsWith('scooter_motorcycle') && s.at === 'teastall') || SCOOTER_SPOTS.find((s) => s.m.startsWith('scooter_motorcycle'));
  p = spotXZ(bike);
  if (p) registerDiscovery({
    id: 'old_motorcycle', ...p, radius: 2.2,
    label: { hi: 'पुरानी मोटरसाइकिल देखें', en: 'Look at the old motorcycle' },
    sound: (a, n) => { if (n % 2 === 0) for (let i = 0; i < 10; i++) note(a, { t: i * 0.09, f0: 55, f1: 48, dur: 0.08, peak: 0.08, type: 'sawtooth', lp: 300 }); },
    lines: cycle([
      { hi: 'पुरानी भारी मोटरसाइकिल, गोल टंकी। चालू होते ही दुग-दुग-दुग।', en: 'A heavy old motorcycle with a round tank. It starts with a deep dug-dug-dug.' },
      { hi: 'चायवाले का बेटा इसी पर दूध लेने शहर जाता है।', en: "The tea seller's son rides it to town for the milk." },
    ]),
  });
}
