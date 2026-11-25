# Prop nudge log, 25 Nov

Source: docs/layout/approved-map-2026-11-25.json. Rule: nothing stands on a road band. Each prop slid the smallest distance along the road normal, away from the road, until its clearance circle (tools/road-clearance.mjs radius) or, for four signboards, its real rectangle, cleared every band by 0.02 m or more. Max 2 m. Done in tools/layout-pack.mjs (nudgeSmallProps), stored in src/layout/mapData.json (propNudges). Roads are never moved.

| Prop | Map spot | New spot | Moved m | Road | Mode |
|---|---|---|---|---|---|
| new_milestone#4 (Milestone) | 450, 1.5 | 451.02, 1.46 | 1.02 | gali_n21 | circle r=0.36 |
| new_milestone#9 (Milestone) | 458, -2 | 457.99, -1.95 | 0.05 | cross_road | circle r=0.36 |
| new_Washing platform#1 (Washing platform) | 505.6, 30.27 | 504.93, 30.36 | 0.67 | 15_Outer lane, west | circle r=2.24 |
| new_Water trough#1 (Water trough) | 467.77, -9.47 | 467.84, -9.82 | 0.35 | cross_road | circle r=1.68 |
| new_well#1 (Well) | 558, -43 | 559.92, -42.7 | 1.94 | gali_n35 | circle r=1.60 |
| new_Hand pump#13 (Hand pump) | 552.37, -83 | 552.27, -83 | 0.1 | gali_n20 | circle r=1.20 |
| new_Washing line#1 (Washing line) | 647.98, 60.3 | 648.19, 61.38 | 1.1 | ring_road | circle r=2.50 |
| new_Washing line#3 (Washing line) | 530.08, -69.61 | 529.95, -68.62 | 0.99 | ring_road | circle r=2.50 |
| new_Washing line#6 (Washing line) | 716.94, 14.6 | 716.94, 13.79 | 0.81 | cross_road | circle r=2.50 |
| new_Washing line#10 (Washing line) | 546.98, -76.9 | 547.07, -77.6 | 0.71 | ring_road | circle r=2.50 |
| new_Washing line#12 (Washing line) | 539.85, -0.61 | 539.88, -1.05 | 0.44 | cross_road | circle r=2.50 |
| new_sign#44 (Signboard: Jeweller) | 561.85, 9.15 | 561.85, 10.19 | 1.04 | cross_road | circle r=1.66 |
| new_sign#65 (Signboard: Barber shop) | 624.33, -33.52 | 624.46, -34.75 | 1.23 | inner_loop | circle r=1.78 |
| new_sign#76 (Signboard: Carpenter's workshop) | 709.28, -85.03 | 709.4, -85.02 | 0.12 | 13_Outer lane, east (tractor route) | footprint |
| new_sign#83 (Signboard: Tent and wedding lights) | 765.95, -116.42 | 765.95, -116.3 | 0.12 | highway | footprint |
| new_sign#95 (Signboard: General store) | 709.1, -78.67 | 709.17, -78.67 | 0.07 | 13_Outer lane, east (tractor route) | footprint |
| new_sign#103 (Signboard: Tailor) | 708.92, -73.15 | 709.05, -73.15 | 0.12 | 13_Outer lane, east (tractor route) | footprint |

## Exempt (span a road by design, not moved)
- Level-crossing planks (highway and village road): lie across the road on purpose (src/kit/railway.js).
- Crossing barriers (new_boom #1, #3, #6, #8): stand at the crossing, by design.
- Welcome arch (new_gate#3, 605,-113): spans main_road by design.
- Culvert (new_culvert#1, 745,20.4): carries cross_road over the channel by design.
- Flag island, pedestal, pole, flags, name stone (new_island #1-#7): the roundabout centre, inside the ring the roads join.
- Canal bridges (canal_new #4-#9): carry a road over the canal by design.

## Left
- new_Kabaddi ground lines (713.7,114.7): painted ground marking, r 8.2 m circle touches 13_Outer lane, east by 1.7 m; not a standing object, not moved.
- Shop and house footprints touching bands (new_sqx, kiosks, etc.): other agent (shopsPlace.js / housesPlan.js), not touched here.
- Washing lines #1, #3, #10 now sit within about 1.5 m of a house rectangle (they were beside the houses already); needs a look if they read as overlapping.
