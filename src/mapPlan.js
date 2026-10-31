/**
 * THE 1 NOV MAP (docs/layout/village-plan-positions-2026-11-01.json): place id -> centre (x east, z south, metres) and turn_deg.
 * The whole plan is shifted as ONE piece by MAP_SHIFT so it sits in the free east ground (relative positions stay exact).
 * Rotation: three.js rotation.y = -turn_deg in radians (checked on the primary school's footprint).
 */
export const MAP_SHIFT = { x: 600, z: 0 };
export const MAP_PLAN = {
  yard_bus_adda: { x: -43.5, z: -113.3, turn: 1 },
  yard_puncture: { x: 31.9, z: -113.8, turn: 1 },
  yard_dharam_kanta: { x: 121.7, z: -108.3, turn: 1 },
  yard_petrol: { x: -43.5, z: -146.6, turn: 1 },
  yard_bhatta: { x: 240.7, z: -170.3, turn: 1 },
  yard_chaupal: { x: 23.5, z: 28.5, turn: 5 },
  yard_paani_tanki: { x: -44.9, z: -90.3, turn: 3 },
  yard_panchayat: { x: -50, z: 42.3, turn: 5 },
  yard_post: { x: -52.2, z: 65.4, turn: -11.2 },
  yard_tvhouse: { x: -47.3, z: 21.8, turn: 5 },
  yard_dairy: { x: -95.1, z: -37.4, turn: -7 },
  yard_khalihan: { x: 58, z: -95.5, turn: 7.3 },
  yard_chakki: { x: -62.1, z: 23.1, turn: 5 },
  yard_tubewell: { x: 133.8, z: 29.4, turn: 4.9 },
  yard_school: { x: -43.5, z: 108.5, turn: -11.2 },
  yard_gurukul: { x: 34.8, z: 108.3, turn: -11.2 },
  yard_volleyball: { x: -5.2, z: 150, turn: 96 },
  yard_khel: { x: 31.9, z: 154.3, turn: 6 },
  yard_akhada: { x: 72, z: 141, turn: 6 },
  yard_ration: { x: -7.9, z: -10.1, turn: 5 }, // bazaar unit 8
  yard_houses: { x: -291.4, z: -175.1, turn: 0 },
};
