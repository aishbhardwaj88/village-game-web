/**
 * THE LAYOUT LOADER (S7 sprint, 21 Nov 2026). One place every agent reads the approved village map from.
 * API (documented for the other agents in docs/s7/layout.md):
 *
 *   isNewLayout()            true unless the page explicitly asks for the retired map (?layout=old). Default: new (DEFAULT_LAYOUT), flipped 23 Nov once qa-audit.md's punch list closed.
 *   layoutMode()             'new' | 'old'
 *   getLayout()              { places, list, roads, objects, canal } (the whole approved map, computed once)
 *   getPlace(id)             one place: { id, name, hi, x, z, ry, front, frontYaw, offsetDeg, row, existing, minor, before }
 *   getRoads()               [{ id, kind, width, name, pts: [[x, z]...] }]   (kind: highway | road | lane | back | track)
 *   getObjects(kindOrPrefix) objects of a kind ('ground' | 'solids' | 'trees' | 'crops') or whose label starts with a prefix
 *                            ('new_house', 'new_sqx', 'new_kiosk', 'new_mango'...). Each: { id, prefix, name, kind, h, cx, cz,
 *                            rings | r, rect?: { cx, cz, w, d, ry, front } } (rect = the footprint as an oriented box, front
 *                            on the side that faces its road; ry turns a model built front = +z onto it).
 *   getCanal()               { centre_x, width, bank, bank_track_x, green_strip }
 *
 * Helpers for files that place things by hand (wiring, docs/s7/layout.md):
 *   layoutTurnDeg(id, oldDeg)  a place's map turn (deg, three.js rotation.y = -turn): oldDeg under the old layout
 *   layoutYaw(id, oldYaw)      a place's yaw (rad): oldYaw under the old layout
 *   movedWith(id, x, z)        a world point that belongs to place `id` (an NPC spot, a door mark), carried with the place
 *   movedYaw(id, yaw)          a yaw that belongs to place `id`, turned with it
 * All four are the identity under the old layout, so ?layout=old stays exactly as today.
 *
 * Yaw convention: ry = three.js rotation.y; local +z = front, so front = (sin ry, cos ry). place.ry already includes the
 * per-asset front offset (src/layout/frontOffsets.js): feed it straight to the anchor.
 */
import MAP_DATA from './mapData.json' with { type: 'json' };
import SHOP_RECTS from './shopRects.json' with { type: 'json' };
import { DEG, wrapPi, roadBBox } from './layoutCore.js';
import { FRONT_OFFSETS } from './frontOffsets.js';
import { MOVE_SHIFTS } from './placeMoves.js';

/** The integrator flips this to 'new' once every district is moved. */
export const DEFAULT_LAYOUT = 'new';

function readMode() {
  // Node tools set __DOPAHAR_LAYOUT before importing the game's modules; __dopaharLayout is the same override the perf branch's
  // zoneManager.currentLayout() reads, so both answer alike
  for (const g of [globalThis.__DOPAHAR_LAYOUT, globalThis.__dopaharLayout]) if (g === 'new' || g === 'old') return g;
  try {
    const q = new URLSearchParams((globalThis.location && globalThis.location.search) || '').get('layout');
    if (q === 'new' || q === 'old') return q;
  } catch (e) { /* no location (Node) */ }
  return DEFAULT_LAYOUT;
}
const MODE = readMode(); // fixed for the whole session: every module sees the same answer

export const layoutMode = () => MODE;
export const isNewLayout = () => MODE === 'new';

let LAYOUT = null;
export function getLayout() {
  if (!LAYOUT) {
    const places = {};
    for (const p of MAP_DATA.places) places[p.id] = p;
    // 26 Nov: shops stand exactly on the approved map's drawn plot, facing the map's own front (tools/shop-rects-pack.mjs). The pack's
    // own rect (road-snapped, turned) is replaced for the ~40 shops where it moved the plot or turned the front off the marker.
    for (const o of MAP_DATA.objects) { const r = o.rings && o.rings[0] && SHOP_RECTS.rects[`${o.label}@${o.rings[0][0][0]},${o.rings[0][0][1]}`]; if (r) o.rect = { ...(o.rect || {}), ...r }; }
    LAYOUT = { places, list: MAP_DATA.places, roads: MAP_DATA.roads.map((r) => ({ ...r, bbox: roadBBox(r) })), objects: MAP_DATA.objects, canal: MAP_DATA.canal, nudges: MAP_DATA.nudges, galiClips: MAP_DATA.galiClips, galiShifts: MAP_DATA.galiShifts || [] };
  }
  return LAYOUT;
}
export const getPlace = (id) => getLayout().places[id] || null;
export const getRoads = () => getLayout().roads;
export const getCanal = () => getLayout().canal;
const KINDS = new Set(['ground', 'solids', 'trees', 'crops']);
export function getObjects(kindOrPrefix) {
  const all = getLayout().objects;
  if (!kindOrPrefix) return all;
  if (KINDS.has(kindOrPrefix)) return all.filter((o) => o.kind === kindOrPrefix);
  return all.filter((o) => o.prefix.startsWith(kindOrPrefix));
}

// ------------------------------------------------------------------ anchors
/**
 * ANCHORS ids -> the map place that decides them. Most are the same id. The v2 yards ride on the place they replaced
 * (src/anchors.js: post = onMap('yard_post') ...), the gali labels on the map's gali labels.
 */
