/**
 * MISSIONS ON THE APPROVED MAP (S7 sprint, missions agent, 21-22 Nov 2026).
 *
 * The missions, side jobs and talking NPCs were written for the old village. Under ?layout=new the places moved, the old
 * abadi rows, the chowk tea stall, the old canal and the highway strip are gone, and the side jobs had been left 600 m west
 * of the village since the 1 Nov map shift. This file says where each of those points goes on the approved map.
 *
 *   spot(name, oldValue)   the point to use: under ?layout=old ALWAYS `oldValue` untouched (nothing changes there); under
 *                          ?layout=new the approved-map value when this file has one, else `oldValue`.
 * Every value here is checked by `node tools/missions-check.mjs` (open ground, off the roads, reachable on foot / cycle /
 * tractor, routes clear of buildings, points of a place carried with the place).
 *
 * Rules used to pick each spot (plain words):
 * - a point that belongs to a place (a counter, a courtyard, a doorstep) is carried WITH the place: movedWith / localPt;
 * - a job whose place no longer exists goes to the same kind of place on the approved map (the chowk pump -> the hand pump
 *   on the square; the mango baagh -> the map's mango baagh; the peepal posters -> the map's peepal by the chaupal);
 * - a free spot is the nearest open ground to where the story puts it, found once with tools/missions-check.mjs's world
 *   and written down here (the map file is fixed; the checker fails if the map changes under it).
 */
import { isNewLayout, getObjects, getRoads, movedWith, movedYaw, oldAnchor } from './layout/layout.js';
import { ANCHORS, localPt } from './anchors.js';
import { segNear } from './layout/layoutCore.js';

const NEW = isNewLayout();

// ------------------------------------------------------------------ helpers
const road = (id) => getRoads().find((r) => r.id === id);
/** The point on road `id`'s centreline nearest to (x, z). */
function onRoad(id, x, z) {
  const r = road(id);
  if (!r) return { x, z };
  let best = null;
  for (let i = 0; i + 1 < r.pts.length; i++) { const s = segNear(x, z, r.pts[i], r.pts[i + 1]); if (!best || s.d < best.d) best = s; }
  return { x: +best.qx.toFixed(2), z: +best.qz.toFixed(2) };
}
/** Where the centrelines of two roads cross (the crossing nearest to the hint point (hx, hz)), or null. */
function crossing(idA, idB, hx, hz) {
  const A = road(idA), B = road(idB);
  if (!A || !B) return null;
  const found = [];
  for (let i = 0; i + 1 < A.pts.length; i++) for (let j = 0; j + 1 < B.pts.length; j++) {
    const [p, q] = [A.pts[i], A.pts[i + 1]], [r, s] = [B.pts[j], B.pts[j + 1]];
    const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
    if (Math.abs(d) < 1e-9) continue;
    const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d;
    const u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) found.push({ x: +(p[0] + t * (q[0] - p[0])).toFixed(2), z: +(p[1] + t * (q[1] - p[1])).toFixed(2) });
  }
  found.sort((a, b) => Math.hypot(a.x - hx, a.z - hz) - Math.hypot(b.x - hx, b.z - hz));
  return found[0] || null;
}
/** A world direction (dx, dz) that belongs to place `id`, turned with it (identity under the old layout). */
function turnVec(id, dx, dz) {
  const o = oldAnchor(id), n = ANCHORS[id];
  if (!o) return { x: dx, z: dz };
  const m = movedWith(id, o.x + dx, o.z + dz);
  return { x: m.x - n.x, z: m.z - n.z };
}
/** A point in the house's own frame (local +z = its front, same frame src/village.js builds the house in). */
const house = (lx, lz) => localPt('house', lx, lz);
const firstObj = (prefix) => getObjects(prefix)[0] || null;
/** The centre of a map object (rect centre, or circle centre). */
const centreOf = (o) => (o ? (o.rect ? { x: o.rect.cx, z: o.rect.cz } : { x: o.cx, z: o.cz }) : null);

