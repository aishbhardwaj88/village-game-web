/**
 * ROAD SNAP (run by tools/layout-pack.mjs, never at game time): the approved map is a hand drawing, so a building is often a
 * few degrees off its road or a few metres back from it. Her hard rule is "every building faces its road, edges parallel,
 * nothing on a road", so each building is nudged, as little as possible, until it holds:
 *   - turned about its own centre until its front edge is parallel to the road in front (only when it is 3-15 deg off),
 *   - moved straight forward until the gap to that road is 2 m (only when the gap is 3-8 m),
 *   - moved straight back off a carriageway it stands on (up to 2.5 m),
 * and every nudge is undone again if it would make the building overlap another one. Untouched places (school, anganwadi,
 * gurukul, sports grounds) and open ground never move. Every nudge is recorded on the item (`adjust`) and listed in
 * docs/s7/layout.md, so the owner can see exactly what moved off her drawing and by how much.
 */
import { frontProbe, roadDepth, quadOverlap, localToWorld, boxCorners, wrapPi, DEG, nearestRoad } from './layoutCore.js';
import { EXISTING_FOOTPRINTS } from './footprints.js';

const MAX_TURN = 30, PAR_OK = 3, GAP_OK = 3, GAP_TARGETS = [2, 2.5, 2.9], MAX_PUSH = 6, MAX_PUSH_PLACE = 7.5, MAX_BACK = 3.5, OVERLAP_TOL = 0.05;
export const PROP_NAME = /carts?$|hand pump|^well|old well|washing line|milestone|dung|haystack|resting|buffalo$|cattle$|kids|house plot|cricket|kabaddi|ground$|parking|tubewell|green strip|canal|culvert|washing steps|notice board|cycle stand|carrom|play corner|grazing|orchard|baagh|fields|pond|gali|square: indian flag|weekly market|goods yard|gher yard|potter|tempo|drying ground|platform|peepal|transformer|mobile tower/i;
export const CROSSING = /bridge|culvert|gate|milestone|island|platform round|roundabout|ghat|washing steps|signboard|cricket/i;

/** Every footprint of the layout as a quad: existing places (footprints.js) and every solid rectangle. */
/** Places the art director ordered kept EXACTLY as drawn on the final map (25 Nov): never moved, never turned by the road snap. */
export const AS_DRAWN = new Set(['temple', 'sabzi']);
// 26 Nov (her order): EVERY named place (map existing:true or minor:false) sits exactly on its map x,z,front: footprintItems marks them fixed.

export function footprintItems(layout) {
  const items = [];
  for (const [id, fp] of Object.entries(EXISTING_FOOTPRINTS)) {
    const p = layout.places[id];
    if (!p) continue;
    const [x0, x1, z0, z1] = fp.box;
    items.push({ id, name: p.name, kind: 'place', place: p, box: fp.box, open: !!fp.open, row: !!fp.row,
      corners: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([lx, lz]) => { const q = localToWorld(p.x, p.z, p.ry, lx, lz); return [q.x, q.z]; }),
      front: p.front, fixed: p.untouched || !!fp.open || AS_DRAWN.has(id) || p.existing === true || p.minor === false, named: !fp.open });
  }
  for (const o of layout.objects) {
    if (!o.rect || o.prefix.startsWith('canal_new')) continue;
    const place = o.place ? layout.places[o.place] : null;
    const crossing = CROSSING.test(o.label) || (o.h || 0) < 0.5;
    const isHouse = o.prefix === 'new_house';
    items.push({ id: o.id, name: o.name, kind: isHouse ? 'house' : 'solid', obj: o, place, crossing,
      corners: boxCorners(o.rect.cx, o.rect.cz, o.rect.w, o.rect.d, o.rect.ry), front: o.rect.front,
      fixed: crossing, named: !!place && !PROP_NAME.test(place.name) && !isHouse && (o.h || 0) >= 2 });
  }
  return items;
}

const bboxOf = (c) => [Math.min(c[0][0], c[1][0], c[2][0], c[3][0]), Math.min(c[0][1], c[1][1], c[2][1], c[3][1]), Math.max(c[0][0], c[1][0], c[2][0], c[3][0]), Math.max(c[0][1], c[1][1], c[2][1], c[3][1])];
const rotAbout = (c, cx, cz, t) => { const k = Math.cos(t), s = Math.sin(t); return c.map(([x, z]) => [cx + (x - cx) * k - (z - cz) * s, cz + (x - cx) * s + (z - cz) * k]); };

