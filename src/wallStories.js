// VILLAGE_VOCABULARY s12 "wall writing and small stories": the pieces are painted (src/wallWriting.js) but could not be
// read. Each is now a "read it" discovery with the small story behind it, ticking the shared discovery log
// (src/discoveryLog.js). Positions are recomputed from the same compound-wall runs and offsets wallWriting.js uses,
// so they follow the walls. No meshes, no draw calls, no colliders. No party names, no brands, nothing at faith buildings.
import { ANCHORS, localPt } from './anchors.js';
import { MAP_COMPOUND_WALLS } from './mapCompoundWalls.js';
import { registerDiscovery, cycle, noiseBurst } from './discoveryLog.js';

/** point `s` metres along the run of `wallName` that starts at map (ax, az); null if the wall moved */
function onRun(wallName, ax, az, s) {
  const entry = MAP_COMPOUND_WALLS.find((w) => w.name === wallName);
  if (!entry) return null;
  for (const line of entry.lines) for (let i = 0; i + 1 < line.length; i++) {
    if (Math.abs(line[i][0] - ax) < 0.05 && Math.abs(line[i][1] - az) < 0.05) {
      const a = { x: line[i][0] + 600, z: line[i][1] }, b = { x: line[i + 1][0] + 600, z: line[i + 1][1] };
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      return { x: a.x + (b.x - a.x) / len * s, z: a.z + (b.z - a.z) / len * s };
    }
  }
  return null;
}

const rustle = (a) => noiseBurst(a, { dur: 0.35, peak: 0.045, type: 'highpass', f0: 2500, attack: 0.03 });

// [id, wall, run start x, run start z, s along run, label, lines]  (same table as wallWriting.js's onWall calls)
const WALL_PIECES = [
  ['peshab_sign', 'Tyre repair shop', 27.8, -106.8, 1.5,
    { hi: 'दीवार पर लिखा पढ़ें', en: 'Read the wall' },
    [{ hi: '"यहाँ पेशाब करना मना है।" बगल में भगवान की तस्वीर वाली टाइल। तरकीब काम करती है, दीवार साफ़ है।', en: '"Do not urinate here." A god\'s picture tile beside it. The trick works: the wall is clean.' },
      { hi: 'किसी ने नीचे कोयले से जोड़ा: "पकड़े गए तो ५१ रुपये जुर्माना।"', en: 'Someone added underneath in charcoal: "Caught? 51 rupees fine."' }]],
  ['slogan_weighbridge', 'Truck weighbridge', 122.7, -100.7, 2.0,
    { hi: 'चुनावी नारा पढ़ें', en: 'Read the old slogan' },
    [{ hi: 'पिछले चुनाव का नारा, आधा चूने से पुता हुआ। बस "विकास को वोट दें" और एक सूरज बचा है।', en: 'A slogan from the last election, half limewashed over. Only "Vote for Progress" and a painted sun survive.' },
      { hi: 'अगले चुनाव में इसी दीवार पर फिर नया नारा लिखा जाएगा।', en: 'Next election, a new slogan will go up on this same wall.' }]],
  ['slogan_pump', 'Petrol pump', -42.2, -154.1, 6.0,
    { hi: 'चुनावी नारा पढ़ें', en: 'Read the old slogan' },
    [{ hi: '"हमारा नेता, हमारी शान।" नेता का नाम किसी ने पोत दिया है, बस तारा बचा है।', en: '"Our Leader, Our Pride." Someone has painted over the leader\'s name. Only the star is left.' }]],
  ['cricket_score', 'Tubewell and pump room', 128.3, 38.5, 2.0,
    { hi: 'चॉक का स्कोर पढ़ें', en: 'Read the chalk score' },
    [{ hi: 'चॉक से क्रिकेट का स्कोर: "हमारी टीम ५४/२, छह ओवर।" पुराने स्कोर मिटाकर लिखा है।', en: 'A chalk cricket score: "Our XI 54 for 2 after 6 overs." Older scores rubbed out underneath.' },
      { hi: 'मैच बीच में रुका, गेंद नलकूप की हौदी में गिर गई थी।', en: 'The match stopped halfway. The ball went into the tubewell tank.' }]],
  ['kids_drawings', 'Creche and preschool (anganwadi)', -23.6, 103.6, 2.0,
    { hi: 'बच्चों की चित्रकारी देखें', en: "Look at the children's drawings" },
    [{ hi: 'रंगीन चॉक से बना घर, सूरज, तीन लोगों का परिवार, एक फूल। और टेढ़े अक्षरों में "क ख ग"।', en: 'A coloured-chalk house, a sun, a stick family of three, a flower. And "ka kha ga" in wobbly letters.' }]],
  ['shaadi_card', 'Sweet shop (halwai)', 40.3, 19.4, 1.75,
    { hi: 'शादी का कार्ड पढ़ें', en: 'Read the wedding card' },
    [{ hi: 'गेट पर चिपका लाल शादी का कार्ड: "शुभ विवाह, रवि संग सुनीता"। बारात अगले मंगलवार।', en: 'A red wedding card taped to the gate: "Wedding, Ravi and Sunita". The barat is next Tuesday.' },
      { hi: 'हलवाई ने उसी दिन के लिए पाँच सौ लड्डू का ऑर्डर लिया है।', en: 'The halwai has an order for five hundred laddoos that day.' }]],
  ['to_let', 'General store', 24.1, 49, 1.75,
    { hi: 'बोर्ड पढ़ें', en: 'Read the sign' },
    [{ hi: '"किराये के लिए खाली।" ताले पर धूल जमी है। बेटा शहर में नौकरी करने चला गया।', en: '"To Let." Dust on the padlock. The son went off to a job in the city.' }]],
];

