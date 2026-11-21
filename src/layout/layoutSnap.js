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
import { frontProbe, roadDepth, quadOverlap, localToWorld, boxCorners, wrapPi, DEG } from './layoutCore.js';
import { EXISTING_FOOTPRINTS } from './footprints.js';

const MAX_TURN = 15, PAR_OK = 3, GAP_OK = 3, GAP_TARGETS = [2, 2.5, 2.9], MAX_PUSH = 6, MAX_PUSH_PLACE = 7.5, MAX_BACK = 3.5, OVERLAP_TOL = 0.05;
export const PROP_NAME = /hand pump|^well|old well|washing line|milestone|dung|haystack|resting|buffalo$|cattle$|kids|house plot|cricket|kabaddi|ground$|parking|tubewell|green strip|canal|culvert|washing steps|notice board|cycle stand|carrom|play corner|grazing|orchard|baagh|fields|pond|gali|square: indian flag|weekly market|goods yard|gher yard|potter|tempo|drying ground|platform|peepal|transformer|mobile tower/i;
export const CROSSING = /bridge|culvert|gate|milestone|island|platform round|roundabout|ghat|washing steps|signboard|cricket/i;

/** Every footprint of the layout as a quad: existing places (footprints.js) and every solid rectangle. */
export function footprintItems(layout) {
  const items = [];
  for (const [id, fp] of Object.entries(EXISTING_FOOTPRINTS)) {
    const p = layout.places[id];
    if (!p) continue;
    const [x0, x1, z0, z1] = fp.box;
    items.push({ id, name: p.name, kind: 'place', place: p, box: fp.box, open: !!fp.open, row: !!fp.row,
      corners: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([lx, lz]) => { const q = localToWorld(p.x, p.z, p.ry, lx, lz); return [q.x, q.z]; }),
      front: p.front, fixed: p.untouched || !!fp.open, named: !fp.open });
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

function overlapsOf(it, items) {
  const bb = bboxOf(it.corners);
  let n = 0; // summed overlap depth (m) with every other footprint
  for (const o of items) {
    if (o === it || o.crossing || (o.kind === 'place' && o.open)) continue;
    if (it.place && o.place === it.place && o.kind !== it.kind) continue; // a place and its own footprint object
    const b = o._bb || (o._bb = bboxOf(o.corners));
    if (b[2] < bb[0] || bb[2] < b[0] || b[3] < bb[1] || bb[3] < b[1]) continue;
    const ov = quadOverlap(it.corners, o.corners);
    if (ov > OVERLAP_TOL) n += ov;
  }
  return n;
}

/** Nudge every movable footprint onto its road. Mutates layout places / object rects; returns the list of nudges. */
export function snapLayout(layout) {
  const roads = layout.roads;
  const items = footprintItems(layout);
  const order = [...items.filter((i) => i.kind === 'place'), ...items.filter((i) => i.kind === 'solid' && i.named), ...items.filter((i) => i.kind === 'house')];
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
  // 1. a place standing over the pond / johad bank (src/dips.js: water R x rim 1.25-1.32, outline wobble up to x1.3) steps
  // straight away from the water, up to 6 m, when that clears it without touching anything else
  const dips = ['pond', 'johad'].map((id) => layout.places[id]).filter(Boolean).map((p) => ({ id: p.id, x: p.x, z: p.z, r: p.id === 'pond' ? 9.6 * 1.25 * 1.3 + 0.5 : 5.4 * 1.32 * 1.3 + 0.5 }));
  const overDip = (c) => dips.find((d) => c.some(([x, z]) => Math.hypot(x - d.x, z - d.z) < d.r) || Math.hypot(c.reduce((s, q) => s + q[0], 0) / 4 - d.x, c.reduce((s, q) => s + q[1], 0) / 4 - d.z) < d.r || edgeNear(c, d));
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
  for (const it of order) {
    if (it.fixed || it.crossing) continue;
    const p0 = frontProbe(roads, it.corners, it.front, 12);
    const d0 = roadDepth(roads, it.corners);
    const okBefore = p0 && p0.gap <= GAP_OK && p0.par <= PAR_OK && !d0;
    if (okBefore) continue;
    const cx = it.corners.reduce((s, q) => s + q[0], 0) / 4, cz = it.corners.reduce((s, q) => s + q[1], 0) / 4;
    let corners = it.corners, front = it.front, theta = 0, dx = 0, dz = 0;
    // 1. turn parallel
    if (p0 && p0.par > PAR_OK && p0.par <= MAX_TURN) {
      const fe = frontEdgeVec(corners, front);
      let t = Math.atan2(fe[0] * p0.uz - fe[1] * p0.ux, fe[0] * p0.ux + fe[1] * p0.uz);
      if (t > Math.PI / 2) t -= Math.PI; else if (t < -Math.PI / 2) t += Math.PI;
      theta = t;
      corners = rotAbout(corners, cx, cz, t);
      front = [front[0] * Math.cos(t) - front[1] * Math.sin(t), front[0] * Math.sin(t) + front[1] * Math.cos(t)];
    }
    // 2. close the gap / step off the road
    const p1 = frontProbe(roads, corners, front, 12);
    const d1 = roadDepth(roads, corners);
    const maxPush = it.kind === 'place' ? MAX_PUSH_PLACE : MAX_PUSH;
    // candidate moves (in the building's own frame: k along the front, j along the front edge), best score wins
    const side = [front[1], -front[0]];
    const fwd = [0];
    if (p1 && p1.gap > GAP_OK) for (const t of GAP_TARGETS) if (p1.gap - t <= maxPush) fwd.push(p1.gap - t);
    const off = [0];
    if (d1 && d1.pen <= MAX_BACK) { const k = d1.pen + 0.3; off.push(k, -k); }
    const cands = [];
    for (const k of fwd) for (const o of off) { cands.push([k + o, 0]); if (o) cands.push([k, o]); }
    const score = (p, d) => (p ? (p.gap <= GAP_OK ? 0 : p.gap) + (p.par <= PAR_OK ? 0 : p.par) : 99) + (d ? 10 * d.pen : 0);
    const s0 = score(p0, d0);
    const before = overlapsOf(it, items);
    const saved = it.corners;
    let best = null;
    for (const [k, j] of cands) {
      if (!theta && !k && !j) continue;
      const mx = front[0] * k + side[0] * j, mz = front[1] * k + side[1] * j;
      const moved = corners.map(([x, z]) => [x + mx, z + mz]);
      it.corners = moved; it._bb = null;
      const after = overlapsOf(it, items);
      const pp = frontProbe(roads, moved, front, 12);
      const dd = roadDepth(roads, moved);
      const sc = score(pp, dd) + 0.01 * Math.hypot(mx, mz); // least movement wins a tie
      const newRoad = dd && (!d0 || dd.road !== d0.road); // never trade one road for another
      if (after <= before + 0.01 && !newRoad && sc < s0 && (!best || sc < best.sc)) best = { sc, mx, mz, moved, pp };
    }
    it.corners = saved; it._bb = null;
    let done = false, p2 = null;
    if (best) { done = true; dx = best.mx; dz = best.mz; p2 = best.pp; it.corners = best.moved; }
    if (!done) continue;
    it.front = front;
    applyNudge(it, theta, dx, dz, cx, cz);
    nudges.push({ id: it.id, name: it.name, kind: it.kind, turnDeg: +(theta / DEG).toFixed(2), move: +Math.hypot(dx, dz).toFixed(2), gap: p2 ? +p2.gap.toFixed(2) : null, par: p2 ? +p2.par.toFixed(2) : null });
  }
  return nudges;
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
  const adjust = { turnDeg: +(t / DEG).toFixed(2), dx: +dx.toFixed(2), dz: +dz.toFixed(2) };
  const movePlace = (p) => {
    const [x, z] = mv(p.x, p.z);
    p.x = +x.toFixed(2); p.z = +z.toFixed(2);
    p.front = [+(p.front[0] * k - p.front[1] * s).toFixed(4), +(p.front[0] * s + p.front[1] * k).toFixed(4)];
    p.frontYaw = Math.atan2(p.front[0], p.front[1]);
    p.ry = wrapPi(p.ry + dRy);
    p.adjust = adjust;
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
    it.obj.adjust = adjust;
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
 * A gali (4 m back lane) drawn a little too long runs its end into the wall of the building it leads to. Pull each end back,
 * 0.25 m at a time (at most 8 m), until its carriageway stops 0.3 m short of every building footprint. Returns the clips.
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
    return near(tip[0], tip[1], 0.3) || near(d1[0], d1[1], 0.1) || near(d2[0], d2[1], 0.1) || near(x - capUz * (h - 0.2), z + capUx * (h - 0.2), 0) || near(x + capUz * (h - 0.2), z - capUx * (h - 0.2), 0);
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
        pts[0] = [+(x + ux * cut).toFixed(2), +(z + uz * cut).toFixed(2)];
        r.pts = end ? pts.reverse() : pts;
        r.bbox = undefined;
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
