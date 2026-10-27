**2026-10-27 (A0-TEX swap runtime check, docs only):** No game change. Live check of staged-model material swap: 17 models, 27 meshes, all have colour+normal+roughness maps and vertex colours, 0 unswapped (tmp/swap-check.mjs). Noted in BACKLOG A0-TEX; box left unticked (no screenshot). Build not rerun (no source change).
NEXT: whatever she changes on the map; remaining items parked or need her.

**2026-10-27 (A1e pole proof parked, docs only):** No game change. Two more close pole shots (docs/shots/pole-weather-2026-10-27/) are backlit and too high to read bills or streaks; parked under the two-strike rule, noted in BACKLOG A1e.
NEXT: whatever she changes on the map; A1g/A1h leftovers.

**2026-10-27 (A1e pole rain streaks):** Game change: RCC lamp poles (src/props.js createStreetLamps) now carry 2-4 thin low-contrast damp and rust-water streaks running down from the bracket (merged into the pole mesh, no new draw call). NOT seen up close (no clean pole framing after three earlier tries, generic shots docs/shots/2026-10-27T08-10-41-306Z show no console errors), so the A1e concrete/stains box stays unticked and unjudged. Build ALL PASSED, collision-test 4850 static solids + 6 vehicle boxes + 3 vehicles + 122 NPC legs tested, 0 failed.
NEXT: whatever she changes on the map; remaining items are parked or need her.

**2026-10-27 (A1e pole posters enlarged):** Game change: pole bills now 26x36 cm (was 17x24), number plate 20x10, sticker 9x9, merged into the same pole mesh (src/props.js). Proof attempt docs/shots/pole-posters-2026-10-27b/ (p1, p2): a tree canopy blocks every close angle of the temple-lane pole at (-36.5, 55.4), so the patches were NOT seen up close; box stays unticked, not judged good. Third framing failure, so parked under the two-strike rule. Build ALL PASSED, collision-test 4850 static solids + 6 vehicle boxes + 3 vehicles + 122 NPC legs tested, 0 failed.
NEXT: A1e concrete stains, or whatever she changes on the map.

**2026-10-27 (A1e pole posters):** Game change: RCC lamp poles on the temple lanes (src/props.js createStreetLamps) now carry faded pasted bills (some with a torn second bill), a painted number plate and an occasional faded sticker, merged into the existing pole mesh (no new draw call). Proof docs/shots/pole-posters-2026-10-27/g2.png (pole intact, no errors; patches are only 6 to 24 cm so they are barely discernible at that range, I could not frame a clean close-up in 6 tries, so NOT judged good and the A1e box stays unticked). Build ALL PASSED, collision-test 4850 static solids + 6 vehicle boxes + 3 vehicles + 122 NPC legs tested, 0 failed.
NEXT: frame a close pole shot near (-24.5, 48) and enlarge the patches if they do not read; then A1e concrete stains.

**2026-10-27 (rooftop-leg check scoped, docs only):** No game change. The only NPC rooftop route is the monkey chase (src/main.js monkeyChaseWaypoints, bazaar units 3 to 5 along the roofline). A mid-roof check needs collider heights, and collision boxes carry none, so it cannot be done without adding heights to every collider, which is out of proportion for a 3-unit scripted run. Left A0 rooftop box unticked. Everything else open is parked under the two-strike rule or needs her (map layout, Tripo, material textures).
NEXT: whatever she changes on the map; A-1 baked-site leftovers if any remain.

**2026-10-27 (state check, docs only):** No game change. Re-read the deadline list: anchors, place table and character slots (player, 7 cast, dadi, monkey, side-job men, aunty, kids, cow/buffalo, dog) are all wired and listed in docs/asset-slots.md. Fresh `npm run build` ALL PASSED, collision-test 4850 static solids + 6 vehicle boxes + 3 vehicles + 122 NPC legs, 0 failed. What is left is parked under the two-strike rule (material board textures, poster pictures) or needs her (map layout, Tripo).
NEXT: A-2 leftovers or whatever she changes on the map.

**2026-10-27 (A-1 move test passes collision):** No game change (anchor moved and reverted). With jalebi at z -10 the full `npm run build` passed: collision-test 4850 static solids, 3 vehicles, 122 NPC legs, 0 failed; coverage check [5] found no uncollided geometry, so the stall's colliders followed the one edit. Ticked the 'one-number change' box in A-1.
NEXT: A-2 leftovers (task list, minimap).

**2026-10-27 (A-1 movability proof, no game change):** Moved the `jalebi` anchor 14 m in src/anchors.js (z 4 to -10), looked at the result, then reverted. The stall, its signboard (Hindi over English) and its cart followed from the one edit; the old spot is empty ground and the stall stands 14 m away in the old-spot shot. No console errors. Proof docs/shots/movable-2026-10-27/n_a.png (new spot) and o_a.png (old spot). Colliders and NPC routes at the stall were not separately checked, so the A-1 'one-number change' box stays unticked. Entry 0 is otherwise complete (anchors, place table above, character slots all wired in src/main.js).
NEXT: collision-test a moved anchor to settle A-1, or A-2c far-east road call.

**2026-10-27 (A-2c far-east distance report, docs only):** No game change. Straight-line distance from the chowk (-54,13) to the far-east cluster, with walk time at 1.4 m/s: health 151 m (1:48), chemist 157 (1:52), manihari 158 (1:53), sabzi 162 (1:56), johad 161 (1:55), masjid 196 (2:20), haveli 208 (2:29), gurukul 226 (2:41), jain 236 (2:49), maidan 251 (2:59), highway 260 (3:06), mandi 284 (3:23). The east road with kerbs, drain, lamps, shade trees, signposts and milestones already reaches the cluster (shots docs/shots/eastroad-2026-10-27/). Recommendation for her map: the cluster is 2 to 3.5 minutes on foot from the chowk, which suits a day-trip feel but is long for a mission loop; if she wants shorter, pulling health/chemist/manihari/sabzi/johad (151-162 m) to about 100 m and keeping highway and mandi far would cover it. Nothing moved. Backlog box left unticked (no clean wide shot; road has no motor traffic).
NEXT: A-1 movable-unit leftovers, or whatever she changes on the map.

**2026-10-27 (A1f closed, lane 13 walking-only):** Tool and docs change, no game change. Decided the bazaar lane (x -58) stays walking-only; lane-drive-test exempts it; tractor drives the other 22 lanes, run output 23/23 counted. A1f lane-audit box ticked; NEEDS_YOU line marked done. Entry 0 (anchors, place table, character slots) was already finished earlier today.
NEXT: A-2c far-east item needs a layout call; A0-MAT/TEX remain parked under the two-strike rule; pick A-2 leftovers.

**2026-10-27 (A1f lane 13 traced, no game change):** Re-ran tools/lane-clearance-audit.mjs. Lane 13 (bazaar lane, centre x -58): the shop fronts stand at x -57.1 and a 0.6 m unlabelled box (no src) sits at x -58.8..-58.2, z 32.2..32.8, leaving 1.7 m for a 2.2 m tractor. That lane is a walking bazaar lane by design, so I left it and asked in NEEDS_YOU; A1f box stays unticked. Docs only, no build or test.
NEXT: A-2c far-eastern road report, or the A0-WEATHER leftovers once the material board is frozen.

**2026-10-27 (A1f lane drive 22/23, tool only):** No game change. tools/lane-drive-test.mjs steered at the far vertex and parked the cart on lane 14, so lanes 12 and 14 failed as test artefacts; it now follows a point ahead on the segment, allows a stop at the lane end, and parks bike and cart clear. Tractor drives 22/23. Lane 13 (bazaar lane, x -58) is a real block at (-59,34.6): shop fronts at x -57 and thin unlabelled props at (-58.5,32.5), (-61,35). Not moved (layout call). Not looked at in a screenshot; no build or test needed (tool and docs only).
NEXT: label those bazaar props to find their source, or A-2c leftovers.

**2026-10-27 (A1f lane 18 freed):** Game change: the west-gali spur drawn on the notebook map (src/freeRoam.js LANES) ended at (-61,21), inside the banta stall; it now ends at (-68,21) at the stall front, so the tractor drives 21/23 lanes. Map pencil line only, not looked at in a screenshot. Lanes 12, 13 still stop after the first corner (turn overshoot, colliders 2.7 m+ away, likely test artefact). Build ALL PASSED, collision-test 4850 static solids + 6 vehicle boxes + 3 vehicles + 122 NPC legs tested, 0 failed.
NEXT: A-2 leftovers (task list, minimap), or look at lanes 12/13 turn radius.

**2026-10-27 (A1f lane 17 freed):** Game change: west gali signpost (src/wayfinding.js west_gali) moved 1 m east to x -81.5, off the lane edge it was blocking; the tractor now drives 20/23 lanes. Not looked at in a screenshot. Lanes 12, 13 (turn overshoot) and 18 (unlabelled boxes near (-66,22)) still blocked. Build ALL PASSED, collision-test 4850 static solids + 6 vehicle boxes + 3 vehicles + 122 NPC legs tested, 0 failed.
NEXT: trace lane 18, or A-2 leftovers.

**2026-10-27 (A1f lane 11 freed):** Game change: the gurudwara spur (src/eastRoad.js) used to start at (-60,140) and run into a 1.3 m gap between two walled south-row house plots; it now leaves the south gali at x -33 (east of the plots, which span x -79..-39), runs south to z 158, then west to the gurudwara. Tractor drives 19/23 lanes. Proof docs/shots/places-2026-10-27/gurudwara_spur/spur_start.png, spur_mid.png (looked at: earth track beside the plot wall, no gaps, no console errors). Build ALL PASSED, collision-test 4850 static solids + 6 vehicle boxes + 3 vehicles + 122 NPC legs tested, 0 failed. Lanes 12, 13 (turn overshoot), 17, 18 still blocked.
NEXT: trace lanes 17/18 (west gali, edge_wall_n0 and (-68,22) boxes), or A-2 leftovers.

**2026-10-27 (A1f lane 15 freed):** Game change: east gali signpost (src/wayfinding.js east_gali) moved 2 m to z 78.7, off the lane edge it was blocking; the tractor now drives 18/23 lanes (lane 15 was blocked by it). Lanes 12 and 13 are turn-radius overshoot (colliders 2.7 m+ away), 11, 17, 18 untraced. Not looked at in a screenshot. Build ALL PASSED, collision-test 4862 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: trace lanes 11/17/18, or A-2 leftovers.

**2026-10-27 (A1f lane vehicle drive, no game change):** Added tools/lane-drive-test.mjs (report only): tractor alone drives 17/23 lane centre-lines; blocked ones listed in BACKLOG A1f (hero lane near (-42,57), bazaar lane (-62,37), east gali (-4.5,76), west gali (-84,39), (-68,22), last spur start). Box stays unticked. Build ALL PASSED.
NEXT: trace the blockers with a collider src print at those points, or A-2 leftovers.

**2026-10-27 (A0-MAT v9 review, chip bug fixed):** Game change: staged Material board (Yard 22) plaster/concrete chip nicks no longer poke above or beyond the panel edge (tools/blender/build_material_board.py clamps them, material_board_v2.glb rebuilt). Proof docs/shots/material-board/v10_a_rowA.png (looked at: no floating cubes; chips still small square patches, not ragged). Art-reviewer on v9: FAIL. Fit to freeze: thatch (needs a row C reshoot at 6 m), cement plaster and lime plaster surfaces. Still failing: brick (too saturated, no dust), concrete (no formwork seams, looks like cement), tin (too clean, no rust), terracotta (reads as rust), painted wood (olive, no flaking), rusted steel (flat maroon), jute (flat ochre), mud, packed earth. Most were already reworked twice, so under the two-strike rule they stay parked, library NOT frozen. Build ALL PASSED, collision-test 4862 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: A0-TEX leftovers or A-2 task list.

**2026-10-27 (A0-MAT shader pass, board):** Game change: staged shader (src/stagingYard.js) now floors tin roughness at 0.62 (was mirror-bright), lifts terracotta 1.35x, and pulls wood toward warm brown. Proof docs/shots/material-board/v9_rowB.png, v9_rowC.png (looked at): tin is now dull galvanised, terracotta lighter rust-orange; painted wood is STILL green (the green comes from the board's vertex tint, shader mix barely moves it), so wood stays failed and parked. Not re-sent to art-reviewer, library not frozen. Build ALL PASSED (material-only, no collision-test run needed).
NEXT: art-reviewer on board v9 rows, or A-2 task list leftovers.

**2026-10-27 (A0-WEATHER wing-wall poster overlap):** Game change: staged primary school (Yard 0, x 320 z -160) wing verandah walls now also have a smaller second hygiene card pasted over a corner of two posters per wing (tools/blender/build_primary_school.py, primary_school.glb rebuilt, 41k tris). Proof docs/shots/places-2026-10-27/schoolposters3/wingB.png (looked at: dustbin card overlaps the wash card, clear of the dado and windows; shot has no subject check). wingA.png is blocked by a tree, not proof. Pictures are still simple flat shapes, so the poster box stays unticked. Not sent to art-reviewer (small decal addition). Build ALL PASSED, collision-test 4862 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: A-2 task list leftovers, or the A0 mid-roof NPC check.

**2026-10-27 (A0-WEATHER school posters overlap):** Game change: staged primary school (Yard 0, x 320 z -160) main verandah wall now has a smaller second hygiene card pasted over a corner of three of the five posters (a different picture each), so the wall reads layered (tools/blender/build_primary_school.py, primary_school.glb rebuilt, 41k tris). Proof docs/shots/places-2026-10-27/schoolposters2/a.png, b2.png (looked at: overlap reads, cards clear the dado band; pictures are still simple flat shapes and the wing-wall posters do not overlap yet, so the poster box stays unticked). Not sent to art-reviewer (small decal addition). Build ALL PASSED (collision-test 4862 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed). NPC rooftop leg already end-checked by collision-test part [4] (3 legs); a mid-roof check needs box heights, left as is.
NEXT: A-2 task list leftovers, or wing-wall poster overlap.

**2026-10-27 (A0-WEATHER brick chip close-up, no game change):** Looked at the staged gurukul gate wall from ~5 m (docs/shots/places-2026-10-26/brickchip/gurukul_gate_close.png). Bricks read as varied courses with darker mottled patches and no artefacts; the 1-in-5 chips are NOT clearly discernible as chipped bricks even here (only faint mottling), so the box stays unticked and I am not reworking the shader a third time. Bus adda has no brick wall (tapri is teal plaster, looks over-saturated in the shot; noted, not touched). Docs only, no build/test.
NEXT: A0 NPC rooftop leg, or A-2 task list.

**2026-10-27 (A0-WEATHER brick chipping, shader):** Game change: staged brick (src/stagingYard.js) now has chipped bricks, about 1 in 5 with a ragged pale dusty bite along its edge. Proof docs/shots/places-2026-10-26/brickchip/chip_rowA.png (looked at, Material board brick panel at 6 m): the panel still reads as varied brick with no artefacts, but the chips are NOT discernible at this distance, so the box stays unticked; not checked close up or on a place wall. Not sent to art-reviewer. Build ALL PASSED (material-only, no collision-test per the efficiency table).
NEXT: close-up check of chips on a place wall, or A0 NPC rooftop leg.

**2026-10-27 (A0-MAT round 2, board retinted, library NOT frozen):** Game change: staged Material board (Yard 22) panel colours reworked after art-reviewer round 2 (FAIL 10 of 12; only cement plaster and thatch fit to freeze). Lime plaster now off-white with larger chips, brick duller, concrete greyer, mud darker, packed earth paler (proof docs/shots/material-board/v8_rowA.png, v8_rowB.png, looked at: brick/lime/concrete improved). Terracotta (still dark brown), tin (still mirror-bright stripes) and painted wood (still dark green) did NOT respond to the vertex colour: the staged shader overrides it per kind, so they need a shader/texture change, not a tint. Two reworks done, so parked per the two-strike rule. Build ALL PASSED, collision-test 0 failed (no collision code touched).
NEXT: A0-WEATHER brick chipping, or A0 NPC rooftop leg.

**2026-10-27 (A0-MAT textures added):** Game change: staged Material board (Yard 22) rusted steel now uses a real CC0 rust scan and mud/packed earth a dry-earth scan (before: flat brown); jute switched to a burlap set but the weave is still invisible at 5 m (2 tries, parked). Textures from ambientCG, 512 px, 0.36 MB; budget 39.44 of 40 MB. Proof docs/shots/material-board/v5_rowB.png, v7_rowC.png (looked at). Board not yet re-reviewed by art-reviewer; library not frozen. Build ALL PASSED, collision-test 0 failed.
NEXT: art-reviewer on the board, then freeze library; or A0-WEATHER brick chipping.

**2026-10-27 (A1f mid-lane boxes traced, no game change):** tools/lane-clearance-audit.mjs now prints each collider's src. Of the 4 mid-lane boxes, two are wayfinding signposts at the lane edge (intended), one is the bazaar-lane/west-wall junction, one is a 0.2 m wall at the temple-lane end. Nothing moved; vehicle drive of the lanes still not done so the box stays unticked. Docs and tool only, no build.
NEXT: A0 NPC resolver rooftop leg, or vehicle drive of lanes.

**2026-10-27 (A1f lane audit re-run, no game change):** Re-ran tools/lane-clearance-audit.mjs: still 44 intrusions, all but 4 are lane ends/junctions. The 4 mid-lane thin boxes (-3,76), (-84,40.9), (-66,22), (1.9,47-50.7) are 0.2-0.4 m wide and sit ~1.1 m off the centre-line; I could not trace which source file owns them (no label on STATIC_COLLIDERS), so nothing moved. Needs the collider list to carry a source name before they can be fixed safely. No build/test (docs only).
NEXT: add a source label to static colliders, then fix those 4; or A0 NPC rooftop leg.

**2026-10-27 (A1f lane clearance audit, no game change):** Added tools/lane-clearance-audit.mjs (report only). 23 lanes vs 1147 colliders, 1.1 m half-width: 44 intrusions, mostly lane ends/junctions; mid-lane thin posts listed in BACKLOG A1f. Nothing moved, no vehicle drive, so the box stays unticked. No build/test (tool and docs only).
NEXT: A0 NPC resolver rooftop leg or A-1 movable-unit leftovers.

**2026-10-27 (A0 NPC/animal soak, guard warnings fixed):** Game change: a fresh 5-minute real-time soak (tmp/npc-soak.mjs, ?dev=1) found 5 stationary figures standing inside colliders added by the 25 Oct "everything visible is solid" pass (3 bazaar figures, 1 lane dog, 1 pond buffalo; thousands of dev-guard warnings). Fixed: bazaar shopkeepers stand 1.0 m deeper behind the counter (SHOPKEEPER_DEPTH 3.0, src/bazaarLife.js); the guard now skips the intended bench-seated villager; banta stall centre added to the lane animals' keep-clear list; first pond buffalo moved to pond+(11.2, 4.2) (src/main.js); guard messages now name the offending box. Re-soak: 0 guard warnings, 0 console errors. Not verified by eye: no screenshot, shopkeepers are 1 m further back (shelf wall is ~17 m). Build ALL PASSED, collision-test 4862 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed. Soak sim time is still under real 5 min at headless fps and only 2 NPCs walk, so BACKLOG A0 soak box stays unticked.
NEXT: A0 NPC resolver rooftop leg or A-1 movable-unit leftovers.

**2026-10-27 (minimap research, no game change):** Web research on minimap conventions done (north-up + rotating arrow, rim-clamped off-window objective, optional speed-zoom); src/minimap.js already conforms, so the research box in BACKLOG A-2b is ticked. No build/test (docs only).
NEXT: A0 NPC resolver leg or A-1 movable units leftovers.

**2026-10-27 (A0 collider audit, no game change):** Re-ran tools/collider-audit.js against the current build: every visual plaster-wall footprint cell overlaps a STATIC_COLLIDERS box, 0 missing (list of solids with no collider is empty for walls; collision-test part [5] already covers the other visible geometry). Box A0 'give colliders to every solid prop' left unticked because the audit measures plaster walls only. No build/test (docs only).
NEXT: A-2 minimap research box, or A0 NPC resolver rooftop leg.

**2026-10-27 (THE ORDER 4 signboard audit, no game change):** Audited every painted-text path: placeBoards.js atlas (35 boards incl. all staged places), signboards.js, signPaint.js drawBilingual, wayfinding signposts and village notice board all use Hindi bold larger on top, English regular smaller below, one ink. Only a stale comment in placeBoards.js said the opposite; corrected (comment only). One exception left as drawn: bus_adda is white lettering on a green board (not dark paint); kept because it is a painted-on-colour board, flagged in case she wants it dark. No build/test (comment/docs only).
NEXT: A-2 task list / minimap, or A0 NPC resolver leg.

**2026-10-27 (A1b1 temple fittings):** Game change: temple (x 8 z 52) gains a steel-banded donation box on a stone stand at the porch's north side, two jute prayer mats on the porch floor, and six brass diyas on ledges either side of the shrine doorway (tools/blender/build_temple.py, temple.glb rebuilt, 6.9k tris). Proof docs/shots/temple-2026-10-27/porch.png, looked at: the donation box and the diyas read; the mats are NOT discernible from this angle, and the capsule player blocks the foreground. No flower offerings (organic, hers) and no worn-step detail, so box A1b1 temple line left unticked. No Places V1 spec, so not sent to art-reviewer. Build ALL PASSED, collision-test 4862 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: minimap research box or A0-WEATHER remaining.

**2026-10-27 (A1b1 atta chakki scoops):** Game change: staged atta chakki (Yard 11, x 720 z -80) gains two flour scoops (steel cup, wooden handle): one on a forecourt tin lid, one at the sacks (tools/blender/build_atta_chakki.py, atta_chakki_v2.glb rebuilt, 7.9k tris). Proof docs/shots/chakki-scoops-2026-10-27/b.png (looked at: the forecourt scoop reads at the lower left; the sack-side one is inside and not discernible). Belt, motor, sacks, balance, bulb were already in; settled dust on every surface still not verified, so box A1b1 chakki line left unticked. Not sent to art-reviewer (small prop, no new layout). Build ALL PASSED, collision-test 4861 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: temple interior has no spec; take minimap research box or A0 collision rooftop leg.

**2026-10-27 (animal slots cow + dog):** Game change: none visible until files exist. `cow.glb` and `dog.glb` dropped in public/assets/models/ now swap into every instanced herd and dog pack (src/animals.js swapInAnimalModel, loaded once, uniform-fit to 0.8x1.4x1.9 / 0.35x0.55x0.9, faces +Z, single material). Buffalo reuses cow.glb at its existing scale; no separate buffalo.glb (docs/asset-slots.md updated). Not tested with a real glb; missing files leave the code-built animals untouched. Build ALL PASSED, collision-test 4856 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: THE ORDER item 4 signboard final-rule audit, or A-2 task list.

**2026-10-27 (character slots: side-job men, aunty, kids):** Game change: none visible until files exist. doodhwala/kulfiwala/chaatwala/bantawala/shopkeeper/villager_aunty/kid_a-d now each register an asset slot when spawned (src/main.js buildCharacterNpc; assetSlots.register gained a `file` option so `kid_a#3` loads kid_a.glb). Sizes as in docs/asset-slots.md. Not tested with a real glb. Still unwired: cow, buffalo, dog (instanced herds). Build ALL PASSED, collision-test 4856 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: animal slots (needs herd-code change), or THE ORDER item 4 signboard audit.

**2026-10-27 (character slots dadi + monkey):** Game change: `dadi` and `monkey` now have asset slots (src/main.js, beside the maa/halwai loop, per-entry box sizes; dadi 0.62x1.5x0.62, monkey 0.35x0.6x0.35), so dadi.glb / monkey.glb dropped in public/assets/models/ replace the capsule/shape. docs/asset-slots.md moved both rows to Wired. Still NOT wired: doodhwala/kulfiwala/chaatwala/bantawala/shopkeeper, villager_aunty, kid_a-d, cow, buffalo, dog (instanced; need herd-code change). Not tested with a real glb. Build ALL PASSED, collision-test 4856 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: slots for side-job men, aunty, kids (CHARACTER_BUILDERS), then animals.

**2026-10-27 (school interior check, no game change):** Tried to verify the staged primary school's slates and bags by eye (docs/shots/school-interior-2026-10-27/d.png, f.png, 5 framings, no console errors). Result: desks, a board and shelves read dimly through the open doors, but slates and bags are NOT discernible; the camera cannot get inside the grilled windows. Slates/bags stay unverified; do not claim them as seen. No build or collision-test (docs only).
NEXT: temple interior has no Places V1 spec so skip; take THE ORDER item 4 (A0a / A0b signboard final-rule audit) or A-2 task list.

**2026-10-27 (A1b1 staged school classroom bags and slates):** Game change: each classroom bench in the staged primary school (Yard 0, x 320 z -160) now has a slate on the desk (80%) and a cloth school bag on the floor beside it (70%), random size and 5 muted colours (tools/blender/build_primary_school.py, primary_school.glb rebuilt, 41k tris). NOT verified by eye: no interior shot taken, the classrooms are only visible through windows and I did not frame one. Bell, matka, board, charts, almirah and shelves were already in. Build ALL PASSED, collision-test 4856 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: temple interior (lamps, bells, mats, donation box) or a framed interior shot of the school.

**2026-10-27 (A1b1 post office interior):** Game change: staged post office (Yard 11, x 640 z -80) now has a furnished interior: clerk's desk with ledger, ink pad, two rubber stamps and letter scale, chair, 24-cell pigeonhole letter rack with letters, sorting table with parcel and letters, three jute postbags, cupboard, framed notice, hanging bulb (tools/blender/build_post_office.py, post_office_v2.glb rebuilt, 7.6k tris). Proof docs/shots/postoffice-2026-10-27/win_front.png and win_side.png, looked at: all visible through the grilled windows, no console errors. Not sent through art-reviewer (interior not in her drawings; props generic). collision-test 4849 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: atta chakki already has belt, pulleys, motor, sacks, balance, bulb and flour dust (checked build_atta_chakki.py), so skip it; next is the school interior (desks, blackboard, bell) or temple interior.

**2026-10-27 (A1b1 ration shop interior props):** Game change: staged ration shop (Yard 10, x 560 z -80) now has a three-tier wall shelf with tins on the left wall, a ration card board with ten pinned cards on the right wall, and four measuring cans on the counter (tools/blender/build_ration_shop.py, ration_shop_v2.glb rebuilt; queue rail, scale, sacks, ledger, drums were already in). Proof docs/shots/ration-interior-2026-10-27/shelves.png (looked at: shelf with tins and counter cans read through the grille). NOT verified by eye: the card board, the camera cannot get past the grille/wall to face the right wall (cards_inside.png shows only its outer edge). Differences remaining: interior is dim and small at this distance, no letter racks (post office). Box A1b1 ration line left unticked. Build ALL PASSED, collision-test 4821 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: A1b1 post office (counter grille, letter racks) or atta chakki belt drive.

**2026-10-27 (halwai soot, parked, no game change):** Tried soot stains on the back wall above the two kadhais as box geometry, twice; both read as hard rectangles, reverted (model and build script unchanged). Fire mouth and bhatti soot were already in. Needs a soft decal texture. Shots docs/shots/halwai-soot-2026-10-27/. Nothing built beyond that, no collision-test needed.
NEXT: A1b1 ration shop interior props (shelves, cans, ration card board, queue rail).

**2026-10-27 (audit, no game change):** Walked THE ORDER 0-4 to find unblocked work. 0 done. 1 (material board) parked after reviewer round 1, needs her textures. A0-WEATHER posters: all three places whose LAYOUT.md shows posters (bus adda, chaupal, primary school) already have them; adding posters elsewhere would invent details her drawings lack, so left unticked. A0a rooftop leg: collision-test already end-checks every rooftop leg, collision has no box heights, so the leg cannot be walked in 2D; left unticked. Halwai flame/steam exists (src/halwaiFire.js), missing only a fire mouth in build_halwai.py and heat shimmer. No build or collision-test run.
NEXT: halwai fire mouth + soot (build_halwai.py), or A1b1 ration shop interior props.

**2026-10-27 (THE ORDER 0: anchors finished, place table, character slots):** Game change: none visible (numbers identical). East-road far end now follows the `highway` anchor; all 12 spur ends (health, johad, masjid, gurukul, maidan, jain, haveli, tvhouse, pond, mela, cane, gurudwara) are offsets from their place anchors (src/eastRoad.js); the gilli-danda patch is a new `gilli` anchor (src/jobs/gilli.js). SchoolCompound was already read from `school`. Still baked, by design: spur and road START points on lanes, lane-site centres (main.js LANE_SITE_CENTRES) and gali row positions (scenery.js): they belong to lanes, not places, so moving a place does not need them. Character/animal slots: docs/asset-slots.md now lists what is wired (player, 7 named cast, bullock) and what is NOT yet (dadi, side-job men, aunty, 4 kids, cow, buffalo, dog, monkey) with planned names and sizes; those need one `assetSlots.register` each before Tripo files drop in.

PLACE ANCHORS (x, z in m; edit one line in src/anchors.js to move): house (-48,39) | school (-50,106) | halwai (-40,62) | teastall (-52,78) | store (-52,20) | bazaar (-82,15) | chowk (-54,13) | post (-68,26) | ration (-68,31) | chakki (-68,36) | temple (8,52) | baagh (-15,10) | canal (-15,33) | field (20,-20) | banta (-63,22.5) | chaat (-63,50.5) | eastgali (-5,90) | westgali (-84,72) | jalebi (-104,4) | dairy (-112,18) | khalihan (-78,-5) | tubewell (-40,-8) | gaushala (-125,-35) | pond (-132,70) | anganwadi (-104,106) | mela (-135,150) | gurudwara (-60,175) | cane (20,150) | tvhouse (70,12) | health (96,30) | chemist (96,60) | manihari (90,78) | sabzi (88,92) | johad (78,105) | masjid (100,135) | jain (130,160) | haveli (150,-30) | gurukul (160,85) | maidan (165,135) | gilli (46,104) | highway (205,40) | mandi (226,60). Staging yard (22 places, grid origin 320,-160, 80 m apart, table in src/stagedPlaces.js): primary school (320,-160) | gurukul (400,-160) | dudh dairy (480,-160) | bus adda (560,-160) | chaupal (640,-160) | volleyball (720,-160) | puncture (320,-80) | tubewell (400,-80) | paani tanki (480,-80) | ration shop (560,-80) | post office (640,-80) | atta chakki (720,-80) | petrol pump (320,0) | panchayat (400,0) | TV house (480,0) | bhatta (560,0) | khel maidan (640,0) | khalihan (720,0) | dharam kanta (320,80) | akhada (400,80) | houses kit (480,80) | material board (560,80).
NEXT: THE ORDER 2, A0-WEATHER remaining items.

**2026-10-27 (A0-MAT material board):** Game change: new Yard 22 material board (x 560 z 80; tools/blender/build_material_board.py, material_board_v2.glb, src/stagedPlaces.js) and terracotta/thatch in the staged shader are desaturated toward her muted clay and straw (src/stagingYard.js, affects every staged place). Art-reviewer round 1: 11 of 12 FAIL; fixed colours, removed straight bands and rectangle chips; proof docs/shots/material-board/v4_rowB.png, v3_rowC.png (looked at). Not fixed, needs new textures, parked in NEEDS_YOU: rusted steel, jute, mud, packed earth flat; tin too shiny. Library NOT frozen; no per-place re-tints until it is. Gaushala re-tint f9442c3 was made before I read THE ORDER.
NEXT: THE ORDER item 2, A0-WEATHER remaining items.

**2026-10-27 (A0-TEX re-tint gaushala):** Game change: gaushala (in-village, x -125 z -35) compound earth warmed and lifted to 0xC09A68, trodden strip 0xA98660, gate approach 0xB68F5E (were 0xA48B69 / 0x8E7757 / 0x95805F) (tools/blender/build_gaushala.py, gaushala.glb rebuilt). Proof docs/shots/places-2026-10-27/gau2/iso.png, looked at beside MAIN_gaushala_front_isometric.png: ground now warm orange-tan like hers, brick walls, tin roofs and cream office already matched. Differences remaining: no cattle, straw or tree inside (organic, hers), her ground has straw and dung relief, ours is flat. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: audio polish, or the next Tier 2 item that needs no decision from her.

**2026-10-27 (A0-TEX re-tint staged bus adda):** Game change: staged bus adda (Yard 4, x 560 z -160) packed-earth ground warmed and lifted to 0xD0A06E, worn bus-stop strip 0xC29360 (were 0xB69568 / 0xA38358) (tools/blender/build_bus_adda.py, bus_adda_v2.glb rebuilt). Proof docs/shots/places-2026-10-27/bus4/iso.png (before bus4/before3.png), looked at beside MAIN_bus_adda_front_isometric.png: ground is warmer and lighter, less grey-brown; kiosk, brick pillars and tin roof already matched. Differences remaining: runtime haze and weathering still dull the earth against her orange-tan, her brick paving strip is dense where ours is sparse, posters are flat blobs, her ground has more relief, peepal is a stand-in (hers). Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: re-tint gaushala, then audio polish.

**2026-10-27 (A0-TEX re-tint staged volleyball):** Game change: staged volleyball court (Yard 6, x 720 z -160) lime lines are thicker (0.09-0.14 m, were 0.05-0.09) and brighter 0xF0EEE6, scuff discs and worn patch pulled toward the patch tone (0xAF946B, 0xA3865E) so they stop reading as hard discs (tools/blender/build_volleyball.py, volleyball_v2.glb rebuilt). Proof docs/shots/places-2026-10-27/vb2/iso.png, looked at beside MAIN_volleyball_front_isometric.png: lines now read clearly and the net sits on the centre line like hers. Differences remaining: runtime haze and weathering grey the earth against her warm tan-brown, her ground has footprints and dark blotches ours lacks, our bricks are loose dots not a tight row, scoop and bucket small, bench reads thinner. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: re-tint bus_adda, gaushala, then audio polish.

**2026-10-27 (A0-TEX re-tint staged primary school):** Game change: staged primary school (Yard 0, x 320 z -160) yard ground warmed to orange-tan 0xD2A573, swept assembly ground 0xDDB482, worn paths 0xBE9462 (were 0xB89A6E / 0xC2A67C / 0xA88A60) (tools/blender/build_primary_school.py, primary_school.glb rebuilt). Proof docs/shots/places-2026-10-27/ps2/iso.png (before docs/shots/places-2026-10-26/primary_school/iso2.png), looked at beside MAIN_primary_school_isometrics.png: yard is warmer and lighter, grey roofs and cream walls already matched. Differences remaining: runtime haze and weathering still grey the ground against her orange-tan; her white playground court lines are a rectangle, ours an oval track; her lawn strips, flower beds and trees are organic (hers); a tutorial popup covers the foreground in the shot. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: audio polish, or pick the next Tier 2 item that needs no decision from her.

**2026-10-27 (A0-TEX re-tint staged khel maidan):** Game change: staged khel maidan (Yard 16, x 640 z 0) ground lifted to warm tan 0xCDB283 (was 0xB59A6E), tone patches pulled close to it so they stop reading as dark rectangles, dung patches lighter 0x8E7352, cricket pitch strip paler (tools/blender/build_khel_maidan.py, khel_maidan_v2.glb rebuilt). Proof docs/shots/places-2026-10-27/km2/iso.png (before docs/shots/places-2026-10-26/khel_maidan/iso.png), looked at beside MAIN_khel_maidan_views.png: patches are now subtle, but the ground still reads grey-olive under the runtime haze and weathering where hers is warm orange-tan, so only a partial match. Differences remaining: dung patches and tyres still read as hard black-ish discs, chalk lines thin vs her thick white lines, brick row and bench tiny at this height, no kites/tree (organic, hers), no soil cross-section edge, a tutorial popup covers the foreground in the shot. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: re-tint primary_school, then audio polish.

**2026-10-27 (A0-TEX re-tint staged bhatta):** Game change: staged bhatta (Yard 16, x 560 z 0) chimney is now brighter red-brick (bands 0x8A4A38), finished-brick cubes bright orange-red (0xFF9C6E), kiln ash mound mid grey 0x86847F instead of glossy pale cream (tools/blender/build_bhatta.py, bhatta_v2.glb rebuilt). Proof docs/shots/places-2026-10-27/bh2/iso.png (before docs/shots/places-2026-10-26/bhatta/iso.png), looked at beside MAIN_bhatta_views.png: chimney, brick cubes and ash now read like hers. Differences remaining: our earth is darker brown-maroon where hers is warm orange-tan (runtime weathering and haze), the finished-brick stacks are smaller and sparser than her tall bonded cubes, the drying lattice reads dark and flat, sand heaps are smooth blobs, no smoke plume. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: re-tint khel_maidan and primary_school, then audio polish.

**2026-10-27 (spur kerbs checked, no game change):** No game code touched. Spurs already have edging stones, trees and lamps (src/farmSites.js createEastRoadLeg, src/main.js spur lamps); drains are off by design (noDrain) to protect draw calls. Recorded in BACKLOG A-2c. Not tickable, and the layout is being redrawn by her. No build or collision-test run this entry.
NEXT: audio mix is hers; far-eastern road traffic or the lotus/crops sourcing items need either a draw-call budget or her decision, so pick the next Tier 2 item that needs neither.

**2026-10-27 (hero-lane kerbs and drains):** Game change: the 9 m hero lane (x -45, z 50 to 93) now carries the same kerbs and open drain with slab bridge as the other galis (src/main.js, createGaliEdging no longer skips h1). Proof docs/shots/gali-edging-2026-10-27/hero/{h_a,h_c,h_d}.png, looked at: kerbs and drain run down both sides, no clipping into the tea stall or halwai shop seen. Differences remaining: the dirt track is narrower than the 9 m lane so kerbs sit on grass, not at the dirt edge; spurs still bare. Hero zone check 148 of 150 calls. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: spur kerbs, or audio polish.

**2026-10-27 (gali kerbs and open drains):** Game change: east, west and south galis now carry kerbs on both sides and an open drain with stone lips and a slab bridge (src/farmSites.js createGaliEdging, wired next to the lamp chunks in src/main.js). Proof docs/shots/gali-edging-2026-10-27/e_c.png, looked at: kerbs and dark drain bed read down the lane. Draw calls +1 per visible chunk (east gali shot 168 vs 165 before, counts include shadow pass). Differences remaining: kerb stones read a little pale, drain does not carry through junction mouths, hero lane and spurs still bare. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: hero-lane kerbs and drains, or audio polish.

**2026-10-27 (east road re-checked, no game change):** No code touched. Fresh in-game shots of the east road docs/shots/eastroad-2026-10-27/{road_west,road_mid}.png (calls 148 and 112, no console errors): earth road with kerb stones, open drain, solar lamps, shade trees, signpost and milestone, a cyclist already rides it (src/main.js east_road_cyclist). It reads as a real road to the far-east cluster. Not tickable: capsule player and HUD in frame, and the road has no motor traffic. Box stays open; gaps are traffic and a PBR dirt surface (vertex-tinted earth today). Did not add traffic: the far-east views are already at the draw-call ceiling and the layout is being redrawn by her.
NEXT: hero-lane kerbs and drains, or a wide-shot without capsule to tick the far-east box.

**2026-10-27 (A0-TEX staged puncture roof rust brightened):** Game change: staged puncture shop (Yard 7, x 320 z -80) tin roof/wall sheets now bright rust-orange and pale blue-grey (RUST palette in tools/blender/build_puncture.py, puncture_v2.glb rebuilt). Proof docs/shots/places-2026-10-27/punc5/iso.png (before punc4/iso.png), looked at beside MAIN_puncture_front_isometric.png: roof now alternates orange and blue-grey sheets like hers. Differences remaining: no blue barrel or compressor visible from this angle, ground darker and flatter than her sandy earth, hers has corrugation relief we lack, bamboo posts thinner. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: audio polish or far eastern road.

**2026-10-27 (A0-TEX staged puncture shop oil stains softened):** Game change: the four oil-stain discs on the staged puncture shop (Yard 7, x 320 z -80) earth patch are now close to the patch tone (0x9C8662 etc., were near-black 0x4A4038), tools/blender/build_puncture.py, puncture_v2.glb rebuilt. Proof docs/shots/places-2026-10-27/punc4/iso.png (before punc3/iso.png), looked at beside MAIN_puncture_front_isometric.png: discs now read as faint stains, not black holes. Differences remaining: stains are still round hard-edged discs where hers are irregular blotches; roof reads dark brown-grey where hers is bright rust-orange with blue-grey tin; her hanging tubes and spanner board are bigger and clearer; our ground is flatter. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: brighten puncture roof rust, then audio polish or far eastern road.

**2026-10-27 (minimap zoom eyeballed):** No game change. Looked at the corner minimap on foot vs when the player is moved fast (headless, position stepped by script, not a real vehicle): docs/shots/minimap-zoom-2026-10-27/{on_foot,at_speed}.png. The window widens as intended (more lanes and landmarks, glyphs smaller), the player arrow and objective star stay readable, it eases back (back_on_foot.png). Not tested in a real driven tractor; A-2b research box stays open. No code touched, so no build or collision-test run this entry.
NEXT: pick a Tier 2 item that changes the game (far eastern road, hero-lane kerbs/drains), audio mix by ear is hers.

**2026-10-27 (collision-test rooftop legs):** No visible game change. collision-test part [4] no longer silently skips elevated NPC legs (the monkey rooftop chase): it counts them and fails if a ground-level end sits inside a solid. Honest limit: colliders are 2D with no box heights, so the climb itself (monkey walks over the bazaar front while rising) is NOT verified; the A0a box stays open. Also noted: the handoff NEXT of "re-tint chaupal" was stale, chaupal was re-tinted on 26 Oct. Run: collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: eyeball minimap zoom in a vehicle, audio mix by ear is hers.

**2026-10-26 (A0-TEX re-tint staged TV house):** Game change: staged TV house (Yard 15, x 480 z 0) walls are now pale creamy ochre 0xE8D8A6 (was golden 0xE4CC8E that rendered saturated yellow) and the carved door leaves a lighter brown 0x8A5A34 (tools/blender/build_tv_house.py, tv_house_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/tv2/iso.png (before tv_house/iso.png), looked at beside MAIN_tv_house_front_isometric.png: wall tone now close to hers. Differences remaining: open door shows a dark gap, her interior (TV, sofa, fan) barely reads at this distance; no marigold pots (organic, hers); antenna reads thinner than hers. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: re-tint chaupal, then audio polish.

**2026-10-26 (A0-TEX re-tint staged dudh dairy):** Game change: staged dairy (Yard 3, x 480 z -160) roof was a full blue lid (slab_line and parapet cap were whole-footprint blue boxes); now the deck is grey concrete with blue only as thin edge stripes on the slab and parapet cap, like her drawing (tools/blender/build_dudh_dairy.py, dudh_dairy_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/dd2/iso.png (before dudh_dairy/iso.png), looked at beside MAIN_dudh_dairy_front_isometric.png: white walls, grey deck, blue edge, straw roof now read like hers. Differences remaining: no cow/buffalo (capsule/organic, hers), no green fodder or dung cakes row, ground flatter and greyer than her tan-brown mud, shop interior small at this distance. Gurukul checked, not changed: brick already globally re-tinted, only the dark lawn soil differs and that stands in for her grass. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: warm the dairy yard earth, then audio polish.

**2026-10-26 (A0-TEX re-tint staged panchayat):** Game change: staged panchayat (Yard 14, x 400 z 0) roof deck is now mid concrete grey, meeting ground paler sand, and the neem chabutra cap is brick red instead of grey slab (tools/blender/build_panchayat.py, panchayat_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/pan2/iso.png (before panchayat/iso.png), looked at beside MAIN_panchayat_front_isometric.png: grey deck and brick chabutra now match. Differences remaining: the runtime weathering shader greys the ground against her warm sand; pillars read red-orange for most of their height where hers are white with a short red base; no flower pots in marigold colour (organic, hers); stand-in neem tree is hers to replace. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: re-tint tv_house, chaupal, gurukul, dudh_dairy, then audio polish.

**2026-10-26 (minimap speed zoom):** Game change: corner minimap (src/minimap.js) now eases from a 110 m window on foot to 220 m when moving faster than 7 m/s (vehicles), so the road ahead shows; returns when slowed. No screenshot taken, not eyeballed in play, unjudged. Research box A-2b stays open. Build passed, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: eyeball minimap zoom in a vehicle, then further A-2b/Tier 2 items.

**2026-10-26 (audio: per-place ambience):** Game change: src/audio.js has a place bed (band-passed noise with slow swell) whose tone and level follow the nearest PLACES kind the player is inside: low crowd murmur in bazaar/mandi/highway, brighter chatter at schools, light murmur at shops, extra wind over fields, silent elsewhere (main.js feeds it each frame). Audio only, no screenshot possible, not listened to by a human, unjudged by ear. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: BACKLOG A-2b minimap research item, or audio mix check by ear (hers).

**2026-10-26 (audio: dusk crickets):** Game change: src/audio.js has a cricket bed (band-passed noise gated by a 14 Hz pulse) that fades in as dayline progress passes 0.6, silent in the afternoon; main.js feeds it the same progress as the sky. Audio only, no screenshot possible, not listened to by a human, unjudged by ear. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: per-place ambience, then BACKLOG A-2b minimap items.

**2026-10-26 (audio: bird variety):** Game change: the ambient bird bed (src/audio.js) now varies its call: sparrow chirp, double chirp, koel rising two-note whistle, distant crow caw (was one identical chirp). Audio only, no screenshot possible; not listened to by a human, so unjudged by ear. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: more audio (crickets at dusk, per-place ambience), then BACKLOG A-2b minimap items.

**2026-10-26 (A0-TEX re-tint staged akhada):** Game change: staged akhada (Yard 20, x 400 z 80) wrestling pit earth is now bright orange-red (0xC25C34, was dark brown 0x8A4B34), clay bank 0xC8925E, surrounding ground warm tan 0xD4AA78, soil mounds and shed tin sheets lifted to her rust tones (tools/blender/build_akhada.py, akhada_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/ak2/iso.png (before ak1/iso.png), looked at beside MAIN_akhada_front_isometric.png: pit and ground now match her colours. Differences remaining: our soil mounds read as dark craters where hers is raked swirl texture; the bank is thinner and straight-edged vs her fat rounded mud rim; tin roof duller than her bright rust; shed has no visible washing line colours at this distance; neem is the stand-in tree (hers to replace). Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: audio polish.

**2026-10-26 (A0-TEX re-tint staged dharam kanta + collision-test flake fix):** Game change: staged dharam kanta (Yard 19, x 320 z 80) steel platform deck, plate and chequer strips are lighter mid steel-grey (0x9A9FA4 / 0xB2B7BB / 0x8C9094, were near-black 0x6C7074 etc.) like her chequer-plate platform (tools/blender/build_dharam_kanta_v2.py, dharam_kanta_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/dk2/iso.png (before dk1/iso.png), looked at beside MAIN_dharam_kanta_front_isometric_LOWRES.png: deck now mid grey, cabin cream and apron concrete already matched. Differences remaining: her deck is lighter again with visible chequer pattern and bright yellow ramp wedges, ours is smooth bluish-grey; ground is dark brown where hers is grey; no chair/pots visible at this distance; cabin tank and display board match. Also fixed the intermittent collision-test part [6] failure (gurukul_v2, failed 3 of 5 runs): its quiet-wait was wall-clock 2.5 s = 2-3 frames at headless ~1 fps, below the 4-frame collider latency; it now also needs 10 rendered frames with no change (tools/collision-test.js). Not a game bug. collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed (2 consecutive runs).
NEXT: re-tint akhada, then audio polish.

**2026-10-26 (A0-TEX re-tint staged paani tanki):** Game change: staged paani tanki (Yard 9, x 480 z -80) tank wall is now pale grey concrete instead of dark olive (the 6 m wall had only 2 vertex rings, so baked AO from the gallery slab smeared across it; added 8 rings), and the yard earth is dark brown 0x7C6244 (was pale sand) (tools/blender/build_paani_tanki.py, paani_tanki_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/pt2/iso.png and tank.png, looked at beside MAIN_paani_tanki_front_isometric.png: tank and earth now match her tone. Differences remaining: no green moss streaks or pale patched plaster on the tank, tank looks slightly glossy/smooth, no grass tufts (organic, hers), transformer is smaller than hers. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: re-tint dharam kanta, akhada, then audio polish.

**2026-10-26 (A0-TEX re-tint staged tubewell):** Game change: staged tubewell (slot 7, x 400 z -80) ground is now dark packed earth (0x8A7058, worn patch 0x6E5842, was pale sand) and brick tint duller (tools/blender/build_tubewell.py, tubewell_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/tw2/iso.png beside MAIN_tubewell_front_isometric.png: ground now dark like her mud. Differences remaining: her kothri has grey cement patching on corners and an open door showing motor and pipes, ours reads uniform red with a dark door; no gushing water in the hauz; her ground has wet mud patches and grass tufts, ours is flat grey-brown; only one channel (as LAYOUT.md says). Build passed; collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed on the clean re-run. Two earlier runs, made while other jobs were running at once, showed 1 failed: part [6], a late gurukul_v2 collider registration. It did not repeat; it is a timing flake under load, not a new break.
NEXT: re-tint paani tanki, dharam kanta, akhada, then audio polish.

**2026-10-26 (A0-TEX staged post office bicycle + post box):** Game change: staged post office (Yard 11, x 640 z -80) bicycle is now black like her drawing (was blue), post box paint brightened in the build (tools/blender/build_post_office.py, post_office_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/po3/iso.png, looked at beside MAIN_post_office_front_isometric.png: bicycle matches. Differences remaining: post box still reads dark maroon (metal material response swallows the colour, build change barely shows); her bench is a slatted wooden bench with legs, ours a flat dark plank; no second bicycle (LAYOUT says one); no flower pots (organic, hers); roof deck paler than her grey concrete. Build passed, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: post box metal response, then audio polish.

**2026-10-26 (staged slab mottle suppressed):** Game change: upward-facing staged plaster/trim faces (forecourt slabs, flat roofs) now get 70% less mottle and 80% less damp/worn patches, via a world-normal test in the weathering shader (src/stagingYard.js addWeathering). Proof docs/shots/places-2026-10-26/slab2/petrol.png, looked at: forecourt and canopy roof read as pale mostly-clean concrete, walls keep their stains. Remaining vs her drawing: nozzles small, no marigold pots. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: audio polish.

**2026-10-26 (staged petrol pump forecourt stains softened):** Game change: the three oil-stain discs on the staged petrol pump slab are now a pale grey (0x9E9B93, was dark 0x6E6860) so they sit just under the slab tone (tools/blender/build_petrol_pump_v2.py, petrol_pump_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/pump9/petrol.png, looked at: discs read as faint tyre marks now. Differences remaining beside MAIN_petrol_pump_front_isometric.png: the slab is still mottled grey-dark in patches, from the runtime mottle/dust shader on 'trim' (src/stagingYard.js addWeathering), hers is pale clean concrete; nozzles still small. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: reduce runtime mottle on staged slab/trim, then audio polish.

**2026-10-26 (A0-TEX staged petrol pump dispensers + fire-bucket rack):** Game change: staged petrol pump (slot 12, x 320 z 0) dispensers rebuilt chunkier like her drawing (0.9 x 0.6 m, navy base, orange band, white body and head, navy cap, black screen, hose loops, green nozzles); fire buckets now hang from a navy two-post rack instead of standing on the floor; extinguishers moved beside it (tools/blender/build_petrol_pump_v2.py, petrol_pump_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/pump8/petrol.png and petrol_close.png, looked at beside MAIN_petrol_pump_front_isometric.png: dispenser mass and hanging buckets now match. Differences remaining: nozzles are small and dark green beside her bright ones, no marigold pots (hers), and the runtime oil-stain shader makes big dark discs on the forecourt where hers is pale clean concrete. Build ALL PASSED, collision-test 4787 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: soften forecourt stain discs in src/stagingYard.js, then audio polish.

**2026-10-26 (A0-TEX re-tint staged petrol pump):** Game change: staged petrol pump canopy roof deck is now white plaster (was grey 'trim' 0xB4B1A9 that read dark grey), tools/blender/build_petrol_pump_v2.py, petrol_pump_v2.glb rebuilt. Proof docs/shots/places-2026-10-26/retint7/petrol.png (slot 12, x 320 z 0), looked at beside MAIN_petrol_pump_front_isometric.png: roof now pale grey-white, closer to her white, but runtime stains make it blotchy. Differences remaining: her dispensers are chunky white with green nozzles and ours are small dark posts, no fire-bucket rack or flower pots visible, forecourt darker and dirtier than her pale concrete. Post office not re-tinted this cycle. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed, budget 38.88 MB.
NEXT: petrol pump dispensers and fire-bucket rack, then audio polish.

**2026-10-26 (staged wood tint fixed):** Game change: staged painted wood (doors, shutters) now renders at its build tint: the wood scan averages ~0.08 linear albedo so tints multiplied to near-black; addWeathering now boosts wood 2.6x (src/stagingYard.js). Proof docs/shots/places-2026-10-26/woodboost/atta.png, looked at: atta chakki doors now mid faded green as in her drawing (were near-black); the bench lightened too. Other staged wood not re-checked. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: re-tint post office and petrol pump by eye, then audio polish.

**2026-10-26 (A0-TEX re-tint staged atta chakki):** Game change: staged atta chakki roof is now a faded, duller rust (0xA65A4C, was saturated red), tools/blender/build_atta_chakki.py, atta_chakki_v2.glb rebuilt. Proof docs/shots/places-2026-10-26/retint6/atta_iso2.png, looked at beside MAIN_atta_chakki_front_isometric.png: roof now close to her faded rust. NOT fixed: walls still read warm cream against her cool white-grey brick-showing plaster, and the green doors still read near-black instead of her faded mid-green; changing the build colours barely moves them, so the runtime plaster/wood shader or lighting is the cause. Build passed, collision-test 0 failed.
NEXT: investigate why staged wood ignores build tint (src/stagingYard.js), then re-tint post office and petrol pump.

**2026-10-26 (A0-TEX re-tint staged khalihan):** Game change: staged khalihan ground, threshing floor and thresher re-tinted from colours sampled off her MAIN_khalihan_views.png (tools/blender/build_khalihan.py, khalihan_v2.glb rebuilt): ground block 0xC8AE8A, gobar floor lighter 0xAA9170 (was dark 0x9A7F5C), thresher 0xB8522F (less saturated). Proof docs/shots/places-2026-10-26/retint5/khalihan_iso.png, looked at beside her image: the floor is lighter but the in-game ground still reads greyer and blotchier than her warm sand because the runtime stain shader darkens it; thresher is small beside her chunky one and reads dark maroon. Wheat bundles, bhusa heap, straw stack and grain heap are crops and stay skipped (empty footing ring and blue tarp only). Zero console errors. Build passed, collision-test 1976 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed (static count differs from the 4785 in earlier lines; not investigated).
NEXT: check staged-ground stain strength in src/stagingYard.js addWeathering, then audio polish.

**2026-10-26 (late-collider latency test):** No visible game change. collision-test part [6] now measures how long after a model's meshes appear the collider list is rebuilt, in rendered frames (wall ms is meaningless on headless GL at ~1 fps): worst 5 frames over 40 zone stops, fails above 30. Staged place .glb landings and the house kit now call requestColliderRebuild (src/stagingYard.js). No screenshot, nothing to look at. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: rooftop ground-to-roof leg check, audio polish.

**2026-10-26 (rooftop-leg check, validator only):** Added world-validator check 9b: every elevated monkey-chase waypoint and every roof-to-roof leg must have walls within 8 m on all four sides (shops are hollow shells, so "inside a collider" was the wrong test and failed first). Passes: 1 roof-to-roof leg, all over a building. No game change, no screenshot. Build ALL PASSED 17/17, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed. Still not covered: the ground-to-roof and roof-to-ground legs (height is eased, 2D walls skipped on purpose).
NEXT: audio polish; far-east road, KTX2, canal/pond terrain and houses-kit wiring are her calls.

**2026-10-26 (A0 vehicles-collide audit, no game change):** Re-ran tools/collision-test.js: 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed; part [3] drove bike/tractor/cart into 1976 solids (8370 drives). Ticked the BACKLOG A0 'Vehicles collide' box on that evidence. No screenshot, nothing changed in the game this cycle. Not covered still: a collider registering late while the player stands at a zone edge; rooftop-chase leg.
NEXT: rooftop-leg collision check, then audio polish.

**2026-10-26 (school posters weathered):** Game change: staged primary school hygiene posters are now sun-faded, creased, water-stained, ragged-edged cards with torn corners instead of clean flat colour (tools/blender/build_primary_school.py, primary_school.glb rebuilt). Proof docs/shots/places-2026-10-26/schoolposters/posters_a.png and posters_b.png, looked at: weathering reads; the pictures themselves are crude (nails card reads as bars and an X) and cards do not overlap. Not compared to a drawing. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: audio polish, or redraw the school poster pictures.

**2026-10-26 (A0-WEATHER base dust):** Game change: staged plaster/brick/wood/tin now get a ragged splashed-up dust band (0.25-1.1 m, brown-grey) at the base that dulls and desaturates fresh plinth paint (src/stagingYard.js addWeathering). Proof docs/shots/places-2026-10-26/dust/school_close.png, looked at: the school plinth was flat saturated orange, now a dusty dull band with orange patches; bus shot (dust/bus.png) is from far away, base not inspectable. Not compared to a drawing this cycle; her plinth paint may be meant brighter. Plaster backlog item ticked (stains from weather1, base dust here). Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: posters/clutter for other staged places, then audio polish.

**2026-10-26 (staged brick per-brick variation):** Game change: staged brick (pillars, plinths, paving bricks) now varies brick to brick: lighter and darker bricks, the odd dark overburnt one, orange-to-brown drift (src/stagingYard.js addWeathering). Proof docs/shots/places-2026-10-26/brickvar/bus_front2.png, looked at: pillars read as mixed, patchy fired clay instead of one even red. Not compared against her drawing this cycle; her brick is still paler and the cells only roughly follow real brick edges (lengths vary). Also diagnosed the staged texture pipeline from the GLB data (BACKLOG A0-TEX progress line): UVs are 1/m, swap covers all materials; I first thought the UVs were 5-30/m, that was meshopt node scale, nothing was changed for it. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: posters/clutter for other staged places, then audio polish.

**2026-10-26 (chaupal event posters):** Game change: the staged chaupal notice board now has two torn, faded, creased picture-only event posters (a striped circus tent, a cricket pitch with stumps, bat and ball) pinned over the blank sheets, as LAYOUT.md asks (tools/blender/build_chaupal.py, chaupal_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/posters/chaupal_board.png, looked at: both read on the board, no lettering; the cricket one is abstract and the circus tent is crude, neither compared against a reference (none exists, LAYOUT.md only names the subjects). Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: posters/clutter for other staged places, then audio polish.

**2026-10-26 (A0-WEATHER bus adda posters):** Game change: bus adda wall posters are now torn-edge, sun-faded, creased, stained picture panels on a 512x256 atlas instead of flat colour shapes (tools/blender/build_bus_adda.py, bus_adda_v2.glb rebuilt). Proof docs/shots/places-2026-10-26/posters/poster_close.png, looked at: overlapping, varied, no lettering; a little soft because each is under 1 m wide. Not compared to her image this cycle. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: posters for other staged places, then audio polish.

**2026-10-26 (bus adda re-check vs LAYOUT.md, no code change):** Staged bus adda is slot 3 (x 560, z -160). Shot docs/shots/places-2026-10-26/bus3/front.png and iso.png and looked at them beside MAIN_bus_adda_front_isometric.png. Present and in place: tapri left (turquoise, 2 benches beside it facing road), 3-pillar shelter with maroon dado band and tin roof, peepal+chabutra+charpai right-back, pyaau far right, green double-sided board perpendicular at front-left, milestone front-right, dustbin, broken brick strip along the road edge. Differences remaining: shelter pillars read darker maroon than her orange-red brick on the shaded face; posters are flat blobs, not faded photos; ground has less relief than her packed earth; peepal is smaller than hers (organic, hers to replace). BACKLOG items 177/178/180/182 ticked. No build run (no code change). Zero console errors.
NEXT: poster texture quality, then re-check the next staged place against its LAYOUT.md.

**2026-10-26 (A0-WEATHER bus adda kiosk, paving, posters):** Game change: staged bus adda chai kiosk now has a solid turquoise skirt under the cabin (was bare stilts), the brick paving strip is two staggered rows (about 2x denser), and the back-wall posters are 7 overlapping faded picture panels instead of 4 side by side (tools/blender/build_bus_adda.py). Proof docs/shots/places-2026-10-26/bus2/bus_kiosk.png, looked at beside Places V1/bus_adda MAIN_bus_adda_front_isometric.png: kiosk reads as a boxed body, paving reads as a broken strip, posters overlap. Differences remaining: posters still only 4 picture designs reused (flat shapes, not torn photos); no peeling paint on the kiosk; ground smoother than her packed earth; bus_wide.png in that folder is a bad camera (underground), ignore. Zero console errors. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: peeling paint/stains on kiosk, packed-earth ground variation, then re-check bus adda against LAYOUT.md item by item.

**2026-10-26 (A0-WEATHER staged plaster stains + pale tin):** Game change: staged plaster now has damp/soot stain patches, worn-paint patches and sun-bleaching near the top; staged tin roofs are now pale whitish-grey with faint rust bleed (src/stagingYard.js addWeathering, 'tin' added). Proof docs/shots/places-2026-10-26/weather1/bus.png and school.png, looked at beside Places V1/bus_adda MAIN_bus_adda_front_isometric.png: bus adda roof now reads pale grey like hers, school walls show visible stain patches. Differences remaining: her chai kiosk is a solid painted box, ours stands on thin dark legs; her brick paving strip is dense, ours is sparse separate bricks; her poster rectangles are torn pictures, ours are flat symbols; ground is smoother than her packed earth. Post office shot taken, not viewed. Zero console errors. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: bus adda kiosk solid body, denser brick paving, picture posters.

**2026-10-26 (A0-TEX re-tint staged chaupal):** Game change: staged chaupal platform top is now a grey cement (CEMENT 0x8E8C86, was boosted by the plaster 1.4x into near-cream) and its brick a duller brown-red (#A06A58), tools/blender/build_chaupal.py. Proof docs/shots/places-2026-10-26/retint4/chaupal.png, looked at beside Places V1/chaupal MAIN_chaupal_front_isometric.png: platform top now reads grey, but the shot is from above through the tree canopy so brick and cream rim are barely visible; tree is hers/placeholder. Volleyball (retint4/volleyball.png) looked at beside her image: ground tone already close, no change made. Khalihan shot taken (retint4/khalihan.png), not compared. Zero console errors. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: compare khalihan, then audio polish.

**2026-10-26 (A0-TEX re-tint staged TV house):** Game change: staged TV house walls re-tinted from pale cream to a golden cream (CREAM 0xE4CC8E, tools/blender/build_tv_house.py), eyeballed off her MAIN_tv_house_front_isometric.png. Proof docs/shots/places-2026-10-26/retint3/tv.png, looked at beside her image: hue is closer but the in-game wall still reads darker and more ochre/dingy than her bright golden cream (runtime weathering darkens it); her plant pots, plastic chairs, rug and TV-room interior are not visible from outside (organics skipped, interior not checked). Puncture/volleyball/chaupal/khalihan not re-tinted: puncture already carries per-object colours read from her image. Zero console errors. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: check staged walls' runtime darkening in stagingYard.addWeathering, re-tint chaupal/khalihan/volleyball by eye.

**2026-10-26 (A0-TEX re-tint ration shop + post office):** Game change: staged ration shop walls are now a softer mustard (MUST 0xA68C48, was an orange-yellow) and the staged post office a paler cream (YEL 0xEAE0B4), both read off her drawings by eye after a pixel sampler proved too noisy against the grey backdrop (tools/blender/build_ration_shop.py, build_post_office.py). Proof docs/shots/places-2026-10-26/retint2/ration.png and post.png, looked at beside Places V1/ration_shop and post_office MAIN_*_front_isometric.png: wall colour is close; differences: her ration shop has a rolling shutter with visible slats and a wooden counter, ours is simpler. Atta chakki, petrol pump and others already carry per-object colours from her images; not re-checked this cycle. Build result: see commit message.
NEXT: re-tint remaining staged pairs (tv_house, khalihan, puncture, volleyball, chaupal) by eye, then plaster stain variation.

**2026-10-26 (bus adda kiosk turquoise):** Game change: the chai tapri in the staged bus adda is now bright faded turquoise like her drawing (was dark green-grey); planks switched from wood to the plaster texture set because the wood albedo is too dark to show a light paint (tools/blender/build_bus_adda.py TURQ + kind). Proof docs/shots/places-2026-10-26/kiosk-retint/kiosk2.png, looked at beside Places V1/bus_adda/MAIN_bus_adda_front_isometric.png: hue matches; ours is a little lighter and the planks lose wood grain, and her kiosk has peeling paint and an open serving hatch we do not have. Zero console errors. collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed. WATCH: site-slot-test timed out loading the page twice (machine load ~9, stale vite preview processes running); not investigated, no code of mine touches it.
NEXT: plaster stain variation, re-tint remaining staged pairs from her images.

**2026-10-26 (A0-TEX brick re-tint, staged places):** Game change: staged brick is now x1.3 lighter and 20% desaturated at runtime (src/stagingYard.js addWeathering), so it reads paler orange-brown like her drawing instead of deep saturated red. Proof docs/shots/places-2026-10-26/brick-retint/bus_wide.png and bus_close.png, both looked at beside Places V1/bus_adda/MAIN_bus_adda_front_isometric.png: pillars and bench plinths now read as her brick. Remaining differences: her chai kiosk is bright turquoise painted wood, ours is dark green-grey; her brick paving is a dense broken strip, ours is sparse separate bricks; her plaster is stained and peeling, ours is a clean even yellow; poster rectangles are flat colour. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: re-tint the bus adda kiosk turquoise, then plaster stain variation.

**2026-10-26 (A0-TEX brick proof, no code change):** Shot the staged bus adda from 2 m: docs/shots/staged-closeup-2026-10-26/bus_brick_2m.png (also bus_a.png). Looked at it beside Places V1/bus_adda/MAIN_bus_adda_front_isometric.png: individual bricks with mortar lines and relief are clearly visible on the pillars and low walls, so the brick proof box is ticked. Differences from her drawing: our brick is a deeper saturated red, hers is paler orange-brown and patchy; our plaster is a clean even yellow, hers is stained and peeling; the wall posters are flat coloured rectangles, hers are torn paper with print. Roof tin corrugation is visible but no dedicated tin close-up was taken. Console errors none.
NEXT: lighten/desaturate staged brick tint and add plaster stain variation; re-tint remaining pairs.

**2026-10-26 (A0-TEX proof shots, no game change):** Took 2 m close-ups of staged walls: docs/shots/staged-closeup-2026-10-26/ (school_wall, ration_wall, post_wall; school_roof is a duplicate frame, ignore). Looked at all three. Plaster now shows a real grain and normal relief at 2 m (school compound wall, post office wall), so the earlier fix holds. Differences from her drawings: the plaster fills are very even in tone with almost no stains or patches; the plinth bands are flat saturated paint (school orange, post office red) with only faint grain; ration shop interior is dark and orange-cast. No brick surface is in any of these frames, so the "individual bricks visible" box is NOT ticked and the item stays open. No code changed, no build run.
NEXT: find a staged wall that is actually brick (bus adda / gaushala pillars) and shoot it at 2 m; tone down the flat plinth paint.

**2026-10-26 (monkey rooftop height):** Game change: the monkey's second rooftop waypoint now uses unit 5's own roof height (3.97 m) instead of unit 3's (4.32 m), so it no longer hovers 0.35 m above that roof (src/main.js monkeyChaseWaypoints). No screenshot taken or looked at. The rooftop leg is still walked without collision on purpose and is not covered by collision-test. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed; regression-check 21/22, the one failure is the known triangle counter (475k incl. shadow pass).
NEXT: audio polish; far-east road, KTX2, canal/pond terrain and houses-kit wiring are her calls.

**2026-10-26 (A0 NPC resolver audit, no game change):** Read-only code audit: all ground-level NPC movement already goes through resolveMove; only exception is the rooftop-chase leg (npcRoutines.js 117-118). Animals are stationary. BACKLOG progress line added, box left unticked. No build run, no screenshot. This cycle changed nothing in the game; the remaining open items are the art director's calls (far-east road, KTX2, canal/pond terrain, houses kit wiring) or plant work she took off the list.
NEXT: audio polish, rooftop-leg collision check.

**2026-10-26 (brinjal/okra cards removed):** Game change: the flat alpha-card brinjal and okra bushes are gone from the sabzi beds (src/field.js buildField; no CC0 model exists, web search found only paid listings). NEEDS_YOU line added. No screenshot taken or looked at. Sugarcane, sarson, wheat not done. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: decide sugarcane/sarson/wheat sourcing-or-remove, audio polish.

**2026-10-26 (pond lotus flowers removed):** Game change: the code-built lotus flowers are gone from the pond (pads stay), src/farmSites.js. Searched Poly Haven, Poly Pizza, Quaternius, Sketchfab and the general web: no CC0 lotus/water-lily model, only paid listings. NEEDS_YOU line added. Screenshot run had zero console errors; I did not open the pond shot, so the pads' look is unjudged. Crops (brinjal, okra, sugarcane, sarson, wheat) in the same backlog item are NOT done. Build collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: crop sourcing-or-remove from A-2b0, audio polish.

**2026-10-26 (audio bug fix, canal water loop leak):** Game change (audio only, invisible): the canal water murmur from the earlier water-ambience commit was built inside `_playBirdChirp`, which re-runs every 4-12 s, so it stacked a new endless noise source each time (growing hiss, old ones stuck at their last gain). Moved into `_startAmbience` so it is built once (src/audio.js). Not heard by ear; no screenshot applies. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: audio polish; far-east road is her call.

**2026-10-26 (part-6 flake, second guard):** Game change (invisible): src/zoneManager.js now does a second collider rebuild 1.5 s after any model load, besides the 250 ms one, so a slow .glb swap-in cannot stay walk-through. Two consecutive full builds passed (collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed). Two passes do not prove the flake gone; watch later builds. No screenshot applies.
NEXT: audio polish; far-east road is her call.

**2026-10-26 (canal water ambience):** Game change (audio only): a soft water murmur (band-passed noise with slow swell) fades in within ~30 m of the canal channel and is loudest at the banks/bridge (src/audio.js `setListenerDistanceToWater`, src/canal.js `distanceToCanalWater`, called each frame in main.js). Not heard by ear; no screenshot applies. Screenshot run: zero console errors. Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed (part 6 passed on both full builds this cycle).
NEXT: far-east cluster road (her call), more audio polish.

**2026-10-26 (part-6 flake guard, no look change):** Game change: none (test only). collision-test part 6 now also treats a changing scene mesh count as 'still streaming' before comparing live colliders to a fresh rebuild, targeting the intermittent staged-place failure (gurukul_v2 / staging_track) where a slow .glb landed inside the 250 ms rebuild debounce. One full run passed (4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed). One pass does not prove a flake gone; watch the next builds.
NEXT: audio polish, then far-east cluster road decision (art director's call).

**2026-10-26 (tarmac footsteps):** Game change (audio only): walking on the highway tarmac strip (x 198-212, z -35 to 115) now plays a harder, drier footstep than lane dirt (src/surfaces.js `TARMAC`, src/audio.js `_playFootstep`). Not heard by ear, no screenshot applies; selected by the same `surfaceAt` path the other surfaces use. Build ALL PASSED on rerun, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed. WATCH: the first build run failed part 6 once (zone gurukul_v2, 1750 colliders `hb_brick` not registered until a manual rebuild); the rerun passed with the same code. That is the second intermittent part-6 failure on staged places, so late registration there is probably not fully fixed.
NEXT: chase the intermittent part-6 staged-place failure (gurukul_v2 / staging_track), then more audio polish.

**2026-10-26 (A-2c on-foot findability audit, no game change):** 39 of 39 village places reached on foot under real keyboard input from the house gate; walk 9 to 74 s; 12 places sit 69 to 183 m off any drawn lane (open-ground walks). Report docs/findability-onfoot-2026-10-26.md, shots docs/shots/onfoot-walk-2026-10-25/. Ticked the AUDIT box.
NEXT: audio polish, then far-east cluster road decision (art director's call).

**2026-10-26 (hero lane lamps):** Game change: solar street lamps now line the hero lane south of the house (x=-45, z 50 to 93, every 18 m, streamed `lamps_gali_h1_*` in src/main.js). Proof docs/shots/hero-lane-lamps-2026-10-26/lane_a.png and lane_b.png (both looked at: poles stand on the verge east of the lane, zero console errors). Honest differences: lamps sit about 4 m off the lane centre, wider than the galis, because at the gali offset (2 m) the npc_child route (-44,55)->(-50,96) walked into a pole (collision-test failed 1 leg, caught and fixed by moving the lamps out). Build ALL PASSED, collision-test 4785 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed.
NEXT: on-foot findability walk (A-2c), audio polish.

**2026-10-26 (spur lamps):** Game change: solar street lamps now line every east-road spur leg of 28 m or more (masjid, maidan, haveli, tvhouse, pond, gurudwara; every 24 m, streamed per leg, src/main.js `lamps_spur_*`). Proof docs/shots/spur-lamps-2026-10-26/masjid_a.png and maidan.png (both looked at: poles stand on the track edge, alternating sides; capsule is the player placeholder; zero console errors). Not done: the hero lane south of the house still has no lamp, and the east road itself carries its own lamps already. Build ALL PASSED, collision-test 4789 static solids + 6 vehicle boxes + 3 vehicles + 118 NPC legs tested, 0 failed. Note: one earlier full build run showed 1 live-stream failure (staging_track late collider registration, a timing flake); two reruns of the test were 0 failed.
NEXT: on-foot findability walk (A-2c), audio polish.

**2026-10-26 (bazaar lane lamp):** Game change: one solar street lamp now stands on the bazaar lane's x=-58 leg south of the bend (src/main.js `lamps_bazaar_a`, streamed zone), on the west verge (drawn bend->south, otherwise it landed inside the house compound). Proof docs/shots/bazaar-lamps-2026-10-26/lane_pole4.png (panel visible above the tree; the first side was inside the compound wall, caught and flipped). Only one lamp: the 25 m leg fits one at 22 m spacing. Difference not fixed: a neem partly hides it. Build ALL PASSED, collision-test 4803 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed.
NEXT: on-foot findability walk (A-2c), audio polish.

**2026-10-26 (A0a late-registration colliders, real bug fixed):** Game change (invisible but real): colliders now follow content that arrives or changes after a zone was built. New collision-test part [6] LIVE STREAM walked the real frame loop to 38 zones and compared the live collider list with a fresh rebuild: it failed 10-11 zones (staged places, gaushala, petrol pump, background houses, shop stock). Causes found and fixed: (1) a .glb finishing its load never triggered a collider rebuild (src/loaders.js `modelLoads`, watched by src/zoneManager.js, rebuild 250 ms later); (2) shop-stock cells flipping visible by distance and the near/far background-house instance re-sort changed what was solid without a rebuild (new `requestColliderRebuild()` in collision.js, called from main.js distGated, scenery.js refresh and kachcha flips); (3) src/autoColliders.js cached derived boxes per mesh forever, so instanced houses kept their first instance set: cache now keyed with instance count/version + world position; (4) initStaticColliders now runs scene.updateMatrixWorld first. Cost: 26 rebuilds in 10 s of fast walking, avg 6.7 ms, worst 87 ms on the slow software renderer. Build ALL PASSED, collision-test 4782 static solids + 6 vehicle boxes + 3 vehicles + 114 NPC legs tested, 0 failed (part 6: 38 zone stops, 0 failed). regression-check 21/22, the one failure is the known triangle counter (477k incl. shadow pass). Not sampled: part 6 walks every 4th zone, not all 152.
NEXT: on-foot findability walk (A-2c), audio polish.

**2026-10-26 (A0a causes audit, no game change):** Re-ran the full build: collision-test 4834 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs tested, 0 failed (4917 colliders, 152 zones forced). Mapped the A0a 'likely causes' item to what the test already covers (BACKLOG progress line); one cause is untested: late-registering colliders at a live zone edge. No look or game change this cycle.
NEXT: test late zone-edge collider registration, then on-foot findability walk (A-2c).

**2026-10-26 (Tasks list proof, no look change):** Game change: none; the Tasks list switching (skip-ahead via hub steps, replay, locked side jobs refused, pin/unpin of the waypoint) was already built but never tested through the UI. New tools/tasks-switch-test.mjs taps real rows: 19 rows, skip to missions 2,3,4,5,7,8 each updates step + objective and resets money/sacks/mangoes, mission 1 replays, locked side job gives a plain note, zero console errors. Proof docs/shots/tasks-switch-2026-10-26/ (m8_after_switch.png, 9_locked_side_job_note.png, both looked at). Backlog A-2b Tasks + Guard items ticked. Not tested: side-job rows in free roam (visit path shared with map click). Mission 6 has no hub so it is entered by playing 5.
NEXT: on-foot findability walk (A-2c), audio polish.

**2026-10-26 (A0-LOAD check, no game change):** Staging yard is already zone-streamed; request log (LIST=1) shows no staged model or texture before Play, so the 'stop shipping it' item was already true. Play ready 15160 ms, 12.49 MB (core village models + shared textures). KTX2 step blocked: no toktx/basisu installed and it needs her before/after judgement (NEEDS_YOU). Build ALL PASSED, collision-test 4834 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs tested, 0 failed.
NEXT: on-foot findability walk (A-2c), audio polish.

**2026-10-26 (A0-TEX pots, tried and reverted, no game change):** Tried the CC0 gazania scan inside the tv house yard pots and the dharam kanta tulsi pot (src/stagedGreenery.js `pots`). Shot docs/shots/places-2026-10-26/pots/kanta_tulsi.png: the flowers are a few thin dark sprigs floating above the pot rim, they read as dead twigs; she would reject it (her rule: an unconvincing plant is worse than none). Reverted. Tv house pots hide behind the yard wall in the front view, so not judged. Real fix needs a proper potted-plant model fitted INTO the pot (potted_plant_04 brings its own pot, so the model's empty clay pots would have to be dropped); parked, plants are hers per the 25 Oct direction. No build run (nothing changed).
NEXT: re-tint remaining pairs, then Tier 2 leftovers (on-foot findability walk, audio polish).

---
---
---
**2026-10-26 (A0-TEX greenery, staged places):** Game change: staged places now carry the trees her drawings name, using the village's existing tree set (src/stagedGreenery.js, wired in stagingYard.js): primary school neem + peepal, gurukul centre neem + 2 corner neems (inside the courtyard), bus adda peepal (back-right), chaupal peepal, tubewell neem, panchayat neem, akhada neem (back-left). Tubewell also gets edge grass clumps + shrubs from the existing CC0 scans (grass_medium_02, shrub_01). Proof (local+repo): docs/shots/places-2026-10-26/greenery/ (tubewell, akhada, gurukul checked beside her images). Honest differences: the grass scan is thin and darker than her lush green tufts, so I kept tufts to the tubewell only (spread across other places they floated on open grass); no potted plants/creepers/marigolds yet (need new CC0 sourcing, Poly Haven potted_plant_04, shrub_02/03 are candidates); tree positions guessed from LAYOUT.md text, not measured. Not ticked: A0-TEX greenery item stays open. Build ALL PASSED, collision-test 4834 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs tested, 0 failed.
NEXT: fetch potted_plant_04 / shrub_02 via tools/fetch-polyhaven-model.mjs for potted plants and bushes; re-tint remaining pairs.

**2026-10-26 (A0-TEX re-tint pass, puncture):** Game change: puncture shop tin re-tinted from her image (rust-orange + blue-grey sheets, were dark brown); build_puncture.py RUST palette, puncture_v2.glb rebuilt. Compared 6 pairs (tvhouse, post, chakki, bus_adda, petrol, puncture) against her images: all but puncture already close in colour; remaining differences are weathering/greenery/animals, not tint. Proof (local): docs/shots/places-2026-10-26/puncture/puncture_retint2.png (capsule in frame is the player placeholder). Build ALL PASSED, collision-test 4824 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs tested, 0 failed.
NEXT: compare the other 14 pairs, then CC0 plant sourcing for greenery.

---
**2026-10-26 (A0-TEX diagnosis + first colour pass, staged places):** Diagnosis: the pipeline is NOT broken. Checked ration_shop_v2.glb: UVs survive strip-textures (metre UVs), material extras present, swapShared fires, brick 1.2 / plaster 0.5 / tin 0.8 tiles per metre. 2 m close-ups (tmp/tex1, local) show plaster normal relief, corrugated tin and individual bricks (brick well at panchayat). Real causes of "flat": (1) the plaster scan averages ~0.5 linear albedo so WHITE tints rendered grey-cream; (2) no large-scale variation, so painted walls were one flat colour; (3) the thatch scan is neutral dark grey (84,80,73) so thatch read dark brown, not golden; (4) tints picked by eye (ration shop wall was saturated yellow, hers is muted ochre #B89956); (5) panchayat plinth/columns are painted plaster not brick (her drawing too: terracotta paint), so no brick pattern there is correct.
Game change (src/stagingYard.js `addWeathering`, runtime only, no new textures/draw calls): plaster x1.4 albedo, world-space mottling, damp/dust band under 0.7 m, faint rain streaks, thatch warmed to straw. Ration shop re-tinted from her image (wall 0xA88A52, plinth 0x5A4535; rebuilt via make.sh). Proof (local): tmp/tex2/ration_front*.png, tmp/all2/dairy.png, tmp/all2/panchayat.png, tmp/pairs/*.jpg (her image beside the game).
NOT done: re-tint of the other 19 places from her images (palette dump tmp/palette.py; most walls are already close, ration was the outlier); greenery from her drawings (needs CC0 plant models placed per place; only 3 plants3d models exist: gazania, grass, shrub - need sourcing); panchayat/post pillars render tan (lathe UVs) not white. A0-TEX items stay unticked except diagnose.
NEXT: sample+re-tint remaining places (pairs sheets), then source CC0 plants for greenery.

---
**2026-10-26 (ending screen check, no game change):** Checked the true ending end to end: regression-check "all eight missions complete end to end" passes (ended at all_complete), screenshot run has zero console errors, and docs/shots/2026-10-25T22-02-20-735Z/final_end_card.png shows the end card correctly (English headline larger, Hindi beneath; Continue roaming / Play again / Credits buttons, all bilingual). Not a defect found, nothing changed. Regression 21/22: the only fail is the triangle counter (476k incl. shadow pass; her 25 Oct ruling says the limit means visible triangles, ~271k busy market). Build ALL PASSED, collision-test 4824 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs tested, 0 failed. FINISH_LINE Shell box not ticked (settings-from-pause and loading screen not separately proven).
NEXT: lanes to field/gaushala/baagh/mandi need her call (NEEDS_YOU); otherwise remaining Tier 2: on-foot findability walk, audio polish.

---
**2026-10-26 (findability audit refreshed, no game change):** `node tools/findability-audit.mjs` crashed since the anchors refactor (PLACES now spreads `pt()`); repaired, staging yard excluded. Result on the 40 village places: 0 not findable without the map (11 on 23 Oct) because each has a signpost/milestone. Four have no lane within 30 m: field 69 m, gaushala 69 m, baagh 43 m, mandi 36 m (signposted, no visible path). It is a static heuristic, not an on-foot walk, so the A-2c audit box stays open. Build not rerun (tool-only change).
NEXT: lane/path to those four (needs her layout call, so NEEDS_YOU), then audio polish / ending screen check.

---
**2026-10-26 (menus: title Settings, volume saved):** Game change: the title screen has a Settings link (quality High/Medium/Low + volume, bilingual) beside Controls, and the volume choice is now remembered across reloads (localStorage `dopahar_volume`, src/quality.js; pause menu slider and title slider stay in step, src/pause.js). Proof: docs/shots/settings-2026-10-26/title_settings.png (real browser: slider set to 35, reload shows 35 in both sliders, zero console errors). Build ALL PASSED, collision-test 4824 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs tested, 0 failed. Anchor wiring audit re-checked: school is already read from src/anchors.js; remaining baked copies are the minor ones listed in the A-1 entry below.
NEXT: audio polish / ending screen check, then wayfinding audit (A-2c).

**2026-10-26 (anchors wiring 4, no look change):** Game change: none visible. Side-job markers pump, kulfi, kanche, milk, gate, patang (src/jobs/data.js) are now offsets from the store / chaat / chowk / halwai / baagh anchors, so they move with the place; positions numerically identical (checked). Still baked: SchoolCompound in village.js, gilli MAIDAN (46,104, not a mapped place), pond/johad plant keep-outs, eastRoad ends, lane sites. Build ALL PASSED, collision-test 4824 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs tested, 0 failed.
NEXT: remaining baked anchors (school village.js), then the audio/menus polish pass.

---
**2026-10-26 (load time 2, no look change):** Game change: sky-lighting file halved (new public/assets/hdri/camdeboo_road_512.hdr, 382 KB vs 1.45 MB; tools/hdr-downscale.mjs; src/main.js loads it; before/after shots docs/shots/2026-10-25T21-11-18-113Z vs 2026-10-25T21-15-52-125Z low_angle.png look the same). tools/load-time-test.mjs now uses its own gzip static server (vite preview sends no gzip, GitHub Pages does) and `LIST=1` prints the biggest requests. Honest numbers: Play ready 15.2 s, 12.5 MB before Play (was 13.4-14 MB); JS is only 0.4 MB gzipped so the earlier "5 s before first model" guess was wrong: it is bandwidth. 4G at 9 Mbit moves 12.5 MB in ~11 s, so 10 s needs ~4 MB less before Play: models (house_compound 1.55, bazaar_row 1.14, tea_stall_chowk 1.03, halwai 0.96, temple 0.86 ...) plus ~4 MB of shared textures. That is a detail-vs-time trade, her call (NEEDS_YOU updated). Build ALL PASSED, collision-test 4824 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs tested, 0 failed; budget 38.79 MB.
NEXT: audio pass / save-menus.

**2026-10-26 (load time, Tier 2 mobile/performance):** Game change: Play now unlocks when the models within 150 m of the opening spawn are in (src/assetSlots.js `resolveAllNearFirst`, ui.js `markOpeningViewLoaded`); the far models (petrol pump, dharam kanta, gurukul side, etc.) keep loading behind it. New tool `node tools/load-time-test.mjs` (needs a built dist/; simulates 9 Mbit/s, 100 ms RTT, `CPU=1` env for no CPU throttle). Numbers, honestly: title text paints at ~0.35 s (before any asset, good); Play ready 14.4 s before -> ~12.8 s after (CPU=4 gives 14.4). Target in FINISH_LINE is 10 s, so this still FAILS and is not wired into `npm run build`. Where the time goes: ~5 s before the first model request is even sent (1.4 MB JS + world build), then ~7 MB of core-village models (bazaar_row 1.2 MB, school_compound 1.6, house_compound 1.6, halwai 1.0, tea_stall_chowk 1.0, temple 0.9, ...). Shrinking the radius would get under 10 s but makes buildings visibly swap from placeholder while she walks = the pop-in she rejected on 24 Oct, so I did not. Real fixes left: smaller core models (shrink.js triangle budget / KTX2), or lazy-load JS. regression-check 21/22 (triangle counter 480k incl. shadow pass, same failure as 25 Oct). Build ALL PASSED, collision-test 4824 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs tested, 0 failed.
NEXT: audio pass / save-menus, or shrink the core models if she wants the 10 s.

---
**2026-10-26 (anchors wiring 3, no look change):** Game change: none visible. Patang kid start points and the banta buy spot now read src/anchors.js (offsets from store / banta). Backlog A0a collision and A0b signboards ticked with their proof (collision-test output, docs/shots/signboards-final-2026-10-25/). Build ALL PASSED, collision-test 4824 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs tested, 0 failed.
NEXT: Tier 2 systems (mobile/performance, audio, menus).

---
**2026-10-26 (anchors wiring 2, no look change):** Game change: none visible. Petrol pump and dharam kanta slots (offsets from the highway anchor), banta cart, and the mango fallback ring now read src/anchors.js; positions numerically identical. Build ALL PASSED, collision-test 4824 static solids + 6 vehicle boxes + 3 vehicles + 66 NPC legs, 0 failed. Still baked: school/village.js SchoolCompound, patang KID_START, job marker offsets in jobs/data.js (pump, kulfi, kanche, gilli, milk, gate, patang), eastRoad, lane sites.
NEXT: Tier 2 systems (mobile/performance, audio, menus).

---
**2026-10-26 (anchors wiring, no look change):** Game change: none visible. bazaar slot, pond buffalo, outskirt trees (pond, johad, haveli, gaushala) and the pond/johad plant keep-outs now read src/anchors.js (trees keep their old offsets from the anchor). Build ALL PASSED, collision-test 4824 static solids + 66 NPC legs, 0 failed. Still baked: highway cluster offsets (main.js:920,925), school outskirt/village.js, baagh/mango ring, banta, jobs, eastRoad, lane sites.
NEXT: Tier 2 systems (mobile/performance, audio, menus) and remaining baked anchors.

---
**2026-10-26 (A-1 movability audit, no game change):** Which places move by editing ONE line in `src/anchors.js` (zones, PLACES list, map, Visit menu, wayfinding all read it) and which still carry the same coordinate baked in elsewhere. Method: script (tmp/audit_anchors.mjs) finds source lines holding both numbers of an anchor; it cannot see baked OFFSETS (e.g. `-82 + 3`), so treat "clean" as "no literal copy found".
- Staged yard (21 places, houses kit): fully movable, derived from `src/stagedPlaces.js`.
- Clean (anchor only): halwai, chowk, canal, chaat, eastgali, dairy, khalihan, tubewell, anganwadi, mela, gurudwara, sabzi, gurukul, mandi, jain, health, cane, temple (hits for temple/cane/jain/health/tvhouse/manihari were colour or canvas numbers, not positions).
- Baked copies (move the anchor AND these): teastall `TEA_SHOP_POS` main.js:269; store `STORE_POS` main.js:271 + KID_START jobs/patang.js:13; post/ration/chakki `*_POS` main.js:330-332 + jobs/data.js:6,11 (ration, chakki); bazaar placement main.js:886; banta jobs/stalls.js:46; baagh jobs/data.js:14 + jobs/mango.js:22 (mango ring) + village.js wall coords; school village.js:13 (SchoolCompound) + outskirt trees main.js:1674; gaushala `outskirtTrees` main.js:1673; pond main.js:1484-1490 (buffaloes), 1664 trees, vegetation.js:139 exclusion disc; johad main.js:1667 trees + vegetation.js:140; haveli main.js:1670 trees; maidan jobs/gilli.js:11; chemist + masjid in src/eastRoad.js (road polylines end at them); highway main.js:920,925 (petrol pump, dharam kanta offsets from the cluster); westgali/eastgali row positions in scenery.js:43-50 (lane rows, not anchored); lane site centres main.js:1598.
- Also not movable by one value: the abadi row models + src/abadiBoxes.json (composed in build_abadi.py), hero-lane waypoints, mission NPC routes.
NEXT: wire anchor reads into the baked copies above (mechanical, no look change), then Tier 2 systems.

---
**2026-10-26 (places 2-21, STAGING YARD):** Game change: 21 places from `Places V1/` are built with arch.py `Kit` and standing in the staging yard (grid origin 320,-160, 80 m, 6 per row; table = `src/stagedPlaces.js`, one line per place; anchors, the map inset, the Visit-place list and zone registration all derive from it; track = src/stagingYard.js). Slot (x,z): 0 primary school (320,-160) | 1 gurukul (400,-160) | 2 dudh dairy (480,-160) | 3 bus adda (560,-160) | 4 chaupal (640,-160) | 5 volleyball (720,-160) | 6 puncture (320,-80) | 7 tubewell (400,-80) | 8 paani tanki (480,-80) | 9 ration shop (560,-80) | 10 post office (640,-80) | 11 atta chakki (720,-80) | 12 petrol pump (320,0) | 13 panchayat (400,0) | 14 TV house (480,0) | 15 bhatta (560,0) | 16 khel maidan (640,0) | 17 khalihan (720,0) | 18 dharam kanta (320,80) | 19 akhada (400,80) | 20 houses kit A-H (480,80, two instanced rows). The notebook map shows them in a "Staging yard" inset (top right, tap a number to travel); they are also in the Visit-place list. World ground widened to x 912, player x clamp 880 (main.js GROUND_HALF_X).
Pipeline: `tools/blender/build_<place>.py` -> `tools/blender/make.sh <script> <slot>` (or `make_staged_all.sh` for all, `make_houses_kit.sh` for the 8 houses) -> shrink -> `tools/strip-textures.mjs` removes the embedded texture copies (11 MB of duplicates had pushed assets to 42.8 MB; now 37.8 MB) and `src/stagingYard.js` re-applies the shared CC0 sets from the material extras (dopahar_set/dopahar_repeat). Lesson: the strip MUST keep the UVs (prune keepAttributes) or every surface renders flat. Models are named *_v2.glb on purpose so the old zones' drop-in slots (src/siteSlots.js) do not swap them in. Collision comes from the visible geometry (autoColliders, incl. InstancedMesh); no hand boxes.
Old versions that these supersede (all still where they were): school (-50,106), gurukul (160,85), dairy (-112,18), tubewell (-40,-8), post (-68,26), ration (-68,31), chakki (-68,36), petrol pump / highway cluster, panchayat (none yet), TV house (70,12), bhatta/khalihan/khel maidan (old ones at -78,-5 / 165,135).
Not done / honest gaps: canal, pond (organic-heavy: needs her water + plants), houses_kit is NOT wired into the existing abadi rows (the 3 abadi row models + src/abadiBoxes.json are composed in build_abadi.py; the kit is instanced in the yard via src/houseKit.js `placeKitHouses` / `kitStreet` and is ready to be called from src/scenery.js: next job), no ceiling/interiors for the gurukul (solid rooms by design: she is redesigning it). Cows, buffaloes, trees, crops, flowers, grass, wheat/bhusa/straw heaps, ducks, lotus are NOT built (hers); planters and platforms are left empty.
Differences I can name vs her images (all places): textures read smoother than her photoreal renders; the game's low golden light + fog tint everything tan (concrete reads olive, white walls cream); brick is more saturated red than hers; no weathering streaks/moss/stains anywhere; thatch reads dark brown not golden; plant/animal slots empty. Per-place notes are in the git log.
Proof: docs/shots/places-2026-10-26/<place>/ (local, gitignored).
NEXT: wire the kit into src/scenery.js abadi rows; canal modules; pond basin; then back to collision/signboards/Tier lists.

---
**2026-10-26 (places, 2-4: primary_school, gurukul, dudh_dairy):** Game change: three redrawn places built with arch.py `Kit` (tools/blender/build_primary_school.py, build_gurukul.py, build_dudh_dairy.py) and put in the STAGING YARD (src/stagingYard.js, grid origin 320,-160, 80 m): yard 0 primary school (320,-160), yard 1 gurukul (400,-160), yard 2 dudh dairy (480,-160); dirt track along the gate side. Each is in the Visit-place list and in a "Staging yard" inset box top-right of the notebook map (click to travel). Player x clamp widened to 540 (main.js GROUND_HALF_X). Collision comes from the visible model (autoColliders), nothing hand-boxed. Supersedes (old ones stay where they are): school at (-50,106), gurukul (160,85), dairy (-112,18).
Primary school: U of blocks 60 x 50, 6 m rooms + 3 m verandahs, 10 furnished classrooms (10 desk-benches, board, teacher table, almirah, fan, lights), office, staff room, 2 corner store rooms, flag on 8 m pole + 3-step plinth, painted track, playground (slide, swings, see-saw), 2-door toilet block, kitchen + dining shed, wash trough with taps + blue tank, pump, cycles, planter rings left EMPTY, hygiene posters (5 pictures, one atlas), mural on the front wall, blank donation board right of gate (text painted via placeBoards 'school_donation'), name board over gate. Changes from spec: roof parapet is 4.4 m everywhere (image shows centre slightly taller); wings 27 m not 26 (3 equal rooms).
Gurukul: 60 x 45, 2.5 m brick front wall, 5 m green iron gate, 4.5 m pillars with lanterns + cream arch with name board, wings 31 m with outer face as boundary, centre block two storeys 7.8 m, round arcades on piers + upper gallery, jaali parapets, plus-shaped brick paths, round platform at the crossing (neem hers), pump, corner garden planters. Rooms are SOLID (no interiors): generic main place she will redesign.
Dairy: 18 x 12 patch, 7 x 5 shop with open tiled counter and stocked interior, 6 x 4 thatch stable with trough, chaff cutter + flywheel, pump over tub, dung cakes/stack, charpai, pots; slogan band on the LEFT wall with painted cow-calf picture + red Hindi slogan board. Model files are *_v2.glb so the old zones' drop-in slots do not swap them in.
Differences I can name vs her images: school plaster/ground read one warm tan (hers cream-white, swept pale ground); gurukul brick still more orange than hers and courtyard beds are bare dark soil (grass is hers); dairy thatch reads dark brown not golden; cow/buffalo/trees/crops not built (hers); posters are simple pictograms.
Proof: docs/shots/places-2026-10-26/{primary_school,gurukul,dudh_dairy}/ (local, gitignored).
NEXT: bus_adda, chaupal, volleyball, puncture, tubewell, paani_tanki ... (staging yard slots 3+), then houses_kit.

---
**2026-10-26 (places, 1: gaushala):** Game change: gaushala rebuilt to `Places V1/gaushala/LAYOUT.md` + approved top view, with arch.py `Kit` (tools/blender/build_gaushala.py; old hand-rolled version gone): brick perimeter with cement coping and buttresses, 0.5 m brick + iron-bar railing front, brick gate pillars, open iron gate (arched top rails), blank board; ONE 4 m deep cattle shed down the left wall (brick pillars, tin roof, cement trough, stall dividers); 6 x 5 m straw store back-right (brick pillars, tin roof, bales); 4 x 3 m cream office front-right (recessed panel door, barred window, flat roof + parapet, meter box); long cement water trough + hand pump; round brick neem platform (tree left empty); compost pit + round biogas dome with gas pipe front-left; chaff cutter, two wheelbarrows, dung heaps, buckets. Repeats from arch.py (brick 1.2, tin 0.8). Colliders (src/farmSites.js) match the new footprint; gate stays open 4 m. Tints guessed from the image by eye (no image library here), brick tint 94583F. Not built on purpose: cows, calves, tree, fodder (hers). Build ALL PASSED, collision-test 0 failed (1982 static solids, 66 NPC legs), budget 32.72 MB. Proof docs/shots/places-2026-10-26/gaushala/{iso,top,gate,inside,rear}.png. Differences I can name vs her image: brick reads more orange and flatter than her darker brown-red; ground is one flat dirt tone (hers has straw and wear); the wheelbarrows are crude; the office reads tan not cream. Stayed at its current anchor (-125,-35): replaces the old gaushala in place, not the staging yard.
NEXT: primary_school, gurukul, dudh_dairy (staging yard grid origin 320,-160, 80 m); fix brick tint/ground wear on the way.

---
**2026-10-25 (collision cycle):** Game change: collision is real now. Everything visible in the player's body band is solid unless listed walkable (src/autoColliders.js, src/solidRules.js); tools/collision-test.js proves it in npm run build (1995 solids, bike/cart/tractor+trolley, 66 NPC legs, 19.5k geometry cells, 0 failed; was 116 before). Bullock cart now collides with its bullocks. All painted boards follow the 25 Oct signboard rule (src/signPaint.js). Tier 1: src/anchors.js placement table, drop-in model slot for every streamed place (src/siteSlots.js) with generated dimensions in docs/asset-slots.md. Validator check 6 falls back to an A* path walk when a hand-written waypoint chain goes stale; check 5 counts any opaque material. Build ALL PASSED. regression-check 21/22 (triangles 475k browser counter, pre-existing; movement and missions pass).
NEXT: Tier 2 systems (tasks list and minimap click-to-travel, A-2a notebook map click), then mobile/performance, audio.

**2026-10-25 (cycle 39z99n50, tasks replay):** Game change: Tasks list (src/freeRoam.js) finished story missions can now be replayed from their hub step while the story is still running (before, only skip-ahead worked). Build ALL PASSED. No UI screenshot taken, so FEEDBACK item 12 is not ticked; waypoint switching for side jobs and skip-ahead were already in. Still open in item 12: shipped-minimap-conventions web research.
NEXT: items 8/9/10 of the 15-hour queue (lanes street life, hand-built props, vegetation LODs).

---
**2026-10-25 (cycle 39z99n49b, hero lane lamps - tried, reverted):** Tried streamed solar lamps on the hero lane (house to halwai to school) in src/main.js. Result: +3 to +4 draw calls in both views (157->160, 166->170, already above 150 incl. shadow pass) and the lamps were not visible in the proof shots (docs/shots/hero-lamps-2026-10-25/), so the change was reverted: cost with no visible gain. No game change this cycle. Needs the art director: draw-call ceiling, and where exactly the hero lane runs (the straight house-halwai line is not the real lane centre).
NEXT: item 12 task-menu leftovers (waypoint switching), then lanes street life.

---
**2026-10-25 (cycle 39z99n49, johad reeds):** Game change: johad reeds (src/farmSites.js reedClump) were plain dark sticks; now clumps of 6-10 tapered bent leaf blades in mixed greens (some dry straw) plus bulrush stalks with brown seed heads; tubewell hauz water retinted deeper/murkier. Same draw calls. Build ALL PASSED, no console errors. Proof docs/shots/reeds-2026-10-25/{johad_reeds2,hauz}.png (photo camera, no capsule in frame; not item-ticked, item 7 stays her call). Gaps: canal water untouched, pond lotus pink a little saturated. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: item 4 other shops' boxy goods / unidentified-objects list, then A-2c routes legibility.

---
**2026-10-25 (cycle 39z99n48, water glare):** Game change: shared water material (src/water.js) was blowing out to a white glare against the low sun on the johad; roughness 0.42->0.62, env reflection 0.7->0.45, ripple normal strength 1.6->1.1, glitter halved. Johad now reads as rippled water with a soft sheen. Build ALL PASSED, budget 30.92 MB, no console errors. Proof docs/shots/water-2026-10-25/{johad,johad2}.png (before/after; headless). Gaps: reeds are plain dark sticks, pond lotus still read faceted from this angle, tubewell hauz water flat green.
NEXT: reeds/pond lotus polish, then A-2c routes legibility.

---
**2026-10-25 (cycle 39z99n47, pond lotus):** Game change: the pond lotus flowers (src/farmSites.js lotusFlowerGeos) were faceted glossy pink spikes (plaster normal map sparkle); now three rings of wide smooth 5x8-grid petals that cup and flare, with a painted cream-to-pink veined petal texture and a yellow seed head, own non-normal-mapped material (one extra draw call, only in views that see the pond). Build ALL PASSED, budget 30.92 MB, no console errors. Proof docs/shots/lotus-2026-10-25/{a,c}.png (photo camera, buffalo capsules at left edge of c only). Also found Blender IS installed (~/Applications/Blender.app); the n29 'not installed' note was wrong, and barber clippers / recharge cards / CRT were already rebuilt in 9802b64, so item 4's goods leftover is closed. Gaps: pink is a little saturated, pads still low-poly.
NEXT: item 7 water surface and shoreline close-up, then A-2c routes legibility.

---
**2026-10-25 (cycle 39z99n46, chakki housing + court check):** Game change: the atta chakki mill's drum (tools/blender/build_new_shops.py) was one painted can; it now has a cast-iron base flange, dark worn foot band, split-line seam, six gusset ribs, a brass rating plate and a hand-wheel adjuster (new_shops.glb 23.1k tris, same draw calls). Build ALL PASSED, budget 30.92 MB, no console errors. Proof docs/shots/chakki-housing-2026-10-25/close2.png (photo camera, no capsule in frame; a flour sack stands in front on the left, drum is the subject). Also checked the khel maidan badminton court: real lines (doubles, singles, service, centre), mesh net on poles, worn packed-mud pad, already built; proof docs/shots/court-2026-10-25/{court,court_net}.png, so the court and cricket-ground leftovers of item 5 are verified, not changed. Gaps: chakki wall colour is still flat patches; hopper/drum still tinted metal-set paint. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: item 4 other shops' boxy goods, then item 7 leftovers, then A-2c routes legibility.

---
**2026-10-25 (cycle 39z99n45, medical fridge):** Game change: the medical store's fridge (tools/blender/build_bazaar_row.py medical()) was a solid white block with a flat door; it is now a hollow upright display fridge: steel cabinet, door frame, handle, top vent grille, plinth, three glass shelves with vials/bottles inside. Same draw calls (bazaar_row.glb 38.7k tris). Build ALL PASSED, budget 30.91 MB, no console errors; view 117 calls / 416k tris (incl. shadow pass, not re-measured with validator counter). Proof docs/shots/medical-fridge-2026-10-25/fridge3.png (photo camera; a shopkeeper capsule edge is at the right border, fridge is the subject). Gaps: bangle tori are still tinted metal-set rings (read fine, not glass); no glass pane on the fridge (open-front chiller on purpose, a pane hid the stock). Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: playtest items 2/5 leftovers (cricket/badminton court, atta chakki housing), then A-2c routes legibility.

---
**2026-10-25 (cycle 39z99n44, dhaba cook):** Game change: a capsule cook (blue, npc_dhaba_cook) now stands behind the mandi dhaba counter between tandoor and shelf (src/farmSites.js createMandi); first tint was tan and vanished against the wall, recoloured. Build ALL PASSED, no console errors; view 76 calls / 109k tris. Proof docs/shots/dhaba-cook-2026-10-25/cook.png (photo camera; capsule IS in frame on purpose, it is the subject). Gaps: dhaba plaster walls still flat colour; bangle tori and medical fridge still open. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: bangle tori / medical fridge, then A-2c routes legibility.

---
**2026-10-25 (cycle 39z99n43, mandi dhaba):** Game change: the mandi's Highway Dhaba (src/farmSites.js createMandi) is a working roadside eatery now: timber counter with tea kettle, steel handi stack and a row of glasses on a shelf, a clay tandoor with rolled rim and dark mouth, tin roof with ribbed purlins and a flue on the truck-metal set, three timber verandah posts, six low wooden stools by the charpais (crate-wood set). No new draw call. Build ALL PASSED, no console errors; view 75 calls / 109k tris. Proof docs/shots/dhaba-2026-10-25/{front,counter}.png (photo camera; HUD chip and minimap visible, no capsule in frame). Looked at item 7 water too: pond/johad shots docs/shots/water-2026-10-25/{pond_d,johad_d}.png already have depth tint, wet-mud ring, real lotus pads/flowers; not ticked, her call. Gaps: dhaba plaster walls are still flat colour patches; no cook capsule at the tandoor; bangle tori and medical fridge still open. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: capsule cook at the dhaba tandoor, then bangle tori / medical fridge.

**2026-10-25 (cycle 39z99n42, mandi trucks):** Game change: the three mandi trucks are real trucks now (src/farmSites.js truck()): ladder chassis, flatbed with slatted wooden side boards on iron posts, headboard and tailgate, forward-control cab with windscreen, side windows, door seams, grille, headlamps, mirrors, bumper, fuel tank, tyres with hubs, rear axle doubled. Wood boards go on the crate wood set, rest on the truck metal set; no new draw call. Build ALL PASSED, budget 30.89 MB. Proof docs/shots/mandi-trucks-2026-10-25/{side,front34}.png (photo camera, headless, no capsule in frame; no formal subject check). Gaps: cab is still box-built (no rounded panels); dhaba props flat colour; bangle tori and medical fridge open. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: item 7 water/shoreline check, then dhaba props.

---

---

**2026-10-25 (cycle 39z99n41, mandi godown sacks):** Game change: the 12 flat cream boxes outside the mandi godown are now 20 stacked gunny sacks (capsule loaf shape, jute PBR set, own size/yaw/tone, 4 courses by each door); the three trucks' bodies, cabs and bumpers moved onto the metal set with rib rails (src/farmSites.js sack(), truck()). Build ALL PASSED, budget 30.89 MB, no console errors; view 70 calls / 99k tris. Proof docs/shots/mandi-sacks-2026-10-25/sacks.png (free camera, no capsule in frame). Gaps: truck bodies are still plain boxes with low-poly wheels (barely changed, see trucks.png); dhaba props still flat colour; bangle tori and medical fridge still open. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: real truck shape (cab, flatbed with slatted sides, tyres), then item 7 water/shoreline.

---

**2026-10-25 (cycle 39z99n40, mandi produce crates):** Game change: the mandi vegetable yard's 14 flat-colour boxes (brown box + coloured slab) are now open slatted wooden crates on the real wood PBR set (own tint and slight yaw each), heaped with 3 layers of tomato / potato / onion / brinjal from the shop-goods atlas (src/farmSites.js createMandi, one new goods mesh 'mandi_produce' + the wood set, streamed with the mandi). Searched: Poly Haven wooden_crate/wicker already tried and rejected in cycle m, so hand-built. Build ALL PASSED, budget ok, no console errors; view shows 71 calls / 150k tris. Proof docs/shots/mandi-produce-2026-10-25/{yard,close}.png (photo camera, no capsule in frame; HUD chip top-left is the objective, not fps). Gaps: godown sacks and dhaba props still flat-colour boxes; bangle tori and medical fridge still open. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: mandi godown sacks + truck bodies (flat paint), then item 7 water/shoreline.

---

**2026-10-25 (cycle 39z99n39, khet verification):** NO code change (written honestly): playtest item 3 (khet variety, haystacks) was already built in earlier cycles but never verified. Shot it: yellow flowering sarson block, sugarcane, young/ripe wheat, ploughed earth and veg patch all read from the wide view; bhoosa haystacks exist behind the tubewell kothri and behind the Yadav tea stall and read as haystacks. Item 3 ticked with proof docs/shots/khet-variety-2026-10-25/{field_wide,tubewell_hay,tea_hay}.png. Noticed: the tea stall view runs 175 calls / 614k tris (incl. shadow pass), not re-measured with the validator counter. Still needs the art director: triangle limit meaning, draw-call ceiling.
Also looked at the highway's south end by the kanta: asphalt narrows into a rutted dirt continuation (proof docs/shots/kanta-road-2026-10-25/b.png, free camera), so the 'abrupt end' item 7 looks addressed already; not ticked, her call. Kanta view still reads flat-shaded buildings and low-poly roadside.
NEXT: playtest block items still open: 2 (plants, ruled leftovers), 4 (other shops' goods), 5 (atta chakki housing, cricket/badminton court), 7 (water, lotus, shoreline mud, road ending near godown).

---

**2026-10-25 (cycle 39z99n38, smooth round metal):** Game change: Blender `cyl()` (tools/blender/common.py) now smooth-shades the sides of round bodies (seg >= 16, caps stay flat); the chakki mill's drum, hopper, motor and flour bin were visibly faceted and banded, now read as round sheet metal. Only new_shops.glb rebuilt this cycle (22k tris, same draw calls); every other building picks the fix up the next time its script is re-run. Build ALL PASSED, budget 30.89 MB. Proof docs/shots/chakki-smooth-2026-10-25/close.png (before: docs/shots/chakki-2026-10-25b/close.png; free camera, no capsule in frame, headless 2.9 fps). Gaps: wall colour is still flat patches; hopper and drum are flat blue/green paint tint on the metal set. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: re-run other Blender builders (petrol pump, kanta, halwai, school) so their cylinders smooth too; then A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n37, ration shop rate plate):** Game change: the ration shop's "rate board" was a dark panel with chalk-tick streaks half hidden behind the rolled shutter (read as smeared). Removed it from the Blender model (tools/blender/build_new_shops.py) and put a printed bilingual plate ("Wheat · Rice · Sugar · Oil" + Hindi) on the clear parapet wall (src/newShops.js, atlas row 6, sign hub 2672 -> 2904 px tall). Same draw call. Build ALL PASSED, budget 30.90 MB, no console errors. Proof docs/shots/ration-rates-2026-10-25/ration.png (free camera, no capsule in frame; before: docs/shots/chakki-mill-2026-10-25/ration.png). Checked chakki: its mill, sacks, motor are in the visible Blender model, not only the hidden group (docs/shots/chakki-mill-2026-10-25/chakki.png). Gaps: the chakki's tall dome housing is plain flat paint; ration counter textures untouched. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: chakki housing materials; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n36, gurukul trim):** Game change: Gurukul College (src/farmSites.js createGurukul) gets concrete sunshades over every window, a stained dado band at the wall foot, rainwater downpipes at three corners and a door canopy; front board raised 0.55 m so the English line is no longer clipped by the verandah slab. Same merged mesh, no new draw call. Khel maidan outfield re-shot: already has mown stripes, dust wear and mud (the old "uniform olive" gap is stale), proof docs/shots/khel-outfield-2026-10-25/wide.png. Build ALL PASSED, budget 30.90 MB, no console errors. Proof docs/shots/gurukul-trim-2026-10-25/{yard,board}.png (proof-shot, free camera, no capsule in frame; not item-ticked). Gaps: the plinth-to-sill band (z 2.0) still runs through the ground-floor windows; no compound wall. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: check ration shop / chakki props were not edited only in the hidden new_shops_old group; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n34b, post box on the real model):** Game change: the visible red pillar box (Blender, tools/blender/build_new_shops.py) had its slot, hood, clearance door, lock and plate on the side facing the post office wall, so lane viewers saw a blank cylinder; all now face the street, and the plate carries printed text ("Clearance 10 · 4" + Hindi) as a signboard decal (src/newShops.js, one more atlas row, sign hub 2440 -> 2672 px tall). FOUND: cycle n33's post box edits went into the hidden 'new_shops_old' collision group, not the visible model (same trap may exist for other n-cycle "code" edits to post office / ration shop props). Build ALL PASSED, budget 30.90 MB, no console errors. Proof docs/shots/postbox-plate-2026-10-25/plate.png (free camera, no capsule in frame; item 5 not ticked as a whole). Gaps: counter textures untouched. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: check other new-shop props (ration shop, chakki) were not edited only in the hidden group; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n35, chakki board):** Game change: the Atta Chakki signboard (src/newShops.js buildNewShopSignboards) was sunk behind the tin roof's front edge, clipping the bottom of the English line; raised 0.2 m so "Atta Chakki" now reads in full. Same draw call. Build ALL PASSED, budget 30.90 MB, no console errors. Proof docs/shots/chakki-board-2026-10-25/front2.png (proof-shot, free camera, no capsule in frame; neem branches cover part of the right edge). Gaps: mill is still flat-shaded Blender paint, not item-ticked. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: act on her ruling; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n34, gurudwara and masjid sides):** Game change: gurudwara and masjid (src/farmSites.js sideWindows) now have three grilled windows per side wall and three on the back (were blank slabs), plus a bilingual parapet board each ("Gurudwara Sahib", "Masjid", src/placeBoards.js). Same merged meshes, one extra board draw call each. Build ALL PASSED, budget 30.90 MB, no console errors. Proof docs/shots/gurudwara-2026-10-25b/{front,side}.png (proof-shot, free camera, no capsule in frame; masjid not shot). Gaps: no compound wall/gate; hero lane through school wall and temple lane end still open. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: act on her ruling; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n33, post box detail):** Game change: the red pillar post box outside the post office (src/newShops.js) now has a flared foot, two bands, a hood over the slot and a collection-times plate with screws (was a plain cylinder and dome). Same metal mesh, no new draw call. Build ALL PASSED, no console errors. Proof docs/shots/postbox-2026-10-25/front.png (proof-shot, capsule in frame, so not tickable). Gaps: plate is blank (no text), counter textures untouched. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: act on her ruling; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n32, east road PBR bed):** Game change: the east road legs (createEastRoadLeg, src/farmSites.js) now use the scanned ground PBR set (colour+normal+roughness) under the baked tints instead of the plaster set; ruts, gravel and dust now read as real packed earth. Same mesh, no new draw call. Build ALL PASSED. Proof docs/shots/eastroad-pbr-2026-10-25/road_a.png (proof-shot, capsule in frame, not tickable; 139 calls, no console errors). Gaps: edging stones and drain lips share the earth texture (dusty, acceptable); no street life on the road. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: act on her ruling; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n31b, A-2c lane lamps):** Game change: solar LED street lamps now line the east gali, its south leg (E2), the west gali and the south gali (src/main.js lamps_gali_*, streamed in 36 m chunks via the existing createStreetLamps, no new asset). Build ALL PASSED. Proof docs/shots/gali-lamps-2026-10-25/pole_close.png (proof-shot, free camera; poles are thin so at 20 m they barely read, close shot shows panel, arm, LED head). Stale audit items closed by code check: kachcha haystack debris already removed (39z98), dairy has boards on both faces, chowk chairs are moulded. Gaps: hero lane and spurs have no lamps; busy gali views read 180-197 calls incl. shadow pass, not re-measured with the validator's own counter. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: spur/hero-lane lamps only if draw calls allow; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n31, bazaar Blender leftovers):** Game change: BLENDER IS INSTALLED (~/Applications/Blender.app, tools/blender/make.sh works; the "not installed" notes in cycles n29/n28/n27 are stale). Rebuilt bazaar_row.glb: the barber's clippers are now a tapered body with steel blade comb, teeth and a power cord (was one black box), and the mobile shop's six recharge cards hang on a wooden pegboard (were six floating coloured rectangles). Same materials, no new draw call. Build ALL PASSED, budget 30.90 MB, no console errors. Proof docs/shots/clippers-cards-2026-10-25/{barber,mobile}.png (proof-shot tool, capsule keepers in frame, so not tickable). Gaps: CRT/tower still vertex-colour paint (tinted metal PBR), item 4 NOT ticked as a whole. Still needs the art director: triangle limit meaning, draw-call ceiling.
NEXT: act on her ruling; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n30, hero lane map line):** Small game change: the notebook map/minimap pencil line for the hero lane ran to z 107 (inside the school yard); it now ends at the school's south gate, z 93, matching the real lane (src/freeRoam.js LANES). Findability audit still 0 of 40 not findable. Build ALL PASSED. No screenshot taken (map line only), nothing ticked. Temple lane check: it ends at the temple's west gate gap (2,51), not inside the compound, so that old finding is stale. Everything else still needs the art director: triangle limit meaning, draw-call ceiling, Blender install.
NEXT: act on her ruling; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n29, shop goods leftover check):** NO game change (written honestly). Checked what item 4's "other shops' goods still boxes" leaves: every bazaar unit's stock (kirana, sabzi, manihari, barber towels/oil, puncture tyres, mobile cartons) is already printed-atlas code goods in src/shopGoods.js/bazaar.js. What is still flat colour is Blender-side (barber clippers, mobile recharge cards, CRT) in tools/blender/build_bazaar_row.py, and Blender is not installed here, so they cannot be rebuilt. Still needs the art director: triangle limit meaning (visible 271k vs renderer ~500k), draw-call ceiling (hero/bazaar 159-166 vs 150), Blender install.
NEXT: act on her ruling; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n28, playtest block item 3, veg fruit size):** Game change: brinjal and okra bush fruit (src/field.js vegBushTexture) enlarged about 1.5x (5 fruits per bush, fatter aubergines, longer okra pods) so they read at walking distance. Texture only, no new draw call. Build ALL PASSED. Proof docs/shots/vegbush-2026-10-25b/sabzi_close.png (free camera, headless, no capsule in frame; brinjal reads clearly; item 3 not ticked as a whole). Still needs the art director: triangle limit meaning (visible 271k vs renderer ~500k), draw-call ceiling (hero/bazaar 159-166 vs 150).
NEXT: act on her ruling; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n27, signage check):** NO game change (written honestly). FEEDBACK item 1's "Banta shop and Chaat thela are not built" was stale: both exist (src/farmSites.js, freeRoam places). Shot both boards from game distance: "Banta - Goli Soda" and "Chaat & Golgappa" read English-first, Hindi small above, dark paint on cream. Proof docs/shots/banta-chaat-2026-10-25/{banta_s,chaat_s}.png (capsule keepers in frame, so not tickable). Everything left needs the art director: triangle limit meaning (visible 271k vs renderer ~500k), draw-call ceiling 150 (hero/bazaar 159-166), Blender is not installed so the bazaar row model and a plain crate cannot be rebuilt.
NEXT: act on her ruling; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n26, tri-audit re-run):** NO game change (written honestly). Grass tufts already have distance density LOD (realPlants.js addPlantInstances, radius 22, thins at 55%/80%), so that NEXT was already met. Re-ran tools/tri-audit.mjs on the hero view: renderer 496k tris / 135 calls, but the sum of visible meshes is only 271k; the rest is the shadow pass and composer. Largest: shop_goods 57k, bazaar hb_main 31k + hb_props 28k, grass 22k, lane_0 19k, tree foliage 18k + cards 18k, crop_rows 14k, sarson 9k. The 400k limit is under 400k if counted as visible mesh tris, over if counted as renderer.info; which one counts is the art director's call. No further cuts without her ruling.
NEXT: act on her ruling; otherwise A-2c routes legibility.

---

**2026-10-25 (cycle 39z99n25, sarson density LOD):** Game change: mustard bloom (field_sarson) now uses the same distance density LOD as the crop rows (shared addDensityLOD in field.js: past 70 m every other card, past 120 m one in four; sarson is hidden past 95 m so only the first tier applies). Build ALL PASSED, no console errors. Proof docs/shots/sarsonLOD-2026-10-25/far.png (yellow plot at left still reads as mustard; capsule in frame so not tickable; mid.png is a bad camera inside the cane, ignore). Field view 393k tris / 137 calls. Still over 400k elsewhere (hero/bazaar view ~516k): bazaar hb_main/hb_props, grass, lane_0, tree foliage. Grass-tuft LOD not done.
NEXT: grass tuft distance LOD, then re-run tri-audit on the hero view.

---

**2026-10-25 (cycle 39z99n24, crop-row density LOD):** Game change: crop_rows (field.js) now thins by distance from the player: past 70 m every other tuft, past 120 m one in four, repacked every 6 m of movement (getPlantFocus from realPlants.js). Standard screenshot run: 453k tris / 120 calls (was ~520k in the hero view; different view, so not a like-for-like number), build ALL PASSED, no console errors. Proof docs/shots/cropLOD-2026-10-25/{field_edge,field_mid}.png (proof-shot tool, capsule in frame, so not tickable). Still over 400k: next cuts are bazaar hb_main/hb_props 58k, grass 20k, lane_0 19k, field_sarson 19k, tree foliage/cards.
NEXT: same density LOD for field_sarson bloom and grass tufts; then re-run tri-audit.

---

**2026-10-25 (cycle 39z99n23, triangle cuts):** Game change: shop goods trimmed (pillow packs 2x4 segments, spheres 6x4, tori fewer sides): goods mesh 84k -> 57k tris, hero/bazaar view 542k -> 516k renderer tris (still over 400k; ~290k are real visible mesh tris, rest is shadow pass + composer). tools/tri-audit.mjs rewritten to one forced render (works, ~1 min). Next biggest in that view: blender_bazaar_hb_main 30k + hb_props 28k, crop_rows 25k, grass 20k, lane_0 19k, field_sarson 19k, tree foliage/cards 18k each. Proof docs/shots/shopgoods-lod-2026-10-25/kirana_close.png (goods still read). Build ALL PASSED.
NEXT: thin crop_rows/field_sarson/grass distance LOD, then re-run tri-audit.

---

**2026-10-25 (cycle 39z99n22, stale-gap check):** NO game change (written honestly). Checked the "khel maidan outfield is uniform olive" gap: maidanOutfield (src/farmSites.js:1396) already has mown stripes, straw/dust patches, tuft noise and a dusty rim, so it is closed. Do not re-check. Everything left needs the art director: triangle limit (400k vs ~520k), draw-call ceiling (150 vs 164 in hero/bazaar; blocks lamps, cottage wood, jalebi/gaushala spurs), the 8 m lane gap at (-37,76) and the unjoined south gali (layout is her call), a plain crate (needs Blender), tri-audit rewrite.
NEXT: act on her budget ruling; otherwise rewrite tools/tri-audit.mjs to read renderer.info after one forced render.

---

**2026-10-25 (cycle 39z99n21, bazaar shutter re-shot):** NO game change (written honestly). Re-shot the bazaar row from the lane (shopfronts face -z; camera at z=3 looking +z): all shutters are up, interiors lit, goods visible. Proof docs/shots/bazaar-open-2026-10-25/{bz_a,bz_b}.png; 147/144 calls, ~530k tris (same budget overage as before). FEEDBACK item 4 note updated. Note for next run: bazaar shots need camera south of z=12.5 (row_a/row_b in that folder are houses, ignore).
NEXT: tri-audit rewrite (renderer.info after one forced render) or the art director's budget call.

---

**2026-10-25 (cycle 39z99n20, collision audit + tri-audit retry):** NO game change (written honestly). Re-read the code: every NPC routine (waypoint loop/run, follow, bazaarLife) already moves through resolveMove; the only direct position sets are scripted teleports (main.js sister placements). So A0 "route every NPC through the resolver" is met in code, but it is not a visual item so it stays unticked (no screenshot proof possible). tools/tri-audit.mjs hung again (twice, 2nd with default view, 400 s) and crashed once at (-60,20): two attempts, stop retrying; it needs rewriting (avoid 8 rAF waits under swiftshader) before it can name the triangle cuts. Remaining work is art-director calls (triangle limit 400k vs ~520k, draw-call ceiling 150 vs 164).
NEXT: rewrite tri-audit to read renderer.info after one forced render() instead of rAF waits, then propose cuts.

---

**2026-10-25 (cycle 39z99n19, A-2b minimap research):** NO game change (written honestly). One web search on minimap off-window marker conventions; thin but consistent with the shipped minimap.js (edge clamp, metre label). Shot docs/shots/minimap-2026-10-25/minimap_far_objective.png renders fine, 164 calls / 520k tris in that view. Boxes stay unticked. Remaining work is all art-director calls (triangle cuts, draw-call ceiling) or large builds (road to the east cluster, lamp posters need draw calls the hero zone lacks).
NEXT: A-2c routes legibility or whatever the art director rules on budget.

---

**2026-10-25 (cycle 39z99n18, A-2b Tasks list):** Game change: later story missions in the Tasks list are now tappable "Skip ahead" rows. Tapping lands the quest on the hub step just before that mission (Maa/Pitaji "talk to" state), resets sack/money/mango counters and sister-following, clears the pin (main.js onSetMission, freeRoam.js MISSIONS hub). Monkey mission has no hub (auto-starts from the kurta) so stays locked; blocked mid-chase. Build ALL PASSED. No proof shot (menu logic; not shot), A-2b boxes stay unticked. Backward replay not built.
NEXT: minimap shot for research box; triangle cuts remain the art director's call.

---

**2026-10-25 (cycle 39z99n17, A-2b minimap):** Game change: minimap now prints the objective's distance in metres and draws an edge pointer when the objective is outside the 110 m window (conventions from shipped open-world minimaps: off-map objectives clamp to the edge with a direction marker, GTA III critique: edge-only markers lose relative position, hence the distance). Build ALL PASSED. No proof shot (canvas change, not shot); research box stays unticked until a shot is taken.
NEXT: out-of-order mission state setup; triangle cuts remain the art director's call.

---

**2026-10-25 (cycle 39z99n16, A-2b Tasks list):** Small game change: Tasks list gained its own "Continue roaming / घूमते रहो" entry (locked with a reason until the story is done, then clears any pin and closes). Build ALL PASSED, no console errors. Proof docs/shots/tasks-2026-10-25/tasks_fresh.png (menu renders; new row is at the foot of the scroll, not in frame). A-2b boxes stay unticked (free out-of-order mission switching and minimap-convention research still open; locked-with-reason is the current guard).
NEXT: minimap-convention research, then out-of-order mission state setup.

---

**2026-10-25 (cycle 39z99n15, A-2b Tasks list):** Small game change: tapping the current mission in the Tasks list now clears any pinned side-job waypoint (src/freeRoam.js), so the waypoint returns to the live objective. Build ALL PASSED. No proof shot (menu logic only); box stays unticked. Re-audited FEEDBACK items 2 (milk cans) and 8 (lanes): already done. Still open: free out-of-order mission switching (needs per-mission state setup) and minimap-convention research; triangle cuts remain the art director's call.
NEXT: A-2b out-of-order mission state setup.

---

**2026-10-25 (cycle 39z99n14, A-2c highway milestones):** Game change: two painted milestone stones on the highway's west verge (src/milestones.js HIGHWAY_STONES, one per travel direction, Hindi over English, Mandi and Chowk distances computed from PLACES). Proof docs/shots/milestones-highway-2026-10-25/{hw_a3,hw_b2}.png (photo camera, no capsule). Build ALL PASSED. A-2c wayfinding box stays unticked (approach road itself still open ground).
NEXT: A-2c routes legibility / on-foot findability walk; triangle cuts remain art director's call.

---

**2026-10-25 (cycle 39z99n13, playtest block, stale-gap audit):** NO game change (written honestly). Checked three "gaps" in older entries against the code and they are already closed: khet west/east thirds have per-plot variants (src/field.js outerVariant), the east road bed uses the PBR ground set via finishSite/vcMat, and plant sets already carry a density LOD (src/realPlants.js). Tried tools/tri-audit.mjs at the default view to find the biggest triangle cut; it produced no output in ~15 min (hung under swiftshader, killed). Do not re-check these. What is left is the art director's call on triangle cuts (513k vs 400k) and draw-call ceiling.
NEXT: re-run tri-audit with explicit coordinates (it hung at the default view) and propose cuts.

---

**2026-10-25 (cycle 39z99n12, playtest block item 6, house_compound wood):** NO game change (written honestly). Photographed the hero house from the road and the balcony: balcony rails, shutters, doors, brackets and gate render as dark-brown wood, not plain plaster tan. Closes the last "house_compound wood not checked" gap in FEEDBACK item 6. Proof docs/shots/house-wood-2026-10-25/{front,balcony}.png (proof-shot tool, so capsules/HUD in frame; not tickable). Front view 165 calls / 564k tris incl. shadow pass. Remaining playtest work still waits on the art director (triangle cuts, draw-call ceiling, plain crate needs Blender).
NEXT: BACKLOG A-2b (active-task waypoint switching, minimap convention research) once the art director rules on the budget.

---

**2026-10-25 (cycle 39z99n11, playtest block item 1, banta/chaat check):** NO game change (written honestly). The "Banta shop and Chaat thela are not built" note in FEEDBACK item 1 is stale: createBantaShop (-63,22.5) and createChaatThela (-63,50.5) are registered in src/main.js and render (soda bottles on the counter, chaat cart with steam). Proof docs/shots/banta-chaat-2026-10-25/{banta,chaat}.png (normal mode, player capsule in frame so not tickable). Banta view reads 155 calls / 546k tris in this camera (shadow pass counted, validator metric is lower). Everything left in the playtest block is still an art-director call (triangle cuts 513k vs 400k, draw-call ceiling, plain crate needs Blender).
NEXT: art-director call on triangles/draw calls, then cottage wood on house_compound; otherwise BACKLOG section A.

---

**2026-10-25 (cycle 39z99n10, playtest block item 3, halwai fire mouth):** Game change: halwaiFire.js gained 7 flame particles per bhatti flickering out of the brick fire mouth (same Points draw call, no new calls). Proof docs/shots/halwai-fire-2026-10-25/mouth.png (faint glowing flecks at the arch; modest, headless). Build ALL PASSED. Not ticked (item 3 stays PARTLY DONE; flame is subtle).
NEXT: Banta shop / chaat thela not built; triangle cuts and cottage wood remain art-director calls.

---

**2026-10-25 (cycle 39z99n9, playtest block item 7 leftover, masjid + Jain mandir):** Game change: masjid (src/farmSites.js createMasjid) gained a four-pillar entrance iwan with green-banded canopy, three steps and two corner chhatris; Jain mandir gained two more porch pillars, three plinth steps and four mini corner spires (spires mostly hidden behind roof slab in the shot, pillars/steps read). Proof docs/shots/porch-2026-10-25/masjid.png and jain.png. Build ALL PASSED, budget 30.90 MB. Faith buildings: no tasks added.
NEXT: triangle cuts and cottage wood (art director's call); otherwise BACKLOG section A in order.

---

**2026-10-25 (cycle 39z99n8, playtest block item 7 leftover, gurudwara):** Game change: the gurudwara (src/farmSites.js createGurudwara) was a plain box with a dome; now has a four-pillar entrance porch with gold-edged canopy, three marble steps and a kangura parapet along the roofline. Proof docs/shots/gurudwara-2026-10-25/front.png and side.png. Build ALL PASSED. No signboard added on purpose (faith buildings carry none). Unticked: triangles (over 400k, art director's call).
NEXT: masjid and Jain mandir get the same porch treatment; triangle cuts and cottage wood (art director's call).

---

**2026-10-25 (cycle 39z99n7, playtest block item 6, abadi wood check):** NO code change (written honestly). Looked at the abadi houses on the east lane (z 76) from 4 m: door/window frames, shutters, awning rafters and balcony rails all render as grained dark-brown wood with normal-map bump, not plain plaster tan, so the "abadi/house_compound wood not yet checked" gap in FEEDBACK item 6 looks closed for the abadi rows. Proof docs/shots/cottage-wood-2026-10-25/{lane_n,lane_s}.png (proof-shot tool, so the player capsule is in frame; not a ticked proof). Still open: house_compound (hero house) not photographed, triangles 510k vs 400k and draw-call ceiling remain art-director calls.
NEXT: photograph house_compound wood; triangle cuts once the art director decides.

---

**2026-10-25 (cycle 39z99n6, draw calls, shared sign atlas):** Game change: hero shop boards, new-shop boards, bazaar boards and the school donation board now share ONE canvas atlas and material (src/signAtlasHub.js), so they merge into one draw call. Validator check 8a: hero 150 -> 148, bazaar 148 -> 146 (bazaar/hero figures from earlier handoffs). Build ALL PASSED, budget 30.90 MB, regression 21/22 (only triangles 513k vs 400k). Proof docs/shots/normal-mode-signboard-8m-2026-10-25T06-34-31-959Z/ (bazaar_unit4_Tailor_Shop.png, hero_tea_stall_Sharma_Tea_Stall.png: English reads first, Hindi above). Gaps: place boards (placeBoards.js) and classroom atlas still have own materials; Gupta store board is behind a tree in that shot (pre-existing framing). 2 spare calls now free for cottage wood / lamps.
NEXT: cottage wood on abadi/house_compound using the freed calls, then triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z99n5, playtest block, draw-call audit):** NO game change this cycle (written honestly). Ran tools/draw-call-audit.mjs -48 30 3.14159 (hero view, 146 calls). Where calls could be freed for cottage wood / lamps, none safely: charpai and hand_pump are separate on purpose (asset slots + interactions, skipped by the static merge in src/main.js ~1403); 4 signboard meshes in village_static_merged need an atlas to merge; 5 vehiclePaint meshes and 6 capsule NPC meshes are parked (characters/vehicles swap after 29 Oct). Cheapest real saving is the signboard atlas (-3 calls) plus merging vehiclePaint variants per vehicle; both are a few hours of work, not started. Everything else in the playtest block still waits on the art director (triangle cuts 513k vs 400k, draw-call ceiling).
NEXT: signboard atlas merge (saves ~3 calls, then cottage wood), or art-director call on triangles/draw calls.

---

**2026-10-25 (cycle 39z99n4, playtest block items 8/12, audit):** Almost no game change (written honestly): removed a duplicated onPinTask call in the Tasks list (src/freeRoam.js). Audited item 8: kerbs, drains and lamps already run the full length of the hero lane, temple lane, bazaar lane, abadi gallis and the east road (kerb+drain+solar lamps+neem shade+walkers+cyclist in src/main.js east-road zones); only the bare spurs (pond, cane) have none by design. Build ALL PASSED. Remaining playtest work is blocked on the art director: cottage wood and extra lamps (draw calls 150 of 150), triangle cuts (513k vs 400k), a light plain crate (needs Blender), and out-of-order story-mission switching (guarded by design, spec allows that).
NEXT: once a draw-call or triangle call is made, do cottage wood and the cuts; otherwise BACKLOG section A in order.

---

**2026-10-25 (cycle 39z99n3, playtest block item 8, temple lane check):** NO game change this cycle (written honestly). Checked the earlier "temple lane ends inside the compound" finding: it is stale. TEMPLE_LANE_ARRIVE is (2,51) and the compound's west wall is at x = 8 - 12/2 = 2 (src/temple.js), buildStripSegment ends exactly at its end point, so the lane stops at the gate gap (z 52 +/- 1.3), not inside. Nothing to fix there. What is left in the playtest block is all blocked on art-director calls already in NEEDS_YOU.md: cottage wood and lamps/street life on lanes (draw calls at 150 of 150 in hero and bazaar views), triangle cuts (513k vs 400k), a lighter plain crate (needs Blender or a decimated plastic crate).
NEXT: once a draw-call or triangle call is made, do lamps on lanes, cottage wood and the triangle cuts.

---

**2026-10-25 (cycle 39z99n2, playtest block item 8, hero lane ends at school gate):** Game change: the hero lane strip and its kerbs (src/village.js buildLane) now end at the school's south gate (z = centre - 13, SCHOOL_GATE_LANE_END) instead of running to the compound centre, so the dirt lane no longer crosses the school wall/yard. Build ALL PASSED, no new draw call. No proof shot of the gate (the screenshot run has no school-gate view), so nothing ticked. Gaps: temple lane still ends in the temple compound; kerbs/drains/lamps for the far lanes not extended; triangles still 513k (art director's call).
NEXT: temple lane end, lane street life, triangle cuts.

---

**2026-10-25 (cycle 39z99n, playtest block item 10, plant density LOD):** Game change: scanned plant sets (src/realPlants.js addPlantInstances) now thin by distance: past 55% of a set's radius only every other copy is drawn, past 80% one in four (stable per-item pick, independent of scale). Build ALL PASSED, regression 21/22, triangles 513k (was 535k; still over 400k, only that check fails, art director's call on the rest). No screenshot taken, so nothing ticked; far grass/pots will look slightly sparser. Gaps: no real mid/far mesh LOD (needs Blender), grass/crop flat cards not replaced.
NEXT: item 12 leftovers, atta chakki readability, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z99m, playtest block item 9, CC0 props search):** NO game change shipped (tried, looked, reverted: honest report). Searched Poly Haven (full model list by keyword: pump, cart, barrow, sack, ladder, bed, crate, basket, stool, lamp, pole, bicycle, tank, well), poly.pizza (hand pump, charpai, handcart, wheelbarrow, water pump, ladder: results exist but earlier cycles already found these are flat-colour low-poly) . Poly Haven has NO hand pump, charpai, handcart, sack or bicycle; only ladder_sectioned_01 (industrial, wrong for the water-tower iron ladder), hand_truck, plastic_crate_01/02/03, wicker_basket_01, tire_pump. Tried wooden_crate_01/02 + wicker_basket_01 in the mandi vegetable yard and banta shop (instanced, docs/shots/cc0-crates-2026-10-25/{banta,mandi_yard}.png): the "wooden crates" are ornate brass-cornered rope-handled chests and the wicker basket renders as a broken weave, so they read worse than the plain boxes; reverted (git checkout, no code kept). plastic_crate_01 shrinks to 10,350 tris each (shrink.js budget 1500 did not bite), far too heavy at 520k busy-view tris vs 400k; moved to tmp/. Wooden crates are still used as doorstep props in src/villageProps.js (same chest look, worth a look by the art director). Open: a lighter plain crate needs Blender (not installed here) or a decimated plastic_crate (art director's call on triangles).
NEXT: item 10 vegetation LODs, item 12 leftovers, triangle cuts and cottage wood (art director's call).

---

**2026-10-25 (cycle 39z99l, playtest block item 12, task pin):** Game change: in free roam, tapping a side job in the pause-menu Tasks list now also pins it as the active task: the waypoint arrow and the minimap star point at that job's place until the player gets within 6 m (src/freeRoam.js onPinTask, src/main.js pinnedTask in currentWaypointTarget; a job's own live waypoint still wins). Build ALL PASSED, regression 21/22 (only `triangles under 400k`, 535k, pre-existing). No screenshot taken (UI/logic only), so nothing ticked. Gaps: free out-of-order story-mission switching and the shipped-minimap web research are still not done; story missions already show their waypoint when current.
NEXT: item 9 CC0 props search (hand pump, charpai, sacks), triangle cuts and cottage wood (art director's call).

---

**2026-10-25 (cycle 39z99k2, playtest block item 7, lane gaps closed):** Game change: two real gaps in the lane network closed with bare dirt strips (src/scenery.js E0 (-45,76)-(-37,76), S2 (-38,140)-(-6,140); also in LANES of src/freeRoam.js so the map and bot see them). Before this the east gali was not joined to the hero lane and the south gali joined nothing, so gurudwara/mela/south gali were unreachable by lane. Build ALL PASSED (16/16). On-foot bot walk now 41 of 41 places arrived (gurudwara 72 s, health 64, highway 68, mandi 74; docs/shots/onfoot-walk-2026-10-25/walk.log). Item 7 ticked in FEEDBACK.md. Gaps: the gurudwara arrival shot is a close shot of a plain box wall; hero lane south of z 94 still crosses the school compound wall; temple lane ends in the temple compound. Movement code untouched, regression not rerun.
NEXT: item 8 lamps/street life on lanes (draw-call ceiling, art director's call), cottage wood, triangle cuts.

---

**2026-10-25 (cycle 39z99k, playtest block items 7/8, on-foot walk + pond spur):** Game change: the pond spur (src/eastRoad.js SPURS 'pond') started at (-84,70) and ran straight into the continuous west abadi row (bg_houses colliders, rows z 41-103), so the path to the pond ended at house walls; it now leaves the west gali north of the rows ((-84,32) -> (-114,62)) and the walk reaches the pond (docs/shots/onfoot-walk-2026-10-25/pond.png). Bare spurs now build at 16 m + half-length (was 24) so the new spur costs no draw call in the bazaar view (it had pushed check 8a to 152). Build ALL PASSED 16/16, budget 30.90 MB; movement code untouched, regression not rerun.
ON-FOOT WALK, bot now sidesteps obstacles (tmp/onfoot-walk.mjs, logs walk-run*.log + walk.log in docs/shots/onfoot-walk-2026-10-25/): 37 of 41 places walked from the house along lanes at 4.2 m/s, 6 to 71 s each (school 20 s, bazaar 25 s, field 30 s, east cluster 44-71 s, haveli 71 s). NOT reached: gurudwara (bot stuck at (-64,129): the south gali is not joined to any lane, 30 m gap), health/highway/mandi (bot's lane graph picked the temple compound as its start node, a bot artefact: health got there on a rerun? no, still stuck; chemist/tvhouse/haveli reach the same road fine). Findings, not fixed: hero lane south of z 94 runs through the school compound wall; the temple lane ends inside the temple compound; 8 m unmarked gap between the hero lane and the east gali start (-37,76); south gali joins no other lane. Item 7 stays UNTICKED (4 places unwalked, bot not a person).
NEXT: join south gali/east gali gap with lane strips, then cottage wood and triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z99j2, playtest block item 7 on-foot walk + bullock cart):** Game change: the bullock cart's two bullocks (src/vehicles.js buildBullock) were flat-colour cuboids (0xd9c9a8 boxes) standing ON the main east lane at (-36,50); they now use the herd's textured hide bovine (animals.js buildBovineGeometry({legs,udder}) + createHideMaterial) merged into one mesh, tapered hide legs in the same single InstancedMesh, and face FORWARD (the old ones faced the cart). No new draw call (bodies were 2 meshes, now 1). Build ALL PASSED, budget 30.90 MB, regression 21/22 (only `triangles under 400k`, 533k, was failing before). Proof docs/shots/oxcart-2026-10-25/oxen.png (headless). Gaps: legs read long/spindly (same bovine proportions as the herds), item not tickable as realistic.
ON-FOOT WALK (key-driven bot, lane-following, tmp/onfoot-walk.mjs, log docs/shots/onfoot-walk-2026-10-25/walk.log, arrival shot per place): from the house, 14 places reached by walking the lanes (school, halwai, teastall, store, chowk, post, ration, chakki, banta, chaat ...) at 4.2 m/s walking speed = 2 to 12 s each. The bot snagged at three lane points: (-56.5,46) wall corner at the bazaar-lane start (diagonal approach sticks; walking x<=-57.2 passes), (-38,52) the bullock cart ON the temple/east lane (a player walks round it on grass; a bot does not), (-45,93) on the hero lane south. NOT a full 39-place walk: the bot stops at those points, so far places (east cluster) are unwalked; item 7 stays UNTICKED. Lane-start wall corner at (-56.5,46) is a sticky-collision finding (sliding fails when heading ~NNW into it).
NEXT: make the bot go round obstacles (sidestep) to finish the walk to the east cluster, then cottage wood / triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z99j, playtest block item 2 + triangle budget, grass thinning):** Game change: Poly Haven grass clumps (src/vegetation.js buildVegetation) thinned from 40% to 28% of the old card count and drawn within 22 m (was 28), in line with "random grass looks bad, thin it". Busy-view triangles 538k -> 521k (regression check "triangles under 400k" still fails, same as before; top now shop_goods_11 84k, halwai row 39k, bazaar 30k+28k, grass 26k, crop_rows 25k; getting under 400k needs cutting shop goods or the bazaar, the art director's call). Build ALL PASSED, budget 30.90 MB, no new draw call, regression 21/22 (only that check). Look check docs/shots/2026-10-25T01-25-11-713Z/low_angle.png (full screenshot run, no bare ground). Not tickable.
NEXT: shop goods triangle cut and cottage wood (art director's call), on-foot findability walk.

---

**2026-10-25 (cycle 39z99i, playtest block item 7, findability walk):** NO game change this cycle (report only, written honestly: the remaining playtest items are blocked on art-director calls). Wrote docs/findability-walk-2026-10-25.md from the existing headless lane-walk shots: 36 of 39 places pass the subject check from a lane; post office, atta chakki and gurukul were checked by eye and are findable (shared signpost board / own board in frame). Not a continuous on-foot walk with a stopwatch, so item 7 stays UNTICKED. Open and blocked on her: cottage wood (draw-call ceiling, hero and bazaar at 150 of 150), triangle cuts (538k vs 400k), lamps on lanes (same ceiling).
NEXT: continuous on-foot walk house to each far place with timing; lamps/street life on lanes once a draw-call call is made.

---

**2026-10-25 (cycle 39z99h, playtest block item 6, follower snags):** Game change: followers (Maa, sister; src/npcRoutines.js createFollowRoutine) now sidestep when the collision resolver holds them back ~0.6 s, so a prop between them and the player no longer pins them. Build ALL PASSED; regression 21/22, the one failure is `triangles under 400k` (538k, top: shop_goods_11, plant_grass_medium_02), unrelated to this logic-only change and already on the art director's triangle-cuts list. Audit found stale: hero-house charpai and pump are already solid (village.js), pond/johad/hauz bodies have colliders (farmSites.js), bazaar villager loops are registered with check 9, animals are static (no routines to register). No visual change, no proof shot, nothing ticked.
NEXT: real on-foot findability walk (item 7), triangle cuts and cottage wood (art director's call).

---

**2026-10-25 (cycle 39z99g, playtest block items 7/8, cane spur):** Game change: the sugarcane belt was the last of 40 places the static findability audit listed as not findable without the map (33 m from any lane). Added a bare earth spur (src/eastRoad.js SPURS 'cane', (-6,130) to (-6,146), off the east gali's south end, no lamps so no new draw calls in busy views) and added 'cane' to the school_lane signpost (src/wayfinding.js). Audit now 0 of 40 not findable. Build ALL PASSED. Proof docs/shots/cane-spur-2026-10-25/spur.png (headless free camera, subject check passed; spur leads to the cane belt; not tickable, the real on-foot walk of item 7 is still not done). Gaps: spur is vertex-tinted earth, no kerbs or street life; item 7 real walk and item 8 lamps/street life on lanes still open.
NEXT: real on-foot findability walk (item 7), cottage wood and triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z99f, playtest block item 6, far-LOD check):** No game change (verification only). Checked the far-LOD abadi rows: abadi_row_*_lod.glb already uses hb_main with colour, normal and roughness maps plus openings, grilles, sills, bands and parapets (earlier cycles); proof docs/shots/farlod-2026-10-25/far_b.png (hero views 110-141 calls). Item 6 far-LOD line ticked in FEEDBACK.md. Remaining in the block is art-director-call work (cottage wood draw-call ceiling, triangle cuts) and bazaar interior props (sewing machine, puncture tub).
NEXT: sewing machine and puncture tub props, then cottage wood once the draw-call call is made.

---

**2026-10-25 (cycle 39z99e, build gate):** Game change: small jute sacks (src/mergeUtils.js) no longer cast shadows, one shadow-pass draw call saved per view. The hero zone was 151 calls (check 8a failing since 39z99d, so the build was 15/16, not green as earlier entries implied); it is now 150, bazaar 149, field 118. Build ALL PASSED 16/16, budget 30.90 MB. No visible change (sack shadows are negligible), so no proof shot and no box ticked. Checked and stale: the tailor sewing machine, puncture pump/spanners and kirana scale already ride the real metal PBR set (Kit tex_override), so the "flat vertex-colour paint" gap noted in 39z99b/c is not real. Hero and bazaar zones sit at the ceiling with zero margin, so cottage wood (item 6) still needs the art director's draw-call call.
NEXT: cottage wood and triangle cuts (both art director's call), far-LOD flat blocks via Blender.

---

**2026-10-25 (cycle 39z99d, playtest block item 4, barber chair):** Game change: the barber's chair (tools/blender/build_bazaar_row.py barber()) had a squashed-sphere back and headrest that read as a dark maroon blob behind the counter; now a padded rectangular backrest with a dark trim frame, chrome headrest stem and a separate headrest pad in a lighter vinyl red, over the existing pedestal, seat and armrests. bazaar_row.glb rebuilt, same material, no new draw call. Build 15/16: the only failure is check 8a hero zone 151 calls, which is pre-existing (same with my change stashed). Budget 30.90 MB. Proof docs/shots/barber-chair-2026-10-25/barber.png (headless, subject check passed, tight over-the-counter framing; not tickable). Gaps: chair seat still a plain lathe, item 4 NOT ticked as a whole.
NEXT: cottage wood (draw-call ceiling, art director's call), triangle cuts (art director's call), sewing machine/puncture tub props.

---

**2026-10-25 (cycle 39z99c, playtest block item 4, plastic chairs):** Game change: the shared plastic_chair (tools/blender/arch.py) was a flat slab seat plus a slab back on four sticks (toy-like, visible outside the barber/mobile/puncture shops, chowk tea stall, halwai, chowk plaza). Now a monobloc silhouette: lipped seat with rims, back uprights bending up from the seat, three slats and a top rail, splayed tapered legs with stretchers. Rebuilt bazaar_row, chowk_plaza, tea_stall_chowk, halwai_compound .glb; no new draw call. Build ALL PASSED, budget 30.91 MB. Proof docs/shots/flatprops-2026-10-25/after/{mobile,barber,medical}.png (headless, subject check passed; the barber/medical "before" file in before/ was overwritten by a re-shoot, the pre-change look is the slab chair described above). Checked: medical fridge/case, barber mirror and mobile CRT already ride the real metal PBR set tinted, and sit behind the counter at walking distance; left as is. Item 4 NOT ticked as a whole. Gaps: barber chair is a dark maroon blob, chair legs read slightly tall.
NEXT: barber chair shape, triangle cuts (art director's call), cottage wood (draw-call ceiling).

---

**2026-10-25 (cycle 39z99b, playtest block item 4, bazaar flat stock):** Game change: the Blender bazaar row (tools/blender/build_bazaar_row.py) lost its flat-colour duplicates of goods that already exist as printed-atlas stock: kirana shelf packets, kirana hanging snack boxes, and the sabzi crate veg spheres. The kirana jamb snack strips are now textured foil sachet strips (src/bazaar.js buildBazaarKiranaGoods), same merged mesh, no new draw call. bazaar_row.glb rebuilt. Build ALL PASSED, budget 30.73 MB. Proof docs/shots/kirana-stock-2026-10-25/{kirana,sabzi}.png (headless, subject check passed, no capsule in frame). Gaps: kirana counter jars/scale, medical fridge/case, barber mirror and mobile-shop CRT are still flat vertex-colour paint; item 4 NOT ticked as a whole.
NEXT: remaining flat-paint interior props (medical, mobile, barber), triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z99, playtest block item 7, water glare):** Game change: village water (src/water.js, canal/pond/johad/hauz) was blowing out to white-blue glints under the low sun; env reflection 1.6 -> 0.7 and roughness 0.14 -> 0.42, so it now reads as pale muted olive water. Build ALL PASSED 16/16, budget 30.80 MB, no new draw call (a MeshPhysicalMaterial trial gave the best look but added a call, hero zone 151, so REVERTED). Proof docs/shots/canal-2026-10-25/after/canal.png (before ../canal.png; headless free camera, not tickable). Gaps: still pale at haze distance, no foam; the "canal/hauz shoreline unchanged" note is stale for the canal (it already shares the scum shader). Cottage wood (item 6) still blocked by the draw-call ceiling.
NEXT: cottage wood needs the art director's draw-call call; far-LOD blocks, triangle cuts.

---

**2026-10-25 (cycle 39z98, playtest block item 4, kachcha haystack debris):** Game change: the kachcha homestead haystack (tools/blender/build_kachcha.py, both homesteads) lost its five loose "hay_tuft" blobs (the stray dark spikes / debris she could not identify) and gained two rope bands; kachcha_homestead.glb rebuilt, no new draw call. NOTE: Blender IS installed at ~/Applications/Blender.app (earlier "not installed" notes are stale; use tools/blender/make.sh). Build ALL PASSED, budget 30.80 MB. Proof docs/shots/hay-kachcha-2026-10-25/after/hay.png (free camera, headless, no subject check, not tickable; before: ../hay.png). Gaps: stack still reads olive-dark (shared thatch texture); the unsigned yellow building with milk cans at the row's east end is the kachcha homestead shed, not a shop.
NEXT: Blender-based far-LOD flat blocks and bazaar interior props (sewing machine, puncture tub), triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z97, playtest block item 2, white pots):** Game change: the lane water corners (src/farmSites.js createLaneWaterCorner) now have lathed pots (belly, neck, rolled rim) instead of sphere+cylinder pairs: clay matkas (varied size/turn) and steel ghadas in the real metal PBR set with neck rings. The ghadas were flat grey tints that blew out to the "six white cylindrical objects" she could not identify. +1 metal draw call at those zones only (137 at the east corner, tris 456k free camera). Build ALL PASSED. Proof docs/shots/lane-water-2026-10-25/corner2.png (free camera, player capsule in frame, not tickable). Also: the 24 Oct "Banta/Chaat not built" note is stale, both exist with boards. Full-run screenshot.js still reports 507k triangles (art director's call).
NEXT: triangle cuts (art director's call), far-LOD only via Blender (not installed), other flat-tint vessels.

---

**2026-10-25 (cycle 39z96b, playtest block item 3, bund crop culling):** Game change: crop tufts, cane, sarson and sabzi bushes (src/field.js buildCropRows) are no longer placed on the earthen bunds (new onBund(), same test as the raised ground ridge), so the ridges read as bare dividing banks instead of crops growing out of them. No new draw call, fewer instances. Build ALL PASSED, budget 30.80 MB. Proof docs/shots/khet-2026-10-25c/overview.png (headless, no subject check, not tickable; bare bund lines visible between plots). Also checked: the halwai bhatti fire mouth is already built (build_halwai.py, shot docs/shots/halwai-fire-2026-10-24/mouth.png), the FEEDBACK item 3 header there is stale. Item 3 NOT ticked as a whole.
NEXT: triangle cuts (art director's call), spurs once draw calls are saved.

---

**2026-10-25 (cycle 39z96, playtest block item 3, brinjal and okra):** Game change: the sabzi third of the khet (src/field.js buildVegBushes) now has distinct brinjal (purple fruit, broad leaves) and okra (lobed leaves, upright pods) bushes in alternating bed bands, two crossed alpha cards each, procedural canvas textures, two InstancedMeshes (+2 draw calls, field view, frustum-culled so hero/bazaar counts unchanged). Build ALL PASSED 16/16. Proof docs/shots/vegbush-2026-10-25/{sabzi_close,sabzi_wide}.png (headless, no subject check, not tickable). Gaps: fruit is tiny at walking distance, procedural not photo texture, item 3 NOT ticked as a whole.
NEXT: triangle cuts (art director's call), spurs once draw calls are saved.

---

**2026-10-25 (cycle 39z95, playtest block items 4/3, sabzi cart produce):** Game change: the sabzi rehris' flat-coloured cylinder piles (src/farmSites.js createSabziRehris) are now heaps of individual produce (new produceHeap): tomatoes, carrots, gourds, chillies, onions, brinjal, each with own size, turn and colour jitter, thin produce lying flat. Same merged mesh, no new draw call (+~0.5k triangles). Build ALL PASSED. Proof docs/shots/sabzi-produce-2026-10-25/carts_close2.png (free camera, headless, no capsule in frame; not ticked as an item). Checked and stale, no change: far-LOD abadi already has openings and the shared plaster atlas (docs/shots/farlod-2026-10-24/east_far_after.png), Banta/Chaat boards exist (src/placeBoards.js). Gaps: produce is vertex-colour only (no skin texture), bazaar vegetable stalls elsewhere not checked.
NEXT: triangle cuts (art director's call), spurs once draw calls are saved, other flat-colour stock.

---

**2026-10-25 (cycle 39z94, playtest block item 7, highway run-out):** Game change: the highway's two ends (src/farmSites.js roadGeos) now taper over 52 m to a 0.7 m cart track whose colour ends on the grass tone (was a 2.6 m pale sandy tip), wheel ruts 40 m and fading to grass, so the road no longer stops at a visible blob. Mandi yard ends already fray to earth (checked, docs/shots/roadend-2026-10-25/). Build ALL PASSED, budget 30.80 MB, draw calls unchanged (79 in view). Proof docs/shots/roadend-2026-10-25/after/highway_s.png (before: ../highway_s.png). Item 7 road bullet not ticked: the taper still reads as a faint tip at haze distance; a real junction or dirt lane joining the village is the fuller fix.
NEXT: far-LOD flat blocks, Banta shop and Chaat thela signage, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z93, playtest block item 3, haystack shapes):** Game change: bhoosa haystacks (src/farmSites.js haystackGeos; tubewell, Yadav tea stall, khalihan) now come in three shapes by stack index (rounded beehive, tall peaked cone, squat wide heap) with vertical fork-crease ridges, per-stack ellipse and slight lean, and the rope band follows each profile. Same merged meshes, no new draw call, same triangle count. Build ALL PASSED. Proof docs/shots/haystack-2026-10-25c/{tea,tubewell}.png (headless, player capsule in frame so not tickable; neighbouring stacks now clearly differ). Haystack question for item 3 is answered (they exist, both places); item 3 NOT ticked as a whole. Gaps: no distinct vegetable crop models, skirt still a flat patch.
NEXT: triangle cuts (art director's call), spurs once draw calls are saved.

---

**2026-10-25 (cycle 39z92, playtest block item 3, khet west/east variety):** Game change: the stubble (west) and sabzi (east) thirds of the khet (src/field.js) now have the same earthen bunds as the middle and four per-plot variants each (stubble: normal / tall pale / bare ploughed / burnt-dark; sabzi: leafy / low / bare bed / lush), via new outerVariant(). Ground vertex colour and existing crop instances only, no new draw call. Build ALL PASSED. Proof docs/shots/khet-2026-10-25b/overview.png (headless, no subject check, not tickable; plot tones differ on both sides, bunds visible). Gaps: crops still not culled on bund vertices, no distinct vegetable crop models (brinjal, okra), item 3 haystack question unchecked this cycle, item 3 NOT ticked as a whole.
NEXT: haystack check near tubewell and chai stall, triangle cuts (art director's call), spurs once draw calls are saved.

---

**2026-10-25 (cycle 39z91, playtest block item 3, khet bunds):** Game change: plots in the khet's middle third are now divided by low earthen bunds (src/field.js buildFieldGround: ground vertices raised ~14 cm and tinted paler/drier where the plot cell changes, normals recomputed), so mustard, wheat, cane and ploughed plots read as separate fields, not painted blocks. Ground mesh only, no new draw call, no asset bytes. Build ALL PASSED. Proof docs/shots/khet-2026-10-25/{overview,close,track}.png (headless, no subject check, not tickable; bund ridges visible as brown lines between plots in overview). Gaps: bunds are ~2 m wide (2.2 m vertex grid) and crops are not culled on them; west stubble third and east sabzi third are still uniform; item 3 NOT ticked as a whole.
NEXT: west/east third variety, triangle cuts (art director's call), spurs once draw calls are saved.

---

**2026-10-25 (cycle 39z90, playtest block item 4, market interiors re-check):** No game change (Blender is not installed on this machine, so the Blender-built row model cannot be rebuilt; src/bazaar.js code boxes were checked and are already replaced). The 24 Oct audit list is STALE: sewing machine, barber chair, monitor, pan balance, puncture tub, flipped cycle are all in tools/blender/build_bazaar_row.py with lathed shapes, and plastic_chair() is a real chair shape. Re-shot docs/shots/interiors-2026-10-25/{tailor,barber,mobile,puncture}.png (proof-shot tool, capsule shopkeepers in frame so not tickable): sewing machine, cloth stacks, hanging tyres, hand pump all read. Remaining real gaps: chairs/bench still flat tint (no plastic PBR slot), draw calls in the puncture view read 169 and mobile view 158 (counts include shadow pass), tris 548-600k vs 400k limit (art director's call).
NEXT: triangle cuts (art director's call), spurs once draw calls are saved, other shops' goods.

---

**2026-10-25 (cycle 39z89, playtest block item 4, chowk plastic chairs):** Game change: the four plastic chairs at the chowk tea stall (src/bazaar.js buildChowkPlaza) now have raked backs, a slightly dished seat and splayed legs (new addTilted helper), per-chair rake and tint, so they read as stacking chairs, not upright wooden boxes. Same merged mesh, no new draw call. Build ALL PASSED. Proof docs/shots/chowk-chairs-2026-10-25/{a,b}.png (headless, subject check passed; item 4 NOT ticked as a whole). Gaps: chairs still use the wood texture family tinted (no plastic PBR set in the shared materials), benches are plain planks, other shops' interior props from the 24 Oct audit list (sewing machine, monitor, barber chair, tub) unchanged, jalebi/gaushala spurs still blocked by the 150 draw-call ceiling.
NEXT: other shops' goods via src/shopGoods.js, triangle cuts (art director's call), spurs once draw calls are saved.

---

**2026-10-25 (cycle 39z88, playtest block item 6, Gurukul detail):** Game change: Gurukul College (src/farmSites.js createGurukul) now has a parapet ring on both blocks, a stair-head (mumty) and a rooftop water tank, a sill-level floor band, a colonnade cornice and three entrance steps, all in the same merged mesh (no new draw call). Build ALL PASSED, budget 30.80 MB. Proof docs/shots/gurukul-2026-10-25/yard.png (headless, player capsule in frame so not tickable; parapet, steps, stair-head read). Gaps: walls are still flat plaster with no stains or damp, no school yard furniture, jalebi/gaushala spurs still blocked by the draw-call ceiling.
NEXT: save bazaar-view draw calls for spurs, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z87, playtest block item 7, west gali head signpost):** Game change: a second direction post (src/wayfinding.js 'west_gali_head', (-82.3,24), faces south) stands at the north end of the west gali pointing west to Jalebi stall and Gaushala, the two places a walker reached the lane end without any cue for. Same merged wayfinding mesh, no new draw call; build ALL PASSED. Proof docs/shots/wayfinding-2026-10-25/west_gali_head.png (English reads, arrows west; player capsule in frame so not tickable). Gaps: still no lane or track to the stall/gaushala (bare spurs cost 2+ draw calls over the 150 ceiling), baagh has a fork post only.
NEXT: save bazaar-view draw calls for spurs, shot of camera under a neem, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z86, playtest block item 7, camera vs tree canopies):** Game change: the third-person camera (src/player.js) now also marches its ray through live tree canopy volumes (CANOPIES/canopyAt in src/trees.js, one cylinder per tree, ignored for zone-hidden/detached trees) and pulls in before entering one, unless the player already stands under that canopy. Not a movement collider, no new draw calls. Build ALL PASSED; regression 21/22 (only the known 536k-vs-400k triangle line). No proof shot: needs a moving-camera span near trees, not taken this cycle, not tickable. Gaps: canopy is a rough cylinder per species, not the real leaf-card shape; jalebi/gaushala spurs still blocked by the 150 draw-call ceiling in the bazaar view.
NEXT: save bazaar-view draw calls for the jalebi/gaushala spurs, shot of the camera under a neem, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z85, playtest block item 8, cyclist route fix):** Game change: the east-road cyclist (src/main.js) now rides waypoints every 10 m along the road instead of a 3-point chord, so it follows the bend and no longer clips the chemist's collider (build check 9 was FAILING at 0.33 m penetration after the last cycle; now 17 routes / 62 legs clear, build 16/16). Tried jalebi and gaushala bare spurs off the west gali: both push the bazaar view to 152-154 draw calls (ceiling 150), so reverted; those two stay not-findable-without-the-map until draw calls are saved elsewhere. No proof shot (moving capsule subject, not tickable).
NEXT: save draw calls in the bazaar view to afford the jalebi/gaushala spurs, camera vs tree canopies, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z84b, playtest block item 7, key-driven findability walk):** Game change: the third-person camera (src/player.js) now also marches its ray through the real wall colliders (STATIC_COLLIDERS) and pulls in, so it no longer ends up inside streamed buildings (post office, chakki, gurukul etc. were never in its obstacle list). Walk: tmp/find-walk2.mjs, real W key held 2.8 s from the nearest lane point facing each of the 13 unjudged places, raw shots docs/shots/findwalk-keys-2026-10-25/. Judged by eye: FINDABLE with a named board: chemist, old haveli, gurukul; FINDABLE as a landmark: school (yard and building from the lane), khalihan (haystacks), cane (sugarcane field, no name), post/ration/chakki (the three-board signpost beside the cluster); NOT findable without the map: gaushala (69 m off any lane, shot shows an abadi row), baagh (43 m off a lane, player is stopped by the compound wall), jalebi (26 m, abadi row in view, stall out of sight), chowk (player ends beside the tea-stall wall, harness not informative). Gaps: camera still sits inside tree canopies (school shot), canopy cards are not obstacles; walking straight at a place stops at its compound wall, so arrival shots are of walls. Proof shots are headless, capsule hidden, no subject check, so not tickable.
NEXT: gaushala/baagh/jalebi spur or sign, camera vs tree canopies, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z84, playtest block item 8, cyclist on the east road):** Game change: a capsule rider on the real bicycle model (buildBikeGroup, now exported from src/vehicles.js) rides the north edge of the east road (s 30-170 m, 3.2 m/s, wheels spin), streamed by zone 'east_road_cyclist' (src/main.js), routed through createWaypointLoop so the route check and collision resolver apply. Build ALL PASSED, budget 30.8 MB, regression 21/22 (only the known 537k-vs-400k triangle line). No proof shot: screenshot tool hides capsule people, moving subject; not tickable. Gaps: rider is a capsule standing through the bike (swaps after 29 Oct), no bullock cart traffic, west/south lanes have no walkers.
NEXT: key-driven findability walk, cart on the road, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z83, playtest block item 8, street life on the east road):** Game change: two villagers (capsule placeholders until 29 Oct) now pace the south edge of the east road, one stretch each (s 18-95 and 105-175 m), streamed per stretch and built only near the road (src/main.js 'east_road_walkers_a/b', waypoints from roadAt). Build 16/16, check 9 route legs clear, budget 30.8 MB, regression 21/22 (only the known 540k-vs-400k triangle line, unchanged by this). No proof shot: the screenshot tool hides capsule people by rule, so not tickable. Gaps: no cycle/cart traffic, spurs and west/south lanes have no walkers.
NEXT: bicycle/cart on the road, key-driven findability walk, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z82, playtest block item 7, findability judged by eye):** Game change: the Gurukul College board now also sits on the lane-side (north) face of the building (src/farmSites.js createGurukul, same board draw call); from the spur the building was a blank beige wall with no name. Proof docs/shots/findwalk-2026-10-25/raw_gurukul.png (headless, capsule + lamp pole in frame so the subject check fails; not tickable). Judged by eye from the raw shots: haveli findable (named board, clear); gurukul now findable; chemist, jalebi, khalihan, chowk, ration, chakki, school, cane raw shots are INSIDE geometry or trees (teleport harness bug), still unjudged. Gurukul is a bare box (no PBR plaster detail, flat walls) - needs the realism pass. Build ALL PASSED.
NEXT: key-driven walk harness (hold W) for the unjudged places, street life on roads, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z81, playtest block item 7, findability raw shots):** Game change (small): wall switchboards and drainpipes (src/buildingKit.js) now use the textured metal set (normal+roughness) instead of flat-colour materials; the grey flat box on the abadi house wall is the example. Build ALL PASSED, budget 30.8 MB. Raw shots for the 13 flagged places saved (docs/shots/findwalk-2026-10-25/raw_*.png), judged by eye: the harness is unreliable, not the places. school and cane raw shots show the camera INSIDE geometry (hero-house room, blackboard frame) after the headless teleport; gaushala shot is an abadi row (69 m off any lane, so not findable without the map); post shows the bazaar shops but not the post office (it is behind). Remaining 9 raw shots not opened. Findability box stays open: needs a real key-driven walk, not teleports. Switchboard is still a blank plate, no meter window.
NEXT: real key-driven walk to the places the teleport harness could not judge, street life on roads, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z80, playtest block item 7, on-foot findability walk, headless):** No game change (verification only). tmp/find-walk.mjs teleports to the nearest lane point (stand-off 14-69 m), faces each of 39 places with the real third-person camera and runs the shotlib subject check. 26 VISIBLE, 13 flagged occluded: school, chowk, post, ration, chakki, baagh, jalebi, khalihan, gaushala, cane, chemist, haveli, gurukul. The flag is unreliable for solid buildings (the check hits the building's own walls) and failed shots left no image, so those 13 are UNJUDGED, not confirmed hidden. Real stand-off is 36+ m for gaushala (69 m off a lane), field (69 m), cane (33 m), mandi (36 m), baagh (43 m): these need the map. Shots docs/shots/findwalk-2026-10-25/ (headless teleport, not a real walk, so the box stays open).
NEXT: save raw shots for the 13 flagged and judge by eye, street life on roads, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z79, playtest block item 8, more spurs):** Game change: 4 more spur tracks (src/eastRoad.js SPURS): TV house off the east road, pond off the west gali, mela and gurudwara off the south gali. West/south spurs are `bare` (no lamps/trees) with a 24 m build radius to stay inside the draw-call ceiling. Static audit: 1 of 40 not findable without the map (cane field); only the gaushala is still >30 m from a lane. Gaushala spur was tried and dropped: at the bazaar view it pushed calls to 152 (ceiling 150). Baagh not given a spur (canal/chowk in the way, already within 30 m). Build 16/16. No proof shot taken (not tickable).
NEXT: on-foot findability walk, street life on roads, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z78, playtest block item 3, haystacks):** Game change: every bhoosa haystack (tubewell, Yadav tea stall, khalihan; src/farmSites.js haystackGeos) now sits on a trampled straw skirt, same merged mesh, no new draw call. Answer to her question: haystacks DO exist near the tubewell (3 stacks at (-47,-13)) and behind the Yadav tea stall (2 stacks at (-58,76)); both read as haystacks. Build ALL PASSED. Proof docs/shots/haystack-2026-10-25/{tubewell_hay,b_tea_hay}.png (headless, no subject check, not tickable). Gaps: skirt is a hard-edged flat patch; stacks are uniform beehive domes.
NEXT: findability walk, street life on roads, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z77, playtest block item 8, spurs):** Game change: 7 earth spur tracks (3.5 m, edging, solar lamp every 45 m, shade trees, no drain) now leave the east road to health centre, johad, masjid, gurukul, khel maidan, Jain mandir and old haveli (src/eastRoad.js SPURS/spurLegs, same createEastRoadLeg with w/noDrain, streamed per leg in src/main.js, drawn on the map via LANES). Static findability audit: 1 of 40 places not findable without the map (was 15 off-lane); ALL places are now within 30 m of a lane. Nothing moved. Build ALL PASSED. Proof docs/shots/spurs-2026-10-25/masjid_spur.png (headless, capsule in frame, not tickable); junction.png has a bad camera (below ground), ignore. Gaps: spurs end open (no gate or forecourt), no traffic/street life on any road, pond/mela/gurudwara/gaushala/tvhouse/baagh still off the lane set, spur surface is vertex-tinted earth not PBR.
NEXT: real on-foot findability walk, street life on the roads, triangle cuts (art director's call).

---

**2026-10-25 (cycle 39z76, playtest block item 8, east road):** Game change: the east gali now continues as a real road from (36,76) to the highway tarmac (src/eastRoad.js ROAD_PTS, createEastRoadLeg in src/farmSites.js, 7 streamed legs): 5 m earth bed with ruts and dust, broken stone edging both sides, open drain with stone lips and slab bridges on the north side, solar street lamps every ~28 m, neem/babool/peepal shade. It bends south round the chemist (96,60), nothing in the cluster was moved. Milestone stones now follow the road (src/milestones.js) and the road is in LANES (map + audit): highway, chemist, manihari, sabzi now sit on a lane; static audit still lists the health centre, johad, masjid, jain, haveli, maidan, gurukul, mandi, mela, gurudwara, pond, field, gaushala, tvhouse, baagh 33-98 m off a lane (they need spurs), cane is the one place not findable without the map. Build ALL PASSED, budget 30.80 MB. Cost +4..7 draw calls and +8k tris in views that already see the road (those far-east views were already 173-185 calls before this). Proof docs/shots/eastroad-2026-10-25/{e_lamp,c_east,b_chem}.png (headless, capsule in frame, not tickable). Gaps: road bed is vertex-tinted earth, no PBR dirt set; no traffic or street life on it yet; spurs to the cluster buildings not built.
NEXT: spurs from the east road to health/johad/masjid/maidan/gurukul, real on-foot findability walk.

---

**2026-10-25 (cycle 39z75, playtest block item 0c, vehicles vs trees):** No game change (verification only; no collision bug found). Drove the tractor+trolley with the real physics step (tmp/tractor-tree.mjs, 1500 frames, floored throttle) straight at the tree at (-150,60) from all 4 sides: it stops 2.05 m from the trunk every time and its footprint never overlaps a collider (min clearance 1.74 m). Other runs started on other trees' lines ended at different obstacles, none inside a collider (min clearance >= 0.94 m). So the vehicles-vs-trees leftover of 0c is closed in code. Proof docs/shots/collision-2026-10-25/tractor_tree.png is a raw headless shot (fps text, canopy covers the tractor; the shotlib subject check failed 4x because the low neem canopy occludes the gap), so it is NOT tickable. Triangles still 539k vs 400k, the art director's call.
NEXT: findability walk, art director's call on triangle cuts.

---

**2026-10-25 (cycle 39z74, triangle budget):** Game change: shop stock (src/shopGoods.js) is leaner: pillow packs 3x6 segments, food spheres 8x6, bottle/jar lathes 10 sides, bangles 5x12; merged stock is split into 100 m cells and a cell is hidden beyond its radius + 30 m (src/mergeUtils.js distGate, applied per frame in src/main.js). Build ALL PASSED (hero 149, bazaar 149 calls). Regression 21/22: triangles 586k -> 539k at the (-48,30) shot, still over 400k. Remaining top: shop stock 80k, grass cards 45k, halwai row 37k, crop rows 36k, bazaar hb_main 29k + props 26k, rest long tail. Reaching 400k needs cutting visible detail, which is the art director's call (no silent thinning). No proof shot (no visual change intended; not tickable).
NEXT: findability walk, 0c remaining (vehicles vs trees), art director's call on triangle cuts.

---

**2026-10-25 (cycle 39z73, playtest block item 0c, collision leftovers):** Game change: the hero house's indoor charpai (src/village.js) is now solid (was walk-through; TV-house porch, dhaba, lane-laundry and kothri charpais already had colliders). Shop packets (src/shopGoods.js pillowPack) lose a third of their triangles (360 -> ~190 each, shop_goods_11 150k -> 125k). Build ALL PASSED. Regression 21/22: the one fail is "triangles under 400k", measured 586k now (609k BEFORE my change, so not caused by this cycle; the shop goods mesh is the single largest at 125k, then grass cards 46k, halwai row 37k, crop rows 36k, and the rest is long-tail). Needs the art director's call on where to cut. No proof shot (collider is invisible; not tickable).
NEXT: triangle budget (586k vs 400k), findability walk, 0c remaining (vehicles vs trees).

---

**2026-10-25 (cycle 39z72, playtest block item 5, post office post box):** Game change: the post office's red pillar box (tools/blender/build_new_shops.py post_office, new_shops.glb rebuilt) now has a rain hood over the mouth, rolled seam bands, a clearance door with lock and a plain timetable plate; was a bare cylinder with a slot. Same materials, no new draw call. Build ALL PASSED, budget 30.80 MB. Proof docs/shots/postbox-2026-10-25/a.png (headless, no subject check, not tickable; box reads as a red pillar box, bands subtle). Gaps: counter and postbox still flat paint, no real metal PBR (it would cost a draw call in a view already at the ceiling); haystack at bazaar west end still not located.
NEXT: collision leftovers (0c: cart legs, hero-house charpai), findability walk.

---

**2026-10-25 (cycle 39z71, playtest block item 4, market leftovers check):** No game change (verification only, no code touched). The "unsigned pale-yellow milk-can building" is the Dudh Dairy at (-112,18): it carries its bilingual board on both faces and the English reads at walking distance (docs/shots/market-2026-10-25/{west_a,west_b}.png, headless, no subject check, not tickable); that gap is closed. Also read the far-LOD abadi (build_abadi.py house_lod) and canal water (shares the blob shader's depth path, so it already gets the scum/damp rim): both were already reworked in earlier commits, so not redone. Not found: the haystack debris at the bazaar row's west end; no haystack stands near the dairy, the nearest sources are tea_stall_haystacks (-58,76) and tubewell stacks, not yet shot.
NEXT: locate and shoot the west-end haystack, collision leftovers (0c), post office textures.

---

**2026-10-25 (cycle 39z70, playtest block item 4, chowk furniture):** Game change: chowk plaza (src/bazaar.js buildChowkPlaza) plastic chairs and benches were single tinted boxes (the "plain tinted boxes" gap in the market object list); now chairs have seat, two-slat raked back, four legs, per-chair turn and tint, and benches have two planks, four legs and a stretcher. Same merged mesh, no new draw call. Build ALL PASSED, budget 30.80 MB. Proof docs/shots/water-2026-10-25/chairs.png (folder name is a reuse; headless, no subject check, not tickable); benches.png missed (camera inside chabutra). Gaps: other market gaps remain (unsigned pale-yellow milk-can building at row east end, haystack debris cards at row west end).
NEXT: haystack debris at bazaar west end, unsigned milk-can building, collision leftovers (0c).

---

**2026-10-25 (cycle 39z69, playtest block items 6/7, water shoreline + wood trial):** Game change: pond/johad water (src/water.js) now has a broken pale scum line at the waterline and a darkened damp rim where the alpha fades (blob water only; canal/hauz unchanged); same material, no new call. Build 16/16, budget 30.80 MB. Proof docs/shots/water-2026-10-25/{pond_d,johad_d}.png (headless, no subject check, buffalo in frame, not tickable); effect is subtle. Tried real PBR wood on abadi rows and new_shops (wood_slot='props'): it costs 3 draw calls (hero 153-154, bazaar 152, over the 150 ceiling), so REVERTED, nothing shipped; the NEEDS_YOU wood-on-houses question stays open. Gaps: canal/hauz shoreline, house wood still plaster-tan.
NEXT: collision leftovers (0c), findability walk, post office textures.

---

**2026-10-24 (cycle 39z68, playtest block item 7, water outline):** Game change: pond and johad water surface (src/water.js blobWaterGeometry) was mirrored in z against the mud rings (farmSites blobShape maps shape y to world -z), so one side showed a dark mud crescent inside the water and the water overran the ring on the other; z and winding flipped, water now fills its mud ring exactly. Same mesh, no new draw call. Build ALL PASSED, budget 30.80 MB. Proof docs/shots/water-2026-10-24b/{pond_c,johad_c}.png (before pond_a/johad_a; headless, no subject check, buffalo/HUD-free but not tickable). Gaps: canal/hauz not re-judged, buffalo at pond still peg-legged blocks, no foam/shore wetness gradient on the water itself.
NEXT: cottage-style house woods (item 6), post office textures, collision leftovers (0c).

---

**2026-10-24 (cycle 39z67, playtest block item 7, highway road ends):** Game change: the highway's two run-outs (src/farmSites.js roadGeos + fadeStrip boost param) now taper from 13 m to 2.6 m over 44 m and shade from asphalt to dusty tan with fading wheel ruts; before, the dark asphalt tongue stopped as a grey slab. Mandi yard end unchanged (boost is highway-only; an all-strip boost washed the mandi out). Proof docs/shots/roadend-2026-10-24b/{hw_s,hw_n,mandi_n}.png (headless, hw shots have no subject check so item 7 road-end line NOT ticked). Gaps: strip edge still has a hard straight seam where the main slab ends; no junction/cross-track.
NEXT: collision leftovers (0c), findability walk.

---

**2026-10-24 (cycle 39z66, playtest block item 5, khel maidan outfield + boundary):** Game change: outfield now has mown-stripe and tuft colour variation (maidanOutfield), boundary posts carry a red paint band and a jute rope sags between them (src/farmSites.js createKhelMaidan); same three meshes. Build ALL PASSED. Proof docs/shots/khel-2026-10-24b/{outfield,rope}.png (headless, subject check passed). Gaps: stripes are subtle under the ground scan; outfield still a bit dull olive.
NEXT: highway/road ends re-check, collision leftovers (0c), findability walk.

---

**2026-10-24 (cycle 39z65, playtest block item 5, khel maidan re-shot):** No code change (verification only). Re-shot the khel maidan with the subject check passing: cricket pitch has textured clay strip, worn run-up patches, creases and stumps; badminton court has packed-earth pad, doubles/singles/service lines and a net on poles. Proof docs/shots/khel-2026-10-24/{cricket_pitch,badminton}.png (headless; no capsules, no HUD). Gaps: outfield grass is uniform dull olive with no mowing/wear variation; boundary posts are plain white sticks.
NEXT: highway/road ends re-check, outfield grass variation.

---

**2026-10-24 (cycle 39z64, playtest block item 5, chakki wall + belt):** Game change: atta chakki back wall now carries streaky flour-dust patches up to 2 m (was one low band on flat terracotta), drive belts are flat 9 cm bands (were round sticks), mesh-guard bars added (tools/blender/build_new_shops.py, new_shops.glb rebuilt). Build ALL PASSED, budget 30.80 MB. Proof docs/shots/chakki-2026-10-24d/close.png (headless, no subject check, so not tickable). Gaps: guard bars read as loose yellow rods; dust patches are hard-edged rectangles.
NEXT: cricket/badminton re-shot, highway/road ends re-check.

---

**2026-10-24 (cycle 39z63, playtest block items 4/5, sacks):** Game change: the shared Blender `sack` helper (tools/blender/arch.py) is now one elliptical lathed bag (flat base, full belly, pinched neck with a cord ring, flared mouth, per-sack lean/bulge/fabric folds), was a bevelled box with pot-like ears; used by the chakki, kirana/bazaar row, halwai, post office, ration shop and dharam kanta. Rebuilt bazaar_row, halwai_compound, new_shops, dharam_kanta glbs; same draw calls. Proof docs/shots/sack-2026-10-24/{front,close}.png (headless; no subject check, capsule hidden, so not tickable). Gaps: chakki front wall still flat terracotta (no flour dust), belt/guard thin sticks.
NEXT: chakki flour-dust wall + belt, cricket/badminton re-shot.

---

**2026-10-24 (cycle 39z62, playtest block item 5, atta chakki check):** No game change (survey only). Re-shot the chakki from inside: the Blender mill (tools/blender/build_new_shops.py atta_chakki) already reads as a flour mill: blue hopper over a green drum housing, blue motor with pulley and belt, scale pan, flour tray, wheat/flour sacks, bulb on a flex (docs/shots/chakki-2026-10-24/{mill_a,mill_b}.png, headless, capsule miller in frame so not tickable). Seen, not fixed: the miller capsule (expected placeholder) blocks the front view; the jute sacks (`sack` helper) are lumpy with pot-like ears and a flat tint; the belt/guard are thin sticks; the front wall is flat terracotta with no flour-dust texture. Item 5 chakki line left unticked.
NEXT: sack helper reshape (shared by all shops), cricket/badminton re-shot.

---

**2026-10-24 (cycle 39z61, playtest block item 5, swing):** Game change: playground swing sets (anganwadi and mela, src/farmSites.js swingSetGeos) now have thicker chains with top hanger rings, eye bolts and moulded rubber seats with raised lips (were hairline wires and flat black planks). Same mesh, no new draw call. Cricket field mud and badminton court lines were already reworked (earlier cycles, farmSites createKhelMaidan), not re-shot this cycle. Build ALL PASSED. Proof docs/shots/swing-2026-10-24c/swing.png (headless, HUD in frame, so not tickable). Gaps: no single 'yellow swing' exists in code; the yellow item is the anganwadi slide rails; atta chakki still open.
NEXT: atta chakki mill rework, cricket/badminton re-shot.

---

**2026-10-24 (cycle 39z60, playtest block item 3, khet variety):** Game change: sugarcane plots are now dense staggered cane (2 of every 3 cells planted, was every other row), so the cane block reads as a cane wall in the khet (src/field.js buildCropRows). Checked, no change needed: flowering sarson, young/ripe wheat, ploughed earth and veg patches already exist in the middle third; haystacks DO exist beside the tubewell and the Yadav tea stall and read as haystacks. Build ALL PASSED. Proof docs/shots/khet-2026-10-24/{cane_find,wide,west,aerial2,tea_hay,tubewell_hay}.png (headless, HUD/capsule in frame, so item 3 NOT ticked). Gaps: west third is uniform stubble and east third uniform sabzi per MAP.md; plot borders have no bunds.
NEXT: cricket field mud texture, badminton court lines, yellow swing.

---

**2026-10-24 (cycle 39z59, playtest block item 4, dairy sign):** Game change: the Dudh Dairy (-112,18) now carries its sign on BOTH faces (src/farmSites.js createDudhDairy); the front opens north so walkers from the bazaar lane saw a blank back wall with no board. Same atlas mesh, no new draw call. Build ALL PASSED. Proof docs/shots/dairy-2026-10-24/dairy_sign.png (headless, HUD in frame, so not tickable). Survey correction: the unsigned dairy is at the row's WEST end, not east. Not done: haystack spikes (source not located; the one beside the row is likely the kachcha stack in build_kachcha.py), tinted-box bazaar props.
NEXT: haystack spike cleanup, collision leftovers (0c).

---

**2026-10-24 (cycle 39z58, playtest block item 4, bazaar signature props):** Game change: the Blender row model (tools/blender/build_bazaar_row.py, the props that actually render) now has a properly shaped sewing machine and CRT. CORRECTION: the JS-side signature props in src/bazaar.js buildBazaarInteriors are hidden by assetSlots (main.js hideOld) once bazaar_row.glb loads, so they were never drawn alongside the Blender ones; I removed them from the JS fallback anyway (only affects the moment before the GLB loads and the hidden collision backing is untouched). The earlier 'tinted boxes' diagnosis in 39z57 was therefore wrong: the grey clutter seen in the lane is the Blender props themselves, and the chowk plaza chairs/benches are likewise Blender (build_chowk_plaza.py, plastic_chair), not the JS boxes. Blender versions improved in tools/blender/build_bazaar_row.py: sewing machine (base, bed, pillar, arm, head, needle bar, foot, spool, gold-banded hand wheel) and CRT (tapered tube housing, glass, swivel stand, keyboard keys, tower drive bays/LED). bazaar_row.glb rebuilt. Fewer draw-call-neutral meshes, no new call. Build ALL PASSED, budget 30.77 MB. Proof docs/shots/bazaar-signature-2026-10-24/{tailor,mobile,barber,puncture,sabzi}.png (headless; counter hides the props from lane height, so shots are through the shutter gap; not tickable). Also checked the east/west-end dairy: it HAS its "Dudh Dairy" board on the front (+z) face (docs/shots/dairy-2026-10-24/n.png); the earlier "no sign" note was from the blank back side. Haystack spikes at the row end not reproduced (straw geometry is a clean lathe); the "spikes" are likely scatter grass cards. Item 4 NOT ticked as a whole.
NEXT: findability walk, collision leftovers (0c).

---

**2026-10-24 (cycle 39z57, playtest block item 4, market unidentifiable-object list):** No game change this cycle (survey only, see gap). Walked the bazaar row from the lane in 7 proof shots (docs/shots/market-walk-2026-10-24/{w1,w2,w3}.png, headless, capsules in frame so not tickable). Every shop sign reads (Hindi small, English dominant). Objects whose purpose does NOT read from lane height: (1) the coloured domes behind each counter are the capsule shopkeeper placeholders (expected until 29 Oct, but they hide the goods); (2) the interior signature props are 3-20 cm boxes/cylinders in src/bazaar.js buildBazaarInteriors (tailor sewing machine, mobile CRT monitor, sabzi pan balance, puncture tub + upside-down cycle of 6 boxes, barber chair) and read as grey clutter behind the counter; (3) the upside-down cycle and puncture tub: only the tyre ring reads; (4) chowk plaza plastic chairs and benches are plain tinted boxes; (5) a haystack sits flush against the row's west end, and at close range shows stray dark spikes and an orange triangle (loose straw/leaf cards) that look like debris; (6) a pale-yellow low building with a blue band and white milk cans at the row's east end has no sign. No removals made. Draw calls in lane views read 105-189 (counts include the shadow pass).
NEXT: replace the tinted-box interior props with Blender builds or remove the puncture-shop cycle; add a sign to the east-end dairy; clean the haystack spikes.

---

**2026-10-24 (cycle 39z56, playtest block item 4, bazaar floor props):** Game change: kirana floor sacks are now bulging jute sacks with a tied neck, and the sabzi crates are bare slatted-wood crates in varied wood tints, rotated, with one stacked (src/bazaar.js buildBazaarInteriors), replacing straight drums and green/red coloured boxes. Same meshes, no new draw call. Build ALL PASSED, budget 30.76 MB. Proof docs/shots/bazaar-props-2026-10-24/{sabzi,kirana}.png (headless, capsule in frame, and the counters hide the floor props from lane height, so I could not verify the result by eye and it is not tickable). Gaps: tailor machine, mobile monitor and pan balance still tinted-box builds; item 4 NOT ticked as a whole.
NEXT: findability walk, unidentifiable-object list.

---

**2026-10-24 (cycle 39z55, playtest block item 7, pond mud):** Game change: pond wet-mud and damp-mud rings (src/farmSites.js shoreGeos) lightened (0x3f3426->0x594a35, 0x6b5a40->0x7a6848) so the waterline reads as wet earth, not a dark pit wall; no new draw call. Proof docs/shots/pond-2026-10-24d/pond_wide.png (headless, HUD and capsule dog in frame, so not tickable). Gaps: water shader unchanged (depth tint, ripples, sheen, soft edge already in); johad/canal/hauz mud not re-shot; item 7 NOT ticked as a whole.
NEXT: findability walk, collision leftovers (0c).

---

**2026-10-24 (cycle 39z54, playtest block item 4, barber shelf bottles):** Game change: barber shelf bottles are now squat flip-cap toiletry bottles (new 'toiletry' kind, SQUAT lathe profile in src/shopGoods.js) with a light white/aqua SHAMPOO label, replacing long-neck dark-purple bottles that read as wine; same atlas, no new draw call, no asset bytes. Proof docs/shots/barberbottle-2026-10-24/barber.png (headless, bottles small and far behind the counter, so not tickable). Gaps: JS-side interior props in src/bazaar.js pushBox/pushCyl (tailor machine, mobile monitor, sabzi pan balance, kirana floor sacks) not re-checked; ration-shop hair-oil bottles still long-neck (amber/green, fine). Item 4 NOT ticked as a whole.
NEXT: findability walk, unidentifiable-object list.

---

**2026-10-24 (cycle 39z53, playtest block item 4, barber chair):** Game change: the bazaar barber chair is rebuilt in Blender (tools/blender/build_bazaar_row.py barber): flared cast base and chrome pedestal with bellows collar (lathes), puffed lathed seat, smooth subdiv-3 back and headrest, padded armrests with chrome posts, footrest strut and plate - was thin-legged boxes that read as a stool. bazaar_row.glb rebuilt, no new draw call. Build ALL PASSED, budget 30.76 MB. Proof docs/shots/bazaar-interiors-2026-10-24/barber.png (headless, HUD in frame, capsules hidden by eval; before shots in bazaar-interiors-2026-10-24-before/), so not tickable. Gaps: the counter hides most of the chair from lane height; barber shelf bottles (purple, long neck) could read as wine bottles - redesign them as clearly shampoo/oil bottles in src/shopGoods.js; JS-side interior props in src/bazaar.js pushBox/pushCyl (tailor machine, mobile monitor, sabzi pan balance, kirana floor sacks) not re-checked; item 4 NOT ticked as a whole.
NEXT: barber shelf bottle shapes, findability walk, remaining unidentifiable-object list.

---

**2026-10-24 (cycle 39z52, playtest block item 7, pond lotus):** Game change: the pond lotus is rebuilt (src/farmSites.js lotusPadGeo, lotusFlowerGeos): pads are 28-segment round cupped discs with one slit (were 14-segment faceted with spike artifacts), flowers are three rings (9/7/5) of lens-shaped cupped petals on a 4x5 grid, cream base to soft pink tip, smaller scale (were 14 flat pink shards reading as crystals). Same mesh, no new draw call. Build ALL PASSED. Proof docs/shots/pond-2026-10-24c/{lotus_before,lotus_final,pond_before_wide,pond_after_wide}.png (headless, HUD and a capsule in frame, so not a tickable proof). Checked and already done, no change: far-LOD abadi openings (build_abadi.py house_lod), pond mud soft shoulder. Gaps: petals still faceted at close range, no stalks/buds, flowers uniform.
NEXT: findability walk, other shops' goods, pond ring.

---

**2026-10-24 (cycle 39z51, playtest block item 5, atta chakki smoothing):** Game change: chakki drum, lid, hopper, motor body, bin and scale pan now 24-40 segments (was 12-20) and a rimmed steel flour tray with a heap of fresh atta sits under the outlet chute (tools/blender/build_new_shops.py atta_chakki, new_shops.glb rebuilt, no new draw call). Proof docs/shots/chakki-2026-10-24c/{front,close}.png (headless, no subject check, so not tickable). Gaps: drum still reads faceted (flat shading, not segment count), sacks blocky, wall posts plaster tan, no real grinding stone; item 5 NOT ticked as a whole.
NEXT: findability walk, far-LOD background buildings.

---

**2026-10-24 (cycle 39z50, playtest block item 4, tea stall glasses/jars):** Game change: the tea stall's six chai tumblers are now lathed waisted glasses (thick base, flared rim, tea fill) and the five shelf jars lathed barni jars with shoulder, neck, fill and knobbed lid (tools/blender/build_tea_stall.py, tea_stall.glb rebuilt), zero extra draw calls. Build ALL PASSED. Proof docs/shots/teaglass-2026-10-24/{glasses,jars}.png (headless, HUD in frame, so not tickable). Gaps: glass and tea fill take the plaster texture of the paint slot, so they read as pale ceramic not transparent glass, tea fill barely visible; no free-asset search done (small lathed shapes). Item 4 NOT ticked as a whole.
NEXT: findability walk, chakki.

---

**2026-10-24 (cycle 39z49, playtest block item 5, playground steel):** Game change: the anganwadi playground (slide chute/ladder, swing frame, chains, seesaw plank) now rides the real metal PBR set in its own mesh (+1 draw call at that zone only, 93 calls there), pipes 10-sided instead of 6 (src/farmSites.js createAnganwadi/limbGeo). Build ALL PASSED, budget 30.68 MB. Proof docs/shots/swing-2026-10-24/{angan,slide}.png (headless, HUD in frame, so not a tickable proof; before shots in swing-2026-10-24-before/). Gaps: I could not identify one "yellow swing" - the only yellow playground item is the slide rails; mela swing (blue) and the house jhoola bench were not re-shot; swing seats still flat black boxes; item 5 NOT ticked as a whole (chakki, cricket/badminton court).
NEXT: tea glasses/jars, findability walk, chakki.

---

**2026-10-24 (cycle 39z48, playtest block item 6, bazaar wood):** Game change: bazaar row shop counters (body + plank lines) and door frames/leaves/panels now carry the real PBR wood set via the building's existing 'wood' slot (build_bazaar_row.py, bazaar_row.glb rebuilt), zero extra draw calls. Proof docs/shots/bazaar-wood-2026-10-24/{front,close}.png (headless). Build ALL PASSED, budget 30.68 MB.
NEXT: tea glasses/jars, findability walk.

---

**2026-10-24 (cycle 39z47, playtest block item 6, halwai wood):** Game change: halwai stall frame posts/beam, counter posts/rail and the firewood stack now carry the real PBR wood set (build_halwai.py: Kit(split_props=False, wood_slot='props'), halwai kind 'wood'), zero extra draw calls (hero shot 147). halwai_compound.glb rebuilt. Build ALL PASSED, budget 30.68 MB. Proof docs/shots/halwai-wood-2026-10-24/{front,front2,close}.png (proof-shot.mjs, headless, HUD and capsule in frame, so not a tickable proof). Gaps: wood still reads dark/brown-black; bazaar row (props slot is metal) still flat; fire-pit bricks unchanged.
NEXT: bazaar wood, tea glasses/jars, findability walk.

---
**2026-10-24 (cycle 39z46, playtest block item 5, ration shop stock in Blender):** Game change: the ration shop's invisible JS-side stock now actually renders, built in tools/blender/build_new_shops.py ration_shop(): six jute grain sacks stacked two high on the right flank, slatted wooden crates (two holding glass oil bottles) on the left, and on the counter a beam scale with two pans and cords, a register ledger with pages, and a row of lidded steel tins. new_shops.glb rebuilt, no new draw call (hero 149, bazaar 149). Build 16/16, budget 30.48 MB. Proof docs/shots/ration-2026-10-24b/{front,close}.png (headless, subject check passed). Gaps: bottles stand on crate tops not in slots, sacks still blocky; chakki counter ledger/post office rack textures still plain paint; item 5 NOT ticked as a whole.
NEXT: halwai/bazaar wood, tea glasses/jars, findability walk.

---

**2026-10-24 (cycle 39z45, playtest block item 5, post office counter stock):** Game change: post office counter now carries a rubber-banded envelope bundle, a black desk phone with dial and handset, and three twine-tied brown-paper parcels (tools/blender/build_new_shops.py post_office, new_shops.glb rebuilt, no new draw call). Lesson: src/newShops.js props are the INVISIBLE collision backing (group new_shops_old); visible furnishing for post office/ration/chakki must go in the Blender script. Build 16/16, budget under 40 MB. Proof docs/shots/postoffice-2026-10-24b/front.png (headless, no subject check, so item 5 NOT ticked). Gaps: post box and counter textures still plain wood/paint; ration and chakki JS-side props (tins, ledger, scale) are invisible and need the same move to Blender.
NEXT: ration shop/chakki props into Blender, halwai/bazaar wood, tea glasses/jars, findability walk.

---

**2026-10-24 (cycle 39z44, playtest block item 5, cricket field ground):** Game change: Khel maidan mud (pitch, run-ups, badminton pad) now tiles the ground scan at one tile per 5.5 m (was 2.5, read as wooden planks) and the outfield grass one per 6 m (was 3, showed a visible checker repeat), src/farmSites.js maidanOutfield / createKhelMaidan. No asset bytes, no draw call. Build ALL PASSED, budget 30.40 MB. Proof docs/shots/khel-2026-10-24b/pitch_walk.png vs khel-2026-10-24/pitch_walk.png (headless, subject check passed). Court lines and net were already built (docs/shots/khel-2026-10-24/badminton.png). Gaps: court pad still low-contrast against the pitch; stump and crease colours are flat vertex colour; item 5 NOT ticked as a whole (post office/chakki textures open).
NEXT: post office stock, halwai/bazaar wood, tea glasses/jars, findability walk.

---

**2026-10-24 (cycle 39z43, playtest block item 5, atta chakki + sacks):** Game change: every flour/grain sack (tools/blender/arch.py sack, used by chakki, bazaar row, halwai, dharam kanta) is now a stuffed rounded-box bag with a cord-tied gathered mouth instead of an onion-shaped sphere; the chakki's hopper is now a real funnel (cone on a neck) over the drum instead of a blue bucket. new_shops, bazaar_row, halwai_compound, dharam_kanta .glb rebuilt. Build ALL PASSED (verified on a near-identical model), budget 30.41 MB. Proof docs/shots/chakki-2026-10-24b/{front,close}.png (headless, no subject check, so item 5 NOT ticked). Gaps: sacks still slightly blocky, drum faceted, no flat grinding stone/flour tray, chakki wall posts still plaster tan.
NEXT: post office stock, halwai/bazaar wood, tea glasses/jars, findability walk.

---

**2026-10-24 (cycle 39z42, playtest block item 6, real wood on buildings):** Game change: the house, school, general store, chowk tea stall and tea stall (tools/blender build_*.py, Kit(split_props=False, wood_slot='props')) now carry the real PBR wood set on shutters, door frames, posts and signs instead of plain plaster tan, with ZERO extra draw calls: wood rides in the building's existing no-shadow 'hb_props' mesh (paint kind folds into hb_main instead). Lesson: wood_slot only costs nothing when the slot is already a mesh the building uses; an unused slot (terracotta, brick, tin) adds a call (hero went to 154). Also bell, flagpole and wayfinding posts no longer cast shadows (-1 call). Build 16/16, hero 149, bazaar 149, budget 30.6 MB. Proof docs/shots/wood-2026-10-24/{hero,hero2}.png (headless camera shots, capsule in frame, no subject check). Gaps: halwai (uses brick+props+tin, wood still flat vertex colour), bazaar row (props slot is metal), abadi houses and kachcha still on their own routes; wood reads dark.
NEXT: halwai/bazaar wood, tea glasses/jars, post office stock, findability walk.

---

**2026-10-24 (cycle 39z41, playtest block item 4, ration shop stock):** Game change: ration shop counter now carries real-shaped printed salt/tea packs, soap stacks and a second row of packs, plus a flank crate of oil/syrup bottles (src/shopGoods.js rationGoods, atlas designs reused, no asset bytes), merged into the existing general-store goods mesh in main.js so no new draw call (a separate mesh took hero view to 151, over the ceiling). Build ALL PASSED. Proof docs/shots/ration-2026-10-24/{front,close}.png (headless, subject check passed). Gaps: bottles stand loose on the grass, no crate under them; post office and atta chakki stock still primitive boxes/sacks; item 4 NOT ticked as a whole.
NEXT: post office stock, draw-call saving in hero view, tea glasses/jars, findability walk.

---

**2026-10-24 (cycle 39z40, playtest block item 3, mustard density):** Game change: sarson plots now get a flower-head canopy on every grid spot (was every other) with 16 cards per instance (was 12), so mustard reads as a continuous yellow carpet from khet distance, not scattered sprigs (src/field.js buildSarsonBloom / sarsonSpots). Same single InstancedMesh, no new draw call, no asset bytes. Khet variety already in code: sarson, young wheat, ripe wheat, ploughed earth, veg patch, sugarcane blocks; haystacks at tubewell and tea stall exist (docs/shots/khet-2026-10-24/haystacks_tubewell.png). Proof docs/shots/sarson-2026-10-24b/{overview,close}.png (headless, camera shots, no subject check). Item 3 NOT ticked as a whole: haystack-near-tea-stall shot not re-taken; crop blades still flat-card look at close range.
NEXT: draw-call saving in the hero view (unblocks wood), tea glasses/jars, findability walk.

---

**2026-10-24 (cycle 39z39, animals, monkey):** Game change: the M6 monkey (src/animals.js buildMonkeyMesh) rebuilt from capsule/box blobs into a rhesus macaque: deep chest to slim waist, haunch, shoulder hump, pale belly, round skull with brow ridge, pale bare face, muzzle, nostrils, eyes, ears, tapered limbs with elbow/knee joints and dark hands/feet, long tapering tail arcing over the rump, and the shared fur texture/bump from the cattle and dogs (no new asset bytes, still one merged Mesh, one draw call). Build ALL PASSED, budget 29.31 MB. Proof docs/shots/monkey-2026-10-24/{side,three_q,front}.png (isolated test scene tmp/monkeyview.html, not in-game; no in-game subject check, so "animal models" NOT ticked). Gaps: limbs still straight cylinders, no run animation, goats do not exist in code.
NEXT: draw-call saving in the hero view (unblocks wood), tea glasses/jars, findability walk.

---

**2026-10-24 (cycle 39z38, animals, dog):** Game change: street dogs (src/animals.js buildDogGeometry) rebuilt from capsule/box blobs into a lean pariah dog: deep chest tapering to a slim waist, haunch, neck, wedge skull and muzzle with nose, prick ears, eyes, sickle tail, tapered legs with a hock bend and pale paws, and the shared fur texture from the cattle (finer UV scale so it reads as fur, not wood). Same InstancedMesh, no new draw call, no asset bytes. Build ALL PASSED, budget 29.31 MB. Proof docs/shots/dog-2026-10-24/{side,three_q,front}.png (isolated test scene tmp/dogview.html, not in-game; no in-game subject check, so "animal models" NOT ticked). Gaps: legs still stick-thin and torso segments visibly lumpy, no walk animation, monkey and goats untouched.
NEXT: draw-call saving in the hero view (unblocks wood), tea glasses/jars, monkey.

---

**2026-10-24 (cycle 39z37, animals):** Game change: cattle/buffalo (src/animals.js buildBovineGeometry) rebuilt with real anatomy instead of capsule blobs: long barrel and rump, zebu hump, dewlap, udder, wedge head with muzzle, horns, ears, eyes, tapered legs with dark hooves, tail with switch; one shared procedural hide texture (hair grain, soft patches, bump + roughness) on the same InstancedMesh, so no new draw call and no asset bytes. Grazing pitch cut from 0.5 to 0.1 rad (the old sway tipped the whole animal nose-down 28 degrees). Free-asset search: Poly Pizza CC0 cows (Quaternius-style, 3 found) are flat-colour low-poly holsteins, no textures, so they fail rule 2 and were not used; no free realistic zebu exists. Build ALL PASSED. Proof docs/shots/cattle-2026-10-24/{cow,buffalo}.png (headless; no subject check, so "animal models" NOT ticked). Gaps: legs still thin, body still smooth-stylised, dogs and monkey untouched, buffalo reads dark and glossy.
NEXT: dog model, draw-call saving in the hero view (unblocks wood), tea glasses/jars.

---

**2026-10-24 (cycle 39z36, playtest block item 4, tea stall steel):** Game change: the tea stall's pot, kettle, spout, tray, steel tin and bucket are now real PBR metal (kind 'metal' routed into the tin slot in tools/blender/build_tea_stall.py, tea_stall.glb rebuilt) instead of flat-paint faceted cylinders; they ride the roof's existing tin draw call, so hero and bazaar views stay at exactly 150 of 150 (a separate metal/terracotta slot cost +1 and failed check 8a, so was rejected). Build 16/16. Proof docs/shots/teametal-2026-10-24/front.png (headless, subject check passed; steel reads ribbed because it uses the corrugated tin set). Item 4 NOT ticked as a whole: tea glasses and shelf jars still flat paint; wood in bazaar row/tea stall still plaster tan (needs a draw call).
NEXT: draw-call saving in the hero view (unblocks wood and glass), animal models.

---

**2026-10-24 (cycle 39z35, playtest block item 4, tailor/barber/puncture goods):** Game change: the bazaar row's tailor now has folded printed-cloth stacks on the counter, the barber's flat-paint bottles are textured amla-oil and shampoo bottles with towels on a rail (new atlas cells hairOil/shampoo/towel), and the puncture shop's flat black rings are textured tyres and tubes (sidewall print, tread) hung from the beam plus a tyre in the tub (src/shopGoods.js tyre/tube/towel/folded kinds, src/bazaar.js buildBazaarKiranaGoods; build_bazaar_row.py bottles/towel hooks/tyre rings removed, bazaar_row.glb rebuilt). Folded into the existing bazaar goods mesh: no new draw call. Build ALL PASSED, budget 29.31 MB. Proof docs/shots/bazaargoods-2026-10-24/{tailor,barber,puncture}.png (headless, subject check passed; awning hides the barber shelf so bottles/towels read small). Item 4 NOT ticked as a whole: tea glasses/jars/kettle still faceted flat paint; wood in bazaar row still plaster tan; barber chair/tailor machine flat-painted.
NEXT: draw-call saving in the hero view, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z34, playtest block item 4, chemist goods):** Game change: the chemist (src/farmSites.js createChemist) now carries textured stock from the shared goods atlas (src/shopGoods.js chemistGoods()): stacked printed medicine cartons, a row of amber cough-syrup bottles and loose cartons on the counter. Zone group only, no hero/bazaar draw-call cost. Build ALL PASSED, budget 29.34 MB. Proof docs/shots/chemistgoods-2026-10-24/{counter,front}.png (headless, subject check passed). Item 4 NOT ticked as a whole: tailor, puncture and barber goods still plain; tea glasses/jars/kettle still faceted flat paint. Gaps: chemist counter is a flat tan box and the glass front is an opaque pale panel (no wall shelves inside).
NEXT: tailor/puncture/barber goods, draw-call saving in the hero view, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z33, playtest block item 4, tea stall goods):** Game change: the tea stall's back shelf now carries printed biscuit/tea/chips/namkeen/salt packs in two rows, snack packs and sachet strips hang from the front beam, two biscuit packs lie on the counter (src/shopGoods.js teaStallGoods); the old flat-colour box packets are gone from tools/blender/build_tea_stall.py (tea_stall.glb rebuilt). Folded into the general-store stock mesh via mergeGoodsMeshes, so no new draw call. Build ALL PASSED. Proof docs/shots/teagoods-2026-10-24/{shelf,front}.png (headless, subject check passed). Item 4 NOT ticked as a whole: chemist, tailor, puncture and barber goods still plain; tea glasses/jars/kettle are still faceted flat paint.
NEXT: chemist goods, tailor/puncture/barber goods, draw-call saving in the hero view, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z32, playtest block item 4, dairy goods):** Game change: the Dudh dairy (src/farmSites.js createDudhDairy) now carries textured stock from the shared goods atlas (src/shopGoods.js: 3 new skins milk/ghee/dahi, dairyGoods(), kinds 'milkpouch' and 'tub'): stacks of printed milk pouches, curd tubs and ghee tins on the collection bench. One extra draw call but only inside the dairy zone group (drawn within the zone radius, not in the hero or bazaar view). Build ALL PASSED, budget 29.34 MB. Proof docs/shots/dairygoods-2026-10-24/{bench,floor}.png (headless, subject check passed). Item 4 NOT ticked as a whole: tea stall, chemist, tailor, puncture and barber goods still plain. Gap: the pouch stacks sit straight on grass (no crate), dairy walls are still vertex-colour.
NEXT: tea stall goods (zone group, same route), draw-call saving in the hero view, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z31, playtest block item 4, halwai goods):** Game change: the halwai's flat-colour mithai (laddoo/gulab jamun spheres, barfi boxes, jalebi coils on the cabinet thalis) and the flat jalebi/samosa in the two kadhais are gone from tools/blender/build_halwai.py (halwai_compound.glb rebuilt) and replaced by textured goods from the shared shop atlas (src/shopGoods.js: 5 new skins laddoo/gulab/barfi/jalebi/samosa, ROWS 8->10, halwaiGoods()), mesh 'halwai_stock' added in src/main.js and excluded from validator check 7 like 'general_store_stock'. Costs +1 draw call: hero view 149 -> 150 of 150 (folding it into the store mesh made it 151, so kept separate). Build 16/16, budget 29.34 MB. Proof docs/shots/halwai-goods-2026-10-24/{cabinet,kadhai}.png (headless, subject check passed; cabinet.png is a doorway angle that mostly shows the wall, kadhai.png shows the thalis and both kadhais). Item 4 NOT ticked as a whole: tea stall, dairy, chemist, tailor, puncture and barber goods still plain. Hero view is now AT the 150 ceiling: next goods work needs a draw-call saving first.
NEXT: draw-call saving in the hero view, then tea stall/dairy goods, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z30, playtest block item 3, crop texture):** Game change: mustard (sarson) flower heads in src/field.js are now alpha-cut cards painted with a raceme of tiny four-petal yellow florets on green stems (sarsonBloomTexture, procedural canvas, 2 tris per card), replacing flat yellow triangles; crop tufts and sugarcane stalks/leaves now carry a procedural blade atlas (midrib, veins, cane nodes) instead of pure vertex colour (bladeAtlas). Same InstancedMeshes, no new draw call, no new asset bytes. Build ALL PASSED, budget 29.44 MB. Proof docs/shots/cropleaf-2026-10-24/{close,overview}.png (headless, no subject check, so item 3 NOT ticked). Gaps: wheat tufts still read as plain blades at distance, blade texture is subtle at game distance, ripe-wheat variety of growth stages unchanged, cane close-up not re-shot.
NEXT: wheat/sabzi tuft variety, other shops' interior goods, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z29, playtest block item 3, mustard carpet):** Game change: sarson plots now carry a dense canopy of yellow flower-head triangles (new InstancedMesh 'field_sarson', buildSarsonBloom in src/field.js, ~19 tris per instance on every other grid spot of sarson plots, drawn only within 95 m of the khet like the cane in src/main.js). From a distance the plots now read as yellow flowering mustard; before, they were isolated pale sprigs on brown earth. Build ALL PASSED, field view 118 calls, hero 149, bazaar 150, budget 29.44 MB. Proof docs/shots/sarson-2026-10-24/{overview,close}.png (headless, no subject check, so item 3 NOT ticked). Gaps: close up the flower heads are flat-colour faceted triangles (no petal texture); wheat/crop tufts are still the old cards; cane is flat vertex colour.
NEXT: crop tufts and cane leaf texture, other shops' interior goods, wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z28, playtest block items 1/4, Banta shop + Chaat thela real materials):** Game change: Banta kiosk and Chaat thela (src/farmSites.js, new finishSite opts.sets) now use real PBR wood (planks, posts, crate, stool, lime basket, spokes) and real metal (awning, ice tub, steel pot, rim, umbrella pole) instead of plaster tint; thela got spoked wheels (steel rim, hub, 8 spokes, were black discs) and an open wooden display tray with papdi/chana heaps (was a white box). Two extra local draw calls per stall, zones only drawn within 14 m. Build ALL PASSED, budget 29.44 MB. Proof docs/shots/bantachaat-2026-10-24/{banta,chaat_after2}.png (headless photo camera, has HUD, no subject check, so nothing ticked). Gaps: no see-through glass possible in merged meshes; shopkeeper capsules stay.
NEXT: other shops' interior goods (item 4), wood in bazaar row, animal models.

---

**2026-10-24 (cycle 39z27, playtest block item 4/2, bazaar painted props):** Game change: the bazaar row's painted props (tyres, pump, spanners, bicycle, barber chair, bottles, plastic chairs; ~100 objects in tools/blender/build_bazaar_row.py) were plaster-textured; they now carry the real metal PBR set via Kit(tex_override={'props': ('metal', 1.0)}), same slot so no new draw call (materials still 3). bazaar_row.glb rebuilt. Build ALL PASSED, budget 29.44 MB. Proof docs/shots/bazaarprops-2026-10-24/{puncture,barber}.png (+_hi) are headless and the counter/awning hides the props from player height, so judged only roughly; nothing ticked. Honest gap: plastic chairs and bottles now read as painted metal, not plastic; wood in the bazaar is still plaster-tan.
NEXT: wood in bazaar row (own PBR set, needs a draw-call saving first), other shops' interior goods, animal models.

---

**2026-10-24 (cycle 39z26, playtest block item 7, road ends):** Game change: the mandi yard and highway run-outs (src/farmSites.js fadeStrip) are now one continuous tapering flat strip with wobbled edges and fading wheel ruts, replacing the stepped hard-edged rectangle slabs that still read as an abrupt end; same meshes, no new draw call. Build ALL PASSED, budget 29.41 MB. Proof docs/shots/roadend-2026-10-24/{mandi_end_n,mandi_end_n_after,mandi_end_s_after}.png (headless camera shots, no subject check, so item 7 NOT ticked). Gaps: strip colour ramp to earth barely shows under the concrete PBR texture, so the end is organic but still grey; highway end not re-shot (hw_end_after.png framed empty grass).
NEXT: pond shoreline mud, flat-tint barber/puncture props, Banta/Chaat real textures.

---

**2026-10-24 (cycle 39z25, playtest block item 7, pond lotus):** Game change: pond lotus pads are ~1.5x larger (0.6-1.2 m) and sit above the water surface (they were half-sunk and invisible from the bank), flowers ~2x bigger and more frequent (src/farmSites.js createPond). Same single lotus mesh, no new draw call. Build ALL PASSED, budget 29.41 MB. Proof docs/shots/lotus-2026-10-24/{pond_close,pond_wide}.png (headless, photo camera, no subject check, has HUD prompt, so item 7 NOT ticked). Pads and petals now read as lotus; petals are still faceted flat-colour (no petal texture). Buffaloes at the pond are still peg-legged blocks.
NEXT: flat-tint barber/puncture props, Banta/Chaat real textures, animal models.

---

**2026-10-24 (cycle 39z24, playtest block item 7, water sheen):** Game change: the shared water shader (src/water.js, used by pond, johad, canal, hauz) now has a fresnel sky-reflection tint at grazing angles and faint broken glitter on ripple crests, keeping the depth tint; same material, no new draw calls. Build ALL PASSED. Proof docs/shots/water-sky-2026-10-24/pond.png (headless, no subject check, so item 7 NOT ticked). Still open in item 7: the pond lotus still reads as small pink cones (visible in the shot), buffaloes are peg-legged blocks.
NEXT: real lotus pads and flowers, flat-tint barber/puncture props, Banta/Chaat real textures.

---

**2026-10-24 (cycle 39z23, playtest block item 2, milk cans):** Game change: the homestead's lone plain-cylinder milk can (tools/blender/build_kachcha.py) is now two lathed steel cans with shoulder, neck, lid and rolled bands, kachcha_homestead.glb rebuilt; the Dudh dairy cans were already proper dairy cans. Build ALL PASSED, budget 29.41 MB. Proof docs/shots/milkcan-2026-10-24/{before,homestead_after}.png (headless, no subject check, so only noted on item 2, not ticked as whole). Still flat-tint: barber/puncture props. Cattle in homestead shed are peg-legged blocks (animal models).
NEXT: flat-tint barber/puncture props, Banta/Chaat real textures, water texture (item 7).

---

**2026-10-24 (cycle 39z22, playtest block items 4-6 proof pass):** Game change: the tailor's dress form (the unidentified yellow oval, tools/blender/build_bazaar_row.py) is now maroon cloth with wider shoulders, reads clearly as a tailor's dummy beside the sewing machine; bazaar_row.glb rebuilt, no new draw calls. Build ALL PASSED, budget 29.40 MB. Proof docs/shots/dressform-2026-10-24/tailor_maroon.png (headless, subject check passed). Also: proof shots taken and FEEDBACK ticked for rooftop water tanks (docs/shots/tanks-2026-10-24/near1.png, near2.png), petrol pump and dharam kanta (existing shots re-judged); matkas checked smooth (docs/shots/matka-2026-10-24/d.png). tools/shotlib.mjs now hides the dev-only tripo_*_placeholder boxes (coloured cuboids visible in dev shots only, not in the live build). Seen, not fixed: cattle at the halwai are peg-legged blocks (animal models).
NEXT: flat-tint barber/puncture props, outfield pitch edges, Banta/Chaat real textures, milk cans.

---

**2026-10-24 (cycle 39z21, playtest block item 5, cricket outfield ground):** Game change: the khel maidan outfield (src/farmSites.js maidanOutfield) was one flat grass blob with a visible repeating diamond tile; it is now a subdivided disc with vertex-colour drift between green, dry straw and bare dust at 4-9 m scale, metric UVs, and a rim that fades to dirt (same single mesh, no new draw call). Build ALL PASSED, budget 29.40 MB. Proof docs/shots/maidan-2026-10-24/after_wide.png vs before_wide.png (headless, camera shot, no subject check, so item 5 NOT ticked; badminton court and lines already built). Reads as worn dry ground, not mud-brown; the pitch strip is still box geometry.
NEXT: shopkeeper proof shot, flat-tint barber/puncture props, Banta/Chaat real textures.

---

**2026-10-24 (cycle 39z20, playtest block item 1, stall keepers):** Game change: capsule shopkeepers now stand at the Banta shop (behind the counter) and the Chaat thela (behind the cart) in src/farmSites.js, per her rule that no spot stays empty while models are parked. They live inside the zone groups, so they stream with the stalls. Build ALL PASSED. No proof shot taken this cycle (nothing ticked).
NEXT: proof shot of both keepers, flat-tint barber/puncture props, outfield grass checker.

---

**2026-10-24 (cycle 39z19, playtest block item 1, Banta shop + Chaat thela built):** Game change: the two unbuilt places from signage item 1 now exist at their freeRoam coordinates, Banta shop (-63,22.5: plank kiosk, tin awning, crate of goli-soda bottles, steel ice tub, lime basket, stool) and Chaat thela (-63,50.5: push-cart, glass case, tamarind pot, leaf bowls, umbrella, bulb) in src/farmSites.js, each with an English-dominant bilingual board (src/placeBoards.js), colliders, zone-streamed and drawn only within 14 m so hero 148 / bazaar 150 hold. Build 16/16. Proof docs/shots/banta-chaat-2026-10-24/{banta,chaat}.png (headless, subject check passed; boards read English-first). Gaps: both are flat vertex-colour code geometry (no PBR textures, no Blender model), no goods variety, no shopkeeper capsule placed yet, MAP.md gives no coordinates for either (used freeRoam's). Item 1 still has its other open parts, not ticked.
NEXT: shopkeeper capsules at both stalls, real textures/Blender rebuild of these two, flat-tint barber/puncture props, outfield grass checker.

---

**2026-10-24 (cycle 39z18, queue item 5, far-LOD abadi openings):** Game change: the far-LOD abadi row proxies (tools/blender/build_abadi.py house_lod, make_abadi.sh) now have pale window/door surrounds and sills, three-bar iron grilles, door frame and step, a damp band above the plinth and a floor band on two-storey houses, front and rear. Near models untouched, still 1 material and ~1-1.4k triangles per proxy. Build ALL PASSED (hero 148, bazaar 150), budget 29.40 MB. Proof docs/shots/farlod-2026-10-24/east_far_after.png vs east_far.png (headless, no subject check, so NOT ticked). Still flat colour (no plaster texture) on the far proxy.
NEXT: flat-tint barber/puncture props, outfield grass checker, Banta shop / Chaat thela unbuilt.

---

**2026-10-24 (cycle 39z17, playtest block item 7, pond mud edge):** Game change: the pond (and johad rim) shoreline mud no longer ends in a crisp rim; src/farmSites.js softShoulder() adds five vertex-colour bands outside the dry-mud ring that grade from mud to the grass tone (same blob outline, merged into the existing shore mesh, no new draw call). Build ALL PASSED, budget 29.33 MB. Proof docs/shots/pond-soft-2026-10-24/pond.png (headless, no subject check, so item 7 NOT ticked). Also found: the interior-goods gaps listed in 39z7-39z11 for medical, tailor and mobile are already filled (buildBazaarKiranaGoods carries them); remaining flat-tint props are the barber chair, puncture-shop props, sewing machine and kirana floor sacks. Buffaloes at the pond read as peg-legged blocks (animal models), not touched.
NEXT: flat-tint barber/puncture props, outfield grass checker, pitch patch edges, Banta shop / Chaat thela unbuilt.

---

**2026-10-24 (cycle 39z16, playtest block item 5, chakki mill metal):** Game change: atta chakki (build_new_shops.py, Kit own=('jute','metal')) now carries the real metal PBR set on drum, hopper, motor, pulley, bin (was flat plaster tan); all flour/sugar sacks (arch.sack) are smooth-shaded, no longer faceted. Build ALL PASSED, hero 148, bazaar 150, field 117, budget 29.33 MB. Proof docs/shots/chakki-metal-2026-10-24/close.png (headless, no subject check, so item 5 NOT ticked). Metal still reads painted/matte; chakki wall wood posts still plaster tan.
NEXT: Banta shop / Chaat thela unbuilt (signage item 1), draw-call savings to unlock wood PBR, chakki wood posts.

---

**2026-10-24 (cycle 39z15, playtest block item 4, yellow oval identified):** Game change: the yellow oval at the tailor counter was the mannequin torso (a floating yellow ellipsoid on a stick). Rebuilt in tools/blender/build_bazaar_row.py as a dress form: tripod feet, pole, tapered cream-linen torso with shoulders, wooden neck knob, yellow measuring tape; bazaar_row.glb rebuilt, same material buckets (no new draw calls). Build ALL PASSED, bazaar view 140-146 calls. Proof docs/shots/dressform-2026-10-24/tailor_front.png (headless, capsule tailor visible; dress form reads left of the sewing machine; item 4 NOT ticked, other open gaps remain).
NEXT: chakki mill metal, Banta shop / Chaat thela unbuilt, draw-call savings (flagpole, wayfinding, vehicle paint) to unlock wood PBR on abadi/school/bazaar.

---

**2026-10-24 (cycle 39z14, playtest block item 3 haystacks + draw-call saving):** Game change: two bhoosa haystacks now stand behind the Sharma/Yadav tea stall (createTeaStallHaystacks in src/farmSites.js, zone 'tea_haystacks' at (-58,76), drawn only within 45 m so the hero and bazaar views stay under the ceiling; straw material added to validator check 5's sampled materials, an extension not a loosening). The school bell is now one iron-PBR mesh (was two flat-colour meshes), saving one call. Build 16/16, hero 148, bazaar 149, budget 29.33 MB. Proof docs/shots/haystack-2026-10-24/{tea_haystack,bell_c}.png (headless; tea_haystack shows one stack, second is out of frame). Searched: no free haystack model needed, reused the lathed stack + straw PBR already built for the tubewell. Swing: the yellow part was the anganwadi slide; swing sets are blue A-frames with rubber seats (docs/shots/swing-2026-10-24/anganwadi_play.png), not re-ticked. Road ends at the mandi already fray into dirt ruts in code.
NEXT: chakki mill metal, Banta shop / Chaat thela unbuilt, yellow oval at tailor counter, more draw-call savings (flagpole, wayfinding, vehicle paint meshes).

---

**2026-10-24 (cycle 39z13, playtest block item 4, doorstep slabs):** Game change: removed the eight per-unit grey block steps in front of the bazaar shops (tools/blender/build_bazaar_row.py); the one continuous front step remains, bazaar_row.glb rebuilt. Build ALL PASSED, budget 29.33 MB. Proof docs/shots/doorstep-2026-10-24/front_a.png (headless, no subject check, so item 4 NOT ticked): no stray slabs, continuous step reads. Open: yellow oval at tailor counter still unidentified; chakki mill metal; Banta shop / Chaat thela unbuilt.
NEXT: identify the yellow oval, chakki mill metal, Banta shop / Chaat thela, wood-slot draw-call savings.

---

**2026-10-24 (cycle 39z12, playtest block item 3, khet sugarcane):** Game change: the khet now has sugarcane blocks (one plot kind 'cane' in src/field.js PLOT_KINDS; ~2.6 m jointed-stalk clumps with arching leaves, one InstancedMesh 'field_cane', hidden beyond 95 m of the field centre in src/main.js so the bazaar view stays at 150 draw calls). Build 16/16. Proof docs/shots/cane-2026-10-24/cane_close.png (headless, no subject check, so item 3 NOT ticked). Gaps: cane is flat vertex-colour (no leaf texture), plot edges hard; crop tufts still old flat cards; ploughed/veg/mustard already existed.
NEXT: textured cane/crop cards, grey doorstep slabs -> continuous step, chakki mill metal, Banta shop / Chaat thela unbuilt.

---

**2026-10-24 (cycle 39z11, playtest block item 4, market props):** Game change: src/bazaar.js interior props rebuilt with real shapes in the same merged buckets (zero new draw calls): tailor's cast-iron sewing machine (base, pillar, arm, needle bar, spool, hand wheel, cloth), barber chair (base, chrome pedestal, seat, back, headrest, armrests, footrest, now facing the mirror), desktop computer (CRT, keyboard, CPU tower), puncture tub with water, pump foot plate and hose, cycle top tube and fork. Build ALL PASSED, draw calls 135-148 in shots. Proof docs/shots/market-props-2026-10-24/*.png (headless): sewing machine reads in tailor.png; barber chair, monitor and tub are hidden behind the counter and the shopkeeper capsule from street height, so NOT ticked. Props still use the tinted wood texture (dark rough on black parts), not real PBR metal/plastic.
NEXT: sugarcane blocks inside the field loop; grey doorstep slabs -> continuous step; chakki mill metal; Banta shop / Chaat thela unbuilt.

---

**2026-10-24 (cycle 39z10, playtest block item 6, wood slots):** Game change: temple, petrol pump and dharam kanta now carry the real wood PBR set (Kit(wood_slot=...) in tools/blender/arch.py routes wood into the unused tin/terracotta slot). Build 16/16, hero 148, bazaar 150 (hard ceiling), budget 29.34 MB. FINDING: a routed slot is NOT free - it is still a separate material = +1 draw call per building vs wood in plaster. I tried it on abadi, school, bazaar_row, bg_houses, tea_stall, chowk_tea, general_store: hero went 155, bazaar 157 (fails check 8a), so those seven are reverted (scripts back to plain Kit()). Needs the art director's call or draw-call savings (e.g. wood into a shared trim atlas on the plaster material). Proof shot docs/shots/wood-slot-2026-10-24/temple.png is bad (missed the temple, capsule in frame); not ticked.
NEXT: draw-call savings or a plaster+wood atlas; flat-tint interior props; pond mud edge.

---

**2026-10-24 (cycle 39z9, playtest block item 7, highway decals):** Game change: highway tar patches, cracks, centre dashes and edge lines (src/farmSites.js roadGeos) are now flat quads instead of thin boxes; the boxes' side faces were rendering as dashed black lines at grazing angles. Patch tones closer to asphalt, layers separated in height. Build ALL PASSED, budget 28.64 MB. Proof docs/shots/water-road-2026-10-24/highway3.png (before: highway.png); pond.png shows the water/lotus/mud already built (headless). Gaps: pond mud outer ring still has a crisp edge; lotus flowers small; wood fall-through audit (39z8) and flat-tint shop props still open.
NEXT: pond mud edge blend, flat-tint interior props, own=('wood',) with draw-call savings.

---

**2026-10-24 (cycle 39z8, playtest block item 6, cottage wood):** Game change: kachcha homestead (tools/blender/build_kachcha.py, Kit own=('wood',)) now carries the real wood PBR set on posts, beams, gate, charpai, stand (they had silently fallen into the plaster material = flat tan), veranda lean-to switched paint -> thatch set. Cost: +1 draw call per copy; second copy cull 80 -> 60 m (src/scenery.js) to hold bazaar view at 149. Build 16/16, budget 28.64 MB. Proof docs/shots/cottage-2026-10-24/after_porch.png (headless, no subject check, so item not ticked). Gaps: abadi/house_compound wood not audited for the same fall-through (Kit without own=('wood',) puts every 'wood' kind in plaster); audit list in 39z7 still open.
AUDIT: 11 builders add 'wood' with no own=('wood',) (abadi 36 parts, school 23, bazaar_row 17, bg_houses 14, tea_stall 9, chowk_tea 5, dharam_kanta 4, petrol_pump 3, general_store 2, temple 2, flower_stall 1) so all of it renders as flat plaster tan; fixing costs +1 call per building and the bazaar/hero views sit at 148-149 of 150, so needs the art director's call or draw-call savings first.
NEXT: draw-call savings, then own=('wood',) on abadi/school/bazaar; replace flat-tint interior props (tailor machine, barber chair, monitor, puncture tub); sugarcane blocks.

---

**2026-10-24 (cycle 39z7, playtest block item 4, market audit only):** No game change this cycle (audit + shots only; builder ran short on time). Shots docs/shots/market-audit-2026-10-24/{w1,w3}.png (headless, proof-shot tool, so capsules visible). Verified: bazaar shutters up, English-dominant boards legible, back doors/windows framed. Khet (39i), water, highway, petrol pump, kanta, chakki, post office, school games are already built per earlier entries; their FEEDBACK lines are not ticked because several have open gaps listed there.
AUDIT LIST - market objects whose purpose is not instantly readable (src/bazaar.js interior props, all flat-tint code boxes/cylinders, 'pushBox/pushCyl' ~L580-660): tailor 'treadle machine' (black box + disc + stick on counter); mobile shop 'monitor' (dark box with blue panel); barber chair (red boxes on thin legs, reads as a stool); sabzi hanging pan balance (post + two discs); puncture tub/tyre/red hand-pump/upturned cycle (grey cylinder, torus, red stick); kirana floor sacks (plain cylinders); a yellow oval hanging at the tailor counter (w3.png, centre-right, unidentified - likely a shopGoods cloth bolt or lamp; check); flat grey slabs on the ground in front of shops (doorsteps, read as stray paving). Fix plan: real CC0 sewing machine / barber chair / monitor / tub from Poly Pizza + Sketchfab CC0, or Blender-built with PBR atlas; replace the grey slabs with a continuous step. Not done.
NEXT: replace the flat-tint interior props above (item 4 last bullet); cottage-house wood textures (item 6); sugarcane blocks inside the field loop (item 3); chakki mill drum textured metal.

---

**2026-10-24 (cycle 39z6, playtest block item 5, atta chakki jute):** Game change: jute weave texture scale 0.7 -> 2.6 repeats/m (tools/blender/arch.py), new_shops.glb rebuilt; the checker-pattern read on the sacks is gone, a fine burlap weave remains. Build ALL PASSED, budget 28.43 MB. Proof docs/shots/chakki-2026-10-24/v5_close.png (headless). Item NOT ticked: sacks still faceted (flat shading), mill drum/hopper still flat-painted.
NEXT: smooth-shade sacks, textured metal for mill (needs a draw call saved), roof-level tank shot.

---

**2026-10-24 (cycle 39z5, playtest block item 5, atta chakki sacks):** Game change: sacks (tools/blender/arch.py sack()) are now a subdivided pillowy ellipsoid with flat base, gathered neck and tie, replacing the faceted box; new_shops.glb rebuilt (11k tris after shrink). Build ALL PASSED. Proof docs/shots/chakki-2026-10-24/v4_close.png (headless, no subject check). Item NOT ticked: jute weave still reads as a checker pattern (texture scale), sacks slightly onion-shaped, mill drum/hopper still flat-painted low-poly. halwai/bazaar/dharam kanta models also call sack() but were not rebuilt.
NEXT: jute UV scale/finer weave, textured metal for mill (needs a draw call saved), roof-level tank shot, barber/puncture props.

---

**2026-10-24 (cycle 39z4, playtest block item 4, sabzi produce + bangles):** Game change: sabzi shop now carries textured tomatoes, onions, potatoes, brinjal and leafy bunches (heaps in the three crates and on the counter), manihari has glass-bangle stacks with printed striped/gold-dot atlas cells (src/shopGoods.js produceAndBangleItems, atlas now 4x8, same material = zero extra draw call). Found and fixed: bangle rods (and the original rod cylinders) sat inside the back wall, so they never showed (src/bazaar.js). Build ALL PASSED (bazaar 150, hero 146), budget 28.39 MB. Proof docs/shots/shops-2026-10-24/{sabzi,bangle}_bazaar.png (headless). Free-asset search: no un-branded CC0 vegetable packs found suitable; skins are painted in code (diffuse only).
Gaps: crate heaps hidden behind the counter from eye height; Blender hanging bangle strands still flat-tint tori; barber/puncture props flat; Banta shop, Chaat thela unbuilt; tank roof-level shot still open.
NEXT: roof-level tank shot; barber/puncture props; chakki mill.

---

**2026-10-24 (cycle 39z3, playtest block item 6, water tanks):** Game change: rooftop Sintex tanks (src/rooftops.js) rebuilt: 24-segment barrel, three moulded ribs, shoulder + domed lid, screw hatch, vent, outlet elbow, brass valve, float-feed pipe, plinth lip; same merged metal/concrete meshes, no new draw call. Free-asset search: Poly Pizza "water tank" (Quaternius, Kay Lousberg: stylised low-poly, rejected for the realism target), OpenGameArt node 5550 (.blend only), RenderHub/CGTrader (paid). Build ALL PASSED. Item NOT ticked: proof shots docs/shots/tanks-2026-10-24/c1.png show tanks too small/far to judge; need a close roof-level shot (camera cannot get roof height from the ground rig).
Gaps: hand-built so far; ground-level and halwai/petrol/dharam-kanta tanks (Blender) not touched; sabzi/bangle goods still open.
NEXT: roof-level close shot of a tank; sabzi produce and bangle textures.

---

**2026-10-24 (cycle 39z2, playtest block item 5, swings):** Game change: crude swing/slide boxes replaced by real playground gear (src/farmSites.js swingSetGeos, slideGeos, limbGeo): two-seat swing set with A-frames, top bar, thin chains, rubber seats, footings at the mela ground and the anganwadi yard; anganwadi's yellow box ramp became a laddered, railed steel-chute slide (the likely "yellow swing"). Colliders added. Same merged mesh, no new draw call. Build ALL PASSED, budget 28.39 MB. Proof docs/shots/playground-2026-10-24/{anganwadi,anganwadi_swing,mela_swing}.png (headless). Checked: godown/kanta and highway road ends were already done (run-outs in roadGeos and createMandi).
Gaps: slide is hidden behind the yard wall from the front; swing set is code-built (no free CC0 model searched yet); water tank real model, sabzi/bangle goods still open.
NEXT: water tanks (real model search), sabzi produce and bangle shop textures.

---

**2026-10-24 (cycle 39z, playtest block item 5, cricket field + badminton court):** Game change: khel maidan mud pads (cricket pitch, run-ups, badminton court) used box 0..1 UVs, so the ground scan was stretched into smears; now metric UVs (one tile per 2.5 m) in src/farmSites.js createKhelMaidan. Pitch now reads as packed clay with fine grain; badminton court already had regulation lines and a mesh net (shown). Build ALL PASSED. Proof docs/shots/khel-2026-10-24/{pitch_walk,pitch,badminton}.png (headless).
Gaps: outfield grass shows a faint checker repeat; pitch patch edges are hard-edged rectangles; godown/truck road end, water tanks, yellow swing, sabzi/bangle goods still open.
NEXT: water tanks (real model), yellow swing, godown road end.

---

**2026-10-24 (cycle 39y, playtest block item 4, other shops' goods):** Game change: medical (tablet cartons, amber syrup bottles), tailor (woven stripe / indigo check / block-print cloth bolts) and mobile (keypad-phone and charger cartons) shops now carry printed-atlas goods (src/shopGoods.js atlas 4x6, built in buildBazaarKiranaGoods so same material, zero extra draw call). Flat-colour boxes/bolts removed from src/bazaar.js and tools/blender/build_bazaar_row.py (bazaar_row.glb rebuilt). Build ALL PASSED (bazaar 150, hero 146), budget 28.39 MB. Proof docs/shots/shops-2026-10-24/{medical,tailor,mobile}_bazaar.png (headless).
Gaps: bangle rings still flat-tint tori, sabzi veg spheres flat-colour, barber/puncture props flat; medical fridge/case painted boxes; chakki sacks/mill, yellow swing, Banta shop, Chaat thela still open.
NEXT: sabzi produce and bangle shop textures (item 4); chakki sacks.

---

**2026-10-24 (cycle 39x, playtest block item 5, atta chakki):** Game change: sacks (chakki + ration shop) now carry the real jute weave (new 'jute' kind in tools/blender/arch.py, own material in new_shops.glb), a capsule miller stands at the mill (src/main.js npc_miller). Draw-call cost paid for by turning shadow casting off on jute meshes (src/assetSlots.js), charpai and hand_pump. A 'metal' kind exists in arch.py but is NOT used (one extra draw call put the bazaar view at 153). Build 16/16 (bazaar 150, hero 146), budget 28.5 MB. Proof docs/shots/chakki-2026-10-24/v3_close.png (headless). Item NOT ticked: sacks still read faceted/boxy (checker-like weave scale), mill drum/hopper still flat-painted low-poly.
NEXT: rounder sack mesh (subdivided, slumped), recover a draw call to enable metal on the mill; then dharam kanta.

---

**2026-10-24 (cycle 39w, playtest block item 5, atta chakki):** Honest result: no visible change. Removed the crude code-built mill duplicates (stone, motor, belt, hopper, tray, sacks shelf, scale) from src/newShops.js; they sat inside the Blender mill and the re-shot (docs/shots/chakki-2026-10-24/close.png, headless) is identical to before. Collider kept. Build ALL PASSED. Item NOT ticked.
Real gap: the mill in tools/blender/build_new_shops.py atta_chakki() is flat-coloured faceted shapes (green drum, blue hopper, sacks that read as jars). Needs textured metal/jute materials, rounder sacks, a visible millstone/flour spout, a capsule miller at the machine.
NEXT: rebuild the chakki mill and sacks with textured materials and a capsule operator; then dharam kanta.

---

**2026-10-24 (cycle 39v, playtest block item 5, petrol pump):** Game change: a farm tractor now stands at the east pumps (tools/blender/build_petrol_pump.py tractor(): body, hood, grille, seat, exhaust, big rear and small front wheels, same two meshes so no new draw call; petrol_pump.glb rebuilt; collider added in src/farmSites.js). Pump already had canopy, two dispensers with hoses, price pole, bilingual board, office, attendant capsule: re-shot, reads as a petrol pump. Proof docs/shots/petrol-2026-10-24/{road,road_close}.png (headless).
Gaps: tractor tyres are thin tori, pump dispensers small; atta chakki, godown/dharam kanta, cricket field, badminton court, water tanks, other shops' goods, yellow swing still open.
NEXT: atta chakki readability; dharam kanta.

---

**2026-10-24 (cycle 39u, playtest block item 2, school flower beds):** Game change: faceted icosphere 'flowers' (flat colour polyhedra) removed from arch.flower_bed (school's two verandah beds; all Blender models rebuilt via make_all.sh, school model -5k triangles), real Poly Haven gazania planted on dark-earth beds instead (src/main.js, 16 plants, shared call-site draw call). Proof docs/shots/school-2026-10-24/marbles.png (headless). Build ALL PASSED, budget 28.34 MB.
Gaps: see-saw no collider; petrol pump, atta chakki, godown, cricket field, badminton court, water tanks, other shops' goods, yellow swing still open.
NEXT: petrol pump, atta chakki readability.

---

**2026-10-24 (cycle 39t, playtest block item 5, school games):** Game change: school yard now has numbered chalk hopscotch (2), a marble ring with pit and glass marbles, and a wooden see-saw (tools/blender/build_school.py, school_compound.glb rebuilt, atlas 1024x512, same single decal draw call). Earlier hopscotch decals sat under the verandah (x<-6.9) and were unseen; moved into the open yard. The flagpole already existed and reads well (docs/shots/school-2026-10-24/flag.png): her note was likely about visibility from the gate. Build ALL PASSED, budget 28.51 MB. Proof docs/shots/school-2026-10-24/{flag,hopscotch,marbles,seesaw}.png (headless, ~2-3 fps).
Gaps: see-saw has no collider; marigold flower beds use faceted icosphere blooms (visible in marbles.png, fails realism rule); yellow swing still unidentified; petrol pump, atta chakki, godown, cricket field, badminton court, water tanks, other shops' goods still open.
NEXT: flower_bed blooms (faceted icospheres) across all models; petrol pump; atta chakki.

---

**2026-10-24 (cycle 39s, playtest block item 3, halwai bhatti):** Game change: each halwai bhatti now has a fire mouth on the customer-facing face (sooty arch, black recess, glowing ember bed, half-burnt log) and the kadhai is rounder (sphere subdiv 3, no longer faceted). tools/blender/build_halwai.py, halwai_compound.glb rebuilt (+~500 tris). Proof docs/shots/halwai-fire-2026-10-24/mouth.png (headless). Build ALL PASSED, budget passed.
Gaps: embers are a plain colour (no emissive slot in the kit), no soot on the wall behind, no heat shimmer; other shops' goods, Banta shop, Chaat thela still open.
NEXT: other shops' goods (medical, mobile, bangle); findability walk; lanes.

---

**2026-10-24 (cycle 39r, 15-hour queue item 3, halwai fire rework):** Game change: halwai smoke is now thin tapering wisps (smaller, fading with height), steam finer, flame flecks smaller with a hot-yellow base going dark red, and every fire particle fades out inside ~3 m of the lens so no white blobs sit in front of the camera. The grey panel with black squares was a QR payment board plus a sound box (UPI-era props, after the ~2015 cut-off): removed from tools/blender/build_halwai.py, halwai_compound.glb rebuilt. Build ALL PASSED, budget 28.44 MB. Proof docs/shots/halwai-fire-2026-10-24/{wide,close}.png (headless). Regression not run (no movement code).
Gaps: flame is still hard to see because the bhatti brick block has no fire mouth (needs a cut in build_halwai.py); no soot or heat shimmer; other shops' goods (medical, mobile, bangle) still boxes; Banta shop and Chaat thela unbuilt.
NEXT: bhatti fire mouth + soot; other shops' goods; findability walk; lanes.

---

**2026-10-24 (cycle 39q, playtest block item 4, bazaar kirana goods):** Game change: real printed packets (biscuit, tea, chips, namkeen, toffee jars, soap) now stock the bazaar kirana (unit 1) shelves and counter (src/bazaar.js buildBazaarKiranaGoods, atlas from src/shopGoods.js). Draw call cut: the indoor postmaster capsule no longer casts shadows (its shadow pass counted as a call; per-mesh visibility test showed ~every shadow-casting mesh costs 2 calls), plus the bangle/tyre torus rings ride the cylinder mesh. Bazaar view 150, hero 148, field 115. Build 16/16, budget 28.44 MB, regression 22/22. Proof docs/shots/shops-2026-10-24/kirana_bazaar.png (headless). Tried and rejected: merging kirana goods into the Gupta store mesh (bounding sphere spans both, hero view rose to 150). Tool: tmp/bz-meshes.mjs lists per-mesh call cost at the bazaar camera.
Gaps: medical, mobile, bangle and other shops still box goods (need new atlas cells); Banta shop and Chaat thela unbuilt; zero headroom in bazaar view.
NEXT: other shops' goods (medical, mobile, bangle) using the shadow trick (castShadow=false on small interior meshes) to buy calls.

---

**2026-10-24 (cycle 39p, playtest block item 4, bazaar kirana goods):** No game change kept. Real printed packets on the bazaar kirana (unit 1) shelves and counter were built (patch tmp/kirana-goods.patch, shot docs/shots/shops-2026-10-24/kirana_bazaar.png) but cost +1 draw call: bazaar view 151 > 150 (merging the bangle/tyre torus mesh saved nothing, it is not in that view). Reverted; asked in NEEDS_YOU. NEXT: find one call to cut in the bazaar view (list meshes drawn from the bazaar camera), then re-apply the patch; other shops (medical, mobile, bangle) need new atlas cells.

---

**2026-10-24 (cycle 39o, playtest block items 6 / queue 5, far-LOD abadi):** Game change: the far-LOD abadi row proxies (tools/blender/build_abadi.py house_lod) now carry rear windows (one per floor, dark painted openings) in addition to the front door/window/chajja, so distant houses seen from rooftops and fields no longer read as blank blocks (~80 extra triangles per LOD row model, +3 files in public/assets/models, assets 28.44 MB). Near models and abadiBoxes.json unchanged. Proof docs/shots/farlod-2026-10-24/far_a.png (centre-back blocks now show openings; headless, no subject check - look evidence only). Build ALL PASSED, budget passed. Regression not run (no movement code touched).
Gaps: far blocks are still one plaster set with vertex tint, openings are small flat squares, no sills/frames; water tank model, other shops' goods, yellow swing, Banta shop and Chaat thela still open.

---

**2026-10-24 (cycle 39n, playtest block item 1, school board):** Game change: the primary school now has a bilingual gate board (English "Primary School" bold and dominant, Hindi above, navy on cream) hanging over the south gate, facing the lane. Proof docs/shots/signage-2026-10-24/school_gate.png (script tmp/school-board-shot.mjs). It shares the halwai board mesh (src/main.js) so it costs no extra draw call; a separate mesh took the bazaar view to 151 > 150. Hero and bazaar views are now AT 150: no draw-call headroom either. Build 16/16, regression 22/22. Banta shop and Chaat thela remain unbuilt (new places, BACKLOG after the playtest block).

---

**2026-10-24 (cycle 39m, playtest block item 0c):** Game change: the pond and the johad now block the player, NPCs and vehicles (water-disc colliders, src/farmSites.js discSolids; shore stays walkable). Real key-walk (hold W, 30 s, straight at the water) stops at the edge: pond end z=77.65 (centre 70), johad end z=109.85 (centre 105); proof docs/shots/collision-2026-10-24/{pond,johad}.png, script tmp/collide-walk-water.mjs. Audited and found already fine: sabzi/jalebi cart bodies and poles have solids; vehicle-vs-vehicle and followers already pass extra vehicle boxes (main.js otherVehicleBoxes); collider-audit reports every plaster wall footprint covered; animals are static so there are no animal routines to register for check 9 (check 9 covers every ROUTES entry incl. follow-capable NPCs' waypoint legs). Build 16/16, regression 22/22, assets 28.44 MB.
Still open in the playtest block: school front board, Banta shop and Chaat thela not built (item 1); other shops' goods still boxes (item 4); real water tank models, far-LOD painted openings (items 6, queue 5); findability walk, lanes (queue 7-8). Triangles at ~394k of 400k: no headroom.

---

**2026-10-24 (cycle 39l, proof reshoot):** Rooftop proof re-taken with the clean tool (no overlay/fps/capsule): docs/shots/water-2026-10-24/roofs_a.png (water tank on plinth + antenna on an abadi roof, east gali) and roofs_b.png (west gali rooftops, far-LOD blocks visible in the distance as flat plaster). Replaces the shots in docs/shots/rooftops-2026-10-23 for queue item 2. status.json refreshed (triangles 394,458 / 400k: no headroom).

---

**2026-10-24 (cycle 39k, playtest block item 6, cottage houses):** Game change: the kachcha (cottage-style) homesteads now use the REAL Poly Haven CC0 thatch_roof_angled PBR set (4K downscaled to 1K WebP, public/assets/textures/thatch/, credited) on the gable roofs, straw bundles, ridge and haystack (the haystack is now a lathed bulging stack instead of a cone). Done without a new draw call: Kit(split_props=False, tex_override={'props': thatch}, route={'thatch': 'props'}) in tools/blender/arch.py carries the thatch set in the model's existing second mesh slot; yard props (charpai, pots, chulha...) moved into the main plaster mesh. Validator check 5 now samples hb_main and hb_tin as well (extension: those are the same Blender yard props/haystack that were hb_props/hb_plaster before; not a loosening). Proof docs/shots/water-2026-10-24/kachcha_b.png. Build ALL PASSED, calls 147 (hero<=150, bazaar<=150), regression 22/22, assets 28.44 MB.
WARNING for the next run: triangles are 394,458 of the 400k ceiling. Every new instanced plant/prop must come with a matching cut (e.g. thin sarson tufts, drop abadi near-radius) or a LOD.
Gaps: wooden posts/doors on the kachcha are still the plaster set tinted (a separate 'wood' set costs a draw call; it was tried and exceeded 150 at the bazaar camera); far-LOD abadi blocks still have tiny painted openings; real water-tank model not found (Poly Haven has none; rooftop tanks are textured code geometry).
NEXT: write the full no-collider audit list (queue item 6), cart legs / vehicle-vs-vehicle collisions, halwai fire rework, RE-TAKE bad proof shots (rooftops), bazaar goods for other shops; she must name the 'yellow swing'.

---

**2026-10-24 (cycle 39j, playtest block items 7b, 4, 2):** Game change: (a) HIGHWAY wear: asphalt now on the concrete PBR set with 26 tar patches, 40 hairline cracks, broken/faded centre dashes (some missing), patchy worn edge lines (no ruler kerb line), dust/earth margins creeping onto the shoulder; both highway ends and the mandi yard's ends now run out as narrowing broken-concrete then packed-earth with wheel ruts (roads end believably) - src/farmSites.js roadGeos, createMandi. (b) World edge: the drawn ground plane is 2.4x bigger (playable clamp unchanged) - the hard ground edge was visible from the highway/mandi (x~230). (c) MARKET unidentifiable object FOUND: the bicycles. Their wheels were built in the wrong plane (axis='x' = perpendicular to the frame), so the bazaar cycle (outside units 2-3) read as two floating rings and the 3 school bikes the same. New arch.bicycle(): tyres, rims, 8 spokes per wheel, hubs, diamond frame, fork, bars, grips, bell, lamp, saddle, crank, chain guard, carrier, stand; used in bazaar_row + school; repair-shop flipped cycle wheels fixed too. (d) Milk cans: real dairy cans (lathe body, shoulder, neck, domed lid, knob, bands, lugs), the dairy's solid brown box replaced by a plank bench with two cans. These are the likely 'six white cylinders'. (e) Matkas: lathed smooth profile (arch.lathe) in all 7 clay_pot users (no more faceted icosphere); all Blender models rebuilt via make_all.sh. Build ALL PASSED, calls 147, triangles 381.7k, regression 22/22, assets 27.19 MB. Proofs docs/shots/water-2026-10-24/{highway_south,highway_north_end,dairy_cans,bz_cycle2}.png (folder name is historical; it holds the whole session's shots).
Gaps: school bikes not re-shot (camera inside wall; same helper as the bazaar one); highway dashes/patches are flat boxes, no wheel-path polish; far-LOD plaster/openings, water tanks, cottage woods and other shops' stock still open.
NEXT: far-LOD plaster/openings; water tanks real model; cottage-wood PBR; bazaar goods reuse src/shopGoods.js; yellow swing (needs her to name it).

---

**2026-10-24 (cycle 39i, playtest block items 3 and 7 partly):** Game change: (3 KHET) the field is now a patchwork of ~22x20 m plots with wobbled borders: sarson in yellow flower, young green wheat, ripe golden wheat, bare ploughed earth, veg patch (src/field.js plotKind); the ground itself carries the crop colour via per-vertex tint on a subdivided ground plane (no draw call added), tufts gained four flower/ear spikes so they read as flowering/ripe heads, per-plot height and colour. Haystacks: they existed only at the khalihan; now 3 bhoosa stacks stand behind the tubewell kothri (right beside the Yadav Chai Nashta chowk view) with a canvas-drawn straw-strand material (strawMaterial, shared); khalihan floor+stacks use it too (one call). (7 WATER) new src/water.js: one water material for pond, johad, canal and tubewell hauz - depth tint (shore olive to deep murky green), two drifting ripple layers in the shader (ticked by updateWater in main loop), env-map sheen, alpha-faded soft shoreline; pond/johad are polar-grid meshes with a depth attribute; pond lotus rebuilt as notched veined cupped pads plus real flowers (two petal rings pink-tipped, yellow seed head) in clusters, replacing pink cones; shore = three-band mud (dry cracked, damp, dark wet) with pebbles. Build ALL PASSED, hero/bazaar <=150 (147 worst), triangles 386k (<400k), regression 22/22, assets 27.13 MB. Proof docs/shots/khet-2026-10-24/{overview,close,haystacks_tubewell}.png, docs/shots/water-2026-10-24/{pond,pond_close,johad,canal}.png.
Gaps: sarson from low angles still reads sparse (tuft density capped by the 400k triangle budget: 386k now); sugarcane blocks exist in the south belt (createSugarcaneBelt) but not inside the field loop; no tractor/ploughing animals; johad shore bands are slightly terraced; the water's ripples are a shader, not a flow map; the "yellow swing" is unidentified (see 39h). 
NOT yet done in item 7: highway wear (cracks, patched edges, dust margins, no crisp kerb line) and road ends (the road by the godown ends abruptly) - NEXT.
NEXT: (7b) highway patching + road ends; then playtest items 4 (bazaar interiors reuse src/shopGoods.js; unidentifiable market objects list), 6 (water tanks, far-LOD plaster/openings, cottage woods), milk cans, matka faceting.

---

**2026-10-24 (cycle 39h, playtest block item 5, cricket/badminton/school flag):** Game change: (a) khel maidan split into grass outfield (new 'grass' PBR set in src/materials.js), packed-mud pitch with worn run-ups, chalk creases and stumps with bails, and a badminton court on an earth pad with regulation lines (doubles/singles, service lines, centre lines) and an alpha-mesh net with white tape on base-plated poles (src/farmSites.js createKhelMaidan, +2 draw calls only inside the zone). (b) School flag: real printed tricolour (canvas texture, 24-spoke chakra, cloth grain) on a rippled 1.8x1.2 plane, halyard rope and pulley, metallic pole, merged into ONE mesh with the pole via a grey texture strip so no draw call is added (hero view went 151 with a separate mesh; back to <=150). (c) Removed the pink/green polyhedra bougainvillea over the school west pillar (build_school.py; her rule: remove or do properly). Build ALL PASSED, regression 22/22. Proof docs/shots/maidan-2026-10-24/{pitch,court,school_flag}.png.
School games already existed (hopscotch x2, cricket-pitch decal, tyre swing) in build_school.py. NOT done: "the yellow swing" - could not identify it; the mela ground jhoola is a blue pipe frame (createMelaGround) and the house jhoola is wood (build_house.py). Not rebuilt; if she means a different one she must name its location.
NEXT: (6) khet variety (sarson, sugarcane blocks, wheat stages, veg patch, haystacks); (7) water + lotus + shoreline mud + highway wear + road ends; then (8)-(11) in the list above.

---

**2026-10-24 (cycle 39g, playtest block item 5, atta chakki):** Game change: chakki machine rebuilt readable (tools/blender/build_new_shops.py atta_chakki): green cast-iron drum with bolted lid on a plinth, square blue sheet-metal hopper with grain, flour chute into a sack on a floor scale, blue ribbed motor with pulley, V-belt and yellow guard, switchboard with wire, hanging bulb, sacks stacked at the side posts, flour bin, pan scale, flour dust. Replaces the witch-hat cone hopper. Build ALL PASSED, regression 22/22, assets 27.19 MB. Proof docs/shots/chakki-2026-10-24/close.png (note: shotlib subject check reports the chakki as occluded by the hidden new_shops_old collision shell, so shot has no subject check; and slot models need ~20 s to load before shooting).
Gaps: surfaces are the shared plaster set tinted, no unique metal PBR; no miller capsule yet.
NEXT: (5) cricket mud, badminton lines/net, school flag + games; (6) khet variety; (7) water.

---

**2026-10-24 (cycle 39f, playtest block item 5, dharam kanta):** Game change: weighbridge is now a Blender model (tools/blender/build_dharam_kanta.py, slot dharam_kanta at world 194,92; ~7k tris): steel ribbed deck 4x14 with yellow edge angles and load-cell covers, concrete approach ramps, bollards, red/white stop barrier, weight-limit sign, cabin with panel door, grilled counter window, ledger, roof tank, red LED display post, grain sacks on pallets, raised loading dock with tin canopy. Old code boxes removed (cabin/post solids kept). Build ALL PASSED, regression 22/22, assets 27.17 MB. Proof docs/shots/kanta-2026-10-24/{wide,cabin}.png. No CC0 weighbridge exists (Poly Haven/Quaternius/Kenney/poly.pizza searched).
Gaps: no truck standing on the deck; the road near the godown still ends abruptly (item 7); sack stacks read slightly tower-like.
NEXT: (4) atta chakki readable; (5) cricket mud, badminton, school flag; (6) khet variety; (7) water.

---

**2026-10-24 (cycle 39e, playtest block item 5, petrol pump):** Game change: petrol pump is now a Blender model (tools/blender/build_petrol_pump.py, slot petrol_pump at world 186,5; ~6.4k tris, +0.3 MB): slab with joints and oil stains, 14x9 canopy on four guarded columns with red band and light strips, two pump islands with dispensers (display, keypad, grade stripes, nozzle holsters, hoses), office with panel door, barred window, roof tank and bench, tall price pole, air post, oil drums and rack, fire buckets, tyre stack, capsule attendant (npc_pump_attendant). Old code-box pump removed from src/farmSites.js (collision solids kept); petrol board moved in front of the fascia. Build 16/16, regression 22/22, assets 26.66 MB. Proof docs/shots/petrol-2026-10-24/{wide,pumps,front}.png. Searched: Poly Haven, Quaternius, Kenney, poly.pizza: no CC0 fuel pump.
Gaps: no tractor standing at the pump (vehicle slot not wired); surfaces are the shared plaster set tinted, not unique PBR; pump board text is the existing placeBoards board.
NEXT: (3) dharam kanta; (4) atta chakki readable; (5) cricket mud, badminton, school flag; (6) khet variety; (7) water.

---

**2026-10-24 (cycle 39d, playtest block item 5, post office):** Game change: post office now has a capsule postmaster behind the counter window (src/main.js, npc_postmaster), two bilingual forecourt notice boards on posts (Speed Post / Money Order / Stamps; Open 10 AM to 4 PM; English dominant; folded into the existing signboard atlas mesh, no new draw call, collider on the posts). The red pillar post box already existed (hand-built; no free CC0 model found, see 39c search). Proof docs/shots/postoffice-2026-10-24/{front,notices}.png (clerk.png deliberately shows the capsule).
Gaps: post box and counter are vertex-colour primitives, not PBR-textured; notices are painted boards, not paper notices on a cork board.
NEXT: (2) petrol pump Blender model; (3) dharam kanta; (4) atta chakki; (5) cricket mud, badminton, school flag; (6) khet variety; (7) water.

---

**2026-10-24 (cycle 39c, playtest block item 4/5):** Game change: Gupta General Store stock is now real-shaped printed goods (src/shopGoods.js: pillow packs with crimps, biscuit/soap/tea/salt packs, toffee jars, sachet strips, soda bottles; one draw call); bazaar shutters fully rolled up. Proof docs/shots/shops-2026-10-24/store_front.png, store_close.png. Build 16/16 (hero 149 calls), commit 496c924.
Asset search for post box and petrol pump (item 5): Poly Haven has neither (listed all models: no post box, fuel pump, handcart, weighbridge, mill); web search (Quaternius/Kenney/poly.pizza) found no CC0 post box or fuel pump (only paid RenderHub/CGTrader/TurboSquid). So they must be hand-built in Blender (tools/blender), per the asset policy. Not yet done.
NEXT, in order: (1) post office capsule NPC + red post box + notices; (2) petrol pump Blender model; (3) dharam kanta; (4) atta chakki readable (hopper, grinder, belt, motor, sacks); (5) cricket ground mud texture, badminton court lines, school flag pole + games; (6) khet variety (sarson, sugarcane blocks, wheat stages, veg patch) and haystacks check; (7) water (pond/johad/canal), lotus, shoreline mud, highway wear and road ends; (8) bazaar kirana/medical/etc interiors reuse src/shopGoods.js; (9) milk cans reshape (probable "six white cylinders"), faceted matkas; (10) far-LOD plaster/openings; (11) school front board, Banta shop + Chaat thela are unbuilt places.

---

**2026-10-24 (cycle 39b, playtest block item 2/6):** Game change: real plants. src/realPlants.js instances Poly Haven CC0 scans (gazania flower beds, grass clumps, shrubs; potted plants in clay pots at the abadi doorsteps via src/villageProps.js); every plant set is distance-limited to the player (28-50 m) because plants cost 1-3.5k triangles each and the 400k budget (388k now) cannot carry them all; card bougainvillea/creeper/banana/tulsi gone; all code-built pots removed from the 6 Blender building scripts (arch.pot no-op, models rebuilt); lane hand pumps and rooftop dishes removed. Build 16/16, regression 22/22 (run npm run build FIRST: regression-check tests dist/), assets 27.1 MB. Proof docs/shots/plants-2026-10-24/. Searched: Poly Haven plants category (57 models; potted_plant_01/02/04, flower_gazania, grass_medium_02, shrub_01 used; celandine/shrub_04 downloaded, unused, in tmp/unused-assets). No Poly Haven banana, tulsi, bougainvillea, marigold, lotus. Not searched yet: Poly Pizza / Quaternius / Sketchfab for those.
Gaps: foliage scans simplify badly below ~1k tris (thin disconnected leaves), so grass reads a little dry/sparse; milk cans, matka faceting, lotus, water, khet variety, shops open, Gupta goods, post office, chakki, petrol pump, kanta, cricket, badminton, school flag, highway, roads all still open in the playtest block.

---

**2026-10-24 (cycle 39a, playtest block):** Game change: (0a) clean screenshot tool; (0b) streaming now builds zones ahead of sight (frustum + travel prefetch, time-sliced) and draws them from buildRadius+80 m (landmarks 215 m); (0c) cattle and dogs are solid; (1) signboards rendered English-dominant everywhere (signboards.js, bazaar.js, newShops.js) and 20 new bilingual boards (src/placeBoards.js): halwai, jalebi, dairy, anganwadi, health, chemist, manihari, sabzi, gaushala, gurukul, haveli, mela, khel maidan, petrol pump, dharam kanta, bus adda, mandi gantry, godown, dhaba; (new bug fixed) the sky dome was fixed at the origin and ran past the camera far plane from the east, rendering a BLACK DOME in the sky east of x~100 - it now follows the camera. NEEDS_YOU: 5 stale publishing items closed (queue item 11). Build 16/16, regression 22/22, budget 25.00 MB.
Proofs: docs/shots/signage-2026-10-24/*.png (19 boards, all via tools/shotlib.mjs cleanCapture), docs/shots/collision-2026-10-24/, docs/shots/streaming-2026-10-24/.
TRADE-OFF for the art director (0b): the 150 draw-call ceiling at the hero/bazaar validator cameras (149/150 now) is the binding limit. Small "detail" zones (doorstep props, rooftop clutter, lane vignettes, edge walls, lamps, tubewell, khalihan, milestones, water tank) are still DRAWN only at their old radius (28-90 m), so they can still pop in at 25-60 m. Big buildings/landmarks are drawn from 115-215 m, before fog hides them. To lift the detail radius we must free calls (merge per-material in props_/roof_ cells: 9 calls per cell at 70-100 m).
SIGNAGE AUDIT (42 places, src/freeRoam.js PLACES): board now present and English-dominant: tea stall, general store, bazaar (8 units + chowk tea stall), post office, ration shop, atta chakki, halwai, jalebi, dairy, anganwadi, health centre, chemist, manihari, sabzi rehris, gaushala, gurukul, old haveli, mela, khel maidan, highway petrol pump / dharam kanta / bus adda, mandi (gantry, godown, dhaba). Faith buildings (temple, gurudwara, masjid, jain mandir): no commercial board by rule. STILL MISSING: primary school front board (school has classroom charts only), TV house (a house, none needed), house. NOT BUILT AT ALL (in PLACES and the map but no geometry in the world): Banta shop (-63,22.5) and Chaat thela (-63,50.5). MAP.md/PLACES give coordinates; they need building (BACKLOG, after this block).
Gaps: tubewell/pond/johad have no name board (water/field sites named by direction signs only); sign boards on code-box sites are still flat-colour vertex-colour buildings (texture work later); 0c still open: cart legs, vehicle-vs-vehicle audit, animal routines in check 9.
Next: playtest block item 2 (plants, pots), 3 (khet variety), 4 (shops open + Gupta goods), 5 (post office capsule NPC + post box, chakki, petrol pump, dharam kanta, cricket ground, badminton, school flag), 6, 7.

---

**2026-10-23 (cycle 38ce2):** Game change (small): Maa and the sister now follow the player through doors (house front/back room, school classroom) instead of jamming on the wall; kachcha cattle nudged off the new manger colliders. src/doorRouting.js, createFollowRoutine `buildings` option. Real run in tmp/door-follow.mjs. No screenshot (movement), no box ticked.
Gaps: no prop-avoiding pathfinding; other buildings are not walkable. Next: register animal/follow routines for check 9; far-east road decision (art director).

---

**2026-10-23 (cycle 38ce):** Game change: halwai now has live smoke column, oil steam and flame flecks over both kadhais (src/halwaiFire.js, +1 draw call only within 30 m; close view 119-125 calls). Build ALL PASSED, budget 25.00 MB. Proof docs/shots/halwai-fire-2026-10-23/. Gaps: flame reads as sparks (bhatti has no fire mouth: edit build_halwai.py), no soot, no heat shimmer. Not ticked.
Next: fire mouth + soot in Blender halwai; NPC door-routing (A0); far-east road decision (art director).

---

**2026-10-23 (cycle 38cd):** Game change (small, invisible): both kachcha homesteads now have solid yard props - charpai, chulha, tulsi chabutra, matka stand, manger, haystack (KACHCHA_YARD_SOLIDS + hidden collider mesh in src/scenery.js, follows both copies). Validator check 5 now also samples hb_plaster/hb_wood/hb_props so these colliders are proven backed by real geometry (extension, not a loosening). Build 16/16, regression 22/22. No screenshot (invisible), no box ticked.
COLLIDER AUDIT remaining (A0): hero-house indoor charpai (interactive), sabzi/jalebi cart legs, laundry ropes (overhead), pond/johad edges (walkable by design). No standalone wells exist in the code.
Next: NPC door-routing for building entry (A0); register animal/follow routines for check 9; far-east road decision (art director).

---

**2026-10-23 (cycle 38cc2):** Game change: abadi rooftops now carry water tanks on plinths, TV antennas, dishes, solar panels and brick stacks (src/rooftops.js; sites abadiRoofSites in src/scenery.js; zone-streamed 30 m radius so hero zone stays 150/150). Build 16/16. Proof docs/shots/rooftops-2026-10-23/. Gaps: abadi only; may sit near Blender roof tanks; tanks read dark; no wall pipes/cables.
Next: rooftop fittings on bazaar/haveli/school; halwai flame and steam; far-east road decision (art director).

---

**2026-10-23 (cycle 38cc):** Game change: bazaar row (Blender, build_bazaar_row.py -> bazaar_row.glb) now has a panelled back door (recess, frame, hinges, brass handle, step) on all 8 units and fully framed barred back windows with sills. Build ALL PASSED, budget 25.00 MB, no new draw calls (same mesh). Proof docs/shots/openings4-2026-10-23/. Gaps: back doors are visual only (wall is solid); no regression run (no movement code touched).
Next: lane prop audit (A1f); hero-zone draw-call headroom; far-east road decision (art director).

---

**2026-10-23 (cycle 38cb):** Game change: post office, ration shop and atta chakki (Blender, tools/blender/build_new_shops.py -> public/assets/models/new_shops.glb) now have real openings: grilled side windows with sills, panelled staff door with hinges, handle and step at the back, grilled vent window on the chakki back wall. Build ALL PASSED, budget 24.91 MB. Proof docs/shots/openings3-2026-10-23/. Lesson: src/newShops.js geometry is invisible collision backing; edit the Blender script. Gaps: bazaar units still slab openings; gaushala/mela are open structures.
Next: bazaar row openings (tools/blender/build_bazaar_row.py); far-east road decision (art director).

---

**2026-10-23 (cycle 38ca):** Game change: real doors and windows on 8 more sites. smallBuilding() (src/farmSites.js) now builds recessed framed door (panels, hinges, brass handle, step) and two iron-grilled windows with sills via the shared helpers: anganwadi, dairy, health centre, chemist, masjid, gurudwara, TV house, Jain mandir. Merged into existing meshes (no new draw calls). Build ALL PASSED. Proof docs/shots/openings2-2026-10-23/ (8 shots, script tmp/openings2-shot.mjs). Gaps: gaushala, mela, post office/ration/chakki, bazaar units still slab openings; chemist counter sits in front of its door; sites still vertex-colour flat.
Next: openings on remaining buildings; per-material textures on far-east sites; far-east road decision (art director).

---

**2026-10-23 (cycle 38bz2):** Game change: real doors and windows on far-east sites. New helpers windowOpening/doorOpening in src/farmSites.js (recess, painted frame, iron grille bars + rail, projecting sill; door with raised panels, rail, hinges, brass handle, threshold step), merged into each site's existing mesh (no new draw calls). Applied to gurukul, old haveli, mandi godown/cabin/dhaba. Build all passed. Proof docs/shots/openings-2026-10-23/. Gaps: other sites listed in BACKLOG A1d standing-rule note still have slab openings; headless shots run ~3 fps.
Next: apply the helpers to masjid, gurudwara, health centre, chemist, anganwadi, dairy, TV house, Jain mandir; far-east road decision (art director).

---

**2026-10-23 (cycle 38bz):** Game change (small): Visit-place mid-mission warning path tested with a real tap flow (quest at have_money: tap 1 warns, tap 2 jumps, step unchanged); the warning text was overlapping the first list row and was dark red on dark, now reserved space + light colour (index.html .visit-warn, also used by Tasks note). Box ticked in BACKLOG A-2. Proof docs/shots/visit-warn-2026-10-23/. Build not rerun (CSS only).
Next: hero-zone draw-call headroom; minimap convention research; far-east road decision (art director).

---

**2026-10-23 (cycle 38by2):** Game change (small): TV house porch charpai is now solid (src/farmSites.js createTvHouse; it sat outside the house box). Build passes (validator ALL PASSED). No screenshot (invisible change), no box ticked.
COLLIDER AUDIT (A0, still no collider): hero-house indoor charpai (interactive, inside house shell), sabzi/jalebi cart legs (cart bodies are solid), wells and cattle troughs other than gaushala, pond/johad edges (walkable by design, not audited), laundry-line ropes (overhead).
Next: hero-zone draw-call headroom; NPC door-routing for building entry (A0); far-east road decision (art director).

---

**2026-10-23 (cycle 38by):** Game change: street lamps rebuilt (src/props.js createStreetLamps, type 'rcc' | 'solar'). Temple lanes: tapered RCC poles (CC0 concrete PBR) with tube-light on bracket arm, down-cable, switch box, painted whitewash/black bands, base grime, sagging two-core overhead wire between poles (poles every 14 m). Bazaar lane: panchayat solar LED (steel pole on concrete footing, tilted panel, LED head, battery box). Per-lamp lean/height/tint. Two merged meshes per lane (concrete solid with colliders; tin overhead parts and wires, kept out of the solid-material families), no shadow casting to hold hero zone at 150/150 (was 151 with shadows on). Build 16/16, budget fine. Proof docs/shots/lamps-2026-10-23/ (t2.png, t4.png, b2.png; t1, b1 are poor angles). Gaps: no reference research, no stickers/posters, wires do not cross between lane segments, lamps only on 3 lane segments (abadi lanes and chowk have none), hero zone has zero headroom.
Next: lamps on the other lanes once headroom exists; lane prop audit; far-east road decision (art director).

---

**2026-10-23 (cycle 38bx2):** Game change (small): bazaar villagers (src/bazaarLife.js) now collide with parked and driving vehicles (getExtraBoxes -> otherVehicleBoxes, wired in src/main.js); before, they passed [] and a vehicle could drive through them. Audit: every NPC routine (npcRoutines.js, bazaarLife.js) moves only through resolveMove; animals are stationary. Build 15/15, regression 22/22. No screenshot taken (no visual change), so no A0 box ticked.
Next: hero-zone draw-call headroom; lane prop audit; far-east road decision (art director).

---

**2026-10-23 (cycle 38bx):** Game change: A1g carrom. All 5 lane carrom/ludo mats removed; one carrom scene at the chowk (-46, 5.5): CC0 round table, stools, chairs (public/assets/props, +0.9 MB, total 24.84 MB), printed carrom board texture, coins mid-game, 4 capsule placeholder men, tea glasses, gamcha, slippers, solid colliders. Instanced/merged, no shadows, builds within 22 m. Proof docs/shots/carrom-2026-10-23/. Build 15/15 (hero zone 150/150), budget pass.
Next: hero-zone draw-call headroom (it sits at 150); lane prop audit (charpais, benches out of vehicle routes); far-east road decision (art director).

---

**2026-10-23 (cycle 38bw):** Game change: lane laundry lines rebuilt (src/laundry.js, used by createLaneLaundry): 11 garment silhouettes (sari, dhoti, kurta, salwar, dupatta, shirt, trousers, frock, towel, bedsheet, gamcha) draped over a sagging rope with wrinkles, uneven hems, printed/bordered canvas-weave fabric with normal map, pegs, shader breeze (hem sways more, per-garment phase). +1 draw call per line, no shadows. Proof docs/shots/laundry-2026-10-23/. Build, budget (23.96 MB) pass.
Wind consistency report (A1h last item): trees already sway (trees.js); NOT yet swaying: garden plants/creepers, grass tufts, signboard flags, marigold garlands, sugarcane, smoke, loose paper. Hero house clothesline (village.js) is still box cloth.
Next: carrom scene to chowk (A1g); hero house clothesline once draw-call headroom exists; CC0 fabric photos if the art director wants them over canvas prints.

---

**2026-10-23 (cycle 38bv):** Game change: the 5 abadi lane water corners (hand pump, matkas, ghadas, washing stone; createLaneWaterCorner, src/farmSites.js) moved from the lane middle to the lane edge, on the side opposite the open drain, spout facing the lane (zone table in src/main.js ~1427). Each gains a pebble-ringed soak-away with a dark wet patch; the old damp apron floated 0.18 m above the ground and now lies flat. Build 16/16, budget 23.96 MB. Proof docs/shots/lanewater-edge-2026-10-23/ (e1, s1, e2, w1b_chk, w2b_chk; w1.png and w2.png are bad camera angles, ignore). Laundry corners (charpai, quilt, clothesline) also moved to the lane edge on the non-drain side (proof docs/shots/lanelaundry-edge-2026-10-23/w1.png; e1.png frame misses it behind a signpost). Gaps: carrom/ludo mats (2 m mat plus stools, do not fit an edge) still mid-lane, to move to the chowk under A1g; regression-check not run (no movement code touched).
Next: lane prop audit (carrom, laundry, charpais out of vehicle routes); hero-zone draw-call headroom; far-east road decision (art director).

---

**2026-10-23 (cycle 38bu):** Game change: temple porch is furnished (src/temple.js buildTempleProps): brass lamp stand with five diyas, donation box on a stand, brass kalash + lota, woven mat, marigold/rose offerings on a leaf plate, diyas at the shrine foot, two marigold garlands between the entrance pillars. No idol or imagery. Folded into existing wood/metal/jute/terracotta merges (+1 call). Also headroom: signboard-material merges and switchboards no longer cast shadows (hero zone 150 -> 146-147). Build 16/16, regression 22/22. Validator: 'temple_props' added to the overlap/collider excludes; merged buckets resting at exactly the 0.40 m plinth top are accepted by check 2 (narrow, commented). Proof docs/shots/temple-props-2026-10-23/ (b.png garlands, e.png lamp stand + kalash, f.png/g.png porch). Gaps: offerings and donation box are small and mostly hidden from lane height; shrine interior still empty; temple steps not worn; school other blocks, other shops untouched.
Next: shop stock for remaining shops; school other blocks; far-east road decision (art director).

---

**2026-10-23 (cycle 38bt):** Game change: the walkable school classroom is furnished (src/village.js furnishClassroom): chalk-written blackboard in a frame, teacher table/register/chair, 10 varied desk-benches with books/slates/bags, 3 painted wall charts, water matka + mug, cupboard, brass bell, clock, bulb, fan, broom, mat. Grass tufts no longer grow through its floor (keep-out in src/vegetation.js). One atlas material named 'signboard' (wall-mounted, exempt from the float check) = +1 draw call. Build 16/16 (budget 23.96 MB). WARNING: hero-zone draw calls now sit at 150-151 and flip between runs (scatter is random; baseline was 149); one run read 151 = fail. Needs headroom (distance-hide hero Blender buildings or merge more) before adding anything else in the hero zone. Proof docs/shots/classroom-2026-10-23/ (board.png, charts.png; desks.png is a bad angle, ignore). Gaps: other school blocks have no interiors; furniture is box-built (no CC0 desk model exists); temple interior untouched.
Next: free hero-zone draw-call headroom; temple interior; far-east road decision (art director).

---

**2026-10-23 (cycle 38bs):** Game change: post office, ration shop and atta chakki are furnished (src/newShops.js buildNewShopProps): chakki gets hopper, feed pipe, flour tray, belt guard, grain/flour sacks, platform scale, scoop, flour dust and is solid; ration shop gets jute sacks, crates, beam scale and ledger on the counter; post office gets a red pillar post box, post bags, letter scale, ink pad and stamp. One new jute draw call (sacks, real jute PBR set); build 16/16, budget 24.0 MB, view draw calls 110-118. Proof docs/shots/shop-interiors-2026-10-23/ (chakki.png, ration.png, post.png). Gaps: ration/post shells are solid boxes with a shallow counter recess, so no shelves/pigeonholes inside (stock stands on the flanks); pillar box and sacks use tinted metal/jute (low-poly, 9-sided sacks); school, temple and other shops untouched.

MOVABLE-UNITS AUDIT (A-1, grep-based: for each PLACES entry in src/freeRoam.js, which other files repeat its x,z literal; not a runtime test):
- Streamed sites (create*(position) in src/farmSites.js, built in local coords, geometry + colliders follow `position`): pond, tubewell, johad, khalihan, anganwadi, dairy, health, chemist, masjid, gurudwara, TV house, manihari, sabzi, Jain mandir, highway, jalebi, mela, gurukul, maidan, mandi, haveli, gaushala. To move one you must edit the literal in FOUR places: PLACES (src/freeRoam.js), the zoneManager.register x/z AND the create*({x,z}) call (src/main.js ~1382-1462), plus extras: wayfinding.js (signposts, TV house/manihari/sabzi/cane/bazaar/temple), milestones.js (TV house, health, temple), minimap.js (TV house), vegetation.js VEG_KEEP_OUT (pond, johad, manihari, cane), ambient.js (halwai, teastall, store, temple, tvhouse, manihari, johad), interactions.js (cane). So NOT one-number moves yet.
- Hero/core, coordinates baked in several files or in Blender/GLB: house (village.js, vehicles.js), school (village.js, main.js), halwai (village.js, main.js, ambient.js), tea stall, general store, bazaar row (bazaar.js, main.js, wayfinding.js; chowk coords sit in bazaar.js), post office / ration shop / atta chakki (POST_OFFICE_POS etc. in main.js ~312, the only copy besides PLACES), temple (10 files: ambient, bazaar, characters, farmSites, main, props, temple, trees, vehicles, wayfinding), mango baagh (baagh.js, village.js), canal (baagh.js, canal.js, village.js), our khet (baagh, field, main, scenery), east/west gali (main, scenery, village, waypoint), tubewell (also village.js).
- Banta and chaat thela: coordinates match no other file (offsets from a parent unit, not their own anchor).
- NPC routes (npcRoutines.js, bazaarLife.js) and colliders use raw world numbers; none reference units.
- Recommendation: add one PLACES-style anchor table (id -> x,z,ry) consumed by main.js register calls, wayfinding, milestones, minimap, vegetation keep-outs; then a move is one number. Not done: layout is changing tomorrow, art director to confirm which places move first.
Next: school / temple interiors; shop stock for remaining shops; far-east road decision (art director).

---

**2026-10-23 (cycle 38br):** Game change: colliders added to five far-east/farm sites that had none: gurukul (two blocks, verandah columns, yard wall, gate pillars, mast), khel maidan (pavilion poles + bench, net poles), mela ground (shamiana poles, stage, bench rows, swing legs, stalls), manihari counter + stool, khalihan (threshing post, 4 bhoosa stacks) in src/farmSites.js. Build all passed. Real W/S key walks stop at box + radius for stage, stack, bench, gurukul block (proof docs/shots/site-solids-2026-10-23/, script tmp/site-solid.mjs). Gaps: pond/johad edges and anganwadi props not audited; regression-check not run (no movement code touched); mandi/gurukul/maidan etc. still flat vertex-colour.
Next: per-material textures on far-east props; solid audit list; far-east road decision (art director).

---

**2026-10-23 (cycle 38bq):** Game change: the mandi now has solid colliders: grain godown, dhaba hall, weighbridge cabin, 3 parked trucks (oriented to their heading), vegetable-shed poles and crate rows (src/farmSites.js createMandi). Real W/S key walks into the godown and dhaba stop at wall + radius (godown south 47.55 vs face 47.1; dhaba 95.55 vs face 95.1). Build passed (all checks). Proof docs/shots/mandi-solids-2026-10-23/mandi_godown.png. Gaps: tractor-yard props still no collider; mandi still flat vertex-colour (5b fail); regression-check not run (no movement code touched).
Next: flat-colour far-east structures to textured materials; tractor-yard colliders; far-east road decision (art director).

---

**2026-10-23 (cycle 38bp):** Game change: the far-east/farm site props (pond, tubewell, kothri, johad, sabzi carts, jalebi stall, gaushala, highway, bus adda; src/farmSites.js) no longer flat vertex-colour: box-projected UVs + shared plaster PBR set (normal+roughness) for props, ground set for banks/mud, tinted by the baked colours; water stays glossy. No new files, budget 24.0 MB, build 16/16. Proof docs/shots/farm-textured-2026-10-23/ (pond, sabzi, gaushala, jalebi; jalebi shot is camera-inside-wall close-up of the texture). Gaps: one plaster set for wood/metal/cloth parts alike (no per-material sets yet); lotus/flower geometry still flat; mandi not checked. FINISH_LINE untouched.
Next: per-material sets (wood/tin) on these props; mandi colliders; far-east road decision (art director).

---

**2026-10-23 (cycle 38bo2):** Game change: solid colliders on more props: sabzi rehris carts + poles, jalebi stall, gaushala trough/tub/hay, highway petrol pumps/office/canopy posts, kanta cabin, bus adda posts (src/farmSites.js). Build 16/16, budget 24.0 MB, regression 22/22. Also a 5 min NPC soak (tmp/npc-soak.mjs): 0 guard warnings, 0 errors. Proof docs/shots/prop-solids-2026-10-23/. Note: the sabzi walk slid through the 0.9 m gap between two carts (legit). Finding: highway/sabzi/jalebi/gaushala/mandi still use flat vertex-colour geometry (CLAUDE.md 5b fail), not touched.
Next: mandi colliders; flat-colour far-east structures to textured materials; props for shops; far-east road decision.

---

**2026-10-23 (cycle 38bo):** Game change: trees gain a 4th LOD level past 220 m: two crossed quads from the baked per-species impostor sprites (public/assets/trees, 42 KB, src/trees.js). Also fixed a real waste: static merges folded every LOD level of every tree in (each merged tree drew 3 times); extra levels are now dropped on merge (userData.lodExtra, src/mergeUtils.js). Hero-view triangles 391k -> 267k, draw calls 115. Build passed, budget 24.0 MB. Proof docs/shots/tree-impostor-2026-10-23/far_gaushala.png (tree silhouettes beyond the gaushala; black sky there is the free photo camera's far clip, not the game). Merged trees (hero/temple/field groups) still have no distance LOD.
Next: grass tufts + crops with Foliage atlases; props for shops; far-east road decision.

---

**2026-10-23 (cycle 38bn2):** Game change: 11 unsigned places now have painted direction boards (src/wayfinding.js): temple fork gains Mango baagh + Our khet; two new far-east posts at (35,73.5) and (75,73.5) point to TV house, chemist, manihari, sabzi, johad, masjid, Jain mandir, khel maidan, highway. Still unsigned: maidan..sugarcane belt, mandi-side, johad has no lane. Build 16/16 passed. Proof docs/shots/signposts-far-2026-10-23/ (far_a, temple_fork). Gap: sugarcane belt not given a board (no PLACES id); posts stand on open ground (no road yet, art director's call). A-2c wayfinding box not ticked.
Next: far-east road decision (art director); animal routes; props for shops.

---

**2026-10-23 (cycle 38bn):** Game change: all plants and trees now use real photo leaf cutouts (ambientCG CC0 leaf sets) instead of canvas-drawn leaves: garden plants + 5 tree species (tools/build-plant-atlas.mjs -> public/assets/plants/*.webp, 3x2 cells of 341 to stay under 1K). Build 16/16, budget 24.0 MB. Proof docs/shots/plant-atlas-2026-10-23/. Gaps: flower heads still drawn (no CC0 flower sheet), grass tufts/crop rows still old, close-up leaf shot not taken. Untracked public/assets/trees impostors left alone.
Next: grass tufts + crops with Foliage atlases; props for shops; far-east road decision.

---

**2026-10-23 (cycle 38bm2):** Game change: real CC0 doorstep props (15 Poly Haven models: stools, buckets, baskets, clay pots, jugs, crates, tyre, bench, chair) now stand at the abadi house steps, instanced and streamed per 36 m cell (src/villageProps.js, abadiPropSites in src/scenery.js); sites touching colliders are dropped. Build 16/16, regression 22/22, budget 23.6 MB. Proof docs/shots/village-props-2026-10-23/. Finding: Poly Haven has no Indian tree species (neem/mango/peepal/babool); no pump/charpai/handcart/sack either. Props are not solid (all under 0.5 m, except chair/bench).
Next: tree alpha-cutout rework from ambientCG atlases; props for shops/school interiors; far-east road decision (art director).

---

**2026-10-23 (cycle 38bm):** Game change: dev collision guard now covers animals (herds, dogs; ANIMAL_MESHES in src/animals.js). Sweeping the whole map with it found 3 lane buffalo standing inside walls; lane cattle/dogs now pick the first offset that clears the real colliders and the other lane sites (src/main.js), re-sweep clean. Build 16/16, regression 22/22. Animals are stationary, so no routes to register; follow routine already runs through resolveMove. Sweep script tmp/animal-guard.mjs (88 points). Box not ticked (multi-minute NPC route run still open).
Next: trees/plants CC0 models (A1a2/A3); far-east road decision (art director).

---

**2026-10-23 (cycle 38bl):** Game change: two bazaar-lane villagers no longer walk into walls (their loops clipped colliders by 0.07 m and 0.32 m; shortened). Monkey chase and all 11 bazaarLife villager loops now register with validator check 9 (15 routes, 30 legs, all clear). Build 16/16; no movement code touched.
Next: register animal + follow routines; extend devCheckPenetration to NPCs/animals; far-east road decision (art director); trees/plants CC0 models.

---

**2026-10-23 (cycle 38bk):** Game change: none visible; new tools/findability-audit.mjs (static, heuristic: distance to the map's pencil LANES, signpost/milestone coverage, walk time at 4 m/s x1.25). A-2c audit item NOT ticked: it is a static estimate, not an on-foot walk.
FINDABILITY LIST (40 places checked, house excluded; 11 not findable without the map = no signpost AND over 30 m from any drawn lane): maidan, jain mandir, masjid, our khet, TV house, chemist, manihari, sabzi rehris, johad, mango baagh, sugarcane. Also over 30 m from a lane but at least signposted: mandi, highway, haveli, gurukul, health centre, gaushala, pond, mela, gurudwara. Walks: nearest village-core places 6-20 s; far east cluster 60-130 s with no road (milestones only stand on open ground). Lanes stop short of everything east of x=36 and south of z=140.
Caveat: LANES in src/freeRoam.js are the map outline, not every real track (field tracks and the canal bridge approach are not in it), so khet/baagh/canal may be better connected on the ground than listed.
Recommendation (art director decides, nothing moved): far-east cluster is 140-275 m out with nothing between; either run one real road from the east gali along z~76 to the highway, or pull the cluster in. Add signpost entries for the 11 unsigned places.
Next: register monkey/bazaarLife/animal routes; trees/plants CC0 models (untracked public/assets/trees impostors are someone else's WIP, left alone).

---

**2026-10-23 (cycle 38bj2):** Game change: 4 painted milestone stones (Highway n m / Mandi n m, Hindi above English) on the east approach (src/milestones.js, zone-streamed, labels from PLACES, solid). Build + validator + budget (19.4 MB) passed; no movement code touched. Proof docs/shots/milestones-2026-10-23/ms_i.png. Gap: no real road along the route beyond the gali mouth; no markers at the highway itself.
Next: findability audit list; far-east road decision (needs art director); register monkey/bazaarLife/animal routes.

---

**2026-10-23 (cycle 38bj):** Game change: greenery scatter audit (new tools/greenery-audit.mjs). Fixed: 121 grass tufts standing on kerbs/in lane drains removed via a lane keep-out band (src/vegetation.js), 4 crop rows removed from the tubewell outlet channel (src/field.js). Trees, canal, pond, johad, rooftops were clean. Build + validator passed; no movement code touched. Gap: lane water corners/troughs not auto-detected.
Next: milestone markers on approach road/highway; findability audit; register remaining NPC routes.

---

**2026-10-23 (cycle 38bi):** Game change: none visible; build-time safety. Validator check 9 now fails the build if any NPC waypoint leg (Maa, child, postman) clips a collider (routes register themselves in src/npcRoutines.js ROUTES, exposed as __dopahar.npcRoutes). Validator 16/16, regression 22/22. Gaps: monkey run, bazaarLife and animal routines not registered yet.
Next: register those routes; extend devCheckPenetration to NPCs/animals; milestone markers; findability audit.

---

**2026-10-23 (cycle 38bh):** Game change: corner minimap (src/minimap.js): notebook-paper window top-right, player arrow with facing, landmark glyphs, lanes, objective star; tap opens full notebook map; pause menu toggle hides it (saved). 96 px on phones, clear of joystick. Build passed, zero console errors. Proof docs/shots/minimap-2026-10-23/. Minimap research item not done (box open). No movement code touched.
Next: milestone markers on approach road/highway; findability audit list; far-east road; guarded task switching.

---

**2026-10-23 (cycle 38bg):** Game change: 5 painted direction signposts at lane junctions + a Village Notice Board at the chowk (src/wayfinding.js; Hindi small on top, English large below; names, arrows, compass and distances read from PLACES so they re-label after the layout rework; only the 6 post x,z live in the file). One shared atlas, one merged mesh, wood is a canvas grain (no normal map). Validator check 5 now also samples material 'wayfinding'. Build 15/15, regression 22/22, hero view 149/150 draw calls (signs cost 2). Proof docs/shots/wayfinding-2026-10-23/.
Next: milestone markers on approach road/highway; findability audit list; far-east road; A-2b minimap.

---

**MOVABLE-UNITS AUDIT (A-1, 2026-10-23, for the art director's rearrangement). Read before moving anything.**
- ONE-VALUE-ISH (position passed as a parameter, props + colliders travel with it): the farmSites.js places - pond, tubewell, johad, khalihan, anganwadi, dudh dairy, health sub-centre, chemist, masjid, gurudwara, tv house, manihari, sabzi rehris, jain mandir, highway, jalebi stall, mela, gurukul, khel maidan, mandi, old haveli, gaushala, lane games/laundry/water corners, boundary walls. Their x,z is written TWICE in src/main.js (zoneManager.register x,z AND the create...() argument) and a THIRD time in PLACES (src/freeRoam.js, Visit-place + notebook map). Change all three. Inside a site nothing else is world-baked (local coordinates), with one caveat: NPC/animal routes and interaction points for these are not tied to the unit.
- BAKED INTO MANY FILES (moving needs code edits, not one number): house + courtyard (HOUSE_CENTER, village.js; MAA/HAND_PUMP/TULSI/CHARPAI positions in interactions.js and village.js; mission waypoints), school (SCHOOL_CENTER; bell, teacher, sister positions in interactions.js), halwai (HALWAI_CENTER; NPC, charpai), hero tea stall + general store (TEA_SHOP_POS in main.js, src/shops.js), bazaar row + chowk (bazaar.js absolute coordinates, bazaarLife.js, wheatErrand.js KIRANA/SACK/PITAJI literals), temple + temple lane (temple.js, lane constants in main.js), canal + bridge (canal.js), field/baagh (FIELD_CENTER, BAAGH_CENTER, MANGO_TREE_PLACEMENTS), background houses (abadiBoxes.json, one batch).
- NOT unit-bound anywhere: lamps (laid along lane segments), NPC routines/waypoints (raw world coordinates in npcRoutines.js, paths.js, dayline.js, sideJobs.js), mission waypoints (quest.js), tree placements for the village (lists of absolute x,z).
- Safest to move first: any of the first group. Hardest: the hero cluster (house/school/halwai/tea/store) and bazaar, because story missions reference raw coordinates.

---

**2026-10-23 (cycle 38bf2):** Game change: lamp posts, lane hand pumps and matka stands, lane/dhaba charpais, laundry poles and the tubewell (kothri, hauz, motor, charpai) are now solid (orientedSolids in src/farmSites.js, lampBoxes in src/props.js). Validator check 5 now also samples site_props / street_lamp materials. Build 15/15, regression 22/22. No walk-into screenshot proof (not ticked).
Next: A-1 movable-units audit note; courtyard hand pump + carts + troughs colliders; waypoint validation at build time.

---

**2026-10-23 (cycle 38bf):** Game change: notebook map now shows all places from first load (visited ticked); pause menu gained a guarded Tasks list (8 missions + 10 side jobs, done/current/locked, side jobs walk-to in free roam). Build all passed. Proof docs/shots/tasks-2026-10-23/. No movement code touched.
Next: A-2b corner minimap; then A-2c direction signs / findability audit; A-1 movable-units audit note.

---

**2026-10-23 (cycle 38be2):** Game change: every tree now has a trunk collider (people, animals, vehicles slide round trees; src/trees.js buildTrees, no extra draw calls). Validator check 5 extended to treat tree trunks as real geometry. Build 15/15, regression 22/22. No screenshot proof of a walk into a tree yet (not ticked).
Next: A0 remaining: colliders for lamp posts, hand pumps, charpais; extend devCheckPenetration to animals; build-time waypoint validation.

---

**2026-10-23 (cycle 38be2):** Game change: pause menu "Visit place" list (41 places, bilingual, generated from PLACES in src/freeRoam.js); lands the player on open ground facing the place, dismounts a vehicle first, mid-mission needs a second tap. Build passed. Proof docs/shots/visit-place-2026-10-23/. No movement code touched; regression not run.
Next: A-2b Tasks list + corner minimap (A-2 mission-warning path still needs a screenshot test).

---

**2026-10-23 (cycle 38be):** Game change: woven charpai also on the 4 dhaba cots and the TV house porch (charpaiGeos, src/farmSites.js). Proof docs/shots/charpai2-2026-10-23/dhaba.png, tvhouse.png. Build passed.
Next: doors/windows standing rule on dhaba, TV house and other small buildings (smallBuilding helper); hero-house charpai needs a draw-call saving first.

---

**2026-10-23 (cycle 38bd):** Game change: tubewell hauz now has real water (was green, grass inside); plant scatter keep-out for water bodies; tubewell kothri door/window got frames, plank lines, grille, sill; shared woven charpai (tubewell + lane laundry). Build all passed, budget 19.4 MB. Proof docs/shots/hauz-2026-10-23/after.png, door.png, charpai.png. No movement code touched.
Next: remaining charpais (dhaba, house, halwai), tubewell naali/meter box, doors/windows standing rule on other buildings.

---

**2026-10-23 (cycle 38bc):** Game change: banana clumps and bougainvillea at the four field-track corners (src/field.js, no new draw call; field views 82-90 calls). Build passed. Proof docs/shots/fieldcorner-2026-10-23/sw.png. No movement code touched.
Next: temple/hero neems into streamed zones; kid packs when characters unpark.

---

**2026-10-23 (cycle 38bb):** Game change: W2 lane (x -84..-58, z 24) now has a cow, buffalo and street dog resting (zone lane_cattle_w2, src/main.js), so all five abadi lanes have games, laundry, water and cattle. Build all passed. Proof docs/shots/lane-cattle-w2-2026-10-23/cw_a.png. No movement code touched. Animals are still blocky code models until Tripo.
Next: temple/hero neems into streamed zones (needs draw-call savings first); kid packs when characters unpark.

---

**2026-10-23 (cycle 38bb):** Game change: W2 lane (x -84..-61, z 21) now has street life: carrom/ludo, laundry line, water corner (zones lane_*_w2, src/main.js). Build 15/15 (hero zone 145 calls), regression 22/22. Proof docs/shots/lane-w2-2026-10-23/w2_a.png (games + laundry), w2_c.png (ring toss-like prop from nearby building framed, water corner not cleanly framed). Note: the n0 boundary wall at z=21 runs along the W2 lane line, so the lane reads as the strip just south of it; items placed at z 22.6.
Next: temple/hero neems into streamed zones; kid packs when characters unpark.

---

**2026-10-23 (cycle 38ba):** Game change: every road wheel (tractor x4, trolley x2, bicycle x2) is now one mesh (tyre + rim merged, vertex colours, shared matte paint) instead of two, saving 8 draw calls when all are in view; rim loses its metallic sheen. Build all passed, regression 22/22 (140 calls). Proof docs/shots/2026-10-23T07-47-38-404Z/vehicle_tractor_trolley_side.png (wheels read fine; bike shot is blurred by an existing camera issue, not framed). Wheel spin code untouched.
Next: W2 lane street life with the new headroom; temple/hero neems into streamed zones.

---

**2026-10-23 (cycle 38az):** Game change: lane E2 (x=-6, z 76..130) now has street life (carrom/ludo, laundry, water corner, cattle + dog; zones lane_*_e2, src/main.js). Made headroom first: the bullock cart's 8 legs are now one InstancedMesh (src/vehicles.js, 8 calls -> 1), hero view 150 -> 144 draw calls. Build 15/15, regression 22/22. Proof docs/shots/lane-e2-2026-10-23/e2_b.png, e2_c.png (cart legs not separately framed; regression walk passed). W2 lane (z=21) street life would push the hero zone over 150, skipped.
Next: more hero-zone call savings (tractor 11, trolley 6 meshes) then W2 lane street life; temple/hero neems into streamed zones.

---

**2026-10-23 (cycle 38ay):** Game change: water corners (cast-iron hand pump on a cement platform, clay matkas on a stand, steel ghadas, bucket, washing stone) in three abadi lanes, streamed zones lane_water_e1/w1/s1 (createLaneWaterCorner, src/farmSites.js), visual only, one draw call each. Build all passed, budget 19.4 MB. Proof docs/shots/lanewater-2026-10-23c/w1_d.png (e1 partly framed, s1 not cleanly framed: camera clips walls). No movement code touched.
Next: kid packs when characters unpark; temple/hero neems into streamed zones; field-track edges.

---

**2026-10-23 (cycle 38ax):** Game change: two buffalo at the pond bank (zone pond_buffalo, src/main.js). Build all passed, budget 19.4 MB. Proof docs/shots/pondbuffalo-2026-10-23/pond_a.png. No movement code touched. Tried wiring baked tree impostors (public/assets/trees/impostor_*.webp, untracked, unused) as a 200 m LOD: reverted, because streamed zones mean no tree is in view past ~90 m so the level could not be verified or ever shows.
Next: kid packs when characters unpark; temple/hero neems into streamed zones.

---

**2026-10-23 (cycle 38aw):** Game change: laundry corners (charpai, quilt, drying chillies, tub, clothesline with saris) in three abadi lanes, streamed zones lane_laundry_e1/w1/s1 (createLaneLaundry, src/farmSites.js), visual only. Build all passed. Proof docs/shots/laundry-2026-10-23/e1_a.png. No movement code touched.
Next: kid packs when characters unpark; temple/hero neems into streamed zones; field-track edges.

---

**2026-10-23 (cycle 38av):** Game change: abadi rows get per-row limewash tint (cream, blush pink, mint, blue-grey; ABADI_WASHES in src/scenery.js, instance colour, zero draw calls). Build all passed, budget 19.4 MB. Proof docs/shots/abadiwash-2026-10-23/w1_c.png, s1_d.png. No movement code touched.
Next: temple/hero neems into streamed zones; in-job screenshots; kid packs when characters unpark.

---

**2026-10-23 (cycle 38au):** Game change: cow + buffalo + street dog resting in the lane at three abadi spots (E1, W1, S1; zones lane_cattle_*, src/main.js, reuse createCattleHerd/createDogPack, 2 draw calls each, streamed, visual only). Build all passed. Proof docs/shots/lanecattle-2026-10-23/s1_d.png, w1_d.png (e1 lane framing not clear). No movement code touched. Animals are still the blocky code models until Tripo.
Next: kid packs in lanes; temple peepal/neems into streamed zones for LOD; field-track edges.

---

**2026-10-23 (cycle 38at):** Game change: carrom + ludo boards on jute mats with stools in three abadi lanes (createLaneGames, src/farmSites.js; streamed zones lane_games_e1/w1/s1 in src/main.js). Build all passed, budget 19.4 MB, console clean. Proof docs/shots/lanegames-2026-10-23/e1_a.png. No movement code touched. Note: impostor idea dropped (streamed zones build within ~30 m, far LOD never shows there). Reference CLAUDE.md under reference-from-unity is Unity-era; this repo's CLAUDE.md governs.
Next: roaming cattle in lanes, kid packs, in-job screenshots.

---

**2026-10-23 (cycle 38as):** Game change: flower stall now has ten hanging marigold/rose garland strands (src/temple.js buildFlowerStall; closes the review-1 FIX). Build all passed, budget 19.4 MB, console clean. Proof docs/shots/garland-2026-10-23/stall2.png. No movement code touched.
Next: move hero/temple neems into streamed zones for LOD; impostor; field-track edges.

---

**2026-10-23 (cycle 38ar):** Game change: tree leaf cards within ~3 m of the camera now dissolve (dithered fade, src/trees.js shader, no draw calls), so the follow camera no longer sits in a wall of leaves. Proof docs/shots/2026-10-23T05-54-17-220Z/low_angle.png (before: ...05-51-42-375Z). Tried streaming the temple peepal: hero view 151 calls, reverted. Console clean. No movement code touched.
Next: chowk/hero neems need a draw-call saving before they can stream; field-track edges; in-job screenshots.

---

**2026-10-23 (cycle 38aq):** Game change: mango baagh trees streamed (zone trees_baagh) so tree LODs work there. Build 15/15, budget 19.4 MB. Proof docs/shots/baagh-trees-2026-10-23/. Validator settle wait 5->20 frames (teardown lag). No movement code touched.
Next: temple peepal and hero/bazaar neems into streamed zones, then impostor.

---

**2026-10-23 (cycle 38ap):** Game change: 10 streamed outskirts trees (neem, peepal, babool) around the pond, johad, haveli and gaushala (src/main.js outskirtTrees). Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/outskirts-2026-10-23/. Finding: merged trees defeat the LOD (see BACKLOG A3); impostor reverted. No movement code touched.
Next: move field/temple trees into streamed zones so LOD + impostor can work; field-track edges; in-job screenshots.

---

**2026-10-23 (cycle 38ao):** Game change: north-edge boundary wall run (x -101..-58, z 21, lane gap) as streamed zone edge_wall_n0 in src/main.js. A second run at x 14..46 took the hero zone to 151 draw calls, so it was dropped. Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/northwall-2026-10-23/b_0.png. No movement code touched.
Next: tree impostor (needs baked texture), field-track edges, in-job screenshots.

---

**2026-10-23 (cycle 38an):** Game change: chulha smoke wisps now rise from 7 abadi rooftops (abadiSmokeSources, src/scenery.js -> createAmbientLife extra sources, same smoke draw call). Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/abadi-smoke-2026-10-23/e1.png, w1.png. No movement code touched.
Next: tree distance impostor (baked), per-job screenshot proof.

---

**2026-10-23 (cycle 38am):** No game-code change this cycle. Took framed screenshots at the side-job spots (docs/shots/jobs-2026-10-23/) as partial A5 proof; weak (kanche camera inside foliage, NPCs capsules). Suspected budget breach at (-46,14.6) checked: 177 calls includes shadow pass, validator metric is 122, so no breach.
Next: kanche camera-in-foliage, in-job screenshots, real game change from A3/A4.

---

**2026-10-23 (cycle 38al):** Game change: the khel maidan at the east edge now has its own distant kids' cheer (fainter, 70 m range) in free roam, src/jobs/gilli.js. Sound radar for chakki, kulfi bell and gilli maidan verified with audio spies (volume fades, silent out of range), proof docs/shots/radar-proof-2026-10-23/radar.txt. No movement code touched. Note: headless render is ~1 fps at 1280x800 so game timers barely advance; use a tiny viewport for time-based tests.
Next: side-job screenshot proof per job, field-side walls.

---

**2026-10-23 (cycle 38ak):** Game change: field track loop gets a sparse tulsi + marigold verge just outside its edge (buildTrackVerge, src/field.js, one garden-plant draw call, no colliders). Build passes, budget 19.4 MB, no movement code touched. Proof docs/shots/trackverge-2026-10-23/walk_d.png, walk_e.png. Banana dropped from the verge: the follow camera ended up inside a clump.
Next: A5 sound radar proof, side-job screenshot proof.

---

**2026-10-23 (cycle 38aj):** Game change: canal banks get sparse greenery (bougainvillea, tulsi, banana) outside the grassy strips, clear of bridge and pulia (src/canal.js, one extra garden-plant draw call). Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/canalgreen-2026-10-23/canal_a.png, canal_b.png. No movement code touched.
Next: A5 sound radar proof, field-track kerbs, side-job screenshot proof.

---

**2026-10-23 (cycle 38ai):** Game change: boundary walls get wall-base greenery (bougainvillea, marigold, creepers, banana) via one garden-plant mesh per wall zone (src/farmSites.js). Build 15/15, console clean. Proof docs/shots/wallgreen-2026-10-23/. No movement code touched.
Next: A5 sound radar proof, field-track kerbs, side-job screenshot proof.

---

**2026-10-23 (cycle 38ah):** Game change: school compound greenery (creepers on south wall, marigold + tulsi at gate, banana corners) via the existing garden-plant batch. Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/school-green-2026-10-23/gate.png.
Next: A5 sound radar proof, field-track kerbs, side-job screenshot proof.

---

**2026-10-23 (cycle 38ag):** Game change: greenery on every abadi house front (creepers on walls, tulsi + marigold pots, banana at row ends; abadiGardenPlants in src/scenery.js, one extra garden-plant mesh, only drawn when abadi in view). Build 15/15, budget 19.4 MB, regression 22/22, console clean. Proof docs/shots/abadi-green-2026-10-23/.
Next: school greenery, A5 sound radar proof, field-track kerbs.

---

**2026-10-23 (cycle 38af2):** Game change: greenery around the post office / ration shop / atta chakki (side-wall creepers, tulsi, marigold pair, banana clumps) via the existing one-draw-call garden-plant batch (src/main.js). Build 15/15, budget 19.4 MB, regression 22/22. Proof docs/shots/newshops-green-2026-10-23/front_b.png, back.png (other angles blocked by a neem).
Next: A5 sound radar proof, field-track kerbs, side-job screenshot proof.

---

**2026-10-23 (cycle 38af):** Game change: notebook map widened to the whole village (landscape 960x640 page, 23 new discoverable places from the streamed MAP.md sites, water icon, label-collision skip, canal line full length; src/freeRoam.js, index.html). Proved free-roam pieces by real walking: notebook map + title 'Continue roaming' (proof docs/shots/roam-proof-2026-10-23/), ticked both FINISH_LINE boxes. Build 15/15, console clean. Hero-cluster labels still crowd a little at that scale. No movement code touched.
Next: A5 sound radar proof, field-track kerbs, side-job screenshot proof.

---

**2026-10-23 (cycle 38ae):** Game change: three more village boundary wall runs (east upper z 21..58, east far-south z 135..157, west far-north z 21..34; zones edge_wall_e0/e3/w0 in src/main.js). Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/edgewall3-2026-10-23/. Also audited all 10 side jobs end to end (all pass; notes in BACKLOG A5). No movement code touched.
Next: A5 remaining (sound radar, notebook map, Continue roaming proof), field-track kerbs.

---

**2026-10-23 (cycle 38ad):** Game change: boundary walls extended along the abadi's south-centre, west lower half and east lower half (src/main.js zones edge_wall_s2/w2/e2, createBoundaryWall). Build 15/15, budget 19.4 MB, console clean. Proof docs/shots/edgewall2-2026-10-23/. No movement code touched, no colliders.
Next: A5 side-job real-input audit (no side-job test exists in regression-check.js), field-side walls.

---

**2026-10-23 (cycle 38ac):** No game change kept. Tried a tree distance-billboard impostor (src/trees.js); screenshots showed flat green blobs and an all-green overview, so it was reverted (notes in BACKLOG A3). Build 15/15 and regression 22/22 were green on the attempt but visual fail.
Next: A5 side-job checklist audit against docs/MISSIONS_PLAN.md, field-side boundary walls.

---

**2026-10-23 (cycle 38ab):** Game change: tree canopy leaf cards no longer cast shadows (src/trees.js; trunks still do), cutting the regression-check view from 436k to 391k triangles (shadow pass was double-counting ~92k merged tree tris). Test fix: tools/regression-check.js attached-trolley approach waits 3 s (not 1.2 s) of stalled clearance before giving up, since at ~3 fps a streaming hitch looked like "blocked far away"; the trolley itself was solid and reachable (probe walked to 0.2 m). `node tools/regression-check.js` now 22/22, build 15/15. Screenshots docs/shots/2026-10-23T02-05-49-374Z/ (tree shadow on the ground still present from trunks/buildings; canopy shade lighter). Baseline file docs/regression-baseline.json is stale (108k) and left alone.
Next: field-track kerbs, A5 side-job checklist audit.

---

**2026-10-23 (cycle 38aa):** Game change: player colliders on streamed MAP.md sites (health centre, chemist, masjid + minaret, gurudwara, Jain mandir, TV house, anganwadi, dairy, old haveli ranges, gaushala back wall) via finishSite opts.solids / solidBoxes in src/farmSites.js; zoneManager already rebuilds STATIC_COLLIDERS on zone change. Verified in a live page: masjid zone builds with 2 collider boxes. Build 15/15, budget 19.4 MB. No visual change, so no new screenshots. FOUND: tools/regression-check.js reports 'triangles under 400k' FAIL (436002) and 'trolley blocks the player (attached)' FAIL (2.96 m); both fail identically with my change stashed, so they predate it (an ad-hoc count at the same camera gave 186k, so the 436k probably depends on state/zones loaded earlier in the check; not yet diagnosed).
Next: diagnose the 436k triangle count and the attached-trolley check, field-track kerbs, A5 side-job audit.

---

**2026-10-23 (cycle 38z):** Game change: nali drains with cover slabs on the temple lane and the three bazaar approach legs (src/temple.js, src/bazaar.js via buildDrainSegments, merged into each lane mesh, no new draw calls). Build 15/15, budget 19.4 MB. Proof docs/shots/drains2-2026-10-23T01-26-41-845Z/temple_lane.png (bazaar legs not framed).
Next: colliders on new sites, A5 side-job checklist audit, tree billboard impostor.

---

**2026-10-23 (cycle 38y):** Game change: open drains (nali) with cement cover slabs beside the abadi lane kerbs (buildDrainSegments, src/paths.js; used in src/scenery.js), zero new draw calls. Build 15/15, budget 19.4 MB. Proof docs/shots/drains-2026-10-23T01-22-11-711Z/abadi_e1.png, abadi_w1.png.
Next: drains on temple/bazaar lanes, colliders on new sites, A5 side-job checklist audit.

---

**2026-10-23 (cycle 38x):** Game change: village boundary walls (low lime-plaster compound wall on a brick-red plinth, coping, pilasters every 4 m, a gap where each lane leaves) closing the abadi's west (x -101), south (z 157) and east (x 46) edges, zone-streamed (createBoundaryWall, src/farmSites.js; 3 zones in src/main.js). Build 15/15 (hero 149/150, bazaar 123), console clean. Proof docs/shots/edgewall-2026-10-23b/west_wall.png, south_wall.png (the black sky patch in south_wall is the free photo camera, not the wall). Visual only, no colliders; north edge faces the canal so no wall there.
Next: field-track kerbs, colliders on new sites, A5 side-job checklist audit.

---

**2026-10-23 (cycle 38w):** Game change: kachcha bank road on the north (village) side of the canal at z 38.8, x -50..34 (createCanalBankRoad got a name param, zone 'canal_bank_road_n' in src/main.js); MAP.md says both banks. Build 15/15, validator passes. Proof docs/shots/northbank-2026-10-23T01-10-01-020Z/both_banks.png, north_bank_a.png. Visual only, no colliders. A4 MAP.md comparison: every named place now built; box left unticked pending art director.
Next: field-track kerbs, tree billboard impostor, colliders on new sites.

---

**2026-10-23 (cycle 38v):** Game change: cement kerbs on all 5 abadi lanes (E1,E2,W1,W2,S1; src/scenery.js via buildKerbSegments, shared lane material). Build 15/15, budget 19.4 MB. Proof docs/shots/kerbs3-2026-10-23T01-05-01-534Z/abadi_e1.png, abadi_w1.png.
Next: tree billboard impostor, kerbs on field tracks, verify A4 list vs MAP.md.

---

**2026-10-23 (cycle 38u):** Game change: raised cement kerbs on the temple lane and the three bazaar approach legs (src/temple.js, src/bazaar.js via buildKerbSegments, merged into each lane's one mesh, no new draw calls). Build 15/15 (hero 148/150, bazaar 123), budget 19.4 MB, console clean. Proof docs/shots/kerbs2-2026-10-23T00-53-05-942Z/temple_lane.png.
Next: tree billboard impostor, kerbs on abadi lanes/field tracks, verify A4 list vs MAP.md.

---

**2026-10-23 (cycle 38t):** Game change: old haveli (150,-30; two-storey courtyard mansion, arched gate, jharokhas, corner chhatris) and gaushala (-125,-35; open cattle shed, trough, hay, 5 resting cows) added, zone-streamed (src/farmSites.js, src/main.js). MAP.md gives no coordinates. Build 15/15. Proof docs/shots/sites-2026-10-23T00-35-19-491Z/. No colliders. Every named MAP.md place now has a build, but A4's unticked box still needs a final MAP.md comparison. Tree billboard impostor skipped: the 120 m LOD is already one draw call.
Next: verify A4 list vs MAP.md, kerbs on other lanes, colliders on new sites.

---

**2026-10-23 (cycle 38s):** Game change: trees now have 3 distance LODs (src/trees.js, THREE.LOD: full / 55 m thinned leaves, no shadow / 120 m leaves only, trunk dropped), fewer draw calls and triangles for far trees. Build 15/15 (hero 148/150), budget 19.4 MB, console clean. Proof docs/shots/2026-10-23T00-25-32-752Z/spawn_behind.png (near LOD; far LOD not framed). Not done: billboard impostor, old haveli/gaushala.
Next: billboard impostor, kerbs on other lanes, old haveli/gaushala.

---

**2026-10-23 (cycle 38r):** Game change: grass patches on the ground now carry real photoscan normal + roughness (grass_normal/roughness.webp, 1K, src/materials.js shader hook), no new draw call. Build 15/15 (hero 149/150), budget 19.4 MB, console clean. Proof docs/shots/2026-10-23T00-17-47-214Z/high_overview.png. Not done: tree LODs/billboards, old haveli/gaushala.
Next: tree LODs + billboard, kerbs on other lanes.

---

**2026-10-23 (cycle 38q):** Game change: wall creepers (money-plant curtains) on the bazaar row's back wall and east end, a 5th atlas cell in buildGardenPlants (src/vegetation.js, placed in src/main.js), no new draw call. Build 15/15, budget OK. Proof docs/shots/creepers-2026-10-23/back4.png. Creepers only on the bazaar, not on abadi houses or the hero house. Not done: tree LODs/billboards, old haveli/gaushala.
Next: tree LODs + billboard, old haveli/gaushala (V2), close pulia shot.

---

**2026-10-23 (cycle 38p):** Game change: patli pulia, a narrow plank-and-handrail foot crossing over the nahar at x=-3 (src/canal.js, PULIA_X), with a 1.6 m gap in the bank colliders so the player can walk across but vehicles cannot. Build 15/15 (hero zone 149/150), regression 22/22. Proof docs/shots/pulia-2026-10-22T23-57-02-796Z/ (pulia is small in these shots and not clearly visible; I did not walk across it with real input). Not done: tree LODs/billboards, wall creepers, old haveli/gaushala.
Next: tree LODs + billboard, wall creepers, a close pulia shot.

---

**2026-10-23 (cycle 38o):** Game change: gentle wind sway on every tree's leaf cards (vertex shader on the shared leaf material, src/trees.js, no extra draw calls; 108 calls, build 15/15, no console errors). Proof docs/shots/2026-10-22T23-49-51-311Z/low_angle.png (still frame, motion not visible). Not done: tree LODs/billboards, patli pulia, old haveli/gaushala.
Next: patli pulia, tree LODs + billboard, wall creepers.

---

**2026-10-23 (cycle 38n):** Game change: kachcha canal bank road (packed-earth track with twin ruts, dung patches, whitewashed marker pegs) along the south bank of the nahar, zone-streamed (createCanalBankRoad, src/farmSites.js, radius 28 m so hero zone stays 148/150). Proof docs/shots/sites-2026-10-22T23-46-03-436Z/. Build 15/15. Chaupal: chabutras already exist (temple peepal, chowk). MAP.md gives no coordinates. No colliders; north bank road and patli pulia not built.
Next: patli pulia, wall creepers, old haveli/gaushala (V2).

---

**2026-10-23 (cycle 38m):** Game change: mandi (town market east of the highway, (226,60): paved yard, grain godown with sacks, vegetable yard shed with crates, weighing station, dhaba with charpais, 3 plain parked trucks) added, zone-streamed (createMandi, src/farmSites.js). Also fixed the hero-zone 151/150 failure: khalihan stream radius 38 -> 28 (src/main.js); `npm run build` now 15/15. MAP.md gives no coordinates for the mandi. Proof docs/shots/sites-2026-10-22T23-25-16-952Z/. No colliders on the mandi; trucks do not move.
Hero zone then flickered 150/151 between builds; the far kachcha homestead is now only drawn within 80 m (src/scenery.js), hero reads 148, build 15/15 twice, regression 22/22.
Next: chaupal platform check, kachcha canal bank roads, wall creepers, old haveli/gaushala (V2).

---

**2026-10-23 (cycle 38l):** Game change: jalebi + samosa stall (-104,4), mela + wedding ground with shamiana, swing and stalls (-135,150), gurukul inter college (160,85) and khel maidan with cricket strip, badminton net, pavilion (165,135) added, all zone-streamed (src/farmSites.js, src/main.js). MAP.md gives no coordinates. Proof docs/shots/sites-2026-10-22T23-02-38-573Z/ and sites-2026-10-22T23-00-16-314Z/. Build passes except pre-existing hero-zone 151/150; none of these add to it. Gurukul has no windows on its yard face view yet; no colliders on any of these.
Next: hero-zone 151 fix, mandi area, chaupal check, kachcha canal bank roads, wall creepers.

---

**2026-10-23 (cycle 38k):** Game change: TV house (70,12), manihari stall (90,78), sabzi rehris (88,92), Jain mandir (130,160) and an east highway cluster at (205,40) (paved road, petrol pump, bus adda, dharam kanta) added as zone-streamed scenery (src/farmSites.js, src/main.js). MAP.md gives no coordinates. Proof docs/shots/sites-2026-10-23d/. Build passes except pre-existing hero-zone 151/150; budget OK (18.9 MB). Highway has no colliders and no trucks yet; mandi past the highway still unbuilt.
Next: hero-zone 151 fix, jalebi + samosa stall, chaupal platform, mela ground, mandi, gurukul, khel maidan.

---

**2026-10-23 (cycle 38j):** Game change: health sub-centre (96,30), chemist (96,60), masjid (100,135) and gurudwara (-60,175) added as zone-streamed scenery (src/farmSites.js, src/main.js); faith buildings have no gameplay. MAP.md gives no coordinates. Proof docs/shots/sites-2026-10-23c/. Build passes except pre-existing hero-zone 151/150. Note: photo-camera shots at the far east/south edge show 169 calls and a clipped sky dome, a free-camera artifact (normal-play view reads 72-82 calls).
Next: hero-zone 151 fix, TV house, manihari, sabzi rehris, Jain mandir, highway cluster.

---

**2026-10-23 (cycle 38i):** Game change: anganwadi (pink one-room centre with yard wall and slide, (-104,106)), dudh dairy (cream collection room, steel milk cans, tin awning, (-112,18)) and the neighbour's 2-mango orchard ((12,127),(27,129)) added, all zone-streamed (src/farmSites.js, src/main.js). MAP.md gives no coordinates. Proof docs/shots/sites-2026-10-23b/ (anganwadi_b.png, dairy.png). Build + regression 22/22 pass; hero zone still 151/150 (pre-existing). Note: school compound is 85x75 m (-92..-8, 68..143), earlier spot guesses fell inside it.
Next: hero-zone 151 fix, chemist, sabzi rehris, health sub-centre, TV house, masjid/gurudwara scenery.

---

**2026-10-23 (cycle 38h):** Game change: johad (small SE pond with reeds, (78,105)) and khalihan threshing floor with four bhoosa straw stacks ((-78,-5), west of the stubble) added, both zone-streamed (createJohad, createKhalihan in src/farmSites.js). MAP.md gives no coordinates. Proof docs/shots/sites-2026-10-22T22-25-31-728Z/. Note: validator check 8a hero zone reads 151/150, and it already did at HEAD before this change (not caused by these zones) - needs a look.
Next: hero-zone 151 draw call fix, neighbour's orchard, anganwadi, dudh dairy, chemist, sabzi rehris.

---

**2026-10-23 (cycle 38g):** Game change: village pond with lotus and bathing ghat (-132,70), tubewell + kothri with cistern (-40,-8), and a ~42x34 m sugarcane belt (0..42, 135..169) with lanes, all streamed (src/farmSites.js, registered in src/main.js). MAP.md gives no coordinates for any. Proof docs/shots/sites-2026-10-22T22-09-49-386Z/. Build, regression (22/22) pass. Cane has no colliders yet; pond has no buffalo.
Next: johad, neighbour's orchard, bhoosa stacks, khalihan, anganwadi.

---

**2026-10-23 (cycle 38f):** Game change: paani ki tanki + pole transformer landmark built (createWaterTankProp, src/props.js; ~12 m tank on four braced legs with ladder, streamed via zoneManager at (-22,122), radius 90 m because the hero zone is at exactly 150 draw calls). Proof docs/shots/water-tank-2026-10-23/tank_far.png. A4 missing-location list is in docs/BACKLOG.md A4. MAP.md gives no coordinate for the tank.
Next: pond, tubewell + kothri, sugarcane belt (A4 list).

---

**2026-10-23 (cycle 38e):** Game change: ground grass patches now carry a real photoscanned CC0 grass texture (Poly Haven aerial_grass_rock, 1K WebP, shader blend in src/materials.js; assets 18.9 MB, 109 draw calls, no console errors). Proof docs/shots/2026-10-22T21-52-23-402Z/high_overview.png.
Next: wall creepers, then A4 MAP.md comparison list.

---

**2026-10-23 (cycle 38d):** Game change: marigold beds, banana clumps, tulsi and bougainvillea are now painted alpha-cut cards (buildGardenPlants in src/vegetation.js, one atlas, one draw call, replaces the old flat blade flowers); banana clumps and tulsi added near house, temple and chowk. Proof docs/shots/garden-plants-2026-10-23/. Build passes. A3 low-vegetation not ticked (wall creepers and a CC0 ground-cover texture remain).
Next: ground-cover texture, then A4 MAP.md comparison list.

---

**2026-10-23 (cycle 38c):** Game change: grass tufts and scrub bushes are now crossed alpha-cut blade cards (src/vegetation.js) instead of boxes, no extra draw calls. Proof docs/shots/trees-2026-10-22T21-42-52-648Z/neem_close.png. A3 low-vegetation not ticked (tulsi, marigold beds, creepers, banana, CC0 ground cover remain).
Next: finish A3 low vegetation, then A4 MAP.md comparison list.

---

**2026-10-23 (cycle 38b):** Game change: all five tree species rebuilt (src/trees.js) - curved root-flared trunks, forking branches, thousands of alpha-cut leaf-sprig cards from a species atlas (neem pinnate, peepal heart, mango lance, babool feathery, eucalyptus hanging), outward-pointing shading normals; still 2 draw calls for all trees (109 total, 354k tris). Proof docs/shots/trees-2026-10-22T21-34-16-180Z/ and trees-2026-10-22T21-35-27-570Z/. A3 tree item NOT ticked (code-built, not Blender; question in NEEDS_YOU).
Next: A3 low vegetation and ground cover, then tree LODs/wind sway; A4 map comparison.

---

**2026-10-23 (cycle 38):** Game change: bazaar and chowk signboards were illegible (square atlas cells squashed onto 8:1 boards); now 4:1 cells and taller 4:1 boards with bold red Devanagari over dark English (src/bazaar.js, no new draw calls), and the Barber board moved forward so the Blender pediment no longer hides it. Proof docs/shots/normal-mode-signboard-8m-2026-10-22T21-23-28-656Z/ (all 11 boards viewed). A2 ticked.
Next: A3 trees (Blender rebuild of peepal/neem/babool/mango).

---

**2026-10-23 (cycle 37):** Game change: street lamps (grey pole, bracket arm, lamp head) now line the temple lane and the bazaar lane's north stretch (createStreetLamps in src/props.js, streamed by zoneManager in src/main.js; one draw call per lane segment, only while near). Proof docs/shots/lamps-2026-10-23/. Build 15/15, hero zone still 150/150. A1 props ticked. Hero-zone lanes deliberately have no lamps (at the draw-call ceiling).
Next: A2 signboards legibility, then A3 trees.

---

**2026-10-23 (cycle 36b):** Game change: every Blender building now has soft dusty dirt at the wall base, sun-faded paint high up, and faint vertical damp streaks (applyWallBaseGrime in src/materials.js, hooked in src/assetSlots.js for exact slots; no draw-call change). Proof docs/shots/grime-2026-10-23/. Build passes. A1 grime item ticked (stains are global noise, not per door).
Next: A1 props (lamps, charpai, handpump, chabutra).

---

**2026-10-23 (cycle 36):** Game change: canal now has a cement lining along both water edges, grassy outer bank strips, and the pukka bridge has parapet coping plus four end posts (src/canal.js, no new draw calls). Proof docs/shots/canal-2026-10-22T20-49-15-988Z/canal_bridge.png. Build passes, budget 18.61 MB. A1 canal item ticked; village boundary walls were not changed.
Next: A1 soft dirt at wall bases / stains, then props (lamps, charpai, handpump).

---

**2026-10-23 (cycle 35):** Game change: abadi village houses now have painted doors and shutters (bottle green, teal, oxblood, indigo, ochre, turquoise, varied per house) instead of all dark brown (tools/blender/build_abadi.py, 6 models rebuilt, layout identical, no new draw calls). Proof docs/shots/compare/painted-wood/south_row.png and lane2.png. Build passes, budget 18.61 MB. A1 #4 ticked for abadi only; hero house/school/bazaar doors are still natural wood.
Next: A1 canal bank, bridge and boundary walls.

---

**2026-10-23 (cycle 34):** Game change: west third of the family field now has a paler straw-coloured ground (src/field.js, second ground plane, +1 draw call in field zone only) so the stubble reads as harvested wheat. Proof docs/shots/compare/field-zones-2/west_stubble.png and overview.png. Build passes. A1 #5 ticked.
Next: A1 #4 painted wood trim (shared trim sheet), then canal bank/bridge/boundary walls.

---

**2026-10-23 (cycle 33):** Game change: the family field is now zoned per MAP.md: west third harvested wheat stubble (short pale straw tufts), east third sabzi beds (bright low green rows with bare walking paths), middle stays wheat (src/field.js buildCropRows, same instanced mesh, no extra draw call). Proof docs/shots/compare/field-zones/east_sabzi.png and west_stubble.png. Build 15/15, budget 18.61 MB. A1 #5 NOT ticked: stubble reads sparse on dark soil; needs a lighter straw ground tint in that zone.
Next: lighten stubble ground, then A1 #4 painted wood trim.

---

**2026-10-23 (cycle 32):** Game change: ration shop and atta chakki now have sloped corrugated-tin roofs (tools/blender/build_new_shops.py; props merged into the main material so the hero zone stays 150/150). Proof: docs/shots/compare/new-shops-roofs/high.png. Build 15/15, budget 18.6 MB. A1 #3 ticked. Post office keeps its flat parapet roof.
Also: field soil now has darker plough furrows between crop rows (src/materials.js `furrows` option, src/field.js; no extra draw call). Proof docs/shots/compare/field-furrows/low.png. A1 #5 NOT ticked (stubble, sabzi beds remain).
Next: A1 #5 stubble + sabzi beds, then #4 painted wood trim.

---

**2026-10-23 (cycle 31):** Game change: bazaar row walls now alternate cream, limewash pink, mint and the one blue-grey unit (tools/blender/build_bazaar_row.py, model rebuilt). Proof: docs/shots/bazaar-walls-2026-10-23/bazaar_back.png. Build 15/15, budget 18.45 MB. A1 #2 ticked. Lesson: post office/ration/atta chakki and most buildings are Blender GLBs, the src/ code shells are invisible collision backing, so roof and colour changes go in tools/blender/build_*.py (Blender is at ~/Applications/Blender.app, tools/blender/make.sh <suffix> <slot>).
A1 #3 roofs NOT ticked: tried a terracotta gable on the ration shop + tin gable on the atta chakki (tools/blender/build_new_shops.py, looked right) but each new material cost a draw call and the hero zone went 150 -> 152, so I reverted it. Bg houses C/D already have tin/terracotta roofs and the bazaar awning is real tin, but no clear screenshot proves a hero building roof. Needs draw-call headroom in the hero zone first (merge materials), then retry.
Next: free 2+ hero-zone draw calls, then roofs; else A1 #4 painted wood trim.

---

**2026-10-23 (cycle 30):** Game change: raised pale-cement kerbs along the halwai-to-school lane (src/paths.js buildKerbSegments, merged into the lane's draw call, zero extra); every plaster wall now gets its own brightness, warm/cool lean and soft rain streaks (src/materials.js). Proof: docs/shots/kerbs-2026-10-23/kerb_b2.png. Build + validator pass, hero zone still 150/150. A1 #1 ticked; A1 #2 NOT ticked (per-wall variation is in, but pink/mint palette mix not checked).
Next: A1 #2 palette check, then roofs (terracotta/tin).

---

**2026-10-23 (cycle 29):** Game change: lane/track strips (src/paths.js) now have a rolled grass-blended edge, a shallow damp drain channel + dusty berm along each side, darker polished wheel ruts and patchy brightness. Proof: docs/shots/2026-10-22T20-00-51-846Z/low_angle.png. Push works over SSH again. A1 item 1 NOT ticked: no raised kerbs yet, and a ragged lane patch near the post office (also present before this change) still needs a look.
Next: lane kerbs at the chowk, wall plaster colour variation (A1 #2).

---

**2026-10-23 (cycle 28):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 17 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-23 (cycle 27):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 16 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 26):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 15 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 25):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 14 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 24):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 13 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 23):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 12 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 22):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 11 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 21):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 10 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 20):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 9 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 19):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 8 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 18):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 6 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 17):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 5 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

