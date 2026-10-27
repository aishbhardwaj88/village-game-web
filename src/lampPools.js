import * as THREE from 'three';

/**
 * Night light pools on the ground (J0, 27 Oct). No light objects and no geometry: the ground shader
 * (applyGroundNoiseDetail) adds a warm falloff around the POOL_N lamps nearest the player. Lamps register
 * their world position when their zone builds; update() picks the nearest each frame, only at night.
 */
export const POOL_N = 12;
export const POOL_RADIUS = 5.5;
export const lampPoolUniform = { value: Array.from({ length: POOL_N }, () => new THREE.Vector3(0, 0, 0)) };
export const lampPoolMix = { value: 0 };

const sites = []; // { x, z, owner } - owner is the lamp group, so a streamed-out zone drops its pools
const _pick = [];

export function registerLampSites(owner, points) {
  for (const p of points) sites.push({ x: p.x, z: p.z, owner });
}

export function updateLampPools(px, pz, mix) {
  lampPoolMix.value = mix;
  if (mix <= 0.001) return;
  _pick.length = 0;
  for (const s of sites) {
    let o = s.owner; let visible = true;
    while (o) { if (!o.visible) { visible = false; break; } o = o.parent; }
    if (!visible) continue;
    const d = (s.x - px) * (s.x - px) + (s.z - pz) * (s.z - pz);
    if (d > 70 * 70) continue;
    _pick.push({ s, d });
  }
  _pick.sort((a, b) => a.d - b.d);
  for (let i = 0; i < POOL_N; i++) {
    const v = lampPoolUniform.value[i];
    if (i < _pick.length) v.set(_pick[i].s.x, _pick[i].s.z, 1); else v.set(0, 0, 0);
  }
}
