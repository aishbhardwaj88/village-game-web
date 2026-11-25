# Road empty, round I (25 Nov): east re-scan leftovers

Her order: roads empty, move never delete. Model fixes (shared): src/mapRoads.js drawnRoadClearance now (a) includes the chauraha ring (it is drawn from CHAURAHA, not getRoads(), so every clearance test was blind to it) and (b) counts the alpha>=0.5 dusty apron per kind (highway 0.58, road 0.42, lane 0.31, back 0.19, track 0.46, path 0.17); ROAD_EMPTY_MARGIN default 0.3 -> 0.6. Every helper that passes 0.6 (mapSigns, mapObjects, animals, landProps, farmSites, layout wiring, shops) now means 0.6 m beyond the drawn apron edge.

| Item | Was | Fix |
|---|---|---|
| s7_shop_signs (Fruit kiosk board) 593.6,28.6 chauraha_ring 0.95 m | on ring | src/kit/shopsPlace.js: kiosk/cart/shed slides straight away from the road (max 3 m, 0.6 beyond edge); board and colliders ride with it |
| wayfinding_signs 614.5,25.6 chauraha_ring | 0.81 m | src/wayfinding.js: posts and notice board pushed 0.6 m beyond drawn edge (max 6 m) after seatBesideRoad |
| milestones 0..3 lane 13 east | 0.40 m | src/milestones.js: pushed away from the lane (max 6 m); now 0.95-1.08 m clear in the test model |
| ride_nook_25_well 834,329.7 canal_bank_road | 0.26 m | src/layout/layout-wiring-entry.js: nook footprint radius 2.4 -> 3.0 m |
| icecream_carts 590.1,24.3 chauraha_ring | 0.16 m | src/iceCreamCarts.js: cart slid off (max 6 m) |
| s7_map_signs 763.8,-115.9 highway | 0.17 m | apron now counted in the shared model, mapSigns slide uses it (margin 0.6) |
| s7_wall_murals x5 (gali_n0/n27/n3/n41/n5) | 0.28 m | src/kit/wallMurals.js: slide-along-wall test needs 0.5 m beyond the band (was 0). A mural whose wall face itself is in the apron stays (wall paint above 2 m, reported) |
| banta_shop_metal (awning, y 2.85) chauraha_ring | 0.20 m | left: overhead only, no post flagged |

West re-scan doc (ROAD_EMPTY_RESCAN_WEST_25NOV.md) did not exist when this ran; nothing from it fixed.
Checks: build:unchecked ok, missions-check 0 FAIL, road-clearance-props ok, map-match props/shops/places/houses/roads pass (new_milestone#4 1.1 m off is unchanged from before).
