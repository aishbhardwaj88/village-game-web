# Placed props_new, 26 Nov

Files: src/placedPropsNew.js (streaming), src/placedPropsNewData.js (rows, SIZE, bedPoints), tools/placed-props-new-check.mjs (verify; --write re-searches spots). Wired in src/main.js after registerFarmProps.
Rows are legal spots only (road +0.6 m, 0.4 m off buildings, not in ponds/canals, not on existing placed props, trees, haystacks, dung, sugarcane).

## Counts (from the check)
```
singles: {"scarecrow":10,"fence_section":10,"fence_gate":5,"pot_plant_b":6,"pot_plant_d":7,"pot_plant_a":4,"potted_plant_2":4,"potted_plant_med":4,"potted_plant_1":4,"money_plant_pot":2,"pot_plant_c":2,"flower_pot":2,"plant_in_pot":3,"planter_long":3,"jasmine_climber":4,"snail_vine_climber":4,"banana_tree":9,"mango_tree":5}
bed plants: {"cabbage":43,"radish_leaf":31,"tomato_plant":28,"eggplant":23,"watermelon_bush":6,"corn_a":6,"corn_b":8,"wheat_row":16,"wheat_clump":38}
rows: 88 singles, 12 beds; added triangles if EVERYTHING were in view: 331174 (streamed per site, only near the player)
```

## Known gaps
- Shop fronts: almost no shop has 0.6 m of clear verge, so only 1 shop has pots (8 wanted). Houses 12 places, school 5, panchayat 4, anganwadi 3.
- Pond-edge banana clusters found no legal spot; all banana trees stand behind houses (3 clusters). banana_plant (the other model) was not drawn by the search, only banana_tree.
- No kitchen-garden beds beside houses; beds are in field plots only (tomato in the Chilli plot c8 and corn in Green fodder c40 found no room).
- Climbers are squashed in depth (jasmine z x0.5, snail vine x0.55 z x0.3) to lie against the wall. Front direction of every model is unverified by eye.
