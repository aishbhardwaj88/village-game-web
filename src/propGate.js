/**
 * Distance gate for load-on-approach content (props, vehicles). Loads when the player comes within LOAD_M of the
 * centre, frees it (geometry, materials, textures) beyond UNLOAD_M. Polled twice a second, no per-frame cost.
 * makeGroup() gives an empty THREE.Group; load(group) returns a promise that fills it.
 * 25 Nov 2026, lag fix (GPU texture memory, draw calls).
 */
export const LOAD_M = 80, UNLOAD_M = 120;

export function disposeTree(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) {
      for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose();
      m.dispose();
    }
  });
}

export function gateByDistance(scene, name, center, getPlayerPos, makeGroup, load, onChange) {
  let holder = null, ready = false, token = 0;
  const drop = () => {
    token++;
    if (holder) { scene.remove(holder); disposeTree(holder); holder = null; }
    ready = false;
  };
  const tick = () => {
    const p = getPlayerPos();
    if (!p) return;
    const d = Math.hypot(p.x - center.x, p.z - center.z);
    if (!holder && d < LOAD_M) {
      const mine = ++token, h = holder = makeGroup();
      h.name = name;
      scene.add(h);
      load(h).catch((e) => console.warn('[propGate]', name, e)).then(() => { if (mine === token) { ready = true; onChange?.(); } });
    } else if (holder && d > UNLOAD_M) {
      drop();
      onChange?.();
    }
  };
  tick();
  return setInterval(tick, 500);
}
