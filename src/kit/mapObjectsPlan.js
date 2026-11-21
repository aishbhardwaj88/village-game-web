/**
 * Map objects (S7 sprint, "map objects" agent): WHERE every small object of the approved map goes, worked out once from
 * the game's map data (src/layout/mapData.json via src/layout/layout.js). Pure maths, no three.js, so the game build
 * (src/kit/mapObjects.js) and the node check (src/kit/mapObjectsCheck.js) read exactly the same list.
 *
 * Only what nothing else builds is listed here (checked 21 Nov against shops-land, houses and the layout wiring):
 *   shops-land builds: bus shelter, cycle stand (open sheds), wells incl. the old well, hand pumps, haystacks, dung cakes,
 *                      washing lines, grazing ground, mango baagh, fields, orchards, canal, ghat, flag island, peepal.
 *   layout wiring moves the game's own models onto: culvert, goods yard, gher yard, dung-cake yard, haystacks yard, carrom.
 *
 * Coordinates: metres, x east, z south. A design is built with its front on local +z; ry turns local +z onto
 * (sin ry, cos ry), local +x onto (cos ry, -sin ry) (three.js rotation.y).
 */

const key = (o) => o.label.split('|')[0].trim();
const nameOf = (o) => (o.label.split('|')[1] || '').trim();
export const hash01 = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/** local (lx, lz) of a placement -> world [x, z] */
export function toWorld(x, z, ry, lx, lz) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [x + lx * c + lz * s, z - lx * s + lz * c];
}
export function rectRing(x, z, ry, w, d) {
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => toWorld(x, z, ry, a, b));
}
export function ringCentre(ring) {
  let x = 0, z = 0;
  for (const p of ring) { x += p[0]; z += p[1]; }
  return [x / ring.length, z / ring.length];
}

/** Nearest road point: { d (to the centre line), half, dir [ux, uz], p [x, z], id, kind } */
export function nearestRoad(roads, x, z) {
  let best = null;
  for (const r of roads) {
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
      if (!best || d - (r.width || 4) / 2 < best.d - best.half) {
        const L = Math.sqrt(L2);
        best = { d, half: (r.width || 4) / 2, dir: [dx / L, dz / L], p: [px, pz], id: r.id, kind: r.kind };
      }
    }
  }
  return best;
}
/** distance from (x, z) to the nearest road EDGE (negative = on the road) */
export const roadClearance = (roads, x, z) => { const n = nearestRoad(roads, x, z); return n ? n.d - n.half : 99; };

// ---------------------------------------------------------------------------------------------- S7 fixes: road edges
// Map objects drawn a metre or two into a gali or the highway are trimmed back to the road edge; the road never moves.
const ROAD_GAP = 0.05;
/** Step every side of a rectangular patch that reaches into a road back to the road edge. Returns metres trimmed. */
export function trimRectToRoads(p, roads) {
  let { x, z, ry, w, d } = p, trimmed = 0;
  for (let iter = 0; iter < 5; iter++) {
    let changed = false;
    for (const [ax, sg] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
      let worst = 99;
      for (let i = 0; i <= 16; i++) {
        const t = -0.5 + i / 16, lx = ax === 'x' ? sg * w / 2 : t * w, lz = ax === 'z' ? sg * d / 2 : t * d;
        worst = Math.min(worst, roadClearance(roads, ...toWorld(x, z, ry, lx, lz)));
      }
      if (worst >= -0.01) continue;
      const cut = -worst + ROAD_GAP;
      if ((ax === 'x' ? w : d) - cut < 1.5) continue; // never trim a patch to nothing
      if (ax === 'x') { w -= cut; [x, z] = toWorld(x, z, ry, -sg * cut / 2, 0); } else { d -= cut; [x, z] = toWorld(x, z, ry, 0, -sg * cut / 2); }
      trimmed += cut; changed = true;
    }
    if (!changed) break;
  }
  if (trimmed > 0) Object.assign(p, { x, z, w, d, ring: rectRing(x, z, ry, w, d), trimmed: +trimmed.toFixed(2) });
  return trimmed;
}
/** Slide (x, z) towards (cx, cz) until it clears every road (never closer than minR to the centre). */
export function pullToRoadEdge(roads, cx, cz, x, z, minR) {
  if (roadClearance(roads, x, z) >= 0) return [x, z];
  const R = Math.hypot(x - cx, z - cz) || 1, ux = (x - cx) / R, uz = (z - cz) / R;
  let lo = Math.min(minR, R), hi = R; // lo = clear (or as far in as allowed), hi = on the road
  for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (roadClearance(roads, cx + ux * m, cz + uz * m) >= ROAD_GAP) lo = m; else hi = m; }
  return [cx + ux * lo, cz + uz * lo];
}

