# School checklist — Places V1/school/MAIN_school_elevations.png + MAIN_school_courtyard_topdown.png

Same rule as `docs/house-checklist.md`: a row is ticked only with `docs/shots/compare/school.png`
(reference left, in-game normal-mode render right) or a named close-up under `docs/shots/compare/school/`.
Built by `tools/blender/build_school.py` (`tools/blender/make.sh school school_compound`), exact slot `school_compound`, old geometry kept hidden as `school_old`. Compare image `docs/shots/compare/school.png`; close-ups in `docs/shots/compare/school/`. Layout is the gameplay U-shape from MAP.md (main block + two wings round the yard), with the reference's architecture applied to each block.

| # | Element (every visible thing in the references) | Status | Proof |
|---|---|---|---|
| 1 | Long single-storey flat-roof main block, cream limewash, ochre plinth band (~1 m) | [x] | compare/school.png |
| 2 | Two ochre string-course bands + deep roof overhang/coping on the parapet | [x] | compare/school.png |
| 3 | Front verandah: 5 square pillars with ochre bases, flat beam, wooden-floor/step apron | [x] | compare/school.png |
| 4 | Barred windows (3 front, 4 high horizontal on the back) with dark wood frames | [x] | compare/school.png |
| 5 | Dark wood panelled doors (2 front, 1 side), one ajar | [x] | compare/school.png |
| 6 | Blackboard with chalk shapes/numbers on the verandah wall | [x] | compare/school.png |
| 7 | Brass school bell hung from the verandah beam (bell rope) | [x] | compare/school.png |
| 8 | Two wooden benches with a row of coloured school bags | [x] | compare/school.png |
| 9 | Steel water drum on a stand + a small can, at the east end | [x] | compare/school.png |
| 10 | Black roof water tank with vertical pipe; two vertical drainpipes on the walls | [x] | compare/school.png |
| 11 | Flower bed with marigolds along the verandah front, grass strip in a brick border | [x] | compare/school.png |
| 12 | Boundary wall around the yard, cream with ochre plinth + ochre coping | [x] | compare/school.png |
| 13 | Entrance: ornate dark iron double gate between two pillars, bougainvillea beside it | [x] | compare/school.png |
| 14 | Hand pump on a concrete platform with a water trough; row of children's bicycles | [x] | compare/school.png |
| 15 | Flagpole on a stepped concrete base (exists in code — keep position/interaction) | [x] | compare/school.png |
| 16 | Chalk hopscotch + cricket pitch markings on the dirt yard | [x] | compare/school.png |
| 17 | Raised brick ring around a big neem tree; big tree with swing tyre and kites — ring done, the tree in it is the code stand-in; the big swing-tyre/kite tree is a Tripo tree job | [~] | compare/school.png |
| 18 | Fenced vegetable garden plot with wooden fence | [x] | compare/school.png |
| 19 | Open-fronted corrugated-tin shed with stacked firewood | [x] | compare/school.png |
| 20 | Line of tall eucalyptus trees behind the school (trees come from Tripo) | [ ] | |
| 21 | Parked cream scooter outside the gate | [x] | compare/school.png |
| 22 | Real wall thickness/bevels, baked AO, CC0 textures, cared-for | [x] | compare/school.png |

Gameplay to keep: west-wing classroom interior (blackboard write, bench sit), donation board,
school-out kids, flagpole, validator reachability for `blackboard` / `school_bench`.
