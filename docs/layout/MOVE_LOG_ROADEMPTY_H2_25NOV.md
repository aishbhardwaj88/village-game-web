# Roads empty, H2 pass (25 Nov). Moves, never deletes.
Margin rule: 0.3 m past band + wander, plus the highway's alpha>=0.5 apron (0.58 vs wander 0.28, so +0.3): helper margin raised 0.3 -> 0.6.
Test: tmp/roadempty2/test.mjs (band + max(wander, apron), margin 0.3).

| Item | Before | After |
|---|---|---|
| s7_map_signs (src/kit/mapSigns.js) | 0.3 m past wander edge, 0.09 m inside highway apron | slide margin 0.6 (all ~170 clusters re-slide on next load) |
| map objects: pumps, buffalo, haystacks, wells, gobar, tubewell, milestones (src/kit/mapObjects.js) | push max 3 m, margin 0.3 | push max 8 m, margin 0.6 |
| animals (src/animals.js) | margin 0.3 | margin 0.6 |
| street lamps (src/props.js) | clear >= 0.3 beyond wander | clear >= 0.6 (lamp 622.6,7.6 on inner_loop slides off) |
| map_field_gate leaves (src/main.js) | x 567.2 / 578.8 (B leaf touched apron: -0.01 at 577.7,185.3) | x 566.7 / 579.6 (both >= 0.8 clear) |
| dung_cake_yard patches + stacks (src/farmSites.js) | across gali_n15 (2.19 m deep) and cross_road at 418.9,-13.2 | each patch/stack pushed off road, max 8 m, margin 0.9; colliders follow |
| field_gate_wheat (608,-165) | tested: leaves clear (0.78 / 2.55 m) in code; scan depth likely a bbox artifact | unchanged |
| map_haystacks | earlier fix kept (local z 1.0); scan spots 505,-1 / 516,1 not in this group's code | covered by mapObjects margin 0.6 where they come from the map |
| s7 wall murals, s7_props, s7_pump_cracked, ride_nook_25_well, tubewell_v2 | not changed (sources outside owned files: s7 shop/house kits, rideNooks.js, stagedPlaces.js) | open |
