# Art review - verdicts from the art director (Claude chat), updated after every review

Builder rules: read this file at the start of EVERY cycle. Any item marked FAIL or FIX is top priority, before new buildings. Never edit verdicts; when you have reworked an item, add a line under it: "Reworked <date>: <compare shot path>" and wait for the next verdict (keep working on other things meanwhile). Self-ticked checklists do not count as passed; only a PASS here counts.

General rules from review 1:
- Compare shots must use the SAME camera angle as the reference image (iso 3/4 from above for cutaways, straight front for elevation sheets). Different angles hide problems.
- Every building signboard must be visible and legible in its compare shot, English bold, larger and on top; Hindi beneath in a lighter weight (art director, 24 Oct - supersedes the old Devanagari-first rule). Signboards are missing or illegible on the new Blender models (tea stall, general store, bazaar row): a regression, fix everywhere.
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

---

## 2026-10-23 (art director) - STREET LAMPS: FAIL.

Current lamp is a plain grey cylinder with a smooth dome shade. It reads as a generic
western street light, not a UP village one. Replace every instance in the village.

**What a UP village street light actually is.** Research real references before
building; do not guess from this list alone. The common types:
- **Concrete/RCC pole** (most common on village lanes): square or octagonal tapered
  concrete post, visibly cast, often with hairline cracks, rust streaks and faded
  painted banding near the base. Not a smooth grey tube.
- **Galvanised steel tube pole**: thinner, with a swan-neck bend at the top, often
  slightly leaning, weathered and rust-spotted at joints and base.
- **Fitting:** a flat rectangular or shallow-curved tube-light / LED street light
  housing, or an older cone shade with a visible bulb. Not a smooth rounded dome.
- **Wiring is the key detail and is currently missing entirely:** a cable running down
  the outside of the pole, often loosely clipped or taped, sagging overhead wires
  between poles, and a small junction or switch box partway up.
- **Lived-in detail:** a tilted pole, a poster or sticker pasted at eye height, a
  faded painted number, a bird sitting on the arm, cable ties, a nest.
- **Panchayat solar street lights** are now very common in UP villages: a short steel
  pole with a small tilted solar panel, a battery box, and an LED head. Including a
  few of these alongside the older poles is accurate and adds variety.

**Requirements:**
1. At least two distinct lamp types in the village, not one repeated model. Concrete
   poles on the abadi lanes, solar lights at the chowk and newer areas is a sensible
   split.
2. Real textures: concrete with stains and wear, steel with rust at the joints. No
   flat grey fill. Same alpha-cutout/texture discipline as the rest of today's notes.
3. The down-cable and overhead wire runs between poles must be present. They do more
   for believability than the lamp head itself.
4. Per-instance variation: slight lean, slight rotation, differing wear.
5. Model in Blender, per CLAUDE.md, or source a CC0 model and retexture. Instance it.

**Pass test:** a screenshot of a lane showing two different lamp types, visible
down-cables and sagging wires between poles, and no two poles identical.

---

## 2026-10-23 (art director) - HAND PUMP PLACEMENT + NEW HOUSE ROW.

### 1. Hand pump is in the middle of the lane: FIX
No hand pump sits in the middle of a road. They are at the EDGE, against a wall or at
a corner, where people queue without blocking traffic. The current one also sits
directly in the vehicle path and will obstruct the tractor, trolley, cart and cycle.
- Move every hand pump and water corner to the lane edge, against a wall or at a
  junction corner, with its drain soak-away and wet patch beside it.
- **Then audit every prop placed in a navigable lane or vehicle route.** Anything a
  vehicle must pass through is a bug, not decoration: matkas, charpais, carrom mats,
  stools, benches, crates, animals, laundry lines.
- Drive the full vehicle route after the fix and confirm nothing blocks it. The
  world validator's reachability checks must still pass.

### 2. New house row facing the temple and farmland: BUILD
The village currently presents **blank rear walls** to anyone approaching from the
temple or the fields. That is the first view a player gets of the village and it
looks unfinished.

Required:
- Add **one more row of houses facing the temple and farmland**, with proper fronts:
  doors, windows with grilles, verandahs, chabutras, plant pots, charpais outside.
- The existing lane becomes the **back street** behind it.
- Shift the existing rows as needed to make room for the new street between them.
- The new street gets the same treatment as the current one: kerbs, drain, street
  life, lamps, greenery.
- No elevation of the village should present only blank backs. Check the view from
  the temple, the fields, the canal and the approach road, and report any remaining
  blank-rear elevation.

**This instruction updates the map.** The art director is the author of MAP.md, so
this supersedes the existing abadi layout there. Update
`reference-from-unity/MAP.md` with the new row and the new street in the same commit,
so the map stays the single source of truth and later work does not revert it.

Watch: collision, the reachability checks, zone streaming boundaries and the
draw-call ceiling all change with a new row. If the hero view cannot hold the new row
inside budget, report the number rather than thinning the detail.

**Pass test:** a screenshot taken from the temple looking at the village showing a row
of house FRONTS, and a screenshot of the full vehicle route completing with nothing
blocking the lane.

---

## 2026-10-23 (art director) - STOP HAND-BUILDING GENERIC OBJECTS.

