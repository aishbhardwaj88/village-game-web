# Shops move log 2, 25 Nov (review rules, tmp/review_rules.txt)

Scope: 163 shops, kiosks, carts, sheds, the shopkeeper's home (src/kit/shopsPlace.js, tools/shop-rects-pack.mjs, src/layout/shopRects.json, tools/map-match-shops.mjs) + 3 railway buildings (src/kit/railway.js). Own audit: `python3 tmp/audit/audit5_shops.py -v` (data from tmp/audit/export4.mjs, built mesh boxes from tmp/audit/probe5_shops.mjs).

## Result (shops category, 166 items)
- Before (review definition, same data): 160 PASS / 6 FAIL (Utensils, Optician, 2 Mobile: clearance or back nearer a road than the front; station and waiting hall: back nearer the road).
- After: 166 PASS / 0 FAIL. `node tools/map-match-shops.mjs` PASS (0 overlap, 0 clearance < 0.1 m, 0 facing fails, no accepted exceptions left). `node tools/missions-check.mjs` 0 FAIL. `npm run build:unchecked` ok.
- The 14 shops flagged for facing under the old audit all pass the new definition (road = band nearest the front-face midpoint, within 15 m, walls square: skew 0.0 deg for every shop). None needed turning.

## What changed
| Item | Change | Moved m | Why |
|---|---|---|---|
| Optician (2-storey) | width 3.8 -> 3.6 m, centre x 569.6 (z -3), faces cross_road, sign shrinks to fit (3.35 m max, already capped by the shop's own width rule) | 0.99 from map spot | built mesh was 0.098 m from a band; now 0.22 m clear of both the Inner loop and gali_n41 |
| Utensils (2-storey) 594.4,-22.9 | slid 0.25 m toward its front (+x) | 0.25 | back face was 0.11 m from the end of gali_n40, front 0.79 m from main_road: back nearer a road than the front by more than 0.5 m |
| Mobile 786.6,36.3 | slid 0.80 m total | 0.80 | same reason (back 0.25 m from gali_n27, front 1.6 m from cross_road) |
| Mobile 754.3,12.4 | slid 0.22 m total | 0.22 | same (back 0.19 m from gali_n5, front 0.79 m from cross_road) |
| Tractor repair | 0.02 m | 0.39 | same |
| Railway station building, Ticket window and waiting hall | turned to FRONT EAST (the road side): entrance, ticket window and the station name board now on the east face; the platform (west) side keeps a door and windows | 0 | enclosed (no band within 15 m); the nearest band is gali_n9 / gali_n11, which end 20.7 m east of the back wall, while the old front (west, platform) was 27.2 m from them |
| src/kit/shopsStock.js | electrical shops: the tube-light bars and hardware shop pipe racks were centred on the side wall and poked 0.25-0.5 m through it into the next shop (a 1.4 m2 overlap Electrical / Cloth house). Bars now end inside the wall. | | rule 3: no building overlaps another |
| tools/shop-rects-pack.mjs | Optician override moved before the clearing step; new front-vs-back balance step; "NOT MOVED" for the Optician is gone | | |
| tools/map-match-shops.mjs | facing check replaced by the review definition; ALLOWED list emptied (Optician and shopkeeper's home pass for real) | | |

- Shopkeeper's home (587.17,-12.64): passes as is. Front (-x) is 3.8 m from gali_n41, back 8.1 m from main_road, walls square to gali_n41 (0 deg).
- Platform shelter 395.9,-93: passes (front 28.98 m, back 28.94 m from the highway, square). No change.
- Nothing moved more than 1.8 m from its map spot (Spices 1.76 m, from the first round). No shop is more than 5 m from the map.

## Not fixed (listed)
- The railway front is hard-coded west in the shared tmp/audit/export4.mjs and audit4.py (`ry = -pi/2`): they will now report the station and waiting hall as back-to-road. They must use east (`+pi/2`). audit5_shops.py already does.
- Building overlaps outside the shop rows (rule 3), from my audit5 (> 0.05 m2, built mesh vs other buildings; shop-vs-shop touching at 4.5 m pitch is exactly 0): these involve places or houses, which are not mine to edit:
  - Hardware and paint (2-storey) 645.73,27.8 vs place `house`: 27.7 m2. Gift shop (2-storey) 594.5,35.15 vs place `sabzi`: 11.4 m2 (+ Kites and toys 0.07, Fruit kiosk). Milk carts 444,-13.1 vs place `dairy`: 2.2 m2. Pooja items vs place `chaat`: 0.75 m2. Jaggery unit vs masjid 0.25 m2. These look like shops drawn inside a place's whole-site box; the places agent owns the box.
  - Shopkeeper's home vs house #433: 0.94 m2 (the house plan is not mine).
  - Dry fruits (611.17,40.96) vs Pooja items (611.3,36.6): 0.97 m2 (plots drawn 0.1 m skewed against each other); Ice gola cart vs Newspaper stand 0.13 m2. Pre-existing on the drawn map, not worth a move; listed.
- The 4 shops at 711.6,-73.1 (Cycle and puncture repair, Utensils, Optician, Tailor): pass with flat road ends; the game's round-end drawing is another agent's change (map-match prints `report.onRoad` for them as information only).
