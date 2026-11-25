/**
 * Behaviour tests for the main-story beats (src/storyBeats.js) and the pocket-money stalls, run inside tools/missions-check.mjs
 * (same Node env, no browser). Each test drives the real module with a fake env and real quest state, then asserts what the
 * player would see: dialogue, toasts, pocket money, step unchanged (a beat can never fail or block a mission).
 * Call after tools/missions-node-env.mjs is imported. `res(id, status, msg)` collects PASS / FAIL.
 */
export async function beatBehaviour(res) {
  const THREE = await import('three');
  const { QUEST_STEPS: S, createQuestState } = await import('../src/quest.js');
  const { INTERACTION_POINTS } = await import('../src/interactions.js');
  const SB = await import('../src/storyBeats.js');
  const T = SB.BEAT_TUNING;
  const ok = (id, cond, msg) => res(id, cond ? 'PASS' : 'FAIL', msg);

  const quest = createQuestState();
  const said = [], toasts = [];
  const dialogue = { say: (l, cb) => { said.push(l); cb?.(); }, isOpen: false };
  const audio = { playWeighingScale() {}, playMangoThud() {}, ringBell() {} };
  const freeRoam = { toast: (en) => toasts.push(en), isDiscovered: () => false, discover() {} };
  let player = new THREE.Vector3(0, 0, 0), mounted = null, onCycle = false, trolley = null;
  const postman = new THREE.Group(); postman.position.set(40, 0, 40);
  const added = [];
  const kidsAdded = () => added.filter((o) => o.name && o.name.startsWith('npc_schoolout'));
  const env = {
    scene: { add: (o) => added.push(o) }, quest, dialogue, audio, freeRoam,
    getPlayerPos: () => player, getMounted: () => mounted, isOnCycle: () => onCycle,
    buildNpc: (role, pos, rot, name) => { const root = new THREE.Group(); root.name = name; root.position.set(pos.x, 0, pos.z); return { root, animate() {} }; },
    npcs: { postman }, getTrolley: () => trolley, refreshHud() {},
  };
  const beats = SB.createStoryBeats(env);
  const point = (id) => INTERACTION_POINTS.find((p) => p.id === id);
  const ctx = () => ({ quest, dialogue, audio });
  const avail = (id) => !point(id).available || point(id).available(ctx());
  const run = (sec) => { for (let t = 0; t < sec; t += 0.1) beats.update(0.1); };

  // ---- school-out (M2)
  quest.step = S.HAVE_TIFFIN; run(1);
  ok('beat school-out: quiet before the sister is collected', kidsAdded().length === 0, 'no kids spawn at HAVE_TIFFIN');
  quest.step = S.HAVE_SISTER; mounted = { group: { position: new THREE.Vector3(SB.SCHOOL_GATE.x + 3, 0, SB.SCHOOL_GATE.z) }, speed: 6 };
  run(2);
  ok('beat school-out: kids pour out', kidsAdded().length === T.kids && beats.state.schoolOut === 1, `${kidsAdded().length} kids at the gate`);
  ok('beat school-out: a vehicle near the gate is braked', mounted.speed < 1.5, `speed 6 -> ${mounted.speed.toFixed(2)}`);
  mounted = null; run(25);
  ok('beat school-out: kids walk off then clear, mission untouched', kidsAdded().every((o) => o.visible === false) && quest.step === S.HAVE_SISTER, 'step still HAVE_SISTER (never blocks)');

  // ---- dharam kanta (M3)
  quest.step = S.LOADING_WHEAT; quest.sacksCollected = 3;
  ok('beat kanta: offered while loading wheat', avail('beat_kanta'), 'available at LOADING_WHEAT');
  point('beat_kanta').onInteract(ctx());
  ok('beat kanta: printed slip with the real weight', beats.state.weighed === 3 * T.kantaKgPerSack && JSON.stringify(said.at(-1)).includes('150 kg'), 'slip says 150 kg');
  ok('beat kanta: only once, step unchanged', !avail('beat_kanta') && quest.step === S.LOADING_WHEAT, 'second weigh not offered');
  quest.step = S.NOT_STARTED; quest.sacksCollected = 0;
  ok('beat kanta: not offered outside M3', !avail('beat_kanta'), 'hidden at NOT_STARTED');

  // ---- narrow gate (M3)
  quest.step = S.LOADING_WHEAT; quest.pocket = 0;
  mounted = { group: { position: new THREE.Vector3(0, 0, 0) }, speed: 2 };
  trolley = { group: { position: new THREE.Vector3(SB.YARD_GATE.x, 0, SB.YARD_GATE.z) } };
  run(1);
  ok('beat gate: driving forwards past it earns nothing', !beats.state.gate, 'needs reversing');
  mounted.speed = -1; run(1);
  ok('beat gate: reversing the trolley in is praised and paid', beats.state.gate === 1 && quest.pocket === T.gateBonus, `pocket +${quest.pocket}`);
  ok('beat gate: never fails or moves the mission', quest.step === S.LOADING_WHEAT, 'step unchanged');
  ok('beat gate: tolerance is generous', T.gateTol >= 3, `${T.gateTol} m`);
  ok('beat gate: missing the gate is not punished', SB.gateReversedIn({ x: SB.YARD_GATE.x + 20, z: SB.YARD_GATE.z }, 2) === false && quest.sacksCollected === 0, 'just no tip');

  // ---- bell flag-down (M4)
  quest.step = S.FINDING_POSTMAN; mounted = null; onCycle = true;
  player.set(postman.position.x + 8, 0, postman.position.z);
  ok('beat bell: ringing near the postman on the cycle flags him down', beats.onBell() === true, 'rung within range on the cycle -> postman stops');
  ok('beat bell: postman held', beats.postmanHeld() === true, 'walk loop paused');
  run(T.postmanHoldSeconds + 1);
  ok('beat bell: he walks on again after the wait', beats.postmanHeld() === false, `released after ${T.postmanHoldSeconds}s`);
  player.set(postman.position.x + 60, 0, postman.position.z);
  ok('beat bell: out of range, no effect', beats.onBell() === false, '60 m away');
  player.set(postman.position.x + 5, 0, postman.position.z); quest.step = S.HAVE_LETTER;
  ok('beat bell: only during M4', beats.onBell() === false, 'not at HAVE_LETTER');

  // ---- mango catch (M7)
  quest.step = S.GOING_TO_BAAGH; run(0.2);
  quest.step = S.KNOCKING_MANGOES; quest.mangoesCollected = 2; quest.pocket = 0; player.set(10, 0, 10); run(0.2);
  ok('beat catch: window opens after a knock', avail('beat_mango_catch'), 'Catch the mango! offered');
  point('beat_mango_catch').onInteract(ctx());
  ok('beat catch: caught = bonus', beats.state.catches === 1 && quest.pocket === T.catchBonus, `pocket +${quest.pocket}`);
  ok('beat catch: mangoes still count with no catch', quest.mangoesCollected === 2 && !avail('beat_mango_catch'), 'count unchanged by the catch');
  quest.mangoesCollected = 4; run(0.2); run(T.catchWindow + 1);
  ok('beat catch: missing it costs nothing, window closes', !avail('beat_mango_catch') && quest.pocket === T.catchBonus, `window ${T.catchWindow}s`);

  // ---- rooftop neighbours (M8)
  quest.step = S.GOING_TO_ROOF; run(0.2);
  const { HOUSE_CENTER, HOUSE_ROOF_Y } = await import('../src/village.js');
  player.set(HOUSE_CENTER.x, HOUSE_ROOF_Y + 1.6, HOUSE_CENTER.z);
  ok('beat neighbours: waving offered on the roof', avail('beat_roof_neighbours'), 'available at GOING_TO_ROOF on the roof');
  player.set(HOUSE_CENTER.x, 1.6, HOUSE_CENTER.z);
  ok('beat neighbours: not offered from the ground', !avail('beat_roof_neighbours'), 'ground level hidden');
  player.set(HOUSE_CENTER.x, HOUSE_ROOF_Y + 1.6, HOUSE_CENTER.z);
  point('beat_roof_neighbours').onInteract(ctx());
  ok('beat neighbours: three terraces, three scenes', SB.TERRACES.length === 3 && new Set(SB.TERRACES.map((t) => t.scene)).size === 3 && said.at(-1).length === 3, 'kite, meal, radio lines');
  ok('beat neighbours: roof ending still available', quest.step === S.GOING_TO_ROOF, 'wave never advances the step');
  ok('beat neighbours: terraces stay within wave distance', SB.TERRACES.every((t) => Math.hypot(t.x - HOUSE_CENTER.x, t.z - HOUSE_CENTER.z) < 20), 'all within 20 m of the house');

  // ---- pocket money spent at banta, kulfiwala, chaat thela (docs/MISSIONS_PLAN.md section 2)
  const { registerStalls } = await import('../src/jobs/stalls.js');
  const { registerKulfiJob } = await import('../src/jobs/kulfi.js');
  const q2 = createQuestState(); q2.pocket = 30; q2.jobsDone.kulfi = 1;
  const inter2 = {}, said2 = [];
  const api = {
    quest: q2, scene: { add() {} }, THREE,
    say: (l, cb) => { said2.push(l); cb?.(); },
    modal: ({ buttons }) => { api.lastButtons = buttons; },
    addPocket: (n) => { q2.pocket = Math.max(0, q2.pocket + n); },
    addInteraction: (d) => { inter2[d.id] = d; },
    npc: () => ({ root: new THREE.Group(), animate() {} }), onUpdate() {}, audio: { playCartBell() {} },
    discoverJob: () => false, discoverRandom: () => null, jobDone() {}, freeRoam, closeModal() {},
  };
  const env2 = { waypointLoop: () => () => {}, otherVehicleBoxes: () => [], getPlayerPos: () => ({ x: 0, z: 0 }) };
  registerStalls(api, env2); registerKulfiJob(api, env2);
  const buy = (id, idx) => { inter2[id].onInteract(); const b = api.lastButtons[idx]; let closed = false; b.onClick({ close: () => { closed = true; } }); return closed; };
  for (const [id, label] of [['stall_banta', 'banta shop'], ['stall_chaat', 'chaat thela'], ['job_kulfiwala', 'kulfiwala']]) {
    ok(`pocket spend: ${label} is registered`, !!inter2[id], id);
    q2.pocket = 30; const before = q2.pocket; buy(id, 0);
    ok(`pocket spend: ${label} takes the price from pocket money`, q2.pocket < before && q2.pocket >= 0, `Rs ${before} -> ${q2.pocket}`);
    q2.pocket = 1; buy(id, 0);
    ok(`pocket spend: ${label} is kind when you are short`, q2.pocket === 1 && JSON.stringify(said2.at(-1)).includes('Come back'), 'no debt, friendly line');
  }
  ok('pocket spend: menus are bilingual', api.lastButtons.every((b) => b.en && b.hi), 'English and Hindi on every button');
}
