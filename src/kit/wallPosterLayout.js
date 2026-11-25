// Wall poster layout (pure JS, no three.js). Decides WHERE each cut-out poster/mural goes on the building walls.
// layoutWallPosters(boxes, cells, ctx) -> { placements, stats }. Deterministic (seeded mulberry32).
// Wall model copied from src/kit/wallMurals.js: back / left / right walls of the footprint, never the front.

const APRON_M = { highway: 0.58, road: 0.42, lane: 0.31, back: 0.19, track: 0.46, path: 0.17 };
const AMP = { highway: 0.2, road: 0.32, lane: 0.3, back: 0.2, track: 0.45, path: 0.2 }; // = ROAD_KINDS[k].amp
const ROAD_FACE_DIST = 7, WALL_END_CLEAR = 0.25, MIN_USABLE = 1.2, OFFSET = 0.02;
const CELL = 32;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// grid index over road segments (cached per roads object) so roadDepth stays cheap
const _gridCache = new WeakMap();
function segGrid(roads) {
  let g = _gridCache.get(roads);
  if (g) return g;
  g = new Map();
  for (const s of roads.segs) {
    const e = s.half + Math.max((AMP[s.kind] ?? 0.3) * 1.4, APRON_M[s.kind] ?? 0.31) + 0.5;
    const x0 = Math.floor((Math.min(s.a[0], s.b[0]) - e) / CELL), x1 = Math.floor((Math.max(s.a[0], s.b[0]) + e) / CELL);
    const z0 = Math.floor((Math.min(s.a[1], s.b[1]) - e) / CELL), z1 = Math.floor((Math.max(s.a[1], s.b[1]) + e) / CELL);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const k = i * 100003 + j; let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(s);
    }
  }
  _gridCache.set(roads, g);
  return g;
}
// > 0 means "on the road or its dusty apron" (same model as wallMurals.js roadDepth)
function roadDepth(roads, x, z) {
  if (!roads || !roads.segs) return -9;
  const l = segGrid(roads).get(Math.floor(x / CELL) * 100003 + Math.floor(z / CELL));
  if (!l) return -9;
  let worst = -9;
  for (const s of l) {
    const e = s.half + Math.max((AMP[s.kind] ?? 0.3) * 1.4, APRON_M[s.kind] ?? 0.31);
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2));
    worst = Math.max(worst, e - Math.hypot(x - (s.a[0] + dx * t), z - (s.a[1] + dz * t)));
  }
  return worst;
}

const lc = (s) => String(s || '').toLowerCase();
const CIVIC_IDS = new Set(['sVaccinate', 'cvVaccineShield', 'cvBetiPadhao', 'sEqualChild', 'cvEqualBanner', 'cvLiteracy']);
const ANIMAL_IDS = new Set(['sMissingCow', 'ppMissGoat', 'ppMissDog', 'ppMissCalf', 'sHelpDairy']);
const SHOP_ADS = {
  muFreshMilk: /dairy|milk|lassi|dudh/, muCyclePuncture: /puncture|cycle/,
  muTeaSnacks: /tea|snack|chai/, muHairCutting: /barber|hair|salon|\bnai\b/,
};
const HOUSE_ONLY = new Set(['muNamePlate', 'muHouseNumber', 'sToLet']);

