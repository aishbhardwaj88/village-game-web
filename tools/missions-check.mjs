#!/usr/bin/env node
/**
 * MISSIONS CHECK (S7 sprint, missions agent). Does every job, mission, errand, minigame and talking NPC still work on the
 * approved map (?layout=new)?
 *
 * How: the game's own modules are imported in Node (tools/missions-node-env.mjs), once per layout, and every point the
 * missions use is collected (NPC spots, interaction points, job waypoints, drop points, NPC walking routes, job props,
 * vehicle spawns). The points are then tested against the approved map: house, shop and place footprints, trees, ponds,
 * the canal and the roads, plus a walk / cycle / tractor reachability grid flooded from the player's start.
 *
 * Tests per point (each prints PASS / FAIL / WARN):
 *   clear     an NPC or prop does not stand inside a building (other than its own place), a tree trunk or water
 *   road      an NPC does not stand on a road, lane or highway carriageway (a gali or farm track is a WARN only)
 *   face      an NPC with a facing does not face a wall closer than 1 m
 *   rigid     a point that belongs to a place (counter, courtyard, shop front) moved and turned exactly with that place
 *   reach     the player can get within the interaction radius on foot / on the cycle / with the tractor and trolley
 *   route     an NPC walking route never passes through a building or water
 *   near      a re-pointed job is near the place its story names
 * Under ?layout=old it only prints how many points it collected (the old layout is not judged; nothing there changes).
 *
 * Usage: node tools/missions-check.mjs [--verbose] [--json out.json]
 * Exit 1 when any FAIL remains.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const SELF = fileURLToPath(import.meta.url);
const argv = process.argv.slice(2);
const COLLECT = argv.includes('--collect') ? argv[argv.indexOf('--collect') + 1] : null;

const DIRECT = process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)) === SELF;
if (DIRECT && COLLECT) await collect(COLLECT);
else if (DIRECT) await main();

/** The approved map as a test world (for probes in tmp/): solidAt, roadAt, reachDist, boxHit ... */
export async function loadWorld() {
  globalThis.__DOPAHAR_LAYOUT = 'new';
  await import('./missions-node-env.mjs');
  const L = await import('../src/layout/layout.js');
  const core = await import('../src/layout/layoutCore.js');
  const { EXISTING_FOOTPRINTS } = await import('../src/layout/footprints.js');
  const { ANCHORS } = await import('../src/anchors.js');
  return { W: buildWorld(L, core, EXISTING_FOOTPRINTS, ANCHORS), L, core, ANCHORS };
}

