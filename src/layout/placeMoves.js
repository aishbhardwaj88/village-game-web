/**
 * PLACE MOVES (25 Nov, her rule, overrides exact map spots): nothing stands on a road band, and every place faces the road it
 * fronts with its walls square to it. Each entry nudges one named place the smallest distance off its road (never more than 5 m),
 * or turns it to its road. Applied at load by src/anchors.js after the approved layout, under ?layout=new only, to the anchor AND
 * to the layout's own place record, so everything that follows the place (movedWith / localPt / getPlace) follows the move.
 * Log with old/new spots: docs/layout/MOVE_LOG_PLACES_25NOV.md. `ids` = every anchor id that stands on the same place.
 * dx, dz: metres added to the map position. ry: absolute new yaw (radians, three.js rotation.y) when the place is turned too.
 */
const D = Math.PI / 180;
export const PLACE_MOVES = [
  // school: village.js turns the whole school by SCHOOL_TURN_DEG (the 1 Nov plan's +11.2, which is rotation.y -11.2 deg). The approved Outer lane south runs at -11.2 deg
  // (the other way), so the school stood 22.4 deg off square. ry = the new rotation.y (+11.2 deg, walls square to the lane), ryFrom = what the game really gave it before (-11.2); layoutTurnDeg() returns it (viaTurnDeg), so schoolPt() and every point of the school turn with it. A prop keyed to the school's anchor must use the school's REAL yaw, -layoutTurnDeg('school', 11.2) (wallWriting.js cycle).
  { src: 'school', ids: ['school'], dx: 0.6, dz: 3.0, ry: 11.2 * D, ryFrom: -11.2 * D, viaTurnDeg: true, why: 'gate side stood 1.05 m into the Outer lane south; turned square to the lane (22.4 deg)' },
  // temple: 26 Nov (review rules 2): front is the compound's gate wall; it faces the highway, so the compound slides 1.5 m more north to bring its gate wall within 15 m of the highway band (4.97 m from the map spot in all)
  { src: 'temple', ids: ['temple'], dx: -3.2, dz: -3.8, ry: -92 * D, why: 'compound stood 1.5 m into the Outer lane north; then 1.5 m more north so its gate wall is within 15 m of the highway it faces' },
  { src: 'dairy', ids: ['dairy', 'yard_dairy'], dx: 0, dz: 3.0, why: 'back of the yard stood 1.39 m into gali_n15; 1.5 m more south so the shop front faces the cross road, not the lane behind it' },
  { src: 'gurudwara', ids: ['gurudwara'], dx: -0.4, dz: -1.6, why: 'porch corner stood 1.52 m into the south-west edge lane' },
  { src: 'yard_petrol', ids: ['yard_petrol'], dx: 0, dz: 2.9, why: 'forecourt stood 2.78 m into the highway' },
  { src: 'tvhouse', ids: ['tvhouse', 'yard_tvhouse'], dx: 0, dz: 2.2, why: 'yard stood 0.97 m into gali_n38' },
  { src: 'yard_paani_tanki', ids: ['yard_paani_tanki'], dx: 0, dz: -0.2, why: 'corner touched gali_n32 by 0.01 m' },
  { src: 'anganwadi', ids: ['anganwadi'], dx: 0, dz: 0.15, why: 'stood 0.05 m from the Outer lane south band (her rule: clear by 0.1 m)' },
  // 26 Nov review rules (docs/layout/MOVE_LOG_PLACES2_25NOV.md): walls square to the road the front looks at, front nearer that road than the back
  { src: 'halwai', ids: ['halwai'], dx: 0, dz: 0, ry: 90 * D, why: 'walls were 36 deg off main_road; turned square to it' },
  { src: 'store', ids: ['store'], dx: -0.5, dz: 0, why: 'front stood nearer the highway (19 deg skew) than main_road; 0.5 m west puts its front on main_road, to which it is square' },
  { src: 'ration', ids: ['ration', 'yard_ration'], dx: 2.5, dz: -0.5, why: 'front looked at gali_n46 (33 deg skew, back nearer); 2.55 m east it fronts main_road square, like the chakki beside it' },
  { src: 'banta', ids: ['banta'], dx: 0, dz: 0, ry: -90 * D, why: 'walls were 26 deg off cross_road; turned square to it' },
  { src: 'chaat', ids: ['chaat'], dx: 0, dz: 0, ry: -Math.PI, why: 'walls were 36 deg off main_road; turned square to it (also clears the pooja items shop by 0.66 m2)' },
  { src: 'jalebi', ids: ['jalebi'], dx: 0, dz: 0, ry: -90 * D, why: 'walls were 30 deg off cross_road; turned square to it' },
  { src: 'sabzi', ids: ['sabzi'], dx: -2.9, dz: -3.9, ry: 132 * D, why: 'walls 40 deg off main_road and 11.5 m2 into the gift shop; turned 8 deg and slid 2.9 m north-west to front cross_road square (2.6 deg), overlap with the shop cut to 7.2 m2, clear of the kite job points; 26 Nov: 2 m more south-west (total 4.86 m from the map spot) so the gift shop clears it with a 1 m slide' },
  { src: 'yard_bus_adda', ids: ['yard_bus_adda'], dx: 0, dz: -2.5, why: 'shelter front looked at gali_n19 behind it, back nearer; 2.5 m north its front faces the highway square' },
  // 26 Nov final overlaps (docs/layout/MOVE_LOG_FINAL_25NOV.md): building-on-building overlaps that a shop move alone could not clear
  { src: 'house', ids: ['house'], dx: 3.4, dz: 0.6, why: "Pitaji's house (real mesh) stood 27 m2 into the Hardware and paint shop; 3.4 m east and 0.6 m north here + the shop 2.2 m west and 0.6 m south clears it and keeps the sack pile and the bullock cart spawn outside the shop (3.45 m from the map spot)" },
  { src: 'yard_chaupal', ids: ['yard_chaupal'], dx: 0, dz: -1.5, why: 'chaupal yard overlapped the post office body (8.95 m2 of site boxes); 1.5 m north clears it, front still on ring_road' },
  // yard_bhatta: NO move and NO turn (25 Nov). Her own map rule: the brick kiln stays away from the petrol pump and is never attached to the road, greenery in front of it. The map's front (north, away from the highway) is that rule; the facing-the-road rule does not apply to it.
  // facing: road facing wins over the old model turn (front = local +z; open grounds put their long side to the road)
  { src: 'yard_volleyball', ids: ['yard_volleyball'], dx: 0, dz: 0, ry: -107.1 * D, why: 'square to main_road (front west, 11 deg off square before)' },
  { src: 'maidan', ids: ['maidan', 'yard_khel'], srcs: ['maidan', 'yard_khel'], dx: 0, dz: 0, ry: -107.1 * D, why: 'front toward main_road, walls square to it' },
  { src: 'yard_akhada', ids: ['yard_akhada'], dx: 0, dz: 0, ry: Math.PI, why: 'front north toward the Outer lane east, square to its north-south run' },
  { src: 'gilli', ids: ['gilli'], dx: 0, dz: 0, ry: Math.PI, why: 'front north toward the Outer lane east, square to its north-south run' },
];

