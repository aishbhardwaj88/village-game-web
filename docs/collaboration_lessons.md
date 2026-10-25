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
| 2026-09-20 | Renamed `QUEST_STEPS.ALL_COMPLETE`'s meaning (old "both errands done" -> new "all three errands done", with the old meaning moved to a new `ERRAND2_COMPLETE` key) to make room for a third errand. One call site — the sister-collection branch in `interactions.js`, which predates the rename — still set the old value after the edit, which would have skipped straight to the final end card after errand 2 instead of unlocking errand 3. Caught immediately by `grep -rn "ALL_COMPLETE\|ERRAND2_COMPLETE" src/*.js` right after the rename, before any testing. | A rename of a shared constant's *meaning* (not just renaming the identifier everywhere with find-and-replace) needs every reference re-examined by hand, not just found — a mechanical rename would have "worked" (no syntax error) while being semantically wrong at the one site that needed the *old* meaning kept under the *new* name. | After renaming a shared enum/constant value whose meaning changed (not just its spelling), grep the whole codebase for every old and new name together and read each hit — don't trust that "it still compiles" means every call site got the right one. |
| 2026-10-02 | The trolley spawned inside the general store's wall on every load, with zero player input — four separate rounds of driving/collision-resolver fixes (iterate-to-convergence, oriented-box shape, unresolved direct writes) all verified clean against `tools/trolley-drive-test.js` and `tools/trolley-corner-test.js`, because both scripts (and every other vehicle test/screenshot script) call `teleportVehicle()` as their very first action, before any check. The one line that actually caused the bug — `spawnVehicles()`'s unchecked placement of the trolley relative to the tractor — had never been executed by any test in the repo. | A test that sets up its own starting position cannot find a bug in how the game sets up its starting position. However good the driving/collision tests are, they prove nothing about the moment before anything moves. | Always test the untouched spawn state first — load, click Play, touch nothing, assert — before writing or trusting any test that teleports, drives, or otherwise repositions a vehicle/NPC/player as its first action. `tools/spawn-check.js` is the permanent instance of this rule for vehicles; the same no-teleport assertion now runs at the start of every existing vehicle test. |

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

## Never write an open-ended instruction for an unattended loop (25 Oct 2026)

Her words: "don't give it prompts like this, which are infinite, otherwise work will
never get over. It is your responsibility to decide definition of done and tell it to
Claude Code."

What went wrong: `docs/FEEDBACK.md` told the loop "do not stop until this whole block
is done" with no clock and no test for done. The loop ran 36 hours and 181 runs,
committed about 205 times, kept quality rising, and never closed a single item marker
for items 4 to 7. Items go PARTLY DONE and get reopened forever because "still weak"
is always true.

The rule from now on, for every instruction written for the autopilot or any
unattended run:

1. **A wall-clock deadline**, and the instruction says to check `date` each run.
2. **A numbered, countable definition of done.** Not "good quality". Something that
   can be answered yes or no without judgement, e.g. "every item 0 to 7 carries a
   DONE / PARTLY DONE / NOT DONE marker with a proof path".
3. **A named stop action**, e.g. `touch tmp/STOP`, listed as a required step.
4. **An explicit forbidden list** for the window: no new places, no new features, no
   rework of anything already marked done.
5. **Pre-answer every open question** that could stall it, or tell it to assume a
   default and move on. Never leave a decision pending with no default.
6. **One item at a time with its own DONE-WHEN**, and the words "do not extend this
   item" on anything that could grow.

Her deeper point: deciding when work is finished is my job, not hers. Do not hand her
an open loop and ask her to judge when it has gone on long enough.

## Judge the approach before building, not the result after (25 Oct 2026)

Her words on the pond lotus: "This Lotus 3D rendering is so bad. It is looking like
craft paperwork. So why was it even approved?"

The record: the lotus was rebuilt **5 times** (22 Oct, 24 Oct x3, 25 Oct), every time
hand-built in code with grid petals and a 128 px canvas texture, every time approved
by the run that built it. Hours on one flower that still fails.

The mistake was not the execution, it was the **decision at minute one**: code
geometry cannot make an organic thing look real, so no number of reworks would have
saved it.

