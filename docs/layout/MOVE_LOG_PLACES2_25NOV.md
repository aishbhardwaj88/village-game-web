# Places round 2, 25 Nov: facing by the NEW definition (her review rules, tmp/review_rules.txt)

Rule used (own audit copy, `tmp/audit/audit5_places.py`, fed by `tmp/audit/export5_places.mjs`; search tool `tmp/audit/solve5_places.py`): m_front = centre of the front face of the MAIN building (not the whole-site box), m_back = centre of the back face. Fronted road = band nearest m_front, within 15 m (or any distance if no band is within 15 m of the building). m_front not farther from that band than m_back (+0.5 m). Walls square to the road at the nearest point within 5 deg (10 on ring_road / inner_loop / chauraha_ring). A near tie (another band within 0.3 m of the fronted one that is not square) also fails. Open grounds exempt. Bodies come from the Blender build scripts. Walled compounds with a gate (house, school, gaushala, haveli, gurukul, paani tanki, temple) use the gate wall as the front face, because the gate is how the building meets its road; the temple's plinth alone would sit 17 m from the highway.

Before: 24 PASS, 12 FAIL, 10 exempt (the old audit's 24 "facing" flags were mostly noise). After: **36 PASS, 0 FAIL, 10 exempt** (46 places). `node tools/map-match-places.mjs`: 0 flagged, 0 on a road. missions-check: 0 FAIL. Every moved place is within 5 m of its map spot, clear of every band by 0.1 m or more, and its main building overlaps no other place, shop or house (except sabzi, below).

## Moved or turned (src/layout/placeMoves.js)
| Place | Change | Why |
|---|---|---|
| School | turned +22.4 deg (rotation.y -11.2 -> +11.2), no slide | It was NOT 11 deg off: village.js turned it by SCHOOL_TURN_DEG +11.2 (rotation.y -11.2) while the approved Outer lane south runs at -11.2, so it stood 22.4 deg off square (the old audit read the anchor's ry 0). `layoutTurnDeg('school')` now returns -11.2, so schoolPt(), colliders, signs, trees, routes and the model all turn together. Gate stays on the lane side (north). Child-seat cycle (wallWriting.js, wallStories.js) now uses the school's real yaw. |
| Halwai | turned 36 deg (ry 54 -> 90) | square to main_road, was 36 off |
| Store | slid 0.5 m west | fronts main_road square (the highway was 0.1 m nearer and 19 deg off) |
| Ration shop | slid 2.55 m east | front looked at gali_n46 (33 deg off, back nearer); now fronts main_road square like the chakki beside it (also moves yard_ration) |
| Temple | slid 1.5 m north (4.97 m from map spot in all), turned 1 deg (ry -91 -> -92) | gate wall now 14.2 m from the highway it faces, square; was 11.8 m from the lane behind it with the back nearer |
| Banta | turned 26 deg (ry -64 -> -90) | square to cross_road |
| Chaat | turned 36 deg (ry -144 -> -180) | square to main_road, also clears the Pooja items shop (0.66 m2) |
| Jalebi | turned 30 deg (ry -120 -> -90) | square to cross_road |
| Dairy | slid 1.5 m more south (3.0 m in all) | shop front now faces cross_road square; back had been nearer the lane behind |
| Sabzi | slid 2.9 m NW, turned 8 deg (ry 140 -> 132) | was 40 deg off main_road; now fronts cross_road (2.6 deg); clears the kite job points |
| Bus adda | slid 2.5 m north | shelter front faces the highway; before, gali_n19 behind it was nearer |
| Bhatta | turned 180 deg, slid 5.0 m south | front faced north, 18 m farther from the highway than its back; kiln front now faces it |

## Reviewed and left alone (pass by the new definition)
House (ring_road, 0 deg), teastall (cross_road 3.4 deg), bazaar, chakki, tubewell, gaushala, tvhouse, jain, haveli, gurukul and anganwadi (both square to the Outer lane south, 0 deg), yard_puncture, yard_paani_tanki, gurudwara, and the open grounds Maidan, Khel, Volleyball, Akhada, Gilli. Strict reading for the house: its 10 x 8 m block alone had its back 0.7 m nearer the road than its front (11.5 vs 10.8 m); the walled courtyard with the gate is its front face, which passes.

## Cannot be fully fixed under 5 m
- **Sabzi** still overlaps the Gift shop (2-storey, 598, 33) by 7.2 m2 (was 11.5): every slide/turn within 5 m that also clears the kite job points leaves some overlap. The shop belongs to the shops round.
- **Hero house** courtyard overlaps the Hardware and paint shop (643.5, 24.3) by about 25 m2 (not caused by this round; the house is not moved here). Shops/houses agents' files.
- **Bhatta** is turned and slid the full 5.0 m; its front face is still 41 m from the highway (nothing nearer exists within 15 m, so the "nearest band, any distance" case applies).