/** Ids of places whose anchor was only translated (their old literal points carry by the same shift). */
export const MOVE_SHIFTS = {};
for (const m of PLACE_MOVES) for (const id of m.ids) MOVE_SHIFTS[id] = { dx: m.dx, dz: m.dz, turn: 0 }; // turn (rad) is filled in by applyPlaceMoves

/** Apply the moves to the anchor table and to the layout's place records. `places` = getLayout().places. */
export function applyPlaceMoves(anchors, places) {
  for (const m of PLACE_MOVES) {
    for (const id of m.ids) {
      const a = anchors[id];
      if (!a) continue;
      a.x += m.dx; a.z += m.dz;
      if (m.ry !== undefined) {
        const from = m.ryFrom !== undefined ? m.ryFrom : (a.ry || 0);
        MOVE_SHIFTS[id].turn = Math.atan2(Math.sin(m.ry - from), Math.cos(m.ry - from)); a.ry = m.ry;
        if (m.viaTurnDeg) MOVE_SHIFTS[id].ryAbs = m.ry; // a place whose own file turns it by a constant (village.js SCHOOL_TURN_DEG): layout.js layoutTurnDeg reads this
      }
    }
    for (const src of m.srcs || [m.src]) {
      const p = places[src];
      if (!p) continue;
      p.x = +(p.x + m.dx).toFixed(3); p.z = +(p.z + m.dz).toFixed(3);
      if (m.ry !== undefined) { const off = p.ry - p.frontYaw; p.ry = m.ry; p.frontYaw = m.ry - off; p.front = [+Math.sin(p.frontYaw).toFixed(4), +Math.cos(p.frontYaw).toFixed(4)]; }
    }
  }
}
