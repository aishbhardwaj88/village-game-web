#!/usr/bin/env node
/**
 * Packs the approved map (docs/layout/approved-map-2026-11-25.json) into the copy the game ships (src/layout/mapData.json):
 * every tree's 24-32 point circle becomes centre + radius (it is a circle), coordinates keep 2 decimals, and everything the
 * game needs is derived here once (src/layout/layoutCore.js buildLayout: yaws, untouched places, oriented footprints, the
 * roundabout ring; src/layout/layoutSnap.js: the road snap), so the game only reads the result.
 *
 * Usage: node tools/layout-pack.mjs          (writes src/layout/mapData.json)
 *        node tools/layout-pack.mjs --check  (exit 1 if mapData.json is out of date; tools/layout-tests.mjs runs this too)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildLayout, roadBBox } from '../src/layout/layoutCore.js';
import { snapLayout, clipGalis, nudgeGalis } from '../src/layout/layoutSnap.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const SRC = ROOT + 'docs/layout/approved-map-2026-11-25.json';
export const OUT = ROOT + 'src/layout/mapData.json';
/** What the packed result depends on: the approved map and the rules that derive from it. Stored in the pack, so the tests can
 * tell in a moment whether mapData.json is out of date without re-running the (minutes-long) snap. */
export const INPUTS = ['docs/layout/approved-map-2026-11-25.json', 'src/layout/layoutCore.js', 'src/layout/layoutSnap.js', 'src/layout/footprints.js', 'src/layout/frontOffsets.js', 'tools/layout-pack.mjs'];
export function inputsHash() {
  const h = crypto.createHash('sha256');
  for (const f of INPUTS) h.update(f + '\n').update(fs.readFileSync(ROOT + f));
  return h.digest('hex').slice(0, 16);
}

const r2 = (v) => Math.round(v * 100) / 100;

/** The approved map with tree circles compacted, nothing derived yet (also used by tools/layout-tests.mjs --as-drawn). */
export function compact(raw) {
  const objects = raw.objects.map((o) => {
    if (o.kind === 'trees') {
      const ring = o.rings[0];
      let cx = 0, cz = 0;
      for (const [x, z] of ring) { cx += x; cz += z; }
      cx /= ring.length; cz /= ring.length;
      let r = 0;
      for (const [x, z] of ring) r += Math.hypot(x - cx, z - cz);
      r /= ring.length;
      return { kind: o.kind, label: o.label, y1: o.y1, cx: r2(cx), cz: r2(cz), r: r2(r) };
    }
    const out = { kind: o.kind, label: o.label, rings: o.rings.map((ring) => ring.map(([x, z]) => [r2(x), r2(z)])) };
    for (const k of ['color', 'y0', 'y1', 'y']) if (o[k] !== null && o[k] !== undefined) out[k] = o[k];
    return out;
  });
  return { places: raw.places, roads: raw.roads, objects, canal: raw.canal };
}


// ---------------------------------------------------------------- small-prop road nudge (her rule 25 Nov: nothing stands on a road)
// Each listed prop slides the SMALLEST distance (along the road normal, away from the road it touches) until its clearance circle (the
// radius tools/road-clearance.mjs uses: ring half-diagonal capped at 3 m; pumps 1.2 m) clears every road band; signs use their real
// rectangle instead. Never more than 2 m. Level-crossing planks / booms, the welcome arch, the culvert, the roundabout island and canal
// bridges span a road by design and are NOT listed here.
const NUDGE_IDS = ['new_milestone#4', 'new_milestone#9', 'new_Washing platform#1', 'new_Water trough#1', 'new_well#1', 'new_Hand pump#13',
  'new_Washing line#1', 'new_Washing line#3', 'new_Washing line#6', 'new_Washing line#10', 'new_Washing line#12',
  'new_sign#44', 'new_sign#65', 'new_sign#76', 'new_sign#83', 'new_sign#95', 'new_sign#103'];
