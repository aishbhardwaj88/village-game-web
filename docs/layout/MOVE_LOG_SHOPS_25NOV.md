# Shops move log, 25 Nov (her rule)

Her rule (tmp/move_rules.txt, 25 Nov): every building faces the road it fronts (walls square to it) and stands at 0 overlap with every road band (band = approved-map road polyline buffered by width/2, flat caps, clear by at least 0.1 m). Moves are the smallest distance off the band (push away from the road; if that hits another building, slide along the road; never more than 5 m).

## How it works (the code path the game runs)

- `tools/shop-rects-pack.mjs` reads docs/layout/approved-map-2026-11-25.json and writes `src/layout/shopRects.json`: one rect (cx, cz, w, d, ry, front) for each of the 163 shops, kiosks, carts, sheds and the shopkeeper's home built by `src/kit/shopsPlace.js` (the 3 railway buildings are built by railway.js and were already clear).
- `src/kit/shopsPlace.js` (fed the RAW map in the browser) now looks every shop up in `shopRects.json` (same key as `src/layout/layout.js`, so missions and every `getLayout()` reader see the identical rect). The old "slide a stand up to 1 m" step in `put()` is gone; nothing slides at runtime any more.
- Everything attached to a shop is placed from the same rect in the same call: signboard, colliders, wall posters, shop stock, LOD copies. Nothing else in the repo holds a separate shop position.
- Footprint tested = the BUILT mesh extent (measured from the shopsKit designs: shops +0.07 m sides / +0.1 m front-back, kiosks +0.12 / front +0.35, carts 2.8 x 1.4 off-centre, sheds +0.25 / +0.28), not the bare plot.
- Facing: the road whose band is nearest the front-face midpoint (foot of the perpendicular inside its segment); front = that segment's normal on the side the shop already faced; walls square to it. A turn over 45 deg (90 for carts and kiosks) is not applied and listed.

## Proof

