# Restore: six removed items + jeep + bazaar walkers moved to empty roadside plots, 25 Nov

Her order: 'I did not ask you to remove those... change the size and dimension and place them in empty areas instead of deleting them.'

Method: tmp/restore/find.mjs rasterises the village (0.5 m cells, x 380..930, z -230..230): drawn road surface (roadNetwork sampleSurface) + all 46 place footprints/anchors + 455 houses (plan rows, +1.2 m porch) + 163 shop rects + every map object ring (fields, ponds, grounds, trees, wells, pumps) + canal + built-mesh extents. tmp/restore/verify.mjs then re-checks each pick with exact geometry (sampled footprint at 0.2 m vs every obstacle polygon, drawn-surface march, nearest band segment squareness) and only accepts picks that pass: clearance to drawn road >= 0.3, obstacle clearance >= 0.8, front gap 0.3..3 m, walls square to the road it fronts <= 5 deg, 45 m apart.

| Item | New x, z | Scale | Road fronted | Front to drawn edge (m) | Front to band edge (m) | Square (deg) | Clear of drawn road (m) | Nearest obstacle (clear m) | Nearest of the seven |
|---|---|---|---|---|---|---|---|---|---|
| Mithai kiosk (chulha, kadhai) | 536.64, 13.97 | 1 | ring_road | 1.1 | 2.4 | 0 | 0.7 | shop:new_Cycle stand | Cycle s (1.63) | milk 55.7 m |
| CD and cassette shop | 638.5, 28.36 | 0.9 | cross_road | 1.3 | 2.8 | 0 | 1.2 | shop:new_sqx | Hardware and pa (1.21) | milk 65.3 m |
| Newspaper and book stall | 528.09, -48.91 | 1 | gali_n35 | 1.55 | 2.4 | 0 | 0.55 | none within 1.5 m | mithai 63.5 m |
| Old milk centre | 577.51, 51.74 | 1 | inner_sw | 1.35 | 2.4 | 0 | 1.15 | none within 1.5 m | mithai 55.7 m |
| Jhoola (swing) | 607.23, -53.28 | 1 | main_road | 1.1 | 2.4 | 0 | 0.95 | place:manihari (1.31) | book 79.3 m |
| Bhootiya ghar ruin | 477.06, 24.46 | 1 | gali_n22 | 1.45 | 2.4 | 0 | 1.45 | house:339 (1.22) | mithai 60.5 m |
| Parked jeep | 690.08, -26.22 | 1 | 13_Outer lane, east (tractor route) | 1.5 | 2.4 | 0 | 1.45 | new_House plot:new_House plot  (1.51) | cd 75.1 m |

Overlaps with the drawn road: 0 footprint cells on the drawn surface for all seven. Built-mesh vertices vs road bands (tmp/legacyroad/audit.mjs): 0 hits for smallShops, milkCentre, villageFurniture, villageFurniture3.

## What changed (all behind named constants/data, no file deleted)
- src/smallShops.js: SMALL_SHOPS_REMOVED_25NOV false; SHOPS now absolute {x, z, ry, sc}; Shop.place, signs, shopkeeper capsules and colliders all scale with sc (text on the signs scales with the board, so Hindi bold line 1 / English line 2 keep their ratio). Old chowk offsets kept in a comment.
- src/milkCentre.js: MILK_CENTRE_REMOVED_25NOV false; exported SITE {x, z, ry, sc}; geometry, sign, queue, cyclist and colliders scale with sc.
- src/villageFurniture.js: ON_ROAD_REMOVED_25NOV emptied; JHOOLA_SITE_25NOV {x, z, ry, sc} (beam parallel to the road, seat plane toward it); collider uses the matrix scale once.
- src/villageFurniture3.js: RUIN_REMOVED_25NOV false; RUIN_SITE_25NOV {x, z, ry, sc}; ry turns the ruin's open WEST side (door, scrawl) to the road.
- src/jeep.js: JEEP_ON_ROAD_REMOVED false; JEEP_SPOTS has an absolute 'world' spot; jeep parked along the road edge (its length parallel to the road).
- src/bazaarLife.js: NEW_LANE_LOOPS_ON_ROAD true: the five lane walkers are moving people and walk again (nothing in that list stands still).
- Interactions re-pointed: src/oddityDiscoveries.js (bhootiya_ghar uses RUIN_SITE_25NOV), src/interactionsVillage.js (jhoola_swing uses JHOOLA_SITE_25NOV). No mission or minimap marker referenced the shops or milk centre.
- src/wallWriting.js: the two wall decals now try to slide along their own wall run to a spot 0.4 m+ off the drawn road (onWallOffRoad). Both runs are only 3.5 m long and lie wholly on a road (cross_road, inner_se), so they stay off: there is no wall off the road to hang them on. Needs her call (hang them on the halwai and general store buildings instead?).
- Kites over roads stay removed (unchanged).

## Notes
- The ruin was designed round the pond peepal (a trunk at its local (-1.8, -0.3)); at its new site no tree grows through it. Not built, would be a new object.
- Plots found 'beside a road with the front on it' sit between houses and the lane, so they are in the village, not on the far edge. Density in a 25 m radius is 0.35 to 0.63 (fields count as occupied).
- Not seen by the finder (not available in node): GLB-based props and runtime-placed lamps/signs. Run a walk-through before calling this final.
Checks: build:unchecked OK; missions-check 0 FAIL; road-clearance (11 pre-existing building/label hits, none mine), road-clearance-props, map-match-roads/shops/props/places/houses clean.
