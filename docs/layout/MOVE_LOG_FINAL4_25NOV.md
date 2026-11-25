# Final four, 25 Nov (her answers to the four listed-left items)

Rule: nothing stands on a road band (polyline buffered width/2, flat caps, docs/layout/approved-map-2026-11-25.json), 0.1 m clear.
Checks: `node tools/map-match-places.mjs` (46 checked, 0 flagged, KNOWN_LEFT now empty), `node tools/map-match-shops.mjs`, `node tools/missions-check.mjs` (0 FAIL), `tmp/audit/run4.sh` (mela, pond, field = OPEN-PASS).

## 1. Mela ground (anchor mela, 782,-103) - smaller
- Anchor yaw is pi, so site +z points at the highway and site -z at gali_n0. Old box x -10..19.4, z -13..13.5 (13.8 m2 on highway + gali_n0).
- New box x -10..19.4, z -10..13 (was 29.4 deep, now 23): 3 m off the gali_n0 side, 0.5 m off the highway side. The exact 5 m was not needed: 3 m leaves 1.5 m clear of gali_n0; the highway side needs 0.5 m (gap 0.2 m).
- Contents: trampled ground blob refitted inside the new box (it was a 28 m radius blob that reached both roads), three stalls pulled in from z -12/-6/0 to -8.5/-3.5/1.5 (colliders the same), swing, shamiana, stage, benches and signboard unchanged. Entrance side (highway, front) unchanged.
- Size: 29.4 x 29.4 m box -> 29.4 x 23 m. Files: src/farmSites.js createMelaGround, src/layout/footprints.js. No mission points sit on the mela.

## 2. Pond (anchor pond, 493.8,19.7) - smaller, same centre
- The real outline (bank rim, mud ring, ghat steps) reached 15 m east, so 1.5 m was not enough: Outer lane west is 12 m from the centre. Water radius R 9.6 -> 6.7 (one shared formula drives water, bank, ground hole, walk height, colliders, lotus, buffalo, so they stay consistent). Ghat steps follow the shore (they read R). Lotus clusters scaled 0.7; the two pond buffalo offsets scaled 0.7 (src/main.js).
- Clear now (independent outline check incl. mud ring): Outer lane west 0.12 m, cross_road 4.4 m, gali_n23 4.4 m. Footprint box 13 -> 10.4 (tool gap 1.6 m).
- Files: src/dips.js (R), src/farmSites.js (lotus), src/main.js (buffalo), src/layout/layoutSnap.js (snap radius), footprints.js.

## 3. Wheat field (anchor field, 603.5,-216) - split in two
- Track = 26_Wheat field track (x 608.6 to 610.5 across the khet, width 4). The khet is now two halves: west half (stubble + gold ground, world x 548.5 to track) and east half (track to 658.5).
- Ground: the gold ground is two meshes, 'field_ground' (west) and 'field_ground_east', their rows warped to follow the track's lean, ending 2.15 m from the centre line (2.0 half width + 0.15; 0.1 m clear even at its 3 deg lean). Crops (tufts, cane, sarson, veg) skip anything within 2.15 + 0.65 m (cane 1.6) of the centre line, so tufts stop at least 0.1 m from the edge. Track verge plants skip the track. The track itself is untouched (nothing on it). No colliders or gates stand in the khet; the two field gates at z -152 are 3.4 m clear.
- Footprint: `field` now has `boxes` = west half local x -2.5..55, east half -55..-10 (z +-40). tools/map-match-places.mjs sums the boxes; mela/pond/field removed from KNOWN_LEFT.
- Files: src/field.js, src/layout/footprints.js, tools/map-match-places.mjs.

## 4. Optician (570.59,-3) - NOT swapped, nothing changed
- Gap between the Inner loop band and gali_n41's flat start is 4.3 m; the Optician is 4.4 m (4.54 built). Tried every narrower shop in the shops list (54 candidates, all narrower than 4.35 m) with the pack tool's own tests (both footprints 0.1 m clear of every band, no hit with any other building).
- 0 feasible. No full shop is narrower than 4.35 m (every 2-storey shop is 4.4, single shops 4.5 to 5): only carts (1.8 to 2.5 m) and kiosks (3.2 m) are narrower, and their spots cannot take a 4.4 x 7 m shop (clearance -1.0 to -2.2 m, or a hit on a neighbour: Chai cart, Kulfi cart + Snacks cart, house, tea stall, halwai, sabzi). Best case, Kulfi cart's spot, hits the Snacks cart by 1.0 m.
- Left as listed in MOVE_LOG_SHOPS_25NOV.md: the Optician stays 1.17 m into gali_n41. Fix needs her call (shorter gali_n41, or a 3.9 m plot).