export function layoutWallPosters(boxes, cells, ctx = {}) {
  const rng = mulberry32(0x5eed1a);
  const R = (a, b) => a + (b - a) * rng();
  const roads = ctx.roads || null;
  const stats = { boxes: boxes.length };

  // ---- places by role ----
  const grp = { civic: [], school: [], bazaar: [], animal: [] };
  for (const p of ctx.places || []) {
    const n = lc(p.name);
    if (/panchayat|school|anganwadi|library/.test(n)) grp.civic.push(p);
    if (/primary school/.test(n)) grp.school.push(p);
    if (/bazaar|bus adda|mela ground|chaupal/.test(n)) grp.bazaar.push(p);
    if (/dudh dairy|gaushala|cattle/.test(n)) grp.animal.push(p);
  }
  const near = (list, x, z, r) => list.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 <= r * r);

  // ---- spatial grid of boxes for the "nothing standing in front" test ----
  const bgrid = new Map();
  boxes.forEach((b, i) => {
    const r = Math.hypot(b.w, b.d) / 2 + 0.2;
    for (let gx = Math.floor((b.x - r) / CELL); gx <= Math.floor((b.x + r) / CELL); gx++)
      for (let gz = Math.floor((b.z - r) / CELL); gz <= Math.floor((b.z + r) / CELL); gz++) {
        const k = gx * 100003 + gz; let l = bgrid.get(k); if (!l) bgrid.set(k, (l = [])); l.push(i);
      }
  });
  const blockedAt = (self, px, pz) => {
    const l = bgrid.get(Math.floor(px / CELL) * 100003 + Math.floor(pz / CELL));
    if (!l) return false;
    for (const i of l) {
      const o = boxes[i]; if (o === self) continue;
      const oc = Math.cos(o.ry), os = Math.sin(o.ry), dx = px - o.x, dz = pz - o.z;
      if (Math.abs(dx * oc - dz * os) <= o.w / 2 + 0.05 && Math.abs(dx * os + dz * oc) <= o.d / 2 + 0.05) return true;
    }
    return false;
  };

  // ---- walls with free intervals ----
  const walls = [];
  for (const b of boxes) {
    const { x, z, ry, w, d } = b;
    if (!(w > 0) || !(d > 0)) continue;
    const c = Math.cos(ry), s = Math.sin(ry);
    const wallEnd = b.zFront ?? d / 2;
    const defs = [
      { key: 'back', lx: 0, lz: -d / 2, nlx: 0, nlz: -1, tlx: 1, tlz: 0, len: w },
      { key: 'left', lx: -w / 2, lz: (-d / 2 + wallEnd) / 2, nlx: -1, nlz: 0, tlx: 0, tlz: 1, len: wallEnd + d / 2 },
      { key: 'right', lx: w / 2, lz: (-d / 2 + wallEnd) / 2, nlx: 1, nlz: 0, tlx: 0, tlz: 1, len: wallEnd + d / 2 },
    ];
    for (const wl of defs) {
      if (wl.len - 2 * WALL_END_CLEAR < MIN_USABLE) continue;
      const ox = x + wl.lx * c + wl.lz * s, oz = z - wl.lx * s + wl.lz * c;
      const tx = wl.tlx * c + wl.tlz * s, tz = -wl.tlx * s + wl.tlz * c;
      const nx = wl.nlx * c + wl.nlz * s, nz = -wl.nlx * s + wl.nlz * c;
      const half = wl.len / 2 - WALL_END_CLEAR;
      // sample the wall every 0.2 m; a sample is free when nothing stands 0.35/0.8/1.1 m out and it is not road/apron
      const step = 0.2, n = Math.floor((2 * half) / step), free = [];
      for (let k = 0; k <= n; k++) {
        const t = -half + k * step, px = ox + tx * t, pz = oz + tz * t;
        let ok = roadDepth(roads, px + nx * OFFSET, pz + nz * OFFSET) <= 0 && roadDepth(roads, px + nx * 0.35, pz + nz * 0.35) <= 0;
        if (ok) for (const k2 of [0.35, 0.8, 1.1]) if (blockedAt(b, px + nx * k2, pz + nz * k2)) { ok = false; break; }
        free.push(ok);
      }
      const ivs = [];
      for (let k = 0; k <= n; k++) {
        if (!free[k]) continue;
        let e = k; while (e + 1 <= n && free[e + 1]) e++;
        const t0 = -half + k * step, t1 = -half + e * step;
        if (t1 - t0 >= MIN_USABLE) ivs.push({ t0, t1 });
        k = e;
      }
      if (!ivs.length) continue;
      const mx = ox + nx * 2.5, mz = oz + nz * 2.5;
      const roadFacing = roads && roads.clearance ? roads.clearance(mx, mz) <= ROAD_FACE_DIST : false;
      const usable = ivs.reduce((a, v) => a + (v.t1 - v.t0), 0);
      const maxIv = Math.max(...ivs.map((v) => v.t1 - v.t0));
      walls.push({
        b, key: wl.key, ox, oz, tx, tz, nx, nz, ivs, roadFacing, usable, maxIv, y: b.y || 0,
        isShop: b.kind === 'shop', shopName: lc(b.name), ids: new Set(), hasPainted: false,
        civic: near(grp.civic, ox, oz, 60), school40: roadFacing && near(grp.school, ox, oz, 40),
        bazaar: near(grp.bazaar, ox, oz, 60), animal: near(grp.animal, ox, oz, 60),
        sun: Math.max(0, nx * 0.7071 - nz * 0.7071),
      });
    }
  }
  stats.walls = walls.length;
  stats.roadFacingWalls = walls.filter((w) => w.roadFacing).length;

  // ---- anchors (cluster regions) ----
  let anchors = [];
  for (const wl of walls) {
    for (const iv of wl.ivs) {
      const L = iv.t1 - iv.t0;
      let cur;
      const fromRight = rng() < 0.4;
      const rw0 = Math.min(L, R(1.5, 3.6));
      if (L <= 6) {
        // single cluster, snapped near a corner/end (never centred)
        const left = fromRight ? iv.t1 - rw0 - R(0, 0.3) : iv.t0 + R(0, 0.3);
        anchors.push(mkAnchor(wl, Math.max(iv.t0, left), Math.min(iv.t1, Math.max(iv.t0, left) + rw0)));
        continue;
      }
      cur = fromRight ? iv.t0 + R(0, 3) : iv.t0 + R(0, 0.4);
      while (cur < iv.t1 - 1.2) {
        const rw = Math.min(iv.t1 - cur, R(1.5, 3.6));
        anchors.push(mkAnchor(wl, cur, cur + rw));
        cur += R(6, 10);
      }
    }
  }
  function mkAnchor(wl, r0, r1) { return { wl, r0, r1, cursor: r0 + R(0, 0.15), items: [], last: null, painted: false, roadFacing: wl.roadFacing }; }
  // hidden walls get ~35% of clusters (doubled 26 Nov)
  const roadA = anchors.filter((a) => a.roadFacing), hidA = anchors.filter((a) => !a.roadFacing);
  const keepHid = Math.min(hidA.length, Math.round((roadA.length * 0.35) / 0.65));
  for (let i = hidA.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [hidA[i], hidA[j]] = [hidA[j], hidA[i]]; }
  anchors = roadA.concat(hidA.slice(0, keepHid));
  anchors.sort((a, b) => walls.indexOf(a.wl) - walls.indexOf(b.wl) || a.r0 - b.r0);
  stats.anchors = anchors.length;

  // ---- ids, eligibility, quotas ----
  const ids = Object.keys(cells || {}).filter((id) => id !== 'sWantedThief').sort();
  const info = {};
  for (const id of ids) {
    const c = cells[id];
    const painted = c.treatment === 'painted';
    const neon = !!c.neon || /^sNeon|^nv/.test(id);
    const film = /movie|film/.test(lc(c.kind)) || /^sFilm|^ppFilm/.test(id);
    info[id] = { c, painted, neon, film, quota: painted ? 8 : Math.round(R(14, 22)) };
  }
  // keep only as many clusters as demand needs (about 2.8 posters each) so clusters really are 2-4 strong;
  // shop/school walls with special ads stay in the pool
  {
    const D0 = ids.reduce((a, id) => a + info[id].quota, 0), want = Math.ceil(D0 / 2.6);
    if (anchors.length > want) {
      const special = (a) => a.wl.school40 || a.wl.bazaar || a.wl.animal || (a.wl.isShop && Object.values(SHOP_ADS).some((re) => re.test(a.wl.shopName)));
      const sp = anchors.filter(special), rest = anchors.filter((a) => !special(a));
      for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
      const firstOf = new Set(), seenW = new Set();
      for (const a of anchors) if (!seenW.has(a.wl)) { seenW.add(a.wl); firstOf.add(a); } // every wall keeps one anchor
      const keep = new Set(sp); firstOf.forEach((a) => keep.add(a));
      for (const a of rest.filter((x) => !keep.has(x))) if (keep.size < want) keep.add(a);
      anchors = anchors.filter((a) => keep.has(a));
      anchors.sort((a, b) => walls.indexOf(a.wl) - walls.indexOf(b.wl) || a.r0 - b.r0);
    }
    stats.anchorsUsed = anchors.length;
  }
  function eligible(id, wl) {
    const f = info[id];
    if (wl.ids.has(id)) return false;
    if (f.painted && (wl.hasPainted || wl.maxIv < 2.2 || wl.usable < 2.2)) return false;
    if (f.painted && count[id] >= 5 && wl.maxIv < 6) return false; // 6th-8th copies only on large blank walls
    if (CIVIC_IDS.has(id)) return wl.civic;
    if (id === 'cvSchoolAhead') return wl.school40;
    if (f.neon || f.film) return wl.bazaar;
    if (ANIMAL_IDS.has(id)) return wl.animal;
    if (SHOP_ADS[id]) return wl.isShop && SHOP_ADS[id].test(wl.shopName);
    if (HOUSE_ONLY.has(id)) return !wl.isShop;
    if (id === 'muShopSale') return wl.isShop;
    return true;
  }
  const count = {};
  const cand = {};
  for (const id of ids) cand[id] = anchors.filter((a) => eligible(id, a.wl));
  // even scale-down when demand exceeds capacity (est. 2.6 posters per cluster)
  const D = ids.reduce((a, id) => a + (cand[id].length ? info[id].quota : 0), 0);
  const C = anchors.length * 2.6;
  const scale = Math.min(1, (0.9 * C) / Math.max(1, D));
  for (const id of ids) info[id].target = Math.max(1, Math.round(info[id].quota * scale));
  stats.scale = +scale.toFixed(3);

  // ---- try to add one poster to an anchor ----
  const sunFade = (wl) => Math.min(1, R(0.05, 0.3) + wl.sun * R(0.3, 0.6));
  function tryAdd(a, id) {
    const f = info[id], c = f.c, wl = a.wl;
    if (a.painted || a.items.length >= 4) return false;
    if (f.painted && a.items.length) return false;
    const sc = R(0.92, 1.08), w = c.w * sc, h = c.h * sc;
    let roll = 0;
    if (!f.painted && rng() >= 0.55) roll = (R(3, 12) * Math.PI / 180) * (rng() < 0.5 ? -1 : 1);
    const ar = Math.abs(roll), ew = w * Math.cos(ar) + h * Math.sin(ar);
    let left, bottom;
    if (!a.items.length) left = a.cursor;
    else {
      const p = a.last;
      if (rng() < 0.45) left = p.right - R(0.05, 0.25) * p.ew; else left = p.right + R(0.05, 0.45);
    }
    if (f.painted) { bottom = R(0.8, 1.2); left = Math.min(left, a.r1 - ew); if (left < a.r0 - 0.05) return false; }
    else {
      if (a.last) {
        let dlt = R(0.10, 0.25) * (rng() < 0.5 ? -1 : 1), b = a.last.bottom + dlt;
        if (b < 1.0 || b > 1.6) b = a.last.bottom - dlt;
        bottom = Math.max(1.0, Math.min(1.6, b));
      } else bottom = R(1.0, 1.6);
    }
    if (left + ew > a.r1 + 0.05) return false;
    const it = { id, w, h, roll, ew, left, right: left + ew, bottom, layer: a.items.length };
    a.items.push(it); a.last = it; a.cursor = it.right;
    if (f.painted) a.painted = true;
    wl.ids.add(id); if (f.painted) wl.hasPainted = true;
    return true;
  }

  // ---- fill: round-robin, narrowest ids first ----
  const order = ids.slice().sort((p, q) => cand[p].length - cand[q].length);
  const paintedAt = {}; ids.forEach((id) => { count[id] = 0; paintedAt[id] = []; });
  const dead = new Set();
  let progress = true;
  while (progress) {
    progress = false;
    for (const id of order) {
      if (dead.has(id) || count[id] >= info[id].target) continue;
      const list = cand[id], f = info[id];
      let done = false;
      for (let att = 0; att < 80 && !done; att++) {
        // clumping: prefer a cluster that already has 1-3 posters
        let a = list[Math.floor(rng() * list.length)];
        if (!f.painted) for (let k = 0; k < 10; k++) {
          if (a.items.length >= 1 && a.items.length <= 2 && a.r1 - a.cursor > 0.6 && !a.painted) break;
          a = list[Math.floor(rng() * list.length)];
        }
        if (!a || !eligible(id, a.wl)) continue;
        if (f.painted) {
          const mx = a.wl.ox + a.wl.tx * (a.r0 + a.r1) / 2, mz = a.wl.oz + a.wl.tz * (a.r0 + a.r1) / 2;
          if (paintedAt[id].some((p) => (p[0] - mx) ** 2 + (p[1] - mz) ** 2 < 1600)) continue;
          if (tryAdd(a, id)) { paintedAt[id].push([mx, mz]); done = true; }
        } else if (tryAdd(a, id)) done = true;
      }
      if (done) { count[id]++; progress = true; } else dead.add(id);
    }
  }

  // ---- pass 2: any wall still bare gets a poster (least-used eligible id first) ----
  for (const a of anchors) {
    if (a.items.length || a.wl.ids.size) continue;
    if (!a.wl.roadFacing && rng() < 0.4) continue; // ~40% of the hidden back walls stay bare
    const pool = ids.filter((id) => !info[id].painted && count[id] < info[id].target * 5 && eligible(id, a.wl)).sort((p, q) => count[p] / info[p].target - count[q] / info[q].target);
    for (const id of pool.slice(0, 6)) if (tryAdd(a, id)) { count[id]++; break; }
  }

  // ---- emit ----
  const placements = [];
  let clusters = 0, roadClusters = 0;
  for (const a of anchors) {
    if (!a.items.length) continue;
    clusters++; if (a.roadFacing) roadClusters++;
    const wl = a.wl;
    for (const it of a.items) {
      const t = (it.left + it.right) / 2, f = info[it.id];
      placements.push({
        id: it.id, cx: wl.ox + wl.tx * t + wl.nx * OFFSET, cz: wl.oz + wl.tz * t + wl.nz * OFFSET,
        bottomY: wl.y + it.bottom, nx: wl.nx, nz: wl.nz, w: it.w, h: it.h, rollRad: it.roll,
        bright: R(0.9, 1.08), warm: rng(), fade: sunFade(wl), rain: !f.painted && rng() < 0.25,
        layer: Math.min(3, it.layer), treatment: f.c.treatment, roadFacing: wl.roadFacing,
      });
    }
  }
  const per = {}; ids.forEach((id) => (per[id] = 0)); placements.forEach((p) => per[p.id]++);
  stats.perId = per; stats.targets = Object.fromEntries(ids.map((id) => [id, info[id].target]));
  stats.wallsWithPosters = new Set(placements.map((p) => p.cx.toFixed(2) + '|' + p.cz.toFixed(2) + '|' + p.nx.toFixed(2) + p.nz.toFixed(2))).size && walls.filter((w) => w.ids.size).length;
  stats.placed = placements.length; stats.clusters = clusters; stats.roadClusters = roadClusters;
  stats.roadFacingPlaced = placements.filter((p) => p.roadFacing).length;
  stats.avgPerCluster = clusters ? +(placements.length / clusters).toFixed(2) : 0;
  stats.noEligibleWall = ids.filter((id) => !cand[id].length);
  return { placements, stats };
}
