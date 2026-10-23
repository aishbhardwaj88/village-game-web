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

---

## 2026-10-23 (art director, from live play)

**Neem/peepal canopy trees: PASS.** Real branching, layered sprigs, convincing depth.
This is the quality bar. Do not regress it.

**Wall-base and compound greenery: FAIL.** The creeper/tulsi/banana shrubs built in
`src/scenery.js` / `src/vegetation.js` read as flat cardboard leaves on bare stringy
stems, like pondweed, not a cared-for Indian village plant. Specific faults:
- Leaves are single flat cards, too large, too few, all facing one way.
- Stems visible as bare lines with nothing on them.
- One silhouette repeated everywhere; no species variety.
- No mass at the base, so the plant floats rather than sits in the soil.

**Required rework, in this order:**
1. Build them the way the neem canopy is built: many small overlapping sprigs with
   several leaves per card, angled in different directions, denser toward the centre.
2. Give each plant a base mass (low foliage clump at the soil) so it sits in the ground.
3. **Variety is the point.** At least 5 visually distinct plant types, used in
   different places, never the same silhouette twice in one view:
   - bougainvillea: dense small leaves + magenta/orange bract clusters, sprawling over walls
   - tulsi: compact rounded bush in a pot, small dense leaves
   - banana: few very large broad fronds, tall, split edges, completely different shape
   - marigold: low mound with orange/yellow flower heads
   - money plant / creeper: trailing vines down a wall, heart-shaped leaves
4. Instance them. Variety must come from type, scale and rotation, not draw calls.

**Verdict: FAIL. Rework before any new scenery work.** The trees prove the technique
already exists in this codebase; apply it to the shrubs.

**Signboards: FIX (2026-10-23).** `src/signboards.js`. Current boards put Hindi large
and dark, English small and pale grey underneath. Most players read English more
fluently than Hindi, so the readable line is the wrong one.

New rule (now in CLAUDE.md, supersedes the old Devanagari-first-and-larger rule):
- Hindi stays on the top line, but SMALLER and lighter. It is authentic texture.
- English on the second line, clearly LARGER and BOLDER than the Hindi.
- Both lines the same dark paint colour (maroon, near-black, deep blue). The pale
  grey English on a cream board is the main reason it cannot be read.
- Pass test: a screenshot at normal walking distance where the English reads clearly.
  If only the Hindi reads, the board has failed.
Apply to every board in the village, not just the hero zone.

---

## 2026-10-23 (art director) - PLANTS: FAIL AGAIN. The technique is wrong.

**This supersedes my earlier note today telling you to "use the neem canopy
technique." That advice was wrong and I am withdrawing it.** Building more flat
polygon leaves produces more craft cutouts, not a plant.

**The actual diagnosis.** Every shrub, flower and grass clump in the game is
hand-built geometry with a FLAT SOLID COLOUR material: no texture map, no alpha,
no variation inside a leaf. That is why they read as paper cutouts, and no amount
of extra polygons will fix it. The banana fronds, the marigold discs, the
bougainvillea dots and the grass blades all fail for this one reason.

**The correct technique, which is what real games use: alpha-cutout photo textures.**
- A plant is a handful of crossed quads (2 to 4 planes intersecting) with a
  photoscanned leaf/flower PNG mapped on, using alpha to cut out the leaf shape.
- The detail comes from the PHOTOGRAPH: real veins, colour variation leaf to leaf,
  thin translucent edges, slight damage. None of that can be modelled cheaply.
- This is cheaper than the current geometry, not more expensive.

**Sources (CC0, already our approved sources):**
- ambientCG, filter by type Atlas: the "Leaf Set", "Flower Set", "Foliage", "Grass"
  and "Bamboo" categories are exactly these alpha cutout sheets.
- Poly Haven models section for any full plant model that fits the budget.
- Download the largest available, downscale to 1K (512 for small props) as per CLAUDE.md.

**Requirements:**
1. Every plant uses an alpha-cutout texture. No solid-colour leaf geometry anywhere.
2. Material: `alphaTest` for the cutout, `side: THREE.DoubleSide`, and roughness from
   the texture set. Leaves must not be shiny plastic.
3. Slight per-instance colour tint variation so no two plants are identical.
4. Five distinct species minimum: bougainvillea, tulsi, banana, marigold, trailing
   creeper. Each from its OWN texture, not a recoloured copy of one sheet.
