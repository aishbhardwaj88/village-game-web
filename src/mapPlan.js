/**
 * THE 1 NOV MAP (docs/layout/village-plan-positions-2026-11-01.json): place id -> centre (x east, z south, metres) and turn_deg.
 * The whole plan is shifted as ONE piece by MAP_SHIFT so it sits in the free east ground (relative positions stay exact).
 * Rotation: three.js rotation.y = -turn_deg in radians (checked on the primary school's footprint).
 */
export const MAP_SHIFT = { x: 600, z: 0 };
export const MAP_PLAN = {
  yard_bus_adda: { x: -43.5, z: -113.3, turn: 181 }, // 1 + 180 (7 Nov road-front audit): front turned from the water-tank lane onto the highway
  yard_puncture: { x: 31.9, z: -113.8, turn: 181 }, // 1 + 180 (7 Nov road-front audit): front onto the highway
  yard_dharam_kanta: { x: 121.7, z: -108.3, turn: 181 }, // 1 + 180 (7 Nov road-front audit): front onto the highway, along the map's front path
  yard_petrol: { x: -43.5, z: -146.6, turn: 1 }, // exactly the map centre (her compound outline's centre). The model's origin sits here and its slab is built 4 m forward of it (build_petrol_pump_v2.py SITE_DZ), so the slab covers her open ground (-153.6..-133), the apron meets the highway's north kerb and the back clears the wheat edge track; front (+z) faces the highway
  yard_bhatta: { x: 240.7, z: -170.3, turn: 1 },
  yard_chaupal: { x: 23.5, z: 28.5, turn: 95 }, // 5 + 90 (9 Nov facing audit): front (notice board, steps) turned from the general store's back path onto the square, west toward the milestone (SPATIAL_SENSE 1: fronts face the circle); the 20 x 20 m patch keeps its square footprint
  yard_paani_tanki: { x: -44.9, z: -90.3, turn: 3 },
  yard_panchayat: { x: -50, z: 42.3, turn: 185 }, // 5 + 90: front (neem platform, flag) turned from the street onto the square (3 Nov orientation pass)
  yard_post: { x: -52.2, z: 65.4, turn: -11.2 },
  yard_tvhouse: { x: -47.3, z: 21.8, turn: 5 },
  yard_dairy: { x: -95.1, z: -37.4, turn: -97 }, // -7 - 90 (7 Nov road-front audit): front turned from the back field onto the ring road, along the map's 'Front path to Milk dairy' (runs east)
  yard_khalihan: { x: 58, z: -95.5, turn: 7.3 },
  yard_chakki: { x: -62.1, z: 23.1, turn: 5 },
  yard_tubewell: { x: 133.8, z: 29.4, turn: 184.9 }, // 4.9 + 180 (7 Nov road-front audit): front onto the cross road, not the field
  // yard_school (v2) is NOT placed: the hero school (src/village.js, the playable classroom with bell/teacher/blackboard) now stands on this centre and the two would overlap; v2 waits in its staging slot (NEEDS_YOU).
  yard_gurukul: { x: 34.8, z: 108.3, turn: 168.8 }, // -11.2 + 180 (7 Nov road-front audit): gate onto the School lane, not the back field
  yard_volleyball: { x: -5.2, z: 150, turn: 96 },
  yard_khel: { x: 31.9, z: 154.3, turn: 6 },
  yard_akhada: { x: 72, z: 141, turn: 6 },
  yard_ration: { x: -7.9, z: -10.1, turn: 5 }, // bazaar unit 8
  yard_houses: { x: -291.4, z: -175.1, turn: 0 },
};

/**
 * THE CHAURAHA (docs/PARALLEL.md "TONIGHT" item 1): four roads meeting at the zero milestone round a raised island.
 * map-local milestone (2.9, 19.9). CHAURAHA is its world position. The map draws main_road passing 3.6 m off it and
 * cross_road 7.1 m off, so both are bent where loaded: each arm runs dead straight at the milestone for 45-60 m, the
 * two through-lines are split at the ring (see ringArms) and a closed ring carriageway joins the four arms.
 */
export const CHAURAHA = { x: 2.9 + MAP_SHIFT.x, z: 19.9 + MAP_SHIFT.z, islandR: 6, ringW: 7 };
CHAURAHA.ringR = CHAURAHA.islandR + CHAURAHA.ringW / 2; // ring carriageway centreline radius (9.5 m); outer edge 13 m

/** Map-local centreline of a named map road with the chauraha bend applied (point count of main_road is kept). */
export function bendMapRoad(name, c) {
  const mx = 2.9, mz = 19.9;
  const pts = c.map((p) => p.slice());
  if (name === 'main_road') pts.splice(2, 2, [mx, mz - 65], [mx, mz + 25]); // N arm: straight from z -45; S arm: straight to z +45
  if (name === 'cross_road') pts.splice(2, 1, [mx - 60, mz], [mx + 45, mz]); // W arm 60 m, E arm 45 m, both dead level
  return pts;
}
