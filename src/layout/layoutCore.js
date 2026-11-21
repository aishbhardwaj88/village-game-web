/**
 * Pure layout maths (no three.js, no browser): runs the same in the game and in Node tools (tools/layout-tests.mjs).
 * src/layout/layout.js feeds it the packed approved map; the tests feed it the same file.
 *
 * Conventions (the game's, checked 21 Nov against the running game, docs/s7/layout.md "Coordinate check"):
 *  - world x = east, z = south, metres.
 *  - yaw `ry` = three.js rotation.y. A model's local (lx, lz) lands at world (x + lx cos ry + lz sin ry, z - lx sin ry + lz cos ry),
 *    so local +z (the front) points along (sin ry, cos ry). Hence ry = atan2(front.x, front.z).
 */
import { FRONT_OFFSETS, frontOffsetDeg } from './frontOffsets.js';

export const DEG = Math.PI / 180;
/** three.js yaw that turns local +z onto the unit vector (fx, fz). */
export const yawOf = (fx, fz) => Math.atan2(fx, fz);
/** Unit front vector of a yaw. */
export const frontOfYaw = (ry) => [Math.sin(ry), Math.cos(ry)];
/** Angle wrapped to (-PI, PI]. */
export function wrapPi(a) {
  a = ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return a <= -Math.PI ? a + 2 * Math.PI : a;
}
/** Local (lx, lz) of a thing at (x, z, ry) -> world. */
export function localToWorld(x, z, ry, lx, lz) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return { x: x + lx * c + lz * s, z: z - lx * s + lz * c };
}

// ------------------------------------------------------------------ roads
/** Nearest point of segment a-b to p: distance, the point, and the segment's unit direction. */
export function segNear(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
  const t = L2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2)) : 0;
  const qx = a[0] + t * dx, qz = a[1] + t * dz, L = Math.sqrt(L2) || 1;
  return { d: Math.hypot(px - qx, pz - qz), qx, qz, t, ux: dx / L, uz: dz / L };
}

/**
 * Nearest road to (x, z) measured to its EDGE (centre distance - width / 2; negative = on the carriageway).
 * `filter(road)` limits the kinds. Returns { road, i, d, edge, qx, qz, ux, uz } (u = the road's direction there).
 */
export function nearestRoad(roads, x, z, filter) {
  let best = null;
  for (const r of roads) {
    if (filter && !filter(r)) continue;
    if (r.bbox && (x < r.bbox[0] - 60 || x > r.bbox[2] + 60 || z < r.bbox[1] - 60 || z > r.bbox[3] + 60) && best && best.edge < 30) continue;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const s = segNear(x, z, r.pts[i], r.pts[i + 1]);
      const edge = s.d - r.width / 2;
      if (!best || edge < best.edge) best = { road: r, i, d: s.d, edge, qx: s.qx, qz: s.qz, ux: s.ux, uz: s.uz };
    }
  }
  return best;
}

export function roadBBox(r) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of r.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return [x0 - r.width, z0 - r.width, x1 + r.width, z1 + r.width];
}

// ------------------------------------------------------------------ shapes
/** A 4-corner ring -> { cx, cz, corners } plus the two edge lengths and the direction of edge 0. */
export function rectFromRing(ring) {
  const p = ring.length === 5 && ring[0][0] === ring[4][0] && ring[0][1] === ring[4][1] ? ring.slice(0, 4) : ring;
  if (p.length !== 4) return null;
  const cx = (p[0][0] + p[1][0] + p[2][0] + p[3][0]) / 4, cz = (p[0][1] + p[1][1] + p[2][1] + p[3][1]) / 4;
  return { cx, cz, corners: p };
}

/**
 * Orient a rectangle by a front direction: the edge whose outward normal is closest to `front` becomes the front edge.
 * Returns { cx, cz, w (front edge length), d (depth), ry (yaw that makes local +z the front, edges square), front, frontMid }.
 */
export function orientRect(rect, front) {
  const { cx, cz, corners: p } = rect;
  let best = null;
  for (let i = 0; i < 4; i++) {
    const a = p[i], b = p[(i + 1) % 4];
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const nx = mx - cx, nz = mz - cz, n = Math.hypot(nx, nz) || 1;
    const dot = (nx * front[0] + nz * front[1]) / n;
    if (!best || dot > best.dot) best = { dot, i, mx, mz, nx: nx / n, nz: nz / n, w: Math.hypot(b[0] - a[0], b[1] - a[1]), dd: 2 * n };
  }
  const ry = yawOf(best.nx, best.nz);
  return { cx, cz, w: best.w, d: best.dd, ry, front: [best.nx, best.nz], frontMid: [best.mx, best.mz] };
}

/** World corners of an oriented box (cx, cz, w along local x, d along local z, ry). */
export function boxCorners(cx, cz, w, d, ry) {
  const out = [];
  for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) {
    const q = localToWorld(cx, cz, ry, lx, lz);
    out.push([q.x, q.z]);
  }
  return out;
}

