# Roads must be empty, fixer G (25 Nov). Nothing deleted, items moved to empty spots. Scripts: tmp/restore2/solve.mjs, tmp/g_tank2.mjs

| Item | File | Was | Now |
|---|---|---|---|
| painted patches (all), incl. parking#2 and kids play#3 | src/kit/mapObjectsPlan.js trimRectToRoads | trimmed to the road band + 0.05 m | trimmed to the DRAWN edge (band + wander amp x 1.4) + 0.3 m. parking#2 30.7 -> 29.2 m long, centre 741.4,-97.6 -> 740.6,-97.9 (trim 14.6 m); play#3 8.9 x 7.9 -> 8.0 x 7.3, centre 662.5,11.1 -> 662.7,11.3 |
| field_animals buffalo | src/main.js | FIELD_CENTER.x + 8 (611.5,-176), 2.9 m from the wheat track | + 10.5 (614.0,-176), 5.3 m from the track centre line, inside the east half of the field |
| half-built house oddity | src/villageOddities.js | removed (601.0,-17.9, main_road) | back (ODDITY_REMOVED_25NOV = []), world 577.0,-20.9, scale 0.9, front toward gali_n40 (4.3 m off), square to it. spotMatrix gained optional `s` (uniform scale) |
| new+old house pair | src/villageFixtures.js | removed (623,-2, inner_loop) | back (REMOVED_ON_ROAD.newOldPair = false), world 623.0,-45.0, scale 1, front toward inner_loop (11 m), square. 43 m from its old spot (no legal spot within 40 m at any scale 0.6-1.2) |

Spot search: 0.5 m grid, rings of every map object (not crops/greenbelt/grazing), shopRects, existing-place footprints, all dilated 1.0 m; footprint samples >= 0.3 m beyond drawn edge + scuffed apron. The two items are 46 m apart. agent E's MOVE_LOG_RESTORE_25NOV.md did not exist, so the 30 m rule against E's six items is NOT verified.

## Not done, needs a decision
- Temple tank (655.0,-94.4, outer 12, inner 8): the map draws gali_n44 ending at 655.26,-94.88, i.e. at the tank centre, so even the 8 m water square is on the lane. No shrink of the outer ring can clear it. The smallest fix found: move the tank about 7.5 to 8 m west (outer 5.2 to 5.5 half-width) or cut gali_n44 back to z -92 (road owner). Left unchanged, tank kept at its map spot as told.
- Both restored houses are NOT built in the game: src/main.js lines 768 and 770 call createVillageOddities and createVillageFixtures only under the old layout (not my lines). The moves apply to the discovery points (src/oddityDiscoveries.js) and to the builders if they are switched on.
- Wall writing at (642,20) and (624,51) (commented out in src/wallWriting.js, a10951b): they were on old-layout compound-wall runs (MAP_COMPOUND_WALLS, fixed coordinates) that now lie on cross_road and inner_se, so there is no clear wall face to put them back on. Left removed.

## Checks
build:unchecked OK; missions-check 398 PASS / 0 FAIL / 3 WARN; road-clearance: nothing new (Kabaddi lines 1.7 m on outer lane east was already there); map-match roads/shops/props/places PASS (0 flagged).