const FOOTPRINT_MODE = new Set(['new_sign#76', 'new_sign#83', 'new_sign#95', 'new_sign#103']);
// 25 Nov road review: the well beside the gali_n35 dead end is also held clear of the dead end's ROUND cap (circle r 1.6, the reading
// tools/road-clearance.mjs uses), which needs about 2 m; its limit is 5 m
const ROUND_CAP = new Set(['new_well#1']);
const NUDGE_LIMIT = { 'new_well#1': 5 };
const NUDGE_MAX = 2;
const NUDGE_TARGET = 0.13; // clear of every band by at least 0.1 m (her 25 Nov rule) plus 0.03 m of rounding margin
function roadHit(roads, x, z, roundCaps = false) { // nearest road band, the SAME shape the audits use (polyline buffered width/2, flat caps, round joins): { edge: signed distance to the band edge (negative = inside), nx, nz: unit vector pointing out of the band, id }
  let best = null;
  const take = (edge, nx, nz, id) => { if (!best || edge < best.edge) best = { edge, nx, nz, id }; };
  for (const r of roads) {
    const half = (r.width || 4) / 2;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
      const ux = dx / L, uz = dz / L, px = x - a[0], pz = z - a[1];
      const s = px * ux + pz * uz, t = -px * uz + pz * ux; // along the segment, across it (t > 0 on the (-uz, ux) side)
      const ex = Math.max(-s, s - L), ez = Math.abs(t) - half; // box signed distance in the segment frame
      let edge, ls, lt;
      if (roundCaps && ex > 0) { // strict reading (tools/road-clearance.mjs): a dead-end's cap is round, so the band reaches half a width past the last vertex
        const E = s > L ? b : a, vx = x - E[0], vz = z - E[1], dd = Math.hypot(vx, vz) || 1;
        take(dd - half, vx / dd, vz / dd, r.id); continue;
      }
      if (ex > 0 || ez > 0) { edge = Math.hypot(Math.max(ex, 0), Math.max(ez, 0)); ls = ex > 0 ? Math.sign(s - L / 2) * ex : 0; lt = ez > 0 ? Math.sign(t) * ez : 0; }
      else if (ex > ez) { edge = ex; ls = Math.sign(s - L / 2) || 1; lt = 0; }
      else { edge = ez; ls = 0; lt = Math.sign(t) || 1; }
      const m = Math.hypot(ls, lt) || 1; ls /= m; lt /= m;
      take(edge, ls * ux - lt * uz, ls * uz + lt * ux, r.id);
    }
    for (let i = 1; i < r.pts.length - 1; i++) { // round joins at interior vertices
      const d = Math.hypot(x - r.pts[i][0], z - r.pts[i][1]);
      if (d - half < 0.5) take(d - half, d > 1e-3 ? (x - r.pts[i][0]) / d : 1, d > 1e-3 ? (z - r.pts[i][1]) / d : 0, r.id);
    }
  }
  return best;
}
function nudgeSmallProps(objects, places, roads) {
  const log = [];
  for (const id of NUDGE_IDS) {
    const o = objects.find((q) => q.id === id);
    if (!o) continue;
    const ring = o.rings[0], n = ring.length;
    const mx = ring.reduce((a, p) => a + p[0], 0) / n, mz = ring.reduce((a, p) => a + p[1], 0) / n;
    const foot = FOOTPRINT_MODE.has(id);
    const rad = id.startsWith('new_Hand pump') ? 1.2 : Math.min(Math.max(...ring.map((p) => Math.hypot(p[0] - mx, p[1] - mz))), 3);
    // clearance of the prop at offset (ox, oz): circle mode = centre-to-band-edge minus radius; footprint mode = worst sampled point of the ring edge
    const clear = (ox, oz) => {
      if (!foot) { const h = roadHit(roads, o.cx + ox, o.cz + oz, ROUND_CAP.has(id)); return { c: h.edge - rad, h }; }
      let w = null;
      for (let i = 0; i < n; i++) { const p = ring[i], q = ring[(i + 1) % n]; for (let k = 0; k <= 10; k++) { const h = roadHit(roads, p[0] + (q[0] - p[0]) * k / 10 + ox, p[1] + (q[1] - p[1]) * k / 10 + oz); if (!w || h.edge < w.h.edge) w = { c: h.edge, h }; } }
      return w;
    };
    let ox = 0, oz = 0;
    const before = clear(0, 0);
    if (before.c >= NUDGE_TARGET) continue;
    for (let it = 0; it < 8; it++) {
      const k = clear(ox, oz);
      if (k.c >= NUDGE_TARGET) break;
      const step = NUDGE_TARGET + 0.01 - k.c;
      ox += k.h.nx * step; oz += k.h.nz * step;
    }
    const moved = Math.hypot(ox, oz), after = clear(ox, oz);
    if (moved > (NUDGE_LIMIT[id] || NUDGE_MAX) || after.c < NUDGE_TARGET) { log.push({ id, name: o.name, from: [o.cx, o.cz], to: null, moved: +moved.toFixed(2), road: before.h.id, note: 'NOT MOVED (needs more than 2 m or still touches)' }); continue; }
    const from = [o.cx, o.cz];
    const sh = (p) => [r2(p[0] + ox), r2(p[1] + oz)];
    o.rings = o.rings.map((rg) => rg.map(sh));
    o.cx = r2(o.cx + ox); o.cz = r2(o.cz + oz);
    if (o.rect) { o.rect.cx = r2(o.rect.cx + ox); o.rect.cz = r2(o.rect.cz + oz); if (o.rect.frontMid) o.rect.frontMid = sh(o.rect.frontMid); }
    const pl = o.place ? places.find((q) => q.id === o.place) : ROUND_CAP.has(id) ? places.find((q) => q.name === o.name && Math.hypot(q.x - from[0], q.z - from[1]) < 0.5) : null; // the well's own place record (new_433) rides with it
    if (pl) { pl.x = r2(pl.x + ox); pl.z = r2(pl.z + oz); }
    log.push({ id, name: o.name, from, to: [o.cx, o.cz], moved: +moved.toFixed(2), road: before.h.id, clearBefore: +before.c.toFixed(2), mode: foot ? 'footprint' : `circle r=${rad.toFixed(2)}` });
  }
  return log;
}

