/**
 * The 1 Nov map's roads (docs/layout/village-plan-positions-2026-11-01.json `roads` and `lanes_and_tracks`), laid at the same
 * +MAP_SHIFT as the places (src/mapPlan.js). Positions only: every polyline is built from the shared dirt-strip piece
 * (src/paths.js buildStripSegment), merged to ONE draw call per zone chunk. Roads are ground-level, not solid.
 * Kerbs (main, cross, ring roads and village lanes) and drains (village lanes) ride each strip's chunk; the "To the city" boards and back-lane posts are src/mapGates.js.
 */
import * as THREE from 'three';
import { buildStripSegment, buildKerbSegments, buildDrainSegments } from './paths.js';
import { mergeMeshList } from './mergeUtils.js';
import { MAP_SHIFT } from './mapPlan.js';
import MAP from '../docs/layout/village-plan-positions-2026-11-01.json';

const TINT = { highway: 0x8a8782, road: 0x9a948a, lane: 0xb7a179, track: 0xa88a5e, path: 0xb9a37c };

/** Every polyline of the map: { id, w, pts: [[x, z]...], tint, seed } in world metres (shift applied). */
export function mapRoadLines() {
  const lines = [];
  const add = (id, w, c, tint, closed, edge) => {
    const pts = c.map(([x, z]) => [x + MAP_SHIFT.x, z + MAP_SHIFT.z]);
    if (closed && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) pts.push(pts[0]);
    lines.push({ id, w, pts, tint, edge, seed: lines.length * 1.7 + 3 });
  };
  for (const [name, r] of Object.entries(MAP.roads)) add(name, r.width_m, r.centreline, name === 'highway' ? TINT.highway : TINT.road, r.closed, name === 'highway' ? null : 'kerb');
  MAP.lanes_and_tracks.forEach((l, i) => {
    const tint = l.type.startsWith('farm') ? TINT.track : l.type === 'front path' ? TINT.path : TINT.lane;
    add(`${i}_${l.name}`, l.width_m, l.centreline, tint, l.closed, l.type === 'village lane' ? 'kerb+drain' : null);
  });
  return lines;
}

/** Zone chunks: the map is ~500 x 400 m, so it streams in 4 quadrants. Each line goes to the chunk holding its first point. */
export const ROAD_CHUNKS = [
  { id: 'map_roads_nw', x: MAP_SHIFT.x - 130, z: -60 },
  { id: 'map_roads_ne', x: MAP_SHIFT.x + 130, z: -60 },
  { id: 'map_roads_sw', x: MAP_SHIFT.x - 130, z: 110 },
  { id: 'map_roads_se', x: MAP_SHIFT.x + 130, z: 110 },
];

function chunkOf(pt) {
  const east = pt[0] >= MAP_SHIFT.x ? 1 : 0, south = pt[1] >= 30 ? 1 : 0;
  return ROAD_CHUNKS[south * 2 + east].id;
}

/** One merged mesh of every strip assigned to `chunkId`. */
export function createMapRoads(chunkId) {
  const group = new THREE.Group();
  group.name = chunkId;
  const strips = [];
  for (const l of mapRoadLines()) {
    for (let i = 1; i < l.pts.length; i++) {
      // A strip belongs to the chunk of its own midpoint, so long roads stream in pieces.
      const a = l.pts[i - 1], b = l.pts[i];
      if (chunkOf([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]) !== chunkId) continue;
      const m = buildStripSegment({ x: a[0], z: a[1] }, { x: b[0], z: b[1] }, l.w, { seed: l.seed + i, tint: l.tint, ruts: l.w >= 4 && l.w <= 5.5 && l.tint === TINT.track });
      // Wider roads lie a hair lower than lanes' crossings would otherwise z-fight: lift by width so the wider strip is under.
      m.position.y = 0.03 + 0.001 * (12 - Math.min(12, l.w));
      strips.push(m);
      // Kerbs on the village roads and lanes, a nali on one side of each village lane (shared slab builders from paths.js).
      if (l.edge) {
        const s0 = { x: a[0], z: a[1] }, s1 = { x: b[0], z: b[1] };
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 4) {
          for (const k of buildKerbSegments(s0, s1, l.w, 0.06, 0.94, { seed: l.seed + i })) strips.push(k);
          if (l.edge === 'kerb+drain') for (const d of buildDrainSegments(s0, s1, l.w, 0.06, 0.94, { seed: l.seed + i, side: i % 2 ? 1 : -1 })) strips.push(d);
        }
      }
    }
  }
  if (strips.length) group.add(mergeMeshList(strips, `${chunkId}_strips`));
  return group;
}

/** Bounding radius of a chunk (for the zone manager). */
export const ROAD_CHUNK_RADIUS = 260;

/** Street-lamp legs along the map's village lanes: polylines cut into straight chunks of at most 36 m, each { id, a, b, w, len }. Back lanes, farm tracks and front paths get none. */
export function mapLampLegs() {
  const legs = [];
  MAP.lanes_and_tracks.forEach((l, li) => {
    if (l.type !== 'village lane') return;
    const pts = l.centreline.map(([x, z]) => ({ x: x + MAP_SHIFT.x, z: z + MAP_SHIFT.z }));
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const n = Math.ceil(len / 36);
      for (let k = 0; k < n; k++) {
        const f0 = k / n, f1 = (k + 1) / n;
        const from = { x: a.x + (b.x - a.x) * f0, z: a.z + (b.z - a.z) * f0 };
        const to = { x: a.x + (b.x - a.x) * f1, z: a.z + (b.z - a.z) * f1 };
        legs.push({ id: `${li}_${i}_${k}`, a: from, b: to, w: l.width_m, len: len / n });
      }
    }
  });
  return legs;
}