/** Separating-axis overlap depth of two convex quads (0 when apart). */
export function quadOverlap(A, B) {
  let min = Infinity;
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      let ax = -(b[1] - a[1]), az = b[0] - a[0];
      const L = Math.hypot(ax, az) || 1; ax /= L; az /= L;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const q of A) { const v = q[0] * ax + q[1] * az; a0 = Math.min(a0, v); a1 = Math.max(a1, v); }
      for (const q of B) { const v = q[0] * ax + q[1] * az; b0 = Math.min(b0, v); b1 = Math.max(b1, v); }
      const ov = Math.min(a1, b1) - Math.max(a0, b0);
      if (ov <= 0) return 0;
      min = Math.min(min, ov);
    }
  }
  return min;
}

// ------------------------------------------------------------------ the layout
const prefixOf = (label) => String(label || '').split('|')[0].trim();
const nameOf = (label) => { const s = String(label || ''); const i = s.indexOf('|'); return (i >= 0 ? s.slice(i + 1) : s).trim(); };

/**
 * Build the whole layout from the packed map. Pure; cache the result.
 * places: { [id]: { id, name, hi, x, z, front, frontYaw, ry, offsetDeg, row, existing, minor, before } }
 * objects: [{ id, prefix, name, kind, color, y0, y1, y, h, rings | (cx, cz, r), rect? }] (rect = oriented box facing its road)
 */
export function buildLayout(data) {
  const roads = data.roads.map((r) => ({ ...r, bbox: roadBBox(r) }));
  // the roundabout is drawn as a ground ring; the game lays it as a 7 m ring carriageway round a 6 m island (src/mapPlan.js
  // CHAURAHA), so it joins the road list as that ring
  const rb = data.objects.find((o) => /^road_roundabout/.test(o.label));
  if (rb) {
    const ring = rb.rings[0];
    let cx = 0, cz = 0, R = 0;
    for (const [x, z] of ring) { cx += x; cz += z; }
    cx /= ring.length; cz /= ring.length;
    for (const [x, z] of ring) R += Math.hypot(x - cx, z - cz);
    R /= ring.length;
    const w = 7, rc = R - w / 2, pts = [];
    for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; pts.push([+(cx + Math.cos(a) * rc).toFixed(2), +(cz + Math.sin(a) * rc).toFixed(2)]); }
    const r = { id: 'chauraha_ring', kind: 'road', width: w, name: 'Roundabout', pts, closed: true, centre: [cx, cz] };
    roads.push({ ...r, bbox: roadBBox(r) });
  }
  const places = {};
  const list = [];
  for (const p of data.places) {
    const off = frontOffsetDeg(p.id);
    const e = FRONT_OFFSETS[p.id] || {};
    let front = p.front.slice();
    let ry;
    // UNTOUCHED places (the map's own note: "fixed and untouched: the roundabout, the dark brown roads, the primary school,
    // the anganwadi, the Gurukul college and the sports grounds"): same spot as today and the export's front is exactly the
    // reverse of its "before" value, the export's front flip applied to a place nobody turned. They keep today's yaw:
    // before.front is (sin ry, cos ry) of today's anchor, so the anchor yaw is read back from it and the true front is that
    // yaw minus the model's own offset.
    const untouched = !!p.before && Math.hypot(p.x - p.before.x, p.z - p.before.z) < 0.5
      && front[0] * p.before.front[0] + front[1] * p.before.front[1] < -0.9;
    if (untouched) {
      ry = yawOf(p.before.front[0], p.before.front[1]);
      front = frontOfYaw(ry - off * DEG);
    } else ry = wrapPi(yawOf(front[0], front[1]) + off * DEG);
    const frontYaw = yawOf(front[0], front[1]);
    const q = {
      id: p.id, name: p.name, hi: p.hi || '', x: p.x, z: p.z, front, frontYaw,
      ry, offsetDeg: off, row: !!e.row, existing: !!p.existing, minor: !!p.minor, untouched,
      before: p.before ? { x: p.before.x, z: p.before.z } : null,
    };
    places[p.id] = q;
    list.push(q);
  }
  const counts = {};
  const objects = data.objects.map((o) => {
    const prefix = prefixOf(o.label);
    counts[prefix] = (counts[prefix] || 0) + 1;
    const out = { id: `${prefix}#${counts[prefix]}`, prefix, name: nameOf(o.label), kind: o.kind, label: o.label, color: o.color ?? null, y0: o.y0 ?? null, y1: o.y1 ?? null, y: o.y ?? null };
    out.h = o.y1 ?? null;
    if (o.kind === 'trees') { out.cx = o.cx; out.cz = o.cz; out.r = o.r; return out; }
    out.rings = o.rings;
    const ring = o.rings[0];
    let cx = 0, cz = 0;
    for (const [x, zz] of ring) { cx += x; cz += zz; }
    out.cx = cx / ring.length; out.cz = cz / ring.length;
    const rect = ring.length === 4 ? rectFromRing(ring) : null;
    if (rect) {
      // a place drawn on this footprint decides its front; otherwise the side nearest a road (galis count) is the front
      let front = null;
      for (const p of list) if (!p.existing && p.name === out.name && Math.hypot(p.x - rect.cx, p.z - rect.cz) < 3) { front = p.front; out.place = p.id; break; }
      if (!front) {
        const n = nearestRoad(roads, rect.cx, rect.cz);
        front = n ? [n.qx - rect.cx, n.qz - rect.cz] : [0, 1];
        const L = Math.hypot(front[0], front[1]) || 1; front = [front[0] / L, front[1] / L];
      }
      out.rect = orientRect(rect, front);
    } else {
      let r = 0;
      for (const [x, zz] of ring) r = Math.max(r, Math.hypot(x - out.cx, zz - out.cz));
      out.r = r;
    }
    return out;
  });
  return { places, list, roads, objects, canal: data.canal };
}

