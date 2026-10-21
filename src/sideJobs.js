import * as THREE from 'three';
import { INTERACTION_POINTS, registerInteraction } from './interactions.js';
import { QUEST_STEPS } from './quest.js';
import { registerJobMarker } from './freeRoam.js';
import { JOBS, POSTCARD_ORDER, POSTCARD_TEXT } from './jobs/data.js';
import { registerPumpJob } from './jobs/pump.js';
import { registerRationJob } from './jobs/ration.js';
import { registerStalls } from './jobs/stalls.js';
import { registerKulfiJob } from './jobs/kulfi.js';
import { registerKancheJob } from './jobs/kanche.js';
import { registerGilliJob } from './jobs/gilli.js';
import { registerMilkJob } from './jobs/milk.js';
import { registerChakkiJob } from './jobs/chakki.js';
import { registerGateJob } from './jobs/gate.js';
import { registerPatangJob } from './jobs/patang.js';
import { registerMangoJob } from './jobs/mango.js';

/**
 * Side jobs (docs/MISSIONS_PLAN.md sections 3 and 4): ten 3-8 minute jobs, each with its own NPC, dialogue, a small reward and
 * replayable, available only in free roam (after the story). Discovered diegetically, never as a quest list: the postman's
 * postcard, the peepal poster board, the sound radar (kulfi bell, kids at the maidan, the chakki motor) or the kulfiwala's gossip.
 *
 * This module is the engine: the job registry + discovery, the shared modal/choice overlays used by the mini-games, the
 * per-frame updater list, rewards (pocket money / marbles / kites / mango tastings) and helpers to add interaction points that
 * only exist in free roam. Each job is one file under src/jobs/ exporting `registerXxx(api, env)`.
 *
 * `env` (from main.js): { scene, quest, dialogue, audio, freeRoam, getPlayerPos, getPlayerYaw, buildNpc, setFrozen,
 *   vehicles, sackCarrier, npcs, save, mountedVehicle, followRoutine, waypointLoop, groundHeightAt }.
 */

export { JOBS };
const POSTMAN_ID = 'postman_postcards';

