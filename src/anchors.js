/**
 * THE placement table: one entry per place, id -> where it stands (x, z in metres, 1 unit = 1 m) and how it is turned
 * (ry, radians about Y; 0 = the place's own front as built, see docs/asset-slots.md for which way each front faces).
 * Everything that needs "where is the gurukul" reads it from here: the zone streaming in src/main.js, the PLACES list
 * (map, minimap, Visit-place menu, wayfinding signposts, milestones, notice board) in src/freeRoam.js, and the
 * model-slot docs. Move a place by editing its line here and nowhere else; a model swapped into its slot follows.
 *
 * The coordinates are the ones the places were built at (nothing moved when this table was introduced). MAP.md gives
 * no coordinate for the streamed sites, so these are the positions picked on 23-25 Oct.
 */
import { STAGED_PLACES, stagingPos } from './stagedPlaces.js';
import { MAP_PLAN, MAP_SHIFT } from './mapPlan.js';

export const ANCHORS = {
  house: { x: -48, z: 39, ry: 0 },
  school: { x: -50, z: 106, ry: 0 },
  halwai: { x: -40, z: 62, ry: 0 },
  teastall: { x: -52, z: 78, ry: 0 },
  store: { x: -52, z: 20, ry: 0 },
  bazaar: { x: -82, z: 15, ry: 0 },
  chowk: { x: -54, z: 13, ry: 0 },
  post: { x: -68, z: 26, ry: 0 },
  ration: { x: -68, z: 31, ry: 0 },
  chakki: { x: -68, z: 36, ry: 0 },
  temple: { x: 8, z: 52, ry: 0 },
  baagh: { x: -15, z: 10, ry: 0 },
  canal: { x: -15, z: 33, ry: 0 },
  field: { x: 20, z: -20, ry: 0 },
  banta: { x: -63, z: 22.5, ry: 0 },
  chaat: { x: -63, z: 50.5, ry: 0 },
  eastgali: { x: -5, z: 90, ry: 0 },
  westgali: { x: -84, z: 72, ry: 0 },
  jalebi: { x: -104, z: 4, ry: 0 },
  dairy: { x: -112, z: 18, ry: 0 },
  khalihan: { x: -78, z: -5, ry: 0 },
  tubewell: { x: -40, z: -8, ry: 0 },
  gaushala: { x: -125, z: -35, ry: 0 },
  pond: { x: -132, z: 70, ry: 0 },
  anganwadi: { x: -104, z: 106, ry: 0 },
  mela: { x: -135, z: 150, ry: 0 },
  gurudwara: { x: -60, z: 175, ry: 0 },
  cane: { x: 20, z: 150, ry: 0 },
  tvhouse: { x: 70, z: 12, ry: 0 },
  health: { x: 96, z: 30, ry: 0 },
  chemist: { x: 96, z: 60, ry: 0 },
  manihari: { x: 90, z: 78, ry: 0 },
  sabzi: { x: 88, z: 92, ry: 0 },
  johad: { x: 78, z: 105, ry: 0 },
  masjid: { x: 100, z: 135, ry: 0 },
  jain: { x: 130, z: 160, ry: 0 },
  haveli: { x: 150, z: -30, ry: 0 },
  gurukul: { x: 160, z: 85, ry: 0 },
  maidan: { x: 165, z: 135, ry: 0 },
  gilli: { x: 46, z: 104, ry: 0 }, // the gilli-danda patch (side job), not a mapped place
  highway: { x: 205, z: 40, ry: 0 },
  mandi: { x: 226, z: 60, ry: 0 },
  // The v2 places stand on the 1 Nov map (src/mapPlan.js, shifted east as one piece); anything the map does not place (the material board) waits in the old staging slot.
  ...Object.fromEntries(STAGED_PLACES.map((p, n) => {
    const m = MAP_PLAN[p.id];
    return [p.id, m ? { x: m.x + MAP_SHIFT.x, z: m.z + MAP_SHIFT.z, ry: -m.turn * Math.PI / 180 } : { ...stagingPos(n), ry: 0 }];
  })),
};

/** A fresh { x, z } for a place (callers may keep or mutate it). */
export function pt(id) {
  const a = ANCHORS[id];
  if (!a) throw new Error(`anchors.js: no anchor for "${id}"`);
  return { x: a.x, z: a.z };
}