**Standing instruction, applies to all remaining work.** Before building ANY object
from code or Blender, first search the CC0 asset sources for it. Hand-build only what
genuinely does not exist as a free asset. Too much time has gone into modelling
objects that are freely available at far higher quality.

**Search these first, every time:**
- Poly Haven (models + textures, CC0)
- ambientCG (textures, atlases, some models, CC0)
- Poly Pizza (large prop library, CC0 and CC BY, credit in docs/CREDITS.md)
- Kenney, Quaternius (CC0) as a fallback only if the style matches

**Objects that definitely exist as free assets and must NOT be hand-built:**
hand pump, mud pots and matkas, terracotta flower pots, planters, wooden stools,
plastic stools, chairs, benches, charpai frames, handcarts and thelas, bicycles,
buckets, metal vessels, brass pots, crates, sacks, baskets, barrels, jars, bottles,
tins, TV, radio, fan, weighing scale, stove, gas cylinder, kadhai, utensils, tools,
rope, tyres, ladders, water tanks, street lamp poles.

**Trees and plants: still failing, and the most visible problem in the game.**
The lane trees in the current build remain low quality. Plants and trees are the
single biggest realism lever in an outdoor village game, so treat them as the top
priority after the water bug.
- Take complete CC0 tree and plant MODELS where they exist, rather than generating
  foliage in code. Poly Haven's model library and Poly Pizza are the first places to
  look.
- Where a model is not available, use the alpha-cutout photo-texture technique from
  today's earlier plant verdict. Never solid-colour leaf geometry.
- Species needed, visually distinct from each other: neem, peepal, banyan, mango,
  babool, eucalyptus, banana, bamboo clump, bougainvillea, tulsi, marigold,
  trailing creeper, sugarcane, ornamental palm.
- Vary scale, rotation, tint and age per instance. No two adjacent plants identical.

**Process requirement:** before each batch of object work, write the candidate assets
and their licences into docs/CREDITS.md, then build. If a needed object genuinely has
no free asset, say so in the report and only then hand-build it.

**Pass test:** a lane screenshot where the trees, pots, stools and hand pump all read
as real objects with surface detail, and the report names the source and licence of
each downloaded asset.

---

## 2026-10-23 (art director) - CARROM SCENE: good idea, wrong place and wrong build.

**Keep the idea, move it and build it properly.**

### Placement
- Move the carrom out of the lane entirely. It belongs in the **common area near the
  shops** (chowk or the bazaar frontage), where people actually gather.
- One carrom scene in the village, as a landmark, not the same mat repeated in
  several lanes. Repetition kills it.
- Nothing in a vehicle route. Same rule as the hand pump.

### Build
- **A table in the centre** with the carrom board on it, not a mat on bare ground.
- **Four older men seated around it**, one per side, on stools or chairs. Use the
  placeholder people for now, replaced when the real characters arrive.
- Carrom board: wooden frame, playing surface with the printed circle and arrow
  lines, four corner pockets, coins and a striker scattered mid-game, not neatly set.
- Signs of a real game in progress: a few coins pocketed and sitting beside the
  board, a tea glass or two, a cloth, a bowl of boric powder, slippers off beside
  the stools.
- Source the table, stools and chairs as CC0 models per today's standing rule. Do not
  hand-build them.
- Textures on everything: wood grain on the board and table, worn paint. No flat fills.

### Loose scatter currently nearby
The coloured rectangles beside the mat (presumably the ludo board) read as flat
coloured paper. Either build ludo properly as a cloth board with printed texture and
real pieces, in a different location, or remove it.

**Pass test:** a screenshot at the shops showing four seated figures around a table
with a textured carrom board mid-game, and no carrom anywhere in a lane or vehicle
route.

---

## 2026-10-23 (art director) - COLLISION: FAIL. Highest priority after the water bug.

**People, animals and vehicles walk through walls, buildings and trees.** This breaks
the illusion harder than any art fault. Nothing else in the queue matters if a
villager strolls through a house.

**The rule, absolute:**
- No person, animal or vehicle may pass through a wall, building, tree, pole, parked
  vehicle or any other solid object, ever.
- A building is entered **only through its door**, by walking to the doorway and
  through the opening. Never through a wall.
- This applies to every moving thing: the player, every NPC routine, every animal,
  every vehicle, the monkey, the postman, the bazaar crowd.

**Likely cause, check it rather than assuming:** the world validator's checks run on
STATIC placement at build time. NPC waypoint routines appear to move without
consulting the collision resolver at runtime, and trees may have no colliders at all.

**Required:**
1. Every NPC and animal moves through the same collision resolver the player uses.
   No routine sets a position directly without a collision check.
2. Give trees, poles, lamp posts, hand pumps, charpais, carts and every other solid
   prop a collider. Audit for solid objects with no collider and list them.
3. Waypoint paths must be validated as walkable at build time. A path that clips a
   building is a build failure, not a visual glitch.
4. NPCs that enter buildings route to the door first, then through the opening.
   If a routine cannot reach its destination without passing through geometry, that
   routine is wrong and must be re-pathed.
5. Vehicles collide with buildings, walls, trees and each other.

**Verification, and this is the part that failed before:** a single screenshot proves
nothing here. Run a real continuous play span, several minutes, watching the NPC
routines complete their full loops, and confirm no overlap at any point. The existing
per-frame `devCheckPenetration()` should be extended to cover NPCs and animals, not
just vehicles, and any penetration logged as a failure.