/**
 * A round pond hemmed by a road (S7 fixes): along each direction from the pond's centre, where the road edge comes
 * inside the drawn bank, the bank ends at the road edge and the water ends POND_LIP m short of it; the rest of the pond
 * keeps its drawn size. Returns { rw, rb, touched, most, limit(a), map(r, a), inv(d, a) } (mean radii of the drawn
 * water and bank; map: drawn radius -> built radius along angle a; inv: built -> drawn).
 */
export const POND_LIP = 0.6;
export function pondSqueeze(roads, p) {
  const mr = (ring) => ring.reduce((t, q) => t + Math.hypot(q[0] - p.x, q[1] - p.z), 0) / ring.length;
  const rw = mr(p.water), rb = p.bank ? mr(p.bank) : rw + 1.6;
  const reach = Math.max(rb, ...(p.bank || p.water).map((q) => Math.hypot(q[0] - p.x, q[1] - p.z))) + 0.3; // drawn rings are not perfect circles
  const cache = new Map();
  const limit = (a) => {
    const k = Math.round(((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (Math.PI / 180));
    if (cache.has(k)) return cache.get(k);
    const ua = Math.cos(k * Math.PI / 180), va = Math.sin(k * Math.PI / 180);
    let L = Infinity;
    for (let r = rw * 0.4; r <= reach; r += 0.1) if (roadClearance(roads, p.x + ua * r, p.z + va * r) < 0.15) { L = r; break; }
    cache.set(k, L);
    return L;
  };
  // the built bank radius along each degree: the road limit, eased out over the neighbouring degrees (a gently receding
  // bank where a gali meets the pond, never a square notch): b(a) = min over a' of (min(rb, L(a')) + TAPER * rb * |a - a'|)
  const TAPER = 0.7, bankR = new Float32Array(360);
  for (let i = 0; i < 360; i++) bankR[i] = Math.min(rb, limit(i * Math.PI / 180));
  const eased = new Float32Array(360);
  for (let i = 0; i < 360; i++) {
    let b = rb;
    for (let j = -60; j <= 60; j++) b = Math.min(b, bankR[(i + j + 360) % 360] + TAPER * rb * Math.abs(j) * Math.PI / 180);
    eased[i] = b;
  }
  const degOf = (a) => Math.round(((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (Math.PI / 180)) % 360;
  const radii = (a) => {
    const i = degOf(a), L = limit(a), b = eased[i];
    if (b >= rb) return Number.isFinite(L) ? [Math.min(rw, L - POND_LIP), rb] : [rw, rb];
    return [Math.min(rw, Math.max(rw * 0.5, b - POND_LIP)), b];
  };
  const map = (r, a) => { const [w2, b2] = radii(a); const out = w2 === rw && b2 === rb ? r : r <= rw ? r * w2 / rw : w2 + (r - rw) * (b2 - w2) / Math.max(0.01, rb - rw); return Math.min(limit(a), out); };
  const inv = (d, a) => { const [w2, b2] = radii(a); if (w2 === rw && b2 === rb) return d; return d <= w2 ? d * rw / w2 : rw + (d - w2) * (rb - rw) / Math.max(0.01, b2 - w2); };
  let most = 0;
  for (let i = 0; i < 360; i += 2) { const a = i * Math.PI / 180; most = Math.max(most, rb - radii(a)[1]); }
  return { rw, rb, touched: most > 0, most, limit, map, inv };
}

/** Axis of a long thin rect: { a: [x,z], b: [x,z], len, width } (a, b = the two short ends' midpoints). */
function longAxis(rect) {
  const along = rect.w >= rect.d ? [Math.cos(rect.ry), -Math.sin(rect.ry)] : [Math.sin(rect.ry), Math.cos(rect.ry)];
  const len = Math.max(rect.w, rect.d), width = Math.min(rect.w, rect.d);
  return { a: [rect.cx - along[0] * len / 2, rect.cz - along[1] * len / 2], b: [rect.cx + along[0] * len / 2, rect.cz + along[1] * len / 2], len, width, along };
}

// ground patch looks (painted with the shops-land field shader: soil tint, 'crop' colour, rows)
export const PATCH_LOOKS = {
  cricket: { soil: 0xc2a982, color: 0x9a8a5a, spacing: 0, cover: 0.06 },           // rolled bare pitch, a few dry grass tufts
  kabaddi: { soil: 0xb49a72, color: 0x7d8448, spacing: 0, cover: 0.12 },           // swept, trodden earth court
  parking: { soil: 0x8e7a5e, color: 0x5e4e3a, spacing: 1.9, cover: 0.22 },         // tractor / cart ruts
  truck: { soil: 0x9a7658, color: 0x5a4636, spacing: 2.3, cover: 0.2 },            // murram with deep tyre ruts
  market: { soil: 0xa48c68, color: 0x7a8442, spacing: 0, cover: 0.32 },            // trampled ground, thin grass at the edges
  drying: { soil: 0x8c7c58, color: 0x6e8440, spacing: 0, cover: 0.78 },            // grass the washermen spread cloth on
  play: { soil: 0xae946c, color: 0x758340, spacing: 0, cover: 0.24 },              // bare earth, patchy grass
  plot: { soil: 0x9c8462, color: 0x6c7a3c, spacing: 0, cover: 0.5 },              // empty plot, weeds
  potter: { soil: 0x9a6e4e, color: 0x7a6a48, spacing: 0, cover: 0.1 },             // red clay-stained earth
  tempo: { soil: 0x8a7a62, color: 0x524638, spacing: 1.7, cover: 0.2 },            // packed earth, oily ruts
  cane: { soil: 0x9e8660, color: 0xb8a462, spacing: 0, cover: 0.42 },              // trodden earth strewn with dry cane trash
};

export function planMapObjects(map) {
  const roads = map.roads || [];
  const out = { designs: [], patches: [], ponds: [], tanks: [], channels: [], gate: null, animals: [], pots: [], milestones: [], skipped: [], counts: {} };
  const count = (k) => { out.counts[k] = (out.counts[k] || 0) + 1; };
  const put = (kind, o, x, z, ry, extra = {}) => { out.designs.push({ kind, id: o.id, label: o.label, x, z, ry, ...extra }); count(kind); };
  const objs = map.objects || [];
  const channelObjs = objs.filter((o) => key(o) === 'new_channel' && o.rect);
  const usedChannel = new Set();

  for (const o of objs) {
    const k = key(o), n = nameOf(o), r = o.rect;
    if (k === 'new_tubewell' && r) {
      // the channel that starts at this pump room: the one with an end within 5 m of the room centre
      let best = null;
      for (const c of channelObjs) {
        const ax = longAxis(c.rect);
        for (const [end, other] of [[ax.a, ax.b], [ax.b, ax.a]]) {
          const d = Math.hypot(end[0] - r.cx, end[1] - r.cz);
          if (d < 5 && (!best || d < best.d)) best = { d, c, end, other, ax };
        }
      }
      let dir;
      if (best) { const L = Math.hypot(best.other[0] - best.end[0], best.other[1] - best.end[1]); dir = [(best.other[0] - best.end[0]) / L, (best.other[1] - best.end[1]) / L]; usedChannel.add(best.c.id); }
      else dir = [Math.cos(r.ry), -Math.sin(r.ry)]; // no channel drawn: outlet to the room's own right
      const ry = Math.atan2(-dir[1], dir[0]); // local +x (outlet, hauz) along the channel
      const doorFront = Math.sin(ry) * r.front[0] + Math.cos(ry) * r.front[1] >= 0;
      put('tubewell', o, r.cx, r.cz, ry, { door: doorFront ? 1 : -1, w: 3.2, d: 3.2, foot: rectRing(r.cx, r.cz, ry, 3.2, 3.2), hauz: rectRing(...toWorld(r.cx, r.cz, ry, 2.25, 0), ry, 1.3, 1.2) });
      if (best) {
        // the channel water runs from the hauz lip (2.9 m out from the room centre) to the channel's far end
        const start = [r.cx + dir[0] * 2.9, r.cz + dir[1] * 2.9];
        out.channels.push({ id: best.c.id, a: start, b: best.other, width: best.ax.width });
      }
    } else if (k === 'new_Mobile tower' && r) put('tower', o, r.cx, r.cz, r.ry, { w: r.w, d: r.d, far: true });
    else if (k === 'new_Transformer' && r) put('transformer', o, r.cx, r.cz, r.ry, { w: r.w, d: r.d });
    else if (k === 'new_notice' && r) put('notice', o, r.cx, r.cz, r.ry, { w: r.w, d: r.d });
    else if (k === 'new_Water trough' && r) put('trough', o, r.cx, r.cz, r.ry, { w: r.w, d: r.d });
    else if (k === 'new_machan' && r) put('machan', o, r.cx, r.cz, r.ry + Math.floor(hash01(r.cx, r.cz) * 4) * Math.PI / 2, { w: r.w, d: r.d });
    else if (k === 'new_scarecrow' && r) put('scarecrow', o, r.cx, r.cz, (r.w > r.d ? r.ry : r.ry + Math.PI / 2) + (hash01(r.cz, r.cx) - 0.5) * 0.5, { w: 1.6, d: 0.4 });
    else if (k === 'new_Washing platform' && r) put('washplatform', o, r.cx, r.cz, r.ry, { w: r.w, d: r.d });
    else if (k === 'new_Barber under a tree' && r) put('barber', o, r.cx, r.cz, r.ry, { w: 1.4, d: 1.4 });
    else if (k === 'new_Resting spot' && r) {
      const bench = hash01(r.cx * 0.7, r.cz * 1.3) < 0.34; // a third are cement benches, the rest charpais
      put(bench ? 'bench' : 'charpai', o, r.cx, r.cz, r.ry + (hash01(r.cx, 9) - 0.5) * 0.4, { w: 2, d: 1 });
    } else if (k === 'new_milestone' && r) {
      // a kilometre stone faces along its road, towards the traffic on its own side (src/milestones.js convention: face = +z)
      let mx = r.cx, mz = r.cz, moved = 0;
      // S7 fixes: a stone drawn on the carriageway steps sideways onto the verge (0.35 m clear of the edge)
      for (let it = 0; it < 4; it++) {
        const n0 = nearestRoad(roads, mx, mz), cl = n0 ? n0.d - n0.half : 99;
        if (cl >= 0.35) break;
        let nx = mx - n0.p[0], nz = mz - n0.p[1], L = Math.hypot(nx, nz);
        if (L < 1e-3) { nx = -n0.dir[1]; nz = n0.dir[0]; L = 1; }
        const step = 0.35 - cl + 0.01;
        mx += (nx / L) * step; mz += (nz / L) * step; moved += step;
      }
      const nr = nearestRoad(roads, mx, mz);
      let u = nr ? nr.dir : [1, 0];
      const nx = mx - (nr ? nr.p[0] : mx), nz = mz - (nr ? nr.p[1] : mz);
      if (nx * -u[1] + nz * u[0] < 0) u = [-u[0], -u[1]]; // stone on the right of travel
      out.milestones.push({ id: o.id, x: mx, z: mz, ry: Math.atan2(-u[0], -u[1]), road: nr && nr.id, clearance: nr ? +(nr.d - nr.half).toFixed(2) : null, moved: +moved.toFixed(2) });
      count('milestone');
    } else if (k === 'new_pots') {
      out.pots.push({ id: o.id, x: o.cx, z: o.cz, r: o.r || 0.35 });
      count('pot');
    } else if ((k === 'new_Buffalo' || k === 'new_cattle') && o.cx != null) {
      out.animals.push({ id: o.id, x: o.cx, z: o.cz, ry: hash01(o.cx, o.cz) * Math.PI * 2, buffalo: true });
      count('buffalo');
    } else if (k === 'new_gate') {
      if (!out.gate) out.gate = { pillars: [], arch: null };
      if (/pillar/i.test(n) && r) out.gate.pillars.push({ id: o.id, x: r.cx, z: r.cz, w: r.w, h: o.y1 || 6 });
      else if (r) out.gate.arch = { id: o.id, x: r.cx, z: r.cz, ry: r.ry, w: r.w, d: r.d, y0: o.y0 || 5, y1: o.y1 || 6.5, front: r.front };
      count('gate part');
    } else if ((k === 'new_Buffalo pond' || k === 'new_Cattle pond' || k === 'new_Clay pit pond') && o.rings?.[0]) {
      const kind = k.slice(4);
      let p = out.ponds.find((q) => q.kind === kind && Math.hypot(q.x - o.cx, q.z - o.cz) < 3);
      if (!p) { p = { kind, x: o.cx, z: o.cz, water: null, bank: null }; out.ponds.push(p); }
      if (/bank/i.test(n)) p.bank = o.rings[0]; else p.water = o.rings[0];
    } else if (k === 'new_temple_tank' && r) {
      let t = out.tanks[0];
      if (!t) { t = { x: r.cx, z: r.cz, ry: r.ry, front: r.front, outer: 0, inner: 0 }; out.tanks.push(t); }
      if (/steps/i.test(n)) t.outer = Math.min(r.w, r.d); else t.inner = Math.min(r.w, r.d);
    } else if (o.kind === 'ground' && r) {
      const P = {
        new_cricket: 'cricket', 'new_Kabaddi ground': 'kabaddi', new_parking: 'parking', 'new_Truck parking': 'truck',
        "new_Washerman's drying ground": 'drying', 'new_Kids play patch': 'play', "new_Kids' play corner": 'playcorner',
        'new_House plot': 'plot', new_potter: 'potter', 'new_Tempo and auto stand': 'tempo', 'new_Sugarcane buying centre': 'cane',
      }[k];
      if (P) { out.patches.push({ kind: P, id: o.id, ring: o.rings?.[0] || rectRing(r.cx, r.cz, r.ry, r.w, r.d), x: r.cx, z: r.cz, ry: r.ry, w: r.w, d: r.d }); count('patch ' + P); }
    } else if (k === 'new_Weekly market ground' && r) {
      out.patches.push({ kind: 'market', id: o.id, ring: o.rings?.[0], x: r.cx, z: r.cz, ry: r.ry, w: r.w, d: r.d });
      count('patch market');
    }
  }
  // channels whose start no pump room claims: water over their whole length
  for (const c of channelObjs) if (!usedChannel.has(c.id)) { const ax = longAxis(c.rect); out.channels.push({ id: c.id, a: ax.a, b: ax.b, width: ax.width }); }
  out.counts.channel = out.channels.length;
  out.counts.pond = out.ponds.length;
  out.counts.tank = out.tanks.length;

  // S7 fixes: patches that reach into a road step back to its edge (before their contents are placed, so plot pillars and
  // hopscotch follow); pond banks pull back to the gali edge, point by point (the drawn bank stays in p.bankDrawn)
  for (const p of out.patches) trimRectToRoads(p, roads);
  for (const p of out.ponds) {
    if (!p.water) continue;
    const sq = pondSqueeze(roads, p);
    if (!sq.touched) continue;
    // the shapes as built (for the checks): every ring point squeezed the same way the ground and water are
    const dense = (ring) => ring.flatMap((q, i) => { const n = ring[(i + 1) % ring.length]; return [0, 0.2, 0.4, 0.6, 0.8].map((t) => [q[0] + (n[0] - q[0]) * t, q[1] + (n[1] - q[1]) * t]); });
    const squeezeRing = (ring) => dense(ring).map(([x, z]) => { const a = Math.atan2(z - p.z, x - p.x), r = Math.hypot(x - p.x, z - p.z), r2 = sq.map(r, a); return [p.x + Math.cos(a) * r2, p.z + Math.sin(a) * r2]; });
    p.waterBuilt = squeezeRing(p.water);
    if (p.bank) p.bankBuilt = squeezeRing(p.bank);
    p.squeezed = +sq.most.toFixed(2);
  }

  // things inside the ground patches (they sit on the patch, built as designs)
  for (const p of out.patches) {
    if (p.kind === 'cricket') { // stumps at both popping ends of the 20 m strip (the pitch is 20.12 m in real life)
      const along = p.w >= p.d ? 0 : Math.PI / 2;
      for (const s of [-1, 1]) { const [x, z] = toWorld(p.x, p.z, p.ry + along, s * 9.4, 0); out.designs.push({ kind: 'stumps', id: p.id + (s > 0 ? 'b' : 'a'), x, z, ry: p.ry + along + (s > 0 ? Math.PI / 2 : -Math.PI / 2), w: 0.3, d: 0.3, soft: true }); }
      out.designs.push({ kind: 'creases', id: p.id + 'c', x: p.x, z: p.z, ry: p.ry + along, len: Math.max(p.w, p.d), soft: true });
    } else if (p.kind === 'kabaddi') out.designs.push({ kind: 'kabaddiLines', id: p.id + 'l', x: p.x, z: p.z, ry: p.ry, w: p.w, d: p.d, soft: true });
    else if (p.kind === 'play' || p.kind === 'playcorner') {
      out.designs.push({ kind: 'hopscotch', id: p.id + 'h', x: p.x + (hash01(p.x) - 0.5) * 2, z: p.z + (hash01(p.z) - 0.5) * 2, ry: p.ry + hash01(p.x, p.z) * 0.6, soft: true });
      if (p.kind === 'playcorner') out.designs.push({ kind: 'swing', id: p.id + 's', ...pos(p, -p.w * 0.28, 0), ry: p.ry, w: 2.8, d: 1.6 });
      else out.designs.push({ kind: 'brickWicket', id: p.id + 'w', ...pos(p, p.w * 0.3, -p.d * 0.2), ry: p.ry, w: 0.3, d: 0.3, soft: true });
    } else if (p.kind === 'plot') {
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) out.designs.push({ kind: 'plotPillar', id: `${p.id}p${a}${b}`, ...pos(p, a * (p.w / 2 - 0.2), b * (p.d / 2 - 0.2)), ry: p.ry, w: 0.3, d: 0.3 });
    } else if (p.kind === 'potter') {
      out.designs.push({ kind: 'potterWheel', id: p.id + 'w', ...pos(p, -p.w * 0.3, p.d * 0.22), ry: p.ry, w: 1, d: 1 });
      out.designs.push({ kind: 'kiln', id: p.id + 'k', ...pos(p, p.w * 0.3, p.d * 0.2), ry: p.ry, w: 2.6, d: 2.6 });
      out.designs.push({ kind: 'clayHeap', id: p.id + 'c', ...pos(p, -p.w * 0.36, -p.d * 0.3), ry: p.ry, w: 1.8, d: 1.4, soft: true });
    } else if (p.kind === 'cane') {
      out.designs.push({ kind: 'taraju', id: p.id + 't', ...pos(p, 0, p.d * 0.25), ry: p.ry, w: 2.2, d: 1.8 });
      for (const [i, [a, b]] of [[-0.3, -0.2], [0.05, -0.28], [0.32, -0.1]].entries()) out.designs.push({ kind: 'caneHeap', id: `${p.id}h${i}`, ...pos(p, a * p.w, b * p.d), ry: p.ry + i * 0.4, w: 3, d: 1.6 });
    } else if (p.kind === 'drying') {
      for (let i = 0; i < 14; i++) out.designs.push({ kind: 'cloth', id: `${p.id}c${i}`, ...pos(p, (hash01(i, 1) - 0.5) * (p.w - 2.5), (hash01(i, 2) - 0.5) * (p.d - 2)), ry: p.ry + (hash01(i, 3) - 0.5) * 0.5, seed: i, soft: true });
    }
  }
  out.skipped.push(
    'new_Bus shelter, new_Cycle stand: built by shops-land (open sheds)',
    'new_Old well, new_Well, new_well: built by shops-land (wells)',
    'new_grazing, new_Mango baagh: painted by shops-land (green ground)',
    'new_culvert, new_Goods yard, new_Gher yard, new_Dung cake yard, new_Haystacks, new_Carrom under a tree: the layout wiring moves the game\'s own models there',
    'new_sqh (Shopkeeper\'s home and godown, a 7 x 4.4 m two-storey building): built by the shops kit (S7 fixes, src/kit/shopsPlace.js)',
  );
  return out;
}
const pos = (p, lx, lz) => { const [x, z] = toWorld(p.x, p.z, p.ry, lx, lz); return { x, z }; };

/** Footprint ring of a design for the checks (default: its w x d rectangle). */
export function designRing(dz) {
  if (dz.foot) return dz.foot;
  return rectRing(dz.x, dz.z, dz.ry, dz.w || 1, dz.d || 1);
}
