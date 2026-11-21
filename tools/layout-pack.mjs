#!/usr/bin/env node
/**
 * Packs the approved map (docs/layout/approved-map-2026-11-21.json) into the copy the game ships (src/layout/mapData.json):
 * every tree's 24-32 point circle becomes centre + radius (it is a circle), coordinates keep 2 decimals, and everything the
 * game needs is derived here once (src/layout/layoutCore.js buildLayout: yaws, untouched places, oriented footprints, the
 * roundabout ring; src/layout/layoutSnap.js: the road snap), so the game only reads the result.
 *
 * Usage: node tools/layout-pack.mjs          (writes src/layout/mapData.json)
 *        node tools/layout-pack.mjs --check  (exit 1 if mapData.json is out of date; tools/layout-tests.mjs runs this too)
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildLayout, roadBBox } from '../src/layout/layoutCore.js';
import { snapLayout, clipGalis } from '../src/layout/layoutSnap.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const SRC = ROOT + 'docs/layout/approved-map-2026-11-21.json';
export const OUT = ROOT + 'src/layout/mapData.json';

const r2 = (v) => Math.round(v * 100) / 100;

export function pack(raw) {
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
  // derive everything once here (fronts, oriented footprints, the road snap), so the game only reads the result
  const layout = buildLayout({ places: raw.places, roads: raw.roads, objects, canal: raw.canal });
  const clips = clipGalis(layout);
  for (const r of layout.roads) if (!r.bbox) r.bbox = roadBBox(r);
  const nudges = snapLayout(layout);
  const round = (v) => (typeof v === 'number' ? +v.toFixed(4) : v);
  const cleanRect = (r) => r && { cx: r2(r.cx), cz: r2(r.cz), w: r2(r.w), d: r2(r.d), ry: round(r.ry), front: r.front.map(round), frontMid: r.frontMid.map(r2) };
  return {
    source: 'docs/layout/approved-map-2026-11-21.json, derived by tools/layout-pack.mjs (fronts, footprints, road snap)',
    places: layout.list.map((p) => ({ ...p, frontYaw: round(p.frontYaw), ry: round(p.ry) })),
    roads: layout.roads.map(({ bbox, ...r }) => r),
    objects: layout.objects.map((o) => ({ ...o, rect: cleanRect(o.rect), cx: r2(o.cx), cz: r2(o.cz), ...(o.r !== undefined ? { r: r2(o.r) } : {}) })),
    canal: raw.canal,
    nudges,
    galiClips: clips,
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