**Pass test:** a multi-minute recorded run where every NPC completes its full route
with zero wall, building or tree penetration, and every building entry happens through
a doorway.

---

## 2026-10-23 (art director) - HALWAI SHOP + ROOFTOP FITTINGS: FAIL.

Same root fault as every other prop note today: hand-built untextured primitives.
The halwai reads as a toy kitchen. Apply the standing sourcing rule.

### Source these as CC0 models, do not hand-build
- **Halwai:** kadhai (large iron wok), gas burner / chulha, gas cylinder, plastic
  chairs (the ubiquitous moulded monobloc chair), plastic stools, steel trays,
  glass display case, steel tongs and ladles, steel buckets, earthen matkas,
  wooden counter, hanging weighing scale, steel thali and katori.
- **Rooftop fittings, named by the art director as commonly available:**
  **Sintex-style plastic water tank (tanki)** on a raised platform, **TV antenna**
  (the old aluminium yagi type), dish antenna, solar panel, water pipes running down
  the wall, loose cable runs, a brick stack, a parapet.
- Rooftop fittings go on MANY buildings, not one. Vary tank colour (black, blue,
  white), tank size, antenna type and orientation. Instance them.

### Food items, which have no good free assets
Samosas, jalebi, laddoo, barfi, gulab jamun and similar will not exist as CC0 models.
Build these by hand, but:
- Real surface texture with colour variation: fried golden-brown with darker edges,
  syrup sheen on jalebi, sugar grain on barfi. Never a flat beige blob.
- Vary size, rotation and shape slightly across a tray. A tray of identical clones
  is as wrong as a flat one.
- Pile them realistically: heaped in a tray, stacked in a pyramid, not floating in
  a neat grid.

### Fire and heat
- The chulha or burner needs a visible flame and a heat shimmer, plus soot on the
  kadhai base and the wall behind it.
- Steam or smoke rising from the kadhai. The halwai is the most alive spot in a
  village bazaar and currently looks switched off.

**Pass test:** a screenshot at the halwai counter showing a real kadhai with flame
and soot, plastic chairs, a glass display case, and sweets with surface variation,
plus a rooftop screenshot showing water tanks and antennas across several buildings.

---

## 2026-10-23 (art director) - BUILD EVERYTHING AS MOVABLE UNITS.

**Context:** the art director will rearrange the whole village layout tomorrow
(shop and landmark placement is currently scattered and needs rethinking). Asset
quality work continues today and tonight. **That work must not be lost or made
expensive to move when the layout changes.**

**Architectural requirement, applies to all remaining work:**

1. **Every place is a self-contained unit.** A shop, house, landmark or farm plot is
   one addressable thing: its geometry, props, colliders, interaction points, NPC
   spawn and waypoint anchors, signage and greenery all belong to that unit.
2. **One anchor position per unit, read from one source.** Position and rotation come
   from a single coordinate table (`reference-from-unity/MAP.md` / `WorldData/*.json`
   or a dedicated placement data file), never hardcoded in several places.
3. **Moving a place must be a one-number change.** Change the anchor, and the
   building, its props, its colliders, its interaction points and its NPC routes all
   move with it. If moving a shop today requires editing geometry in multiple files,
   that is the bug to fix before building more.
4. **Build everything in local coordinates, place by transform.** Do not bake world
   positions into geometry or into merged meshes in a way that cannot be re-placed.
   Merging per-unit is fine; merging across units into one world mesh is not.
5. **Waypoints and NPC routes reference units, not raw world coordinates** wherever
   possible, so a route survives its destination being moved.
6. **Report the current state honestly.** Before tomorrow, audit how placement works
   today and write a short note in `docs/handoff.md`: which places are already
   movable by one value, and which have coordinates baked in. That list is what the
   art director needs in order to plan the rearrangement.

**Priority is unchanged.** Collision first, water bug, then assets and textures.
This note is about HOW to build, not what to build next.

---

## 2026-10-23 (art director) - LAUNDRY LINES: FAIL. Good idea, flat execution.

Clothes drying on lines is the right instinct and should stay everywhere it is. The
execution is flat coloured rectangles. Rebuild them as real hanging cloth.

**Required:**
1. **Real garments, not rectangles.** A village line carries recognisable shapes:
   sari (long, hung folded over the line, the largest item), dhoti, kurta, salwar,
   dupatta, shirt, trousers, child's clothes, towels, bedsheet, gamcha. Silhouette
   is what makes it read, so the shapes must differ from each other.
2. **Cloth texture, not solid colour.** Fabric weave, print patterns, a sari border,
   check or stripe on a gamcha, faded sun-worn colour. Same no-flat-fill rule as
   everything else today. Source CC0 fabric textures from ambientCG and Poly Haven.
3. **Hang like cloth.** Draped over the line with a fold at the top, sagging under
   its own weight, wrinkles and creases, uneven hems. Not a stiff flat plane.
4. **Sway in the air, as the art director asked.** Gentle animated movement, the
   bottom edge moving more than the top, each garment slightly out of phase so they
   do not move in unison. Subtle, a light afternoon breeze, not flapping.
5. **Cloth pins (clips) on the line** at the top of each garment, two or three per
   item, visible as small objects clipping the cloth to the rope.
6. **The line itself** should sag between its two supports under the weight, not be a
   straight horizontal bar.

