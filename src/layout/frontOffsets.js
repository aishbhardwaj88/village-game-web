/**
 * Per-asset FRONT OFFSETS (S7 layout sprint, 21 Nov 2026). Data only: no code reads a place id anywhere else to decide which
 * way a model faces.
 *
 * The approved map gives every place its TRUE front (a unit vector: the side with the door / counter / gate). The game turns
 * each place by its anchor yaw `ry` (three.js rotation.y, src/anchors.js). For most assets "ry 0" already means "front faces +z"
 * (local +z = front, the repo convention), so ry = atan2(front.x, front.z). A few assets were built facing another way at ry 0;
 * for those the anchor ry needs an extra turn. That extra turn lives here:
 *
 *   anchor ry (deg) = trueFrontYaw (deg) + offsetDeg
 *
 * `oldYawDeg` = the yaw the running game ACTUALLY gives the model today when it does not take it from the anchor (a hard-coded
 * turn constant in another file, e.g. SCHOOL_TURN_DEG). The "move with the place" helpers (movedWith / movedYaw in layout.js)
 * need the real old yaw to carry literal coordinates (NPC spots, interaction points) round with the building.
 *
 * Where each number came from (read 21 Nov from the Blender build scripts, the hard-coded turns and the 10 Nov road-front audit
 * docs/road-front-audit-2026-11-10.md, cross-checked against where the game draws the door):
 *  - teastall, store: built front = +z, main.js adds PI (TEA_SHOP_ROT / STORE_ROT = PI + anchor ry), so at anchor ry 0 the counter
 *    faces -z. offset 180.
 *  - bazaar: build_bazaar_row.py, the shops open toward -z. offset 180. Turned today by bazaar.js BAZAAR_TURN_DEG (4.8, not the anchor).
 *  - mandi: createMandi's road end (gantry, apron) is site -z. offset 180.
 *  - school: build_school.py, the gate is on the -z side. offset 180. Turned today by village.js SCHOOL_TURN_DEG (11.2).
 *  - halwai: build_halwai.py FRONT = -x. offset +90. Turned today by village.js HALWAI_TURN_DEG (95).
 *  - temple: build_temple.py, the gate gap is on the west (-x). offset +90. Turned today by temple.js TEMPLE_TURN_DEG (1.5).
 *  - house: build_house.py front = +z (south wall with the gate). offset 0. Turned today by village.js HOUSE_TURN_DEG (5).
 * Everything else (the v2 yards, the code-built sites of docs/asset-slots.md "Front faces south (+Z)") is +z: offset 0.
 *
 * `row: true` marks a place that is a ROW of units (shops side by side along its local x), so a tool or test treats its
 * footprint as one long frontage instead of one building.
 *
 * `fixedTurn` names the file that turns the model with its own constant today; under ?layout=new that constant must come from
 * layoutTurnDeg(id, old) (docs/s7/layout.md "Wiring needed").
 */
export const FRONT_OFFSETS = {
  teastall: { offsetDeg: 180 },
  store: { offsetDeg: 180 },
  bazaar: { offsetDeg: 180, row: true, oldYawDeg: -4.8, fixedTurn: 'src/bazaar.js BAZAAR_TURN_DEG' },
  mandi: { offsetDeg: 180 },
  school: { offsetDeg: 180, oldYawDeg: -11.2, fixedTurn: 'src/village.js SCHOOL_TURN_DEG' },
  halwai: { offsetDeg: 90, oldYawDeg: -95, fixedTurn: 'src/village.js HALWAI_TURN_DEG' },
  temple: { offsetDeg: 90, oldYawDeg: -1.5, fixedTurn: 'src/temple.js TEMPLE_TURN_DEG' },
  house: { offsetDeg: 0, oldYawDeg: -5, fixedTurn: 'src/village.js HOUSE_TURN_DEG' },
  // Places drawn with no turn at all today (createX(pt(id)) with no turnSiteGroup): yaw 0 now, the new map needs a turn.
  health: { offsetDeg: 0, oldYawDeg: 0, fixedTurn: 'src/main.js health_subcentre zone (no turn applied)' },
  masjid: { offsetDeg: 0, oldYawDeg: 0, fixedTurn: 'src/main.js masjid zone (no turn applied)' },
  jain: { offsetDeg: 0, oldYawDeg: 0, fixedTurn: 'src/main.js jain_mandir zone (no turn applied)' },
};

/** Offset in degrees for a place id (0 when the asset already faces +z at ry 0). */
export function frontOffsetDeg(id) {
  const e = FRONT_OFFSETS[id];
  return e ? e.offsetDeg || 0 : 0;
}
