import * as THREE from 'three';
import { spot } from '../missionsLayout.js'; // S7 (missions)
import { getRoads, getObjects } from '../layout/layout.js';
import { roadUnder } from '../layout/layoutCore.js';
import { buildMilkCans } from './props.js';
import { abadiDoorstep } from '../scenery.js';
import { halwaiXZ, HALWAI_CENTER } from '../village.js';
import { NEW_HOUSES } from '../kit/houses.js'; // S7 WIRING (houses): doorsteps of the new map's houses under ?layout=new

/**
 * Job 2 — Milk round (docs/MISSIONS_PLAN.md): help the doodhwala deliver milk to five houses before his round ends (a generous
 * timer — on the cycle it is easy, on foot still doable; running out of time only halves the reward). Reward: pocket money.
 * The waypoint arrow points at the next house; one aunty NPC is moved to each doorstep in turn.
 */
// 1 Nov map (2 Nov): the abadi rows moved onto the map's house groups (src/scenery.js PLACEMENTS), so the round moved with
// them: the doodhwala stands 6.5 m in front of the halwai's (west-facing) counter ("his round starts by the halwai",
// jobs/data.js) and the five stops are doorsteps of the nearest abadi rows (two houses of one South row, East houses, two North rows).
// Computed on register, not at import, so module order never matters.
const STOP_ROWS = [
  { row: 12, along: -5, who: 'Sharma-ji ki bahu', hi: 'शर्मा जी की बहू' },
  { row: 12, along: 5, who: 'Chachi', hi: 'चाची' },
  { row: 11, along: -2, who: 'Kamla tai', hi: 'कमला ताई' },
  { row: 9, along: 3, who: 'Pushpa didi', hi: 'पुष्पा दीदी' },
  { row: 8, along: -4, who: 'Rani bua', hi: 'रानी बुआ' },
];
const TIME_LIMIT = 220; // seconds

/** Where the doodhwala stands. S7 (missions): under ?layout=new the old spot (6.5 m in front of the halwai's counter) is inside
 * a kiosk on the approved map, so he stands on the nearest open ground (src/missionsLayout.js); ?layout=old unchanged. */