**Also consistency:** if the laundry sways, the game should not have everything else
perfectly still. Check whether other light things can carry the same breeze: tree
foliage, flags, garlands, dupattas on people, smoke, loose paper. State in the report
what moves and what does not, so the village reads as one consistent afternoon.

**Budget note:** sway should be a vertex shader or a simple per-instance animation,
not per-frame CPU work on many objects. Instance the garments, vary by texture,
scale, rotation and phase offset.

**Pass test:** a close screenshot of one line showing at least four differently
shaped garments with fabric texture and visible pins, and a short recording where
they sway out of phase with each other on a sagging line.

---

## 2026-10-23 (art director) - BUILD A "VISIT PLACE" REVIEW MENU. Do this first, it is small.

**Problem:** the art director reviews the game daily and has to walk across the whole
village to look at anything. There is currently no way to jump to a location without
the browser console, which is not an acceptable workflow.

**Build a simple place-jump menu. Treat this as a small, high-priority task: it costs
under an hour and saves review time every single day for the rest of the project.**

Requirements:
1. **In the pause menu**, a "Visit place" list. No URL parameters, no console, no
   typing. Open pause, pick a place, land there.
2. Lists every significant location by its plain name, in both scripts as per the UI
   language rule: school, house, halwai, tea stall, general store, bazaar row, chowk,
   temple, post office, ration shop, atta chakki, tubewell, canal and bridge, mango
   baagh, khet, pond, johad, haveli, gaushala, khel maidan, mela ground, highway
   cluster, mandi, and every other MAP.md place.
3. Generated FROM the placement data, not a hand-typed list, so a new place appears
   automatically and nothing goes stale when the layout is rearranged tomorrow.
4. Lands the player standing at a sensible viewing spot facing the place, on the
   ground, outside walls, never inside geometry.
5. Does not break an in-progress mission: either pause the quest state or warn
   before jumping during a mission.
6. Available in the normal build, not only dev mode. The art director plays the live
   site, not a dev URL. Keep it unobtrusive so it does not intrude on a real player:
   placing it under the existing Notebook map is a reasonable home for it.

**Pass test:** from the live site, open pause, pick "School", and land standing in
front of the school facing it.

---

## 2026-10-23 (art director) - TASK MENU + CORNER MINIMAP. Build both.

### 1. Task menu
Players need to choose what they are doing, not only follow one fixed sequence.
- In the pause menu: a **Tasks** list showing all eight story missions and every side
  job, each with its name in both scripts and its state (done, current, not started).
- Selecting one makes it the active task: objective text, waypoint and dialogue all
  switch to it.
- Do not let a player skip into a mission whose setup has not happened in a way that
  breaks state. Either set up the required state when switching, or mark that task
  unavailable with a one-line reason. Never leave the game in a broken state.
- Keep "Continue roaming" as its own entry: free roam is a valid chosen task.

### 2. Corner minimap
**Research how shipped open-world games do this before building. Match the
convention, do not invent one.** The established pattern:
- A small map in one screen corner, bottom-left or bottom-right, kept clear of other UI.
- The player shown as an arrow or cone indicating facing direction.
- The map rotates with the player (standard for navigation) with the player arrow
  fixed at centre; or north-up if that reads better here. Pick one, state the reason.
- Landmark icons for shops and key places, the active objective marked distinctly.
- A short scale/zoom that shows the immediate surroundings, not the whole village.
- Clicking or tapping it opens the **existing full Notebook map**. The minimap is the
  always-on glance; the notebook is the full view. One system, two scales.

**Design call worth making deliberately:** the Notebook map is a diegetic, hand-drawn
idea and it suits this game. The minimap should look like a corner of that same
notebook (paper, ink lines, hand-lettered labels), not a generic GPS radar. That
keeps the game's visual identity intact and is a stronger portfolio piece than a
stock minimap. If a hand-drawn minimap proves unreadable at small size, say so and
propose the alternative rather than silently shipping a generic one.

**Mobile:** the minimap must not crowd a phone screen or sit under the thumb. Check
it at phone width with the on-screen joystick visible. Consider a smaller size or a
toggle on touch devices.

**Accessibility:** let the player hide the minimap from the pause menu.

**Pass test:** a phone-width and a desktop screenshot, both showing a readable corner
minimap with the player arrow and the active objective, and the Tasks list in the
pause menu with mission states visible.

---

## 2026-10-23 (art director) - NAVIGATION: FAIL. The village is unnavigable.

**Confirmed by audit: all 42 places in `src/freeRoam.js` are built.** The art
director could only find 6 or 7 of them. This is a wayfinding failure, not a missing
content failure. Treat it as high priority: content nobody can find has no value.

### 1. Remove discovery gating from the notebook map
The map currently reveals a place only after the player walks near it. **The boy has
lived here his whole life, but the PLAYER has not.** Hiding places makes the map
useless as a navigation tool, which is its entire purpose.
- Show all 42 places on the notebook map from the start.
- Keep a subtle "visited" mark if some sense of progress is wanted, but hide nothing.

### 2. Diegetic wayfinding in the world
A village has its own signage. Build it, rather than relying on UI alone:
- Painted direction signs at lane junctions and the chowk, with an arrow and the
  place name in both scripts (English bold and larger, Hindi beneath lighter -
  art director 24 Oct).
