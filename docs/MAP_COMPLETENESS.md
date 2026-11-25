# Map completeness, 26 Nov (spec = approved final map only: docs/layout/approved-map-2026-11-25.json)
Method: read code + data, nothing run in a browser. Shop matching re-implemented from src/kit/shopsPlace.js + landLayout.js matchPlace (raw map, 6 m rule) and run in Python, not in the game. Taste not judged.
Counts (map rows): places 436, objects 1627. BUILT ~417 places / ~1585 objects. PARTIAL 115 signs. MISSING 19 places + 42 objects. PLACEHOLDER 0 found (no box or capsule stand-in for a map item).

## A. MISSING (a map item with no builder, or a builder that skips it)
| Map item | World x,z | Evidence |
|---|---|---|
| Mela ground (place `mela`) | 782,-103 | src/main.js:2123 registers `mela_ground` only `if (!isNewLayout())`; "parked by owner 22 Nov". Weekly market ground (762,40) is a different item and is built (patch) |
| Railway track bed, sleepers, 2 rails | 389-393,-330..350 | no `new_rail_bed` / `new_rail` reader anywhere in src (grep) |
| Level-crossing planks x2 (highway, village road) | 389.4,-135.5 / -25 | `new_rail_crossing`: no reader |
| Crossing barriers x8, signals x2 | 388-396,-136..-16 | `new_boom`, `new_signal`: no reader |
| Railway platform | 394.4,-112 | `new_platform`: no reader |
| Railway station building | 405.8,-92 | shopsPlace.js `isSingle` accepts it, but matchPlace finds no place named "Railway station" so it is skipped ("no place with a front") |
| Platform shelter | 395.9,-93 | same skip |
| Ticket window and waiting hall | 405.8,-79.5 | same skip |
| 7 two-storey shops: Kirana 607.7,76.2; Jeweller 561.9,12.9; Readymade clothes 619.3,-17.7; Pooja items 611.3,36.6; Kites and toys 594.5,40; Gift shop 594.5,35.1; Grocery 594.1,50.3 | as listed | object ring is more than 6 m from the same-named place marker (marker moved, ring did not), so matchPlace returns null and shopsPlace.js:84 skips it |
| Hardware and paint (2-storey) | 645.7,27.8 | sqx object whose only same-named place is the single shop at 650,-114 (far), skipped |
| 11 kiosks/carts: Fruit kiosk 591.5,30.5; Kulfi kiosk 631,53.6; Juice kiosk 634.5,52.9; Toys and balloons kiosk 638.1,52.1; Sweet corn kiosk 595.6,57; Aloo tikki kiosk 657.4,59.5; Dosa cart 581.6,-10.9; Momos cart 576.4,-3.1; Lassi cart 627.7,53.2; Juice cart 620,35.4; Sweet corn cart 596,60.1 | as listed | same cause: marker and ring more than 6 m apart |
Net effect: those 18 place markers (new_sqx_244/251/253/268/269/273/274, new_k280/281/283/286/287/288/289/290/302/303/307) have no building at the marker either; the shops stand at the old ring spots or not at all.

## B. PARTIAL
| Item | Evidence |
|---|---|
| 115 `new_sign` signboard objects | no reader of `new_sign`; boards are generated per shop by one atlas (src/kit/shopsSigns.js, shopsPlace.js), so a shop gets a board but the 115 map positions are not used |
| Canal (new_canal, x 824, banks 831.5) | water, banks, bridges built by src/kit/landCanal.js and src/canal.js (NEW_X 824). Good. But see EXTRA below: old bank strips still at x 772 |
| Generic civic blocks: Village bank 564,42; Library 565,51; Doctor's clinic 588,75; Animal hospital 492.5,-9; Gas cylinder godown 564,-115; Farmers' co-op 669,-112; Wedding and community hall 751,-109; Tent and wedding lights 766,-113; Carpenter 715,-84; Blacksmith 701,-113 | built, but only as the generic `shop` kit block (shopsPlace.js tradeOf 'office'/'workshop') sized from the map ring, with a board; no purpose-specific build. Exist and are in place |

