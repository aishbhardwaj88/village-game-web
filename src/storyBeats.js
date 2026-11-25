import * as THREE from 'three';
import { registerInteraction } from './interactions.js';
import { QUEST_STEPS } from './quest.js';
import { KIRANA_POSITION } from './wheatErrand.js';
import { localPt } from './anchors.js';
import { schoolXZ, SCHOOL_CENTER, houseXZ, HOUSE_CENTER, HOUSE_ROOF_Y } from './village.js';
import { getTiledMaterial } from './materials.js';

/**
 * Main-story beats from docs/MISSIONS_PLAN.md section 1, layered on the existing quest steps. Every beat is OPTIONAL and
 * generous: none can fail a mission or block a step (M3's gate "never fails the mission"), each only adds flavour, a slip,
 * a toast or a few rupees of pocket money. State lives in `quest.beats` (session only, plain numbers/flags).
 *
 *   school-out        M2 HAVE_SISTER   kids pour out of the school gate; a vehicle nearby is braked so the player must stop
 *   dharam kanta      M3 LOADING_WHEAT weigh the load at the weighbridge, a printed slip
 *   narrow gate       M3 LOADING_WHEAT reverse the trolley into the kirana yard (3.5 m tolerance, praise + a few rupees)
 *   bell flag-down    M4 FINDING_POSTMAN ring the cycle bell (B) near the postman and he stops and waits
 *   mango catch       M7 knocking      each knock opens a 2.5 s window to catch a falling mango (bonus)
 *   rooftop neighbours M8 roof         three neighbouring terraces run small scenes; wave to them from the roof
 */

const S = QUEST_STEPS;
export const BEAT_TUNING = {
  schoolOutRadius: 12, schoolOutSeconds: 9, kids: 5,
  bellRange: 16, postmanHoldSeconds: 25,
  gateTol: 3.5, gateBonus: 5,
  kantaKgPerSack: 50,
  catchWindow: 2.5, catchBonus: 2,
};

// ------------------------------------------------------------------ positions (all follow their place on the approved map)
export const KANTA_AT = localPt('yard_dharam_kanta', 0, 9); // the weighbridge's front apron (local +z beyond its 7 m footprint edge)
export const SCHOOL_GATE = schoolXZ(SCHOOL_CENTER.x, SCHOOL_CENTER.z - 17);
export const YARD_GATE = { x: KIRANA_POSITION.x, z: KIRANA_POSITION.z + 9 }; // where the trolley is reversed in, behind the kirana
const roofAt = (dx, dz) => houseXZ(HOUSE_CENTER.x + dx, HOUSE_CENTER.z + dz);
export const TERRACES = [
  { id: 'kite', ...roofAt(-13, -4), scene: 'kite' },
  { id: 'meal', ...roofAt(13, -4), scene: 'meal' },
  { id: 'radio', ...roofAt(0, -14), scene: 'radio' },
];

// ------------------------------------------------------------------ pure rules (also run by tools/missions-check.mjs)
export const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const weighSlip = (sacks) => {
  const kg = Math.max(0, sacks) * BEAT_TUNING.kantaKgPerSack;
  return { kg, slipNo: 100 + (kg % 90) + 7, en: `Dharam Kanta slip: ${kg} kg`, hi: `धर्म काँटा पर्ची: ${kg} किलो` };
};
export const canFlagDown = (step, onCycle, playerPos, postmanPos) => step === S.FINDING_POSTMAN && !!onCycle && dist2(playerPos, postmanPos) <= BEAT_TUNING.bellRange;
export const gateReversedIn = (trolleyPos, reverseSeconds) => reverseSeconds > 0 && dist2(trolleyPos, YARD_GATE) <= BEAT_TUNING.gateTol;
export const catchOpen = (now, openedAt) => openedAt != null && now - openedAt <= BEAT_TUNING.catchWindow;
export const schoolOutBrake = (active, vehiclePos) => active && dist2(vehiclePos, SCHOOL_GATE) <= BEAT_TUNING.schoolOutRadius;

