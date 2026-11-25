# Roads empty: legacy removals, 25 Nov (her order: "if there is anything on the road, remove it")

Method: tmp/legacyroad/audit.mjs runs every unconditional legacy builder in node (new layout), takes the REAL mesh vertices
(forecourt furniture, awnings, capsule people included) and tests them against the map road bands (flat caps, tools/map-match-roads.mjs
reading) and the drawn road surface (roadNetwork sampleSurface alpha >= 0.5, was 1.00 at every hit, so the drawn surface equals or exceeds the band). Hit = clearance < 0.1 m.
Cause: these were placed by fixed offsets from ANCHORS (old layout), not from the final map, so earlier map audits never saw them.

## Removed (each behind a constant, set false to restore; no file deleted)
| Item | Where (x, z) | Road | Depth | Constant |
|---|---|---|---|---|
| Mithai kiosk (chulha + kadhai, shopkeeper capsule, sign, collider) | 602.9, 36.4 | main_road | 4.0 m (centre of road) | SMALL_SHOPS_REMOVED_25NOV (src/smallShops.js) |
| CD / cassette shop (+ people) | ~589.7, 13.9 | cross_road | 3.2 m | same |
| Book stall (tarpaulin, jute, +people) | ~586.3, 12.6 | cross_road | 1.5 m | same |
| Milk collection centre (shed, cans, scale, queue, cyclist, sign, colliders) | 597.3, 49.3 | main_road | 1.4 m | MILK_CENTRE_REMOVED_25NOV (src/milkCentre.js); the map's own Milk collection point shop stays |
| Jhoola (swing) | 495.8, 3.3 | cross_road | 2.2 m | ON_ROAD_REMOVED_25NOV (src/villageFurniture.js) |
| Bhootiya ghar ruin + scrawl decal | 505.4, -1.0 | 15_Outer lane, west + cross_road | 2.0 m | RUIN_REMOVED_25NOV (src/villageFurniture3.js) |
| Tree-snagged kites whose point is within 1 m of a band | e.g. 444.8, -7.5 | cross_road | 3.5 m | generic mapBandClearance check in src/villageFurniture4.js |
| Wall-writing decal "shaadi card" (Sweet shop halwai wall) | 642.3, 19.7 | cross_road | 3.3 m | commented out in src/wallWriting.js |
| Wall-writing decal "To Let" (General store wall) | 624.0, 51.4 | inner_se | 1.7 m | commented out in src/wallWriting.js |

Colliders, signs, shopkeeper capsules and the batch meshes of the three small shops and the milk centre are created inside those builders, so skipping them removes all of it.
No mission, minimap marker or interaction referenced them (grep: none outside the builders); missions-check 398 PASS, 0 FAIL.
Nothing new was added anywhere. The three small shops are not in the final map (it has no bookstall, CD shop or mithai kiosk), so they stay removed.

## Already off in the new layout (isNewLayout gate in main.js), would have been on road: vendors.js, vendors2.js, nostalgia.js, roadEvents.js, villageOddities, villageFixtures, chaurahaEdges.
Audit showed vendors.js alone had 7 meshes up to 4 m deep in main_road, so keep the gate.

## Not checked by the audit (0 meshes in node, models load async or the builder is map-driven): mainRoadLife, lifeScenes2, armFrontage, mainRoadFrontage, gullyLife, iceCreamCarts, scooters, cyclistEvents*, bazaarLife and every GLB-based prop. These need an in-browser scan (no scene handle on window yet).
Not verified live: the GitHub Pages site is blocked from this sandbox (proxy 403).