// ------------------------------------------------------------------ the approved-map values (built once, only under new)
let TABLE = null;
function table() {
  if (TABLE) return TABLE;
  const T = {};
  // ---- the house: Dada stands 3 m along the courtyard from Maa; under the old turn (5 deg) that was a world +x step, the
  // house now turns 85 deg, so the same courtyard spot is carried with the house instead of stepping out through its wall.
  T.dada = (old) => { const v = turnVec('house', 3, 0); return { x: old.x - 3 + v.x, z: old.z + v.z }; }; // old = Maa + 3 m world-east
  T.house_yaw = (old) => movedYaw('house', old); // a facing that belongs to the house (Maa, Dada, Pitaji, the roof scene)
  // ---- M4: the postman's 2-stop round. Old: out of the gate and 6 m along the lane; the house now faces the ring road, so
  // the second stop would be on the road. He walks along the house front instead (gate -> 6 m along the verge).
  T.postman_walk = (old) => [old[0], house(-6, 8.9)];
  // ---- M2: the child's school run, along the roads of the approved map: house gate -> ring road -> main road -> outer lane
  // south -> the school gate (the school itself did not move, so its gate points are today's).
  T.child_walk = (old) => {
    const gate = old[0];
    const a = onRoad('ring_road', gate.x, gate.z);
    const corner = { x: 668.1, z: 51.8 }; // the ring road's south-east corner (map point)
    const b = crossing('ring_road', 'main_road', 602, 66) || onRoad('ring_road', 602, 66);
    const c = crossing('main_road', '14_Outer lane, south', 597, 84) || onRoad('main_road', 597, 84);
    const [s18, s14, s10] = old.slice(-3); // schoolPt(0, -18 / -14 / -10): the yard gate line, unchanged (school untouched)
    const there = [gate, a, corner, b, c, s18, s14, s10];
    return [...there, s14, s18, c, b, corner, a];
  };
  // ---- vehicles (src/vehicles.js spawnVehicles). Old: x -48..-36, 600 m west of the village since the 1 Nov map shift (left
  // as it is under ?layout=old). New: on the open ground behind the house, next to the wheat sack pile (M3 loads the trolley
  // there; M7 drives out from there), the bullock cart beside it, the spare cycle at the gate.
  T.vehicles = () => ({
    tractor: { x: 643.7, z: 31.0, yaw: 0 }, // trolley rests 4.6 m south of it (643.7, 35.6); clear of the game's own collider box at x 642.2-645, z 26.8-28.2 (headless probe, 22 Nov)
    cart: { ...nearCart(), yaw: Math.PI },
    bike: { ...house(3.2, 9.0), yaw: ANCHORS.house.ry + Math.PI / 2 },
  });
  // ---- free roam: Dadi (pump, chakki and every Dadi job). Old (-43.3, 41.8) was off the village. New: just outside the
  // house gate, facing out, where the bullock cart and the buckets are brought to her.
  T.dadi = () => ({ ...house(-2.6, 8.7), yaw: ANCHORS.house.ry });
  // (the petrol pump attendant is moved to the new petrol pump by src/layout/layout-wiring-entry.js, not here)
  // ---- side job 7 (pump): "the pump at the chowk" = the hand pump on the square (map object), worked from its front.
  T.pump_job = () => {
    const sq = ANCHORS.chowk;
    const pumps = getObjects('new_Hand pump').map((o) => ({ o, c: centreOf(o) })).sort((a, b) => Math.hypot(a.c.x - sq.x, a.c.z - sq.z) - Math.hypot(b.c.x - sq.x, b.c.z - sq.z));
    const p = pumps[0];
    if (!p) return null;
    const f = p.o.rect ? p.o.rect.front : [0, 1];
    return { pump: null /* the map's own pump stands there: the job builds none */, at: { x: +(p.c.x + f[0] * 1.0).toFixed(2), z: +(p.c.z + f[1] * 1.0).toFixed(2) }, mapPump: p.c };
  };
  // ---- peepal poster board: the village peepal of the approved map stands on its chabutra by the chaupal.
  T.posters = () => {
    const plat = getObjects('new_peepal').find((o) => o.kind === 'solids');
    if (!plat) return null;
    const c = centreOf(plat), r = plat.r || 3.4;
    // on the side that looks at the nearest road, 0.8 m off the platform's edge
    const rd = onRoad('ring_road', c.x, c.z);
    const dx = rd.x - c.x, dz = rd.z - c.z, L = Math.hypot(dx, dz) || 1;
    return { x: +(c.x + dx / L * (r + 0.8)).toFixed(2), z: +(c.z + dz / L * (r + 0.8)).toFixed(2) };
  };
  // ---- chaat thela (side-job stall). Old: a second thela at (-62.8, 50.5), off the village. New: no second cart; the seller
  // stands beside the chaat place's own thela (behind it is shut in by a shop) and the buy point is in front of it (local +z = its front).
  T.chaat_stall = () => ({ cart: null, sellerAt: localPt('chaat', -2.9, 0), sellerYaw: ANCHORS.chaat.ry, buyAt: localPt('chaat', 0, 2.6) }); // the seller at the side of his thela, facing the customers

  // ---- kulfiwala: pushes his cart round the lanes by the house: ring road (house side) -> the kiosk lane (inner_se) and back.
  T.kulfi_route = () => {
    const corner = { x: 668.1, z: 51.8 };
    const a = onRoad('ring_road', 669.6, 24);
    const b = crossing('ring_road', 'inner_se', 624, 60) || { x: 624, z: 60.5 };
    const c = onRoad('inner_se', 624, 26);
    return [a, corner, b, c, b, corner];
  };
  // ---- kanche and stapu "with the kids near the chowk": nearest open patch to the square (ring 1.2 m, kids at 1.7 m, chalk
  // grid 3.2 m east), off every road by 0.5 m.
  T.kanche = () => ({ x: 583.4, z: 26.9 });
  // ---- doodhwala: "his round starts by the halwai". The old spot (6.5 m in front of the counter) is inside a golgappa kiosk
  // on the approved map; he stands on the open ground nearest to it instead.
  T.doodh = () => ({ x: 619.9, z: 6.6 }); // 2.1 m from the old spot, beside the halwai's frontage
  // ---- trolley gate challenge: the narrow khet gate, on the field nearest the house that has room for the gate walls
  // (17 m), the yard behind it and a 14 m run-up. Old (30, 40) was off the village.
  T.gate = () => ({ x: 684.4, z: 129.3 });
  // ---- patang: the kid with the charkhi near the chowk; kites come down on open play grounds round the village.
  T.patang = () => {
    const starter = { x: 587.0, z: 33.5 }; // open ground on the square's west corner (the kids stand within 3.6 m of it)
    const grounds = [...getObjects('new_Kids play patch'), ...getObjects("new_Kids' play corner"), ...getObjects('new_cricket')]
      .map(centreOf).filter(Boolean)
      .sort((a, b) => Math.hypot(a.x - starter.x, a.z - starter.z) - Math.hypot(b.x - starter.x, b.z - starter.z))
      .slice(0, 5);
    const kids = [{ x: -2, z: 1.5 }, { x: 2, z: 1.5 }, { x: 0, z: 3 }].map((o) => ({ x: starter.x + o.x, z: starter.z + o.z }));
    return { starter, spots: grounds, kids };
  };
  // ---- the panchayat notice board interaction: the approved map has a real notice board (map objects layer).
  T.notice = () => {
    const o = firstObj('new_notice');
    if (!o || !o.rect) return null;
    const f = o.rect.front;
    return { x: +(o.rect.cx + f[0] * 1.2).toFixed(2), z: +(o.rect.cz + f[1] * 1.2).toFixed(2) };
  };
  // ---- M7: the mango baagh = the map's 'Mango baagh' ground (empty on the map: the game's six baagh trees stand on it).
  T.baagh = () => centreOf(firstObj('new_Mango baagh'));
  T.gilli_marker = () => ({ x: ANCHORS.gilli.x, z: ANCHORS.gilli.z }); // the gilli-danda spot (untouched); the old marker was off the map
  TABLE = T;
  return T;
}