function overlapsOf(it, items, ignoreCarts = false) {
  const bb = bboxOf(it.corners);
  let n = 0; // summed overlap depth (m) with every other footprint
  for (const o of items) {
    if (o === it || o.crossing || (o.kind === 'place' && o.open)) continue;
    if (ignoreCarts && isCart(o)) continue;
    if (it.place && o.place === it.place && o.kind !== it.kind) continue; // a place and its own footprint object
    const b = o._bb || (o._bb = bboxOf(o.corners));
    if (b[2] < bb[0] || bb[2] < b[0] || b[3] < bb[1] || bb[3] < b[1]) continue;
    const ov = quadOverlap(it.corners, o.corners);
    if (ov > OVERLAP_TOL) n += ov;
  }
  return n;
}

/** A cart (a small pushable stall prop): a building may take its spot, the cart then moves out of the way. */
const isCart = (o) => o.kind === 'solid' && !o.named && /carts?$|washing line/i.test(o.name) && (o.obj.h || 0) < 3.1;
/** Is a road hit acceptable because it is only the end cap of a gali that clipGalis() will trim afterwards? */
function galiEndOnly(roads, d, corners) {
  // 22 Nov: every gali conflict left after the first end trim is treated as real (the snap moves the building); the end trim
  // runs again after each snap round for the ends a moved building now touches
  if (GALI_ENDS_COUNT) return false;
  if (!d || d.road.kind !== 'back') return false;
  const pts = d.road.pts, ends = [pts[0], pts[pts.length - 1]];
  if (Math.hypot(ends[0][0] - ends[1][0], ends[0][1] - ends[1][1]) <= 8) return false;
  // the deepest point on the gali must lie in its round end cap (within its half-width + 0.5 m of an end)...
  if (!ends.some(([x, z]) => Math.hypot(d.x - x, d.z - z) < d.road.width / 2 + 0.5)) return false;
  // ...and the footprint must not also stand along the gali's length (then trimming the end would not free it)
  const w = d.road.width;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), steps = Math.max(2, Math.ceil(L / 0.5));
    for (let k = 1; k < steps; k++) {
      const t = k / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if ((i === 0 && t * L < w / 2 + 2.5) || (i === pts.length - 2 && (1 - t) * L < w / 2 + 2.5)) continue;
      if (distToQuad(x, z, corners) < w / 2 - 0.1) return false;
    }
  }
  return true;
}

/**
 * Nudge every movable footprint onto its road and off its neighbours. For each footprint that fails (front not facing its
 * road within 3 m and 3 deg, on a carriageway, or overlapping another footprint) a small search tries: turning it parallel to
 * the road in front (up to 30 deg), moving it forward / back along its front, and sliding it sideways along its road (what
 * lets a row of shops on a bend follow the bend: each shop turns to the road and slides clear of the one before). The move
 * with the best score (front + road + overlap, then least movement) wins, only if it is better than standing still. Carts in
 * the way of a kiosk or shop are pushed behind it (the kiosk takes the cart's spot). Mutates the layout; returns the nudges.
 */
