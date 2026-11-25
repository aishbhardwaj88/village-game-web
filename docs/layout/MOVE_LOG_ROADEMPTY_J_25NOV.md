# Roads empty (J), 25 Nov: west re-scan items moved

| item | was | now |
|---|---|---|
| map_haystacks third stack (src/farmSites.js createMapHaystacks) | world (508.2,-5.1), 0.26 m inside the west outer lane dust (stack H4 move was too short) | local (-8,-1.5) = world (502.5,-7.6), 1.3 m clear. The scan hit (505.3,-0.9) was the old spot (HAY3 old) |
| s7_props flag island at the chauraha (src/kit/landProps.js) | platform r 5.6 overlapped the ring road's inner dust (ring inner edge 6.0 + apron 0.42) | platform trimmed to r 4.9 (peepal platform and flag/pedestal/stone unchanged, they sit inside 4.5) |
| map_well (src/main.js) | 0.54 m on cross_road at (394.2,-17.4) | slid 1.5 m north to z -22.1, 0.97 m clear |
| s7_shop_signs 593.6,28.6 | 0.67 m over chauraha ring | already pushed by fixer I (kiosk/cart/shed push includes the ring); no change |
| s7_field_cane (src/kit/landFields.js) | clumps within 1.5 m of the lane band | cane keeps 2.0 m from the band (0.6 m beyond dust) |
| gurudwara step (src/layout/placeMoves.js) | 0.11 m in the lane dust | shift dz -1.6 -> -2.3 (0.7 m more north) |
| s7_wall_murals 464.2,-64.6 | 0.07 m | already slid along its wall by fixer I; unchanged |

South strip x 250..600, z 250..340 scanned from placement data (map objects, places, ride nooks, 3 m radius): 0 hits. Nearest nook 1.7 m clear.
Speed breaker slab at (595.2,-60.8) ignored on purpose.