- `node tools/map-match-shops.mjs` runs the game's own `buildShops()` in node on the raw map and checks the rect every design is placed on with geometry independent of the pack tool (5 cm grid overlap area, flat-ended rectangles + joint discs, perimeter clearance every 0.1 m, front square to the road within 1.5 deg and the road in front of the shop).
- Before (MATCH_AUDIT_2_25NOV.md, shops): 37 FAIL = 16 facing (6 to 27 deg off the marker arrow), 6 overlapping a band (Optician 1.68 m2 / 1.1 m deep, Spices 1.47 m2, Fertiliser and seeds, Tractor repair, Mobile 786.6,36.3, Mobile recharge and photocopy), 16 ring-fallback fronts.
- After: 163 placed, 1 overlap (Optician, accepted below), 1 front not square (shopkeeper's home, accepted below), everything else 0 overlap, clearance at least 0.1 m, square to its road.
- The 16 "off the marker arrow" shops (Kulfi cart, Snacks cart, Spices, Cloth shop, Tailor, Bangles and cosmetics, Beauty parlour, Mobile shop, Milk collection point, Animal hospital, Kirana, 2 General stores, 2 Tea stalls, Cycle repair): the drawn plots are already square to their road (turn under 1 deg); it was the marker arrows that were skewed. They keep the plot's facing, which the new rule makes the truth. Only the Kulfi cart and Snacks cart turn (see table).
- Tea stalls: all six "Tea stall" shops clear every band (nearest 0.55 m; the two near the cross road 0.82 and 0.84 m, none touch the ring road). The `teastall` PLACE (593.5,6.9, anchors.js, not in this scope) has a box clear of main_road by 2.3 m and cross_road by 1.1 m on the model's bounds.

## Not done, and why

- Optician (2-storey) at 570.59,-3.0: stays put. The Inner loop band west of it and the flat start of gali_n41 east of it leave 4.3 m of free width for a 4.5 m shop; every slide up to 5 m runs into one band or the other (best spot still 1.2 m deep into gali_n41). Rule says list it, so it is listed. Fix needs a map change (shorter gali_n41 or a narrower plot), her call.
- Shopkeeper's home and godown at 587.17,-12.64: not turned. gali_n41 dead-ends 1 m from its front (-x) face, so it already faces that road (along its axis). Turning it 90 deg to face gali_n40, 9 m away, would be wrong and would swap its 7 x 4.4 footprint.
- Round road ends: roadNetwork.js draws every road end as a round cap, but the rule (and the audit) use flat caps. With the game's own round-cap check (`report.onRoad`), 4 shops still show: Cycle and puncture repair (-0.75 m), Utensils (-0.85 m), Optician (-1.53 m), Tailor at 711.6,-73.1 (-0.08 m), all against the rounded end of a gali that stops at their wall. Fixing those would need moves into neighbouring shops or the highway; not done, flagged.

## Moves and turns (every shop that moved more than 5 mm or turned more than 1 deg)

Facing is the yaw of the front in degrees (0 = +z, 90 = +x, three.js rotation.y). Clearance = metres between the built footprint and the nearest band, old -> new.

| Shop | Type | Old spot | New spot | Moved m | Facing deg old -> new | Turned deg | Nearest road | Clearance old -> new m |
|---|---|---|---|---|---|---|---|---|
| Kulfi cart | cart | 589.09, 25.48 | 589.09, 25.48 | 0.00 | 202.1 -> 129.4 | 72.6 | cross_road | 3.91 -> 3.91 |
| Snacks cart | cart | 588.23, 22.49 | 588.23, 22.49 | 0.00 | 190.0 -> 129.4 | 60.6 | cross_road | 2.68 -> 2.68 |
| Cycle and puncture repair (2-storey) | shopHouse | 594.40, -27.40 | 594.51, -27.40 | 0.11 | 90.0 -> 90.0 | 0.0 | main_road | 0.00 -> 0.11 |
| Utensils (2-storey) | shopHouse | 594.40, -22.90 | 594.51, -22.90 | 0.11 | 90.0 -> 90.0 | 0.0 | main_road | 0.00 -> 0.11 |
| Toy shop (2-storey) | shopHouse | 611.45, -27.90 | 611.45, -27.90 | 0.00 | 263.6 -> 270.0 | 6.4 | main_road | 0.29 -> 0.29 |
| Sweets and namkeen (2-storey) | shopHouse | 594.35, 45.60 | 594.35, 45.60 | 0.00 | 90.0 -> 86.3 | 3.7 | main_road | 0.81 -> 0.81 |
| Steel utensils (2-storey) | shopHouse | 611.04, 50.14 | 611.04, 50.14 | 0.00 | 270.0 -> 266.3 | 3.7 | main_road | 0.86 -> 0.86 |
| Shoe shop (2-storey) | shopHouse | 610.75, 55.13 | 610.75, 55.13 | 0.00 | 270.0 -> 266.3 | 3.7 | main_road | 0.90 -> 0.90 |
| Bangles (2-storey) | shopHouse | 609.13, 70.82 | 609.13, 70.82 | 0.00 | 281.1 -> 255.9 | 25.2 | main_road | 0.62 -> 0.62 |
| Photo studio (2-storey) | shopHouse | 575.09, 13.02 | 575.09, 13.02 | 0.00 | 180.0 -> 169.4 | 10.6 | cross_road | 0.29 -> 0.29 |
| Lassi and milk (2-storey) | shopHouse | 650.59, 11.90 | 650.59, 11.90 | 0.00 | 355.3 -> 0.1 | 4.7 | cross_road | 0.90 -> 0.90 |
| Hardware and paint | shop | 650.35, -113.77 | 650.35, -113.77 | 0.00 | 172.8 -> 179.2 | 6.4 | highway | 0.90 -> 0.90 |
| Fertiliser and seeds | shop | 658.35, -113.66 | 658.39, -113.98 | 0.33 | 179.2 -> 179.2 | 0.0 | highway | -0.20 -> 0.11 |
| Tea stall | shop | 679.85, -113.86 | 679.85, -113.86 | 0.00 | 172.7 -> 179.2 | 6.5 | highway | 0.90 -> 0.90 |
| Tractor repair | shop | 689.84, -112.72 | 689.67, -113.06 | 0.38 | 179.2 -> 179.2 | 0.0 | highway | -0.20 -> 0.11 |
| Mobile | shop | 756.48, 15.63 | 756.47, 15.74 | 0.11 | 354.5 -> 351.5 | 3.1 | cross_road | 0.00 -> 0.11 |
| Grocery | shop | 786.14, 20.08 | 786.14, 20.08 | 0.00 | 354.5 -> 351.5 | 3.1 | cross_road | 0.90 -> 0.90 |
| Mobile | shop | 786.63, 36.34 | 786.80, 36.05 | 0.33 | 171.5 -> 171.5 | 0.0 | cross_road | -0.18 -> 0.11 |
| Seeds | shop | 792.57, 37.23 | 792.57, 37.23 | 0.00 | 177.4 -> 171.5 | 6.0 | cross_road | 1.85 -> 1.85 |
| Kirana (2-storey) | shopHouse | 607.73, 76.20 | 607.68, 75.96 | 0.24 | 256.0 -> 255.9 | 0.1 | main_road | -0.13 -> 0.11 |
| Spices (2-storey) | shopHouse | 581.10, -1.85 | 582.59, -0.91 | 1.76 | 349.3 -> 349.4 | 0.1 | cross_road | -0.84 -> 0.10 |
| Fruit kiosk | kiosk | 591.55, 30.50 | 591.55, 30.50 | 0.00 | 133.7 -> 90.0 | 43.7 | main_road | 5.40 -> 5.40 |
| Juice kiosk | kiosk | 634.52, 52.85 | 634.52, 52.85 | 0.00 | 12.7 -> 11.2 | 1.5 | ring_road | 0.54 -> 0.54 |
| Toys and balloons kiosk | kiosk | 638.13, 52.15 | 638.13, 52.15 | 0.00 | 12.7 -> 11.2 | 1.5 | ring_road | 0.53 -> 0.53 |
| Aloo tikki kiosk | kiosk | 657.38, 59.50 | 657.38, 59.50 | 0.00 | 192.3 -> 191.2 | 1.1 | ring_road | 0.52 -> 0.52 |
| Namkeen cart | cart | 621.15, 1.00 | 621.15, 1.00 | 0.00 | 90.0 -> 87.8 | 2.2 | inner_loop | 1.14 -> 1.14 |
| Fruit cart | cart | 566.80, 32.15 | 566.80, 32.15 | 0.00 | 92.9 -> 90.9 | 2.0 | inner_sw | 1.15 -> 1.15 |
| Footwear | shop | 612.52, -38.13 | 612.52, -38.13 | 0.00 | 263.3 -> 270.0 | 6.7 | main_road | 0.55 -> 0.55 |
| Electrical and mobile repair | shop | 618.77, -37.45 | 618.77, -37.45 | 0.00 | 355.2 -> 353.7 | 1.6 | inner_loop | 0.76 -> 0.76 |
| Barber shop | shop | 624.73, -36.77 | 624.73, -36.77 | 0.00 | 352.3 -> 353.7 | 1.4 | inner_loop | 0.75 -> 0.75 |
| Farmers' cooperative and godown | shop | 668.85, -113.10 | 668.85, -113.10 | 0.00 | 180.7 -> 179.2 | 1.5 | highway | 0.81 -> 0.81 |
| Stationery | shop | 583.15, 81.38 | 583.15, 81.38 | 0.00 | 12.9 -> 11.2 | 1.7 | 14_Outer lane, south | 0.61 -> 0.61 |
| Mobile recharge and photocopy | shop | 683.40, 61.48 | 683.09, 61.45 | 0.31 | 12.7 -> 11.2 | 1.4 | 14_Outer lane, south | -0.20 -> 0.11 |
| Cycle stand | shed | 533.65, 9.70 | 533.65, 9.70 | 0.00 | 175.2 -> 176.7 | 1.5 | cross_road | 0.38 -> 0.38 |
| Tent and wedding lights | shop | 766.02, -113.20 | 766.02, -113.20 | 0.00 | 181.0 -> 179.0 | 1.9 | highway | 0.34 -> 0.34 |
| Milk carts | cart | 444.05, -13.10 | 444.05, -13.10 | 0.00 | 354.3 -> 352.7 | 1.6 | cross_road | 1.20 -> 1.20 |
| Kirana | shop | 685.50, 12.50 | 685.50, 12.50 | 0.00 | 359.0 -> 0.1 | 1.0 | cross_road | 0.76 -> 0.76 |
| Photo studio | shop | 768.33, 17.50 | 768.33, 17.50 | 0.00 | 350.2 -> 351.5 | 1.3 | cross_road | 0.73 -> 0.73 |
| Tea stall | shop | 433.05, -3.10 | 433.05, -3.10 | 0.00 | 174.3 -> 172.7 | 1.6 | cross_road | 0.82 -> 0.82 |
| Tea stall | shop | 591.38, 80.03 | 591.38, 80.03 | 0.00 | 74.6 -> 75.9 | 1.3 | main_road | 0.55 -> 0.55 |
| Cycle repair | shop | 658.52, 66.95 | 658.62, 66.93 | 0.10 (slid) | 10.2 -> 11.2 | 1.0 | 14_Outer lane, south | 0.56 -> 0.56 |