export function snapLayout(layout) {
  const roads = layout.roads;
  const items = footprintItems(layout);
  const nudges = [];
  // 0. a moved place whose map front looks away from every road while its back is on one: the export's front flip landed on a
  // place nobody turned (the kiln: its front looked into the fields, away from the green strip and the highway). Turn it round.
  for (const it of items) {
    if (it.kind !== 'place' || it.fixed) continue;
    const f = frontProbe(roads, it.corners, it.front, 30);
    const back = [-it.front[0], -it.front[1]];
    const b = frontProbe(roads, it.corners, back, 30);
    if ((!f || f.gap > 15) && b && b.gap <= 20 && b.par <= MAX_TURN) {
      it.front = back;
      const p = it.place;
      p.front = back.map((v) => +v.toFixed(4)); p.frontYaw = Math.atan2(p.front[0], p.front[1]); p.ry = wrapPi(p.ry + Math.PI);
      p.adjust = { ...(p.adjust || {}), flipped: true };
      nudges.push({ id: it.id, name: it.name, kind: it.kind, flipped: true, turnDeg: 180, move: 0, gap: b.gap, par: +b.par.toFixed(2), why: 'map front faced away from every road; its back faces ' + b.road.id });
    }
  }
  // 0b. a new shop drawn in a second row, its front looking straight into the back of the shop in front of it, while one of its
  // other sides is on a road: that side is its real front (the drawing marked the wrong side). It turns on the spot.
  for (const it of items) {
    if (it.kind !== 'solid' || !it.named || it.fixed) continue;
    const f = frontProbe(roads, it.corners, it.front, 12);
    if (f && f.gap <= GAP_OK) continue;
    const ahead = it.corners.map(([x, z]) => [x + it.front[0] * 1.5, z + it.front[1] * 1.5]);
    const blocked = items.some((o) => o !== it && o.named && !o.crossing && quadOverlap(ahead, o.corners) > 0.3);
    if (!blocked) continue;
    const [fx, fz] = it.front;
    for (const [dir, turn] of [[[-fx, -fz], Math.PI], [[fz, -fx], -Math.PI / 2], [[-fz, fx], Math.PI / 2]]) {
      const pr = frontProbe(roads, it.corners, dir, 6);
      if (!pr || pr.gap > GAP_OK || pr.par > PAR_OK) continue;
      reorient(it, dir, turn);
      nudges.push({ id: it.id, name: it.name, kind: it.kind, turnDeg: +(turn / DEG).toFixed(0), move: 0, gap: pr.gap, par: +pr.par.toFixed(2), why: 'drawn front faced the back of the shop in front; this side is on ' + pr.road.id });
      break;
    }
  }
  // 1. a place standing over the pond / johad bank (src/dips.js: water R x rim 1.25-1.32, outline wobble up to x1.3) steps
  // straight away from the water, up to 6 m, when that clears it without touching anything else
  const dips = ['pond', 'johad'].map((id) => layout.places[id]).filter(Boolean).map((p) => ({ id: p.id, x: p.x, z: p.z, r: p.id === 'pond' ? 6.7 * 1.25 * 1.3 + 0.5 : 5.4 * 1.32 * 1.3 + 0.5 }));
  const overDip = (c) => dips.find((d) => c.some(([x, z]) => Math.hypot(x - d.x, z - d.z) < d.r) || edgeNear(c, d));
  for (const it of items) {
    if (it.kind !== 'place' || it.place.untouched || it.id === 'pond' || it.id === 'johad') continue;
    const d = overDip(it.corners);
    if (!d) continue;
    const cx = it.corners.reduce((s, q) => s + q[0], 0) / 4, cz = it.corners.reduce((s, q) => s + q[1], 0) / 4;
    const L = Math.hypot(cx - d.x, cz - d.z) || 1, ux = (cx - d.x) / L, uz = (cz - d.z) / L;
    const before = overlapsOf(it, items), saved = it.corners;
    for (let k = 0.5; k <= 6; k += 0.5) {
      const moved = saved.map(([x, z]) => [x + ux * k, z + uz * k]);
      it.corners = moved; it._bb = null;
      if (!overDip(moved) && overlapsOf(it, items) <= before + 0.01 && !roadDepth(roads, moved)) {
        applyNudge(it, 0, ux * k, uz * k, cx, cz);
        nudges.push({ id: it.id, name: it.name, kind: it.kind, turnDeg: 0, move: k, why: 'stood over the ' + d.id + ' bank' });
        break;
      }
      it.corners = saved; it._bb = null;
    }
  }

  const scoreOf = (it, corners, front, ignoreCarts) => {
    const pr = frontProbe(roads, corners, front, 12);
    const d = roadDepth(roads, corners, 0.1, 0.75);
    const saved = it.corners; it.corners = corners; it._bb = null;
    const ov = overlapsOf(it, items, ignoreCarts);
    it.corners = saved; it._bb = null;
    const faces = it.kind === 'house' ? 0.3 : 1; // a house's front matters less than a shop's (it may face a gali or a yard)
    const fs = !it.named && it.kind !== 'house' ? 0 : pr ? (pr.gap <= GAP_OK ? 0 : Math.min(pr.gap, 15)) + (pr.par <= PAR_OK ? 0 : pr.par) : 30;
    const rs = d && !galiEndOnly(roads, d, corners) ? 10 * d.pen + 2 : 0;
    return { s: faces * fs + rs + 20 * ov, pr, d, ov };
  };
  const order = [...items.filter((i) => i.kind === 'place'), ...items.filter((i) => i.kind === 'solid' && i.named), ...items.filter((i) => i.kind === 'house')];
  for (let pass = 0; pass < 4; pass++) {
    for (const it of order) {
      if (it.fixed || it.crossing) continue;
      if (process.env.DEBUG_ONLY && process.env.DEBUG_ONLY !== it.id) continue;
      const base = scoreOf(it, it.corners, it.front, true);
      if (process.env.DEBUG_ONLY) console.log('[snap] base', base.s, base.d && base.d.road.id, base.d && base.d.pen, 'ov', base.ov, 'pr', base.pr && base.pr.gap, base.pr && base.pr.par);
      const pr0 = base.pr;
      if (base.s === 0 && overlapsOf(it, items, false) === 0) continue;
      // a house is only moved for a road or an overlap (its front is reported, not failed: it faces its gali by construction)
      if (it.kind === 'house' && !base.d && !base.ov && !(pr0 && pr0.gap <= 6 && (pr0.gap > GAP_OK || pr0.par > PAR_OK))) continue;
      const needSide = it.kind !== 'house' || base.ov > 0 || !!base.d || (pr0 && pr0.par > PAR_OK);
      const cx = it.corners.reduce((s, q) => s + q[0], 0) / 4, cz = it.corners.reduce((s, q) => s + q[1], 0) / 4;
      const turns = [0];
      if (pr0 && pr0.par > PAR_OK && pr0.par <= MAX_TURN) {
        const fe = frontEdgeVec(it.corners, it.front);
        let t = Math.atan2(fe[0] * pr0.uz - fe[1] * pr0.ux, fe[0] * pr0.ux + fe[1] * pr0.uz);
        if (t > Math.PI / 2) t -= Math.PI; else if (t < -Math.PI / 2) t += Math.PI;
        turns.push(t);
      }
      // standing on a road: also try turning it square to that road (the edge nearest parallel), so it can step off cleanly
      if (base.d) {
        const n = nearestRoad([base.d.road], cx, cz);
        if (n) {
          let bt = null;
          for (const [ex, ez] of [frontEdgeVec(it.corners, it.front), frontEdgeVec(it.corners, [it.front[1], -it.front[0]])]) {
            let t = Math.atan2(ex * n.uz - ez * n.ux, ex * n.ux + ez * n.uz);
            if (t > Math.PI / 2) t -= Math.PI; else if (t < -Math.PI / 2) t += Math.PI;
            if (Math.abs(t) > 1e-3 && Math.abs(t) <= MAX_TURN * DEG && (bt === null || Math.abs(t) < Math.abs(bt))) bt = t;
          }
          if (bt !== null && !turns.includes(bt)) turns.push(bt);
        }
      }
      const maxPush = it.kind === 'place' ? MAX_PUSH_PLACE : MAX_PUSH;
      const cands = [];
      for (const t of turns) {
        const rc = t ? rotAbout(it.corners, cx, cz, t) : it.corners;
        const fr = t ? [it.front[0] * Math.cos(t) - it.front[1] * Math.sin(t), it.front[0] * Math.sin(t) + it.front[1] * Math.cos(t)] : it.front;
        const p1 = frontProbe(roads, rc, fr, 12), d1 = roadDepth(roads, rc);
        const ks = new Set([0]);
        if (p1 && p1.gap > GAP_OK) for (const g of GAP_TARGETS) if (p1.gap - g <= maxPush) ks.add(+(p1.gap - g).toFixed(2));
        if (d1 && d1.pen <= MAX_BACK) { ks.add(+(-(d1.pen + 0.3)).toFixed(2)); ks.add(+(d1.pen + 0.3).toFixed(2)); }
        for (const k of [0.05, 0.1, 0.15, 0.2, 0.25, 0.5, 1, 1.5]) { ks.add(k); ks.add(-k); }
        const side = [fr[1], -fr[0]];
        for (const k of ks) for (const j of (needSide || t ? SIDE_STEPS : [0])) {
          if (!t && !k && !j) continue;
          const mx = fr[0] * k + side[0] * j, mz = fr[1] * k + side[1] * j;
          const moved = rc.map(([x, z]) => [x + mx, z + mz]);
          const sc = scoreOf(it, moved, fr, true);
          const total = sc.s + 0.02 * Math.hypot(mx, mz) + 0.01 * Math.abs(t) / DEG;
          if (sc.s < base.s - 0.01) cands.push({ total, t, mx, mz, moved, fr, sc });
        }
      }
      if ((process.env.DEBUG_SNAP === it.id || process.env.DEBUG_ONLY === it.id)) console.log('[snap]', it.id, 'base', base.s.toFixed(2), 'cands', cands.length, cands.slice(0, 3).map((c) => [c.total.toFixed(2), c.t.toFixed(3), c.mx.toFixed(2), c.mz.toFixed(2)]));
      if (!cands.length) continue;
      cands.sort((a, b) => a.total - b.total);
      // carts the move would land on step behind the building (the building takes the cart's spot) or aside; the best move
      // whose carts can all be cleared wins
      const saved = it.corners;
      let best = null, cartMoves = [];
      for (const c of cands.slice(0, 60)) {
        it.corners = c.moved; it._bb = null;
        const moves = [];
        let ok = true;
        for (const cart of cartsHit(it, items)) {
          const m = clearCart(cart, it, items, roads, c.fr);
          if (!m) { ok = false; break; }
          moves.push(m);
        }
        if (ok) { best = c; cartMoves = moves; break; }
        for (const m of moves) { m.c.corners = m.saved; m.c._bb = null; }
      }
      if ((process.env.DEBUG_SNAP === it.id || process.env.DEBUG_ONLY === it.id)) console.log('[snap]', it.id, best ? 'chosen' : 'no candidate could clear its carts');
      if (!best) { it.corners = saved; it._bb = null; continue; }
      it.front = best.fr;
      applyNudge(it, best.t, best.mx, best.mz, cx, cz);
      for (const m of cartMoves) {
        applyNudge(m.c, 0, m.dx, m.dz, m.cx, m.cz);
        nudges.push({ id: m.c.id, name: m.c.name, kind: 'cart', turnDeg: 0, move: +Math.hypot(m.dx, m.dz).toFixed(2), why: 'made room for ' + it.name });
      }
      nudges.push({ id: it.id, name: it.name, kind: it.kind, turnDeg: +(best.t / DEG).toFixed(2), move: +Math.hypot(best.mx, best.mz).toFixed(2), gap: best.sc.pr ? +best.sc.pr.gap.toFixed(2) : null, par: best.sc.pr ? +best.sc.pr.par.toFixed(2) : null, pass });
    }
  }
  // 3. a new shop that still has no road in front (drawn in a second row, its front against the back of the row before it):
  // it moves to the nearest free frontage within 30 m of where she drew it, facing that road 1.5 m back from its edge.
  for (const it of items) {
    if (it.kind !== 'solid' || !it.named || it.fixed) continue;
    const pr = frontProbe(roads, it.corners, it.front, 12);
    if (pr && pr.gap <= GAP_OK && pr.par <= PAR_OK && !roadDepth(roads, it.corners)) continue;
    const r = it.obj.rect, cx0 = r.cx, cz0 = r.cz;
    let best = null;
    for (const road of roads) {
      if (road.kind === 'track' || road.kind === 'path') continue;
      for (let i = 0; i + 1 < road.pts.length; i++) {
        const [ax, az] = road.pts[i], [bx, bz] = road.pts[i + 1], L = Math.hypot(bx - ax, bz - az);
        if (L < r.w) continue;
        const ux = (bx - ax) / L, uz = (bz - az) / L;
        for (let t = r.w / 2; t <= L - r.w / 2; t += 1) {
          const px = ax + ux * t, pz = az + uz * t;
          if (Math.hypot(px - cx0, pz - cz0) > 30 + road.width) continue;
          for (const sg of [1, -1]) {
            const nx = -uz * sg, nz = ux * sg; // outward from the road
            const off = road.width / 2 + 1.5 + r.d / 2;
            const cx = px + nx * off, cz = pz + nz * off, dist = Math.hypot(cx - cx0, cz - cz0);
            if (dist > 30 || (best && dist >= best.dist)) continue;
            const ry = Math.atan2(-nx, -nz); // front looks back at the road
            const corners = boxCorners(cx, cz, r.w, r.d, ry);
            const saved = it.corners; it.corners = corners; it._bb = null;
            const ov = overlapsOf(it, items, false);
            it.corners = saved; it._bb = null;
            if (ov > 0 || roadDepth(roads, corners)) continue;
            const pp = frontProbe(roads, corners, [-nx, -nz], 6);
            if (!pp || pp.gap > GAP_OK || pp.par > PAR_OK) continue;
            best = { dist, cx, cz, ry, corners, front: [-nx, -nz] };
          }
        }
      }
    }
    if (!best) continue;
    const dRy = wrapPi(best.ry - r.ry);
    it.corners = best.corners; it._bb = null; it.front = best.front;
    r.cx = +best.cx.toFixed(2); r.cz = +best.cz.toFixed(2); r.ry = wrapPi(best.ry);
    r.front = [+Math.sin(r.ry).toFixed(4), +Math.cos(r.ry).toFixed(4)];
    r.frontMid = [+(r.cx + r.front[0] * r.d / 2).toFixed(2), +(r.cz + r.front[1] * r.d / 2).toFixed(2)];
    it.obj.adjust = { ...(it.obj.adjust || {}), relocated: +best.dist.toFixed(1) };
    if (it.place) {
      const p = it.place;
      p.x = r.cx; p.z = r.cz; p.front = r.front.slice(); p.frontYaw = Math.atan2(p.front[0], p.front[1]); p.ry = wrapPi(p.ry + dRy);
      p.adjust = { ...(p.adjust || {}), relocated: +best.dist.toFixed(1) };
    }
    nudges.push({ id: it.id, name: it.name, kind: it.kind, relocated: true, move: +best.dist.toFixed(2), turnDeg: +(dRy / DEG).toFixed(1), why: 'no road in front where drawn: moved to the nearest free frontage' });
  }
  // 4. a stray prop (washing line, notice board) left overlapping a building that itself never moved this pass: step 2's
  // cart-clearing only fires for carts in the way of a NAMED building's own candidate move, so a prop sitting on a building
  // that already satisfied its own checks (never tried a candidate) is never pushed. Push any such prop clear in 8
  // directions, smallest distance first, same off-road test as a real cart move.
  for (const it of items) {
    if (it.kind !== 'solid' || it.fixed || it.named) continue;
    if (!isCart(it) && !/notice board/i.test(it.name)) continue;
    if (overlapsOf(it, items, false) <= OVERLAP_TOL) continue;
    const cx = it.corners.reduce((s, q) => s + q[0], 0) / 4, cz = it.corners.reduce((s, q) => s + q[1], 0) / 4;
    const dirs8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, 0.7071], [-0.7071, -0.7071]];
    const saved = it.corners;
    let done = false;
    for (let d = 0.1; d <= 6 && !done; d += 0.1) {
      for (const [ux, uz] of dirs8) {
        const moved = saved.map(([x, z]) => [x + ux * d, z + uz * d]);
        it.corners = moved; it._bb = null;
        if (overlapsOf(it, items, false) <= OVERLAP_TOL && !roadDepth(roads, moved)) {
          applyNudge(it, 0, ux * d, uz * d, cx, cz);
          nudges.push({ id: it.id, name: it.name, kind: it.kind, turnDeg: 0, move: +d.toFixed(2), why: 'stray prop pushed clear of a building it overlapped (never itself moved)' });
          done = true; break;
        }
      }
    }
    if (!done) { it.corners = saved; it._bb = null; }
  }
  return nudges;
}
/** Give a solid a new front side (same footprint): its rect turns by `turn` (three.js yaw), w and d swap for a quarter turn. */
function reorient(it, dir, turn) {
  it.front = dir;
  const r = it.obj.rect;
  r.ry = wrapPi(r.ry + turn);
  r.front = [+Math.sin(r.ry).toFixed(4), +Math.cos(r.ry).toFixed(4)];
  if (Math.abs(Math.abs(turn) - Math.PI / 2) < 1e-6) { const w = r.w; r.w = r.d; r.d = w; }
  r.frontMid = [+(r.cx + r.front[0] * r.d / 2).toFixed(2), +(r.cz + r.front[1] * r.d / 2).toFixed(2)];
  it.obj.adjust = { ...(it.obj.adjust || {}), reoriented: +(turn / DEG).toFixed(0) };
  if (it.place) {
    const p = it.place;
    p.front = r.front.slice(); p.frontYaw = Math.atan2(p.front[0], p.front[1]); p.ry = wrapPi(p.ry + turn);
    p.adjust = { ...(p.adjust || {}), reoriented: +(turn / DEG).toFixed(0) };
  }
}
const GALI_ENDS_COUNT = true;
const SIDE_STEPS = [0, 0.15, -0.15, 0.3, -0.3, 0.5, -0.5, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6, 2.2, -2.2];

