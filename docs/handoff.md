# Handoff log

Two-line status written after every 3rd completed queue item, so an interrupted run
can resume without re-reading the whole session. Newest entry at the top.

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
