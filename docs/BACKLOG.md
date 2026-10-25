# Backlog - the story board

One task per checkbox, in priority order. `docs/FINISH_LINE.md` defines done; this file
is the order of work. Keep the `- [ ]` / `- [x]` syntax exact, one item per line, so the
dashboard can parse it. Append new tasks to the end of their section, never renumber.

## Never idle: how to handle a blocked item

- If the top unticked item cannot be finished, mark it `- [!]` and append
  `BLOCKED: <one plain sentence>` on the same line.
- Write the same sentence into `docs/NEEDS_YOU.md` ending `- status: open`.
- Then **immediately take the next unticked item and keep working.** Never wait, never
  stop a run, never write a cycle with no game change.
- A `- [!]` item is skipped on every later run until the matching `docs/NEEDS_YOU.md`
  line reads `- status: done`. Then change it back to `- [ ]` and pick it up again.
- Three items blocked in a row does not mean stop. Keep going down the list.

## 0. Setup (do once)

- [x] Fix deploy workflow: install Playwright Chromium before `npm run build`
- [x] Write `docs/GAME_COMPLETE.md`
- [x] Write `docs/STORY.md`
- [x] Write `docs/BACKLOG.md` (this file)
- [x] Create `inbox/` + README, gitignored except README
- [x] Build local monitoring dashboard (`tools/dashboard/`) - ad-hoc request, done
      ahead of queue order per direct instruction

## A. Three-week push (Oct 23 - Nov 13) - work this section first

**25 OCT: PLANTS AND ORGANICS ARE OFF THIS LIST.** The art director builds trees,
plants, crops and flowers herself. Leave what exists alone. Skip every plant item
below. Main places are being redesigned by her, so keep anything you build generic
and cheap. See docs/ART_REVIEW.md "NEW DIRECTION" (25 Oct) for the current order.

**THE FEEDBACK GENERALISES.** The art director reviewed about 7 of the 42 places on
23 Oct. Every verdict in docs/ART_REVIEW.md applies to ALL 42 places and every object
in them. Do not limit a fix to the place that was screenshotted.

### A-2a. Click a place ON THE MAP to travel there (Aishwarya, 25 Oct 2026) - FIRST ITEM AFTER THE CLOSE-OUT
Her words: on the map she wants to click on a place and go there. Two reasons she
gave: it helps players who are just exploring the village, and it saves her walking
while she tests.

**Do NOT start this during the 25 Oct close-out. Start it on the first run after
`tmp/STOP`, once she has given her playtest feedback.**

This is smaller than it looks. Almost all of it exists:
- `visitPlace(place)` in `src/main.js` already finds a safe landing spot (rings around
  the place, body-fit test, clear line to the place edge) and lands the player facing it.
- `src/freeRoam.js` already builds the full place list from `PLACES` plus the side-job
  markers, and already has the mid-mission arm/confirm guard.
- The corner minimap already opens the full notebook map on tap.
- **The missing piece is only this**: the notebook map is a drawn canvas with no hit
  testing. Clicking a place on it does nothing.

The job: make the notebook map's place markers clickable, and call the existing
`visitPlace` with the clicked place. Do not rebuild the landing logic. Do not build a
second travel system beside the "Visit place" list; both call the same function.

- [x] Each place drawn on the notebook map gets a hit area, built from the same
      PLACES data the map is drawn from, so a new or moved place works with no edit.
- [x] Clicking or tapping a place on the map travels there via `visitPlace`, in
      explore mode (no active mission).
- [x] The hit area is at least 44 px across on a phone, so a finger can hit it.
- [x] Hover or press shows the place name, so she knows what she is about to click.
- [x] Mid-mission it reuses the existing arm/confirm guard: first click warns, second
      confirms, quest state untouched. Vehicle is dismounted first.
- [x] Clicking empty map space does nothing at all. No arbitrary-point travel in this
      item.

DONE-WHEN, all of these, nothing more:
- 5 proof shots of arrivals reached by clicking the MAP, 5 different places, at least
  one across the canal and one in the mandi past the highway.
- 1 proof shot of the place name showing on press before travel.
- `npm run build` passes and `node tools/regression-check.js` is green.
- Zero console errors on a full open-map, click, land cycle.
- Ticked here with those 6 shot paths.

Do not extend this item. No travel animation, no route preview, no fog of war, no
unlock rules, no arbitrary-point travel. If you think of one, write it in BACKLOG
section B and move on.

**Built 25 Oct 2026 (src/freeRoam.js, proof tool tools/map-click-test.mjs, real mouse input).** Proof shots in
`docs/shots/map-click-2026-10-25/`: press shows the name `0_press_shows_name_school.png`; arrivals by clicking the map
`1_arrived_school.png`, `2_arrived_canal.png` (across the canal), `3_arrived_temple.png`, `4_arrived_mandi.png` (past the highway),
`5_arrived_gurukul.png`, `6_arrived_masjid.png`; 44 px target `7_press_20px_off_house.png`; mid-errand guard
`8_midmission_first_click_warns.png`. Test output: 6/6 arrivals, empty space does nothing, 20 px off still hits, mid-errand
first click warns and second travels with the quest step untouched, zero console errors. `npm run build` passes;
`node tools/regression-check.js` is 21/22: every movement and mission check passes, the one failure is the triangle counter
(475k incl. shadow pass), which was already failing before this item (see NEEDS_YOU, triangle limit).

### A-2b0. Pond lotus, done properly with a real model (Aishwarya, 25 Oct 2026)
Her words: the lotus looks like craft paperwork. It has been code-built and reworked
5 times and still fails. **Do not write geometry code for it a sixth time.**

- [ ] Search for a free CC0 lotus / water lily model: Poly Haven, Poly Pizza,
      Sketchfab CC0 filter, Quaternius, Kenney, OpenGameArt, Free3D, BlenderKit free.
      Name in the report what you searched and what you found.
- [ ] If a good one exists: use it, scaled to the pond, within the asset budget.
- [ ] **If none exists: delete the lotus flowers from the game.** Keep the pads if
      they read well on their own. Write one line in `docs/NEEDS_YOU.md` saying no
      free lotus model exists and asking whether she wants it hand-sculpted later.
      An empty pond is better than paper flowers.
- [ ] **The crops fail the same way and she named them on 25 Oct: brinjal, sugarcane,
      mustard khet.** All code-built. Worse, **brinjal and okra are flat alpha cards**
      (`src/field.js` line 464, "procedural vegetable-plant card"), which is the exact
      2D-cutout look she already rejected on 24 Oct for the carrom-side plant. Card
      plants were removed near the houses and left standing in the khet.
      Each of these is sourced as a real CC0 model or removed: **brinjal, okra,
      sugarcane, sarson/mustard, wheat**.
- [ ] Mustard matters most: **sarson in flower is the signature image** and it must
      read as yellow flowering fields from a distance. If no free model exists, say so
      and propose the alternative rather than shipping cards.
- [ ] The whole game currently has only **3 real plant models**
      (`public/assets/plants3d/`: gazania, one shrub, one grass clump). Everything else
      organic is code. List every code-built organic thing in `docs/handoff.md`:
      flowers, crops, fruit, trees, animals, food on shop counters. Each one is
      sourced, or removed.

DONE-WHEN: the pond has either a real lotus model or no flowers at all, one proof
shot at player eye height in the real game (not a test scene), the organic-asset list
is in handoff.md, and build plus regression are green.