// the bullock cart: beside the tractor, west of it, same heading (checked clear by tools/missions-check.mjs)
function nearCart() { return { x: 639.4, z: 31.0 }; }

/** The point to use for `name`: the old value under ?layout=old, the approved-map value under ?layout=new. */
export function spot(name, oldValue) {
  if (!NEW) return oldValue;
  const f = table()[name];
  if (!f) return oldValue;
  const v = f(oldValue);
  return v === undefined ? oldValue : v;
}

/** Vehicle spawn points { bike, tractor, cart: { x, z, yaw } } (src/vehicles.js). Old values exactly as before. */
export function vehicleSpawns() {
  return spot('vehicles', { bike: { x: -48, z: 28, yaw: 0 }, tractor: { x: -45, z: 26, yaw: Math.PI }, cart: { x: -36, z: 50, yaw: Math.PI * 0.5 } });
}

/**
 * True when (x, z) is inside (or within `pad` m of) one of the approved map's own solids: a new house, shop, kiosk, cart,
 * well, pump... (the places that kept their old model are not counted). Always false under the old layout.
 */
let SOLIDS = null;
export function inMapSolid(x, z, pad = 0.2) {
  if (!NEW) return false;
  if (!SOLIDS) SOLIDS = getObjects('solids').filter((o) => o.rect && (o.h || 0) >= 0.5 && o.prefix !== 'canal_new').map((o) => o.rect);
  for (const r of SOLIDS) {
    const dx = x - r.cx, dz = z - r.cz;
    if (Math.abs(dx) > r.w + r.d || Math.abs(dz) > r.w + r.d) continue;
    const c = Math.cos(r.ry), s = Math.sin(r.ry);
    const lx = dx * c - dz * s, lz = dx * s + dz * c; // into the rect's own frame (rotation.y = ry)
    if (Math.abs(lx) <= r.w / 2 + pad && Math.abs(lz) <= r.d / 2 + pad) return true;
  }
  return false;
}

/** Where the mission checker expects the M7 baagh to be (null under the old layout). */
export function mangoBaaghArea() {
  return NEW ? table().baagh() : null;
}

