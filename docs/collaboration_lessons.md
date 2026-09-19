# Collaboration lessons

Process mistakes and their prevention rules — added whenever a mistake costs real time.
Not a task log or decision log (see `docs/parked.md` and `docs/CREDITS.md` for those).

| Date | What went wrong | Lesson | Prevention rule |
|---|---|---|---|
| 2026-09-15 | Set `mesh.rotation.x` and `mesh.rotation.y` on the same object (to "lay a strip flat, then yaw it") and it rendered as a flat, near-black surface for several directions — cost real time to diagnose because it looked like a lighting/material bug, not a transform bug. | Three.js composes Euler angles in a fixed axis order; two non-zero components on one object are not "do this rotation, then that one" in the order you set them. | When an object needs one axis baked in permanently (e.g. "this geometry always lies flat") and one axis set dynamically at runtime (e.g. "then yaw it to face X"), bake the permanent one into the geometry (`geometry.rotateX(...)`) and leave only the dynamic one as a mesh-level Euler rotation. Never combine two runtime Euler axes on the same object unless the exact composed result has actually been verified. |
| 2026-09-15 | A trailer/trolley object (added to the scene independently, not parented to its tractor, so it could lag behind turns) had its spawn position and chase-direction both computed as if the tractor were at the world origin / using the trolley's own current (wrong) position as the reference direction — it drifted off in an arbitrary direction instead of trailing behind. | For any object that's deliberately *not* parented (because parenting would make it rigidly follow every rotation instantly, killing the lag/hinge effect you want), every position/direction calculation must still be derived from the parent's actual live transform (`object.localToWorld(...)`, current heading vectors) — never from a value that implicitly assumes the parent is at the origin, and never by feeding the follower's own (possibly-already-wrong) position back into the next frame's target direction. | When building a "chases with lag" follower, compute the target point fresh each frame from the leader's current transform only; use `lerp`/`damp` toward that fresh target for the lag, and never derive the target's *direction* from the follower's own position. Caught this one via a functional test (mount, drive, read back positions), not a screenshot — screenshots don't catch "wrong direction, plausible-looking distance." |
| 2026-09-15 | Spent a cycle chasing a benign `THREE.WebGLRenderer: "Texture marked for update but no image data found"` console warning by switching texture sharing strategy (shared+cloned -> fresh load per material), which fixed the warning but increased real network/decode work (42 unique texture loads -> 118). Reverted. | A console *warning* (not error) that doesn't correspond to any visual defect is not automatically worth "fixing" if the fix has a real cost (here: more network requests, working against the 8-second load target). Verify there's an actual symptom before spending time on a warning. | Before changing an architecture to silence a warning, confirm three things: (1) does it actually break anything visible, (2) does it fail any automated check (console *errors*, not warnings, are what `tools/screenshot.js` treats as a failure), (3) what does the "fix" cost elsewhere. If the answer to (1) and (2) is no, log it in `docs/parked.md` as known-benign and move on. |
| 2026-09-15 | A throttled-network test of the loading screen (via Playwright `page.route()`) showed the "ready" state appearing almost instantly, which looked like a real bug (loading gate not actually waiting for assets) — worth a moment of concern before double-checking. | The route interception pattern likely wasn't matching the actual request URLs as assumed; a follow-up test with direct console instrumentation of `THREE.DefaultLoadingManager` (not network-layer throttling) showed the mechanism was correct all along — it properly tracked all 27 queued items and only fired ready once the last one completed. | When a test result implies a bug in your own tracking/gating logic, add direct instrumentation to the actual mechanism (the callbacks/state you wrote) before trusting an indirect signal (network timing, route interception) that depends on a separate assumption (the route pattern matching) you haven't verified. |
| 2026-09-17 | The rebuilt tractor's trolley (a new detachable object, item 2 of the 13-item queue) spawned in FRONT of the tractor instead of behind it — a naive world-space `+Z` offset that ignored the tractor's 180°-rotated spawn heading. This is the *same class of bug* as the 2026-09-15 trolley-drift entry above, on a freshly-rewritten version of the same feature. | A lesson written down once doesn't automatically get applied to a full rewrite of the thing it was about — the new code was written fresh (new class, new spawn function) and the "always derive from the leader's actual transform, not a naive offset" rule wasn't re-applied by habit. | When rewriting a system that already has a collaboration-lessons entry, re-read that entry as part of planning the rewrite, not just when something breaks. Caught this one the same way as before — a functional test (drive away, then reverse back, check the distance actually closes) — reinforcing that screenshots alone would have missed it (the trolley "looked" attached, just on the wrong side). |
| 2026-09-17 | Item 9 (two new shop buildings) was written the same way every earlier building had been — one `BuildingKit` per building, one mesh per visual part — and measured 165/150 draw calls, 15 over budget. Required an unplanned mid-item optimization pass (merging same-material meshes across both buildings, dropping non-essential detail) to get back under. | The draw-call budget has been comfortably under target for the whole session (98-145/150) right up until this point, so "build it the usual way" had never been tested against a *tight* budget before — the margin quietly went from generous to nearly zero as vehicles/NPCs/shops were added, and nothing flagged that until the very item that finally tipped it over. | Before starting any item that adds new geometry, check the current draw-call number against the budget first (not after building) once the margin is below ~20 — and if it's tight, design for shared/merged geometry from the start rather than the default one-mesh-per-part pattern, which is what item 9 had to retrofit under time pressure. |

## 19 Sep 2026 — Gemini credits wasted on incomplete prompts (my error)

**What happened.** One hour of Gemini time produced only two usable characters (mother, brother)
and exhausted the free credits. Every character took 4 to 6 generations because I wrote a partial
prompt first and then patched it one missing requirement at a time.

**What I left out of first prompts, and had to add later, one credit at a time:**
- tall portrait framing (wide 16:9 output wasted most pixels on empty background)
- skin tone must match the rest of the family, with the benchmark image attached
- expression must be warm, not blank or sad
- ribbons and bows are cloth, not moulded plastic
- child characters must not get bangles
- hands empty, props removed
- one single image, no side-by-side variants

**Also wrong:** I chained corrections in the same chat. Each pass re-compressed the previous image,
so detail dropped and a "fix" often traded one problem for another. And I filed an output as final
before she had approved it.

**Rules now, non-negotiable:**
1. ONE complete prompt, from a FRESH chat, per character. Never iterate to discover requirements.
2. Before writing any image prompt, list every spec: identity, skin tone, expression, age, garment
   lengths, accessories, materials per material type, hands, pose, framing, aspect ratio,
   background, output count. If any is unknown, ASK HER FIRST. Asking costs nothing, a generation
   costs a credit.
3. Attach the benchmark character image whenever tone or quality must match across the cast.
4. Never chain edits for anything beyond a single trivial change. Re-run from a fresh chat instead.
5. Never save or file an output as final until she says it is right.
6. Reuse the master prompt in `docs/gemini-character-master-prompt.md`. Do not rewrite it from memory.
