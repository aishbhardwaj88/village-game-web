# House moves for her road rules, 25 Nov

Her rules (tmp/move_rules.txt): 1) no building footprint on a road band (clear by >= 0.1 m; band = approved-map road polyline buffered width/2, flat caps), 2) front faces the road it fronts, walls square to it.
Made by tmp/houses/solve*.py (shapely), stored in `src/kit/housesMoves.json` (re-applied by `node src/kit/housesCheck.js --write-plan`), proved by `node tools/map-match-houses.mjs` (road rule + facing rule + log honesty).

## Result

- Before: 123 of 455 houses touched a band (audit: 118 over 0.005 m2), 25 faced >2 deg off the road they front (12 were >5 deg, #400 26.8), 47 more sat within 0.1 m.
- After: 0 within 0.1 m of any band (smallest gap 0.12 m, also vs round caps and the game's drawn rounded roads), 0 faced >2 deg off (worst 1.99), 0 new house-on-house or house-on-shop overlaps (drawn overlapping pairs 6 -> 4, not worsened).
- Order used: (1) move the single house the smallest distance (up to 5 m, any direction incl. sliding along the road); (2) push it and the house it hits together, same direction; (3) only where a back-to-back pair is wedged between two roads and no move can fit it: pull the road-side wall in (trim) by the smallest amount, 0.05 to 1.1 m. Trims are marked `trim` below. Nothing was left unmoved.

## Every change (house number = row in the approved map order)

| House | Old spot (x, z) | New spot (x, z) | Metres | New facing deg | Changed | Front road |
|---|---|---|---|---|---|---|
| #0 | 448.25, -57.25 | 448.25, -57.18 | 0.07 | 180.0 | moved, trim w 0.00 d 0.14 | gali_n12 |
| #1 | 443.75, -50.75 | 442.75, -50.88 | 1.01 | 0.0 | moved | gali_n13 |
| #2 | 492.75, -40.25 | 492.72, -40.12 | 0.13 | 180.0 | moved | gali_n14 |
| #4 | 445.39, 79.49 | 445.33, 79.49 | 0.06 | 92.0 | moved, trim w 0.00 d 0.12 | gali_n21 |
| #5 | 455.69, 31.09 | 455.81, 31.13 | 0.13 | 272.0 | moved | gali_n21 |
| #6 | 477.78, 89.85 | 477.89, 89.80 | 0.12 | 272.0 | moved | gali_n22 |
| #7 | 790.79, 43.68 | 790.92, 43.67 | 0.13 | 267.4 | moved | gali_n27 |
| #8 | 780.35, 42.20 | 780.24, 42.17 | 0.12 | 87.4 | moved | gali_n27 |
| #9 | 756.40, 51.62 | 756.46, 51.62 | 0.06 | 267.4 | moved, trim w 0.00 d 0.12 | gali_n29 |
| #10 | 744.64, 79.12 | 744.52, 79.08 | 0.13 | 87.4 | moved | gali_n29 |
| #11 | 739.71, 44.36 | 739.83, 44.41 | 0.13 | 267.4 | moved | gali_n30 |
| #12 | 539.67, -38.01 | 539.64, -37.88 | 0.13 | 180.0 | moved | gali_n35 |
| #14 | 646.83, -15.56 | 646.95, -15.51 | 0.14 | 265.3 | moved | gali_n38 |
| #18 | 619.58, -24.98 | 619.58, -24.98 | 0.00 | 87.8 | turned 3.5 deg | inner_loop |
| #29 | 561.30, -78.20 | 561.35, -78.19 | 0.05 | 270.0 | moved, turned 7.2 deg | gali_n20 |
| #75 | 510.35, 94.33 | 510.35, 94.33 | 0.00 | 2.7 | turned 3.8 deg | 15_edge_lane_sw |
| #76 | 686.42, 72.92 | 686.73, 73.78 | 0.91 | 135.7 | moved, turned 35.6 deg | 13_Outer lane, east (tractor route) |
| #88 | 698.92, -72.88 | 698.54, -73.07 | 0.43 | 89.2 | moved | 13_Outer lane, east (tractor route) |
| #89 | 695.58, -64.08 | 695.98, -64.58 | 0.65 | 66.4 | moved, turned 90.7 deg, front/depth swapped (same footprint) | 13_Outer lane, east (tractor route) |
| #95 | 700.75, 88.38 | 700.75, 88.39 | 0.02 | 117.3 | moved | 13_Outer lane, east (tractor route) |
| #99 | 746.45, 121.05 | 746.64, 121.10 | 0.20 | 257.1 | moved, turned 10.0 deg | track_baagh |
| #105 | 795.90, 120.85 | 795.90, 120.85 | 0.00 | 267.8 | turned 2.9 deg | track_mela |
| #112 | 462.38, 3.20 | 462.38, 3.20 | 0.00 | 92.0 | turned 9.2 deg | gali_n22 |
| #113 | 501.25, -6.35 | 501.41, -6.67 | 0.36 | 97.0 | moved, turned 18.6 deg | ring_road |
| #115 | 753.85, -84.50 | 753.83, -84.27 | 0.23 | 175.5 | moved, trim w 0.00 d 0.34 | gali_n0 |
| #116 | 760.88, -83.78 | 760.85, -83.55 | 0.23 | 173.9 | moved, trim w 0.00 d 0.30 | gali_n0 |
| #120 | 791.77, -80.85 | 791.65, -80.70 | 0.20 | 84.3 | moved, trim w 0.40 d 0.00 | gali_n7 |
| #124 | 741.75, -78.25 | 741.66, -78.27 | 0.09 | 84.2 | moved | gali_n6 |
| #125 | 752.58, -76.40 | 752.62, -76.49 | 0.10 | 265.0 | moved | gali_n6 |
| #126 | 759.75, -75.67 | 759.76, -75.75 | 0.07 | 354.7 | moved, trim w 0.00 d 0.14 | gali_n1 |
| #127 | 768.23, -74.35 | 766.87, -74.85 | 1.45 | 354.7 | moved, trim w 0.00 d 0.45 | gali_n1 |
| #128 | 775.27, -73.85 | 775.29, -74.06 | 0.21 | 354.6 | moved, trim w 0.00 d 0.42 | gali_n1 |
| #130 | 791.05, -72.80 | 790.75, -72.85 | 0.30 | 85.7 | moved, trim w 0.10 d 0.00 | gali_n7 |
| #134 | 751.52, -64.40 | 751.50, -64.31 | 0.09 | 264.1 | moved | gali_n6 |
| #137 | 773.60, -62.20 | 773.60, -62.16 | 0.04 | 174.8 | moved, trim w 0.00 d 0.08 | gali_n1 |
| #138 | 782.33, -61.50 | 782.28, -61.31 | 0.19 | 174.6 | moved | gali_n1 |
| #140 | 721.00, -58.95 | 721.03, -59.24 | 0.29 | 354.6 | moved, trim w 0.00 d 0.22 | gali_n2 |
| #141 | 728.90, -58.25 | 728.92, -58.45 | 0.20 | 353.9 | moved, trim w 0.00 d 0.32 | gali_n2 |
| #142 | 736.98, -57.50 | 736.99, -57.69 | 0.19 | 354.6 | moved, trim w 0.00 d 0.38 | gali_n2 |
| #143 | 750.67, -56.30 | 750.69, -56.47 | 0.17 | 265.0 | moved, trim w 0.22 d 0.00 | gali_n6 |
| #144 | 766.48, -54.35 | 766.52, -54.79 | 0.44 | 354.7 | moved, trim w 0.00 d 0.48 | gali_n2 |
| #145 | 773.12, -54.17 | 773.14, -54.29 | 0.12 | 354.6 | moved, trim w 0.00 d 0.16 | gali_n2 |
| #151 | 737.62, -45.50 | 737.62, -45.46 | 0.04 | 174.6 | moved | gali_n2 |
| #156 | 780.52, -41.70 | 780.50, -41.47 | 0.23 | 174.6 | moved, trim w 0.00 d 0.18 | gali_n2 |
| #157 | 788.02, -40.83 | 787.83, -40.79 | 0.20 | 84.9 | moved, trim w 0.20 d 0.00 | gali_n7 |
| #158 | 712.85, -39.67 | 712.87, -39.88 | 0.21 | 354.7 | moved, trim w 0.00 d 0.38 | gali_n3 |
| #159 | 720.92, -38.85 | 720.95, -39.06 | 0.21 | 354.7 | moved, trim w 0.00 d 0.42 | gali_n3 |
| #160 | 728.70, -38.12 | 728.72, -38.36 | 0.24 | 353.9 | moved, trim w 0.00 d 0.36 | gali_n3 |
| #161 | 736.88, -37.40 | 736.90, -37.63 | 0.23 | 354.6 | moved, trim w 0.00 d 0.34 | gali_n3 |
| #162 | 748.80, -36.27 | 748.82, -36.48 | 0.21 | 264.3 | moved, trim w 0.38 d 0.00 | gali_n6 |
| #163 | 756.55, -35.55 | 756.57, -35.71 | 0.16 | 354.7 | moved, trim w 0.00 d 0.32 | gali_n3 |
| #164 | 764.83, -34.60 | 764.85, -34.82 | 0.22 | 354.7 | moved, trim w 0.00 d 0.44 | gali_n3 |
| #165 | 803.73, -29.85 | 804.00, -29.98 | 0.30 | 264.6 | moved, turned 41.6 deg | gali_n7 |
| #166 | 780.25, -33.50 | 780.26, -33.59 | 0.09 | 354.7 | moved, trim w 0.00 d 0.18 | gali_n3 |
| #167 | 787.12, -32.80 | 787.06, -32.99 | 0.20 | 85.0 | moved, trim w 0.20 d 0.00 | gali_n7 |
| #172 | 747.75, -24.52 | 747.73, -24.44 | 0.09 | 264.2 | moved | gali_n6 |
| #173 | 755.20, -23.70 | 755.20, -23.68 | 0.02 | 174.6 | moved | gali_n3 |
| #175 | 770.65, -22.50 | 770.63, -22.31 | 0.19 | 174.7 | moved, trim w 0.00 d 0.18 | gali_n3 |
| #176 | 778.98, -21.82 | 778.96, -21.62 | 0.21 | 174.6 | moved, trim w 0.00 d 0.26 | gali_n3 |
| #177 | 785.98, -20.70 | 785.96, -20.72 | 0.03 | 84.2 | moved | gali_n7 |
| #178 | 718.85, -19.02 | 718.87, -19.24 | 0.22 | 353.9 | moved, trim w 0.00 d 0.32 | gali_n4 |
| #179 | 727.00, -18.20 | 727.02, -18.42 | 0.22 | 354.7 | moved, trim w 0.00 d 0.44 | gali_n4 |
| #180 | 734.77, -17.50 | 734.80, -17.74 | 0.24 | 354.6 | moved, trim w 0.00 d 0.32 | gali_n4 |
| #181 | 746.88, -16.45 | 746.89, -16.60 | 0.15 | 264.9 | moved, trim w 0.22 d 0.00 | gali_n6 |
| #182 | 754.35, -15.65 | 754.37, -15.87 | 0.22 | 354.7 | moved, trim w 0.00 d 0.28 | gali_n4 |
| #183 | 804.10, -6.22 | 804.10, -6.22 | 0.00 | 264.6 | turned 8.9 deg | gali_n7 |
| #184 | 769.70, -14.40 | 769.71, -14.49 | 0.09 | 354.7 | moved, trim w 0.00 d 0.18 | gali_n4 |
| #186 | 785.15, -12.60 | 785.01, -12.98 | 0.40 | 84.3 | moved, trim w 0.40 d 0.00 | gali_n7 |
| #187 | 710.33, -7.10 | 710.33, -7.10 | 0.00 | 270.0 | turned 5.7 deg | 13_Outer lane, east (tractor route) |
| #193 | 762.08, -3.00 | 762.07, -2.96 | 0.04 | 174.7 | moved, trim w 0.00 d 0.04 | gali_n4 |
| #194 | 769.25, -2.30 | 769.24, -2.27 | 0.03 | 174.7 | moved | gali_n4 |
| #197 | 742.25, 5.58 | 742.25, 5.58 | 0.00 | 174.6 | turned 30.1 deg | gali_n4 |
| #199 | 759.95, 4.90 | 759.97, 4.74 | 0.16 | 354.7 | moved, trim w 0.00 d 0.32 | gali_n5 |
| #200 | 767.33, 5.70 | 767.35, 5.46 | 0.24 | 354.7 | moved, trim w 0.00 d 0.36 | gali_n5 |
| #201 | 775.38, 6.80 | 775.42, 6.36 | 0.44 | 354.6 | moved, trim w 0.00 d 0.60 | gali_n5 |
| #202 | 783.10, 7.03 | 783.11, 6.91 | 0.12 | 84.2 | moved, trim w 0.20 d 0.00 | gali_n7 |
| #217 | 544.45, -101.85 | 544.47, -101.87 | 0.03 | 0.0 | moved | gali_n10 |
| #221 | 578.58, -102.55 | 578.58, -102.55 | 0.00 | 0.0 | turned 7.3 deg | gali_n10 |
| #222 | 434.85, -91.10 | 434.84, -91.07 | 0.03 | 180.0 | moved | gali_n9 |
| #227 | 466.45, -91.20 | 465.56, -91.04 | 0.90 | 90.0 | moved | gali_n17 |
| #228 | 508.45, -91.10 | 508.12, -91.07 | 0.33 | 90.0 | moved | gali_n19 |
| #234 | 434.85, -84.45 | 434.85, -84.69 | 0.24 | 0.0 | moved, trim w 0.00 d 0.36 | gali_n11 |
| #235 | 441.30, -84.35 | 441.30, -84.65 | 0.30 | 0.0 | moved, trim w 0.00 d 0.44 | gali_n11 |
| #236 | 447.85, -84.35 | 447.85, -84.65 | 0.30 | 0.0 | moved, trim w 0.00 d 0.44 | gali_n11 |
| #237 | 453.80, -84.25 | 453.80, -84.61 | 0.36 | 0.0 | moved, trim w 0.00 d 0.52 | gali_n11 |
| #238 | 459.85, -84.25 | 459.85, -84.61 | 0.36 | 0.0 | moved, trim w 0.00 d 0.52 | gali_n11 |
| #239 | 466.45, -84.55 | 465.46, -84.72 | 1.00 | 90.0 | moved, trim w 0.30 d 0.00 | gali_n17 |
| #245 | 508.25, -84.45 | 508.06, -84.68 | 0.30 | 90.0 | moved, trim w 0.40 d 0.00 | gali_n19 |
| #247 | 444.65, -74.10 | 444.64, -74.07 | 0.03 | 180.0 | moved | gali_n11 |
| #248 | 465.95, -74.25 | 465.62, -74.12 | 0.35 | 90.0 | moved | gali_n17 |
| #249 | 477.00, -74.10 | 476.99, -74.07 | 0.03 | 180.0 | moved | gali_n11 |
| #250 | 483.95, -74.10 | 483.94, -74.07 | 0.03 | 180.0 | moved | gali_n11 |
| #251 | 491.05, -74.10 | 491.04, -74.07 | 0.03 | 180.0 | moved | gali_n11 |
| #252 | 498.00, -74.10 | 497.99, -74.07 | 0.03 | 180.0 | moved | gali_n11 |
| #253 | 444.65, -67.45 | 444.65, -67.69 | 0.24 | 0.0 | moved, trim w 0.00 d 0.36 | gali_n12 |
| #254 | 512.62, 11.03 | 512.62, 11.03 | 0.00 | 277.0 | turned 8.8 deg | 15_Outer lane, west |
| #255 | 458.55, -67.45 | 458.55, -67.87 | 0.42 | 0.0 | moved | gali_n12 |
| #256 | 465.95, -67.55 | 465.60, -67.75 | 0.40 | 90.0 | moved, trim w 0.30 d 0.00 | gali_n17 |
| #257 | 477.00, -67.45 | 477.00, -67.69 | 0.24 | 0.0 | moved, trim w 0.00 d 0.36 | gali_n12 |
| #258 | 483.95, -67.45 | 483.95, -67.69 | 0.24 | 0.0 | moved, trim w 0.00 d 0.36 | gali_n12 |
| #259 | 491.05, -67.45 | 491.05, -67.69 | 0.24 | 0.0 | moved, trim w 0.00 d 0.36 | gali_n12 |
| #260 | 498.00, -67.45 | 498.00, -67.69 | 0.24 | 0.0 | moved, trim w 0.00 d 0.36 | gali_n12 |
| #261 | 454.95, -57.55 | 454.95, -57.33 | 0.22 | 180.0 | moved, trim w 0.00 d 0.44 | gali_n12 |
| #263 | 489.75, -57.15 | 489.74, -57.12 | 0.03 | 180.0 | moved | gali_n12 |
| #267 | 436.95, -50.85 | 436.95, -50.88 | 0.03 | 0.0 | moved | gali_n13 |
| #268 | 450.55, -50.85 | 450.55, -50.87 | 0.02 | 0.0 | moved, trim w 0.00 d 0.04 | gali_n13 |
| #270 | 492.25, -50.45 | 492.25, -50.67 | 0.22 | 0.0 | moved, trim w 0.00 d 0.44 | gali_n14 |
| #271 | 436.35, -40.10 | 436.34, -40.07 | 0.03 | 180.0 | moved | gali_n13 |
| #272 | 443.45, -40.10 | 443.44, -40.07 | 0.03 | 180.0 | moved | gali_n13 |
| #273 | 450.25, -40.10 | 450.24, -40.07 | 0.03 | 180.0 | moved | gali_n13 |
| #276 | 506.65, -40.10 | 506.64, -40.07 | 0.03 | 180.0 | moved | gali_n14 |
| #278 | 443.45, -33.45 | 443.45, -33.68 | 0.23 | 0.0 | moved, trim w 0.00 d 0.38 | gali_n15 |
| #279 | 450.25, -33.45 | 450.25, -33.68 | 0.23 | 0.0 | moved, trim w 0.00 d 0.38 | gali_n15 |
| #280 | 485.45, -33.55 | 485.53, -33.87 | 0.33 | 0.0 | moved | gali_n16 |
| #281 | 492.75, -33.45 | 492.75, -33.74 | 0.29 | 0.0 | moved, trim w 0.00 d 0.26 | gali_n16 |
| #282 | 499.25, -33.45 | 499.25, -33.88 | 0.43 | 0.0 | moved | gali_n16 |
| #283 | 506.55, -33.45 | 506.55, -33.68 | 0.23 | 0.0 | moved, trim w 0.00 d 0.38 | gali_n16 |
| #290 | 516.58, -22.85 | 516.58, -22.85 | 0.00 | 180.0 | turned 7.0 deg | gali_n16 |
| #291 | 437.50, 87.28 | 437.55, 87.32 | 0.07 | 271.8 | moved | 15_edge_lane_sw |
| #294 | 436.77, 66.35 | 436.81, 66.37 | 0.04 | 271.8 | moved | 15_edge_lane_sw |
| #295 | 436.45, 59.10 | 436.55, 59.38 | 0.30 | 182.1 | moved, trim w 0.10 d 0.10 | gali_n24 |
| #299 | 435.50, 17.10 | 435.20, 17.11 | 0.30 | 271.8 | moved | 15_edge_lane_sw |
| #300 | 434.75, 10.30 | 434.82, 10.32 | 0.07 | 182.1 | moved | gali_n25 |
| #301 | 445.60, 86.20 | 445.53, 86.20 | 0.07 | 91.8 | moved, trim w 0.00 d 0.10 | gali_n21 |
| #302 | 445.15, 72.45 | 445.05, 72.45 | 0.10 | 92.6 | moved, trim w 0.00 d 0.16 | gali_n21 |
| #303 | 444.80, 65.40 | 444.78, 65.70 | 0.30 | 91.8 | moved, trim w 0.00 d 0.06 | gali_n21 |
| #304 | 444.50, 58.40 | 444.53, 59.14 | 0.74 | 182.1 | moved | gali_n24 |
| #305 | 444.35, 48.05 | 444.16, 48.06 | 0.19 | 1.4 | moved, trim w 0.10 d 0.00 | gali_n24 |
| #306 | 444.00, 40.70 | 443.93, 40.70 | 0.07 | 91.8 | moved, trim w 0.00 d 0.14 | gali_n21 |
| #307 | 443.70, 32.30 | 443.64, 32.30 | 0.06 | 91.8 | moved, trim w 0.00 d 0.12 | gali_n21 |
| #308 | 443.48, 25.50 | 443.40, 25.43 | 0.10 | 92.6 | moved, trim w 0.00 d 0.20 | gali_n21 |
| #309 | 443.55, 17.10 | 443.13, 17.11 | 0.42 | 91.8 | moved | gali_n21 |
| #310 | 442.90, 9.90 | 442.80, 9.90 | 0.10 | 182.1 | moved, trim w 0.04 d 0.00 | gali_n25 |
| #311 | 458.10, 97.60 | 458.16, 97.37 | 0.24 | 2.1 | moved | 15_edge_lane_sw |
| #316 | 456.85, 59.77 | 456.86, 59.79 | 0.02 | 272.6 | moved | gali_n21 |
| #321 | 466.30, 97.70 | 466.10, 97.14 | 0.60 | 2.1 | moved, trim w 0.50 d 0.40 | 15_edge_lane_sw |
| #322 | 466.20, 90.80 | 465.85, 90.81 | 0.35 | 91.8 | moved, trim w 0.00 d 0.38 | gali_n22 |
| #325 | 465.20, 67.30 | 465.01, 67.31 | 0.19 | 91.8 | moved, trim w 0.00 d 0.38 | gali_n22 |
| #326 | 464.98, 59.45 | 464.70, 59.46 | 0.27 | 92.6 | moved, trim w 0.00 d 0.34 | gali_n22 |
| #327 | 464.50, 46.70 | 464.30, 46.71 | 0.20 | 91.8 | moved, trim w 0.00 d 0.40 | gali_n22 |
| #328 | 464.20, 38.95 | 464.01, 38.96 | 0.19 | 91.8 | moved, trim w 0.00 d 0.38 | gali_n22 |
| #329 | 463.90, 30.60 | 463.67, 30.61 | 0.23 | 91.8 | moved, trim w 0.00 d 0.30 | gali_n22 |
| #330 | 463.65, 23.00 | 463.44, 23.01 | 0.21 | 92.6 | moved, trim w 0.00 d 0.42 | gali_n22 |
| #331 | 463.40, 14.80 | 463.18, 14.81 | 0.22 | 91.8 | moved, trim w 0.00 d 0.44 | gali_n22 |
| #332 | 478.50, 97.35 | 478.45, 96.39 | 0.96 | 2.9 | moved | 15_edge_lane_sw |
| #333 | 477.60, 83.00 | 477.64, 83.00 | 0.04 | 271.8 | moved, trim w 0.00 d 0.08 | gali_n22 |
| #334 | 477.05, 74.90 | 477.23, 74.89 | 0.18 | 272.7 | moved, trim w 0.00 d 0.36 | gali_n22 |
| #341 | 486.50, 96.67 | 486.15, 95.48 | 1.25 | 1.4 | moved, trim w 0.65 d 0.00 | 15_edge_lane_sw |
| #342 | 486.05, 88.70 | 485.73, 88.71 | 0.32 | 92.6 | moved, trim w 0.00 d 0.32 | gali_n23 |
| #343 | 485.60, 81.80 | 485.46, 81.81 | 0.14 | 91.8 | moved, trim w 0.00 d 0.24 | gali_n23 |
| #344 | 485.10, 74.10 | 485.08, 74.09 | 0.02 | 91.8 | moved | gali_n23 |
| #345 | 485.27, 66.80 | 484.98, 66.81 | 0.30 | 92.6 | moved, trim w 0.00 d 0.36 | gali_n23 |
| #346 | 484.93, 58.50 | 484.71, 58.51 | 0.21 | 91.8 | moved, trim w 0.00 d 0.30 | gali_n23 |
| #347 | 484.50, 46.60 | 484.30, 46.61 | 0.20 | 2.1 | moved, trim w 0.36 d 0.00 | gali_n24 |
| #348 | 485.00, 36.60 | 484.31, 36.62 | 0.69 | 91.8 | moved, trim w 0.00 d 1.10 | gali_n23 |
| #349 | 498.95, 95.97 | 499.01, 95.49 | 0.49 | 2.9 | moved | 15_edge_lane_sw |
| #357 | 738.95, 36.42 | 739.24, 36.36 | 0.30 | 267.4 | moved, turned 48.3 deg, front/depth swapped (same footprint) | gali_n30 |
| #360 | 790.88, 62.02 | 790.89, 62.02 | 0.02 | 356.5 | moved | gali_n33 |
| #366 | 779.70, 54.20 | 779.66, 54.17 | 0.05 | 86.9 | moved | gali_n27 |
| #367 | 779.30, 61.60 | 779.32, 61.45 | 0.15 | 359.1 | moved | gali_n33 |
| #369 | 778.52, 80.00 | 778.48, 79.97 | 0.05 | 87.9 | moved | gali_n27 |
| #370 | 778.33, 86.90 | 778.21, 86.87 | 0.12 | 86.9 | moved | gali_n27 |
| #371 | 778.15, 93.75 | 778.00, 93.74 | 0.15 | 87.9 | moved, trim w 0.00 d 0.30 | gali_n27 |
| #372 | 728.60, 39.60 | 728.60, 39.60 | 0.00 | 87.4 | turned 9.7 deg | gali_n30 |
| #373 | 772.65, 61.35 | 773.00, 61.15 | 0.40 | 358.2 | moved, trim w 0.40 d 0.00 | gali_n33 |
| #375 | 771.85, 80.70 | 772.09, 80.71 | 0.24 | 267.9 | moved, trim w 0.00 d 0.32 | gali_n28 |
| #376 | 771.70, 87.60 | 771.82, 87.61 | 0.12 | 266.9 | moved, trim w 0.00 d 0.24 | gali_n28 |
| #377 | 771.55, 94.47 | 771.55, 95.94 | 1.47 | 267.9 | moved | gali_n28 |
| #378 | 762.95, 52.85 | 762.79, 52.84 | 0.16 | 86.9 | moved, trim w 0.00 d 0.28 | gali_n28 |
| #384 | 755.65, 58.70 | 755.95, 58.71 | 0.30 | 267.9 | moved, trim w 0.00 d 0.55 | gali_n29 |
| #385 | 755.17, 72.20 | 755.46, 72.21 | 0.28 | 266.9 | moved, trim w 0.00 d 0.24 | gali_n29 |
| #386 | 754.83, 79.10 | 755.12, 79.11 | 0.30 | 267.9 | moved, trim w 0.00 d 0.36 | gali_n29 |
| #387 | 754.48, 86.20 | 754.78, 86.21 | 0.31 | 266.9 | moved, trim w 0.00 d 0.30 | gali_n29 |
| #389 | 745.80, 50.70 | 745.77, 50.67 | 0.04 | 86.9 | moved | gali_n29 |
| #393 | 743.05, 93.25 | 743.05, 93.25 | 0.00 | 87.4 | turned 4.7 deg | gali_n29 |
| #394 | 739.15, 50.58 | 739.40, 50.59 | 0.25 | 267.9 | moved, trim w 0.00 d 0.38 | gali_n30 |
| #395 | 738.80, 57.42 | 739.09, 57.44 | 0.29 | 266.8 | moved, trim w 0.00 d 0.38 | gali_n30 |
| #396 | 738.20, 71.80 | 738.41, 71.81 | 0.21 | 266.9 | moved, trim w 0.00 d 0.42 | gali_n30 |
| #397 | 737.85, 78.90 | 738.15, 78.91 | 0.30 | 267.9 | moved, trim w 0.00 d 0.32 | gali_n30 |
| #398 | 736.20, 85.80 | 736.61, 86.60 | 0.90 | 267.4 | moved, turned 47.6 deg, front/depth swapped (same footprint) | gali_n30 |
| #399 | 728.55, 55.58 | 728.54, 55.56 | 0.02 | 87.9 | moved | gali_n30 |
| #400 | 725.65, 103.25 | 725.52, 103.22 | 0.13 | 331.5 | moved, turned 26.8 deg | 13_Outer lane, east (tractor route) |
| #401 | 721.90, 55.35 | 722.17, 55.36 | 0.27 | 266.9 | moved, trim w 0.00 d 0.38 | gali_n32 |
| #403 | 542.05, -66.05 | 542.05, -66.05 | 0.00 | 172.7 | turned 7.3 deg | ring_road |
| #410 | 546.65, -37.90 | 546.63, -37.83 | 0.07 | 180.0 | moved | gali_n35 |
| #411 | 539.65, -31.25 | 539.65, -31.51 | 0.26 | 0.0 | moved, trim w 0.00 d 0.28 | gali_n36 |
| #412 | 546.65, -31.25 | 546.65, -31.44 | 0.19 | 0.0 | moved, trim w 0.00 d 0.38 | gali_n36 |
| #413 | 541.45, -20.90 | 541.43, -20.83 | 0.07 | 180.0 | moved | gali_n36 |
| #414 | 548.45, -20.90 | 548.43, -20.83 | 0.07 | 180.0 | moved | gali_n36 |
| #415 | 541.45, -14.25 | 541.45, -14.46 | 0.21 | 0.0 | moved, trim w 0.00 d 0.38 | gali_n37 |
| #416 | 548.45, -14.25 | 548.45, -14.46 | 0.21 | 0.0 | moved, trim w 0.00 d 0.38 | gali_n37 |
| #428 | 652.98, -8.07 | 652.73, -8.10 | 0.25 | 85.8 | moved, trim w 0.00 d 0.30 | gali_n39 |
| #429 | 653.52, -14.72 | 653.29, -14.74 | 0.24 | 84.8 | moved, trim w 0.00 d 0.24 | gali_n39 |
| #430 | 653.15, -22.23 | 653.15, -22.23 | 0.00 | 85.3 | turned 13.1 deg | gali_n39 |
| #431 | 587.15, -30.15 | 587.15, -30.15 | 0.00 | 173.7 | turned 6.3 deg | inner_loop |
| #439 | 681.58, -60.88 | 681.65, -61.01 | 0.15 | 352.7 | moved, turned 33.3 deg | ring_road |

Totals: 196 houses changed; 181 moved, 25 turned, 109 trimmed. Biggest move 1.47 m. Houses #112 and #308 (named in the audit) are cleared.

## Notes and leftovers

- Attached things move with the house: colliders, door, doorstep pots and furniture, clutter, roof tanks, shade-tree avoidance and the house kit all derive from the plan rows (housesPlanData.json), so nothing else needed a separate edit.
- Front steps and chajjas (up to ~0.5 m past the front wall) are not part of the footprint the rule measures (same as the audit); they may reach nearer to a band than 0.1 m.
- Houses facing a gali end: #89, #357, #398 had no road in front (enclosed); they now face the nearest road (turned 90 deg, same footprint, front and depth swapped).
- Not done by me: houses vs shops moved by the shops agent; re-run `node tools/map-match-houses.mjs` after their change lands.
- Old checker note: housesCheck.js still prints 4 drawn house overlaps (SAT, 0.05 m); the original drawing had 6.
