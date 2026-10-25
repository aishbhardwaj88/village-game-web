# STOP-AND-CLOSE ORDER - 25 Oct 2026, 17:10 IST. THIS OVERRIDES EVERY RULE BELOW.

Aishwarya has been waiting 36 hours. She wants to play and give feedback TONIGHT.
This order replaces "the loop does not stop". The loop now HAS an end, and you will
reach it.

## Hard clock. Check it with `date` at the start of every run.

- **Until 18:10 IST**: finish only what is ALREADY in flight. See Phase 1.
- **18:10 IST onward**: Phase 2 close-out only. Nothing else.
- **At 18:40 IST the loop ends.** If it is already past 18:40 when you start, skip
  Phase 1 entirely and do Phase 2 only.

## Phase 1 (until 18:10 IST): land what is open, start nothing new

- Commit whatever is uncommitted right now.
- You may finish a task already half-built in the working tree. That is all.
- **Forbidden until the loop ends**: new places, new features, new BACKLOG items, new
  asset searches, new Blender builds, and any rework of something you already marked
  done because it is "still weak". No exceptions.

## Phase 2 (18:10 to 18:40 IST): close out. This is the definition of done.

The loop is done when ALL FIVE of these are true. Nothing else counts.

1. `npm run build` passes (world validator included).
2. **Every numbered item 0 to 7 in the top playtest block of `docs/FEEDBACK.md`
   carries a bracket marker.** No item may be left unmarked. Each marker is exactly
   one of:
   - `[DONE 25 Oct 2026: <what you did> ; proof <path>]`
   - `[PARTLY DONE 25 Oct 2026: <what is done> ; STILL OPEN: <the named gaps> ; proof <path>]`
   - `[NOT DONE: <one line why>]`
   Items 4, 5, 6 and 7 have never been marked at all. They get marked this run, from
   what is actually in the game. If you have no proof shot, write `no proof shot`.
   Do not reword her items. Do not build anything to improve a marker.
   **Item 7 specifically: the pond lotus is NOT DONE.** She looked at it on 25 Oct
   and said it reads as cut paper. Mark it `NOT DONE`. Do not rework it tonight.
3. `docs/FINISH_LINE.md` is updated: tick only what you can prove, leave the rest.
4. **`docs/PLAYTEST_READY.md` exists**, written for her, headers plus short bullets,
   no long prose, no em dashes, and contains exactly these four sections:
   - `## What changed since your last playtest` - max 15 bullets, plain language
   - `## Look hardest at these 5` - the 5 things most likely to be wrong
   - `## Known unfinished` - every gap from the markers above, one line each
   - `## Live link` - https://aishbhardwaj88.github.io/village-game-web/
5. Everything committed and `git push origin main` done, so `origin/main` and `main`
   are level.

Then, as the last action of that run:

```
touch tmp/STOP
```

That makes the loop print "Autopilot finished" and exit. **Creating `tmp/STOP` is a
required step, not optional.** Do not start another item after it.

## Two open questions, now answered. Stop asking them.

- **The 400,000 triangle limit means VISIBLE triangles, not the browser counter that
  also counts the shadow pass.** The busy market view is about 271,000 visible, which
  is inside budget. The triangle budget is NOT a blocker. Close those NEEDS_YOU lines.
- **Real wood texture on houses, school and bazaar: NO, not now.** Do not spend the
  draw call, do not hunt for savings. It waits until after her feedback. Close that
  NEEDS_YOU line as deferred.

## STANDING RULE, 25 Oct 2026: judge BEFORE you build, never after

She looked at the pond lotus and said it reads as cut paper craftwork. She is right,
and the record proves the deeper problem:

**The lotus was rebuilt 5 times** (ada603d 22 Oct, ac33011 and e5adb25 and e22fd82
24 Oct, d8ebf58 25 Oct). Every single time it was **hand-built in code** with grid
petals and a 128 px canvas-drawn texture. Every time the run approved its own work and
moved on. Hours went into one flower that still fails.

Code-built geometry cannot make an organic thing look real. Grid petals read as
folded paper. No amount of reworking changes that. The decision was wrong at minute
one, not at the end.

### The gate, before you write any geometry code

Ask: **is this thing organic or hard-surface?**

