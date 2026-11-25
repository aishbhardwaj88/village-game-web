# Final overlap fixes, 26 Nov

All against real built-mesh extents. Max 5 m from map spot, 0 road overlap, 0.1 m clear.

| # | Overlap | Fix | Move |
|---|---|---|---|
| 1 | Hardware and paint vs place house (26.8 m2, real mesh overlap) | house place east 3.4, north 0.6 (placeMoves.js); shop west 2.2, south 0.6 (shop-rects-pack.mjs FORCE) | house 3.45 m, shop 2.28 m |
| 2 | Gift shop vs place sabzi (5.2 m2) | sabzi 2 m more south-west (total 4.86 m); Gift shop +0.6,+0.9; Kites and toys +0.7 z | 2.0 / 1.08 / 0.7 m |
| 3 | Milk carts vs dairy (3.8 m2) | dairy gets building-only boxes (glb vertices: yard slab left out); cart nudged 0.4 m | footprint only |
| 4 | house #430 in haveli site box (26 m2) | haveli building-only boxes (21 m slab + 2 wall strips); no move | footprint only |
| 5 | house #447 on pond (2.5 m2) | pond box was stale square for R 9.6; now 6 strips of the shrunk outline, 0.12 m off the lane, 2.1 m from #447 | footprint only |
| 6 | Seeds vs house #7 | already 0.19 m clear (0 overlap) after the houses round | none |
| 7 | Post office vs yard_chaupal (8.95 m2 site boxes) | yard_chaupal 1.5 m north | 1.5 m |

Proof: building overlaps 0 (>0.0000001 m2); doors.mjs houses 0 fails, shops 3 (railway walk-to-road only); map-match places/houses/shops pass; missions-check 0 FAIL; audit5 shops 166/166, houses 455/455, places 35/36 (yard_bhatta stays by her rule).
