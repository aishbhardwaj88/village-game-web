# House moves 2, 25 Nov (review rules tmp/review_rules.txt, new facing definition, BUILT mesh extent)

Scope: the 455 houses only (src/kit/housesMoves.json, housesPlanData.json, housesCheck.js, tools/map-match-houses.mjs). Own audit: `tmp/audit/audit5_houses.py` (+ `ext5.mjs` built-mesh extents, `props5.mjs`/`props5_check.py` doorstep props); solver `tmp/houses/h2_solve.py`, `h2_obs.py`, `h2_113.py`, `h2_apply.py`.

## Result

- Before (new definition, built mesh extent, 0.1 m clear, round AND flat band ends): 455 houses, 55 fail rule 1 (0.01 to 0.1 m short; 5 touching a band; the old pass cleared the nominal footprint only, the mesh sticks out 0.035 m plinth, 0.11 m on design F fronts, up to 0.3 m on mud design G thatch), 1 fails facing (#113), 115 pairs touch by their built extent (plinth on plinth, 4 truly overlapping drawn pairs), 1 house (#7) drawn on a shop.
- After: **455 of 455 PASS**: 0 within 0.1 m of any band (also vs round caps, the game's own index and the nominal footprint), 0 house-on-house overlaps (built extent), faces its fronted road per the new definition, no house moved more than 3.58 m from its map spot (limit 5 m).
- `node tools/map-match-houses.mjs`: exit 0. `node src/kit/housesCheck.js`: onRoad 0, houseOverlap 0, notParallel 0, noRoad 0 (solid overlaps 17 -> 16, none new). `node tools/missions-check.mjs`: 0 FAIL. `npm run build:unchecked`: ok.
- Not fixable under 5 m, left for the places agent: #430 sits inside the haveli site box (26 m2), #447 sits on the pond (2.5 m2, open ground). Both are drawn that way on the map.

## The 16 houses the strict audit flagged

Facing is now measured by her definition: road fronted = band nearest the front-face centre (m_front); PASS if within 15 m, m_front not farther from the nearest band than m_back (+0.5 m), walls square to that road at the nearest point (<= 5 deg mod 90; 10 on ring_road / inner_loop / chauraha_ring).

| House | Strict audit said | Nearest band to m_front | m_front / m_back to nearest band | Skew deg | Decision |
|---|---|---|---|---|---|
| #76 | 14_Outer lane, south, 56 deg off | 13_Outer lane, east (tractor route) | 0.69 / 7.63 | 0.0 | faces correctly, left |
| #113 | cross_road, 0 deg off | cross_road | 1.44 / 9.30 | 0.0 | FAILED (corner plot: front pointed at nothing, 6.1 m vs 4.1 m back). Turned 108.4 deg so its front faces cross_road, walls square to it; row road ring_road -> cross_road |
| #129 | gali_n1, 19 deg off | gali_n1 | 2.47 / 4.87 | 0.3 | faces correctly, left |
| #165 | gali_n3, 41 deg off | gali_n3 | 3.17 / 9.84 | 0.0 | faces correctly (front along the end of gali_n3), left; row road label gali_n7 -> gali_n3 |
| #183 | gali_n4, 9 deg off | gali_n4 | 2.81 / 10.82 | 0.0 | faces correctly, left; label gali_n7 -> gali_n4 |
| #187 | gali_n4, 95 deg off | 13_Outer lane, east (tractor route) | 1.16 / 4.62 | 0.0 | faces correctly, left |
| #197 | gali_n6, 30 deg off | gali_n6 | 2.39 / 8.59 | 0.0 | faces correctly, left; label gali_n4 -> gali_n6 |
| #221 | gali_n10, 6 deg off | gali_n10 | 1.05 / 7.31 | 0.0 | faces correctly, left |
| #254 | cross_road, 100 deg off | 15_Outer lane, west | 0.96 / 3.59 | 0.0 | faces correctly, left |
| #341 | 15_edge_lane_sw, 1 deg off | 15_edge_lane_sw | 0.20 / 3.78 | 1.2 | faces correctly; 0.09 m clearance (built extent) fixed by a 0.6 m move + 0.1 trim |
| #357 | gali_n30, 46 deg off | gali_n30 | 4.58 / 6.89 | 0.0 | faces correctly, left |
| #372 | gali_n30, 8 deg off | gali_n30 | 1.23 / 7.31 | 0.0 | faces correctly, left |
| #398 | gali_n30, 50 deg off | gali_n30 | 4.91 / 6.87 | 0.0 | faces correctly, left |
| #400 | gali_n31, 116 deg off | 13_Outer lane, east (tractor route) | 0.98 / 3.09 | 0.0 | faces correctly; 0.07 m clearance fixed by a small move |
| #430 | gali_n39, 14 deg off | gali_n39 | 1.61 / 5.70 | 0.0 | faces correctly, left (its overlap with the haveli box is a places item) |
| #439 | ring_road, 34 deg off | ring_road | 1.93 / 7.09 | 0.0 | faces correctly, left |

## Doorstep props (khaat, tulsi, matka, bucket, cylinder, bicycle, door planters, street furniture)

- Re-ran the game's own placement (`clutterFor` + `filterClutter`, `plantSitesFor`, `furnitureSitesFor`, road index of the approved map) for the new plan and checked every surviving prop outline in shapely against the round-capped bands: 392 doorstep props, 120 planters, 2 street-furniture pieces; **0 on a road**, nearest one 0.59 m clear (khaat >= 2.3 m, planters >= 0.65 m, furniture >= 1.35 m). The existing filter drops any prop that would come nearer than 1.2 m (khaat), 1.0 m (planters, furniture) or 0.6 m (rest): 127 doorstep props, the rest of the planters and nearly all street furniture are dropped for that reason, as before. No prop was added or moved by hand.

## Method

- Footprint = union of the nominal rectangle and the BUILT mesh extent (per design/size, from `buildHouse` bounding box, scaled like the game scales it). Clearance >= 0.115 target vs round-capped bands (superset of her flat-cap rule).
- Per house, smallest move (translation first, then width/depth trims of 0.1 m steps, turns of 1 deg) that clears roads, neighbours' built extents (gap >= 0.004 m) and, for the 8 houses that touched a shop or place, those too; coordinate descent over the violating houses until none left. #113 turned by hand-picked 90 deg step then searched. #7 and #358 solved as a pair.
- `src/kit/housesCheck.js`: moved houses get their probe gap/road direction re-measured, and the parallel check is mod 90 (her rule). `tools/map-match-houses.mjs`: facing check replaced by her definition, plus the row road label must equal the fronted road.

## Every change since the first houses pass (156 houses; old = state after docs/layout/MOVE_LOG_HOUSES_25NOV.md)

| House | Old spot (x, z) | New spot (x, z) | Metres | From map spot | New facing deg | Changed | Front road |
|---|---|---|---|---|---|---|---|
| #0 | 448.25, -57.18 | 448.25, -57.23 | 0.05 | 0.02 | 180.0 | moved, trim 0.40 m | gali_n12 |
| #2 | 492.72, -40.12 | 492.76, -40.17 | 0.06 | 0.08 | 180.0 | moved, trim 0.10 m | gali_n14 |
| #3 | 435.47, 25.30 | 435.38, 25.30 | 0.09 | 0.09 | 272.0 | moved | 15_edge_lane_sw |
| #4 | 445.33, 79.49 | 445.38, 79.49 | 0.05 | 0.01 | 92.0 | moved, trim 0.10 m | gali_n21 |
| #5 | 455.81, 31.13 | 455.76, 31.09 | 0.07 | 0.07 | 272.0 | moved, trim 0.10 m | gali_n21 |
| #6 | 477.89, 89.80 | 477.84, 89.72 | 0.10 | 0.14 | 272.0 | moved, trim 0.10 m | gali_n22 |
| #7 | 790.92, 43.67 | 790.98, 43.47 | 0.21 | 0.27 | 268.4 | moved, turned 1.0 deg | gali_n27 |
| #8 | 780.24, 42.17 | 780.25, 42.04 | 0.13 | 0.20 | 87.4 | moved | gali_n27 |
| #9 | 756.46, 51.62 | 756.41, 51.63 | 0.05 | 0.01 | 267.4 | moved, trim 0.10 m | gali_n29 |
| #10 | 744.52, 79.08 | 744.57, 79.11 | 0.06 | 0.07 | 87.4 | moved, trim 0.10 m | gali_n29 |
| #12 | 539.64, -37.88 | 539.68, -37.93 | 0.06 | 0.08 | 180.0 | moved, trim 0.10 m | gali_n35 |
| #14 | 646.95, -15.51 | 646.90, -15.56 | 0.08 | 0.08 | 265.3 | moved, trim 0.10 m | gali_n38 |
| #37 | 670.25, -84.25 | 670.07, -83.70 | 0.58 | 0.58 | 352.2 | moved, trim 0.60 m | 12_Outer lane, north |
| #39 | 665.80, -16.40 | 665.75, -16.20 | 0.21 | 0.21 | 85.4 | moved | ring_road |
| #48 | 697.38, 48.40 | 697.38, 50.20 | 1.80 | 1.80 | 265.4 | moved | 13_Outer lane, east (tractor route) |
| #76 | 686.73, 73.78 | 686.83, 73.76 | 0.10 | 0.93 | 135.7 | moved | 13_Outer lane, east (tractor route) |
| #88 | 698.54, -73.07 | 698.67, -73.35 | 0.31 | 0.54 | 89.2 | moved | 13_Outer lane, east (tractor route) |
| #89 | 695.98, -64.58 | 695.84, -64.62 | 0.15 | 0.61 | 66.4 | moved, trim 0.10 m | 13_Outer lane, east (tractor route) |
| #107 | 575.50, 125.78 | 575.50, 126.22 | 0.45 | 0.45 | 72.8 | moved | main_road |
| #113 | 501.41, -6.67 | 500.68, -6.92 | 0.77 | 0.81 | 348.6 | moved, turned 108.4 deg, front/depth swapped, front road label ring_road -> cross_road | cross_road |
| #115 | 753.83, -84.27 | 753.84, -84.32 | 0.05 | 0.18 | 175.5 | moved, trim 0.10 m | gali_n0 |
| #116 | 760.85, -83.55 | 760.87, -83.60 | 0.05 | 0.18 | 173.9 | moved, trim 0.10 m | gali_n0 |
| #117 | 769.38, -82.45 | 769.37, -82.48 | 0.03 | 0.03 | 173.9 | moved, trim 0.10 m | gali_n0 |
| #118 | 776.02, -81.85 | 776.05, -81.92 | 0.08 | 0.08 | 173.9 | moved | gali_n0 |
| #120 | 791.65, -80.70 | 791.67, -80.72 | 0.03 | 0.17 | 84.3 | moved, trim 0.10 m | gali_n7 |
| #121 | 720.52, -79.80 | 720.40, -79.82 | 0.12 | 0.12 | 354.7 | moved | gali_n1 |
| #125 | 752.62, -76.49 | 752.57, -76.53 | 0.06 | 0.13 | 265.0 | moved | gali_n6 |
| #126 | 759.76, -75.75 | 759.74, -75.80 | 0.05 | 0.12 | 354.7 | moved, trim 0.10 m | gali_n1 |
| #130 | 790.75, -72.85 | 790.76, -72.88 | 0.03 | 0.30 | 85.7 | moved | gali_n7 |
| #131 | 721.92, -67.03 | 721.92, -67.09 | 0.07 | 0.07 | 174.7 | moved | gali_n1 |
| #132 | 729.65, -66.30 | 729.64, -66.31 | 0.01 | 0.01 | 174.7 | moved, trim 0.10 m | gali_n1 |
| #133 | 737.80, -65.50 | 737.79, -65.53 | 0.03 | 0.03 | 174.6 | moved, trim 0.10 m | gali_n1 |
| #134 | 751.50, -64.31 | 751.50, -64.33 | 0.02 | 0.07 | 264.1 | moved, trim 0.10 m | gali_n6 |
| #136 | 766.38, -62.60 | 766.39, -62.66 | 0.06 | 0.06 | 174.7 | moved | gali_n1 |
| #137 | 773.60, -62.16 | 773.59, -62.19 | 0.03 | 0.01 | 174.8 | moved, trim 0.10 m | gali_n1 |
| #139 | 789.62, -60.62 | 789.62, -60.62 | 0.01 | 0.01 | 84.9 | moved | gali_n7 |
| #143 | 750.69, -56.47 | 750.69, -56.45 | 0.02 | 0.15 | 265.0 | moved, trim 0.10 m | gali_n6 |
| #148 | 713.62, -47.70 | 713.62, -47.70 | 0.01 | 0.01 | 174.6 | moved, trim 0.20 m | gali_n2 |
| #149 | 721.62, -46.85 | 721.65, -46.93 | 0.09 | 0.09 | 173.9 | moved | gali_n2 |
| #150 | 729.42, -46.15 | 729.42, -46.18 | 0.03 | 0.03 | 173.9 | moved, trim 0.10 m | gali_n2 |
| #151 | 737.62, -45.46 | 737.61, -45.46 | 0.01 | 0.04 | 174.6 | moved, trim 0.20 m | gali_n2 |
| #152 | 749.60, -44.30 | 749.64, -44.32 | 0.04 | 0.04 | 264.3 | moved, trim 0.10 m | gali_n6 |
| #153 | 757.27, -43.55 | 757.26, -43.55 | 0.01 | 0.01 | 173.9 | moved, trim 0.20 m | gali_n2 |
| #154 | 765.77, -42.55 | 765.62, -42.62 | 0.17 | 0.17 | 173.9 | moved | gali_n2 |
| #155 | 772.42, -42.05 | 772.43, -42.05 | 0.01 | 0.01 | 173.9 | moved | gali_n2 |
| #156 | 780.50, -41.47 | 780.52, -41.52 | 0.05 | 0.18 | 174.6 | moved, trim 0.10 m | gali_n2 |
| #157 | 787.83, -40.79 | 787.77, -40.83 | 0.07 | 0.26 | 84.9 | moved, trim 0.10 m | gali_n7 |
| #162 | 748.82, -36.48 | 748.80, -36.46 | 0.03 | 0.19 | 264.3 | moved, trim 0.10 m | gali_n6 |
| #165 | 804.00, -29.98 | 804.01, -30.05 | 0.07 | 0.34 | 264.6 | moved, front road label gali_n7 -> gali_n3 | gali_n3 |
| #169 | 719.58, -27.05 | 719.57, -27.08 | 0.03 | 0.03 | 173.9 | moved, trim 0.10 m | gali_n3 |
| #170 | 727.83, -26.25 | 727.82, -26.28 | 0.03 | 0.03 | 173.9 | moved, trim 0.10 m | gali_n3 |
| #171 | 735.60, -25.52 | 735.60, -25.59 | 0.06 | 0.06 | 174.6 | moved | gali_n3 |
| #172 | 747.73, -24.44 | 747.73, -24.54 | 0.10 | 0.03 | 264.2 | moved, trim 0.40 m | gali_n6 |
| #173 | 755.20, -23.68 | 755.20, -23.72 | 0.04 | 0.02 | 174.6 | moved, trim 0.10 m | gali_n3 |
| #175 | 770.63, -22.31 | 770.65, -22.36 | 0.05 | 0.14 | 174.7 | moved, trim 0.10 m | gali_n3 |
| #176 | 778.96, -21.62 | 779.00, -21.62 | 0.04 | 0.21 | 174.6 | moved, trim 0.20 m | gali_n3 |
| #177 | 785.96, -20.72 | 785.96, -20.74 | 0.02 | 0.05 | 84.2 | moved, trim 0.10 m | gali_n7 |
| #178 | 718.87, -19.24 | 718.86, -19.29 | 0.05 | 0.27 | 353.9 | moved, trim 0.10 m | gali_n4 |
| #181 | 746.89, -16.60 | 746.89, -16.65 | 0.05 | 0.20 | 264.9 | moved, trim 0.40 m | gali_n6 |
| #183 | 804.10, -6.22 | 804.10, -6.22 | 0.00 | 0.00 | 264.6 | front road label gali_n7 -> gali_n4 | gali_n4 |
| #192 | 754.23, -2.90 | 754.10, -2.90 | 0.13 | 0.13 | 174.6 | moved | gali_n4 |
| #193 | 762.07, -2.96 | 762.07, -2.99 | 0.03 | 0.01 | 174.7 | moved, trim 0.10 m | gali_n4 |
| #194 | 769.24, -2.27 | 769.18, -2.27 | 0.06 | 0.07 | 174.7 | moved, trim 0.20 m | gali_n4 |
| #195 | 776.77, -1.23 | 776.77, -1.29 | 0.07 | 0.07 | 174.6 | moved | gali_n4 |
| #196 | 783.98, -0.90 | 783.96, -0.92 | 0.03 | 0.03 | 84.2 | moved, trim 0.10 m | gali_n7 |
| #197 | 742.25, 5.58 | 742.24, 5.58 | 0.01 | 0.01 | 174.6 | moved, front road label gali_n4 -> gali_n6 | gali_n6 |
| #199 | 759.97, 4.74 | 759.97, 4.69 | 0.05 | 0.21 | 354.7 | moved, trim 0.10 m | gali_n5 |
| #202 | 783.11, 6.91 | 783.15, 6.95 | 0.06 | 0.09 | 84.2 | moved, trim 0.10 m | gali_n7 |
| #206 | 580.85, -114.35 | 580.95, -114.35 | 0.10 | 0.10 | 180.0 | moved | highway |
| #222 | 434.84, -91.07 | 434.85, -91.10 | 0.03 | 0.00 | 180.0 | moved, trim 0.10 m | gali_n9 |
| #223 | 441.30, -90.95 | 441.30, -91.01 | 0.06 | 0.06 | 180.0 | moved | gali_n9 |
| #224 | 447.85, -90.95 | 447.85, -91.01 | 0.06 | 0.06 | 180.0 | moved | gali_n9 |
| #225 | 453.80, -90.85 | 453.80, -90.93 | 0.08 | 0.08 | 180.0 | moved | gali_n9 |
| #226 | 459.85, -90.85 | 459.85, -90.93 | 0.08 | 0.08 | 180.0 | moved | gali_n9 |
| #227 | 465.56, -91.04 | 465.63, -91.14 | 0.12 | 0.82 | 90.0 | moved | gali_n17 |
| #228 | 508.12, -91.07 | 508.12, -91.09 | 0.02 | 0.33 | 90.0 | moved, trim 0.10 m | gali_n19 |
| #239 | 465.46, -84.72 | 465.62, -84.75 | 0.16 | 0.85 | 90.0 | moved | gali_n17 |
| #245 | 508.06, -84.68 | 508.02, -84.70 | 0.04 | 0.34 | 90.0 | moved | gali_n19 |
| #247 | 444.64, -74.07 | 444.64, -74.10 | 0.03 | 0.01 | 180.0 | moved, trim 0.10 m | gali_n11 |
| #248 | 465.62, -74.12 | 465.63, -74.09 | 0.03 | 0.35 | 90.0 | moved, trim 0.40 m | gali_n17 |
| #249 | 476.99, -74.07 | 476.99, -74.10 | 0.03 | 0.01 | 180.0 | moved, trim 0.10 m | gali_n11 |
| #250 | 483.94, -74.07 | 483.94, -74.10 | 0.03 | 0.01 | 180.0 | moved, trim 0.10 m | gali_n11 |
| #251 | 491.04, -74.07 | 491.04, -74.10 | 0.03 | 0.01 | 180.0 | moved, trim 0.10 m | gali_n11 |
| #252 | 497.99, -74.07 | 498.00, -74.10 | 0.03 | 0.00 | 180.0 | moved, trim 0.10 m | gali_n11 |
| #256 | 465.60, -67.75 | 465.50, -67.65 | 0.14 | 0.46 | 90.0 | moved, trim 0.20 m | gali_n17 |
| #257 | 477.00, -67.69 | 477.00, -67.74 | 0.05 | 0.29 | 0.0 | moved, trim 0.10 m | gali_n12 |
| #261 | 454.95, -57.33 | 454.95, -57.40 | 0.07 | 0.15 | 180.0 | moved, trim 0.10 m | gali_n12 |
| #263 | 489.74, -57.12 | 489.74, -57.18 | 0.06 | 0.03 | 180.0 | moved, trim 0.20 m | gali_n12 |
| #264 | 496.55, -56.90 | 496.55, -57.07 | 0.17 | 0.17 | 180.0 | moved | gali_n12 |
| #272 | 443.44, -40.07 | 443.44, -40.10 | 0.03 | 0.01 | 180.0 | moved, trim 0.10 m | gali_n13 |
| #273 | 450.24, -40.07 | 450.24, -40.07 | 0.00 | 0.03 | 180.0 | trim 0.20 m | gali_n13 |
| #276 | 506.64, -40.07 | 506.64, -40.10 | 0.03 | 0.01 | 180.0 | moved, trim 0.10 m | gali_n14 |
| #291 | 437.55, 87.32 | 437.51, 87.28 | 0.06 | 0.01 | 271.8 | moved, trim 0.20 m | 15_edge_lane_sw |
| #292 | 437.35, 80.60 | 437.32, 80.60 | 0.03 | 0.03 | 272.6 | moved, trim 0.10 m | 15_edge_lane_sw |
| #293 | 437.15, 73.60 | 437.14, 73.60 | 0.01 | 0.01 | 272.6 | moved, trim 0.10 m | 15_edge_lane_sw |
| #294 | 436.81, 66.37 | 436.78, 66.35 | 0.04 | 0.00 | 271.8 | moved, trim 0.10 m | 15_edge_lane_sw |
| #295 | 436.55, 59.38 | 436.50, 59.36 | 0.05 | 0.27 | 182.1 | moved, trim 0.10 m | gali_n24 |
| #296 | 436.20, 48.35 | 436.33, 47.98 | 0.39 | 0.39 | 1.4 | moved, trim 0.20 m | gali_n24 |
| #297 | 435.95, 40.90 | 435.92, 40.90 | 0.03 | 0.03 | 272.6 | moved, trim 0.10 m | 15_edge_lane_sw |
| #298 | 435.65, 32.30 | 435.60, 32.30 | 0.05 | 0.05 | 272.6 | moved, trim 0.10 m | 15_edge_lane_sw |
| #299 | 435.20, 17.11 | 435.15, 17.13 | 0.05 | 0.35 | 271.8 | moved | 15_edge_lane_sw |
| #300 | 434.82, 10.32 | 434.77, 10.32 | 0.05 | 0.03 | 182.1 | moved, trim 0.20 m | gali_n25 |
| #303 | 444.78, 65.70 | 444.79, 65.74 | 0.04 | 0.34 | 91.8 | moved | gali_n21 |
| #304 | 444.53, 59.14 | 444.50, 59.13 | 0.03 | 0.73 | 182.1 | moved | gali_n24 |
| #305 | 444.16, 48.06 | 444.31, 48.06 | 0.15 | 0.04 | 1.4 | moved, trim 0.40 m | gali_n24 |
| #310 | 442.80, 9.90 | 442.78, 9.90 | 0.02 | 0.12 | 182.1 | moved | gali_n25 |
| #311 | 458.16, 97.37 | 458.16, 97.37 | 0.00 | 0.24 | 2.1 | trim 0.10 m | 15_edge_lane_sw |
| #312 | 458.00, 90.40 | 457.94, 90.40 | 0.06 | 0.06 | 271.8 | moved | gali_n21 |
| #313 | 457.95, 82.53 | 457.95, 82.61 | 0.09 | 0.09 | 272.7 | moved | gali_n21 |
| #315 | 457.15, 67.47 | 457.12, 67.47 | 0.03 | 0.03 | 272.6 | moved, trim 0.10 m | gali_n21 |
| #316 | 456.86, 59.79 | 456.84, 59.77 | 0.03 | 0.01 | 272.6 | moved, trim 0.10 m | gali_n21 |
| #317 | 456.45, 47.05 | 456.42, 47.05 | 0.03 | 0.03 | 272.7 | moved, trim 0.10 m | gali_n21 |
| #318 | 456.15, 39.20 | 456.12, 39.20 | 0.03 | 0.03 | 272.6 | moved, trim 0.10 m | gali_n21 |
| #319 | 455.60, 23.25 | 455.60, 23.25 | 0.00 | 0.00 | 271.8 | trim 0.20 m | gali_n21 |
| #320 | 455.35, 15.10 | 455.27, 15.10 | 0.08 | 0.08 | 272.6 | moved | gali_n21 |
| #321 | 466.10, 97.14 | 466.09, 97.19 | 0.05 | 0.55 | 2.1 | moved, trim 0.20 m | 15_edge_lane_sw |
| #329 | 463.67, 30.61 | 463.62, 30.61 | 0.05 | 0.28 | 91.8 | moved, trim 0.10 m | gali_n22 |
| #331 | 463.18, 14.81 | 463.13, 14.81 | 0.05 | 0.27 | 91.8 | moved, trim 0.10 m | gali_n22 |
| #332 | 478.45, 96.39 | 478.33, 96.34 | 0.13 | 1.02 | 2.9 | moved, trim 0.10 m | 15_edge_lane_sw |
| #333 | 477.64, 83.00 | 477.61, 83.00 | 0.03 | 0.01 | 271.8 | moved, trim 0.10 m | gali_n22 |
| #334 | 477.23, 74.89 | 477.18, 74.89 | 0.05 | 0.13 | 272.7 | moved, trim 0.10 m | gali_n22 |
| #335 | 477.15, 67.10 | 477.12, 67.10 | 0.03 | 0.03 | 272.7 | moved, trim 0.10 m | gali_n22 |
| #336 | 476.90, 58.85 | 476.84, 58.85 | 0.06 | 0.06 | 271.8 | moved | gali_n22 |
| #337 | 476.48, 46.85 | 476.40, 46.85 | 0.07 | 0.07 | 1.5 | moved | gali_n24 |
| #338 | 476.90, 38.67 | 476.83, 38.67 | 0.07 | 0.07 | 271.8 | moved | gali_n22 |
| #339 | 476.60, 31.57 | 476.35, 31.57 | 0.25 | 0.25 | 271.8 | moved | gali_n22 |
| #341 | 486.15, 95.48 | 486.19, 96.08 | 0.60 | 0.68 | 1.4 | moved, trim 0.10 m | 15_edge_lane_sw |
| #342 | 485.73, 88.71 | 485.68, 88.69 | 0.05 | 0.37 | 92.6 | moved, trim 0.10 m | gali_n23 |
| #347 | 484.30, 46.61 | 484.32, 46.61 | 0.02 | 0.18 | 2.1 | moved, trim 0.10 m | gali_n24 |
| #349 | 499.01, 95.49 | 498.96, 95.49 | 0.06 | 0.49 | 2.9 | moved, trim 0.20 m | 15_edge_lane_sw |
| #358 | 791.45, 48.70 | 791.35, 49.30 | 0.61 | 0.61 | 267.9 | moved | gali_n27 |
| #367 | 779.32, 61.45 | 779.42, 61.50 | 0.11 | 0.16 | 358.1 | moved, turned 1.0 deg, trim 0.20 m | gali_n33 |
| #369 | 778.48, 79.97 | 778.53, 79.99 | 0.05 | 0.01 | 87.9 | moved, trim 0.10 m | gali_n27 |
| #370 | 778.21, 86.87 | 778.26, 86.91 | 0.06 | 0.07 | 86.9 | moved, trim 0.10 m | gali_n27 |
| #371 | 778.00, 93.74 | 778.00, 93.74 | 0.00 | 0.15 | 87.9 | trim 0.20 m | gali_n27 |
| #373 | 773.00, 61.15 | 773.04, 61.21 | 0.07 | 0.41 | 357.2 | moved, turned 1.0 deg, trim 0.20 m | gali_n33 |
| #375 | 772.09, 80.71 | 772.14, 80.69 | 0.05 | 0.29 | 267.9 | moved, trim 0.10 m | gali_n28 |
| #379 | 762.15, 59.75 | 762.22, 59.75 | 0.07 | 0.07 | 87.9 | moved | gali_n28 |
| #380 | 761.80, 72.50 | 761.79, 72.50 | 0.01 | 0.01 | 86.9 | moved, trim 0.10 m | gali_n28 |
| #381 | 761.45, 79.35 | 761.48, 79.35 | 0.03 | 0.03 | 87.9 | moved, trim 0.10 m | gali_n28 |
| #382 | 761.10, 86.50 | 761.16, 86.50 | 0.06 | 0.06 | 86.9 | moved | gali_n28 |
| #385 | 755.46, 72.21 | 755.49, 72.26 | 0.05 | 0.32 | 266.9 | moved, trim 0.10 m | gali_n29 |
| #389 | 745.77, 50.67 | 745.77, 50.71 | 0.05 | 0.03 | 86.9 | moved, trim 0.20 m | gali_n29 |
| #390 | 745.45, 57.77 | 745.46, 57.79 | 0.02 | 0.02 | 87.9 | moved, trim 0.10 m | gali_n29 |
| #391 | 744.75, 72.08 | 744.78, 72.07 | 0.03 | 0.03 | 88.0 | moved, trim 0.10 m | gali_n29 |
| #395 | 739.09, 57.44 | 739.12, 57.54 | 0.11 | 0.34 | 266.8 | moved, trim 0.10 m | gali_n30 |
| #396 | 738.41, 71.81 | 738.46, 71.79 | 0.05 | 0.26 | 266.9 | moved, trim 0.10 m | gali_n30 |
| #399 | 728.54, 55.56 | 728.55, 55.57 | 0.02 | 0.01 | 87.9 | moved, trim 0.10 m | gali_n30 |
| #400 | 725.52, 103.22 | 725.47, 103.25 | 0.06 | 0.18 | 331.5 | moved | 13_Outer lane, east (tractor route) |
| #410 | 546.63, -37.83 | 546.65, -37.88 | 0.05 | 0.02 | 180.0 | moved, trim 0.10 m | gali_n35 |
| #413 | 541.43, -20.83 | 541.45, -20.89 | 0.06 | 0.01 | 180.0 | moved, trim 0.10 m | gali_n36 |
| #414 | 548.43, -20.83 | 548.43, -20.83 | 0.00 | 0.07 | 180.0 | trim 0.20 m | gali_n36 |
| #422 | 648.73, -51.80 | 645.23, -52.55 | 3.58 | 3.58 | 172.9 | moved | ring_road |
| #425 | 646.42, -8.65 | 646.48, -9.18 | 0.53 | 0.53 | 265.8 | moved, trim 0.30 m | gali_n38 |
| #433 | 584.15, -17.85 | 584.15, -18.15 | 0.30 | 0.30 | 180.0 | moved | gali_n40 |
| #451 | 497.10, 66.85 | 497.10, 66.95 | 0.10 | 0.10 | 272.1 | moved | gali_n23 |
