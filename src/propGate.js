/**
 * Distance gate for load-on-approach content (props, vehicles). Loads when the player comes within LOAD_M of the
 * centre, frees it (geometry, materials, textures) beyond UNLOAD_M. Polled twice a second, no per-frame cost.
 * makeGroup() gives an empty THREE.Group; load(group) returns a promise that fills it.
 * 25 Nov 2026, lag fix (GPU texture memory, draw calls).
 */
export const LOAD_M = 50, UNLOAD_M = 120; // 70 m gap: no load/dispose thrash when walking along the edge

// Texture uploads spread over frames: a loaded prop joins the scene only after its textures are on the GPU, and at most
// ONE texture is uploaded per animation frame, so 365 textures never land in one frame. main.js calls setPropGateRenderer.
let gateRenderer = null;
const uploaded = new WeakSet();
export function setPropGateRenderer(r) { gateRenderer = r; }
function pendingTextures(obj) {
  const out = [];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material || [])) for (const k in m) { const t = m[k]; if (t && t.isTexture && !uploaded.has(t) && !out.includes(t)) out.push(t); }
  });
  return out;
}
function throttledAdd(h, onDrained) {
  const realAdd = h.add.bind(h), queue = [];
  let cur = null, curTex = [], running = false, dead = false;
  const pump = () => {
    if (dead) return;
    if (!cur) { cur = queue.shift(); curTex = cur ? pendingTextures(cur) : []; }
    if (cur) {
      const t = curTex.shift();
      if (t) { uploaded.add(t); try { gateRenderer.initTexture(t); } catch (e) { /* first render uploads it instead */ } }
      if (!curTex.length) { realAdd(cur); cur = null; }
    }
    if (cur || queue.length) requestAnimationFrame(pump); else { running = false; onDrained(); }
  };
  h.add = (...objs) => {
    if (!gateRenderer || typeof requestAnimationFrame === 'undefined') return realAdd(...objs);
    queue.push(...objs);
    if (!running) { running = true; requestAnimationFrame(pump); }
    return h;
  };
  return () => { dead = true; for (const o of [cur, ...queue]) if (o) disposeTree(o); queue.length = 0; cur = null; };
}

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
  let holder = null, ready = false, token = 0, stopAdds = null;
  const drop = () => {
    token++; stopAdds?.(); stopAdds = null;
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
      stopAdds = throttledAdd(h, () => { if (mine === token) onChange?.(); });
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