- A painted village notice board at the chowk listing key places.
- Milestone-style markers on the approach road and at the highway.
- Make routes legible: the lane itself should lead somewhere, with kerbs, drains,
  lamps and street life continuing along it, not stopping after a few metres.

### 3. Audit whether places are actually reachable and findable
Walk, on foot, from the house to every one of the 42 places using only what a player
can see. For each, report:
- Is there a visible path or lane leading to it, or is it stranded on open ground?
- Is it visible from any lane, or hidden behind other buildings?
- How long does the walk take?
- **List every place that is not findable without the map.** That list is what gets
  fixed next.

### 4. The far eastern cluster
Places sit from roughly x=-135 to x=226. The eastern group (health centre, chemist,
manihari, sabzi rehris, johad, masjid, Jain mandir, haveli, gurukul, khel maidan,
highway, mandi) is a long walk from the village core with little between.
- Either connect it with a real road carrying traffic, trees and roadside detail so
  the walk is worth taking, or report that the distances should be reduced and let
  the art director decide during tomorrow's layout rework.
- Do not silently move anything. Layout is the art director's call.

**Pass test:** starting at the house with no map open, a player can reach the school,
the bazaar, the temple, the post office and the chowk by following visible lanes and
signage alone, and the notebook map shows all 42 places from the first load.

---

## 2026-10-24 — Review of the 23 Oct overnight shots (Claude chat, art director to confirm)

Shots reviewed: `docs/shots/halwai-fire-2026-10-23/wide.png`, `close.png`,
`docs/shots/rooftops-2026-10-23/r1.png`, `r5.png`.
These are the four newest proof shots in the repo. Aishwarya has not confirmed these
verdicts yet; treat them as the working verdict until she overrules them.

### VERDICT: halwai-fire wide.png — FIX
- The stall itself is the best work in the set: shelves, jars, kadhais, brick chulha
  bases, matkas and the roof water tank all read as real objects.
- **No signboard on the halwai stall.** The standing signboard rule applies to every
  shop. This is the same regression already logged on the Blender models.
- The "live smoke, oil steam and flame flecks" read as small white specks floating in
  front of the lens, not as smoke. At this distance they look like dirt on the camera.
- Background buildings on the right are flat untextured colour blocks with no
  openings. The far LOD is too crude to appear in a hero shot.
- Grass is a flat green carpet with sparse tuft cards. The dirt apron is fine.
- The round bush on the right is a green blob, a code shape, not a plant.
- **Two capsule people are in frame** on the right. Capsule placeholders must be kept
  out of proof shots, framed out or hidden.

### VERDICT: halwai-fire close.png — FIX
- Best surface work so far: kadhai metal, brick, shelf jars, counter wood.
- Smoke and steam are large soft white blobs in front of the camera. They read as lens
  bokeh, not as steam over oil. Flame flecks are flat yellow dots and do not read as
  fire. Rework both; reference a real halwai kadhai: thin rising wisps, not spheres.
- **The halwai is a bald capsule head** behind the counter, in frame.
- Walls are flat grey plaster with none of the grime pass visible.
- A grey panel with black rectangles hangs at the right edge. Unclear what it is;
  it reads as a placeholder or an error. Identify or remove it.

### VERDICT: rooftops r1.png — FAIL
- **Debug text "1 fps" is burnt into the frame, top left.**
- **The tutorial overlay ("Move with WASD...") covers the bottom third.**
- **A capsule person stands dead centre and dominates the shot.**
- The camera is jammed against a wall. This is filed as a rooftops proof shot and
  **no rooftop is visible.** It does not prove the item it is attached to.
- Walls are flat untextured ochre and brown at this distance, no plaster relief.
- The creeper is a bright lime-green cutout card with a glowing yellow-green edge.
  It reads as a code shape, not a plant, and the colour is outside the palette.
- The antenna is a grey cross of sticks.
- 1 fps means this came from a headless run, so it is not evidence of how the game
  looks or runs in play.

### VERDICT: rooftops r5.png — FAIL
- **Debug text "3 fps", top left.** **Tutorial overlay across the bottom.**
- **A giant capsule torso fills the bottom centre of the frame.**
- The house row behind it is genuinely good: per-row limewash variation, green
  shuttered doors, planters, kerb, creepers. That part passes.
- Ground is a flat brown mud plane with no detail.
- Again filed as a rooftops shot with no rooftop in frame.

### STANDING RULES that come out of this review
1. **A proof shot must show the thing it claims to prove.** If the item is rooftops,
   a rooftop is in frame. A shot that does not show its subject does not tick a box.
2. **No debug text in a proof shot.** No fps counter, no dev overlay, no console text.
3. **No tutorial or dialogue overlay in a proof shot.** Dismiss it before capturing.
4. **No capsule placeholder people in frame.** Frame them out or hide them for the
   capture. Capsules in a proof shot make the shot unreviewable.
5. **Headless shots at 1 to 3 fps are not proof of look or performance.** Say the fps
   in the report when a shot is headless.
6. **Every shop gets a signboard.** Re-audit all 42 places for missing signboards.
7. Before ticking any box, open the shot and ask: would the art director accept this
   as evidence? If not, retake it before ticking.

