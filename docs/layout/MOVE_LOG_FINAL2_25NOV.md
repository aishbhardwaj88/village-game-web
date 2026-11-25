# Final road review 2, 25 Nov (3 reviewer items + prop re-run)

## 1. Shop far-LOD blocks (src/kit/shopsPlace.js)
- Before: far block built from the nominal w x d, its plinth/roof reached past the near mesh (Spices 2-storey: far z -3.53..+4.05, near -3.56..+3.50, 1.51 m2 over cross_road).
- Now: every shop's far block is squeezed into the real x/z bbox of its own near geometry (`nearBounds` + `clampFar`, never grows). Far key includes the near bbox so shops with equal w x d but different near meshes do not share a block.
- Spices 2-storey (4.4 x 7.0 x 7): far is now x -2.22..2.22, z -3.53..+3.50, inside near. Same rule for all 111 big shops (shop + shopHouse).

## 2. Well new_well#1 (and its place new_433)
- 558.07,-43.00 -> 560.03,-42.68 (2.05 m, east, same spot beside house #17 / gali_n35 dead end). 1.84 m inside the dead end's round cap before, now clear of the band by 0.13+ m for its 1.6 m circle.
- Done in tools/layout-pack.mjs (ROUND_CAP + NUDGE_LIMIT 5 m for this prop; the place record rides with it), mapData.json repacked from the committed sources.

## 3. Street lamp on 15_edge_lane_sw (leg meeting gali_n25)
- Lamp at 431.22,5.03 was 1.66 m inside the gali_n25 band. `createStreetLamps` gets a `clear` option (mapRoads.js mapBandClearance): a lamp inside any band slides along its own lane, smallest slide first, max 5 m. This lamp slides 2.5 m (to z about 7.5), spacing kept (leg has one lamp). The other 48 lane lamps are unchanged.

## Re-run
- road-clearance.mjs: 13 -> 11 hits, all exempt: kabaddi lines, field-gate / zone_436 / lbl_523 / East gali / West gali markers (invisible), island, welcome gate, culvert, Temple pond (a pond: gali_n44 ends at its bank by design).
- road-clearance-props.mjs: 0 after the filter on all four lists.
- map-match-roads/shops/props pass (shops: 0 overlap, 0 under 0.1 m, 0 facing fails). missions-check 0 FAIL.