export const ANCHOR_SOURCE = {
  yard_post: 'post', yard_ration: 'ration', yard_chakki: 'chakki', yard_dairy: 'dairy', yard_khalihan: 'khalihan',
  yard_tubewell: 'tubewell', yard_tvhouse: 'tvhouse', yard_gurukul: 'gurukul',
  eastgali: 'new_East gali', westgali: 'new_West gali',
};

const UNTOUCHED = new Set(); // anchors the map keeps exactly as they are (layoutTurnDeg / movedWith are the identity for them)
const OLD = {}; // the anchors exactly as the old layout has them (snapshot before any override)
let ANCH = null;
/** Before/after report of the anchor override (tools/layout-tests.mjs prints it). */
export const anchorReport = [];

/**
 * Called once by src/anchors.js with its finished table. Snapshots the old values; under ?layout=new overwrites every anchor
 * the approved map positions (x, z, ry). Anchors the map does not position keep their old value.
 */
export function applyLayoutToAnchors(anchors) {
  ANCH = anchors;
  for (const [id, a] of Object.entries(anchors)) OLD[id] = { x: a.x, z: a.z, ry: a.ry || 0 };
  const L = getLayout();
  for (const id of Object.keys(anchors)) {
    const src = ANCHOR_SOURCE[id] || id;
    const p = L.places[src];
    if (!p) continue;
    if (p.untouched) { UNTOUCHED.add(id); anchorReport.push({ id, src, old: OLD[id], next: OLD[id], untouched: true, beforeMatches: true }); continue; }
    const label = src.startsWith('new_') && /gali/.test(src);
    const next = { x: p.x, z: p.z, ry: label ? anchors[id].ry || 0 : p.ry };
    anchorReport.push({ id, src, old: OLD[id], next, beforeMatches: p.before ? Math.hypot(p.before.x - OLD[id].x, p.before.z - OLD[id].z) < 0.6 : null });
    if (MODE === 'new') { anchors[id].x = next.x; anchors[id].z = next.z; anchors[id].ry = next.ry; }
  }
  return anchors;
}

/** The yaw the game really gave place `id` under the old layout (a hard-coded turn where one exists). */
function oldYaw(id) {
  const e = FRONT_OFFSETS[id];
  if (e && e.oldYawDeg !== undefined) return e.oldYawDeg * DEG;
  return OLD[id] ? OLD[id].ry : 0;
}

/** A place's map turn in degrees (three.js rotation.y = -turn). Old layout: `oldDeg` unchanged. */
export function layoutTurnDeg(id, oldDeg) {
  if (MODE !== 'new' || !ANCH || !ANCH[id] || UNTOUCHED.has(id)) return oldDeg;
  return -ANCH[id].ry / DEG;
}
/** A place's yaw in radians. Old layout: `oldYaw` unchanged. */
export function layoutYaw(id, oldYawRad) {
  if (MODE !== 'new' || !ANCH || !ANCH[id] || UNTOUCHED.has(id)) return oldYawRad;
  return ANCH[id].ry;
}
/** Turn (rad) place `id` makes from the old layout to the new one (0 under the old layout). */
export function placeTurn(id) {
  if (MODE === 'new' && UNTOUCHED.has(id) && MOVE_SHIFTS[id]) return MOVE_SHIFTS[id].turn || 0; // 25 Nov: an untouched ground turned to face its road
  if (MODE !== 'new' || !ANCH || !ANCH[id] || !OLD[id] || UNTOUCHED.has(id)) return 0;
  return wrapPi(ANCH[id].ry - oldYaw(id));
}
/** A world point that belongs to place `id`, carried with the place (rotated about it and moved). Identity under the old layout. */
export function movedWith(id, x, z) {
  // 25 Nov: an untouched place that was only slid off a road (placeMoves.js) carries its literal points by the same slide
  if (MODE === 'new' && UNTOUCHED.has(id) && MOVE_SHIFTS[id] && ANCH && ANCH[id]) {
    const m = MOVE_SHIFTS[id], n = ANCH[id], c = Math.cos(m.turn), s = Math.sin(m.turn), ox = n.x - m.dx, oz = n.z - m.dz;
    return { x: n.x + (x - ox) * c + (z - oz) * s, z: n.z - (x - ox) * s + (z - oz) * c };
  }
  if (MODE !== 'new' || !ANCH || !ANCH[id] || !OLD[id] || UNTOUCHED.has(id)) return { x, z };
  const o = OLD[id], n = ANCH[id], t = placeTurn(id), c = Math.cos(t), s = Math.sin(t);
  const dx = x - o.x, dz = z - o.z;
  return { x: n.x + dx * c + dz * s, z: n.z - dx * s + dz * c };
}
/** A yaw that belongs to place `id`, turned with it. Identity under the old layout. */
export const movedYaw = (id, yaw) => yaw + placeTurn(id);
/** True when the approved map keeps this anchor exactly as today. */
export const isUntouched = (id) => UNTOUCHED.has(id);
/**
 * The footprint to BUILD an object on, in the shape the kits use ({ x, z, ry, width, depth }): the snapped rectangle
 * (o.rect: turned square to its road, moved off roads and neighbours, see docs/s7/layout.md "road snap"), or null for
 * objects that are not a 4-corner footprint. Use this instead of re-deriving a rectangle from o.rings[0].
 */
export function footprintOf(o) {
  const r = o && o.rect;
  return r ? { x: r.cx, z: r.cz, ry: r.ry, width: r.w, depth: r.d, front: r.front } : null;
}
/** The old (today's) anchor of a place, whatever the layout. */
export const oldAnchor = (id) => (OLD[id] ? { ...OLD[id] } : null);