// =====================================================================================================================
// COLLECTOR: runs inside a child process with the layout fixed for the whole module graph
// =====================================================================================================================
async function collect(mode) {
  globalThis.__DOPAHAR_LAYOUT = mode;
  await import('./missions-node-env.mjs');
  const quiet = console.log; console.log = () => {}; console.info = () => {}; console.warn = () => {};
  const THREE = await import('three');
  const anchors = await import('../src/anchors.js');
  const { pt, localPt, ANCHORS, OLD_SHIFT } = anchors;
  const village = await import('../src/village.js');
  const { houseXZ, schoolXZ, halwaiXZ, HOUSE_CENTER, SCHOOL_CENTER, HALWAI_CENTER, HOUSE_STAIRS, HALWAI_YAW } = village;
  const inter = await import('../src/interactions.js');
  const wheat = await import('../src/wheatErrand.js');
  const bazaar = await import('../src/bazaar.js');
  const baagh = await import('../src/baagh.js');
  const quest = await import('../src/quest.js');
  const routines = await import('../src/npcRoutines.js');
  let ML = null;
  try { ML = await import('../src/missionsLayout.js'); } catch (e) { ML = null; }
  const sp = (name, old) => (ML ? ML.spot(name, old) : old);

  const out = [];
  const add = (e) => out.push({ ...e, pts: e.pts.map((p) => ({ x: +(+p.x).toFixed(3), z: +(+p.z).toFixed(3) })) });
  const P = (p) => ({ x: p.x, z: p.z });

  // ---------------------------------------------------------------- main story (mirrors src/main.js; line refs as of 21 Nov)
  const houseAt = (dx, dz) => houseXZ(HOUSE_CENTER.x + dx, HOUSE_CENTER.z + dz);
  const schoolPt = (dx, dz) => schoolXZ(SCHOOL_CENTER.x + dx, SCHOOL_CENTER.z + dz);
  const OPENING_SPAWN = sp('opening_spawn', { x: 4 + OLD_SHIFT.x, z: 27 });
  add({ id: 'player_start', group: 'story', kind: 'start', pts: [OPENING_SPAWN] });
  add({ id: 'M1 maa', group: 'M1', kind: 'npc', owner: 'house', yaw: sp('house_yaw', 0), r: 2.5, pts: [inter.MAA_POSITION] });
  add({ id: 'M1 maa walk', group: 'M1', kind: 'route', owner: 'house', pts: [inter.MAA_POSITION, sp('maa_walk_b', houseAt(-3, 5))] });
  add({ id: 'M1 halwai', group: 'M1', kind: 'npc', owner: 'halwai', yaw: Math.PI / 2 + HALWAI_YAW, r: 2.2, pts: [inter.HALWAI_NPC_POSITION] });
  const DADA = sp('dada', { x: inter.MAA_POSITION.x + 3, z: inter.MAA_POSITION.z });
  add({ id: 'M8 dada (courtyard)', group: 'M8', kind: 'npc', owner: 'house', yaw: sp('house_yaw', -Math.PI / 2), pts: [DADA] });
  add({ id: 'M3 pitaji', group: 'M3', kind: 'npc', owner: 'house', yaw: sp('house_yaw', Math.PI), r: 2.5, pts: [wheat.PITAJI_POSITION] });
  add({ id: 'M3 sack pile', group: 'M3', kind: 'interact', owner: 'house', r: 2, mode: 'tractor', pts: [wheat.SACK_PILE_POSITION] });
  add({ id: 'M3 kirana (sack drop)', group: 'M3', kind: 'interact', owner: 'bazaar', r: 2.5, mode: 'cycle', pts: [wheat.KIRANA_POSITION] });
  const STORE_POS = pt('store');
  const STORE_ROT = Math.PI + ANCHORS.store.ry;
  const fw = (pos, rot, lx, lz) => ({ x: pos.x + lx * Math.cos(rot) + lz * Math.sin(rot), z: pos.z - lx * Math.sin(rot) + lz * Math.cos(rot) });
  add({ id: 'M3 general store buy', group: 'M3', kind: 'interact', owner: 'store', r: 2.2, mode: 'cycle', pts: [fw(STORE_POS, STORE_ROT, 1.4, 2.5)] });
  const TEA = pt('teastall'), TEA_ROT = Math.PI + ANCHORS.teastall.ry;
  add({ id: 'tea stall buy', group: 'shops', kind: 'interact', owner: 'teastall', r: 2.2, pts: [fw(TEA, TEA_ROT, 0, 2.5)] });
  add({ id: 'post office buy', group: 'shops', kind: 'interact', owner: 'post', r: 2.2, pts: [localPt('post', 0, 3.0)] });
  add({ id: 'ration shop buy', group: 'shops', kind: 'interact', owner: 'ration', r: 2.2, pts: [localPt('ration', 0, 3.0)] });
  add({ id: 'postmaster', group: 'shops', kind: 'npc', owner: 'post', yaw: ANCHORS.post.ry + Math.PI, inside: true, pts: [localPt('post', 0, 0.2)] });
  add({ id: 'miller', group: 'shops', kind: 'npc', owner: 'chakki', yaw: ANCHORS.chakki.ry + Math.PI, inside: true, pts: [localPt('chakki', 0.6, 0.4)] });
  // the pump attendant: main.js puts him by the old highway strip; under new src/layout/layout-wiring-entry.js moves him to
  // the moved petrol pump yard, local (6, 9), facing ry - 90 deg (mirrored here)
  const PUMP_ATT = mode === 'new' ? localPt('yard_petrol', 6, 9) : { x: 189.4 + OLD_SHIFT.x, z: 6.4 };
  add({ id: 'petrol pump attendant', group: 'ambient', kind: 'npc', owner: mode === 'new' ? 'yard_petrol' : undefined, inside: mode === 'new' || undefined, norigid: true, near: { place: 'yard_petrol', max: 25 }, yaw: mode === 'new' ? ANCHORS.yard_petrol.ry - Math.PI / 2 : Math.PI / 2, pts: [PUMP_ATT] });
  // the bazaar counters (darzi = M5, kirana = M3 above, sabzi / bangle / the rest = shop buys)
  bazaar.BAZAAR_UNITS.forEach((u, idx) => {
    if (u.trade === 'kirana') return;
    const at = bazaar.bazaarXZ(bazaar.bazaarUnitCx(idx), bazaar.BAZAAR_FRONT_Z - 1.5);
    add({ id: u.trade === 'tailor' ? 'M5 darzi (kurta)' : `bazaar ${u.trade} counter`, group: u.trade === 'tailor' ? 'M5' : 'shops', kind: 'interact', owner: 'bazaar', r: 2.2, mode: u.trade === 'tailor' ? 'cycle' : 'foot', pts: [at] });
  });
  // M2
  add({ id: 'M2 teacher', group: 'M2', kind: 'npc', owner: 'school', yaw: Math.PI, r: 2.2, pts: [inter.TEACHER_POSITION] });
  add({ id: 'M2 school bell', group: 'M2', kind: 'interact', owner: 'school', r: 2.2, pts: [inter.BELL_POSITION] });
  add({ id: 'M2 sister at school', group: 'M2', kind: 'npc', owner: 'school', yaw: 0, pts: [inter.SISTER_SCHOOL_POSITION] });
  // the child's school run (main.js childWalk)
  const AW = ANCHORS.anganwadi;
  const childOld = [
    houseAt(0, 9), { x: HOUSE_CENTER.x - 20, z: 55.3 }, { x: HOUSE_CENTER.x - 40, z: 55.3 }, { x: HOUSE_CENTER.x - 46.6, z: 68.5 },
    { x: HOUSE_CENTER.x - 50.9, z: 77 }, { x: HOUSE_CENTER.x - 52, z: SCHOOL_CENTER.z - 18 }, { x: AW.x + 6.1, z: AW.z - 9.7 },
    { x: AW.x - 1.9, z: AW.z - 8.7 }, { x: AW.x - 7.4, z: AW.z - 6.5 }, { x: AW.x - 11.9, z: AW.z - 5.6 }, schoolPt(0, -18), schoolPt(0, -14), schoolPt(0, -10),
  ];
  add({ id: 'child school run', group: 'M2', kind: 'route', through: ['school'], pts: sp('child_walk', childOld) }); // the last legs go in through the school's own yard gate (school untouched)
  // M4 postman
  const postmanRoute = sp('postman_walk', [houseAt(0, 9), houseAt(-6, 13)]);
  add({ id: 'M4 postman round', group: 'M4', kind: 'route', mode: 'cycle', pts: postmanRoute });
  add({ id: 'M4 postman (stops)', group: 'M4', kind: 'npc', r: 2.4, mode: 'cycle', pts: postmanRoute });
  // M6 monkey
  const U = bazaar.BAZAAR_UNITS, cx = bazaar.bazaarUnitCx;
  add({ id: 'M6 monkey snatch spot', group: 'M6', kind: 'npc', owner: 'bazaar', pts: [bazaar.bazaarXZ(cx(3), bazaar.BAZAAR_FRONT_Z - 1.5)] });
  add({ id: 'M6 monkey ground legs', group: 'M6', kind: 'route', owner: 'bazaar', pts: [bazaar.bazaarXZ(cx(3), bazaar.BAZAAR_FRONT_Z - 3), bazaar.bazaarXZ(cx(6), bazaar.BAZAAR_FRONT_Z - 6), bazaar.bazaarXZ(bazaar.BAZAAR_EAST_X + 3, bazaar.BAZAAR_FRONT_Z - 6)] });
  add({ id: 'M6 monkey recovery (end)', group: 'M6', kind: 'waypoint', owner: 'bazaar', r: 2.0, mode: 'foot', pts: [bazaar.bazaarXZ(bazaar.BAZAAR_EAST_X + 3, bazaar.BAZAAR_FRONT_Z - 6)] });
  // M7 baagh
  add({ id: 'M7 baagh (drive here)', group: 'M7', kind: 'waypoint', r: 8, mode: 'tractor', near: { label: 'mango baagh', ...(ML && ML.mangoBaaghArea ? ML.mangoBaaghArea() : {}), max: 30 }, pts: [baagh.BAAGH_POSITION] });
  baagh.MANGO_KNOCK_POSITIONS.forEach((p, i) => add({ id: `M7 mango knock ${i + 1}`, group: 'M7', kind: 'interact', r: 2.2, mode: 'foot', pts: [p] }));
  // M8 roof
  { const rp = houseXZ(HOUSE_STAIRS.x, (HOUSE_STAIRS.zStart + HOUSE_STAIRS.zEnd) / 2); add({ id: 'M8 roof stairs', group: 'M8', kind: 'interact', owner: 'house', inside: true, r: 3, pts: [rp] }); }
  // vehicles (src/vehicles.js spawnVehicles)
  const VS = ML && ML.vehicleSpawns ? ML.vehicleSpawns() : { bike: { x: -48, z: 28, yaw: 0 }, tractor: { x: -45, z: 26, yaw: Math.PI }, cart: { x: -36, z: 50, yaw: Math.PI * 0.5 } };
  // boxes: tractor (3.5 m) + trolley behind it (local +z) = 9.2 m, centred 2.3 m back; cart 3 m bed + the bullocks ahead (local -z)
  const along = (v, d) => ({ x: v.x + Math.sin(v.yaw) * d, z: v.z + Math.cos(v.yaw) * d });
  add({ id: 'tractor + trolley spawn', group: 'M3/M7', kind: 'vehicle', box: [1.1, 4.6], yaw: VS.tractor.yaw, mode: 'tractor', near: { place: 'house', max: 60 }, pts: [along(VS.tractor, 2.3)] });
  add({ id: 'bullock cart spawn', group: 'jobs', kind: 'vehicle', box: [1.3, 3.0], yaw: VS.cart.yaw, mode: 'tractor', near: { place: 'house', max: 60 }, pts: [along(VS.cart, -1.5)] });
  add({ id: 'spare cycle spawn', group: 'jobs', kind: 'vehicle', box: [0.4, 1.0], yaw: VS.bike.yaw, mode: 'cycle', near: { place: 'house', max: 60 }, pts: [VS.bike] });

  // ---------------------------------------------------------------- static interactions (interactions.js + Extra + Village)
  const fakeCtx = { dialogue: { say() {} }, audio: {} };
  const fakeScene = { add() {}, remove() {} };
  try { (await import('../src/interactionsExtra.js')).createInteractionsExtra(fakeScene, fakeCtx); } catch (e) { out.push({ id: 'ERR interactionsExtra', error: e.message }); }
  try { (await import('../src/interactionsVillage.js')).createInteractionsVillage(fakeScene, fakeCtx); } catch (e) { out.push({ id: 'ERR interactionsVillage', error: e.message }); }
  for (const [file, fn, args] of [['nostalgiaDiscoveries', 'createNostalgiaDiscoveries', []], ['wallStories', 'createWallStories', []], ['oddityDiscoveries', 'createOddityDiscoveries', []], ['villageFurniture3', 'createVillageFurniture3', [fakeScene]], ['roadEvents', 'createRoadEvents', [fakeScene]]]) {
    try { (await import(`../src/${file}.js`))[fn](...args); } catch (e) { out.push({ id: `ERR ${file}`, error: e.message }); }
  }
  const OWN = { maa: 'house', halwai: 'halwai', school_bell: 'school', teacher: 'school', charpai: 'halwai', house_charpai: 'house', hand_pump: 'house', tulsi: 'house', blackboard: 'school', school_bench: 'school', pitaji: 'house', sack_pile: 'house', kirana: 'bazaar', kulhad_chai: 'teastall', chaupal_radio: 'yard_chaupal', feed_gaushala_cow: 'gaushala', kite_pickup: 'maidan', temple_bell: 'temple', jhoola_swing: '*' };
  const seen = new Set(out.map((e) => e.id));
  for (const ip of inter.INTERACTION_POINTS) {
    if (!ip.position || (ip.position.x === 0 && ip.position.z === 0)) continue; // live-linked (postman, monkey)
    let owner = OWN[ip.id];
    if (!owner && /^find_|^panchayat_notices$/.test(ip.id)) owner = 'byContainment'; // a find belongs to the place it stands in
    const id = `interaction ${ip.id}`;
    if (seen.has(id)) continue;
    add({ id, group: 'interactions', kind: 'interact', owner: owner === '*' ? undefined : owner, inside: ['house_charpai', 'blackboard', 'school_bench', 'charpai', 'hand_pump', 'tulsi'].includes(ip.id) || undefined, r: ip.radius || 2.2, pts: [P(ip.position)], faith: ip.id === 'temple_bell' || undefined });
  }

  // ---------------------------------------------------------------- side jobs: run the real registration with a recording env
  const npcs = [], props = [], loops = [];
  const mkGroup = (p, name) => { const g = new THREE.Group(); g.name = name || ''; if (p) g.position.set(p.x, 0, p.z); return g; };
  const groups = { maa: mkGroup(inter.MAA_POSITION, 'npc_maa'), dadi: mkGroup(null, 'npc_dadi'), postman: mkGroup(null, 'npc_postman'), halwai: mkGroup(null), pitaji: mkGroup(null), teacher: mkGroup(null), child: mkGroup(null), sister: mkGroup(null) };
  const vehicles = Object.entries(VS).map(([kind, v]) => ({ preset: { kind: kind === 'bike' ? 'bike' : kind }, group: mkGroup(v, kind) }));
  const env = {
    scene: { add: (...objs) => objs.forEach((o) => props.push({ name: o.name, x: o.position.x, z: o.position.z })), remove() {} },
    quest: Object.assign(quest.createQuestState(), { step: quest.QUEST_STEPS.FREE_ROAM }),
    dialogue: { say() {} }, audio: {}, freeRoam: { isDiscovered: () => false, discover() {}, toast() {} },
    getPlayerPos: () => ({ x: 0, z: 0 }), playerGroup: new THREE.Group(),
    buildNpc: (role, pos, rot, name) => { const g = mkGroup(pos, name); g.rotation.y = rot || 0; npcs.push({ role, name, x: pos.x, z: pos.z, yaw: rot || 0, g }); return { root: g, animate() {} }; },
    setFrozen() {}, refreshHud() {}, save() {}, vehicles, sackCarrier: {}, hooks: {}, setMaaFollowing() {}, npcs: groups,
    getMounted: () => null, otherVehicleBoxes: () => [], setJobWaypoint() {}, rebuildColliders() {}, getTrolley: () => null,
    waypointLoop: (g, pts) => { loops.push({ name: g.name, pts: pts.map(P) }); return () => {}; },
    followRoutine: () => () => {},
  };
  const before = inter.INTERACTION_POINTS.length;
  try { (await import('../src/sideJobs.js')).createSideJobs(env); } catch (e) { out.push({ id: 'ERR sideJobs', error: e.stack }); }
  const jobInteractions = inter.INTERACTION_POINTS.slice(before);
  const jobs = await import('../src/jobs/data.js');
  const JP = await import('../src/jobs/points.js').catch(() => null); // the jobs' internal waypoints (added by the missions agent)
  const jobOf = (s) => { const m = /(pump|ration|kulfi|kanche|gilli|milk|chakki|gate|patang|mango|stall_banta|stall_chaat|dadi|postman|peepal)/.exec(s || ''); return m ? m[1] : 'jobs'; };
  for (const ip of jobInteractions) {
    if (!ip.position || (ip.position.x === 0 && ip.position.z === 0)) continue;
    const g = jobOf(ip.id);
    const jOwn = { job_ration_shop: 'ration', job_chakki_counter: 'chakki', stall_banta: 'banta' }[ip.id];
    add({ id: `job ${ip.id}`, group: `job:${g}`, kind: 'interact', owner: jOwn, inside: jOwn ? true : undefined, r: ip.radius || 2.2, mode: ['milk', 'kulfi'].includes(g) ? 'cycle' : 'foot', pts: [P(ip.position)] });
  }
  add({ id: 'job dadi (free roam)', group: 'job:dadi', kind: 'npc', near: { place: 'house', max: 30 }, yaw: groups.dadi.rotation.y, pts: [P(groups.dadi.position)] });
  for (const n of npcs) {
    if (n.g.visible === false && !/milk_aunty/.test(n.name)) { /* hidden until a job starts: still checked where it will stand */ }
    if (/milk_aunty/.test(n.name)) continue; // placed per stop (below)
    add({ id: `job npc ${n.name}`, group: `job:${jobOf(n.name.replace('npc_', ''))}`, kind: 'npc', walker: /kulfiwala/.test(n.name) || undefined, yaw: n.g.rotation.y, owner: /ration_keeper|chakki_keeper/.test(n.name) ? (n.name.includes('ration') ? 'ration' : 'chakki') : /banta_seller/.test(n.name) ? 'banta' : undefined, inside: /ration_keeper|chakki_keeper/.test(n.name) || undefined, pts: [P(n.g.position)] });
  }
  for (const p of props) if (!/^npc_|^job_kite$/.test(p.name || '')) // (the kite is hidden at the origin until it flies) add({ id: `job prop ${p.name || '?'}`, group: 'job:props', kind: 'prop', owner: /banta/.test(p.name || '') ? 'banta' : undefined, inside: /banta/.test(p.name || '') || undefined, pts: [p] });
  // the M7 baagh's own six trees (main.js zone 'trees_baagh'): each trunk must stand on open ground
  baagh.MANGO_TREE_PLACEMENTS.forEach((t, i) => add({ id: `M7 baagh tree ${i + 1}`, group: 'M7', kind: 'prop', pts: [t] }));
  for (const l of loops) add({ id: `job route ${l.name}`, group: `job:${jobOf(l.name)}`, kind: 'route', mode: 'cycle', pts: l.pts });
  for (const [id, j] of Object.entries(jobs.JOBS)) add({ id: `notebook marker ${id}`, group: `job:${id}`, kind: 'marker', pts: [{ x: j.x, z: j.z }] });
  if (JP && JP.jobPoints) for (const e of JP.jobPoints()) add(e);
  { const SB = await import('../src/storyBeats.js'); for (const e of SB.beatPoints()) add(e); } // main-story beats (kanta, kirana yard gate, school gate)
  // whole job grounds, not just their centres: the khet gate (walls 17.2 m along x, the yard 9.2 m north, a 14 m run-up south)
  // and the kanche ring + stapu grid (x -1.2..+4.2, z -1.2..+2.6 round its centre)
  { const G = (await import('../src/jobs/gate.js')).GATE || { x: 30, z: 40 }; // (older code did not export it) add({ id: 'job gate: walls, yard and run-up', group: 'job:gate', kind: 'vehicle', box: [8.9, 12.2], yaw: 0, pts: [{ x: G.x, z: G.z + 1.8 }] });
    add({ id: 'job gate: run-up (tractor)', group: 'job:gate', kind: 'waypoint', r: 4, mode: 'tractor', pts: [{ x: G.x, z: G.z + 6 }] }); }
  { const K = (await import('../src/jobs/kanche.js')).CENTRE || { x: -46, z: 12 }; add({ id: 'job kanche ground', group: 'job:kanche', kind: 'vehicle', box: [2.9, 2.0], yaw: Math.PI / 2, pts: [{ x: K.x + 1.5, z: K.z + 0.7 }] }); }

  // milk round stops (new layout: the five new-map houses nearest the doodhwala, exactly as src/jobs/milk.js picks them)
  if (mode === 'new') {
    try {
      const H = await import('../src/kit/houses.js');
      const HK = await import('../src/kit/housesKit.js');
      const HP = await import('../src/kit/housesPlan.js');
      const { plan } = await H.loadPlannedHouses();
      const drop = new Set();
      for (let i = 0; i < plan.length; i++) for (let j = i + 1; j < plan.length; j++) {
        if (drop.has(i) || Math.abs(plan[i].x - plan[j].x) > 12 || Math.abs(plan[i].z - plan[j].z) > 12) continue;
        if (HP.ringsOverlap(plan[i].corners, plan[j].corners, 0.1)) drop.add(j);
      }
      const cache = new Map();
      for (const e of H.assignHouses(plan).filter((e) => !drop.has(e.i))) {
        const k = `${e.design}|${e.cw}|${e.cd}|${e.mirror}`;
        if (!cache.has(k)) cache.set(k, HK.buildHouse(e.design, e.cw, e.cd, e.mirror).info);
        const info = cache.get(k), c = Math.cos(e.ry), s = Math.sin(e.ry);
        const dx = (info.door.x0 + info.door.x1) / 2, dz = e.cd / 2 + 0.6;
        H.NEW_HOUSES.push({ x: e.x, z: e.z, ry: e.ry, w: e.w, d: e.d, design: e.design, door: { x: e.x + dx * c + dz * s, z: e.z - dx * s + dz * c } });
      }
      const milk = await import('../src/jobs/milk.js');
      const stops = milk.milkStopsForCheck ? milk.milkStopsForCheck() : null;
      if (stops) stops.forEach((s, i) => {
        add({ id: `job milk stop ${i + 1} (aunty)`, group: 'job:milk', kind: 'npc', yaw: s.ry, house: true, pts: [s.stand] });
        add({ id: `job milk stop ${i + 1} (door)`, group: 'job:milk', kind: 'waypoint', r: 2.4, mode: 'cycle', house: true, pts: [s.door] });
      });
      else out.push({ id: 'note milk', note: 'milkStopsForCheck not exported yet: milk stops not checked' });
    } catch (e) { out.push({ id: 'ERR milk stops', error: e.stack }); }
  }
  console.log = quiet;
  console.log('@@JSON@@' + JSON.stringify({ mode, routes: routines.ROUTES.length, entries: out }));
}