// ------------------------------------------------------------------ road probes (shared by the snap and tools/layout-tests.mjs)
/** The road whose carriageway covers (x, z), or null. */
export function roadUnder(roads, x, z, tol = 0) {
  for (const r of roads) {
    if (x < r.bbox[0] || x > r.bbox[2] || z < r.bbox[1] || z > r.bbox[3]) continue;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const s = segNear(x, z, r.pts[i], r.pts[i + 1]);
      if (s.d <= r.width / 2 - tol) return { r, ux: s.ux, uz: s.uz, pen: r.width / 2 - s.d };
    }
  }
  return null;
}
/** 0..90 degrees between two undirected directions. */
export function lineAngle(ax, az, bx, bz) {
  const a = Math.abs(Math.atan2(ax * bz - az * bx, ax * bx + az * bz)) * 180 / Math.PI;
  return Math.min(a, 180 - a);
}
/** The edge of a quad whose outward normal is closest to `front`: { a, c, nx, nz } (n = outward unit normal). */
export function frontEdge(corners, front) {
  const cx = corners.reduce((s, q) => s + q[0], 0) / 4, cz = corners.reduce((s, q) => s + q[1], 0) / 4;
  let best = null;
  for (let i = 0; i < 4; i++) {
    const a = corners[i], c = corners[(i + 1) % 4];
    const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2, n = Math.hypot(mx - cx, mz - cz) || 1;
    const dot = ((mx - cx) * front[0] + (mz - cz) * front[1]) / n;
    if (!best || dot > best.dot) best = { dot, a, c, nx: (mx - cx) / n, nz: (mz - cz) / n };
  }
  return best;
}
/**
 * Does the front face a road? From 9 points along the front edge walk straight out (0.25 m steps, up to `reach` m) until a
 * carriageway starts. Returns { gap (shortest walk), road, par (deg between the front edge and that road), ux, uz } or null.
 */
export function frontProbe(roads, corners, front, reach = 30) {
  const e = frontEdge(corners, front);
  const ex = e.c[0] - e.a[0], ez = e.c[1] - e.a[1], L = Math.hypot(ex, ez) || 1;
  let nx = -ez / L, nz = ex / L;
  if (nx * e.nx + nz * e.nz < 0) { nx = -nx; nz = -nz; }
  let best = null;
  for (let k = 1; k <= 9; k++) {
    const t = k / 10, px = e.a[0] + ex * t, pz = e.a[1] + ez * t;
    for (let d = 0; d <= reach; d += 0.25) {
      if (best && d >= best.gap) break;
      const h = roadUnder(roads, px + nx * d, pz + nz * d);
      if (h) { best = { gap: d, road: h.r, ux: h.ux, uz: h.uz }; break; }
    }
  }
  if (best) best.par = lineAngle(ex, ez, best.ux, best.uz);
  return best;
}
/** Deepest a quad reaches into any carriageway (0 = clear), sampled every 0.5 m. */
export function roadDepth(roads, corners, tol = 0.1) {
  const [p0, p1, , p3] = corners;
  const ux = p1[0] - p0[0], uz = p1[1] - p0[1], vx = p3[0] - p0[0], vz = p3[1] - p0[1];
  const nu = Math.max(1, Math.ceil(Math.hypot(ux, uz) / 0.5)), nv = Math.max(1, Math.ceil(Math.hypot(vx, vz) / 0.5));
  let worst = null;
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const h = roadUnder(roads, p0[0] + ux * i / nu + vx * j / nv, p0[1] + uz * i / nu + vz * j / nv, tol);
    if (h && (!worst || h.pen > worst.pen)) worst = { pen: h.pen, road: h.r };
  }
  return worst;
}
