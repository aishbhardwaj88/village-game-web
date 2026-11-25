# Road-empty move log A, 25 Nov 2026 (her order: nothing on any road)

Clearance = flat band edge (width/2) plus drawn apron start; target >= 0.8 m from the band. Scripts: tmp/roadempty/a_*.mjs.

| Item | File | Before (x,z) | After | Result |
|---|---|---|---|---|
| Review free-props rows (all ~58 props, review mode only) | src/freeProps.js | x 600.4-612, z 26.9-39.4 (across main_road, -3.1 m) | REMOVED (FREE_PROPS_ON_ROAD_REMOVED) | the only free verge (x 607.7-621.5) holds chaat, jalebi, kiosks, signs; no legal 6 m move |
| 5 lane walkers (the "bazaar_life crates") | src/bazaarLife.js | 570.6,36 / 570.8,46 / 624.8,30 / 624.8,38 / 571,58 / 571.1,66 / 623.2,50 / 623.2,58 / 569.6,22 / 569.7,30 (1 to 1.7 m inside inner_sw, inner_se) | REMOVED (NEW_LANE_LOOPS_ON_ROAD) | both verges lined with kiosks and sign posts |
| Third map haystack | src/farmSites.js | 508.2,-0.6 (-2.64 m, cross_road) | 508.2,-5.1 (local z 5.5 to 1.0, 4.5 m), +1.07 m clear | moved; collider follows (same array) |
| Parked jeep | src/jeep.js | 563.4,4.6 (-3.47 m, cross_road) | REMOVED (JEEP_ON_ROAD_REMOVED) | nearest legal ground 556.3,11.7 is ~10 m away |
| Tea stall motorcycle | src/scooters.js | 587.7,6.7 (-1.42 m, cross_road) | 587.7,2.7 (local 2.22, 6.81), +1.64 m clear | moved 4 m; other 7 scooters already clear (min 1.47 m) |
| Highway "To the city" boards (2) | src/mapGates.js | 350.4,-135.3 and 869.7,-127.5 (1.6 m from band, 3 m wide board) | pushed 0.8 m outward | clear |
| Back-lane mouth posts (40) | src/mapGates.js | 0 to 0.1 m or inside ring_road (about 22 inside, 0.0 to 0.2 m) | each pushed straight off the road, max 1.17 m, none dropped | all >= 0.8 m (GATES_KEEP_OLD_SPOTS restores) |
| Direction posts (cross_east, main_north, main_south, chowk_south) and notice board | src/wayfinding.js | cross_east 644.2,15.6 (0.81); main_north 598.0,-30.5 (0.87); main_south 608.6,59.6 (0.84); chowk_south 615.0,24.0 (0.60) | 643.7,14.7 / 597.0,-30.5 / 608.3,58.7 / 615.3,25.5 (>= 1.71 m) | kerb 0.6 to 1.7; notice board unchanged (5.8 m clear) |
| Zero milestone and flag | src/zeroMilestone.js | 602.9,19.9 | LEFT | the audit band is the raw map crossing; the game cuts main_road and cross_road at the ring (src/mapRoads.js ringArms), so the milestone stands on the island centre, 4.5 m inside the ring's inner edge (radius 6) |
| armFrontage tarpaulin / jute | src/armFrontage.js | 748.6,20 / 716,20.5 / 444.1,-7.3 / 495.9,3.1 | no change | module returns early under layout=new (info.off), so it builds nothing; those batches come from another source |

Notes
- Ceramic pots at 804.7,32.6 / 799.7,32.6 / 604.7,32.6: placed by assetSlots in src/main.js (not my file), not freeProps; reported only.
- Wall writing at 644.6,20.3: src/kit/mapSigns.js (not mine).
- Haystack "building part" at 505.9,0.4: a place batch, not mine.
- Checks: build:unchecked OK; missions-check 397 PASS, 1 FAIL (find_old_well in src/oddityDiscoveries.js, another agent's file), 3 WARN; road-clearance, road-clearance-props, map-match roads/shops/props clean for my items.