- **Organic** (flowers, plants, leaves, crops, fruit, animals, people, food, cloth
  folds, anything grown or living): **you may NOT build it in code.** Source a real
  CC0 model (Poly Haven, ambientCG, Poly Pizza, Sketchfab CC0, Quaternius, Kenney,
  OpenGameArt, Free3D, BlenderKit free). **If no good free model exists, do not put
  the object in the game at all** and write one line in `docs/NEEDS_YOU.md`.
  Her standing rule already says this: an unconvincing plant is worse than no plant.
- **Hard-surface and man-made** (walls, boards, shutters, boxes, carts, machinery,
  weighbridge, tin roofs, pumps, posts): code-built or Blender is fine. These are the
  flat-faced things code is good at.

### Two strikes, then stop

- If an asset has already been reworked **twice** and still does not convince you,
  **remove it from the game**, write one line in `docs/NEEDS_YOU.md` saying what and
  why, and move on. Never attempt a third rework.
- Check the git log before reworking anything. If the subject appears twice already,
  the rule above applies immediately.

### You are not allowed to be your own judge

- Before committing an asset, name the specific thing that would make her reject it.
  If you cannot name one, you have not looked.
- "Proof shots taken" is not approval. A shot in an isolated test scene is not proof.
- If you would not show it to her, it does not go in and it does not get a tick.

## After the loop ends (not now, do not start it during the close-out)

Her newest request, 25 Oct: in explore mode she wants to click a PLACE on the
notebook map and land there instead of walking, both for players exploring and to save
her walking while she tests. The landing logic already exists (`visitPlace` in
`src/main.js`); the only missing piece is hit testing on the notebook map canvas. It is
written up with its own DONE-WHEN as **BACKLOG A-2a**, and it is the first item on the
next run after `tmp/STOP`, once she has given her playtest feedback. Do not touch it
before then.

## What she will judge you on

Not how much you built. Whether she can open the link, play 10 minutes, and see an
honest list of what is done and what is not. An unmarked item reads as a lie.

# Autopilot run (Dopahar) - unattended, nobody is watching

You are one run of a repeating loop. Do a solid batch of work (1 to 2 hours), commit,
push if you can, then stop cleanly. The next run starts fresh.

## The rule that overrides everything else

**A cycle that produces no change to the game is a failure.**

**While the top block of `docs/FEEDBACK.md` has unticked items, the loop does not
stop and does not start anything else.** Her playtest list is the only job. Do not
pick a BACKLOG item, do not add a new place or feature, until that block is clear.

- Never stop because `git push` fails. Commit locally, write one line in
  `docs/NEEDS_YOU.md`, keep building.
- Never stop because you are waiting on Aishwarya. Mark the item `- [!]` with a
  `BLOCKED:` note in `docs/BACKLOG.md`, write one plain line in `docs/NEEDS_YOU.md`
  ending `- status: open`, and take the next item immediately.
- At the start of each run, any `- [!]` item whose `docs/NEEDS_YOU.md` line now reads
  `- status: done` goes back to `- [ ]` and is eligible again.
- Never write a handoff-only cycle. Cycles 13 to 28 were lost that way. If you find
  yourself about to write "no live-game change", pick the next unticked
  `docs/FINISH_LINE.md` item instead and build it.

## Read first (only these)

- `CLAUDE.md`
- `docs/FINISH_LINE.md` - the definition of done
- `docs/NEEDS_YOU.md` - what is already queued for her
- `docs/handoff.md` - top entry only
- `docs/FEEDBACK.md` - her latest feedback, newest first, top priority

Anything else only when the current task needs it.

## Characters and Tripo are parked until 29 Oct 2026 (extended 24 Oct)

- Capsule placeholders stay. **Do not generate any Tripo model. Do not spend credits.
  Do not ask about characters. Do not ask about the Tripo API key or top-up.**
- `inbox/` will be empty. That is expected. Do not treat it as a blocker.
- Build everything that is not a character.

## Before the loop, every run

- If `git status` shows uncommitted changes to `CLAUDE.md` or anything in `docs/`,
  commit them first with a clear message. They are the art director's instructions.
- `git push origin main` now works over SSH. If a push fails, commit locally, note it
  once in `docs/NEEDS_YOU.md`, and **keep building.**
