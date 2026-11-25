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
  { src: 'school', ids: ['school'], dx: 0.6, dz: 3.0, why: 'gate side stood 1.05 m into the Outer lane south' },
  { src: 'temple', ids: ['temple'], dx: -3.7, dz: -2.3, why: 'compound stood 1.5 m into the Outer lane north' },
  { src: 'dairy', ids: ['dairy', 'yard_dairy'], dx: 0, dz: 1.5, why: 'back of the yard stood 1.39 m into gali_n15' },
  { src: 'gurudwara', ids: ['gurudwara'], dx: -0.4, dz: -1.6, why: 'porch corner stood 1.52 m into the south-west edge lane' },
  { src: 'yard_petrol', ids: ['yard_petrol'], dx: 0, dz: 2.9, why: 'forecourt stood 2.78 m into the highway' },
  { src: 'tvhouse', ids: ['tvhouse', 'yard_tvhouse'], dx: 0, dz: 2.2, why: 'yard stood 0.97 m into gali_n38' },
  { src: 'yard_paani_tanki', ids: ['yard_paani_tanki'], dx: 0, dz: -0.2, why: 'corner touched gali_n32 by 0.01 m' },
  { src: 'anganwadi', ids: ['anganwadi'], dx: 0, dz: 0.15, why: 'stood 0.05 m from the Outer lane south band (her rule: clear by 0.1 m)' },
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
      if (m.ry !== undefined) { MOVE_SHIFTS[id].turn = Math.atan2(Math.sin(m.ry - (a.ry || 0)), Math.cos(m.ry - (a.ry || 0))); a.ry = m.ry; }
    }
    for (const src of m.srcs || [m.src]) {
      const p = places[src];
      if (!p) continue;
      p.x = +(p.x + m.dx).toFixed(3); p.z = +(p.z + m.dz).toFixed(3);
      if (m.ry !== undefined) { const off = p.ry - p.frontYaw; p.ry = m.ry; p.frontYaw = m.ry - off; p.front = [+Math.sin(p.frontYaw).toFixed(4), +Math.cos(p.frontYaw).toFixed(4)]; }
    }
  }
}
