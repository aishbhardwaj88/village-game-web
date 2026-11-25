# Road-empty C, 25 Nov (agent C). Her order: ROADS MUST BE EMPTY.
Test: real mesh vertices (y 0.05-3.2) vs road band (width/2, flat caps) + drawn edge wander (1.4 x amp) + 0.3 m; "full" also adds the scuffed apron (band 0.8-1.8 m). Scripts: tmp/roadempty/{solve,pilot,lazy,c_spots,v2pos}.mjs. Solid check: place footprints + map solids (layout.js).

## Changed
| Item | File | Was | Now |
|---|---|---|---|
| halfbuilt house oddity (main_road, 2-4 m deep) | src/villageOddities.js | 601.0,-17.9 | REMOVED, no legal spot within 6 m. `ODDITY_REMOVED_25NOV = ['halfbuilt']` (spotMatrix returns null; src/oddityDiscoveries.js skips it) |
| scaffold oddity (ring_road 0.27) | src/villageOddities.js | haveli lx 4.9, lz 21.8 | lx 5.11, lz 24.29 (2.5 m east, full apron clear) |
| old well oddity (cross_road 1.3) | src/villageOddities.js | halwai lx -7.4, lz -20.4 | lx -5.95, lz -18.68 (2.25 m, drawn road + 0.3 clear; full apron cannot be met within 6 m without landing in a building) |
| pilot auto_rickshaw | src/pilotVehicles.js (REVIEW only) | 607.6,45.6 | 610.35,45.6 |
| pilot motorbike | same | 608.8,41.8 | 613.43,44.77 |
| pilot tuk_tuk, thela_gadi, moped | same | main_road 2.1-2.9 deep | REMOVED, no free legal spot within 6 m. `PILOT_REMOVED_25NOV` |
| mainRoadLife + gullyLife site test | src/mainRoadLife.js, src/gullyLife.js | w/2 + r + 0.3 | + apron + wander (APRON_25NOV). 13/13 main-road scenes still placed, 0 hits. gullyLife places 0 in the new map (its two lane names no longer exist), nothing to move |
| vendors2 stall sites | src/vendors2.js | cane on inner_loop 3.2 m deep (624,-4.3), paan in cross_road apron | site search now rejects road + apron: cane 618.1,-3.1; paan 613.4,28.5; grinder unchanged |

## Verified clean (real footprints, no change needed)
villageFurniture, villageFurniture2, villageFurniture3 (ruin already off), nostalgia, lifeScenes, lifeScenes2 (all 4 scenes skipped by its onNewRoad guard, rangoli clear), mainRoadLife (24 people, 22 colliders, 0 hits), gullyLife.
Note: createVillageOddities is not called under the new layout (src/main.js:768); only its discovery points (src/oddityDiscoveries.js) are live there, and they follow the moves above.

## Not mine, report only
- Temple tank outer ring (655.8,-99.2, gali_n44 1.99 m) and ground patches parking#2 (732.7,-94.2), kids play patch#3 (658.5,10.9): drawn by src/kit/mapObjectsGround.js, planned in src/kit/mapObjectsPlan.js (`out.tanks` outer = min(steps rect w,d); `out.patches`). Owner: the kit/mapObjects* agent. Fix: shrink tank outer ring so it clears gali_n44 by 0.3 m; trim patch rings 0.3 m off the bands.
- Left to agent E (her later order): jhoola, bhootiya ghar ruin, milk centre, small shops (villageFurniture.js ON_ROAD_REMOVED_25NOV, villageFurniture3.js RUIN_REMOVED_25NOV, smallShops.js). Not touched or committed by C.

## Checks
build:unchecked OK; missions-check 397 PASS / 0 FAIL / 3 WARN; road-clearance + road-clearance-props: nothing in my files; map-match roads/shops/props PASS.