export function createWallStories() {
  for (const [id, wall, ax, az, s, label, lines] of WALL_PIECES) {
    const p = onRun(wall, ax, az, s);
    if (p) registerDiscovery({ id, ...p, radius: 2.2, label, sound: rustle, lines: cycle(lines) });
  }

  // PCO STD ISD kiosk outside the bus stop, shutter down (wallWriting.js: centre map 544.6, -106.2, front +z)
  registerDiscovery({
    id: 'pco_booth', x: 600 - 55.4, z: -106.2 + 1.0, radius: 2.2,
    label: { hi: 'पीसीओ बूथ देखें', en: 'Look at the PCO booth' },
    sound: (a) => noiseBurst(a, { dur: 0.6, peak: 0.07, f0: 600, f1: 300, q: 2, attack: 0.005 }), // you rattle the shutter
    lines: cycle([
      { hi: '"पीसीओ एसटीडी आईएसडी।" शटर गिरा हुआ है। यहाँ से दीदी हर रविवार ससुराल फ़ोन करती थी।', en: '"PCO STD ISD." The shutter is down. Didi used to ring her in-laws from here every Sunday.' },
      { hi: 'रात नौ बजे के बाद आधे दाम पर बात होती थी। तब लाइन लगती थी।', en: 'After nine at night the calls were half price. That is when the queue formed.' },
    ]),
  });

  // yesterday's newspaper on the open-air barber's tool box (wallWriting.js: chaupal local (-6.4, 6.8), yaw 2.4, box at (0.95, 0.85))
  if (ANCHORS.yard_chaupal) {
    const o = localPt('yard_chaupal', -6.4, 6.8), th = (ANCHORS.yard_chaupal.ry || 0) + 2.4;
    registerDiscovery({
      id: 'barber_newspaper', x: o.x + 0.95 * Math.cos(th) + 0.85 * Math.sin(th), z: o.z - 0.95 * Math.sin(th) + 0.85 * Math.cos(th), radius: 1.8,
      label: { hi: 'अख़बार पढ़ें', en: 'Read the newspaper' },
      sound: rustle,
      lines: cycle([
        { hi: 'कल का अख़बार, नाई की कुर्सी पर। पहले पन्ने पर मानसून की ख़बर, आख़िरी पर क्रिकेट।', en: "Yesterday's paper on the barber's box. The monsoon on the front page, cricket on the back." },
        { hi: 'बीच का पन्ना गायब है। कोई उसमें मूँगफली लपेटकर ले गया।', en: 'The middle page is missing. Someone wrapped peanuts in it.' },
      ]),
    });
  }

  // a cycle with a child seat at the school gate (wallWriting.js: school + (5.6, -12.62))
  if (ANCHORS.school) registerDiscovery({
    id: 'child_seat_cycle', x: ANCHORS.school.x + 5.6, z: ANCHORS.school.z - 12.62 - 0.6, radius: 1.9,
    label: { hi: 'साइकिल देखें', en: 'Look at the cycle' },
    sound: (a) => { a.playBlip?.(2600, 0.25, 0.5, 'triangle'); setTimeout(() => a.playBlip?.(2600, 0.3, 0.4, 'triangle'), 180); },
    lines: cycle([
      { hi: 'पीछे बच्चे की छोटी सीट वाली साइकिल। कोई पिता छुट्टी की घंटी का इंतज़ार कर रहा है।', en: 'A cycle with a little child seat on the carrier. Some father is waiting for the home-time bell.' },
    ]),
  });
}