/** Carts a footprint now overlaps. */
function cartsHit(it, items) {
  const bb = bboxOf(it.corners);
  return items.filter((o) => o !== it && isCart(o) && (() => { const b = bboxOf(o.corners); return !(b[2] < bb[0] || bb[2] < b[0] || b[3] < bb[1] || bb[3] < b[1]); })() && quadOverlap(it.corners, o.corners) > OVERLAP_TOL);
}
/** Move cart c out of building it: straight behind it first (along -front), then sideways along the road, up to 14 m; clear of everything. */
function clearCart(c, it, items, roads, front) {
  const cx = c.corners.reduce((s, q) => s + q[0], 0) / 4, cz = c.corners.reduce((s, q) => s + q[1], 0) / 4;
  const side = [front[1], -front[0]];
  const dirs = [[-front[0], -front[1]], side, [-side[0], -side[1]]];
  const saved = c.corners;
  for (let d = 0.5; d <= 14; d += 0.5) for (const [ux, uz] of dirs) { // up to 14 m: a 5 m cart row may have to pass the whole building
    const moved = saved.map(([x, z]) => [x + ux * d, z + uz * d]);
    c.corners = moved; c._bb = null;
    if (overlapsOf(c, items, false) === 0 && !roadDepth(roads, moved)) return { c, dx: ux * d, dz: uz * d, cx, cz, saved };
  }
  c.corners = saved; c._bb = null;
  return null;
}

