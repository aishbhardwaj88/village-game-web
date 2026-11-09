// Extra "things you can do" (VILLAGE_VOCABULARY s9): temple bell (ambient sound only, no task, no reward),
// kulhad chai (steam at the screen edge), chaupal radio (cycles procedural tunes), panchayat notice board,
// pick up a kite. All positions come from src/anchors.js so a map change moves them. Touches no quest state.
import * as THREE from 'three';
import { ANCHORS, localPt } from './anchors.js';
import { registerInteraction } from './interactions.js';
import { CHAURAHA } from './mapPlan.js';

const V = (p) => new THREE.Vector3(p.x, 0, p.z);
// The chowk offset can land inside the solid roundabout island (unreachable on foot): push it out to the carriageway, same bearing.
function outsideIsland(p) {
  const dx = p.x - CHAURAHA.x, dz = p.z - CHAURAHA.z, d = Math.hypot(dx, dz), r = CHAURAHA.islandR + 1.6;
  return d >= r || d < 1e-6 ? p : { x: CHAURAHA.x + dx / d * r, z: CHAURAHA.z + dz / d * r };
}

const NOTICES = [
  [{ en: 'NOTICE: Polio drops for children under five, Sunday at the school.', hi: 'सूचना: रविवार को स्कूल में पाँच साल तक के बच्चों को पोलियो की बूँदें।' }],
  [{ en: 'NOTICE: Gram Sabha meeting on Saturday evening at the chaupal. All are welcome.', hi: 'सूचना: शनिवार शाम चौपाल पर ग्राम सभा की बैठक। सभी आमंत्रित हैं।' }],
  [{ en: 'NOTICE: Wheat seed and fertiliser at the cooperative society from Monday.', hi: 'सूचना: सोमवार से सहकारी समिति में गेहूँ का बीज और खाद मिलेगी।' }],
  [{ en: 'NOTICE: Handpump near the school is being repaired. Please use the tubewell.', hi: 'सूचना: स्कूल के पास हैंडपंप की मरम्मत हो रही है। कृपया नलकूप से पानी लें।' }],
  [{ en: 'NOTICE: Keep the lanes clean. Drain cleaning day is the first of the month.', hi: 'सूचना: गलियाँ साफ रखें। नाली सफाई का दिन महीने की पहली तारीख़ है।' }],
];

// Four short procedural "stations": [note Hz sequence, wave type, step seconds]
const TUNES = [
  { name: { en: 'Radio: a slow bhajan-style tune', hi: 'रेडियो: धीमी धुन' }, notes: [293, 330, 392, 330, 293, 262, 293, 0], wave: 'triangle', step: 0.38 },
  { name: { en: 'Radio: a lively film-song tune', hi: 'रेडियो: तेज़ फ़िल्मी धुन' }, notes: [392, 440, 494, 440, 392, 330, 392, 523], wave: 'square', step: 0.2 },
  { name: { en: 'Radio: the farm programme jingle', hi: 'रेडियो: खेती-बाड़ी की धुन' }, notes: [262, 330, 392, 523, 392, 330, 262, 0], wave: 'sawtooth', step: 0.26 },
  { name: { en: 'Radio: static between stations', hi: 'रेडियो: स्टेशनों के बीच की खरखर' }, notes: null },
];