5. Instanced. Variety from texture, scale and rotation.

**Pass test:** a close-up screenshot where an individual leaf shows internal detail
(veins or colour variation). A leaf that is one flat colour is an automatic fail.

**Why the neem tree passes:** its sprigs are small and numerous enough that the
silhouette carries it at distance. Up close it has the same flat-colour problem and
will need the same alpha-cutout treatment eventually. Do not use it as the model for
how to build a close-up plant.

---

## 2026-10-23 (art director) - SIGNBOARDS: PASS. SHOP CONTENTS: FAIL.

**Signboards: PASS.** English is now bold, dark and readable at distance with Hindi
above. Correct. Do not regress this.

**Shop interiors and props: FAIL.** Every item inside every shop is an untextured
primitive with a flat colour fill: packets are flat rectangles, the TV is a black box,
the radio is a brown box, jars are plain cylinders, sweets are beige blobs. It reads
as cardboard shapes on a shelf, not a shop. Same fault as the plants: solid-colour
geometry with no texture.

**Two separate fixes. Do both.**

### 1. Download real CC0 3D models for anything generic
These exist and must not be hand-built. Sources: Poly Haven models (CC0), Poly Pizza
(CC0/CC BY, credit in docs/CREDITS.md), ambientCG. Get these at minimum:
- TV, radio/cassette player, ceiling fan, wall clock, light bulb/tube light
- Weighing scale with pans, gas cylinder, stove, kadhai, pressure cooker
- Glass jars with lids, bottles, tins, metal buckets, brass/steel vessels
- Wooden crates, cardboard boxes, sacks, cane baskets
- Plastic stools, wooden benches, folding chairs, charpai
- Hanging bulbs, cables, switchboards

Shrink each with tools/shrink.js. 512 textures for small props per CLAUDE.md.

### 2. Items that must stay hand-built need real TEXTURES, not colour fills
Masala packets, biscuit packets, bangle cards, soap bars, sweets trays and similar
Indian retail items do not exist as CC0 models. Keep them as simple geometry, but:
- Every packet gets a printed-label texture on its front face: invented brand name in
  Devanagari + English, a colour band, a small illustration. Never a solid colour.
- Vary the labels. A shelf of 20 identical packets is as wrong as a flat one.
- Sweets, fruit and vegetables get a real surface texture with colour variation, not
  one beige fill.
- Keep the no-real-brands rule: invent every name and mark.

### Budget
Draw calls are the constraint, not disk (assets are 21MB of 40MB). So:
- Instance every repeated prop. 20 packets is ONE instanced draw call.
- Merge each shop's static contents into one mesh per material.
- Shop interiors only build when the player is in that zone.
- If a shop cannot fit its props in budget, report it. Do not silently drop detail.

**Pass test:** a screenshot standing at a shop counter where at least five items read
as recognisable objects with surface detail, and no item is a single flat colour.

---

## 2026-10-23 (art director) - FARMLAND: FAIL. Too sparse, no variety.

**Faults in the current khet:**
- Sparse. Bare soil dominates; a real field is a continuous mass of crop with soil
  barely visible between rows.
- A perfect mechanical grid: identical spacing, identical rotation, identical scale.
  Real planting is uneven.
