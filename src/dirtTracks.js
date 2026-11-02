/**
 * Kachcha dirt tracks to the places the 1 Nov map left without a drawn way in (her 3 Nov answer, PARALLEL.md item 3:
 * "all places need to have path to them ... maybe it could be dirt track"). Positions only: every track is built from
 * the one road network (src/roadNetwork.js, the 'lane' Ground102 set, no new texture), merged with the map's roads. Ground-level, not solid, so they never block a route.
 *
 * Coordinates are in map metres (docs/layout/village-plan-positions-2026-11-01.json frame), shifted by +MAP_SHIFT
 * exactly as src/mapRoads.js lays the map's own roads. Each track starts under the road it leaves (so the road draws
 * on top at the joint) and stops at the place's gate / edge, never through a collider.
 */
import * as THREE from 'three';
import { MAP_SHIFT } from './mapPlan.js';

const TRACK_TINT = 0xa88a5e; // the map's own farm-track tint (src/mapRoads.js TINT.track)
const PATH_TINT = 0xb9a37c; // the map's front-path tint

/**
 * { id, from, to, w, tint, y, pts: [[x, z]...] } in MAP metres. `y` lifts a track that crosses a raised ground blob.
 * - gaushala: its only gate faces south (site +z, 3 m between the pillars at z -30.5); the map's front path reaches the
 *   blind back wall. Track runs from the gate south to the cross road, where the map's cattle track already starts.
 * - baagh: the mango orchard sits 10-20 m south of the east outer lane with grass between. Footpath from the lane into
 *   the clearing, threaded between the trees at (-2,-9) and (+7,-6) from the centre.
 * - mandi and the family field need none: the mandi's paved aprons already run onto the highway (south) and across the
 *   farm loop (north), and the wheat field is ringed by the map's field tracks with one running through it (checked
 *   from above, docs/shots/dirt-tracks-2026-11-03/).
 * - mela: the audit's one remaining stranded place (33 m centre-to-lane). Trodden path from the east outer lane (3 m east of its solar lamp) across
 *   the sand to the shamiana's open north side, stopping 2.5 m short of the stage.
 */
export const DIRT_TRACKS = [
  { id: 'track_gaushala', from: 'cross road', to: 'gaushala gate', w: 3, tint: TRACK_TINT, y: 0.03, pts: [[-122.6, -3.7], [-122.3, -12], [-122.7, -22], [-122.6, -30.2]] },
  { id: 'track_baagh', from: 'east outer lane', to: 'mango baagh clearing', w: 2.2, tint: PATH_TINT, y: 0.03, pts: [[142, 112.6], [141.9, 119.5], [140.3, 126.5], [138.6, 130.8]] },
  { id: 'track_mandi', from: 'highway', to: 'mandi west apron', w: 3, tint: TRACK_TINT, y: 0.03, pts: [[128.4, -160.3], [121, -160.5], [114, -151], [113.5, -138], [114.5, -123.4]] },
  { id: 'track_mela', from: 'east outer lane', to: 'mela shamiana', w: 3, tint: PATH_TINT, y: 0.055, pts: [[190.4, 116.6], [190, 127], [189.2, 138.3]] },
];

/** The tracks as world-metre polylines ([[x, z]...]), for audits and the minimap. */
export function dirtTrackLines() {
  return DIRT_TRACKS.map((t) => ({ ...t, pts: t.pts.map(([x, z]) => [x + MAP_SHIFT.x, z + MAP_SHIFT.z]) }));
}

/**
 * The tracks' surface is part of the one road network (src/roadNetwork.js via src/mapRoads.js), so each track merges into
 * the road it leaves with a real junction instead of lying on top of it. This zone stays as an empty group so the zone
 * table in src/main.js needs no change.
 */
export function createDirtTracks() {
  const group = new THREE.Group();
  group.name = 'dirt_tracks';
  return group;
}

/** Zone centre and radius covering every track (the zone manager builds it once, it is a few hundred triangles). */
export const DIRT_TRACKS_ZONE = { x: MAP_SHIFT.x + 30, z: MAP_SHIFT.z - 30, radius: 260 };