export function createInteractionsExtra(scene, ctx) {
  const audio = ctx.audio;
  const say = (en, hi) => ctx.dialogue.say([{ en, hi }]);

  // ---- temple bell: sound only ----
  const t = ANCHORS.temple;
  registerInteraction({
    id: 'temple_bell', position: V(localPt('temple', 0, 6)), radius: 6,
    label: { hi: 'घंटा बजाएं', en: 'Ring the temple bell' },
    onInteract: () => { audio.ringBell(); setTimeout(() => audio.ringBell(), 700); },
  });

  // ---- kulhad chai with steam at the screen edge ----
  const steam = document.createElement('div');
  steam.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:45%;pointer-events:none;opacity:0;transition:opacity 1.2s;z-index:5;' +
    'background:radial-gradient(ellipse 70% 90% at 50% 110%,rgba(255,255,255,.55),rgba(255,255,255,.18) 45%,rgba(255,255,255,0) 75%);filter:blur(10px)';
  document.body.appendChild(steam);
  let steamTimer = 0;
  registerInteraction({
    id: 'kulhad_chai', position: V(localPt('teastall', 0, 0)), radius: 4.5, priority: 0.5,
    label: { hi: 'कुल्हड़ चाय लें', en: 'Have a kulhad of chai' },
    onInteract: () => {
      audio.playBlip?.(520, 0.1, 0.6);
      steam.style.opacity = '1';
      clearTimeout(steamTimer);
      steamTimer = setTimeout(() => { steam.style.opacity = '0'; }, 5000);
      say('Hot, sweet chai in a clay kulhad. You blow on it and sip.', 'मिट्टी के कुल्हड़ में गरम मीठी चाय। फूँक मारकर घूँट लिया।');
    },
  });

  // ---- chaupal radio: cycle stations ----
  let station = -1, radioTimer = 0, radioNode = null;
  function stopRadio() { clearTimeout(radioTimer); if (radioNode) { try { radioNode.disconnect(); } catch (e) { /* gone */ } radioNode = null; } }
  function playStation(i) {
    stopRadio();
    if (!audio.started || !audio.ctx) return;
    const ac = audio.ctx;
    const out = ac.createGain();
    out.gain.value = 0.05;
    const lp = ac.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 1400; lp.Q.value = 0.6; // small speaker
    out.connect(lp); lp.connect(audio.master);
    radioNode = lp;
    const tune = TUNES[i];
    if (!tune.notes) {
      const n = Math.floor(ac.sampleRate * 1.5), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let k = 0; k < n; k++) d[k] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf; src.connect(out); src.start(); src.stop(ac.currentTime + 1.5);
      return;
    }
    let tt = ac.currentTime + 0.05;
    for (let rep = 0; rep < 2; rep++) for (const f of tune.notes) {
      if (f) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = tune.wave; o.frequency.value = f;
        g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(1, tt + 0.02); g.gain.exponentialRampToValueAtTime(0.001, tt + tune.step * 0.95);
        o.connect(g); g.connect(out); o.start(tt); o.stop(tt + tune.step);
      }
      tt += tune.step;
    }
    radioTimer = setTimeout(stopRadio, (tt - ac.currentTime) * 1000 + 100);
  }
  const rp = localPt('yard_chaupal', 3.4, -6.6);
  registerInteraction({
    id: 'chaupal_radio', position: V(rp), radius: 3, priority: 0.5,
    label: { hi: 'रेडियो का स्टेशन बदलें', en: 'Turn the radio dial' },
    onInteract: () => {
      station = (station + 1) % TUNES.length;
      playStation(station);
      say(TUNES[station].name.en, TUNES[station].name.hi);
    },
  });

  // ---- panchayat notice board at the chowk ----
  let ni = 0;
  registerInteraction({
    id: 'notice_board', position: V(outsideIsland(localPt('chowk', 4, 4))), radius: 3,
    label: { hi: 'सूचना पढ़ें', en: 'Read the notice board' },
    onInteract: () => { ctx.dialogue.say(NOTICES[ni % NOTICES.length]); ni++; },
  });

  // ---- a fallen kite at the play ground ----
  const kp = localPt('maidan', 3, 2);
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#c8402a'; g.beginPath(); g.moveTo(32, 2); g.lineTo(60, 28); g.lineTo(32, 62); g.lineTo(4, 28); g.closePath(); g.fill();
  g.strokeStyle = '#f2e2b0'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 2); g.lineTo(32, 62); g.moveTo(4, 28); g.lineTo(60, 28); g.stroke();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const kite = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.8),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
  kite.rotation.set(-Math.PI / 2, 0, 0.6); kite.position.set(kp.x, 0.03, kp.z);
  scene.add(kite);
  registerInteraction({
    id: 'kite_pickup', position: V(kp), radius: 2, available: () => kite.visible,
    label: { hi: 'पतंग उठाएं', en: 'Pick up the kite' },
    onInteract: () => {
      kite.visible = false;
      say('A kite, its string cut. Someone lost it to a pech on the rooftops. You tuck it under your arm.', 'डोर कटी हुई पतंग। किसी की छत से पेच में कट गई होगी। तुमने उसे बगल में दबा लिया।');
    },
  });
}