export function pack(raw) {
  // derive everything once here (fronts, oriented footprints, the road snap), so the game only reads the result
  const layout = buildLayout(compact(raw));
  const clips = clipGalis(layout);
  for (const r of layout.roads) if (!r.bbox) r.bbox = roadBBox(r);
  const nudges = snapLayout(layout);
  // a gali whose length runs along a building's back slides sideways off it; then trim gali ends the snap moved buildings onto
  const galiShifts = nudgeGalis(layout);
  for (const r of layout.roads) if (!r.bbox) r.bbox = roadBBox(r);
  for (const c of clipGalis(layout)) clips.push({ ...c, after: 'snap' });
  for (const r of layout.roads) if (!r.bbox) r.bbox = roadBBox(r);
  // second round: what the first round could not settle often can once its neighbours and the galis have moved
  for (const n of snapLayout(layout)) nudges.push({ ...n, round: 2 });
  for (const r of layout.roads) if (!r.bbox) r.bbox = roadBBox(r);
  for (const c of clipGalis(layout)) clips.push({ ...c, after: 'snap' });
  for (const r of layout.roads) if (!r.bbox) r.bbox = roadBBox(r);
  const propNudges = nudgeSmallProps(layout.objects, layout.list, raw.roads);
  const round = (v) => (typeof v === 'number' ? +v.toFixed(4) : v);
  const cleanRect = (r) => r && { cx: r2(r.cx), cz: r2(r.cz), w: r2(r.w), d: r2(r.d), ry: round(r.ry), front: r.front.map(round), frontMid: r.frontMid.map(r2) };
  return {
    source: 'docs/layout/approved-map-2026-11-25.json, derived by tools/layout-pack.mjs (fronts, footprints, road snap)',
    inputsHash: inputsHash(),
    places: layout.list.map((p) => ({ ...p, frontYaw: round(p.frontYaw), ry: round(p.ry) })),
    roads: raw.roads.map((r) => ({ ...r })), // the map's roads exactly (24-26 Nov: no gali trims, no shifts; nothing may sit on a road, so the buildings move, never the road)
    objects: layout.objects.map((o) => ({ ...o, rect: cleanRect(o.rect), cx: r2(o.cx), cz: r2(o.cz), ...(o.r !== undefined ? { r: r2(o.r) } : {}) })),
    canal: raw.canal,
    nudges,
    galiClips: clips,
    galiShifts,
    propNudges,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const text = JSON.stringify(pack(raw));
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== text) { console.error('src/layout/mapData.json is out of date: run node tools/layout-pack.mjs'); process.exit(1); }
    console.log('mapData.json up to date');
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`wrote ${OUT} (${(text.length / 1024).toFixed(0)} KB, from ${(fs.statSync(SRC).size / 1024).toFixed(0)} KB)`);
  }
}