// =====================================================================================================================
// CHECKER
// =====================================================================================================================
async function main() {
  const VERBOSE = argv.includes('--verbose');
  const run = (mode) => {
    const r = spawnSync(process.execPath, [SELF, '--collect', mode], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const line = (r.stdout || '').split('\n').find((l) => l.startsWith('@@JSON@@'));
    if (!line) { console.error(r.stdout, r.stderr); throw new Error(`collector (${mode}) failed`); }
    return JSON.parse(line.slice(8));
  };
  const OLD = run('old'), NEW = run('new');
  for (const e of [...OLD.entries, ...NEW.entries]) if (e.error) console.log(`COLLECT ERROR ${e.id}: ${e.error}`);
  for (const e of NEW.entries) if (e.note) console.log(`NOTE ${e.note}`);
  { const newIds = new Set(NEW.entries.map((e) => e.id));
    const gone = OLD.entries.filter((e) => e.pts && !newIds.has(e.id)).map((e) => e.id);
    if (gone.length) console.log(`NOTE left out under ?layout=new (their old object or wall is not on the approved map): ${gone.join(', ')}`); }
  const oldById = new Map(OLD.entries.filter((e) => e.pts).map((e) => [e.id, e]));

  globalThis.__DOPAHAR_LAYOUT = 'new';
  await import('./missions-node-env.mjs');
  const L = await import('../src/layout/layout.js');
  const core = await import('../src/layout/layoutCore.js');
  const { EXISTING_FOOTPRINTS } = await import('../src/layout/footprints.js');
  const { ANCHORS } = await import('../src/anchors.js');
  const W = buildWorld(L, core, EXISTING_FOOTPRINTS, ANCHORS);
  const FPK = new Set(Object.keys(EXISTING_FOOTPRINTS));

  const results = [];
  const res = (e, test, status, msg) => results.push({ id: e.id, group: e.group, test, status, msg });
  const f1 = (v) => (+v).toFixed(1);
  const at = (p) => `(${f1(p.x)}, ${f1(p.z)})`;

  for (const e of NEW.entries) {
    if (!e.pts || !e.pts.length) continue;
    if (e.kind === 'marker') {
      const p = e.pts[0];
      const ok = p.x > W.bx0 && p.x < W.bx1 && p.z > W.bz0 && p.z < W.bz1;
      res(e, 'near', ok ? 'PASS' : 'FAIL', ok ? `marker ${at(p)} inside the village` : `marker ${at(p)} is off the map`);
      continue;
    }
    if (e.owner === 'byContainment') { const h = W.solidAt(e.pts[0].x, e.pts[0].z, 0, null, { trees: false }); e.owner = h && FPK.has(h.owner) ? h.owner : undefined; if (e.owner) e.inside = true; }
    const own = e.owner && W.ownerQuads(e.owner);
    { const off = e.pts.find((p) => !(p.x > W.bx0 && p.x < W.bx1 && p.z > W.bz0 && p.z < W.bz1));
      if (off) { res(e, 'onmap', 'FAIL', `${at(off)} is off the village map (600 m west: the 1 Nov shift)`); continue; } }
    // ---- rigid: a point of a place moves and turns with that place
    if (e.owner && !e.norigid) {
      const o = oldById.get(e.id);
      if (o && o.pts.length === e.pts.length) {
        let worst = 0;
        o.pts.forEach((op, i) => { const m = L.movedWith(e.owner, op.x, op.z); worst = Math.max(worst, Math.hypot(m.x - e.pts[i].x, m.z - e.pts[i].z)); });
        res(e, 'rigid', worst < 0.3 ? 'PASS' : 'FAIL', worst < 0.3 ? `moves with ${e.owner} (off ${worst.toFixed(2)} m)` : `does NOT move with ${e.owner}: ${worst.toFixed(1)} m from where the place carries it`);
      }
    }
    // ---- clear / road / face for things that stand
    if (['npc', 'prop', 'vehicle', 'start', 'interact', 'waypoint'].includes(e.kind)) {
      e.pts.forEach((p, i) => {
        const tag = e.pts.length > 1 ? ` #${i + 1}` : '';
        const body = e.kind === 'vehicle' ? null : e.kind === 'prop' ? 0.4 : 0.3;
        let hit;
        if (e.kind === 'vehicle') hit = W.boxHit(p.x, p.z, e.yaw || 0, e.box[0], e.box[1], own);
        else if (e.kind === 'interact' || e.kind === 'waypoint') hit = W.solidAt(p.x, p.z, 0, own, { trees: false }); // a point to walk to may sit by a trunk; it must not be inside a building
        else hit = W.solidAt(p.x, p.z, body, own, { houseOk: e.house });
        if (hit && e.inside && hit.owner === e.owner) hit = null;
        if (['npc', 'prop', 'vehicle', 'start'].includes(e.kind)) {
          res(e, 'clear', hit ? 'FAIL' : 'PASS', hit ? `${at(p)}${tag} stands inside ${hit.what}` : `${at(p)}${tag} on open ground`);
        } else if (hit) res(e, 'clear', 'FAIL', `${at(p)}${tag} is inside ${hit.what}`);
        if (e.walker) res(e, 'road', 'PASS', `${at(p)}${tag} a vendor pushing his cart along the lanes (his route is checked below)`);
        else if (e.kind === 'npc' || e.kind === 'prop' || e.kind === 'vehicle') {
          const rd = W.roadAt(p.x, p.z, e.kind === 'vehicle' ? 0.5 : 0.2);
          if (rd && !(e.kind === 'vehicle' && rd.kind !== 'highway')) res(e, 'road', rd.kind === 'back' || rd.kind === 'track' ? 'WARN' : 'FAIL', `${at(p)}${tag} stands on ${rd.id} (${rd.kind})`);
          else if (!rd) res(e, 'road', 'PASS', `${at(p)}${tag} off the carriageways`);
        }
        if (e.kind === 'npc' && e.yaw != null && i === 0 && !e.inside) {
          const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
          const wall = W.solidAt(p.x + fx * 1.0, p.z + fz * 1.0, 0, own, { trees: false, houseOk: e.house });
          res(e, 'face', wall ? 'FAIL' : 'PASS', wall ? `faces ${wall.what} less than 1 m away` : 'faces open ground');
        }
      });
    }
    // ---- reach
    if (['interact', 'waypoint', 'npc', 'start'].includes(e.kind) && e.kind !== 'start') {
      const mode = e.mode || 'foot';
      e.pts.forEach((p, i) => {
        const tag = e.pts.length > 1 ? ` #${i + 1}` : '';
        const r = Math.max(0.8, (e.r || 2.0) - 0.4);
        // a point inside its own place (a courtyard, a counter, a schoolyard) is reached through that place's own gate, which
        // the place's model carries with it: here it is enough that the place's footprint touches ground the player can reach.
        const insideOwn = own && W.solidAt(p.x, p.z, 0, null, { trees: false }) && W.solidAt(p.x, p.z, 0, null, { trees: false }).owner === e.owner;
        const rr = insideOwn ? W.ownerReach(e.owner) : r;
        const best = { foot: W.reachDist(p.x, p.z, 'foot', rr), cycle: W.reachDist(p.x, p.z, 'cycle', rr), tractor: W.reachDist(p.x, p.z, 'tractor', Math.max(rr, 4)) };
        const need = mode === 'tractor' ? ['foot', 'tractor'] : mode === 'cycle' ? ['foot', 'cycle'] : ['foot'];
        const miss = need.filter((m) => best[m] == null);
        res(e, 'reach', miss.length ? 'FAIL' : 'PASS', miss.length ? `${at(p)}${tag} cannot be reached ${miss.map((m) => (m === 'foot' ? 'on foot' : m === 'cycle' ? 'on the cycle' : 'with the tractor')).join(' or ')}` : `${at(p)}${tag} reachable (${need.join(' + ')})`);
      });
    }
    // ---- route
    if (e.kind === 'route') {
      const bad = [];
      for (let i = 0; i + 1 < e.pts.length; i++) {
        const a = e.pts[i], b = e.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.4));
        for (let k = 0; k <= n; k++) {
          const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n;
          let hit = W.solidAt(x, z, 0.25, own);
          if (hit && e.through && e.through.includes(hit.owner)) hit = null;
          if (hit) { bad.push(`leg ${i + 1} passes through ${hit.what} at ${at({ x, z })}`); break; }
        }
      }
      res(e, 'route', bad.length ? 'FAIL' : 'PASS', bad.length ? bad.slice(0, 3).join('; ') + (bad.length > 3 ? ` (+${bad.length - 3} legs)` : '') : `${e.pts.length} waypoints, no leg passes through a building`);
    }
    // ---- near
    if (e.near) {
      const t = e.near.place ? (ANCHORS[e.near.place] || L.getPlace(e.near.place)) : e.near;
      if (t && t.x != null) {
        const d = Math.hypot(e.pts[0].x - t.x, e.pts[0].z - t.z);
        res(e, 'near', d <= e.near.max ? 'PASS' : 'FAIL', `${f1(d)} m from ${e.near.place || e.near.label} (allowed ${e.near.max})`);
      }
    }
    if (e.faith) res(e, 'faith', 'WARN', 'interaction at a faith building (ambient bell, no task, no reward): kept as it was');
  }

  // ---- behaviour: main-story beats, pocket-money stalls (tools/story-beats-behaviour.mjs)
  try {
    const { beatBehaviour } = await import('./story-beats-behaviour.mjs');
    await beatBehaviour((id, status, msg) => results.push({ id, group: 'beats', test: 'play', status, msg }));
  } catch (e) { results.push({ id: 'beat behaviour tests', group: 'beats', test: 'play', status: 'FAIL', msg: `could not run: ${e.stack.split('\n').slice(0, 3).join(' | ')}` }); }

  // ---- report
  const by = { PASS: 0, FAIL: 0, WARN: 0 };
  for (const r of results) by[r.status]++;
  const groups = [...new Set(results.map((r) => r.group))];
  for (const g of groups) {
    const rs = results.filter((r) => r.group === g);
    const f = rs.filter((r) => r.status === 'FAIL').length, w = rs.filter((r) => r.status === 'WARN').length;
    console.log(`\n== ${g}: ${rs.length - f - w} pass, ${f} fail, ${w} warn`);
    for (const r of rs) if (VERBOSE || r.status !== 'PASS') console.log(`  ${r.status.padEnd(4)} ${r.test.padEnd(5)} ${r.id}: ${r.msg}`);
  }
  console.log(`\nmissions-check (?layout=new): ${NEW.entries.filter((e) => e.pts).length} points/routes collected (old layout: ${OLD.entries.filter((e) => e.pts).length}); tests ${results.length}: ${by.PASS} PASS, ${by.FAIL} FAIL, ${by.WARN} WARN`);
  if (argv.includes('--json')) fs.writeFileSync(argv[argv.indexOf('--json') + 1], JSON.stringify({ results, counts: by }, null, 1));
  process.exit(by.FAIL ? 1 : 0);
}

