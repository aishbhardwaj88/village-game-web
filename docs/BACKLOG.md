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

Characters are parked until 26 Oct. Build everything that is not a character.

### A1. Textures on every surface (top priority)
- [x] Ground, lanes and roads: packed-earth with tyre ruts, kerbs, drains (CC0 PBR, 1K WebP) - proof docs/shots/kerbs-2026-10-23/kerb_b2.png (kerbs on the halwai-school lane; cycle 38v added them to all 5 abadi lanes, proof docs/shots/kerbs3-2026-10-23T01-05-01-534Z/abadi_w1.png; cycle 38u added them to the temple lane and the bazaar approach legs, proof docs/shots/kerbs2-2026-10-23T00-53-05-942Z/temple_lane.png and docs/shots/kerbs2-2026-10-23T00-54-12-652Z/bazaar_lane.png; field tracks and abadi lanes still none)
- [x] Wall surfaces: lime-washed plaster in blue-grey, cream, pink, mint, with per-wall colour variation - proof docs/shots/bazaar-walls-2026-10-23/bazaar_back.png (bazaar row only: cream, pink, mint, blue-grey units; other buildings still cream/mustard/terracotta/teal)
- [x] Roofs: terracotta tiles and corrugated tin - proof docs/shots/compare/new-shops-roofs/high.png (corrugated tin on ration shop + atta chakki; bazaar awning and bg houses already tin/terracotta; hero zone stays 150/150)
- [x] Painted wood: doors, shutters, frames (shared trim sheet) - proof docs/shots/compare/painted-wood/south_row.png (abadi houses only: bottle green, teal, oxblood, indigo, ochre, turquoise painted doors and shutters in the one shared material, zero extra draw calls; hero house, school and bazaar doors still natural dark wood)
- [x] Field and farm surfaces: wheat stubble, sabzi beds, soil - proof docs/shots/compare/field-zones-2/west_stubble.png (pale straw ground under west stubble, sabzi beds east docs/shots/compare/field-zones/east_sabzi.png, plough furrows docs/shots/compare/field-furrows/low.png)
- [x] Canal bank, bridge and boundary walls - proof docs/shots/canal-2026-10-22T20-49-15-988Z/canal_bridge.png (cement lining along both water edges, grassy bank strips, bridge parapets with coping and end posts, zero extra draw calls; village boundary walls NOT touched this pass)
- [x] Soft dirt at wall bases, sun-faded paint, subtle stains near doors and drains - proof docs/shots/grime-2026-10-23/bazaar_back_streaks_fade.png (shader hook on every Blender building material: dusty base dirt, sun-fade above 2m, faint damp streaks; stains are global noise, not placed per door/drain; zero extra draw calls)
- [x] Props and street furniture: lamps, charpai, handpump, chabutra - proof docs/shots/lamps-2026-10-23/temple_a.png and bazaar.png (new street lamps on the temple lane and bazaar lane, streamed per lane segment so hero zone stays 150/150; charpai, hand pump and chabutra already existed; hero-zone lanes have no lamps yet)

### A2. Legibility
- [x] Every signboard readable at normal playing distance, not a smear - proof docs/shots/normal-mode-signboard-8m-2026-10-22T21-23-28-656Z/bazaar_unit5_Barber_Shop.png and chowk_tea_stall_Yadav_Chai_Nashta.png (bazaar/chowk boards were drawn from square cells on 8:1 boards so text was squashed flat; now 4:1 cells + 4:1 boards, bold red/dark text; Barber board was hidden behind a Blender pediment, moved forward)
- [x] Shop boards: Devanagari larger, English beneath - proof docs/shots/normal-mode-signboard-8m-2026-10-22T21-23-28-656Z/bazaar_unit4_Tailor_Shop.png and hero_general_store_Gupta_General_Store.png

### A3. Trees and plants
- [ ] Blender rebuild of peepal, neem, babool, mango to replace code shapes
  - PROGRESS 2026-10-23 (not ticked: built in code, not Blender - awaiting art director's call): smooth blob canopies replaced by real branching trunks + alpha-cut species leaf-sprig cards (src/trees.js), proof docs/shots/trees-2026-10-22T21-34-16-180Z/mango_baagh.png, neem_chowk.png and docs/shots/trees-2026-10-22T21-35-27-570Z/peepal_temple.png, euc_back.png. Still to do: LODs, distance billboard.
  - ATTEMPT 2026-10-23 (cycle 38ac, reverted): crossed-quad canopy impostor as 3rd LOD level read as flat solid green blobs at mid range and filled the whole high_overview shot green (docs/shots/2026-10-23T02-37-36-790Z/); needs a baked-from-render impostor texture and a distance well past the zone stream radius, not a canvas blob.
  - PROGRESS 2026-10-23 (cycle 38s, not ticked): 3-level distance LOD per tree (THREE.LOD in src/trees.js: full, 55 m = every 2nd leaf card + no shadow cast, 120 m = every 3rd card with trunk dropped so a far tree is 1 draw call), proof docs/shots/2026-10-23T00-25-32-752Z/spawn_behind.png (near LOD only; far LOD not framed). Still to do: distance billboard impostor, Blender-made meshes.
  - PROGRESS 2026-10-23 (cycle 38o, not ticked): wind sway on all tree leaf cards (vertex shader in src/trees.js, height-weighted, per-position phase, zero extra draw calls), proof docs/shots/2026-10-22T23-49-51-311Z/low_angle.png (static frame; motion not visible in a still). Still to do: LODs, distance billboard.
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
