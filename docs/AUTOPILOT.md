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

## After the loop ends (not now, do not start it during the close-out)

Her newest request, 25 Oct: in explore mode she wants to tap a point on the notebook
map and land there instead of walking. It is written up with its own DONE-WHEN as
**BACKLOG A-2a**, and it is the first item on the next run after `tmp/STOP`, once she
has given her playtest feedback. Do not touch it before then.

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

### The 20-hour plan (art director, 2026-10-23 night). Work in THIS order.

**Rule above all others: the art director's feedback generalises.** She reviewed about
7 of the 42 places. Every verdict in `docs/ART_REVIEW.md` applies to ALL 42 places and
every object in them, without waiting for a per-place review. Do not ask, do not
narrow the scope to the place that was screenshotted.

1. **A0 collision.** People, animals and vehicles must stop passing through walls,
   buildings and trees; buildings entered only through doors. Verify across a
   multi-minute continuous run, not one screenshot.
2. **The water bug**, then the greenery-scatter audit (plants in drains, canal, pond,
   johad, troughs, tanks, rooftops). Report every bad placement found.
3. **A-2 "Visit place" menu**, then **A-2b Tasks list and corner minimap**. These
   unblock the art director's daily review, so they pay for themselves immediately.
4. **A-2c navigation**: ungate the notebook map to all 42 places, build the diegetic
   signage, make the lanes lead somewhere, and deliver the findability audit list.
5. **A-1 movable units** audit and the handoff note. The art director rearranges the
   layout tomorrow and needs to know which places have coordinates baked in. This
   must be written before she starts.
6. **A1a2 asset sourcing, trees and plants first.** This is the biggest visual lever
   in the game. Real CC0 tree and plant models where they exist; alpha-cutout photo
   textures where they do not; never solid-colour leaf geometry. Then the generic
   props: hand pump, pots, stools, chairs, carts, vessels, crates, baskets.
7. **A1b/A1b0/A1b1 interiors and props across ALL 42 places**, per CLAUDE.md section
   5b. Shops, houses, ration shop, dak ghar, atta chakki, school, temple, everything.
8. **A1c farmland** variety and density; **A1d** code-primitive structures converted
   to Blender, doors and windows everywhere; **A1e** street lamps; **A1f** layout
   fixes and the new house row; **A1g** carrom; **A1h** laundry.
9. Then the rest of section A as listed.

Finish an item properly before starting the next. A half-done item helps nobody.
If an item blocks, mark it `- [!]`, write the plain-language line in
`docs/NEEDS_YOU.md`, and move to the next. Never idle.

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