const doodhAt = () => spot('doodh', halwaiXZ(HALWAI_CENTER.x, HALWAI_CENTER.z + 6.5));
// Under ?layout=new the old abadi rows are gone: the five stops are the new-map houses nearest the doodh counter,
// picked when a round starts (the houses build after Play). Each stop stands just outside its door, facing out.
function newMapStops(DOODH = doodhAt()) {
  if (!NEW_HOUSES.length) return null;
  const near = [...NEW_HOUSES].sort((a, b) => Math.hypot(a.door.x - DOODH.x, a.door.z - DOODH.z) - Math.hypot(b.door.x - DOODH.x, b.door.z - DOODH.z));
  const picked = [];
  // S7 (missions): a house whose door opens straight onto a lane or road (no doorstep to stand on) is not a stop
  const onLane = (h) => { const ox = h.door.x - h.x, oz = h.door.z - h.z, l = Math.hypot(ox, oz) || 1; const r = roadUnder(getRoads(), h.door.x + ox / l * 0.25, h.door.z + oz / l * 0.25, 0); return !!r && r.r.kind !== 'back' && r.r.kind !== 'track'; };
  // a door that opens into a house footprint of the map (houses packed close, or a map footprint bigger than the built house) is not a stop
  const ringHas = (ring, x, z) => { let ins = false; for (let i = 0, j = ring.length - 1; i < ring.length; i++, j = i - 1) { const [xi, zi] = ring[i], [xj, zj] = ring[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; };
  const mapHouses = getObjects('new_house').filter((o) => o.rings && o.rings[0]);
  const inOther = (h) => mapHouses.some((o) => ringHas(o.rings[0], h.door.x, h.door.z));
  for (const h of near) { if (onLane(h) || inOther(h)) continue; if (picked.every((p) => Math.hypot(p.door.x - h.door.x, p.door.z - h.door.z) > 12)) picked.push(h); if (picked.length === STOP_ROWS.length) break; }
  if (picked.length < STOP_ROWS.length) return null;
  return picked.map((h, i) => {
    const ox = h.door.x - h.x, oz = h.door.z - h.z, l = Math.hypot(ox, oz) || 1, ux = ox / l, uz = oz / l;
    // S7 (missions): she stands on her doorstep, never out on the lane in front of it (some doors open straight onto a lane)
    const k = [0.8, 0.5, 0.25].find((d) => !roadUnder(getRoads(), h.door.x + ux * d, h.door.z + uz * d, 0.1)) ?? 0.25;
    return { ...STOP_ROWS[i], door: { ...h.door }, stand: { x: h.door.x + ux * k, z: h.door.z + uz * k }, ry: Math.atan2(ux, uz) };
  });
}
/** tools/missions-check.mjs: the five stops a round would use right now (null until the new-map houses are built). */
export const milkStopsForCheck = () => newMapStops();

export function registerMilkJob(api, env) {
  const DOODH = doodhAt();
  let STOPS = STOP_ROWS.map((s) => ({ ...s, ...abadiDoorstep(s.row, s.along) }));
  const st = { stage: 'idle', idx: 0, timeLeft: 0 };
  const dood = api.npc('doodhwala', DOODH, Math.PI / 2, 'npc_doodhwala');
  const aunty = api.npc('villager_aunty', { x: 0, z: 0 }, 0, 'npc_milk_aunty');
  aunty.root.visible = false;
  let cansRemove = null;

  function nextStop() {
    const s = STOPS[st.idx];
    aunty.root.visible = true;
    aunty.root.position.set(s.stand.x, 0, s.stand.z);
    aunty.root.rotation.y = s.ry; // faces out of her door, toward the lane
    env.setJobWaypoint(new THREE.Vector3(s.door.x, 0, s.door.z));
    hud();
  }
  function hud() {
    const t = Math.max(0, Math.ceil(st.timeLeft));
    api.hud(`Milk round: house ${st.idx + 1} of 5 — time ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, `दूध का चक्कर: घर ${st.idx + 1} / 5 — समय ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
  }
  function finishRound() {
    aunty.root.visible = false;
    env.setJobWaypoint(new THREE.Vector3(DOODH.x, 0, DOODH.z));
    st.stage = 'return';
    api.hud('All delivered! Go back to the doodhwala', 'सब बँट गया! दूधवाले के पास लौटो');
  }

  api.addInteraction({
    id: 'job_milk_doodhwala',
    position: dood.root.position,
    radius: 2.8,
    priority: 1,
    label: { en: 'Talk to the doodhwala', hi: 'दूधवाले से बात करें' },
    onInteract: () => {
      if (st.stage === 'idle') {
        api.discoverJob('milk', true);
        api.say(
          [
            { en: "Beta, my round is behind and my knees are old. Take my milk cans — five houses, and the cycle will make it quick.", hi: 'बेटा, मेरा चक्कर पिछड़ गया और घुटने बूढ़े हो गए। मेरे दूध के डिब्बे ले जाओ — पाँच घर, साइकिल से जल्दी हो जाएगा।' },
            { en: 'Follow the arrow. Hop off at each house and hand the milk over.', hi: 'तीर के पीछे चलो। हर घर पर उतरकर दूध दे देना।' },
          ],
          () => {
            st.stage = 'deliver';
            st.idx = 0;
            { const ns = newMapStops(); if (ns) STOPS = ns; }
            st.timeLeft = TIME_LIMIT;
            const cans = buildMilkCans();
            cans.position.set(0, 0.55, -0.45);
            cansRemove = api.attachToPlayer(cans);
            nextStop();
          }
        );
      } else if (st.stage === 'return') {
        cansRemove?.();
        cansRemove = null;
        env.setJobWaypoint(null);
        api.hudClear();
        const full = st.timeLeft > 0;
        const pay = full ? 20 + Math.min(20, Math.floor(st.timeLeft / 10)) : 10;
        api.say(
          [{ en: full ? `Right on time! Not a drop wasted. Here, Rs ${pay}.` : `A bit late, but the milk is delivered — thank you! Here, Rs ${pay}.`, hi: full ? `बिल्कुल समय पर! एक बूँद भी बर्बाद नहीं। लो, ₹${pay}।` : `थोड़ी देर हो गई, पर दूध बँट गया — शुक्रिया! लो, ₹${pay}।` }],
          () => {
            api.addPocket(pay);
            api.jobDone('milk', { en: `₹${pay}`, hi: `₹${pay}` });
            st.stage = 'idle';
          }
        );
      } else {
        api.say([{ en: 'Follow the arrow, beta — five houses.', hi: 'तीर के पीछे चलो, बेटा — पाँच घर।' }]);
      }
    },
  });

  api.addInteraction({
    id: 'job_milk_stop',
    position: aunty.root.position,
    radius: 2.6,
    priority: 1,
    label: { en: 'Hand over the milk', hi: 'दूध दें' },
    available: () => st.stage === 'deliver',
    onInteract: () => {
      const s = STOPS[st.idx];
      api.say(
        [{ en: `${s.who}: "Oh, the milk at last! Thank you, beta — tell the doodhwala his tea is on me."`, hi: `${s.hi}: "अरे, दूध आ गया! शुक्रिया बेटा — दूधवाले से कहना चाय मेरी तरफ से।"` }],
        () => {
          st.idx += 1;
          if (st.idx >= STOPS.length) finishRound();
          else nextStop();
        }
      );
    },
  });

  api.onUpdate((dt) => {
    if (st.stage !== 'deliver' && st.stage !== 'return') return;
    st.timeLeft = Math.max(0, st.timeLeft - dt);
    if (st.stage === 'deliver') hud();
  });
}
