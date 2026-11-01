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

/** The old village's own layout (places the 1 Nov map does not position) rides east by the same 600 m as the map, so the whole world is one contiguous area. */
export const OLD_SHIFT = MAP_SHIFT;

/** Where a map-placed v2 yard stands on the world (MAP_PLAN centre + MAP_SHIFT, turned as the map says). */
const onMap = (yardId) => { const m = MAP_PLAN[yardId]; return { x: m.x + MAP_SHIFT.x, z: m.z + MAP_SHIFT.z, ry: -m.turn * Math.PI / 180 }; };

export const ANCHORS = {
  house: { x: 52.1 + MAP_SHIFT.x, z: 40.2 + MAP_SHIFT.z, ry: 0 },
  school: { x: -43.5 + MAP_SHIFT.x, z: 108.5 + MAP_SHIFT.z, ry: 0 }, // the map's primary school centre; the hero school is axis-aligned, so the map's -11.2 deg turn is not applied (NEEDS_YOU)
  halwai: { x: 37.4 + MAP_SHIFT.x, z: 21.4 + MAP_SHIFT.z, ry: 0 },
  teastall: { x: -36.2 + MAP_SHIFT.x, z: 15.5 + MAP_SHIFT.z, ry: 0 },
  store: { x: 22.5 + MAP_SHIFT.x, z: 47.4 + MAP_SHIFT.z, ry: 0 },
  bazaar: { x: -34.8 + MAP_SHIFT.x, z: -5 + MAP_SHIFT.z, ry: 0 }, // 8-unit row centre: units 1-7 land on the map's bazaar footprints (west edge -52.8); the map's 4.8 deg turn is not applied (main.js slot is unrotated)
  chowk: { x: 1.9 + MAP_SHIFT.x, z: 16.5 + MAP_SHIFT.z, ry: 0 },
  post: onMap('yard_post'), // the old combined post/ration/chakki model is no longer drawn (src/main.js); the v2 yards stand here
  ration: onMap('yard_ration'),
  chakki: onMap('yard_chakki'),
  temple: { x: 95.7 + MAP_SHIFT.x, z: -78.3 + MAP_SHIFT.z, ry: 0 }, // map turn 1.5 deg not applied (main.js slot is unrotated)
  baagh: { x: 137.7 + MAP_SHIFT.x, z: 132.3 + MAP_SHIFT.z, ry: 0 }, // the map's mango orchard centre
  canal: { x: -15 + OLD_SHIFT.x, z: 33 + OLD_SHIFT.z, ry: 0 },
  field: { x: 20 + OLD_SHIFT.x, z: -20 + OLD_SHIFT.z, ry: 0 },
  banta: { x: -23.7 + MAP_SHIFT.x, z: 24.6 + MAP_SHIFT.z, ry: 0 },
  chaat: { x: -28.3 + MAP_SHIFT.x, z: 15.4 + MAP_SHIFT.z, ry: 0 },
  eastgali: { x: 68.1 + MAP_SHIFT.x, z: 51.8 + MAP_SHIFT.z, ry: 0 },
  westgali: { x: -63.8 + MAP_SHIFT.x, z: 77.9 + MAP_SHIFT.z, ry: 0 },
  jalebi: { x: 35.5 + MAP_SHIFT.x, z: 26.4 + MAP_SHIFT.z, ry: 0 },
  dairy: onMap('yard_dairy'), // the old code-built copy is no longer built (src/main.js); the v2 yard stands here
  khalihan: onMap('yard_khalihan'),
  tubewell: onMap('yard_tubewell'),
  gaushala: { x: -122.6 + MAP_SHIFT.x, z: -41 + MAP_SHIFT.z, ry: 0 },
  pond: { x: -120.6 + MAP_SHIFT.x, z: 60.5 + MAP_SHIFT.z, ry: 0 },
  anganwadi: { x: -24.1 + MAP_SHIFT.x, z: 95.1 + MAP_SHIFT.z, ry: 0 },
  mela: { x: 187.5 + MAP_SHIFT.x, z: 146.5 + MAP_SHIFT.z, ry: 0 },
  gurudwara: { x: -95.6 + MAP_SHIFT.x, z: 102.3 + MAP_SHIFT.z, ry: 0 },
  cane: { x: 20 + OLD_SHIFT.x, z: 150 + OLD_SHIFT.z, ry: 0 },
  tvhouse: onMap('yard_tvhouse'), // old code-built copy dropped; the v2 yard stands here
  health: { x: 111.7 + MAP_SHIFT.x, z: -3.3 + MAP_SHIFT.z, ry: 0 },
  chemist: { x: 96 + OLD_SHIFT.x, z: 60 + OLD_SHIFT.z, ry: 0 },
  manihari: { x: 90 + OLD_SHIFT.x, z: 78 + OLD_SHIFT.z, ry: 0 },
  sabzi: { x: -22.8 + MAP_SHIFT.x, z: 17.1 + MAP_SHIFT.z, ry: 0 },
  johad: { x: 121.7 + MAP_SHIFT.x, z: 43.1 + MAP_SHIFT.z, ry: 0 },
  masjid: { x: -98.6 + MAP_SHIFT.x, z: -92.3 + MAP_SHIFT.z, ry: 0 },
  jain: { x: 117.7 + MAP_SHIFT.x, z: 96.3 + MAP_SHIFT.z, ry: 0 },
  haveli: { x: 44.9 + MAP_SHIFT.x, z: -22.2 + MAP_SHIFT.z, ry: 0 },
  gurukul: onMap('yard_gurukul'),
  maidan: onMap('yard_khel'),
  gilli: { x: 69 + MAP_SHIFT.x, z: 163 + MAP_SHIFT.z, ry: 0 }, // the map's gilli-danda play spot (open ground centre; 6 deg turn not applied)
  highway: { x: 205 + OLD_SHIFT.x, z: 40 + OLD_SHIFT.z, ry: 0 },
  mandi: { x: 147.7 + MAP_SHIFT.x, z: -160.3 + MAP_SHIFT.z, ry: 0 },
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

/** A point in a place's own metres (local +z = its front) on the world, turned by the anchor's ry. */
export function localPt(id, lx, lz) {
  const a = ANCHORS[id];
  if (!a) throw new Error(`anchors.js: no anchor for "${id}"`);
  const s = Math.sin(a.ry || 0), c = Math.cos(a.ry || 0);
  return { x: a.x + lx * c + lz * s, z: a.z - lx * s + lz * c };
}
