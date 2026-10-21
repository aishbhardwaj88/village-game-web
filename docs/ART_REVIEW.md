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

### School - FIX
- Keep the layout if gameplay needs it, but add from the reference: big shade tree in a round brick planter, tree with a tyre swing and a kite stuck in it, row of tall eucalyptus behind the building, hopscotch chalk on the ground, bougainvillea at the gate, bicycles by the hand pump, school bags under the verandah.
- Inner walls read grey: cream walls with the orange/terracotta plinth band as in the reference.
- Trees are pale grey polygons: they must be green.

### Halwai - FIX (close to pass)
- Add: wooden fascia signboard above the opening, 2 to 3 plastic chairs (maroon/grey/green) beside the counter, firewood stack, TV antenna on the roof.
- Walls: two-tone (pale grey upper, mustard lower band) with soft weathering stains (cared-for, not broken), as in the reference.
- Matkas are faceted: smooth them.

### Tea stall - FIX
- Signboard missing: "Sharma Tea Stall" board on the roof edge, Devanagari on top.
- Roof: corrugated tin sloped roof as in the reference; remove the odd X frame above it.
- Add steam from the kettle, blue water can, red stool kept.

### General store - FIX (close to pass)
- Signboard text is faded and illegible: make it bold red Devanagari + English beneath, as in the reference.
- Lower wall mustard band on sides and back, cream walls.

### Bazaar row - FAIL
- Compare shot is from a different, distant angle: redo it straight from the front like the reference.
- The 8 rolling shutters must be clearly visible in their bold colours (teal, green, red, mustard, blue, olive, grey, plus the puncture shop) and the 8 signboards above them must be visible and legible.
- Walls cream with mustard plinth band and one pale blue section, parapet with pilasters, tin awning on brackets.
- Frontage life: bicycle, plastic chairs, wooden bench, potted plants, steps.
- The dark grey mass behind the row reads as a blank block: give it real roofs/parapets.

### Not yet reviewed
Canal (note: water reads as flat swimming-pool blue; should be muddy green-brown nahar with sloped earth banks and gentle ripples; bridge needs concrete parapets), trees (must be green, not grey-beige).

## Review 2 (21 Oct 2026, ~08:00 IST)

Nothing from review 1 has been reworked yet. Review 1 items stay open and come FIRST.

### Chowk, temple, flower stall - FIX (decent)
- Temple: good shape and scale. Tree beside it is grey faceted polygons: must be green, rounder canopy.
- Flower stall: good. Add more marigold garland colour.

### Post office, ration shop, atta chakki - FIX
- All three signboards are blurred and illegible: same signboard regression as review 1, fix in the shared signboard code path once for every Blender building.
- The giant grey faceted tree in front of the camera hides the shot: trees green, and frame compare shots without anything blocking.

### Village-wide (highest visual impact, do right after the review 1 items)
- TREES: every code tree reads as grey-beige faceted rocks. Make them green (neem/peepal/mango greens), smoother rounded canopies, darker trunks. This single fix changes every screenshot.
- GROUND: still dry grey-brown everywhere. Add green grass patches and verges along lanes, around trees and buildings.
- Draw calls (hero zone 145/150): YES to per-zone distance culling / LOD for Blender buildings so the rest of the village can be rebuilt. Do not drop building detail to fit.
- References wanted (NEEDS_YOU): not needed from the user. Temple and new shops without references are fine as built; judge them against the look of the referenced buildings.