function frontEdgeVec(corners, front) {
  const cx = corners.reduce((s, q) => s + q[0], 0) / 4, cz = corners.reduce((s, q) => s + q[1], 0) / 4;
  let best = null;
  for (let i = 0; i < 4; i++) {
    const a = corners[i], c = corners[(i + 1) % 4];
    const mx = (a[0] + c[0]) / 2 - cx, mz = (a[1] + c[1]) / 2 - cz;
    const dot = mx * front[0] + mz * front[1];
    if (!best || dot > best.dot) best = { dot, v: [c[0] - a[0], c[1] - a[1]] };
  }
  return best.v;
}

/** Write a nudge back into the layout: rotation t (radians, in the x-z plane, x toward z) about (cx, cz), then move (dx, dz). */
function applyNudge(it, t, dx, dz, cx, cz) {
  const k = Math.cos(t), s = Math.sin(t);
  const mv = (x, z) => [cx + (x - cx) * k - (z - cz) * s + dx, cz + (x - cx) * s + (z - cz) * k + dz];
  const dRy = -t; // a turn of t in the x-z plane is a three.js yaw change of -t
  const sum = (prev) => ({ ...(prev || {}), turnDeg: +(((prev && prev.turnDeg) || 0) + t / DEG).toFixed(2), dx: +(((prev && prev.dx) || 0) + dx).toFixed(2), dz: +(((prev && prev.dz) || 0) + dz).toFixed(2) });
  const movePlace = (p) => {
    const [x, z] = mv(p.x, p.z);
    p.x = +x.toFixed(2); p.z = +z.toFixed(2);
    p.front = [+(p.front[0] * k - p.front[1] * s).toFixed(4), +(p.front[0] * s + p.front[1] * k).toFixed(4)];
    p.frontYaw = Math.atan2(p.front[0], p.front[1]);
    p.ry = wrapPi(p.ry + dRy);
    p.adjust = sum(p.adjust);
  };
  if (it.kind === 'place') movePlace(it.place);
  else {
    const r = it.obj.rect;
    const [x, z] = mv(r.cx, r.cz);
    r.cx = +x.toFixed(2); r.cz = +z.toFixed(2);
    r.ry = wrapPi(r.ry + dRy);
    r.front = [+Math.sin(r.ry).toFixed(4), +Math.cos(r.ry).toFixed(4)];
    const [fx, fz] = mv(r.frontMid[0], r.frontMid[1]);
    r.frontMid = [+fx.toFixed(2), +fz.toFixed(2)];
    it.obj.adjust = sum(it.obj.adjust);
    if (it.place && !it.place.adjust) movePlace(it.place);
  }
}

