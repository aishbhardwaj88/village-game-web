# Place moves, 25 Nov (her rule: nothing on a road band, every place faces its road)

Where: src/layout/placeMoves.js (applied by src/anchors.js after the approved layout, under ?layout=new). Interiors, props, colliders and
mission stops follow because they read the anchor (pt / localPt / movedWith); the untouched school and grounds carry their literal
points through MOVE_SHIFTS (src/layout/layout.js movedWith / placeTurn). Check: `node tools/map-match-places.mjs` (0 flagged, 0 on a road),
independently re-run with shapely on the live anchors (0.1 m clear of every band for 43 of 46; 3 listed below).

## Moved off a road (smallest slide, under 5 m)
| Place | Old spot | New spot | Moved m | Facing (unchanged) | Was in |
|---|---|---|---|---|---|
| School | 556.5, 108.5 | 557.1, 111.5 | 3.06 | gate north onto the lane | Outer lane south, 1.05 m deep, 22.8 m2 |
| Temple | 676.0, -94.0 | 672.3, -96.3 | 4.36 | front north (yaw 1 deg) to the highway | Outer lane north, 1.5 m, 19.8 m2 |
| Dairy | 441.5, -20.8 | 441.5, -19.3 | 1.50 | front south, -7.3 deg | gali_n15, 1.39 m, 7.7 m2 |
| Gurudwara | 445.0, 95.5 | 444.6, 93.9 | 1.65 | 2.6 deg | edge lane sw / gali_n21, 1.52 m, 15.7 m2 |
| Petrol yard | 487.0, -107.3 | 487.0, -104.4 | 2.90 | front north to the highway | highway, 2.78 m, 94 m2 |
| TV house | 637.9, 3.4 | 637.9, 5.6 | 2.20 | front south | gali_n38, 0.97 m, 7.7 m2 |
| Water tank (yard_paani_tanki) | 709.8, 36.5 | 709.8, 36.3 | 0.20 | front north | gali_n32, 0.01 m2 |
| Anganwadi | 575.9, 95.1 | 575.9, 95.3 | 0.15 | front north onto the lane | was 0.05 m from the band (needs 0.1) |

Child school run route (src/missionsLayout.js): one waypoint on the Outer lane south centreline, so the walk does not cut the Anganwadi corner now the school is 3 m south.

## Facing (road facing wins over the old model turn; front = local +z)
| Place | Before | After | Why |
|---|---|---|---|
| Anganwadi | front yaw -168.8 (north) | unchanged | already faces the Outer lane south, square to it (0 deg off). The map's own front (south) looks at no road. |
| Gurukul | front yaw -168.8 (north) | unchanged | front looks at the Outer lane south, 6.3 m beyond its front edge, square. |
| Volleyball | -96 | -107.1 | front west at main_road, walls square to it (was 11 deg off) |
| Khel maidan (+ yard_khel) | -6 | -107.1 | front toward main_road (25 m), walls square to it |
| Akhada | -6 (front south) | 180 (north) | nearest road is the Outer lane east to the north-east, 40 m; its run is north-south, so square = 180 |
| Gilli | -6 (front south) | 180 (north) | same road, 63 m |
Not verified in a render (no browser pane here): the facing of the five open grounds rests on the maths above.

## NOT moved (cannot clear under 5 m), listed with the number
- **Mela ground** (782, -103): 13.8 m2 on highway + gali_n0, 4.68 m deep. The site box (26.5 x 29.4 m) is wider than the gap between the highway and gali_n0: no slide up to 25 m clears both. Needs the site trimmed or the roads changed (her call).
- **Pond** (493.8, 19.7): 30 m2 on cross_road, Outer lane west, gali_n23. Smallest clear slide is 7.9 m west.
- **Field** (603.5, -216): 360 m2 on the Wheat field track, which runs north-south through the middle of the 120 x 90 m tractor-loop box. Smallest clear slide is 57 m (east, 57.1 / 4.2 south). Footprint not trimmed to hide it.

## Left for her / notes
- The school stands 11.2 deg off square to the Outer lane south (the hero school is built axis-aligned, its turn machinery is off under the new layout). Moved clear but not turned.
- Whole-site boxes of places still overlap each other (gurukul box over the khel ground, 115 m2): not a road matter, not touched.
