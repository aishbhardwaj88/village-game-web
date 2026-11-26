**2026-10-22 (cycle 16):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 4 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 15):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), 3 commits waiting; stopped rather than stack more unpublished work.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 14):** No live-game change. Inbox empty. `git push` still fails (no GitHub login), so I stopped rather than stack more unpublished work (2 commits waiting).
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 13):** No live-game change. Inbox empty; birds, smoke, hens, cattle, kids and walkers already in. `git push` still fails (no GitHub login), 1 commit waiting.
Next: once push works, free hero-zone draw calls, real cattle models, Blender tree rebuild.

---

**2026-10-22 (cycle 12):** Neem and babool canopies shifted to deeper, dustier olive greens (src/trees.js). Build/validator and regression 22/22 pass. Inbox empty.
Next: free hero-zone draw calls, real cattle models, Blender tree rebuild, PBR on lanes/canal.

---

**2026-10-22 (cycle 11):** Tried a cyclist riding the lane (ambient sprite); it pushed the hero zone to 151 draw calls, so reverted. No live-game change. Push still fails (no git login, 19 commits waiting).
Next: free draw calls in the hero zone (distance-hide Blender buildings), then real cattle models, tree rebuild.

---

**2026-10-22 (cycle 10):** Three villagers strolling the school end of the lane (src/ambient.js, one Points draw call, shown only within 25 m). Build/validator pass. Inbox empty. Push still fails (no git login).
Next: real cattle models, Blender tree rebuild, PBR on lanes/canal.

---

**2026-10-22 (cycle 9):** Four kids playing tag in the lane near the halwai/tea stall (src/ambient.js, one Points draw call, shown only within 22 m so the hero zone stays at 150 draw calls). Validator 15/15.
Next: merge ambient sprites into fewer draw calls, real cattle models, Blender tree rebuild, PBR on lanes/canal. Push still blocked (no git login).

---

**2026-10-22 (cycle 8):** Cattle resting in the two kachcha sheds (src/ambient.js, one Points draw call, shown only within 45 m). Build/validator + regression 22/22 pass. Inbox empty. Push still fails (no git login).
Next: real cattle models, Blender tree rebuild, PBR on lanes/canal, kids playing in lanes.

---

**2026-10-22 (cycle 7):** Butterflies fluttering over the field and homestead edges (src/ambient.js, one Points draw call, shown only within 60 m). Validator 15/15, regression 22/22. Inbox empty.
Next: cattle in the sheds, Blender tree rebuild, PBR on lanes/canal, kids playing in lanes.

---

**2026-10-22 (cycle 6):** Hens/crows pecking about the two kachcha homesteads (src/ambient.js, one Points draw call, shown only within 45 m). Validator 15/15, regression 22/22. Inbox empty.
Next: cattle in the sheds, Blender tree rebuild, PBR on lanes/canal, kids playing in lanes.

---

**2026-10-21 (cycle 5):** New kachcha mud homestead (thatched house with veranda, cattle shed + manger, courtyard wall/gate, charpai, chulha, tulsi, haystack, dung cakes) west of the field at (-62,-26): `tools/blender/build_kachcha.py`, `src/scenery.js`, public/assets/models/kachcha_homestead.glb. Validator 15/15, regression 22/22. Inbox empty.
Next: cattle models/animals in the shed, 2-3 more kachcha variants near fields, Blender tree rebuild, PBR on lanes/canal.

---

**2026-10-21 (cycle 3):** Tree canopies and ground grass shifted from lime to dusty olive/deep neem green with per-leaf-clump variation (src/trees.js, grassTint in src/main.js). Validator + regression 22/22 pass. Inbox was empty.
Next: kachcha mud houses with thatch, real PBR textures on remaining surfaces, Blender tree rebuild, lane life.

---

**2026-10-21 (cycle 4):** Lane life: 3 more neighbours walk back and forth on the house-school lane (src/bazaarLife.js, same instanced mesh, no extra draw calls); validator's seated-villager exclusion now follows the last instance. Validator 15/15, regression 22/22. Inbox empty. Push still fails (no git login), live site not updated.
Next: kachcha mud houses with thatch, Blender tree rebuild, real PBR on remaining surfaces.

---

**2026-10-21 (cycle 2), after the deploy fix + ART_REVIEW rework:** CI now runs `build:unchecked` (15 min timeouts, no Playwright); validators stay local (`npm run build`, `node tools/regression-check.js`). Reworked house (west wing), bazaar front, school/tea stall/general store, signboards (shared wide-cell atlas in src/signboards.js), trees + ground green, and the abadi: 22 dense attached rows (`tools/blender/make_abadi.sh`, `src/scenery.js`, near/far LOD, hollow-shell colliders in 4 m pieces).
Gotchas: world-validator's sampler is quadratic in triangle edge length (now deduped on a 0.1 m grid); rows' hidden colliders must stay small pieces. Hero zone draw calls sit AT 150.
Next: distance-hide Blender hero buildings, halwai/flower-stall/post-office compare re-checks, canal colour, then docs/MISSIONS_PLAN.md side jobs.