// ------------------------------------------------------------------ gali ends
const distToQuad = (x, z, q) => {
  let inside = true, best = Infinity;
  for (let i = 0; i < 4; i++) {
    const a = q[i], c = q[(i + 1) % 4];
    const ex = c[0] - a[0], ez = c[1] - a[1], L2 = ex * ex + ez * ez || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / L2));
    best = Math.min(best, Math.hypot(x - a[0] - t * ex, z - a[1] - t * ez));
    if (ex * (z - a[1]) - ez * (x - a[0]) < 0) inside = false;
  }
  const inside2 = (() => { let s = 0; for (let i = 0; i < 4; i++) { const a = q[i], c = q[(i + 1) % 4]; const cr = (c[0] - a[0]) * (z - a[1]) - (c[1] - a[1]) * (x - a[0]); if (cr > 0) s |= 1; else if (cr < 0) s |= 2; } return s !== 3; })();
  return inside || inside2 ? -1 : best;
};
/**
 * A gali (4 m back lane) drawn a little too long runs its end into the wall of the building it leads to: report how far each
 * end would need to pull back, 0.25 m at a time (at most 8 m), until its carriageway stops 0.3 m short of every building
 * footprint. REPORTING ONLY (bug fixed 26 Nov, same shape as nudgeGalis below): tools/layout-pack.mjs ships every road
 * exactly as drawn ("nothing may sit on a road, so the buildings move, never the road" - her 24-26 Nov policy), so the cut
 * this used to write to `r.pts` never reached the shipped map - it only leaked into whichever snapLayout round ran after it,
 * which then scored a building as clear of a gali-cap that was about to be thrown away, leaving the real, uncut cap still
 * overlapping it once exported. Mutating the road here would misinform every snap pass that runs after it; galis are never
 * trimmed, so this only returns the list for docs/s7/layout.md. Returns the clips.
 */
