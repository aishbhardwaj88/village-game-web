# Handoff log

Two-line status written after every 3rd completed queue item, so an interrupted run
can resume without re-reading the whole session. Newest entry at the top.

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
