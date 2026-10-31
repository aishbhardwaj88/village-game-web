/**
 * The 1 Nov map's roads (docs/layout/village-plan-positions-2026-11-01.json `roads` and `lanes_and_tracks`), laid at the same
 * +MAP_SHIFT as the places (src/mapPlan.js). Positions only: every polyline is built from the shared dirt-strip piece
 * (src/paths.js buildStripSegment), merged to ONE draw call per zone chunk. Roads are ground-level, not solid.
 * Kerbs, drains, posts and "To the city" boards are not built yet (docs/NEEDS_YOU.md).
 */
import * as THREE from 'three';
import { buildStripSegment } from './paths.js';
import { mergeMeshList } from './mergeUtils.js';
import { MAP_SHIFT } from './mapPlan.js';
import MAP from '../docs/layout/village-plan-positions-2026-11-01.json';

const TINT = { highway: 0x8a8782, road: 0x9a948a, lane: 0xb7a179, track: 0xa88a5e, path: 0xb9a37c };

/** Every polyline of the map: { id, w, pts: [[x, z]...], tint, seed } in world metres (shift applied). */
export function mapRoadLines() {
  const lines = [];
  const add = (id, w, c, tint, closed) => {
    const pts = c.map(([x, z]) => [x + MAP_SHIFT.x, z + MAP_SHIFT.z]);
    if (closed && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) pts.push(pts[0]);
    lines.push({ id, w, pts, tint, seed: lines.length * 1.7 + 3 });
  };
  for (const [name, r] of Object.entries(MAP.roads)) add(name, r.width_m, r.centreline, name === 'highway' ? TINT.highway : TINT.road, r.closed);
  MAP.lanes_and_tracks.forEach((l, i) => {
    const tint = l.type.startsWith('farm') ? TINT.track : l.type === 'front path' ? TINT.path : TINT.lane;
    add(`${i}_${l.name}`, l.width_m, l.centreline, tint, l.closed);
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
    }
  }
  if (strips.length) group.add(mergeMeshList(strips, `${chunkId}_strips`));
  return group;
}

/** Bounding radius of a chunk (for the zone manager). */
export const ROAD_CHUNK_RADIUS = 260;
