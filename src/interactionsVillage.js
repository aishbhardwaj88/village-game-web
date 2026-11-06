// More "things you can do" (VILLAGE_VOCABULARY s9) that were still missing: sit on the jhoola
// (the A-frame swing by the pond, src/villageFurniture.js) and feed a gaushala cow a roti.
// Positions come from src/anchors.js so a map change moves them. No quest state, no reward, no faith building.
import * as THREE from 'three';
import { ANCHORS, localPt } from './anchors.js';
import { registerInteraction } from './interactions.js';
import { FURNITURE_SPOTS } from './villageFurniture.js';

const V = (p) => new THREE.Vector3(p.x, 0, p.z);

export function createInteractionsVillage(scene, ctx) {
  const say = (en, hi) => ctx.dialogue.say([{ en, hi }]);

  // ---- jhoola: the view sways gently for a few seconds, with a rope creak ----
  const sp = FURNITURE_SPOTS.jhoola;
  if (sp && ANCHORS[sp.at]) {
    let t0 = -1, raf = 0;
    const cvs = () => document.querySelector('canvas');
    const sway = (now) => {
      const el = cvs(); if (!el) return;
      const k = (now - t0) / 1000, dur = 6;
      if (k >= dur) { el.style.transform = ''; raf = 0; return; }
      const env = Math.sin(Math.PI * k / dur); // ease in and out
      el.style.transform = `rotate(${(Math.sin(k * 2.6) * 0.9 * env).toFixed(3)}deg)`;
      raf = requestAnimationFrame(sway);
    };
    registerInteraction({
      id: 'jhoola_swing', position: V(localPt(sp.at, sp.lx, sp.lz)), radius: 2.8, priority: 0.5,
      label: { hi: 'झूला झूलें', en: 'Sit on the jhoola' },
      available: () => !raf,
      onInteract: () => {
        ctx.audio.playBlip?.(180, 0.25, 0.4, 'triangle');
        setTimeout(() => ctx.audio.playBlip?.(170, 0.25, 0.4, 'triangle'), 1100);
        setTimeout(() => ctx.audio.playBlip?.(180, 0.25, 0.4, 'triangle'), 2200);
        t0 = performance.now(); raf = requestAnimationFrame(sway);
        say('The rope creaks. You push off with your toes and the whole pond tilts back and forth.', 'रस्सी चरमराती है। पंजों से धक्का दिया और पूरा तालाब आगे-पीछे झूलने लगा।');
      },
    });
  }

  // ---- feed a gaushala cow a roti (open yard, clear of the troughs and neem platform) ----
  registerInteraction({
    id: 'feed_gaushala_cow', position: V(localPt('gaushala', -4, 5)), radius: 3, priority: 0.5,
    label: { hi: 'गाय को रोटी खिलाएं', en: 'Feed a cow a roti' },
    onInteract: () => {
      ctx.audio.playBlip?.(260, 0.12, 0.35, 'triangle');
      say('A cow ambles over, takes the roti from your hand with a rough tongue and chews slowly.', 'एक गाय पास आई, खुरदरी जीभ से हाथ से रोटी ले ली और धीरे-धीरे चबाने लगी।');
    },
  });
}