export function createSideJobs(env) {
  const { quest, dialogue, audio, freeRoam, scene } = env;
  const inFreeRoam = () => quest.step === QUEST_STEPS.FREE_ROAM;
  const updaters = [];
  const nodes = {}; // job id -> small mutable state (not saved; one active run per job)

  // ---------------------------------------------------------------- overlays
  const overlay = document.getElementById('job-overlay');
  const titleEn = document.getElementById('job-title-en');
  const titleHi = document.getElementById('job-title-hi');
  const body = document.getElementById('job-body');
  const actions = document.getElementById('job-actions');
  let modalCloseHook = null;

  function closeModal() {
    if (!overlay.classList.contains('visible')) return;
    overlay.classList.remove('visible');
    body.innerHTML = '';
    actions.innerHTML = '';
    env.setFrozen(false);
    const hook = modalCloseHook;
    modalCloseHook = null;
    hook?.();
  }

  /** Opens the shared card. `build(bodyEl, ctrl)` fills the body (ctrl.close(), ctrl.setButtons(list)). `buttons` = [{en, hi, onClick, secondary}].
   * The world is frozen while it is open. */
  function modal({ en, hi, build, buttons = [], onClose }) {
    titleEn.textContent = en;
    titleHi.textContent = hi || '';
    body.innerHTML = '';
    const ctrl = { close: closeModal, setButtons };
    function setButtons(list) {
      actions.innerHTML = '';
      for (const b of list) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `panel-btn${b.secondary ? ' secondary' : ''}`;
        btn.innerHTML = `<span class="btn-en"></span><span class="btn-hi"></span>`;
        btn.querySelector('.btn-en').textContent = b.en;
        btn.querySelector('.btn-hi').textContent = b.hi || '';
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          b.onClick?.(ctrl);
        });
        actions.appendChild(btn);
      }
    }
    setButtons(buttons);
    build?.(body, ctrl);
    modalCloseHook = onClose || null;
    overlay.classList.add('visible');
    env.setFrozen(true);
    return ctrl;
  }

  /** One question, a few answers: cb(optionId). Options: [{id, en, hi}]. */
  function choose(prompt, options, cb) {
    modal({
      en: prompt.en,
      hi: prompt.hi,
      buttons: options.map((o) => ({
        en: o.en,
        hi: o.hi,
        onClick: (ctrl) => {
          ctrl.close();
          cb(o.id);
        },
      })),
    });
  }

  // ---------------------------------------------------------------- rewards
  function say(lines, cb) {
    dialogue.say(lines, cb);
  }
  function addPocket(n) {
    quest.pocket = Math.max(0, quest.pocket + n);
    env.refreshHud?.();
    env.save?.();
  }
  function jobDone(id, rewardText) {
    quest.jobsDone[id] = (quest.jobsDone[id] || 0) + 1;
    freeRoam.toast(`${JOBS[id].en} done${rewardText?.en ? ` — ${rewardText.en}` : ''}`, `${JOBS[id].hi} पूरा${rewardText?.hi ? ` — ${rewardText.hi}` : ''}`, 4200);
    env.save?.();
  }
  function discoverJob(id, silent = false) {
    const j = JOBS[id];
    if (!j || freeRoam.isDiscovered(`job_${id}`)) return false;
    freeRoam.discover(`job_${id}`, silent ? null : { en: `${j.en} (marked on the map)`, hi: j.hi });
    return true;
  }
  function discoverNext() {
    for (const id of POSTCARD_ORDER) if (!freeRoam.isDiscovered(`job_${id}`)) return id;
    return null;
  }
  function discoverRandom(exceptId) {
    const rest = POSTCARD_ORDER.filter((id) => id !== exceptId && !freeRoam.isDiscovered(`job_${id}`));
    return rest.length ? rest[Math.floor(Math.random() * rest.length)] : null;
  }

  // ---------------------------------------------------------------- interactions + people
  /** An interaction that exists only in free roam. */
  function addInteraction(def) {
    const available = def.available;
    registerInteraction({ ...def, available: (ctx) => inFreeRoam() && (!available || available(ctx)) });
  }
  function npc(role, position, rotationY = 0, name = 'npc_job') {
    const built = env.buildNpc(role, position, rotationY, name);
    scene.add(built.root);
    return built;
  }
  function onUpdate(fn) {
    updaters.push(fn);
  }

  // A small status panel under the objective while a job is running ("Water: 90%", "Marbles: 3"...).
  const hudEl = document.getElementById('job-hud');
  function hud(en, hi) {
    document.getElementById('job-hud-en').textContent = en;
    document.getElementById('job-hud-hi').textContent = hi || '';
    hudEl.classList.add('visible');
  }
  function hudClear() {
    hudEl.classList.remove('visible');
  }
  /** Mounts an object on the player (carried buckets, sacks); returns a remover. */
  function attachToPlayer(obj) {
    env.playerGroup.add(obj);
    return () => env.playerGroup.remove(obj);
  }

  const api = {
    THREE, env, hud, hudClear, attachToPlayer, JOBS, modal, choose, say, addPocket, jobDone, discoverJob, discoverNext, discoverRandom, addInteraction, npc, onUpdate, registerDadi: (o) => dadiOffers.push(o),
    nodes, inFreeRoam, audio, dialogue, quest, freeRoam, scene, closeModal,
    /** Elapsed seconds since the page loaded — handy for timers independent of frame rate. */
    now: () => performance.now() / 1000,
  };

  // ---------------------------------------------------------------- Dadi: one interaction shared by every job that involves her
  const DADI_POS = new THREE.Vector3(-43.3, 0, 41.8);
  const dadiNpc = env.npcs.dadi;
  dadiNpc.position.set(DADI_POS.x, 0, DADI_POS.z);
  dadiNpc.rotation.y = -Math.PI / 2;
  dadiNpc.visible = true;
  const dadiOffers = []; // { id, label:{en,hi}, active(), handle(), canStart(), start() }
  addInteraction({
    id: 'job_dadi',
    position: DADI_POS,
    radius: 2.6,
    priority: 1,
    label: () => {
      const a = dadiOffers.find((o) => o.active());
      return a?.handleLabel || { hi: 'दादी से बात करें', en: 'Talk to Dadi' };
    },
    onInteract: () => {
      const active = dadiOffers.find((o) => o.active());
      if (active) return active.handle();
      const startable = dadiOffers.filter((o) => o.canStart());
      if (!startable.length) {
        say([{ hi: 'आज के काम हो गए, बेटा। थोड़ा बैठ जाओ।', en: 'The work is done for now, beta. Sit a while.' }]);
      } else if (startable.length === 1) {
        startable[0].start();
      } else {
        say([{ hi: 'बेटा, आज दो काम हैं — कौन सा करोगे?', en: 'Beta, there are two things I need today — which will you do?' }], () =>
          choose({ en: 'Help Dadi with…', hi: 'दादी की मदद…' }, startable.map((o) => ({ id: o.id, en: o.label.en, hi: o.label.hi })), (id) => startable.find((o) => o.id === id).start())
        );
      }
    },
  });

  // ---------------------------------------------------------------- map markers + diegetic discovery
  for (const [id, j] of Object.entries(JOBS)) registerJobMarker({ id: `job_${id}`, en: j.en, hi: j.hi, x: j.x, z: j.z });

  // Postman: after the story each pass hands over a postcard naming one new side job.
  addInteraction({
    id: POSTMAN_ID,
    position: new THREE.Vector3(), // linked to the postman NPC's live position by main.js (linkPostmanPosition handles id 'postman'; this one is synced below)
    radius: 2.4,
    label: { hi: 'पोस्टमैन से बात करें', en: 'Talk to the postman' },
    onInteract: () => {
      const id = discoverNext();
      if (!id) {
        say([{ hi: 'आज की सारी डाक बँट गई, बेटा। सब जगह घूम आओ!', en: 'All of today\'s post is delivered, beta. Go and see the village!' }]);
        return;
      }
      const t = POSTCARD_TEXT[id];
      say([{ hi: `यह लो, एक पोस्टकार्ड — "${t.hi}"`, en: `Here, a postcard for you — "${t.en}"` }], () => discoverJob(id));
    },
  });
  const postmanPoint = INTERACTION_POINTS.find((p) => p.id === POSTMAN_ID);
  if (env.npcs?.postman) postmanPoint.position = env.npcs.postman.position;

  // Peepal poster board at the chowk: posters for gilli-danda and the kite match.
  addInteraction({
    id: 'peepal_posters',
    position: new THREE.Vector3(-56, 0, 15),
    radius: 2.6,
    label: { hi: 'पीपल पर लगे पोस्टर देखें', en: 'Read the posters on the peepal' },
    onInteract: () => {
      const found = [];
      if (discoverJob('gilli', true)) found.push('gilli');
      if (discoverJob('patang', true)) found.push('patang');
      say(
        [
          { hi: 'पोस्टर: "खेल मैदान में गिल्ली-डंडा — आज शाम, सब बच्चे आएँ!"', en: 'Poster: "Gilli-danda at the khel maidan this evening — all kids welcome!"' },
          { hi: 'पोस्टर: "पतंग का मुकाबला — जो कटी पतंग लूटे, उसी की!"', en: 'Poster: "Kite match — the cut kite belongs to whoever catches it!"' },
        ],
        () => {
          if (found.length) freeRoam.toast('Two new places marked in your notebook', 'नोटबुक में दो नई जगहें', 3600);
        }
      );
    },
  });

  // ---------------------------------------------------------------- the jobs
  registerPumpJob(api, env);
  registerRationJob(api, env);
  registerStalls(api, env);
  registerKulfiJob(api, env);
  registerKancheJob(api, env);
  registerGilliJob(api, env);
  registerMilkJob(api, env);
  registerChakkiJob(api, env);
  registerGateJob(api, env);
  registerPatangJob(api, env);
  registerMangoJob(api, env);

  // Call every frame (not while frozen) with dt in seconds.
  function update(dt) {
    for (const fn of updaters) fn(dt);
  }

  return { update, api, closeModal, JOBS };
}
