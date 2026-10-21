import * as THREE from 'three';
import { part, mergeProp } from './props.js';

/**
 * Job 5 — Atta chakki run (docs/MISSIONS_PLAN.md): load Dadi's wheat sack onto the bullock cart, drive it to the chakki (the
 * bullocks have their own gentle mind), wait your turn in the queue, and bring the flour home to Dadi. Reward: pocket money.
 */
const CHAKKI_DOOR = new THREE.Vector3(-65.3, 0, 36.2);
const DADI = new THREE.Vector3(-43.3, 0, 41.8);

function sackOnCart(colour) {
  const parts = [
    part(new THREE.CylinderGeometry(0.28, 0.34, 0.7, 10), colour, { x: -0.3, y: 0.0 }),
    part(new THREE.CylinderGeometry(0.28, 0.34, 0.7, 10), colour, { x: 0.35, y: 0.0, z: 0.1 }),
    part(new THREE.SphereGeometry(0.28, 8, 6), colour, { x: -0.3, y: 0.36, sy: 0.5 }),
    part(new THREE.SphereGeometry(0.28, 8, 6), colour, { x: 0.35, y: 0.36, z: 0.1, sy: 0.5 }),
  ];
  const m = mergeProp(parts, 'cart_sacks');
  m.position.set(0, 1.05, -0.2);
  return m;
}

