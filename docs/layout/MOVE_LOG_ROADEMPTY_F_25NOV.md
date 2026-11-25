# Roads must be empty, fixer F (25 Nov): wheat track crop clearance + Crockery sign

## 1. Wheat field track (26_Wheat field track, width 4, kind track)
- src/field.js TRACK_CLEAR 2.15 -> 2.97 (moved, nothing deleted).
- Drawn edge = half width 2 + edge wander 0.45 x 1.4 (roadNetwork.js ROAD_KINDS.track amp) = 2.63 m; + 0.3 m margin = 2.93; +0.04 for the track's lean.
- Used by: both field ground halves (cut at the track), every crop row (plus 0.65 m tuft reach, so no plant tuft inside 2.97), cane clumps, verge plants.
- Rows simply start further from the track; the khet stays filled. No plant or scarecrow code placed inside the clear band.
- Other field tracks (23 West, 24 East, 25 Main road field tracks) have no crop code that reads them (only field.js knows tracks); nothing else changed.
- NOT MINE, flagged: src/main.js 'field_animals' (FIELD_CENTER.x + 8, z - 176, buffalo) stands about 2.9 m from the track centre line, just inside the drawn edge + 0.3 m. Needs x about +0.5 east or west; owner of main.js to move it.

## 2. Crockery sign new_sign#114 (was REMOVED by fixer B)
- Map rect (620.5, 24.0), w 3.2, front -z. It sat inside the cross_road edge (z < 23.85) and the inner_se lane edge (x > 621.83), so no slide along its front axis cleared both.
- src/kit/mapSigns.js: for #114 only, after the normal slide fails, it also slides sideways along its board (west, away from the lane), then back from the road. Result: about (620.05, 24.4), board clear of both drawn edges by >= 0.3 m. Reported on window.__s7mapsigns.roadEmpty (from, to, slide, side).
- No Crockery shop exists in mapData.json (only this sign carries the name; nearest shops are the Tea/Stationery row at x 628.6/633.1, front wall z 24.4). So the board stands on its two posts at the row's front-wall line (z 24.4), west end, beside the lane, not on a road. If a Crockery shop is added there later, the sign is already at its front line.

## Checks
- npm run build:unchecked OK (budget advisories known, not mine).
- missions-check: 398 PASS, 0 FAIL, 3 WARN. road-clearance-props: 0 after filter. map-match-props: no new diffs.
