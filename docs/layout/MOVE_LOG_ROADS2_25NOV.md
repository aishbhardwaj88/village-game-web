# Roads 2 and small props, 25 Nov (flat road ends, props re-review, spawn check)

## Task 1: road surface ends FLAT where the map's polyline ends

Before: `src/roadNetwork.js` measured each line to its centreline with a round cap, so every dead end stuck out half a road width
(2 m on a gali, up to 5.5 m on the highway) past the map's flat-capped band; the 0.8 m mesh grid then blended a further 0.4 to 0.8 m
of fade past the alpha edge. That is the 0.75 to 0.85 m the audit saw in the shops near 711.6,-73.1 (gali_n1 starts at 715.46,-73.83).

Change (only `src/roadNetwork.js`; no centre line, width, junction fillet, ring or map data touched):
- Every segment of an OPEN line within 2 x half-width of a dead end, and within 30 degrees of the end leg's heading, carries the end
  plane (the endpoint and the outward direction). Beyond the plane the band is cut flat (`segDi`). Bends and interior joins stay round.
- Edge wander and the scuffed fade die away over the last 0.6 m before a flat end (`END_EASE`, `END_BAND`), so the end is a clean line.
- `networkMesh` lands the grid vertices that lie beyond a flat end ON the plane (every one out to 4 m, carrying the road as it is just
  inside), so the drawn triangles stop exactly on the map's end line. Not done where another road's band is within 1 m (`FREE_GAP`):
  that is a junction, and its smooth-union fill (`JOIN_K`) is the corner rounding it needs.
- `edgeDistance` (audits) uses the same flat ends. New export `sampleSurface` for audits.
- `tools/map-match-roads.mjs` now also fails if any line's drawn surface (alpha >= 0.5, line alone) reaches more than 0.1 m past its
  flat end (138 line ends checked).

Measured (tmp/rn_*.mjs, scratch):
| measure | before | after |
|---|---|---|
| surface mesh, alpha >= 0.5, past the end plane, 138 open ends (own line) | up to 3.5 m+ (mean 2.19 m) | 0.00 m (max), alpha >= 0.05: 0.00 m |
| field, alpha >= 0.5 | up to 3.5 m+ | -0.05 m (inside) |
| gali_n1 start, whole network, leftmost drawn x east of the lane (map band starts 715.46) | 714.2 (1.26 m out, alpha>=.5), 713.8 (1.66 m, faint) | 715.4 (within one 0.4 m raster pixel) |
- `node tools/map-match-roads.mjs`: all roads match the map (dev 0.00, widths, kinds); dead ends max 0.00 m past the flat end.
- Whole network rasterised before/after (4 chunks, 0.4 m pixels): 4600 px (736 m2) of road lost = the removed round caps; 22 px (4 m2)
  gained, all next to an end. Lost pixels farther than hw + 2.5 m from any open end: 11 clusters of 1 to 3 px, all on soft edges.
  Pixels lost INSIDE the flat-capped map band by more than 0.3 m: 1 px (734.2,81.4; 0.16 m2).
- Holes at junctions: 116,846 points inside the band (0.5 m in from its edge, off footprints) tested: 92 more points undrawn than
  before, ALL within 0.6 m of a flat end plane (raster pixel quantisation at the crisp end); none anywhere else. Pictures
  tmp/rn_img/shops.png, lane.png (left old, right new): no gap at the T-junctions, end is a straight line.
- Road under footprints stays cut: pixels under a map footprint with alpha >= 0.5: 1211 before, 1188 after; deep inside footprints
  (> 0.6 m from the edge) with any road: 17 before, 17 after.
- `npm run build:unchecked` exit 0. `node tools/missions-check.mjs`: 399 PASS, 0 FAIL, 3 WARN.

## Task 2: small props re-review (tmp/audit/export5_roads.mjs + audit5_roads.py, her review rules)

380 props (milestones, wells, pumps, washing lines, signs, troughs, lamps, haystacks, pots, planner designs): 354 PASS, 26 EXEMPT,
0 FAIL. Closest pass: new_sign#111 at 0.12 m clear; every nudged prop in `layout-pack.mjs` NUDGE_IDS holds >= 0.12 m. Nothing moved,
`src/layout/mapData.json` needs no repack (props already nudged by the pack; I changed none of its inputs).
Exempt by design (26): 8 crossing booms/planks, 7 roundabout island pieces, 6 canal bridges, 3 gate pieces (the welcome arch crosses
main_road; its two pillars are 0.79 m and 0.80 m clear anyway), 1 culvert, 1 painted kabaddi line set.
`tools/road-clearance-props.mjs`: 0 doorstep clutter, planters, street furniture on a road after filter. `tools/map-match-props.mjs`:
203/203 solids, 568/568 trees, 62/62 ground, 62/62 crops built; only nudged items are the milestones/trough/platform already logged.

## Spawn check: vehicles, vendors, animals on a road band (listed, nothing moved)

Edge distance, negative = centre inside the band (flat-capped map bands). Not built under the new layout: `vendors.js`, `vendors2.js`,
`roadEvents.js` (all behind `!isNewLayout()`), the old lane cattle/laundry/water sites sit at old coordinates far west of the map.
Ride nooks (88) and long-walk sites (29) are skipped at run time by `onNewRoad(site, 3.5)` (src/rideNooks.js, src/longWalks.js), so
the 13 sites that sit on or within 1 m of a band never spawn. NPC routes (bazaarLife, gullyLife, mainRoadLife, cyclists) not touched.

Still standing on a band, for the owner of that file to decide (not in this scope's files):
- scooter `teastall` (src/scooters.js SCOOTER_SPOTS) at 587.7,6.7: centre 0.34 m inside cross_road (7 m wide).
- jeep `yard_panchayat` (src/jeep.js JEEP_SPOTS) at 563.4,4.6: centre 3.15 m inside cross_road, i.e. parked in the carriageway.
- pilot vehicles (src/pilotVehicles.js; REVIEW build only, `registerPilotVehicles` is behind `REVIEW`): tuk_tuk 604.2,42.8 (2.10 m inside
  main_road), thela_gadi 603.8,47.4 (2.44 m), moped 603.6,51.2 (2.89 m); auto_rickshaw 607.6,45.6 is 0.74 m clear, motorbike clear.
- field dog (src/main.js `zone_field_animals`, FIELD_CENTER + (4, 42.5)) at 607.5,-173.5: 1.09 m inside 26_Wheat field track (a farm
  track; the 6 cattle next to it are clear, nearest 0.93 m).
Clear: 2 ice cream carts, 4 map buffalo/cattle, 2 pond buffalo, 6 field cattle, 7 scooters, all other pilot vehicles.
Other things the rule review noticed (not props, not mine): place `new_433` (558,-43) overlaps gali_n35 by 0.41 m in
tools/road-clearance.mjs (a place, so the places agent's).