- One crop over the entire visible farmland. UP farmland is a patchwork of plots.
- Same flat-colour geometry fault as the plants (see today's plant verdict).

**Required: a patchwork of distinct crop plots, not one field.**
Use `reference-from-unity/MAP.md` zoning where it gives one. Crops to build:
- **Sarson (mustard):** waist-high, dense, bright yellow flower mass on green. The
  most recognisable UP field. High priority.
- **Genda (marigold):** low dense rows of orange and yellow flower heads, grown as a
  cash crop for garlands.
- **Ganna (sugarcane):** tall, well above player height, dense cane walls. Already
  planned as the sugarcane maze south.
- **Gehun (wheat):** green-gold ears, dense, bends in the wind.
- **Dhaan (rice):** flooded paddy with standing water reflecting sky, bright green
  shoots in water. Visually very different from the dry crops.
- **Aam ka baagh (mango orchard):** mature canopy trees in rows, already partly built.
- **Sabzi plots:** small mixed vegetable beds near the village, with low beds and
  bamboo stakes.

**Growth-stage variety is free realism.** Not every plot is mature. Mix in:
ploughed bare furrows, just-sown sapling rows, half-grown, fully mature, and one
harvested plot with stubble and stacked straw. This breaks repetition at no cost.

**Technique: same as the plant verdict.** Alpha-cutout CC0 photo textures
(ambientCG type=Atlas: Grass, Foliage, Flower Set) on crossed quads. No solid-colour
geometry. Per-instance jitter in position, rotation, scale, and tint.

**Season consistency.** Pick ONE season and keep every field consistent with it.
Late winter (Feb to March) carries the most variety: mustard in bloom, wheat
green-gold, sugarcane tall, marigold flowering. State the chosen season in
docs/WORLD.md so later work does not drift.

**Budget.** Density is the point, so instancing is mandatory:
- One InstancedMesh per crop type per plot. Thousands of plants, one draw call.
- Distance LOD: full plant near, simplified card mid, flat textured ground far.
- Zone-stream plots, as already done for buildings.
- If density cannot be reached inside the draw-call ceiling, report the number.
  Do not quietly thin the crop.

**Pass test:** a screenshot standing at a field edge showing at least three visually
distinct crop plots, where the near plot's soil is mostly hidden by crop, and no two
adjacent plants are identical in rotation and scale.

---

## 2026-10-23 (art director) - TUBEWELL: FAIL. Plus a structural finding.

### 1. A correctness bug, fix first
**The tubewell's hauz (water tank) is full of grass instead of water.** A tubewell
pumps groundwater into the hauz, which feeds the field channels. Grass growing in it
is nonsense.
- Fill it with water: a reflective surface sitting below the rim, slight movement,
  the sky reflecting in it.
- **Audit the whole greenery pass for the same mistake.** Last night's scatter
  appears to have treated any flat surface as plantable ground. Check drains, the
  canal, the pond, the johad, rooftops, the water corners and every trough or tank.
  Report every place plants were scattered where they do not belong.

### 2. The structural finding, and the real reason this looks bad
There are now **two tiers of building quality in this game**:
- **Blender-built** (`tools/blender/build_*.py`): house, school, bazaar row, temple,
  halwai, tea stall, general store, chowk, abadi rows, kachcha, bg houses, flower
  stall, new shops. These have bevels, wall thickness, recessed openings, real
  textures. They look right.
- **Code-built primitives** (`src/farmSites.js`, `src/scenery.js` and similar):
  tubewell, pump house, hauz, charpai, benches, field props. Plain cuboids and
  cylinders with flat colour. These look like placeholder blockout.

CLAUDE.md already says every building and prop is to be modelled in Blender. The farm
and scenery structures were missed.
**Add to the backlog: audit every structure still built from code primitives and
convert each one to Blender, same standard as build_house.py.** List them before
starting so the scale of the work is visible.

### 3. Tubewell specifically
A UP tubewell is a recognisable thing. Build it properly:
- Small brick or plastered pump room, real door and window, tin or RCC roof with
  overhang, electric meter box and cable drop on the outside wall.
- Vertical bore pipe into the ground, horizontal outlet pipe discharging into the hauz.
- Hauz: cement tank, water inside, a stained waterline, damp patch on the ground at
  the outlet, a gate or notch where it feeds the channel.
- Kachcha irrigation channels (naali) running from the hauz into the field.
- Scatter of use: a bucket, a coiled pipe, slippers at the door, a cycle leaning.

### 4. Charpai, and this applies everywhere it appears
A charpai is **not a plank on four legs**. It is a wooden frame on four turned legs
with **crisscrossed jute or niwar webbing** forming the sleeping surface, sagging
slightly in the middle. The weave is the whole character of the object. Build it as
a proper woven lattice, or as a textured alpha-cutout panel if geometry is too costly.

### 5. Doors and windows, a standing rule from now on
Flat coloured rectangles are not doors or windows. Every one needs:
- **Door:** frame, visible panels or vertical plank lines, a handle or latch,
  hinges, a threshold, and a recess into the wall. Painted wood with wear near the
  handle, not a flat colour.
- **Window:** frame, an **iron grille** (standard in UP villages), shutters or a
  curtain, a sill, and a recess. Never a flat dark rectangle.
Apply this to every building in the game, including ones already marked done.

**Pass test:** a screenshot at the tubewell showing water in the hauz, a woven
charpai, a door with a frame and panels, and a window with a grille.
