# World state (read only when a task touches world content)

## 1. What this is

**Dopahar** (village: Amrai Khera) — a free web build of the village game, three.js +
Vite, vanilla JS, no framework. Runs from a link on phone and desktop browsers, deployed
to GitHub Pages. The Unity project (`../Village nostalgia`) is the future downloadable
version — **never touch it from here.** `START_HERE.md` has the folder map.

Current world: a hero zone (house/school/halwai/tea-stall — `src/village.js`,
`src/shops.js`) connected by lane to a bazaar row of 8 trade-specific shops + a chowk
(second tea stall, chabutra) + a village mandir/flower stall (`src/bazaar.js`,
`src/temple.js`) and a general store on the bazaar approach lane (`src/shops.js`); a handful of
procedural code-built trees (peepal/neem/babool, `src/trees.js`, re-added 2026-10-02
after no licensed replacement could be retrieved — see `docs/parked.md`) plus low
vegetation/ground variation (`src/vegetation.js`). A wheat/sabzi field with a dirt
track loop and fine dust motes
(`src/field.js`, `src/dust.js`); vehicles kitbashed to `Places V1/vehicles/LAYOUT.md`'s
exact measurements — walk/bike/tractor+detachable-trolley/bullock cart
(`src/vehicles.js`). The house and school each have one real walkable interior
(courtyard/rooms/stairs-to-roof; one classroom) with their own interactions (lie on the
charpai, pump water, water the tulsi, write on the blackboard, sit on a bench —
`src/interactions.js`); a `src/assetSlots.js` registry auto-loads a real `.glb` in
place of any placeholder, named per-object, once one exists (`docs/asset-slots.md`).
**Eight missions** — one continuous story, Dada's 75th birthday afternoon
(`docs/STORY.md`): M1 bring jalebi home; M2 take a tiffin to school and bring your
sister home; M3 load wheat sacks (one at a time on foot, up to 3 via the trolley) to
the kirana shop, buy something at the general store, report to Pitaji
(`src/wheatErrand.js`); M4 find the postman on his lane/bazaar cycle route for Bua's
letter; M5 collect Dada's kurta from the bazaar's darzi (tailor) unit; M6 a monkey
snatches it, a distance-triggered chase along the bazaar frontage/chowk recovers it
(`src/npcRoutines.js`'s `createWaypointRun`); M7 drive the tractor+trolley to the
mango baagh east of the field (`src/baagh.js`), knock mangoes from 3 marked trees
(a 4th tree species, `src/trees.js`'s `buildMangoTree`); M8 a staged rooftop-landing
ending scene, Dada's birthday, into the credits. All eight share one objective/
dialogue/waypoint/money UI (`src/quest.js`, `src/dialogue.js`, `src/interactions.js`,
`src/waypoint.js`) that save/continue via localStorage (`src/save.js`); a shared "buy"
interaction at every shop counter plus two signature ones (sabzi pan-balance weighing,
bangle try-on). NPCs with simple waypoint-loop/follow/one-shot-run routines
(`src/npcRoutines.js`) — the hero zone's Maa/halwai/child/teacher/sister/Pitaji, the
postman and the (usually hidden) monkey, plus the bazaar's 8 shopkeepers + 4 villagers
+ 1 seated as one shared `InstancedMesh` (`src/bazaarLife.js`). One continuous
afternoon (`src/dayline.js`) warms sun/sky/fog gradually across all eight missions,
start/end values in `docs/look-standard.md`. A title screen, pause menu with a live
quality setting and a master volume slider (`src/pause.js`, `src/quality.js`), and a
credits screen generated from `docs/CREDITS.md` (`src/credits.js`), procedural Web
Audio (`src/audio.js`, mixed/balanced, ducks under dialogue), a gradient sky +
HDRI-for-lighting-only (`src/sky.js`, `src/scene.js`). Coordinates match
`reference-from-unity/MAP.md` / `WorldData/*.json` (1 unit = 1 m) where MAP.md gives
one (bazaar/temple placements read off orthos or picked on open ground instead — see
`docs/parked.md`). **Draw-call budget: hard ceiling raised 140→150 (2026-10-20,
art director's call) to match `docs/budgets.md`'s own documented runtime target —
still enforced per-zone by `tools/world-validator.js`'s check 8a (one fixed camera
per built zone, add a new one in the same commit as any new zone), aim 120 per zone,
150 is the hard fail. 150 is not the real fix for the full MAP.md world, though: zone
streaming (only build/show zones near the player) plus distance/frustum culling and
instancing every repeated thing (animals, trees, crops, background houses, props via
`InstancedMesh`) is the actual plan for Step D's zone-by-zone build-out — see
`docs/look-standard.md`'s Budgets section and `src/mergeUtils.js` before adding new
static geometry; merge same-material meshes rather than one mesh per part, and
instance repeated NPCs/props (`src/bazaarLife.js` is the reference pattern).**

**Art pivot (2026-10-21, art director's call): code-built primitive geometry
(boxes/cylinders) for buildings reads as toys, not real structures. Tripo now makes
ONLY people, vehicles, and trees. Every building, shop, wall, road, canal/bridge, and
prop is modelled by hand in Blender instead** — `tools/blender/` (headless, installed
to `~/Applications/Blender.app`, no sudo, run via `blender -b --python <script>.py`),
one parametric Python script per asset built from `Places V1/*/LAYOUT.md`/`SCALE.md`
numbers and reference photos: real bevels, wall thickness, roof overhang, chajjas,
parapets, recessed doors/windows, CC0 PBR textures, baked vertex-colour AO, exported
`.glb` and run through `tools/shrink.js`. The OLD code-built geometry for a converted
building is kept as an invisible, un-merged, named sub-group (`<name>_old`, built via
`mergeGroupByMaterial` locally then added to the global merge's `skipNames` in
`main.js` — see `src/village.js`'s `buildHouse()` for the reference pattern) so the
world validator/collisions stay exactly as before and the piece stays independently
hideable once its real model loads through the same asset-slot system Tripo models
use. First one done: the house shell (`tools/blender/build_house.py`,
`public/assets/models/house_shell.glb`) — walls/door/roof/parapet/trim/chajja
confirmed working in-game; decorative windows were built, confirmed correct in the
exported file, but don't render in three.js for an unresolved reason and were cut for
v1 (see `docs/parked.md`). Remaining build order: school, halwai, tea stall, general
store, bazaar row (8 shops), temple complex, post office, ration shop, atta chakki,
background houses, boundary walls, lanes/kerbs/drains, canal+bridge, then props.