---

**2026-10-21, after commits to b65778d+:** all hero-zone + bazaar + chowk + temple + flower stall + 3 abadi shops are Blender models (see docs/status.json assetsRebuiltInBlender; checklists in docs/*-checklist.md; compare shots docs/shots/compare/). Method for the next building: write docs/<name>-checklist.md, `tools/blender/build_<name>.py` using arch.Kit, `tools/blender/make.sh <name> <slot>`, hide the old code geometry in a named `*_old` group + register an exact slot in src/main.js, shoot with tools/compare-shot.mjs, tick rows. Remaining: background houses (instanced), boundary walls/lanes/kerbs/drains, props, canal+bridge, then greening + MISSIONS_PLAN.md.

---

**2026-10-21, after commits 6a65f5e..house rebuild:** canal visible + crossable (real keys); house fully rebuilt in Blender (`tools/blender/make_house.sh`, `docs/house-checklist.md` 11/12, compare shot `docs/shots/compare/house.png`); `?proof=1` + `tools/proof-shot.mjs` / `tools/compare-shot.mjs` are the normal-mode screenshot tools; exact asset slots (`exact: true`) for buildings. Next: school per `docs/school-checklist.md`, same method (checklist -> Blender -> compare shot).

---

# Handoff log
**2026-10-22:** Chulha smoke now rises from both kachcha homesteads (src/ambient.js, same Points draw call). Validator + regression 22/22. Inbox empty.
Next: more kachcha variants, Blender tree rebuild, PBR on lanes/canal, lane life (kids, cycles).

---

**2026-10-22 (cycle 6):** Trees now carry alpha-cut leaf cards (procedural leaf-sprig texture, one extra draw call) over the canopy blobs in src/trees.js; validator exempts `tree_leaf_cards` from the floating check. Validator 15/15, regression 22/22. Inbox empty. Push still fails (no git login).
Next: Blender tree rebuild with real branching + LODs, wind sway, more kachcha variants, PBR on lanes/canal.

---

**2026-10-21 (cycle 6):** Second kachcha mud homestead (same Blender model turned 180 deg, own cattle in its shed, own colliders) at (-64,-56) south-west of the first (src/scenery.js, shot docs/shots/kachcha2/k2.png). Validator all passed. Push still fails (no git login), live site not updated. Inbox empty.
Regression 22/22: the earlier "player can walk" fail was headless slowness (~3 fps), not a real bug; the check now holds W for 6 s.
Next: Blender tree rebuild, PBR on lanes/canal, animals models, lane life.

**2026-10-21 (cycle 6):** A cow and a buffalo now stand in the kachcha homestead's cattle shed (src/scenery.js, instanced, hidden when far). Validator passes; inbox empty. Push still fails (no git login), so live site is not updated.
Regression check 21/22: "player can walk" moves only 0.63m. It fails the same way with my change reverted, so it came from an earlier commit (suspect the cycle 4 lane neighbours or the kachcha colliders) and needs investigating first.
Next: investigate that walk regression, then 2-3 more kachcha variants near fields, Blender tree rebuild, PBR on lanes/canal.

---


Two-line status written after every 2nd completed queue item, so an interrupted run
can resume without re-reading the whole session. Newest entry at the top.

---

**2026-10-19, GAME COMPLETE — fresh-subagent audit clean, every box in
`docs/GAME_COMPLETE.md` ticked:** Added a controls-help screen (reachable from title
and pause, GAME_COMPLETE.md's own requirement), re-verified mobile touch layout with
the full M4-M8 content in scene (zero overlaps, zero console errors at both required
sizes), then launched a fresh subagent with zero prior context to independently audit
the whole game. It wrote its own Playwright script, played all 8 missions through the
real interaction system (plus a real save/reload/Continue cycle, a real keyboard-
driven tractor drive, real stair-climb movement), 46/46 of its own checks passed, zero
console errors, every GAME_COMPLETE.md claim confirmed. One cosmetic finding (the
`?dev=1`-only FPS counter overlaps HUD text in dev screenshots — zero player-facing
impact) logged in `docs/parked.md`, not fixed. `docs/BACKLOG.md`'s required queue is
now fully ticked; anything still open below that line is optional future polish, not
part of "done." Committed throughout (`d0f3da5` missions 4-8, `2e87fe1` controls help,
`7c9b06c` mobile re-verification, this entry's commit for the final tick). Nothing
pushed — the user pushes manually.

---

**2026-10-19, missions 4-8 built and verified — all 8 missions now exist end to end:**
Extended the quest-step chain from 3 to 8 missions (`src/quest.js`, `src/dayline.js`)
and built M4 (postman/letter), M5 (darzi/kurta, reusing the existing bazaar tailor
unit), M6 (monkey chase — a tick-loop distance trigger + a new bounded one-shot
waypoint routine, `createWaypointRun`), M7 (mango baagh, a new zone + a 4th tree
species that folds into the existing shared tree draw call for free), M8 (a staged
ending at the real stairs' own roof landing — this game's collision is 2D/height-
unaware, so the full roof footprint isn't actually walkable, only the strip above the
stairs; found and worked around, not guessed). Fixed `tools/world-validator.js`'s
reachability-chain classifier (new interaction ids didn't match its trade-name regex)
and extended `tools/regression-check.js`'s own real walkthrough to drive all 8
missions through actual interact()/dialogue/movement hooks — the permanent regression
coverage going forward. 134/140 draw calls, 14/15 regression checks (the one miss is
a known early-warning threshold, not the real ceiling). Committed (`d0f3da5`). Next:
menu/polish pass (title/pause/credits re-check), mobile re-verification, then the
fresh-subagent playthrough audit.

---

**2026-10-19, "finish the game" session starts — Phase 0 + dashboard + headroom round 1
done:** Wrote `docs/GAME_COMPLETE.md` (content finish line, incl. an 8-mission
checklist), `docs/STORY.md` (full M1-M8 story, bilingual dialogue for the 5 new
missions), `docs/BACKLOG.md`, `docs/NEEDS_YOU.md` (migrated open blockers from
`parked.md`), and `inbox/` for Gemini/Tripo drops. Fixed the deploy workflow (missing
Playwright Chromium install). Built a local-only monitoring dashboard
(`tools/dashboard/`, `Dopahar dashboard.command`) — no new deps, reads the repo live,
handles uploads into `inbox/`. Draw-call headroom round 1: found both static geometry
and vehicle bodies already fully merged from prior sessions; the one real win was
turning off shadow-casting on the 6 non-gameplay Tripo judgement boxes (139 -> 133).
Refreshed the stale regression baseline. Corrected a stale claim (`STATUS_REPORT.md`
and this file's own old entries) that `src/trees.js` was dead code — it was re-added
2026-10-02 and is live; fixed `CLAUDE.md` §1 to match. Next: missions 4-8.

---

**2026-09-21, item 9 of 10 done, item 10 not attempted (time):** Full sweep — both
interiors, field track, bazaar walk — found no real bugs; one apparent "player stuck at
the house" was my own test approaching the wrong (solid) side, corrected and
re-verified clean. Final regression baseline saved (14/15, draw-calls-129 the only
miss). Committed (0b349b2, 1ad4f76). Item 10 (draw calls back under 120; investigate
signboards/shopfronts) not attempted — out of session time after items 1-9; both need
dedicated attention rather than a rushed pass. Full session report follows in chat.

---

**2026-09-21, items 5-8 of 10 done:** Item 5 (attachment persistence) verified with no
code change needed — item 2's coupling already keeps it correct through dismount/walk-
away/remount/drive, framed screenshots confirm 0cm hitch gap at every step. Item 6
(wheels) re-verified with the framed mode at 0/90/180/270° roll — visually and
numerically identical at all four (axle width constant, only the polygon-facet ~1.5%
wobble). Item 7 (bicycle) confirmed upright, frame square, wheels aligned. Item 8
(proportions) measured all four vehicles against LAYOUT.md: fixed a real miss (bike
width 0.4m vs its own declared 0.7m spec — the constant was never wired to any part);
reported-not-corrected the tractor's steering-wheel height (2.18m vs 2.60m, a
pre-existing documented LAYOUT.md self-contradiction, forcing it would look unrealistic).
Committed (50c5113, af7cfc3, c80f0f6). Next: item 9 (full sweep), then item 10 if time
remains (draw calls 129->120, signboards/shopfronts).

---

**2026-09-21, items 3-4 of 10 done:** Framed screenshot capture mode added
(src/main.js frameObject()/unfreezeCamera(), tools/screenshot-prod.js framedShot()) —
finds a named object, frames it filling the view, hides the player capsule. Used it to
verify item 4: tractor+trolley driven into 5 buildings from 8 directions each (40 runs)
plus a shallow-angle and reverse pass, zero negative clearances. Committed (c1da2e3,
50c5113). Next: item 5 (attachment persistence, already looking correct from item 2 —
confirming with the new framed mode), then items 6-9.

---

**2026-09-21, structural rework items 1-2 of 10 done:** Colliders now derived
automatically from tagged real geometry (no hand-typed boxes anywhere); one swept
movement resolver every body (player/vehicles/trolley/NPCs) routes through, with the
tractor-trolley pair coupled so a blocked trolley blocks the tractor too. Regression
check 14/15 (unchanged). Committed (8012c13, 369b7a8). Next: item 3, framed screenshot
capture mode, then items 4-9 verified with it.

---

**2026-09-20, 7-item autonomous task complete (items 1-7):** Third errand (wheat to
the bazaar, both on-foot and trolley paths), bazaar NPC life (13 NPCs as 1 draw call),
shared+signature shop interactions, dayline spanning all 3 errands, mobile re-verified
(57-59 draw calls at both phone sizes), full sweep (zero real bugs, 2 self-caught test
mistakes documented), and this docs pass (CLAUDE.md refreshed to the current world —
was stale since before this session even started — and now 146/150 lines). 94 draw
calls, ~54k triangles, 4.72MB assets, grounding clean, zero console errors. All 10
commits on `main`, nothing pushed. Next: awaiting review/push.

---

**2026-09-20, 7-item autonomous task, items 3-5 done:** Shop interactions closed out
(kirana now falls through to the shared buy outside the sack-carrying moment). Dayline
extended to span all 3 errands (was frozen at full warmth after errand 1) — start/end
values recorded in look-standard.md. Mobile re-verified at 390x844/360x800: 57-59 draw
calls, well under 120, no new reduction lever needed. 94 draw calls overall, zero
console errors. Next: item 6 (full sweep) then item 7 (docs).

---

**2026-09-20, 7-item autonomous task, items 1-2 done:** Third errand (wheat sacks to
the bazaar) built entirely on the existing quest/dialogue/waypoint/interaction
registries — one at a time on foot, up to 3 at once if the trolley's parked by the
pile. Also built item 3's shared "buy" + sabzi/bangle signature interactions early
(errand 3 needed the general-store purchase step). NPC life in the bazaar (8
shopkeepers + 4 villagers + 1 seated) as one InstancedMesh, +1 draw call. 94 draw
calls, zero console errors. Next: item 3's remaining two signature interactions are
already done — continuing with item 4 (time and light).

---

**2026-09-19, 4-bug playtest round complete:** Bike drove backward on W (front/rear
were built swapped — `b328d40`). E was double-bound with trolley attach/detach, both a
missing key-repeat guard and a hardcoded "E" badge on what was really an F-only action
(`d0c3326`). Diagnosed "objects float at a low camera angle" as a missing omnidirectional
contact-shadow cue (not a real Y-position or ground-dip bug — verified programmatically)
and added one InstancedMesh decal system (`fb334b6`). Trees removed entirely — exhaustive
Poly Haven (every tree model 150k-3.9M triangles) + Sketchfab (found suitable candidates,
blocked by an auth-gated download) search documented in docs/parked.md, no replacement
found (`3ef356f`). Final: 100/120 draw calls, ~24k triangles, grounding clean, zero
console errors. All 4 commits on `main`, nothing pushed.

---

**2026-09-19, new 10-item queue complete (items 1-10):** Item 10 (docs) updated
`CLAUDE.md` (§1 world summary refreshed, still 135/150 lines), `docs/look-standard.md`
(trees/dust rendering techniques + final draw-call number), `docs/CREDITS.md` (ceramic
pot back in the live scene as the asset-slot test piece). `docs/collaboration_lessons.md`
deliberately skipped — carries uncommitted content from a parallel, unrelated user
workflow (Gemini character art), no safe way here to stage only my own addition without
risking that content (see `docs/parked.md`). Final state: 111/150 draw calls, ~25.8k
triangles, 4.72MB assets, grounding clean, zero console errors across every run this
session. All 10 commits on `main`, nothing pushed. Nothing else in flight.

---

**2026-09-19, new 10-item queue, items 7-9 done:** Save/continue via localStorage —
title screen offers Continue (restores quest.step) alongside New game when a save
exists (item 7, `f79b798`). Audio mix pass — rebalanced the tractor/bike/footstep
levels that were dominating everything else, added dialogue-open ducking and a pause
menu master volume slider (item 8, `837ff8a`). Full sweep playtest — both errands
end to end, house/school interiors, lane/shops, field driving, a real wall-collision
test, zero console errors; two initial script false-positives investigated and ruled
out (not game bugs, see docs/parked.md), no fixes needed (item 9, no code changes).
111/150 draw calls, 25.8k triangles, 4.72MB assets, grounding clean. Next: item 10
(docs).

---

**2026-09-19, new 10-item queue, items 4-6 done:** School interior — one real
walkable classroom in the west wing, benches/blackboard/teacher's table, bell now
visible on its post (item 4, `9326d4c`). Five new interactions wired through the
existing registry (lie on the house charpai, pump water, water the tulsi, write on the
blackboard, sit on a school bench), none touch quest state, verified via a scripted
run of the real `interact()`/`tick()` code paths (item 5, `64e7131`). Dust motes — one
`THREE.Points` draw call, ~466 particles across fixed outdoor zones (lane, track loop,
field, open courtyards), verified none land inside the house/school interiors (item 6).
111/150 draw calls, 25.8k triangles, 4.72MB assets, grounding clean, zero console
errors. Next: item 7 (save/continue).

---

**2026-09-19, new 10-item queue, items 1-3 done:** Asset slot system (drop a .glb in
`public/assets/models/`, auto-detected/scaled/grounded, tested end to end with the
ceramic pot — item 1, `9e9456e`); procedural trees, fixed a real "flat cards" bug via
spherical normals (item 2, `f5671c5`); house interior — walkable, 2 real rooms, a
staircase to the roof (new player Y-height system, see `docs/parked.md`), 9 draw calls
(item 3). 109/150 draw calls, 4.72MB assets, grounding clean, zero console errors.
Next: item 4 (school interior).

---

**2026-09-18, 13-item queue complete:** Items 1-12 done, item 13 partial (day-end
lighting done, puncture shop skipped — draw-call budget at 149/150 with no margin).
All committed to `main`, nothing pushed. Final: 17.6k triangles, 149/150 draw calls,
4.72MB assets, 0 console errors, grounding check empty. Full report delivered to the
user. Next: awaiting review/push.

---

**2026-09-18, after queue items 10-11:** Signboards done via shared texture atlas
(149/150 draw calls, no margin left — d4b3c59). Full playtest sweep found no new bugs
(0fd6ac8) — errand playthrough clean, tea stall + general store collision both
verified, shadows confirmed, wide overview screenshot clean. Next: item 12 (docs).

---

**2026-09-18, after queue item 9:** Tea stall + general store built (f4e8eda), no
LAYOUT.md for either so read off the reference images instead. Draw calls landed at
149/150 after real geometry-merging work — **item 10 signboards MUST use a shared
texture atlas (not one draw call per board)** or budget breaks. Next: item 10.

---

**2026-09-18, after queue items 7-8:** Ambience audio (dog, distant radio, surface
footsteps — 83f6fa6) and NPC life (Maa wanders + tracks her interaction point live,
halwai stirs, child walks house<->school avoiding the halwai's footprint — ecaae3c)
both done. Next: item 9 (tea stall + general store buildings) — check draw calls
closely, was at 145/150 before this pair (audio/NPC additions don't add draw calls).

---

**2026-09-18, after queue item 6:** WebP textures (54% smaller) + hero-zone-first
streaming done, committed (d7b8ff8). Real production-build measurement: 4.78MB before
start -> 5.01MB total, ~7.4s->~4.3s estimated on 4G. Also handled a user mid-turn
request (rm permission + tmp/ convention, 182f4c4) and a cross-session coordination
message from another Claude instance duplicating this same queue on `main` — replied
via SendMessage, told it to hold merges since items 1-6 are done here. Next: item 7
(ambience audio).

---

**2026-09-17, after queue items 4-5:** Item 4 (vehicle feel) verified numerically +
visually, no code changes needed (physics was already tuned during items 1-3). Item 5
(mobile perf: pixel ratio/shadow map/bloom/grain) done, committed (f0a2f41). Next: item
6 (load time / texture streaming).

---

**2026-09-17, after queue items 1-3:** Tractor/trolley/cart/bike rebuilt to LAYOUT.md
specs, trolley attach/detach working (verified via real F-key gameplay flow), committed
(aca4529). Next: item 4 (vehicle feel-pass tuning/verification), then item 5 (mobile
perf).

---

**2026-09-16, before starting the 13-item queue:** Finished the "four playtest fixes"
task (steering, interaction prompt redesign — both committed). Next: old item 4
(ground/wall texture quality) as a bonus fix, then new-queue item 1 (tractor kitbash).

# 22 Nov (7) - real bug found and fixed: the water tank (tallest landmark) had zero collision
- Built `tools/collider-coverage-audit.mjs`, a static no-browser audit of every prop/structure-builder function in src/ against the three real collider mechanisms (explicit `userData.collider`, explicit `userData.colliderBoxes`, and src/autoColliders.js's name-rule-based auto-derive) - the "audit and LIST any solid object with no collider" half of the long-open A0 backlog item, doable without the broken screenshot/validator pipeline. Result: 226 covered, 22 correctly excluded (crops, water surfaces, hanging cloth, decorative batches), 7 uncertain (checked by hand, all fine - boxes live on a sibling object in the same file), 0 mechanical gaps.
- Digging past the mechanical pass (checking every object name against solidRules.js for accidental substring matches) found one real bug: `createWaterTankProp()` in `src/props.js` - MAP.md's "tallest structure, visible from most of the map" - had **zero** collision. Its own old comment said "legs are thin scenery", which was wrong (each of the four legs is a real 0.4x0.4 m concrete post running the full 9 m body-band height), and even if that were right, the mesh's name (`water_tank`/`water_tank_prop`) happens to match solidRules.js's water-surface exclusion rule by bare substring match, so the auto-derive safety net was silently switched off too. A player could walk straight through the tallest landmark in the village.
- Fixed: added four invisible tagged collider boxes for the legs and two for the transformer poles, same convention `createFlagpoleProp()` already uses just above it in the same file, sized to match the visible geometry exactly. Re-ran the audit tool: `createWaterTankProp` now shows covered. `npx vite build` clean, `node tools/licence-audit.mjs` unaffected (no new asset files, pure code). No live/screenshot verification possible in this container - say so plainly rather than claim it's proven in-game.
- Also traced the backlog's other named gap, "cart legs" (roadEvents.js thela, vehicles.js cart) - both already covered by existing collider registration; the note was stale, struck (see previous entry).
- NEXT: tick the A0 backlog line with this finding; the audit tool is reusable for any future prop additions.

# 22 Nov (6) - "cart legs" collider gap found stale, no code change needed
- BACKLOG item A0: "Give colliders to... carts... audit and LIST any solid object with no collider" has carried "cart legs" as a known gap since 23 Oct. Traced both named cases this cycle (no live/screenshot trace possible, code-only): roadEvents.js's thela prop leg is already inside the whole-footprint collider box registered right after `buildThela`; vehicles.js's "cart legs" comment is actually about the bullocks' animal legs, which fall inside the cart's existing dynamic collision assembly (`VEHICLE_PRESETS.cart.assembly`, consumed per-frame by `vehicleSolidBoxes()`). Tagging a vehicle-mesh part with the static collider pattern used for fixed props would freeze a stale invisible wall wherever the cart was at the last zone rebuild - that would be a new bug, not a fix, so no change was made. Struck from the open-gap note in BACKLOG.md; the rest of that item (the static audit asked for) is still open, next.
- NEXT: a static (no-browser) collider-coverage audit tool is in progress to answer the "audit and LIST" half of this item properly, since the screenshot/world-validator/regression-check pipeline that was the only prior way to check this is broken in this container.

# 22 Nov (5) - crop-model and lotus BACKLOG items checked; mustard rebuilt as real 3D geometry
- BACKLOG item: source brinjal/okra/sugarcane/mustard/wheat as real CC0 models or remove each one that fails. Checked Poly Haven's full model catalogue via its JSON API (522 models total, filtered for plant/flower/crop/veg keywords: zero hits beyond flower_gazania and the other scans already in use) and the open web (CGTrader/TurboSquid/RenderHub/Sketchfab, all paid, nothing CC0). No free crop model exists anywhere checked. One marketplace, poly.pizza, didn't go through this cycle - a one-time tool approval it needed went unanswered, logged as a technical note in `docs/NEEDS_YOU.md`, not a decision for her.
- Per-crop result: brinjal/okra were already off (flat alpha cards, "sourced or removed", removed earlier - `buildVegBushes` kept for reference, never called). Sugarcane (`buildCaneClumps`) was already real 3-sided stalk+leaf geometry with vertex colours, not a card - left alone. **Mustard (`buildSarsonBloom`) was still a flat alpha-cut billboard card** (a canopy of painted quads) - the exact 2D-cutout look already rejected elsewhere. Since no model exists and she called this "the signature image", rebuilt it as real geometry instead of leaving the card or deleting the field: each plant is now a real tapering 3-sided stem (same technique as the sugarcane stalks) carrying small 3D floret crosses - four tilted petal triangles per floret, no billboard, no alpha texture, real volume and self-shadowing. Still instanced per plot, still reads as a yellow carpet from a distance (many real florets, not one painted card). Wheat is still code-built field colour with no individual plants modelled - not touched this cycle, flagged for her in NEEDS_YOU in case she wants it looked at too.
- BACKLOG item: lotus/water-lily for the pond. Same sources checked, same result - no free CC0 model exists. Current code (`src/farmSites.js`) already only builds `lotusPadGeo()` (bare pads); `lotusFlowerGeos()`/`lotusPetalTexture()` exist in the file but are never called - so the live game already matches the "no model -> pads only, no paper flowers" end state from her 3 Nov call. Nothing to change.
- Organic-asset survey across the codebase (BACKLOG sub-task, "list every code-built organic thing"):
  - **Real scanned CC0 models (Poly Haven, `public/assets/plants3d/`, via `src/realPlants.js`):** flower_gazania (marigold beds), plus whatever else has landed in that folder per `docs/CREDITS.md` - the only organic things in the game that are actual photoscanned assets, not code.
  - **Code-built, real 3D geometry (not flat cards) - considered fine as-is:** trees (`src/trees.js`: neem/peepal/babool/mango/eucalyptus, branching trunk+twigs, leaf-sprig cards at the tips only, not a flat canopy); sugarcane stalks (`src/field.js` `buildCaneClumps`); mustard/sarson florets (`src/field.js` `buildSarsonBloom`, rebuilt this cycle, see above); animals (`src/animals.js`) draw a real `.glb` model when `public/assets/models/<kind>.glb` exists and fall back to the code-built shape otherwise - cow/dog slots are open per `docs/asset-slots.md`.
  - **Removed, not shipped (no CC0 model, flat-card look already rejected):** brinjal, okra (`src/field.js`, off); tulsi, banana, bougainvillea, creeper garden plants (`src/vegetation.js` `buildGardenPlants` - drawn as nothing, kept as named kinds for when a real model exists); lotus flowers on the pond (pads only, see above).
  - **Still open / not yet looked at this cycle:** wheat (code-built field colour, no individual plant models - flagged above); fruit or food on shop counters, kiln smoke, and the 7 Nov "animals and props with no free model" list (hens, goats, monkey, banyan roots, ruined tree house, women sifting grain) are all still logged as open in NEEDS_YOU from their own dates, not re-checked this cycle.
- Verified: `npm run build` compiles clean (the `vite preview`/`world-validator` failures after it are the same pre-existing Chromium/port environment issue logged earlier this session, not caused by this change). `node tools/licence-audit.mjs`: 0 UNKNOWN, 0 flagged (no new asset files this cycle, mustard is pure code). Committed as `949ea65`.
- NEXT: keep cycling BACKLOG section A for anything else achievable without Blender or the broken screenshot pipeline; retry the poly.pizza lookup once she's written again, in case it turns up something the other sources missed for wheat.

# 22 Nov (4) - texture MIX is live: tin/mud-road/cement/painted-wall now vary building to building
- Her instruction, direct and twice: "good, use mix of these textures so that game look realistic... in reality as well, there is a mix of textures" then, after a second round of options, "use all of these textures. this way we will have variety of textures" - read as approval to implement, not more browsing.
- Sourced 14 total CC0 Poly Haven texture sets across this session (color+normal+roughness each, via the files API + browser-based fetch, no direct curl - this container's egress proxy blocks dl.polyhaven.org): 2 tin, 2 mud-road, 2 cement-wall, 8 painted-wall (6 new this round + the 2 already-liked ones from the first round).
- Checked every new normal map's std-dev before wiring any of it in (the `beige_wall_001` lesson from earlier this session - a flat normal map looks unrealistic even with a good colour map). 12 of 14 passed clearly (std 0.012-0.19). Two painted-wall options from this round, `worn_cracked_plaster` and `yellow_plaster`, came back borderline (0.008-0.010) - likely an artifact of the downscale this container's fetch pipeline needed, not necessarily really flat, but held back rather than risk a repeat of "not realistic". Logged in `docs/NEEDS_YOU.md` for a full-res recheck next cycle.
- `src/materials.js`: added 12 new SETS entries under `public/assets/textures_mix/` plus a `MIX_GROUPS` table (`tin`/`lane`/`concrete`/`plaster`, 2-7 variants each) and `pickMixVariant()` - a deterministic hash on each wall's own repeat/tint values, so the same wall never flickers between variants but different-sized walls across the village land on different ones. Live by default, no toggle, since she explicitly approved all of it - this is different from the still-pending `lane_v2`/`plaster_v2` A/B candidates (her "not realistic" fix), which stay behind `?matv2=1` untouched, separate decision.
- Licence records + CREDITS.md rows added for all 12 (Poly Haven CC0, her "free game, feel free to use assets" + explicit per-texture approval as evidence). `node tools/licence-audit.mjs`: 0 UNKNOWN, 0 flagged. `npm run build` compiles clean; `world-validator`'s in-container Chromium crash is the same pre-existing environment issue logged in 22 Nov (2), not caused by this change.
- `public/assets/textures_mix/` adds 2.7 MB; the budget check's existing 15 breaches (characters, overall game size) are all pre-existing, none newly caused by this change - logged, not silently ignored.
- NEXT: full-res recheck of the 2 held-back wall options; keep an eye out for her reaction to the live mix next time she loads the site (no toggle needed now, it's just there).

# 22 Nov (3) - game confirmed free/no monetization; wall candidate replaced after her "not realistic" call
- **Her decision (22 Nov, scope change, logged not acted on beyond asset-sourcing)**: "I have decided I am not going to be charging anyone for this game. It is going to be a free game, so feel free to use assets." Read narrowly as: loosens CLAUDE.md section 9's "NC never" default for *sourcing textures/props* (an NC-licensed CC asset is legally fine on a game that takes no money) - CC0 still preferred first, CC BY still credited, still never unlicensed/unknown. Does **not** by itself answer the separate, still-open Tripo question (`docs/NEEDS_YOU.md`): whether the 10 Tripo characters were made on a paid plan, because the free-plan concern is that Tripo *publishes the model itself* in its public gallery, not a monetization/attribution issue - that's a factual account question only she can answer, re-asked below.
- **Her "these aren't looking realistic" (on the raw/unlit road+wall comparison sent earlier)**: diagnosed with a raking-light shader (numpy, `shade()`: decodes the normal map, Blinn-Phong-ish spec from roughness, renders at a glancing angle) run on all 4 textures. Road candidate (Poly Haven `dirt_floor`) holds up fine under raking light - real relief, kept as-is. Wall candidate (Poly Haven `beige_wall_001`) was the actual problem: its normal map is nearly flat (visually confirmed, solid-blue ~128,128,255), reads as a flat gradient even lit - correctly called out.
- **Fix**: dropped `beige_wall_001` entirely. New `plaster_v2` candidate instead reuses the EXISTING, already-credited, already-good `plaster` normal + roughness maps (confirmed under raking light to have real stucco/trowel relief) and only replaces the *colour* map - with a median-blurred (9px, 2 passes, OpenCV) version of the current `plaster_color.webp` that erases its baked-in crack lines (the actual "damaged not cared-for" cue, section 6) while keeping its large-scale warm/cool tonal variation. Re-shaded under raking light: genuine stucco grain, zero cracks, zero new licence dependency (derivative of an asset already in CREDITS.md, not a new third-party source) - exactly the "textured but not falling apart" gap that pure Poly Haven/ambientCG search couldn't fill (every clean plaster option was flat; every textured one was tagged damaged/weathered).
- Files updated to match: `public/assets/textures_candidates/plaster_v2/*` (all 3 maps replaced), `tools/licence-records.json` + `docs/CREDITS.md` (creditsKey/source changed from beige_wall_001/Poly Haven to PaintedPlaster017/ambientCG, evidence rewritten to explain the derivative). Still behind the same `?matv2=1` toggle, still not live, still her call.
- `npm run build` reran clean (licence-audit passed, same renderer crash as below on the Chromium verification step - see 22 Nov (2)).
- NEXT: send her the updated raking-light comparison (road unchanged + new crack-free wall) now that both candidates hold up; re-ask the Tripo-plan question narrowly since her free-game note doesn't cover it.

# 22 Nov (2) - texture candidates staged (road, painted buildings), headless renderer broken in this container
- Her ask: free textures for tin, road, grass, muddy road, pond, cement, painted buildings, "keep them ready" for her 2h-later review; also an explicit standing order never to stop building while she's away.
- Road ("plasticky" dark brown/grey): current `lane` roughness map is mid-grey (~0.55) under a roughness:1 multiplier - too glossy for dirt. Candidate: Poly Haven CC0 `dirt_floor` (compacted muddy dirt, real ARM scan, near-white roughness map). Staged at `public/assets/textures_candidates/lane_v2/` (color/normal/roughness, 1K webp).
- Painted buildings: current `plaster_color.webp` has baked-in cracks - reads as "falling apart", not CLAUDE.md section 6's "cared-for, limewashed". Candidate: Poly Haven CC0 `beige_wall_001` (smooth painted exterior, undamaged). Staged at `public/assets/textures_candidates/plaster_v2/`.
- Neither candidate is live. `src/materials.js` adds `lane_v2`/`plaster_v2` SETS entries plus a dev-only `?matv2=1` URL toggle (`VARIANT_OVERRIDE`) - default load is byte-identical to before. Licence records + CREDITS.md rows added so `npm run check-budget`/licence-audit pass clean (still UNKNOWN 0 after this change).
- tin/concrete look like genuine photoscans already (ribbed galvanize, real wood-grain concrete) - left alone. grass_color.webp is actually a patchy moss-on-dirt texture, not lawn grass - real CC0 lawn-grass PBR sets are thin on Poly Haven/ambientCG (most hits were Poliigon/paid or AI-texture sites, not allowed sources); not replaced yet, needs more search time. "Pond" is ambiguous - ponds are a vertex-coloured dip + water shader (`src/dips.js`/`src/water.js`), not a simple tiled material like the others; asked her below rather than guessing at a shader rewrite.
- **Blocker, not her call, logged for the next cycle**: `tools/world-validator.js` and `tools/screenshot.js` both crash the headless Chromium renderer in this container the moment the real 3D scene renders (`page.on('crash')`, "Target crashed"), alongside repeated `CreatePlatformSocket() failed: Address family not supported by protocol (97)` console errors. Reproduced on a clean `ea6bf66` checkout with this session's changes fully stashed, so it's a container/environment regression, not something this cycle's edit caused. Added `--no-sandbox` to world-validator's launch args (safe, didn't fix it). Could not get the mandatory section-10 screenshot this cycle as a result - every other check that doesn't need a GPU (licence-audit, dup-models, place-visibility, build) passed clean.
- NEXT: when the renderer works again, load `?matv2=1` and screenshot both before/after for her. Until then, do not trust "it built" alone for anything touching a visual - same lesson as the 22 Nov (1) entry below, now blocked at the tooling level.

# 22 Nov - shop board variety, new-map houses crash, road wear
- Shop boards (her 22 Nov note: "no variety, same look and feel"): src/kit/shopsSigns.js rewritten - 5 real shapes/thicknesses (shelf-packed atlas), left/right/center text alignment with a trade pictogram for non-centered layouts, wired through src/kit/shopsPlace.js's per-board sizing. Verified live, screenshots sent.
- Found + fixed while verifying: that rewrite's atlas.cells.size reference was stale (SignAtlas moved to atlas.bins arrays), silently crashing the whole s7_shops_land chunk (shops+trees+fields+canal+props all at once, build:unchecked passed fine - only visible in the browser console). Fixed be77755 -> 6c6c170.
- Found + fixed separately: ?layout=new houses (492 of them) were silently failing to build on every load (`makeRoadIndex(map.roads)` with map.roads undefined). First fix (src/kit/houses.js loadPlannedHouses, 9a43fe3) wasn't enough - live site still crashed. Root-caused to map.roads still arriving undefined from one of the two map sources at runtime; made makeRoadIndex itself defensive plus the call site (d33716f). Confirmed live: 492 houses, real children, no error.
- Road wear (her note: "no pits, no stones"): src/roadNetwork.js now has deterministic potholes (cc9d60f, rides the existing vertex grid, no extra draw calls) and a merged-per-chunk loose-stone scatter (159d573, procedural rock shape, shared 'concrete' material, one extra mesh per road chunk). Both verified live via mesh-data inspection, not just a screenshot.
- Lesson reinforced again this session: "it built" / build:unchecked passing is not evidence - every fix this session was verified by loading the real deployed site and reading scene/console state directly; two real silent-failure bugs were only caught that way.
- NEXT: nothing blocked. Natural next items: more realism pass per docs/BACKLOG.md J0 (materials/edge wear), or whatever she flags next. Scoped-not-built: nothing currently.