export function clipGalis(layout) {
  const items = footprintItems(layout).filter((it) => !it.crossing && !(it.kind === 'place' && it.open));
  for (const it of items) it._bb = bboxOf(it.corners);
  const clips = [];
  // the END CAP is in a building: its centre within 0.3 m of a footprint, or one of its two corners inside one. (Houses lining
  // the gali's sides do not count: they are beside the lane, not in front of its end.)
  let capUx = 0, capUz = 0;
  const near = (x, z, m) => items.some((it) => x > it._bb[0] - 3 && x < it._bb[2] + 3 && z > it._bb[1] - 3 && z < it._bb[3] + 3 && distToQuad(x, z, it.corners) < m);
  const hits = (x, z, w) => {
    const h = w / 2;
    // the round cap reaches h past the end point (src/roadNetwork.js: every end is a round cap): its tip and its two 45 deg points
    const tip = [x - capUx * h, z - capUz * h];
    const d1 = [x - (capUx - capUz) * h * 0.707, z - (capUz + capUx) * h * 0.707], d2 = [x - (capUx + capUz) * h * 0.707, z - (capUz - capUx) * h * 0.707];
    // (a house beside the lane's last metres is a side conflict, nudgeGalis' job, so the cap's own side points are not tested)
    return near(tip[0], tip[1], 0.3) || near(d1[0], d1[1], 0.1) || near(d2[0], d2[1], 0.1);
  };
  for (const r of layout.roads) {
    if (r.kind !== 'back' || r.pts.length < 2) continue;
    for (const end of [0, 1]) {
      const pts = end ? r.pts.slice().reverse() : r.pts.slice();
      let [x, z] = pts[0];
      const [nx, nz] = pts[1];
      const L = Math.hypot(nx - x, nz - z);
      if (L < 1) continue;
      const ux = (nx - x) / L, uz = (nz - z) / L;
      capUx = ux; capUz = uz;
      let cut = 0;
      while (hits(x + ux * cut, z + uz * cut, r.width) && cut < Math.min(8, L - 2)) cut += 0.25;
      if (cut > 0 && !hits(x + ux * cut, z + uz * cut, r.width)) {
        clips.push({ id: r.id, end: end ? 'end' : 'start', cut });
      }
    }
  }
  return clips;
}

