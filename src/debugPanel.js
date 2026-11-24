/**
 * Lag-hunting tools, all inert unless the address has ?debug=1 (panel) or ?off=... (switches).
 * ?off= takes a comma list: props, vehicles, walls (handled in main.js / elsewhere), plus
 * shadows, post, crops, npcs, traffic, vegetation (handled here). Example: ?off=shadows,post
 * Hidden groups are only made invisible (draw cost gone, their update code still runs).
 */
import { propDebugText } from './propGate.js';
const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const OFF = new Set((q.get('off') || '').split(',').map((s) => s.trim()).filter(Boolean));
export const DEBUG = q.get('debug') === '1';

const HIDE = {
  crops: /^(field|crop)/,
  npcs: /^(npc_|ambient_(kids|walkers)|.*_people$)/,
  traffic: /^(jeep|scooters|cyclist_events|road_events|ambient_(birds|hens|butterflies|cattle|smoke)|animals_extra|cattle_herd|dog_pack|roof_monkeys|dust_motes|gully_life|main_road_life|kachcha_cattle)/,
  vegetation: /^(vegetation|trees|flowering_plants|tree_)/,
};

export function setupDebug(renderer, scene) {
  if (OFF.has('shadows')) renderer.shadowMap.enabled = false;
  const patterns = Object.keys(HIDE).filter((k) => OFF.has(k)).map((k) => HIDE[k]);
  if (!DEBUG && !patterns.length) return { frame() {} };

  let el = null;
  if (DEBUG) {
    el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:4px;left:4px;z-index:99999;font:11px/1.35 monospace;color:#fff;background:rgba(0,0,0,.55);padding:4px 6px;pointer-events:none;white-space:pre';
    document.body.appendChild(el);
  }
  const ft = []; // [timestamp, frame ms] for the last 5 s
  let last = 0, lastSweep = 0, casters = 0, tris = 0, calls = 0, geos = 0, texs = 0, lastText = 0;
  const sweep = () => {
    let c = 0;
    scene.traverse((o) => {
      if (patterns.length && o.name) for (const p of patterns) if (p.test(o.name)) { o.visible = false; break; }
      if (o.isMesh && o.castShadow && o.visible) c++;
    });
    casters = c;
  };
  return {
    frame(now) {
      if (last) { ft.push(now, now - last); }
      last = now;
      while (ft.length && ft[0] < now - 5000) ft.splice(0, 2);
      const i = renderer.info;
      calls = i.render.calls; tris = i.render.triangles; geos = i.memory.geometries; texs = i.memory.textures;
      if (now - lastSweep > 1500) { lastSweep = now; sweep(); }
      if (el && now - lastText > 500) {
        lastText = now;
        let sum = 0, worst = 0, n = ft.length / 2;
        for (let k = 1; k < ft.length; k += 2) { sum += ft[k]; if (ft[k] > worst) worst = ft[k]; }
        const avg = n ? sum / n : 0;
        const mem = performance.memory ? `\nheap ${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)} MB` : '';
        el.textContent = `fps ${avg ? (1000 / avg).toFixed(0) : '-'} avg | worst ${worst.toFixed(0)} ms (5 s)\ncalls ${calls}  tris ${(tris / 1000).toFixed(0)}k\ngeos ${geos}  tex ${texs}\nshadow casters ${casters}${mem}\n${propDebugText()}${OFF.size ? '\noff: ' + [...OFF].join(',') : ''}`;
      }
    },
  };
}