### Priority order for the rework
1. Fix the screenshot tool so rules 2, 3 and 4 are automatic, not remembered.
2. Re-take proof shots for every box ticked on 23 Oct that has a bad shot.
3. Halwai smoke, steam and flame rework.
4. Signboard audit across all 42 places.
5. Far-LOD background buildings: they are flat blocks in hero shots.

---

## 2026-10-25 (art director) - NEW DIRECTION. Re-prioritise everything.

**What changed:**
1. **Plants and organics are OFF your list.** The art director will build trees,
   plants, crops and flowers herself. Leave what is in the game as it stands. Do not
   spend another cycle on foliage, lotus, crops, grass or greenery. Do not remove
   what is there.
2. **She is drawing isometric and technical references in Gemini for the main
   places** (gurukul, post office and others) which will REPLACE what is in the game.
   So: any place you build or touch stays **generic and cheap**. Do not polish a
   building that is going to be replaced.
3. She has no time to give input. **Only work that needs no decision from her.**

**The consequence, and this is the important part:** effort now goes into work that
SURVIVES her replacements. A detailed wall on a building she is redesigning is wasted.
A working mission, a collision fix, or a clean drop-in slot is not.

### Tier 1 - the pipeline for her incoming models. Highest value, do this first.
Her drawings become models that must drop into the game without a rebuild. Make that
a one-file operation, the way `docs/asset-slots.md` already works for vehicles.
- [ ] **Add a building slot for every significant place**, same mechanism as the
      existing asset slots: drop `gurukul.glb` into `public/assets/models/` and it
      replaces the placeholder, auto-scaled, grounded and positioned, with the
      placeholder hidden but kept as fallback.
- [ ] **Publish the target dimensions** for every building slot in
      `docs/asset-slots.md`: width x height x depth in metres, plus which way the
      front faces and where the door opening sits. She is drawing to these numbers,
      so they must be correct and complete before she finishes drawing.
- [ ] **Build the PLACES anchor table** recommended in the 25 Oct audit: one
      `id -> x, z, rotation` source consumed by main.js, wayfinding, milestones,
      minimap and keep-outs. Coordinates are currently baked across up to 10 files
      per place (temple is in 10), which makes both moving and swapping expensive.
- [ ] Keep each place's props, colliders, interaction points and NPC anchors attached
      to its unit so a swapped model does not orphan them.

### Tier 2 - systems that survive any redesign
- [ ] Finish A0 collision: remaining unticked items, including build-time waypoint
      validation and extending devCheckPenetration to NPCs and animals. Verify over a
      multi-minute run.
- [ ] A-2b Tasks list and corner minimap; map click-to-travel with the 44px hit areas.
- [ ] A-2c wayfinding: direction signs, notice board, milestones, lane continuity,
      and deliver the findability audit list.
- [ ] Missions and side jobs: complete everything in docs/MISSIONS_PLAN.md, make all
      8 missions and every side job playable start to finish without a dead end.
- [ ] Mobile and performance: real phone check, load time, streaming, draw calls,
      title screen before assets finish loading.
- [ ] Audio pass: ambience per zone, interaction sounds, mix.
- [ ] Save, continue, pause, accessibility, controls on touch.

### Tier 3 - generic props only
Furniture and objects survive a building being replaced, so these are still worth
sourcing: CC0 models for stools, chairs, vessels, crates, sacks, baskets, tools, TV,
radio, fan, scale, stove, tanki, antenna. Place them generically. **Do not hand-craft
bespoke interiors for places being redesigned.**

### Do NOT do
- Any tree, plant, crop, flower, grass or greenery work.
- Detailed exterior or interior polish on places the art director is redesigning.
- Anything that needs her decision. Park it in NEEDS_YOU.md and move on.

---

## 2026-10-25 (art director) - COLLISION STILL BROKEN. STOP EVERYTHING ELSE.

**docs/PLAYTEST_READY.md claims "Collision: you now stop at trees, walls, cows,
buildings, the pond and the johad." That claim is FALSE.** In live play the art
director walked through:
- trees
- the tractor
- the khel maidan string boundary
- some buildings

**This is the self-grading failure again.** The fix was reported done without a test
that could have detected it failing. Do not report collision fixed again until the
automated test below passes and its output is in the commit message.

### Nothing else gets worked on until this passes
Not the slots, not the minimap, not props. Collision first, alone.

### Build a real automated collision test: `tools/collision-test.js`
A screenshot cannot prove this. Build a test that drives the real movement resolver
and fails the build on any pass-through.

1. **Enumerate every solid object in the world** from the live scene: every tree,
   building, wall, vehicle, parked vehicle, animal, pole, lamp, hand pump, charpai,
   cart, trough, tank, boundary rope or string, fence and prop.
2. **For each one, drive the player at it** from at least 4 directions using the real
   movement code, at normal walking speed and at running speed, over enough frames to
   push well past its far side.
3. **Assert the player never ends up inside or beyond it.** Any object the player
   passes through is a FAILURE, listed by name and position in the test output.
4. **Repeat the same test for every vehicle** (tractor, trolley, cart, bike) and for
   every NPC and animal routine.
5. **Report the count**: objects tested, objects passed, objects failed, each failure
   named. Put that line in the commit message.
6. Wire it into `npm run build` so a regression cannot ship silently.

### Likely causes to check, do not assume
- Objects with no collider at all. The string or rope boundary at the khel maidan
  almost certainly has none, and thin or non-box shapes are the usual gap.