- Any `- [!]` item in `docs/BACKLOG.md` whose `docs/NEEDS_YOU.md` line reads
  `- status: done` goes back to `- [ ]`.

## The loop

1. Read `docs/FEEDBACK.md` and `docs/ART_REVIEW.md`. Rework any FAIL, then any FIX.
2. Pick the top unticked item in `docs/BACKLOG.md` section A. Skip any `- [!]` item.
3. Build it.
4. Verify: `npm run build` (runs the world validator), `npm run check-budget`,
   `node tools/regression-check.js` if movement code was touched.
5. `node tools/screenshot.js`, then **look at the images** against
   `reference-from-unity/docs/art-direction.md`. Fix anything smeared, flat, black or
   toy-like before moving on.
6. Commit. Push if possible.
7. Tick the box with the screenshot path as proof. Never reword the item.
8. Update `docs/handoff.md` (one entry, at the top) and `docs/status.json`.
9. Next item. Repeat until the batch is done.

## Priorities while characters are parked

In this order, unless `docs/FEEDBACK.md` says otherwise:

### The plan from 25 Oct. Work in THIS order.

**Read `docs/ART_REVIEW.md`'s 25 Oct "NEW DIRECTION" entry first. It supersedes the
23 Oct plan.** Summary:

- **Plants and organics are OFF the list.** The art director builds those herself.
  Leave what exists alone. No foliage, crops, flowers, grass or greenery work.
- **Main places are being redesigned by the art director.** Keep anything you build
  generic and cheap. Do not polish a building that will be replaced.
- **She has no time for input.** Only do work that needs no decision from her.
  Anything needing a decision goes to NEEDS_YOU.md and you move on.

Order:
0. **COLLISION. NOTHING ELSE UNTIL IT PASSES.** It was reported fixed on 25 Oct and
   is NOT: the art director walked through trees, the tractor, the khel maidan string
   boundary and some buildings. Build `tools/collision-test.js` per the 25 Oct
   ART_REVIEW entry (drive the real movement resolver at every solid object from 4
   directions at walk and run speed; assert no pass-through; report objects tested /
   passed / failed with each failure named; wire into `npm run build`). Do not report
   collision fixed again without that test's output in the commit message.
0b. **Signboards: apply the 25 Oct FINAL rule** (Hindi bold and larger on top,
   English not bold and smaller but comfortably legible, never below 55% cap height)
   to every board in the village. CLAUDE.md section 7 carries it.
1. **Tier 1, the drop-in pipeline.** Building asset slots for every significant
   place, published target dimensions (w x h x d, front facing, door position) in
   docs/asset-slots.md, and the PLACES anchor table. This is what lets her models
   land without a rebuild, so it comes before everything else.
2. **Tier 2, systems.** Finish collision; Tasks list and minimap; map click-to-travel;
   wayfinding and the findability audit; missions and side jobs complete and
   playable end to end; mobile, load time and performance; audio; save and menus.
3. **Tier 3, generic props only.** CC0 furniture and objects that survive a building
   swap. No bespoke interiors for places being redesigned.

Everything still obeys CLAUDE.md section 5b: realism without hurting load time, no
solid-colour geometry, source CC0 before building, report the number rather than
silently thinning detail or blowing the budget.

## Never

- Never declare the game complete. When every box is ticked, run the final gate and
  report the full failure list.
- Never spend money or credits.
- Never delete anything.
- Never edit `docs/FINISH_LINE.md` or a verdict in `docs/ART_REVIEW.md`.
- Never run `git` commands that rewrite history.

## End of run

End with: boxes ticked x of y, what changed in the game this cycle, anything new in
`docs/NEEDS_YOU.md` (one plain line each), and the CLAUDE.md report line.

## Token discipline (tech lead's rules, follow exactly)

- Read only the four session files. Never read `docs/archive/`, never read a doc the
  current task does not need, never re-read a file you have already read this run.
- Do not re-summarise the repo, re-explain the plan, or restate CLAUDE.md back.
- Do not run broad searches across the repo for context you already have in WORLD.md.
- One screenshot run per task, not per edit.
- Batch related work: do all wall textures in one task, not one commit per wall.
- Keep your end-of-run report to the required lines. No long prose.
- If a run is going nowhere after two attempts at the same item, mark it `- [!]` with
  the reason and move on. Do not keep retrying.