## C. BUILT, existing named places (builder, anchor from src/anchors.js in ?layout=new; map x,z in brackets)
All 47 take x,z from src/layout/mapData.json via applyLayoutToAnchors (tools anchor dump run in node: 0 m difference to mapData; difference to the raw approved file is the road snap, listed in E).
- house 656.4,35.3 (650.1,34.8): src/village.js. school 556.5,108.5: src/village.js (hero school). halwai 614.1,4.8, teastall 593.5,6.9, store 614.2,-113.9: main.js/shops.js. bazaar 587.7,-98.4: src/bazaar.js (main.js:1234).
- post 557.3,65.5, ration 585.3,-56.2, chakki 590,-46.3, dairy 440.1,-19.5, tubewell 712.2,8.6, tvhouse 637.4,6, khalihan 549.1,-152.3, gurukul 634.8,108.3, maidan 631.9,154.3: stagedPlaces.js + stagingYard.js, models in public/assets/models (all 20 *_v2.glb present).
- yard_bus_adda 516.4,-112.3, yard_puncture 554.2,-113.8, yard_paani_tanki 712,36.5, yard_petrol 486.2,-104.6, yard_panchayat 549.8,23.9, yard_chaupal 546.5,48.5, yard_volleyball 594.8,150, yard_bhatta 672,-175.8, yard_dharam_kanta 634,-108.7, yard_akhada 672,141: same.
- temple 676,-94 (src/temple.js), gaushala 467.2,-22.6, pond 493.8,19.7, johad 730,6.7, anganwadi 575.9,95.1, health 588,57.7, chemist 612,-103.8, manihari 608.6,-50.9, masjid 442,-114.8, gurudwara 444.8,94, jain 781,103.5, haveli 658.6,-39, mandi 515.9,-171, sabzi 591.3,33.7, banta 616.5,13.3, chaat 612.5,31.7, jalebi 617.6,28.4: src/farmSites.js create* via main.js zoneManager.register (lines 1919-2165) and layout-wiring-entry.js.
- field 603.5,-216 (src/field.js), gilli 669,163 (src/jobs/gilli.js).

## D. BUILT, new map items (builder)
- 144 of 166 shop-like objects (sqx shop-houses, kiosks, carts, single shops, sheds): src/kit/shopsPlace.js (one BatchedMesh set, positions from o.rect).
- Houses (455 `new_house`): src/kit/houses.js, housesPlan.js. Trees (guava 185, mango 164, row/greenbelt/kiln/peepal): src/kit/landTrees.js. 57 fields + 5 orchards + green strips: landFields.js. Wells, hand pumps, haystacks, dung cakes, straw, washing lines, flag island + name stone, peepal platform: landProps.js. Bus shelter, cycle stand, jaggery unit, milk carts: shopsPlace.js sheds.
- Tubewells x10, transformer 681,12, mobile tower 715,-65, notice board 546.5,37.5, water trough, 8 machans, 8 scarecrows, 41 pots, 10 milestones, 3 ponds + temple tank, 4 buffalo, 9 resting spots, washing platform, barbers, potter yard, kiln, cricket pitch, kabaddi, play patches, tempo stand, truck parking, parking, cane centre, market ground, house plots, welcome gate 605,-113: src/kit/mapObjects*.js (mapObjectsPlan.js lines 209-340).
- Goods yard, gher yard, haystacks yard, dung-cake yard, carrom, culvert, field gate wheat: layout-wiring-entry.js step 3, spots from the map.
- Mango baagh: src/baagh.js BAAGH_CENTER reads the map's `new_432`. Ride nooks / long walks (about 75 zone: items): rideNooks.js, longWalks.js, kept only where the map lists them.
- zone:water_tank (-22,122), lane_water/lane_cattle (x -87..16), map_well 394.5,-20.6, map_field_gate 573,188.5: built at those exact coordinates (main.js 1910, 1942, 2088-2093). Note the map itself puts the water_tank and lane spots about 600 m west of the village.

## E. Position differences (built != raw approved file)
Cause: tools/layout-pack.mjs road snap, written to mapData.json; the game uses the packed value. 27 places differ by more than 0.3 m. Over 5 m: house 6.4 m (650.1,34.8 -> 656.4,35.3), new_sqx_243 17.3 m (594.4,45.6 -> 577.4,49.1), new_371 Milk carts 8.5 m (444,-12.8 -> 452.4,-11.7). Others 0.5-4.1 m (ration 4.1, manihari 3.1, tubewell 2.9, mandi 2.9, petrol 2.9, haveli 2.8).
The shops kit reads the RAW file (landLayout.js), so shop positions follow the raw map, not the snap.

## F. EXTRA (built in the game, not in the approved map)
| Item | Where | Evidence |
|---|---|---|
| Second school ("Yard 1", primary_school.glb) | 320,-225 | stagedPlaces.js yard_school, registered by stagingYard.js; mapPlan.js says it is not placed on the map; no map entry |
| Village houses kit yard A-H (house_kit_a-h) | 308.6,-175 | stagedPlaces.js yard_houses, registered, no map entry |
| Canal bank road strips x2 (old canal) | 772,28.4 and 772,39.6 | main.js:2148-2151 uses ANCHORS.canal (771,33.8); the map canal is at x 824, so these sit 52 m off the water |
| Old mission canal anchor | 771,33.8 | anchors.js `canal`, map has no entry (only new_canal at 824) |
| Sugarcane belt, neighbour orchard, old highway cluster, mela | dropped under new layout | layout-wiring-entry.js drops them; listed only to show they are not extra |
| Material board yard | 560,15 | dev mode only, not built for players |