/** Every point the beats use, in the shape tools/missions-check.mjs collects. */
export function beatPoints() {
  return [
    { id: 'beat kanta (weigh)', group: 'M3', kind: 'interact', owner: 'yard_dharam_kanta', r: 2.5, mode: 'tractor', norigid: true, pts: [KANTA_AT] },
    { id: 'beat narrow gate (kirana yard)', group: 'M3', kind: 'waypoint', r: BEAT_TUNING.gateTol, mode: 'tractor', pts: [YARD_GATE] },
    { id: 'beat school-out (gate)', group: 'M2', kind: 'start', pts: [SCHOOL_GATE] },
  ];
}

export function createStoryBeats(env) {
  const { scene, quest, dialogue, audio, freeRoam } = env;
  const Bf = () => (quest.beats = quest.beats || {}); // read fresh each time: a new game replaces quest.beats
  let prevStep = quest.step, prevMangoes = quest.mangoesCollected ?? 0;
  let schoolT = -1, kids = [], reverseT = 0, postmanHold = 0, catchAt = null, now = 0;
  const player = () => env.getPlayerPos();
  const toast = (en, hi) => freeRoam?.toast?.(en, hi, 3600);
  const addPocket = (n) => { quest.pocket = (quest.pocket || 0) + n; env.refreshHud?.(); };

  // ---------------------------------------------------------------- 1. school-out (M2)
  function startSchoolOut() {
    if (Bf().schoolOut) return;
    Bf().schoolOut = 1; schoolT = 0;
    const roles = ['kid_a', 'kid_b', 'kid_c', 'kid_d', 'kid_a'];
    for (let i = 0; i < BEAT_TUNING.kids; i++) {
      const built = env.buildNpc(roles[i % roles.length], { x: SCHOOL_GATE.x, z: SCHOOL_GATE.z }, 0, `npc_schoolout_${i}`);
      scene.add(built.root);
      const ang = (i / BEAT_TUNING.kids) * Math.PI - Math.PI / 2 + 0.3; // fan out away from the gate
      kids.push({ built, tx: SCHOOL_GATE.x + Math.sin(ang) * 11 + 3, tz: SCHOOL_GATE.z - 4 - Math.cos(ang) * 9, delay: i * 0.5 });
    }
    toast('School is out!', 'छुट्टी हो गई!');
  }
  function updateSchoolOut(dt) {
    if (schoolT < 0) return;
    schoolT += dt;
    for (const k of kids) {
      const r = k.built.root, t = Math.max(0, schoolT - k.delay);
      if (t > 0 && t < BEAT_TUNING.schoolOutSeconds) {
        const dx = k.tx - r.position.x, dz = k.tz - r.position.z, d = Math.hypot(dx, dz);
        if (d > 0.2) { r.position.x += (dx / d) * Math.min(d, 1.7 * dt); r.position.z += (dz / d) * Math.min(d, 1.7 * dt); r.rotation.y = Math.atan2(dx, dz); }
        k.built.animate?.(dt, d > 0.2);
      } else k.built.animate?.(dt, false);
    }
    const v = env.getMounted?.();
    if (v && schoolOutBrake(schoolT < BEAT_TUNING.schoolOutSeconds + 2, v.group.position)) {
      v.speed = (v.speed || 0) * Math.max(0, 1 - 3 * dt); // the kids make you stop
      if (!Bf().schoolOutBraked) { Bf().schoolOutBraked = 1; toast('Kids crossing! Slow down.', 'बच्चे सड़क पार कर रहे हैं! धीरे।'); }
    }
    if (schoolT > BEAT_TUNING.schoolOutSeconds + 8) { for (const k of kids) k.built.root.visible = false; kids = []; schoolT = -1; }
  }

  // ---------------------------------------------------------------- 2. dharam kanta (M3)
  registerInteraction({
    id: 'beat_kanta', position: new THREE.Vector3(KANTA_AT.x, 0, KANTA_AT.z), radius: 5, priority: 2,
    label: { hi: 'काँटे पर तौलें', en: 'Weigh the load at the kanta' },
    available: (ctx) => ctx.quest.step === S.LOADING_WHEAT && !Bf().weighed,
    onInteract: (ctx) => {
      const slip = weighSlip(Math.max(1, ctx.quest.sacksCollected || 1));
      audio.playWeighingScale?.();
      Bf().weighed = slip.kg;
      ctx.dialogue.say([
        { hi: 'मुंशी: "गाड़ी काँटे पर चढ़ाओ… रुको… बस!"', en: 'Munshi: "Roll her onto the kanta... hold... that is it!"' },
        { hi: `पर्ची छप गई: ${slip.kg} किलो, नंबर ${slip.slipNo}।`, en: `The slip prints: ${slip.kg} kg, No. ${slip.slipNo}. Honest weight, honest price.` },
      ]);
    },
  });

  // ---------------------------------------------------------------- 3. narrow gate (M3): reverse the trolley in, never fails
  function updateGate(dt) {
    if (quest.step !== S.LOADING_WHEAT || Bf().gate) return;
    const tr = env.getTrolley?.(), v = env.getMounted?.();
    if (!tr || !v) return;
    if ((v.speed || 0) < -0.3) reverseT = 2; else reverseT = Math.max(0, reverseT - dt);
    if (gateReversedIn(tr.group.position, reverseT)) {
      Bf().gate = 1; addPocket(BEAT_TUNING.gateBonus);
      toast(`Reversed in! Shopkeeper tips Rs ${BEAT_TUNING.gateBonus}`, `वाह! दुकानदार ने ₹${BEAT_TUNING.gateBonus} इनाम दिए`);
      dialogue.say([{ hi: 'दुकानदार: "वाह बेटा, इतने तंग फाटक से सीधी ट्रॉली!"', en: 'Shopkeeper: "Wah beta, straight through that narrow gate!"' }]);
    }
  }

  // ---------------------------------------------------------------- 4. bell flag-down (M4)
  function onBell() {
    const pm = env.npcs?.postman;
    if (!pm || !env.isOnCycle?.() || !canFlagDown(quest.step, true, player(), pm.position)) return false;
    postmanHold = BEAT_TUNING.postmanHoldSeconds; Bf().flagged = (Bf().flagged || 0) + 1;
    pm.rotation.y = Math.atan2(player().x - pm.position.x, player().z - pm.position.z);
    toast('The postman stops and waits', 'डाकिया रुककर इंतज़ार कर रहा है');
    return true;
  }
  const postmanHeld = () => postmanHold > 0;

  // ---------------------------------------------------------------- 5. mango catch (M7)
  const catchPos = new THREE.Vector3();
  registerInteraction({
    id: 'beat_mango_catch', position: catchPos, radius: 4, priority: 5,
    label: { hi: 'आम लपको!', en: 'Catch the mango!' },
    available: () => catchOpen(now, catchAt),
    onInteract: () => {
      catchAt = null; Bf().catches = (Bf().catches || 0) + 1; addPocket(BEAT_TUNING.catchBonus);
      audio.playMangoThud?.();
      toast(`Caught! +Rs ${BEAT_TUNING.catchBonus}`, `लपक लिया! +₹${BEAT_TUNING.catchBonus}`);
    },
  });

  // ---------------------------------------------------------------- 6. rooftop neighbours (M8): stand-ins on three terraces
  const terraceGroup = new THREE.Group(); terraceGroup.visible = false; scene.add(terraceGroup);
  const anim = [];
  { const slabMat = getTiledMaterial('concrete', { repeatX: 2, repeatY: 2, tint: '#d7d2c5' });
    const roles = { kite: ['kid_b', 'kid_c'], meal: ['villager_aunty', 'kid_d'], radio: ['shopkeeper'] };
    for (const t of TERRACES) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 4), slabMat); slab.position.set(t.x, HOUSE_ROOF_Y - 0.15, t.z); terraceGroup.add(slab);
      roles[t.scene].forEach((role, i) => {
        const built = env.buildNpc(role, { x: t.x + (i ? 1.1 : -0.6), z: t.z }, i ? -Math.PI / 2 : Math.PI / 2, `npc_terrace_${t.id}_${i}`);
        built.root.position.y = HOUSE_ROOF_Y; terraceGroup.add(built.root); anim.push({ built, t });
      });
      if (t.scene === 'kite') { const kite = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), getTiledMaterial('plaster', { tint: '#d9382b' })); kite.rotation.set(0, 0, Math.PI / 4); kite.position.set(t.x, HOUSE_ROOF_Y + 3, t.z - 1); kite.name = 'terrace_kite'; terraceGroup.add(kite); anim.push({ kite, base: HOUSE_ROOF_Y + 3 }); }
      if (t.scene === 'meal') { const thali = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 16), getTiledMaterial('metal', {})); thali.position.set(t.x + 0.25, HOUSE_ROOF_Y + 0.5, t.z); terraceGroup.add(thali); }
      if (t.scene === 'radio') { const radio = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.15), getTiledMaterial('wood', {})); radio.position.set(t.x + 0.4, HOUSE_ROOF_Y + 0.6, t.z); terraceGroup.add(radio); }
    }
  }
  registerInteraction({
    id: 'beat_roof_neighbours', position: new THREE.Vector3(HOUSE_CENTER.x, 0, HOUSE_CENTER.z), radius: 11, priority: 0,
    label: { hi: 'पड़ोसियों को हाथ हिलाएं', en: 'Wave to the neighbours' },
    available: (ctx) => ctx.quest.step === S.GOING_TO_ROOF && !Bf().waved && (player().y ?? 0) > HOUSE_ROOF_Y - 1.2,
    onInteract: (ctx) => {
      Bf().waved = 1;
      audio.ringBell?.();
      ctx.dialogue.say([
        { hi: 'पड़ोस की छत से बच्चे: "पतंग कट गई! अरे, आज दादाजी का जन्मदिन है न?"', en: 'Kids on the next terrace: "Our kite got cut! Oh, is it Dadaji\'s birthday today?"' },
        { hi: 'दूसरी छत से चाची: "खाना खाकर आना, सबके लिए है!"', en: 'Aunty on the other terrace: "Come and eat after, there is enough for everyone!"' },
        { hi: 'रेडियो पर पुराना गाना बज रहा है। पूरा मोहल्ला जश्न में है।', en: 'An old song plays on the radio. The whole neighbourhood is celebrating.' },
      ]);
    },
  });

  function update(dt) {
    now += dt;
    const step = quest.step;
    if (step !== prevStep) {
      if (step === S.HAVE_SISTER) startSchoolOut();
      terraceGroup.visible = [S.ERRAND7_COMPLETE, S.GOING_TO_ROOF, S.ALL_COMPLETE, S.FREE_ROAM].includes(step);
      prevStep = step;
    }
    const mg = quest.mangoesCollected ?? 0;
    if (mg > prevMangoes && [S.KNOCKING_MANGOES, S.MANGOES_LOADED].includes(step)) { catchAt = now; const p = player(); catchPos.set(p.x, 0, p.z); }
    prevMangoes = mg;
    updateSchoolOut(dt); updateGate(dt);
    if (postmanHold > 0) postmanHold -= dt;
    if (terraceGroup.visible) for (const a of anim) { if (a.kite) a.kite.position.y = a.base + Math.sin(now * 1.6) * 0.25; else a.built.animate?.(dt, false); }
  }
  return { update, onBell, postmanHeld, get state() { return Bf(); }, TERRACES };
}