Rules now in `docs/AUTOPILOT.md`:
1. **Organic things are never code-built.** Source a real CC0 model, or leave the
   object out of the game entirely.
2. **Hard-surface man-made things** (walls, boards, carts, machinery) may be code-built.
3. **Two strikes**: an asset reworked twice and still unconvincing gets removed, not
   reworked a third time. Check the git log before reworking anything.
4. **No self-approval**: before committing, name the specific thing she would reject.
   If you cannot name one, you have not looked.

My own failure here: I was watching the loop and reporting commit counts as progress
without opening the images. Commits are not progress. Next time, look at the proof
shots myself and call a bad asset bad before she has to.

## 25 Oct 2026 — place prompts written without reading `Places V1/README.md`

Claude chat wrote the first Gurukul prompts from memory: bulleted sections, a "no X,
no Y" list, a stylised-art opener and six one-view-per-message images. All four break
the recipe already proven on 13 Sep (photoreal Blender opener, one flowing paragraph,
constraints phrased positively, exactly two sheets: views + orthos, the SCALE block,
bilingual signboard). Rule: before writing ANY place prompt, read
`Places V1/README.md`, `Places V1/SCALE.md` and the blue house
(`Places V1/house/MAIN_house_courtyard_cutaway.png`) first.

## 25 Oct 2026 — her rules after the first Gurukul render
- **One prompt per message.** Never hand over several prompts at once. Finish one place
  completely before starting the next.
- **First image of every place = front view + isometric only.** Other views only after
  she approves that image and asks.
- **Nothing outside the building/compound walls in any reference** — no grass blocks,
  field strips or ground patches. Claude Code builds exactly what it sees, so an odd
  landscape shape becomes an odd built shape. Setting (fields, roads) belongs in
  LAYOUT.md text, never in the image.
- Dimension lines must span the full extent they label; a cropped view must not carry
  a full-width number.
- 25 Oct: gave a "fix this in the same chat" Gemini prompt. Breaks the 19 Sep rule:
  ONE complete prompt from a FRESH chat, never chained corrective edits (Gemini reuses
  the old image, here it returned the wrong top view unchanged). Also: listen to all her
  feedback first, write the single prompt only when she says go.
- 25 Oct: asked her questions with obvious answers (keep measurements? keep labels?).
  Decide, don't ask: measurements always included (in game scale, as drawing notes that
  are never built); Gemini never adds ANY names or lettering, Claude Code adds them.
- 25 Oct, her workflow rule: images she sends while iterating are low-quality WIP. Only
  the full-size download she sends at finalisation goes into the place folder (as the
  MAIN_ file); WIP copies are removed from the folder then.
- 25 Oct: Gemini failed the 5-view Gurukul sheet 4 times (asymmetric top view, wrong
  back, labels back, grass outside). Fix: generate the TOP VIEW alone first as the layout
  authority, then elevations from it. Fewer views per image = accurate views.
- 25 Oct: she pays for Gemini Pro credits; 4 Gurukul sheets were wasted on my prompts.
  Before sending any image prompt: one view per image when layout matters, every
  count/size/symmetry stated in numbers, fresh chat, no labels asked for, nothing outside
  the walls. If unsure Gemini can do it in one go, split it, never "try and see".
- 25 Oct, her rule: continue in the SAME Gemini chat; start a new chat only when truly
  needed. Group views in natural pairs (front+back, left+right, top+isometric or
  front+isometric), not one credit per view. Plan the fewest images that still work.
- 25 Oct: jumped to the next place while the classroom back wall was still unshown.
  Rule: a place is complete only when every wall/face (inside rooms too) has a view;
  then ASK her "Are we ready to start the next place?" before giving its prompt.
- 25 Oct: attaching an earlier image to "fix layout" makes Gemini copy the old layout.
  For layout changes: no attachment, describe positions by zone (left/middle/right,
  front/back). Road signs face oncoming traffic (perpendicular to the road).
- 25 Oct: health sub-centre dropped after 3 tries; it kept reading as a house. Small
  single-storey public buildings need a strong signal beyond props (scale, signage). Parked.
