/**
 * The 1 Nov map's roads (docs/layout/village-plan-positions-2026-11-01.json `roads` and `lanes_and_tracks`), laid at the same
 * +MAP_SHIFT as the places (src/mapPlan.js), plus the kachcha tracks to the places the map left without a way in
 * (src/dirtTracks.js). Positions only: the surface is src/roadNetwork.js, which turns every centreline into ONE continuous
 * field (rounded bends and ends, merged junctions, wandering edge, a scuffed-earth band into the grass) and cuts it into
 * 4 streamed quadrants, one draw call each. Roads are ground-level, not solid. No kerbs (straight slabs cannot follow a
 * curve); village lanes carry their nali as a groove in the surface. The "To the city" boards and back-lane posts are src/mapGates.js.
 */
import * as THREE from 'three';
import { buildNetwork, networkMesh } from './roadNetwork.js';
import { MAP_SHIFT, CHAURAHA, bendMapRoad } from './mapPlan.js';
import { dirtTrackLines } from './dirtTracks.js';
import { pt } from './anchors.js';
import MAP from '../docs/layout/village-plan-positions-2026-11-01.json';

const kindOf = (type) => (type === 'back lane' ? 'back' : type.startsWith('farm') ? 'track' : type === 'front path' ? 'path' : 'lane');

/** Every polyline of the map: { id, w, kind, pts: [[x, z]...], closed, noDrain } in world metres (shift applied). */
export function mapRoadLines() {
  const lines = [];
  const add = (id, w, c, kind, closed, extra = {}) => {
    const pts = c.map(([x, z]) => [x + MAP_SHIFT.x, z + MAP_SHIFT.z]);
    if (closed && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) pts.push(pts[0]);
    lines.push({ id, w, pts, kind, closed: !!closed, ...extra });
  };
  for (const [name, r] of Object.entries(MAP.roads)) add(name, r.width_m, bendMapRoad(name, r.centreline), name === 'highway' ? 'highway' : 'road', r.closed);
  MAP.lanes_and_tracks.forEach((l, i) => {
    // the kiln drive and the tractor route run through open country: no nali there
    const kind = kindOf(l.type) === 'lane' && /kiln|tractor/i.test(l.name) ? 'back' : kindOf(l.type);
    add(`${i}_${l.name}`, l.width_m, l.centreline, kind, l.closed, kind === 'back' && l.type === 'village lane' ? { tint: 0xab9470 } : {});
  });
  return lines;
}

/**
 * Two older lanes the map does not draw but the game still uses, laid into the same network (their own strip builders now
 * return empty groups): the wheat field's tractor loop (src/field.js TRACK_CORNERS: field centre +-60 x, +-45 z, 5 m) and
 * the stub from the north outer lane to the temple's west gate (src/temple.js TEMPLE_LANE_*). The stub's first point is
 * pulled onto the nearest road centreline so it starts in a junction, never in grass.
 */
function legacyLines() {
  const f = pt('field'), t = pt('temple');
  const loop = [[f.x - 60, f.z + 45], [f.x + 60, f.z + 45], [f.x + 60, f.z - 45], [f.x - 60, f.z - 45], [f.x - 60, f.z + 45]];
  const stub = [[t.x - 21, t.z + 1], [t.x - 13, t.z + 3], [t.x - 6, t.z - 1]];
  return [
    { id: 'field_track_loop', w: 5, pts: loop, kind: 'track', closed: true },
    { id: 'temple_lane', w: 4.5, pts: stub, kind: 'lane', joinStart: true },
  ];
}

/** Nearest point on any of `lines`' centrelines to p. */
function nearestOnLines(lines, p) {
  let best = null, bd = Infinity;
  for (const l of lines) for (let i = 1; i < l.pts.length; i++) {
    const [ax, az] = l.pts[i - 1], [bx, bz] = l.pts[i];
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / L));
    const q = [ax + t * dx, az + t * dz], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < bd) { bd = d; best = q; }
  }
  return { q: best, d: bd };
}

