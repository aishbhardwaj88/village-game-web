# Roads empty, H4 pass (25 Nov). Moves, never deletes. Test: tmp/roadempty4/*.mjs (band + wander/apron model of tmp/roadempty2/test.mjs, margin 0.6).

| Item | Before | After |
|---|---|---|
| s7 wall mural (690.9,-109) gali_n43 | 1.85 m onto the road | slid along its wall / narrowed off the road (src/kit/wallMurals.js: slide smallest first, then narrower, 5 points across) |
| s7 wall mural (464.9,-64.6) gali_n12 | 0.16 m into the apron | LEFT: the wall face itself stands on the apron edge, no slide on that wall clears it |
| other murals on walls that touch the apron | 7 at 0.05 to 0.16 m, 1 at (714.2,-73.9) 1.0 m (gali_n1) | LEFT, wall itself on the road/apron; 2 murals slid, 8 left (harness count) |
| s7_props well 558,-43 (gali_n35) | 0.58 m scan depth | pushed 1.12 m to (561.1,-42.3), clear 2.56 (src/kit/landProps.js) |
| s7_pump_cracked 553,-83 (gali_n20) | 0.07 m | pump slid 0.47 m to (551.7,-83.0), clear 1.53; type/turn keep their old seed |
| all other map wells, hand pumps, haystacks, dung stacks | 17 of 62 within 0.6 m of road+apron | slid 0.08 to 1.2 m, every one clear >= 1.52 |
| ride_nook_25_well (835,329.1) canal_bank_road | 2.74 m | slid 2.16 m east to (837.2,329.1), nook footprint 2.4 m round clear >= 0.6 (src/layout/layout-wiring-entry.js) |
| ride_nook_39_dung gobar (836.5,-302.3) | 0.12 m | slid 0.66 m east to (837.2,-302.3); ride_nook_9_hay slid 0.59 m |
| field_gate_wheat | 2.7 m | verified at its real spot (609,-168.2): leaf A 1.28 m, leaf B 2.83 m clear, whole 3.2 m leaves probed. No change |
| tubewell_v2 (place at 712.2,5.7) | 1.3 m on lane 13 | NOT MOVED: needs 1.0 m east in src/layout/placeMoves.js (file held by another agent). Entry: { src: 'yard_tubewell', ids: ['yard_tubewell','tubewell'], dx: 1.0, dz: 0, why: 'west corner on lane 13 apron' } (bbox then 0.83 m clear) |

Stale: the signs, lamp, pump and buffalo coordinates in tmp/roadempty2/test.mjs are the scan's pre-H2 positions, so its FAIL lines for them are not live results.
