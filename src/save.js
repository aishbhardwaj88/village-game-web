/**
 * Save/continue (queue item 7) — one small localStorage object: quest progress plus
 * the chosen quality setting (quality itself already persists separately via
 * src/quality.js's own key; kept here too so a save is a complete, self-contained
 * snapshot of "what session are we resuming"). No world/NPC-position state — see
 * docs/parked.md for what "Continue" does and doesn't restore.
 *
 * S7 (21 Nov): saves carry a version and the layout they were made in (src/layout/layout.js). A save from another version or
 * the other layout keeps its progress but never its position: `posReset` is set and any stored `player` spot is dropped, and
 * safeSpawn() moves a spawn point that would land inside a building onto the nearest road.
 */
import { layoutMode, getLayout, isNewLayout } from './layout/layout.js';
import { boxCorners, localToWorld } from './layout/layoutCore.js';
import { EXISTING_FOOTPRINTS } from './layout/footprints.js';

const STORAGE_KEY = 'dopahar_save';
/** Bumped 21 Nov (S7): the village moved onto the approved map, so a position saved before means nothing now. */
export const SAVE_VERSION = 2;

/** Try/catch wrapped — private browsing / blocked storage must never break startup,
 * just behave as if there were no save. */
export function loadSavedGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.questStep !== 'string') return null;
    if (data.version !== SAVE_VERSION || data.layout !== layoutMode()) {
      // an older save (no version) or one made in the other layout: progress is kept, any position is not
      delete data.player;
      data.posReset = true;
    }
    return data;
  } catch (e) {
    return null;
  }
}

/** `roam` = { storyDone, pocket, discovered, jobsDone } (free-roam state, docs/MISSIONS_PLAN.md) — optional so older callers/saves keep working.
 * `player` = optional { x, z }; only ever restored through safeSpawn(). */
export function saveGame({ questStep, quality, roam, player }) {
  try {
    const data = { version: SAVE_VERSION, layout: layoutMode(), questStep, quality, roam, savedAt: Date.now() };
    if (player && Number.isFinite(player.x) && Number.isFinite(player.z)) data.player = { x: +player.x.toFixed(2), z: +player.z.toFixed(2) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // storage blocked/unavailable — session continues, just won't persist
  }
}

// ------------------------------------------------------------------ safe spawn (new layout)
let QUADS = null;
/** Every building footprint of the approved map (existing places + every solid), as world quads. */
function buildingQuads() {
  if (QUADS) return QUADS;
  const L = getLayout();
  QUADS = [];
  for (const [id, fp] of Object.entries(EXISTING_FOOTPRINTS)) {
    const p = L.places[id];
    if (!p || fp.open) continue;
    const [x0, x1, z0, z1] = fp.box;
    QUADS.push([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([lx, lz]) => { const q = localToWorld(p.x, p.z, p.ry, lx, lz); return [q.x, q.z]; }));
  }
  for (const o of L.objects) if (o.rect && (o.h || 0) >= 0.5) QUADS.push(boxCorners(o.rect.cx, o.rect.cz, o.rect.w, o.rect.d, o.rect.ry));
  return QUADS;
}
function insideQuad(x, z, q, pad) {
  // inside the quad grown by `pad` metres
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez) || 1;
    const cx = (q[0][0] + q[2][0]) / 2, cz = (q[0][1] + q[2][1]) / 2;
    const side = Math.sign(ex * (cz - a[1]) - ez * (cx - a[0]));
    if (side * (ex * (z - a[1]) - ez * (x - a[0])) / L < -pad) return false;
  }
  return true;
}
/** Is (x, z) inside (or within `pad` m of) any building of the approved map? */
export function inBuilding(x, z, pad = 0.6) {
  return buildingQuads().some((q) => insideQuad(x, z, q, pad));
}

/**
 * A spawn point that is never inside a building. Old layout: returned unchanged (today's behaviour). New layout: if `pos`
 * is inside or touching a building it moves to the nearest clear point on a road or lane centreline (galis and farm tracks
 * are not used), searching outward from `pos`.
 */
export function safeSpawn(pos) {
  if (!isNewLayout() || !pos) return pos;
  if (!inBuilding(pos.x, pos.z)) return pos;
  const roads = getLayout().roads.filter((r) => r.kind === 'road' || r.kind === 'lane' || r.kind === 'highway');
  const cands = [];
  for (const r of roads) for (let i = 0; i + 1 < r.pts.length; i++) {
    const a = r.pts[i], b = r.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let t = 0; t <= L; t += 2) {
      const x = a[0] + (b[0] - a[0]) * t / (L || 1), z = a[1] + (b[1] - a[1]) * t / (L || 1);
      cands.push({ x, z, d: Math.hypot(x - pos.x, z - pos.z) });
    }
  }
  cands.sort((p, q) => p.d - q.d);
  for (const c of cands) if (!inBuilding(c.x, c.z, 1.0)) return { x: +c.x.toFixed(2), z: +c.z.toFixed(2) };
  return pos;
}
