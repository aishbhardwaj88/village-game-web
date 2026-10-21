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
