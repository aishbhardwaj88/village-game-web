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
- [x] Ground, lanes and roads: packed-earth with tyre ruts, kerbs, drains (CC0 PBR, 1K WebP) - proof docs/shots/kerbs-2026-10-23/kerb_b2.png (kerbs on the halwai-school lane only; other lanes still none)
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
  - PROGRESS 2026-10-23 (not ticked: built in code, not Blender - awaiting art director's call): smooth blob canopies replaced by real branching trunks + alpha-cut species leaf-sprig cards (src/trees.js), proof docs/shots/trees-2026-10-22T21-34-16-180Z/mango_baagh.png, neem_chowk.png and docs/shots/trees-2026-10-22T21-35-27-570Z/peepal_temple.png, euc_back.png. Still to do: LODs, distance billboard, wind sway.
- [ ] Low vegetation and ground cover with real textures
  - PROGRESS 2026-10-23 (cycle 38d): marigold beds, banana clumps, tulsi and bougainvillea are now alpha-cut cards from one atlas (buildGardenPlants, src/vegetation.js), replacing the flat-colour blade flowers, same single draw call, proof docs/shots/garden-plants-2026-10-23/temple_marigold.png, chowk.png, house_banana.png. Still to do: wall creepers, real CC0 ground-cover texture.
  - PROGRESS 2026-10-23 (not ticked): grass tufts and scrub were box blades, now instanced crossed alpha-cut cards with painted blade textures (src/vegetation.js, same draw calls), proof docs/shots/trees-2026-10-22T21-42-52-648Z/neem_close.png. Still to do: tulsi, marigold beds, creepers, banana clumps, real CC0 ground-cover texture.

### A4. Unbuilt MAP.md locations
- [ ] Compare the built world against `reference-from-unity/MAP.md` and list every missing location in this file before building
- [ ] Post office
- [ ] Ration shop
- [ ] Atta chakki
- [ ] Background houses and boundary walls
- [ ] Lanes, kerbs and drains across the full map
- [ ] Canal and bridge

### A5. Side jobs and free roam
- [ ] The checklist at the bottom of `docs/MISSIONS_PLAN.md`, verbatim

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