/** Every line the surface is built from: the map's own, the dirt tracks and the two older lanes (all world metres). */
/**
 * The chauraha: the bent main_road and cross_road each pass straight through the milestone, so cut each at the ring
 * (its two halves end on the ring's centreline, never cross the island) and add the closed ring carriageway.
 */
// darker, cooler than the dirt around it so the four arms and the ring read as carriageway from above
const ARM_TINT = 0x6f695f;
function ringArms(lines) {
  const { x: cx, z: cz, ringR, ringW } = CHAURAHA;
  const out = [];
  for (const l of lines) {
    if (l.id !== 'main_road' && l.id !== 'cross_road') { out.push(l); continue; }
    let k = -1;
    for (let i = 1; i < l.pts.length; i++) {
      const [ax, az] = l.pts[i - 1], [bx, bz] = l.pts[i];
      const dx = bx - ax, dz = bz - az, t = ((cx - ax) * dx + (cz - az) * dz) / (dx * dx + dz * dz);
      if (t > 0 && t < 1 && Math.hypot(ax + t * dx - cx, az + t * dz - cz) < 0.5) k = i;
    }
    if (k < 0) { out.push(l); continue; }
    const a = l.pts[k - 1], b = l.pts[k], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    out.push({ ...l, tint: ARM_TINT, pts: [...l.pts.slice(0, k), [cx - ux * ringR, cz - uz * ringR]] });
    out.push({ ...l, tint: ARM_TINT, id: `${l.id}_${l.id === 'main_road' ? 's' : 'e'}`, pts: [[cx + ux * ringR, cz + uz * ringR], ...l.pts.slice(k)] });
  }
  const ring = [];
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; ring.push([cx + Math.cos(a) * ringR, cz + Math.sin(a) * ringR]); }
  out.push({ id: 'chauraha_ring', w: ringW, pts: ring, kind: 'road', closed: true, tint: ARM_TINT });
  return out;
}

export function allRoadLines() {
  const map = ringArms(mapRoadLines());
  const lines = [...map, ...dirtTrackLines().map((t) => ({ id: t.id, w: t.w, pts: t.pts, y: t.y, kind: t.w >= 3 ? 'track' : 'path' }))];
  for (const l of legacyLines()) {
    if (l.joinStart) {
      const { q, d } = nearestOnLines(map, l.pts[0]);
      if (q && d > 0.5) l.pts = [q, ...l.pts];
    }
    lines.push(l);
  }
  return lines;
}

/** Zone chunks: the map is ~500 x 400 m, so it streams in 4 quadrants split at x = MAP_SHIFT.x, z = 30. */
export const ROAD_CHUNKS = [
  { id: 'map_roads_nw', x: MAP_SHIFT.x - 130, z: -60, rect: { x0: -1e5, x1: MAP_SHIFT.x, z0: -1e5, z1: 30 } },
  { id: 'map_roads_ne', x: MAP_SHIFT.x + 130, z: -60, rect: { x0: MAP_SHIFT.x, x1: 1e5, z0: -1e5, z1: 30 } },
  { id: 'map_roads_sw', x: MAP_SHIFT.x - 130, z: 110, rect: { x0: -1e5, x1: MAP_SHIFT.x, z0: 30, z1: 1e5 } },
  { id: 'map_roads_se', x: MAP_SHIFT.x + 130, z: 110, rect: { x0: MAP_SHIFT.x, x1: 1e5, z0: 30, z1: 1e5 } },
];

let NET = null;
/** The one road network (built once, shared by the 4 chunks). */
export function mapRoadNetwork() {
  if (!NET) NET = buildNetwork(allRoadLines());
  return NET;
}

/** One merged mesh of the road surface inside `chunkId`'s quadrant. */
export function createMapRoads(chunkId) {
  const group = new THREE.Group();
  group.name = chunkId;
  const chunk = ROAD_CHUNKS.find((c) => c.id === chunkId);
  const mesh = chunk && networkMesh(mapRoadNetwork(), chunk.rect, `${chunkId}_strips`);
  if (mesh) group.add(mesh);
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