- Colliders attached to a placeholder that was hidden when a real model loaded, or
  lost when geometry was merged, instanced or zone-streamed in.
- Streamed objects whose collider is registered only when the zone is built, leaving
  a window where geometry is visible but not solid.
- Fast movement tunnelling through thin colliders between frames.
- The tractor being a mountable vehicle may bypass solid handling when not mounted.

**Pass test:** `node tools/collision-test.js` reports zero failures across every
solid object, every vehicle and every NPC, and the art director can walk the village
without passing through anything.

---

## 2026-10-25 (art director) - SIGNBOARD LANGUAGE: FINAL DECISION, REVERSES 23 OCT.

**This supersedes the 23 Oct signboard rule. It is the final word. Do not flip it
back, and do not apply the 23 Oct version anywhere.**

**Reasoning the art director gave:** the Devanagari is what makes the place read as
UP. A Japanese game writes everything in Japanese first, with English second, and
that is what tells you where you are. The Hindi carries the identity. But most
players cannot read Hindi, so English must still be comfortably legible.

**The rule, on every signboard in the world:**
- **Line 1: Hindi (Devanagari), BOLD, the larger and dominant line.**
- **Line 2: English, not bold, smaller than the Hindi, but still clearly legible at
  normal walking distance. It must NOT be shrunk to a token.** A player who cannot
  read Devanagari must still be able to read the English without walking closer.
- Both lines in the same dark paint colour. No pale grey English on a pale board.
- Suggested starting point, then judge it by eye in a screenshot: English cap height
  around 60 to 70 percent of the Hindi, never below 55 percent.

**Pass test:** a screenshot at normal walking distance where the Devanagari clearly
dominates and the English below it is still read without effort. If the English
cannot be read at that distance, it is too small and the board has failed.

**Apply to every board in the village**, including the 20 recently added. UI text
elsewhere in the game keeps the English-first rule in CLAUDE.md; this change is for
painted world signage only.


---

## 2026-10-25 (builder) - Reworked: collision, signboards, Tier 1 slots

