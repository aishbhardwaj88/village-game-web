# Roads empty, H1 (buildings), 25 Nov

Check model: tmp/roadempty2/*.mjs. Real road surface (src/roadNetwork.js sampleSurface on allRoadLines(), alpha >= 0.5 = drawn road plus dust apron) against the real model vertices and triangle centroids (0.07..3 m high) at the built anchor, with a 0.3 m margin. The live scans used round-capped centrelines, so their depth at the flat ends of dead-end lanes (gali_n15/16/32/38/39/27/8) is not real: the drawn road stops at the end point, the buildings there are 0.3 m+ clear of the real surface.

| Item | Action | Before / after |
|---|---|---|
| placebatch_concrete 4.42 m (595.2,-60.8) and (585.5,123.5) | IDENTIFIED, not a building: dung pats of the cow-lying-in-the-road event (src/roadEvents.js COW_SITE, main_road seg 3) merged into the shared concrete batch; the second spot is the same kind of road event on main_road_s. Not my file, not moved. | needs the roadEvents.js owner |
| temple 2.55 m (680,-87) | the temple itself is clear (0 hits). The part on lane 12 is the FLOWER STALL (merged into blender_temple). Moved FLOWER_STALL_POS (src/temple.js) +0.25 E, +0.75 S | 0.5 m deep -> 0.3 m clear |
| yard_bus_adda (525.5,-119.5) | moved 1.0 m south (placeMoves dz -2.5 -> -1.5), 1.5 m from map spot | 0.6 m deep -> 0.3 m clear |
| anganwadi playground / yard wall (569.5,89.9) | moved 2.5 m south (placeMoves dz 0.15 -> 2.65), 2.65 m from map spot, turn unchanged | 2.3 m deep -> 0.3 m clear |
| yard_matboard material board (561.7,6.9) | moved 2.8 m south (placeMoves, reference yard, no map spot) | 2 m deep -> 0.3 m clear |
| yard_houses kit_c / kit_d / kit_b (farm loop) | whole reference row moved 22 m east (placeMoves, no map spot, not a village place); a clip was impossible (the loop band itself ran under both houses) | kit_c, kit_d on the band -> 0 hits at 0.3 m |
| paani tanki, tv_house_v2, old_haveli, gaushala (x2), jain_mandir, puncture_v2 | NO CHANGE: dead-end cap artefacts of the scan; real surface 0.3 m+ clear | 0 hits at 0.3 m margin (glb scan) |
| halwai / hb_main (592,10) | no change, 0 hits at 0.3 m | |

apronClip.json: nothing appended (no clip needed).
Left for others: shops (sqx) at (594.5,-27.4), (594.6,-22.9), Optician (569.6,-3.0), Tailor (711.6,-73.1) are flagged by shopsPlace's round-capped self check ("into a road"), map-match-shops reports 0 overlap.