/** Does any edge of quad c pass within d.r of the dip centre? */
function edgeNear(c, d) {
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4], ex = b[0] - a[0], ez = b[1] - a[1], L2 = ex * ex + ez * ez || 1;
    const t = Math.max(0, Math.min(1, ((d.x - a[0]) * ex + (d.z - a[1]) * ez) / L2));
    if (Math.hypot(d.x - a[0] - t * ex, d.z - a[1] - t * ez) < d.r) return true;
  }
  return false;
}

/**
 * A gali drawn so that a building's back or side stands on it along its length (not at its end): report how far the whole
 * gali would need to slide (0.25 m steps, up to 2.5 m) and/or narrow to clear every building. REPORTING ONLY (bug fixed 26
 * Nov): tools/layout-pack.mjs ships every road exactly as drawn ("nothing may sit on a road, so the buildings move, never
 * the road" - her 24-26 Nov policy), so a shift this used to apply to layout.roads never reached the shipped map anyway -
 * it only leaked into the SECOND snapLayout round, which then scored houses as clear against a narrower/shifted gali that
 * was about to be thrown away, leaving them still on the real, wider, unshifted gali once exported. Mutating the road here
 * would misinform every snap pass that runs after it; galis are never resized or moved, so this only returns the list for
 * docs/s7/layout.md. Returns the shifts.
 */
export function nudgeGalis(layout) {
  const items = footprintItems(layout).filter((it) => !it.crossing && !(it.kind === 'place' && it.open));
  for (const it of items) it._bb = bboxOf(it.corners);
  const shifts = [];
  const conflicts = (pts, w) => {
    let n = 0;
    for (const it of items) {
      for (let i = 0; i + 1 < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        if (Math.max(ax, bx) + w < it._bb[0] || Math.min(ax, bx) - w > it._bb[2] || Math.max(az, bz) + w < it._bb[1] || Math.min(az, bz) - w > it._bb[3]) continue;
        // sample the segment interior (ends are the clipper's job)
        const L = Math.hypot(bx - ax, bz - az), steps = Math.max(2, Math.ceil(L / 0.5));
        for (let k = 1; k < steps; k++) {
          const t = k / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
          if ((i === 0 && t * L < w / 2 + 0.5) || (i === pts.length - 2 && (1 - t) * L < w / 2 + 0.5)) continue;
          if (distToQuad(x, z, it.corners) < w / 2 - 0.1) { n++; break; }
        }
      }
    }
    return n;
  };
  for (const r of layout.roads) {
    if (r.kind !== 'back' || r.pts.length !== 2) continue;
    const n0 = conflicts(r.pts, r.width);
    if (!n0) continue;
    const [a, b] = r.pts, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    // slide it first; if both house rows hold it, narrow it too (a 3 m gali still takes a cart and two people abreast)
    let done = false;
    for (const w of [r.width, r.width - 0.5, r.width - 1]) {
      for (let s = 0; s <= 2.5 && !done; s += 0.25) for (const sg of s ? [1, -1] : [1]) {
        if (!s && w === r.width) continue;
        const pts = r.pts.map(([x, z]) => [+(x + nx * s * sg).toFixed(2), +(z + nz * s * sg).toFixed(2)]);
        // report-only: do not write pts/width/bbox back onto the live road (see the function doc above)
        if (conflicts(pts, w) === 0) { shifts.push({ id: r.id, shift: s * sg, width: w }); done = true; break; }
      }
      if (done) break;
    }
  }
  return shifts;
}