export function registerChakkiJob(api, env) {
  const st = { stage: 'idle' }; // idle -> loading -> driving -> waiting? (a modal) -> flour
  const cart = env.vehicles.find((v) => v.preset.kind === 'cart');
  let load = null;

  function setLoad(colour) {
    if (load) cart.group.remove(load);
    load = colour ? sackOnCart(colour) : null;
    if (load) cart.group.add(load);
  }
  const cartPos = () => cart.group.position;

  api.registerDadi({
    id: 'chakki',
    label: { en: 'Take wheat to the chakki', hi: 'चक्की में गेहूं ले जाओ' },
    handleLabel: { hi: 'दादी को आटा दें', en: 'Give Dadi the flour' },
    active: () => st.stage === 'flour',
    canStart: () => st.stage === 'idle',
    handle: () => {
      const near = Math.hypot(cartPos().x - DADI.x, cartPos().z - DADI.z) < 14;
      if (!near) {
        api.say([{ hi: 'बैलगाड़ी को घर के पास तो लाओ, बेटा — आटा वहीं उतरेगा।', en: 'Bring the bullock cart closer to the house, beta — the flour has to be unloaded.' }]);
        return;
      }
      setLoad(null);
      env.setJobWaypoint(null);
      api.hudClear();
      api.say(
        [{ hi: 'ताज़ा, गरम आटा! आज गरम रोटी बनेगी। ये लो ₹40।', en: 'Fresh, warm flour! Hot rotis tonight. Here, Rs 40.' }],
        () => {
          api.addPocket(40);
          api.jobDone('chakki', { en: '₹40', hi: '₹40' });
          st.stage = 'idle';
        }
      );
    },
    start: () => {
      api.discoverJob('chakki', true);
      api.say(
        [{ hi: 'बेटा, गेहूं की बोरी बैलगाड़ी में रखो और चक्की से आटा पिसवा लाओ। बैल अपनी मर्जी के हैं, प्यार से चलाना।', en: 'Beta, put the wheat sack on the bullock cart and get it ground at the chakki. The bullocks have their own mind — be gentle.' }],
        () => {
          st.stage = 'loading';
          env.setJobWaypoint(new THREE.Vector3(cartPos().x, 0, cartPos().z));
          api.hud('Go to the bullock cart and load the sack', 'बैलगाड़ी के पास जाकर बोरी लादो');
        }
      );
    },
  });

  api.addInteraction({
    id: 'job_chakki_load',
    position: cartPos(), // live: the cart group's own position object
    radius: 3.8,
    priority: 1,
    label: { hi: 'गेहूं की बोरी गाड़ी में लादें', en: 'Load the wheat sack onto the cart' },
    available: () => st.stage === 'loading',
    onInteract: () => {
      setLoad(0xb99a64);
      st.stage = 'driving';
      env.setJobWaypoint(CHAKKI_DOOR);
      api.hud('Drive the cart to the atta chakki (press F near the cart to mount)', 'आटा चक्की तक गाड़ी चलाओ (गाड़ी के पास F दबाओ)');
      api.audio.playThump(0.8, 90);
    },
  });

  api.addInteraction({
    id: 'job_chakki_counter',
    position: CHAKKI_DOOR,
    radius: 3,
    priority: 2,
    label: { hi: 'चक्की पर अपनी बारी का इंतज़ार करें', en: 'Wait your turn at the chakki' },
    available: () => st.stage === 'driving',
    onInteract: () => {
      const near = Math.hypot(cartPos().x - CHAKKI_DOOR.x, cartPos().z - CHAKKI_DOOR.z) < 14;
      if (!near) {
        api.say([{ hi: 'गाड़ी कहाँ है? बोरी तो गाड़ी में है — उसे चक्की के पास लाओ।', en: 'Where is the cart? The sack is on it — bring it up to the chakki.' }]);
        return;
      }
      api.say(
        [{ hi: 'अभी तीन लोग आगे हैं, बेटा — बारी का इंतज़ार करना पड़ेगा।', en: 'Three people are ahead of you, beta — you will have to wait your turn.' }],
        () => {
          // the wait: a short progress card (the chakki motor thumps meanwhile)
          let t = 0;
          let raf = 0;
          api.modal({
            en: 'Waiting your turn',
            hi: 'अपनी बारी का इंतज़ार',
            build: (body, ctrl) => {
              const p = document.createElement('p');
              p.className = 'job-line';
              p.innerHTML = '<span class="jl-en">Thump… thump… the stones turn the wheat to flour.</span><span class="jl-hi">धक… धक… पत्थर गेहूं को आटा बना रहे हैं।</span>';
              body.appendChild(p);
              const bar = document.createElement('div');
              bar.className = 'job-track';
              bar.innerHTML = '<div class="job-zone" style="left:0;width:0;background:rgba(242,178,92,.8)"></div>';
              body.appendChild(bar);
              const zone = bar.firstChild;
              let last = performance.now();
              let beat = 0;
              const frame = (now) => {
                const dt = (now - last) / 1000;
                last = now;
                t += dt;
                beat -= dt;
                if (beat <= 0) {
                  api.audio.playThump(0.7, 80);
                  beat = 0.55;
                }
                zone.style.width = `${Math.min(100, (t / 6) * 100)}%`;
                if (t >= 6) {
                  cancelAnimationFrame(raf);
                  ctrl.close();
                  return;
                }
                raf = requestAnimationFrame(frame);
              };
              raf = requestAnimationFrame(frame);
            },
            onClose: () => {
              cancelAnimationFrame(raf);
              if (t >= 6) {
                setLoad(0xf0ece0); // flour
                st.stage = 'flour';
                env.setJobWaypoint(new THREE.Vector3(DADI.x, 0, DADI.z));
                api.hud('Bring the flour home to Dadi', 'आटा दादी के पास ले चलो');
                api.say([{ hi: 'लो, ताज़ा आटा! बोरी गाड़ी में रख दी है।', en: 'Here, fresh flour! I put the sack back on your cart.' }]);
              }
            },
          });
        }
      );
    },
  });

  api.npc('shopkeeper', { x: -66.3, z: 38.6 }, Math.PI / 2, 'npc_chakki_keeper');
  // sound radar: the chakki motor thump carries
  let thump = 2;
  api.onUpdate((dt) => {
    const p = env.getPlayerPos();
    const d = Math.hypot(CHAKKI_DOOR.x - p.x, CHAKKI_DOOR.z - p.z);
    thump -= dt;
    if (d < 40 && thump <= 0) {
      api.audio.playThump(Math.max(0.1, 1 - d / 40) * 0.8, 70);
      thump = 1.1;
    }
  });
}
