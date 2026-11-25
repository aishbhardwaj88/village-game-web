# H3 road log, 25 Nov
- A) gali_n44 cut short: ROAD_TRIMS in tools/layout-pack.mjs, 6.4 m off the pond end, flat end now (656.07,-101.23), about 0.6 m clear of the Temple pond steps ring (outer edge z about -100.4). Pond untouched. mapData.json repacked (also re-derived 7 small building shifts, max 3.8 m for new_house#423, from other pending input changes; pack takes ~4 min).
- map-match-roads: expectation applies the same ROAD_TRIMS ("her answer 25 Nov"); all roads match. missions-check 0 FAIL (399 pass, 3 warn).
- B) Apron clip: src/layout/apronClip.json (array of {x,z,w,d,ry,note}, rotated rects in world metres), read once at build in src/roadNetwork.js. Removes only the fade zone (signed distance >= -0.25 m), never the core. Grid is 0.8 m, so the clear zone is rect + 0.1 m + one cell, easing back over 0.5 m.
- Verified with a test entry (alpha 0.70 and 0.24 at the apron became 0.00, core stayed 1.00); test entry removed, file is [].