// =====================================================================================================================
// WORLD MODEL of the approved map
// =====================================================================================================================
function buildWorld(L, core, FP, ANCHORS) {
  const lay = L.getLayout();
  const roads = lay.roads;
  const quads = []; // { q: [[x,z]x4], what, owner, house }
  // existing places (their own model footprints, at their new anchor and yaw)
  for (const [id, fp] of Object.entries(FP)) {
    const p = lay.places[id];
    if (!p || fp.open) continue;
    const a = ANCHORS[id] || p;
    const [x0, x1, z0, z1] = fp.box;
    quads.push({ q: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([lx, lz]) => { const w = core.localToWorld(a.x, a.z, a.ry, lx, lz); return [w.x, w.z]; }), what: `${p.name || id} (place)`, owner: id });
  }
  // every solid of the map (houses, shops, kiosks, carts, wells, pumps, map objects); bridges are walkable
  for (const o of lay.objects) {
    if (!o.rect || (o.h || 0) < 0.5 || o.prefix === 'canal_new') continue;
    quads.push({ q: core.boxCorners(o.rect.cx, o.rect.cz, o.rect.w, o.rect.d, o.rect.ry), what: `${o.name} ${o.id}`, owner: o.id, house: o.prefix === 'new_house' });
  }
  const water = []; // rings
  for (const o of lay.objects) {
    if (o.kind !== 'ground' || !o.rings) continue;
    if (/canal water|^Cattle pond$|^Buffalo pond$|^Clay pit pond$|^Temple pond$/.test(o.name)) water.push({ ring: o.rings[0], what: o.name });
  }
  for (const id of ['pond', 'johad']) { const a = ANCHORS[id]; const r = id === 'pond' ? 9.6 : 5.4; water.push({ circle: [a.x, a.z, r], what: `${id} water` }); }
  const bridges = lay.objects.filter((o) => o.prefix === 'canal_new' && o.kind === 'solids' && o.rings).map((o) => o.rings[0]);
  const trees = lay.objects.filter((o) => o.kind === 'trees').map((o) => [o.cx, o.cz]);
  const TRUNK = 0.4;

  const inRing = (x, z, ring) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; };
  const inQuad = (x, z, q, pad) => {
    const cx = (q[0][0] + q[2][0]) / 2, cz = (q[0][1] + q[2][1]) / 2;
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4], ex = b[0] - a[0], ez = b[1] - a[1], Lq = Math.hypot(ex, ez) || 1;
      const side = Math.sign(ex * (cz - a[1]) - ez * (cx - a[0]));
      if (side * (ex * (z - a[1]) - ez * (x - a[0])) / Lq < -pad) return false;
    }
    return true;
  };
  const bbox = (q) => [Math.min(...q.map((p) => p[0])), Math.min(...q.map((p) => p[1])), Math.max(...q.map((p) => p[0])), Math.max(...q.map((p) => p[1]))];
  for (const s of quads) s.bb = bbox(s.q);
  // coarse bucket index
  const B = 20, idx = new Map();
  const key = (i, j) => i * 100003 + j;
  quads.forEach((s, n) => { for (let i = Math.floor(s.bb[0] / B); i <= Math.floor(s.bb[2] / B); i++) for (let j = Math.floor(s.bb[1] / B); j <= Math.floor(s.bb[3] / B); j++) { const k = key(i, j); if (!idx.has(k)) idx.set(k, []); idx.get(k).push(n); } });
  const tIdx = new Map();
  trees.forEach(([x, z], n) => { const k = key(Math.floor(x / B), Math.floor(z / B)); if (!tIdx.has(k)) tIdx.set(k, []); tIdx.get(k).push(n); });
  const near = (map, x, z) => { const outL = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = map.get(key(Math.floor(x / B) + i, Math.floor(z / B) + j)); if (a) outL.push(...a); } return [...new Set(outL)]; };
  const onBridge = (x, z) => bridges.some((r) => inRing(x, z, r));
  const inWater = (x, z, pad) => {
    if (onBridge(x, z)) return null;
    for (const w of water) {
      if (w.circle) { if (Math.hypot(x - w.circle[0], z - w.circle[1]) < w.circle[2] + pad) return w; continue; }
      if (inRing(x, z, w.ring)) return w;
    }
    return null;
  };
  const ownSet = (o) => (o ? new Set(o) : null);
  function solidAt(x, z, pad, own, { trees: withTrees = true, houseOk = false } = {}) {
    for (const n of near(idx, x, z)) {
      const s = quads[n];
      if (own && own.has(n)) continue;
      if (houseOk && s.house) continue;
      if (x < s.bb[0] - pad || x > s.bb[2] + pad || z < s.bb[1] - pad || z > s.bb[3] + pad) continue;
      if (inQuad(x, z, s.q, pad)) return { what: s.what, owner: s.owner };
    }
    if (withTrees) for (const n of near(tIdx, x, z)) { const [tx, tz] = trees[n]; if (Math.hypot(x - tx, z - tz) < TRUNK + pad) return { what: `a tree trunk at (${tx.toFixed(1)}, ${tz.toFixed(1)})` }; }
    const w = inWater(x, z, pad);
    if (w) return { what: w.what };
    return null;
  }
  function ownerQuads(owner) { const s = new Set(); quads.forEach((q, n) => { if (q.owner === owner) s.add(n); }); return s; }
  function boxHit(cx, cz, yaw, hw, hl, own) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (let a = -hw; a <= hw + 1e-6; a += hw) for (let b = -hl; b <= hl + 1e-6; b += hl / 4) {
      const x = cx + a * c + b * s, z = cz - a * s + b * c;
      const h = solidAt(x, z, 0.1, own); if (h) return h;
    }
    return null;
  }
  function roadAt(x, z, tol) { const r = core.roadUnder(roads, x, z, tol); return r ? { id: r.r.id, kind: r.r.kind } : null; }

  // ---- reachability grids (0.5 m), flooded from the player's start
  let bx0 = Infinity, bz0 = Infinity, bx1 = -Infinity, bz1 = -Infinity;
  for (const r of roads) { bx0 = Math.min(bx0, r.bbox[0]); bz0 = Math.min(bz0, r.bbox[1]); bx1 = Math.max(bx1, r.bbox[2]); bz1 = Math.max(bz1, r.bbox[3]); }
  bx0 = Math.max(bx0, 300); bx1 = Math.min(bx1, 1000); bz0 = Math.max(bz0, -420); bz1 = Math.min(bz1, 420);
  const C = 0.5, NX = Math.ceil((bx1 - bx0) / C), NZ = Math.ceil((bz1 - bz0) / C);
  const PADS = { foot: 0.35, cycle: 0.55, tractor: 1.35 };
  // base occupancy: distance-to-obstacle field approximated by rasterising each obstacle grown by the pad
  const grids = {};
  const cellX = (i) => bx0 + (i + 0.5) * C, cellZ = (j) => bz0 + (j + 0.5) * C;
  for (const [mode, pad] of Object.entries(PADS)) {
    const g = new Uint8Array(NX * NZ); // 1 = blocked
    for (const s of quads) {
      const i0 = Math.max(0, Math.floor((s.bb[0] - pad - bx0) / C)), i1 = Math.min(NX - 1, Math.floor((s.bb[2] + pad - bx0) / C));
      const j0 = Math.max(0, Math.floor((s.bb[1] - pad - bz0) / C)), j1 = Math.min(NZ - 1, Math.floor((s.bb[3] + pad - bz0) / C));
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (inQuad(cellX(i), cellZ(j), s.q, pad)) g[j * NX + i] = 1;
    }
    for (const [tx, tz] of trees) {
      const R = TRUNK + pad;
      for (let i = Math.floor((tx - R - bx0) / C); i <= Math.floor((tx + R - bx0) / C); i++) for (let j = Math.floor((tz - R - bz0) / C); j <= Math.floor((tz + R - bz0) / C); j++) {
        if (i < 0 || j < 0 || i >= NX || j >= NZ) continue;
        if (Math.hypot(cellX(i) - tx, cellZ(j) - tz) < R) g[j * NX + i] = 1;
      }
    }
    for (const w of water) {
      const bb = w.circle ? [w.circle[0] - w.circle[2], w.circle[1] - w.circle[2], w.circle[0] + w.circle[2], w.circle[1] + w.circle[2]] : bbox(w.ring);
      for (let i = Math.max(0, Math.floor((bb[0] - bx0) / C)); i <= Math.min(NX - 1, Math.floor((bb[2] - bx0) / C)); i++) for (let j = Math.max(0, Math.floor((bb[1] - bz0) / C)); j <= Math.min(NZ - 1, Math.floor((bb[3] - bz0) / C)); j++) {
        if (inWater(cellX(i), cellZ(j), 0)) g[j * NX + i] = 1;
      }
    }
    grids[mode] = g;
  }
  // flood from the start on each grid (own-place footprints stay blocked: an owned point is reached up to its own wall)
  const START = { x: 604, z: 27 };
  const reached = {};
  for (const [mode, g] of Object.entries(grids)) {
    const seen = new Uint8Array(NX * NZ);
    let si = Math.floor((START.x - bx0) / C), sj = Math.floor((START.z - bz0) / C);
    // nearest free cell to the start
    outer: for (let r = 0; r < 40; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) { const i = si + di, j = sj + dj; if (!g[j * NX + i]) { si = i; sj = j; break outer; } }
    const q = new Int32Array(NX * NZ); let h = 0, t = 0; q[t++] = sj * NX + si; seen[sj * NX + si] = 1;
    while (h < t) { const c = q[h++], i = c % NX, j = (c - i) / NX; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue; const n = nj * NX + ni; if (seen[n] || g[n]) continue; seen[n] = 1; q[t++] = n; } }
    reached[mode] = seen;
  }
  /** Distance from (x, z) to the nearest reached cell within r, or null. */
  function reachDist(x, z, mode, r) {
    const seen = reached[mode];
    let best = null;
    for (let i = Math.floor((x - r - bx0) / C); i <= Math.floor((x + r - bx0) / C); i++) for (let j = Math.floor((z - r - bz0) / C); j <= Math.floor((z + r - bz0) / C); j++) {
      if (i < 0 || j < 0 || i >= NX || j >= NZ || !seen[j * NX + i]) continue;
      const d = Math.hypot(cellX(i) - x, cellZ(j) - z);
      if (d <= r && (best == null || d < best)) best = d;
    }
    return best;
  }
  /** How far from a point inside place `owner` the nearest reachable ground may be: the place's half-diagonal + 2 m. */
  function ownerReach(owner) {
    let r = 4;
    for (const s of quads) if (s.owner === owner) r = Math.max(r, Math.hypot(s.bb[2] - s.bb[0], s.bb[3] - s.bb[1]) / 2 + 2);
    return r;
  }
  return { ownerReach, solidAt, ownerQuads, boxHit, roadAt, reachDist, bx0, bx1, bz0, bz1, quads, inWater, onBridge };
}