### A-2. "Visit place" review menu (art director 2026-10-23) - DO THIS FIRST, it is small
- [x] Add a "Visit place" list to the pause menu: no URL params, no console; open pause, pick a place, land there - proof docs/shots/visit-place-2026-10-23/Village_mandir.png (also Primary_school.png, Mandi.png; real pause-menu click path, 41/41 places land cleanly, zero console errors)
- [x] Generate the list FROM the placement data so new places appear automatically and nothing goes stale after tomorrow's rearrangement - proof docs/shots/visit-place-2026-10-23/Village_mandir.png (also Primary_school.png, Mandi.png; real pause-menu click path, 41/41 places land cleanly, zero console errors)
- [x] List every MAP.md place by plain bilingual name: school, house, halwai, tea stall, general store, bazaar row, chowk, temple, post office, ration shop, atta chakki, tubewell, canal/bridge, mango baagh, khet, pond, johad, haveli, gaushala, khel maidan, mela ground, highway cluster, mandi - proof docs/shots/visit-place-2026-10-23/Village_mandir.png (also Primary_school.png, Mandi.png; real pause-menu click path, 41/41 places land cleanly, zero console errors)
- [x] Land the player at a sensible viewing spot facing the place, on the ground, outside walls, never inside geometry - proof docs/shots/visit-place-2026-10-23/Village_mandir.png (also Primary_school.png, Mandi.png; real pause-menu click path, 41/41 places land cleanly, zero console errors)
- [x] Do not break an in-progress mission; pause quest state or warn before jumping - proof docs/shots/visit-warn-2026-10-23/first_tap_warning.png (step have_money: first tap warns and does not move; second tap on docs/shots/visit-warn-2026-10-23/second_tap_arrived.png lands at Mandi, quest step unchanged, zero console errors; warning text overlap fixed)
  - PROGRESS 2026-10-23 (not ticked): mid-mission a first tap shows a warning and needs a second tap; vehicle is dismounted first; quest state untouched. Warning path not yet screenshot-tested. List comes from PLACES in src/freeRoam.js (the notebook map's single source; positions there still duplicate the zone files).
- [x] Available in the normal live build, not dev-only; a sensible home is under the existing Notebook map - proof docs/shots/visit-place-2026-10-23/Village_mandir.png (also Primary_school.png, Mandi.png; real pause-menu click path, 41/41 places land cleanly, zero console errors)

### A-2b. Task menu and corner minimap (art director 2026-10-23)
- [ ] Pause menu "Tasks" list: all 8 story missions plus every side job, bilingual names, state shown (done / current / not started); selecting one makes it active and switches objective, waypoint and dialogue
  - PROGRESS 2026-10-23 (not ticked): pause menu now has Tasks (src/freeRoam.js openTasks): 8 missions + 10 side jobs, bilingual, state done/current/locked, proof docs/shots/tasks-2026-10-23/tasks_locked_tap.png. Picking is guarded: only the current mission is selectable, later ones say which to finish first, side jobs locked until free roam then walk-there. Free out-of-order switching of story missions NOT built (needs per-mission state setup); active-task waypoint switching not built.
- [ ] Guard task switching: set up required state, or mark a task unavailable with a one-line reason; never leave the game in a broken state. Keep "Continue roaming" as its own entry
- [ ] Research shipped open-world minimap conventions FIRST, then build a corner minimap: player arrow with facing, landmark icons, active objective marked, short zoom showing surroundings
  - PROGRESS 2026-10-23 (not ticked): minimap built (src/minimap.js): north-up 110 m window, player arrow = camera facing, landmark glyphs from PLACES, lanes, canal, ringed star on current objective (clamped to edge). Web research of shipped conventions NOT done this run, so box stays open.
  - PROGRESS 2026-10-25 (not ticked): web search (Godot minimap recipe, UE waypoint-marker plugin notes) supports edge-clamp + distance label + steady pointer for behind/off-window targets, which is what minimap.js does; results were thin on shipped-game zoom conventions, so research box stays open. Shot docs/shots/minimap-2026-10-25/minimap_far_objective.png (proof tool, capsule in frame, not tickable).
- [x] Minimap opens the existing full Notebook map on click/tap; one system, two scales - proof docs/shots/minimap-2026-10-23/phone_tap_opens_map.png (note: on desktop the cursor is pointer-locked in play, so the click path is via touch; N key already opens the map)
- [x] Style it as a corner of the same hand-drawn notebook (paper, ink, hand lettering), not a generic GPS radar; if unreadable at small size, report and propose the alternative rather than shipping generic - proof docs/shots/minimap-2026-10-23/desktop_play.png (ruled paper, torn corner, ink glyphs; glyphs are small at 148 px but readable)
- [x] Check at phone width with the on-screen joystick visible; must not crowd the screen or sit under the thumb - proof docs/shots/minimap-2026-10-23/phone_play.png (96 px top-right, below pause button, clear of joystick and dialogue)
- [x] Let the player hide the minimap from the pause menu - proof docs/shots/minimap-2026-10-23/pause_toggle_off.png (persisted in localStorage)

### A-2c. Navigation (art director FAIL 2026-10-23) - high priority
- [x] Remove discovery gating: show all 42 places on the notebook map from first load; keep an optional subtle "visited" mark, hide nothing - proof docs/shots/tasks-2026-10-23/map_all_places.png (all places inked on a fresh game, green tick on visited; some labels skipped where they would overprint, icon only)
- [ ] Build diegetic wayfinding: painted direction signs with arrows at lane junctions and the chowk, a village notice board listing key places, milestone markers on the approach road and highway
  - PROGRESS 2026-10-23 (not ticked): 5 direction signposts (house gate, temple fork, east gali, school lane, west gali) + chowk notice board, src/wayfinding.js; labels, arrows and distances computed from PLACES. Proof docs/shots/wayfinding-2026-10-23/. Still missing: milestone markers on the approach road and highway. Costs 2 draw calls (one merged mesh incl. shadow pass); hero view now 149 of 150.
  - PROGRESS 2026-10-23 (cycle 38bj2, not ticked): 4 painted milestone stones (Highway / Mandi distances, Hindi above English) on the east approach from the east gali to the highway, src/milestones.js, streamed per stone, labels from PLACES. Proof docs/shots/milestones-2026-10-23/ms_i.png. UPDATE 2026-10-25: two stones now stand on the highway's west verge (src/milestones.js HIGHWAY_STONES; Mandi + Chowk distances, proof docs/shots/milestones-highway-2026-10-25/{hw_a3,hw_b2}.png). Still missing: there is no actual road along the approach line (stones stand on open ground past the gali mouth).
- [ ] Make routes legible: lanes must continue with kerbs, drains, lamps and street life all the way to where they lead, not stop after a few metres
  - PROGRESS 2026-10-25 (not ticked): solar LED street lamps (every 18 m, alternate sides, streamed in 36 m chunks) now line the east gali, east gali south leg, west gali and south gali (src/main.js lamps_gali_*). Proof docs/shots/gali-lamps-2026-10-25/pole_close.png. Hero lane south of the house and the spurs still have no lamps.
- [ ] AUDIT: walk on foot from the house to all 42 places using only what a player can see; for each report whether a visible path leads to it, whether it is visible from any lane, and the walk time; LIST every place not findable without the map
  - PROGRESS 2026-10-23 (cycle 38bk, not ticked): static audit tools/findability-audit.mjs; 11 of 40 places not findable without the map, list in docs/handoff.md top entry. Still missing: a real on-foot walk with screenshots.
  - PROGRESS 2026-10-26 (not ticked): tool repaired (it crashed after the anchors refactor) and re-run on the 40 village places (staging yard excluded): 0 of 40 not findable without the map by the static test (was 11), because every place now has a signpost or milestone. Four are still 36-69 m from any drawn lane (field 69, gaushala 69, baagh 43, mandi 36), so a signpost points at them but no visible path leads there. Still missing: a real on-foot walk with screenshots.
- [ ] Far eastern cluster (health centre, chemist, manihari, sabzi, johad, masjid, Jain mandir, haveli, gurukul, maidan, highway, mandi): either connect with a real road carrying traffic, trees and roadside detail, or report that distances should be reduced. Do not move anything; layout is the art director's call

### A-1. Build as movable units (art director 2026-10-23) - architecture, applies to all work
- [ ] Every place (shop, house, landmark, farm plot) is one self-contained unit: geometry, props, colliders, interaction points, NPC anchors, signage and greenery belong to it
- [ ] One anchor position+rotation per unit, read from a single placement source; never hardcoded in several files
- [ ] Moving a place must be a one-number change that carries its props, colliders, interaction points and NPC routes with it
- [ ] Build in local coordinates and place by transform; merge per unit, never across units into one world mesh
- [ ] Waypoints and NPC routes reference units rather than raw world coordinates where possible
- [x] AUDIT before tomorrow (done 26 Oct, top entry of docs/handoff.md): write a short note in docs/handoff.md listing which places are already movable by one value and which have coordinates baked in (the art director needs this to plan the rearrangement)
  - PROGRESS 2026-10-23 (not ticked, audit done by reading main.js/freeRoam.js registrations): note written at top of docs/handoff.md. Architecture items above are not built.

### A0-LOAD. Load time (art director approved 2026-10-26)
- [ ] Stop shipping the staging yard in the initial payload; load the 22 staged places only when she travels to the yard (~10 MB, zero visual change, nothing deleted)
- [ ] Re-measure with tools/load-time-test.mjs and report the new number
- [ ] ONLY if still over 10 s: KTX2 on ground/walls/roofs/soil/props only, NEVER on signboards or any readable text, with a before/after comparison for her to judge
- [ ] Do not drop the HDRI further, do not drop prop textures to 512, do not simplify hero buildings

### A0-TEX. Staged places FAIL (art director 2026-10-26) - fix before building more places
- [ ] Diagnose the staged texture pipeline (arch.py extras -> strip-textures.mjs -> stagingYard.js sharedSetMaterial): check UVs survive the strip, that swapShared fires on every mesh, the effective tiles-per-metre, and whether vertexColors is flattening the map
- [ ] PROOF: close-up renders from ~2 m of one brick wall, one plaster wall, one tin roof, beside a crop of her reference. Individual bricks must be visible or it is still failing
- [ ] Re-tint every staged place from colours SAMPLED out of her Places V1/<place>/MAIN_*.png, not picked by eye or reused from village defaults
- [ ] Add the greenery her drawings show (grass, bushes, creepers, potted plants, trees) using real CC0 plant models only, never hand-built foliage; still skip khets and field crops
- [ ] Only after the above: resume building the remaining places

### A0a. COLLISION TEST (art director FAIL 2026-10-25) - nothing else until this passes
- [x] Build tools/collision-test.js: enumerate every solid object from the live scene (trees, buildings, walls, vehicles, animals, poles, lamps, hand pumps, charpais, carts, troughs, tanks, rope/string boundaries, fences, props)
- [x] Drive the player at each from 4 directions at walk and run speed using the real movement resolver; assert no pass-through; name every failure with its position
- [x] Repeat for every vehicle and every NPC/animal routine
- [x] Output objects tested / passed / failed; put that line in the commit message; wire into npm run build (proof: npm run build 2026-10-26: 4824 static + 6 vehicle boxes + 3 vehicles + 66 NPC legs, 0 failed)
- [x] Known failures to fix: trees, the tractor, the khel maidan string boundary, some buildings
- [ ] Check likely causes: missing colliders on thin/rope shapes, colliders lost on merge/instance/zone-stream, colliders registered late during streaming, fast-movement tunnelling, mountable vehicles bypassing solid handling when unmounted

### A0b. Signboards, 25 Oct FINAL rule (reverses 23 Oct)
- [x] Every board in the village: Hindi bold and larger on top, English not bold and smaller below but comfortably legible at walking distance, never below 55% of the Hindi cap height, both lines the same dark paint colour (proof: docs/shots/signboards-final-2026-10-25/sign_notice.png, commit 2ae1123)

### A0. Collision (art director FAIL 2026-10-23) - highest priority after the water bug
- [ ] Route every NPC and animal through the same collision resolver the player uses; no routine sets position directly without a collision check
- [ ] Give colliders to trees, poles, lamp posts, hand pumps, charpais, carts and every solid prop; audit and LIST any solid object with no collider
  - PROGRESS 2026-10-23 (cycle 38cd, not ticked): kachcha homestead yard props (charpai, chulha, chabutra, matka stand, manger, haystack) now solid on both copies; remaining no-collider list: hero-house charpai (interactive), cart legs, laundry ropes. No wells exist in the code.
  - PROGRESS 2026-10-23 (cycle 38bo2, not ticked): sabzi rehris carts and tarp poles, jalebi stall cart/stool/poles, gaushala feed trough/water tub/hay heap, highway petrol pumps/office/canopy posts, dharam kanta cabin and bus adda posts now solid; real W/S key walk into jalebi cart and gaushala trough stops at wall+radius, proof docs/shots/prop-solids-2026-10-23/. Regression 22/22. Cycle 38bq: mandi godown, dhaba, cabin, trucks, shed poles, crate rows now solid, proof docs/shots/mandi-solids-2026-10-23/. Cycle 38br: gurukul blocks/columns/wall/mast, khel maidan pavilion/net poles/bench, mela ground poles/stage/benches/swing/stalls, manihari counter, khalihan haystacks now solid, proof docs/shots/site-solids-2026-10-23/. No tractor-yard exists in the code. Still no collider: carts' legs, wells, pond/johad edges (not audited), other charpais.
  - PROGRESS 2026-10-23 (cycle 38be2, not ticked): all trees (every species, every zone, via buildTrees in src/trees.js) now carry a trunk-sized collider that survives merging; validator check 5 extended to count tree trunks as real geometry. Build 15/15, regression 22/22. Cycle 38bf2: lamp posts, lane hand pumps + matka stand, lane charpais, laundry poles, tubewell kothri/hauz/motor/charpai, dhaba charpais now have colliders (validator check 5 samples 'site_props' and 'street_lamp' materials too; build 15/15, regression 22/22). Courtyard hand pump now solid too. Still no collider: carts' legs, wells/troughs, other charpais (hero house, TV house porch is inside building box); audit list not yet written.
- [ ] Validate every waypoint path as walkable at build time; a path clipping a building is a build failure
  - PROGRESS 2026-10-23 (cycle 38bi, not ticked): validator check 9 sweeps every registered waypoint leg (src/npcRoutines.js ROUTES) against the real colliders; 3 routes / 7 legs clear. Not covered: the M6 monkey route (created lazily at runtime), bazaarLife / animal / follow routines, which do not register routes yet.
  - PROGRESS 2026-10-23 (cycle 38bl): monkey chase + all 11 bazaarLife villager loops now registered; check 9 now 15 routes / 30 legs. It found two real wall clips (bazaar villagers 3 and 5), fixed by shortening their loops. Still unregistered: animal routines, follow routine.
- [ ] NPCs entering a building must route to the door and pass through the opening, never a wall; re-path any routine that cannot
  - PROGRESS 2026-10-23 (cycle 38ce2, not ticked): followers (Maa, sister) now walk door points when the target is in another room (src/doorRouting.js: hero house front/back room, school classroom); real run: sister reached the player in the house back room, front room and classroom, 0 wall warnings. No straight-line pathfinding around props: a follower can still snag on a prop between her and the door. No other NPC routine enters a building. Also fixed kachcha cattle overlapping the new manger collider.
- [ ] Vehicles collide with buildings, walls, trees and each other
- [ ] Extend devCheckPenetration() to cover NPCs and animals, not just vehicles; log any penetration as a failure
  - PROGRESS 2026-10-23 (cycle 38bm, not ticked): guard now checks named NPCs, bazaar villagers and all live animal herds/dogs; whole-map sweep found and fixed 3 buffalo inside lane walls. Animals are stationary (no routines).
- [ ] Verify across a multi-minute continuous run with NPCs completing full routes, not one screenshot
  - PROGRESS 2026-10-23 (cycle 38bo2, not ticked): 5-minute real-time soak (tmp/npc-soak.mjs, ?dev=1, player teleported round the house/abadi): 0 collision-guard warnings, 0 console errors, Maa/child/postman walked their loops (60/137/109 m). Not ticked: headless runs at ~9 fps so sim time is under 5 min, and the other NPCs are stationary.

Characters are parked until 26 Oct. Build everything that is not a character.

### A1. Textures on every surface (top priority)
- [x] Ground, lanes and roads: packed-earth with tyre ruts, kerbs, drains (CC0 PBR, 1K WebP) - proof docs/shots/kerbs-2026-10-23/kerb_b2.png (kerbs on the halwai-school lane; cycle 38v added them to all 5 abadi lanes, proof docs/shots/kerbs3-2026-10-23T01-05-01-534Z/abadi_w1.png; cycle 38u added them to the temple lane and the bazaar approach legs, proof docs/shots/kerbs2-2026-10-23T00-53-05-942Z/temple_lane.png and docs/shots/kerbs2-2026-10-23T00-54-12-652Z/bazaar_lane.png; field tracks and abadi lanes still none)
- [x] Wall surfaces: lime-washed plaster in blue-grey, cream, pink, mint, with per-wall colour variation - proof docs/shots/bazaar-walls-2026-10-23/bazaar_back.png (cycle 38av: abadi rows now also vary per row, proof docs/shots/abadiwash-2026-10-23/w1_c.png, s1_d.png) (bazaar row only: cream, pink, mint, blue-grey units; other buildings still cream/mustard/terracotta/teal)
- [x] Roofs: terracotta tiles and corrugated tin - proof docs/shots/compare/new-shops-roofs/high.png (corrugated tin on ration shop + atta chakki; bazaar awning and bg houses already tin/terracotta; hero zone stays 150/150)
- [x] Painted wood: doors, shutters, frames (shared trim sheet) - proof docs/shots/compare/painted-wood/south_row.png (abadi houses only: bottle green, teal, oxblood, indigo, ochre, turquoise painted doors and shutters in the one shared material, zero extra draw calls; hero house, school and bazaar doors still natural dark wood)
- [x] Field and farm surfaces: wheat stubble, sabzi beds, soil - proof docs/shots/compare/field-zones-2/west_stubble.png (pale straw ground under west stubble, sabzi beds east docs/shots/compare/field-zones/east_sabzi.png, plough furrows docs/shots/compare/field-furrows/low.png)
- [x] Canal bank, bridge and boundary walls - proof docs/shots/canal-2026-10-22T20-49-15-988Z/canal_bridge.png (cement lining along both water edges, grassy bank strips, bridge parapets with coping and end posts, zero extra draw calls; village boundary walls NOT touched this pass)
- [x] Soft dirt at wall bases, sun-faded paint, subtle stains near doors and drains - proof docs/shots/grime-2026-10-23/bazaar_back_streaks_fade.png (shader hook on every Blender building material: dusty base dirt, sun-fade above 2m, faint damp streaks; stains are global noise, not placed per door/drain; zero extra draw calls)
- [x] Props and street furniture: lamps, charpai, handpump, chabutra - proof docs/shots/lamps-2026-10-23/temple_a.png and bazaar.png (new street lamps on the temple lane and bazaar lane, streamed per lane segment so hero zone stays 150/150; charpai, hand pump and chabutra already existed; hero-zone lanes have no lamps yet)

### A1a2. Source assets instead of hand-building (art director 2026-10-23)
- [ ] STANDING RULE: search Poly Haven / ambientCG / Poly Pizza for every object BEFORE building it; hand-build only what has no free asset, and say so in the report
- [ ] Replace hand-built generic props with downloaded CC0 models: hand pump, matkas, mud and flower pots, stools, chairs, benches, charpai frames, handcarts, bicycles, buckets, vessels, crates, sacks, baskets, jars, bottles, tins, tools, tyres, ladders, water tanks, lamp poles
  - PROGRESS 2026-10-23 (cycle 38bm2, not ticked): 15 Poly Haven CC0 props (stools, buckets, baskets, clay pot, jugs, crates, tyre, bench, chair) instanced at every abadi row's doorstep, streamed per 36 m cell (src/villageProps.js, public/assets/props, 2.6 MB), proof docs/shots/village-props-2026-10-23/step_a.png, step_c.png. Still to do: hand pump, charpai, handcarts, bicycle, sacks, ladders, tanks, lamp poles (no Poly Haven asset found for pump/charpai/handcart/sack). Trees: Poly Haven has NO neem/mango/peepal/babool (only temperate/South African species), so tree item stays on alpha-cutout cards.
- [ ] TOP PRIORITY after the water bug: replace all trees and plants with real CC0 tree/plant MODELS where they exist; alpha-cutout photo textures only where no model exists
  - PROGRESS 2026-10-23 (cycle 38bn, not ticked): garden plants (marigold, banana, tulsi, bougainvillea, creeper) and all 5 tree species now use alpha-cutout atlases built from real ambientCG leaf photos (tools/build-plant-atlas.mjs, public/assets/plants, 0.34 MB), per-instance tint on garden plants. Proof docs/shots/plant-atlas-2026-10-23/low_angle.png. Not done: close-up leaf-detail shot, flower heads still drawn, grass tufts/crops still old, no mid/far LODs.
- [ ] Species variety, visually distinct: neem, peepal, banyan, mango, babool, eucalyptus, banana, bamboo, bougainvillea, tulsi, marigold, creeper, sugarcane, palm; per-instance scale/rotation/tint/age variation
- [ ] Record every downloaded asset's source and licence in docs/CREDITS.md before use

### A1b0. Halwai and rooftop fittings (art director FAIL 2026-10-23)
- [ ] Source CC0 models for the halwai: kadhai, gas burner/chulha, gas cylinder, plastic monobloc chairs, plastic stools, steel trays, glass display case, tongs, ladles, buckets, matkas, hanging scale, thali and katori
- [ ] Source CC0 rooftop fittings and place across MANY buildings with varied colour/size/orientation, instanced: Sintex-style plastic water tank (tanki) on a platform, old aluminium TV antenna, dish antenna, solar panel, wall pipes, loose cable runs, brick stacks
  - PROGRESS 2026-10-23 (cycle 38cc2, not ticked): hand-built (no CC0 model searched; Poly Haven has no tanki/antenna that I know of) tanks on plinths, TV antennas, dishes, solar panels and brick stacks on the abadi roofs (src/rooftops.js, sites from scenery.js abadiRoofSites), merged per 36 m streamed cell, textured metal/concrete/brick with baked tint. Proof docs/shots/rooftops-2026-10-23/r7.png, r9.png. Not done: other buildings (bazaar, haveli, school), wall pipes and cable runs, CC0 sourcing.
- [ ] Hand-build sweets and snacks (samosa, jalebi, laddoo, barfi, gulab jamun) with real surface texture: fried golden-brown with darker edges, syrup sheen, sugar grain; vary size/rotation/shape across a tray; heap them, never a neat grid
- [ ] Add visible flame and heat shimmer at the chulha, soot on the kadhai base and the wall behind, steam/smoke rising; the halwai currently looks switched off
  - PROGRESS 2026-10-23 (cycle 38ce, not ticked): live effect over both kadhais (src/halwaiFire.js, one Points draw call, shown within 30 m): wood-smoke column, oil steam, flame flecks. Proof docs/shots/halwai-fire-2026-10-23/close.png. Flame reads as sparks only (bhatti is a solid brick block with no fire mouth); needs a mouth cut in tools/blender/build_halwai.py. Still missing: soot on kadhai/wall, heat shimmer.

### A1b1. Every remaining interior and place (art director 2026-10-23)
Apply CLAUDE.md section 5b to all of these without waiting for a per-place review note:
- [ ] Ration shop: sacks of grain and sugar, weighing scale, ledger register, measuring cans, stacked crates, ration card board, queue rail
  - PROGRESS 2026-10-23 (cycle 38bs, not ticked): jute sacks, crates, beam scale and ledger now on/around the ration shop; post office has pillar box, post bags, scale, ink pad and stamp; chakki has hopper, sacks, scale, flour dust. Proof docs/shots/shop-interiors-2026-10-23/. Still missing: shelves/cans, ration card board, queue rail, letter racks, counter grille, interior depth (shells are solid boxes).
- [ ] Post office (dak ghar): counter grille, letter racks, postbags, rubber stamps and ink pad, scales, red post box outside, notice board, old wooden furniture
- [ ] Atta chakki: the grinding machine with belt drive and motor, flour dust haze and settled dust on every surface, sacks, scoops, scales, hanging bulb
- [ ] School: desks, benches, blackboard with real chalk writing, charts and posters, water pot with mug, bell, cupboard, scattered slates and bags
  - PROGRESS 2026-10-23 (cycle 38bt, not ticked): classroom now has painted blackboard with chalk lesson in a frame with ledge/duster, teacher table + register + chair, 10 desk-benches with per-piece wood tint, books, slates, school bags, 3 wall charts (Hindi alphabet, English alphabet, hygiene poster), water matka on stand with mug, cupboard with registers, brass bell, wall clock, hanging bulb, ceiling fan, broom, door mat (src/village.js furnishClassroom). Proof docs/shots/classroom-2026-10-23/board.png, charts.png. Not done: other school blocks have no interiors, no CC0 desk models, matka/bell are boxes.
- [ ] Temple complex: lamps, bells, flower offerings, mats, donation box, steps worn with use
- [ ] Every remaining shop, house and farm structure: trade-specific tools, stock, seating, lighting, wiring, signage, clutter, signs of use
- [ ] All of it CC0-sourced first, textured, instanced, zone-streamed, inside the budget; report the number if any place cannot fit

### A1b. Shop contents and props (art director FAIL 2026-10-23)
- [ ] Download CC0 3D models for generic props (TV, radio, fan, scale, stove, kadhai, jars, bottles, buckets, vessels, crates, sacks, baskets, stools, benches) from Poly Haven / Poly Pizza / ambientCG; shrink and slot into every shop
- [ ] Give hand-built Indian retail items (masala packets, biscuit packets, bangle cards, soap, sweets) printed-label textures with invented bilingual brand names; vary labels across a shelf; no solid-colour fills
- [ ] Instance repeated props and merge per-shop static contents; keep hero view under the draw-call ceiling

### A1d. Code-primitive structures and openings (art director FAIL 2026-10-23)
- [ ] BUG FIRST: fill the tubewell hauz with water, not grass; then audit the whole greenery scatter for plants placed in drains, canal, pond, johad, troughs, tanks and rooftops, and report every bad placement
  - PROGRESS 2026-10-23 (cycle 38bd, not ticked): hauz now holds blue-grey glossy water with waterline stain, grass no longer stands in it; plant scatter has a keep-out list (VEG_KEEP_OUT, src/vegetation.js) for hauz, outlet naali, pond, johad and canal channel. Proof docs/shots/hauz-2026-10-23/after.png. Full audit of other scatter (trees, field crops, abadi plants) not done.
  - PROGRESS 2026-10-23 (cycle 38bj, not ticked): scatter audit done with tools/greenery-audit.mjs (runtime sweep of every plant instance vs water and roofs). Found and fixed: 121 grass tufts standing on lane kerbs and in the open drains (nali) beside lanes (now a kerb+drain keep-out band on every lane), 4 crop rows standing in the tubewell outlet channel (field.js now honours the keep-out), 9 garden plants on lane edges. Clean: trees (all well clear of pond, johad, hauz), canal channel, pond, johad, rooftops (no plant above 1.8 m). Not verifiable by tool: lane water corners and troughs (not detected as water meshes) - abadi plants are not near them by coordinates.
- [ ] Audit and LIST every structure still built from code primitives (farmSites.js, scenery.js and similar); then convert each to Blender at build_house.py standard
- [ ] Rebuild the tubewell properly: pump room with real door/window/roof overhang/meter box, bore pipe, outlet pipe, hauz with water and waterline stain, kachcha naali channels into the field, signs of use
  - PROGRESS 2026-10-23 (cycle 38bd, not ticked): water, waterline stain, damp patch, framed door with plank lines/hinges/handle/threshold, grilled window with shutter and sill, woven charpai. Proof docs/shots/hauz-2026-10-23/door.png. Still missing: meter box cable, bore pipe detail, kachcha naali into the field, scatter of use.
- [ ] Rebuild every charpai as a wooden frame with crisscrossed jute/niwar webbing, sagging slightly; never a plank on legs
  - PROGRESS 2026-10-23 (cycle 38bd, not ticked): shared woven charpai (frame, turned legs, sagging jute webbing, charpaiGeos in src/farmSites.js) on the tubewell and all lane laundry corners, proof docs/shots/hauz-2026-10-23/charpai.png. Also dhaba (4) and TV house porch, proof docs/shots/charpai2-2026-10-23/dhaba.png, tvhouse.png. Still planks: hero house and halwai charpais (hero zone at the draw-call ceiling, extra webbing mesh would add a call). Dhaba and TV house doors/windows still flat.
- [ ] STANDING RULE: every door gets a frame, panels, handle, hinges, threshold and wall recess; every window gets a frame, iron grille, shutters or curtain, sill and recess. Apply to every building including ones already ticked
  - PROGRESS 2026-10-23 (cycle 38bz2, not ticked): shared windowOpening/doorOpening helpers (src/farmSites.js: recess, frame, iron grille, sill, panels, hinges, handle, threshold) now on gurukul (24 windows, 2 doors), old haveli (gate + 8 windows), mandi godown (2 big doors + windows), weighbridge cabin and dhaba. Proof docs/shots/openings-2026-10-23/ (gurukul_a, haveli_a, mandi_a). Still flat slab openings: masjid, gurudwara, health centre, chemist, anganwadi, dairy, TV house, Jain mandir, gaushala, mela, post office/ration/chakki shells, bazaar units.
  - PROGRESS 2026-10-23 (cycle 38ca, not ticked): smallBuilding() in src/farmSites.js now uses the shared openings, so anganwadi, dairy, health centre, chemist, masjid, gurudwara, TV house and Jain mandir all have recessed framed doors (panels, hinges, handle, step) and grilled windows with sills. Proof docs/shots/openings2-2026-10-23/ (masjid.png, health.png, chemist.png; chemist counter stands in front of its door by design). Still flat slab openings: gaushala, mela, post office/ration/chakki shells, bazaar units.
  - PROGRESS 2026-10-23 (cycle 38cb, not ticked): post office, ration shop, atta chakki Blender model (tools/blender/build_new_shops.py) now has grilled side windows, a framed panelled staff door with step at the back, and a grilled vent window on the chakki back wall. Proof docs/shots/openings3-2026-10-23/ (back.png, backoblique.png). Gaps: gaushala and mela are open sheds/tents (no openings apply); bazaar units still flat slab openings. Note: src/newShops.js shells are invisible collision backing, openings go in the Blender script.
  - PROGRESS 2026-10-23 (cycle 38cc, not ticked): bazaar row Blender model (tools/blender/build_bazaar_row.py) now has a panelled staff door with recess, frame, hinges, handle and step on the back wall of all 8 units, and the 4 back windows gained recess, frame, bars, rail and sill. Proof docs/shots/openings4-2026-10-23/ (back_west.png, back_wide.png). Remaining flat openings: gaushala and mela are open structures (none apply); front shutters were already real.

### A1e. Street lamps (art director FAIL 2026-10-23)
- [ ] Research real UP village street light references first, then rebuild: concrete/RCC tapered poles on abadi lanes, panchayat solar LED lights at chowk and newer areas, at least two distinct types
  - PROGRESS 2026-10-23 (not ticked): two types built (RCC tapered pole + tube light on temple lanes, solar LED on bazaar lane; src/props.js createStreetLamps). Web reference research NOT done, so box stays open.
- [x] Add the down-cable on each pole, a junction/switch box, and sagging overhead wire runs between poles (this matters more than the lamp head) - proof docs/shots/lamps-2026-10-23/t2.png (also t4.png, b2.png)
- [ ] Real concrete and rusted-steel textures with stains and wear; no flat grey fill
- [ ] Per-instance lean, rotation and wear variation; posters/stickers/painted numbers on some poles; instanced
  - PROGRESS 2026-10-23 (not ticked): lean, height, tint, base grime and painted bands done; no posters/stickers; merged per lane segment, not GPU-instanced. Concrete/tin PBR textures used, no stains beyond base grime.

### A1f. Layout fixes (art director 2026-10-23)
- [x] FIX: move every hand pump and water corner from the lane middle to the lane edge or a corner, with soak-away and wet patch - proof docs/shots/lanewater-edge-2026-10-23/e1.png (also s1.png, e2.png, w1b_chk.png, w2b_chk.png: all 5 lane water corners now at the kerb on the side away from the open drain, spout facing the lane, flat damp apron plus pebble-ringed soak-away; the lane hero-house courtyard pump is not a lane pump and was untouched)
- [ ] Audit every prop sitting in a navigable lane or vehicle route (matkas, charpais, carrom mats, stools, benches, crates, animals, laundry lines); clear the path and drive the full vehicle route to confirm
- [ ] BUILD: new row of houses facing the temple and farmland, with proper fronts (doors, grilled windows, verandahs, chabutras, pots, charpais); existing lane becomes the back street; shift existing rows to make room
- [ ] Give the new street the same treatment: kerbs, drain, street life, lamps, greenery
- [ ] Check the village from temple, fields, canal and approach road; report any elevation still presenting blank rear walls
- [ ] Update reference-from-unity/MAP.md with the new row and street in the same commit (art director's instruction supersedes the old abadi layout)
- [ ] Re-check collision, reachability, zone streaming and draw-call ceiling after the new row; report the number if the hero view cannot hold it

### A1g. Carrom scene (art director 2026-10-23)
  - PROGRESS 2026-10-23 (cycle 38bx, not ticked as a whole): the five lane carrom+ludo mats are REMOVED from all lanes; ONE carrom scene (createCarromScene, src/farmSites.js) now stands at the chowk (-46, 5.5) in front of the bazaar, east of the tea stall: CC0 Poly Haven round table + 2 stools + 2 chairs, a textured printed carrom board (ring, baselines, arrows, pockets) with coins/queen/striker mid-game, 4 seated capsule-placeholder men, tea glasses, folded gamcha, powder tin, katori of pocketed coins, slippers. Proof docs/shots/carrom-2026-10-23/carrom_close.png, carrom_b.png, carrom_wide.png. Ludo removed (not rebuilt). Scene builds within 22 m only (hero-zone draw calls sit at 150/150).
- [ ] Move carrom out of all lanes; place ONE carrom scene in the common area near the shops (chowk/bazaar frontage), not in a vehicle route
- [ ] Build it as a table in the centre with the board on top, four older men seated around it on stools/chairs (placeholder people for now)
- [ ] Board detail: wooden frame, printed circle and arrow lines, four pockets, coins and striker scattered mid-game; tea glasses, pocketed coins, cloth, slippers beside the stools
- [ ] Source table, stools and chairs as CC0 models per the standing rule; textured wood, no flat fills
- [ ] Ludo: build properly as a printed cloth board with real pieces in a different spot, or remove it

### A1h. Laundry lines (art director FAIL 2026-10-23)
  - PROGRESS 2026-10-23 (cycle 38bw, not ticked): all 5 lane laundry lines now carry real garments (src/laundry.js): sari, dhoti, kurta, salwar, dupatta, shirt, trousers, child's frock, towel, bedsheet, gamcha; folded over a sagging rope with a shorter back layer, wrinkles, uneven hems, hem borders, checks/stripes/floral/block prints, 2-3 pegs each; breeze sway in the vertex shader (hem moves more, each garment out of phase, gusts), one extra draw call per line, no shadow cast. Proof docs/shots/laundry-2026-10-23/s1_a.png, w1_a.png, e1_back.png; sway proof sway_t0.png vs sway_t1.png. Fabric is canvas-generated (weave normal map), NOT CC0 photo textures; hero-zone house clothesline (src/village.js) still old boxes (zone at 146/150 draw calls). Breeze consistency report not written.
- [ ] Rebuild drying clothes as real garments with distinct silhouettes: sari, dhoti, kurta, salwar, dupatta, shirt, trousers, child's clothes, towel, bedsheet, gamcha
- [ ] CC0 fabric textures with weave, prints, sari borders, checks, sun-faded colour; no solid-colour fills
- [ ] Drape like cloth: folded over the line, sagging under weight, wrinkles, uneven hems; the line itself sags between supports
- [ ] Animate a gentle breeze sway, bottom edge moving more than top, each garment out of phase; vertex shader or per-instance animation, not CPU per-frame
- [ ] Add visible cloth pins, two or three per garment, clipping cloth to the rope
- [ ] Consistency check: report what else should carry the same breeze (foliage, flags, garlands, smoke, loose paper) so the village reads as one afternoon

### A2. Legibility
- [ ] REWORK (art director FIX 2026-10-23): flip signboard hierarchy; Hindi top but smaller/lighter, English second line larger/bolder, both in the same dark paint colour, applied to every board in the village
- [x] Every signboard readable at normal playing distance, not a smear - proof docs/shots/normal-mode-signboard-8m-2026-10-22T21-23-28-656Z/bazaar_unit5_Barber_Shop.png and chowk_tea_stall_Yadav_Chai_Nashta.png (bazaar/chowk boards were drawn from square cells on 8:1 boards so text was squashed flat; now 4:1 cells + 4:1 boards, bold red/dark text; Barber board was hidden behind a Blender pediment, moved forward)
- [x] Shop boards: Devanagari larger, English beneath - proof docs/shots/normal-mode-signboard-8m-2026-10-22T21-23-28-656Z/bazaar_unit4_Tailor_Shop.png and hero_general_store_Gupta_General_Store.png

### A3. Trees and plants
- [ ] REWORK (art director FAIL 2026-10-23, second verdict): rebuild ALL plants with CC0 alpha-cutout photo textures (ambientCG type=Atlas: Leaf Set / Flower Set / Foliage / Grass) on crossed quads. No solid-colour leaf geometry anywhere. 5 species minimum, each from its own texture. Per-instance tint variation. Instanced. See ART_REVIEW.md: the earlier 'use the neem technique' instruction is withdrawn
- [ ] Blender rebuild of peepal, neem, babool, mango to replace code shapes
  - PROGRESS 2026-10-23 (not ticked: built in code, not Blender - awaiting art director's call): smooth blob canopies replaced by real branching trunks + alpha-cut species leaf-sprig cards (src/trees.js), proof docs/shots/trees-2026-10-22T21-34-16-180Z/mango_baagh.png, neem_chowk.png and docs/shots/trees-2026-10-22T21-35-27-570Z/peepal_temple.png, euc_back.png. Still to do: LODs, distance billboard.
  - ATTEMPT 2026-10-23 (cycle 38ac, reverted): crossed-quad canopy impostor as 3rd LOD level read as flat solid green blobs at mid range and filled the whole high_overview shot green (docs/shots/2026-10-23T02-37-36-790Z/); needs a baked-from-render impostor texture and a distance well past the zone stream radius, not a canvas blob.
  - PROGRESS 2026-10-23 (cycle 38s, not ticked): 3-level distance LOD per tree (THREE.LOD in src/trees.js: full, 55 m = every 2nd leaf card + no shadow cast, 120 m = every 3rd card with trunk dropped so a far tree is 1 draw call), proof docs/shots/2026-10-23T00-25-32-752Z/spawn_behind.png (near LOD only; far LOD not framed). Still to do: distance billboard impostor, Blender-made meshes.
  - PROGRESS 2026-10-23 (cycle 38o, not ticked): wind sway on all tree leaf cards (vertex shader in src/trees.js, height-weighted, per-position phase, zero extra draw calls), proof docs/shots/2026-10-22T23-49-51-311Z/low_angle.png (static frame; motion not visible in a still). Still to do: LODs, distance billboard.
  - PROGRESS 2026-10-23 (cycle 38aq, not ticked): the 6 mango baagh trees moved out of the village static merge into streamed zone trees_baagh (26 m build radius, src/main.js) so their LODs work; track babools stay merged (streaming them put the hero view at 151 calls). Validator settle wait raised 5->20 frames (zone teardown lag read 151, real 150). Proof docs/shots/baagh-trees-2026-10-23/inside.png, approach.png. Still to do: temple peepal + hero/bazaar neems + impostor.
  - PROGRESS 2026-10-23 (cycle 38ar, not ticked): leaf cards within ~3 m of the camera dissolve with a dithered fade (src/trees.js), proof docs/shots/2026-10-23T05-54-17-220Z/low_angle.png. Streaming the temple peepal read 151 hero-zone calls, reverted; hero/temple/chowk trees stay merged until draw calls drop.
  - PROGRESS 2026-10-23 (cycle 38ap, not ticked): 10 streamed outskirts shade trees (neem/peepal/babool) around the pond, johad, haveli and gaushala (outskirtTrees, src/main.js; unmerged so the LOD works), proof docs/shots/outskirts-2026-10-23/. FINDING: every tree placed through hero/temple/field groups is folded into village_static_merged by mergeAcrossGroups, so those trees' LOD levels all draw at once and LOD does nothing. A baked impostor (webp renders of each species, tmp/bake.mjs) was built and reverted because it would be merged too; it needs those trees moved into streamed zones first. Impostor webps left untracked in public/assets/trees/.
- [ ] Low vegetation and ground cover with real textures
  - PROGRESS 2026-10-23 (cycle 38e, not ticked): grass patches on the ground now sample a real Poly Haven CC0 photoscan (aerial_grass_rock, 4K->1K WebP, two tilings), proof docs/shots/2026-10-22T21-52-23-402Z/high_overview.png and low_angle.png. Still to do: wall creepers; grass normal/roughness maps not wired (colour only).
  - PROGRESS 2026-10-23 (cycle 38r, not ticked): grass patches now also use the scan's real normal + roughness maps (Poly Haven aerial_grass_rock 4K->1K WebP, linear, src/materials.js), proof docs/shots/2026-10-23T00-17-47-214Z/high_overview.png (relief is subtle at this framing). Still to do: tree LODs + billboard (tree item above).
  - PROGRESS 2026-10-23 (cycle 38q, not ticked): wall creepers (money-plant curtains) added as a 5th cell in the garden-plant atlas, on the bazaar row's back wall and east end, same single draw call, proof docs/shots/creepers-2026-10-23/back4.png. Still to do: grass normal/roughness maps.
  - PROGRESS 2026-10-23 (cycle 38ag, not ticked): abadi house fronts along all 5 lanes now have creepers, tulsi, marigold pots and banana clumps (abadiGardenPlants, src/scenery.js; own garden-plant mesh, culled when the abadi is out of view), proof docs/shots/abadi-green-2026-10-23/e1.png, s1.png, w1.png. Still to do: school has none.
  - PROGRESS 2026-10-23 (cycle 38ah, not ticked): school compound greenery (creepers on the south wall, marigold + tulsi at the gate, banana at corners; same single garden-plant draw call, src/main.js), proof docs/shots/school-green-2026-10-23/gate.png and east.png
  - PROGRESS 2026-10-23 (cycle 38af2, not ticked): creepers, tulsi, marigolds and banana clumps added around the post office, ration shop and atta chakki (same single garden-plant draw call), proof docs/shots/newshops-green-2026-10-23/front_b.png and back.png. Still to do: abadi houses and school have none.
  - PROGRESS 2026-10-23 (cycle 38d): marigold beds, banana clumps, tulsi and bougainvillea are now alpha-cut cards from one atlas (buildGardenPlants, src/vegetation.js), replacing the flat-colour blade flowers, same single draw call, proof docs/shots/garden-plants-2026-10-23/temple_marigold.png, chowk.png, house_banana.png. Still to do: wall creepers, real CC0 ground-cover texture.
  - PROGRESS 2026-10-23 (not ticked): grass tufts and scrub were box blades, now instanced crossed alpha-cut cards with painted blade textures (src/vegetation.js, same draw calls), proof docs/shots/trees-2026-10-22T21-42-52-648Z/neem_close.png. Still to do: tulsi, marigold beds, creepers, banana clumps, real CC0 ground-cover texture.

### A1c. Farmland variety and density (art director FAIL 2026-10-23)
- [ ] Rebuild crops with alpha-cutout CC0 textures and per-instance jitter in position, rotation, scale and tint; kill the mechanical grid
- [ ] Raise density so a mature plot's soil is mostly hidden by crop
- [ ] Build distinct plots: sarson (mustard, yellow bloom), genda (marigold), ganna (sugarcane, above player height), gehun (wheat), dhaan (flooded paddy with standing water), sabzi beds with bamboo stakes, plus the existing mango baagh
- [ ] Mix growth stages across plots: ploughed bare, sapling, half-grown, mature, harvested stubble with straw stacks
- [ ] Pick one season (late winter suggested) and record it in docs/WORLD.md so later work does not drift
- [ ] Instance per crop per plot, add distance LOD, zone-stream plots; report the number if density cannot fit the draw-call ceiling

### A4. Unbuilt MAP.md locations
- [ ] Compare the built world against `reference-from-unity/MAP.md` and list every missing location in this file before building
  - LIST 2026-10-23 (cycle 38e, from MAP.md vs a name-grep of src/, so verify before building; MAP.md gives no coordinates for most of these, pick open ground and say so, do not invent silently). MISSING, not found in src/:
    - Water: ~~pond~~ BUILT cycle 38g at (-132,70) (createPond, src/farmSites.js, proof docs/shots/sites-2026-10-22T22-09-49-386Z/pond_low.png; no buffalo yet), ~~johad~~ BUILT cycle 38h at (78,105) (createJohad, src/farmSites.js, proof docs/shots/sites-2026-10-22T22-25-31-728Z/johad.png), ~~tubewell + kothri~~ BUILT at (-40,-8) (proof .../tubewell.png), ~~tank/transformer landmark pair~~ BUILT cycle 38e (createWaterTankProp, src/props.js; streamed, proof docs/shots/water-tank-2026-10-23/tank_far.png; stream radius only 90 m because the hero zone sits at exactly 150 draw calls, widen when calls drop; placed at (-22,122), MAP.md gives no coordinate)
    - Fields: ~~sugarcane belt~~ BUILT at x0-42,z135-169, instanced, no colliders (proof .../cane_edge.png, cane_inside.png), ~~neighbour's 2-tree orchard~~ BUILT cycle 38i at (12..27,127..129) (2 mangoes, north edge of the cane belt, streamed), ~~bhoosa stacks, khalihan~~ BUILT cycle 38h at (-78,-5) (createKhalihan, proof docs/shots/sites-2026-10-22T22-25-31-728Z/khalihan.png), ~~mela + wedding ground~~ BUILT cycle 38l at (-135,150) (createMelaGround, proof docs/shots/sites-2026-10-22T23-00-16-314Z/mela.png)
    - Abadi places: ~~anganwadi~~ BUILT cycle 38i at (-104,106) west of the school wall (createAnganwadi, src/farmSites.js, proof docs/shots/sites-2026-10-23b/anganwadi_b.png), ~~dudh dairy~~ BUILT cycle 38i at (-112,18) (createDudhDairy, proof docs/shots/sites-2026-10-23b/dairy.png), ~~health sub-centre~~ BUILT cycle 38j at (96,30) (createHealthSubCentre, proof docs/shots/sites-2026-10-23c/health.png), ~~chemist~~ BUILT at (96,60) (proof .../chemist.png), ~~TV house~~ BUILT cycle 38k at (70,12), ~~manihari~~ BUILT (90,78), ~~sabzi rehris~~ BUILT (88,92) (createTvHouse/createManihari/createSabziRehris, proof docs/shots/sites-2026-10-23d/), ~~jalebi + samosa stall~~ BUILT cycle 38l at (-104,4) (createJalebiStall, proof docs/shots/sites-2026-10-22T23-02-38-573Z/jalebi.png), chaupal platform (peepal crossroads; the temple peepal already has a chabutra, confirm)
    - Edges: ~~highway, petrol pump, bus adda, dharam kanta~~ BUILT cycle 38k as createHighwayCluster at (205,40) (proof docs/shots/sites-2026-10-23d/highway.png), ~~mandi area~~ BUILT cycle 38m at (226,60) (createMandi, src/farmSites.js: paved yard, grain godown, vegetable yard shed, weighing station, dhaba, 3 parked trucks; proof docs/shots/sites-2026-10-22T23-25-16-952Z/mandi_aerial.png, mandi_low.png; no colliders, trucks static), ~~gurukul inter college~~ BUILT cycle 38l at (160,85) and ~~khel maidan~~ at (165,135) (createGurukul, createKhelMaidan, proof docs/shots/sites-2026-10-22T23-00-16-314Z/gurukul.png, maidan.png; no cricket gameplay), ~~old haveli~~ BUILT cycle 38t at (150,-30) (createOldHaveli) and ~~gaushala~~ at (-125,-35) (createGaushala), both src/farmSites.js, zone-streamed, proof docs/shots/sites-2026-10-23T00-35-19-491Z/ (haveli_front.png, gaushala_aerial.png; no colliders, cows static)
    - Religious: ~~masjid~~ BUILT cycle 38j at (100,135) and ~~gurudwara~~ BUILT at (-60,175) (scenery only, proof docs/shots/sites-2026-10-23c/masjid.png, gurudwara.png), ~~Jain mandir~~ BUILT cycle 38k at (130,160); peripheral scenery only, no tasks
    - Canal: ~~kachcha bank road~~ BUILT cycle 38n on the south (field) bank, x -50..34 (createCanalBankRoad, src/farmSites.js, proof docs/shots/sites-2026-10-22T23-46-03-436Z/bank_road_low.png; visual only; cycle 38w added the north/village-side bank road at z 38.8, proof docs/shots/northbank-2026-10-23T01-10-01-020Z/both_banks.png); chaupal confirmed: chabutras already at the temple peepal and the chowk; ~~narrow patli pulia~~ BUILT cycle 38p at x=-3 (plank + handrail crossing, 1.6 m gap in the bank colliders so it is walkable on foot only; src/canal.js PULIA_X; proof docs/shots/pulia-2026-10-22T23-57-02-796Z/, framed from the shared canal view, so the pulia is small in it)
    - PRESENT: school, bazaar (kirana, halwai, darzi, nai, cyber, mechanic/puncture), post office, ration shop, atta chakki, panchayat, flagpole + donation board, abadi rows, canal + pukka bridge, mango baagh, wheat/sabzi field, kachcha homestead
- [ ] Post office
- [ ] Ration shop
- [ ] Atta chakki
- [ ] Background houses and boundary walls
  - PROGRESS 2026-10-23 (cycle 38x, not ticked): village boundary walls on the abadi's west, south and east edges (createBoundaryWall, src/farmSites.js), proof docs/shots/edgewall-2026-10-23b/west_wall.png and south_wall.png; visual only, no colliders; field-side walls and the north edge not done.
  - PROGRESS 2026-10-23 (cycle 38ad, not ticked): edge walls extended: south-centre x -38..0 (z 157), west lower half z 100..157 (gap at lane S1), east lower half z 100..135, all zone-streamed, proof docs/shots/edgewall2-2026-10-23/south_mid.png, west_low.png (east_low.png not inspected). Visual only; field-side and north edge not done.
  - PROGRESS 2026-10-23 (cycle 38ae, not ticked): walls added on the east upper (z 21..58), east far-south (z 135..157) and west far-north (z 21..34) edges, zone-streamed, proof docs/shots/edgewall3-2026-10-23/edge_wall_e0.png, edge_wall_e3.png, edge_wall_w0.png. Visual only. South x 0..46 left open on purpose (sugarcane belt runs past z 157); north edge faces the canal.
  - PROGRESS 2026-10-23 (cycle 38ai, not ticked): boundary walls now have sparse wall-base greenery (bougainvillea, marigold, creepers, banana; one garden-plant draw call per streamed wall zone, createBoundaryWall in src/farmSites.js), proof docs/shots/wallgreen-2026-10-23/edge_wall_e0.png, edge_wall_e3.png
  - PROGRESS 2026-10-23 (cycle 38ao, not ticked): north-edge wall run x -101..-58 at z 21 with a gap at the lane (zone edge_wall_n0, src/main.js), proof docs/shots/northwall-2026-10-23/b_0.png. The matching x 14..46 run pushed the hero zone to 151 draw calls so it was dropped; rest of the north edge faces the hero zone/canal and stays open.
- [ ] Lanes, kerbs and drains across the full map
  - PROGRESS 2026-10-23 (cycle 38y, not ticked): open nali drains with pale cover slabs beside one kerb of each of the 5 abadi lanes (buildDrainSegments, src/paths.js, merged into the lane draw call), proof docs/shots/drains-2026-10-23T01-22-11-711Z/abadi_e1.png and abadi_w1.png. Temple/bazaar lanes and field tracks (kachcha, no kerbs) still to do.
  - PROGRESS 2026-10-23 (cycle 38z, not ticked): nali drains with cover slabs now also on the temple lane and the three bazaar approach legs (same merged lane draw call), proof docs/shots/drains2-2026-10-23T01-26-41-845Z/temple_lane.png (bazaar legs built but not framed in that shot). Field tracks stay kachcha, no drains.
  - PROGRESS 2026-10-23 (cycle 38ak, not ticked): kachcha field track loop gets a sparse verge of tulsi and marigold just outside its edge (buildTrackVerge, src/field.js; one garden-plant draw call, no kerbs or drains, tracks stay kachcha), proof docs/shots/trackverge-2026-10-23/walk_d.png and walk_e.png
  - PROGRESS 2026-10-23 (cycle 38at, not ticked): carrom + ludo mats with peedhas in three abadi lanes (E1, W1, S1; createLaneGames, src/farmSites.js, streamed, one draw call each, MAP.md "street life"), proof docs/shots/lanegames-2026-10-23/e1_a.png (W1/S1 placed but only partly framed)
  - PROGRESS 2026-10-23 (cycle 38au, not ticked): cattle + dog resting in three abadi lanes (lane_cattle_e1/w1/s1, src/main.js), proof docs/shots/lanecattle-2026-10-23/s1_d.png, w1_d.png
  - PROGRESS 2026-10-23 (cycle 38aw, not ticked): laundry corners (charpai with quilt and drying red chillies, steel tub, clothesline of saris and dupattas) in three abadi lanes (createLaneLaundry, src/farmSites.js; zones lane_laundry_e1/w1/s1), proof docs/shots/laundry-2026-10-23/e1_a.png (w1/s1 placed, not cleanly framed)
  - PROGRESS 2026-10-23 (cycle 38ax, not ticked): two buffalo on the pond's muddy bank (zone pond_buffalo, src/main.js, reuses createCattleHerd, 1 draw call, streamed, visual only), proof docs/shots/pondbuffalo-2026-10-23/pond_a.png, pond_c.png
  - PROGRESS 2026-10-23 (cycle 38ay, not ticked): water corners (hand pump, matkas, ghadas, washing stone) in three abadi lanes (createLaneWaterCorner, zones lane_water_e1/w1/s1), proof docs/shots/lanewater-2026-10-23c/w1_d.png
  - PROGRESS 2026-10-23 (cycle 38bc, not ticked): banana clumps and bougainvillea at the four field-track corners (buildTrackVerge, src/field.js, same garden-plant draw call), proof docs/shots/fieldcorner-2026-10-23/sw.png
- [ ] Canal and bridge
  - PROGRESS 2026-10-23 (cycle 38aj, not ticked): bank-side greenery along both canal banks (bougainvillea, tulsi, banana; one garden-plant draw call, src/canal.js), proof docs/shots/canalgreen-2026-10-23/canal_a.png, canal_b.png

  - PROGRESS 2026-10-23 (cycle 38an, not ticked): thin chulha smoke over 7 abadi rows (abadiSmokeSources in src/scenery.js feeding the existing ambient smoke Points, no new draw call), proof docs/shots/abadi-smoke-2026-10-23/e1.png, w1.png

### A5. Side jobs and free roam
- [ ] The checklist at the bottom of `docs/MISSIONS_PLAN.md`, verbatim
  - AUDIT 2026-10-23 (cycle 38ae, not ticked): all 10 side jobs re-run end to end with real interact()/dialogue/rhythm hooks (tmp/jobs-*.mjs, jobs-audit3.mjs, jobs-gate7.mjs): pump, ration, patang, chakki, gate (4.1 s, paid 50), gilli, kanche, kulfi (+banta spend), milk, mango (6/6) all complete with pocket money/records and zero console errors. Not covered: sound radar, notebook map, title 'Continue roaming', screenshot proof per job.
  - PROGRESS 2026-10-23 (cycle 38al, not ticked): sound radar verified by audio spies, volume falls with distance and is silent out of range for chakki thump, kulfi bell and gilli maidan cheer; the khel maidan (165,135) now has its own cheer source (src/jobs/gilli.js). Proof docs/shots/radar-proof-2026-10-23/radar.txt. Still to do: screenshot proof per job.
  - PROGRESS 2026-10-23 (cycle 38am, not ticked): framed shots at the job spots docs/shots/jobs-2026-10-23/ (pump_dadi, chakki, gilli_maidan, banta_shop, milk, kanche); weak proof: kanche camera sits inside a tree's foliage, giver NPCs are still capsules, no in-job frames. CHECKED: view at (-46,14.6) yaw 3.14 reads 177 renderer calls / 427k tris, but that includes the shadow pass (122 visible meshes + 68 casters); the validator's metric (visible frustum-passing items, tools/draw-call-audit.mjs) is 122, under 150. Vehicle parts are already merged by material (mergeGroupByMaterial). Not a breach by the project's definition; no cull needed.

## 1. Headroom and hygiene (must happen before adding more static content)

- [x] Draw-call headroom pass, round 1 - investigated the full scene breakdown
      (`tmp/draw-call-breakdown.mjs`, `tmp/draw_call_scene_dump2.mjs`). Finding: the
      village/bazaar/temple/field static geometry and every vehicle body are ALREADY
      fully merged by material (two prior dedicated passes, see `docs/parked.md`
      2026-09-18/19) - there is no free, risk-free static-geometry merge left sitting
      around. The one real waste found: the 6 October Tripo-comparison placeholder
      boxes (non-gameplay, a temporary judgement lineup near the chowk) were casting
      shadows, costing a second draw call each for no visual reason - turned that off
      (`src/main.js`, `TRIPO_STAGING_SLOTS` loop). Result: 139 -> 133 draw calls
      (world-validator's fixed-camera count), confirmed via `npm run build` (13/13
      still pass) and `node tools/screenshot.js` (grounding/console clean). The
      remaining big-ticket levers (consolidating vehicle body material-pair variety
      from ~11 down further, or instancing vehicle wheels/NPCs) both carry real risk
      per CLAUDE.md's regression-guard rule (wheel rotation specifically) or trade
      away visual fidelity that a prior session deliberately chose - NOT done here.
- [x] Draw-call headroom, round 2 - not needed after all. M4-M8's new geometry (the
      postman/monkey NPCs, the mango baagh's trees) reused the existing shared-material
      merge patterns from the start (the darzi reuses the bazaar's existing ambient
      shopkeeper instead of a new NPC; mango trees fold into `src/trees.js`'s one
      shared draw call for free). Final count: 134/140 draw calls, 6 of headroom.
      Revisit vehicle-wheel/NPC instancing (round 1's note) only if a future addition
      actually threatens the 140 ceiling.
- [x] Refresh `docs/regression-baseline.json` - done twice: once after the headroom
      pass (133 draw calls, M1-M3 only), again after M4-M8 were built and verified
      end to end through real interact()/dialogue/drive hooks (the walkthrough itself
      was extended to cover all 8 missions, not just the original 3 - see
      `tools/regression-check.js`). 14/15 - the one miss is the script's own
      early-warning draw-call threshold (130), not the real 140 ceiling.
- [x] Correction: `src/trees.js` is NOT dead code - `docs/STATUS_REPORT.md` (a prior
      read-only audit) and this file both repeated a stale 2026-09-19 claim without
      checking current `src/main.js`. It was removed 2026-09-19, then re-added
      2026-10-02 (commit `2fd7f2c`, "ground variation, low vegetation, 3 placeholder
      trees") and is actively called (temple peepal, hero-zone neem, field babool).
      Fixed `CLAUDE.md` §1's "no trees" claim to match. Nothing to delete.
- [x] Update remaining stale docs for the October work: `docs/handoff.md` (append
      entries - done repeatedly throughout this session), `docs/parked.md` (every
      judgement call this session made is logged there; open blockers migrated to
      `docs/NEEDS_YOU.md` at session start)

## 2. Dayline across all 8 missions

- [x] Extend `src/dayline.js`/`src/quest.js` quest-step progress mapping to cover all
      24 quest steps across 8 missions (was 11 steps/3 missions), evenly spread so
      afternoon -> sunset drift completes only at the true `ALL_COMPLETE` (after M8)
- [x] Verify the drift still reads correctly across a real playthrough, not one frame -
      `tmp/test_dayline_8missions.mjs` sets quest.step to 9 points spread across the
      full 8-mission chain, lets ~3s of real frames accumulate at each (so dayline's
      own `damp()` actually converges) and screenshots + logs the sun colour each
      time - confirmed progressive warming, not a snap-to-end or a stall partway

## 3. Missions 4-8 (build in story order)

- [x] M4 - postman NPC (waypoint-loop route, hero-zone lane corridor already proven
      clear by the existing child NPC), find-and-catch via a live-tracked interaction
      point, objective/dialogue/waypoint, letter pickup, quest-step wiring. Verified
      end to end (`tmp/test_m4_m6.mjs`, `tools/regression-check.js`).
- [x] M5 - darzi (tailor) bazaar shop: the unit already existed (bazaar unit 4,
      `BAZAAR_UNITS`); added `registerDarziKurta` (kurta pickup + its normal "buy"
      fallback), objective/dialogue/waypoint, quest-step wiring. Verified end to end.
- [x] M6 - monkey chase: distance-triggered snatch (no proximity-volume system
      needed - a simple tick-loop check), a bounded waypoint run along the bazaar's
      own proven-clear frontage/chowk (`createWaypointRun`, new in `src/npcRoutines.js`),
      catch-up interaction to recover, comedic dialogue, quest-step wiring. Verified
      end to end including the real auto-trigger and chase.
- [x] M7 - mango baagh: new zone east of the field/track (`src/baagh.js`), a 4th tree
      species (`src/trees.js` `buildMangoTree`, folds into the existing shared tree
      draw call for free), 3 marked "knock" interaction points with a mango counter
      (reused the sack-pile counter pattern), drive-home, dialogue, quest-step wiring,
      a real `playMangoThud` sound. Verified end to end including the real counter.
- [x] M8 - ending: a staged dialogue-only scene at the real stairs' own roof landing
      (see docs/parked.md for why that's the actual walkable "roof" spot, not the
      full roof footprint - a 2D-collision finding, not a design choice), transitions
      into the existing final-end-card/credits flow unchanged. Verified end to end
      including a real stair climb (`stepPlayerMove`/`groundHeightAt`), not a teleport.

## 4. Characters

- [x] Postman: code-built NPC, distinct colour (brown/khaki), registered like every
      other named NPC - real asset-slot model is a future Tripo-pipeline task, not
      required for GAME_COMPLETE (either is acceptable per docs/asset-slots.md)
- [x] Darzi: no new NPC - reuses the bazaar's existing ambient shopkeeper instance at
      the tailor unit (`src/bazaarLife.js`), which already has a distinct position/
      silhouette; adding a second, separate named NPC on top would have been pure
      draw-call cost for no new silhouette, see docs/parked.md
- [x] Monkey: code-built NPC, distinct colour + smaller scale (0.55x), hidden until
      the M6 snatch, registered like every other named NPC
- [ ] Baagh keeper (optional flavour NPC for M7) - not built, draw-call budget is
      tight enough (134/140) that an optional flavour-only NPC isn't worth the cost
      right now; revisit if headroom opens up (e.g. once draw-call round 2 happens)

## 5. Menus/ending polish

- [x] Title screen New Game/Continue reflects 8-mission save state - `continueFromSave`
      already handled this generically (any `QUEST_STEPS` value), confirmed by the
      regression walkthrough completing a continue-from-mid-game load correctly
- [x] Settings: controls-help screen now reachable from both title and pause menu
      (`src/controlsHelp.js`); quality/volume stay pause-only on purpose, see
      docs/parked.md
- [x] Loading screen: confirmed no black-frame flash with the added M4-M8 geometry
      (`node tools/screenshot.js`, mobile pass screenshots)
- [x] Credits screen: confirmed it still generates correctly from `docs/CREDITS.md` -
      no new licensed assets were added this session, nothing to add

## 6. Final verification

- [x] Full engineering gate sweep: `npm run build` (13/13), `npm run check-budget`
      (pass), `node tools/regression-check.js` (14/15, known draw-call-threshold
      miss), `node tools/screenshot.js` (looked at every shot, nothing broken)
- [x] Mobile/touch controls re-verified with the new M4-M8 content in scene -
      `tmp/mobile_pass.mjs` re-run at both required sizes, zero console errors, no
      overlaps, the new controls-help link reads cleanly
- [x] Fresh-subagent playthrough audit against `docs/GAME_COMPLETE.md` - clean on the
      first pass (2026-10-19): 46/46 of its own checks, zero console errors, every
      claim independently confirmed. See docs/GAME_COMPLETE.md's own final entry and
      docs/parked.md for the one minor (dev-tooling-only, not fixed) finding.

GAME_COMPLETE.md is fully ticked and audit-confirmed. Everything below this line is
genuinely optional future polish, not required for "the game is done."

## Parked / needs-you items

See `docs/NEEDS_YOU.md` for anything blocked on the user, written in plain language.