**Collision (the 25 Oct "STILL BROKEN" entry).** Cause found: a collider existed only where a mesh was hand-tagged
`userData.collider`, so everything built without the tag (village edge walls, the khel maidan boundary rope and posts,
haystacks, stalls, stools, poles, the old haveli, the bullock cart's bullocks) was walk-through. Fixed structurally:
`src/autoColliders.js` derives colliders from what is visible in the player's knee-to-chest band, `src/solidRules.js`
lists the few deliberately walkable things (plants, hanging cloth, ground surfaces), `src/walkable.js` holds stair
footprints, doorways between hand-tagged walls stay open. `tools/collision-test.js` (in `npm run build`) drives the real
resolver at every solid from 4 directions at walk, run and lag-spike speed, drives the bike, cart and tractor+trolley
(forward and reverse) into every solid, walks every NPC route, and checks 19,515 cells of visible geometry against the
collider list with all 130 streamed zones built. It reported 116 failures before the fix, 0 after; disabling thin-box
collision on purpose makes it report 1,193, so it can fail. Output is in the commit message of 991d257.
Not covered by the test, so still worth a real walk: the camera clipping through derived props is switched off on
purpose (low props never pull the camera in); a real phone has not been tried.

**Signboards (25 Oct FINAL).** Every painted board now goes through one painter, `src/signPaint.js`: Hindi bold and
larger on line 1, English not bold below at 70% of the Hindi cap height (floor 58%, rule floor 55%), one dark colour.
Shop, place and new-shop boards, the bazaar row and chowk tea stall, direction posts, the notice board, milestone
stones, the donation board and the classroom hand-wash poster. Proof shots are in `docs/shots/signboards-final-2026-10-25/`
and `docs/shots/normal-mode-signboard-8m-*`. The smallest English is on the 0.5 m hero tea-stall board: judge that one by eye.

**Tier 1.** `src/anchors.js` is the one placement table (zone streaming, PLACES, village/temple/baagh/field/chowk
centres read it). Every streamed place has a drop-in slot (`public/assets/models/<name>.glb`, `src/siteSlots.js`),
published with fit box, front and door in `docs/asset-slots.md` (generated by `tools/site-slots-doc.mjs`),
and `tools/site-slot-test.js` proves the swap in `npm run build`.

---

## 2026-10-26 (art director) - STAGED PLACES: FAIL on texture, colour and greenery.

She looked at the 22 staged places. **Structure, layout and proportions are now right
and match her LAYOUT.md specs. Do not regress that.** Everything else failed.

### 1. Surfaces read as flat colour
Brick does not read as brick, plaster has no grain, tin has no corrugation. This is
the second time this has failed. **Stop building new places until it is fixed.**

Diagnose it properly rather than guessing. The staged path is:
`arch.py` writes `dopahar_set` / `dopahar_repeat` into glTF extras ->
`tools/strip-textures.mjs` drops the embedded copies ->
`src/stagingYard.js`'s `sharedSetMaterial()` re-applies the shared set.
Any break in that chain gives exactly this symptom. Check, in order:
- Do the staged meshes still carry UVs after `strip-textures.mjs`? Print a UV range.
- Does `swapShared()` actually fire for every mesh, or are some materials missing
  `userData.dopahar_set`?
- `box_uv()` gives UVs in METRES, and `t.repeat.set(repeat, repeat)` multiplies them.
  Print the effective tiles-per-metre for a known wall and sanity check it: brick
  should be roughly one tile per 0.5 to 1 m, not 50 tiles and not 0.02.
- Is `vertexColors: true` multiplying the map down to near-flat?

**Proof required: a CLOSE-UP render of one brick wall, one plaster wall and one tin
roof, from about 2 m, beside a crop of her reference.** If individual bricks are not
visible in that close-up, it is still failing. A wide iso shot proves nothing here.

### 2. Colours do not match her references
The tints are not her palette. **Sample the actual colours out of her
`Places V1/<place>/MAIN_*.png` images** and use those in `kit.finalize`'s tints. Do
not pick colours by eye or reuse the village defaults. Her reference is the authority
for colour exactly as it is for size.

### 3. Greenery and grass are missing
Her drawings show grass, bushes, creepers, potted plants and trees as part of each
composition. The staged places are bare dirt.
- **This supersedes the earlier "skip organics" instruction for PLACE COMPOSITION.**
  Build the greenery that appears in her drawings.
- The no-code-built-organics rule still stands: use real CC0 plant and grass models
  (`public/assets/plants3d/`, `plants/`, `trees/` already exist; Poly Haven, Poly
  Pizza, ambientCG for anything missing). Never hand-built polygon foliage.
- Still skip the khets and field crops: sugarcane, mustard, paddy, mango_baagh.

### Order
1. Fix the texture pipeline and prove it with close-ups.
2. Re-tint every staged place from her reference colours.
3. Add the greenery each drawing shows.
4. Only then build the remaining places.

---

## 2026-10-26 (art director) - LOAD TIME: cut the weight, do NOT cut quality.

Load time is 12.8 s on simulated 4G against a 10 s target, and `public/assets/` is at
43 MB against the 40 MB ceiling. Models are 28 MB of it. Her decision, approved:

### Do this, it is free
**Stop shipping the staging yard in the main payload.** The 22 staged places
(`src/stagedPlaces.js`, `src/stagingYard.js`) exist for the art director's review, not
for players. Load them only when she travels to the yard.
- ~10 MB out of the initial payload against a 4 MB target, so this alone should fix it.
- Zero visual change anywhere. The yard still works exactly as now when visited.
- Everything stays in the repo. Nothing is deleted.

Then re-measure with `tools/load-time-test.mjs` and report the new number.

### Only if it is STILL over after that
KTX2/Basis compression, applied carefully. **She will not compromise on quality**, so:
- Apply it ONLY to ground, walls, roofs, soil and props.
- **NEVER to signboards, painted text, or anything a player reads.** It softens
  sharp high-contrast edges and the signboards took real work to make legible.
- Produce a before/after comparison at the same camera and show her before keeping it.

### Do not do, unless she asks
- Do not drop the HDRI further. It is already halved.
- Do not drop prop textures to 512.
- Do not apply heavier mesh simplification to the hero buildings.

**Quality is not the lever. Payload is.**

---

## 2026-10-26, 10:30 IST - three decisions from the art director. All DEFERRED.

**1. Load time: deferred.** "We will figure it out once the game has been done."
- Stop spending cycles on it. Do NOT try KTX2, do NOT trim textures or meshes for
  size, do NOT re-run the load-time test every cycle.
- Keep staying inside the 40 MB asset ceiling as normal, that rule is unchanged.
- Note for later: my earlier claim that dropping the staging yard would save ~10 MB
  was WRONG, the yard was never in the Play payload. The 12.5 MB is the core village.

**2. Canal and pond: paused.** "Once we have built everything, we will first see if
it's needed and also what will be the location."
- Do NOT make a terrain decision, do NOT build raised-bank workarounds, do NOT dig.
- Leave both as they are. Close the question in NEEDS_YOU as deferred.

**3. Lanes to the four stranded places: leave it.** "We will build the lanes once we
have rearranged the map."
- Family field, gaushala, mango baagh, mandi keep their signposts and no new lanes.
- Close that question in NEEDS_YOU as deferred.

**Close all three in `docs/NEEDS_YOU.md` as deferred so they stop being re-raised.**

## What to work on instead, in this order

1. **Finish A0-TEX.** It is still the open FAIL.
   - Re-tint EVERY staged place from colours sampled out of her
     `Places V1/<place>/MAIN_*.png`. Only the ration shop and puncture shop are done.
     The other 20 are not.
   - Add the greenery each drawing shows, with real CC0 plant models. Potted plants
     were reverted for reading as dead twigs: find better models rather than dropping
     the item, and if no good free model exists for one plant, say so in NEEDS_YOU
     and move on.
   - Produce the 2 m close-up proof (brick wall, plaster wall, tin roof) beside a crop
     of her reference. That proof has not been delivered yet.
2. **`houses_kit`**: the 8 types are built and instanced in the yard but have no
   `houses_kit*` model wired the way the other places are. Finish that wiring.
3. **`vehicles`**: `Places V1/vehicles/` has a LAYOUT.md and no corresponding build.
   Read it and build what it specifies.
4. Then back to `docs/BACKLOG.md` section A in order: collision leftovers, signboards,
   missions and side jobs, audio, menus, mobile.

Do not stop. Do not wait for her. She is away for at least an hour.
