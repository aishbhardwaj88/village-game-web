# Art review - verdicts from the art director (Claude chat), updated after every review

Builder rules: read this file at the start of EVERY cycle. Any item marked FAIL or FIX is top priority, before new buildings. Never edit verdicts; when you have reworked an item, add a line under it: "Reworked <date>: <compare shot path>" and wait for the next verdict (keep working on other things meanwhile). Self-ticked checklists do not count as passed; only a PASS here counts.

General rules from review 1:
- Compare shots must use the SAME camera angle as the reference image (iso 3/4 from above for cutaways, straight front for elevation sheets). Different angles hide problems.
- Every building signboard must be visible and legible in its compare shot, Devanagari larger on top, English beneath, as in the reference. Signboards are missing or illegible on the new Blender models (tea stall, general store, bazaar row): a regression, fix everywhere.
- Colour: match reference wall colours and the two-tone plinth bands (mustard/ochre lower band is on most references). Walls read flat grey in game; add the colour, soft AO and gentle variation.
- Speed: about 10 minutes per building is too fast. Spend the time to match the reference.

## Review 1 (21 Oct 2026, ~07:00 IST)

### House - FAIL
- Courtyard must be ENCLOSED by the house: rooms on two/three sides (L or U plan) around an open-to-sky aangan, with the gate in the low front wall. In game the yard is outside a single block.
- The huge external staircase dominates the front: move the stair inside the courtyard against a wall, narrower, as in the reference.
- Missing: side cattle shed with sloped wood/tin roof and a cow; jhoola on its frame; creeper vines; dark blue-grey plinth band and string-course bands; louvred wooden shutters on windows; kitchen alcove with utensil shelves upstairs.
- Walls: pale blue-grey limewash with variation, not flat grey.
Reworked 2026-10-21: docs/shots/compare/house.png (same camera angle as the reference; a single-storey room wing now closes the west side of the aangan so the yard is enclosed on 3 sides with the cattle shed + cow, jhoola, creepers, louvred shutters and kitchen alcove already in; the stair still stands outside the block against its west wall. Trees and ground green.)

### School - FIX
- Keep the layout if gameplay needs it, but add from the reference: big shade tree in a round brick planter, tree with a tyre swing and a kite stuck in it, row of tall eucalyptus behind the building, hopscotch chalk on the ground, bougainvillea at the gate, bicycles by the hand pump, school bags under the verandah.
- Inner walls read grey: cream walls with the orange/terracotta plinth band as in the reference.
- Trees are pale grey polygons: they must be green.
Reworked 2026-10-21: docs/shots/compare/school.png (reference's own 3/4 angle from the lane side: green trees, row of 6 tall eucalyptus behind the main block, big shade neem in the yard with a tyre swing + a kite stuck in it (Blender), bougainvillea at the gate, bicycles by the pump, bags under the verandah, hopscotch were already in).

### Halwai - FIX (close to pass)
- Add: wooden fascia signboard above the opening, 2 to 3 plastic chairs (maroon/grey/green) beside the counter, firewood stack, TV antenna on the roof.
- Walls: two-tone (pale grey upper, mustard lower band) with soft weathering stains (cared-for, not broken), as in the reference.
- Matkas are faceted: smooth them.

### Tea stall - FIX
- Signboard missing: "Sharma Tea Stall" board on the roof edge, Devanagari on top.
- Roof: corrugated tin sloped roof as in the reference; remove the odd X frame above it.
- Add steam from the kettle, blue water can, red stool kept.
Reworked 2026-10-21: docs/shots/compare/tea-stall.png (the 'Sharma Tea Stall' board now stands directly on the sloped corrugated roof front, Devanagari on top; the odd X frame is gone; steam wisps rise from the kettle and pot; blue water can + red stool kept).

### General store - FIX (close to pass)
- Signboard text is faded and illegible: make it bold red Devanagari + English beneath, as in the reference.
- Lower wall mustard band on sides and back, cream walls.
Reworked 2026-10-21: docs/shots/compare/general-store.png (bold red Devanagari over English on a cream board, fully visible under the roof lip; the ochre lower band runs round the sides and back).

### Bazaar row - FAIL
- Compare shot is from a different, distant angle: redo it straight from the front like the reference.
- The 8 rolling shutters must be clearly visible in their bold colours (teal, green, red, mustard, blue, olive, grey, plus the puncture shop) and the 8 signboards above them must be visible and legible.
- Walls cream with mustard plinth band and one pale blue section, parapet with pilasters, tin awning on brackets.
- Frontage life: bicycle, plastic chairs, wooden bench, potted plants, steps.
- The dark grey mass behind the row reads as a blank block: give it real roofs/parapets.
Reworked 2026-10-21: docs/shots/compare/bazaar-row-front.png (straight-on front elevation cropped to the reference's own aspect: shutter curtains lowered with a bold trade-coloured shutter box over each of the 8 openings, warm bounce light so the -z-facing front is no longer a dark block; signboards legible in docs/shots/normal-mode-signboard-8m-2026-10-21T13-55-57-784Z/).

### Not yet reviewed
Canal (note: water reads as flat swimming-pool blue; should be muddy green-brown nahar with sloped earth banks and gentle ripples; bridge needs concrete parapets), trees (must be green, not grey-beige).

## Review 2 (21 Oct 2026, ~08:00 IST)

Nothing from review 1 has been reworked yet. Review 1 items stay open and come FIRST.

### Chowk, temple, flower stall - FIX (decent)
- Temple: good shape and scale. Tree beside it is grey faceted polygons: must be green, rounder canopy.
- Flower stall: good. Add more marigold garland colour.
Reworked 2026-10-21 (partial): the temple's neighbouring tree and every code tree are now green, rounder, with darker trunks (src/trees.js). Marigold garland colour on the flower stall: DONE 2026-10-23 (cycle 38as): ten hanging orange/saffron/yellow garland strands with a pink rose one on the front rod, same draw call, proof docs/shots/garland-2026-10-23/stall2.png.

### Post office, ration shop, atta chakki - FIX
- All three signboards are blurred and illegible: same signboard regression as review 1, fix in the shared signboard code path once for every Blender building.
- The giant grey faceted tree in front of the camera hides the shot: trees green, and frame compare shots without anything blocking.
Reworked 2026-10-21: signboards fixed once in the shared code path (src/signboards.js buildWideSignAtlas: wide cells instead of squashed square ones) for tea stall, general store, post office, ration shop, atta chakki; legibility proof docs/shots/normal-mode-signboard-8m-2026-10-21T13-55-57-784Z/. Compare-shot re-frame still to do.

### Village-wide (highest visual impact, do right after the review 1 items)
- TREES: every code tree reads as grey-beige faceted rocks. Make them green (neem/peepal/mango greens), smoother rounded canopies, darker trunks. This single fix changes every screenshot.
- GROUND: still dry grey-brown everywhere. Add green grass patches and verges along lanes, around trees and buildings.
- Draw calls (hero zone 145/150): YES to per-zone distance culling / LOD for Blender buildings so the rest of the village can be rebuilt. Do not drop building detail to fit.
- References wanted (NEEDS_YOU): not needed from the user. Temple and new shops without references are fine as built; judge them against the look of the referenced buildings.
Reworked 2026-10-21: TREES green (neem/peepal/mango greens, babool olive), smooth-shaded lumpy canopies with leaf clumps, dark trunks (src/trees.js); GROUND now real green grass patches over 70% coverage (src/materials.js + src/main.js); compare shots docs/shots/compare/house.png, school.png, bg-houses.png. Draw calls: per-area distance culling for the abadi (src/scenery.js); Blender hero buildings not yet distance-culled (hero zone sits at the ceiling).

## Review 3 (21 Oct 2026, ~09:00 IST)

Still no "Reworked" lines: reviews 1 and 2 stay open and come FIRST.
Good: bazaar signboards now clear the parapet (629c237), normal-mode re-proofs done.

### Background houses - FAIL
- References DO exist: Characters V1/buildings/house_1.png, house_2.png, house_3.png and Places V1/house/STYLE_ONLY_other_family_duplex.png. Rebuild the variants from these, with compare shots.
- Layout: an Indian abadi is DENSE. Houses share walls, line narrow lanes in continuous rows, with small courtyards, steps, drains, charpais, cattle, hand pumps between them. Two lonely houses in an empty field reads wrong. Cluster them along the lane network per MAP.md.
- Mix of 1 and 2 storeys, flat roofs with parapets and roof clutter (tanks, charpais, clotheslines), a few sloped tin/tile roofs; palette variety (limewash blue, cream, pink, mint) with ochre plinth bands.
- Triangles now 332k of 400k: use LOD and instancing for the clusters.
Reworked 2026-10-21: docs/shots/compare/bg-houses.png + tmp/abadi-shots/{lane_level,aerial,front_elev}.png (22 continuous rows of attached houses, 4 per row, along 5 lanes, from tools/blender/build_abadi.py: jharokha balconies, chajja doors, louvred shutters, flat parapet roofs with tanks/charpais/clotheslines, tin and clay-tile roofs, baada + hand pump; instanced, 3 models, per-area distance culling).
